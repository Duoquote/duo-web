$ErrorActionPreference = "Stop"
$CRATE = "wasm/geo-parser"
$OUT = "$CRATE/pkg"

Write-Host "Building Rust WASM..."
cargo build --release --target wasm32-unknown-unknown --manifest-path "$CRATE/Cargo.toml"

Write-Host "Running wasm-bindgen..."
wasm-bindgen --target web --out-dir $OUT `
  "$CRATE/target/wasm32-unknown-unknown/release/geo_parser.wasm"

if (Get-Command wasm-opt -ErrorAction SilentlyContinue) {
  Write-Host "Optimizing with wasm-opt..."
  wasm-opt -Oz "$OUT/geo_parser_bg.wasm" -o "$OUT/geo_parser_bg.wasm"
} else {
  Write-Host "wasm-opt not found, skipping optimization."
}

Write-Host "Done."
Get-ChildItem $OUT | Format-Table Name, Length
