# OpticQuiz Colorblind Eye — the one-line accessibility widget

A floating eye button any website can add in one line. A visitor opens it and picks a
live color **correction** for their type of color-vision deficiency — Recommended,
Deuteranopia, Protanopia or Tritanopia — so they can *distinguish* colors that normally
collapse for them, with a strength slider and Off. Nothing to install; it works on the
live page. It also offers them the browser extension, so the correction follows them off
your site.

## Add it to any site
```html
<script src="https://opticquiz.com/widget/eye.js" defer></script>
```
That's it. The eye appears bottom-right.

## How it works
The page's colors are re-mapped with a **daltonization** transform computed in linear
sRGB from the OpticQuiz engine's Machado (2009) color-vision model plus Fidaner
error-redistribution. Instead of *simulating* what a colorblind person sees, it shifts
the color differences their vision compresses into channels they *can* perceive.

v2 recolors **computed styles, not pixels**. It reads each element's color properties and
writes corrected values back through one generated stylesheet, which has two deliberate
consequences: photographs, video and canvas are never touched, because raster content is
never read or written; and nothing is filtered, so `position:fixed` and `sticky` behave
exactly as you wrote them.

Colors are split into two jobs. **Text** is forced to pure black or pure white, whichever
contrasts better against the corrected background behind it — text carries its meaning in
its glyphs, not its hue. **Everything else** (backgrounds, borders, outlines, SVG fill and
stroke) gets the full matrix, because those surfaces carry the color-coded information and
no text-contrast rule applies to them.

Demo: [`demo.html`](./demo.html) — a pretend dashboard where red-vs-green carries meaning.

## Modes & privacy
Opening the eye shows a menu: **Recommended** (helps all types — the default for people
who don't know their type), then Deuteranopia, Protanopia, Tritanopia, and Off. The
choice is remembered per browser via `localStorage`. **Zero tracking, no network, no
identifiers** — nothing leaves the page. Keyboard accessible (Escape closes), respects
`prefers-reduced-motion`.

## Honest scope
Correction strongly improves color separation (a red/green pair that a deuteranope sees
at ΔE ~8 becomes ~29 after correction), but it is an **aid, not a guarantee** — no
single transform resolves every case. It does not replace designing with colorblind-safe
colors in the first place (see the [checker](https://opticquiz.com/checker/)).

**What it guarantees.** Choosing the better of black and white is worst at a background
relative luminance of 0.179, where the two tie at **4.58:1** — so every run of text clears
WCAG AA *by construction*, not by spot-check. Verified across 636,056 backdrop colors
(worst observed 4.583:1) and across 14 pages of this site (1,518 text elements, none below
AA in any mode). Reproduce it yourself:

```
node tools/verify-widget.js
```

**Known limits (v2).** Where text sits on a `url()` bitmap the ratio cannot be proven, so
the widget does not pretend: it falls back to a luminance-preserving correction that leaves
the author's own contrast ratio intact (measured drift 0.0532:1, which is 8-bit rounding).
Gradients *are* resolved, since luminance is monotone between adjacent color stops. Where
the operating system's own contrast setting is active (`forced-colors`), the widget stands
down entirely rather than fighting it. On a very large DOM it stops rather than stalling the
page. Test on your site before shipping to production.

Method: https://doi.org/10.5281/zenodo.21310578 · MIT licensed.
