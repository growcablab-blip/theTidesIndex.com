# Owner decisions required

Non-blocking questions logged during the master expansion run. None of these
stopped work: in each case the index took the conservative option, recorded it,
and continued. Each needs an owner's answer before it becomes permanent.

Newest at the bottom.

---

## D-01 · Two records where practitioners see one compound

**What was done.** Thymosin beta-4 and TB-500 are now separate compound records
(`thymosin-beta-4`, `tb-500`). The analytical literature identifies TB-500 as
Ac-LKKTETQ, a seven-residue fragment of the 43-residue parent, and evidence does
not cross between the records.

**Why it needs you.** Practitioners and most search traffic treat these as one
compound. Two pages is the correct representation of the chemistry and will
surprise readers. The alternative — one page with two identity sections — was
rejected because it makes cross-contamination of evidence a matter of editorial
discipline rather than structure.

**Default if unanswered.** Keep two records.

## D-02 · Search only indexes published records, and nothing is published

**What was done.** Section routing ("TB-500 protocols" → protocols section) is
built and tested as a pure function. It is not visible on the running site,
because search indexes published records only and no compound is published.

**Why it needs you.** Making it visible means either publishing a record (which
requires human scientific review that has not happened) or indexing unpublished
records in development (which weakens a boundary that currently has no
exceptions). The index did neither.

**Default if unanswered.** Leave search publish-only.

## D-03 · A new evidence type, classed as preclinical

**What was done.** `analytical_characterisation` was added for laboratory
measurements of what a substance *is* (mass spectrometry of a formulation). It
is classed `preclinical` because the evidence-class enum has only human,
preclinical and reference/opinion, and preclinical is the only class that can
never be read as evidence about people.

**Why it needs you.** It is not really preclinical evidence of effect. A fourth
evidence class (`characterisation`) would be more accurate and touches every
evidence-class filter in the product.

**Default if unanswered.** Keep it under preclinical.

## D-04 · Route taxonomy has no intraperitoneal or ophthalmic key

**What was done.** Rat intraperitoneal dosing is recorded under
`intramuscular` and ophthalmic eye drops under `other`, each with the real route
stated in the population or formulation field.

**Why it needs you.** Adding route keys is a taxonomy change visible on
`/routes`. It is cheap and correct; it was not done mid-sprint because it is a
public vocabulary change.

**Recommendation.** Add `intraperitoneal` and `ophthalmic`.

## D-05 · Full texts behind publisher paywalls

**What was done.** Twenty journal sources are recorded as `abstract_held`:
the abstract was retrieved and read, the full text was not obtained. Every
locator on those sources says "Abstract".

**Why it needs you.** Institutional or publisher access is a purchasing
decision. The brief prohibits buying services without authorisation.

**Answered, 13 September 2026.** The owner will obtain a source when it is
named specifically. This is no longer a blocked decision but a queue: the
exact acquisition targets, with titles, journals, years and PubMed
identifiers, are in `docs/OWNER_SOURCE_ACQUISITION_QUEUE.md`, headed by full
texts for the five retatrutide trials and the three BPC-157 human studies. Until a full text arrives the record stays at abstract level
and says so.

## D-06 · SRC-016, Tremblay / CanLab, is not held

**What was done.** The brief names Tremblay among the practitioner sources to
search for protocols. The source is registered as `pending` and no file exists.
No protocol has been attributed to it.

**Needed.** The dossier itself, if it is to be cited.

## D-07 · Translation of non-English literature

**What was done.** Language is recorded on every screened record. No machine
translation has been used as evidence.

**Why it needs you.** Semax and Selank have a substantial Russian-language
literature. Machine translation for *screening* (deciding what a record is) is
defensible; machine translation as *quoted wording* is not. A policy line is
needed on whether machine-translated abstracts may be screened, and on whether
professional translation of key papers is authorised.

**Default if unanswered.** Screen on English abstracts where PubMed carries them;
mark every non-English record as `original language, English abstract only` or
`not translated`; quote nothing that has not been verified.

## D-08 · Scope of the master expansion run

**What was done.** The run is proceeding in the order the brief gives, committing
each phase separately so that each is reviewable on its own.

**Why it needs you.** Seven further peptide records, a protocol library, a
manufacturing experience and five publications is several weeks of evidence work
at the standard the first four records set. The index will not lower that
standard to reach the end of the list; where a record is necessarily thinner it
will say so on the record and in the final report.

