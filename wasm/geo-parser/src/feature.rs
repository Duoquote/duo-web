/// Parses individual GeoJSON feature byte slices into structured data
/// suitable for the BinaryBuilder.

use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GeometryType {
    Point,
    MultiPoint,
    LineString,
    MultiLineString,
    Polygon,
    MultiPolygon,
    GeometryCollection,
    Null,
}

#[derive(Debug)]
pub enum CoordinateData {
    /// Point: [lng, lat]
    Single([f64; 2]),
    /// MultiPoint / LineString: [[lng, lat], ...]
    Array(Vec<[f64; 2]>),
    /// Polygon / MultiLineString: [[[lng, lat], ...], ...]
    Nested(Vec<Vec<[f64; 2]>>),
    /// MultiPolygon: [[[[lng, lat], ...], ...], ...]
    DoubleNested(Vec<Vec<Vec<[f64; 2]>>>),
    /// Null geometry
    None,
}

#[derive(Debug)]
pub struct ParsedGeometry {
    pub geometry_type: GeometryType,
    pub coordinates: CoordinateData,
}

#[derive(Debug)]
pub struct ParsedFeature {
    pub geometries: Vec<ParsedGeometry>,
}

/// Intermediate deserialization struct.
/// Properties are NOT deserialized — they are loaded lazily from the
/// original file via File.slice() using byte offsets from the scanner.
#[derive(Deserialize)]
struct RawFeature {
    geometry: Option<RawGeometry>,
}

#[derive(Deserialize)]
struct RawGeometry {
    r#type: String,
    coordinates: Option<Value>,
    geometries: Option<Vec<RawGeometry>>,
}

/// Parse a feature from a byte slice.
pub fn parse_feature(bytes: &[u8]) -> Result<ParsedFeature, String> {
    let raw: RawFeature =
        serde_json::from_slice(bytes).map_err(|e| format!("JSON parse error: {}", e))?;

    let mut geometries = Vec::new();
    if let Some(geom) = raw.geometry {
        collect_geometries(&geom, &mut geometries);
    } else {
        geometries.push(ParsedGeometry {
            geometry_type: GeometryType::Null,
            coordinates: CoordinateData::None,
        });
    }

    Ok(ParsedFeature {
        geometries,
    })
}

fn collect_geometries(geom: &RawGeometry, out: &mut Vec<ParsedGeometry>) {
    let gtype = match geom.r#type.as_str() {
        "Point" => GeometryType::Point,
        "MultiPoint" => GeometryType::MultiPoint,
        "LineString" => GeometryType::LineString,
        "MultiLineString" => GeometryType::MultiLineString,
        "Polygon" => GeometryType::Polygon,
        "MultiPolygon" => GeometryType::MultiPolygon,
        "GeometryCollection" => {
            if let Some(ref geoms) = geom.geometries {
                for g in geoms {
                    collect_geometries(g, out);
                }
            }
            return;
        }
        _ => {
            out.push(ParsedGeometry {
                geometry_type: GeometryType::Null,
                coordinates: CoordinateData::None,
            });
            return;
        }
    };

    let coords = match &geom.coordinates {
        Some(v) => parse_coordinates(gtype, v),
        None => CoordinateData::None,
    };

    out.push(ParsedGeometry {
        geometry_type: gtype,
        coordinates: coords,
    });
}

