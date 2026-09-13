# SOURCE RECONCILIATION AND THE BPC-157 LITERATURE SCREEN

An authoritative source is not automatic proof that a secondary source was
wrong. This sprint tested that on five conflicts and found four of them were not
conflicts — then ran the literature screen the previous sprint deferred, and
found that the other compound's central claim had the same problem in reverse.

Neither record is published. Neither has been reviewed by a person.
36 test files, 461 tests, `npm run verify` clean.
Screenshots in `review/peptides-v2-final/`. Reference sheets in
`build/publications/`.

---

## PART A — TESAMORELIN

### 1 · What the previous report got wrong

It said the FDA label corrected five errors in a practitioner handbook. Read
against the sources rather than against the summary, the tally is:

| | Previously recorded as | Actually |
|---|---|---|
| Half-life | handbook wrong | **different products, different dosing duration** |
| Molecular weight | handbook wrong | **different chemical forms** |
| Adverse effects | label contradicts handbook | **a 5% reporting threshold** — and the label *supports* the handbook |
| Neoplasms | handbook too weak | **label more specific; handbook stricter on one point** |
| Jurisdiction | handbook wrong | **this index misread the handbook** |

**None of the five is a source error.** The handbook was right every time, and
on one point the second version of the record was worse than the first: it took
an in-house extraction mistake and attributed it to the source it came from.

### 2 · Half-life — resolved by product and condition

The decisive evidence was not reasoning, it was a second label. Querying the
regulator's API for every tesamorelin product returns two, effective the same
day:

| Product | Dose | Population | Administration | Half-life |
|---|---|---|---|---|
| EGRIFTA SV | 1.4 mg | healthy | single | **8 min** |
| EGRIFTA WR | 1.28 mg | healthy | single | **11 min** |
| EGRIFTA *(handbook)* | not stated | healthy | 14 days | **26 min** |
| EGRIFTA *(handbook)* | not stated | HIV+ | 14 days | **38 min** |

Same regulator, same date, same molecule, same population, same route, and two
different numbers. Once that is on the record, **no source could supply a single
half-life for tesamorelin**, and a reader quoting one without naming a product
has quoted something that does not exist.

The handbook's two figures are stated for fourteen consecutive days of dosing.
Both current labels independently state that single and multiple dose
pharmacokinetics were characterised *in exactly those two populations* using the
original EGRIFTA presentation — which is the study the handbook's conditions
describe. Attribution is therefore reasoned, not confirmed: the original label
is no longer retrievable from openFDA or DailyMed, and that is recorded as a
gap rather than glossed.

Classified **RESOLVED — DIFFERENT FORMULATION**.

### 3 · Molecular weight — arithmetic, not judgement

The label: tesamorelin acetate, C221H366N72O67S · x C2H4O2 (x ≈ 7), **5135.9 Da
as free-base equivalent**. The handbook, under "Molecular Composition" with no
form named: **5195.908 g/mol**.

```
free base C221H366N72O67S   5135.856
acetic acid      C2H4O2    +  60.052
                           ─────────
                            5195.908     ← the handbook's figure, to 3 decimals
```

The handbook is reporting the **monoacetate**, which is the value chemical
databases carry. Its printed molecular formula, as far as a poor scan allows it
to be read, begins C223 rather than C221 — the same two carbons.

Classified **RESOLVED — DIFFERENT CHEMICAL FORM**. The handbook is not wrong; it
omits the word that makes the number interpretable, which is a different finding
and now a different state.

### 4 · Adverse effects — and the correction of the correction

The previous record said the label contradicted the handbook because rash and
diarrhoea are absent from the label's ">5%" summary line.

**Rash is in the label's own Table 1, at 4% against 2% on placebo**, and the
narrative names "hypersensitivity reactions (e.g., rash, urticaria)" among the
most commonly reported. Of the handbook's five items, four are corroborated once
the comparison is made against the whole section instead of the summary bullet.
Diarrhoea is the one with no counterpart — which records that it was not
reported at that threshold in those trials, not that it does not occur.

Classified **RESOLVED — DIFFERENT REPORTING THRESHOLD**.

