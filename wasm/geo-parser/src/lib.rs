mod binary;
mod feature;
mod properties;
mod scanner;
mod winding;

use js_sys::{Array, Float64Array, Uint32Array};
use wasm_bindgen::prelude::*;

use binary::BinaryBuilder;
use scanner::Scanner;

/// Main WASM API. Create with `new()`, push chunks, finalize, then read typed arrays.
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

    /// Push a file chunk (Uint8Array from ReadableStream). Returns features parsed in this chunk.
    pub fn push_chunk(&mut self, chunk: &[u8]) -> u32 {
        let builder = &mut self.builder;
        let fc = &mut self.feature_count;

        self.scanner.push_chunk(chunk, |feature_bytes| {
            match feature::parse_feature(feature_bytes) {
                Ok(parsed) => {
                    builder.add_feature(&parsed);
                    *fc += 1;
                }
                Err(_) => { /* skip malformed features */ }
            }
        })
    }

    /// Call after all chunks. Adds sentinel values to index arrays and finalizes properties.
    pub fn finalize(&mut self) -> u32 {
        self.builder.finalize();
        self.feature_count
    }

    // ── Typed array getters ─────────────────────────────────────

    pub fn point_positions(&self) -> Float64Array {
        vec_to_f64_array(&self.builder.point_positions)
    }

    pub fn point_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.point_feature_ids)
    }

    pub fn point_global_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.point_global_feature_ids)
    }

    pub fn line_positions(&self) -> Float64Array {
        vec_to_f64_array(&self.builder.line_positions)
    }

    pub fn line_path_indices(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.line_path_indices)
    }

    pub fn line_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.line_feature_ids)
    }

    pub fn line_global_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.line_global_feature_ids)
    }

    pub fn polygon_positions(&self) -> Float64Array {
        vec_to_f64_array(&self.builder.polygon_positions)
    }

    pub fn polygon_indices(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.polygon_indices)
    }

    pub fn primitive_polygon_indices(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.primitive_polygon_indices)
    }

    pub fn polygon_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.polygon_feature_ids)
    }

    pub fn polygon_global_feature_ids(&self) -> Uint32Array {
        vec_to_u32_array(&self.builder.polygon_global_feature_ids)
    }

    // ── Properties ─────────────────────────────────────────────

    /// Get names of numeric properties (sorted).
    pub fn numeric_prop_names(&self) -> Array {
        let names = self.builder.property_store.numeric_property_names();
        let arr = Array::new();
        for name in &names {
            arr.push(&JsValue::from_str(name));
        }
        arr
    }

    /// Get numeric property column for points.
    pub fn numeric_prop_points(&self, name: &str) -> Float64Array {
        match self.builder.property_store.point_numerics.get(name) {
            Some(v) => vec_to_f64_array(v),
            None => Float64Array::new_with_length(0),
        }
    }

    /// Get numeric property column for lines.
    pub fn numeric_prop_lines(&self, name: &str) -> Float64Array {
        match self.builder.property_store.line_numerics.get(name) {
            Some(v) => vec_to_f64_array(v),
            None => Float64Array::new_with_length(0),
        }
    }

    /// Get numeric property column for polygons.
    pub fn numeric_prop_polygons(&self, name: &str) -> Float64Array {
        match self.builder.property_store.polygon_numerics.get(name) {
            Some(v) => vec_to_f64_array(v),
            None => Float64Array::new_with_length(0),
        }
    }

    /// Get per-feature property objects for points (JSON strings parsed to JS objects).
    pub fn point_properties(&self) -> Array {
        props_to_array(&self.builder.point_properties)
    }

    /// Get per-feature property objects for lines.
    pub fn line_properties(&self) -> Array {
        props_to_array(&self.builder.line_properties)
    }

    /// Get per-feature property objects for polygons.
    pub fn polygon_properties(&self) -> Array {
        props_to_array(&self.builder.polygon_properties)
    }

    /// Get properties for a specific feature by global index (for lazy sidebar loading).
    pub fn get_properties(&self, feature_index: u32) -> JsValue {
        let idx = feature_index as usize;
        if idx < self.builder.all_feature_props.len() {
            let json = &self.builder.all_feature_props[idx];
            match js_sys::JSON::parse(json) {
                Ok(val) => val,
                Err(_) => JsValue::NULL,
            }
        } else {
            JsValue::NULL
        }
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

fn props_to_array(json_strings: &[String]) -> Array {
    let arr = Array::new();
    for json in json_strings {
        match js_sys::JSON::parse(json) {
            Ok(val) => { arr.push(&val); }
            Err(_) => { arr.push(&JsValue::NULL); }
        }
    }
    arr
}
