#!/usr/bin/env python3
"""Confusion-axis deviation for plates delivered as SVG, where figure/ground is declared.

    python tools/svg_plate_colorimetry.py --self-test
    python tools/svg_plate_colorimetry.py --svg plate.svg --axis protan deutan

Why SVG first. tools/plate_colorimetry.py measures a raster plate by clustering pixels, and
that only works when the plate really has two colour populations. Real Ishihara plates do not -
k-means inertia in CIE xy keeps dropping 45 to 60 percent per added cluster with no elbow
anywhere, because the plates use many hues per region by design. Clustering therefore cannot
recover which dots are figure and which are ground, and that assignment is exactly what the
measurement needs.

An SVG plate does not have that problem. Every dot carries its own declared colour, either
inline or through a class, so the colour populations are read rather than inferred, exactly and
without decompression, rescaling, or a display in the loop. That measures the ENCODED stimulus:
whether the file itself is on-axis before any panel touches it.

METRIC, following Dain (2004), Visual Neuroscience 21:437-443, which is the established way this
has been done for printed plates for two decades:

  - Take the chromaticities of the dots intended to be confused, weighted by dot area.
  - Draw the confusion line for the deficiency through the MEAN chromaticity of that set.
  - Compare the direction along which the set is actually spread against that confusion line.

Drawing the confusion line through the mean is what makes the measurement independent of which
population is figure and which is ground - a property worth having, since the answer key is the
thing under test.

Two spread directions are reported because they answer slightly different questions:
  centroid  the line joining the two colour families' centroids - how the plate separates
            figure from ground
  pca       the principal axis of the whole weighted dot cloud - Dain's regression form, which
            also absorbs within-family spread

  0 degrees = spread lies along the confusion line; the deficiency collapses it.
 90 degrees = spread is orthogonal; the deficiency sees the figure perfectly.
"""
import argparse
import colorsys
import glob
import json
import math
import os
import re
import sys

import numpy as np

COPUNCTAL = {"protan": (0.747, 0.253), "deutan": (1.080, -0.080), "tritan": (0.171, 0.000)}
WARN_DEG = 25.0


# ---------------------------------------------------------------- colour

def hex_to_rgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) == 8:
        h = h[:6]
    if len(h) != 6:
        return None
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def srgb_to_xy(rgb):
    v = np.asarray(rgb, dtype=np.float64) / 255.0
    lin = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    if lin.ndim == 1:
        lin = lin[None, :]
    r, g, b = lin[:, 0], lin[:, 1], lin[:, 2]
    X = 0.4124 * r + 0.3576 * g + 0.1805 * b
    Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    Z = 0.0193 * r + 0.1192 * g + 0.9505 * b
    s = np.where((X + Y + Z) == 0, 1e-12, X + Y + Z)
    return np.stack([X / s, Y / s], axis=1)


def chroma(rgb):
    a = np.asarray(rgb, dtype=np.float64)
    return (a.max(axis=-1) - a.min(axis=-1)) / 255.0


def fold(deg):
    return 180.0 - deg if deg > 90.0 else deg


def angle_to_confusion(mean_xy, direction, axis):
    """Angle between a spread direction and the confusion line through mean_xy."""
    cx, cy = COPUNCTAL[axis]
    conf = np.array([mean_xy[0] - cx, mean_xy[1] - cy], dtype=np.float64)
    d = np.asarray(direction, dtype=np.float64)
    nc, nd = np.linalg.norm(conf), np.linalg.norm(d)
    if nc == 0 or nd == 0:
        return float("nan")
    cos = float(np.dot(conf, d) / (nc * nd))
    return fold(math.degrees(math.acos(max(-1.0, min(1.0, cos)))))


# ---------------------------------------------------------------- SVG parsing

_DECL = re.compile(r"([^{}]+)\{([^{}]*)\}")
_FILL = re.compile(r"fill\s*:\s*(#[0-9a-fA-F]{3,8})", re.I)


def parse_style_fills(svg_text):
    """class name -> fill hex, honouring cascade order (a later rule overrides an earlier one)."""
    out = {}
    for block in re.findall(r"<style[^>]*>(.*?)</style>", svg_text, re.S):
        for sel, body in _DECL.findall(block):
            m = _FILL.search(body)
            if not m:
                continue
            for s in sel.split(","):
                s = s.strip()
                if s.startswith("."):
                    out[s[1:]] = m.group(1)
    return out


_R = re.compile(r'\br\s*=\s*["\']([0-9.]+)["\']')

# SVG path data may omit separators between numbers whenever the parse stays unambiguous, so
# "a.864.864 0 11-8.2 8.3" carries the two arc radii .864 and .864 with nothing between them.
# A greedy [0-9.]+ swallows both as ".864.864" and float() then raises. This pattern consumes at
# most one decimal point per number, which is what the SVG grammar actually allows.
_NUM = r"[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?"
_ARC = re.compile(r"[aA]\s*(%s)[\s,]*(%s)" % (_NUM, _NUM))


