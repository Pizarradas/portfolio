// Índice de un caso.
//
// Rellena `.mol-case-toc` con los encabezados que la página ya tiene y marca
// el que se está leyendo. Nada aquí es contenido nuevo: cada entrada es el
// texto de un `h2` que ya existe en el marcado —traducido, por tanto, por
// `build-i18n.mjs` como el resto de la página— y cada enlace apunta a un
// `id` que ya existe o que se le da al encabezado al vuelo.
//
// Qué lista:
//   - si la página tiene capítulos (`.org-case__chapter`: 42DS, ATLAS), lista
//     los capítulos con su número («01 What had to be decided»);
//   - si no, lista los actos (`.org-case__band`, `.org-case__act`) por su
//     etiqueta corta (`.atom-eyebrow`: «The brief», «The team»…), que es más
//     corta que el titular y ya funciona como nombre de sección.
//
// Sin script la lista está vacía y el CSS retira la barra entera, así que no
// hay estado a medias que servir. Con `prefers-reduced-motion` el índice se
// marca igual —es información, no movimiento— y solo el desplazamiento del
// enlace activo dentro de la fila deja de animarse.
(() => {
  'use strict';

  const toc = document.querySelector('.mol-case-toc');
  // 42DS conserva su armazón propio (`.org-case42`); el resto corre `.org-case`.
  const article = document.querySelector('.org-case, .org-case42');
  if (!toc || !article) return;
  const list = toc.querySelector('ol');
  if (!list) return;

  const chapters = [...article.querySelectorAll('.org-case__chapter')];
  const acts = [...article.querySelectorAll('.org-case__band, .org-case__act')];

  // Un `id` estable para lo que no lo tiene: sale del texto del encabezado,
  // igual que hace el resto del marcado de los casos (`the-brief-title`), y se
  // desambigua con un sufijo si ya existe.
  const slug = (text) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'section';

  const ensureId = (el, seed) => {
    if (el.id) return el.id;
    let id = slug(seed);
    let n = 2;
    while (document.getElementById(id)) id = `${slug(seed)}-${n++}`;
    el.id = id;
    return id;
  };

  // Cada entrada sabe qué bloques son suyos (`members`): un capítulo es su
  // marcador más todo lo que le sigue hasta el siguiente capítulo, así que se
  // marca como actual mientras se lee cualquiera de sus actos, no solo su
  // titular. Un acto es él mismo.
  let entries;
  if (chapters.length) {
    entries = chapters
      .map((chapter, i) => {
        const h2 = chapter.querySelector('h2');
        if (!h2) return null;
        const members = [chapter];
        let next = chapter.nextElementSibling;
        while (next && !next.classList.contains('org-case__chapter')) {
          members.push(next);
          next = next.nextElementSibling;
        }
        return {
          members,
          id: ensureId(chapter, h2.textContent),
          index: String(i + 1).padStart(2, '0'),
          label: h2.textContent.trim(),
        };
      })
      .filter(Boolean);
  } else {
    entries = acts
      .map((act) => {
        const eyebrow = act.querySelector('.mol-section-heading .atom-eyebrow');
        const h2 = act.querySelector('h2');
        if (!eyebrow || !h2) return null;
        return {
          members: [act],
          id: ensureId(act, eyebrow.textContent),
          index: null,
          label: eyebrow.textContent.trim(),
        };
      })
      .filter(Boolean);
  }

  // Menos de tres entradas no es un índice, es ruido bajo la cabecera.
  if (entries.length < 3) return;

  const links = entries.map((entry) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${entry.id}`;
    if (entry.index) {
      const b = document.createElement('b');
      b.textContent = entry.index;
      a.append(b, ' ');
    }
    a.append(entry.label);
    li.append(a);
    list.append(li);
    return a;
  });

  /* ------------------------------------------------- la entrada que se lee */

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // La fila puede ser más ancha que la ventana: el enlace activo se trae a la
  // vista desplazando SOLO la lista, en horizontal. Antes se hacía con
  // `scrollIntoView`, y en un teléfono eso fue un error: aunque se pida
  // `block: 'nearest'`, el navegador también puede mover el documento para
  // acercar la barra pegada, y lo hacía en mitad del scroll del dedo —la
  // página daba tirones y los toques sobre la barra no se registraban—.
  // `scrollTo` sobre el `ol` no puede tocar el documento.
  const reveal = (link) => {
    const left = link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: reduced.matches ? 'auto' : 'smooth' });
  };

  const markCurrent = (current) => {
    entries.forEach((entry, i) => {
      const link = links[i];
      if (entry === current) {
        if (link.hasAttribute('aria-current')) return;
        link.setAttribute('aria-current', 'location');
        reveal(link);
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  /* --------------------------------------------- un toque sobre el índice */

  // El documento hace scroll suave hasta el ancla (`scroll-behavior: smooth`
  // en la base). Durante ese recorrido el observador veía pasar cada sección
  // intermedia, marcaba cada una como actual y desplazaba la fila tras ella:
  // la barra perseguía al scroll y, en un teléfono, el conjunto se encasquillaba
  // y se comía el siguiente toque. Ahora un toque marca su entrada al momento
  // y bloquea al observador hasta que el documento se detiene (`scrollend`,
  // con un tope de tiempo para los navegadores que no lo emiten). Un gesto
  // del lector —dedo o rueda— levanta el bloqueo antes: manda quien toca.
  let locked = false;
  let unlockTimer = 0;
  const unlock = () => {
    locked = false;
    clearTimeout(unlockTimer);
  };
  const lockUntilSettled = () => {
    locked = true;
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(unlock, 1500);
  };
  addEventListener('scrollend', unlock, { passive: true });
  addEventListener('touchstart', unlock, { passive: true });
  addEventListener('wheel', unlock, { passive: true });

  links.forEach((link, i) => {
    link.addEventListener('click', () => {
      lockUntilSettled();
      markCurrent(entries[i]);
    });
  });

  if (!('IntersectionObserver' in window)) return;

  // Misma franja de lectura que `header-context.js`: desde el borde inferior
  // de las dos barras pegadas hasta el 55 % de la ventana. La última entrada
  // visible en orden de documento es la que manda.
  const barsHeight = () => {
    const header = document.querySelector('.org-site-header');
    return Math.round(
      (header ? header.getBoundingClientRect().height : 0) + toc.getBoundingClientRect().height
    );
  };

  let io = null;
  const visible = new Set();
  const wire = () => {
    if (io) io.disconnect();
    visible.clear();
    io = new IntersectionObserver(
      (batch) => {
        batch.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        });
        if (locked) return;
        const current = entries.filter((e) => e.members.some((m) => visible.has(m))).pop();
        markCurrent(current || null);
      },
      { rootMargin: `-${barsHeight() + 1}px 0px -45% 0px` }
    );
    entries.forEach((entry) => entry.members.forEach((m) => io.observe(m)));
  };

  wire();

  let pending = 0;
  addEventListener(
    'resize',
    () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(wire);
    },
    { passive: true }
  );
})();
