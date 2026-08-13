// Mobile reading fold.
//
// A prose block that runs past φ⁻¹ of the smallest supported screen stops being
// an element on a page and becomes the page. Below 768px this clips such a
// block to nine lines and puts a button under it. The CSS does the clipping, so
// the folded height is there at first paint and nothing shifts; this file only
// wires the toggle.
//
// The clip lives behind `.js` on <html>, set by an inline script in <head>.
// With scripting off there is no clip at all: a truncated text with no way to
// open it would be worse than a long one.
(() => {
  document.querySelectorAll('.syx-fold').forEach((fold) => {
    const toggle = document.querySelector(`[aria-controls="${fold.id}"]`);
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const open = fold.dataset.open !== 'true';
      fold.dataset.open = String(open);
      toggle.setAttribute('aria-expanded', String(open));

      // Both labels come from the markup — the visible one as a text node, the
      // other in `data-label` — so build-i18n translates the pair and this file
      // never has to know a language. They swap places on every press.
      const next = toggle.dataset.label;
      toggle.dataset.label = toggle.textContent.trim();
      toggle.textContent = next;

      // Collapsing from below the fold would leave the reader somewhere further
      // up the page with no idea what moved. `nearest` only scrolls when the
      // button has actually left the viewport, and it does it without motion.
      if (!open) toggle.scrollIntoView({ block: 'nearest' });
    });
  });
})();
