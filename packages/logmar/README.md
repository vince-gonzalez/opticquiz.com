# logmar

**Convert visual acuity between logMAR, Snellen, and decimal.** Pure arithmetic, zero dependencies.

```bash
npm install logmar
```

```js
const la = require("logmar");

la.snellenToLogmar("20/40");  // 0.301
la.logmarToSnellen(0.3);      // "20/40"
la.snellenToLogmar("6/12");   // 0.301  (metric Snellen, same acuity)
la.decimalToLogmar(0.5);      // 0.301
la.logmarToDecimal(0.0);      // 1  (20/20)
```

## API

- **`snellenToLogmar("20/40")`** / **`logmarToSnellen(0.3, base=20)`**
- **`decimalToLogmar(0.5)`** / **`logmarToDecimal(0.3)`**
- **`snellenToDecimal("20/40")`** / **`decimalToSnellen(0.5, base=20)`**

logMAR = −log₁₀(decimal acuity); Snellen `m/x` has decimal `m/x`. `20/20` = `0.0` logMAR = `1.0`
decimal; larger logMAR is worse acuity. `logmarToSnellen` rounds the denominator to the nearest
whole line.

## Licence
MIT.
