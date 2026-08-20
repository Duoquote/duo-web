import { clamp } from "./color";
import type { RGBAImage } from "./types";

/** Pre-separation tone shaping, applied in sRGB where the sliders feel linear. */
export function adjustTone(
  img: RGBAImage,
  opts: { brightness: number; contrast: number; saturation: number },
): RGBAImage {
  const { brightness, contrast, saturation } = opts;
  if (brightness === 0 && contrast === 0 && saturation === 1) return img;

  // Standard S-curve-ish contrast factor: -1 flattens to grey, +1 hard clips.
  const c = clamp(contrast, -1, 1);
  const k = (1.015 * (c + 1)) / (1.015 - c);

  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = i / 255 + brightness;
    v = k * (v - 0.5) + 0.5;
    lut[i] = clamp(v, 0, 1) * 255;
  }

  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = lut[d[i]!]!;
    let g = lut[d[i + 1]!]!;
    let b = lut[d[i + 2]!]!;
    if (saturation !== 1) {
      const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = grey + (r - grey) * saturation;
      g = grey + (g - grey) * saturation;
      b = grey + (b - grey) * saturation;
    }
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  return img;
}

/**
 * Resample to a new size. Box-averages when shrinking (so fine detail turns
 * into tone rather than aliasing into the screen) and bilinear when growing.
 */
export function resizeRGBA(img: RGBAImage, width: number, height: number): RGBAImage {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  if (width === img.width && height === img.height) return img;

  const out = new Uint8ClampedArray(width * height * 4);
  const sx = img.width / width;
  const sy = img.height / height;
  const shrinking = sx > 1 || sy > 1;

  if (shrinking) {
    for (let y = 0; y < height; y++) {
      const y0 = Math.floor(y * sy);
      const y1 = Math.max(y0 + 1, Math.min(img.height, Math.ceil((y + 1) * sy)));
      for (let x = 0; x < width; x++) {
        const x0 = Math.floor(x * sx);
        const x1 = Math.max(x0 + 1, Math.min(img.width, Math.ceil((x + 1) * sx)));
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        let n = 0;
        for (let yy = y0; yy < y1; yy++) {
          let i = (yy * img.width + x0) * 4;
          for (let xx = x0; xx < x1; xx++, i += 4) {
            r += img.data[i]!;
            g += img.data[i + 1]!;
            b += img.data[i + 2]!;
            a += img.data[i + 3]!;
            n++;
          }
        }
        const o = (y * width + x) * 4;
        out[o] = r / n;
        out[o + 1] = g / n;
        out[o + 2] = b / n;
        out[o + 3] = a / n;
      }
    }
  } else {
    for (let y = 0; y < height; y++) {
      const fy = clamp((y + 0.5) * sy - 0.5, 0, img.height - 1);
      const y0 = fy | 0;
      const y1 = Math.min(img.height - 1, y0 + 1);
      const ty = fy - y0;
      for (let x = 0; x < width; x++) {
        const fx = clamp((x + 0.5) * sx - 0.5, 0, img.width - 1);
        const x0 = fx | 0;
        const x1 = Math.min(img.width - 1, x0 + 1);
        const tx = fx - x0;
        const i00 = (y0 * img.width + x0) * 4;
        const i01 = (y0 * img.width + x1) * 4;
        const i10 = (y1 * img.width + x0) * 4;
        const i11 = (y1 * img.width + x1) * 4;
        const o = (y * width + x) * 4;
        for (let ch = 0; ch < 4; ch++) {
          const a = img.data[i00 + ch]! * (1 - tx) + img.data[i01 + ch]! * tx;
          const b = img.data[i10 + ch]! * (1 - tx) + img.data[i11 + ch]! * tx;
          out[o + ch] = a * (1 - ty) + b * ty;
        }
      }
    }
  }
  return { width, height, data: out };
}

/** Flatten any transparency onto a solid backdrop before separating. */
export function flattenOnto(img: RGBAImage, backdrop: [number, number, number]): RGBAImage {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]! / 255;
    if (a === 1) continue;
    d[i] = d[i]! * a + backdrop[0] * (1 - a);
    d[i + 1] = d[i + 1]! * a + backdrop[1] * (1 - a);
    d[i + 2] = d[i + 2]! * a + backdrop[2] * (1 - a);
    d[i + 3] = 255;
  }
  return img;
}
