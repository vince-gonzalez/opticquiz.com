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
# Copunctal points in CIE 1931 xy for the Smith & Pokorny (1975) fundamentals: the
# chromaticities of stimuli exciting one cone class alone, where that deficiency's confusion
# lines meet. These are NOT free constants - the matrix determines them.
#
# VERIFY ANY CANDIDATE IN ONE LINE: feed (x, y, 1-x-y) through SP and check that the other two
# cones null. Residuals for the values below are <= 3e-4. Two values that were in this file and
# are wrong for this matrix, both caught by that test:
#   deutan (1.080, -0.080)  - wrong until 2026-08-09; correct is (1.400, -0.400)
#   tritan (0.171,  0.000)  - wrong until 2026-08-10, residual 7e-4; correct is (0.1748, 0.000),
#                             which is also the published Smith & Pokorny value
# A protan value of (0.7635, 0.2365) circulates and does NOT belong to this matrix - it leaves
# M at -0.0104. Do not substitute it.
COPUNCTAL = {"protan": (0.747, 0.253), "deutan": (1.400, -0.400), "tritan": (0.1748, 0.000)}

SKIP_DIRS = {"node_modules", ".git", "dist", "__pycache__"}

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
    # Find each palette by its NAME and then pull the fg/bg blocks that follow, rather than
    # matching a whole-entry shape. /color/ writes one property per line and /color/kids/
    # writes each palette on a single line; a pattern that assumed the first silently parsed
    # ZERO palettes out of the second and this tool reported it as clean.
    body = m.group(1)
    out = {}
    # Filter to top-level palette names FIRST, then slice between consecutive ones. Deciding
    # the boundary inside the loop let a chunk run to the end of the object, so every palette
    # read the LAST fg/bg in the file and all of them reported identical angles.
    names = [x for x in re.finditer(r"(\w+)\s*:\s*\{", body) if x.group(1) not in ("fg", "bg")]
    for i, nm in enumerate(names):
        name = nm.group(1)
        end = names[i + 1].start() if i + 1 < len(names) else len(body)
        chunk = body[nm.end():end]
        band = {}
        for side, fields in re.findall(r"(fg|bg)\s*:\s*\{([^}]*)\}", chunk):
            band[side] = {k: float(v) for k, v in re.findall(r"(\w+)\s*:\s*(-?[\d.]+)", fields)}
        if "fg" in band and "bg" in band:
            out[name] = band
    return out


def pages_with_palettes():
    """EVERY page defining a PALETTES object, discovered rather than listed.

    This used to check only /color/. /color/kids/ keeps its own copy of the same constants,
    so when the broken tritan palette was corrected on one page the other kept it and this
    gate still reported all clear. A gate with a hardcoded file list has a blind spot exactly
    the shape of whatever someone duplicated.
    """
    out = []
    for path in sorted(ROOT.rglob("index.html")):
        if SKIP_DIRS & set(path.parts):
            continue
        if "var PALETTES" in path.read_text(encoding="utf-8", errors="replace"):
            out.append(path)
    return out


def report_palettes(pals):
    bad = 0
    for name, band in pals.items():
        fg, bg = centroid(band["fg"]), centroid(band["bg"])
        if name == "control":
            print("  %-10s %-8s %9s   %s" % (name, "-", "n/a",
                  "lightness contrast by design, no hue axis to test"))
            continue
        kinds = ["protan", "deutan"] if name == "rg" else ["tritan"]
        for k in kinds:
            d = deviation(fg, bg, k)
            ok = d <= WARN_DEG
            if not ok:
                bad += 1
            print("  %-10s %-8s %8.1f°   %s" % (name, k, d,
                  "on axis" if ok else "OFF AXIS - this plate does not screen for " + k))
    return bad


def main():
    pages = pages_with_palettes()
    if not pages:
        print("no page defines PALETTES"); return 1

    print("Stimulus alignment with the confusion axis it claims to test")
    print("(0 = perfectly on axis, 90 = the deficiency sees it clearly)\n")
    bad = 0
    for page in pages:
        print(str(page.relative_to(ROOT)).replace("\\", "/"))
        pals = palettes_from(page)
        # A page that declares PALETTES and yields none means the PARSER failed, not that the
        # page is clean. Reporting that as a pass is how the kids page kept a broken tritan
        # palette through a run of this very tool.
        if not pals:
            print("  PARSE FAILED - page declares PALETTES but none could be read")
            bad += 1
            print()
            continue
        print("  %-10s %-8s %9s   %s" % ("palette", "axis", "deviation", "verdict"))
        bad += report_palettes(pals)
        print()
    if bad:
        print("%d palette/axis pair(s) off axis. A plate separated across the confusion line" % bad)
        print("is readable by the people it is supposed to screen.")
        return 1
    print("all palettes lie on the axis they claim to test.")
    return 0


