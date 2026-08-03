"""
Stage 2 — metrics M1-M6 for a colour transform.

Usage:
    python benchmark.py --transform transforms/windows-deutan.json --type deutan
    python benchmark.py --transform identity --type deutan          # the control
    python benchmark.py --transform opticquiz --type deutan         # our engine

A transform JSON is whatever recover.py produced:
    {"space": "srgb" | "linear", "matrix": [[..],[..],[..]], "offset": [0,0,0]}

Everything here is defined in PROTOCOL.md section 5 and was fixed before any
measurement was taken. Do not add metrics to this file after data exists; add
them to a separate post-hoc script so the distinction stays visible.
"""
import argparse, json, sys, os
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "cvd-py"))
import opticquiz_cvd as q

COLLAPSE = 10.0   # ΔE2000 below which a pair is treated as collapsed (PROTOCOL §5)
DISTINCT = 20.0   # ΔE2000 above which a pair is clearly distinct to normal vision


# ---------- colour plumbing -------------------------------------------------

def srgb_to_linear(c):
    c = np.asarray(c, dtype=float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.asarray(c, dtype=float)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)


def to_hex(rgb01):
    """Match the engine's rounding exactly — floor(x+0.5), not np.round (banker's)."""
    v = [int(np.floor(np.clip(c, 0, 1) * 255 + 0.5)) for c in rgb01]
    return "#%02x%02x%02x" % tuple(v)


def hex_to_rgb01(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


# ---------- transforms ------------------------------------------------------

class Transform:
    """A measured or reference transform. `apply` takes and returns sRGB 0-1."""

    def __init__(self, name, kind, matrix=None, offset=None, space="srgb"):
        self.name, self.kind, self.space = name, kind, space
        self.matrix = np.array(matrix, dtype=float) if matrix is not None else None
        self.offset = np.array(offset, dtype=float) if offset is not None else np.zeros(3)

    def out_of_gamut(self, rgb01):
        """M4 must be measured in the transform's OWN space, before any clamp. A linear-space
        transform has to clamp negatives before the sRGB encode (pow of a negative is NaN),
        so checking after conversion would silently undercount."""
        if self.kind == "identity":
            return False
        v = np.asarray(rgb01, dtype=float)
        src = srgb_to_linear(v) if self.space == "linear" else v
        out = self.matrix @ src + self.offset
        return bool(np.any((out < 0) | (out > 1)))

    def apply(self, rgb01):
        if self.kind == "identity":
            return np.asarray(rgb01, dtype=float)
        if self.kind == "matrix":
            v = np.asarray(rgb01, dtype=float)
            if self.space == "linear":
                out = self.matrix @ srgb_to_linear(v) + self.offset
                return np.clip(linear_to_srgb(np.clip(out, 0, 1)), 0, 1)
            return np.clip(self.matrix @ v + self.offset, 0, 1)
        raise ValueError(self.kind)

    @staticmethod
    def load(spec):
        if spec == "identity":
            return Transform("identity (no correction)", "identity")
        with open(spec) as f:
            d = json.load(f)
        return Transform(d.get("name", os.path.basename(spec)), "matrix",
                         d["matrix"], d.get("offset", [0, 0, 0]), d.get("space", "srgb"))


def opticquiz_fix(colors_hex):
    """Our engine's palette repair. Operates on a set, not per-colour, so it is applied
    to each stimulus set as a whole — which is what it is designed for and how a fair
    comparison must run it."""
    out = q.fix_palette(colors_hex)
    return out["colors"] if isinstance(out, dict) else out


# ---------- stimulus sets (PROTOCOL §4) -------------------------------------

OKABE_ITO = ["#000000", "#E69F00", "#56B4E9", "#009E73",
             "#F0E442", "#0072B2", "#D55E00", "#CC79A7"]


def lattice(n=9):
    vals = np.linspace(0, 1, n)
    return [np.array([r, g, b]) for r in vals for g in vals for b in vals]


def neutral(n=17):
    return [np.array([v, v, v]) for v in np.linspace(0, 1, n)]


def collapsing_pairs(lat, cvd_type, max_pairs=4000, seed=0):
    """Pairs distinct to normal vision but collapsed under simulation — the population
    the correction exists to serve. Deterministic subsample for tractability."""
    hexes = [to_hex(c) for c in lat]
    sim = {h: q.simulate(h, cvd_type) for h in hexes}
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(hexes))
    pairs, seen = [], 0
    for i in range(len(idx)):
        for j in range(i + 1, len(idx)):
            a, b = hexes[idx[i]], hexes[idx[j]]
            seen += 1
            if seen > 900_000:
                break
            if q.delta_e(a, b) < DISTINCT:
                continue
            if q.delta_e(sim[a], sim[b]) >= COLLAPSE:
                continue
            pairs.append((a, b))
            if len(pairs) >= max_pairs:
                return pairs
        if len(pairs) >= max_pairs or seen > 900_000:
            break
    return pairs


