---
name: post
description: Generate a blog post article for dq.ms from the current conversation
disable-model-invocation: true
---

# Blog Post Generator

Generate a blog post for [dq.ms](https://dq.ms) from the current conversation topic. Posts are Astro Content Collection markdown files.

## Step 1: Identify the topic

If `$ARGUMENTS` is provided, use it as the topic/angle. Otherwise, identify the key topic or insight from the conversation.

## Step 2: Generate 3 title + summary variants

Present **3 distinct variants**, each with a different angle. Each variant must include:
- **Title**: concise, specific, and compelling. Not clickbait — informative but attention-grabbing.
- **Summary**: 1-3 sentences of plain text (NO markdown formatting, NO emojis). This appears as the excerpt on the post list page. It should be catchy enough to make readers click through to the full article.

Example format:

```
1. Title: "Building a GIS Pipeline with H3"
   Summary: We replaced our PostGIS spatial queries with Uber's H3 hexagonal grid and cut query times from seconds to single-digit milliseconds. Here's the full architecture and what we learned.

2. Title: "Why We Ditched PostGIS for H3 Hexagons"
   Summary: After years of slow spatial joins, we moved our entire pipeline to H3 hexagonal indexing. Query times dropped from 4.8 seconds to 18 milliseconds at p99.

3. Title: "H3 Hexagonal Indexing: A Practical Guide"
   Summary: A step-by-step walkthrough of building a spatial indexing pipeline with Uber's H3 system, from raw GPS coordinates to sub-20ms analytical queries in ClickHouse.
```

Ask the user to pick one or request modifications. Do NOT proceed until the user has chosen.

## Step 3: Write the full post

Generate the markdown file with this structure:

```markdown
---
title: "<chosen title>"
description: "<SEO description — 1 sentence, 150-160 chars, for OG meta tags>"
date: <today's date YYYY-MM-DD>
tags: [<2-4 relevant lowercase tags>]
---

<chosen summary — plain text, no markdown>

<!-- more -->

<full article body — use full Markdown: headings, bold, italic, links, code blocks, tables, images, lists, blockquotes>
```

### Writing rules

**Frontmatter:**
- `title` — the chosen title from step 2
- `description` — a separate SEO-optimized description (NOT the summary). ~150 chars, for search engines and OG tags.
- `date` — today's date
- `tags` — 2-4 lowercase tags relevant to the topic
- `title_tr` / `description_tr` — only include if the conversation is bilingual or the user asks for Turkish
- `image` — only include if the user provides a cover image path
- Do NOT set `draft: true` unless the user explicitly asks

**Summary (above `<!-- more -->`):**
- Plain text only — no headings, bold, italic, links, tables, code blocks, or images
- No emojis
- 1-3 sentences, catchy and compelling
- Must stand alone as an excerpt on the post list page

**Body (below `<!-- more -->`):**
- Full Markdown — headings, code blocks, tables, images, lists, etc.
- Write substantively — this is a real article, not a stub
- Include code examples, data, benchmarks, or diagrams where relevant
- Use `##` for main sections, `###` for subsections
- Reference images as `/images/posts/<filename>` (placed in `public/images/posts/`)
- No emojis

**Tone:**
- Professional but conversational — like explaining to a smart colleague
- No fluff, no filler paragraphs
- Get to the point, then go deep
- First person is fine ("I built", "we found", "our team")

### File naming

Generate a short kebab-case slug from the title (e.g. `h3-indexing-pipeline.md`).

Save to: `D:/Projects/newduo/src/content/posts/<slug>.md`

## Step 4: Summary

After writing, show:
- The file path
- The post URL it will be available at: `https://dq.ms/posts/<slug>`
- Remind the user to commit and push when ready — the post is NOT auto-published
- If the post references images, remind the user to place them in `D:/Projects/newduo/public/images/posts/`
