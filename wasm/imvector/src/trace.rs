use serde::{Deserialize, Serialize};
use visioncortex::PathSimplifyMode;
use vtracer::ColorImage;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetConfig {
    pub color_precision: i32,
    pub layer_difference: i32,
    pub corner_threshold: i32,
    pub length_threshold: f64,
    pub max_iterations: usize,
    pub splice_threshold: i32,
    pub filter_speckle: usize,
    pub path_precision: Option<u32>,
    pub mode: String,
}

pub fn preset_configs() -> [(&'static str, PresetConfig); 4] {
    [
        (
            "draft",
            PresetConfig {
                color_precision: 4,
                layer_difference: 32,
                corner_threshold: 90,
                length_threshold: 8.0,
                max_iterations: 4,
                splice_threshold: 45,
                filter_speckle: 8,
                path_precision: None,
                mode: "polygon".into(),
            },
        ),
        (
            "standard",
            PresetConfig {
                color_precision: 6,
                layer_difference: 16,
                corner_threshold: 60,
                length_threshold: 4.0,
                max_iterations: 10,
                splice_threshold: 45,
                filter_speckle: 4,
                path_precision: None,
                mode: "polygon".into(),
            },
        ),
        (
            "high",
            PresetConfig {
                color_precision: 8,
                layer_difference: 8,
                corner_threshold: 45,
                length_threshold: 2.5,
                max_iterations: 15,
                splice_threshold: 30,
                filter_speckle: 2,
                path_precision: None,
                mode: "spline".into(),
            },
        ),
        (
            "ultra",
            PresetConfig {
                color_precision: 10,
                layer_difference: 4,
                corner_threshold: 30,
                length_threshold: 1.5,
                max_iterations: 20,
                splice_threshold: 20,
                filter_speckle: 1,
                path_precision: Some(10),
                mode: "spline".into(),
            },
        ),
    ]
}

/// Trace pixels with a single preset, returning an SVG string.
pub fn trace_with_preset(pixels: &[u8], w: u32, h: u32, config: &PresetConfig) -> String {
    // Build ColorImage from RGBA pixels
    let img = ColorImage {
        pixels: pixels.to_vec(),
        width: w as usize,
        height: h as usize,
    };

    let params = vtracer::Config {
        color_mode: vtracer::ColorMode::Color,
        hierarchical: vtracer::Hierarchical::Stacked,
        filter_speckle: config.filter_speckle,
        color_precision: config.color_precision.min(8), // VTracer uses 8-color_precision as loss; >8 goes negative
        layer_difference: config.layer_difference,
        mode: if config.mode == "spline" {
            PathSimplifyMode::Spline
        } else {
            PathSimplifyMode::Polygon
        },
        corner_threshold: config.corner_threshold,
        length_threshold: config.length_threshold,
        max_iterations: config.max_iterations,
        splice_threshold: config.splice_threshold,
        path_precision: Some(config.path_precision.unwrap_or(2)),
    };

    match vtracer::convert(img, params) {
        Ok(svg) => svg.to_string(),
        Err(e) => format!("<!-- VTracer error: {} -->", e),
    }
}

/// Trace all 4 presets, returning (name, svg_string) pairs with timing.
pub fn trace_all_presets(pixels: &[u8], w: u32, h: u32) -> Vec<(&'static str, String, f64)> {
    let presets = preset_configs();
    let mut results = Vec::with_capacity(4);

    for (name, config) in &presets {
        let start = js_sys::Date::now();
        let svg = trace_with_preset(pixels, w, h, config);
        let elapsed = js_sys::Date::now() - start;
        results.push((*name, svg, elapsed));
    }

    results
}
