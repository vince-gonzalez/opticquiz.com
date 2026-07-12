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

__version__ = "1.0.0"
TYPES = ["protan", "deutan", "tritan"]

_M = {
    "protan": [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    "deutan": [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    "tritan": [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}


def _clamp01(x):
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def _to_rgb255(color):
    if isinstance(color, str):
        h = color.strip().lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        n = int(h, 16)
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    r, g, b = color[0], color[1], color[2]
    if max(r, g, b) <= 1.0:
        return [r * 255.0, g * 255.0, b * 255.0]
    return [float(r), float(g), float(b)]


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


def simulate(color, cvd_type):
    """Return the hex color as seen under `cvd_type` ('protan'|'deutan'|'tritan'|'normal')."""
    rgb = _to_rgb255(color)
    if cvd_type == "normal" or cvd_type not in _M:
        return _rgb_to_hex(rgb)
    lin = [_s2l(rgb[0]), _s2l(rgb[1]), _s2l(rgb[2])]
    m = _M[cvd_type]
    o = [_clamp01(m[i][0] * lin[0] + m[i][1] * lin[1] + m[i][2] * lin[2]) for i in range(3)]
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


def check_palette(colors, distinct=13, collapse=10):
    """Check a palette for colorblind conflicts.

    Returns a dict: {'pass': bool, 'distinct', 'collapse',
    'types': {'protan'|'deutan'|'tritan': {'conflicts': [...], 'pass': bool}}}.
    A pair is flagged when it is clearly distinct to normal vision (>= `distinct`)
    but its simulated difference drops below `collapse` ('severe' below 5).
    """
    hexes = [to_hex(c) for c in colors]
    report = {"distinct": distinct, "collapse": collapse,
              "types": {t: {"conflicts": [], "pass": True} for t in TYPES}}
    n = len(hexes)
    for i in range(n):
        for j in range(i + 1, n):
            a, b = hexes[i], hexes[j]
            de_n = delta_e(a, b)
            if de_n < distinct:
                continue
            for t in TYPES:
                de_s = delta_e(simulate(a, t), simulate(b, t))
                if de_s < collapse:
                    report["types"][t]["conflicts"].append({
                        "a": a, "b": b, "normal": round(de_n, 1),
                        "sim": round(de_s, 1), "severity": "severe" if de_s < 5 else "risk"})
    for t in TYPES:
        report["types"][t]["pass"] = len(report["types"][t]["conflicts"]) == 0
    report["pass"] = all(report["types"][t]["pass"] for t in TYPES)
    return report
