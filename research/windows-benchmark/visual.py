"""
Look at the matrices before trusting them.

    python visual.py                 all three deficiencies
    python visual.py --type deutan

Every number in FIELD.md is MODELLED discriminability. A matrix can score well and still make
a real page look like a fever dream, and no metric in the protocol would catch it. This
renders content through each corrector and, beside it, what a person with that deficiency
would actually see — so the fidelity cost stops being an abstract 13.01 and becomes something
you can look at and reject.

Left column  : what a normal-vision viewer sees (is the correction tolerable to look at?)
Right column : what the CVD viewer sees (did the correction actually separate anything?)
"""
import argparse, json, os, sys, warnings
import numpy as np
from PIL import Image, ImageDraw

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
from field import (SIMULATORS, srgb_to_linear, linear_to_srgb, quant, de)   # noqa: E402

SIM = "dl-brettel1997"     # a held-out model, not one the matrices were fitted against
W, H = 420, 300


def swatches(draw, x, y, cols, w=46, h=46, gap=6, label=None):
    for i, c in enumerate(cols):
        draw.rectangle([x + i * (w + gap), y, x + i * (w + gap) + w, y + h], fill=c)
    if label:
        draw.text((x, y - 12), label, fill=(40, 40, 40))


def build_scene():
    """Content chosen because colour carries the meaning — the case the tool exists for."""
    img = Image.new("RGB", (W, H), (247, 246, 243))
    d = ImageDraw.Draw(img)

    d.text((12, 6), "build status", fill=(40, 40, 40))
    swatches(d, 12, 22, [(215, 25, 28), (26, 150, 65), (255, 191, 0)], w=52, h=34)

    d.text((12, 70), "categorical series (Tableau-like)", fill=(40, 40, 40))
    swatches(d, 12, 86, [(31, 119, 180), (255, 127, 14), (44, 160, 44),
                         (214, 39, 40), (148, 103, 189)], w=52, h=30)

    d.text((12, 130), "Okabe-Ito (already colourblind-safe)", fill=(40, 40, 40))
    swatches(d, 12, 146, [(230, 159, 0), (86, 180, 233), (0, 158, 115),
                          (240, 228, 66), (0, 114, 178), (213, 94, 0)], w=42, h=30)

    d.text((12, 190), "heatmap ramp (red-green, the classic failure)", fill=(40, 40, 40))
    for i in range(360):
        t = i / 359
        d.line([(12 + i, 206), (12 + i, 240)],
               fill=(int(255 * min(1, 2 * t)), int(255 * min(1, 2 * (1 - t))), 40))

    d.text((12, 250), "skin / natural tones (fidelity check)", fill=(40, 40, 40))
    swatches(d, 12, 264, [(240, 200, 170), (198, 134, 96), (120, 72, 48),
                          (110, 140, 90), (70, 110, 160)], w=52, h=28)
    return img


def apply_matrix(arr, path):
    d = json.load(open(path))
    M = np.array(d["matrix"], float)
    if d.get("space") == "linear":
        return quant(linear_to_srgb(np.clip(srgb_to_linear(arr) @ M.T, 0, 1)))
    return quant(np.clip(arr @ M.T, 0, 1))


def simulate(arr, deficiency):
    flat = arr.reshape(-1, 3)
    return SIMULATORS[SIM](flat, deficiency).reshape(arr.shape)


def sheet(deficiency):
    base = np.asarray(build_scene(), float) / 255.0
    variants = [("no correction", base),
                ("v1 (shipped)", apply_matrix(base, f"transforms/opticquiz-{deficiency}.json")),
                ("v2 (derived)", apply_matrix(base, f"transforms/opticquiz-v2-{deficiency}.json"))]

    pad, head = 14, 40
    out = Image.new("RGB", (W * 2 + pad * 3, head + (H + head) * 3 + pad), (255, 255, 255))
    d = ImageDraw.Draw(out)
    d.text((pad, 12), f"{deficiency.upper()}  —  left: as everyone sees it   |   "
                      f"right: as a {deficiency} viewer sees it   (simulator: {SIM})",
           fill=(20, 20, 20))

    for row, (name, arr) in enumerate(variants):
        y = head + row * (H + head)
        seen = simulate(arr, deficiency)
        d.text((pad, y - 16), name, fill=(20, 20, 20))
        out.paste(Image.fromarray((arr * 255 + 0.5).astype(np.uint8)), (pad, y))
        out.paste(Image.fromarray((seen * 255 + 0.5).astype(np.uint8)), (pad * 2 + W, y))

        # the number that matters for this row, computed on what the CVD viewer sees
        stat = simulate(arr, deficiency).reshape(-1, 3)
        base_seen = simulate(base, deficiency).reshape(-1, 3)
        fid = float(de(base.reshape(-1, 3), arr.reshape(-1, 3)).mean())
        d.text((pad * 2 + W, y - 16),
               f"fidelity cost of this row: {fid:5.2f} dE" if row else "reference",
               fill=(90, 90, 90))

    path = f"visual-{deficiency}.png"
    out.save(path)
    print(f"wrote {path}")
    return path


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", choices=["protan", "deutan", "tritan"])
    a = ap.parse_args()
    for t in ([a.type] if a.type else ["protan", "deutan", "tritan"]):
        sheet(t)
