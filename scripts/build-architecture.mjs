// Genera los diagramas de case-42ds.html y los inyecta en su marcado.
//
// Mismo principio que build-timeline.mjs y build-map-process.mjs: elkjs es una
// devDependency, corre aquí, en build, y la página recibe SVG plano. Ninguna
// librería de diagramas se envía al navegador.
//
//   npm run build:arch
//
// Hay dos diagramas y comparten todo salvo el grafo y el algoritmo: el mismo
// banco de cuerpos, el mismo padding, las mismas clases y por tanto los mismos
// tokens. Es lo que hace que se lean como dos vistas de un sistema y no como dos
// dibujos que coinciden en la misma página.
//
//   architecture  capas del sistema, algoritmo `layered`, aristas ortogonales
//   operating     núcleo y consumidores, algoritmo `radial`, radios rectos
//
// De cada uno salen dos renderizados:
//   wide    — el layout del algoritmo
//   narrow  — una columna, para leerlo en móvil sin escalar el texto a 5px
//
// Ninguno lleva un color: las clases leen tokens desde el CSS, como hace
// js/hero-field.js. Y el texto va en `<text>`, así que build-i18n lo traduce
// igual que cualquier otro nodo de texto de la página.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ELK from 'elkjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const elk = new ELK();

/* ------------------------------------------------------------ dimensiones */

// Los cuerpos de letra viven aquí y no en el CSS, a propósito. Dentro de un
// `viewBox` una longitud es una unidad del sistema de coordenadas del dibujo, no
// de la página: un token en `rem` se resolvería contra la raíz y rompería el
// escalado. Además el ancho de cada caja se calcula de ellos, así que si el CSS
// los pisara el texto se saldría del rectángulo. El CSS se ocupa de color,
// familia y peso —eso sí sale de tokens—; la geometría, de aquí.
//
// La escala es `S(n) = ∛φⁿ` de `scss/PROPORTIONS.md` §1, con el detalle en el
// escalón 0: índice S(−1) = 10,2 · detalle S(0) = 12 · etiqueta S(4) = 22,8.
const TYPE = { index: 10.2, label: 22.8, detail: 12 };

// Interlineados de §2, `lh(n) = 1 + φ⁻ⁿ`. El padding es E(2) = 1,618 × 12 ≈ 19,
// el escalón de espaciado que corresponde al cuerpo base del dibujo.
const PAD = 19;
const CH = 0.6;   // ancho medio de carácter respecto al cuerpo, en esta familia

const BASELINE = {
  index: PAD + TYPE.index,
  label: PAD + TYPE.index + TYPE.label * 1.146 + 6,
};
BASELINE.detail = BASELINE.label + TYPE.detail * 1.382 + 4;
BASELINE.labelAlone = BASELINE.label;

const HEIGHT = {
  full: Math.ceil(BASELINE.detail + PAD),
  short: Math.ceil(BASELINE.labelAlone + PAD),
};

// El ancho se mide contra la cadena más larga de las dos lenguas, no contra la
// inglesa.
//
// La página española sale de la inglesa por sustitución de nodos de texto, así
// que el SVG se traduce pero conserva la geometría calculada aquí. Con las
// medidas del inglés, «Brand setup» —once caracteres— fijaba una caja de 236
// unidades y «Configuración de marca» —veintidós— pedía 291: el texto se salía
// del rectángulo por 55 unidades, y solo en la mitad del sitio que yo no estaba
// mirando. Midiendo contra el máximo, el trazado es el mismo en los dos idiomas
// y ninguno desborda.
const DICT = JSON.parse(readFileSync(join(ROOT, 'i18n', 'es.json'), 'utf8'));
const widest = s => Math.max((s || '').length, (DICT[s] || '').length);

const size = n => {
  const text = Math.max(
    widest(n.label) * TYPE.label * CH,
    widest(n.index) * TYPE.index * CH,
    widest(n.detail) * TYPE.detail * CH,
  );
  return {
    width: Math.max(n.kind === 'target' ? 150 : 250, Math.ceil(text) + PAD * 2 + 8),
    height: n.detail ? HEIGHT.full : HEIGHT.short,
  };
};

