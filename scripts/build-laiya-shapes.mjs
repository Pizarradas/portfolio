// Formas de datos para el enjambre de LAIYA.
//
//   node scripts/build-laiya-shapes.mjs           escribe assets/laiya/shapes.json
//   node scripts/build-laiya-shapes.mjs --check   exit 1 si está desfasado
//
// Casi todas las formas del enjambre se generan en el navegador (geometría o
// texto). Esta no se puede inventar: cuando LAIYA señala el mapa interactivo,
// el enjambre dibuja España con la geometría real del IGN —la misma de es-atlas
// que ya usa el caso del mapa—, no una silueta aproximada.
//
// Salida: N puntos (el mismo N del enjambre) en int16 normalizados a ±1,
// en base64. 60 % en el interior, 40 % sobre la costa y las fronteras.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { geoContains, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'assets', 'laiya', 'shapes.json');
const N = 2600;

// Generador determinista: el fichero no cambia entre ejecuciones.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const topo = require('es-atlas/es/provinces.json');
const border = feature(topo, topo.objects.border);
// Solo la Península y Baleares: Canarias a escala real deja el mapa en un
// rincón, y un recuadro aparte no se lee en partículas.
const polys = (border.features || [border])
  .flatMap(f => (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]))
  .filter(poly => poly[0].every(([, lat]) => lat > 34));
const peninsula = { type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: polys } };

const proj = geoMercator().fitExtent([[-1, -0.8], [1, 0.8]], peninsula);
const [[x0, y0], [x1, y1]] = [[-10, 35.5], [4.6, 44]];

const pts = [];
// Contorno: se reparte por la longitud de cada anillo.
const rings = peninsula.geometry.coordinates.flatMap(poly => poly.map(r => r.map(c => proj(c))));
const segs = [];
let total = 0;
for (const r of rings)
  for (let i = 1; i < r.length; i++) {
    const l = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
    segs.push([r[i - 1], r[i], total, l]);
    total += l;
  }
const OUTLINE = Math.round(N * 0.4);
for (let k = 0; k < OUTLINE; k++) {
  const d = (k / OUTLINE) * total;
  const s = segs.find(g => d >= g[2] && d <= g[2] + g[3]) || segs[segs.length - 1];
  const t = s[3] ? (d - s[2]) / s[3] : 0;
  pts.push([s[0][0] + (s[1][0] - s[0][0]) * t, s[0][1] + (s[1][1] - s[0][1]) * t]);
}
// Interior: muestreo por rechazo sobre la geometría real.
while (pts.length < N) {
  const lon = x0 + rand() * (x1 - x0);
  const lat = y0 + rand() * (y1 - y0);
  if (geoContains(peninsula, [lon, lat])) pts.push(proj([lon, lat]));
}

const buf = new Int16Array(N * 3);
pts.forEach(([x, y], i) => {
  buf[i * 3] = Math.round(x * 32000);
  buf[i * 3 + 1] = Math.round(-y * 32000); // pantalla → mundo: y hacia arriba
  buf[i * 3 + 2] = Math.round((rand() - 0.5) * 0.08 * 32000);
});
const json = JSON.stringify({ n: N, scale: 32000, spain: Buffer.from(buf.buffer).toString('base64') }) + '\n';

if (process.argv.includes('--check')) {
  let cur = '';
  try { cur = readFileSync(OUT, 'utf8'); } catch {}
  if (cur !== json) {
    console.error('ERROR  assets/laiya/shapes.json está desfasado. Ejecuta npm run build:laiya.');
    process.exit(1);
  }
} else {
  writeFileSync(OUT, json);
  console.log(`laiya  shapes  spain ${N} puntos · ${(json.length / 1024).toFixed(1)} KB`);
}
