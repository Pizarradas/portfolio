// LAIYA — la capa conversacional del portfolio.
//
// Lo que LAIYA dice con voz propia vive aquí, en los dos idiomas. Todo lo
// demás —casos, secciones, trayectoria, herramientas, contacto— lo extrae
// `build-laiya.mjs` del propio marcado, así que la capa no puede afirmar nada
// que la página no publique ya. Esa es la regla que la sostiene: BRAND.md §7.2,
// «ninguna cifra sin fuente», aplicada también a la conversación.
//
// Mismo patrón que el objeto UI de `build-i18n.mjs`: copia que existe en un
// solo sitio y se genera para cada idioma, no frases del HTML inglés que haya
// que traducir en i18n/es.json.
//
// Voz: BRAND.md §3. Frases cortas, sin exclamaciones, sin emoji, sin preguntas
// retóricas. LAIYA habla de José en tercera persona y de sí misma en primera.
// Lo que la página dice en primera persona —el lede, la tesis, cada caso— no
// lo repite como suyo: lo cita, con la atribución a la vista. Así nunca se
// confunde la voz de la capa con la de él (BRAND.md §3, hecho frente a lectura).
// {placeholders} los rellena el motor con datos extraídos.

// Qué caso es propio. Se lee del marcado (`Self-directed` en el eyebrow); esta
// lista solo da los nombres cortos con los que la gente pregunta por cada caso.
export const CASE_ALIASES = {
  'case-42ds.html': ['42ds', '42 ds', 'design system', 'sistema de diseno', 'multimarca', 'multi brand', 'multi-brand', 'tokens', 'style dictionary', 'flagship'],
  'case-sport.html': ['sport cards', 'sport', 'tarjetas', 'cards', 'cards research', 'investigacion', 'research', '16:9', '16 9', 'medir', 'measure'],
  'case-map.html': ['mapa', 'map', 'media map', 'leaflet', 'ign', 'mapa interactivo', 'interactive map'],
  'case-worldcup.html': ['mundial', 'world cup', 'worldcup', '2026', 'futbol', 'football', 'three.js', 'threejs'],
  'case-atlas.html': ['atlas', 'syx', 'gobernanza', 'governance', 'reportajes', 'editorial system', 'modos', 'modes'],
  'case-illustrations.html': ['ilustraciones', 'illustrations', 'ilustracion', 'illustration', 'dibujo', 'drawing', 'art direction', 'direccion de arte'],
};

export const UI = {
  en: {
    locale: 'en-GB',
    launcher: 'Ask LAIYA',
    launcherHint: 'A conversational layer over this portfolio',
    title: 'LAIYA',
    subtitle: 'A layer over this portfolio',
    // La barra mide lo que mide: el texto completo cabe en escritorio; en
    // un móvil, con cuatro botones al lado, solo cabe la invitación.
    placeholder: 'Ask about his work, his process…',
    placeholderShort: 'Ask me…',
    inputLabel: 'Your question for LAIYA',
    send: 'Send',
    mic: 'Speak your question',
    micStop: 'Stop listening',
    voiceOn: 'Read answers aloud',
    voiceOff: 'Stop reading answers aloud',
    close: 'Close LAIYA',
    clear: 'Start over',
    you: 'You',
    states: {
      idle: 'Ready',
      listening: 'Listening…',
      thinking: 'Looking through the portfolio…',
      speaking: 'Answering',
    },
    open: 'Open the case',
    showOnPage: 'Show me on the page',
    goTo: 'Take me there',
    sections: 'Inside this case',
    selfDirected: 'Self-directed',
    professional: 'Prensa Ibérica',
    present: 'present',
    remoteNote: 'Answer written with Claude from the portfolio text',
    pause: 'Pause',
    resume: 'Resume',
    next: 'Next',
  },
  es: {
    locale: 'es-ES',
    launcher: 'Pregunta a LAIYA',
    launcherHint: 'Una capa conversacional sobre este portfolio',
    title: 'LAIYA',
    subtitle: 'Una capa sobre este portfolio',
    placeholder: 'Pregunta por su trabajo, su proceso…',
    placeholderShort: 'Pregúntame…',
    inputLabel: 'Tu pregunta para LAIYA',
    send: 'Enviar',
    mic: 'Dicta tu pregunta',
    micStop: 'Dejar de escuchar',
    voiceOn: 'Leer las respuestas en voz alta',
    voiceOff: 'Dejar de leer las respuestas',
    close: 'Cerrar LAIYA',
    clear: 'Empezar de nuevo',
    you: 'Tú',
    states: {
      idle: 'Lista',
      listening: 'Escuchando…',
      thinking: 'Buscando en el portfolio…',
      speaking: 'Respondiendo',
    },
    open: 'Abrir el caso',
    showOnPage: 'Enséñamelo en la página',
    goTo: 'Llévame',
    sections: 'Dentro del caso',
    selfDirected: 'Proyecto propio',
    professional: 'Prensa Ibérica',
    present: 'actualidad',
    remoteNote: 'Respuesta redactada con Claude a partir del texto del portfolio',
    pause: 'Pausa',
    resume: 'Seguir',
    next: 'Siguiente',
  },
};

