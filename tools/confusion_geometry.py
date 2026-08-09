#!/usr/bin/env python3
"""Confusion directions CONSTRUCTED from a cone model, not looked up as copunctal points.

    python tools/confusion_geometry.py --validate
    python tools/confusion_geometry.py --compare-spaces

Two problems with taking confusion lines from tabulated copunctal points in CIE 1931 xy.

First, the coordinates are contested. Li, Zhao, Fu & Guo (2026, JOSA A 43:1084-1095,
10.1364/JOSAA.590911) report that Smith & Pokorny protan confusion lines produced minimal
confusion effect in their observers and raise the possibility of inaccuracy in the theoretical
line itself. A measurement resting on a single tabulated constant inherits that doubt.

Second, the space is not universal. Zhang et al. (2026, Opt Express 34:7239-7260,
10.1364/OE.582288) work in cone-fundamental chromaticity xF yF using the CIE 2006 2 degree
colour matching functions, not CIE 1931 xy. A deviation angle measured in one chromaticity
diagram is not automatically the same angle in another, because the transform between them is
projective and does not preserve angles.

Both problems dissolve if the confusion direction is CONSTRUCTED instead of retrieved. A
dichromat confuses exactly those colours that differ only in the excitation of the cone class
they lack. So at any chromaticity, the confusion direction is found by converting to cone
excitations, varying the missing cone alone, and converting back. That is the definition, it
needs no tabulated copunctal point, and it can be carried out in whatever chromaticity space
the comparison requires.

The construction is validated, not asserted: confusion lines built this way must converge on the
copunctal points reported in the literature. --validate checks that they do, which is what
licenses using the construction in place of the constant.

Cone model is Smith & Pokorny (1975), the linear transform of CIE 1931 XYZ that the classical
confusion-line and MacLeod-Boynton literature is built on.
"""
import argparse
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Smith & Pokorny (1975) cone fundamentals as a linear transform of CIE 1931 XYZ.
# Rows are L, M, S. This is the transform underlying MacLeod-Boynton chromaticity and the
# classical dichromatic confusion-line geometry.
SP = np.array([
    [0.15514,  0.54312, -0.03286],
    [-0.15514, 0.45684,  0.03286],
    [0.0,      0.0,      0.01608],
], dtype=np.float64)
SP_INV = np.linalg.inv(SP)

# Literature copunctal points in CIE 1931 xy, used ONLY as the validation target.
# Copunctal points in CIE 1931 xy: the chromaticities of stimuli that excite one cone
# class alone, where that deficiency's confusion lines meet.
#
# The deutan value was (1.080, -0.080) until 2026-08-09 and that was WRONG. Constructing the
# confusion lines from the Smith & Pokorny (1975) cone fundamentals and solving for where they
# converge gives (1.3999, -0.3999) with a least-squares residual of 6e-15, and the published
# value is (1.40, -0.40) - see tools/confusion_geometry.py --validate, which reproduces protan
# to 0.0007 and tritan to 0.0038 by the same construction. Every deutan figure computed before
# that date was measured against an axis 0.45 units away from the real one.
COPUNCTAL_REF = {"protan": (0.747, 0.253), "deutan": (1.400, -0.400), "tritan": (0.171, 0.000)}

# Which cone each deficiency lacks.
MISSING = {"protan": 0, "deutan": 1, "tritan": 2}


def xy_to_XYZ(x, y, Y=1.0):
    if y == 0:
        return np.array([0.0, 0.0, 0.0])
    return np.array([x * Y / y, Y, (1.0 - x - y) * Y / y])


def XYZ_to_xy(XYZ):
    s = XYZ.sum()
    if s == 0:
        return (0.0, 0.0)
    return (float(XYZ[0] / s), float(XYZ[1] / s))


def XYZ_to_LMS(XYZ):
    return SP @ XYZ


def LMS_to_XYZ(LMS):
    return SP_INV @ LMS


def XYZ_to_MB(XYZ):
    """MacLeod-Boynton chromaticity (l, s) = (L/(L+M), S/(L+M)). Miyahara (2009) analysed
    Ishihara plate chromaticities in this space."""
    L, M, S = XYZ_to_LMS(XYZ)
    d = L + M
    if d == 0:
        return (0.0, 0.0)
    return (float(L / d), float(S / d))


def XYZ_to_uv(XYZ):
    """CIE 1976 u' v'. Included because it is more nearly uniform than xy, so an angle measured
    in it is a different projective distortion of the same physical relationship."""
    X, Y, Z = XYZ
    d = X + 15.0 * Y + 3.0 * Z
    if d == 0:
        return (0.0, 0.0)
    return (float(4.0 * X / d), float(9.0 * Y / d))


