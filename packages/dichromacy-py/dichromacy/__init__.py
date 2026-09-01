"""dichromacy — simulate the three dichromacies: protanopia, deuteranopia, tritanopia.

An umbrella over cvdsim covering all three. For total color blindness see ``achromatopsia``;
for mild/anomalous vision see ``trichromacy``.

    import dichromacy
    dichromacy.simulate("#d7191c", "deutan")   # that red to a deuteranope
    dichromacy.protan("#1a9641")               # green to a protanope
"""

import cvdsim

__version__ = "0.1.0"
TYPES = cvdsim.TYPES  # ("protan", "deutan", "tritan")
__all__ = ["simulate", "simulate_image", "protan", "deutan", "tritan", "TYPES"]


def _assert(type):
    if type not in TYPES:
        raise ValueError('type must be "protan", "deutan", or "tritan".')


def simulate(color, type, severity=1.0):
    _assert(type)
    return cvdsim.simulate(color, type, severity)


def simulate_image(image, type, severity=1.0):
    _assert(type)
    return cvdsim.simulate_image(image, type, severity)


def protan(color, severity=1.0):
    return cvdsim.simulate(color, "protan", severity)


def deutan(color, severity=1.0):
    return cvdsim.simulate(color, "deutan", severity)


def tritan(color, severity=1.0):
    return cvdsim.simulate(color, "tritan", severity)