// Lo que LAIYA dice. Varias variantes donde la repetición se notaría: una
// capa que contesta siempre con la misma frase deja de parecer que escucha.
export const VOICE = {
  en: {
    greet: [
      'I’m LAIYA, a layer over José’s portfolio. Ask me about his work and I’ll show you where it lives on the page.',
      'Hello. I only know what this portfolio publishes, and I can take you to any part of it.',
    ],
    greetAgain: ['Still here. What else do you want to see?', 'Go ahead.'],
    // Cuando el visitante saluda él: un «hola» merece un hola, no un «sigo aquí».
    helloBack: ['Hi. Where shall I start: his work, his career or how to reach him?', 'Hello. Ask me about any project, or let me show you around.'],
    identity: [
      'LAIYA comes from “layer”. I’m not a separate site: I sit on top of this one and answer only with what’s already published here. If it isn’t on the page, I’ll say so.',
    ],
    person: '{name} is a {role} based in {location}. This is how he introduces himself:',
    projects: 'Six cases. Four are professional work at Prensa Ibérica; two are self-directed and labelled as such.',
    projectIntro: '{name}, in his own words:',
    selfDirected: 'Two of the six are his own projects, labelled as such on the page: {list}.',
    career: 'Nineteen years, five stages. From agency front-end in 2007 to multi-brand design systems today.',
    tools: 'Four practices, and the tools he uses to ship them.',
    ai: 'He doesn’t treat AI as a prompt box. His position, in his words:',
    accessibility: 'WCAG 2.1 AA is part of his practice: {detail}',
    systems: 'Design systems are the centre of his work since 2021 — Brickee at Aliseda, then 42DS at Prensa Ibérica.',
    contact: 'The professional email is the best route. LinkedIn and the CV are here too.',
    cv: 'Here is the CV as a PDF.',
    location: 'He is based in {location}.',
    languages: 'Languages: {languages}.',
    education: 'Education: {education}.',
    hire: 'If you are hiring for design systems, front-end architecture or editorial product, write to him directly. I can’t speak for his availability; he can.',
    thanks: ['You’re welcome.', 'Any time. I’ll be in the corner.'],
    bye: ['I’ll stay docked in the corner if you need me.'],
    // Lo que no está publicado no se deduce: se dice, y se ofrece el email.
    private: 'The portfolio doesn’t publish that, so I don’t know it. For anything professional, the best way is to write to him.',
    help: 'Things I can show you:',
    destroy: 'You asked for it. Gravity on. Grab the pieces and throw them.',
    restore: 'Better leave it as he built it. Everything back in its place.',
    found: 'This is the closest part of the portfolio:',
    foundIn: 'In the {case} case:',
    notFound: 'That isn’t in the portfolio, and I don’t make things up. You could ask José directly, or try one of these.',
    remoteFail: '',
  },
  es: {
    greet: [
      'Soy LAIYA, una capa sobre el portfolio de José. Pregúntame por su trabajo y te enseño dónde está en la página.',
      'Hola. Solo sé lo que publica este portfolio, y puedo llevarte a cualquier parte de él.',
    ],
    greetAgain: ['Sigo aquí. ¿Qué más quieres ver?', 'Adelante.'],
    helloBack: ['Hola. ¿Por dónde empiezo: su trabajo, su trayectoria o cómo contactarle?', 'Hola. Pregúntame por cualquier proyecto, o deja que te enseñe la web.'],
    identity: [
      'LAIYA viene de «layer», capa. No soy otra web: me pongo encima de esta y solo respondo con lo que ya está publicado aquí. Si no está en la página, te lo digo.',
    ],
    person: '{name} es {role} y vive en {location}. Así se presenta él:',
    projects: 'Seis casos. Cuatro son trabajo profesional en Prensa Ibérica; dos son proyectos propios y van etiquetados como tales.',
    projectIntro: '{name}, en sus palabras:',
    selfDirected: 'Dos de los seis son proyectos propios, y la página los etiqueta así: {list}.',
    career: 'Diecinueve años, cinco etapas. Del front-end de agencia en 2007 a los design systems multimarca de hoy.',
    tools: 'Cuatro prácticas, y las herramientas con las que las lleva a producción.',
    ai: 'No trata la IA como una caja de prompts. Su postura, en sus palabras:',
    accessibility: 'WCAG 2.1 AA es parte de su práctica: {detail}',
    systems: 'Los design systems son el centro de su trabajo desde 2021: primero Brickee en Aliseda, ahora 42DS en Prensa Ibérica.',
    contact: 'La mejor vía es el email profesional. También tienes LinkedIn y el CV.',
    cv: 'Aquí tienes el CV en PDF.',
    location: 'Vive en {location}.',
    languages: 'Idiomas: {languages}.',
    education: 'Formación: {education}.',
    hire: 'Si buscas a alguien para design systems, arquitectura front-end o producto editorial, escríbele directamente. Su disponibilidad no la sé yo; la sabe él.',
    thanks: ['De nada.', 'Cuando quieras. Me quedo en la esquina.'],
    bye: ['Me quedo acoplada en la esquina por si me necesitas.'],
    private: 'Eso no lo publica el portfolio, así que no lo sé. Para lo profesional, lo mejor es escribirle.',
    help: 'Esto es lo que puedo enseñarte:',
    destroy: 'Tú lo has pedido. Gravedad activada. Coge los trozos y lánzalos.',
    restore: 'Mejor la dejo como él la construyó. Todo en su sitio.',
    found: 'Esta es la parte del portfolio que más se acerca:',
    foundIn: 'En el caso {case}:',
    notFound: 'Eso no está en el portfolio, y no me invento nada. Puedes preguntárselo a José directamente, o probar con alguna de estas.',
    remoteFail: '',
  },
};

