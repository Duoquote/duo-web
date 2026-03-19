/// Shape detection: detect circles, ellipses, and rectangles in SVG paths
/// and replace them with proper SVG primitives.
/// Port of vectorizer/geometry/shapes.py.

use quick_xml::events::{BytesStart, Event};
use quick_xml::{Reader, Writer};
use std::io::Cursor;

/// Parsed point from an SVG path.
#[derive(Clone)]
struct Point {
    x: f64,
    y: f64,
}

/// Detected shape with its SVG replacement.
enum DetectedShape {
    Circle {
        cx: f64,
        cy: f64,
        r: f64,
    },
    Ellipse {
        cx: f64,
        cy: f64,
        rx: f64,
        ry: f64,
        angle: f64,
    },
    Rect {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    },
}

/// Parse an SVG path `d` attribute into a list of points.
fn parse_path_points(d: &str) -> Vec<Point> {
    let mut points = Vec::new();
    let mut cx = 0.0f64;
    let mut cy = 0.0f64;
    let mut start_x = 0.0f64;
    let mut start_y = 0.0f64;

    let tokens = tokenize_path(d);
    let mut i = 0;

    while i < tokens.len() {
        match tokens[i].as_str() {
            "M" => {
                if i + 2 < tokens.len() {
                    cx = parse_f64(&tokens[i + 1]);
                    cy = parse_f64(&tokens[i + 2]);
                    start_x = cx;
                    start_y = cy;
                    points.push(Point { x: cx, y: cy });
                    i += 3;
                    // Implicit lineto after M
                    while i + 1 < tokens.len() && is_number(&tokens[i]) {
                        cx = parse_f64(&tokens[i]);
                        cy = parse_f64(&tokens[i + 1]);
                        points.push(Point { x: cx, y: cy });
                        i += 2;
                    }
                } else {
                    i += 1;
                }
            }
            "m" => {
                if i + 2 < tokens.len() {
                    cx += parse_f64(&tokens[i + 1]);
                    cy += parse_f64(&tokens[i + 2]);
                    start_x = cx;
                    start_y = cy;
                    points.push(Point { x: cx, y: cy });
                    i += 3;
                    while i + 1 < tokens.len() && is_number(&tokens[i]) {
                        cx += parse_f64(&tokens[i]);
                        cy += parse_f64(&tokens[i + 1]);
                        points.push(Point { x: cx, y: cy });
                        i += 2;
                    }
                } else {
                    i += 1;
                }
            }
            "L" => {
                if i + 2 < tokens.len() {
                    cx = parse_f64(&tokens[i + 1]);
                    cy = parse_f64(&tokens[i + 2]);
                    points.push(Point { x: cx, y: cy });
                    i += 3;
                    while i + 1 < tokens.len() && is_number(&tokens[i]) {
                        cx = parse_f64(&tokens[i]);
                        cy = parse_f64(&tokens[i + 1]);
                        points.push(Point { x: cx, y: cy });
                        i += 2;
                    }
                } else {
                    i += 1;
                }
            }
            "l" => {
                if i + 2 < tokens.len() {
                    cx += parse_f64(&tokens[i + 1]);
                    cy += parse_f64(&tokens[i + 2]);
                    points.push(Point { x: cx, y: cy });
                    i += 3;
                    while i + 1 < tokens.len() && is_number(&tokens[i]) {
                        cx += parse_f64(&tokens[i]);
                        cy += parse_f64(&tokens[i + 1]);
                        points.push(Point { x: cx, y: cy });
                        i += 2;
                    }
                } else {
                    i += 1;
                }
            }
            "H" => {
                if i + 1 < tokens.len() {
                    cx = parse_f64(&tokens[i + 1]);
                    points.push(Point { x: cx, y: cy });
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "h" => {
                if i + 1 < tokens.len() {
                    cx += parse_f64(&tokens[i + 1]);
                    points.push(Point { x: cx, y: cy });
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "V" => {
                if i + 1 < tokens.len() {
                    cy = parse_f64(&tokens[i + 1]);
                    points.push(Point { x: cx, y: cy });
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "v" => {
                if i + 1 < tokens.len() {
                    cy += parse_f64(&tokens[i + 1]);
                    points.push(Point { x: cx, y: cy });
                    i += 2;
                } else {
                    i += 1;
                }
            }
            "C" => {
                // Cubic bezier: sample 8 steps
                if i + 6 < tokens.len() {
                    let x1 = parse_f64(&tokens[i + 1]);
                    let y1 = parse_f64(&tokens[i + 2]);
                    let x2 = parse_f64(&tokens[i + 3]);
                    let y2 = parse_f64(&tokens[i + 4]);
                    let x3 = parse_f64(&tokens[i + 5]);
                    let y3 = parse_f64(&tokens[i + 6]);
                    for step in 1..=8 {
                        let t = step as f64 / 8.0;
                        let it = 1.0 - t;
                        let px = it.powi(3) * cx
                            + 3.0 * it.powi(2) * t * x1
                            + 3.0 * it * t.powi(2) * x2
                            + t.powi(3) * x3;
                        let py = it.powi(3) * cy
                            + 3.0 * it.powi(2) * t * y1
                            + 3.0 * it * t.powi(2) * y2
                            + t.powi(3) * y3;
                        points.push(Point { x: px, y: py });
                    }
                    cx = x3;
                    cy = y3;
                    i += 7;
                } else {
                    i += 1;
                }
            }
            "c" => {
                if i + 6 < tokens.len() {
                    let x1 = cx + parse_f64(&tokens[i + 1]);
                    let y1 = cy + parse_f64(&tokens[i + 2]);
                    let x2 = cx + parse_f64(&tokens[i + 3]);
                    let y2 = cy + parse_f64(&tokens[i + 4]);
                    let x3 = cx + parse_f64(&tokens[i + 5]);
                    let y3 = cy + parse_f64(&tokens[i + 6]);
                    for step in 1..=8 {
                        let t = step as f64 / 8.0;
                        let it = 1.0 - t;
                        let px = it.powi(3) * cx
                            + 3.0 * it.powi(2) * t * x1
                            + 3.0 * it * t.powi(2) * x2
                            + t.powi(3) * x3;
                        let py = it.powi(3) * cy
                            + 3.0 * it.powi(2) * t * y1
                            + 3.0 * it * t.powi(2) * y2
                            + t.powi(3) * y3;
                        points.push(Point { x: px, y: py });
                    }
                    cx = x3;
                    cy = y3;
                    i += 7;
                } else {
                    i += 1;
                }
            }
            "Q" => {
                // Quadratic bezier: sample 6 steps
                if i + 4 < tokens.len() {
                    let x1 = parse_f64(&tokens[i + 1]);
                    let y1 = parse_f64(&tokens[i + 2]);
                    let x2 = parse_f64(&tokens[i + 3]);
                    let y2 = parse_f64(&tokens[i + 4]);
                    for step in 1..=6 {
                        let t = step as f64 / 6.0;
                        let it = 1.0 - t;
                        let px = it.powi(2) * cx + 2.0 * it * t * x1 + t.powi(2) * x2;
                        let py = it.powi(2) * cy + 2.0 * it * t * y1 + t.powi(2) * y2;
                        points.push(Point { x: px, y: py });
                    }
                    cx = x2;
                    cy = y2;
                    i += 5;
                } else {
                    i += 1;
                }
            }
            "q" => {
                if i + 4 < tokens.len() {
                    let x1 = cx + parse_f64(&tokens[i + 1]);
                    let y1 = cy + parse_f64(&tokens[i + 2]);
                    let x2 = cx + parse_f64(&tokens[i + 3]);
                    let y2 = cy + parse_f64(&tokens[i + 4]);
                    for step in 1..=6 {
                        let t = step as f64 / 6.0;
                        let it = 1.0 - t;
                        let px = it.powi(2) * cx + 2.0 * it * t * x1 + t.powi(2) * x2;
                        let py = it.powi(2) * cy + 2.0 * it * t * y1 + t.powi(2) * y2;
                        points.push(Point { x: px, y: py });
                    }
                    cx = x2;
                    cy = y2;
                    i += 5;
                } else {
                    i += 1;
                }
            }
            "Z" | "z" => {
                cx = start_x;
                cy = start_y;
                i += 1;
            }
            _ => {
                i += 1;
            }
        }
    }

    points
}

/// Tokenize SVG path data into commands and numbers.
fn tokenize_path(d: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();

    for ch in d.chars() {
        if ch.is_ascii_alphabetic() {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
            tokens.push(ch.to_string());
        } else if ch == ',' || ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
        } else if ch == '-' && !current.is_empty() && !current.ends_with('e') && !current.ends_with('E') {
            // Negative sign starts a new number
            tokens.push(current.clone());
            current.clear();
            current.push(ch);
        } else {
            current.push(ch);
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }

    tokens
}

fn parse_f64(s: &str) -> f64 {
    s.parse().unwrap_or(0.0)
}

fn is_number(s: &str) -> bool {
    s.starts_with(|c: char| c.is_ascii_digit() || c == '-' || c == '.')
}

/// Try to detect a circle from points.
/// Returns Some if confidence >= 0.92.
fn detect_circle(points: &[Point]) -> Option<DetectedShape> {
    if points.len() < 6 {
        return None;
    }

    // Compute centroid
    let n = points.len() as f64;
    let cx = points.iter().map(|p| p.x).sum::<f64>() / n;
    let cy = points.iter().map(|p| p.y).sum::<f64>() / n;

    // Compute distances from centroid
    let dists: Vec<f64> = points
        .iter()
        .map(|p| ((p.x - cx).powi(2) + (p.y - cy).powi(2)).sqrt())
        .collect();

    let r = dists.iter().sum::<f64>() / n;
    if r < 1.0 {
        return None;
    }

    let std_dev = (dists.iter().map(|d| (d - r).powi(2)).sum::<f64>() / n).sqrt();
    let cv = std_dev / r;

    if cv >= 0.1 {
        return None;
    }

    // Check angular coverage > 270 degrees
    let mut angles: Vec<f64> = points
        .iter()
        .map(|p| (p.y - cy).atan2(p.x - cx))
        .collect();
    angles.sort_by(|a, b| a.partial_cmp(b).unwrap());

    let mut max_gap = 0.0f64;
    for i in 0..angles.len() {
        let next = if i + 1 < angles.len() {
            angles[i + 1]
        } else {
            angles[0] + std::f64::consts::TAU
        };
        let gap = next - angles[i];
        if gap > max_gap {
            max_gap = gap;
        }
    }

    let coverage = std::f64::consts::TAU - max_gap;
    if coverage < std::f64::consts::PI * 1.5 {
        return None;
    }

    let confidence = (1.0 - cv * 5.0).max(0.0);
    if confidence < 0.92 {
        return None;
    }

    Some(DetectedShape::Circle { cx, cy, r })
}

/// Try to detect an ellipse from points using PCA.
fn detect_ellipse(points: &[Point]) -> Option<DetectedShape> {
    if points.len() < 6 {
        return None;
    }

    let n = points.len() as f64;
    let cx = points.iter().map(|p| p.x).sum::<f64>() / n;
    let cy = points.iter().map(|p| p.y).sum::<f64>() / n;

    // Compute 2x2 covariance matrix
    let mut cxx = 0.0f64;
    let mut cxy = 0.0f64;
    let mut cyy = 0.0f64;
    for p in points {
        let dx = p.x - cx;
        let dy = p.y - cy;
        cxx += dx * dx;
        cxy += dx * dy;
        cyy += dy * dy;
    }
    cxx /= n;
    cxy /= n;
    cyy /= n;

    // Eigenvalues of 2x2 symmetric matrix
    let trace = cxx + cyy;
    let det = cxx * cyy - cxy * cxy;
    let disc = (trace * trace / 4.0 - det).max(0.0);
    let sqrt_disc = disc.sqrt();

    let ev1 = trace / 2.0 + sqrt_disc;
    let ev2 = trace / 2.0 - sqrt_disc;

    if ev1 <= 0.0 || ev2 <= 0.0 {
        return None;
    }

    let rx = (ev1.sqrt()) * 2.0;
    let ry = (ev2.sqrt()) * 2.0;

    let aspect = rx / ry;
    if aspect < 0.2 || aspect > 5.0 {
        return None;
    }

    // Compute rotation angle from eigenvector
    let angle = if cxy.abs() < 1e-10 {
        0.0
    } else {
        (cxy / (ev1 - cyy)).atan()
    };

    // Test ellipse fit: transform points to ellipse space and check distance
    let cos_a = angle.cos();
    let sin_a = angle.sin();

    let mut sum_normalized = 0.0f64;
    let mut sum_sq = 0.0f64;
    for p in points {
        let dx = p.x - cx;
        let dy = p.y - cy;
        let lx = cos_a * dx + sin_a * dy;
        let ly = -sin_a * dx + cos_a * dy;
        let val = (lx / rx).powi(2) + (ly / ry).powi(2);
        sum_normalized += val;
        sum_sq += (val - 0.25).powi(2);
    }

    let mean_normalized = sum_normalized / n;
    let std_normalized = (sum_sq / n).sqrt();

    if (mean_normalized - 0.25).abs() > 0.15 || std_normalized > 0.15 {
        return None;
    }

    let confidence =
        (1.0 - std_normalized * 3.0 - (mean_normalized - 0.25).abs() * 2.0).max(0.0);
    if confidence < 0.92 {
        return None;
    }

    Some(DetectedShape::Ellipse {
        cx,
        cy,
        rx,
        ry,
        angle: angle.to_degrees(),
    })
}

/// Try to detect a rectangle from points.
fn detect_rect(points: &[Point]) -> Option<DetectedShape> {
    if points.len() < 4 {
        return None;
    }

    // Compute bounding box
    let x_min = points.iter().map(|p| p.x).fold(f64::MAX, f64::min);
    let x_max = points.iter().map(|p| p.x).fold(f64::MIN, f64::max);
    let y_min = points.iter().map(|p| p.y).fold(f64::MAX, f64::min);
    let y_max = points.iter().map(|p| p.y).fold(f64::MIN, f64::max);

    let width = x_max - x_min;
    let height = y_max - y_min;

    if width < 2.0 || height < 2.0 {
        return None;
    }

    let tolerance = 0.02 * width.max(height);

    // Count points on edges vs interior
    let mut on_edge = 0;
    let mut interior = 0;
    for p in points {
        let on_left = (p.x - x_min).abs() < tolerance;
        let on_right = (p.x - x_max).abs() < tolerance;
        let on_top = (p.y - y_min).abs() < tolerance;
        let on_bottom = (p.y - y_max).abs() < tolerance;

        if on_left || on_right || on_top || on_bottom {
            on_edge += 1;
        } else {
            interior += 1;
        }
    }

    let edge_ratio = on_edge as f64 / points.len() as f64;
    if edge_ratio < 0.90 {
        return None;
    }

    // Strict: no interior points
    if interior > 0 {
        return None;
    }

    // Check corners: need points near at least 3 of 4 corners
    let corner_tol = tolerance * 3.0;
    let corners = [
        (x_min, y_min),
        (x_max, y_min),
        (x_min, y_max),
        (x_max, y_max),
    ];
    let corners_hit: usize = corners
        .iter()
        .filter(|(ccx, ccy)| {
            points
                .iter()
                .any(|p| (p.x - ccx).abs() < corner_tol && (p.y - ccy).abs() < corner_tol)
        })
        .count();

    if corners_hit < 3 {
        return None;
    }

    let confidence = (edge_ratio * (corners_hit as f64 / 4.0)).min(1.0);
    if confidence < 0.92 {
        return None;
    }

    Some(DetectedShape::Rect {
        x: x_min,
        y: y_min,
        width,
        height,
    })
}

/// Try to detect a shape from a path's points. Cascade: circle → ellipse → rect.
fn detect_shape(points: &[Point]) -> Option<DetectedShape> {
    if let Some(s) = detect_circle(points) {
        return Some(s);
    }
    if let Some(s) = detect_ellipse(points) {
        return Some(s);
    }
    detect_rect(points)
}

/// Process an SVG string: detect shapes in <path> elements and replace them.
pub fn detect_and_replace_shapes(svg: &str) -> String {
    let mut reader = Reader::from_str(svg);
    let mut writer = Writer::new(Cursor::new(Vec::new()));

    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Eof) => break,
            Ok(Event::Empty(ref e)) if e.name().as_ref() == b"path" => {
                // Try to detect shape from path's d attribute
                let d_attr = e.attributes().filter_map(|a| a.ok()).find(|a| {
                    a.key.as_ref() == b"d"
                });

                if let Some(d_attr) = d_attr {
                    let d_value = String::from_utf8_lossy(&d_attr.value).to_string();
                    let points = parse_path_points(&d_value);

                    if let Some(shape) = detect_shape(&points) {
                        // Collect non-d attributes (fill, style, etc.)
                        let attrs: Vec<(String, String)> = e
                            .attributes()
                            .filter_map(|a| a.ok())
                            .filter(|a| a.key.as_ref() != b"d")
                            .map(|a| {
                                (
                                    String::from_utf8_lossy(a.key.as_ref()).to_string(),
                                    String::from_utf8_lossy(&a.value).to_string(),
                                )
                            })
                            .collect();

                        match shape {
                            DetectedShape::Circle { cx, cy, r } => {
                                let mut elem = BytesStart::new("circle");
                                elem.push_attribute(("cx", format!("{:.2}", cx).as_str()));
                                elem.push_attribute(("cy", format!("{:.2}", cy).as_str()));
                                elem.push_attribute(("r", format!("{:.2}", r).as_str()));
                                for (k, v) in &attrs {
                                    elem.push_attribute((k.as_str(), v.as_str()));
                                }
                                writer.write_event(Event::Empty(elem)).ok();
                            }
                            DetectedShape::Ellipse { cx, cy, rx, ry, angle } => {
                                let mut elem = BytesStart::new("ellipse");
                                elem.push_attribute(("cx", format!("{:.2}", cx).as_str()));
                                elem.push_attribute(("cy", format!("{:.2}", cy).as_str()));
                                elem.push_attribute(("rx", format!("{:.2}", rx).as_str()));
                                elem.push_attribute(("ry", format!("{:.2}", ry).as_str()));
                                if angle.abs() > 0.5 {
                                    elem.push_attribute((
                                        "transform",
                                        format!("rotate({:.1} {:.2} {:.2})", angle, cx, cy)
                                            .as_str(),
                                    ));
                                }
                                for (k, v) in &attrs {
                                    elem.push_attribute((k.as_str(), v.as_str()));
                                }
                                writer.write_event(Event::Empty(elem)).ok();
                            }
                            DetectedShape::Rect { x, y, width, height } => {
                                let mut elem = BytesStart::new("rect");
                                elem.push_attribute(("x", format!("{:.2}", x).as_str()));
                                elem.push_attribute(("y", format!("{:.2}", y).as_str()));
                                elem.push_attribute((
                                    "width",
                                    format!("{:.2}", width).as_str(),
                                ));
                                elem.push_attribute((
                                    "height",
                                    format!("{:.2}", height).as_str(),
                                ));
                                for (k, v) in &attrs {
                                    elem.push_attribute((k.as_str(), v.as_str()));
                                }
                                writer.write_event(Event::Empty(elem)).ok();
                            }
                        }
                    } else {
                        // No shape detected, keep original path
                        writer.write_event(Event::Empty(e.to_owned())).ok();
                    }
                } else {
                    writer.write_event(Event::Empty(e.to_owned())).ok();
                }
            }
            Ok(event) => {
                writer.write_event(event).ok();
            }
            Err(_) => break,
        }
        buf.clear();
    }

    String::from_utf8(writer.into_inner().into_inner()).unwrap_or_else(|_| svg.to_string())
}
