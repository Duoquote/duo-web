/// Streaming byte scanner that finds the `"features"` array in a GeoJSON file
/// and extracts each top-level feature object as a byte slice.
///
/// State machine:
///   SearchingForFeatures → WaitingForArrayOpen → BetweenFeatures ⇄ InsideFeature{depth}
///
/// Operates on raw bytes. Tracks JSON string state so braces/brackets inside
/// strings are ignored. Handles escape sequences (`\"`).

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Phase {
    /// Looking for `"features"` key outside any string
    SearchingForFeatures,
    /// Found `"features"`, waiting for `[`
    WaitingForArrayOpen,
    /// Inside the features array, between features
    BetweenFeatures,
    /// Inside a feature object at the given brace depth
    InsideFeature(u32),
}

pub struct Scanner {
    phase: Phase,
    /// Whether we are inside a JSON string literal
    in_string: bool,
    /// Previous byte was a backslash (escape)
    escaped: bool,
    /// Buffer holding the current partial feature
    buffer: Vec<u8>,
    /// Start offset of the current feature within `buffer`
    feature_start: usize,
    /// Ring buffer for keyword matching during SearchingForFeatures
    ring: [u8; KEYWORD_LEN],
    ring_pos: usize,
    ring_filled: usize,
}

/// The keyword we search for (with quotes)
const KEYWORD: &[u8] = b"\"features\"";
const KEYWORD_LEN: usize = 10;

impl Scanner {
    pub fn new() -> Self {
        Scanner {
            phase: Phase::SearchingForFeatures,
            in_string: false,
            escaped: false,
            buffer: Vec::with_capacity(64 * 1024),
            feature_start: 0,
            ring: [0u8; KEYWORD_LEN],
            ring_pos: 0,
            ring_filled: 0,
        }
    }

    /// Push a chunk of bytes. Calls `on_feature` for each complete feature
    /// byte slice found. Returns the number of features extracted.
    pub fn push_chunk(&mut self, chunk: &[u8], mut on_feature: impl FnMut(&[u8])) -> u32 {
        let mut count = 0u32;
        let mut i = 0;

        while i < chunk.len() {
            let b = chunk[i];

            match self.phase {
                Phase::SearchingForFeatures => {
                    // Track string state byte-by-byte so we never match
                    // `"features"` inside a JSON string value.
                    if self.in_string {
                        if self.escaped {
                            self.escaped = false;
                            self.ring_push(b);
                            i += 1;
                            continue;
                        }
                        match b {
                            b'\\' => {
                                self.escaped = true;
                                self.ring_push(b);
                                i += 1;
                                continue;
                            }
                            b'"' => {
                                // Closing quote — string ends
                                self.in_string = false;
                                self.ring_push(b);
                                // The keyword "features" ends with `"`, so check now
                                if self.ring_filled >= KEYWORD_LEN && self.ring_matches() {
                                    self.phase = Phase::WaitingForArrayOpen;
                                }
                                i += 1;
                                continue;
                            }
                            _ => {
                                self.ring_push(b);
                                i += 1;
                                continue;
                            }
                        }
                    }

                    // Outside a string
                    self.ring_push(b);

                    if b == b'"' {
                        self.in_string = true;
                    }
                    // No need to check ring_matches here — keyword starts with `"` which
                    // opens a string, so the match can only happen on the closing `"` above.

                    i += 1;
                }

                Phase::WaitingForArrayOpen => {
                    match b {
                        b'[' => {
                            self.phase = Phase::BetweenFeatures;
                            self.in_string = false;
                            self.escaped = false;
                            self.buffer.clear();
                            self.feature_start = 0;
                            i += 1;
                        }
                        // Skip whitespace and colon
                        b' ' | b'\t' | b'\n' | b'\r' | b':' => {
                            i += 1;
                        }
                        _ => {
                            // Not an array — false match, go back to searching
                            self.phase = Phase::SearchingForFeatures;
                            // Don't advance i; re-process this byte
                        }
                    }
                }

                Phase::BetweenFeatures | Phase::InsideFeature(_) => {
                    // Process the rest of this chunk as feature content
                    let remaining = &chunk[i..];
                    count += self.process_feature_bytes(remaining, &mut on_feature);
                    break; // process_feature_bytes consumes all remaining bytes
                }
            }
        }

        count
    }

    /// Push a byte into the ring buffer.
    fn ring_push(&mut self, b: u8) {
        self.ring[self.ring_pos] = b;
        self.ring_pos = (self.ring_pos + 1) % KEYWORD_LEN;
        if self.ring_filled < KEYWORD_LEN {
            self.ring_filled += 1;
        }
    }

    /// Check if the ring buffer currently matches the keyword.
    fn ring_matches(&self) -> bool {
        if self.ring_filled < KEYWORD_LEN {
            return false;
        }
        // ring_pos points to where the NEXT byte would be written,
        // so the oldest byte is at ring_pos (wrapping around).
        for k in 0..KEYWORD_LEN {
            let ring_idx = (self.ring_pos + k) % KEYWORD_LEN;
            if self.ring[ring_idx] != KEYWORD[k] {
                return false;
            }
        }
        true
    }

