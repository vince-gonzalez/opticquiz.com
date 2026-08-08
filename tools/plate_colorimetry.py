#!/usr/bin/env python3
"""Measure how far a pseudoisochromatic plate's figure/ground separation deviates from the
confusion axis it claims to test - working from the DELIVERED IMAGE rather than from source.

    python tools/plate_colorimetry.py --self-test
    python tools/plate_colorimetry.py --image plate.png --axis deutan

tools/confusion_axis.py answers this question for our own plates by reading the declared HSL
ranges out of the source. That only works on a test whose source you have. Every fixed-image
online reproduction of the Ishihara plates serves a scanned JPEG instead, and a scan that has
been colour-managed, resized and recompressed is not necessarily still on the axis the original
print was designed for. Nobody appears to have measured that.

This module measures the same angle from pixels, so the two methods are comparable and one can
validate the other.

METHOD
  1. Discard the paper: drop near-white and near-black pixels.
  2. Discard dot edges: keep only pixels whose 3x3 neighbourhood is uniform. Antialiasing and
     JPEG ringing invent colours that are on neither the figure nor the ground, and those
     intermediate pixels sit BETWEEN the two clusters, which would bias any centroid toward
     the midpoint and make every plate look better aligned than it is.
  3. Cluster the survivors into k chromatic groups in CIE xy, weighted by pixel count.
  4. Take the two largest groups as figure and ground.
  5. Compare, at the figure centroid, the direction toward the copunctal point (the way colour
     slides together for this deficiency) against the direction to the ground centroid (the way
     this plate actually separates figure from ground).

  0 degrees  = separation lies along the confusion line; the deficiency collapses it.
  90 degrees = separation is orthogonal; the deficiency sees the figure perfectly.

The angle is direction-agnostic - it does not matter which cluster is figure and which is
ground, because a line and its reverse describe the same axis. That is what makes the
measurement possible without knowing the answer key.

Copunctal points are the standard model constants (Wyszecki & Stiles 1982, section 5), matching
tools/confusion_axis.py. They are not measurements of any individual observer.
"""
import argparse
import colorsys
import json
import math
import random
import sys

import numpy as np

COPUNCTAL = {"protan": (0.747, 0.253), "deutan": (1.080, -0.080), "tritan": (0.171, 0.000)}

# A plate whose separation exceeds this is separating figure from ground in a direction the
# deficiency can still see. Not a standard - the same line tools/confusion_axis.py draws.
WARN_DEG = 25.0


# ---------------------------------------------------------------- colour conversion

def srgb_to_xy_array(rgb):
    """(N,3) uint8 or float 0..255 sRGB -> (N,2) CIE 1931 xy.

    Identical linearisation and matrix to tools/confusion_axis.py, vectorised.
    """
    v = np.asarray(rgb, dtype=np.float64) / 255.0
    lin = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    r, g, b = lin[:, 0], lin[:, 1], lin[:, 2]
    X = 0.4124 * r + 0.3576 * g + 0.1805 * b
    Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    Z = 0.0193 * r + 0.1192 * g + 0.9505 * b
    s = X + Y + Z
    s = np.where(s == 0, 1e-12, s)
    return np.stack([X / s, Y / s], axis=1)


def axis_deviation_deg(fg_xy, bg_xy, axis, anchor="mean"):
    """Angle between the confusion direction and the separation direction, folded to 0..90.

    anchor decides which chromaticity the confusion line is drawn through:

      "mean"   the midpoint of the pair. This is the published metric - Dain (2004), Visual
               Neuroscience 21:437-443, compares the spread of a confusable colour group against
               the confusion line through its MEAN chromaticity. It is also independent of which
               population is figure and which is ground, which matters when the answer key is the
               thing being tested.
      "figure" the figure centroid. What tools/confusion_axis.py has always used.

    The two agree closely for pairs that sit near each other, and diverge sharply for pairs that
    do not: on the tritan palette that shipped before July 2026 - blue figure against a rose
    ground, far apart in xy - "figure" gives 56.4 degrees and "mean" gives 31.4. Both are past
    any sane threshold, so no verdict changes, but only "mean" is comparable to the literature.
    """
    cx, cy = COPUNCTAL[axis]
    if anchor == "mean":
        ax_, ay_ = (fg_xy[0] + bg_xy[0]) / 2.0, (fg_xy[1] + bg_xy[1]) / 2.0
    elif anchor == "figure":
        ax_, ay_ = fg_xy[0], fg_xy[1]
    else:
        raise ValueError("anchor must be 'mean' or 'figure'")
    conf = (ax_ - cx, ay_ - cy)
    sep = (bg_xy[0] - fg_xy[0], bg_xy[1] - fg_xy[1])
    nc = math.hypot(*conf)
    ns = math.hypot(*sep)
    if nc == 0 or ns == 0:
        return float("nan")
    cos = (conf[0] * sep[0] + conf[1] * sep[1]) / (nc * ns)
    deg = math.degrees(math.acos(max(-1.0, min(1.0, cos))))
    return 180.0 - deg if deg > 90.0 else deg


