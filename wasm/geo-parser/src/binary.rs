/// BinaryBuilder: accumulates vertex data from parsed features into flat Vecs
/// matching deck.gl's BinaryFeatureCollection format.
///
/// Key invariants:
/// - featureIds / globalFeatureIds / numericProps: ONE entry PER VERTEX
/// - MultiPolygon: each sub-polygon → own polygonIndices entry, shared featureId
/// - MultiLineString: each sub-line → own pathIndices entry, shared featureId
/// - properties[]: one entry per unique feature within that geometry type, indexed by featureIds
/// - finalize(): pushes sentinel (total vertex count) to all index arrays
/// - Empty geometry types → empty typed arrays (never omitted)

use std::collections::HashSet;

use crate::feature::{CoordinateData, GeometryType, ParsedFeature};
use crate::spatial::{FeatureMeta, SpatialGrid};
use crate::winding;

pub struct BinaryBuilder {
    // ── Points ──
    pub point_positions: Vec<f64>,

    // ── Lines ──
    pub line_positions: Vec<f64>,
    pub line_path_indices: Vec<u32>,

    // ── Polygons ──
    pub polygon_positions: Vec<f64>,
    pub polygon_indices: Vec<u32>,
    pub primitive_polygon_indices: Vec<u32>,

    // ── Feature file offsets (for lazy property loading via File.slice()) ──
    pub feature_file_offsets: Vec<u64>,
    pub feature_byte_lengths: Vec<u32>,

    // ── Stats ──
    pub global_feature_count: u32,
    pub total_vertices: u32,
    pub bbox: [f64; 4], // [minLng, minLat, maxLng, maxLat]
    pub geometry_types: HashSet<String>,

    // ── Spatial index ──
    pub spatial_grid: SpatialGrid,
    /// Tracks the current feature's metadata during add_feature()
    current_meta: FeatureMeta,

    // ── Viewport-filtered output ──
    pub vp_point_positions: Vec<f64>,
    pub vp_point_feature_ids: Vec<u32>,
    pub vp_point_global_feature_ids: Vec<u32>,
    pub vp_line_positions: Vec<f64>,
    pub vp_line_path_indices: Vec<u32>,
    pub vp_line_feature_ids: Vec<u32>,
    pub vp_line_global_feature_ids: Vec<u32>,
    pub vp_polygon_positions: Vec<f64>,
    pub vp_polygon_indices: Vec<u32>,
    pub vp_primitive_polygon_indices: Vec<u32>,
    pub vp_polygon_feature_ids: Vec<u32>,
    pub vp_polygon_global_feature_ids: Vec<u32>,
    pub vp_feature_count: u32,
}

impl BinaryBuilder {
    pub fn new() -> Self {
        BinaryBuilder {
            point_positions: Vec::new(),

            line_positions: Vec::new(),
            line_path_indices: Vec::new(),

            polygon_positions: Vec::new(),
            polygon_indices: Vec::new(),
            primitive_polygon_indices: Vec::new(),

            feature_file_offsets: Vec::new(),
            feature_byte_lengths: Vec::new(),

            global_feature_count: 0,
            total_vertices: 0,
            bbox: [f64::INFINITY, f64::INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY],
            geometry_types: HashSet::new(),

            spatial_grid: SpatialGrid::new(),
            current_meta: FeatureMeta::new(),

            vp_point_positions: Vec::new(),
            vp_point_feature_ids: Vec::new(),
            vp_point_global_feature_ids: Vec::new(),
            vp_line_positions: Vec::new(),
            vp_line_path_indices: Vec::new(),
            vp_line_feature_ids: Vec::new(),
            vp_line_global_feature_ids: Vec::new(),
            vp_polygon_positions: Vec::new(),
            vp_polygon_indices: Vec::new(),
            vp_primitive_polygon_indices: Vec::new(),
            vp_polygon_feature_ids: Vec::new(),
            vp_polygon_global_feature_ids: Vec::new(),
            vp_feature_count: 0,
        }
    }

