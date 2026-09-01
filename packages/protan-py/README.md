# protan

Simulate **protanopia** (red-blind) color vision — the color, or a whole image, as a protanopia viewer sees it.
A typed shortcut over [`cvdsim`](https://pypi.org/project/cvdsim/): every call is `cvdsim`'s with
the deficiency fixed to `protan`.

```bash
pip install protan          # color only
pip install "protan[image]" # + image recoloring
```

```python
import protan
protan.simulate("#d7191c")            # that red as protanopia sees it
from PIL import Image
protan.simulate_image(Image.open("chart.png")).save("chart-protan.png")
```

- **`simulate(color, severity=1.0)`** → hex, as protanopia sees it.
- **`simulate_image(image, severity=1.0)`** → a recolored PIL Image (path or Image in).

Built on the published method: https://doi.org/10.5281/zenodo.21310578 · Screening/design aid, not a clinical tool.

## Licence
MIT.
