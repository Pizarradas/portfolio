// Carries the reader's position across the language switch.
//
// Every anchor id is identical in both languages — es/ is generated from the
// English markup — so someone reading #about in English should land on #about
// in Spanish rather than at the top of the page. The links work without this;
// the script only makes the jump land where the reader already was.
//
// There is deliberately no stored preference and no automatic redirect: the
// switch is visible on every page, a redirect would fire after the English
// page had already painted, and a Spanish-speaking reader may be on the
// English version on purpose.
(() => {
  const nodes = document.querySelectorAll('.atom-lang-switch a[href]');
  if (!nodes.length) return;

  const carry = () => {
    const hash = window.location.hash;
    nodes.forEach(link => {
      const base = (link.dataset.langHref ||= link.getAttribute('href'));
      link.setAttribute('href', base.split('#')[0] + hash);
    });
  };

  carry();
  window.addEventListener('hashchange', carry);
})();
