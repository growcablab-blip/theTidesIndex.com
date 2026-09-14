# Retatrutide deep evidence report

14 September 2026 · branch `phase-a-foundation` · not deployed, noindex intact,
nothing published, no compound added.

Retatrutide was extracted on 13 September at abstract level. This upgrade reads
every lawful primary document that could be obtained, keeps each kind of
document distinct, and records where they disagree. Trial dose arms are held as
study-design data at practitioner depth only; patient payloads carry none, and
a unit test and an integration test both fail if an arm amount reaches text a
patient receives.

The data lives in:

- `data/seed/evidence/retatrutide.json` — claims, locations, gaps, funding.
- `data/seed/trials/retatrutide-trials.json` — trials, their documents, and the
  comparisons between documents (built by `scripts/evidence/build-retatrutide-trials.py`
  from the committed registry snapshots in `data/sources/registry/`).
- Migration `0026_trials_artifacts_resolution.sql` — `clinical_trials`,
  `trial_documents`, `trial_source_comparisons`, gap resolution states.

## TRIALS IDENTIFIED

Five registered trials with published or registered human results. Each is
counted once, however many documents describe it.

| Trial | Phase | Population | Enrolled | Registry results |
|---|---|---|---|---|
| NCT03841630 | 1 | Healthy participants, single dose (Singapore, 1 site) | 45 | None posted |
| NCT04143802 | 1b | Type 2 diabetes, 12 weeks (US, 4 sites) | 72 | None posted |
| NCT04867785 | 2 | Type 2 diabetes, 36 weeks (43 site entries) | 281 | Posted 3 Jul 2023 |
| NCT04881760 | 2 | Obesity or overweight without diabetes, 48 weeks (28 site entries) | 338 | Posted 13 Sep 2023 |
| NCT06354660 (TRANSCEND-T2D-1) | 3 | Type 2 diabetes on diet and exercise, 40 weeks (48 sites) | 537 | None posted |

The link between NCT03841630 and the single-dose study in the discovery paper
(Coskun 2022) is **unconfirmed**: neither document names the other. It is
recorded as unconfirmed and the two are not merged.

The earlier registry search (SRC-054, 34 registered studies) remains the source
for the shape of the development programme, including the outcomes and
head-to-head trials that have not reported.

## FULL TEXTS HELD

| Source | Document | Read |
|---|---|---|
| SRC-050 | Jastreboff et al., N Engl J Med 2023;389:514–26 — phase 2 obesity (NCT04881760) | In full, 13 pages |
| SRC-051 | Sanyal et al., Nat Med 2024;30:2037–48 — MASLD substudy of NCT04881760 | In full, 31 pages incl. Methods and Extended Data |

Both were supplied by the owner and are registered with hashes. The NEJM
Supplementary Appendix and the protocol posted at NEJM.org are **not held**:
nejm.org refused this index's request (HTTP 403). The owner's NEJM slide set
was received and recorded as supplementary material; it repeats the article's
figures and is not cited.

## ABSTRACT-ONLY PUBLICATIONS

FULL TEXT NOT HELD for each of these. Every location on them says abstract.

| Source | Publication | Trial |
|---|---|---|
| SRC-047 | Coskun et al., Cell Metab 2022 — discovery and single-dose study | NCT03841630 (unconfirmed) |
| SRC-048 | Urva et al., Lancet 2022 — phase 1b | NCT04143802 |
| SRC-049 | Rosenstock et al., Lancet 2023 — phase 2 type 2 diabetes | NCT04867785 |
| SRC-052 | Bajaj et al., Lancet 2026 — TRANSCEND-T2D-1 | NCT06354660 |
| SRC-132 | Coskun et al., Lancet Diabetes Endocrinol 2025 — body composition substudy | NCT04867785 |
| SRC-133 | Ruotolo et al., Diabetes Obes Metab 2026 — post hoc biomarkers | Both phase 2 trials |
| SRC-134 | Goetz et al., Obesity Pillars 2025 — qualitative exit interviews | NCT04881760 |
| SRC-135 | Kanu et al., Adv Ther 2026 — eating-behaviour questionnaire development | NCT04881760 |
| SRC-136 | Kanu et al., Obes Sci Pract 2026 — weight-and-emotions scale development | NCT04881760 |
| SRC-053 | Case report, 2026 — online-sourced product | Not a trial |

