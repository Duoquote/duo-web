import { clamp, hexToLinear, hexToRgb, linearToSrgb8 } from "./color";
import type { RGB } from "./color";
import { adjustTone, flattenOnto, resizeRGBA } from "./adjust";
import { screenPlate } from "./halftone";
import { DEFAULT_ANGLE_SPREAD } from "./palettes";
import { hash2, mulberry32 } from "./prng";
import {
  separationLUT,
  buildSeparationModel,
  resolveBlend,
  sampleLUT,
} from "./separate";
import type { SeparationModel } from "./separate";
import type { Ink, RGBAImage, RisoOptions } from "./types";

/** One separated, screened plate. */
export interface Plate {
  ink: Ink;
  angle: number;
  offset: { x: number; y: number };
  /** Continuous coverage before screening, width*height. */
  coverage: Float32Array;
  /** Dot alpha after screening, width*height. */
  alpha: Float32Array;
}

export interface RisoResult {
  image: RGBAImage;
  plates: Plate[];
  blend: "multiply" | "additive";
  width: number;
  height: number;
}

/**
 * Screen angles per plate, spread at least 15 degrees apart - the spacing of
 * the classic C/M/Y/K set (15/75/0/45), where overlapping screens rosette
 * rather than beat against each other as visible moire.
 */
export function plateAngles(opts: RisoOptions): number[] {
  if (opts.angles && opts.angles.length >= opts.inks.length) {
    return opts.inks.map((_, i) => opts.angles![i]!);
  }
  const base = DEFAULT_ANGLE_SPREAD[0]!;
  return opts.inks.map(
    (_, i) => opts.baseAngle + (DEFAULT_ANGLE_SPREAD[i % DEFAULT_ANGLE_SPREAD.length]! - base),
  );
}

/**
 * Plate misregistration. The first plate is the reference and stays put; the
 * rest drift, which is what gives a real Riso its coloured fringes.
 */
export function plateOffsets(opts: RisoOptions): Array<{ x: number; y: number }> {
  const rand = mulberry32(opts.seed * 2654435761);
  return opts.inks.map((_, i) => {
    if (i === 0 || opts.registration <= 0) return { x: 0, y: 0 };
    const angle = rand() * Math.PI * 2;
    const r = opts.registration * (0.35 + 0.65 * rand());
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
}

/** Separate every pixel into per-plate coverage planes. */
export function separateImage(
  img: RGBAImage,
  model: SeparationModel,
  opts: { inkGamma: number; inkLimit: number },
): Float32Array[] {
  const n = model.inkCount;
  const px = img.width * img.height;
  const planes: Float32Array[] = [];
  for (let i = 0; i < n; i++) planes.push(new Float32Array(px));

  const lut = separationLUT(model);
  const cov = new Float32Array(n);
  const gamma = Math.max(0.05, opts.inkGamma);
  const limit = opts.inkLimit > 0 ? opts.inkLimit : Infinity;

  for (let p = 0, o = 0; p < px; p++, o += 4) {
    sampleLUT(lut, img.data[o]!, img.data[o + 1]!, img.data[o + 2]!, cov);

    let total = 0;
    for (let i = 0; i < n; i++) {
      const v = gamma === 1 ? cov[i]! : Math.pow(cov[i]!, gamma);
      cov[i] = v;
      total += v;
    }
    // Total-ink limit: past a point the paper stops accepting ink, and every
    // plate gives way proportionally rather than one plate clipping alone.
    const scale = total > limit ? limit / total : 1;
    for (let i = 0; i < n; i++) planes[i]![p] = clamp(cov[i]! * scale, 0, 1);
  }
  return planes;
}

/** Lay the screened plates down on paper. */
export function composite(
  plates: Plate[],
  width: number,
  height: number,
  opts: { paper: string; inkOpacity: number; paperNoise: number; seed: number },
  blend: "multiply" | "additive",
): RGBAImage {
  const paper = hexToLinear(opts.paper);
  const inks: RGB[] = plates.map((p) => hexToLinear(p.ink.hex));
  const data = new Uint8ClampedArray(width * height * 4);
  const noise = opts.paperNoise;
  const op = opts.inkOpacity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;

      let r = paper[0];
      let g = paper[1];
      let b = paper[2];

      if (noise > 0) {
        // Paper fibre: a single luminance wobble, not per-channel confetti.
        const n = 1 + (hash2(x, y, opts.seed ^ 0x5bf03635) - 0.5) * noise * 0.5;
        r *= n;
        g *= n;
        b *= n;
      }

      for (let i = 0; i < plates.length; i++) {
        const a = plates[i]!.alpha[p]!;
        if (a <= 0) continue;
        const ink = inks[i]!;
        if (blend === "additive") {
          const k = a * op;
          r += ink[0] * k;
          g += ink[1] * k;
          b += ink[2] * k;
        } else {
          // Translucent ink: hides `op` of what is underneath and replaces it
          // with its own colour, so the plate stack multiplies down.
          const k = a * op;
          r *= 1 - k * (1 - ink[0]);
          g *= 1 - k * (1 - ink[1]);
          b *= 1 - k * (1 - ink[2]);
        }
      }

      const o = p * 4;
      data[o] = linearToSrgb8(clamp(r, 0, 1));
      data[o + 1] = linearToSrgb8(clamp(g, 0, 1));
      data[o + 2] = linearToSrgb8(clamp(b, 0, 1));
      data[o + 3] = 255;
    }
  }
  return { width, height, data };
}

/** Full conversion: source image in, printed sheet out. */
export function risograph(src: RGBAImage, opts: RisoOptions): RisoResult {
  if (opts.inks.length === 0) throw new Error("risograph: need at least one ink");

  const blend = resolveBlend(opts.blend, opts.paper);
  const width = Math.max(1, Math.round(src.width * opts.scale));
  const height = Math.max(1, Math.round(src.height * opts.scale));

  // Work on a copy: the caller keeps their original.
  let work: RGBAImage = {
    width: src.width,
    height: src.height,
    data: new Uint8ClampedArray(src.data),
  };
  work = flattenOnto(work, hexToRgb(opts.paper));
  work = resizeRGBA(work, width, height);
  work = adjustTone(work, opts);

  const model = buildSeparationModel({
    inkHexes: opts.inks.map((i) => i.hex),
    paperHex: opts.paper,
    inkOpacity: opts.inkOpacity,
    blend,
    mode: opts.separation,
  });

  const coverage = separateImage(work, model, opts);
  const angles = plateAngles(opts);
  const offsets = plateOffsets(opts);

  const plates: Plate[] = opts.inks.map((ink, i) => {
    const alpha = screenPlate(coverage[i]!, width, height, {
      angle: angles[i]!,
      cell: opts.dotSize,
      shape: opts.dotShape,
      sharpness: opts.dotSharpness,
      offsetX: offsets[i]!.x,
      offsetY: offsets[i]!.y,
      grain: opts.grain,
      // Distinct seed per plate, or every plate grains identically.
      seed: (opts.seed + i * 8191) | 0,
    });
    return { ink, angle: angles[i]!, offset: offsets[i]!, coverage: coverage[i]!, alpha };
  });

  const image = composite(plates, width, height, opts, blend);
  return { image, plates, blend, width, height };
}
