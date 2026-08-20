import type { RGBAImage } from "./types";

/** Browser-side image loading. The pipeline itself never touches the DOM. */

/**
 * Source images are capped before they reach the press. Beyond this the screen
 * is finer than anyone can see at preview size, and the render cost is
 * quadratic - a 6000px phone photo would take tens of seconds per slider nudge.
 */
export const MAX_SOURCE_DIMENSION = 1600;

/** Phones do the same work on a fraction of the budget, so they get less of it. */
export const MAX_SOURCE_DIMENSION_SMALL = 1000;

/**
 * Every pixel is screened once per plate, so the cap is the single biggest
 * lever on how responsive a drag feels. A touch device, or one advertising few
 * cores, gets the smaller one.
 */
export function sourceCap(): number {
  if (typeof window === "undefined") return MAX_SOURCE_DIMENSION;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 8;
  return coarse || cores <= 4 ? MAX_SOURCE_DIMENSION_SMALL : MAX_SOURCE_DIMENSION;
}

export async function decodeToImage(source: Blob, maxDimension = sourceCap()): Promise<RGBAImage> {
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("this browser will not give us a 2d canvas");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height);
    return { width, height, data: data.data };
  } finally {
    bitmap.close();
  }
}

/** First image found in a drop or paste, or null if there was not one. */
export function firstImage(items: DataTransferItemList | null | undefined): File | null {
  if (!items) return null;
  for (const item of Array.from(items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

export function drawToCanvas(canvas: HTMLCanvasElement, img: RGBAImage): void {
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // ImageData insists on an ArrayBuffer-backed view, which a buffer that has
  // been through a worker transfer is not typed as. The copy is a memcpy.
  const pixels = new Uint8ClampedArray(img.data);
  ctx.putImageData(new ImageData(pixels, img.width, img.height), 0, 0);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    // Revoke on the next frame; revoking immediately can cancel the download.
    requestAnimationFrame(() => URL.revokeObjectURL(url));
  }, "image/png");
}
