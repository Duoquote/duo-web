export type GeoFormat = "geojson" | "kml" | "shapefile";

export type ViewerStatus = "idle" | "loading" | "ready" | "error";

export interface ViewerState {
  status: ViewerStatus;
  file: File | null;
  parseProgress: number;
  progressLabel: string;
  error: string | null;
  featureCount: number;
  vertexCount: number;
  geometryTypes: string;
  selectedFeatureIndex: number | null;
  sidebarOpen: boolean;
  /** Properties for the selected feature (loaded lazily in binary mode) */
  selectedFeatureProps: Record<string, unknown> | null;
  /** Whether properties are being loaded from the worker */
  propsLoading: boolean;
}

export type ViewerAction =
  | { type: "LOAD_START"; file: File }
  | { type: "LOAD_PROGRESS"; percent: number; label?: string }
  | {
      type: "LOAD_SUCCESS";
      featureCount: number;
      vertexCount: number;
      geometryTypes: string;
    }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "SELECT_FEATURE"; index: number | null }
  | { type: "PROPS_LOADING" }
  | { type: "PROPS_LOADED"; props: Record<string, unknown> | null }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "RESET" };

export const initialState: ViewerState = {
  status: "idle",
  file: null,
  parseProgress: 0,
  progressLabel: "",
  error: null,
  featureCount: 0,
  vertexCount: 0,
  geometryTypes: "",
  selectedFeatureIndex: null,
  sidebarOpen: true,
  selectedFeatureProps: null,
  propsLoading: false,
};

export function viewerReducer(
  state: ViewerState,
  action: ViewerAction,
): ViewerState {
  switch (action.type) {
    case "LOAD_START":
      return {
        ...initialState,
        status: "loading",
        file: action.file,
        sidebarOpen: state.sidebarOpen,
      };
    case "LOAD_PROGRESS":
      return {
        ...state,
        parseProgress: action.percent,
        progressLabel: action.label ?? state.progressLabel,
      };
    case "LOAD_SUCCESS":
      return {
        ...state,
        status: "ready",
        featureCount: action.featureCount,
        vertexCount: action.vertexCount,
        geometryTypes: action.geometryTypes,
        parseProgress: 100,
      };
    case "LOAD_ERROR":
      return { ...state, status: "error", error: action.error };
    case "SELECT_FEATURE":
      return {
        ...state,
        selectedFeatureIndex: action.index,
        selectedFeatureProps: null,
        propsLoading: false,
      };
    case "PROPS_LOADING":
      return { ...state, propsLoading: true };
    case "PROPS_LOADED":
      return {
        ...state,
        selectedFeatureProps: action.props,
        propsLoading: false,
      };
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "RESET":
      return { ...initialState, sidebarOpen: state.sidebarOpen };
    default:
      return state;
  }
}
