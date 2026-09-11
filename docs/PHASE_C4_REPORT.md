# PHASE C.4 REPORT — The public quality topic experience

**HPLC / chromatographic purity, as a reader meets it.**

The evidence architecture of C.1–C.3 only counts for something if it survives
presentation. Four distinctions had to reach the screen intact:

- a sourced statement is not a gap;
- a gap is a fact about this library, not a finding about the world;
- a navigational link claims nothing;
- and a record nobody has reviewed must not read like a reviewed one.

Each is cheap to break with a styling change and expensive to notice.

---

## 1. Rendering an unpublished record without weakening the gate

The HPLC topic sits at `ready_for_scientific_review` and is **not published**,
because the publish gate requires a human scientific approval and nobody has
given one. That is the correct state and it was not touched.

But a reviewer cannot sensibly approve a page they have never seen rendered, and
design work cannot wait on an approval the design is meant to inform. So the
public route falls through to a development preview, closed by two independent
conditions in `src/server/public/preview-gate.ts`:

```
NODE_ENV !== 'production'   AND   TIDES_PREVIEW_UNPUBLISHED === '1'
```

Neither is sufficient alone. A production build refuses even with the flag set.
The route 404s when refused, so a probe cannot distinguish "refused" from "no
such topic", and a misconfigured deployment exposes nothing and advertises
nothing. The preview **reads**; nothing in that path can write a publication
state.

`src/server/public/quality-topic.ts` serves both surfaces from one assembly,
switching only the relation names — `public_v_*` views as `anon` for the public,
base tables for the preview. Two separately maintained versions would drift, and
the one that drifts is always the one nobody is reading. Every column is named;
nothing selects `*`, so `extracted_text_private` cannot arrive by accident on the
path that reads base tables.

**The page says what it is.** A dashed banner above the title, then a review
status panel: *awaiting scientific review · not published · "No scientist has yet
read this page. Treat it as a prepared draft, not a reviewed reference."*

---

## 2. Public routes

| Route | State |
|---|---|
| `/quality` | Published topics only. Unchanged. |
| `/quality/hplc-purity` | Published lookup first; development preview second. |

No new public route was added. The preview is the same URL under a closed
condition, which is why there is no unindexed staging path to leak.
`generateMetadata` additionally stamps `robots: noindex` on a preview, so an
unpublished record stays out of indexes even if the site's global noindex is one
day lifted.

---

## 3. Component architecture

```
src/server/public/
  quality-topic.ts     assembly, no `server-only`, takes a db handle → testable
  preview-gate.ts      the two conditions, pure, testable
  preview.ts           `server-only` wrapper over both
  shapes.ts            + EvidenceGap, TopicRelationship, printedPage/filePage

src/components/public/
  quality-figures.tsx  ChromatographyFlowFigure, QualityDimensionsFigure
  quality-evidence.tsx EvidenceGapList, RelatedTopicMap, EvidenceLegend
  record-status.tsx    PreviewBanner, ReviewStatusPanel, EvidenceCutoff, reviewRung
  citation.tsx         + LocatorPages
```

The assembly avoids `server-only` and takes a handle, following
`src/server/public/shapes.ts` and the C.2 review packet, so what a reader is
shown is tested against a real database rather than asserted about in prose.

---

## 4. Page structure

1. Breadcrumb · **preview banner** · title · one-sentence orientation
2. **Review status** — rung, publication state, and what the rung means
3. Simple | Practitioner switch, with the mode explainer
4. In short — mode-dependent summary
5. What it establishes | What it does not establish — adjacent, equal weight
6. Common misreadings
7. **How the test works** — Figure A
8. Source-linked detail — legend, then seven claims with provenance
9. **Not established by the sources held here** — four recorded gaps
10. **Separate questions, separate answers** — Figure B
11. **Related quality topics** — the C.3 map, grouped by relationship type
12. References — deduplicated by source
13. About this record — version, review state, publication, dates, evidence
    cutoff, corrections link

---

## 5. Source and provenance rendering

Each claim carries its reading, its stated uncertainty, and every passage it
rests on. A citation resolves to author, work, edition, year, source type and
exact locator, and links to the source record.

**Locator semantics.** The locator already names the page of the work — `ch. 4,
p. 223, table 4-1`. Repeating that as "Printed page 223" beside "p. 223" reads as
two different facts, so what is added is the page the locator does *not* give:

> ch. 4, p. 223, table 4-1 · **p. 234 in the copy held here**

Shown only when the two differ, and labelled so they cannot be confused. Where a
source has no recorded offset the held-copy page is **null, not guessed** — an
unknown offset means the page in the held copy is unknown, not that it equals the
printed page. Tested both ways.

**Population or model** is now omitted for `reference_opinion` evidence. Printing
"not recorded" against every citation of a chemistry textbook implies a missing
fact rather than an inapplicable question.

---

## 6. Evidence-gap treatment

Gaps render in their own section, at full weight, never mixed into the claim
list. Each carries:

