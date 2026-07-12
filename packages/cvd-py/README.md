# opticquiz-cvd (Python)

**Is your chart colorblind-safe?** Red-green color-vision deficiency affects ~1 in 12
men — and the classic failure is a plot where the red series and the green series look
identical to those readers. This checks any palette for that, with **zero dependencies**,
and drops straight into a matplotlib / plotly / seaborn workflow.

It simulates protanopia, deuteranopia and tritanopia (Machado, Oliveira & Fernandes,
2009) and scores perceptual difference with CIEDE2000, flagging pairs that are clearly
distinct to normal vision but **collapse under a color-vision-deficiency simulation**.

Method (citable): https://doi.org/10.5281/zenodo.21310578

## Install
```
pip install opticquiz-cvd
```

## Use it on a chart palette
```python
import opticquiz_cvd as cvd

report = cvd.check_palette(["#d7191c", "#1a9641", "#2166ac"])
report["pass"]                         # False
report["types"]["deutan"]["conflicts"]
# [{'a': '#d7191c', 'b': '#1a9641', 'normal': 70.6, 'sim': 8.1, 'severity': 'risk'}]
```

Works directly with matplotlib colors (hex, names, or 0-1 RGB tuples):
```python
import matplotlib.pyplot as plt, opticquiz_cvd as cvd
cycle = plt.rcParams["axes.prop_cycle"].by_key()["color"]
print("colorblind-safe:", cvd.check_palette(cycle)["pass"])

cvd.simulate((0.84, 0.10, 0.11), "deutan")   # '#8a7b0c'  (how a deuteranope sees it)
cvd.delta_e("#d7191c", "#1a9641")            # 70.6
```

Command line:
```
python -m opticquiz_cvd "#d7191c" "#1a9641" "#2166ac"
# FAIL - color conflicts found (3 colors)
#   deutan: #d7191c/#1a9641 dE8.1(risk)
```

## Honest scope
Simulates a **model** of color-vision deficiency — an approximation of a diverse
population, not any single person's vision — and results depend on an uncalibrated
screen. It reliably catches classic red-green and blue-yellow conflicts. It is **not**
a legal accessibility audit and does not certify ADA / Section 508 / WCAG / EU
Accessibility Act compliance.

## License
MIT. Method: Machado, Oliveira & Fernandes (2009) + CIEDE2000. Part of
[OpticQuiz](https://opticquiz.com/checker/).
