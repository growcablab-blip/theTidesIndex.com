# PEPTIDE EXPERIENCE V2 REPORT

Primary-source strengthening, protocol comparison, and the wording discipline
that separates an absence in this register from an absence in the world.

Neither record is published. Neither has been reviewed by a person.
35 test files, 445 tests. Screenshots in `review/peptides-v2/`.

---

## 1 · Primary sources traced

**One, and it was the right one.** SRC-027 — the FDA-approved prescribing
information for EGRIFTA SV (tesamorelin), BLA 022505, Structured Product Label
effective 29 July 2026, retrieved from the regulator's own API.

This is a United States government public record, not a copyrighted work. It is
the first source in this register that may be quoted in full, and the first that
outranks everything else held on its subject.

Five new claims rest on it (TESA-009 … TESA-013) across eight located sections of
the label: indications, dosage, contraindications, warnings, adverse reactions,
description, clinical pharmacology and clinical studies.

**What was not traced.** The two trial publications themselves. The label now
supplies their design, randomisation, comparator, endpoint and measurement
method, so the gap is narrowed rather than closed: this index reports the trials
as the regulator describes them and still cannot check that description against
the papers.

**BPC-157: none.** A deliberate decision rather than an omission — see §3.

## 2 · Claims the primary source modified

This is the part that justifies the exercise. The practitioner handbook is a
careful source, and it was wrong or imprecise in five places that matter.

| | LaValle reports | The FDA label establishes |
|---|---|---|
| **Jurisdiction** | "Theratechnologies, Inc., Canada" | **FDA, United States**, BLA 022505 |
| **Half-life** | 26 min healthy / 38 min HIV+, after 14 days | **8 minutes**, healthy, single dose |
| **Molecular weight** | 5195.908 g/mol | **5135.9 Da** free-base equivalent |
| **Adverse effects** | includes rash, diarrhoea | neither appears in the >5% list |
| **Neoplasms** | "use with caution" | a **Warning**, with instruction to discontinue on recurrence |

The jurisdiction error was this index's own. The handbook printed the
manufacturer's address; the record read it as the approving country. That is a
textbook instance of the failure the whole architecture exists to prevent, and it
survived until an authoritative source was consulted.

**Two new facts the handbook does not carry**, both from the label's Limitations
of Use, and both more useful to this audience than anything else on the record:

> Not indicated for weight loss management, as it has a weight neutral effect.
> Long-term cardiovascular safety has not been established.

The first directly addresses the main reason the compound is discussed outside
its approved population — and it is the approval document saying so.

**LaValle is kept, not replaced.** Each disagreement is recorded on the claim it
affects with `contradicts` evidence on both sides, so a reader sees what a widely
used practitioner reference tells clinicians *and* what governs.

## 3 · The absence wording, corrected

The previous record said BPC-157 has "no human evidence at all". That was an
overreach: it is a statement about the world, and this index had reviewed no
literature that could support it.

Everywhere it now reads as a statement about the register — *"No human study is
currently recorded in the reviewed sources held by The Tides Index"* — and says
so explicitly:

> A PubMed search on 12 September 2026 returned 228 records mentioning the
> compound, none of which this index has obtained or read.

That count is not evidence about BPC-157. It is evidence that the stronger claim
was unsupported. It also sets the honest priority for a future sprint: screen
those records before tracing individual citations, because tracing a handbook's
bibliography while an unreviewed literature sits beside it answers the smaller
question.

A test enforces the distinction, and had to be taught the difference between
*using* the phrase and *mentioning* it — the record contrasts the two wordings
deliberately.

## 4 · Regulatory status

| | Tesamorelin | BPC-157 |
|---|---|---|
| Status | approved | not approved |
| Authority | US Food and Drug Administration, BLA 022505 | none |
| Jurisdiction | United States | not established |
| Source | SRC-027, the label itself | three handbooks that name no product |
| Checked | 12 September 2026 | 12 September 2026 |

A test now requires that any `approved` status names a real authority, a real
jurisdiction, a date, and cites the regulatory source — a practitioner handbook
can no longer stand behind an approval.

## 5 · Protocol experience

Six protocol records: five for BPC-157 from three books, one for tesamorelin.
Each carries context, population, route, formulation, amount as reported,
frequency, duration, monitoring, cautions, evidence type, regulatory context and
an exact locator. Missing stays missing — the comparison prints *"Not stated by
this source"* rather than borrowing from the neighbouring column.

**The comparison view** (practitioner only) puts them side by side and names the
fields that vary: context, population, route, formulation, amount, frequency,
duration, cautions and regulatory context all differ across the five BPC-157
regimens.

It ranks nothing. No recommended column, no consensus row, no ordering by
quality — a test asserts the rendered markup contains none of *Recommended,
Best, Preferred, Consensus, Typical dose*.

