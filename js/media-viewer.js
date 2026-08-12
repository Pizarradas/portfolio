(() => {
  const viewers = document.querySelectorAll('.js-media-viewer');
  if (!viewers.length) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'mol-media-lightbox';
  dialog.innerHTML = `
    <div class="mol-media-lightbox__bar"><span class="js-lightbox-label">Screenshot</span><button class="mol-media-lightbox__close" type="button">Close</button></div>
    <div class="mol-media-lightbox__viewport"><img class="js-lightbox-img" alt=""></div>`;
  document.body.appendChild(dialog);

  const lbImg = dialog.querySelector('.js-lightbox-img');
  const lbLabel = dialog.querySelector('.js-lightbox-label');
  const close = dialog.querySelector('.mol-media-lightbox__close');
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  viewers.forEach(viewer => {
    viewer.classList.add('is-fit');
    const img = viewer.querySelector('img');
    const viewport = viewer.querySelector('.mol-media-viewer__viewport');
    viewer.querySelector('.js-media-fit')?.addEventListener('click', () => {
      viewer.classList.remove('is-actual'); viewer.classList.add('is-fit'); viewport.scrollTo({left:0, top:0, behavior:'smooth'});
    });
    viewer.querySelector('.js-media-actual')?.addEventListener('click', () => {
      viewer.classList.remove('is-fit'); viewer.classList.add('is-actual'); viewport.scrollTo({left:0, top:0, behavior:'smooth'});
    });
    viewer.querySelector('.js-media-open')?.addEventListener('click', () => {
      lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt || ''; lbLabel.textContent = viewer.dataset.label || 'Screenshot'; dialog.showModal();
    });
    img.addEventListener('dblclick', () => viewer.querySelector('.js-media-open')?.click());
  });
})();
