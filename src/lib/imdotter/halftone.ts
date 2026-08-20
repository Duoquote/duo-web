import type { DotShape } from "./types";
import { clamp } from "./color";
import { hash2 } from "./prng";

/**
 * Rotated clustered-dot halftone screening.
 *
 * Dots sit on a square lattice rotated to the screen angle of the plate. The
 * radius of a dot has to be chosen so that the *union* of overlapping
 * neighbours reproduces the requested tone. The textbook `r = sqrt(cov/pi)`
 * is only correct while dots stay apart, and goes badly wrong past ~78% where
 * they merge. Rather than guess a correction we measure it: buildToneCurve
 * numerically integrates lattice coverage for a sweep of radii and inverts it.
 * Midtones then stay honest for every dot shape with no per-shape fudging.
 */

/** Distance metric per shape, in cell units. Level sets define the dot outline. */
function shapeDistance(shape: DotShape, dx: number, dy: number): number {
  switch (shape) {
    case "circle":
      return Math.sqrt(dx * dx + dy * dy);
    case "square":
      return Math.max(Math.abs(dx), Math.abs(dy));
    case "diamond":
      return (Math.abs(dx) + Math.abs(dy)) * 0.70710678;
    case "line":
      return Math.abs(dy);
  }
}

/**
 * Radius at which the lattice is completely filled - the distance from a cell
 * centre to its furthest corner under that shape metric. Screening past this
 * changes nothing, so it is where the tone curve tops out.
 */
function fillRadius(shape: DotShape): number {
  return shapeDistance(shape, 0.5, 0.5);
}

const CURVE_STEPS = 256;

export interface ToneCurve {
  /** radius[i] is the shape radius, in cell units, giving coverage i/CURVE_STEPS. */
  radius: Float32Array;
  maxRadius: number;
}

const curveCache = new Map<DotShape, ToneCurve>();

export function buildToneCurve(shape: DotShape, samples = 64): ToneCurve {
  const cached = curveCache.get(shape);
  if (cached) return cached;

  // Overshoot the fill radius, because the dot edge is antialiased: a dot that
  // only just reaches the cell corner leaves a soft grey there instead of
  // solid ink, and 100% coverage has to actually come out 100%.
  const maxRadius = fillRadius(shape) * 1.4;

  const rs: number[] = [];
  const cs: number[] = [];
  for (let k = 0; k <= CURVE_STEPS; k++) {
    const r = (k / CURVE_STEPS) * maxRadius;
    let hit = 0;
    for (let j = 0; j < samples; j++) {
      const dy = (j + 0.5) / samples - 0.5;
      for (let i = 0; i < samples; i++) {
        const dx = (i + 0.5) / samples - 0.5;
        let inside = false;
        // Union over the 3x3 lattice neighbourhood; maxRadius < 1 so that is enough.
        for (let oy = -1; oy <= 1 && !inside; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (shapeDistance(shape, dx - ox, dy - oy) <= r) {
              inside = true;
              break;
            }
          }
        }
        if (inside) hit++;
      }
    }
    rs.push(r);
    cs.push(hit / (samples * samples));
  }

  // Invert the monotonic coverage(r) sampling into radius(coverage).
  const radius = new Float32Array(CURVE_STEPS + 1);
  let k = 0;
  for (let i = 0; i <= CURVE_STEPS; i++) {
    const target = i / CURVE_STEPS;
    while (k < cs.length - 2 && cs[k + 1]! < target) k++;
    const c0 = cs[k]!;
    const c1 = cs[k + 1]!;
    const t = c1 > c0 ? (target - c0) / (c1 - c0) : 0;
    radius[i] = rs[k]! + (rs[k + 1]! - rs[k]!) * clamp(t, 0, 1);
  }
  radius[0] = 0;
  radius[CURVE_STEPS] = maxRadius;

  const curve: ToneCurve = { radius, maxRadius };
  curveCache.set(shape, curve);
  return curve;
}

export function radiusForCoverage(curve: ToneCurve, coverage: number): number {
  const c = clamp(coverage, 0, 1) * CURVE_STEPS;
  const i = c | 0;
  if (i >= CURVE_STEPS) return curve.radius[CURVE_STEPS]!;
  const t = c - i;
  return curve.radius[i]! * (1 - t) + curve.radius[i + 1]! * t;
}

