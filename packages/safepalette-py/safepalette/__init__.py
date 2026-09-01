"""safepalette — generate, check, and fix colorblind-safe color palettes.

    import safepalette as sp

    sp.generate(5)                       # 5 colorblind-safe hex colors
    sp.is_safe(["#d7191c", "#1a9641"])   # False
    sp.fix(["#d7191c", "#1a9641"])["colors"]  # a safe palette near the originals

check() and fix() are opticquiz_cvd's own (Machado, Oliveira & Fernandes 2009 + CIEDE2000). The
new piece is generate(), seeded with the Okabe-Ito colorblind-safe palette (Wong, Nature Methods
2011) and, above eight colors, extended only with lightness-shifted colors that keep the whole set
passing check_palette. No colorimetry is reimplemented here.
"""

from opticquiz_cvd import check_palette, fix_palette

__version__ = "0.1.0"
__all__ = ["generate", "is_safe", "fix", "check", "OKABE_ITO"]

# Okabe-Ito colorblind-safe qualitative palette (8 colors, incl. black).
OKABE_ITO = ["#000000", "#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"]


def check(colors, **opts):
    return check_palette(colors, **opts)


def is_safe(colors, **opts):
    return check_palette(colors, **opts)["pass"]


def fix(colors, **opts):
    return fix_palette(colors, **opts)


def _hex_to_rgb(h):
    n = int(str(h).lstrip("#"), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]


def _shift_light(h, f):
    """f>0 lightens toward white, f<0 darkens toward black."""
    r, g, b = _hex_to_rgb(h)
    if f >= 0:
        r, g, b = (int(round(c + (255 - c) * f)) for c in (r, g, b))
    else:
        r, g, b = (int(round(c * (1 + f))) for c in (r, g, b))
    return "#%02x%02x%02x" % (r, g, b)


def generate(n, **opts):
    """Return up to ``n`` colorblind-safe hex colors.

    ``n <= 8`` is the Okabe-Ito palette. For ``n > 8`` the palette is extended with
    lightness-shifted variants that keep the whole set passing check_palette; because
    mutually-distinct-under-CVD colors are finite, the result may contain fewer than ``n`` for
    large ``n`` (it never returns an unsafe color).
    """
    n = int(n)
    if n < 1:
        return []
    if n <= len(OKABE_ITO):
        return OKABE_ITO[:n]
    out = list(OKABE_ITO)
    candidates = [_shift_light(h, f) for h in OKABE_ITO for f in (0.2, -0.2, 0.35, -0.35, 0.1, -0.1)]
    for c in candidates:
        if len(out) >= n:
            break
        if c not in out and check_palette(out + [c], **opts)["pass"]:
            out.append(c)
    return out
