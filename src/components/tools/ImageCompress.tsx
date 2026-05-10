import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Upload,
  Download,
  Loader2,
  X,
  Check,
  AlertTriangle,
  SplitSquareHorizontal,
  Columns2,
  Maximize2,
} from "lucide-react";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import type { Locale } from "../../lib/i18n";
import { t } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import { PRESETS, PRESET_BY_ID } from "../../lib/image-compress/presets";
import { CompressPool, detectAlpha } from "../../lib/image-compress/pool";
import type {
  AlphaInfo,
  PresetResult,
} from "../../lib/image-compress/types";

type Phase = "idle" | "loading" | "ready" | "error";
type CompareMode = "side" | "slider";

const ACCEPT = "image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function compositeOnWhite(src: ImageData): ImageData {
  const out = new Uint8ClampedArray(src.data.length);
  const d = src.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    const inv = 1 - a;
    out[i] = d[i] * a + 255 * inv;
    out[i + 1] = d[i + 1] * a + 255 * inv;
    out[i + 2] = d[i + 2] * a + 255 * inv;
    out[i + 3] = 255;
  }
  return new ImageData(out, src.width, src.height);
}

async function decodeFile(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(bitmap.width, bitmap.height)
      : Object.assign(document.createElement("canvas"), {
          width: bitmap.width,
          height: bitmap.height,
        });
  const ctx = canvas.getContext("2d") as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("2D context unavailable");
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close?.();
  return imageData;
}

function pickRecommended(alpha: AlphaInfo): string {
  if (alpha.category === "smooth-alpha") return "webp-q80";
  if (alpha.category === "binary-mask") return "webp-q80";
  return "mozjpeg-q80";
}

