// Prints a prompt for writing a post's TL;DR summary. It calls no API: paste
// the output into Claude (or any agent), check the answer against the post,
// and put it in the post's front matter as `summary`.
//
//   bun run summarize <slug>      e.g. bun run summarize polytini

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const posts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "posts");
const slug = process.argv[2];

if (!slug) {
  console.error("Usage: bun run summarize <slug>   (the post's file or folder name in blog/posts)");
  process.exit(1);
}

const file = [path.join(posts, slug, "index.md"), path.join(posts, `${slug}.md`)].find(existsSync);
if (!file) {
  console.error(`No post found at blog/posts/${slug}/index.md or blog/posts/${slug}.md`);
  process.exit(1);
}

const post = readFileSync(file, "utf8").replace(/\r\n/g, "\n");

console.log(`Write a TL;DR summary for the blog post below. It goes in a box at the top of the post, labelled "Summarized with AI".

Rules:
- 2 to 4 short bullet points, or 1 to 2 sentences.
- It must stand alone for someone who reads nothing else: what the thing is, the main result with its real numbers, who it's for, and how to get it if the post says.
- Add nothing the post doesn't say. No new numbers, claims or opinions.
- Same plain voice as the post. No hype words, no em dashes, no emoji, no exclamation marks, no "In this post".
- Plain text. Inline code in backticks is fine; no bold, no links.

Reply with only the YAML to paste into the front matter, like this:

summary:
  - "First point."
  - "Second point."

The post (${path.relative(process.cwd(), file).replaceAll("\\", "/")}):

${post}`);
