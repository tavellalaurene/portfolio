// @ts-check
import { defineConfig } from "astro/config";

// GitHub Pages serves the site from https://<user>.github.io/<repo>/
export default defineConfig({
  site: "https://tavellalaurene.github.io",
  base: "/portfolio",
  trailingSlash: "ignore",
});
