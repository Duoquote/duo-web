// Web Worker: loads imvector WASM and runs the processing pipeline.

import init, { process } from "../../../wasm/imvector/pkg/imvector";
import type { WorkerInput, WorkerOutput } from "./types";

let wasmReady: Promise<void> | null = null;

async function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = init().then(() => {});
  }
  return wasmReady;
}

function post(msg: WorkerOutput) {
  self.postMessage(msg);
}

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const msg = e.data;

  if (msg.type === "process") {
    try {
      post({ type: "progress", percent: 5, label: "Loading WASM..." });
      await ensureWasm();

      post({ type: "progress", percent: 10, label: "Processing..." });

      const pixels = new Uint8Array(msg.pixels);
      const settingsJson = JSON.stringify({
        quantizeColors: msg.settings.quantizeColors,
        denoise: msg.settings.denoise,
        detectShapes: msg.settings.detectShapes,
      });

      const resultJson = process(pixels, msg.width, msg.height, settingsJson);
      const result = JSON.parse(resultJson);

      post({
        type: "result",
        svgs: result.svgs,
        classification: result.classification,
        timings: result.timings,
        quantizedColors: result.quantizedColors,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "WASM processing failed";
      post({ type: "error", message });
    }
  }
};
