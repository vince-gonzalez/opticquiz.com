#!/usr/bin/env python3
"""Confusion-axis deviation from LOCAL figure/ground pairs, using dot positions.

    python tools/local_pairing.py
    python tools/local_pairing.py --json research/plate-audit/local-pairing.json

The problem this exists to solve. Reducing a multi-colour pseudoisochromatic plate to one
deviation by pooling all its figure colours against all its ground colours is not well defined:
three defensible reductions of the same ZEISS plate disagree by up to 50 degrees, because a real
plate carries well-aligned and badly-aligned colour pairs simultaneously. On plate 2, #eb4825
against the ground reads 7 to 10 degrees while #928237 against the same ground reads 63 to 65 -
and #928237 is a figure colour there but a ground colour on plate 3.

Which pairs matter is not a property of the colour lists. It is decided by which figure dots
physically border which ground dots, because that is the discrimination the observer is actually
asked to make. A figure dot buried inside the numeral is never compared to anything; a figure dot
on the numeral's edge is compared to the specific ground dots touching it.

So: take every figure dot that borders the ground, pair it with the ground dots that border it,
and report the DISTRIBUTION of those local deviations rather than one number. A plate is legible
to a deficient observer along a confusion line where those local pairs are well aligned, and
readable where they are not.

Border is defined by proximity in units of dot radius, not absolute pixels, so plates drawn at
different scales are comparable.

Requires per-dot geometry from tools/svg_dot_geometry.py, whose --check must pass first: recovered
dot counts match the counts declared in the markup exactly on all eleven ZEISS plates, which is
what licenses using the positions at all.
"""
import argparse
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svg_dot_geometry import extract, drop_backdrop          # noqa: E402
from svg_plate_colorimetry import srgb_to_xy, angle_to_confusion, COPUNCTAL  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "research", "plate-audit", "delivered-plates.json")
WARN_DEG = 25.0


def assign_groups(dots, figure_hexes, ground_hexes):
    """Tag each dot figure/ground by its declared fill. Returns (figure list, ground list)."""
    fig = {h.lower() for h in figure_hexes}
    gnd = {h.lower() for h in ground_hexes}
    F = [d for d in dots if d["hex"] in fig]
    G = [d for d in dots if d["hex"] in gnd]
    return F, G


def local_pairs(F, G, border_radii=2.2, max_neighbours=8):
    """Pair each border figure dot with the ground dots touching it.

    border_radii is in units of the summed radii of the two dots, so 2.2 means centres within
    2.2x (r_fig + r_gnd) - close enough that the two dots are visual neighbours rather than
    merely on the same plate.
    """
    if not F or not G:
        return []
    Fp = np.array([[d["x"], d["y"]] for d in F])
    Fr = np.array([d["r"] for d in F])
    Gp = np.array([[d["x"], d["y"]] for d in G])
    Gr = np.array([d["r"] for d in G])
    try:
        from scipy.spatial import cKDTree
        tree = cKDTree(Gp)
        use_tree = True
    except Exception:
        use_tree = False

    pairs = []
    for i in range(len(F)):
        if use_tree:
            lim = border_radii * (Fr[i] + Gr.max())
            idx = tree.query_ball_point(Fp[i], lim) if hasattr(tree, "query_ball_point") \
                else tree.query_ball_point(Fp[i], lim)
        else:
            idx = list(range(len(G)))
        cand = []
        for j in idx:
            dist = float(np.hypot(*(Fp[i] - Gp[j])))
            thresh = border_radii * (Fr[i] + Gr[j])
            if dist <= thresh:
                cand.append((dist, j))
        if not cand:
            continue
        cand.sort()
        for dist, j in cand[:max_neighbours]:
            # Weight by the smaller dot's area: a pair is only as visible as its weaker member.
            w = math.pi * min(Fr[i], Gr[j]) ** 2
            pairs.append((i, j, dist, w))
    return pairs


