// Plain Markdown versions of posts, for /<slug>.md, llms.txt and llms-full.txt.
// The post body is the source file as written; only relative image links are
// rewritten to the optimized images on the site, so they work outside the repo.

import path from "node:path";
import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import { AUTHOR, COPY, absolute, formatDate } from "./site";
import { postUrl, describe, modifiedDate, isUpdated, summaryPoints, summaryNote, type Post } from "./posts";
import { isDarkVariant } from "./markdown.mjs";

const images = import.meta.glob<ImageMetadata>("/posts/**/*.{png,jpg,jpeg,webp,gif,avif,tiff}", {
  eager: true,
  import: "default",
});

/** "/posts/my-post/shapes.png" -> absolute URL of a WebP at most 1440px wide. */
async function optimizedUrl(key: string): Promise<string | undefined> {
  const meta = images[key];
  if (!meta) return undefined;
  const img = await getImage({
    src: meta,
    width: Math.min(meta.width, 1440),
    format: "webp",
    layout: "none",
  });
  return absolute(img.src);
}

async function rewriteImages(post: Post, body: string): Promise<string> {
  // post.filePath is relative to the blog root, e.g. "posts/my-post/index.md"
  const dir = path.posix.dirname("/" + (post.filePath ?? "").replace(/\\/g, "/"));
  const pattern = /(!\[[^\]]*\]\()(\.{1,2}\/[^)\s]+|[^)\s:]+\.(?:png|jpe?g|webp|gif|avif|tiff))((?:\s+"[^"]*")?\))/gi;
  const matches = [...body.matchAll(pattern)];
  const urls = await Promise.all(
    matches.map((m) => optimizedUrl(path.posix.normalize(path.posix.join(dir, decodeURI(m[2]))))),
  );
  let i = 0;
  return body.replace(pattern, (whole, open, _src, close) => {
    const url = urls[i++];
    return url ? `${open}${url}${close}` : whole;
  });
}

export async function postMarkdown(post: Post): Promise<string> {
  const url = absolute(postUrl(post));
  const meta = [
    `By ${AUTHOR.name} (${AUTHOR.url})`,
    `Published ${formatDate(post.data.date)}`,
    ...(isUpdated(post) ? [`Updated ${formatDate(modifiedDate(post))}`] : []),
    ...(post.data.tags.length ? [`Tags: ${post.data.tags.join(", ")}`] : []),
  ].join(" · ");

  // the dark-theme copy of an image adds nothing in plain Markdown
  const source = (post.body ?? "")
    .trim()
    .replace(/[ \t]*!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (img, src) => (isDarkVariant(src) ? "" : img));
  const body = await rewriteImages(post, source);

  const points = summaryPoints(post);
  const summary = points.length
    ? [`## ${COPY.summaryHeading}`, "", `_${summaryNote(post)}_`, "", ...points.map((p) => `- ${p}`), ""]
    : [];
  // a leading "# Title" in the source would duplicate the heading added here
  const withoutTitle = body.replace(/^#\s+(.+)\n+/, (line, text) =>
    text.trim() === post.data.title.trim() ? "" : line,
  );

  return [
    `# ${post.data.title}`,
    "",
    `> ${describe(post, 300)}`,
    "",
    meta,
    "",
    `Canonical: ${url}`,
    "",
    ...summary,
    withoutTitle,
    "",
  ].join("\n");
}
