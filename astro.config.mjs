import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

/**
 * Run a plugin everywhere, but skip its bundle rewrite on the SSR pass.
 *
 * vite-plugin-top-level-await exists to rewrite top-level await away for
 * browsers that cannot parse it. The SSR bundle is never sent to a browser -
 * it runs in Node during the build to render pages to HTML, and Node has
 * supported top-level await natively for years - so rewriting those chunks
 * buys nothing. It is also where the Cloudflare build dies: swc rejects the
 * AST the plugin hands it while printing Astro internal chunks (renderers,
 * content, assets, sharp). The client and worker bundles, which are what the
 * transform is actually for, still go through it untouched.
 */
function skipSsrBundle(plugin) {
  const generateBundle = plugin.generateBundle;
  return {
    ...plugin,
    generateBundle(...args) {
      if (this.environment?.name === "ssr") return;
      return generateBundle.apply(this, args);
    },
  };
}

export default defineConfig({
  site: "https://dq.ms",
  // /maria is a private page — keep it out of the sitemap so crawlers don't find it
  integrations: [react(), sitemap({ filter: (page) => !page.includes("/maria") })],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "tr"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss(), wasm(), skipSsrBundle(topLevelAwait())],
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
