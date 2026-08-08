#!/usr/bin/env python3
"""Audit the plates public web colour-vision tests actually deliver, against the confusion lines.

    python tools/audit_delivered_plates.py
    python tools/audit_delivered_plates.py --json research/plate-audit/results.json

Reads research/plate-audit/delivered-plates.json, where each plate's figure and ground dot
colours are recorded as the site itself declares them - SVG classes for ZEISS, `background` and
`foreground` keys in the bundle for colorblind.io. Nothing is inferred, so the measurement does
not have to guess the thing it is testing.

METRIC: Dain (2004), Visual Neuroscience 21:437-443. Draw the confusion line for the deficiency
through the MEAN chromaticity of the confusable set, then compare the direction along which the
set is actually separated. Reported as degrees; 0 means the separation lies along the confusion
line and the deficiency collapses it, 90 means the separation is orthogonal and the deficiency
sees the figure as well as anyone.

Because figure and ground are DECLARED here, the separation direction is the line joining the
two group centroids, weighted by dot count - which is what Dain measures. The regression form is
reported alongside as a check; it does not depend on the grouping at all.

WHICH PLATES THIS CRITERION APPLIES TO. Not all of them. An Ishihara-type series mixes designs
and only two of them are meant to collapse for a red-green observer:

  transformation  normals read one digit, CVD reads a different one       criterion applies
  vanishing       normals read it, CVD reads nothing                      criterion applies
  demonstration   readable by every vision type, by design                excluded
  hidden digit    CVD reads it, normals read nothing - inverted           excluded
  diagnostic      protan vs deutan classification, different construction excluded
  tracing         a winding line, not a digit                             excluded

Plate type comes from each site's own answer key rather than from a plate-number range, because
the ranges are edition-dependent and at least one site's key contradicts the commonly quoted
composition. A digit plus a confusion digit is a transformation plate; a digit with no confusion
digit is a vanishing plate; an answer of 'nothing' with a confusion digit is a hidden-digit plate.

UNCERTAINTY: +/- 3.6 degrees, established in tools/plate_dots.py --self-test against ground truth
that pipeline did not produce. Differences smaller than that are not differences.
"""
import argparse
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svg_plate_colorimetry import COPUNCTAL, hex_to_rgb, srgb_to_xy, angle_to_confusion  # noqa

UNCERTAINTY_DEG = 3.6
CRITERION_APPLIES = ("transformation", "vanishing")
DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "research", "plate-audit", "delivered-plates.json")


def weighted_xy(pairs):
    """[(hex, weight), ...] -> (mean xy, total weight). Averaging happens in xy, never in RGB:
    the transfer function and the xy division are both nonlinear."""
    rgb, w = [], []
    for h, n in pairs:
        c = hex_to_rgb(h)
        if c is None:
            continue
        rgb.append(c)
        w.append(float(n))
    if not rgb:
        return None, 0.0
    xy = srgb_to_xy(np.array(rgb, dtype=np.float64))
    W = np.array(w)
    return (xy * (W / W.sum())[:, None]).sum(axis=0), float(W.sum())


def measure_declared_groups(figure, ground, axis):
    """Dain-form deviation for a plate whose figure and ground groups are declared."""
    f_xy, f_w = weighted_xy(figure)
    g_xy, g_w = weighted_xy(ground)
    if f_xy is None or g_xy is None:
        return None
    total = f_w + g_w
    mean = (f_xy * f_w + g_xy * g_w) / total
    dev = angle_to_confusion(mean, g_xy - f_xy, axis)

    allpts = figure + ground
    rgb = np.array([hex_to_rgb(h) for h, _ in allpts], dtype=np.float64)
    W = np.array([float(n) for _, n in allpts])
    xy = srgb_to_xy(rgb)
    Wn = W / W.sum()
    cen = xy - (xy * Wn[:, None]).sum(axis=0)
    cov = (cen * Wn[:, None]).T @ cen
    evals, evecs = np.linalg.eigh(cov)
    pc = evecs[:, int(np.argmax(evals))]
    dev_pca = angle_to_confusion(mean, pc, axis)

    # Chromatic separation between the groups, as a plain distance in xy. Alignment says the
    # separation points the right way; it says nothing about whether there is enough of it.
    sep = float(math.hypot(*(g_xy - f_xy)))
    return {"deviation_deg": round(dev, 1), "deviation_pca_deg": round(dev_pca, 1),
            "xy_separation": round(sep, 4), "figure_dots": int(f_w), "ground_dots": int(g_w),
            "figure_colours": len(figure), "ground_colours": len(ground)}


