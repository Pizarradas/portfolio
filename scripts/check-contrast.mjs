// Contraste de la capa semántica, resuelto desde el build.
//
//   node scripts/check-contrast.mjs
//
// Lo que este proyecto ya ha pagado por no tener esto: un eyebrow a 2,78:1
// sobre navy y a 1:1 —invisible— sobre su propio azul, vivo en tres sitios
// durante meses. Y antes, una regla de color comentada sin querer que dejó una
// sección entera a 2,8:1. Ninguna de las dos cosas da error en ningún sitio.
//
// Por qué lee `css/portfolio.css` y no el SCSS: lo que le llega al navegador es
// el build. Un token puede estar perfectamente escrito en su parcial y llegar
// pisado, o no llegar. Aquí se mide lo que se sirve.
//
// Lo que SÍ cubre: cada pareja tinta/fondo del vocabulario semántico, en cada
// contexto, con las alfas compuestas de verdad sobre su fondo — que es donde
// el panel de DevTools deja de servir, porque enseña el color declarado y no
// el compuesto.
//
// Lo que NO cubre: un componente que se pinte con un literal en vez de con un
// token. Eso es lo que vigila el presupuesto de literales de `check-css.mjs`;
// las dos revisiones se necesitan.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'css', 'portfolio.css'), 'utf8');

/* ------------------------------------------------------------------ parseo */

// El build está minificado y en una sola línea, así que hay que caminar las
// llaves: las at-rules abren bloque y no son reglas, las demás sí.
function customProps(src) {
  const bySelector = new Map();
  let i = 0;
  let head = '';
  while (i < src.length) {
    const c = src[i];
    if (c === ';') { head = ''; i++; continue; }
    if (c === '}') { head = ''; i++; continue; }
    if (c !== '{') { head += c; i++; continue; }

    const selector = head.trim();
    head = '';
    // Una at-rule (@layer, @media, @supports) envuelve reglas: se entra dentro.
    if (selector.startsWith('@')) { i++; continue; }

    let depth = 1;
    let j = i + 1;
    while (j < src.length && depth) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') depth--;
      j++;
    }
    const body = src.slice(i + 1, j - 1);
    for (const sel of selector.split(',')) {
      const key = sel.replace(/["']/g, '').replace(/\s+/g, '');
      if (!bySelector.has(key)) bySelector.set(key, new Map());
      const into = bySelector.get(key);
      for (const [name, value] of declarations(body)) into.set(name, value);
    }
    i = j;
  }
  return bySelector;
}

// Separa por `;` respetando paréntesis: color-mix() y rgb() llevan comas dentro.
function declarations(body) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && !depth) { push(buf); buf = ''; continue; }
    buf += ch;
  }
  push(buf);
  function push(text) {
    const at = text.indexOf(':');
    if (at === -1) return;
    const name = text.slice(0, at).trim();
    if (!name.startsWith('--')) return;
    out.push([name, text.slice(at + 1).trim()]);
  }
  return out;
}

const SCOPES = customProps(css);

/* ------------------------------------------------------------------ colores */

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function parseColor(text, lookup, seen = new Set()) {
  const v = text.trim();

  const varMatch = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]*))?\)$/.exec(v);
  if (varMatch) {
    const [, name, fallback] = varMatch;
    if (seen.has(name)) return null;            // ciclo
    const next = lookup(name);
    if (next !== undefined) return parseColor(next, lookup, new Set([...seen, name]));
    return fallback === undefined ? null : parseColor(fallback, lookup, seen);
  }

  // color-mix(in srgb, <color> N%, transparent) — el único patrón que usa el
  // sistema. Equivale al color con su alfa multiplicada por N.
  const mix = /^color-mix\(\s*in\s+srgb\s*,([\s\S]+?)\s+([\d.]+)%\s*,\s*transparent\s*\)$/.exec(v);
  if (mix) {
    const base = parseColor(mix[1], lookup, seen);
    if (!base) return null;
    return { ...base, a: base.a * (parseFloat(mix[2]) / 100) };
  }

  const hex = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('');
    const n = i => parseInt(h.slice(i, i + 2), 16) / 255;
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
  }

  // rgb(255 255 255 / 0.6) y rgba(255,255,255,.6)
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(v);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255, a: parts[3] ?? 1 };
  }

  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (v === 'white') return { r: 1, g: 1, b: 1, a: 1 };
  if (v === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  return null;
}

