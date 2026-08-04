"""
Optimise the RIGHT objective: net pairs, not rescue.

    python optimise_net.py --all --write

WHY THIS EXISTS
    optimise.py maximised min(dE, 15) over pairs that were already collapsed. That rewards
    rescuing and never once penalises BREAKING a pair that was fine. M7 (net = rescued -
    broken) was not invented until after those matrices shipped, so nothing had ever been
    optimised for it.

    structure.py then showed the cost: 360 random grey-preserving matrices contained several
    that beat every shipped matrix outright — deutan net +44 against our +25, tritan +21 with
    ZERO pairs broken against our +10. The limit was never structural. It was the objective.

WHAT IS OPTIMISED
    net = rescued - broken, over pairs a normal viewer can distinguish (dE >= 20), summed
    over the fitting simulators and the fitting palettes, with fidelity capped.

HOLD-OUT DISCIPLINE — two independent splits, because the objective is now content-based
    SIMULATORS  fit on Machado 2009 + Brettel 1997; scored on Vienot, Vischeck, Coblis
    PALETTES    fit on 6 of the 10 real palettes; scored on the 4 never seen

    A matrix that wins on the fitting palettes and not the held-out ones has memorised six
    palettes, which is worth nothing. The script says so and refuses to write it.
"""
import argparse, json, os, sys, warnings
import numpy as np
from scipy.optimize import minimize

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
from field import (SIMULATORS, de, quant, srgb_to_linear, linear_to_srgb, COLLAPSE)  # noqa: E402
from content import hexes_to_rgb, PAL                                                # noqa: E402

HERE = os.path.dirname(__file__)
FIT_SIMS = ["dl-machado2009", "dl-brettel1997"]
HOLD_SIMS = ["dl-vienot1999", "dl-vischeck", "dl-coblisv2"]
DISTINCT = 20.0

_ids = sorted(PAL.keys())
FIT_PAL = _ids[:6]
HOLD_PAL = _ids[6:]

_cache = {}


def prep(pid, t, sim):
    """Everything about a (palette, deficiency, simulator) that the matrix cannot change."""
    key = (pid, t, sim)
    if key not in _cache:
        rgb = hexes_to_rgb(PAL[pid]["colors"])
        a, b = np.triu_indices(len(rgb), k=1)
        keep = de(rgb[a], rgb[b]) >= DISTINCT
        a, b = a[keep], b[keep]
        f = SIMULATORS[sim]
        bef = de(f(rgb, t)[a], f(rgb, t)[b])
        _cache[key] = (rgb, a, b, bef, bef < COLLAPSE)
    return _cache[key]


def build(p):
    q = np.asarray(p, float).reshape(3, 2)
    return np.array([[a, b, 1.0 - a - b] for a, b in q])


def apply_lin(rgb, M):
    return quant(linear_to_srgb(np.clip(srgb_to_linear(np.clip(rgb, 0, 1)) @ M.T, 0, 1)))


def evaluate(M, t, pids, sims):
    resc = broke = coll = 0
    fid = []
    for pid in pids:
        rgb = hexes_to_rgb(PAL[pid]["colors"])
        cor = apply_lin(rgb, M)
        fid.append(float(de(rgb, cor).mean()))
        for s in sims:
            _, a, b, bef, cb = prep(pid, t, s)
            aft = de(SIMULATORS[s](cor, t)[a], SIMULATORS[s](cor, t)[b])
            ca = aft < COLLAPSE
            coll += int(cb.sum())
            resc += int((cb & ~ca).sum())
            broke += int((~cb & ca).sum())
    return {"collapsed": coll, "rescued": resc, "broken": broke,
            "net": resc - broke, "fidelity": float(np.mean(fid))}


def objective(p, t, budget):
    M = build(p)
    r = evaluate(M, t, FIT_PAL, FIT_SIMS)
    # Soft counts would optimise better, but net is what is reported, so net is what is
    # optimised — no surrogate that could quietly diverge from the published number.
    pen = 3.0 * max(0.0, r["fidelity"] - budget) ** 2
    return -r["net"] + pen


