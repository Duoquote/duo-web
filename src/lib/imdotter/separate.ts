import { clamp, hexToLinear, linearToSrgb, srgb8ToLinear } from "./color";
import type { RGB } from "./color";
import type { BlendMode, SeparationMode } from "./types";

/**
 * Colour separation: source pixel in, one ink coverage per plate out.
 *
 * The print model matters more than the solver here. A halftone plate is not
 * a variable-thickness film - it is *binary* ink, either a dot or bare paper,
 * and "coverage" is the fraction of area the dots take. So a plate at coverage
 * c over a backdrop P reflects
 *
 *     P * (1 - c * a)        a = opacity * (1 - inkColour)
 *
 * the area-weighted average of covered and uncovered paper (Neugebauer), not
 * the Beer-Lambert `P * t^c` used for continuous-tone film. The difference is
 * not academic: black ink has t = 0, and t^c collapses the whole image to zero
 * at any nonzero coverage, whereas (1 - c) behaves. Plates with different
 * screen angles overlap roughly independently, so the plate terms multiply.
 *
 * Dots on dark paper read as light rather than pigment, so that case is
 * modelled additively instead: plates simply sum in linear light.
 *
 * Both regimes are solved the same way - coordinate descent, where each ink in
 * turn gets an exact clamped least-squares update with the others held fixed.
 * That converges in a few sweeps for the six inks a Riso job ever uses.
 *
 * What it minimises is error as *seen*, not error in linear light. A plain
 * linear-light fit spends everything on highlights; an aggressive relative-
 * error fit does the opposite and will happily crush a bright channel to
 * shave a already-dark one. So the objective is squared error in sRGB, reached
 * by reweighting each sweep with the secant slope of the sRGB transfer curve
 * between the current prediction and the target - iteratively reweighted least
 * squares, which keeps every coordinate update closed-form.
 */

export interface SeparationModel {
  /** Identity of everything the lattice depends on, for caching. */
  key: string;
  blend: "multiply" | "additive";
  mode: SeparationMode;
  /** Linear-light ink colours. */
  inkLinear: RGB[];
  /** Per-channel absorption at full coverage: opacity * (1 - ink). */
  absorb: RGB[];
  /** Per-channel emission at full coverage: opacity * ink. */
  emit: RGB[];
  paperLinear: RGB;
  inkOpacity: number;
  inkCount: number;
}

/** Resolve `auto` blend from the paper: dark paper means the ink has to emit. */
export function resolveBlend(blend: BlendMode, paperHex: string): "multiply" | "additive" {
  if (blend !== "auto") return blend;
  const p = hexToLinear(paperHex);
  const lum = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  return lum < 0.18 ? "additive" : "multiply";
}

export function buildSeparationModel(opts: {
  inkHexes: string[];
  paperHex: string;
  inkOpacity: number;
  blend: "multiply" | "additive";
  mode?: SeparationMode;
}): SeparationModel {
  const { inkHexes, paperHex, inkOpacity, blend } = opts;
  const inkLinear = inkHexes.map(hexToLinear);
  const mode = opts.mode ?? "auto";
  return {
    key: [inkHexes.join(","), paperHex, inkOpacity, blend, mode].join("|"),
    blend,
    mode,
    inkLinear,
    absorb: inkLinear.map((l): RGB => [
      inkOpacity * (1 - l[0]),
      inkOpacity * (1 - l[1]),
      inkOpacity * (1 - l[2]),
    ]),
    emit: inkLinear.map((l): RGB => [l[0] * inkOpacity, l[1] * inkOpacity, l[2] * inkOpacity]),
    paperLinear: hexToLinear(paperHex),
    inkOpacity,
    inkCount: inkHexes.length,
  };
}

/**
 * Forward print model: coverages in, linear-light colour out. This is exactly
 * what `composite` does per pixel, so the solver below is inverting the real
 * thing rather than an idealisation of it.
 */
export function printLinear(model: SeparationModel, cov: ArrayLike<number>, offset = 0): RGB {
  const out: RGB = [model.paperLinear[0], model.paperLinear[1], model.paperLinear[2]];
  for (let i = 0; i < model.inkCount; i++) {
    const c = cov[offset + i]!;
    if (c <= 0) continue;
    if (model.blend === "additive") {
      const e = model.emit[i]!;
      out[0] += e[0] * c;
      out[1] += e[1] * c;
      out[2] += e[2] * c;
    } else {
      const a = model.absorb[i]!;
      out[0] *= 1 - c * a[0];
      out[1] *= 1 - c * a[1];
      out[2] *= 1 - c * a[2];
    }
  }
  return out;
}