### 5 · Neoplasms — authority, not accuracy

The label carries a §5 Warning: preexisting malignancy inactive and treated
before starting, discontinue on any evidence of recurrence. The handbook lists
neoplasms under caution — *and lists active malignancy as an outright
contraindication, which the label does not.*

On that point the handbook is the more restrictive document. What the label adds
is specificity and regulatory force.

Classified **REGULATORY SOURCE MORE SPECIFIC**. The index's safety presentation
follows the label; the handbook's contraindication is retained rather than
overwritten.

### 6 · Jurisdiction — this index's error

The handbook's entry opens with "Egrifta (Theratechnologies, Inc., Canada)" — a
manufacturer's address. On the next page the same entry says **"Indicated and
approved by US FDA in 2010."**

This index read the first line and never reached the second. The correction then
described the label as correcting the handbook, which compounded it.

Classified **INDEX ERROR CONFIRMED** — a state added for this, kept distinct
from `source_error_confirmed` because attributing an in-house mistake to a
source is its own kind of getting it wrong. A test asserts that no difference on
this compound is recorded as the handbook being in error, because after the
re-examination none of them is.

### 7 · What made this representable

Migration `0022_context_bound_facts.sql`:

- **`compound_products`** — three products under one application, with strength,
  reconstitution, labelled dose and storage. Dose-bearing fields suppressed in
  patient mode; the product *name* carries no strength, because a name cannot be
  suppressed.
- **`compound_forms`** — chemical form, formula, weight, and **`weight_basis`**,
  required by a check constraint wherever a weight is given. `5135.9` with no
  basis is now unrepresentable.
- **`pk_observations`** — one row per reported value with product, dose,
  single/repeat, population, route, study condition, source and locator. There
  is no `half_life` column on `peptides`, and a test asserts there never is.
- **`disagreement_resolution`** — a second axis, separate from the existing
  explanation enum. `resolution_basis` is required by a check constraint for any
  value but `unresolved`: **marking a conflict settled is the one operation here
  that takes information away from a reader, so it may not be done silently.**

### 8 · Tesamorelin — results

- **Conflicts resolved:** 5 (formulation, chemical form, reporting threshold,
  regulatory specificity, index error).
- **True contradictions remaining:** 1 — the manufacturer's labelled amount
  against a lower one the handbook attributes to practice on grounds of cost.
  An economic argument, not an evidential one, and nothing held here resolves it.
- **Product records:** 3 (EGRIFTA, EGRIFTA SV, EGRIFTA WR).
- **Chemical forms:** 2.
- **PK observations:** 7 across four parameters.
- **Regulatory facts:** FDA, BLA 022505, United States; one approved indication;
  Limitations of Use including *not indicated for weight loss management, as it
  has a weight neutral effect*, and long-term cardiovascular safety not
  established.
- **Primary evidence:** two FDA labels. SRC-028 (EGRIFTA WR) was registered this
  sprint, and SRC-027's locator was corrected — the manifest had recorded the
  openFDA *document id* as the SPL *set id*, so every citation under it would
  have broken at the next label revision.
