// Pone las anclas de LAIYA (`data-laiya*`) en las páginas inglesas.
//
//   node scripts/build-laiya-anchors.mjs           reescribe index.html y case-*.html
//   node scripts/build-laiya-anchors.mjs --check   no escribe; exit 1 si faltan o sobran
//
// Las reglas viven en `scripts/laiya.anchors.mjs`, con el contrato completo de
// atributos. Va ANTES de build-i18n.mjs: el español se genera a partir del
// inglés y build-i18n copia los `data-*` sin traducirlos, así que las dos
// lenguas comparten ids y el JSON del recorrido puede cruzarlas.
//
// Es idempotente: quita todo `data-laiya*` que encuentre y vuelve a ponerlo
// según las reglas. Si una regla deja de encontrar su nodo —alguien cambió el
// marcado—, falla y dice cuál: un ancla perdida es un paso del recorrido que
// LAIYA ya no puede señalar, y eso no debe pasar en silencio.
//
// Regex y no un parser, como el resto de scripts: el marcado es regular y las
// aperturas de etiqueta llevan los atributos en orden alfabético.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PAGES } from './site.config.mjs';
import { rulesFor } from './laiya.anchors.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const ATTR_ORDER = ['data-laiya', 'data-laiya-fx', 'data-laiya-kind', 'data-laiya-shape', 'data-laiya-topic', 'data-laiya-tour'];

const slugify = s =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// El cierre que corresponde a una apertura, contando anidamiento del mismo tag.
function closeOf(html, tag, from) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 0;
  for (let m; (m = re.exec(html)); ) {
    if (m[1]) depth--;
    else depth++;
    if (depth === 0) return m.index;
  }
  return html.length;
}

function find(html, spec) {
  let lo = 0, hi = html.length;
  if (spec.within) {
    const w = html.match(new RegExp(`<([a-z0-9]+)\\b[^>]*${spec.within.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>`, 'i'));
    if (!w) return [];
    lo = w.index + w[0].length;
    hi = closeOf(html, w[1], w.index);
  }
  const found = [];
  if (spec.sections) {
    const re = /<section\b[^>]*\baria-labelledby="([^"]+)-title"[^>]*>/gi;
    re.lastIndex = lo;
    for (let m; (m = re.exec(html)) && m.index < hi; ) found.push({ at: m.index, open: m[0], tag: 'section', slug: m[1] });
  } else {
    const re = new RegExp(`<${spec.tag}\\b[^>]*>`, 'gi');
    re.lastIndex = lo;
    for (let m; (m = re.exec(html)) && m.index < hi; ) {
      if (spec.has && !m[0].includes(spec.has)) continue;
      found.push({ at: m.index, open: m[0], tag: spec.tag });
      if (!spec.each) break;
    }
  }
  const seen = new Set();
  return found.map((n, i) => {
    const end = closeOf(html, n.tag, n.at);
    const inner = html.slice(n.at + n.open.length, end);
    // El enlace que cuenta es el del caso; los demás (demo, repositorio) no.
    const href = (inner.match(/\shref="(case-[^"#]+\.html)"/) || [])[1] || '';
    const name = (inner.match(/<b>([\s\S]*?)<\/b>/) || [])[1] || '';
    const title = (inner.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/) || [])[1] || '';
    const year = ((inner.match(/<time>([\s\S]*?)<\/time>/) || [])[1] || '').match(/\d{4}/)?.[0] || '';
    const repeat = !!href && seen.has(href);
    if (href) seen.add(href);
    // `repeat`: otro nodo de la misma regla ya enlazaba a este caso.
    return { ...n, i, inner, href, year, repeat, slug: n.slug || slugify(name) || String(i), titleSlug: slugify(title).split('-')[0] };
  });
}

const resolve = (v, n) => (typeof v === 'function' ? v(n) : v);

