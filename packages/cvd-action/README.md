# OpticQuiz Colorblind Check — GitHub Action

Fail a pull request when a stylesheet's colors **collapse for colorblind viewers**.
It scans your `.css` / `.scss` / `.less` files, simulates protanopia, deuteranopia and
tritanopia (Machado 2009), scores every pair with CIEDE2000, and annotates the exact
conflicting lines. Zero runtime dependencies — the engine is vendored.

## Usage
```yaml
name: a11y
on: [pull_request]
jobs:
  colorblind:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: zengineco/opticquiz.com/packages/cvd-action@main
        with:
          path: ./src          # directory to scan (default: .)
          fail-on: conflict     # or "borderline" to also fail on tight pairs
```

## Inputs
| input | default | meaning |
|---|---|---|
| `path` | `.` | directory to scan for `.css/.scss/.less` |
| `files` | — | comma-separated explicit file list (overrides `path`) |
| `fail-on` | `conflict` | `conflict` fails on hard collapses; `borderline` also fails on tight (ΔE 10–15) pairs |
| `severity` | `1` | CVD severity 0–1 (1 = worst-case dichromacy) |
| `model` | `machado` | `machado` or `brettel` |

## Outputs
`conflicts`, `borderline`, `files_checked`.

## What it flags
A pair is a **conflict** when it's clearly distinct to normal vision but its simulated
CIEDE2000 difference drops below 10. Failing pairs are printed as GitHub error
annotations pinned to the file.

## Honest scope
A screening aid, not a legal accessibility audit — it checks one axis (color
distinguishability) and does not certify WCAG/ADA/EAA compliance. Method:
https://doi.org/10.5281/zenodo.21310578 · MIT.
