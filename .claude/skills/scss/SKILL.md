---
name: scss
description: Arquitectura SCSS del portfolio y contrato SYX R01-R04 — qué capa le toca a cada regla, qué mixins son obligatorios, cómo se nombra un componente, dónde va un parcial nuevo y cómo se crea un token. Esta skill es la fuente del dominio. Úsala antes de escribir, mover o borrar cualquier SCSS.
---

# Arquitectura SCSS

**Esta skill es la fuente.** No hay documento aparte; los valores numéricos salen
de `scss/PROPORTIONS.md` vía la skill `proportions`.

## Cuándo entra

Después de que marca y proporciones hayan decidido qué se dice y cuánto mide.
Sirve a la prioridad 4 de `CLAUDE.md`: el contrato está a cero y ahí se queda.

## El contrato — R01 a R04

| | Regla | Cómo se cumple |
|---|---|---|
| **R01** | Nada de `--primitive-*` en `atoms/`, `molecules/`, `organisms/` | Siempre vía `--semantic-*` o `--component-*` |
| **R02** | Nada de `!important` | Si hiciera falta, la regla está en la capa equivocada |
| **R03** | Nada de `transition:` en crudo | `@include transition(…)` — añade la guarda de `prefers-reduced-motion` |
| **R04** | Nada de `position: absolute\|fixed\|sticky` en crudo | `@include absolute()` / `fixed()` / `sticky()` / `relative()` |

Excepciones de R03/R04: `abstracts/mixins/`, `base/_reset.scss` y `utilities/`.

```bash
grep -rn -- "--primitive-" scss/atoms scss/molecules scss/organisms   # → vacío
grep -rn "!important" scss/ --include=*.scss | grep -v "//"           # → vacío
```

## Capas y nombres

```
syx.reset → syx.base → syx.tokens → syx.atoms → syx.molecules → syx.organisms → syx.utilities
```

| Prefijo | Capa | Carpeta |
|---|---|---|
| `.atom-` | `syx.atoms` | `scss/atoms/` |
| `.mol-` | `syx.molecules` | `scss/molecules/` |
| `.org-` | `syx.organisms` | `scss/organisms/` |
| `.syx-` | `syx.utilities` | `scss/utilities/` |

La capa la decide **la naturaleza de la regla**, no el fichero donde acabe: una
utilidad escrita en un parcial de moléculas sigue yendo a `@layer syx.utilities`.
Dentro de una misma capa manda el orden de `@use` en `portfolio.scss`.

Nada de sufijos de versión (`-v22`, `-v30`): ese patrón fue el problema que costó
la migración entera.

## Procedimiento

**Dónde poner una regla nueva:**

1. ¿Existe ya el componente? → a su parcial. **Reutilizar antes que crear.**
2. ¿Es un componente nuevo? → parcial por área funcional en la carpeta de su
   capa, y `@use` en `portfolio.scss` **después** del `_portfolio.scss` de ese tier.
3. ¿Es un ajuste responsive? → dentro del propio componente, con
   `@include from()` / `until()`. **No** en un fichero de overrides aparte: ese
   patrón ya se desmontó una vez.
4. ¿Es una utilidad? → `utilities/`, capa `syx.utilities`.

**Al crear un token:**

- Un componente solo lee `--semantic-*` o `--component-*`.
- Si el valor nuevo es idéntico a uno que ya existe, **usa el que existe**; no
  crees un alias con otro nombre.
- Se declara en `scss/abstracts/tokens/`, nunca suelto dentro de un componente.

**Breakpoints** — los cinco del sistema:

```scss
@include from($bp-md)    // ≥ 768px        $bp-sm 480 · $bp-md 768
@include until($bp-sm)   // < 480px        $bp-lg 1002 · $bp-xl 1280 · $bp-2xl 1720
@include reduced-motion
```

Un valor fuera de esa lista se escribe como `@media` literal y se marca para
normalizar. Hay tres pendientes en `utilities/_portfolio.scss`: 520, 850 y 1200.

## Trampas

- **La capa gana a la especificidad.** `.org-site-header .mol-nav` en `syx.atoms`
  pierde contra `.mol-nav` en `syx.utilities`. Si un override no aplica, mira la
  capa antes que el selector.
- **Un comentario sin cerrar se come el resto del fichero.** Pasó dos veces; una
  de ellas mató una regla de contraste.
- **Un `var(--x)` sin declarar no da error**: la propiedad cae a su valor inicial
  en silencio.
- **Custom properties con dígitos** (`--v22-blue`, `--mf-h2`) rompen cualquier
  regex de `^[a-z-]+$`. Ya costó catorce tokens perdidos en una migración.

## Antes de terminar

- [ ] `npm run check:css` sin errores
- [ ] Prepros ha recompilado (mtime del CSS > mtime del SCSS)
- [ ] Contrato a cero: los dos `grep` de arriba vacíos
- [ ] Sigue la skill `verify`
