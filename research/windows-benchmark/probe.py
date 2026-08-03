"""
Stage 0 — does a software screen capture actually observe the Windows colour filter?

This must pass before any software-captured measurement is trusted. Windows applies
colour filters late in the display pipeline; Night Light, for example, is invisible to
a conventional screenshot. If the filter is likewise invisible, every number recovered
by software capture would describe an unfiltered frame while claiming otherwise.

    1. Display patches.png full-screen, filter OFF.
    2. python probe.py off
    3. Turn the colour filter ON (Settings > Accessibility > Colour filters).
       Do not move the window.
    4. python probe.py on
    5. python probe.py compare

A NULL RESULT HERE IS A FINDING, not a failure. If capture cannot see the filter, no
software tool can audit it — which is worth documenting on its own.
"""
import sys, json
import numpy as np
from PIL import ImageGrab, Image


def grab(tag):
    img = ImageGrab.grab()
    img.save(f"capture-{tag}.png")
    print(f"saved capture-{tag}.png  {img.size[0]}x{img.size[1]}")


def compare():
    a = np.asarray(Image.open("capture-off.png").convert("RGB"), dtype=float)
    b = np.asarray(Image.open("capture-on.png").convert("RGB"), dtype=float)
    if a.shape != b.shape:
        print("FAIL: captures differ in size — retake without moving anything.")
        return

    diff = np.abs(a - b)
    changed = float(np.mean(diff.max(axis=2) > 2))     # >2/255 on any channel
    mean_delta = float(diff.mean())
    max_delta = float(diff.max())

    print(json.dumps({
        "pixels_changed_fraction": round(changed, 4),
        "mean_abs_delta_255": round(mean_delta, 3),
        "max_abs_delta_255": round(max_delta, 1),
    }, indent=2))

    if changed < 0.01:
        print("\nOUTCOME B — the capture does NOT observe the filter.")
        print("Software capture is INVALID for this measurement. Do not use recover.py")
        print("on these images. Use Stage 1-alt (external camera) and report Outcome B.")
    else:
        print(f"\nOUTCOME A — the capture observes the filter ({changed:.1%} of pixels changed).")
        print("Software capture is valid. Proceed to recover.py.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd in ("off", "on"):
        grab(cmd)
    elif cmd == "compare":
        compare()
    else:
        print(__doc__)
