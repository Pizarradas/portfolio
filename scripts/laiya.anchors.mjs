// LAIYA — el contrato de anclas: qué nodos del HTML puede señalar, en qué
// recorridos entran y con qué forma y efectos.
//
// `scripts/build-laiya-anchors.mjs` lo aplica a las páginas inglesas (la
// fuente) antes de build-i18n, que copia los atributos a `es/` sin tocarlos.
// Ningún atributo `data-laiya*` se escribe a mano: si un nodo debe estar en un
// recorrido, la regla va aquí.
//
// Atributos que pone en el HTML
// -----------------------------
//   data-laiya="id"            id estable y único en la página. Es la llave que
//                              une el nodo con su ficha en assets/laiya/tour-*.json
//   data-laiya-kind="…"        section | card | role | list | facts | item | block
//                              · section: el runtime encuadra con frameFor() (la
//                                sección entera si cabe, o el mayor bloque que
//                                quepa alrededor del titular)
//   data-laiya-topic="a b"     intenciones del motor que este nodo responde
//   data-laiya-tour="t:n …"    recorrido y posición; un nodo puede estar en varios
//   data-laiya-shape="…"       forma del enjambre al señalarlo (opcional)
//   data-laiya-fx="a b"        efectos sobre la página (opcional)
//
// Cada regla dice cómo encontrar el nodo (`find`) y qué atributos lleva.
// `find` es una de estas:
//   { tag, has }                         primera etiqueta `tag` cuya apertura
//                                        contenga `has` (texto literal)
//   { tag, has, each: true }             todas las que lo contengan, en orden
//   { tag, has, each: true, within }     solo dentro del bloque que abre `within`
//   { sections: true }                   cada <section aria-labelledby="…-title">
// Los atributos pueden ser funciones del nodo encontrado: reciben
// `{ open, inner, i, href, slug, year, repeat, titleSlug }` (`repeat`: otro
// nodo de la misma regla ya enlazaba a ese caso).

const caseSlug = href => (href || '').replace(/^case-|\.html$/g, '');

