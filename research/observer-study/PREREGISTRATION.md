# Pre-registration — Do colour-correction filters measurably help people with colour vision deficiency read information graphics?

**Status: DRAFT. Not registered. No data collected.**
Nothing in this document may be cited until it carries a registration timestamp (§10).

Every clause is numbered. Red-pen it by ID.

---

## 1. Why this study exists

**1.1** Every claim OpticQuiz currently makes about correction quality rests on computational
proxies — ΔE2000 over colour pairs, our M1–M7 metrics, two held-out folds. Not one of them
involves a person looking at anything.

**1.2** This field settled that question a decade ago and did not settle it in our favour.
The accepted evaluation instruments are behavioural: ViSDEM (visual search) and SaMSEM
(sample-to-match), which score real CVD observers on accuracy and response time. That
literature ranked Kotera and Fidaner highest and Huang and Kuhn lowest using human data, not
colour-difference arithmetic.

**1.3** A computational metric can only ever say *these colours became more separable in a
model of your vision*. It cannot say *you found the thing faster*. Those are different
claims and we have only ever been able to make the first one.

**1.4** So the honest position today is: **we do not know whether our correction helps
anyone.** We know it moves numbers we chose. This study is the attempt to find out, run in a
way where the answer is allowed to be no.

**1.5** Secondary purpose: a benchmark nobody can independently run is not a benchmark, and a
"seal of approval" backed by our own arithmetic is not a certification. Anything of that
kind is downstream of this study existing and coming out somewhere, not a parallel project.

---

## 2. What is actually new here

**2.1** Two of the three stimulus classes below are replications. That is deliberate — a
replication with a larger and more diverse sample is worth more than a novelty with twelve
observers, and it anchors our numbers against published ones so a reader can tell whether
our population is weird.

**2.2** The genuinely uncovered ground is **stimulus class C, information graphics** (§5.4).
The literature evaluates natural photographs and Ishihara plates. Neither is where colour
vision deficiency actually costs people anything. The daily cost is charts with a colour
legend, transit maps, status indicators, heat maps, wiring, resistor bands, lab strips —
displays where colour is *the encoding of the data* rather than a property of a depicted
object. We have not found this class evaluated behaviourally anywhere.

**2.3** Second contribution: **scale and screening**. Published behavioural studies in this
area typically run tens of observers recruited locally. We have a site with traffic and
fourteen working instruments that classify type and severity *before* a participant enters
the study. If we reach the target in §7, the sample is larger than the studies we are
comparing against — and the pre-screening is on record rather than assumed.

**2.4** Third: **a sham condition** (§6.5). Analogous to the "Dummy" condition in the ViSDEM
work, but built specifically to be an active placebo — it changes the image about as much as
a real correction does, in a direction that should not help. Without it, any positive result
is compatible with "any visible change makes people concentrate harder."

**2.5** We are not claiming a new algorithm. The correction under test already exists and is
already shipped. This tests it.

---

## 3. Hypotheses, stated before data

Directional and pre-committed. Confirmatory hypotheses are H1–H4. Everything in §9.6 is
exploratory and will be labelled as such in any write-up, permanently.

**3.1 — H1 (primary, confirmatory).** Among CVD observers, search accuracy on information
graphics (class C) is higher under the OpticQuiz correction than under no correction.

**3.2 — H2 (confirmatory).** Among CVD observers, the OpticQuiz correction produces accuracy
no worse than the Fidaner/daltonize baseline on class C. *Stated as non-inferiority, not
superiority.* We have no basis to predict we beat a published method in front of humans, and
pre-registering a superiority claim we cannot support would be exactly the behaviour this
document exists to prevent. Non-inferiority margin declared in §9.4.

**3.3 — H3 (confirmatory, the one that can embarrass us).** Among CVD observers, the
OpticQuiz correction produces accuracy higher than the sham condition. **If H3 fails, H1
means nothing** — a filter that beats no-filter but not a fake filter has demonstrated an
attention effect, not a correction effect. H3 is therefore a gate on H1, not a companion to
it (§9.5).

**3.4 — H4 (confirmatory, specificity).** Among normal-trichromat observers, the OpticQuiz
correction produces accuracy *no higher* than no correction. Correction that improves
everyone's performance is not correcting colour vision deficiency; it is a general contrast
or salience effect and must be reported as one.

**3.5** We commit in advance: **H1 and H2 are only interpretable if H3 passes and H4 holds.**
This ordering is fixed now so it cannot be rearranged after we see which way the data went.

**3.6** Severity dose-response — whether benefit scales with measured severity — is
**exploratory**, not confirmatory. It is the result we would most like to have and therefore
the one we are least entitled to fish for.

---

## 4. Participants