- **New gaps:** the original EGRIFTA labelling (unreachable through the
  regulator's public interfaces), and which study the handbook's half-lives
  belong to.

---

## PART B — THE BPC-157 LITERATURE SCREEN

### 9 · The search

```
Database   PubMed, NCBI E-utilities (esearch + efetch, db=pubmed)
Query      "BPC 157"[All Fields] OR "body protection compound 157"[All Fields]
             OR "PL 14736"[All Fields]
Date       13 September 2026
Returned   230 records
```

`PL-10` was tested as a fourth term and **rejected**: it matches 158 unrelated
records and would have made the universe mostly noise. The rejection is recorded
in the script, because a screen whose query was tuned invisibly is not
reproducible.

Deduplication: none within PubMed, which returns one record per PMID. Records
reporting one study in several journals are *not* collapsed — this is a screen
of publications, and merging them would hide that one research group accounts
for most of the corpus. The withdrawn article and its erratum are kept and
marked.

### 10 · What the 230 records are

| | |
|---|---|
| Animal, in vivo | 162 |
| Review | 48 |
| Commentary, comment or reply | 7 |
| Peripheral mention | 4 |
| **Human, given the compound** | **2 interventional + 1 observational** |
| Human sample, analytical | 2 |
| Cells or materials | 2 |
| Isolated tissue (human artery, ex vivo) | 1 |
| Withdrawn | 1 |

**Studies in people: 3. Total participants: 31.**

Every record is in `data/seed/literature/bpc-157-screen.json` with its study
type, evidence class, included/excluded flag, reason, primary/secondary status,
identity certainty, full-text status, and **whether a rule or a person
classified it**. Twenty-three were hand-adjudicated. The script regenerates the
ledger from the query and refuses to finish if any record is left unadjudicated.

### 11 · The three human studies

| PMID | Year | Design | n | Why it establishes little |
|---|---|---|---|---|
| 40131143 | 2025 | IV infusion, safety pilot | **2** | No control, no blinding, one private clinic, and both participants had received IV BPC-157 before the study |
| 39325560 | 2024 | Periurethral injection, interstitial cystitis | **12** | Single arm, self-rated outcome after one procedure, material compounded by a 503A pharmacy |
| 34324435 | 2021 | Retrospective intra-articular chart review | **17** | Telephone survey, no validated instrument, part of the cohort also received thymosin beta-4 |

All three in the same journal. **No randomised controlled trial exists.**

Two records a careless screen would have miscounted are in the ledger with the
reason they were not: PMID 22204800 carries the MeSH heading *Humans* and gave
the compound only to rats, and PMID 17186181 is a review *asserting* that
clinical trials happened.

**Independent corroboration.** A 2025 systematic review (PMID 40756949 — three
databases to June 2024, two screeners) identified 544 records, included 36
studies — 35 preclinical, 1 clinical — and reported that **no clinical safety
data were found**. Two screens, different methods, same shape of answer.

### 12 · The count is not the evidence

`result_count` is stored as the size of the search result, and every count shown
beside it is computed from the classified ledger rather than asserted. A test
requires `resultCount > includedCount > humanPrimaryCount` and that every use of
the number 230 in the record's prose is followed by the word "records".

A second defect this caught: `humanPrimaryCount` initially counted by evidence
class, which made it 5 — two of the human-class records are doping-control
methods validated in human urine, in which nobody was given anything. The page
said five and every sentence on it said three. It now counts by study type, and
the criterion is stored with the screen: *administered to human beings, with an
outcome in those people reported.*

### 13 · The practitioner crosswalk

Full crosswalk in `docs/BPC157_PRACTITIONER_CROSSWALK.md`.

All twenty-two references the handbook gives for its BPC-157 entry were
transcribed and matched against the screen. **Twenty-one resolve: fourteen
animal studies and seven reviews. Not one is a study in people.**

The twenty-second is the one that matters most. The handbook's statement that
BPC-157 "inhibits the growth of several tumor cell lines" carries a single
citation: **Radeljak et al., *Melanoma Research* 2004;14:A14–A15** — an abstract
supplement, one human melanoma cell line, not indexed in PubMed. The
cancer-cachexia claim traces to a 2018 review whose abstract says "Before
clinical trial".

The handbook is not misrepresenting its sources. It says throughout that its
findings come from laboratory studies, and it is accurate. What the crosswalk
establishes is that **a clinician following its citations will not arrive at
human evidence, because there is none at the end of them** — and that cannot be
seen from the entry.

### 14 · Cancer, and why it stays open

Four positions, recorded, none resolved:

| Position | Evidence behind it |
|---|---|
| Caution in cancer *(handbook)* | Mechanism: pro-angiogenic |
| Anti-tumour *(handbook)* | One 2004 conference abstract, one cell line |
| Tumorigenesis concern *(Józwiak 2025, PMID 40005999)* | A speculation from mechanism, in a review |
| Anti-tumour potential *(Sikirić 2025, PMID 41155565)* | A published comment from the group that produced most of the corpus |

The pro-angiogenic finding is genuinely supported — chick membrane assay, rat
hind limb, VEGFR2 in human endothelial cells (PMID 27847966). The anti-tumour
claim is not supported at comparable weight. **And neither is resolvable from
what exists, because a cell line is not a person in either direction.**

The public output makes the uncertainty clearer. It does not resolve it.

### 15 · BPC-157 — results

- **Human studies identified:** 3, all uncontrolled, 31 participants.
- **Evidence gaps:** 10, three of them new — the IBD trials asserted under codes
  PL 10 / PLD 116 / PL 14736 and absent from the search; the full texts of the
  three human studies; and **what the material used in those studies actually
  was**, since one names a compounding pharmacy and none reports
  characterisation.
- **Regulatory:** two independent 2025–26 reviews state no regulator has
  approved it, for absence of sufficient clinical study. Recorded as secondary
  evidence: a review reporting a regulator's position is not the regulator.
- **New claims:** BPC-008 (what the human studies cannot establish), BPC-009
  (the citation crosswalk), BPC-010 (the development position).
- **Sources registered:** SRC-029 … SRC-034, all read at abstract level, all
  marked `abstract_held` — a new access state, because calling them `held`
  claims a copy that is not there and calling them unretrieved would say nobody
  had read them. A test requires every locator on such a source to identify
  itself as an abstract.

### 16 · Priority for deep extraction

Not all 230. Ranked for what the record needs:

1. **The three human studies** — full texts. (1)
2. **PMID 42123221**, human internal mammary artery ex vivo, n=12 surgical
   donors — the strongest tissue-level evidence in the corpus, and still
   preclinical. (2, 5)
3. **PMID 27847966**, VEGFR2 angiogenesis — the mechanistic paper both sides of
   the cancer dispute rest on. (4, 5)
4. **The IBD trials** under the three development codes, if they exist. (1)
5. **Radeljak 2004**, the melanoma abstract — obtainable only outside PubMed. (4)
6. **The gastroprotection group** (PMIDs 8769287, 21295044, 28839430, 10499368)
   — the original programme, the best-replicated animal finding, and the
   foundation most practitioner claims stand on. (6)

---

## PART C — THE PRODUCT

### 17 · Visual modules

All data-driven. **No figure here contains a medical statement written into the
markup** — a diagram that says something the database does not is a second,
unreviewable source of medical content, and it drifts the first time the record
is corrected and the SVG is not.

- **Pharmacokinetics** — every value with its product, population,
  administration, route and conditions, bars proportional within a parameter.
  This is the Part A finding made visible: four half-lives that stop looking
  like a contradiction when the conditions are printed beside them.
- **Evidence landscape** — the screen's ledger as three headline figures and a
  proportional bar. 230 records, 3 studies in people, 165 preclinical.
- **Human records** — every human record with the reason it was counted or not.
- **How this search was run** — query, date, criteria, verbatim.
- **Products and chemical form** — three products side by side; two molecular
  weights with the basis each is expressed on.
- **Route map** — route by evidence class, above the full route table.

**Not built:** a mechanism or pathway diagram. Drawing one would require medical
content in a component, which is prohibited, or another schema layer to drive
it. Named rather than glossed.

### 18 · Search

`sectionHintsFor` routes a query to the section it is asking about — navigation
vocabulary only, no statement about any compound. `Tesamorelin FDA` offers
regulatory status; `BPC-157 human evidence` offers the literature screen;
`BPC protocols` offers the protocols; a bare compound name offers nothing,
which is correct. All nine of the brief's queries are tested.

The search service returns no field carrying `body_text`, so a practitioner
dose cannot reach a result snippet. Asserted against the shape of the result,
not against today's data.

**Stated plainly: the hints are not yet visible on the running site.** Search
indexes published records only, and neither compound is published — so
`BPC-157 human evidence` currently returns the *source* record for the pilot
study and no compound to route into. The routing is a pure function and is
tested as one; it renders the moment a compound publishes. Publishing one to
make a feature demonstrable is exactly the thing this project does not do.

### 19 · Reference sheets

`npm run sheets` renders one PDF per compound from the database — 7 pages for
tesamorelin, 6 for BPC-157. Nothing is written into the template.

Every sheet prints the record's version, the generation date and whether a
person has reviewed it, because **a printed sheet is the artefact most likely to
be photocopied and consulted six months after the record it came from was
corrected**. Protocols appear attributed, with their evidence class, under a
heading saying so. There is no Tides regimen.

They read as a dossier rather than a card. That is the right density for a
reviewer and the wrong one for a clinic wall, and narrowing it is design work
for the reference guide these feed.

### 20 · Reading

Two rendering defects found by looking at the page rather than at the tests:

- **Summaries rendered as one unbroken block with literal asterisks in it.** The
  tesamorelin practitioner summary arrived as eight hundred words in a single
  paragraph. `SummaryProse` now renders paragraph breaks and bold lead-ins — a
  deliberately tiny subset, built from split strings, so stored text cannot
  become markup.
- **The BPC-157 evidence section was 10,530 pixels tall.** Every claim rendered
  every evidence card fully expanded. The detail now sits behind a native
  `<details>` whose summary line names the source types, so *what kind of
  evidence stands behind a claim* stays visible whether or not anyone opens it.
  Section height 10,530 → 5,225; page 28,236 → 22,930.

### 21 · Patient safety

Three more suppressions, all in paths that did not exist before this sprint:

- **Evidence annotation and formulation.** The editor's note on what a source
  said cannot summarise the label's pharmacology section without naming a dose.
- **Product notes.** "The safety of this product was established on trials with
  the 2 mg dose of the other one" is a natural sentence and a dose.
- **PK observation notes.** Same shape, same reason.

The product *name* was a fourth: "EGRIFTA SV (tesamorelin) for injection, 2 mg
per vial" put a strength in the one field that cannot be suppressed. Names are
now bare.

That is eight patient-boundary failures across three sprints, every one in a
path created by new content rather than by new code.

### 22 · Tests

`tests/integration/source-reconciliation.test.ts`, 15 tests: PK not flattened;
no half-life column anywhere; two weights are two forms, asserted by the 60.052
arithmetic; a weight with no basis is refused by the database; a reporting
threshold is not a disproval; resolved stays distinguishable from open; a
resolution without a basis is refused by the database; the jurisdiction error is
recorded against this index; the regulatory source is authoritative without the
other being wrong; products stay distinct; patient mode gets no strength, dose,
reconstitution, product note or PK note; patient mode gets no evidence
annotation; a practitioner claim stays distinct from primary evidence; search
routes to sections; no search field can carry a dose.

Plus, in `peptide-experience.test.ts`: every human-evidence statement is tied to
a repeatable search, and a result count can never become an evidence count.

Two existing assertions were deliberately updated rather than bent, and both
changes are the finding rather than a concession:

- *"records where the label contradicts the handbook"* previously required at
  least three `contradicts` relationships and now requires none, because the
  re-examination removed them. What it requires instead is that every difference
  is still on the record with both sides attributed.
- *"records no human evidence for BPC-157"* carried a note saying that if a
  human class ever appeared it would be because a human source had been added,
  and the assertion should be updated deliberately. It was.

---

## 23 · Recommended: peptide #3

The template these two define is now genuinely complete — one compound with an
approved product and an authoritative regulator, one with none and a literature
that had to be screened before anything could be said about it.

**Recommendation: Semaglutide** is the obvious candidate and is the wrong one.
It would test nothing new: it is tesamorelin's shape again, with more labels.

**Recommend instead: Thymosin beta-4 / TB-500.**

It is the only compound in the register that carries an unresolved *identity*
problem — verification issue V-001, where practitioner sources treat TB-500 and
full-length thymosin beta-4 as interchangeable and the schema already records
`related_but_distinct` for exactly this. Neither of the first two compounds
exercised it. Everything this sprint built — chemical forms, the alias
semantics, a literature screen bounded by inclusion criteria — bears directly on
the question "are these two names the same substance", which nothing has yet
forced the platform to answer.

Second choice if a simpler case is wanted first: **Sermorelin**, which is a
GHRH analogue like tesamorelin with a very different regulatory history, and
would test whether the product/formulation architecture generalises.
