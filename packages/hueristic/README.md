# hueristic

**Is your palette colorblind-safe?** One import to check and fix color palettes for color-vision
deficiency — protanopia, deuteranopia, tritanopia.

[![npm version](https://img.shields.io/npm/v/hueristic)](https://www.npmjs.com/package/hueristic)

```bash
npm install hueristic
```

```js
const hue = require("hueristic");

hue.isSafe(["#d7191c", "#1a9641"]);            // false — red and green collapse under deutan/protan
hue.isSafe(["#0072b2", "#e69f00", "#009e73"]); // true  — an Okabe-Ito set stays distinct

hue.checkPalette(["#d7191c", "#1a9641"]);
// { pass: false, types: { deutan: { conflicts: [{ a:"#d7191c", b:"#1a9641", normal:70.6, sim:8.1, ... }] } } }

hue.fixPalette(["#d7191c", "#1a9641"]).colors;  // a safe palette, kept as near the originals as possible
hue.simulate("#d7191c", "deutan");              // how that red looks to a deuteranope
```

## What it does

- **`isSafe(colors)`** → `true`/`false` for the whole palette.
- **`checkPalette(colors)`** → every pair that stays distinct to normal vision but collapses under
  a deficiency, with the CIEDE2000 difference before and after simulation.
- **`fixPalette(colors)`** → an adjusted palette that passes, separated along lightness (the axis
  color-vision deficiency preserves), staying near the originals.
- **`simulate(color, type)`** → the color as a given deficiency sees it.
- **`checkContrast(fg, bg)`** → WCAG contrast ratio and AA/AAA pass — the legibility axis.

## How it decides

`hueristic` is a front door to the [`opticquiz-cvd`](https://www.npmjs.com/package/opticquiz-cvd)
engine, which simulates deficiency with the Machado, Oliveira & Fernandes (2009) matrices and
measures color difference with CIEDE2000. The method is published open access:
https://doi.org/10.5281/zenodo.21310578

Every function here is `opticquiz-cvd`'s, unchanged — this package adds the name and one
convenience, so there is never a second copy of the colorimetry to drift.

## Not a legal audit

A screening aid for the color-distinguishability axis of accessibility. It does not replace a
WCAG/ADA audit, and no screen-based check is a clinical diagnosis.

## Licence

MIT.
