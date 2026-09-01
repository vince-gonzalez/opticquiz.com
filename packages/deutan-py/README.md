# deutan

Simulate **deuteranopia** (green-blind) color vision — the color, or a whole image, as a deuteranopia viewer sees it.
A typed shortcut over [`cvdsim`](https://pypi.org/project/cvdsim/): every call is `cvdsim`'s with
the deficiency fixed to `deutan`.

```bash
pip install deutan          # color only
pip install "deutan[image]" # + image recoloring
```

```python
import deutan
deutan.simulate("#d7191c")            # that red as deuteranopia sees it
from PIL import Image
deutan.simulate_image(Image.open("chart.png")).save("chart-deutan.png")
```

- **`simulate(color, severity=1.0)`** → hex, as deuteranopia sees it.
- **`simulate_image(image, severity=1.0)`** → a recolored PIL Image (path or Image in).

Built on the published method: https://doi.org/10.5281/zenodo.21310578 · Screening/design aid, not a clinical tool.

## Licence
MIT.
