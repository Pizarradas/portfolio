# José Luis Pizarro — Portfolio V7

## What changed

- Stronger storytelling on Home.
- New complete `SPORT Mobile Cards` case study.
- Apache ECharts 6.1.0 for evidence-led data visualisation.
- Simple Icons for brand marks and Lucide for functional UI icons.
- New “My working environment” section based on the supplied tool list.
- Brand marks remain monochrome so third-party brand colours do not compete with JLP identity.
- Data-viz follows the same JLP/SYX token system.

## Storytelling principle

Each case should answer:
1. What tension or uncertainty existed?
2. What did I decide?
3. What evidence changed the conversation?
4. What trade-off did the team have to understand?
5. What did I learn or carry forward?

## SYX

Identity and case-study styles continue to follow:
`Primitive → Semantic → Component`.


## V8 — screenshot readability

Added a reusable SYX-style `mol-media-viewer` component. Screenshots can now be viewed fitted to the layout, switched to a readable 100% canvas with horizontal scrolling, or opened in a full-screen lightbox without modifying the source evidence.


## V9 — recruiter-first visuals

42DS no longer uses Storybook as the primary visual. The hero now shows real multi-brand header evidence extracted from the supplied Figma file, plus a compact foundations/implementation layer. Storybook is repositioned as secondary technical evidence, with a readable detail crop and the original full screenshot available on demand.

## V10 — portfolio recalibration

Home hierarchy is now recruiter-first:
1. Positioning: Product Designer across design, code and AI.
2. 42DS = scale / systems.
3. SPORT Cards = evidence / product thinking.
4. World Cup 2026 = end-to-end interactive build.
5. ATLAS × SYX = governed AI-native editorial system.
6. SPORT Illustrations = visual craft interlude.
Technical evidence remains secondary to visible product work.


## V11 — visible work, coded evidence
- Fixed the failed V10 insertion: World Cup, ATLAS and SPORT Illustrations now render in the Home.
- Rebuilt the SPORT research visual as semantic HTML/CSS rather than a tiny screenshot.
- Real Figma illustration overview is used for the visual-craft interlude.
- Recruiter scan strip maps each selected work item to a capability.

## V12 — evidence as front-end, complete case architecture

- Replaced the SPORT Figma table screenshot on Home with semantic HTML/CSS.
- Replaced the abstract map card with a coded data/product flow.
- Removed external brand-icon dependency from the tool list; tool marks are now self-contained and cannot fail to load.
- Added an explicit six-case index on Home.
- Added dedicated pages for Interactive Map, World Cup 2026, ATLAS × SYX and SPORT Illustrations.
- Existing 42DS and SPORT case studies remain dedicated pages.
- Rule: structured information is rebuilt in front-end; original visual design is shown as visual evidence.


## V13 — 42DS flagship rebuild
42DS is now the main case study. The page is rebuilt around real architecture from the supplied SCSS, fourty and AI packages: foundations, base, brand setup, component composition, multi-brand bundles, AMP/Piano/legacy targets, design-to-engineering pipeline and AI mode governance. Structured concepts are rendered as front-end diagrams; Figma files are used only as visual evidence.

## V14 — narrative and motion review

42DS was reviewed as the flagship case for clarity and scanability.
Narrative is now grouped into six acts: Context → System → Scale → Reality → Evolution → Role.
Long explanatory paragraphs were shortened and duplicated ideas removed.

Animated data/visual elements:
- ECharts component-inventory chart: 31 atoms, 71 molecules, 32 organisms (134 total families).
- Count-up metrics: 134 component families and 13 specialised AI modes.
- Progressive reveal for architecture layers, multi-brand branches, production pipeline and AI governance.
- Motion respects prefers-reduced-motion.

Non-quantitative concepts remain diagrams rather than charts to avoid turning architecture into fake data.

## V15 — 42DS visual architecture diagrams
Added four code-native, responsive diagrams to the flagship case:
1. Architecture at a glance — foundations → base → brand/components → production targets.
2. Composition hierarchy — foundations → atoms → molecules → organisms → product patterns.
3. Operating model — 42DS connected to Figma, HTML/SCSS/JS, Storybook, Vue and AI Mind System.
4. Human + AI architecture — 42DS knowledge → specialised modes → governance → REUSE-FIRST execution.

All diagrams are semantic HTML/CSS/SVG, animate on viewport entry through the existing V14 reveal system, and respect prefers-reduced-motion.

## V16 — code-native design-system visuals
Replaced the low-value Figma file-cover thumbnails in 42DS with live front-end representations:
- Token alias flow: Primitive → Semantic → Component.
- Live button states.
- Live form controls and accessible states.
- Responsive navigation example.
- Annotated editorial component anatomy.

