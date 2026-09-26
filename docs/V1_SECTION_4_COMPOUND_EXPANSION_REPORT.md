# V1 SECTION 4 — EXPAND THE COMPOUND EVIDENCE LIBRARY

Date: 26 September 2026. Baseline: `d937c2c` (Section 3).

**Status: tranches 1 and 2 complete.** Sixteen records built, verified and published; the library
stands at **28 public compounds**. Tranche 2 also added a standing publication-integrity QA gate
(§20) after the re-seed incident in §17 showed that `qa:production` cannot detect a silent loss.

---

## 1. SOURCE INVENTORIES EXAMINED

| Inventory | What it gave |
|---|---|
| `Peptide_Education_Evidence_Master_v1.xlsx` → sheet **Peptide Index** | 43 rows, P-001…P-043, ten columns including a manual Yes/No/Possible crosswalk against four handbooks. Confirmed byte-identical to `Tides_Index_Master_Evidence_v1.xlsx` (sha256 `127ff333…`) |
| Same workbook → **Protocol Index** | 6 rows, 13 columns. **Every dose, frequency and duration cell is a placeholder** ("Pending extraction", "Present in source — do not publish yet"). No literal regimen exists anywhere in the workbook |
| `SOURCE_MANIFEST.json` | 197 registered sources, cross-searched against all 43 candidate names |
| `data/seed/peptides.json` | The existing 12 records and all their aliases |
| `data/seed/taxonomy/` | 9 compound types (6 with `isPeptide: true`), 14 categories |
| `data/seed/evidence/`, `data/seed/literature/` | Existing mentions of each candidate |
| The five held handbooks, SRC-001…SRC-005 | Scanned page by page — see below |
| `data/private/source-snapshots/foundations/` | Full-text snapshots behind SRC-143, SRC-153, SRC-154 |

### A new tool: `npm run sources:compound-coverage`

`sources:read --find` answers "which pages mention X" for one term, but re-parses the whole file
each time — and SRC-002 is 99 MB. Twenty-five questions that way is twenty-five full parses, slow
enough that the work gets done from memory instead, which is how a record ends up resting on a page
nobody opened.

`scripts/sources/compound-coverage.ts` parses each handbook once and asks every question against it.
It reports page numbers only. **A page list is a research lead, not evidence** — the script says so
on every run, and every claim below was written from a page opened with `sources:read`.

### Page numbering — a provenance correction

The registry records **no** `printed_page_offset` for any of the five handbooks, but SRC-002 is out
by two: file page 29 is the BPC-157 monograph and prints **27** at its foot.

That is not a guess. It was confirmed at five independent points (files 22→20, 29→27, 128→126,
166→164, 251→249) **and validated against already-committed data**: the existing BPC-157 record cites
`lavalle-bpc-27` as "pp. 27-28", which is file 29-30. Every new SRC-002 locator in this section is
therefore recorded as **printed = file − 2**, consistent with the twelve records already built.

The existing convention for the other handbooks is followed exactly as found:

| Source | Existing locator convention |
|---|---|
| SRC-002 (LaValle), SRC-003 (Campbell) | printed pages, with `pageStart`/`pageEnd` |
| SRC-001 (Seeds), SRC-004 (Cheat Sheet), SRC-005 (Hack Smith) | `"file p. N"` in `locatorText`, pages null — the printed numbering was never established for these copies |

---

## 2. THE DECISIVE FINDING

**Of the 32 spreadsheet rows with no record, only four are mentioned anywhere in the 197-source
manifest** — GHRP-6 and GHRP-2 (SRC-072, SRC-084), Sermorelin (SRC-074) and Hexarelin (SRC-084), and
in every case as a passing mention in an anti-doping analytical paper rather than as that compound's
own evidence.

There is one real exception, verified rather than assumed. **LL-37** is a central subject of two
registered, held, `usable` sources — SRC-153 (Wang 2014, *Human antimicrobial peptides and proteins*)
and SRC-154 (Alford 2020, *Cathelicidin host defence peptides and inflammatory signaling*) — held as
full text in `data/private/source-snapshots/foundations/`, with 71 and 102 mentions respectively.
They were registered for the learning topics, not for LL-37, but they are held and citable.

So the honest position is this: **the expansion is a practitioner-reference expansion.** That is
exactly what the owner's decision anticipated, and it is legitimate — but it must be visible, and
no new record may be dressed to look like BPC-157 or retatrutide.

---

## 3. HANDBOOK COVERAGE — WHAT IS ACTUALLY HELD

LaValle (SRC-002) is the spine. It is structured as one monograph per compound with a consistent
shape: **Category · Other Name(s) · Sequence · Molecular Composition · Indications/Uses · Dosage ·
Warnings and Cautions · Summary.** Twenty-one monographs cover compounds with no existing record.

Printed page ranges (file − 2), from the coverage scan, each verified by opening the page:

| Compound | LaValle printed pp. | Also in |
|---|---|---|
| AOD-9604 | 19–22 | SRC-001, SRC-003, SRC-004, SRC-005 |
| ARA-290 (Cibinetide) | 24–26 | SRC-004, SRC-005 |
| Dihexa | 40–42 | SRC-001, SRC-003 |
| DSIP | 43–46 | SRC-001, SRC-004, SRC-005 |
| Epitalon | 47–52 | SRC-001, SRC-003, SRC-004, SRC-005 |
| FOXO4-DRI | 53–56 | SRC-004, SRC-005 |
| Kisspeptin | 62–67 | SRC-004, SRC-005 |
| KPV | 68–70 | SRC-004, SRC-005 |
| **LL-37** | 71–81 | SRC-003, SRC-004, SRC-005 **+ SRC-153, SRC-154 (held full text)** |
| Larazotide | 82–84 | — |
| Melanotan I / II | 85–94 | SRC-001, SRC-003, SRC-005 |
| MGF | 95–99 | SRC-001, SRC-005 |
| PNC-27 | 107–110 | — |
| PT-141 (Bremelanotide) | 111–117 | SRC-001, SRC-004, SRC-005 |
| Semaglutide | 126–135 | SRC-003, SRC-004, SRC-005 |
| Sermorelin | 136–140 | SRC-001, SRC-005 |
| Thymosin alpha-1 | 147–152 | SRC-001, SRC-003, SRC-005 |
| Thymulin | 160–162 | SRC-004, SRC-005 |
| VIP | 163–168 | SRC-003, SRC-004, SRC-005 |
| IGF-1 LR3 | 96–97 (inside the MGF monograph) | SRC-004, SRC-005 |

Candidates with **no** LaValle monograph but material elsewhere: Cerebrolysin (SRC-001 pp. 279–281,
SRC-003 125–130, SRC-005 132–133), GHRP-6 (SRC-001, SRC-005 60–64), GHRP-2 (SRC-001, SRC-005 58–60),
Hexarelin (SRC-001, SRC-005 63–64), Cagrilintide (SRC-005 45–47), Liraglutide (SRC-001 210, SRC-005
78–80), Tirzepatide (SRC-003 75–80, SRC-005 110/117–119), SS-31 (SRC-005 107–108), MK-677 (SRC-005
86–88), Melanotan I (SRC-001 188–193, SRC-003 138–142), 5-Amino-1MQ (SRC-004 p. 6 only), FGL(L)
(SRC-001 p. 239 only).

---

## 4. IDENTITY AND ALIAS DECISIONS

Resolved before any record was created, because a duplicate scientific identity is far harder to
unpick afterwards than to prevent.