**Every regimen carries an evidence-context badge.** All six currently read
PRACTITIONER HANDBOOK. A clinic must never take that for a trial-validated
regimen, and the badge is on the column header rather than in a citation
underneath.

## 6 · Disagreements

Three, all preserved rather than resolved:

- **BPC — how much.** Three books, three regimens, no cited study for any.
- **BPC — cancer.** One source advises caution in cancer and reports anti-tumour
  effects in the same entry. Both recorded; neither collapses the other.
- **Tesamorelin — how much**, inside one source: the manufacturer's amount and a
  lower one used "based on cost effectiveness", which is an economic argument
  rather than an evidential one.

## 7 · Patient safety — two more leaks found and closed

Both found by tests written for this sprint, and both real.

**The practitioner summary was in every patient payload.** It is the densest
prose on the record and it carries doses, concentrations and reconstitution
detail — on tesamorelin it named the labelled dose. It was loaded in both modes
and simply not rendered in simple mode. One changed component, one debug view or
one print stylesheet away from being read. Now null in the query.

**The label's dose reached patient-facing claim text.** Claims render in both
modes, so `claimText`, `plainLanguageText`, `interpretationNotes` and
`uncertaintyText` are all patient-facing. Adding FDA claims put "1.4 mg" and a
vial composition into them. Stripped; the figures live in the practitioner
summary, which patient mode no longer receives.

Together with the three closed in the previous sprint, the patient boundary has
now failed five times — each time in a path that did not exist until real content
arrived. That is the argument for the tests, not against the design.

## 8 · Locators

**SRC-005 resolved honestly.** Its printed-page offset could not be established
from the artifact, so its two locations record **file pages of the held copy**
and say so in the locator text, with `page_start` left null rather than filled
with a guess. A test asserts this: no printed page is claimed where none was
verified.

**SRC-027 has no pages at all.** A Structured Product Label is sectioned, not
paginated, so locators are section references — `§14 Clinical Studies` — pinned
by set id and effective date.

## 9 · Simple / Practitioner

| | Simple | Practitioner |
|---|---|---|
| Summaries | plain-language only | full practitioner summary |
| Doses, concentrations, formulation strengths | none | as reported |
| Disagreement positions | "shown in the practitioner view" | full text |
| Route detail | route and context | formulation, PK, bioavailability |
| Protocol comparison | not shown | side by side |
| Evidence, gaps, provenance | shown | shown |

Evidence and gaps are *not* a practitioner privilege. What differs is regimen
detail, not whether a reader is told what is known.

## 10 · What was not done

Stated plainly, because the brief asked for more than this sprint delivered.

- **§12 BPC-157 primary trace — not attempted.** The right first step is a
  literature screen, not a citation chase; §3 explains why, and doing it properly
  is a sprint of its own.
- **§16 visual modules** — no mechanism diagram, development timeline, route map
  or body-system illustration. The at-a-glance panel and the comparison table are
  the only new visual structures.
- **§17 practitioner print sheets** — not built. The print stylesheet works and
  disclosures open when printing, but there is no reference-sheet layout.
- **§18 search** — not extended or tested against the listed queries.
- **§4 descriptive states** — the at-a-glance panel still mixes counts with
  descriptive states rather than being fully descriptive.

## 11 · Screenshots

`review/peptides-v2/` — ten captures: both compounds in both modes at desktop and
mobile, plus the protocol comparison table and the tesamorelin evidence section.

## 12 · Tests added

`tests/integration/peptide-experience.test.ts`, 14 tests: absence wording bounded
to the register; label and handbook separately attributed; contradictions
recorded rather than dropped; approved status requires authoritative provenance;
no approval without a regulatory source; comparison ranks nothing; every regimen
labelled; missing stays missing; no merged protocols; doses, concentrations and
regimen detail absent from patient mode; protocol records still announced to
patients; gaps render on both; locator type preserved; route reported without
implying recommendation.

Two existing source suites were narrowed rather than bent: a public regulatory
record may have its full text published and may exist without a file on disk,
neither of which was true when every source was a copyrighted book.

## 13 · Remaining evidence gaps

**Tesamorelin** (6): regulatory position outside the US; the trial publications;
anything outside the approved indication; long-term use; any route but
subcutaneous; what the cognitive findings mean.

**BPC-157** (7): any human effect; oral bioavailability; an effective amount;
human safety; the cancer contradiction; regulatory position; the primary
literature behind every mechanism.

## 14 · Recommended next

**Not peptide #3.** Two things first, in order:

1. **The BPC-157 literature screen.** 228 indexed records sit beside a record
   that says no human study is held. Screening them is the highest-value work
   available on either compound, and it is what makes the absence claim either
   stronger or obsolete.
2. **Finish the experience work this sprint left** — §16, §17, §18 above.

Peptide #3 after that, with the template these two now define.
