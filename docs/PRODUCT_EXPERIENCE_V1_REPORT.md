# Product Experience v1 — Report

Branch `phase-a-foundation`. Baseline commit 2170d53. No deploy, robots remain `noindex`, no thirteenth compound, no new sourcing sprint. Owner review build: `review/product-experience-v1/` (open `CONTACT_SHEET.html`). It is local only: `review/` and `build/` are gitignored, so regenerate it with `npm run shots:experience` (dev server running) and `python -X utf8 scripts/qa/render-publication-pages.py`, or rebuild just the sheet with `npm run shots:experience -- --sheet`.

The sprint's test: **understandable in 60 seconds → useful to a clinic in 5 minutes → fully traceable at depth.**

---

## WHAT CHANGED

| Area | Change |
| --- | --- |
| Homepage | Rewritten around three reading depths (60 seconds / 5 minutes / at depth), a "Start with a question" journey, audience paths, the editorial-state legend, and the index's six rules. Provenance figure kept as the hero drawing. |
| Learn | New hub: a seven-step learning journey (peptide → signal → body → made → quality → evidence → protocols), a foundations grid drawn from published learning topics, a figures library (`/learn/figures`) and a publications page (`/learn/publications`). |
| Learning topics | New `/learn/[slug]` pages render each foundation topic from records: drawings, **Tides synthesis** cards, **source fact** claims, **source needed** gaps, and previous/next journey links. |
| Editorial model | Three visible states — SOURCE FACT, TIDES SYNTHESIS, SOURCE NEEDED — with a new `editorial_syntheses` table (migration 0027) and publish gate. |
| Illustrations | A deterministic SVG system (17 figures in the shared library, plus section figures) across biology, method and quality, sharing one frame, one token palette and a stated basis line. |
| Peptide pages (all 12) | New first screen: the brief, the evidence drawn as three lanes, open-question count and a "read as far as you need" path. Section titles in two voices. New *Mechanism, as reported* and *Safety context* sections gathered from existing claims and gaps. Simple mode folds the full route table into a disclosure. |
| Protocols | Rebuilt library: compound chooser, comparison matrix with "differs between sources" marks, evidence-context key, simple compound cards with no dose fields. |
| Research | The 76 questions grouped into nine reader categories, each with *what we know / what we don't / worth studying next*. |
| Quality | See QUALITY. |
| Reading modes | The public layout stamps `data-reading-mode`; CSS gives simple mode a larger rhythm and hides dense practitioner blocks. |
| Publications | *Understanding Peptides* chapter 3 now prints the SYN-BODY-01 synthesis in place of a source-needed box; the web publications page is checked against the book's chapter list by a unit test. |

New tests: `tests/unit/editorial-syntheses.test.tsx`, `tests/unit/publication-volumes.test.ts`, `tests/unit/research-categories.test.ts`, `tests/integration/editorial-syntheses.test.ts`, plus updates to the 2026-09-14 source-batch test.

## WHY

The evidence architecture was complete and trustworthy but read like a register: every page opened with provenance, not with the answer a reader came for. The three failures we designed against:

1. **A patient could not tell in a minute whether a compound had been studied in people.** The opening now answers that before any section begins, and it is drawn from the same classification the evidence section uses, so the two can never disagree.
2. **A clinic could not compare regimens without reading every record.** The matrix puts the fields a clinic compares first side by side and marks where the sources disagree. It never merges them.
3. **The foundations were only in the PDF.** Learn now carries them as pages, with the same claims and the same gaps.

Nothing in this sprint adds a claim a source doesn't make. Every visual either counts records, arranges them, or draws general science stated in cited claims.

## VISUAL SYSTEM

- **Tone.** Editorial and calm: serif display type for questions and briefs, a quiet sans for method, warm-white ground, tide-teal and deep-tide accents. No stock photography, hexagons, helices, glows or gradients.
- **Rhythm.** `.editorial-break` draws a thin tide rule between major movements; `--rhythm` widens section spacing in simple mode. Long pages alternate prose, a drawing, and a comparison block rather than stacking cards.
- **Progressive disclosure.** `Disclosure` blocks carry depth (full route record, answered gaps, per-source detail) with a count, so a reader knows what is folded away.
- **Evidence encoding.** Human, preclinical and reference evidence use distinct *shapes* (circle, square, diamond) as well as tints, so the distinction never rests on colour alone.
- **Two depths.** Simple mode is spacious and has a lower reading load: questions as headings and one idea per block. Practitioner mode is dense, with reference headings, counts and tables.

