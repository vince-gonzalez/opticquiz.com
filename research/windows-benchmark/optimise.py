"""
Derive a better correction matrix — honestly.

    python optimise.py --type protan
    python optimise.py --type deutan --budget 8.0
    python optimise.py --all

THE INTEGRITY PROBLEM, AND THE ANSWER TO IT
    Tuning a matrix until the benchmark's own numbers improve is training on the test set.
    The result would be guaranteed and worthless. Two splits prevent it:

      SIMULATOR SPLIT  fit against Machado 2009 + Brettel 1997 only.
                       Vienot 1999, Vischeck and Coblis are never seen during the fit and
                       are the score that counts.
      STIMULUS SPLIT   fit on one lattice and pair sample; report on a different lattice
                       resolution with a different random seed.

    A matrix that improves on the fitting set and not on the held-out set is overfitted, and
    this script says so rather than shipping it.

STRUCTURAL CONSTRAINTS, not penalties
    Rows are constrained to sum to 1, so the achromatic axis is preserved exactly in
    continuous arithmetic: grey in, same grey out. In practice the residual is 8-bit
    quantisation only (<0.2 dE at a rounding boundary), not a colour cast. That removes 3 of
    9 degrees of freedom and makes "least detrimental" a property of the search space rather
    than something to hope for and check afterwards.

WHAT IS BEING MAXIMISED
    Mean discriminability gain on pairs that collapse under simulation, subject to a hard
    fidelity budget and a floor on damage to an already-accessible palette. Both constraints
    are penalties in the objective and are reported separately afterwards, so a matrix that
    bought its gain by blowing the budget is visible rather than hidden in a single score.
"""
import argparse, json, os, sys, warnings
import numpy as np
from scipy.optimize import minimize

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
from field import (SIMULATORS, lattice, collapsing_pairs, de, quant,
                   srgb_to_linear, linear_to_srgb, OKABE_ITO, COLLAPSE)   # noqa: E402

# Machado 2009 is represented here by DaltonLens-Python's implementation rather than the
# engine's own, purely for speed — the engine's is a scalar Python loop, and FIELD.md showed
# the two agree within 1/255.
FIT_SIMS = ["dl-machado2009", "dl-brettel1997"]

# Genuinely different models, never seen during the fit. These decide the verdict.
HOLDOUT_SIMS = ["dl-vienot1999", "dl-vischeck", "dl-coblisv2"]

# Reported but NOT counted toward the verdict: this is a near-duplicate of a fitting model
# (same paper, independent implementation), so treating it as held-out would flatter the
# result. It is shown because it is the model the shipped engine actually uses.
REFERENCE_SIMS = ["opticquiz-machado2009"]

OKABE = np.array([[int(h[k:k + 2], 16) / 255 for k in (1, 3, 5)] for h in OKABE_ITO])


# ---------- the constrained matrix family ----------

def build(params):
    """6 free parameters -> a 3x3 whose rows sum to 1 (achromatic axis preserved exactly)."""
    p = np.asarray(params, float).reshape(3, 2)
    rows = [[a, b, 1.0 - a - b] for a, b in p]
    return np.array(rows)


def apply_linear(rgb, M):
    """Applied in linear light, matching how the shipped extension applies its matrix."""
    return quant(linear_to_srgb(np.clip(srgb_to_linear(np.clip(rgb, 0, 1)) @ M.T, 0, 1)))


# ---------- objective ----------

_CACHE = {}


def baseline(simfn, sname, deficiency, lat, pi, pj):
    """The uncorrected half of every metric never changes as the matrix varies. Computing it
    once instead of on every optimiser iteration is the difference between minutes and hours."""
    key = (sname, deficiency, len(lat), len(pi), int(pi[0]), int(pj[0]))
    if key not in _CACHE:
        so = simfn(lat, deficiency)
        a, b = np.triu_indices(len(OKABE), k=1)
        so_oi = simfn(OKABE, deficiency)
        _CACHE[key] = (de(so[pi], so[pj]), de(so_oi[a], so_oi[b]), a, b)
    return _CACHE[key]


def evaluate(M, simfn, deficiency, lat, pi, pj, sname=""):
    before, oi_before, a, b = baseline(simfn, sname, deficiency, lat, pi, pj)
    corrected = apply_linear(lat, M)
    sc = simfn(corrected, deficiency)
    after = de(sc[pi], sc[pj])
    gain = after - before

    sc_oi = simfn(apply_linear(OKABE, M), deficiency)
    oi = de(sc_oi[a], sc_oi[b]) - oi_before

    lin = srgb_to_linear(lat) @ M.T
    return {
        "gain": float(gain.mean()),
        "rescue": float(((before < COLLAPSE) & (after >= COLLAPSE)).mean()),
        "fidelity": float(de(lat, corrected).mean()),
        "okabe_mean": float(oi.mean()),
        "okabe_worst": float(oi.min()),
        "clip": float(np.mean(np.any((lin < 0) | (lin > 1), axis=1))),
        "made_worse": int((gain < -0.5).sum()),
    }


