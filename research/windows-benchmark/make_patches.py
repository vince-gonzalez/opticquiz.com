"""
Generates patches.png — the calibration target displayed during Stage 1.

A 9x9x9 sRGB lattice (729) plus a 17-step neutral ramp, laid out as flat blocks
with a known index. Blocks are large and separated by a mid-grey gutter so that
capture registration is trivial and edge blending cannot contaminate a sample:
each patch is read from its centre region only.

    python make_patches.py            -> patches.png + patches.json
"""
import json
import numpy as np
from PIL import Image

N = 9            # lattice steps per channel
BLOCK = 34       # px per patch
GUTTER = 6       # px between patches
MARGIN = 40
FIDUCIAL = 24    # corner registration squares


def build():
    vals = np.linspace(0, 1, N)
    patches = [(r, g, b) for r in vals for g in vals for b in vals]
    patches += [(v, v, v) for v in np.linspace(0, 1, 17)]

    cols = 28
    rows = (len(patches) + cols - 1) // cols
    W = MARGIN * 2 + cols * BLOCK + (cols - 1) * GUTTER
    H = MARGIN * 2 + rows * BLOCK + (rows - 1) * GUTTER

    img = Image.new("RGB", (W, H), (128, 128, 128))
    px = img.load()
    index = []

    for i, c in enumerate(patches):
        cx, cy = i % cols, i // cols
        x0 = MARGIN + cx * (BLOCK + GUTTER)
        y0 = MARGIN + cy * (BLOCK + GUTTER)
        rgb = tuple(int(np.floor(v * 255 + 0.5)) for v in c)
        for y in range(y0, y0 + BLOCK):
            for x in range(x0, x0 + BLOCK):
                px[x, y] = rgb
        index.append({"i": i, "nominal": list(rgb),
                      "box": [x0, y0, BLOCK, BLOCK],
                      "sample": [x0 + BLOCK // 4, y0 + BLOCK // 4, BLOCK // 2, BLOCK // 2]})

    # Fiducials: pure white and pure black corners. These also act as a clipping
    # canary — if the filter crushes them, the capture will show it immediately.
    for (fx, fy, col) in [(0, 0, (255, 255, 255)), (W - FIDUCIAL, 0, (0, 0, 0)),
                          (0, H - FIDUCIAL, (0, 0, 0)), (W - FIDUCIAL, H - FIDUCIAL, (255, 255, 255))]:
        for y in range(fy, fy + FIDUCIAL):
            for x in range(fx, fx + FIDUCIAL):
                px[x, y] = col

    img.save("patches.png")
    json.dump({"width": W, "height": H, "block": BLOCK, "n": len(patches),
               "patches": index}, open("patches.json", "w"))
    print(f"patches.png  {W}x{H}  {len(patches)} patches")
    print("Display it at 100% zoom, no scaling, on the display under test.")


if __name__ == "__main__":
    build()