    /// Add a parsed feature to the builder.
    /// `file_offset` and `byte_length` record where this feature lives in the
    /// original file, so properties can be re-read on demand via File.slice().
    pub fn add_feature(&mut self, feature: &ParsedFeature, file_offset: u64, byte_length: u32) {
        let global_id = self.global_feature_count;

        // Snapshot array positions for spatial index metadata
        self.current_meta = FeatureMeta::new();
        self.current_meta.pt_vert_start = (self.point_positions.len() / 2) as u32;
        self.current_meta.ln_vert_start = (self.line_positions.len() / 2) as u32;
        self.current_meta.ln_path_start = self.line_path_indices.len() as u32;
        self.current_meta.pg_vert_start = (self.polygon_positions.len() / 2) as u32;
        self.current_meta.pg_idx_start = self.polygon_indices.len() as u32;
        self.current_meta.pg_prim_start = self.primitive_polygon_indices.len() as u32;

        // Store file offset for lazy property loading
        self.feature_file_offsets.push(file_offset);
        self.feature_byte_lengths.push(byte_length);

        // Process each geometry in the feature
        for geom in &feature.geometries {
            match geom.geometry_type {
                GeometryType::Null => {
                    self.geometry_types.insert("Null".to_string());
                }
                GeometryType::Point => {
                    self.geometry_types.insert("Point".to_string());
                    if let CoordinateData::Single(coord) = &geom.coordinates {
                        self.push_vertex_point(coord);
                    }
                }
                GeometryType::MultiPoint => {
                    self.geometry_types.insert("MultiPoint".to_string());
                    if let CoordinateData::Array(coords) = &geom.coordinates {
                        for coord in coords {
                            self.push_vertex_point(coord);
                        }
                    }
                }
                GeometryType::LineString => {
                    self.geometry_types.insert("LineString".to_string());
                    if let CoordinateData::Array(coords) = &geom.coordinates {
                        self.line_path_indices
                            .push((self.line_positions.len() / 2) as u32);
                        for coord in coords {
                            self.push_vertex_line(coord);
                        }
                    }
                }
                GeometryType::MultiLineString => {
                    self.geometry_types.insert("MultiLineString".to_string());
                    if let CoordinateData::Nested(lines) = &geom.coordinates {
                        for line in lines {
                            self.line_path_indices
                                .push((self.line_positions.len() / 2) as u32);
                            for coord in line {
                                self.push_vertex_line(coord);
                            }
                        }
                    }
                }
                GeometryType::Polygon => {
                    self.geometry_types.insert("Polygon".to_string());
                    if let CoordinateData::Nested(rings) = &geom.coordinates {
                        self.polygon_indices
                            .push((self.polygon_positions.len() / 2) as u32);
                        self.add_polygon_rings(rings);
                    }
                }
                GeometryType::MultiPolygon => {
                    self.geometry_types.insert("MultiPolygon".to_string());
                    if let CoordinateData::DoubleNested(polys) = &geom.coordinates {
                        for poly_rings in polys {
                            self.polygon_indices
                                .push((self.polygon_positions.len() / 2) as u32);
                            self.add_polygon_rings(poly_rings);
                        }
                    }
                }
                GeometryType::GeometryCollection => {
                    // Should have been flattened by feature.rs
                }
            }
        }

        // Record spatial metadata and insert into grid
        let meta = self.current_meta.clone();
        self.spatial_grid.features.push(meta.clone());
        self.spatial_grid.insert(global_id, &meta);

        self.global_feature_count += 1;
    }

    fn push_vertex_point(&mut self, coord: &[f64; 2]) {
        self.point_positions.push(coord[0]);
        self.point_positions.push(coord[1]);
        self.update_bbox(coord);
        self.total_vertices += 1;
    }

    fn push_vertex_line(&mut self, coord: &[f64; 2]) {
        self.line_positions.push(coord[0]);
        self.line_positions.push(coord[1]);
        self.update_bbox(coord);
        self.total_vertices += 1;
    }

