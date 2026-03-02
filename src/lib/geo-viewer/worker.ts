// Web Worker for parsing geo files off the main thread.
// GeoJSON → WASM binary pipeline (no JS Feature objects created).
// KML/Shapefile → existing JS parsers (unchanged).

import init, { GeoParser } from "../../../wasm/geo-parser/pkg/geo_parser";
import {
  extractBinaryCollection,
  getTransferables,
} from "./wasm-shim";
import type { BinaryFeatureCollection, ParseStats } from "./wasm-shim";

export type WorkerInput =
  | { type: "parse"; file: File }
  | { type: "get_properties"; featureIndex: number };

export type WorkerOutput =
  | { type: "progress"; percent: number; label?: string }
  | { type: "batch"; features: GeoJSON.Feature[] }
  | {
      type: "binary_result";
      binary: BinaryFeatureCollection;
      stats: ParseStats;
    }
  | {
      type: "result";
      featureCount: number;
      vertexCount: number;
      geometryTypes: string;
      bbox: [number, number, number, number] | null;
    }
  | { type: "properties"; index: number; props: Record<string, unknown> | null }
  | { type: "error"; message: string };

function post(msg: WorkerOutput, transfer?: Transferable[]) {
  if (transfer && transfer.length > 0) {
    self.postMessage(msg, transfer);
  } else {
    self.postMessage(msg);
  }
}

const BATCH_SIZE = 10_000;

// ── WASM parser instance (kept alive for property lookups) ────

let wasmParser: GeoParser | null = null;
let wasmReady: Promise<void> | null = null;

async function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = init().then(() => {});
  }
  return wasmReady;
}

// ── Incremental stats (for JS path only) ─────────────────────

let statFeatures = 0;
let statVertices = 0;
let statMinLng = Infinity;
let statMinLat = Infinity;
let statMaxLng = -Infinity;
let statMaxLat = -Infinity;
const statGeomTypes = new Set<string>();

function resetStats() {
  statFeatures = 0;
  statVertices = 0;
  statMinLng = Infinity;
  statMinLat = Infinity;
  statMaxLng = -Infinity;
  statMaxLat = -Infinity;
  statGeomTypes.clear();
}

function trackFeature(f: GeoJSON.Feature) {
  statFeatures++;
  const g = f.geometry;
  if (!g) return;
  statGeomTypes.add(g.type);
  walkGeom(g);
}

function walkGeom(g: GeoJSON.Geometry) {
  switch (g.type) {
    case "Point":
      trackCoord((g as GeoJSON.Point).coordinates);
      statVertices++;
      break;
    case "MultiPoint":
    case "LineString":
      for (const c of (g as any).coordinates) {
        trackCoord(c);
        statVertices++;
      }
      break;
    case "MultiLineString":
    case "Polygon":
      for (const ring of (g as any).coordinates)
        for (const c of ring) {
          trackCoord(c);
          statVertices++;
        }
      break;
    case "MultiPolygon":
      for (const poly of (g as any).coordinates)
        for (const ring of poly)
          for (const c of ring) {
            trackCoord(c);
            statVertices++;
          }
      break;
    case "GeometryCollection":
      for (const gg of (g as GeoJSON.GeometryCollection).geometries)
        walkGeom(gg);
      break;
  }
}

function trackCoord(c: number[]) {
  const lng = c[0],
    lat = c[1];
  if (lng < statMinLng) statMinLng = lng;
  if (lng > statMaxLng) statMaxLng = lng;
  if (lat < statMinLat) statMinLat = lat;
  if (lat > statMaxLat) statMaxLat = lat;
}

function emitResult() {
  post({
    type: "result",
    featureCount: statFeatures,
    vertexCount: statVertices,
    geometryTypes: Array.from(statGeomTypes).join(", "),
    bbox:
      statMinLng === Infinity
        ? null
        : [statMinLng, statMinLat, statMaxLng, statMaxLat],
  });
}

// ── Send features in batches (JS path) ───────────────────────

