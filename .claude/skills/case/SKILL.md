---
name: case
description: Reconstruir una página de caso (case-*.html) sobre la plantilla del sistema. Cubre las cinco piezas del vocabulario, los criterios que igualan las seis páginas entre sí, el procedimiento sección a sección y las trampas que ya costaron una reconstrucción entera en 42DS. Úsala en cuanto toque migrar, rediseñar o auditar cualquier case-*.html.
---

# Página de caso

**Fuente: [`scss/organisms/_case-template.scss`](../../../scss/organisms/_case-template.scss).**
Ahí está la plantilla y el porqué de cada decisión, escrito en el propio código.
Aquí está el procedimiento y lo que ya ha salido mal.

`case-42ds.html` está reconstruida entera. **Es el patrón de referencia:** ante
la duda, mira cómo lo resuelve esa página antes de inventar.

## Cuándo entra

Al tocar cualquier `case-*.html`. Después de `brand` (qué se dice) y
`proportions` (cuánto mide); antes de `scss` (dónde vive) y `verify` (demostrar
que no se rompió).

## El vocabulario — cinco piezas y ninguna más

| Pieza | Qué es | Marcado |
|---|---|---|
| `.org-case__chapter` | el corte de acto: una de las cinco preguntas de `BRAND.md` §1 | `+ .atom-index` («Act 03») `+ h2` |
| `.org-case__act` | una sección: banda de encabezado arriba, figura debajo | `+ .mol-section-heading` |
| `.org-case__band` | acto con corte de ritmo a color | igual, más un contexto |
| `.mol-section-heading` | la banda: etiqueta · titular · entradilla en tres pistas | `p.atom-eyebrow` + `h2` + `p` |
| `.mol-case-figure` | diagrama **con** pie | `figure` + `figcaption` |

El paginador (`.org-case-next`) y el pie son de armazón: ya están resueltos para
las seis páginas, no se tocan por página.

Esas cinco son el **armazón**: dónde va cada cosa. El **contenido** que va dentro
tiene dos piezas más —`.mol-case-ledger` para el objetivo y la renuncia,
`.mol-case-roster` para un conjunto nombrado— y las decide la skill `story`, que
es la fuente de qué hueco narrativo llena cada una. No las inventes desde aquí.

## Los siete criterios

1. **Un registro para toda la página: `syx-span-survey`.** `showcase` una vez
   por página como mucho, y hay que poder explicar por qué esa sección es la
   evidencia más fuerte del caso. Si hay dos, ninguna es la importante.
2. **Tres tamaños, en esta proporción:** portada 96 · capítulo 64 · sección 44.
   Ningún titular de sección puede adelantar al capítulo que lo presenta.
3. **La numeración la llevan los capítulos**, no las secciones. Un «05» dentro
   de una sección compite con el «Act 04» que tiene encima y no aporta orden.
4. **Los actos apilan.** Banda arriba, figura debajo, las dos a ancho de
   registro. Nunca dos columnas: es el defecto que la plantilla existe para
   deshacer, y el que más vacío produce en pantalla grande.
5. **Un fondo de color es un contexto** (`.syx-on-night`, `.syx-on-brand`), no
   un hex. `BRAND.md` §4: dos bandas a sangre, no cinco.
6. **Todo diagrama es una figura y toda figura lleva pie.** El pie dice qué se
   mira y de dónde sale.
7. **Si el proyecto tiene repositorio público, se enlaza —y se enlaza en la
   portada.** Es información de ficha, como el rol o el sistema: quien la busca
   la busca antes de leer, no al final. Va en `.org-case-opener__repo`, justo
   debajo de la ficha —dentro no: `.mol-case-facts` reparte en cuatro columnas
   exactas y un quinto dato abre una segunda fila con tres huecos—. Comprueba
   que el repositorio existe y es público antes de enlazarlo, y reutiliza la
   cadena «Explore repository ↗», que ya está traducida.

   **Y otra vez en el cierre, junto a las salidas en vivo** (`.mol-case-exits`,
   una fila con todas las salidas del caso). No es duplicar por duplicar: en la
   portada es un dato de ficha —quien lo busca lo busca antes de leer— y en el
   cierre es la llamada a la acción de quien acaba de leerlo. Si el caso tiene
   más de una experiencia en vivo, la fila las nombra («Open ATELIER ↗», «Open
   OBSIDIANA ↗»): un «abrir en vivo» genérico no diría cuál.

## Procedimiento

**Una sección por vuelta, con render antes y después.** Es lo que permitió cazar
en 42DS un titular partido letra a letra y unas flechas apuntando al revés: en
una pasada de siete secciones eso no se ve.

1. **Lee la sección entera** —marcado y las reglas de su organismo— antes de
   tocar nada.
2. **Marcado a la plantilla.** El párrafo explicativo sube a la tercera pista de
   la banda; el diagrama baja a hermano de la banda.
3. **Borra del SCSS lo que la plantilla ya hace.** Casi siempre: la retícula de
   dos columnas, el `font:` del `h2`, el fondo en crudo, los colores del eyebrow
   y de la entradilla. Si al terminar el organismo se queda vacío, bórralo y
   deja el comentario de qué vivía ahí.
4. **Compila y compara declaración a declaración** (`verify`). El diff debe
   contener **solo** lo que has tocado.
5. **`check:css`, `check:i18n`, y `build:i18n` si tocaste texto.**

## Trampas

Las que ya han aparecido en la reconstrucción de las seis páginas. Ninguna da error; todas se ven en el
render o en ninguna parte.

