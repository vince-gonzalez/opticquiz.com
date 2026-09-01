"""achromatopsia — simulate total color blindness (achromatopsia / complete monochromacy).

A complete achromat has no functioning color channels: the world is luminance only. simulate()
replaces a color with the gray of the same WCAG relative luminance (opticquiz_cvd.rel_luminance),
re-encoded to sRGB; simulate_image() does the same per distinct pixel color.

    import achromatopsia
    achromatopsia.simulate("#d7191c")     # "#6d6d6d" — the equiluminant gray
    from PIL import Image
    achromatopsia.simulate_image(Image.open("chart.png")).save("chart-gray.png")

This is the total-monochromacy end; for the dichromacies see ``dichromacy``.
"""

from opticquiz_cvd import rel_luminance

__version__ = "0.1.0"
__all__ = ["simulate", "simulate_image"]


def _lin_to_srgb(y):
    return 12.92 * y if y <= 0.0031308 else 1.055 * (y ** (1 / 2.4)) - 0.055


def simulate(color):
    """A color as an achromat sees it: the equiluminant gray, as a hex string."""
    y = rel_luminance(color)
    v = int(round(max(0.0, min(1.0, _lin_to_srgb(y))) * 255))
    return "#%02x%02x%02x" % (v, v, v)


def simulate_image(image, **_ignored):
    """Grayscale an image by luminance. ``image`` is a PIL Image or a file path; returns a PIL Image.

    Each distinct color is passed through the same luminance transform once via a lookup table.
    """
    try:
        import numpy as np
        from PIL import Image
    except ImportError as e:  # pragma: no cover
        raise ImportError(
            "simulate_image needs Pillow and numpy — `pip install achromatopsia[image]`."
        ) from e

    if isinstance(image, str):
        image = Image.open(image)
    has_alpha = image.mode in ("RGBA", "LA", "PA") or "transparency" in image.info
    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    alpha = np.asarray(image.convert("RGBA"), dtype=np.uint8)[..., 3] if has_alpha else None

    flat = rgb.reshape(-1, 3)
    uniq, inverse = np.unique(flat, axis=0, return_inverse=True)
    gray = np.empty(len(uniq), dtype=np.uint8)
    for i, (r, g, b) in enumerate(uniq):
        y = rel_luminance("#%02x%02x%02x" % (r, g, b))
        gray[i] = int(round(max(0.0, min(1.0, _lin_to_srgb(y))) * 255))
    out = gray[inverse].reshape(rgb.shape[:2])
    out3 = np.dstack([out, out, out])

    if alpha is not None:
        return Image.fromarray(np.dstack([out3, alpha]).astype(np.uint8), "RGBA")
    return Image.fromarray(out3.astype(np.uint8), "RGB")