export const HOME = [
  { find: { tag: 'section', has: 'id="top"' }, id: 'hero', kind: 'section', topic: 'person greet' },
  { find: { tag: 'nav', has: 'class="org-capability-scan"' }, id: 'capabilities', kind: 'block', topic: 'projects' },

  // Trabajo profesional: el titular abre el recorrido y cada tarjeta es un paso.
  { find: { tag: 'div', has: 'class="mol-section-heading', within: 'aria-labelledby="work-title"' }, id: 'projects', kind: 'block', topic: 'projects', tour: 'projects:0', fx: 'kinetic' },
  {
    find: { tag: 'article', has: 'class="mol-project-card', each: true },
    id: n => `project.${caseSlug(n.href)}`,
    kind: 'card',
    topic: n => (n.href === 'case-42ds.html' ? 'projects systems accessibility' : 'projects'),
    tour: n => `projects:${n.i + 1}`,
    fx: 'scatter marks tilt',
  },
  { find: { tag: 'section', has: 'aria-labelledby="illustration-showcase-title"' }, id: 'project.illustrations', kind: 'card', topic: 'projects', tour: 'projects:9', fx: 'scatter tilt' },

  // Proyectos propios.
  { find: { tag: 'div', has: 'class="mol-section-heading', within: 'aria-labelledby="new-work-title"' }, id: 'self-directed', kind: 'block', topic: 'selfDirected', tour: 'selfDirected:0', fx: 'kinetic' },
  {
    find: { tag: 'article', has: 'class="mol-register"', each: true },
    id: n => `project.${caseSlug(n.href)}`,
    kind: 'card',
    // ATLAS tiene dos reportajes en la home; el primero es el que representa
    // al caso en el recorrido de IA.
    topic: n => (n.href === 'case-atlas.html' && !n.repeat ? 'selfDirected ai' : 'selfDirected'),
    tour: n => `selfDirected:${n.i + 1}` + (n.href === 'case-atlas.html' && !n.repeat ? ' ai:1' : ''),
    fx: 'scatter tilt',
  },

  // Trayectoria: la introducción y cada etapa, con su año hecho de partículas.
  { find: { tag: 'header', has: 'class="org-role-evolution-v22__intro"' }, id: 'career', kind: 'block', topic: 'career', tour: 'career:0', fx: 'kinetic' },
  {
    find: { tag: 'li', has: 'class="mol-career-role"', each: true },
    id: n => `career.${n.slug}`,
    kind: 'role',
    topic: 'career',
    tour: n => `career:${n.i + 1}`,
    shape: n => (n.year ? `text:${n.year}` : 'stairs'),
    fx: 'scatter marks',
  },

  // Postura sobre IA.
  { find: { tag: 'div', has: 'class="mol-role-thesis"' }, id: 'thesis', kind: 'block', topic: 'ai', tour: 'ai:0', fx: 'kinetic' },

  // Herramientas.
  { find: { tag: 'section', has: 'aria-labelledby="tools-title"' }, id: 'tools', kind: 'section', topic: 'tools', tour: 'tools:0', fx: 'kinetic' },
  { find: { tag: 'ul', has: 'class="mol-practice-list"' }, id: 'tools.practice', kind: 'list', topic: 'tools', tour: 'tools:1', shape: 'text:{ }', fx: 'marks tilt' },
  { find: { tag: 'div', has: 'class="org-stack__marks"' }, id: 'tools.stack', kind: 'list', topic: 'tools', tour: 'tools:2', fx: 'blueprint' },

  // Quién es.
  { find: { tag: 'section', has: 'aria-labelledby="about-title"' }, id: 'about', kind: 'section', topic: 'person', tour: 'person:0', fx: 'kinetic' },
  { find: { tag: 'dl', has: 'class="mol-about-facts"' }, id: 'about.facts', kind: 'facts', topic: 'person location languages education', tour: 'person:1', shape: 'pin', fx: 'blueprint' },
  {
    find: { tag: 'div', has: '', each: true, within: 'class="mol-about-facts"' },
    id: n => `about.${['location', 'languages', 'education', 'focus'][n.i] || n.i}`,
    kind: 'item',
    topic: n => ['location', 'languages', 'education', 'person'][n.i] || 'person',
    shape: n => ['pin', 'text:ES · EN', 'cap', 'neural'][n.i] || 'pin',
    fx: 'blueprint',
  },

  // Contacto.
  { find: { tag: 'div', has: 'class="org-contact__body"' }, id: 'contact', kind: 'block', topic: 'contact hire', tour: 'contact:0', fx: 'kinetic' },
  { find: { tag: 'ul', has: 'class="mol-contact-list"' }, id: 'contact.links', kind: 'list', topic: 'contact hire cv', tour: 'contact:1', shape: 'text:@', fx: 'tilt' },
  {
    find: { tag: 'li', has: '', each: true, within: 'class="mol-contact-list"' },
    id: n => `contact.${['email', 'linkedin', 'cv'][n.i] || n.i}`,
    kind: 'item',
    topic: n => ['contact', 'contact', 'cv'][n.i] || 'contact',
    shape: n => ['envelope', 'network', 'page'][n.i] || 'envelope',
  },
];

// Las páginas de caso: la apertura y cada sección, en el orden del documento.
export const CASE = [
  { find: { tag: 'header', has: 'class="org-case-opener' }, id: 'case', kind: 'block', tour: 'case:0', fx: 'kinetic marks' },
  {
    find: { sections: true },
    id: n => `section.${n.slug}`,
    kind: 'section',
    tour: n => `case:${n.i + 1}`,
    fx: 'kinetic marks',
  },
];

export const rulesFor = file => (file === 'index.html' ? HOME : CASE);
