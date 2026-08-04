"""
Content-aware correction for live content — does the palette-level win survive the mapping?

    python live_content.py

CONTENT.md showed fix_palette leaves roughly half as many pairs confusable as any global
matrix, at half the distortion. But fix_palette corrects a PALETTE. Live content has millions
of colours, so a real implementation has to:

    1. quantise the frame to K dominant colours
    2. fix_palette those K
    3. map every pixel back through the result

Step 3 is where the win can evaporate. Nearest-neighbour replacement would posterise the
image. So instead: build a smooth DISPLACEMENT FIELD from the palette's own movement and
apply it per pixel —

    out(c) = c + sum_i w_i(c) * (p'_i - p_i),    w_i = softmax(-d(c, p_i)^2 / sigma^2)

Each palette colour votes to move nearby colours the way it moved itself, weighted by
proximity. Gradients stay smooth; colours far from any corrected swatch barely move.

sigma is the whole ballgame and is NOT assumed: too small and the field posterises, too large
and it averages the corrections into mush. It is swept and reported, because picking it by eye
and calling it done is how you ship an unmeasured change.

The field is evaluated as a 3D LUT, which is also exactly how /live would run it in a shader.
"""
import json, os, sys, warnings
import numpy as np

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "packages", "cvd-py"))
import opticquiz_cvd as q                                                    # noqa: E402
from field import SIMULATORS, de, quant, srgb_to_linear, linear_to_srgb, COLLAPSE  # noqa: E402
from visual import build_scene                                               # noqa: E402

SIMS = ["dl-brettel1997", "dl-vienot1999", "opticquiz-machado2009", "dl-vischeck"]
K = 24            # dominant colours extracted per image
LUT_N = 17        # 17^3 lattice, the usual size for a shader-side 3D LUT


