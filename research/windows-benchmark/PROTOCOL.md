# Benchmark Protocol — Windows Colour Filters vs. Model-Based Daltonisation

**Status: PRE-REGISTERED. Metrics and stimulus sets are fixed below BEFORE any measurement
is taken.** This document is written first, and deliberately, so that the analysis cannot be
steered toward a flattering result after the numbers are in. If a metric here favours Windows,
that result is published with the same prominence as any other.

Author: Vincent Gonzalez · ORCID 0009-0005-3640-014X
Engine under test: `opticquiz-cvd` (npm / PyPI), method DOI 10.5281/zenodo.21310578

---

## 1. The question

Windows 11 ships colour filters for protanopia, deuteranopia and tritanopia
(Settings → Accessibility → Colour filters). They are, to our knowledge, the most widely
deployed colour-vision assistive transform in existence — installed on every Windows machine.

**No public specification of what they do exists.** Microsoft documents the feature's purpose
but not its transform. This benchmark answers two questions:

- **Q1 (descriptive).** What transform do the Windows colour filters actually apply? Is it a
  linear operation on sRGB values, and if so, what is the matrix?
- **Q2 (comparative).** How does that transform compare to a published, model-based
  daltonisation on defined discriminability and fidelity metrics?

Q1 has value independent of Q2. A documented, reproducible measurement of an undocumented
accessibility feature used by hundreds of millions of people is a contribution on its own.

## 2. What this benchmark does NOT claim

Stated first, because these limits bound every number that follows.

- **It does not measure human performance.** Every metric is computed under a *model* of
  colour-vision deficiency (Machado et al. 2009). A modelled ΔE2000 gain is a proxy for
  discriminability, not a demonstration that any person saw anything better. Only a study
  with colour-vision-deficient participants could establish that, and this is not one.
- **It does not model an individual.** Machado's matrices describe a population average at a
  given severity. Real observers vary, and anomalous trichromats vary enormously.
- **It does not assume a calibrated display.** All computation is in nominal sRGB. A
  measurement on an uncalibrated panel describes the signal sent to the display, not the light
  leaving it.
- **It does not evaluate usability.** Speed, comfort, eye strain, and whether a user leaves the
  filter switched on are not measured here and matter enormously in practice.
- **It is not a claim that either transform is a treatment.** Both are aids. Neither restores
  cone function.

## 3. Method

### Stage 0 — Capture feasibility probe (must run first)

Windows applies colour filters late in the display pipeline. It is **not established** whether
a software screen capture observes the filtered or unfiltered frame — Night Light, for example,
is not captured by conventional screenshots.

Run `probe.py` with a filter enabled and disabled and compare captures pixel-wise.

- **Outcome A — capture observes the filter.** Proceed to Stage 1 by software capture. Fully
  reproducible, no hardware required.
- **Outcome B — capture does not observe the filter.** Software capture is invalid for this
  purpose and must not be used. Fall back to Stage 1-alt (external camera), and **report
  Outcome B as a finding** — it means no software tool can audit these filters, which is
  itself worth documenting.

The probe result is recorded either way. A null result here is a publishable technical note.

### Stage 1 — Transform recovery

Display `patches.png`: a set of *N* = 730 uniformly spaced sRGB patches (a 9×9×9 lattice plus
a 1-step neutral ramp), each a flat block with known nominal RGB.

Capture the screen with the filter **off** (establishes the capture pipeline's own colour
handling — this is the control, not an assumption) and with the filter **on**, for each of
protanopia / deuteranopia / tritanopia mode.

Solve for the best-fit transform by least squares, fitting in this order and reporting all three:

1. **Linear 3×3** on nominal sRGB values.
2. **Affine 3×4** (3×3 plus offset).
3. **Linear 3×3 on linearised sRGB** (i.e. the transform applied in linear light).

**Report the residual for each.** The residual is the result, not a nuisance: if a linear model
fits to within quantisation error, the filter is a matrix and we publish it. If it does not,
the filter is non-linear or LUT-based, and we publish the measured LUT and say so plainly. We
do not force a matrix onto a filter that is not one.