// Alfa sobre fondo. Es la mitad del asunto en oscuro: casi todas las tintas
// secundarias del mapa son blanco translúcido, y su contraste real depende de
// sobre qué caen.
const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
});

const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const luminance = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);

function contrast(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const hexOf = c =>
  '#' + [c.r, c.g, c.b].map(n => Math.round(clamp(n, 0, 1) * 255).toString(16).padStart(2, '0')).join('');

/* ---------------------------------------------------------------- contextos */

// Cada contexto es una pila de selectores: el de abajo pone la base y los de
// encima la pisan, igual que hace la cascada sobre el elemento.
const CONTEXTS = [
  ['página · claro', [':root']],
  ['página · oscuro', [':root', ':root[data-theme=dark]']],
  ['sección night · sobre página clara', [':root', '.syx-on-night']],
  ['sección brand · sobre página clara', [':root', '.syx-on-brand']],
  ['sección night · sobre página oscura', [':root', ':root[data-theme=dark]', '.syx-on-night']],
  ['sección brand · sobre página oscura', [':root', ':root[data-theme=dark]', '.syx-on-brand']],
];

// AA: 4.5:1 texto normal, 3:1 texto grande y componentes de interfaz.
//
// Las líneas van como informativas y no como fallo: 1.4.11 pide 3:1 a lo que
// haga falta para identificar un control, y un filete decorativo no lo es.
// Salen igualmente porque un borde que desaparece es una decisión, no un
// descuido, y conviene verla.
const PAIRS = [
  ['texto principal', '--semantic-color-text', '--semantic-color-surface', 4.5, 'AA'],
  ['texto secundario', '--semantic-color-text-secondary', '--semantic-color-surface', 4.5, 'AA'],
  ['texto tenue', '--semantic-color-text-muted', '--semantic-color-surface', 4.5, 'AA'],
  ['acento / enlace', '--semantic-color-primary', '--semantic-color-surface', 4.5, 'AA'],
  ['eyebrow', '--component-eyebrow-color', '--semantic-color-surface', 4.5, 'AA'],
  ['texto sobre superficie alt', '--semantic-color-text', '--semantic-color-surface-alt', 4.5, 'AA'],
  ['texto tenue sobre alt', '--semantic-color-text-muted', '--semantic-color-surface-alt', 4.5, 'AA'],
  ['tinta sobre el acento', '--semantic-color-on-primary', '--semantic-color-primary', 4.5, 'AA'],
  ['anillo de foco', '--semantic-color-focus', '--semantic-color-surface', 3, 'AA'],
  ['borde', '--semantic-color-border', '--semantic-color-surface', 3, 'info'],
  ['borde fuerte', '--semantic-color-border-strong', '--semantic-color-surface', 3, 'info'],
];

// Deuda de contraste aceptada. Cuanto más corta, mejor — y ahora está vacía.
//
// Eran cuatro entradas, y las cuatro por lo mismo: `on-dark-section` reparte
// tres niveles de texto y el tercero no llegaba a AA sobre el azul de marca,
// que es un fondo mucho más claro que el navy.
//
// Se cerraron en dos pasos, los dos subiendo la tinta y no oscureciendo el
// fondo, porque `surface-alt` lo leen paneles, visuales de código e
// ilustraciones en todo el sitio y el texto no lo lee nadie más:
//
//   22/08/2026  texto sobre el fondo liso — `alpha-light-60` daba 3,31:1.
//               `.syx-on-brand` repunta el tenue a `78` y sube a 4,65:1. Sobre
//               azul solo caben dos niveles de texto, y un nivel que no se
//               puede usar no es un nivel.
//   31/08/2026  texto tenue sobre `surface-alt` — `78` daba 4,44:1, que falla
//               por 1,3 %. Sube a `86` y da 5,08:1. Ver la nota larga en
//               `abstracts/_contexts.scss`.
//
// El día que vuelva a hacer falta añadir una entrada aquí, que lleve la fecha,
// el número y por qué no se arregla hoy. Igual que el presupuesto de literales:
// esto no falla por lo que ya hay, falla por lo que se añada.
const BASELINE = new Set([]);

// Una sección invertida tiene que despegarse del fondo sobre el que se apoya.
// No lo pide ninguna norma —son dos bloques grandes contiguos, no texto— pero
// es exactamente lo que se pierde al poner una sección oscura sobre una página
// oscura, y es la razón de ser del paso que invierte las secciones. Medirlo
// convierte «se funden» en un número.
const SEPARATION = [
  ['night sobre página clara', [':root'], [':root', '.syx-on-night']],
  ['brand sobre página clara', [':root'], [':root', '.syx-on-brand']],
  ['night sobre página oscura', [':root', ':root[data-theme=dark]'], [':root', ':root[data-theme=dark]', '.syx-on-night']],
  ['brand sobre página oscura', [':root', ':root[data-theme=dark]'], [':root', ':root[data-theme=dark]', '.syx-on-brand']],
];

/* ----------------------------------------------------------------- ejecución */

let failed = false;
const stale = new Set(BASELINE);

for (const [label, stack] of CONTEXTS) {
  const scope = new Map();
  for (const sel of stack) {
    const found = SCOPES.get(sel);
    if (!found) {
      console.error(`ERROR  contexto «${label}»: el selector ${sel} no existe en el build.`);
      failed = true;
      continue;
    }
    for (const [k, v] of found) scope.set(k, v);
  }
  const lookup = name => scope.get(name);

  // El suelo opaco del contexto, sobre el que se componen todas las alfas.
  const ground = parseColor('var(--semantic-color-surface)', lookup);
  if (!ground) {
    console.error(`ERROR  contexto «${label}»: no se resuelve --semantic-color-surface.`);
    failed = true;
    continue;
  }

  console.log(`\n${label}`);
  console.log('─'.repeat(76));

  for (const [name, fgToken, bgToken, min, level] of PAIRS) {
    const rawFg = parseColor(`var(${fgToken})`, lookup);
    const rawBg = parseColor(`var(${bgToken})`, lookup);
    if (!rawFg || !rawBg) {
      console.error(`  ERROR  ${name}: no se resuelve ${!rawFg ? fgToken : bgToken}`);
      failed = true;
      continue;
    }
    const bg = rawBg.a < 1 ? over(rawBg, ground) : rawBg;
    const fg = rawFg.a < 1 ? over(rawFg, bg) : rawFg;
    const ratio = contrast(fg, bg);

    const key = `${label} :: ${name}`;
    const bad = ratio < min;
    const known = BASELINE.has(key);
    // La entrada de BASELINE se «gasta» solo si de verdad sigue fallando. Lo
    // que quede sin gastar al final es una entrada que ya sobra.
    if (bad && known) stale.delete(key);

    const mark = !bad ? 'ok  ' : level === 'info' ? 'nota' : known ? 'base' : 'FALLA';
    console.log(
      `  ${mark.padEnd(5)} ${name.padEnd(28)} ${hexOf(fg)} / ${hexOf(bg)}  ${ratio.toFixed(2).padStart(6)}:1  (mín ${min})`
    );
    if (bad && level === 'AA' && !known) failed = true;
  }
}

console.log('\nseparación de una sección respecto al fondo que la sostiene');
console.log('─'.repeat(76));
for (const [label, pageStack, sectionStack] of SEPARATION) {
  const surfaceOf = stack => {
    const scope = new Map();
    for (const sel of stack) for (const [k, v] of SCOPES.get(sel) ?? []) scope.set(k, v);
    const c = parseColor('var(--semantic-color-surface)', scope.get.bind(scope));
    return c && c.a < 1 ? over(c, { r: 1, g: 1, b: 1, a: 1 }) : c;
  };
  const page = surfaceOf(pageStack);
  const section = surfaceOf(sectionStack);
  if (!page || !section) {
    console.error(`  ERROR  ${label}: no se resuelve la superficie.`);
    failed = true;
    continue;
  }
  const ratio = contrast(section, page);
  const verdict = ratio < 1.1 ? 'SE FUNDE' : 'nota';
  console.log(
    `  ${verdict.padEnd(9)} ${label.padEnd(28)} ${hexOf(section)} / ${hexOf(page)}  ${ratio.toFixed(2).padStart(6)}:1`
  );
}

if (stale.size) {
  console.log('\nAviso — entradas de BASELINE que ya pasan. Bórralas de check-contrast.mjs:');
  for (const k of stale) console.log(`  ${k}`);
}

if (failed) {
  console.error('\ncheck-contrast: hay parejas por debajo del mínimo AA.');
  process.exit(1);
}
console.log('\ncheck-contrast: todas las parejas AA por encima del mínimo.');
