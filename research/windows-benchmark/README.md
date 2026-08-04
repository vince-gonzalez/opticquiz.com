# Windows Colour Filters vs. Model-Based Daltonisation — benchmark

Read **[PROTOCOL.md](PROTOCOL.md)** first. Metrics and stimulus sets were fixed there before
any measurement was taken, deliberately, so the analysis cannot be steered after the fact.

## Status

| Stage | State |
|---|---|
| Metrics + stimulus sets pre-registered | done |
| Analysis pipeline implemented | done |
| Recovery maths verified against a known injected transform | done — recovered to ±0.0003, RMS residual 0.29/255 |
| Baseline: OpticQuiz shipped daltonisation scored | done — `results/opticquiz-*.json` |
| Stage 0: does screen capture observe the Windows filter? | **done — NO.** Three independent software paths, all blind. See [FINDINGS.md](FINDINGS.md) |
| Stage 1: Windows transform recovered | **blocked in software.** Requires a camera or colorimeter (Stage 1-alt) |
| Stage 2: comparison | blocked on Stage 1 |

The Windows half is not measured and no claim is made about its *behaviour* anywhere in this
repository. What exists is the instrument (verified), our own transform scored by it, and a
measured negative result: **the Windows colour filters are not observable through GDI capture,
DXGI Desktop Duplication, or the public Magnification API.** That result is documented in
[FINDINGS.md](FINDINGS.md) and is publishable on its own.

## Baseline result — OpticQuiz daltonisation, 9×9×9 sRGB lattice, 1000 collapsing pairs

Matrices taken verbatim from `browser-extension/content.js` — the transform actually shipping
in the Chrome Web Store extension, applied in linear light.

| CVD type | M2 rescue rate | M1 mean gain | pairs made worse | M3 fidelity cost | M4 clip rate | M5 neutral shift | M6 Okabe–Ito mean | M6 worst |
|---|---|---|---|---|---|---|---|---|
| deutan | 74.0% | +10.12 | 112 / 1000 | 9.88 | 35.9% | 0.00 | +0.12 | −20.84 |
| protan | 94.1% | +16.35 | 25 / 1000 | 12.97 | 35.1% | 0.00 | +2.08 | −21.72 |
| tritan | 70.1% | +5.16 | 159 / 1000 | 13.27 | 22.5% | 0.00 | −6.57 | −30.54 |

Identity control scores exactly 0.000 on every metric, as it must.

### What this says about our own correction

**Working as intended:** 70–94% of colour pairs that collapse under simulation are separated
back above the discriminability threshold. Protan correction is the strongest by a wide margin.

**Neutral axis is perfectly preserved** — M5 is 0.000 for all three types. Greys stay grey,
which matters more for all-day use than any single-metric win.

**Three findings that do not flatter it, recorded here because they are true:**

1. **22–36% of the sRGB cube leaves gamut and is clamped.** Over a third of representable
   colours cannot survive the deutan and protan transforms without clipping. Clipped colours
   lose information silently — this is a real cost, not a rounding detail.

2. **The correction makes some pairs worse.** 112 of 1000 pairs under deutan and 159 under
   tritan end up *less* separated than with no correction at all. A global matrix cannot know
   what it is looking at, so it necessarily trades some pairs against others.

3. **It damages palettes that were already accessible.** Applied to the Okabe–Ito palette —
   designed specifically to survive colour-vision deficiency — the worst-affected pair loses
   20–30 ΔE2000 units of separation, and under tritan the mean effect is net negative (−6.57).

Finding 3 has a direct product consequence: on a site whose palette is already colourblind-safe,
switching the corrector on can make it *harder* to read. That is worth telling users plainly, and
it is an argument for content-aware correction over a fixed global matrix.

## Reproducing the baseline

```
python benchmark.py --transform identity                     --type deutan --lattice 9 --max-pairs 1000
python benchmark.py --transform transforms/opticquiz-deutan.json --type deutan --lattice 9 --max-pairs 1000
```

## Reproducing the negative result

Each probe reads the live filter state from the registry itself and **refuses to conclude
anything if both captures were taken in the same state**. Use Grayscale as the test filter —
a CVD filter is subtle enough to hide in noise, grayscale is unmissable.

```
python probe.py state                  # confirm what the filter is actually doing
python probe.py capture A              # then CHANGE the filter (Win+Ctrl+C)
python probe.py capture B
python probe.py compare                # GDI / BitBlt path

python dxgi_probe.py capture A         # then CHANGE the filter
python dxgi_probe.py capture B
python dxgi_probe.py compare           # DXGI Desktop Duplication path

python mag_probe.py                    # Magnification API — run with filter off, then on
```

All three return null on the recorded environment. See [FINDINGS.md](FINDINGS.md).

## Measuring Windows — remaining route

No software vantage point exists, so the transform can only be recovered by measuring light
leaving the display (PROTOCOL.md Stage 1-alt): photograph `patches.png` with fixed manual
camera settings, filter off and on, and solve from the ratio so the camera's own transfer
function cancels to first order.

```
python make_patches.py                 # generates the 746-patch calibration target
```

`recover.py` and `benchmark.py` are already built and verified for this — recovery recovers a
known injected matrix to ±0.0003 (RMS residual 0.29/255). Only the capture stage changes.

## Files

```
PROTOCOL.md        pre-registered method, metrics, and stated limits
FINDINGS.md        the measured negative result and what it does/doesn't mean
make_patches.py    generates the calibration target
probe.py           Stage 0  — GDI capture feasibility + live state reader
dxgi_probe.py      Stage 0b — DXGI Desktop Duplication feasibility
mag_probe.py       Stage 1-alt — read the transform from the Magnification API
recover.py         Stage 1  — least-squares transform recovery, reports residuals
benchmark.py       Stage 2  — metrics M1-M6
transforms/        transform definitions (ours are extracted from shipped source)
results/           computed metrics
```
