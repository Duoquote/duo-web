// Pipeline orchestrator: AI (main thread) → Worker (WASM) → SVGO (main thread)

import type {
  ImVectorAction,
  ProcessSettings,
  PresetResult,
  WorkerOutput,
  Timings,
} from "./types";
import { optimizeSvg } from "./svgo";
import { aiUpscale, hasWebGPU } from "./ai";

/**
 * Run the full imvector pipeline for an image file.
 * Dispatches progress actions throughout.
 */
export async function runPipeline(
  file: File,
  settings: ProcessSettings,
  dispatch: (action: ImVectorAction) => void,
): Promise<void> {
  try {
    // 1. Load image to canvas and extract pixels
    dispatch({ type: "PROGRESS", percent: 2, label: "Loading image..." });
    const imageData = await loadImageToPixels(file);
    let { width, height } = imageData;
    let pixels = imageData.data;

    // 2. AI processing (main thread, needs WebGPU)
    let aiMs = 0;
    const aiStart = performance.now();

    if (settings.aiUpscale) {
      const gpuAvailable = await hasWebGPU();
      if (gpuAvailable) {
        let currentImageData = new ImageData(
          new Uint8ClampedArray(pixels),
          width,
          height,
        );

        // Match Python auto_scale: skip if already large enough
        const maxDim = Math.max(width, height);
        if (maxDim < 1500) {
          dispatch({
            type: "PROGRESS",
            percent: 10,
            label: "AI upscaling...",
          });
          const upscaled = await aiUpscale(currentImageData, (label) =>
            dispatch({ type: "PROGRESS", percent: 20, label }),
          );
          if (upscaled) {
            currentImageData = upscaled;
            width = upscaled.width;
            height = upscaled.height;
          }
        }

        pixels = currentImageData.data;
      } else {
        dispatch({
          type: "PROGRESS",
          percent: 10,
          label: "WebGPU unavailable, skipping AI...",
        });
      }
    }
    aiMs = performance.now() - aiStart;

    // 3. Transfer pixels to WASM worker
    dispatch({ type: "PROGRESS", percent: 40, label: "Starting WASM..." });

    const workerResult = await runWorker(
      pixels.buffer,
      width,
      height,
      {
        quantizeColors: settings.quantizeColors,
        denoise: settings.denoise,
        detectShapes: settings.detectShapes,
      },
      dispatch,
    );

    // 4. SVGO optimization (main thread)
    dispatch({
      type: "PROGRESS",
      percent: 90,
      label: "Optimizing SVGs...",
    });

    const svgoStart = performance.now();
    const presets: PresetResult[] = workerResult.svgs.map((s) => {
      const optimized = optimizeSvg(s.svg, settings.optimizeLevel);
      const blob = new Blob([optimized], { type: "image/svg+xml" });
      const blobUrl = URL.createObjectURL(blob);
      const pathCount =
        (optimized.match(/<path[\s>]/g) || []).length +
        (optimized.match(/<circle[\s>]/g) || []).length +
        (optimized.match(/<ellipse[\s>]/g) || []).length +
        (optimized.match(/<rect[\s/>]/g) || []).length;

      return {
        name: s.name,
        svg: optimized,
        blobUrl,
        traceMsec: s.traceMs,
        size: new Blob([optimized]).size,
        pathCount,
      };
    });
    const svgoMs = performance.now() - svgoStart;

    const timings: Timings = {
      classifyMs: workerResult.timings.classifyMs,
      bilateralMs: workerResult.timings.bilateralMs,
      tvDenoiseMs: workerResult.timings.tvDenoiseMs,
      quantizeMs: workerResult.timings.quantizeMs,
      traceMs: workerResult.timings.traceMs,
      shapesMs: workerResult.timings.shapesMs,
      totalMs: workerResult.timings.totalMs + aiMs + svgoMs,
      aiMs,
      svgoMs,
    };

    dispatch({
      type: "PROCESS_COMPLETE",
      presets,
      classification: workerResult.classification,
      timings,
      quantizedColors: workerResult.quantizedColors,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Processing failed";
    dispatch({ type: "ERROR", error: message });
  }
}

function loadImageToPixels(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(imageData);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

interface WorkerResultData {
  svgs: Array<{ name: string; svg: string; traceMs: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classification: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timings: any;
  quantizedColors: number;
}

function runWorker(
  pixelBuffer: ArrayBuffer,
  width: number,
  height: number,
  settings: { quantizeColors: number; denoise: boolean; detectShapes: boolean },
  dispatch: (action: ImVectorAction) => void,
): Promise<WorkerResultData> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
      const msg = e.data;
      switch (msg.type) {
        case "progress":
          dispatch({
            type: "PROGRESS",
            percent: 40 + (msg.percent / 100) * 50,
            label: msg.label,
          });
          break;
        case "result":
          worker.terminate();
          resolve(msg);
          break;
        case "error":
          worker.terminate();
          reject(new Error(msg.message));
          break;
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "Worker error"));
    };

    // Transfer pixel buffer (zero-copy)
    const copy = pixelBuffer.slice(0);
    worker.postMessage(
      {
        type: "process",
        pixels: copy,
        width,
        height,
        settings,
      },
      [copy],
    );
  });
}