def rows_for_zeiss(d):
    out = []
    for p in d["zeiss"]["plates"]:
        axes = ["tritan"] if p.get("axis") == "tritan" else ["protan", "deutan"]
        rec = {"site": "ZEISS", "plate": str(p["no"]), "type": p["type"],
               "answer": p["answer"], "dev": {}}
        for ax in axes:
            m = measure_declared_groups(p["figure"], p["ground"], ax)
            if m:
                rec["dev"][ax] = m["deviation_deg"]
                rec["pca"] = rec.get("pca", {})
                rec["pca"][ax] = m["deviation_pca_deg"]
                rec["sep"] = m["xy_separation"]
                rec["colours"] = m["figure_colours"] + m["ground_colours"]
                rec["dots"] = m["figure_dots"] + m["ground_dots"]
        out.append(rec)
    return out


def rows_for_colorblind_io(d):
    cb = d["colorblind_io"]
    pal = cb["palettes"]
    out = []
    for key, plates in (("plate_map_rg", "rg"), ("plate_map_tritan", "tritan")):
        for p in cb[key]:
            P = pal[p["palette"]]
            fig = [(h, 1) for h in P["foreground"]]
            gnd = [(h, 1) for h in P["background"]]
            axes = ["tritan"] if P["axis"] == "tritan" else ["protan", "deutan"]
            # Their own vocabulary: plate 1 of the red-green set is purpose 'demonstration', the
            # rest are 'screening'. A screening plate that shows a digit to normals and offers
            # distractors is a transformation plate in the classical taxonomy.
            typ = "demonstration" if p.get("purpose") == "demonstration" else "transformation"
            rec = {"site": "colorblind.io", "plate": str(p["no"]), "type": typ,
                   "answer": p["digit"], "dev": {}, "pca": {}, "palette": p["palette"]}
            for ax in axes:
                m = measure_declared_groups(fig, gnd, ax)
                if m:
                    rec["dev"][ax] = m["deviation_deg"]
                    rec["pca"][ax] = m["deviation_pca_deg"]
                    rec["sep"] = m["xy_separation"]
                    rec["colours"] = 24
                    rec["dots"] = None
            out.append(rec)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default=DATA)
    ap.add_argument("--json")
    a = ap.parse_args()
    d = json.load(open(a.data, encoding="utf-8"))

    rows = rows_for_zeiss(d) + rows_for_colorblind_io(d)
    applies = [r for r in rows if r["type"] in CRITERION_APPLIES]
    excluded = [r for r in rows if r["type"] not in CRITERION_APPLIES]

    print("Deviation from the confusion axis the plate claims, in degrees.")
    print("Figure and ground as the site declares them. Dain (2004) form. Uncertainty +/- %.1f deg.\n"
          % UNCERTAINTY_DEG)
    print("A. PLATES WHERE THE CRITERION APPLIES (transformation, vanishing)\n")
    print("  %-13s %-6s %-15s %-8s %7s %7s %7s %8s"
          % ("site", "plate", "type", "answer", "protan", "deutan", "tritan", "xy_sep"))
    for r in applies:
        dv = r["dev"]
        print("  %-13s %-6s %-15s %-8s %7s %7s %7s %8s"
              % (r["site"], r["plate"], r["type"], r["answer"],
                 dv.get("protan", "-"), dv.get("deutan", "-"), dv.get("tritan", "-"),
                 r.get("sep", "-")))

    print("\nB. EXCLUDED - a different design, so this criterion does not judge them\n")
    print("  %-13s %-6s %-15s %-8s %7s %7s %7s" % ("site", "plate", "type", "answer",
                                                   "protan", "deutan", "tritan"))
    for r in excluded:
        dv = r["dev"]
        print("  %-13s %-6s %-15s %-8s %7s %7s %7s"
              % (r["site"], r["plate"], r["type"], r["answer"],
                 dv.get("protan", "-"), dv.get("deutan", "-"), dv.get("tritan", "-")))

    print("\nC. SUMMARY, criterion-applicable plates only\n")
    for site in sorted({r["site"] for r in applies}):
        for ax in ("protan", "deutan", "tritan"):
            vals = [r["dev"][ax] for r in applies if r["site"] == site and ax in r["dev"]]
            if not vals:
                continue
            print("  %-13s %-7s n=%-3d min %5.1f  median %5.1f  max %5.1f"
                  % (site, ax, len(vals), min(vals), float(np.median(vals)), max(vals)))

    print("\n  Reminder: alignment is necessary, not sufficient. xy_sep is the chromatic distance")
    print("  between the groups - a plate can point the right way and still separate too little")
    print("  or too much. Neither number alone ranks a test.")

    if a.json:
        os.makedirs(os.path.dirname(a.json), exist_ok=True)
        json.dump({"uncertainty_deg": UNCERTAINTY_DEG, "rows": rows},
                  open(a.json, "w"), indent=1)
        print("\n  wrote %s" % a.json)
    return 0


if __name__ == "__main__":
    sys.exit(main())
