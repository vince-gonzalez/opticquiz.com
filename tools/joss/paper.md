---
title: 'plateaudit: measuring pseudoisochromatic colour-vision plates from the stimulus a browser actually delivers'
tags:
  - Python
  - colour vision
  - colorimetry
  - psychophysics
  - reproducibility
  - vision science
authors:
  - name: Vincent Gonzalez
    orcid: 0009-0005-3640-014X
    affiliation: 1
affiliations:
  - name: Independent researcher, Punta Gorda, Florida, USA
    index: 1
date: 14 August 2026
bibliography: paper.bib
---

# Summary

Pseudoisochromatic plates — the dot patterns in which a numeral is hidden from observers with
red–green or blue–yellow colour vision deficiency — are assessed colorimetrically by measuring
the chromaticities of the figure and ground dots and comparing the direction in which they are
separated against the dichromatic confusion lines [@Dain2004; @NRC1981]. That procedure has been
applied to printed editions and, more recently, to plates served on screens
[@DainAlMerdef2016; @Zhang2026].

`plateaudit` performs this analysis on plates as a browser receives them. It recovers each dot's
position, radius and declared fill from SVG path data by converting the endpoint arc
parameterisation to centre parameterisation, assigns figure and ground by the spatial compactness
of each colour class, pairs figure dots with the ground dots that physically border them, and
reports the distribution of confusion-line deviations across that boundary. It also draws the
figures for a paper and refuses to draw them if the numbers no longer match the values the paper
prints.

# Statement of need

Colorimetric plate assessment has been carried out for four decades without shared tooling. Each
study builds its own extraction, and the chain from delivered stimulus to reported angle is
described in prose rather than executed from code. Three consequences follow.

First, results are not reproducible from the artefact. A published deviation angle cannot be
recomputed by a reader holding the same plate, because the extraction is not available.

Second, plates delivered over the web are not covered by the existing approach at all. A plate
served as SVG carries its colours in markup and can be measured exactly, without the
rasterisation step and its attendant uncertainty; a plate whose dots overlap with per-dot opacity
cannot be measured that way at all, and needs to be excluded on evidence rather than assumed
sound.

Third, the constants involved are contested and easy to get wrong. Dichromatic copunctal
coordinates circulate in several variants, and a value belonging to a different set of cone
fundamentals produces a plausible-looking angle that is quietly incorrect. `plateaudit` verifies
any candidate copunctal point against its defining property — feeding the chromaticity through
the cone transform must null the two remaining cone classes — which settles the question without
reference to an external table. Two incorrect constants in the author's own implementation were
found this way before they reached a result.

The package was written for, and is the analysis behind, a study of whether a plate's design type
in the Hardy–Rand–Rittler taxonomy [@HRR1954] can be recovered from the delivered stimulus alone.
It is usable independently for any measurement of plate colour, dot geometry, or confusion-line
alignment.

# Functionality

- **Geometry recovery** from SVG path data, following the endpoint-to-centre arc conversion of
  the SVG 1.1 specification. Recovered dot counts are checked against the counts declared in the
  markup; disagreement fails rather than proceeds.
- **Colorimetry** from linear sRGB to Smith & Pokorny cone excitations [@SmithPokorny1975] in a
  single composed transform, avoiding the intermediate space in which CIE 1931 and Judd–Vos
  chromaticities can be mismatched.
- **Confusion directions constructed rather than retrieved**, by perturbing the missing cone's
  excitation and projecting back, so the analysis does not depend on a tabulated copunctal point.
- **Figure/ground assignment** by radius of gyration relative to the whole plate, which does not
  require the plate's answer key.
- **Local pairing** of figure dots with the ground dots that border them, reporting a
  distribution rather than one pooled number.
- **Uncertainty** by resampling figure dots rather than border pairs, since pairs from one dot are
  not independent observations.
- **Figure generation** that recomputes every plotted quantity from the source data and compares
  it against the values printed in the accompanying article before writing any file.

# Quality control

Each tool carries a self-test that must pass before the tool will run, and each self-test includes
a positive control: a colour group known to lie off the confusion axis is required to be reported
off axis. The purpose is to make a check that cannot detect the defect it exists to catch fail
rather than pass. Several defects in this software were found by those controls rather than by
inspection, including two incorrect copunctal constants and a figure/ground rule that mislabelled
six of eleven plates.

The figure builder is gated in the same way. It recomputes dot counts, radii of gyration,
alignment fractions, rank correlations and threshold-sweep magnitudes, compares each against the
published value, and exits without writing if any comparison fails.

# Acknowledgements

The plate colours analysed during development were read from a publicly served product for the
purpose of scholarly measurement; no plate images are redistributed with this software.

# References