def parse_elements(svg_text, class_fills):
    """-> list of (rgb, area_weight). One entry per drawn dot.

    Circles give their radius directly. ZEISS-style plates draw each dot as a <path> whose arc
    command carries the radii, so those are recovered from the first arc; a dot that cannot be
    sized falls back to weight 1 so it still counts, just unweighted.
    """
    dots = []
    for tag in re.finditer(r"<(circle|path|ellipse)\b([^>]*)>", svg_text, re.I):
        attrs = tag.group(2)
        fill = None
        m = re.search(r'fill\s*=\s*["\'](#[0-9a-fA-F]{3,8})["\']', attrs)
        if m:
            fill = m.group(1)
        else:
            c = re.search(r'class\s*=\s*["\']([^"\']+)["\']', attrs)
            if c:
                for cls in c.group(1).split():
                    if cls in class_fills:
                        fill = class_fills[cls]
        if not fill:
            continue
        rgb = hex_to_rgb(fill)
        if rgb is None:
            continue
        rm = _R.search(attrs)
        w = 1.0
        if rm:
            w = math.pi * float(rm.group(1)) ** 2
        else:
            am = _ARC.search(attrs)
            if am:
                try:
                    w = math.pi * abs(float(am.group(1))) * abs(float(am.group(2)))
                except ValueError:
                    w = 1.0
        if w <= 0:
            w = 1.0
        dots.append((rgb, w))
    return dots


# ---------------------------------------------------------------- measurement

def measure_dots(dots, axis, paper_chroma=0.10, min_family_frac=0.02):
    """Measure one plate's dot list against one confusion axis."""
    if not dots:
        return {"error": "no filled dot elements found"}
    rgb = np.array([d[0] for d in dots], dtype=np.float64)
    w = np.array([d[1] for d in dots], dtype=np.float64)

    chromatic = chroma(rgb) >= paper_chroma
    n_paper = int((~chromatic).sum())
    rgb, w = rgb[chromatic], w[chromatic]
    if len(rgb) < 4:
        return {"error": "fewer than 4 chromatic dots (n=%d)" % len(rgb)}

    xy = srgb_to_xy(rgb)
    W = w / w.sum()
    mean = (xy * W[:, None]).sum(axis=0)

    # Two colour families, split on the principal axis of the weighted cloud. These plates are
    # built from two well-separated hue groups, so a projection split is enough and avoids
    # seeding randomness.
    cen = xy - mean
    cov = (cen * W[:, None]).T @ cen
    evals, evecs = np.linalg.eigh(cov)
    pc = evecs[:, int(np.argmax(evals))]
    proj = cen @ pc
    lo, hi = proj < 0, proj >= 0
    if W[lo].sum() < min_family_frac or W[hi].sum() < min_family_frac:
        return {"error": "dots do not split into two populations (one side is %.1f%% of area)"
                         % (100 * min(W[lo].sum(), W[hi].sum()))}
    c_lo = (xy[lo] * W[lo, None]).sum(axis=0) / W[lo].sum()
    c_hi = (xy[hi] * W[hi, None]).sum(axis=0) / W[hi].sum()

    dev_centroid = angle_to_confusion(mean, c_hi - c_lo, axis)
    dev_pca = angle_to_confusion(mean, pc, axis)

    def rgbmean(m):
        return [int(round(v)) for v in (rgb[m] * W[m, None]).sum(axis=0) / W[m].sum()]

    return {
        "axis": axis,
        "deviation_centroid_deg": round(dev_centroid, 1),
        "deviation_pca_deg": round(dev_pca, 1),
        "verdict": "on axis" if dev_centroid <= WARN_DEG else "OFF AXIS",
        "n_chromatic_dots": int(len(rgb)),
        "n_paper_dots": n_paper,
        "n_distinct_colours": int(len({tuple(map(int, r)) for r in rgb})),
        "family_a_rgb": rgbmean(lo),
        "family_b_rgb": rgbmean(hi),
        "family_a_area_frac": round(float(W[lo].sum()), 3),
        "mean_xy": [round(float(v), 4) for v in mean],
    }


def measure_svg(path, axes):
    txt = open(path, encoding="utf-8", errors="replace").read()
    dots = parse_elements(txt, parse_style_fills(txt))
    out = {"file": os.path.basename(path), "n_elements": len(dots)}
    for ax in axes:
        out[ax] = measure_dots(dots, ax)
    return out


# ---------------------------------------------------------------- control

PALETTES = {
    "rg":     ({"hMin": 96, "hMax": 145, "sMin": 40, "sMax": 60, "lMin": 50, "lMax": 68},
               {"hMin": 15, "hMax": 44, "sMin": 46, "sMax": 68, "lMin": 50, "lMax": 68},
               ["protan", "deutan"]),
    "tritan": ({"hMin": 175, "hMax": 200, "sMin": 50, "sMax": 72, "lMin": 52, "lMax": 68},
               {"hMin": 115, "hMax": 135, "sMin": 50, "sMax": 72, "lMin": 52, "lMax": 68},
               ["tritan"]),
    "tritan_pre_fix": ({"hMin": 205, "hMax": 240, "sMin": 50, "sMax": 72, "lMin": 52, "lMax": 68},
                       {"hMin": 328, "hMax": 352, "sMin": 50, "sMax": 72, "lMin": 52, "lMax": 68},
                       ["tritan"]),
}


