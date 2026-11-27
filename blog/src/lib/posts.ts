import { getCollection, type CollectionEntry } from "astro:content";
import { COPY, SHOW_DRAFTS } from "./site";

export type Post = CollectionEntry<"posts">;

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("posts", (p) => SHOW_DRAFTS || !p.data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function postUrl(post: Post) {
  return `/${post.id}`;
}

/** The newer of `updated` / `lastmod`, else the publish date. */
export function modifiedDate(post: Post): Date {
  const candidates = [post.data.updated, post.data.lastmod].filter(Boolean) as Date[];
  if (!candidates.length) return post.data.date;
  return new Date(Math.max(...candidates.map((d) => d.getTime())));
}

export function isUpdated(post: Post) {
  return modifiedDate(post).getTime() !== post.data.date.getTime();
}

/** The front matter summary as a list of points (a plain string is one point). */
export function summaryPoints(post: Post): string[] {
  const { summary } = post.data;
  if (!summary) return [];
  return (Array.isArray(summary) ? summary : [summary]).map((s) => s.trim()).filter(Boolean);
}

/** The summary as one line of text, without backticks unless `keepCode`. Empty when there's none. */
export function summaryText(post: Post, keepCode = false): string {
  return summaryPoints(post)
    .map((s) => (keepCode ? s : s.replace(/`([^`]+)`/g, "$1")))
    .map((s) => (/[.?!]$/.test(s) ? s : s + "."))
    .join(" ");
}

/** "Summarized with AI" or "Summarized by the author". */
export function summaryNote(post: Post): string {
  return post.data.summaryBy === "author" ? COPY.summaryByAuthor : COPY.summaryByAi;
}

/** Front matter description, else the summary, else the first paragraph of the body as plain text. */
export function describe(post: Post, max = 160): string {
  if (post.data.description) return post.data.description;
  const summary = summaryText(post);
  if (summary) return clip(summary, max);
  return excerpt(post.body ?? "", max);
}

export function excerpt(markdown: string, max = 160): string {
  const paragraph =
    markdown
      .replace(/\r\n/g, "\n")
      .replace(/^(```|~~~)[\s\S]*?^\1/gm, "") // fenced code
      .replace(/<!--[\s\S]*?-->/g, "")
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .find(
        (block) =>
          block &&
          !/^(#{1,6}\s|[|>]|!\[|<|[-*+]\s|\d+\.\s|\[\^)/.test(block) &&
          !/^[-*_]{3,}$/.test(block),
      ) ?? "";

  const text = paragraph
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__|\*|_|~~)(.+?)\1/g, "$2")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return clip(text, max);
}

/** Cut plain text to at most `max` characters at a word boundary, with an ellipsis. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : cut.length).replace(/[,;:.]$/, "") + "…";
}
