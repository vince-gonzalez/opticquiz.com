# OpticQuiz Colorblind Eye — the one-line accessibility widget

A floating eye button any website can add in one line. A visitor clicks it to cycle a
live color **correction** for each type of color-vision deficiency — protanopia,
deuteranopia, tritanopia, then a balanced pass — so they can *distinguish* colors that
normally collapse for them. Then off. Nothing to install; it works on the live page.

## Add it to any site
```html
<script src="https://opticquiz.com/widget/eye.js" defer></script>
```
That's it. The eye appears bottom-right.

## How it works
The page's colors are re-mapped with a **daltonization** transform (an SVG
`feColorMatrix` applied in linear RGB), computed from the OpticQuiz engine's Machado
(2009) color-vision model plus Fidaner error-redistribution. Instead of *simulating*
what a colorblind person sees, it shifts the color differences their vision compresses
into channels they *can* perceive.

Demo: [`demo.html`](./demo.html) — a pretend dashboard where red-vs-green carries meaning.

## Honest scope
Correction strongly improves color separation (a red/green pair that a deuteranope sees
at ΔE ~8 becomes ~29 after correction), but it is an **aid, not a guarantee** — no
single transform resolves every case, and it recolors the whole page, images included.
It does not replace designing with colorblind-safe colors in the first place (see the
[checker](https://opticquiz.com/checker/)). Method:
https://doi.org/10.5281/zenodo.21310578 · MIT licensed.
