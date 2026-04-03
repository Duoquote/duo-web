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

## Markdown Body

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
2. Extracts `title`, `description`, and `image` from frontmatter
3. If `image` is set: publishes a **photo post** to the Facebook Page with the image embedded and the post link in the caption
4. If no `image`: publishes a **text post** with the title, description, and link

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

Content goes here...
```
