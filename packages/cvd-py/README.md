```
╔════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                            ║
║              ██████╗ ██████╗ ████████╗██╗ ██████╗ ██████╗ ██╗   ██╗██╗███████╗             ║
║             ██╔═══██╗██╔══██╗╚══██╔══╝██║██╔════╝██╔═══██╗██║   ██║██║╚══███╔╝             ║
║             ██║   ██║██████╔╝   ██║   ██║██║     ██║   ██║██║   ██║██║  ███╔╝              ║
║             ██║   ██║██╔═══╝    ██║   ██║██║     ██║▄▄ ██║██║   ██║██║ ███╔╝               ║
║             ╚██████╔╝██║        ██║   ██║╚██████╗╚██████╔╝╚██████╔╝██║███████╗             ║
║              ╚═════╝ ╚═╝        ╚═╝   ╚═╝ ╚═════╝ ╚══▀▀═╝  ╚═════╝ ╚═╝╚══════╝             ║
║                                                                                            ║
║                                  ██████╗██╗   ██╗██████╗                                   ║
║                                 ██╔════╝██║   ██║██╔══██╗                                  ║
║                                 ██║     ██║   ██║██║  ██║                                  ║
║                                 ██║     ╚██╗ ██╔╝██║  ██║                                  ║
║                                 ╚██████╗ ╚████╔╝ ██████╔╝                                  ║
║                                  ╚═════╝  ╚═══╝  ╚═════╝                                   ║
║                                                                                            ║
║                           measure a palette before you trust it                            ║
║                                                                                            ║
╚════════════════════════════════════════════════════════════════════════════════════════════╝
```

# opticquiz-cvd (Python)

[![PyPI version](https://img.shields.io/pypi/v/opticquiz-cvd)](https://pypi.org/project/opticquiz-cvd/)
[![PyPI downloads](https://img.shields.io/pypi/dm/opticquiz-cvd)](https://pypi.org/project/opticquiz-cvd/)
[![DOI](https://img.shields.io/badge/method-10.5281%2Fzenodo.21310578-blue)](https://doi.org/10.5281/zenodo.21310578)

**Is your chart colorblind-safe?** Red-green color-vision deficiency affects ~1 in 12 men — and the classic failure is a plot where the red series and the green series look identical to those readers. This checks any palette for that, **fixes** it if it fails, and also checks **WCAG contrast** — with **zero dependencies**, dropping straight into a matplotlib / plotly / seaborn workflow.

It simulates protanopia, deuteranopia and tritanopia (Machado 2009, or Brettel 1997) and scores perceptual difference with CIEDE2000, flagging pairs that are distinct to normal vision but **collapse under a color-vision-deficiency simulation**.

Method (citable): https://doi.org/10.5281/zenodo.21310578

## Install
```
pip install opticquiz-cvd
```

## Check a chart palette
```python
import opticquiz_cvd as cvd

report = cvd.check_palette(["#d7191c", "#1a9641", "#2166ac"])
report["pass"]                         # False
report["types"]["deutan"]["conflicts"]
# [{'a': '#d7191c', 'b': '#1a9641', 'normal': 70.6, 'sim': 8.1, 'severity': 'risk'}]
```
Works directly with matplotlib colors (hex, or 0-1 / 0-255 RGB tuples):
```python
import matplotlib.pyplot as plt, opticquiz_cvd as cvd
cycle = plt.rcParams["axes.prop_cycle"].by_key()["color"]
print("colorblind-safe:", cvd.check_palette(cycle)["pass"])
```
`check_palette(colors, distinct=13, collapse=10, severity=1.0, model="machado")` — `severity` (0–1) checks milder anomalous trichromacy; `model` is `"machado"` or `"brettel"`.

## Fix a failing palette
```python
fixed = cvd.fix_palette(["#d7191c", "#1a9641"])
fixed["colors"]   # ['#c80011', '#2da24c']  — now colorblind-safe
fixed["drift"]    # [4.0, 4.1]  — how far each color moved (CIEDE2000)
fixed["pass"]     # True
```

## Check contrast (WCAG)
```python
cvd.check_contrast("#767676", "#ffffff")
# {'ratio': 4.54, 'AA': True, 'AAA': False, 'ui': True, 'pass': True}
cvd.contrast_ratio("#000000", "#ffffff")   # 21.0
```

## Simulate
```python
cvd.simulate("#d7191c", "deutan")               # '#8a7b0c'  (Machado, full)
cvd.simulate("#d7191c", "deutan", 0.5)          # milder
cvd.simulate("#d7191c", "deutan", 1.0, "brettel")
cvd.delta_e("#d7191c", "#1a9641")               # 70.6
```

## Command line
```
python -m opticquiz_cvd "#d7191c" "#1a9641" "#2166ac"
# FAIL - color conflicts found (3 colors)
#   deutan: #d7191c/#1a9641 dE8.1(risk)
```

## Honest scope
Simulates a **model** of color vision — an approximation of a diverse population, not any single person's vision — and results depend on an uncalibrated screen. Severity below 1 is a disclosed approximation of anomalous trichromacy. It is **not** a legal accessibility audit and does not certify ADA / Section 508 / WCAG / EU Accessibility Act compliance.

## License
MIT. Methods: Machado, Oliveira & Fernandes (2009); Brettel, Viénot & Mollon (1997); CIEDE2000; WCAG 2.x. Part of [OpticQuiz](https://opticquiz.com/checker/).

---

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║      ███████╗      ██╗  ██╗███████╗██╗   ██╗███████╗       ║
║      ██╔════╝      ██║ ██╔╝██╔════╝╚██╗ ██╔╝██╔════╝       ║
║      █████╗  █████╗█████╔╝ █████╗   ╚████╔╝ ███████╗       ║
║      ██╔══╝  ╚════╝██╔═██╗ ██╔══╝    ╚██╔╝  ╚════██║       ║
║      ██║           ██║  ██╗███████╗   ██║   ███████║       ║
║      ╚═╝           ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝       ║
║                                                            ║
║               ·   C  R  E  A  T  I  V  E   ·               ║
║                                                            ║
║          ────────────────────────────────────────          ║
║                                                            ║
║                      Vincent Gonzalez                      ║
║                         f-keys.com                         ║
║                 ORCID 0009-0005-3640-014X                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

Part of [F-Keys](https://f-keys.com) — independent hardware, software
and internet products. See the [working log](https://f-keys.com/log/)
and [live status](https://f-keys.com/status/).
