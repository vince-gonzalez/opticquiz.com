# opticquiz-eye

[![npm version](https://img.shields.io/npm/v/opticquiz-eye)](https://www.npmjs.com/package/opticquiz-eye)
[![npm downloads](https://img.shields.io/npm/dm/opticquiz-eye)](https://www.npmjs.com/package/opticquiz-eye)

A **one-line colorblind accessibility widget**. Adds a floating eye that lets a visitor
re-color your page live so they can *distinguish* colors — for their type of color-vision
deficiency, or a "Recommended" all-types correction. Zero dependencies, **zero tracking**,
SSR-safe.

It **corrects** (daltonization via an SVG color filter in linear RGB), it doesn't just
simulate — the goal is to help the visitor *see*. Method:
https://doi.org/10.5281/zenodo.21310578

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
