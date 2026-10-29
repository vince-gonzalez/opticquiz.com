# opticquiz-cvd

[![npm version](https://img.shields.io/npm/v/opticquiz-cvd)](https://www.npmjs.com/package/opticquiz-cvd)
[![npm downloads](https://img.shields.io/npm/dm/opticquiz-cvd)](https://www.npmjs.com/package/opticquiz-cvd)
[![DOI](https://img.shields.io/badge/method-10.5281%2Fzenodo.21310578-blue)](https://doi.org/10.5281/zenodo.21310578)
[![license](https://img.shields.io/npm/l/opticquiz-cvd)](./LICENSE)

A small, exact **color-accessibility engine** — zero dependencies, runs anywhere JS runs.

- **Colorblind-safety** — simulate protanopia, deuteranopia and tritanopia (Machado et al. 2009, in linear RGB), score every pair with **CIEDE2000**, and flag the ones that are distinct to normal vision but **collapse under a color-vision-deficiency simulation**.
- **Fix it** — turn a failing palette into a colorblind-safe one that stays as close to your originals as possible.
- **WCAG contrast** — relative-luminance contrast ratios and AA/AAA verdicts for text and UI.
- **Two models, graded severity** — cross-check with Machado (2009) or Brettel (1997); check mild anomalous trichromacy, not just worst-case dichromacy.

The method traces to the open-access OpticQuiz paper — https://doi.org/10.5281/zenodo.21310578 — and powers the checker at https://opticquiz.com/checker/.

## Install
```
npm install opticquiz-cvd
```

## Check a palette
```js
const cvd = require("opticquiz-cvd");

const report = cvd.checkPalette(["#d7191c", "#1a9641", "#2166ac"]);
report.pass;                 // false — a pair collapses under simulation
report.types.deutan.conflicts;
// [{ a:"#d7191c", b:"#1a9641", normal:70.6, sim:8.1, severity:"risk" }]
```
`checkPalette(hexes, opts?)` → `{ pass, types: { protan, deutan, tritan } }`, each with `conflicts[]` and `pass`. Options: `distinct` (min difference to normal vision to count; default 13), `collapse` (simulated difference below this is a conflict; default 10, `severity:"severe"` below 5), `severity` (0–1; default 1 = full dichromacy), `model` (`"machado"` default, or `"brettel"`).

## Fix a failing palette
```js
const fixed = cvd.fixPalette(["#d7191c", "#1a9641"]);
fixed.colors;   // ["#c80011", "#2da24c"]  — now colorblind-safe
fixed.drift;    // [4, 4.1]  — CIEDE2000 distance each color moved
fixed.pass;     // true
```
Separates conflicting pairs along **lightness** (the axis color-vision deficiency preserves), capped by a per-color drift budget. The returned palette is re-checked, so `pass` is real.

## Check contrast (WCAG)
```js
cvd.checkContrast("#767676", "#ffffff");
// { ratio: 4.54, AA: true, AAA: false, ui: true, pass: true }
cvd.contrastRatio("#000000", "#ffffff");   // 21
```
`checkContrast(fg, bg, { large? })` — `large: true` for text ≥18pt (or 14pt bold). `ui` is the 3:1 bar for UI components (WCAG 1.4.11).

## Simulate a color
```js
cvd.simulate("#d7191c", "deutan");            // "#8a7b0c"  (Machado, full)
cvd.simulate("#d7191c", "deutan", 0.5);       // milder anomalous trichromacy
cvd.simulate("#d7191c", "deutan", 1, "brettel");
cvd.deltaE("#d7191c", "#1a9641");             // 70.6
```

`type` is one of `protan`, `deutan`, `tritan`, or `normal` (any case, trimmed). An
unrecognized type or model **throws a `TypeError`** rather than returning the color
unchanged — a typo must never look like a result. The long clinical names are not
aliases; the error names the short form to use:

```js
cvd.simulate("#d7191c", "protanopia");
// TypeError: simulate: unknown type "protanopia". Use "protan".
//            Expected one of: protan, deutan, tritan, normal.
```

Anomalous trichromacy (`deuteranomaly` and friends) is `severity` below 1 on the matching
type, not a type of its own, and is refused with that pointer. For a user-supplied value,
validate with `cvd.normalizeType(value)` or catch the `TypeError`.

Colors are hex: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` — the `#` optional, any case,
trimmed, alpha discarded. An invalid color **throws** rather than being read as
`#000000`, in every function, so a typo can't quietly score against black:

```js
cvd.deltaE("#fff", "nope");   // TypeError: opticquiz-cvd: invalid color "nope". ...
```

`simulate(hex, "normal")` returns the color canonicalized to `#rrggbb`, the same shape
every other type returns, so it can be compared with a simulated value directly. See
[CHANGELOG.md](CHANGELOG.md) — all of this arrived in 1.2.0.

## Honest scope
This simulates a **model** of color vision — an approximation of a diverse population, not any single person's vision — and results depend on an uncalibrated screen. Severity below 1 is a disclosed approximation of anomalous trichromacy, not Machado's per-severity matrices. It reliably catches classic red-green and blue-yellow conflicts. It is **not** a legal accessibility audit and does not certify ADA, Section 508, WCAG, or EU Accessibility Act compliance, which cover far more than color.

## License
MIT. Methods: Machado, Oliveira & Fernandes (2009); Brettel, Viénot & Mollon (1997); CIEDE2000; WCAG 2.x. Brettel matrices from the public-domain [libDaltonLens](https://daltonlens.org).