**4.1 Recruitment.** Visitors to opticquiz.com who have completed at least one instrument on
the site, invited by a non-coercive prompt after their result is shown. No payment, no prize,
no leaderboard, no streak. Anything that rewards participation rewards *completing trials*,
which is the behaviour we are measuring.

**4.2 Two groups, both required.**
- **Group CVD** — screened as anomalous by the on-site D-15 or plate test.
- **Group NORM** — screened as normal by the same instruments. This is not a courtesy group;
  H4 cannot be evaluated without it and the study is not interpretable without H4.

**4.3 Inclusion.** Age 18 or over, self-declared. Completed on-site screening in the same
browser. Completed the consent step in §8.

**4.4 Exclusion, declared now (§9.2 governs application).**
- Fails more than 1 of 6 catch trials (§5.6).
- Median response time under 400 ms across the session (not looking).
- More than 20 % of trials with response time under 250 ms (below plausible visual search).
- Session incomplete.
- Self-reports at debrief that they did not try, or that they used an external colour tool.
- Reports an uncorrected non-colour visual condition affecting the task (cataract, macular
  degeneration, uncorrected refractive error) at debrief.

**4.5 The screening is our own instrument, and that is a limitation we state rather than
manage.** Group assignment comes from the same site whose correction is under test. This is
circular in a way we cannot fully remove. Three mitigations, all pre-committed:
  - **4.5.1** At debrief, participants may optionally report a prior professional diagnosis
    and its type. We will report the primary analysis on the full CVD group **and** on the
    professionally-diagnosed subgroup, both, whatever they show.
  - **4.5.2** Group NORM anchors the screening from the other side.
  - **4.5.3** The screening's own accuracy is not established by this study and we will not
    imply that a positive result validates it.

**4.6 Uncalibrated displays.** We do not know any participant's screen, gamma, ambient light,
viewing distance, or whether the OS already has a colour filter on. This would be fatal to a
between-subjects design. **It is why the design is strictly within-subject (§6.1):** every
condition is seen on the same uncontrolled screen by the same person, so display variance
sits in the participant term and not in the effect. We will additionally ask at debrief
whether an OS-level colour filter was active and exclude those sessions (§4.4 amendment
requires §10.4 procedure).

**4.7** No personally identifying information is collected at any point. See §8.

---

## 5. Stimuli

**5.1** All stimuli are generated procedurally at trial time from a seeded generator. The
seed is recorded. This means every trial any participant ever saw can be regenerated exactly
from the released data, by anyone, without us shipping an image corpus — and it means we
cannot quietly hand-pick images that flatter the filter.

**5.2 Class A — pseudoisochromatic plates.** Procedurally generated vanishing-design plates
of the kind already built for /color/. Task: report the digit, or "none". Included because it
is the field's reference stimulus and lets a reader compare our population to published work.

**5.3 Class B — natural images with an embedded target.** Task: locate a target object that
differs from distractors by hue. The ViSDEM-comparable class.

**5.4 Class C — information graphics. The primary class.** Procedurally generated displays
where colour *is* the data encoding and there is exactly one correct answer:
  - **C1** Multi-series line chart with a colour legend. "Which series is highest at week 14?"
  - **C2** Categorical choropleth. "How many regions are in category *green*?"
  - **C3** Transit-style map with colour-coded routes. "Which line connects A to B?"
  - **C4** Sequential heat map with legend. "Is cell (r,c) above or below the midpoint?"
  - **C5** Status dashboard of coloured indicators. "How many are in an alarm state?"
  - **C6** Categorical scatter with a colour-encoded group. "Which group has the outlier?"

**5.5 Difficulty is fixed before data collection, not tuned.** Each stimulus family is
calibrated once against *normal* vision to sit near 90 % accuracy, using a pilot (§7.5).
Trials that are near-impossible or trivial for normal vision carry no information about
correction. This is the same discipline as the distinctness filter that caught a false alarm
in the ΔE work — the failure mode is identical and it already bit us once.

**5.6 Catch trials.** Six per session, distributed randomly, answerable by anyone with any
colour vision (target differs in luminance and shape, not hue). Used only for exclusion
(§4.4), never analysed as an outcome.

**5.7** Stimulus generation code ships in the repository **before** collection opens.

---

## 6. Design and conditions

**6.1 Within-subject, fully crossed.** Every participant sees every condition × every
stimulus class. Rationale in §4.6.

**6.2 Blinding.** Participants are not told which condition any trial is under, and the
conditions are not labelled or nameable in the interface. The analysis is run on coded
condition labels; the code is broken after the primary analysis is written and committed
(§9.7).

**6.3 Order.** Condition order is randomised per participant; trial order randomised within
block. A Latin square over condition order balances position effects across participants.

