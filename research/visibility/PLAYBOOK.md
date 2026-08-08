# Retrieval playbook

Written against [MEASURED.md](MEASURED.md), 6 August 2026. Every claim here traces to a query
that was actually run, or is marked as an assumption.

The diagnosis in one line: **indexed, understood, never selected — because nothing outside
this site has ever pointed at it.**

---

## The strategic fact everything else follows from

We are not competing for an empty position. Retrieval already has answers to our questions —
weaker answers, from RGBlind, Colorlite, BlindnessTest.com, FreeWWW, `@americana/color-unclasher`
— and no reason to swap them for ours.

That reframes the job. It is not "become findable." It is **"give retrieval a reason to prefer
us over an incumbent it already trusts."** Two things do that and nothing else does:

1. **Be the answer rather than a link to it.** Retrieval prefers the page that IS the thing.
2. **Have somebody else say so.** One external pointer beats a hundred internal ones.

Everything below is one of those two.

---

## Tier 0 — the control experiment

Query 3 in MEASURED.md is the whole strategy in miniature. Nobody else has measured the
Windows colour filters. We published it. Retrieval says the information does not exist.

That is a **single-variable experiment sitting there for free**: a page with no competition,
no authority contest, no incumbent. If one external citation makes that query start returning
us, then citation is the bottleneck and the rest of the playbook is just repeating that move.
If it does not, the diagnosis is wrong and we learn that cheaply.

**Do this one first, before anything expensive.** It is the only move here that tests the
theory instead of assuming it.

---

## Tier 1 — building, which is the lane that works

### 1.1 Put a live generated test on the homepage

Measured: `index.html` contains zero `<canvas>` elements. The homepage describes tests and
links to them. Every competitor ranking for `colorblind test` renders the test on the page
that ranks.

Not a redesign — an above-the-fold, procedurally generated plate that runs immediately, with
the full test one click deeper. Specifically:

- generated at load from the corrected confusion-axis palettes, never a stored image
- no intro screen, no consent gate, no "start" button before the first plate
- the H1 becomes the query, not the slogan
- a visible line stating the plate was generated in-browser this second and no two runs match

That last line is the differentiator no competitor can copy without rebuilding, and it is
crawlable text rather than a claim buried in a method paper.

**Why it matters beyond ranking:** an engine summarising our homepage today reads a hub page.
An engine summarising the new one reads a working instrument. Those produce different
sentences in someone else's answer.

### 1.2 Rewrite the npm README to answer the query it loses

Measured: `opticquiz-cvd` does not appear for the exact query it exists to serve, while
`@bjornlu/colorblind` (simulation only) and `@americana/color-unclasher` do.

The competing packages simulate. Ours simulates, checks a palette, fixes a failing one,
computes WCAG contrast, and produces byte-identical results in JavaScript and Python off a
published method with a DOI. None of that is in the first screen of the README.

Cheap, entirely in-repo, and the developer corpus responds faster than the consumer one.

### 1.3 JOSS

A peer-reviewed, permanently citable artifact that other papers can cite — which is the only
citation type that compounds. Unblocked since the LICENSE landed. Reviewers will ask what is
novel versus `daltonize`; the answer is now the benchmark and the sixteen-test audit, which
did not exist a week ago.

This is slow (months) and it is the only Tier-1 item that is.

---

## Tier 2 — permanent, machine-readable identity

Cheap, one-time, and each one is a durable pointer that does not decay:

- **Software Heritage** — archives the repository permanently, gives a resolvable identifier
- **OpenSSF Best Practices badge** — self-certified against a public checklist, displays a badge
- **Zenodo** — already have two DOIs; the benchmark and the audit corpus are a third deposit
  when the research settles, not before

None of these move a head term. All of them make the site a *citable object* rather than a
website, which is what the Tier-3 moves need to point at.

---

## Tier 3 — the citation problem, honestly

This is the actual bottleneck and the hardest part, and it deserves plain talk rather than a
tactic list.

**What does not work here:** cold posting. Reddit is closed (permaban, 2026-07-10). Comment
seeding reads as spam and gets treated as spam. Buying links is out.

**What legitimately creates a citation:**

- **Wikipedia.** The `Color_vision_test` article is genuinely thin on screen-based testing and
  the calibration problem, and the DOI is a citable source. The hazard is real: there is a
  conflict of interest, Wikipedia actively hunts self-citation and citogenesis, and a bad
  attempt poisons the well permanently. The defensible version is adding the *fact* with the
  *best available source*, which is sometimes ours and often somebody else's, and disclosing
  the COI on the talk page rather than hoping nobody checks.

- **One pickup of the Windows finding.** It is genuinely novel, genuinely useful, and
  specifically interesting to Windows and accessibility developers. It needs exactly one
  person to write it up somewhere with a link. Show HN is the one submission channel that is
  a submission rather than a solicitation.

- **Being depended on.** The strongest citation is a `package.json`. Every project that
  installs `opticquiz-cvd` is a permanent pointer that no algorithm discounts. That is why
  1.2 outranks almost everything else here on effort-to-effect.

**The honest ordering:** 1.2 and Tier 0 are weeks. Wikipedia is one careful edit. JOSS is
months. The head term is years, if ever, against funded incumbents — and pretending otherwise
would be the same overclaim this project spent a week removing from its own tests.

---

## Tier 4 — measure it like everything else

MEASURED.md is a snapshot from one engine in one session. That is exactly the kind of
single-source verification this project has been burned by six times in a week.

Make it a gate:

- the query battery becomes a tool, run monthly, results committed
- run it against **more than one engine** — this measurement cannot distinguish "we regressed"
  from "engines differ", and a July recon found the opposite result
- record what came back verbatim, including the competitor named in our place, because the
  *substitute* is the signal

A visibility number nobody re-measures is a claim, not a metric.

---

## What is deliberately not in here

**Publishing more guides.** Twenty-plus exist. Query 5 proves the problem is not that we have
not written the answer; we wrote it and somebody else got quoted for it. More pages is the
move that feels like progress and measurably is not.

**Keyword stuffing the head term across every title.** Tried before on this project,
identified as the slop fingerprint, correctly reverted.

**Claiming the audit makes us the most accurate online test.** It makes us the only one that
has *checked*. Thirteen of sixteen tests were wrong last week. The defensible claim is
"measured and published, including the failures", and that claim is stronger than the one we
cannot support.
