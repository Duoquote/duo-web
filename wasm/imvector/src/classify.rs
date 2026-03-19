use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Classification {
    pub image_type: String,
    pub has_alpha: bool,
    pub color_count: u32,
    pub edge_density: f32,
    pub width: u32,
    pub height: u32,
    pub is_grayscale: bool,
    pub is_simple: bool,
    pub needs_denoise: bool,
}

/// Estimate number of distinct colors by quantizing to 5-bit per channel.
/// Samples up to 10,000 pixels.
fn estimate_color_count(pixels: &[u8], w: u32, h: u32) -> u32 {
    let total_pixels = (w * h) as usize;
    let sample_size = total_pixels.min(10_000);
    let step = if total_pixels > sample_size {
        total_pixels / sample_size
    } else {
        1
    };

    let mut seen = std::collections::HashSet::new();
    let mut i = 0;
    while i < total_pixels {
        let off = i * 4;
        if off + 2 < pixels.len() {
            let r = (pixels[off] >> 3) as u32;
            let g = (pixels[off + 1] >> 3) as u32;
            let b = (pixels[off + 2] >> 3) as u32;
            seen.insert((r << 10) | (g << 5) | b);
        }
        i += step;
    }
    seen.len() as u32
}

/// Detect if image has meaningful alpha (non-255 values).
fn detect_alpha(pixels: &[u8], total_pixels: usize) -> bool {
    let step = if total_pixels > 5000 {
        total_pixels / 5000
    } else {
        1
    };
    let mut i = 0;
    while i < total_pixels {
        if pixels[i * 4 + 3] < 250 {
            return true;
        }
        i += step;
    }
    false
}

/// Detect if image is grayscale (R ≈ G ≈ B within tolerance 5).
fn detect_grayscale(pixels: &[u8], total_pixels: usize) -> bool {
    let step = if total_pixels > 5000 {
        total_pixels / 5000
    } else {
        1
    };
    let mut i = 0;
    while i < total_pixels {
        let off = i * 4;
        let r = pixels[off] as i16;
        let g = pixels[off + 1] as i16;
        let b = pixels[off + 2] as i16;
        if (r - g).abs() > 5 || (g - b).abs() > 5 {
            return false;
        }
        i += step;
    }
    true
}

/// Compute edge density using a simple Sobel-like operator.
fn compute_edge_density(pixels: &[u8], w: u32, h: u32) -> f32 {
    let w = w as usize;
    let h = h as usize;
    if w < 3 || h < 3 {
        return 0.0;
    }

    // Convert to grayscale luminance
    let mut gray = vec![0u8; w * h];
    for y in 0..h {
        for x in 0..w {
            let off = (y * w + x) * 4;
            let r = pixels[off] as f32;
            let g = pixels[off + 1] as f32;
            let b = pixels[off + 2] as f32;
            gray[y * w + x] = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        }
    }

    // Sobel edge detection
    let threshold: f32 = 30.0;
    let mut edge_count: u32 = 0;
    let total = ((h - 2) * (w - 2)) as f32;

    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let tl = gray[(y - 1) * w + x - 1] as f32;
            let tc = gray[(y - 1) * w + x] as f32;
            let tr = gray[(y - 1) * w + x + 1] as f32;
            let ml = gray[y * w + x - 1] as f32;
            let mr = gray[y * w + x + 1] as f32;
            let bl = gray[(y + 1) * w + x - 1] as f32;
            let bc = gray[(y + 1) * w + x] as f32;
            let br = gray[(y + 1) * w + x + 1] as f32;

            let gx = -tl + tr - 2.0 * ml + 2.0 * mr - bl + br;
            let gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
            let mag = (gx * gx + gy * gy).sqrt();

            if mag > threshold {
                edge_count += 1;
            }
        }
    }

    if total > 0.0 {
        edge_count as f32 / total
    } else {
        0.0
    }
}

/// Classify an image based on its pixel data.
pub fn classify(pixels: &[u8], w: u32, h: u32) -> Classification {
    let total_pixels = (w * h) as usize;
    let color_count = estimate_color_count(pixels, w, h);
    let has_alpha = detect_alpha(pixels, total_pixels);
    let is_grayscale = detect_grayscale(pixels, total_pixels);
    let edge_density = compute_edge_density(pixels, w, h);
    let max_dim = w.max(h);

    let image_type = if color_count <= 16 && max_dim <= 128 {
        "pixel_art"
    } else if color_count <= 64 && has_alpha && max_dim <= 256 {
        "icon"
    } else if color_count <= 64 {
        "logo"
    } else if color_count <= 512 && edge_density < 0.12 {
        "illustration"
    } else if color_count > 512 {
        "photo"
    } else {
        "unknown"
    };

    let is_simple = color_count <= 32 && edge_density < 0.15;
    let needs_denoise = image_type == "photo";

    Classification {
        image_type: image_type.to_string(),
        has_alpha,
        color_count,
        edge_density,
        width: w,
        height: h,
        is_grayscale,
        is_simple,
        needs_denoise,
    }
}
