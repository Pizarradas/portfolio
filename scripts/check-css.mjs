// Revisión de higiene de las hojas escritas a mano de css/.
//
//   node scripts/check-css.mjs
//
// Falla (exit 1) con un comentario sin cerrar. Ese fue el peor fallo que ha
// tenido este CSS y no lo avisa nada: un `/*` sin su `*/` convierte en
// comentario todo lo que va detrás, hasta el final del fichero. Pasó dos veces.
// En brand-jlp.css se llevó por delante la regla que daba color al texto sobre
// la sección --accent, que se quedó en 2.8:1 de contraste sin que nadie lo
// viera. En recruiter-visuals.css se llevó el bloque entero que arreglaba un
// desbordamiento de rejilla.
//
// Falla también con las dos cosas que rompen un cambio de tema en silencio, y
// que ninguna de las reglas del contrato mira porque ninguna incumple R01:
//
//   · un color escrito a pelo dentro de un componente — el token se repunta,
//     el literal se queda; hay presupuesto por fichero y solo puede bajar
//   · un `--component-*` que lee un `--semantic-color-*` y no está repetido en
//     `repoint-component-colors` — dentro de un contexto se queda resuelto
//     contra el tema de la página
//
// El resto son avisos: clases declaradas que ya no existen en el marcado, y
// presupuestos de literales que han quedado por encima de la realidad.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sheets = readdirSync(join(ROOT, 'css')).filter(f => f.endsWith('.css'));

let failed = false;

/* ------------------------------------------------- comentarios sin cerrar */

for (const file of sheets) {
  const src = readFileSync(join(ROOT, 'css', file), 'utf8');
  let i = 0, line = 1, openLine = 0, open = false;
  while (i < src.length) {
    if (src[i] === '\n') line++;
    if (!open && src.startsWith('/*', i)) { open = true; openLine = line; i += 2; continue; }
    if (open && src.startsWith('*/', i)) { open = false; i += 2; continue; }
    i++;
  }
  if (open) {
    console.error(`ERROR  css/${file}:${openLine} — comentario abierto que nunca se cierra.`);
    console.error('       Todo lo que viene detrás es comentario para el navegador.');
    failed = true;
  }
}

/* ------------------------------------------------- tokens sin definición */

