# Sistema de proporciones

Guía de cálculo para tamaños de tipografía, interlineados, tracking, espaciado
vertical y horizontal, anchos de columna y medida de lectura.

Todo sale de una sola constante. Cuando haya que inventar un valor nuevo, no se
inventa: se busca el escalón que le toca.

---

## 0. La constante

```
φ = 1.6180339887
√φ = φ^(1/2) = 1.2720196
∛φ = φ^(1/3) = 1.1739849
```

Tres razones, tres usos:

| Razón | Valor | Para qué |
|---|---|---|
| `∛φ` | 1.1740 | escalones de **tipografía** — bastante finos para tener jerarquía sin saltos bruscos |
| `√φ` | 1.2720 | escalones de **espaciado** y de **anchos de columna** |
| `φ` | 1.6180 | saltos **estructurales**: medida de lectura, relación entre huecos, proporción de una banda |

La gracia de encadenarlas es que cada tres escalones de tipografía y cada dos de
espaciado caes exactamente en una potencia de φ. La escala fina y la estructural
son la misma escala mirada de cerca o de lejos.

```
∛φ³ = φ        √φ² = φ
∛φ⁶ = φ²       √φ⁴ = φ²
∛φ⁹ = φ³       √φ⁶ = φ³
```

---

## 1. Escala tipográfica

**Regla:** `S(n) = ∛φⁿ` rem, con `S(0) = 1rem = 16px`.

| n | rem | px @16 | n | rem | px @16 |
|---:|---:|---:|---:|---:|---:|
| −3 | 0.618 | 9.9 | 5 | 2.230 | 35.7 |
| −2 | 0.726 | 11.6 | 6 | **2.618** = φ² | 41.9 |
| −1 | 0.852 | 13.6 | 7 | 3.073 | 49.2 |
| **0** | **1.000** | **16.0** | 8 | 3.608 | 57.7 |
| 1 | 1.174 | 18.8 | 9 | **4.236** = φ³ | 67.8 |
| 2 | 1.378 | 22.1 | 10 | 4.974 | 79.6 |
| 3 | **1.618** = φ | 25.9 | 11 | 5.839 | 93.4 |
| 4 | 1.900 | 30.4 | 12 | **6.854** = φ⁴ | 109.7 |

### 1.1 La regla fluida: ganancia constante de escalones

Un token fluido no interpola entre dos números elegidos a ojo. Interpola entre
**dos escalones de esta misma escala**:

```scss
// paso n a 360px  →  paso n+g a 1600px
--token: #{fluid(S(n), S(n + g))};
```

`g` es la **ganancia**, y es constante dentro de cada banda. Eso es lo que
mantiene la forma de la jerarquía al cambiar de viewport: si el titular gana 5
escalones y el cuerpo gana 1, el contraste entre ambos crece exactamente `∛φ⁴`
(1.90×) de un extremo al otro, y no más.

| Banda | g | Crecimiento 360→1600 |
|---|---:|---|
| Texto (caption, eyebrow, ui, body, lede) | 1 | +17.4 % |
| Títulos (title-sm, title, title-lg) | 2 | +37.8 % |
| Display (section, hero) | 5 | +123 % |

> **El límite:** `Δg` entre el elemento más grande y el más pequeño no debe pasar
> de **5 escalones**. Por encima de eso la página deja de ser la misma
> composición a dos tamaños y pasa a ser dos composiciones distintas.

### 1.2 Asignación recomendada

| Rol | n @360 | n @1600 | rem | px @1600 |
|---|---:|---:|---|---:|
| `caption` | −2 | −1 | 0.726 → 0.852 | 13.6 |
| `eyebrow` | −2 | −1 | 0.726 → 0.852 | 13.6 |
| `ui` | −1 | 0 | 0.852 → 1.000 | 16.0 |
| `body` | 0 | 1 | 1.000 → 1.174 | 18.8 |
| `body-lg` | 1 | 2 | 1.174 → 1.378 | 22.1 |
| `lede` | 2 | 3 | 1.378 → 1.618 | 25.9 |
| `title-sm` | 3 | 5 | 1.618 → 2.230 | 35.7 |
| `title` | 4 | 6 | 1.900 → 2.618 | 41.9 |
| `title-lg` | 5 | 7 | 2.230 → 3.073 | 49.2 |
| `section` | 6 | 8 | 2.618 → 3.608 | 57.7 |
| `hero` | 7 | 12 | 3.073 → 6.854 | 109.7 |

---

## 2. Interlineado

