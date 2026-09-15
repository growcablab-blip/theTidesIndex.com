# Publications v2 — Report

Branch `phase-a-foundation`. Baseline commit 5c78433. No deploy, robots remain `noindex`, no thirteenth compound, no new sourcing. Owner review board: `review/publications-v2/CONTACT_SHEET.html`. The complete PDFs are copied beside it in `review/publications-v2/pdf/`.

The sprint's aim was to turn the five volumes into clinic-ready teaching materials. The web illustration system now prints: the drawings are not screenshots and not redrawn by hand, but read from the same element tree the site renders. The patient volume is built around one principle: **headline + drawing + one short explanation**, before any deeper text.

Owner decisions implemented:

1. **Print disclosures.** Collapsed web sections expand in print.
2. **Not specified.** A field a source leaves out is never counted as a disagreement.
3. **Illustrations in the PDFs.** Every placeholder is replaced by a real figure.
4. **Compound-specific syntheses.** These now require human scientific review before publication, enforced in the database.

---

## PAGE COUNTS

All five volumes were built from the final state. Page counts are A4.

| Volume | Pages | Before | What changed the count |
| --- | --- | --- | --- |
| Understanding Peptides | **35** | 26 | the "Before you start" page, the four-page short course, and figures in every written chapter |
| Peptide Science & Applications | **24** | not recorded | fourteen figures, and a front-matter page on how chapters are layered |
| Peptide Quality | **22** | not recorded | the spine, six finished-vial figures, and two chapters set as planned spreads |
| The Peptide Reference Guide | **76** | 91 | a tighter monograph template with an unequal hierarchy |
| Peptide Protocols & Clinical Quick Reference | **109** | 72 | a field-by-field agreement / difference / not-reported grid for every compound |

"Not recorded" means no page count was kept for that volume before this sprint; none is estimated. The twelve single-compound reference sheets were rebuilt too, at 5–8 pages each.

## ILLUSTRATIONS USED

The illustration registry now holds **24 figures**: the 17 from Product Experience v1 and 7 created in this sprint. The protocol-comparison figure was also redrawn to show the new comparison rules.

**How figures reach print.** `src/publishing/illustration-print.tsx` reads each web illustration's React element tree and emits native react-pdf vector primitives. It does not screenshot anything and does not redraw by hand:

- design-token colour classes resolve to the print palette, and `currentColor` to each element's computed colour;
- inherited SVG attributes pass down through groups;
- arrowheads are drawn as oriented polygons, because react-pdf's `<marker>` support is unreliable;
- each label line is set at an absolute position, and the one rotated square becomes a polygon;
- anything unrecognised throws, so a half-converted figure cannot print with a label missing.

**Checks.** Each printed figure carries its caption and a basis line: the claim keys it was drawn from, or the method note for drawings of how the index works. A unit test converts and renders every registered figure. `scripts/publishing/build-figure-proof.tsx` writes a one-figure-per-page proof, rendered into `review/publications-v2/figure-proof/` and inspected.

| Volume | Web figures placed | Distinct figures | Print-only figures kept |
| --- | --- | --- | --- |
| Understanding Peptides | 22 | 15 | 0 |
| Peptide Science & Applications | 14 | 14 | 0 |
| Peptide Quality | 10 | 10 | 5 |
| Reference Guide | 0 | 0 | 0 |
| Protocols & Clinical Quick Reference | 0 | 0 | 0 |

**Understanding Peptides.**

| Where | Figures |
| --- | --- |
| Short course, and again in the chapter | chain-scale, peptide-lifecycle, message-receiver, study-design, routes, evidence-lanes, separate-questions |
| Short course only | sequence-to-vial |
| Front matter | editorial-states |
| Chapter one | peptide-bond |
| Chapter four | cell-signalling |
| Chapter five | receptor-binding |
| Chapter seven | circulation |
| Chapter nine | known-unknown |
| Chapter ten | chain-of-custody |

**Science & Applications.**

| Chapter | Figures |
| --- | --- |
| Front matter | editorial-states |
| One | sequence-to-vial |
| Two | separate-questions, chromatogram |
| Three | chain-of-custody |
| Four | receptor-binding, cell-signalling |
| Five | concentration-time, circulation, routes |
| Six | evidence-lanes, study-design |
| Nine | protocol-comparison |
| Ten | known-unknown |

**Peptide Quality.** Figures are renumbered in reading order, figure 1 to figure 15.

