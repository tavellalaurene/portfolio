# Portfolio

Personal portfolio site built with [Astro](https://astro.build). Two modes share one layout: **Lead** (leadership) and **Build** (engineering).

## Edit the content

You never need to touch the code to change the content.

| What | Where |
|---|---|
| All home page text | `src/content/site.yaml` |
| One file per project | `src/content/projects/*.md` |
| Rules for what may be published | `config/checks.json` |

- **Add a project:** copy `src/content/projects/_template.md.example` to `src/content/projects/my-project.md` and fill it in. Only `name`, `where`, `type` and `status` are required.
- **Hide a project while you work on it:** add `draft: true`.
- **Missing information:** leave the field out instead of writing a placeholder such as `[city]`. Empty fields simply don't show, and placeholders block publishing.
- **Text per mode:** any text can be one string, or a `lead` / `build` pair (`build` falls back to `lead`).
- **Links:** the LinkedIn and GitHub buttons only appear for the links filled in under `links:` in `site.yaml`.
- **Console:** in Build mode it reads the same content files, so new projects and facts appear there automatically.
- **Share image:** `public/og.png` (1200×630) is what LinkedIn, Slack and others show when the link is shared.
- **Images:** 16:10, put them next to the project file (e.g. `src/content/projects/images/`), and **strip their metadata first** (GPS, camera, author). For example `exiftool -all= image.jpg`. The checks refuse images that still carry metadata.

## What is never published

The checks run on every push and block publishing when they find:

- an email address, a phone number or a street address (on the site and anywhere in the repo),
- job-seeking wording such as "looking for a job", "open to work", "CV" or "résumé" (English and French),
- placeholders like `[something]` left in the content,
- images that still contain metadata,
- secrets (API keys, tokens) anywhere in the git history,
- anything that could inject code: HTML or scripts in the content, non-https links, code that turns text into HTML, and any third-party script, style or font on the built site.

## Security

- The site is static: no server, no database, no forms, nothing a visitor can store.
- A strict Content Security Policy on every page only lets the site's own scripts, styles, fonts and images load.
- All text from the content files is escaped when rendered; links must be `https://`.
- Dependencies are audited on every push, and Dependabot proposes updates weekly.
- Recommended on GitHub: protect the `main` branch (Settings → Branches) so it only accepts changes whose checks pass.

Public by design: name, title, employer, city, LinkedIn and GitHub links, project names and their public context.

**Keep your personal email out of git history:** before committing from your own computer, use GitHub's private address:

```bash
git config user.email "ID+USERNAME@users.noreply.github.com"
```

(GitHub shows the exact address under Settings → Emails, with "Keep my email addresses private" turned on.)

Private notes go in a `private/` folder, which git ignores.

## Run it locally

Requires Node.js 24 (see `.nvmrc`).

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (it ends with `/portfolio/`).

Before pushing, run everything the server runs: the checks and the build, then the browser tests (mode switch, divider, filters, console, accessibility audit and security policy, on desktop and phone):

```bash
npm run verify
```

```bash
npm test
```

The first time, `npm test` may ask for its browser:

```bash
npx playwright install chromium
```

## Publishing

Pushing to `main` runs the checks, builds the site and publishes it to GitHub Pages at `https://tavellalaurene.github.io/portfolio/`. Other branches and pull requests are checked but never published.

One-time setup: in the repository on GitHub, go to Settings → Pages and set **Source** to **GitHub Actions**.
