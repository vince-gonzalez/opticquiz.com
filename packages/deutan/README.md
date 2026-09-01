# deutan

Simulate **deuteranopia** (green-blind) color vision — the color, or a whole image, as a deuteranopia viewer sees it.
A typed shortcut over [`cvdsim`](https://www.npmjs.com/package/cvdsim): every call is `cvdsim`'s
with the deficiency fixed to `deutan`.

```bash
npm install deutan
```

```js
const deutan = require("deutan");
deutan.simulate("#d7191c");                 // that red as deuteranopia sees it
const png = deutan.simulateImage("./chart.png");  // PNG Buffer, recolored
require("fs").writeFileSync("chart-deutan.png", png);
```

- **`simulate(color, severity?)`** → hex, as deuteranopia sees it.
- **`simulateImage(input, opts?)`** → a recolored PNG Buffer (PNG/JPEG in; path, Buffer, or data URI).

Built on the published method: https://doi.org/10.5281/zenodo.21310578 · A screening/design aid, not a clinical tool.

## Licence
MIT.
