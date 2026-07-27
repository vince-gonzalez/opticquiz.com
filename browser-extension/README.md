# OpticQuiz — Colorblind Corrector (Chrome / Edge extension)

A Manifest V3 browser extension that corrects the colors on **any web page** in real time
for your type of color blindness. It runs the same published method as the rest of OpticQuiz
(Machado 2009 simulation + Fidaner redistribution, applied as an SVG `feColorMatrix` in
linear RGB). **No network, no tracking** — your chosen mode is stored only in your browser.

This is the user-side complement to the [one-line widget](https://opticquiz.com/widget/):
the widget needs a site owner to embed it; the extension the colorblind person installs once
and carries across the whole web.

## Test it locally (no store account needed)
1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. **Load unpacked** → select this `browser-extension` folder.
4. Open any page with red/green content, click the OpticQuiz toolbar icon, pick a mode
   (Recommended, Deuteranopia, Protanopia, Tritanopia, or Off).

## Publish
- **Chrome Web Store:** chrome.google.com/webstore/devconsole (one-time $5 developer fee).
  Zip this folder's contents and upload; add screenshots + the store listing.
- **Edge Add-ons:** partner.microsoft.com/dashboard/microsoftedge (free). Upload the same zip.
- Swap `icon.png` for the crisp 128px eye mark (Desktop\opticquiz-brand) before publishing.

## Honest scope & limits
Correction is an **aid, not a cure**, and strongly improves color separation but doesn't
resolve every case. It applies one filter to the page, so on sites that rely on
`position:fixed` / `sticky` elements the layout can shift while a mode is on — toggle **Off**
to restore. Method: https://doi.org/10.5281/zenodo.21310578 · MIT.
