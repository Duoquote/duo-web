// ── State types ──────────────────────────────────────────────

export type ImVectorStatus =
  | "idle"
  | "processing"
  | "ready"
  | "error";

export interface PresetResult {
  name: string;
  svg: string;
  blobUrl: string;
  traceMsec: number;
  size: number;
  pathCount: number;
}

export interface Classification {
  imageType: string;
  hasAlpha: boolean;
  colorCount: number;
  edgeDensity: number;
  width: number;
  height: number;
  isGrayscale: boolean;
  isSimple: boolean;
  needsDenoise: boolean;
}

export interface Timings {
  classifyMs: number;
  bilateralMs: number;
  tvDenoiseMs: number;
  quantizeMs: number;
  traceMs: number;
  shapesMs: number;
  totalMs: number;
  aiMs: number;
  svgoMs: number;
}

export interface ProcessSettings {
  quantizeColors: number;
  denoise: boolean;
  detectShapes: boolean;
  aiUpscale: boolean;
  aiDenoise: boolean;
  optimizeLevel: 0 | 1 | 2;
}

export const defaultSettings: ProcessSettings = {
  quantizeColors: 0,
  denoise: true,
  detectShapes: true,
  aiUpscale: true,
  aiDenoise: false,
  optimizeLevel: 1,
};

export interface ImageEntry {
  id: string;
  file: File;
  originalUrl: string;
  status: "pending" | "processing" | "ready" | "error";
  progress: number;
  progressLabel: string;
  error: string | null;
  presets: PresetResult[];
  activePreset: number;
  classification: Classification | null;
  timings: Timings | null;
  quantizedColors: number;
}

export interface ImVectorState {
  images: ImageEntry[];
  activeImageId: string | null;
  settings: ProcessSettings;
  settingsOpen: boolean;
  showOriginal: boolean;
}

export const initialState: ImVectorState = {
  images: [],
  activeImageId: null,
  settings: { ...defaultSettings },
  settingsOpen: false,
  showOriginal: false,
};

// ── Actions ──────────────────────────────────────────────────

export type ImVectorAction =
  | { type: "ADD_IMAGES"; entries: Array<{ id: string; file: File; originalUrl: string }> }
  | { type: "REMOVE_IMAGE"; id: string }
  | { type: "SET_ACTIVE_IMAGE"; id: string }
  | { type: "IMAGE_PROGRESS"; id: string; percent: number; label: string }
  | { type: "IMAGE_PROCESSING"; id: string }
  | {
      type: "IMAGE_COMPLETE";
      id: string;
      presets: PresetResult[];
      classification: Classification;
      timings: Timings;
      quantizedColors: number;
    }
  | { type: "IMAGE_ERROR"; id: string; error: string }
  | { type: "SET_ACTIVE_PRESET"; index: number }
  | { type: "TOGGLE_ORIGINAL" }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "UPDATE_SETTINGS"; settings: Partial<ProcessSettings> }
  | { type: "CLEAR_ALL" }
  // For pipeline compatibility — dispatched during processing of a single image
  | { type: "PROGRESS"; percent: number; label: string }
  | {
      type: "PROCESS_COMPLETE";
      presets: PresetResult[];
      classification: Classification;
      timings: Timings;
      quantizedColors: number;
    }
  | { type: "ERROR"; error: string };

function updateImage(
  state: ImVectorState,
  id: string,
  updater: (img: ImageEntry) => ImageEntry,
): ImVectorState {
  return {
    ...state,
    images: state.images.map((img) => (img.id === id ? updater(img) : img)),
  };
}

