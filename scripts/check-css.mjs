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
// El resto son avisos: clases declaradas que ya no existen en el marcado.

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
