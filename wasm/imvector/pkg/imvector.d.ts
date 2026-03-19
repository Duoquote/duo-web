/* tslint:disable */
/* eslint-disable */

/**
 * Classify an image from RGBA pixel data.
 * Returns JSON: { imageType, hasAlpha, colorCount, edgeDensity, ... }
 */
export function classify_image(pixels: Uint8Array, w: number, h: number): string;

/**
 * Free debug stage memory.
 */
export function free_debug_stages(): void;

/**
 * Get the number of debug stages stored.
 */
export function get_debug_stage_count(): number;

/**
 * Get debug stage pixels by index. Returns RGBA bytes.
 */
export function get_debug_stage_pixels(index: number): Uint8Array;

export function init(): void;

/**
 * Full processing pipeline: classify → denoise → quantize → trace × 4 → shapes.
 * Returns JSON: { svgs: [...], timings: {...}, classification: {...} }
 */
export function process(pixels: Uint8Array, w: number, h: number, settings_json: string): string;

/**
 * Debug pipeline: same as process() but returns intermediate RGBA pixel buffers
 * after each stage. Only use in development.
 */
export function process_debug(pixels: Uint8Array, w: number, h: number, settings_json: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly classify_image: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly free_debug_stages: () => void;
    readonly get_debug_stage_count: () => number;
    readonly get_debug_stage_pixels: (a: number, b: number) => void;
    readonly init: () => void;
    readonly process: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly process_debug: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly __wbindgen_export: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_start: () => void;
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
