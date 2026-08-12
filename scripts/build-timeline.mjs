// Generates the career timeline SVG and injects it into index.html.
//
// d3-scale and d3-shape are devDependencies: they run here, at build time, and
// the page ships a static SVG. No runtime library, no CDN, no layout thrash.
//
//   npm run build:timeline
//
// The point of the chart is that the columns are no longer equal. They were,
// and that quietly misrepresented the career: France Telecom is nine years and
// nine months, Aliseda is fifteen months, and both used to occupy a fifth of
// the row. Here width is duration and height is scope of responsibility.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scaleTime, scaleLinear } from 'd3-scale';
import { line, area, curveMonotoneX } from 'd3-shape';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SCOPE = {
  1: 'Screens',
  2: 'Interfaces at scale',
  3: 'Design systems',
  4: 'Multi-brand systems',
  5: 'AI-governed workflows',
};

const ROLES = [
  {
    org: 'Buleboo Estudio', from: '2007-01', to: '2011-05', scope: 1,
    role: 'Digital Designer & Front-End', tag: 'Craft',
    note: 'HTML, CSS and jQuery for clients like Barceló Viajes and Vodafone.',
    said: 'I designed screens and built them myself.',
  },
  {
    org: 'France Telecom Spain', from: '2012-04', to: '2021-12', scope: 2,
    role: 'Senior UI/UX Designer & Front-End Developer', tag: 'Scale',
    note: 'High-traffic products, flows and conversion structures.',
    said: 'Nine years learning what scale actually breaks.',
  },
  {
    org: 'Aliseda', from: '2021-12', to: '2023-02', scope: 3,
    role: 'UI/UX Designer & Front-End (Design Systems)', tag: 'System',
    note: 'Created Brickee, their internal design system, from zero.',
    said: 'I built my first design system from nothing.',
  },
  {
    org: 'Plexus Tech', from: '2023-02', to: '2023-06', scope: 3,
    role: 'UI/UX Designer', tag: 'System',
    note: 'Responsive interfaces and reusable SCSS component architecture.',
    said: '',
  },
  {
    org: 'Prensa Ibérica', from: '2023-07', to: '2026-08', scope: 4,
    role: 'Product Designer & Front-End Engineer', tag: 'Multi-brand',
    note: '42DS: design tokens, WCAG 2.1 AA and CSS performance across the group.',
    said: 'The system became a product used by others.',
  },
];

// SYX + ATLAS is self-directed work running alongside the current role, so it
// is the end point of the scope curve rather than another employment bar.
const NOW = { at: '2026-08', scope: 5, label: 'SYX + ATLAS' };

const W = 1200;
const H = 360;
const PAD = { top: 34, right: 8, bottom: 74, left: 8 };
const BAR = { y: 258, h: 34 };

const month = s => {
  const [y, m] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
};

const x = scaleTime()
  .domain([month(ROLES[0].from), month(NOW.at)])
  .range([PAD.left, W - PAD.right]);

const y = scaleLinear()
  .domain([0.6, 5.4])
  .range([H - PAD.bottom - BAR.h - 26, PAD.top]);

const mid = r => new Date((month(r.from).getTime() + month(r.to).getTime()) / 2);

const points = [
  ...ROLES.filter(r => r.said).map(r => ({ t: mid(r), s: r.scope, org: r.org })),
  { t: month(NOW.at), s: NOW.scope, org: NOW.label },
];

const px = p => x(p.t);
const py = p => y(p.s);

const curve = line().x(px).y(py).curve(curveMonotoneX)(points);
const fill = area().x(px).y0(y.range()[0]).y1(py).curve(curveMonotoneX)(points);

const n = v => Number(v.toFixed(1));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// --- grid: one faint rule per scope level -----------------------------------
const grid = Object.entries(SCOPE).map(([lvl, label]) => {
  const yy = n(y(Number(lvl)));
  return `<line x1="${PAD.left}" y1="${yy}" x2="${W - PAD.right}" y2="${yy}"/>` +
    `<text class="lvl" x="${PAD.left}" y="${yy - 7}">${esc(label)}</text>`;
}).join('');