| Decision | Resolution |
|---|---|
| **CJC-1295 vs Modified GRF (1-29)** | Already two records, and they stay two. The spreadsheet's P-004 synonym cell reads "CJC-1295 with/without DAC" and spans **both** — "with DAC" is a `synonym` on `cjc-1295`, "without DAC" is a `common_misnomer` on `mod-grf-1-29`. A naive split would have merged two distinct molecules |
| **TB-500 vs Thymosin beta-4** | Already two records. P-011's own Extraction Status says "Needs nomenclature review", and its synonym cell collides with aliases on both. No change: the analytical literature says they are two molecules |
| **Thymulin vs "Thyamlin"** | "Thyamlin" appears only in the SRC-004 cheat sheet and is an OCR/spelling variant. Recorded as an `alias` of Thymulin, not a compound |
| **Melanotan I vs Melanotan II** | Scientifically distinct (afamelanotide vs MT-II). LaValle discusses them in one page block; that is a presentation choice by the handbook, not an identity claim. **Two records**, each citing the pages that describe it |
| **Kisspeptin vs Kisspeptin-10** | Kisspeptin-10 is a specific fragment. Recorded as an alias only where a held page uses that name for the same material; otherwise the record is Kisspeptin |
| **MGF and PEG-MGF** | PEG-MGF is a distinct pegylated form. Alias only if a held page treats them as one; otherwise noted as a related-but-distinct name |
| **IGF-1 LR3** | LaValle covers it inside the MGF monograph (pp. 96–97). It is a distinct analogue, so a distinct record, citing those pages plus SRC-005 |
| **Semaglutide / Tirzepatide / Retatrutide / Liraglutide / Cagrilintide** | Five separate compounds. Retatrutide already exists. None of the others inherits retatrutide's trial evidence |
| **TB-500's absent row** | `tb-500` has no spreadsheet row; it appears only inside P-011's synonym cell. The spreadsheet is not authoritative over the records |

---

## 5. COMPOUND-TYPE DECISIONS

The schema already carries `compound_types.isPeptide`, and the spreadsheet's own Type column is
honest about the two exceptions.

| Compound | Spreadsheet Type | Assigned type | isPeptide |
|---|---|---|---|
| MK-677 (Ibutamoren) | "Non-peptide small molecule" | `small_molecule` | **false** |
| 5-Amino-1MQ | "Non-peptide small molecule" | `small_molecule` | **false** |
| Dihexa | "Peptide-derived compound" | `peptide_derived_compound` | true |
| Cerebrolysin | "Peptide mixture" | `peptide_mixture` | true |
| AOD-9604 | "Peptide fragment" | `peptide_fragment` | true |
| Semaglutide, Tirzepatide, Liraglutide, Cagrilintide, PT-141, Melanotan I/II, Sermorelin, IGF-1 LR3 | "Peptide analog…" | `peptide_analog` | true |
| GHRP-2, GHRP-6, Hexarelin | "Peptide secretagogue" | `peptide_secretagogue` | true |
| Epitalon, KPV, LL-37, VIP, Kisspeptin, Thymulin, Thymosin alpha-1, DSIP, ARA-290, Larazotide, MGF, PNC-27, FOXO4-DRI, SS-31 | Peptide / tetrapeptide / tripeptide / antimicrobial peptide | `peptide` | true |

Neither small molecule is classified as a peptide merely because it appears in a peptide workbook.
Whether they belong in the index at all is flagged in §13.

---

## 6. EVIDENCE-DEPTH PRODUCTION CLASSES

**Internal, for production workflow only. These never appear on the public site** — no grades, no
scores, no rankings. The public surfaces continue to show distinct source counts and evidence lanes,
which is what Section 3 verified.

| Class | Meaning | Candidates |
|---|---|---|
| **A — mixed evidence** | Held primary or review literature about *this* compound, plus practitioner material | **LL-37** only (SRC-153 + SRC-154 held full text, plus a LaValle monograph and three other handbooks) |
| **B — primary-limited** | Some dedicated primary material, thin | **GHRP-6, GHRP-2, Hexarelin, Sermorelin** — each named in a registered anti-doping analytical paper (SRC-072 / SRC-074 / SRC-084), which supports identity and detection statements but not efficacy |
| **C — practitioner-reference** | Held practitioner material with exact provenance; no dedicated primary evidence held | The remaining LaValle monographs and multi-handbook candidates |
| **D — name or comparator only** | Not enough held material for a useful record | **FGL(L)** (one page, one handbook), **5-Amino-1MQ** (one cheat-sheet row), **Cagrilintide** and **Tirzepatide/Liraglutide/Semaglutide** pending verification that held pages describe them rather than mentioning them in passing |

**The six "stronger candidates" named in the brief did not survive verification, with one exception.**
Semaglutide, Tirzepatide and Liraglutide have **no dedicated registered source** — their appearances
are inside the retatrutide literature screen as comparators, and Part 6 of the brief is explicit that
a retatrutide paper mentioning semaglutide is not a semaglutide evidence source. They are therefore
**class C**, built from handbook pages, not class A. Thymosin alpha-1 and VIP are likewise class C.
Only LL-37 holds up as class A.

---

## 7. RECORDS BUILT — TRANCHE 1

Nine new compounds. LL-37 was built first as the pipeline proof; the other eight are the tranche the
owner selected.

| Record | Class | Locations | Claims | Protocols | Gaps | Routes | Aliases | Sources |
|---|---|---|---|---|---|---|---|---|
| **LL-37** | **A** | 6 | 8 | 2 | 4 | 2 | 3 | SRC-002, **SRC-153, SRC-154** |
| **PT-141** | C | 4 | 6 | 2 | 4 | 1 | 2 | SRC-002 |
| **Epitalon** | C | 5 | 6 | 2 | 5 | 2 | 3 | SRC-002 |
| **Sermorelin** | C | 2 | 5 | 1 | 4 | 1 | 2 | SRC-002 |
| **DSIP** | C | 2 | 4 | 1 | 4 | 1 | 1 | SRC-002 |
| **Thymosin alpha-1** | C | 2 | 3 | 2 | 3 | 1 | 4 | SRC-002 |
| **Kisspeptin** | C | 3 | 3 | 1 | 4 | 1 | 1 | SRC-002 |
| **VIP** | C | 2 | 3 | 1 | 4 | 1 | 3 | SRC-002 |
| **Semaglutide** | C | 2 | 4 | 2 | 4 | 2 | 3 | SRC-002 |
| **Totals** | | **28** | **42** | **14** | **36** | **12** | **22** | |

Every record: `review_state = unreviewed`, `last_reviewed_at = null`, published through the real
gates, present in the search index, and carrying no literature screen — which the register already
renders as "No literature screen yet" without any new vocabulary being needed.

**These records are visibly thinner than the original twelve, and that is correct.** BPC-157 carries
14 claims across 10 distinct sources; Kisspeptin carries 3 across one. The site communicates that
difference through source counts and evidence lanes, not through a grade the reader has to decode.

### Notable content, record by record

- **LL-37** — the only class A. Two held review sources support its biology; the handbook supplies
  clinical use. Carries the handbook's own warning that it may behave as either a pro-tumorigenic or
  an anti-cancer agent depending on tumour biology, which is the kind of contradiction the index
  should show rather than resolve.
- **PT-141** — the handbook reports an FDA-approved product. The approved-label regimen and the
  practitioner regimen are **two separate protocol records**, with different populations and
  different doses, because they are different claims. The approval is recorded as *reported*, and the
  regulatory status stays `unknown` because no regulator's own record was consulted.
