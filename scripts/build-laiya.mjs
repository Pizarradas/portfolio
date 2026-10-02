// Genera la base de conocimiento de LAIYA a partir del propio sitio.
//
//   node scripts/build-laiya.mjs           escribe assets/laiya/knowledge-{en,es}.json
//                                          y assets/laiya/tour-{en,es}.json
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
import { CASE_ALIASES, UI, VOICE, SUGGESTIONS, REMOTE, TOUR } from './laiya.config.mjs';

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


/* ------------------------------------------------------------- recorrido */

// assets/laiya/tour-{lang}.json: una ficha por ancla `data-laiya` (las pone
// build-laiya-anchors.mjs). Es lo que da a LAIYA autonomía dentro de un
// recorrido: sabe qué está señalando, qué contarlo al llegar (`say`) y qué
// frases de la página responden a «¿cuándo?», «¿qué cifras?», «¿con qué?»,
// «¿quién?», «¿por qué?», «¿qué cambió?» o «cuéntame más» (`s`, frases con
// etiquetas). Sigue siendo extracción, no redacción: cada frase es de la página.

const TAGS = {
  // Fechas y duraciones; un año suelto también cuenta.
  when: /\b(?:19|20)\d{2}\b|\b\d+(?:[.,]\d+)?\s*(?:años|año|years?|meses|months?|semanas|weeks?|días|days?)\b/i,
  // Cifras sueltas que no son un año: «279», «86 %», «0.3», «33 KB». Un
  // dígito dentro de un nombre (42DS, HTML5) no es una cifra.
  numbers: s => /(^|[\s(«“])\d+(?:[.,]\d+)?(?:\s?(?:%|×|x|KB|MB|ms|px))?(?=[\s.,;:)»”]|$)/i.test(s.replace(/\b(?:19|20)\d{2}\b/g, '')),
  who: /\b(?:equipo|team|editor(?:es|s)?|redacci[oó]n|newsroom|developers?|desarrollador(?:es|as)?|diseñador(?:es|as)?|designers?|product owners?|stakeholders?|personas|people|usuari[oa]s|users?|lectores|readers|clientes?|clients?|direcci[oó]n|management|negocio|business|marketing|periodistas|journalists|yo solo|on my own|by myself|en solitario|alone)\b/i,
  why: /\b(?:porque|ya que|para que|por eso|así que|el motivo|la raz[oó]n|because|so that|since|which is why|the reason|that is why)\b/i,
  result: /%|\b(?:resultado|impacto|redujo|reduce|reducir|aument[oó]|mejor[oó]|consigui[oó]|logr[oó]|cambi[oó]|ahora|pas[oó] de|result(?:ed|s)?|impact|reduced|increased|improved|now|became|shipped|moved from|outcome)\b/i,
};

function sentencesOf(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«“"0-9])/)
    .map(x => x.trim())
    .filter(x => x.length > 2);
}

