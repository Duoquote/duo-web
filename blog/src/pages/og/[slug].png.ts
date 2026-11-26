import type { APIRoute, GetStaticPaths } from "astro";
import { getPosts, type Post } from "../../lib/posts";
import { renderOgPng } from "../../lib/og";
import { formatDate } from "../../lib/site";

// One title card per post that has no cover image.
export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return posts.filter((p) => !p.data.cover).map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: Post };
  const png = await renderOgPng({
    title: post.data.title,
    eyebrow: "blog.dq.ms",
    footer: `Güven Değirmenci · ${formatDate(post.data.date)}`,
  });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
