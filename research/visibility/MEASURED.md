# Where OpticQuiz actually appears in retrieval — measured, 6 August 2026

Not an audit of what we publish. An audit of what comes back when someone asks.

Six queries, run against a live retrieval engine, recorded verbatim. Three of them are
questions only we can answer.

---

## Result

| # | query | opticquiz in results? |
|---|---|---|
| 1 | `colorblind test` | **no** — 9 results, none ours |
| 2 | `most accurate free online color blindness test no signup honest about screen calibration` | **no** — 10 results, none ours |
| 3 | `Windows color filters transform coefficients not observable screenshot DXGI Magnification API` | **no** — engine states the information does not exist |
| 4 | `npm package check if color palette is colorblind safe deuteranopia simulate javascript python` | **no** — 9 packages, none ours |
| 5 | `are online color blindness tests accurate / which sites are honest about their limits` | **no** — four other sites named as the honest ones |
| 6 | `opticquiz.com` | **yes** — 6 pages including deep ones, summary accurate and current |

**0 for 5 on intent. 1 for 1 on brand.**

---

## What that combination means

Query 6 rules out the two explanations everyone reaches for first.

**Not an indexation problem.** The engine returned `/blindspot/`, `/astig/`, `/amsler/`,
`/acuity/`, `/vernier/` and the homepage. Deep pages, not just the root.

**Not a comprehension problem.** Its unprompted summary said "sixteen tests", described the
credit-card calibration correctly, and reproduced the on-device claim accurately. It has read
the site and understood it, including this week's changes.

So the site is legible and simply **never selected**. That is a different problem with a
different fix, and most SEO advice addresses the first two.

---

## The finding that actually matters

We are not absent because the position is empty. **Other sites already occupy our position,
saying weaker versions of what we say, and retrieval has no reason to prefer us.**

Query 5 asked which sites are honest about their limits and named RGBlind, Colorlite,
BlindnessTest.com and Cleveland Clinic. It then quoted BlindnessTest.com:

> "This test is a screening tool that counts how many color pairs you accept along one axis on
> your display. Device settings, panel type, brightness, and ambient light introduce variables
> that only an in-person exam can control."

That is our register, our framing, our argument. Somebody else's domain.

On the anomaloscope it quoted Colorlite explaining that a screen cannot reproduce the
instrument because the primaries are broadband rather than monochromatic — the exact claim we
proved by measurement on 6 August, with numbers, and which our /anomal/ page has made for
months.

Query 2 credited FreeWWW with "a calibration step using a credit card". Our mechanism, from
`OQ.Calib`, attributed elsewhere.

Query 4 credited `@americana/color-unclasher` with "check color accessibility and adjust RGB
colors ... with options to set minimum DeltaE values" — `checkPalette` and `fixPalette`,
described in our own terms, pointing at someone else's package.

## And the sharpest one

Query 3 is the control. Nobody else on the open web has measured the Windows colour filters
across GDI, DXGI and `MagGetFullscreenColorEffect`. We published it — a learn page, a
benchmark directory, raw captures, reproduction scripts — and the engine's answer was that the
information is not in its results and the reader should consult Windows documentation.

A genuinely unique, genuinely useful fact, live and crawlable, and retrieval cannot find it.

That single query separates the two candidate diagnoses:

- If we were losing on *authority alone*, we would still surface on a question only we answer.
- We do not. So the missing signal is not "is this site trustworthy" but **"does anything
  outside this site point at this page."**

Nothing does. Zero external citations, on every claim, in every corpus — consumer, clinical
and developer alike.

---

## What this rules out as the bottleneck

Everything already built, which is worth stating so it does not get rebuilt:

- indexation, sitemaps, canonical tags — done, demonstrably working
- structured data: Article, FAQPage, WebApplication, BreadcrumbList, DefinedTermSet — done
- `llms.txt` and `llms-full.txt` — done, and demonstrably read
- an AI-crawler-welcoming `robots.txt` — done
- on-page entity triangulation ("the home of free online vision testing") — done
- content depth: 16 tests, 20+ guides, a published method with a DOI — done

None of it is the constraint. The constraint is that **no third party has ever pointed at any
of it.**

---

## Method and honest limits

Six queries, one engine, one session, no personalisation controls. That is a small sample and
a single retrieval path; ChatGPT-search, Gemini grounding, Perplexity and Grok each have their
own index and could differ.

A July 2026 recon found opticquiz surfacing across engines and ChatGPT quoting `/anomal/` by
name for its honesty. Today's result does not reproduce that here. Three readings are
consistent with both: different engines behave differently, the July result was
ChatGPT-specific, or something regressed. **This measurement cannot distinguish them**, and
re-running the July prompts against those specific engines is the cheap way to find out.

What is not in doubt is the shape: indexed, understood, never chosen.