function sendBatched(features: GeoJSON.Feature[]) {
  for (let i = 0; i < features.length; i += BATCH_SIZE) {
    const batch = features.slice(i, i + BATCH_SIZE);
    for (const f of batch) trackFeature(f);
    post({ type: "batch", features: batch });
  }
}

// ── Helpers ──────────────────────────────────────────────────

function normalizeGeoJSON(data: any): GeoJSON.FeatureCollection {
  if (data.type === "FeatureCollection" && Array.isArray(data.features))
    return data;
  if (data.type === "Feature")
    return { type: "FeatureCollection", features: [data] };
  if (data.coordinates || data.geometries)
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: data, properties: {} }],
    };
  throw new Error("NO_FEATURES");
}

function detectFormat(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith(".geojson") || n.endsWith(".json")) return "geojson";
  if (n.endsWith(".kml")) return "kml";
  if (n.endsWith(".zip")) return "shapefile";
  return null;
}

// ── WASM GeoJSON parser (streaming) ──────────────────────────

async function wasmParseGeoJSON(file: File) {
  await ensureWasm();

  // Free any previous parser
  wasmParser?.free();
  wasmParser = new GeoParser();

  const stream = file.stream() as ReadableStream<Uint8Array>;
  const reader = stream.getReader();

  let totalRead = 0;
  let lastPct = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalRead += value.byteLength;
    wasmParser.push_chunk(value);

    const pct = Math.min(85, Math.round((totalRead / file.size) * 85));
    if (pct > lastPct + 2) {
      lastPct = pct;
      post({
        type: "progress",
        percent: pct,
        label: `Parsing... ${wasmParser.feature_count().toLocaleString()} features`,
      });
    }
  }

  post({ type: "progress", percent: 88, label: "Finalizing..." });
  wasmParser.finalize();

  post({ type: "progress", percent: 92, label: "Building arrays..." });
  const { binary, stats } = extractBinaryCollection(wasmParser);

  const transferables = getTransferables(binary);
  post(
    { type: "binary_result", binary, stats },
    transferables as Transferable[],
  );
}

// ── Parse dispatch ───────────────────────────────────────────

async function parseFile(file: File) {
  const format = detectFormat(file.name);
  if (!format) throw new Error("UNSUPPORTED_FORMAT");

  post({ type: "progress", percent: 5, label: "Reading file..." });

  switch (format) {
    case "geojson": {
      // Always use WASM for GeoJSON
      await wasmParseGeoJSON(file);
      return; // binary_result sent, no emitResult needed
    }
    case "kml": {
      resetStats();
      const text = await file.text();
      post({ type: "progress", percent: 30, label: "Parsing KML..." });
      const { kml } = await import("@tmcw/togeojson");
      const dom = new DOMParser().parseFromString(text, "text/xml");
      const geojson = normalizeGeoJSON(kml(dom));
      sendBatched(geojson.features);
      break;
    }
    case "shapefile": {
      resetStats();
      const ab = await file.arrayBuffer();
      post({ type: "progress", percent: 30, label: "Parsing Shapefile..." });
      const shpjs = (await import("shpjs")).default;
      const result = await shpjs(ab);
      const geojson = Array.isArray(result)
        ? normalizeGeoJSON({
            type: "FeatureCollection",
            features: result.flatMap((fc) => fc.features),
          })
        : normalizeGeoJSON(result);
      sendBatched(geojson.features);
      break;
    }
  }

  if (statFeatures === 0) throw new Error("NO_FEATURES");

  post({ type: "progress", percent: 95, label: "Finalizing..." });
  emitResult();
}

// ── Message handler ──────────────────────────────────────────

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const msg = e.data;

  if (msg.type === "parse") {
    try {
      await parseFile(msg.file);
    } catch (err: any) {
      post({ type: "error", message: err.message || "Failed to parse file" });
    }
  } else if (msg.type === "get_properties") {
    if (wasmParser) {
      const props = wasmParser.get_properties(msg.featureIndex);
      post({
        type: "properties",
        index: msg.featureIndex,
        props: props as Record<string, unknown> | null,
      });
    } else {
      post({ type: "properties", index: msg.featureIndex, props: null });
    }
  }
};