| Chapter | Figures |
| --- | --- |
| One (figure 1) | quality-spine |
| Two | separate-questions |
| Three | chromatogram |
| Four | mass-identity |
| Ten | sequence-to-vial, chain-of-custody, formulation, lyophilisation, sterility, endotoxin |

Five earlier print-native diagrams stay where no web equivalent exists: content, certificate anatomy, traceability, quality dimensions and provenance chain.

**The Reference Guide and the Protocols volume** stay utility-first. They use marks and grids drawn from the records rather than explanatory drawings: evidence-lane marks in each monograph, and agreement / difference / not-reported marks in every comparison grid.

## PLACEHOLDERS REMOVED

- **Understanding Peptides: 8 dashed "Illustration" boxes.** Seven were in chapters one, two, three, four, five, seven and ten; the eighth was on the chapter-six brief. The `IllustrationSlot` component and the `illustration` / `illustrationNote` fields of the chapter plans are deleted. Chapter six, still a brief, prints without an empty box.
- **Every volume: the dashed "CODE WHEN PUBLISHED" square** in the current-version block. The block now says where to look, in words.
- **Peptide Quality: the "QR placeholder" note** in its version block.
- **Peptide Quality: three older print-only diagrams** — three questions, chromatogram, and identity versus purity — replaced by their web counterparts in the same illustration language.

A search of `src/publishing` for `IllustrationSlot`, `CODE WHEN` and `QR placeholder` finds nothing.

## NEW FIGURES CREATED

Every new figure was created in the web illustration system, so the site and the books share it. Each follows the system's rules: schematic, no numerals in labels, a stated basis, and every distinction carried by shape and word as well as colour.

| Figure | Registry key | Basis | Used in |
| --- | --- | --- | --- |
| Five questions a vial raises: purity ≠ identity ≠ content ≠ sterility ≠ endotoxin | `separate-questions` | HPLC-001, 002, 005, 006, 007; ID-002; STER-003; ENDO-003 | UP, S&A, Quality; web `hplc-purity` topic |
| One symmetrical peak is not one substance | `chromatogram` | HPLC-002, 003, 004 (peaks computed, not sketched) | S&A, Quality; web `hplc-purity` topic |
| From sequence to final vial, with each check in its place (the quality spine) | `quality-spine` | SPPS-001; PUR-001; HPLC-002, 005; ID-002; STER-002, 008, 009; ENDO-003; LYO-001; TRACE-002, 005; TRANS-001 | Quality (figure 1, and the chapter rail) |
| What else is in a peptide product, and why | `formulation` | FORM-01, 02, 03, 08, 09, 10, 11, 13, 14, 15, 23 | Quality; web `formulation-excipients` topic |
| Source fact, Tides synthesis, source needed | `editorial-states` | method | UP, S&A |
| What a study design can answer | `study-design` | method | UP, S&A |
| How the body handles its own peptides | `peptide-lifecycle` | END-03, 04, 05, 07, 09, 10, 11, 12 | UP; web `peptides-in-the-body` topic |

**Redrawn.** `protocol-comparison` now shows *same*, *differs* and *not reported* cells, and never counts silence as a difference (owner decision 2).

**New print elements.**
- `IllustrationPlate`: a numbered figure with its caption and basis, never split across a page.
- `ConceptPlate`: a question, a drawing and one short explanation — the teaching unit.
- `SpineRail` (Quality): the ten stages of the spine on one line, with a chapter's own stages marked. It reads its stages from the same `QUALITY_SPINE_STAGES` constant the drawing uses.

## PATIENT-LANGUAGE CHANGES

*Understanding Peptides* was reorganised rather than rewritten. Sourced sentences are unchanged except where noted; the reading path around them is new.

**New front of the book.**
- **Before you start** is the new first page: look at the drawing, read the line beneath it, and stop whenever you have what you need. It explains the three editorial states once, with a figure, and says plainly that this is an unreviewed draft with no doses or instructions.
- **The short course** gives eight concepts. Each is a question, a drawing, one short explanation, and a pointer to the chapter with the fuller account:
  - What is a peptide?
  - How is one made?
  - How does a peptide send a signal?
  - What happens to the body's own peptides?
  - How can it be studied?
  - How do routes differ?
  - What does evidence mean?
  - How is quality checked?

  Six explanations are the figures' existing web captions, written and checked against their claims in Product Experience v1 but not yet reviewed by a person. Two were written for print, each only from claims already in the book:
  - *How is one made?* rests on SPPS-001, SPPS-002, PUR-001 and the complementary-testing claims.
  - *How do routes differ?* rests on the route barriers in PK-02 to PK-04 and the claim that most peptide drugs are injected, and keeps the line "it is not a guide to giving anything".

