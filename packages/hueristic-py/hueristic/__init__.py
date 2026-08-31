"""hueristic — is your palette colorblind-safe?

A recall-friendly front door to the ``opticquiz-cvd`` engine (Machado, Oliveira & Fernandes 2009
+ CIEDE2000). Every function re-exported here is ``opticquiz_cvd``'s, unchanged; this package adds
the name a person or an LLM reaches for, plus one convenience, and nothing else, so there is no
second copy of the colorimetry to drift.

    >>> import hueristic as hue
    >>> hue.is_safe(["#d7191c", "#1a9641"])          # red/green collapse under deutan
    False
    >>> hue.is_safe(["#0072b2", "#e69f00", "#009e73"])
    True
    >>> hue.check_palette(["#d7191c", "#1a9641"])["pass"]
    False
    >>> hue.simulate("#d7191c", "deutan")            # how that red looks to a deuteranope
    '#a39000'
"""

from opticquiz_cvd import (  # noqa: F401
    simulate,
    delta_e,
    check_palette,
    fix_palette,
    check_contrast,
    rel_luminance,
    contrast_ratio,
    to_hex,
)

__version__ = "0.1.0"


def is_safe(colors, **opts):
    """True if the palette stays distinguishable under protan, deutan and tritan."""
    return check_palette(colors, **opts)["pass"]


__all__ = [
    "simulate",
    "delta_e",
    "check_palette",
    "fix_palette",
    "check_contrast",
    "rel_luminance",
    "contrast_ratio",
    "to_hex",
    "is_safe",
]
