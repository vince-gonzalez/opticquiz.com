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
║                 your eyes, tested in the browser, with nothing leaving it                  ║
║                                                                                            ║
╚════════════════════════════════════════════════════════════════════════════════════════════╝
```

**An open, published method for color vision — and 17 vision tests built on it.**
Everything runs on the device. No account, no upload, no image ever sent anywhere.

The colorimetry is not a private formula: it is Machado, Oliveira & Fernandes (2009)
deficiency simulation with CIEDE2000 color difference, published open access at
**[doi.org/10.5281/zenodo.21310578](https://doi.org/10.5281/zenodo.21310578)**, and shipped as
packages so you can run the math yourself and check our numbers against yours.

## Use the engine

```bash
pip install cvdsafe          # is this palette colorblind-safe?
npm  install cvdsafe
```

```python
import cvdsafe
cvdsafe.is_safe(["#d7191c", "#1a9641"])   # False — red and green collapse under deutan
```

```bash
npx cvdsafe "#d7191c" "#1a9641"           # exits 2 if the palette is unsafe — CI-friendly
```

| what you want | package |
| --- | --- |
| Is this palette safe? | [`cvdsafe`](https://pypi.org/project/cvdsafe/) · npm + PyPI, with a CLI |
| Show me how it looks | [`cvdsim`](https://pypi.org/project/cvdsim/) — recolors an image for protan/deutan/tritan |
| Give me safe colors | [`safepalette`](https://pypi.org/project/safepalette/) — Okabe–Ito, extended and verified |
| For matplotlib | [`cvdmaps`](https://pypi.org/project/cvdmaps/) — `set_cycle()` and you're safe |
| Make test plates | [`cvdplate`](https://www.npmjs.com/package/cvdplate) · [`ishihara`](https://pypi.org/project/ishihara/) |
| Acuity math | [`logmar`](https://pypi.org/project/logmar/) — logMAR ↔ Snellen ↔ decimal |
| One deficiency | `protan` · `deutan` · `tritanopia` · `dichromacy` · `achromatopsia` · `trichromacy` |

**For LLM tools:** `cvdsafe-mcp` and `colorblind-mcp` are MCP servers, listed in the official
Model Context Protocol registry — so an assistant can check a palette or generate an Ishihara
plate as a native tool.

## The tests

Color vision, D-15 arrangement, hue discrimination, anomaloscope-style matching, contrast
sensitivity, acuity, astigmatism, Amsler grid, blind spot, vernier alignment, flicker fusion,
saturation, dominance, reaction, stereo depth, digital eye strain, and a shape-based test for
kids.

A test on a web page cannot be a diagnosis: an uncalibrated display, ambient light and viewing
distance all move the result. Each test says so where it reports, and points at an eye
examination rather than standing in for one.

**Audit it yourself.** [opticquiz.com/methodology](https://opticquiz.com/methodology/) answers the
eight questions worth asking of any online vision test — who made it, what it measures, what it
assumes about your screen, whether it has been clinically validated (it has not), what it cannot
measure, and who pays for it.

## Also in here

Translations (de, es, fr, hi, it, pt, zh), a browser extension (reviewed and listed by Mozilla),
a VS Code extension, a Figma plugin, an embeddable widget, and the research notes behind the
plate colors under `research/`.

MIT licensed. Issues and corrections welcome — if a number here disagrees with yours, that is a
bug worth reporting.

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
