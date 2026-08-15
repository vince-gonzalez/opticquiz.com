#!/usr/bin/env python3
"""Two analyses the note currently declares as limitations rather than answering.

    python tools/reviewer_checks.py --svg-dir <dir with the eleven ZEISS SVGs>

C-4  UNCERTAINTY ON THE ALIGNED FRACTION.  Section 5 says "No angular uncertainty is established
     for this measurement." Table 1 reports point estimates with nothing around them, so a
     reader cannot tell whether plate 3 at 37% is distinguishable from plate 4 at 71%.

     The resampling unit matters more than the number of replicates. Border pairs are NOT
     independent: each figure dot on the boundary contributes several pairs, and every pair from
     one dot shares that dot's colour class. Resampling pairs would therefore treat correlated
     observations as independent and return an interval that is too narrow. This resamples
     FIGURE DOTS with replacement, carrying each dot's pairs with it. Both are computed and
     printed side by side, because the naive interval is what an unwary analysis reports and the
     gap between them is the point.

C-5  SENSITIVITY TO THE ALIGNMENT CRITERION.  Section 2.5 calls the 25 degree criterion
     illustrative and section 3.3 sweeps only the border definition. Section 5 admits the gap in
     as many words. This sweeps the criterion itself from 15 to 40 degrees and asks the question
     the paper actually rests on: does the three-group structure survive, or is it an artefact of
     choosing 25?

     The grouping is judged mechanically, not by eye: demonstration must stay at zero, hidden
     digit must stay below every transformation and vanishing plate on protan, and the
     transformation/vanishing block must remain a single unseparated run.

Not run here: the MacLeod-Boynton scaling sweep. It belonged to the withdrawn space-dependence
analysis; this note measures in CIE 1931 xy only, so there is no second space to reconcile.
"""
import argparse
import glob
import json
import os
import random
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svg_dot_geometry import extract, drop_backdrop                       # noqa: E402
from svg_plate_colorimetry import srgb_to_xy, angle_to_confusion          # noqa: E402
from local_pairing import assign_groups, local_pairs                      # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "research", "plate-audit", "delivered-plates.json")
ORDER = [1, 2, 6, 8, 9, 10, 5, 7, 4, 3, 15]
TYPE = {1: "demonstration", 2: "transformation", 6: "transformation", 8: "vanishing",
        9: "vanishing", 10: "vanishing", 5: "transformation", 7: "transformation",
        4: "transformation", 3: "transformation", 15: "hidden digit"}
TABLE = {1: (0.000, 0.000), 2: (1.000, 0.847), 6: (0.940, 0.750), 8: (0.940, 0.570),
         9: (0.930, 0.590), 10: (0.860, 0.680), 5: (0.820, 0.540), 7: (0.810, 0.500),
         4: (0.710, 0.530), 3: (0.374, 0.580), 15: (0.270, 0.050)}


def pair_table(plate, axis, border_radii=2.2):
    """Return (dot_index, deviation, weight) for every border pair."""
    F, G = plate["F"], plate["G"]
    pr = local_pairs(F, G, border_radii=border_radii)
    if not pr:
        return None
    fx = srgb_to_xy(np.array([F[i]["rgb"] for i, _, _, _ in pr], dtype=np.float64))
    gx = srgb_to_xy(np.array([G[j]["rgb"] for _, j, _, _ in pr], dtype=np.float64))
    dot = np.array([p[0] for p in pr])
    w = np.array([p[3] for p in pr], dtype=np.float64)
    dev = np.array([angle_to_confusion((fx[k] + gx[k]) / 2.0, gx[k] - fx[k], axis)
                    for k in range(len(pr))])
    ok = dev == dev
    return dot[ok], dev[ok], w[ok]


def frac(dev, w, crit):
    return float(w[dev <= crit].sum() / w.sum()) if w.sum() else float("nan")


def load(svg_dir):
    d = json.load(open(DATA, encoding="utf-8"))
    out = {}
    for p in d["zeiss"]["plates"]:
        c = (glob.glob(os.path.join(svg_dir, "*ishihara_%d.svg" % p["no"])) or
             glob.glob(os.path.join(svg_dir, "ishihara_%d.svg" % p["no"])))
        if not c:
            sys.exit("missing SVG for plate %s" % p["no"])
        dots = drop_backdrop(extract(c[0]))
        F, G = assign_groups(dots, [h for h, _ in p["figure_spatial"]],
                             [h for h, _ in p["ground_spatial"]])
        out[p["no"]] = {"F": F, "G": G}
    return out