// Separación entre hermanos y separación entre capas, en relación φ, que es lo
// que pide `PROPORTIONS.md` §5.2: el hueco que separa dos bloques es un escalón
// mayor que el que hay dentro. 33 × 1,618 = 53,4.
const GAP = 33;
const GAP_LAYER = 53;

/* -------------------------------------------------------------- renderizado */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n1 = v => Number(v.toFixed(1));

const drawNode = (k, byId) => {
  const d = byId[k.id];
  const cls = ['atom-arch-node', d.kind && `atom-arch-node--${d.kind}`].filter(Boolean).join(' ');
  const x = n1(k.x), y = n1(k.y), w = n1(k.width), h = n1(k.height);
  const t = (role, body, baseline, str) =>
    `<text class="atom-arch-node__${role}" font-size="${n1(body)}" ` +
    `x="${n1(x + PAD)}" y="${n1(y + baseline)}">${esc(str)}</text>`;

  const parts = [
    `<rect class="atom-arch-node__box" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`,
  ];
  if (d.index) parts.push(t('index', TYPE.index, BASELINE.index, d.index));
  parts.push(t('label', TYPE.label, d.detail ? BASELINE.label : BASELINE.labelAlone, d.label));
  if (d.detail) parts.push(t('detail', TYPE.detail, BASELINE.detail, d.detail));
  return `<g class="${cls}">${parts.join('')}</g>`;
};

