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

use crate::feature::{CoordinateData, GeometryType, ParsedFeature, PropertyValue};
use crate::properties::PropertyStore;
use crate::winding;

pub struct BinaryBuilder {
    // ── Points ──
    pub point_positions: Vec<f64>,
    pub point_feature_ids: Vec<u32>,
    pub point_global_feature_ids: Vec<u32>,
    point_feature_count: u32,

    // ── Lines ──
    pub line_positions: Vec<f64>,
    pub line_path_indices: Vec<u32>,
    pub line_feature_ids: Vec<u32>,
    pub line_global_feature_ids: Vec<u32>,
    line_feature_count: u32,

    // ── Polygons ──
    pub polygon_positions: Vec<f64>,
    pub polygon_indices: Vec<u32>,
    pub primitive_polygon_indices: Vec<u32>,
    pub polygon_feature_ids: Vec<u32>,
    pub polygon_global_feature_ids: Vec<u32>,
    polygon_feature_count: u32,

    // ── Properties ──
    pub point_properties: Vec<String>,   // JSON per feature
    pub line_properties: Vec<String>,    // JSON per feature
    pub polygon_properties: Vec<String>, // JSON per feature
    pub property_store: PropertyStore,

    // ── All feature raw properties (for lazy sidebar) ──
    pub all_feature_props: Vec<String>,

    // ── Stats ──
    pub global_feature_count: u32,
    pub total_vertices: u32,
    pub bbox: [f64; 4], // [minLng, minLat, maxLng, maxLat]
    pub geometry_types: HashSet<String>,
}

impl BinaryBuilder {
    pub fn new() -> Self {
        BinaryBuilder {
            point_positions: Vec::new(),
            point_feature_ids: Vec::new(),
            point_global_feature_ids: Vec::new(),
            point_feature_count: 0,

            line_positions: Vec::new(),
            line_path_indices: Vec::new(),
            line_feature_ids: Vec::new(),
            line_global_feature_ids: Vec::new(),
            line_feature_count: 0,

            polygon_positions: Vec::new(),
            polygon_indices: Vec::new(),
            primitive_polygon_indices: Vec::new(),
            polygon_feature_ids: Vec::new(),
            polygon_global_feature_ids: Vec::new(),
            polygon_feature_count: 0,

            point_properties: Vec::new(),
            line_properties: Vec::new(),
            polygon_properties: Vec::new(),
            property_store: PropertyStore::new(),

            all_feature_props: Vec::new(),

            global_feature_count: 0,
            total_vertices: 0,
            bbox: [f64::INFINITY, f64::INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY],
            geometry_types: HashSet::new(),
        }
    }

    /// Add a parsed feature to the builder.
    pub fn add_feature(&mut self, feature: &ParsedFeature) {
        let global_id = self.global_feature_count;

        // Store raw properties for lazy sidebar
        self.all_feature_props.push(feature.raw_properties.clone());

        // Observe properties for schema discovery
        for prop in &feature.properties {
            self.property_store
                .observe_property(&prop.key, prop.numeric);
        }
        self.property_store.end_feature_observation();

        // Process each geometry in the feature
        for geom in &feature.geometries {
            match geom.geometry_type {
                GeometryType::Null => {
                    self.geometry_types.insert("Null".to_string());
                }
                GeometryType::Point => {
                    self.geometry_types.insert("Point".to_string());
                    if let CoordinateData::Single(coord) = &geom.coordinates {
                        self.add_point(coord, global_id, &feature.properties, &feature.raw_properties);
                    }
                }
                GeometryType::MultiPoint => {
                    self.geometry_types.insert("MultiPoint".to_string());
                    if let CoordinateData::Array(coords) = &geom.coordinates {
                        let fid = self.point_feature_count;
                        self.point_properties.push(feature.raw_properties.clone());
                        for coord in coords {
                            self.push_point_vertex(coord, fid, global_id, &feature.properties);
                        }
                        self.point_feature_count += 1;
                    }
                }
                GeometryType::LineString => {
                    self.geometry_types.insert("LineString".to_string());
                    if let CoordinateData::Array(coords) = &geom.coordinates {
                        self.add_linestring(coords, global_id, &feature.properties, &feature.raw_properties);
                    }
                }
                GeometryType::MultiLineString => {
                    self.geometry_types.insert("MultiLineString".to_string());
                    if let CoordinateData::Nested(lines) = &geom.coordinates {
                        let fid = self.line_feature_count;
                        self.line_properties.push(feature.raw_properties.clone());
                        for line in lines {
                            self.line_path_indices
                                .push((self.line_positions.len() / 2) as u32);
                            for coord in line {
                                self.push_line_vertex(coord, fid, global_id, &feature.properties);
                            }
                        }
                        self.line_feature_count += 1;
                    }
                }
                GeometryType::Polygon => {
                    self.geometry_types.insert("Polygon".to_string());
                    if let CoordinateData::Nested(rings) = &geom.coordinates {
                        self.add_polygon(rings, global_id, &feature.properties, &feature.raw_properties);
                    }
                }
                GeometryType::MultiPolygon => {
                    self.geometry_types.insert("MultiPolygon".to_string());
                    if let CoordinateData::DoubleNested(polys) = &geom.coordinates {
                        let fid = self.polygon_feature_count;
                        self.polygon_properties.push(feature.raw_properties.clone());
                        for poly_rings in polys {
                            // Each sub-polygon gets its own polygon_indices entry
                            self.polygon_indices
                                .push((self.polygon_positions.len() / 2) as u32);
                            self.add_polygon_rings(poly_rings, fid, global_id, &feature.properties);
                        }
                        self.polygon_feature_count += 1;
                    }
                }
                GeometryType::GeometryCollection => {
                    // Should have been flattened by feature.rs
                }
            }
        }

        self.global_feature_count += 1;
    }