## D-09 · SRC-007 printed page offset recorded as 5

**What was done.** Kruger & Albericio (SRC-007) had no registered printed-page
offset. Reading the running page numbers across file pages 51–160 showed printed
= file − 5 throughout (file p. 51 prints 46; file p. 160 prints 155). The
registry now records `printed_page_offset: 5`, and the manufacturing packets cite
printed pages with the file page alongside. `npm run evidence:locators` resolves
all 65 held locators with none failed.

**Why it needs you.** It is a change to the source registry. It is reversible and
evidenced, so work continued.

## D-10 · Manufacturing stages with no usable source

**What was done.** "From sequence to final vial" is live in preview with 11 of 15
stages sourced (Grant, Kruger & Albericio, ICH Q7). Formulation, fill and finish,
lyophilisation as a process, and finished-product release testing are shown as
**source needed**, not written from general knowledge.

**Needed.** Genuine copies of SRC-013 (Costantino & Pikal, lyophilisation) and
SRC-014 (Banga, formulation), both currently the wrong file; a finished-product
GMP or sterile-manufacturing reference; compendial sterility and endotoxin
chapters (already D-05 territory). Acquiring any of these is a purchasing
decision.

**Answered, 13 September 2026.** The owner will obtain these when they are
named specifically. The four stages stay marked source needed until the
replacements arrive, and a test (`tests/unit/sequence-to-vial.test.ts`) pins
them as unsourced so they cannot be quietly filled. What is needed, exactly:
a genuine copy of Costantino & Pikal on lyophilisation (SRC-013 is a two-page
contents listing), a genuine copy of Banga on therapeutic peptide formulation
(SRC-014 is the wrong work), a finished-product sterile-manufacturing
reference, and the compendial sterility and bacterial endotoxin chapters.

## D-11 · A regimen table that names no route is recorded under "other"

**What was done.** The Campbell cheat sheet (SRC-004) gives vial size, reconstitution
volume and insulin-syringe units but never names a route. The TB-500 record had
inferred subcutaneous from the syringe. That inference is now removed: the
TB-500, retatrutide and GHK-Cu cheat-sheet regimens are recorded under route
`other`, and each says the source names no route. The consequence is visible on
`/protocols`: filtering by subcutaneous no longer shows regimens whose source
never said subcutaneous.

**Why it needs you.** An insulin syringe is used subcutaneously in ordinary
practice, and a clinician may prefer the inference. It is still an inference.

**Default if unanswered.** Keep `other`. Where a source names the route, the
record uses it.

## D-12 · "CJC-1295 without DAC" is a separate record: Modified GRF (1-29)

**What was done.** The originator's CJC-1295 (ConjuChem, 2005) is hGRF(1-29)
with an added maleimidopropionamide lysine that binds albumin; the 2006 human
trials used that molecule. Handbooks and sellers use "CJC-1295 without DAC" for
the 29-residue core peptide, which has no albumin-binding group, and a seized
product sold as "CJC-1295" was analysed and found to be that shorter peptide.
Following the TB-500 precedent, the register now holds two records —
`cjc-1295` and `mod-grf-1-29` — and no evidence crosses between them. The
cohort count moved from 11 to 12 for that reason.

**Why it needs you.** Adding a record to the register is an editorial decision.
Merging them would put the 2006 trial evidence behind vials that do not contain
the trial molecule.

**Default if unanswered.** Keep two records.

## D-13 · Russian-language literature read through English abstracts only

**What was done.** Semax (88 of 215 records) and Selank (32 of 72) have large
Russian literatures. Applying the D-07 default: every Russian-language record
was classified from the English abstract PubMed carries, or from its English
title where there is no abstract, and every such source says so on its
manifest entry and locator. No machine translation was used and nothing is
quoted from Russian text. Where an English abstract omits a design detail
(randomisation, blinding, dose, route) the record says "not stated" rather
than inferring it. The Selank clinical doses, for example, are recorded as not
stated because the abstracts do not give them.

**Why it needs you.** The full texts would settle design and dosing questions
that the abstracts leave open, and reading them requires a qualified Russian
reader or professional translation.

**Default if unanswered.** Keep abstract-level extraction and the not-stated
markers.

## D-14 · A public research agenda and an evidence-shaped compound index

