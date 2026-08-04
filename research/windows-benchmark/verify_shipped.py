"""
Does what we SHIP match what we MEASURED?

    python verify_shipped.py

The engine's matrices live in five places. Benchmarking a matrix in a JSON file proves
nothing about the extension a person actually installs, so this re-parses the numbers out
of every shipping source file and checks:

  1. every surface agrees with every other surface
  2. all of them match the transform the benchmark scored
  3. each matrix's rows sum to 1 (the achromatic axis is preserved)

It also reports the COLOUR SPACE each surface applies the matrix in, because that is not a
detail: the browser surfaces use color-interpolation-filters="linearRGB", while the desktop
app hands the matrix to MagSetFullscreenColorEffect, which operates on gamma-encoded sRGB.
The same numbers in the two spaces are two different corrections — measured at deutan rescue
0.731 (linear) vs 0.696 (sRGB) under Brettel 1997.

Run this before any release. A silent divergence between surfaces is the failure mode that
makes a published benchmark false.
"""
import json, re, sys
import numpy as np

SHIPPING = json.load(open("shipping.json"))

SURFACES = {
    "browser-extension": ("../../browser-extension/content.js", "fe", "linear"),
    "widget":            ("../../widget/eye.js",                "fe", "linear"),
    "npm opticquiz-eye": ("../../packages/cvd-eye/index.js",    "fe", "linear"),
    "live camera":       ("../../live/index.html",              "arr", "linear"),
    "desktop app":       ("../../desktop-app/Program.cs",       "cs", "srgb"),
}
CS_NAMES = {"deutan": "Deuteranopia", "protan": "Protanopia", "tritan": "Tritanopia"}
TYPES = ("protan", "deutan", "tritan")


def parse(path, kind, t):
    s = open(path, encoding="utf-8").read()
    if kind == "fe":
        m = re.search(rf'{t}:\s*"([^"]+)"', s)
        if not m:
            return None
        v = [float(x) for x in m.group(1).split()]
        return np.array([v[0:3], v[5:8], v[10:13]])
    if kind == "arr":
        m = re.search(rf'{t}:\s*(\[\[.*?\]\])', s)
        if not m:
            return None
        return np.array(json.loads(m.group(1)))
    if kind == "cs":
        m = re.search(rf'{CS_NAMES[t]}\s*=\s*\{{(.*?)\}};', s, re.S)
        if not m:
            return None
        v = [float(x.rstrip("f")) for x in re.findall(r'-?[\d.]+f?', m.group(1))]
        # GDI convention: newColor = color * M, i.e. the transpose of feColorMatrix
        return np.array([v[0:3], v[5:8], v[10:13]]).T
    return None


def main():
    fail = 0
    for t in TYPES:
        want = SHIPPING["linear_surfaces"][t]["transform"]
        ref = np.array(json.load(open(f"transforms/{want}.json"))["matrix"])
        ref_label = want
        want_desktop = SHIPPING["desktop_app"]["transform"].replace("{type}", t)
        ref_desktop = np.array(json.load(open(f"transforms/{want_desktop}.json"))["matrix"])

        print(f"\n{t.upper()}   reference: {ref_label}")
        for name, (path, kind, space) in SURFACES.items():
            M = parse(path, kind, t)
            if M is None:
                print(f"  ??   {name:20s} could not parse")
                fail += 1
                continue
            expect = ref_desktop if name == "desktop app" else ref
            same = np.allclose(M, expect, atol=5e-5)
            rows_ok = np.allclose(M.sum(axis=1), 1.0, atol=1e-4)
            flag = "OK  " if same else "DIFF"
            note = "" if rows_ok else "  [rows do not sum to 1 - grey will shift]"
            if space != "linear":
                note += f"  [{space} space, on {want_desktop} by design]"
            print(f"  {flag} {name:20s} {space:7s}{note}")
            if not same:
                print(f"       shipped {np.round(M, 5).tolist()}")
                fail += 1

    print("\n" + ("ALL LINEAR-LIGHT SURFACES MATCH THE BENCHMARKED MATRIX"
                  if fail == 0 else f"{fail} MISMATCH(ES) - shipped code does not match what was measured"))
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
