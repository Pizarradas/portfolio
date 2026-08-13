// Genera el diagrama de arquitectura de 42DS y lo inyecta en case-42ds.html.
//
// Mismo principio que build-timeline.mjs y build-map-process.mjs: elkjs es una
// devDependency, corre aquí, en build, y la página recibe SVG plano. Ninguna
// librería de diagramas se envía al navegador.
//
//   npm run build:arch
//
// Lo que sustituye era marcado escrito a mano: cuatro `<div>` de raíl, un
// `__split`, un `__connector` con tres `<i>` vacíos que dibujaban las
// conexiones con bordes CSS, y las relaciones reales —qué alimenta a qué—
// existiendo solo en la cabeza de quien lo escribió. Aquí el grafo se declara
// una vez, abajo, y el trazado lo calcula un algoritmo de layout por capas.
//
// Dos renderizados del mismo grafo:
//   wide    — el layout de elk, con las conexiones enrutadas y fusionadas
//   narrow  — una columna, para leerlo en móvil sin escalar el texto a 5px
//
// Ninguno de los dos lleva un color: las clases leen tokens desde el CSS, como
// hace js/hero-field.js. Y el texto va en `<text>`, así que build-i18n lo
// traduce igual que cualquier otro nodo de texto de la página.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ELK from 'elkjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* --------------------------------------------------------------- el grafo */

const NODES = [
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
];

// Las aristas son la parte que el marcado a mano no tenía. «Los destinos de
// producción consumen la misma lógica compartida» era una frase en la
// entradilla; aquí es el hecho de que los cuatro cuelgan de las dos ramas.
const EDGES = [
  ['foundations', 'base'],
  ['base', 'brand'],
  ['base', 'components'],
  ...['html5', 'amp', 'piano', 'legacy'].flatMap(t => [['brand', t], ['components', t]]),
];

/* ------------------------------------------------------------ dimensiones */

// Los cuerpos de letra del diagrama viven aquí y no en el CSS, a propósito.
// Dentro de un `viewBox` una longitud es una unidad del sistema de coordenadas
// del dibujo, no de la página: un token en `rem` se resolvería contra la raíz y
// rompería el escalado. Además el ancho de cada caja se calcula de ellos, así
// que si el CSS los pisara el texto se saldría del rectángulo. El CSS se ocupa
// de color, familia y peso —eso sí sale de tokens—; la geometría, de aquí.
//
// Que no puedan ser tokens no significa que puedan ser números a ojo, que es lo
// que eran: 11, 19 y 12. El índice y el detalle quedaban a un punto el uno del
// otro —11 contra 12— así que la etiqueta de capa y la lista de contenido
// pesaban casi igual, y el nombre del nodo, que es lo único que se lee de lejos,
// no destacaba lo suficiente.
//
// La escala tipográfica de `scss/PROPORTIONS.md` §1 es `S(n) = ∛φⁿ`. Aplicada
// con el detalle en el escalón 0:
//
//   index   S(−1) = 12 / 1.174 = 10.2
//   detail  S( 0) = 12
//   label   S( 4) = 12 × 1.900 = 22.8
//
// El salto entre índice y etiqueta pasa de 1,7× a 2,2×, y detalle e índice dejan
// de confundirse.
const TYPE = { index: 10.2, label: 22.8, detail: 12 };

// El interlineado sale de §2, `lh(n) = 1 + φ⁻ⁿ`: lh(2) = 1.382 para el detalle,
// que es texto corrido corto, y lh(4) = 1.146 para la etiqueta, que es un
// titular. El padding es E(2) = 1.618 × 12 ≈ 19 unidades, el escalón de
// espaciado que corresponde al cuerpo base del dibujo.
const PAD = 19;
const CH = 0.6;   // ancho medio de carácter respecto al cuerpo, en esta familia

// Las líneas base se derivan del tipo en vez de fijarse una a una. Antes eran
// 22, 52 y 74: tres constantes que había que recalcular a mano cada vez que se
// tocaba un cuerpo, y que por tanto nadie iba a recalcular.
const BASELINE = {
  index: PAD + TYPE.index,
  label: PAD + TYPE.index + TYPE.label * 1.146 + 6,
};
BASELINE.detail = BASELINE.label + TYPE.detail * 1.382 + 4;
BASELINE.labelAlone = PAD + TYPE.index + TYPE.label * 1.146 + 6;

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

/* ----------------------------------------------------------------- retícula */

