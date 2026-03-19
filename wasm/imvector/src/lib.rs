use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

mod bilateral;
mod classify;
mod quantize;
mod shapes;
mod trace;
mod tv_denoise;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessSettings {
    /// Number of colors for quantization. 0 = auto-detect.
    #[serde(default)]
    pub quantize_colors: u32,
    /// Whether to run bilateral + TV-Chambolle denoising.
    #[serde(default = "default_true")]
    pub denoise: bool,
    /// Whether to run shape detection on output SVGs.
    #[serde(default = "default_true")]
    pub detect_shapes: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Timings {
    classify_ms: f64,
    bilateral_ms: f64,
    tv_denoise_ms: f64,
    quantize_ms: f64,
    trace_ms: f64,
    shapes_ms: f64,
    total_ms: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PresetResult {
    name: String,
    svg: String,
    trace_ms: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcessResult {
    svgs: Vec<PresetResult>,
    timings: Timings,
    classification: classify::Classification,
    quantized_colors: u32,
}

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Classify an image from RGBA pixel data.
/// Returns JSON: { imageType, hasAlpha, colorCount, edgeDensity, ... }
#[wasm_bindgen]
pub fn classify_image(pixels: &[u8], w: u32, h: u32) -> String {
    let result = classify::classify(pixels, w, h);
    serde_json::to_string(&result).unwrap_or_default()
}

/// Full processing pipeline: classify → denoise → quantize → trace × 4 → shapes.
/// Returns JSON: { svgs: [...], timings: {...}, classification: {...} }
#[wasm_bindgen]
pub fn process(pixels: &[u8], w: u32, h: u32, settings_json: &str) -> String {
    let total_start = js_sys::Date::now();

    let settings: ProcessSettings =
        serde_json::from_str(settings_json).unwrap_or(ProcessSettings {
            quantize_colors: 0,
            denoise: true,
            detect_shapes: true,
        });

    // 1. Classify
    let t0 = js_sys::Date::now();
    let classification = classify::classify(pixels, w, h);
    let classify_ms = js_sys::Date::now() - t0;

    // Work on a mutable copy of pixels
    let mut working_pixels = pixels.to_vec();

    // 2. Denoise: photos get TV-Chambolle, non-photos get bilateral. ONE or the other.
    let t0 = js_sys::Date::now();
    let mut bilateral_ms = 0.0;
    let mut tv_denoise_ms = 0.0;
    if settings.denoise {
        if classification.image_type == "photo" {
            // Photos: TV-Chambolle denoising (handles JPEG artifacts)
            let t1 = js_sys::Date::now();
            tv_denoise::tv_chambolle_inplace(&mut working_pixels, w, h, 0.1, 200);
            tv_denoise_ms = js_sys::Date::now() - t1;
        } else {
            // Non-photos: bilateral filter (matching Python ai.denoise._denoise_graphic)
            // d=9, sigma_color=60, sigma_space=60
            let t1 = js_sys::Date::now();
            bilateral::bilateral_filter_inplace(&mut working_pixels, w, h, 9, 60.0, 60.0);
            bilateral_ms = js_sys::Date::now() - t1;
        }
    }
    let _denoise_total = js_sys::Date::now() - t0;

    // 3. Color quantization
    // Auto-quantize only for simple/logo/icon images (matching Python preprocess.py).
    // Photos and complex illustrations skip auto-quantization — VTracer handles their colors.
    let t0 = js_sys::Date::now();
    let mut quantized_colors = 0u32;
    let auto_quantize_eligible = classification.is_simple
        || classification.image_type == "logo"
        || classification.image_type == "icon"
        || classification.image_type == "pixel_art";
    if settings.quantize_colors > 0 {
        // User explicitly requested N colors — always honor it
        quantize::quantize_inplace(&mut working_pixels, w, h, settings.quantize_colors);
        quantized_colors = settings.quantize_colors;
    } else if auto_quantize_eligible {
        let dominant_k = quantize::estimate_dominant_colors(&working_pixels, w, h);
        if dominant_k > 0 && dominant_k <= 12 {
            quantize::quantize_inplace(&mut working_pixels, w, h, dominant_k);
            quantized_colors = dominant_k;
        }
    }
    let quantize_ms = js_sys::Date::now() - t0;

    // 5. Trace all 4 presets
    let t0 = js_sys::Date::now();
    let trace_results = trace::trace_all_presets(&working_pixels, w, h);
    let trace_ms = js_sys::Date::now() - t0;

    // 6. Shape detection
    let t0 = js_sys::Date::now();
    let svgs: Vec<PresetResult> = trace_results
        .into_iter()
        .map(|(name, svg, trace_time)| {
            let final_svg = if settings.detect_shapes {
                shapes::detect_and_replace_shapes(&svg)
            } else {
                svg
            };
            PresetResult {
                name: name.to_string(),
                svg: final_svg,
                trace_ms: trace_time,
            }
        })
        .collect();
    let shapes_ms = js_sys::Date::now() - t0;

    let total_ms = js_sys::Date::now() - total_start;

    let result = ProcessResult {
        svgs,
        timings: Timings {
            classify_ms,
            bilateral_ms,
            tv_denoise_ms,
            quantize_ms,
            trace_ms,
            shapes_ms,
            total_ms,
        },
        classification,
        quantized_colors,
    };

    serde_json::to_string(&result).unwrap_or_default()
}

/// Debug pipeline: same as process() but returns intermediate RGBA pixel buffers
/// after each stage. Only use in development.
#[wasm_bindgen]
pub fn process_debug(pixels: &[u8], w: u32, h: u32, settings_json: &str) -> String {
    let settings: ProcessSettings =
        serde_json::from_str(settings_json).unwrap_or(ProcessSettings {
            quantize_colors: 0,
            denoise: true,
            detect_shapes: true,
        });

    let classification = classify::classify(pixels, w, h);

    let mut working_pixels = pixels.to_vec();
    let mut stage_names: Vec<String> = Vec::new();
    let mut stage_pixels: Vec<Vec<u8>> = Vec::new();

    // Stage 0: input
    stage_names.push("0_input".into());
    stage_pixels.push(working_pixels.clone());

    // Stage 1: denoise (bilateral OR TV-Chambolle, not both)
    if settings.denoise {
        if classification.image_type == "photo" {
            tv_denoise::tv_chambolle_inplace(&mut working_pixels, w, h, 0.1, 200);
            stage_names.push("1_tv_denoise".into());
        } else {
            bilateral::bilateral_filter_inplace(&mut working_pixels, w, h, 9, 60.0, 60.0);
            stage_names.push("1_bilateral".into());
        }
    } else {
        stage_names.push("1_denoise_skipped".into());
    }
    stage_pixels.push(working_pixels.clone());

    // Stage 2: quantize (only for simple/logo/icon/pixel_art)
    let mut quantized_colors = 0u32;
    let auto_quantize_eligible = classification.is_simple
        || classification.image_type == "logo"
        || classification.image_type == "icon"
        || classification.image_type == "pixel_art";
    if settings.quantize_colors > 0 {
        quantize::quantize_inplace(&mut working_pixels, w, h, settings.quantize_colors);
        quantized_colors = settings.quantize_colors;
    } else if auto_quantize_eligible {
        let dominant_k = quantize::estimate_dominant_colors(&working_pixels, w, h);
        if dominant_k > 0 && dominant_k <= 12 {
            quantize::quantize_inplace(&mut working_pixels, w, h, dominant_k);
            quantized_colors = dominant_k;
        }
    }
    stage_names.push(format!("2_quantize_k{}", quantized_colors));
    stage_pixels.push(working_pixels.clone());

    // Stage 4: trace (standard preset only for debug speed)
    let presets = trace::preset_configs();
    let standard = &presets[1].1;
    let svg = trace::trace_with_preset(&working_pixels, w, h, standard);
    let final_svg = if settings.detect_shapes {
        shapes::detect_and_replace_shapes(&svg)
    } else {
        svg
    };

    // Build JSON with stages metadata; pixel data returned separately via get_debug_pixels
    // Store in a global for retrieval
    unsafe {
        DEBUG_STAGE_NAMES = Some(stage_names.clone());
        DEBUG_STAGE_PIXELS = Some(stage_pixels);
        DEBUG_W = w;
        DEBUG_H = h;
    }

    let stages_meta: Vec<serde_json::Value> = stage_names.iter().map(|n| {
        serde_json::json!({ "name": n })
    }).collect();

    serde_json::json!({
        "stages": stages_meta,
        "width": w,
        "height": h,
        "svg": final_svg,
        "classification": classification,
        "quantizedColors": quantized_colors,
    }).to_string()
}

static mut DEBUG_STAGE_NAMES: Option<Vec<String>> = None;
static mut DEBUG_STAGE_PIXELS: Option<Vec<Vec<u8>>> = None;
static mut DEBUG_W: u32 = 0;
static mut DEBUG_H: u32 = 0;

/// Get debug stage pixels by index. Returns RGBA bytes.
#[wasm_bindgen]
pub fn get_debug_stage_pixels(index: u32) -> Vec<u8> {
    unsafe {
        if let Some(ref stages) = DEBUG_STAGE_PIXELS {
            if let Some(pixels) = stages.get(index as usize) {
                return pixels.clone();
            }
        }
    }
    Vec::new()
}

/// Get the number of debug stages stored.
#[wasm_bindgen]
pub fn get_debug_stage_count() -> u32 {
    unsafe {
        DEBUG_STAGE_PIXELS.as_ref().map(|s| s.len() as u32).unwrap_or(0)
    }
}

/// Free debug stage memory.
#[wasm_bindgen]
pub fn free_debug_stages() {
    unsafe {
        DEBUG_STAGE_NAMES = None;
        DEBUG_STAGE_PIXELS = None;
    }
}
