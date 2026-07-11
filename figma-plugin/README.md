# OpticQuiz — Colorblind-Safe Checker (Figma plugin)

Checks the colors in your Figma selection for color-vision-deficiency conflicts,
right in the editor. Reads the fill & stroke colors of whatever you've selected
(or the whole page if nothing is selected), simulates protanopia, deuteranopia
and tritanopia (Machado 2009), and flags pairs whose perceptual difference
(CIEDE2000) collapses under simulation.

**On-device. Nothing leaves Figma** (`networkAccess: none`).

## Files
- `manifest.json` — plugin manifest.
- `code.js` — sandbox main: walks the selection, collects solid fill/stroke colors, posts them to the UI.
- `ui.html` — the panel UI **and** an inlined copy of the CVD engine (kept in sync with `/assets/oq-cvd.js`).

## Run it locally (dev)
1. Figma desktop app → **Plugins → Development → Import plugin from manifest…**
2. Select this folder's `manifest.json`.
3. Select some frames/shapes, then **Plugins → Development → OpticQuiz — Colorblind-Safe Checker**.

## Roadmap (Phase 2 of the OpticQuiz certifier)
- Map each flagged conflict back to the specific Figma layers (select-on-click).
- "Suggest a safe alternative" (bounded palette remap — the Remediator, Stage C).
- One-click badge export once the certification service (Stage B) is live.

## Note
The engine in `ui.html` is a copy of the canonical `/assets/oq-cvd.js`. If you
change the engine, update both. Method: Machado, Oliveira & Fernandes (2009) +
CIEDE2000, the same science as the published OpticQuiz paper
(DOI 10.5281/zenodo.21310578). A screening aid, **not** a legal accessibility audit.
