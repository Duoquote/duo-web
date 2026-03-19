import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  site: "https://dq.ms",
  integrations: [react(), sitemap()],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "tr"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss(), wasm(), topLevelAwait()],
    worker: {
      format: "es",
      plugins: () => [wasm(), topLevelAwait()],
    },
    build: {
      target: "es2022",
    },
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "onnxruntime-web"],
      include: [
        "maplibre-gl",
        "@deck.gl/core",
        "@deck.gl/layers",
        "@deck.gl/mapbox",
      ],
      esbuildOptions: {
        target: "es2022",
      },
    },
  },
});
