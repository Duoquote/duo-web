/// CIELAB color quantization with k-means++ and Delta-E agglomerative merge.
/// Port of vectorizer/utils/color.py.

/// Convert sRGB [0..255] to CIELAB.
fn rgb_to_lab(r: u8, g: u8, b: u8) -> [f64; 3] {
    // sRGB → linear RGB
    let linearize = |c: u8| -> f64 {
        let v = c as f64 / 255.0;
        if v > 0.04045 {
            ((v + 0.055) / 1.055).powf(2.4)
        } else {
            v / 12.92
        }
    };

    let rl = linearize(r);
    let gl = linearize(g);
    let bl = linearize(b);

    // Linear RGB → XYZ (D65)
    let x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl;
    let y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl;
    let z = 0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl;

    // D65 reference
    let xn = 0.95047;
    let yn = 1.00000;
    let zn = 1.08883;

    let f = |t: f64| -> f64 {
        let delta: f64 = 6.0 / 29.0;
        if t > delta.powi(3) {
            t.cbrt()
        } else {
            t / (3.0 * delta * delta) + 4.0 / 29.0
        }
    };

    let fx = f(x / xn);
    let fy = f(y / yn);
    let fz = f(z / zn);

    let l = 116.0 * fy - 16.0;
    let a = 500.0 * (fx - fy);
    let b_val = 200.0 * (fy - fz);

    [l, a, b_val]
}

/// Convert CIELAB to sRGB [0..255].
fn lab_to_rgb(l: f64, a: f64, b: f64) -> (u8, u8, u8) {
    let fy = (l + 16.0) / 116.0;
    let fx = a / 500.0 + fy;
    let fz = fy - b / 200.0;

    let delta = 6.0 / 29.0;
    let inv_f = |t: f64| -> f64 {
        if t > delta {
            t.powi(3)
        } else {
            3.0 * delta * delta * (t - 4.0 / 29.0)
        }
    };

    let xn = 0.95047;
    let yn = 1.00000;
    let zn = 1.08883;

    let x = xn * inv_f(fx);
    let y = yn * inv_f(fy);
    let z = zn * inv_f(fz);

    // XYZ → linear RGB
    let rl = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    let gl = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
    let bl = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

    // Linear → sRGB
    let gamma = |v: f64| -> u8 {
        let clamped = v.clamp(0.0, 1.0);
        let s = if clamped > 0.0031308 {
            1.055 * clamped.powf(1.0 / 2.4) - 0.055
        } else {
            12.92 * clamped
        };
        (s * 255.0).round().clamp(0.0, 255.0) as u8
    };

    (gamma(rl), gamma(gl), gamma(bl))
}

/// Delta-E (CIE76): Euclidean distance in LAB space.
fn delta_e(a: &[f64; 3], b: &[f64; 3]) -> f64 {
    let dl = a[0] - b[0];
    let da = a[1] - b[1];
    let db = a[2] - b[2];
    (dl * dl + da * da + db * db).sqrt()
}

/// Simple LCG PRNG for reproducible randomization in k-means++ init.
struct Rng(u64);
impl Rng {
    fn new(seed: u64) -> Self { Self(seed) }
    fn next_usize(&mut self, n: usize) -> usize {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        ((self.0 >> 33) as usize) % n
    }
}

/// K-means++ initialization with randomized proportional selection.
/// `seed` varies per attempt for multi-restart k-means.
fn kmeans_pp_init(samples: &[[f64; 3]], k: usize, seed: u64) -> Vec<[f64; 3]> {
    let n = samples.len();
    if n == 0 || k == 0 {
        return vec![];
    }

    let mut rng = Rng::new(seed);
    let mut centers = Vec::with_capacity(k);
    // Random first center
    centers.push(samples[rng.next_usize(n)]);

    let mut dists = vec![f64::MAX; n];

    for _ in 1..k {
        // Update distances to nearest center
        let new_center = centers.last().unwrap();
        let mut total_dist = 0.0f64;
        for (i, s) in samples.iter().enumerate() {
            let d = delta_e(s, new_center);
            if d < dists[i] {
                dists[i] = d;
            }
            total_dist += dists[i] * dists[i]; // D(x)^2 weighting
        }

        // Proportional selection weighted by D(x)^2 (proper k-means++)
        if total_dist <= 0.0 {
            centers.push(samples[rng.next_usize(n)]);
            continue;
        }
        let threshold = (rng.next_usize(1_000_000) as f64 / 1_000_000.0) * total_dist;
        let mut cumulative = 0.0;
        let mut chosen = 0;
        for (i, &d) in dists.iter().enumerate() {
            cumulative += d * d;
            if cumulative >= threshold {
                chosen = i;
                break;
            }
        }
        centers.push(samples[chosen]);
    }

    centers
}

