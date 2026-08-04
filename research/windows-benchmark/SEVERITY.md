# Every correction measured is neutral or harmful for mild colour-vision deficiency

**5-fold CV, held-out palettes and held-out simulators, 10 real palettes, three severities.**

Severity 1.0 is full dichromacy — no functioning cone class. Severity 0.4–0.7 is *anomalous
trichromacy*: a shifted cone, not a missing one. **Anomalous trichromacy is the common case.**
Everything OpticQuiz has ever shipped was optimised at severity 1.0.

---

## Net pairs (rescued − broken), mean ± sd across folds

| | severity 1.0 | severity 0.7 | severity 0.4 |
|---|---|---|---|
| **protan** matrix-grey | +3.0 ± 5.4 | +0.4 ± 1.9 | **−0.8 ± 1.2** |
| affine | +4.8 ± 6.2 | −2.2 ± 1.9 | 0.0 ± 0.0 |
| daltonize *(ref)* | +5.6 ± 8.8 | **−4.0 ± 2.9** | **−2.8 ± 2.7** |
| fix_palette *(ref)* | **+10.0 ± 5.2** | 0.0 ± 2.0 | **−1.2 ± 1.5** |
| **deutan** matrix-grey | +4.2 ± 5.0 | **−1.2 ± 1.9** | **−0.8 ± 1.6** |
| daltonize *(ref)* | +4.8 ± 6.3 | −0.8 ± 1.0 | 0.0 ± 0.0 |
| fix_palette *(ref)* | **+8.2 ± 4.4** | −0.4 ± 1.5 | **−1.2 ± 1.5** |
| **tritan** matrix-grey | +2.0 ± 4.3 | −0.2 ± 2.4 | 0.0 ± 0.0 |
| daltonize *(ref)* | −1.4 ± 2.6 | +1.4 ± 1.4 | 0.0 ± 0.0 |
| fix_palette *(ref)* | **+6.6 ± 5.6** | +0.4 ± 1.7 | **−1.2 ± 1.5** |

Identity scores exactly 0.0 ± 0.0 everywhere, as it must.

## What this says

**At severity 1.0 every approach helps.** At 0.7 almost nothing does. At 0.4 **nothing helps and
several methods actively hurt.**

The mechanism is visible in the raw counts. At severity 1.0, protan `matrix-grey` rescues 35
pairs and breaks 20. At severity 0.4 it rescues **0** and breaks **4**. There is almost nothing
left to fix — a mild anomalous trichromat can already distinguish these palettes — but the
correction still fires, still distorts, and still collapses pairs that were fine.

**A correction tuned for dichromacy, applied to mild deficiency, is pure cost.**

## The product consequence

OpticQuiz ships correction as a **binary per type**: pick Deuteranopia, get the full-strength
dichromacy matrix. There is no severity control anywhere — not in the extension, not the
widget, not `/live`, not the desktop app.

So a person with mild deuteranomaly — the most common colour-vision deficiency there is —
switches on the corrector and receives a transform measured to make their palettes slightly
worse while distorting every colour on screen by ~9 ΔE.

That is not a tuning bug. **It is the wrong product for the majority of the people it is for.**

### What follows

1. **A severity control is not a feature request, it is a correctness fix.** The engine already
   supports a `severity` parameter (`simulate(..., severity)`); the corrections do not.
2. **Correction strength should scale with severity**, toward identity at the mild end. At
   severity 0.4 the measured optimum is *do nothing*, and the product should be able to do that.
3. **The "Recommended" default is the most exposed setting**, because it is what someone picks
   when they do not know their own type or degree — which correlates with milder deficiency.

## Two corrections to earlier claims in this repo

**The degrees-of-freedom result is not monotonic, and I said it was.** From tritan alone I wrote
that 6 DOF beat 9 beat 12 and called grey-preservation a regulariser. Across all three: on protan
at severity 1.0, affine (12 DOF) scores +4.8 against grey's +3.0. What *does* hold consistently
is grey ≥ free (6 DOF beats 9 DOF in every cell). Grey-preservation is not a cost. The rest was
one deficiency generalised too fast.

**v3's margin over daltonize is less certain than FIELD.md implies.** Under this harder protocol
— 5-fold, 8 training palettes, 6 restarts — `matrix-grey` scores +3.0 against daltonize's +5.6 on
protan. v3 was fitted with 40 restarts on 6 of 10 palettes and scored on a mix of seen and unseen.
Both numbers are real; they measure different things. The honest reading is that **v3 beats
daltonize when fitted hard, and a lightly-fitted matrix of the same class does not**, and that
10 palettes cannot resolve the gap. More stimuli, not more optimisation.

## The one thing that holds everywhere

**`fix_palette` — content-aware, set-wise, unfitted — wins at severity 1.0 on all three
deficiencies** (+10.0, +8.2, +6.6), at the lowest distortion of any method (6.79 against 9–15).
It is a *reference* implementation that nobody tuned for this benchmark, and it beats every
fitted matrix class.

The matrix is not the best instrument. It is the instrument that fits in an `feColorMatrix`.
