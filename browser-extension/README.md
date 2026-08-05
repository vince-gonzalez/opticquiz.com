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

## Building the store packages

```
node build.mjs           # both zips
node build.mjs --lint    # both zips, then Mozilla's addons-linter on the Firefox one
```

Run `--lint` before every submission. It is the same validator AMO runs server-side, and it
knows things the bytes cannot tell you - which manifest keys are mandatory this month, and
which ones are silently inert below a given Firefox version.

### Why the ZIP is written in-process

`tar -a -c -f out.zip` looks like it works and does not. Git Bash puts GNU tar ahead of
Windows' bsdtar on PATH; bsdtar's `-a` understands zip, GNU tar's `-a` is `--auto-compress`
and only knows gz/bz2/xz/zst. Handed a `.zip` filename it writes a **plain tar** and exits 0.

That shipped a tar named `.zip` to Firefox, which rejected it as "invalid or corrupt add-on
file". The build had verified its own output with `tar -tf`, which reads a tar perfectly
well - so the check confirmed "7 files at the root" for a file that had never been a zip.

The writer is now ~80 lines of `zlib` in `build.mjs`, and the build asserts the container
format on the bytes it just wrote before it will report success.
