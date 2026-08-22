---
name: story
description: Auditar y completar la estructura narrativa de un caso — encargo, objetivo, restricciones, proceso, evidencia, solución, impacto y aprendizaje. Diagnostica qué huecos están vacíos, decide qué profundidad merece cada caso y convierte los huecos en preguntas concretas para él, de una en una. Esta skill es la fuente del dominio. Úsala cuando la petición sea «falta estructura», «este caso no cuenta nada», «completa el caso», «pregúntame para rellenar X» o al escribir un caso nuevo desde cero.
---

# Estructura narrativa de un caso

**Esta skill es la fuente.** `BRAND.md` §1 «Cómo se cuenta un caso» decide **qué
preguntas** responde un caso; esto decide **en qué huecos** van las respuestas,
cómo se ve que un hueco está vacío y **qué preguntarle a él** para llenarlo.

Reparto con las skills vecinas, para no duplicar:

| Skill | Qué decide |
|---|---|
| `brand` | qué se dice y cómo suena |
| **`story`** | **qué falta por decir y en qué orden** |
| `case` | dónde vive ese contenido en el marcado |
| `recruiter` | si lo que se dice se cree |

La regla que manda sobre todas las de este fichero: **ningún hueco se rellena
inventando.** La salida de un hueco vacío no es un párrafo: es una pregunta.

## Cuándo entra

Al escribir un caso nuevo, y al revisar uno existente que «no cuenta nada».
Antes de `case` —primero se sabe qué secciones hacen falta, después dónde van— y
antes de `recruiter`, que audita un texto ya escrito.

## El diagnóstico de partida (22/08/2026)

| Caso | Palabras | Lo que hay hoy | Qué es |
|---|---|---|---|
| 42DS | ~1.655 | 5 capítulos · 13 secciones | caso completo. **El patrón** |
| SPORT Cards | ~1.216 | 7 secciones, arco cerrado | caso completo. **El mejor arco** |
| Mapa | ~560 | 1 sección + evidencia en vivo | ficha ampliada |
| ATLAS | ~547 | 1 sección + 4 rótulos | ficha ampliada |
| Ilustraciones | ~513 | 4 rótulos | ficha ampliada |
| Mundial 2026 | ~508 | 1 sección + evidencia en vivo | ficha ampliada |

**Cuatro de seis no son casos: son tarjetas con página propia.** Enseñan el
resultado y saltan todo lo demás. Ese es el hallazgo que hay que cerrar, y se
cierra caso por caso, no de una pasada.

SPORT Cards es el modelo a imitar antes que 42DS: con 1.216 palabras recorre los
nueve huecos —pregunta de producto, montaje, hallazgo, alternativa, compromiso,
qué cambió, qué se lleva— y ninguna sección repite a otra. 42DS es más largo
porque el sistema es más grande, no porque un caso deba ser largo.

## La ficha y los ocho huecos

El orden es el del lector, no el cronológico del proyecto. Cada hueco existe
porque contesta una pregunta que el lector ya se está haciendo; si se contesta
tarde, deja de importar.

| # | Hueco | Pregunta del lector | `BRAND.md` §1 | Dónde vive |
|---|---|---|---|---|
| **0** | **Ficha** | ¿de quién es esto, cuándo y con qué? | — | `.mol-case-facts`, portada |
| **0b** | **El equipo** | ¿y con quién? | — | acto propio, cerca del proceso |
| **1** | **El encargo** | ¿qué estaba roto o en duda? | Q1 | primer acto |
| **2** | **El objetivo** | ¿cómo se sabía si salía bien? | — | mismo acto que 1 |
| **3** | **Las restricciones** | ¿con qué había que vivir? | Q4 | acto propio o banda |
| **4** | **El proceso** | ¿qué decidió él, y por qué eso? | Q2 | actos centrales |
| **5** | **La evidencia** | ¿qué cambió la conversación? | Q3 | acto con figura y dato |
| **6** | **La solución** | ¿qué se construyó, exactamente? | — | acto de mayor registro |
| **7** | **El impacto** | ¿y después qué pasó? | — | acto de cierre |
| **8** | **Lo que se lleva** | ¿qué haría distinto? | Q5 | `Takeaway` |

Los huecos **2, 3 y 7** son los que faltan en las seis páginas. El 3 es además
el que más credibilidad da (`BRAND.md` §1: «un caso sin compromiso explícito
parece un anuncio») y el que nadie escribe solo.

### Qué forma tiene cada hueco

La plantilla de caso tenía vocabulario para cinco huecos. Los otros se servían
como un párrafo más, y **un objetivo indistinguible de una descripción es un
objetivo que nadie lee como objetivo**. Estas son las piezas; las dos últimas
viven en `scss/molecules/_case-story.scss` y son de la plantilla, no de una
página.