SATURATE = 15.0   # 1.5x the collapse threshold


def objective(params, deficiency, lat, pairs, budget, okabe_floor, clip_cap):
    """Maximise pairs LIFTED ACROSS the collapse threshold, not mean separation.

    Mean gain is a trap and the first version of this script fell into it: a matrix can raise
    the mean enormously by blowing apart pairs that were already distinguishable while letting
    marginal ones fall below threshold. That scored as a large improvement while the rescue
    rate dropped from 0.94 to 0.78 and clipping went from 35% to 57% of the sRGB cube.

    min(after, SATURATE) pays for lifting a pair up to the threshold and stops paying beyond
    it, so there is nothing to gain from over-separating. Piecewise linear, so Nelder-Mead is
    still happy.
    """
    M = build(params)
    scores, fids, oks, clips = [], [], [], []
    for sname in FIT_SIMS:
        pi, pj = pairs[sname]
        before, oi_before, a, b = baseline(SIMULATORS[sname], sname, deficiency, lat, pi, pj)
        corrected = apply_linear(lat, M)
        sc = SIMULATORS[sname](corrected, deficiency)
        after = de(sc[pi], sc[pj])
        scores.append(float(np.minimum(after, SATURATE).mean()))
        fids.append(float(de(lat, corrected).mean()))
        sc_oi = SIMULATORS[sname](apply_linear(OKABE, M), deficiency)
        oks.append(float((de(sc_oi[a], sc_oi[b]) - oi_before).mean()))
    lin = srgb_to_linear(lat) @ M.T
    clip = float(np.mean(np.any((lin < 0) | (lin > 1), axis=1)))

    score, fid, ok = np.mean(scores), np.mean(fids), np.mean(oks)
    # Constraints are penalties, never trades: gain bought by exceeding the fidelity budget,
    # damaging an already-accessible palette, or clipping more of the gamut is not a gain.
    pen = (40.0 * max(0.0, fid - budget) ** 2
           + 40.0 * max(0.0, okabe_floor - ok) ** 2
           + 60.0 * max(0.0, clip - clip_cap) ** 2)
    return -score + pen


# ---------- driver ----------

def optimise_one(deficiency, budget, okabe_floor, clip_cap, seed=0, restarts=4):
    lat_fit = lattice(7)
    pairs = {s: collapsing_pairs(lat_fit, SIMULATORS[s], deficiency, 700, seed=seed)
             for s in FIT_SIMS}

    current = np.array(json.load(open(f"transforms/opticquiz-{deficiency}.json"))["matrix"])
    starts = [np.array([[current[i][0], current[i][1]] for i in range(3)]).ravel()]
    rng = np.random.default_rng(seed)
    for _ in range(restarts - 1):
        starts.append(np.array([[1, 0], [0, 1], [0, 0]], float).ravel()
                      + rng.normal(0, 0.35, 6))

    best, best_v = None, np.inf
    for s0 in starts:
        r = minimize(objective, s0, args=(deficiency, lat_fit, pairs, budget, okabe_floor, clip_cap),
                     method="Nelder-Mead",
                     options={"maxiter": 1500, "xatol": 1e-4, "fatol": 1e-4})
        if r.fun < best_v:
            best, best_v = r.x, r.fun
    return build(best), current


