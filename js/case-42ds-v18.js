
(() => {
  const brandData = {
    ep: { color: '#f53036', fontSize: '1.6rem', lineHeight: '2rem', label: 'EL PERIÓDICO' },
    sport: { color: '#ec0918', fontSize: '1.8rem', lineHeight: '2.2rem', label: 'SPORT' },
    epe: { color: '#0034dd', fontSize: '1.6rem', lineHeight: '2rem', label: 'EL PERIÓDICO DE ESPAÑA' },
    regionales: { color: '#136496', fontSize: '1.8rem', lineHeight: '2.2rem', label: 'REGIONALES' }
  };
  const stage = document.querySelector('.mol-token-lab__stage');
  document.querySelectorAll('[data-brand]').forEach(btn => {
    // El color de cada marca lo escribe el botón en su propia custom property,
    // una vez, al cargar. Así el CSS lo lee sin que haya que repetir los cuatro
    // hex en la hoja: el mapa de arriba sigue siendo la única fuente, y el
    // botón activo de arranque también lo tiene sin esperar a un clic.
    const own = brandData[btn.dataset.brand];
    if (own) btn.style.setProperty('--brand-ink', own.color);

    btn.addEventListener('click', () => {
      const d = brandData[btn.dataset.brand];
      if (!stage || !d) return;
      document.querySelectorAll('[data-brand]').forEach(b => b.classList.toggle('is-active', b === btn));
      stage.dataset.tokenBrand = btn.dataset.brand;
      stage.style.setProperty('--active-brand', d.color);
      stage.querySelector('.js-token-color-label').textContent = d.color;
      stage.querySelector('.js-token-primary').textContent = d.color;
      stage.querySelector('.js-token-font-size').textContent = d.fontSize;
      stage.querySelector('.js-token-line-height').textContent = d.lineHeight;
      stage.querySelector('.js-brand-kicker').textContent = d.label;
    });
  });

  const widths = { xs: '<768', sm: '768+', md: '1002+', lg: '1280+' };
  const viewport = document.querySelector('.mol-grid-lab__viewport');
  document.querySelectorAll('[data-grid]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!viewport) return;
      document.querySelectorAll('[data-grid]').forEach(b => b.classList.toggle('is-active', b === btn));
      viewport.dataset.gridMode = btn.dataset.grid;
      const label = viewport.querySelector('.js-grid-width');
      if (label) label.textContent = widths[btn.dataset.grid];
    });
  });
})();
