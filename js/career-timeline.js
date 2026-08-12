/* Career timeline — GSAP + ScrollTrigger.
 *
 * This replaced a CSS `animation-timeline: view()` version. The native one was
 * correct but fragile: a view timeline resolves against the nearest ancestor
 * scroll container, so any `overflow` other than visible anywhere up the tree
 * silently re-anchors it and the animation ends up frozen part-drawn.
 * ScrollTrigger measures the element against the document instead, which does
 * not care what the ancestors do.
 *
 * Everything degrades: initial states are set from JS, so with no JS — or if
 * GSAP fails to load — the finished chart is what renders.
 */
(() => {
  'use strict';

  const figure = document.querySelector('.mol-career-chart');
  if (!figure || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const svg = figure.querySelector('.mol-career-chart__svg');
  const q = sel => Array.from(svg.querySelectorAll(sel));

  const grid = q('.mol-career-chart__grid line');
  const labels = q('.mol-career-chart__grid .lvl');
  const curve = svg.querySelector('.mol-career-chart__curve');
  const area = svg.querySelector('.mol-career-chart__area');
  const nodes = q('.mol-career-chart__node');
  const bars = q('.mol-career-chart__bars rect');
  const barText = q('.mol-career-chart__bars text');
  const axis = svg.querySelector('.mol-career-chart__axis');
  const gap = svg.querySelector('.mol-career-chart__gap');

  /* ---------------------------------------------------------------- motion */

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const len = curve.getTotalLength();
    gsap.set(curve, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set([area, ...barText, axis, gap], { opacity: 0 });
    gsap.set([...grid, ...bars], { scaleX: 0, transformOrigin: 'left center' });
    gsap.set(labels, { opacity: 0, x: -8 });
    gsap.set(nodes, { opacity: 0, scale: 0.3, transformOrigin: 'center' });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: figure,
        // Starts as the chart clears the fold and finishes before it leaves,
        // so the whole draw happens while the chart is fully on screen.
        start: 'top 85%',
        end: 'bottom 60%',
        scrub: 0.6,
      },
    });

    tl.to(grid, { scaleX: 1, stagger: 0.06 }, 0)
      .to(labels, { opacity: 1, x: 0, stagger: 0.06 }, 0.05)
      .to(bars, { scaleX: 1, stagger: 0.08 }, 0.1)
      .to(curve, { strokeDashoffset: 0, duration: 1.6 }, 0.25)
      .to(area, { opacity: 1, duration: 1.2 }, 0.5)
      .to(nodes, { opacity: 1, scale: 1, stagger: 0.22, ease: 'back.out(2)' }, 0.45)
      .to([gap, ...barText, axis], { opacity: 1, stagger: 0.05 }, 1.1);

    return () => {
      // matchMedia cleanup: drop the inline state so the reduced-motion branch
      // starts from the finished chart rather than from a half-played one.
      gsap.set(
        [curve, area, ...grid, ...labels, ...bars, ...barText, axis, gap, ...nodes],
        { clearProps: 'all' }
      );
    };
  });

  /* --------------------------------------------------------------- tooltip */

  const tip = figure.querySelector('.mol-career-tip');
  const raw = document.getElementById('career-tip-data');
  if (!tip || !raw) return;

  let data;
  try {
    data = JSON.parse(raw.textContent);
  } catch {
    return;
  }

  let open = null;

  const render = d => {
    tip.innerHTML =
      `<b>${d.org}</b>` +
      `<span class="mol-career-tip__meta">${d.when} · ${d.where}</span>` +
      `<span class="mol-career-tip__role">${d.role}</span>` +
      `<ul>${d.detail.map(x => `<li>${x}</li>`).join('')}</ul>` +
      `<span class="mol-career-tip__scope">${d.scope}</span>`;
  };

  const place = node => {
    const f = figure.getBoundingClientRect();
    const n = node.getBoundingClientRect();
    const cx = n.left + n.width / 2 - f.left;
    const cy = n.top - f.top;

    tip.hidden = false;
    // Measure after it is in flow, then keep it inside the figure.
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = Math.min(Math.max(cx - w / 2, 0), Math.max(f.width - w, 0));
    const below = cy - h - 14 < 0;

    tip.style.left = `${x}px`;
    tip.style.top = `${below ? cy + n.height + 14 : cy - h - 14}px`;
    tip.dataset.side = below ? 'below' : 'above';
  };

  const show = node => {
    const d = data[Number(node.dataset.point)];
    if (!d) return;
    // Moving straight from one node to the next fires pointerleave then
    // pointerenter, so a fade-out could still be running and would hide the
    // tooltip we just opened when its onComplete landed.
    gsap.killTweensOf(tip);
    open = node;
    render(d);
    place(node);
    node.setAttribute('aria-describedby', 'career-tip');
    gsap.fromTo(tip, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' });
  };

  const hide = () => {
    if (!open) return;
    open.removeAttribute('aria-describedby');
    open = null;
    gsap.to(tip, {
      opacity: 0, duration: 0.15,
      onComplete: () => { if (!open) tip.hidden = true; },
    });
  };

  nodes.forEach(node => {
    node.addEventListener('pointerenter', () => show(node));
    node.addEventListener('pointerleave', hide);
    node.addEventListener('focus', () => show(node));
    node.addEventListener('blur', hide);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hide();
  });

  // A tooltip anchored to a node has to follow it when the layout moves.
  window.addEventListener('resize', () => { if (open) place(open); }, { passive: true });
  window.addEventListener('scroll', () => { if (open) place(open); }, { passive: true });
})();
