# daltoscope

**See a color, a palette, or a whole image the way a colorblind person does.** Where
[`hueristic`](https://www.npmjs.com/package/hueristic) *judges* whether colors are safe,
`daltoscope` *shows* you — it recolors a hex, or an entire PNG/JPEG, as protanopia, deuteranopia,
or tritanopia renders it.

```bash
npm install daltoscope
```

```js
const dalton = require("daltoscope");

dalton.simulate("#d7191c", "deutan");   // "#8a7b0c" — that warning red, to a deuteranope
dalton.simulateAll("#1a9641");          // { protan: "#988839", deutan: "#8a7f48", tritan: "#009383" }

// Recolor a chart the way a red-green colorblind viewer sees it:
const png = dalton.simulateImage("./dashboard.png", "deutan");
require("fs").writeFileSync("./dashboard-deutan.png", png);
```

## API

- **`simulate(color, type, severity?)`** → the color as one deficiency sees it, as hex.
  `type` is `"protan"`, `"deutan"`, or `"tritan"`.
- **`simulateAll(color, severity?)`** → `{ protan, deutan, tritan }` for one color at once.
- **`simulateImage(input, type, opts?)`** → a **PNG Buffer** of the image recolored. `input` is a
  file path, a `Buffer`, or a base64 `data:` URI; PNG and JPEG are read. `opts.severity` (0..1,
  default 1) sets strength; `opts.maxSide` caps the longest side (default 2000 px, `0` = original).

`severity` lets you show a partial deficiency (anomalous trichromacy), not only the full dichromat
case — `simulate("#d7191c", "deutan", 0.5)` is a milder deuteranomaly.

## How it works

`daltoscope` is a thin lens over [`opticquiz-cvd`](https://www.npmjs.com/package/opticquiz-cvd):
every pixel's transform is that engine's `simulate()`, which uses the Machado, Oliveira & Fernandes
(2009) deficiency matrices. The image path just decodes, runs each distinct color through the
engine once via a lookup table, and re-encodes — there is no second copy of the colorimetry to
drift, and no native image dependency to fail on install (`pngjs` + `jpeg-js` are pure JS). Method,
open access: https://doi.org/10.5281/zenodo.21310578

## Not a clinical tool

A simulation for design and communication — it approximates how deficient color vision renders an
image. It is not a diagnosis, and no on-screen rendering is exact for a given individual.

## Licence

MIT.
