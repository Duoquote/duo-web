// Site-wide constants and copy. All user-facing text on the blog lives here
// or in the page templates; post text lives in blog/posts.

export const SITE_URL = "https://blog.dq.ms";
export const MAIN_SITE_URL = "https://dq.ms";
export const REPO_URL = "https://github.com/Duoquote/duo-web";

export const AUTHOR = {
  name: "Güven Değirmenci",
  url: MAIN_SITE_URL,
  sameAs: [
    "https://github.com/duoquote",
    "https://www.linkedin.com/in/duoquote/",
    "https://stackoverflow.com/users/7493063/guven-degirmenci",
  ],
};

export const BLOG_NAME = "Güven Değirmenci's blog";
export const BLOG_TITLE = "Blog · Güven Değirmenci";

export const BLOG_DESCRIPTION =
  "Güven Değirmenci's blog. Notes on things I build and the problems I run into along the way.";

export const COPY = {
  intro: "Notes on things I build and the problems I run into along the way.",
  // rendered with a link to the repo on "duo-web"
  source: "Each post is a plain Markdown file in the duo-web repo.",
  about:
    "I'm Güven Değirmenci, a developer in Istanbul and Managing Partner at Next Geo. My tools and the rest of my work are on dq.ms.",
  empty: "No posts yet.",
  notFoundTitle: "Page not found",
  notFoundBody: "There's nothing at this address. The link may be wrong, or the post moved.",
};

/** Drafts render in `astro dev`, or in a build with BLOG_DRAFTS=1. Never in a normal build. */
export const SHOW_DRAFTS = import.meta.env.DEV || process.env.BLOG_DRAFTS === "1";

export function absolute(path: string) {
  return new URL(path, SITE_URL).toString();
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "26 Nov 2026", in UTC so a date-only front matter value never shifts a day. */
export function formatDate(date: Date) {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
