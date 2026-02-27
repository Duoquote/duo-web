import { useState, useCallback, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polygon, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  isValidCell,
  cellToBoundary,
  cellToLatLng,
  getResolution,
  polygonToCells,
} from "h3-js";
import { Search } from "lucide-react";
import { t, type Locale } from "../../lib/i18n";
import "leaflet/dist/leaflet.css";

type DisplayMode = "hex" | "decimal";

function h3ToDecimal(h3Index: string): string {
  return BigInt("0x" + h3Index).toString();
}

function decimalToH3(decimal: string): string {
  try {
    return BigInt(decimal).toString(16);
  } catch {
    return "";
  }
}

function formatCellId(h3Index: string, mode: DisplayMode): string {
  return mode === "hex" ? h3Index : h3ToDecimal(h3Index);
}

function inputToH3(input: string, mode: DisplayMode): string {
  const trimmed = input.trim();
  if (mode === "decimal") return decimalToH3(trimmed);
  return trimmed;
}

const ZOOM_TO_RES: Record<number, number> = {
  0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 2, 6: 3, 7: 3,
  8: 4, 9: 4, 10: 5, 11: 5, 12: 6, 13: 7, 14: 8, 15: 9,
  16: 10, 17: 11, 18: 12, 19: 13, 20: 14, 21: 15, 22: 15,
  23: 15, 24: 15,
};

function zoomToResolution(zoom: number): number {
  return ZOOM_TO_RES[Math.round(zoom)] ?? 0;
}

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1 });
  }, [center, zoom, map]);
  return null;
}

const DEFAULT_STYLE: L.PathOptions = {
  color: "oklch(0.645 0.246 16.439 / 0.25)",
  fillColor: "transparent",
  fillOpacity: 0,
  weight: 1,
};

const HOVER_STYLE: L.PathOptions = {
  color: "oklch(0.645 0.246 16.439)",
  fillColor: "oklch(0.645 0.246 16.439)",
  fillOpacity: 0.15,
  weight: 2,
};

function H3Grid({
  displayMode,
  onCopy,
}: {
  displayMode: DisplayMode;
  onCopy: (text: string) => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const hoveredRef = useRef<L.Polygon | null>(null);
  const modeRef = useRef(displayMode);
  modeRef.current = displayMode;

  useEffect(() => {
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      layerRef.current?.remove();
    };
  }, [map]);

  const updateGrid = useCallback(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();
    hoveredRef.current = null;

    const bounds = map.getBounds();
    const zoom = Math.round(map.getZoom());
    const res = zoomToResolution(zoom);

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const polygon = [[
      [sw.lat, sw.lng] as [number, number],
      [ne.lat, sw.lng] as [number, number],
      [ne.lat, ne.lng] as [number, number],
      [sw.lat, ne.lng] as [number, number],
    ]];

    try {
      const cells = polygonToCells(polygon, res, false);
      if (cells.length > 15000) return;

      for (const cell of cells) {
        const boundary = cellToBoundary(cell);
        const poly = L.polygon(
          boundary.map(([lat, lng]) => [lat, lng] as L.LatLngExpression),
          { ...DEFAULT_STYLE },
        );

        const cellRes = getResolution(cell);
        poly.bindTooltip("", {
          sticky: true,
          direction: "top",
          offset: [0, -10],
          className: "h3-tooltip",
        });

        poly.on("mouseover", () => {
          if (hoveredRef.current && hoveredRef.current !== poly) {
            hoveredRef.current.setStyle(DEFAULT_STYLE);
          }
          hoveredRef.current = poly;
          poly.setStyle(HOVER_STYLE);
          poly.bringToFront();
          const displayId = formatCellId(cell, modeRef.current);
          poly.setTooltipContent(
            `<span style="opacity:0.5">res</span> ${cellRes} <span style="opacity:0.5">|</span> ${displayId}`,
          );
        });

        poly.on("mouseout", () => {
          poly.setStyle(DEFAULT_STYLE);
          if (hoveredRef.current === poly) hoveredRef.current = null;
        });

        poly.on("click", () => {
          const copyId = formatCellId(cell, modeRef.current);
          onCopy(copyId);
        });

        poly.addTo(layerRef.current!);
      }
    } catch {
      // bounds may be invalid at extreme zoom levels
    }
  }, [map, onCopy]);

  useMapEvents({
    moveend: updateGrid,
    zoomend: updateGrid,
  });

  useEffect(() => {
    updateGrid();
  }, [updateGrid]);

  return null;
}

export default function H3Explorer({ locale = "en" }: { locale?: Locale }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [hexBoundary, setHexBoundary] = useState<[number, number][] | null>(null);
  const [center, setCenter] = useState<[number, number]>([39.92, 32.85]);
  const [zoom, setZoom] = useState(4);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("hex");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  const resolutionToZoom = (res: number) => Math.min(res + 8, 24);

  const handleSearch = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError(t(locale, "h3.errorEmpty"));
      return;
    }

    const h3Index = inputToH3(trimmed, displayMode);
    if (!h3Index || !isValidCell(h3Index)) {
      setError(t(locale, "h3.errorInvalid"));
      return;
    }

    setError("");
    const boundary = cellToBoundary(h3Index);
    const latLng = cellToLatLng(h3Index);
    const res = getResolution(h3Index);

    setHexBoundary(boundary.map(([lat, lng]) => [lat, lng]));
    setCenter([latLng[0], latLng[1]]);
    setZoom(resolutionToZoom(res));
  }, [input, locale, displayMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Input bar */}
      <div className="flex gap-2 mb-3 items-center">
        {/* Hex / Decimal switch */}
        <button
          onClick={() => setDisplayMode((m) => (m === "hex" ? "decimal" : "hex"))}
          className="shrink-0 flex items-center gap-1.5 border border-border px-2.5 py-2 text-xs font-mono cursor-pointer transition-colors hover:border-primary/50"
        >
          <span className={displayMode === "hex" ? "text-primary" : "text-muted-foreground"}>
            HEX
          </span>
          <span className="text-muted-foreground/40">/</span>
          <span className={displayMode === "decimal" ? "text-primary" : "text-muted-foreground"}>
            DEC
          </span>
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              displayMode === "hex"
                ? t(locale, "h3.placeholder")
                : t(locale, "h3.placeholderDecimal")
            }
            spellCheck={false}
            className="w-full border border-border bg-background px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 font-mono"
          />
          <button
            onClick={handleSearch}
            className="absolute right-0 top-0 flex h-full items-center px-2.5 text-muted-foreground cursor-pointer transition-colors hover:text-primary"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-2 text-xs text-destructive">{error}</p>
      )}

      {/* Map */}
      <div className="relative flex-1 min-h-[350px] border border-border">
        {copied && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-primary text-primary-foreground px-3 py-1 text-xs font-mono pointer-events-none">
            Copied!
          </div>
        )}
        <MapContainer
          center={center}
          zoom={zoom}
          maxZoom={24}
          className="h-full w-full"
          style={{ height: "100%", width: "100%", background: "#0a0a0a" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?language=en"
            maxNativeZoom={19}
            maxZoom={24}
          />
          <FlyTo center={center} zoom={zoom} />
          <H3Grid displayMode={displayMode} onCopy={handleCopy} />
          {hexBoundary && (
            <Polygon
              positions={hexBoundary}
              pathOptions={{
                color: "oklch(0.645 0.246 16.439)",
                fillColor: "oklch(0.645 0.246 16.439)",
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
