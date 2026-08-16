# Vendored runtime libraries

Copied from `node_modules` by `npm run vendor`. They are committed so GitHub
Pages serves them from this origin: no CDN, which means no third-party outage
and no missing `integrity` attribute.

| File | Source | Licence |
|---|---|---|
| `gsap.min.js` | gsap 3.15.0 | GSAP standard "no charge" licence |
| `ScrollTrigger.min.js` | gsap 3.15.0 | GSAP standard "no charge" licence |
| `echarts.min.js` | echarts 6.1.0 | Apache-2.0 |

Re-run `npm run vendor` after upgrading gsap or echarts.
