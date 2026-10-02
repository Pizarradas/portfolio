/* LAI-YA — el orbe.
 *
 * Módulo ES que se carga solo cuando alguien abre la capa: la home no paga
 * Three.js por un botón. Importa un build recortado de Three
 * (`js/vendor/three.laiya.min.js`, ver `npm run vendor:three`) con lo justo
 * para una esfera de shader, un halo y una órbita de partículas.
 *
 * El orbe no decora: dice en qué estado está la conversación.
 *
 *   idle       respira despacio y sigue el puntero con la mirada
 *   listening  se abre y se acerca — el micro está encendido
 *   thinking   se comprime, gira, y la órbita de partículas se enciende
 *   speaking   vibra con la voz (o con el ritmo del texto si la voz está apagada)
 *
 * Y tres humores que tiñen un instante: happy (un salto, más luz), curious
 * (inclina la mirada hacia el puntero) y sorry (se apaga un punto y se encoge).
 *
 * Los colores no están aquí: los lee de los tokens `--component-laiya-orb-*`
 * del elemento, así que el orbe sigue a la paleta del sistema.
 *
 * Con `prefers-reduced-motion` no hay bucle continuo: se pinta solo mientras
 * dura una transición de estado y se para.
 */
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  IcosahedronGeometry,
  PlaneGeometry,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Mesh,
  Points,
  Color,
  AdditiveBlending,
  ColorManagement,
} from './vendor/three.laiya.min.js';

// Los shaders del orbe escriben el color tal cual, sin pasar por la gestión
// de color de Three: los tokens ya están en sRGB y así se ven como en el CSS.
// Sin esto, Three los convierte a lineal al leerlos y el azul de marca sale
// casi negro.
ColorManagement.enabled = false;

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const ORB_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uLevel;
varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;
${NOISE}
void main(){
  vec3 n = normalize(normal);
  float d = snoise(n * uFreq + vec3(0., uTime * .45, uTime * .2)) * uAmp;
  d += snoise(n * uFreq * 2.3 - vec3(uTime * .7)) * uAmp * .45;
  // La voz: ondas finas que recorren la superficie de polo a polo.
  d += uLevel * .07 * sin(uTime * 9. + n.y * 7. + n.x * 3.);
  vec3 p = position + n * d;
  vDisp = d;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vView = -mv.xyz;
  // Normal aproximada desplazada: barata y suficiente para el fresnel.
  vNormal = normalize(normalMatrix * (n + n * d * 1.6));
  gl_Position = projectionMatrix * mv;
}`;

const ORB_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uHeat;
uniform float uDim;
uniform vec3 uDeep;
uniform vec3 uCore;
uniform vec3 uLight;
uniform vec3 uGlow;
varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;
void main(){
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  float facing = max(dot(n, v), 0.);
  float fres = pow(1. - facing, 2.4);
  // Volumen: más profundo abajo, más núcleo arriba — la luz viene de arriba.
  float body = smoothstep(-.9, .8, n.y + vDisp * 3.);
  vec3 col = mix(uDeep, uCore, body);
  // Bandas iridiscentes dentro de la misma rampa de azules: sin cian, sin
  // violeta, sin salir de la paleta (BRAND.md §4).
  float band = .5 + .5 * sin(vDisp * 26. + n.x * 3.2 - n.z * 2. + uTime * .6);
  col = mix(col, uLight, band * (.22 + uHeat * .3) * facing);
  col += uGlow * fres * (.85 + uHeat * .35);
  col += uGlow * pow(facing, 18.) * .18;
  col *= 1. - uDim * .35;
  gl_FragColor = vec4(col, 1.);
}`;

const HALO_VERTEX = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uCore;
uniform float uStrength;
varying vec2 vUv;
void main(){
  float r = length(vUv - .5) * 2.;
  float a = smoothstep(1., .32, r) * uStrength;
  gl_FragColor = vec4(uCore * a, a);
}`;

const DOTS_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uSize;
attribute float aSeed;
varying float vAlpha;
void main(){
  vec3 p = position;
  float a = uTime * (.6 + aSeed * .8) + aSeed * 6.2831;
  float r = 1.42 + sin(aSeed * 40. + uTime) * .06;
  p = vec3(cos(a) * r, sin(a * .5 + aSeed * 3.) * .35, sin(a) * r);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vAlpha = .35 + .65 * fract(aSeed * 13.7);
  gl_PointSize = uSize * (1. + aSeed) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const DOTS_FRAGMENT = /* glsl */ `
