// Generates the Spanish mirror of the site (es/*.html) from the English pages.
//
// The English files under the repo root are the single source of truth for
// markup. Spanish is never hand-edited as HTML: this script copies each page,
// swaps every translatable text run and attribute using i18n/es.json, rewrites
// the relative URLs one level down, and fills the language-switch and hreflang
// blocks marked in the source.
//
//   node scripts/build-i18n.mjs            build es/ and report missing strings
//   node scripts/build-i18n.mjs --extract  write i18n/_missing.json for translating
//   node scripts/build-i18n.mjs --check    build nothing, exit 1 if anything is missing
//
// Because es/ is generated, editing an English page and re-running this is the
// whole maintenance story: only genuinely new sentences ever need a translation.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BASE,
  SITE,
  PAGE_FILES as PAGES,
  PAGE_BY_FILE,
  OG_IMAGE_SIZE,
  ogImage,
  titleOf,
  descriptionOf,
  headlineOf,
  FONT_PRELOAD,
  plain,
} from './site.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Every page that exists in both languages lives in site.config.mjs. Anything
// linked from here that is NOT in that list is treated as a shared asset and
// gets a ../ prefix.
const PAGE_SET = new Set(PAGES);

// Shared, language-neutral directories. The Spanish pages sit one level deeper.
const SHARED_DIR = /^(css|js|assets)\//;

// Attributes whose value is read by a human or announced by a screen reader.
const TEXT_ATTRS = ['alt', 'title', 'aria-label', 'aria-description', 'aria-roledescription', 'placeholder', 'data-label', 'label'];

// Elements whose content is not markup and must not be tokenised as text.
const RAW_ELEMENTS = new Set(['script', 'style', 'textarea']);

// Copy that only ever exists in one language because it is generated, never
// authored. It must not reach i18n/es.json: the dictionary is for strings a
// human wrote in the English page.
const UI = {
  en: {
    switchLabel: 'Language',
    otherTitle: 'Ver esta página en español',
    selfTitle: 'Viewing in English',
    locale: 'en_GB',
    altLocale: 'es_ES',
    cardAlt: headline => `Share card: “${headline}” — José Luis Pizarro`,
  },
  es: {
    switchLabel: 'Idioma',
    otherTitle: 'View this page in English',
    selfTitle: 'Estás viendo la versión en español',
    locale: 'es_ES',
    altLocale: 'en_GB',
    cardAlt: headline => `Tarjeta para compartir: «${headline}» — José Luis Pizarro`,
  },
};

const mode = process.argv.includes('--extract')
  ? 'extract'
  : process.argv.includes('--check')
    ? 'check'
    : 'build';

/* ---------------------------------------------------------------- tokeniser */

// Splits HTML into tags, comments, raw blocks and text runs without parsing it
// into a tree. Nothing is re-serialised, so the output is byte-identical to the
// input except for the runs this script deliberately replaces.
function tokenise(html) {
  const out = [];
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out.push({ type: 'text', value: html.slice(i) });
      break;
    }
    if (lt > i) out.push({ type: 'text', value: html.slice(i, lt) });

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      const stop = end === -1 ? html.length : end + 3;
      out.push({ type: 'comment', value: html.slice(lt, stop) });
      i = stop;
      continue;
    }

    // Walk to the closing bracket, ignoring any > that sits inside a quoted
    // attribute value.
    let j = lt + 1;
    let quote = null;
    while (j < html.length) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        break;
      }
      j++;
    }

    const tag = html.slice(lt, Math.min(j + 1, html.length));
    out.push({ type: 'tag', value: tag });
    i = j + 1;

    const name = (tag.match(/^<\s*([a-zA-Z0-9-]+)/) || [])[1];
    if (name && RAW_ELEMENTS.has(name.toLowerCase()) && !tag.endsWith('/>')) {
      const rest = html.slice(i);
      const close = rest.search(new RegExp(`</\\s*${name}\\s*>`, 'i'));
      const len = close === -1 ? rest.length : close;
      out.push({ type: 'raw', value: rest.slice(0, len), owner: tag });
      i += len;
    }
  }

  return out;
}

const serialise = tokens => tokens.map(t => t.value).join('');

/* ------------------------------------------------------- translatable units */