// Preguntas sugeridas. Cubren las cuatro que BRAND.md §2 dice que quien
// contrata tiene que poder responder en 30 segundos: escala, método, alcance e IA.
export const SUGGESTIONS = {
  en: {
    start: ['Who is José?', 'Show me his work', 'How does he use AI?', 'How do I contact him?'],
    afterPerson: ['Show me his work', 'His career in a minute', 'What tools does he use?'],
    afterProjects: ['Tell me about 42DS', 'What did the SPORT research find?', 'What is self-directed here?'],
    afterProject: ['Show me his work', 'How does he use AI?', 'How do I contact him?'],
    afterCareer: ['Tell me about 42DS', 'Where did he study?', 'What tools does he use?'],
    afterContact: ['Download the CV', 'Show me his work', 'Break the page'],
    fallback: ['Show me his work', 'Who is José?', 'How do I contact him?', 'Break the page'],
  },
  es: {
    start: ['¿Quién es José?', 'Enséñame su trabajo', '¿Cómo usa la IA?', '¿Cómo le contacto?'],
    afterPerson: ['Enséñame su trabajo', 'Su trayectoria en un minuto', '¿Con qué herramientas trabaja?'],
    afterProjects: ['Cuéntame 42DS', '¿Qué encontró la investigación de SPORT?', '¿Qué proyectos son propios?'],
    afterProject: ['Enséñame su trabajo', '¿Cómo usa la IA?', '¿Cómo le contacto?'],
    afterCareer: ['Cuéntame 42DS', '¿Dónde estudió?', '¿Con qué herramientas trabaja?'],
    afterContact: ['Descargar el CV', 'Enséñame su trabajo', 'Rompe la web'],
    fallback: ['Enséñame su trabajo', '¿Quién es José?', '¿Cómo le contacto?', 'Rompe la web'],
  },
};

