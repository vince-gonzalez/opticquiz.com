# protanopia

Simulate **protanopia** (red-blind) color vision — the color, or a whole image, as a protanopia viewer sees it.
A typed shortcut over [`cvdsim`](https://www.npmjs.com/package/cvdsim): every call is `cvdsim`'s
with the deficiency fixed to `protan`.

```bash
npm install protanopia
```

```js
const protanopia = require("protanopia");
protanopia.simulate("#d7191c");                 // that red as protanopia sees it
const png = protanopia.simulateImage("./chart.png");  // PNG Buffer, recolored
require("fs").writeFileSync("chart-protan.png", png);
```

- **`simulate(color, severity?)`** → hex, as protanopia sees it.
- **`simulateImage(input, opts?)`** → a recolored PNG Buffer (PNG/JPEG in; path, Buffer, or data URI).

Built on the published method: https://doi.org/10.5281/zenodo.21310578 · A screening/design aid, not a clinical tool.

## Licence
MIT.
