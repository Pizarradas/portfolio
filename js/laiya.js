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
        loadScript('js/laiya-engine.js', () => window.LaiyaEngine),
        loadScript('js/laiya-stage.js', () => window.LaiyaStage),
        loadScript('js/laiya-fx.js', () => window.LaiyaFx),
        // GSAP ya está en la home y en algunos casos; si no, se pide aquí.
        loadScript('js/vendor/gsap.min.js', () => window.gsap),
      ])
        .then(([k]) => {
          K = k;
          engine = window.LaiyaEngine.create(K);
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
    el.input.placeholder = U.placeholder;
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

  window.addEventListener(
    'pointermove',
    e => {
      if (!orb || !stage) return;
      const r = stage.body.getBoundingClientRect();
      orb.look((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -(e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
    },
    { passive: true },
  );

  function setState(next) {
    state = next;
    dock.dataset.state = next;
    if (stage) stage.body.dataset.state = next;
    if (orb) orb.setState(next);
  }

  /* -------------------------------------------------------- conversación */

  async function ask(question) {
    if (busy) return;
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
  const yearOf = s => ((s && s.when) || '').match(/\d{4}/)?.[0];

  // Cada respuesta se traduce a pasos sobre el DOM de ESTA página: qué nodo,
  // qué se dice, qué forma toma el enjambre y qué efectos se le aplican a la
  // página. Si lo que se pregunta no está aquí, el paso no lleva nodo:
  // LAIYA lo cuenta desde el centro con tarjetas y ofrece llevarte (portal).
  function buildScene(a) {
    const $ = s => document.querySelector(s);
    const $$ = s => [...document.querySelectorAll(s)];
    const frame = id => stage.frameFor(id);
    const steps = [];
    const base = SHAPE_BY_INTENT[a.intent] || (a.focus && SHAPE_BY_FILE[a.focus.file]) || 'octa';
    const add = (node, text, { blocks = [], shape = base, fx = [] } = {}) => node && steps.push({ node, text, blocks, shape, fx });
    const onHome = FILE === 'index.html';
    const items = ((a.blocks || []).find(b => b.type === 'projects') || { items: [] }).items;
    const byFile = Object.fromEntries(K.pages.filter(p => p.file !== 'index.html').map(p => [p.file, p]));
    const teaser = p => (p.description.match(/^.+?[.!?](?=\s|$)/) || [p.description])[0];
    const cardFor = file =>
      ($(`#work a[href="${file}"]`) || {}).closest?.('article') ||
      ($(`.org-new-work a[href="${file}"]`) || {}).closest?.('article') ||
      ($(`.org-illustration-showcase a[href="${file}"]`) || {}).closest?.('section') ||
      null;
    // Los nodos de un recorrido van en el orden del documento: la cámara
    // baja por la página, no salta arriba y abajo.
    const inOrder = list => list.sort((x, y) => (x.node.compareDocumentPosition(y.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

    if (a.intent === 'destroy') {
      return { steps: [{ node: null, text: a.text, after: a.after, blocks: [], shape: 'cloud', special: 'gravity' }], mood: 'happy' };
    }

    if (a.kind === 'intent' && onHome) {
      switch (a.intent) {
        case 'projects':
        case 'selfDirected': {
          const list = [];
          const files = (items.length ? items : Object.values(byFile)).map(p => p.file);
          const seen = new Set();
          for (const f of files) {
            const node = cardFor(f);
            if (!node || seen.has(node)) continue;
            seen.add(node);
            const p = byFile[f];
            list.push({
              node,
              text: `${p.name}${p.selfDirected ? ' — ' + K.ui.selfDirected : ''}. ${teaser(p)}`,
              blocks: [],
              shape: SHAPE_BY_FILE[f] || 'cube',
              fx: ['scatter', 'marks', 'tilt'],
            });
          }
          add(a.intent === 'projects' ? $('#work .mol-section-heading') : $('.org-new-work .mol-section-heading') || frame('new-work-title'), a.text, { fx: ['kinetic'] });
          steps.push(...inOrder(list));
          break;
        }
        case 'person': {
          add(frame('about-title'), a.text, { blocks: (a.blocks || []).filter(b => b.type === 'quote'), fx: ['kinetic'] });
          const facts = K.person.facts.map(f => `${f.label}: ${f.value}`).join('. ') + '.';
          add($('.mol-about-facts'), facts, { shape: 'pin', fx: ['blueprint'] });
          break;
        }
        case 'career': {
          add($('.org-role-evolution-v22__intro') || frame('role-evolution-title'), a.text, { fx: ['kinetic'] });
          $$('.mol-career-role').forEach((node, i) => {
            const s = K.career[i];
            // Cada etapa, con su año hecho de partículas.
            if (s) add(node, `${s.org}, ${s.when}. ${s.role}.`, { shape: yearOf(s) ? 'text:' + yearOf(s) : 'stairs', fx: ['scatter', 'marks'] });
          });
          break;
        }
        case 'tools': {
          add(frame('tools-title'), a.text, { fx: ['kinetic'] });
          add($('.mol-practice-list'), K.practice.map(p => p.name).join(' · ') + '.', { shape: 'text:{ }', fx: ['marks', 'tilt'] });
          add($('.org-stack__marks'), K.tools.map(g => `${g.group}: ${g.items.join(', ')}`).join('. ') + '.', { fx: ['blueprint'] });
          break;
        }
        case 'contact':
        case 'hire':
          add($('.org-contact__body') || frame('contact-title'), a.text, { fx: ['kinetic'] });
          add($('.mol-contact-list'), K.person.contact.email, { shape: 'text:@', fx: ['tilt'] });
          break;
        case 'cv':
          add($('.mol-contact-list'), a.text, { fx: ['tilt'] });
          break;
        case 'ai': {
          add(frame('thesis-title'), a.text, { fx: ['kinetic'] });
          const atlas = byFile['case-atlas.html'];
          if (atlas) add(cardFor(atlas.file), `${atlas.name} — ${K.ui.selfDirected}. ${teaser(atlas)}`, { shape: 'globe', fx: ['scatter', 'tilt'] });
          break;
        }
        case 'location':
        case 'languages':
        case 'education': {
          const i = { location: 1, languages: 2, education: 3 }[a.intent];
          add($(`.mol-about-facts > div:nth-child(${i})`), a.text, { fx: ['blueprint'] });
          break;
        }
        case 'accessibility':
        case 'systems':
          add(cardFor('case-42ds.html'), a.text, { blocks: (a.blocks || []).filter(b => b.type === 'excerpt'), shape: a.intent === 'accessibility' ? 'access' : 'stack', fx: ['blueprint', 'marks'] });
          break;
      }
    }

    if (!steps.length && a.kind === 'project' && a.focus) {
      const shape = SHAPE_BY_FILE[a.focus.file] || base;
      if (a.focus.file === FILE) add($('.org-case-opener') || frame($('h1') && $('h1').id), a.text, { shape, fx: ['kinetic', 'marks'] });
      else if (onHome) add(cardFor(a.focus.file), a.text, { blocks: (a.blocks || []).map(b => (b.type === 'project' ? { ...b, compact: true } : b)), shape, fx: ['scatter', 'tilt'] });
    }

    if (!steps.length && (a.kind === 'section' || a.kind === 'search') && a.focus && a.focus.file === FILE && a.focus.id) {
      // Si la sección gira en torno a una cifra, el enjambre se convierte en
      // ella («86 %»); si no, en la forma del caso.
      const figure = (((a.blocks || [])[0] || {}).text || '').match(/\d+(?:[.,]\d+)?\s?%/);
      add(frame(a.focus.id), a.text, { shape: figure ? 'text:' + figure[0] : SHAPE_BY_FILE[FILE] || 'octa', fx: ['kinetic', 'marks'] });
      const more = (a.blocks || []).slice(1);
      if (more.length) steps.push({ node: null, text: '', blocks: more, shape: SHAPE_BY_FILE[FILE] || 'octa' });
    }

    if (!steps.length) {
      const blocks = [...(a.blocks || [])];
      // Lo que vive en otra página: una puerta para ir.
      if (a.focus && a.focus.file !== FILE && !blocks.some(b => b.type === 'excerpt' || b.type === 'project'))
        blocks.push({ type: 'goto', file: a.focus.file, id: a.focus.id });
      const sorry = a.kind === 'none';
      steps.push({ node: null, text: a.text, blocks, shape: sorry ? 'text:?' : base, fx: sorry ? ['tremble'] : [] });
    }
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
