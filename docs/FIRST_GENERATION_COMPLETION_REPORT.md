# First-generation completion sprint — report

Branch `phase-a-foundation`, continuing from `c37b288` and `39415c9`. Nothing
is deployed, robots stay noindex, and no record is published: every page and
every volume below is a development preview built from unreviewed records.

The sprint did not add compounds. It converted the twelve existing records into
a product: a navigation built around tasks, a directory that describes evidence
instead of counting papers, a research agenda that says what work would settle
each question, four publications generated from the records, and two new kinds
of evidence context — how far each citation has been traced, and who funded the
study behind it.

## WEBSITE

- **Navigation** is now Learn · Peptides · Protocols · Research · Quality ·
  Sources. Methodology moved beneath Learn (D-19).
- **`/learn`** is new: how evidence is classified, what quality testing
  establishes, how a record is arranged, and what the five publications are.
  It makes no claim about any compound.
- **Compound directory V3** replaced side-by-side paper counts with described
  dimensions: human evidence, preclinical, independent replication, protocol
  sources, routes recorded, how close the citations get to the research, and
  open questions. Filters cover research area, human evidence, route, regimen
  source and replication. Alphabetical; no score, no stars, no ranking. Counts
  now live only on the records, beside the database, search date and study
  types that produced them (owner decision 2).
- **Record pages** gained progressive disclosure: a four-step reading guide —
  what it is, what is known, what is not known, what sources report — and the
  full reference list collapsed behind a disclosure. Nothing was removed and
  everything stays traceable; the depth is no longer in the path.
- **Homepage and patient path** now open into Learn rather than into the
  quality register.

Screenshots: `review/product-v3/` (home, learn, protocols, sequence-to-vial,
record in both reading depths), `review/peptides-v2/`, `review/research-v1/`,
all at desktop and 390 px.

## PUBLICATIONS

Five volumes now build from the same records the site renders. All are
gitignored build artefacts; none is reviewed, and each says so on its cover.

All paths are under `build/publications/` (gitignored; rebuild with the command
shown). A volume is called a complete first draft only when every section it
plans to carry is written; rendering is not completion.

| Volume | Path | Pages | State |
|---|---|---|---|
| Understanding Peptides | `tides-index-understanding-peptides.pdf` | 18 | **Partial draft** — 5 of 12 chapters written, 7 briefed |
| Peptide Science & Applications | `tides-index-peptide-science-and-applications.pdf` | 13 | **Partial draft** — 2 chapters marked source needed; modifications, formulation and research design not yet written |
| The Peptide Reference Guide | `tides-index-peptide-reference-guide.pdf` | 87 | **Complete first draft** — all 12 monographs, every section present |
| Peptide Protocols & Clinical Quick Reference | `tides-index-peptide-protocols-quick-reference.pdf` | 72 | **Complete first draft** — all 84 regimens, per-compound comparison |
| Peptide Quality | `tides-index-peptide-quality.pdf` | 15 | **Complete first draft** — twelve chapters from the quality records |

Rebuild: `npm run pdf` (Understanding Peptides, Quality), `npm run pdf:science`,
`npm run pdf:guide`, `npm run pdf:protocols`, `npm run sheets`.

The twelve practitioner reference sheets, same directory, 5–8 pages each:
`tides-index-reference-{bpc-157, cjc-1295, ghk-cu, ipamorelin, mod-grf-1-29,
mots-c, retatrutide, selank, semax, tb-500, tesamorelin, thymosin-beta-4}.pdf`.
Generated views of a record rather than written documents, so each is as
complete as the record behind it — and each is unreviewed.

- **Understanding Peptides** now carries chapters eight to twelve:
  understanding evidence, safety and uncertainty, quality and testing,
  questions to ask your clinician, and how to use the index. Chapters one to
  seven remain briefs because this index holds no extracted biochemistry,
  physiology or pharmacology source, and writing them would mean composing
  science from general knowledge (D-16). No dosing, no administration
  instructions, no treatment advice appears anywhere in the volume.
- **Peptide Science & Applications** explains the science behind the records
  and ties every chapter back to the register — which record it explains,
  which disagreement it settles. Two chapters (receptors and signalling;
  oral bioavailability) are marked **source needed** rather than written.
