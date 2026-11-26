import type { APIRoute } from "astro";
import { getPosts, postUrl, modifiedDate } from "../lib/posts";
import { absolute } from "../lib/site";

// Hand-written instead of @astrojs/sitemap so each post's <lastmod> comes
// from its front matter (`updated` / `lastmod`, else `date`).
export const GET: APIRoute = async () => {
  const posts = (await getPosts()).filter((p) => !p.data.draft);

  const newest = posts.reduce<Date | undefined>((acc, p) => {
    const d = modifiedDate(p);
    return !acc || d > acc ? d : acc;
  }, undefined);

  const entries = [
    { loc: absolute("/"), lastmod: newest },
    ...posts.map((p) => ({ loc: absolute(postUrl(p)), lastmod: modifiedDate(p) })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map(
        (e) =>
          `  <url>\n    <loc>${e.loc}</loc>\n` +
          (e.lastmod ? `    <lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>\n` : "") +
          `  </url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