/** Slope of the sRGB encoding at a linear value. */
function srgbSlope(y: number): number {
  if (y <= 0.0031308) return 12.92;
  return (1.055 / 2.4) * Math.pow(y, 1 / 2.4 - 1);
}

/**
 * Weights that turn a linear-light least squares into an sRGB one. The secant
 * between prediction and target is used rather than the slope at the target,
 * because near black the two disagree by orders of magnitude and the tangent
 * badly overstates how much a large error there is really worth.
 */
function srgbWeights(target: RGB, pred: RGB, out: RGB): void {
  for (let c = 0; c < 3; c++) {
    const t = target[c]!;
    const p = pred[c]!;
    const d = p - t;
    const s = Math.abs(d) < 1e-4 ? srgbSlope(t) : (linearToSrgb(p) - linearToSrgb(t)) / d;
    out[c] = s * s;
  }
}

/** Squared error in sRGB. */
export function fitError(target: RGB, pred: RGB): number {
  let e = 0;
  for (let c = 0; c < 3; c++) {
    const d = linearToSrgb(pred[c]!) - linearToSrgb(target[c]!);
    e += d * d;
  }
  return e;
}

/**
 * A whisper of preference for less ink, in the same units as `fitError`.
 *
 * Redundant ink sets have no unique separation - with CMY *and* black, a grey
 * has a three-plate solution and a one-plate solution that print identically,
 * and an unbiased solver picks between them arbitrarily. That arbitrariness is
 * not smooth across neighbouring colours, which shows up as blotches once the
 * result is interpolated through a lattice. Preferring the lighter-inked of
 * two equal fits breaks the tie the same way every time, and is what a press
 * operator would want anyway.
 */
const INK_PENALTY = 0.0015;

/** The full objective: how wrong the colour looks, plus what it costs in ink. */
export function objective(
  model: SeparationModel,
  target: RGB,
  cov: ArrayLike<number>,
  offset = 0,
): number {
  let e = fitError(target, printLinear(model, cov, offset));
  for (let i = 0; i < model.inkCount; i++) {
    const c = cov[offset + i]!;
    e += INK_PENALTY * c * c;
  }
  return e;
}

/**
 * Bounded least squares by coordinate descent.
 * `target` is linear-light. `out` receives coverages in [0,1].
 */
export function solveCoverage(
  model: SeparationModel,
  target: RGB,
  out: Float32Array,
  outOffset = 0,
  sweeps = 12,
  /** Optional starting guess, e.g. the solution for a neighbouring colour. */
  init?: ArrayLike<number>,
): void {
  const n = model.inkCount;
  const w: RGB = [1, 1, 1];

  // Bare paper is the safe start. A caller-supplied guess is only taken if it
  // is genuinely better, so a bad warm start can never drag the solve down.
  for (let i = 0; i < n; i++) out[outOffset + i] = 0;
  let current = objective(model, target, out, outOffset);
  if (init) {
    const blank = current;
    for (let i = 0; i < n; i++) out[outOffset + i] = init[i]!;
    const warm = objective(model, target, out, outOffset);
    if (warm < blank) current = warm;
    else for (let i = 0; i < n; i++) out[outOffset + i] = 0;
  }

  for (let s = 0; s < sweeps; s++) {
    let delta = 0;
    srgbWeights(target, printLinear(model, out, outOffset), w);

    for (let i = 0; i < n; i++) {
      const prev = out[outOffset + i]!;
      let next: number;

      if (model.blend === "additive") {
        // Backdrop is everything except this plate; the update is a plain
        // projection of the remaining light onto this ink.
        const e = model.emit[i]!;
        let num = 0;
        let den = 0;
        for (let c = 0; c < 3; c++) {
          let base = model.paperLinear[c]!;
          for (let j = 0; j < n; j++) {
            if (j !== i) base += model.emit[j]![c]! * out[outOffset + j]!;
          }
          num += w[c]! * e[c]! * (target[c]! - base);
          den += w[c]! * e[c]! * e[c]!;
        }
        next = den > 1e-12 ? clamp(num / (den + INK_PENALTY), 0, 1) : 0;
      } else {
        // Backdrop P is paper times every *other* plate, so this plate sees
        // P * (1 - c * a) and the update stays an exact linear least squares.
        const a = model.absorb[i]!;
        let num = 0;
        let den = 0;
        for (let c = 0; c < 3; c++) {
          let p = model.paperLinear[c]!;
          for (let j = 0; j < n; j++) {
            if (j !== i) p *= 1 - out[outOffset + j]! * model.absorb[j]![c]!;
          }
          const pa = p * a[c]!;
          num += w[c]! * pa * (p - target[c]!);
          den += w[c]! * pa * pa;
        }
        next = den > 1e-12 ? clamp(num / (den + INK_PENALTY), 0, 1) : 0;
      }

      // The update solves a linear-light quadratic, but the objective is in
      // sRGB, so a full step can overshoot badly on saturated out-of-gamut
      // colours - far enough that a strict accept/reject would sit at zero ink
      // forever. Backtracking along the step finds the improvement that is
      // there, and makes every sweep monotone.
      let accepted = prev;
      for (let t = 1; t >= 0.124; t *= 0.5) {
        const trial = prev + (next - prev) * t;
        out[outOffset + i] = trial;
        const err = objective(model, target, out, outOffset);
        if (err < current) {
          current = err;
          accepted = trial;
          break;
        }
      }
      out[outOffset + i] = accepted;
      delta += Math.abs(accepted - prev);
    }

    if (delta < 1e-4) break;
  }
}

