import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Posts live in blog/posts as plain Markdown:
 *
 *   posts/my-post.md            a post with no images
 *   posts/my-post/index.md      a post with images next to it (./diagram.png)
 *
 * The file or folder name is the URL: blog.dq.ms/my-post.
 * Files and folders starting with "_" are ignored.
 */
function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const posts = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/_*", "!**/_*/**"],
    base: "./posts",
    generateId: ({ entry, data }) => {
      if (typeof data.slug === "string" && data.slug) return data.slug;
      const name = entry
        .replace(/\\/g, "/")
        .replace(/(^|\/)index\.md$/i, "")
        .replace(/\.md$/i, "")
        .split("/")
        .pop()!;
      return slugify(name);
    },
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      /** Used for <meta name="description">, OG and the post list. Falls back to an excerpt. */
      description: z.string().optional(),
      date: z.coerce.date(),
      /** Last meaningful edit. Shows on the post, and feeds dateModified and the sitemap. */
      updated: z.coerce.date().optional(),
      /** Alias for `updated`. */
      lastmod: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      /** Relative to the post file, e.g. ./cover.jpg. Also the og:image. */
      cover: image().optional(),
      coverAlt: z.string().optional(),
      draft: z.boolean().default(false),
      /** Override the URL. Defaults to the file or folder name. */
      slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: lowercase letters, digits and dashes only")
        .optional(),
      lang: z.enum(["en", "tr"]).default("en"),
    }),
});

export const collections = { posts };
