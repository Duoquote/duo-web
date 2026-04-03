# Writing & Publishing Posts

This guide explains how to create blog posts for [dq.ms](https://dq.ms). Posts are written as Markdown files and published to the website on push to `main`.

## Quick Start

1. Create a new `.md` file in `src/content/posts/`
2. Add frontmatter (see below)
3. Write your content in Markdown
4. Commit and push to `main`

## File Location

```
src/content/posts/<slug>.md
```

The filename becomes the URL slug: `my-new-post.md` -> `https://dq.ms/posts/my-new-post`

## Frontmatter Schema

```yaml
---
title: "Post Title"                    # Required — English title
title_tr: "Yazi Basligi"              # Optional — Turkish title (shown on /tr/posts)
description: "Short summary."          # Required — English description (used for SEO/OG meta)
description_tr: "Kisa ozet."           # Optional — Turkish description
date: 2026-04-03                       # Required — publish date (YYYY-MM-DD)
updated: 2026-04-10                    # Optional — last updated date
image: "/images/posts/cover.jpg"       # Optional — cover/OG image
tags: ["gis", "react"]                 # Optional — tags displayed on the post card (defaults to [])
draft: true                            # Optional — if true, post is excluded from the site (defaults to false)
---
```

### Field Notes

| Field | Required | Used In |
|-------|----------|---------|
| `title` | Yes | Page title, post card, OG tags |
| `title_tr` | No | Turkish version of the post list and detail page. Falls back to `title` |
| `description` | Yes | OG/SEO meta description |
| `description_tr` | No | Turkish version. Falls back to `description` |
| `date` | Yes | Sort order, displayed date |
| `updated` | No | "Updated on" line on detail page |
| `image` | No | OG image meta tag |
| `tags` | No | Tag pills on list and detail pages |
| `draft` | No | Set `true` to hide from the site without deleting the file |

## Images

Place post images in the `public/images/posts/` directory:

```
public/images/posts/my-cover.jpg
```

Reference them in frontmatter or body:

```yaml
image: "/images/posts/my-cover.jpg"
```

```markdown
![Screenshot](/images/posts/my-screenshot.png)
```

## Post Body Structure

Posts use a `<!-- more -->` separator to split content into a **summary** and **detailed body**.

```markdown
---
title: "My Post"
...
---

This is the summary. It appears as the excerpt on the post list page.
It should be catchy and make the reader want to click through.

<!-- more -->

## Detailed Content

Everything below the separator is the full article body. It only appears
on the post detail page. Use full Markdown here — headings, code blocks,
tables, images, etc.
```

### Writing the summary (IMPORTANT)

The summary is everything above `<!-- more -->`. It is rendered as **plain text** on the post list page — no Markdown formatting is applied.

Rules for writing summaries:

- **Write it as plain text** — no headings, bold, italic, links, tables, code blocks, or images. It is rendered as-is.
- **Make it catchy and compelling** — this is the first thing readers see on the list page. Hook them in. It should create enough curiosity to click through to the full post.
- **Keep it concise** — 1-3 sentences is ideal. Long summaries defeat the purpose.
- **No emojis** — keep the tone professional and clean.
- **Convey the key takeaway** — the reader should know what the post is about and why it matters.

If there is no `<!-- more -->` separator, the entire body is treated as the summary (and rendered as plain text on the list page), which is usually not what you want.

### How each section is used

| Section | Post list page | Post detail page |
|---------|---------------|-----------------|
| Summary (above `<!-- more -->`) | Shown as plain text excerpt | Part of the full rendered content |
| Detailed body (below `<!-- more -->`) | Hidden | Rendered as Markdown (headings, code, tables, images, etc.) |
| `description` frontmatter field | Not shown | Used for OG/SEO meta |

## Markdown Syntax (detail body)

Standard Markdown is supported in the body below `<!-- more -->`: headings, bold, italic, links, images, code blocks, blockquotes, lists, tables, and horizontal rules.

```markdown
## Section Heading

Regular paragraph with **bold** and *italic* text.

- Bullet list
- Another item

> Blockquote

![Alt text](/images/posts/example.png)

| Column A | Column B |
|----------|----------|
| Data     | Data     |

Inline `code` and fenced code blocks:

\```javascript
const x = 42;
\```
```

## Bilingual Support

The site has English (default) and Turkish (`/tr/`) versions. Both use the same Markdown file. The Turkish pages display `title_tr` and `description_tr` when available, falling back to the English fields.

The post body is shared between languages — there is no separate Turkish body. If full Turkish content is needed in the future, a second file per post (e.g. `my-post.tr.md`) can be introduced.

## Routes

| URL | Content |
|-----|---------|
| `/posts` | English post list |
| `/posts/<slug>` | English post detail |
| `/tr/posts` | Turkish post list |
| `/tr/posts/<slug>` | Turkish post detail |

## Example Post

```markdown
---
title: "Building a GIS Pipeline with H3"
title_tr: "H3 ile CBS Pipeline Olusturma"
description: "How I built a spatial indexing pipeline using Uber's H3 hexagonal grid system."
description_tr: "Uber'in H3 altigen grid sistemi ile mekansal indeksleme pipeline'i nasil kurdum."
date: 2026-04-05
image: "/images/posts/h3-pipeline.jpg"
tags: ["gis", "h3", "python"]
---

We replaced our PostGIS spatial queries with Uber's H3 hexagonal grid and cut query times from seconds to single-digit milliseconds. Here's the full architecture and what we learned.

<!-- more -->

## Why H3?

H3 provides a hierarchical hexagonal grid system that's ideal for
aggregating point data without expensive geometry operations...

## The Pipeline

The pipeline consists of three stages: ingest, index, and aggregate...

## Benchmarks

| Approach | p50 query | p99 query |
|----------|-----------|-----------|
| PostGIS  | 1.2s      | 4.8s      |
| H3 + CH | 3ms       | 18ms      |
```