**6.4 Conditions — four.**
  - **N** — no correction. Baseline.
  - **O** — OpticQuiz v3 matrix for the participant's screened type, at the participant's
    screened severity.
  - **D** — Fidaner/daltonize at the equivalent severity. The published comparator.
  - **S** — sham (§6.5).

**6.5 The sham, specified now so it cannot be chosen later to lose.** A hue-rotation matrix
constructed to produce a mean per-pixel ΔE2000 shift within ±10 % of condition O on the same
stimulus, in a direction orthogonal to the participant's confusion axis. It must look like
something happened and must not plausibly aid discrimination along the axis that is impaired.
Its construction is code, it ships before collection (§5.7), and its ΔE match to O is
verified per stimulus at generation time and recorded per trial. **If the sham cannot be
built to match within ±10 %, the tolerance is widened once, to ±20 %, and that fact is
reported.** It is not silently relaxed until it works.

**6.6 Session length.** 4 conditions × 3 classes × 8 trials = 96 trials, plus 6 catch =
102 trials. Piloted to sit under 12 minutes. Fatigue is a real threat to a within-subject
design and a long session buys precision we then lose to attrition.

**6.7 Every response is one keypress or one click.** No drag, no fine pointing. The task
must not measure motor skill, and it must be operable by keyboard alone — see §11.2.

---

## 7. Sample size and stopping

**7.1 Target: N = 100 in Group CVD, N = 100 in Group NORM**, after exclusions.

**7.2 Power.** Within-subject contrast, two-tailed, α = .05, power = .80 requires N ≈ 32 to
detect d = 0.50 and N ≈ 65 to detect d = 0.35. N = 100 detects d ≈ 0.28. We set the target
above the minimum because trial-level mixed models with crossed random effects for
participant *and* stimulus are less powerful than the paired-t approximation this calculation
assumes, and because the sham contrast (H3) is expected to be the smallest effect in the set.

**7.3 Stopping rule, fixed.** Collection stops at N = 100 per group **or** 180 days after
opening, whichever comes first. **No interim analysis. No looking at outcome data before the
stopping rule fires.** Only enrolment counts and exclusion rates are monitored during
collection, and those are the only numbers that will be visible to us.

**7.4 Underpowered outcome.** If the 180-day cutoff fires below N = 40 per group, the study
is reported as **inconclusive** with the observed data released in full. It is not written up
as a positive finding at reduced N, and the target is not retroactively lowered.

**7.5 Pilot.** A pilot of ~15 participants runs first, for the sole purposes of (a) fixing
stimulus difficulty per §5.5 and (b) confirming session length. **Pilot data are discarded
and never analysed for outcomes**, and the pilot is run before this document is registered.

---

## 8. Consent, ethics, data

**8.1 This is not a clinical study, it is not a medical device trial, and there is no IRB.**
The author is an independent researcher with no institutional affiliation and no ethics board
oversight. That is a real limitation of this work and it will appear in the limitations
section of anything published from it, not in a footnote.

**8.2** The task carries no foreseeable risk beyond looking at a screen for twelve minutes.
It diagnoses nothing and returns no individual result that could be mistaken for one.

**8.3 Consent is explicit, informed, and separate from the site's normal use.** Plain-language
statement of purpose, duration, what is stored, that it is public research data, and that
participation is optional and abandonable at any point with no consequence. Checkbox, not
implied by continuing.

**8.4 Stored per participant:** screened type; screened severity; group; per-trial condition
code, stimulus class, stimulus seed, sham-match ΔE, correctness, response time; session
completion; debrief answers (§4.5.1, §4.6); a random participant identifier; and a
**day-precision** date. Nothing else.

**8.5 Not stored, ever:** IP address, user agent string, screen resolution, referrer, any
timestamp finer than the day, or any identifier that persists off the participant's device.
A timestamp to the second is a fingerprint; a date is a fact. This is the same rule already
enforced in the Impact Archive schema and it is not relaxed for research convenience.

**8.6 Withdrawal.** Each participant receives a withdraw code at completion. Presenting it
deletes their rows. Withdrawal remains possible until the dataset is frozen (§10.3), which is
stated up front, because promising indefinite withdrawal from a released public dataset would
be a promise we cannot keep.

**8.7 Data release.** The full trial-level dataset is released publicly under CC0 alongside
any write-up. Not on request — released.

---

## 9. Analysis plan

**9.1** Written in full before collection opens, and committed to the repository (§10.2). Any
analysis not described here is exploratory (§9.6), permanently, regardless of how good it
looks.

**9.2 Order of operations, fixed.** Exclusions (§4.4) are applied **before** any outcome is
computed, by a script that reads only exclusion-relevant fields. Exclusion counts and reasons
are reported per group.