export function imvectorReducer(
  state: ImVectorState,
  action: ImVectorAction,
): ImVectorState {
  switch (action.type) {
    case "ADD_IMAGES": {
      const newEntries: ImageEntry[] = action.entries.map((e) => ({
        id: e.id,
        file: e.file,
        originalUrl: e.originalUrl,
        status: "pending",
        progress: 0,
        progressLabel: "",
        error: null,
        presets: [],
        activePreset: 1,
        classification: null,
        timings: null,
        quantizedColors: 0,
      }));
      const images = [...state.images, ...newEntries];
      return {
        ...state,
        images,
        activeImageId: state.activeImageId ?? newEntries[0]?.id ?? null,
      };
    }
    case "REMOVE_IMAGE": {
      const images = state.images.filter((img) => img.id !== action.id);
      const removed = state.images.find((img) => img.id === action.id);
      if (removed) {
        for (const p of removed.presets) URL.revokeObjectURL(p.blobUrl);
        URL.revokeObjectURL(removed.originalUrl);
      }
      return {
        ...state,
        images,
        activeImageId:
          state.activeImageId === action.id
            ? images[0]?.id ?? null
            : state.activeImageId,
      };
    }
    case "SET_ACTIVE_IMAGE":
      return { ...state, activeImageId: action.id, showOriginal: false };
    case "IMAGE_PROCESSING":
      return updateImage(state, action.id, (img) => ({
        ...img,
        status: "processing",
        progress: 0,
        progressLabel: "",
        error: null,
      }));
    case "IMAGE_PROGRESS":
      return updateImage(state, action.id, (img) => ({
        ...img,
        progress: action.percent,
        progressLabel: action.label,
      }));
    case "IMAGE_COMPLETE": {
      // Revoke old blob URLs if reprocessing
      const old = state.images.find((img) => img.id === action.id);
      if (old) {
        for (const p of old.presets) URL.revokeObjectURL(p.blobUrl);
      }
      return updateImage(state, action.id, (img) => ({
        ...img,
        status: "ready",
        progress: 100,
        presets: action.presets,
        classification: action.classification,
        timings: action.timings,
        quantizedColors: action.quantizedColors,
      }));
    }
    case "IMAGE_ERROR":
      return updateImage(state, action.id, (img) => ({
        ...img,
        status: "error",
        error: action.error,
      }));
    case "SET_ACTIVE_PRESET": {
      if (!state.activeImageId) return state;
      return updateImage(state, state.activeImageId, (img) => ({
        ...img,
        activePreset: action.index,
      }));
    }
    case "TOGGLE_ORIGINAL":
      return { ...state, showOriginal: !state.showOriginal };
    case "TOGGLE_SETTINGS":
      return { ...state, settingsOpen: !state.settingsOpen };
    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.settings },
      };
    case "CLEAR_ALL": {
      for (const img of state.images) {
        for (const p of img.presets) URL.revokeObjectURL(p.blobUrl);
        URL.revokeObjectURL(img.originalUrl);
      }
      return { ...initialState, settings: state.settings };
    }
    // Pipeline compat — route to active processing image
    case "PROGRESS": {
      const processingImg = state.images.find((img) => img.status === "processing");
      if (!processingImg) return state;
      return updateImage(state, processingImg.id, (img) => ({
        ...img,
        progress: action.percent,
        progressLabel: action.label,
      }));
    }
    case "PROCESS_COMPLETE": {
      const processingImg = state.images.find((img) => img.status === "processing");
      if (!processingImg) return state;
      const old = state.images.find((img) => img.id === processingImg.id);
      if (old) {
        for (const p of old.presets) URL.revokeObjectURL(p.blobUrl);
      }
      return updateImage(state, processingImg.id, (img) => ({
        ...img,
        status: "ready",
        progress: 100,
        presets: action.presets,
        classification: action.classification,
        timings: action.timings,
        quantizedColors: action.quantizedColors,
      }));
    }
    case "ERROR": {
      const processingImg = state.images.find((img) => img.status === "processing");
      if (!processingImg) return state;
      return updateImage(state, processingImg.id, (img) => ({
        ...img,
        status: "error",
        error: action.error,
      }));
    }
    default:
      return state;
  }
}

// ── Worker message types ─────────────────────────────────────

export type WorkerInput = {
  type: "process";
  pixels: ArrayBuffer;
  width: number;
  height: number;
  settings: {
    quantizeColors: number;
    denoise: boolean;
    detectShapes: boolean;
  };
};

export type WorkerOutput =
  | { type: "progress"; percent: number; label: string }
  | {
      type: "result";
      svgs: Array<{ name: string; svg: string; traceMs: number }>;
      classification: Classification;
      timings: {
        classifyMs: number;
        bilateralMs: number;
        tvDenoiseMs: number;
        quantizeMs: number;
        traceMs: number;
        shapesMs: number;
        totalMs: number;
      };
      quantizedColors: number;
    }
  | { type: "error"; message: string };
