#!/usr/bin/env python3
"""Figures 1-4 for the plate-taxonomy note, recomputed from the SVGs and asserted against the
numbers printed in the manuscript.

    python tools/make_figures.py --svg-dir <dir with visionscreening.zeiss.com_ishihara_N.svg>

Every quantity plotted here is recomputed from the delivered markup through the same functions
local_pairing.py uses, and then checked against the value in the manuscript table. A mismatch
raises. A figure that silently disagrees with the text it illustrates is worse than no figure, so
the checks run before anything is drawn and the script refuses to emit files if any fails.

Output is vector PDF (fonts embedded, Wiley's preferred submission form) plus 600 dpi TIFF at
Wiley column widths: 80 mm single column, 175 mm double column.
"""
import argparse
import csv
import glob
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from svg_dot_geometry import extract, drop_backdrop                      # noqa: E402
from svg_plate_colorimetry import srgb_to_xy, angle_to_confusion, COPUNCTAL, hex_to_rgb  # noqa: E402
from local_pairing import assign_groups, local_pairs                     # noqa: E402

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt                                          # noqa: E402
from matplotlib.lines import Line2D                                      # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "research", "plate-audit", "delivered-plates.json")
PAIRS = os.path.join(ROOT, "research", "plate-audit", "pairs.csv")
WARN_DEG = 25.0

MM = 1.0 / 25.4
W1, W2 = 80 * MM, 175 * MM          # Wiley single- and double-column widths

# Manuscript Table 1, section 3.2. frac_aligned by plate and axis, at border_radii = 2.2.
TABLE = {
    1:  ("demonstration", 465, 100, 0.000, 0.000),
    2:  ("transformation", 482, 100, 1.000, 0.847),
    6:  ("transformation", 668, 141, 0.940, 0.750),
    8:  ("vanishing",      457,  80, 0.940, 0.570),
    9:  ("vanishing",      539, 100, 0.930, 0.590),
    10: ("vanishing",      420,  76, 0.860, 0.680),
    5:  ("transformation", 470, 109, 0.820, 0.540),
    7:  ("transformation", 694, 170, 0.810, 0.500),
    4:  ("transformation", 535,  99, 0.710, 0.530),
    3:  ("transformation", 693, 145, 0.374, 0.580),
    15: ("hidden digit",   543,  89, 0.270, 0.050),
}
# Section 3.1, plate 2 relative radii of gyration.
RG_REF = {"#eb4825": 0.66, "#f88c4f": 0.63, "#928237": 1.03}
# Section 3.3.
SWEEP_REF = {"spearman": {1.5: 0.964, 2.2: 0.936, 3.0: 0.936}, "max_shift": 0.146,
             "max_shift_plate": 4, "hidden_range": (0.205, 0.271)}

TYPE_STYLE = {
    "demonstration":  ("#000000", "s", "Demonstration"),
    "transformation": ("#0072b2", "o", "Transformation"),
    "vanishing":      ("#d55e00", "^", "Vanishing"),
    "hidden digit":   ("#009e73", "D", "Hidden digit"),
}
ORDER = [1, 2, 6, 8, 9, 10, 5, 7, 4, 3, 15]     # manuscript table order


def rcparams():
    plt.rcParams.update({
        "font.family": "serif",
        "font.serif": ["Times New Roman", "Nimbus Roman", "DejaVu Serif"],
        "mathtext.fontset": "stix",
        "font.size": 8, "axes.labelsize": 8, "axes.titlesize": 8,
        "xtick.labelsize": 7, "ytick.labelsize": 7, "legend.fontsize": 7,
        "axes.linewidth": 0.6, "xtick.major.width": 0.6, "ytick.major.width": 0.6,
        "xtick.direction": "out", "ytick.direction": "out",
        "lines.linewidth": 0.9, "axes.spines.top": False, "axes.spines.right": False,
        "pdf.fonttype": 42, "ps.fonttype": 42,
        "savefig.bbox": "tight", "savefig.pad_inches": 0.02,
    })


# ---------------------------------------------------------------- data assembly