SRC-134 to SRC-136 are linked to their trial but contribute no efficacy or
safety claim; two of them are instrument-development papers.

## PROTOCOLS HELD

Downloaded directly from ClinicalTrials.gov's document server.

| Source | Protocol | Version |
|---|---|---|
| SRC-127 | J1I-MC-GZBD, NCT04867785 | Amendment (c), approved 29 Aug 2022 (history: original 19 Feb 2021; a, 1 Mar 2021; b, 10 May 2021) |
| SRC-130 | J1I-MC-GZBF, NCT04881760 | Amendment (b), approved 29 Aug 2022 (history: original 26 Feb 2021; a, 21 May 2021) |

Both are **final amendments approved after primary completion**. What was
prespecified before unblinding can be read only from their amendment histories;
earlier versions are not held. The owner's `NCT04867785.csv` was not in the
intake folder; the two document links quoted in the brief were used directly,
and the obesity trial's documents were found from its registry record.

## SAPS HELD

| Source | Statistical analysis plan | Version |
|---|---|---|
| SRC-128 | J1I-MC-GZBD | Version 3.0, approved 13 Dec 2022 (v1.0 3 Dec 2021; v2.0 7 Apr 2022) |
| SRC-131 | J1I-MC-GZBF | Version 4.0, approved 15 Dec 2022 |

## REGISTRY RESULTS

Posted structured results are held for both phase 2 trials (SRC-126, SRC-129),
retrieved from the ClinicalTrials.gov API on 14 September 2026 with snapshots
committed. No results are posted for the phase 1, phase 1b or phase 3 trials.

What the registry adds that the abstracts do not: participant flow with reasons
for leaving, every posted outcome measure with its analysis population and
comparisons, and adverse-event tables by group.

## SUBSTUDIES

| Substudy | Of | Held |
|---|---|---|
| MASLD liver-fat substudy, 98 participants (SRC-051) | NCT04881760 | Full text |
| DXA body-composition substudy, 189 enrolled, 103 with both scans (SRC-132) | NCT04867785 | Abstract |
| Post hoc lipoprotein and inflammatory biomarkers (SRC-133) | Both phase 2 trials | Abstract |

None is counted as a trial. Replication rows now say so in their basis.

## SUPPLEMENTS AND CONFERENCE MATERIAL

Searched on 14 September 2026, following the owner's direction to use the whole
evidence ecosystem rather than stop at paywalls. Only legitimate, freely served
copies were used. Where a site refused, the refusal was recorded and not worked
around.

- **Supplements.** None obtained.
  - The Lancet article pages for Rosenstock 2023, Urva 2022, Bajaj 2026 and
    Coskun 2025 refused access (HTTP 403), so their appendix links could not be
    reached.
  - nejm.org refused the NEJM Supplementary Appendix earlier.
  - Europe PMC, Unpaywall and Crossref list no free copy of any of these
    articles or their supplements.
  - Cell Metabolism 2022 (the discovery paper) is listed by Unpaywall as open
    access under CC BY-NC-ND, but the publisher refused the request and the
    paper is not in PMC. It stays at abstract level.
