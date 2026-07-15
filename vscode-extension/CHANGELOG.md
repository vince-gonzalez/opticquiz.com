# Changelog

## 0.4.0
- **Borderline tier.** A passing palette now also surfaces its *tightest* pairs — any
  that clear the fail line but sit in the close zone (ΔE 10–16) — called out in amber,
  with the Okabe–Ito gold-standard's own closest pair (11.1) shown for scale. Three
  honest states (safe / borderline / conflict) instead of a bare pass/fail.

## 0.3.0
- Panel now offers **two ways to fix**: Option A nudges your existing colors the
  minimal amount (stays on-brand); Option B generates a **fresh colorblind-safe
  palette** built on the Okabe–Ito standard (and generated beyond 8 colors),
  maximally distinct across protanopia, deuteranopia, and tritanopia at once.
  Each has its own one-click Apply.

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
