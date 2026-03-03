mod binary;
mod feature;
mod scanner;
mod spatial;
mod winding;

use js_sys::{Float64Array, Uint32Array};
use wasm_bindgen::prelude::*;

use binary::BinaryBuilder;
use scanner::Scanner;

/// Main WASM API. Create with `new()`, push chunks, finalize, then use
/// viewport-based rendering. Properties are loaded lazily via File.slice()
/// using the file offsets stored per feature.
#[wasm_bindgen]
pub struct GeoParser {
    scanner: Scanner,
    builder: BinaryBuilder,
    feature_count: u32,
}

#[wasm_bindgen]
impl GeoParser {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GeoParser {
        console_error_panic_hook::set_once();
        GeoParser {
            scanner: Scanner::new(),
            builder: BinaryBuilder::new(),
            feature_count: 0,
        }
    }

    /// Create a parser in line-delimited mode (.geojsonl / .ndjson / .jsonl).
    /// Each top-level `{...}` object is treated as a standalone Feature.
    pub fn new_line_delimited() -> GeoParser {
        console_error_panic_hook::set_once();
        GeoParser {
            scanner: Scanner::new_line_delimited(),
            builder: BinaryBuilder::new(),
            feature_count: 0,
        }
    }

    /// Push a file chunk (Uint8Array from ReadableStream). Returns features parsed in this chunk.
    pub fn push_chunk(&mut self, chunk: &[u8]) -> u32 {
        let builder = &mut self.builder;
        let fc = &mut self.feature_count;

        self.scanner.push_chunk(chunk, |feature_bytes, file_offset| {
            match feature::parse_feature(feature_bytes) {
                Ok(parsed) => {
                    builder.add_feature(&parsed, file_offset, feature_bytes.len() as u32);
                    *fc += 1;
                }
                Err(_) => { /* skip malformed features */ }
            }
        })
    }

    /// Call after all chunks. Adds sentinel values to index arrays.
    pub fn finalize(&mut self) -> u32 {
        self.builder.finalize();
        self.feature_count
    }

    // ── Feature property offset lookup ──────────────────────────

    /// Get the file byte offset and length of a feature's JSON bytes.
    /// Returns a Float64Array [offset, length] (f64 to safely represent u64 up to 2^53).
    /// The worker uses this with File.slice(offset, offset+length) to re-read properties.
    pub fn get_feature_offset(&self, feature_index: u32) -> Float64Array {
        let idx = feature_index as usize;
        let arr = Float64Array::new_with_length(2);
        if idx < self.builder.feature_file_offsets.len() {
            arr.set_index(0, self.builder.feature_file_offsets[idx] as f64);
            arr.set_index(1, self.builder.feature_byte_lengths[idx] as f64);
        }
        arr
    }

    // ── Stats ──────────────────────────────────────────────────

    pub fn feature_count(&self) -> u32 {
        self.feature_count
    }

    pub fn vertex_count(&self) -> u32 {
        self.builder.total_vertices
    }

    pub fn geometry_types(&self) -> String {
        self.builder.geometry_types_string()
    }

    pub fn bbox(&self) -> Float64Array {
        vec_to_f64_array(&self.builder.bbox.to_vec())
    }

    // ── Viewport-filtered rendering ─────────────────────────────

    /// Build viewport-filtered binary arrays. Returns visible feature count.
    /// `min_extent`: LOD threshold in degrees — non-point features smaller than this are skipped.
    pub fn build_viewport(
        &mut self,
        min_lng: f64,
        min_lat: f64,
        max_lng: f64,
        max_lat: f64,
        min_extent: f64,
    ) -> u32 {
        self.builder.build_viewport(min_lng, min_lat, max_lng, max_lat, min_extent)
    }

    pub fn vp_point_positions(&self) -> Float64Array {
        vec_to_f64_array(&self.builder.vp_point_positions)
    }

    pub fn vp_point_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.vp_point_feature_ids)
    }

    pub fn vp_point_global_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.vp_point_global_feature_ids)
    }

    pub fn vp_line_positions(&self) -> Float64Array {
        vec_to_f64_array(&self.builder.vp_line_positions)
    }

    pub fn vp_line_path_indices(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.vp_line_path_indices)
    }

    pub fn vp_line_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.vp_line_feature_ids)
    }

    pub fn vp_line_global_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.vp_line_global_feature_ids)
    }

    pub fn vp_polygon_positions(&self) -> Float64Array {
        vec_to_f64_array(&self.builder.vp_polygon_positions)
    }

    pub fn vp_polygon_indices(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.vp_polygon_indices)
    }

    pub fn vp_primitive_polygon_indices(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.vp_primitive_polygon_indices)
    }

    pub fn vp_polygon_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.vp_polygon_feature_ids)
    }

    pub fn vp_polygon_global_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.vp_polygon_global_feature_ids)
    }

    pub fn vp_feature_count(&self) -> u32 {
        self.builder.vp_feature_count
    }
}

// ── Helper functions ──────────────────────────────────────────

fn vec_to_f64_array(data: &[f64]) -> Float64Array {
    let arr = Float64Array::new_with_length(data.len() as u32);
    arr.copy_from(data);
    arr
}

fn vec_to_u32_array(data: &[u32]) -> Uint32Array {
    let arr = Uint32Array::new_with_length(data.len() as u32);
    arr.copy_from(data);
    arr
}
