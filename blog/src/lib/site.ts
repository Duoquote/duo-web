// Site-wide constants and copy. All user-facing text on the blog lives here
// or in the page templates; post text lives in blog/posts.

export const SITE_URL = "https://blog.dq.ms";
export const MAIN_SITE_URL = "https://dq.ms";
export const REPO_URL = "https://github.com/Duoquote/duo-web";

/**
 * The author's role. This is the one place to change it: the about line,
 * llms.txt and the structured data all read from here.
 */
export const ROLE = "CTO and Managing Partner";
/** As written on dq.ms. NextGeography is the full name, used in structured data. */
export const COMPANY = "Next Geo";
export const COMPANY_FULL_NAME = "NextGeography";

export const AUTHOR = {
  name: "Güven Değirmenci",
  url: MAIN_SITE_URL,
  sameAs: [
    "https://github.com/duoquote",
    "https://www.linkedin.com/in/duoquote/",
    "https://stackoverflow.com/users/7493063/guven-degirmenci",
  ],
};

/**
 * schema.org Person for the author. The @id matches the Person on dq.ms, so
 * search engines can tell the blog author and the main site are one person.
 */
export const PERSON_JSONLD = {
  "@type": "Person",
  "@id": `${MAIN_SITE_URL}/#person`,
  name: AUTHOR.name,
  url: AUTHOR.url,
  jobTitle: ROLE,
  worksFor: { "@type": "Organization", name: COMPANY, alternateName: COMPANY_FULL_NAME },
  sameAs: AUTHOR.sameAs,
};

export const BLOG_NAME = "Güven Değirmenci's blog";
export const BLOG_TITLE = "Blog · Güven Değirmenci";

export const BLOG_DESCRIPTION =
  "Güven Değirmenci's blog. Notes on things I build and the problems I run into along the way.";

export const COPY = {
  intro: "Notes on things I build and the problems I run into along the way.",
  // rendered with a link to the repo on "duo-web"
  source: "Each post is a plain Markdown file in the duo-web repo.",
  about: `I'm Güven Değirmenci, a developer in Istanbul and ${ROLE} at ${COMPANY}. My tools and the rest of my work are on dq.ms.`,
  empty: "No posts yet.",
  // the summary box at the top of a post (front matter `summary`)
  summaryHeading: "TL;DR",
  summaryByAi: "Summarized with AI",
  summaryByAuthor: "Summarized by the author",
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
