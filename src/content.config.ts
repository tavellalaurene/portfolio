import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";

// A piece of copy is either one string used in both modes,
// or a { lead, build } pair. `build` is optional and falls back to `lead`.
const text = z.union([
  z.string(),
  z.object({ lead: z.string(), build: z.string().optional() }),
]);

const heading = z.object({ main: text, accent: text });

// Only https links: blocks javascript:, data: and other injectable URL schemes.
const httpsUrl = z.url({ protocol: /^https$/ });

const site = defineCollection({
  loader: file("src/content/site.yaml"),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    org: z.string(),
    city: z.string(),
    description: z.string(),
    links: z
      .object({
        linkedin: httpsUrl.optional(),
        github: httpsUrl.optional(),
      })
      .default({}),
    hero: z.object({ headline: heading, intro: text }),
    scope: z.object({
      heading,
      intro: text,
      kpis: z.array(z.object({ value: z.string(), label: text })),
      cards: z.array(z.object({ title: text, body: text, outcome: text.optional() })),
    }),
    impact: z.object({
      heading,
      intro: text,
      phase: z.string(),
      stats: z.array(z.object({ value: z.string(), label: text, base: text.optional() })),
      methods: z.array(text),
    }),
    work: z.object({ heading, intro: text }),
    contact: z.object({ heading, intro: text.optional() }),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      where: z.string(),
      type: z.enum(["pro", "personal"]),
      status: z.enum(["live", "coming-soon"]),
      // Lower numbers come first.
      order: z.number().default(100),
      summary: text.optional(),
      roles: z.array(z.string()).default([]),
      url: httpsUrl.optional(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      // Drafts are validated but never published.
      draft: z.boolean().default(false),
    }),
});

export const collections = { site, projects };
