import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  Download,
  Loader2,
  RotateCcw,
  Play,
  Pause,
  X,
} from "lucide-react";
import type { Locale } from "../../lib/i18n";
import { t } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import { parseGIF, decompressFrames } from "gifuct-js";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

// ── Helpers ──────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface GifFrame {
  imageData: ImageData;
  delay: number; // ms
}

interface CropRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Phase = "idle" | "loading" | "loaded" | "processing" | "done" | "error";

// ── GIF Decoder (gifuct-js) ─────────────────────────────────

async function decodeGif(
  file: File,
): Promise<{ frames: GifFrame[]; width: number; height: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const gif = parseGIF(arrayBuffer);
  const rawFrames = decompressFrames(gif, true);

  if (rawFrames.length === 0) throw new Error("No frames found in GIF");

  const width = gif.lsd.width;
  const height = gif.lsd.height;

  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = width;
  compositeCanvas.height = height;
  const compositeCtx = compositeCanvas.getContext("2d")!;

  const frames: GifFrame[] = [];

  for (const raw of rawFrames) {
    const disposalType = raw.disposalType ?? 0;

    const patchCanvas = document.createElement("canvas");
    patchCanvas.width = raw.dims.width;
    patchCanvas.height = raw.dims.height;
    const patchCtx = patchCanvas.getContext("2d")!;
    const patchData = patchCtx.createImageData(raw.dims.width, raw.dims.height);
    patchData.data.set(raw.patch);
    patchCtx.putImageData(patchData, 0, 0);

    compositeCtx.drawImage(patchCanvas, raw.dims.left, raw.dims.top);

    const imageData = compositeCtx.getImageData(0, 0, width, height);
    frames.push({ imageData, delay: Math.max(raw.delay || 100, 20) });

    if (disposalType === 2) {
      compositeCtx.clearRect(
        raw.dims.left,
        raw.dims.top,
        raw.dims.width,
        raw.dims.height,
      );
    }
  }

  return { frames, width, height };
}

// ── GIF Encoder (gifenc — fast, built-in quantize) ──────────

function encodeGif(
  frames: GifFrame[],
  width: number,
  height: number,
  targetColors: number,
): Uint8Array {
  const gif = GIFEncoder();

  for (let i = 0; i < frames.length; i++) {
    const { data } = frames[i].imageData;
    const palette = quantize(data, Math.max(2, Math.min(256, targetColors)));
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, {
      palette,
      delay: frames[i].delay,
      dispose: 2,
    });
  }

  gif.finish();
  return gif.bytesView();
}

// ── Transform helpers ────────────────────────────────────────

function applyTransformations(
  frames: GifFrame[],
  srcWidth: number,
  srcHeight: number,
  crop: CropRegion,
  resizeW: number,
  resizeH: number,
  compression: number,
  skipFrames: number,
): { frames: GifFrame[]; width: number; height: number; targetColors: number } {
  // Match original Python logic
  const targetColors =
    compression > 0
      ? Math.max(16, Math.round(256 - 240 * (compression / 100)))
      : 256;

  // Auto frame skip based on compression (matching original)
  let skipStep = skipFrames;
  if (compression >= 80) skipStep = Math.max(skipStep, 3);
  else if (compression >= 40) skipStep = Math.max(skipStep, 2);

  const result: GifFrame[] = [];
  let accDelay = 0;

  for (let i = 0; i < frames.length; i++) {
    accDelay += frames[i].delay;
    if (
      skipStep > 1 &&
      i % skipStep !== 0 &&
      i !== 0 &&
      i !== frames.length - 1
    ) {
      continue;
    }

    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = srcWidth;
    srcCanvas.height = srcHeight;
    srcCanvas.getContext("2d")!.putImageData(frames[i].imageData, 0, 0);

    // Crop
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = crop.w;
    cropCanvas.height = crop.h;
    cropCanvas
      .getContext("2d")!
      .drawImage(srcCanvas, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);

    // Resize
    const outCanvas = document.createElement("canvas");
    outCanvas.width = resizeW;
    outCanvas.height = resizeH;
    const outCtx = outCanvas.getContext("2d")!;
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    outCtx.drawImage(cropCanvas, 0, 0, resizeW, resizeH);

    const imageData = outCtx.getImageData(0, 0, resizeW, resizeH);
    result.push({ imageData, delay: accDelay });
    accDelay = 0;
  }

  return { frames: result, width: resizeW, height: resizeH, targetColors };
}

