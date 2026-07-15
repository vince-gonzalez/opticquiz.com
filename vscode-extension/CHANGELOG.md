# Changelog

## 0.2.0
- **Visual preview panel** (`OpticQuiz: Preview colors` — command palette or right-click).
  Shows your palette, the same palette as protan/deutan/tritan viewers see it, the
  exact conflicts, a suggested colorblind-safe palette with an **Apply** button, and a
  WCAG contrast readout (on white / on black). Live-updates as you edit; works in any
  file, not just recognized languages.

## 0.1.0
- First release. Underlines color pairs that collapse under color-vision-deficiency
  simulation (protan/deutan/tritan, Machado 2009 + CIEDE2000) in CSS/SCSS/Less/JS/TS/
  JSON/HTML/Vue/Svelte/Astro.
- One-click "Fix colors to be colorblind-safe" (lightbulb + command) rewrites the
  offending hex values to a safe palette that stays near the originals.
- Settings for severity, model (Machado/Brettel), and the conflict threshold.
- Engine runs locally; nothing leaves the machine.
