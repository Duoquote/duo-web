/** A raw RGBA image buffer, layout-compatible with `ImageData`. */
export interface RGBAImage {
  width: number;
  height: number;
  /** Row-major RGBA, 4 bytes per pixel, 0-255. */
  data: Uint8ClampedArray;
}

/** A single spot ink. */
export interface Ink {
  /** Stable id used in presets and UI state. */
  id: string;
  name: string;
  /** Ink colour as printed at 100% coverage, "#rrggbb". */
  hex: string;
}

export type DotShape = "circle" | "square" | "diamond" | "line";

/**
 * How the source colour is split into plates.
 * - `auto`    best-fit coverages for whatever inks are loaded (any count)
 * - `channel` one plate per source channel: R -> ink 1, G -> ink 2, B -> ink 3
 * - `duotone` plates ramp across the tonal range, light ink to dark ink
 */
export type SeparationMode = "auto" | "channel" | "duotone";

/**
 * How ink sits on paper.
 * - `multiply` ink absorbs light: the normal case, ink on light paper
 * - `additive` ink emits light: reads correctly as dots glowing on dark paper
 * - `auto`     pick from the paper brightness
 */
export type BlendMode = "auto" | "multiply" | "additive";

export interface RisoOptions {
  /** Inks to separate into, in printing order (first printed first). */
  inks: Ink[];
  /** Paper colour, "#rrggbb". Any colour: white, cream, or near-black. */
  paper: string;
  separation: SeparationMode;
  blend: BlendMode;
  /** Ink opacity at 100% coverage, 0..1. Riso inks are translucent. */
  inkOpacity: number;
  /** Screen angle of the first plate; later plates spread out from here. */
  baseAngle: number;
  /** Explicit per-plate angles in degrees; falls back to the standard spread. */
  angles?: number[];
  /** Halftone cell pitch in output pixels. 0 or 1 disables screening. */
  dotSize: number;
  dotShape: DotShape;
  /** 0..1 - how hard the dot edge is. 1 = crisp, 0 = very soft. */
  dotSharpness: number;
  /** Max plate offset in pixels; per-plate offsets are derived from `seed`. */
  registration: number;
  /** 0..1 - dot-size noise, the ink grain. */
  grain: number;
  /** 0..1 - paper fibre noise. */
  paperNoise: number;
  /** Pre-separation tone controls. */
  brightness: number; // -1..1
  contrast: number; // -1..1
  saturation: number; // 0..2
  /** Gamma applied to every plate. <1 lays down more ink. */
  inkGamma: number;
  /** Total coverage cap summed across plates. Mimics paper saturation. */
  inkLimit: number;
  /** Render scale; >1 gives finer dots relative to the image. */
  scale: number;
  /** Deterministic seed for grain and registration. */
  seed: number;
}

export type RisoSettings = Omit<RisoOptions, "inks">;

export const defaultOptions: RisoSettings = {
  paper: "#f5f0e4",
  separation: "auto",
  blend: "auto",
  inkOpacity: 0.86,
  baseAngle: 15,
  dotSize: 5,
  dotShape: "circle",
  dotSharpness: 0.55,
  registration: 1.5,
  grain: 0.12,
  paperNoise: 0.05,
  brightness: 0.02,
  contrast: 0.12,
  saturation: 1.05,
  inkGamma: 0.95,
  inkLimit: 2.6,
  scale: 1,
  seed: 7,
};
