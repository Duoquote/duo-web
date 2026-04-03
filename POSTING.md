# Writing & Publishing Posts

This guide explains how to create blog posts for [dq.ms](https://dq.ms). Posts are written as Markdown files and automatically published to the website and the Facebook Page ("DQ Tips") on push to `main`.

## Quick Start

1. Create a new `.md` file in `src/content/posts/`
2. Add frontmatter (see below)
3. Write your content in Markdown
4. Commit and push to `main`

That's it. The site rebuilds on GitHub Pages and the GitHub Action auto-publishes to Facebook.

## File Location

```
src/content/posts/<slug>.md
```

The filename becomes the URL slug: `my-new-post.md` → `https://dq.ms/posts/my-new-post`

## Frontmatter Schema

```yaml
---
title: "Post Title"                    # Required — English title
title_tr: "Yazı Başlığı"              # Optional — Turkish title (shown on /tr/posts)
description: "Short summary."          # Required — English description
description_tr: "Kısa özet."           # Optional — Turkish description
date: 2026-04-03                       # Required — publish date (YYYY-MM-DD)
updated: 2026-04-10                    # Optional — last updated date
image: "/images/posts/cover.jpg"       # Optional — cover image (also used as OG image & Facebook photo)
tags: ["gis", "react"]                 # Optional — tags displayed on the post card (defaults to [])
draft: true                            # Optional — if true, post is excluded from the site (defaults to false)
---
```

### Field Notes

| Field | Required | Used In |
|-------|----------|---------|
| `title` | Yes | Page title, post card, Facebook post, OG tags |
| `title_tr` | No | Turkish version of the post list and detail page. Falls back to `title` |
| `description` | Yes | Post card subtitle, Facebook post body, OG description |
| `description_tr` | No | Turkish version. Falls back to `description` |
| `date` | Yes | Sort order, displayed date |
| `updated` | No | "Updated on" line on detail page |
| `image` | No | Cover image on Facebook (uploaded as native photo), OG image meta tag |
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

Images must be committed and deployed before the Facebook Action runs, since Facebook fetches the image by URL from `https://dq.ms/images/posts/...`.

## Post Body Structure

Posts use a `<!-- more -->` separator to split content into a **summary** and **detailed body**.

```markdown
---
title: "My Post"
...
---

This is the summary. It is published to Facebook as a standalone post and
shown as the lead section on the website.

<!-- more -->

## Detailed Content

Everything below the separator is additional detail. It only appears on the
full post detail page on the website.
```

### Writing the summary (IMPORTANT)

The summary (everything above `<!-- more -->`) is what gets posted to Facebook. It must be **self-contained and complete** — a Facebook reader should get the full value of the post without needing to click through to the website. Do NOT write teaser/clickbait summaries that try to drive traffic. Instead:

- Include all key points, conclusions, and takeaways in the summary
- Write it as if the reader will never visit the website
- The summary IS the post for Facebook audiences
- The "Read more" link is appended automatically but should be optional, not required

The detailed body below `<!-- more -->` is for bonus content: deeper technical breakdowns, code examples, step-by-step walkthroughs, or supplementary material that adds depth but isn't essential.

### Summary formatting rules (Facebook)

The summary is converted to **plain text** before posting to Facebook (markdown syntax is stripped automatically via `remove-markdown`). Because of this:

- **Do NOT use markdown tables** in the summary — they become unreadable plain text on Facebook. Use simple lists instead:
  ```markdown
  Bad (table — breaks on Facebook):
  | Model | Params | Best For |
  |-------|--------|----------|
  | Qwen  | 7B     | Detail   |

  Good (list — reads well everywhere):
  - Qwen (7B) — best for detailed annotation
  - InternVL2.5 (26B) — #1 open-source captioner
  - Florence-2 (770M) — ultra-lightweight, edge-ready
  ```
- **Do NOT use code blocks** — they lose formatting on Facebook
- **Do NOT use images** in the summary — use the `image` frontmatter field for the Facebook photo instead
- **Bold/italic/links are fine** — they get stripped to plain text cleanly
- **Lists and line breaks are fine** — they translate well to Facebook
- Keep tables, code blocks, and images for the detailed body below `<!-- more -->`

### How each section is used

| Section | Post list page | Post detail page | Facebook |
|---------|---------------|-----------------|----------|
| Summary (above `<!-- more -->`) | Shown as excerpt | Shown as lead section (slightly larger text) | Published as the full post body |
| Detailed body (below `<!-- more -->`) | Hidden | Shown below a divider | Not included |
| `description` frontmatter field | Not shown | Used for OG/SEO meta | Fallback if no summary |

If there is no `<!-- more -->` separator, the entire body is treated as the summary.

## Markdown Syntax

Standard Markdown is supported: headings, bold, italic, links, images, code blocks, blockquotes, lists, and horizontal rules.

```markdown
## Section Heading

Regular paragraph with **bold** and *italic* text.

- Bullet list
- Another item

> Blockquote

![Alt text](/images/posts/example.png)

Inline `code` and fenced code blocks:

\```javascript
const x = 42;
\```
```

## Facebook Auto-Publish

The GitHub Action at `.github/workflows/facebook-publish.yml` triggers on every push to `main` that adds a new file in `src/content/posts/`.

### What it does

1. Detects newly added `.md` files (not edits — only new files)
2. Extracts `title`, `image`, and **summary** (body text before `<!-- more -->`) from the post
3. If `image` is set: publishes a **photo post** to the Facebook Page with the image embedded and the summary in the caption
4. If no `image`: publishes a **text post** with the title, summary, and link
5. If no `<!-- more -->` separator: falls back to the `description` frontmatter field

### What it does NOT do

- It does not publish on file edits or renames, only on new file additions
- It only processes the first new post per push — push one post at a time
- Draft posts (`draft: true`) still trigger the Action — set `draft` only after the initial push if needed

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `FB_PAGE_ID` | Facebook Page ID |
| `FB_ACCESS_TOKEN` | Facebook Page Access Token with `pages_manage_posts` and `pages_read_engagement` permissions |

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
title_tr: "H3 ile CBS Pipeline Oluşturma"
description: "How I built a spatial indexing pipeline using Uber's H3 hexagonal grid system."
description_tr: "Uber'in H3 altıgen grid sistemi ile mekansal indeksleme pipeline'ı nasıl kurdum."
date: 2026-04-05
image: "/images/posts/h3-pipeline.jpg"
tags: ["gis", "h3", "python"]
---

I built a spatial indexing pipeline using Uber's H3 hexagonal grid system at
Next Geo. H3 divides the world into hexagonal cells at 16 resolution levels,
which makes it great for aggregating point data, running spatial joins, and
building heatmaps without expensive geometry operations.

The pipeline has three stages: ingest raw GPS coordinates, index them into H3
cells at resolution 9 (~175m edge), and aggregate metrics per cell into
ClickHouse for fast analytical queries. This replaced our previous PostGIS
approach and cut query times from seconds to single-digit milliseconds.

Key takeaway: if your spatial workload is mostly point-in-polygon or proximity
analysis, H3 is significantly faster and simpler than traditional GIS indexing.
The tradeoff is that hexagons don't align to administrative boundaries, so you
still need PostGIS for that.

<!-- more -->

## Technical Deep Dive

### Stage 1: Ingestion

Raw GPS coordinates arrive as Kafka events...

### Stage 2: H3 Indexing

We use the `h3-py` library to convert lat/lng pairs...

### Stage 3: ClickHouse Aggregation

Each H3 cell becomes a row in a ClickHouse MergeTree table...

## Benchmarks

| Approach | p50 query | p99 query |
|----------|-----------|-----------|
| PostGIS  | 1.2s      | 4.8s      |
| H3 + CH | 3ms       | 18ms      |
```