- **Conference material.** Seven American Diabetes Association abstracts were
  found in the journal's supplements, with their text read from the publisher's
  Crossref deposit because the journal site refused access.
  - Two are now registered and cited.
    - **104-OR (2021, SRC-149)** — the first-in-human single-dose study: 45
      healthy participants; dose-dependent heart-rate increases returning to
      near baseline by day 29; terminal half-life about 7 days.
    - **340-OR (2022, SRC-150)** — the phase 1b study in type 2 diabetes: heart
      rate rose within most retatrutide cohorts and with dulaglutide, not with
      placebo.
  - Neither gives a registry number. Their participant counts match
    NCT03841630 and NCT04143802, so each is attached to its trial as conference
    material with the link **unconfirmed**. Both are cited on RETA-009 at
    abstract depth.
  - The other five were read and not used this round:
    - **679-P** is laboratory and animal work. Its receptor potency ratios differ
      from those the NEJM article cites from the discovery paper. The assays may
      differ, so this is noted, not reconciled.
    - **754-P** is a post hoc analysis of kidney markers (eGFR, albuminuria)
      across both phase 2 trials. It bears on the open "cardiovascular and kidney
      outcomes" question but reports markers, not outcomes, so the gap stays
      open. It is the first candidate for the next pass.
    - **753-P** (eating behaviour), **266-OR** (beta-cell and insulin-sensitivity
      markers) and **117-OR** (lipidomics) are exploratory secondary analyses.
      None bears on a recorded gap.
  - Five abstracts in *Diabetologie und Stoffwechsel* (2022–2025) sit behind a
    bot check and were not read.
- **Registry corroboration.** The same search re-read the posted participant
  flow and adverse-event modules for both phase 2 trials. The registry's
  "withdrawal due to adverse event" counts study withdrawal, which is not the
  same thing as the articles' discontinuation of treatment, so the two are not
  compared as if they were.

Absence of a supplement here means none could be obtained legitimately, not
that none exists.

## SOURCE HIERARCHY: WHAT THE DOCUMENTS SHOW TOGETHER

No document outranks another. Recorded comparisons (15 across the two phase 2
trials), each against two exact locations:

**Differ**

- **Obesity trial, 24-week weight.** Four group values differ between NEJM
  Table 2 and the posted results (by 0.1 to 0.36 points); the rest agree to
  rounding. Neither document explains why. All 48-week values agree.
  Recorded as dose-specific, so patient mode never receives it.
- **Type 2 diabetes trial, 24-week HbA1c.** The placebo value is −0.01% in the
  abstract and −0.05% in the registry; one retatrutide value differs by 0.01.
  Neither explains it.
- **Type 2 diabetes trial, sites.** 42 centres in the abstract; 43 site entries
  (40 US, 3 Puerto Rico) in the registry.
- **Interim analyses, type 2 diabetes trial.** The protocol describes one week-16
  interim analysis. The SAP describes three, states that the second and third
  "were planned after the approval of the protocol", and that the third was
  requested by the sponsor's senior management to support end-of-phase-2
  regulatory interactions.
- **Interim analyses, obesity trial.** The protocol states that no interim
  analyses are planned (and allows adding one without amendment); SAP version
  4.0 documents a third interim analysis requested on the same basis; the article
  refers to interim 24-week analyses.
- **Enrolment, obesity trial.** About 300 planned, 338 enrolled. The substudy's
  Methods explain the over-enrolment (to reach the MASLD target); the main
  article does not mention it.

**Agree**

- 48-week weight values and threshold proportions (obesity trial).
- Completion counts (both trials).
- Deaths (obesity trial: one, judged unrelated by the investigator, adjudicated
  as undetermined).
- Acute pancreatitis (obesity trial): one serious event in a retatrutide group in
  both the article and the posted results.
- No data monitoring committee (protocol and registry), and no multiplicity
  adjustment (protocol and SAP).

**Not directly comparable**

- The obesity trial had external adjudication committees for deaths and selected
  events. These are not a data monitoring committee, and the record says so.
- Skin sensitivity (obesity trial): the article groups related terms as a
  percentage; the registry lists separate terms above a 5% threshold. Both point
  the same way (more frequent with retatrutide), but the size cannot be
  reconciled from the two.

## FUNDING/CONFLICTS

- Every trial and every derived publication is sponsored or funded by Eli Lilly
  and Company. Recorded as context; nothing scores a study by its sponsor.
- **SRC-050 moved from "not checked" to industry**, located to the article's
  funding line, with the sponsor's stated role (designed and oversaw the trial,
  site monitoring, data collation and analysis; first draft by the first author
  and a sponsor-employed last author). Individual author disclosures are only
  on NEJM.org and were not obtained, so they are not recorded.