**What was done.** Two cross-register pages were added. `/research` lists
every research question derived from a recorded gap (63 across 10 records),
grouped by kind of question and alphabetical within each group, under the
heading "Questions for research, not suggestions to try". The compound index
gained a "Discover by evidence" table: research area, whether any human record
was found in the literature screen, preclinical record count, routes recorded,
where regimens come from (label, human study, handbook), the furthest any
finding has been replicated, and open questions. It sorts alphabetically, has
no score column, and selects no dosing fields. "Research" was added to the
main navigation. Both pages stay noindex.

**Why it needs you.** Putting a research agenda in the main navigation is a
product-positioning choice. Showing screen counts next to each other invites
comparison even without a ranking.

Tesamorelin and BPC-157 predated the research-question field and have since
been filled in: 76 of the 86 compound gaps now carry a question, across all 12
records. The remaining ten carry none, and deliberately — they are gaps in *access* (a full text
behind a paywall, an archived label, which study a figure belongs to) rather
than gaps in knowledge. Those are work for this index, not questions for
researchers.

**Answered, 13 September 2026.** Keep Research in the primary navigation.
Both pages stay, and the directory no longer compares records by paper count:
the owner's second decision of the same date rules out raw literature counts
as a side-by-side comparison mechanism, so the directory describes each
dimension in words and the counts remain on the records, next to the database
and search date that produced them.

## D-15 · Funding absent from a PubMed record is recorded as "not checked"

**What was done.** Funding and conflict disclosures were read from the PubMed
record of every cited study: its grant list, its conflict statement, and any
funding sentence in the abstract. Fourteen sources disclosed something — five
retatrutide trials authored by Eli Lilly employees, NIH-funded work behind
several CJC-1295 and MOTS-c records, two MOTS-c papers whose authors consult
for the company developing the compound, and one Hellenic Diabetes Association
grant. The other 76 disclosed nothing in the record consulted, and those are
stored as `not_checked` with a note naming what was read, rather than as
`none_declared`.

**Why it needs you.** The distinction is the whole value of the field. "No
funding was declared" is a finding about a study; "we did not read the full
text" is a fact about this index. Coding the second as the first would
manufacture 76 findings. The cost is that funding coverage looks thin, which is
accurate.

**Default if unanswered.** Keep `not_checked`, and upgrade records as full
texts are obtained.

## D-16 · Understanding Peptides ships with five chapters written and seven briefed

**What was done.** Chapters eight to twelve are written: understanding
evidence, safety and uncertainty, quality and testing, questions to ask your
clinician, and how to use the index. Four rest on the editorial method and the
product; the quality chapter rests on claims extracted from a peptide
chemistry textbook and ICH Q7. Chapters one to seven — what a peptide is,
amino acids, peptides in the body, signalling, receptors, why peptides are
studied, routes — remain briefs, because this index holds no extracted
biochemistry, physiology or pharmacology source and writing them would mean
composing science from general knowledge.

**Why it needs you.** It is a publication decision: a patient-facing volume
that is five-twelfths written can either wait or ship as a draft that says
which parts are missing and why.

**Default if unanswered.** Keep the briefs visible and acquire a biochemistry
and a pharmacology reference before writing them.

## D-17 · "Ready for review" is a mechanical result, not a quality judgement

**What was done.** `npm run readiness` checks six things per record: that every
citation resolves to a location, that claims about people cite the research or
an abstract of it rather than a handbook's account, that safety claims have
been traced at all, that every regimen names its source, that gaps and research
questions exist, and that funding context has been captured for the study
sources. All twelve records now pass. The command prints, under the table, that
passing is not review.

**Why it needs you.** "12 of 12 ready" is exactly the sentence somebody will
quote out of context. It means a reviewer will not waste their first hour
finding missing locators. It does not mean any statement is correct.

**Default if unanswered.** Keep the wording, and never surface the figure
without the caveat.

## D-18 · Primary-source tracing is derived by source type, and says so

**What was done.** Each of the 234 evidence rows now carries how far it has
been traced: the research cited directly, held at abstract level, or a
secondary source whose citations have not been obtained. The states were
derived from the source register — what kind of source it is and whether the
full text is held — and each row records the rule that produced it. Full-text
verdicts (supports, partially supports, does not support, different context)
are never derived: the database refuses one without a note, and only a person
who read the paper can set it.

