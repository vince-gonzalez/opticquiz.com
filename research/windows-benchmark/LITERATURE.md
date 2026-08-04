# What the field already knows — and what is therefore not ours to claim

Written after building most of this repo without reading it first. That was the most
expensive mistake of the project: several results here are independent replications of
published work, and one of them — the severity finding — has been established elsewhere with
**human observers**, which is strictly stronger evidence than our simulations.

This file exists so nobody re-derives it a third time.

---

## Established, with citations

| Claim | Status | Source |
|---|---|---|
| Daltonization: simulate → compute error → redistribute into visible channels | Established, ~2005 | Fidaner, Lin & Wang (Stanford); shipping as the `daltonize` package we benchmark |
| CVD simulation matrices | Established | Brettel, Viénot & Mollon 1997; Viénot 1999; Machado, Oliveira & Fernandes 2009 |
| Content-aware / naturalness-preserving recolouring for dichromats | Established, ~2005–2008, still active | Rasche, Geist & Westall 2005; [Kuhn, Oliveira & Fernandes](https://link.springer.com/chapter/10.1007/978-3-319-09363-5_11); [range-based naturalness preservation, 2022](https://link.springer.com/article/10.1007/s00371-022-02549-4) |
| Content-dependent daltonization covering **anomalous trichromacy** | Established | [A Content-Dependent Naturalness-Preserving Daltonization Method for Dichromatic and Anomalous Trichromatic CVD](https://www.researchgate.net/publication/276455941_A_Content-Dependent_Naturalness-Preserving_Daltonization_Method_for_Dichromatic_and_Anomalous_Trichromatic_Color_Vision_Deficiencies) |
| **Static transformations tuned for dichromacy neglect the more common mild/moderate cases** | Established, **validated with 10 CVD observers** | [Customized daltonization: adaptation for observers with different severities of CVD](https://link.springer.com/article/10.1007/s10209-021-00847-7), Springer 2021 |
| Real-time, severity-personalised correction with an in-app severity test | Established, 2025 | [Hue4U: Real-Time Personalized Color Correction in AR](https://arxiv.org/html/2509.06776) — FM-100-style 48-cap test on Meta Quest 3, N=10 |
| Formal evaluation protocols for daltonization | Established | SaMSEM / ViSDEM (visual search and sample-to-match) |

**Our SEVERITY.md finding is a replication of the 2021 Springer result.** They had human
observers; we have simulations. Theirs is the better evidence and ours must cite it, not
compete with it.

**Our content-aware result is a replication** of a research line running since 2005.

---

## What survives as genuinely ours

1. **The Windows colour-filter null.** Three independent software paths — GDI, DXGI Desktop
   Duplication, and the public Magnification API — all blind to a filter shipped on every
   Windows machine. Nothing in this literature addresses it. See FINDINGS.md.

2. **A reproducible, pre-registered comparison harness.** The papers publish methods and
   their own metrics on their own stimuli. This repo publishes metrics fixed before
   measurement, k-fold with simultaneous simulator *and* stimulus holdout, an identity control
   that must score exactly zero, and `verify_shipped.py`, which re-parses the matrices back out
   of every shipping source file so a published benchmark cannot drift from the installed
   product. That combination is not something we located elsewhere.

3. **Distribution.** None of the cited authors shipped to npm, PyPI, two extension stores, a
   CDN widget and a REST API. A method in a paper helps nobody who is not reading the paper.

---

## The gap the literature itself names

Hue4U's stated criticism of prior work:

> *"...require prior clinical diagnosis, leaving many undiagnosed users without solutions."*

They solve it by building a 48-cap FM-100 test into a headset. **OpticQuiz already ships the
measurement half on the open web** — `/d15/` (Farnsworth D-15, confusion-vector analysis
yielding axis *and* total error score), `/color/` (severity band), `/sat/` (per-axis saturation
thresholds) — free, no account, no clinic.

And their stated limitations are:

- small sample (N=10)
- laboratory conditions only
- no longitudinal data
- no qualitative user experience data

Those are exactly the things a free, public, already-trafficked website with a consented impact
archive is positioned to produce, and a lab study is not.

**So the contribution available here is not a better algorithm. It is the evidence base the
field says it lacks, plus the closed loop that gets a measured severity into a corrector
without a clinical diagnosis.**

---

## Measured here: severity scaling works, and stays a matrix

`M(s) = I + s·(M − I)`, with `s` from the user's own test result.

| | severity | full-strength net | scaled net | distortion |
|---|---|---|---|---|
| protan | 0.7 | −1 | **+3** | 10.54 → **7.81** |
| protan | 0.4 | −2 | **0** | 10.54 → **4.80** |
| deutan | 0.7 | −2 | −2 | 9.53 → **6.69** |
| tritan | 0.7 | −4 | **+6** | 9.98 → **6.67** |
| tritan | 0.4 | 0 | 0 | 9.98 → **3.66** |

Every cell equal or better on net, at half to a third of the distortion. And because a convex
blend of two matrices is a matrix, it still fits in an `feColorMatrix` — it ships to every
surface, including the desktop app, with no architecture change.

This is **implementing published best practice**, not discovering it. The citation belongs to
the 2021 Springer paper.

---

## Before the glasses work

Colour-boosting lenses have their own literature — notch-filter designs, and independent
efficacy studies of EnChroma specifically. **Read it before measuring anything.** Repeating
this mistake with hardware would cost money as well as time.