def load_plates(svg_dir):
    """Recover dots and both figure/ground assignments for every ZEISS plate."""
    d = json.load(open(DATA, encoding="utf-8"))
    out = []
    for p in d["zeiss"]["plates"]:
        cands = (glob.glob(os.path.join(svg_dir, "*ishihara_%d.svg" % p["no"])) or
                 glob.glob(os.path.join(svg_dir, "ishihara_%d.svg" % p["no"])))
        if not cands:
            raise SystemExit("missing SVG for plate %s in %s" % (p["no"], svg_dir))
        dots = drop_backdrop(extract(cands[0]))
        F, G = assign_groups(dots, [h for h, _ in p["figure_spatial"]],
                             [h for h, _ in p["ground_spatial"]])
        out.append({"no": p["no"], "type": p["type"], "answer": p["answer"], "dots": dots,
                    "F": F, "G": G,
                    "fig_spatial": [h for h, _ in p["figure_spatial"]],
                    "gnd_spatial": [h for h, _ in p["ground_spatial"]],
                    "fig_count": [h for h, _ in p["figure"]],
                    "gnd_count": [h for h, _ in p["ground"]]})
    return out


def gyration(plate):
    """Radius of gyration of each colour class, relative to that of every dot on the plate."""
    P = np.array([[d["x"], d["y"]] for d in plate["dots"]], dtype=np.float64)
    rg_all = math.sqrt(float(((P - P.mean(axis=0)) ** 2).sum(axis=1).mean()))
    out = {}
    for hx in sorted({d["hex"] for d in plate["dots"]}):
        Q = np.array([[d["x"], d["y"]] for d in plate["dots"] if d["hex"] == hx],
                     dtype=np.float64)
        rg = math.sqrt(float(((Q - Q.mean(axis=0)) ** 2).sum(axis=1).mean()))
        out[hx] = (rg / rg_all if rg_all else float("nan"), len(Q))
    return out


def pair_devs(plate, axis, border_radii=2.2):
    """Per-border-pair deviation and area weight, ordered by deviation. Mirrors measure_local."""
    F, G = plate["F"], plate["G"]
    pr = local_pairs(F, G, border_radii=border_radii)
    if not pr:
        return None
    fx = srgb_to_xy(np.array([F[i]["rgb"] for i, _, _, _ in pr], dtype=np.float64))
    gx = srgb_to_xy(np.array([G[j]["rgb"] for _, j, _, _ in pr], dtype=np.float64))
    w = np.array([p[3] for p in pr], dtype=np.float64)
    devs = np.array([angle_to_confusion((fx[k] + gx[k]) / 2.0, gx[k] - fx[k], axis)
                     for k in range(len(pr))])
    ok = devs == devs
    devs, w = devs[ok], w[ok]
    order = np.argsort(devs)
    ds, ws = devs[order], w[order]
    cw = np.cumsum(ws) / ws.sum()
    frac = float(ws[ds <= WARN_DEG].sum() / ws.sum())
    return {"dev": ds, "cw": cw, "frac": frac, "n": int(len(ds)),
            "border_figure_dots": len({p[0] for p in pr})}


def spearman(a, b):
    def rank(v):
        v = np.asarray(v, dtype=np.float64)
        o = np.argsort(v, kind="mergesort")
        r = np.empty(len(v))
        r[o] = np.arange(1, len(v) + 1)
        # average ranks within ties
        for val in np.unique(v):
            m = v == val
            if m.sum() > 1:
                r[m] = r[m].mean()
        return r
    ra, rb = rank(a), rank(b)
    ra -= ra.mean()
    rb -= rb.mean()
    return float(ra @ rb / math.sqrt((ra @ ra) * (rb @ rb)))


# ---------------------------------------------------------------- checks

