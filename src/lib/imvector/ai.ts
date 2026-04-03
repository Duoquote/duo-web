// AI upscale using ONNX Runtime Web with WebGPU.
// Model cached via Cache API (same pattern as FFmpeg in converter).

// ONNX model — exported from same Real-ESRGAN weights as Python pipeline.
// Input: "image" [1,3,H,W] float32 normalized [0,1]
// Output: "output" [1,3,4H,4W] float32, dynamic shapes
const MODEL_URLS: Record<string, string> = {
  // Real-ESRGAN x4plus anime 6B — 18MB, 4x super-resolution (BSD-3 license)
  upscale: "/models/realesrgan_x4_anime.onnx",
  denoise: "",
};

const CACHE_NAME = "imvector-models-v1";
const TILE_SIZE = 256;
const TILE_OVERLAP = 32;

/** Whether AI upscale model is configured. */
export function isUpscaleAvailable(): boolean {
  return !!MODEL_URLS.upscale;
}

export function isDenoiseAvailable(): boolean {
  return !!MODEL_URLS.denoise;
}

// ── Cache API helpers (matching converter/ffmpeg.ts pattern) ──

async function cachedFetchModel(url: string): Promise<ArrayBuffer | null> {
  try {
    // Try cache first
    if (typeof caches !== "undefined") {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url);
      if (cached) {
        return cached.arrayBuffer();
      }
    }

    // Download
    const resp = await fetch(url);
    if (!resp.ok) return null;

    // Cache the response
    if (typeof caches !== "undefined") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, resp.clone());
    }

    return resp.arrayBuffer();
  } catch {
    return null;
  }
}