SPACES = {"xy": XYZ_to_xy, "mb": XYZ_to_MB, "uv": XYZ_to_uv}


def confusion_direction(x, y, axis, space="xy", eps=0.02):
    """Direction, in `space`, along which only the missing cone's excitation changes.

    Constructed by perturbing that cone up and down and projecting both results into the target
    space. The chord between them is the confusion direction at this chromaticity. Symmetric
    perturbation keeps it first-order accurate.
    """
    idx = MISSING[axis]
    XYZ = xy_to_XYZ(x, y)
    LMS = XYZ_to_LMS(XYZ)
    scale = abs(LMS[idx]) if abs(LMS[idx]) > 1e-9 else 1e-3
    out = []
    for sgn in (+1.0, -1.0):
        L2 = LMS.copy()
        L2[idx] = LMS[idx] + sgn * eps * scale
        out.append(np.array(SPACES[space](LMS_to_XYZ(L2))))
    d = out[0] - out[1]
    n = np.linalg.norm(d)
    return d / n if n > 0 else d


def project(x, y, space="xy"):
    return np.array(SPACES[space](xy_to_XYZ(x, y)))


def deviation(fg_xy, bg_xy, axis, space="xy"):
    """Angle between the constructed confusion direction and the figure/ground separation,
    both expressed in `space`, folded to 0..90 degrees.

    The confusion direction is taken at the MEAN chromaticity of the pair, matching Dain (2004).
    """
    f = project(*fg_xy, space=space)
    g = project(*bg_xy, space=space)
    mid_xy = ((fg_xy[0] + bg_xy[0]) / 2.0, (fg_xy[1] + bg_xy[1]) / 2.0)
    c = confusion_direction(*mid_xy, axis=axis, space=space)
    sep = g - f
    ns = np.linalg.norm(sep)
    if ns == 0 or np.linalg.norm(c) == 0:
        return float("nan")
    cos = float(np.dot(c, sep) / (np.linalg.norm(c) * ns))
    deg = math.degrees(math.acos(max(-1.0, min(1.0, cos))))
    return 180.0 - deg if deg > 90.0 else deg


# ---------------------------------------------------------------- space-free measure

def residual_visibility(a_xy, b_xy, axis):
    """Of the cone-excitation change between two colours, what FRACTION stays visible to an
    observer lacking cone `axis`? 0 = collapses completely, 1 = fully visible.

    Why this exists. An angle between the figure/ground separation and a confusion line is not a
    well-defined quantity, because it depends on which chromaticity diagram it is drawn in. The
    same physically off-axis pair measures 42.0 degrees in CIE 1931 xy, 7.8 in MacLeod-Boynton and
    27.7 in CIE 1976 u'v'. That is not a bug in any of the three: MacLeod-Boynton's axes are
    L/(L+M), a dimensionless ratio, and S/(L+M), unbounded and in different units, so an angle
    between vectors there has no physical meaning at all. Angles reported from plate colorimetry
    are therefore not intercomparable between studies that used different diagrams - which is
    every pair of studies in the field.

    The physics is about cone excitation, so measure it there. A dichromat missing cone k sees two
    colours as identical exactly when the remaining two cones stand in the same ratio. So the
    signal that survives the deficiency is the change in the log-ratio of the two remaining cones,
    and the signal it discards is the change in log excitation of the missing cone. Their relative
    size is the answer, and being computed in LMS it cannot depend on any chromaticity diagram.

    Validated by construction:
      a pair differing ONLY in the missing cone returns exactly 0 for all three deficiencies;
      a pair differing in the remaining cones' ratio returns 0.68 to 0.86.
    """
    import math as _m
    k = MISSING[axis]
    o = [j for j in range(3) if j != k]
    A = np.clip(XYZ_to_LMS(xy_to_XYZ(*a_xy)), 1e-9, None)
    B = np.clip(XYZ_to_LMS(xy_to_XYZ(*b_xy)), 1e-9, None)
    # Chromaticity carries no absolute level, so normalise out overall scale before comparing.
    A = A / A[o].sum()
    B = B / B[o].sum()
    visible = abs(_m.log(B[o[0]] / B[o[1]]) - _m.log(A[o[0]] / A[o[1]]))
    invisible = abs(_m.log(B[k]) - _m.log(A[k]))
    t = visible + invisible
    return visible / t if t > 0 else 0.0


# ---------------------------------------------------------------- validation

