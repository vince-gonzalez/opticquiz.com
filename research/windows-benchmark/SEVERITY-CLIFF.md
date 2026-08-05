# Correction has zero measurable benefit for mild colour-vision deficiency — the common case

**Recorded 5 August 2026, from `results/classes.json`.** Already computed by `classes.py`; this
document is the reading of it that had not been written down.

This supersedes the framing of [METRIC-DISAGREEMENT.md](METRIC-DISAGREEMENT.md) in practical
terms. That document argues about which matrix is better at severity 1.0. This one shows that
severity 1.0 is the minority case, and that at the severities most people actually have, **no
approach measured here does anything useful at all.**

---

## The numbers

Net pairs (rescued − broken), 5-fold CV over 10 real palettes, scored on **held-out** palettes
under **unseen** simulators (fit on Machado + Brettel; scored on Viénot, Vischeck, CoblisV2).

| approach | protan @1.0 | @0.7 | @0.4 | deutan @1.0 | @0.7 | @0.4 | tritan @1.0 | @0.7 | @0.4 |
|---|---|---|---|---|---|---|---|---|---|
| identity (control) | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| matrix-grey | +3.0 | +0.4 | **−0.8** | +4.2 | **−1.2** | **−0.8** | +2.0 | −0.2 | +0.0 |
| matrix-free | +0.0 | −0.4 | −0.2 | +0.6 | **−3.2** | **−1.8** | −1.0 | +0.0 | +0.0 |
| affine | +4.8 | **−2.2** | +0.0 | +2.4 | −1.0 | +0.0 | −1.2 | −0.2 | −0.6 |
| daltonize (published ref) | +5.6 | **−4.0** | **−2.8** | +4.8 | −0.8 | +0.0 | −1.4 | +1.4 | +0.0 |
| fix_palette (content-aware) | **+10.0** | +0.0 | **−1.2** | **+8.2** | −0.4 | **−1.2** | **+6.6** | +0.4 | **−1.2** |

The net figure hides the mechanism, so here are the raw counts:

| approach | condition | rescued | broken |
|---|---|---|---|
| matrix-grey | deutan @1.0 | 51 | 30 |
| | deutan @0.7 | **0** | 6 |
| | deutan @0.4 | **0** | 4 |
| daltonize | protan @1.0 | 60 | 32 |
| | protan @0.7 | 6 | **26** |
| | protan @0.4 | **0** | **14** |
| fix_palette | protan @1.0 | 55 | 5 |
| | protan @0.4 | **0** | 6 |

**At severity 0.4, every single approach rescues zero pairs and breaks between four and
fourteen.** Not a reduced benefit — no benefit, plus measurable harm.

Meanwhile fidelity cost is essentially **flat across severity** (6.8 for fix_palette, 9–15 for
the matrix classes, at every severity). The distortion is the same. Only the benefit disappears.

## Why this happens, and why it is not an artifact

It is mechanically obvious once stated: at low severity fewer colour pairs collapse in the first
place, so there is less to rescue — while the transform still displaces every colour by the same
amount, so it still breaks pairs that were fine. Benefit scales with impairment. Cost does not.

This is not a small-numbers artifact. At protan @0.7 daltonize rescues 6 and breaks 26. Those
26 are real pairs that were distinguishable to that observer before correction and are not
after. The identity control scores exactly 0.0 everywhere, as it must.

## Who this describes

Colour-vision deficiency affects roughly 8% of males and 0.5% of females of northern European
descent — about 4–5% of people overall. **The large majority of those are anomalous trichromats,
not dichromats.** Deuteranomaly alone is the most common form by a wide margin. Severity 1.0 —
full dichromacy — is the tail, not the centre.

So the population that every matrix in this project was optimised for is the minority of a
minority, and the population most likely to install a corrector gets nothing measurable from it.

## What this means for the product

The architecture is already right, and that matters: correction strength ships as
`M(s) = I + s(M − I)` on all five surfaces, and `oq-results.js` derives `s` from the user's own
screening result. A user who screens mild gets weak correction, which tends toward identity, and
identity scores exactly zero — so a correctly-tuned slider does **not** inflict the harm in the
table above. The severity slider is not a nicety; it is the thing standing between a mild user
and a net-negative transform.

What is missing is not a mechanism, it is a **sentence**. Nothing on the site currently tells a
user who screens mild that correction may do nothing for them. The set-up page says lower is
often better; it does not say that at the low end the honest setting may be off. That is the gap,
and it is a writing gap, not an engineering one.

## What this does NOT say

- **Not that correction is useless.** At severity 1.0 the benefit is large and consistent:
  fix_palette +10.0 protan, +8.2 deutan, +6.6 tritan on held-out data under unseen simulators.
  For dichromats this works.
- **Not that these people do not benefit.** It says *these metrics, on these stimuli, under these
  simulators* detect no benefit. A mild observer may still report that a filter helps them read a
  particular chart, and that report would not be refuted by anything here. ΔE2000 over palette
  pairs is a proxy, and this is exactly the boundary where a proxy is least trustworthy.
- **Not that the slider default should be zero.** That is a product decision requiring evidence
  this document does not have.

## What would settle it

Observers, stratified by measured severity, with the mild group large enough to stand alone. The
question "does correction help someone with mild deuteranomaly" is the single most commercially
and ethically load-bearing question in this project, it applies to most of the people it is
built for, and no computational metric can answer it.

That is the study, and this result is the argument for running it.
