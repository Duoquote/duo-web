// Build-time Open Graph images: the title on a plain template, rendered with
// satori (layout + text to SVG paths) and sharp (SVG to PNG). Runs only during
// the static build, so none of this ships to the browser.

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { getImage } from "astro:assets";
import type { Post } from "./posts";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const require = createRequire(path.join(process.cwd(), "package.json"));

async function font(file: string) {
  return readFile(require.resolve(`@fontsource/google-sans/files/${file}`));
}

let fontsPromise: Promise<Parameters<typeof satori>[1]["fonts"]> | undefined;
function fonts() {
  fontsPromise ??= (async () => [
    { name: "Google Sans", weight: 400, style: "normal", data: await font("google-sans-latin-400-normal.woff") },
    { name: "Google Sans Ext", weight: 400, style: "normal", data: await font("google-sans-latin-ext-400-normal.woff") },
    { name: "Google Sans", weight: 700, style: "normal", data: await font("google-sans-latin-700-normal.woff") },
    { name: "Google Sans Ext", weight: 700, style: "normal", data: await font("google-sans-latin-ext-700-normal.woff") },
  ])();
  return fontsPromise;
}

let logoPromise: Promise<string> | undefined;
function logo() {
  // cwd is the repo root for `bun run build:blog`, or blog/ when run from there
  logoPromise ??= readFile(path.join(process.cwd(), "blog", "public", "logo.svg"))
    .catch(() => readFile(path.join(process.cwd(), "public", "logo.svg")))
    .then((svg) => `data:image/svg+xml;base64,${svg.toString("base64")}`);
  return logoPromise;
}

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

export async function renderOgPng({ title, eyebrow, footer }: { title: string; eyebrow: string; footer: string }) {
  const size = title.length > 80 ? 52 : title.length > 45 ? 62 : 72;

  const tree = h(
    "div",
    {
      // satori sizes boxes like content-box, so subtract the padding
      width: OG_WIDTH - 160,
      height: OG_HEIGHT - 144,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "72px 80px",
      background: "#0a0a0a",
      backgroundImage:
        "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
      backgroundSize: "72px 72px",
      color: "#fafafa",
      fontFamily: "Google Sans, Google Sans Ext",
    },
    [
      h("div", { display: "flex", alignItems: "center", gap: 18 }, [
        { type: "img", props: { src: await logo(), width: 48, height: 48 } },
        h("div", { fontSize: 28, color: "#a1a1a1", letterSpacing: "0.02em" }, eyebrow),
      ]),
      h(
        "div",
        { display: "flex", fontSize: size, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", maxWidth: 1000 },
        title,
      ),
      h("div", { display: "flex", alignItems: "center", gap: 20 }, [
        h("div", { width: 56, height: 4, background: "#ff2056" }),
        h("div", { fontSize: 28, color: "#d4d4d4" }, footer),
      ]),
    ],
  );

  const svg = await satori(tree as never, { width: OG_WIDTH, height: OG_HEIGHT, fonts: await fonts() });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
}

export type OgImage = { url: string; width: number; height: number; alt: string };

/** The post's cover cropped to 1200x630, or its generated title card. */
export async function ogImageFor(post: Post): Promise<OgImage> {
  if (post.data.cover) {
    const img = await getImage({
      src: post.data.cover,
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fit: "cover",
      format: "jpg",
      quality: 82,
      layout: "none",
    });
    return {
      url: img.src,
      width: OG_WIDTH,
      height: OG_HEIGHT,
      alt: post.data.coverAlt ?? post.data.title,
    };
  }
  return { url: `/og/${post.id}.png`, width: OG_WIDTH, height: OG_HEIGHT, alt: post.data.title };
}

export const SITE_OG_IMAGE: OgImage = {
  url: "/og.png",
  width: OG_WIDTH,
  height: OG_HEIGHT,
  alt: "Güven Değirmenci's blog",
};
