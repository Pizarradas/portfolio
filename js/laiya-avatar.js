/* LAIYA — el enjambre.
 *
 * El orbe ya no es una esfera sólida: es un enjambre de partículas que se
 * une, se divide y cambia de forma según lo que está haciendo. Módulo ES que
 * se carga al abrir la capa, con el build recortado de Three
 * (`js/vendor/three.laiya.min.js`, `npm run vendor:three`).
 *
 * La forma dice la operación:
 *
 *   sphere   reposo — un cuerpo entero, respira
 *   cloud    pensar — se deshace en una nube que gira…
 *   split    …y se divide en tres núcleos que se buscan y vuelven a unirse
 *   ring     escuchar — un anillo que late con la voz
 *   cube     sistemas — 42DS, tokens, design systems
 *   grid     estructura — el stack, la retícula
 *   helix    tiempo — la trayectoria
 *   line     una sola dirección — el contacto
 *   torus    proceso — un caso contado de principio a fin
 *   network  IA — nodos y conexiones
 *   octa     evidencia — un dato, una medida
 *
 * Entre forma y forma las partículas viajan con un retardo propio, así que el
 * cambio se lee como algo que se reorganiza y no como un fundido. Los hilos
 * que las unen aparecen cuando la forma es estructura y se rompen cuando se
 * divide.
 *
 * El color se queda dentro de la única paleta de la marca (BRAND.md §4): la
 * rampa de azules, el navy y la luz blanca. La emoción la da el valor —más
 * luz al alegrarse, más profundidad al pensar, gris al no saber—, no el tono:
 * los complementarios se retiraron del sistema y no vuelven por aquí.
 *
 * Con `prefers-reduced-motion` no hay bucle: se pinta la forma y se para.
 * En reposo el bucle se detiene a los 5 s (WCAG 2.2.2).
 */
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Points,
  LineSegments,
  Group,
  Color,
  AdditiveBlending,
  ColorManagement,
} from './vendor/three.laiya.min.js';

// Los shaders escriben el color tal cual: los tokens ya están en sRGB.
ColorManagement.enabled = false;

const N = 2600;
const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- formas */

const rand = (() => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
})();