    fn add_polygon_rings(&mut self, rings: &[Vec<[f64; 2]>]) {
        for (ring_idx, ring) in rings.iter().enumerate() {
            self.primitive_polygon_indices
                .push((self.polygon_positions.len() / 2) as u32);

            let start = self.polygon_positions.len();
            for coord in ring {
                self.polygon_positions.push(coord[0]);
                self.polygon_positions.push(coord[1]);
                self.update_bbox(coord);
                self.total_vertices += 1;
            }
            let end = self.polygon_positions.len();

            // Enforce winding: outer (ring_idx == 0) → CCW, holes → CW
            if ring_idx == 0 {
                winding::ensure_ccw(&mut self.polygon_positions, start, end);
            } else {
                winding::ensure_cw(&mut self.polygon_positions, start, end);
            }
        }
    }

    fn update_bbox(&mut self, coord: &[f64; 2]) {
        if coord[0] < self.bbox[0] {
            self.bbox[0] = coord[0];
        }
        if coord[1] < self.bbox[1] {
            self.bbox[1] = coord[1];
        }
        if coord[0] > self.bbox[2] {
            self.bbox[2] = coord[0];
        }
        if coord[1] > self.bbox[3] {
            self.bbox[3] = coord[1];
        }
        // Track per-feature bbox for spatial index
        self.current_meta.track_coord(coord[0], coord[1]);
    }

    /// Finalize: push sentinel values to all index arrays.
    pub fn finalize(&mut self) {
        let point_verts = self.point_positions.len() / 2;
        let line_verts = self.line_positions.len() / 2;
        let poly_verts = self.polygon_positions.len() / 2;

        // Push sentinel FeatureMeta BEFORE finalize sentinels, so that
        // feature ranges [meta.idx_start, sentinel.idx_start) exclude
        // the finalize sentinel values from the index arrays.
        let sentinel = FeatureMeta {
            min_lng: f32::INFINITY,
            min_lat: f32::INFINITY,
            max_lng: f32::NEG_INFINITY,
            max_lat: f32::NEG_INFINITY,
            pt_vert_start: point_verts as u32,
            ln_vert_start: line_verts as u32,
            ln_path_start: self.line_path_indices.len() as u32,
            pg_vert_start: poly_verts as u32,
            pg_idx_start: self.polygon_indices.len() as u32,
            pg_prim_start: self.primitive_polygon_indices.len() as u32,
        };
        self.spatial_grid.features.push(sentinel);

        // Sentinel values: total vertex count at the end of each index array
        self.line_path_indices.push(line_verts as u32);
        self.polygon_indices.push(poly_verts as u32);
        self.primitive_polygon_indices.push(poly_verts as u32);
    }

    /// Get geometry types as a comma-separated string.
    pub fn geometry_types_string(&self) -> String {
        let mut types: Vec<&str> = self.geometry_types.iter().map(|s| s.as_str()).collect();
        types.sort();
        types.join(", ")
    }

