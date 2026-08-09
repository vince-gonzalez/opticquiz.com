#!/usr/bin/env python3
"""Recover which dots are figure and which are ground, without being told the answer.

    python tools/figure_recovery.py --validate          # against ZEISS, where truth is declared
    python tools/figure_recovery.py --image plate.png

Why this is needed. Local figure/ground pairing (tools/local_pairing.py) is the only defensible
way to measure a multi-colour plate, but it needs the assignment, and only SVG-delivered plates
declare it. Every fixed-image reproduction - which is most of the field - gives you pixels and
nothing else. Colour clustering cannot supply the assignment: a real plate uses many hues per
region, so k-means inertia in CIE xy keeps falling with every added cluster and never identifies
a figure.

The assignment is recoverable anyway, because a figure is a SHAPE. Partition the plate's dot
colours into two sets and look at where the dots land: the correct partition puts a spatially
contiguous numeral on one side, and every incorrect partition scatters its minority group across
the plate. So score each candidate partition by spatial coherence and take the best.

Coherence is measured on the dot adjacency graph as assortativity - the share of edges that fall
within a group, divided by the share expected if the same group sizes were assigned at random.
A contiguous figure scores well above 1; a scattered set scores near 1.

Nothing here uses the plate's answer, the digit, or any colour-space assumption about which
direction figure and ground ought to differ along. That matters: a method that assumed the split
should lie along a confusion line would manufacture the very alignment the audit is measuring.

--validate is the control. On the eleven ZEISS plates the true assignment is declared in the SVG
classes, so recovery can be scored against it. Applying this to raster plates is only justified if
it reproduces those.
"""
import argparse
import itertools
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "research", "plate-audit", "delivered-plates.json")


def adjacency(P, R, border_radii=2.2):
    """Edges between dots whose centres are within border_radii x (r_i + r_j)."""
    n = len(P)
    edges = []
    try:
        from scipy.spatial import cKDTree
        tree = cKDTree(P)
        lim = border_radii * 2.0 * R.max()
        for i in range(n):
            for j in tree.query_ball_point(P[i], lim):
                if j <= i:
                    continue
                if np.hypot(*(P[i] - P[j])) <= border_radii * (R[i] + R[j]):
                    edges.append((i, j))
    except Exception:
        for i in range(n):
            for j in range(i + 1, n):
                if np.hypot(*(P[i] - P[j])) <= border_radii * (R[i] + R[j]):
                    edges.append((i, j))
    return np.array(edges, dtype=int) if edges else np.zeros((0, 2), dtype=int)


def coherence(labels, edges, weights=None):
    """Newman modularity of a 2-labelling on the dot adjacency graph.

    Q = sum over groups of (within-group edge share - (group's share of edge ends)^2).

    Plain assortativity - within-group edge share over its random expectation - was tried first
    and fails in a specific way: any coherent SUBSET of a numeral is also spatially coherent, so
    it happily returns two of a figure's three colours and scores them higher than the whole
    figure. On ZEISS plate 2 that gave 100 per cent precision at 37 per cent recall.

    Modularity does not have that failure mode, because splitting one community in two costs more
    in the degree term than it gains in the edge term. It is the standard measure for exactly this
    question and needs no completeness fudge factor bolted on.
    """
    if len(edges) == 0:
        return -1.0
    m = len(edges)
    same = labels[edges[:, 0]] == labels[edges[:, 1]]
    deg = np.bincount(edges.ravel(), minlength=len(labels))
    two_m = float(deg.sum())
    if two_m == 0:
        return -1.0
    q = 0.0
    for c in (0, 1):
        e_c = float(((labels[edges[:, 0]] == c) & same).sum()) / m
        a_c = float(deg[labels == c].sum()) / two_m
        q += e_c - a_c * a_c
    return q


