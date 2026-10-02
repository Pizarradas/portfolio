/* LAI-YA — la capa.
 *
 * Convierte la página en una conversación: un botón flotante abre una capa
 * sobre el sitio, el visitante pregunta y LAI-YA responde enseñando el
 * contenido que ya existe — tarjetas de caso, citas, la trayectoria, el
 * contacto — y, cuando hace falta, lleva hasta la sección exacta de la página.
 *
 * Tres piezas, en tres ficheros:
 *   js/laiya.js          esta capa: interfaz, voz, navegación, memoria de sesión
 *   js/laiya-engine.js   el motor local (intenciones + búsqueda)
 *   js/laiya-avatar.js   el orbe en Three.js, módulo ES cargado al abrir
 * y una base de conocimiento generada desde las propias páginas:
 *   assets/laiya/knowledge-{en,es}.json   ← npm run build:laiya
 *
 * Dos modos:
 *   open   la capa cubre la página; diálogo modal, foco atrapado
 *   dock   la capa se encoge a una barra y la página queda a la vista; las
 *          respuestas con sección asociada la señalan en la propia página
 *
 * Coste en la carga: este fichero y nada más. El conocimiento se pide al
 * acercarse al botón, el motor al abrir y Three.js cuando el orbe se pinta.
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
  const MAX_HISTORY = 14;

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
  };

  const track = (name, params) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  };

  const esc = s =>
    String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const asset = path => new URL(path, ROOT).href;
  // Las páginas viven en la raíz y en es/; un enlace a un caso es relativo al
  // directorio actual, así que funciona igual desde los dos idiomas.
  const pageHref = (file, id) => (file === 'index.html' ? './' : file) + (id ? '#' + id : '');

  const ICON = {
    voice: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    clear: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
    dock: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 19h14M8 13l4 4 4-4M12 5v12"/></svg>',
    expand: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 5h14M8 11l4-4 4 4M12 19V7"/></svg>',
    close: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    mic: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    send: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrow: '<svg aria-hidden="true" class="atom-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };

  /* ------------------------------------------------------------- estado */

  let K = null;
  let engine = null;
  let orb = null;
  let layer = null;
  let el = {};
  let mode = 'closed';
  let state = 'idle';
  let topic = null;
  let history = [];
  let busy = false;
  let lastFocus = null;
  let recognition = null;
  let voiceOn = !!store.get('localStorage', 'laiya:voice');
  let knowledgeLoading = null;

  /* ------------------------------------------------------------ lanzador */

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'atom-laiya-launcher syx-on-night';
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML = `<span class="atom-laiya-orb" aria-hidden="true"></span><span class="atom-laiya-launcher__label">${esc(script.dataset.label || 'Ask LAI-YA')}</span>`;
  document.body.appendChild(launcher);

  const loadScript = src =>
    new Promise((resolve, reject) => {
      if (window.LaiyaEngine) return resolve();
      const s = document.createElement('script');
      s.src = asset(src);
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  function loadKnowledge() {
    if (!knowledgeLoading)
      knowledgeLoading = Promise.all([
        fetch(asset(`assets/laiya/knowledge-${LANG}.json`), { credentials: 'same-origin' }).then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        }),
        loadScript('js/laiya-engine.js'),
      ])
        .then(([k]) => {
          K = k;
          engine = window.LaiyaEngine.create(K);
          return K;
        })
        .catch(err => {
          knowledgeLoading = null;
          throw err;
        });
    return knowledgeLoading;
  }

  // Precarga en cuanto hay intención: a 60 KB, adelantarla al hover hace que
  // la capa abra sin espera visible.
  ['pointerenter', 'focus', 'touchstart'].forEach(ev => launcher.addEventListener(ev, () => loadKnowledge().catch(() => {}), { once: true, passive: true }));
  launcher.addEventListener('click', () => open('open'));

  /* --------------------------------------------------------------- capa */

  function build() {
    const U = K.ui;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    layer = document.createElement('div');
    layer.className = 'org-laiya';
    layer.id = 'laiya';
    layer.hidden = true;
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-labelledby', 'laiya-title');
    layer.dataset.state = 'idle';
    layer.innerHTML = `
<div class="org-laiya__veil" data-laiya="close-veil"></div>
<section class="org-laiya__panel syx-on-night">
  <header class="org-laiya__bar">
    <p class="org-laiya__name" id="laiya-title"><b>${esc(U.title)}</b><span>${esc(U.subtitle)}</span></p>
    <div class="org-laiya__tools">
      <button type="button" class="atom-laiya-tool" data-laiya="voice" aria-pressed="${voiceOn}" aria-label="${esc(U.voiceOn)}" title="${esc(U.voiceOn)}">${ICON.voice}</button>
      <button type="button" class="atom-laiya-tool" data-laiya="clear" aria-label="${esc(U.clear)}" title="${esc(U.clear)}">${ICON.clear}</button>
      <button type="button" class="atom-laiya-tool" data-laiya="dock" aria-label="${esc(U.dock)}" title="${esc(U.dock)}">${ICON.dock}</button>
      <button type="button" class="atom-laiya-tool" data-laiya="expand" aria-label="${esc(U.expand)}" title="${esc(U.expand)}">${ICON.expand}</button>
      <button type="button" class="atom-laiya-tool" data-laiya="close" aria-label="${esc(U.close)}" title="${esc(U.close)}">${ICON.close}</button>
    </div>
  </header>
  <div class="org-laiya__stage">
    <div class="org-laiya__orb"><span class="atom-laiya-orb" aria-hidden="true"></span><canvas aria-hidden="true"></canvas></div>
    <p class="org-laiya__status" role="status">${esc(U.states.idle)}</p>
  </div>
  <div class="org-laiya__log" aria-live="polite"></div>
  <div class="mol-laiya-suggest"></div>
  <form class="mol-laiya-composer" autocomplete="off">
    <input class="mol-laiya-composer__input" type="text" name="q" maxlength="300" enterkeyhint="send" aria-label="${esc(U.inputLabel)}" placeholder="${esc(U.placeholder)}">
    ${SR ? `<button type="button" class="atom-laiya-tool" data-laiya="mic" aria-pressed="false" aria-label="${esc(U.mic)}" title="${esc(U.mic)}">${ICON.mic}</button>` : ''}
    <button type="submit" class="atom-laiya-tool atom-laiya-tool--send" aria-label="${esc(U.send)}" title="${esc(U.send)}">${ICON.send}</button>
  </form>
</section>`;
    document.body.appendChild(layer);

    el = {
      panel: layer.querySelector('.org-laiya__panel'),
      canvas: layer.querySelector('canvas'),
      status: layer.querySelector('.org-laiya__status'),
      log: layer.querySelector('.org-laiya__log'),
      suggest: layer.querySelector('.mol-laiya-suggest'),
      form: layer.querySelector('form'),
      input: layer.querySelector('input'),
      voice: layer.querySelector('[data-laiya="voice"]'),
      mic: layer.querySelector('[data-laiya="mic"]'),
    };

    layer.addEventListener('click', onLayerClick);
    layer.addEventListener('keydown', onKeydown);
    el.form.addEventListener('submit', e => {
      e.preventDefault();
      const q = el.input.value.trim();
      if (q) ask(q);
    });
    window.addEventListener('pointermove', onPointer, { passive: true });
    syncVoiceButton();
  }

  function onLayerClick(e) {
    const t = e.target.closest('[data-laiya], [data-ask], [data-goto]');
    if (!t) return;
    if (t.dataset.ask) return ask(t.dataset.ask);
    if (t.dataset.goto) {
      e.preventDefault();
      const [file, id] = t.dataset.goto.split('#');
      return goTo(file, id || null);
    }
    const action = t.dataset.laiya;
    if (action === 'close' || action === 'close-veil') close();
    else if (action === 'dock') setMode('dock');
    else if (action === 'expand') setMode('open');
    else if (action === 'clear') reset();
    else if (action === 'voice') toggleVoice();
    else if (action === 'mic') listen();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (recognition) return recognition.abort();
      return close();
    }
    if (e.key !== 'Tab' || mode !== 'open') return;
    // Foco atrapado en modo abierto: es un diálogo modal.
    const f = [...el.panel.querySelectorAll('button:not([hidden]), a[href], input')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onPointer(e) {
    if (!orb || mode === 'closed') return;
    const r = el.canvas.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    orb.look((e.clientX - cx) / (window.innerWidth / 2), -(e.clientY - cy) / (window.innerHeight / 2));
  }

  /* -------------------------------------------------------------- modos */

  async function open(nextMode = 'open', { silent = false } = {}) {
    try {
      await loadKnowledge();
    } catch {
      launcher.dataset.error = 'true';
      return;
    }
    if (!layer) build();
    if (mode === 'closed') {
      lastFocus = document.activeElement;
      restore();
      if (!history.length) respond(engine.answer('', { currentFile: FILE }), { record: true, instant: silent });
      if (!silent) track('laiya_open', { page: FILE });
    }
    layer.hidden = false;
    launcher.hidden = true;
    launcher.setAttribute('aria-expanded', 'true');
    setMode(nextMode);
    loadOrb();
  }

  function setMode(next) {
    mode = next;
    layer.dataset.mode = next;
    layer.setAttribute('aria-modal', next === 'open' ? 'true' : 'false');
    document.documentElement.classList.toggle('syx-laiya-lock', next === 'open');
    layer.querySelector('[data-laiya="dock"]').hidden = next !== 'open';
    layer.querySelector('[data-laiya="expand"]').hidden = next === 'open';
    if (orb) requestAnimationFrame(() => orb.resize());
    if (next === 'open') requestAnimationFrame(() => el.input.focus({ preventScroll: true }));
    scrollLog();
  }

  function close() {
    if (!layer) return;
    if (recognition) recognition.abort();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    mode = 'closed';
    layer.hidden = true;
    layer.dataset.mode = 'closed';
    document.documentElement.classList.remove('syx-laiya-lock');
    launcher.hidden = false;
    launcher.setAttribute('aria-expanded', 'false');
    setState('idle');
    (lastFocus && document.contains(lastFocus) ? lastFocus : launcher).focus({ preventScroll: true });
  }

  function setState(next) {
    state = next;
    if (!layer) return;
    layer.dataset.state = next;
    el.status.textContent = K.ui.states[next] || '';
    if (orb) orb.setState(next);
  }

  function loadOrb() {
    if (orb || layer.dataset.orb) return;
    layer.dataset.orb = 'loading';
    import(asset('js/laiya-avatar.js'))
      .then(m => {
        orb = m.createOrb(el.canvas, { tokensFrom: el.panel, reducedMotion: REDUCED.matches });
        if (!orb) throw new Error('webgl');
        layer.dataset.orb = 'webgl';
        orb.setState(state);
      })
      .catch(() => {
        // Sin WebGL o sin módulos: se queda el orbe de CSS, que ya estaba.
        layer.dataset.orb = 'css';
      });
  }

  /* ------------------------------------------------------- conversación */

  function context() {
    return { currentFile: FILE, topic, greeted: history.some(h => h.role === 'ai') };
  }

  async function ask(question) {
    if (busy) return;
    busy = true;
    el.input.value = '';
    layer.removeAttribute('data-fresh');
    renderUser(question);
    history.push({ role: 'user', text: question });
    setState('thinking');
    el.suggest.innerHTML = '';

    let answer = engine.answer(question, context());
    track('laiya_question', { kind: answer.kind || 'intent', intent: answer.intent || '', page: FILE });

    const remote = K.remote && K.remote.endpoint;
    const fixed = answer.kind === 'intent' && answer.intent !== 'person';
    const started = performance.now();
    if (remote && !fixed) answer = await askRemote(question, answer);

    // Un instante de «pensar» aunque el motor local responda en un
    // milisegundo: sin él la respuesta aparece antes de que se lea la pregunta.
    const beat = REDUCED.matches ? 150 : 520;
    const wait = beat - (performance.now() - started);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));

    respond(answer, { record: true });
    busy = false;
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
          history: history.slice(-6).map(h => ({ role: h.role, text: h.role === 'ai' ? h.answer.text : h.text })),
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
        out.mood = 'neutral';
      }
      return out;
    } catch {
      return local;
    } finally {
      clearTimeout(timer);
    }
  }

  function respond(answer, { record = false, instant = false } = {}) {
    if (answer.topic !== undefined) topic = answer.topic;
    if (record) {
      history.push({ role: 'ai', answer });
      history = history.slice(-MAX_HISTORY);
      persist();
    }
    const node = renderAnswer(answer, { instant });
    renderSuggestions(answer.suggestions);
    if (orb && answer.mood) orb.setMood(answer.mood);
    const text = answer.text;
    if (voiceOn && !instant) speak(text);
    else typeOut(node.querySelector('.mol-laiya-msg__text'), text, instant);

    // En modo acoplado la página ES la respuesta: si hay una sección en esta
    // misma página, se señala sin que haga falta pulsar nada.
    if (mode === 'dock' && answer.focus && answer.focus.file === FILE && answer.focus.id) highlight(answer.focus.id);
    if (answer.dock && mode === 'open') setTimeout(() => setMode('dock'), 900);
  }

  function reset() {
    history = [];
    topic = null;
    el.log.innerHTML = '';
    persist();
    layer.dataset.fresh = 'true';
    respond(engine.answer('', { currentFile: FILE }), { record: true });
    el.input.focus();
  }

  function persist() {
    store.set('sessionStorage', KEY, { history, topic });
  }

  function restore() {
    const saved = store.get('sessionStorage', KEY);
    el.log.innerHTML = '';
    if (!saved || !Array.isArray(saved.history) || !saved.history.length) {
      layer.dataset.fresh = 'true';
      return;
    }
    history = saved.history;
    topic = saved.topic || null;
    layer.removeAttribute('data-fresh');
    for (const h of history) {
      if (h.role === 'user') renderUser(h.text);
      else renderAnswer(h.answer, { instant: true, restored: true });
    }
    const lastAi = [...history].reverse().find(h => h.role === 'ai');
    if (lastAi) renderSuggestions(lastAi.answer.suggestions);
  }

  /* ------------------------------------------------------------- render */

  function renderUser(text) {
    const node = document.createElement('div');
    node.className = 'mol-laiya-msg mol-laiya-msg--user';
    node.innerHTML = `<p class="mol-laiya-msg__who">${esc(K.ui.you)}</p><p class="mol-laiya-msg__text">${esc(text)}</p>`;
    el.log.appendChild(node);
    scrollLog();
  }

  function renderAnswer(a, { instant = false, restored = false } = {}) {
    const node = document.createElement('article');
    node.className = 'mol-laiya-msg mol-laiya-msg--ai';
    node.innerHTML =
      `<p class="mol-laiya-msg__text">${restored || instant ? esc(a.text) : ''}</p>` +
      (a.blocks || []).map(renderBlock).join('') +
      (a.remote ? `<p class="mol-laiya-msg__note">${esc(K.ui.remoteNote)}</p>` : '');
    if (!instant && !restored) node.dataset.enter = 'true';
    el.log.appendChild(node);
    scrollLog();
    return node;
  }

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
        return `<dl class="mol-laiya-facts">${b.facts || b.items ? (b.facts || b.items).map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('') : ''}</dl>`;

      case 'projects':
        return `<ul class="mol-laiya-projects">${b.items
          .map(
            p => `<li><a class="mol-laiya-project" href="${esc(pageHref(p.file))}" data-goto="${esc(p.file)}">
  <img src="${esc(asset(p.image))}" alt="" width="1200" height="630" loading="lazy" decoding="async">
  <span class="mol-laiya-project__body">
    <span class="mol-laiya-project__register">${esc(p.capability ? p.capability.register : '')}${sourceLabel(p.selfDirected)}</span>
    <b>${esc(p.name)}</b>
    <span class="mol-laiya-project__line">${esc(p.teaser || p.headline)}</span>
  </span></a></li>`,
          )
          .join('')}</ul>`;

      case 'project': {
        const p = b.item;
        return `<div class="mol-laiya-case">
  <a class="mol-laiya-case__visual" href="${esc(pageHref(p.file))}" data-goto="${esc(p.file)}"><img src="${esc(asset(p.image))}" alt="${esc(p.headline)}" width="1200" height="630" loading="lazy" decoding="async"></a>
  <p class="mol-laiya-case__kicker">${esc(p.capability ? p.capability.register + ' · ' + p.name : p.name)}${sourceLabel(p.selfDirected)}</p>
  <blockquote class="mol-laiya-quote mol-laiya-quote--plain"><p>${esc(p.description)}</p></blockquote>
  ${
    b.sections && b.sections.length
      ? `<p class="mol-laiya-case__label">${esc(U.sections)}</p><ul class="mol-laiya-chips">${b.sections
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
  <h3 class="mol-laiya-excerpt__title">${esc(b.title)}</h3>
  <blockquote class="mol-laiya-quote mol-laiya-quote--plain"><p>${esc(b.text)}</p></blockquote>
  ${b.image ? `<img class="mol-laiya-excerpt__image" src="${esc(new URL(b.image.src, location.href).href)}" alt="${esc(b.image.alt)}" loading="lazy" decoding="async">` : ''}
  <a class="atom-text-link mol-laiya-excerpt__go" href="${esc(pageHref(b.file, b.id))}" data-goto="${esc(b.file + (b.id ? '#' + b.id : ''))}">${esc(here ? U.showOnPage : U.goTo)} ${ICON.arrow}</a>
</div>`;
      }

      case 'timeline':
        return `<ol class="mol-laiya-timeline">${b.items
          .map(
            (s, i) => `<li style="--laiya-step:${i}">
  <p class="mol-laiya-timeline__when">${esc(s.when)}</p>
  <p class="mol-laiya-timeline__org"><b>${esc(s.org)}</b> <span>${esc(s.scope)}</span></p>
  <p class="mol-laiya-timeline__role">${esc(s.role)}</p>
</li>`,
          )
          .join('')}</ol>`;

      case 'tools':
        return `<div class="mol-laiya-tools">
  <ul class="mol-laiya-tools__practice">${b.practice.map(p => `<li><b>${esc(p.name)}</b><span>${esc(p.detail)}</span></li>`).join('')}</ul>
  ${b.tools
    .map(g => `<div class="mol-laiya-tools__group"><p>${esc(g.group)}</p><ul class="mol-laiya-chips">${g.items.map(t => `<li><span class="atom-laiya-chip atom-laiya-chip--static">${esc(t)}</span></li>`).join('')}</ul></div>`)
    .join('')}
</div>`;

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
      default:
        return '';
    }
  }

  function renderSuggestions(list) {
    el.suggest.innerHTML = (list || [])
      .slice(0, 4)
      .map(s => `<button type="button" class="atom-laiya-chip" data-ask="${esc(s)}">${esc(s)}</button>`)
      .join('');
  }

  function scrollLog() {
    if (!el.log) return;
    requestAnimationFrame(() => {
      const last = el.log.lastElementChild;
      if (!last) return;
      // Se muestra el principio de la última respuesta, no su final: una
      // tarjeta larga no puede empujar la frase de LAI-YA fuera de la vista.
      el.log.scrollTo({ top: Math.max(0, last.offsetTop - el.log.offsetTop - 8), behavior: REDUCED.matches ? 'auto' : 'smooth' });
    });
  }

  // El texto entra palabra a palabra y cada palabra es un pulso del orbe:
  // es el «hablar» cuando la voz está apagada.
  function typeOut(target, text, instant) {
    if (!target) return;
    if (instant || REDUCED.matches) {
      target.textContent = text;
      setState('idle');
      return;
    }
    const words = text.split(/(\s+)/);
    let i = 0;
    setState('speaking');
    const step = () => {
      if (i >= words.length) {
        setState('idle');
        return;
      }
      target.textContent += words[i];
      if (words[i].trim() && orb) orb.pulse(0.45 + Math.random() * 0.4);
      i++;
      setTimeout(step, words[i - 1].trim() ? 34 + Math.random() * 30 : 0);
    };
    step();
  }

  /* ------------------------------------------------------------ página */

  function sectionOf(id) {
    const h = id && document.getElementById(id);
    return h ? h.closest('section, article') || h : null;
  }

  function highlight(id) {
    const target = sectionOf(id);
    if (!target) return;
    document.querySelectorAll('.syx-laiya-focus').forEach(n => n.classList.remove('syx-laiya-focus'));
    target.classList.add('syx-laiya-focus');
    target.scrollIntoView({ behavior: REDUCED.matches ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => target.classList.remove('syx-laiya-focus'), 4200);
  }

  function goTo(file, id) {
    track('laiya_goto', { from: FILE, to: file, section: id || '' });
    if (file === FILE) {
      if (mode === 'open') setMode('dock');
      if (id) highlight(id);
      else window.scrollTo({ top: 0, behavior: REDUCED.matches ? 'auto' : 'smooth' });
      return;
    }
    // A otra página: la conversación viaja en sessionStorage y la capa se
    // vuelve a abrir acoplada al llegar, con la sección ya señalada.
    store.set('sessionStorage', KEY + ':resume', { focus: id || null });
    location.href = pageHref(file, id);
  }

  /* --------------------------------------------------------------- voz */

  function syncVoiceButton() {
    if (!el.voice) return;
    const U = K.ui;
    el.voice.setAttribute('aria-pressed', String(voiceOn));
    el.voice.setAttribute('aria-label', voiceOn ? U.voiceOff : U.voiceOn);
    el.voice.title = voiceOn ? U.voiceOff : U.voiceOn;
    if (!('speechSynthesis' in window)) el.voice.hidden = true;
  }

  function toggleVoice() {
    voiceOn = !voiceOn;
    store.set('localStorage', 'laiya:voice', voiceOn);
    if (!voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel();
    syncVoiceButton();
  }

  function pickVoice() {
    const voices = speechSynthesis.getVoices();
    const want = K.ui.locale.toLowerCase();
    const base = want.slice(0, 2);
    return voices.find(v => v.lang.toLowerCase() === want) || voices.find(v => v.lang.toLowerCase().startsWith(base)) || null;
  }

  function speak(text) {
    const target = el.log.lastElementChild && el.log.lastElementChild.querySelector('.mol-laiya-msg__text');
    if (!('speechSynthesis' in window)) return typeOut(target, text);
    speechSynthesis.cancel();
    if (target) target.textContent = text;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = K.ui.locale;
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.02;
    u.onstart = () => setState('speaking');
    u.onboundary = () => orb && orb.pulse(0.9);
    u.onend = u.onerror = () => setState('idle');
    speechSynthesis.speak(u);
  }

  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recognition) return recognition.stop();
    recognition = new SR();
    recognition.lang = K.ui.locale;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
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

  /* ------------------------------------------------------------ retorno */

  // Si se llegó aquí desde la propia capa, se vuelve a abrir acoplada y se
  // señala la sección que se pidió.
  const resume = store.get('sessionStorage', KEY + ':resume');
  if (resume) {
    try {
      sessionStorage.removeItem(KEY + ':resume');
    } catch {}
    open('dock', { silent: true }).then(() => {
      if (resume.focus) setTimeout(() => highlight(resume.focus), REDUCED.matches ? 0 : 350);
    });
  }
})();