def fit_convergence(axis, samples=None):
    """Where do the constructed confusion lines meet in CIE 1931 xy?

    Each line is a point plus a direction. Their common intersection is found by least squares:
    for every line, the component of (p - q) perpendicular to its direction must vanish at the
    copunctal point q. If the construction is right, q lands on the literature value.
    """
    if samples is None:
        samples = [(0.25, 0.25), (0.30, 0.35), (0.40, 0.40), (0.45, 0.30),
                   (0.35, 0.45), (0.28, 0.40), (0.50, 0.35), (0.33, 0.33)]
    A, b = [], []
    for (x, y) in samples:
        d = confusion_direction(x, y, axis, space="xy")
        nrm = np.array([-d[1], d[0]])                 # normal to the line
        A.append(nrm)
        b.append(nrm @ np.array([x, y]))
    A, b = np.array(A), np.array(b)
    q, *_ = np.linalg.lstsq(A, b, rcond=None)
    resid = float(np.abs(A @ q - b).max())
    return (float(q[0]), float(q[1])), resid


def validate():
    print("Do CONSTRUCTED confusion lines converge on the published copunctal points?\n")
    print("  %-8s %-22s %-22s %10s %8s" % ("axis", "constructed", "literature", "dist", "resid"))
    ok = True
    for axis, ref in COPUNCTAL_REF.items():
        q, resid = fit_convergence(axis)
        dist = math.hypot(q[0] - ref[0], q[1] - ref[1])
        good = dist < 0.02 and resid < 1e-6
        ok &= good
        print("  %-8s (%7.4f,%8.4f)  (%7.4f,%8.4f) %10.4f %8.1e  %s"
              % (axis, q[0], q[1], ref[0], ref[1], dist, resid, "OK" if good else "FAIL"))
    print()
    if ok:
        print("  PASS: the Smith & Pokorny construction reproduces all three copunctal points, so")
        print("  the confusion direction can be built per-chromaticity instead of read from a")
        print("  table - which removes the dependence Li et al. (2026) call into question.")
    else:
        print("  FAIL: construction disagrees with the literature copunctal points. Do not use it.")
    return ok


def compare_spaces():
    """Is the multi-colour reduction disagreement an artefact of CIE 1931 xy?

    Recomputes the three reductions of the ZEISS plates in three chromaticity spaces. If the
    disagreement survives all of them it is a property of the pooling, not of the diagram.
    """
    import glob
    import json
    from svg_dot_geometry import extract, drop_backdrop
    from svg_plate_colorimetry import hex_to_rgb, srgb_to_xy as srgb_xy_arr

    ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data = json.load(open(os.path.join(ROOT, "research", "plate-audit",
                                       "delivered-plates.json"), encoding="utf-8"))

    def hex_xy(h):
        return tuple(srgb_xy_arr(np.array([hex_to_rgb(h)], dtype=float))[0])

    def wmean_xy(pairs):
        xs, ws = [], []
        for h, n in pairs:
            xs.append(hex_xy(h))
            ws.append(float(n))
        xs, ws = np.array(xs), np.array(ws)
        w = ws / ws.sum()
        return tuple((xs * w[:, None]).sum(axis=0))

    print("Does the 50-degree pooling disagreement survive a change of chromaticity space?")
    print("Reductions: POOL = all figure colours vs all ground colours;")
    print("            PAIR = dot-count-weighted mean over every figure x ground colour pair.\n")
    rows = []
    for sp in ("xy", "mb", "uv"):
        print("  --- space: %s ---" % sp)
        print("     %-6s %-15s %8s %8s %8s" % ("plate", "type", "POOL", "PAIR", "spread"))
        for p in data["zeiss"]["plates"]:
            fk = "figure_spatial" if "figure_spatial" in p else "figure"
            gk = "ground_spatial" if "ground_spatial" in p else "ground"
            fig, gnd = p[fk], p[gk]
            if not fig or not gnd:
                continue
            pool = deviation(wmean_xy(fig), wmean_xy(gnd), "protan", space=sp)
            num = den = 0.0
            for fh, fn in fig:
                for gh, gn in gnd:
                    w = float(fn) * float(gn)
                    num += w * deviation(hex_xy(fh), hex_xy(gh), "protan", space=sp)
                    den += w
            pair = num / den if den else float("nan")
            print("     %-6s %-15s %8.1f %8.1f %8.1f"
                  % (p["no"], p["type"], pool, pair, abs(pool - pair)))
            rows.append({"space": sp, "plate": p["no"], "pool": pool, "pair": pair})
        print()
    print("  If the POOL-vs-PAIR spread is large in every space, the ill-definedness belongs to")
    print("  the pooling and not to CIE 1931 xy - which is what makes the result space-independent")
    print("  and therefore applicable to work carried out in cone-fundamental chromaticity.")
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--validate", action="store_true")
    ap.add_argument("--compare-spaces", action="store_true")
    a = ap.parse_args()
    if a.validate:
        return 0 if validate() else 1
    if a.compare_spaces:
        compare_spaces()
        return 0
    ap.error("choose --validate or --compare-spaces")


if __name__ == "__main__":
    sys.exit(main())
