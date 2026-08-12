/* Hero field — a network that keeps making connections, and fires when touched.
 *
 * The claim under it is that one profile reaches across product design, design
 * systems, front-end and AI, so the texture behind it is not a decorative dust
 * cloud: it is nodes that drift, find each other, hold a link while they are
 * close and drop it when they are not. Connections form and dissolve
 * continuously and nothing about the picture is fixed — which is the point.
 *
 * Two states, and only two:
 *
 *   at rest   the network drifts and turns, and a charge crosses a link every
 *             half second or so. Alive, but quiet enough to read over.
 *
 *   on press  a chain reaction. A front expands from the point of contact and
 *             every node it passes lights up and passes it on, and a figure is
 *             drawn between the nodes nearest the contact — a ring, a fan or a
 *             web, chosen at random, so no two presses draw the same thing.
 *
 * The reaction is deliberately not on hover. Following the pointer everywhere
 * meant the field was permanently reacting, which is noise; making it answer to
 * a press means the reaction is an event, and an event can be emphatic.
 *
 * It is still decoration and it still behaves like it:
 *   - the ink comes from CSS (`color` on the canvas), so the field follows the
 *     context it is placed in and there is no colour literal in here
 *   - the loop only runs while the hero is on screen
 *   - under prefers-reduced-motion it draws the network once, at rest, and a
 *     press does nothing: the picture survives, the motion does not
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

  // Density, ink and reach come from the token layer — see
  // --component-hero-field-*. The numbers here are only what the field falls
  // back to if the stylesheet has not loaded, so the script is never the place
  // those get tuned.
  const DEFAULT_MODULE = 132; // average px between nodes
  const DEFAULT_INK = 0.34; // alpha of a node at full strength
  const DEFAULT_REACH = 170; // px — how far a node can hold a link

  const MAX_NODES = 190; // the pair loop is O(n²); this is where it stops
  const SPEED_MIN = 9; // px per second
  const SPEED_MAX = 27;
  const TURN_MAX = 0.32; // rad per second — how much a path can curve
  const NODE_RADIUS = 1.5;

  const PULSE_EVERY = 460; // ms between resting charges
  const PULSE_LIFE = 900; // ms for a charge to cross its link
  const MAX_PULSES = 6;

  const FRONT_SPEED = 1000; // px per second the chain reaction travels
  const FRONT_BAND = 80; // px — how wide the front is
  const CHARGE_DECAY = 1.5; // per second — how fast a lit node goes out
  const MAX_FRONTS = 3;
  const FIGURE_LIFE = 1700; // ms a figure takes to arrive and go
  const FIGURE_MIN = 3; // nodes in the smallest figure
  const FIGURE_MAX = 6;
  const MAX_FIGURES = 4;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let nodes = [];
  // Read once per build, not once per frame: getComputedStyle in the paint
  // loop is a style read on every single frame for values that only change when
  // the context around the canvas does.
  let ink = 'currentColor';
  let ink0 = DEFAULT_INK;
  let reach = DEFAULT_REACH;
  let width = 0;
  let height = 0;
  let frame = 0;
  let last = 0;
  let visible = false;
  let pulses = [];
  let fronts = [];
  let figures = [];
  let nextPulse = PULSE_EVERY;

  function build() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    const css = getComputedStyle(canvas);
    ink = css.color;
    const module =
      parseFloat(css.getPropertyValue('--component-hero-field-module')) ||
      DEFAULT_MODULE;
    ink0 =
      parseFloat(css.getPropertyValue('--component-hero-field-ink')) ||
      DEFAULT_INK;
    reach =
      parseFloat(css.getPropertyValue('--component-hero-field-reach')) ||
      DEFAULT_REACH;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Count comes from area, so a phone gets a sparse network and a wide
    // display a dense one, at the same visual weight.
    const count = Math.min(
      MAX_NODES,
      Math.max(22, Math.round((width * height) / (module * module)))
    );

    nodes = [];
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        // Every node turns, slowly, in its own direction. Straight lines read
        // as things being moved; a curve reads as something moving itself.
        turn: (Math.random() * 2 - 1) * TURN_MAX,
        // Weight only varies how present a node is, never how it behaves: the
        // network has to read as one surface, not as three layers of dots.
        weight: 0.55 + Math.random() * 0.45,
        charge: 0,
      });
    }

    pulses = [];
    fronts = [];
    figures = [];
    nextPulse = PULSE_EVERY;
    return true;
  }

  function step(dt) {
    // A node that leaves one edge comes back at the opposite one. Links are
    // decided by distance, so it simply drops the neighbours it had and finds
    // new ones — there is no seam to hide.
    const margin = 40;
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];

      const a = n.turn * dt;
      if (a) {
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const vx = n.vx * cos - n.vy * sin;
        n.vy = n.vx * sin + n.vy * cos;
        n.vx = vx;
      }

      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.x < -margin) n.x = width + margin;
      else if (n.x > width + margin) n.x = -margin;
      if (n.y < -margin) n.y = height + margin;
      else if (n.y > height + margin) n.y = -margin;

      if (n.charge > 0) n.charge = Math.max(0, n.charge - dt * CHARGE_DECAY);
    }
  }

  // The chain reaction. The front is a ring of radius r expanding from the
  // point of contact; any node it sweeps past is charged, and a charged node is
  // brighter and lights the links it holds. That is the whole propagation —
  // nothing recursive, and it cannot run away.
  function advance(dt) {
    const span = Math.hypot(width, height);

    for (let i = fronts.length - 1; i >= 0; i -= 1) {
      const f = fronts[i];
      f.r += FRONT_SPEED * dt;
      if (f.r > span) {
        fronts.splice(i, 1);
        continue;
      }
      // The front loses energy as it spreads, so the reaction dies away at the
      // edges instead of hitting them at full strength.
      const energy = 1 - f.r / span;
      for (let j = 0; j < nodes.length; j += 1) {
        const n = nodes[j];
        const d = Math.hypot(n.x - f.x, n.y - f.y);
        if (Math.abs(d - f.r) < FRONT_BAND && n.charge < energy) {
          n.charge = energy;
        }
      }
    }
  }

  // A figure between the nodes nearest the contact. Three kinds, picked at
  // random: the ring closes a polygon through all of them, the fan runs from
  // the nearest node to the rest, the web joins every pair. The nodes keep
  // drifting underneath, so the shape deforms while it fades — it is drawn on
  // the network, not on top of it.
  function makeFigure(x, y) {
    if (nodes.length < FIGURE_MIN || figures.length >= MAX_FIGURES) return;

    const size =
      FIGURE_MIN + Math.floor(Math.random() * (FIGURE_MAX - FIGURE_MIN + 1));
    const ids = nodes
      .map((n, i) => [i, Math.hypot(n.x - x, n.y - y)])
      .sort((a, b) => a[1] - b[1])
      .slice(0, Math.min(size, nodes.length))
      .map(pair => pair[0]);

    if (ids.length < FIGURE_MIN) return;

    const kinds = ['ring', 'fan', 'web'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];

    if (kind === 'ring') {
      // Sorted by angle around their own centre, so the polygon closes without
      // crossing itself.
      let cx = 0;
      let cy = 0;
      ids.forEach(id => {
        cx += nodes[id].x;
        cy += nodes[id].y;
      });
      cx /= ids.length;
      cy /= ids.length;
      ids.sort(
        (a, b) =>
          Math.atan2(nodes[a].y - cy, nodes[a].x - cx) -
          Math.atan2(nodes[b].y - cy, nodes[b].x - cx)
      );
    }

    ids.forEach(id => {
      nodes[id].charge = 1;
    });

    figures.push({ ids, kind, t: 0 });
  }

  function drawFigures(dt) {
    if (!figures.length) return;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;

    for (let i = figures.length - 1; i >= 0; i -= 1) {
      const f = figures[i];
      f.t += (dt * 1000) / FIGURE_LIFE;
      if (f.t >= 1) {
        figures.splice(i, 1);
        continue;
      }

      const fade = Math.sin(f.t * Math.PI);
      ctx.globalAlpha = Math.min(1, ink0 * 1.9) * fade;
      ctx.beginPath();

      if (f.kind === 'fan') {
        const a = nodes[f.ids[0]];
        for (let j = 1; j < f.ids.length; j += 1) {
          const b = nodes[f.ids[j]];
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
      } else if (f.kind === 'web') {
        for (let j = 0; j < f.ids.length; j += 1) {
          for (let k = j + 1; k < f.ids.length; k += 1) {
            const a = nodes[f.ids[j]];
            const b = nodes[f.ids[k]];
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
        }
      } else {
        for (let j = 0; j < f.ids.length; j += 1) {
          const a = nodes[f.ids[j]];
          const b = nodes[f.ids[(j + 1) % f.ids.length]];
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
      }

      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function drawNetwork() {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 1;

    const reach2 = reach * reach;

    // Links first, so every node sits on top of its own connections.
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > reach2) continue;

        // The closer the pair, the more of the link is there. A connection
        // arrives and leaves; it never switches on. A charged pair carries the
        // chain reaction along the link they already had.
        const strength = 1 - Math.sqrt(d2) / reach;
        const lit = (a.charge + b.charge) * 0.5;
        ctx.globalAlpha = Math.min(
          1,
          ink0 * strength * strength * (0.55 * a.weight * b.weight + lit * 2.2)
        );
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      const weight = n.weight + n.charge * 1.4;
      ctx.globalAlpha = Math.min(1, ink0 * weight);
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_RADIUS * Math.min(2, weight), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  // A charge crossing one link, at rest. Cheap and rare, and it is the whole
  // difference between a diagram of a network and something that looks alive.
  function firePulse() {
    if (pulses.length >= MAX_PULSES || nodes.length < 2) return;

    const from = Math.floor(Math.random() * nodes.length);
    const a = nodes[from];
    let best = -1;
    let bestD = reach;
    for (let j = 0; j < nodes.length; j += 1) {
      if (j === from) continue;
      const d = Math.hypot(a.x - nodes[j].x, a.y - nodes[j].y);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    // No neighbour in reach: this node has nothing to fire down right now.
    if (best < 0) return;
    pulses.push({ a: from, b: best, t: 0 });
  }

  function drawPulses(dt) {
    if (!pulses.length) return;
    ctx.fillStyle = ink;

    for (let i = pulses.length - 1; i >= 0; i -= 1) {
      const p = pulses[i];
      p.t += (dt * 1000) / PULSE_LIFE;
      const a = nodes[p.a];
      const b = nodes[p.b];
      if (p.t >= 1 || !a || !b) {
        pulses.splice(i, 1);
        continue;
      }
      // Fades in and out across the trip, so it reads as a charge passing
      // rather than as a dot that appears and is deleted.
      const fade = Math.sin(p.t * Math.PI);
      ctx.globalAlpha = Math.min(1, ink0 * 2.6) * fade;
      ctx.beginPath();
      ctx.arc(
        a.x + (b.x - a.x) * p.t,
        a.y + (b.y - a.y) * p.t,
        NODE_RADIUS * 1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function tick(time) {
    // Clamped: a tab coming back from the background must not teleport the
    // whole field across the screen in a single frame.
    const dt = Math.min(0.05, last ? (time - last) / 1000 : 0.016);
    last = time;

    step(dt);
    advance(dt);
    drawNetwork();
    drawFigures(dt);

    nextPulse -= dt * 1000;
    if (nextPulse <= 0) {
      firePulse();
      nextPulse = PULSE_EVERY * (0.6 + Math.random());
    }
    drawPulses(dt);

    frame = requestAnimationFrame(tick);
  }

  function drawStill() {
    drawNetwork();
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }

  function start() {
    if (frame || !nodes.length) return;
    if (reduceMotion.matches) {
      drawStill();
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  function rebuild() {
    stop();
    if (!build()) return;
    if (visible) start();
    else drawStill();
  }

  // Only alive while the hero is on screen. Everything below the fold is a long
  // page, and a canvas repainting behind it would cost battery for a texture
  // nobody can see.
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
    drawStill();
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

  // The press. Every pointer type, because a tap is a press: the reaction is
  // the one thing here a phone can have too.
  hero.addEventListener(
    'pointerdown',
    event => {
      if (reduceMotion.matches || !nodes.length) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > width || y > height) return;

      if (fronts.length >= MAX_FRONTS) fronts.shift();
      fronts.push({ x, y, r: 0 });
      makeFigure(x, y);
    },
    { passive: true }
  );

  // A reader can turn reduced motion on while the page is open.
  const onMotionChange = () => {
    stop();
    if (reduceMotion.matches) {
      fronts = [];
      figures = [];
      pulses = [];
      drawStill();
    } else if (visible) {
      start();
    }
  };

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', onMotionChange);
  } else if (reduceMotion.addListener) {
    reduceMotion.addListener(onMotionChange);
  }
})();
