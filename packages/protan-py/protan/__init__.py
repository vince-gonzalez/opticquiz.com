"""protan — simulate protanopia (red-blind) color vision.

A one-type shortcut over cvdsim: every call is cvdsim's with the deficiency fixed to "protan".
No colorimetry is reimplemented here.

    import protan
    protan.simulate("#d7191c")                 # that color as protanopia sees it
    from PIL import Image
    protan.simulate_image(Image.open("chart.png")).save("chart-protan.png")
"""
import cvdsim

__version__ = "0.1.0"
TYPE = "protan"
__all__ = ["simulate", "simulate_image", "TYPE"]


def simulate(color, severity=1.0):
    return cvdsim.simulate(color, TYPE, severity)


def simulate_image(image, severity=1.0):
    return cvdsim.simulate_image(image, TYPE, severity)
