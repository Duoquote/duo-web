import type { APIRoute, GetStaticPaths } from "astro";
import { getPosts, type Post } from "../lib/posts";
import { postMarkdown } from "../lib/markdown-export";

// /<slug>.md: the post as plain Markdown, for agents and answer engines.
// The Worker also serves it for /<slug> when a client sends Accept: text/markdown.
export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: Post };
  return new Response(await postMarkdown(post), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
