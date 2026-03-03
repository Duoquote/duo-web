/// Wraps WASM GeoParser viewport-filtered typed arrays into deck.gl BinaryFeatureCollection.
///
/// deck.gl detects binary mode when `data` has 'points', 'polygons', AND 'lines'
/// keys — all three MUST exist even if empty.
///
/// Viewport filtering: WASM spatial index selects only features visible in the
/// current viewport, so we transfer minimal data to the GPU on each view change.
/// Properties are loaded lazily from the worker on click.

import type { GeoParser } from "../../../wasm/geo-parser/pkg/geo_parser";

export interface BinaryGeometry {
  positions: { value: Float64Array; size: 2 };
  globalFeatureIds: { value: Uint32Array; size: 1 };
  featureIds: { value: Uint32Array; size: 1 };
  numericProps: Record<string, { value: Float64Array; size: 1 }>;
  properties: Record<string, unknown>[];
}

export interface BinaryPointGeometry extends BinaryGeometry {}

export interface BinaryLineGeometry extends BinaryGeometry {
  pathIndices: { value: Uint32Array; size: 1 };
}

export interface BinaryPolygonGeometry extends BinaryGeometry {
  polygonIndices: { value: Uint32Array; size: 1 };
  primitivePolygonIndices: { value: Uint32Array; size: 1 };
}

export interface BinaryFeatureCollection {
  points: BinaryPointGeometry;
  lines: BinaryLineGeometry;
  polygons: BinaryPolygonGeometry;
}

export interface ParseStats {
  featureCount: number;
  vertexCount: number;
  geometryTypes: string;
  bbox: [number, number, number, number] | null;
}

/**
 * Build a per-feature properties array from featureIds → globalFeatureIds mapping.
 * Each entry is `{ __globalId: <global feature index> }` which deck.gl serves
 * as `info.object` on click, giving us the global ID for property lookup.
 */
function buildPropertiesArray(
  featureIds: Uint32Array,
  globalFeatureIds: Uint32Array,
): Record<string, unknown>[] {
  if (featureIds.length === 0) return [];
  // Find max featureId to size the array
  let maxFid = 0;
  for (let i = 0; i < featureIds.length; i++) {
    if (featureIds[i] > maxFid) maxFid = featureIds[i];
  }
  const props: Record<string, unknown>[] = new Array(maxFid + 1);
  for (let i = 0; i < featureIds.length; i++) {
    const fid = featureIds[i];
    if (props[fid] === undefined) {
      props[fid] = { __globalId: globalFeatureIds[i] };
    }
  }
  // Fill any gaps with empty objects
  for (let i = 0; i <= maxFid; i++) {
    if (props[i] === undefined) props[i] = {};
  }
  return props;
}

/// Build a viewport-filtered BinaryFeatureCollection from the WASM parser.
/// Only includes features whose bbox intersects the given viewport.
/// `minExtent`: LOD threshold in degrees — non-point features smaller than this are skipped.
export function extractViewportBinary(
  parser: GeoParser,
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  minExtent: number = 0,
): { binary: BinaryFeatureCollection; visibleCount: number } {
  const visibleCount = parser.build_viewport(minLng, minLat, maxLng, maxLat, minExtent);

  const emptyNumericProps: Record<
    string,
    { value: Float64Array; size: 1 }
  > = {};

  const ptFids = parser.vp_point_feature_ids();
  const ptGids = parser.vp_point_global_feature_ids();
  const lnFids = parser.vp_line_feature_ids();
  const lnGids = parser.vp_line_global_feature_ids();
  const pgFids = parser.vp_polygon_feature_ids();
  const pgGids = parser.vp_polygon_global_feature_ids();

  const binary: BinaryFeatureCollection = {
    points: {
      positions: { value: parser.vp_point_positions(), size: 2 },
      globalFeatureIds: { value: ptGids, size: 1 },
      featureIds: { value: ptFids, size: 1 },
      numericProps: emptyNumericProps,
      properties: buildPropertiesArray(ptFids, ptGids),
    },
    lines: {
      positions: { value: parser.vp_line_positions(), size: 2 },
      pathIndices: { value: parser.vp_line_path_indices(), size: 1 },
      globalFeatureIds: { value: lnGids, size: 1 },
      featureIds: { value: lnFids, size: 1 },
      numericProps: emptyNumericProps,
      properties: buildPropertiesArray(lnFids, lnGids),
    },
    polygons: {
      positions: { value: parser.vp_polygon_positions(), size: 2 },
      polygonIndices: { value: parser.vp_polygon_indices(), size: 1 },
      primitivePolygonIndices: {
        value: parser.vp_primitive_polygon_indices(),
        size: 1,
      },
      globalFeatureIds: { value: pgGids, size: 1 },
      featureIds: { value: pgFids, size: 1 },
      numericProps: emptyNumericProps,
      properties: buildPropertiesArray(pgFids, pgGids),
    },
  };

  return { binary, visibleCount };
}

/// Collect all ArrayBuffer references for Transferable postMessage.
export function getTransferables(binary: BinaryFeatureCollection): ArrayBuffer[] {
  const buffers: ArrayBuffer[] = [];

  function addTypedArray(ta: { value: { buffer: ArrayBuffer } }) {
    if (ta.value.buffer.byteLength > 0) {
      buffers.push(ta.value.buffer);
    }
  }

  // Points
  addTypedArray(binary.points.positions);
  addTypedArray(binary.points.globalFeatureIds);
  addTypedArray(binary.points.featureIds);

  // Lines
  addTypedArray(binary.lines.positions);
  addTypedArray(binary.lines.pathIndices);
  addTypedArray(binary.lines.globalFeatureIds);
  addTypedArray(binary.lines.featureIds);

  // Polygons
  addTypedArray(binary.polygons.positions);
  addTypedArray(binary.polygons.polygonIndices);
  addTypedArray(binary.polygons.primitivePolygonIndices);
  addTypedArray(binary.polygons.globalFeatureIds);
  addTypedArray(binary.polygons.featureIds);

  return buffers;
}