Figma is now reserved for places where the actual visual design is evidence; system concepts are reconstructed as code.


## V17 — code-native multi-brand header visual
Replaced the unreadable Figma header overview with a live coded diagram: shared semantic core → four brand expressions, plus a rule strip for semantic DOM, shared IA, multi-brand expression and accessibility.


## V18 — interactive tokens + responsive grid
Added two source-grounded, code-native foundation visuals to 42DS:
- Interactive brand-token lab using representative values from the real brand setup files: EP #f53036 / 1.6rem / 2rem, SPORT #ec0918 / 1.8rem / 2.2rem, EPE #0034dd / 1.6rem / 2rem, Regionales #136496 / 1.8rem / 2.2rem.
- Interactive 12-column grid lab based on the real SCSS grid: 8.333333% column unit, breakpoints 768 / 1002 / 1280, 0.8rem XS padding, 1.1rem from 768px, max grid width 1680px and p-less max 1920px.


## V19 — mobile-first audit + code-native research data
- Mobile base target is now 360px; desktop/tablet layouts progressively enhance from 768px.
- Shared case heroes, facts, sections, diagrams, code galleries, token/grid labs, header diagrams and home layout received explicit small-screen rules.
- The 42DS operating-model diagram becomes a stacked semantic flow on mobile instead of squeezing absolutely positioned nodes.
- The SPORT report screenshot was removed from the main narrative and rebuilt as semantic HTML data: sample sizes, criteria and aggregate results.
- Data tables become labelled card rows on mobile and return to normal table layout on larger screens.
- Visual artwork remains image evidence; structured information is rendered as code.


## V20 — progressive enhancement restored
Mobile-first remains the base at 360px, but tablet and desktop now receive deliberate layout upgrades rather than inheriting the compact mobile composition.
- Tablet 768–1199: stronger hero, 5-column capability strip, 2-column work layouts, restored diagram grids.
- Desktop 1200+: editorial hero scale, 5-column recruiter strip, featured 42DS split layout, two-column project grids, full system diagrams, richer case layouts.
- Large desktop 1720+: content width is capped/centered to avoid excessive empty space and over-stretched sections.


## V21 — live project context
Added lazy, non-interactive GitHub Pages previews for World Cup 2026 and both ATLAS modes (ATELIER / OBSIDIANA).
Strategy: embedded previews are visual evidence only — pointer interaction is disabled, while a clear “Open live” link launches the actual project. The iframe is rendered at a 1440px virtual viewport and scaled to its card, giving a desktop-like pre-render effect without storing screenshots in the portfolio.
This reduces maintenance compared with static screenshots: when the published project changes, the portfolio preview changes too.


## V23 — original SPORT illustration assets
Replaced the Figma overview image with the supplied standalone illustration assets.
- Home: editorial mosaic using original SVG/image files.
- Case study: dedicated visual case with a larger masonry-like mosaic and concise narrative.
- Motion is limited to viewport-entry reveal and respects prefers-reduced-motion.
- Original vectors remain unmodified; layout, cropping and sequencing happen in the portfolio layer.

## V24 — project preview hierarchy
- Removed duplicated World Cup preview: one live/browser surface is enough before the narrative.
- Rebuilt ATLAS presentation as two independent visual registers: Atelier and Obsidiana.
- Each ATLAS render now has its own title, editorial character, live preview and destination.
- Kept the shared ATLAS case narrative below them so the relationship remains clear: one governed system, different editorial intent.


## V25 — ATLAS as two independent home blocks
- Removed the combined Atelier/Obsidiana card from Home.
- Atelier and Obsidiana are now independent sibling project blocks with their own preview, narrative, capabilities and CTA.
- Both still link to the shared ATLAS case study, where the common architecture and governance are explained.
- World Cup occupies a separate full-width row on desktop; Atelier and Obsidiana occupy the next row as two distinct cases.


## V26 — tighter live frames + curated illustration collage
- ATLAS previews now use a fixed hero aspect ratio so the portfolio shows the meaningful published composition instead of a large black tail.
- The same editorial crop is applied to the large ATLAS case-study previews.
- SPORT Illustrations on Home now uses 7 selected original assets rather than the full set.
- The illustration section is presented as a single asymmetrical collage with minimal gaps and hover-only metadata, reducing the catalogue/card feeling.


## V27 — ATLAS hero rows
Atelier and Obsidiana now use the same presentation logic as World Cup:
- each register is a full editorial row, not a vertical card;
- live preview occupies the dominant visual area;
- concise narrative sits beside it;
- Obsidiana reverses the layout on desktop to create rhythm;
- preview uses a 16:9 hero crop and cover-like iframe scaling, eliminating the large black tail.

