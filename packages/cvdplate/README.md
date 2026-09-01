# cvdplate

**Generate Ishihara-style pseudoisochromatic color-vision test plates.** A digit is hidden in a
field of colored dots so it reads to normal vision but collapses under protanopia, deuteranopia, or
tritanopia. The JS companion to the [`ishihara`](https://pypi.org/project/ishihara/) Python package.

```bash
npm install cvdplate
```

```js
const cvdplate = require("cvdplate");

const png = cvdplate.plate("7", { type: "deutan", size: 480, seed: 42 });
require("fs").writeFileSync("plate-7.png", png);   // a 7 that vanishes for deuteranopes
```

## API

- **`plate(number, opts?)`** → a **PNG Buffer**.
  - `number` — the digit(s) to hide, e.g. `"7"` or `"29"` (0–9).
  - `opts.type` — `"protan"` | `"deutan"` | `"tritan"` (default `"deutan"`).
  - `opts.size` — plate size in px (default `480`).
  - `opts.seed` — integer; same seed → identical plate (default `1`).
- **`pickPair(type)`** → `{ figure, background, normal, sim }` — the color pair chosen for that
  deficiency, with its normal and simulated CIEDE2000 differences.

## How the colors are chosen

The figure/background pair isn't guessed — it's searched with
[`opticquiz-cvd`](https://www.npmjs.com/package/opticquiz-cvd)'s `deltaE` and `simulate`: a pair with
a **large** normal CIEDE2000 difference and a **small** difference after simulating the target
deficiency (Machado, Oliveira & Fernandes 2009). So the "hiding" is measured. Method, open access:
https://doi.org/10.5281/zenodo.21310578

## Not a clinical instrument

A demonstration/screening aid. On-screen color is not calibrated, so this is not a diagnostic
Ishihara test. `ishihara` (Python) generates plates from a seed with no dependencies; this ports the
idea to Node.

## Licence
MIT.
