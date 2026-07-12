"""CLI: python -m opticquiz_cvd "#d7191c" "#1a9641" "#2166ac" """
import sys
from . import check_palette, TYPES


def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    if not args:
        print('usage: python -m opticquiz_cvd "#d7191c" "#1a9641" ...')
        return 0
    rep = check_palette(args)
    print(("PASS - colorblind-safe" if rep["pass"]
           else "FAIL - color conflicts found") + " (%d colors)" % len(args))
    for t in TYPES:
        conf = rep["types"][t]["conflicts"]
        if conf:
            print("  %s: %s" % (t, ", ".join(
                "%s/%s dE%s(%s)" % (c["a"], c["b"], c["sim"], c["severity"]) for c in conf)))
    return 0 if rep["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