def checks(plates, svg_dir):
    """Reproduce every number the figures will show. Returns the computed payload or raises."""
    fail = []
    say = []

    # 1. dot counts
    counts = {p["no"]: len(p["dots"]) for p in plates}
    expect = {1: 585, 2: 708, 3: 638, 4: 746, 5: 655, 6: 750, 7: 708, 8: 700, 9: 562,
              10: 746, 15: 602}
    if counts != expect:
        fail.append("dot counts %s != manuscript %s" % (counts, expect))
    else:
        say.append("dot counts reproduce all 11 plates (total %d)" % sum(counts.values()))

    # 2. radius of gyration, plate 2
    rg = {p["no"]: gyration(p) for p in plates}
    for hx, ref in RG_REF.items():
        got = rg[2][hx][0]
        if abs(got - ref) > 0.005:
            fail.append("plate 2 %s rel Rg %.3f != manuscript %.2f" % (hx, got, ref))
    say.append("plate 2 rel Rg: " + ", ".join("%s %.3f" % (h, rg[2][h][0]) for h in RG_REF))

    # 3. count-rule disagreement on six of eleven plates
    disagree = {}
    for p in plates:
        sf, cf = set(p["fig_spatial"]), set(p["fig_count"])
        diff = (sf | cf) - (sf & cf)
        if diff:
            disagree[p["no"]] = sorted(diff)
    if len(disagree) != 6:
        fail.append("count rule disagrees on %d plates (%s), manuscript says 6"
                    % (len(disagree), sorted(disagree)))
    else:
        say.append("count rule mislabels 6 plates: %s" % sorted(disagree))

    # 4. Table 1
    ecdf = {}
    for p in plates:
        for ax in ("protan", "deutan"):
            r = pair_devs(p, ax)
            ecdf[(p["no"], ax)] = r
        t = TABLE[p["no"]]
        got_n = ecdf[(p["no"], "protan")]["n"]
        got_b = ecdf[(p["no"], "protan")]["border_figure_dots"]
        if got_n != t[1] or got_b != t[2]:
            fail.append("plate %s n/b = %d/%d, manuscript %d/%d"
                        % (p["no"], got_n, got_b, t[1], t[2]))
        for k, ax in ((3, "protan"), (4, "deutan")):
            got, ref = ecdf[(p["no"], ax)]["frac"], t[k]
            if abs(got - ref) > 0.0055:
                fail.append("plate %s %s frac %.3f != manuscript %.3f" % (p["no"], ax, got, ref))
    if not any("frac" in f or "n/b" in f for f in fail):
        say.append("Table 1 reproduces: all 11 plates x 2 axes, n, b and frac_aligned")

    # 5. Class-level deviations against pairs.csv.
    #
    # This is a REGRESSION bound, not an equality check, and the reason is recorded here because
    # the discrepancy is real. pairs.csv belongs to the withdrawn space-dependence analysis, and
    # its dev_xy column does not reproduce under the method this note describes in 2.3: not one
    # of its 2036 rows agrees to 1e-6. Over the 308 ZEISS rows checked below the median gap is
    # 0.54 deg and the largest 5.85 deg; over all 2036 rows the median is 0.40 deg. The
    # gap is not explained by the copunctal values (both the correct and the circulating wrong
    # protan value were tried), nor by the anchor (midpoint, figure, ground and dot-count-weighted
    # were tried), nor by constructing the direction from the cone model instead of retrieving the
    # copunctal point, which agrees with retrieval to 0.06 deg. Its size is that of the
    # Judd-Vos-frame difference already quantified for this measurement (0.310 / 0.186 / 0.021 deg
    # per axis), so the two files were most likely generated on opposite sides of that fix. That is
    # a statement about a likely cause, not a demonstrated one.
    #
    # Figure 1 therefore takes its angles from this note's own method, the one checked in 4 above.
    # The bound below exists so that any future change which makes the disagreement WORSE fails.
    BOUND_MEDIAN, BOUND_MAX = 0.545, 5.85
    gaps = []
    for row in csv.DictReader(open(PAIRS, encoding="utf-8")):
        if row["source"] != "ZEISS":
            continue
        f = srgb_to_xy(np.array([hex_to_rgb(row["fg_hex"])], dtype=np.float64))[0]
        g = srgb_to_xy(np.array([hex_to_rgb(row["bg_hex"])], dtype=np.float64))[0]
        got = angle_to_confusion((f + g) / 2.0, g - f, row["axis"])
        gaps.append(abs(got - float(row["dev_xy"])))
    gaps = np.array(gaps)
    if np.median(gaps) > BOUND_MEDIAN or gaps.max() > BOUND_MAX:
        fail.append("gap to pairs.csv dev_xy grew: median %.3f (bound %.2f), max %.3f (bound %.2f)"
                    % (np.median(gaps), BOUND_MEDIAN, gaps.max(), BOUND_MAX))
    else:
        say.append("gap to withdrawn pairs.csv dev_xy within recorded bound: %d rows, "
                   "median %.3f deg, max %.3f deg, 0 exact (see comment in checks())"
                   % (len(gaps), np.median(gaps), gaps.max()))

    # 6. sensitivity sweep
    grid = [1.15, 1.3, 1.5, 1.75, 2.0, 2.2, 2.5, 2.75, 3.0]
    named = [1.15, 1.5, 2.2, 3.0]
    sweep = {}
    for p in plates:
        for br in grid:
            r = pair_devs(p, "protan", border_radii=br)
            sweep[(p["no"], br)] = r["frac"] if r else float("nan")
    base = [sweep[(n, 1.15)] for n in ORDER]
    rho = {}
    for br in named[1:]:
        rho[br] = spearman(base, [sweep[(n, br)] for n in ORDER])
        if abs(rho[br] - SWEEP_REF["spearman"][br]) > 0.005:
            fail.append("Spearman 1.15 vs %.2f = %+.3f, manuscript %+.3f"
                        % (br, rho[br], SWEEP_REF["spearman"][br]))
    say.append("Spearman vs 1.15: " + ", ".join("%.2f %+.3f" % (b, rho[b]) for b in named[1:]))

    shift_named = {n: max(sweep[(n, b)] for b in named) - min(sweep[(n, b)] for b in named)
                   for n in ORDER}
    mx = max(shift_named, key=lambda n: shift_named[n])
    if abs(shift_named[mx] - SWEEP_REF["max_shift"]) > 0.0015 or mx != SWEEP_REF["max_shift_plate"]:
        fail.append("largest shift over the four named settings is %.3f on plate %s, "
                    "manuscript says %.3f on plate %s"
                    % (shift_named[mx], mx, SWEEP_REF["max_shift"], SWEEP_REF["max_shift_plate"]))
    else:
        say.append("largest shift over named settings %.3f on plate %d (manuscript %.3f)"
                   % (shift_named[mx], mx, SWEEP_REF["max_shift"]))

    shift_full = {n: max(sweep[(n, b)] for b in grid) - min(sweep[(n, b)] for b in grid)
                  for n in ORDER}
    mxf = max(shift_full, key=lambda n: shift_full[n])
    say.append("over the FULL 9-point grid the largest shift is %.3f on plate %d"
               % (shift_full[mxf], mxf))

    hid = [sweep[(15, b)] for b in grid]
    say.append("plate 15 across the grid: %.3f to %.3f (manuscript names %.3f to %.3f "
               "over its own sweep)" % (min(hid), max(hid), *SWEEP_REF["hidden_range"]))
    if any(abs(sweep[(1, b)]) > 1e-12 for b in grid):
        fail.append("demonstration plate is not 0.000 at every setting")
    else:
        say.append("demonstration plate 0.000 at every setting")

    # 6b. The archived local-pairing.json must agree with the recomputation on the MEDIAN, not
    # only on frac_aligned. This gate exists because its absence hid a real defect: the file
    # shipped in this repo until 2026-08-11 had been generated with the superseded deutan
    # copunctal (1.080, -0.080), and every deutan median in it was wrong - plate 1 read 43.1 deg
    # where the correct value is 47.3. A check on frac_aligned alone CANNOT see that, because
    # both values sit above the 25 deg criterion and both therefore give a fraction of zero. A
    # check that cannot detect the defect it exists to catch is not a check.
    lp = json.load(open(os.path.join(ROOT, "research", "plate-audit", "local-pairing.json"),
                        encoding="utf-8"))
    worst_med = 0.0
    for row in lp["rows"]:
        for ax, m in row["axes"].items():
            r = pair_devs([p for p in plates if p["no"] == row["plate"]][0], ax)
            got_med = float(r["dev"][int(np.searchsorted(r["cw"], 0.5))])
            worst_med = max(worst_med, abs(got_med - m["median_deg"]))
            if abs(r["frac"] - m["frac_aligned"]) > 0.0015:
                fail.append("local-pairing.json plate %s %s frac %.3f != recomputed %.3f"
                            % (row["plate"], ax, m["frac_aligned"], r["frac"]))
    if worst_med > 0.06:
        fail.append("local-pairing.json medians disagree with recomputation by up to %.2f deg; "
                    "the file is stale" % worst_med)
    else:
        say.append("local-pairing.json agrees on median and frac_aligned for all 22 plate/axis "
                   "cells (max median gap %.3f deg)" % worst_med)

    # 7. The 0.85 cut sits in an empty band, and that is the claim worth showing rather than the
    # line itself: if any class fell between the most spread figure class and the most compact
    # ground class the cut would be arbitrary. Gate on the band being non-empty.
    figs = [rel for no in ORDER for rel, _ in rg[no].values() if rel < 0.85]
    gnds = [rel for no in ORDER for rel, _ in rg[no].values() if rel >= 0.85]
    band = (max(figs), min(gnds))
    if band[0] >= band[1]:
        fail.append("compactness populations overlap: figure max %.3f, ground min %.3f" % band)
    else:
        say.append("no colour class falls between %.3f and %.3f; the 0.85 cut lies in that band"
                   % band)

    print("CHECKS")
    for s in say:
        print("  ok   " + s)
    for f in fail:
        print("  FAIL " + f)
    if fail:
        raise SystemExit("\n%d check(s) failed. No figures written." % len(fail))
    print("  --- all checks passed\n")
    return {"rg": rg, "disagree": disagree, "ecdf": ecdf, "sweep": sweep, "grid": grid,
            "named": named, "rho": rho, "shift_named": shift_named, "band": band}


