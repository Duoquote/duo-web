/// Wraps WASM GeoParser typed arrays into deck.gl BinaryFeatureCollection.
///
/// deck.gl detects binary mode when `data` has 'points', 'polygons', AND 'lines'
/// keys — all three MUST exist even if empty.

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

export function extractBinaryCollection(parser: GeoParser): {
  binary: BinaryFeatureCollection;
  stats: ParseStats;
} {
  const numericNames: string[] = Array.from(parser.numeric_prop_names());

  // Build numeric props for each geometry type
  const pointNumericProps: Record<string, { value: Float64Array; size: 1 }> = {};
  const lineNumericProps: Record<string, { value: Float64Array; size: 1 }> = {};
  const polygonNumericProps: Record<string, { value: Float64Array; size: 1 }> = {};

  for (const name of numericNames) {
    pointNumericProps[name] = {
      value: parser.numeric_prop_points(name),
      size: 1,
    };
    lineNumericProps[name] = {
      value: parser.numeric_prop_lines(name),
      size: 1,
    };
    polygonNumericProps[name] = {
      value: parser.numeric_prop_polygons(name),
      size: 1,
    };
  }

  const binary: BinaryFeatureCollection = {
    points: {
      positions: { value: parser.point_positions(), size: 2 },
      globalFeatureIds: { value: parser.point_global_feature_ids(), size: 1 },
      featureIds: { value: parser.point_feature_ids(), size: 1 },
      numericProps: pointNumericProps,
      properties: Array.from(parser.point_properties()),
    },
    lines: {
      positions: { value: parser.line_positions(), size: 2 },
      pathIndices: { value: parser.line_path_indices(), size: 1 },
      globalFeatureIds: { value: parser.line_global_feature_ids(), size: 1 },
      featureIds: { value: parser.line_feature_ids(), size: 1 },
      numericProps: lineNumericProps,
      properties: Array.from(parser.line_properties()),
    },
    polygons: {
      positions: { value: parser.polygon_positions(), size: 2 },
      polygonIndices: { value: parser.polygon_indices(), size: 1 },
      primitivePolygonIndices: {
        value: parser.primitive_polygon_indices(),
        size: 1,
      },
      globalFeatureIds: { value: parser.polygon_global_feature_ids(), size: 1 },
      featureIds: { value: parser.polygon_feature_ids(), size: 1 },
      numericProps: polygonNumericProps,
      properties: Array.from(parser.polygon_properties()),
    },
  };

  const bboxArr = parser.bbox();
  const bbox: [number, number, number, number] | null =
    bboxArr[0] === Infinity
      ? null
      : [bboxArr[0], bboxArr[1], bboxArr[2], bboxArr[3]];

  const stats: ParseStats = {
    featureCount: parser.feature_count(),
    vertexCount: parser.vertex_count(),
    geometryTypes: parser.geometry_types(),
    bbox,
  };

  return { binary, stats };
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
  for (const v of Object.values(binary.points.numericProps)) addTypedArray(v);

  // Lines
  addTypedArray(binary.lines.positions);
  addTypedArray(binary.lines.pathIndices);
  addTypedArray(binary.lines.globalFeatureIds);
  addTypedArray(binary.lines.featureIds);
  for (const v of Object.values(binary.lines.numericProps)) addTypedArray(v);

  // Polygons
  addTypedArray(binary.polygons.positions);
  addTypedArray(binary.polygons.polygonIndices);
  addTypedArray(binary.polygons.primitivePolygonIndices);
  addTypedArray(binary.polygons.globalFeatureIds);
  addTypedArray(binary.polygons.featureIds);
  for (const v of Object.values(binary.polygons.numericProps)) addTypedArray(v);

  return buffers;
}
