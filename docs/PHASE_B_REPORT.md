# PHASE B REPORT — The Public Reference Experience

**Status:** complete. 127 tests, lint, typecheck and production build all pass.
**Verified in the running application** against a local Postgres, at desktop and
375px, in both reading modes.

---

## 1. Executive summary

Phase A built an evidence system that refuses to publish anything it cannot
trace. Phase B makes that refusal legible — to a clinician in thirty seconds and
to a patient without handing them a dose.

Three decisions shaped the work more than any others.

**Reading mode is a data-access decision.** The switch is a server action, not
client state, because the choice decides which database relation the next render
reads from. Patient mode reads `public_v_protocol_simple`, which has no dosing
columns in it, so amounts never enter the process. There is nothing for a
rendering bug, a JSON payload, a print stylesheet or a future refactor to leak.
This is asserted directly:
`tests/integration/reading-mode.test.ts` serialises the patient payload and
requires that no dose value appears anywhere in it.

**Empty states are the product.** Most of this reference is deliberately
unpopulated, and a page that says "no reviewed human evidence is recorded here —
that is a statement about this index, not about the literature" is more useful
and more honest than a page of unsourced summary. Empty states are written as
specific claims about the state of the work and treated as first-class copy.

**A registered compound now gets a page instead of a 404.** This was the most
consequential change made during the phase and it was not in the plan. A
compound in scope but not yet published previously did not exist publicly, which
hid the single most useful thing an early reference can tell a reader: what it is
working on. `/peptides/bpc-157` now renders "record in preparation", with how far
the work has got, and no medical content at all. Migration 0006 adds a register
view that exposes registration and progress and nothing else.

**On BPC-157 specifically.** The instruction was to build one complete vertical
using only the reviewed data currently available, to prove the system rather than
publish clinical content. Those two goals pull apart: there is no reviewed data
for BPC-157, so the vertical could only be exercised by writing content for it —
exactly what the editorial rules forbid. The resolution was to build the vertical
on a **Demonstration Compound**, whose name, sources and every field announce it
as a demonstration, and leave BPC-157 honest. The architecture is fully proven;
no real compound carries invented content. See §12.

---

## 2. Pages implemented

Sixteen public routes. Each was loaded and read in the running application.

| Page | What it does |
|---|---|
| `/` | States the position, offers search, and publishes live coverage figures. The counts are read from the database so the page cannot claim more than the index holds. |
| `/peptides` | Published records first, then "in scope, record in preparation" — the coverage story made navigable. |
| `/peptides/[slug]` | The canonical compound record. Two depths over one record. |
| `/peptides/[slug]` (unpublished) | "Record in preparation": in scope, how far the work has got, why the bar is high. No medical content. |
| `/quality` | Quality index, led by the reason the section exists: purity, identity, content, sterility and endotoxin are five separate questions. |
| `/quality/[slug]` | A topic, with "what it establishes" and "what it does not establish" side by side and equally weighted. |
| `/sources` | The full register, **including the sources that cannot be cited**, with the reason for each. |
| `/sources/[key]` | A source record: what it legitimately supports, what it does not, and the state of the held copy. |
| `/search` | Deterministic search with evidence-class, route and record-type filters. |
| `/routes` | The route ontology, stating up front that these describe routes and not compounds. |
| `/methodology` | How a statement gets published, and what the index refuses to do. |
| `/evidence` | The evidence and source vocabularies, read from the same tables the records use. |
| `/editorial-policy` | Attribution, uncertainty, language, independence. |
| `/corrections` | The public corrections log and how errors are handled. |
| `/coverage` | What is and is not here, with the known gaps named. |
| `/not-found` | Standard. |

### What a clinician sees on a compound record

Verified live on the Demonstration Compound. In order: name and alternative
names (with any unresolved relationship called out separately), a one-sentence
orientation, the reading-depth switch with an explanation of what it is doing,
what it is, an evidence snapshot, then evidence grouped by class, routes,
regulatory status, protocols, disagreements, references, and record metadata.

The contents rail lists every section with a count, **including the empty ones**,
marked "none yet". A clinician arriving with "what human evidence is there?" can
answer it without scrolling.

### What differs between the two depths

