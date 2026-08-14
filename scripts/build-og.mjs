// Builds every raster asset the site needs but does not have: one 1200×630
// social card per page, plus the favicon set.
//
//   node scripts/build-og.mjs           render everything into assets/
//   node scripts/build-og.mjs --check   render nothing, exit 1 if a file is missing
//
// BRAND.md §4 forbids stock photography and says that an image which does not
// exist gets built with code. So the cards are an HTML page — the site's own
// navy, its own wordmark, its own type scale — screenshotted by headless
// Chrome. No image library, no binary asset to hand-maintain: the card's
// headline is read out of the page it belongs to, so rewriting an h1 and
// re-running this is the whole update story.
//
// Chrome is the only dependency and it is not installed by npm. Set CHROME_PATH
// if it lives somewhere unusual.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAGES, ogImage, OG_IMAGE_SIZE, headlineOf, kickerOf, plain } from './site.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(ROOT, '.tmp-og');
const check = process.argv.includes('--check');

/* -------------------------------------------------------------------- chrome */

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

function findChrome() {
  const hit = CHROME_CANDIDATES.find(p => existsSync(p));
  if (!hit) {
    throw new Error(
      'build-og: no Chrome or Edge found. Set CHROME_PATH to the executable.\n' +
        `Looked in:\n  ${CHROME_CANDIDATES.join('\n  ')}`,
    );
  }
  return hit;
}

// --virtual-time-budget is what makes this deterministic: Chrome fast-forwards
// its clock until the page is idle, so the webfonts are always loaded before
// the shot. Without it the first render occasionally lands on the fallback
// stack and one card ships in Arial.
function shoot(chrome, htmlPath, outPath, { width, height, transparent = false }) {
  const args = [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=10000',
    `--user-data-dir=${join(TMP, 'profile')}`,
    `--window-size=${width},${height}`,
    `--screenshot=${outPath}`,
  ];
  if (transparent) args.push('--default-background-color=00000000');
  args.push(`file:///${htmlPath.replace(/\\/g, '/')}`);
  execFileSync(chrome, args, { stdio: 'ignore' });
  if (!existsSync(outPath)) throw new Error(`build-og: Chrome produced no file at ${outPath}`);
}

/* ------------------------------------------------------------- the card page */

const escapeHtml = s =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Every number below is a step of scss/PROPORTIONS.md at the 16px base, not a
// value picked by eye:
//   86.2  spacing n=7        card padding
//   67.8 / 57.7 / 49.2 / 41.9  type n=9…6   headline, by length
//   22.1  type n=2           kicker and footer
//   30.4  type n=4           wordmark
//   1.090 line-height n=5   the hero pairing
//   −0.0382em tracking n=2  display, not hero: hero tracking is calibrated for
//                           109.7px and at 67.8px it welds "I studied" shut.
//                           The matching positive word-spacing gives back
//                           exactly what the negative tracking takes from the
//                           space character, so words separate and letters stay
//                           tight.
//   741.6 = 1200/φ, 458.3 = 741.6/φ   where the grid rules fall
const HEADLINE_SIZE = length => (length <= 40 ? 67.8 : length <= 70 ? 57.7 : length <= 104 ? 49.2 : 41.9);

