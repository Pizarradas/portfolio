/* LAIYA — la guía: preguntas dentro de un recorrido.
 *
 * Mientras LAIYA señala algo de la página, lo que se le pregunta se entiende
 * sobre eso: «¿cuándo fue?», «¿qué cifras hay?», «¿con qué se hizo?»,
 * «¿quién participó?», «¿por qué?», «¿qué cambió?», «cuéntame más», «sigue»,
 * «atrás», «repite». No hace falta nombrar el caso: la guía sabe dónde está.
 *
 * Contesta con frases de la propia página. Cada ancla `data-laiya` tiene su
 * ficha en assets/laiya/tour-{en,es}.json (build-laiya.mjs), con las frases
 * ya etiquetadas por lo que responden. Si el nodo no lo dice pero enlaza a un
 * caso, busca en las secciones de ese caso y ofrece llevar allí. Si nada lo
 * dice, lo reconoce: no inventa (BRAND.md §7.2).
 *
 * Expone `window.LaiyaGuide.create({ tour, norm, file })`.
 */
(() => {
  'use strict';

  // Qué pregunta es, sobre texto ya normalizado (minúsculas, sin acentos).
  // El orden importa: «¿cuánto tiempo?» es una fecha antes que una cifra.
  const KINDS = [
    ['go', /\b(llevame|ir al caso|abre el caso|ver el caso|vamos al caso|take me|open the case|go to the case|show me the case)\b/],
    ['when', /\b(cuando|que ano|en que ano|desde cuando|hasta cuando|cuanto tiempo|cuantos anos|cuanto duro|duracion|fechas?|when|what year|how long|since when|dates?)\b/],
    ['numbers', /\b(cuant[oa]s?|cifras?|numeros?|datos?|porcentajes?|metricas?|medid[oa]s?|how many|how much|numbers?|figures?|percent\w*|metrics?|stats?|data)\b|%/],
    ['tools', /\b(herramientas?|tecnologias?|stack|con que|construid[oa] con|hech[oa] con|programas?|software|tools?|tech\w*|built with|made with|frameworks?|librerias?|libraries)\b/],
    ['who', /\b(quien(es)?|equipo|con quien|para quien|who|team|whom|people)\b/],
    ['why', /\b(por que|porque|para que|motivo|razon|why|reason|purpose)\b/],
    ['result', /\b(resultados?|impacto|que cambio|que consiguio|que logro|para que sirvio|results?|impact|outcome|what changed|achiev\w*|difference)\b/],
    ['more', /\b(mas|cuentame mas|amplia|detalles?|explica\w*|que es esto|y esto|more|tell me more|details?|explain|what is this|what's this)\b/],
  ];

  function create({ tour, norm, file }) {
    const copy = tour.copy;
    const page = f => (tour.pages[f || file] || { tours: {}, anchors: {} });
    const entry = (id, f) => page(f).anchors[id] || null;

    // Los recorridos salen del JSON; si faltara, del propio DOM, que lleva el
    // mismo contrato (`data-laiya-tour="nombre:posición"`).
    function ids(name) {
      const listed = page().tours[name];
      if (listed && listed.length) return listed;
      return [...document.querySelectorAll('[data-laiya-tour]')]
        .flatMap(n => n.dataset.laiyaTour.split(/\s+/).map(t => t.split(':')).filter(([t]) => t === name).map(([, i]) => [+i, n.dataset.laiya]))
        .sort((a, b) => a[0] - b[0])
        .map(x => x[1]);
    }

    const node = id => (id ? document.querySelector(`[data-laiya="${CSS.escape(id)}"]`) : null);

    const commands = Object.fromEntries(Object.entries(copy.commands).map(([k, list]) => [k, list.map(norm)]));
    function command(question) {
      const q = norm(question);
      if (q.split(' ').length > 4) return null;
      for (const [k, list] of Object.entries(commands)) if (list.some(c => q === c || q.startsWith(c + ' '))) return k;
      return null;
    }

    function kindOf(question) {
      const q = norm(question);
      for (const [k, re] of KINDS) if (re.test(q)) return k;
      return null;
    }

    // Afinidad entre una frase y la pregunta: palabras en común, sin las
    // vacías, con un premio pequeño a las frases cortas (se leen mejor).
    const words = s => new Set(norm(s).split(' ').filter(w => w.length > 3));
    function overlap(question, sentence) {
      const q = words(question);
      if (!q.size) return 0;
      let hit = 0;
      for (const w of words(sentence)) if (q.has(w) || [...q].some(x => x.length > 5 && w.startsWith(x.slice(0, 5)))) hit++;
      return hit / Math.sqrt(q.size) - sentence.length / 2400;
    }

    const tagged = (e, kind) => (e ? e.s.filter(x => (x[1] || '').split(' ').includes(kind)) : []);
    const readable = x => x[0].length < 320;
    // Para «¿cuándo?», una frase con su año va antes que una duración.
    const bonus = (kind, x) => (kind === 'when' && /\b(?:19|20)\d{2}\b/.test(x[0]) ? 0.5 : 0);
    const rank = (list, question, kind) => list.filter(readable).map(x => [x, overlap(question, x[0]) + bonus(kind, x)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);

    // Las secciones del caso que enlaza un nodo, para buscar más allá.
    function caseSentences(e, kind) {
      if (!e || !e.case || !tour.pages[e.case]) return [];
      return Object.values(tour.pages[e.case].anchors).flatMap(a => (kind ? tagged(a, kind) : a.s));
    }

    // ¿Nombra la pregunta otro paso del mismo recorrido? «¿Y cuándo entró en
    // Prensa Ibérica?» mientras se ve Buleboo es una pregunta sobre Prensa
    // Ibérica: la guía salta allí y contesta allí. Cuenta el titular del
    // paso (o del caso al que lleva), palabra a palabra.
    function namedPeer(question, id, peers) {
      const q = words(question);
      let best = null, top = 0;
      for (const p of peers || []) {
        if (!p || p === id) continue;
        const e = entry(p);
        if (!e) continue;
        // El nombre del paso: la empresa en una etapa, el nombre corto del
        // caso en una tarjeta. Un titular largo no sirve: comparte palabras
        // con cualquier pregunta («built», «system»).
        const names = e.kind === 'role' ? e.title : e.case && tour.pages[e.case] ? tour.pages[e.case].name : '';
        const keys = [...words(names)].filter(w => w.length >= 4 || /\d/.test(w));
        const hit = keys.filter(w => q.has(w)).length;
        if (hit > top) (top = hit), (best = p);
      }
      return top >= 1 ? best : null;
    }

    // La respuesta, o null si esto no es una pregunta sobre lo que se ve.
    function answer(question, id, { said = [], peers = [] } = {}) {
      const e = entry(id);
      if (!e) return null;
      const cmd = command(question);
      if (cmd) return { command: cmd };
      const other = namedPeer(question, id, peers);
      if (other) {
        // Solo el nombre («¿y Prensa Ibérica?»): basta con ir; el paso ya se
        // presenta al llegar. Con una pregunta concreta, se contesta allí.
        const there = kindOf(question) ? answer(question, other, {}) : null;
        return { ...(there || {}), jump: other };
      }
      const kind = kindOf(question);
      // Lo ya citado no se repite; lo que dijo al llegar, solo si la pregunta
      // es concreta (la fecha de una etapa está en su presentación).
      const fresh = x => !said.includes(x[0]);
      const unsaid = x => fresh(x) && x[0] !== e.say && x[0] !== e.title && x[0] !== `${e.title}.`;

      let picked = [];
      let lead = '';
      let elsewhere = false;
      if (kind === 'go') {
        if (!e.case) return { text: copy.noCase, kind, ask: next(e, kind) };
        return { text: copy.ask.go, go: e.case, kind };
      }
      if (kind === 'more') {
        picked = e.s.filter(unsaid).filter(readable).slice(0, 2);
        lead = copy.lead.more;
      } else if (kind) {
        picked = rank(tagged(e, kind).filter(fresh), question, kind).slice(0, 2);
        lead = copy.lead[kind];
      } else {
        // Sin tipo: la frase del nodo que más se parece a la pregunta.
        const best = rank(e.s.filter(unsaid), question).slice(0, 1);
        if (best.length && overlap(question, best[0][0]) >= 0.7) {
          picked = best;
          lead = copy.lead.more;
        }
      }
      if (!picked.length && e.case) {
        const pool = kind && kind !== 'more' ? caseSentences(e, kind) : kind === 'more' ? caseSentences(e) : caseSentences(e).filter(x => overlap(question, x[0]) >= 0.7);
        picked = rank(pool, question, kind).slice(0, 2);
        if (picked.length) {
          elsewhere = true;
          lead = copy.lead.elsewhere.replace('{case}', tour.pages[e.case].name || e.title);
        }
      }
      if (!picked.length) return kind ? { text: copy.none, kind, ask: next(e, kind) } : null;
      return {
        text: lead,
        quote: picked.map(x => x[0]),
        cite: e.title,
        go: elsewhere ? e.case : null,
        kind,
        ask: next(e, kind),
      };
    }

    // Sin recorrido a la vista, una pregunta concreta («¿qué cifras hay?»,
    // «¿quién participó?») se contesta con la página entera: la mejor frase
    // y el ancla donde vive, para que LAIYA vaya allí a enseñarla.
    function answerPage(question) {
      const kind = kindOf(question);
      if (!kind || kind === 'go' || kind === 'more') return null;
      let best = null, top = -Infinity;
      for (const [id, a] of Object.entries(page().anchors)) {
        if (a.kind === 'item') continue;
        for (const x of tagged(a, kind).filter(readable)) {
          const sc = overlap(question, x[0]) + bonus(kind, x) + (a.kind === 'section' ? 0.05 : 0);
          if (sc > top) (top = sc), (best = { id, x });
        }
      }
      if (!best) return null;
      const e = entry(best.id);
      // Sin repetir: un titular y su párrafo a veces dicen lo mismo.
      const key = t => norm(t).slice(0, 28);
      const more = rank(tagged(e, kind).filter(x => x !== best.x && key(x[0]) !== key(e.title) && key(x[0]) !== key(best.x[0]) && !best.x[0].includes(x[0]) && !x[0].includes(best.x[0])), question, kind).slice(0, 1);
      return { text: copy.lead[kind], quote: [best.x[0], ...more.map(x => x[0])], cite: e.title, anchor: best.id, kind, ask: next(e, kind) };
    }

    // Lo que se puede seguir preguntando de este nodo (sin repetir lo hecho).
    function next(e, done) {
      // «Llévame» va primero: es lo único que no se puede preguntar escribiendo
      // sin saber que existe.
      const list = (e.ask || []).filter(k => k !== done && copy.ask[k]);
      return (list.includes('go') ? ['go', ...list.filter(k => k !== 'go')] : list).slice(0, 3);
    }

    const label = k => copy.ask[k];

    return { ids, entry, node, answer, answerPage, command, kindOf, label, next, copy };
  }

  window.LaiyaGuide = { create };
})();