**Changes inside chapters.**
- **Chapter seven:** the route definitions were one ten-clause paragraph; they are now a table of each route and what the FDA's data standards say it means.
- **Chapter three:** the context paragraph was four sources in one chained sentence; it is now four attributed points.
- **Chapter one:** the long definition paragraph is split where it turns from definition to disagreement.
- **Chapter eight:** the list of study designs is replaced by the study-design figure, which carries the same five statements.

**Marks and back matter.**
- **Source needed and Tides synthesis** are now marked by a rule and a small label rather than a tinted alarm box. Unmarked text is source fact, and every chapter still ends with its sources.
- **Method detail** (what each chapter rests on, and how the drawings were made) moved from the front of the book to the back matter.

***Peptide Science & Applications*** (practitioner) gained progressive depth:
- The concept comes first, in the opening line and drawing, followed by the explanation.
- *Technical detail* sits under its own label in the two densest chapters (receptors and pharmacokinetics), followed by the sources.
- A stale front-matter sentence saying the register held nothing on receptor pharmacology is corrected.

## PRINT CHANGES

### The PDFs

**Shared primitives** (`src/publishing/primitives.tsx`)

- **Headings are never stranded.** Section and sub-headings keep space for what follows them. The renderer ignores that rule when the next paragraph moves whole, so figures are placed beside the paragraph they explain rather than directly under a heading. Where that could still strand a heading, as with *Routes* in *Science & Applications*, the figure opens the section instead.
- **Tables no longer split mid-row.** A table of up to twelve rows stays in one piece. A longer one runs on, repeats its header on every page, and never cuts a row. Previously every table was unbreakable, so a long one could be pushed wholesale onto the next page.
- **Other page-break rules.** A bullet never splits across a page. A source list longer than six lines may continue onto the next page, but never leaves its heading behind.
- **Source notes are easier to read.** They are set larger and darker: ink-soft at 7.6 pt, where they were slate at 7.2 pt.
- **The footer is anchored from the top of the page.** Anchored from the bottom, the renderer sometimes printed "thetidesindex.com" and the page number at the very top or off the sheet on continuation pages. That happened on 34 pages of the *Protocol Quick Reference* and on every single-compound reference sheet. A scan of all five volumes and all twelve sheets now finds no footer out of place. The only flag is the version block's own web address, which is not the footer.
- **The version block no longer prints an empty dashed "code" square.**

**Figures**

- **Figures never split.** `IllustrationPlate` and `ConceptPlate` are unbreakable, so a caption and basis line always travel with their drawing.
- **Labels do not clip.** Figures are drawn from their viewBox at the full text measure, and every one was inspected in the proof sheet.

**Layout by volume**

- ***Peptide Quality*.** The identity and content chapters are now planned two-page spreads, so neither leaves a page holding only its sources.
- ***Understanding Peptides*.**
  - The contents rows are tighter, so the list and its back-matter line share one page.
  - The cell-signalling figure sits where its page has room.
  - The ten-row route table stays whole.
- ***Reference Guide*.** Section headings reserve room for their first item. Tables carry no bottom margin, so a table ending a few points above the page foot is not moved a whole page. Empty sections print a quiet "Not recorded" line, never a box.
- ***Protocol Quick Reference*.**
  - Comparison grids repeat their header on every page, and no row splits.
  - Callouts and footnotes that were stranded alone on otherwise empty pages were fixed.
  - Letter tags that printed as empty boxes were fixed.

**Three editorial states in print**

- The states are explained once per volume, in the front matter, with the editorial-states figure where it helps.
- Source fact is unmarked.
- *Source needed* and *Tides synthesis* are a rule and a small label where they occur, not tinted boxes on every point.

**Known residue**

A few pages still hold only a short tail of their chapter. These come from how long the content runs, not from a broken element:

- *Science & Applications* p. 12, a register callout;
- *Science & Applications* p. 17, a source-needed note;
- the ends of some protocol grids;
- one Reference Guide monograph's sources.

Each could be removed only by cutting or reordering sourced content, which is left to the owner.

### The website

This section covers owner decision 1: printed material never hides content just because the web page collapses it.

**Two layers**