/** Bilinear sample of a single-channel float plane, edge-clamped. */
export function sampleBilinear(
  plane: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const cx = clamp(x, 0, width - 1);
  const cy = clamp(y, 0, height - 1);
  const x0 = cx | 0;
  const y0 = cy | 0;
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = cx - x0;
  const ty = cy - y0;
  const a = plane[y0 * width + x0]!;
  const b = plane[y0 * width + x1]!;
  const c = plane[y1 * width + x0]!;
  const d = plane[y1 * width + x1]!;
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

export interface ScreenParams {
  angle: number; // degrees
  cell: number; // lattice pitch in px; <= 1 disables screening
  shape: DotShape;
  sharpness: number; // 0..1
  offsetX: number; // plate misregistration, px
  offsetY: number;
  grain: number; // 0..1 dot-size jitter
  seed: number;
}

/**
 * Screen one plate: continuous coverage in, dot alpha out.
 * `coverage` and `out` are both width*height.
 */
export function screenPlate(
  coverage: Float32Array,
  width: number,
  height: number,
  p: ScreenParams,
  out: Float32Array = new Float32Array(width * height),
): Float32Array {
  if (p.cell <= 1) {
    // Screening off: carry the tone straight through, plate offset still applied.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let v = sampleBilinear(coverage, width, height, x - p.offsetX, y - p.offsetY);
        if (p.grain > 0) {
          const n = hash2(x, y, p.seed) - 0.5;
          v += n * p.grain * 0.35 * Math.min(1, v * 6);
        }
        out[y * width + x] = clamp(v, 0, 1);
      }
    }
    return out;
  }

  const curve = buildToneCurve(p.shape);
  const rad = (p.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cell = p.cell;

  // Screen-space extent of the image, so we know which lattice cells exist.
  // The lattice lives in *plate* space, which the misregistration offset then
  // slides bodily across the sheet - dots and image together, the way a
  // mis-set drum actually prints. Bounds are padded to cover that slide.
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  const corners: Array<[number, number]> = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ];
  for (const [cx, cy] of corners) {
    const u = (cx * cos + cy * sin) / cell;
    const v = (-cx * sin + cy * cos) / cell;
    if (u < uMin) uMin = u;
    if (u > uMax) uMax = u;
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  const pad = 2 + Math.ceil((Math.abs(p.offsetX) + Math.abs(p.offsetY)) / cell);
  const cu0 = Math.floor(uMin) - pad;
  const cv0 = Math.floor(vMin) - pad;
  const cw = Math.ceil(uMax) - cu0 + pad * 2;
  const ch = Math.ceil(vMax) - cv0 + pad * 2;

  // One tone sample per dot, not per pixel: a dot is a single blob of ink, so
  // its size comes from the image value at its centre.
  const cellRadius = new Float32Array(cw * ch);
  for (let j = 0; j < ch; j++) {
    for (let i = 0; i < cw; i++) {
      const u = (cu0 + i) * cell;
      const v = (cv0 + j) * cell;
      const sx = u * cos - v * sin;
      const sy = u * sin + v * cos;
      let cov = sampleBilinear(coverage, width, height, sx, sy);
      if (p.grain > 0) {
        // Jitter dot size, but never invent ink where the plate is empty.
        const n = hash2(cu0 + i, cv0 + j, p.seed) - 0.5;
        cov = clamp(cov + n * p.grain * 0.6 * Math.min(1, cov * 6), 0, 1);
      }
      cellRadius[j * cw + i] = radiusForCoverage(curve, cov);
    }
  }

  // Edge softness in cell units, never below half a pixel so dots stay antialiased.
  const soft = Math.max(0.5 / cell, (1 - p.sharpness) * 0.45);
  const invSoft = 1 / (2 * soft);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Read the plate at where it *was* before the drum slipped.
      const px = x + 0.5 - p.offsetX;
      const py = y + 0.5 - p.offsetY;
      const u = (px * cos + py * sin) / cell;
      const v = (-px * sin + py * cos) / cell;
      const bu = Math.round(u);
      const bv = Math.round(v);

      let alpha = 0;
      for (let dv = -1; dv <= 1 && alpha < 0.999; dv++) {
        const cv = bv + dv;
        const jj = cv - cv0;
        if (jj < 0 || jj >= ch) continue;
        for (let du = -1; du <= 1; du++) {
          const cu = bu + du;
          const ii = cu - cu0;
          if (ii < 0 || ii >= cw) continue;
          const r = cellRadius[jj * cw + ii]!;
          if (r <= 0) continue;
          const d = shapeDistance(p.shape, u - cu, v - cv);
          const t = clamp((r + soft - d) * invSoft, 0, 1);
          const a = t * t * (3 - 2 * t); // smoothstep across the dot edge
          if (a > alpha) alpha = a;
          if (alpha >= 0.999) break;
        }
      }
      out[y * width + x] = alpha;
    }
  }
  return out;
}
