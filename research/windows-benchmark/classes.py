"""
Every approach at ITS OWN optimum, under identical conditions.

    python classes.py --deficiency deutan
    python classes.py --all

WHY THIS EXISTS
    FIELD.md compared our optimised matrix against daltonize's fixed implementation. That is
    rigged: one side was tuned on the stimuli and the other was not. It tells you which
    IMPLEMENTATION won, not which APPROACH is better — and the approach is the thing worth
    knowing.

    Here every parametric class is fitted by the same optimiser, on the same folds, against
    the same objective, and scored on the same held-out data. Non-parametric references
    (daltonize, fix_palette) are scored unchanged and labelled as such, because they have
    nothing to fit.

THREE PURITY FIXES OVER THE EARLIER RUNS
    K-FOLD          5 folds over the 10 real palettes instead of one 6/4 split, so a lucky
                    split cannot masquerade as a result. Reported as mean +/- spread.
    SEVERITY        Dichromacy (severity 1.0) is the MINORITY case; most colour-vision-
                    deficient people are anomalous trichromats. Every matrix shipped so far
                    was optimised for severity 1.0 alone. Scored at 0.4 / 0.7 / 1.0.
    SIMULATOR SPLIT kept from before: fit on Machado + Brettel, score on Vienot/Vischeck/
                    Coblis, which no fit ever sees.

CLASSES
    identity              control; must score exactly 0
    matrix-grey           3x3, rows sum to 1 (achromatic axis preserved)      6 DOF
    matrix-free           3x3, unconstrained — does grey-preservation cost?    9 DOF
    affine                3x3 + offset                                       12 DOF
    daltonize (Fidaner)   published, fixed, not fitted                        reference
    fix_palette           set-wise content-aware, not fitted                  reference
"""
import argparse, json, os, sys, warnings
import numpy as np
from scipy.optimize import minimize

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "cvd-py"))
import opticquiz_cvd as q                                                        # noqa: E402
from field import (SIMULATORS, de, quant, srgb_to_linear, linear_to_srgb,
                   COLLAPSE, corr_daltonize)                                     # noqa: E402
from content import hexes_to_rgb, rgb_to_hexes, PAL                              # noqa: E402
from daltonlens import simulate as dl                                            # noqa: E402

DISTINCT = 20.0
FIT_SIMS = ["machado", "brettel"]
HOLD_SIMS = ["vienot", "vischeck", "coblis"]
_SIM = {"machado": dl.Simulator_Machado2009, "brettel": dl.Simulator_Brettel1997,
        "vienot": dl.Simulator_Vienot1999, "vischeck": dl.Simulator_Vischeck,
        "coblis": dl.Simulator_CoblisV2}
_DEF = {"protan": dl.Deficiency.PROTAN, "deutan": dl.Deficiency.DEUTAN,
        "tritan": dl.Deficiency.TRITAN}
_inst, _cache = {}, {}


def sim(rgb, t, name, severity):
    """Simulation at a chosen SEVERITY. severity<1 is anomalous trichromacy — the common case."""
    if name not in _inst:
        _inst[name] = _SIM[name]()
    img = (np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8).reshape(1, -1, 3)
    out = _inst[name].simulate_cvd(img, _DEF[t], severity=severity)
    return np.asarray(out).reshape(-1, 3).astype(float) / 255.0


def baseline(pid, t, s, sev):
    key = (pid, t, s, sev)
    if key not in _cache:
        rgb = hexes_to_rgb(PAL[pid]["colors"])
        a, b = np.triu_indices(len(rgb), k=1)
        keep = de(rgb[a], rgb[b]) >= DISTINCT
        a, b = a[keep], b[keep]
        sm = sim(rgb, t, s, sev)
        bef = de(sm[a], sm[b])
        _cache[key] = (rgb, a, b, bef < COLLAPSE)
    return _cache[key]


# ---------- classes ----------

def mk_grey(p):
    v = np.asarray(p, float).reshape(3, 2)
    return np.array([[a, b, 1 - a - b] for a, b in v]), np.zeros(3)


def mk_free(p):
    return np.asarray(p, float).reshape(3, 3), np.zeros(3)


def mk_affine(p):
    p = np.asarray(p, float)
    return p[:9].reshape(3, 3), p[9:12]


CLASSES = {"matrix-grey": (mk_grey, 6), "matrix-free": (mk_free, 9), "affine": (mk_affine, 12)}


def apply_mat(rgb, M, off):
    lin = srgb_to_linear(np.clip(rgb, 0, 1)) @ M.T + off
    return quant(linear_to_srgb(np.clip(lin, 0, 1)))


def corr_fixpalette(rgb, t):
    out = q.fix_palette(rgb_to_hexes(rgb))
    return hexes_to_rgb(out["colors"] if isinstance(out, dict) else out)


