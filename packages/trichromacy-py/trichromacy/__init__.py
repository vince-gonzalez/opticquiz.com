"""trichromacy — normal (three-cone) color vision, plus anomalous trichromacy.

A normal trichromat sees true color, so simulate() is the identity (the engine at severity 0). The
useful part is anomalous(): anomalous trichromacy — protanomaly / deuteranomaly / tritanomaly — is
a milder, shifted deficiency, modeled as a partial simulation (severity < 1). For the full
dichromacies see ``dichromacy``; for total monochromacy see ``achromatopsia``.

    import trichromacy
    trichromacy.simulate("#d7191c")                  # "#d7191c" — true color
    trichromacy.anomalous("#d7191c", "deutan", 0.5)  # mild deuteranomaly
"""

import cvdsim

__version__ = "0.1.0"
TYPES = cvdsim.TYPES
__all__ = ["simulate", "anomalous", "anomalous_image", "TYPES"]


def _assert(type):
    if type not in TYPES:
        raise ValueError('type must be "protan", "deutan", or "tritan".')


def simulate(color):
    """Normal trichromatic vision: the color unchanged (normalized through the engine)."""
    return cvdsim.simulate(color, "deutan", 0)


def anomalous(color, type, severity=0.5):
    """Anomalous trichromacy — a partial deficiency. severity 0..1 (0 = normal, 1 = full dichromacy)."""
    _assert(type)
    return cvdsim.simulate(color, type, severity)


def anomalous_image(image, type, severity=0.5):
    _assert(type)
    return cvdsim.simulate_image(image, type, severity)
