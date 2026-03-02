import type { GeoFormat } from "./types";

export function detectFormat(file: File): GeoFormat | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".geojson") || name.endsWith(".json")) return "geojson";
  if (name.endsWith(".kml")) return "kml";
  if (name.endsWith(".zip")) return "shapefile";
  return null;
}

export async function parseGeoFile(
  file: File,
): Promise<GeoJSON.FeatureCollection> {
  const format = detectFormat(file);
  if (!format) throw new Error("UNSUPPORTED_FORMAT");

  switch (format) {
    case "geojson": {
      const text = await file.text();
      const parsed = JSON.parse(text);
      return normalizeGeoJSON(parsed);
    }
    case "kml": {
      const text = await file.text();
      const { kml } = await import("@tmcw/togeojson");
      const dom = new DOMParser().parseFromString(text, "text/xml");
      const result = kml(dom);
      return normalizeGeoJSON(result);
    }
    case "shapefile": {
      const buffer = await file.arrayBuffer();
      const shpjs = (await import("shpjs")).default;
      const result = await shpjs(buffer);
      // shpjs can return a single FeatureCollection or an array of them
      if (Array.isArray(result)) {
        // Merge all FeatureCollections into one
        const features = result.flatMap((fc) => fc.features);
        return normalizeGeoJSON({
          type: "FeatureCollection",
          features,
        });
      }
      return normalizeGeoJSON(result);
    }
  }
}

function normalizeGeoJSON(data: any): GeoJSON.FeatureCollection {
  // If it's already a FeatureCollection
  if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
    return data as GeoJSON.FeatureCollection;
  }
  // If it's a single Feature, wrap it
  if (data.type === "Feature") {
    return { type: "FeatureCollection", features: [data] };
  }
  // If it's a bare Geometry, wrap it in Feature + FeatureCollection
  if (data.coordinates || data.geometries) {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: data, properties: {} }],
    };
  }
  throw new Error("NO_FEATURES");
}

export function countVertices(geojson: GeoJSON.FeatureCollection): number {
  let count = 0;
  for (const feature of geojson.features) {
    const g = feature.geometry;
    if (!g) continue;
    switch (g.type) {
      case "Point":
        count += 1;
        break;
      case "MultiPoint":
        count += g.coordinates.length;
        break;
      case "LineString":
        count += g.coordinates.length;
        break;
      case "MultiLineString":
        for (const ring of g.coordinates) count += ring.length;
        break;
      case "Polygon":
        for (const ring of g.coordinates) count += ring.length;
        break;
      case "MultiPolygon":
        for (const poly of g.coordinates)
          for (const ring of poly) count += ring.length;
        break;
    }
  }
  return count;
}

export function computeBbox(
  geojson: GeoJSON.FeatureCollection,
): [number, number, number, number] | null {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;

  function processCoords(coords: number[]) {
    const [lng, lat] = coords;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  function walk(coords: any, depth: number) {
    if (depth === 0) {
      processCoords(coords as number[]);
    } else {
      for (const c of coords) walk(c, depth - 1);
    }
  }

  for (const f of geojson.features) {
    const g = f.geometry;
    if (!g) continue;
    switch (g.type) {
      case "Point":
        walk(g.coordinates, 0);
        break;
      case "MultiPoint":
      case "LineString":
        walk(g.coordinates, 1);
        break;
      case "MultiLineString":
      case "Polygon":
        walk(g.coordinates, 2);
        break;
      case "MultiPolygon":
        walk(g.coordinates, 3);
        break;
    }
  }

  if (minLng === Infinity) return null;
  return [minLng, minLat, maxLng, maxLat];
}

export function getGeometryTypes(geojson: GeoJSON.FeatureCollection): string {
  const types = new Set<string>();
  for (const f of geojson.features) {
    if (f.geometry) types.add(f.geometry.type);
  }
  return Array.from(types).join(", ");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
