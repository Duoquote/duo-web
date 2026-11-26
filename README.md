# dq.ms

Personal portfolio and developer tools site for **Guven Degirmenci** — full-stack developer and Managing Partner at Next Geo, based in Istanbul.

Live at **[dq.ms](https://dq.ms)**

## Tech Stack

- **Framework:** [Astro](https://astro.build) v5 (static output)
- **UI:** [React](https://react.dev) 19 (Astro islands)
- **Styling:** [Tailwind CSS](https://tailwindcss.com) v4
- **Mapping:** [Leaflet](https://leafletjs.com) + [React Leaflet](https://react-leaflet.js.org)
- **Geospatial:** [H3](https://h3geo.org) (Uber's hexagonal grid system)
- **Icons:** [Lucide](https://lucide.dev) + [React Icons](https://react-icons.github.io/react-icons)
- **Language:** TypeScript (strict)

## Features

- Animated hero, about section with tech stack grid, and terminal-styled contact card
- Full bilingual support (English / Turkish) with custom i18n — no third-party library
- SEO: Open Graph, Twitter Cards, JSON-LD schema, hreflang tags, auto-generated sitemap
- Astro View Transitions for seamless page navigation
- Dark theme with OKLCH color variables

### Developer Tools

- **H3 Explorer** (`/tools/h3-explorer`) — Visualize any Uber H3 hex cell on an interactive dark-themed map. Enter an H3 index, and the tool validates it, renders the cell boundary, and flies the camera to the location.

## Project Structure

```
src/
  pages/           # Astro file-based routing (en + /tr/ prefix)
  components/      # React + Astro components
    tools/         # Tool-specific components (H3Explorer)
  layouts/         # Base HTML layout with SEO metadata
  lib/             # i18n dictionary, utilities, helpers
  styles/          # Tailwind v4 globals, CSS variables, keyframes
public/            # Static assets (images, favicon, CNAME, robots.txt)
```

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server (http://localhost:4321)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Deployment

Static site deployed to **GitHub Pages** with custom domain `dq.ms`. The build outputs to `dist/`.

## Blog

The blog at [blog.dq.ms](https://blog.dq.ms) is a second Astro project in `blog/`. It uses the same `node_modules` and the same design tokens (`src/styles/theme.css`) as the main site, but builds on its own and ships almost no JavaScript: just the theme toggle.

### Writing a post

A post is a Markdown file in `blog/posts/`. The file or folder name is the URL:

```
blog/posts/my-post.md            -> blog.dq.ms/my-post
blog/posts/my-post/index.md      -> blog.dq.ms/my-post, with images next to it
```

Front matter:

```yaml
---
title: My post                  # required
date: 2026-11-26                # required
description: One or two lines.  # meta description. Falls back to the first paragraph
updated: 2026-12-01             # optional, also accepted as `lastmod`
tags: [astro, cloudflare]       # optional
cover: ./cover.jpg              # optional, also used as the og:image
coverAlt: What the cover shows
draft: true                     # optional, keeps it out of the build
---
```

Start sections at `##`, because the title is the page's only `h1`. Images go next to the post and are linked relatively, like `![What it shows](./diagram.png "Optional caption")`. The build resizes them, converts them to WebP and sets width and height. It also prints a warning when an image has no alt text.

`blog/posts/markdown-reference/index.md` is a draft that uses every supported feature. Copy it to start a new post.

### Commands

```bash
bun run dev:blog       # http://localhost:4321, drafts included
bun run build:blog     # static output in blog/dist, drafts excluded
BLOG_DRAFTS=1 bun run build:blog   # build with drafts, for checking them
bun run deploy:blog    # build, deploy with wrangler, ping IndexNow with changed URLs
```

### Hosting

`blog/dist` is served by a Cloudflare Worker with static assets (`duo-blog`, config in `blog/wrangler.jsonc`) on the custom domain `blog.dq.ms`. The only code is `blog/worker.js`. It redirects http and any other hostname to https://blog.dq.ms, sends `/post/` and `/post.html` to `/post` with a 301, and returns the Markdown version of a page when the request asks for `text/markdown`. `_headers` sets the cache rules, and unknown paths get `404.html` with a real 404 status.

The build also writes `sitemap.xml`, `rss.xml`, `robots.txt`, a 1200x630 Open Graph card for each post without a cover, `llms.txt`, `llms-full.txt`, and a Markdown copy of each post at `/<slug>.md`. All of them come from the same posts, so a new post shows up everywhere on the next build.

`blog/scripts/deploy.mjs` deploys `blog/dist`. Before deploying, it reads the live sitemap, and afterwards it sends the new or changed URLs to IndexNow (Bing, Yandex and others). The key file is in `blog/public/`. To deploy from Cloudflare Workers Builds, use `bun run build:blog` as the build command and `node blog/scripts/deploy.mjs` as the deploy command.

The main site has its own `llms.txt` and `llms-full.txt` (`src/lib/llms.ts`), built from the same strings as the pages.
