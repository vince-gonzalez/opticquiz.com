"""
Gated correction — correct hard where it matters, not at all where it doesn't.

    python gated.py --type deutan
    python gated.py --all

THE IDEA
    A matrix is linear and global: it must move every colour by the same rule. That is why
    every correction in FIELD.md pays fidelity cost on blues and neutrals that were never
    confusable, and why all of them damage the Okabe-Ito palette, which was designed so its
    colours do NOT collapse and therefore never needed touching.

    So gate it:

        out = c + w(c) * (M*c - c)

    with w(c) in [0,1]. Full correction where a colour is genuinely at risk, IDENTITY where
    it is not. The correction stops being a sweep and becomes a targeted intervention.

THE RISK SIGNAL
    w is driven by how far the CVD simulation moves the colour: r(c) = dE2000(c, S(c)).
    A grey, a blue, an Okabe-Ito swatch barely move under simulation - they are not losing
    information, so leave them alone. A saturated red beside a green moves enormously; spend
    the whole budget there. This is the same error term Fidaner-style daltonisation computes,
    used as a GATE rather than as the correction itself.

        w(c) = clip((r(c) - t0) / (t1 - t0), 0, 1)

    t0 = below this, do nothing at all.  t1 = above this, correct fully.

HONEST LIMIT, STATED UP FRONT
    This is NOT a matrix, so it cannot be expressed as an SVG feColorMatrix. /live (WebGL) can
    run it in a shader. The desktop app CANNOT - MagSetFullscreenColorEffect takes a 5x5 matrix
    and nothing else. If this wins, some surfaces can have it and some cannot, and that has to
    be said out loud rather than discovered later.
"""
import argparse, json, os, sys, warnings
import numpy as np
from scipy.optimize import minimize

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
from field import (SIMULATORS, lattice, collapsing_pairs, de, quant,
                   srgb_to_linear, linear_to_srgb, OKABE_ITO, COLLAPSE)   # noqa: E402

FIT_SIMS = ["dl-machado2009", "dl-brettel1997"]
HOLDOUT_SIMS = ["dl-vienot1999", "dl-vischeck", "dl-coblisv2"]
GATE_SIM = "dl-machado2009"      # the model the SHIPPED gate would use at runtime
OKABE = np.array([[int(h[k:k + 2], 16) / 255 for k in (1, 3, 5)] for h in OKABE_ITO])

_risk = {}


def risk(rgb, deficiency):
    """dE2000 between a colour and its own simulation. Cached per stimulus set."""
    key = (deficiency, rgb.shape[0], float(rgb[0, 0]), float(rgb[-1, -1]))
    if key not in _risk:
        _risk[key] = de(rgb, SIMULATORS[GATE_SIM](rgb, deficiency))
    return _risk[key]


def gated_apply(rgb, M, deficiency, t0, t1):
    r = risk(rgb, deficiency)
    w = np.clip((r - t0) / max(t1 - t0, 1e-6), 0, 1)[:, None]
    lin = srgb_to_linear(np.clip(rgb, 0, 1))
    full = np.clip(lin @ M.T, 0, 1)
    return quant(linear_to_srgb(np.clip(lin + w * (full - lin), 0, 1)))


def score(M, deficiency, t0, t1, simname, lat, pi, pj):
    f = SIMULATORS[simname]
    so = f(lat, deficiency)
    before = de(so[pi], so[pj])
    corrected = gated_apply(lat, M, deficiency, t0, t1)
    sc = f(corrected, deficiency)
    after = de(sc[pi], sc[pj])

    oc = gated_apply(OKABE, M, deficiency, t0, t1)
    a, b = np.triu_indices(len(OKABE), k=1)
    so_oi, sc_oi = f(OKABE, deficiency), f(oc, deficiency)
    oi = de(sc_oi[a], sc_oi[b]) - de(so_oi[a], so_oi[b])

    untouched = float(np.mean(np.clip((risk(lat, deficiency) - t0) / max(t1 - t0, 1e-6), 0, 1) < 0.01))
    return {
        "rescue": float(((before < COLLAPSE) & (after >= COLLAPSE)).mean()),
        "gain": float((after - before).mean()),
        "fidelity": float(de(lat, corrected).mean()),
        "okabe_mean": float(oi.mean()),
        "okabe_worst": float(oi.min()),
        "untouched": untouched,
    }


