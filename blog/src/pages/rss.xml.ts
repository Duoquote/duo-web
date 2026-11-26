import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPosts, postUrl, describe } from "../lib/posts";
import { BLOG_DESCRIPTION, BLOG_NAME, SITE_URL } from "../lib/site";

export const GET: APIRoute = async () => {
  const posts = (await getPosts()).filter((p) => !p.data.draft);
  return rss({
    title: BLOG_NAME,
    description: BLOG_DESCRIPTION,
    site: SITE_URL,
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      link: postUrl(post),
      pubDate: post.data.date,
      description: describe(post, 300),
      categories: post.data.tags,
    })),
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData: `<language>en</language><atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>`,
  });
};