| Hueco | Pieza | Marcado |
|---|---|---|
| 0 Ficha | `.mol-case-facts` | `dl`, **cuatro columnas exactas** |
| **0b Equipo** | **`.mol-case-roster--people`** | `ul`: `b` nombre + `span` papel + `a` opcional |
| 1 Encargo · 8 Aprendizaje | prosa del acto | narración; no fuerces un diagrama |
| **2 Objetivo · 3 Restricciones** | **`.mol-case-ledger`** | `dl` con **dos** `div`: rótulo + lado |
| **4 Proceso · 6 Solución** | **`.mol-case-roster`** | `ul` de `li` con `b` (identificador) + `span` |
| 5 Evidencia | `.mol-case-figure` + `.mol-case-metrics` | figura con pie; el pie lleva el método |
| 7 Impacto | `.mol-case-metrics` o prosa | según haya número o no |

Tres reglas al usarlas:

1. **El ledger sustituye a la prosa que hacía ese trabajo, no se suma a ella.**
   Si el párrafo del acto ya decía los dos lados, se recorta a una línea de
   entrada. Añadir el ledger encima es alargar por alargar.
2. **El roster nombra el conjunto entero.** Un caso que dice «diez patrones» y no
   los nombra pide un acto de fe; nombrarlos deja al lector ir a comprobarlos.
   Si no caben todos, el conjunto no es un roster.
3. **No todo acto lleva objeto visual.** La apertura y el cierre son narración.
   El síntoma de que faltan es el vacío en pantalla ancha: la plantilla apila
   banda y figura, y una banda sola deja dos tercios de alto en blanco a 3440px.
4. **El equipo no se escribe sin permiso.** `BRAND.md` §7.6 manda: los nombres
   los aporta él, se piden uno a uno antes de publicar, el enlace al perfil es
   opcional aunque el nombre esté, y **jamás se sacan del historial de commits
   ni de ninguna herramienta interna**. En los casos propios el hueco 0b se
   contesta diciendo que no hubo equipo, que refuerza la etiqueta
   `Self-directed` en vez de dejarla en letra pequeña.

### Qué se toma de la referencia y qué no

La referencia que abrió esto —`jonnyczar.com/project/worldpackers-app`— ordena
nueve secciones: Getting Started · The Challenge · My Role · Design Tool-kit ·
Project Schedule · Research · The Solution · The Impact · Thanks.

Se toma **el orden y la obligación de declarar objetivos e impacto antes de
enseñar pantallas**. No se toma la lista literal:

- **Tool-kit** ya está en la ficha (`System`). Una sección con logos de
  herramientas es relleno.
- **Project Schedule** solo entra si las fases explican una decisión. Un
  cronograma que solo dice cuánto duró no aporta.
- **Research con personas** exige haber hecho research con personas. SPORT lo
  tiene —279 tarjetas medidas—; ATLAS o Mundial 2026 no. Una persona inventada
  para llenar la sección es peor que no tener la sección.
- **Thanks / formulario de mentoría** no son de este sitio.

## Los tres niveles

No todos los casos merecen 1.600 palabras. El nivel lo fija el registro que
sostiene en `BRAND.md` §1, no el cariño que se le tenga al proyecto.

| Nivel | Huecos obligatorios | Palabras | Quién |
|---|---|---|---|
| **Completo** | los nueve | 1.100–1.700 | el registro más fuerte de su fila |
| **Corto** | 0 · 1 · 2 · 4 · 5 · 6 · 8 | 700–950 | los cuatro de hoy, como mínimo |
| **Tarjeta** | 0 · 6 | — | **no tiene página propia** |

**Un caso con página propia y sin encargo declarado es una tarjeta con URL.** O
sube a corto, o baja a tarjeta en el índice. Quedarse en medio es la situación
actual y es la que produce el «falta estructura».

## Procedimiento

**Un caso por sesión. Nunca dos.** Las respuestas de un caso contaminan la
lectura del siguiente, y el objetivo es que él conteste desde el proyecto, no
desde el patrón que acaba de ver.

1. **Lee la página entera** y rellena la rejilla de nueve huecos con lo que **ya
   dice**: cita literal y `fichero:línea`. Sin interpretar.
2. **Marca cada hueco** con uno de tres estados. Esta clasificación es el
   entregable del diagnóstico:
   - **Dicho** — hay una frase que lo contesta sin que el lector deduzca nada.
   - **Insinuado** — se puede deducir leyendo entero. Cuenta como vacío: nadie
     lee entero.
   - **Vacío** — no está.
3. **Decide el nivel** del caso y di cuál, con el porqué, antes de preguntar
   nada. Fija cuántos huecos hay que cerrar.
4. **Pregunta solo por los vacíos e insinuados, en el orden de los huecos, y
   como mucho cinco por tanda.** El orden no es cosmético: el objetivo depende
   de cuál fue el encargo, y el impacto depende del objetivo. Preguntarlos a la
   vez produce respuestas que luego no encajan entre sí.
5. **Cada pregunta pide un hecho, no un párrafo.** «¿Cuántas marcas había antes
   del sistema?» se contesta; «cuéntame el contexto» devuelve un texto que hay
   que volver a auditar. Ofrece opciones cuando puedas: es más rápido corregir
   una opción que redactar desde cero.
