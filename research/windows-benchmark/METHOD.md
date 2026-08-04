# METHOD — how to evaluate and ship a colour correction

The standing procedure. Every rule here was bought with a specific mistake, and the mistake is
named, because a rule whose reason has been forgotten gets dropped by the next person.

---

## 0. The rules

**R1 — Optimise the number you report.** Not a surrogate, not a proxy, not "something
correlated with it". `optimise.py` maximised rescue and shipped matrices that broke more pairs
than they fixed; the quantity that mattered (net) did not exist yet. If you find yourself
optimising X and publishing Y, stop.

**R2 — A verdict checks every metric, and checks that the mechanism engaged.** Four separate
verdict functions in one day passed something that did nothing: a gate with its threshold
driven negative, a LUT that was numerically the identity, a matrix that won on gain while
rescue collapsed. "Did the thing actually do anything" is a check, not an assumption.

**R3 — Hold out two independent axes.** Simulators *and* stimuli. A matrix fitted and scored on
the same palettes has memorised six palettes. Use k-fold, not a single split — one lucky split
looks exactly like a result.

**R4 — Render the picture before shipping.** It overturned the metrics three times in one day:
protan v2 (passed five checks, visibly wrong), the gated corrector (scored a win, was a no-op),
the content LUT (scored a win on every deficiency, was indistinguishable from no correction).
Metrics are necessary and they are not sufficient.

**R5 — Only count pairs a normal viewer can distinguish.** Without a ΔE ≥ 20 filter, quantiser
near-duplicates count as information loss. This inflated one measurement by a third and produced
a false alarm that tritan correction was net harmful.

**R6 — Compare approaches at their own optimum, or say you didn't.** Scoring our fitted matrix
against someone's fixed implementation tells you who tuned harder, not which approach is better.
Either fit both under identical conditions or label the reference as unfitted.

**R7 — Every number traces to a source you can re-run.** Matrices come from shipped source or
a registry, never from memory. Palettes come from `window.BENCH`, never retyped.

**R8 — Declare post-hoc additions as post-hoc.** M7 was invented after seeing a result. It is
labelled that way permanently. Folding it into PROTOCOL.md as though it had been pre-registered
would be the exact dishonesty the protocol exists to prevent.

---

## 1. Metrics

Pre-registered in PROTOCOL.md: **M1** gain · **M2** rescue rate · **M3** fidelity cost ·
**M4** clipping · **M5** achromatic preservation · **M6** damage to already-safe palettes.

Added post-hoc, and the one that matters most:

**M7 — net pairs = rescued − broken**, over pairs at ΔE ≥ 20 to normal vision that collapse
below ΔE 10 under simulation. Rescue rate alone hides a correction that breaks more than it
fixes.

Known defect, unfixed: **M3 is computed over a uniform sRGB lattice and disagrees with realistic
content.** The lattice called v1 and v2 identical; on a real scene v2 distorted 34% more. A
uniform cube over-weights saturated corners that interfaces never use. Until a content-weighted
fidelity metric exists, quote M3 with that caveat or measure distortion on real content instead.

---

## 2. To evaluate a new correction

```
python field.py selfcheck          # the fast dE2000 must match the engine
python field.py run                # lattice-level, global transforms
python content.py                  # palette-level, 10 real palettes
python classes.py --all            # k-fold, per approach class, across severities
python visual.py                   # LOOK AT IT
```

`field.py` and `content.py` measure different things and are **not comparable row-for-row**.
A global matrix is defined per colour; a content-aware corrector is defined on a set. Scoring
the latter on a uniform lattice is meaningless because a lattice is not content.

## 3. To derive a new matrix

```
python optimise_net.py --type deutan --write
```

Fits M7 under simulator and palette holdout, and refuses to write anything that does not beat
both incumbents on data it never saw. It rejects its own output routinely — tritan v3 was fit
+15 and held-out +1, textbook overfit, correctly refused.

## 4. To ship

1. Declare the intent in `shipping.json` — which transform, and **why**, in prose.
2. Wire it into the four linear-light surfaces.
3. `python verify_shipped.py` — re-parses the matrices back out of every shipping source file,
   handles the C# GDI transpose so a copy-paste cannot silently ship a transposed matrix, and
   checks rows still sum to 1. **15/15 or it does not ship.**
4. `node --check` every edited JS file.
5. Render `visual.py` and look at it (R4).
6. Push, then confirm the live asset actually serves the new values.

**The desktop app is deliberately excluded.** `MagSetFullscreenColorEffect` applies its matrix
to gamma-encoded sRGB while every browser surface uses linear light — measured at deutan rescue
0.731 linear vs 0.696 sRGB. Same numbers, different correction. It needs its own sRGB-space
derivation and until then it stays on v1.

---

## 5. Current state, per deficiency

| | shipped | net (10 real palettes) | status |
|---|---|---|---|
| protan | **v3** | +47 (daltonize +31) | beats the field on net *and* distortion |
| deutan | **v3** | +65 (daltonize +39) | beats the field on net *and* distortion |
| tritan | **v2** | +17 (daltonize ~0) | positive but v3 overfit — **open** |

**Tritan is the open problem.** It has the fewest collapsing pairs to work with, the widest
spread between simulators (gain ranged +5.07 to +16.69 across models), and its v3 fit did not
generalise. It plausibly needs a different approach rather than a better matrix.

**Anomalous trichromacy is the bigger open problem.** Everything above was optimised at
severity 1.0 — full dichromacy — which is the *minority* case. Most colour-vision-deficient
people are anomalous trichromats. `classes.py` scores at 0.4 / 0.7 / 1.0; if a matrix optimised
for 1.0 is wrong at 0.4, it is wrong for most of the people it is for.

---

## 6. Approaches tried, and what happened

| approach | result |
|---|---|
| global matrix, grey-preserving | **shipped.** Best net when M7 is the objective |
| per-pixel gating on ΔE(c, S(c)) | **failed.** Optimiser declined to gate; the signal measures how far a colour *shifts*, not whether it *collides*, and collision is a property of pairs |
| content-aware (`fix_palette`) on design palettes | **wins** — roughly half the residual confusion at half the distortion, one output for all three types |
| content-aware on live/photographic content | **failed.** `fix_palette` moved 6 of 24 colours and returned `pass=False`; the LUT was a visual no-op |
| structural rank-2 limit | **disproved.** 360 random matrices beat every shipped matrix; the ceiling was the objective, not the algebra |

**Diagnostic worth keeping:** the singular values of `S∘M` are the spread surviving the
dichromat. Identity gives 1.000 / 0.833 / 0.106; the old shipped deutan v2 gave 1.000 / **0.765**
/ 0.091 — it compressed the very axis the viewer could still use. An aggressive matrix takes it
to 0.174. The third value is the lost dimension and no matrix restores it. **The second is the
one to protect.**
