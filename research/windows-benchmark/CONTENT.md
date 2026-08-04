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

## The honest limit of this result

`fix_palette` is a **design-time** tool. It rewrites a palette. Applying it to live content
requires quantising the frame, correcting the extracted palette, and mapping every pixel back
through the result — and that mapping step is where quality is lost and where cost lives.

**So this measures the ceiling of the content-aware approach, not a shipped implementation.**
The ceiling is high enough to be worth building toward: roughly half the remaining confusion at
half the distortion, with one correction for all three deficiency types.