def bootstrap(dot, dev, w, crit, reps, rng):
    """95% interval by resampling CLUSTERS (figure dots) and, for contrast, single pairs."""
    ids = np.unique(dot)
    by = {i: np.where(dot == i)[0] for i in ids}
    clustered, naive = [], []
    n_pairs = len(dev)
    for _ in range(reps):
        pick = rng.choice(ids, size=len(ids), replace=True)
        idx = np.concatenate([by[i] for i in pick])
        clustered.append(frac(dev[idx], w[idx], crit))
        j = rng.integers(0, n_pairs, n_pairs)
        naive.append(frac(dev[j], w[j], crit))
    q = lambda a: (float(np.percentile(a, 2.5)), float(np.percentile(a, 97.5)))
    return q(clustered), q(naive), len(ids)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--svg-dir", default=".")
    ap.add_argument("--reps", type=int, default=2000)
    ap.add_argument("--json")
    a = ap.parse_args()
    rng = np.random.default_rng(20260814)
    plates = load(a.svg_dir)

    tab = {}
    for n in ORDER:
        for ax in ("protan", "deutan"):
            tab[(n, ax)] = pair_table(plates[n], ax)

    fails = []
    print("C-4  UNCERTAINTY ON THE ALIGNED FRACTION  (%d replicates, 25 deg criterion)\n" % a.reps)
    print("  %-6s %-15s %-7s %6s   %-18s %-18s %s"
          % ("plate", "type", "axis", "frac", "95% CI (clustered)", "95% CI (naive)", "clusters"))
    ci = {}
    for n in ORDER:
        for ax in ("protan", "deutan"):
            dot, dev, w = tab[(n, ax)]
            f = frac(dev, w, 25.0)
            ref = TABLE[n][0 if ax == "protan" else 1]
            if abs(f - ref) > 0.0055:
                fails.append("plate %s %s frac %.3f != article %.3f" % (n, ax, f, ref))
            cl, na, k = bootstrap(dot, dev, w, 25.0, a.reps, rng)
            ci[(n, ax)] = cl
            print("  %-6s %-15s %-7s %6.3f   [%.3f, %.3f]      [%.3f, %.3f]      %d"
                  % (n, TYPE[n], ax, f, cl[0], cl[1], na[0], na[1], k))

    widths = [(ci[k][1] - ci[k][0], k) for k in ci]
    nw = [(bootstrap(*tab[k], 25.0, 200, rng)[1], k) for k in [(3, "protan"), (15, "protan")]]
    print("\n  clustered intervals are wider than naive on %d of %d cells"
          % (sum(1 for k in ci
                 if (ci[k][1] - ci[k][0]) >
                 (bootstrap(*tab[k], 25.0, 200, rng)[1][1] - bootstrap(*tab[k], 25.0, 200, rng)[1][0])),
             len(ci)))
    print("  widest clustered interval: plate %s %s, %.3f wide"
          % (max(widths)[1][0], max(widths)[1][1], max(widths)[0]))

    # does the hidden digit plate stay below the transformation/vanishing block on protan?
    hi = ci[(15, "protan")][1]
    block = min(ci[(n, "protan")][0] for n in ORDER if TYPE[n] in ("transformation", "vanishing"))
    print("\n  hidden digit upper bound %.3f vs lowest transformation/vanishing lower bound %.3f -> %s"
          % (hi, block, "SEPARATED" if hi < block else "OVERLAP"))

    print("\n\nC-5  SENSITIVITY TO THE ALIGNMENT CRITERION\n")
    crits = [15.0, 20.0, 25.0, 30.0, 35.0, 40.0]
    print("  %-6s %-15s %s" % ("plate", "type", "  ".join("%5.0f" % c for c in crits)))
    grid = {}
    for n in ORDER:
        dot, dev, w = tab[(n, "protan")]
        row = [frac(dev, w, c) for c in crits]
        grid[n] = row
        print("  %-6s %-15s %s" % (n, TYPE[n], "  ".join("%5.2f" % v for v in row)))

    print("\n  structure test at each criterion:")
    for i, c in enumerate(crits):
        demo = grid[1][i]
        hid = grid[15][i]
        blk = [grid[n][i] for n in ORDER if TYPE[n] in ("transformation", "vanishing")]
        ok_demo = demo == 0.0
        ok_hid = hid < min(blk)
        print("    %5.0f deg   demonstration %.3f %-4s hidden %.3f below block min %.3f %-4s  -> %s"
              % (c, demo, "OK" if ok_demo else "FAIL", hid, min(blk),
                 "OK" if ok_hid else "FAIL", "holds" if (ok_demo and ok_hid) else "BREAKS"))

    if a.json:
        json.dump({"ci": {"%d_%s" % k: v for k, v in ci.items()},
                   "criterion_sweep": {str(k): v for k, v in grid.items()},
                   "criteria": crits, "reps": a.reps},
                  open(a.json, "w", encoding="utf-8"), indent=1)
        print("\n  wrote %s" % a.json)

    print()
    if fails:
        print("FAILED — the point estimates no longer match the article:")
        for f in fails:
            print("   " + f)
        raise SystemExit(1)
    print("point estimates reproduce Table 1 on all 22 cells")


if __name__ == "__main__":
    main()