def report(deficiency, M_new, M_old):
    """Score old and new on a DIFFERENT lattice and seed, under fitting and held-out models."""
    lat = lattice(9)
    print(f"\n{'=' * 78}\n{deficiency.upper()}   (held-out lattice 9, seed 99)\n{'=' * 78}")
    print(f"{'simulator':22s} {'':10s} {'rescue':>7s} {'gain':>8s} {'fidelity':>9s} "
          f"{'okabe':>7s} {'worst':>7s} {'clip':>6s}")
    summary = {}
    for group, sims in (("FIT", FIT_SIMS), ("HELD OUT", HOLDOUT_SIMS),
                        ("reference", REFERENCE_SIMS)):
        for sname in sims:
            pi, pj = collapsing_pairs(lat, SIMULATORS[sname], deficiency, 1200, seed=99)
            for label, M in (("current", M_old), ("new", M_new)):
                r = evaluate(M, SIMULATORS[sname], deficiency, lat, pi, pj, sname)
                summary.setdefault((group, label), []).append(r)
                print(f"{sname:22s} {label:10s} {r['rescue']:7.3f} {r['gain']:+8.2f} "
                      f"{r['fidelity']:9.2f} {r['okabe_mean']:+7.2f} {r['okabe_worst']:+7.2f} "
                      f"{r['clip']:6.3f}")
    print()
    def m(group, label, k):
        return float(np.mean([r[k] for r in summary[(group, label)]]))

    for group in ("FIT", "HELD OUT", "reference"):
        print(f"{group:9s} "
              f"rescue {m(group,'current','rescue'):.3f}->{m(group,'new','rescue'):.3f}  "
              f"gain {m(group,'current','gain'):+6.2f}->{m(group,'new','gain'):+6.2f}  "
              f"fid {m(group,'current','fidelity'):5.2f}->{m(group,'new','fidelity'):5.2f}  "
              f"okabe {m(group,'current','okabe_mean'):+5.2f}->{m(group,'new','okabe_mean'):+5.2f}  "
              f"clip {m(group,'current','clip'):.3f}->{m(group,'new','clip'):.3f}")

    # A win requires EVERY metric to hold on the held-out models. Checking only mean gain is
    # how the first version of this script blessed a matrix that dropped rescue by 16 points
    # and pushed gamut clipping from 35% to 57%. One metric is not a verdict.
    H = "HELD OUT"
    checks = [
        ("rescue rate",    m(H, "new", "rescue")     >= m(H, "current", "rescue") - 0.005),
        ("mean gain",      m(H, "new", "gain")       >= m(H, "current", "gain")),
        ("fidelity cost",  m(H, "new", "fidelity")   <= m(H, "current", "fidelity") + 0.25),
        ("safe palettes",  m(H, "new", "okabe_mean") >= m(H, "current", "okabe_mean") - 0.25),
        ("gamut clipping", m(H, "new", "clip")       <= m(H, "current", "clip") + 0.01),
    ]
    print()
    for name, ok in checks:
        print(f"   {'PASS' if ok else 'FAIL'}  {name}")
    verdict = all(ok for _, ok in checks)
    print("\n  " + ("SHIPPABLE - every metric holds or improves on models never used in the fit"
                    if verdict else
                    "REJECTED - a metric regressed. That is a trade, not an improvement."))
    return verdict


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", choices=["protan", "deutan", "tritan"])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--budget", type=float, default=None,
                    help="max mean fidelity cost in dE2000 (default: the current matrix's own)")
    ap.add_argument("--okabe-floor", type=float, default=None,
                    help="min safe-palette effect (default: the current matrix's own, i.e. "
                         "'do not make it worse' — the same rule the other two caps use)")
    ap.add_argument("--write", action="store_true", help="save the new matrix if it generalises")
    a = ap.parse_args()

    types = ["protan", "deutan", "tritan"] if a.all else [a.type]
    for t in types:
        cur = np.array(json.load(open(f"transforms/opticquiz-{t}.json"))["matrix"])
        lat = lattice(7)
        budget = a.budget
        if budget is None:
            budget = float(de(lat, apply_linear(lat, cur)).mean())
            print(f"[{t}] fidelity budget = the current matrix's own cost, {budget:.2f} dE")
        clip_cap = float(np.mean(np.any(((srgb_to_linear(lat) @ cur.T) < 0)
                                        | ((srgb_to_linear(lat) @ cur.T) > 1), axis=1)))
        print(f"[{t}] clipping cap    = the current matrix's own rate, {clip_cap:.3f}")
        okabe_floor = a.okabe_floor
        if okabe_floor is None:
            oks = []
            for sname in FIT_SIMS:
                pi, pj = collapsing_pairs(lat, SIMULATORS[sname], t, 400, seed=0)
                oks.append(evaluate(cur, SIMULATORS[sname], t, lat, pi, pj, sname)["okabe_mean"])
            okabe_floor = float(np.mean(oks))
            print(f"[{t}] safe-palette floor = the current matrix's own, {okabe_floor:+.2f}")
        M, old = optimise_one(t, budget, okabe_floor, clip_cap)
        ok = report(t, M, old)
        print("\nnew matrix (linear light, rows sum to 1):")
        for r in M:
            print("  [" + "  ".join(f"{v:9.5f}" for v in r) + "]")
        if a.write and ok:
            json.dump({"name": f"opticquiz v2 ({t})", "space": "linear",
                       "matrix": M.tolist(), "offset": [0, 0, 0],
                       "derivation": "optimise.py — rows constrained to sum to 1 so the "
                                     "achromatic axis is preserved exactly; fitted against "
                                     f"{FIT_SIMS} and verified on {HOLDOUT_SIMS}",
                       "fidelity_budget_dE": round(budget, 3)},
                      open(f"transforms/opticquiz-v2-{t}.json", "w"), indent=2)
            print(f"\nwrote transforms/opticquiz-v2-{t}.json")


if __name__ == "__main__":
    main()