// Una retícula, no ocho cajas sueltas.
//
// Con el ancho de cada caja calculado solo de su propio texto, dos hermanas de
// la misma capa salían con anchos distintos —«Brand setup» 347 y «Components»
// 270, porque una tiene una traducción larga y la otra no— y la fila se veía
// descuadrada. Que dos cosas del mismo nivel midan distinto por un accidente
// del idioma es ruido, no información.
//
// La regla: todas las filas miden lo mismo, y dentro de una fila los hermanos se
// reparten ese ancho a partes iguales. El ancho común es el de la fila que más
// necesita, así que ninguna caja queda por debajo de su contenido. Las capas de
// un solo nodo ocupan la fila entera, que es además lo que dicen: el núcleo y
// las reglas sostienen todo lo que hay debajo.
const GAP = 33;

// La profundidad de cada nodo es su camino más largo desde una raíz — la misma
// noción de capa que usa el algoritmo, calculada aquí para poder repartir.
const depth = (() => {
  const d = Object.fromEntries(NODES.map(n => [n.id, 0]));
  for (let pass = 0; pass < NODES.length; pass++) {
    for (const [from, to] of EDGES) d[to] = Math.max(d[to], d[from] + 1);
  }
  return d;
})();

const LAYERS = [...new Set(Object.values(depth))].sort((a, b) => a - b)
  .map(l => NODES.filter(n => depth[n.id] === l));

// El ancho de fila que hace falta para que ninguna capa apriete su contenido.
const ROW = Math.max(...LAYERS.map(layer =>
  layer.reduce((sum, n) => sum + size(n).width, 0) + GAP * (layer.length - 1)));

const gridWidth = n => {
  const layer = LAYERS.find(l => l.some(x => x.id === n.id));
  return Math.floor((ROW - GAP * (layer.length - 1)) / layer.length);
};

const elk = new ELK();

const layout = (nodes, opts) => elk.layout({
  id: 'root',
  layoutOptions: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.mergeEdges': 'true',
    // `BRANDES_KOEPF`, que es el de por defecto, repartía la fila de destinos a
    // lo largo de 882 unidades cuando sus cuatro cajas y sus tres huecos suman
    // 699: abría canales para el abanico de aristas y desalineaba esa fila
    // respecto a las otras tres. Ni `spacing.edgeNode`, ni `spacing.edgeEdge`,
    // ni `edgeEdgeBetweenLayers` cambiaban nada —probados a 4, 10 y 20—; el
    // ensanchado venía de la propia estrategia de colocación. `SIMPLE` respeta
    // los anchos que se le dan, que es lo que aquí hace falta porque el reparto
    // ya está decidido arriba.
    'elk.layered.nodePlacement.strategy': 'SIMPLE',
    // Los cuatro destinos salían en el orden que menos cruces produce —Piano,
    // Legacy, HTML5, AMP— que no es el orden en que están declarados ni el que
    // se lee en la ficha. Respetando el orden del modelo salen como se escriben,
    // y los pocos cruces que eso añade se los come `mergeEdges`.
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    // Separación entre hermanos y separación entre capas, en relación φ, que es
    // lo que pide `PROPORTIONS.md` §5.2: el hueco que separa dos bloques es un
    // escalón mayor que el que hay dentro. 33 × 1.618 = 53.4. Antes eran 28 y 54,
    // que dan 1,93 — casi dos, así que las capas se leían el doble de separadas
    // de lo que les tocaba y el dibujo salía más alto de lo necesario.
    'elk.spacing.nodeNode': `${GAP}`,
    'elk.layered.spacing.nodeNodeBetweenLayers': '53',
    'elk.spacing.edgeNode': '20',
    'elk.padding': '[top=10,left=10,bottom=10,right=10]',
    ...opts,
  },
  children: nodes.map(n => ({ id: n.id, ...size(n), width: gridWidth(n) })),
  edges: EDGES.map(([source, target], i) => ({ id: `e${i}`, sources: [source], targets: [target] })),
});

/* -------------------------------------------------------------- renderizado */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n1 = v => Number(v.toFixed(1));

const byId = Object.fromEntries(NODES.map(n => [n.id, n]));

