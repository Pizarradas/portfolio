---
name: scss
description: Arquitectura SCSS del portfolio y contrato SYX (R01-R04) — dónde vive cada regla, qué capa le toca, qué mixins son obligatorios, cómo se nombra un componente y cómo se añade un parcial. Úsala antes de escribir, mover o borrar cualquier SCSS, de crear un componente o un token, y de tocar css/ o el punto de entrada. Si la petición implica estilos, empieza por aquí y no escribas CSS a mano nunca.
---

# Arquitectura SCSS

## Lo primero

**`css/` es salida generada.** Contiene un único fichero, `portfolio.css`,
compilado por Prepros desde `scss/`. Editarlo a mano se pierde en el siguiente
guardado. Tampoco compiles tú: `npx sass` sobre ese fichero pisa el build de
Prepros, que aplica su propia configuración.

Se edita el SCSS y se espera. Prepros vigila y compila solo.

## El contrato — R01 a R04

Los cuatro están a cero. Mantenerlos así no es negociable.

| | Regla | Cómo se cumple |
|---|---|---|
| **R01** | Nada de `--primitive-*` en `atoms/`, `molecules/`, `organisms/` | Siempre vía `--semantic-*` o `--component-*` |
| **R02** | Nada de `!important` | Si hace falta, la regla está en la capa equivocada |
| **R03** | Nada de `transition:` en crudo | `@include transition(…)` — añade la guarda de `prefers-reduced-motion` |
| **R04** | Nada de `position: absolute\|fixed\|sticky` en crudo | `@include absolute()` / `fixed()` / `sticky()` / `relative()` |

Excepciones de R03/R04: `abstracts/mixins/`, `base/_reset.scss` y `utilities/`.

```bash
# comprobación rápida
grep -rn -- "--primitive-" scss/atoms scss/molecules scss/organisms   # → vacío
grep -rn "!important" scss/ --include=*.scss | grep -v "//"           # → vacío
```

## Capas

```
syx.reset → syx.base → syx.tokens → syx.atoms → syx.molecules → syx.organisms → syx.utilities
```

La capa la decide **la naturaleza de la regla**, no el fichero donde acabe. Una
utilidad escrita dentro de un parcial de moléculas sigue yendo a
`@layer syx.utilities`. Dentro de una misma capa manda el orden de `@use` en
`portfolio.scss`, así que ahí sí importa dónde lo pongas.

## Nombres

| Prefijo | Capa | Carpeta |
|---|---|---|
| `.atom-` | `syx.atoms` | `scss/atoms/` |
| `.mol-` | `syx.molecules` | `scss/molecules/` |
| `.org-` | `syx.organisms` | `scss/organisms/` |
| `.syx-` | `syx.utilities` | `scss/utilities/` |

Nunca mezclar prefijo y capa. Nada de sufijos de versión (`-v22`, `-v30`): ese
patrón fue el problema que costó la migración entera.

## Tokens

```
primitivo  →  semántico  →  componente
```

- Un componente **solo** lee `--semantic-*` o `--component-*`.
- Antes de crear un token, comprueba que no existe ya uno con ese papel.
- Si el valor nuevo es idéntico a uno que ya existe, **usa el que existe**; no
  crees un alias con otro nombre.
- Todo token nuevo se declara en `scss/abstracts/tokens/` y en la capa que le
  toca, nunca suelto dentro de un componente.
- El valor sale de `scss/PROPORTIONS.md`. Ver la skill `proportions`.

## Dónde poner una regla nueva

1. ¿Existe ya el componente? → a su parcial. **Reutilizar antes que crear.**
2. ¿Es un componente nuevo? → parcial por área funcional en la carpeta de su
   capa, y `@use` en `portfolio.scss` **después** de `_portfolio.scss` de ese
   tier.
3. ¿Es un ajuste responsive de un componente? → dentro del propio componente, con
   `@include from()` / `until()`. **No** en un fichero de overrides aparte: ese
   patrón ya se desmontó una vez.
4. ¿Es una utilidad? → `utilities/`, capa `syx.utilities`.

## Breakpoints

```scss
@include from($bp-md)    // ≥ 768px
@include until($bp-sm)   // < 480px
@include reduced-motion  // prefers-reduced-motion: reduce
```

`$bp-sm` 480 · `$bp-md` 768 · `$bp-lg` 1002 · `$bp-xl` 1280 · `$bp-2xl` 1720.

Son los cinco que usa el sistema. Un valor fuera de esa lista (520, 850, 1200)
se escribe como `@media` literal y se marca para normalizar — hay tres
pendientes en `utilities/_portfolio.scss`.

## Trampas conocidas

- **La capa gana a la especificidad.** `.org-site-header .mol-nav` en `syx.atoms`
  pierde contra `.mol-nav` en `syx.utilities`. Si un override no aplica, mira la
  capa antes que el selector.
- **Un comentario sin cerrar se come el resto del fichero.** Pasó dos veces y en
  una mató una regla de contraste. `npm run check:css` lo detecta.
- **Un `var(--x)` sin declarar no da error**: la declaración se vuelve inválida y
  la propiedad cae a su valor inicial, en silencio. `npm run check:css` también
  lo detecta.
- **Custom properties con dígitos en el nombre** (`--v22-blue`) rompen cualquier
  regex ingenua de `^[a-z-]+$`. Ya costó catorce tokens perdidos.

## Al terminar

```bash
npm run check:css
```

Y después la skill `verify`.
