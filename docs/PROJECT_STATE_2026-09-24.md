# THE TIDES INDEX — PROJECT STATE — 24 September 2026

Audit only. No application code, data, schema or configuration was changed in producing this
report. No deployment was made. `noindex` is unchanged. Docker was not started.

**Evidence labels used throughout, as instructed:**

| Label | Meaning |
|---|---|
| **PRODUCTION VERIFIED** | Observed working on a public deployment |
| **LOCAL VERIFIED** | Observed working on this machine (HTTP response, command output, query result) |
| **IMPLEMENTED — NOT VERIFIED** | Code exists and was read; never executed |
| **PLANNED** | Exists only in a document or comment |
| **UNKNOWN** | Could not be determined |

Nothing in this report is labelled PRODUCTION VERIFIED, because there is no production deployment.

---

## 1. EXECUTIVE SUMMARY

The Tides Index is **much further along than a typical pre-launch project in everything except the
one thing that makes it publishable.** The evidence architecture is genuinely built: 47 database
tables, 29 migrations, 197 registered sources, 376 sourced claims with page-level locators, 84
protocols that are never merged across practitioners, 170 recorded evidence gaps, and publish gates
enforced in Postgres itself that automation is structurally incapable of satisfying. The website
renders all of it. Six books and twelve reference sheets build from the same records. This is the
hard part, and it is done to a standard well above the norm.

**The project is blocked on one thing: no human has reviewed anything.**

The platform's own readiness checker says every one of the 12 compounds is *mechanically* ready for
scientific review — locators resolved, human and safety claims traced, protocols sourced, funding
recorded (LOCAL VERIFIED, `npm run readiness`). But `publication_state` is `unpublished` on all of
them, because the publish gates require an approved review by a named human at the current record
version, and no such review exists. The only approved reviews in the database — 156 of them — were
recorded by a demonstration reviewer, which the project's own production checker flags as a blocker
in exactly those terms: *"A record may be published on an approval no person made."*

The consequence is precise and it is the central fact of this audit: **the public views return zero
compounds, zero claims and zero learning topics.** Everything visible on the local site is rendered
through a development preview path that is refused in any production build. A deploy today would
show a structurally complete, beautifully made, **empty** website.

Two things make this worse than a simple "needs review" status, and both are launch blockers in
their own right:

1. **The compound record page asserts a review that did not happen.** `/peptides/[slug]` prints
   *"Nothing appears on it that has not passed source checking and scientific review"* while
   rendering through the preview fallback (LOCAL VERIFIED, `page.tsx:798`). It is the most-read
   page, it carries mechanism and safety content, and it is the only record type with no review
   banner — quality topics have one, learning topics have one, research has one.
2. **Search cannot find the site's own records.** Searching `BPC-157` returns 12 results, every one
   a Source; the BPC-157 monograph renders two clicks away (LOCAL VERIFIED against the running
   site). Claims and protocols are never indexed at all.

Nothing is deployed. There is no Railway project, no Dockerfile, no git remote, and no Supabase
instance — the admin surface returns HTTP 500 locally because its environment variables do not
exist, which means **the review workflow that unblocks the entire product has never once been used**
(LOCAL VERIFIED). The domain `thetidesindex.com` is registered and currently serves a GoDaddy parked
page (LOCAL VERIFIED).

**The honest summary:** this is not a project that needs more research, more content or more design.
It needs a publication decision from its owner, a working sign-in, a deployment, and about a day of
truth-in-labelling fixes. The research corpus is ready. The reviewer is the bottleneck, and the
reviewer is a person, not a task.

---

## 2. WHAT EXISTS TODAY

### Repository

- `C:\The Tides Index`, branch `phase-a-foundation`, HEAD **`6b25d95`** ("Apply the Tides Index logo
  across the site and PDF covers"). Branch `main` exists and is behind. **No git remote. No tags.**
  (LOCAL VERIFIED)
- **57 uncommitted paths** — 35 modified, 22 untracked. This is the unfinished "Publications v3 /
  patient readiness" sprint, including `src/components/illustrations/patient.tsx` (11 patient
  figures), `src/publishing/books/peptides-the-essentials.tsx`, and a 1,363-line evidence packet.
  (LOCAL VERIFIED)

### Stack (LOCAL VERIFIED from `package.json`)

Next.js **16.3.4** App Router · React **19.3** · TypeScript strict with `exactOptionalPropertyTypes`
· Node **22.20** · Drizzle ORM + `postgres` · PGlite for local dev (port 5433) · Tailwind v4 tokens ·
Vitest · `@react-pdf/renderer` 4.9 · Supabase SDK (`@supabase/ssr`, `@supabase/supabase-js`) · zod.

This matches the architecture mandated in `CLAUDE.md`. No drift, no substitutions.

### Database (LOCAL VERIFIED by query)

**47 tables · 29 migrations (`0000`–`0028`) · 45 `public_v_*` views · 23 RLS policies · 47 database
functions.**

Live row counts: sources **199** · claims **376** · claim_evidence **534** · protocols **86** ·
trials **9** · evidence gaps **170** · learning topics **10** · quality topics **22** · editorial
syntheses **6** · search_documents **201** · reviews **156**.

### Application surface (LOCAL VERIFIED by filesystem + HTTP)

**23 public routes · ~20 admin routes · 2 API routes · 3 dev-only preview routes.**

### Corpus on disk

197 registered sources (`SOURCE_MANIFEST.json`, 480 KB) · 34 source PDFs in `sources/` ·
35 evidence/learning packets in `data/seed/` · 9 ClinicalTrials.gov registry snapshots ·
98 private source snapshots · 19 generated PDFs in `build/publications/`.

---

## 3. WHAT ACTUALLY WORKS

All LOCAL VERIFIED unless stated.

| Thing | Evidence |
|---|---|
| **Every public route returns HTTP 200** | Fetched live: `/`, `/peptides`, `/peptides/bpc-157`, `/protocols`, `/search`, `/quality`, `/learn`, `/sources` — all 200 |
| **Typecheck** | `npm run typecheck` exit 0 |
| **Unit tests** | 395 passing across 27 files, 0 failures |
| **Integration tests** | **405 passing across 34 files**, exit 0 (75 min runtime) |
| **The provenance chain** | Source → Source Location → Evidence Link → Claim/Protocol → Publication, enforced by FK and by `tides_claim_provenance_ok` |
| **Publish gates** | Enforced in Postgres, not just in TypeScript. `tides_has_approved_review` requires `outcome='approved' AND performed_by='human' AND reviewer_user_id IS NOT NULL` — **automation can never satisfy a gate.** This is the best-engineered part of the system |
| **Patient/practitioner separation** | Enforced at the data boundary: `getPeptidePage(slug, mode)` reads from a relation with no dosing columns in simple mode. `ModeSwitch` is a server-action form, so a practitioner payload is never sent to a simple-mode reader |
| **Preview gate** | `previewAllowed = nodeEnv !== 'production' && flag === '1'` — unpublished content is structurally incapable of rendering in a production build |
| **Citations** | Every citation carries who, what kind of source, exactly where (page/chapter/figure/timestamp), and whether the held copy is sound — including an inline "copy under replacement" chip |
| **Evidence classing** | Attaches to the *evidence row*, never the source type. "A textbook can report an RCT" is handled correctly |
| **12 of 12 compounds mechanically ready** | `npm run readiness` — locators resolved, human/safety claims traced, protocols sourced |
| **Copyright & secret hygiene** | `sources/*` git-ignored except README; `data/private/`, `build/`, `review/` ignored; only `.env.example` tracked. **Zero source PDFs and zero secrets in git** |
| **Print system** | 601 lines of print CSS in seven labelled sections; `@page` margins, running footers, repeated table headers, all `<details>` force-expanded, responsive swaps inverted for A4. The most complete subsystem in the project |
| **PDF pipeline** | 6 books + 12 reference sheets build from the same records; figures are converted from the site's own React element tree to vectors, not screenshotted. Figure proof: 35 pages, 35 unique figures |
| **Logo** | Applied site-wide and to all six PDF covers (commit `6b25d95`) |

