// Publishing guard. Fails (exit 1) when the repo or the built site would leak
// personal data, contain job-seeking wording, ship placeholders, or ship image metadata.
//
//   node scripts/checks.mjs source   -> files tracked by git (and new, non-ignored files)
//   node scripts/checks.mjs dist     -> the built site in dist/
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const config = JSON.parse(readFileSync("config/checks.json", "utf8"));
const target = process.argv[2] ?? "source";
const problems = [];

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// North American and international phone numbers, e.g. 514-555-0199, (514) 555 0199, +33 6 12 34 56 78.
const PHONE = /(?<![\w.-])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}(?![\w-])|\+\d{1,3}(?:[\s.]\d{1,4}){3,5}(?![\w-])/g;
const ADDRESS = /\b\d{1,5}\s*,?\s+(?:rue|avenue|av\.|boulevard|boul\.|blvd|chemin|street|st\.|road|rd\.|place|lane)\s+\w+/gi;
// "[something]" not followed by "(" (a Markdown link) is a placeholder.
const PLACEHOLDER = /\[[^\]\n]{2,}\](?!\()/g;

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff", ".heic"]);
const TEXT_EXT = new Set([".md", ".mdx", ".yaml", ".yml", ".json", ".astro", ".ts", ".js", ".mjs", ".css", ".html", ".txt", ".svg", ""]);

const allowedEmail = (email) => config.allowedEmailPatterns.some((p) => new RegExp(p, "i").test(email));
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bannedPhrases = config.bannedPhrases.map((p) => ({ p, re: new RegExp(`(?<![\\p{L}])${escape(p)}(?![\\p{L}])`, "iu") }));
const bannedWords = config.bannedCaseSensitiveWords.map((w) => ({ p: w, re: new RegExp(`\\b${escape(w)}\\b`, "u") }));

function report(file, rule, detail) {
  problems.push(`${file}: ${rule}${detail ? ` → "${detail}"` : ""}`);
}

function scanPersonalData(file, text) {
  for (const email of text.match(EMAIL) ?? []) if (!allowedEmail(email)) report(file, "email address", email);
  for (const phone of text.match(PHONE) ?? []) report(file, "phone number", phone);
  for (const address of text.match(ADDRESS) ?? []) report(file, "street address", address);
}

function scanWording(file, text) {
  for (const { p, re } of [...bannedPhrases, ...bannedWords]) if (re.test(text)) report(file, "banned wording", p);
}

function scanPlaceholders(file, text) {
  const body = file.endsWith(".md") ? text : text.replace(/^\s*#.*$/gm, "");
  for (const ph of body.match(PLACEHOLDER) ?? []) report(file, "placeholder left in content", ph);
}

// EXIF / XMP blocks carry GPS, camera and author data. Strip them before adding an image.
function scanImageMetadata(file, buffer) {
  const ascii = buffer.toString("latin1");
  const markers = ["Exif\0\0", "eXIf", "EXIF", "http://ns.adobe.com/xap/1.0/", "GPSLatitude"];
  const found = markers.find((m) => ascii.includes(m));
  if (found) report(file, "image contains metadata (strip it first)", found.replace(/\0/g, ""));
}

// Injection: code must never turn strings into HTML or code, content must stay plain text.
const UNSAFE_CODE = /\bset:html\b|\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write|\beval\s*\(|new\s+Function\s*\(/g;
const UNSAFE_MARKUP = /<\s*(?:script|iframe|object|embed|form|base|meta|link|style)\b|\son[a-z]+\s*=|javascript:|vbscript:|data:text\/html/gi;

function scanUnsafeCode(file, text) {
  for (const hit of text.match(UNSAFE_CODE) ?? []) report(file, "unsafe HTML/code injection API", hit);
}

function scanUnsafeContent(file, text) {
  for (const hit of text.match(UNSAFE_MARKUP) ?? []) report(file, "HTML or script in content", hit.trim());
}

// The built page: everything must come from the site itself, and the CSP must be present.
function scanBuiltHtml(file, html) {
  if (!/<meta http-equiv="content-security-policy"/i.test(html)) report(file, "missing Content-Security-Policy");
  for (const m of html.matchAll(/<(?:script|link|img|iframe|source)\b[^>]*\b(?:src|href)="(https?:)?\/\/[^"]*"/gi)) {
    if (!/<link[^>]*rel="(?:canonical|me)"/i.test(m[0])) report(file, "third-party resource", m[0].slice(0, 80));
  }
  for (const hit of html.match(/\son[a-z]+\s*=|javascript:|<iframe\b/gi) ?? []) report(file, "inline handler or unsafe URL", hit.trim());
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (target === "source") {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((f) => !config.skipFiles.includes(f));

  for (const file of files) {
    let buffer;
    try {
      buffer = readFileSync(file);
    } catch {
      continue; // deleted but still in the index
    }
    const ext = extname(file).toLowerCase();
    if (IMAGE_EXT.has(ext)) {
      scanImageMetadata(file, buffer);
      continue;
    }
    if (!TEXT_EXT.has(ext)) continue;
    const text = buffer.toString("utf8");
    scanPersonalData(file, text);
    if (config.contentDirs.some((d) => file.startsWith(`${d}/`))) {
      scanWording(file, text);
      scanPlaceholders(file, text);
      scanUnsafeContent(file, text);
    } else if (file.startsWith("src/")) {
      scanUnsafeCode(file, text);
    }
  }
} else if (target === "dist") {
  for (const file of walk("dist")) {
    const rel = relative(".", file);
    const ext = extname(file).toLowerCase();
    if (IMAGE_EXT.has(ext)) scanImageMetadata(rel, readFileSync(file));
    if (ext === ".css" && /url\(\s*["']?data:/i.test(readFileSync(file, "utf8"))) {
      report(rel, "inlined data: URI (blocked by the Content Security Policy)");
    }
    if (ext !== ".html") continue;
    const html = readFileSync(file, "utf8");
    const text = htmlToText(html);
    scanPersonalData(rel, html);
    scanBuiltHtml(rel, html);
    scanWording(rel, text);
    scanPlaceholders(rel, text);
  }
} else {
  console.error(`Unknown target "${target}". Use "source" or "dist".`);
  process.exit(2);
}

if (problems.length > 0) {
  console.error(`✗ ${problems.length} problem(s) found in ${target}:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error("\nNothing should be published until these are fixed. Rules live in config/checks.json.");
  process.exit(1);
}
console.log(`✓ ${target}: no personal data, banned wording, placeholders, image metadata or injection risks found.`);
