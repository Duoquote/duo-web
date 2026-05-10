import { readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const dir = "dist/_astro";

let removed = 0;
let totalBytes = 0;

try {
  for (const file of readdirSync(dir)) {
    if (/^ort-wasm.*\.wasm$/.test(file)) {
      const path = join(dir, file);
      totalBytes += statSync(path).size;
      unlinkSync(path);
      removed++;
      console.log(`removed ${path}`);
    }
  }
} catch (err) {
  if (err.code === "ENOENT") {
    console.log(`${dir} not found, skipping`);
    process.exit(0);
  }
  throw err;
}

const mb = (totalBytes / 1024 / 1024).toFixed(2);
console.log(`cleaned ${removed} ort-wasm file(s), ${mb} MB freed`);
console.log("(loaded from CDN at runtime via ort.env.wasm.wasmPaths)");