function tagSentence(sentence, tools) {
  const tags = [];
  for (const [name, re] of Object.entries(TAGS)) if (typeof re === 'function' ? re(sentence) : re.test(sentence)) tags.push(name);
  if (tools.some(t => new RegExp(`(^|[^\\p{L}])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu').test(sentence))) tags.push('tools');
  return tags;
}

const openAttrs = open => Object.fromEntries([...open.matchAll(/\s([a-zA-Z][\w:.-]*)="([^"]*)"/g)].map(m => [m[1], decodeAll(m[2])]));

function closeIndex(html, tag, from) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 0;
  for (let m; (m = re.exec(html)); ) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return m.index;
  }
  return html.length;
}

const firstSentence = s => (s.match(/^.+?[.!?](?=\s|$)/) || [s])[0];

// Lo que se lee de un nodo, sin el cromo: en una tarjeta solo cuenta su
// cuerpo (la vista previa, el «Leer el caso» y la numeración no son
// contenido), y un par dt/dd se lee como «Rol: Diseño editorial.».
function readable(inner) {
  const body = inner.match(/<div\b[^>]*class="[^"]*__(?:body|copy|intro)\b[^"]*"[^>]*>/i);
  let html = body ? inner.slice(body.index, closeIndex(inner, 'div', body.index)) : inner;
  return html
    .replace(/<wbr\s*\/?>/gi, '')
    .replace(/<figure\b[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<button\b[\s\S]*?<\/button>/gi, ' ')
    .replace(/<([a-z0-9]+)\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<p\b[^>]*class="[^"]*__(?:ref|links|chrome|fallback)\b[^"]*"[^>]*>[\s\S]*?<\/p>/gi, ' ')
    .replace(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi, '<p>$1: $2.</p>')
    .replace(/<span\b[^>]*class="[^"]*__label"[^>]*>([\s\S]*?)<\/span>\s*<span\b[^>]*class="[^"]*__value"[^>]*>([\s\S]*?)<\/span>/gi, '<p>$1: $2.</p>');
}

function tourOf(lang, k) {
  const ui = UI[lang];
  const tools = [...new Set([...k.tools.flatMap(g => g.items), ...k.practice.map(p => p.name)])].filter(t => t.length > 1);
  const byFile = Object.fromEntries(k.pages.map(p => [p.file, p]));
  const out = { version: 1, lang, copy: TOUR[lang], pages: {} };

  for (const { file } of PAGES) {
    const src = readFileSync(join(ROOT, lang === 'es' ? 'es' : '', file), 'utf8');
    const anchors = {};
    const tours = {};
    for (const m of src.matchAll(/<([a-z0-9]+)\b[^>]*\sdata-laiya="[^"]*"[^>]*>/gi)) {
      const tag = m[1];
      const a = openAttrs(m[0]);
      const id = a['data-laiya'];
      const inner = src.slice(m.index + m[0].length, closeIndex(src, tag, m.index));
      const kind = a['data-laiya-kind'] || 'block';

      // Título: el encabezado del nodo; en una sección, el que la nombra.
      let title = '';
      if (a['aria-labelledby']) title = textOf(first(src, new RegExp(`<h[1-6]\\b[^>]*\\bid="${a['aria-labelledby']}"[^>]*>([\\s\\S]*?)<\\/h[1-6]>`, 'i')));
      if (!title) title = textOf(first(inner, /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i));
      if (!title && kind === 'role') title = textOf(first(inner, /<b>([\s\S]*?)<\/b>/i));
      if (!title && kind === 'item') title = textOf(first(inner, /<dt>([\s\S]*?)<\/dt>/i) || first(inner, /class="mol-contact-list__label">([\s\S]*?)</i));

      const text = textOf(readable(inner));
      const caseFile = (inner.match(/\shref="(case-[^"#]+\.html)"/) || [])[1] || '';
      const entry = { kind, title };
      if (a['data-laiya-topic']) entry.topics = a['data-laiya-topic'].split(/\s+/);
      if (a['data-laiya-shape']) entry.shape = a['data-laiya-shape'];
      if (a['data-laiya-fx']) entry.fx = a['data-laiya-fx'].split(/\s+/);
      if (caseFile && caseFile !== file) entry.case = caseFile;

      // El texto sin el titular ni el antetítulo que lo precede.
      let rest = text;
      const at = title ? rest.indexOf(title) : -1;
      if (at >= 0 && at < 80) rest = rest.slice(at + title.length);
      rest = rest.replace(/^[\s.·:]+/, '');

      // Lo que dice al llegar: la misma regla para cada tipo de nodo.
      let say = '';
      if (kind === 'role') {
        const c = k.career.find(x => x.org.toLowerCase() === title.toLowerCase());
        const when = (c && c.when) || textOf(first(inner, /<time>([\s\S]*?)<\/time>/i));
        const role = (c && c.role) || textOf(first(inner, /class="mol-career-role__role">([\s\S]*?)<\/span>/i));
        say = `${title}, ${when}. ${role}.`;
      } else if (kind === 'card' && entry.case && byFile[entry.case]) {
        const p = byFile[entry.case];
        const own = /\.[a-z0-9]+$/.test(id.replace(/^project\./, '')) ? title : p.name;
        say = `${own}${p.selfDirected ? ' — ' + ui.selfDirected : ''}. ${firstSentence(p.description)}`;
      } else if (id === 'tools.practice') say = k.practice.map(p => p.name).join(' · ') + '.';
      else if (id === 'tools.stack') say = k.tools.map(g => `${g.group}: ${g.items.join(', ')}`).join('. ') + '.';
      else if (id === 'about.facts') say = k.person.facts.map(f => `${f.label}: ${f.value}`).join('. ') + '.';
      else if (kind === 'item') say = `${title}: ${text.replace(title, '').replace(/^[\s·:]+/, '')}`.replace(/\s*\.?$/, '.');
      else if (id === 'contact.links') say = k.person.contact.email;
      else if (kind === 'section' && file !== 'index.html') say = clip(firstSentence(rest) || title, 220);
      else say = title;
      entry.say = say;

      // Las frases, con lo que responden: primero lo que dice al llegar (o el
      // titular), luego el resto del nodo sin repetir el titular ni el
      // antetítulo que lo precede.
      const lead = kind === 'role' || kind === 'item' || kind === 'card' || id === 'tools.practice' ? say : id === 'tools.stack' ? '' : title;
      // Una etapa se cuenta con sus campos (nota y medida); un dato o la pila
      // de herramientas ya están dichos en `say`, troceado.
      const own =
        kind === 'role'
          ? [textOf(first(inner, /class="mol-career-role__note">([\s\S]*?)<\/span>/i)), textOf(first(inner, /class="mol-career-role__meta">([\s\S]*?)<\/span>\s*<\/li>/i) || first(inner, /class="mol-career-role__meta">([\s\S]*)$/i))].filter(Boolean).map(x => x.replace(/\s*\.?$/, '.'))
          : kind === 'item' || id === 'tools.stack' || id === 'tools.practice'
          ? []
          : sentencesOf(clip(rest, 1600));
      const more = id === 'tools.stack' ? say.split(/(?<=\.)\s+/) : id === 'tools.practice' ? k.practice.map(p => `${p.name}: ${p.detail}`.replace(/\s*\.?$/, '.')) : [];
      const parts = [lead, ...more, ...own]
        .map(x => x.replace(/\.\.+$/, '.').trim())
        .filter((x, i, all) => x && all.findIndex(y => y.replace(/\W/g, '') === x.replace(/\W/g, '')) === i)
        // Una etapa o un dato ya están dichos en `say`: no se repiten crudos.
        .filter((x, i) => !(i > 0 && (kind === 'role' || kind === 'item') && x.includes(title)));
      entry.s = parts.map(x => {
        const tags = tagSentence(x, tools);
        return tags.length ? [x, tags.join(' ')] : [x];
      });
      const present = new Set(entry.s.flatMap(x => (x[1] || '').split(' ').filter(Boolean)));
      // En una etapa, «designer» es el cargo, no un equipo: sin «¿quién?».
      if (kind === 'role') present.delete('who');
      entry.ask = ['more', ...['when', 'numbers', 'tools', 'who', 'why', 'result'].filter(t => present.has(t)), ...(entry.case ? ['go'] : [])];

      const links = [...inner.matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
        .map(l => ({ href: decodeAll(l[1]), label: textOf(l[2]) }))
        .filter(l => l.label && !/^#/.test(l.href));
      if (links.length) entry.links = links.slice(0, 4);

      anchors[id] = entry;
      for (const t of (a['data-laiya-tour'] || '').split(/\s+/).filter(Boolean)) {
        const [name, n] = t.split(':');
        (tours[name] = tours[name] || []).push([+n, id]);
      }
    }
    out.pages[file] = {
      name: (k.pages.find(p => p.file === file) || {}).name || file,
      tours: Object.fromEntries(Object.entries(tours).map(([n, list]) => [n, list.sort((x, y) => x[0] - y[0]).map(x => x[1])])),
      anchors,
    };
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
let stale = false;
const emit = (name, json) => {
  const path = join(OUT, name);
  let current = '';
  try { current = readFileSync(path, 'utf8'); } catch {}
  if (check) {
    if (current !== json) {
      console.error(`ERROR  assets/laiya/${name} está desfasado. Ejecuta npm run build:laiya.`);
      stale = true;
    }
    return false;
  }
  writeFileSync(path, json);
  return true;
};
for (const lang of LANGS) {
  const k = knowledge(lang);
  const json = JSON.stringify(k) + '\n';
  if (emit(`knowledge-${lang}.json`, json)) {
    const n = k.pages.reduce((a, p) => a + p.sections.length, 0);
    console.log(`laiya  ${lang}  ${k.pages.length} páginas · ${n} secciones · ${k.career.length} etapas · ${(json.length / 1024).toFixed(1)} KB`);
  }
  const tour = tourOf(lang, k);
  const tjson = JSON.stringify(tour) + '\n';
  if (emit(`tour-${lang}.json`, tjson)) {
    const anchors = Object.values(tour.pages).reduce((a, p) => a + Object.keys(p.anchors).length, 0);
    const tours = Object.values(tour.pages).reduce((a, p) => a + Object.keys(p.tours).length, 0);
    console.log(`laiya  ${lang}  recorrido · ${anchors} anclas · ${tours} recorridos · ${(tjson.length / 1024).toFixed(1)} KB`);
  }
}
if (stale) process.exit(1);
