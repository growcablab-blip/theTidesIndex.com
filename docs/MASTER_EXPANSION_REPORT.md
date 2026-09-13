# Master content & product expansion — report

Branch `phase-a-foundation`. Covers everything after `90ddd4d` (TB-500 /
thymosin beta-4, protocol library V2, sequence to vial). Nothing is deployed,
robots stay noindex, and no record is published: every page below renders as
a development preview from unreviewed records.

## PRODUCT

- **Compound index V2** (`/peptides`). "Discover by evidence" table with GET
  filters for research area, given to people (yes/no), route recorded,
  regimen source (label or human study / handbooks only / none) and
  independent replication. Columns come from `readDiscovery`
  (`src/server/public/research-index.ts`), which reads the same `public_v_*`
  views as the compound page, or base tables in preview. Alphabetical, no
  score, no dosing fields.
- **Research agenda** (`/research`). Every gap that carries a research
  question, grouped by opportunity type, filterable by kind and by compound or
  topic, linked back to the section of the record it came from. 76 questions
  from all 12 records.
- Navigation and footer link to both.
- Record-page fixes found during the expansion:
  - Human evidence is counted as "records in people", because substudies are
    separate records.
  - Resolved disagreements now say how they were settled instead of reading
    as open.
  - Chemical-form and reporting-threshold explanations have labels.
  - The protocol library sorts by compound name in JavaScript, so the order
    does not depend on database collation.

Screenshots: `review/peptides-v2/`, `review/research-v1/` (desktop and 390 px).

## PEPTIDES

Eight records added; the register now holds 12.

| Record | Archetype | Claims | Gaps | Regimens | Disagreements | Screen |
|---|---|---|---|---|---|---|
| Retatrutide | Clinical development, trial timeline | 8 | 8 | 6 (4 trial arms, 2 handbook) | 3 | 182 |
| GHK-Cu | GHK vs GHK-Cu; topical vs systemic | 10 | 7 | 10 | 4 | 403 |
| CJC-1295 | Albumin-binding molecule | 7 | 6 | 7 | 4 | 38 |
| Modified GRF (1-29) | Separate record (D-12) | 4 | 5 | 7 | — | none |
| Ipamorelin | IV human pharmacology, animal effects | 7 | 6 | 9 | 5 | 50 |
| MOTS-c | Evidence ladder | 7 | 6 | 8 | 5 | 259 |
| Semax | Russian literature (D-13) | 8 | 5 | 8 | 4 | 215 |
| Selank | Russian literature (D-13) | 8 | 6 | 7 | 5 | 72 |

Identity is kept separate throughout:
- CJC-1295 with DAC, CJC-1295 without DAC (Mod GRF 1-29) and the
  glycine-modified variant are separate identity claims, not synonyms.
- The N-acetyl amidate forms of Semax and Selank are recorded as related but
  distinct molecules.
- A source-error disagreement records that one handbook's MOTS-c molecular
  weight does not match the sequence.

Every record has a practitioner reference sheet and a review folder:
`review/{retatrutide,ghkcu,cjc,ipamorelin,motsc,semax,selank,mod-grf-1-29}-v1/`.

## PROTOCOLS

- 84 regimens across 12 compounds, each attributed to one source and none
  averaged.
- Regimens that name no route (for example cheat-sheet rows) are recorded
  under route `other` (D-11). The TB-500 Campbell sheet was corrected to match.
- Trial arms are marked as trial evidence and handbook regimens as practitioner
  reference, and the index's "Regimens from" column keeps the two apart.
- The protocol book has been regenerated (84 regimens).
- The patient-mode dose scan is clean for all 12 compounds.

## MANUFACTURING

"From sequence to final vial" shipped in `90ddd4d`. It covers 5 quality
topics, 5 figures and chapter Ten of the Peptide Quality PDF. Nothing was added
in this round; the `review/manufacturing-v1/` captures stand.

## PUBLICATIONS

Built (gitignored, `build/publications/`):
- 12 reference sheets. Each now ends with "Questions for research", printing
  the questions attached to that record's gaps — so the sheet a practitioner
  carries says what is not known as well as what is recorded.
- The protocol book (84 regimens).
- Peptide Quality (15 pages).

- Understanding Peptides: the skeleton now carries one **written** chapter,
  Eight, "Understanding evidence" — the three evidence classes as the database
  defines them, what each can support, why animal evidence is not human
  evidence, what a study design can and cannot show, and what "not
  established" means here. It was writable because it makes no claim about any
  peptide.

**Not done in this round:**
- The other ten Understanding Peptides chapters. Chapter Ten (quality) could be
  drawn from the Peptide Quality material, but that volume is not yet
  scientifically reviewed, and building the most patient-facing chapter in the
  programme on unreviewed material is the wrong order.
- *Peptide Science & Applications*.
- A bound *Reference Guide* assembled from the sheets.

These need chapter copy that has to come from the records, and the records are
unreviewed.

## SOURCES

- 119 sources in `SOURCE_MANIFEST.json` (SRC-047 to SRC-119 added).
- 1,768 literature-screen records across 10 PubMed screens. Every screen
  query, date and classification is reproducible from
  `scripts/literature/`.
- Locators: 85 resolved, 0 failed.
- Abstract-only sources say so in both the locator and the access notes. The
  retatrutide ClinicalTrials.gov registry entry is held at abstract level.
- Russian-language records were read through English abstracts only and are
  marked as such. No machine translation was used.

Not done:
- Systematic tracing of each claim back to its primary source, beyond what the
  disagreements already record.
- Funding and conflict-of-interest notes per study.

## QUALITY

Rules checked on every new record:
- No record merges peptide identities.
- No regimen averaging.
- Evidence gaps are phrased as what is not established, not as negative
  claims.
- Regulatory context stays secondary and is never used as evidence of absence.
- Patient payloads carry no dose-shaped strings.
- Country of origin is never used as a quality signal.

Honest limits:
- Every record is AI-extracted and awaits scientific, clinical and compliance
  review. Nothing is presented as human-reviewed.
- Tesamorelin and BPC-157 have no research questions yet (D-14).

## ENGINEERING

- Migration `0024_public_view_grants` fixes a latent bug. The views added in
  0022/0023 (literature screens, screen records, identity claims, replication
  assessments, compound products and forms, PK observations) were never
  granted to `anon`, so the first public read would have failed at
  publication. A new migrations test asserts that every `public_v_*` view is
  readable by `anon`.
- `editorial-services` test: the refused-write assertion now compares against
  the seeded value, so it no longer assumes Semax has no description.
- The undefined `paper` colour token was replaced with `warm-white`. It had
  made the filter buttons' text invisible.
- New scripts: `npm run shots:record -- <slugs>` and `npm run shots:index`.
- Gates (`npm run verify`, dev server stopped):
  - Lint and typecheck passed.
  - 496 of 496 tests passed across 40 files.
  - The production build compiled.
  - After the reseed: patient-mode dose scan clean for all 12 compounds, and
    85 of 85 locators resolved.
  - Visual QA captures are in the review folders listed above.

## NEXT

1. Human review of the eight new records, starting with Retatrutide (trial
   data, highest reader interest) and CJC-1295 / Mod GRF (identity risk).
2. Research questions for Tesamorelin and BPC-157.
3. Publications: *Understanding Peptides* fill, *Peptide Science &
   Applications*, and a bound Reference Guide, all generated from records.
4. Per-study funding and conflict notes, and primary-source tracing for
   handbook claims.
5. Full-text access for abstract-only sources, and qualified reading of the
   Russian Semax/Selank literature (D-13).
6. Owner decisions D-11 to D-14.
