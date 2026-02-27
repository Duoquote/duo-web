import {
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  Upload,
  X,
  ChevronDown,
  Download,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Link,
  Unlink,
  Check,
  Plus,
} from "lucide-react";
import type { Locale } from "../../lib/i18n";
import { t } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import {
  OUTPUT_FORMATS,
  getFormatById,
  getCodecById,
  getDefaultVideoSettings,
  getDefaultAudioSettings,
  type OutputFormat,
  type VideoAdvancedSettings,
  type AudioAdvancedSettings,
} from "../../lib/converter/formats";
import type { QualityPreset } from "../../lib/converter/presets";
import { getPresetValues } from "../../lib/converter/presets";
import { parseHash, setHash } from "../../lib/converter/hash";
import {
  buildFFmpegArgs,
  getOutputFileName,
} from "../../lib/converter/command-builder";
import {
  getFFmpeg,
  convert,
  cancel,
  terminate,
} from "../../lib/converter/ffmpeg";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getVideoDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video dimensions"));
    };
    video.src = url;
  });
}

function computeTargetDims(
  sourceWidth: number | null,
  sourceHeight: number | null,
  scale: string,
): { targetWidth: string; targetHeight: string } {
  if (
    !sourceWidth ||
    !sourceHeight ||
    scale === "pixel" ||
    scale === "custom"
  ) {
    return { targetWidth: "", targetHeight: "" };
  }
  const factor = parseFloat(scale);
  if (isNaN(factor)) return { targetWidth: "", targetHeight: "" };
  const w = Math.round((sourceWidth * factor) / 2) * 2;
  const h = Math.round((sourceHeight * factor) / 2) * 2;
  return { targetWidth: String(w), targetHeight: String(h) };
}