    /// Build viewport-filtered binary arrays for features visible in the given bounds.
    /// `min_extent` filters out non-point features whose bbox extent (max of width/height)
    /// is smaller than this threshold (in degrees). Use 0.0 to disable LOD filtering.
    /// After calling this, use vp_* fields to get the filtered data.
    /// Returns the number of visible features.
    pub fn build_viewport(
        &mut self,
        min_lng: f64,
        min_lat: f64,
        max_lng: f64,
        max_lat: f64,
        min_extent: f64,
    ) -> u32 {
        // Query spatial grid for visible feature IDs
        let visible = self.spatial_grid.query(min_lng, min_lat, max_lng, max_lat);

        // Clear previous viewport data
        self.vp_point_positions.clear();
        self.vp_point_feature_ids.clear();
        self.vp_point_global_feature_ids.clear();
        self.vp_line_positions.clear();
        self.vp_line_path_indices.clear();
        self.vp_line_feature_ids.clear();
        self.vp_line_global_feature_ids.clear();
        self.vp_polygon_positions.clear();
        self.vp_polygon_indices.clear();
        self.vp_primitive_polygon_indices.clear();
        self.vp_polygon_feature_ids.clear();
        self.vp_polygon_global_feature_ids.clear();

        let mut vp_pt_fid: u32 = 0;
        let mut vp_ln_fid: u32 = 0;
        let mut vp_pg_fid: u32 = 0;
        let mut visible_after_lod: u32 = 0;

        let features = &self.spatial_grid.features;

        let min_extent_f32 = min_extent as f32;

        for &gid in &visible {
            let idx = gid as usize;
            let meta = &features[idx];
            let next = &features[idx + 1]; // sentinel guarantees this exists

            // LOD check: skip non-point features whose bbox extent is below threshold.
            // Points always pass (they're cheap and have zero spatial extent).
            let has_lines_or_polys = meta.ln_vert_start != next.ln_vert_start
                || meta.pg_vert_start != next.pg_vert_start;
            if has_lines_or_polys && min_extent_f32 > 0.0 {
                let extent_lng = meta.max_lng - meta.min_lng;
                let extent_lat = meta.max_lat - meta.min_lat;
                let extent = if extent_lng > extent_lat { extent_lng } else { extent_lat };
                if extent < min_extent_f32 {
                    continue;
                }
            }

            visible_after_lod += 1;

            // ── Points ──
            let pt_start = meta.pt_vert_start as usize;
            let pt_end = next.pt_vert_start as usize;
            if pt_start < pt_end {
                let vert_count = pt_end - pt_start;
                self.vp_point_positions
                    .extend_from_slice(&self.point_positions[pt_start * 2..pt_end * 2]);
                for _ in 0..vert_count {
                    self.vp_point_feature_ids.push(vp_pt_fid);
                    self.vp_point_global_feature_ids.push(gid);
                }
                vp_pt_fid += 1;
            }

            // ── Lines ──
            let ln_start = meta.ln_vert_start as usize;
            let ln_end = next.ln_vert_start as usize;
            if ln_start < ln_end {
                let new_offset = (self.vp_line_positions.len() / 2) as u32;
                let old_offset = ln_start as u32;

                // Copy path indices (remapped)
                let path_start = meta.ln_path_start as usize;
                let path_end = next.ln_path_start as usize;
                for i in path_start..path_end {
                    self.vp_line_path_indices
                        .push(self.line_path_indices[i] - old_offset + new_offset);
                }

                // Copy positions
                let vert_count = ln_end - ln_start;
                self.vp_line_positions
                    .extend_from_slice(&self.line_positions[ln_start * 2..ln_end * 2]);
                for _ in 0..vert_count {
                    self.vp_line_feature_ids.push(vp_ln_fid);
                    self.vp_line_global_feature_ids.push(gid);
                }
                vp_ln_fid += 1;
            }

            // ── Polygons ──
            let pg_start = meta.pg_vert_start as usize;
            let pg_end = next.pg_vert_start as usize;
            if pg_start < pg_end {
                let new_offset = (self.vp_polygon_positions.len() / 2) as u32;
                let old_offset = pg_start as u32;

                // Copy polygon indices (remapped)
                let idx_start = meta.pg_idx_start as usize;
                let idx_end = next.pg_idx_start as usize;
                for i in idx_start..idx_end {
                    self.vp_polygon_indices
                        .push(self.polygon_indices[i] - old_offset + new_offset);
                }

                // Copy primitive polygon indices (remapped)
                let prim_start = meta.pg_prim_start as usize;
                let prim_end = next.pg_prim_start as usize;
                for i in prim_start..prim_end {
                    self.vp_primitive_polygon_indices
                        .push(self.primitive_polygon_indices[i] - old_offset + new_offset);
                }

                // Copy positions
                let vert_count = pg_end - pg_start;
                self.vp_polygon_positions
                    .extend_from_slice(&self.polygon_positions[pg_start * 2..pg_end * 2]);
                for _ in 0..vert_count {
                    self.vp_polygon_feature_ids.push(vp_pg_fid);
                    self.vp_polygon_global_feature_ids.push(gid);
                }
                vp_pg_fid += 1;
            }
        }

        // Push sentinels to index arrays
        let vp_ln_verts = (self.vp_line_positions.len() / 2) as u32;
        let vp_pg_verts = (self.vp_polygon_positions.len() / 2) as u32;
        self.vp_line_path_indices.push(vp_ln_verts);
        self.vp_polygon_indices.push(vp_pg_verts);
        self.vp_primitive_polygon_indices.push(vp_pg_verts);

        self.vp_feature_count = visible_after_lod;
        self.vp_feature_count
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::feature::{CoordinateData, GeometryType, ParsedGeometry, ParsedFeature};

    fn make_point_feature(lng: f64, lat: f64) -> ParsedFeature {
        ParsedFeature {
            geometries: vec![ParsedGeometry {
                geometry_type: GeometryType::Point,
                coordinates: CoordinateData::Single([lng, lat]),
            }],
        }
    }

    fn make_line_feature(coords: Vec<[f64; 2]>) -> ParsedFeature {
        ParsedFeature {
            geometries: vec![ParsedGeometry {
                geometry_type: GeometryType::LineString,
                coordinates: CoordinateData::Array(coords),
            }],
        }
    }

    fn make_polygon_feature(rings: Vec<Vec<[f64; 2]>>) -> ParsedFeature {
        ParsedFeature {
            geometries: vec![ParsedGeometry {
                geometry_type: GeometryType::Polygon,
                coordinates: CoordinateData::Nested(rings),
            }],
        }
    }

    #[test]
    fn test_point_building() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_point_feature(10.0, 20.0), 0, 50);
        builder.add_feature(&make_point_feature(30.0, 40.0), 50, 50);
        builder.finalize();

