import { useReducer, useRef, useCallback, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";

import type { Locale } from "../../lib/i18n";
import { t } from "../../lib/i18n";
import {
  detectFormat,
  computeBbox,
  formatBytes,
} from "../../lib/geo-viewer/parsers";
import {
  initialState,
  viewerReducer,
} from "../../lib/geo-viewer/types";
import type { WorkerOutput } from "../../lib/geo-viewer/worker";
import type { BinaryFeatureCollection } from "../../lib/geo-viewer/wasm-shim";

// ── Constants ──────────────────────────────────────────────────

const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const FILL_COLOR: [number, number, number, number] = [230, 57, 70, 40];
const LINE_COLOR: [number, number, number, number] = [230, 57, 70, 200];
const HIGHLIGHT_COLOR: [number, number, number, number] = [230, 57, 70, 120];

const ACCEPTED_EXTENSIONS = ".geojson,.json,.kml,.zip";

// ── Helpers ────────────────────────────────────────────────────

function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getMapStyle(): string {
  return isDarkMode() ? DARK_STYLE : LIGHT_STYLE;
}

function getFeatureName(
  props: Record<string, unknown> | null | undefined,
  index: number,
): string {
  if (!props) return `Feature ${index}`;
  return (
    (props.name || props.NAME || props.Name || props.title || props.TITLE ||
     props.label || props.LABEL || props.id || props.ID || `Feature ${index}`) as string
  );
}

// ── Map Hook ───────────────────────────────────────────────────

function useMapLibre(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: getMapStyle(),
      center: [0, 20],
      zoom: 2,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    map.on("load", () => {
      map.resize();
      setReady(true);
    });

    mapRef.current = map;

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Dark mode observer
  useEffect(() => {
    if (!ready) return;

    const observer = new MutationObserver(() => {
      mapRef.current?.setStyle(getMapStyle());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [ready]);

  return { mapRef, ready };
}

// ── Main Component ─────────────────────────────────────────────

export default function GeoViewer({ locale }: { locale: Locale }) {
  const [state, dispatch] = useReducer(viewerReducer, {
    ...initialState,
    sidebarOpen: typeof window !== "undefined" && window.innerWidth >= 768,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const { mapRef, ready } = useMapLibre(containerRef);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const geojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const binaryRef = useRef<BinaryFeatureCollection | null>(null);
  const isBinaryRef = useRef(false);
  const bboxRef = useRef<[number, number, number, number] | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    lng: number;
    lat: number;
  } | null>(null);

  // ── Deck.gl overlay: GeoJSON mode ──────────────────────────

  const initDeckOverlay = useCallback(
    (map: maplibregl.Map, geojson: GeoJSON.FeatureCollection) => {
      if (overlayRef.current) {
        try {
          map.removeControl(overlayRef.current);
        } catch { /* ok */ }
      }

      const overlay = new MapboxOverlay({
        layers: [
          new GeoJsonLayer({
            id: "geo-viewer-layer",
            data: geojson,
            filled: true,
            stroked: true,
            pickable: true,
            autoHighlight: true,
            highlightColor: HIGHLIGHT_COLOR,
            getFillColor: FILL_COLOR,
            getLineColor: LINE_COLOR,
            getLineWidth: 1.5,
            lineWidthUnits: "pixels" as const,
            getPointRadius: 5,
            pointRadiusUnits: "pixels" as const,
            pointType: "circle",
            onHover: (info: any) => {
              const el = tooltipRef.current;
              if (!el) return;
              if (info.object && info.index >= 0) {
                el.textContent = getFeatureName(info.object.properties, info.index);
                el.style.display = "block";
              } else {
                el.style.display = "none";
              }
            },
            onClick: (info: any) => {
              if (info.object && info.index >= 0) {
                dispatch({ type: "SELECT_FEATURE", index: info.index });
              }
            },
          }),
        ],
      });

      map.addControl(overlay as any);
      overlayRef.current = overlay;
    },
    [],
  );

  // ── Deck.gl overlay: Binary mode ──────────────────────────

  const initDeckOverlayBinary = useCallback(
    (map: maplibregl.Map, binary: BinaryFeatureCollection) => {
      if (overlayRef.current) {
        try {
          map.removeControl(overlayRef.current);
        } catch { /* ok */ }
      }

      const overlay = new MapboxOverlay({
        layers: [
          new GeoJsonLayer({
            id: "geo-viewer-layer",
            data: binary as any,
            filled: true,
            stroked: true,
            pickable: true,
            autoHighlight: true,
            highlightColor: HIGHLIGHT_COLOR,
            getFillColor: FILL_COLOR,
            getLineColor: LINE_COLOR,
            getLineWidth: 1.5,
            lineWidthUnits: "pixels" as const,
            getPointRadius: 5,
            pointRadiusUnits: "pixels" as const,
            pointType: "circle",
            onHover: (info: any) => {
              const el = tooltipRef.current;
              if (!el) return;
              if (info.object) {
                const props = info.object.properties || info.object;
                const idx = info.index ?? 0;
                el.textContent = getFeatureName(props, idx);
                el.style.display = "block";
              } else {
                el.style.display = "none";
              }
            },
            onClick: (info: any) => {
              if (info.object) {
                // In binary mode, use globalFeatureIds to get the original feature index
                const globalId = info.object.properties?.__source?.object?.globalFeatureIds?.value?.[0]
                  ?? info.index ?? 0;
                dispatch({ type: "SELECT_FEATURE", index: globalId });
              }
            },
          }),
        ],
      });

      map.addControl(overlay as any);
      overlayRef.current = overlay;
    },
    [],
  );

  // Re-add overlay after style change (dark mode toggle)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onStyleLoad = () => {
      if (isBinaryRef.current && binaryRef.current) {
        initDeckOverlayBinary(map, binaryRef.current);
      } else if (geojsonRef.current) {
        initDeckOverlay(map, geojsonRef.current);
      }
    };

    map.on("style.load", onStyleLoad);
    return () => {
      map.off("style.load", onStyleLoad);
    };
  }, [ready, initDeckOverlay, initDeckOverlayBinary]);

  // ── Lazy property loading for binary mode ─────────────────

  useEffect(() => {
    if (
      state.selectedFeatureIndex === null ||
      !isBinaryRef.current ||
      !workerRef.current
    )
      return;

    dispatch({ type: "PROPS_LOADING" });
    workerRef.current.postMessage({
      type: "get_properties",
      featureIndex: state.selectedFeatureIndex,
    });
  }, [state.selectedFeatureIndex]);

  // ── Cursor coordinates + right-click menu ────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      const el = coordsRef.current;
      if (!el) return;
      el.textContent = `${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`;
    };

    const onContextMenu = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setCtxMenu({
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
      });
    };

    map.on("mousemove", onMouseMove);
    map.on("contextmenu", onContextMenu);

    return () => {
      map.off("mousemove", onMouseMove);
      map.off("contextmenu", onContextMenu);
    };
  }, [ready]);

  // Close context menu on any click or map move
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    mapRef.current?.once("movestart", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [ctxMenu]);

  const copyCoords = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCtxMenu(null);
    },
    [],
  );

  // ── File loading (always via Web Worker) ─────────────────────

  const handleFile = useCallback(
    (file: File) => {
      const map = mapRef.current;
      if (!map) return;

      const format = detectFormat(file);
      if (!format) {
        dispatch({ type: "LOAD_ERROR", error: t(locale, "geoViewer.errorFormat") });
        return;
      }

      // Terminate any previous worker
      workerRef.current?.terminate();

      dispatch({ type: "LOAD_START", file });

      const worker = new Worker(
        new URL("../../lib/geo-viewer/worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;

      // Features accumulate here on the main thread (JS path only)
      const accumulated: GeoJSON.Feature[] = [];

      worker.onmessage = async (e: MessageEvent<WorkerOutput>) => {
        const msg = e.data;

        if (msg.type === "progress") {
          dispatch({
            type: "LOAD_PROGRESS",
            percent: msg.percent,
            label: msg.label,
          });
        } else if (msg.type === "binary_result") {
          // WASM binary path — typed arrays transferred zero-copy
          binaryRef.current = msg.binary;
          isBinaryRef.current = true;
          bboxRef.current = msg.stats.bbox;
          geojsonRef.current = null;

          dispatch({
            type: "LOAD_PROGRESS",
            percent: 97,
            label: "Rendering...",
          });

          if (!map.isStyleLoaded()) {
            await new Promise<void>((r) => map.once("style.load", r));
          }

          initDeckOverlayBinary(map, msg.binary);

          if (msg.stats.bbox) {
            map.fitBounds(msg.stats.bbox, {
              padding: 60,
              maxZoom: 16,
              duration: 800,
            });
          }

          dispatch({
            type: "LOAD_SUCCESS",
            featureCount: msg.stats.featureCount,
            vertexCount: msg.stats.vertexCount,
            geometryTypes: msg.stats.geometryTypes,
          });

          // Worker stays alive for property lookups
        } else if (msg.type === "batch") {
          // JS path (KML/Shapefile)
          for (const f of msg.features) accumulated.push(f);
        } else if (msg.type === "result") {
          // JS path complete
          const geojson: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: accumulated,
          };
          geojsonRef.current = geojson;
          isBinaryRef.current = false;
          binaryRef.current = null;
          bboxRef.current = msg.bbox;

          dispatch({
            type: "LOAD_PROGRESS",
            percent: 97,
            label: "Rendering...",
          });

          if (!map.isStyleLoaded()) {
            await new Promise<void>((r) => map.once("style.load", r));
          }

          initDeckOverlay(map, geojson);

          if (msg.bbox) {
            map.fitBounds(
              msg.bbox as [number, number, number, number],
              { padding: 60, maxZoom: 16, duration: 800 },
            );
          }

          dispatch({
            type: "LOAD_SUCCESS",
            featureCount: msg.featureCount,
            vertexCount: msg.vertexCount,
            geometryTypes: msg.geometryTypes,
          });

          worker.terminate();
          workerRef.current = null;
        } else if (msg.type === "properties") {
          // Lazy property response for binary mode
          dispatch({ type: "PROPS_LOADED", props: msg.props });
        } else if (msg.type === "error") {
          const key =
            msg.message === "UNSUPPORTED_FORMAT"
              ? "geoViewer.errorFormat"
              : msg.message === "NO_FEATURES"
                ? "geoViewer.errorNoFeatures"
                : "geoViewer.errorParse";
          dispatch({
            type: "LOAD_ERROR",
            error: t(locale, key as any),
          });
          worker.terminate();
          workerRef.current = null;
        }
      };

      worker.onerror = () => {
        dispatch({
          type: "LOAD_ERROR",
          error: t(locale, "geoViewer.errorParse"),
        });
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage({ type: "parse", file });
    },
    [ready, locale, initDeckOverlay, initDeckOverlayBinary],
  );

  // Cleanup worker on unmount
  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const handleReset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    const map = mapRef.current;
    if (map && overlayRef.current) {
      try {
        map.removeControl(overlayRef.current);
      } catch { /* ok */ }
      overlayRef.current = null;
    }
    geojsonRef.current = null;
    binaryRef.current = null;
    isBinaryRef.current = false;
    bboxRef.current = null;
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
    dispatch({ type: "RESET" });
  }, []);

  const handleFitBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Use stored bbox (works for both binary and GeoJSON modes)
    const bbox = bboxRef.current ?? (geojsonRef.current ? computeBbox(geojsonRef.current) : null);
    if (bbox) {
      map.fitBounds(bbox as [number, number, number, number], {
        padding: 60,
        maxZoom: 16,
        duration: 800,
      });
    }
  }, []);

  const handleCopyJson = useCallback(async () => {
    if (state.selectedFeatureIndex === null) return;

    if (isBinaryRef.current) {
      // Binary mode: copy the loaded properties
      if (state.selectedFeatureProps) {
        await navigator.clipboard.writeText(
          JSON.stringify(state.selectedFeatureProps, null, 2),
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } else if (geojsonRef.current) {
      // GeoJSON mode: copy full feature
      const feature = geojsonRef.current.features[state.selectedFeatureIndex];
      if (!feature) return;
      await navigator.clipboard.writeText(JSON.stringify(feature, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [state.selectedFeatureIndex, state.selectedFeatureProps]);

  // ── Drag & drop on map area ──────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ── Selected feature properties ──────────────────────────────

  const selectedProps = isBinaryRef.current
    ? state.selectedFeatureProps
    : state.selectedFeatureIndex !== null && geojsonRef.current
      ? geojsonRef.current.features[state.selectedFeatureIndex]?.properties
      : null;

  const selectedGeomType = !isBinaryRef.current &&
    state.selectedFeatureIndex !== null &&
    geojsonRef.current
      ? geojsonRef.current.features[state.selectedFeatureIndex]?.geometry?.type
      : null;

  // ── Render ────────────────────────────────────────────────────

  const isLoading = state.status === "loading";
  const hasFile = state.status === "ready";
  const hasSelection = state.selectedFeatureIndex !== null;

  return (
    <div className="flex h-full min-h-[500px] border border-border">
      {/* Main area */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Toolbar — always visible */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-card">
          <div className="flex items-center gap-2 min-w-0">
            {hasFile && state.file ? (
              <>
                <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                  {state.file.name}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatBytes(state.file.size)}
                </span>
                <span className="text-[10px] text-muted-foreground/60">|</span>
                <span className="text-[10px] text-muted-foreground">
                  {state.featureCount.toLocaleString()} {t(locale, "geoViewer.features")}
                </span>
                <span className="text-[10px] text-muted-foreground/60">|</span>
                <span className="text-[10px] text-muted-foreground">
                  {state.geometryTypes}
                </span>
              </>
            ) : isLoading && state.file ? (
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="h-3 w-3 border border-primary border-t-transparent rounded-full animate-spin" />
                {state.progressLabel || t(locale, "geoViewer.loading")}
                {state.parseProgress > 0 && state.parseProgress < 100 && (
                  <span className="font-mono text-[10px]">
                    {state.parseProgress}%
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                {t(locale, "geoViewer.dropzoneHint")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasFile && (
              <button
                onClick={handleFitBounds}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {t(locale, "geoViewer.fitBounds")}
              </button>
            )}
            {hasFile && (
              <button
                onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer md:hidden"
              >
                {t(locale, "geoViewer.properties")}
              </button>
            )}
            <button
              onClick={hasFile ? handleReset : () => fileInputRef.current?.click()}
              disabled={isLoading || !ready}
              className="text-xs border border-border px-3 py-1 transition-colors hover:border-primary/50 hover:text-primary cursor-pointer disabled:opacity-50"
            >
              {isLoading
                ? t(locale, "geoViewer.loading")
                : hasFile
                  ? t(locale, "geoViewer.loadAnother")
                  : t(locale, "geoViewer.dropzone")}
            </button>
          </div>
        </div>

        {/* Map area — always full, never blocked */}
        <div
          className="flex-1 min-h-0 relative"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {/* Map container */}
          <div
            ref={containerRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          {/* Drag-over indicator — subtle border, doesn't block map */}
          {isDragOver && (
            <div className="absolute inset-0 z-10 border-2 border-primary/60 pointer-events-none" />
          )}

          {/* Error */}
          {state.error && (
            <div className="absolute top-2 left-2 right-2 z-10 bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
              {state.error}
            </div>
          )}

          {/* Hover tooltip — updated via ref, no React re-renders */}
          <div
            ref={tooltipRef}
            className="geo-tooltip absolute top-2 left-2 z-20 px-2 py-1 text-xs pointer-events-none"
            style={{ display: "none" }}
          />

          {/* Cursor coordinates — bottom-left */}
          <div
            ref={coordsRef}
            className="absolute bottom-1 left-1 z-20 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-background/70 backdrop-blur-sm pointer-events-none"
          />

          {/* Right-click context menu */}
          {ctxMenu && (
            <div
              className="absolute z-30 border border-border bg-card shadow-lg py-1 min-w-[180px]"
              style={{ left: ctxMenu.x, top: ctxMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground border-b border-border/50 select-all">
                {ctxMenu.lat.toFixed(6)}, {ctxMenu.lng.toFixed(6)}
              </div>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() =>
                  copyCoords(`${ctxMenu.lat.toFixed(6)}, ${ctxMenu.lng.toFixed(6)}`)
                }
              >
                Copy as lat, lng
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() =>
                  copyCoords(`${ctxMenu.lng.toFixed(6)}, ${ctxMenu.lat.toFixed(6)}`)
                }
              >
                Copy as lng, lat
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() =>
                  copyCoords(
                    JSON.stringify({ lat: ctxMenu.lat, lng: ctxMenu.lng }),
                  )
                }
              >
                Copy as JSON
              </button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Properties sidebar */}
      {hasFile && state.sidebarOpen && (
        <div className="w-72 shrink-0 border-l border-border flex flex-col bg-card overflow-hidden max-md:absolute max-md:right-0 max-md:top-0 max-md:bottom-0 max-md:z-30">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-semibold text-foreground">
              {t(locale, "geoViewer.properties")}
            </span>
            <div className="flex items-center gap-2">
              {hasSelection && selectedProps && (
                <button
                  onClick={handleCopyJson}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {copied ? t(locale, "geoViewer.copied") : t(locale, "geoViewer.copyJson")}
                </button>
              )}
              <button
                onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer md:hidden"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {hasSelection && state.propsLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="h-3 w-3 border border-primary border-t-transparent rounded-full animate-spin" />
                  Loading properties...
                </span>
              </div>
            ) : hasSelection && selectedProps ? (
              <div className="divide-y divide-border/50">
                {/* Feature index & type */}
                <div className="px-3 py-2 bg-muted/30">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Feature #{state.selectedFeatureIndex}
                    {selectedGeomType && <> &middot; {selectedGeomType}</>}
                  </span>
                </div>
                {/* Properties table */}
                {Object.entries(selectedProps).map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start gap-2 px-3 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground shrink-0 w-24 truncate font-mono text-[10px]">
                        {key}
                      </span>
                      <span className="text-foreground break-all font-mono text-[10px]">
                        {value === null
                          ? "null"
                          : typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                      </span>
                    </div>
                  ),
                )}
                {Object.keys(selectedProps).length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground/60 text-center">
                    No properties
                  </div>
                )}
              </div>
            ) : hasSelection ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs text-muted-foreground/60">
                  No properties available
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <svg
                  className="h-8 w-8 text-muted-foreground/20 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.591"
                  />
                </svg>
                <span className="text-xs text-muted-foreground/60">
                  {t(locale, "geoViewer.noSelection")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
