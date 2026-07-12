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

print("\nALL PASS" if ok else "\nFAILURES")
raise SystemExit(0 if ok else 1)
