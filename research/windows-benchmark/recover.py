"""
Stage 1 — recover the transform Windows applies, by least squares.

    python recover.py --off capture-off.png --on capture-on.png --name windows-deutan

Fits three models and reports the residual for each. The residual IS a result: if no
linear model fits, we publish that finding and the measured LUT rather than forcing a
matrix onto a filter that is not one.

  1. linear 3x3 on nominal sRGB
  2. affine 3x4 on nominal sRGB
  3. linear 3x3 on linearised sRGB

The 'off' capture is the control. It is NOT assumed to be the identity — it measures the
capture pipeline's own colour handling, and every model is fitted from off -> on so that
any capture-side transform cancels.
"""
import argparse, json
import numpy as np
from PIL import Image


def srgb_to_linear(c):
    c = np.asarray(c, dtype=float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def sample(path, index):
    img = np.asarray(Image.open(path).convert("RGB"), dtype=float) / 255.0
    out = []
    for p in index["patches"]:
        x, y, w, h = p["sample"]
        out.append(img[y:y + h, x:x + w].reshape(-1, 3).mean(axis=0))
    return np.array(out)


def fit(X, Y, affine=False):
    """Solve Y ≈ X @ A (row vectors). Returns (matrix3x3, offset3, rms_residual_255)."""
    A_in = np.hstack([X, np.ones((len(X), 1))]) if affine else X
    sol, *_ = np.linalg.lstsq(A_in, Y, rcond=None)
    pred = A_in @ sol
    rms = float(np.sqrt(np.mean((pred - Y) ** 2)) * 255)
    if affine:
        return sol[:3].T.tolist(), sol[3].tolist(), rms
    return sol.T.tolist(), [0.0, 0.0, 0.0], rms


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--off", required=True)
    ap.add_argument("--on", required=True)
    ap.add_argument("--index", default="patches.json")
    ap.add_argument("--name", required=True, help="e.g. windows-deutan")
    a = ap.parse_args()

    index = json.load(open(a.index))
    X = sample(a.off, index)
    Y = sample(a.on, index)

    models = {}
    m, o, r = fit(X, Y, affine=False)
    models["linear_srgb"] = {"matrix": m, "offset": o, "rms_residual_255": round(r, 3)}
    m, o, r = fit(X, Y, affine=True)
    models["affine_srgb"] = {"matrix": m, "offset": o, "rms_residual_255": round(r, 3)}
    m, o, r = fit(srgb_to_linear(X), srgb_to_linear(Y), affine=False)
    models["linear_light"] = {"matrix": m, "offset": o, "rms_residual_255": round(r, 3)}

    best = min(models, key=lambda k: models[k]["rms_residual_255"])
    res = models[best]["rms_residual_255"]

    print(json.dumps(models, indent=2))
    print(f"\nbest fit: {best}  (RMS residual {res:.2f} / 255)")
    if res > 4.0:
        print("WARNING: residual exceeds 4/255. This filter is probably NOT a linear")
        print("transform. Report the residual and publish the measured LUT — do not")
        print("present a matrix as if it described the filter.")

    out = {"name": a.name,
           "space": "linear" if best == "linear_light" else "srgb",
           "matrix": models[best]["matrix"],
           "offset": models[best]["offset"],
           "fit": best,
           "rms_residual_255": models[best]["rms_residual_255"],
           "all_models": models,
           "source": "measured by recover.py from screen capture; see PROTOCOL.md"}
    path = f"transforms/{a.name}.json"
    json.dump(out, open(path, "w"), indent=2)
    print("wrote", path)


if __name__ == "__main__":
    main()