## ILLUSTRATION SYSTEM

All figures live in `src/components/illustrations/` and render through one `Illustration` frame:

- `role="img"` with a `<title>` and `<desc>`, per-figure marker ids (safe to repeat on a page), a `minWidth` for horizontal scroll on phones, and a **basis line** stating what the drawing rests on (claim keys, or "method: how this index is built").
- Colours come only from design tokens. **No digits appear in labels.** A unit test decodes entities and rejects numerals, so no drawing can imply a dose, a concentration or a time.
- The concentration–time figure is a computed one-compartment curve, so its half-life bracket is exact rather than sketched. It carries no units.

| Group | Figures |
| --- | --- |
| Biology | chain scale (amino acid → peptide → protein), peptide bond, message and receiver, receptor binding, cell signalling, circulation, routes, concentration over time |
| Method | evidence lanes (human vs preclinical vs reference), known / unknown, protocol comparison |
| Quality | sequence-to-vial journey, mass identity, sterility, endotoxin, lyophilisation, chain of custody (plus the quality agent's section figures; see QUALITY) |

Registries: `ILLUSTRATIONS`, `TOPIC_ILLUSTRATIONS` (which drawings a learning topic shows) and `QUALITY_ILLUSTRATIONS`. No drawing depicts a compound-specific mechanism: on compound pages, mechanism is shown as attributed source statements.

## SIMPLE MODE

- **Headings are the patient's own questions:** *What is it? What has been studied? What nobody has shown yet. What to ask a clinician.*
- **The opening** has a short plain brief, three evidence lanes labelled *Studied in people / Studied in animals or cells / Described in practice or reference works*, and a four-step reading path.
- **The overview** carries on from the brief rather than repeating it.
- **No dosing interface anywhere.** Protocol fields stay suppressed in queries and views, and the simple protocol index shows compounds, routes and evidence context only.
- **Dense blocks collapse:** the six-part evidence summary is practitioner-only, and the full route table sits in a disclosure.
- **Learning topics use plain-language synthesis text** and hide the reasoning behind a fold.

## PRACTITIONER MODE

- **Headings are reference names:** *Evidence; Mechanism, as reported; Safety context; Administration routes; Source-reported protocols; Disagreements and unknowns.*
- **The opening brief** is the first two sentences of the practitioner summary, with a link to the full text. *Evidence at a glance* follows immediately.
- **Counts appear everywhere they help:** statements per lane, records per compound, sources per regimen, open questions per category.
- **The protocol matrix and the route evidence table are always open.** Synthesis cards show their reasoning, the claims they rest on (linked to `#claim-KEY` anchors) and what they do not conclude.

## PROTOCOLS

- **Never averaged, never recommended.** Each column is one source's regimen as published, with source, route, population/context, amount, frequency, duration and monitoring.
- **Disagreement is visible.** Where sources word a field differently, the row carries a "Differs between sources" diamond, and each distinct wording gets a letter, so a reader can see which sources agree.
- **"Primary source not traced"** shows only where it applies: on practitioner-reported columns.
- **The chooser** groups compounds by whether a comparison exists (more than one record), not by how well supported they are.
- **Simple mode** gets compound cards without amount, frequency or duration.
- **The evidence-context key** shows each badge exactly as it appears on a record.

## RESEARCH

The 76 recorded questions are grouped into nine reader categories. Every database opportunity type maps to exactly one category, and a unit test proves it.

| Category | Questions |
| --- | --- |
| Human evidence gap | 19 |
| Safety | 9 |
| Pharmacokinetics | 7 |
| Route | 4 |
| Formulation | 9 |
| Mechanism | 6 |
| Replication | 6 |
| Protocol inconsistency | 9 |
| Identity and regulatory | 7 |

- **Each category** has a drawn glyph, a plain label for simple mode and a *what we know / what we don't know / worth studying next* structure.
- **"What we know" links to the compound section** where the recorded evidence lives.
- **The order is a reading order, not a ranking.**

## QUALITY

Quality is now built as a story that starts at *sequence to vial*, and every page separates **what a result says** from **what it does not**.

**`/quality`**
- **Hero:** the journey drawing and an entry into the fifteen-stage story.
- **"Two halves" panel:** what a test result establishes, beside what it does not.
- **A map of twelve quality dimensions** in four parts: *making* (sequence, synthesis, purification), *measuring* (identity, content, purity), *finishing* (sterility, endotoxin, fill/finish, lyophilisation) and *following* (batch, documentation, chain of custody).
  - Each dimension has a drawn mark, its question, and its real state from the register.
  - A dimension links only when evidence exists, so the map can't promise pages that aren't written.
- **The analytical pathway:** a numbered thread beside the three-questions figure (purity, identity and content are separate).
- **Directory:** written topics as rows; unwritten ones as quiet dashed pills with their state.

**`/quality/[slug]`**
- **Order:** hero band, then *In short*, then *How it works* with the topic's drawings.
- **Journey links:** links to the stages where this topic's claims appear, derived from claims rather than hard-coded.
- **Split panel:** the *establishes / does not establish* pair, with common misreadings as a pull quote.
- **Simple:** drawings, evidence closed, gap cards without the technical "what would settle it".
- **Practitioner:** evidence open, every figure, gaps with "what would settle it" and partial-resolution notes.

**`/quality/sequence-to-vial` (the anchor)**
- **Structure:** the fifteen-stage figure; a sticky, scrolling stage stepper (not printed); the stages in four parts on a numbered thread, each with its question, checkpoint badge and related links.
- **After the stages:** where checks happen, bulk versus vial, "five things" to look for, batch and storage figures, and gaps.
- **Simple:** two statements per stage with the rest folded.
- **Practitioner:** every statement, with claim-key anchors.

**Fixes found along the way**
- **Lyophilisation stage:** it showed *Source needed* despite having claims, because the domain key `lyophilization` didn't match the slug `lyophilisation`. All 15 stages now show as sourced (previously 14).
- **"API versus vial" figure:** it said no held source describes the finished vial. It now says so only while the formulation, fill/finish, lyophilisation and release stages lack loaded claims.

**Topics that link:** synthesis (SPPS), purification, identity, HPLC purity, content assay, sterility, endotoxin, lyophilisation, formulation/excipients, batch traceability, storage stability, transport excursions and certificate of analysis. Eight topics with no claims are named but not linked: mass spectrometry, residual solvents, pH, water content, heavy metals, GMP, global manufacturing and administration.

**Follow-ups, not made in this sprint**
- Carry the real slug in `SEQUENCE_TO_VIAL_TOPICS`, so the page's local key→slug mapping can go.
- An editor should check whether the storage figure's "Before use: no held source" label is out of date now that TRANS-003 exists.
- The static `/quality/certificate-of-analysis` route overrides `[slug]`, so it doesn't yet get the new hero and two-halves panel.
- The stepper sticks under the 64px header; it must move if the header height changes.

## THREE-STATE EDITORIAL MODEL

| State | Meaning | Where it lives | Guard |
| --- | --- | --- | --- |
| SOURCE FACT | Directly supported by a cited source | `claims` + evidence | existing claim publish gates |
| TIDES SYNTHESIS | A transparent conclusion from several sourced facts | `editorial_syntheses` + `editorial_synthesis_claims` (migration 0027) | DB checks: exactly one subject, **no numerals**, limits stated; publish trigger requires ≥ 2 linked claims, all published; the seed loader refuses claims with contradicting evidence |
| SOURCE NEEDED | An assertion without evidence | `evidence_gaps` | unchanged |

Six syntheses are seeded, all on foundations, none on a compound. (Correction, publications v2: they were seeded as unpublished and render only through the development preview; none is on the public read path yet. See `docs/PUBLICATIONS_V2_REPORT.md`.) They are: SYN-PEP-01, SYN-BODY-01, SYN-SIG-01, SYN-REC-01, SYN-PK-01 and SYN-RTE-01. Each card names the claims it rests on and what it does not conclude.

SYN-BODY-01 closed the previously open "the body makes it" gap. It does so with a synthesis that explicitly concludes *nothing* about any product's safety or efficacy.

## OPEN UX QUESTIONS

1. **Printing collapsed disclosures.** Should print expand every `Disclosure`, or print the summary line only? Currently the browser default applies.
2. **Research: identity and regulatory placement.** Identity questions are closer to Quality than to research gaps. Should that category move, or cross-link?
3. **Research section order.** The reading order begins with human evidence. Should safety lead for a patient audience?
4. **Placeholder wordings in the protocol matrix.** "Not specified" currently counts as a distinct wording, so it can trigger a "differs" mark. Should absence be shown separately from disagreement?
5. **Duplicate filter label.** "Human trial regimen" appears twice in the protocol filters, from two underlying evidence classes. Should they merge in the UI or be relabelled?
6. **Printing the comparison matrix.** Wide matrices scroll horizontally on screen. Print needs a landscape or stacked layout decision.
7. **Provenance figure on phones.** It scrolls horizontally at 390px. Should phones get a stacked variant instead?
8. **Chooser grouping.** Is "has something to compare / single record" the right first split, or should route be?
9. **Counting units.** "Evidence recorded here" counts evidence rows in some places and statements in others. Pick one noun for simple mode.
10. **Sequence-to-vial in simple mode.** It folds every statement after the first two per stage. Is two right, or should all show?
11. **Stages without their own page.** Sequence and fill/finish link as "Within Peptide synthesis / SPPS" and "Within Sterility". Is that wording clear?
12. **Overlap on `/quality`.** Should the three-questions figure stay now that the twelve-dimension map covers similar ground?
13. **Unwritten quality topics.** Should simple mode show their state label ("Open question recorded"), or only the name?
14. **Illustrations in print.** *Understanding Peptides* still prints dashed "Illustration" placeholders (for example, "Where endogenous peptides act" in chapter 3). The web SVG figures are not yet rendered into the PDF volumes. Should they be ported to react-pdf SVG, or should the placeholders stay until the print design pass?
15. **Syntheses on compound pages.** The model supports them, but none are written. Should compound syntheses require clinical review before any are drafted?

## VERIFICATION

Run from the final post-change state.

| Check | Result |
| --- | --- |
| Unit tests | **232 / 232**, 17 files (158 at baseline; new: syntheses, publication volumes, research categories, record-opening brief) |
| Full integration suite | **385 / 385 tests, 32 / 32 files**, from one whole-suite run from the final state, with no targeted reruns (379 at baseline; +6 editorial-synthesis tests) |
| Typecheck | clean |
| Lint | clean |
| Production build | passes; 18 / 18 static pages (17 at baseline); no build errors or warnings |
| Locators | 172 resolved, 0 to check, 0 failed, 352 skipped (unchanged from baseline) |
| Dose scan | all 12 records clean; no dose-shaped strings in any patient payload |
| Patient audit | 12 / 12 checked, none skipped; 10 clean; MOTS-c (8) and tesamorelin (4) strings inspected. These are the same benign "reconstitution" wording as at baseline, in research-question and uncertainty text. |
| Compound brief | all 12 compounds, both modes: the opening brief is not repeated in the overview |
| Quality pages | all 16 quality URLs return 200 in both modes (quality section work) |
| Publications | *Understanding Peptides*, *Peptide Quality*, *Science & Applications*, *Reference Guide* and *Protocols* rebuilt. SYN-BODY-01 prints in chapter 3 (page 10). Review pages rendered to `review/product-experience-v1/publications/`. |
| Review build | 15 desktop pages (full + first screen), 15 phone pages, 9 publication pages, `CONTACT_SHEET.html` / `.png` |
| Robots | `noindex` unchanged; nothing deployed; no thirteenth compound |

Known noise, not regressions: *Protocols* PDF build logs React "same key" warnings (that volume and its data sources are unchanged this sprint), and the locator PDF parser logs `TT: undefined function` font warnings.