function shapes() {
  const out = {};
  const make = fn => {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const p = fn(i, i / N);
      a[i * 3] = p[0];
      a[i * 3 + 1] = p[1];
      a[i * 3 + 2] = p[2];
    }
    return a;
  };

  // Fibonacci: reparto uniforme, y en orden de espiral, así los vecinos de
  // índice son vecinos en la superficie y los hilos dibujan meridianos.
  const fib = (i, r = 1) => {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = i * Math.PI * (3 - Math.sqrt(5));
    return [Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r];
  };

  out.sphere = make(i => fib(i, 0.95));

  out.cloud = make(() => {
    const u = rand(), v = rand(), w = Math.cbrt(rand());
    const th = u * TAU, ph = Math.acos(2 * v - 1);
    const r = 1.35 * w;
    return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
  });

  // Tres núcleos: el enjambre que se divide para analizar.
  out.split = make(i => {
    const k = i % 3;
    const c = [Math.cos((k / 3) * TAU + 0.5) * 0.78, Math.sin((k / 3) * TAU + 0.5) * 0.78, 0];
    const p = fib(Math.floor(i / 3) * 3, 0.36);
    return [c[0] + p[0], c[1] + p[1], c[2] + p[2]];
  });

  out.ring = make((i, t) => {
    const a = t * TAU * 1;
    const band = (i % 7) / 7 - 0.5;
    return [Math.cos(a) * (1 + band * 0.12), Math.sin(a) * (1 + band * 0.12), band * 0.08];
  });

  // Cubo: la mitad de las partículas en las aristas (la estructura), el
  // resto en las caras.
  out.cube = make(i => {
    const s = 0.72;
    if (i % 2 === 0) {
      const e = Math.floor(rand() * 12);
      const t = rand() * 2 - 1;
      const edges = [
        [t, -1, -1], [t, 1, -1], [t, -1, 1], [t, 1, 1],
        [-1, t, -1], [1, t, -1], [-1, t, 1], [1, t, 1],
        [-1, -1, t], [1, -1, t], [-1, 1, t], [1, 1, t],
      ];
      return edges[e].map(v => v * s);
    }
    const f = Math.floor(rand() * 6), u = rand() * 2 - 1, v = rand() * 2 - 1;
    const faces = [[1, u, v], [-1, u, v], [u, 1, v], [u, -1, v], [u, v, 1], [u, v, -1]];
    return faces[f].map(x => x * s);
  });

  // Retícula: un plano de 35 × 40 —filas en orden, así los hilos son líneas
  // de la cuadrícula— inclinado hacia el que mira.
  out.grid = make(i => {
    const cols = 35;
    const x = (i % cols) / (cols - 1) - 0.5;
    const z = Math.floor(i / cols) / (N / cols - 1) - 0.5;
    const yy = 0;
    const ang = 0.9;
    return [x * 2.1, yy * Math.cos(ang) - z * 1.9 * Math.sin(ang), yy * Math.sin(ang) + z * 1.9 * Math.cos(ang)];
  });

  // Doble hélice, con travesaños: el tiempo como estructura.
  out.helix = make((i, t) => {
    const strand = i % 3;
    const k = Math.floor(i / 3) / (N / 3);
    const a = k * TAU * 2.6;
    const y = (k - 0.5) * 2.2;
    if (strand === 2) {
      const f = rand() * 2 - 1;
      return [Math.cos(a) * 0.5 * f, y, Math.sin(a) * 0.5 * f];
    }
    const off = strand ? Math.PI : 0;
    return [Math.cos(a + off) * 0.5, y, Math.sin(a + off) * 0.5];
  });

  // Una línea, con una punta: una sola dirección.
  out.line = make((i, t) => {
    const x = (t - 0.5) * 2.4;
    const j = (rand() - 0.5) * 0.06;
    const head = t > 0.9 ? (t - 0.9) * 4 : 0;
    return [x, j + (i % 2 ? head : -head) * (1 - (t - 0.9) * 10) * 0.3, (rand() - 0.5) * 0.06];
  });

  out.torus = make((i, t) => {
    const u = t * TAU * 24, v = (i % 58) / 58 * TAU;
    const R = 0.72, r = 0.26;
    return [(R + r * Math.cos(v)) * Math.cos(u / 24 * 1), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u / 24)];
  });

  // Red: 14 nodos y partículas repartidas por los enlaces entre ellos.
  const nodes = Array.from({ length: 14 }, (_, k) => fib(Math.floor((k / 14) * N), 0.9));
  out.network = make(i => {
    const a = nodes[i % 14];
    if (i % 5 === 0) return a.map(v => v + (rand() - 0.5) * 0.08);
    const b = nodes[(i * 7 + 3) % 14];
    const t = rand();
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  });


  /* ------------------------------------------------- formas temáticas */
  // Cada cosa que LAIYA señala tiene su forma. No son iconos: son objetos
  // hechos de las mismas partículas, así el cambio de uno a otro se ve.

  // Puntos sobre las caras de una caja centrada en c con medio-lado h.
  const boxPoint = (c, h) => {
    const f = Math.floor(rand() * 6), u = rand() * 2 - 1, v = rand() * 2 - 1;
    const faces = [[1, u, v], [-1, u, v], [u, 1, v], [u, -1, v], [u, v, 1], [u, v, -1]];
    const p = faces[f];
    return [c[0] + p[0] * h[0], c[1] + p[1] * h[1], c[2] + p[2] * h[2]];
  };
  const along = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // SPORT: las cuatro barras de la investigación, a su altura real —86 %,
  // 40,86 %, 81,88 % y 100 %—. El enjambre se convierte en el dato.
  const BARS = [0.86, 0.4086, 0.8188, 1];
  out.bars = make(i => {
    const k = i % 4, hgt = BARS[k] * 1.7;
    return boxPoint([-0.84 + k * 0.56, -0.85 + hgt / 2, 0], [0.19, hgt / 2, 0.19]);
  });

  // Mundial: un balón de verdad. Icosaedro truncado (60 vértices, 90
  // aristas): las costuras llevan el 70 % de las partículas.
  {
    const phi = (1 + Math.sqrt(5)) / 2;
    const base = [[0, 1, 3 * phi], [1, 2 + phi, 2 * phi], [phi, 2, 2 * phi + 1]];
    const verts = [];
    for (const b of base)
      for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
        const v = [b[0] * sx, b[1] * sy, b[2] * sz];
        for (const p of [[0, 1, 2], [1, 2, 0], [2, 0, 1]]) {
          const w = [v[p[0]], v[p[1]], v[p[2]]];
          if (!verts.some(q => Math.hypot(q[0] - w[0], q[1] - w[1], q[2] - w[2]) < 1e-6)) verts.push(w);
        }
      }
    const edges = [];
    for (let a = 0; a < verts.length; a++)
      for (let b = a + 1; b < verts.length; b++)
        if (Math.abs(Math.hypot(verts[a][0] - verts[b][0], verts[a][1] - verts[b][1], verts[a][2] - verts[b][2]) - 2) < 1e-3) edges.push([verts[a], verts[b]]);
    const R = Math.hypot(...verts[0]);
    const norm = (p, r) => {
      const l = Math.hypot(p[0], p[1], p[2]) || 1;
      return [(p[0] / l) * r, (p[1] / l) * r, (p[2] / l) * r];
    };
    out.ball = make(i => {
      if (i % 10 < 7) {
        const e = edges[Math.floor(rand() * edges.length)];
        return norm(along(e[0], e[1], rand()), 1);
      }
      return fib(i, 0.98);
    });
    void R;
  }

  // ATLAS: un globo con meridianos y paralelos — un atlas.
  out.globe = make(i => {
    const kind = i % 5;
    const t = rand() * Math.PI * 2;
    if (kind < 2) {
      const m = Math.floor(rand() * 12) * (Math.PI / 6);
      return [Math.cos(t) * Math.cos(m), Math.sin(t), Math.cos(t) * Math.sin(m)].map(v => v * 0.98);
    }
    if (kind < 4) {
      const lat = (Math.floor(rand() * 7) - 3) * (Math.PI / 8);
      return [Math.cos(lat) * Math.cos(t), Math.sin(lat), Math.cos(lat) * Math.sin(t)].map(v => v * 0.98);
    }
    return fib(i, 0.98);
  });

  // Ilustraciones: un lápiz, de punta.
  out.pencil = make(() => {
    const along2 = rand();
    const ax = [-0.95, -0.95, 0], bx = [0.95, 0.95, 0];
    const len = Math.hypot(1.9, 1.9);
    const dir = [1.9 / len, 1.9 / len, 0];
    const n1 = [-dir[1], dir[0], 0], n2 = [0, 0, 1];
    const a = Math.floor(rand() * 6) * (Math.PI / 3) + rand() * 0.15;
    const tipStart = 0.18;
    const r = along2 < tipStart ? (along2 / tipStart) * 0.2 : 0.2;
    const c = along(ax, bx, along2);
    return [c[0] + (n1[0] * Math.cos(a) + n2[0] * Math.sin(a)) * r, c[1] + (n1[1] * Math.cos(a) + n2[1] * Math.sin(a)) * r, c[2] + (n1[2] * Math.cos(a) + n2[2] * Math.sin(a)) * r];
  });

  // Ubicación: la chincheta de un mapa.
  out.pin = make(i => {
    if (i % 3 === 0) {
      const p = fib(i, 0.5);
      return [p[0], p[1] + 0.45, p[2]];
    }
    const t = rand(), a = rand() * Math.PI * 2;
    const r = 0.47 * (1 - t);
    return [Math.cos(a) * r, 0.45 - t * 1.5, Math.sin(a) * r];
  });

  // Contacto: un sobre — la caja fina, la solapa en V y el borde.
  out.envelope = make(i => {
    const W = 1.15, H = 0.72;
    const k = i % 4;
    if (k === 0) return along([-W, H, 0.05], [0, -0.1, 0.05], rand());
    if (k === 1) return along([W, H, 0.05], [0, -0.1, 0.05], rand());
    return boxPoint([0, 0, 0], [W, H, 0.04]);
  });

  // CV: una hoja con renglones.
  out.page = make(i => {
    if (i % 3 === 0) return boxPoint([0, 0, 0], [0.72, 0.98, 0.02]);
    const line = Math.floor(rand() * 9);
    const w = line === 0 ? 0.7 : 0.55 + rand() * 0.4;
    return [-0.55 + rand() * w * 1.4 * 0.8, 0.72 - line * 0.18, 0.04];
  });

  // Formación: un birrete.
  out.cap = make(i => {
    const k = i % 6;
    if (k < 3) {
      const u = rand() * 2 - 1, v = rand() * 2 - 1;
      const x = (u - v) * 0.75, z = (u + v) * 0.75;
      return [x, 0.32 + (rand() - 0.5) * 0.04, z];
    }
    if (k < 5) {
      const a = rand() * Math.PI * 2, y = 0.32 - rand() * 0.6;
      return [Math.cos(a) * 0.48, y, Math.sin(a) * 0.48];
    }
    return along([0.7, 0.32, 0], [0.8, -0.5, 0.1], rand());
  });

  // IA: una red neuronal de tres capas, nodos y conexiones.
  {
    const layers = [4, 6, 4];
    const nodes = layers.map((n, l) => Array.from({ length: n }, (_, k) => [(l - 1) * 0.95, ((k + 0.5) / n - 0.5) * 1.9, 0]));
    out.neural = make(i => {
      if (i % 3 === 0) {
        const L = Math.floor(rand() * 3);
        const c = nodes[L][Math.floor(rand() * nodes[L].length)];
        const p = fib(i, 0.09);
        return [c[0] + p[0], c[1] + p[1], c[2] + p[2]];
      }
      const L = Math.floor(rand() * 2);
      const a = nodes[L][Math.floor(rand() * nodes[L].length)];
      const b = nodes[L + 1][Math.floor(rand() * nodes[L + 1].length)];
      return along(a, b, rand());
    });
  }

  // Trayectoria: una escalera que sube — la escala que no dejó de cambiar.
  out.stairs = make(() => {
    const k = Math.floor(rand() * 5);
    const h = 0.25 + k * 0.33;
    return boxPoint([-0.9 + k * 0.45, -0.95 + h / 2, 0], [0.2, h / 2, 0.3]);
  });

  // Proyectos y sistemas: capas apiladas — marcas distintas sobre un núcleo
  // común (42DS), o casos uno detrás de otro.
  out.stack = make(i => {
    const k = i % 4;
    return boxPoint([-0.24 + k * 0.16, -0.36 + k * 0.24, -0.3 + k * 0.2], [0.75, 0.02, 0.5]);
  });

  // Accesibilidad: la figura universal dentro de su círculo.
  out.access = make((i, t) => {
    const k = i % 5;
    if (k < 2) {
      const a = rand() * Math.PI * 2;
      return [Math.cos(a), Math.sin(a), (rand() - 0.5) * 0.05];
    }
    if (k === 2) {
      const p = fib(i, 0.14);
      return [p[0], p[1] + 0.58, p[2] * 0.3];
    }
    const segs = [[[-0.5, 0.28], [0.5, 0.28]], [[0, 0.32], [0, -0.15]], [[0, -0.15], [-0.32, -0.7]], [[0, -0.15], [0.32, -0.7]]];
    const s2 = segs[Math.floor(rand() * segs.length)];
    const p = along([s2[0][0], s2[0][1], 0], [s2[1][0], s2[1][1], 0], rand());
    return [p[0], p[1], (rand() - 0.5) * 0.06];
  });

  out.octa = make(() => {
    let x = rand() * 2 - 1, y = rand() * 2 - 1, z = rand() * 2 - 1;
    const s = Math.abs(x) + Math.abs(y) + Math.abs(z) || 1;
    return [(x / s) * 1.05, (y / s) * 1.25, (z / s) * 1.05];
  });

  return out;
}

