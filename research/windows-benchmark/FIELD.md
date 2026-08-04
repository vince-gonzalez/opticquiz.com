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

---

# v2 — matrices derived against the benchmark, honestly

`optimise.py` searches for better matrices. The obvious failure mode is training on the test
set, so:

- **Simulator split.** Fitted against Machado 2009 + Brettel 1997 only. Viénot 1999, Vischeck
  and Coblis are never seen during the fit and are the score that counts.
- **Stimulus split.** Fitted on a 343-colour lattice; scored on a 729-colour lattice with a
  different random seed.
- **Structural grey preservation.** Rows are constrained to sum to 1, so the achromatic axis
  is preserved by construction rather than by hope. 6 free parameters, not 9.
- **Caps, not trades.** Fidelity cost, safe-palette damage and gamut clipping are each capped
  at the *current* matrix's own value — "do not make it worse" — and are penalties in the
  objective, never tradeable against raw gain.
- **A win requires every metric to hold**, on the held-out models. Not one.

### Two failures worth recording

**The first objective maximised mean gain, and that was wrong.** A matrix can raise the mean
enormously by blowing apart pairs that were already distinguishable while letting marginal
ones fall below threshold. It scored as a large improvement while rescue rate dropped 0.94 →
0.78 and gamut clipping went 35% → 57%. Fixed by maximising `min(ΔE, 15)` — which pays for
lifting a pair *to* the threshold and stops paying beyond it.

**The first verdict checked only gain**, and so blessed that matrix. Fixed: all five metrics
must hold. The script now rejects its own output routinely, which is the point.

### Result — v2 vs v1 vs daltonize, all six simulators

| | | v1 (shipped) | **v2 (derived)** | daltonize |
|---|---|---|---|---|
| **protan** | rescue | 0.917 – 0.952 | 0.932 – 0.961 | **0.953 – 0.979** |
| | fidelity cost | 12.97 | **13.01** | 14.30 |
| | safe palettes | +1.80 – +2.91 | +1.69 – +2.93 | **+3.30 – +4.32** |
| **deutan** | rescue | 0.718 – 0.777 | **0.851 – 0.896** | 0.733 – 0.819 |
| | mean gain | +10.09 – +11.12 | +11.78 – **+13.72** | +11.97 – +13.71 |
| | safe palettes | −1.04 – +0.99 | **−0.31 – +1.17** | −2.75 – −1.22 |
| **tritan** | rescue | 0.705 – 0.843 | **0.834 – 0.916** | 0.128 – 0.422 |
| | mean gain | +5.07 – +16.69 | **+11.18 – +18.69** | +0.44 – +1.60 |
| | safe palettes | −9.53 – −6.43 | **−4.20 – −2.93** | −0.46 – +0.95 |

**deutan: v2 now leads the field.** Rescue rises 12–14 points over v1 and clears daltonize by
6–8, at the same fidelity cost, while *improving* safe-palette behaviour where daltonize
actively damages it.

**tritan: v2 extends an already-dominant lead** and halves the worst problem in the whole
benchmark — damage to already-accessible palettes drops from −9.5 to −4.2.

**protan: v2 improves on v1 but still loses to daltonize** on rescue, gain and safe palettes,
winning only fidelity cost. The honest read is that the Fidaner construction is simply better
for protanopia and the matrix family searched here does not close the gap. Recorded as a loss.

### Disclosure

Two constraint configurations were tried for deuteranopia (safe-palette floor at −0.5 and at
the current matrix's own +0.18). The first passed all five held-out checks; the second found a
different local optimum that traded gain for palette safety and was rejected. The shipped v2
deutan matrix is the first. The verdict in both cases was computed on held-out simulators and
held-out stimuli, so the selection is between generalising candidates, not between fits.

### Not yet done

These matrices are **not** in the shipped extension. They are derived, verified against models
they were not fitted to, and recorded here. Shipping them is a separate decision, and should
be preceded by looking at real pages through them — every number above is modelled
discriminability, and no human has yet seen anything.

---

## Looking at it changed two conclusions

`visual.py` renders content through each matrix beside what the deficient viewer sees. Two
things fell out that no metric in the protocol caught.

### M3 disagrees with realistic content

Mean fidelity cost over a uniform 9×9×9 sRGB lattice, versus the same measure over a scene
of status colours, categorical series, the Okabe–Ito palette, a heatmap ramp and skin tones:

| | lattice M3 (v1 → v2) | realistic scene (v1 → v2) |
|---|---|---|
| protan | 12.97 → 13.01 (+0.3%) | 5.01 → **5.69 (+14%)** |
| deutan | 9.89 → 9.90 (+0.1%) | 3.86 → **5.17 (+34%)** |
| tritan | 13.28 → 13.27 (−0.1%) | 4.30 → **4.11 (−4%)** |

The lattice says v1 and v2 cost the same. On realistic content, deutan v2 distorts **34%
more**. A uniform lattice weights saturated cube-corner colours that barely occur in real
interfaces and under-weights the mid-saturation and near-neutral colours that dominate them.

**M3 as specified is the wrong measure of perceived distortion.** It is not wrong as
written — it measures what it says — but it should not be read as "how much this changes
what you look at". A content-weighted fidelity metric is needed, and adding one is a
post-hoc change to be reported as such, not folded silently into the protocol.

### Verdicts, revised by looking

- **deutan v2 — ship.** Rescue 0.851–0.896 against v1's 0.718–0.777, leading the field. The
  34% higher distortion on realistic content is a real cost, and worth it for that margin.
- **tritan v2 — ship, best result here.** Wins the metrics *and* is the only matrix that is
  **less** distorting on realistic content than the one it replaces (4.11 vs 4.30), while
  halving damage to already-safe palettes. One caveat visible only by looking: it washes the
  low end of the red-green ramp toward white for a tritan viewer, losing separation there.
- **protan v2 — do not ship.** Marginal metric gain, 14% *more* distortion on realistic
  content, and it still loses to daltonize. It is not worth the change. Keep v1 and treat
  protanopia as an open problem.

That last one is the point of rendering the images: the metrics said protan v2 was a clean
five-for-five pass, and it is still the wrong thing to ship.