/// Run a single k-means pass. Returns (centers, total_inertia).
fn kmeans_single(
    samples: &[[f64; 3]],
    k: usize,
    max_iter: usize,
    seed: u64,
) -> (Vec<[f64; 3]>, f64) {
    let k = k.min(samples.len());
    let mut centers = kmeans_pp_init(samples, k, seed);
    let mut assignments = vec![0usize; samples.len()];

    for _ in 0..max_iter {
        let mut changed = false;
        for (i, s) in samples.iter().enumerate() {
            let mut best = 0;
            let mut best_d = f64::MAX;
            for (j, c) in centers.iter().enumerate() {
                let d = delta_e(s, c);
                if d < best_d {
                    best_d = d;
                    best = j;
                }
            }
            if assignments[i] != best {
                assignments[i] = best;
                changed = true;
            }
        }

        if !changed {
            break;
        }

        // Recompute centers
        let mut sums = vec![[0.0f64; 3]; k];
        let mut counts = vec![0usize; k];
        for (i, s) in samples.iter().enumerate() {
            let c = assignments[i];
            sums[c][0] += s[0];
            sums[c][1] += s[1];
            sums[c][2] += s[2];
            counts[c] += 1;
        }
        for j in 0..k {
            if counts[j] > 0 {
                centers[j][0] = sums[j][0] / counts[j] as f64;
                centers[j][1] = sums[j][1] / counts[j] as f64;
                centers[j][2] = sums[j][2] / counts[j] as f64;
            }
        }
    }

    // Compute inertia (sum of squared distances to assigned center)
    let inertia: f64 = samples
        .iter()
        .enumerate()
        .map(|(i, s)| {
            let d = delta_e(s, &centers[assignments[i]]);
            d * d
        })
        .sum();

    (centers, inertia)
}

/// Run k-means with multiple restarts, returning best centers (lowest inertia).
/// n_init = number of attempts (Python cv2.kmeans uses 5 for estimate, 10 for quantize).
fn kmeans_lab(samples: &[[f64; 3]], k: usize, max_iter: usize, n_init: usize) -> Vec<[f64; 3]> {
    if samples.is_empty() || k == 0 {
        return vec![];
    }

    let mut best_centers = vec![];
    let mut best_inertia = f64::MAX;

    for attempt in 0..n_init {
        let seed = 42 + attempt as u64 * 7919; // Different seed per attempt
        let (centers, inertia) = kmeans_single(samples, k, max_iter, seed);
        if inertia < best_inertia {
            best_inertia = inertia;
            best_centers = centers;
        }
    }

    best_centers
}

/// Agglomerative merge of cluster centers by Delta-E threshold.
fn merge_clusters(centers: &[[f64; 3]], threshold: f64) -> Vec<[f64; 3]> {
    if centers.is_empty() {
        return vec![];
    }

    // Each group is a list of original center indices
    let mut groups: Vec<Vec<usize>> = centers.iter().enumerate().map(|(i, _)| vec![i]).collect();

    loop {
        let n = groups.len();
        if n <= 1 {
            break;
        }

        // Find closest pair of groups (by mean center distance)
        let mut best_dist = f64::MAX;
        let mut best_i = 0;
        let mut best_j = 1;

        // Compute group means
        let means: Vec<[f64; 3]> = groups
            .iter()
            .map(|g| {
                let mut m = [0.0; 3];
                for &idx in g {
                    m[0] += centers[idx][0];
                    m[1] += centers[idx][1];
                    m[2] += centers[idx][2];
                }
                let n = g.len() as f64;
                [m[0] / n, m[1] / n, m[2] / n]
            })
            .collect();

        for i in 0..n {
            for j in i + 1..n {
                let d = delta_e(&means[i], &means[j]);
                if d < best_dist {
                    best_dist = d;
                    best_i = i;
                    best_j = j;
                }
            }
        }

        if best_dist >= threshold {
            break;
        }

        // Merge best_j into best_i
        let merged: Vec<usize> = groups[best_j].clone();
        groups[best_i].extend(merged);
        groups.remove(best_j);
    }

    // Return group means
    groups
        .iter()
        .map(|g| {
            let mut m = [0.0; 3];
            for &idx in g {
                m[0] += centers[idx][0];
                m[1] += centers[idx][1];
                m[2] += centers[idx][2];
            }
            let n = g.len() as f64;
            [m[0] / n, m[1] / n, m[2] / n]
        })
        .collect()
}