// A run is worth translating only if it carries letters. Arrows, bullets,
// percentages, counters and pure punctuation are language-neutral and stay put.
const isTranslatable = s => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(s);

// Text nodes carry their own surrounding whitespace; the dictionary is keyed on
// the trimmed sentence so reformatting the HTML never invalidates a key.
const splitPadding = value => {
  const m = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return { lead: m[1], core: m[2], tail: m[3] };
};

function collectFromTag(tag, push) {
  for (const attr of TEXT_ATTRS) {
    const re = new RegExp(`\\s${attr}\\s*=\\s*"([^"]*)"`, 'gi');
    let m;
    while ((m = re.exec(tag))) if (isTranslatable(m[1])) push(m[1]);
  }
  if (/\sname\s*=\s*"description"/i.test(tag) || /\sproperty\s*=\s*"og:(title|description)"/i.test(tag)) {
    const m = tag.match(/\scontent\s*=\s*"([^"]*)"/i);
    if (m && isTranslatable(m[1])) push(m[1]);
  }
}

function collect(tokens, push) {
  for (const t of tokens) {
    if (t.type === 'text') {
      const { core } = splitPadding(t.value);
      if (core && isTranslatable(core)) push(core);
    } else if (t.type === 'tag') {
      collectFromTag(t.value, push);
    } else if (t.type === 'raw' && /type\s*=\s*"application\/json"/i.test(t.owner)) {
      walkJsonStrings(t.value, push);
    }
  }
}

// The career timeline ships its tooltip copy as a JSON island. Its string
// values are prose and need translating like any other text node.
function walkJsonStrings(source, push) {
  let data;
  try {
    data = JSON.parse(source);
  } catch {
    return;
  }
  const visit = node => {
    if (typeof node === 'string') {
      if (isTranslatable(node)) push(node);
    } else if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (node && typeof node === 'object') {
      Object.values(node).forEach(visit);
    }
  };
  visit(data);
}

function mapJsonStrings(source, translate) {
  let data;
  try {
    data = JSON.parse(source);
  } catch {
    return source;
  }
  const visit = node => {
    if (typeof node === 'string') return isTranslatable(node) ? translate(node) : node;
    if (Array.isArray(node)) return node.map(visit);
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, visit(v)]));
    }
    return node;
  };
  // career-timeline.js reads this with JSON.parse, and the block sits inside a
  // <script>, so < has to stay escaped exactly as build-timeline.mjs writes it.
  return JSON.stringify(visit(data)).replace(/</g, '\\u003c');
}

/* --------------------------------------------------------------- url rewrite */

// Spanish pages live in es/, one level below the shared assets.
function rewriteUrl(url) {
  if (!url || /^(https?:|mailto:|tel:|data:|javascript:|#|\/\/|\/)/i.test(url)) return url;
  if (SHARED_DIR.test(url)) return `../${url}`;
  const [path] = url.split('#');
  if (PAGE_SET.has(path)) return url; // the Spanish sibling has the same name
  return `../${url}`;
}

function rewriteTagUrls(tag) {
  return tag.replace(/\s(href|src)\s*=\s*"([^"]*)"/gi, (whole, attr, url) => {
    const next = rewriteUrl(url);
    return next === url ? whole : ` ${attr}="${next}"`;
  });
}

/* ------------------------------------------------------------ marker blocks */

const HEAD_START = '<!-- i18n:head:start -->';
const HEAD_END = '<!-- i18n:head:end -->';
const SWITCH_START = '<!-- i18n:switch:start -->';
const SWITCH_END = '<!-- i18n:switch:end -->';