/**
 * Direct channel separation: plate i is driven by source channel i.
 *
 * Under additive blend that is literal - the red plate carries the red
 * channel, so red ink lands where the image is red. Under multiply it has to
 * invert, because ink that looks red *removes* the other channels: the plate
 * carries how much of that channel is missing.
 */
export function channelCoverage(
  model: SeparationModel,
  linear: RGB,
  out: Float32Array,
  outOffset = 0,
): void {
  const additive = model.blend === "additive";
  for (let i = 0; i < model.inkCount; i++) {
    const ch = linear[i % 3]!;
    out[outOffset + i] = clamp(additive ? ch : 1 - ch, 0, 1);
  }
}

/**
 * Duotone-style separation: plates hand over along the tone ramp, lightest ink
 * in the highlights, darkest in the shadows.
 */
export function duotoneCoverage(
  model: SeparationModel,
  linear: RGB,
  out: Float32Array,
  outOffset = 0,
): void {
  const n = model.inkCount;
  const lum = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  // Ink is laid by darkness on paper, by brightness on a glowing background.
  const t = clamp(model.blend === "additive" ? lum : 1 - lum, 0, 1);
  if (n === 1) {
    out[outOffset] = t;
    return;
  }
  // Overlapping triangular ramps, so plates cross-fade instead of banding.
  for (let i = 0; i < n; i++) {
    const centre = (i + 1) / n;
    const width = 1 / n;
    const d = Math.abs(t - centre) / width;
    // The last plate keeps climbing past its centre so the extreme end solidifies.
    const v = i === n - 1 && t > centre ? 1 : clamp(1 - d, 0, 1);
    out[outOffset + i] = v * clamp(t * 1.6, 0, 1);
  }
}

/** Dispatch to whichever separation the options asked for. */
export function separatePixel(
  model: SeparationModel,
  linear: RGB,
  out: Float32Array,
  outOffset = 0,
): void {
  switch (model.mode) {
    case "channel":
      channelCoverage(model, linear, out, outOffset);
      return;
    case "duotone":
      duotoneCoverage(model, linear, out, outOffset);
      return;
    default:
      solveCoverage(model, linear, out, outOffset);
  }
}

/** Cubic lattice of precomputed coverages, indexed by sRGB. */
export interface SeparationLUT {
  size: number;
  inkCount: number;
  /** size^3 * inkCount coverages, R-major. */
  table: Float32Array;
}

