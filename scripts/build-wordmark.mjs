// The messages the wordmark types, written into every page that has a header.
//
//   node scripts/build-wordmark.mjs           inject the island into all pages
//   node scripts/build-wordmark.mjs --check   inject nothing, exit 1 if one is stale
//
// Why an inline JSON island and not a .json file fetched at runtime:
//
//   · build-i18n.mjs already translates the string values of any
//     <script type="application/json">, the same way it does the career
//     timeline. A fetched file would sit outside that machinery and need a
//     hand-kept Spanish twin.
//   · It costs no request. The whole set is under 400 bytes a page, which is
//     less than the round trip that fetching it would spend.
//   · It ships with the page it belongs to, so a message can never be newer
//     than the markup that reads it.
//
// Run before build-i18n.mjs — same ordering rule as the timeline and the map.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAGE_FILES } from './site.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const START = '<!-- wordmark:start -->';
const END = '<!-- wordmark:end -->';
const check = process.argv.includes('--check');

// Short on purpose: the wordmark sits in a flex header, so every character is
// width the nav has to give back. Nothing over ~14 characters.
//
// The register is BRAND.md §3 — statement, no adjectives, no exclamation. Most
// of these are claims the site makes elsewhere and can back: the SCSS contract
// really is at zero !important, the accessibility one really is AA.
const MESSAGES = [
  'Hi',
  'Madrid',
  'Nineteen years',
  'Measure first',
  'Reuse first',
  'Tokens first',
  'No !important',
  'WCAG 2.1 AA',
  'Design + code',
  'Still shipping',
  'Read the case',
  'Built in SCSS',
];

const island = `<script type="application/json" id="wordmark-messages">${JSON.stringify(MESSAGES).replace(
  /</g,
  '\\u003c',
)}</script>`;

let stale = 0;
for (const page of PAGE_FILES) {
  const path = join(ROOT, page);
  const html = readFileSync(path, 'utf8');

  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a === -1 || b === -1) throw new Error(`build-wordmark: markers not found in ${page}`);

  const next = html.slice(0, a + START.length) + island + html.slice(b);
  if (next === html) {
    console.log(`build-wordmark: ${page} up to date`);
    continue;
  }
  if (check) {
    console.error(`build-wordmark: ${page} is stale — run npm run build:wordmark`);
    stale++;
    continue;
  }
  writeFileSync(path, next, 'utf8');
  console.log(`build-wordmark: ${page}`);
}

if (stale) process.exit(1);