// Dentro de un recorrido LAIYA puede contestar sobre lo que está señalando
// sin salir de él: «¿cuándo?», «¿qué cifras?», «¿con qué?», «cuéntame más».
// Las respuestas son frases de la propia página, ya etiquetadas por
// build-laiya.mjs en assets/laiya/tour-*.json; aquí solo vive lo que LAIYA
// dice con voz propia: las preguntas que ofrece y cómo presenta lo que cita.
export const TOUR = {
  en: {
    ask: {
      more: 'Tell me more',
      when: 'When was this?',
      numbers: 'What are the numbers?',
      tools: 'What was it built with?',
      who: 'Who was involved?',
      why: 'Why?',
      result: 'What changed?',
      go: 'Take me to the case',
      next: 'Carry on',
      resume: 'Resume the tour',
    },
    lead: {
      more: 'In the page’s words:',
      when: 'On timing, the page says:',
      numbers: 'The figures, as published:',
      tools: 'What it was built with:',
      who: 'Who was involved:',
      why: 'The reason, in the page’s words:',
      result: 'What changed:',
      elsewhere: 'The case itself, {case}, says:',
    },
    none: 'The page doesn’t say more about that here. You can carry on with the tour or ask me something else.',
    noTour: 'There’s no tour running. Ask me to show you his work, his career or how to reach him.',
    noCase: 'This step doesn’t lead to a case. Tell me which one you want to see.',
    arrive: 'This is {case}.',
    walk: 'Show me this case',
    commands: {
      next: ['next', 'carry on', 'continue', 'go on', 'keep going', 'onwards', 'resume', 'resume the tour'],
      back: ['back', 'previous', 'go back', 'the one before'],
      again: ['again', 'repeat', 'say that again', 'one more time'],
      stop: ['stop', 'pause', 'wait', 'hold on'],
    },
  },
  es: {
    ask: {
      more: 'Cuéntame más',
      when: '¿Cuándo fue?',
      numbers: '¿Qué cifras hay?',
      tools: '¿Con qué se hizo?',
      who: '¿Quién participó?',
      why: '¿Por qué?',
      result: '¿Qué cambió?',
      go: 'Llévame al caso',
      next: 'Sigue',
      resume: 'Seguir el recorrido',
    },
    lead: {
      more: 'En palabras de la página:',
      when: 'Sobre las fechas, la página dice:',
      numbers: 'Las cifras, tal como se publican:',
      tools: 'Con qué se hizo:',
      who: 'Quién participó:',
      why: 'El porqué, en palabras de la página:',
      result: 'Lo que cambió:',
      elsewhere: 'El propio caso, {case}, dice:',
    },
    none: 'La página no cuenta más sobre eso aquí. Puedes seguir el recorrido o preguntarme otra cosa.',
    noTour: 'No hay ningún recorrido en marcha. Pídeme que te enseñe su trabajo, su trayectoria o cómo contactarle.',
    noCase: 'Este paso no lleva a ningún caso. Dime cuál quieres ver.',
    arrive: 'Estás en {case}.',
    walk: 'Enséñame este caso',
    commands: {
      next: ['siguiente', 'sigue', 'continua', 'adelante', 'vale sigue', 'la siguiente', 'el siguiente', 'seguir', 'seguir el recorrido', 'reanuda'],
      back: ['atras', 'anterior', 'vuelve', 'el anterior', 'la anterior'],
      again: ['repite', 'otra vez', 'de nuevo', 'repitelo'],
      stop: ['para', 'pausa', 'espera', 'detente'],
    },
  },
};

// El cerebro remoto es opcional. Vacío: LAIYA responde solo con el motor
// local. Con una URL: pregunta primero al Worker (ver workers/laiya/) y, si no
// contesta a tiempo, vuelve al motor local sin que se note.
export const REMOTE = {
  endpoint: '',
  timeoutMs: 12000,
};
