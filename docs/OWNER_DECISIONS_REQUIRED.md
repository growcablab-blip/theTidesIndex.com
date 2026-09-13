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

**Default if unanswered.** Continue at abstract level and record it.

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

**Default if unanswered.** The four stages stay marked source needed. A test
(`tests/unit/sequence-to-vial.test.ts`) pins them as unsourced so they cannot be
quietly filled.

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
comparison even without a ranking. Tesamorelin and BPC-157 predate the
research-question field, so they show no questions yet; that means the field
has not been filled in, not that nothing is open.

**Default if unanswered.** Keep both pages, keep "Research" in the navigation,
and fill in research questions for Tesamorelin and BPC-157 when those records
are next revised.
