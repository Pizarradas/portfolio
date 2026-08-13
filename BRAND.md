# Marca — José Luis Pizarro

Reglas de marca para el portfolio y para cualquier pieza que salga con su firma.
Este documento manda sobre el gusto de quien esté escribiendo, incluido el mío.

---

## 1. La tesis

> **Estudié periodismo. Construyo los sistemas que hay detrás de los periódicos.**

No es un titular bonito: es el eje de todo. El diferencial de JLP no es «diseñador
que además programa» —eso hay a miles— sino **rigor editorial aplicado a
sistemas**. Viene de una redacción, y eso se nota en cómo decide: mide antes de
opinar, cita la fuente, distingue el dato de la interpretación.

Cualquier pieza que no pueda apoyarse en esa tesis sobra.

### Lo que sostiene la tesis

| Registro | Caso | Qué demuestra |
|---|---|---|
| **Escala** | 42DS | Opera un sistema multimarca en producción, con el negocio funcionando |
| **Evidencia** | SPORT Cards | Convierte una opinión de producto en criterio medible |
| **De principio a fin** | Mapa interactivo · Mundial 2026 | Lleva el producto hasta que funciona, no hasta la entrega |
| **Gobernanza de IA** | ATLAS × SYX | Diseña el contexto en el que la IA trabaja, no prompts |
| **Oficio visual** | Ilustraciones SPORT | Sabe dibujar, y eso sigue importando |

Los cinco tienen que estar. Si un rediseño deja alguno fuera del primer scroll de
la home, el rediseño está mal.

### Cómo se cuenta un caso

Todo caso responde a estas cinco preguntas, en este orden. Si falta alguna, el
caso está a medias:

1. **¿Qué tensión o incertidumbre había?**
2. **¿Qué decidí yo?**
3. **¿Qué evidencia cambió la conversación?**
4. **¿Qué compromiso tuvo que entender el equipo?**
5. **¿Qué me llevo de ahí?**

La cuarta es la que más se salta y la que más credibilidad da: un caso sin
compromiso explícito parece un anuncio.

### El orden de la home es el argumento

No es cronológico ni por importancia del cliente. Es: **primero lo que dice quién
es hoy** —Product Designer, sistemas, ejecución asistida por IA— y después la
amplitud que lo sostiene.

Ese orden se decide en `BRAND.md`, no en el CSS. Si alguien lo cambia, tiene que
poder explicar qué argumento nuevo está contando.

---

## 2. A quién le habla

Un **head of design**, un **hiring manager de producto** o un **lead de
front-end** en una empresa de producto o en un grupo editorial. Español o
internacional —de ahí el bilingüismo, con el inglés como canónico.

Tiene poco tiempo y ha visto cien portfolios esta semana. En **30 segundos** debe
poder responder:

1. ¿A qué escala trabaja? → multimarca, grupo editorial, sistema compartido
2. ¿Cómo decide? → midiendo
3. ¿Hasta dónde llega? → hasta producción
4. ¿Qué hace con la IA? → la gobierna dentro de un sistema

Si un cambio en la home no ayuda a responder esas cuatro, no entra.

---

## 3. Voz

### El patrón

**Afirmación + número.** Nunca un adjetivo sin dato detrás.

El ejemplo canónico, y el que mejor resume la marca entera:

> Producto creía que las tarjetas eran demasiado altas.
> Yo empecé por medirlas.

Dos frases. Un conflicto, una postura, cero adjetivos. Así suena bien.

### Reglas

- **Primera persona.** Pasado para lo hecho, presente para lo que sostiene.
- **Frases cortas.** Si una frase necesita dos comas para respirar, son dos frases.
- **El dato lleva su muestra y su método.** «86 %» no; «86 % de 279 tarjetas
  medidas en tres portadas» sí.
- **Distinguir hecho de lectura.** «El informe documentó que…» y luego «lo útil
  no era X, era Y». Nunca mezclados en la misma frase.
- **Reconocer el límite.** «Las muestras y los layouts eran distintos; el gráfico
  no es una afirmación causal.» Eso da más credibilidad que un número redondo.
- **Los proyectos propios se etiquetan como propios.** Siempre. La ambigüedad
  entre trabajo profesional y proyecto personal es el error que más rápido
  destruye la confianza de quien contrata.

### Prohibido

Apasionado · pixel perfect · pensar fuera de la caja · soluciones innovadoras ·
sinergia · disruptivo · «me encanta el diseño» · storyteller · ninja / rockstar /
gurú · «llevo la creatividad en la sangre» · cualquier superlativo sobre uno
mismo.

Tampoco: exclamaciones, emoji en el cuerpo del texto, ni preguntas retóricas al
lector.

### Idioma

- **Inglés canónico**, español generado desde él. Ver `README.md`, sección V31.
- **Español de España.** Segunda persona del singular cuando haya que dirigirse
  al lector («si algo de esto te resulta útil, escríbeme»).