/* --------------------------------------------------------------- shaders */

const POINT_V = /* glsl */ `
attribute float aSeed;
attribute float aBright;
uniform float uSize;
uniform float uPixel;
varying float vSeed;
varying float vBright;
varying float vFront;
void main(){
  vSeed = aSeed;
  vBright = aBright;
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  // Profundidad: lo que está delante es más grande y más luminoso; lo de
  // detrás se apaga. Es lo que hace que una nube de puntos se lea como
  // volumen y no como un disco.
  vFront = clamp((7.4 + mv.z) / 2.4, 0., 1.);
  gl_PointSize = uSize * uPixel * (0.5 + aSeed * 0.8) * mix(0.55, 1.35, vFront) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const POINT_F = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uCore;
uniform vec3 uLight;
uniform vec3 uGlow;
uniform float uTint;
uniform float uFlare;
uniform float uDim;
uniform float uAlpha;
varying float vSeed;
varying float vBright;
varying float vFront;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .0, d) * mix(.22, 1., vFront);
  // Cada partícula tiene su escalón en la rampa; el tinte sube todas hacia
  // la luz y el destello las lleva a blanco un instante.
  float k = clamp(.3 + vSeed * .6 + uTint * .4 + vBright * .5, 0., 1.);
  vec3 col = k < .5 ? mix(uCore, uLight, k * 2.) : mix(uLight, uGlow, (k - .5) * 2.);
  col = mix(col, uGlow, uFlare * .7);
  // Al no saber: hacia el gris de la rampa neutra, menos luz.
  vec3 grey = vec3(dot(col, vec3(.299, .587, .114)));
  col = mix(col, grey * .75, uDim * .7);
  gl_FragColor = vec4(col * a, a * uAlpha);
}`;