function triggerDownload(data: Uint8Array, fileName: string): void {
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let fileIdCounter = 0;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type FileStatus = "pending" | "converting" | "completed" | "error";

interface FileEntry {
  id: string;
  file: File;
  sizeWarning: boolean;
  sourceWidth: number | null;
  sourceHeight: number | null;
  status: FileStatus;
  progress: number;
  error: string | null;
  outputData: Uint8Array | null;
  outputSize: number;
  outputFileName: string;
}

function createFileEntry(file: File): FileEntry {
  return {
    id: String(++fileIdCounter),
    file,
    sizeWarning: file.size > 50 * 1024 * 1024,
    sourceWidth: null,
    sourceHeight: null,
    status: "pending",
    progress: 0,
    error: null,
    outputData: null,
    outputSize: 0,
    outputFileName: "",
  };
}

interface ConverterState {
  files: FileEntry[];
  lockAspectRatio: boolean;
  inputFormat: string;
  outputFormatId: string;
  codecId: string;
  preset: QualityPreset | "custom";
  videoSettings: VideoAdvancedSettings;
  audioSettings: AudioAdvancedSettings;
  advancedOpen: boolean;
  ffmpegLoading: boolean;
  converting: boolean;
  currentFileIndex: number;
  error: string | null;
}

type ConverterAction =
  | { type: "ADD_FILES"; files: File[] }
  | { type: "REMOVE_FILE"; id: string }
  | { type: "CLEAR_FILES" }
  | {
      type: "SET_FILE_DIMENSIONS";
      id: string;
      width: number;
      height: number;
    }
  | { type: "SET_OUTPUT_FORMAT"; formatId: string }
  | { type: "SET_CODEC"; codecId: string }
  | { type: "SET_PRESET"; preset: QualityPreset }
  | {
      type: "SET_VIDEO_SETTING";
      key: keyof VideoAdvancedSettings;
      value: string | number;
    }
  | {
      type: "SET_AUDIO_SETTING";
      key: keyof AudioAdvancedSettings;
      value: string;
    }
  | { type: "TOGGLE_ADVANCED" }
  | { type: "FFMPEG_LOADING" }
  | { type: "CONVERT_FILE_START"; index: number }
  | { type: "CONVERT_FILE_PROGRESS"; index: number; progress: number }
  | {
      type: "CONVERT_FILE_COMPLETE";
      index: number;
      data: Uint8Array;
      size: number;
      fileName: string;
    }
  | { type: "CONVERT_FILE_ERROR"; index: number; error: string }
  | { type: "CONVERT_ERROR"; error: string }
  | { type: "CONVERT_CANCEL" }
  | { type: "TOGGLE_ASPECT_LOCK" }
  | {
      type: "SET_TARGET_DIMENSION";
      key: "targetWidth" | "targetHeight";
      value: string;
    }
  | { type: "RESET_ALL" }
  | {
      type: "SYNC_HASH";
      inputFormat: string;
      outputFormatId: string;
    };

function getInitialState(): ConverterState {
  return {
    files: [],
    lockAspectRatio: true,
    inputFormat: "x",
    outputFormatId: "mp4",
    codecId: "h264",
    preset: "small",
    videoSettings: getDefaultVideoSettings(),
    audioSettings: getDefaultAudioSettings(),
    advancedOpen: false,
    ffmpegLoading: false,
    converting: false,
    currentFileIndex: 0,
    error: null,
  };
}

function updateFileAt(
  files: FileEntry[],
  index: number,
  patch: Partial<FileEntry>,
): FileEntry[] {
  return files.map((f, i) => (i === index ? { ...f, ...patch } : f));
}

function converterReducer(
  state: ConverterState,
  action: ConverterAction,
): ConverterState {
  switch (action.type) {
    case "ADD_FILES": {
      const newEntries = action.files.map(createFileEntry);
      return {
        ...state,
        files: [...state.files, ...newEntries],
        error: null,
      };
    }

    case "REMOVE_FILE":
      return {
        ...state,
        files: state.files.filter((f) => f.id !== action.id),
      };

    case "CLEAR_FILES":
      return {
        ...state,
        files: [],
        error: null,
      };

    case "SET_FILE_DIMENSIONS": {
      const files = state.files.map((f) =>
        f.id === action.id
          ? { ...f, sourceWidth: action.width, sourceHeight: action.height }
          : f,
      );
      // Update target dims from first file with dimensions
      const firstDims = files.find((f) => f.sourceWidth !== null);
      if (firstDims && firstDims.sourceWidth && firstDims.sourceHeight) {
        const dims = computeTargetDims(
          firstDims.sourceWidth,
          firstDims.sourceHeight,
          state.videoSettings.scale,
        );
        return {
          ...state,
          files,
          videoSettings: {
            ...state.videoSettings,
            targetWidth: dims.targetWidth,
            targetHeight: dims.targetHeight,
          },
        };
      }
      return { ...state, files };
    }

    case "SET_OUTPUT_FORMAT": {
      const format = getFormatById(action.formatId);
      if (!format) return state;

      const defaultCodec =
        format.codecs.find((c) => c.id === format.defaultCodecId) ??
        format.codecs[0];

      const presetValues =
        state.preset !== "custom"
          ? getPresetValues(defaultCodec.ffmpegCodec, state.preset)
          : null;

      const newVideoSettings = presetValues
        ? {
            ...getDefaultVideoSettings(),
            crf: presetValues.crf,
            videoBitrate: presetValues.videoBitrate,
            audioBitrate: presetValues.audioBitrate,
          }
        : getDefaultVideoSettings();

      const firstDims = state.files.find((f) => f.sourceWidth !== null);
      const dims = computeTargetDims(
        firstDims?.sourceWidth ?? null,
        firstDims?.sourceHeight ?? null,
        newVideoSettings.scale,
      );
      newVideoSettings.targetWidth = dims.targetWidth;
      newVideoSettings.targetHeight = dims.targetHeight;

      return {
        ...state,
        outputFormatId: format.id,
        codecId: format.defaultCodecId,
        videoSettings: newVideoSettings,
        audioSettings: presetValues
          ? {
              ...getDefaultAudioSettings(),
              audioBitrate: presetValues.audioBitrate,
            }
          : getDefaultAudioSettings(),
        error: null,
      };
    }

    case "SET_CODEC": {
      const format = getFormatById(state.outputFormatId);
      if (!format) return state;
      const codec = getCodecById(format, action.codecId);
      if (!codec) return state;

      if (state.preset !== "custom" && format.type !== "audio") {
        const pv = getPresetValues(codec.ffmpegCodec, state.preset);
        return {
          ...state,
          codecId: action.codecId,
          videoSettings: {
            ...state.videoSettings,
            crf: pv.crf,
            videoBitrate: pv.videoBitrate,
            audioBitrate: pv.audioBitrate,
          },
        };
      }

      return { ...state, codecId: action.codecId };
    }

    case "SET_PRESET": {
      const format = getFormatById(state.outputFormatId);
      if (!format) return state;
      const codec = getCodecById(format, state.codecId);
      if (!codec) return state;

      const pv = getPresetValues(codec.ffmpegCodec, action.preset);

      if (format.type === "audio") {
        const isPixelAudio = action.preset === "pixel";
        return {
          ...state,
          preset: action.preset,
          audioSettings: {
            ...state.audioSettings,
            audioBitrate: pv.audioBitrate,
            sampleRate: isPixelAudio ? "8000" : "original",
            channels: isPixelAudio ? "1" : "original",
          },
        };
      }

      const isPixel = action.preset === "pixel";
      const newScale = isPixel ? "pixel" : "1";
      const firstDims = state.files.find((f) => f.sourceWidth !== null);
      const presetDims = computeTargetDims(
        firstDims?.sourceWidth ?? null,
        firstDims?.sourceHeight ?? null,
        newScale,
      );
      return {
        ...state,
        preset: action.preset,
        videoSettings: {
          ...state.videoSettings,
          crf: pv.crf,
          videoBitrate: pv.videoBitrate,
          audioBitrate: pv.audioBitrate,
          scale: newScale,
          targetWidth: presetDims.targetWidth,
          targetHeight: presetDims.targetHeight,
          audioSampleRate: isPixel ? "8000" : "original",
          audioChannels: isPixel ? "1" : "original",
        },
      };
    }

    case "SET_VIDEO_SETTING": {
      const updatedVideoSettings = {
        ...state.videoSettings,
        [action.key]: action.value,
      };
      if (action.key === "scale") {
        const firstDims = state.files.find((f) => f.sourceWidth !== null);
        const scaleDims = computeTargetDims(
          firstDims?.sourceWidth ?? null,
          firstDims?.sourceHeight ?? null,
          String(action.value),
        );
        updatedVideoSettings.targetWidth = scaleDims.targetWidth;
        updatedVideoSettings.targetHeight = scaleDims.targetHeight;
      }
      return {
        ...state,
        preset: "custom",
        videoSettings: updatedVideoSettings,
      };
    }

    case "SET_AUDIO_SETTING":
      return {
        ...state,
        preset: "custom",
        audioSettings: {
          ...state.audioSettings,
          [action.key]: action.value,
        },
      };

    case "TOGGLE_ADVANCED":
      return { ...state, advancedOpen: !state.advancedOpen };

    case "FFMPEG_LOADING":
      return { ...state, ffmpegLoading: true, error: null };

    case "CONVERT_FILE_START":
      return {
        ...state,
        ffmpegLoading: false,
        converting: true,
        currentFileIndex: action.index,
        files: updateFileAt(state.files, action.index, {
          status: "converting",
          progress: 0,
          error: null,
        }),
      };

    case "CONVERT_FILE_PROGRESS":
      return {
        ...state,
        files: updateFileAt(state.files, action.index, {
          progress: action.progress,
        }),
      };

    case "CONVERT_FILE_COMPLETE":
      return {
        ...state,
        files: updateFileAt(state.files, action.index, {
          status: "completed",
          progress: 100,
          outputData: action.data,
          outputSize: action.size,
          outputFileName: action.fileName,
        }),
      };

    case "CONVERT_FILE_ERROR":
      return {
        ...state,
        files: updateFileAt(state.files, action.index, {
          status: "error",
          error: action.error,
        }),
      };

    case "CONVERT_ERROR":
      return {
        ...state,
        ffmpegLoading: false,
        converting: false,
        error: action.error,
      };

    case "CONVERT_CANCEL":
      return {
        ...state,
        ffmpegLoading: false,
        converting: false,
        files: state.files.map((f) =>
          f.status === "converting"
            ? { ...f, status: "pending" as FileStatus, progress: 0 }
            : f,
        ),
      };

    case "RESET_ALL":
      return {
        ...state,
        files: [],
        error: null,
        converting: false,
        ffmpegLoading: false,
        currentFileIndex: 0,
        videoSettings: {
          ...state.videoSettings,
          targetWidth: "",
          targetHeight: "",
        },
      };

    case "TOGGLE_ASPECT_LOCK":
      return { ...state, lockAspectRatio: !state.lockAspectRatio };

    case "SET_TARGET_DIMENSION": {
      const firstDims = state.files.find((f) => f.sourceWidth !== null);
      const dimUpdate: Partial<VideoAdvancedSettings> = {
        [action.key]: action.value,
        scale: "custom",
      };

      if (
        state.lockAspectRatio &&
        firstDims?.sourceWidth &&
        firstDims?.sourceHeight &&
        action.value !== ""
      ) {
        const v = parseInt(action.value);
        if (!isNaN(v) && v > 0) {
          const ratio = firstDims.sourceWidth / firstDims.sourceHeight;
          if (action.key === "targetWidth") {
            dimUpdate.targetHeight = String(
              Math.round(v / ratio / 2) * 2,
            );
          } else {
            dimUpdate.targetWidth = String(
              Math.round(v * ratio / 2) * 2,
            );
          }
        }
      }

      return {
        ...state,
        videoSettings: {
          ...state.videoSettings,
          ...dimUpdate,
        },
      };
    }

    case "SYNC_HASH": {
      const format = getFormatById(action.outputFormatId);
      if (!format)
        return { ...state, inputFormat: action.inputFormat };
      return {
        ...state,
        inputFormat: action.inputFormat,
        outputFormatId: format.id,
        codecId: format.defaultCodecId,
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// DropZone
// ---------------------------------------------------------------------------

function DropZone({
  onFiles,
  locale,
  compact,
}: {
  onFiles: (files: File[]) => void;
  locale: Locale;
  compact?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    },
    [onFiles],
  );

  if (compact) {
    return (
      <button
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) onFiles(files);
            e.target.value = "";
          }}
        />
        <Plus className="h-3.5 w-3.5" />
        {t(locale, "converter.addMore")}
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed py-16 transition-all duration-200",
        isDragOver
          ? "border-primary/60 bg-primary/[0.03]"
          : "border-border/60 hover:border-border",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
      />
      <Upload
        className={cn(
          "h-10 w-10 transition-all duration-200",
          isDragOver
            ? "scale-110 text-primary"
            : "text-muted-foreground/40 group-hover:text-muted-foreground/60",
        )}
        strokeWidth={1.5}
      />
      <p
        className={cn(
          "text-sm transition-colors duration-200",
          isDragOver
            ? "font-medium text-primary"
            : "text-muted-foreground",
        )}
      >
        {isDragOver
          ? t(locale, "converter.dropzoneActive")
          : t(locale, "converter.dropzone")}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileList
// ---------------------------------------------------------------------------

function FileListItem({
  entry,
  onRemove,
  onDownload,
  disabled,
  locale,
}: {
  entry: FileEntry;
  onRemove: () => void;
  onDownload: () => void;
  disabled: boolean;
  locale: Locale;
}) {
  const ext = entry.file.name.split(".").pop()?.toUpperCase() || "?";

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary/10 font-mono text-[10px] font-bold text-primary">
        {ext}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {entry.file.name}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{formatFileSize(entry.file.size)}</span>
          {entry.status === "completed" && (
            <>
              <span className="text-border">→</span>
              <span className="font-mono text-foreground">
                {formatFileSize(entry.outputSize)}
              </span>
            </>
          )}
          {entry.sizeWarning && (
            <>
              <span className="text-border">·</span>
              <span className="text-destructive">
                <AlertTriangle className="inline h-3 w-3" />
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex shrink-0 items-center gap-1.5">
        {entry.status === "converting" && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-primary">
              {entry.progress}%
            </span>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
        {entry.status === "completed" && (
          <button
            onClick={onDownload}
            className="p-1 text-emerald-500 transition-colors hover:text-emerald-400"
            title={t(locale, "converter.download")}
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        {entry.status === "error" && (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        )}
        {entry.status === "pending" && (
          <div className="h-4 w-4" /> // spacer
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        disabled={disabled}
        className="shrink-0 p-1 text-muted-foreground/40 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        aria-label={t(locale, "converter.removeFile")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FileList({
  files,
  onRemove,
  onDownload,
  onClear,
  disabled,
  locale,
}: {
  files: FileEntry[];
  onRemove: (id: string) => void;
  onDownload: (entry: FileEntry) => void;
  onClear: () => void;
  disabled: boolean;
  locale: Locale;
}) {
  const hasSizeWarning = files.some((f) => f.sizeWarning);

  return (
    <div className="border border-border bg-card">
      <div className="divide-y divide-border/50">
        {files.map((entry) => (
          <FileListItem
            key={entry.id}
            entry={entry}
            onRemove={() => onRemove(entry.id)}
            onDownload={() => onDownload(entry)}
            disabled={disabled}
            locale={locale}
          />
        ))}
      </div>
      {hasSizeWarning && (
        <div className="flex items-center gap-2 border-t border-border bg-destructive/5 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">
            {t(locale, "converter.fileSizeWarning")}
          </p>
        </div>
      )}
      {files.length > 1 && !disabled && (
        <div className="border-t border-border/50 px-3 py-1.5">
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            {t(locale, "converter.clearAll")}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormatSelector
// ---------------------------------------------------------------------------

const selectClass =
  "w-full border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary/40 focus:outline-none disabled:opacity-50";

function FormatSelector({
  outputFormatId,
  codecId,
  scale,
  onFormatChange,
  onCodecChange,
  onScaleChange,
  scaleDisabled,
  locale,
}: {
  outputFormatId: string;
  codecId: string;
  scale: string;
  onFormatChange: (id: string) => void;
  onCodecChange: (id: string) => void;
  onScaleChange: (value: string) => void;
  scaleDisabled?: boolean;
  locale: Locale;
}) {
  const format = getFormatById(outputFormatId);
  const isVideo = format && (format.type === "video" || format.type === "image");

  return (
    <div className={cn("grid gap-3", isVideo ? "grid-cols-3" : "grid-cols-2")}>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t(locale, "converter.outputFormat")}
        </label>
        <select
          value={outputFormatId}
          onChange={(e) => onFormatChange(e.target.value)}
          className={selectClass}
        >
          <optgroup label="Video">
            {OUTPUT_FORMATS.filter((f) => f.type === "video").map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Audio">
            {OUTPUT_FORMATS.filter((f) => f.type === "audio").map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Image">
            {OUTPUT_FORMATS.filter((f) => f.type === "image").map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t(locale, "converter.codec")}
        </label>
        <select
          value={codecId}
          onChange={(e) => onCodecChange(e.target.value)}
          className={selectClass}
          disabled={!format || format.codecs.length <= 1}
        >
          {format?.codecs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      {isVideo && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t(locale, "converter.scale")}
          </label>
          <select
            value={scale}
            onChange={(e) => onScaleChange(e.target.value)}
            className={selectClass}
            disabled={scaleDisabled}
          >
            <option value="1">1x</option>
            <option value="0.75">0.75x</option>
            <option value="0.5">0.5x</option>
            <option value="0.33">0.33x</option>
            {scale === "custom" && (
              <option value="custom">Custom</option>
            )}
          </select>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QualityPresets
// ---------------------------------------------------------------------------

function QualityPresets({
  preset,
  onPresetChange,
  locale,
}: {
  preset: QualityPreset | "custom";
  onPresetChange: (p: QualityPreset) => void;
  locale: Locale;
}) {
  const options: { value: QualityPreset; labelKey: string }[] = [
    { value: "quality", labelKey: "converter.quality" },
    { value: "balanced", labelKey: "converter.balanced" },
    { value: "small", labelKey: "converter.small" },
  ];

  return (
    <div>
      <div className="flex">
        {options.map((opt, i) => (
          <button
            key={opt.value}
            onClick={() => onPresetChange(opt.value)}
            className={cn(
              "flex-1 border px-4 py-2 text-sm font-medium transition-all",
              i > 0 && "-ml-px",
              preset === opt.value
                ? "relative z-10 border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t(locale, opt.labelKey as any)}
          </button>
        ))}
        <button
          onClick={() => onPresetChange("pixel")}
          className={cn(
            "-ml-px border px-3 py-2 text-sm transition-all",
            preset === "pixel"
              ? "relative z-10 border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
          title="Pixel hell"
        >
          :)
        </button>
      </div>
      {preset === "custom" && (
        <p className="mt-1.5 text-xs italic text-muted-foreground">
          {t(locale, "converter.custom")}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VideoSettings
// ---------------------------------------------------------------------------

function VideoSettings({
  settings,
  onChange,
  locale,
}: {
  settings: VideoAdvancedSettings;
  onChange: (
    key: keyof VideoAdvancedSettings,
    value: string | number,
  ) => void;
  locale: Locale;
}) {
  return (
    <div className="space-y-3">
      {/* Rate control */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t(locale, "converter.rateControl")}
        </label>
        <div className="flex gap-4">
          {(["crf", "cbr", "vbr"] as const).map((mode) => (
            <label
              key={mode}
              className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
            >
              <input
                type="radio"
                name="rateControl"
                value={mode}
                checked={settings.rateControl === mode}
                onChange={() => onChange("rateControl", mode)}
                className="accent-primary"
              />
              {mode.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      {/* CRF slider */}
      {settings.rateControl === "crf" && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              {t(locale, "converter.crf")}
            </label>
            <span className="font-mono text-xs text-foreground">
              {settings.crf}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={51}
            value={settings.crf}
            onChange={(e) => onChange("crf", parseInt(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      )}

      {/* Video bitrate (CBR/VBR) */}
      {settings.rateControl !== "crf" && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t(locale, "converter.videoBitrate")}
          </label>
          <select
            value={settings.videoBitrate}
            onChange={(e) => onChange("videoBitrate", e.target.value)}
            className={selectClass}
          >
            {["500k", "1M", "1.5M", "2M", "3M", "4M", "5M", "8M", "10M"].map(
              (v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Audio bitrate */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t(locale, "converter.audioBitrate")}
          </label>
          <select
            value={settings.audioBitrate}
            onChange={(e) => onChange("audioBitrate", e.target.value)}
            className={selectClass}
          >
            {["64k", "96k", "128k", "192k", "256k", "320k"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Frame rate */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t(locale, "converter.frameRate")}
          </label>
          <select
            value={settings.frameRate}
            onChange={(e) => onChange("frameRate", e.target.value)}
            className={selectClass}
          >
            <option value="original">
              {t(locale, "converter.keepOriginal")}
            </option>
            <option value="60">60 fps</option>
            <option value="30">30 fps</option>
            <option value="24">24 fps</option>
            <option value="15">15 fps</option>
          </select>
        </div>

        {/* Audio codec */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t(locale, "converter.audioCodec")}
          </label>
          <select
            value={settings.audioCodec}
            onChange={(e) => onChange("audioCodec", e.target.value)}
            className={selectClass}
          >
            <option value="aac">AAC</option>
            <option value="copy">
              {t(locale, "converter.copy")}
            </option>
            <option value="none">
              {t(locale, "converter.none")}
            </option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AudioSettings
// ---------------------------------------------------------------------------

function AudioSettings({
  settings,
  onChange,
  locale,
}: {
  settings: AudioAdvancedSettings;
  onChange: (key: keyof AudioAdvancedSettings, value: string) => void;
  locale: Locale;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t(locale, "converter.audioBitrate")}
        </label>
        <select
          value={settings.audioBitrate}
          onChange={(e) => onChange("audioBitrate", e.target.value)}
          className={selectClass}
        >
          {["64k", "96k", "128k", "192k", "256k", "320k"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t(locale, "converter.sampleRate")}
        </label>
        <select
          value={settings.sampleRate}
          onChange={(e) => onChange("sampleRate", e.target.value)}
          className={selectClass}
        >
          <option value="original">
            {t(locale, "converter.keepOriginal")}
          </option>
          <option value="48000">48 kHz</option>
          <option value="44100">44.1 kHz</option>
          <option value="22050">22.05 kHz</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t(locale, "converter.channels")}
        </label>
        <select
          value={settings.channels}
          onChange={(e) => onChange("channels", e.target.value)}
          className={selectClass}
        >
          <option value="original">
            {t(locale, "converter.keepOriginal")}
          </option>
          <option value="2">{t(locale, "converter.stereo")}</option>
          <option value="1">{t(locale, "converter.mono")}</option>
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdvancedSettings
// ---------------------------------------------------------------------------

function AdvancedSettings({
  open,
  onToggle,
  format,
  videoSettings,
  audioSettings,
  onVideoChange,
  onAudioChange,
  disabled,
  locale,
}: {
  open: boolean;
  onToggle: () => void;
  format: OutputFormat;
  videoSettings: VideoAdvancedSettings;
  audioSettings: AudioAdvancedSettings;
  onVideoChange: (
    key: keyof VideoAdvancedSettings,
    value: string | number,
  ) => void;
  onAudioChange: (
    key: keyof AudioAdvancedSettings,
    value: string,
  ) => void;
  disabled?: boolean;
  locale: Locale;
}) {
  const isVideo = format.type === "video" || format.type === "image";

  return (
    <div className={cn("border border-border", disabled && "opacity-50")}>
      <button
        onClick={onToggle}
        disabled={disabled}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
      >
        <span>{t(locale, "converter.advanced")}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            open && !disabled && "rotate-180",
          )}
        />
      </button>
      {open && !disabled && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          {isVideo ? (
            <VideoSettings
              settings={videoSettings}
              onChange={onVideoChange}
              locale={locale}
            />
          ) : (
            <AudioSettings
              settings={audioSettings}
              onChange={onAudioChange}
              locale={locale}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConversionArea
// ---------------------------------------------------------------------------

function ConversionArea({
  state,
  onConvert,
  onCancel,
  onDownloadAll,
  onReset,
  locale,
}: {
  state: ConverterState;
  onConvert: () => void;
  onCancel: () => void;
  onDownloadAll: () => void;
  onReset: () => void;
  locale: Locale;
}) {
  const allDone = state.files.length > 0 && state.files.every(
    (f) => f.status === "completed" || f.status === "error",
  );
  const completedCount = state.files.filter(
    (f) => f.status === "completed",
  ).length;
  const errorCount = state.files.filter((f) => f.status === "error").length;

  if (allDone) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <button
              onClick={onDownloadAll}
              className="flex flex-1 items-center justify-center gap-2 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              {t(locale, "converter.downloadAll")}
            </button>
          )}
          <button
            onClick={onReset}
            className="flex items-center gap-2 border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t(locale, "converter.convertAnother")}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {completedCount > 0 && (
            <span>
              <Check className="mr-1 inline h-3 w-3 text-emerald-500" />
              {completedCount} {t(locale, "converter.completed")}
            </span>
          )}
          {errorCount > 0 && (
            <span className="ml-3 text-destructive">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              {errorCount} {t(locale, "converter.failed")}
            </span>
          )}
        </p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{state.error}</p>
        </div>
        <button
          onClick={onConvert}
          disabled={state.files.length === 0}
          className="w-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t(locale, "converter.convert")}
        </button>
      </div>
    );
  }

  if (state.ffmpegLoading) {
    return (
      <div className="flex items-center justify-center gap-2 border border-border px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          {t(locale, "converter.loadingFfmpeg")}
        </span>
      </div>
    );
  }

  if (state.converting) {
    const currentFile = state.files[state.currentFileIndex];
    const currentProgress = currentFile?.progress ?? 0;

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t(locale, "converter.converting")}{" "}
              <span className="font-mono text-foreground">
                {state.currentFileIndex + 1}/{state.files.length}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-foreground">
                {currentProgress}%
              </span>
              <button
                onClick={onCancel}
                className="text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                {t(locale, "converter.cancel")}
              </button>
            </div>
          </div>
          <div className="h-1.5 w-full bg-border">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
        {currentFile && (
          <p className="truncate text-xs text-muted-foreground/70">
            {currentFile.file.name}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70">
          {t(locale, "converter.slowNotice")}
        </p>
      </div>
    );
  }

  const pendingCount = state.files.filter(
    (f) => f.status === "pending",
  ).length;

  return (
    <button
      onClick={onConvert}
      disabled={state.files.length === 0}
      className="w-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {state.files.length > 1
        ? `${t(locale, "converter.convert")} (${pendingCount})`
        : t(locale, "converter.convert")}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Converter({
  locale = "en" as Locale,
}: {
  locale?: Locale;
}) {
  const [state, dispatch] = useReducer(
    converterReducer,
    undefined,
    getInitialState,
  );
  const cancelledRef = useRef(false);

  // Initialise from URL hash
  useEffect(() => {
    if (!window.location.hash) {
      setHash({ inputFormat: "x", outputFormat: "mp4" });
    } else {
      const h = parseHash(window.location.hash);
      dispatch({
        type: "SYNC_HASH",
        inputFormat: h.inputFormat,
        outputFormatId: h.outputFormat,
      });
    }

    const onHashChange = () => {
      const h = parseHash(window.location.hash);
      dispatch({
        type: "SYNC_HASH",
        inputFormat: h.inputFormat,
        outputFormatId: h.outputFormat,
      });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminate();
    };
  }, []);

  // Detect video dimensions for newly added files
  const detectedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const entry of state.files) {
      if (
        entry.sourceWidth === null &&
        entry.status === "pending" &&
        !detectedIdsRef.current.has(entry.id)
      ) {
        detectedIdsRef.current.add(entry.id);
        getVideoDimensions(entry.file)
          .then((dims) => {
            dispatch({
              type: "SET_FILE_DIMENSIONS",
              id: entry.id,
              width: dims.width,
              height: dims.height,
            });
          })
          .catch(() => {});
      }
    }
  }, [state.files.length]);

  // Handlers
  const handleFormatChange = useCallback(
    (formatId: string) => {
      setHash({ inputFormat: state.inputFormat, outputFormat: formatId });
      dispatch({ type: "SET_OUTPUT_FORMAT", formatId });
    },
    [state.inputFormat],
  );

  const handleConvert = useCallback(async () => {
    const filesToConvert = state.files;
    if (filesToConvert.length === 0) return;

    cancelledRef.current = false;

    dispatch({ type: "FFMPEG_LOADING" });
    try {
      await getFFmpeg();
    } catch (err) {
      console.error("FFmpeg load error:", err);
      dispatch({
        type: "CONVERT_ERROR",
        error: `Failed to load FFmpeg: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    for (let i = 0; i < filesToConvert.length; i++) {
      if (cancelledRef.current) break;

      const entry = filesToConvert[i];
      if (entry.status === "completed") continue;

      dispatch({ type: "CONVERT_FILE_START", index: i });

      try {
        const format = getFormatById(state.outputFormatId)!;
        const codec = getCodecById(format, state.codecId)!;
        const settings =
          format.type === "audio"
            ? state.audioSettings
            : state.videoSettings;
        const args = buildFFmpegArgs({ format, codec, settings });
        const outputName = getOutputFileName(
          entry.file.name,
          format.extension,
        );

        const result = await convert(entry.file, outputName, args, (p) =>
          dispatch({ type: "CONVERT_FILE_PROGRESS", index: i, progress: p }),
        );

        dispatch({
          type: "CONVERT_FILE_COMPLETE",
          index: i,
          data: result.data,
          size: result.size,
          fileName: outputName,
        });

        // Auto-download on completion
        triggerDownload(result.data, outputName);
      } catch (err) {
        if (cancelledRef.current) break;
        dispatch({
          type: "CONVERT_FILE_ERROR",
          index: i,
          error: String(err),
        });
      }
    }
  }, [
    state.files,
    state.outputFormatId,
    state.codecId,
    state.videoSettings,
    state.audioSettings,
  ]);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    cancel();
    dispatch({ type: "CONVERT_CANCEL" });
  }, []);

  const handleDownloadFile = useCallback((entry: FileEntry) => {
    if (entry.outputData) {
      triggerDownload(entry.outputData, entry.outputFileName);
    }
  }, []);

  const handleDownloadAll = useCallback(() => {
    for (const entry of state.files) {
      if (entry.outputData) {
        triggerDownload(entry.outputData, entry.outputFileName);
      }
    }
  }, [state.files]);

  const handleAddFiles = useCallback((newFiles: File[]) => {
    dispatch({ type: "ADD_FILES", files: newFiles });
  }, []);

  const format = getFormatById(state.outputFormatId);
  const isProcessing = state.ffmpegLoading || state.converting;
  const isPixel = state.preset === "pixel";
  const showPresets =
    format &&
    format.type !== "image" &&
    !["wav", "flac"].includes(format.id);
  const allDone =
    state.files.length > 0 &&
    state.files.every(
      (f) => f.status === "completed" || f.status === "error",
    );
  const firstDims = state.files.find((f) => f.sourceWidth !== null);

  return (
    <div className="space-y-4">
      {/* File input */}
      {state.files.length === 0 ? (
        <DropZone onFiles={handleAddFiles} locale={locale} />
      ) : (
        <>
          <FileList
            files={state.files}
            onRemove={(id) => dispatch({ type: "REMOVE_FILE", id })}
            onDownload={handleDownloadFile}
            onClear={() => dispatch({ type: "CLEAR_FILES" })}
            disabled={isProcessing}
            locale={locale}
          />
          {!isProcessing && !allDone && (
            <DropZone
              onFiles={handleAddFiles}
              locale={locale}
              compact
            />
          )}
        </>
      )}

      {/* Settings (hidden after conversion complete) */}
      {!allDone && (
        <div
          className={cn(
            "space-y-3 transition-opacity",
            isProcessing && "pointer-events-none opacity-50",
          )}
        >
          <FormatSelector
            outputFormatId={state.outputFormatId}
            codecId={state.codecId}
            scale={state.videoSettings.scale}
            onFormatChange={handleFormatChange}
            onCodecChange={(id) =>
              dispatch({ type: "SET_CODEC", codecId: id })
            }
            onScaleChange={(value) =>
              dispatch({ type: "SET_VIDEO_SETTING", key: "scale", value })
            }
            scaleDisabled={isPixel}
            locale={locale}
          />

          {format &&
            !isPixel &&
            (format.type === "video" || format.type === "image") &&
            firstDims?.sourceWidth !== undefined &&
            firstDims?.sourceWidth !== null && (
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Width
                  </label>
                  <input
                    type="number"
                    value={state.videoSettings.targetWidth}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_TARGET_DIMENSION",
                        key: "targetWidth",
                        value: e.target.value,
                      })
                    }
                    placeholder="W"
                    min={1}
                    className={selectClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ type: "TOGGLE_ASPECT_LOCK" })
                  }
                  className={cn(
                    "mb-0.5 p-1.5 transition-colors",
                    state.lockAspectRatio
                      ? "text-primary"
                      : "text-muted-foreground/40 hover:text-muted-foreground",
                  )}
                  title={
                    state.lockAspectRatio
                      ? "Aspect ratio locked"
                      : "Aspect ratio unlocked"
                  }
                >
                  {state.lockAspectRatio ? (
                    <Link className="h-4 w-4" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                </button>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Height
                  </label>
                  <input
                    type="number"
                    value={state.videoSettings.targetHeight}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_TARGET_DIMENSION",
                        key: "targetHeight",
                        value: e.target.value,
                      })
                    }
                    placeholder="H"
                    min={1}
                    className={selectClass}
                  />
                </div>
              </div>
            )}

          {showPresets && (
            <QualityPresets
              preset={state.preset}
              onPresetChange={(p) =>
                dispatch({ type: "SET_PRESET", preset: p })
              }
              locale={locale}
            />
          )}

          {format && (
            <AdvancedSettings
              open={state.advancedOpen}
              onToggle={() => dispatch({ type: "TOGGLE_ADVANCED" })}
              format={format}
              videoSettings={state.videoSettings}
              audioSettings={state.audioSettings}
              onVideoChange={(key, value) =>
                dispatch({ type: "SET_VIDEO_SETTING", key, value })
              }
              onAudioChange={(key, value) =>
                dispatch({ type: "SET_AUDIO_SETTING", key, value })
              }
              disabled={isPixel}
              locale={locale}
            />
          )}
        </div>
      )}

      {/* Convert / Progress / Download */}
      <ConversionArea
        state={state}
        onConvert={handleConvert}
        onCancel={handleCancel}
        onDownloadAll={handleDownloadAll}
        onReset={() => dispatch({ type: "RESET_ALL" })}
        locale={locale}
      />
    </div>
  );
}
