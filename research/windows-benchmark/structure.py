"""
Is the rescue/break trade a tuning failure, or a structural limit?

    python structure.py

THE HYPOTHESIS
    A dichromat simulation S is a rank-2 projection: it collapses 3D colour onto a 2D
    surface. For ANY matrix M, the composition S(M(c)) is still rank 2 — a global linear
    map cannot manufacture a third dimension, only re-allocate which directions of colour
    space land where in a bounded 2D image.

    If that is the binding constraint, then every global matrix should sit on the same
    frontier: pairs you separate are paid for with pairs you crush, and no amount of
    searching finds a matrix with large positive net. The rescue/break trade would not be
    a tuning failure at all — it would be a property of the problem.

    If instead the cloud of random matrices shows a clear positive-net region that the
    shipped matrices simply failed to reach, the limit is tuning and the search was bad.

    This distinguishes those two, which is the difference between "optimise harder" and
    "stop using a global matrix".

WHAT IS SAMPLED
    Random matrices constrained to rows summing to 1 (grey-preserving — the same family
    optimise.py searches), across a range of strengths, plus the shipped v1/v2 matrices and
    daltonize as reference points. Scored on the 10 real palettes from /palettes/.
"""
import json, os, sys, warnings
import numpy as np

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
from field import (SIMULATORS, de, quant, srgb_to_linear, linear_to_srgb,
                   COLLAPSE, corr_daltonize)                       # noqa: E402
from content import hexes_to_rgb, PAL                              # noqa: E402

SIMS = ["dl-brettel1997", "dl-vienot1999", "opticquiz-machado2009"]
DISTINCT = 20.0
HERE = os.path.dirname(__file__)


def apply_lin(rgb, M):
    return quant(linear_to_srgb(np.clip(srgb_to_linear(np.clip(rgb, 0, 1)) @ M.T, 0, 1)))


def rank_of_composition(M, t, n=4000, seed=0):
    """Empirical rank of S∘M: how many dimensions survive the simulation."""
    rng = np.random.default_rng(seed)
    c = rng.random((n, 3))
    out = SIMULATORS[t if False else "dl-brettel1997"](apply_lin(c, M), t)
    x = out - out.mean(0)
    s = np.linalg.svd(x, compute_uv=False)
    return s / s[0]


def score_matrix(M, t):
    """rescued, broken, net, mean distortion over the 10 real palettes."""
    resc = broke = coll = 0
    fid = []
    for p in PAL.values():
        rgb = hexes_to_rgb(p["colors"])
        cor = apply_lin(rgb, M)
        fid.append(float(de(rgb, cor).mean()))
        a, b = np.triu_indices(len(rgb), k=1)
        keep = de(rgb[a], rgb[b]) >= DISTINCT
        a, b = a[keep], b[keep]
        for s in SIMS:
            f = SIMULATORS[s]
            bef = de(f(rgb, t)[a], f(rgb, t)[b])
            aft = de(f(cor, t)[a], f(cor, t)[b])
            cb, ca = bef < COLLAPSE, aft < COLLAPSE
            coll += int(cb.sum())
            resc += int((cb & ~ca).sum())
            broke += int((~cb & ca).sum())
    return {"collapsed": coll, "rescued": resc, "broken": broke,
            "net": resc - broke, "fidelity": float(np.mean(fid))}


def random_matrix(rng, strength):
    """Row-sums-1 (grey-preserving), perturbed from identity by `strength`."""
    D = rng.normal(0, strength, (3, 3))
    D -= D.mean(axis=1, keepdims=True)      # rows of the perturbation sum to 0
    return np.eye(3) + D


def main():
    print("Empirical rank of S(M(c)) — does any matrix survive the projection with 3 dims?\n")
    rng = np.random.default_rng(0)
    for label, M in [("identity", np.eye(3)),
                     ("shipped deutan v2", np.array(json.load(open(
                         f"{HERE}/transforms/opticquiz-v2-deutan.json"))["matrix"])),
                     ("random strong", random_matrix(rng, 0.6))]:
        sv = rank_of_composition(M, "deutan")
        print(f"  {label:20s} singular values {sv[0]:.3f} {sv[1]:.3f} {sv[2]:.6f}")
    print("  -> the third value is the dimension the dichromat has lost. No M restores it.\n")

    for t in ("protan", "deutan", "tritan"):
        rows = []
        rng = np.random.default_rng(7)
        for strength in (0.05, 0.1, 0.2, 0.35, 0.5, 0.7):
            for _ in range(60):
                M = random_matrix(rng, strength)
                r = score_matrix(M, t)
                r["strength"] = strength
                rows.append(r)
        refs = {}
        for tag, path in (("v1", f"opticquiz-{t}"), ("v2", f"opticquiz-v2-{t}")):
            try:
                refs[tag] = score_matrix(np.array(json.load(open(
                    f"{HERE}/transforms/{path}.json"))["matrix"]), t)
            except FileNotFoundError:
                pass

        nets = np.array([r["net"] for r in rows])
        best = rows[int(nets.argmax())]
        coll = rows[0]["collapsed"]
        print(f"{t.upper()}  ({len(rows)} random grey-preserving matrices, "
              f"{coll} collapsed pairs to fix)")
        print(f"  best net found      {best['net']:+5d}   "
              f"(rescued {best['rescued']}, broke {best['broken']}, "
              f"fidelity {best['fidelity']:.1f}, strength {best['strength']})")
        print(f"  median net          {int(np.median(nets)):+5d}"
              f"      positive-net matrices: {int((nets > 0).sum())}/{len(nets)}")
        print(f"  best rescue-only    {max(r['rescued'] for r in rows):5d}"
              f"      but that matrix broke "
              f"{max(rows, key=lambda r: r['rescued'])['broken']}")
        for tag, r in refs.items():
            print(f"  shipped {tag:3s}         {r['net']:+5d}   "
                  f"(rescued {r['rescued']}, broke {r['broken']}, fidelity {r['fidelity']:.1f})")
        # the ceiling as a fraction of what is there to fix
        print(f"  CEILING: best net is {100.0 * best['net'] / max(coll, 1):.1f}% of the "
              f"{coll} collapsed pairs\n")


if __name__ == "__main__":
    main()
