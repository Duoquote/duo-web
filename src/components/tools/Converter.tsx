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

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface ConverterState {
  file: File | null;
  fileSizeWarning: boolean;
  inputFormat: string;
  outputFormatId: string;
  codecId: string;
  preset: QualityPreset | "custom";
  videoSettings: VideoAdvancedSettings;
  audioSettings: AudioAdvancedSettings;
  advancedOpen: boolean;
  ffmpegLoading: boolean;
  converting: boolean;
  progress: number;
  error: string | null;
  outputData: Uint8Array | null;
  outputSize: number;
  outputFileName: string;
}

type ConverterAction =
  | { type: "SET_FILE"; file: File }
  | { type: "CLEAR_FILE" }
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
  | { type: "CONVERT_START" }
  | { type: "CONVERT_PROGRESS"; progress: number }
  | {
      type: "CONVERT_COMPLETE";
      data: Uint8Array;
      size: number;
      fileName: string;
    }
  | { type: "CONVERT_ERROR"; error: string }
  | { type: "CONVERT_CANCEL" }
  | { type: "RESET_RESULT" }
  | {
      type: "SYNC_HASH";
      inputFormat: string;
      outputFormatId: string;
    };

function getInitialState(): ConverterState {
  return {
    file: null,
    fileSizeWarning: false,
    inputFormat: "x",
    outputFormatId: "mp4",
    codecId: "h264",
    preset: "balanced",
    videoSettings: getDefaultVideoSettings(),
    audioSettings: getDefaultAudioSettings(),
    advancedOpen: false,
    ffmpegLoading: false,
    converting: false,
    progress: 0,
    error: null,
    outputData: null,
    outputSize: 0,
    outputFileName: "",
  };
}

