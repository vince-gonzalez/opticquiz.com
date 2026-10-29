# Changelog

Notable changes to `opticquiz-cvd` (npm).

## 1.2.0 — 2026-10-02

Three silent-wrong-answer defects. In each one the engine returned a plausible color
instead of refusing bad input, so a mistake produced a complete and entirely wrong
measurement run with nothing to indicate anything had gone wrong.

### Behavior change: an unknown `type` or `model` now throws

```js
cvd.simulate("#d7191c", "protanopia");   // 1.1.1 -> "#d7191c"   (silent no-op)
cvd.simulate("#d7191c", "protanopia");   // 1.2.0 -> TypeError
```

A typo'd `model` had the same shape, quietly falling back to `machado`. Both now throw a
`TypeError` naming the accepted values.

### Behavior change: an invalid color now throws

```js
cvd.simulate("red", "deutan");           // 1.1.1 -> "#000000"    (measured as black)
cvd.simulate("red", "deutan");           // 1.2.0 -> TypeError
cvd.deltaE("#fff", "nope");              // 1.1.1 -> 100          (scored against black)
cvd.deltaE("#fff", "nope");              // 1.2.0 -> TypeError
```

A malformed color reached `parseInt` as `NaN` and came back `#000000`, so any typo was
silently measured as black — including inside `checkPalette`, `fixPalette`, `deltaE` and
the WCAG contrast functions, which all validate now.

Accepted: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` — "#" optional, any case, trimmed.
**8-digit `#rrggbbaa` previously had its bytes shifted a channel over** and silently
produced the wrong color; it is now parsed correctly with alpha discarded, matching the
RGBA-tuple path in the Python twin.

### Behavior change: `simulate(hex, "normal")` returns canonical `#rrggbb`

It used to return the raw input lowercased, so `"#abc"` came back `"#abc"` and compared
unequal to its own 6-digit simulation — a baseline comparison that looked fine and was
wrong. It now returns `#aabbcc`, the same shape every other type returns, which also
closes a divergence from the Python twin (which already canonicalized).

```js
cvd.simulate("#abc", "normal");          // 1.1.1 -> "#abc"
cvd.simulate("#abc", "normal");          // 1.2.0 -> "#aabbcc"
```

### Why this is a minor and not a major

The only calls whose behavior changes were already producing wrong results — no correct
program depended on an unknown type returning its input, or on `"red"` meaning black —
and the release is otherwise additive. A major would also have stranded every dependent
package (all pin `^1.1.0`) on the engine with the defects. Pin `1.1.1` for the old
behavior.

If you pass **user-supplied** values, validate with the newly exported `normalizeType`,
or catch the `TypeError`.

### Accepted type names

`protan`, `deutan`, `tritan`, `normal` — matched case-insensitively and trimmed.

The long clinical forms are deliberately **not** aliases, so this engine and every
wrapper around it (`dichromacy`, `trichromacy`, `cvdsim`, `cvdplate`, the MCP servers)
accept one vocabulary. The error names the short form to use instead:

```
simulate: unknown type "protanopia". Use "protan". Expected one of: protan, deutan, tritan, normal.
```

`protanomaly` / `deuteranomaly` / `tritanomaly` are refused separately and for a
different reason. Anomalous trichromacy is a *partial* deficiency — `severity` below 1 —
not a type of its own, so aliasing it onto the severity-1 matrix would have silently
overstated the deficiency:

```
simulate: unknown type "deuteranomaly". Anomalous trichromacy is a severity, not a type: use "deutan" with severity < 1.
```

### Added

- `normalizeType(type, where?)` and `normalizeModel(model, where?)` — exported so
  wrappers can validate against the engine's own vocabulary instead of keeping a copy of
  the accepted names.
- `MODELS` — `["machado", "brettel"]`, alongside the existing `TYPES`.
- `type` and `model` now tolerate any case and surrounding whitespace.
- 4- and 8-digit alpha hex are accepted inputs.

### Fixed

- An inherited object key passed as a type (`"constructor"`, `"toString"`) satisfied the
  old `!M[type]` guard and reached the matrix math as `NaN`. Type lookups are now
  own-property only.
- `index.d.ts` records every throw, adds a documented `HexColor` type, and declares the
  new exports.

### Parity with the Python twin

`opticquiz-cvd` on PyPI 1.2.0 accepts the same names, returns byte-identical values for
every type and model, and canonicalizes `"normal"` identically. It raises `ValueError`
for a bad value and `TypeError` for a wrong type, which is Python idiom and matches its
sibling packages; JavaScript has no `ValueError`, so both cases are `TypeError` here.
