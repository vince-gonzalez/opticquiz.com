# Finding: the Windows colour filters are not observable through any public software interface

**Status: measured, reproducible, negative result.** Recorded 4 August 2026.

Windows 11 ships colour filters for protanopia, deuteranopia and tritanopia
(Settings → Accessibility → Colour filters). They are plausibly the most widely deployed
colour-vision assistive transform in existence — present on every Windows installation.
Microsoft documents the feature's purpose but publishes no specification of the transform.

We set out to measure it, in order to compare it against a published daltonisation method
(DOI 10.5281/zenodo.21310578). **We could not, and the reason is the finding.**

---

## Result

Three independent software paths were tested. All three are blind to the filter.

| Path | What it is | Result |
|---|---|---|
| GDI / BitBlt (`PIL.ImageGrab`) | The conventional screenshot path | **Blind.** 0.0000 of pixels changed |
| DXGI Desktop Duplication (`dxcam`) | What OBS, Teams screen-share and remote-desktop tools use | **Blind.** 0.0000 of pixels changed |
| `MagGetFullscreenColorEffect` | The public API for a full-screen colour effect | **Identity** returned while a filter was active |

Not "small differences" — the captured frames were **byte-identical** while the screen was
visibly grey to the human sitting in front of it.

### Method

The obvious failure mode of a null result like this is an experiment that never actually
changed anything. Two controls guard against it:

1. **Filter state was read from the registry at the moment of each capture**
   (`HKCU\Software\Microsoft\ColorFiltering`, values `Active` and `FilterType`) and stamped
   into a sidecar file. The comparison tool refuses to draw any conclusion when both captures
   share a state. An earlier run of this experiment was invalid for exactly this reason — the
   filter was on for both captures — and the tooling was rebuilt so it cannot happen silently.

2. **Grayscale (`FilterType = 0`) was used as the primary probe**, not a colour-vision
   filter. A CVD filter is a subtle shift that could hide in noise; grayscale is unmissable.
   The operator confirmed visually that the display went grey. The result was then
   **confirmed with Deuteranopia (`FilterType = 3`)**, the filter the benchmark actually
   cares about, on two idle displays — also null.

3. **Content change is distinguished from a colour transform.** A colour filter is a
   function: one input colour maps to exactly one output colour. On a multi-monitor run, one
   display showed 27.3% of pixels changed — but 97.4% of its input colours mapped to *more
   than one* output colour, which no transform can do. It was a video, a chat client and the
   operator's own terminal updating between captures. `compare` now applies this test and
   excludes such displays automatically; before it did, a single busy screen was enough to
   flip the verdict to a false positive.

For `MagGetFullscreenColorEffect`, the control reading was verified first: with the filter
**off**, the API returns exact identity, as it must. With grayscale **on**, it still returns
exact identity.

Verified state transitions for the capture tests:

```
GDI       capture A: Active=1 FilterType=0    capture B: Active=0 FilterType=0   (grayscale)
DXGI      capture A: Active=0 FilterType=0    capture B: Active=1 FilterType=0   (grayscale)
GDI x3mon capture A: Active=1 FilterType=3    capture B: Active=0 FilterType=3   (deuteranopia)
```

The three-monitor deuteranopia run: monitors 0 and 2 idle, both **0.0000** changed. Monitor 1
excluded — it held a video, a chat client and a live terminal.

The bottom 80 rows of each display were excluded from statistics: in the first (invalid) run,
**every** apparently-changed pixel was the taskbar clock advancing by one minute.

### Environment

```
OS      Microsoft Windows 11 Pro, build 26200 (10.0.26200)
GPU     AMD Radeon RX 5700 XT, driver 32.0.21045.1000 (2026-07-22)
Display 3 x 1920x1080; primary at (0,0); tests run on the primary
```

---

## Interpretation

The colour filters are applied **downstream of desktop composition** — after the point where
any documented capture API observes the frame. This is consistent with Night Light, which is
likewise invisible to screenshots, and points to the transform living in the display output
pipeline (DWM output stage or GPU output CSC/LUT) rather than in the composed desktop image.

### Consequences that are not obvious

- **No software tool can audit these filters.** Not a testing harness, not an accessibility
  checker, not a third-party benchmark. Their behaviour is unverifiable from user space.
- **A screenshot from a colour-filter user does not show what that user saw.** If a
  colour-blind person files a bug report with a screenshot, or shares their screen for
  support, the recipient sees the *uncorrected* image. The assistive transform silently does
  not travel with the evidence.
- **Screen recordings and remote-desktop sessions are similarly unaffected**, which means the
  filter cannot be demonstrated to anyone remotely.
- **The feature cannot be independently evaluated for efficacy** by anyone outside Microsoft.
  Whether it helps, and how much, is currently unfalsifiable from the outside.

### What this does NOT claim

- It does not claim the filters are ineffective. It claims they are unmeasurable by these
  means. Those are different, and conflating them would be exactly the overreach this
  document exists to avoid.
- It does not claim *no* interface exists — only that the three public paths tested return
  nothing. A private or undocumented interface may well exist.
- It does not generalise beyond the environment above. A different GPU vendor, driver, or
  Windows build could behave differently, and the test is cheap to repeat.
- Two of three displays were measured clean (primary and one secondary); the third could not
  be measured because it was in active use. No per-display difference was observed.

---

## Reproducing this

```
python probe.py state                  # show live filter state
python probe.py capture A              # then CHANGE the filter in Settings
python probe.py capture B
python probe.py compare                # GDI path

python dxgi_probe.py capture A         # then CHANGE the filter
python dxgi_probe.py capture B
python dxgi_probe.py compare           # DXGI path

python mag_probe.py                    # Magnification API, filter off then on
```

Each tool reads the live filter state itself and refuses to interpret a same-state pair.

---

## What remains

Measuring the transform now requires measuring **light leaving the display** — a camera or a
colorimeter — because no software vantage point exists. That is PROTOCOL.md Stage 1-alt, and
it is the only remaining route to the comparison this benchmark was originally built for.

The comparison metrics, the pre-registered protocol, and the analysis pipeline are already
built and verified (recovery maths recovers a known injected matrix to ±0.0003). The baseline
for our own shipped daltonisation is already computed, including three results that do not
flatter it. See `README.md`.
