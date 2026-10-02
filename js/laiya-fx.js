/* LAIYA — efectos sobre la página.
 *
 * El zoom era uno. Este fichero es el repertorio con el que LAIYA transforma
 * el sitio mientras habla. Cada efecto recibe un nodo real de la página, lo
 * transforma con transform, opacity, clip-path o una clase, y devuelve la
 * función que lo deshace: la página siempre vuelve exactamente a como estaba.
 *
 *   kinetic    el titular se rompe en palabras que suben desde una máscara
 *   marks      cada cifra del bloque se subraya con un barrido de luz
 *   scatter    los vecinos del elemento salen despedidos y lo dejan solo
 *   blueprint  rayos X: la retícula y las cajas del bloque, al descubierto
 *   tilt       el elemento aislado se inclina en 3D siguiendo el puntero
 *   ripple     una onda que sale del orbe al llegar
 *   tremble    un temblor corto — cuando no sabe algo
 *   gravity    la página se viene abajo… y LAIYA la vuelve a montar
 *
 * Nada de esto corre con `prefers-reduced-motion`: el escenario no los pide.
 *
 * Expone `window.LaiyaFx.create({ gsap, motion })`.
 */
(function () {
  'use strict';

  function create({ gsap, motion: M }) {
    const rnd = (a, b) => a + Math.random() * (b - a);

    // Guarda el estilo en línea que se va a tocar y lo devuelve tal cual.
    const remember = (nodes, props) => {
      const saved = nodes.map(n => props.map(p => n.style.getPropertyValue(p)));
      return () =>
        nodes.forEach((n, i) =>
          props.forEach((p, k) => {
            if (saved[i][k]) n.style.setProperty(p, saved[i][k]);
            else n.style.removeProperty(p);
          }),
        );
    };

    // Volver de golpe de verdad: si el CSS del elemento tiene `transition`
    // (las tarjetas llevan `transition: all`), quitar el transform lo anima de
    // vuelta y el escenario mide la tarjeta todavía desplazada. Se apaga la
    // transición, se limpia, se fuerza el estilo y solo entonces se restaura.
    const snapBack = (nodes, clear, back) => {
      nodes.forEach(n => n.style.setProperty('transition', 'none'));
      gsap.set(nodes, { clearProps: clear });
      nodes.forEach(n => void n.offsetWidth);
      back();
    };

    const inView = el => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0;
    };

    /* ----------------------------------------------------------- kinetic */

    // Tipografía cinética con máscara (05-tipografia, patrón mask-reveal):
    // cada palabra sube desde detrás de su línea, en cascada de 40 ms.
    function kinetic(node) {
      const h = node.matches('h1, h2, h3') ? node : node.querySelector('h1, h2, h3');
      if (!h || h.dataset.laiyaKinetic) return () => {};
      const html = h.innerHTML;
      h.dataset.laiyaKinetic = 'true';
      h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
      // Se parten solo los nodos de texto: los <br>, los <span> de marca y
      // cualquier otro elemento del titular siguen donde estaban, así el
      // titular mide y corta igual que el original.
      const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      for (const t of texts) {
        const frag = document.createDocumentFragment();
        t.data.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(part);
          const outer = document.createElement('span');
          outer.classList.add('syx-laiya-word');
          outer.setAttribute('aria-hidden', 'true');
          const inner = document.createElement('span');
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
        });
        t.replaceWith(frag);
      }
      const inner = [...h.querySelectorAll('.syx-laiya-word > span')];
      const each = Math.min(0.04, 0.6 / Math.max(1, inner.length - 1));
      const tw = gsap.fromTo(inner, { yPercent: 110, rotate: 4 }, { yPercent: 0, rotate: 0, duration: M.slower, ease: M.emphasized, stagger: each });
      return () => {
        tw.kill();
        h.innerHTML = html;
        h.removeAttribute('aria-label');
        delete h.dataset.laiyaKinetic;
      };
    }

    /* ------------------------------------------------------------- marks */

    // Las cifras son la marca («afirmación + número», BRAND.md §3): LAIYA
    // las señala una a una con un barrido, sin tocar el texto que las rodea.
    const NUM = /(\d+(?:[.,]\d+)?\s?%|\b\d{2,}(?:[.,]\d+)?\b)/g;
    const HAS_NUM = /\d+(?:[.,]\d+)?\s?%|\b\d{2,}/;
    function marks(node) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode: t => (t.parentElement.closest('script, style, svg, .syx-laiya-mark') || !HAS_NUM.test(t.data) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      const texts = [];
      while (walker.nextNode() && texts.length < 14) texts.push(walker.currentNode);
      const made = [];
      texts.forEach(t => {
        NUM.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0;
        t.data.replace(NUM, (m, _g, at) => {
          frag.append(t.data.slice(last, at));
          const mk = document.createElement('mark');
          mk.classList.add('syx-laiya-mark');
          mk.textContent = m;
          frag.append(mk);
          made.push(mk);
          last = at + m.length;
          return m;
        });
        frag.append(t.data.slice(last));
        const holder = document.createElement('span');
        holder.dataset.laiyaText = t.data;
        holder.append(frag);
        t.replaceWith(holder);
      });
      made.forEach((mk, i) => setTimeout(() => mk.classList.add('is-lit'), 200 + i * 90));
      return () => node.querySelectorAll('[data-laiya-text]').forEach(h => h.replaceWith(document.createTextNode(h.dataset.laiyaText)));
    }

    /* ----------------------------------------------------------- scatter */

    // Aislar a lo bruto: los hermanos visibles salen despedidos en la
    // dirección contraria al elemento y se quedan girados y apagados.
    function scatter(node) {
      const scope = node.parentElement;
      if (!scope) return () => {};
      let others = [...scope.children].filter(n => n !== node && inView(n));
      if (others.length < 2 && scope.parentElement) others = others.concat([...scope.parentElement.children].filter(n => n !== scope && !n.contains(node) && inView(n)));
      others = others.slice(0, 12);
      if (!others.length) return () => {};
      const back = remember(others, ['transform', 'opacity', 'filter', 'transition']);
      const c = node.getBoundingClientRect();
      const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
      const t = gsap.to(others, {
        x: i => {
          const r = others[i].getBoundingClientRect();
          const dx = r.left + r.width / 2 - cx;
          return Math.sign(dx || rnd(-1, 1)) * rnd(60, 160);
        },
        y: i => {
          const r = others[i].getBoundingClientRect();
          return Math.sign(r.top + r.height / 2 - cy || rnd(-1, 1)) * rnd(30, 110);
        },
        rotate: () => rnd(-9, 9),
        scale: 0.9,
        opacity: 0.35,
        duration: M.slower,
        ease: M.emphasized,
        stagger: 0.04,
      });
      // `instant`: el escenario necesita la página en su sitio para medir el
      // siguiente compás; entonces se vuelve de golpe, sin animar.
      return instant => {
        t.kill();
        if (instant) return snapBack(others, 'transform,opacity', back);
        gsap.to(others, { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, duration: M.slow, ease: M.standard, onComplete: back });
      };
    }

    /* --------------------------------------------------------- blueprint */

    // Rayos X: el bloque enseña su estructura —cajas, retícula, medidas—
    // como en un plano. «La retícula se enseña» (BRAND.md §4), llevado al
    // extremo durante unos segundos.
    function blueprint(node) {
      // La retícula va en un hijo propio: el ::before/::after del bloque
      // puede estar ya en uso (los filetes de sección lo usan).
      const back = remember([node], ['position']);
      if (getComputedStyle(node).position === 'static') node.style.position = 'relative';
      const grid = document.createElement('span');
      grid.classList.add('syx-laiya-grid');
      grid.setAttribute('aria-hidden', 'true');
      node.appendChild(grid);
      node.classList.add('syx-laiya-blueprint');
      requestAnimationFrame(() => node.classList.add('is-on'));
      return instant => {
        node.classList.remove('is-on');
        const off = () => {
          node.classList.remove('syx-laiya-blueprint');
          grid.remove();
          back();
        };
        if (instant) off();
        else setTimeout(off, M.slow * 1000);
      };
    }

    /* -------------------------------------------------------------- tilt */

    // El elemento aislado gira hacia el puntero, como una pieza que se puede
    // coger. Máximo 7°: más ya marea (07-accesibilidad, rotación).
    function tilt(node) {
      const back = remember([node], ['transform', 'transform-style', 'transition']);
      const qx = gsap.quickTo(node, 'rotationY', { duration: M.slow, ease: M.standard });
      const qy = gsap.quickTo(node, 'rotationX', { duration: M.slow, ease: M.standard });
      gsap.set(node, { transformPerspective: 1100 });
      const move = e => {
        const r = node.getBoundingClientRect();
        qx(((e.clientX - (r.left + r.width / 2)) / innerWidth) * 14);
        qy((-(e.clientY - (r.top + r.height / 2)) / innerHeight) * 10);
      };
      addEventListener('pointermove', move, { passive: true });
      return instant => {
        removeEventListener('pointermove', move);
        gsap.killTweensOf(node, 'rotationX,rotationY');
        if (instant) return snapBack([node], 'transform', back);
        gsap.to(node, { rotationX: 0, rotationY: 0, duration: M.slow, ease: M.standard, onComplete: back });
      };
    }

    /* ------------------------------------------------------------ ripple */

    function ripple(x, y) {
      const r = document.createElement('span');
      r.classList.add('syx-laiya-ripple');
      r.style.left = `${x}px`;
      r.style.top = `${y}px`;
      document.body.appendChild(r);
      gsap.fromTo(r, { scale: 0.2, opacity: 0.9 }, { scale: 9, opacity: 0, duration: M.slower * 1.4, ease: M.light, onComplete: () => r.remove() });
      return () => r.remove();
    }

    /* ----------------------------------------------------------- tremble */

    function tremble(node) {
      const back = remember([node], ['transform']);
      const t = gsap.fromTo(node, { x: 0 }, { x: 5, duration: 0.07, repeat: 5, yoyo: true, ease: 'none', onComplete: back });
      return () => {
        t.kill();
        back();
      };
    }

    /* ----------------------------------------------------------- gravity */

    // El guiño a destroy.spritefusion.com: lo que se ve de la página cae con
    // gravedad, rebota contra el suelo de la ventana y se apila torcido.
    // Devuelve la función que lo reconstruye pieza a pieza, en orden inverso.
    function gravity() {
      const main = document.querySelector('main');
      const pieces = [...main.querySelectorAll('h1, h2, h3, p, li, img, figure, .atom-cta, .mol-project-card, .mol-register, .mol-mark')]
        .filter(n => inView(n) && !n.closest('.org-laiya-dock, .mol-laiya-caption') && n.getBoundingClientRect().height < innerHeight * 0.6)
        // Solo los de más fuera: si cae una tarjeta, su texto cae con ella.
        .filter((n, _, all) => !all.some(o => o !== n && o.contains(n)))
        .slice(0, 48);
      if (!pieces.length) return () => {};
      const back = remember(pieces, ['transform', 'transition', 'will-change', 'touch-action', 'cursor']);
      // Mientras la página está en el suelo, arrastrar no selecciona texto.
      const backMain = remember([main], ['user-select', '-webkit-user-select']);
      main.style.setProperty('user-select', 'none');
      main.style.setProperty('-webkit-user-select', 'none');
      // El suelo es la barra, no el borde de la pantalla: lo que cae detrás
      // de la barra y del subtítulo no se ve ni se puede coger.
      const shelf = [...document.querySelectorAll('.org-laiya-dock, .mol-laiya-caption')]
        .filter(n => !n.hidden && n.getBoundingClientRect().height > 0)
        .map(n => n.getBoundingClientRect().top);
      const floor = Math.min(innerHeight - 8, ...shelf.map(t => t - 8));
      const tl = gsap.timeline();
      pieces.forEach((n, i) => {
        const r = n.getBoundingClientRect();
        const drop = floor - r.bottom - rnd(0, Math.min(140, r.height * 2));
        n.style.willChange = 'transform';
        n.style.touchAction = 'none';
        n.style.cursor = 'grab';
        tl.to(n, { y: drop, rotate: rnd(-24, 24), x: rnd(-40, 40), duration: rnd(0.7, 1.1), ease: 'bounce.out' }, rnd(0, 0.35) + (r.top / innerHeight) * 0.25);
      });

      // Los escombros se pueden coger y lanzar, como en destroy.spritefusion:
      // se arrastran con el puntero y, al soltarlos, salen con la velocidad
      // del gesto y vuelven a caer al suelo. Cada toque alarga la fiesta
      // (`rebuild.touched`); un arrastre no cuenta como clic en un enlace.
      let held = null;
      let dragged = false;
      const down = e => {
        if (e.button > 0 || (e.target.closest && e.target.closest('.org-laiya-dock, .mol-laiya-caption'))) return;
        // Un trozo girado deja huecos dentro de su caja: se coge por lo que
        // hay bajo el puntero o, si no, por la caja que lo contiene.
        const n =
          pieces.find(p => p.contains(e.target)) ||
          pieces.find(p => {
            const r = p.getBoundingClientRect();
            return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
          });
        if (!n) return;
        e.preventDefault();
        gsap.killTweensOf(n);
        tl.remove(gsap.getTweensOf(n));
        held = { n, x0: e.clientX, y0: e.clientY, gx: gsap.getProperty(n, 'x'), gy: gsap.getProperty(n, 'y'), t: performance.now(), vx: 0, vy: 0, lx: e.clientX, ly: e.clientY };
        dragged = false;
        n.style.cursor = 'grabbing';
        n.setPointerCapture?.(e.pointerId);
        rebuild.touched = performance.now();
      };
      const move = e => {
        if (!held) return;
        const now = performance.now();
        const dt = Math.max(1, now - held.t);
        held.vx = ((e.clientX - held.lx) / dt) * 1000;
        held.vy = ((e.clientY - held.ly) / dt) * 1000;
        held.lx = e.clientX;
        held.ly = e.clientY;
        held.t = now;
        if (Math.abs(e.clientX - held.x0) + Math.abs(e.clientY - held.y0) > 4) dragged = true;
        gsap.set(held.n, { x: held.gx + e.clientX - held.x0, y: held.gy + e.clientY - held.y0, rotate: Math.max(-30, Math.min(30, held.vx / 60)) });
      };
      const up = () => {
        if (!held) return;
        const { n, vx, vy } = held;
        held = null;
        n.style.cursor = 'grab';
        const r = n.getBoundingClientRect();
        const gx = gsap.getProperty(n, 'x');
        // Se lanza con la velocidad del gesto, pero no fuera de la pantalla:
        // lo que se pierde por un lado ya no se puede volver a coger.
        const fling = Math.max(-400, Math.min(400, vx * 0.18));
        const x = gx + Math.max(-r.left, Math.min(innerWidth - r.right, fling));
        const lift = Math.min(0, vy * 0.12);
        const y = gsap.getProperty(n, 'y');
        const drop = y + (floor - r.bottom) - rnd(0, 40);
        gsap.timeline()
          .to(n, { y: y + lift, x: (gx + x) / 2, duration: lift ? 0.25 : 0, ease: 'power2.out' })
          .to(n, { y: drop, x, rotate: rnd(-24, 24), duration: rnd(0.7, 1), ease: 'bounce.out' });
        rebuild.touched = performance.now();
      };
      const click = e => {
        if (dragged && pieces.some(p => p.contains(e.target))) {
          e.preventDefault();
          e.stopPropagation();
          dragged = false;
        }
      };
      addEventListener('pointerdown', down, true);
      addEventListener('pointermove', move, { passive: true });
      addEventListener('pointerup', up);
      addEventListener('pointercancel', up);
      addEventListener('click', click, true);

      const rebuild = () =>
        new Promise(resolve => {
          removeEventListener('pointerdown', down, true);
          removeEventListener('pointermove', move);
          removeEventListener('pointerup', up);
          removeEventListener('pointercancel', up);
          // El clic de soltar el último escombro llega después: se deja un
          // instante antes de volver a dejar pasar clics.
          setTimeout(() => removeEventListener('click', click, true), 400);
          held = null;
          tl.kill();
          gsap.killTweensOf(pieces);
          gsap.to([...pieces].reverse(), {
            x: 0,
            y: 0,
            rotate: 0,
            duration: M.slower,
            ease: M.emphasized,
            stagger: 0.025,
            onComplete: () => {
              back();
              backMain();
              resolve();
            },
          });
        });
      rebuild.touched = 0;
      return rebuild;
    }

    return { kinetic, marks, scatter, blueprint, tilt, ripple, tremble, gravity };
  }

  window.LaiyaFx = { create };
})();
