/// TV-Chambolle denoising (Chambolle 2004 projection algorithm).
/// Port of skimage.restoration.denoise_tv_chambolle.
///
/// Operates on RGBA pixels in-place, processing R/G/B channels independently.
/// Alpha channel is preserved unchanged.
pub fn tv_chambolle_inplace(
    pixels: &mut [u8],
    w: u32,
    h: u32,
    weight: f64,
    n_iter: usize,
) {
    let w = w as usize;
    let h = h as usize;
    let n = w * h;
    let tau = 0.25; // Step size (1/4 for 2D)

    // Process each channel independently
    for ch in 0..3u8 {
        // Extract channel as f64
        let mut img: Vec<f64> = (0..n)
            .map(|i| pixels[i * 4 + ch as usize] as f64 / 255.0)
            .collect();

        // Dual variables (px, py)
        let mut px = vec![0.0f64; n];
        let mut py = vec![0.0f64; n];

        for _ in 0..n_iter {
            // Compute divergence of (px, py)
            // div = d_x(px) + d_y(py) using backward differences
            let mut div = vec![0.0f64; n];
            for y in 0..h {
                for x in 0..w {
                    let idx = y * w + x;
                    // d_x(px): backward difference in x
                    let dpx = if x == 0 {
                        px[idx]
                    } else if x == w - 1 {
                        -px[idx - 1]
                    } else {
                        px[idx] - px[idx - 1]
                    };
                    // d_y(py): backward difference in y
                    let dpy = if y == 0 {
                        py[idx]
                    } else if y == h - 1 {
                        -py[idx - w]
                    } else {
                        py[idx] - py[idx - w]
                    };
                    div[idx] = dpx + dpy;
                }
            }

            // Update: u = img + div (denoised estimate)
            // Gradient of u using forward differences
            let u: Vec<f64> = (0..n).map(|i| img[i] + div[i]).collect();

            // Update dual variables with projection
            for y in 0..h {
                for x in 0..w {
                    let idx = y * w + x;
                    // Forward gradient
                    let gx = if x + 1 < w { u[idx + 1] - u[idx] } else { 0.0 };
                    let gy = if y + 1 < h { u[idx + w] - u[idx] } else { 0.0 };

                    // Update dual with step
                    let new_px = px[idx] + tau / weight * gx;
                    let new_py = py[idx] + tau / weight * gy;

                    // Project onto unit ball
                    let norm = (new_px * new_px + new_py * new_py).sqrt().max(1.0);
                    px[idx] = new_px / norm;
                    py[idx] = new_py / norm;
                }
            }

            img = u; // Use updated image for next iteration's gradient
        }

        // Final denoised output: img + div (recompute final divergence)
        let mut div = vec![0.0f64; n];
        for y in 0..h {
            for x in 0..w {
                let idx = y * w + x;
                let dpx = if x == 0 {
                    px[idx]
                } else if x == w - 1 {
                    -px[idx - 1]
                } else {
                    px[idx] - px[idx - 1]
                };
                let dpy = if y == 0 {
                    py[idx]
                } else if y == h - 1 {
                    -py[idx - w]
                } else {
                    py[idx] - py[idx - w]
                };
                div[idx] = dpx + dpy;
            }
        }

        // Write back to pixels
        // Use original image (from pixels) + div for final result
        for i in 0..n {
            let original = pixels[i * 4 + ch as usize] as f64 / 255.0;
            let val = (original + div[i]) * 255.0;
            pixels[i * 4 + ch as usize] = val.round().clamp(0.0, 255.0) as u8;
        }
    }
}
