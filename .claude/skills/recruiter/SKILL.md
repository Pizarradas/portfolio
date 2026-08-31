---
name: recruiter
description: Auditar el portfolio desde el lado de quien contrata — screener, hiring manager y lead técnico. Busca lo que hace descartar a un candidato: atribución ambigua, cifras sin prueba, contradicciones entre CV, timeline y casos, huecos de fechas, enlaces muertos y posicionamiento borroso. Esta skill es la fuente del dominio. Úsala cuando la petición sea «¿esto convence?», «audita el contenido», «qué me van a preguntar» o antes de mandar el portfolio a una candidatura.
---

# Auditoría de contratación

**Esta skill es la fuente.** Sirve a la prioridad 3 de `CLAUDE.md`: `BRAND.md`
decide **qué se dice**, esto comprueba **qué se entiende**. No sustituye a
`brand` —la marca es el criterio, esto es el examen— y no es una revisión de
gusto visual.

La regla que manda sobre todas las demás de este fichero: **ningún hallazgo se
cierra inventando un dato.** Si el arreglo necesita una cifra, una fecha o un
hecho que solo tiene él, el arreglo es *escribir la pregunta*, no rellenar el
hueco.

## Cuándo entra

Antes de mandar el portfolio a una candidatura, y después de cualquier cambio
grande de contenido. Va al final, junto a `verify`: `verify` demuestra que no se
rompió, esta demuestra que persuade. Para cambios pequeños no entra.

## El perfil que se audita

Product Designer & Front-End Engineer, diecinueve años, sistemas multimarca,
ejecución con IA gobernada, origen editorial. Los cinco registros que lo
sostienen están en `BRAND.md` §1.

Lo que hace único a este perfil es exactamente lo que lo pone en riesgo, y por
eso los cuatro ejes de abajo no son genéricos:

| Rasgo | Riesgo delante de quien contrata |
|---|---|
| Híbrido diseño + código | «no es ni una cosa ni la otra» |
| Trabajo en sistemas compartidos | atribución dudosa: ¿esto es suyo o del equipo? |
| Mucha IA, y en proyectos propios | se lee como operador de herramientas |
| Diecinueve años | se esperan cifras de impacto, no descripciones de tarea |

## Los tres lectores

**Cada pase se cierra por escrito antes de abrir el siguiente**, y se responde
solo con lo leído en ese pase. El fallo típico al auditar aquí es leer sabiendo
lo que pone: entonces todo parece claro.

| Pase | Quién | Presupuesto | Qué abre | Qué decide |
|---|---|---|---|---|
| **1** | Screener | 30 s | tarjeta OG, `<title>` y meta description, hero, capability scan, ficha del About | ¿encaja con la vacante? ¿le paso el enlace al manager? |
| **2** | Hiring manager / head of design | 5 min, **un** caso | un `case-*.html` entero y el índice de casos | ¿le llamo? ¿qué le pregunto? |
| **3** | Lead técnico | sin prisa, con devtools | código fuente, repos enlazados, demos en vivo, accesibilidad real | ¿es verdad lo que dice? |

El pase 1 debe cerrar las cuatro preguntas de `BRAND.md` §2 **y una quinta**: a
qué puesto contesta. Un screener filtra por título de vacante antes que por nada
más.

El pase 2 empieza por un caso, no por la home: la mitad del tráfico de un
portfolio entra por un enlace a un caso pegado en un mensaje.

## Los cuatro ejes

### 1. Atribución — de quién es el trabajo

- Todo caso profesional declara `My role` y `What I own` en `.mol-case-facts`.
  Sin eso, 42DS se lee como el trabajo de un equipo firmado por una persona.
- Los propios llevan `Self-directed` en el mismo bloque que el título
  (`BRAND.md` §7.4), y en **los tres sitios**: portada del caso, índice de casos
  y tarjeta de la home. Una etiqueta que solo está en la home no protege a quien
  aterriza en el caso desde Google.
- El verbo tiene que soportar la ficha de rol: «diseñé» no es «contribuí» no es
  «mantengo». Un verbo más fuerte que el rol declarado se cae en la primera
  entrevista, y ahí ya no hay vuelta.

### 2. Evidencia — cada afirmación con su prueba

- Barrido: por cada logro o adjetivo, ¿hay número, muestra y método? El patrón
  correcto está en SPORT Cards —«86 % de 279 tarjetas medidas en tres
  portadas»—; el criterio, en `BRAND.md` §3.
- Las afirmaciones caras del sitio que hoy viajan sin número: rendimiento de CSS
  y reducción de deuda técnica en 42DS. La primera pregunta de un manager es
  «¿cuánto?». Es hueco abierto en `BRAND.md` §7.
- **Los enlaces en vivo y los repositorios son la evidencia más fuerte y el
  riesgo más alto.** Un 404 o un repositorio privado convierte la prueba en lo
  contrario. Se comprueban uno a uno, a mano: no hay checker de enlaces.
- Una captura no es evidencia de que algo esté en producción. Si el proyecto es
  público, se enlaza; si no lo es, el caso lo dice.

### 3. Coherencia — las fuentes que se cruzan

Quien contrata cruza fuentes, y las cruza en este orden:

