"""deutan — simulate deuteranopia (green-blind) color vision.

A one-type shortcut over cvdsim: every call is cvdsim's with the deficiency fixed to "deutan".
No colorimetry is reimplemented here.

    import deutan
    deutan.simulate("#d7191c")                 # that color as deuteranopia sees it
    from PIL import Image
    deutan.simulate_image(Image.open("chart.png")).save("chart-deutan.png")
"""
import cvdsim

__version__ = "0.1.0"
TYPE = "deutan"
__all__ = ["simulate", "simulate_image", "TYPE"]


def simulate(color, severity=1.0):
    return cvdsim.simulate(color, TYPE, severity)


def simulate_image(image, severity=1.0):
    return cvdsim.simulate_image(image, TYPE, severity)