    fn process_feature_bytes(
        &mut self,
        data: &[u8],
        on_feature: &mut impl FnMut(&[u8]),
    ) -> u32 {
        self.buffer.extend_from_slice(data);
        let mut count = 0u32;

        let mut i = self.buffer.len() - data.len();
        while i < self.buffer.len() {
            let b = self.buffer[i];

            if self.in_string {
                if self.escaped {
                    self.escaped = false;
                    i += 1;
                    continue;
                }
                match b {
                    b'\\' => self.escaped = true,
                    b'"' => self.in_string = false,
                    _ => {}
                }
                i += 1;
                continue;
            }

            // Outside string
            match b {
                b'"' => self.in_string = true,
                b'{' => match self.phase {
                    Phase::BetweenFeatures => {
                        self.feature_start = i;
                        self.phase = Phase::InsideFeature(1);
                    }
                    Phase::InsideFeature(d) => {
                        self.phase = Phase::InsideFeature(d + 1);
                    }
                    _ => {}
                },
                b'}' => {
                    if let Phase::InsideFeature(d) = self.phase {
                        if d == 1 {
                            let feature_bytes =
                                self.buffer[self.feature_start..=i].to_vec();
                            on_feature(&feature_bytes);
                            count += 1;
                            self.phase = Phase::BetweenFeatures;
                        } else {
                            self.phase = Phase::InsideFeature(d - 1);
                        }
                    }
                }
                b']' => {
                    if self.phase == Phase::BetweenFeatures {
                        self.buffer.clear();
                        self.feature_start = 0;
                        self.phase = Phase::SearchingForFeatures;
                        return count;
                    }
                }
                _ => {}
            }

            i += 1;
        }

        // Buffer management: discard consumed bytes
        match self.phase {
            Phase::InsideFeature(_) => {
                if self.feature_start > 0 {
                    self.buffer.drain(..self.feature_start);
                    self.feature_start = 0;
                }
            }
            _ => {
                self.buffer.clear();
                self.feature_start = 0;
            }
        }

        count
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_feature_collection() {
        let input = br#"{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[1,2]},"properties":{"a":1}},{"type":"Feature","geometry":{"type":"Point","coordinates":[3,4]},"properties":{"b":2}}]}"#;

        let mut scanner = Scanner::new();
        let mut features: Vec<Vec<u8>> = Vec::new();

        scanner.push_chunk(input, |bytes| features.push(bytes.to_vec()));

        assert_eq!(features.len(), 2);
        let v: serde_json::Value = serde_json::from_slice(&features[0]).unwrap();
        assert_eq!(v["properties"]["a"], 1);
    }

    #[test]
    fn test_chunked_input() {
        let input = br#"{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[1,2]},"properties":{"name":"hello"}}]}"#;

        let mut scanner = Scanner::new();
        let mut features: Vec<Vec<u8>> = Vec::new();

        for chunk in input.chunks(10) {
            scanner.push_chunk(chunk, |bytes| features.push(bytes.to_vec()));
        }

        assert_eq!(features.len(), 1);
        let v: serde_json::Value = serde_json::from_slice(&features[0]).unwrap();
        assert_eq!(v["properties"]["name"], "hello");
    }

    #[test]
    fn test_very_small_chunks() {
        let input = br#"{"type":"FeatureCollection","features":[{"type":"Feature","geometry":null,"properties":{"x":1}}]}"#;

        let mut scanner = Scanner::new();
        let mut features: Vec<Vec<u8>> = Vec::new();

        for &b in input.iter() {
            scanner.push_chunk(&[b], |bytes| features.push(bytes.to_vec()));
        }

        assert_eq!(features.len(), 1);
    }

    #[test]
    fn test_features_keyword_inside_string_ignored() {
        let input = br#"{"name":"features","type":"FeatureCollection","features":[{"type":"Feature","geometry":null,"properties":{}}]}"#;

        let mut scanner = Scanner::new();
        let mut features: Vec<Vec<u8>> = Vec::new();

        scanner.push_chunk(input, |bytes| features.push(bytes.to_vec()));

        assert_eq!(features.len(), 1);
    }

    #[test]
    fn test_escaped_quotes_in_strings() {
        let input = br#"{"type":"FeatureCollection","features":[{"type":"Feature","geometry":null,"properties":{"desc":"a \"quoted\" value"}}]}"#;

        let mut scanner = Scanner::new();
        let mut features: Vec<Vec<u8>> = Vec::new();

        scanner.push_chunk(input, |bytes| features.push(bytes.to_vec()));

        assert_eq!(features.len(), 1);
    }

    #[test]
    fn test_multiple_features() {
        let input = br#"{"features":[{"type":"Feature","geometry":null,"properties":{"i":0}},{"type":"Feature","geometry":null,"properties":{"i":1}},{"type":"Feature","geometry":null,"properties":{"i":2}}]}"#;

        let mut scanner = Scanner::new();
        let mut features: Vec<Vec<u8>> = Vec::new();

        scanner.push_chunk(input, |bytes| features.push(bytes.to_vec()));

        assert_eq!(features.len(), 3);
    }

    #[test]
    fn test_features_value_string_not_array() {
        // "features" maps to a string — scanner should skip and find the real array later.
        let input = br#"{"features":"not_an_array","type":"FeatureCollection","features":[{"type":"Feature","geometry":null,"properties":{}}]}"#;

        let mut scanner = Scanner::new();
        let mut features: Vec<Vec<u8>> = Vec::new();

        scanner.push_chunk(input, |bytes| features.push(bytes.to_vec()));

        assert_eq!(features.len(), 1);
    }

    #[test]
    fn test_whitespace_before_array() {
        let input = br#"{ "features" : [ {"type":"Feature","geometry":null,"properties":{}} ] }"#;

        let mut scanner = Scanner::new();
        let mut features: Vec<Vec<u8>> = Vec::new();

        scanner.push_chunk(input, |bytes| features.push(bytes.to_vec()));

        assert_eq!(features.len(), 1);
    }
}
