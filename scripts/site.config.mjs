// What the site publishes about itself.
//
// Read by build-i18n.mjs (the generated <head> block), build-seo.mjs (sitemap
// and robots.txt) and build-og.mjs (the social cards). The origin, the page
// list and the identity are declared once here so the three generators cannot
// drift apart — a canonical URL that disagrees with the sitemap is the classic
// way a static site loses its indexing.

// El dominio propio, declarado en el CNAME de la raíz. El sitio se sirve en el
// ápex, no bajo /portfolio/, así que aquí no va ninguna ruta.
//
// Esto era `https://pizarradas.github.io/portfolio` y cambiarlo no es cosmético:
// de aquí salen los canónicos, los hreflang, `og:url`, las URLs de las tarjetas
// sociales, los `@id` del JSON-LD y las catorce entradas del sitemap. Con el
// CNAME puesto, GitHub Pages redirige la URL vieja con un 301 — y un canónico
// que apunta a una redirección es una señal contradictoria: se le está diciendo
// al buscador «indexa esta», y esa manda a otra.
export const BASE = 'https://joseluispizarro.com';

// Identity for the Person / ProfilePage graph. Everything here is already
// public on the page itself, and the email is the professional one — BRAND.md
// §6 forbids the personal address anywhere on the site.
export const SITE = {
  name: 'José Luis Pizarro',
  jobTitle: 'Product Designer & Front-End Engineer',
  email: 'profesional.pizarro@gmail.com',
  locality: 'Madrid',
  country: 'ES',
  sameAs: ['https://www.linkedin.com/in/joseluispizarrofeo'],
  // Claims the site actually backs with a case, not a keyword list.
  knowsAbout: [
    'Design Systems',
    'Design Tokens',
    'Front-End Engineering',
    'SCSS Architecture',
    'Editorial Product Design',
    'Web Accessibility (WCAG 2.1 AA)',
    'AI-assisted Development',
  ],
  siteName: { en: 'José Luis Pizarro — Portfolio', es: 'José Luis Pizarro — Portfolio' },
};

// El CV, que existe en los dos idiomas y no es una página.
//
// No puede resolverlo `rewriteUrl` como un activo compartido cualquiera: los
// demás —hojas, scripts, imágenes— son el mismo fichero para los dos idiomas y
// solo cambian de ruta. Este cambia de fichero, así que la versión española
// tiene que sustituirlo, no solo prefijarlo con `../`.
//
// Declarado aquí porque lo leen el marcado inglés y el generador, y porque un
// enlace que apunta a un PDF que no existe es un 404 silencioso: el navegador
// no avisa, simplemente no descarga nada.
export const CV = {
  en: 'jose-luis-pizarro-cv-en.pdf',
  es: 'jose-luis-pizarro-cv-es.pdf',
};

// Every page that exists in both languages. Order is the crawl order in the
// sitemap and, on the home page, the order of the argument (BRAND.md §1).
//
//   ogType   — profile for the person, article for a case study
//   schema   — the schema.org @type of the page's main entity
//   priority — sitemap hint, relative within this site only
//   crumb    — BreadcrumbList label, per language
export const PAGES = [
  {
    file: 'index.html',
    ogType: 'profile',
    schema: 'ProfilePage',
    priority: '1.0',
    crumb: { en: 'Home', es: 'Inicio' },
  },
  {
    file: 'case-42ds.html',
    ogType: 'article',
    schema: 'CreativeWork',
    priority: '0.9',
    crumb: { en: '42DS', es: '42DS' },
  },
  {
    file: 'case-sport.html',
    ogType: 'article',
    schema: 'CreativeWork',
    priority: '0.8',
    crumb: { en: 'SPORT Mobile Cards', es: 'Tarjetas móviles de SPORT' },
  },
  {
    file: 'case-map.html',
    ogType: 'article',
    schema: 'CreativeWork',
    priority: '0.8',
    crumb: { en: 'Interactive Media Map', es: 'Mapa interactivo de medios' },
  },
  {
    file: 'case-worldcup.html',
    ogType: 'article',
    schema: 'CreativeWork',
    priority: '0.8',
    crumb: { en: 'World Cup 2026', es: 'Mundial 2026' },
  },
  {
    file: 'case-atlas.html',
    ogType: 'article',
    schema: 'CreativeWork',
    priority: '0.8',
    crumb: { en: 'ATLAS × SYX', es: 'ATLAS × SYX' },
  },
  {
    file: 'case-illustrations.html',
    ogType: 'article',
    schema: 'CreativeWork',
    priority: '0.7',
    crumb: { en: 'SPORT Illustrations', es: 'Ilustraciones de SPORT' },
  },
];

