# hueristic

**Is your palette colorblind-safe?** One import to check and fix color palettes for color-vision
deficiency — protanopia, deuteranopia, tritanopia.

```bash
pip install hueristic
```

```python
import hueristic as hue

hue.is_safe(["#d7191c", "#1a9641"])            # False — red and green collapse under deutan/protan
hue.is_safe(["#0072b2", "#e69f00", "#009e73"]) # True  — an Okabe-Ito set stays distinct

hue.check_palette(["#d7191c", "#1a9641"])
# {'pass': False, 'types': {'deutan': {'conflicts': [{'a': '#d7191c', 'b': '#1a9641', ...}]}}}

hue.fix_palette(["#d7191c", "#1a9641"])["colors"]  # a safe palette near the originals
hue.simulate("#d7191c", "deutan")                  # how that red looks to a deuteranope
```

## What it does

- **`is_safe(colors)`** → `True`/`False` for the whole palette.
- **`check_palette(colors)`** → every pair that stays distinct to normal vision but collapses under
  a deficiency, with the CIEDE2000 difference before and after simulation.
- **`fix_palette(colors)`** → an adjusted palette that passes, separated along lightness, staying
  near the originals.
- **`simulate(color, type)`** → the color as a given deficiency sees it.
- **`check_contrast(fg, bg)`** → WCAG contrast ratio and AA/AAA pass.

## How it decides

`hueristic` is a front door to [`opticquiz-cvd`](https://pypi.org/project/opticquiz-cvd/), which
simulates deficiency with the Machado, Oliveira & Fernandes (2009) matrices and measures color
difference with CIEDE2000. The method is published open access:
https://doi.org/10.5281/zenodo.21310578

Every function here is `opticquiz_cvd`'s, unchanged — the package adds the name and one
convenience, so there is never a second copy of the colorimetry to drift.

## Not a legal audit

A screening aid for the color-distinguishability axis of accessibility, not a WCAG/ADA audit, and
no screen-based check is a clinical diagnosis.

## Licence

MIT.