def verdict(deg):
    if deg != deg:
        return "not measurable"
    return "on axis" if deg <= WARN_DEG else "OFF AXIS"


# ---------------------------------------------------------------- declared-range path

def sample_hsl_range(spec, n=7):
    """Grid-sample a declared HSL band and return the mean xy.

    Range-sampled rather than midpoint, so a palette cannot read as on-axis at its centre
    while drifting off at its edges.
    """
    pts = []
    for h in np.linspace(spec["hMin"], spec["hMax"], n):
        for s in np.linspace(spec["sMin"], spec["sMax"], 3):
            for l in np.linspace(spec["lMin"], spec["lMax"], 3):
                r, g, b = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
                pts.append((r * 255, g * 255, b * 255))
    xy = srgb_to_xy_array(pts)
    return (float(xy[:, 0].mean()), float(xy[:, 1].mean()))


def measure_declared(fg_spec, bg_spec, axis, anchor="mean"):
    return axis_deviation_deg(sample_hsl_range(fg_spec), sample_hsl_range(bg_spec), axis,
                              anchor=anchor)


# ---------------------------------------------------------------- image path

def uniform_interior_mask(arr, tol=6):
    """True where the 3x3 neighbourhood is uniform within tol, per channel.

    Removes antialiased dot rims and JPEG ringing. Those pixels lie between the figure and
    ground colours and would drag both centroids toward each other, understating deviation.
    """
    a = arr.astype(np.int16)
    h, w, _ = a.shape
    mx = np.full((h, w, 3), -32768, dtype=np.int16)
    mn = np.full((h, w, 3), 32767, dtype=np.int16)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            sh = np.roll(np.roll(a, dy, axis=0), dx, axis=1)
            mx = np.maximum(mx, sh)
            mn = np.minimum(mn, sh)
    flat = ((mx - mn) <= tol).all(axis=2)
    flat[0, :] = flat[-1, :] = flat[:, 0] = flat[:, -1] = False
    return flat


def chroma_of(rgb):
    """Distance from the achromatic axis, 0..1 - used only to identify the paper cluster."""
    a = np.asarray(rgb, dtype=np.float64)
    mx = a.max(axis=-1)
    mn = a.min(axis=-1)
    return np.where(mx == 0, 0.0, (mx - mn) / 255.0)