# ---------------------------------------------------------------- figures

def save(fig, out, stem):
    for ext, kw in (("pdf", {}), ("tif", {"dpi": 600, "pil_kwargs": {"compression": "tiff_lzw"}})):
        path = os.path.join(out, "%s.%s" % (stem, ext))
        fig.savefig(path, **kw)
        print("  wrote %s  (%.0f kB)" % (path, os.path.getsize(path) / 1024.0))
    plt.close(fig)


def declutter(ys, gap):
    """Nudge label positions apart without changing their order."""
    out = list(ys)
    order = sorted(range(len(ys)), key=lambda k: ys[k])
    for k in range(1, len(order)):
        a, b = order[k - 1], order[k]
        if out[b] - out[a] < gap:
            out[b] = out[a] + gap
    return out


def fig1_geometry(plates, out):
    """Measurement geometry in CIE 1931 xy: an aligned plate and an unaligned one."""
    by_no = {p["no"]: p for p in plates}
    fig, axes = plt.subplots(1, 2, figsize=(W2, W2 * 0.44))
    for ax, no, ttl in ((axes[0], 2, "(a) plate 2, transformation"),
                        (axes[1], 1, "(b) plate 1, demonstration")):
        p = by_no[no]
        cx, cy = COPUNCTAL["protan"]
        pts = {hx: srgb_to_xy(np.array([hex_to_rgb(hx)], dtype=np.float64))[0]
               for hx in p["fig_spatial"] + p["gnd_spatial"]}
        xs = [v[0] for v in pts.values()]
        ys = [v[1] for v in pts.values()]
        mx, my = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        half = max(max(xs) - min(xs), max(ys) - min(ys)) * 0.62 + 0.035
        ax.set_xlim(mx - half, mx + half)
        ax.set_ylim(my - half, my + half)
        ax.set_aspect("equal")

        for hx in p["fig_spatial"]:                     # confusion line through each figure class
            x0, y0 = pts[hx]
            dx, dy = x0 - cx, y0 - cy
            n = math.hypot(dx, dy)
            dx, dy = dx / n, dy / n
            ax.plot([x0 - 0.9 * dx, x0 + 0.9 * dx], [y0 - 0.9 * dy, y0 + 0.9 * dy],
                    color="#9a9a9a", lw=0.6, ls=(0, (4, 2)), zorder=1)

        devs = []
        for fh in p["fig_spatial"]:
            for gh in p["gnd_spatial"]:
                f, g = pts[fh], pts[gh]
                devs.append((angle_to_confusion((f + g) / 2.0, g - f, "protan"), fh, gh))
                ax.annotate("", xy=tuple(g), xytext=tuple(f),
                            arrowprops=dict(arrowstyle="-|>", lw=0.7, color="#333333",
                                            shrinkA=4.2, shrinkB=4.2, mutation_scale=5),
                            zorder=2)
        devs.sort()
        for dev, fh, gh in ([devs[0], devs[-1]] if len(devs) > 1 else devs):
            f, g = pts[fh], pts[gh]
            t = 0.34 if dev == devs[0][0] else 0.62
            ax.text(f[0] + t * (g[0] - f[0]), f[1] + t * (g[1] - f[1]) + 0.008,
                    "%.1f°" % dev, fontsize=7, color="#111111", ha="center", zorder=6,
                    bbox=dict(fc="white", ec="none", alpha=0.85, pad=0.8))

        # labels pushed radially outward from the cloud centre so they cannot collide
        for hx, xy in pts.items():
            ax.plot(xy[0], xy[1], "o", ms=8.5, mfc=hx, mec="black", mew=0.6, zorder=4)
            vx, vy = xy[0] - mx, xy[1] - my
            n = math.hypot(vx, vy) or 1.0
            off = 0.021 * half / 0.09
            ax.text(xy[0] + off * vx / n, xy[1] + off * vy / n,
                    "%s %s" % ("F" if hx in p["fig_spatial"] else "G", hx),
                    fontsize=5.8, ha="center", va="center", color="#333333", zorder=5,
                    bbox=dict(fc="white", ec="none", alpha=0.8, pad=0.6))

        ax.set_xlabel("CIE 1931 $x$")
        ax.set_ylabel("CIE 1931 $y$")
        ax.set_title(ttl, loc="left", pad=3)
        ax.annotate("confusion lines converge on the\nprotan copunctal point (0.747, 0.253)",
                    xy=(0.98, 0.035), xycoords="axes fraction", fontsize=5.8,
                    ha="right", va="bottom", color="#777777")
    save(fig, out, "Figure1_geometry")


