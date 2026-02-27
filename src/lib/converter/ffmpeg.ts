import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const FFMPEG_VERSION = "0.12.15";
const CORE_VERSION = "0.12.10";
// Must use ESM build — the wrapper worker is type:"module" and uses dynamic import().
const CORE_CDN = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
const WORKER_CDN = `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/esm/worker.js`;

let ffmpegInstance: FFmpeg | null = null;
let loaded = false;

export type ProgressCallback = (progress: number) => void;
export type LogCallback = (message: string) => void;

export async function getFFmpeg(onLog?: LogCallback): Promise<FFmpeg> {
  if (ffmpegInstance && loaded) return ffmpegInstance;

  ffmpegInstance = new FFmpeg();

  if (onLog) {
    ffmpegInstance.on("log", ({ message }) => onLog(message));
  }

  // Vite doesn't transform the `new URL("./worker.js", import.meta.url)`
  // pattern inside node_modules, so the default worker path is broken.
  // Work around this by creating a same-origin blob worker that re-imports
  // the real worker from jsDelivr CDN (which serves CORS headers).
  const workerBlob = new Blob([`import "${WORKER_CDN}";`], {
    type: "text/javascript",
  });
  const classWorkerURL = URL.createObjectURL(workerBlob);

  await ffmpegInstance.load({
    classWorkerURL,
    coreURL: `${CORE_CDN}/ffmpeg-core.js`,
    wasmURL: `${CORE_CDN}/ffmpeg-core.wasm`,
  });
  loaded = true;

  return ffmpegInstance;
}

export async function convert(
  inputFile: File,
  outputFileName: string,
  ffmpegArgs: string[],
  onProgress?: ProgressCallback,
): Promise<{ data: Uint8Array; size: number }> {
  const ffmpeg = await getFFmpeg();

  const progressHandler = onProgress
    ? ({ progress }: { progress: number }) =>
        onProgress(Math.min(Math.round(progress * 100), 100))
    : undefined;

  if (progressHandler) {
    ffmpeg.on("progress", progressHandler);
  }

  try {
    const inputData = await fetchFile(inputFile);
    await ffmpeg.writeFile("input", inputData);

    await ffmpeg.exec(["-i", "input", ...ffmpegArgs, outputFileName]);

    const outputData = await ffmpeg.readFile(outputFileName);
    const data = outputData as Uint8Array;

    return { data, size: data.byteLength };
  } finally {
    try {
      await ffmpeg.deleteFile("input");
    } catch {}
    try {
      await ffmpeg.deleteFile(outputFileName);
    } catch {}

    if (progressHandler) {
      ffmpeg.off("progress", progressHandler);
    }
  }
}

export function cancel(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
    loaded = false;
  }
}

export function terminate(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
    loaded = false;
  }
}
