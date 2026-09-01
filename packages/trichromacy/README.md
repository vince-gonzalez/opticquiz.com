# trichromacy

**Normal (three-cone) color vision — and anomalous trichromacy.** A normal trichromat sees true
color; anomalous trichromacy (protanomaly / deuteranomaly / tritanomaly) is a milder, shifted
deficiency, modeled as a partial simulation.

```bash
npm install trichromacy
```

```js
const trichromacy = require("trichromacy");
trichromacy.simulate("#d7191c");                 // "#d7191c" — true color
trichromacy.anomalous("#d7191c", "deutan", 0.5); // mild deuteranomaly
const png = trichromacy.anomalousImage("./chart.png", "deutan", { severity: 0.5 });
```

- **`simulate(color)`** → the color unchanged (normal trichromatic vision).
- **`anomalous(color, type, severity=0.5)`** → a color under anomalous trichromacy; `severity` 0..1 (0 = normal, 1 = full dichromacy).
- **`anomalousImage(input, type, opts?)`** → a recolored PNG Buffer; `opts.severity` default 0.5.

Built on [`cvdsim`](https://www.npmjs.com/package/cvdsim). For full dichromacies see [`dichromacy`](https://www.npmjs.com/package/dichromacy); for total color blindness see [`achromatopsia`](https://www.npmjs.com/package/achromatopsia). A simulation, not a diagnosis.

## Licence
MIT.