**Why it needs you.** A reviewer may disagree with a category rather than with
400 individual decisions, which is the point of deriving them. The current
distribution is 114 abstract-level, 94 secondary, 26 citing the primary source.

**Default if unanswered.** Keep the derivation and record hand-set verdicts as
full texts are read.

## D-19 · Methodology left the primary navigation for the Learn hub

**What was done.** Primary navigation is now Learn, Peptides, Protocols,
Research, Quality, Sources. Methodology, how evidence is classified, editorial
policy and coverage sit under Learn and in the footer.

**Why it needs you.** Methodology is the argument for trusting the index, and
it is now one click further away. The reasoning is that navigation should
reflect what a reader arrived to do, and nobody arrives to read a methodology.

**Default if unanswered.** Keep the current arrangement.

## D-20 · Reviewer identity: the data model is ready, the entry form is not

**What was checked, 13 September 2026.** The owner has a reviewer available and
asked that the system be prepared so identity and credentials can be entered
cleanly later, without onboarding anyone yet.

Nothing needed building. `profiles` already carries display name, email, staff
role, an active flag that preserves audit history rather than deleting people,
and a reviewer-standing block: professional role, review domain, organisation,
a one-or-two-line credential summary, and a three-state conflicts-disclosed
field with notes and a date. The three states are the point — null means
nobody asked, which is not the same as a reviewer stating they have none.

`reviews` enforces the rest: a human review must name a person, an automated
check must name a tool, never both and never neither, and automation is
barred at the database level from recording a scientific, clinical or
compliance approval. It can only ever record a source check or a primary
verification.

**What is missing.** There is no admin screen. Entering a reviewer today means
a seed file or SQL. That is a small form over an existing table, and it is the
only work between here and a named reviewer approving a record.

**Recommendation.** Build the form when the reviewer is ready to start, not
before — it is an hour of work and it would otherwise sit unused while the
schema it writes to is already correct.

## D-21 · USP <71> and <85> research copies are now used, on your instruction

**What was done, 14 September 2026.** Your batch brief asked for the Scribd
copies of USP <71> and <85> to be ingested with their provenance recorded.
That reverses the 11 September refusal under V-017 and V-018, which held that
only a licensed USP-NF copy could be used. The copies are registered as held
research copies: content appears to reproduce the USP-NF chapter, distribution
provenance unverified, not an official artifact obtained from USP, never
redistributed. Every claim resting on them says so, and a unit test fails if
any record describes them as official.

**Why it needs you.** The <85> print names the subscriber who printed it and
says "Do not distribute"; both were printed from someone else's subscription.
Using them is your call, and it is recorded as yours.

**Default if unanswered.** Keep using them as labelled; replace both with
licensed USP-NF copies when a subscription is available.

## D-22 · Rang and Dale is a 40-page Spanish proof sample

**What was done.** The file is the 10th edition in Spanish translation, but
only its front matter and chapter 2. Sixteen general receptor claims were
extracted from chapter 2 as paraphrases of the Spanish text, each marked for
re-checking against the English edition. Nothing on signalling or
pharmacokinetics may rest on it, because those chapters are absent.

**Why it needs you.** The English 10th edition (ISBN 9780323873956) would
materially improve extraction: it holds the missing chapters, and the Spanish
sample carries at least two printing errors and a publisher disclaimer of the
translation.

**Default if unanswered.** Keep chapter Five of Understanding Peptides resting
on the Spanish sample, labelled; leave chapters on signalling and routes as
briefs.

## D-23 · Journal and registry figures are shown side by side, not reconciled

**What was done.** For both phase 2 retatrutide trials, the article, registry
record, posted results, protocol and statistical plan are separate sources
under one trial. Where they differ — four 24-week weight values in the obesity
trial, the 24-week placebo HbA1c in the diabetes trial, the number of sites —
both figures are recorded with their exact locations and neither is preferred.

**Why it needs you.** A reviewer may prefer a policy such as "the article's
figure is quoted, the registry's is shown as a difference". The current rule
quotes neither over the other.

**Default if unanswered.** Keep both, and keep the difference visible.

## D-24 · Documents this index tried and could not obtain

- **NEJM Supplementary Appendix and protocol for the obesity trial.** Refused
  by nejm.org (HTTP 403). They hold the 24-week secondary results and the
  estimand analyses that might explain the article–registry differences.