- **Print stylesheet.** `src/styles/globals.css` has a rewritten print section that reveals closed `<details>` content with CSS alone. A page printed with JavaScript off is still complete.
- **Expander.** A small client component, `src/components/public/print-expander.tsx`, is mounted once in the public layout. It opens every `<details>` on `beforeprint` and closes only those it opened on `afterprint`. In the browser: 1 of 13 open before, 13 during, 1 after.

Content that a reading mode withholds is still absent, because it is never sent to the page. The simple retatrutide print carries no dosing; the practitioner print carries the reported regimens.

**How each collapsed section prints**

| Mechanism | Where it appears | In print |
| --- | --- | --- |
| `Disclosure` component | evidence, quality topics, sequence-to-vial stages, protocols | expanded; the summary is kept as a bold label |
| Synthesis reasoning | synthesis cards | expanded |
| Answered gaps | learning topics | expanded |
| "Why it is still open" | research questions | expanded |
| "Show all N references" | record reference lists | expanded; the instruction wording is hidden |
| Research filters | /research | hidden: a form, not content |
| Sticky stage stepper | sequence-to-vial | hidden; the stages print in order |
| Wide protocol comparison | protocol pages | the narrow field-by-field version prints instead. The wide table had shrunk the practitioner retatrutide print to two-thirds size; that print went from 37 small pages to 70 full-size ones |

**Other print rules**

- **Hidden:** site navigation, the contents rail, the mode switch, search and filters, skip links, and screen-only instructions such as "scroll the drawing sideways".
- **Kept together:** headings and disclosure labels stay with what follows. Figures and captions stay together. Table rows and small bordered cards are not split, and table headers repeat.
- **Allowed to break:** a block holding an expanded section may break across pages, so its heading is not stranded above a blank half page.
- **Fitted to the page:** drawings drop their screen minimum width and scale to the page width, and sideways-scrolling card rows wrap.
- **Links:** external links print their DOI or URL after the link text; internal links do not.
- **Legibility:** grey and teal text prints near-black, and the smallest sizes are raised.
- **Page setup:** A4 margins, a print masthead with the site name and reading mode, and "The Tides Index · thetidesindex.com" with page numbers at the foot of every page.

**QA**

`npm run qa:print` loads each page in both reading modes at A4 sheet width. For every page it:

1. Checks that closed sections are revealed by CSS alone.
2. Fires the print event and checks that nothing remains closed.
3. Flags overflow and screen-only wording.
4. Saves the PDF.
5. Checks that the reader's open/closed state is restored.

The last full run passed all 14 page-and-mode combinations. The prints are in `review/publications-v2/web-print/`: home, Learn, a learning topic, retatrutide in both modes, protocols, research in both modes, quality, sequence-to-vial in both modes, and sterility in both modes. A unit test holds the disclosure rendering and the expander's presence in the layout.

**Known residue**

- **Half-empty pages:** blocks kept whole still leave some half-empty pages, for example /protocols page 1 and sterility page 3.
- **localhost in record headers:** in development, record print headers show `http://localhost:3000` because no site URL is set. The production fallback is thetidesindex.com.

## SOURCE NEEDED COUNT

| Volume | Marked on the page |
| --- | --- |
| Understanding Peptides | **8** SOURCE NEEDED points (listed below) |
| Peptide Science & Applications | **2** SOURCE NEEDED points: kinase cascades downstream of second messengers; steady state, the limits of half-life, and protein binding |
| Peptide Quality | **3** "reference development in progress" gaps: label tolerance and net peptide content; temperature excursions and time after mixing; residual solvents, water content and heavy metals |
| Reference Guide | The records' own gaps, per monograph, under *Safety and uncertainties* and *Research questions* |
| Protocols & Clinical Quick Reference | The records' own gaps, per compound, under *What nobody has tested* |

The 8 points in *Understanding Peptides*:
1. the two ends of a chain;
2. how measurement changes with length;
3. what else changes with length;
4. growth factors as a class;
5. whether the body's peptides are short-lived as a rule;
6. the definitions of paracrine and autocrine;
7. absorption of inhaled peptides;
8. sterility as a demand of the injected route.

## TIDES SYNTHESIS COUNT

- **Printed in the publications: 1.** SYN-BODY-01, in *Understanding Peptides* chapter three.
- **In the seed data: 6.** SYN-PEP-01, SYN-BODY-01, SYN-SIG-01, SYN-REC-01, SYN-PK-01 and SYN-RTE-01. All are foundational, of kind `general`, with review state `not_required`.
- **Compound-specific syntheses: 0** drafted, **0** published.
- **On the public read path: 0.** Correction to Product Experience v1: that report said the six were published. They were seeded unpublished and appeared only through the development preview. The v1 report now carries a correction.

