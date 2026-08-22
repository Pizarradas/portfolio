---
name: verify
description: Cómo demostrar que un cambio en el portfolio no rompió nada, en vez de suponerlo. Cubre los comandos, la técnica para probar que una refactorización preserva el render, las normalizaciones que exige el build minificado y los fallos silenciosos que ya han ocurrido aquí. Esta skill es la fuente del dominio. Obligatoria antes de decir que algo funciona o de proponer un commit.
---

# Verificación

**Esta skill es la fuente.** Sirve a la prioridad 1 de `CLAUDE.md` —no romper lo
publicado—, que gana a todo lo demás.

## Cuándo entra

Última, siempre. **Y su coste lo fija el cambio, no el gusto:** cambiar una
palabra son dos comandos; mover mil reglas exige demostrar equivalencia
declaración a declaración. Elegir mal ese nivel es el fallo más caro que ha
tenido este proyecto.

## Procedimiento

**1. Comprueba que estás mirando tu cambio.**

```bash
ls -l --time-style=+%H:%M:%S css/portfolio.css scss/portfolio.scss
```

Si el CSS es más antiguo que el SCSS, Prepros aún no ha recompilado.

**2. Pasa las comprobaciones automáticas.**

```bash
npm run check:css     # comentarios sin cerrar · tokens sin declarar · clases muertas
npm run check:i18n    # falla si alguna cadena se sirve sin traducir
```

**3. Si moviste reglas de sitio, demuestra equivalencia.** No basta con que
compile:

1. Extrae las declaraciones originales del punto de partida
   (`git show <commit>:<fichero>`).
2. Indexa el build por `(cadena de at-rules, selector)`.
3. Comprueba **declaración a declaración** que cada una sigue con el mismo valor.

Así se validaron las 2.492 declaraciones de la migración de CSS a SCSS: 0
ausentes, 0 distintas.

**4. Si tocaste color, calcula el contraste.** No lo estimes. Mínimos AA: 4.5:1
texto normal, 3:1 texto grande.

## Normaliza antes de comparar

El build está minificado y reescribe cosas equivalentes. Sin normalizarlas verás
diferencias que no existen:

| Escribes | El build dice |
|---|---|
| `::before` | `:before` |
| `:nth-child(1)` | `:first-child` |
| `:nth-child(even)` | `:nth-child(2n)` |
| `[class*="x"]` | `[class*=x]` |
| `-.04em` | `-0.04em` |

Si has renombrado tokens a propósito, pasa el mapa de renombrados al comparador.

## Cuándo NO sirve este método

Si el cambio **pretende** mover valores —aplicar una escala nueva, cambiar
espaciados— el comparador está diseñado para probar que nada cambió, así que no
vale. Ahí se aplica por bandas y se comparan renders.

## Trampas

- **«No cambié texto, así que no hace falta regenerar `es/`».** Es falso y suena
  razonable, que es lo que lo hace peligroso. Un cambio de **marcado** —una
  clase, un contexto de color, un bloque movido de sitio— no toca ninguna
  cadena, así que `check:i18n` daba verde mientras tres páginas en español
  servían la estructura vieja. Pasó el 22/08/2026 con la banda azul.
  **`npm run build:i18n` va después de tocar el HTML, cambie o no el texto.**
  Desde entonces `check:i18n` compara el HTML generado con el del disco y falla
  con código 1 si difieren, así que el olvido ya no es silencioso —pero la regla
  sigue siendo ejecutar el build, no confiar en el checker.

Ninguna de estas da error. Las tres pasaron desapercibidas durante meses:

1. **Comentario CSS sin cerrar.** Un `/*` sin su `*/` comenta todo lo que sigue
   hasta el final del fichero. Mató la regla de color de la sección `--accent`,
   que se quedó en 2.8:1. Ocurrió **dos veces**, en ficheros distintos.
2. **`var(--x)` sin declarar.** La declaración se vuelve inválida y la propiedad
   cae a su valor inicial. Catorce tokens se perdieron en una migración porque el
   parser validaba nombres con `^[a-z-]+$`, que **excluye dígitos**.
3. **Ajustes de Prepros que cambian solos.** Escribe `prepros.config` y
   `css/portfolio.css` en el mismo segundo. Si el build cambia de tamaño de
   golpe, mira `git diff prepros.config` antes de buscar la causa en tu código.

`npm run check:css` cubre las dos primeras; la tercera se ve comparando mtimes.

## Antes de terminar

- [ ] Prepros ha recompilado
- [ ] `npm run check:css` sin errores
- [ ] `npm run check:i18n` en verde
- [ ] Si moviste reglas: comparación hecha, con el número de declaraciones
- [ ] Si tocaste color: contraste calculado
- [ ] `git status` sin sorpresas

Al contarlo, di lo que **has comprobado** y lo que **no**. «Debería funcionar» no
es un resultado.
