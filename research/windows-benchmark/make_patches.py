"""
Generates patches.png — the calibration target displayed during transform recovery.

A 9x9x9 sRGB lattice (729) plus a 17-step neutral ramp, laid out as flat blocks with a
known index, and four ArUco markers in the corners.

The markers are what make photographic recovery practical: they give automatic, sub-pixel,
perspective-correct registration, so a hand-held photo of the screen can be rectified back
to the target's own coordinates without hand-cropping or assuming the camera was square on.

    python make_patches.py            -> patches.png + patches.json
"""
import json
import numpy as np
import cv2
from PIL import Image

N = 9            # lattice steps per channel
BLOCK = 34       # px per patch
GUTTER = 6       # px between patches
MARGIN = 96      # room for the corner markers
MARKER = 72      # ArUco marker size in px
DICT = cv2.aruco.DICT_4X4_50


def build():
    vals = np.linspace(0, 1, N)
    patches = [(r, g, b) for r in vals for g in vals for b in vals]
    patches += [(v, v, v) for v in np.linspace(0, 1, 17)]

    cols = 28
    rows = (len(patches) + cols - 1) // cols
    W = MARGIN * 2 + cols * BLOCK + (cols - 1) * GUTTER
    H = MARGIN * 2 + rows * BLOCK + (rows - 1) * GUTTER

    img = np.full((H, W, 3), 128, dtype=np.uint8)   # mid-grey field
    index = []

    for i, c in enumerate(patches):
        cx, cy = i % cols, i // cols
        x0 = MARGIN + cx * (BLOCK + GUTTER)
        y0 = MARGIN + cy * (BLOCK + GUTTER)
        rgb = [int(np.floor(v * 255 + 0.5)) for v in c]
        img[y0:y0 + BLOCK, x0:x0 + BLOCK] = rgb
        # Sample only the middle half of each block: edges blur under a camera lens and
        # under any display scaling, and a contaminated edge silently biases the fit.
        index.append({"i": i, "nominal": rgb,
                      "box": [x0, y0, BLOCK, BLOCK],
                      "sample": [x0 + BLOCK // 4, y0 + BLOCK // 4, BLOCK // 2, BLOCK // 2]})

    # Four ArUco markers, ids 0-3, clockwise from top-left.
    d = cv2.aruco.getPredefinedDictionary(DICT)
    pad = 12
    corners = [(pad, pad), (W - MARKER - pad, pad),
               (W - MARKER - pad, H - MARKER - pad), (pad, H - MARKER - pad)]
    for mid, (mx, my) in enumerate(corners):
        m = cv2.aruco.generateImageMarker(d, mid, MARKER)
        img[my:my + MARKER, mx:mx + MARKER] = np.dstack([m] * 3)

    Image.fromarray(img).save("patches.png")
    json.dump({"width": W, "height": H, "block": BLOCK, "n": len(patches),
               "marker_size": MARKER, "marker_dict": "DICT_4X4_50",
               "marker_corners_tl": [list(c) for c in corners],
               "patches": index}, open("patches.json", "w"))
    print(f"patches.png  {W}x{H}  {len(patches)} patches + 4 ArUco markers")
    print("Display at 100% zoom, no scaling, on the display under test.")


if __name__ == "__main__":
    build()