def run(deficiency, write=False):
    lat_fit, lat = lattice(7), lattice(9)
    which = json.load(open("shipping.json"))["linear_surfaces"][deficiency]["transform"]
    M = np.array(json.load(open(f"transforms/{which}.json"))["matrix"])
    print(f"\n{'=' * 74}\n{deficiency.upper()}  gating the shipped matrix ({which})\n{'=' * 74}")

    pairs_fit = {s: collapsing_pairs(lat_fit, SIMULATORS[s], deficiency, 700, seed=0)
                 for s in FIT_SIMS}

    def obj(p):
        t0, t1 = float(p[0]), float(p[0]) + abs(float(p[1])) + 0.5
        out = []
        for s in FIT_SIMS:
            pi, pj = pairs_fit[s]
            r = score(M, deficiency, t0, t1, s, lat_fit, pi, pj)
            # maximise rescue; fidelity and palette damage are penalties, never trades
            out.append(-r["rescue"] + 0.010 * max(0, r["fidelity"])
                       + 0.05 * max(0.0, -r["okabe_mean"]))
        return float(np.mean(out))

    best, bv = None, np.inf
    for s0 in ([2, 6], [5, 10], [10, 15], [0.5, 3]):
        res = minimize(obj, np.array(s0, float), method="Nelder-Mead",
                       options={"maxiter": 400, "xatol": 1e-3, "fatol": 1e-4})
        if res.fun < bv:
            best, bv = res.x, res.fun
    t0 = float(best[0]); t1 = t0 + abs(float(best[1])) + 0.5
    print(f"gate: no correction below dE {t0:.2f}, full correction above dE {t1:.2f}\n")

    print(f"{'simulator':16s} {'':9s} {'rescue':>7s} {'gain':>7s} {'fid':>6s} "
          f"{'okabe':>7s} {'worst':>7s} {'untouched':>10s}")
    agg = {}
    for group, sims in (("FIT", FIT_SIMS), ("HELD OUT", HOLDOUT_SIMS)):
        for s in sims:
            pi, pj = collapsing_pairs(lat, SIMULATORS[s], deficiency, 1200, seed=99)
            ub = score(M, deficiency, -1e9, -1e9 + 1, s, lat, pi, pj)   # w == 1 everywhere
            g = score(M, deficiency, t0, t1, s, lat, pi, pj)
            for lbl, r in (("ungated", ub), ("gated", g)):
                agg.setdefault((group, lbl), []).append(r)
                print(f"{s:16s} {lbl:9s} {r['rescue']:7.3f} {r['gain']:+7.2f} "
                      f"{r['fidelity']:6.2f} {r['okabe_mean']:+7.2f} {r['okabe_worst']:+7.2f} "
                      f"{r['untouched']:9.1%}")

    def m(gr, lb, k):
        return float(np.mean([r[k] for r in agg[(gr, lb)]]))

    print()
    for gr in ("FIT", "HELD OUT"):
        print(f"{gr:9s} rescue {m(gr,'ungated','rescue'):.3f}->{m(gr,'gated','rescue'):.3f}   "
              f"fidelity {m(gr,'ungated','fidelity'):5.2f}->{m(gr,'gated','fidelity'):5.2f}   "
              f"okabe {m(gr,'ungated','okabe_mean'):+6.2f}->{m(gr,'gated','okabe_mean'):+6.2f}   "
              f"left alone {m(gr,'gated','untouched'):.1%}")

    H = "HELD OUT"
    # A gate that leaves nothing alone IS the ungated matrix. Without this check the
    # optimiser drives t0 negative, w becomes 1 everywhere, and the comparison reports a
    # win over itself on floating-point noise. Third permissive verdict of the day; the
    # lesson is that "did the thing actually do anything" belongs in every check list.
    engaged = m(H, "gated", "untouched") > 0.02
    checks = [("gate actually engages", engaged),
              ("rescue rate", m(H, "gated", "rescue") >= m(H, "ungated", "rescue") - 0.005),
              ("fidelity cost", m(H, "gated", "fidelity") <= m(H, "ungated", "fidelity") - 0.1),
              ("safe palettes", m(H, "gated", "okabe_mean") >= m(H, "ungated", "okabe_mean"))]
    print()
    for n, ok in checks:
        print(f"   {'PASS' if ok else 'FAIL'}  {n}")
    ok = all(o for _, o in checks)
    print("\n  " + ("GATING WINS - same rescue, less damage, on models never used in the fit"
                    if ok else "gating did not dominate; a trade, not a free win"))
    if write and ok:
        json.dump({"name": f"opticquiz gated ({deficiency})", "space": "linear",
                   "matrix": M.tolist(), "gate": {"t0": round(t0, 4), "t1": round(t1, 4),
                                                  "risk_simulator": GATE_SIM},
                   "note": "out = c + w*(M*c - c), w = clip((dE(c,S(c)) - t0)/(t1 - t0), 0, 1). "
                           "NOT expressible as an feColorMatrix - needs a shader or per-pixel path."},
                  open(f"transforms/opticquiz-gated-{deficiency}.json", "w"), indent=2)
        print(f"\nwrote transforms/opticquiz-gated-{deficiency}.json")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", choices=["protan", "deutan", "tritan"])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    for t in (["protan", "deutan", "tritan"] if a.all else [a.type]):
        run(t, a.write)