def recover(dots, border_radii=2.2, min_minority=0.04, max_minority=0.48, max_colours=14):
    """Split the dots into figure and ground by maximising spatial coherence.

    Returns a dict with the chosen partition, its score, and the runner-up so the margin is
    visible - a narrow margin means the plate does not have a clearly recoverable figure.
    """
    if len(dots) < 20:
        return {"error": "too few dots (%d)" % len(dots)}
    P = np.array([[d["x"], d["y"]] for d in dots], dtype=float)
    R = np.array([d["r"] for d in dots], dtype=float)
    keys = [d.get("hex") or tuple(np.round(d["rgb"]).astype(int)) for d in dots]

    uniq = sorted({str(k) for k in keys})
    if len(uniq) < 2:
        return {"error": "only one colour present"}
    if len(uniq) > max_colours:
        # Quantise to a manageable number of colour groups before enumerating partitions.
        from sklearn.cluster import KMeans
        rgb = np.array([d["rgb"] for d in dots], dtype=float)
        k = max_colours
        km = KMeans(n_clusters=k, n_init=6, random_state=0).fit(rgb)
        gid = km.labels_
        ngroups = k
    else:
        idx = {u: i for i, u in enumerate(uniq)}
        gid = np.array([idx[str(k)] for k in keys])
        ngroups = len(uniq)

    area = math.pi * (R ** 2)
    best, second = None, None
    edges = adjacency(P, R, border_radii)      # built once, not per candidate partition
    # Every way of splitting the colour groups in two. Group 0 is pinned to one side so each
    # partition is visited once; bits == 0 means "group 0 alone", which must be included - it is
    # the only possible split of a two-colour plate, and omitting it rejected ZEISS plate 1
    # outright.
    for bits in range(0, 1 << (ngroups - 1)):
        sel = {0}
        for b in range(ngroups - 1):
            if bits >> b & 1:
                sel.add(b + 1)
        if len(sel) == ngroups:
            continue                            # everything on one side is not a partition
        labels = np.isin(gid, list(sel)).astype(int)
        # The minority side is the candidate figure. Reject implausible sizes.
        fa = area[labels == 1].sum() / area.sum()
        minority = min(fa, 1 - fa)
        if not (min_minority <= minority <= max_minority):
            continue
        sc = coherence(labels, edges, weights=None)
        rec = {"score": sc, "labels": labels, "minority_area_frac": minority}
        if best is None or sc > best["score"]:
            best, second = rec, best
        elif second is None or sc > second["score"]:
            second = rec
    if best is None:
        return {"error": "no candidate partition had a plausible figure size"}

    labels = best["labels"]
    fa = area[labels == 1].sum() / area.sum()
    fig_side = 1 if fa < 0.5 else 0
    figure = [d for d, l in zip(dots, labels) if l == fig_side]
    ground = [d for d, l in zip(dots, labels) if l != fig_side]
    return {"score": round(best["score"], 3),
            "runner_up": round(second["score"], 3) if second else None,
            "margin": round(best["score"] - second["score"], 3) if second else None,
            "figure": figure, "ground": ground,
            "figure_area_frac": round(float(min(fa, 1 - fa)), 3),
            "n_colour_groups": ngroups}


def validate(svg_dir, border_radii=2.2):
    """Score recovery against the declared assignment on the ZEISS plates."""
    import glob
    from svg_dot_geometry import extract, drop_backdrop
    d = json.load(open(DATA, encoding="utf-8"))
    print("Recovering figure/ground with no answer key, scored against the declared SVG classes.\n")
    print("  %-6s %-15s %6s %7s %7s %8s %8s  %s"
          % ("plate", "type", "dots", "score", "margin", "recall", "precision", ""))
    tot_ok = 0
    tot = 0
    for p in d["zeiss"]["plates"]:
        c = glob.glob(os.path.join(svg_dir, "*ishihara_%d.svg" % p["no"]))
        if not c:
            continue
        dots = drop_backdrop(extract(c[0]))
        # Score against the SPATIAL assignment. The original figure/ground fields were
        # labelled by dot count and are wrong on six of eleven plates.
        fk = "figure_spatial" if "figure_spatial" in p else "figure"
        truth_fig = {h.lower() for h, _ in p[fk]}
        truth = np.array([1 if x["hex"] in truth_fig else 0 for x in dots])
        r = recover(dots, border_radii=border_radii)
        if "error" in r:
            print("  %-6s %-15s %6d   %s" % (p["no"], p["type"], len(dots), r["error"]))
            continue
        got = np.array([1 if any(x is y for y in r["figure"]) else 0 for x in dots])
        tp = int(((got == 1) & (truth == 1)).sum())
        recall = tp / max(1, int((truth == 1).sum()))
        prec = tp / max(1, int((got == 1).sum()))
        ok = recall >= 0.80 and prec >= 0.80
        tot_ok += ok
        tot += 1
        print("  %-6s %-15s %6d %7.2f %7s %7.0f%% %8.0f%%  %s"
              % (p["no"], p["type"], len(dots), r["score"],
                 r["margin"] if r["margin"] is not None else "-",
                 100 * recall, 100 * prec, "OK" if ok else "MISS"))
    print()
    print("  %d of %d plates recovered with recall and precision both >= 80%%" % (tot_ok, tot))
    print("  Recovery must work here before it is trusted on a raster plate, where there is no")
    print("  declared assignment to check against.")
    return tot_ok == tot


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--validate", action="store_true")
    ap.add_argument("--svg-dir", default=".")
    ap.add_argument("--image", nargs="*")
    ap.add_argument("--border-radii", type=float, default=2.2)
    a = ap.parse_args()
    if a.validate:
        return 0 if validate(a.svg_dir, a.border_radii) else 1
    if not a.image:
        ap.error("--image required unless --validate")
    from plate_dots import extract_dots
    for f in a.image:
        dots_raw, info = extract_dots(f)
        dots = [{"x": 0, "y": 0, "r": 1, "rgb": rgb, "hex": None} for rgb, _ in dots_raw]
        print("%s: %s" % (os.path.basename(f), info))
        print("  (positions required - use extract_dots_with_positions)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