def net_on(fn, pids, t, sims, sev):
    resc = broke = coll = 0
    fid = []
    for pid in pids:
        rgb = hexes_to_rgb(PAL[pid]["colors"])
        cor = fn(rgb, t)
        fid.append(float(de(rgb, cor).mean()))
        for s in sims:
            _, a, b, cb = baseline(pid, t, s, sev)
            sm = sim(cor, t, s, sev)
            ca = de(sm[a], sm[b]) < COLLAPSE
            coll += int(cb.sum())
            resc += int((cb & ~ca).sum())
            broke += int((~cb & ca).sum())
    return {"collapsed": coll, "rescued": resc, "broken": broke,
            "net": resc - broke, "fidelity": float(np.mean(fid))}


def fit_class(cname, t, train, sev, budget, seed, restarts=10):
    mk, ndof = CLASSES[cname]

    def obj(p):
        M, off = mk(p)
        r = net_on(lambda rgb, tt: apply_mat(rgb, M, off), train, t, FIT_SIMS, sev)
        return -r["net"] + 3.0 * max(0.0, r["fidelity"] - budget) ** 2

    rng = np.random.default_rng(seed)
    base = np.eye(3)
    starts = []
    for _ in range(restarts):
        D = rng.normal(0, 0.4, (3, 3))
        if cname == "matrix-grey":
            D -= D.mean(axis=1, keepdims=True)
            starts.append(np.array([[(base + D)[i][0], (base + D)[i][1]] for i in range(3)]).ravel())
        elif cname == "matrix-free":
            starts.append((base + D).ravel())
        else:
            starts.append(np.concatenate([(base + D).ravel(), rng.normal(0, 0.03, 3)]))
    best, bv = None, np.inf
    for s0 in starts:
        r = minimize(obj, s0, method="Nelder-Mead",
                     options={"maxiter": 500, "xatol": 1e-3, "fatol": 1e-3})
        if r.fun < bv:
            best, bv = r.x, r.fun
    return mk(best)


def run(t, sev, budget, folds=5, seed=11):
    pids = sorted(PAL.keys())
    rng = np.random.default_rng(seed)
    order = rng.permutation(len(pids))
    chunks = np.array_split(order, folds)

    results = {c: [] for c in list(CLASSES) + ["daltonize (ref)", "fix_palette (ref)", "identity"]}
    for k in range(folds):
        test = [pids[i] for i in chunks[k]]
        train = [p for p in pids if p not in test]
        for cname in CLASSES:
            M, off = fit_class(cname, t, train, sev, budget, seed + k)
            results[cname].append(net_on(lambda rgb, tt: apply_mat(rgb, M, off),
                                         test, t, HOLD_SIMS, sev))
        results["daltonize (ref)"].append(net_on(corr_daltonize, test, t, HOLD_SIMS, sev))
        results["fix_palette (ref)"].append(net_on(corr_fixpalette, test, t, HOLD_SIMS, sev))
        results["identity"].append(net_on(lambda rgb, tt: rgb.copy(), test, t, HOLD_SIMS, sev))

    print(f"\n{t.upper()}  severity {sev}  —  {folds}-fold CV, scored on held-out palettes "
          f"AND held-out simulators")
    print(f"{'class':22s} {'net (mean+-sd)':>18s} {'rescued':>8s} {'broken':>7s} {'fidelity':>9s}")
    out = {}
    for cname, rs in results.items():
        nets = np.array([r["net"] for r in rs])
        out[cname] = {"net_mean": float(nets.mean()), "net_sd": float(nets.std()),
                      "rescued": int(sum(r["rescued"] for r in rs)),
                      "broken": int(sum(r["broken"] for r in rs)),
                      "fidelity": float(np.mean([r["fidelity"] for r in rs]))}
        o = out[cname]
        print(f"{cname:22s} {o['net_mean']:+9.1f} +- {o['net_sd']:4.1f} "
              f"{o['rescued']:8d} {o['broken']:7d} {o['fidelity']:9.2f}")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--deficiency", choices=["protan", "deutan", "tritan"])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--severity", type=float, default=None)
    ap.add_argument("--budget", type=float, default=12.0)
    a = ap.parse_args()
    sevs = [a.severity] if a.severity else [1.0, 0.7, 0.4]
    defs = ["protan", "deutan", "tritan"] if a.all else [a.deficiency]
    allout = {}
    for t in defs:
        for sv in sevs:
            allout[f"{t}@{sv}"] = run(t, sv, a.budget)
    json.dump(allout, open(os.path.join(os.path.dirname(__file__), "results/classes.json"), "w"),
              indent=2)
    print("\nwrote results/classes.json")