**9.3 Primary model — accuracy.** Trial-level mixed-effects logistic regression on class C
trials in Group CVD:

```
correct ~ condition + (1 | participant) + (1 | stimulus_family)
```

Crossed random intercepts for participant and stimulus family. Condition is a four-level
factor with **N** as reference. H1 is the O–N contrast.

**9.4 H2, non-inferiority.** Margin declared now: **O is non-inferior to D if the lower bound
of the 95 % CI on the O−D accuracy difference exceeds −0.05** (5 percentage points). Chosen
before seeing data; a margin chosen afterwards is not a margin.

**9.5 Gating, fixed.** H3 (O vs S) is evaluated **first**. If H3 does not reach significance
at α = .05 in the specified direction, H1 and H2 are reported as **uninterpretable**, and the
study's headline conclusion is that no correction effect was demonstrated. This holds even if
the O–N contrast is large and significant. §3.3 explains why.

**9.6 Exploratory, labelled as such forever:** severity dose-response; response-time models;
classes A and B; per-type breakdown (protan / deutan / tritan); per-stimulus-family effects;
the professionally-diagnosed subgroup as anything other than the §4.5.1 robustness check.

**9.7 Blind analysis.** The analysis script is written and committed against condition labels
coded 1–4 with the mapping withheld. The mapping is revealed, and the script run, in one
commit. The commit order is public and checkable.

**9.8 Multiple comparisons.** Four confirmatory hypotheses. Holm–Bonferroni across H1–H4.

**9.9 Publication commitment.** **The result is published whichever way it goes, including if
it shows our correction does nothing, or does harm.** A null is the most useful thing this
project could contribute to a field full of untested filters, and a pre-registration whose
author only publishes wins is a marketing document with citations. If the finding is that
OpticQuiz's correction does not help people read charts, that finding ships, the site's
claims are rewritten to match, and the filters' descriptions change accordingly.

**9.10** Deviations from this protocol are recorded in `DEVIATIONS.md` with a date and a
reason, at the time they occur, and appear in any write-up. Undated deviations do not exist.

---

## 10. Registration and versioning

**10.1** This document is registered **before** the collection interface goes live —
OSF Registries is the intended venue, timestamped and non-editable after the fact.

**10.2** Registration includes: this file, the stimulus generation code, the sham construction
code, and the analysis script (§9.7).

**10.3** The dataset is frozen when the stopping rule (§7.3) fires. Freeze date recorded.

**10.4** After registration, this file does not change. Changes are additive: a numbered
amendment with a date and a reason, appended, so that the original is always readable as it
stood. §4.4 and §4.6 in particular may not be extended after data are visible.

**10.5** Until §10.1 happens, this document is a draft with no evidentiary standing and must
not be cited, linked as evidence, or referred to as "our study."

---

## 11. What must be true before this can open

**11.1** Site accessibility conformance verified — including keyboard and screen-reader
operation of the D-15, which is the study's own screening instrument. **An inaccessible
screening step would systematically exclude exactly the people least served by the current
state of things, and would make the sample worse in a way no analysis can repair.** This
blocks collection.

**11.2** The task itself operable by keyboard alone, and by screen reader for every part that
is not inherently visual, with the visual judgement stated as such.

**11.3** Stimulus, sham, and analysis code committed and public (§5.7, §10.2).

**11.4** Pilot complete (§7.5) and stimulus difficulty fixed.

**11.5** Consent copy reviewed by someone who is not the author.

**11.6** Registration complete (§10.1).

---

## 12. Known weaknesses, listed by the author

**12.1** Self-selected sample. People who take colour vision tests on the internet are not a
random sample of people with colour vision deficiency. Direction of bias unknown.

**12.2** Screening by the instrument under study (§4.5). Partially mitigated, not solved.

**12.3** Uncalibrated displays (§4.6). Handled by design, not eliminated. Absolute accuracy
rates are not comparable to lab studies; only within-participant contrasts are.

**12.4** No IRB (§8.1).

**12.5** Tritan sample size will almost certainly be too small for anything confirmatory —
tritanopia is rare. Expect to report protan and deutan, and to report tritan as
underpowered rather than to pool it into a "CVD" average that hides it.

**12.6** Twelve minutes of search trials is not "using a filter all day." This measures acute
task performance and says nothing about sustained comfort, eye strain, or whether people keep
the filter switched on. That is a different study.

**12.7** Accuracy on a generated chart is a proxy for reading a real one. Better than ΔE2000,
still a proxy.

---

*Author: Vince Gonzalez. Independent, unaffiliated, unfunded.*
*Draft — not registered — no data collected.*
