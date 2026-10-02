// Genera la base de conocimiento de LAIYA a partir del propio sitio.
//
//   node scripts/build-laiya.mjs           escribe assets/laiya/knowledge-{en,es}.json
//   node scripts/build-laiya.mjs --check   no escribe nada; exit 1 si están desfasados
//
// LAIYA no tiene un texto propio sobre el trabajo de José: lo lee de las
// páginas publicadas. Así la capa no puede contradecir al sitio ni adelantarse
// a él — si una frase cambia en `case-sport.html`, cambia en la conversación
// en cuanto se vuelve a ejecutar esto. Va DESPUÉS de build-i18n.mjs, porque la
// versión española se extrae de `es/`, que es salida generada.
//
// Regex y no un parser, igual que site.config.mjs: el marcado es regular
// (cada sección se abre con `aria-labelledby` y su encabezado lleva ese id) y
// un árbol obligaría a añadir una dependencia solo para leer.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAGES, SITE, CV, ogImage, plain, descriptionOf } from './site.config.mjs';
import { CASE_ALIASES, UI, VOICE, SUGGESTIONS, REMOTE } from './laiya.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'laiya');
const check = process.argv.includes('--check');

const LANGS = ['en', 'es'];
const SECTION_TEXT_MAX = 900;

/* ------------------------------------------------------------- utilidades */

const decodeAll = s =>
  plain(
    s
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&rsquo;/g, '’')
      .replace(/&lsquo;/g, '‘')
      .replace(/&ldquo;/g, '“')
      .replace(/&rdquo;/g, '”')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&middot;/g, '·')
      .replace(/&times;/g, '×')
      .replace(/&hellip;/g, '…'),
  );

// Texto legible de un trozo de marcado: fuera scripts, estilos, SVG, iframes y
// todo lo que está escondido a propósito para el lector de pantalla.
function textOf(html) {
  const BREAK = '\u2029';
  const raw = decodeAll(
    html
      .replace(/<(script|style|svg|iframe|canvas|template)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|li|h\d|dt|dd|td|th|tr|figcaption|div|blockquote|summary)>/gi, BREAK)
      .replace(/<[^>]*>/g, ' ')
      .replace(/[↗↘→]/g, ' '),
  );
  // Los bloques se unen según lo que son: una frase cerrada sigue con espacio;
  // un fragmento suelto —una etiqueta, una cifra de tabla— va con punto medio,
  // que es como se leen en la página.
  const parts = raw.split(BREAK).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let out = '';
  for (const part of parts) {
    if (!out) { out = part; continue; }
    const closed = /[.!?:…”»"]$/.test(out);
    const long = out.split(' ').slice(-8).length >= 7 && part.split(' ').length >= 7;
    out += closed ? ' ' + part : long ? '. ' + part : ' · ' + part;
  }
  return out.trim();
}

const clip = (s, max) => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '));
  return (end > max * 0.5 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…').trim();
};

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? decodeAll(m[1]) : '';
};

const first = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : '';
};

/* -------------------------------------------------------------- extractores */

function sectionsOf(html) {
  const main = first(html, /<main\b[^>]*>([\s\S]*?)<\/main>/i) || html;
  const opens = [...main.matchAll(/<section\b[^>]*\baria-labelledby="([^"]+)"[^>]*>/gi)];
  const out = [];
  opens.forEach((m, i) => {
    const start = m.index;
    const end = i + 1 < opens.length ? opens[i + 1].index : main.length;
    const chunk = main.slice(start, end);
    const id = m[1];
    const heading = first(chunk, new RegExp(`<h[1-6]\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)<\\/h[1-6]>`, 'i'));
    if (!heading) return;
    const title = textOf(heading);
    let body = textOf(chunk.replace(heading, ''));
    const kicker = textOf(first(chunk, /<p\b[^>]*class="[^"]*\batom-(?:eyebrow|index)\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i));
    if (kicker && body.startsWith(kicker)) body = body.slice(kicker.length).replace(/^[\s·]+/, '');
    const imgTag = [...chunk.matchAll(/<img\b[^>]*>/gi)].map(t => t[0]).find(t => attr(t, 'alt'));
    const section = { id, title, kicker, text: clip(body, SECTION_TEXT_MAX) };
    if (imgTag) section.image = { src: attr(imgTag, 'src'), alt: attr(imgTag, 'alt') };
    out.push(section);
  });
  return out;
}

function pageOf(file, lang) {
  const src = readFileSync(join(ROOT, lang === 'es' ? 'es' : '', file), 'utf8');
  const kicker = textOf(first(src, /<p\b[^>]*class="[^"]*\batom-eyebrow\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i));
  return {
    src,
    page: {
      file,
      key: file.replace(/^case-|\.html$/g, '') || 'home',
      title: textOf(first(src, /<title[^>]*>([\s\S]*?)<\/title>/i)),
      headline: textOf(first(src, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i)),
      description: decodeAll(descriptionOf(src)),
      kicker,
      image: ogImage(file),
      sections: sectionsOf(src),
    },
  };
}