def quantise(img, k=K, iters=12, seed=0):
    """Small k-means in CIELAB-ish space. Deterministic seed so results are reproducible."""
    px = img.reshape(-1, 3)
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(px), size=min(len(px), 20000), replace=False)
    sample = px[idx]
    cent = sample[rng.choice(len(sample), size=k, replace=False)]
    for _ in range(iters):
        d = ((sample[:, None, :] - cent[None, :, :]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(k):
            m = lab == j
            if m.any():
                cent[j] = sample[m].mean(0)
    return cent


def displacement_lut(pal, pal_fixed, sigma, n=LUT_N):
    """Bake the palette's movement into an n^3 LUT of output colours."""
    g = np.linspace(0, 1, n)
    grid = np.stack(np.meshgrid(g, g, g, indexing="ij"), -1).reshape(-1, 3)
    d2 = ((grid[:, None, :] - pal[None, :, :]) ** 2).sum(-1)
    w = np.exp(-d2 / (2 * sigma ** 2))
    s = w.sum(1, keepdims=True)
    w = np.where(s > 1e-12, w / np.maximum(s, 1e-12), 0.0)
    out = grid + w @ (pal_fixed - pal)
    return np.clip(out, 0, 1).reshape(n, n, n, 3)


def apply_lut(rgb, lut):
    """Trilinear interpolation — identical to what a GPU sampler does with a 3D texture."""
    n = lut.shape[0]
    p = np.clip(rgb, 0, 1) * (n - 1)
    i0 = np.floor(p).astype(int)
    i1 = np.minimum(i0 + 1, n - 1)
    f = p - i0
    out = np.zeros_like(rgb, dtype=float)
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                wx = f[:, 0] if dx else 1 - f[:, 0]
                wy = f[:, 1] if dy else 1 - f[:, 1]
                wz = f[:, 2] if dz else 1 - f[:, 2]
                idx = (np.where(dx, i1[:, 0], i0[:, 0]),
                       np.where(dy, i1[:, 1], i0[:, 1]),
                       np.where(dz, i1[:, 2], i0[:, 2]))
                out += (wx * wy * wz)[:, None] * lut[idx]
    return quant(out)


def global_matrix(rgb, t):
    here = os.path.dirname(__file__)
    name = json.load(open(os.path.join(here, "shipping.json")))["linear_surfaces"][t]["transform"]
    M = np.array(json.load(open(os.path.join(here, f"transforms/{name}.json")))["matrix"])
    return quant(linear_to_srgb(np.clip(srgb_to_linear(rgb) @ M.T, 0, 1)))


DISTINCT = 20.0


def net_pairs(orig, corrected, t):
    """M7 on a colour set: rescued minus broken, summed over simulators.

    ONLY over pairs a normal viewer can actually tell apart (dE >= 20). Without that filter
    the quantiser's own near-duplicate outputs count as 'collapsed', which inflated an earlier
    version of this measurement by 91 pairs out of 276 - a third of the total was two colours
    that were never distinguishable to anyone."""
    a, b = np.triu_indices(len(orig), k=1)
    keep = de(orig[a], orig[b]) >= DISTINCT
    a, b = a[keep], b[keep]
    resc = broke = before_n = 0
    for s in SIMS:
        f = SIMULATORS[s]
        bef = de(f(orig, t)[a], f(orig, t)[b])
        aft = de(f(corrected, t)[a], f(corrected, t)[b])
        cb, ca = bef < COLLAPSE, aft < COLLAPSE
        before_n += int(cb.sum())
        resc += int((cb & ~ca).sum())
        broke += int((~cb & ca).sum())
    return before_n, resc, broke, resc - broke


def main():
    scene = np.asarray(build_scene(), float) / 255.0
    px = scene.reshape(-1, 3)
    pal = quantise(scene)
    fixed_hex = q.fix_palette(["#%02x%02x%02x" % tuple(int(np.floor(v * 255 + 0.5)) for v in c)
                               for c in pal])
    fixed = np.array([[int(h.lstrip("#")[k:k + 2], 16) / 255 for k in (0, 2, 4)]
                      for h in (fixed_hex["colors"] if isinstance(fixed_hex, dict) else fixed_hex)])
    moved = float(de(pal, fixed).mean())
    print(f"quantised the scene to {len(pal)} colours; fix_palette moved them {moved:.2f} dE mean\n")

    print(f"{'':26s} {'collapsed':>10s} {'rescued':>8s} {'broken':>7s} {'net':>5s} {'image dE':>9s}")
    for t in ("protan", "deutan", "tritan"):
        print(f"-- {t}")
        g = global_matrix(px, t)
        nb, r, b, net = net_pairs(pal, global_matrix(pal, t), t)
        print(f"   {'global matrix':23s} {nb:10d} {r:8d} {b:7d} {net:+5d} {float(de(px, g).mean()):9.2f}")

        for sigma in (0.05, 0.10, 0.18, 0.30):
            lut = displacement_lut(pal, fixed, sigma)
            out = apply_lut(px, lut)
            pal_out = apply_lut(pal, lut)
            nb, r, b, net = net_pairs(pal, pal_out, t)
            # Banding is the output gradient EXCEEDING the input's, not the absolute step:
            # this scene is made of hard-edged swatches, so absolute steps are ~1.0 for every
            # sigma and told us nothing. Measure added gradient instead.
            gi = np.abs(np.diff(scene[:, :, 0], axis=1))
            go = np.abs(np.diff(out.reshape(scene.shape)[:, :, 0], axis=1))
            band = float(np.percentile(np.clip(go - gi, 0, None), 99.9))
            print(f"   {'content LUT sigma=' + format(sigma, '.2f'):23s} {nb:10d} {r:8d} {b:7d} "
                  f"{net:+5d} {float(de(px, out).mean()):9.2f}   added grad {band:.4f}")
    print("\n'collapsed' counts pairs among the image's own 24 dominant colours, over 4 simulators.")
    print("'max step' is the largest jump between adjacent pixels in the output — a banding canary.")


if __name__ == "__main__":
    main()
