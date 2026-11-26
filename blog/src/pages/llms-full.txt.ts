import type { APIRoute } from "astro";
import { getPosts } from "../lib/posts";
import { postMarkdown } from "../lib/markdown-export";
import { AUTHOR, BLOG_NAME } from "../lib/site";

// Every published post as Markdown in one file, newest first.
export const GET: APIRoute = async () => {
  const posts = (await getPosts()).filter((p) => !p.data.draft);
  const parts = await Promise.all(posts.map(postMarkdown));
  const header = `# ${BLOG_NAME}\n\nAll posts by ${AUTHOR.name}, newest first.\n`;
  const body = parts.length ? parts.join("\n---\n\n") : "No posts yet.\n";
  return new Response(`${header}\n${body}`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