// ── Component ────────────────────────────────────────────────

export default function GifOptimizer({ locale }: { locale: Locale }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);

  const [srcFrames, setSrcFrames] = useState<GifFrame[]>([]);
  const [srcWidth, setSrcWidth] = useState(0);
  const [srcHeight, setSrcHeight] = useState(0);
  const originalBlobRef = useRef<Blob | null>(null);

  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);
  const [resizeW, setResizeW] = useState(0);
  const [resizeH, setResizeH] = useState(0);
  const [keepAspect, setKeepAspect] = useState(true);
  const [compression, setCompression] = useState(0);
  const [skipFrames, setSkipFrames] = useState(1);
  const [discordMode, setDiscordMode] = useState(false);

  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputSize, setOutputSize] = useState(0);
  const [outputWidth, setOutputWidth] = useState(0);
  const [outputHeight, setOutputHeight] = useState(0);
  const [outputFrameCount, setOutputFrameCount] = useState(0);

  const origCanvasRef = useRef<HTMLCanvasElement>(null);
  const modCanvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const frameIdxRef = useRef(0);
  const modFrameIdxRef = useRef(0);
  const [modFrames, setModFrames] = useState<GifFrame[]>([]);
  const [modW, setModW] = useState(0);
  const [modH, setModH] = useState(0);

  const [cropDrawing, setCropDrawing] = useState(false);
  const cropStartRef = useRef({ x: 0, y: 0 });
  const [previewScale, setPreviewScale] = useState(1);

  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const processingRef = useRef(false);

  // ── Load GIF ──────────────────────────────────────────────

  const loadGif = useCallback(async (file: File) => {
    setPhase("loading");
    setError("");
    setFileName(file.name);
    setFileSize(file.size);
    setOutputBlob(null);
    setModFrames([]);
    originalBlobRef.current = new Blob([await file.arrayBuffer()], { type: "image/gif" });

    try {
      const { frames, width, height } = await decodeGif(file);
      setSrcFrames(frames);
      setSrcWidth(width);
      setSrcHeight(height);
      setCropX(0);
      setCropY(0);
      setCropW(width);
      setCropH(height);
      setResizeW(width);
      setResizeH(height);
      setCompression(0);
      setSkipFrames(1);
      setDiscordMode(false);
      setPlaying(true);
      frameIdxRef.current = 0;
      setPhase("loaded");
    } catch (e: any) {
      setError(e.message || "Failed to decode GIF");
      setPhase("error");
    }
  }, []);

  const handleFile = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith("image/gif") && !file.name.endsWith(".gif")) {
        setError(t(locale, "gifOptimizer.errorFormat"));
        setPhase("error");
        return;
      }
      loadGif(file);
    },
    [loadGif, locale],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files);
    },
    [handleFile],
  );

  // ── Preview animation (original) ─────────────────────────

  useEffect(() => {
    if (srcFrames.length === 0 || !origCanvasRef.current) return;

    const canvas = origCanvasRef.current;
    const maxDim = 400;
    const scale = Math.min(maxDim / srcWidth, maxDim / srcHeight, 1);
    setPreviewScale(scale);
    const pw = Math.round(srcWidth * scale);
    const ph = Math.round(srcHeight * scale);
    canvas.width = pw;
    canvas.height = ph;
    const ctx = canvas.getContext("2d")!;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function drawFrame() {
      if (cancelled) return;
      const idx = frameIdxRef.current % srcFrames.length;
      const frame = srcFrames[idx];
      const tmp = document.createElement("canvas");
      tmp.width = srcWidth;
      tmp.height = srcHeight;
      tmp.getContext("2d")!.putImageData(frame.imageData, 0, 0);
      ctx.clearRect(0, 0, pw, ph);
      ctx.drawImage(tmp, 0, 0, pw, ph);
      if (playing) {
        frameIdxRef.current = (idx + 1) % srcFrames.length;
        timeoutId = setTimeout(drawFrame, Math.max(frame.delay, 20));
      }
    }
    drawFrame();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [srcFrames, srcWidth, srcHeight, playing]);

  // ── Preview animation (modified) ─────────────────────────

  useEffect(() => {
    if (modFrames.length === 0 || !modCanvasRef.current) return;

    const canvas = modCanvasRef.current;
    const maxDim = 400;
    const scale = Math.min(maxDim / modW, maxDim / modH, 1);
    const pw = Math.round(modW * scale);
    const ph = Math.round(modH * scale);
    canvas.width = pw;
    canvas.height = ph;
    const ctx = canvas.getContext("2d")!;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function drawFrame() {
      if (cancelled) return;
      const idx = modFrameIdxRef.current % modFrames.length;
      const frame = modFrames[idx];
      const tmp = document.createElement("canvas");
      tmp.width = modW;
      tmp.height = modH;
      tmp.getContext("2d")!.putImageData(frame.imageData, 0, 0);
      ctx.clearRect(0, 0, pw, ph);
      ctx.drawImage(tmp, 0, 0, pw, ph);
      if (playing) {
        modFrameIdxRef.current = (idx + 1) % modFrames.length;
        timeoutId = setTimeout(drawFrame, Math.max(frame.delay, 20));
      }
    }
    drawFrame();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [modFrames, modW, modH, playing]);

  // ── Crop drawing on canvas ────────────────────────────────

  const onCropStart = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (srcFrames.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      cropStartRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setCropDrawing(true);
    },
    [srcFrames],
  );

  const onCropDrag = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!cropDrawing) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const sx = cropStartRef.current.x;
      const sy = cropStartRef.current.y;
      const rx = Math.round(Math.min(sx, x) / previewScale);
      const ry = Math.round(Math.min(sy, y) / previewScale);
      const rw = Math.round(Math.abs(x - sx) / previewScale);
      const rh = Math.round(Math.abs(y - sy) / previewScale);
      setCropX(Math.max(0, Math.min(rx, srcWidth)));
      setCropY(Math.max(0, Math.min(ry, srcHeight)));
      setCropW(Math.max(1, Math.min(rw, srcWidth - rx)));
      setCropH(Math.max(1, Math.min(rh, srcHeight - ry)));
    },
    [cropDrawing, previewScale, srcWidth, srcHeight],
  );

  const onCropEnd = useCallback(() => {
    setCropDrawing(false);
    if (keepAspect && cropW > 0 && cropH > 0) {
      setResizeW(cropW);
      setResizeH(cropH);
    }
  }, [cropW, cropH, keepAspect]);

  // ── Resize with aspect ratio ──────────────────────────────

  const onResizeWChange = useCallback(
    (v: number) => {
      setResizeW(v);
      if (keepAspect && cropW > 0) {
        setResizeH(Math.round((v / cropW) * cropH));
      }
    },
    [keepAspect, cropW, cropH],
  );

  const onResizeHChange = useCallback(
    (v: number) => {
      setResizeH(v);
      if (keepAspect && cropH > 0) {
        setResizeW(Math.round((v / cropH) * cropW));
      }
    },
    [keepAspect, cropW, cropH],
  );

  // ── Process (called by debounced auto-apply) ──────────────

  const processGif = useCallback(async () => {
    if (srcFrames.length === 0 || processingRef.current) return;
    processingRef.current = true;
    setPhase("processing");
    setError("");

    // Yield to UI before heavy work
    await new Promise((r) => setTimeout(r, 0));

    try {
      const crop: CropRegion = {
        x: cropX,
        y: cropY,
        w: Math.min(cropW, srcWidth - cropX),
        h: Math.min(cropH, srcHeight - cropY),
      };

      // Check if any transform is actually applied
      const noCrop =
        crop.x === 0 && crop.y === 0 &&
        crop.w === srcWidth && crop.h === srcHeight;
      const noResize = resizeW === srcWidth && resizeH === srcHeight;
      const noCompression = compression === 0 && skipFrames <= 1;
      const isPassthrough = noCrop && noResize && noCompression && !discordMode;

      if (isPassthrough && originalBlobRef.current) {
        // No transforms — use original file directly
        setOutputBlob(originalBlobRef.current);
        setOutputSize(originalBlobRef.current.size);
        setOutputWidth(srcWidth);
        setOutputHeight(srcHeight);
        setOutputFrameCount(srcFrames.length);
        setModFrames(srcFrames);
        setModW(srcWidth);
        setModH(srcHeight);
        modFrameIdxRef.current = 0;
      } else if (discordMode) {
        let bestBlob: Blob | null = null;
        let bestFrames: GifFrame[] = [];
        let bestW = 0;
        let bestH = 0;

        for (let p = 0; p <= 100; p += 15) {
          const scaleMul = 1.0 - 0.5 * (p / 100);
          const fw = Math.max(10, Math.round(resizeW * scaleMul));
          const fh = Math.max(10, Math.round(resizeH * scaleMul));

          const result = applyTransformations(
            srcFrames, srcWidth, srcHeight, crop, fw, fh, p, 1,
          );
          const bytes = encodeGif(
            result.frames, result.width, result.height, result.targetColors,
          );

          const blob = new Blob([bytes], { type: "image/gif" });
          bestBlob = blob;
          bestFrames = result.frames;
          bestW = result.width;
          bestH = result.height;

          if (blob.size <= 9.9 * 1024 * 1024) break;
        }

        if (bestBlob) {
          setOutputBlob(bestBlob);
          setOutputSize(bestBlob.size);
          setOutputWidth(bestW);
          setOutputHeight(bestH);
          setOutputFrameCount(bestFrames.length);
          setModFrames(bestFrames);
          setModW(bestW);
          setModH(bestH);
          modFrameIdxRef.current = 0;
        }
      } else {
        const scaleMul = 1.0 - 0.5 * (compression / 100);
        const fw = Math.max(10, Math.round(resizeW * scaleMul));
        const fh = Math.max(10, Math.round(resizeH * scaleMul));

        const result = applyTransformations(
          srcFrames, srcWidth, srcHeight, crop, fw, fh, compression, skipFrames,
        );
        const bytes = encodeGif(
          result.frames, result.width, result.height, result.targetColors,
        );

        let blob = new Blob([bytes], { type: "image/gif" });

        // If re-encoded is larger than original and only compression changed
        // (no crop/resize), use the original
        if (noCrop && noResize && originalBlobRef.current && blob.size > originalBlobRef.current.size) {
          blob = originalBlobRef.current;
        }

        setOutputBlob(blob);
        setOutputSize(blob.size);
        setOutputWidth(result.width);
        setOutputHeight(result.height);
        setOutputFrameCount(result.frames.length);
        setModFrames(result.frames);
        setModW(result.width);
        setModH(result.height);
        modFrameIdxRef.current = 0;
      }

      setPhase("done");
    } catch (e: any) {
      setError(e.message || "Processing failed");
      setPhase("error");
    } finally {
      processingRef.current = false;
    }
  }, [
    srcFrames, srcWidth, srcHeight,
    cropX, cropY, cropW, cropH,
    resizeW, resizeH, compression, skipFrames, discordMode,
  ]);

  // ── Debounced auto-apply when settings change ─────────────

  useEffect(() => {
    if (srcFrames.length === 0) return;
    if (phase === "loading") return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      processGif();
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [
    cropX, cropY, cropW, cropH,
    resizeW, resizeH, compression, skipFrames, discordMode,
    srcFrames,
  ]);

  // ── Download ──────────────────────────────────────────────

  const downloadOutput = useCallback(() => {
    if (!outputBlob) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement("a");
    a.href = url;
    const base = fileName.replace(/\.gif$/i, "");
    a.download = `${base}-optimized.gif`;
    a.click();
    URL.revokeObjectURL(url);
  }, [outputBlob, fileName]);

  // ── Reset ─────────────────────────────────────────────────

  const reset = useCallback(() => {
    clearTimeout(debounceRef.current);
    setPhase("idle");
    setSrcFrames([]);
    setModFrames([]);
    setOutputBlob(null);
    setError("");
    frameIdxRef.current = 0;
    modFrameIdxRef.current = 0;
  }, []);

  // ── Render ────────────────────────────────────────────────

  const isLoaded = phase === "loaded" || phase === "done" || phase === "processing";

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      {phase === "idle" || phase === "error" ? (
        <div>
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-12 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {phase === "loading" ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {dragOver
                    ? t(locale, "gifOptimizer.dropzoneActive")
                    : t(locale, "gifOptimizer.dropzone")}
                </span>
                <span className="text-xs text-muted-foreground/60">.gif</span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".gif,image/gif"
              className="hidden"
              onChange={(e) => handleFile(e.target.files)}
            />
          </label>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
      ) : null}

      {/* Main editor */}
      {isLoaded ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {/* File info bar */}
            <div className="flex flex-wrap items-center gap-3 border border-border bg-card px-4 py-2 text-sm">
              <span className="truncate font-medium text-foreground">{fileName}</span>
              <span className="text-muted-foreground">{formatBytes(fileSize)}</span>
              <span className="text-muted-foreground">
                {srcWidth}&times;{srcHeight}
              </span>
              <span className="text-muted-foreground">
                {srcFrames.length} {t(locale, "gifOptimizer.frames")}
              </span>
              <div className="ml-auto flex gap-2">
                {phase === "processing" && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                <button
                  onClick={() => setPlaying(!playing)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={reset}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Canvas previews */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(locale, "gifOptimizer.original")}
                </p>
                <div className="relative border border-border bg-black/40 p-2">
                  <canvas
                    ref={origCanvasRef}
                    className="mx-auto cursor-crosshair"
                    onMouseDown={onCropStart}
                    onMouseMove={onCropDrag}
                    onMouseUp={onCropEnd}
                    onMouseLeave={onCropEnd}
                  />
                  <p className="mt-1 text-center text-[10px] text-muted-foreground/50">
                    {t(locale, "gifOptimizer.cropHint")}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(locale, "gifOptimizer.result")}
                  {outputBlob && (
                    <span className="ml-2 font-normal normal-case text-primary">
                      {formatBytes(outputSize)} &middot; {outputWidth}&times;
                      {outputHeight} &middot; {outputFrameCount}{" "}
                      {t(locale, "gifOptimizer.frames")}
                    </span>
                  )}
                </p>
                <div className="relative border border-border bg-black/40 p-2">
                  {modFrames.length > 0 ? (
                    <canvas ref={modCanvasRef} className="mx-auto" />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground/40">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Size comparison */}
            {outputBlob && (
              <div className="flex flex-wrap items-center gap-4 border border-border bg-card px-4 py-2 text-sm">
                <span className="text-muted-foreground">
                  {formatBytes(fileSize)} &rarr; {formatBytes(outputSize)}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    outputSize < fileSize ? "text-green-400" : "text-red-400",
                  )}
                >
                  {outputSize < fileSize
                    ? `-${((1 - outputSize / fileSize) * 100).toFixed(1)}%`
                    : `+${((outputSize / fileSize - 1) * 100).toFixed(1)}%`}
                </span>
                {discordMode && (
                  <span
                    className={cn(
                      "ml-auto text-xs font-medium",
                      outputSize <= 10 * 1024 * 1024
                        ? "text-green-400"
                        : "text-red-400",
                    )}
                  >
                    {outputSize <= 10 * 1024 * 1024 ? "Discord OK" : "Discord: too large"}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Settings panel */}
          <div className="space-y-4">
            {/* Crop */}
            <fieldset className="border border-border p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t(locale, "gifOptimizer.crop")}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["X", cropX, setCropX, 0, srcWidth],
                    ["Y", cropY, setCropY, 0, srcHeight],
                    ["W", cropW, setCropW, 1, srcWidth],
                    ["H", cropH, setCropH, 1, srcHeight],
                  ] as const
                ).map(([label, val, setter, min, max]) => (
                  <label key={label} className="text-xs text-muted-foreground">
                    {label}
                    <input
                      type="number"
                      value={val}
                      min={min}
                      max={max}
                      onChange={(e) => setter(Number(e.target.value))}
                      className="mt-0.5 block w-full border border-border bg-background px-2 py-1 text-sm text-foreground"
                    />
                  </label>
                ))}
              </div>
              <button
                onClick={() => {
                  setCropX(0);
                  setCropY(0);
                  setCropW(srcWidth);
                  setCropH(srcHeight);
                  setResizeW(srcWidth);
                  setResizeH(srcHeight);
                }}
                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                {t(locale, "gifOptimizer.resetCrop")}
              </button>
            </fieldset>

            {/* Resize */}
            <fieldset className="border border-border p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t(locale, "gifOptimizer.resize")}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  W
                  <input
                    type="number"
                    value={resizeW}
                    min={1}
                    onChange={(e) => onResizeWChange(Number(e.target.value))}
                    className="mt-0.5 block w-full border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  H
                  <input
                    type="number"
                    value={resizeH}
                    min={1}
                    onChange={(e) => onResizeHChange(Number(e.target.value))}
                    className="mt-0.5 block w-full border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={keepAspect}
                  onChange={(e) => setKeepAspect(e.target.checked)}
                  className="accent-primary"
                />
                {t(locale, "gifOptimizer.keepAspect")}
              </label>
            </fieldset>

            {/* Optimization */}
            <fieldset className="border border-border p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t(locale, "gifOptimizer.optimization")}
              </legend>
              <label className="text-xs text-muted-foreground">
                {t(locale, "gifOptimizer.compressionPower")}: {compression}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={compression}
                  disabled={discordMode}
                  onChange={(e) => setCompression(Number(e.target.value))}
                  className="mt-1 block w-full accent-primary"
                />
              </label>
              <label className="mt-3 text-xs text-muted-foreground">
                {t(locale, "gifOptimizer.frameSkip")}
                <select
                  value={skipFrames}
                  disabled={discordMode}
                  onChange={(e) => setSkipFrames(Number(e.target.value))}
                  className="mt-0.5 block w-full border border-border bg-background px-2 py-1 text-sm text-foreground"
                >
                  <option value={1}>{t(locale, "gifOptimizer.skipNone")}</option>
                  <option value={2}>{t(locale, "gifOptimizer.skipEvery2")}</option>
                  <option value={3}>{t(locale, "gifOptimizer.skipEvery3")}</option>
                  <option value={4}>{t(locale, "gifOptimizer.skipEvery4")}</option>
                </select>
              </label>
              <label className="mt-3 flex items-center gap-2 text-xs text-primary">
                <input
                  type="checkbox"
                  checked={discordMode}
                  onChange={(e) => setDiscordMode(e.target.checked)}
                  className="accent-primary"
                />
                {t(locale, "gifOptimizer.discord")}
              </label>
              {discordMode && (
                <p className="mt-1 text-[10px] text-muted-foreground/60">
                  {t(locale, "gifOptimizer.discordHint")}
                </p>
              )}
            </fieldset>

            {/* Actions */}
            <div className="space-y-2">
              {outputBlob && (
                <button
                  onClick={downloadOutput}
                  className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  {t(locale, "gifOptimizer.download")}
                </button>
              )}
              <button
                onClick={reset}
                className="flex w-full items-center justify-center gap-2 px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(locale, "gifOptimizer.loadAnother")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
