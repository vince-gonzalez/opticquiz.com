"""
Stage 1-alt (preferred) — read the colour transform directly, no capture at all.

Screen capture is blind to the Windows colour filter (see PROTOCOL.md Stage 0, Outcome B),
so the filter cannot be measured from pixels. But Windows exposes a full-screen colour
effect through Magnification.dll as a 5x5 matrix. If the Colour Filters feature is
implemented through that mechanism, this reads the EXACT matrix — better than any
measurement, with no camera, no noise, and no gamut confound.

    python mag_probe.py                 read the current effect
    python mag_probe.py --save NAME     read it and write transforms/NAME.json

Procedure: set the filter type in Settings, enable it, run this, record the matrix.
Repeat for deuteranopia (3), protanopia (4), tritanopia (5), and with the filter OFF
as the control — the OFF reading must be the identity matrix, and if it is not, this
API is not reporting what we think it is and the result must be discarded.

THIS MAY LEGITIMATELY FAIL. MagGetFullscreenColorEffect is documented as retrieving the
effect "associated with the full-screen magnifier", which may mean only an effect set by
the calling process. If it returns identity while a filter is visibly active, that is an
informative null: it means the Colour Filters feature does not route through the public
magnification API, and no public API exposes it. Record that outcome rather than
reinterpreting it.
"""
import ctypes, json, sys, os
from ctypes import wintypes

try:
    import winreg
except ImportError:
    winreg = None

IDENTITY = [1, 0, 0, 0, 0,
            0, 1, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, 1, 0,
            0, 0, 0, 0, 1]


class MAGCOLOREFFECT(ctypes.Structure):
    _fields_ = [("transform", ctypes.c_float * 25)]


def filter_state():
    if winreg is None:
        return None
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\ColorFiltering") as k:
            def get(n):
                try:
                    return winreg.QueryValueEx(k, n)[0]
                except FileNotFoundError:
                    return None
            return {"active": get("Active"), "filter_type": get("FilterType")}
    except FileNotFoundError:
        return None


def read_effect():
    mag = ctypes.WinDLL("Magnification.dll")
    mag.MagInitialize.restype = wintypes.BOOL
    mag.MagUninitialize.restype = wintypes.BOOL
    mag.MagGetFullscreenColorEffect.restype = wintypes.BOOL
    mag.MagGetFullscreenColorEffect.argtypes = [ctypes.POINTER(MAGCOLOREFFECT)]

    if not mag.MagInitialize():
        raise OSError("MagInitialize failed (error %d)" % ctypes.get_last_error())
    try:
        eff = MAGCOLOREFFECT()
        ok = mag.MagGetFullscreenColorEffect(ctypes.byref(eff))
        if not ok:
            raise OSError("MagGetFullscreenColorEffect returned FALSE (error %d)"
                          % ctypes.GetLastError())
        return [round(float(v), 6) for v in eff.transform]
    finally:
        mag.MagUninitialize()


def main():
    st = filter_state()
    print("registry: Active=%s FilterType=%s" % (st.get("active"), st.get("filter_type"))
          if st else "registry: unreadable")

    try:
        t = read_effect()
    except OSError as e:
        print("FAILED:", e)
        print("\nThis is a recordable outcome, not a bug to work around. If the API cannot")
        print("be read, no public interface exposes the filter and the camera path is the")
        print("only remaining option.")
        sys.exit(2)

    rows = [t[i * 5:(i + 1) * 5] for i in range(5)]
    print("\n5x5 colour effect:")
    for r in rows:
        print("  [" + "  ".join(f"{v:8.5f}" for v in r) + "]")

    is_identity = all(abs(a - b) < 1e-6 for a, b in zip(t, IDENTITY))
    active = bool(st and st.get("active"))

    print()
    if is_identity and active:
        print("IDENTITY returned while a filter is ACTIVE.")
        print("=> The Colour Filters feature does not route through the public magnification")
        print("   API. Record this as an informative null; do not reinterpret it. The camera")
        print("   path (PROTOCOL.md Stage 1-alt) becomes the only option.")
    elif is_identity and not active:
        print("IDENTITY returned with the filter OFF - the expected control reading.")
        print("=> Now enable a filter in Settings and run this again.")
    elif not is_identity and not active:
        print("NON-IDENTITY returned while the filter is OFF.")
        print("=> This API is not reporting the Colour Filters state. Discard; something")
        print("   else on this machine has set a full-screen colour effect.")
    else:
        print("NON-IDENTITY returned while a filter is ACTIVE.")
        print("=> This is the transform. Save it with --save and repeat per filter type.")

    if "--save" in sys.argv:
        name = sys.argv[sys.argv.index("--save") + 1]
        os.makedirs("transforms", exist_ok=True)
        # The 3x3 RGB block of the 5x5 effect, transposed: Magnification applies
        # row-vector convention (out = in * M), our benchmark uses column vectors.
        m3 = [[rows[j][i] for j in range(3)] for i in range(3)]
        out = {"name": name, "space": "srgb", "matrix": m3, "offset": rows[4][:3],
               "raw_5x5": rows, "registry": st,
               "source": "MagGetFullscreenColorEffect via mag_probe.py",
               "caveat": "Colour space of the effect is not documented; verify against a "
                         "camera measurement before publishing as definitive."}
        json.dump(out, open(f"transforms/{name}.json", "w"), indent=2)
        print(f"\nwrote transforms/{name}.json")


if __name__ == "__main__":
    main()
