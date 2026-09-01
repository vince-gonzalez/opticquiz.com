# logmar

**Convert visual acuity between logMAR, Snellen, and decimal.** Pure arithmetic, zero dependencies.

```bash
pip install logmar
```

```python
import logmar

logmar.snellen_to_logmar("20/40")  # 0.301
logmar.logmar_to_snellen(0.3)      # "20/40"
logmar.snellen_to_logmar("6/12")   # 0.301  (metric Snellen, same acuity)
logmar.decimal_to_logmar(0.5)      # 0.301
logmar.logmar_to_decimal(0.0)      # 1.0  (20/20)
```

## API

- **`snellen_to_logmar("20/40")`** / **`logmar_to_snellen(0.3, base=20)`**
- **`decimal_to_logmar(0.5)`** / **`logmar_to_decimal(0.3)`**
- **`snellen_to_decimal("20/40")`** / **`decimal_to_snellen(0.5, base=20)`**

logMAR = −log₁₀(decimal acuity); Snellen `m/x` has decimal `m/x`. `20/20` = `0.0` logMAR = `1.0`
decimal; larger logMAR is worse acuity.

## Licence
MIT.
