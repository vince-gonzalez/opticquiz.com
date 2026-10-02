# OpticQuiz — Colorblind Corrector (Chrome / Edge / Firefox extension)

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

## Where it is published
All three listings are live:
- **Chrome Web Store:** https://chromewebstore.google.com/detail/opticquiz-%E2%80%94-colorblind-co/cigfnaekhndlablojacfdhmgcdnnfieo
- **Microsoft Edge Add-ons:** https://microsoftedge.microsoft.com/addons/detail/maalcjohefglpnenmfjjkacgmomhofeh
- **Firefox Add-ons:** https://addons.mozilla.org/en-US/firefox/addon/opticquiz-colorblind-corrector/

`node build.mjs` produces the store-ready zips in `dist/`. There is no Safari build: Safari
web extensions are distributed through the App Store inside a containing app, which needs an
Apple Developer account.

## Honest scope & limits
Correction is an **aid, not a cure**, and strongly improves color separation but doesn't
resolve every case.

Since **1.3.0** the correction is applied to computed CSS styles rather than as a filter over
the whole page. Photographs, video and canvas are untouched, and nothing is filtered, so
`position:fixed` and `sticky` behave as the site's author wrote them. Text is forced to pure
black or white against its corrected backdrop, which clears WCAG AA by construction (worst
case 4.58:1). The 1.2.x filter moved lightness as well as hue and could push text below AA —
on opticquiz.com's own twelve text/background pairs it pushed eight below, worst 3.22:1.

What it still cannot do: where text sits on a `url()` bitmap the ratio cannot be proven, so it
preserves the author's own ratio instead of guessing. Where the operating system's own
contrast setting is active it stands down and leaves the OS in charge. On a very large DOM it
stops rather than stalling the page.

The engine lives in `widget/engine.js` and `content.js` is generated from it — edit the engine
and run `node tools/build-widgets.js`. Verify with `node tools/verify-widget.js`.
Method: https://doi.org/10.5281/zenodo.21310578 · MIT.

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