uniform vec3 uGlow;
uniform float uOpacity;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .0, d) * vAlpha * uOpacity;
  gl_FragColor = vec4(uGlow * a, a);
}`;

// Cada estado es un destino; el orbe llega a él interpolando, nunca salta.
const STATES = {
  idle: { amp: 0.09, freq: 1.15, speed: 0.32, dots: 0.12, scale: 1, spin: 0.05 },
  listening: { amp: 0.2, freq: 1.7, speed: 0.95, dots: 0.35, scale: 1.07, spin: 0.12 },
  thinking: { amp: 0.15, freq: 2.5, speed: 1.6, dots: 1, scale: 0.95, spin: 0.9 },
  speaking: { amp: 0.11, freq: 1.4, speed: 0.75, dots: 0.4, scale: 1.02, spin: 0.15 },
};

const readColor = (el, name, fallback) => {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  try {
    return new Color(v || fallback);
  } catch {
    return new Color(fallback);
  }
};

export function createOrb(canvas, { tokensFrom = canvas, reducedMotion = false } = {}) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 20);
  camera.position.set(0, 0, 5.4);

  const palette = {
    uDeep: { value: readColor(tokensFrom, '--component-laiya-orb-deep', '#080f2f') },
    uCore: { value: readColor(tokensFrom, '--component-laiya-orb-core', '#1e3aff') },
    uLight: { value: readColor(tokensFrom, '--component-laiya-orb-light', '#7187ff') },
    uGlow: { value: readColor(tokensFrom, '--component-laiya-orb-glow', '#ffffff') },
  };

  const orbUniforms = {
    uTime: { value: 0 },
    uAmp: { value: STATES.idle.amp },
    uFreq: { value: STATES.idle.freq },
    uLevel: { value: 0 },
    uHeat: { value: 0 },
    uDim: { value: 0 },
    ...palette,
  };
  const orb = new Mesh(
    new IcosahedronGeometry(1, 40),
    new ShaderMaterial({ vertexShader: ORB_VERTEX, fragmentShader: ORB_FRAGMENT, uniforms: orbUniforms }),
  );
  scene.add(orb);

  const haloUniforms = { uCore: palette.uLight, uStrength: { value: 0.35 } };
  const halo = new Mesh(
    new PlaneGeometry(3.1, 3.1),
    new ShaderMaterial({
      vertexShader: HALO_VERTEX,
      fragmentShader: HALO_FRAGMENT,
      uniforms: haloUniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  halo.position.z = -1.2;
  scene.add(halo);

  const COUNT = 160;
  const dotsGeo = new BufferGeometry();
  const seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) seeds[i] = Math.random();
  dotsGeo.setAttribute('position', new BufferAttribute(new Float32Array(COUNT * 3), 3));
  dotsGeo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  const dotsUniforms = { uTime: { value: 0 }, uSize: { value: 26 }, uOpacity: { value: 0 }, uGlow: palette.uGlow };
  const dots = new Points(
    dotsGeo,
    new ShaderMaterial({
      vertexShader: DOTS_VERTEX,
      fragmentShader: DOTS_FRAGMENT,
      uniforms: dotsUniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  dots.frustumCulled = false;
  scene.add(dots);

  /* ------------------------------------------------------------- estado */

  let state = 'idle';
  let target = STATES.idle;
  const cur = { ...STATES.idle };
  let time = Math.random() * 10;
  let level = 0;
  let levelTarget = 0;
  let heat = 0;
  let dim = 0;
  let bounce = 0;
  let blink = 0;
  let nextBlink = performance.now() + 3000 + Math.random() * 4000;
  const gaze = { x: 0, y: 0, tx: 0, ty: 0, weight: 0.35 };
  let raf = 0;
  let last = performance.now();
  let settleUntil = 0;
  let visible = true;
  let destroyed = false;

  const lerp = (a, b, t) => a + (b - a) * t;

  function frame(now) {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const k = 1 - Math.pow(0.0015, dt);

    for (const key of Object.keys(cur)) cur[key] = lerp(cur[key], target[key], k);
    level = lerp(level, levelTarget, 1 - Math.pow(0.0001, dt));
    if (state !== 'speaking') levelTarget = lerp(levelTarget, 0, k);
    heat = lerp(heat, 0, dt * 0.6);
    dim = lerp(dim, 0, dt * 0.5);
    bounce = lerp(bounce, 0, dt * 3.2);

    time += dt * cur.speed;

    if (!reducedMotion && now > nextBlink) {
      blink = 1;
      nextBlink = now + 3500 + Math.random() * 5500;
    }
    blink = Math.max(0, blink - dt * 7);
    const squash = Math.sin(blink * Math.PI) * 0.09;

    gaze.x = lerp(gaze.x, gaze.tx * gaze.weight, k * 0.6);
    gaze.y = lerp(gaze.y, gaze.ty * gaze.weight, k * 0.6);

    orbUniforms.uTime.value = time;
    orbUniforms.uAmp.value = cur.amp;
    orbUniforms.uFreq.value = cur.freq;
    orbUniforms.uLevel.value = level;
    orbUniforms.uHeat.value = heat;
    orbUniforms.uDim.value = dim;
    dotsUniforms.uTime.value = time;
    dotsUniforms.uOpacity.value = cur.dots;
    haloUniforms.uStrength.value = 0.3 + level * 0.25 + heat * 0.2 + (state === 'listening' ? 0.12 : 0) - dim * 0.15;

    const s = cur.scale * (1 + Math.sin(bounce * Math.PI) * 0.08 + level * 0.04) * (1 - dim * 0.06);
    orb.scale.set(s * (1 + squash * 0.5), s * (1 - squash), s);
    orb.rotation.y += dt * cur.spin;
    orb.rotation.x = lerp(orb.rotation.x, -gaze.y * 0.5, k);
    orb.rotation.z = lerp(orb.rotation.z, -gaze.x * 0.25, k);
    orb.position.x = gaze.x * 0.12;
    orb.position.y = gaze.y * 0.1 + Math.sin(time * 1.3) * 0.02;
    dots.rotation.x = 0.35 + gaze.y * 0.2;
    dots.rotation.z = gaze.x * 0.2;

    renderer.render(scene, camera);

    if (!visible) return;
    if (!reducedMotion || now < settleUntil) raf = requestAnimationFrame(frame);
  }

  const kick = (ms = 900) => {
    settleUntil = performance.now() + ms;
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
    // setSize vacía el lienzo: se repinta ya, sin esperar al siguiente frame,
    // o durante la transición de tamaño se ve un fotograma en blanco.
    renderer.render(scene, camera);
    kick(200);
  }

  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas);
  const io =
    'IntersectionObserver' in window
      ? new IntersectionObserver(([e]) => {
          visible = e.isIntersecting && !document.hidden;
          if (visible) kick();
        })
      : null;
  if (io) io.observe(canvas);
  const onVisibility = () => {
    visible = !document.hidden;
    if (visible) kick();
  };
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  kick(1200);

  return {
    setState(next) {
      if (!STATES[next] || next === state) return;
      state = next;
      target = STATES[next];
      gaze.weight = next === 'thinking' ? 0.1 : 0.35;
      kick(1400);
    },
    setMood(mood) {
      if (mood === 'happy') {
        heat = 1;
        bounce = 1;
      } else if (mood === 'curious') {
        heat = 0.5;
        gaze.weight = 0.7;
        setTimeout(() => (gaze.weight = 0.35), 1800);
      } else if (mood === 'sorry') {
        dim = 1;
      }
      kick(1800);
    },
    // 0–1. La voz real (boundary de speechSynthesis) o el ritmo del texto.
    pulse(v = 0.8) {
      levelTarget = Math.max(levelTarget, Math.min(1, v));
      kick(600);
    },
    look(x, y) {
      gaze.tx = Math.max(-1, Math.min(1, x));
      gaze.ty = Math.max(-1, Math.min(1, y));
      if (!reducedMotion) kick(400);
    },
    resize,
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      ro && ro.disconnect();
      io && io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.dispose();
    },
  };
}