- the statement the index does **not** make;
- *"Why this index does not say it"* — the absence, located here;
- *"What would settle it"* — a kind of source, not a wish;
- the tracking issue (V-015).

The wording rule holds throughout: *"The sources this index currently holds do
not settle the point. That is a statement about this library, not a finding about
the world."* Never "HPLC cannot tell you this." A test asserts that no gap text
matches `/HPLC (cannot|can never|does not)/i`.

---

## 7. Relationship-map treatment

Grouped by relationship type, confusions first, because those do the work:

| Group | Cards |
|---|---|
| Commonly confused with this | Identity testing, Peptide content / assay |
| Questions this test does not answer | Sterility, Bacterial endotoxin |
| Read alongside this | Mass spectrometry |
| Part of the same process | Purification |
| What a result is a statement about | Lot / batch traceability |
| Other attributes of the same material | Residual solvents, Water, pH, Heavy metals |

`evidenceStatus` is computed **on the server** from the edge's own basis, so a
surface cannot accidentally give a structural link the styling of a sourced
statement. Four treatments, and colour is never the carrier:

| Status | Label | Glyph | Container |
|---|---|---|---|
| evidence_backed | Supported by a reviewed source | `§` | solid border, teal left rule |
| complementary | Read alongside — supported by a reviewed source | `§` | solid border, teal left rule |
| evidence_gap | Not established by current sources | `?` | caution border + left rule |
| structural | Navigational link — no evidence claimed | `→` | **dashed** border, muted |

Each combines a worded label, a glyph and a border style, so the distinctions
survive greyscale print, forced-colours mode, and a reader who cannot separate
the hues. A legend explains all three families before the evidence section.

Unpublished targets are **named, not hidden**, labelled *"Reference page in
preparation"* and not linked. Hiding them would leave purity looking like the
whole story, which is the exact misreading the section exists to prevent.

---

## 8. SVG architecture

Two deterministic figures, inline SVG, real `<text>`, `role="img"` with `<title>`
and `<desc>` both referenced by `aria-labelledby`, `currentColor` and theme
tokens throughout.

**Figure A — chromatographic flow.** Sample → column → separation → detector →
chromatogram. Two bands drawn *inside* the column at different points along it,
because the separation happens in the column. **No numbers anywhere**: an axis
scale would imply a precision no source here supports. A test asserts no figure
label contains a digit.

**Figure B — separate questions.** Six boxes side by side, unconnected, each
carrying its own question. No ticks, no ordering, no totals, no sequence. The
caption states it is *not* a claim that any product is required to be tested for
all of them — that is a regulatory question and this index holds no regulatory
source. Tested for the absence of `✓`, `✔`, "required for every", "all batches
must".

Both scroll inside their own `overflow-x-auto` container so the page body never
scrolls sideways, with a scroll hint shown only below `sm` and hidden from print.

---

## 9. Accessibility results

Measured in the browser at 375 / 768 / desktop.

| Check | Result |
|---|---|
| `h1` count | 1 |
| Heading hierarchy | h1 → h2 → h3, no skips |
| Landmarks | header, nav "Primary", nav "Sections", main, nav "Breadcrumb", nav "On this page", aside, footer, both figures as `svg[role=img]` |
| Text contrast below 4.5:1 | **0 of all sampled text nodes** |
| SVG title + desc + aria-labelledby | 2 of 2 |
| Focus order | skip link → brand → nav → search → breadcrumb → content |
| Positive `tabindex` hacks | 0 |
| `:focus-visible` styling | present |

---

## 10. Responsive results

| Width | Body horizontal overflow |
|---|---|
| 375 (mobile) | none |
| 768 (tablet) | none *(after fix below)* |
| 1280 (desktop) | none |

**Defect found and fixed.** At exactly 768px the header overflowed by 24px: the
primary nav appears at the `md` breakpoint while the brand link is `shrink-0`,
and the "Peptide reference" descriptor pushed the search control past the
viewport edge. Pre-existing from Phase B, surfaced by measuring rather than
looking — 24px of overflow reads as a stray scrollbar and nothing else. The
descriptor is now held back to `lg`.

The figures exceed 375px and scroll within their own container. Shrinking them to
fit would take the labels below a readable size, which is a worse failure than a
scroll.

---

## 11. Print results

Verified against the print stylesheet rather than a rendered print preview, which
this environment cannot produce.

- `.no-print` hides the legend, the figure scroll hints, the breadcrumb, the mode
  switch and the primary nav.
- `figure` carries `break-inside: avoid`, so neither diagram splits across pages.
- Citations expand their URLs via `.print-url::after`.
- **The preview banner prints.** It must: an unreviewed page that reaches paper
  without its warning is the worst version of this failure. It survives without
  background colour because a dashed border and the words `UNPUBLISHED PREVIEW —
  NOT LIVE` carry it.
- Gap cards likewise survive with no printed background, because the wording and
  border carry the distinction rather than the caution tint.