- **Epitalon** — the hardest record in the tranche. The monograph reports multi-year human mortality
  trials with specific figures, a telomere-elongation result, and sweeping disease-prevention claims.
  **None of the cited studies is held.** Each is recorded as the handbook's report at reference class,
  and a gap records that several concern *epithalamin*, a pineal extract, rather than the
  tetrapeptide — so that alias is `related_but_distinct`, never `synonym`.
- **Sermorelin** — unmodified GHRH(1-29), explicitly distinguished from the existing Modified GRF
  (1-29) record. Carries the handbook's statements about anti-GRF antibody development and its
  anti-doping status.
- **DSIP** — two negative claims recorded carefully: that classical sedation is not observed, and
  that tolerance does not develop. Both assert that something does *not* happen, and both rest on
  sources not obtained.
- **Thymosin alpha-1** — distinguished from thymosin beta-4 and TB-500 by an explicit
  critical-importance identity claim, because those three are routinely conflated. Reports a marketed
  product with its own protocol.
- **Kisspeptin** — carries an `evidence-quality` claim recording that its rare-adverse-reaction list
  is **word-for-word identical** to the DSIP monograph's, so it is boilerplate rather than a
  compound-specific observation. Its reported indication list is recorded at critical importance
  precisely because nothing held supports it.
- **VIP** — the titration chart in the held copy is too garbled to transcribe. The start, the
  strength change and the final dose are recorded; **the intermediate schedule is deliberately not
  reconstructed**, and a gap says so in as many words.
- **Semaglutide** — kept class C by decision. Its appearances elsewhere in this project are
  comparator mentions inside retatrutide literature, and those were not promoted into semaglutide
  evidence.

---

## 8. IDENTITY AND COMPOUND-TYPE DECISIONS APPLIED

| Decision | Applied as |
|---|---|
| Sermorelin vs Modified GRF (1-29) | Two records. `related_but_distinct` alias each way; a critical-importance claim states the distinction; no evidence crosses between them |
| Thymosin alpha-1 vs beta-4 vs TB-500 | Three records. Critical-importance identity claim on alpha-1; `related_but_distinct` alias |
| Epitalon / Epithalon / Epithalone | One record, `synonym` aliases |
| Epitalon vs Epithalamin | `related_but_distinct` — the reported trials used the extract, not the tetrapeptide |
| PT-141 / Bremelanotide / Vyleesi | One record: `synonym` for the INN, `brand_name` for the product, whose label regimen is a separate protocol |
| Kisspeptin / Kisspeptin-10 | One record. **No alias created** — the handbook does not mention the shorter fragment, and inventing one would assert an identity the source does not |
| VIP / Aviptadil / PHM27 | One record; the full name carried as an alias because the initialism collides with ordinary English |
| Semaglutide / Ozempic / Wegovy / Rybelsus | One record, three `brand_name` aliases |
| DSIP | One record; the full name carried as `chemical_name` |

No new compound-type or category keys were needed. All nine map to existing vocabulary, and no small
molecule was built in this tranche — so the MK-677 / 5-Amino-1MQ classification hazard the brief
warned about was not reached.

---

## 9. PRACTITIONER-ONLY RECORD RULES — HOW THEY WERE KEPT

Eight of the nine records rest mainly on one practitioner handbook. Four mechanisms keep that honest:

1. **Attribution inside the claim text itself.** Every practitioner claim begins "LaValle et al.
   describe / report / state...". The attribution is in the sentence, not only in the citation.
2. **Evidence class.** Every such link is `practitioner_reference` to `reference_opinion`,
   `isHumanEvidence: false`. A new unit test asserts this can never drift.
3. **`primaryTrace: cited_not_obtained`** on every claim resting on a study the handbook cites and
   this index has not read — with a note saying exactly that.
4. **Gaps that name what is missing**, including `primary_source_missing` on Epitalon and DSIP, which
   records that the underlying studies have not been obtained at all.

**No section was filled for symmetry.** Kisspeptin, VIP and Thymosin alpha-1 have three claims each
because that is what their monographs support.

---

## 10. THE DOSE LEAK — FOUND AND FIXED

Worth recording in full, because the project's own QA caught a mistake this build made.

After the first publish, `npm run qa:doses` reported **13 hits across three records**. The cause was
mine: I had written dosing schedules into **claim text**.

**Why that matters.** Dose suppression is enforced on the protocol relation, which has no dosing
columns in simple mode. Claims render in **both** reading depths. A dose written into a claim goes
round the entire patient/practitioner boundary.

**The fix**: the amounts moved onto the protocol records, which are mode-gated, and the claims now
describe the shape of each regimen without the numbers — "escalates in two steps across two months to
a target dose" — with the claim stating that the amounts are on the protocol. `qa:doses` now reports
**"No dose-shaped strings in any patient payload."**

**And it is now a test.** `tests/unit/compound-library-integrity.test.ts` fails if any claim text,
plain-language text or simple summary in any packet contains a dose-shaped string, so the next person
to add a compound cannot repeat it.

---

## 11. TESTS ADDED

`tests/unit/compound-library-integrity.test.ts` — 9 tests, one per failure mode the brief named:

| Test | Prevents |
|---|---|
| no duplicate key, slug or canonical name | duplicate canonical compounds |
| never claims another compound as a synonym | alias collision merging two identities |
| every compound type exists; small molecules are never peptides | non-peptides mislabelled as peptides |
| every protocol resolves to a declared location | protocol provenance loss |
| every claim evidence link resolves to a declared location | orphan evidence |
| practitioner reference is never human evidence | practitioner material silently reclassified as a trial |
| no dose in claim text / plain language / simple summary (3 tests) | patient-mode dose leakage |

`tests/integration/seed-preserves-publication.test.ts` — 7 tests, added for the re-seed hazard
described in §17 and listed there.

### Two existing tests changed

**`tests/integration/seed.test.ts`** asserted `rows.length === 12`. It now asserts
`rows.length === seedData.peptides.length`. The number was not bumped from 12 to 21, because a
literal is the wrong assertion: what matters is that the seeded cohort is exactly the declared
register, not that the register is any particular size. The comment recording *why* the count moved
from ten to eleven to twelve is kept — that history is about chemistry being resolved, and it is worth
keeping — with the expansion added to it.

The same test asserts that a compound carries summaries only if a packet extracted them. Every
compound now has a packet, so that branch currently matches nothing. It is kept: the next compound
added ahead of its packet is exactly what it catches.

**`vitest.config.ts`** — `hookTimeout` raised from 120s to 240s, with the reason recorded in the
config. The integration suites truncate and re-seed the whole database before *every* test; a re-seed
costs five or six seconds, but the expansion took a full run from 29 minutes to 50, and across four
hundred re-seeds the embedded database occasionally stalls for longer than two minutes. That was
failing runs as timeouts. The new value is slack for the stall, not room for a slow test.

---

## 12. HELD-BACK CANDIDATES

**No candidate on the priority list was declined — all eight were built.** Held back from *this*
tranche, with reasons:

| Candidate | Class | Why not in tranche 1 |
|---|---|---|
| AOD-9604, ARA-290, Dihexa, FOXO4-DRI, KPV, Larazotide, Melanotan I, Melanotan II, MGF, PNC-27, Thymulin | C | LaValle monographs exist and are buildable. Deferred by the instruction to stop after the strongest tranche |
| Cerebrolysin, GHRP-2, GHRP-6, Hexarelin, Cagrilintide, IGF-1 LR3, SS-31, Liraglutide, Tirzepatide | C (B for the three GH secretagogues) | No LaValle monograph; the held material sits in SRC-001/003/005 and needs a different extraction pass |
| MK-677, 5-Amino-1MQ | C, `small_molecule` | Buildable, but they are not peptides. Whether they belong in this index is an open owner question |
| **FGL(L)** | **D** | One page in one handbook. Not enough held material for a useful record |

