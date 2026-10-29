"""opticquiz-cvd — check color palettes for colorblind-safety.

Simulates protanopia, deuteranopia and tritanopia (Machado, Oliveira & Fernandes,
2009; severity-1 matrices applied in linear RGB) and scores perceptual difference
with CIEDE2000, flagging palette pairs that are clearly distinct to normal vision
but collapse under a color-vision-deficiency simulation.

Accepts colors as hex strings ("#d7191c"), or (r, g, b) tuples in 0-1 (matplotlib)
or 0-255 — so it drops straight into a plotting workflow.

Method: https://doi.org/10.5281/zenodo.21310578 · Checker: https://opticquiz.com/checker/
Honest scope: simulates a MODEL of color vision, not any individual's; NOT a legal
accessibility (ADA/WCAG) audit. MIT licensed.
"""
import math
import re

__version__ = "1.2.0"
TYPES = ["protan", "deutan", "tritan"]
MODELS = ["machado", "brettel"]

_M = {
    "protan": [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    "deutan": [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    "tritan": [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}

# Brettel, Vienot & Mollon (1997), on linear RGB. Two projection planes per type; the
# sign of (rgb . normal) selects which. Transcribed from the public-domain reference
# libDaltonLens (Nicolas Burrus). A second, independent model to cross-check Machado.
_B = {
    "protan": {"p1": [[0.14980, 1.19548, -0.34528], [0.10764, 0.84864, 0.04372], [0.00384, -0.00540, 1.00156]],
               "p2": [[0.14570, 1.16172, -0.30742], [0.10816, 0.85291, 0.03892], [0.00386, -0.00524, 1.00139]],
               "n": [0.00048, 0.00393, -0.00441]},
    "deutan": {"p1": [[0.36477, 0.86381, -0.22858], [0.26294, 0.64245, 0.09462], [-0.02006, 0.02728, 0.99278]],
               "p2": [[0.37298, 0.88166, -0.25464], [0.25954, 0.63506, 0.10540], [-0.01980, 0.02784, 0.99196]],
               "n": [-0.00281, -0.00611, 0.00892]},
    "tritan": {"p1": [[1.01277, 0.13548, -0.14826], [-0.01243, 0.86812, 0.14431], [0.07589, 0.80500, 0.11911]],
               "p2": [[0.93678, 0.18979, -0.12657], [0.06154, 0.81526, 0.12320], [-0.37562, 1.12767, 0.24796]],
               "n": [0.03901, -0.02788, -0.01113]},
}


def _clamp01(x):
    return 0.0 if x < 0 else 1.0 if x > 1 else x


# Color parsing is strict. A malformed hex used to reach int(h, 16) and raise something
# opaque ("invalid literal for int() with base 16"), an 8-digit #rrggbbaa had its bytes
# shifted a channel over and silently became the wrong color, a short tuple raised
# IndexError, and an out-of-range component like 300 was silently clamped to 255.
#
# Accepted: a hex string (#rgb, #rgba, #rrggbb, #rrggbbaa — "#" optional, any case,
# alpha parsed and discarded), or an (r, g, b[, a]) sequence in 0-1 or 0-255. The 0-1
# vs 0-255 reading is decided by whether the largest component exceeds 1, which is the
# documented matplotlib-friendly behavior and is unchanged.
_HEX_RE = re.compile(r"^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$")
_COLOR_FORMS = ("Expected a hex color (#rgb, #rgba, #rrggbb, #rrggbbaa) or an"
                " (r, g, b) sequence in 0-1 or 0-255.")


def _to_rgb255(color):
    if isinstance(color, str):
        h = color.strip().lower()
        if h.startswith("#"):
            h = h[1:]
        if not _HEX_RE.match(h):
            raise ValueError("opticquiz-cvd: invalid color %r. Expected a hex color:"
                             " #rgb, #rgba, #rrggbb or #rrggbbaa." % color)
        if len(h) <= 4:
            h = h[0] * 2 + h[1] * 2 + h[2] * 2
        return [int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)]

    try:
        n = len(color)
    except TypeError:
        raise TypeError("opticquiz-cvd: invalid color %r. %s" % (color, _COLOR_FORMS))
    if n not in (3, 4):
        raise ValueError("opticquiz-cvd: invalid color %r: expected 3 or 4 components,"
                         " got %d. %s" % (color, n, _COLOR_FORMS))
    # float() rather than an isinstance check, so numpy scalars, Decimal and anything
    # else numeric from a plotting workflow still work.
    try:
        vals = [float(c) for c in color[:3]]
    except (TypeError, ValueError):
        raise TypeError("opticquiz-cvd: invalid color %r: components must be numbers."
                        % (color,))
    for v in vals:
        if math.isnan(v) or math.isinf(v):
            raise ValueError("opticquiz-cvd: invalid color %r: components must be"
                             " finite." % (color,))
    if min(vals) < 0:
        raise ValueError("opticquiz-cvd: invalid color %r: components must not be"
                         " negative." % (color,))
    if max(vals) <= 1.0:
        return [v * 255.0 for v in vals]
    if max(vals) > 255.0:
        raise ValueError("opticquiz-cvd: invalid color %r: components above 1 are read"
                         " as 0-255 and must not exceed 255." % (color,))
    return vals


def _rgb_to_hex(rgb):
    return "#%02x%02x%02x" % tuple(int(round(_clamp01(v / 255.0) * 255)) for v in rgb)


def _s2l(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _l2s(c):
    c = 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055
    return _clamp01(c) * 255.0


def to_hex(color):
    """Normalize any accepted color form to a #rrggbb string."""
    return _rgb_to_hex(_to_rgb255(color))


# An unrecognized `cvd_type` used to fall through to the color unchanged, so a typo
# ("protanopia" for "protan") was a silent no-op that still looked like a result — an
# entire measurement run can be wrong before anyone notices. A typo'd `model` fell back
# to machado just as quietly. Both now raise.
#
# The canonical short names are the ONLY accepted values, matching every wrapper in this
# family (dichromacy, trichromacy, cvdsim, daltoscope). Long clinical forms are
# deliberately NOT aliased — the error names the short form to use instead, which
# corrects a wrong guess in one try without giving the family two vocabularies.
_LONG_FORM = {"protanopia": "protan", "deuteranopia": "deutan", "tritanopia": "tritan"}
# Anomalous trichromacy is a PARTIAL deficiency — `severity` below 1 on the matching
# type, not a type of its own. Aliasing it onto a severity-1 matrix would silently
# overstate the deficiency, so it is refused and pointed at the real control.
_ANOMALOUS = {"protanomaly": "protan", "deuteranomaly": "deutan", "tritanomaly": "tritan"}


def normalize_type(cvd_type, where="simulate"):
    """Return the canonical type name, or raise.

    `where` only labels the message for callers that wrap simulate; it does not change
    what is accepted. Raises TypeError if `cvd_type` is not a string, ValueError if it
    is a string that names no known type.
    """
    if not isinstance(cvd_type, str):
        raise TypeError("%s: type must be a string, got %s."
                        % (where, type(cvd_type).__name__))
    t = cvd_type.strip().lower()
    if t == "normal" or t in TYPES:
        return t
    if t in _LONG_FORM:
        hint = ' Use "%s".' % _LONG_FORM[t]
    elif t in _ANOMALOUS:
        hint = (' Anomalous trichromacy is a severity, not a type: use "%s" with'
                " severity < 1." % _ANOMALOUS[t])
    else:
        hint = ""
    raise ValueError("%s: unknown type %r.%s Expected one of: %s, normal."
                     % (where, cvd_type, hint, ", ".join(TYPES)))


def normalize_model(model, where="simulate"):
    """Return the canonical model name, or raise. None means the machado default."""
    if model is None:
        return "machado"
    if not isinstance(model, str):
        raise TypeError("%s: model must be a string, got %s."
                        % (where, type(model).__name__))
    m = model.strip().lower()
    if m in MODELS:
        return m
    raise ValueError("%s: unknown model %r. Expected one of: %s."
                     % (where, model, ", ".join(MODELS)))


def simulate(color, cvd_type, severity=1.0, model="machado"):
    """Return the hex color as seen under `cvd_type` ('protan'|'deutan'|'tritan'|'normal').

    severity 0..1: 1 = full dichromacy (Machado severity-1 matrices); values below 1
    blend toward the original in linear light to approximate anomalous trichromacy
    (mild/moderate CVD) — a disclosed approximation, not Machado's per-severity matrices.
    model: 'machado' (default) or 'brettel' — a second, independent dichromat model.

    Raises ValueError on an unrecognized `cvd_type` or `model` (a typo is never a
    silent pass-through), TypeError if either is not a string.
    """
    t = normalize_type(cvd_type)
    mdl = normalize_model(model)
    rgb = _to_rgb255(color)
    if t == "normal":
        return _rgb_to_hex(rgb)
    lin = [_s2l(rgb[0]), _s2l(rgb[1]), _s2l(rgb[2])]
    if mdl == "brettel":
        b = _B[t]
        dot = lin[0] * b["n"][0] + lin[1] * b["n"][1] + lin[2] * b["n"][2]
        m = b["p1"] if dot >= 0 else b["p2"]
    else:
        m = _M[t]
    o = [_clamp01(m[i][0] * lin[0] + m[i][1] * lin[1] + m[i][2] * lin[2]) for i in range(3)]
    if severity < 1:
        o = [lin[k] * (1 - severity) + o[k] * severity for k in range(3)]
    return _rgb_to_hex([_l2s(o[0]), _l2s(o[1]), _l2s(o[2])])


def _rgb_to_xyz(rgb):
    r, g, b = _s2l(rgb[0]), _s2l(rgb[1]), _s2l(rgb[2])
    return [(0.4124 * r + 0.3576 * g + 0.1805 * b) * 100,
            (0.2126 * r + 0.7152 * g + 0.0722 * b) * 100,
            (0.0193 * r + 0.1192 * g + 0.9505 * b) * 100]


def _xyz_to_lab(xyz):
    def f(t):
        return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t + 16.0 / 116.0)
    fx, fy, fz = f(xyz[0] / 95.047), f(xyz[1] / 100.0), f(xyz[2] / 108.883)
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]


def _lab(color):
    return _xyz_to_lab(_rgb_to_xyz(_to_rgb255(color)))


def _lab_to_xyz(L, a, b):
    fy = (L + 16) / 116.0
    fx = fy + a / 500.0
    fz = fy - b / 200.0

    def fi(t):
        t3 = t * t * t
        return t3 if t3 > 0.008856 else (t - 16.0 / 116.0) / 7.787
    return [fi(fx) * 95.047, fi(fy) * 100.0, fi(fz) * 108.883]


def _lab_to_hex(L, a, b):
    xyz = _lab_to_xyz(L, a, b)
    X, Y, Z = xyz[0] / 100.0, xyz[1] / 100.0, xyz[2] / 100.0
    lin = [3.2406 * X - 1.5372 * Y - 0.4986 * Z,
           -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
           0.0557 * X - 0.2040 * Y + 1.0570 * Z]
    out = []
    for c in lin:
        c = _clamp01(c)
        c = 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055
        out.append(int(math.floor(_clamp01(c) * 255 + 0.5)))
    return "#%02x%02x%02x" % tuple(out)


def _ciede2000(lab1, lab2):
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    avg_lp = (L1 + L2) / 2.0
    c1 = math.sqrt(a1 * a1 + b1 * b1)
    c2 = math.sqrt(a2 * a2 + b2 * b2)
    avg_c = (c1 + c2) / 2.0
    g = 0.5 * (1 - math.sqrt(avg_c ** 7 / (avg_c ** 7 + 25 ** 7)))
    a1p, a2p = a1 * (1 + g), a2 * (1 + g)
    c1p = math.sqrt(a1p * a1p + b1 * b1)
    c2p = math.sqrt(a2p * a2p + b2 * b2)
    avg_cp = (c1p + c2p) / 2.0

    def hp(ap, bp):
        if ap == 0 and bp == 0:
            return 0.0
        h = math.degrees(math.atan2(bp, ap))
        return h + 360 if h < 0 else h

    h1p, h2p = hp(a1p, b1), hp(a2p, b2)
    d_lp = L2 - L1
    d_cp = c2p - c1p
    if c1p * c2p == 0:
        dhp = 0.0
    else:
        dhp = h2p - h1p
        if dhp > 180:
            dhp -= 360
        elif dhp < -180:
            dhp += 360
    d_hp = 2 * math.sqrt(c1p * c2p) * math.sin(math.radians(dhp) / 2.0)
    if c1p * c2p == 0:
        avg_hp = h1p + h2p
    elif abs(h1p - h2p) > 180:
        avg_hp = (h1p + h2p + 360) / 2.0
    else:
        avg_hp = (h1p + h2p) / 2.0
    t = (1 - 0.17 * math.cos(math.radians(avg_hp - 30))
         + 0.24 * math.cos(math.radians(2 * avg_hp))
         + 0.32 * math.cos(math.radians(3 * avg_hp + 6))
         - 0.20 * math.cos(math.radians(4 * avg_hp - 63)))
    d_theta = 30 * math.exp(-(((avg_hp - 275) / 25.0) ** 2))
    rc = 2 * math.sqrt(avg_cp ** 7 / (avg_cp ** 7 + 25 ** 7))
    sl = 1 + (0.015 * (avg_lp - 50) ** 2) / math.sqrt(20 + (avg_lp - 50) ** 2)
    sc = 1 + 0.045 * avg_cp
    sh = 1 + 0.015 * avg_cp * t
    rt = -math.sin(math.radians(2 * d_theta)) * rc
    return math.sqrt((d_lp / sl) ** 2 + (d_cp / sc) ** 2 + (d_hp / sh) ** 2
                     + rt * (d_cp / sc) * (d_hp / sh))


def delta_e(c1, c2):
    """CIEDE2000 perceptual difference between two colors."""
    return _ciede2000(_lab(c1), _lab(c2))


def rel_luminance(color):
    """WCAG 2.x relative luminance (0-1) of a color."""
    rgb = _to_rgb255(color)
    return 0.2126 * _s2l(rgb[0]) + 0.7152 * _s2l(rgb[1]) + 0.0722 * _s2l(rgb[2])


def contrast_ratio(c1, c2):
    """WCAG contrast ratio between two colors (1.0 to 21.0)."""
    l1, l2 = rel_luminance(c1), rel_luminance(c2)
    hi, lo = (l1, l2) if l1 > l2 else (l2, l1)
    return (hi + 0.05) / (lo + 0.05)


def check_contrast(fg, bg, large=False):
    """Check foreground/background legibility against WCAG thresholds.

    `large` = text >=18pt (or 14pt bold). `ui` is the 3:1 bar for UI components and
    graphics (WCAG 1.4.11). Returns the ratio and per-level pass booleans — this is
    the legibility axis, distinct from the color-vision axis of check_palette.
    """
    r = contrast_ratio(fg, bg)
    return {
        "ratio": round(r, 2), "large": large,
        "AA": r >= (3 if large else 4.5), "AAA": r >= (4.5 if large else 7),
        "ui": r >= 3, "pass": r >= (3 if large else 4.5),
    }


def check_palette(colors, distinct=13, collapse=10, severity=1.0, model="machado"):
    """Check a palette for colorblind conflicts.

    Returns a dict: {'pass': bool, 'distinct', 'collapse', 'severity', 'model',
    'types': {'protan'|'deutan'|'tritan': {'conflicts': [...], 'pass': bool}}}.
    A pair is flagged when it is clearly distinct to normal vision (>= `distinct`)
    but its simulated difference drops below `collapse` ('severe' below 5).
    `severity` (0..1) checks against milder anomalous trichromacy instead of full
    dichromacy; 1.0 (default) is the worst case. `model` is 'machado' or 'brettel'.
    """
    hexes = [to_hex(c) for c in colors]
    report = {"distinct": distinct, "collapse": collapse, "severity": severity, "model": model,
              "types": {t: {"conflicts": [], "pass": True} for t in TYPES}}
    n = len(hexes)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = hexes[i], hexes[j]
            de_n = delta_e(a, b)
            if de_n < distinct:
                continue
            for t in TYPES:
                de_s = delta_e(simulate(a, t, severity, model), simulate(b, t, severity, model))
                if de_s < collapse:
                    report["types"][t]["conflicts"].append({
                        "a": a, "b": b, "normal": round(de_n, 1),
                        "sim": round(de_s, 1), "severity": "severe" if de_s < 5 else "risk"})
    for t in TYPES:
        report["types"][t]["pass"] = len(report["types"][t]["conflicts"]) == 0
    report["pass"] = all(report["types"][t]["pass"] for t in TYPES)
    return report


def fix_palette(colors, distinct=13, collapse=10, margin=2, max_drift=32, max_iter=600):
    """Nudge a failing palette into a colorblind-safe one, staying near the originals.

    Conflicting pairs are separated along LIGHTNESS (the axis color-vision deficiency
    preserves), capped by a per-color drift budget in CIEDE2000. Deterministic. The
    returned palette is re-checked, so 'pass' reflects reality.

    Returns {'colors': [...], 'drift': [...], 'pass': bool, 'residual': int}.
    """
    step = 1.5
    target = collapse + margin
    hexes = [to_hex(c) for c in colors]
    cur = [_lab(h) for h in hexes]

    def hex_at(i):
        return _lab_to_hex(cur[i][0], cur[i][1], cur[i][2])

    def drift_at(i):
        return delta_e(hexes[i], hex_at(i))

    def worst_pair():
        h = [_lab_to_hex(l[0], l[1], l[2]) for l in cur]
        best, wp = float("inf"), None
        for i in range(len(h)):
            for j in range(i + 1, len(h)):
                if delta_e(h[i], h[j]) < distinct:
                    continue
                for t in TYPES:
                    d = delta_e(simulate(h[i], t), simulate(h[j], t))
                    if d < best:
                        best, wp = d, (i, j)
        return (99 if best == float("inf") else best), wp

    for _ in range(max_iter):
        mn, wp = worst_pair()
        if mn >= target or wp is None:
            break
        i, j = wp
        hi = i if cur[i][0] >= cur[j][0] else j
        lo = j if hi == i else i
        moved = False
        for k, d_l in ((hi, step), (lo, -step)):
            save = cur[k][0]
            cur[k][0] = max(0.0, min(100.0, cur[k][0] + d_l))
            if drift_at(k) > max_drift:
                cur[k][0] = save
            elif cur[k][0] != save:
                moved = True
        if not moved:
            break

    out = [_lab_to_hex(l[0], l[1], l[2]) for l in cur]
    report = check_palette(out, distinct=distinct, collapse=collapse)
    residual = sum(len(report["types"][t]["conflicts"]) for t in TYPES)
    return {"colors": out, "drift": [round(drift_at(i), 1) for i in range(len(out))],
            "pass": report["pass"], "residual": residual}
