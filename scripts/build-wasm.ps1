$ErrorActionPreference = "Stop"

$crates = @(
  @{ Name = "geo-parser"; Crate = "wasm/geo-parser"; Binary = "geo_parser" },
  @{ Name = "imvector";   Crate = "wasm/imvector";   Binary = "imvector" }
)

foreach ($c in $crates) {
  $CRATE = $c.Crate
  $OUT = "$CRATE/pkg"
  $BIN = $c.Binary

  Write-Host "`n=== Building $($c.Name) ===" -ForegroundColor Cyan

  Write-Host "Compiling Rust to WASM..."
  cargo build --release --target wasm32-unknown-unknown --manifest-path "$CRATE/Cargo.toml"

  Write-Host "Running wasm-bindgen..."
  wasm-bindgen --target web --out-dir $OUT `
    "$CRATE/target/wasm32-unknown-unknown/release/$BIN.wasm"

  if (Get-Command wasm-opt -ErrorAction SilentlyContinue) {
    Write-Host "Optimizing with wasm-opt..."
    wasm-opt -Oz "$OUT/${BIN}_bg.wasm" -o "$OUT/${BIN}_bg.wasm"
  } else {
    Write-Host "wasm-opt not found, skipping optimization."
  }

  Write-Host "Done: $($c.Name)"
  Get-ChildItem $OUT | Format-Table Name, Length
}
