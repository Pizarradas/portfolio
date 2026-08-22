# Portfolio de José Luis Pizarro — punto de entrada

Sitio estático bilingüe publicado en GitHub Pages. Siete páginas, un design
system propio en SCSS, sin framework.

Antes de tocar nada, lee lo que aplique. En este orden.

---

## 1. Orden de prioridades

Cuando dos reglas se contradigan, gana la de arriba. Siempre.

| # | Prioridad | Dónde vive | Por qué manda sobre lo de abajo |
|---|---|---|---|
| **1** | **No romper lo publicado** | `skills/verify` | Un portfolio caído o roto cuesta más que cualquier mejora |
| **2** | **Accesibilidad** | `BRAND.md` §5 | El sitio afirma WCAG 2.1 AA. Fallarlo es fallar la tesis |
| **3** | **Marca** | `BRAND.md` | Decide qué entra, cómo suena y qué no se publica |
| **4** | **Contrato SCSS** | `skills/scss` | R01–R04. Están a cero; que sigan a cero |
| **5** | **Proporciones** | `scss/PROPORTIONS.md` | Ningún valor se elige a ojo |
| **6** | **Rendimiento** | este fichero, §4 | Una hoja por página, y que siga así |
| **7** | **Gusto** | — | Lo último, y solo cuando 1–6 están resueltas |

**El error clásico aquí es empezar por 7.** Una idea visual bonita que se salta
el contrato o inventa un tamaño no es una mejora: es deuda con buen aspecto.

---

## 2. A qué skill va cada petición

Las skills viven en `.claude/skills/` y se activan solas por su descripción. Si
una petición encaja en varias, se cargan varias — pero **solo las que hagan
falta**: cargar las cinco para cambiar una coma es tan mal trabajo como no cargar
ninguna para rehacer la escala tipográfica.

| Si la petición es… | Skill | Coste | Ejemplos |
|---|---|---|---|
| tocar copy, titulares, un caso nuevo | `brand` | bajo | «reescribe el hero», «añade un caso» |
| decidir qué falta por contar en un caso | `story` | medio | «este caso no cuenta nada», «pregúntame para completarlo» |
| calcular un tamaño, un hueco, un ancho | `proportions` | bajo | «se ve apretado», «sube el titular» |
| escribir o mover SCSS | `scss` | medio | «crea un componente», «esto va en otro sitio» |
| texto que hay que traducir | `content` | bajo | cualquier cambio de copy en el HTML |
| juzgar el sitio como quien contrata | `recruiter` | medio | «¿esto convence?», «audita el contenido», antes de una candidatura |
| comprobar que un cambio no rompió nada | `verify` | **según el cambio** | siempre, al final |

Casi toda petición real toca **varias**. El orden de ejecución es el de la tabla:
marca decide qué se dice, proporciones deciden las medidas, scss decide dónde
vive el código, content propaga al español, verify demuestra que sigue en pie.

### Recorridos típicos

| Petición | Recorrido |
|---|---|
| «cambia este texto» | `brand` → `content` → `verify` |
| «esta sección se ve apretada» | `proportions` → `scss` → `verify` |
| «añade un caso nuevo» | `story` → `brand` → `scss` → `content` → `verify` |
| «a este caso le falta estructura» | `story` → `brand` → `case` → `content` → `verify` |
| «migra / reorganiza estilos» | `scss` → `verify` (comparación declaración a declaración) |
| «aplica la escala nueva» | `proportions` → `scss` → `verify` (**por bandas, con renders**) |
| «¿esto está bien?» | solo `verify`, y contar lo que se ha comprobado |
| «¿esto convence a quien contrata?» | `recruiter` → `brand` → `content` → `verify` |

**El coste de `verify` lo fija el cambio, no el gusto.** Cambiar una palabra son
dos comandos. Mover mil reglas exige demostrar equivalencia declaración a
declaración. Elegir mal ese nivel es el fallo más caro del proyecto: los tres
fallos silenciosos que ha tenido —dos comentarios sin cerrar y catorce tokens
perdidos— pasaron una verificación que era correcta pero insuficiente.

