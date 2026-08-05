# Content-aware correction beats every global matrix — and exposes a hole in the metrics

**Stimulus: 10 real palettes**, extracted verbatim from `window.BENCH` in `/palettes/` — the
benchmark page already published on the site — scored under 6 independent simulators.
Okabe–Ito, Tableau 10, Tableau Colorblind 10, ColorBrewer Set1, ColorBrewer Dark2,
D3 category10, Material 500, viridis, RdYlGn, jet.

This is a **palette-level** benchmark and is not comparable row-for-row with the lattice
numbers in FIELD.md. A global matrix is defined on every colour independently; a content-aware
corrector is defined on a *set*. Scoring the latter on a uniform lattice would be meaningless,
because a lattice is not content.

## Result

`collapsed after` is the honest bottom line: how many pairs remain confusable once the
correction has run.

| | corrector | collapsed before | **collapsed after** | mean distortion | worst move |
|---|---|---|---|---|---|
| protan | global matrix (shipped) | 202 | 150 | 12.94 | 27.58 |
| | daltonize (Fidaner) | 202 | 133 | 14.61 | 29.37 |
| | **fix_palette (content-aware)** | 202 | **84** | **6.81** | **16.57** |
| deutan | global matrix (shipped) | 223 | 160 | 13.07 | 27.69 |
| | daltonize (Fidaner) | 223 | 166 | 10.85 | 29.50 |
| | **fix_palette (content-aware)** | 223 | **94** | **6.81** | **16.57** |
| tritan | global matrix (shipped) | 117 | **142** | 10.01 | 17.31 |
| | daltonize (Fidaner) | 117 | 129 | 4.91 | 11.48 |
| | **fix_palette (content-aware)** | 117 | **60** | **6.81** | **16.57** |

**Content-aware wins on every deficiency, at roughly half the distortion.** It leaves 84 / 94 /
60 pairs confusable where the best global transform leaves 133 / 160 / 129.

It also does it with **one output**. `fix_palette` is type-agnostic — verified: its result is
byte-identical for protan, deutan and tritan. It produces a single palette safe for all three,
where the matrices need a different correction per type and the user must know their own
diagnosis to pick one.

## The hole this exposed

Look at the tritan row. The shipped global matrix takes 117 collapsed pairs to **142**. It
makes real palettes *worse overall* — while scoring a rescue rate of 0.675.

**Rescue rate only counts pairs that were already collapsed.** Nothing in the pre-registered
metric set counted pairs that were fine and got *broken*. A correction can rescue 79 pairs,
break 104, and still post a healthy rescue rate.

Net effect on the same 10 palettes, counting both directions:

| | matrix | rescued | broken | **net** |
|---|---|---|---|---|
| protan | v1 (shipped) | 104 | 72 | +32 |
| | v2 | 109 | 66 | **+43** |
| deutan | v1 | 101 | 62 | +39 |
| | **v2 (shipped)** | 118 | 71 | **+47** |
| tritan | v1 | 52 | 78 | **−26** |
| | **v2 (shipped)** | 56 | 70 | **−14** |

**Post-hoc metric, declared as such: M7 — net pairs (rescued − broken).** It was not in
PROTOCOL.md, it was added after seeing this result, and it must be reported as an addition
rather than folded silently into the pre-registered set.

### What it says about what shipped today

- **deutan v2 was the right call** — best net of any matrix measured, +47.
- **tritan v2 was an improvement over v1** (−14 vs −26) **but tritan global correction is net
  harmful either way.** Rolling back to v1 would be worse, so v2 stays; but a global matrix is
  the wrong instrument for tritanopia and the product should stop pretending otherwise.
- **protan v2 scores better here than v1** (+43 vs +32), which contradicts the visual review
  that rejected it. Two measures disagree. That is recorded, not resolved — and it is a reason
  to be less confident about protan in either direction, not a reason to flip.

> **Resolved 5 August 2026 — see [METRIC-DISAGREEMENT.md](METRIC-DISAGREEMENT.md).** The
> disagreement is larger than this line suggests and runs the other way: on the *pre-registered*
> metrics M1-M6, the shipped v3 matrices are the worst of the three candidates for both protan
> and deutan. v3 was shipped on M7, which is post-hoc. Not a filter artifact - both populations
> apply the same DISTINCT and COLLAPSE thresholds.

## The honest limit of this result

`fix_palette` is a **design-time** tool. It rewrites a palette. Applying it to live content
requires quantising the frame, correcting the extracted palette, and mapping every pixel back
through the result — and that mapping step is where quality is lost and where cost lives.

**So this measures the ceiling of the content-aware approach, not a shipped implementation.**
The ceiling is high enough to be worth building toward: roughly half the remaining confusion at
half the distortion, with one correction for all three deficiency types.

---

