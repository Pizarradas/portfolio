// Entrada por scroll, para cualquier pagina del sitio.
//
// Vivia dentro de `case-42ds-v14.js`, asi que solo se ejecutaba en esa pagina.
// El CSS, en cambio, apaga **cualquier** `.js-reveal` cuando el documento lleva
// la clase `.js` -que la pone el `<head>` de las seis paginas-, de modo que una
// pagina con `js-reveal` en el marcado y sin este observador se queda en blanco
// entera. Paso: SPORT, al migrarla.
//
// Va sin sufijo de version a proposito: es comportamiento de sitio, no de caso.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = [...document.querySelectorAll('.js-reveal')];

  const show = el => {
    el.classList.add('is-visible');
    el.querySelectorAll('.js-count').forEach(counter => {
      if (counter.dataset.done) return;
      counter.dataset.done = '1';
      const target = Number(counter.dataset.count || 0);
      if (reduced) { counter.textContent = target; return; }
      const start = performance.now();
      const duration = 750;
      const tick = now => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        counter.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          show(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .18 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(show);
  }

})();