### De capa

- **La copia de móvil aparcada en `syx.organisms`.** Un bloque `@media(max-width)`
  con una copia literal justo debajo, sin media query y en una capa posterior:
  el layout de móvil se aplica a **todos** los anchos y el de escritorio es
  código muerto. Aparecieron **once** en 42DS —la tubería de tokens apilada, el
  nav de escritorio oculto, los pines convertidos en chips, cuatro celdas en una
  columna—. Búscalas así:
  ```bash
  # regla de molécula viviendo en la capa de organismos = sospechosa
  awk '/@layer syx.organisms/{l=1} /@layer syx\.(molecules|utilities)/{l=0} l && /^\s+\.mol-/' scss/**/*.scss
  ```
- **La restauración a medias.** La copia devuelve dos cosas y el `min-width` de
  abajo solo restaura una: el pipeline recuperó su retícula horizontal pero se
  quedó con las flechas giradas 90°.
- **La pareja de entrada rota.** `.js .x.js-reveal` (tres clases) apaga y
  `.x.is-visible` (dos) enciende: gana la que apaga y el contenido queda
  **invisible para siempre** con JS activo. Las dos reglas llevan `.js` y la que
  enciende va después.

### De contexto y color

- **Dentro de un contexto oscuro, `--semantic-color-primary` es blanco** y
  `--semantic-color-on-primary` es el navy. Un azul de marca dentro de una banda
  oscura sale de `--semantic-color-surface-brand`, que no depende del contexto.
- **Los alias resueltos en `:root` no siguen al contexto.** `--component-eyebrow-color`
  se declara como `var(--semantic-color-primary)` en `:root`, así que su valor se
  fija ahí: repuntar `primary` en el contexto no lo arrastra. Costó tres eyebrows
  a 2.78:1, uno de ellos invisible sobre su propio fondo.
- **Un contexto oscuro no puede envolver paneles claros.** El escaparate de
  tokens lee 47 tokens semánticos de color: con `.syx-on-night` encima, sus
  paneles blancos se quedan con texto blanco. El sistema aún no tiene contexto
  claro anidable.
- **Nada de `opacity` para una etiqueta.** Compone contra lo que haya detrás, así
  que el contraste deja de poder calcularse. Color siempre.
- **`color: inherit` en `a` gana a la regla del componente** (0,1,1 contra
  0,1,0): el CTA del paginador se servía en tinta sobre azul, 2.85:1, en las seis
  páginas.

### De medida y retícula

- **La banda dentro de media sección se estrangula.** Sus pistas de etiqueta y
  entradilla tienen mínimo propio; la del titular es `minmax(0, 1fr)` y **puede
  encogerse hasta cero**. Con `overflow-wrap: break-word` en la base, el titular
  se parte letra a letra en vertical. Si una sección conserva retícula propia,
  la banda necesita `grid-column: 1/-1`.
- **`base/_elements.scss` topa todo `<p>` a 66ch.** Un `<p>` usado como rótulo
  dibuja su fondo y su borde solo hasta ahí: `max-width: none`.
- **El clamp muerto.** Un `font:` abreviado con `clamp()` y un `font-size` en la
  línea siguiente que lo pisa. Está en casi todos los organismos viejos.
- **La medida va en el elemento que fija el tamaño de letra**, nunca en el
  envoltorio: eso es lo que metió mapas de cinco columnas dentro de 66ch.

### De marcado y scripts

- **Un `style` en línea de un script gana a cualquier hoja.** Antes de tocar una
  regla por segunda vez, comprueba si hay JS escribiendo sobre ese elemento:
  `grep -rn "style\." js/`. Costó cuatro rondas en la previsualización en vivo
  —dos arreglos de CSS que el script pisaba, y un `transform-origin` que se
  perdió al limpiar la hoja mientras el `transform` seguía vivo en el script—.
- **Quien escribe `transform` escribe su origen.** Repartidos entre hoja y
  script, cualquier limpieza en uno rompe al otro sin que nada falle.
- **El alto de un `iframe` es la ventana que ve la página embebida.** Forzarlo a
  un valor mayor que el marco descoloca cualquier héroe a `100vh` de dentro.

### De contenido

- **El texto en un atributo no lo ve el extractor de i18n.** `data-act` se
  pintaba con `content: attr()` y se servía en inglés en la página en español,
  seis veces, sin que `check:i18n` pudiera detectarlo.
- **Dos secciones del mismo color pegadas suelen ser una sección repetida.** En
  42DS las dos bandas de IA repetían REUSE-FIRST cuatro veces y el mismo rótulo
  de gobernanza palabra por palabra; una de las figuras era subconjunto de la
  otra. El color era el síntoma.
- **Una figura que no dice lo que dice su titular sobra o hay que rehacerla.**
  El mapa de fundaciones enseñaba cinco columnas iguales bajo el titular
  «separar lo global de lo específico»: lo único que aportaba sobre el atlas del
  acto anterior era justo lo que no dibujaba.

## Antes de terminar

- [ ] Ningún `data-act` ni numeración de sección
- [ ] Un solo registro, y `showcase` como mucho una vez
- [ ] Ningún acto en dos columnas
- [ ] Ningún hex de fondo: contextos
- [ ] Los organismos vaciados, borrados y comentados
- [ ] Diff del CSS compilado con **solo** lo tocado
- [ ] Contrastes calculados, no estimados
- [ ] Sigue la skill `verify`
