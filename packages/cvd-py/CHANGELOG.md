# Changelog

Notable changes to `opticquiz-cvd` (PyPI).

## 1.2.0 — 2026-10-02

Silent-wrong-answer defects. In each one the engine returned a plausible color, or raised
something opaque, instead of refusing bad input — so a mistake produced a complete and
entirely wrong measurement run with nothing to indicate anything had gone wrong.

### Behavior change: an unknown `cvd_type` or `model` now raises

```python
cvd.simulate("#d7191c", "protanopia")   # 1.1.3 -> '#d7191c'   (silent no-op)
cvd.simulate("#d7191c", "protanopia")   # 1.2.0 -> ValueError
```

A typo'd `model` had the same shape, quietly falling back to `machado`. Both now raise:

- `ValueError` — a string that names no known type or model.
- `TypeError` — `cvd_type` or `model` is not a string at all.

This matches the four sibling packages (`cvdsim`, `daltoscope`, `dichromacy`,
`trichromacy`) that already raise `ValueError` on a bad type.

### Behavior change: an invalid color now raises clearly

```python
cvd.simulate("red", "deutan")   # 1.1.3 -> ValueError("invalid literal for int() ...")
cvd.simulate("red", "deutan")   # 1.2.0 -> ValueError("opticquiz-cvd: invalid color 'red'. ...")
cvd.to_hex((1, 2))              # 1.1.3 -> IndexError
cvd.to_hex((1, 2))              # 1.2.0 -> ValueError("... expected 3 or 4 components, got 2.")
cvd.to_hex((300, 0, 0))         # 1.1.3 -> '#ff0000'  (silently clamped)
cvd.to_hex((300, 0, 0))         # 1.2.0 -> ValueError
```

Accepted colors are now stated and enforced:

- a hex string — `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, "#" optional, any case,
  trimmed. **8-digit `#rrggbbaa` previously had its bytes shifted a channel over** and
  silently produced the wrong color; it is parsed correctly now, alpha discarded.
- an `(r, g, b)` or `(r, g, b, a)` sequence in 0-1 or 0-255, alpha discarded. Components
  must be finite, non-negative, and within the range implied by the 0-1 / 0-255 reading.

The 0-1 vs 0-255 decision (whether the largest component exceeds 1) is the documented
matplotlib-friendly behavior and is **unchanged**. Components are read with `float()`
rather than an `isinstance` check, so numpy scalars, `uint8` arrays and `Decimal` keep
working.

### Why this is a minor and not a major

The only calls whose behavior changes were already producing wrong results or raising an
opaque error — no correct program depended on `(300, 0, 0)` meaning white — and the
release is otherwise additive. Pin `1.1.3` for the old behavior.

If you pass **user-supplied** values, validate with the newly exported `normalize_type`,
or catch the exception.

### Accepted type names

`protan`, `deutan`, `tritan`, `normal` — matched case-insensitively and trimmed.

The long clinical forms are deliberately **not** aliases, so this engine and every
wrapper around it accept one vocabulary. The error names the short form to use instead:

```
simulate: unknown type 'protanopia'. Use "protan". Expected one of: protan, deutan, tritan, normal.
```

`protanomaly` / `deuteranomaly` / `tritanomaly` are refused separately and for a
different reason. Anomalous trichromacy is a *partial* deficiency — `severity` below 1 —
not a type of its own, so aliasing it onto the severity-1 matrix would have silently
overstated the deficiency:

```
simulate: unknown type 'deuteranomaly'. Anomalous trichromacy is a severity, not a type: use "deutan" with severity < 1.
```

### Added

- `normalize_type(cvd_type, where="simulate")` and `normalize_model(model, where="simulate")`
  — exported so wrappers can validate against the engine's own vocabulary instead of
  keeping a copy of the accepted names.
- `MODELS` — `["machado", "brettel"]`, alongside the existing `TYPES`.
- `cvd_type` and `model` now tolerate any case and surrounding whitespace.
- 4- and 8-digit alpha hex are accepted inputs.

### Parity with the JS twin

`opticquiz-cvd` on npm 1.2.0 accepts the same names and returns byte-identical values for
every type and model. `simulate(color, "normal")` returns canonical `#rrggbb` on both
sides now — the JS side used to return the raw input lowercased, so `"#abc"` differed
between the two engines. It raises `TypeError` for both the bad-value and wrong-type
cases, JavaScript having no `ValueError`; the messages are otherwise identical.
