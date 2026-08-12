/* Live previews for the self-directed registers.
 *
 * Each preview is the real page in an iframe. The source renders at desktop
 * width and is scaled down to fit its frame, so what you see is the page — not
 * a crop of its top-left corner, which is what the previous version showed
 * because two of the three frames were never scaled at all.
 *
 * The iframes carry loading="lazy" and tabindex="-1": they are evidence, not
 * something to tab into. If one fails to load, the fallback underneath keeps
 * the module readable.
 */
(() => {
  'use strict';

  // The width the source pages are designed against. Below this they would
  // switch to their own mobile layout, which is not what the preview is for.
  const SOURCE_WIDTH = 1440;

  const frames = Array.from(document.querySelectorAll('.mol-register__frame'));
  if (!frames.length) return;

  const fit = frame => {
    const iframe = frame.querySelector('iframe');
    if (!iframe) return;

    const scale = frame.clientWidth / SOURCE_WIDTH;
    iframe.style.width = `${SOURCE_WIDTH}px`;
    // Enough source height to cover the frame once scaled, so no letterbox
    // appears at the bottom on tall modules.
    iframe.style.height = `${Math.ceil(frame.clientHeight / scale)}px`;
    iframe.style.transform = `scale(${scale})`;
  };

  frames.forEach(frame => {
    fit(frame);
    const iframe = frame.querySelector('iframe');
    if (iframe) {
      iframe.addEventListener('load', () => {
        frame.classList.add('is-loaded');
        fit(frame);
      }, { once: true });
    }
  });

  // The frame height is driven by the copy column beside it, which reflows on
  // resize and on webfont load, so observe the box rather than the window.
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(entries => {
      entries.forEach(entry => fit(entry.target));
    });
    frames.forEach(frame => ro.observe(frame));
  } else {
    let raf;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => frames.forEach(fit));
    }, { passive: true });
  }
})();