/// Estimate dominant color count using overclustering + merge.
/// Returns 0 if too many colors (photo-like).
pub fn estimate_dominant_colors(pixels: &[u8], w: u32, h: u32) -> u32 {
    let total_pixels = (w * h) as usize;
    let sample_size = total_pixels.min(50_000);
    let step = if total_pixels > sample_size {
        total_pixels / sample_size
    } else {
        1
    };

    // Sample pixels and convert to LAB
    let mut samples = Vec::with_capacity(sample_size);
    let mut i = 0;
    while i < total_pixels && samples.len() < sample_size {
        let off = i * 4;
        if off + 2 < pixels.len() {
            samples.push(rgb_to_lab(pixels[off], pixels[off + 1], pixels[off + 2]));
        }
        i += step;
    }

    if samples.is_empty() {
        return 0;
    }

    // Overcluster with K=16
    let centers = kmeans_lab(&samples, 16, 30, 5); // 5 attempts like Python cv2.kmeans

    // Count cluster sizes, discard < 0.5%
    let mut assignments = vec![0usize; samples.len()];
    for (i, s) in samples.iter().enumerate() {
        let mut best = 0;
        let mut best_d = f64::MAX;
        for (j, c) in centers.iter().enumerate() {
            let d = delta_e(s, c);
            if d < best_d {
                best_d = d;
                best = j;
            }
        }
        assignments[i] = best;
    }

    let mut counts = vec![0usize; centers.len()];
    for &a in &assignments {
        counts[a] += 1;
    }

    let min_count = (samples.len() as f64 * 0.005) as usize; // 0.5%
    let significant: Vec<[f64; 3]> = centers
        .iter()
        .enumerate()
        .filter(|(i, _)| counts[*i] >= min_count)
        .map(|(_, c)| *c)
        .collect();

    if significant.is_empty() {
        return 0;
    }

    // Merge with Delta-E < 5.0
    let merged = merge_clusters(&significant, 5.0);
    merged.len() as u32
}

/// Quantize pixels to n_colors in CIELAB space, modifying pixels in-place.
pub fn quantize_inplace(pixels: &mut [u8], w: u32, h: u32, n_colors: u32) {
    let total_pixels = (w * h) as usize;
    let sample_size = total_pixels.min(50_000);
    let step = if total_pixels > sample_size {
        total_pixels / sample_size
    } else {
        1
    };

    // Sample for k-means
    let mut samples = Vec::with_capacity(sample_size);
    let mut i = 0;
    while i < total_pixels && samples.len() < sample_size {
        let off = i * 4;
        if off + 2 < pixels.len() {
            samples.push(rgb_to_lab(pixels[off], pixels[off + 1], pixels[off + 2]));
        }
        i += step;
    }

    if samples.is_empty() {
        return;
    }

    // K-means in LAB space
    let centers = kmeans_lab(&samples, n_colors as usize, 50, 10); // 10 attempts like Python cv2.kmeans

    // Merge close centers (Delta-E < 3.0)
    let merged_centers = merge_clusters(&centers, 3.0);

    // Convert merged centers back to RGB
    let rgb_centers: Vec<(u8, u8, u8)> = merged_centers
        .iter()
        .map(|c| lab_to_rgb(c[0], c[1], c[2]))
        .collect();

    // Reassign every pixel to nearest center (in LAB space for accuracy)
    for i in 0..total_pixels {
        let off = i * 4;
        if off + 2 >= pixels.len() {
            break;
        }
        let lab = rgb_to_lab(pixels[off], pixels[off + 1], pixels[off + 2]);
        let mut best = 0;
        let mut best_d = f64::MAX;
        for (j, c) in merged_centers.iter().enumerate() {
            let d = delta_e(&lab, c);
            if d < best_d {
                best_d = d;
                best = j;
            }
        }
        pixels[off] = rgb_centers[best].0;
        pixels[off + 1] = rgb_centers[best].1;
        pixels[off + 2] = rgb_centers[best].2;
    }
}