function homeExtras(src, lang) {
  // Los seis registros de la home: qué demuestra cada caso, en sus palabras.
  const scan = first(src, /<nav\b[^>]*class="org-capability-scan"[^>]*>([\s\S]*?)<\/nav>/i);
  const capabilities = {};
  for (const m of scan.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>\s*<b>([\s\S]*?)<\/b>\s*<span>([\s\S]*?)<\/span>/gi))
    capabilities[m[1]] = { register: textOf(m[2]), label: textOf(m[3]) };

  const career = JSON.parse(decodeAll(first(src, /<script[^>]*id="career-tip-data"[^>]*>([\s\S]*?)<\/script>/i)) || '[]');

  const practiceHtml = first(src, /<ul\b[^>]*class="mol-practice-list"[^>]*>([\s\S]*?)<\/ul>/i);
  const practice = [...practiceHtml.matchAll(/<li>\s*<b>([\s\S]*?)<\/b>\s*<span>([\s\S]*?)<\/span>/gi)].map(m => ({
    name: textOf(m[1]),
    detail: textOf(m[2]),
  }));
  const tools = [...src.matchAll(/<section class="mol-mark-group">\s*<h3>([\s\S]*?)<\/h3>([\s\S]*?)<\/section>/gi)].map(m => ({
    group: textOf(m[1]),
    items: [...m[2].matchAll(/<span>([\s\S]*?)<\/span>/gi)].map(s => textOf(s[1])),
  }));

  const facts = [...first(src, /<dl\b[^>]*class="mol-about-facts"[^>]*>([\s\S]*?)<\/dl>/i).matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi)].map(m => ({
    label: textOf(m[1]),
    value: textOf(m[2]),
  }));

  const hero = first(src, /<section\b[^>]*class="org-hero[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
  const thesisSection = first(src, /(<section\b[^>]*aria-labelledby="thesis-title"[\s\S]*?)<section\b/i);

  return {
    capabilities,
    career,
    practice,
    tools,
    facts,
    lede: textOf(first(hero, /<p\b[^>]*class="atom-lede"[^>]*>([\s\S]*?)<\/p>/i)),
    thesis: textOf(first(thesisSection, /<h2\b[^>]*>([\s\S]*?)<\/h2>/i)),
    contact: {
      email: SITE.email,
      linkedin: SITE.sameAs[0],
      cv: CV[lang],
    },
    _lang: lang,
  };
}

/* ------------------------------------------------------------------- build */

function knowledge(lang) {
  const pages = [];
  let home = null;
  for (const { file, crumb } of PAGES) {
    const { src, page } = pageOf(file, lang);
    page.name = crumb[lang];
    if (file === 'index.html') home = homeExtras(src, lang);
    pages.push(page);
  }
  // `Self-directed` sale del eyebrow inglés y vale para los dos idiomas: la
  // etiqueta es un hecho del caso, no una frase (BRAND.md §7.4).
  for (const p of pages) {
    const en = lang === 'en' ? p : pageOf(p.file, 'en').page;
    p.selfDirected = /self-directed/i.test(en.kicker);
    p.aliases = CASE_ALIASES[p.file] || [];
    if (home.capabilities[p.file]) p.capability = home.capabilities[p.file];
  }
  const facts = Object.fromEntries(home.facts.map((f, i) => [['location', 'languages', 'education', 'focus'][i] || f.label, f]));

  return {
    version: 1,
    lang,
    ui: UI[lang],
    voice: VOICE[lang],
    suggestions: SUGGESTIONS[lang],
    remote: REMOTE,
    person: {
      name: SITE.name,
      role: SITE.jobTitle,
      location: facts.location?.value || `${SITE.locality}, Spain`,
      lede: home.lede,
      thesis: home.thesis,
      facts: home.facts,
      factIndex: Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, v.value])),
      contact: home.contact,
    },
    career: home.career,
    practice: home.practice,
    tools: home.tools,
    pages,
  };
}

mkdirSync(OUT, { recursive: true });
let stale = false;
for (const lang of LANGS) {
  const json = JSON.stringify(knowledge(lang)) + '\n';
  const path = join(OUT, `knowledge-${lang}.json`);
  let current = '';
  try { current = readFileSync(path, 'utf8'); } catch {}
  if (check) {
    if (current !== json) {
      console.error(`ERROR  assets/laiya/knowledge-${lang}.json está desfasado. Ejecuta npm run build:laiya.`);
      stale = true;
    }
    continue;
  }
  writeFileSync(path, json);
  const k = JSON.parse(json);
  const n = k.pages.reduce((a, p) => a + p.sections.length, 0);
  console.log(`laiya  ${lang}  ${k.pages.length} páginas · ${n} secciones · ${k.career.length} etapas · ${(json.length / 1024).toFixed(1)} KB`);
}
if (stale) process.exit(1);
