#!/usr/bin/env python3
"""Does each colour test's stimulus actually lie on the confusion axis it claims to test?

    python tools/confusion_axis.py

A pseudoisochromatic plate works by separating figure from ground ALONG a confusion line -
the direction in colour space that a given deficiency cannot see. Separate them across that
line instead and the plate is trivially readable by the very people it is meant to screen,
while still looking like a real test to everyone else. Nothing about the code would look
wrong. The only way to know is to measure the angle.

This is question 5 of the test-validity rubric, and it is the one that needs measurement
rather than reading. It already caught the /color/ tritan palette sitting ~53 degrees off
axis in July 2026.

Method: sample each palette's declared HSL range, convert to CIE 1931 xy, and compare two
directions at the figure centroid --

  the confusion direction   (figure centroid - copunctal point), the way colours slide
                            together for that deficiency
  the separation direction  (ground centroid - figure centroid), the way this plate actually
                            separates figure from ground

0 degrees  = separation runs exactly along the confusion line. The deficiency collapses it.
90 degrees = separation is orthogonal. The deficiency sees it perfectly. The plate is broken.

Copunctal points are the standard values (Wyszecki & Stiles). They are model constants, not
measurements of any individual, and a real observer's confusion lines vary - so treat a small
angle as "this can work", not "this is calibrated".
"""
import colorsys, math, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Copunctal points: where all confusion lines for a deficiency converge, in CIE 1931 xy.
COPUNCTAL = {"protan": (0.747, 0.253), "deutan": (1.080, -0.080), "tritan": (0.171, 0.000)}

# Angle above which a plate is separating figure from ground in a direction the deficiency
# can still see. Not a standard - a line we draw and report against.
WARN_DEG = 25.0


def srgb_to_xy(r, g, b):
    """sRGB 0..1 -> CIE 1931 xy. Same linearisation and matrix the engine uses."""
    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    X = 0.4124 * r + 0.3576 * g + 0.1805 * b
    Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    Z = 0.0193 * r + 0.1192 * g + 0.9505 * b
    s = X + Y + Z
    return (X / s, Y / s) if s else (0.0, 0.0)


def centroid(rng, n=7):
    """Range-sample a declared HSL band rather than taking its midpoint, so a palette cannot
    look on-axis at its centre while drifting off at its edges."""
    xs, ys = [], []
    for i in range(n):
        h = rng["hMin"] + (rng["hMax"] - rng["hMin"]) * i / max(1, n - 1)
        for j in range(n):
            s = rng["sMin"] + (rng["sMax"] - rng["sMin"]) * j / max(1, n - 1)
            for k in range(n):
                l = rng["lMin"] + (rng["lMax"] - rng["lMin"]) * k / max(1, n - 1)
                r, g, b = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
                x, y = srgb_to_xy(r, g, b)
                xs.append(x); ys.append(y)
    return sum(xs) / len(xs), sum(ys) / len(ys)


def deviation(fg, bg, kind):
    """Angle between how this plate separates, and how the deficiency confuses."""
    cx, cy = COPUNCTAL[kind]
    conf = (fg[0] - cx, fg[1] - cy)          # along the confusion line at the figure
    sep = (bg[0] - fg[0], bg[1] - fg[1])     # how the plate actually separates
    def norm(v):
        m = math.hypot(*v)
        return (v[0] / m, v[1] / m) if m else (0.0, 0.0)
    a, b = norm(conf), norm(sep)
    dot = max(-1.0, min(1.0, a[0] * b[0] + a[1] * b[1]))
    ang = math.degrees(math.acos(dot))
    return min(ang, 180.0 - ang)             # direction along the line is irrelevant


def palettes_from(path):
    """Pull the PALETTES object straight out of the shipped page - never a transcription."""
    src = Path(path).read_text(encoding="utf-8")
    m = re.search(r"var PALETTES\s*=\s*\{(.*?)\n\};", src, re.S)
    if not m:
        return {}
    out = {}
    for name, body in re.findall(r"(\w+):\s*\{\s*(fg:.*?)\n\s*\}", m.group(1), re.S):
        band = {}
        for side, fields in re.findall(r"(fg|bg):\s*\{([^}]*)\}", body):
            band[side] = {k: float(v) for k, v in re.findall(r"(\w+):\s*(-?[\d.]+)", fields)}
        if "fg" in band and "bg" in band:
            out[name] = band
    return out


def main():
    page = ROOT / "color" / "index.html"
    pals = palettes_from(page)
    if not pals:
        print("could not parse PALETTES out of", page); return 1

    print("Stimulus alignment with the confusion axis it claims to test")
    print("(0 = perfectly on axis, 90 = the deficiency sees it clearly)\n")
    print("%-10s %-8s %9s   %s" % ("palette", "axis", "deviation", "verdict"))
    bad = 0
    for name, band in pals.items():
        fg, bg = centroid(band["fg"]), centroid(band["bg"])
        if name == "control":
            print("%-10s %-8s %9s   %s" % (name, "-", "n/a",
                  "lightness contrast by design, no hue axis to test"))
            continue
        kinds = ["protan", "deutan"] if name == "rg" else ["tritan"]
        for k in kinds:
            d = deviation(fg, bg, k)
            ok = d <= WARN_DEG
            if not ok:
                bad += 1
            print("%-10s %-8s %8.1f°   %s" % (name, k, d,
                  "on axis" if ok else "OFF AXIS - this plate does not screen for " + k))
    print()
    if bad:
        print("%d palette/axis pair(s) off axis. A plate separated across the confusion line" % bad)
        print("is readable by the people it is supposed to screen.")
        return 1
    print("all palettes lie on the axis they claim to test.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
