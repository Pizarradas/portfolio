# José Luis Pizarro — Portfolio

Sitio estático bilingüe publicado en GitHub Pages. Siete páginas, un design
system propio en SCSS, sin framework.

**[pizarradas.github.io/portfolio](https://pizarradas.github.io/portfolio)**

---

## Cómo está montado

```
index.html + case-*.html   páginas en inglés — la fuente
es/                        español, GENERADO
css/portfolio.css          una sola hoja, GENERADA desde scss/
scss/                      el sistema: tokens, mixins, capas, componentes
js/                        runtime; js/vendor/ son dependencias vendorizadas
scripts/                   build-time: i18n, timeline, mapa, comprobaciones
```

Dos carpetas son **salida generada** y no se editan a mano: `css/` la compila
Prepros desde `scss/`, y `es/` la produce `scripts/build-i18n.mjs` desde las
páginas en inglés.

## Comandos

```bash
npm run build:i18n     # regenera es/ y lista las frases sin traducir
npm run check:i18n     # falla si alguna cadena se sirve sin traducir
npm run check:css      # comentarios sin cerrar · tokens sin declarar · clases muertas
npm run vendor         # recopia GSAP desde node_modules a js/vendor/
```

`npm run build` incluye un `sass` que pisa el build de Prepros. No lo ejecutes
sin querer hacerlo.

## Documentación

| Fichero | Qué decide |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | orden de prioridades ante cualquier petición, y a qué skill va |
| [`BRAND.md`](BRAND.md) | tesis, voz, identidad visual, accesibilidad, qué no se publica |
| [`scss/PROPORTIONS.md`](scss/PROPORTIONS.md) | las matemáticas de tamaños, huecos, interlineados y anchos |
| [`.claude/skills/`](.claude/skills/) | `brand` · `proportions` · `scss` · `content` · `verify` |

El orden de prioridades resuelve los empates: **no romper lo publicado →
accesibilidad → marca → contrato SCSS → proporciones → rendimiento → gusto.**

## Estado

| | |
|---|---|
| Hojas CSS por página | 1 |
| Contrato SYX R01–R04 | 0 incumplimientos |
| Idiomas | inglés canónico + español generado |
| Dependencias de runtime | GSAP + ScrollTrigger, vendorizadas |

---

*Este README documenta el repositorio. El historial de versiones vive en el log
de git, que es donde no se queda obsoleto.*
