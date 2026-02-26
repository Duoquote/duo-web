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
