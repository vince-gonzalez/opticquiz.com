# safepalette

**Colorblind-safe color palettes — generate, check, and fix.** Ask for N safe colors, test a
palette you have, or repair one that fails — protanopia, deuteranopia, tritanopia.

```bash
pip install safepalette
```

```python
import safepalette as sp

sp.generate(5)                          # 5 colorblind-safe hex colors (Okabe-Ito based)
sp.is_safe(["#d7191c", "#1a9641"])      # False — red & green collapse under deutan/protan
sp.fix(["#d7191c", "#1a9641"])["colors"] # a safe palette near the originals
sp.OKABE_ITO                            # the canonical 8-color safe palette
```

## API

- **`generate(n, **opts)`** → up to `n` colorblind-safe hex colors. `n <= 8` is the
  [Okabe–Ito](https://www.nature.com/articles/nmeth.1618) palette (safe by design); above 8 it
  extends only with colors that keep the whole set passing. Large `n` may return fewer than `n` —
  never an unsafe color.
- **`is_safe(colors, **opts)`** → `True`/`False`.
- **`fix(colors, **opts)`** → `{"colors", "drift", "pass", "residual"}`, a safe palette near the originals.
- **`check(colors, **opts)`** → the full per-type conflict report.

## How it decides

`check` and `fix` are [`opticquiz-cvd`](https://pypi.org/project/opticquiz-cvd/)'s `check_palette`
and `fix_palette` — Machado, Oliveira & Fernandes (2009) + CIEDE2000, open access:
https://doi.org/10.5281/zenodo.21310578 . The generator is seeded with the Okabe–Ito safe palette
(Wong, *Nature Methods*, 2011). No colorimetry is reimplemented here.

## Not a legal audit
A screening/design aid for the color-distinguishability axis, not a WCAG/ADA audit.

## Licence
MIT.
