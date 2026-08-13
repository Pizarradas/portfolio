---
name: verify
description: Cómo demostrar que un cambio en el portfolio no rompió nada, en vez de suponerlo. Cubre los comandos de comprobación, la técnica para probar que una refactorización preserva el render, las trampas del build minificado de Prepros y los fallos silenciosos que ya han ocurrido aquí. Úsala al terminar cualquier cambio, y obligatoriamente antes de decir que algo funciona o de proponer un commit.
---

# Verificación

Prioridad número uno del proyecto: **no romper lo publicado**. Esta skill es cómo
se demuestra.

## Siempre, al terminar

```bash
npm run check:css     # comentarios sin cerrar · tokens sin declarar · clases muertas
npm run check:i18n    # falla si alguna cadena se sirve sin traducir
```

Y comprueba que Prepros ha recompilado antes de mirar nada:

```bash
ls -l --time-style=+%H:%M:%S css/portfolio.css scss/portfolio.scss
```

Si el CSS es más antiguo que el SCSS, todavía no estás mirando tu cambio.

## Probar que una refactorización no cambia el render

Cuando muevas reglas de sitio —entre ficheros, entre capas, de CSS a SCSS— el
objetivo es demostrar **equivalencia**, no parecerlo.

La técnica que funciona aquí:

1. Extrae las declaraciones originales del punto de partida
   (`git show <commit>:<fichero>`).
2. Indexa el build compilado por `(cadena de at-rules, selector)`.
3. Comprueba **declaración a declaración** que cada una sigue existiendo con el
   mismo valor.

Así se validaron las 2.492 declaraciones de la migración de CSS a SCSS: 0
ausentes, 0 distintas.

**No intentes comparar el CSS entero con un tokenizador por regex.** El build de
Prepros está minificado y los selectores con `:is(…)` rompen cualquier troceo por
comas.

### Normaliza antes de comparar

El minificador reescribe cosas que son equivalentes. Si no las normalizas, verás
diferencias que no existen:

| Escribes | El build dice |
|---|---|
| `::before` | `:before` |
| `:nth-child(1)` | `:first-child` |
| `:nth-child(even)` | `:nth-child(2n)` |
| `[class*="x"]` | `[class*=x]` |
| `-.04em` | `-0.04em` |

Y si has renombrado tokens a propósito, pasa el mapa de renombrados al
comparador: si no, marcará como diferencia cada uno.

## Cuándo NO sirve este método

Si el cambio **pretende** mover valores —aplicar una escala nueva, cambiar
espaciados— el comparador de declaraciones no vale: está diseñado para probar que
nada cambió. Ahí lo que toca es aplicar por bandas y comparar renders.

## Fallos silenciosos que ya han pasado aquí

Ninguno de estos da error. Los tres pasaron desapercibidos durante meses:

1. **Comentario CSS sin cerrar.** Un `/*` sin su `*/` convierte en comentario
   todo lo que va detrás hasta el final del fichero. Mató la regla que daba color
   al texto sobre la sección `--accent`, que se quedó en 2.8:1 de contraste.
   Ocurrió **dos veces**, en ficheros distintos.
2. **`var(--x)` sin declarar.** La declaración se vuelve inválida en tiempo de
   cómputo y la propiedad cae a su valor inicial. Catorce tokens se perdieron en
   una migración porque el parser validaba nombres con `^[a-z-]+$`, que **excluye
   dígitos** (`--v22-blue`, `--mf-h2`).
3. **Ajustes de Prepros que cambian bajo los pies.** Prepros escribe
   `prepros.config` y `css/portfolio.css` en el mismo segundo. Si el build cambia
   de tamaño de golpe, mira `git diff prepros.config` antes de buscar la causa en
   tu código.

`npm run check:css` cubre los dos primeros. El tercero se mira comparando mtimes.

## Contraste

Se **calcula**, no se estima. El sitio afirma WCAG 2.1 AA, así que un fallo aquí
es un fallo de marca. Mínimos: 4.5:1 texto normal, 3:1 texto grande.

Cuidado con los pares de tokens copiados: el fallo de 2.8:1 vino de duplicar el
par `--dark-bg` / `--dark-fg` para la variante `--accent` y cambiar solo el
fondo.

## Antes de decir que está hecho

- [ ] Prepros ha recompilado (mtime del CSS > mtime del SCSS)
- [ ] `npm run check:css` sin errores
- [ ] `npm run check:i18n` dice «every string translated»
- [ ] Si moviste reglas: comparación declaración a declaración, con el resultado
- [ ] Si tocaste color: contraste calculado
- [ ] `git status` no tiene sorpresas

Y al contarlo: di lo que **has comprobado** y lo que **no**. «Debería funcionar»
no es un resultado.
