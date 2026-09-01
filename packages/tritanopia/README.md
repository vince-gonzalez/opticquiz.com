# tritanopia

Simulate **tritanopia** (blue-yellow) color vision — the color, or a whole image, as a tritanopia viewer sees it.
A typed shortcut over [`cvdsim`](https://www.npmjs.com/package/cvdsim): every call is `cvdsim`'s
with the deficiency fixed to `tritan`.

```bash
npm install tritanopia
```

```js
const tritanopia = require("tritanopia");
tritanopia.simulate("#d7191c");                 // that red as tritanopia sees it
const png = tritanopia.simulateImage("./chart.png");  // PNG Buffer, recolored
require("fs").writeFileSync("chart-tritan.png", png);
```

- **`simulate(color, severity?)`** → hex, as tritanopia sees it.
- **`simulateImage(input, opts?)`** → a recolored PNG Buffer (PNG/JPEG in; path, Buffer, or data URI).

Built on the published method: https://doi.org/10.5281/zenodo.21310578 · A screening/design aid, not a clinical tool.

## Licence
MIT.