def measure_local(F, G, pairs, axis):
    if not pairs:
        return None
    fx = srgb_to_xy(np.array([F[i]["rgb"] for i, _, _, _ in pairs], dtype=np.float64))
    gx = srgb_to_xy(np.array([G[j]["rgb"] for _, j, _, _ in pairs], dtype=np.float64))
    w = np.array([p[3] for p in pairs], dtype=np.float64)
    devs = np.array([angle_to_confusion((fx[k] + gx[k]) / 2.0, gx[k] - fx[k], axis)
                     for k in range(len(pairs))])
    sep = np.hypot(gx[:, 0] - fx[:, 0], gx[:, 1] - fx[:, 1])
    good = devs == devs
    devs, w, sep = devs[good], w[good], sep[good]
    if not len(devs):
        return None
    order = np.argsort(devs)
    ds, ws = devs[order], w[order]
    cw = np.cumsum(ws) / ws.sum()

    def q(p):
        return float(ds[int(np.searchsorted(cw, p))])

    return {"n_pairs": int(len(devs)),
            "n_border_figure_dots": len({p[0] for p in pairs}),
            "median_deg": round(q(0.5), 1), "q25_deg": round(q(0.25), 1),
            "q75_deg": round(q(0.75), 1),
            "frac_aligned": round(float(ws[ds <= WARN_DEG].sum() / ws.sum()), 3),
            "median_xy_sep": round(float(np.median(sep)), 4)}


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--svg-dir", default=".")
    ap.add_argument("--data", default=DATA)
    ap.add_argument("--border-radii", type=float, default=2.2)
    ap.add_argument("--json")
    a = ap.parse_args()

    d = json.load(open(a.data, encoding="utf-8"))
    glob_ = __import__("glob")
    rows = []
    print("Local figure/ground pairs, ZEISS. Dain form per pair, distribution not a single value.")
    print("A pair is 'aligned' at <= %.0f deg. frac_aligned is the area-weighted share of border" % WARN_DEG)
    print("pairs that collapse for the deficiency; the rest stay visible to it.\n")
    print("  %-6s %-15s %-7s %6s %6s   %5s %5s %5s  %5s"
          % ("plate", "type", "axis", "pairs", "border", "q25", "med", "q75", "align"))
    for p in d["zeiss"]["plates"]:
        cands = glob_.glob(os.path.join(a.svg_dir, "*ishihara_%d.svg" % p["no"]))
        if not cands:
            print("  %-6s  (svg not found)" % p["no"])
            continue
        dots = drop_backdrop(extract(cands[0]))
        F, G = assign_groups(dots, [h for h, _ in p["figure"]], [h for h, _ in p["ground"]])
        if not F or not G:
            print("  %-6s  (could not assign groups: %d figure, %d ground)" % (p["no"], len(F), len(G)))
            continue
        pr = local_pairs(F, G, border_radii=a.border_radii)
        rec = {"plate": p["no"], "type": p["type"], "answer": p["answer"],
               "n_figure": len(F), "n_ground": len(G), "axes": {}}
        for ax in ("protan", "deutan"):
            m = measure_local(F, G, pr, ax)
            if not m:
                continue
            rec["axes"][ax] = m
            print("  %-6s %-15s %-7s %6d %6d   %5.1f %5.1f %5.1f  %4.0f%%"
                  % (p["no"], p["type"], ax, m["n_pairs"], m["n_border_figure_dots"],
                     m["q25_deg"], m["median_deg"], m["q75_deg"], 100 * m["frac_aligned"]))
        rows.append(rec)

    print("\n  Read frac_aligned as the answer the global reductions could not give: what SHARE of")
    print("  the discriminations a reader actually makes collapses for that deficiency.")
    if a.json:
        os.makedirs(os.path.dirname(a.json), exist_ok=True)
        json.dump({"border_radii": a.border_radii, "warn_deg": WARN_DEG, "rows": rows},
                  open(a.json, "w"), indent=1)
        print("\n  wrote %s" % a.json)
    return 0


if __name__ == "__main__":
    sys.exit(main())
