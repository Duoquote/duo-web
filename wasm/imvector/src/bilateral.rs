/// Bilateral filter: edge-preserving smoothing.
/// Port of cv2.bilateralFilter(rgb, d=7, sigma_color=50, sigma_space=50).
///
/// Operates on RGBA pixels in-place (alpha channel is preserved unchanged).
pub fn bilateral_filter_inplace(
    pixels: &mut [u8],
    w: u32,
    h: u32,
    d: i32,
    sigma_color: f64,
    sigma_space: f64,
) {
    let w = w as usize;
    let h = h as usize;
    let radius = d / 2;

    // Pre-compute spatial weight kernel
    let kernel_size = (2 * radius + 1) as usize;
    let mut spatial_weights = vec![0.0f64; kernel_size * kernel_size];
    let space_coeff = -0.5 / (sigma_space * sigma_space);

    for dy in 0..kernel_size {
        for dx in 0..kernel_size {
            let fy = dy as f64 - radius as f64;
            let fx = dx as f64 - radius as f64;
            spatial_weights[dy * kernel_size + dx] = (space_coeff * (fx * fx + fy * fy)).exp();
        }
    }

    let color_coeff = -0.5 / (sigma_color * sigma_color);

    // Work on a copy to read from while writing
    let src = pixels.to_vec();

    for y in 0..h {
        for x in 0..w {
            let center_off = (y * w + x) * 4;
            let cr = src[center_off] as f64;
            let cg = src[center_off + 1] as f64;
            let cb = src[center_off + 2] as f64;

            let mut sum_r = 0.0f64;
            let mut sum_g = 0.0f64;
            let mut sum_b = 0.0f64;
            let mut sum_w = 0.0f64;

            for ky in 0..kernel_size {
                let ny = y as i32 + ky as i32 - radius;
                if ny < 0 || ny >= h as i32 {
                    continue;
                }
                for kx in 0..kernel_size {
                    let nx = x as i32 + kx as i32 - radius;
                    if nx < 0 || nx >= w as i32 {
                        continue;
                    }

                    let n_off = (ny as usize * w + nx as usize) * 4;
                    let nr = src[n_off] as f64;
                    let ng = src[n_off + 1] as f64;
                    let nb = src[n_off + 2] as f64;

                    let color_dist = (nr - cr).powi(2) + (ng - cg).powi(2) + (nb - cb).powi(2);
                    let color_weight = (color_coeff * color_dist).exp();
                    let weight = spatial_weights[ky * kernel_size + kx] * color_weight;

                    sum_r += nr * weight;
                    sum_g += ng * weight;
                    sum_b += nb * weight;
                    sum_w += weight;
                }
            }

            if sum_w > 0.0 {
                pixels[center_off] = (sum_r / sum_w).round().clamp(0.0, 255.0) as u8;
                pixels[center_off + 1] = (sum_g / sum_w).round().clamp(0.0, 255.0) as u8;
                pixels[center_off + 2] = (sum_b / sum_w).round().clamp(0.0, 255.0) as u8;
            }
            // Alpha unchanged
        }
    }
}
