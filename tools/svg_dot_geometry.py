#!/usr/bin/env python3
"""Recover per-dot POSITION, radius and colour from an SVG pseudoisochromatic plate.

    python tools/svg_dot_geometry.py --svg plate.svg --check

Why position matters. tools/audit_delivered_plates.py measures a plate from its declared figure
and ground colours, and on a multi-colour plate that is not enough: three defensible ways of
reducing the plate to one deviation disagree by up to 50 degrees, because a real plate holds
well-aligned and badly-aligned colour pairs at the same time. On ZEISS plate 2, #eb4825 against
the ground reads 7 to 10 degrees while #928237 against the same ground reads 63 to 65 - and
#928237 is a figure colour there but a ground colour on plate 3.

Which pairs an observer actually has to discriminate is decided by which figure dots sit next to
which ground dots. That is spatial, so the colours alone cannot answer it. This module extracts
the geometry so local figure/ground pairs can be formed.

Plates are drawn as one <path> per dot: a start point, then two elliptical arcs closing the
circle. Recovering the centre needs the SVG endpoint-to-centre arc conversion (SVG 1.1 F.6.5),
which is exact for these shapes since rx equals ry.

The conversion validates itself, which is the point of --check: if it were wrong, dots would
overlap each other or fall outside the plate disc. Both are checked, so a silent geometry error
cannot pass as a measurement.
"""
import argparse
import json
import math
import os
import re
import sys

import numpy as np

NUM = r"[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?"
_S = r"[\s,]*"

# An elliptical arc's two flags are SINGLE DIGITS and the grammar allows them with no separator
# from each other or from what follows, so "0 11-8.233 8.383" is rotation 0, large-arc 1, sweep 1,
# dx -8.233, dy 8.383. Tokenising the parameter list as generic numbers reads "11" as eleven and
# then consumes dx as a flag, which silently corrupts every centre. Arcs get their own pattern.
_ARC_PARAMS = re.compile(
    r"(%s)%s(%s)%s(%s)%s([01])%s([01])%s(%s)%s(%s)"
    % (NUM, _S, NUM, _S, NUM, _S, _S, _S, NUM, _S, NUM))
_PAIR = re.compile(r"(%s)%s(%s)" % (NUM, _S, NUM))
_CMD = re.compile(r"[MmAaLlHhVvCcSsQqTtZz]")


def arc_centre(x1, y1, x2, y2, rx, ry, phi_deg, fa, fs):
    """SVG 1.1 F.6.5 endpoint-to-centre parameterisation. Returns (cx, cy, rx, ry)."""
    phi = math.radians(phi_deg)
    cp, sp = math.cos(phi), math.sin(phi)
    dx2, dy2 = (x1 - x2) / 2.0, (y1 - y2) / 2.0
    x1p = cp * dx2 + sp * dy2
    y1p = -sp * dx2 + cp * dy2
    rx, ry = abs(rx), abs(ry)
    lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
    if lam > 1.0:
        s = math.sqrt(lam)
        rx, ry = rx * s, ry * s
    num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
    den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
    coef = math.sqrt(max(0.0, num / den)) if den else 0.0
    if fa == fs:
        coef = -coef
    cxp = coef * (rx * y1p / ry)
    cyp = coef * (-(ry * x1p / rx))
    cx = cp * cxp - sp * cyp + (x1 + x2) / 2.0
    cy = sp * cxp + cp * cyp + (y1 + y2) / 2.0
    return cx, cy, rx, ry


