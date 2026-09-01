"""tritanopia — simulate tritanopia (blue-yellow) color vision.

A one-type shortcut over cvdsim: every call is cvdsim's with the deficiency fixed to "tritan".
No colorimetry is reimplemented here.

    import tritanopia
    tritanopia.simulate("#d7191c")                 # that color as tritanopia sees it
    from PIL import Image
    tritanopia.simulate_image(Image.open("chart.png")).save("chart-tritan.png")
"""
import cvdsim

__version__ = "0.1.0"
TYPE = "tritan"
__all__ = ["simulate", "simulate_image", "TYPE"]


def simulate(color, severity=1.0):
    return cvdsim.simulate(color, TYPE, severity)


def simulate_image(image, severity=1.0):
    return cvdsim.simulate_image(image, TYPE, severity)