// Una apertura de etiqueta, troceada en atributos sin mirar dentro de los
// valores (un aria-label con espacios no es una lista de atributos).
function parseOpen(open) {
  const m = open.match(/^<([a-z0-9]+)([\s\S]*?)(\/?)>$/i);
  const attrs = [];
  const re = /\s+([a-zA-Z][\w:.-]*)(?:\s*=\s*"([^"]*)")?/g;
  for (let a; (a = re.exec(m[2])); ) attrs.push({ name: a[1], text: a[0].replace(/^\s+/, ' ') });
  return { tag: m[1], attrs, slash: m[3] };
}
const serialize = ({ tag, attrs, slash }) => `<${tag}${attrs.map(a => a.text).join('')}${slash}>`;
const stripLaiya = open => {
  const p = parseOpen(open);
  p.attrs = p.attrs.filter(a => !/^data-laiya(?:-|$)/.test(a.name));
  return serialize(p);
};

function withAttrs(open, attrs) {
  const p = parseOpen(stripLaiya(open));
  for (const name of ATTR_ORDER) {
    const value = attrs[name];
    if (value == null || value === '') continue;
    const piece = { name, text: ` ${name}="${String(value).replace(/"/g, '&quot;')}"` };
    // En su sitio alfabético, como el resto de atributos de la página.
    const at = p.attrs.findIndex(a => a.name.toLowerCase() > name);
    if (at < 0) p.attrs.push(piece);
    else p.attrs.splice(at, 0, piece);
  }
  return serialize(p);
}

function anchor(file, html) {
  // Limpia todo lo anterior: una regla quitada no debe dejar restos.
  let out = html.replace(/<[a-z0-9]+\b[^>]*>/gi, t => (t.includes('data-laiya') ? stripLaiya(t) : t));
  const missing = [];
  const ids = new Set();
  for (const rule of rulesFor(file)) {
    const nodes = find(out, rule.find);
    if (!nodes.length) {
      missing.push(typeof rule.id === 'string' ? rule.id : JSON.stringify(rule.find));
      continue;
    }
    // Los ids se deciden en el orden del documento; los cambios se aplican
    // de atrás adelante, para que cada cambio de longitud no mueva los demás.
    const planned = [];
    for (const n of nodes) {
      let id = resolve(rule.id, n);
      // Dos nodos del mismo caso (los dos reportajes de ATLAS): el segundo
      // se distingue por su titular. Si ni así, es un error de las reglas.
      if (ids.has(id) && n.titleSlug) id = `${id}.${n.titleSlug}`;
      if (ids.has(id)) throw new Error(`${file}: ancla duplicada «${id}»`);
      ids.add(id);
      const attrs = {
        'data-laiya': id,
        'data-laiya-kind': resolve(rule.kind, n),
        'data-laiya-topic': resolve(rule.topic, n),
        'data-laiya-tour': resolve(rule.tour, n),
        'data-laiya-shape': resolve(rule.shape, n),
        'data-laiya-fx': resolve(rule.fx, n),
      };
      planned.push({ n, attrs });
    }
    for (const { n, attrs } of planned.reverse()) {
      const open = out.slice(n.at).match(/^<[^>]*>/)[0];
      out = out.slice(0, n.at) + withAttrs(open, attrs) + out.slice(n.at + open.length);
    }
  }
  return { out, missing, count: ids.size };
}

let failed = false;
for (const { file } of PAGES) {
  const path = join(ROOT, file);
  const html = readFileSync(path, 'utf8');
  const { out, missing, count } = anchor(file, html);
  if (missing.length) {
    console.error(`ERROR  ${file}: reglas sin nodo — ${missing.join(', ')}`);
    failed = true;
  }
  if (check) {
    if (out !== html) {
      console.error(`ERROR  ${file}: las anclas de LAIYA están desfasadas. Ejecuta npm run build:laiya.`);
      failed = true;
    }
    continue;
  }
  if (out !== html) writeFileSync(path, out);
  console.log(`anclas  ${file}  ${count}`);
}
if (failed) process.exit(1);
