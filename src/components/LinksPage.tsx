import { ArrowUpRight } from "lucide-react";
import { t, type Locale } from "../lib/i18n";

interface LinkItem {
  name: string;
  url: string;
  description: string;
}

interface Category {
  labelKey: string;
  links: LinkItem[];
}

const categories: Category[] = [
  {
    labelKey: "links.category.gis",
    links: [
      {
        name: "Map Tiles View",
        url: "https://duoquote.github.io/map-tiles-view/",
        description: "Show x, y, z values of tiles on a map.",
      },
      {
        name: "BBOX Finder",
        url: "http://bboxfinder.com/",
        description: "Get bounding boxes for any area.",
      },
      {
        name: "Geohash Converter",
        url: "http://geohash.co/",
        description: "Convert geohash strings to coordinates.",
      },
      {
        name: "GeoJSON.io",
        url: "http://geojson.io/",
        description: "Create and edit GeoJSON data interactively.",
      },
      {
        name: "HERE Playground",
        url: "https://refclient.ext.here.com/",
        description: "HERE Maps REST API playground.",
      },
    ],
  },
  {
    labelKey: "links.category.design",
    links: [
      {
        name: "Photopea",
        url: "https://www.photopea.com/",
        description: "Photoshop-like online image editor.",
      },
      {
        name: "Eraser",
        url: "https://www.eraser.io/",
        description: "Documents & diagrams editor.",
      },
    ],
  },
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFavicon(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`;
}

export default function LinksPage({ locale = "en" }: { locale?: Locale }) {
  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pt-20 pb-16 md:px-6">
      <span className="mb-3 block text-xs font-semibold tracking-[0.1em] text-primary uppercase">
        {t(locale, "links.label")}
      </span>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        {t(locale, "links.heading")}
      </h1>
      <p className="mb-12 max-w-lg text-base text-muted-foreground">
        {t(locale, "links.description")}
      </p>

      <div className="space-y-10">
        {categories.map((category) => (
          <section key={category.labelKey}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase shrink-0">
                {t(locale, category.labelKey as any)}
              </span>
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-mono text-muted-foreground/40 tabular-nums shrink-0">
                {category.links.length}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {category.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex gap-3.5 border border-border bg-card p-4 transition-all duration-200 hover:border-primary/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
                >
                  {/* Left accent */}
                  <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-primary/0 transition-all duration-300 group-hover:bg-primary/40" />

                  {/* Favicon */}
                  <div className="shrink-0 mt-0.5">
                    <div className="h-8 w-8 border border-border bg-muted/30 flex items-center justify-center transition-colors group-hover:border-primary/20 group-hover:bg-primary/5">
                      <img
                        src={getFavicon(link.url)}
                        alt=""
                        className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-card-foreground truncate">
                        {link.name}
                      </h3>
                      <ArrowUpRight
                        size={12}
                        className="shrink-0 text-primary opacity-0 -translate-x-1 translate-y-0.5 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground/50 tracking-wide">
                      {getDomain(link.url)}
                    </span>
                    <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
                      {link.description}
                    </p>
                    <div className="mt-3 h-0.5 w-6 bg-primary/20 transition-all duration-300 group-hover:w-10 group-hover:bg-primary/40" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
