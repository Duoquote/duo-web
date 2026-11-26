// Text for /llms.txt and /llms-full.txt (https://llmstxt.org), built from the
// same strings the pages use, so they stay in sync with the site.

import { t, type TranslationKey } from "./i18n";
import { getYearsOfExperience } from "./years";
import { TECH_GROUPS } from "../components/AboutSection";

export const SITE = "https://dq.ms";
export const BLOG = "https://blog.dq.ms";

const PROFILES = [
  { name: "GitHub", url: "https://github.com/duoquote", note: "my code, including this site and the blog" },
  { name: "LinkedIn", url: "https://www.linkedin.com/in/duoquote/", note: "work history" },
  {
    name: "Stack Overflow",
    url: "https://stackoverflow.com/users/7493063/guven-degirmenci",
    note: "answers I've written",
  },
];

const TOOLS: { key: string; path: string }[] = [
  { key: "h3", path: "/tools/h3-explorer/" },
  { key: "converter", path: "/tools/converter/" },
  { key: "geoViewer", path: "/tools/geo-viewer/" },
  { key: "imvector", path: "/tools/imvector/" },
  { key: "gifOptimizer", path: "/tools/gif-optimizer/" },
  { key: "imageCompress", path: "/tools/image-compress/" },
  { key: "imdotter", path: "/imdotter/" },
];

const en = (key: string, vars?: Record<string, string | number>) => t("en", key as TranslationKey, vars);

function tools() {
  return TOOLS.map(({ key, path }) => ({
    name: en(`tools.${key}.name`),
    description: en(`tools.${key}.description`),
    url: SITE + path,
  }));
}

function summary() {
  return en("hero.subtitle", { years: getYearsOfExperience() });
}

export function llmsTxt(): string {
  return [
    "# Güven Değirmenci",
    "",
    `> ${summary()} Based in Istanbul.`,
    "",
    "This is my personal site: a short intro, the small tools I built for myself, and links I keep coming back to. Longer notes go on the blog at blog.dq.ms.",
    "",
    "## Pages",
    "",
    `- [Home](${SITE}/): who I am, my role at Next Geo and what I work with`,
    `- [Tools](${SITE}/tools/): ${en("tools.description")}`,
    `- [Links](${SITE}/links/): ${en("links.description")}`,
    `- [Türkçe](${SITE}/tr/): the same site in Turkish`,
    "",
    "## Tools",
    "",
    ...tools().map((tool) => `- [${tool.name}](${tool.url}): ${tool.description}`),
    "",
    "## Blog",
    "",
    `- [Blog](${BLOG}/): posts, newest first`,
    `- [Blog llms.txt](${BLOG}/llms.txt): every post with a one-line summary and a link to its Markdown version`,
    `- [All posts as Markdown](${BLOG}/llms-full.txt): the full text of every post in one file`,
    "",
    "## Optional",
    "",
    `- [Full profile as Markdown](${SITE}/llms-full.txt): this file plus my bio, tech stack and tool details`,
    ...PROFILES.map((p) => `- [${p.name}](${p.url}): ${p.note}`),
    "",
  ].join("\n");
}

export function llmsFullTxt(): string {
  const years = getYearsOfExperience();
  return [
    "# Güven Değirmenci",
    "",
    `> ${summary()} Based in Istanbul.`,
    "",
    `Source: ${SITE}/`,
    "",
    "## About",
    "",
    en("about.bio1"),
    "",
    en("about.bio2", { years }),
    "",
    `- ${en("about.stat.location")}: ${en("about.stat.locationValue")}`,
    `- ${en("about.stat.role")}: ${en("about.stat.roleValue")}, Next Geo`,
    `- ${en("about.stat.experience")}: ${en("about.stat.experienceValue", { years })}`,
    "",
    `## ${en("about.techHeading")}`,
    "",
    ...TECH_GROUPS.map((g) => `- ${en(g.labelKey)}: ${g.items.join(", ")}`),
    "",
    "## Tools",
    "",
    en("tools.description"),
    "",
    ...tools().flatMap((tool) => [`### ${tool.name}`, "", tool.description, "", tool.url, ""]),
    "## Blog",
    "",
    `Posts live on ${BLOG}/. The full text of every published post, as Markdown: ${BLOG}/llms-full.txt`,
    "",
    "## Profiles",
    "",
    ...PROFILES.map((p) => `- [${p.name}](${p.url}): ${p.note}`),
    "",
  ].join("\n");
}