---

## 13. TOTALS

```
ORIGINAL RECORDS          12
LL-37 (pipeline proof)     1
TRANCHE-1 NEW RECORDS      8
TOTAL PUBLIC COMPOUNDS    21
CANDIDATES REMAINING      ~22 buildable, 1 held at class D
```

By evidence-depth class: **A — 1** (LL-37) · **B — 0 built** · **C — 8** · **D — 0 built, 1
identified.**

---

## 14. REMAINING RESEARCH OPPORTUNITIES

36 new evidence gaps were recorded. The recurring ones are worth naming:

- **No literature screen exists for any of the nine.** Every record carries a gap saying so. Several
  of these compounds have substantial published literatures this index has simply not searched.
- **The handbook citations have never been obtained.** Epitalon's mortality trials are the sharpest
  case: large reported effects resting on superscripts nobody here has followed.
- **Two reported approvals are unverified.** Reading the actual product labels would convert two
  `unknown` regulatory statuses into real, date-stamped ones.

---

## 15. TREMBLAY IMPLICATIONS

This tranche bears directly on the Tremblay ingestion, when that archive arrives.

The practitioner-attribution pattern built here — attribution inside the claim sentence,
`reference_opinion` class, `cited_not_obtained` tracing, and gaps that name what is missing — is
exactly the pattern an expert archive needs. Tremblay material differs in one useful way:
`source_locations` already carries `timestampStartSeconds` and `timestampEndSeconds`, so a recorded
interview can be cited to the second as precisely as a handbook is cited to the page.

**One thing to decide before ingestion.** SRC-016 is typed `expert_interview`, a source type nothing
currently uses. Its evidence type should almost certainly be `expert_commentary`, which the new
integrity test already asserts is `reference_opinion` and never human evidence.

---

## 16. VERIFICATION

### 16.1 Search

Every new record was queried by canonical name and by every alias worth typing, against the live
index with the preview flag off. All 22 queries resolve, and each returns its own record first:

| Query | Top result | Matched via |
|---|---|---|
| LL-37 / PT-141 / Epitalon / Sermorelin / DSIP / Thymosin alpha-1 / Kisspeptin / VIP / Semaglutide | the record itself | canonical name |
| Bremelanotide | PT-141 | alias |
| Vyleesi | PT-141 | alias |
| Epithalon, Epithalone | Epitalon | alias text |
| Metastin | Kisspeptin | alias |
| Aviptadil | VIP | alias |
| Ozempic, Wegovy | Semaglutide | alias |
| Zadaxin | Thymosin alpha-1 | alias |
| Thymalfasin | Thymosin alpha-1 | alias text |
| Cathelicidin | LL-37 | alias |
| delta sleep-inducing peptide | DSIP | alias |
| Modified GRF | **Modified GRF (1-29)**, with CJC-1295 and Sermorelin below it as alias matches | canonical, then alias |

That last row is the one that matters. The three GHRH-family records stay **three records** in the
results rather than collapsing into one, which is what the `related_but_distinct` aliases are for.

### 16.2 Reading modes

Checked against the two protocol views directly, which is where the boundary is actually enforced:

| Record | Practitioner view | Simple view |
|---|---|---|
| LL-37 | 2 protocols, both with a reported amount | 0 protocols |
| PT-141 | 2 protocols, both with a reported amount | 0 protocols |
| Epitalon | 2 protocols, both with a reported amount | 0 protocols |
| Sermorelin | 1 protocol with a reported amount | 0 protocols |
| DSIP | 1 protocol with a reported amount | 0 protocols |
| Thymosin alpha-1 | 2 protocols, both with a reported amount | 0 protocols |
| Kisspeptin | 1 protocol with a reported amount | 0 protocols |
| VIP | 1 protocol with a reported amount | 0 protocols |
| Semaglutide | 2 protocols, both with a reported amount | 0 protocols |

The suppression is **structural, not editorial**. `public_v_protocol_simple` has no dosing columns at
all — no `amount_reported`, no `frequency_text`, no `titration_text` — and every protocol in the
library carries `patient_visibility = false`, so simple mode returns no protocol rows for any of the
21 compounds, new or original. There is nothing for a template mistake to leak.

The remaining risk is therefore text that renders in *both* depths, which is exactly the hole this
tranche fell into and section 10 describes. `qa:doses` re-run after publication: **clean across all
21 compounds**, not only the nine new ones.

### 16.3 Public state

- **21 compounds public.** 793 records published in total across thirteen publishable tables.
- Publication refusals are exactly the 8 unwritten quality topics — nothing in this tranche was
  refused by a gate.
- **0 compounds claim a review.** Every record in the register, new and original, is
  `review_state = unreviewed` with `last_reviewed_at = null`.
- `noindex` unchanged. Nothing deployed, no DNS touched.

**A re-seed used to take most of this down**, which is how the hazard in §17 was found: it was hit
while re-verifying these very numbers. It is fixed, and a re-seed is now idempotent with respect to
publication state — 793 published before, 793 after, twice over, with all 98 protocols still public
and nothing withdrawn.

