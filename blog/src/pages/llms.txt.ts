import type { APIRoute } from "astro";
import { getPosts, postUrl, describe, summaryText, summaryNote } from "../lib/posts";
import { AUTHOR, BLOG_NAME, COMPANY, COPY, MAIN_SITE_URL, ROLE, SITE_URL, absolute } from "../lib/site";

// llms.txt (https://llmstxt.org): an H1, a one-paragraph summary in a
// blockquote, then link lists with one-line descriptions. Built from the same
// post collection as the pages, drafts excluded, so a new post shows up here
// on the next build.
export const GET: APIRoute = async () => {
  const posts = (await getPosts()).filter((p) => !p.data.draft);

  const lines = [
    `# ${BLOG_NAME}`,
    "",
    `> ${COPY.intro} Written by ${AUTHOR.name}, ${ROLE} at ${COMPANY}, based in Istanbul.`,
    "",
    "Every post is also available as plain Markdown: add `.md` to its URL, or send `Accept: text/markdown`.",
    "",
    "## Posts",
    "",
    ...(posts.length
      ? posts.flatMap((post) => {
          const line = `- [${post.data.title}](${absolute(postUrl(post) + ".md")}): ${describe(post)}`;
          const summary = summaryText(post, true);
          if (!summary) return [line];
          return [line, `  - ${COPY.summaryHeading} (${summaryNote(post)}): ${summary}`];
        })
      : ["No posts yet."]),
    "",
    "## Pages",
    "",
    `- [Blog home](${SITE_URL}/): all posts, newest first`,
    `- [All posts as Markdown](${absolute("/llms-full.txt")}): the full text of every post in one file`,
    `- [About me](${MAIN_SITE_URL}/): my main site, with my background and the tools I made`,
    "",
    "## Optional",
    "",
    `- [RSS feed](${absolute("/rss.xml")}): new posts`,
    `- [Sitemap](${absolute("/sitemap.xml")}): every page with its last change date`,
    `- [GitHub](${AUTHOR.sameAs[0]}): my code, including this blog`,
    `- [LinkedIn](${AUTHOR.sameAs[1]}): work history`,
    `- [Stack Overflow](${AUTHOR.sameAs[2]}): answers I've written`,
    "",
  ];

  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