// Las aristas salen de elk ya enrutadas: un punto de inicio, sus quiebros y un
// punto final. La longitud del trazo se calcula aquí y viaja como custom
// property: es lo que permite dibujarla con `stroke-dasharray` sin pedirle al
// navegador un `getTotalLength()` en runtime, que obligaría a cargar JS solo
// para animar un dibujo.
const drawEdge = e => (e.sections || []).map(s => {
  const pts = [s.startPoint, ...(s.bendPoints || []), s.endPoint];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${n1(p.x)} ${n1(p.y)}`).join(' ');
  const len = pts.slice(1).reduce((acc, p, i) =>
    acc + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
  return `<path class="atom-arch-edge" style="--edge-length:${Math.ceil(len)}" d="${d}"/>`;
}).join('');

const svg = (g, byId, variant, label) => {
  const w = Math.ceil(g.width), h = Math.ceil(g.height);
  return `<svg class="mol-arch-map__svg mol-arch-map__svg--${variant}" viewBox="0 0 ${w} ${h}" ` +
    `role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMin meet">` +
    `<g class="mol-arch-map__edges">${(g.edges || []).map(drawEdge).join('')}</g>` +
    `<g class="mol-arch-map__nodes">${(g.children || []).map(k => drawNode(k, byId)).join('')}</g>` +
    `</svg>`;
};

/* ------------------------------------------------------------ los diagramas */

// Diagrama 1 — las capas del sistema.
//
// Lo que sustituyó era marcado a mano: cuatro `<div>` de raíl, un `__split` y un
// `__connector` con tres `<i>` vacíos que dibujaban las conexiones con bordes
// CSS. Las relaciones reales —qué alimenta a qué— existían solo en la cabeza de
// quien lo escribió. Aquí el grafo se declara y el trazado lo calcula el
// algoritmo por capas.
const ARCHITECTURE = {
  id: 'architecture',
  algorithm: 'layered',
  label: '42DS architecture diagram from foundations through component composition, ' +
    'brand configuration and production targets.',
  nodes: [
    { id: 'foundations', index: '01 / Core', label: 'Foundations',
      detail: 'variables · maps · mixins · functions', kind: 'primary' },
    { id: 'base', index: '02 / Rules', label: 'Base',
      detail: 'reset · typography · helpers' },
    { id: 'brand', index: '03A / Context', label: 'Brand setup',
      detail: 'colour · type · identity' },
    { id: 'components', index: '03B / Composition', label: 'Components',
      detail: 'atoms · molecules · organisms' },
    { id: 'html5', index: '04 / Delivery', label: 'HTML5', kind: 'target' },
    { id: 'amp', index: '04 / Delivery', label: 'AMP', kind: 'target' },
    { id: 'piano', index: '04 / Delivery', label: 'Piano', kind: 'target' },
    { id: 'legacy', index: '04 / Delivery', label: 'Legacy', kind: 'target' },
  ],
  // «Los destinos de producción consumen la misma lógica compartida» era una
  // frase en la entradilla; aquí es el hecho de que los cuatro cuelgan de las
  // dos ramas.
  edges: [
    ['foundations', 'base'],
    ['base', 'brand'],
    ['base', 'components'],
    ...['html5', 'amp', 'piano', 'legacy'].flatMap(t => [['brand', t], ['components', t]]),
  ],
};

// Diagrama 2 — el modelo operativo.
//
// Sustituye a `.mol-orbit-system`, que era una órbita en posiciones absolutas
// dentro de un lienzo de 35rem, con las cinco coordenadas escritas a mano en
// porcentajes y los cinco radios escritos a mano en un `<path d="M500 280 L160
// 100">`. Nada de eso llegaba a verse: tres declaraciones en `@layer
// syx.organisms` —`display: grid` en el contenedor, `display: none` en el SVG de
// líneas y `position: static` en los nodos— ganaban a la capa de moléculas y de
// átomos y lo aplanaban en una lista a todos los anchos. El `aria-label` seguía
// describiendo a un lector de pantalla una órbita que nadie veía.
//
// Es un hub-and-spoke —un núcleo y cinco consumidores— así que el algoritmo es
// `radial` y los radios salen rectos. Las coordenadas dejan de estar escritas a
// mano: si mañana entra un sexto consumidor, se añade una línea y el dibujo se
// recoloca solo.
const OPERATING = {
  id: 'operating',
  algorithm: 'radial',
  label: 'Operating model showing 42DS at the centre connected to Figma, front-end, ' +
    'Storybook, Vue and AI Mind System.',
  nodes: [
    { id: '42ds', index: 'Shared architecture', label: '42DS', kind: 'primary' },
    { id: 'figma', index: 'Design', label: 'Figma', kind: 'target' },
    { id: 'canonical', index: 'Canonical layer', label: 'HTML / SCSS / JS', kind: 'target' },
    { id: 'storybook', index: 'Documentation', label: 'Storybook', kind: 'target' },
    { id: 'vue', index: 'Integration', label: 'Vue', kind: 'target' },
    { id: 'ai', index: 'Context + governance', label: 'AI Mind System', kind: 'target' },
  ],
  edges: [
    ['42ds', 'figma'], ['42ds', 'canonical'], ['42ds', 'storybook'],
    ['42ds', 'vue'], ['42ds', 'ai'],
  ],
};

/* ---------------------------------------------------------------- retícula */

// Una retícula, no ocho cajas sueltas. Solo aplica al diagrama por capas.
//
// Con el ancho de cada caja calculado solo de su propio texto, dos hermanas de
// la misma capa salían con anchos distintos —«Brand setup» 347 y «Components»
// 270, porque una tiene una traducción larga y la otra no— y la fila se veía
// descuadrada. Que dos cosas del mismo nivel midan distinto por un accidente del
// idioma es ruido, no información.
//
// La regla: todas las filas miden lo mismo, y dentro de una fila los hermanos se
// reparten ese ancho a partes iguales. El ancho común es el de la fila que más
// necesita, así que ninguna caja queda por debajo de su contenido.
const gridWidths = ({ nodes, edges }) => {
  const depth = Object.fromEntries(nodes.map(n => [n.id, 0]));
  for (let pass = 0; pass < nodes.length; pass++) {
    for (const [from, to] of edges) depth[to] = Math.max(depth[to], depth[from] + 1);
  }
  const layers = [...new Set(Object.values(depth))].sort((a, b) => a - b)
    .map(l => nodes.filter(n => depth[n.id] === l));
  const row = Math.max(...layers.map(layer =>
    layer.reduce((sum, n) => sum + size(n).width, 0) + GAP * (layer.length - 1)));
  return Object.fromEntries(nodes.map(n => {
    const layer = layers.find(l => l.some(x => x.id === n.id));
    return [n.id, Math.floor((row - GAP * (layer.length - 1)) / layer.length)];
  }));
};

/* ------------------------------------------------------------------ layouts */

const OPTIONS = {
  layered: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.mergeEdges': 'true',
    // `BRANDES_KOEPF`, el de por defecto, repartía la fila de destinos a lo
    // largo de 882 unidades cuando sus cuatro cajas y sus tres huecos suman 699:
    // abría canales para el abanico de aristas y desalineaba esa fila respecto a
    // las otras tres. Ni `spacing.edgeNode`, ni `spacing.edgeEdge`, ni
    // `edgeEdgeBetweenLayers` cambiaban nada —probados a 4, 10 y 20—; el
    // ensanchado venía de la propia estrategia de colocación.
    'elk.layered.nodePlacement.strategy': 'SIMPLE',
    // Los cuatro destinos salían en el orden que menos cruces produce —Piano,
    // Legacy, HTML5, AMP—, que no es el orden en que están declarados ni el que
    // se lee en la ficha.
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.spacing.nodeNode': `${GAP}`,
    'elk.layered.spacing.nodeNodeBetweenLayers': `${GAP_LAYER}`,
    'elk.spacing.edgeNode': '20',
    'elk.padding': '[top=10,left=10,bottom=10,right=10]',
  },
  radial: {
    'elk.algorithm': 'radial',
    'elk.spacing.nodeNode': `${GAP}`,
    'elk.padding': '[top=10,left=10,bottom=10,right=10]',
  },
};

