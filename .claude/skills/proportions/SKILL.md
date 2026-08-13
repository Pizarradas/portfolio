---
name: proportions
description: Sistema matemático de proporciones áureas del portfolio — cómo calcular tamaños de tipografía, interlineados, tracking, espaciado vertical y horizontal, anchos de columna y medida de lectura. Úsala siempre que haya que elegir un número que se vea: un hueco, un tamaño de letra, un ancho, un padding, un line-height. También cuando la petición sea vaga ("se ve apretado", "esto es muy grande", "dale más aire"): traduce la sensación al escalón que toca. Nunca inventes un valor sin pasar por aquí.
---

# Proporciones

La tabla completa está en **[`scss/PROPORTIONS.md`](../../../scss/PROPORTIONS.md)**.
Léela antes de calcular. Aquí está el procedimiento.

## La constante

```
φ = 1.6180339887      ∛φ = 1.1740 → tipografía
√φ = 1.2720           φ         → estructura
```

Cada tres escalones de tipografía y cada dos de espaciado caes en una potencia
exacta de φ. Es la misma escala vista de cerca o de lejos.

## Procedimiento

**1. Clasifica el número** antes de calcularlo:

| Es un… | Regla |
|---|---|
| tamaño de letra | `∛φⁿ` rem |
| interlineado | `1 + φ⁻ⁿ` |
| tracking | `∓φ⁻ⁿ/10` em (`+φ⁻ⁿ/4` si es versalita) |
| hueco dentro de un componente | `√φⁿ` rem, **fijo** |
| hueco entre bloques | `√φⁿ` rem, **fluido con g = 2** |
| ancho de columna | `34 × √φⁿ` rem |
| medida de lectura | `16 × φⁿ` ch |

**2. Si es fluido, usa ganancia constante.** Un token no interpola entre dos
números elegidos a ojo, sino entre **dos escalones de la misma escala**:

```scss
--token: #{fluid(S(n), S(n + g))};
```

`g` es constante por banda: **1** para texto, **2** para títulos, **5** para
display. Y `Δg` entre el elemento mayor y el menor **nunca pasa de 5**: por
encima de eso la página deja de ser una composición a dos tamaños y pasa a ser
dos composiciones distintas.

**3. Si no encaja en ninguna categoría, el valor está mal.** No falta un escalón:
sobra el número. Comprueba que no existe ya un token para eso antes de crear uno.

## Traducir peticiones vagas

| Dice | Significa | Haz |
|---|---|---|
| «se ve apretado» | falta un escalón de espaciado | sube 1–2 pasos de `√φⁿ` |
| «esto es muy grande» | el `Δg` de su banda se pasó | baja el escalón, no el `clamp` |
| «no se lee bien» | interlineado o medida | `1 + φ⁻ⁿ`, o medida a `16 × φⁿ` ch |
| «dale más aire» | ritmo vertical, no padding suelto | sube el hueco **entre bloques**, no el interno |
| «que respire arriba» | jerarquía de encabezado | `margen-superior : inferior = φ : 1` |

## Ritmo vertical

1. Un encabezado pertenece a lo de abajo: **arriba : abajo = φ : 1**.
2. El hueco entre hermanos es dos escalones menor que el que los separa de la
   sección siguiente (`E(n)` vs `E(n+2)`, que es exactamente `× φ`).
3. El padding vertical de una sección es φ veces su mayor espaciado interno.

## Lo que ya está bien

**La medida de lectura no se toca.** 16 / 42 / 66 ch frente a los 16 / 41.9 /
67.8 teóricos: 0.2 % y 2.7 % de desvío. Es la parte mejor construida del sistema.
Si hace falta un escalón intermedio, el que toca es **26ch**.

## Advertencia antes de aplicar

Cambiar la escala **mueve la página entera**, así que no se puede validar con el
comparador de declaraciones —ese sirve para demostrar que nada cambió, y aquí el
objetivo es el contrario. Aplícalo **por bandas**, de menor a mayor riesgo
visual:

1. interlineados y tracking
2. espaciado macro
3. tipografía

Con render de control entre pasos. Nunca las tres a la vez.
