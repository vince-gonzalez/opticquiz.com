"""
The field benchmark — every colour-vision correction we can obtain, scored on the same
pre-registered metrics, under several independent simulation models.

    python field.py selfcheck      verify the fast metric against the reference engine
    python field.py run            score every corrector x simulator x deficiency
    python field.py run --quick    smaller lattice, for iterating

WHY THE SIMULATOR IS A VARIABLE
    Every metric in PROTOCOL.md is computed *under a model* of colour-vision deficiency.
    A result that only holds under the model its author chose is not a result. So each
    corrector is scored under six independently-implemented simulators, and the question
    the table answers is not only "which correction wins" but "does the answer survive a
    change of model". If the ranking flips between models, that is the finding.

PROVENANCE — nothing here is reconstructed from memory
    opticquiz   matrices lifted verbatim from browser-extension/content.js, the transform
                shipping in the Chrome Web Store extension
    daltonize   the installed `daltonize` package (Fidaner/Lin/Wang style: simulate, take
                the error the dichromat cannot see, rotate it into a visible direction).
                Called through its own gamma pipeline so we benchmark it as shipped.
    simulators  the installed `daltonlens` package (DaltonLens-Python) plus the OpticQuiz
                engine's own Machado 2009 implementation
"""
import argparse, json, os, sys, warnings
import numpy as np

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "cvd-py"))
import opticquiz_cvd as q                     # noqa: E402
from daltonlens import simulate as dl         # noqa: E402
from daltonize.daltonize import daltonize as fidaner_daltonize   # noqa: E402

COLLAPSE, DISTINCT = 10.0, 20.0
OKABE_ITO = ["#000000", "#E69F00", "#56B4E9", "#009E73",
             "#F0E442", "#0072B2", "#D55E00", "#CC79A7"]


# ---------- fast, vectorised colour maths (validated against the engine) ----------

def srgb_to_linear(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.clip(np.asarray(c, float), 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def rgb_to_lab(rgb):
    """sRGB 0-1 -> CIE Lab, D65.

    Deliberately reproduces the OpticQuiz engine BIT FOR BIT rather than using the exact
    CIE constants: the 4-decimal sRGB->XYZ coefficients and the legacy 0.008856 / 7.787
    Lab constants. The engine is the reference implementation the protocol names, so the
    fast path must match IT, not textbook values. Using the exact CIE forms here produced a
    max discrepancy of 0.012 dE — negligible in practice, but it would mean this table and
    the protocol were measuring two subtly different quantities.
    """
    m = np.array([[0.4124, 0.3576, 0.1805],
                  [0.2126, 0.7152, 0.0722],
                  [0.0193, 0.1192, 0.9505]])
    xyz = (srgb_to_linear(rgb) @ m.T) * 100.0
    white = np.array([95.047, 100.0, 108.883])
    t = xyz / white
    f = np.where(t > 0.008856, np.cbrt(np.clip(t, 0, None)), 7.787 * t + 16.0 / 116.0)
    return np.stack([116 * f[..., 1] - 16,
                     500 * (f[..., 0] - f[..., 1]),
                     200 * (f[..., 1] - f[..., 2])], axis=-1)


def delta_e2000(lab1, lab2):
    """Vectorised CIEDE2000. Cross-checked against the engine in `selfcheck`."""
    L1, a1, b1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    L2, a2, b2 = lab2[..., 0], lab2[..., 1], lab2[..., 2]
    C1, C2 = np.hypot(a1, b1), np.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cb ** 7 / (Cb ** 7 + 25.0 ** 7 + 1e-30)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    dLp = L2 - L1
    dCp = C2p - C1p
    dhp = h2p - h1p
    dhp = np.where(dhp > 180, dhp - 360, np.where(dhp < -180, dhp + 360, dhp))
    dhp = np.where(C1p * C2p == 0, 0.0, dhp)
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dhp) / 2)
    Lbp = (L1 + L2) / 2
    Cbp = (C1p + C2p) / 2
    hsum, hdiff = h1p + h2p, np.abs(h1p - h2p)
    hbp = np.where(C1p * C2p == 0, hsum,
                   np.where(hdiff <= 180, hsum / 2,
                            np.where(hsum < 360, (hsum + 360) / 2, (hsum - 360) / 2)))
    T = (1 - 0.17 * np.cos(np.radians(hbp - 30)) + 0.24 * np.cos(np.radians(2 * hbp))
         + 0.32 * np.cos(np.radians(3 * hbp + 6)) - 0.20 * np.cos(np.radians(4 * hbp - 63)))
    dTh = 30 * np.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * np.sqrt(Cbp ** 7 / (Cbp ** 7 + 25.0 ** 7 + 1e-30))
    Sl = 1 + (0.015 * (Lbp - 50) ** 2) / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc = 1 + 0.045 * Cbp
    Sh = 1 + 0.015 * Cbp * T
    Rt = -np.sin(np.radians(2 * dTh)) * Rc
    return np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2
                   + Rt * (dCp / Sc) * (dHp / Sh))