function converterReducer(
  state: ConverterState,
  action: ConverterAction,
): ConverterState {
  switch (action.type) {
    case "SET_FILE": {
      const sizeWarning = action.file.size > 50 * 1024 * 1024;
      return {
        ...state,
        file: action.file,
        fileSizeWarning: sizeWarning,
        outputData: null,
        outputSize: 0,
        outputFileName: "",
        error: null,
      };
    }

    case "CLEAR_FILE":
      return {
        ...state,
        file: null,
        fileSizeWarning: false,
        outputData: null,
        outputSize: 0,
        outputFileName: "",
        error: null,
      };

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

      return {
        ...state,
        outputFormatId: format.id,
        codecId: format.defaultCodecId,
        videoSettings: presetValues
          ? {
              ...getDefaultVideoSettings(),
              crf: presetValues.crf,
              videoBitrate: presetValues.videoBitrate,
              audioBitrate: presetValues.audioBitrate,
            }
          : getDefaultVideoSettings(),
        audioSettings: presetValues
          ? {
              ...getDefaultAudioSettings(),
              audioBitrate: presetValues.audioBitrate,
            }
          : getDefaultAudioSettings(),
        outputData: null,
        outputSize: 0,
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
        return {
          ...state,
          preset: action.preset,
          audioSettings: {
            ...state.audioSettings,
            audioBitrate: pv.audioBitrate,
          },
        };
      }

      return {
        ...state,
        preset: action.preset,
        videoSettings: {
          ...state.videoSettings,
          crf: pv.crf,
          videoBitrate: pv.videoBitrate,
          audioBitrate: pv.audioBitrate,
          scale: action.preset === "pixel" ? "pixel" : "1",
        },
      };
    }

    case "SET_VIDEO_SETTING":
      return {
        ...state,
        preset: "custom",
        videoSettings: {
          ...state.videoSettings,
          [action.key]: action.value,
        },
      };

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

    case "CONVERT_START":
      return {
        ...state,
        ffmpegLoading: false,
        converting: true,
        progress: 0,
        error: null,
      };

    case "CONVERT_PROGRESS":
      return { ...state, progress: action.progress };

    case "CONVERT_COMPLETE":
      return {
        ...state,
        converting: false,
        progress: 100,
        outputData: action.data,
        outputSize: action.size,
        outputFileName: action.fileName,
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
        progress: 0,
      };

    case "RESET_RESULT":
      return {
        ...state,
        file: null,
        fileSizeWarning: false,
        outputData: null,
        outputSize: 0,
        outputFileName: "",
        error: null,
        progress: 0,
      };

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
  onFile,
  locale,
}: {
  onFile: (f: File) => void;
  locale: Locale;
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
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

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
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
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
// FileInfo
// ---------------------------------------------------------------------------

function FileInfo({
  file,
  sizeWarning,
  onRemove,
  locale,
}: {
  file: File;
  sizeWarning: boolean;
  onRemove: () => void;
  locale: Locale;
}) {
  const ext = file.name.split(".").pop()?.toUpperCase() || "?";

  return (
    <div className="border border-border bg-card">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 font-mono text-[11px] font-bold text-primary">
          {ext}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
            <span className="mx-1.5 text-border">·</span>
            {file.type || "unknown"}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t(locale, "converter.removeFile")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {sizeWarning && (
        <div className="flex items-center gap-2 border-t border-border bg-destructive/5 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">
            {t(locale, "converter.fileSizeWarning")}
          </p>
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
  locale,
}: {
  outputFormatId: string;
  codecId: string;
  scale: string;
  onFormatChange: (id: string) => void;
  onCodecChange: (id: string) => void;
  onScaleChange: (value: string) => void;
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
          >
            <option value="1">1x</option>
            <option value="0.75">0.75x</option>
            <option value="0.5">0.5x</option>
            <option value="0.33">0.33x</option>
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
  locale: Locale;
}) {
  const isVideo = format.type === "video" || format.type === "image";

  return (
    <div className="border border-border">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>{t(locale, "converter.advanced")}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
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
  onDownload,
  onReset,
  locale,
}: {
  state: ConverterState;
  onConvert: () => void;
  onCancel: () => void;
  onDownload: () => void;
  onReset: () => void;
  locale: Locale;
}) {
  if (state.outputData) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onDownload}
            className="flex flex-1 items-center justify-center gap-2 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            {t(locale, "converter.download")}
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t(locale, "converter.convertAnother")}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(locale, "converter.outputSize")}:{" "}
          <span className="font-mono text-foreground">
            {formatFileSize(state.outputSize)}
          </span>
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
          disabled={!state.file}
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
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t(locale, "converter.converting")}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-foreground">
                {state.progress}%
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
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70">
          {t(locale, "converter.slowNotice")}
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={onConvert}
      disabled={!state.file}
      className="w-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {t(locale, "converter.convert")}
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
  const blobUrlRef = useRef<string | null>(null);

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
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  // Handlers
  const handleFormatChange = useCallback(
    (formatId: string) => {
      setHash({ inputFormat: state.inputFormat, outputFormat: formatId });
      dispatch({ type: "SET_OUTPUT_FORMAT", formatId });
    },
    [state.inputFormat],
  );

  const handleConvert = useCallback(async () => {
    if (!state.file) return;

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

    dispatch({ type: "CONVERT_START" });
    try {
      const format = getFormatById(state.outputFormatId)!;
      const codec = getCodecById(format, state.codecId)!;
      const settings =
        format.type === "audio"
          ? state.audioSettings
          : state.videoSettings;
      const args = buildFFmpegArgs({ format, codec, settings });
      const outputName = getOutputFileName(
        state.file.name,
        format.extension,
      );

      const result = await convert(state.file, outputName, args, (p) =>
        dispatch({ type: "CONVERT_PROGRESS", progress: p }),
      );

      dispatch({
        type: "CONVERT_COMPLETE",
        data: result.data,
        size: result.size,
        fileName: outputName,
      });
    } catch (err) {
      dispatch({ type: "CONVERT_ERROR", error: String(err) });
    }
  }, [
    state.file,
    state.outputFormatId,
    state.codecId,
    state.videoSettings,
    state.audioSettings,
  ]);

  const handleCancel = useCallback(() => {
    cancel();
    dispatch({ type: "CONVERT_CANCEL" });
  }, []);

  const handleDownload = useCallback(() => {
    if (!state.outputData) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

    const blob = new Blob([state.outputData]);
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    const a = document.createElement("a");
    a.href = url;
    a.download = state.outputFileName;
    a.click();
  }, [state.outputData, state.outputFileName]);

  const format = getFormatById(state.outputFormatId);
  const isProcessing = state.ffmpegLoading || state.converting;
  const showPresets =
    format &&
    format.type !== "image" &&
    !["wav", "flac"].includes(format.id);

  return (
    <div className="space-y-4">
      {/* File input */}
      {!state.file ? (
        <DropZone
          onFile={(f) => dispatch({ type: "SET_FILE", file: f })}
          locale={locale}
        />
      ) : (
        <FileInfo
          file={state.file}
          sizeWarning={state.fileSizeWarning}
          onRemove={() => dispatch({ type: "CLEAR_FILE" })}
          locale={locale}
        />
      )}

      {/* Settings (hidden after conversion complete) */}
      {!state.outputData && (
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
            locale={locale}
          />

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
        onDownload={handleDownload}
        onReset={() => dispatch({ type: "RESET_RESULT" })}
        locale={locale}
      />
    </div>
  );
}