**Review architecture** (owner decision 4, migration `0028_synthesis_review.sql`):
- **Interpretation kind.** Every synthesis has one: general, mechanism, efficacy, safety, clinical interpretation or protocol interpretation.
- **Who needs review.** Any synthesis about a compound needs human scientific review, whatever kind it declares, and so does any synthesis whose kind is not general.
- **Recording a review.** Reviews reuse the existing `reviews` table. A trigger lets only an active `scientific_reviewer` record one, bound to the exact synthesis version, and a recorded review cannot be edited.
- **Publishing.** The publish gate refuses publication without a standing approval at the current version. Editing or relinking a live synthesis withdraws it.
- **Public view.** It hides any synthesis that needs review and has no standing approval.
- **Seed loader.** It refuses to seed such a synthesis as published.
- **Foundational syntheses.** General syntheses keep the existing mechanical rules: at least two published claims, no numerals, limits stated.
- **Tests.** 16 new integration tests.

## UNFINISHED CHAPTERS

- ***Understanding Peptides***
  - Chapter six, *Why peptides are studied*, is still a brief. It needs review literature, written to leave a reader less certain, not more.
  - Chapter five rests on a partial Spanish-language textbook sample, paraphrased. It needs re-checking against the English edition, which is not held.
- ***Peptide Science & Applications***
  - Chapter four cannot yet describe signalling downstream of the second messenger.
  - Chapter five cannot yet state steady state, the limits of half-life, or protein binding in general terms.
- ***Peptide Quality***
  - Residual solvents, water content and heavy metals are named and unwritten.
  - No source is held on temperature excursions or time after mixing.
- ***Reference Guide*:** some regulatory records print awkwardly because of their stored text (for example "Not established: not approved (None. …)"). That is a data fix, not a layout fix.
- **All five volumes** are drafts. None has been through scientific review, and *Understanding Peptides* also needs clinical review.

## HUMAN REVIEW REQUIRED

Nothing in any volume has been reviewed by a person. Before any volume is used with patients or clinics:

1. **Every volume, and the claims behind it,** need scientific review: the foundation, quality and pharmacology packets, and the compound records.
2. ***Understanding Peptides*** needs clinical review, because its readers may act on it.
3. **The seven new figures and their captions** need checking against the claims they cite: separate-questions, chromatogram, quality-spine, formulation, peptide-lifecycle, and the two method figures. They are drawn only from those claims, but a drawing implies more than a sentence, and someone qualified should confirm each label.
4. **The two short-course explanations written for print** need checking: *How is one made?* and *How do routes differ?*.
5. **Any compound-specific synthesis** needs human scientific review before publication. The database now enforces this; none has been drafted.
6. **Chapter five of *Understanding Peptides*** needs re-checking against the English edition of its source.

## OWNER DECISIONS STILL NEEDED

### The eleven remaining questions from Product Experience v1

Questions 1 (print disclosures), 4 ("Not specified" in the protocol matrix), 14 (illustrations in print) and 15 (syntheses on compound pages) are closed by this sprint. The other eleven stand, in their original numbering.

2. **Research: identity and regulatory placement.** Identity questions sit closer to Quality than to research gaps. Should that category move, or cross-link?
3. **Research section order.** The reading order begins with human evidence. Should safety lead for a patient audience?
5. **Duplicate filter label.** "Human trial regimen" appears twice in the protocol filters, from two underlying evidence classes. Merge in the interface, or relabel?
6. **Printing the comparison matrix.** Wide matrices scroll sideways on screen. The printed *Protocol Quick Reference* now carries a field-by-field grid. Does the website's own print of the matrix also need a landscape or stacked layout?
7. **Provenance figure on phones.** It scrolls sideways at 390 pixels wide. Should phones get a stacked variant?
8. **Chooser grouping.** Is "has something to compare / single record" the right first split, or should route come first?
9. **Counting units.** "Evidence recorded here" counts evidence rows in some places and statements in others. Pick one noun for simple mode.
10. **Sequence-to-vial in simple mode.** Each stage folds everything after its first two statements. Is two right?
11. **Stages without their own page.** Sequence and fill/finish link as "Within Peptide synthesis / SPPS" and "Within Sterility". Is that wording clear?
12. **Overlap on /quality.** Should the three-questions figure stay now that the twelve-dimension map covers similar ground? Print now uses the five-question figure, which could replace it on the web too.
13. **Unwritten quality topics.** Should simple mode show their state label ("Open question recorded"), or only the name?

