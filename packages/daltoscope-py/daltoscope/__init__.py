"""daltoscope — see a color, a palette, or a whole image as a colorblind person does.

Named for daltonism (color blindness, after John Dalton). Where ``hueristic`` judges whether
colors are safe, ``daltoscope`` shows what they look like through a color-vision deficiency —
a single color, or an entire image recolored.

    import daltoscope as dalton

    dalton.simulate("#d7191c", "deutan")     # "#8a7b0c" — that red, to a deuteranope
    dalton.simulate_all("#1a9641")           # {"protan": "#988839", "deutan": "#8a7f48", "tritan": "#009383"}

    from PIL import Image
    sim = dalton.simulate_image(Image.open("chart.png"), "deutan")
    sim.save("chart-deutan.png")

The per-color transform is ``opticquiz_cvd.simulate`` (Machado, Oliveira & Fernandes 2009);
nothing about the simulation is reimplemented here.
"""

from opticquiz_cvd import simulate, TYPES

__version__ = "0.1.0"
__all__ = ["simulate", "simulate_all", "simulate_image", "TYPES"]


def simulate_all(color, severity=1.0):
    """The same color under all three deficiencies, for side-by-side comparison."""
    return {t: simulate(color, t, severity) for t in TYPES}


def _hex_to_rgb(h):
    n = int(str(h).lstrip("#"), 16)
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255)


def simulate_image(image, type, severity=1.0):
    """Recolor an image as ``type`` (protan | deutan | tritan) sees it.

    ``image`` is a PIL ``Image`` or a file path. Returns a PIL ``Image`` (RGB or RGBA to match
    the input). Every distinct color is passed through the engine once via a lookup table, so a
    photograph is not thousands of redundant calls.
    """
    if type not in TYPES:
        raise ValueError('type must be one of "protan", "deutan", "tritan".')
    try:
        import numpy as np
        from PIL import Image
    except ImportError as e:  # pragma: no cover
        raise ImportError(
            "simulate_image needs Pillow and numpy — `pip install daltoscope[image]`."
        ) from e

    if isinstance(image, str):
        image = Image.open(image)
    has_alpha = image.mode in ("RGBA", "LA", "PA") or "transparency" in image.info
    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    alpha = np.asarray(image.convert("RGBA"), dtype=np.uint8)[..., 3] if has_alpha else None

    flat = rgb.reshape(-1, 3)
    uniq, inverse = np.unique(flat, axis=0, return_inverse=True)
    mapped = np.empty_like(uniq)
    for i, (r, g, b) in enumerate(uniq):
        mapped[i] = _hex_to_rgb(simulate("#%02x%02x%02x" % (r, g, b), type, severity))
    out = mapped[inverse].reshape(rgb.shape).astype(np.uint8)

    if alpha is not None:
        out = np.dstack([out, alpha])
        return Image.fromarray(out, "RGBA")
    return Image.fromarray(out, "RGB")