// --- bars: width is duration ------------------------------------------------
// Aliseda is fifteen months and Plexus is five, so their segments are far too
// narrow for an inline name. Every bar carries its index instead, and the index
// keys into the list below — the segment stays honestly small, and still reads.
const bars = ROLES.map((r, i) => {
  const x0 = x(month(r.from));
  // Aliseda ends the month Plexus starts, so without a hairline gap the two
  // segments read as one bar.
  const w = Math.max(3, x(month(r.to)) - x0 - 3);
  const years = (month(r.to) - month(r.from)) / (1000 * 60 * 60 * 24 * 365.25);
  const num = String(i + 1).padStart(2, '0');
  const inline = w > 150
    ? `<text class="bar-org" x="${n(x0 + 34)}" y="${BAR.y + 22}">${esc(r.org)}</text>` +
      `<text class="bar-dur" x="${n(x0 + w - 10)}" y="${BAR.y + 22}">${years.toFixed(1)} yr</text>`
    : '';
  return `<g class="bar">` +
    `<rect x="${n(x0)}" y="${BAR.y}" width="${n(w)}" height="${BAR.h}" rx="3"/>` +
    `<text class="bar-num" x="${n(x0 + 5)}" y="${BAR.y - 8}">${num}</text>` +
    inline +
    `</g>`;
}).join('');

// --- axis: one tick per real year boundary that matters ---------------------
const TICKS = ['2007-01', '2012-04', '2021-12', '2023-07', '2026-08'];
const axis = TICKS.map((t, i) => {
  const xx = n(x(month(t)));
  const anchor = i === 0 ? 'start' : i === TICKS.length - 1 ? 'end' : 'middle';
  return `<line x1="${xx}" y1="${BAR.y + BAR.h}" x2="${xx}" y2="${BAR.y + BAR.h + 8}"/>` +
    `<text x="${xx}" y="${BAR.y + BAR.h + 26}" text-anchor="${anchor}">${t.slice(0, 4)}</text>`;
}).join('');

const nodes = points.map((p, i) =>
  `<circle cx="${n(px(p))}" cy="${n(py(p))}" r="${5 + i}" style="--i:${i}"/>`).join('');

const gapStart = n(x(month('2011-05')));
const gapEnd = n(x(month('2012-04')));

const svg = `<svg class="mol-career-chart__svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Career timeline from 2007 to 2026. Segment width is the length of each role and the rising curve is the scope of work, from single screens to AI-governed workflows.">
<defs><linearGradient id="careerFill" x1="0" x2="0" y1="0" y2="1">
<stop offset="0" stop-color="currentColor" stop-opacity=".28"/>
<stop offset="1" stop-color="currentColor" stop-opacity="0"/>
</linearGradient></defs>
<g class="mol-career-chart__grid">${grid}</g>
<rect class="mol-career-chart__gap" x="${gapStart}" y="${BAR.y}" width="${n(gapEnd - gapStart)}" height="${BAR.h}"/>
<path class="mol-career-chart__area" d="${fill}"/>
<path class="mol-career-chart__curve" pathLength="1" d="${curve}"/>
<g class="mol-career-chart__nodes">${nodes}</g>
<g class="mol-career-chart__bars">${bars}</g>
<g class="mol-career-chart__axis">${axis}</g>
</svg>`;

// --- the same data as text: the mobile layout and the accessible version ----
const items = ROLES.map((r, i) => {
  const years = (month(r.to) - month(r.from)) / (1000 * 60 * 60 * 24 * 365.25);
  const to = r.to === NOW.at ? 'present' : r.to.slice(0, 4);
  return `<li class="mol-career-role" data-scope="${r.scope}">
<span class="mol-career-role__num">${String(i + 1).padStart(2, '0')}</span>
<time>${r.from.slice(0, 4)}–${to}</time>
<b>${esc(r.org)}</b>
<span class="mol-career-role__role">${esc(r.role)}</span>
<span class="mol-career-role__note">${esc(r.note)}</span>
<span class="mol-career-role__meta"><i>${esc(SCOPE[r.scope])}</i><em>${years.toFixed(1)} yr</em></span>
</li>`;
}).join('\n');

const block = `<figure class="mol-career-chart">
${svg}
</figure>
<ol class="mol-career-list">
${items}
</ol>`;

const file = join(ROOT, 'index.html');
const html = readFileSync(file, 'utf8');
const START = '<!-- timeline:start -->';
const END = '<!-- timeline:end -->';
const a = html.indexOf(START);
const b = html.indexOf(END);
if (a === -1 || b === -1) throw new Error('timeline markers not found in index.html');

writeFileSync(file, html.slice(0, a + START.length) + '\n' + block + '\n' + html.slice(b), 'utf8');

console.log(`timeline: ${ROLES.length} roles, ${points.length} curve points`);
console.log(`span ${ROLES[0].from} → ${NOW.at} · ${(( month(NOW.at) - month(ROLES[0].from)) / (1000*60*60*24*365.25)).toFixed(1)} years`);
console.log(`svg ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB inline`);