| Fuente | Dónde | Qué se compara |
|---|---|---|
| Hero y About | `index.html` | años totales, cargos, formación |
| Timeline | `#career-tip-data` en `index.html` (lo genera `scripts/build-timeline.mjs`) | fechas, empresas, cargos |
| Fichas de caso | `.mol-case-facts` en cada `case-*.html` | rol y propiedad |
| CV PDF | `jose-luis-pizarro-cv-{en,es}.pdf` | todo lo anterior |
| Versión española | `es/` | que no diga menos que el inglés |
| LinkedIn | `linkedin.com/in/joseluispizarrodesign` | **no se puede verificar desde el repo**: se avisa de qué habría que cotejar |

Qué buscar:

- **Números que no cuadran.** «Nineteen years» contra la suma de la timeline.
- **Cargos que cambian de nombre** entre CV, timeline y ficha de caso.
- **Fechas solapadas o con hueco.** El hueco de mayo 2011 – abril 2012 está
  abierto y es **visible en el JSON de la timeline**: quien contrata lo ve antes
  que un compañero de trabajo.
- **Formación.** El hero afirma «I studied journalism» y el About dice Ciencias
  de la Información. Si la rama no fue Periodismo, no es un matiz: es la tesis
  entera. Abierto en `BRAND.md` §7.
- **El CV no lo genera el build, se sube a mano.** Compara su fecha de
  modificación con la de los HTML: si la web afirma algo que el PDF no, el
  desfase se nota justo en el documento donde más se compara.

### 4. Posicionamiento — a qué vacante contesta

- Las dos mitades del título —Product Designer **y** Front-End Engineer— tienen
  que sostenerse con casos, y la home no puede obligar a elegir una.
- **La IA.** Dos de los seis casos son de IA y los dos son propios. Si el
  conjunto se lee como «hace cosas con IA», el perfil baja de categoría. La
  defensa ya está en la tesis: gobierna el contexto, no escribe prompts.
  Comprueba que cada caso de IA enseña **decisiones suyas** —reglas, límites,
  criterio— y no capacidades de la herramienta.
- **Diecinueve años sin cargo de liderazgo explícito.** Si la vacante es senior
  o lead, tiene que verse dónde ha decidido por otros: gobernanza, criterio
  adoptado por un equipo, sistema que otros usan. 42DS lo contiene; el hallazgo
  es si se ve o hay que deducirlo.

## Severidad y qué se hace con cada cosa

| Nivel | Qué provoca | Qué se hace |
|---|---|---|
| **Descarta** | cierra la pestaña o tacha al candidato: enlace muerto, atribución ambigua, contradicción entre CV y web, fallo AA en la página que presume de AA | se arregla en la misma sesión |
| **Duda** | pregunta incómoda en la entrevista: cifra sin muestra, verbo por encima del rol, hueco de fechas | se arregla si el material existe; si no, se escala |
| **Roza** | resta sin matar: un titular largo, un caso más flojo que el resto | se anota y se decide después |

## Cómo se actúa

1. **Arregla lo que sale del material que ya existe** —etiquetas que faltan,
   enlaces rotos, verbos por encima del rol, orden— por el recorrido de siempre:
   `brand` → `content` → `verify`.
2. **Lo que dependa de un dato suyo, escríbelo en `BRAND.md` §7 «Pendiente de
   él»**, en el fichero y no solo en la respuesta, y dilo al contarlo.
3. **Lo de accesibilidad va por delante** (prioridad 2 de `CLAUDE.md`):
   `npm run check:contrast` antes que cualquier mejora de copy.
4. **El informe lleva cuatro columnas:** severidad · dónde (`fichero:línea`) ·
   **qué concluye quien lo lee** · acción. La tercera es la que lo hace útil; sin
   ella es una lista de erratas.

## Trampas

- **Auditar sabiendo.** Con el proyecto en la cabeza todo se entiende. Cada pase
  se cierra a ciegas y con su presupuesto de tiempo, o no mide nada.
- **Confundir «me gusta» con «contrata».** Si no puedes escribir qué concluye
  quien lo lee, no es un hallazgo: es una preferencia.
- **Auditar solo la home.** Cada `case-*.html` tiene que sostenerse solo: quién
  es, qué es suyo y una salida al resto del sitio.
- **Auditar solo el inglés.** El screener español lee `es/`. `npm run check:i18n`
  prueba que están todas las cadenas, **no que digan lo mismo**.
- **Tratar el CV como un adjunto.** Es el documento que más se compara y el
  desfase más invisible desde dentro.
- **Añadir para tapar.** El impulso al ver un hueco es escribir un párrafo más.
  Un párrafo sin dato baja la señal del conjunto entero.

## Antes de terminar

- [ ] Los tres pases cerrados por escrito, cada uno con su presupuesto
- [ ] Las cuatro preguntas de `BRAND.md` §2 más la del puesto, respondidas solo
      con el pase 1
- [ ] Enlaces externos, repositorios y demos comprobados uno a uno
- [ ] CV cotejado contra hero, About, timeline y fichas de caso
- [ ] EN y ES comparados en contenido, no solo en cobertura
- [ ] Cada hallazgo con severidad, sitio y qué concluye quien lo lee
- [ ] Ningún hueco rellenado con un dato inventado; los que falten, en
      `BRAND.md` §7
- [ ] Lo arreglado, pasado por `verify`
