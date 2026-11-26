import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { remarkPostChecks, rehypePostImages, emptyAltFallback } from "./src/lib/markdown.mjs";

/**
 * The blog is its own Astro project (served at blog.dq.ms) that shares the
 * repo's node_modules and design tokens with the main site. Build it from the
 * repo root with `bun run build:blog`; output lands in blog/dist.
 */
export default defineConfig({
  site: "https://blog.dq.ms",
  // One URL per page: /my-post, never /my-post/ or /my-post.html.
  // The Worker's html_handling ("drop-trailing-slash") matches this.
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [emptyAltFallback()],
  image: {
    // srcset + sizes for every optimized image, including Markdown ones
    layout: "constrained",
    responsiveStyles: true,
  },
  markdown: {
    // Render what was typed. No automatic curly quotes or dash conversion.
    smartypants: false,
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: false,
    },
    remarkPlugins: [remarkPostChecks],
    rehypePlugins: [
      rehypeHeadingIds,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          // not on the visually hidden "Footnotes" heading GFM adds
          test: (el) => !String(el.properties?.className ?? "").includes("sr-only"),
          properties: { className: ["heading-anchor"], ariaHidden: "true", tabIndex: -1 },
          content: { type: "text", value: "#" },
        },
      ],
      rehypePostImages,
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    // dev server: allow the shared theme in ../src/styles and the root node_modules
    server: { fs: { allow: [".."] } },
  },
});
