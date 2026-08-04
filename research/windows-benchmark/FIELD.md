# The field benchmark — colour-vision corrections, scored side by side

**Every corrector we can obtain, on identical stimuli, under six independently-implemented
simulation models.** Metrics were fixed in [PROTOCOL.md](PROTOCOL.md) before any of this ran.

Reproduce: `python field.py selfcheck && python field.py run`

---

## Why the simulator is a variable, not a setting

Every metric here is computed *under a model* of colour-vision deficiency. A result that
holds only under the model its author happened to pick is not a result — it is a property of
that model. So each corrector is scored six times, under Machado 2009 (two independent
implementations), Brettel 1997, Viénot 1999, Vischeck and Coblis.

The table therefore answers two questions at once: which correction wins, and **whether the
answer survives changing the model**.

### It mostly does

Across 12 metric × deficiency cells, **11 give the same winner under all six simulators.**
The single split is deuteranopia rescue rate, where the two correctors are within noise of
each other anyway (0.72–0.78 vs 0.73–0.82).

That is the methodological result: these rankings are a property of the transforms, not of
the simulation model. It is also the check that would have invalidated everything, so it had
to be run first.

---

## Results — 729-colour lattice, 1200 collapsing pairs per simulator

Ranges span the six simulators. Higher is better except fidelity cost.

| Deficiency | Metric | Winner | daltonize (Fidaner) | opticquiz |
|---|---|---|---|---|
| **protan** | rescue rate | daltonize | **0.95 – 0.98** | 0.92 – 0.95 |
| | mean gain | daltonize | **+17.8 – +20.7** | +15.0 – +17.2 |
| | fidelity cost | opticquiz | 14.30 | **12.97** |
| | Okabe–Ito effect | daltonize | **+3.30 – +4.32** | +1.80 – +2.91 |
| **deutan** | rescue rate | *split* | 0.73 – 0.82 | 0.72 – 0.78 |
| | mean gain | daltonize | **+12.0 – +13.7** | +10.1 – +11.1 |
| | fidelity cost | daltonize | **7.44** | 9.89 |
| | Okabe–Ito effect | opticquiz | −2.75 – −1.22 | **−1.04 – +0.99** |
| **tritan** | rescue rate | opticquiz | 0.13 – 0.42 | **0.70 – 0.84** |
| | mean gain | opticquiz | +0.44 – +1.60 | **+5.07 – +16.69** |
| | fidelity cost | daltonize | **5.10** | 13.28 |
| | Okabe–Ito effect | daltonize | **−0.46 – +0.95** | −9.53 – −6.43 |

The identity control scores exactly 0.000 on every metric under every simulator, as it must.

---

## Reading this honestly

**OpticQuiz does not win.** It loses protanopia outright — daltonize rescues more pairs, by a
wider margin, while doing *less* damage to an already-safe palette. On deuteranopia it loses
on both discriminability and fidelity, and wins only on not wrecking good palettes.

**OpticQuiz wins tritanopia decisively**, and it is not close: 0.70–0.84 of collapsing pairs
rescued against 0.13–0.42. The Fidaner-style correction barely moves blue-yellow at all —
its mean gain there is under +1.6 ΔE2000 across every simulator, which is close to doing
nothing.

**Every win is bought.** OpticQuiz's tritan advantage costs 13.28 ΔE of fidelity against
daltonize's 5.10, and it damages the Okabe–Ito palette by 6.4–9.5 units where daltonize is
roughly neutral. There is no free correction here; there is a distortion budget, and the two
transforms spend it differently.

**One instability worth flagging.** OpticQuiz's tritan *gain* ranges from +5.07 under
Machado 2009 to +16.69 under Vischeck — a factor of three. The direction of the result is
stable; its magnitude is not. Any single number quoted for tritan performance should carry
the model it was computed under.

### What follows for OpticQuiz specifically

1. The protan and deutan matrices are beaten by a published method from 2005-era work. They
   should be replaced or re-derived, not defended.
2. The tritan advantage is real and worth keeping, but its fidelity and safe-palette costs
   are the highest in the table and should be reduced.
3. Damage to already-accessible palettes (M6) is the recurring theme across both correctors
   and all three deficiencies. A global matrix cannot know whether the content it is
   recolouring already works. That is an argument for content-aware correction, and it is
   the clearest product direction to come out of this benchmark.

---

## Provenance — nothing here is reconstructed from memory

| Component | Source |
|---|---|
| `opticquiz` matrices | lifted verbatim from `browser-extension/content.js`, the transform shipping in the Chrome Web Store extension, applied in linear light |
| `daltonize (Fidaner)` | the installed [`daltonize`](https://pypi.org/project/daltonize/) package, invoked through its own gamma pipeline so it is measured as it ships |
| simulators | the installed [`daltonlens`](https://pypi.org/project/daltonlens/) package (DaltonLens-Python), plus the OpticQuiz engine's own Machado 2009 |
| ΔE2000 | vectorised here for speed, and checked against the OpticQuiz engine on 400 random pairs: max discrepancy 4.3 × 10⁻⁵, four orders below the collapse threshold |

**Free cross-validation:** the OpticQuiz engine's Machado 2009 and DaltonLens-Python's
independent implementation agree to within 1/255 on test colours (`#d7191c` deutan →
`#8a7b0c` vs `#8a7a0b`). Two separately-written implementations of the same paper landing on
the same answer is evidence both read it correctly.

---

## Limits

- Modelled discriminability, not human performance. No person saw anything in this table.
- Dichromacy at severity 1.0 only. Anomalous trichromats, who are the majority of colour-vision-deficient
  people, are not represented.
- Two correctors. The field is larger; this is where it starts, not where it ends.
- Uncalibrated nominal sRGB throughout.
- Windows, macOS, iOS and Android system filters are absent because they cannot be measured
  from software — see [FINDINGS.md](FINDINGS.md).