def de(rgb1, rgb2):
    return delta_e2000(rgb_to_lab(rgb1), rgb_to_lab(rgb2))


def quant(rgb):
    """8-bit quantise, matching the engine's floor(x+0.5) rounding exactly."""
    return np.floor(np.clip(rgb, 0, 1) * 255 + 0.5) / 255.0


# ---------- simulators ----------

def sim_opticquiz(rgb, deficiency):
    """The OpticQuiz engine's own Machado 2009, via its public API."""
    out = np.empty_like(rgb)
    for i, c in enumerate(rgb):
        h = "#%02x%02x%02x" % tuple(int(v) for v in np.floor(c * 255 + 0.5))
        r = q.simulate(h, deficiency).lstrip("#")
        out[i] = [int(r[j:j + 2], 16) / 255 for j in (0, 2, 4)]
    return out


def _dl(simulator, rgb, deficiency):
    d = {"protan": dl.Deficiency.PROTAN, "deutan": dl.Deficiency.DEUTAN,
         "tritan": dl.Deficiency.TRITAN}[deficiency]
    img = (np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8).reshape(1, -1, 3)
    out = simulator.simulate_cvd(img, d, severity=1.0)
    return np.asarray(out).reshape(-1, 3).astype(float) / 255.0


SIMULATORS = {
    "opticquiz-machado2009": sim_opticquiz,
    "dl-brettel1997": lambda r, d: _dl(dl.Simulator_Brettel1997(), r, d),
    "dl-vienot1999": lambda r, d: _dl(dl.Simulator_Vienot1999(), r, d),
    "dl-machado2009": lambda r, d: _dl(dl.Simulator_Machado2009(), r, d),
    "dl-vischeck": lambda r, d: _dl(dl.Simulator_Vischeck(), r, d),
    "dl-coblisv2": lambda r, d: _dl(dl.Simulator_CoblisV2(), r, d),
}


# ---------- correctors ----------

def load_matrix(name):
    d = json.load(open(f"transforms/{name}.json"))
    return np.array(d["matrix"], float), d.get("space", "srgb")


def corr_identity(rgb, deficiency):
    return rgb.copy()


def _matrix_corrector(prefix):
    def f(rgb, deficiency):
        M, space = load_matrix(f"{prefix}-{deficiency}")
        if space == "linear":
            return quant(linear_to_srgb(np.clip(srgb_to_linear(rgb) @ M.T, 0, 1)))
        return quant(rgb @ M.T)
    return f


def corr_opticquiz(rgb, deficiency):
    M, space = load_matrix(f"opticquiz-{deficiency}")
    if space == "linear":
        return quant(linear_to_srgb(np.clip(srgb_to_linear(rgb) @ M.T, 0, 1)))
    return quant(rgb @ M.T)


def corr_daltonize(rgb, deficiency):
    """The installed `daltonize` package, run through its own gamma pipeline so it is
    benchmarked exactly as it ships (piecewise sRGB curve, exponent 2.4, float16 inside)."""
    lin = srgb_to_linear(np.clip(rgb, 0, 1)).reshape(1, -1, 3)
    out = fidaner_daltonize(lin, {"protan": "p", "deutan": "d", "tritan": "t"}[deficiency])
    return quant(linear_to_srgb(np.asarray(out, float).reshape(-1, 3)))


CORRECTORS = {
    "identity (control)": corr_identity,
    "opticquiz v1 (shipped)": corr_opticquiz,
    "opticquiz v2 (derived)": _matrix_corrector("opticquiz-v2"),
    "daltonize (Fidaner)": corr_daltonize,
}


# ---------- stimulus + metrics ----------

def lattice(n):
    v = np.linspace(0, 1, n)
    return np.array([[r, g, b] for r in v for g in v for b in v])


def collapsing_pairs(lat, simfn, deficiency, max_pairs, seed=0):
    s = simfn(lat, deficiency)
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(lat))
    i, j = np.triu_indices(len(lat), k=1)
    i, j = idx[i], idx[j]
    keep = np.zeros(len(i), bool)
    step = 200_000
    for a in range(0, len(i), step):
        sl = slice(a, a + step)
        keep[sl] = (de(lat[i[sl]], lat[j[sl]]) >= DISTINCT) & \
                   (de(s[i[sl]], s[j[sl]]) < COLLAPSE)
        if keep.sum() >= max_pairs:
            break
    i, j = i[keep][:max_pairs], j[keep][:max_pairs]
    return i, j


