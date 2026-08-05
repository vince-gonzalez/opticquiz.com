# The shipped matrices win on the post-hoc metric and lose on the pre-registered one

**Recorded 5 August 2026.** This is the most serious methodological problem in this benchmark
and it is about our own process, not about Windows.

> **Read [SEVERITY-CLIFF.md](SEVERITY-CLIFF.md) alongside this.** Everything below compares
> matrices at severity 1.0. At the severities most colour-vision-deficient people actually have,
> no approach measured here - ours, daltonize, or content-aware - rescues a single pair. Which
> makes the v2-versus-v3 question below a dispute about the minority case.

`CONTENT.md:69` already noted that "two measures disagree. That is recorded, not resolved."
Resolving it is what produced this document. The disagreement is larger than that line implies,
and it goes the other way.

---

## What ships

`verify_shipped.py` confirms all five linear-light surfaces carry, per `shipping.json`:

| deficiency | shipped matrix |
|---|---|
| protan | **v3** |
| deutan | **v3** |
| tritan | v2 (v3 was refused as overfit) |

## The pre-registered metrics, on the shipped matrices

M1–M6 were fixed in `PROTOCOL.md` **before any measurement**. Population: 9³ sRGB lattice,
1000 pairs that are distinct to normal vision (ΔE2000 ≥ 20) and collapsed under simulation
(ΔE2000 < 10).

### protan

| matrix | M1 gain | pairs made worse | M2 rescue | M3 fidelity cost | M4 clip | M6 Okabe–Ito |
|---|---|---|---|---|---|---|
| v1 | +16.35 | 25 | 94.1% | 12.965 | 35.1% | +2.08 |
| v2 | **+17.91** | **23** | **95.5%** | 12.989 | **30.7%** | +1.97 |
| **v3 — shipped** | +11.41 | **128** | **76.6%** | 12.228 | **52.8%** | +0.09 |

### deutan

| matrix | M1 gain | pairs made worse | M2 rescue | M3 fidelity cost | M4 clip | M6 Okabe–Ito |
|---|---|---|---|---|---|---|
| v1 | +10.12 | 112 | 74.0% | 9.881 | 35.9% | +0.12 |
| v2 | **+11.99** | **61** | **87.4%** | 9.892 | **33.1%** | **+0.93** |
| **v3 — shipped** | +4.99 | **193** | **58.6%** | 9.356 | 40.5% | **−3.10** |

**On every pre-registered separability metric, for both deficiencies, the shipped matrix is
the worst of the three.** Deutan rescue falls from 87.4% to 58.6%. Protan clipping rises from
30.7% to 52.8%. Deutan v3 also turns the Okabe–Ito result negative (−3.10), meaning it now
actively damages the one palette designed to survive colour-vision deficiency, where v2
improved it.

## Why it was shipped anyway

On **M7 — net pairs (rescued − broken) over 10 real palettes** — v3 wins decisively.
From `shipping.json`, verbatim:

- protan v3: net **+47** vs v2 +30 and daltonize +31, at lower distortion (10.51 vs 13.80 /
  14.61). Held out on 4 unseen palettes under 3 unseen simulators: +25 vs v2's +20.
- deutan v3: net **+65** vs v2 +31 and daltonize +39, at lower distortion (9.51). **Breaks 11
  pairs where v2 breaks 53.** Held out: +22 vs v2's +5.

Note the inversion on that last figure. On 10 real palettes v3 deutan breaks 11 pairs and v2
breaks 53. On the 9³ lattice v3 breaks 193 and v2 breaks 61. Same two matrices, same
thresholds, opposite verdict.

## Ruled out: this is not a filter artifact

The obvious explanation would be that the two populations apply different thresholds, making
the comparison meaningless. They do not. `benchmark.py:22-23` sets `COLLAPSE = 10.0` and
`DISTINCT = 20.0`, and `collapsing_pairs()` applies both — the same ΔE2000 ≥ 20 distinctness
requirement that was added to the content measurement after the false alarm described in
`CONTENT.md`. The populations differ in **which colours are sampled**, and in nothing else:

- **Lattice** — uniform 9³ sampling of the sRGB cube. Every region of colour space weighted
  equally, including regions no interface ever uses.
- **Palettes** — 10 real palettes (matplotlib, D3, Tableau, ColorBrewer and similar). Weighted
  toward the colours software actually displays, and far sparser.

## The methodological problem

M7 is **post-hoc**. `CONTENT.md` declares it as such: it was not in `PROTOCOL.md`, it was added
after seeing that result. The sequence was:

1. Pre-register M1–M6.
2. Measure.
3. Find that the candidate matrix loses on the pre-registered set.
4. Introduce M7.
5. Ship on M7.

That is the exact failure `PROTOCOL.md` exists to prevent, and declaring M7 post-hoc in the
document does not undo it. A metric chosen after seeing which one favours the preferred answer
carries almost no evidential weight, however reasonable it looks in isolation.

**The strongest thing in v3's favour is not M7 itself — it is the held-out result.** v3 was
tested on 4 palettes and 3 simulators it was never fitted to, and still won (+25 vs +20 protan,
+22 vs +5 deutan). That is real cross-validation and it is not nothing. It is also the reason
v3 tritan was correctly *refused*: held-out +1 against v2's +7 exposed it as overfit, on the
same evidence that supported v3 protan and deutan.

## What is genuinely unknown

**Which population predicts human performance.** Nothing in this repository can answer that.

- If real interface colours are what matter, v3 is the right choice and the lattice is
  measuring regions of colour space nobody looks at.
- If the lattice is a fair sample of what a user encounters — photographs, video, games, images,
  all of which do range across the cube — then we have shipped a matrix that rescues 58.6% of
  collapsed deutan pairs where an available alternative rescues 87.4%.

Both readings are consistent with every number above. Choosing between them requires observers,
not metrics, which is the same conclusion the rest of this work keeps arriving at.

## What is NOT claimed here

- Not that v3 is wrong. It may well be the better matrix; the held-out result is genuine evidence.
- Not that M7 is a bad metric. Net pairs on realistic palettes is arguably *more* relevant than
  uniform lattice sampling. The objection is to when it was introduced, not to what it measures.
- Not that the earlier documents concealed anything. `CONTENT.md` declared M7 post-hoc and
  flagged the disagreement in a sentence. This document is that sentence, resolved.

## What would settle it

1. **Pre-register the population, not just the metric.** If realistic palettes are the
   population of interest, that has to be fixed in the protocol before measurement, with the
   lattice reported alongside rather than dropped.
2. **Report both, always.** Any future claim about a matrix states its lattice *and* palette
   result. A matrix that wins one and loses the other is a trade-off to be described, not a
   winner to be announced.
3. **Observers.** The only evidence that can adjudicate.

## Open product decision

Not a decision for this document: **deutan is currently shipping the matrix that scores 58.6%
rescue where v2 scores 87.4%**, on the strength of a post-hoc metric and a held-out result on
10 palettes. That is a defensible choice and it is also reversible in one commit across five
surfaces. It should be made deliberately rather than left standing because it was made once.
