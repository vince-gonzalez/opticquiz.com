# opticquiz-eye

[![npm version](https://img.shields.io/npm/v/opticquiz-eye)](https://www.npmjs.com/package/opticquiz-eye)
[![npm downloads](https://img.shields.io/npm/dm/opticquiz-eye)](https://www.npmjs.com/package/opticquiz-eye)

A **one-line colorblind accessibility widget**. Adds a floating eye that lets a visitor
re-color your page live so they can *distinguish* colors — for their type of color-vision
deficiency, or a "Recommended" all-types correction. Zero dependencies, **zero tracking**,
SSR-safe.

It **corrects** (daltonization computed in linear sRGB), it doesn't just simulate — the goal
is to help the visitor *see*. Method: https://doi.org/10.5281/zenodo.21310578

## What changed in 2.0

1.x applied one SVG filter over the whole page. That recolored photographs, made the wrapper a
containing block for `position:fixed` and `sticky` descendants, and — because the transform
moves lightness as well as hue — could push text below WCAG AA. On opticquiz.com's own twelve
real text/background pairs it pushed **eight** below AA, worst 3.22:1 on a pair that passes at
4.80:1 uncorrected.

2.0 recolors **computed styles, not pixels**:

- **Photographs, video and canvas are never touched** — raster content is never read or written.
- **Nothing is filtered**, so `position:fixed` and `sticky` behave exactly as you wrote them.
- **Text is forced to pure black or white**, whichever reads better against the corrected
  backdrop behind it. The worst case is a backdrop at relative luminance 0.179, where the two
  tie at **4.58:1** — so every text run clears WCAG AA *by construction*, not by sampling.
  Verified across 636,056 backdrop colors (worst observed 4.583:1).
- **Graphics take the full correction** — backgrounds, borders, outlines, SVG `fill` and
  `stroke` — because that is where color-coded information lives. On pairs a dichromat genuinely
  cannot separate, mean CIEDE2000 goes from 1.9 to between 10.8 and 21.6.

This is a breaking change in appearance: your text colors are overridden while a mode is on.
That is the point — a page that encodes meaning in text color alone was never conveying it to
this visitor. The `mount()` API is unchanged.

**Limits, stated plainly.** Where text sits on a `url()` bitmap the contrast ratio cannot be
proven, so the widget preserves the author's own ratio rather than guessing. Where the
operating system's own contrast setting is active (`forced-colors`), it stands down and leaves
the OS in charge. On a very large DOM it stops rather than stalling the page.

## Use it

**Bundler / framework (React, Vue, Svelte, Next, …):**
```js
import { mount } from "opticquiz-eye";
mount(); // call once in the browser, e.g. a top-level effect
```
```jsx
// React
import { useEffect } from "react";
import { mount } from "opticquiz-eye";
export default function A11y() { useEffect(() => { mount(); }, []); return null; }
```

**No build step?** Skip npm entirely and use the CDN one-liner:
```html
<script src="https://opticquiz.com/widget/eye.js" defer></script>
```

## Behavior
Opening the eye shows a menu: **Recommended** (default, for people who don't know their
type), Deuteranopia, Protanopia, Tritanopia, Off. The choice is stored in the visitor's
own `localStorage`. Keyboard accessible; respects `prefers-reduced-motion`.

## Honest scope
Correction strongly improves separation (a red/green pair a deuteranope sees at ΔE ~8
becomes ~29), but it's an **aid, not a guarantee**. **Known v1 limits:** it applies one
filter to a wrapper, so `position:fixed`/`sticky` layouts can shift while a mode is on,
and it can't exempt individual images — inherent to the wrapper-filter approach; a
per-element strategy is the planned v2. Test on your site before production. It doesn't
replace designing with [colorblind-safe colors](https://opticquiz.com/checker/).

MIT.