---

## 4. WHAT IS PARTIALLY COMPLETE

| Area | State | Detail |
|---|---|---|
| **Publication** | **FUNCTIONAL BUT INCOMPLETE** | All content renders locally via preview; `public_v_peptides` / `public_v_claims` / `public_v_learning_topics` all return **0**. Production would be empty |
| **Search** | **PARTIALLY IMPLEMENTED** | See §9. Works well for sources; blind to everything else |
| **Admin/editorial** | **IMPLEMENTED — NOT VERIFIED** | 15 server actions, 953 lines of queries, role-scoped review queue. Returns **HTTP 500** locally because Supabase env vars are absent. Never exercised by a human |
| **Quality topics** | **13 written of 21** | 8 are named-only, honestly labelled "In preparation" / "Open question recorded"; 4 blocked on unheld USP chapters |
| **Volume One** | **11 chapters of 12** | Chapter six ("Why peptides are studied") held back as unsourced — but seed data now *does* source it (see §6) |
| **Publications page** | **INCOMPLETE** | Says "Five volumes"; six exist. *Peptides: The Essentials* is a build target and is invisible to every reader |
| **Figure library** | **INCOMPLETE** | 35 figures exist (24 shared + 11 patient); `/learn/figures` lists only the 24 |
| **Reference sheets** | **STALE** | 12 sheets last built 14 September — before the logo and before uncommitted changes to `reference-sheet.tsx` |
| **Corrections** | **INCOMPLETE** | The page states it itself: no correction contact is published, so corrections cannot be submitted |
| **Mobile** | **PARTIALLY IMPLEMENTED** | Compound register is a 9-column table at `min-w-[64rem]` inside a bare `overflow-x-auto` — roughly 2.7 screens of sideways scroll on a phone, with no scroll affordance. Contradicts `DESIGN_SYSTEM.md`'s own "no horizontal data-table traps" |

---

## 5. WHAT IS BROKEN

Ordered by consequence.

### 5.1 The compound record asserts a review that did not happen — **LAUNCH BLOCKER**

`src/app/(public)/peptides/[slug]/page.tsx:798` prints, unconditionally:

> "This record is assembled from reviewed, source-linked entries. Nothing appears on it that has not
> passed source checking and scientific review…"

The page renders via `previewPeptidePage()` (line 119/142), which is the *only* way it renders on
the current dataset. `PreviewBanner` is imported by exactly two files, both under `/quality`
(LOCAL VERIFIED by grep). So the highest-stakes page in the product — mechanism, safety, the one a
clinician would read — is the only record type that claims review while having none.

`/protocols` has the same defect over **dose data**, with no banner of any kind.

This is not a cosmetic issue. It is the single statement on the site that, if left as-is, would make
the whole trust architecture false.

### 5.2 The production database must not serve the public — **LAUNCH BLOCKER**

`npm run qa:production` (LOCAL VERIFIED):

```
BLOCKED  8 demonstration record(s) present.
BLOCKED  156 review(s) recorded by a demonstration reviewer.
         "A record may be published on an approval no person made. Remove the reviews, not
          just the profile."
BLOCKED  1 record(s) whose key names them as a test fixture. · quality_topics: demo-analytical-test
3 blocker(s). This database must not serve the public.
```

The only `published` rows in the database are demonstration rows (`demonstration-compound`, four
`DEMO-*` claims).

### 5.3 The admin surface throws — **LAUNCH BLOCKER (and the dependency for everything else)**

`GET /admin` → **HTTP 500** (LOCAL VERIFIED). `.env.local` contains `NEXT_PUBLIC_SITE_URL`,
`DATABASE_URL`, `DATABASE_POOL_MAX`, `TIDES_PREVIEW_UNPUBLISHED` — and **no Supabase keys**.
`createSupabaseServerClient()` calls `requireEnv()`, which throws; `getStaffSession()` calls it
unconditionally from `admin/layout.tsx`, so *every* admin route throws, including `/admin/sign-in`.

Because there is no `error.tsx` anywhere, this surfaces as an unstyled Next.js error page.

**Consequence: there is currently no way for any human to record a review, which is the only way
anything can ever be published.** This is the true critical path.

### 5.4 Search cannot find the site's own records — **LAUNCH BLOCKER**

LOCAL VERIFIED against the running site: `/search?q=BPC-157` → *"12 results"*, all labelled
**Source**. No compound record. See §9.

### 5.5 No error, not-found, or loading boundaries

`find src/app` for `not-found.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx`, `sitemap.ts`,
`robots.ts` returns **nothing** (LOCAL VERIFIED). Every `notFound()` — on compounds, sources,
learning topics, quality topics — lands on the unstyled Next 404. Every database error lands on the
unstyled Next error page. On a `force-dynamic` site where every page hits the database, there is no
streaming fallback anywhere.

### 5.6 Lint fails

`npm run lint`: **1 error** (`tests/unit/illustration-print.test.tsx:61`,
`@typescript-eslint/no-unnecessary-type-assertion`) and 1 warning
(`src/publishing/primitives.tsx:209`, `jsx-a11y/alt-text`, introduced by the logo commit).
Since `npm run verify` is `lint && typecheck && test && build`, **the project's own release command
currently fails at the first step** (LOCAL VERIFIED).

### 5.7 `/quality` hub contradicts `/quality/[slug]`

The hub uses `listQualityRegister()` with **no preview fallback** while every detail page has one.
Result: the hub marks topics "not yet written" and refuses to link them, while the pages themselves
render in full and are reachable from `/learn`.

### 5.8 Integration suite — **PASSES, but takes 75 minutes**

**LOCAL VERIFIED:** `34 test files, 405 tests, all passed`, exit code 0, duration **4,483s (~75
minutes)**. It was run with the dev server and PGlite both running, and still passed — so the
contention concern is about speed, not correctness.

This is not broken, but the duration is a real engineering risk: a 75-minute integration suite will
not be run before every release, and cannot sit in a CI pre-merge gate as-is. Worth profiling
post-launch (P2).

---

## 6. WHAT WAS PLANNED BUT NEVER BUILT

| Item | Where it was planned | State |
|---|---|---|
| **Talk to Tides / any AI** | `CLAUDE.md`, `MASTER_BUILD_SPEC.md` | **NOT PRESENT** — see §10 |
| **Semantic / vector search** | `CLAUDE.md:37` ("later, secondary, never the provenance authority") | **PLANNED.** No pgvector, no embeddings |
| **Tremblay / CanLab collection** | `SOURCE_MANIFEST.json` SRC-016, decision D-06 | **PLANNED ONLY** — see §8 |
| **Volume One, chapter six** | `volumes.ts:61` marked `needs: 'Review literature.'` | **Contradicted by the data.** Two learning packets now declare `publicationChapter: "Understanding Peptides — Six"`. The chapter is held back as unsourced while its sources exist |
| **"Patient Education Series 01, Peptides 101"** | Cited in 4 seed files + a 1,363-line evidence packet | **No such publication exists** in `src/publishing/books/`. Possibly renamed to *Peptides: The Essentials*; unresolved |
| **8 remaining quality topics** | `quality_topics.json` | Named only; 4 blocked on unheld USP chapters (V-019, V-020) |
| **13th compound** | Phase G planning docs | Not started (and explicitly out of scope in recent sprints) |
| **Admin for learning topics, syntheses, gaps, trials, certificates, corrections, aliases** | — | **No admin route exists.** All are seeded from JSON and rendered publicly, but are not editable by a human through any UI |
| **Search pagination** | `offset` implemented in the service | Not wired to any UI |
| **`sourceTypeKeys` / `categoryKey` search filters** | Implemented in the service | Exposed by no UI |
| **Claim / protocol / publication search indexing** | In the enum and the TS union | **No code writes rows of those types** |
| **18 held sources never cited** | — | Includes 3 genuinely usable ones: SRC-012, SRC-018 (ICH Q2(R2)), SRC-019 (ICH Q14) |
| **`tides-index-logo@2x.png`** | — | 586 KB, **zero references** — dead weight in the bundle |

