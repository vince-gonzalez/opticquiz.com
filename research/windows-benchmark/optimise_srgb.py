"""
Matrices for the DESKTOP APP, derived in the space it actually applies them in.

    python optimise_srgb.py --all --write

WHY THIS EXISTS
    Every browser surface applies its matrix in linear light
    (color-interpolation-filters="linearRGB"). The desktop app hands its matrix to
    MagSetFullscreenColorEffect, which operates on GAMMA-ENCODED sRGB. Same numbers,
    different transform — measured at deutan rescue 0.731 (linear) vs 0.696 (sRGB).

    So the desktop app has been running matrices optimised for a space it does not use.
    Rather than document that as a known limitation, this derives matrices FOR sRGB space
    under the same objective and the same holdout discipline as optimise_net.py.

    A matrix is not transferable between the two spaces: the sRGB transfer curve sits
    between them, and no 3x3 undoes a nonlinearity.

HOLDOUT — unchanged from optimise_net.py, because the discipline is the point
    SIMULATORS   fit on Machado 2009 + Brettel 1997; scored on Vienot / Vischeck / Coblis
    PALETTES     fit on 6 of the 10 real palettes; scored on the 4 never seen
"""
import argparse, json, os, sys, warnings
import numpy as np
from scipy.optimize import minimize

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
from field import SIMULATORS, de, quant, COLLAPSE          # noqa: E402
from content import hexes_to_rgb, PAL                       # noqa: E402

HERE = os.path.dirname(__file__)
FIT_SIMS = ["dl-machado2009", "dl-brettel1997"]
HOLD_SIMS = ["dl-vienot1999", "dl-vischeck", "dl-coblisv2"]
DISTINCT = 20.0
_ids = sorted(PAL.keys())
FIT_PAL, HOLD_PAL = _ids[:6], _ids[6:]
_cache = {}


def build(p):
    q = np.asarray(p, float).reshape(3, 2)
    return np.array([[a, b, 1.0 - a - b] for a, b in q])      # rows sum to 1: grey preserved


def apply_srgb(rgb, M):
    """The desktop app's actual pipeline: matrix straight onto gamma-encoded values."""
    return quant(np.clip(np.asarray(rgb, float) @ M.T, 0, 1))


def prep(pid, t, sim):
    key = (pid, t, sim)
    if key not in _cache:
        rgb = hexes_to_rgb(PAL[pid]["colors"])
        a, b = np.triu_indices(len(rgb), k=1)
        keep = de(rgb[a], rgb[b]) >= DISTINCT
        a, b = a[keep], b[keep]
        f = SIMULATORS[sim]
        bef = de(f(rgb, t)[a], f(rgb, t)[b])
        _cache[key] = (rgb, a, b, bef < COLLAPSE)
    return _cache[key]


def evaluate(M, t, pids, sims, applier=apply_srgb):
    resc = broke = coll = 0
    fid = []
    for pid in pids:
        rgb = hexes_to_rgb(PAL[pid]["colors"])
        cor = applier(rgb, M)
        fid.append(float(de(rgb, cor).mean()))
        for s in sims:
            _, a, b, cb = prep(pid, t, s)
            sc = SIMULATORS[s](cor, t)
            ca = de(sc[a], sc[b]) < COLLAPSE
            coll += int(cb.sum())
            resc += int((cb & ~ca).sum())
            broke += int((~cb & ca).sum())
    return {"collapsed": coll, "rescued": resc, "broken": broke,
            "net": resc - broke, "fidelity": float(np.mean(fid))}


def objective(p, t, budget):
    M = build(p)
    r = evaluate(M, t, FIT_PAL, FIT_SIMS)
    return -r["net"] + 3.0 * max(0.0, r["fidelity"] - budget) ** 2


def run(t, budget, write, restarts=36, seed=5):
    rng = np.random.default_rng(seed)
    starts = []
    for _ in range(restarts):
        D = rng.normal(0, 0.45, (3, 3)); D -= D.mean(axis=1, keepdims=True)
        M0 = np.eye(3) + D
        starts.append(np.array([[M0[i][0], M0[i][1]] for i in range(3)]).ravel())
    best, bv = None, np.inf
    for s0 in starts:
        r = minimize(objective, s0, args=(t, budget), method="Nelder-Mead",
                     options={"maxiter": 600, "xatol": 1e-3, "fatol": 1e-3})
        if r.fun < bv:
            best, bv = r.x, r.fun
    M = build(best)

    # What the desktop app ships TODAY: a linear-space matrix applied in sRGB space.
    cur = np.array(json.load(open(f"{HERE}/transforms/opticquiz-{t}.json"))["matrix"])

    print(f"\n{'=' * 72}\n{t.upper()}  (matrices applied in gamma-encoded sRGB)\n{'=' * 72}")
    print(f"{'':34s} {'net':>5s} {'rescued':>8s} {'broken':>7s} {'fidelity':>9s}")
    res = {}
    for label, mat in (("v1 linear matrix, run in sRGB", cur), ("NEW sRGB-derived", M)):
        for g, pids, sims in (("fit", FIT_PAL, FIT_SIMS), ("HELD OUT", HOLD_PAL, HOLD_SIMS)):
            r = evaluate(mat, t, pids, sims)
            res[(label, g)] = r
            print(f"{label:30s} {g:8s} {r['net']:+5d} {r['rescued']:8d} "
                  f"{r['broken']:7d} {r['fidelity']:9.2f}")
    H = "HELD OUT"
    old, new = res[("v1 linear matrix, run in sRGB", H)], res[("NEW sRGB-derived", H)]
    ok = new["net"] > old["net"] and new["broken"] < new["rescued"]
    print(f"\n   {'PASS' if new['net'] > old['net'] else 'FAIL'}  net beats the current "
          f"build on unseen palettes and unseen models ({old['net']:+d} -> {new['net']:+d})")
    print(f"   {'PASS' if new['broken'] < new['rescued'] else 'FAIL'}  breaks fewer than it rescues")
    print("\n  " + ("SHIPPABLE" if ok else "REJECTED"))
    if ok:
        for r in M:
            print("    [" + "  ".join(f"{v:9.5f}" for v in r) + "]")
        if write:
            json.dump({"name": f"opticquiz desktop ({t})", "space": "srgb",
                       "matrix": M.tolist(), "offset": [0, 0, 0],
                       "derivation": "optimise_srgb.py — fitted and scored with the matrix "
                                     "applied to GAMMA-ENCODED sRGB, which is what "
                                     "MagSetFullscreenColorEffect actually does",
                       "held_out": new},
                      open(f"{HERE}/transforms/opticquiz-desktop-{t}.json", "w"), indent=2)
            print(f"\n  wrote transforms/opticquiz-desktop-{t}.json")
    return ok


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", choices=["protan", "deutan", "tritan"])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--budget", type=float, default=12.0)
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    for t in (["protan", "deutan", "tritan"] if a.all else [a.type]):
        run(t, a.budget, a.write)
