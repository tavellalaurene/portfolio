// @ts-check
import { defineConfig } from "astro/config";

// GitHub Pages serves the site from https://<user>.github.io/<repo>/
// PREVIEW_BASE lets a local preview build use another base path.
export default defineConfig({
  site: "https://tavellalaurene.github.io",
  base: process.env.PREVIEW_BASE ?? "/portfolio",
  trailingSlash: "ignore",
  build: {
    // Keep CSS in files so the Content Security Policy needs no inline-style exceptions.
    inlineStylesheets: "never",
  },
  vite: {
    // Never inline fonts or images as data: URIs, which the Content Security Policy blocks.
    build: { assetsInlineLimit: 0 },
  },
  security: {
    // Content Security Policy, added to every page as a <meta> tag.
    // Only the site's own scripts, styles, fonts and images may load; nothing else.
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'none'",
        "manifest-src 'self'",
        "media-src 'none'",
        "object-src 'none'",
        "frame-src 'none'",
        "worker-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        "upgrade-insecure-requests",
      ],
      scriptDirective: { resources: ["'self'"] },
      styleDirective: { resources: ["'self'"] },
    },
  },
});