# ─────────────────────────────────────────────────────────────────────────────
# Part 2: tests that NAME a deficiency in their own copy.
#
# /hue/ and /sat/ run staircases rather than showing plates, then tell the user which
# deficiency their result implicates. The psychophysics can be perfectly sound while that
# sentence is wrong, and the sentence is what the user actually reads and repeats. So the
# claim gets checked against simulation the same way a plate does.
# ─────────────────────────────────────────────────────────────────────────────

def _hx(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360.0, l / 100.0, s / 100.0)
    return "#%02X%02X%02X" % (round(r * 255), round(g * 255), round(b * 255))


def _engine():
    sys.path.insert(0, str(ROOT / "packages" / "cvd-py"))
    import opticquiz_cvd as q
    return q


def check_hue(q):
    """Each /hue/ pair should collapse hardest for the deficiency its own label names."""
    src = (ROOT / "hue" / "index.html").read_text(encoding="utf-8")
    m = re.search(r"var NEIGHBORHOODS\s*=\s*\[(.*?)\n\];", src, re.S)
    if not m:
        return [], 0
    rows, bad = [], 0
    for blk in re.findall(r"\{(.*?)\n  \}", m.group(1), re.S):
        def g(k):
            mm = re.search(k + r':\s*"?([^,"\n]+)', blk)
            return mm.group(1).strip() if mm else None
        a, b = g("swatchA"), g("swatchB")
        if a is None or b is None or a == b:
            continue                       # equal-hue pairs vary by chroma, not hue angle
        L = float(g("L") or 55)
        S = float(g("S") or 62)
        A, B = _hx(float(a), S, L), _hx(float(b), S, L)
        de = dict((t, q.delta_e(q.simulate(A, t), q.simulate(B, t))) for t in COPUNCTAL)
        actual = min(de, key=de.get)
        claim = (g("clinical") or "").lower()
        ok = actual in claim
        if not ok:
            bad += 1
        rows.append((g("key"), g("clinical") or "", q.delta_e(A, B), de, actual, ok))
    return rows, bad


def check_sat(q):
    """Each /sat/ axis should need MORE saturation under the deficiency it names."""
    src = (ROOT / "sat" / "index.html").read_text(encoding="utf-8")
    m = re.search(r"var AXES\s*=\s*\[(.*?)\n\];", src, re.S)
    if not m:
        return [], 0
    GREY = "#999999"
    rows, bad = [], 0
    for blk in re.findall(r"\{([^}]*)\}", m.group(1)):
        hm = re.search(r"\bhue:\s*(\d+)", blk)
        sm = re.search(r'subLabel:\s*"([^"]*)"', blk)
        if not hm or not sm:
            continue
        hue, claim = int(hm.group(1)), sm.group(1)
        thr = {}
        for t in [None] + list(COPUNCTAL):
            thr[t or "normal"] = 99
            for s in range(1, 81):
                c = _hx(hue, s, 60)
                a = c if t is None else q.simulate(c, t)
                gg = GREY if t is None else q.simulate(GREY, t)
                if q.delta_e(a, gg) >= 5:
                    thr[t or "normal"] = s
                    break
        named = [t for t in COPUNCTAL if t in claim.lower()]
        worst = max(COPUNCTAL, key=lambda t: thr[t])
        ok = all(thr[t] > thr["normal"] for t in named) and bool(named)
        if not ok:
            bad += 1
        rows.append((hue, claim, thr, worst, ok, named))
    return rows, bad


def main2():
    q = _engine()
    bad = 0

    rows, b = check_hue(q)
    bad += b
    print("\n/hue/ - does each pair collapse for the deficiency its label names?")
    print("(lower dE = harder for that deficiency to tell apart)\n")
    print("%-16s %-26s %7s %7s %7s %7s  %s"
          % ("pair", "label says", "normal", "protan", "deutan", "tritan", "actually"))
    for key, claim, dn, de, actual, ok in rows:
        print("%-16s %-26s %7.1f %7.1f %7.1f %7.1f  %-7s %s"
              % (key, claim[:26], dn, de["protan"], de["deutan"], de["tritan"], actual,
                 "" if ok else "<-- MISLABELLED"))

    rows, b = check_sat(q)
    bad += b
    print("\n/sat/ - does the named deficiency actually need more saturation to see the hue?")
    print("(threshold = lowest saturation still >= 5 dE2000 from mid-grey)\n")
    print("%-6s %-22s %7s %7s %7s %7s  %s"
          % ("hue", "label says", "normal", "protan", "deutan", "tritan", ""))
    for hue, claim, thr, worst, ok, named in rows:
        print("%-6d %-22s %7d %7d %7d %7d  %s"
              % (hue, claim[:22], thr["normal"], thr["protan"], thr["deutan"], thr["tritan"],
                 "" if ok else "<-- claim not supported (worst is %s)" % worst))
    return bad


if __name__ == "__main__":
    sys.exit(main() + main2())