**Regla:** `lh(n) = 1 + φ⁻ⁿ`.

Converge a 1 según crece el texto, que es exactamente lo que hace falta: el
interlineado es aire entre líneas, y una línea grande ya trae el suyo dentro.

| n | line-height | Para |
|---:|---:|---|
| 1 | **1.618** | prosa larga |
| 2 | **1.382** | lede, párrafo de apoyo |
| 3 | **1.236** | títulos de sección |
| 4 | **1.146** | display |
| 5 | **1.090** | hero |
| 6 | **1.056** | cifras grandes, números de dato |

**Cómo elegir n:** uno por cada dos escalones de tamaño, empezando en n=1 para
`body`. Es decir `n = 1 + floor(paso_tipográfico / 2)`, acotado a 6.

---

## 3. Tracking

**Regla:** `ls(n) = −φ⁻ⁿ / 10` em para texto normal, `+φ⁻ⁿ / 4` em para versalitas.

| n | Negativo | Positivo (caps) | Para |
|---:|---:|---:|---|
| 1 | −0.0618em | — | hero |
| 2 | −0.0382em | +0.0955em | display / eyebrow |
| 3 | −0.0236em | +0.0590em | títulos / etiquetas |
| 4 | −0.0146em | +0.0365em | body-lg |
| 5 | −0.0090em | — | body |

El tracking se mide en `em`, así que ya escala solo con el tamaño. Lo que corrige
esta tabla es lo **óptico**: cuanto más grande el texto, más sobra el espacio
entre letras.

---

## 4. Espaciado

**Regla:** `E(n) = √φⁿ` rem.

| n | rem | px | n | rem | px |
|---:|---:|---:|---:|---:|---:|
| −6 | 0.236 | 3.8 | 2 | **1.618** = φ | 25.9 |
| −5 | 0.300 | 4.8 | 3 | 2.058 | 32.9 |
| −4 | 0.382 | 6.1 | 4 | **2.618** = φ² | 41.9 |
| −3 | 0.486 | 7.8 | 5 | 3.330 | 53.3 |
| −2 | **0.618** = φ⁻¹ | 9.9 | 6 | **4.236** = φ³ | 67.8 |
| −1 | 0.786 | 12.6 | 7 | 5.388 | 86.2 |
| **0** | **1.000** | **16.0** | 8 | **6.854** = φ⁴ | 109.7 |
| 1 | 1.272 | 20.4 | 9 | 8.719 | 139.5 |
| | | | 10 | **11.090** = φ⁵ | 177.4 |

### 4.1 Micro (dentro de un componente) — fijo

No escala con el viewport. El padding de una tarjeta no tiene por qué crecer
porque la pantalla sea más ancha: lo que crece es cuántas tarjetas caben.

| Token | n | rem |
|---|---:|---|
| `component-3xs` | −6 | 0.236 |
| `component-2xs` | −4 | 0.382 |
| `component-xs` | −3 | 0.486 |
| `component-sm` | −1 | 0.786 |
| `component-md` | 0 | 1.000 |
| `component-lg` | 2 | 1.618 |
| `component-xl` | 3 | 2.058 |

### 4.2 Macro (entre bloques) — fluido, ganancia g = 2

Dos escalones de `√φ` son exactamente un `φ`. Todo el ritmo vertical de la
página crece en proporción áurea de móvil a escritorio, ni más ni menos.

| Token | n @360 → n @1600 | rem |
|---|---:|---|
| `stack` | 3 → 5 | 2.058 → 3.330 |
| `block` | 4 → 6 | 2.618 → 4.236 |
| `section-compact` | 5 → 7 | 3.330 → 5.388 |
| `section` | 6 → 8 | 4.236 → 6.854 |
| `section-major` | 7 → 9 | 5.388 → 8.719 |

---

## 5. Ritmo vertical

Tres reglas, y las tres salen de φ.

**5.1 Un encabezado pertenece a lo que va debajo.**

```
margen-superior : margen-inferior = φ : 1
```

Si un `h2` lleva `4.236rem` encima, lleva `2.618rem` debajo (`4.236 / φ`). El
bloque se lee como una unidad en vez de como dos elementos sueltos.

**5.2 El hueco entre bloques hermanos es un escalón menor que el hueco que los
separa de la sección siguiente.**

```
gap(dentro)  = E(n)
gap(entre)   = E(n + 2) = E(n) × φ
```

**5.3 El padding vertical de una sección es φ veces su espaciado interno mayor.**