def fig2_compactness(plates, res, out):
    """Radius of gyration separates figure from ground; dot count does not."""
    rg, disagree, band = res["rg"], res["disagree"], res["band"]
    fig, ax = plt.subplots(figsize=(W2, W2 * 0.44))
    ax.axhspan(band[0], band[1], color="#f0f0f0", zorder=0)
    ax.axhline(0.85, color="#333333", lw=0.7, ls=(0, (4, 2)), zorder=1)
    for k, no in enumerate(ORDER):
        for hx, (rel, n) in sorted(rg[no].items(), key=lambda kv: kv[1][0]):
            jitter = (hash(hx) % 100 - 50) / 100.0 * 0.30
            ms = 4.6 + 2.6 * (n / 260.0) ** 0.5
            ax.plot(k + jitter, rel, "o", ms=ms, mfc=hx, mec="black", mew=0.5, zorder=3)
            if hx in disagree.get(no, []):
                # ring OUTSIDE the marker, so it stays visible over dark and red fills alike
                ax.plot(k + jitter, rel, "o", ms=ms + 4.0, mfc="none", mec="#c1121f",
                        mew=1.2, zorder=5)
    ax.text(-0.52, 0.803, "no colour class on any plate falls between %.2f and %.2f;\n"
            "the 0.85 cut lies inside that empty band" % band,
            fontsize=6.2, va="center", ha="left", color="#444444", zorder=4)
    ax.annotate("#928237: relative $R_g$ 1.03,\nspread across plate 2, but only\nits third "
                "largest colour class",
                xy=(1 + (hash("#928237") % 100 - 50) / 100.0 * 0.30, rg[2]["#928237"][0]),
                xytext=(2.30, 1.255), fontsize=6.2, color="#c1121f", va="top",
                arrowprops=dict(arrowstyle="-", lw=0.6, color="#c1121f"))
    ax.set_xticks(range(len(ORDER)))
    ax.set_xticklabels([str(n) for n in ORDER])
    ax.set_xlabel("ZEISS plate")
    ax.set_ylabel("radius of gyration of the colour class,\nrelative to the whole plate")
    ax.set_xlim(-0.62, len(ORDER) - 0.35)
    ax.set_ylim(0.44, 1.30)
    hnd = [Line2D([], [], marker="o", ls="none", mfc="#c8c8c8", mec="black", mew=0.5, ms=5,
                  label="colour class (marker area $\\propto$ dot count)"),
           Line2D([], [], marker="o", ls="none", mfc="#c8c8c8", mec="#c1121f", mew=1.4, ms=5,
                  label="assigned to the other population by dot count")]
    ax.legend(handles=hnd, loc="lower center", bbox_to_anchor=(0.5, 1.005), ncol=2,
              frameon=False, handletextpad=0.3, columnspacing=1.4, borderaxespad=0.0)
    save(fig, out, "Figure2_compactness")