const layoutWide = async d => {
  const widths = d.algorithm === 'layered' ? gridWidths(d) : null;
  return elk.layout({
    id: 'root',
    layoutOptions: OPTIONS[d.algorithm],
    children: d.nodes.map(n => ({
      id: n.id, ...size(n), ...(widths ? { width: widths[n.id] } : {}),
    })),
    edges: d.edges.map(([source, target], i) =>
      ({ id: `e${i}`, sources: [source], targets: [target] })),
  });
};

// El renderizado estrecho.
//
// El primer intento fue pedirle a elk una relación de aspecto alta con el mismo
// grafo, esperando que apilara los nodos de la última capa. No lo hace:
// `aspectRatio` no reordena una capa, y el resultado salía 708×476 contra los
// 732×518 del ancho — el mismo diagrama, sin ganar nada.
//
// Así que en móvil el grafo se lee en línea: los mismos nodos, encadenados en
// orden de declaración. Se pierde la forma —el abanico en uno, los radios en el
// otro— pero a 360px la alternativa es un SVG de 700 unidades escalado a 0,5,
// con el texto a 5px. Es la misma decisión que ya tomaba el marcado anterior al
// apilarse en una columna por debajo de 900px, solo que ahora es explícita.
const layoutNarrow = d => {
  const width = Math.max(...d.nodes.map(n => size(n).width));
  return elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '20',
      'elk.layered.spacing.nodeNodeBetweenLayers': '34',
      'elk.padding': '[top=10,left=10,bottom=10,right=10]',
    },
    children: d.nodes.map(n => ({ id: n.id, ...size(n), width })),
    edges: d.nodes.slice(1).map((n, i) =>
      ({ id: `n${i}`, sources: [d.nodes[i].id], targets: [n.id] })),
  });
};

/* ------------------------------------------------------------------ salida */

const file = join(ROOT, 'case-42ds.html');
let html = readFileSync(file, 'utf8');

for (const d of [ARCHITECTURE, OPERATING]) {
  const byId = Object.fromEntries(d.nodes.map(n => [n.id, n]));
  const [wide, narrow] = await Promise.all([layoutWide(d), layoutNarrow(d)]);

  const block = `<div class="mol-arch-map">
${svg(wide, byId, 'wide', d.label)}
${svg(narrow, byId, 'narrow', d.label)}
</div>`;

  const START = `<!-- ${d.id}:start -->`;
  const END = `<!-- ${d.id}:end -->`;
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a === -1 || b === -1) throw new Error(`marcadores de ${d.id} no encontrados en case-42ds.html`);
  html = html.slice(0, a + START.length) + '\n' + block + '\n' + html.slice(b);

  console.log(`${d.id.padEnd(13)} ${d.nodes.length} nodos, ${d.edges.length} aristas · ` +
    `wide ${Math.ceil(wide.width)}×${Math.ceil(wide.height)} · ` +
    `narrow ${Math.ceil(narrow.width)}×${Math.ceil(narrow.height)}`);
}

writeFileSync(file, html, 'utf8');
console.log(`svg ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB de página total`);
