import { useReducer, useRef, useCallback, useEffect, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import type { Locale } from "../../lib/i18n";
import { t } from "../../lib/i18n";
import {
  initialState,
  imvectorReducer,
} from "../../lib/imvector/types";
import type {
  ProcessSettings,
  ImVectorAction,
  ImageEntry,
} from "../../lib/imvector/types";
import { runPipeline } from "../../lib/imvector/pipeline";
import { isUpscaleAvailable } from "../../lib/imvector/ai";

// ── Helpers ──────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const PRESET_LABELS: Record<string, string> = {
  draft: "Draft",
  standard: "Standard",
  high: "High",
  ultra: "Ultra",
};

const MODEL_PROMPT_KEY = "imvector-model-prompt-dismissed";

function isModelPromptDismissed(): boolean {
  try {
    return localStorage.getItem(MODEL_PROMPT_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissModelPrompt() {
  try {
    localStorage.setItem(MODEL_PROMPT_KEY, "1");
  } catch {
    // ignore
  }
}

let nextId = 0;

// ── Component ────────────────────────────────────────────────

export default function ImVector({ locale }: { locale: Locale }) {
  const [state, dispatch] = useReducer(imvectorReducer, initialState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const processingRef = useRef(false);
  const [showModelPrompt, setShowModelPrompt] = useState(false);
  const pendingFilesRef = useRef<File[]>([]);

  // Process a queue of images sequentially
  const processQueue = useCallback(
    async (files: File[]) => {
      if (processingRef.current) return;
      processingRef.current = true;

      for (const file of files) {
        const entry = state.images.find(
          (img) => img.file === file && img.status === "pending",
        );
        const id = entry?.id;
        if (!id) continue;

        dispatch({ type: "IMAGE_PROCESSING", id });

        const dispatchForImage = (action: ImVectorAction) => {
          // Route pipeline compat actions to specific image
          if (action.type === "PROGRESS") {
            dispatch({ type: "IMAGE_PROGRESS", id, percent: action.percent, label: action.label });
          } else if (action.type === "PROCESS_COMPLETE") {
            dispatch({
              type: "IMAGE_COMPLETE",
              id,
              presets: action.presets,
              classification: action.classification,
              timings: action.timings,
              quantizedColors: action.quantizedColors,
            });
          } else if (action.type === "ERROR") {
            dispatch({ type: "IMAGE_ERROR", id, error: action.error });
          } else {
            dispatch(action);
          }
        };

        try {
          await runPipeline(file, state.settings, dispatchForImage);
        } catch {
          dispatch({ type: "IMAGE_ERROR", id, error: "Processing failed" });
        }
      }

      processingRef.current = false;
    },
    [state.images, state.settings],
  );

  const addAndProcess = useCallback(
    (files: File[]) => {
      const validFiles = files.filter((f) => f.type.startsWith("image/"));
      if (validFiles.length === 0) return;

      // Check if AI upscale is on and model prompt hasn't been dismissed
      if (state.settings.aiUpscale && isUpscaleAvailable() && !isModelPromptDismissed()) {
        pendingFilesRef.current = validFiles;
        setShowModelPrompt(true);
        return;
      }

      doAddAndProcess(validFiles);
    },
    [state.settings],
  );

  const doAddAndProcess = useCallback(
    (files: File[]) => {
      const entries = files.map((file) => ({
        id: `img-${++nextId}`,
        file,
        originalUrl: URL.createObjectURL(file),
      }));

      dispatch({ type: "ADD_IMAGES", entries });

      // Process after state update via microtask
      queueMicrotask(() => {
        const pending = files;
        // We need to process with latest state, but entries are already added
        // Use a ref-based approach
        processingRef.current = false;
        processQueueDirect(entries, state.settings, dispatch);
      });
    },
    [state.settings],
  );

  const handleModelPromptAccept = useCallback(
    (dontShowAgain: boolean) => {
      if (dontShowAgain) dismissModelPrompt();
      setShowModelPrompt(false);
      const files = pendingFilesRef.current;
      pendingFilesRef.current = [];
      doAddAndProcess(files);
    },
    [doAddAndProcess],
  );

  const handleModelPromptCancel = useCallback(() => {
    setShowModelPrompt(false);
    // Process without AI
    const files = pendingFilesRef.current;
    pendingFilesRef.current = [];
    const entries = files.map((file) => ({
      id: `img-${++nextId}`,
      file,
      originalUrl: URL.createObjectURL(file),
    }));
    dispatch({ type: "ADD_IMAGES", entries });
    const noAiSettings = { ...state.settings, aiUpscale: false };
    queueMicrotask(() => {
      processQueueDirect(entries, noAiSettings, dispatch);
    });
  }, [state.settings]);

  // Reprocess current image with current settings
  const handleReprocess = useCallback(() => {
    const activeImg = state.images.find((img) => img.id === state.activeImageId);
    if (!activeImg || processingRef.current) return;

    dispatch({ type: "IMAGE_PROCESSING", id: activeImg.id });

    const id = activeImg.id;
    const dispatchForImage = (action: ImVectorAction) => {
      if (action.type === "PROGRESS") {
        dispatch({ type: "IMAGE_PROGRESS", id, percent: action.percent, label: action.label });
      } else if (action.type === "PROCESS_COMPLETE") {
        dispatch({
          type: "IMAGE_COMPLETE", id,
          presets: action.presets,
          classification: action.classification,
          timings: action.timings,
          quantizedColors: action.quantizedColors,
        });
      } else if (action.type === "ERROR") {
        dispatch({ type: "IMAGE_ERROR", id, error: action.error });
      }
    };

    processingRef.current = true;
    runPipeline(activeImg.file, state.settings, dispatchForImage)
      .catch(() => dispatch({ type: "IMAGE_ERROR", id, error: "Reprocessing failed" }))
      .finally(() => { processingRef.current = false; });
  }, [state.images, state.activeImageId, state.settings]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      for (const img of state.images) {
        for (const p of img.presets) URL.revokeObjectURL(p.blobUrl);
        URL.revokeObjectURL(img.originalUrl);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length) addAndProcess(files);
    },
    [addAndProcess],
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length) addAndProcess(files);
      e.target.value = "";
    },
    [addAndProcess],
  );

  const handleDownload = useCallback(() => {
    const activeImg = state.images.find((img) => img.id === state.activeImageId);
    if (!activeImg) return;
    const preset = activeImg.presets[activeImg.activePreset];
    if (!preset) return;
    const a = document.createElement("a");
    a.href = preset.blobUrl;
    const baseName = activeImg.file.name.replace(/\.[^.]+$/, "");
    a.download = `${baseName}-${preset.name}.svg`;
    a.click();
  }, [state.images, state.activeImageId]);

  const updateSetting = useCallback(
    (update: Partial<ProcessSettings>) => {
      dispatch({ type: "UPDATE_SETTINGS", settings: update });
    },
    [],
  );

  const activeImg = state.images.find((img) => img.id === state.activeImageId);
  const activePreset = activeImg?.presets[activeImg.activePreset];
  const viewerSrc = state.showOriginal ? activeImg?.originalUrl : activePreset?.blobUrl;
  const hasImages = state.images.length > 0;
  const isProcessing = state.images.some((img) => img.status === "processing");

  // ── Model download prompt ──────────────────────────────────

  if (showModelPrompt) {
    return <ModelPrompt locale={locale} onAccept={handleModelPromptAccept} onCancel={handleModelPromptCancel} />;
  }

  // ── Unified layout ─────────────────────────────────────────

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar — always visible */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Image tabs */}
        {hasImages && (
          <div className="flex gap-1 overflow-x-auto">
            {state.images.map((img) => (
              <button
                key={img.id}
                onClick={() => dispatch({ type: "SET_ACTIVE_IMAGE", id: img.id })}
                className={`flex items-center gap-1.5 border px-2 py-1 text-xs transition-colors ${
                  img.id === state.activeImageId
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <span className="max-w-[80px] truncate">{img.file.name}</span>
                {img.status === "processing" && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                )}
                {img.status === "error" && (
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); dispatch({ type: "REMOVE_IMAGE", id: img.id }); }}
                  className="ml-0.5 text-muted-foreground/50 hover:text-foreground"
                >
                  &times;
                </button>
              </button>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/30"
            >
              +
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFileSelect} className="hidden" />

        <div className="flex-1" />

        {/* Settings toggle */}
        <button
          onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
          className={`border px-3 py-1 text-xs transition-colors ${
            state.settingsOpen
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/30"
          }`}
        >
          {t(locale, "imvector.settings")}
        </button>

        {hasImages && (
          <button
            onClick={() => dispatch({ type: "CLEAR_ALL" })}
            className="border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/30"
          >
            {t(locale, "imvector.clearAll")}
          </button>
        )}
      </div>

      {/* Settings collapsible — always available */}
      {state.settingsOpen && (
        <div className="border border-border p-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <label className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t(locale, "imvector.colors")}</span>
              <input
                type="number" min={0} max={256}
                value={state.settings.quantizeColors}
                onChange={(e) => updateSetting({ quantizeColors: parseInt(e.target.value) || 0 })}
                className="w-14 border border-border bg-background px-1.5 py-0.5 text-xs text-foreground"
                placeholder="Auto"
              />
            </label>
            <Toggle label={t(locale, "imvector.denoise")} checked={state.settings.denoise} onChange={(v) => updateSetting({ denoise: v })} />
            <Toggle label={t(locale, "imvector.detectShapes")} checked={state.settings.detectShapes} onChange={(v) => updateSetting({ detectShapes: v })} />
            <Toggle label={t(locale, "imvector.aiUpscale")} checked={state.settings.aiUpscale} onChange={(v) => updateSetting({ aiUpscale: v })} disabled={!isUpscaleAvailable()} />
            <label className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{t(locale, "imvector.optimize")}</span>
              <select
                value={state.settings.optimizeLevel}
                onChange={(e) => updateSetting({ optimizeLevel: parseInt(e.target.value) as 0 | 1 | 2 })}
                className="border border-border bg-background px-1.5 py-0.5 text-xs text-foreground"
              >
                <option value={0}>{t(locale, "imvector.optNone")}</option>
                <option value={1}>{t(locale, "imvector.optBasic")}</option>
                <option value={2}>{t(locale, "imvector.optFull")}</option>
              </select>
            </label>
          </div>
          {hasImages && (
            <button
              onClick={handleReprocess}
              disabled={!activeImg || isProcessing}
              className="mt-3 w-full border border-primary bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
            >
              {t(locale, "imvector.reprocess")}
            </button>
          )}
        </div>
      )}

      {/* No images: show drop zone */}
      {!hasImages && (
        <div className="flex flex-1 items-center justify-center">
          <DropZone locale={locale} onDrop={onDrop} onFileSelect={onFileSelect} fileInputRef={fileInputRef} />
        </div>
      )}

      {/* Active image content */}
      {activeImg && activeImg.status === "processing" && (
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>{activeImg.progressLabel}</span>
              <span>{Math.round(activeImg.progress)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden bg-border">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${activeImg.progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {activeImg && activeImg.status === "error" && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-red-500">{activeImg.error}</p>
        </div>
      )}

      {activeImg && activeImg.status === "ready" && (
        <>
          {/* Preset tabs + info */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden border border-border text-xs">
              {activeImg.presets.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => dispatch({ type: "SET_ACTIVE_PRESET", index: i })}
                  className={`px-3 py-1.5 transition-colors ${
                    i === activeImg.activePreset
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-card/80"
                  }`}
                >
                  {PRESET_LABELS[p.name] || p.name}
                </button>
              ))}
            </div>
            {activePreset && (
              <span className="text-xs text-muted-foreground">
                {formatBytes(activePreset.size)} · {activePreset.pathCount} paths · {formatMs(activePreset.traceMsec)}
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={() => dispatch({ type: "TOGGLE_ORIGINAL" })}
              className={`border px-3 py-1 text-xs transition-colors ${
                state.showOriginal
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {t(locale, "imvector.showSrc")}
            </button>
            <button onClick={handleDownload} className="border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground">
              {t(locale, "imvector.download")}
            </button>
          </div>

          {/* Viewer */}
          <div className="relative flex-1 min-h-0 overflow-hidden border border-border bg-[repeating-conic-gradient(var(--color-border)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
            {viewerSrc && (
              <TransformWrapper limitToBounds={false} minScale={0.1} maxScale={20} centerOnInit>
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <img src={viewerSrc} alt="Result" className="max-h-full max-w-full object-contain" />
                </TransformComponent>
              </TransformWrapper>
            )}
          </div>

          {/* Metadata */}
          {activeImg.classification && activeImg.timings && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{t(locale, "imvector.type")}: {activeImg.classification.imageType}</span>
              <span>{activeImg.classification.width}x{activeImg.classification.height}</span>
              <span>{t(locale, "imvector.colors")}: {activeImg.quantizedColors > 0 ? activeImg.quantizedColors : activeImg.classification.colorCount}</span>
              <span>{t(locale, "imvector.totalTime")}: {formatMs(activeImg.timings.totalMs)}</span>
              {activeImg.timings.aiMs > 100 && <span>AI: {formatMs(activeImg.timings.aiMs)}</span>}
              <span>WASM: {formatMs(activeImg.timings.traceMs)}</span>
            </div>
          )}
        </>
      )}

      {activeImg && activeImg.status === "pending" && (
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          {t(locale, "imvector.queued")}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function DropZone({
  locale,
  onDrop,
  onFileSelect,
  fileInputRef,
}: {
  locale: Locale;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      className="flex w-full max-w-md cursor-pointer flex-col items-center gap-3 border-2 border-dashed border-border p-12 transition-colors hover:border-primary/40 hover:bg-card/50"
    >
      <svg className="h-10 w-10 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </svg>
      <p className="text-sm text-muted-foreground">{t(locale, "imvector.dropzone")}</p>
      <p className="text-xs text-muted-foreground/60">PNG, JPEG, WebP, GIF</p>
    </div>
  );
}

function ModelPrompt({
  locale,
  onAccept,
  onCancel,
}: {
  locale: Locale;
  onAccept: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}) {
  const [dontShow, setDontShow] = useState(false);
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm space-y-4 border border-border bg-card p-6">
        <div className="flex gap-3">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">{t(locale, "imvector.modelPromptTitle")}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t(locale, "imvector.modelPromptDesc")}</p>
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} className="accent-primary" />
          <span className="text-xs text-muted-foreground">{t(locale, "imvector.modelDontShow")}</span>
        </label>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-card/80">
            {t(locale, "imvector.modelSkip")}
          </button>
          <button onClick={() => onAccept(dontShow)} className="flex-1 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            {t(locale, "imvector.modelAccept")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-2 ${disabled ? "opacity-40" : "cursor-pointer"}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button" role="switch" aria-checked={checked} disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${disabled ? "bg-border cursor-not-allowed" : checked ? "bg-primary" : "bg-border"}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked && !disabled ? "translate-x-4" : ""}`} />
      </button>
    </label>
  );
}

// ── Process queue (static, outside component) ────────────────

async function processQueueDirect(
  entries: Array<{ id: string; file: File; originalUrl: string }>,
  settings: ProcessSettings,
  dispatch: (action: ImVectorAction) => void,
) {
  for (const entry of entries) {
    dispatch({ type: "IMAGE_PROCESSING", id: entry.id });

    const id = entry.id;
    const dispatchForImage = (action: ImVectorAction) => {
      if (action.type === "PROGRESS") {
        dispatch({ type: "IMAGE_PROGRESS", id, percent: action.percent, label: action.label });
      } else if (action.type === "PROCESS_COMPLETE") {
        dispatch({
          type: "IMAGE_COMPLETE", id,
          presets: action.presets,
          classification: action.classification,
          timings: action.timings,
          quantizedColors: action.quantizedColors,
        });
      } else if (action.type === "ERROR") {
        dispatch({ type: "IMAGE_ERROR", id, error: action.error });
      }
    };

    try {
      await runPipeline(entry.file, settings, dispatchForImage);
    } catch {
      dispatch({ type: "IMAGE_ERROR", id: entry.id, error: "Processing failed" });
    }
  }
}
