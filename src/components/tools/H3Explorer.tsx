import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import { isValidCell, cellToBoundary, cellToLatLng, getResolution } from "h3-js";
import { Search } from "lucide-react";
import { t, type Locale } from "../../lib/i18n";
import "leaflet/dist/leaflet.css";

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1 });
  }, [center, zoom, map]);
  return null;
}

export default function H3Explorer({ locale = "en" }: { locale?: Locale }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [hexBoundary, setHexBoundary] = useState<[number, number][] | null>(null);
  const [center, setCenter] = useState<[number, number]>([39.92, 32.85]);
  const [zoom, setZoom] = useState(4);

  const resolutionToZoom = (res: number) => Math.min(res + 3, 20);

  const handleSearch = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError(t(locale, "h3.errorEmpty"));
      return;
    }
    if (!isValidCell(trimmed)) {
      setError(t(locale, "h3.errorInvalid"));
      return;
    }

    setError("");
    const boundary = cellToBoundary(trimmed);
    const latLng = cellToLatLng(trimmed);
    const res = getResolution(trimmed);

    setHexBoundary(boundary.map(([lat, lng]) => [lat, lng]));
    setCenter([latLng[0], latLng[1]]);
    setZoom(resolutionToZoom(res));
  }, [input, locale]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Input bar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(locale, "h3.placeholder")}
            spellCheck={false}
            className="w-full border border-border bg-background px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 font-mono"
          />
          <button
            onClick={handleSearch}
            className="absolute right-0 top-0 flex h-full items-center px-2.5 text-muted-foreground transition-colors hover:text-primary"
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
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-full w-full"
          style={{ height: "100%", width: "100%", background: "#0a0a0a" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FlyTo center={center} zoom={zoom} />
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