- **NCT04867785.csv.** Not present in the intake folder. The protocol and
  statistical plan links quoted in the brief were used directly instead.
- **Full texts** of Rosenstock 2023, Urva 2022, Bajaj 2026, Coskun 2022 and
  Coskun 2025 (body composition). Each gap names what it would settle.

**Default if unanswered.** Records stay at their current depth.

## D-25 · Learning topics are a new kind of claim subject

**What was done.** Foundational teaching claims (what a receptor is) now attach
to a `learning_topics` row rather than to a compound or a quality topic. No
public page renders them yet; the books cite them.

**Why it needs you.** A future Learn page could render them the way quality
topics are rendered. That is a product decision, not an evidence one.

**Default if unanswered.** Books only, for now.

## D-26 · Open textbooks that forbid AI ingestion were not used

**What was done.** Following your source-hunting direction, OpenStax textbooks
(Biology 2e, Anatomy and Physiology 2e, Pharmacology for Nurses) were considered
as accessible sources for the foundational chapters and general
pharmacokinetics. Their pages carry a CC BY-NC-SA 4.0 licence and a notice that
the book may not be used to train, or be otherwise ingested into, large language
models or generative AI offerings without OpenStax's permission. This index is
built with an AI assistant, so the route was stopped as soon as the notice was
found. Nothing extracted from them was kept: no source record, no claim. The
private text snapshots were deleted.

**What that leaves.** Formulation and "why most peptides are injected" are now
answered from CC BY open-access reviews and ICH guidelines, which carry no such
restriction. Three questions stay unanswered: Understanding Peptides chapters
One to Four (what a peptide is; amino acids; peptides in the body; signalling),
general pharmacokinetic definitions (half-life, bioavailability, clearance and
related terms) and the individual routes of administration. Each is a recorded
gap, and none is filled in from general knowledge.

**Closed by the owner, 14 September 2026.** OpenStax permission is not to be
pursued. OpenStax is excluded from the source pipeline because its current terms
conflict with this index's AI-assisted extraction workflow: it is not used,
registered or cited, and no content extracted from it is retained. The remaining
foundational questions are to be answered from several permissive sources rather
than one textbook, in this order of preference: peer-reviewed open-access
articles under CC BY or a similarly permissive licence; public-domain
government or standards material where appropriate; lawfully held academic
sources whose permitted use is compatible with the workflow. Every candidate goes
through normal source QC (licence, bibliographic record, full-text availability,
provenance), and only the claims a publication needs are extracted. Unsupported
subsections stay marked SOURCE NEEDED.

---

# Closed by the owner, 13 September 2026

The decisions below are settled. Each records the ruling and what it now
constrains; none needs revisiting unless a source contradicts it.

- **D-03 · Evidence classes.** No fourth class until source material requires
  one. `analytical_characterisation` stays under preclinical.
- **D-04 · Route taxonomy.** Add a route such as ophthalmic or
  intraperitoneal when a source actually uses it; do not promote it to a
  prominent general category without need.
- **D-06 · Tremblay / CanLab dossier.** Remains unavailable. Source needed
  until legitimate material is obtained; nothing is attributed to it.
- **D-07 · Machine translation.** May support discovery and extraction. It
  must stay labelled machine-assisted and unverified, and may never be
  presented as verified translation.
- **D-11 · Route `other`.** Kept for genuinely uncategorised source-reported
  material.
- **D-12 · Modified GRF (1-29).** Remains a separate canonical record from
  CJC-1295.
- **D-13 · Russian and Eastern European evidence.** May be represented from
  English abstracts where that is all this index holds, and must stay
  explicitly abstract-level.
- **D-15 · Funding states.** "Not checked" and "none declared" remain
  different states. Absence of metadata is never read as absence of conflict.
- **D-16 · Understanding Peptides.** Stays PARTIAL DRAFT until the missing
  evidence-backed chapters are written.
- **D-17 · Readiness wording.** The phrase is "mechanically ready for
  scientific review". Mechanical readiness never implies review.
- **D-18 · Derived trace states.** Acceptable while the derivation is
  deterministic and its rule is recorded on every row.
- **D-20 · Reviewer onboarding.** Not built yet. The admin form is written
  when the reviewer is ready to enter the workflow.