export const PAGE_FILES = PAGES.map(p => p.file);
export const PAGE_BY_FILE = new Map(PAGES.map(p => [p.file, p]));

// La URL pública de una página. Un solo sitio la decide, porque el canónico del
// <head>, el par hreflang y el <loc> del sitemap tienen que decir exactamente lo
// mismo — si discrepan en un carácter dejan de ser la misma URL.
//
// La home se declara en su forma corta. `/` y `/index.html` sirven el mismo
// documento, así que son un duplicado; en un dominio propio lo que se enlaza y
// se comparte es el dominio pelado, de modo que es esa la forma que recibe los
// enlaces y la que debe llevarse la señal.
export const pageUrl = (file, lang) => {
  const base = lang === 'es' ? `${BASE}/es/` : `${BASE}/`;
  return file === 'index.html' ? base : base + file;
};

// The three self-directed registers on the home page.
//
// Each one used to embed its published site in an <iframe>. Between them that
// is over 2 MB of third-party JavaScript on first load — the World Cup explorer
// alone ships 461 KB of Three.js, 150 KB of Leaflet and 133 KB of GSAP — for a
// frame the visitor cannot even interact with (tabindex="-1"). So the page now
// ships a real screenshot and loads the iframe only if asked.
//
// The shot is taken at 1440 wide, the width those pages design against, at half
// device scale: a 720×450 image of the desktop composition rather than a
// phone-width crop of it.
// `settle` is how long to wait past the load event before the shot. The World
// Cup hero runs a scramble on its headline: at 4 s the first capture froze it
// mid-flight and shipped "QG3#P8FLP6F&" where the word should be.
export const PREVIEWS = [
  { file: 'mundial-2026.webp', url: 'https://pizarradas.github.io/syx--mundial-2026/', settle: 10000 },
  { file: 'atlas-atelier.webp', url: 'https://pizarradas.github.io/syx-atlas--reportajes/reportaje-atelier.html' },
  { file: 'atlas-obsidiana.webp', url: 'https://pizarradas.github.io/syx-atlas--reportajes/reportaje-obsidiana.html' },
];
export const PREVIEW_SIZE = { width: 1440, height: 900, scale: 0.5 };
export const previewImage = file => `assets/previews/${file}`;

// Self-hosted faces, downloaded by build-fonts.mjs.
//
// Two families × two subsets. Only the latin cuts are preloaded: latin-ext is
// declared with its own unicode-range, so the browser fetches it if and only if
// the page paints a character that needs it — preloading it would spend ~94 KB
// on glyphs no page reaches.
export const FONT_FAMILIES = { 'Instrument Sans': 'instrument-sans', Inter: 'inter' };
export const FONT_SUBSETS = ['latin', 'latin-ext'];
export const FONT_PRELOAD = ['instrument-sans-latin.woff2', 'inter-latin.woff2'];
export const fontFiles = () =>
  Object.values(FONT_FAMILIES).flatMap(slug => FONT_SUBSETS.map(s => `assets/fonts/${slug}-${s}.woff2`));

// One card per page, generated by build-og.mjs from the page's own headline.
export const ogImage = file => `assets/og/${file.replace(/\.html$/, '')}.png`;
export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

/* ------------------------------------------------------------ html scraping */

// The English pages are the source of truth for copy, so the head generator and
// the card generator read the headline out of the markup instead of keeping a
// second copy of it here. Regex, not a parser: build-i18n already treats these
// files as a token stream, and a tree would have to be re-serialised.

const decode = s =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const stripTags = s => s.replace(/<[^>]*>/g, '');
const squash = s => s.replace(/\s+/g, ' ').trim();

/** Raw <title>, entities intact — safe to drop straight into an attribute. */
export function titleOf(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? squash(m[1]) : '';
}

/** Content of <meta name="description">, whatever order the attributes are in. */
export function descriptionOf(html) {
  const tag = html.match(/<meta\b[^>]*\bname\s*=\s*"description"[^>]*>/i);
  if (!tag) return '';
  const content = tag[0].match(/\scontent\s*=\s*"([^"]*)"/i);
  return content ? squash(content[1]) : '';
}

/** First <h1>, tags removed. The page's real headline, already translated. */
export function headlineOf(html) {
  const m = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? squash(stripTags(m[1])) : '';
}

/** First .atom-eyebrow — the kicker that sits above the headline. */
export function kickerOf(html) {
  const m = html.match(/<p\b[^>]*\bclass\s*=\s*"[^"]*\batom-eyebrow\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  return m ? squash(stripTags(m[1])) : '';
}

/** Same as the above, but decoded for use as JSON-LD text or rendered copy. */
export const plain = s => squash(decode(s));
