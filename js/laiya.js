/* LAIYA — la capa.
 *
 * LAIYA no abre una ventana: opera sobre la página. Una barra al pie (el
 * botón que se convierte en campo de pregunta) y, por encima, el orbe, que
 * vuela hasta lo que explica, acerca la cámara, aísla el elemento y lo cuenta
 * con un subtítulo. La puesta en escena vive en js/laiya-stage.js; este
 * fichero es la parte que conversa: la barra, el motor, la voz, la memoria de
 * sesión y la traducción de cada respuesta a una escena sobre el DOM real.
 *
 *   js/laiya.js          barra, conversación, voz, escenas
 *   js/laiya-stage.js    director: orbe, cámara, foco, subtítulo, portal
 *   js/laiya-engine.js   motor local (intenciones + búsqueda)
 *   js/laiya-avatar.js   el orbe en Three.js (módulo ES)
 *   assets/laiya/knowledge-{en,es}.json   ← npm run build:laiya
 *
 * Coste en la carga: este fichero y nada más. Lo demás se pide al acercarse
 * al botón; Three.js, al pintarse el orbe.
 */
(function () {
  'use strict';

  const script = document.currentScript;
  if (!script || !('fetch' in window)) return;

  const ROOT = new URL('..', script.src);
  const LANG = (document.documentElement.lang || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  const FILE = location.pathname.split('/').pop() || 'index.html';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const KEY = 'laiya:' + LANG;

  const store = {
    get(area, k) {
      try {
        return JSON.parse(window[area].getItem(k));
      } catch {
        return null;
      }
    },
    set(area, k, v) {
      try {
        window[area].setItem(k, JSON.stringify(v));
      } catch {
        /* modo privado o almacenamiento bloqueado: la capa sigue sin memoria */
      }
    },
    drop(area, k) {
      try {
        window[area].removeItem(k);
      } catch {}
    },
  };

  const track = (name, params) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  };

  const esc = s =>
    String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const asset = path => new URL(path, ROOT).href;
  const pageHref = (file, id) => (file === 'index.html' ? './' : file) + (id ? '#' + id : '');

  const ICON = {
    voice: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    close: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    mic: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    send: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrow: '<svg aria-hidden="true" class="atom-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };

  /* ------------------------------------------------------------- estado */

  let K = null;
  let engine = null;
  let guide = null;
  // Lo que ya se ha citado del paso actual, para que «cuéntame más» avance.
  let said = [];
  let stage = null;
  let orb = null;
  let open = false;
  let state = 'idle';
  let topic = null;
  let history = [];
  let busy = false;
  let recognition = null;
  let voiceOn = !!store.get('localStorage', 'laiya:voice');
  let loading = null;

  /* ---------------------------------------------------------------- barra */

  // El botón y el campo son el mismo objeto: la píldora se abre y dentro
  // aparece la pregunta. El orbe descansa en su ranura de la izquierda.
  const tpl = document.createElement('template');
  tpl.innerHTML = `<div class="org-laiya-dock syx-on-night" data-open="false">
<div class="mol-laiya-suggest" hidden></div>
<div class="org-laiya-dock__bar">
  <span class="org-laiya-dock__slot" aria-hidden="true"><span class="atom-laiya-orb"></span></span>
  <button type="button" class="org-laiya-dock__launch" aria-expanded="false">${esc(script.dataset.label || 'Ask LAIYA')}</button>
  <form class="mol-laiya-composer" autocomplete="off" hidden>
    <input class="mol-laiya-composer__input" type="text" name="q" maxlength="300" enterkeyhint="send">
    <button type="button" class="atom-laiya-tool" data-laiya="mic" hidden>${ICON.mic}</button>
    <button type="submit" class="atom-laiya-tool atom-laiya-tool--send">${ICON.send}</button>
  </form>
  <button type="button" class="atom-laiya-tool" data-laiya="voice" aria-pressed="${voiceOn}" hidden>${ICON.voice}</button>
  <button type="button" class="atom-laiya-tool" data-laiya="close" hidden>${ICON.close}</button>
</div>
<p class="syx-laiya-sr" role="status" aria-live="polite"></p>
</div>`;
  const dock = tpl.content.firstElementChild;
  document.body.appendChild(dock);

  const el = {
    suggest: dock.querySelector('.mol-laiya-suggest'),
    launch: dock.querySelector('.org-laiya-dock__launch'),
    slot: dock.querySelector('.org-laiya-dock__slot'),
    form: dock.querySelector('form'),
    input: dock.querySelector('input'),
    mic: dock.querySelector('[data-laiya="mic"]'),
    voice: dock.querySelector('[data-laiya="voice"]'),
    close: dock.querySelector('[data-laiya="close"]'),
    live: dock.querySelector('.syx-laiya-sr'),
  };

  /* --------------------------------------------------------------- carga */

  const loadScript = (src, test) =>
    new Promise((resolve, reject) => {
      if (test()) return resolve();
      const s = document.createElement('script');
      s.src = asset(src);
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  function load() {
    if (!loading)
      loading = Promise.all([
        fetch(asset(`assets/laiya/knowledge-${LANG}.json`), { credentials: 'same-origin' }).then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        }),
        // El recorrido es un extra: sin él LAIYA sigue contestando, solo que
        // sin apartes dentro de los recorridos.
        fetch(asset(`assets/laiya/tour-${LANG}.json`), { credentials: 'same-origin' })
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null),
        loadScript('js/laiya-engine.js', () => window.LaiyaEngine),
        loadScript('js/laiya-guide.js', () => window.LaiyaGuide),
        loadScript('js/laiya-stage.js', () => window.LaiyaStage),
        loadScript('js/laiya-fx.js', () => window.LaiyaFx),
        // GSAP ya está en la home y en algunos casos; si no, se pide aquí.
        loadScript('js/vendor/gsap.min.js', () => window.gsap),
      ])
        .then(([k, tour]) => {
          K = k;
          engine = window.LaiyaEngine.create(K);
          guide = tour && window.LaiyaGuide ? window.LaiyaGuide.create({ tour, norm: window.LaiyaEngine.norm, file: FILE }) : null;
          // Las preguntas que ofrece la guía, para reconocerlas al pulsarlas.
          if (tour) K.tourAsk = tour.copy.ask;
          setupStage();
          return K;
        })
        .catch(err => {
          loading = null;
          throw err;
        });
    return loading;
  }

  ['pointerenter', 'focusin', 'touchstart'].forEach(ev => dock.addEventListener(ev, () => load().catch(() => {}), { once: true, passive: true }));

  function setupStage() {
    const U = K.ui;
    el.input.setAttribute('aria-label', U.inputLabel);
    const narrow = matchMedia('(max-width: 30em)');
    const setPlaceholder = () => (el.input.placeholder = (narrow.matches && U.placeholderShort) || U.placeholder);
    setPlaceholder();
    narrow.addEventListener?.('change', setPlaceholder);
    el.mic.setAttribute('aria-label', U.mic);
    el.mic.title = U.mic;
    el.close.setAttribute('aria-label', U.close);
    el.close.title = U.close;
    syncVoice();

    dock.dataset.stage = 'on';
    stage = window.LaiyaStage.create({
      gsap: window.gsap,
      reduced: REDUCED,
      file: FILE,
      ui: U,
      dock,
      renderBlocks: blocks => blocks.map(renderBlock).join(''),
      onGoto: goTo,
      onState: setState,
      announce,
      onStep: stepChips,
    });
  }

  function loadOrb() {
    if (orb || dock.dataset.orb) return;
    dock.dataset.orb = 'loading';
    import(asset('js/laiya-avatar.js'))
      .then(m => {
        orb = m.createOrb(stage.canvas, { tokensFrom: dock, reducedMotion: REDUCED.matches, base: ROOT.href });
        if (!orb) throw new Error('webgl');
        stage.attachOrb(orb);
        stage.body.dataset.orb = 'webgl';
        orb.setState(state);
      })
      .catch(() => {
        // Sin WebGL o sin módulos: se queda el orbe de CSS, que ya estaba.
        if (stage) stage.body.dataset.orb = 'css';
      });
  }

  /* --------------------------------------------------------------- abrir */

  el.launch.addEventListener('click', () => openDock());

  async function openDock({ greet = true } = {}) {
    try {
      await load();
    } catch {
      dock.dataset.error = 'true';
      return;
    }
    if (open) return;
    open = true;
    dock.dataset.open = 'true';
    el.launch.hidden = true;
    el.launch.setAttribute('aria-expanded', 'true');
    el.form.hidden = false;
    el.close.hidden = false;
    el.voice.hidden = !('speechSynthesis' in window);
    el.mic.hidden = !(window.SpeechRecognition || window.webkitSpeechRecognition);
    el.suggest.hidden = false;
    document.documentElement.classList.add('syx-laiya-open');
    loadOrb();
    restore();
    requestAnimationFrame(() => {
      stage.settle();
      el.input.focus({ preventScroll: true });
    });
    if (greet) {
      stage.wake();
      const hello = engine.answer('', { currentFile: FILE, greeted: history.length > 0 });
      perform(hello, { record: false });
      track('laiya_open', { page: FILE });
    }
  }

  function closeDock() {
    if (!open) return;
    open = false;
    if (recognition) recognition.abort();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    stage.sleep();
    dock.dataset.open = 'false';
    el.form.hidden = true;
    el.close.hidden = true;
    el.voice.hidden = true;
    el.suggest.hidden = true;
    el.launch.hidden = false;
    el.launch.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('syx-laiya-open');
    setState('idle');
    requestAnimationFrame(() => {
      stage.settle();
      el.launch.focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------- no tapar navegación */

  // Cerrada, la barra no se sienta encima de navegación: en la portada, el
  // mapa de capacidades queda al pie del primer pantallazo, justo donde vive
  // el lanzador. Mientras se solapan, la barra sube lo justo para quedar
  // encima (`--laiya-lift`, con su transición en el SCSS); cuando ese bloque
  // ya ha pasado por detrás, vuelve a su sitio.
  const AVOID = '.org-capability-scan';
  const avoid = [...document.querySelectorAll(AVOID)];
  dock.style.setProperty('--laiya-lift', '0px');
  if (avoid.length) {
    let liftTick = 0;
    const lift = () => {
      liftTick = 0;
      let px = 0;
      if (!open) {
        const now = parseFloat(dock.style.getPropertyValue('--laiya-lift')) || 0;
        const d = dock.getBoundingClientRect();
        // La posición de la barra sin el desplazamiento actual.
        const top = d.top + now, bottom = d.bottom + now;
        const pad = parseFloat(getComputedStyle(dock).gap) || 8;
        for (const n of avoid) {
          const r = n.getBoundingClientRect();
          if (r.top < bottom && r.bottom > top) px = Math.max(px, bottom - r.top + pad);
        }
        // Solo un saltito: si para librar el bloque hubiera que subir más de
        // dos alturas de barra (en un móvil el mapa son seis filas apiladas),
        // subir taparía otra cosa —el botón del hero—; se queda donde está.
        if (px > (bottom - top) * 2) px = 0;
      }
      dock.style.setProperty('--laiya-lift', `${Math.round(px)}px`);
    };
    const queue = () => liftTick || (liftTick = requestAnimationFrame(lift));
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
    dock.addEventListener('transitionend', e => e.propertyName === 'translate' && stage && stage.settle && stage.settle());
    queue();
    new MutationObserver(queue).observe(dock, { attributes: true, attributeFilter: ['data-open'] });
  }

  dock.addEventListener('click', e => {
    const t = e.target.closest('[data-laiya], [data-ask]');
    if (!t) return;
    if (t.dataset.ask) return ask(t.dataset.ask);
    const a = t.dataset.laiya;
    if (a === 'close') closeDock();
    else if (a === 'voice') toggleVoice();
    else if (a === 'mic') listen();
  });

  el.form.addEventListener('submit', e => {
    e.preventDefault();
    const q = el.input.value.trim();
    if (q) ask(q);
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !open) return;
    if (recognition) return recognition.abort();
    if (stage.busy()) return stage.interrupt();
    closeDock();
  });

  // Personalidad: el puntero cerca la pone curiosa y un clic encima le hace
  // cosquillas (sin quitarle el clic a lo que haya debajo si es un enlace o
  // un botón). Escribir la hace centellear.
  const nearOrb = (e, f = 0.4) => {
    const r = stage.body.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    return Math.hypot(dx, dy) < r.width * f;
  };
  let lastNear = 0;
  window.addEventListener(
    'pointermove',
    e => {
      if (!orb || !stage) return;
      const r = stage.body.getBoundingClientRect();
      orb.look((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -(e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
      if (open && orb.react && performance.now() - lastNear > 1500 && nearOrb(e, 0.45)) {
        lastNear = performance.now();
        orb.react('near');
      }
    },
    { passive: true },
  );
  window.addEventListener(
    'pointerdown',
    e => {
      if (!orb || !stage || !open || !orb.react) return;
      if (e.target.closest && e.target.closest('a, button, input, textarea, select, label, [role="button"]')) return;
      if (nearOrb(e, 0.32)) orb.react('tickle');
    },
    { passive: true },
  );
  el.input.addEventListener('input', () => orb && orb.react && orb.react('type'));

  function setState(next) {
    state = next;
    dock.dataset.state = next;
    if (stage) stage.body.dataset.state = next;
    if (orb) orb.setState(next);
  }

  /* -------------------------------------------------------- conversación */

  // Las preguntas que se pueden hacer sobre lo que LAIYA está señalando,
  // como sugerencias: cambian con cada paso del recorrido.
  function stepChips(step, i, total) {
    said = [];
    if (!guide || !step || !step.anchor) return;
    const e = guide.entry(step.anchor);
    if (!e) return;
    const list = guide.next(e, null).map(guide.label);
    if (i < total - 1) list.push(guide.label('next'));
    if (list.length) renderSuggestions(list);
  }

  // Dentro de un recorrido: la pregunta va sobre lo que se está viendo. Las
  // órdenes (sigue, atrás, repite, para) mueven el recorrido; el resto se
  // contesta con frases de la página, sin mover la cámara. Devuelve false si
  // la pregunta no es sobre esto y debe ir al motor general.
  function askHere(question) {
    const here = stage && stage.current();
    if (!guide || !here || !here.anchor) return false;
    const peers = here.steps.map(st => st.anchor).filter(Boolean);
    const g = guide.answer(question, here.anchor, { said, peers });
    if (!g) return false;
    // ¿Es de verdad sobre esto, o una pregunta nueva? Las órdenes, los saltos
    // a otro paso y las preguntas sugeridas son de la guía. Si el motor
    // reconoce una intención propia («¿con qué herramientas trabaja?», «¿cómo
    // usa la IA?») o un caso que no es el que se ve, manda el motor: eso
    // abre su propio recorrido.
    const chip = Object.values(K.tourAsk || {}).includes(question.trim());
    if (!g.command && !g.jump && !chip) {
      const a = engine.answer(question, { currentFile: FILE, topic, greeted: true });
      const e = guide.entry(here.anchor) || {};
      const strong = (a.kind === 'intent' && !['greet', 'help', 'here'].includes(a.intent)) || (a.kind === 'project' && a.focus && a.focus.file !== e.case && a.focus.file !== FILE);
      if (strong) return false;
    }
    history.push({ role: 'user', text: question });
    el.input.value = '';
    // La pregunta era sobre otro paso del recorrido: allí se va primero.
    if (g.jump) {
      stage.jumpTo(peers.indexOf(g.jump) >= 0 ? here.steps.findIndex(st => st.anchor === g.jump) : -1);
      if (!g.quote && !g.text) return true;
    }
    if (g.command) {
      if (g.command === 'next') stage.next();
      else if (g.command === 'back') stage.back();
      else if (g.command === 'again') stage.again();
      else stage.pause();
      return true;
    }
    if (g.go && !g.quote) {
      goTo(g.go);
      return true;
    }
    track('laiya_aside', { kind: g.kind || 'free', anchor: here.anchor, page: FILE });
    const blocks = [];
    if (g.quote && g.quote.length) {
      said.push(...g.quote);
      blocks.push({ type: 'quote', text: g.quote.join(' '), cite: g.cite || '' });
    }
    if (g.go) blocks.push({ type: 'goto', file: g.go });
    history.push({ role: 'ai', text: [g.text, ...(g.quote || [])].join(' ') });
    history = history.slice(-12);
    const chips = (g.ask || []).map(guide.label);
    if (here.index < here.total - 1) chips.push(guide.label('next'));
    renderSuggestions(chips);
    stage.aside({ text: g.text, blocks });
    return true;
  }

  async function ask(question) {
    if (busy) return;
    if (askHere(question)) return;
    busy = true;
    el.input.value = '';
    history.push({ role: 'user', text: question });
    stage.thinking();
    el.suggest.innerHTML = '';

    let answer = engine.answer(question, { currentFile: FILE, topic, greeted: true });
    track('laiya_question', { kind: answer.kind || 'intent', intent: answer.intent || '', page: FILE });

    const remote = K.remote && K.remote.endpoint;
    const fixed = answer.kind === 'intent' && answer.intent !== 'person';
    if (remote && !fixed) answer = await askRemote(question, answer);

    busy = false;
    perform(answer, { record: true });
  }

  async function askRemote(question, local) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), K.remote.timeoutMs || 12000);
    try {
      const ctx = engine.context(question, 6);
      const res = await fetch(K.remote.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          lang: LANG,
          context: ctx,
          history: history.slice(-6).map(h => ({ role: h.role, text: h.role === 'ai' ? h.text : h.text })),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      if (!data || !data.text) throw new Error('empty');
      const out = Object.assign({}, local, { text: data.text, remote: true });
      const refs = (data.refs || []).map(i => ctx[i]).filter(Boolean);
      if (refs.length && (local.kind === 'none' || local.kind === 'search')) {
        out.blocks = refs.slice(0, 2).map(r => engine.excerpt(r.file, r.id)).filter(Boolean);
        out.focus = { file: refs[0].file, id: refs[0].id };
        out.kind = 'search';
        out.mood = 'neutral';
      }
      return out;
    } catch {
      return local;
    } finally {
      clearTimeout(timer);
    }
  }

  function perform(answer, { record = true } = {}) {
    if (answer.topic !== undefined) topic = answer.topic;
    if (record) {
      history.push({ role: 'ai', text: answer.text });
      history = history.slice(-12);
    }
    store.set('sessionStorage', KEY, { history, topic, suggestions: answer.suggestions || [] });
    renderSuggestions(answer.suggestions);
    stage.play(buildScene(answer));
    if (answer.dock) setTimeout(closeDock, 2400);
  }

  function restore() {
    const saved = store.get('sessionStorage', KEY);
    if (!saved) return;
    history = saved.history || [];
    topic = saved.topic || null;
    renderSuggestions(saved.suggestions);
  }

  function announce(text) {
    el.live.textContent = text;
    if (voiceOn) speak(text);
  }

  function renderSuggestions(list) {
    el.suggest.innerHTML = (list || [])
      .slice(0, 4)
      .map(s => `<button type="button" class="atom-laiya-chip" data-ask="${esc(s)}">${esc(s)}</button>`)
      .join('');
  }

  /* -------------------------------------------------------------- escenas */

  // Cada cosa que LAIYA señala tiene su forma, ligada a su tema: el enjambre
  // se convierte en lo que cuenta (ver js/laiya-avatar.js). `text:…` es texto
  // hecho de partículas, con la letra de display del sitio.
  const SHAPE_BY_FILE = {
    'case-42ds.html': 'text:42', // el nombre del sistema
    'case-sport.html': 'bars', // las cuatro cifras de la investigación
    'case-map.html': 'spain', // la geometría real del IGN
    'case-worldcup.html': 'ball', // un balón: icosaedro truncado
    'case-atlas.html': 'globe', // un atlas
    'case-illustrations.html': 'pencil',
  };
  const SHAPE_BY_INTENT = {
    greet: 'sphere',
    identity: 'text:LAIYA',
    person: 'text:JLP',
    projects: 'stack',
    selfDirected: 'network',
    career: 'stairs',
    tools: 'grid',
    ai: 'neural',
    accessibility: 'access',
    systems: 'stack',
    contact: 'envelope',
    hire: 'envelope',
    cv: 'page',
    location: 'pin',
    languages: 'text:ES · EN',
    education: 'cap',
    thanks: 'sphere',
    bye: 'sphere',
    help: 'text:?',
    destroy: 'cloud',
  };

  // Cada respuesta se traduce a pasos sobre el DOM de ESTA página: qué nodo,
  // qué se dice, qué forma toma el enjambre y qué efectos se le aplican a la
  // página. Si lo que se pregunta no está aquí, el paso no lleva nodo:
  // LAIYA lo cuenta desde el centro con tarjetas y ofrece llevarte (portal).
  // Qué recorrido cuenta cada intención. Los recorridos los declara el HTML
  // (`data-laiya-tour`, ver scripts/laiya.anchors.mjs) y su texto viene de
  // assets/laiya/tour-*.json: aquí solo se elige cuál.
  const TOUR_OF = { projects: 'projects', selfDirected: 'selfDirected', career: 'career', tools: 'tools', ai: 'ai', person: 'person', contact: 'contact', hire: 'contact' };
  // Un caso contado en la propia página: la apertura y, como mucho, cinco
  // secciones, las que traen cifras o resultados primero (en su orden).
  const CASE_TOUR_MAX = 6;

  function buildScene(a) {
    const frame = id => stage.frameFor(id);
    const steps = [];
    const base = SHAPE_BY_INTENT[a.intent] || (a.focus && SHAPE_BY_FILE[a.focus.file]) || 'octa';
    const add = step => step && step.node && steps.push(step);
    const slug = f => (f || '').replace(/^case-|\.html$/g, '');

    // Un paso a partir de un ancla `data-laiya`: el nodo que se encuadra, lo
    // que dice (su ficha del recorrido, o el texto que se le pase) y la forma
    // y los efectos que declara el propio HTML.
    const fromAnchor = (id, over = {}) => {
      const node = document.querySelector(`[data-laiya="${CSS.escape(id)}"]`);
      if (!node) return null;
      const e = guide && guide.entry(id);
      const d = node.dataset;
      // Una sección se encuadra por su titular: entera si cabe; si no, el
      // mayor bloque que quepa alrededor de él.
      const labelled = node.getAttribute('aria-labelledby');
      const target = d.laiyaKind === 'section' && labelled ? frame(labelled) : node;
      return {
        node: target,
        anchor: id,
        text: over.text != null ? over.text : (e && e.say) || '',
        blocks: over.blocks || [],
        shape: over.shape || d.laiyaShape || (e && e.case && SHAPE_BY_FILE[e.case]) || base,
        fx: over.fx || (d.laiyaFx ? d.laiyaFx.split(/\s+/) : []),
      };
    };
    const tourSteps = (name, first = {}) => (guide ? guide.ids(name) : []).map((id, i) => fromAnchor(id, i === 0 ? first : {})).filter(Boolean);

    if (a.intent === 'destroy') {
      return { steps: [{ node: null, text: a.text, after: a.after, blocks: [], shape: 'cloud', special: 'gravity' }], mood: 'happy' };
    }

    if (a.kind === 'intent' && TOUR_OF[a.intent]) {
      const first = { text: a.text, shape: base };
      if (a.intent === 'person') first.blocks = (a.blocks || []).filter(b => b.type === 'quote');
      steps.push(...tourSteps(TOUR_OF[a.intent], first));
    } else if (a.kind === 'intent') {
      if (a.intent === 'cv') add(fromAnchor('contact.links', { text: a.text }));
      else if (['location', 'languages', 'education'].includes(a.intent)) add(fromAnchor(`about.${a.intent}`, { text: a.text }));
      else if (a.intent === 'accessibility' || a.intent === 'systems')
        add(fromAnchor('project.42ds', { text: a.text, blocks: (a.blocks || []).filter(b => b.type === 'excerpt'), shape: a.intent === 'accessibility' ? 'access' : 'stack', fx: ['blueprint', 'marks'] }));
    }

    if (!steps.length && a.kind === 'project' && a.focus) {
      const shape = SHAPE_BY_FILE[a.focus.file] || base;
      if (a.focus.file === FILE) {
        // El caso en el que ya está: la apertura y lo que más cuenta de él.
        const ids = guide ? guide.ids('case') : [];
        const weight = id => {
          const t = ((guide.entry(id) || {}).s || []).map(x => x[1] || '').join(' ');
          return (/\bresult\b/.test(t) ? 2 : 0) + (/\bnumbers\b/.test(t) ? 1 : 0);
        };
        const chosen = ids.slice(1).map((id, i) => [id, i, weight(id)]).sort((x, y) => y[2] - x[2] || x[1] - y[1]).slice(0, CASE_TOUR_MAX - 1).sort((x, y) => x[1] - y[1]).map(x => x[0]);
        add(fromAnchor('case', { text: a.text, shape }) || { node: frame(document.querySelector('h1') && document.querySelector('h1').id), text: a.text, blocks: [], shape, fx: ['kinetic', 'marks'] });
        for (const id of chosen) add(fromAnchor(id, { shape }));
      } else add(fromAnchor(`project.${slug(a.focus.file)}`, { text: a.text, blocks: (a.blocks || []).map(b => (b.type === 'project' ? { ...b, compact: true } : b)), shape, fx: ['scatter', 'tilt'] }));
    }

    if (!steps.length && (a.kind === 'section' || a.kind === 'search') && a.focus && a.focus.id) {
      // Si lo que se cuenta gira en torno a una cifra, el enjambre se
      // convierte en ella («86 %»); si no, en la forma del caso.
      const figure = (((a.blocks || [])[0] || {}).text || '').match(/\d+(?:[.,]\d+)?\s?%/);
      if (a.focus.file === FILE) {
        const id = `section.${a.focus.id.replace(/-title$/, '')}`;
        const shape = figure ? 'text:' + figure[0] : SHAPE_BY_FILE[FILE] || 'octa';
        add(fromAnchor(id, { text: a.text, shape }) || { node: frame(a.focus.id), anchor: id, text: a.text, blocks: [], shape, fx: ['kinetic', 'marks'] });
        const more = (a.blocks || []).slice(1);
        if (steps.length && more.length) steps.push({ node: null, text: '', blocks: more, shape: SHAPE_BY_FILE[FILE] || 'octa' });
      } else {
        // Vive en un caso cuya tarjeta está en esta página: se señala la
        // tarjeta y el extracto va en el subtítulo, con su enlace al caso.
        add(fromAnchor(`project.${slug(a.focus.file)}`, { text: a.text, blocks: (a.blocks || []).slice(0, 1), shape: figure ? 'text:' + figure[0] : SHAPE_BY_FILE[a.focus.file] || base, fx: ['scatter', 'tilt'] }));
      }
    }

    if (!steps.length) {
      const blocks = [...(a.blocks || [])];
      // Lo que vive en otra página: una puerta para ir.
      if (a.focus && a.focus.file !== FILE && !blocks.some(b => b.type === 'excerpt' || b.type === 'project'))
        blocks.push({ type: 'goto', file: a.focus.file, id: a.focus.id });
      const sorry = a.kind === 'none';
      steps.push({ node: null, text: a.text, blocks, shape: sorry ? 'text:?' : base, fx: sorry ? ['tremble'] : [] });
    }
    // Un texto que anuncia algo con «:» y no lleva bloques detrás apunta a lo
    // que está iluminado en la página: se cierra con punto para que no
    // parezca cortado («Su postura, en sus palabras.»).
    for (const s of steps) if (s.node && !(s.blocks && s.blocks.length) && /:\s*$/.test(s.text || '')) s.text = s.text.replace(/:\s*$/, '.');
    return { steps: steps.filter(s => s.text || s.blocks.length), mood: a.mood };
  }

  /* ----------------------------------------------------------- navegación */

  function goTo(file, id) {
    track('laiya_goto', { from: FILE, to: file, section: id || '' });
    if (file === FILE) {
      const node = id ? stage.frameFor(id) : document.querySelector('h1');
      const text = (node && (node.querySelector('h1, h2, h3') || node).textContent.trim()) || '';
      stage.play({ steps: [{ node, text, blocks: [] }] });
      return;
    }
    // A otra página: la conversación viaja en sessionStorage, y al llegar la
    // escena sigue donde estaba.
    store.set('sessionStorage', KEY + ':resume', { focus: id || null });
    stage.portalOut(pageHref(file, id));
  }

  /* ------------------------------------------------------------- bloques */

  function sourceLabel(selfDirected) {
    return selfDirected ? `<span class="atom-laiya-tag atom-laiya-tag--own">${esc(K.ui.selfDirected)}</span>` : '';
  }

  function renderBlock(b) {
    const U = K.ui;
    switch (b.type) {
      case 'quote':
        return `<blockquote class="mol-laiya-quote"><p>${esc(b.text)}</p><footer>${esc(b.cite)}</footer></blockquote>`;

      case 'person':
      case 'facts':
        return `<dl class="mol-laiya-facts">${(b.facts || b.items || []).map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>`;

      case 'projects':
        return `<ul class="mol-laiya-projects">${b.items
          .map(
            p => `<li><a class="mol-laiya-project" href="${esc(pageHref(p.file))}" data-goto="${esc(p.file)}">
  <img src="${esc(asset(p.image))}" alt="" width="1200" height="630" loading="lazy" decoding="async">
  <span class="mol-laiya-project__body">
    <span class="mol-laiya-project__register">${esc(p.capability ? p.capability.register : '')}${sourceLabel(p.selfDirected)}</span>
    <b>${esc(p.name)}</b>
  </span></a></li>`,
          )
          .join('')}</ul>`;

      case 'project': {
        const p = b.item;
        return `<div class="mol-laiya-case">
  ${b.compact ? '' : `<a class="mol-laiya-case__visual" href="${esc(pageHref(p.file))}" data-goto="${esc(p.file)}"><img src="${esc(asset(p.image))}" alt="${esc(p.headline)}" width="1200" height="630" loading="lazy" decoding="async"></a>`}
  <p class="mol-laiya-case__kicker">${esc(p.capability ? p.capability.register + ' · ' + p.name : p.name)}${sourceLabel(p.selfDirected)}</p>
  <blockquote class="mol-laiya-quote mol-laiya-quote--plain"><p>${esc(p.description)}</p></blockquote>
  ${
    b.sections && b.sections.length
      ? `<ul class="mol-laiya-chips">${b.sections
          .slice(0, 4)
          .map(s => `<li><a class="atom-laiya-chip" href="${esc(pageHref(p.file, s.id))}" data-goto="${esc(p.file + '#' + s.id)}">${esc(s.label)}</a></li>`)
          .join('')}</ul>`
      : ''
  }
  <a class="atom-cta mol-laiya-case__cta" href="${esc(pageHref(p.file))}" data-goto="${esc(p.file)}">${esc(U.open)} ${ICON.arrow}</a>
</div>`;
      }

      case 'excerpt': {
        const here = b.file === FILE;
        return `<div class="mol-laiya-excerpt">
  <p class="mol-laiya-excerpt__source">${esc(b.page)}${b.kicker ? ' · ' + esc(b.kicker) : ''}${sourceLabel(b.selfDirected)}</p>
  <p class="mol-laiya-excerpt__title">${esc(b.title)}</p>
  <blockquote class="mol-laiya-quote mol-laiya-quote--plain"><p>${esc(b.text)}</p></blockquote>
  <a class="atom-text-link mol-laiya-excerpt__go" href="${esc(pageHref(b.file, b.id))}" data-goto="${esc(b.file + (b.id ? '#' + b.id : ''))}">${esc(here ? U.showOnPage : U.goTo)} ${ICON.arrow}</a>
</div>`;
      }

      case 'timeline':
        return `<ol class="mol-laiya-timeline">${b.items
          .map(
            (s, i) => `<li style="--laiya-step:${i}">
  <p class="mol-laiya-timeline__when">${esc(s.when)}</p>
  <p class="mol-laiya-timeline__org"><b>${esc(s.org)}</b> <span>${esc(s.scope)}</span></p>
</li>`,
          )
          .join('')}</ol>`;

      case 'tools':
        return `<div class="mol-laiya-tools">${b.tools
          .map(g => `<div class="mol-laiya-tools__group"><p>${esc(g.group)}</p><ul class="mol-laiya-chips">${g.items.map(t => `<li><span class="atom-laiya-chip atom-laiya-chip--static">${esc(t)}</span></li>`).join('')}</ul></div>`)
          .join('')}</div>`;

      case 'contact': {
        const rows = [];
        if (!b.only || b.only === 'email')
          rows.push(`<li><a href="mailto:${esc(b.email)}"><span class="mol-laiya-contact__label">Email</span><span class="mol-laiya-contact__value">${esc(b.email)}</span>${ICON.arrow}</a></li>`);
        if (!b.only)
          rows.push(`<li><a href="${esc(b.linkedin)}" rel="noopener" target="_blank"><span class="mol-laiya-contact__label">LinkedIn</span><span class="mol-laiya-contact__value">${esc(b.linkedin.replace(/^https:\/\/www\./, ''))}</span>${ICON.arrow}</a></li>`);
        if (!b.only || b.only === 'cv')
          rows.push(`<li><a href="${esc(asset(b.cv))}" type="application/pdf" download><span class="mol-laiya-contact__label">CV</span><span class="mol-laiya-contact__value">PDF</span>${ICON.arrow}</a></li>`);
        return `<ul class="mol-laiya-contact">${rows.join('')}</ul>`;
      }

      case 'goto':
        return `<a class="atom-cta" href="${esc(pageHref(b.file, b.id))}" data-goto="${esc(b.file + (b.id ? '#' + b.id : ''))}">${esc(U.goTo)} ${ICON.arrow}</a>`;

      default:
        return '';
    }
  }

  /* ---------------------------------------------------------------- voz */

  function syncVoice() {
    const U = K.ui;
    el.voice.setAttribute('aria-pressed', String(voiceOn));
    el.voice.setAttribute('aria-label', voiceOn ? U.voiceOff : U.voiceOn);
    el.voice.title = voiceOn ? U.voiceOff : U.voiceOn;
  }

  function toggleVoice() {
    voiceOn = !voiceOn;
    store.set('localStorage', 'laiya:voice', voiceOn);
    if (!voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel();
    syncVoice();
  }

  function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = K.ui.locale;
    const voices = speechSynthesis.getVoices();
    const want = K.ui.locale.toLowerCase();
    u.voice = voices.find(v => v.lang.toLowerCase() === want) || voices.find(v => v.lang.toLowerCase().startsWith(want.slice(0, 2))) || null;
    u.rate = 1.02;
    u.onboundary = () => orb && orb.pulse(0.9);
    speechSynthesis.speak(u);
  }

  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recognition) return recognition.stop();
    recognition = new SR();
    recognition.lang = K.ui.locale;
    recognition.interimResults = true;
    let finalText = '';
    el.mic.setAttribute('aria-pressed', 'true');
    el.mic.setAttribute('aria-label', K.ui.micStop);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setState('listening');
    recognition.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      el.input.value = (finalText + interim).trim();
      if (orb) orb.pulse(0.7);
    };
    recognition.onend = () => {
      recognition = null;
      el.mic.setAttribute('aria-pressed', 'false');
      el.mic.setAttribute('aria-label', K.ui.mic);
      if (state === 'listening') setState('idle');
      const q = finalText.trim();
      if (q) ask(q);
    };
    recognition.onerror = () => {};
    try {
      recognition.start();
    } catch {
      recognition = null;
      setState('idle');
    }
  }

  /* ------------------------------------------------------------- retorno */

  // Si se llegó aquí desde la propia capa: el portal se cierra sobre el orbe
  // y la escena sigue con la sección que se pidió.
  const resume = store.get('sessionStorage', KEY + ':resume');
  if (resume) {
    // La pantalla llega tapada —el portal sigue cerrado— hasta que el orbe
    // está listo para abrirlo; sin esto se ve un instante la página desnuda.
    document.documentElement.classList.add('syx-laiya-arriving');
    store.drop('sessionStorage', KEY + ':resume');
    load()
      .then(async () => {
        await openDock({ greet: false });
        const opening = stage.portalIn();
        document.documentElement.classList.remove('syx-laiya-arriving');
        await opening;
        if (resume.focus) goTo(FILE, resume.focus);
        else stage.wake();
      })
      .catch(() => document.documentElement.classList.remove('syx-laiya-arriving'));
  }
})();