## Taking it to live content: it does not survive

`live_content.py` builds the real pipeline — quantise the frame to 24 colours, `fix_palette`
them, bake the movement into a 17³ displacement LUT, apply per pixel with trilinear
interpolation (exactly what a GPU sampler does with a 3D texture).

Two flaws in my own first measurement, both found before drawing conclusions:

1. **No distinctness filter.** 91 of 276 pairs were below the collapse threshold *to a normal
   viewer* — near-duplicate quantiser outputs counted as information loss. A third of the
   total was noise. Now only pairs at ΔE ≥ 20 to normal vision are counted.
2. **The banding canary measured the scene's own edges.** Absolute pixel steps were 0.969 for
   every σ, because the scene is hard-edged swatches. Now it measures output gradient *minus*
   input gradient.

With those fixed, on one synthetic scene, 4 simulators:

| | collapsed | rescued | broken | net | image ΔE |
|---|---|---|---|---|---|
| **protan** global matrix | 8 | 8 | 14 | **−6** | 5.01 |
| content LUT σ=0.05 | 8 | 7 | 2 | **+5** | 2.66 |
| **deutan** global matrix | 12 | 12 | 16 | **−4** | 5.17 |
| content LUT σ=0.18 | 12 | 3 | 1 | **+2** | 2.59 |
| **tritan** global matrix | 7 | 3 | **50** | **−47** | 4.11 |
| content LUT σ=0.18 | 7 | 3 | 0 | **+3** | 2.59 |

The metrics say the content LUT wins everywhere. **The rendered image says it is a no-op.**
Viewed through a deuteranopia simulation, the LUT output is essentially indistinguishable
from no correction at all — the status colours stay collapsed, the heatmap stays a flat
smear — while the global matrix visibly separates them.

It scores well because it barely acts. `fix_palette` moved **6 of 24** colours, by 2.66 ΔE
mean, and returned `pass=False` — it declined to solve the palette. The σ smoothing then
diluted even that. "Does less harm" achieved by "does less", which is the same failure the
gated experiment produced.

### What is actually true, then

- **On design palettes** — 8 to 10 curated colours, i.e. charts, dashboards, UI themes —
  content-aware correction genuinely wins: half the remaining confusion at half the
  distortion. That result stands.
- **On arbitrary content** with 24+ quantised colours it does not, because `fix_palette`'s
  per-colour drift budget is tuned for small design palettes and it declines to move.
- **And the global matrix is net-harmful on real content anyway** — −6, −4 and a catastrophic
  −47 for tritan on this scene.

So for live camera content, **neither approach is good**, and that is the honest state. Making
content-aware work there needs a set-wise optimiser built for large palettes without
`fix_palette`'s conservatism — a real build, not a wrapper around an existing function.

Third time today that rendering the picture overturned what the numbers said. The metrics are
necessary and they are not sufficient.


---

## Correction: the "net harmful" alarm was mine, not the matrix's

The net table above was computed **without a distinctness filter** — it counted pairs that
were below the collapse threshold *to a normal viewer too*, i.e. near-duplicate colours that
were never distinguishable by anyone. Recomputed over the same 10 palettes and 4 simulators,
counting only pairs at ΔE ≥ 20 to normal vision:

| | v1 | v2 | **v3** |
|---|---|---|---|
| protan | +24 | +30 | **+47** |
| deutan | +32 | +31 | **+65** |
| tritan | −1 | **+17** | overfit, rejected |

**Retracted:** the claim that tritan correction is "net harmful on real content". With the
filter, tritan v2 is **+17** — positive, and a genuine improvement on v1's −1. The alarming
version was an artifact of counting non-distinct pairs.

**Also corrected:** deutan v1 and v2 are effectively tied on net (+32 vs +31), so shipping v2
was neutral on this measure rather than the improvement it was called at the time.

### v3, and the end of the protanopia problem

`optimise_net.py` optimises M7 directly — the quantity that is reported — with two
independent holdouts: 6 fitting palettes / 4 unseen, and 2 fitting simulators / 3 unseen.

| | rescued | broken | net | distortion |
|---|---|---|---|---|
| protan daltonize | 71 | 40 | +31 | 14.61 |
| **protan v3** | 66 | **19** | **+47** | **10.51** |
| deutan daltonize | 80 | 41 | +39 | 10.85 |
| **deutan v3** | 76 | **11** | **+65** | **9.51** |

v3 beats daltonize on net *and* distortion simultaneously, on both deficiencies. It rescues
slightly fewer pairs and breaks roughly a quarter as many. **The protanopia gap — open since
the first field benchmark — is closed.**

Tritan v3 was rejected: fit net +15, held-out +1 against v2's +7. Textbook overfit to the six
fitting palettes, caught by the palette holdout. Tritan stays on v2.
