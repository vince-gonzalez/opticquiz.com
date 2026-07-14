# OpticQuiz — Colorblind-Safe Colors

Catch the colors that break for colorblind viewers **while you code**, and fix them with one click.

Red-green color-vision deficiency affects about 1 in 12 men. When a stylesheet, theme, or chart config leans on colors that look identical to them, those users just miss the meaning. This extension underlines those pairs as you type and offers a fix.

## What it does

- **Underlines conflicting colors.** It reads the hex colors in your file, simulates protanopia / deuteranopia / tritanopia (Machado 2009), scores every pair with CIEDE2000, and warns on the pairs that are distinct to normal vision but **collapse under simulation**.
- **Fixes them.** The lightbulb — or the command **OpticQuiz: Fix colors to be colorblind-safe** — rewrites the offending hex values to a colorblind-safe set that stays as close to your originals as possible (it separates them in lightness, the axis color-vision deficiency preserves).
- **Runs locally.** The [`opticquiz-cvd`](https://www.npmjs.com/package/opticquiz-cvd) engine runs in-process. Nothing about your code leaves your machine.

Works in CSS, SCSS, Less, JS/TS, JSON design tokens, HTML, Vue, Svelte, Astro.

## Settings

- `opticquiz.severity` — CVD severity to check against (1 = full dichromacy / worst case; 0.5 = moderate anomalous trichromacy).
- `opticquiz.model` — `machado` (default) or `brettel`, two independent simulation models.
- `opticquiz.collapse` — the CIEDE2000 threshold below which a simulated pair counts as a conflict (default 10).
- `opticquiz.enable` — turn the underlines on/off.

## Honest scope

This checks one thing: whether colors stay distinguishable under simulated color-vision deficiency. It is **not** a legal accessibility audit and does not certify ADA, Section 508, WCAG, or EU Accessibility Act compliance. It simulates a model of color vision, not any individual's. The method is open-access: **[DOI 10.5281/zenodo.21310578](https://doi.org/10.5281/zenodo.21310578)**. Same engine as the [OpticQuiz checker](https://opticquiz.com/checker/) and the [palette benchmark](https://opticquiz.com/palettes/).

## License

MIT.