// Un `var(--x)` cuyo --x no se declara en ningún sitio no da error: la
// declaración entera se vuelve inválida en tiempo de cómputo y la propiedad
// cae a su valor inicial, en silencio. Pasó al migrar las hojas a SCSS —
// catorce custom properties con dígitos en el nombre se perdieron por el
// camino y nada lo avisó.
{
  const build = readFileSync(join(ROOT, 'css', 'portfolio.css'), 'utf8');
  const declared = new Set([...build.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  const used = new Set([...build.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]));
  // Un var() con segundo argumento lleva su propio respaldo.
  const withFallback = new Set([...build.matchAll(/var\(\s*(--[\w-]+)\s*,/g)].map(m => m[1]));

  // Y hay tokens que fija el marcado o el JS sobre el elemento, no la hoja:
  // style="--value:86%" o element.style.setProperty('--delay', …).
  const inline = new Set();
  const harvestVars = src => {
    for (const m of src.matchAll(/style="[^"]*?(--[\w-]+)\s*:/g)) inline.add(m[1]);
    for (const m of src.matchAll(/setProperty\(\s*['"`](--[\w-]+)/g)) inline.add(m[1]);
    for (const m of src.matchAll(/(--[\w-]+)\s*:\s*\$\{/g)) inline.add(m[1]);
  };
  for (const f of readdirSync(ROOT).filter(f => f.endsWith('.html')))
    harvestVars(readFileSync(join(ROOT, f), 'utf8'));
  for (const f of readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js')))
    harvestVars(readFileSync(join(ROOT, 'js', f), 'utf8'));
  for (const f of readdirSync(join(ROOT, 'scripts')))
    harvestVars(readFileSync(join(ROOT, 'scripts', f), 'utf8'));

  const undef = [...used].filter(t => !declared.has(t) && !withFallback.has(t) && !inline.has(t)).sort();
  if (undef.length) {
    console.error(`ERROR  ${undef.length} token(s) usados y nunca declarados:`);
    for (const t of undef) console.error(`       ${t}`);
    failed = true;
  }
}

/* ------------------------------------------------ SCSS: fuentes, no build */

// Las dos revisiones que siguen leen `scss/` y no `css/`. Tienen que hacerlo:
// una necesita distinguir una capa de componente de la capa de primitivas, y
// la otra necesita ver un mixin. Las dos cosas desaparecen al compilar.

const SCSS = join(ROOT, 'scss');

// Devuelve el fuente con los comentarios sustituidos por espacios, conservando
// los saltos de línea para que los números de línea no se muevan.
function stripScss(src) {
  let out = '';
  let i = 0;
  let state = 'code';
  while (i < src.length) {
    const c = src[i];
    if (state === 'code') {
      if (src.startsWith('//', i)) { state = 'line'; out += '  '; i += 2; continue; }
      if (src.startsWith('/*', i)) { state = 'block'; out += '  '; i += 2; continue; }
      out += c; i++; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += '\n'; i++; continue; }
      out += ' '; i++; continue;
    }
    if (src.startsWith('*/', i)) { state = 'code'; out += '  '; i += 2; continue; }
    out += c === '\n' ? '\n' : ' '; i++;
  }
  return out;
}

/* --------------------------------------- literales de color en componentes */

// Un color escrito a pelo dentro de un componente no incumple R01 —esa regla
// solo mira `--primitive-`— así que hasta ahora pasaba en verde. Es, sin
// embargo, lo único que un cambio de tema no puede mover: el token se repunta
// y el literal se queda exactamente donde estaba. Sesenta y tres de estos son
// la razón por la que el modo oscuro no se puede dar por hecho con solo
// repuntar la capa semántica.
//
// No falla por los que ya hay: falla por los que se añadan. El presupuesto es
// el recuento del día que se escribió esta regla y solo puede bajar; cuando un
// fichero llegue a cero, se borra de la lista.
//
// Para un literal correcto a propósito —el blanco del cromo de una maqueta de
// navegador es un píxel de producto ajeno, no una superficie del sistema— se
// marca la línea y deja de contar:
//
//     background: #fff; // syx-allow-literal: cromo de la maqueta
const LITERAL_BUDGET = {
  'atoms/_data-table.scss': 1,
  'molecules/_case-diagrams.scss': 1,
  'molecules/_code-visuals.scss': 27,
  'molecules/_header-system.scss': 10,
  'molecules/_live-preview.scss': 7,
  'molecules/_portfolio.scss': 4,
  'molecules/_research.scss': 7,
  'organisms/_case-42ds.scss': 2,
  'organisms/_case-shell.scss': 1,
  'organisms/_home-sections.scss': 1,
};

{
  // `#{` de interpolación no entra: detrás de la almohadilla exige dígitos
  // hexadecimales, y `{` no lo es.
  const LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g;
  const found = {};

  for (const tier of ['atoms', 'molecules', 'organisms']) {
    for (const f of readdirSync(join(SCSS, tier)).filter(f => f.endsWith('.scss'))) {
      const rel = `${tier}/${f}`;
      const raw = readFileSync(join(SCSS, tier, f), 'utf8');
      const code = stripScss(raw).split('\n');
      const lines = raw.split('\n');
      const hits = [];
      code.forEach((text, i) => {
        if (lines[i].includes('syx-allow-literal')) return;
        LITERAL.lastIndex = 0;
        for (const m of text.matchAll(LITERAL)) hits.push({ line: i + 1, text: m[0] });
      });
      if (hits.length) found[rel] = hits;
    }
  }

  for (const [rel, hits] of Object.entries(found)) {
    const budget = LITERAL_BUDGET[rel] ?? 0;
    if (hits.length <= budget) continue;
    console.error(`ERROR  scss/${rel} — ${hits.length} literales de color, presupuesto ${budget}.`);
    for (const h of hits.slice(budget))
      console.error(`       línea ${h.line}: ${h.text}   → token semántico, o marca la línea con syx-allow-literal`);
    failed = true;
  }

  // Un presupuesto que sobra es un presupuesto que hay que bajar: si no, el
  // día que alguien reintroduzca el literal, la red ya no está.
  for (const [rel, budget] of Object.entries(LITERAL_BUDGET)) {
    const n = found[rel]?.length ?? 0;
    if (n < budget)
      console.log(`\nAviso — scss/${rel}: quedan ${n} literales y el presupuesto dice ${budget}. Bájalo a ${n}.`);
  }
}

/* ------------------- tokens de componente que dependen del color semántico */

// Un `--component-x: var(--semantic-color-y)` se resuelve contra el valor de
// `--semantic-color-y` EN EL ELEMENTO donde está escrito. Los descendientes
// heredan el resultado ya calculado, no la referencia. Por eso una sección que
// repunta la base no arrastra estos tokens, y por eso `_ink.scss` los repite
// en `repoint-component-colors`.
//
// Esa copia es exactamente el tipo de lista que se desincroniza sola: alguien
// añade el token veintiocho a `tokens/components/`, no toca el mixin, y ese
// token se queda resuelto contra el tema de la página dentro de cada contexto.
// Fue lo que le pasó a `--component-eyebrow-color`, que acabó a 2,78:1 sobre
// navy y a 1:1 —invisible— sobre el propio azul. Aquí se comprueba.
{
  const INK = join(SCSS, 'abstracts/_ink.scss');
  // El orden es el de los `@use` de portfolio.scss: en un empate manda el último.
  const TOKEN_FILES = [
    'abstracts/tokens/components/_portfolio.scss',
    'abstracts/tokens/components/_case-and-evidence.scss',
  ];
  // `[\w-]` y no `[a-z-]`: los nombres con dígitos (--component-case42-rule)
  // son justo los que se pierde una regex ingenua. Ya costó catorce tokens.
  const DECL = /(--[\w-]+)\s*:\s*([^;]+);/g;
  const norm = v => v.replace(/\s+/g, '');

  const declarations = src => {
    const out = new Map();
    for (const m of stripScss(src).matchAll(DECL)) out.set(m[1], m[2].trim());
    return out;
  };

  const mixinBody = (src, name) => {
    const at = src.indexOf(`@mixin ${name}`);
    if (at === -1) return null;
    let i = src.indexOf('{', at);
    const open = i;
    for (let depth = 0; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) break;
    }
    return src.slice(open + 1, i);
  };

  const body = mixinBody(readFileSync(INK, 'utf8'), 'repoint-component-colors');
  if (body === null) {
    console.error('ERROR  scss/abstracts/_ink.scss — falta el mixin repoint-component-colors.');
    failed = true;
  } else {
    const repointed = declarations(body);

    // Valor efectivo de cada token de componente: gana la última declaración.
    const effective = new Map();
    for (const rel of TOKEN_FILES)
      for (const [name, value] of declarations(readFileSync(join(SCSS, rel), 'utf8'))) {
        if (name.startsWith('--primitive-') || name.startsWith('--semantic-')) continue;
        effective.set(name, { value, rel });
      }

    const missing = [];
    const drifted = [];
    for (const [name, { value, rel }] of effective) {
      if (!value.includes('--semantic-color')) continue;
      if (!repointed.has(name)) missing.push([name, value, rel]);
      else if (norm(repointed.get(name)) !== norm(value)) drifted.push([name, value, repointed.get(name)]);
    }
    // Y al revés: un token repuntado que ya no existe repinta un fantasma.
    const orphan = [...repointed.keys()].filter(n => !effective.has(n));

    if (missing.length) {
      console.error(`ERROR  ${missing.length} token(s) de componente dependen del color y no se repuntan:`);
      for (const [name, value, rel] of missing)
        console.error(`       ${name}: ${value}   [scss/${rel}]`);
      console.error('       Añádelos a repoint-component-colors en scss/abstracts/_ink.scss.');
      failed = true;
    }
    if (drifted.length) {
      console.error(`ERROR  ${drifted.length} token(s) repuntados con un valor distinto del canónico:`);
      for (const [name, canon, copy] of drifted)
        console.error(`       ${name}\n         canónico: ${canon}\n         repunte:  ${copy}`);
      failed = true;
    }
    if (orphan.length) {
      console.error(`ERROR  ${orphan.length} token(s) repuntados que ya no se declaran en tokens/components/:`);
      for (const name of orphan) console.error(`       ${name}`);
      failed = true;
    }
    if (!missing.length && !drifted.length && !orphan.length)
      console.log(`check-css: ${repointed.size} tokens de componente dependientes del color, todos repuntados.`);
  }
}

/* ------------------------------------------------------- clases sin uso */

const live = new Set();
const harvest = src => {
  for (const m of src.matchAll(/class="([^"]*)"/g))
    m[1].split(/\s+/).filter(Boolean).forEach(c => live.add(c));
  for (const m of src.matchAll(/classList\.\w+\(\s*['"`]([\w -]+)/g))
    m[1].split(/\s+/).filter(Boolean).forEach(c => live.add(c));
  for (const m of src.matchAll(/class=\\?["'`]([\w -]+)/g))
    m[1].split(/\s+/).filter(Boolean).forEach(c => live.add(c));
};

for (const f of readdirSync(ROOT).filter(f => f.endsWith('.html')))
  harvest(readFileSync(join(ROOT, f), 'utf8'));
for (const f of readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js')))
  harvest(readFileSync(join(ROOT, 'js', f), 'utf8'));

const orphans = [];
for (const file of sheets) {
  const src = readFileSync(join(ROOT, 'css', file), 'utf8')
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, '')
    .replace(/@layer[^{;]*/g, '@layer ');
  const declared = new Set();
  for (const m of src.matchAll(/([^{}]+)\{/g)) {
    if (m[1].trim().startsWith('@')) continue;
    for (const c of m[1].matchAll(/\.([a-zA-Z][\w-]*)/g)) declared.add(c[1]);
  }
  const dead = [...declared].filter(c => !live.has(c)).sort();
  if (dead.length) orphans.push([file, dead]);
}

if (orphans.length) {
  console.log('\nAviso — clases declaradas que no aparecen en ningún class= del marcado:');
  for (const [file, dead] of orphans) console.log(`  css/${file}: ${dead.join(', ')}`);
}

if (failed) process.exit(1);
console.log(`\ncheck-css: ${sheets.length} hojas, comentarios equilibrados.`);