fn parse_coordinates(gtype: GeometryType, value: &Value) -> CoordinateData {
    match gtype {
        GeometryType::Point => {
            if let Some(arr) = value.as_array() {
                let lng = arr.first().and_then(|v| v.as_f64()).unwrap_or(0.0);
                let lat = arr.get(1).and_then(|v| v.as_f64()).unwrap_or(0.0);
                CoordinateData::Single([lng, lat])
            } else {
                CoordinateData::None
            }
        }
        GeometryType::MultiPoint | GeometryType::LineString => {
            if let Some(arr) = value.as_array() {
                let coords: Vec<[f64; 2]> = arr.iter().filter_map(parse_coord).collect();
                CoordinateData::Array(coords)
            } else {
                CoordinateData::None
            }
        }
        GeometryType::Polygon | GeometryType::MultiLineString => {
            if let Some(rings) = value.as_array() {
                let nested: Vec<Vec<[f64; 2]>> = rings
                    .iter()
                    .filter_map(|ring| {
                        ring.as_array()
                            .map(|arr| arr.iter().filter_map(parse_coord).collect())
                    })
                    .collect();
                CoordinateData::Nested(nested)
            } else {
                CoordinateData::None
            }
        }
        GeometryType::MultiPolygon => {
            if let Some(polys) = value.as_array() {
                let double_nested: Vec<Vec<Vec<[f64; 2]>>> = polys
                    .iter()
                    .filter_map(|poly| {
                        poly.as_array().map(|rings| {
                            rings
                                .iter()
                                .filter_map(|ring| {
                                    ring.as_array()
                                        .map(|arr| arr.iter().filter_map(parse_coord).collect())
                                })
                                .collect()
                        })
                    })
                    .collect();
                CoordinateData::DoubleNested(double_nested)
            } else {
                CoordinateData::None
            }
        }
        _ => CoordinateData::None,
    }
}

fn parse_coord(value: &Value) -> Option<[f64; 2]> {
    let arr = value.as_array()?;
    let lng = arr.first()?.as_f64()?;
    let lat = arr.get(1)?.as_f64()?;
    Some([lng, lat])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_point_feature() {
        let input = br#"{"type":"Feature","geometry":{"type":"Point","coordinates":[10.5,20.3]},"properties":{"name":"test","value":42}}"#;
        let feature = parse_feature(input).unwrap();
        assert_eq!(feature.geometries.len(), 1);
        assert_eq!(feature.geometries[0].geometry_type, GeometryType::Point);
        if let CoordinateData::Single(c) = &feature.geometries[0].coordinates {
            assert!((c[0] - 10.5).abs() < 1e-10);
            assert!((c[1] - 20.3).abs() < 1e-10);
        } else {
            panic!("Expected Single coordinates");
        }
    }

    #[test]
    fn test_parse_null_geometry() {
        let input = br#"{"type":"Feature","geometry":null,"properties":{"a":1}}"#;
        let feature = parse_feature(input).unwrap();
        assert_eq!(feature.geometries[0].geometry_type, GeometryType::Null);
    }

    #[test]
    fn test_parse_geometry_collection() {
        let input = br#"{"type":"Feature","geometry":{"type":"GeometryCollection","geometries":[{"type":"Point","coordinates":[1,2]},{"type":"LineString","coordinates":[[3,4],[5,6]]}]},"properties":{}}"#;
        let feature = parse_feature(input).unwrap();
        assert_eq!(feature.geometries.len(), 2);
        assert_eq!(feature.geometries[0].geometry_type, GeometryType::Point);
        assert_eq!(feature.geometries[1].geometry_type, GeometryType::LineString);
    }

    #[test]
    fn test_parse_polygon() {
        let input = br#"{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]},"properties":{}}"#;
        let feature = parse_feature(input).unwrap();
        assert_eq!(feature.geometries[0].geometry_type, GeometryType::Polygon);
        if let CoordinateData::Nested(rings) = &feature.geometries[0].coordinates {
            assert_eq!(rings.len(), 1);
            assert_eq!(rings[0].len(), 5);
        } else {
            panic!("Expected Nested coordinates");
        }
    }

    #[test]
    fn test_properties_skipped() {
        // Properties are not deserialized (loaded lazily from file) — just verify
        // that features with properties still parse correctly.
        let input = br#"{"type":"Feature","geometry":null,"properties":{"num":3.14,"bool":true,"str":"hello","nested":{"a":1}}}"#;
        let feature = parse_feature(input).unwrap();
        assert_eq!(feature.geometries[0].geometry_type, GeometryType::Null);
    }
}