function cardHtml({ kicker, headline }) {
  const size = HEADLINE_SIZE(headline.length);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&amp;family=Inter:wght@400;500;600;700&amp;display=block" rel="stylesheet"/>
<style>
  *{ margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${OG_IMAGE_SIZE.width}px; height:${OG_IMAGE_SIZE.height}px; }
  body {
    background:#080f2f;
    color:#fff;
    font-family:'Inter', system-ui, sans-serif;
    -webkit-font-smoothing:antialiased;
    position:relative;
    overflow:hidden;
  }
  /* The site shows its grid because the site is about systems. Same here. */
  .grid { position:absolute; inset:0; }
  .grid i { position:absolute; top:0; bottom:0; width:1px; background:rgba(255,255,255,.07); }
  .grid i:nth-child(1){ left:458.3px; }
  .grid i:nth-child(2){ left:741.6px; }
  .frame {
    position:relative;
    height:100%;
    padding:86.2px;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
  }
  .top { display:flex; align-items:baseline; justify-content:space-between; gap:41.9px; }
  .wordmark {
    font-family:'Instrument Sans', system-ui, sans-serif;
    font-weight:700;
    font-size:30.4px;
    letter-spacing:-0.07em;
  }
  .wordmark span { color:#1E3AFF; }
  .kicker {
    font-weight:600;
    font-size:22.1px;
    line-height:1.236;
    letter-spacing:0.0955em;
    text-transform:uppercase;
    color:rgba(255,255,255,.56);
    text-align:right;
    max-width:741.6px;
  }
  h1 {
    font-family:'Instrument Sans', system-ui, sans-serif;
    font-weight:700;
    font-size:${size}px;
    line-height:1.090;
    letter-spacing:-0.0382em;
    word-spacing:0.0382em;
    text-wrap:balance;
    padding-block:41.9px;
  }
  .foot {
    display:flex;
    align-items:baseline;
    justify-content:space-between;
    gap:41.9px;
    padding-top:32.9px;
    border-top:1px solid rgba(255,255,255,.16);
    font-size:22.1px;
    line-height:1.382;
    color:rgba(255,255,255,.72);
  }
  .foot b { font-weight:600; color:#fff; }
</style>
</head>
<body>
<div class="grid"><i></i><i></i></div>
<div class="frame">
  <div class="top">
    <div class="wordmark">JLP<span>.</span></div>
    <div class="kicker">${escapeHtml(kicker)}</div>
  </div>
  <h1>${escapeHtml(headline)}</h1>
  <div class="foot">
    <div><b>José Luis Pizarro</b> — Product Designer &amp; Front-End Engineer</div>
    <div>Madrid</div>
  </div>
</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ favicons */

// Drawn as geometry, not as a webfont: an SVG favicon is rendered by the
// visitor's browser, which has no access to Instrument Sans, so a <text> mark
// would ship as Arial there and as Instrument Sans in the PNGs generated here.
// A path looks the same in all four outputs.
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="JLP">
  <rect width="64" height="64" rx="13" fill="#080f2f"/>
  <path d="M41 13v26.5c0 7.2-5 11.5-12.3 11.5-5.6 0-10-2.5-12.7-6.9l7.3-4.6c1.3 2.2 3 3.4 5.2 3.4 2.8 0 4.5-1.8 4.5-5.2V13z" fill="#fff"/>
  <circle cx="47.5" cy="46.5" r="4.5" fill="#1E3AFF"/>
</svg>
`;

const faviconPage = size =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${FAVICON_SVG}</body></html>`;

// A .ico may simply wrap a PNG (every browser since IE11 reads it), so the file
// is a 22-byte header in front of the bytes Chrome already produced.
function icoFromPng(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

/* ----------------------------------------------------------------- pipeline */

const expected = [
  ...PAGES.map(p => ogImage(p.file)),
  'assets/favicon.svg',
  'assets/favicon.ico',
  'assets/apple-touch-icon.png',
];

if (check) {
  const missing = expected.filter(rel => !existsSync(join(ROOT, rel)));
  if (missing.length) {
    console.error(`build-og: ${missing.length} asset(s) missing — run npm run build:og`);
    for (const m of missing) console.error(`  · ${m}`);
    process.exit(1);
  }
  console.log('build-og: every asset present.');
  process.exit(0);
}

const chrome = findChrome();
console.log(`build-og: using ${chrome}`);

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(join(ROOT, 'assets', 'og'), { recursive: true });

try {
  for (const page of PAGES) {
    const html = readFileSync(join(ROOT, page.file), 'utf8');
    const headline = plain(headlineOf(html));
    const kicker = plain(kickerOf(html));
    if (!headline) throw new Error(`build-og: ${page.file} has no <h1> to put on its card`);

    const tmpHtml = join(TMP, `${page.file}`);
    writeFileSync(tmpHtml, cardHtml({ kicker, headline }), 'utf8');

    const out = join(ROOT, ogImage(page.file));
    shoot(chrome, tmpHtml, out, OG_IMAGE_SIZE);
    console.log(`build-og: ${ogImage(page.file)}  ${headline.slice(0, 60)}`);
  }

  writeFileSync(join(ROOT, 'assets', 'favicon.svg'), FAVICON_SVG, 'utf8');
  console.log('build-og: assets/favicon.svg');

  for (const [size, name] of [
    [32, 'favicon-32.png'],
    [180, 'apple-touch-icon.png'],
  ]) {
    const tmpHtml = join(TMP, `icon-${size}.html`);
    writeFileSync(tmpHtml, faviconPage(size), 'utf8');
    const out = join(TMP, name);
    shoot(chrome, tmpHtml, out, { width: size, height: size, transparent: true });

    if (name === 'favicon-32.png') {
      writeFileSync(join(ROOT, 'assets', 'favicon.ico'), icoFromPng(readFileSync(out), size));
      console.log('build-og: assets/favicon.ico');
    } else {
      writeFileSync(join(ROOT, 'assets', name), readFileSync(out));
      console.log(`build-og: assets/${name}`);
    }
  }
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