- SRC-051 disclosure now located to the article's competing-interests section.
- New rows: registry sponsor records (SRC-126, SRC-129), body-composition
  substudy (funding sentence and all-employee disclosure), biomarker analysis
  (grant list names the sponsor; no conflict statement in the record — recorded
  as not checked, which is not "none declared").

## WHAT CHANGED

**Claims** (8 → 15)

- RETA-001 — molecule described from the protocols (39-residue peptide
  conjugated to a C20 fatty acid); potency ratios relative to endogenous ligands
  from the NEJM article, traced as a citation of the discovery paper.
- RETA-003 — obesity efficacy upgraded to full text (Table 2) and posted results.
- RETA-004 — type 2 diabetes efficacy gains posted registry results.
- RETA-005 — safety rewritten from the full text: adverse-event discontinuation
  6–16% versus none, serious adverse events 4% in both groups, no clinically
  significant hypoglycaemia; registry adverse-event tables for the diabetes trial.
- RETA-006 — MASLD upgraded to full text, now including that ALT, AST, FIB-4
  and ELF did not change consistently and that there was no histology.
- **New:** RETA-009 heart rate and arrhythmia events; RETA-010 skin sensitivity
  (text and table give 7% and 6%, both recorded); RETA-011 antidrug antibodies
  (9%, effect not reported); RETA-012 study design and oversight from the
  protocols and SAPs; RETA-013 body composition (abstract); RETA-014 lipoprotein
  and inflammatory biomarkers (post hoc, abstract); RETA-015 serious and common
  adverse events in the type 2 diabetes trial, read from the posted registry
  tables because the article is held at abstract level only — the posting has a
  5% threshold for non-serious events and no heart-rate data, so both limits are
  stated on the claim.

**Evidence traces.** Obesity-trial and MASLD rows are now `full_text_supports`
with a note; registry, protocol and SAP rows are `primary_source_is_cited`.

**Research questions and gaps.** None deleted. Of the eight existing gaps, seven
are recorded as still open with a checked note and one as partially resolved:

| Gap | State |
|---|---|
| Cardiovascular and kidney outcomes | Open |
| Independent replication | Open |
| Any non-weekly schedule | Open |
| After stopping, and cycling | Open |
| Composition of products sold outside trials | Open |
| Type 1 diabetes | Open |
| Fat versus lean mass lost | **Partially resolved** (body-composition substudy, abstract) |
| Head-to-head comparisons | Open |

**Disagreement RETA-D-003** ("almost all fat") gains the human body-composition
position; still unresolved pending lean-mass values.

**Protocols.** The phase 2 obesity study-design row now rests on the full text:
escalation every four weeks up to twelve, lifestyle counselling, four-week
follow-up, protocol-driven dose reductions at low BMI. Practitioner-only.

**Pages and publications.** The record page has a new "The trials behind this
record" section; practitioner depth shows the statistical plan, oversight, arms
and document comparisons, simple depth shows trials and documents only. The
retatrutide reference sheet and the Reference Guide are regenerated from the
records.

## WHAT STILL NEEDS FULL TEXT

Each is a recorded gap naming exactly what it would settle.

1. **Rosenstock et al., Lancet 2023** — heart rate, adverse events of special
   interest and discontinuations for adverse events by group in the type 2
   diabetes trial; the registry does not post them.
2. **Bajaj et al., Lancet 2026** — adverse events of special interest, heart rate
   and discontinuation detail for TRANSCEND-T2D-1; no registry results.
3. **Urva et al., Lancet 2022** — pharmacokinetic parameters beyond the half-life,
   and per-cohort safety; no registry results.
4. **Coskun et al., Lancet Diabetes Endocrinol 2025** — lean-mass values.
5. **NEJM Supplementary Appendix (Jastreboff 2023)** — 24-week secondary results
   and estimand analyses that may explain the article–registry differences.
6. **Coskun et al., Cell Metab 2022** — to confirm or refute the NCT03841630 link.

The record is not blocked on any of these. It says what each would add.
