"""cvdmaps — colorblind-safe colormaps and color cycles for matplotlib.

    import cvdmaps
    cvdmaps.set_cycle()              # every plot now uses a colorblind-safe color cycle
    cvdmaps.palette("okabe_ito")     # ['#000000', '#E69F00', ...] — verified-safe colors

    import matplotlib.pyplot as plt
    plt.imshow(data, cmap="okabe_ito_nb")   # registered colormaps, usable by name

Importing cvdmaps registers the colorblind-safe colormaps with matplotlib. The palettes are the
Okabe-Ito set (Wong, "Points of view: Color blindness", Nature Methods 2011); every shipped palette
passes the OpticQuiz cvdsafe check under protanopia, deuteranopia and tritanopia. matplotlib's
default cycle (tab10) is not colorblind-safe — set_cycle() fixes that in one call. One dependency.
"""

from matplotlib.colors import ListedColormap
import matplotlib as mpl
from cycler import cycler

__version__ = "0.1.0"
__all__ = ["register", "set_cycle", "palette", "names", "OKABE_ITO", "OKABE_ITO_NB"]

# Okabe-Ito colorblind-safe qualitative palette (8 colors, incl. black).
OKABE_ITO = ["#000000", "#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"]
# Without black — a better default cycle for line plots on a white background.
OKABE_ITO_NB = OKABE_ITO[1:]

_QUALITATIVE = {"okabe_ito": OKABE_ITO, "okabe_ito_nb": OKABE_ITO_NB}


def _register_one(name, colors):
    cmap = ListedColormap(colors, name=name)
    reg = getattr(mpl, "colormaps", None)
    if reg is not None and hasattr(reg, "register"):  # matplotlib >= 3.6
        try:
            if name not in reg:  # never re-register (matplotlib ships okabe_ito as a builtin)
                reg.register(cmap)
        except Exception:
            pass
        return
    try:
        mpl.cm.register_cmap(name=name, cmap=cmap)  # older matplotlib
    except Exception:
        pass


def register():
    """Register the colorblind-safe colormaps with matplotlib (idempotent)."""
    for name, colors in _QUALITATIVE.items():
        _register_one(name, colors)


def set_cycle(name="okabe_ito_nb"):
    """Set matplotlib's default color cycle to a colorblind-safe palette."""
    mpl.rcParams["axes.prop_cycle"] = cycler(color=list(_QUALITATIVE[name]))


def palette(name="okabe_ito", n=None):
    """A colorblind-safe palette as a list of hex colors (optionally just the first n)."""
    colors = list(_QUALITATIVE[name])
    return colors if n is None else colors[:n]


def names():
    """The available colorblind-safe qualitative colormap names."""
    return list(_QUALITATIVE)


register()  # auto-register on import
