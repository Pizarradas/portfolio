---
name: content
description: Contenido bilingüe del portfolio — el inglés es la fuente y el español se genera con build-i18n.mjs. Úsala siempre que cambie texto visible, un alt, un aria-label, un title, una meta description o el contenido de los bloques generados (timeline, mapa). Explica el flujo, el diccionario i18n/es.json, el selector de idioma y qué NO se debe editar a mano. Si has tocado una página en inglés, esta skill es obligatoria antes de dar el trabajo por terminado.
---

# Contenido bilingüe

## La regla

**`es/` es salida generada.** Los siete HTML de `es/` los produce
`scripts/build-i18n.mjs` a partir de los ingleses. Editarlos a mano se pierde en
el siguiente build, igual que pasa con `css/portfolio.css`.

```
editar el HTML inglés  →  npm run build:i18n  →  traducir lo que reporte
```

## Flujo

```bash
npm run build:i18n     # regenera es/ y lista las frases sin traducir
npm run check:i18n     # falla (exit 1) si falta alguna — para CI o pre-commit
npm run extract:i18n   # vuelca las pendientes a i18n/_missing.json
```

El script recorre el HTML sin parsearlo a árbol, traduce nodos de texto y
atributos legibles vía `i18n/es.json`, reescribe las URLs relativas con `../`,
pone `lang="es"` y rellena dos bloques marcados:

- `<!-- i18n:head -->` — canonical + `hreflang` + `og:locale`
- `<!-- i18n:switch -->` — el selector EN/ES

Los marcadores están **también en las páginas inglesas**, así que ambos idiomas
salen del mismo sitio y no divergen.

## El diccionario

`i18n/es.json` mapea cada cadena inglesa a su gemela española.

- Lo que se lee igual en los dos idiomas —nombres propios, cargos, herramientas,
  fragmentos de código— va en el array **`__same`**, no como par idéntico.
- Las claves deben coincidir **carácter a carácter**, incluidas las entidades
  (`&amp;`) y las comillas tipográficas (`’`, `“ ”`).
- Añadir una frase nueva es añadir una entrada. El script te dice cuáles faltan.

## Criterios de traducción

Los fija `BRAND.md` §3. En corto:

- Español de España, tuteo cuando haya que dirigirse al lector.
- Anglicismos de industria intactos: design system, front-end, tokens, motion,
  benchmark, paywall.
- Cargos en inglés: son los títulos reales.
- **Cifras sin tocar**: `86 %`, `40.86 %`. Los datos no se localizan.
- Los labels de navegación en español son más largos que en inglés; si añades
  uno, comprueba que la cabecera no desborda por debajo de 480px.

## Qué se traduce además del texto visible

El script ya lo cubre, pero al revisar ten en cuenta que también pasan por el
diccionario: `alt`, `title`, `aria-label`, `placeholder`, la `meta description`,
las cadenas del JSON de la timeline (`<script type="application/json">`) y los
textos dentro de los SVG generados.

## El selector de idioma

Dos enlaces siempre visibles, `EN / ES`, no un `<select>`: con dos idiomas el
desplegable cuesta más clics y esconde el estado. Cada enlace apunta al **gemelo
traducido de esa misma página**, nunca a la home, y `js/lang-switch.js` arrastra
el `#ancla`.

**Sin preferencia guardada y sin redirección automática.** La redirección
dispararía después de pintar y un hispanohablante puede estar leyendo la versión
inglesa a propósito. No lo "mejores" añadiéndola.

## Orden con los otros generadores

`build-timeline.mjs` y `build-map-process.mjs` inyectan en `index.html`, así que
van **antes** de `build-i18n.mjs`. `npm run build` ya los ordena — pero ese
script incluye un `sass` que pisa el build de Prepros, así que no lo ejecutes sin
querer hacerlo.

## Antes de terminar

```bash
npm run check:i18n    # → "every string translated"
```

Si reporta frases pendientes, el trabajo no está hecho: esas cadenas se sirven en
inglés dentro de la página española.
