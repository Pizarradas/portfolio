// El header sabe sobre qué está.
//
// Dos trabajos, un observador cada uno, y comparten la única medida que hace
// falta: los 68px de header sticky que se comen el borde superior de la
// ventana en las siete páginas.
//
//   1. `data-over="dark"` cuando lo que pasa por debajo del header es una
//      sección invertida. El CSS lo lee en `abstracts/_contexts.scss` y le
//      cambia el mapa de tinta entero; aquí no hay ni un color.
//   2. `aria-current="location"` en el enlace de la sección que se está
//      leyendo. Hasta ahora `aria-current` solo lo usaba el conmutador de
//      idioma: durante el scroll la navegación no decía dónde estabas, ni a un
//      lector de pantalla ni a la vista.
//
// Sin script no pasa nada malo: el header se queda claro —que es como está hoy
// y es legible— y la navegación se queda sin marca de sección. La mejora nunca
// es la condición para ver.
(() => {
  const header = document.querySelector('.org-site-header');
  if (!header || !('IntersectionObserver' in window)) return;

  // La altura se lee del elemento y no del token: el token dice el mínimo, y
  // lo que hay que descontar es lo que el header mide de verdad en esta
  // página, a este ancho.
  const headerHeight = () => Math.round(header.getBoundingClientRect().height);

  // Los observadores se recrean al cambiar el tamaño porque `rootMargin` se
  // fija al construirlos y depende del alto de la ventana. Se agrupa en un
  // solo sitio para que no haya dos definiciones del mismo margen.
  const observers = [];
  const rebuild = () => {
    while (observers.length) observers.pop().disconnect();
    observers.push(...wire(headerHeight()));
  };

  /* ------------------------------------------------ 1 · fondo bajo el header */

  const darkSections = [...document.querySelectorAll('.syx-on-night, .syx-on-brand')];
  const covering = new Set();

  const watchDark = (h) => {
    if (!darkSections.length) return null;
    // Una banda de 1px justo debajo del borde inferior del header. Lo que la
    // cruce es, literalmente, lo que el header tiene detrás.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) covering.add(entry.target);
          else covering.delete(entry.target);
        });
        if (covering.size) header.dataset.over = 'dark';
        else delete header.dataset.over;
      },
      { rootMargin: `-${h}px 0px -${Math.max(0, window.innerHeight - h - 1)}px 0px` }
    );
    darkSections.forEach((el) => io.observe(el));
    return io;
  };

  /* ------------------------------------------- 2 · sección que se está leyendo */

  // Solo los enlaces internos de la nav, y solo los que son hermanos directos:
  // los del conmutador de idioma ya llevan su propio `aria-current` y apuntan a
  // otra página, no a una sección de esta.
  const sectionLinks = [...header.querySelectorAll('.mol-nav > a[href^="#"]')];
  const targets = sectionLinks
    .map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter((pair) => pair.section);

  const markCurrent = (section) => {
    targets.forEach(({ link, section: candidate }) => {
      if (candidate === section) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const watchSections = (h) => {
    if (!targets.length) return null;
    const visible = new Set();
    // Desde el borde inferior del header hasta el 55 % de la ventana: la franja
    // en la que de verdad se está leyendo. Sin el recorte de abajo, una sección
    // corta al final de la página se marcaría a la vez que la anterior.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        });
        // La última en orden de documento: al bajar, la que acaba de entrar es
        // la que manda; al subir, la de arriba vuelve a quedarse sola.
        const current = targets
          .map((pair) => pair.section)
          .filter((section) => visible.has(section))
          .pop();
        markCurrent(current || null);
      },
      { rootMargin: `-${h + 1}px 0px -45% 0px` }
    );
    targets.forEach((pair) => io.observe(pair.section));
    return io;
  };

  const wire = (h) => [watchDark(h), watchSections(h)].filter(Boolean);

  rebuild();

  let pending = 0;
  addEventListener(
    'resize',
    () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(rebuild);
    },
    { passive: true }
  );
})();