6. **Convierte la respuesta a la voz de `BRAND.md` §3** —afirmación + número, sin
   adjetivos— y **enséñasela antes de tocar el HTML**. Un dato mal transcrito
   dentro de un caso publicado es un fallo de credibilidad, no de redacción.
7. **Lo que él no sepa, no recuerde o no pueda probar va a `BRAND.md` §7
   «Pendiente de él»**, escrito en el fichero, y se dice al contarlo.
8. **El marcado nuevo pasa por `case`**, el español por `content`, y el
   resultado por `verify`.

### El banco de preguntas

Plantillas por hueco. Se adaptan al proyecto; lo que no se cambia es que
**terminen en un dato**.

| Hueco | Preguntas |
|---|---|
| **1 Encargo** | ¿Quién pidió esto y con qué frase? ¿Qué pasaba si no se hacía? ¿Cuál era la creencia que había en la sala antes de empezar? |
| **2 Objetivo** | ¿Cómo ibais a saber que había salido bien? ¿Había número, plazo o alguien a quien convencer? ¿Estaba escrito en algún sitio o lo fijaste tú? |
| **3 Restricciones** | ¿Qué no se podía tocar? ¿Qué te dijeron que no y aceptaste? ¿Qué renunciaste a hacer y por qué? |
| **4 Proceso** | ¿Cuál fue la primera decisión que cambió el rumbo? ¿Qué descartaste, y qué te hizo descartarlo? ¿Qué habrías hecho si no hubiera existido esa restricción? |
| **5 Evidencia** | ¿Qué mediste, sobre qué muestra y con qué método? ¿Quién cambió de opinión al verlo? ¿Qué te sorprendió del resultado? |
| **6 Solución** | Si solo pudieras enseñar una pantalla o un diagrama, ¿cuál? ¿Qué parte es tuya y qué parte es del equipo? |
| **7 Impacto** | ¿Qué se usa hoy de esto? ¿Cuánto tiempo lleva en producción? ¿Quién más lo usa? ¿Hay algún número, aunque sea aproximado, y de dónde sale? |
| **8 Aprendizaje** | ¿Qué harías distinto? ¿Qué te llevaste que ya has aplicado en otro sitio? |

Para los propios (ATLAS, Mundial 2026), el hueco 1 no tiene cliente pero **sí
tiene encargo**: la pregunta es «¿qué te hizo empezarlo un martes por la
noche?». Un proyecto propio sin tensión inicial se lee como un experimento, y
eso es exactamente lo que `recruiter` marca como riesgo.

## Trampas

- **El proceso genérico.** «Investigué, iteré y validé con usuarios» vale para
  cualquier proyecto de cualquier persona, así que no dice nada de este. Prueba:
  si la frase sobrevive a cambiarle el nombre al proyecto, sobra.
- **Confundir solución con impacto.** «Construí un sistema de tokens» es el hueco
  6. El 7 es qué pasó cuando otros lo usaron. Casi todos los portfolios cierran
  en el 6 creyendo que han cerrado en el 7.
- **El objetivo escrito después de saber el resultado.** Un objetivo que coincide
  exactamente con lo conseguido se huele. Se pregunta por el objetivo **tal como
  estaba entonces**, y si se falló en parte, decirlo suma (`BRAND.md` §3:
  «reconocer el límite»).
- **Alargar por alargar.** Pasar de 500 a 900 palabras con relleno baja la señal
  del conjunto: es el «añadir para tapar» de `recruiter`. Un hueco sin dato se
  queda vacío y se escala; no se disimula con un párrafo.
- **Copiar la referencia entera.** Nueve secciones con iconos, cuatro personas y
  formulario de mentoría sobre un caso de 500 palabras produce una página con
  más andamio que obra.
- **Preguntar de golpe.** Más de cinco preguntas por tanda se contestan con
  frases cada vez más cortas, y las últimas son justo las de impacto.
- **Preguntar lo que ya está escrito.** Se pierde la confianza de la persona que
  contesta, y con razón. Por eso el paso 1 va con cita y línea.
- **Escribir el hueco directamente en `es/`.** Es salida generada: inglés y
  `npm run build:i18n`.

## Antes de terminar

- [ ] Rejilla de nueve huecos con estado —dicho / insinuado / vacío— y cita con
      `fichero:línea` para cada «dicho»
- [ ] Nivel del caso decidido y justificado antes de preguntar
- [ ] Ninguna pregunta sobre algo que la página ya contesta
- [ ] Cada respuesta suya convertida a afirmación + número y validada con él
      antes de tocar el HTML
- [ ] Huecos 2, 3 y 7 cerrados o escalados: son los tres que faltan siempre
- [ ] Ningún dato inventado; lo que falte, en `BRAND.md` §7 y dicho en la
      respuesta
- [ ] Marcado por `case`, español por `content`, cierre por `verify`