---

## 7. CURRENT RESEARCH / DATA INVENTORY

### Sources — 197 registered (LOCAL VERIFIED from `SOURCE_MANIFEST.json`)

| By type | n | | By access | n | | By QC | n |
|---|---|---|---|---|---|---|---|
| primary_journal_article | 96 | | held | 94 | | usable | 181 |
| systematic_review / meta-analysis | 46 | | abstract_held | 95 | | pending | 8 |
| academic_textbook | 11 | | subscription_required | 4 | | **replace** | **7** |
| clinical_trial_registry | 10 | | unavailable | 4 | | incomplete | 1 |
| other | 8 | | | | | | |
| regulatory_guidance | 7 | | | | | | |
| compendial_standard | 7 | | | | | | |
| **practitioner_handbook** | **5** | | | | | | |
| academic_methods_reference | 2 | | | | | | |
| regulatory_label | 2 | | | | | | |
| conference_presentation | 2 | | | | | | |
| **expert_interview** | **1** | | | | | | |

**168 of 197 sources are actually cited** by at least one locator. 29 are registered but never cited.

**7 sources are marked `replace`** — the aggregator PDFs that are *not the registered work* (SRC-008,
009, 010, 011, 013, 014, 015). `CLAUDE.md` forbids their use as authoritative evidence, and the
audit trail in `data/private/source-audit.json` documents each finding. This was handled correctly.

### Content records

| Record type | Count |
|---|---|
| Compounds | **12** (BPC-157, Thymosin beta-4, TB-500, GHK-Cu, CJC-1295, Mod GRF (1-29), Ipamorelin, Tesamorelin, MOTS-c, Semax, Selank, Retatrutide) |
| Claims | **376** (106 compound · 104 quality · 166 learning) |
| Claim-evidence links | **534** |
| Protocols | **86** |
| Registered trials | **9** (4 BPC-157, 5 retatrutide) |
| Evidence gaps | **170** (78 with an explicit research question) |
| Verification issues | **22** (8 critical) |
| Quality topics | **21 registered, 13 written** |
| Learning topics | **10** |
| Editorial syntheses | **6** |
| Literature screen records | **1,768 screened** across 10 screens |

**Evidence class distribution:** reference_opinion **348** · human **94** · preclinical **67**.
That skew is itself a finding — the corpus is currently more handbook-and-textbook than trial, which
is exactly why the practitioner/primary distinction machinery matters.

### Data quality issues found

