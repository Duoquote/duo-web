import * as Comlink from "comlink";
import type { WorkerApi } from "./worker";
import type { EncodeOptions, EncodePayload } from "./types";

export class CompressPool {
  private workers: Comlink.Remote<WorkerApi>[] = [];
  private rawWorkers: Worker[] = [];
  private nextIdx = 0;

  constructor(size: number) {
    const n = Math.max(1, Math.min(size, 8));
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      this.rawWorkers.push(w);
      this.workers.push(Comlink.wrap<WorkerApi>(w));
    }
  }

  async encode(
    opts: EncodeOptions,
    imageData: ImageData,
  ): Promise<Uint8Array> {
    const idx = this.nextIdx++ % this.workers.length;
    const worker = this.workers[idx];
    const dataCopy = new Uint8ClampedArray(imageData.data);
    const payload: EncodePayload = {
      data: dataCopy,
      width: imageData.width,
      height: imageData.height,
    };
    return worker.encode(
      opts,
      Comlink.transfer(payload, [dataCopy.buffer]),
    );
  }

  terminate() {
    for (const w of this.rawWorkers) w.terminate();
    this.workers = [];
    this.rawWorkers = [];
  }
}

export function detectAlpha(imageData: ImageData): import("./types").AlphaInfo {
  const data = imageData.data;
  const total = data.length / 4;
  let nonOpaque = 0;
  let partial = 0;

  const stride = total > 1_000_000 ? 4 * 4 : 4;
  let sampled = 0;

  for (let i = 3; i < data.length; i += stride) {
    sampled++;
    const a = data[i];
    if (a < 255) {
      nonOpaque++;
      if (a > 0) partial++;
    }
  }

  const alphaPixelRatio = sampled > 0 ? nonOpaque / sampled : 0;
  const partialRatio = sampled > 0 ? partial / sampled : 0;
  const hasAlpha = nonOpaque > 0;
  const hasPartialAlpha = partial > 0;

  let category: import("./types").AlphaInfo["category"] = "opaque";
  if (hasPartialAlpha && partialRatio > 0.005) category = "smooth-alpha";
  else if (hasAlpha) category = "binary-mask";

  return { hasAlpha, hasPartialAlpha, alphaPixelRatio, category };
}
