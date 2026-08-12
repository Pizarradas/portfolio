/* Build the "static image → structured data" figure on the home page.
 *
 * Same approach as build-timeline.mjs: d3 runs here, at build time, and the
 * page receives plain SVG. No mapping library ships to the browser.
 *
 * Everything drawn comes from two real sources:
 *   - the country geometry is IGN data (CC BY 4.0) shipped in es-atlas
 *   - the 83 points are the actual location table from the project demo in
 *     assets/demos/interactive-media-map.html, parsed rather than retyped, so
 *     the figure cannot drift away from the map it describes.
 *
 * Run: npm run build:map
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { geoPath, geoContains } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------- projection */

// d3-composite-projections ships an ESM index with extensionless imports that
// Node cannot resolve, and a UMD bundle its own package.json marks as ESM.
// Running the UMD in a vm with a real require is the least fragile of the two.
function loadCompositeProjections() {
  const src = readFileSync(
    join(root, 'node_modules/d3-composite-projections/d3-composite-projections.js'),
    'utf8'
  );
  const module = { exports: {} };
  vm.runInNewContext(src, { module, exports: module.exports, require });
  return module.exports;
}

const { geoConicConformalSpain } = loadCompositeProjections();

/* -------------------------------------------------------------- geometry */

// The IGN geometry is survey-grade: drawn straight, the two paths weigh 44 kB,
// more than the rest of the home page put together. At 620 px wide a coastline
// metre is worth nothing, so the topology is simplified before projecting.
// Retaining a quarter of the vertices costs no visible shape and takes the
// pair down to about 13 kB. Simplification runs on the topology rather than on
// the finished paths so shared borders stay shared and no gaps open up between
// neighbouring regions.
const RETAIN = 0.25;
const source = require('es-atlas/es/provinces.json');
const presimplified = presimplify(source);
const topo = simplify(presimplified, quantile(presimplified, RETAIN));

const country = feature(topo, topo.objects.border);
const regions = mesh(topo, topo.objects.autonomous_regions, (a, b) => a !== b);

const W = 620;
const H = 400;
const PAD = 12;

// The composite projection lifts the Canary Islands next to the mainland and
// draws a border around them — the same convention the live map uses, and the
// reason a plain conic projection would not do here.
const projection = geoConicConformalSpain().fitExtent(
  [
    [PAD, PAD],
    [W - PAD, H - PAD],
  ],
  country
);

const path = geoPath(projection);
// One decimal is a tenth of a pixel at this size — below anything a screen or
// an eye can resolve, and it roughly halves the path data.
const round = d => d.replace(/(\d+\.\d)\d+/g, '$1').replace(/\.0(?![\d])/g, '');

const landPath = round(path(country));
const regionsPath = round(path(regions));
const framePath = round(projection.getCompositionBorders());

/* ----------------------------------------------------------------- points */

// The demo is a real page, not a data file, so the location table is read out
// of it rather than duplicated. If the map gains a location, this figure gains
// it too on the next build.
function readLocations() {
  const src = readFileSync(join(root, 'assets/demos/interactive-media-map.html'), 'utf8');
  const start = src.indexOf('{', src.indexOf('var locations ='));
  let depth = 0;
  let end = start;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const table = vm.runInNewContext(`(${src.slice(start, end + 1)})`);

  const out = [];
  for (const [region, brands] of Object.entries(table)) {
    for (const [brand, places] of Object.entries(brands)) {
      for (const place of places) out.push({ ...place, region, brand });
    }
  }
  return out;
}

// A point the projection cannot place is a point outside Spain. The live table
// has one: "Crónica de Toledo" sits at 41.65, -83.54 — Toledo, Ohio. It is not
// silently repaired here, because the figure would then disagree with the map
// it claims to describe; it is dropped from the drawing and reported, and the
// counts below come from what actually gets drawn. Fix the coordinates in the
// demo and the next build picks the location up on its own.
const all = readLocations();
const offMap = all.filter(l => !projection([l.lng, l.lat]));
const locations = all.filter(l => projection([l.lng, l.lat]));

const regionCount = new Set(locations.map(l => l.region)).size;
const brandCount = new Set(locations.map(l => l.brand)).size;

// Where each point starts before the scroll animation moves it: a plain block,
// one slot per row of the sheet. The geographic position is what ships in the
// markup, so with no JS the map is already correct and nothing ever animates
// away from the truth.
const COLS = 12;
const CELL = 26;
const rows = Math.ceil(locations.length / COLS);
const gridX = (W - (COLS - 1) * CELL) / 2;
const gridY = (H - (rows - 1) * CELL) / 2;