    fn add_point(&mut self, coord: &[f64; 2], global_id: u32, props: &[PropertyValue], raw: &str) {
        let fid = self.point_feature_count;
        self.point_properties.push(raw.to_string());
        self.push_point_vertex(coord, fid, global_id, props);
        self.point_feature_count += 1;
    }

    fn push_point_vertex(&mut self, coord: &[f64; 2], feature_id: u32, global_id: u32, props: &[PropertyValue]) {
        self.point_positions.push(coord[0]);
        self.point_positions.push(coord[1]);
        self.point_feature_ids.push(feature_id);
        self.point_global_feature_ids.push(global_id);
        self.update_bbox(coord);
        self.total_vertices += 1;

        // Push numeric properties for this vertex
        for prop in props {
            if let Some(val) = prop.numeric {
                self.property_store.push_point_numeric(&prop.key, val);
            }
        }
    }

    fn add_linestring(&mut self, coords: &[[f64; 2]], global_id: u32, props: &[PropertyValue], raw: &str) {
        let fid = self.line_feature_count;
        self.line_properties.push(raw.to_string());
        self.line_path_indices
            .push((self.line_positions.len() / 2) as u32);
        for coord in coords {
            self.push_line_vertex(coord, fid, global_id, props);
        }
        self.line_feature_count += 1;
    }

    fn push_line_vertex(&mut self, coord: &[f64; 2], feature_id: u32, global_id: u32, props: &[PropertyValue]) {
        self.line_positions.push(coord[0]);
        self.line_positions.push(coord[1]);
        self.line_feature_ids.push(feature_id);
        self.line_global_feature_ids.push(global_id);
        self.update_bbox(coord);
        self.total_vertices += 1;

        for prop in props {
            if let Some(val) = prop.numeric {
                self.property_store.push_line_numeric(&prop.key, val);
            }
        }
    }

    fn add_polygon(&mut self, rings: &[Vec<[f64; 2]>], global_id: u32, props: &[PropertyValue], raw: &str) {
        let fid = self.polygon_feature_count;
        self.polygon_properties.push(raw.to_string());
        self.polygon_indices
            .push((self.polygon_positions.len() / 2) as u32);
        self.add_polygon_rings(rings, fid, global_id, props);
        self.polygon_feature_count += 1;
    }