- Two near-duplicate learning topics: `pharmacology-receptors` ("Receptors, agonists and
  antagonists") and `receptor-pharmacology` ("…(English sources)") declare the **same publication
  chapter** and sit adjacent in the public list.
- `where-peptides-come-from` is seeded but referenced by no step in the learn journey.
- Two compounds (`mod-grf-1-29`, `tesamorelin`) render "No literature screen yet" on the register.
- Two root `.xlsx` trackers (byte-identical, 360 KB each) have **no importer** — historical input,
  superseded by `SOURCE_MANIFEST.json`.

---

## 8. JAMES LAVALLE STATUS

**VERDICT: INGESTED. LaValle is the single most heavily ingested practitioner source in the
project.** (LOCAL VERIFIED)

**SRC-002** — *Peptide Handbook: A Professional's Guide to Peptide Therapeutics* (2022), by James B.
LaValle, Gordon Crozier, Joseph P. Cleaver, Andrew Heyman. Integrative Health Resources, LLC.
281 pages. `qc_status: usable` · `access_status: held` · SHA-256 recorded · 99.5 MB local file ·
`public_fulltext_allowed: false`.

Ingested as structured records, not sitting in a folder:

| | Count |
|---|---|
| Page-level `source_locations` (keyed `lavalle-*`) | **36** |
| `claim_evidence` rows (`evidenceTypeKey: practitioner_reference`) | **36** |
| Protocols attributed to SRC-002 | **13** |
| Compound packets citing LaValle | **11 of 12** |

Heaviest use: tesamorelin (35 references), bpc-157 (30), thymosin-beta-4 (20), ghk-cu (14).

**It is correctly separated from primary research** by five independent mechanisms (LOCAL VERIFIED):
`evidence_types.isInterpretive = true`; `evidence_class = reference_opinion` with
`isHumanEvidence = false`; `protocol_sources.sourceRole` ∈ `original | secondary_reference |
commentary`; `claim_evidence.primaryTrace` state machine with CHECK constraints; and a per-source
`limitationsNotes` reading *"A practitioner handbook. Monograph statements are the authors' practice,
not study findings."*

The schema comment in `db/schema/taxonomy.ts` names the intent explicitly: this flag *"drives
'LaValle describes…' style attribution."* Protocols are never merged — *"LaValle's regimen and a
trial schedule are three rows that sit side by side."*

**The wider practitioner layer** — 5 handbooks held (Seeds, LaValle, Campbell ×2, "Hack Smith"),
111 page-level locators, 42 practitioner claim-evidence rows, **58 of 84 protocols** practitioner-sourced.

**Nothing further is needed for LaValle for V1.** It is done, and it is done correctly.

---

### 8b. TREMBLAY STATUS (asked for as a companion collection)

**VERDICT: PLANNED ONLY — registered as an empty placeholder, nothing to import.** (LOCAL VERIFIED)

**SRC-016** — "Tremblay / CanLab Source Dossier", Jean-François Tremblay / CanLab archive.
`source_type: expert_interview` (the only one in the register) · `qc_status: pending` ·
`access_status: unavailable` · **no filename, no file, no year**.

Integrity note on the record: *"Not yet captured. No file held."* Access note: *"…until an exact
recording or document with a date and timestamp is held, there is nothing to cite and nothing to
verify."*

**SRC-016 appears nowhere in `data/seed/**`** — zero locations, zero claims, zero protocols. Owner
decision **D-06** already records the standing resolution: *"Remains unavailable… nothing is
attributed to it."*

This is correct behaviour and needs no code change. It needs an artefact, which is an owner task,
not a build task. Per your instruction, I did not attempt to reconstruct it.

---

## 9. SEARCH STATUS

**Classification: FUNCTIONAL BUT INCOMPLETE — and it is the most visible incoherence in the product.**

**Mechanism (LOCAL VERIFIED from SQL + service code):** PostgreSQL full-text (`websearch_to_tsquery`)
**plus** `pg_trgm` fuzzy matching in one query. Rank is
`greatest(ts_rank, similarity(title), similarity(alias_text) * 0.9)`. Fuzzy floor `set_limit(0.3)`,
set per request inside the session. GIN indexes on the tsvector and trigram indexes on title and
alias text. Index maintenance is trigger-driven from `peptides`, `peptide_aliases`, `claims`,
`peptide_routes`, `quality_topics`, `sources`. **No vector/semantic layer** — by design.

This is a well-built deterministic search, exactly as `CLAUDE.md` mandates.

**What it can actually find:**

| Entity | Indexed? | Gate |
|---|---|---|
| `source` | yes | any source except `qc_status = 'exclude'` — **not publication-gated** |
| `peptide` | yes | **published only** — row is *deleted* from the index otherwise |
| `quality_topic` | yes | **published only** |
| `claim` | **NO** | in the enum and the TS union; **no code ever writes one** |
| `protocol` | **NO** | same |
| `publication` | **NO** | same |

**LOCAL VERIFIED live test** — `/search?q=BPC-157`:

> **"12 results for 'BPC-157'"** — Source, Source, Source … all 12. No compound record.

Meanwhile `/peptides/bpc-157` returns HTTP 200 and renders the full monograph. The site's flagship
record is unreachable from the site's own search box.

Two independent causes, both fixable:
1. **Publication gating** — peptide and quality rows are removed from the index unless published, and
   nothing is published.
2. **No preview fallback** — `/search` is the *only* content page with no `preview*` path, so it is
   structurally blind to what every other page is showing.

Additionally: **claim statement text is never indexed at all.** A claim change reindexes its parent
*peptide*, and only that peptide's four summary fields become body text. A reference whose statements
cannot be searched is a browse tree, not a search.

Other gaps: no pagination (`offset` exists, unreachable from the UI; "First 50 results" is a dead
end) · no snippets/highlighting (`ts_headline` unused) · single-select filters where the service
accepts arrays · two implemented filters exposed by no UI · no "did you mean" despite a populated
alias table · `hrefFor()` returns a self-referential `/search?q=<slug>` link for claim/protocol
results, a latent dead end.

**Good work worth keeping:** section hints map query words to deep links like
`/peptides/bpc-157#literature` — and all 11 target anchors were verified to exist. The protocol
library link renders even when the index is empty.

---

## 10. TALK TO TIDES / AI STATUS

**Classification: NOT PRESENT (runtime) / PLANNED ONLY (documents).** (LOCAL VERIFIED by
repo-wide grep)

A case-insensitive search for `anthropic|openai|pgvector|embedding|langchain|llm|Talk to Tides`
across all `.ts/.tsx/.json/.md/.sql` outside `node_modules` matched **four files**: `CLAUDE.md`,
`MASTER_BUILD_SPEC.md`, `assets/fonts/README.md`, `package-lock.json`. **Zero matches in `src/`,
`db/`, `scripts/`, `data/`.**

- No AI SDK in dependencies (prod or dev).
- No `pgvector` extension; the only `vector` in the schema is `search_documents.search_vector`
  (a tsvector).
- No chat route, no streaming endpoint, no prompt templates, no "Talk to Tides" string anywhere.

**Where AI *was* used, and is disclosed honestly:** extraction was AI-assisted *outside* the
codebase; `/methodology` carries a reader-facing section "Where automation is used", and Volume One
refers to "this index's AI-assisted extraction". The shipped scripts are deterministic.

The product also states the absence as a feature — `/search` tells the reader *"Nothing is
summarised or generated."*

**Is it required for V1? No — and it should not be in V1.** The product's entire value proposition is
traceability. Adding a generative layer before a single record has passed human review would invert
the priority order `CLAUDE.md` sets out, and would put a generated answer in front of an unreviewed
corpus. Recommend P3, after publication works.

---

## 11. CITATION & PROVENANCE STATUS

**Classification: COMPLETE. This is the strongest part of the project.** (LOCAL VERIFIED)

**Two-level storage.** `sources` holds work-level identity (DOI, PMID, ISBN, trial registry ID,
canonical URL) *plus* a file-identity chain: `localFileSha256`, `localFileBytes`, `pageCount`,
`printedPageOffset`, `qcStatus`, and a generated `isCitable`. `source_locations` holds position:
page range, chapter, section, figure, table number, **timestamp start/end** (for interviews),
URL fragment, human-readable `locatorText`, and a stable `locationKey` so re-running an extraction
updates rather than duplicates.

`printedPageOffset` deserves specific credit: locators are recorded as the **work's own printed
pages**, with the offset recording how that differs from the PDF's numbering — so a citation stays
re-checkable against the specific copy held.

**Many-to-many in both directions, verified:** one source backs many claims (SRC-006 backs 42
evidence rows; SRC-002 backs 36); one claim cites many sources (86 claims carry more than one
evidence row, 47 cite more than one distinct source). Uniqueness is on `(claimId, sourceLocationId)`.

**Contradiction is preserved, not resolved:** `relationship ∈ {supports, contradicts, contextualizes,
cites}`, with 3 `contradicts` rows in seed. The schema comment states it plainly — *"Contradicting
evidence is retained and displayed; it is never resolved by deletion."* There is a dedicated
`disagreements` / `disagreement_positions` pair with one row per side, each attributed.

**Evidence class attaches to the evidence row, never the source.** `source_types.typicalEvidenceClass`
exists but is explicitly advisory. Per-row `populationModel` records species/model — *"'Rat' is not
'patient'."*

**Private text stays private:** verbatim extracted text lives in `claim_evidence.extractedTextPrivate`,
marked *"never selected by any public view or public query path."*

**The one UI-level gap** is not in the provenance model but in its presentation: "last reviewed
**Not recorded**" appears on every record, on screen and on every printout, where it reads as an
unfinished field rather than an editorial state.

---

## 12. PDF / PRESENTATION STATUS

**Classification: FUNCTIONAL BUT INCOMPLETE.** (LOCAL VERIFIED for build outputs; page counts from
the last build)

**Six books + twelve per-compound reference sheets.**

| Volume | Pages | State as printed |
|---|---|---|
| One — *Understanding Peptides* | 38 | "Draft for review: eleven chapters" (11 of 12) |
| Two — *Peptide Science & Applications* | 22 | Draft, awaiting scientific review |
| Three — *Reference Guide* | 78 | Draft, awaiting scientific review |
| Four — *Protocol Book* | 108 | Draft, awaiting scientific review |
| Five — *Peptide Quality* | 22 | "First-edition excerpt" |
| **(unlisted)** — *Peptides: The Essentials* | 12 | Clinic handout, issued 15 Sep 2026 |

**The figure pipeline is a genuine technical achievement:** figures are converted from the site's own
React element tree into react-pdf vectors — token classes and `currentColor` resolved, arrowheads
drawn as polygons, multi-line labels flattened — rather than screenshotted. The converter throws on
anything it cannot read, so a figure can never silently lose a label. Figure proof: **35 pages,
35 unique figures** (24 shared + 11 patient), each verified byte-distinct.

**Gaps:**
- *Peptides: The Essentials* is a **sixth** publication; `volumes.ts` and `/learn/publications` both
  say "Five volumes". It is invisible to every reader.
- The 11 patient figures do not appear on `/learn/figures` (which lists only the 24 shared ones);
  its test only checks the shared registry.
- All 12 reference sheets are **stale** — built 14 September, before the logo commit and before the
  uncommitted `reference-sheet.tsx` changes.
- Volume One chapter six is held back as unsourced while its sources exist (§6).
- **UNKNOWN:** whether the six books currently build. The last build log predates edits to five of
  the six book files; I did not run the PDF builds during this audit.

**Gamma deck:** `Documents and Presentations/Tides_Peptides_101_Gamma_Import_v1.md` (10 cards)
specifies a **different brand palette** and "Inter-style modern sans serif only. Never use serif
fonts" — which conflicts with the site's serif-led identity. Needs an owner decision (§19).

---

## 13. WEBSITE / UX STATUS

**Site tree: 23 public routes.** `/` · `/learn` · `/learn/[slug]` · `/learn/figures` ·
`/learn/publications` · `/peptides` · `/peptides/[slug]` · `/protocols` · `/research` · `/quality` ·
`/quality/[slug]` · `/quality/certificate-of-analysis` · `/quality/sequence-to-vial` · `/sources` ·
`/sources/[key]` · `/search` · `/evidence` · `/methodology` · `/editorial-policy` · `/corrections` ·
`/coverage` · `/routes`. Plus ~20 admin routes, 2 API routes, 3 dev-only preview routes.

**Launch-blocker flags per page:**

| Page | Blocker |
|---|---|
| `/peptides/[slug]` | **Asserts unperformed review; no preview banner** (§5.1) |
| `/protocols` | **Renders unpublished dose data with no review marker** |
| `/search` | **Cannot find the site's own records** (§9) |
| `/quality` | Hub says topics don't exist while their pages render (§5.7) |
| `/corrections` | No correction contact — the trust loop has no return path |
| `/` | Hardcoded "Nothing is published yet." sits beside live counts; contradicts itself on first publication |
| `/learn/publications` | "Five volumes"; six exist |
| `/peptides` | 1024px-wide table on a 375px phone, no card fallback |
| *(all)* | `noindex` site-wide; no `sitemap.ts`, no `robots.ts`, no `not-found.tsx`, no `error.tsx` |
| `/admin/*` | **HTTP 500** (§5.3) |

**Design system — genuinely strong.** 16 colour tokens with *measured* contrast; Source Serif 4 +
Inter, self-hosted and vendored as TTF for the PDF pipeline; a single `--rhythm` property driving
spacing; four measures. **Zero default-Tailwind palette classes and zero raw hex in any public
component** (LOCAL VERIFIED) — all such uses are confined to admin. Illustrations use `currentColor`
(252 uses) and tokens (41), never bare hex. Evidence state is encoded in **four independent channels**
(word, glyph, border shape, tint) so it survives greyscale print and colour-blind reading.

**Design system gaps:** no `Button` primitive (13 distinct hand-written CTA class strings, two
missing the `transition-colors` the others have) · six unsystematised radii with no token · two
different scroll idioms · palette defined twice (CSS + `theme.ts`) with nothing enforcing parity ·
the editorial-state legend is defined in three places **and the wording has already diverged**.

**Reading modes** are excellent: cookie-backed, defaulting to `simple`, enforced at the data boundary,
works without JavaScript, survives print. The one flaw: the mode switch appears on only 9 of 23
public pages while the site-wide styling applies to all of them.

---

## 14. DEPLOYMENT STATUS

**Nothing is deployed. There has never been a deployment.** (LOCAL VERIFIED)

| Item | State |
|---|---|
| Railway project / config | **None.** No `railway.json`, `railway.toml`, `Procfile`, `nixpacks.toml` or Dockerfile anywhere |
| Git remote | **None.** No remotes, no tags |
| Supabase instance | **None provisioned.** Keys absent from `.env.local`; admin 500s |
| Hosted database | **None.** Local PGlite only (port 5433) |
| Sentry / monitoring | **Not configured** — named only in `.env.example` |
| CI/CD | **None** |
| `next.config.ts` | `output: 'standalone'`, commented "Railway deploys a standalone server bundle" — **PLANNED** |
| **Domain `thetidesindex.com`** | **Registered and live, serving a GoDaddy parked page** (LOCAL VERIFIED: HTTP 200, GoDaddy CSP headers) |
| DNS → application | Not pointed anywhere real |
| Cloudflare | Not configured |

**What a deploy would need, none of which exists yet:** a Railway project, a hosted Postgres, a
Supabase project with auth configured and a redirect URL, migrations run against the hosted DB, a
seed run, `NEXT_PUBLIC_SITE_URL` set, `TIDES_PREVIEW_UNPUBLISHED` **absent** (it is refused in
production anyway), DNS moved off the parked page, and `noindex` lifted deliberately.

---

## 15. TECHNICAL RISKS

### CRITICAL

1. **Unreviewed medical content could reach the public if the preview flag were ever set in a
   non-production `NODE_ENV` deployment.** The gate requires *both* conditions
   (`nodeEnv !== 'production' && flag === '1'`), which is correct, but a staging deploy with
   `NODE_ENV=development` and the flag set would publish unreviewed dosing content. **Mitigation:
   never set that variable on any hosted environment.**
2. **The `/peptides/[slug]` false review assertion** (§5.1). This is the one defect that converts a
   scrupulous product into a misleading one.
3. **Demonstration reviews in the database** (§5.2) — the project's own checker names the risk
   exactly: a record could be published on an approval no person made.

### LAUNCH BLOCKER

4. **No Supabase auth → no review possible → nothing can ever be published.** The critical path.
5. **Search incoherence** (§9).
6. **No `error.tsx` / `not-found.tsx`** — any DB hiccup shows an unstyled stack-trace page to the
   public.
7. **Lint error breaks `npm run verify`** (§5.6).
8. **57 uncommitted files.** An unreviewed working tree cannot be deployed or rolled back cleanly.
9. **Integration suite takes 75 minutes** (§5.8) — it passes (405 tests), but is too slow for a pre-merge CI gate.

### POST-LAUNCH

10. `npm ci` reports **4 moderate vulnerabilities** (not yet triaged).
11. Palette and editorial-state legend duplicated across web and print with no enforcement — already
    drifting in wording.
12. Hand-maintained counts in prose ("eleven chapters" in six places, "five volumes" in three,
    "twelve compound monographs") will go stale silently.
13. No backup/restore procedure for the hosted database.
14. Mobile register table.

### LOW PRIORITY

15. Dead 586 KB `@2x` logo asset; 259 KB PNG served at 44px height where an SVG belongs.
16. Route-shadowing risk (`/learn/figures` vs a future topic slugged `figures`).
17. `DATABASE_URL_PUBLIC` restricted role never provisioned — both connections fall back to the same
    role.

**Security positives, verified:** RLS with 23 policies as the real authorisation boundary; staff-ness
requires an admin-created `profiles` row, never self-signup; `auth.getUser()` used rather than
`getSession()`; same-origin-only auth redirects; and **no copyrighted PDFs, no private data and no
secrets in git**.

---

## 16. V1 DEFINITION

**The smallest coherent version of The Tides Index that is worth putting a domain on.**

The defining constraint: **human scientific review cannot be compressed into three days, and must
not be faked.** Everything below is designed around that fact.

### V1 includes

1. **The source register** — 197 sources with full provenance. *Already works, already honest, not
   publication-gated.* This alone is a credible reference product.
2. **12 compound records** — published under whichever model you choose in §19 Decision 1, with the
   review state stated unmissably on every one.
3. **13 quality topics**, 10 learning topics, the research agenda, the evidence taxonomy.
4. **Protocols** — with dosing either gated behind real review, or shown in practitioner mode with an
   unmissable "source-reported, not reviewed" banner. *This is the highest-risk surface on the site.*
5. **Search that finds what the site renders.**
6. **The trust pages** — methodology, editorial policy, coverage, corrections *with a working
   correction address*.
7. **A deployment** at `thetidesindex.com` with `noindex` lifted deliberately, a sitemap, and error
   boundaries.

### V1 explicitly excludes

Talk to Tides · semantic search · the 13th compound · the 8 unwritten quality topics · Volume One
chapter six · Tremblay · public PDF downloads · a public API · claim-level search indexing (P2) ·
admin CRUD for learning topics and syntheses.

### The V1 question in one sentence

*Can a stranger arrive at thetidesindex.com, search for BPC-157, read a compound record, see exactly
which source each statement came from and how far it has been reviewed, and never once be misled
about what has been checked?*

Today the answer is no on three counts: the search fails, the review state is misstated, and the site
is not deployed. All three are fixable in days, not weeks.

---

## 17. P0 / P1 / P2 / P3 BACKLOG

### P0 — must be true before anything is public

| # | Task | Why |
|---|---|---|
| P0-1 | **Owner decides the publication model** (§19 D1) | Every other P0 depends on it |
| P0-2 | **Provision Supabase auth; get `/admin` responding; sign in as a real staff user** | Without this no human can record a review, so nothing can ever publish. *The critical path.* |
| P0-3 | **Remove all demonstration records and the 156 demonstration reviews from the production database** until `qa:production` passes | The database currently "must not serve the public" by its own test |
| P0-4 | **Fix the false review assertion on `/peptides/[slug]`; add review-state banners to compound records and `/protocols`** | §5.1 — the one defect that makes the product misleading |
| P0-5 | **Make search return the records the site renders** | §9 |
| P0-6 | **Add `not-found.tsx` and `error.tsx`** (+ `global-error.tsx`) | An unstyled stack trace is not an acceptable public failure mode |
| P0-7 | **Fix the lint error; get `npm run verify` green; run the integration suite cleanly with the dev server stopped** | Release gate |
| P0-8 | **Commit or shelve the 57 uncommitted paths** | Cannot deploy or roll back an unreviewed tree |
| P0-9 | **Deploy**: Railway project, hosted Postgres, migrations, seed, env vars, DNS off the parked page | §14 |
| P0-10 | **Publish a correction contact** | A transparency product that cannot receive a correction |
| P0-11 | **Lift `noindex` deliberately; add `robots.ts` + `sitemap.ts`** | Last action before launch, not the first |

### P1 — should be true at launch

P1-1 Compound register mobile fallback · P1-2 "last reviewed: Not recorded" → a real editorial state
· P1-3 `/quality` hub preview consistency · P1-4 reconcile six publications vs "five volumes" ·
P1-5 home page "Nothing is published yet." derived from data · P1-6 rebuild the 12 stale reference
sheets · P1-7 resolve the duplicate receptor learning topics · P1-8 add the 11 patient figures to
`/learn/figures` · P1-9 reading-mode switch on all public pages · P1-10 unify the five phrasings of
"in preparation".

### P2 — soon after launch

P2-1 index claims and protocols for search (or remove them from the enum) · P2-2 search pagination,
snippets and multi-select filters · P2-3 admin routes for learning topics, syntheses and gaps ·
P2-4 `Button` primitive + radius tokens · P2-5 SVG logo; delete the dead `@2x` asset · P2-6 single
source of truth for the palette and the editorial-state legend · P2-7 derive hand-maintained counts
from data · P2-8 triage the 4 moderate npm vulnerabilities · P2-9 backup/restore procedure.

### P3 — later

P3-1 Talk to Tides · P3-2 semantic/vector discovery layer · P3-3 13th compound · P3-4 the 8 unwritten
quality topics (4 blocked on USP purchases) · P3-5 Volume One chapter six · P3-6 Tremblay artefact
acquisition · P3-7 the 18 held-but-uncited sources · P3-8 public PDF downloads.

---

## 18. THREE-DAY COMPLETION PLAN

Assumes the owner decisions in §19 are made at the start of Day 1, and that Railway/Supabase accounts
are available. **Human scientific review is the one item that cannot be compressed — it runs in
parallel throughout and is the gating item for the publication model chosen.**

### DAY 1 — Truth, cleanliness, and the ability to review

| | |
|---|---|
| **TASK 1.1** | Land or shelve the 57 uncommitted v3 files; fix the lint error; get `npm run verify` green; re-run the integration suite after the changes (allow ~75 min) |
| **WHY** | Nothing can be deployed or rolled back from a dirty tree, and the release command currently fails at step one |
| **DEPENDENCY** | None — start here |
| **EXPECTED OUTPUT** | Clean tree, a commit hash, green lint/typecheck/unit/integration/build |
| **HOW WE VERIFY** | `git status` clean; `npm run verify` exit 0; integration suite still 405/405 |

| | |
|---|---|
| **TASK 1.2** | Remove the false review assertion from `/peptides/[slug]`; add the existing `PreviewBanner` + `ReviewStatusPanel` to compound records and `/protocols` |
| **WHY** | §5.1 — the defect that makes the product misleading. Components already exist |
| **DEPENDENCY** | 1.1 |
| **EXPECTED OUTPUT** | Every record page states its true review state in both reading modes and in print |
| **HOW WE VERIFY** | Fetch `/peptides/bpc-157` and `/protocols` in both modes; grep the response for the banner and for the removed sentence; unit test asserting the assertion cannot render for an unpublished record |

| | |
|---|---|
| **TASK 1.3** | Provision Supabase; set the keys; sign in as a real staff user; open the review queue |
| **WHY** | **The critical path.** No auth → no review → nothing can ever publish |
| **DEPENDENCY** | Owner provides the Supabase project |
| **EXPECTED OUTPUT** | `/admin` returns 200; a real `profiles` row exists for a named reviewer |
| **HOW WE VERIFY** | HTTP 200 on `/admin` and `/admin/review`; a review recorded by hand appears in `reviews` with a non-null `reviewer_user_id` |

| | |
|---|---|
| **TASK 1.4** | Purge demonstration records and the 156 demonstration reviews from the database intended for production |
| **WHY** | §5.2 |
| **DEPENDENCY** | 1.3 |
| **EXPECTED OUTPUT** | `qa:production` reports 0 blockers |
| **HOW WE VERIFY** | `npm run qa:production` |

**In parallel from Day 1:** the named scientific reviewer begins reading records. This is the real
constraint on how much of the corpus is publishable at launch.

### DAY 2 — Coherence and deployment

| | |
|---|---|
| **TASK 2.1** | Make search return what the site renders, per the chosen publication model |
| **WHY** | §9 — the most visible incoherence |
| **DEPENDENCY** | Decision D1; 1.2 |
| **EXPECTED OUTPUT** | `BPC-157` returns the compound record, not only sources |
| **HOW WE VERIFY** | Live query for `BPC-157`, `TB-500`, `Modified GRF`, a misspelling, and a quality topic; assert entity types in the results |

| | |
|---|---|
| **TASK 2.2** | Add `not-found.tsx`, `error.tsx`, `global-error.tsx`; add `robots.ts` and `sitemap.ts` (sitemap listing published records only) |
| **WHY** | §5.5 |
| **DEPENDENCY** | None |
| **EXPECTED OUTPUT** | Branded 404 and error pages; a sitemap that cannot leak unpublished slugs |
| **HOW WE VERIFY** | Fetch a nonexistent slug; force a DB error in dev; fetch `/sitemap.xml` and diff against the published set |

| | |
|---|---|
| **TASK 2.3** | Create the Railway project and hosted Postgres; run migrations; seed; set env vars (**`TIDES_PREVIEW_UNPUBLISHED` must not exist**); deploy the standalone build |
| **WHY** | §14 — nothing is deployed |
| **DEPENDENCY** | 1.1, 1.4; owner provides Railway |
| **EXPECTED OUTPUT** | A working Railway URL, still `noindex` |
| **HOW WE VERIFY** | Fetch every public route on the Railway URL and record status codes; confirm the preview variable is unset; confirm `qa:production` against the hosted DB |

| | |
|---|---|
| **TASK 2.4** | Publish the correction contact |
| **WHY** | §5 / P0-10 |
| **DEPENDENCY** | Owner supplies the address |
| **EXPECTED OUTPUT** | `/corrections` states how to report an error |
| **HOW WE VERIFY** | Fetch the page; send a test correction to the address |

### DAY 3 — Publication, polish, acceptance

| | |
|---|---|
| **TASK 3.1** | Publish the records the reviewer has approved, through the real gates |
| **WHY** | The product's purpose |
| **DEPENDENCY** | 1.3, 1.4, 2.3, and actual human review |
| **EXPECTED OUTPUT** | `public_v_peptides` returns > 0; those records render in a production build with no preview path |
| **HOW WE VERIFY** | Query the public views on the hosted DB; fetch the records on Railway; confirm an unpublished record 404s there |

| | |
|---|---|
| **TASK 3.2** | P1 pass: mobile register fallback, "last reviewed" state, `/quality` hub consistency, six-vs-five volumes, derived home-page counts |
| **WHY** | The visible rough edges a first visitor meets |
| **DEPENDENCY** | 2.3 |
| **EXPECTED OUTPUT** | Register readable at 375px; no self-contradicting counts |
| **HOW WE VERIFY** | Render at 375px in the browser pane; fetch `/`, `/quality`, `/learn/publications` and check the numbers against the database |

| | |
|---|---|
| **TASK 3.3** | Point DNS off the parked page; lift `noindex`; final acceptance run |
| **WHY** | Launch |
| **DEPENDENCY** | Everything above; §21 checklist fully green |
| **EXPECTED OUTPUT** | `thetidesindex.com` serves the application |
| **HOW WE VERIFY** | The §21 checklist, executed item by item against the live domain |

**Realistic note:** Days 1–2 are achievable as written. Day 3's publication step is bounded entirely
by how many records a human has genuinely reviewed. If that number is zero on Day 3, the launch
should proceed under Decision D1 Option B (a clearly-marked review edition) or not at all — it
should **not** proceed by loosening the gates.

---

## 19. DECISIONS IAN NEEDS TO MAKE

### D1 — What does "published" mean for V1? *(the decision everything else waits on)*

**WHY IT MATTERS:** Publish gates require an approved human review at the current record version.
No real record has one. Until this is resolved, a production deploy shows an empty site.

- **OPTION A — Review first, publish what passes.** A named scientific reviewer reads records; each
  passes its gates; only those go public.
  *Consequence:* fully honest, zero architectural change, and the gates already work. But the launch
  size equals the review throughput of one person — realistically 1–3 compounds in three days, not
  12. Requires Supabase auth first (P0-2).
- **OPTION B — Publish a clearly-marked "review edition."** Make the unreviewed state a first-class
  *public* state with unmissable per-record banners, and publish the corpus under it.
  *Consequence:* all 12 compounds and 13 quality topics go live in days. Requires the §5.1 fix as an
  absolute precondition, plus a schema/UI decision about how the state is represented. **My
  recommendation, with one condition: keep dosing behind real review.** Protocols are the highest-risk
  surface; a reader can be misled by an unreviewed dose in a way they cannot be by an unreviewed
  mechanism summary.
- **OPTION C — Launch the source register only.** Ship `/sources`, `/evidence`, `/methodology`,
  `/coverage` — all of which are already honest and not publication-gated — and hold the monographs.
  *Consequence:* shippable almost immediately and completely defensible, but it is not the product;
  a visitor cannot look up BPC-157.

**My technical recommendation: B + A in parallel** — launch a review edition with dosing gated, while
real review proceeds record by record and each approved record graduates to fully published.

### D2 — Who is the scientific reviewer of record?

**WHY IT MATTERS:** `tides_has_approved_review` requires a named human with a `reviewer_user_id`, and
`reviewTypesForRole()` deliberately prevents one account from assembling all four approvals a
protocol needs. A reference that says "scientifically reviewed" must be able to name who.

- **A:** Ian, as `scientific_reviewer`. *Fast; but one person cannot also supply the clinical and
  compliance approvals a protocol requires — so protocols stay unpublishable.*
- **B:** Recruit an external reviewer before launch. *Slower; unblocks protocols and is far more
  credible.*
- **C:** Launch under D1-B with no reviewer named, and no record claiming review. *Fastest; honest
  only if nothing anywhere claims review.*

### D3 — Are practitioner-sourced doses public at V1?

**WHY IT MATTERS:** 58 of 84 protocols come from practitioner handbooks. Patient mode already
suppresses dosing structurally. The open question is practitioner mode, unreviewed.

- **A:** Show them, banner-marked as source-reported and unreviewed. *Highest product value, highest
  risk.*
- **B:** Hold all dosing until clinical + compliance review. *Lowest risk; `/protocols` becomes thin
  at launch.*
- **C:** Show protocol *existence, source and route* while withholding amounts until review.
  *Middle path; the data model already separates these fields, so it is cheap to build.*
  **My recommendation.**

### D4 — Supabase, or Railway Postgres + a different auth?

**WHY IT MATTERS:** `CLAUDE.md` mandates Supabase, the code is written against `@supabase/ssr`, and
RLS policies assume the `authenticated` role. But nothing is provisioned, and this is the critical
path.

- **A:** Provision Supabase as designed. *Zero code change. My recommendation.*
- **B:** Railway Postgres + another auth provider. *Would require rewriting the session layer and the
  RLS role assumptions — days of work on the one subsystem that must not be wrong. Not recommended.*

### D5 — The Gamma deck's conflicting brand

**WHY IT MATTERS:** `Tides_Peptides_101_Gamma_Import_v1.md` specifies a different palette and
"never use serif fonts", against a serif-led site identity and six serif PDF covers.

- **A:** Bring the deck to the site's identity. *Consistent; deck needs rework.*
- **B:** Keep it as a separate presentation identity. *Faster; two brands in circulation.*
- **C:** Shelve the deck until after V1. **My recommendation** — it is not on the V1 path.

### D6 — Does "Patient Education Series 01, Peptides 101" still exist?

**WHY IT MATTERS:** Four seed files and a 1,363-line evidence packet cite a publication that does not
exist in the codebase. Either it is *Peptides: The Essentials* renamed, or it is a dangling reference
in published provenance.

- **A:** It was renamed to *Peptides: The Essentials* — update the seed references.
- **B:** It is still planned — leave the references and build it post-V1.
- **C:** It is cancelled — remove the references before anything publishes.

*(I could not resolve this by inspection; it is a genuine product-history question.)*

---

## 20. CLAUDE CODE EXECUTION BRIEF

> Paste this into a fresh Claude Code session to begin implementation.

### CURRENT PROJECT STATE

The Tides Index is an independent peptide science and clinical reference platform. The evidence
architecture, website, editorial workflow and publishing pipeline are built. **Nothing is published
and nothing is deployed**, because the Postgres publish gates require an approved review by a named
human, and no such review exists. Public views return 0 compounds, 0 claims, 0 learning topics.
All content currently renders through a development preview path that production builds refuse.

### CURRENT BRANCH / COMMIT

Branch `phase-a-foundation`, HEAD **`6b25d95`**. No git remote. **57 uncommitted paths** (35 modified,
22 untracked) from an unfinished "Publications v3 / patient readiness" sprint — resolve these first.

### ARCHITECTURE

Next.js 16.3.4 App Router · React 19.3 · TypeScript strict (`exactOptionalPropertyTypes`) ·
Drizzle ORM + `postgres` · PGlite locally on 5433 · Tailwind v4 tokens in `src/styles/globals.css` ·
Supabase Auth (staff only) · Vitest · `@react-pdf/renderer` · Postgres FTS + pg_trgm search ·
47 tables, 29 migrations, 45 `public_v_*` views, 23 RLS policies.

**Read `CLAUDE.md` before touching application code. Next.js 16 differs from training data — read
`node_modules/next/dist/docs/` if present.**

### DO NOT BREAK

1. **The publish gates.** `tides_has_approved_review` requires
   `outcome='approved' AND performed_by='human' AND reviewer_user_id IS NOT NULL`. Never loosen this,
   never let automation satisfy a gate, never publish by direct SQL update.
2. **The preview gate.** `previewAllowed = nodeEnv !== 'production' && flag === '1'`. Never set
   `TIDES_PREVIEW_UNPUBLISHED` on any hosted environment.
3. **Patient-mode dose suppression.** Enforced at the data boundary, not in the view. `ModeSwitch`
   must stay a server action.
4. **Provenance.** Never invent dosing/safety details, never average practitioner regimens, never
   label a practitioner statement as a trial conclusion, never infer human efficacy from animal data.
5. **`sources/` is read-only.** Never commit source PDFs; never expose them publicly; never "clean"
   originals. `.gitignore` currently protects this — do not weaken it.
6. **Corrupt sources** (`qc_status: replace`, 7 of them) must not be used as authoritative evidence.
7. **Do not hard-code medical claims into React components.** Public pages render from records.

### P0 TASKS

1. Resolve the 57 uncommitted files; fix the lint error at
   `tests/unit/illustration-print.test.tsx:61`; get `npm run verify` green; re-run the integration
   suite (currently 405/405, ~75 minutes).
2. Remove the false review assertion at `src/app/(public)/peptides/[slug]/page.tsx:798` and add
   `PreviewBanner` + `ReviewStatusPanel` (already in `src/components/public/record-status.tsx`) to
   compound records and `/protocols`.
3. Provision Supabase; make `/admin` return 200; record one real human review end to end.
4. Purge demonstration records and the 156 demonstration reviews until `npm run qa:production`
   reports 0 blockers.
5. Make `/search` return the records the site renders.
6. Add `not-found.tsx`, `error.tsx`, `global-error.tsx`, `robots.ts`, `sitemap.ts`.
7. Deploy to Railway with hosted Postgres; migrate; seed; verify.
8. Publish a correction contact on `/corrections`.
9. Lift `noindex` — **last**, deliberately.

### P1 TASKS

Mobile fallback for the compound register (`src/app/(public)/peptides/page.tsx:216`) · "last reviewed:
Not recorded" → a real editorial state · `/quality` hub preview consistency · reconcile six
publications against "five volumes" · derive the home page's "Nothing is published yet." from data ·
rebuild the 12 stale reference sheets · resolve the duplicate receptor learning topics · add the 11
patient figures to `/learn/figures` · reading-mode switch on all public pages.

### TESTING REQUIREMENTS

- `npm run verify` (lint → typecheck → unit → build) must exit 0.
- Integration suite must stay at **405/405** (34 files). Budget ~75 minutes; it does not need the dev server stopped.
- `npm run qa:production` must report **0 blockers** against the production database.
- `npm run readiness` for the record-level view.
- New tests required for: the review-state banner (an unpublished record must never render a
  review assertion), search returning the rendered record set, and the sitemap never listing an
  unpublished slug.
- Existing guarantees that must keep passing: provenance relationships, publish gates, patient-mode
  suppression, core search.

### DEPLOYMENT REQUIREMENTS

Railway project + hosted Postgres · Supabase project with auth redirect URLs · migrations run against
the hosted DB · seed run · `NEXT_PUBLIC_SITE_URL` set · `TIDES_PREVIEW_UNPUBLISHED` **absent** ·
Sentry optional · DNS moved off the GoDaddy parked page · Cloudflare optional per `CLAUDE.md` ·
`output: 'standalone'` already configured.

### ACCEPTANCE CRITERIA

See §21. In short: every public route 200 on the live domain; search finds what the site renders;
no page claims a review that did not happen; `qa:production` clean; unpublished records 404 in
production; no source PDFs or secrets in git.

### KNOWN RISKS

Unreviewed medical content reaching the public via a misconfigured preview flag · publishing on
demonstration approvals · unstyled error pages leaking stack traces · a 75-minute integration suite that will tempt people to skip it · an unreviewed 57-file working tree · 4 moderate npm vulnerabilities.

### FILES / DIRECTORIES LIKELY TO CHANGE

`src/app/(public)/peptides/[slug]/page.tsx` · `src/app/(public)/protocols/page.tsx` ·
`src/app/(public)/search/page.tsx` · `src/app/(public)/quality/page.tsx` ·
`src/components/public/record-status.tsx` · `src/server/search/search-service.ts` ·
`db/migrations/` (new migration only if D1 needs a public review state) · `src/app/not-found.tsx`,
`error.tsx`, `global-error.tsx`, `robots.ts`, `sitemap.ts` (new) · `src/app/layout.tsx` (noindex) ·
`.env` configuration · deployment config (new).

---

## 21. FINAL V1 ACCEPTANCE CHECKLIST

Run against the **live domain**, not localhost. Every box needs evidence, not belief.

### Deployment
- [ ] `https://thetidesindex.com` serves the application, not a parked page
- [ ] HTTPS valid; `www` and apex both resolve correctly
- [ ] All 23 public routes return HTTP 200 (record the list)
- [ ] A nonexistent slug returns a **branded** 404, not an unstyled Next page
- [ ] A forced database error returns a **branded** error page
- [ ] `robots.txt` and `sitemap.xml` exist and are correct
- [ ] `noindex` has been lifted deliberately on public pages (and retained on `/admin`)

### Data integrity — the non-negotiables
- [ ] `npm run qa:production` reports **0 blockers** against the production database
- [ ] Zero demonstration records and zero demonstration reviews in production
- [ ] Every published record has an approved review by a **named human** at its current version
- [ ] `TIDES_PREVIEW_UNPUBLISHED` is **not set** in any hosted environment
- [ ] An unpublished record's URL returns 404 in production (verified by trying one)
- [ ] No page claims a review, source check or verification that did not happen
- [ ] Every record page states its true review state in **both** reading modes **and in print**

### Core product
- [ ] Navigation works on desktop and on a 375px phone
- [ ] Compound records render with claims, evidence classes, citations and references
- [ ] Every citation names the source, the kind of source, and the exact location
- [ ] Every citation links to a source record that exists
- [ ] Source register renders all 197 sources, including the 7 marked unusable, with reasons
- [ ] Searching `BPC-157` returns the **compound record**, not only sources
- [ ] Searching an alias (`TB-500`, `Modified GRF`) and a misspelling (`BPC157`) behaves sensibly
- [ ] Zero-result searches offer a route forward
- [ ] Patient/simple mode shows **no dosing anywhere** (verified on `/peptides/[slug]` and `/protocols`)
- [ ] Reading-mode switch works without JavaScript and survives a reload
- [ ] Protocols display per-source and are never merged across practitioners
- [ ] Preclinical evidence is never presented as human evidence
- [ ] Practitioner statements are never presented as trial conclusions

### Editorial workflow
- [ ] `/admin` requires authentication and returns 200 for a staff user
- [ ] A reviewer can record a review and it appears against the correct record version
- [ ] Publishing through the UI respects every gate; an incomplete record cannot be published
- [ ] One account cannot assemble all four approvals a protocol needs

### Trust surface
- [ ] `/methodology`, `/editorial-policy`, `/coverage`, `/evidence` are accurate as of launch day
- [ ] `/corrections` publishes a working contact and a test correction was received
- [ ] Coverage counts match the database (no hardcoded contradictions)
- [ ] Regulatory statuses are date-stamped
- [ ] "Unknown", "not established" and "conflicting sources" render as valid outputs

### Engineering
- [ ] `npm run verify` exits 0
- [ ] Integration suite still passes 405/405 after all P0 changes — **result recorded, not assumed**
- [ ] Working tree clean; work committed; a tag or release marker exists
- [ ] No source PDFs, private data or secrets in git
- [ ] Database backup taken and a restore tested at least once
- [ ] Error monitoring receives a test event

---

## Explicit UNKNOWN list

1. **Whether the six PDFs currently build.** The last build log predates edits to five of the six
   book files. Builds were not run.
2. **Rendered mobile layout.** Mobile findings are from CSS and markup, not from a 375px browser.
3. **Whether the 12 compound records are editorially *finished*** as opposed to complete-shaped. Every
   page self-reports as unverified; only a human reviewer can answer this.
4. **Licence status per source.** `SOURCE_MANIFEST.json` has no licence field; the proxy is
   `public_fulltext_allowed` (true for only 2 of 197).
5. **Whether "Patient Education Series 01" was renamed, cancelled, or is still planned** (D6).
6. **Whether the 8 unwritten quality topics are blocked only on compendial purchases** or also on
   unwritten copy.
7. **Registrar/DNS ownership details** for `thetidesindex.com` beyond the observed GoDaddy parked page.
8. **Accessibility in practice** — the markup is well-built (skip links, `role="img"`, non-colour
   state encoding), but no screen reader or contrast audit was run.

---

*Audit completed 24 September 2026. No project files were modified. No deployment was made.*
