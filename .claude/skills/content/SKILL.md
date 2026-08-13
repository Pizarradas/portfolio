---
name: content
description: Contenido bilingüe del portfolio — el inglés es la fuente y el español lo genera build-i18n.mjs. Cubre el flujo, el diccionario i18n/es.json, los criterios de traducción y el selector de idioma. Esta skill es la fuente del dominio. Obligatoria en cuanto cambie texto visible, un alt, un aria-label, un title o una meta description.
---

# Contenido bilingüe

**Esta skill es la fuente.** Los criterios de voz y de idioma los fija
`BRAND.md` §3, vía la skill `brand`.

## Cuándo entra

Después de `brand`, siempre que haya texto nuevo o modificado. No es opcional: si
no se ejecuta, la página española sirve esas frases en inglés.

## Procedimiento

```
editar el HTML inglés  →  npm run build:i18n  →  traducir lo que reporte  →  npm run check:i18n
```

```bash
npm run build:i18n     # regenera es/ y lista las frases sin traducir
npm run check:i18n     # falla (exit 1) si falta alguna
npm run extract:i18n   # vuelca las pendientes a i18n/_missing.json
```

`scripts/build-i18n.mjs` recorre el HTML sin parsearlo a árbol, traduce nodos de
texto y atributos legibles vía `i18n/es.json`, reescribe las URLs relativas con
`../`, pone `lang="es"` y rellena dos bloques marcados:

- `<!-- i18n:head -->` — canonical + `hreflang` + `og:locale`
- `<!-- i18n:switch -->` — el selector EN/ES

Los marcadores están **también en las páginas inglesas**, así que ambos idiomas
salen del mismo sitio y no divergen.

## El diccionario

`i18n/es.json` mapea cada cadena inglesa a su gemela española.

- Lo que se lee igual en los dos idiomas —nombres propios, cargos, herramientas,
  código— va en el array **`__same`**, no como par idéntico.
- Las claves coinciden **carácter a carácter**, incluidas entidades (`&amp;`) y
  comillas tipográficas (`’`, `“ ”`).

## Criterios de traducción

- Español de España, tuteo al dirigirse al lector.
- Anglicismos de industria intactos: design system, front-end, tokens, motion,
  benchmark, paywall.
- Cargos en inglés: son los títulos reales del CV.
- **Cifras sin tocar**: `86 %`, `40.86 %`. Los datos no se localizan.

## El selector de idioma

Dos enlaces siempre visibles, `EN / ES`, no un `<select>`: con dos idiomas el
desplegable cuesta más clics y esconde el estado. Cada enlace apunta al **gemelo
traducido de esa misma página**, nunca a la home, y `js/lang-switch.js` arrastra
el `#ancla`.

**Sin preferencia guardada y sin redirección automática.** La redirección
dispararía después de pintar, y un hispanohablante puede estar leyendo la versión
inglesa a propósito. No lo «mejores» añadiéndola.

## Trampas

- **Se traduce más que el texto visible**: `alt`, `title`, `aria-label`,
  `placeholder`, la `meta description`, el JSON de la timeline
  (`<script type="application/json">`) y los textos dentro de los SVG generados.
- **Los labels en español son más largos.** Si añades uno a la navegación,
  comprueba que la cabecera no desborda por debajo de 480px.
- **Orden de los generadores**: `build-timeline.mjs` y `build-map-process.mjs`
  inyectan en `index.html`, así que van **antes** de `build-i18n.mjs`.

## Antes de terminar

- [ ] `npm run check:i18n` dice «every string translated»
- [ ] Si tocaste la navegación: comprobado por debajo de 480px
