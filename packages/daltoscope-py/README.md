# daltoscope

**See a color, a palette, or a whole image the way a colorblind person does.** Where `hueristic`
*judges* whether colors are safe, `daltoscope` *shows* you — it recolors a hex, or an entire
PNG/JPEG, as protanopia, deuteranopia, or tritanopia renders it.

```bash
pip install daltoscope          # colors only
pip install "daltoscope[image]" # + image recoloring (Pillow, numpy)
```

```python
import daltoscope as dalton

dalton.simulate("#d7191c", "deutan")   # "#8a7b0c" — that warning red, to a deuteranope
dalton.simulate_all("#1a9641")         # {"protan": "#988839", "deutan": "#8a7f48", "tritan": "#009383"}

from PIL import Image
sim = dalton.simulate_image(Image.open("dashboard.png"), "deutan")
sim.save("dashboard-deutan.png")
```

## API

- **`simulate(color, type, severity=1.0)`** → the color as one deficiency sees it, as hex.
  `type` is `"protan"`, `"deutan"`, or `"tritan"`.
- **`simulate_all(color, severity=1.0)`** → `{"protan": ..., "deutan": ..., "tritan": ...}`.
- **`simulate_image(image, type, severity=1.0)`** → a recolored PIL `Image` (alpha preserved).
  `image` is a PIL `Image` or a file path. `severity` (0..1) shows partial deficiency
  (anomalous trichromacy), not only the full dichromat case.

## How it works

`daltoscope` is a thin lens over [`opticquiz-cvd`](https://pypi.org/project/opticquiz-cvd/): every
pixel's transform is that engine's `simulate()`, using the Machado, Oliveira & Fernandes (2009)
deficiency matrices. `simulate_image` passes each *distinct* color through the engine once via a
lookup table, so a photograph is not thousands of redundant calls — and there is never a second
copy of the colorimetry to drift. Method, open access:
https://doi.org/10.5281/zenodo.21310578

## Not a clinical tool

A simulation for design and communication — it approximates how deficient color vision renders an
image. It is not a diagnosis, and no on-screen rendering is exact for a given individual.

## Licence

MIT.