export function buildSeparationLUT(model: SeparationModel, size = 33): SeparationLUT {
  const n = model.inkCount;
  const table = new Float32Array(size * size * size * n);
  const linear: RGB = [0, 0, 0];
  // Neighbouring lattice colours have near-identical separations, so each
  // solve starts from the one before it. That converges in fewer sweeps and,
  // more importantly, keeps the lattice continuous where the ink set is
  // redundant and the solver would otherwise be free to jump between equally
  // good answers.
  const warm = new Float32Array(n);
  let hasWarm = false;

  let o = 0;
  for (let r = 0; r < size; r++) {
    const lr = axisLinear(r, size);
    for (let g = 0; g < size; g++) {
      const lg = axisLinear(g, size);
      hasWarm = false; // each row starts clean; the B axis is the smooth one
      for (let b = 0; b < size; b++, o += n) {
        linear[0] = lr;
        linear[1] = lg;
        linear[2] = axisLinear(b, size);
        if (model.mode === "auto") {
          solveCoverage(model, linear, table, o, 12, hasWarm ? warm : undefined);
          warm.set(table.subarray(o, o + n));
          hasWarm = true;
        } else {
          separatePixel(model, linear, table, o);
        }
      }
    }
  }
  return { size, inkCount: n, table };
}

export function axisLinear(i: number, size: number): number {
  return srgb8ToLinear(Math.round((i / (size - 1)) * 255));
}

/**
 * The lattice depends only on the inks, the paper and how they mix - not on
 * anything in the screening or grain controls. Building it is by far the most
 * expensive step (a few hundred ms for four inks), so without this every nudge
 * of the dot-size slider would pay for a full re-solve of colour space. Keyed
 * and kept small, so swapping back and forth between two palettes stays warm.
 */
const LUT_CACHE_LIMIT = 6;
const lutCache = new Map<string, SeparationLUT>();

export function separationLUT(model: SeparationModel, size = 33): SeparationLUT {
  const key = `${model.key}|${size}`;
  const hit = lutCache.get(key);
  if (hit) {
    // Refresh recency: Map preserves insertion order, so re-set moves it last.
    lutCache.delete(key);
    lutCache.set(key, hit);
    return hit;
  }
  const lut = buildSeparationLUT(model, size);
  lutCache.set(key, lut);
  if (lutCache.size > LUT_CACHE_LIMIT) {
    const oldest = lutCache.keys().next().value;
    if (oldest !== undefined) lutCache.delete(oldest);
  }
  return lut;
}

/** Trilinear sample of the LUT for an 8-bit sRGB colour. */
export function sampleLUT(
  lut: SeparationLUT,
  r: number,
  g: number,
  b: number,
  out: Float32Array,
  outOffset = 0,
): void {
  const { size, inkCount, table } = lut;
  const s = (size - 1) / 255;
  const fr = r * s;
  const fg = g * s;
  const fb = b * s;
  const r0 = Math.min(size - 1, fr | 0);
  const g0 = Math.min(size - 1, fg | 0);
  const b0 = Math.min(size - 1, fb | 0);
  const r1 = Math.min(size - 1, r0 + 1);
  const g1 = Math.min(size - 1, g0 + 1);
  const b1 = Math.min(size - 1, b0 + 1);
  const tr = fr - r0;
  const tg = fg - g0;
  const tb = fb - b0;

  const rowB = inkCount;
  const rowG = size * rowB;
  const rowR = size * rowG;

  const i000 = r0 * rowR + g0 * rowG + b0 * rowB;
  const i001 = r0 * rowR + g0 * rowG + b1 * rowB;
  const i010 = r0 * rowR + g1 * rowG + b0 * rowB;
  const i011 = r0 * rowR + g1 * rowG + b1 * rowB;
  const i100 = r1 * rowR + g0 * rowG + b0 * rowB;
  const i101 = r1 * rowR + g0 * rowG + b1 * rowB;
  const i110 = r1 * rowR + g1 * rowG + b0 * rowB;
  const i111 = r1 * rowR + g1 * rowG + b1 * rowB;

  for (let k = 0; k < inkCount; k++) {
    const c00 = table[i000 + k]! * (1 - tb) + table[i001 + k]! * tb;
    const c01 = table[i010 + k]! * (1 - tb) + table[i011 + k]! * tb;
    const c10 = table[i100 + k]! * (1 - tb) + table[i101 + k]! * tb;
    const c11 = table[i110 + k]! * (1 - tb) + table[i111 + k]! * tb;
    const c0 = c00 * (1 - tg) + c01 * tg;
    const c1 = c10 * (1 - tg) + c11 * tg;
    out[outOffset + k] = c0 * (1 - tr) + c1 * tr;
  }
}
