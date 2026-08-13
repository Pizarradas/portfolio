---
name: proportions
description: Proporciones áureas del portfolio — procedimiento para convertir cualquier número que se vea (un hueco, un tamaño de letra, un ancho, un interlineado) en el escalón que le toca. La fuente con todas las tablas es scss/PROPORTIONS.md. Úsala también cuando la petición sea vaga: "se ve apretado", "esto es muy grande", "dale más aire".
---

# Proporciones

**Fuente: [`scss/PROPORTIONS.md`](../../../scss/PROPORTIONS.md).** Ahí están las
tablas con todos los valores. Aquí solo está cómo elegir cuál.

## Cuándo entra

Después de `brand` y antes de `scss`: la marca decide qué se dice, esto decide
cuánto mide, y scss dónde vive. Sirve a la prioridad 5 de `CLAUDE.md` —**ningún
valor se elige a ojo**.

## Procedimiento

1. **Clasifica el número.** El checklist de `PROPORTIONS.md` §7 dice qué regla le
   toca según sea tamaño de letra, interlineado, tracking, hueco interno, hueco
   entre bloques, ancho de columna o medida de lectura.
2. **Busca el escalón en la tabla de esa regla.** No lo calcules de cabeza: las
   tablas ya traen rem y px.
3. **Si es fluido, usa ganancia constante** (§1.1): interpola entre dos escalones
   de la misma escala, no entre dos números elegidos a ojo. `g` es constante por
   banda y `Δg` global nunca pasa de 5.
4. **Si no encaja en ninguna categoría, el valor está mal.** No falta un escalón:
   sobra el número. Comprueba que no existe ya un token para eso.

## Traducir peticiones vagas

Esto no está en el documento y es lo que más se necesita en la práctica:

| Dice | Significa | Haz |
|---|---|---|
| «se ve apretado» | falta un escalón de espaciado | sube 1–2 pasos de `√φⁿ` |
| «esto es muy grande» | el `Δg` de su banda se pasó | baja el escalón, no el `clamp` |
| «no se lee bien» | interlineado o medida | `1 + φ⁻ⁿ`, o medida a `16 × φⁿ` ch |
| «dale más aire» | ritmo vertical | sube el hueco **entre bloques**, no el interno |
| «que respire arriba» | jerarquía de encabezado | `margen-superior : inferior = φ : 1` |

## Trampas

- **La medida de lectura ya es correcta** (16 / 42 / 66 ch, a 0.2 % y 2.7 % de la
  curva áurea). Es la parte mejor construida del sistema: no la «arregles».
- **Aplicar la escala mueve la página entera**, así que el comparador de
  declaraciones no sirve para validarlo —ese demuestra que *nada* cambió, y aquí
  el objetivo es el contrario.

## Antes de terminar

Si el cambio aplica escala nueva, hazlo **por bandas** y de menor a mayor riesgo
visual —(1) interlineados y tracking, (2) espaciado macro, (3) tipografía— con
render de control entre pasos. Nunca las tres a la vez.
