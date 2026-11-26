// Deploy blog/dist to the duo-blog Worker, then tell IndexNow (Bing, Yandex,
// Seznam, Naver, Yep and others share submissions) which URLs changed.
//
//   bun blog/scripts/deploy.mjs          after `bun run build:blog`
//   INDEXNOW=0 bun blog/scripts/deploy.mjs   deploy without pinging
//
// "Changed" means: in the new sitemap but not the live one, or with a newer
// <lastmod>. URLs that disappeared are submitted too, so engines drop them.
// The live sitemap is read before deploying, so this works the same from a
// laptop or from Cloudflare Workers Builds.

import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://blog.dq.ms";
const blogDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(blogDir, "dist");

function parseSitemap(xml) {
  const map = new Map();
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? "";
    if (loc) map.set(loc, lastmod);
  }
  return map;
}

async function liveSitemap() {
  try {
    const res = await fetch(`${SITE}/sitemap.xml`, { headers: { "Cache-Control": "no-cache" } });
    return res.ok ? parseSitemap(await res.text()) : new Map();
  } catch {
    return new Map();
  }
}

async function indexNowKey() {
  const files = await readdir(path.join(blogDir, "public"));
  const keyFile = files.find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
  if (!keyFile) return undefined;
  return (await readFile(path.join(blogDir, "public", keyFile), "utf8")).trim();
}

const next = parseSitemap(await readFile(path.join(dist, "sitemap.xml"), "utf8"));
const before = await liveSitemap();

const changed = [...next].filter(([loc, lastmod]) => before.get(loc) !== lastmod).map(([loc]) => loc);
const removed = [...before.keys()].filter((loc) => !next.has(loc));
const urls = [...changed, ...removed];

const deploy = spawnSync("npx", ["wrangler", "deploy", "--config", path.join(blogDir, "wrangler.jsonc")], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (deploy.status !== 0) process.exit(deploy.status ?? 1);

if (process.env.INDEXNOW === "0") {
  console.log("IndexNow: skipped (INDEXNOW=0)");
} else if (!urls.length) {
  console.log("IndexNow: no changed URLs");
} else {
  const key = await indexNowKey();
  if (!key) {
    console.warn("IndexNow: no key file in blog/public, skipping");
  } else {
    try {
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: new URL(SITE).host,
          key,
          keyLocation: `${SITE}/${key}.txt`,
          urlList: urls,
        }),
      });
      // 200 = accepted, 202 = accepted while the key is being verified
      console.log(`IndexNow: ${res.status} for ${urls.length} URL(s)`);
      for (const url of urls) console.log(`  ${url}`);
    } catch (err) {
      // the site is already deployed; a failed ping shouldn't fail the deploy
      console.warn(`IndexNow: request failed (${err})`);
    }
  }
}