const points = locations.map((loc, i) => {
  const [x, y] = projection([loc.lng, loc.lat]);
  return {
    x: +x.toFixed(1),
    y: +y.toFixed(1),
    gx: +(gridX + (i % COLS) * CELL).toFixed(1),
    gy: +(gridY + Math.floor(i / COLS) * CELL).toFixed(1),
    title: loc.title,
  };
});

/* ----------------------------------------------------------------- raster */

// The "before" panel is the same country at image resolution: the projection
// is inverted at each cell centre and the cell is kept if it lands on Spain.
// It is a genuine rasterisation of the geometry next to it, which is the whole
// point of the comparison — one shape, two resolutions.
const STEP = 12;
const DOT = 10;

const cellKey = (cx, cy) => `${cx},${cy}`;
const baked = new Set(
  points.map(p => cellKey(Math.floor(p.x / STEP), Math.floor(p.y / STEP)))
);

const plain = [];
const marks = [];

for (let cy = 0; cy * STEP < H; cy++) {
  for (let cx = 0; cx * STEP < W; cx++) {
    const centre = projection.invert([cx * STEP + STEP / 2, cy * STEP + STEP / 2]);
    if (!centre || !geoContains(country, centre)) continue;
    const square = `M${cx * STEP} ${cy * STEP}h${DOT}v${DOT}h-${DOT}z`;
    (baked.has(cellKey(cx, cy)) ? marks : plain).push(square);
  }
}

/* ------------------------------------------------------------------ emit */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const stage = (label, body) =>
  `<div class="mol-map-shift__stage"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${body}</svg></div>`;

const html = `<div class="mol-map-shift">
<figure class="mol-map-shift__panel mol-map-shift__panel--raster">
<figcaption><span class="mol-map-shift__tag">Before</span><strong>A picture of the data</strong><small>mapa-medios-v7-FINAL.jpg · 1440×900</small></figcaption>
${stage(
  `The same country flattened into an image: Spain reduced to a grid of pixels with the ${points.length} locations baked into the artwork.`,
  `<path class="mol-map-shift__raster" d="${plain.join('')}"/><path class="mol-map-shift__raster mol-map-shift__raster--baked" d="${marks.join('')}"/>`
)}
<p class="mol-map-shift__note">Moving one location means reopening the artwork and re-exporting. <b>${points.length}</b> locations, not one of them addressable.</p>
</figure>
<p class="mol-map-shift__pivot"><span>Same locations</span><i aria-hidden="true">→</i><span>different maintenance model</span></p>
<figure class="mol-map-shift__panel mol-map-shift__panel--live">
<figcaption><span class="mol-map-shift__tag">After</span><strong>The data itself</strong><small>locations.csv · ${points.length} rows · IGN tiles</small></figcaption>
${stage(
  `The same country as geometry: province borders from the national mapping agency with the ${points.length} locations plotted from their coordinates.`,
  `<path class="mol-map-shift__land" d="${landPath}"/><path class="mol-map-shift__regions" d="${regionsPath}"/><path class="mol-map-shift__frame" d="${framePath}"/>` +
    `<g class="mol-map-shift__points">${points
      .map(
        p =>
          `<circle r="3.4" cx="${p.x}" cy="${p.y}" data-gx="${p.gx}" data-gy="${p.gy}"><title>${esc(p.title)}</title></circle>`
      )
      .join('')}</g>`
)}
<p class="mol-map-shift__note">Each location is a row. <b>${brandCount}</b> mastheads · <b>${regionCount}</b> regions · updated without touching the build.</p>
</figure>
</div>
<p class="mol-map-shift__credit">Country and province geometry: Instituto Geográfico Nacional, CC BY 4.0, via es-atlas. Coordinates: the project's own location table, read from the live demo at build time.</p>`;

/* ---------------------------------------------------------------- inject */

const target = join(root, 'index.html');
const page = readFileSync(target, 'utf8');
const open = '<!-- map-process:start -->';
const close = '<!-- map-process:end -->';
const from = page.indexOf(open);
const to = page.indexOf(close);

if (from === -1 || to === -1) {
  console.error(`build-map-process: markers ${open} … ${close} not found in index.html`);
  process.exit(1);
}

writeFileSync(
  target,
  page.slice(0, from + open.length) + '\n' + html + '\n' + page.slice(to),
  'utf8'
);

console.log(
  `build-map-process: ${points.length} locations · ${brandCount} mastheads · ${regionCount} regions · ` +
    `${plain.length + marks.length} raster cells (${marks.length} carrying a location)`
);

for (const l of offMap) {
  console.warn(
    `build-map-process: skipped "${l.title}" (${l.region}) — ${l.lat}, ${l.lng} is outside Spain`
  );
}