- **Anglicismos de industria intactos**: design system, front-end, tokens, motion,
  benchmark, paywall. Traducirlos suena a traducción.
- **Cargos en inglés**: son los títulos reales del CV.
- **Cifras sin tocar** entre idiomas: `86 %`, `40.86 %`. Los datos no se localizan.

---

## 4. Identidad visual

### Color

Una sola paleta. La acid green que convivía con el azul quedó eliminada; si
reaparece, es un error.

| Rol | Valor | Uso |
|---|---|---|
| Azul de marca | `#1E3AFF` | acento, un solo elemento por región |
| Navy | `#080f2f` | bandas a sangre, secciones invertidas |
| Tinta | `#080f1a` | texto |
| Neutros | rampa gris con **sesgo azul** | superficies y bordes |

Los complementarios (cian, violeta, fucsia) existen como acento y **nunca** como
superficie dominante.

**El acento se gasta una vez.** Si en una sección hay dos cosas en azul de marca,
una de las dos no es la importante.

### Tipografía

**Instrument Sans** para display, **Inter** para cuerpo e interfaz. Los tamaños,
interlineados y tracking no se eligen: se calculan. Ver
[`scss/PROPORTIONS.md`](scss/PROPORTIONS.md).

### Imagen

- **La evidencia es real o es código.** Capturas de proyecto reales, o el
  componente reconstruido en front-end. Nunca un mockup dentro de un portátil
  flotando en degradado.
- **Sin fotografía de stock.** Ninguna. Si hace falta una imagen y no existe, se
  construye con código.
- **Las ilustraciones de SPORT son el único registro desenfadado** del sitio, y
  se presentan como oficio, no como decoración.
- Si algún día hay foto suya, es un retrato sobrio, no un plano de agencia.

### Composición

- Retícula visible: el sitio va de sistemas, así que la estructura se enseña.
- Las dos bandas a sangre —navy y azul— son los cortes de ritmo. Dos, no cinco.
- El ancho de una sección lo decide su registro (`read` / `scan` / `survey`), no
  el capricho del bloque.

---

## 5. Accesibilidad: es marca, no cumplimiento

El portfolio **afirma** experiencia en WCAG 2.1 AA. Eso convierte cualquier fallo
de accesibilidad del propio sitio en un fallo de credibilidad, no de código.

Ya pasó una vez: la sección `--accent` del caso de SPORT servía texto a **2.8:1**
y el eyebrow salía en azul sobre azul, invisible. En la página que presume de
haber implementado AA en productos editoriales complejos.

**Mínimos innegociables:**

- Contraste AA en todo texto (4.5:1 normal, 3:1 grande). Se comprueba, no se supone.
- `prefers-reduced-motion` respetado en toda transición — de ahí `@include transition()`.
- Un solo `h1` por página y jerarquía de encabezados sin saltos.
- Todo interactivo alcanzable por teclado y con foco visible.
- `alt` con contenido real, no el nombre del fichero.
- El selector de idioma marca el idioma actual con `aria-current`.

---

## 6. Datos de contacto

| | |
|---|---|
| Email | `profesional.pizarro@gmail.com` — **nunca** el personal |
| LinkedIn | `linkedin.com/in/joseluispizarrofeo` |
| CV | PDF en la raíz, enlazado desde nav y footer |
| Teléfono | **No** va en la web |
| Ubicación | Madrid, España |

---

## 7. Reglas de contenido

1. **Cada caso profesional declara el rol y qué es suyo.** «What I own» no es
   opcional.
2. **Ninguna cifra sin fuente.** Si no se puede citar, no se publica.
3. **Nada de clientes bajo NDA** ni capturas de producto no publicado.
4. **Los casos propios llevan la etiqueta `Self-directed` / `Proyecto propio`** en
   el mismo bloque que el título, no en letra pequeña abajo.
5. **El orden de la home es el orden del argumento**, no el cronológico.

### Pendiente de él

Estas huecos están abiertos y afectan a la credibilidad de la pieza. No
rellenarlos inventando:

- Cifras reales de impacto en 42DS (el CV afirma optimización de CSS y reducción
  de deuda técnica; faltan los números).
- Material de Brickee (Aliseda) para decidir si es tarjeta o caso corto.
- El hueco laboral entre mayo 2011 y abril 2012.
- Si su rama de Ciencias de la Información fue Periodismo — el hero lo afirma.
- Nivel real de inglés (hoy dice «working proficiency» por defecto).
- Una foto suya. El About la pide y no hay ninguna.

---

## 8. Prueba de la marca

Antes de publicar cualquier cambio, tres preguntas:

1. **¿Se apoya en la tesis?** Si no habla de sistemas, de evidencia o de llevar
   algo hasta producción, ¿qué hace aquí?
2. **¿Hay algún adjetivo que podría ser un número?** Cámbialo.
3. **¿Lo entendería en 30 segundos alguien que ve cien portfolios a la semana?**

Si alguna falla, no está listo.
