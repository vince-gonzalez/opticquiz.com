# dichromacy

**Simulate the three dichromacies — protanopia, deuteranopia, tritanopia.** A color or a whole
image as a dichromat (missing one cone type) sees it.

```bash
npm install dichromacy
```

```js
const dichromacy = require("dichromacy");
dichromacy.simulate("#d7191c", "deutan");   // that red to a deuteranope
dichromacy.protan("#1a9641");               // green to a protanope
const png = dichromacy.simulateImage("./chart.png", "tritan");
```

- **`simulate(color, type, severity?)`** → hex. `type` is `"protan"`, `"deutan"`, or `"tritan"`.
- **`simulateImage(input, type, opts?)`** → a recolored PNG Buffer.
- **`protan/deutan/tritan(color, severity?)`** → the named shortcuts.

An umbrella over [`cvdsim`](https://www.npmjs.com/package/cvdsim) (Machado, Oliveira & Fernandes 2009). For total color blindness see [`achromatopsia`](https://www.npmjs.com/package/achromatopsia); for mild vision see [`trichromacy`](https://www.npmjs.com/package/trichromacy). A simulation, not a diagnosis.

## Licence
MIT.
