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
