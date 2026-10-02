/* LAIYA — motor local.
 *
 * Entiende preguntas sobre el portfolio sin salir del navegador: intenciones
 * conocidas (quién es, trabajo, trayectoria, contacto…) y, para todo lo demás,
 * una búsqueda BM25 sobre las secciones publicadas de las siete páginas.
 *
 * No genera texto sobre José: o responde con una frase fija de su voz
 * (scripts/laiya.config.mjs) o cita la sección de la página que contesta. Si
 * no hay sección que conteste, lo dice. Esa es la garantía que el cerebro
 * remoto no puede dar solo, y por eso el motor local va siempre debajo.
 *
 * Expone `window.LaiyaEngine.create(knowledge)`.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------ lenguaje */

  const norm = s =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9:.+#\s-]/g, ' ')
      .replace(/(^|\s)-|-(\s|$)/g, ' ')
      .replace(/\.(?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const STOP = new Set(
    (
      'a al algo algun alguna como con cual cuales cuando de del desde donde el ella ellos en entre era es esa ese eso esta este esto estos fue ha hay hizo la las le les lo los mas me mi muy no nos o para pero por que quien se sea ser si sin sobre su sus te tiene tu un una uno unos y ya yo cuentame dime explicame ensename muestrame quiero saber puedes podrias ' +
      'a about an and are as at be been but by can could did do does for from had has have he her him his how i if in into is it its me my of on or our she so tell than that the their them then there these they this to was we were what when where which who why will with would you your show give explain please'
    ).split(' '),
  );

  const stem = w => {
    if (w.length > 6 && /(ciones|siones)$/.test(w)) return w.slice(0, -5) + 'on';
    if (w.length > 4 && /es$/.test(w) && !/ies$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
    return w;
  };

  // Puentes entre los dos idiomas para la búsqueda: quien pregunta en inglés
  // en la página española (o al revés) no debería quedarse sin respuesta.
  const SYN = {
    result: ['resultado', 'impacto', 'impact', 'outcome'],
    resultado: ['result', 'impacto', 'impact'],
    impacto: ['impact', 'resultado', 'result'],
    impact: ['impacto', 'resultado', 'outcome'],
    proceso: ['process', 'metodo', 'method'],
    process: ['proceso', 'method', 'metodo'],
    equipo: ['team', 'persona'],
    team: ['equipo', 'people'],
    aprendizaje: ['learn', 'lesson', 'carry', 'llevo', 'takeaway', 'conclusion'],
    aprendio: ['learn', 'aprendizaje', 'llevo', 'carry', 'takeaway', 'conclusion'],
    learn: ['aprendizaje', 'lesson', 'carry', 'takeaway'],
    lesson: ['aprendizaje', 'learn', 'carry', 'takeaway'],
    find: ['finding', 'hallazgo', 'result', 'resultado'],
    found: ['finding', 'hallazgo', 'result', 'resultado'],
    encontro: ['hallazgo', 'finding', 'resultado', 'result'],
    descubrio: ['hallazgo', 'finding', 'resultado'],
    after: ['despue', 'changed', 'cambio'],
    despue: ['after', 'cambio'],
    problema: ['problem', 'tension'],
    problem: ['problema', 'tension'],
    medir: ['measure', 'medicion', 'measured', 'medi'],
    measure: ['medir', 'medicion', 'measured'],
    dato: ['data'],
    data: ['dato'],
    mantenimiento: ['maintenance', 'maintain'],
    maintenance: ['mantenimiento'],
    accesibilidad: ['accessibility', 'wcag'],
    accessibility: ['accesibilidad', 'wcag'],
    rendimiento: ['performance'],
    performance: ['rendimiento'],
    componente: ['component'],
    component: ['componente'],
    pesa: ['peso', 'kb', 'weight'],
    weight: ['peso', 'kb'],
  };

  const tokens = s =>
    norm(s)
      .split(' ')
      .filter(w => w && !STOP.has(w))
      .map(stem);

  const has = (n, phrase) => (' ' + n + ' ').includes(' ' + phrase + ' ');

  /* ------------------------------------------------------------ intenciones */

  // Frases normalizadas (sin tildes). El peso sube con la longitud: «sistema de
  // diseno» dice más que «sistema».
  const INTENTS = {
    greet: ['hola', 'hi', 'hello', 'hey', 'buenas', 'buenos dias', 'buenas tardes', 'good morning', 'que tal', 'saludos'],
    identity: ['quien eres', 'que eres', 'who are you', 'what are you', 'laiya', 'lai ya', 'lai-ya', 'tu nombre', 'your name', 'por que te llamas', 'why are you called', 'como funcionas', 'how do you work'],
    person: ['quien es', 'who is', 'jose', 'jose luis', 'pizarro', 'about him', 'sobre el', 'perfil', 'profile', 'background', 'a que se dedica', 'what does he do', 'presentamelo', 'introduce him'],
    projects: ['proyectos', 'trabajo', 'trabajos', 'casos', 'case studies', 'cases', 'work', 'projects', 'portfolio', 'que ha hecho', 'what has he done', 'what has he built', 'selected work', 'su trabajo', 'his work'],
    career: ['trayectoria', 'experiencia', 'career', 'experience', 'anos', 'years', 'empresas', 'companies', 'historia', 'history', 'timeline', 'donde ha trabajado', 'where has he worked', 'france telecom', 'aliseda', 'buleboo', 'brickee', 'en un minuto', 'in a minute'],
    tools: ['herramientas', 'tools', 'stack', 'skills', 'habilidades', 'tecnologias', 'technologies', 'figma', 'scss', 'vue', 'javascript', 'gsap', 'storybook', 'echarts', 'con que trabaja', 'what does he work with', 'what tools'],
    ai: ['ia', 'ai', 'inteligencia artificial', 'artificial intelligence', 'claude', 'agentes', 'agents', 'prompt', 'prompts', 'llm', 'ai native', 'usa la ia', 'use ai'],
    accessibility: ['accesibilidad', 'accessibility', 'wcag', 'a11y', 'contraste', 'contrast', 'accesible', 'accessible'],
    systems: ['design system', 'design systems', 'sistema de diseno', 'sistemas de diseno', 'design tokens', 'tokens'],
    contact: ['contacto', 'contact', 'contactar', 'email', 'correo', 'mail', 'linkedin', 'escribirle', 'write to him', 'reach him', 'hablar con el', 'talk to him', 'le contacto', 'contact him'],
    cv: ['cv', 'curriculum', 'resume', 'descargar el cv', 'download the cv', 'pdf'],
    hire: ['contratar', 'contratarle', 'hire', 'hiring', 'disponible', 'available', 'availability', 'disponibilidad', 'freelance', 'open to work', 'busca trabajo', 'looking for a job', 'salario', 'salary'],
    location: ['donde vive', 'where is he', 'where does he live', 'based', 'ubicacion', 'ciudad', 'madrid', 'de donde es', 'where is he from', 'location'],
    languages: ['idiomas', 'languages', 'ingles', 'english', 'que idiomas', 'habla ingles', 'speak english'],
    education: ['estudios', 'estudio', 'estudio periodismo', 'education', 'studied', 'study', 'universidad', 'university', 'periodismo', 'journalism', 'formacion', 'donde estudio', 'where did he study', 'carrera universitaria', 'degree'],
    selfDirected: ['propio', 'propios', 'proyecto propio', 'proyectos propios', 'son propios', 'self directed', 'self-directed', 'personal project', 'personal projects', 'proyectos personales', 'side project', 'side projects'],
    here: ['esta pagina', 'este caso', 'this page', 'this case', 'aqui', 'here', 'de que va esto', 'what is this'],
    thanks: ['gracias', 'thanks', 'thank you', 'genial', 'perfecto', 'great', 'perfect'],
    bye: ['adios', 'bye', 'hasta luego', 'goodbye', 'nos vemos', 'see you'],
    destroy: ['rompe', 'rompela', 'rompe la web', 'rompe la pagina', 'destruye', 'destruyela', 'destroy', 'break', 'break it', 'break the page', 'break the site', 'gravedad', 'gravity', 'tira la web', 'smash'],
    help: ['ayuda', 'help', 'que puedo preguntar', 'what can i ask', 'que sabes', 'what do you know', 'que puedes hacer', 'what can you do', 'opciones', 'options'],
  };

  function scoreIntents(n) {
    const scores = {};
    for (const [id, phrases] of Object.entries(INTENTS)) {
      let s = 0;
      for (const p of phrases) if (has(n, p)) s += 1 + p.split(' ').length * 0.6 + p.length / 30;
      if (s) scores[id] = s;
    }
    return Object.entries(scores).sort((a, b) => b[1] - a[1]);
  }

  /* ------------------------------------------------------------------ BM25 */

  function buildIndex(pages) {
    const docs = [];
    for (const p of pages) {
      // La descripción de cada caso también es un documento: es su mejor
      // resumen y responde a «de qué va».
      if (p.file !== 'index.html') docs.push({ file: p.file, id: null, title: p.headline, kicker: p.name, text: p.description, page: p });
      for (const s of p.sections) docs.push({ file: p.file, id: s.id, title: s.title, kicker: s.kicker, text: s.text, image: s.image, page: p });
    }
    for (const d of docs) {
      d.tf = new Map();
      const add = (txt, w) => tokens(txt).forEach(t => d.tf.set(t, (d.tf.get(t) || 0) + w));
      add(d.title, 3);
      add(d.kicker, 2);
      add(d.text, 1);
      add(d.page.name, 1);
      d.len = [...d.tf.values()].reduce((a, b) => a + b, 0);
    }
    const df = new Map();
    for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    const avg = docs.reduce((a, d) => a + d.len, 0) / docs.length;
    return { docs, df, avg, N: docs.length };
  }

  function search(index, q, { file = null, k = 3 } = {}) {
    const qt = [...new Set(tokens(q))];
    const extra = [];
    for (const t of qt) (SYN[t] || []).forEach(x => extra.push(stem(x)));
    const K1 = 1.4;
    const B = 0.72;
    const out = [];
    for (const d of index.docs) {
      if (file && d.file !== file) continue;
      let s = 0;
      const score = (t, w) => {
        const f = d.tf.get(t);
        if (!f) return;
        const df = index.df.get(t);
        const idf = Math.log(1 + (index.N - df + 0.5) / (df + 0.5));
        s += w * idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / index.avg)));
      };
      qt.forEach(t => score(t, 1));
      extra.forEach(t => score(t, 0.5));
      const covered = qt.filter(t => d.tf.has(t) || (SYN[t] || []).some(x => d.tf.has(stem(x)))).length;
      if (s > 0) out.push({ doc: d, score: s, coverage: covered / (qt.length || 1) });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, k);
  }

  /* ----------------------------------------------------------- utilidades */

  const lead = (text, max = 300) => {
    const src = String(text || '');
    // Se corta por fin de frase seguido de espacio, nunca por cualquier punto:
    // «40.86 %» es una cifra, no dos frases.
    const sentences = src.split(/(?<=[.!?…])\s+/).map(x => x + ' ');
    let out = '';
    for (const s of sentences) {
      if ((out + s).length > max && out) break;
      out += s;
    }
    out = out.trim();
    return out.length > max + 80 ? out.slice(0, max).replace(/\s+\S*$/, '') + '…' : out;
  };

  const fill = (tpl, data) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => (data[k] != null ? data[k] : ''));

  /* ---------------------------------------------------------------- motor */

  function create(K) {
    const index = buildIndex(K.pages);
    const pageByFile = new Map(K.pages.map(p => [p.file, p]));
    const cases = K.pages.filter(p => p.file !== 'index.html');
    const V = K.voice;
    const S = K.suggestions;
    const turn = {};
    const pick = (key, list) => {
      const arr = Array.isArray(list) ? list : [list];
      turn[key] = (turn[key] || 0) + 1;
      return arr[(turn[key] - 1) % arr.length];
    };

    const summary = p => ({
      file: p.file,
      key: p.key,
      name: p.name,
      headline: p.headline,
      description: p.description,
      image: p.image,
      selfDirected: p.selfDirected,
      capability: p.capability || null,
      kicker: p.kicker,
      teaser: lead(p.description, 150),
    });

    // El caso nombrado en la pregunta. Gana el alias más específico, así
    // «ilustraciones de SPORT» va a ilustraciones y no a las tarjetas.
    function detectProject(n) {
      let best = null;
      for (const p of cases) {
        for (const a of p.aliases) {
          const na = norm(a);
          if (na && has(n, na)) {
            const w = na.length + (na.includes(' ') ? 4 : 0) + (/^(illustrations?|ilustracion(es)?)$/.test(na) ? 6 : 0);
            if (!best || w > best.w) best = { page: p, w };
          }
        }
      }
      return best && best.page;
    }

    // Lo que queda de la pregunta cuando se quitan el nombre del caso y las
    // palabras de relleno: si queda algo, la pregunta es sobre un detalle.
    const GENERIC = new Set(
      'caso case proyecto project cuenta cuentame habla hablame about sobre study que trata va more mas info informacion detail detalle resumen summary ensena show abre open ver see tell everything todo'
        .split(' ')
        .map(stem),
    );
    function residue(n, page) {
      let rest = ' ' + n + ' ';
      for (const a of page.aliases) rest = rest.split(' ' + norm(a) + ' ').join(' ');
      return tokens(rest).filter(t => !GENERIC.has(t));
    }

    const R = o => Object.assign({ text: '', blocks: [], suggestions: [], mood: 'neutral', focus: null, topic: undefined }, o);

    const excerptBlock = hit => {
      const d = hit.doc;
      return {
        type: 'excerpt',
        file: d.file,
        id: d.id,
        page: d.page.name,
        title: d.title,
        kicker: d.kicker,
        text: lead(d.text),
        image: d.image || null,
        selfDirected: d.page.selfDirected,
      };
    };

    const projectBlock = p => ({
      type: 'project',
      item: summary(p),
      sections: p.sections
        .filter(s => s.kicker && !/^(case study|caso)/i.test(s.kicker))
        .slice(0, 6)
        .map(s => ({ id: s.id, label: s.kicker })),
    });

    const sectionSuggestions = (page, exceptId) =>
      page.sections.filter(x => x.kicker && x.id !== exceptId && !/^(case study|caso)/i.test(x.kicker)).slice(0, 3).map(x => x.kicker);

    const H = {
      greet: ctx => R({ text: ctx.greeted ? pick('greetAgain', V.greetAgain) : pick('greet', V.greet), suggestions: S.start, mood: 'happy' }),
      identity: () => R({ text: pick('identity', V.identity), suggestions: S.start, mood: 'happy' }),
      person: () =>
        R({
          text: fill(V.person, { name: K.person.name, role: K.person.role, location: K.person.location }),
          blocks: [{ type: 'quote', text: K.person.lede, cite: K.person.name }, { type: 'person', name: K.person.name, role: K.person.role, facts: K.person.facts }],
          focus: { file: 'index.html', id: 'about-title' },
          suggestions: S.afterPerson,
        }),
      projects: () =>
        R({
          text: V.projects,
          blocks: [{ type: 'projects', items: cases.map(summary) }],
          focus: { file: 'index.html', id: 'work-title' },
          suggestions: S.afterProjects,
          topic: null,
        }),
      selfDirected: () =>
        R({
          text: fill(V.selfDirected, { list: cases.filter(p => p.selfDirected).map(p => p.name).join(' · ') }),
          blocks: [{ type: 'projects', items: cases.filter(p => p.selfDirected).map(summary) }],
          focus: { file: 'index.html', id: 'new-work-title' },
          suggestions: S.afterProjects,
          topic: null,
        }),
      career: () =>
        R({
          text: V.career,
          blocks: [{ type: 'timeline', items: K.career }],
          focus: { file: 'index.html', id: 'role-evolution-title' },
          suggestions: S.afterCareer,
        }),
      tools: () =>
        R({
          text: V.tools,
          blocks: [{ type: 'tools', practice: K.practice, tools: K.tools }],
          focus: { file: 'index.html', id: 'tools-title' },
          suggestions: S.afterProject,
        }),
      ai: () => {
        const atlas = pageByFile.get('case-atlas.html');
        return R({
          text: V.ai,
          blocks: [{ type: 'quote', text: K.person.thesis, cite: K.person.name }, ...(atlas ? [projectBlock(atlas)] : [])],
          focus: { file: 'index.html', id: 'thesis-title' },
          suggestions: S.afterProject,
          mood: 'curious',
          topic: atlas ? atlas.file : undefined,
        });
      },
      accessibility: () => {
        const p = K.practice.find(x => /wcag/i.test(x.name));
        const hits = search(index, 'WCAG 2.1 AA accessibility accesibilidad contrast contraste', { k: 1, file: 'case-42ds.html' });
        return R({
          text: fill(V.accessibility, { detail: p ? p.detail : '' }),
          blocks: hits.length ? [excerptBlock(hits[0])] : [],
          focus: hits.length ? { file: hits[0].doc.file, id: hits[0].doc.id } : null,
          suggestions: S.afterProject,
          topic: 'case-42ds.html',
        });
      },
      systems: () => {
        const p = pageByFile.get('case-42ds.html');
        return R({ text: V.systems, blocks: p ? [projectBlock(p)] : [], suggestions: S.afterProject, topic: p ? p.file : undefined });
      },
      contact: () =>
        R({
          text: V.contact,
          blocks: [{ type: 'contact', ...K.person.contact }],
          focus: { file: 'index.html', id: 'contact-title' },
          suggestions: S.afterContact,
        }),
      cv: () => R({ text: V.cv, blocks: [{ type: 'contact', ...K.person.contact, only: 'cv' }], suggestions: S.afterContact }),
      hire: () =>
        R({
          text: V.hire,
          blocks: [{ type: 'contact', ...K.person.contact }],
          focus: { file: 'index.html', id: 'contact-title' },
          suggestions: S.afterContact,
        }),
      location: () => R({ text: fill(V.location, { location: K.person.factIndex.location }), blocks: [{ type: 'facts', items: K.person.facts.slice(0, 1) }], suggestions: S.afterPerson }),
      languages: () => R({ text: fill(V.languages, { languages: K.person.factIndex.languages }), blocks: [{ type: 'facts', items: K.person.facts.slice(1, 2) }], suggestions: S.afterPerson }),
      education: () =>
        R({
          text: fill(V.education, { education: K.person.factIndex.education }),
          blocks: [{ type: 'facts', items: K.person.facts.slice(2, 3) }],
          focus: { file: 'index.html', id: 'about-title' },
          suggestions: S.afterPerson,
        }),
      thanks: () => R({ text: pick('thanks', V.thanks), suggestions: S.fallback, mood: 'happy' }),
      bye: () => R({ text: pick('bye', V.bye), mood: 'happy', dock: true }),
      // El guiño: la página se cae y LAIYA la vuelve a montar.
      destroy: () => R({ text: V.destroy, after: V.restore, mood: 'happy' }),
      help: () => R({ text: V.help, suggestions: [...S.start, ...S.afterProjects.slice(0, 2)], mood: 'curious' }),
    };

    function sectionAnswer(page, hit) {
      return R({
        kind: 'section',
        text: fill(V.foundIn, { case: page.name }),
        blocks: [excerptBlock(hit)],
        focus: { file: hit.doc.file, id: hit.doc.id },
        suggestions: sectionSuggestions(page, hit.doc.id),
        topic: page.file,
      });
    }

    function projectAnswer(page, n) {
      const rest = residue(n, page);
      if (rest.length) {
        const hits = search(index, rest.join(' '), { file: page.file, k: 1 });
        if (hits.length && hits[0].score > 1.2 && hits[0].doc.id) return sectionAnswer(page, hits[0]);
      }
      return R({
        kind: 'project',
        text: fill(V.projectIntro, { name: page.name }),
        blocks: [projectBlock(page)],
        focus: { file: page.file, id: null },
        suggestions: sectionSuggestions(page),
        topic: page.file,
        mood: 'curious',
      });
    }

    function answer(question, ctx = {}) {
      const n = norm(question);
      if (!n) return Object.assign(H.greet(ctx), { kind: 'intent', intent: 'greet' });

      // Las sugerencias que propone el motor dentro de un caso son los
      // kickers de sus secciones, así que pulsar una lleva a esa sección.
      const topicPage = ctx.topic ? pageByFile.get(ctx.topic) : null;
      if (topicPage) {
        const s = topicPage.sections.find(x => x.kicker && norm(x.kicker) === n);
        if (s) return sectionAnswer(topicPage, { doc: index.docs.find(d => d.file === topicPage.file && d.id === s.id) });
      }

      const intents = scoreIntents(n);
      let project = detectProject(n);
      let top = intents[0] ? intents[0][0] : null;
      // «Hola, ¿quién es José?» es una pregunta, no un saludo.
      if (top === 'greet' && intents[1]) {
        intents.shift();
        top = intents[0][0];
      }

      if (!project && top === 'here' && ctx.currentFile && ctx.currentFile !== 'index.html') project = pageByFile.get(ctx.currentFile);

      // Un caso nombrado manda sobre una intención genérica: «el design system
      // de 42DS» es una pregunta sobre 42DS, no sobre design systems.
      const generic = ['greet', 'projects', 'systems', 'ai', 'accessibility', 'tools', 'here', 'person', 'selfDirected', null];
      if (project && generic.includes(top)) return projectAnswer(project, n);

      if (top && intents[0][1] >= 1.5 && H[top]) {
        if (top === 'here') return Object.assign(H.help(ctx), { kind: 'intent' });
        return Object.assign(H[top](ctx), { kind: 'intent', intent: top });
      }
      if (project) return projectAnswer(project, n);

      // Sin intención clara: primero dentro del caso del que se venía
      // hablando, después en todo el sitio.
      if (topicPage) {
        const local = search(index, question, { file: topicPage.file, k: 1 });
        if (local.length && local[0].doc.id && local[0].score > 2.4 && local[0].coverage >= 0.5) return sectionAnswer(topicPage, local[0]);
      }
      const hits = search(index, question, { k: 3 });
      if (hits.length && hits[0].score > 2.4 && hits[0].coverage >= 0.4) {
        const h = hits[0];
        const related = hits.slice(1).filter(x => x.score > h.score * 0.6 && x.doc.file !== h.doc.file);
        const page = h.doc.page;
        return R({
          kind: 'search',
          text: page.file === 'index.html' ? V.found : fill(V.foundIn, { case: page.name }),
          blocks: [excerptBlock(h), ...related.slice(0, 1).map(excerptBlock)],
          focus: { file: h.doc.file, id: h.doc.id },
          suggestions: page.file === 'index.html' ? S.fallback : sectionSuggestions(page, h.doc.id),
          topic: page.file !== 'index.html' ? page.file : null,
        });
      }
      return R({ kind: 'none', text: V.notFound, blocks: [{ type: 'contact', ...K.person.contact, only: 'email' }], suggestions: S.fallback, mood: 'sorry' });
    }

    // Contexto para el cerebro remoto: las secciones que mejor contestan, ya
    // recortadas. El Worker no ve nada más que esto.
    function context(question, k = 6) {
      return search(index, question, { k }).map(h => ({
        page: h.doc.page.name,
        file: h.doc.file,
        id: h.doc.id,
        title: h.doc.title,
        text: lead(h.doc.text, 700),
      }));
    }

    // La sección exacta que cita el cerebro remoto, como bloque visual.
    function excerpt(file, id) {
      const doc = index.docs.find(d => d.file === file && d.id === (id || null));
      return doc ? excerptBlock({ doc }) : null;
    }

    return { answer, context, excerpt, search: (q, o) => search(index, q, o) };
  }

  window.LaiyaEngine = { create, norm };
})();
