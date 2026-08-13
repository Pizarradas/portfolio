(() => {
  const scaleFrame = (viewport, iframe) => {
    if (!viewport || !iframe) return;
    const sourceWidth = 1440;
    const scale = Math.min(1, viewport.clientWidth / sourceWidth);
    iframe.style.transform = `scale(${scale})`;
    iframe.style.width = `${sourceWidth}px`;
    // ensure enough source height to fill the scaled viewport
    iframe.style.height = `${Math.max(1000, viewport.clientHeight / Math.max(scale,.01))}px`;
  };

  const frames = [...document.querySelectorAll('.mol-live-preview__stage iframe, .mol-browser-preview__viewport iframe')];
  frames.forEach(frame => {
    const viewport = frame.parentElement;
    scaleFrame(viewport, frame);
    frame.addEventListener('load', () => {
      viewport.classList.add('is-loaded');
      scaleFrame(viewport, frame);
    }, { once:true });
  });

  let raf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => frames.forEach(f => scaleFrame(f.parentElement, f)));
  });
})();

// Aquí había tres bloques más, cada uno con su propio listener de resize:
// escalaban `.mol-register-preview__viewport`, su variante `--cropped` y
// `.mol-project-hero-v27__viewport`. Ninguna de esas tres clases existe ya en
// el marcado — el bloque de registros usa `.mol-register__frame`, que gestiona
// js/register-previews.js. Eran tres listeners registrados para nada.