// Everything in the head that depends on the URL or on the language. Written
// into both the English source and its Spanish twin, so neither is hand-kept.
//
// The social titles and descriptions are READ BACK OUT of the page rather than
// declared here: <title> and <meta name="description"> have already been
// translated by the time this runs, so og:title can never disagree with the
// title, and no sentence has to exist twice in i18n/es.json.
function headBlock(html, page, lang) {
  const meta = PAGE_BY_FILE.get(page);
  const ui = UI[lang];
  const up = lang === 'es' ? '../' : ''; // Spanish pages sit one level deeper
  const url = lang === 'es' ? `${BASE}/es/${page}` : `${BASE}/${page}`;

  const title = titleOf(html).replace(/"/g, '&quot;');
  const description = descriptionOf(html);
  const headline = plain(headlineOf(html)) || plain(title);
  const image = `${BASE}/${ogImage(page)}`;
  const cardAlt = ui.cardAlt(headline).replace(/"/g, '&quot;');

  const lines = [
    `<link href="${url}" rel="canonical"/>`,
    `<link href="${BASE}/${page}" hreflang="en" rel="alternate"/>`,
    `<link href="${BASE}/es/${page}" hreflang="es" rel="alternate"/>`,
    `<link href="${BASE}/${page}" hreflang="x-default" rel="alternate"/>`,
    '',
    // max-image-preview:large is what makes the social card eligible to show up
    // in Google's own result cards; the default crops it to a thumbnail.
    `<meta content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" name="robots"/>`,
    `<meta content="${SITE.legalName}" name="author"/>`,
    `<meta content="${SITE.locality}" name="geo.placename"/>`,
    // The site has no dark mode (no prefers-color-scheme rule in scss/), so it
    // declares one scheme instead of pretending to support both.
    `<meta content="light" name="color-scheme"/>`,
    `<meta content="#ffffff" name="theme-color"/>`,
    '',
    `<meta content="${SITE.siteName[lang]}" property="og:site_name"/>`,
    `<meta content="${meta.ogType}" property="og:type"/>`,
    `<meta content="${url}" property="og:url"/>`,
    `<meta content="${title}" property="og:title"/>`,
    `<meta content="${description}" property="og:description"/>`,
    `<meta content="${image}" property="og:image"/>`,
    `<meta content="image/png" property="og:image:type"/>`,
    `<meta content="${OG_IMAGE_SIZE.width}" property="og:image:width"/>`,
    `<meta content="${OG_IMAGE_SIZE.height}" property="og:image:height"/>`,
    `<meta content="${cardAlt}" property="og:image:alt"/>`,
    `<meta content="${ui.locale}" property="og:locale"/>`,
    `<meta content="${ui.altLocale}" property="og:locale:alternate"/>`,
  ];

  if (meta.ogType === 'profile') {
    lines.push(
      `<meta content="José Luis" property="profile:first_name"/>`,
      `<meta content="Pizarro Feo" property="profile:last_name"/>`,
    );
  }

  lines.push(
    '',
    // Twitter falls back to Open Graph, but several other scrapers read only
    // the twitter:* pair, and summary_large_image has to be declared explicitly
    // or the card renders as a thumbnail.
    `<meta content="summary_large_image" name="twitter:card"/>`,
    `<meta content="${title}" name="twitter:title"/>`,
    `<meta content="${description}" name="twitter:description"/>`,
    `<meta content="${image}" name="twitter:image"/>`,
    `<meta content="${cardAlt}" name="twitter:image:alt"/>`,
    '',
    // The LCP element on every page is a headline, so the face it paints in is
    // on the critical path. Self-hosted and preloaded, it arrives on the
    // connection the browser already has; through Google Fonts it cost a
    // render-blocking third-party stylesheet plus two handshakes first.
    // Only the latin cuts: latin-ext is fetched on demand by unicode-range.
    ...FONT_PRELOAD.map(
      f => `<link as="font" crossorigin="" href="${up}assets/fonts/${f}" rel="preload" type="font/woff2"/>`,
    ),
    '',
    `<link href="${up}assets/favicon.svg" rel="icon" type="image/svg+xml"/>`,
    `<link href="${up}assets/favicon.ico" rel="alternate icon" sizes="32x32"/>`,
    `<link href="${up}assets/apple-touch-icon.png" rel="apple-touch-icon"/>`,
    // rel="me" ties the page to the profile that claims authorship of it.
    `<link href="${SITE.sameAs[0]}" rel="me"/>`,
    '',
    jsonLd(page, lang, { url, title: plain(title), description: plain(description), headline, image }),
  );

  return lines.join('\n');
}

/* ------------------------------------------------------------- structured data */

// One @graph per page. Person and WebSite repeat on every page under a stable
// @id so a crawler merges them instead of reading seven unrelated people.
function jsonLd(page, lang, { url, title, description, headline, image }) {
  const meta = PAGE_BY_FILE.get(page);
  const home = lang === 'es' ? `${BASE}/es/index.html` : `${BASE}/index.html`;
  const person = `${BASE}/#person`;
  const website = `${BASE}/#website`;
  const inLanguage = lang === 'es' ? 'es-ES' : 'en-GB';

  const picture = { '@type': 'ImageObject', url: image, width: OG_IMAGE_SIZE.width, height: OG_IMAGE_SIZE.height };

  const graph = [
    {
      '@type': 'Person',
      '@id': person,
      name: SITE.name,
      alternateName: SITE.legalName,
      url: home,
      jobTitle: SITE.jobTitle,
      email: `mailto:${SITE.email}`,
      address: { '@type': 'PostalAddress', addressLocality: SITE.locality, addressCountry: SITE.country },
      knowsAbout: SITE.knowsAbout,
      knowsLanguage: [
        { '@type': 'Language', name: 'Spanish', alternateName: 'es' },
        { '@type': 'Language', name: 'English', alternateName: 'en' },
      ],
      sameAs: SITE.sameAs,
    },
    {
      '@type': 'WebSite',
      '@id': website,
      url: `${BASE}/`,
      name: SITE.siteName[lang],
      inLanguage,
      author: { '@id': person },
      publisher: { '@id': person },
      copyrightHolder: { '@id': person },
    },
  ];

  const webPage = {
    '@type': meta.schema === 'ProfilePage' ? 'ProfilePage' : 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage,
    isPartOf: { '@id': website },
    primaryImageOfPage: picture,
    about: { '@id': person },
  };

  if (meta.schema === 'ProfilePage') {
    webPage.mainEntity = { '@id': person };
    graph.push(webPage);
  } else {
    const work = `${url}#work`;
    webPage.mainEntity = { '@id': work };
    webPage.breadcrumb = { '@id': `${url}#breadcrumb` };
    graph.push(webPage, {
      '@type': 'CreativeWork',
      '@id': work,
      name: headline,
      headline,
      description,
      url,
      inLanguage,
      image: picture,
      author: { '@id': person },
      creator: { '@id': person },
      isPartOf: { '@id': website },
    });
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: PAGE_BY_FILE.get('index.html').crumb[lang], item: home },
        { '@type': 'ListItem', position: 2, name: meta.crumb[lang], item: url },
      ],
    });
  }

  // The block sits inside a <script>, so a literal < in any string would end it
  // early — the same escape build-timeline.mjs applies to its JSON island.
  const body = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${body}</script>`;
}

// Two languages, so two always-visible links rather than a select: the current
// language stays readable at a glance and switching costs one click instead of
// open-menu, read, choose. Each link points at the translated twin of the page
// being read, never back to the home page.
function switchBlock(page, lang) {
  const enHref = lang === 'es' ? `../${page}` : page;
  const esHref = lang === 'es' ? page : `es/${page}`;
  const current = l =>
    l === lang ? ` aria-current="true" title="${UI[lang].selfTitle}"` : ` title="${UI[lang].otherTitle}"`;
  return [
    `<div aria-label="${UI[lang].switchLabel}" class="atom-lang-switch" role="group">`,
    `<a href="${enHref}" hreflang="en" lang="en"${current('en')}>EN</a>`,
    `<span aria-hidden="true">/</span>`,
    `<a href="${esHref}" hreflang="es" lang="es"${current('es')}>ES</a>`,
    `</div>`,
  ].join('');
}

function betweenMarkers(source, start, end, body, page, where) {
  const a = source.indexOf(start);
  const b = source.indexOf(end);
  if (a === -1 || b === -1) throw new Error(`build-i18n: ${where} markers not found in ${page}`);
  return source.slice(0, a + start.length) + body + source.slice(b);
}

function fillMarkers(html, page, lang) {
  let out = betweenMarkers(html, HEAD_START, HEAD_END, `\n${headBlock(html, page, lang)}\n`, page, 'i18n:head');
  return betweenMarkers(out, SWITCH_START, SWITCH_END, `\n${switchBlock(page, lang)}\n`, page, 'i18n:switch');
}

// A previous run already wrote the English blocks into the source pages. They
// are regenerated per language, so they are emptied before the page is walked —
// otherwise "EN", "Language" and the English tooltips arrive at the dictionary
// as if an author had typed them.
function clearMarkers(html, page) {
  let out = betweenMarkers(html, HEAD_START, HEAD_END, '\n', page, 'i18n:head');
  return betweenMarkers(out, SWITCH_START, SWITCH_END, '\n', page, 'i18n:switch');
}

/* ----------------------------------------------------------------- pipeline */

// es.json maps every English run to its Spanish twin. Proper nouns, job titles,
// tool names and code fragments read the same in both languages; listing them
// under "__same" keeps them explicitly reviewed without padding the file with
// hundreds of identical key/value pairs.
const dictPath = join(ROOT, 'i18n', 'es.json');
const raw = existsSync(dictPath) ? JSON.parse(readFileSync(dictPath, 'utf8')) : {};
const dict = Object.create(null);
for (const s of raw.__same || []) dict[s] = s;
for (const [k, v] of Object.entries(raw)) if (k !== '__same') dict[k] = v;

const missing = new Map(); // string -> pages it appears on
const noteMissing = (s, page) => {
  if (!missing.has(s)) missing.set(s, []);
  const seen = missing.get(s);
  if (!seen.includes(page)) seen.push(page);
};

function translatePage(page) {
  const onDisk = readFileSync(join(ROOT, page), 'utf8');
  const source = clearMarkers(onDisk, page);

  // The English page owns the markers too, so its canonical/alternate block and
  // its switcher stay in sync with this script rather than being hand-kept.
  const english = fillMarkers(source, page, 'en');
  if (mode === 'build' && english !== onDisk) writeFileSync(join(ROOT, page), english, 'utf8');

  // The switcher and the hreflang block are generated per language, so they are
  // injected after translation — their copy is already in the right language and
  // must never be looked up in the dictionary.
  const tokens = tokenise(source);

  const translate = s => {
    const hit = dict[s];
    if (hit === undefined || hit === '') {
      noteMissing(s, page);
      return s;
    }
    return hit;
  };

  for (const t of tokens) {
    if (t.type === 'text') {
      const { lead, core, tail } = splitPadding(t.value);
      if (core && isTranslatable(core)) t.value = lead + translate(core) + tail;
    } else if (t.type === 'tag') {
      let tag = t.value;

      if (/^<\s*html\b/i.test(tag)) tag = tag.replace(/\slang\s*=\s*"[^"]*"/i, ' lang="es"');

      for (const attr of TEXT_ATTRS) {
        tag = tag.replace(new RegExp(`(\\s${attr}\\s*=\\s*")([^"]*)(")`, 'gi'), (whole, a, value, c) =>
          isTranslatable(value) ? a + translate(value) + c : whole,
        );
      }
      if (/\sname\s*=\s*"description"/i.test(tag) || /\sproperty\s*=\s*"og:(title|description)"/i.test(tag)) {
        tag = tag.replace(/(\scontent\s*=\s*")([^"]*)(")/i, (whole, a, value, c) =>
          isTranslatable(value) ? a + translate(value) + c : whole,
        );
      }

      t.value = rewriteTagUrls(tag);
    } else if (t.type === 'raw' && /type\s*=\s*"application\/json"/i.test(t.owner)) {
      t.value = mapJsonStrings(t.value, translate);
    }
  }

  return fillMarkers(serialise(tokens), page, 'es');
}

const outDir = join(ROOT, 'es');
if (mode === 'build') mkdirSync(outDir, { recursive: true });

for (const page of PAGES) {
  const html = translatePage(page);
  if (mode === 'build') {
    writeFileSync(join(outDir, page), html, 'utf8');
    console.log(`build-i18n: es/${page}`);
  }
}

if (mode === 'extract') {
  const payload = {};
  for (const [source, pages] of missing) payload[source] = { es: '', pages };
  mkdirSync(join(ROOT, 'i18n'), { recursive: true });
  writeFileSync(join(ROOT, 'i18n', '_missing.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`build-i18n: ${missing.size} untranslated strings → i18n/_missing.json`);
} else if (missing.size) {
  console.error(`\nbuild-i18n: ${missing.size} strings have no Spanish translation:`);
  for (const [source, pages] of [...missing].slice(0, 20)) {
    console.error(`  · [${pages.join(', ')}] ${source.slice(0, 90)}`);
  }
  if (missing.size > 20) console.error(`  … and ${missing.size - 20} more (run with --extract)`);
  console.error('\nThose runs were copied through in English. Add them to i18n/es.json.');
  process.exit(1);
} else {
  console.log('build-i18n: every string translated.');
}
