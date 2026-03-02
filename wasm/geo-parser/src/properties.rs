/// Property schema discovery and columnar numeric storage.
///
/// - Schema discovered from first N features (property names + whether numeric)
/// - Numeric columns: one Vec<f64> per geometry type, NaN for missing
/// - Late-appearing properties → string only (not added to numeric schema)
/// - finalize(): pad short columns to match vertex count

use std::collections::{HashMap, HashSet};

/// How many features to examine for schema discovery
const SCHEMA_DISCOVERY_COUNT: usize = 100;

/// Tracks numeric property columns per geometry type
pub struct PropertyStore {
    /// Set of property names known to be numeric
    numeric_keys: HashSet<String>,
    /// All property keys seen (in order)
    all_keys: Vec<String>,
    /// Whether schema discovery is complete
    schema_frozen: bool,
    /// Features seen so far (for schema discovery)
    features_seen: usize,

    /// Numeric columns per geometry type: key → values (one per vertex)
    pub point_numerics: HashMap<String, Vec<f64>>,
    pub line_numerics: HashMap<String, Vec<f64>>,
    pub polygon_numerics: HashMap<String, Vec<f64>>,
}

impl PropertyStore {
    pub fn new() -> Self {
        PropertyStore {
            numeric_keys: HashSet::new(),
            all_keys: Vec::new(),
            schema_frozen: false,
            features_seen: 0,
            point_numerics: HashMap::new(),
            line_numerics: HashMap::new(),
            polygon_numerics: HashMap::new(),
        }
    }

    /// Register a property from a feature during schema discovery.
    /// After SCHEMA_DISCOVERY_COUNT features, schema is frozen.
    pub fn observe_property(&mut self, key: &str, numeric: Option<f64>) {
        if !self.schema_frozen {
            if !self.all_keys.contains(&key.to_string()) {
                self.all_keys.push(key.to_string());
            }
            if numeric.is_some() {
                self.numeric_keys.insert(key.to_string());
            }
        }
    }

    /// Mark end of a feature observation for schema tracking
    pub fn end_feature_observation(&mut self) {
        self.features_seen += 1;
        if self.features_seen >= SCHEMA_DISCOVERY_COUNT && !self.schema_frozen {
            self.schema_frozen = true;
        }
    }

    /// Push a numeric property value for a point vertex
    pub fn push_point_numeric(&mut self, key: &str, value: f64) {
        if self.numeric_keys.contains(key) {
            self.point_numerics
                .entry(key.to_string())
                .or_default()
                .push(value);
        }
    }

    /// Push a numeric property value for a line vertex
    pub fn push_line_numeric(&mut self, key: &str, value: f64) {
        if self.numeric_keys.contains(key) {
            self.line_numerics
                .entry(key.to_string())
                .or_default()
                .push(value);
        }
    }

    /// Push a numeric property value for a polygon vertex
    pub fn push_polygon_numeric(&mut self, key: &str, value: f64) {
        if self.numeric_keys.contains(key) {
            self.polygon_numerics
                .entry(key.to_string())
                .or_default()
                .push(value);
        }
    }

    /// Fill missing numeric values with NaN for vertices that didn't have the property
    pub fn pad_point_numerics(&mut self, target_len: usize) {
        for key in &self.numeric_keys {
            let col = self.point_numerics.entry(key.clone()).or_default();
            while col.len() < target_len {
                col.push(f64::NAN);
            }
        }
    }

    pub fn pad_line_numerics(&mut self, target_len: usize) {
        for key in &self.numeric_keys {
            let col = self.line_numerics.entry(key.clone()).or_default();
            while col.len() < target_len {
                col.push(f64::NAN);
            }
        }
    }

    pub fn pad_polygon_numerics(&mut self, target_len: usize) {
        for key in &self.numeric_keys {
            let col = self.polygon_numerics.entry(key.clone()).or_default();
            while col.len() < target_len {
                col.push(f64::NAN);
            }
        }
    }

    /// Get the list of numeric property names
    pub fn numeric_property_names(&self) -> Vec<String> {
        let mut names: Vec<String> = self.numeric_keys.iter().cloned().collect();
        names.sort();
        names
    }

    /// Finalize: pad all columns to their target vertex counts
    pub fn finalize(
        &mut self,
        point_vertices: usize,
        line_vertices: usize,
        polygon_vertices: usize,
    ) {
        self.pad_point_numerics(point_vertices);
        self.pad_line_numerics(line_vertices);
        self.pad_polygon_numerics(polygon_vertices);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_discovery() {
        let mut store = PropertyStore::new();

        store.observe_property("elevation", Some(100.0));
        store.observe_property("name", None);
        store.end_feature_observation();

        assert!(store.numeric_keys.contains("elevation"));
        assert!(!store.numeric_keys.contains("name"));
    }

    #[test]
    fn test_numeric_columns() {
        let mut store = PropertyStore::new();
        store.observe_property("height", Some(10.0));
        store.end_feature_observation();

        store.push_point_numeric("height", 10.0);
        store.push_point_numeric("height", 20.0);

        store.finalize(3, 0, 0);

        let col = store.point_numerics.get("height").unwrap();
        assert_eq!(col.len(), 3);
        assert!((col[0] - 10.0).abs() < 1e-10);
        assert!((col[1] - 20.0).abs() < 1e-10);
        assert!(col[2].is_nan());
    }
}