def measure_image(path, axis, k=2, max_pixels=400000, seed=0, chroma_floor=0.06):
    """Measure deviation from a delivered plate image. Returns a dict of everything measured.

    Clustering happens in CIE xy, not RGB, and each cluster's chromaticity is the mean of its
    members' xy. Averaging in RGB and converting afterwards is wrong here: both the sRGB
    transfer function and the xy perspective division are nonlinear, so the RGB centroid does
    not map to the mean chromaticity. Measured against the declared-range method on a known
    stimulus, that error alone reached 36 degrees - larger than the effect being measured.

    k defaults to 2 because paper and ink are removed by threshold before clustering. Asking
    for a third cluster when only two plate colours remain splits the dominant colour, and
    selecting by cluster size then returns two halves of the background.
    """
    from PIL import Image
    from sklearn.cluster import KMeans

    im = Image.open(path).convert("RGB")
    arr = np.asarray(im)
    interior = uniform_interior_mask(arr)

    rgb = arr[interior]
    if rgb.size == 0:
        return {"error": "no uniform interior pixels - image may be heavily compressed or tiny"}

    # Drop paper and ink: near-white, near-black, and anything close to the achromatic axis
    # (interstitial grey that survived the white threshold).
    keep = (rgb.max(axis=1) < 246) & (rgb.min(axis=1) > 12) & (chroma_of(rgb) >= chroma_floor)
    rgb = rgb[keep]
    if len(rgb) < 500:
        return {"error": "fewer than 500 usable dot pixels after filtering (n=%d)" % len(rgb)}

    if len(rgb) > max_pixels:
        idx = np.random.default_rng(seed).choice(len(rgb), max_pixels, replace=False)
        rgb = rgb[idx]

    xy = srgb_to_xy_array(rgb)
    km = KMeans(n_clusters=k, n_init=10, random_state=seed).fit(xy)
    counts = np.bincount(km.labels_, minlength=k)

    # Figure and ground are the two most chromatically SEPARATED clusters, not the two largest.
    # The figure occupies a small fraction of a plate, so size is the wrong selector.
    means = np.stack([xy[km.labels_ == i].mean(axis=0) for i in range(k)])
    best = None
    for i in range(k):
        for jj in range(i + 1, k):
            d = math.hypot(*(means[i] - means[jj]))
            if best is None or d > best[0]:
                best = (d, i, jj)
    _, a, b = best

    deg = axis_deviation_deg(tuple(means[a]), tuple(means[b]), axis)
    rgb_means = np.stack([rgb[km.labels_ == i].mean(axis=0) for i in (a, b)])
    return {
        "axis": axis,
        "deviation_deg": round(deg, 1) if deg == deg else None,
        "verdict": verdict(deg),
        "cluster_a_xy": [round(float(v), 4) for v in means[a]],
        "cluster_b_xy": [round(float(v), 4) for v in means[b]],
        "cluster_a_rgb_mean": [int(round(c)) for c in rgb_means[0]],
        "cluster_b_rgb_mean": [int(round(c)) for c in rgb_means[1]],
        "cluster_a_pixels": int(counts[a]),
        "cluster_b_pixels": int(counts[b]),
        "usable_pixels": int(len(rgb)),
        "k": k,
    }


# ---------------------------------------------------------------- synthetic plate, for the control

def render_synthetic_plate(fg_spec, bg_spec, path, size=480, seed=1):
    """Render a plate from declared HSL ranges the way the browser engine does.

    Only purpose: give the image path a stimulus whose correct answer is already known from the
    declared-range path, so the two methods can be compared. A figure region is filled from
    fg_spec, the rest from bg_spec, as non-overlapping dots on white.
    """
    from PIL import Image, ImageDraw
    rnd = random.Random(seed)
    im = Image.new("RGB", (size, size), (255, 255, 255))
    d = ImageDraw.Draw(im)

    cx = cy = size / 2.0
    R = size / 2.0 - 3
    # Figure: a filled band across the middle. Shape is irrelevant to the measurement; only
    # the colour populations matter.
    fig_y0, fig_y1 = size * 0.38, size * 0.62

    placed = []
    rmin, rmax = size * 0.0085, size * 0.020
    for _ in range(70000):
        if len(placed) >= 5200:
            break
        r = rnd.uniform(rmin, rmax)
        x = rnd.uniform(r, size - r)
        y = rnd.uniform(r, size - r)
        if math.hypot(x - cx, y - cy) > R - r:
            continue
        ok = True
        for (px, py, pr) in placed[-400:]:
            if (x - px) ** 2 + (y - py) ** 2 < (r + pr + 1) ** 2:
                ok = False
                break
        if not ok:
            continue
        placed.append((x, y, r))
        spec = fg_spec if fig_y0 <= y <= fig_y1 else bg_spec
        h = rnd.uniform(spec["hMin"], spec["hMax"])
        s = rnd.uniform(spec["sMin"], spec["sMax"])
        l = rnd.uniform(spec["lMin"], spec["lMax"])
        rr, gg, bb = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
        d.ellipse([x - r, y - r, x + r, y + r],
                  fill=(int(rr * 255), int(gg * 255), int(bb * 255)))
    im.save(path)
    return path, len(placed)


# ---------------------------------------------------------------- the live palettes