    fn add_polygon_rings(&mut self, rings: &[Vec<[f64; 2]>], feature_id: u32, global_id: u32, props: &[PropertyValue]) {
        for (ring_idx, ring) in rings.iter().enumerate() {
            // Record primitive polygon index (each ring = primitive)
            self.primitive_polygon_indices
                .push((self.polygon_positions.len() / 2) as u32);

            // Flatten ring to temp buffer for winding check
            let start = self.polygon_positions.len();
            for coord in ring {
                self.polygon_positions.push(coord[0]);
                self.polygon_positions.push(coord[1]);
                self.polygon_feature_ids.push(feature_id);
                self.polygon_global_feature_ids.push(global_id);
                self.update_bbox(coord);
                self.total_vertices += 1;

                for prop in props {
                    if let Some(val) = prop.numeric {
                        self.property_store.push_polygon_numeric(&prop.key, val);
                    }
                }
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
    }

    /// Finalize: push sentinel values to all index arrays and pad numeric columns.
    pub fn finalize(&mut self) {
        let point_verts = self.point_positions.len() / 2;
        let line_verts = self.line_positions.len() / 2;
        let poly_verts = self.polygon_positions.len() / 2;

        // Sentinel values: total vertex count at the end of each index array
        self.line_path_indices.push(line_verts as u32);
        self.polygon_indices.push(poly_verts as u32);
        self.primitive_polygon_indices.push(poly_verts as u32);

        // Pad numeric columns
        self.property_store
            .finalize(point_verts, line_verts, poly_verts);
    }

    /// Get geometry types as a comma-separated string.
    pub fn geometry_types_string(&self) -> String {
        let mut types: Vec<&str> = self.geometry_types.iter().map(|s| s.as_str()).collect();
        types.sort();
        types.join(", ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::feature::{CoordinateData, GeometryType, ParsedGeometry, ParsedFeature};

    fn make_point_feature(lng: f64, lat: f64, raw: &str) -> ParsedFeature {
        ParsedFeature {
            geometries: vec![ParsedGeometry {
                geometry_type: GeometryType::Point,
                coordinates: CoordinateData::Single([lng, lat]),
            }],
            properties: vec![],
            raw_properties: raw.to_string(),
        }
    }

    fn make_line_feature(coords: Vec<[f64; 2]>, raw: &str) -> ParsedFeature {
        ParsedFeature {
            geometries: vec![ParsedGeometry {
                geometry_type: GeometryType::LineString,
                coordinates: CoordinateData::Array(coords),
            }],
            properties: vec![],
            raw_properties: raw.to_string(),
        }
    }

    fn make_polygon_feature(rings: Vec<Vec<[f64; 2]>>, raw: &str) -> ParsedFeature {
        ParsedFeature {
            geometries: vec![ParsedGeometry {
                geometry_type: GeometryType::Polygon,
                coordinates: CoordinateData::Nested(rings),
            }],
            properties: vec![],
            raw_properties: raw.to_string(),
        }
    }

    #[test]
    fn test_point_building() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_point_feature(10.0, 20.0, "{}"));
        builder.add_feature(&make_point_feature(30.0, 40.0, "{}"));
        builder.finalize();

        assert_eq!(builder.point_positions, vec![10.0, 20.0, 30.0, 40.0]);
        assert_eq!(builder.point_feature_ids, vec![0, 1]);
        assert_eq!(builder.point_global_feature_ids, vec![0, 1]);
        assert_eq!(builder.global_feature_count, 2);
        assert_eq!(builder.total_vertices, 2);
    }

    #[test]
    fn test_line_building() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_line_feature(
            vec![[0.0, 0.0], [1.0, 1.0], [2.0, 2.0]],
            "{}",
        ));
        builder.finalize();

        assert_eq!(builder.line_positions.len(), 6); // 3 verts × 2
        assert_eq!(builder.line_path_indices, vec![0, 3]); // start + sentinel
        assert_eq!(builder.line_feature_ids, vec![0, 0, 0]);
    }

    #[test]
    fn test_polygon_building() {
        let mut builder = BinaryBuilder::new();
        // Simple square: CCW outer ring
        builder.add_feature(&make_polygon_feature(
            vec![vec![
                [0.0, 0.0],
                [1.0, 0.0],
                [1.0, 1.0],
                [0.0, 1.0],
                [0.0, 0.0],
            ]],
            "{}",
        ));
        builder.finalize();

        assert_eq!(builder.polygon_positions.len(), 10); // 5 verts × 2
        assert_eq!(builder.polygon_indices, vec![0, 5]); // start + sentinel
        assert_eq!(builder.primitive_polygon_indices, vec![0, 5]);
    }

    #[test]
    fn test_bbox() {
        let mut builder = BinaryBuilder::new();
        builder.add_feature(&make_point_feature(-10.0, -20.0, "{}"));
        builder.add_feature(&make_point_feature(30.0, 40.0, "{}"));

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
        builder.add_feature(&make_point_feature(0.0, 0.0, "{}"));
        builder.add_feature(&make_line_feature(
            vec![[1.0, 1.0], [2.0, 2.0]],
            "{}",
        ));
        builder.add_feature(&make_polygon_feature(
            vec![vec![
                [0.0, 0.0],
                [1.0, 0.0],
                [1.0, 1.0],
                [0.0, 1.0],
                [0.0, 0.0],
            ]],
            "{}",
        ));
        builder.finalize();

        assert_eq!(builder.point_positions.len(), 2);
        assert_eq!(builder.line_positions.len(), 4);
        assert_eq!(builder.polygon_positions.len(), 10);
        assert_eq!(builder.global_feature_count, 3);
    }
}