### Stage 1-alt — External capture (only if Stage 0 returns Outcome B)

Photograph the display showing `patches.png` under fixed manual camera settings (fixed ISO,
shutter, aperture, white balance; RAW), filter off and on, without moving the camera. Register
the two frames on the patch grid and recover the transform from the *ratio* of measurements,
which cancels the camera's own transfer function to first order. Report the neutral-patch
residual as the confound estimate.

This path is noisier and its limitations must be stated wherever its numbers appear.

### Stage 2 — Evaluation

Both transforms — the measured Windows transform and `opticquiz-cvd`'s `fix_palette` — are
applied to identical stimulus sets. An **identity (no correction)** control is included, and
scored the same way, so every reported gain is a gain over doing nothing.

## 4. Stimulus sets — fixed in advance

| Set | Contents | Why |
|---|---|---|
| `lattice` | 9×9×9 = 729 uniform sRGB samples | Unbiased coverage; cannot be cherry-picked |
| `pairs` | All lattice pairs that collapse under simulation (ΔE2000 < 10) but are distinct to normal vision (ΔE2000 ≥ 20) | The population the correction exists to serve |
| `okabe_ito` | The 8-colour Okabe–Ito colourblind-safe palette | A palette already designed to survive CVD — a correction should not damage it |
| `neutral` | 17-step black→white ramp | Achromatic preservation |

## 5. Metrics — fixed in advance

For a transform *T*, a CVD type *t*, and the Machado simulation *S_t*:

- **M1 — Discriminability gain.** For each pair (a, b) in `pairs`:
  `ΔE2000(S_t(T(a)), S_t(T(b))) − ΔE2000(S_t(a), S_t(b))`.
  Reported as mean, median, and the full distribution. Positive = the transform increased
  modelled separation for that observer.
- **M2 — Collapse rescue rate.** Fraction of `pairs` whose simulated ΔE2000 rises from below 10
  to at or above 10. A single headline number, but reported alongside M1's distribution because
  a threshold count hides magnitude.
- **M3 — Fidelity cost.** Mean `ΔE2000(c, T(c))` over `lattice` — how far the transform moves
  colour for an observer *without* the deficiency, or for the user's unaffected channels. Every
  gain in M1 is bought with M3. A transform is only interesting at a stated fidelity cost.
- **M4 — Clipping rate.** Fraction of `lattice` whose transformed value falls outside [0, 1]
  before clamping. Naive matrix corrections push colours out of gamut and lose information
  silently; this exposes it.
- **M5 — Achromatic preservation.** Mean `ΔE2000(c, T(c))` over `neutral`. A transform that
  tints greys makes a display unpleasant to use all day regardless of how it scores on M1.
- **M6 — Safe-palette damage.** M1 computed over `okabe_ito`. A correction applied to a palette
  that is *already* accessible should do little; large negative values here mean the transform
  degrades good design.

**No metric will be added, removed, or reweighted after measurement.** If a genuinely better
metric occurs to us later, it is reported as an explicitly post-hoc addition, separately.

## 6. Reporting

Published as a Zenodo deposit with:
- this protocol, unedited, including its timestamp;
- the raw captures and recovered transforms;
- `results.json` and every figure's source data;
- the analysis code, so any claim can be recomputed;
- the exact Windows build number, GPU, driver version and display model.

**Per-outcome commitment.** If Windows outperforms `opticquiz-cvd` on any metric, that is
reported in the abstract, not the appendix. If the two are indistinguishable, that is the
finding, and it is still worth publishing, because the transform is currently undocumented
either way.

## 7. Files

```
probe.py        Stage 0 — does a screen capture observe the filter?
make_patches.py Generates patches.png and its ground-truth index
recover.py      Stage 1 — least-squares transform recovery + residuals
benchmark.py    Stage 2 — metrics M1-M6 against a transform JSON
```