### Cómo está construida una skill

Tres reglas, para que el sistema no se llene de copias del mismo párrafo:

1. **Este fichero manda sobre todas.** Lo que aplica a *cualquier* petición vive
   aquí y no se repite en ninguna skill. Una skill que reexplique que `css/` es
   salida generada está gastando contexto en algo que ya está cargado.
2. **Si el dominio tiene documento, la skill no lo repite.** Lo referencia y
   aporta solo el procedimiento: cuándo entra, en qué orden, qué comprobar.
   Tienen documento `brand` (`BRAND.md`) y `proportions` (`scss/PROPORTIONS.md`).
   `scss`, `content` y `verify` no lo tienen, así que la skill **es** la fuente.
3. **Todas tienen la misma forma:** fuente → cuándo entra → procedimiento →
   trampas conocidas → antes de terminar. Si a una le sobra una sección, es que
   está repitiendo algo.

---

## 3. Reglas que no se saltan nunca

- **`css/` es salida generada.** Solo contiene `portfolio.css`. Se edita el SCSS
  y punto. Nadie escribe CSS a mano en este proyecto.
- **`es/` es salida generada.** Se edita el inglés y se ejecuta `npm run build:i18n`.
- **No compilar a mano.** Prepros vigila el SCSS y compila solo. `npx sass` sobre
  `css/portfolio.css` sobrescribe su build.
- **Nada de `!important`.** Si hiciera falta, la regla está en la capa equivocada.
- **Nada de `--primitive-*` en componentes.** Siempre vía `--semantic-*`.
- **Ningún valor inventado.** Si no está en `scss/PROPORTIONS.md`, se calcula.
- **El email es `profesional.pizarro@gmail.com`**, nunca el personal.

---

## 4. Estado actual

Lo que ya está resuelto, para no volver a proponerlo:

| | |
|---|---|
| Hojas CSS por página | **1** (era 21) |
| R01 `--primitive-*` en componentes | **0** |
| R02 `!important` | **0** |
| R03 `transition:` en crudo | **0** |
| R04 `position:` en crudo | **0** |
| Ficheros trackeados | **~100** (eran 1.000) |
| Idiomas | inglés canónico + español generado |

---

## 5. El ciclo de trabajo

```
leer  →  cambiar el SCSS / el inglés  →  esperar a Prepros  →  verificar  →  contar qué cambió
```

```bash
npm run check:css     # comentarios sin cerrar, tokens sin declarar, clases muertas
npm run build:i18n    # regenera es/ y avisa de frases sin traducir
npm run check:i18n    # falla si falta alguna traducción
```

**Nunca** `npm run build` sin pensarlo: incluye un `sass` que pisa el build de
Prepros.

---

## 6. Mapa del repositorio

```
index.html + case-*.html   páginas en inglés — la fuente
es/                        español, GENERADO por scripts/build-i18n.mjs
i18n/es.json               diccionario de traducción
css/portfolio.css          GENERADO por Prepros desde scss/
scss/                      el sistema (ver scss/PROPORTIONS.md y la skill `scss`)
js/                        runtime; js/vendor/ son dependencias vendorizadas
scripts/                   build-time: i18n, timeline, mapa, check-css
BRAND.md                   marca: tesis, voz, identidad, accesibilidad
scss/PROPORTIONS.md        las matemáticas de tamaños y espacios
```

---

## 7. Cuando algo no encaje

Si una petición choca con una regla de aquí, **dilo antes de ejecutar** y explica
con cuál choca. No la ejecutes en silencio ni la ignores en silencio.

Si al investigar aparece un fallo que nadie pidió arreglar —un contraste que no
pasa, un token sin declarar, una regla muerta— **cuéntalo aunque no lo arregles**.
Los dos peores fallos que ha tenido este proyecto (un comentario sin cerrar que
mató una regla de contraste, y catorce tokens perdidos en una migración) eran
invisibles y no los detectó nadie durante meses.
