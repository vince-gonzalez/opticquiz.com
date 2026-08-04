"""
Stage 0 — does a software screen capture actually observe the Windows colour filter?

This must pass before any software-captured measurement is trusted. Windows applies colour
filters late in the display pipeline; Night Light, for example, is invisible to a conventional
screenshot. If the filter is likewise invisible, numbers recovered by software capture would
describe an unfiltered frame while claiming otherwise.

    python probe.py state          show the current filter state and stop
    python probe.py capture A      take a capture, stamped with the live filter state
    python probe.py capture B      take another one after CHANGING the filter
    python probe.py compare        compare them

The captures are named A and B, not "off" and "on", because THIS SCRIPT DOES NOT TOGGLE
ANYTHING. It reads the real filter state out of the registry at the moment of capture and
records it alongside the image. If both captures turn out to have been taken in the same
state, `compare` refuses to draw a conclusion — an earlier version of this script did not,
and confidently reported a result from an experiment that could not produce one.

A NULL RESULT IS A FINDING. If capture cannot observe the filter, no software tool can audit
it, which is worth documenting on its own.
"""
import sys, json, os, ctypes
from ctypes import wintypes
import numpy as np
from PIL import ImageGrab, Image

try:
    import winreg
except ImportError:
    winreg = None


def monitors():
    """Enumerate physical monitors as rects in virtual-desktop coordinates, so a
    multi-monitor capture can be scored per display. Answers a question a single-screen
    probe cannot: does the filter apply to every display, or only some?"""
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass
    u = ctypes.windll.user32
    rects = []
    PROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p,
                              ctypes.POINTER(wintypes.RECT), wintypes.LPARAM)

    def cb(hmon, hdc, lprc, lparam):
        r = lprc.contents
        rects.append((r.left, r.top, r.right, r.bottom))
        return True

    u.EnumDisplayMonitors(None, None, PROC(cb), 0)
    # Virtual-screen origin can be negative; capture arrays are indexed from it.
    ox = u.GetSystemMetrics(76)   # SM_XVIRTUALSCREEN
    oy = u.GetSystemMetrics(77)   # SM_YVIRTUALSCREEN
    return [(l - ox, t - oy, r - ox, b - oy) for (l, t, r, b) in rects]

KEY = r"Software\Microsoft\ColorFiltering"

# FilterType 3 = deuteranopia is CONFIRMED on hardware (registry read while the
# Settings UI showed Deuteranopia). The others are expected values and are labelled
# as unconfirmed until each has been observed the same way.
FILTER_NAMES = {
    0: "grayscale (expected)",
    1: "inverted (expected)",
    2: "grayscale inverted (expected)",
    3: "deuteranopia (CONFIRMED)",
    4: "protanopia (expected)",
    5: "tritanopia (expected)",
}

TASKBAR_ROWS = 80  # bottom band excluded from stats: the clock changes between captures


def filter_state():
    """Read the live colour-filter state. Returns dict, or None if unreadable."""
    if winreg is None:
        return None
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY) as k:
            def get(name):
                try:
                    return winreg.QueryValueEx(k, name)[0]
                except FileNotFoundError:
                    return None
            active = get("Active")
            ftype = get("FilterType")
            return {"active": active, "filter_type": ftype,
                    "filter_name": FILTER_NAMES.get(ftype, f"unknown ({ftype})")}
    except FileNotFoundError:
        return None


def show_state():
    s = filter_state()
    if s is None:
        print("Could not read the colour-filter registry key. Is this Windows?")
        return
    on = "ON" if s["active"] else "OFF"
    print(f"colour filter : {on}")
    print(f"filter type   : {s['filter_type']}  ({s['filter_name']})")


def capture(tag):
    s = filter_state()
    if s is None:
        print("Refusing to capture: cannot read the filter state, so the capture would be "
              "unlabelled and the experiment uninterpretable.")
        sys.exit(1)
    img = ImageGrab.grab(all_screens=True)   # whole virtual desktop, not just the primary
    img.save(f"capture-{tag}.png")
    json.dump({"tag": tag, "size": list(img.size), "monitors": monitors(), **s},
              open(f"capture-{tag}.json", "w"), indent=2)
    on = "ON" if s["active"] else "OFF"
    print(f"saved capture-{tag}.png  {img.size[0]}x{img.size[1]}")
    print(f"  filter was {on}, type {s['filter_type']} ({s['filter_name']})")


