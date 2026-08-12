# Portfolio V2 — SYX-aligned implementation

This iteration follows the actual SYX architectural rules more closely:

- CSS `@layer`: `syx.reset → syx.base → syx.tokens → syx.atoms → syx.molecules → syx.organisms → syx.utilities`
- token hierarchy: **Primitive → Semantic → Component**
- components consume semantic/component aliases rather than primitive values directly
- Atomic Design class naming (`atom-`, `mol-`, `org-`)
- utilities remain the highest cascade layer
- no external CSS framework

The browser-ready CSS is committed in `/css/portfolio.css`. The token source is separated under `/scss/abstracts/tokens/` so the portfolio can later be moved into the full SYX build without changing the design language.
