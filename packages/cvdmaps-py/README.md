# cvdmaps

**Colorblind-safe colormaps and color cycles for matplotlib.** matplotlib's default color cycle
(`tab10`) is *not* colorblind-safe — `cvdmaps` fixes that in one call, and every palette it ships is
verified safe under protanopia, deuteranopia, and tritanopia.

```bash
pip install cvdmaps
```

```python
import cvdmaps
cvdmaps.set_cycle()                 # every plot from here uses a colorblind-safe cycle

import matplotlib.pyplot as plt
plt.plot(x, y1); plt.plot(x, y2)    # colors now stay distinct for colorblind viewers

cvdmaps.palette("okabe_ito")        # ['#000000', '#E69F00', '#56B4E9', ...]
plt.imshow(data, cmap="okabe_ito_nb")   # registered colormaps, usable by name
```

## API

- **`set_cycle(name="okabe_ito_nb")`** — set matplotlib's default color cycle to a colorblind-safe
  palette. The one call that makes all your plots safe.
- **`palette(name="okabe_ito", n=None)`** — the palette as a list of hex colors (optionally first `n`).
- **`register()`** — (re)register the colormaps with matplotlib; runs automatically on import.
- **`names()`** — `['okabe_ito', 'okabe_ito_nb']`.

`okabe_ito` is the 8-color set (incl. black); `okabe_ito_nb` drops black for line plots on white.

## Why trust it

The palettes are the [Okabe–Ito](https://www.nature.com/articles/nmeth.1618) colorblind-safe set,
and each one **passes the OpticQuiz [`cvdsafe`](https://pypi.org/project/cvdsafe/) check** — the same
Machado 2009 + CIEDE2000 engine behind the rest of the suite. Nothing ships that our own checker
rejects. For a sequential colorblind-safe map, matplotlib's built-in `cividis` is a good default.

## Licence
MIT.
