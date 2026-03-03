/* tslint:disable */
/* eslint-disable */

/**
 * Main WASM API. Create with `new()`, push chunks, finalize, then use
 * viewport-based rendering. Properties are loaded lazily via File.slice()
 * using the file offsets stored per feature.
 */
export class GeoParser {
    free(): void;
    [Symbol.dispose](): void;
    bbox(): Float64Array;
    /**
     * Build viewport-filtered binary arrays. Returns visible feature count.
     * `min_extent`: LOD threshold in degrees — non-point features smaller than this are skipped.
     */
    build_viewport(min_lng: number, min_lat: number, max_lng: number, max_lat: number, min_extent: number): number;
    feature_count(): number;
    /**
     * Call after all chunks. Adds sentinel values to index arrays.
     */
    finalize(): number;
    geometry_types(): string;
    /**
     * Get the file byte offset and length of a feature's JSON bytes.
     * Returns a Float64Array [offset, length] (f64 to safely represent u64 up to 2^53).
     * The worker uses this with File.slice(offset, offset+length) to re-read properties.
     */
    get_feature_offset(feature_index: number): Float64Array;
    constructor();
    /**
     * Create a parser in line-delimited mode (.geojsonl / .ndjson / .jsonl).
     * Each top-level `{...}` object is treated as a standalone Feature.
     */
    static new_line_delimited(): GeoParser;
    /**
     * Push a file chunk (Uint8Array from ReadableStream). Returns features parsed in this chunk.
     */
    push_chunk(chunk: Uint8Array): number;
    vertex_count(): number;
    vp_feature_count(): number;
    vp_line_feature_ids(): Uint32Array;
    vp_line_global_feature_ids(): Uint32Array;
    vp_line_path_indices(): Uint32Array;
    vp_line_positions(): Float64Array;
    vp_point_feature_ids(): Uint32Array;
    vp_point_global_feature_ids(): Uint32Array;
    vp_point_positions(): Float64Array;
    vp_polygon_feature_ids(): Uint32Array;
    vp_polygon_global_feature_ids(): Uint32Array;
    vp_polygon_indices(): Uint32Array;
    vp_polygon_positions(): Float64Array;
    vp_primitive_polygon_indices(): Uint32Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_geoparser_free: (a: number, b: number) => void;
    readonly geoparser_bbox: (a: number) => number;
    readonly geoparser_build_viewport: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly geoparser_feature_count: (a: number) => number;
    readonly geoparser_finalize: (a: number) => number;
    readonly geoparser_geometry_types: (a: number, b: number) => void;
    readonly geoparser_get_feature_offset: (a: number, b: number) => number;
    readonly geoparser_new: () => number;
    readonly geoparser_new_line_delimited: () => number;
    readonly geoparser_push_chunk: (a: number, b: number, c: number) => number;
    readonly geoparser_vertex_count: (a: number) => number;
    readonly geoparser_vp_feature_count: (a: number) => number;
    readonly geoparser_vp_line_feature_ids: (a: number) => number;
    readonly geoparser_vp_line_global_feature_ids: (a: number) => number;
    readonly geoparser_vp_line_path_indices: (a: number) => number;
    readonly geoparser_vp_line_positions: (a: number) => number;
    readonly geoparser_vp_point_feature_ids: (a: number) => number;
    readonly geoparser_vp_point_global_feature_ids: (a: number) => number;
    readonly geoparser_vp_point_positions: (a: number) => number;
    readonly geoparser_vp_polygon_feature_ids: (a: number) => number;
    readonly geoparser_vp_polygon_global_feature_ids: (a: number) => number;
    readonly geoparser_vp_polygon_indices: (a: number) => number;
    readonly geoparser_vp_polygon_positions: (a: number) => number;
    readonly geoparser_vp_primitive_polygon_indices: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
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