def fig3_taxonomy(res, out):
    """The result: three groups separate on the aligned fraction."""
    ecdf = res["ecdf"]
    fig = plt.figure(figsize=(W2, W2 * 0.36))
    gs = fig.add_gridspec(1, 3, wspace=0.38, width_ratios=[1, 1, 1.04])
    axes = [fig.add_subplot(gs[0, i]) for i in range(3)]

    for ax, axis, ttl in ((axes[0], "protan", "(a) protan"), (axes[1], "deutan", "(b) deutan")):
        ax.axvspan(0, WARN_DEG, color="#f4f4f4", zorder=0)
        for no in ORDER:
            r = ecdf[(no, axis)]
            col = TYPE_STYLE[TABLE[no][0]][0]
            ax.step(np.concatenate(([0.0], r["dev"])), np.concatenate(([0.0], r["cw"])),
                    where="post", color=col, lw=0.85, alpha=0.9, zorder=3)
            ax.plot([WARN_DEG], [r["frac"]], "o", ms=2.4, color=col, zorder=4)
        # Only the four plates the argument turns on are labelled here; panel (c) identifies
        # every plate, and labelling all eleven crossings crowds them into illegibility.
        keyed = [(ecdf[(no, axis)]["frac"], no) for no in (2, 3, 15, 1)]
        for (_, no), y in zip(keyed, declutter([k[0] for k in keyed], 0.055)):
            ax.text(WARN_DEG + 2.6, y, str(no), fontsize=6.0, va="center", zorder=5,
                    color=TYPE_STYLE[TABLE[no][0]][0])
        ax.axvline(WARN_DEG, color="#333333", lw=0.7, ls=(0, (4, 2)), zorder=2)
        # plate 1 carries a single colour pair, so its curve is one vertical step
        r1 = ecdf[(1, axis)]
        ax.annotate("plate 1:\none colour pair,\nso one step at %.1f°" % r1["dev"][0],
                    xy=(r1["dev"][0], 0.5), xytext=(r1["dev"][0] + 9, 0.42),
                    fontsize=5.6, color="#333333", va="top",
                    arrowprops=dict(arrowstyle="-", lw=0.5, color="#333333"))
        ax.set_xlim(0, 90)
        ax.set_ylim(0, 1.02)
        ax.set_xticks([0, 25, 45, 90])
        ax.set_xlabel("deviation from the confusion line (deg)")
        ax.set_ylabel("area-weighted cumulative\nshare of border pairs")
        ax.set_title(ttl, loc="left", pad=3)

    ax = axes[2]
    ax.plot([0, 1], [0, 1], color="#d5d5d5", lw=0.6, zorder=1)
    xy = {no: (ecdf[(no, "protan")]["frac"], ecdf[(no, "deutan")]["frac"]) for no in ORDER}
    for no in ORDER:
        col, mk, _ = TYPE_STYLE[TABLE[no][0]]
        ax.plot(*xy[no], marker=mk, ms=4.4, mfc=col, mec="black", mew=0.45, zorder=3)
    for no, ty in zip(ORDER, declutter([xy[n][1] for n in ORDER], 0.052)):
        ax.annotate(str(no), (xy[no][0], xy[no][1]), xytext=(xy[no][0] + 0.035, ty),
                    fontsize=6.0, color="#222222", va="center",
                    arrowprops=(dict(arrowstyle="-", lw=0.4, color="#999999")
                                if abs(ty - xy[no][1]) > 0.012 else None))
    ax.set_xlim(-0.07, 1.16)
    ax.set_ylim(-0.07, 1.03)
    ax.set_xlabel("aligned fraction, protan")
    ax.set_ylabel("aligned fraction, deutan")
    ax.set_title("(c)", loc="left", pad=3)
    hnd = [Line2D([], [], marker=m, ls="none", mfc=c, mec="black", mew=0.45, ms=4.2, label=lb)
           for c, m, lb in TYPE_STYLE.values()]
    ax.legend(handles=hnd, loc="upper left", frameon=False, handletextpad=0.25,
              borderaxespad=0.25, labelspacing=0.22)
    save(fig, out, "Figure3_taxonomy")


