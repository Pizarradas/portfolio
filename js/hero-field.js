/* Hero field — a layout grid that breathes.
 *
 * The hero claims the page is about the systems behind the newspapers, so the
 * texture behind it is a grid rather than a cloud: every dot sits on a node of
 * a regular lattice and never leaves it, it only orbits within a couple of
 * pixels. A long wave crosses the field so the lattice reads as one surface
 * moving, not as a few hundred dots jittering independently.
 *
 * It is decoration and it behaves like it:
 *   - the colour comes from CSS (`color` on the canvas), so the field follows
 *     the context it is placed in instead of hardcoding ink
 *   - the loop only runs while the hero is on screen
 *   - under prefers-reduced-motion it paints the lattice at rest, once
 *   - it never paints if the canvas has no 2D context
 *
 * There is no fallback to write: with no JS the hero is exactly what it was.
 */
(() => {
  'use strict';

  const canvas = document.querySelector('.org-hero__field');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  // Density and ink come from the token layer — see --component-hero-field-*.
  // The numbers here are only what the field falls back to if the stylesheet
  // has not loaded, so the script is never the place those get tuned.
  const DEFAULT_MODULE = 46;
  const DEFAULT_INK = 0.16;

  const RADIUS = 1.1;
  const ORBIT = 3.2; // px — the whole range of movement
  const WAVE_SPEED = 0.00035; // rad/ms
  const PARALLAX = 14; // px of pointer-driven drift at the deepest layer
  const MAX_DOTS = 3200; // backstop for very large displays

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  let dots = [];
  let module = DEFAULT_MODULE;
  let ink0 = DEFAULT_INK;
  // Read once per build, not once per frame: getComputedStyle in the paint
  // loop is a style read on every single frame for a value that only changes
  // when the context around the canvas does.
  let ink = 'currentColor';
  let width = 0;
  let height = 0;
  let frame = 0;
  let visible = false;

  // Eased pointer position, in -1..1 from the centre of the hero.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function build() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    const css = getComputedStyle(canvas);
    ink = css.color;
    module =
      parseFloat(css.getPropertyValue('--component-hero-field-module')) ||
      DEFAULT_MODULE;
    ink0 =
      parseFloat(css.getPropertyValue('--component-hero-field-ink')) ||
      DEFAULT_INK;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Half a module of bleed on each side, so the lattice runs off the edges
    // instead of stopping short of them with a visible margin.
    const cols = Math.ceil(width / module) + 1;
    const rows = Math.ceil(height / module) + 1;
    const offsetX = (width - (cols - 1) * module) / 2;
    const offsetY = (height - (rows - 1) * module) / 2;

    dots = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (dots.length >= MAX_DOTS) break;
        dots.push({
          x: offsetX + col * module,
          y: offsetY + row * module,
          // A stable per-node phase. Derived from the position rather than
          // from Math.random(), so a resize rebuilds the same field instead of
          // reshuffling it under the reader.
          phase: (col * 12.9898 + row * 78.233) % (Math.PI * 2),
          // Three depth layers: the deeper ones are fainter, move less and
          // drift less with the pointer. That is the whole parallax.
          depth: 0.45 + ((col + row * 3) % 5) * 0.1375,
        });
      }
    }
    return true;
  }

  function paint(time) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = ink;

    const t = time * WAVE_SPEED;

    for (let i = 0; i < dots.length; i += 1) {
      const dot = dots[i];

      // One long diagonal wave across the whole field. Every node reads its
      // own point of that wave, which is what makes the lattice undulate
      // rather than shimmer.
      const wave = Math.sin(dot.x * 0.006 + dot.y * 0.009 + t);
      const swell = 0.35 + 0.65 * (wave * 0.5 + 0.5);
      const amp = ORBIT * swell * dot.depth;

      const x =
        dot.x +
        Math.cos(t * 1.6 + dot.phase) * amp +
        pointer.x * PARALLAX * dot.depth;
      const y =
        dot.y +
        Math.sin(t * 1.3 + dot.phase * 1.7) * amp +
        pointer.y * PARALLAX * dot.depth;

      ctx.globalAlpha = ink0 * (0.3 + 0.7 * dot.depth) * (0.55 + 0.45 * swell);
      ctx.beginPath();
      ctx.arc(x, y, RADIUS * dot.depth, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function paintAtRest() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = ink;
    for (let i = 0; i < dots.length; i += 1) {
      const dot = dots[i];
      ctx.globalAlpha = ink0 * (0.3 + 0.7 * dot.depth);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, RADIUS * dot.depth, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function tick(time) {
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;
    paint(time);
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function start() {
    if (frame || !dots.length) return;
    if (reduceMotion.matches) {
      paintAtRest();
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  function rebuild() {
    stop();
    if (!build()) return;
    if (visible) start();
    else paintAtRest();
  }

  // Only alive while the hero is on screen. Everything below the fold is a
  // long page, and a canvas repainting behind it would cost battery for a
  // texture nobody can see.
  const hero = canvas.closest('.org-hero') || canvas;
  const io = new IntersectionObserver(
    entries => {
      visible = entries[0].isIntersecting;
      if (visible) start();
      else stop();
    },
    { threshold: 0 }
  );

  if (build()) {
    io.observe(hero);
    paintAtRest();
  }

  // ResizeObserver rather than the resize event: the hero is sized in svh and
  // changes height when the mobile browser chrome collapses, which fires no
  // resize event on some browsers.
  if (window.ResizeObserver) {
    let pending = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(rebuild);
    });
    ro.observe(canvas);
  } else {
    window.addEventListener('resize', rebuild);
  }

  if (finePointer.matches) {
    hero.addEventListener(
      'pointermove',
      event => {
        const rect = hero.getBoundingClientRect();
        pointer.tx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.ty = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      },
      { passive: true }
    );

    hero.addEventListener('pointerleave', () => {
      pointer.tx = 0;
      pointer.ty = 0;
    });
  }

  // A reader can turn reduced motion on while the page is open.
  const onMotionChange = () => {
    stop();
    if (reduceMotion.matches) paintAtRest();
    else if (visible) start();
  };

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', onMotionChange);
  } else if (reduceMotion.addListener) {
    reduceMotion.addListener(onMotionChange);
  }
})();