def run(t, budget, write, restarts=40, seed=3):
    rng = np.random.default_rng(seed)
    cur = np.array(json.load(open(f"{HERE}/transforms/opticquiz-{t}.json"))["matrix"])
    v2p = f"{HERE}/transforms/opticquiz-v2-{t}.json"
    starts = [np.array([[cur[i][0], cur[i][1]] for i in range(3)]).ravel()]
    if os.path.exists(v2p):
        v2 = np.array(json.load(open(v2p))["matrix"])
        starts.append(np.array([[v2[i][0], v2[i][1]] for i in range(3)]).ravel())
    for _ in range(restarts):
        D = rng.normal(0, 0.45, (3, 3))
        D -= D.mean(axis=1, keepdims=True)
        M0 = np.eye(3) + D
        starts.append(np.array([[M0[i][0], M0[i][1]] for i in range(3)]).ravel())

    best, bv = None, np.inf
    for s0 in starts:
        r = minimize(objective, s0, args=(t, budget), method="Nelder-Mead",
                     options={"maxiter": 700, "xatol": 1e-3, "fatol": 1e-3})
        if r.fun < bv:
            best, bv = r.x, r.fun
    M = build(best)

    print(f"\n{'=' * 76}\n{t.upper()}   fidelity budget {budget:.1f} dE\n{'=' * 76}")
    print(f"{'':22s} {'collapsed':>10s} {'rescued':>8s} {'broken':>7s} {'net':>5s} {'fidelity':>9s}")
    verdict = {}
    for label, mat in (("v1 (shipped)", cur),
                       ("v2", np.array(json.load(open(v2p))["matrix"]) if os.path.exists(v2p) else None),
                       ("v3 (net-optimised)", M)):
        if mat is None:
            continue
        for gname, pids, sims in (("fit", FIT_PAL, FIT_SIMS), ("HELD OUT", HOLD_PAL, HOLD_SIMS)):
            r = evaluate(mat, t, pids, sims)
            verdict[(label, gname)] = r
            print(f"{label:18s} {gname:6s} {r['collapsed']:8d} {r['rescued']:8d} "
                  f"{r['broken']:7d} {r['net']:+5d} {r['fidelity']:9.2f}")
    print()

    H = "HELD OUT"
    base = max((verdict[(l, H)]["net"] for l in ("v1 (shipped)", "v2") if (l, H) in verdict))
    new = verdict[("v3 (net-optimised)", H)]
    checks = [("net beats both shipped, on unseen palettes AND unseen models", new["net"] > base),
              ("fidelity within budget", new["fidelity"] <= budget + 0.5),
              ("breaks fewer than it rescues", new["broken"] < new["rescued"])]
    for n, ok in checks:
        print(f"   {'PASS' if ok else 'FAIL'}  {n}")
    ok = all(o for _, o in checks)
    print("\n  " + ("SHIPPABLE" if ok else "REJECTED"))
    if ok:
        print("\n  matrix (linear light, rows sum to 1):")
        for r in M:
            print("    [" + "  ".join(f"{v:9.5f}" for v in r) + "]")
        if write:
            json.dump({"name": f"opticquiz v3 ({t})", "space": "linear", "matrix": M.tolist(),
                       "offset": [0, 0, 0],
                       "derivation": "optimise_net.py — maximises M7 (rescued - broken) on 6 "
                                     "real palettes under 2 simulators; verified on 4 unseen "
                                     "palettes under 3 unseen simulators",
                       "held_out": new},
                      open(f"{HERE}/transforms/opticquiz-v3-{t}.json", "w"), indent=2)
            print(f"\n  wrote transforms/opticquiz-v3-{t}.json")
    return ok


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", choices=["protan", "deutan", "tritan"])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--budget", type=float, default=12.0)
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    print(f"fit palettes  : {', '.join(FIT_PAL)}")
    print(f"HELD OUT      : {', '.join(HOLD_PAL)}")
    for t in (["protan", "deutan", "tritan"] if a.all else [a.type]):
        run(t, a.budget, a.write)
