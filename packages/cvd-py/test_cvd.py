import opticquiz_cvd as cvd

ok = True


def check(name, cond):
    global ok
    print(("PASS " if cond else "FAIL ") + name)
    ok = ok and cond


check("delta_e identity is 0", cvd.delta_e("#123456", "#123456") == 0)
check("black vs white ~100", abs(cvd.delta_e("#000", "#fff") - 100) < 0.5)
check("red -> deutan is #a39000", cvd.simulate("#ff0000", "deutan") == "#a39000")

unsafe = cvd.check_palette(["#d7191c", "#1a9641", "#2166ac"])
check("unsafe red/green/blue fails", unsafe["pass"] is False)
check("unsafe fails on deutan", unsafe["types"]["deutan"]["pass"] is False)

safe = cvd.check_palette(["#0072b2", "#e69f00", "#009e73", "#cc79a7"])
check("Okabe-Ito passes", safe["pass"] is True)

# accepts matplotlib-style 0-1 rgb tuples too
check("rgb tuple input works", cvd.to_hex((0.843, 0.098, 0.11)) == "#d7191c")


# --- type / model validation --------------------------------------------------
# An unrecognized name must never be a silent pass-through: that returned the input
# unchanged and a caller believed the simulation had run.
def check_raises(name, fn, exc, needles=()):
    try:
        fn()
    except exc as e:
        msg = str(e)
        missing = [n for n in needles if n not in msg]
        check(name, not missing)
        if missing:
            print("       message was: " + msg)
    except Exception as e:  # noqa: BLE001 - wrong exception type is a failure
        check(name + " -- raised %s" % type(e).__name__, False)
    else:
        check(name + " -- did not raise", False)


# the three valid types, plus normal
check("protan simulates", cvd.simulate("#ff0000", "protan") == "#6d5f00")
check("deutan simulates", cvd.simulate("#ff0000", "deutan") == "#a39000")
check("tritan simulates", cvd.simulate("#ff0000", "tritan") == "#ff000f")
check("normal is a pass-through", cvd.simulate("#ff0000", "normal") == "#ff0000")
check("normal lowercases", cvd.simulate("#FF0000", "normal") == "#ff0000")
check("TYPES unchanged", cvd.TYPES == ["protan", "deutan", "tritan"])

# the regression that prompted this: a long clinical name used to return the input
check("protan is not a no-op", cvd.simulate("#d7191c", "protan") != "#d7191c")
check_raises("unknown type raises", lambda: cvd.simulate("#d7191c", "nonsense"), ValueError,
             ["unknown type", "'nonsense'", "protan, deutan, tritan, normal"])

# long clinical forms are refused, but the error names the short form to use
check_raises("protanopia raises and names protan", lambda: cvd.simulate("#d7191c", "protanopia"),
             ValueError, ["unknown type", 'Use "protan"'])
check_raises("deuteranopia raises and names deutan", lambda: cvd.simulate("#d7191c", "deuteranopia"),
             ValueError, ['Use "deutan"'])
check_raises("tritanopia raises and names tritan", lambda: cvd.simulate("#d7191c", "tritanopia"),
             ValueError, ['Use "tritan"'])

# anomalous trichromacy is a severity, not a type — refusing it is the point
check_raises("deuteranomaly points at severity", lambda: cvd.simulate("#d7191c", "deuteranomaly"),
             ValueError, ["severity", 'use "deutan"'])

# shapes that used to slip through the old `not in _M` test
check_raises("empty type raises", lambda: cvd.simulate("#d7191c", ""), ValueError, ["unknown type"])
check_raises("None type raises", lambda: cvd.simulate("#d7191c", None), TypeError, ["must be a string"])
check_raises("non-string type raises", lambda: cvd.simulate("#d7191c", 42), TypeError, ["must be a string"])

# case and surrounding space are tolerated
check("type is case-insensitive", cvd.simulate("#ff0000", "PROTAN") == "#6d5f00")
check("type is trimmed", cvd.simulate("#ff0000", "  deutan  ") == "#a39000")

# model had the same silent fallback: a typo quietly became machado
check("machado is the default",
      cvd.simulate("#ff0000", "protan") == cvd.simulate("#ff0000", "protan", 1, "machado"))
check("brettel differs from machado", cvd.simulate("#ff0000", "protan", 1, "brettel") == "#6c5c0c")
check_raises("unknown model raises", lambda: cvd.simulate("#ff0000", "protan", 1, "brettle"),
             ValueError, ["unknown model", "'brettle'", "machado, brettel"])
check_raises("check_palette rejects a bad model",
             lambda: cvd.check_palette(["#000", "#fff"], model="machdo"), ValueError, ["unknown model"])