---

## 12. Tests

**196 passing** (up from 162), across 17 files. New:

`tests/integration/public-quality-page.test.ts` — 14 tests
- gaps never enter the claim list
- a gap's reason locates the absence in this library
- a gap-backed edge is never `evidence_backed`
- a structural edge is never `evidence_backed`
- **structural rationales carry no assertive language** — the C.3 review defect,
  now a regression test
- review state and publication state match the database exactly
- an unreviewed record cannot report a reviewed rung
- the public surface returns nothing while unpublished
- printed page and held-copy page differ and are both correct
- held-copy page is null when no offset is recorded
- `extracted_text_private` never reaches the reader, even via the base-table path
- a related card carries name and status but no unpublished content
- simple mode gets its own summary, free of method vocabulary
- every claim has a plain-language form

`tests/unit/quality-rendering.test.tsx` — 20 tests, rendering real markup via
`react-dom/server`
- gap wording never becomes a claim about the world
- gap and sourced markup differ in words, not only colour
- structural links say they claim nothing
- unpublished targets are named but not linked; published ones are linked
- `ready_for_scientific_review` renders as "Awaiting scientific review", never
  containing the word "reviewed" on its own
- every non-approved rung reports `reviewed: false`
- the preview banner appears unpublished and disappears when published
- evidence cutoff says it is absent rather than being omitted
- both figures carry title, desc and `aria-labelledby`
- no digits in any chromatography figure label
- figure B states it is not a checklist
- **the preview gate is closed in a production build even with the flag set**

---

## 13. Completion criteria

| # | Criterion | Status |
|---|---|---|
| 1 | HPLC page works end-to-end in dev | Yes |
| 2 | Simple and Practitioner both work | Yes — verified as a data boundary, not hiding |
| 3 | Claims and gaps visually distinct | Yes — four treatments, colour never the carrier |
| 4 | Relationship map renders honestly | Yes |
| 5 | Source provenance works | Yes, with printed/held-copy locators kept apart |
| 6 | SVGs render well | Yes |
| 7 | Desktop / mobile / print checked | Yes; print by stylesheet analysis |
| 8 | No publish gate weakened | **Confirmed** — untouched; record still unpublished |
| 9 | No unsupported quality claims added | Yes |
| 10 | Lint / typecheck / tests / build | All pass |

---

## 14. Remaining gaps

1. **Print was not visually rendered.** The environment cannot produce a print
   preview, so the print result is stylesheet analysis plus reasoning, not an
   inspected page. A real print check should happen before publication.
2. **Screenshot capture was intermittent.** The browser pane returned blank or
   tiled frames unpredictably. Layout was therefore verified by DOM measurement —
   which is stricter than looking — but fewer visual captures exist than intended.
3. **The admin review packet is still not visually inspected.** Unchanged from
   C.2: admin pages need Supabase auth. Its data assembly is tested.
4. **Figure B does not reflow on mobile.** It scrolls horizontally below ~520px.
   Acceptable and signposted, but a stacked variant would be better.
5. **The page's own evidence cutoff is null**, and says so. Correct — no
   literature survey has been performed.
6. **Ten of eleven related topics are unwritten.** The page is honest about it,
   and it does mean the map currently points mostly at preparation notices.
7. **The whole page rests on one source, published 2002** (V-015 remains open).

---

## 15. Recommendation for C.5

**Build the COA-literacy component against a fabricated-but-declared specimen,
and make "which batch was tested?" the spine.**

Specifically:

1. **`/quality/certificate-of-analysis`** as the C.5 target, reusing every part
   built here — the four evidence treatments, the gap section, the map.
2. **A declared specimen certificate, not a real one.** Structurally realistic,
   visibly and repeatedly marked as an illustration, carrying no supplier name
   and no real batch number. No private supplier data enters the repository.
3. **The teaching point is the batch, not the numbers.** A certificate describes
   the material that was tested. Whether that is the material in hand is a
   traceability question — which is exactly the `scoped_by` edge already recorded
   from HPLC to batch traceability, so C.5 extends the map rather than inventing
   a new structure.
4. **Expect most of it to be gaps.** What a certificate *should* contain, what a
   result *must* meet, what a method *must* be — every one of those is compendial
   or regulatory, and the register holds no such source. C.5 will produce more
   `evidence_gaps` rows than claims, and that is the honest output. It should not
   be treated as failure or filled in from general knowledge.
5. **Before or alongside C.5, acquire one compendial or regulatory source.**
   V-015 is now the binding constraint on the whole quality section. Without it
   C.5 can teach a reader how to *read* a certificate but cannot say what any
   result ought to be — and the sterility and endotoxin pages cannot be written
   at all.

The single most valuable next acquisition remains **SRC-011** (Fields, *Peptide
Characterization and Application Protocols*, MiMB 386) plus **one current
compendial analytical reference**. Between them they unblock identity testing,
mass spectrometry, content/assay, and the certificate page's acceptance-criteria
half.