### New questions raised in this sprint

**Protocol comparison**

14. **The bar for "materially consistent".** Should it stay at identical apart from case, spacing, punctuation and unit spacing? This bar shows superficial differences, such as "Twice a day" against "Twice daily", but it can never show an agreement that is not there.
15. **One source, two regimens.** When two regimens from the same source differ, is that a difference? It is currently labelled "within one source's records".
16. **Qualified placeholders.** Should a placeholder with a qualifier ("Not specified beyond the indication it describes") count as not reported? And should "Route not stated by the source." — stored in a Modified GRF formulation field — be moved to the route field at source?
17. **Empty rows in the PDF grid.** Should fields no regimen reports stay as rows in the printed grid, or appear only in the summary? Dropping them would remove some near-empty pages.

**Syntheses**

18. **Who may review.** Only an active `scientific_reviewer` may review a synthesis. Should admins also be allowed, as they are for claims and protocols?
19. **Extra review for interpretive kinds.** Should clinical and protocol interpretations also require clinical and/or compliance review?
20. **A submitted state.** Should there be a "submitted for scientific review" step, like the ready-for-review step on claims? Should the review queue and the record-review action be wired to syntheses? That is admin work, left out of this sprint.
21. **Rejection after publication.** A rejection recorded after publication hides the synthesis from the public view but leaves it marked published. Should it also be withdrawn?
22. **Staff access and demonstration reviewers.** Tables added since migration 0022 carry no grants for staff sessions, which predates this sprint. Separately, an approval from a demonstration reviewer counts, as it does at the other gates.

**Reference Guide**

23. **Regulatory context placement.** It currently sits just before Sources. Should it stay there?
24. **The reference-and-practice lane.** Should reference-and-practice statements keep a quieter third lane under Evidence?
25. **Pharmacokinetics and replication.** Should they stay inside Routes and Evidence?

**The publications**

26. **Short-course explanations.** Six short-course explanations reuse the web figure captions. Should patient-facing explanations be written separately from web captions once review begins?
27. **Figure sizing in the patient volume.** Figures print at the full text measure. Labels come out at roughly seven points, the same as the earlier print figures. Is that large enough for the patient volume, or should *Understanding Peptides* use a larger page or fewer labels per drawing?

## VERIFICATION

Run from the final state.

| Gate | Result |
| --- | --- |
| Unit tests | **326 / 326**, 22 files (232 at baseline). New: illustration print conversion, field comparison, protocol comparison rendering, print disclosure, figure library |
| Full integration suite | **401 / 401 tests, 33 / 33 files** — one whole-suite run from the final state (started 06:44, after the last edit), no targeted reruns (385 at baseline; +16 synthesis review) |
| Typecheck | clean (0 errors) |
| Lint | clean |
| Locator verification | 172 resolved, 0 to check, 0 failed, 352 skipped (unchanged) |
| Dose-leak scan | all 12 records clean; no dose-shaped strings in any patient payload |
| Patient audit | 12 / 12 checked, none skipped; 10 clean. MOTS-c (8) and tesamorelin (4) strings inspected: the same "reconstitution" wording as at baseline, in research-question and uncertainty text |
| PDF build | all five volumes and the twelve reference sheets built; no misplaced footers (the only flag in each is the version block's own web address) |
| Visual PDF inspection | every page of *Understanding Peptides*, *Science & Applications* and *Peptide Quality* rendered and inspected; every web figure proofed one per page; Reference Guide and Protocols volumes inspected by their agents, with footers and headings checked by scan |
| Website print | 14 page-and-mode combinations pass `npm run qa:print` |
| Website figures | all 24 figures render on `/learn/figures`, checked in the browser; a unit test holds the page to the registry |
| Production build | passes; 18 / 18 static pages; no warnings or errors |
| Database | migration 0028 applied to the development database and seeded; six foundational syntheses `general` / `not_required` |
| Robots | `noindex` unchanged; nothing deployed; no thirteenth compound |

Known build noise, not regressions: the *Protocols* PDF build prints a React "same key" warning for an unchanged table, and the locator PDF parser prints `TT: undefined function` font warnings.

**About the integration run.** A first full run, started just before the final small edit to the website figures page, passed 401 / 401 across 33 files. The suite was then run once more from the final state; the result is recorded in the table.
