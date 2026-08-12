/* Hero field — a network that keeps making connections, and answers to touch.
 *
 * The claim under it is that one profile reaches across product design, design
 * systems, front-end and AI, so the texture behind it is not a decorative dust
 * cloud: it is nodes that drift, find each other, hold a link while they are
 * close and drop it when they are not. Connections form and dissolve
 * continuously and nothing about the picture is fixed — which is the point.
 *
 * Three states:
 *
 *   at rest     the network drifts and turns, and a charge crosses a link every
 *               half second or so. Alive, but quiet enough to read over.
 *
 *   on press    a chain reaction. A front expands from the point of contact and
 *               every node it passes lights up and passes it on, and a figure
 *               is drawn between the nearest nodes — a ring, a fan or a web,
 *               chosen at random, so no two presses draw the same thing.
 *
 *   held        the reaction compounds. The longer the button is down, the
 *               harder the field is drawn toward the point, the more often
 *               figures form and the more nodes each one takes in — so the
 *               shapes group into larger and denser constellations over the
 *               contact. Releasing does not cut it off: the pull eases out and
 *               the network drifts back to exactly what it was.
 *
 * The reaction is deliberately not on hover. Following the pointer everywhere
 * meant the field was permanently reacting, which is noise; making it answer to
 * a press means the reaction is an event, and an event can be emphatic.
 *
 * The hold displaces where a node is drawn and never where it is, so nothing
 * accumulates and "back to the initial state" needs no bookkeeping: when the
 * power reaches zero the drawn position is the real one again.
 *
 * It is still decoration and it still behaves like it:
 *   - the ink comes from CSS (`color` on the canvas), so the field follows the
 *     context it is placed in and there is no colour literal in here
 *   - the loop only runs while the hero is on screen
 *   - under prefers-reduced-motion it draws the network once, at rest, and a
 *     press does nothing: the picture survives, the motion does not
 *   - the link pass has a hard budget, so a dense cluster cannot turn one frame
 *     into tens of thousands of strokes
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
  const LINK_BUDGET = 2800; // strokes per frame, whatever the density
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
  const MAX_FRONTS = 6;

  const FIGURE_LIFE = 1700; // ms a figure takes to arrive and go
  const FIGURE_MIN = 3; // nodes in the smallest figure
  const FIGURE_MAX = 6; // nodes in a figure from a plain press
  const FIGURE_MAX_HELD = 11; // nodes in a figure at full hold

  const HOLD_RAMP = 2.6; // s of holding to reach full power
  const HOLD_RELEASE = 1.2; // s to fall back to nothing
  const HOLD_RANGE = 620; // px the hold is felt across
  const HOLD_GRAB = 0.72; // most of the distance a node gives up to the point
  const HOLD_FIGURE_EVERY = 460; // ms between figures at low power
  const HOLD_FRONT_EVERY = 900; // ms between fronts at low power

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

  // The hold. `power` is the only thing that ramps: everything the hold does
  // reads off it, so there is one number to reason about and one number to
  // bring back to zero.
  const hold = {
    on: false,
    x: 0,
    y: 0,
    power: 0,
    nextFigure: 0,
    nextFront: 0,
  };

  // Ease the pull rather than the counter, so a linear ramp still arrives and
  // leaves softly.
  const smooth = p => p * p * (3 - 2 * p);

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
        // Where it is drawn this frame. Equal to x/y unless the hold is on.
        px: 0,
        py: 0,
      });
    }

    // The transients go: they hold node indices, and the nodes have just been
    // rebuilt. The hold does not — the reader has not let go of the button
    // because the window changed size — so it keeps its power and only has its
    // point clamped back inside the new box.
    pulses = [];
    fronts = [];
    figures = [];
    nextPulse = PULSE_EVERY;
    hold.x = Math.min(Math.max(hold.x, 0), width);
    hold.y = Math.min(Math.max(hold.y, 0), height);
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

  // Where each node is drawn. The hold pulls a node a fraction of its own
  // distance toward the contact — closer nodes give up more of it — so the
  // field gathers into a dense centre that thins outward instead of collapsing
  // onto a single spot. It is recomputed from the current distance every frame
  // and never written back, which is what makes the release exact.
  function place() {
    const grab = smooth(hold.power) * HOLD_GRAB;

    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      n.px = n.x;
      n.py = n.y;
      if (grab <= 0) continue;

      const dx = n.x - hold.x;
      const dy = n.y - hold.y;
      const d = Math.hypot(dx, dy);
      if (d < 1 || d > HOLD_RANGE) continue;

      const pull = grab * (1 - d / HOLD_RANGE) ** 1.5;
      n.px -= dx * pull;
      n.py -= dy * pull;

      // The gathered nodes glow with the hold, so the cluster reads as charged
      // and not merely crowded.
      const lit = hold.power * (1 - d / HOLD_RANGE) * 0.55;
      if (lit > n.charge) n.charge = lit;
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
        const d = Math.hypot(n.px - f.x, n.py - f.y);
        if (Math.abs(d - f.r) < FRONT_BAND && n.charge < energy) {
          n.charge = energy;
        }
      }
    }
  }

  // A figure between the nodes nearest a point. Three kinds, picked at random:
  // the ring closes a polygon through all of them, the fan runs from the
  // nearest node to the rest, the web joins every pair. Under a hold the count
  // climbs with the power, so the shapes grow from a triangle to a dense
  // constellation. The nodes keep drifting underneath, so a figure deforms
  // while it fades — it is drawn on the network, not on top of it.
  function makeFigure(x, y, power) {
    const cap = 4 + Math.round(power * 7);
    if (nodes.length < FIGURE_MIN || figures.length >= cap) return;

    const top = FIGURE_MAX + Math.round(power * (FIGURE_MAX_HELD - FIGURE_MAX));
    const size = FIGURE_MIN + Math.floor(Math.random() * (top - FIGURE_MIN + 1));

    const ids = nodes
      .map((n, i) => [i, Math.hypot(n.px - x, n.py - y)])
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
        cx += nodes[id].px;
        cy += nodes[id].py;
      });
      cx /= ids.length;
      cy /= ids.length;
      ids.sort(
        (a, b) =>
          Math.atan2(nodes[a].py - cy, nodes[a].px - cx) -
          Math.atan2(nodes[b].py - cy, nodes[b].px - cx)
      );
    }

    ids.forEach(id => {
      nodes[id].charge = 1;
    });

    figures.push({ ids, kind, t: 0 });
  }

  // While the button is down the power climbs, and everything the hold does
  // climbs with it: figures arrive more often, take in more nodes and land
  // closer to the contact, and fronts leave more frequently.
  function sustain(dt) {
    if (hold.on) hold.power = Math.min(1, hold.power + dt / HOLD_RAMP);
    else hold.power = Math.max(0, hold.power - dt / HOLD_RELEASE);

    if (!hold.on) return;

    const p = hold.power;

    hold.nextFigure -= dt * 1000;
    if (hold.nextFigure <= 0) {
      // The scatter closes in as the power rises: shapes that started out
      // around the contact end up stacked on it.
      const spread = (1 - p) * 190;
      makeFigure(
        hold.x + (Math.random() * 2 - 1) * spread,
        hold.y + (Math.random() * 2 - 1) * spread,
        p
      );
      hold.nextFigure = HOLD_FIGURE_EVERY / (0.5 + p * 2.2);
    }

    hold.nextFront -= dt * 1000;
    if (hold.nextFront <= 0) {
      if (fronts.length >= MAX_FRONTS) fronts.shift();
      fronts.push({ x: hold.x, y: hold.y, r: 0 });
      hold.nextFront = HOLD_FRONT_EVERY / (0.5 + p * 1.6);
    }
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
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
        }
      } else if (f.kind === 'web') {
        for (let j = 0; j < f.ids.length; j += 1) {
          for (let k = j + 1; k < f.ids.length; k += 1) {
            const a = nodes[f.ids[j]];
            const b = nodes[f.ids[k]];
            ctx.moveTo(a.px, a.py);
            ctx.lineTo(b.px, b.py);
          }
        }
      } else {
        for (let j = 0; j < f.ids.length; j += 1) {
          const a = nodes[f.ids[j]];
          const b = nodes[f.ids[(j + 1) % f.ids.length]];
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
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

    // The reach closes as the field gathers. Without this a cluster is a solid
    // black mass — every pair inside it is within range — and the pattern the
    // hold is supposed to build disappears into ink.
    const r = reach * (1 - 0.55 * smooth(hold.power));
    const r2 = r * r;
    let budget = LINK_BUDGET;

    // Links first, so every node sits on top of its own connections.
    for (let i = 0; i < nodes.length && budget > 0; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.px - b.px;
        const dy = a.py - b.py;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;

        // The closer the pair, the more of the link is there. A connection
        // arrives and leaves; it never switches on. A charged pair carries the
        // chain reaction along the link they already had.
        const strength = 1 - Math.sqrt(d2) / r;
        const lit = (a.charge + b.charge) * 0.5;
        ctx.globalAlpha = Math.min(
          1,
          ink0 * strength * strength * (0.55 * a.weight * b.weight + lit * 2.2)
        );
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();

        budget -= 1;
        if (budget <= 0) break;
      }
    }

    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      const weight = n.weight + n.charge * 1.4;
      ctx.globalAlpha = Math.min(1, ink0 * weight);
      ctx.beginPath();
      ctx.arc(n.px, n.py, NODE_RADIUS * Math.min(2, weight), 0, Math.PI * 2);
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
      const d = Math.hypot(a.px - nodes[j].px, a.py - nodes[j].py);
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
        a.px + (b.px - a.px) * p.t,
        a.py + (b.py - a.py) * p.t,
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
    sustain(dt);
    place();
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
    place();
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

  function pointAt(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  // The press. Every pointer type, because a tap is a press: the reaction is
  // the one thing here a phone can have too.
  hero.addEventListener(
    'pointerdown',
    event => {
      if (reduceMotion.matches || !nodes.length) return;

      const p = pointAt(event);
      if (p.x < 0 || p.y < 0 || p.x > width || p.y > height) return;

      hold.on = true;
      hold.x = p.x;
      hold.y = p.y;
      hold.nextFigure = 0;
      hold.nextFront = 0;

      if (fronts.length >= MAX_FRONTS) fronts.shift();
      fronts.push({ x: p.x, y: p.y, r: 0 });
      makeFigure(p.x, p.y, 0);
    },
    { passive: true }
  );

  // Dragging while held moves the centre of the phenomenon with the pointer.
  // Tracked only during a hold, so hovering the hero costs nothing.
  hero.addEventListener(
    'pointermove',
    event => {
      if (!hold.on) return;
      const p = pointAt(event);
      hold.x = p.x;
      hold.y = p.y;
    },
    { passive: true }
  );

  // On the window, so a release outside the hero still ends the hold. The pull
  // is not cut: `power` falls over HOLD_RELEASE and the drawn positions walk
  // back to the real ones, which are the ones the network had all along.
  const release = () => {
    if (!hold.on) return;
    hold.on = false;
    // What was gathered disperses: one last front leaves the point, but only
    // if there was something to disperse — a plain click already had its own.
    if (hold.power > 0.35) {
      if (fronts.length >= MAX_FRONTS) fronts.shift();
      fronts.push({ x: hold.x, y: hold.y, r: 0 });
    }
  };

  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('pointercancel', release, { passive: true });
  window.addEventListener('blur', release);

  // A reader can turn reduced motion on while the page is open.
  const onMotionChange = () => {
    stop();
    if (reduceMotion.matches) {
      hold.on = false;
      hold.power = 0;
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
