# safepalette

**Colorblind-safe color palettes — generate, check, and fix.** Ask for N safe colors, test a
palette you already have, or repair one that fails — for protanopia, deuteranopia, and tritanopia.

```bash
npm install safepalette
```

```js
const sp = require("safepalette");

sp.generate(5);                          // 5 colorblind-safe hex colors (Okabe-Ito based)
sp.isSafe(["#d7191c", "#1a9641"]);       // false — red & green collapse under deutan/protan
sp.fix(["#d7191c", "#1a9641"]).colors;   // a safe palette near the originals
sp.OKABE_ITO;                            // the canonical 8-color safe palette
```

## API

- **`generate(n, opts?)`** → up to `n` colorblind-safe hex colors. `n <= 8` is the
  [Okabe–Ito](https://www.nature.com/articles/nmeth.1618) palette (safe by design); above 8 it
  extends only with colors that keep the whole set passing. Because mutually-distinct-under-CVD
  colors are finite, very large `n` may return fewer than `n` — it never returns an unsafe one.
- **`isSafe(colors, opts?)`** → `true`/`false` for the whole palette.
- **`fix(colors, opts?)`** → `{ colors, drift, pass, residual }` — an adjusted palette that passes,
  separated along lightness, staying near the originals.
- **`check(colors, opts?)`** → the full per-type conflict report.

## How it decides

The safety test and the repair are [`opticquiz-cvd`](https://www.npmjs.com/package/opticquiz-cvd)'s
`checkPalette` and `fixPalette` — Machado, Oliveira & Fernandes (2009) simulation + CIEDE2000, open
access: https://doi.org/10.5281/zenodo.21310578 . The generator is seeded with the Okabe–Ito safe
palette (Wong, *Nature Methods*, 2011). No colorimetry is reimplemented here.

## Not a legal audit

A screening/design aid for the color-distinguishability axis, not a WCAG/ADA audit.

## Licence
MIT.
