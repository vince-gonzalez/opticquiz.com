# opticquiz-cvd

Check color palettes for **colorblind-safety** — zero dependencies, runs anywhere JS runs.

Simulates protanopia, deuteranopia and tritanopia (Machado et al. 2009 model, in
linear RGB), scores perceptual difference with **CIEDE2000**, and flags the pairs
that are clearly distinct to normal vision but **collapse under a color-vision
deficiency simulation**.

The method traces to the open-access OpticQuiz paper — https://doi.org/10.5281/zenodo.21310578 — and powers the checker at https://opticquiz.com/checker/.

## Install
```
npm install opticquiz-cvd
```

## Use
```js
const cvd = require("opticquiz-cvd");

// Check a palette
const report = cvd.checkPalette(["#d7191c", "#1a9641", "#2166ac"]);
report.pass;                 // false — a pair collapses under simulation
report.types.deutan.conflicts;
// [{ a:"#d7191c", b:"#1a9641", normal:70.6, sim:8.1, severity:"risk" }]

// Simulate one color
cvd.simulate("#d7191c", "deutan");   // "#8a7b0c"

// Perceptual difference (CIEDE2000)
cvd.deltaE("#d7191c", "#1a9641");    // 70.6
```

### `checkPalette(hexes, opts?)`
Returns `{ pass, types: { protan, deutan, tritan } }`. Each type has `conflicts[]`
(`{ a, b, normal, sim, severity }`) and `pass`. Options: `distinct` (a pair must be
at least this different to normal vision to count; default 13) and `collapse`
(a simulated difference below this is a conflict; default 10; `severity:"severe"` below 5).

## Honest scope
This simulates a **model** of color-vision deficiency — an approximation of a diverse
population — not any single person's vision, and results depend on an uncalibrated
screen. It reliably catches classic red-green and blue-yellow conflicts. It is **not**
a legal accessibility audit and does not certify ADA, Section 508, WCAG, or EU
Accessibility Act compliance, which cover far more than color.

## License
MIT. Method: Machado, Oliveira & Fernandes (2009) + CIEDE2000.