### 16.4 Checks run

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npx vitest run tests/unit` | **415 passing** across 28 files, including the **9 new** integrity tests |
| `npm run build` | succeeds |
| `npm run qa:production` | **No blockers. This database may serve the public.** |
| `npm run qa:doses` | **No dose-shaped strings in any patient payload** |
| `npm run evidence:locators` | **197 resolved, 0 to check, 0 failed** (380 skipped: sources not held, or locators recorded without a page) |
| `npx vitest run tests/integration` | **431 passing** across 36 files (see §18) |

---

## 17. THE RE-SEED HAZARD — ROOT CAUSE AND FIX

Found while re-verifying section 16 on a freshly seeded database. It is the most serious defect this
section turned up, and it had nothing to do with the new compounds: `npm run db:seed` removed **275
of 793 published records** from the public site, silently, with a success message and no error.

Two independent causes, one symptom.

### 17.1 Cause one — the watchdog was shown one frame of a rebuild

A compound packet owns its `protocol_sources` rows, so it rebuilds them:

```sql
delete from protocol_sources where protocol_id = ...;   -- (1)
insert into protocol_sources ...;                       -- (2)
```

`protocol_sources_provenance_guard` fired after (1), saw a published protocol with no citable
source, and did exactly what it was written to do: withdrew it. Statement (2) put the source back.
Nothing put the protocol back, and **nothing should** — the publish path deliberately refuses to
resurrect a withdrawn record, because `withdrawn` is a decision, not a lapse.

So the end state was complete, valid provenance and an empty public protocol library: **98 protocols
withdrawn**, recoverable only by a manual `withdrawn → unpublished` reset. The graph was never
actually broken. The watchdog was shown a frame of a rebuild and asked to judge it as a finished
state.

**Fix — `db/migrations/0031_provenance_guards_check_at_commit.sql` plus a transactional seed.** Both
provenance guards become **deferred constraint triggers**: their events queue and are processed once,
at COMMIT, so the guard sees the completed graph and nothing else. Paired with that, `seedDatabase`
now runs inside **one transaction**, so the intermediate state exists only inside it.

Both halves are necessary, and that was verified rather than assumed — by removing each in turn and
watching the regression tests fail:

| Removed | Result |
|---|---|
| migration 0031 (guards immediate again) | 3 of 7 tests fail |
| the seed transaction (guards still deferred) | 2 of 7 tests fail |
| neither | 7 of 7 pass |

**Nothing about the watchdog was weakened.** `tides_protocol_provenance_ok` and
`tides_claim_provenance_ok` are untouched, the guards still withdraw, the publish gates still refuse.
The only change is *when* the question is asked. Real provenance loss is still caught in every path:
a `DELETE` in autocommit commits immediately, so the deferred trigger fires immediately; a
transaction that genuinely ends with a published protocol standing on nothing is caught at its
commit, which is the first moment the statement is even true; and a seed that fails part way now
rolls back whole, so it cannot leave a published record without provenance behind.

### 17.2 Cause two — six relations had no stable identity

Fixing the watchdog revealed the second cause, which had been hidden behind it. After a re-seed the
protocols survived, and **177 other published records still did not**:

| Relation | Published before a re-seed | After |
|---|---|---|
| `peptide_routes` | 43 | **0** |
| `compound_identity_claims` | 52 | **0** |
| `replication_assessments` | 48 | **0** |
| `regulatory_statuses` | 21 | **0** |
| `pk_observations` | 10 | **0** |
| `compound_products` | 3 | **0** |

No trigger fired and nothing was withdrawn. These six relations are owned wholesale by a packet and
were rebuilt by deleting every row and inserting fresh ones — and **a fresh row is a new row**: new
id, `publication_state` back at its default. The published records did not change state; they ceased
to exist, and unpublished ones saying the same thing took their place.

This is arguably the nastier of the two, because it leaves no trace at all. The protocol withdrawal
at least wrote a reason into `needs_update_reason`.

**Fix — upsert on a natural key, then prune to what the packet still lists.** Four of the six already
had a key to upsert on (`product_key`, `observation_key`, `identity_key`, `assessment_key`).
`peptide_routes` and `regulatory_statuses` had none, so
`db/migrations/0032_stable_identity_for_rebuilt_relations.sql` gives them one:

- `peptide_routes (peptide_id, route_key, source_location_id)`
- `regulatory_statuses (peptide_id, jurisdiction, indication_context)`

Both keys were **verified against the live data before being declared**, not assumed: each is already
unique across the whole library, and `(peptide, route)` alone is not — one compound has two
intramuscular route records from different sources, which is correct and is why the source location
is part of the key. Both are `NULLS NOT DISTINCT`, so a future null cannot silently opt a row out of
the constraint and out of the upsert with it.

Pruning is by surviving id, the same shape `claim_evidence` already used: a record that leaves the
packet still leaves the database, and a record that stays keeps the identity — and the publication
decision — it had.

One knock-on worth having: `pk_observations.product_id` points at `compound_products.id`, so stable
product ids mean that foreign key is no longer rewritten on every seed either.

### 17.3 What the seed now says about itself

`npm run db:seed` used to end with "All seeded records are unpublished and awaiting review." On a
re-seed that was simply false, and it was false in the direction that hid both bugs. It now says:

> New records arrive unpublished. Existing publication states are unchanged.

which is both true and a claim the test suite enforces.

### 17.4 Regression coverage

`tests/integration/seed-preserves-publication.test.ts` — 7 tests, written to the four requirements:

| Test | Requirement |
|---|---|
| the guards are deferred constraint triggers (asserted in `pg_trigger`) | pins the mechanism, so nobody recreates them as immediate triggers |
| every published protocol is still published after a complete re-seed, nothing withdrawn, nothing flagged, and the public view count unchanged | **A** |
| published claims survive a re-seed too | **A**, for the sibling relation |
| a protocol that really loses its last source is withdrawn, with the right reason, and its neighbours are untouched | **B** |
| a protocol whose provenance is lost *inside a transaction* is still withdrawn at commit | **B** — deferral must not become an escape hatch |
| a rebuild that deletes provenance and then fails leaves the database exactly as it was, with nothing published without provenance | **C** |
| publication state is identical after one re-seed and after two, compared **by row id across all seven publishable relations** | **D** |

The last one is deliberately by id rather than by count: cause two replaced rows with equivalent
rows, so a count-only assertion could have passed while every record was silently replaced.

### 17.5 Verified on the real database

Not only in the test harness. On the development database, carrying the full published library:

```
BEFORE re-seed   793 published | 21 compounds | 98 practitioner protocols | 0 withdrawn
AFTER  re-seed   793 published | 21 compounds | 98 practitioner protocols | 0 withdrawn
AFTER  re-seed   793 published | 21 compounds | 98 practitioner protocols | 0 withdrawn
```

Per relation, before and after, unchanged: peptides 21, claims 418, protocols 98, literature screens
10, regulatory statuses 21, routes 43, disagreements 46, products 3, PK observations 10, identity
claims 52, replication assessments 48, quality topics 13, learning topics 10.

`qa:production` after seeding: **No blockers. This database may serve the public.**

---

## 18. THE FULL INTEGRATION SUITE

**36 files, 431 tests, 0 failures, 37 minutes.** Run once with everything final: both migrations
applied, the transactional seed in place, the new compound records published.

Two earlier runs are worth recording, because neither failure was a content failure and both led to a
real change:

| Run | Result | What it was |
|---|---|---|
| 1 | 423 passed, 1 failed | `seed.test.ts` asserted `rows.length === 12`, a hardcoded cohort size the expansion made wrong. Fixed by asserting `seedData.peptides.length` rather than bumping the literal to 21 |
| 2 | 423 passed, 1 failed | `identity-testing.test.ts`, `Hook timed out in 120000ms` in its `beforeEach` re-seed. That file passes alone in 100s — about 5.5s per re-seed — so it was a stall in the embedded database during a 50-minute shared-worker run, not a broken test. Fixed at the cause: `hookTimeout` raised to 240s, with the reason recorded in `vitest.config.ts` |
| 3 | **431 passed, 0 failed** | the run above |

Run 3 has seven more tests than runs 1 and 2 because the re-seed regression suite (§17.4) was written
between them.

---

## 19. TRANCHE 2 — SEVEN PRACTITIONER-REFERENCE RECORDS

Seven records, all class C, all from LaValle monographs verified page by page before anything was
written. The library stands at **28 public compounds**.

| Record | Class | Sources | Loc | Claims | Prot | Gaps | Routes | Aliases | Screen state |
|---|---|---|---|---|---|---|---|---|---|
| AOD-9604 | C | SRC-002 | 5 | 10 | 3 | 7 | 3 | 4 | none run |
| ARA-290 | C | SRC-002 | 3 | 7 | 1 | 5 | 1 | 3 | none run |
| KPV | C | SRC-002 | 3 | 6 | 1 | 5 | 3 | 2 | none run |
| Thymulin | C | SRC-002 | 4 | 10 | 2 | 6 | 1 | 2 | none run |
| MGF | C | SRC-002 | 5 | 8 | 3 | 7 | 2 | 3 | none run |
| PNC-27 | C | SRC-002 | 4 | 9 | 1 | 7 | 1 | 1 | none run |
| Larazotide | C | SRC-002 | 3 | 8 | 2 | 6 | 1 | 1 | none run |
| **Totals** | | | **27** | **58** | **13** | **43** | **12** | **16** | **0 of 7 screened** |

Every record: `review_state = unreviewed`, `last_reviewed_at = null`, published through the real
gates, present in the search index, renders in both modes with the preview flag off, and carries no
literature screen. Eight identity claims were recorded across the seven.

**No candidate was declined.** All seven had enough held material for an honest record. The depth
varies and shows: Larazotide carries a named randomised trial with effect sizes, KPV carries no human
study of any kind, and the pages say so in those terms rather than through a grade.

### 19.1 What each record turned out to be

- **AOD-9604** — a fragment of growth hormone's C-terminus, for fat loss, and separately combined with
  hyaluronic acid for joints. The handbook reports a meta-analysis of six randomised trials in about
  900 adults; it is recorded as a handbook reporting a meta-analysis, not as one. Two findings about
  the source: the printed sequence lists twelve residues where the summary describes sixteen, and the
  rare-adverse-reaction list is the **same boilerplate** already found in the DSIP and kisspeptin
  monographs — a third instance, which settles the point.
- **ARA-290** — eleven residues from erythropoietin's Helix B. Eight classes of animal model, two
  sentences of human material. The claim that matters is comparative: that it does not produce
  erythropoietin's dose-limiting side effects. It is also the **only monograph read in either tranche
  with no adverse-event list at all**, recorded as a gap rather than as reassurance.
- **KPV** — three residues from the N-terminus of alpha-MSH. **No human evidence whatsoever**, and the
  record leads with that. Its most useful content is an identity distinction: the same monograph
  states KPV does not bind the melanocortin receptors alpha-MSH acts through, while its own category
  label calls KPV an "alpha-MSH stimulating peptide" — a label its text does not support.
- **Thymulin** — a nine-residue thymic hormone whose activity requires zinc, which is the rare piece
  of concrete monitoring advice in this handbook. Two randomised placebo-controlled trials in
  rheumatoid arthritis are reported second-hand. The printed molecular weight, 3051.3 g/mol, **cannot
  belong to a nonapeptide** and is close to the figure the same book prints for the 28-residue
  thymosin alpha-1; the figure is therefore not carried on the identity record.
- **MGF** — the IGF-1Ec splice variant, with PEG-MGF as a preparation rather than a separate compound.
  No human study. Banned by WADA, which the handbook prints inside its indications list. And the
  monograph argues with itself: bone repair appears as a use while the mechanism section reports that
  MGF **inhibits osteoblast differentiation and mineralisation** in culture.
- **PNC-27** — the most safety-sensitive record in the library. See §19.3.
- **Larazotide** — the strongest human evidence in the tranche: a 2015 multicentre randomised
  placebo-controlled trial in 342 adults with coeliac disease, with design, endpoints and effect
  sizes, and an unusual result the handbook states plainly — **the lowest of three doses was the one
  that met the primary endpoint**. A Phase 3 study was reported as in progress *as of March 2022*,
  which is more than four years stale and is flagged as historical rather than current.

### 19.2 Identity decisions, and the one that was declined

Every identity question the brief raised was checked against the held page before anything was
recorded.

| Question | Decision |
|---|---|
| **AOD-9604** canonical spelling | One source spells it three ways on facing pages: *AOD 9604*, *AOD9604*, and *Tyr-hGH177-191*. The hyphenated form is canonical; all three are aliases. *AOD-9604 + HA* is `related_but_distinct` — a combination with its own indications and its own intra-articular regimen, not a molecule |
| **ARA-290** and cibinetide | The handbook **does** establish it, printing *Cibinetide acetate*, *Helix B surface peptide* and *HBSP* under Other Name(s). Recorded exactly as printed, **including the salt form**: no bare "cibinetide" alias was invented, and a search for *cibinetide* matches the recorded alias anyway — verified |
| **KPV** and alpha-MSH | `related_but_distinct`, never a synonym. The same monograph states KPV does not bind alpha-MSH's receptors, so a reader arriving from the parent hormone should see the difference rather than be told they are one thing |
| **Thymulin** vs thymosin alpha-1 and beta-4 | Three records. A critical-importance claim states the distinction, evidenced by reading both monographs of the held source: nine residues against twenty-eight, in separate treatments |
| **Thymulin** and Thymalin | `related_but_distinct`, although the handbook lists it under Other Name(s). Nothing held establishes the identity, and a name list is not a basis for merging two scientific identities |
| **"Thyamlin"** | **Declined.** See below |
| **MGF** and PEG-MGF | One record, `related_but_distinct` alias, two protocols and a second identity claim with form `preparation`. The source describes the same peptide pegylated to take a half-life from minutes to days — a preparation, not another molecule, and not casually merged either |
| **IGF-1 LR3** | Appears in MGF's regimens as a pairing. **Not** made an alias and **not** built as a record: it belongs to the separate extraction pass |
| **PNC-27** and PNC-28 | `related_but_distinct`. The handbook states PNC-28 is identical but six residues shorter, and reports much of its cell-line evidence for both together — which a gap records, because it means the findings are not cleanly attributable |
| **Larazotide** canonical naming | *Larazotide acetate* is a synonym, established by the source. The abbreviation *LA* used inside the monograph was **not** recorded: two letters colliding with ordinary English are worse than useless in a search index. No brand name or research code was inferred — the source names a manufacturer and no product |

**The declined one, and why.** The brief asked that "Thyamlin" be reconciled to Thymulin *only if it is
demonstrably the same misspelling*. It was checked: SRC-004 page 3 carries a row reading
`Thyamlin | Longevity | …`. Two things argue against attaching it here. The spelling is a
transposition of **Thymalin**, not of Thymulin — and Thymalin is itself the name whose identity with
thymulin this tranche could not establish. And the indication given there is longevity, where
LaValle's thymulin monograph is immune support. Attaching it would have compounded one unresolved
identity with a guess, so no alias was created and the cheat-sheet row is cited as evidence for
nothing. A gap records the open question.

### 19.3 PNC-27 — the record that needed the most care

The only indication the handbook gives is cancer treatment. Everything it offers as evidence is in
vitro or in vivo laboratory work. And the monograph itself carries two things that matter more than
any of it:

- **A 2017 FDA public warning** about PNC-27 sold over the internet as a cancer treatment, citing
  possible contamination and unknown side effects, after an FDA laboratory found *Variovorax
  paradoxus* in a PNC-27 solution sample intended for inhalation.
- **A case report**: a 46-year-old woman with end-stage metastatic cervical cancer, after multiple
  courses of chemotherapy and a pelvic exenteration, who developed large-volume haematemesis two days
  after a PNC-27 infusion obtained abroad.

Both are recorded at critical importance and placed ahead of the mechanism material, because a
regulator warning about contaminated product sold to people with cancer bears on a reader's decision
more than any in-vitro finding does. The record does **not** assert that PNC-27 caused the
haemorrhage — one case in a patient with that history cannot establish causation — and says so.

**The printed dosage is not physically possible.** The handbook gives a supplied concentration of
5,000 mg per millilitre and derives its amounts arithmetically from it. No aqueous solution reaches
several grams of peptide per millilitre. Three decisions followed:

1. **No correction was invented.** Guessing that micrograms were meant would be inventing a dose,
   which is the one thing this project must never do.
2. **The figures were not suppressed either.** They are on the protocol record, with the
   impossibility stated *in the same field* so the number cannot travel without the warning.
3. **The figure was kept out of every patient-visible field.** The dose scan caught two of these on
   the first pass — in the unknowns summary and in a claim, both of them *warnings about* the number
   that nonetheless contained it. Both were rewritten to describe the problem without printing the
   amount.

**In-vitro cytotoxic concentrations were deliberately not reproduced in claim text.** The handbook
gives IC50 values in micrograms per millilitre. Those are not doses, and printing them beside a dose
block invites the inference that the regimen achieves them, which nothing held supports. The citation
points at the page for a reader who needs the figures.

### 19.4 Compound types and categories

| Record | Type | Why | Category |
|---|---|---|---|
| AOD-9604 | `peptide_fragment` | "modified hexadecapeptide fragment of the C-terminus" | metabolic |
| ARA-290 | `peptide_fragment` | "derived from the Helix B structure of the erythropoietin molecule" | neuro-cognitive |
| KPV | `peptide_fragment` | "the three N-terminal amino acids" of alpha-MSH | immune |
| Thymulin | `peptide` | an endogenous thymic hormone in its own right | immune |
| MGF | `peptide` | a splice variant is a gene product, not a piece cut from one | repair-recovery |
| PNC-27 | `peptide` | a designed construct joining a p53 fragment to a delivery sequence | **uncategorised** |
| Larazotide | `peptide` | a synthetic peptide found by screening, not a fragment | gastrointestinal |

Two deviations from the plan in §5 are worth naming. **ARA-290 and KPV moved from `peptide` to
`peptide_fragment`**, because the source describes both as pieces of a larger molecule and the more
accurate type is the more informative label. And **PNC-27 is `uncategorised`** — no category in the
taxonomy fits an anticancer peptide, and inventing one for a single record with no human evidence
would be worse than leaving it honest. `is_peptide` is true for all seven; no small molecule was built.

### 19.5 Verification, per record

Each record went through the full sequence before the next was started, exactly as the brief set out.

| Record | Public | Claims | Prot | Routes | Gaps | Practitioner | Simple | Search | Review state |
|---|---|---|---|---|---|---|---|---|---|
| AOD-9604 | yes | 10 | 3 | 3 | 7 | 3 rows, doses shown | 0 rows, 0 doses | resolves | unreviewed, null date |
| ARA-290 | yes | 7 | 1 | 1 | 5 | 1 row, doses shown | 0 rows, 0 doses | resolves | unreviewed, null date |
| KPV | yes | 6 | 1 | 3 | 5 | 1 row, doses shown | 0 rows, 0 doses | resolves | unreviewed, null date |
| Thymulin | yes | 10 | 2 | 1 | 6 | 2 rows, doses shown | 0 rows, 0 doses | resolves | unreviewed, null date |
| MGF | yes | 8 | 3 | 2 | 7 | 3 rows, doses shown | 0 rows, 0 doses | resolves | unreviewed, null date |
| PNC-27 | yes | 9 | 1 | 1 | 7 | 1 row, doses shown | 0 rows, 0 doses | resolves | unreviewed, null date |
| Larazotide | yes | 8 | 2 | 1 | 6 | 2 rows, doses shown | 0 rows, 0 doses | resolves | unreviewed, null date |

`qa:doses` was run after **each** record rather than at the end, which is how the PNC-27 leak was
caught while it was still one record's problem.

Alias resolution, checked live with the preview flag off: *Cibinetide* → ARA-290, *cibinetide acetate*
→ ARA-290, *HBSP* → ARA-290, *AOD 9604* and *AOD9604* → AOD-9604, *Tyr-hGH177-191* → AOD-9604,
*Lys-Pro-Val* → KPV, *Nonathymulin* → Thymulin, *Thymalin* → Thymulin, *Mechano-Growth Factor* → MGF,
*IGF-1Ec* → MGF, *PEG-MGF* → MGF, *PNC-28* → PNC-27, *Larazotide acetate* → Larazotide. All thirteen
resolve to the intended record first.

### 19.6 Public state after tranche 2

```
28 public compounds
905 published records across thirteen publishable relations
0 compounds claiming a review
0 protocols withdrawn
111 practitioner protocols public, 0 regimen rows in simple mode
224 locators resolved, 0 to check, 0 failed
```

Publication refusals remain exactly the 8 unwritten quality topics. `noindex` unchanged, nothing
deployed.

---

## 20. STANDING PUBLICATION-INTEGRITY QA

`npm run qa:publication-integrity` — new, and now a release gate in `ACCEPTANCE_TESTS.md` §I.

### 20.1 Why `qa:production` was not enough

`qa:production` asks: **is the data in front of me fit to serve the public?** It looks at one state of
the database and judges it — no demonstration records, no fabricated approval, no review date nobody
earned.

Both Tranche-1 re-seed defects **passed it cleanly**, because after each one the database was still
perfectly fit to serve. It was simply serving 275 fewer records than an hour earlier. A single
snapshot cannot see a loss. "Is this valid?" and "is this still everything it was?" are different
questions, and only the second catches a silent removal.

### 20.2 What it checks

It snapshots the publication surface, performs a deterministic re-seed, and compares the two graphs.
Per row, keyed by **row id** across all fourteen relations carrying `publication_state`:

| Failure | Meaning |
|---|---|
| `published_record_withdrawn` | was published, is withdrawn — the first Tranche-1 defect |
| `published_record_vanished` | was published, the row no longer exists — the second |
| `published_record_unpublished` | was published, is now some other state |
| `record_published_by_seed` | was **not** published and now is — a seed must not publish either |
| `relation_disappeared` | a whole relation missing after the re-seed |
| `provenance_broken` | a published claim or protocol left without a citable source at an exact location |

The registry is **checked against the schema on every run**: any table carrying `publication_state`
that is not listed fails the run rather than being silently skipped. A relation added next year cannot
quietly fall outside the check.

**It does not hardcode 905, 28 or 111.** Those numbers are right today and wrong next week, and a
check that must be edited every time the library grows is a check that gets edited without being read.
What it asserts is structural: a re-seed of unchanged content preserves identity and publication state.

### 20.3 What it deliberately does not check

- **Whether the content is correct.** It compares two states of the same database; it has no opinion
  on whether a claim is true or a locator resolves. `qa:production`, `evidence:locators` and the
  review workflow answer those.
- **Whether a record *should* be published.** A record the gates admitted is in scope; a record that
  ought never to have been published is a different problem.
- **Records that were never published.** A row that was unpublished before and is gone after may
  simply have left its packet, which is allowed and correct.
- **Anything about a real deployment.** It runs against whatever `DATABASE_URL` names and changes
  nothing.

### 20.4 How it avoids touching what it measures

The re-seed runs inside a transaction that is **always rolled back**, so the database is unchanged
whether the check passes or fails. That is what makes it safe to point at production before a deploy
rather than at a copy that might differ from it. Verified both ways during this section: the database
stood at 793 published records before a passing run and before a deliberately failing one, and at 793
after both.

**One subtlety makes the rollback honest.** The provenance guards are deferred constraint triggers
(§17.1): they fire at COMMIT, and a transaction that never commits would never fire them — so the
withdrawal failure mode would be invisible to precisely the check written to catch it. The script
issues `SET CONSTRAINTS ALL IMMEDIATE` after seeding, forcing the queued events to fire mid-transaction,
and then rolls back. What commit *would* have done is reproduced without committing it.

### 20.5 Proof that it catches both defects

Not argued — demonstrated, by reintroducing each defect and running the check.

| Defect reintroduced | Result |
|---|---|
| The pre-fix `compound-packets.ts` (delete-and-reinsert) | **177 failures**, all `published_record_vanished`, exit code 1, naming every record. Exactly the number that was lost |
| Migration 0031 removed (guards immediate again) | 3 of the 7 regression tests fail, including the one asserting the guards are deferred in `pg_trigger` |
| The transactional seed removed (guards still deferred) | 2 of the 7 regression tests fail |

The withdrawal path is additionally pinned by unit tests on the pure comparison rules
(`tests/unit/publication-integrity.test.ts`, 10 tests), which reproduce both defects as snapshot pairs
— including the one a count-only check would miss: one published row out, one unpublished row in, same
relation, same total.

### 20.6 Where it now lives

`ACCEPTANCE_TESTS.md` gained a section **I. Standing release checks**, listing all nine commands with
the question each answers, and the note that `qa:production` and `qa:publication-integrity` answer
different questions and a release needs both. The data/provenance and engineering checklists each
gained a line for it. It is a gate, not tribal knowledge.

---

## 21. TOTALS AND REMAINING INVENTORY

```
ORIGINAL CORE            12
TRANCHE 1                 9
TRANCHE 2                 7
TOTAL PUBLIC COMPOUNDS   28
```

By evidence-depth class: **A — 1** (LL-37) · **B — 0 built** · **C — 15** · **D — 0 built.**

### 21.1 Remaining candidates, grouped as asked

**A. Separate extraction pass required** — material exists in SRC-001, SRC-003 or SRC-005 but not as a
LaValle monograph, so a different extraction approach is needed:

| Candidate | Where the material is | Note |
|---|---|---|
| Cerebrolysin | SRC-001 pp. 279-281, SRC-003 125-130, SRC-005 132-133 | A peptide mixture, not a single peptide — its own identity question |
| GHRP-6 | SRC-001, SRC-005 60-64 | Also named in a registered anti-doping analytical paper (class B for identity and detection only) |
| GHRP-2 | SRC-001, SRC-005 58-60 | As above |
| Hexarelin | SRC-001, SRC-005 63-64 | As above |
| Cagrilintide | SRC-005 45-47 | Verify the held pages describe it rather than mention it |
| IGF-1 LR3 | SRC-002 pp. 96-97 (inside the MGF monograph), SRC-004, SRC-005 | Appears in MGF's regimens; deliberately not built from that |
| SS-31 | SRC-005 107-108 | |
| Liraglutide | SRC-001 210, SRC-005 78-80 | |
| Tirzepatide | SRC-003 75-80, SRC-005 110, 117-119 | |

**B. Identity decision required before building:**

| Candidate | The decision |
|---|---|
| Melanotan I | The handbook discusses Melanotan I and II in one page block. They are distinct molecules — afamelanotide and MT-II — and the presentation is the book's choice, not an identity claim. Two records, each citing the pages describing it, but the split needs a deliberate call first |
| Melanotan II | As above. Also the highest-risk pair in the remaining inventory for indication breadth |
| Thymalin | Whether it is thymulin at all. Tranche 2 could not establish it and recorded it as related but distinct |
| PEG-MGF | Built as a preparation inside the MGF record. If it should be its own record, that is a decision, not an extraction |

**C. Non-peptide taxonomy decision required:**

| Candidate | Type | The decision |
|---|---|---|
| MK-677 (Ibutamoren) | `small_molecule`, `is_peptide: false` | Buildable from SRC-005 86-88. Whether a peptide reference should carry non-peptides at all, and how the public IA would present them, is an open owner question |
| 5-Amino-1MQ | `small_molecule`, `is_peptide: false` | As above, and thinner: one cheat-sheet row |

**D. Insufficient material — hold:**

| Candidate | Why |
|---|---|
| **FGL(L)** | One page in one handbook (SRC-001 p. 239). Class D. Not enough held material for a useful record |
| **"Thyamlin"** | Not a candidate but an open identity question: one row in SRC-004, closer to Thymalin than Thymulin, attached to neither |

### 21.2 Research opportunities added

43 new evidence gaps. The recurring ones:

- **No literature screen exists for any of the seven**, and Larazotide is the clearest miss: a
  compound with a named multicentre randomised trial and a Phase 3 programme, screened for nothing.
- **Three records have no human evidence at all** — KPV, MGF and PNC-27 — and their indication lists
  span muscle, gut, immune, cardiac, neurological and oncological use.
- **Four time-sensitive statements need re-checking**: the Larazotide Phase 3 status (March 2022, now
  more than four years old), the MGF and PEG-MGF anti-doping status, the PNC-27 FDA warning, and the
  AOD-9604 GRAS determination.
- **Two internal inconsistencies in the source** are recorded and unresolved: AOD-9604's residue
  count and Thymulin's molecular weight.

### 21.3 One observation for the owner, not a defect

`assertPatientSafe` is defined for the protocol view, where every field it names is a dosing field.
Applied to a whole peptide page it also fires on `trials[].durationText` — the length of a study rather
than an instruction to anybody. The new every-compound render test therefore asserts the boundary
itself (no dose-shaped string anywhere, no regimen rows in simple mode) rather than calling that helper
page-wide, and says so in the file. Nothing is leaking; a name-based guard simply cannot be applied
page-wide without either a false failure or a loosened helper. Worth a deliberate decision at some
point, and not one this tranche should have taken on its own.

---

## 22. TRANCHE 2 — TESTS AND CHECKS

### 22.1 Tests added, and one duplication removed

**`tests/integration/every-compound-renders.test.ts`** — 4 tests. Publishes the library through the
real gates, then walks **every compound the public views expose** and renders it in both reading
depths on the published path with preview off. It names no compound, which is the point: a record
added next year is covered without anyone remembering to add it here. It asserts claims are attached,
an unknowns statement exists, no dose-shaped string reaches the simple payload, simple mode exposes no
regimen rows, and no compound prints a review date.

Existing suites read through the *preview* path — a freshly seeded test database has nothing published
— so `readPublishedPeptidePage` was added alongside `readPeptidePagePreview` to make the published
path testable at all.

**`tests/unit/publication-integrity.test.ts`** — 10 tests on the pure comparison rules behind the new
QA command, reproducing both Tranche-1 defects as snapshot pairs.

**`tests/unit/dose-text.test.ts`** — 8 tests. Which brings us to the duplication.

**`src/domain/presentation/dose-text.ts` — one definition of "this is a dose", replacing three.** The
rule lived in `scripts/qa/patient-dose-scan.ts` with a carefully considered exclusion list. A second,
cruder copy had been written in `tests/unit/compound-library-integrity.test.ts` during tranche 1, and
this tranche was about to write a third in the render test. The copies had already drifted, and in the
dangerous direction: Thymulin's molecular weight of "3051.3 g/mol" failed the unit test while
`qa:doses` passed it, because the standing scan knows a molecular weight is not a dose and the copy did
not. All three now import the same module, which also grew a `gm/mol` exclusion for the spelling this
handbook actually uses.

### 22.2 Checks run before commit

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npx vitest run tests/unit` | **433 passing** across 30 files |
| Targeted integration (render, re-seed, seed cohort, compound records) | **29 passing** across 4 files |
| `npm run qa:publication-integrity` | **919 rows across 14 relations, 905 published — a deterministic re-seed preserves every published record** |
| `npm run qa:production` | **No blockers. This database may serve the public.** |
| `npm run qa:doses` | **No dose-shaped strings in any patient payload** — and run after each of the seven records, not only at the end |
| `npm run evidence:locators` | **224 resolved, 0 to check, 0 failed** |
| `npm run build` | succeeds; 20 static pages generated |
| `npx vitest run tests/integration` | **435 passing** across 37 files, 0 failures, 32 minutes — one clean run on the final state |

### 22.3 Seed determinism, verified last

After everything else: seed, then publication-integrity, then public counts.

```
Seed          new records arrive unpublished, existing publication states unchanged
Integrity     a deterministic re-seed preserves every published record
Counts        28 public compounds, 905 published records, 0 withdrawn, 0 claiming review
```

---

*Tranches 1 and 2 complete: 28 public compounds. No Tremblay material ingested, no Melanotan, no
MK-677, no 5-Amino-1MQ, no separate-extraction candidates, no PDF or presentation work, no deployment,
no DNS change, `noindex` unchanged, no semantic search.*
