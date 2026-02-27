import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const FFMPEG_VERSION = "0.12.15";
const CORE_VERSION = "0.12.10";
// Must use ESM build — the wrapper worker is type:"module" and uses dynamic import().
const CORE_CDN = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
const WORKER_CDN = `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/esm/worker.js`;

const CACHE_NAME = `ffmpeg-${CORE_VERSION}`;

export type ProgressCallback = (progress: number) => void;
export type LogCallback = (message: string) => void;

// ---------------------------------------------------------------------------
// Cache API helpers — persist CDN resources so they survive browser eviction
// ---------------------------------------------------------------------------

async function cachedFetch(url: string): Promise<string> {
  if (typeof caches === "undefined") return url;

  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url);
    if (cached) {
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }

    const resp = await fetch(url);
    if (resp.ok) {
      // Clone before consuming — put expects an unconsumed Response
      await cache.put(url, resp.clone());
      const blob = await resp.blob();
      return URL.createObjectURL(blob);
    }
  } catch {
    // Cache API unavailable or network error — fall back to direct URL
  }

  return url;
}

// ---------------------------------------------------------------------------
// Shared load config
// ---------------------------------------------------------------------------

function makeWorkerURL(): string {
  const workerBlob = new Blob([`import "${WORKER_CDN}";`], {
    type: "text/javascript",
  });
  return URL.createObjectURL(workerBlob);
}

async function getLoadConfig() {
  const [coreURL, wasmURL] = await Promise.all([
    cachedFetch(`${CORE_CDN}/ffmpeg-core.js`),
    cachedFetch(`${CORE_CDN}/ffmpeg-core.wasm`),
  ]);
  return { coreURL, wasmURL };
}

// ---------------------------------------------------------------------------
// Singleton (used for preloading / single-file fallback)
// ---------------------------------------------------------------------------

let ffmpegInstance: FFmpeg | null = null;
let loaded = false;

export async function getFFmpeg(onLog?: LogCallback): Promise<FFmpeg> {
  if (ffmpegInstance && loaded) return ffmpegInstance;

  ffmpegInstance = new FFmpeg();

  if (onLog) {
    ffmpegInstance.on("log", ({ message }) => onLog(message));
  }

  const config = await getLoadConfig();
  await ffmpegInstance.load({ classWorkerURL: makeWorkerURL(), ...config });
  loaded = true;

  return ffmpegInstance;
}

export function isLoaded(): boolean {
  return loaded;
}

// ---------------------------------------------------------------------------
// Worker pool for parallel conversion
// ---------------------------------------------------------------------------

const activeWorkers = new Set<FFmpeg>();

export async function createWorker(): Promise<FFmpeg> {
  const instance = new FFmpeg();
  const config = await getLoadConfig();
  await instance.load({ classWorkerURL: makeWorkerURL(), ...config });
  activeWorkers.add(instance);
  return instance;
}

export function releaseWorker(instance: FFmpeg): void {
  activeWorkers.delete(instance);
  try {
    instance.terminate();
  } catch {}
}

export async function convertWithWorker(
  worker: FFmpeg,
  inputFile: File,
  outputFileName: string,
  ffmpegArgs: string[],
  onProgress?: ProgressCallback,
): Promise<{ data: Uint8Array; size: number }> {
  const progressHandler = onProgress
    ? ({ progress }: { progress: number }) =>
        onProgress(Math.min(Math.round(progress * 100), 100))
    : undefined;

  if (progressHandler) {
    worker.on("progress", progressHandler);
  }

  try {
    const inputData = await fetchFile(inputFile);
    await worker.writeFile("input", inputData);

    await worker.exec(["-i", "input", ...ffmpegArgs, outputFileName]);

    const outputData = await worker.readFile(outputFileName);
    const data = outputData as Uint8Array;

    return { data, size: data.byteLength };
  } finally {
    try {
      await worker.deleteFile("input");
    } catch {}
    try {
      await worker.deleteFile(outputFileName);
    } catch {}

    if (progressHandler) {
      worker.off("progress", progressHandler);
    }
  }
}

// ---------------------------------------------------------------------------
// Prompt dismiss preference
// ---------------------------------------------------------------------------

const DISMISS_KEY = "ffmpeg-wasm-prompt-dismissed";

export function isPromptDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPromptDismissed(dismissed: boolean): void {
  try {
    if (dismissed) {
      localStorage.setItem(DISMISS_KEY, "1");
    } else {
      localStorage.removeItem(DISMISS_KEY);
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Cancellation & cleanup
// ---------------------------------------------------------------------------

export function cancelAll(): void {
  for (const w of activeWorkers) {
    try {
      w.terminate();
    } catch {}
  }
  activeWorkers.clear();

  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
    loaded = false;
  }
}

export function terminate(): void {
  cancelAll();
}
