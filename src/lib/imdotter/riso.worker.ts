/// <reference lib="webworker" />
import { risograph } from "./render";
import type { RisoOptions } from "./types";

/**
 * The press runs off the main thread: a full sheet is tens of millions of
 * operations and would otherwise freeze every slider mid-drag.
 */

export interface RenderRequest {
  id: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
  options: RisoOptions;
}

export interface RenderResponse {
  id: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
  ms: number;
  blend: "multiply" | "additive";
  error?: string;
}

self.onmessage = (e: MessageEvent<RenderRequest>) => {
  const { id, width, height, buffer, options } = e.data;
  const started = performance.now();
  try {
    const { image, blend } = risograph(
      { width, height, data: new Uint8ClampedArray(buffer) },
      options,
    );
    const out = image.data.buffer as ArrayBuffer;
    const msg: RenderResponse = {
      id,
      width: image.width,
      height: image.height,
      buffer: out,
      ms: performance.now() - started,
      blend,
    };
    (self as unknown as Worker).postMessage(msg, [out]);
  } catch (err) {
    const msg: RenderResponse = {
      id,
      width: 0,
      height: 0,
      buffer: new ArrayBuffer(0),
      ms: performance.now() - started,
      blend: "multiply",
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(msg);
  }
};
