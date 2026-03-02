/// Ring winding order utilities.
///
/// GeoJSON spec (RFC 7946) recommends CCW for outer rings and CW for holes.
/// deck.gl requires this convention for correct rendering.

/// Compute the signed area of a ring using the Shoelace formula.
/// Positive = CCW, Negative = CW.
/// Coordinates are flat: [x0, y0, x1, y1, ...]
pub fn signed_area_flat(coords: &[f64], start: usize, end: usize) -> f64 {
    let n = (end - start) / 2;
    if n < 3 {
        return 0.0;
    }

    let mut sum = 0.0;
    let mut j = n - 1;
    for i in 0..n {
        let xi = coords[start + i * 2];
        let yi = coords[start + i * 2 + 1];
        let xj = coords[start + j * 2];
        let yj = coords[start + j * 2 + 1];
        sum += (xj - xi) * (yi + yj);
        j = i;
    }
    sum / 2.0
}

/// Returns true if the ring (flat coords from start to end) is counter-clockwise.
pub fn is_ccw(coords: &[f64], start: usize, end: usize) -> bool {
    signed_area_flat(coords, start, end) > 0.0
}

/// Reverse a ring in flat coordinate array (in-place).
/// start/end are indices into the flat array (each point = 2 elements).
pub fn reverse_ring(coords: &mut [f64], start: usize, end: usize) {
    let n = (end - start) / 2;
    if n < 2 {
        return;
    }
    for i in 0..n / 2 {
        let a = start + i * 2;
        let b = start + (n - 1 - i) * 2;
        coords.swap(a, b);
        coords.swap(a + 1, b + 1);
    }
}

/// Ensure outer ring is CCW. If not, reverse it.
pub fn ensure_ccw(coords: &mut [f64], start: usize, end: usize) {
    if !is_ccw(coords, start, end) {
        reverse_ring(coords, start, end);
    }
}

/// Ensure hole ring is CW. If not, reverse it.
pub fn ensure_cw(coords: &mut [f64], start: usize, end: usize) {
    if is_ccw(coords, start, end) {
        reverse_ring(coords, start, end);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ccw_triangle() {
        // CCW triangle: (0,0) → (1,0) → (0,1)
        let coords = vec![0.0, 0.0, 1.0, 0.0, 0.0, 1.0];
        assert!(is_ccw(&coords, 0, 6));
    }

    #[test]
    fn test_cw_triangle() {
        // CW triangle: (0,0) → (0,1) → (1,0)
        let coords = vec![0.0, 0.0, 0.0, 1.0, 1.0, 0.0];
        assert!(!is_ccw(&coords, 0, 6));
    }

    #[test]
    fn test_reverse_ring() {
        let mut coords = vec![0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0];
        reverse_ring(&mut coords, 0, 8);
        assert_eq!(coords, vec![0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0]);
    }

    #[test]
    fn test_ensure_ccw() {
        // CW ring → should be reversed
        let mut coords = vec![0.0, 0.0, 0.0, 1.0, 1.0, 0.0];
        ensure_ccw(&mut coords, 0, 6);
        assert!(is_ccw(&coords, 0, 6));
    }
}
