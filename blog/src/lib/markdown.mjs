// Markdown plugins for blog posts. Plain .mjs so astro.config.mjs can import it.

import path from "node:path";

function where(file) {
  if (!file?.path) return "a post";
  return path.relative(process.cwd(), file.path).replaceAll("\\", "/");
}

function warn(file, message) {
  console.warn(`\x1b[33m[blog]\x1b[0m ${where(file)}: ${message}`);
}

function textOf(node) {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

function walk(node, fn, parent = null) {
  fn(node, parent);
  for (const child of node.children ?? []) walk(child, fn, node);
}

/**
 * remark (mdast) checks:
 * - warn about images without alt text
 * - the page title is the only <h1>: drop a leading "# Title" that repeats
 *   the front matter title, and demote headings if the body uses other h1s
 * - warn when heading levels skip (## then ####)
 */
export function remarkPostChecks() {
  return (tree, file) => {
    const frontmatter = file.data?.astro?.frontmatter ?? {};

    walk(tree, (node) => {
      if (node.type === "image" && !node.alt?.trim()) {
        warn(file, `image "${node.url}" has no alt text. Describe it: ![what it shows](${node.url})`);
      }
      if (node.type === "imageReference" && !node.alt?.trim()) {
        warn(file, `image reference "${node.identifier}" has no alt text`);
      }
    });

    const first = tree.children.find((n) => n.type !== "yaml" && n.type !== "html");
    if (
      first?.type === "heading" &&
      first.depth === 1 &&
      frontmatter.title &&
      textOf(first).trim() === String(frontmatter.title).trim()
    ) {
      tree.children.splice(tree.children.indexOf(first), 1);
    }

    const headings = [];
    walk(tree, (node) => {
      if (node.type === "heading") headings.push(node);
    });

    if (headings.some((h) => h.depth === 1)) {
      warn(file, "uses '#' headings. The post title is the page's h1, so all headings were moved down one level. Start sections with '##'.");
      for (const h of headings) h.depth = Math.min(h.depth + 1, 6);
    }

    let previous = 1;
    for (const h of headings) {
      if (h.depth > previous + 1) {
        warn(file, `heading "${textOf(h)}" jumps from h${previous} to h${h.depth}`);
      }
      previous = h.depth;
    }
  };
}

const isLocal = (src) => typeof src === "string" && !/^(?:[a-z]+:)?\/\//i.test(src) && !src.startsWith("/") && !src.startsWith("data:");

const isBlank = (node) => node.type === "text" && !node.value.trim();

/** "./chart-dark.png" or "./chart.dark.png": the dark-theme version of the image before it. */
export const isDarkVariant = (src) => typeof src === "string" && /[-.]dark\.(?:png|jpe?g|webp|gif|avif|svg)$/i.test(src);

/**
 * rehype (hast) image handling, run before Astro's own image pass:
 * - an image alone in a paragraph becomes <figure>; its Markdown title,
 *   ![alt](./x.png "Caption"), becomes the <figcaption>
 * - two images on one line, the second named *-dark.png, become one figure
 *   that shows the light or the dark one to match the theme (see blog.css)
 * - the first image loads eagerly with high priority when the post has no
 *   cover (with a cover, the cover is the LCP image); the rest lazy-load
 * - local images get a `sizes` that matches the article column, so the
 *   browser picks a srcset candidate for ~720px instead of the full width
 */
export function rehypePostImages() {
  return (tree, file) => {
    const frontmatter = file.data?.astro?.frontmatter ?? {};
    let first = !frontmatter.cover;

    walk(tree, (node) => {
      if (node.type !== "element" || node.tagName !== "p") return;
      const meaningful = node.children.filter((c) => !isBlank(c));
      const isImg = (n) => n?.type === "element" && n.tagName === "img";
      const [img, dark] = meaningful;
      if (!isImg(img)) return;
      // ![alt](./chart.png "Caption") ![alt](./chart-dark.png): one figure, CSS shows the one for the theme
      const pair = meaningful.length === 2 && isImg(dark) && isDarkVariant(dark.properties.src);
      if (meaningful.length !== 1 && !pair) return;

      const caption = img.properties.title;
      delete img.properties.title;
      node.tagName = "figure";
      if (pair) {
        delete dark.properties.title;
        const wrap = (child, className) => ({ type: "element", tagName: "span", properties: { className: [className] }, children: [child] });
        node.children = [wrap(img, "img-light"), wrap(dark, "img-dark")];
      } else {
        node.children = [img];
      }
      if (caption) {
        node.children.push({
          type: "element",
          tagName: "figcaption",
          properties: {},
          children: [{ type: "text", value: String(caption) }],
        });
      }
    });

    walk(tree, (node) => {
      if (node.type !== "element" || node.tagName !== "img") return;
      const props = node.properties;
      if (typeof props.alt !== "string") props.alt = "";
      if (isLocal(props.src)) {
        // read by Astro's getImage(), not written out as attributes
        props.sizes ??= "(min-width: 800px) 720px, 100vw";
        if (first) props.priority = true;
      } else {
        // not optimized by Astro (remote or /public): set loading by hand
        props.loading = first ? "eager" : "lazy";
        props.decoding = "async";
        if (first) props.fetchpriority = "high";
      }
      first = false;
    });
  };
}

/**
 * Astro drops empty attributes when it writes optimized Markdown images, so an
 * image with no alt text ends up with no alt attribute at all (invalid HTML,
 * and screen readers read the file name). After the build, give any <img>
 * without an alt an empty one. remarkPostChecks has already warned about it.
 */
export function emptyAltFallback() {
  return {
    name: "blog:empty-alt-fallback",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const { readdir, readFile, writeFile } = await import("node:fs/promises");
        const { fileURLToPath } = await import("node:url");
        const root = fileURLToPath(dir);
        const files = (await readdir(root, { recursive: true })).filter((f) => f.endsWith(".html"));
        for (const file of files) {
          const full = path.join(root, file);
          const html = await readFile(full, "utf8");
          const fixed = html.replace(/<img\b(?![^>]*\salt(?:[\s=>]|$))/gi, '<img alt=""');
          if (fixed !== html) await writeFile(full, fixed);
        }
      },
    },
  };
}

/**
 * Astro emits the original file of every image a collection entry imports,
 * drafts included, even when no page uses it. After the build, delete files in
 * _astro/ that no HTML, CSS, JS, XML, Markdown or text file references, so draft images and
 * unused originals don't end up on the server.
 */
export function pruneUnusedAssets() {
  return {
    name: "blog:prune-unused-assets",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const { readdir, readFile, rm } = await import("node:fs/promises");
        const { fileURLToPath } = await import("node:url");
        const root = fileURLToPath(dir);
        const all = (await readdir(root, { recursive: true })).map((f) => f.split(path.sep).join("/"));
        const assets = all.filter((f) => f.startsWith("_astro/") && !f.slice(7).includes("/"));
        const texts = all.filter((f) => /\.(html|css|js|mjs|xml|md|txt)$/.test(f));
        let haystack = "";
        for (const f of texts) haystack += await readFile(path.join(root, f), "utf8");
        const unused = assets.filter((f) => !/\.(css|js|mjs)$/.test(f) && !haystack.includes(path.basename(f)));
        for (const f of unused) await rm(path.join(root, f));
        if (unused.length) logger.info(`removed ${unused.length} unreferenced asset(s)`);
      },
    },
  };
}