| | Simple | Practitioner |
|---|---|---|
| Claim wording | Plain-language version where one has been reviewed; otherwise the technical wording, labelled as such | Technical wording |
| Interpretation notes | Hidden | Shown, labelled "The Tides Index reads this as" |
| Sequence, molecular description | Hidden | Shown |
| Protocol amounts, frequency, timing, duration, cycle, titration | **Not fetched** | Shown as reported |
| Protocol monitoring, contraindications, safety prose | **Not fetched**; existence signalled | Shown |
| Protocol attribution, objective, population, route | Shown | Shown |

The free-text clinical fields are excluded from patient mode as well as the
numeric ones, because monitoring and titration prose routinely carries embedded
numbers that would reconstruct a regimen.

---

## 3. Components

`src/components/public/`

| Module | Contents |
|---|---|
| `primitives.tsx` | `Container`, `Section`, `EmptyState`, `EvidenceClassTag`, `UncertaintyNote`, `InterpretationNote`, `Callout`, `TableScroller`, `DefinitionRow`, `NotRecorded`, `MetaItem` |
| `citation.tsx` | `CitationLine`, `CitationBlock`, `ReferenceList` |
| `evidence.tsx` | `EvidenceSnapshot`, `EvidenceCard`, `ClaimCard`, `ClaimsByEvidenceClass` |
| `protocols.tsx` | `SimpleProtocolCard`, `PractitionerProtocolCard`, `ProtocolSectionLede`, `NoProtocolsYet` |
| `routes-and-context.tsx` | `RouteEvidenceTable`, `RegulatoryStatusList`, `AliasList`, `DisagreementList` |
| `contents-rail.tsx` | `ContentsRail`, `ReferenceLayout` |
| `mode-switch.tsx` | `ModeSwitch`, `ModeExplainer` |
| `record-in-preparation.tsx` | The unpublished-record page |
| `print-header.tsx` | Paper-only masthead |
| `site-chrome.tsx` | `SiteHeader`, `SiteFooter` |

Three components carry most of the editorial weight.

**`CitationLine` / `CitationBlock`.** A citation carries four things without
being asked: who said it, what kind of source they are, exactly where in that
source, and **whether the held copy is sound**. The last is unusual — most
references present every citation as equally solid. Here a source whose copy is
partial or awaiting replacement says so on the citation itself.

**`ClaimsByEvidenceClass`.** Grouping claims by evidence class rather than by
topic is the single most important presentation decision on the page. It makes
"there is no human evidence here" something a reader sees in two seconds instead
of something they reconstruct by reading every card.

**`EvidenceSnapshot`.** A sentence, not a score. `EVIDENCE_MODEL.md §7` forbids
collapsing evidence into a number, and the snapshot is generated by the pure
domain function tested in `tests/unit/domain.test.ts`, which asserts the returned
object has no `score` or `rating` key.

---

## 4. Search behaviour

`src/server/search/search-service.ts`, `/search`

Postgres full-text with a trigram fallback over `public_v_search_documents`,
which contains published records only. Verified live:

- `demonstration` → 4 results across compound, quality topic and two sources
- `demonstration` + evidence filter `human` → 1 result, the compound only
- `BPC157`, `Body Protection Compound`, `TB-500` → resolve correctly (unit-tested)

Filters: record type, evidence class, route. These work because the evidence
model keeps those dimensions separate as columns; "show me only compounds with
human evidence" is a query rather than a maintained list.

**`related_but_distinct` aliases are indexed but never treated as identity.**
Searching "TB-500" reaches the Thymosin beta-4 record — that is where the
discussion lives — and the record says plainly that the relationship is
unresolved rather than folding the names together.

**No generated answer layer, and none planned in front of this.** Every result is
a record that exists and can be opened. Any semantic search added later sits
beside this rather than ahead of it.

---

## 5. Data-flow architecture

```
browser
  │
  ▼
Next.js server component
  │  getReadingMode()  ← cookie; decides which relation is read
  ▼
src/server/public/queries.ts
  │  withPublicSession()  →  SET LOCAL ROLE anon
  ▼
public_v_*  views only
  │  (anon holds no privilege on any base table)
  ▼
Postgres
```