export default function ImageCompress({ locale }: { locale: Locale }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [srcDims, setSrcDims] = useState({ w: 0, h: 0 });
  const [srcUrl, setSrcUrl] = useState<string>("");
  const [alpha, setAlpha] = useState<AlphaInfo | null>(null);

  const [results, setResults] = useState<Record<string, PresetResult>>({});
  const [selectedId, setSelectedId] = useState<string>("mozjpeg-q80");
  const [mode, setMode] = useState<CompareMode>("side");
  const [sliderPos, setSliderPos] = useState(50);
  const [scale, setScale] = useState(1);

  const poolRef = useRef<CompressPool | null>(null);
  const srcImageDataRef = useRef<ImageData | null>(null);
  const compositedSrcRef = useRef<ImageData | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  // ── Pool lifecycle ─────────────────────────────────────────

  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 4;
    const size = Math.max(1, Math.min(cores - 1, 4));
    poolRef.current = new CompressPool(size);
    return () => {
      poolRef.current?.terminate();
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  // ── Encode dispatch ────────────────────────────────────────

  const runPreset = useCallback(
    async (presetId: string) => {
      const preset = PRESET_BY_ID[presetId];
      const pool = poolRef.current;
      if (!preset || !pool) return;

      const src = preset.preservesAlpha
        ? srcImageDataRef.current
        : compositedSrcRef.current ?? srcImageDataRef.current;
      if (!src) return;

      setResults((prev) => ({
        ...prev,
        [presetId]: { presetId, status: "encoding" },
      }));

      const start = performance.now();
      try {
        const bytes = await pool.encode(preset.options, src);
        const blob = new Blob([bytes], { type: preset.mime });
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.push(url);
        setResults((prev) => ({
          ...prev,
          [presetId]: {
            presetId,
            status: "done",
            size: bytes.length,
            durationMs: performance.now() - start,
            url,
          },
        }));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setResults((prev) => ({
          ...prev,
          [presetId]: { presetId, status: "error", error: message },
        }));
      }
    },
    [],
  );

  // ── File loading ───────────────────────────────────────────

  const loadFile = useCallback(
    async (file: File) => {
      setPhase("loading");
      setError("");
      setFileName(file.name);
      setFileSize(file.size);
      setResults({});

      // Revoke previous URLs
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];

      try {
        const imageData = await decodeFile(file);
        srcImageDataRef.current = imageData;
        const alphaInfo = detectAlpha(imageData);
        setAlpha(alphaInfo);
        compositedSrcRef.current = alphaInfo.hasAlpha
          ? compositeOnWhite(imageData)
          : null;

        const url = URL.createObjectURL(file);
        objectUrlsRef.current.push(url);
        setSrcUrl(url);
        setSrcDims({ w: imageData.width, h: imageData.height });

        const recommended = pickRecommended(alphaInfo);
        setSelectedId(recommended);
        setPhase("ready");

        // Dispatch all presets in parallel — pool queues them
        for (const preset of PRESETS) {
          runPreset(preset.id);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message || t(locale, "imageCompress.errorDecode"));
        setPhase("error");
      }
    },
    [locale, runPreset],
  );

  const handleFile = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        setError(t(locale, "imageCompress.errorFormat"));
        setPhase("error");
        return;
      }
      loadFile(file);
    },
    [loadFile, locale],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files);
    },
    [handleFile],
  );

  // ── Reset ──────────────────────────────────────────────────

  const reset = useCallback(() => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
    srcImageDataRef.current = null;
    compositedSrcRef.current = null;
    setSrcUrl("");
    setResults({});
    setAlpha(null);
    setError("");
    setPhase("idle");
    setFileName("");
    setFileSize(0);
  }, []);

  // ── Download helpers ───────────────────────────────────────

  const downloadCurrent = useCallback(() => {
    const result = results[selectedId];
    const preset = PRESET_BY_ID[selectedId];
    if (!result || result.status !== "done" || !result.url || !preset) return;
    const a = document.createElement("a");
    a.href = result.url;
    const base = fileName.replace(/\.[^.]+$/, "");
    a.download = `${base}.${preset.id}.${preset.ext}`;
    a.click();
  }, [results, selectedId, fileName]);

  // ── Zoom controls ──────────────────────────────────────────

  const setZoom = useCallback((s: number) => {
    transformRef.current?.centerView(s, 200, "easeOut");
  }, []);

  const fitView = useCallback(() => {
    transformRef.current?.resetTransform(200, "easeOut");
  }, []);

  // ── Derived ────────────────────────────────────────────────

  const selectedResult = results[selectedId];
  const selectedPreset = PRESET_BY_ID[selectedId];
  const compressedUrl =
    selectedResult?.status === "done" ? selectedResult.url : "";

  const sortedPresets = useMemo(() => PRESETS, []);

  const alphaBadge = useMemo(() => {
    if (!alpha) return null;
    if (alpha.category === "smooth-alpha")
      return {
        label: t(locale, "imageCompress.alpha.smooth"),
        tone: "text-amber-300",
      };
    if (alpha.category === "binary-mask")
      return {
        label: t(locale, "imageCompress.alpha.binary"),
        tone: "text-amber-300",
      };
    return {
      label: t(locale, "imageCompress.alpha.opaque"),
      tone: "text-muted-foreground",
    };
  }, [alpha, locale]);

  // ── Render ─────────────────────────────────────────────────

  if (phase === "idle" || phase === "loading" || phase === "error") {
    return (
      <div className="space-y-3">
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
                  ? t(locale, "imageCompress.dropzoneActive")
                  : t(locale, "imageCompress.dropzone")}
              </span>
              <span className="text-xs text-muted-foreground/60">
                .png .jpg .webp .avif .gif .bmp
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => handleFile(e.target.files)}
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* File info bar */}
      <div className="flex flex-wrap items-center gap-3 border border-border bg-card px-4 py-2 text-sm">
        <span className="truncate font-medium text-foreground">{fileName}</span>
        <span className="text-muted-foreground">{formatBytes(fileSize)}</span>
        <span className="text-muted-foreground">
          {srcDims.w}&times;{srcDims.h}
        </span>
        {alphaBadge && (
          <span className={cn("text-xs font-medium", alphaBadge.tone)}>
            {alphaBadge.label}
          </span>
        )}
        <button
          onClick={reset}
          className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Reset"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Preset cards grid */}
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {sortedPresets.map((preset) => {
          const result = results[preset.id];
          const isSelected = preset.id === selectedId;
          const dropsAlpha = alpha?.hasAlpha && !preset.preservesAlpha;
          const delta =
            result?.status === "done" && fileSize > 0
              ? (result.size! - fileSize) / fileSize
              : null;

          return (
            <button
              key={preset.id}
              onClick={() => setSelectedId(preset.id)}
              className={cn(
                "group relative flex flex-col gap-1.5 border p-3 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {preset.label}
                </span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </div>

              {result?.status === "encoding" && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{t(locale, "imageCompress.encoding")}</span>
                </div>
              )}

              {result?.status === "done" && (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-mono text-foreground">
                    {formatBytes(result.size!)}
                  </span>
                  {delta !== null && (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        delta < 0 ? "text-green-400" : "text-red-400",
                      )}
                    >
                      {delta < 0 ? "−" : "+"}
                      {(Math.abs(delta) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              )}

              {result?.status === "error" && (
                <span className="text-xs text-red-400">
                  {result.error?.slice(0, 40) || "error"}
                </span>
              )}

              {!result && (
                <span className="text-xs text-muted-foreground/50">
                  {t(locale, "imageCompress.encoding")}
                </span>
              )}

              {dropsAlpha && (
                <span className="flex items-center gap-1 text-[10px] text-amber-300">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {t(locale, "imageCompress.alpha.dropsAlpha")}
                </span>
              )}

              {result?.status === "done" && result.durationMs !== undefined && (
                <span className="text-[10px] text-muted-foreground/60">
                  {(result.durationMs / 1000).toFixed(2)}s
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Compare toolbar */}
      <div className="flex flex-wrap items-center gap-2 border border-border bg-card px-3 py-2 text-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode("side")}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
              mode === "side"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label={t(locale, "imageCompress.modeSide")}
          >
            <Columns2 className="h-3.5 w-3.5" />
            {t(locale, "imageCompress.modeSide")}
          </button>
          <button
            onClick={() => setMode("slider")}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
              mode === "slider"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label={t(locale, "imageCompress.modeSlider")}
          >
            <SplitSquareHorizontal className="h-3.5 w-3.5" />
            {t(locale, "imageCompress.modeSlider")}
          </button>
        </div>

        <div className="mx-1 h-4 w-px bg-border" />

        <div className="flex items-center gap-1">
          <button
            onClick={fitView}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Maximize2 className="h-3 w-3" />
            {t(locale, "imageCompress.zoomFit")}
          </button>
          {[1, 2, 4, 8].map((s) => (
            <button
              key={s}
              onClick={() => setZoom(s)}
              className={cn(
                "rounded px-2 py-1 font-mono text-xs transition-colors",
                Math.abs(scale - s) < 0.05
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s * 100}%
            </button>
          ))}
        </div>

        <span className="ml-2 hidden font-mono text-xs text-muted-foreground/60 md:inline">
          {(scale * 100).toFixed(0)}%
        </span>

        <div className="ml-auto flex items-center gap-2">
          {selectedResult?.status === "done" && (
            <span className="font-mono text-xs text-muted-foreground">
              {formatBytes(selectedResult.size!)}
            </span>
          )}
          <button
            onClick={downloadCurrent}
            disabled={selectedResult?.status !== "done"}
            className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t(locale, "imageCompress.download")}
          </button>
        </div>
      </div>

      {/* Comparison viewer */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden border border-border bg-[repeating-conic-gradient(var(--color-border)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
        {srcUrl && (
          <TransformWrapper
            ref={transformRef}
            limitToBounds={false}
            minScale={0.05}
            maxScale={32}
            initialScale={1}
            centerOnInit
            wheel={{ step: 0.15 }}
            doubleClick={{ disabled: true }}
            onTransformed={(_, state) => setScale(state.scale)}
          >
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ display: "block" }}
            >
              {mode === "side" ? (
                <div className="flex items-start gap-px">
                  <div className="relative">
                    <img
                      src={srcUrl}
                      alt="Original"
                      style={{
                        imageRendering: scale > 2 ? "pixelated" : "auto",
                        display: "block",
                      }}
                    />
                    <span className="pointer-events-none absolute left-1 top-1 bg-black/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
                      {t(locale, "imageCompress.original")}
                    </span>
                  </div>
                  <div className="relative">
                    {compressedUrl ? (
                      <img
                        src={compressedUrl}
                        alt="Compressed"
                        style={{
                          imageRendering: scale > 2 ? "pixelated" : "auto",
                          display: "block",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        style={{ width: srcDims.w, height: srcDims.h }}
                        className="flex items-center justify-center bg-card"
                      >
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <span className="pointer-events-none absolute left-1 top-1 bg-primary/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                      {selectedPreset?.label}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="relative"
                  style={{ width: srcDims.w, height: srcDims.h }}
                >
                  <img
                    src={srcUrl}
                    alt="Original"
                    style={{
                      imageRendering: scale > 2 ? "pixelated" : "auto",
                      display: "block",
                    }}
                  />
                  {compressedUrl && (
                    <img
                      src={compressedUrl}
                      alt="Compressed"
                      className="absolute inset-0"
                      style={{
                        clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                        imageRendering: scale > 2 ? "pixelated" : "auto",
                        display: "block",
                      }}
                    />
                  )}
                </div>
              )}
            </TransformComponent>
          </TransformWrapper>
        )}

        {mode === "slider" && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-center gap-2 rounded bg-black/50 px-2 py-1.5 backdrop-blur">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/80">
              {t(locale, "imageCompress.original")}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="pointer-events-auto flex-1 accent-primary"
              aria-label="Slider position"
            />
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/80">
              {selectedPreset?.label || t(locale, "imageCompress.compressed")}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={reset}
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {t(locale, "imageCompress.loadAnother")}
      </button>
    </div>
  );
}