def score(corrfn, simfn, deficiency, lat, pi, pj):
    corrected = corrfn(lat, deficiency)
    sim_o, sim_c = simfn(lat, deficiency), simfn(corrected, deficiency)

    before = de(sim_o[pi], sim_o[pj])
    after = de(sim_c[pi], sim_c[pj])
    gain = after - before

    oi = np.array([[int(h[k:k + 2], 16) / 255 for k in (1, 3, 5)] for h in OKABE_ITO])
    oi_c = corrfn(oi, deficiency)
    so, sc = simfn(oi, deficiency), simfn(oi_c, deficiency)
    a, b = np.triu_indices(len(oi), k=1)
    oi_gain = de(sc[a], sc[b]) - de(so[a], so[b])

    neu = np.stack([np.linspace(0, 1, 17)] * 3, axis=-1)

    return {
        "M1_gain_mean": round(float(gain.mean()), 2),
        "M2_rescue_rate": round(float(((before < COLLAPSE) & (after >= COLLAPSE)).mean()), 3),
        "M1_made_worse": int((gain < -0.5).sum()),
        "M3_fidelity_cost": round(float(de(lat, corrected).mean()), 2),
        "M5_neutral_shift": round(float(de(neu, corrfn(neu, deficiency)).mean()), 2),
        "M6_okabe_mean": round(float(oi_gain.mean()), 2),
        "M6_okabe_worst": round(float(oi_gain.min()), 2),
    }


# ---------- entry points ----------

def selfcheck():
    """The fast metric must agree with the reference engine, or the whole table measures
    something other than what PROTOCOL.md specifies."""
    rng = np.random.default_rng(0)
    a, b = rng.random((400, 3)), rng.random((400, 3))
    a, b = quant(a), quant(b)
    mine = de(a, b)
    ref = np.array([q.delta_e("#%02x%02x%02x" % tuple(int(v * 255 + 0.5) for v in x),
                              "#%02x%02x%02x" % tuple(int(v * 255 + 0.5) for v in y))
                    for x, y in zip(a, b)])
    err = np.abs(mine - ref)
    # Tolerance 1e-3 dE, stated rather than assumed. The engine computes scalar-at-a-time in
    # Python floats; this computes array-at-a-time in numpy, so the operations associate
    # differently and the last bits diverge. Observed max is ~4e-5 dE, which is four orders
    # below the 10.0 collapse threshold every metric turns on, and cannot move a verdict.
    TOL = 1e-3
    print("vectorised dE2000 vs engine over 400 random pairs:")
    print(f"  max abs error  {err.max():.6f}")
    print(f"  mean abs error {err.mean():.6f}")
    print(f"  tolerance      {TOL:.6f}  (float association order, not a modelling difference)")
    ok = err.max() < TOL
    print("  PASS" if ok else "  FAIL - the fast path does not match the reference")

    print("\nsimulator cross-check, #d7191c deutan:")
    for name, fn in SIMULATORS.items():
        r = fn(np.array([[215 / 255, 25 / 255, 28 / 255]]), "deutan")[0]
        print(f"  {name:24s} {'#%02x%02x%02x' % tuple(int(v * 255 + 0.5) for v in r)}")
    return 0 if ok else 1


def run(a):
    n = 6 if a.quick else 9
    mp = 300 if a.quick else 1200
    lat = lattice(n)
    print(f"lattice {len(lat)} colours, up to {mp} collapsing pairs per simulator\n")

    rows = []
    for deficiency in ("protan", "deutan", "tritan"):
        for sname, simfn in SIMULATORS.items():
            pi, pj = collapsing_pairs(lat, simfn, deficiency, mp)
            if len(pi) < 30:
                print(f"  ! {deficiency}/{sname}: only {len(pi)} pairs, skipping")
                continue
            for cname, corrfn in CORRECTORS.items():
                r = score(corrfn, simfn, deficiency, lat, pi, pj)
                r.update(deficiency=deficiency, simulator=sname, corrector=cname,
                         n_pairs=int(len(pi)))
                rows.append(r)
                print(f"  {deficiency:7s} {sname:22s} {cname:20s} "
                      f"rescue {r['M2_rescue_rate']:.3f}  gain {r['M1_gain_mean']:+7.2f}  "
                      f"fidelity {r['M3_fidelity_cost']:6.2f}  okabe {r['M6_okabe_mean']:+7.2f}")

    os.makedirs("results", exist_ok=True)
    json.dump(rows, open("results/field.json", "w"), indent=2)
    print(f"\nwrote results/field.json  ({len(rows)} rows)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("selfcheck")
    r = sub.add_parser("run")
    r.add_argument("--quick", action="store_true")
    a = ap.parse_args()
    sys.exit(selfcheck() if a.cmd == "selfcheck" else run(a))