- **The Peptide Reference Guide** binds twelve monographs on one template:
  name and aliases, what it is, evidence at a glance, human and preclinical
  evidence, mechanism, replication, routes, pharmacokinetics, safety,
  source-reported regimens, disagreements, research questions, regulatory
  context, key sources, version and review state. A heading with nothing under
  it still appears, carrying its absence. Evidence marks are shapes as well as
  colours, so they survive a photocopier.
- **Peptide Protocols** gained per-compound overviews, a side-by-side
  comparison of every regimen recorded for a compound, the full attributed
  entries, what the sources disagree about, and what nobody has tested. The
  comparison table puts the source in the first column and the kind of source
  in the second, so a reader cannot read across without reading who said it.
  There is no Tides row and no column for one.

## PEPTIDE LIBRARY

Twelve records, unchanged in number by design (Part 17). Identity separation
holds: CJC-1295 and Modified GRF (1-29) remain separate records, as do TB-500
and thymosin beta-4, and no evidence crosses between them.

## PROTOCOLS

84 source-reported regimens across the register, each attributed to the source
that published it. Nothing averaged, no recommended regimen, no Tides dose.
The protocol book's front matter states how many compounds have regimens that
come only from handbooks — the most useful single fact before reading it.

## RESEARCH

`/research` became a discovery surface rather than a list. 76 questions from
all 12 records, filterable by kind of question, by kind of absence and by
compound. Each question now shows what is unknown, why it is unknown, what
would settle it, and which recorded absence produced it — and the page
separates questions waiting on new research from those waiting on a paper this
index has not obtained. No entry describes a procedure.

## MANUFACTURING

"From sequence to final vial" covers 15 stages, 11 of them sourced. Formulation,
fill and finish, lyophilisation as a process, and finished-product release
testing remain marked **source needed**, each with the reason stated (D-10);
a test pins them as unsourced so they cannot be quietly filled. "Country of
origin is not a quality test" appears on the page and in three volumes.

## PRIMARY SOURCE VERIFICATION

New this sprint. Migration `0025` added a trace state to every piece of
evidence, and all 234 evidence rows now carry one:

| State | Rows |
|---|---|
| Cites the research directly | 26 |
| Held at abstract level | 114 |
| Secondary source, citation not obtained | 94 |
| Full text read and judged | 0 |

Each state was derived from the source register — what kind of source it is,
and whether a full text is held — and every row records the rule that produced
it, so a reviewer can disagree with a category rather than with 234 invisible
decisions (D-18). Full-text verdicts are never derived: the database refuses
one without a note, and only a person who read the paper can set it. That the
last row is zero is the honest headline of this section.

## FUNDING / CONFLICT COVERAGE

New this sprint. Funding was read from the PubMed record of every cited study —
its grant list, its conflict statement, and any funding sentence in the
abstract. 90 funding records were loaded:

- 3 industry, 6 government, 4 mixed, 1 foundation.
- 7 of those name a company that makes or sells the compound: five retatrutide
  trials authored by Eli Lilly employees, and two MOTS-c papers whose authors
  consult for the company developing it.
- 76 record that the PubMed entry disclosed nothing, stored as **not checked**
  with a note naming what was consulted — never as "none declared" (D-15).

Nothing scores a study by its sponsor, and a test asserts that no funding
record may carry a score, rating, rank or weight field.

## HUMAN REVIEW READINESS

`npm run readiness` checks six mechanical properties per record. All 12 now
pass: every citation resolves to a location, every claim about people cites the
research or an abstract of it, safety claims are traced, every regimen names
its source, gaps and research questions exist, and funding context is captured
for the study sources.

**Passing is not review.** No record has been read by a scientific reviewer,
and the command prints that under its own table (D-17).

## VISUAL QA

`npm run shots:index` captures home, learn, protocols, sequence-to-vial, the
compound directory (unfiltered and two filters), the research agenda (all and
filtered), and one record in both reading depths — desktop and mobile.
`npm run shots:record -- <slug>` captures a record section by section.

## ENGINEERING

- Migration `0025_primary_tracing_and_funding`: a `primary_trace_state` enum
  and two columns on `claim_evidence`, a `study_funding` table, a public view,
  and grants. Constraints enforce that a full-text verdict carries a note and
  that a named sponsor cannot sit on an unchecked record.
- Packet schema, loader and public queries extended for both; the compound
  directory and the readiness check read them.
