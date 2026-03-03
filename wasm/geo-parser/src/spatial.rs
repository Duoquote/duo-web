/// Grid-based spatial index for viewport-filtered rendering.
///
/// During parsing, each feature's bounding box and array offsets are recorded.
/// On viewport query, the grid quickly identifies candidate features, which are
/// then filtered by precise bbox intersection.

use std::collections::HashMap;

/// Cell size in degrees. 0.5° ≈ 55 km at equator — good balance between
/// granularity (city-level queries hit ~4-20 cells) and overhead.
const CELL_SIZE: f64 = 0.5;

/// Per-feature metadata recorded during parsing.
/// Stores array offsets so we can extract a feature's vertices/indices
/// without scanning the full arrays.
#[derive(Clone)]
pub struct FeatureMeta {
    // Bounding box (f32 precision is ~2m, plenty for spatial queries)
    pub min_lng: f32,
    pub min_lat: f32,
    pub max_lng: f32,
    pub max_lat: f32,

    // Snapshot of array lengths at the START of this feature.
    // The END is determined by the next feature's start (or the sentinel).
    pub pt_vert_start: u32,   // point_positions.len() / 2
    pub ln_vert_start: u32,   // line_positions.len() / 2
    pub ln_path_start: u32,   // line_path_indices.len()
    pub pg_vert_start: u32,   // polygon_positions.len() / 2
    pub pg_idx_start: u32,    // polygon_indices.len()
    pub pg_prim_start: u32,   // primitive_polygon_indices.len()
}

impl FeatureMeta {
    pub fn new() -> Self {
        FeatureMeta {
            min_lng: f32::INFINITY,
            min_lat: f32::INFINITY,
            max_lng: f32::NEG_INFINITY,
            max_lat: f32::NEG_INFINITY,
            pt_vert_start: 0,
            ln_vert_start: 0,
            ln_path_start: 0,
            pg_vert_start: 0,
            pg_idx_start: 0,
            pg_prim_start: 0,
        }
    }

    /// Update bbox with a coordinate.
    pub fn track_coord(&mut self, lng: f64, lat: f64) {
        let lng32 = lng as f32;
        let lat32 = lat as f32;
        if lng32 < self.min_lng { self.min_lng = lng32; }
        if lat32 < self.min_lat { self.min_lat = lat32; }
        if lng32 > self.max_lng { self.max_lng = lng32; }
        if lat32 > self.max_lat { self.max_lat = lat32; }
    }

    /// True if this feature has a valid (non-empty) bounding box.
    pub fn has_bbox(&self) -> bool {
        self.min_lng <= self.max_lng && self.min_lat <= self.max_lat
    }

    /// True if this feature's bbox intersects the given viewport.
    pub fn intersects(&self, min_lng: f32, min_lat: f32, max_lng: f32, max_lat: f32) -> bool {
        self.max_lng >= min_lng
            && self.min_lng <= max_lng
            && self.max_lat >= min_lat
            && self.min_lat <= max_lat
    }
}

/// Grid-based spatial index.
pub struct SpatialGrid {
    /// Per-feature metadata, indexed by global feature ID.
    pub features: Vec<FeatureMeta>,
    /// Grid cells: (cell_x, cell_y) → list of global feature IDs.
    cells: HashMap<(i32, i32), Vec<u32>>,
    /// Features too large for the grid (bbox spans >10k cells).
    /// Always included in viewport queries with a bbox check.
    large_features: Vec<u32>,
}

impl SpatialGrid {
    pub fn new() -> Self {
        SpatialGrid {
            features: Vec::new(),
            cells: HashMap::new(),
            large_features: Vec::new(),
        }
    }

    /// Register a feature in the grid based on its bounding box.
    pub fn insert(&mut self, global_id: u32, meta: &FeatureMeta) {
        if !meta.has_bbox() {
            return;
        }

        let min_cx = lng_to_cell(meta.min_lng as f64);
        let max_cx = lng_to_cell(meta.max_lng as f64);
        let min_cy = lat_to_cell(meta.min_lat as f64);
        let max_cy = lat_to_cell(meta.max_lat as f64);

        // Features spanning too many cells go into the large_features list
        // instead of being inserted into every cell (which would be expensive).
        let max_cells = 10_000;
        let dx = (max_cx - min_cx + 1) as u64;
        let dy = (max_cy - min_cy + 1) as u64;
        if dx * dy > max_cells {
            self.large_features.push(global_id);
            return;
        }

        for cx in min_cx..=max_cx {
            for cy in min_cy..=max_cy {
                self.cells.entry((cx, cy)).or_default().push(global_id);
            }
        }
    }