The boundary is the database's, not the application's. `anon` can read the
`public_v_*` views and nothing else, which is asserted in
`tests/integration/public-surface.test.ts` — including a direct attempt to read
`claims`, `claim_evidence` and `sources` as `anon`, which must be refused.

Consequences that fall out of this rather than being separately enforced:

- A draft record cannot reach a public page, because the views filter on
  `publication_state = 'published'`.
- `claim_evidence.extracted_text_private` — verbatim text from copyrighted
  sources, kept so a reviewer can confirm a reading — is absent from every public
  relation. Row-level security could not do this; hiding a *column* needs a view.
- Patient mode cannot receive a dose, because the relation has no dose in it.

Two modules exist purely to keep this testable: `src/server/public/shapes.ts`
(shared types and row helpers, free of `server-only`) and
`src/server/public/protocol-reader.ts` (the mode-dependent read, taking a
database handle). The patient/practitioner split is too important to be testable
only through a browser.

All data-reading public pages are `force-dynamic`. Content changes when an editor
publishes, not when the application deploys, so a build-time snapshot would serve
stale evidence until the next deploy — and a build no longer needs database
access, which decouples deployment from database availability.

---

## 6. Responsive behaviour

Verified at 375×812 and at desktop.

- **No horizontal overflow at 375px.** Measured:
  `document.documentElement.scrollWidth === window.innerWidth`, with zero
  elements wider than the viewport outside a scroll container.
- Wide tables (route evidence, protocol "as reported", source register) scroll
  inside themselves via `TableScroller`, which bleeds to the screen edge on
  mobile so the scroll affordance is visible.
- The primary sections stay visible on mobile as a horizontal scroller rather
  than behind a menu button. A reference is navigated constantly and a hidden
  menu adds a tap to every move.
- The contents rail sits above the content on narrow screens and to the right on
  wide ones, via DOM order plus `lg:order-*` — which also puts it before the body
  for a screen reader.
- Typography scales with the viewport; the reading measure is capped so long
  prose never runs the full width of a large screen.

---

## 7. Accessibility

Audited in the running application on the compound record:

| Check | Result |
|---|---|
| `<h1>` count | 1 |
| Heading level skips | none |
| Landmarks | all labelled: `nav[Primary]`, `nav[Sections]`, `nav[Breadcrumb]`, `nav[On this page]`, plus footer navs |
| Images without `alt` | 0 |
| Buttons without accessible name | 0 |
| Inputs without a label | 0 |
| `lang` | `en` |
| Skip link | present, revealed on focus |
| Mode switch | `role="group"`, `aria-pressed` reflecting state |
| Reduced motion | smooth scrolling and transitions disabled under `prefers-reduced-motion` |
| Focus visibility | 2px `tide-teal` outline with offset on every interactive element |
| **Contrast** | **0 failures** across every rendered text node (see §11) |

Colour is never the only signal. Evidence class is always a word; the tint is
secondary. Contradicting evidence is labelled "Contradicts" as well as bordered.

The reading-mode switch, the search form and the filters all work without
JavaScript, which matters for a reference read on locked-down hospital machines.

---

## 8. Print behaviour

Print is a supported output, not an afterthought — these pages get carried into
consultations.

- Dedicated `@page` margins and a 10.5pt base.
- Chrome, the contents rail, the mode switch and breadcrumbs are dropped; the
  medical disclaimer in the footer is deliberately **kept**.
- Headings avoid breaking away from their content; tables, figures and evidence
  cards avoid breaking across pages; table headers repeat.
- Links resolve on paper: elements marked `print-url` expand to the full URL.
- **A paper-only masthead** carries the title, the reading depth, the URL, the
  version and the review date. A printout detached from the site otherwise says
  nothing about which depth it represents, and the two look similar on paper
  while meaning different things.
- **The patient print stays patient-safe** for the same reason the screen does:
  the dose was never fetched, so there is nothing on the page to print.

---

## 9. Tests

**127 tests across 12 files.** Integration tests apply the real migrations to an
in-process Postgres, so what is verified is what ships.

New in Phase B:

| Suite | Covers |
|---|---|
| `reading-mode.test.ts` | Patient payload carries no dosing field and no dose value anywhere in its serialised form; practitioner payload carries the regimen as reported; two sources remain two records; the register exposes registration without exposing unreviewed content |
| `schema-parity.test.ts` | The Drizzle schema and the shipped migrations describe the same database, column for column |

