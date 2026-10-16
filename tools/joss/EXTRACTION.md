# What JOSS needs before this can be submitted

`paper.md` and `paper.bib` in this folder are ready. They are not the blocker.

## The blocker

**JOSS reviews a software repository.** A reviewer opening `github.com/vince-gonzalez/opticquiz.com`
finds 74 HTML pages and a `tools/` directory. The submission would be returned — not because the
software is weak, but because the repository is a website.

The 12 tools total 3,528 lines and are already MIT licensed. They need to be their own repository
before a submission is worth making.

## Honest assessment of the odds

JOSS requires "substantial scholarly effort" and explicitly rejects minor utility packages, thin
API wrappers and single-function packages. This is none of those — it is a coherent instrument
chain from SVG parsing through colorimetry to uncertainty — but 3.5k lines supporting one paper
is mid-range for JOSS rather than obviously above the bar. The things that argue for acceptance:

- It does something no published tool does. The plate colorimetry literature has no shared
  implementation.
- The verification discipline is unusual and demonstrable: self-tests with positive controls,
  and a figure builder that refuses to write files when its output stops matching the paper.
- It has a real use case already written up and submitted.

The thing that argues against: it is a single-author analysis suite for one study. A reviewer
could reasonably call that a research script collection.

My read is that it is worth submitting **after extraction**, and not worth submitting before.
Submitting the website repo would waste the attempt.

## Extraction checklist

1. **New repository**, `plateaudit` or similar. Not a fork of the website.
2. **Package layout** — `src/plateaudit/` with the modules imported by name rather than by
   `sys.path` insertion, which is how `tools/` currently does it.
3. **`pyproject.toml`** with dependencies pinned loosely: numpy, matplotlib, and optionally scipy
   (`local_pairing` already degrades gracefully without it).
4. **README** covering install, a worked example that runs end to end on the deposited data, and
   what the package does not do.
5. **Test suite runnable by one command.** The self-tests exist inside 5 of the 12 modules and are
   invoked by flags; JOSS wants `pytest` or equivalent, and wants the positive controls to be part
   of it. This is the largest piece of real work.
6. **Example data.** The deposited `delivered-plates.json`, `designs.csv` and `local-pairing.json`
   let someone reproduce Table 1 without needing the ZEISS SVGs, which should not be
   redistributed.
7. **CONTRIBUTING.md and an issue template** — JOSS checks for community guidelines.
8. **Archive a release on Zenodo** and put the DOI in the submission.

Items 1–4 and 7 are an afternoon. Item 5 is the one that decides whether the review goes well.

## What not to do

Do not submit with the tools still inside the website repository. Do not describe the software as
novel colorimetry — the colorimetry is Dain's procedure and Smith & Pokorny's fundamentals, and
the paper says so. The contribution is that the chain is executable and checkable, which is a
true claim and a sufficient one.

---

# DONE 2026-10-16: extracted to `Desktop\plateaudit`

Local git repo, first commit `9f31744`. **Not yet on GitHub and not yet pushed.**

| # | checklist item | state |
|---|---|---|
| 1 | New repository, not a fork | DONE, `plateaudit` |
| 2 | `src/plateaudit/`, imports by name | DONE, relative imports; the `sys.path` inserts are gone |
| 3 | `pyproject.toml`, loose pins | DONE, numpy + matplotlib + pillow; `scipy` is the `fast` extra |
| 4 | README with a worked example | DONE, `audit_delivered_plates` runs end to end on the bundled data |
| 5 | **Test suite, one command** | DONE, `python -m pytest tests/` gives 15 passed, 1 skipped |
| 6 | Example data | DONE, the three deposited files in `data/` |
| 7 | CONTRIBUTING + issue templates | DONE |
| 8 | Zenodo release, DOI in the submission | **OUTSTANDING, needs his action** |

## Corrections to this document, found by doing it

- It says **12 tools, 3,528 lines**. The real figure is **11 modules, 3,379 lines**.
  Membership was decided by the import graph, not by filename.
- **`confusion_axis.py` was left here deliberately.** 205 of its 304 lines scan the site's
  `index.html` files, read `/hue/` and `/sat/`, and import `packages/cvd-py` from this tree.
  That is site maintenance rather than instrumentation, and **nothing in the chain imports
  it**, so dropping it costs the package nothing. Shipping code to a JOSS reviewer that
  reaches for files which do not exist is exactly what makes a submission read as a script
  collection.
- Three modules pointed `DATA` at `research/plate-audit/`. They now resolve to the package's
  own `data/` directory and honour `PLATEAUDIT_DATA_DIR`.
- Item 5 was correctly identified as the real work. The self-tests were promoted from
  `--self-test` flags into pytest, so the positive controls run on every commit. One test
  **guards the guard**: it asserts the deliberately broken pre-fix palette is still present
  and still measured off axis. That test was itself verified by sabotaging the control and
  confirming it fails.

## What is left

1. Create `github.com/vince-gonzalez/plateaudit` and push. **His call.**
2. Tag a release and archive it on Zenodo for the DOI.
3. Submit to JOSS with that DOI.

The honest-odds assessment above still stands and is unchanged by the extraction.