const drawNode = k => {
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
// punto final. Se dibujan con esquinas rectas porque el diagrama describe una
// jerarquía de capas, no un flujo orgánico.
// La longitud de cada trazo se calcula aquí y viaja como custom property. Es lo
// que permite dibujar la arista con `stroke-dasharray` sin pedirle al navegador
// un `getTotalLength()` en runtime — que obligaría a cargar JS solo para animar
// un dibujo. Los tramos son ortogonales, así que la longitud es la suma de los
// catetos.
const drawEdge = e => (e.sections || []).map(s => {
  const pts = [s.startPoint, ...(s.bendPoints || []), s.endPoint];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${n1(p.x)} ${n1(p.y)}`).join(' ');
  const len = pts.slice(1).reduce((acc, p, i) =>
    acc + Math.abs(p.x - pts[i].x) + Math.abs(p.y - pts[i].y), 0);
  return `<path class="atom-arch-edge" style="--edge-length:${Math.ceil(len)}" d="${d}"/>`;
}).join('');

const svg = (g, variant, label) => {
  const w = Math.ceil(g.width), h = Math.ceil(g.height);
  return `<svg class="mol-arch-map__svg mol-arch-map__svg--${variant}" viewBox="0 0 ${w} ${h}" ` +
    `role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMin meet">` +
    `<g class="mol-arch-map__edges">${(g.edges || []).map(drawEdge).join('')}</g>` +
    `<g class="mol-arch-map__nodes">${(g.children || []).map(drawNode).join('')}</g>` +
    `</svg>`;
};

const LABEL = '42DS architecture diagram from foundations through component composition, ' +
  'brand configuration and production targets.';

/* ------------------------------------------------------------------ salida */

// El renderizado estrecho.
//
// El primer intento fue pedirle a elk una relación de aspecto alta con el mismo
// grafo, esperando que apilara los cuatro destinos. No lo hace: `aspectRatio`
// no reordena una capa, y el resultado salía 708×476 contra los 732×518 del
// ancho — el mismo diagrama, sin ganar nada. Con `layered` y dirección DOWN los
// nodos de una misma capa van en fila, y los cuatro destinos son una capa.
//
// Así que en móvil el grafo se lee en línea: los mismos nodos, encadenados en
// orden de lectura. Se pierde el hecho de que las dos ramas alimentan los
// cuatro destinos —que es justo lo que el diagrama ancho existe para enseñar—
// pero a 360px la alternativa es un SVG de 732 unidades escalado a 0,49, con el
// texto a 5px. Es la misma decisión que ya tomaba el marcado anterior al
// apilarse en una columna por debajo de 900px, solo que ahora es explícita.
const CHAIN = ['foundations', 'base', 'brand', 'components', 'html5', 'amp', 'piano', 'legacy'];

const [wide, narrow] = await Promise.all([
  layout(NODES, {}),
  elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '20',
      'elk.layered.spacing.nodeNodeBetweenLayers': '34',
      'elk.padding': '[top=8,left=8,bottom=8,right=8]',
    },
    // Una columna: todas las cajas al ancho de la que más pide, por el mismo
    // motivo que arriba —una fila es una fila aunque tenga un solo elemento.
    children: NODES.map(n => ({
      id: n.id, ...size(n),
      width: Math.max(...NODES.map(m => size(m).width)),
    })),
    edges: CHAIN.slice(1).map((t, i) => ({ id: `n${i}`, sources: [CHAIN[i]], targets: [t] })),
  }),
]);

const block = `<div class="mol-arch-map">
${svg(wide, 'wide', LABEL)}
${svg(narrow, 'narrow', LABEL)}
</div>`;

const file = join(ROOT, 'case-42ds.html');
const html = readFileSync(file, 'utf8');
const START = '<!-- architecture:start -->';
const END = '<!-- architecture:end -->';
const a = html.indexOf(START);
const b = html.indexOf(END);
if (a === -1 || b === -1) throw new Error('architecture markers not found in case-42ds.html');

writeFileSync(file, html.slice(0, a + START.length) + '\n' + block + '\n' + html.slice(b), 'utf8');

// Aquí había una comprobación de desbordamiento que recorría las dos lenguas y
// fallaba el build si algún texto se salía de su caja. Era código muerto: `size`
// devuelve `max(base, necesario)`, así que la condición no podía cumplirse
// nunca. Se probó con una etiqueta larguísima y el build pasó igual.
//
// El desbordamiento está descartado por construcción, no por una comprobación:
// cada caja se dimensiona contra la más larga de las dos cadenas. Lo que sigue
// siendo una estimación es `CH`, un ancho medio de carácter; una cadena de
// caracteres anchos podría pasarse. Para eso están los 40 de holgura, y si algún
// día no bastan la respuesta es medir con la métrica real de la fuente, no
// volver a poner un `if` que compara la estimación consigo misma.
console.log(`architecture: ${NODES.length} nodes, ${EDGES.length} edges`);
console.log(`wide   ${Math.ceil(wide.width)}×${Math.ceil(wide.height)}`);
console.log(`narrow ${Math.ceil(narrow.width)}×${Math.ceil(narrow.height)}`);
console.log(`svg ${(Buffer.byteLength(block) / 1024).toFixed(1)} KB inline`);
