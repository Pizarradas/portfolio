# LAI-YA — cerebro remoto (opcional)

LAI-YA funciona sin esto. El motor local (`js/laiya-engine.js`) entiende las
preguntas habituales y, para el resto, cita la sección del portfolio que
contesta. Este Worker añade una cosa: que las respuestas abiertas las redacte
Claude, **a partir solo de las secciones que el navegador le envía**.

## Cómo encaja

```
pregunta ─► motor local ─► ¿intención fija? (saludo, contacto, CV…) ─► responde local
                │
                └─► top-6 secciones BM25 ─► Worker ─► Claude ─► {text, refs}
                                               │
                         timeout / error ──────┴──► respuesta local, sin aviso
```

La parte visual (tarjetas, timeline, «enséñamelo en la página») la decide
siempre el motor local. El Worker solo cambia las palabras.

## Desplegar

```bash
cd workers/laiya
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

Después, en `scripts/laiya.config.mjs`:

```js
export const REMOTE = { endpoint: 'https://laiya.<tu-subdominio>.workers.dev', timeoutMs: 12000 };
```

y `npm run build:laiya`.

## Antes de activarlo

- **Modelo.** `MODEL` en `wrangler.toml`. Comprueba el identificador vigente en
  docs.claude.com: cambian con cada generación.
- **Coste.** Cada pregunta abierta es una llamada. Pon un límite de gasto en la
  consola de Anthropic y, si hace falta, una regla de rate limiting en
  Cloudflare (Security → WAF → Rate limiting rules) sobre la ruta del Worker.
- **Orígenes.** `ALLOWED_ORIGINS` en `worker.js` solo admite el dominio y
  `localhost:8080`. Si sirves el sitio en otro puerto para probar, añádelo.
- **Privacidad.** El Worker no guarda nada. Lo que viaja a la API es la
  pregunta, las últimas seis líneas de conversación y el texto publicado de
  las secciones. Si se activa, conviene decirlo en una línea dentro de la capa
  (la nota `remoteNote` ya aparece bajo cada respuesta redactada así).