export async function hasWebGPU(): Promise<boolean> {
  try {
    if (!navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * AI upscale using Real-ESRGAN (4x).
 * Returns upscaled RGBA ImageData, or null if unavailable.
 */
export async function aiUpscale(
  imageData: ImageData,
  onProgress?: (label: string) => void,
): Promise<ImageData | null> {
  if (!MODEL_URLS.upscale) return null;

  const ort = await importOrt();
  if (!ort) return null;

  onProgress?.("Downloading upscale model...");
  const modelData = await cachedFetchModel(MODEL_URLS.upscale);
  if (!modelData) return null;

  onProgress?.("Running AI upscale...");
  return runTiledInference(ort, modelData, imageData, 4, onProgress);
}

/**
 * AI denoise. Returns denoised ImageData, or null if unavailable.
 */
export async function aiDenoise(
  imageData: ImageData,
  onProgress?: (label: string) => void,
): Promise<ImageData | null> {
  if (!MODEL_URLS.denoise) return null;

  const ort = await importOrt();
  if (!ort) return null;

  onProgress?.("Downloading denoise model...");
  const modelData = await cachedFetchModel(MODEL_URLS.denoise);
  if (!modelData) return null;

  onProgress?.("Running AI denoise...");
  return runTiledInference(ort, modelData, imageData, 1, onProgress);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ortModule: any = null;

async function importOrt() {
  if (ortModule) return ortModule;
  try {
    ortModule = await import("onnxruntime-web");
    return ortModule;
  } catch {
    return null;
  }
}

/**
 * Run ONNX inference. Small images run whole, large images use tiled inference.
 */
async function runTiledInference(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ort: any,
  modelData: ArrayBuffer,
  imageData: ImageData,
  scaleFactor: number,
  onProgress?: (label: string) => void,
): Promise<ImageData | null> {
  try {
    const session = await ort.InferenceSession.create(modelData, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "disabled",
    });

    const { width: inW, height: inH } = imageData;

    // Small image: run whole (no tiling)
    if (inW <= TILE_SIZE && inH <= TILE_SIZE) {
      onProgress?.("AI processing...");
      const result = await runSingleTile(
        ort, session, imageData.data, inW, inH,
      );
      session.release();
      return result;
    }

    // Large image: tiled with overlap, accumulate + average (matching Python)
    const outW = inW * scaleFactor;
    const outH = inH * scaleFactor;
    const accumR = new Float32Array(outW * outH);
    const accumG = new Float32Array(outW * outH);
    const accumB = new Float32Array(outW * outH);
    const count = new Float32Array(outW * outH);

    const stride = TILE_SIZE - TILE_OVERLAP;
    const tiles: Array<[number, number]> = [];
    for (let y = 0; y < inH; y += stride) {
      for (let x = 0; x < inW; x += stride) {
        tiles.push([x, y]);
      }
    }

    for (let i = 0; i < tiles.length; i++) {
      const [tileX, tileY] = tiles[i];
      const x0 = Math.min(tileX, Math.max(0, inW - TILE_SIZE));
      const y0 = Math.min(tileY, Math.max(0, inH - TILE_SIZE));
      const tileW = Math.min(TILE_SIZE, inW - x0);
      const tileH = Math.min(TILE_SIZE, inH - y0);

      const input = new Float32Array(3 * tileH * tileW);
      for (let y = 0; y < tileH; y++) {
        for (let x = 0; x < tileW; x++) {
          const si = ((y0 + y) * inW + (x0 + x)) * 4;
          const di = y * tileW + x;
          input[0 * tileH * tileW + di] = imageData.data[si] / 255;
          input[1 * tileH * tileW + di] = imageData.data[si + 1] / 255;
          input[2 * tileH * tileW + di] = imageData.data[si + 2] / 255;
        }
      }

      const feeds = {
        image: new ort.Tensor("float32", input, [1, 3, tileH, tileW]),
      };
      const results = await session.run(feeds);
      const outKey = results.output ? "output" : Object.keys(results)[0];
      const outData = results[outKey].data as Float32Array;
      const otW = tileW * scaleFactor;
      const otH = tileH * scaleFactor;
      const ox0 = x0 * scaleFactor;
      const oy0 = y0 * scaleFactor;

      for (let y = 0; y < otH; y++) {
        for (let x = 0; x < otW; x++) {
          const oi = (oy0 + y) * outW + (ox0 + x);
          if (ox0 + x >= outW || oy0 + y >= outH) continue;
          const si = y * otW + x;
          accumR[oi] += outData[0 * otH * otW + si];
          accumG[oi] += outData[1 * otH * otW + si];
          accumB[oi] += outData[2 * otH * otW + si];
          count[oi] += 1;
        }
      }

      onProgress?.(`AI processing tile ${i + 1}/${tiles.length}...`);
    }

    const output = new Uint8ClampedArray(outW * outH * 4);
    for (let i = 0; i < outW * outH; i++) {
      const c = Math.max(1, count[i]);
      output[i * 4] = Math.round(
        Math.min(1, Math.max(0, accumR[i] / c)) * 255,
      );
      output[i * 4 + 1] = Math.round(
        Math.min(1, Math.max(0, accumG[i] / c)) * 255,
      );
      output[i * 4 + 2] = Math.round(
        Math.min(1, Math.max(0, accumB[i] / c)) * 255,
      );
      output[i * 4 + 3] = 255;
    }

    session.release();
    return new ImageData(output, outW, outH);
  } catch (e) {
    console.error("ONNX inference failed:", e);
    return null;
  }
}

/** Run a single image through the model (no tiling). */
async function runSingleTile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ort: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any,
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): Promise<ImageData> {
  const input = new Float32Array(3 * h * w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = y * w + x;
      input[0 * h * w + di] = pixels[si] / 255;
      input[1 * h * w + di] = pixels[si + 1] / 255;
      input[2 * h * w + di] = pixels[si + 2] / 255;
    }
  }

  // Log input stats
  let inMin = Infinity, inMax = -Infinity;
  for (let i = 0; i < Math.min(input.length, 10000); i++) {
    if (input[i] < inMin) inMin = input[i];
    if (input[i] > inMax) inMax = input[i];
  }
  console.log(`[AI] Input: ${w}x${h}, range: [${inMin.toFixed(3)}, ${inMax.toFixed(3)}]`);

  const feeds = {
    image: new ort.Tensor("float32", input, [1, 3, h, w]),
  };
  const results = await session.run(feeds);
  const outKey = results.output ? "output" : Object.keys(results)[0];
  const outData = results[outKey].data as Float32Array;
  const outDims = results[outKey].dims;
  const outH = outDims[2];
  const outW = outDims[3];

  // Log output stats
  let outMin = Infinity, outMax = -Infinity, outSum = 0;
  for (let i = 0; i < Math.min(outData.length, 10000); i++) {
    if (outData[i] < outMin) outMin = outData[i];
    if (outData[i] > outMax) outMax = outData[i];
    outSum += outData[i];
  }
  console.log(`[AI] Output: ${outW}x${outH}, range: [${outMin.toFixed(3)}, ${outMax.toFixed(3)}], mean: ${(outSum / Math.min(outData.length, 10000)).toFixed(3)}`);

  const output = new Uint8ClampedArray(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const si = y * outW + x;
      const di = (y * outW + x) * 4;
      output[di] = Math.round(
        Math.min(1, Math.max(0, outData[0 * outH * outW + si])) * 255,
      );
      output[di + 1] = Math.round(
        Math.min(1, Math.max(0, outData[1 * outH * outW + si])) * 255,
      );
      output[di + 2] = Math.round(
        Math.min(1, Math.max(0, outData[2 * outH * outW + si])) * 255,
      );
      output[di + 3] = 255;
    }
  }

  return new ImageData(output, outW, outH);
}