## V28 — Home project hierarchy
The home now prioritises the work that best represents the current positioning:
1. World Cup 2026 — SYX / end-to-end product
2. Atelier — ATLAS + SYX / editorial register
3. Obsidiana — ATLAS + SYX / editorial register
4. 42DS — scalable design-system architecture
5. Interactive Media Map — productisation
6. SPORT Cards — evidence-led product research
7. SPORT Illustrations — visual craft

The ordering is intentional: first impression = current Product Designer + systems + AI-assisted execution; supporting breadth follows afterwards.

## V30 — original Interactive Media Map development
The abstract map proof has been replaced by a standalone reconstruction from the supplied original HTML. Leaflet, IGN tiles, real locations, publication-specific SVG markers, popups and the original bounds/reset logic are preserved. Only unrelated page chrome, ads, footer and long link lists were removed for portfolio presentation.

## V31 — bilingual site (EN root, ES mirror)
The site ships in English and Spanish. English lives at the repo root and is the
single source of truth for markup; Spanish lives in `es/` and is **generated**,
never hand-edited.

```
npm run build:i18n     # regenerate es/ from the English pages
npm run check:i18n     # fail if any string is missing a translation
npm run extract:i18n   # write i18n/_missing.json with the untranslated strings
```

`scripts/build-i18n.mjs` walks each English page without parsing it into a tree,
swaps every text run and human-readable attribute through `i18n/es.json`,
rewrites relative URLs one level down, sets `lang="es"` and fills two marked
blocks: the `hreflang`/canonical set and the language switch. Both markers exist
in the English pages too, so `EN`/`ES` links and alternates never drift apart.

Editing workflow: change the English page, run `npm run build:i18n`, and add any
new sentence it reports to `i18n/es.json`. Strings that read the same in both
languages — proper nouns, job titles, tool names, code fragments — go in the
`__same` array rather than as identical key/value pairs.

`build-timeline.mjs` and `build-map-process.mjs` inject into `index.html`, so
they must run **before** `build-i18n.mjs`; `npm run build` already orders them.

### The switcher
Two languages, so two always-visible links (`EN / ES`) rather than a `<select>`:
the current language stays readable without opening anything and switching costs
one click. Each link points at the translated twin of the page being read, not at
the home page, and `js/lang-switch.js` carries the current `#anchor` across so the
reader lands where they already were. There is no stored preference and no
automatic redirect — a redirect would fire after the page had already painted,
and a Spanish speaker may be reading the English version on purpose.

## V32 — todo el CSS bajo la arquitectura SCSS
Las 25 hojas escritas a mano han desaparecido. `css/` contiene un único fichero,
`portfolio.css`, generado desde `scss/`. Cada página carga **una** hoja.

```
scss/
  abstracts/
    mixins/        _positioning.scss, _helpers.scss   ← nuevo (R03/R04 de SYX)
    tokens/        primitives → semantic → components
  base/            _reset, _elements, _form-and-code
  atoms/           _portfolio, _case-visuals, _data-table, _shared-enhancements
  molecules/       _portfolio, _research, _case-diagrams, _code-visuals,
                   _header-system, _illustrations, _live-preview,
                   _shared-enhancements
  organisms/       _portfolio, _case-shell, _case-42ds, _sport,
                   _illustrations, _home-sections, _shared-enhancements
  utilities/       _portfolio, _keyframes
```

**Cómo se hizo sin romper nada.** El orden de los `<link>` era idéntico en las
siete páginas, así que existía un orden total. Se aplanaron las reglas
conservando su cadena de at-rules, se fusionaron por (contexto, selector) con la
última declaración ganando —que es lo que el navegador computaba— y se emitió un
bloque por selector. Después se comprobaron las **2.492 declaraciones**
resultantes contra el build: 0 propiedades ausentes, 0 valores distintos.

**Reglas de SYX aplicadas al migrar:**

| Regla | Antes | Ahora |
|---|---|---|
| R02 `!important` | 67 | 0 |
| R03 `transition:` en crudo | 19 | 0 — vía `@include transition()`, que añade la guarda de `prefers-reduced-motion` |
| R04 `position:` en crudo | 23 | 0 fuera de `base/_reset` y `utilities` |

**Lo que queda abierto.** Los tres `_shared-enhancements.scss` son ajustes de
componentes definidos en `_portfolio.scss`; lo coherente sería plegarlos dentro
de cada componente. Y `abstracts/tokens/components/_case-and-evidence.scss`
todavía guarda tokens con prefijos ad-hoc (`--mf-`, `--pe-`, `--v22-`) que
deberían promoverse a la capa semántica. Ambas cosas están señaladas en el
propio código.

`npm run check:css` avisa de comentarios sin cerrar y de clases declaradas que ya
no existen en el marcado.
