export type Format =
  | "mozjpeg"
  | "webp"
  | "webp-lossless"
  | "avif"
  | "jxl"
  | "png-oxi";

export type Mime =
  | "image/jpeg"
  | "image/webp"
  | "image/avif"
  | "image/jxl"
  | "image/png";

export type EncodeOptions =
  | { format: "mozjpeg"; quality: number }
  | { format: "webp"; quality: number }
  | { format: "webp-lossless"; effort: number }
  | { format: "avif"; quality: number; speed: number }
  | { format: "jxl"; quality: number; effort: number }
  | { format: "png-oxi"; level: number };

export interface Preset {
  id: string;
  label: string;
  format: Format;
  mime: Mime;
  ext: string;
  preservesAlpha: boolean;
  options: EncodeOptions;
}

export type PresetStatus = "pending" | "encoding" | "done" | "error";

export interface PresetResult {
  presetId: string;
  status: PresetStatus;
  size?: number;
  durationMs?: number;
  error?: string;
  url?: string;
}

export interface AlphaInfo {
  hasAlpha: boolean;
  hasPartialAlpha: boolean;
  alphaPixelRatio: number;
  category: "opaque" | "binary-mask" | "smooth-alpha";
}

export interface EncodePayload {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