def dots_from_path(d):
    """-> list of (cx, cy, r). One entry per arc; a dot drawn as two arcs yields two.

    Scanned command by command with a pattern per command rather than a generic number stream,
    because arc flags cannot be tokenised as numbers (see _ARC_PARAMS).
    """
    out = []
    i, n = 0, len(d)
    cur = (0.0, 0.0)
    start = (0.0, 0.0)
    cmd = None
    while i < n:
        if d[i] in " ,\t\r\n":
            i += 1
            continue
        if _CMD.match(d[i]):
            cmd = d[i]
            i += 1
            if cmd in "Zz":
                cur = start
                cmd = None
            continue
        if cmd is None:
            i += 1
            continue
        if cmd in "Aa":
            m = _ARC_PARAMS.match(d, i)
            if not m:
                i += 1
                continue
            rx, ry, rot = float(m.group(1)), float(m.group(2)), float(m.group(3))
            fa, fs = int(m.group(4)), int(m.group(5))
            x, y = float(m.group(6)), float(m.group(7))
            i = m.end()
            nxt = (cur[0] + x, cur[1] + y) if cmd == "a" else (x, y)
            cx, cy, rrx, rry = arc_centre(cur[0], cur[1], nxt[0], nxt[1], rx, ry, rot, fa, fs)
            out.append((cx, cy, (rrx + rry) / 2.0))
            cur = nxt
        elif cmd in "MmLl":
            m = _PAIR.match(d, i)
            if not m:
                i += 1
                continue
            x, y = float(m.group(1)), float(m.group(2))
            i = m.end()
            cur = (cur[0] + x, cur[1] + y) if cmd in "ml" else (x, y)
            if cmd in "Mm":
                start = cur
                cmd = "l" if cmd == "m" else "L"   # implicit lineto after a moveto
        else:
            # Any other command would mean these are not plain dots; bail rather than guess.
            return []
    return out


def parse_style_fills(svg_text):
    out = {}
    for block in re.findall(r"<style[^>]*>(.*?)</style>", svg_text, re.S):
        for sel, body in re.findall(r"([^{}]+)\{([^{}]*)\}", block):
            m = re.search(r"fill\s*:\s*(#[0-9a-fA-F]{3,8})", body, re.I)
            if not m:
                continue
            for s in sel.split(","):
                s = s.strip()
                if s.startswith("."):
                    out[s[1:]] = m.group(1)
    return out


def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def extract(svg_path):
    """-> list of dicts: x, y, r, hex, rgb, cls. One per dot."""
    t = open(svg_path, encoding="utf-8", errors="replace").read()
    fills = parse_style_fills(t)
    dots = []
    for m in re.finditer(r"<(?:path|circle|ellipse)\b([^>]*)>", t):
        attrs = m.group(1)
        fm = re.search(r'fill\s*=\s*["\'](#[0-9a-fA-F]{3,8})["\']', attrs)
        cls = None
        if fm:
            hx = fm.group(1)
        else:
            cm = re.search(r'class\s*=\s*["\']([^"\']+)["\']', attrs)
            hx = None
            if cm:
                for c in cm.group(1).split():
                    if c in fills:
                        hx, cls = fills[c], c
                        break
        if not hx:
            continue
        cxm = re.search(r'\bcx\s*=\s*["\'](%s)["\']' % NUM, attrs)
        if cxm:
            cy = re.search(r'\bcy\s*=\s*["\'](%s)["\']' % NUM, attrs)
            rr = re.search(r'\br\s*=\s*["\'](%s)["\']' % NUM, attrs)
            if cy and rr:
                dots.append({"x": float(cxm.group(1)), "y": float(cy.group(1)),
                             "r": float(rr.group(1)), "hex": hx.lower(),
                             "rgb": hex_to_rgb(hx), "cls": cls})
            continue
        dm = re.search(r'\bd\s*=\s*["\']([^"\']+)["\']', attrs)
        if not dm:
            continue
        circles = dots_from_path(dm.group(1))
        if not circles:
            continue
        # A dot is closed with two arcs on the same circle; average them for the centre.
        cx = sum(c[0] for c in circles) / len(circles)
        cy = sum(c[1] for c in circles) / len(circles)
        r = sum(c[2] for c in circles) / len(circles)
        dots.append({"x": cx, "y": cy, "r": r, "hex": hx.lower(),
                     "rgb": hex_to_rgb(hx), "cls": cls})
    return dots