Es lo que hace que una sección se lea como una sección y no como el final de la
anterior.

---

## 6. Anchos y medida

### 6.1 Registros de ancho — razón √φ

**Regla:** `W(n) = 34 × √φⁿ` rem.

| n | rem | px | Actual | Desvío |
|---:|---:|---:|---:|---:|
| 0 | 34.00 | 544 | 34 | 0 % |
| 1 | 43.25 | 692 | 48 | +11.0 % |
| 2 | 55.01 | 880 | 62 | +12.7 % |
| 3 | 69.98 | 1120 | 78 | +11.5 % |
| 4 | 89.01 | 1424 | 90 | +1.1 % |
| 5 | 113.23 | 1812 | 112 | −1.1 % |

> La escala actual **empieza y termina sobre la curva áurea** —la razón de
> extremo a extremo es 1.2693 frente a 1.2720— pero los tres escalones centrales
> se abomban un 11–13 %. Es el único sitio del sistema donde la corrección es
> puramente numérica: mover 48→43.25, 62→55, 78→70.

### 6.2 Medida de lectura — razón φ

**Ya es correcta.** No tocar.

| Medida | ch | φ desde 16ch | Desvío |
|---|---:|---:|---:|
| `display` | 16 | 16.0 | 0 % |
| *(hueco)* | — | 25.9 | — |
| `lede` | 42 | 41.9 | +0.2 % |
| `prose` | 66 | 67.8 | −2.7 % |

Si algún día hace falta una medida intermedia entre `display` y `lede`, el
escalón que toca es **26ch**.

### 6.3 Gutter y contenido

```
gutter : contenido = 1 : φ³
```

En el registro `survey` (113rem), el gutter es `113 / φ³ / φ³` … en la práctica:
el gutter no debe bajar de `E(4)` = 2.618rem ni pasar de `E(8)` = 6.854rem.

---

## 7. Checklist antes de escribir un valor

1. ¿Es un tamaño de letra? → escalón de `∛φⁿ`, y su pareja fluida a `n+g` con
   la `g` de su banda.
2. ¿Es un interlineado? → `1 + φ⁻ⁿ`.
3. ¿Es un tracking? → `∓φ⁻ⁿ` dividido por 10 (o por 4 si es versalita).
4. ¿Es un hueco dentro de un componente? → escalón fijo de `√φⁿ`.
5. ¿Es un hueco entre bloques? → escalón fluido de `√φⁿ` con `g = 2`.
6. ¿Es un ancho de columna? → `34 × √φⁿ`.
7. ¿Es una medida de lectura? → `16 × φⁿ` ch.
8. ¿No encaja en ninguna? → **es que el valor está mal**, no que falte un
   escalón. Antes de añadir uno, comprobar que no hay ya un token para eso.

---

## 8. Diagnóstico de la escala actual

Lo que hay hoy, medido:

**Tipografía — no hay una razón, hay diez.**

| Salto | Razón @360 | Razón @1600 |
|---|---:|---:|
| sm → md | 1.231 | 1.133 |
| md → lg | 1.063 | 1.176 |
| display-md → display-lg | 1.143 | 1.455 |
| display-xl → display-2xl | 1.200 | 1.500 |

Las razones entre escalones contiguos van de **1.063 a 1.231** a 360px y de
**1.083 a 1.500** a 1600px. No es una escala modular: es una lista de valores.

**Y la jerarquía cambia de forma con el viewport.**

```
hero / body  @360px  = 3.00 / 1.00   = 3.00×
hero / body  @1600px = 9.00 / 1.0625 = 8.47×
```

El contraste entre el titular y el cuerpo **casi se triplica** de móvil a
escritorio, porque cada token creció lo suyo por su cuenta (de 1.06× a 3.00×).
Es la causa de fondo de que la home parezca cinco composiciones distintas y no
una sola a cinco tamaños. Con la regla de ganancia constante, ese contraste
pasaría de 3.07× a 5.84× — sigue abriéndose, pero de forma controlada y
proporcional.

**Espaciado — casi bien, con un escalón repetido.**

La escala micro alterna 1.5 y 1.333, que dobla cada dos pasos: es coherente.
El fallo está en la unión con la macro: `xl` vale 2rem fijo y `2xl` vale
`clamp(2rem, …, 3rem)`, así que **a 360px los dos miden lo mismo** y hay un
escalón muerto.

**Anchos —** ver 6.1: los extremos están en la curva, el centro se abomba 12 %.

**Medida —** ya es una escala áurea. Es la parte del sistema que está bien.