- New scripts: `evidence/derive-primary-trace.py`, `evidence/fetch-funding.py`,
  `evidence/apply-funding.py`, `qa/readiness.ts`, `publishing/build-reference-guide.ts`,
  `publishing/build-science-applications.ts`.
- New tests: `tests/unit/research-vocabulary.test.ts` — every gap type and
  opportunity type is labelled, no research question reads as an instruction to
  the reader, no full-text verdict lacks a note, every evidence row has a trace
  state, funding is never "none declared" when nothing was checked, and no
  funding record carries a score field.
- Gates, run as a controlled sequence rather than through `npm run verify`:
  - **Lint**: passed.
  - **Typecheck**: passed.
  - **Unit tests**: 135 passed in 11 files.
  - **Integration tests**: 370 passed in 30 files, no failures. Run in three
    parts — a first pass covering 25 files, the five files it had not reached,
    and a rerun of the one file a wall-clock cap interrupted mid-file. Every
    file has now completed in full.
  - **Whole suite**: 505 tests in 41 files, which is the 496 in 40 files this
    sprint inherited plus the nine new invariants in
    `tests/unit/research-vocabulary.test.ts`.
  - **Production build**: compiled, 17 static pages generated.
- A note on how those were run. `npm run verify` pipes vitest to a file, and
  vitest buffers when it is not writing to a terminal, so a long run looks
  identical to a stuck one. A run was killed on that basis after twenty
  minutes of silence at full CPU. Re-running the stages separately with a
  streaming reporter showed the truth: nothing was stuck, the integration
  suite is simply slow — around five seconds per test, because each test
  builds a database from the packets, and those packets grew this sprint.

## REMAINING GAPS

- **No human review, anywhere.** Twelve records, five volumes, all unreviewed.
- **No full text has been read and judged.** 114 evidence rows sit at abstract
  level and 94 rest on secondary sources whose citations have not been
  obtained.
- **Funding is unknown for 76 study sources**, because the PubMed record
  discloses nothing and the full texts are not held.
- **Understanding Peptides is five-twelfths written.** The missing chapters
  need a biochemistry, a physiology and a pharmacology reference.
- **Science & Applications has two source-needed chapters**, for the same
  reason.
- **Four manufacturing stages remain unsourced** pending genuine copies of two
  textbooks and compendial access.
- **Russian-language Semax and Selank literature** is still read through
  English abstracts only.
- **The integration suite now takes over twenty-five minutes** in a single
  worker, at roughly five seconds a test, because every test rebuilds a
  database from packets that grew when tracing and funding were added. It
  passes, but a gate nobody can watch is a gate that gets skipped, and the
  next engineering task should be to make the suite parallel or to seed once
  per file rather than once per test.

---

# For the owner

## What is now ready to use

- The **website**, as a working reference for checking what a source says and
  where: twelve records, 84 attributed regimens, 76 research questions, a
  manufacturing pathway, and a quality section — all navigable by task.
- **The Peptide Reference Guide** and **Peptide Protocols & Clinical Quick
  Reference**, as working artefacts for a clinician who wants to see what
  sources report and how far apart they are. Not as clinical references.
- **`npm run readiness`**, as the thing to run before asking anyone to review a
  record.

## What still needs scientific review

Everything. Twelve compound records, twenty-one quality topics, and all five
volumes. The highest-value order is Retatrutide (real trial data, highest
reader interest), then CJC-1295 with Modified GRF (identity risk), then
BPC-157 (widest gap between discussion and evidence).

## What still needs source access

- Full texts for the 114 abstract-level evidence rows, starting with the
  retatrutide trials and the three BPC-157 human studies.
- The primary literature behind the practitioner handbooks: 94 citations that
  have never been opened.
- Replacement copies of SRC-013 (lyophilisation) and SRC-014 (formulation),
  and compendial sterility and endotoxin chapters.
- A biochemistry, a physiology and a pharmacology reference, which would unlock
  seven Understanding Peptides chapters and two in Science & Applications.
- Qualified reading of the Russian Semax and Selank literature.

## What to build next

1. **Review tooling**, not more content. A reviewer needs to approve a record
   version, record what they checked, and leave the audit trail the publish
   gate already demands.
2. **Publish the first record** once one has passed review, which will exercise
   the public path end to end for the first time.
3. **Full-text tracing** as a standing pass, converting abstract-level rows to
   read verdicts — the single biggest lift in the register's authority.
4. **A second wave of compounds**, only after the first twelve are reviewed.