PALETTES = {
    "rg": {
        "fg": {"hMin": 96, "hMax": 145, "sMin": 40, "sMax": 60, "lMin": 50, "lMax": 68},
        "bg": {"hMin": 15, "hMax": 44, "sMin": 46, "sMax": 68, "lMin": 50, "lMax": 68},
        "axes": ["protan", "deutan"],
    },
    "tritan": {
        "fg": {"hMin": 175, "hMax": 200, "sMin": 50, "sMax": 72, "lMin": 52, "lMax": 68},
        "bg": {"hMin": 115, "hMax": 135, "sMin": 50, "sMax": 72, "lMin": 52, "lMax": 68},
        "axes": ["tritan"],
    },
    # The palette that shipped before July 2026, kept as a positive control: it is known to be
    # off axis, so any method that calls it on-axis is broken.
    "tritan_pre_fix": {
        "fg": {"hMin": 205, "hMax": 240, "sMin": 50, "sMax": 72, "lMin": 52, "lMax": 68},
        "bg": {"hMin": 328, "hMax": 352, "sMin": 50, "sMax": 72, "lMin": 52, "lMax": 68},
        "axes": ["tritan"],
    },
}


def self_test(tmpdir="."):
    """Does the image method reproduce the declared-range method on a stimulus we control?

    This is the only thing that licenses using the image method on somebody else's plates.
    It also checks the method can still FAIL, by running the known-broken pre-fix palette.
    """
    import os
    print("Control: image method vs declared-range method, same stimulus\n")
    print("  %-16s %-8s %10s %10s %8s" % ("palette", "axis", "declared", "image", "delta"))
    rows = []
    for name, p in PALETTES.items():
        img = os.path.join(tmpdir, "synth_%s.png" % name)
        _, ndots = render_synthetic_plate(p["fg"], p["bg"], img)
        for axis in p["axes"]:
            dec = measure_declared(p["fg"], p["bg"], axis)
            res = measure_image(img, axis)
            if "error" in res:
                print("  %-16s %-8s %10.1f %10s %8s   %s"
                      % (name, axis, dec, "ERR", "-", res["error"]))
                rows.append({"palette": name, "axis": axis, "error": res["error"]})
                continue
            img_deg = res["deviation_deg"]
            delta = abs(dec - img_deg)
            print("  %-16s %-8s %10.1f %10.1f %8.1f" % (name, axis, dec, img_deg, delta))
            rows.append({"palette": name, "axis": axis, "declared_deg": round(dec, 1),
                         "image_deg": img_deg, "delta_deg": round(delta, 1),
                         "dots": ndots, "usable_pixels": res["usable_pixels"]})
    print()
    ok = True
    agree = [r for r in rows if "delta_deg" in r]
    worst = max((r["delta_deg"] for r in agree), default=99)
    if worst > 5.0:
        print("  FAIL: image method disagrees with declared method by up to %.1f deg" % worst)
        ok = False
    else:
        print("  PASS: methods agree within %.1f deg" % worst)
    # The gate must be able to fail: the pre-fix palette is known off axis.
    pre = [r for r in agree if r["palette"] == "tritan_pre_fix"]
    if pre and pre[0]["image_deg"] is not None and pre[0]["image_deg"] <= WARN_DEG:
        print("  FAIL: known-broken pre-fix palette measured as on axis (%.1f deg) - "
              "the measurement cannot detect the defect it exists to catch"
              % pre[0]["image_deg"])
        ok = False
    elif pre:
        print("  PASS: known-broken pre-fix palette still measures OFF AXIS at %.1f deg"
              % pre[0]["image_deg"])
    return ok, rows


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--image", help="a delivered plate image to measure")
    ap.add_argument("--axis", choices=sorted(COPUNCTAL), help="confusion axis the plate claims")
    ap.add_argument("--k", type=int, default=3, help="clusters (3 = two plate colours + paper)")
    ap.add_argument("--self-test", action="store_true",
                    help="validate the image method against the declared-range method")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    if a.self_test:
        ok, rows = self_test()
        if a.json:
            print(json.dumps(rows, indent=2))
        return 0 if ok else 1

    if not a.image or not a.axis:
        ap.error("--image and --axis are required unless --self-test")
    res = measure_image(a.image, a.axis, k=a.k)
    print(json.dumps(res, indent=2) if a.json else res)
    return 1 if "error" in res else 0


if __name__ == "__main__":
    sys.exit(main())