    /// Query all feature IDs whose bbox intersects the given viewport.
    /// Returns deduplicated, sorted list of global feature IDs.
    pub fn query(&self, min_lng: f64, min_lat: f64, max_lng: f64, max_lat: f64) -> Vec<u32> {
        let min_cx = lng_to_cell(min_lng);
        let max_cx = lng_to_cell(max_lng);
        let min_cy = lat_to_cell(min_lat);
        let max_cy = lat_to_cell(max_lat);

        // Collect candidate IDs from all intersecting cells
        let mut seen = vec![false; self.features.len()];
        let mut result = Vec::new();

        let vp_min_lng = min_lng as f32;
        let vp_min_lat = min_lat as f32;
        let vp_max_lng = max_lng as f32;
        let vp_max_lat = max_lat as f32;

        for cx in min_cx..=max_cx {
            for cy in min_cy..=max_cy {
                if let Some(ids) = self.cells.get(&(cx, cy)) {
                    for &gid in ids {
                        let idx = gid as usize;
                        if !seen[idx] {
                            seen[idx] = true;
                            // Precise bbox check
                            if self.features[idx].intersects(
                                vp_min_lng, vp_min_lat, vp_max_lng, vp_max_lat,
                            ) {
                                result.push(gid);
                            }
                        }
                    }
                }
            }
        }

        // Always check large features (too big for the grid)
        for &gid in &self.large_features {
            let idx = gid as usize;
            if !seen[idx] {
                seen[idx] = true;
                if self.features[idx].intersects(
                    vp_min_lng, vp_min_lat, vp_max_lng, vp_max_lat,
                ) {
                    result.push(gid);
                }
            }
        }

        result.sort_unstable();
        result
    }
}

fn lng_to_cell(lng: f64) -> i32 {
    (lng / CELL_SIZE).floor() as i32
}

fn lat_to_cell(lat: f64) -> i32 {
    (lat / CELL_SIZE).floor() as i32
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_meta(min_lng: f32, min_lat: f32, max_lng: f32, max_lat: f32) -> FeatureMeta {
        FeatureMeta {
            min_lng,
            min_lat,
            max_lng,
            max_lat,
            ..FeatureMeta::new()
        }
    }

    #[test]
    fn test_grid_basic_query() {
        let mut grid = SpatialGrid::new();

        let m0 = make_meta(10.0, 20.0, 10.1, 20.1);
        let m1 = make_meta(50.0, 50.0, 50.1, 50.1);
        let m2 = make_meta(10.05, 20.05, 10.15, 20.15);

        grid.features.push(m0.clone());
        grid.features.push(m1.clone());
        grid.features.push(m2.clone());

        grid.insert(0, &m0);
        grid.insert(1, &m1);
        grid.insert(2, &m2);

        // Query around feature 0 and 2
        let result = grid.query(9.5, 19.5, 10.5, 20.5);
        assert!(result.contains(&0));
        assert!(result.contains(&2));
        assert!(!result.contains(&1));
    }

    #[test]
    fn test_grid_no_results() {
        let mut grid = SpatialGrid::new();
        let m = make_meta(10.0, 20.0, 10.1, 20.1);
        grid.features.push(m.clone());
        grid.insert(0, &m);

        let result = grid.query(50.0, 50.0, 51.0, 51.0);
        assert!(result.is_empty());
    }

    #[test]
    fn test_feature_meta_track_coord() {
        let mut meta = FeatureMeta::new();
        assert!(!meta.has_bbox());

        meta.track_coord(10.0, 20.0);
        meta.track_coord(11.0, 21.0);
        assert!(meta.has_bbox());
        assert!((meta.min_lng - 10.0).abs() < 0.01);
        assert!((meta.max_lng - 11.0).abs() < 0.01);
    }

    #[test]
    fn test_deduplication() {
        let mut grid = SpatialGrid::new();

        // Feature spanning multiple cells
        let m = make_meta(9.9, 19.9, 10.6, 20.6);
        grid.features.push(m.clone());
        grid.insert(0, &m);

        // Query that also spans multiple cells
        let result = grid.query(9.0, 19.0, 11.0, 21.0);
        // Should only appear once despite being in multiple cells
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], 0);
    }

    #[test]
    fn test_large_feature_not_skipped() {
        let mut grid = SpatialGrid::new();

        // Small feature — fits in grid
        let m0 = make_meta(10.0, 20.0, 10.1, 20.1);
        grid.features.push(m0.clone());
        grid.insert(0, &m0);

        // Very large feature — spans entire world, too big for grid cells.
        // Before the fix, this was silently dropped. Now it goes into large_features.
        let m1 = make_meta(-180.0, -90.0, 180.0, 90.0);
        grid.features.push(m1.clone());
        grid.insert(1, &m1);

        // Query a small area — should still find the large feature
        let result = grid.query(10.0, 20.0, 10.1, 20.1);
        assert!(result.contains(&0));
        assert!(result.contains(&1));
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_large_feature_bbox_filtered() {
        let mut grid = SpatialGrid::new();

        // Large feature covering Europe
        let m = make_meta(-10.0, 35.0, 40.0, 70.0);
        grid.features.push(m.clone());
        grid.insert(0, &m);

        // Query in South America — large feature should NOT match
        let result = grid.query(-70.0, -30.0, -50.0, -10.0);
        assert!(result.is_empty());

        // Query in Europe — large feature should match
        let result = grid.query(0.0, 40.0, 5.0, 45.0);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], 0);
    }
}