Carried from Phase A and still passing: publish gates, gate parity, access
control, editorial services, search, public surface, seeding, migrations, domain
logic, source manifest.

```
Test Files  12 passed (12)
     Tests  127 passed (127)
lint ✓   typecheck ✓   build ✓
```

---

## 10. Deficiencies found and fixed during the phase

These were found by building and looking, not by the plan.

1. **A registered compound 404'd.** The most significant find. Fixed with the
   register view and the "record in preparation" page (§1).

2. **Trigger firing order was wrong.** Postgres fires BEFORE triggers
   alphabetically by name. `claims_touch` sorted after `claims_a_coherence`, so
   the coherence check saw pre-version-bump values. Renamed to encode the
   sequence: `_a_touch`, `_b_coherence`, `_c_publish_gate`.

3. **A publish gate blocked editing published content.** Editing a live record
   bumps its version, which strands its approvals, so the gate refused the write
   — meaning published content could never be corrected without first being
   pulled. That pushes editors toward leaving errors in place. Gates now
   distinguish entering publication (refuse) from editing live content (withdraw
   and record why).

4. **`review_state` was a parity gap.** Publishing required a verification state
   the domain layer did not model, so `gate-parity.test.ts` failed. Fixed
   properly: `review_state` is now maintained by trigger from the reviews that
   exist, so it cannot drift from the evidence for it.

5. **A generated column was not immutable.** `editorial_state` used
   `review_state::text`; enum-to-text casts are only STABLE. Every branch now
   yields a literal.

6. **Function grants broke every policy.** Revoking EXECUTE from `PUBLIC`
   silently removed the grant `authenticated` inherited, breaking every RLS
   policy and every publish-gate trigger.

7. **Two contrast failures.** `slate` at the brief's `#66747b` measured 4.47:1 on
   the mist panel — just under AA. The lightest tone was well under wherever it
   carried meaning. Both fixed; audit now reports zero failures.

8. **A misleading search hint.** "Matched an alternative name" appeared on source
   results, where the indexed alias text is the author list.

9. **A misleading alias footnote.** A mixed list of names was labelled with the
   type of whichever name happened to be first.

10. **The dev database served one connection.** `PGLiteSocketServer` defaults to
    `maxConnections: 1`, so a Next.js pool starved everything else.

11. **Connection leak under hot reload.** Module-scoped clients opened a fresh
    pool on every edit; now cached on `globalThis` in development.

---

## 11. Design notes

The reference this wants to sit beside is a well-set scientific monograph. The
work is almost entirely typographic.

- **Type**: Source Serif 4 for headings, Inter for interface and body, both
  open-licensed and self-hosted. Tabular numerals wherever numbers are compared.
  A 1.2 scale at body sizes, opening up for display.
- **Rhythm**: a single `--rhythm` unit; section spacing is a multiple of it
  throughout. This is most of what makes a long page feel composed rather than
  stacked.
- **Colour**: restrained, and never the only signal. Three evidence tints, one
  caution tone, everything else is ink on warm white.
- **"Tides"**: carried by vertical rhythm, layered surfaces, and a single
  low-contrast curved rule that separates major movements of a page. Drawn once,
  as an inline SVG data URI, and nowhere else. No waves, no beaches, no syringes.

Contrast was measured rather than assumed — which is how the two failures in §10
were found. Every text tone now clears 4.5:1 against every surface it is used on,
including the tinted panels.

---

## 12. The demonstration dataset

`npm run db:demo`, guarded by `TIDES_ALLOW_DEMO_DATA=1` **and** a refusal to run
against anything but a local database.

It creates a **Demonstration Compound** and two **Demonstration Sources**, all
named as such, exercising: aliases including a `related_but_distinct` one; human,
preclinical and reference claims; contradicting evidence on a claim; two route
records; a regulatory status; two protocols from two sources with different
amounts; a recorded disagreement with two attributed positions; a quality topic
with both halves.

Every record goes through the **real publish gates** — the seeder creates four
staff members with separate roles because no single account can sign every gate.
If the gates had been bypassed rather than satisfied, the records would not be
published, and `reading-mode.test.ts` asserts that they are.