def compare():
    for t in ("A", "B"):
        if not os.path.exists(f"capture-{t}.png"):
            print(f"missing capture-{t}.png — run: python probe.py capture {t}")
            return
    sa = json.load(open("capture-A.json"))
    sb = json.load(open("capture-B.json"))

    print(f"capture A: filter {'ON' if sa['active'] else 'OFF'}, type {sa['filter_type']}")
    print(f"capture B: filter {'ON' if sb['active'] else 'OFF'}, type {sb['filter_type']}\n")

    # ---- the guard the previous version lacked ----
    if (sa["active"], sa["filter_type"]) == (sb["active"], sb["filter_type"]):
        print("INVALID EXPERIMENT — both captures were taken in the SAME filter state.")
        print("Identical images prove nothing here. Change the filter between captures")
        print("and retake. Nothing is concluded.")
        return

    a = np.asarray(Image.open("capture-A.png").convert("RGB"), dtype=float)
    b = np.asarray(Image.open("capture-B.png").convert("RGB"), dtype=float)
    if a.shape != b.shape:
        print("FAIL: captures differ in size — retake without moving or resizing anything.")
        return

    # Score each monitor separately. A taskbar sits at the bottom of a display and its
    # clock ticks between captures, so the bottom band of every monitor is excluded —
    # last time, ALL of the apparent difference was the clock changing minute.
    mons = json.load(open("capture-A.json")).get("monitors") or [(0, 0, a.shape[1], a.shape[0])]
    overall = []
    rows = []

    def is_colour_mapping(sub_a, sub_b, mask):
        """Distinguish a colour FILTER from CONTENT that merely changed.

        A colour filter is a function: one input colour maps to exactly one output colour,
        everywhere on the display. Content change is not — a terminal scrolling or a video
        playing sends the same input colour to many different outputs. Without this gate a
        single busy monitor (Discord, a video, the terminal you are typing in) reads as
        'the filter is visible', which is precisely what happened on the first multi-monitor
        run. Returns (fraction_of_colours_with_multiple_outputs, n_checked)."""
        pa, pb = sub_a[mask].reshape(-1, 3).astype(int), sub_b[mask].reshape(-1, 3).astype(int)
        if len(pa) < 100:
            return None, 0
        keys = (pa[:, 0] << 16) | (pa[:, 1] << 8) | pa[:, 2]
        order = np.argsort(keys)
        keys, pbs = keys[order], pb[order]
        uniq, start, cnt = np.unique(keys, return_index=True, return_counts=True)
        multi = checked = 0
        for u, s, c in zip(uniq, start, cnt):
            if c < 8:
                continue
            checked += 1
            seg = pbs[s:s + c]
            if len(np.unique((seg[:, 0] << 16) | (seg[:, 1] << 8) | seg[:, 2])) > 1:
                multi += 1
        return (multi / checked if checked else None), checked
    for i, (l, t, r, bt) in enumerate(mons):
        bt = min(bt, a.shape[0])
        r = min(r, a.shape[1])
        sub_a = a[t:bt - TASKBAR_ROWS, l:r]
        sub_b = b[t:bt - TASKBAR_ROWS, l:r]
        if sub_a.size == 0:
            continue
        d = np.abs(sub_a - sub_b)
        mask = d.max(axis=2) > 2
        frac = float(np.mean(mask))
        inconsistent, checked = is_colour_mapping(sub_a, sub_b, mask)

        # A change only counts as the filter if it behaves like one.
        verdict = "no change"
        if frac >= 0.01:
            if inconsistent is None:
                verdict = "changed, too little data to classify"
            elif inconsistent > 0.10:
                verdict = "CONTENT CHANGE (not a colour filter) - excluded"
            else:
                verdict = "consistent colour mapping - filter observed"
                overall.append(frac)

        rows.append({"monitor": i, "rect": [l, t, r, bt],
                     "pixels_changed_fraction": round(frac, 4),
                     "mean_abs_delta_255": round(float(d.mean()), 3),
                     "colours_with_multiple_outputs":
                         None if inconsistent is None else round(inconsistent, 3),
                     "verdict": verdict})

    print(json.dumps({"note": f"bottom {TASKBAR_ROWS} rows of each monitor excluded (taskbar clock)",
                      "per_monitor": rows}, indent=2))
    changed = max(overall) if overall else 0.0

    excluded = [r for r in rows if "CONTENT CHANGE" in r["verdict"]]
    if excluded:
        print(f"\n{len(excluded)} monitor(s) excluded for content change - something on that")
        print("screen (a video, a chat app, the terminal you are typing in) altered pixels")
        print("between captures. A colour filter is a function: one input colour maps to one")
        print("output colour. These did not. Use an idle screen for a clean per-monitor result.")

    if changed < 0.01:
        print("\nOUTCOME B - the capture does NOT observe the filter.")
        print("The filter state genuinely differed between these two captures and the pixels")
        print("did not move. Software capture is INVALID for this measurement: do not run")
        print("recover.py on these images. This is a publishable finding in its own right.")
    else:
        print(f"\nOUTCOME A - the capture observes the filter ({changed:.1%} of pixels changed).")
        print("Software capture is valid. Proceed to recover.py.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "state":
        show_state()
    elif cmd == "capture" and len(sys.argv) > 2 and sys.argv[2] in ("A", "B"):
        capture(sys.argv[2])
    elif cmd == "compare":
        compare()
    else:
        print(__doc__)
