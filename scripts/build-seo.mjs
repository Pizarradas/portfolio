// Generates the two files a crawler looks for before it looks at any page:
// sitemap.xml and robots.txt.
//
//   node scripts/build-seo.mjs           write both
//   node scripts/build-seo.mjs --check   write nothing, exit 1 if either is stale
//
// The sitemap declares all fourteen URLs — seven English, seven Spanish — and
// pairs each one with its translated twin through xhtml:link. That is the half
// of hreflang a crawler cannot get from the page alone: the <link rel=alternate>
// tags in the head only prove the claim from one side, and Google wants both.
//
// CAVEAT, and it is the important one: this site is published at
// pizarradas.github.io/portfolio/, a GitHub Pages *project* path. A crawler only
// reads robots.txt from the domain root — pizarradas.github.io/robots.txt —
// which belongs to a different repository. The file written here is therefore
// inert until the site moves to its own domain or to the user page. The sitemap
// does NOT depend on it: submit the URL directly in Google Search Console.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASE, PAGES } from './site.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

// Real dates or none. The last commit that touched the English page is the last
// time its content actually changed; a file mtime is just when it was checked
// out, and inventing a date is exactly the kind of unsourced number BRAND.md §7
// rules out.
function lastModified(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out ? out.slice(0, 10) : '';
  } catch {
    return '';
  }
}

const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function urlEntry({ loc, alternates, lastmod, priority }) {
  const lines = [`  <url>`, `    <loc>${xml(loc)}</loc>`];
  for (const [hreflang, href] of alternates) {
    lines.push(`    <xhtml:link href="${xml(href)}" hreflang="${hreflang}" rel="alternate"/>`);
  }
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
  lines.push(`    <priority>${priority}</priority>`, `  </url>`);
  return lines.join('\n');
}

function sitemap() {
  const entries = [];

  for (const page of PAGES) {
    const en = `${BASE}/${page.file}`;
    const es = `${BASE}/es/${page.file}`;
    const alternates = [
      ['en', en],
      ['es', es],
      ['x-default', en],
    ];
    const lastmod = lastModified(page.file);

    // Both languages are canonical in their own right, so both are listed. Each
    // one repeats the full alternate set — a partial set reads to a crawler as
    // a broken pair and the hreflang cluster is dropped.
    entries.push(urlEntry({ loc: en, alternates, lastmod, priority: page.priority }));
    entries.push(urlEntry({ loc: es, alternates, lastmod, priority: page.priority }));
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...entries,
    `</urlset>`,
    ``,
  ].join('\n');
}

function robots() {
  return [
    `# Static portfolio. Everything here is meant to be indexed.`,
    `User-agent: *`,
    `Allow: /`,
    ``,
    `Sitemap: ${BASE}/sitemap.xml`,
    ``,
  ].join('\n');
}

const files = [
  ['sitemap.xml', sitemap()],
  ['robots.txt', robots()],
];

let stale = 0;
for (const [name, body] of files) {
  const path = join(ROOT, name);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === body) {
    console.log(`build-seo: ${name} up to date`);
    continue;
  }
  if (check) {
    console.error(`build-seo: ${name} is stale — run npm run build:seo`);
    stale++;
    continue;
  }
  writeFileSync(path, body, 'utf8');
  console.log(`build-seo: ${name}`);
}

if (stale) process.exit(1);
