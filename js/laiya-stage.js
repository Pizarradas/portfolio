/* LAIYA — el escenario.
 *
 * LAIYA ya no habla desde una ventana aparte: actúa sobre la página. Este
 * fichero es el director de escena. Recibe una respuesta del motor y la
 * convierte en una secuencia sobre el sitio real:
 *
 *   viajar    el orbe vuela hasta el elemento del que habla mientras la
 *             página se desplaza hasta él
 *   encuadrar la cámara se acerca (dolly sobre <main>) y lo centra en la
 *             zona libre de la pantalla
 *   aislar    todo lo demás se oscurece; el elemento queda en un hueco de
 *             luz con su filete y una pasada de escáner
 *   contar    el subtítulo aparece junto al orbe, palabra a palabra
 *   recorrer  si hay varios elementos —los casos, las etapas—, la cámara y el
 *             hueco pasan de uno a otro; el orbe los sigue
 *
 * La coreografía sale de la base de motion de SYX (mind-system/knowledges/
 * motion): un protagonista por compás, anclas relativas con solape del 30–60 %,
 * salidas al 80 % de la entrada, la luz se mueve con Expo out y cambia de
 * color en lineal, la posición del orbe con un muelle interrumpible, y el
 * subtítulo se sostiene max(1500, 1000 + palabras × 500) ms.
 *
 * Con `prefers-reduced-motion` no hay vuelo, ni zoom, ni desplazamiento
 * animado: el orbe se queda en su sitio, la página salta y el aislamiento
 * entra con un fundido (07-accesibilidad, sustitución «replace»).
 *
 * Expone `window.LaiyaStage.create(options)`.
 */
