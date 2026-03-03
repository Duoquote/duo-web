/* tslint:disable */
/* eslint-disable */

/**
 * Main WASM API. Create with `new()`, push chunks, finalize, then read typed arrays.
 */
export class GeoParser {
    free(): void;
    [Symbol.dispose](): void;
    bbox(): Float64Array;
    feature_count(): number;
    /**
     * Call after all chunks. Adds sentinel values to index arrays and finalizes properties.
     */
    finalize(): number;
    geometry_types(): string;
    /**
     * Get properties for a specific feature by global index (for lazy sidebar loading).
     */
    get_properties(feature_index: number): any;
    line_feature_ids(): Uint32Array;
    line_global_feature_ids(): Uint32Array;
    line_path_indices(): Uint32Array;
    line_positions(): Float64Array;
    /**
     * Get per-feature property objects for lines.
     */
    line_properties(): Array<any>;
    constructor();
    /**
     * Get numeric property column for lines.
     */
    numeric_prop_lines(name: string): Float64Array;
    /**
     * Get names of numeric properties (sorted).
     */
    numeric_prop_names(): Array<any>;
    /**
     * Get numeric property column for points.
     */
    numeric_prop_points(name: string): Float64Array;
    /**
     * Get numeric property column for polygons.
     */
    numeric_prop_polygons(name: string): Float64Array;
    point_feature_ids(): Uint32Array;
    point_global_feature_ids(): Uint32Array;
    point_positions(): Float64Array;
    /**
     * Get per-feature property objects for points (JSON strings parsed to JS objects).
     */
    point_properties(): Array<any>;
    polygon_feature_ids(): Uint32Array;
    polygon_global_feature_ids(): Uint32Array;
    polygon_indices(): Uint32Array;
    polygon_positions(): Float64Array;
    /**
     * Get per-feature property objects for polygons.
     */
    polygon_properties(): Array<any>;
    primitive_polygon_indices(): Uint32Array;
    /**
     * Push a file chunk (Uint8Array from ReadableStream). Returns features parsed in this chunk.
     */
    push_chunk(chunk: Uint8Array): number;
    vertex_count(): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_geoparser_free: (a: number, b: number) => void;
    readonly geoparser_bbox: (a: number) => number;
    readonly geoparser_feature_count: (a: number) => number;
    readonly geoparser_finalize: (a: number) => number;
    readonly geoparser_geometry_types: (a: number, b: number) => void;
    readonly geoparser_get_properties: (a: number, b: number) => number;
    readonly geoparser_line_feature_ids: (a: number) => number;
    readonly geoparser_line_global_feature_ids: (a: number) => number;
    readonly geoparser_line_path_indices: (a: number) => number;
    readonly geoparser_line_positions: (a: number) => number;
    readonly geoparser_line_properties: (a: number) => number;
    readonly geoparser_new: () => number;
    readonly geoparser_numeric_prop_lines: (a: number, b: number, c: number) => number;
    readonly geoparser_numeric_prop_names: (a: number) => number;
    readonly geoparser_numeric_prop_points: (a: number, b: number, c: number) => number;
    readonly geoparser_numeric_prop_polygons: (a: number, b: number, c: number) => number;
    readonly geoparser_point_feature_ids: (a: number) => number;
    readonly geoparser_point_global_feature_ids: (a: number) => number;
    readonly geoparser_point_positions: (a: number) => number;
    readonly geoparser_point_properties: (a: number) => number;
    readonly geoparser_polygon_feature_ids: (a: number) => number;
    readonly geoparser_polygon_global_feature_ids: (a: number) => number;
    readonly geoparser_polygon_indices: (a: number) => number;
    readonly geoparser_polygon_positions: (a: number) => number;
    readonly geoparser_polygon_properties: (a: number) => number;
    readonly geoparser_primitive_polygon_indices: (a: number) => number;
    readonly geoparser_push_chunk: (a: number, b: number, c: number) => number;
    readonly geoparser_vertex_count: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export2: (a: number) => void;
    readonly __wbindgen_export3: (a: number, b: number) => number;
    readonly __wbindgen_export4: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