**No real compound was touched.** The seeded cohort remains registered and in
preparation.

---

## 13. Remaining gaps

**In the product:**

- No correction contact is live. The corrections page says so rather than
  offering a form that goes nowhere. Listed on `/coverage` as a known gap.
- No sitemap or robots configuration. Deliberate: `robots: index: false` is set
  globally while the index is this sparse. Both are Phase F items, and indexing
  should be enabled deliberately at launch.
- Route detail pages (`/routes/[slug]`) are not built; the index page covers the
  ontology and compound pages carry the evidence.
- `/peptides/[slug]` has no print-optimised patient handout layout beyond the
  print stylesheet. Purpose-built handouts are Phase C.
- No analytics, per decision 6.

**In coverage** (an editorial matter, not an engineering one):

- Zero published compound records. The first cohort is registered and in
  preparation.
- Zero published quality topics. Several depend on compendial and regulatory
  sources not yet in the register.
- Three sources marked `replace` and one `pending`; SRC-011 still needs a clean
  copy.
- Primary literature has not been systematically surveyed.

**Engineering follow-ups:**

- The integration suite creates a Postgres image per file (~50s total). Fine now;
  worth revisiting if it doubles.
- `getPublicDb()` and `getStaffDb()` still fall back to the same connection
  string. The restricted public role should be provisioned with Supabase.

---

## 14. Owner decisions needed

1. **A correction route.** An email address is enough to start. Until one exists
   the corrections page has nothing to offer, which is a real gap in a reference
   that asks to be trusted.

2. **Editorial priority for the first published record.** The architecture is
   done; what it needs now is extraction. The highest-value first target is
   probably **HPLC / chromatographic purity** rather than a compound: it depends
   on Grant (SRC-006, usable, complete), it is self-contained, and it is the
   topic most often misread in practice. A compound record needs far more
   surrounding evidence before it is worth publishing.

3. **SRC-011 replacement**, still open as V-013. The quality section's analytical
   spine depends on it.

4. **Whether `robots: index: false` lifts before or after the first published
   records.** Recommendation: after. An index with nothing in it gets
   badly-cached search results that persist.

5. **Supabase provisioning**, when convenient. Nothing is blocked; the local
   environment is complete and the migrations are ready to push.

---

## 15. Recommended Phase C sequence

`docs/BUILD_SEQUENCE.md` names Phase C as seed content. That is right, and the
order matters — extraction is the bottleneck now, and the first records set the
pattern every later one is measured against.

1. **Source verification pass (V-014).** Before extracting anything, confirm the
   title page of every source acquired through a third-party wrapper. Eight of
   sixteen are affected. SRC-011 nearly entered the register under the wrong
   editor; that is a systemic risk, not a one-off.

2. **Obtain the missing analytical and compendial sources.** The quality section
   cannot be written honestly without them, and they gate the highest-value
   content.

3. **Publish one quality topic end to end — HPLC purity.** Extract from Grant,
   record exact locators, state what it establishes and what it does not, and
   take it through review. This is the smallest complete unit of real content and
   it exercises the whole editorial workflow with genuine material.

4. **Then a second and third quality topic** — identity testing and peptide
   content/assay — because their value is largely in the contrast with the first.

5. **Extract BPC-157 route evidence (V-002).** The route model is the part of the
   schema most likely to reveal a modelling gap under real evidence, and BPC-157
   is where the practitioner sources disagree most.

6. **Resolve the TB-500 nomenclature question (V-001)** before publishing
   anything for Thymosin beta-4. The `related_but_distinct` machinery is built
   and tested; it needs a primary source to settle what it records.

7. **Publish the first compound record.** Only once it has real claims with real
   provenance, a plain-language summary, and a genuine statement of what is not
   established.

8. **Then, and only then, the derived outputs** — patient handouts, practitioner
   guides, PDF generation. `MASTER_BUILD_SPEC.md §2` requires these to be
   generated from reviewed records rather than written separately, and
   `publication_claims` exists to make that auditable. Building them before there
   are records to generate from would invert the dependency.

**What not to do next:** do not expand to more compounds. Ten registered records
with nothing published is not a coverage problem, it is an extraction problem,
and adding compounds makes it worse. Depth first.