(function () {
  'use strict';

  const CANCEL = Symbol('laiya-cancel');

  /* ---------------------------------------------------- curvas y muelles */

  // cubic-bezier → función de easing que acepta GSAP. Newton con respaldo de
  // bisección: el mismo algoritmo que usan los navegadores.
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t;
    const sy = t => ((ay * t + by) * t + cy) * t;
    const dx = t => (3 * ax * t + 2 * bx) * t + cx;
    const solve = x => {
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(t) - x;
        if (Math.abs(e) < 1e-6) return t;
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      let lo = 0, hi = 1;
      t = x;
      while (lo < hi) {
        const v = sx(t);
        if (Math.abs(v - x) < 1e-6) return t;
        if (x > v) lo = t;
        else hi = t;
        t = (hi + lo) / 2;
        if (hi - lo < 1e-7) break;
      }
      return t;
    };
    return p => (p <= 0 ? 0 : p >= 1 ? 1 : sy(solve(p)));
  }

  // Muelle amortiguado con física de verdad (04-teoria/springs.md):
  // k = (2π / d)², ζ = 1 − bounce, c = 4πζ / d, masa 1. Interrumpible: cambiar
  // el destino a mitad conserva la velocidad, que es lo que hace que el orbe
  // parezca decidir en vez de recalcular.
  function createSpring(initial) {
    const pos = { ...initial };
    const vel = Object.fromEntries(Object.keys(initial).map(k => [k, 0]));
    const to = { ...initial };
    let k = 1, c = 1;
    return {
      pos,
      vel,
      to,
      params({ duration, bounce }) {
        const z = bounce >= 0 ? 1 - bounce : 1 / (1 + bounce);
        k = Math.pow((2 * Math.PI) / duration, 2);
        c = (4 * Math.PI * z) / duration;
      },
      set(next) {
        Object.assign(to, next);
      },
      jump(next) {
        Object.assign(to, next);
        Object.assign(pos, next);
        for (const key in vel) vel[key] = 0;
      },
      step(dt) {
        let rest = true;
        let left = Math.min(dt, 1 / 30);
        while (left > 0) {
          const h = Math.min(1 / 240, left);
          for (const key in pos) {
            const a = -k * (pos[key] - to[key]) - c * vel[key];
            vel[key] += a * h;
            pos[key] += vel[key] * h;
          }
          left -= h;
        }
        for (const key in pos) {
          const eps = key === 's' ? 0.001 : 0.25;
          if (Math.abs(pos[key] - to[key]) > eps || Math.abs(vel[key]) > eps * 10) rest = false;
        }
        return rest;
      },
    };
  }

  /* ------------------------------------------------------------- tokens */

  // Los tiempos y las curvas viven en SCSS (tokens/components/_laiya.scss);
  // aquí solo se leen. Una sola fuente, como pide 06-sistema/mapeo.
  function readMotion(el) {
    const cs = getComputedStyle(el);
    const raw = n => cs.getPropertyValue(n).trim();
    const sec = n => {
      const v = raw(n);
      return v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v) || 0.4;
    };
    const ease = (n, fb) => {
      const m = raw(n).match(/cubic-bezier\(([^)]+)\)/);
      const p = (m ? m[1] : fb).split(',').map(Number);
      return bezier(p[0], p[1], p[2], p[3]);
    };
    const spring = (n, fb) => {
      const [d, b] = (raw(n) || fb).split(/\s+/).map(parseFloat);
      return { duration: (d || 600) / 1000, bounce: b || 0 };
    };
    return {
      fast: sec('--component-laiya-dur-fast'),
      moderate: sec('--component-laiya-dur-moderate'),
      slow: sec('--component-laiya-dur-slow'),
      slower: sec('--component-laiya-dur-slower'),
      long: sec('--component-laiya-dur-long'),
      enter: ease('--component-laiya-ease-enter', '0,0,0.3,1'),
      exit: ease('--component-laiya-ease-exit', '0.4,0.14,1,1'),
      standard: ease('--component-laiya-ease-standard', '0.4,0.14,0.3,1'),
      emphasized: ease('--component-laiya-ease-emphasized', '0.05,0.7,0.1,1'),
      emphasizedExit: ease('--component-laiya-ease-emphasized-exit', '0.3,0,0.8,0.15'),
      light: ease('--component-laiya-ease-light', '0.16,1,0.3,1'),
      flight: spring('--component-laiya-spring-flight', '600 0.1'),
      hop: spring('--component-laiya-spring-hop', '450 0.25'),
    };
  }

  /* ------------------------------------------------------------ escenario */

  function create(opt) {
    const { gsap, reduced, file, ui, renderBlocks, onGoto, onState, announce, onStep, onInterrupt } = opt;
    const root = document.documentElement;
    const main = document.querySelector('main') || document.body;
    const dock = opt.dock;
    const isReduced = () => reduced.matches;

    /* --------------------------------------------------------- marcado */

    // Desde cadenas con `class="…"`: así `check-css` ve las clases en uso.
    const make = html => {
      const t = document.createElement('template');
      t.innerHTML = html.trim();
      return t.content.firstElementChild;
    };

    const hole = make('<div class="org-laiya-spot" aria-hidden="true" hidden><span class="org-laiya-spot__scan"></span></div>');
    // La lente: cuatro paneles alrededor del hueco que desenfocan y
    // desaturan lo que hay detrás. Todo lo que no es el elemento pierde color
    // y nitidez; el elemento queda intacto, con su contraste original.
    const lens = make('<div class="org-laiya-lens" aria-hidden="true" hidden><i></i><i></i><i></i><i></i></div>');
    const panes = [...lens.children];
    // El velo: cuando LAIYA ocupa el centro sin señalar nada, la página se
    // retira un paso hacia atrás.
    const veil = make('<div class="org-laiya-veil" aria-hidden="true" hidden></div>');
    const body = make('<div class="atom-laiya-body" aria-hidden="true"><span class="atom-laiya-orb"></span><canvas></canvas></div>');
    const caption = make(`<div class="mol-laiya-caption" hidden>
<p class="mol-laiya-caption__text" aria-hidden="true"></p>
<div class="mol-laiya-caption__blocks"></div>
<div class="mol-laiya-caption__foot">
  <p class="mol-laiya-caption__count"></p>
  <button type="button" class="atom-laiya-chip" data-laiya="pause" aria-pressed="false">${ui.pause}</button>
  <button type="button" class="atom-laiya-chip" data-laiya="next">${ui.next}</button>
</div>
</div>`);
    const portal = make('<div class="org-laiya-portal" aria-hidden="true" hidden></div>');

    document.body.append(veil, lens, hole, body, caption, portal);

    const el = {
      text: caption.querySelector('.mol-laiya-caption__text'),
      blocks: caption.querySelector('.mol-laiya-caption__blocks'),
      foot: caption.querySelector('.mol-laiya-caption__foot'),
      count: caption.querySelector('.mol-laiya-caption__count'),
      pause: caption.querySelector('[data-laiya="pause"]'),
      next: caption.querySelector('[data-laiya="next"]'),
    };

    const M = readMotion(caption);
    const fx = window.LaiyaFx.create({ gsap, motion: M });
    let fxUndo = [];
    function undoFx(instant = false) {
      // En orden inverso: lo último que se aplicó es lo primero que se quita.
      while (fxUndo.length) {
        try {
          fxUndo.pop()(instant);
        } catch {}
      }
    }

    /* ------------------------------------------------- medidas y muelle */

    const vw = () => root.clientWidth;
    const vh = () => window.innerHeight;
    const rem = () => parseFloat(getComputedStyle(root).fontSize) || 16;
    const header = () => {
      const h = document.querySelector('.org-site-header');
      return h ? h.getBoundingClientRect().bottom : 0;
    };
    const wide = () => vw() >= 1002;
    const gap = () => rem() * 1.272; // E(1)
    // Lo que se ve del orbe es el 62 % del lienzo (1/φ): el resto es halo.
    const bodySize = () => body.offsetWidth || 120;
    const orbVisible = () => bodySize() * 0.62;

    const orbSpring = createSpring({ x: vw() / 2, y: vh() - 40, s: 0.3 });
    let orb = null; // el avatar de Three.js, cuando haya cargado
    let raf = 0;
    let last = 0;
    let lastPos = { x: 0, y: 0 };

    // Arcos (principio 7): nada vivo vuela en línea recta. El muelle lleva
    // la posición en recta y aquí se le suma una comba perpendicular que
    // crece y se deshace con el avance —sin(π·p)—, hacia arriba, como un
    // salto. Lo pintado es lo que cuenta para la velocidad del enjambre, así
    // que el estiramiento sigue la curva.
    let flight = null;
    // Si un vuelo empieza a mitad de otro, la comba que llevaba no
    // desaparece de golpe: se deshace en 350 ms.
    let residual = null;
    const painted = { x: 0, y: 0 };
    function arcOffset() {
      let rx = 0, ry = 0;
      if (residual) {
        const f = 1 - (performance.now() - residual.t0) / 350;
        if (f <= 0) residual = null;
        else {
          const e = f * f * (3 - 2 * f);
          rx = residual.x * e;
          ry = residual.y * e;
        }
      }
      if (!flight) return { x: rx, y: ry };
      const p = orbSpring.pos;
      const left = Math.hypot(flight.ex - p.x, flight.ey - p.y);
      const t = Math.max(0, Math.min(1, 1 - left / flight.len));
      const lift = Math.sin(Math.PI * t) * flight.bow;
      return { x: flight.nx * lift + rx, y: flight.ny * lift + ry };
    }

    function paintBody() {
      const p = orbSpring.pos;
      const half = bodySize() / 2;
      const a = arcOffset();
      painted.x = p.x + a.x;
      painted.y = p.y + a.y;
      body.style.transform = `translate3d(${painted.x - half}px, ${painted.y - half}px, 0) scale(${p.s})`;
    }

    // Squash al aterrizar (principio 1): cuando un vuelo rápido se detiene,
    // el golpe se lee en el aplastado del cuerpo.
    let topSpeed = 0;
    function loop(now) {
      raf = 0;
      const dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      const rest = orbSpring.step(dt);
      paintBody();
      if (orb && dt > 0) {
        const vx = (painted.x - lastPos.x) / dt, vy = (painted.y - lastPos.y) / dt;
        orb.velocity(vx, vy);
        const sp = Math.hypot(vx, vy);
        topSpeed = Math.max(topSpeed, sp);
        if (topSpeed > 500 && sp < 60) {
          orb.land && orb.land(Math.min(1, topSpeed / 2600));
          topSpeed = 0;
          flight = null;
        }
      }
      lastPos = { x: painted.x, y: painted.y };
      if (!rest || residual) raf = requestAnimationFrame(loop);
      else {
        last = 0;
        flight = null;
        topSpeed = 0;
      }
    }

    // Anticipación (principio 3): antes de un vuelo largo se echa hacia
    // atrás —un palmo, 130 ms— y solo entonces sale. Lo corto sale directo.
    let launch = null;
    function fly(to, spring = M.flight) {
      orbSpring.params(spring);
      if (launch) launch.kill(), (launch = null);
      if (isReduced()) {
        flight = residual = null;
        orbSpring.jump(to);
        paintBody();
        return;
      }
      const was = arcOffset();
      if (Math.abs(was.x) + Math.abs(was.y) > 0.5) residual = { x: was.x, y: was.y, t0: performance.now() };
      const from = orbSpring.pos;
      const dx = to.x - from.x, dy = to.y - from.y;
      const len = Math.hypot(dx, dy);
      if (len > 60) {
        // Normal hacia arriba (y negativa en pantalla); en un vuelo vertical,
        // hacia el lado de fuera de la pantalla más cercano al centro.
        let nx = -dy / len, ny = dx / len;
        if (ny > 0 || (Math.abs(ny) < 0.2 && nx * (from.x - vw() / 2) < 0)) (nx = -nx), (ny = -ny);
        flight = { ex: to.x, ey: to.y, len, nx, ny, bow: Math.min(110, len * 0.16) };
      } else flight = null;
      const go = () => {
        launch = null;
        orbSpring.set(to);
        if (!raf) raf = requestAnimationFrame(loop);
      };
      if (len > 180 && orb && orb.anticipate) {
        orb.anticipate(dx, dy, 130);
        orbSpring.set({ x: from.x - (dx / len) * 14, y: from.y - (dy / len) * 14 });
        if (!raf) raf = requestAnimationFrame(loop);
        launch = gsap.delayedCall(0.13, go);
      } else go();
      paintBody();
    }

    // Donde descansa: sobre la ranura del orbe en la barra de abajo.
    function restPoint() {
      const slot = dock.querySelector('.org-laiya-dock__slot');
      const r = slot.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width / orbVisible() };
    }

    // Posado en la esquina del subtítulo acoplado: habla desde ahí.
    function perchPoint() {
      if (caption.hidden) return hoverPoint();
      const r = caption.getBoundingClientRect();
      const s = wide() ? 0.4 : 0.3;
      const ov = orbVisible() * s;
      return { x: Math.max(ov / 2 + 4, r.left + ov * 0.2), y: r.top - ov * 0.15, s };
    }

    // El centro: donde está LAIYA cuando está activa y no señala nada. Un
    // poco por encima de la mitad, para dejar sitio al subtítulo debajo.
    function centerPoint() {
      if (isReduced()) return restPoint();
      return { x: vw() / 2, y: Math.max(header() + bodySize() * 0.6, vh() * 0.38), s: wide() ? 1.35 : 0.9 };
    }

    // Cuando el visitante retoma la página: se aparta a la esquina, pequeña,
    // sin irse a la barra.
    function floatPoint() {
      if (isReduced()) return restPoint();
      const r = dock.getBoundingClientRect();
      const s = 0.42;
      return { x: vw() - gap() - (orbVisible() * s) / 2, y: r.top - gap() - (orbVisible() * s) / 2, s };
    }

    // Donde espera cuando habla sin señalar nada: encima de la barra.
    function hoverPoint() {
      const r = dock.getBoundingClientRect();
      const s = wide() ? 0.5 : 0.4;
      return { x: r.left + r.width / 2, y: r.top - gap() - (orbVisible() * s) / 2, s };
    }

    /* ----------------------------------------------- cámara y encuadre */

    const cam = { s: 1, tx: 0, ty: 0 };
    let camOn = false;

    function paintCam() {
      if (cam.s === 1 && cam.tx === 0 && cam.ty === 0) {
        main.style.transform = '';
        main.style.transformOrigin = '';
        return;
      }
      main.style.transformOrigin = '0 0';
      main.style.transform = `translate3d(${cam.tx}px, ${cam.ty}px, 0) scale(${cam.s})`;
    }

    const spot = { x: 0, y: 0, w: 0, h: 0, o: 0 };
    function paintSpot() {
      hole.style.transform = `translate3d(${spot.x}px, ${spot.y}px, 0)`;
      hole.style.width = `${spot.w}px`;
      hole.style.height = `${spot.h}px`;
      hole.style.opacity = spot.o;
      hole.hidden = spot.o <= 0.001;
      const W = vw(), H = vh(), x = spot.x, y = spot.y, w = spot.w, h = spot.h;
      const box = (el, l, t, ww, hh) => {
        el.style.transform = `translate3d(${l}px, ${t}px, 0)`;
        el.style.width = `${Math.max(0, ww)}px`;
        el.style.height = `${Math.max(0, hh)}px`;
      };
      box(panes[0], 0, 0, W, y);
      box(panes[1], 0, y + h, W, H - y - h);
      box(panes[2], 0, y, x, h);
      box(panes[3], x + w, y, W - x - w, h);
      lens.style.opacity = spot.o;
      lens.hidden = hole.hidden;
    }

    const veilState = { o: 0 };
    function setVeil(on) {
      gsap.killTweensOf(veilState);
      veil.hidden = false;
      gsap.to(veilState, {
        o: on ? 1 : 0,
        duration: isReduced() ? M.moderate : M.slower,
        ease: 'none',
        onUpdate: () => (veil.style.opacity = veilState.o),
        onComplete: () => (veil.hidden = !on),
      });
    }

    // El rectángulo de un elemento SIN la cámara aplicada, en coordenadas de
    // pantalla. La cámara transforma <main> con origen 0 0, así que se
    // invierte: posición relativa a <main> dividida por la escala, más el
    // origen de <main> sin la traslación. Vale a mitad de un movimiento de
    // cámara, porque `cam` es siempre lo que está pintado.
    function baseRect(node) {
      const r = node.getBoundingClientRect();
      const m = main.getBoundingClientRect();
      const m0 = { x: m.left - cam.tx, y: m.top - cam.ty };
      return {
        x: m0.x + (r.left - m.left) / cam.s,
        y: m0.y + (r.top - m.top) / cam.s,
        w: r.width / cam.s,
        h: r.height / cam.s,
      };
    }

    // El mejor marco para un id: la sección entera si cabe; si no, el mayor
    // antecesor del encabezado que quepa. Así nunca se aísla media sección.
    function frameFor(target) {
      const node = typeof target === 'string' ? document.getElementById(target) : target;
      if (!node) return null;
      const room = (vh() - header()) * 0.72;
      const section = node.closest('section, article, nav') || node;
      if (section.getBoundingClientRect().height <= room) return section;
      let best = node;
      let cur = node.parentElement;
      while (cur && section.contains(cur) && cur !== section) {
        if (cur.getBoundingClientRect().height <= room) best = cur;
        else break;
        cur = cur.parentElement;
      }
      return best;
    }

    // La geometría completa de un compás: hacia dónde se desplaza la página,
    // cuánto se acerca la cámara, dónde queda el hueco, el orbe y el texto.
    function layout(node, captionBox) {
      const W = vw(), H = vh(), G = gap(), top = header() + G;
      const dockTop = dock.getBoundingClientRect().top;
      const r0 = baseRect(node);
      // Con movimiento reducido no hay columna ni vuelo: el texto se acopla
      // abajo y el orbe se queda en su ranura (07-accesibilidad: el
      // movimiento se limita al elemento enfocado, nada en la periferia).
      const columnar = wide() && !isReduced();

      let zone, side = 'right';
      const capW = captionBox.w;
      if (columnar) {
        // Columna para el texto en el lado con más aire.
        side = r0.x + r0.w / 2 > W / 2 + W * 0.08 ? 'left' : 'right';
        const col = capW + G * 2;
        zone = side === 'right' ? { x: G, y: top, w: W - col - G, h: dockTop - top - G } : { x: col, y: top, w: W - col - G, h: dockTop - top - G };
      } else {
        zone = { x: G * 0.75, y: top, w: W - G * 1.5, h: dockTop - captionBox.h - G * 2 - top };
      }

      // La cámara acerca lo pequeño y aleja lo grande: un marco más ancho que
      // la zona libre se reduce hasta caber entero (dolly out) en vez de
      // salirse por un lado. Con un suelo: por debajo de 0,6 ya no se lee.
      const maxScale = wide() ? 1.32 : 1.14;
      const fit = Math.min((zone.w * 0.94) / r0.w, (zone.h * 0.9) / r0.h);
      let s = Math.max(0.6, Math.min(fit, maxScale));
      if (isReduced()) s = 1;

      // Desplazamiento de página: el centro del marco al centro de la zona.
      const docY = window.scrollY + r0.y;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - H);
      const wantCenterY = zone.y + zone.h / 2;
      let scrollTo = docY + r0.h / 2 - wantCenterY;
      if (r0.h * s > zone.h) scrollTo = docY - zone.y; // más alto que la zona: arriba
      scrollTo = Math.max(0, Math.min(maxScroll, scrollTo));
      const dy = window.scrollY - scrollTo;

      // Rect tras el desplazamiento, sin cámara.
      const r1 = { x: r0.x, y: r0.y + dy, w: r0.w, h: r0.h };
      const mr = main.getBoundingClientRect();
      const m0 = { x: mr.left - cam.tx, y: mr.top - cam.ty + dy };

      // Cámara: escala con origen en la esquina de <main> y traslación que
      // lleva el centro del marco al centro de la zona.
      const dest = { x: zone.x + zone.w / 2, y: r1.h * s > zone.h ? zone.y + (r1.h * s) / 2 : wantCenterY };
      // Traslación que lleva el centro del marco al centro de la zona.
      let tx = dest.x - m0.x - s * (r1.x + r1.w / 2 - m0.x);
      let ty = dest.y - m0.y - s * (r1.y + r1.h / 2 - m0.y);
      if (isReduced()) tx = ty = 0;

      const pad = G * 0.6;
      const R = {
        x: m0.x + tx + s * (r1.x - m0.x) - pad,
        y: m0.y + ty + s * (r1.y - m0.y) - pad,
        w: r1.w * s + pad * 2,
        h: r1.h * s + pad * 2,
      };
      // El hueco nunca sale de la pantalla: un marco más alto que la zona se
      // recorta por abajo.
      R.y = Math.max(header() + pad * 0.5, R.y);
      R.h = Math.min(R.h, dockTop - G * 0.5 - R.y);

      // Orbe y texto. Junto a un elemento el enjambre se encoge: el
      // protagonista es lo que señala, no él. Pero no tanto que su forma
      // —el año, la @, el pin— deje de leerse: 1/φ en escritorio.
      const near = wide() ? 0.618 : 0.46;
      // Las formas temáticas (texto, pin, escalera) se salen del disco de
      // 1/φ que mide `orbVisible`: se reserva un cuarto más para que no
      // pisen el hueco.
      const ov = orbVisible() * near * 1.25;
      let orbAt, capAt;
      if (columnar) {
        const colX = side === 'right' ? Math.min(R.x + R.w + G, W - capW - G) : Math.max(G, R.x - G - capW);
        orbAt = { x: side === 'right' ? colX + ov / 2 : colX + capW - ov / 2, y: Math.max(top + ov / 2, R.y + ov / 2), s: near };
        capAt = { x: colX, y: orbAt.y + ov / 2 + G * 0.5 };
        capAt.y = Math.max(top, Math.min(capAt.y, dockTop - captionBox.h - G));
        // Un subtítulo largo sube para no meterse tras la barra; el orbe sube
        // con él y, si arriba no cabe entero, se encoge: nunca tapa el texto.
        const room = capAt.y - G * 0.5 - top;
        if (room < ov) {
          const k = Math.max(0.45, room / ov);
          orbAt.s = near * k;
          orbAt.y = top + (ov * k) / 2;
        } else orbAt.y = Math.min(orbAt.y, capAt.y - G * 0.5 - ov / 2);
      } else {
        // Sin columna (móvil): el orbe busca aire fuera del hueco —entre el
        // hueco y el subtítulo acoplado, o encima— y solo si no lo hay se
        // posa en su esquina.
        const capTop = dockTop - captionBox.h - G;
        const below = capTop - (R.y + R.h);
        const above = R.y - top;
        const x = Math.min(W - ov / 2 - G * 0.5, Math.max(ov / 2 + G * 0.5, R.x + R.w - ov / 2));
        if (below >= ov * 0.9) orbAt = { x, y: R.y + R.h + below / 2, s: near };
        else if (above >= ov * 0.9) orbAt = { x, y: R.y - above / 2, s: near };
        else orbAt = { x: Math.min(W - ov / 2 - G * 0.5, R.x + R.w - ov / 3), y: Math.max(top + ov / 2, R.y), s: near };
        capAt = null; // acoplado sobre la barra
      }
      if (isReduced()) orbAt = restPoint();

      return { scrollTo, cam: isReduced() ? { s: 1, tx: 0, ty: 0 } : { s, tx, ty }, spot: R, orb: orbAt, caption: capAt, side };
    }

    /* ----------------------------------------------------------- tiempo */

    let runId = 0;
    let paused = false;
    let skip = null;
    const live = new Set();

    function guard(id) {
      if (id !== runId) throw CANCEL;
    }

    function wait(ms, id, { pausable = false } = {}) {
      return new Promise((resolve, reject) => {
        let left = ms;
        let t0 = performance.now();
        const tick = () => {
          if (id !== runId) return reject(CANCEL);
          const now = performance.now();
          // Con la pestaña oculta el reloj no corre: rAF está parado y las
          // animaciones también, así que el guion espera a que vuelvan.
          if (!document.hidden && !(pausable && paused)) left -= now - t0;
          t0 = now;
          if (left <= 0) {
            if (pausable) skip = null;
            return resolve();
          }
          timer = setTimeout(tick, Math.min(left, 120));
        };
        let timer = setTimeout(tick, Math.min(ms, 120));
        if (pausable)
          skip = () => {
            clearTimeout(timer);
            skip = null;
            resolve();
          };
      });
    }

    function tween(target, vars) {
      const { onDone, ...rest } = vars;
      const t = gsap.to(target, rest);
      live.add(t);
      t.eventCallback('onComplete', () => {
        live.delete(t);
        onDone && onDone();
      });
      return t;
    }

    function killAll() {
      live.forEach(t => t.kill());
      live.clear();
    }

    // Duración según distancia (04-teoria/timing.md): base × √(d / ref),
    // acotada entre los escalones slow y long.
    const travelTime = px => Math.min(M.long, Math.max(M.slow, M.slow * Math.sqrt(Math.abs(px) / 320)));

    /* -------------------------------------------------------- subtítulo */

    function holdFor(text, extra = 0) {
      // 05-tipografia: max(1500, 1000 + palabras × 500, caracteres / 12 × 1000)
      const words = (text.match(/\S+/g) || []).length;
      return Math.max(1500, 1000 + words * 500, (text.length / 12) * 1000) + extra;
    }

    function fillCaption(step, index, total) {
      el.text.textContent = '';
      el.blocks.innerHTML = step.blocks && step.blocks.length ? renderBlocks(step.blocks) : '';
      el.count.textContent = total > 1 ? `${index + 1} / ${total}` : '';
      el.foot.hidden = total <= 1;
      // En el último paso no hay siguiente.
      el.next.hidden = index >= total - 1;
      caption.dataset.docked = wide() && !isReduced() && step.node ? 'false' : 'true';
    }

    function measureCaption(step, index, total) {
      fillCaption(step, index, total);
      if (caption.dataset.docked === 'true') placeCaption(null);
      el.text.textContent = step.text;
      const prevHidden = caption.hidden;
      caption.hidden = false;
      caption.style.visibility = 'hidden';
      const r = caption.getBoundingClientRect();
      caption.style.visibility = '';
      caption.hidden = prevHidden;
      el.text.textContent = '';
      return { w: r.width, h: r.height };
    }

    function placeCaption(at) {
      if (at) {
        caption.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`;
        caption.dataset.docked = 'false';
      } else {
        // Acoplado: justo encima de la barra, sugerencias incluidas.
        caption.style.transform = '';
        caption.style.setProperty('--laiya-dock-clear', `${vh() - dock.getBoundingClientRect().top + gap() * 0.6}px`);
        caption.dataset.docked = 'true';
      }
    }

    let textSince = 0;
    // Lo que se está diciendo ahora, para que un aparte espere a que acabe.
    let speaking = Promise.resolve();
    function speak(text, id) {
      const p = say(text, id);
      speaking = p.catch(() => {});
      return p;
    }
    async function say(text, id) {
      textSince = performance.now();
      announce(text);
      onState('speaking');
      if (isReduced()) {
        el.text.textContent = text;
        await wait(120, id);
        onState('idle');
        return;
      }
      const words = text.split(/(\s+)/);
      for (const w of words) {
        guard(id);
        el.text.textContent += w;
        if (w.trim()) {
          orb && orb.pulse(0.45 + Math.random() * 0.4);
          await wait(30 + Math.random() * 26, id);
        }
      }
      onState('idle');
    }

    async function showCaption(id) {
      caption.hidden = false;
      gsap.killTweensOf(caption);
      if (isReduced()) {
        gsap.set(caption, { autoAlpha: 1 });
        return;
      }
      gsap.set(caption, { autoAlpha: 0 });
      tween(caption, { autoAlpha: 1, duration: M.slow, ease: M.enter });
      el.text.animate?.([{ transform: `translateY(${gap() * 0.3}px)` }, { transform: 'none' }], { duration: M.slow * 1000, easing: 'cubic-bezier(0,0,.3,1)' });
      guard(id);
    }

    function hideCaption(quick = false) {
      gsap.killTweensOf(caption);
      if (caption.hidden) return;
      if (isReduced() || quick) {
        caption.hidden = true;
        return;
      }
      tween(caption, { autoAlpha: 0, duration: M.moderate * 0.8, ease: M.exit, onDone: () => (caption.hidden = true) });
    }

    /* ---------------------------------------------------------- compases */

    function setScroll(y) {
      const html = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, y);
      root.style.scrollBehavior = html;
    }

    // Ajuste fino: lo que se calculó antes de mover nada puede no coincidir
    // con dónde ha quedado el elemento —una sección fijada con
    // ScrollTrigger, un sticky, una imagen que cargó tarde, una pestaña que
    // estuvo oculta—. Se mide de verdad y el hueco se corrige sobre la marcha.
    let current = null;
    let plan = null;
    function refit(node, want) {
      if (!node || !node.isConnected) return;
      const real = node.getBoundingClientRect();
      const pad = gap() * 0.6;
      const box = { x: real.left - pad, y: real.top - pad, w: real.width + pad * 2, h: real.height + pad * 2 };
      // Si el elemento no ha quedado donde se planeó —una tarjeta que aún
      // volvía de su sitio al medir, un ScrollTrigger—, se corrige la CÁMARA
      // y no solo el hueco: el subtítulo y el orbe ya están colocados para
      // ese sitio. En vertical solo si el plan no se recortó (marco alto).
      if (want && camOn && !isReduced()) {
        const dx = want.x - box.x;
        const dy = Math.abs(want.h - box.h) < 4 ? want.y - box.y : 0;
        if (Math.abs(dx) + Math.abs(dy) > 8) {
          tween(cam, { tx: cam.tx + dx, ty: cam.ty + dy, duration: M.slow, ease: M.standard, onUpdate: paintCam });
          box.x += dx;
          box.y += dy;
        }
      }
      const top = Math.max(header() + pad * 0.5, box.y);
      const fix = { x: box.x, y: top, w: box.w, h: Math.min(box.h - (top - box.y), dock.getBoundingClientRect().top - gap() * 0.5 - top) };
      if (Math.abs(fix.x - spot.x) + Math.abs(fix.y - spot.y) + Math.abs(fix.w - spot.w) + Math.abs(fix.h - spot.h) > 6) {
        tween(spot, { ...fix, duration: isReduced() ? 0 : M.slow, ease: M.standard, onUpdate: paintSpot });
      }
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && root.classList.contains('syx-laiya-staging')) requestAnimationFrame(() => refit(current, plan));
    });

    async function beat(step, i, total, id) {
      const box = measureCaption(step, i, total);
      if (!step.node) {
        // Sin elemento en esta página: LAIYA ocupa el centro, la página se
        // retira detrás del velo y el texto aparece debajo.
        releaseCamera(true);
        setVeil(true);
        undoFx();
        if (step.shape && orb) orb.shape(step.shape);
        // Si sube desde la barra, el texto espera a que haya pasado: si no,
        // el enjambre cruza por encima de la frase mientras se escribe.
        const fromBelow = orbSpring.pos.y > vh() * 0.62 && !isReduced();
        fly(centerPoint(), M.hop);
        placeCaption(null);
        if (fromBelow) await wait(M.slower * 650, id);
        await showCaption(id);
        if (step.fx && step.fx.includes('tremble') && !isReduced()) fxUndo.push(fx.tremble(el.text));
        orb && orb.tint(0.25);
        if (step.special === 'gravity') return gravityBeat(step, id);
        await speak(step.text, id);
        return;
      }

      // Lo que el compás anterior le hizo a la página se deshace ANTES de
      // medir, y de golpe: un titular partido en palabras o una tarjeta a
      // medio volver a su sitio miden distinto que el original.
      undoFx(true);
      const L = layout(step.node, box);
      const firstSpot = spot.o < 0.05;
      const travel = travelTime(window.scrollY - L.scrollTo + (L.orb.y - orbSpring.pos.y));
      root.classList.add('syx-laiya-staging');

      // Compás 1 — viaje. Protagonista: el orbe. La página se desplaza con él.
      const moving = [];
      undoFx();
      setVeil(false);
      onState('thinking');
      orb && orb.tint(0.75);
      if (step.shape && orb) orb.shape(step.shape);
      hideCaption();
      fly(L.orb, M.flight);

      if (isReduced()) {
        setScroll(L.scrollTo);
      } else {
        const proxy = { y: window.scrollY };
        moving.push(tween(proxy, { y: L.scrollTo, duration: travel, ease: M.standard, onUpdate: () => setScroll(proxy.y) }));
      }

      // Compás 2 — encuadre y aislamiento, anclado al 40 % del viaje.
      await wait(isReduced() ? 0 : travel * 400, id);
      camOn = true;
      if (isReduced()) {
        Object.assign(cam, L.cam);
        paintCam();
        Object.assign(spot, { x: L.spot.x, y: L.spot.y, w: L.spot.w, h: L.spot.h });
        paintSpot();
        tween(spot, { o: 1, duration: M.moderate, ease: 'none', onUpdate: paintSpot });
      } else {
        moving.push(tween(cam, { ...L.cam, duration: Math.max(M.slower, travel), ease: M.emphasized, onUpdate: paintCam }));
        if (firstSpot) {
          // Entra desde un poco más grande y se cierra sobre el marco
          // (shared axis Z: lo que llega viene de delante).
          const grow = gap();
          Object.assign(spot, { x: L.spot.x - grow, y: L.spot.y - grow, w: L.spot.w + grow * 2, h: L.spot.h + grow * 2 });
          paintSpot();
          tween(spot, { o: 1, duration: M.slower, ease: 'none', onUpdate: paintSpot });
        }
        tween(spot, { x: L.spot.x, y: L.spot.y, w: L.spot.w, h: L.spot.h, duration: Math.max(M.slower, travel), ease: M.emphasized, onUpdate: paintSpot });
      }
      root.dataset.laiyaSide = L.side;

      await wait(isReduced() ? 60 : Math.max(M.slower, travel) * 1000 * 0.7, id);
      // El ajuste se mide con la cámara y el scroll ya quietos: medir a mitad
      // de movimiento corregiría hacia un sitio que todavía va a cambiar.
      await Promise.all(moving.map(t => new Promise(r => (t.isActive() ? t.eventCallback('onInterrupt', r).then(r) : r()))));
      guard(id);

      // Ajuste fino sobre la posición real (ver `refit`).
      current = step.node;
      plan = L.spot;
      refit(step.node, plan);

      // Compás 3 — llegada: destello breve, pasada de escáner y texto. El
      // tinte se queda alto: sobre el velo navy, el azul de núcleo no se ve.
      orb && orb.tint(0.65);
      orb && orb.flash();
      // Una cifra hecha de partículas es para enseñarla con orgullo: quieta,
      // nítida y brillante.
      if (orb && /^text:.*\d/.test(step.shape || '')) orb.setMood('proud');
      if (!isReduced()) {
        hole.classList.remove('is-scanning');
        void hole.offsetWidth;
        hole.classList.add('is-scanning');
      }
      if (!isReduced()) {
        fxUndo.push(fx.ripple(orbSpring.to.x, orbSpring.to.y));
        for (const name of step.fx || []) if (fx[name] && name !== 'tremble') fxUndo.push(fx[name](step.node));
      }
      placeCaption(L.caption);
      await showCaption(id);
      await speak(step.text, id);
    }

    // La página se viene abajo, LAIYA lo cuenta y la vuelve a montar.
    async function gravityBeat(step, id) {
      if (isReduced()) {
        await speak(step.text, id);
        if (step.after) await speak(' ' + step.after, id);
        return;
      }
      setVeil(false);
      fly(floatPoint(), M.flight);
      orb && orb.burst();
      orb && orb.setMood('mischief', 30000);
      const rebuild = fx.gravity();
      await speak(step.text, id);
      // Tiempo para jugar con los escombros: 5 s como mínimo y, mientras el
      // visitante los coja y los lance, 3 s más desde el último toque, hasta
      // un máximo de 20 s.
      const t0 = performance.now();
      while (performance.now() - t0 < 20000) {
        const until = Math.max(t0 + 5000, (rebuild.touched || 0) + 3000);
        if (performance.now() >= until) break;
        await wait(250, id);
      }
      onState('thinking');
      await rebuild();
      orb && orb.setMood('happy');
      if (step.after) {
        el.text.textContent = '';
        await speak(step.after, id);
      }
      fly(centerPoint(), M.hop);
    }

    // La escena en curso y el paso en el que está: la guía pregunta por
    // ellos para contestar sobre lo que se ve, y para ir atrás o repetir.
    let scene0 = null;
    let at = -1;
    let beating = Promise.resolve();
    async function play(scene, { from = 0 } = {}) {
      const id = ++runId;
      scene0 = scene;
      orb && orb.stay && orb.stay(true);
      paused = false;
      syncPause();
      killAll();
      root.classList.add('syx-laiya-active');
      try {
        const steps = scene.steps;
        for (let i = Math.max(0, Math.min(from, steps.length - 1)); i < steps.length; i++) {
          guard(id);
          at = i;
          onStep && onStep(steps[i], i, steps.length);
          const b = beat(steps[i], i, steps.length, id);
          beating = b.catch(() => {});
          await b;
          if (orb && scene.mood && i === 0) orb.setMood(scene.mood);
          const more = i < steps.length - 1;
          const extra = steps[i].blocks && steps[i].blocks.length ? 2500 : 0;
          // El tiempo de lectura cuenta desde que el texto empieza a aparecer:
          // mientras se escribe ya se está leyendo.
          if (more) await wait(Math.max(600, holdFor(steps[i].text, extra) - (performance.now() - textSince)), id, { pausable: true });
        }
        el.foot.hidden = true;
      } catch (e) {
        if (e !== CANCEL) throw e;
      } finally {
        // Terminado (y no sustituido por otra escena): ya puede dormirse.
        if (id === runId && orb && orb.stay) orb.stay(false);
      }
    }

    /* ---------------------------------------------------------- apartes */

    // Un aparte: LAIYA contesta sobre lo que está señalando sin moverse. El
    // recorrido se queda en pausa (Siguiente lo reanuda) y el subtítulo
    // cambia de contenido en su sitio; si crece, sube lo justo para no
    // meterse detrás de la barra.
    async function aside({ text, blocks = [], node = null }) {
      const id = runId;
      paused = true;
      syncPause();
      await beating;
      await speaking;
      if (id !== runId) return;
      // Si lo que se cita está en otro sitio —más abajo en una sección alta,
      // u otra sección del caso—, la cámara va allí sin salir del recorrido:
      // el paso sigue siendo el mismo y «Siguiente» continúa desde él.
      if (node && scene0) {
        const total = scene0.steps.length;
        const prev = scene0.steps[at] || {};
        const b = beat({ node, text, blocks, shape: prev.shape, fx: ['marks'], anchor: prev.anchor }, Math.max(0, at), total, id);
        beating = b.catch(() => {});
        try {
          await b;
        } catch (e) {
          if (e !== CANCEL) throw e;
        }
        return;
      }
      el.blocks.innerHTML = blocks.length ? renderBlocks(blocks) : '';
      el.text.textContent = '';
      caption.hidden = false;
      gsap.killTweensOf(caption);
      gsap.set(caption, { autoAlpha: 1 });
      if (caption.dataset.docked === 'false') {
        const r = caption.getBoundingClientRect();
        const max = dock.getBoundingClientRect().top - gap() - r.height;
        if (r.top > max) caption.style.transform = `translate3d(${r.left}px, ${Math.max(header() + gap(), max)}px, 0)`;
      }
      orb && orb.flash();
      try {
        await speak(text, id);
      } catch (e) {
        if (e !== CANCEL) throw e;
      }
    }

    const here = () => {
      if (!scene0 || at < 0 || !root.classList.contains('syx-laiya-staging')) return null;
      const step = scene0.steps[at];
      return step ? { step, index: at, total: scene0.steps.length, anchor: step.anchor || null, steps: scene0.steps } : null;
    };
    const jump = i => scene0 && play(scene0, { from: i });
    function next() {
      if (skip) {
        paused = false;
        syncPause();
        return skip();
      }
      if (scene0 && at < scene0.steps.length - 1) jump(at + 1);
    }

    /* ------------------------------------------------------ liberación */

    function releaseCamera(keepCaption = false) {
      current = plan = null;
      killAll();
      undoFx();
      root.classList.remove('syx-laiya-staging');
      delete root.dataset.laiyaSide;
      hole.classList.remove('is-scanning');
      const done = () => {
        camOn = false;
        cam.s = 1;
        cam.tx = cam.ty = 0;
        paintCam();
      };
      if (isReduced()) {
        done();
        spot.o = 0;
        paintSpot();
      } else {
        // Salida al ~80 % de la entrada, con curva de salida.
        if (camOn) tween(cam, { s: 1, tx: 0, ty: 0, duration: M.slower * 0.8, ease: M.emphasizedExit, onUpdate: paintCam, onDone: done });
        else done();
        tween(spot, { o: 0, duration: M.slow, ease: 'none', onUpdate: paintSpot });
      }
      if (!keepCaption) hideCaption();
    }

    // Lo que hace el visitante manda: rueda, gesto o teclas de desplazamiento
    // cortan la escena en el acto y devuelven la página (nunca se anima
    // contra un scroll del usuario — 02-proposito).
    function interrupt() {
      if (!root.classList.contains('syx-laiya-staging')) return;
      runId++;
      skip = null;
      releaseCamera(true);
      el.foot.hidden = true;
      onState('idle');
      // El texto se queda, acoplado sobre la barra, para no perder la frase.
      if (!caption.hidden) placeCaption(null);
      setVeil(false);
      requestAnimationFrame(() => fly(floatPoint(), M.flight));
      // El recorrido no se olvida: la escena y el paso se quedan para que
      // «sigue» lo retome donde estaba.
      if (scene0 && scene0.steps.length > 1) onInterrupt && onInterrupt(at, scene0.steps.length);
    }
    const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
    window.addEventListener('wheel', interrupt, { passive: true });
    // En un móvil, un roce no es un scroll: solo corta un arrastre de verdad
    // (un dedo que se mueve más de 24 px), y nunca sobre la barra o el texto.
    let touchY = null;
    window.addEventListener('touchstart', e => (touchY = e.touches[0] ? e.touches[0].clientY : null), { passive: true });
    window.addEventListener(
      'touchmove',
      e => {
        if (dock.contains(e.target) || caption.contains(e.target)) return;
        const y = e.touches[0] ? e.touches[0].clientY : null;
        if (touchY == null || y == null || Math.abs(y - touchY) > 24) interrupt();
      },
      { passive: true },
    );
    window.addEventListener('keydown', e => {
      if (NAV_KEYS.has(e.key) && !(e.target.closest && e.target.closest('input, textarea'))) interrupt();
    });
    // Redimensionar no corta el recorrido: cuando la ventana se queda
    // quieta, el paso actual se vuelve a encuadrar con las medidas nuevas.
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      if (root.classList.contains('syx-laiya-staging') && scene0) {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => root.classList.contains('syx-laiya-staging') && jump(at), 260);
      } else if (!root.classList.contains('syx-laiya-active')) fly(restPoint());
      else fly(centerPoint());
    });

    /* -------------------------------------------------- pausa y salto */

    function syncPause() {
      el.pause.setAttribute('aria-pressed', String(paused));
      el.pause.textContent = paused ? ui.resume : ui.pause;
    }
    caption.addEventListener('click', e => {
      const t = e.target.closest('[data-laiya], [data-goto]');
      if (!t) return;
      if (t.dataset.goto) {
        e.preventDefault();
        const [f, hash] = t.dataset.goto.split('#');
        return onGoto(f, hash || null);
      }
      if (t.dataset.laiya === 'pause') {
        paused = !paused;
        syncPause();
      } else if (t.dataset.laiya === 'next' && skip) skip();
    });

    /* ---------------------------------------------------------- portal */

    // Ir a otra página: el orbe se abre hasta cubrir la pantalla, se navega,
    // y en la página nueva se cierra de vuelta al orbe (container transform).
    function portalOut(href) {
      const p = orbSpring.pos;
      const radius = Math.hypot(Math.max(p.x, vw() - p.x), Math.max(p.y, vh() - p.y));
      portal.style.setProperty('--laiya-portal-x', `${p.x}px`);
      portal.style.setProperty('--laiya-portal-y', `${p.y}px`);
      portal.hidden = false;
      try {
        sessionStorage.setItem('laiya:portal', JSON.stringify({ x: p.x / vw(), y: p.y / vh() }));
      } catch {}
      if (isReduced()) {
        gsap.fromTo(portal, { autoAlpha: 0, '--laiya-portal-r': `${radius}px` }, { autoAlpha: 1, duration: M.moderate, ease: 'none', onComplete: () => (location.href = href) });
        return;
      }
      orb && orb.tint(1);
      gsap.fromTo(portal, { autoAlpha: 1, '--laiya-portal-r': '0px' }, { '--laiya-portal-r': `${radius}px`, duration: M.slow * 1.25, ease: M.emphasizedExit, onComplete: () => (location.href = href) });
    }

    function portalIn() {
      let from = null;
      try {
        from = JSON.parse(sessionStorage.getItem('laiya:portal'));
        sessionStorage.removeItem('laiya:portal');
      } catch {}
      if (!from) return Promise.resolve();
      const x = from.x * vw(), y = from.y * vh();
      const radius = Math.hypot(Math.max(x, vw() - x), Math.max(y, vh() - y));
      const to = restPoint();
      portal.style.setProperty('--laiya-portal-x', `${to.x}px`);
      portal.style.setProperty('--laiya-portal-y', `${to.y}px`);
      portal.hidden = false;
      return new Promise(resolve => {
        if (isReduced()) {
          gsap.fromTo(portal, { autoAlpha: 1, '--laiya-portal-r': `${radius}px` }, { autoAlpha: 0, duration: M.moderate, ease: 'none', onComplete: () => ((portal.hidden = true), resolve()) });
          return;
        }
        gsap.fromTo(portal, { autoAlpha: 1, '--laiya-portal-r': `${radius * 1.05}px` }, { '--laiya-portal-r': '0px', duration: M.slower, ease: M.emphasized, onComplete: () => ((portal.hidden = true), resolve()) });
      });
    }

    /* --------------------------------------------------------- arranque */

    fly(restPoint());
    orbSpring.jump(restPoint());
    paintBody();
    paintSpot();

    return {
      body,
      canvas: body.querySelector('canvas'),
      frameFor,
      play,
      attachOrb(o) {
        orb = o;
      },
      // Despierta: sale de la ranura y se queda flotando sobre la barra.
      wake() {
        setVeil(true);
        fly(centerPoint(), M.hop);
        orb && orb.flash();
      },
      sleep() {
        runId++;
        skip = null;
        releaseCamera();
        setVeil(false);
        root.classList.remove('syx-laiya-active');
        orb && orb.shape('sphere');
        fly(restPoint(), M.flight);
      },
      settle() {
        if (!root.classList.contains('syx-laiya-staging')) fly(root.classList.contains('syx-laiya-active') ? centerPoint() : restPoint());
      },
      interrupt,
      busy: () => root.classList.contains('syx-laiya-staging'),
      current: here,
      aside,
      next,
      // Saltar a un paso de la escena en curso (la guía, cuando la pregunta
      // nombra otro paso del recorrido).
      jumpTo: i => scene0 && i >= 0 && i < scene0.steps.length && jump(i),
      back: () => scene0 && jump(Math.max(0, at - 1)),
      again: () => scene0 && jump(at),
      // Lo que se recuerda del último recorrido aunque una interrupción lo
      // haya cortado: para retomarlo con «sigue».
      last: () => (scene0 && scene0.steps.length > 1 && at >= 0 ? { index: at, total: scene0.steps.length, anchor: (scene0.steps[at] || {}).anchor || null } : null),
      resume: () => scene0 && jump(at),
      pause() {
        paused = true;
        syncPause();
      },
      thinking() {
        onState('thinking');
        orb && orb.tint(0);
      },
      portalOut,
      portalIn,
      motion: M,
    };
  }

  window.LaiyaStage = { create };
})();
