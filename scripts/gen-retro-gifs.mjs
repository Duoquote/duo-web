// Generates the goofy 2005-era GIFs used by "retro mode".
// Run: bun scripts/gen-retro-gifs.mjs
// Output: public/retro/*.gif  (all opaque — no transparency needed)
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "retro");
mkdirSync(OUT, { recursive: true });

// ---- tiny pixel helpers -------------------------------------------------
function buf(w, h) {
  return new Uint8Array(w * h * 4);
}
function px(data, w, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = 255;
}
function hsv(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function write(name, frames, w, h, delay, opts = {}) {
  const gif = GIFEncoder();
  for (const rgba of frames) {
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, w, h, { palette, delay, ...opts });
  }
  gif.finish();
  writeFileSync(join(OUT, name), gif.bytes());
  console.log("  wrote", name, `(${frames.length} frames, ${w}x${h})`);
}

// ---- 1. tiled twinkling starfield background ---------------------------
function starfield() {
  const W = 96, H = 96, N = 10;
  // fixed star positions + colors + twinkle phase (deterministic)
  const stars = [];
  let seed = 1337;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    stars.push({
      x: Math.floor(rnd() * W),
      y: Math.floor(rnd() * H),
      phase: rnd(),
      col: rnd(),
      big: rnd() > 0.75,
    });
  }
  const frames = [];
  for (let f = 0; f < N; f++) {
    const d = buf(W, H);
    // deep space gradient
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) px(d, W, x, y, 8, 4, 34);
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin((f / N + s.phase) * Math.PI * 2);
      if (tw < 0.25) continue;
      const b = Math.round(120 + 135 * tw);
      let r = b, g = b, bl = b;
      if (s.col > 0.66) { r = b; g = Math.round(b * 0.5); bl = b; } // magenta
      else if (s.col > 0.33) { r = Math.round(b * 0.5); g = b; bl = b; } // cyan
      px(d, W, s.x, s.y, r, g, bl);
      if (s.big && tw > 0.6) {
        px(d, W, s.x + 1, s.y, r >> 1, g >> 1, bl >> 1);
        px(d, W, s.x - 1, s.y, r >> 1, g >> 1, bl >> 1);
        px(d, W, s.x, s.y + 1, r >> 1, g >> 1, bl >> 1);
        px(d, W, s.x, s.y - 1, r >> 1, g >> 1, bl >> 1);
      }
    }
    frames.push(d);
  }
  write("stars.gif", frames, W, H, 180);
}

// ---- 2. classic DOOM fire ----------------------------------------------
function flames() {
  const W = 70, H = 90, FR = 24;
  // 37-color doom fire palette
  const pal = [
    [7,7,7],[31,7,7],[47,15,7],[71,15,7],[87,23,7],[103,31,7],[119,31,7],
    [143,39,7],[159,47,7],[175,63,7],[191,71,7],[199,71,7],[223,79,7],
    [223,87,7],[223,87,7],[215,95,7],[215,95,7],[215,103,15],[207,111,15],
    [207,119,15],[207,127,15],[207,135,23],[199,135,23],[199,143,23],
    [199,151,31],[191,159,31],[191,159,31],[191,167,39],[191,167,39],
    [191,175,47],[183,175,47],[183,183,47],[183,183,55],[207,207,111],
    [223,223,159],[239,239,199],[255,255,255],
  ];
  const fire = new Int16Array(W * H).fill(0);
  for (let x = 0; x < W; x++) fire[(H - 1) * W + x] = 36; // bottom = white hot
  const spread = () => {
    for (let x = 0; x < W; x++) {
      for (let y = 1; y < H; y++) {
        const src = y * W + x;
        const v = fire[src];
        if (v === 0) { fire[src - W] = 0; continue; }
        const rand = Math.floor(Math.random() * 3) & 3;
        const dst = src - rand + 1 - W;
        if (dst >= 0) fire[dst] = v - (rand & 1);
      }
    }
  };
  for (let i = 0; i < 60; i++) spread(); // warm up
  const frames = [];
  for (let f = 0; f < FR; f++) {
    spread();
    const d = buf(W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const c = pal[Math.max(0, Math.min(36, fire[y * W + x]))];
        px(d, W, x, y, c[0], c[1], c[2]);
      }
    frames.push(d);
  }
  write("flames.gif", frames, W, H, 60);
}

// ---- 3. "under construction" barber-pole bar ---------------------------
function construction() {
  const W = 88, H = 22, SW = 8, FR = 8;
  const frames = [];
  for (let f = 0; f < FR; f++) {
    const d = buf(W, H);
    const off = f * 2;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const band = Math.floor((x + y + off) / SW) % 2 === 0;
        if (band) px(d, W, x, y, 255, 214, 0); // hazard yellow
        else px(d, W, x, y, 20, 20, 20); // black
      }
    // border
    for (let x = 0; x < W; x++) { px(d, W, x, 0, 0, 0, 0); px(d, W, x, H - 1, 0, 0, 0); }
    for (let y = 0; y < H; y++) { px(d, W, 0, y, 0, 0, 0); px(d, W, W - 1, y, 0, 0, 0); }
    frames.push(d);
  }
  write("construction.gif", frames, W, H, 90);
}

// ---- 4. scrolling rainbow divider (tiles horizontally) -----------------
function rainbow() {
  const W = 72, H = 10, FR = 18;
  const frames = [];
  for (let f = 0; f < FR; f++) {
    const d = buf(W, H);
    const off = (f / FR) * 360;
    for (let x = 0; x < W; x++) {
      const [r, g, b] = hsv((x / W) * 360 + off, 1, 1);
      for (let y = 0; y < H; y++) {
        // slight vertical bevel
        const shade = y === 0 || y === H - 1 ? 0.55 : 1;
        px(d, W, x, y, Math.round(r * shade), Math.round(g * shade), Math.round(b * shade));
      }
    }
    frames.push(d);
  }
  write("rainbow.gif", frames, W, H, 70);
}

console.log("Generating retro GIFs ->", OUT);
starfield();
flames();
construction();
rainbow();
console.log("Done.");