# the validators are exported so wrappers can share one vocabulary
check("normalize_type canonicalizes", cvd.normalize_type(" Deutan ") == "deutan")
check("normalize_type passes normal", cvd.normalize_type("normal") == "normal")
check("normalize_model defaults to machado", cvd.normalize_model(None) == "machado")
check("MODELS exported", cvd.MODELS == ["machado", "brettel"])
check_raises("normalize_type labels the caller", lambda: cvd.normalize_type("bogus", "simulate_image"),
             ValueError, ["simulate_image: unknown type"])

# JS/Python parity on every accepted type and model (values asserted above match the
# JS suite exactly, so the two engines cannot drift apart unnoticed)

# --- color parsing ------------------------------------------------------------
# A malformed hex used to raise an opaque int() error, an 8-digit #rrggbbaa silently
# became the wrong color, a short tuple raised IndexError, and 300 was clamped to 255.
# These values match the JS suite exactly, so "normal" can no longer diverge.
check("normal canonicalizes 3-digit to 6", cvd.simulate("#abc", "normal") == "#aabbcc")
check("normal canonicalizes without the hash", cvd.simulate("abc", "normal") == "#aabbcc")
check("normal canonicalizes uppercase", cvd.simulate("#AABBCC", "normal") == "#aabbcc")
check("normal trims", cvd.simulate("  #abc  ", "normal") == "#aabbcc")
check("4-digit alpha hex parses, alpha discarded", cvd.simulate("#abcd", "normal") == "#aabbcc")
check("8-digit alpha hex parses, alpha discarded", cvd.simulate("#aabbccdd", "normal") == "#aabbcc")
check("8-digit simulates as its 6-digit self",
      cvd.simulate("#d7191cff", "deutan") == cvd.simulate("#d7191c", "deutan"))
check("normal is comparable to a simulated value",
      cvd.simulate("#f00", "normal") == "#ff0000"
      and cvd.simulate("#f00", "deutan") == cvd.simulate("#ff0000", "deutan"))

for bad in ["red", "#ab", "#abcde", "#1234567", "#abcdefgh", "", "#gggggg", "rgb(1,2,3)", "#"]:
    check_raises("malformed color %r raises" % bad, lambda b=bad: cvd.simulate(b, "deutan"),
                 ValueError, ["invalid color"])
check_raises("malformed color raises for normal too", lambda: cvd.simulate("red", "normal"),
             ValueError, ["invalid color"])

# tuple input: real matplotlib forms keep working, junk does not
check("0-1 rgb tuple", cvd.to_hex((0.843, 0.098, 0.11)) == "#d7191c")
check("0-255 rgb tuple", cvd.to_hex((215, 25, 28)) == "#d7191c")
check("rgba tuple drops alpha", cvd.to_hex((1.0, 0.0, 0.0, 0.5)) == "#ff0000")
check("list works like a tuple", cvd.to_hex([0.843, 0.098, 0.11]) == "#d7191c")
check_raises("short tuple raises", lambda: cvd.to_hex((1, 2)), ValueError, ["3 or 4 components"])
check_raises("long tuple raises", lambda: cvd.to_hex((1, 2, 3, 4, 5)), ValueError, ["3 or 4 components"])
check_raises("non-numeric tuple raises", lambda: cvd.to_hex((None, 0, 0)), TypeError, ["must be numbers"])
check_raises("nan raises", lambda: cvd.to_hex((float("nan"), 0, 0)), ValueError, ["finite"])
check_raises("negative raises", lambda: cvd.to_hex((-1, 0, 0)), ValueError, ["negative"])
check_raises("above 255 raises", lambda: cvd.to_hex((300, 0, 0)), ValueError, ["255"])
check_raises("a bare number is not a color", lambda: cvd.to_hex(42), TypeError, ["invalid color"])

# every public entry validates, not just simulate
check_raises("delta_e validates", lambda: cvd.delta_e("#fff", "red"), ValueError, ["invalid color"])
check_raises("check_palette validates", lambda: cvd.check_palette(["#d7191c", "nope"]), ValueError, ["invalid color"])
check_raises("fix_palette validates", lambda: cvd.fix_palette(["#d7191c", "#ab"]), ValueError, ["invalid color"])
check_raises("contrast_ratio validates", lambda: cvd.contrast_ratio("#fff", "xyz"), ValueError, ["invalid color"])
check_raises("rel_luminance validates", lambda: cvd.rel_luminance("xyz"), ValueError, ["invalid color"])
check_raises("check_contrast validates", lambda: cvd.check_contrast("#fff", "xyz"), ValueError, ["invalid color"])

print("\nALL PASS" if ok else "\nFAILURES")
raise SystemExit(0 if ok else 1)