def fig4_sensitivity(res, out):
    """Absolute fractions move with the border definition; group membership does not."""
    sweep, grid, named, rho = res["sweep"], res["grid"], res["named"], res["rho"]
    fig, axes = plt.subplots(1, 2, figsize=(W2, W2 * 0.40),
                             gridspec_kw={"wspace": 0.28, "width_ratios": [1.3, 1]})
    ax = axes[0]
    ends = []
    for no in ORDER:
        col, mk, _ = TYPE_STYLE[TABLE[no][0]]
        y = [sweep[(no, b)] for b in grid]
        ax.plot(grid, y, "-", color=col, lw=0.85, marker=mk, ms=2.5, mew=0.35,
                mec="black", zorder=3)
        ends.append((y[-1], no, col))
    for (_, no, col), yy in zip(ends, declutter([e[0] for e in ends], 0.037)):
        ax.text(grid[-1] + 0.055, yy, str(no), fontsize=5.8, va="center", color=col)
    ax.axvline(2.2, color="#333333", lw=0.7, ls=(0, (4, 2)), zorder=1)
    ax.text(2.16, 1.10, "setting used", fontsize=6.2, color="#333333", ha="right")
    ax.set_xlim(grid[0] - 0.06, grid[-1] + 0.26)
    ax.set_ylim(-0.04, 1.16)
    ax.set_xticks(grid)
    ax.set_xticklabels(["%.2f" % b for b in grid], fontsize=6.2)
    ax.set_yticks([0, 0.2, 0.4, 0.6, 0.8, 1.0])
    ax.set_xlabel("border threshold (summed dot radii)")
    ax.set_ylabel("aligned fraction, protan")
    ax.set_title("(a)", loc="left", pad=3)
    hnd = [Line2D([], [], marker=m, color=c, lw=0.85, mec="black", mew=0.35, ms=3.4, label=lb)
           for c, m, lb in TYPE_STYLE.values()]
    # the band between plate 3 and plate 4 carries no curve at any setting
    ax.legend(handles=hnd, loc="center", bbox_to_anchor=(0.52, 0.44), ncol=2, frameon=False,
              handletextpad=0.4, columnspacing=1.2, borderaxespad=0.0, labelspacing=0.25)

    ax = axes[1]
    ranks = {}
    for b in named:
        for i, n in enumerate(sorted(ORDER, key=lambda m: -sweep[(m, b)])):
            ranks[(b, n)] = i + 1
    for no in ORDER:
        col, mk, _ = TYPE_STYLE[TABLE[no][0]]
        ax.plot(range(len(named)), [ranks[(b, no)] for b in named], "-", color=col, lw=0.8,
                marker=mk, ms=3.0, mec="black", mew=0.35, zorder=3)
        ax.text(len(named) - 1 + 0.13, ranks[(named[-1], no)], str(no), fontsize=5.8,
                va="center", color=col)
    ax.set_xticks(range(len(named)))
    ax.set_xticklabels(["%.2f" % b for b in named])
    ax.set_yticks(range(1, len(ORDER) + 1))
    ax.invert_yaxis()
    ax.set_xlim(-0.18, len(named) - 0.62)
    ax.set_xlabel("border threshold")
    ax.set_ylabel("rank by aligned fraction, protan")
    ax.set_title("(b)   Spearman vs 1.15:  " +
                 ",  ".join("%.2f $\\rho$=%+.3f" % (b, rho[b]) for b in named[1:]),
                 loc="left", pad=3, fontsize=6.8)
    save(fig, out, "Figure4_sensitivity")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--svg-dir", default=".")
    ap.add_argument("--out", default=os.path.join(ROOT, "research", "plate-audit", "figures"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    rcparams()
    plates = load_plates(a.svg_dir)
    res = checks(plates, a.svg_dir)
    print("FIGURES")
    fig1_geometry(plates, a.out)
    fig2_compactness(plates, res, a.out)
    fig3_taxonomy(res, a.out)
    fig4_sensitivity(res, a.out)


if __name__ == "__main__":
    main()
