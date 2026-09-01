# tritanopia

Simulate **tritanopia** (blue-yellow) color vision — the color, or a whole image, as a tritanopia viewer sees it.
A typed shortcut over [`cvdsim`](https://pypi.org/project/cvdsim/): every call is `cvdsim`'s with
the deficiency fixed to `tritan`.

```bash
pip install tritanopia          # color only
pip install "tritanopia[image]" # + image recoloring
```

```python
import tritanopia
tritanopia.simulate("#d7191c")            # that red as tritanopia sees it
from PIL import Image
tritanopia.simulate_image(Image.open("chart.png")).save("chart-tritan.png")
```

- **`simulate(color, severity=1.0)`** → hex, as tritanopia sees it.
- **`simulate_image(image, severity=1.0)`** → a recolored PIL Image (path or Image in).

Built on the published method: https://doi.org/10.5281/zenodo.21310578 · Screening/design aid, not a clinical tool.

## Licence
MIT.