const LINE_V = /* glsl */ `
attribute float aAlpha;
varying float vAlpha;
void main(){
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const LINE_F = /* glsl */ `
uniform vec3 uLight;
uniform float uLines;
varying float vAlpha;
void main(){
  float a = vAlpha * uLines;
  gl_FragColor = vec4(uLight * a, a);
}`;

/* ---------------------------------------------------------------- estado */

const STATES = {
  idle: { amp: 0.035, speed: 0.35, spin: 0.12, lines: 1 },
  listening: { amp: 0.05, speed: 1.1, spin: 0.25, lines: 0.4 },
  thinking: { amp: 0.06, speed: 1.6, spin: 0.9, lines: 0.15 },
  speaking: { amp: 0.04, speed: 0.8, spin: 0.2, lines: 0.8 },
};

// Cuánto hilo lleva cada forma: la estructura se ve; la nube no.
const LINE_WEIGHT = {
  sphere: 0.35, cloud: 0, split: 0.15, ring: 0.6, cube: 0.8, grid: 1, helix: 0.9, line: 0.7, torus: 0.5, network: 1, octa: 0.5,
  bars: 0.5, ball: 0.6, globe: 0.8, pencil: 0.5, pin: 0.4, envelope: 0.6, page: 0.7, cap: 0.4, neural: 0.9, stairs: 0.5, stack: 0.6, access: 0.5, spain: 0.6,
};
// Las que tienen cara: se leen de frente y no deben girar.
const FLAT = new Set(['spain', 'envelope', 'page', 'access', 'grid', 'line', 'neural', 'stairs', 'bars', 'pencil']);
// Formas de texto (`text:42`): los renglones del muestreo hacen de hilos.
const TEXT_LINES = 0.45;

const readColor = (el, name, fallback) => {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  try {
    return new Color(v || fallback);
  } catch {
    return new Color(fallback);
  }
};

export function createOrb(canvas, { tokensFrom = canvas, reducedMotion = false, base = '' } = {}) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(0, 0, 6.2);
  const group = new Group();
  scene.add(group);

  const palette = {
    uDeep: { value: readColor(tokensFrom, '--component-laiya-orb-deep', '#080f2f') },
    uCore: { value: readColor(tokensFrom, '--component-laiya-orb-core', '#1e3aff') },
    uLight: { value: readColor(tokensFrom, '--component-laiya-orb-light', '#7187ff') },
    uGlow: { value: readColor(tokensFrom, '--component-laiya-orb-glow', '#ffffff') },
  };

  const SHAPES = shapes();
  const seeds = new Float32Array(N);
  const delay = new Float32Array(N);
  const bright = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    seeds[i] = rand();
    delay[i] = rand() * 0.45;
    bright[i] = rand() < 0.06 ? 1 : 0;
  }

  const pos = new Float32Array(SHAPES.sphere);
  const from = new Float32Array(SHAPES.sphere);
  let to = SHAPES.sphere;

  const geo = new BufferGeometry();
  const posAttr = new BufferAttribute(pos, 3);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  geo.setAttribute('aBright', new BufferAttribute(bright, 1));

  const pointU = {
    uSize: { value: 24 },
    uPixel: { value: dpr },
    uTint: { value: 0 },
    uFlare: { value: 0 },
    uDim: { value: 0 },
    uAlpha: { value: 1 },
    ...palette,
  };
  const points = new Points(
    geo,
    new ShaderMaterial({ vertexShader: POINT_V, fragmentShader: POINT_F, uniforms: pointU, transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  points.frustumCulled = false;
  group.add(points);

  // Hilos: cada partícula con la siguiente en el orden de su forma. Su alfa
  // cae con la distancia, así un hilo solo existe entre vecinos de verdad.
  const SEG = N - 1;
  const linePos = new Float32Array(SEG * 6);
  const lineAlpha = new Float32Array(SEG * 2);
  const lineGeo = new BufferGeometry();
  const linePosAttr = new BufferAttribute(linePos, 3);
  const lineAlphaAttr = new BufferAttribute(lineAlpha, 1);
  lineGeo.setAttribute('position', linePosAttr);
  lineGeo.setAttribute('aAlpha', lineAlphaAttr);
  const lineU = { uLines: { value: 0.35 }, uLight: palette.uLight };
  const lines = new LineSegments(
    lineGeo,
    new ShaderMaterial({ vertexShader: LINE_V, fragmentShader: LINE_F, uniforms: lineU, transparent: true, depthWrite: false, blending: AdditiveBlending }),
  );
  lines.frustumCulled = false;
  group.add(lines);

  /* ------------------------------------------------------------- estado */

  let state = 'idle';
  let target = STATES.idle;
  const cur = { ...STATES.idle };
  let restShape = 'sphere';
  let shapeName = 'sphere';
  let morph = 1;
  let morphDur = 1.1;
  let time = 0;
  let level = 0, levelTarget = 0;
  let tint = 0, tintTarget = 0, flare = 0, dim = 0, bounce = 0;
  let thinkClock = 0;
  const gaze = { x: 0, y: 0, tx: 0, ty: 0 };
  const motion = { vx: 0, vy: 0, x: 0, y: 0 };
  let raf = 0, last = performance.now(), settleUntil = 0, lastActivity = performance.now();
  let visible = true, destroyed = false;

  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Texto hecho de partículas: se dibuja en un lienzo oculto con la letra
  // de display del sitio y se muestrean los píxeles llenos, renglón a
  // renglón —así los hilos entre vecinos son líneas de barrido—.
  const fontFamily = getComputedStyle(tokensFrom).getPropertyValue('--semantic-font-family-display').trim() || 'sans-serif';
  function textShape(str) {
    const c = document.createElement('canvas');
    const W = 360, H = 160;
    c.width = W;
    c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    let size = 130;
    g.font = `800 ${size}px ${fontFamily}`;
    while (g.measureText(str).width > W * 0.92 && size > 20) {
      size -= 6;
      g.font = `800 ${size}px ${fontFamily}`;
    }
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(str, W / 2, H / 2 + size * 0.04);
    const data = g.getImageData(0, 0, W, H).data;
    const filled = [];
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 140) filled.push([x, y]);
    const a = new Float32Array(N * 3);
    if (!filled.length) return SHAPES.sphere;
    // Se escala por la caja real de lo dibujado: «?» y «LAIYA» ocupan lo
    // mismo en pantalla, no lo mismo en el lienzo.
    let minX = W, maxX = 0, minY = H, maxY = 0;
    for (const [x, y] of filled) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const sc = Math.min(2.3 / Math.max(1, maxX - minX), 1.7 / Math.max(1, maxY - minY));
    for (let i = 0; i < N; i++) {
      // Reparto uniforme en orden de lectura, con una pizca de ruido para que
      // no se vea la rejilla del muestreo.
      const p = filled[Math.floor((i / N) * filled.length)];
      a[i * 3] = (p[0] - cx + (rand() - 0.5) * 1.6) * sc;
      a[i * 3 + 1] = -(p[1] - cy + (rand() - 0.5) * 1.6) * sc;
      a[i * 3 + 2] = (i % 2 ? 0.07 : -0.07) + (rand() - 0.5) * 0.03;
    }
    return a;
  }

  // España con la geometría real del IGN (assets/laiya/shapes.json, que
  // genera scripts/build-laiya-shapes.mjs). Se pide al crear el enjambre; si
  // alguien la pide antes de que llegue, se aplica al llegar.
  let pending = null;
  fetch(base + 'assets/laiya/shapes.json')
    .then(r => r.json())
    .then(d => {
      const raw = Uint8Array.from(atob(d.spain), ch => ch.charCodeAt(0));
      const q = new Int16Array(raw.buffer);
      const a = new Float32Array(N * 3);
      for (let i = 0; i < N * 3; i++) a[i] = (q[i % q.length] / d.scale) * 1.15;
      SHAPES.spain = a;
      if (pending === 'spain') api.shape('spain');
    })
    .catch(() => {});

  function resolve(name) {
    if (SHAPES[name]) return true;
    if (name.startsWith('text:')) {
      SHAPES[name] = textShape(name.slice(5));
      return true;
    }
    return false;
  }

  function goTo(name, dur = 1.1) {
    if (!resolve(name) || name === shapeName) return;
    from.set(pos); // desde donde esté, aunque sea a mitad de otro cambio
    to = SHAPES[name];
    shapeName = name;
    morph = 0;
    morphDur = reducedMotion ? 0.001 : dur;
  }

  function frame(now) {
    raf = 0;
    if (destroyed) return;
    // El sello de rAF es el inicio del fotograma y puede ser ANTERIOR al
    // `performance.now()` con el que `kick` arrancó el bucle: un dt negativo
    // hace que k salga negativo y los lerp se disparen —amplitud, giro, hilos—
    // hasta sacar las partículas del lienzo durante un par de segundos.
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    const k = 1 - Math.pow(0.002, dt);

    for (const key of Object.keys(cur)) cur[key] = lerp(cur[key], target[key], k);
    level = lerp(level, levelTarget, 1 - Math.pow(0.0001, dt));
    if (state !== 'speaking') levelTarget = lerp(levelTarget, 0, k);
    tint = lerp(tint, tintTarget, 1 - Math.pow(0.02, dt));
    flare = Math.max(0, flare - dt * 2.2);
    dim = lerp(dim, 0, dt * 0.45);
    bounce = lerp(bounce, 0, dt * 3);
    motion.x = lerp(motion.x, motion.vx, 1 - Math.pow(0.0005, dt));
    motion.y = lerp(motion.y, motion.vy, 1 - Math.pow(0.0005, dt));
    motion.vx *= Math.pow(0.02, dt);
    motion.vy *= Math.pow(0.02, dt);
    time += dt * cur.speed;

    // Pensar: nube, división en tres, nube… hasta que el estado cambie.
    if (state === 'thinking' && !reducedMotion) {
      thinkClock += dt;
      if (thinkClock > 0.85) {
        thinkClock = 0;
        goTo(shapeName === 'split' ? 'cloud' : 'split', 0.8);
      }
    }

    if (morph < 1) morph = Math.min(1, morph + dt / morphDur);

    // Partículas: cada una con su propio retardo dentro del cambio, más un
    // temblor de ruido barato y, al hablar, una onda que recorre el cuerpo.
    const amp = cur.amp + level * 0.05;
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      const d = delay[i];
      const t = ease(Math.max(0, Math.min(1, (morph - d) / (1 - d))));
      const s = seeds[i] * 40;
      let x = from[j] + (to[j] - from[j]) * t;
      let y = from[j + 1] + (to[j + 1] - from[j + 1]) * t;
      let z = from[j + 2] + (to[j + 2] - from[j + 2]) * t;
      // A mitad de viaje las partículas se abren un poco: se reorganizan,
      // no se deslizan.
      const mid = Math.sin(t * Math.PI) * 0.18;
      const wob = amp + mid * 0.6;
      x += Math.sin(time * 2.1 + s) * wob;
      y += Math.cos(time * 1.7 + s * 1.3) * wob;
      z += Math.sin(time * 1.3 + s * 0.7) * wob;
      if (level > 0.01) {
        const w = 1 + level * 0.1 * Math.sin(time * 10 + y * 5);
        x *= w;
        y *= w;
        z *= w;
      }
      pos[j] = x;
      pos[j + 1] = y;
      pos[j + 2] = z;
    }
    posAttr.needsUpdate = true;

    const weight = shapeName.startsWith('text:') ? TEXT_LINES : LINE_WEIGHT[shapeName] || 0;
    const wantLines = weight * cur.lines * (morph < 1 ? morph * morph : 1);
    lineU.uLines.value = lerp(lineU.uLines.value, wantLines, k);
    if (lineU.uLines.value > 0.01) {
      for (let i = 0; i < SEG; i++) {
        const a = i * 3, b = (i + 1) * 3, o = i * 6;
        linePos[o] = pos[a]; linePos[o + 1] = pos[a + 1]; linePos[o + 2] = pos[a + 2];
        linePos[o + 3] = pos[b]; linePos[o + 4] = pos[b + 1]; linePos[o + 5] = pos[b + 2];
        const dx = pos[a] - pos[b], dy = pos[a + 1] - pos[b + 1], dz = pos[a + 2] - pos[b + 2];
        const al = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy + dz * dz) / 0.2) * 0.55;
        lineAlpha[i * 2] = lineAlpha[i * 2 + 1] = al;
      }
      linePosAttr.needsUpdate = true;
      lineAlphaAttr.needsUpdate = true;
    }

    pointU.uTint.value = tint;
    pointU.uFlare.value = flare;
    pointU.uDim.value = dim;

    // Cuerpo: escala con el latido, estiramiento en la dirección del vuelo.
    const speed = Math.hypot(motion.x, motion.y);
    // Las formas que se leen —texto, España, el sobre…— apenas se deforman
    // ni se inclinan: un «86 %» torcido ya no dice nada.
    const flat = FLAT.has(shapeName) || shapeName.startsWith('text:');
    const stretch = reducedMotion ? 0 : Math.min(speed / 2400, flat ? 0.08 : 0.28);
    const sc = (1 + Math.sin(bounce * Math.PI) * 0.12 + level * 0.05) * (1 - dim * 0.12) * (state === 'listening' ? 1.08 : 1);
    group.scale.set(sc * (1 + stretch), sc * (1 - stretch * 0.5), sc);
    group.rotation.z = stretch > 0.01 && !flat ? Math.atan2(-motion.y, motion.x) : lerp(group.rotation.z, flat ? 0 : -gaze.x * 0.2, k);
    // Las formas planas —texto, España, el sobre, la hoja— no giran: se
    // balancean de cara, o se leerían de canto. Las de volumen sí giran.
    if (flat) {
      const r = points.rotation.y % (Math.PI * 2);
      const home = Math.abs(r) > Math.PI ? r - Math.sign(r) * Math.PI * 2 : r;
      points.rotation.y = lerp(home, Math.sin(time * 0.7) * 0.18, k * 0.6);
    } else {
      points.rotation.y += dt * (cur.spin + stretch * 3);
    }
    lines.rotation.y = points.rotation.y;
    gaze.x = lerp(gaze.x, gaze.tx, k * 0.5);
    gaze.y = lerp(gaze.y, gaze.ty, k * 0.5);
    points.rotation.x = lines.rotation.x = lerp(points.rotation.x, -gaze.y * (flat ? 0.12 : 0.5) + (shapeName === 'grid' ? 0.2 : 0), k);

    renderer.render(scene, camera);

    if (!visible) return;
    const resting = state === 'idle' && morph >= 1 && level < 0.01 && speed < 4 && now - lastActivity > 5000;
    if ((!reducedMotion && !resting) || now < settleUntil) raf = requestAnimationFrame(frame);
  }

  const kick = (ms = 900) => {
    settleUntil = performance.now() + ms;
    lastActivity = performance.now();
    if (!raf && visible) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // El tamaño de las partículas sigue al del lienzo: el enjambre se ve
    // igual de denso grande o pequeño.
    pointU.uSize.value = 24 * (h / 220);
    renderer.render(scene, camera);
    kick(200);
  }

  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas);
  const onVisibility = () => {
    visible = !document.hidden;
    if (visible) kick();
  };
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  kick(1600);

  const api = {
    setState(next) {
      if (!STATES[next] || next === state) return;
      state = next;
      target = STATES[next];
      thinkClock = 0;
      if (next === 'thinking') goTo('cloud', 0.7);
      else if (next === 'listening') goTo('ring', 0.8);
      else goTo(restShape, 1.1);
      kick(1600);
    },
    // La forma con la que se queda al terminar de pensar o de hablar.
    shape(name) {
      if (!resolve(name)) {
        pending = name;
        return;
      }
      pending = null;
      restShape = name;
      if (state !== 'thinking' && state !== 'listening') goTo(name, 1.2);
      kick(1600);
    },
    setMood(mood) {
      if (mood === 'happy') {
        tintTarget = 0.6;
        flare = 1;
        bounce = 1;
        setTimeout(() => (tintTarget = 0.2), 1400);
      } else if (mood === 'curious') {
        tintTarget = 0.35;
      } else if (mood === 'sorry') {
        dim = 1;
        tintTarget = 0;
      }
      kick(1800);
    },
    pulse(v = 0.8) {
      levelTarget = Math.max(levelTarget, Math.min(1, v));
      kick(600);
    },
    look(x, y) {
      gaze.tx = Math.max(-1, Math.min(1, x));
      gaze.ty = Math.max(-1, Math.min(1, y));
      if (!reducedMotion) kick(400);
    },
    velocity(vx, vy) {
      motion.vx = vx;
      motion.vy = vy;
      kick(500);
    },
    tint(v) {
      tintTarget = Math.max(0, Math.min(1, v));
      kick(1200);
    },
    flash() {
      if (!reducedMotion) flare = 1;
      kick(900);
    },
    // Explosión: todas las partículas salen hacia fuera y vuelven a su forma.
    burst() {
      if (reducedMotion) return;
      for (let i = 0; i < N * 3; i++) pos[i] *= 2.4;
      from.set(pos);
      morph = 0;
      morphDur = 1.2;
      flare = 1;
      kick(1600);
    },
    resize,
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      ro && ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.dispose();
    },
  };
  return api;
}
