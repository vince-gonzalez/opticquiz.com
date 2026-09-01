# achromatopsia

**Simulate total color blindness (achromatopsia / complete monochromacy)** — the world in pure
luminance. A color, or a whole image, collapsed to the gray of the same brightness.

```bash
pip install achromatopsia
```

```js
import "achromatopsia"
achromatopsia.simulate("#d7191c");            // "#7f7f7f" — the equiluminant gray
const png = achromatopsia.simulateImage("./chart.png");
require("fs").writeFileSync("chart-gray.png", png);
```

- **`simulate(color)`** → the gray hex of the same WCAG relative luminance.
- **`simulateImage(input, opts?)`** → a grayscale PNG Buffer (PNG/JPEG in; path, Buffer, or data URI). `opts.maxSide` caps the longest side (default 2000).

Luminance is [`opticquiz-cvd`](https://www.npmjs.com/package/opticquiz-cvd)'s `relLuminance`, re-encoded to sRGB gray. This is the total-monochromacy end; for the dichromacies see [`dichromacy`](https://www.npmjs.com/package/dichromacy). A simulation, not a diagnosis.

## Licence
MIT.