def drop_backdrop(dots, factor=4.0):
    """Remove the plate disc, which is drawn as one big filled circle behind the dots.

    rgblind draws a 195-unit backdrop in a 400-unit viewBox. Counted as a dot it overlaps every
    real dot and pushes the fill fraction above 1. Anything more than `factor` times the median
    radius is not a dot.
    """
    if len(dots) < 5:
        return dots
    med = float(np.median([d["r"] for d in dots]))
    return [d for d in dots if d["r"] <= factor * med]


def viewbox(svg_path):
    t = open(svg_path, encoding="utf-8", errors="replace").read()
    m = re.search(r'viewBox="(%s)\s+(%s)\s+(%s)\s+(%s)"' % (NUM, NUM, NUM, NUM), t)
    if m:
        return tuple(float(m.group(i)) for i in (1, 2, 3, 4))
    w = re.search(r'width="(%s)"' % NUM, t)
    h = re.search(r'height="(%s)"' % NUM, t)
    return (0.0, 0.0, float(w.group(1)), float(h.group(1))) if w and h else (0, 0, 300, 300)


def check(svg_path, verbose=True):
    """Geometry must be self-consistent: dots inside the plate, and not overlapping.

    A wrong arc-centre calculation shows up as overlap or as dots outside the disc, so this is
    the control that stops a silent geometry error from being reported as a measurement.
    """
    dots = drop_backdrop(extract(svg_path))
    if not dots:
        print("  %s: NO DOTS" % os.path.basename(svg_path))
        return False
    vb = viewbox(svg_path)
    cx, cy = vb[0] + vb[2] / 2.0, vb[1] + vb[3] / 2.0
    R = min(vb[2], vb[3]) / 2.0
    P = np.array([[d["x"], d["y"]] for d in dots])
    Rr = np.array([d["r"] for d in dots])

    # Dots at the rim are commonly clipped by the plate edge, so allow a little slop.
    outside = int(((np.hypot(P[:, 0] - cx, P[:, 1] - cy) + Rr) > R * 1.06).sum())

    # Overlap is the discriminating test, but the threshold has to scale with dot size. A wrong
    # arc centre puts a dot tens of pixels from where it belongs and produces gross overlap - the
    # backdrop-circle bug showed -385. Authored rounding in hand-built SVG produces well under a
    # pixel. Flag an overlap only when it exceeds a quarter of the smaller dot's radius.
    d2 = ((P[:, None, :] - P[None, :, :]) ** 2).sum(-1)
    np.fill_diagonal(d2, np.inf)
    dist = np.sqrt(d2)
    rmin = np.minimum(Rr[:, None], Rr[None, :])
    overlap = dist - (Rr[:, None] + Rr[None, :])
    worst = float(overlap.min())
    n_overlap = int((overlap < -0.25 * rmin).sum() // 2)

    frac_area = float((math.pi * (Rr ** 2)).sum() / (math.pi * R * R))
    ok = outside == 0 and n_overlap == 0 and 0.30 < frac_area < 1.05
    if verbose:
        print("  %-34s n=%-4d r=%.2f-%.2f  outside=%-3d overlaps=%-3d worst_gap=%+.2f  fill=%.2f  %s"
              % (os.path.basename(svg_path), len(dots), Rr.min(), Rr.max(),
                 outside, n_overlap, worst, frac_area, "OK" if ok else "FAIL"))
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--svg", nargs="+", required=True)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--json")
    a = ap.parse_args()
    import glob
    files = []
    for p in a.svg:
        files += sorted(glob.glob(p)) or ([p] if os.path.exists(p) else [])
    if a.check:
        allok = True
        for f in files:
            allok &= check(f)
        print("\n  %s" % ("all plates geometrically consistent" if allok
                          else "GEOMETRY FAILED - centres are wrong, do not measure with these"))
        return 0 if allok else 1
    out = {os.path.basename(f): extract(f) for f in files}
    if a.json:
        json.dump(out, open(a.json, "w"), indent=1)
        print("wrote %s" % a.json)
    else:
        for k, v in out.items():
            print("%s: %d dots" % (k, len(v)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