def write_control_svg(fg, bg, path, n=600, seed=3):
    import random
    rnd = random.Random(seed)
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">']
    for i in range(n):
        spec = fg if i % 4 == 0 else bg           # figure ~25% of dots, as on a real plate
        h = rnd.uniform(spec["hMin"], spec["hMax"])
        s = rnd.uniform(spec["sMin"], spec["sMax"])
        l = rnd.uniform(spec["lMin"], spec["lMax"])
        r, g, b = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
        parts.append('<circle cx="%.1f" cy="%.1f" r="6" fill="#%02X%02X%02X"/>'
                     % (rnd.uniform(0, 400), rnd.uniform(0, 400),
                        int(r * 255), int(g * 255), int(b * 255)))
    parts.append("</svg>")
    open(path, "w", encoding="utf-8").write("".join(parts))
    return path


def self_test(tmpdir="."):
    """Reproduce the known deviations of our own palettes THROUGH the SVG path.

    The raster version of this control passed while sharing a false assumption with the method
    it was checking - both assumed two tight colour populations. This control cannot catch that
    class of error either; what it does check is that SVG parsing, cascade resolution, area
    weighting and the Dain-form metric all agree with the independently computed declared-range
    numbers, and that a palette known to be off axis still reads off axis.
    """
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from plate_colorimetry import measure_declared

    print("Control: SVG path vs the declared-range Dain-form value, computed not hardcoded\n")
    print("  %-16s %-8s %9s %9s %9s %7s" % ("palette", "axis", "expected", "centroid", "pca", "delta"))
    ok = True
    worst = 0.0
    for name, (fg, bg, axes) in PALETTES.items():
        p = write_control_svg(fg, bg, os.path.join(tmpdir, "ctrl_%s.svg" % name))
        res = measure_svg(p, axes)
        expect = [measure_declared(fg, bg, ax, anchor="mean") for ax in axes]
        for ax, exp in zip(axes, expect):
            r = res[ax]
            if "error" in r:
                print("  %-16s %-8s %9.1f %9s %9s %7s  %s"
                      % (name, ax, exp, "ERR", "-", "-", r["error"]))
                ok = False
                continue
            d = abs(r["deviation_centroid_deg"] - exp)
            worst = max(worst, d)
            print("  %-16s %-8s %9.1f %9.1f %9.1f %7.1f"
                  % (name, ax, exp, r["deviation_centroid_deg"], r["deviation_pca_deg"], d))
    print()
    if worst > 6.0:
        print("  FAIL: SVG path disagrees with declared-range values by up to %.1f deg" % worst)
        ok = False
    else:
        print("  PASS: agrees within %.1f deg" % worst)
    pre = measure_svg(os.path.join(tmpdir, "ctrl_tritan_pre_fix.svg"), ["tritan"])["tritan"]
    if pre.get("deviation_centroid_deg", 0) <= WARN_DEG:
        print("  FAIL: known-broken palette read as on axis - the check cannot detect the defect")
        ok = False
    else:
        print("  PASS: known-broken palette still OFF AXIS at %.1f deg" % pre["deviation_centroid_deg"])
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--svg", nargs="*", help="svg files or globs")
    ap.add_argument("--axis", nargs="*", default=["protan", "deutan"], choices=sorted(COPUNCTAL))
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--json")
    a = ap.parse_args()

    if a.self_test:
        return 0 if self_test() else 1
    if not a.svg:
        ap.error("--svg is required unless --self-test")

    files = []
    for pat in a.svg:
        files += sorted(glob.glob(pat)) or ([pat] if os.path.exists(pat) else [])
    rows = []
    hdr = "  %-34s %6s %5s" % ("file", "dots", "cols")
    for ax in a.axis:
        hdr += " %9s" % ax
    print(hdr)
    for f in files:
        r = measure_svg(f, a.axis)
        first = r.get(a.axis[0], {})
        line = "  %-34s %6s %5s" % (r["file"][:34],
                                    first.get("n_chromatic_dots", "-"),
                                    first.get("n_distinct_colours", "-"))
        for ax in a.axis:
            d = r.get(ax, {})
            line += " %9s" % (("%.1f" % d["deviation_centroid_deg"]) if "deviation_centroid_deg" in d else "err")
        note = first.get("error", "")
        print(line + ("   " + note[:40] if note else ""))
        rows.append(r)
    if a.json:
        json.dump(rows, open(a.json, "w"), indent=1)
        print("\n  wrote %s" % a.json)
    return 0


if __name__ == "__main__":
    sys.exit(main())
