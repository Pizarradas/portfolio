// The wordmark types.
//
// "JLP." backspaces itself, types a short message, clears it and comes back.
// The dot never moves out of the markup: it is a sibling span that this script
// never touches, so whatever the letters are doing, the signature is there.
//
// Three constraints shaped this more than the effect did:
//
//   Accessibility. The link's accessible name comes from its aria-label, and
//   everything inside it is aria-hidden. So the name stays "José Luis Pizarro,
//   home" no matter what the letters say — a screen reader is never read a
//   half-typed word, and nothing here is announced. That is also why the five
//   case pages had to get the aria-label they were missing before this shipped.
//
//   Reduced motion. `prefers-reduced-motion: reduce` means it never starts, and
//   if it is already running it stops and restores "JLP". Not a slower version:
//   an animation whose whole content is movement has no slower version.
//
//   Desktop only. Below the desktop breakpoint the header is tight and the nav
//   has no width to lend, so the effect is off and the wordmark is just a
//   wordmark. The query is watched, not read once — a resize turns it on or off.
//
// Timings are deliberately uneven. A typewriter that hits every key on the same
// beat reads as a progress bar; the jitter below is what makes it read as
// typing. Nothing here animates layout: the header is `justify-content:
// space-between` with two children, so the wordmark growing moves nothing.

(() => {
  'use strict';

  const BRAND = 'JLP';
  const DESKTOP = '(min-width: 80rem)'; // $bp-xl — keep in sync with abstracts/_breakpoints.scss

  const el = document.querySelector('.atom-wordmark__type');
  const data = document.getElementById('wordmark-messages');
  if (!el || !data) return;

  let messages;
  try {
    messages = JSON.parse(data.textContent).filter(m => typeof m === 'string' && m.length);
  } catch {
    return;
  }
  if (!messages.length) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia(DESKTOP);

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const jitter = (base, spread) => base + Math.random() * spread;

  // A fresh token per run. Any await can resume after the effect was told to
  // stop — a media query flipped, reduced motion came on — and the check after
  // every await is what keeps a cancelled run from writing to the DOM.
  let run = 0;

  // Los cinco números del efecto, juntos a propósito.
  //
  // Calibrados hacia lo pausado: esto vive en una cabecera fija, en la periferia
  // de la vista, y a ritmo rápido se percibe como un parpadeo molesto al borde
  // del ojo en vez de como alguien escribiendo. Un ciclo completo dura ~19 s.
  //
  // El borrado va a la mitad que el tecleo porque así es como se escribe: una
  // persona teclea pensando y borra de un tirón.
  const PACE = {
    type: [88, 48], // ms por carácter al escribir  [base, dispersión]
    erase: [46, 26], // ms por carácter al borrar
    hold: [3000, 800], // el mensaje, quieto y legible
    rest: [9000, 5000], // de vuelta a ser wordmark antes del siguiente
    first: [4500, 2000], // margen para que la página se asiente
  };

  const type = async (text, token) => {
    for (let i = 1; i <= text.length; i++) {
      if (token !== run) return false;
      el.textContent = text.slice(0, i);
      await wait(jitter(...PACE.type));
    }
    return token === run;
  };

  const erase = async (from, token) => {
    for (let i = from.length; i >= 0; i--) {
      if (token !== run) return false;
      el.textContent = from.slice(0, i);
      await wait(jitter(...PACE.erase));
    }
    return token === run;
  };

  // Shuffled deck rather than a random pick each time: picking at random shows
  // the same message twice in a row often enough to look broken. This way every
  // message appears once before any repeats, and the order changes each cycle.
  let deck = [];
  const nextMessage = () => {
    if (!deck.length) {
      deck = messages.slice();
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      // Never open a new deck with the message that closed the last one.
      if (deck.length > 1 && deck[deck.length - 1] === el.dataset.last) {
        [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
      }
    }
    const message = deck.pop();
    el.dataset.last = message;
    return message;
  };

  const loop = async token => {
    await wait(jitter(...PACE.first));
    while (token === run) {
      if (!(await erase(BRAND, token))) return;
      await wait(jitter(220, 160)); // el titubeo antes de empezar a escribir

      const message = nextMessage();
      if (!(await type(message, token))) return;
      await wait(jitter(...PACE.hold));

      if (!(await erase(message, token))) return;
      await wait(jitter(240, 180));

      if (!(await type(BRAND, token))) return;
      await wait(jitter(...PACE.rest));
    }
  };

  const stop = () => {
    run++;
    el.textContent = BRAND;
    el.classList.remove('is-typing');
  };

  const start = () => {
    stop();
    if (motion.matches || !desktop.matches) return;
    el.classList.add('is-typing');
    loop(run);
  };

  motion.addEventListener('change', start);
  desktop.addEventListener('change', start);
  start();
})();
