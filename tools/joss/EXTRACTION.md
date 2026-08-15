# What JOSS needs before this can be submitted

`paper.md` and `paper.bib` in this folder are ready. They are not the blocker.

## The blocker

**JOSS reviews a software repository.** A reviewer opening `github.com/zengineco/opticquiz.com`
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