        assert_eq!(builder.point_positions, vec![10.0, 20.0, 30.0, 40.0]);
        assert_eq!(builder.global_feature_count, 2);
        assert_eq!(builder.total_vertices, 2);
        assert_eq!(builder.feature_file_offsets, vec![0, 50]);
        assert_eq!(builder.feature_byte_lengths, vec![50, 50]);
    }

    #[test]
    fn test_line_building() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_line_feature(
            vec![[0.0, 0.0], [1.0, 1.0], [2.0, 2.0]],
        ), 0, 100);
        builder.finalize();

        assert_eq!(builder.line_positions.len(), 6); // 3 verts × 2
        assert_eq!(builder.line_path_indices, vec![0, 3]); // start + sentinel
    }

    #[test]
    fn test_polygon_building() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_polygon_feature(
            vec![vec![
                [0.0, 0.0],
                [1.0, 0.0],
                [1.0, 1.0],
                [0.0, 1.0],
                [0.0, 0.0],
            ]],
        ), 0, 100);
        builder.finalize();

        assert_eq!(builder.polygon_positions.len(), 10); // 5 verts × 2
        assert_eq!(builder.polygon_indices, vec![0, 5]); // start + sentinel
        assert_eq!(builder.primitive_polygon_indices, vec![0, 5]);
    }

    #[test]
    fn test_bbox() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_point_feature(-10.0, -20.0), 0, 50);
        builder.add_feature(&make_point_feature(30.0, 40.0), 50, 50);

        assert_eq!(builder.bbox, [-10.0, -20.0, 30.0, 40.0]);
    }

    #[test]
    fn test_empty_finalize() {
        let mut builder = BinaryBuilder::new();
        builder.finalize();

        // Sentinels should still be added
        assert_eq!(builder.line_path_indices, vec![0]);
        assert_eq!(builder.polygon_indices, vec![0]);
        assert_eq!(builder.primitive_polygon_indices, vec![0]);
    }

    #[test]
    fn test_mixed_geometry_types() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_point_feature(0.0, 0.0), 0, 50);
        builder.add_feature(&make_line_feature(
            vec![[1.0, 1.0], [2.0, 2.0]],
        ), 50, 60);
        builder.add_feature(&make_polygon_feature(
            vec![vec![
                [0.0, 0.0],
                [1.0, 0.0],
                [1.0, 1.0],
                [0.0, 1.0],
                [0.0, 0.0],
            ]],
        ), 110, 80);
        builder.finalize();

        assert_eq!(builder.point_positions.len(), 2);
        assert_eq!(builder.line_positions.len(), 4);
        assert_eq!(builder.polygon_positions.len(), 10);
        assert_eq!(builder.global_feature_count, 3);
    }

    #[test]
    fn test_viewport_filtering_points() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_point_feature(10.0, 20.0), 0, 50);
        builder.add_feature(&make_point_feature(50.0, 50.0), 50, 50);
        builder.add_feature(&make_point_feature(11.0, 21.0), 100, 50);
        builder.finalize();

        let count = builder.build_viewport(9.0, 19.0, 12.0, 22.0, 0.0);
        assert_eq!(count, 2);
        assert_eq!(builder.vp_point_positions, vec![10.0, 20.0, 11.0, 21.0]);
        assert_eq!(builder.vp_point_feature_ids, vec![0, 1]);
        assert_eq!(builder.vp_point_global_feature_ids, vec![0, 2]);
    }

    #[test]
    fn test_viewport_filtering_polygons() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_polygon_feature(
            vec![vec![
                [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0],
            ]],
        ), 0, 100);
        builder.add_feature(&make_polygon_feature(
            vec![vec![
                [10.0, 10.0], [11.0, 10.0], [11.0, 11.0], [10.0, 11.0], [10.0, 10.0],
            ]],
        ), 100, 100);
        builder.finalize();

        let count = builder.build_viewport(9.0, 9.0, 12.0, 12.0, 0.0);
        assert_eq!(count, 1);
        assert_eq!(builder.vp_polygon_positions.len(), 10);
        assert_eq!(builder.vp_polygon_indices, vec![0, 5]);
        assert_eq!(builder.vp_polygon_feature_ids, vec![0, 0, 0, 0, 0]);
        assert_eq!(builder.vp_polygon_global_feature_ids, vec![1, 1, 1, 1, 1]);
    }

    #[test]
    fn test_viewport_all_features() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_point_feature(10.0, 20.0), 0, 50);
        builder.add_feature(&make_point_feature(11.0, 21.0), 50, 50);
        builder.finalize();

        let count = builder.build_viewport(-180.0, -90.0, 180.0, 90.0, 0.0);
        assert_eq!(count, 2);
        assert_eq!(builder.vp_point_positions, vec![10.0, 20.0, 11.0, 21.0]);
    }

    #[test]
    fn test_viewport_no_features() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_point_feature(10.0, 20.0), 0, 50);
        builder.finalize();

        let count = builder.build_viewport(50.0, 50.0, 60.0, 60.0, 0.0);
        assert_eq!(count, 0);
        assert!(builder.vp_point_positions.is_empty());
    }

    #[test]
    fn test_viewport_lod_filtering() {
        let mut builder = BinaryBuilder::new();
        // Small polygon (1° extent)
        builder.add_feature(&make_polygon_feature(
            vec![vec![
                [10.0, 10.0], [11.0, 10.0], [11.0, 11.0], [10.0, 11.0], [10.0, 10.0],
            ]],
        ), 0, 100);
        // Large polygon (10° extent)
        builder.add_feature(&make_polygon_feature(
            vec![vec![
                [20.0, 20.0], [30.0, 20.0], [30.0, 30.0], [20.0, 30.0], [20.0, 20.0],
            ]],
        ), 100, 100);
        // Point (always passes LOD)
        builder.add_feature(&make_point_feature(10.5, 10.5), 200, 50);
        builder.finalize();

        // LOD threshold 5° — only the large polygon and point should pass
        let count = builder.build_viewport(-180.0, -90.0, 180.0, 90.0, 5.0);
        assert_eq!(count, 2); // large polygon + point
        assert_eq!(builder.vp_point_positions, vec![10.5, 10.5]);
        assert_eq!(builder.vp_polygon_positions.len(), 10); // only the 10° polygon

        // LOD threshold 0° — everything passes
        let count = builder.build_viewport(-180.0, -90.0, 180.0, 90.0, 0.0);
        assert_eq!(count, 3);
    }
}
