"""
Stage 0b — does DXGI Desktop Duplication observe the Windows colour filter?

Stage 0 established that GDI capture (PIL ImageGrab / BitBlt) is blind to it. GDI is not
the only capture path, and "did you try Desktop Duplication?" is the first question any
reviewer will ask, because it is what modern screen recorders and remote-desktop tools
actually use. This answers it.

    python dxgi_probe.py capture A     with the filter in one state
    python dxgi_probe.py capture B     after CHANGING it
    python dxgi_probe.py compare

Same discipline as probe.py: the live filter state is read from the registry at the moment
of capture and stamped into the file, and `compare` refuses to conclude if both captures
were taken in the same state.
"""
import sys, json, os, time
import numpy as np

try:
    import winreg
except ImportError:
    winreg = None
import dxcam

KEY = r"Software\Microsoft\ColorFiltering"


def filter_state():
    if winreg is None:
        return None
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY) as k:
            def get(n):
                try:
                    return winreg.QueryValueEx(k, n)[0]
                except FileNotFoundError:
                    return None
            return {"active": get("Active"), "filter_type": get("FilterType")}
    except FileNotFoundError:
        return None


def capture(tag):
    st = filter_state()
    if st is None:
        print("Refusing to capture: cannot read the filter state.")
        sys.exit(1)
    cam = dxcam.create(output_idx=0, output_color="RGB")
    frame = None
    for _ in range(40):                 # duplication returns None until a frame changes
        frame = cam.grab()
        if frame is not None:
            break
        time.sleep(0.05)
    del cam
    if frame is None:
        print("DXGI returned no frame. Move the mouse to force an update and retry.")
        sys.exit(1)
    np.save(f"dxgi-{tag}.npy", frame)
    json.dump({"tag": tag, "shape": list(frame.shape), **st},
              open(f"dxgi-{tag}.json", "w"), indent=2)
    print(f"saved dxgi-{tag}.npy  {frame.shape[1]}x{frame.shape[0]}")
    print(f"  filter was {'ON' if st['active'] else 'OFF'}, type {st['filter_type']}")


def compare():
    for t in ("A", "B"):
        if not os.path.exists(f"dxgi-{t}.npy"):
            print(f"missing dxgi-{t}.npy — run: python dxgi_probe.py capture {t}")
            return
    sa, sb = json.load(open("dxgi-A.json")), json.load(open("dxgi-B.json"))
    print(f"capture A: filter {'ON' if sa['active'] else 'OFF'}, type {sa['filter_type']}")
    print(f"capture B: filter {'ON' if sb['active'] else 'OFF'}, type {sb['filter_type']}\n")

    if (sa["active"], sa["filter_type"]) == (sb["active"], sb["filter_type"]):
        print("INVALID EXPERIMENT — both captures in the same filter state. Nothing concluded.")
        return

    a = np.load("dxgi-A.npy").astype(float)
    b = np.load("dxgi-B.npy").astype(float)
    if a.shape != b.shape:
        print("FAIL: captures differ in size.")
        return

    a, b = a[:-80], b[:-80]             # drop the taskbar band (clock ticks between captures)
    d = np.abs(a - b)
    changed = float(np.mean(d.max(axis=2) > 2))
    print(json.dumps({"pixels_changed_fraction": round(changed, 4),
                      "mean_abs_delta_255": round(float(d.mean()), 3),
                      "max_abs_delta_255": round(float(d.max()), 1)}, indent=2))

    if changed < 0.01:
        print("\nDXGI Desktop Duplication is ALSO blind to the filter.")
        print("Two independent capture paths, both null. The transform is applied downstream")
        print("of anything the desktop composition exposes.")
    else:
        print(f"\nDXGI DOES observe the filter ({changed:.1%} changed) — GDI does not.")
        print("That difference is itself the headline: the filter is visible to Desktop")
        print("Duplication but not to BitBlt. Recover the transform from these frames.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "capture" and len(sys.argv) > 2 and sys.argv[2] in ("A", "B"):
        capture(sys.argv[2])
    elif cmd == "compare":
        compare()
    else:
        print(__doc__)
