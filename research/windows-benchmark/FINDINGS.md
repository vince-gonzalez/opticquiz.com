# Finding: the Windows colour filters are not observable through any public software interface

**Status: measured, reproducible, negative result.** Recorded 4 August 2026.

> **Scope note.** That colour filters do not appear in screenshots was already known
> informally (see Prior art). What is measured here is the extent — three independent
> software paths, including the public colour-effect API — and what follows from it: the
> transform cannot be recovered, so the feature cannot be independently evaluated.

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

### Prior art — what was already known

**The screenshot behaviour is not new, and this document originally implied it was.** That
was an overreach, caught in review and corrected here. Third-party accessibility guides
already state that Windows colour filters apply system-wide *except* to screenshots and
screen sharing — for example [rgblind.com's colour-blind gaming guide](https://rgblind.com/blog/color-blind-gaming-guide),
which notes the filters leave screenshots and screen shares unaffected. Users have evidently
noticed and written it down.

What does not appear in any source located: the **specific transform coefficients** for the
deuteranopia, protanopia and tritanopia filters. Microsoft documents the feature and the
[`MagSetFullscreenColorEffect`](https://learn.microsoft.com/en-us/windows/win32/api/magnification/nf-magnification-magsetfullscreencoloreffect)
API, including example identity and grayscale matrices, but not the coefficients its own
accessibility filters use. Absence from a search is not proof of absence, and this is stated
as "not located" rather than "does not exist".

### What this work adds

- A **measured, quantified, reproducible** result — byte-identical frames across three
  independent paths — where previously there was an informal observation in user guides.
- The **`MagGetFullscreenColorEffect` null**: the public full-screen colour-effect API returns
  exact identity while a colour filter is active. No source located reports this, and it is
  the result that closes off the obvious programmatic workaround.
- **Tooling that cannot fool itself**: filter state read from the registry at capture time,
  same-state pairs refused, and a function test that separates a genuine colour transform
  from content that merely changed on screen.

### Consequences

- **No software tool can audit these filters.** Not a testing harness, not an accessibility
  checker, not a third-party benchmark. Verified for the three paths tested.
- **A screenshot from a colour-filter user does not show what that user saw.** Filing a bug
  report with a screenshot, or sharing a screen for support, transmits the *uncorrected*
  image. (Already known — see prior art above.)
- **The feature's efficacy cannot be independently evaluated** from outside, because the
  transform cannot be recovered by software. This is the consequence that motivated the
  benchmark and now blocks it.

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