# ---------- metrics ---------------------------------------------------------

def transform_hexes(tf, hexes):
    if tf == "opticquiz":
        return opticquiz_fix(hexes)
    return [to_hex(tf.apply(hex_to_rgb01(h))) for h in hexes]


def run(tf, cvd_type, lat, pairs, verbose=True):
    r = {"transform": "opticquiz-cvd fix_palette" if tf == "opticquiz" else tf.name,
         "cvd_type": cvd_type}

    # ---- M1 / M2 : discriminability over collapsing pairs
    flat = [h for p in pairs for h in p]
    moved = transform_hexes(tf, flat)
    gains, rescued = [], 0
    for k in range(len(pairs)):
        a0, b0 = pairs[k]
        a1, b1 = moved[2 * k], moved[2 * k + 1]
        before = q.delta_e(q.simulate(a0, cvd_type), q.simulate(b0, cvd_type))
        after = q.delta_e(q.simulate(a1, cvd_type), q.simulate(b1, cvd_type))
        gains.append(after - before)
        if before < COLLAPSE <= after:
            rescued += 1
    g = np.array(gains) if gains else np.array([0.0])
    r["M1_gain_mean"] = round(float(g.mean()), 3)
    r["M1_gain_median"] = round(float(np.median(g)), 3)
    r["M1_gain_p10"] = round(float(np.percentile(g, 10)), 3)
    r["M1_gain_p90"] = round(float(np.percentile(g, 90)), 3)
    r["M1_pairs_made_worse"] = int((g < 0).sum())
    r["M2_rescue_rate"] = round(rescued / len(pairs), 4) if pairs else None
    r["n_pairs"] = len(pairs)

    # ---- M3 / M4 : fidelity + clipping over the lattice
    lat_hex = [to_hex(c) for c in lat]
    lat_moved = transform_hexes(tf, lat_hex)
    r["M3_fidelity_cost_mean"] = round(
        float(np.mean([q.delta_e(a, b) for a, b in zip(lat_hex, lat_moved)])), 3)
    if tf == "opticquiz":
        r["M4_clip_rate"] = None  # set-wise optimiser, bounded by a drift budget by construction
    else:
        r["M4_clip_rate"] = round(float(np.mean([tf.out_of_gamut(c) for c in lat])), 4)

    # ---- M5 : achromatic preservation
    neu = [to_hex(c) for c in neutral()]
    neu_moved = transform_hexes(tf, neu)
    r["M5_neutral_shift_mean"] = round(
        float(np.mean([q.delta_e(a, b) for a, b in zip(neu, neu_moved)])), 3)

    # ---- M6 : damage to an already-safe palette
    oi_moved = transform_hexes(tf, OKABE_ITO)
    d = []
    for i in range(len(OKABE_ITO)):
        for j in range(i + 1, len(OKABE_ITO)):
            before = q.delta_e(q.simulate(OKABE_ITO[i], cvd_type), q.simulate(OKABE_ITO[j], cvd_type))
            after = q.delta_e(q.simulate(oi_moved[i], cvd_type), q.simulate(oi_moved[j], cvd_type))
            d.append(after - before)
    r["M6_okabe_ito_gain_mean"] = round(float(np.mean(d)), 3)
    r["M6_okabe_ito_worst"] = round(float(np.min(d)), 3)

    if verbose:
        print(json.dumps(r, indent=2))
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transform", required=True,
                    help="'identity', 'opticquiz', or a path to a transform JSON")
    ap.add_argument("--type", default="deutan", choices=["protan", "deutan", "tritan"])
    ap.add_argument("--lattice", type=int, default=9)
    ap.add_argument("--max-pairs", type=int, default=1500)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    lat = lattice(a.lattice)
    pairs = collapsing_pairs(lat, a.type, a.max_pairs)
    print(f"# {a.type}: {len(lat)} lattice colours, {len(pairs)} collapsing pairs", file=sys.stderr)

    tf = "opticquiz" if a.transform == "opticquiz" else Transform.load(a.transform)
    res = run(tf, a.type, lat, pairs)
    if a.out:
        with open(a.out, "w") as f:
            json.dump(res, f, indent=2)


if __name__ == "__main__":
    main()
