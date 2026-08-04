"""
Content-aware correction — move only what actually collides, only as far as needed.

    python content.py

WHY THIS IS A DIFFERENT MEASUREMENT, NOT A CONTINUATION
    FIELD.md scores global transforms over a uniform lattice, because a global transform is
    defined on every colour independently. A content-aware corrector is defined on a SET: it
    looks at the colours actually present together and moves only the ones that collide with
    each other. Scoring it on a lattice would be meaningless — the lattice is not content.

    So the stimulus here is real palettes, and every corrector is scored the same way on them.
    This is a palette-level benchmark. It is reported separately and must not be compared
    row-for-row against the lattice numbers.

THE CANDIDATE
    `fix_palette` from the OpticQuiz engine — already shipping in /checker/ — is exactly a
    set-wise minimal-movement corrector: it separates conflicting pairs along the CIELAB
    lightness axis under a per-colour dE2000 drift budget, and leaves non-conflicting colours
    alone. It has never been applied to live content. The gated-correction negative result
    (FIELD.md) pointed here: confusability is a property of PAIRS, so the corrector has to see
    pairs, and only a set-wise method does.

PROVENANCE
    Palettes are extracted verbatim from window.BENCH in /palettes/ — the benchmark page
    already built and published on the site — not retyped from memory.
"""
import json, os, sys, warnings
import numpy as np

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "cvd-py"))
import opticquiz_cvd as q                                            # noqa: E402
from field import SIMULATORS, de, quant, srgb_to_linear, linear_to_srgb, COLLAPSE  # noqa: E402
from field import corr_daltonize                                     # noqa: E402

SIMS = ["opticquiz-machado2009", "dl-brettel1997", "dl-vienot1999",
        "dl-machado2009", "dl-vischeck", "dl-coblisv2"]
PAL = json.load(open(os.path.join(os.path.dirname(__file__), "palettes_real.json")))


def hexes_to_rgb(hs):
    return np.array([[int(h.lstrip("#")[k:k + 2], 16) / 255 for k in (0, 2, 4)] for h in hs])


def rgb_to_hexes(a):
    return ["#%02x%02x%02x" % tuple(int(np.floor(v * 255 + 0.5)) for v in c) for c in a]


# ---------- correctors ----------

def c_identity(rgb, t):
    return rgb.copy()


_M = {}


def c_matrix(rgb, t):
    if t not in _M:
        here = os.path.dirname(__file__)
        name = json.load(open(os.path.join(here, "shipping.json")))["linear_surfaces"][t]["transform"]
        _M[t] = np.array(json.load(open(os.path.join(here, f"transforms/{name}.json")))["matrix"])
    return quant(linear_to_srgb(np.clip(srgb_to_linear(rgb) @ _M[t].T, 0, 1)))


def c_fixpalette(rgb, t):
    """Set-wise, content-aware. Sees the whole palette and moves only conflicting members."""
    out = q.fix_palette(rgb_to_hexes(rgb))
    return hexes_to_rgb(out["colors"] if isinstance(out, dict) else out)


CORRECTORS = {
    "identity (control)": c_identity,
    "global matrix (shipped)": c_matrix,
    "daltonize (Fidaner)": corr_daltonize,
    "fix_palette (content-aware)": c_fixpalette,
}


def score(corrected, pal_rgb, t, simname):
    """Takes the ALREADY-corrected palette: correcting once per (corrector, palette,
    deficiency) instead of once per simulator is the difference between minutes and seconds,
    and fix_palette in particular is an iterative optimiser."""
    f = SIMULATORS[simname]
    n = len(pal_rgb)
    a, b = np.triu_indices(n, k=1)
    so, sc = f(pal_rgb, t), f(corrected, t)
    before, after = de(so[a], so[b]), de(sc[a], sc[b])
    collapsed = before < COLLAPSE
    return {
        "pairs_collapsed_before": int(collapsed.sum()),
        "pairs_collapsed_after": int((after < COLLAPSE).sum()),
        "rescued": int((collapsed & (after >= COLLAPSE)).sum()),
        "fidelity": float(de(pal_rgb, corrected).mean()),
        "worst_move": float(de(pal_rgb, corrected).max()),
    }


def main():
    rows = []
    for t in ("protan", "deutan", "tritan"):
        for name, fn in CORRECTORS.items():
            tot_before = tot_after = tot_rescued = 0
            fids, worsts = [], []
            for pid, p in PAL.items():
                rgb = hexes_to_rgb(p["colors"])
                corrected = fn(rgb, t)
                d = de(rgb, corrected)
                fids.append(float(d.mean())); worsts.append(float(d.max()))
                for s in SIMS:
                    r = score(corrected, rgb, t, s)
                    tot_before += r["pairs_collapsed_before"]
                    tot_after += r["pairs_collapsed_after"]
                    tot_rescued += r["rescued"]
            rows.append({"deficiency": t, "corrector": name,
                         "collapsed_before": tot_before, "collapsed_after": tot_after,
                         "rescued": tot_rescued,
                         "rescue_rate": round(tot_rescued / max(tot_before, 1), 3),
                         "fidelity_mean": round(float(np.mean(fids)), 2),
                         "worst_move_mean": round(float(np.mean(worsts)), 2)})

    print(f"10 real palettes x {len(SIMS)} simulators. Collapsed = pair below dE2000 {COLLAPSE}.\n")
    print(f"{'':10s} {'corrector':28s} {'collapsed':>10s} {'after':>7s} {'rescued':>8s} "
          f"{'rate':>6s} {'fidelity':>9s} {'worst':>7s}")
    for r in rows:
        print(f"{r['deficiency']:10s} {r['corrector']:28s} {r['collapsed_before']:10d} "
              f"{r['collapsed_after']:7d} {r['rescued']:8d} {r['rescue_rate']:6.3f} "
              f"{r['fidelity_mean']:9.2f} {r['worst_move_mean']:7.2f}")
    json.dump(rows, open(os.path.join(os.path.dirname(__file__), "results/content.json"), "w"),
              indent=2)
    print("\nwrote results/content.json")


if __name__ == "__main__":
    main()
