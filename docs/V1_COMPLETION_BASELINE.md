# THE TIDES INDEX — V1 COMPLETION BASELINE

**Section 1 — reset scope and establish the current baseline.**
Date: 24 September 2026. Read / verify / plan only. **No application code, schema, data, gate,
publication state or configuration was changed. Nothing was committed. Nothing was deployed.**

Two local services were started to perform verification (the PGlite dev database on 5433 and
`next dev` on 3000). Docker was not started.

Evidence labels: **VERIFIED** (observed directly today) · **CODE-READ** (read but not executed) ·
**UNKNOWN**.

---

## 1. CURRENT GIT STATE

| | |
|---|---|
| Branch | `phase-a-foundation` |
| HEAD | **`6b25d95`** — "Apply the Tides Index logo across the site and PDF covers" |
| `main` | `6c597d7` — "Baseline: import The Tides Index handoff package" |
| Ahead of main | **35 commits** |
| Remotes | **none** |
| Tags | **none** |
| Uncommitted | **58 paths — 35 modified, 23 untracked** |

Recent history: `6b25d95` (logo) ← `21c8d09` (publications v2) ← `5c78433` (product experience v1) ←
`2170d53` (foundations) ← `c50907a` (source batch).

**Changed since the 24 Sep audit:** nothing in the tree except that the audit report itself
(`docs/PROJECT_STATE_2026-09-24.md`) is now present as an untracked file, taking 57 paths to 58.
HEAD is unchanged. **VERIFIED.**

---

## 2. UNCOMMITTED WORK CLASSIFICATION

All 58 paths classified. Totals: **KEEP 35 · DEFER 20 · REWORK 2 · DISCARD 1.**

### KEEP — 35 paths (needed for V1 now)

Three clusters plus data.

**Cluster A — evidence counting (must land as one commit or the site will not compile):**

| Path | Status | Load-bearing |
|---|---|---|
| `src/domain/evidence/evidence-counts.ts` | untracked | **YES — hard build dependency** |
| `src/app/(public)/peptides/page.tsx` | modified | yes |
| `src/app/(public)/peptides/[slug]/page.tsx` | modified | yes |
| `src/server/public/queries.ts` | modified | yes |
| `src/components/public/evidence.tsx` | modified | yes |
| `src/components/public/evidence-at-a-glance.tsx` | modified | yes |
| `src/components/public/record-opening.tsx` | modified | yes |
| `tests/support/peptide-page-fixture.ts` | untracked | tests |
| `tests/unit/evidence-counts.test.ts` | untracked | tests |
| `tests/unit/evidence-count-surfaces.test.tsx` | untracked | tests |

`evidence-counts.ts` is untracked but imported by two committed route files. Losing it breaks
`next build` immediately. The change replaces "count statements" with "count distinct sources per
evidence lane" — a truthfulness improvement directly aligned with the owner's decisions.

**Cluster B — protocol comparison (`variation` state):**
`src/domain/protocols/field-comparison.ts` · `src/domain/protocols/protocol-comparison.ts` ·
`src/components/public/protocol-comparison.tsx` · `src/components/public/protocol-library.tsx` ·
`tests/unit/field-comparison.test.ts` · `tests/unit/protocol-comparison-rendering.test.tsx`.

Adds a fifth field state, `variation` (a single source reporting a range), kept distinct from
`difference` (sources disagreeing). This is **exactly** owner decision 3 — per-source, never
averaged — and should be kept.

**Cluster C — data and provenance scripts:**
`SOURCE_MANIFEST.json` (+3 primary BPC-157 preclinical studies, +4 CT.gov registrations) ·
`data/seed/evidence/bpc-157.json` (claims BPC-011…014) · `data/seed/literature/bpc-157-screen.json` ·
`data/seed/learning/where-peptides-come-from.json` (**new learning topic**) ·
`data/seed/learning/peptides-in-the-body.json` (END-14…16) ·
`data/seed/learning/peptide-signalling.json` (SIG-14…17) ·
`data/seed/learning/amino-acids-to-proteins.json` (FND-21) ·
`data/seed/trials/bpc-157-trials.json` (**new trials packet**) ·
`data/sources/registry/NCT02637284|NCT07437547|NCT07752381|NCT07803250.json` ·
`db/seed/seed-data.ts` (registers the two new packets — without it the new data never reaches the
site) · `scripts/evidence/strengthen-bpc-157-2026-09-15.py` ·
`scripts/evidence/build-peptides-101-2026-09-15.py` ·
`scripts/evidence/build-foundations-2026-09-14.py` ·
`tests/unit/bpc-157-evidence-shape.test.ts` · `tests/integration/bpc-157-evidence-shape.test.ts` ·
`tests/unit/source-batch-2026-09-14.test.ts`.

> Note: `build-peptides-101-2026-09-15.py` is named for the deferred patient PDF, but its **only
> outputs are website learning packets**. Do not sweep it into DEFER by its filename.

### REWORK — 2 paths

| Path | Why |
|---|---|
| `src/domain/publications/volumes.ts` | Public volume status reads "Draft for review…", framing review as a pending gate. Under the new policy it should read as a plain "not human reviewed" label. Rendered by `/learn/publications`, so it is load-bearing. |
| `docs/PROJECT_STATE_2026-09-24.md` | My own audit. Its central thesis — "blocked because no human has reviewed anything" — is **superseded by owner decision 1**. Its §5.1 finding (the record page asserts a review that did not happen) remains correct and must survive. Superseded rather than wrong; this document replaces its planning sections. |

### DEFER — 20 paths (PDF / publication / presentation)

Four closed clusters: (a) patient figures — `src/components/illustrations/patient.tsx`,
`src/publishing/illustration-print.tsx`, `tests/unit/illustration-print.test.tsx`,
`scripts/publishing/build-figure-proof.tsx`, `scripts/qa/render-figure-proof.py`, plus the three
export-widening edits to `src/components/illustrations/{biology,method,quality}.tsx`;
(b) `src/domain/protocols/compound-overview.ts` + its test + `src/publishing/protocol-book.tsx`;
(c) `src/publishing/books/peptides-the-essentials.tsx` + `scripts/publishing/build-pdf.ts`;
(d) `src/publishing/books/understanding-peptides.tsx` + `tests/unit/understanding-peptides-patient.test.ts`;
plus `src/publishing/books/science-applications.tsx`,
`docs/PATIENT_SERIES_01_PEPTIDES_101_EVIDENCE_PACKET.md`,
`Documents and Presentations/Tides_Peptides_101_Gamma_Import_v1.md`.

**Three DEFER paths are load-bearing and must NOT be reverted — this is the most important
practical finding in this section:**

1. `src/publishing/books/reference-guide.tsx` and `src/publishing/reference-sheet.tsx` — reverting
   them **fails the website unit suite**. `tests/unit/evidence-count-surfaces.test.tsx` reads both
   files and asserts they import `@/domain/evidence/evidence-counts`.
2. `src/publishing/protocol-book.tsx` — reverting it **breaks `npm run typecheck`**. `tsconfig.json`
   compiles `src/publishing/` even though `next build` never reaches it, and the KEEP change widens
   `FieldState` to five members.

**"Defer" therefore means "do not spend further effort on it", not "revert it".** Reverting the print
tree would break the website build and tests.

### DISCARD — 1 path

`next-env.d.ts` — auto-generated Next.js drift (`.next/types` → `.next/dev/types`), rewritten by
`next dev`. Not authored work.

### Schema

**No uncommitted file touches `db/migrations/` or `db/schema/`.** The only `db/` change is
`db/seed/seed-data.ts`. **VERIFIED.**

---

## 3. CURRENT DATA COUNTS

Queried live against the local database today. **VERIFIED.**

| Entity | Count |
|---|---|
| Compounds (peptides) | **13** — 12 real + 1 demonstration |
| Sources | **199** (197 in the public view) |
| Claims | **380** |
| Claim-evidence links | **534** |
| Source locations | **562** |
| Protocols | **86** |
| Clinical trials | **9** |
| Evidence gaps | **170** |
| Learning topics | **10** |
| Quality topics | **22** — 21 real + 1 demonstration (13 written) |
| Editorial syntheses | **6** |
| Peptide routes | **43** |
| Verification issues | **22** |
| Literature screen records | **1,768** |
| Reviews | **156** — all by a demonstration reviewer |
| Search documents | **201** |

**Publication state:** peptides `unpublished=12, published=1` · claims `unpublished=376, published=4` ·
protocols `unpublished=84, published=2` · quality topics `unpublished=21, published=1` · learning
topics `unpublished=10` · syntheses `unpublished=6`. **Every published row is demonstration data.**

**Review state:** peptides `unreviewed=12` · claims `unreviewed=376` · protocols `unreviewed=84` ·
quality topics `unreviewed=21`. No real record carries any review.

**Public views:** `public_v_peptides` **0** · `public_v_claims` **0** · `public_v_quality_topics`
**0** · `public_v_learning_topics` **0** · `public_v_editorial_syntheses` **0** ·
`public_v_evidence_gaps` **0** · `public_v_clinical_trials` **0** · `public_v_sources` **197** ·
`public_v_search_documents` **197** · `public_v_peptide_register` **12** ·
`public_v_protocol_simple` **2** · `public_v_protocol_practitioner` **2**.

> **New defect found today, not in the audit.** The two protocol views return **2 rows — both
> demonstration protocols** (`DEMO-PR-A`, `DEMO-PR-B`). `protocols` has no `is_demonstration` column
> (only `certificates`, `peptides`, `profiles`, `quality_topics`, `sources` do), and the protocol
> views do not join to the parent peptide to exclude it. **Demonstration dosing is publicly visible
> through those two views right now.** It matters more under the new policy, because protocols are
> the surface being opened up. **VERIFIED.**

### Per-compound depth

| Compound | Claims | Protocols | Gaps | Routes | Distinct sources |
|---|---|---|---|---|---|
| Retatrutide | 15 | 6 | 14 | 1 | 18 |
| BPC-157 | 14 | 8 | 17 | 3 | 10 |
| Tesamorelin | 13 | 3 | 8 | 1 | 3 |
| GHK-Cu | 10 | 10 | 7 | 5 | 13 |
| Selank | 8 | 7 | 7 | 2 | 11 |
| Semax | 8 | 8 | 6 | 3 | 13 |
| Thymosin beta-4 | 8 | 7 | 9 | 4 | 11 |
| CJC-1295 | 7 | 7 | 6 | 2 | 9 |
| Ipamorelin | 7 | 9 | 6 | 3 | 10 |
| MOTS-c | 7 | 8 | 6 | 3 | 12 |
| TB-500 | 5 | 4 | 8 | 3 | 5 |
| Modified GRF (1-29) | 4 | 7 | 5 | 1 | 5 |

---

## 4. CURRENT PUBLICATION / REVIEW ARCHITECTURE

### Publication states

`publication_state_value` = `unpublished | published | withdrawn | superseded`. There is **no
"public draft" state**. **CODE-READ.**

`review_state` (a separate column) = `unreviewed → captured → source_checked →
primary_source_checked → ready_for_scientific_review → scientific_reviewed → clinical_reviewed →
compliance_reviewed`, plus `rejected`.

**The two concepts already exist as two separate columns.** The problem is not the data model. It is
that the write path couples them.

### The coupling — exactly three layers, all in the WRITE path

**Layer 1 — `tides_enforce_state_coherence()` (migration 0002), a trigger on every publishable
table:**

```
IF (entering published) AND NEW.review_state IN ('unreviewed','captured','rejected') THEN
  RAISE EXCEPTION 'Cannot publish: verification state is %, so no approved review exists…'
```

All 12 compounds and all 376 claims are `unreviewed`, so **this alone blocks every publish.**

**Layer 2 — seven `tides_*_publish_gate()` functions.** Each interleaves two different kinds of
condition. Using the claim gate as the example:

| Condition | Kind |
|---|---|
| `tides_claim_provenance_ok(id)` — an evidence link to an exact location in a **citable** source | **provenance** |
| `interpretation_notes` present | **content** |
| `uncertainty_text` present when importance is high/critical | **content** |
| `tides_has_approved_review(… 'source_check')` | **human review** |
| `tides_has_approved_review(… 'scientific')` | **human review** |
| `tides_has_approved_review(… 'compliance')` for high/critical | **human review** |

Peptide gate: `simple_summary` + `unknowns_summary` present (content), then `scientific` +
`compliance` approved reviews (human review). Protocol gate requires all four review types.

`tides_has_approved_review` requires `outcome='approved' AND performed_by='human' AND
reviewer_user_id IS NOT NULL` — automation can never satisfy it, by design.

**Layer 3 — `src/domain/publishing/gates.ts`**, a pure-function mirror of the database rules, used by
the editorial UI to explain what is missing. Its own docstring states the two must agree, and both
`tests/unit/publish-gates.test.ts` and `tests/integration/publish-gates.test.ts` enforce that.

**Layer 4 (subtle, and dangerous under the new policy):** both the coherence trigger and every publish
gate execute `NEW.last_reviewed_at := coalesce(NEW.last_reviewed_at, now())` on publish. Under the
new policy that would **stamp a review date onto records nobody has reviewed**, and the site displays
that field. **VERIFIED by reading migration 0002.**

### What is NOT coupled — the good news

**Every one of the 45 `public_v_*` views gates on `publication_state = 'published'` (plus
`NOT is_demonstration`). Not one of them references `review_state`.** **VERIFIED.**

Likewise the search index: `tides_reindex_peptide/_quality_topic` delete the row unless
`publication_state = 'published'`, and never consult review state. The triggers fire on any update to
`peptides`, `claims`, `peptide_routes`, `quality_topics`, `sources`.

**Proof the pipeline works end-to-end:** the demonstration compound is published, and it **is** in
`search_documents` as an indexed `peptide`. Publishing a record makes it searchable with **zero code
changes**.

**Precedent already in the codebase:** `public_v_peptide_register` and `public_v_quality_register`
expose *all* records together with `is_published`, `has_published_record` and `review_state` flags —
they publish the record's state instead of hiding the record. That is precisely the pattern owner
decision 1 asks for, already built and already public.

### Preview behaviour

`previewAllowed(env) = env.nodeEnv !== 'production' && env.flag === '1'`. Two independent conditions.
Everything visible locally today comes through this path. It is refused in any production build.
**CODE-READ + VERIFIED live.**

### Patient / practitioner separation

Enforced at the data boundary via two distinct views (`public_v_protocol_simple` vs
`public_v_protocol_practitioner`) and a mode-parameterised query, not by hiding fields in the view
layer. `ModeSwitch` is a server-action form, so the practitioner payload is never sent to a
simple-mode reader. **It is completely independent of review state and needs no change.**

**Verified live today on `/protocols?peptide=bpc-157`:**

| Mode | Dose figures rendered |
|---|---|
| Practitioner | **Yes** — 250 mcg, 300–500 mcg, 300–600 mcg, 500 mcg, 2 mg, 10 mg, 20 mg |
| Simple | **None**, plus the explicit line "Amounts, frequency and duration are not shown in this version." |

The practitioner page already carries the framing decision 3 requires: *"The Tides Index issues no
dose"*, *"Source-reported regimens are reproduced as each named source stated them, and are not
recommendations"*, and per-source attribution with no averaging. **Owner decision 3 is already
satisfied by the current implementation.** Nothing needs building and nothing needs weakening — the
records simply need to be published.

---

## 5. REQUIRED PUBLIC-VS-REVIEWED SEPARATION

### The decisive measurement

I measured every non-review gate condition against the live corpus. **VERIFIED:**

| Gate condition (excluding human review) | Result |
|---|---|
| Claims with provenance resolving to an exact location in a citable source | **380 / 380** |
| Claims with `interpretation_notes` present | **380 / 380** |
| High/critical claims missing `uncertainty_text` | **0** |
| Claims passing **all** non-review conditions | **380 / 380** |
| Compounds with `simple_summary` + `unknowns_summary` + `practitioner_summary` | **12 / 12** |
| Protocols passing `tides_protocol_provenance_ok` | **86 / 86** |
| Quality topics with a written summary | 13 / 21 (the other 8 are deliberately unwritten) |

**Nothing in the corpus fails a provenance or completeness requirement. The human-review requirement
is the only thing standing between the present database and a fully public site.** No data
remediation is needed.

### What must change

**Change 1 — relax the coherence trigger.** In `tides_enforce_state_coherence`, remove the exception
that refuses publication when `review_state IN ('unreviewed','captured','rejected')`. **Keep the
`rejected` protection** — a rejected record must still never be public. So the condition narrows from
three states to one.

**Change 2 — split each publish gate.** In all seven `tides_*_publish_gate` functions, keep every
provenance and content condition exactly as it is, and remove only the `tides_has_approved_review(…)`
conditions. The gate then answers "is this record honestly sourced and complete?" — which is the
right question for public visibility. Do this in a **new forward migration**; do not edit 0002.

**Change 3 — stop manufacturing a review date.** Remove `last_reviewed_at := coalesce(…, now())` from
the publish path. `last_reviewed_at` must be written only when a human review is actually recorded.
Without this, publishing would make every record claim it was reviewed today — the precise failure
the owner forbids.

**Change 4 — mirror the split in `gates.ts`** and update both publish-gate test suites. Add a test
asserting a record with `review_state = 'unreviewed'` **can** be published, and that a `rejected`
record still cannot.

**Change 5 — surface review state on every public record.** `src/components/public/record-status.tsx`
already names all seven rungs in plain words and leads the unreviewed case with what has *not*
happened. It is currently used on only two pages. Extend it to compound records, protocols and
learning topics.

**Change 6 — remove the false claim first.** `src/app/(public)/peptides/[slug]/page.tsx:798` prints
*"Nothing appears on it that has not passed source checking and scientific review."* **This must be
corrected before anything is published**, not after. Publishing while that sentence stands converts a
preview-only inaccuracy into a public false statement.

**Change 7 — close the demonstration-protocol leak** (§3) before protocols go public, either by
removing demonstration data entirely (which `qa:production` demands anyway) or by excluding it in the
two protocol views.

### What must NOT change

- The `reviews` table, `revisions`, `corrections`, `review_clocks`, the five review types, the role
  model and `reviewTypesForRole()` — **all preserved**. Review history is untouched.
- `tides_has_approved_review` — keep the function. It stops being a publication gate and becomes the
  basis for the displayed assurance level.
- The 45 public views and the search index — **no changes required**. They already key on
  publication only.
- Patient-mode dose suppression — untouched.
- The preview gate — keep it. It remains the safety net for anything still unpublished.

### Why this is safe

The two concepts remain two columns with one meaning each: `publication_state` = *is it visible*;
`review_state` = *what assurance does it carry*. Nothing is deleted, no review is fabricated, and a
genuinely reviewed record stays distinguishable the moment real review begins — it simply climbs the
existing ladder. No enum change and no new state are needed.

---

## 6. WEBSITE BLOCKERS — VERIFIED CURRENT STATE

All re-verified today against the running site and current code.

| # | Blocker | Status | Evidence |
|---|---|---|---|
| 1 | False reviewed-language on compound records | **CONFIRMED** | `/peptides/bpc-157` still prints "Nothing appears on it that has not passed source checking and scientific review". Zero review/preview banners on the page in either mode. **Now higher priority**: publication turns it public. |
| 2 | Protocols review-state wording | **CONFIRMED — but narrower than the audit implied** | The page already carries excellent dose framing ("The Tides Index issues no dose", per-source attribution, never averaged). What is missing is only a **review-state** statement. |
| 3 | Search cannot find compound records | **CONFIRMED — root cause changes** | `/search?q=BPC-157` → 12 results, no `/peptides/…` links. Cause is publication gating, so **decision 1 fixes this automatically**; the demonstration compound proves publication→index works. |
| 4 | Admin / Supabase | **CONFIRMED — but DEMOTED** | `/admin` still HTTP 500 (no Supabase keys). Under decision 1 it is **no longer on the launch critical path**, because publishing no longer requires recorded reviews. Still required for editorial work and for real review later. |
| 5 | Error / not-found boundaries | **CONFIRMED** | No `not-found.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx` anywhere in `src/app`. A bogus slug returns 404 via Next's unstyled default. |
| 6 | Quality hub inconsistency | **NO LONGER RELEVANT — my audit was wrong** | The hub links **14** topics including `/quality/hplc-purity`. `listQualityRegister()` reads `public_v_quality_register`, which is a **register view carrying `is_published` and `review_state` flags and is not publication-gated**. There is no contradiction. I am correcting §5.7 of the audit. |
| 7 | Mobile compound register | **CONFIRMED** | `peptides/page.tsx:217` — `min-w-[64rem]` table inside a bare `overflow-x-auto` (line 216). |
| 8 | Corrections contact | **CONFIRMED** | The page states: "…contact route is live, corrections cannot be submitted through the site." |
| 9 | sitemap / robots / noindex | **CONFIRMED** | `/robots.txt` → 404, `/sitemap.xml` → 404, and `<meta name="robots" content="noindex, nofollow">` on the home page. |
| 10 | Deployment | **CONFIRMED** | No `railway.json`, `railway.toml`, `Dockerfile`, `Procfile` or `nixpacks.toml`. No git remote. Domain serves a GoDaddy parked page. |

**Also changed since the audit:** the integration suite completed — **34 files, 405 tests, all
passed**, in 4,483s (~75 min), with the dev server running. The audit recorded this as UNKNOWN.

**Environment correction:** the audit reported Node 22.20. The node on PATH in this session is
**v24.19.0**; `package.json` requires `>=22.0.0`. Both satisfy the engine constraint.

---

## 7. CURRENT 12 COMPOUNDS

`bpc-157` · `thymosin-beta-4` · `tb-500` · `ghk-cu` · `cjc-1295` · `mod-grf-1-29` · `ipamorelin` ·
`tesamorelin` · `mots-c` · `semax` · `selank` · `retatrutide`. Depth per compound is tabled in §3.

All 12 are `unpublished` / `unreviewed`, all 12 have complete summaries in both reading modes plus an
unknowns summary, and all 12 pass every non-review publish condition. `npm run readiness` reports
**12 of 12 mechanically ready**. `mod-grf-1-29` is deliberately kept separate from `cjc-1295`
(decision D-12). Two compounds (`mod-grf-1-29`, `tesamorelin`) still show "No literature screen yet".

---

## 8. ADDITIONAL COMPOUNDS FOUND IN EXISTING MATERIAL

**Reconnaissance only. No compound was created, and nothing below is inferred from pharmacology
knowledge — every name appears literally in a project file.**

### Where the "~30 compounds" actually lives

The two root spreadsheets — `Peptide_Education_Evidence_Master_v1.xlsx` and
`Tides_Index_Master_Evidence_v1.xlsx` (byte-identical, MD5 `6ad337a7592509f4b074a6d42ae2832f`) —
contain a **"Peptide Index" sheet with 43 numbered rows, P-001…P-043**. Eleven correspond to existing
records. **43 − 11 = 32 compounds listed but not built.** That is the "roughly 30". The workbook has
7 sheets (Dashboard, Source Registry, Peptide Index, Protocol Index, Quality Map, Verification Queue,
Publishing Map) and **no importer exists**.

**Critical caveat:** in that sheet "Seeded" means *listed*, not *evidenced*. The Seeds / LaValle /
Hack Smith / Campbell columns are a manual Yes/No/**Possible** crosswalk.

### The real asset is the LaValle handbook

SRC-002's full table of contents (recovered from `data/private/source-audit.json`) names **30
monographs**: AOD 9604 · ARA-290 · BPC-157 · CJC-1295+Ipamorelin · Dihexa · DSIP · Epitalon ·
FOX-04 DRI · GHK-Cu · Kisspeptin · KPV · LL-37 · Larazotide · Melanotan II · MGF · MOTS-c · PNC-27 ·
PT-141 · Selank · Semax · Semaglutide · Sermorelin · Tesamorelin · Thymosin alpha-1 ·
Thymosin beta-4 · Thymulin · VIP · Peptide Bioregulators, plus a protocol section (pp. 175–195).

SRC-004 (Campbell cheat sheet, all 10 pages captured) adds five names absent from the Peptide Index:
Oxytocin, NAD+, L-Carnitine, Follistatin 344, "Thyamlin" (probably Thymulin).

### Tiers — 40 candidates

**TIER 1 — substantial held material (6):** **Semaglutide**, **Tirzepatide**, **LL-37**,
**Thymosin alpha-1**, **Liraglutide**, **VIP**.
LL-37 is the strongest: **two registered manifest sources (SRC-153, SRC-154) held as full private
snapshots where it is a central subject**, plus a LaValle monograph. Semaglutide/Tirzepatide/
Liraglutide are already cited comparatively inside the retatrutide record and appear in its
literature screen — but every screened record was retrieved by a *retatrutide* query, so each would
still need its own screen.

**TIER 2 — some material (25).** With a LaValle monograph: AOD-9604, ARA-290, Dihexa, DSIP, Epitalon,
FOXO4-DRI, Kisspeptin, KPV, Larazotide, Melanotan II, MGF, PNC-27, PT-141, Sermorelin, Thymulin.
With registered manifest sources but no monograph: GHRP-6, GHRP-2, Hexarelin (SRC-072, SRC-084 —
anti-doping analytical papers). Cheat-sheet/handbook protocol rows only: Cagrilintide, IGF-1 LR3,
SS-31, 5-Amino-1MQ, MK-677, Melanotan I, Cerebrolysin.

> MK-677 and 5-Amino-1MQ carry an existing owner decision: `compound_types.is_peptide` exists
> precisely so these small molecules are not presented as peptides. Whether to carry them at all is
> still open.

**TIER 3 — name only (9):** FGL(L), Oxytocin, Follistatin 344, NAD+, L-Carnitine, Thymalin,
Dulaglutide (a comparator arm), Bepecin (a BPC-157 product), TB1000 (an alias the record already says
is unestablished).

### The honest judgement, and why it is the owner's call

Read as *scientific* evidence, this material is thinner than "30 compounds" implies: no non-core
compound has a literature screen, a dedicated trial snapshot or a compound-specific source folder.

**But that is not the only legitimate reading.** Under owner decision 3, practitioner material is a
first-class, attributed layer — and the existing 12 already rest heavily on it (**58 of 84 protocols
are practitioner-sourced**; LaValle alone supplies 36 page-level locators and 13 protocols). A record
built from a held LaValle monograph, cited to an exact page, classed `reference_opinion`, labelled
"LaValle describes…" and carrying its evidence gaps honestly is **exactly what this platform was
designed to publish**.

So the realistic expansion is: **~20–27 compounds are buildable as attributed practitioner-reference
records**, of which **6 could carry a genuine mixed evidence base**. What they cannot be is twelve
more records that look like the retatrutide or BPC-157 record. That trade — breadth of coverage
versus depth per record — is a product decision, and Section 2 should put it to the owner before any
record is built.

---

## 9. TREMBLAY PLACEHOLDER STATUS

**Unchanged. Registered, empty, and correctly handled. VERIFIED.**

| Field | Value |
|---|---|
| Key | **SRC-016** |
| Title | Tremblay / CanLab Source Dossier |
| Authors | Jean-François Tremblay / CanLab archive |
| Source type | `expert_interview` (the only one in the register) |
| Access status | `unavailable` |
| QC status | `pending` |
| Year / filename / canonical filename | **null / null / null** |
| Priority | supporting |
| Integrity notes | "Not yet captured. No file held." |
| Access notes | "No artefact has been located… until an exact recording or document with a date and timestamp is held, there is nothing to cite and nothing to verify." |

SRC-016 appears **nowhere** in `data/seed/**` — zero source locations, zero claims, zero protocols.
Owner decision **D-06** records the standing resolution: "Remains unavailable… nothing is attributed
to it."

The schema is already ready for it: `source_locations` carries `timestampStartSeconds` /
`timestampEndSeconds` for exactly this kind of recorded interview source. **When the owner supplies
the archive, ingestion needs no schema change.** Nothing was fabricated or researched around it.

---

## 10. WORK THAT IS DEFERRED

Per owner decision 6, deferred until the website is online:

- All PDF and book work — six volumes, twelve reference sheets (stale since 14 Sep), the figure-proof
  pipeline, `peptides-the-essentials.tsx`, the Volume One patient rewrite, chapter six.
- All presentation work — the Gamma deck brief, and the brand conflict it contains (it specifies a
  different palette and "never use serif fonts" against a serif-led identity).
- The 11 patient figures and the web→PDF illustration converter.
- `docs/PATIENT_SERIES_01_PEPTIDES_101_EVIDENCE_PACKET.md` and the unresolved question of whether
  "Patient Education Series 01" still exists as a publication.
- Publication-page reconciliation (six publications exist, `/learn/publications` says five).

**Deferred does not mean reverted** — see §2. Three print files are load-bearing for typecheck and
tests and must stay.

Also deferred beyond V1: Talk to Tides, LLM/chat, semantic/vector search, ecommerce, vendor rankings,
affiliate functionality — none of which exist in the codebase at all (zero AI dependencies, no
pgvector). **VERIFIED.**

---

## 11. RISKS

### High

1. **Publishing makes 380 claims, 86 protocols and 12 compounds public at once.** Every one must
   carry an accurate state label at the moment of publication. The false sentence at
   `peptides/[slug]:798` must be fixed **before**, not after. This is the single highest risk in the
   whole plan.
2. **`last_reviewed_at` auto-stamping** would manufacture a review date on every published record and
   display it. It must be removed in the same migration that relaxes the gates.
3. **Demonstration data is already leaking** into `public_v_protocol_simple` /
   `public_v_protocol_practitioner`, and `qa:production` reports 3 blockers (8 demonstration records,
   156 demonstration reviews, 1 test fixture). Publishing on top of that database would put
   demonstration dosing next to real dosing.
4. **Practitioner dosing becomes public.** The implementation is already correct and well-framed, but
   this is the surface where an error carries real-world consequences. It deserves explicit QA of its
   own, in both modes.

### Medium

5. **Two locked decisions now conflict with the new direction.** `docs/LOCKED_DECISIONS.md` #13
   ("Initial public cohort: 10 seed compounds") and #20 ("No autonomous AI publishing"). #20 is not
   violated — the owner is authorising publication, which is not autonomous AI publishing — but the
   locked record should be updated so the project's own decision history stays coherent. There are
   also 26 entries in `OWNER_DECISIONS_REQUIRED.md`, several of which assume review-before-public.
6. **Library expansion on practitioner sources** (§8). Defensible under decision 3, but 25 records
   each resting on a single handbook page will read as thin beside the existing 12 unless the
   difference is stated on the record itself.
7. **No deployment exists at all** — no config, no remote, no hosted database, no backup procedure.
8. **The integration suite takes ~75 minutes.** It passes, but it will not survive as a pre-merge
   gate, and it will be skipped under time pressure.
9. **Admin is still broken** (HTTP 500). Demoted from critical path, but until Supabase is
   provisioned no human review can ever be recorded, so the "review as a future quality layer"
   half of decision 1 cannot start.

### Low

10. `npm run verify` still fails at the lint step (1 error in `tests/unit/illustration-print.test.tsx`
    — a DEFER-cluster file, so the fix is trivial but must not be forgotten).
11. 4 moderate npm vulnerabilities, untriaged.
12. Node v24.19.0 locally against `engines: >=22.0.0` — satisfied, but the audit's "22.20" was the
    previous shell.

---

## 12. RECOMMENDED SECTION-2 IMPLEMENTATION ORDER

Ordered so that nothing false is ever public, and so each step is verifiable before the next.

1. **Truth-in-labelling first — before any publication.** Remove the false review assertion on
   compound records; extend `record-status.tsx` to compound records, protocols and learning topics;
   rework `volumes.ts` status copy. Add a test asserting no public record can render a review claim
   while `review_state = 'unreviewed'`.
2. **Land the KEEP cluster and get the tree green.** Commit clusters A–C as coherent commits, fix the
   lint error, `npm run verify` to exit 0. Do not revert the three load-bearing print files.
3. **Clean the database.** Remove demonstration records and the 156 demonstration reviews; close the
   protocol-view leak; `npm run qa:production` must report 0 blockers.
4. **Write the separation migration.** New forward migration implementing changes 1–3 of §5; mirror
   in `gates.ts`; update both publish-gate suites, including a test that an `unreviewed` record can
   publish and a `rejected` one cannot.
5. **Publish the existing library** — 12 compounds, 13 quality topics, 10 learning topics, their
   claims and protocols — through the real (now provenance-only) gates.
6. **Verify the site lights up with no further code change.** Public views non-zero; `/search?q=BPC-157`
   returns the compound; `/peptides/bpc-157` renders without the preview path; simple mode still shows
   no dose; practitioner mode shows attributed doses.
7. **Website completion**: `not-found.tsx`, `error.tsx`, `global-error.tsx`, `robots.ts`, `sitemap.ts`
   (published records only), mobile register fallback, corrections contact.
8. **Then** library expansion — put the §8 breadth-vs-depth question to the owner, start with Tier 1,
   and build each new record to the same standard as the existing 12.
9. **Then** Supabase provisioning and deployment, then QA, then launch.
10. **Only after launch**, return to PDFs and presentations.

Steps 1–6 are the heart of Section 2 and are achievable quickly, because §5 shows no data remediation
is required.

---

# OWNER SUMMARY

### CURRENT REAL STATE

The website is built and works; the corpus is complete and honestly sourced; nothing is public. HEAD
is `6b25d95` on `phase-a-foundation`, 35 commits ahead of `main`, with 58 uncommitted paths and no
git remote. 380 claims, 86 protocols, 12 compounds, 199 sources, 13 written quality topics and 10
learning topics sit in the database, all `unpublished` and all `unreviewed`. Every public content view
returns 0. Nothing is deployed and the domain serves a parked page.

**The one number that matters: 380 of 380 claims, 12 of 12 compounds and 86 of 86 protocols already
pass every publication requirement except human review.** No data work is needed to launch.

### WHAT CHANGED SINCE THE AUDIT

- **The integration suite finished: 34 files, 405 tests, all passed** (~75 min). The audit left this
  unknown.
- **I was wrong about the quality hub.** It links its written topics correctly via a register view
  that was already designed to expose unpublished records with state flags. Audit §5.7 is withdrawn.
- **A new defect found:** the two public protocol views leak the 2 demonstration protocols, because
  `protocols` has no `is_demonstration` column. This matters more now that protocols are going public.
- **Your decisions demote the biggest audit blocker.** Supabase/admin was the critical path only
  because publishing required recorded human reviews. It no longer does.
- **Decision 3 needs no work.** Practitioner mode already renders attributed, per-source, never-averaged
  doses; simple mode already renders none and says so. I verified both live today.

### WHAT WE KEEP

35 of the 58 uncommitted paths — the evidence-counting cluster (whose untracked
`evidence-counts.ts` is a hard build dependency), the protocol `variation` work (which is decision 3
expressed in code), and all new data: the BPC-157 strengthening, the new trials packet, four trial
registry snapshots and a new learning topic. The entire review system is kept — reviews, history,
roles, and the `tides_has_approved_review` function. Review stops being a gate and becomes a
displayed quality layer.

### WHAT WE DEFER

20 paths of PDF, book, figure and presentation work, plus the Gamma deck and its brand conflict.
**Important: deferred means "stop spending effort", not "revert"** — three print files are load-bearing
for `npm run typecheck` and the website test suite and must stay in place.

### WHAT SECTION 2 SHOULD DO

Fix the labelling before publishing anything — the compound record still prints "Nothing appears on it
that has not passed source checking and scientific review", and publishing while that stands would
turn a preview-only inaccuracy into a public false statement. Then land the KEEP work green, clean the
demonstration data, and write one forward migration that removes the human-review conditions from the
publish gates, narrows the coherence trigger to `rejected` only, and stops auto-stamping
`last_reviewed_at`. Then publish the existing library.

Search, the public views and the compound pages should then light up **with no further code change** —
they already key on publication alone, never on review. The demonstration compound proves it: it is
published, and it is indexed.

**One question I could not answer by inspection, and it belongs to you.** The "~30 compounds" is a
43-row planning spreadsheet plus five practitioner handbooks — not 30 evidence bases. Six candidates
(Semaglutide, Tirzepatide, LL-37, Thymosin alpha-1, Liraglutide, VIP) could carry a real mixed evidence
base. Another ~20 could become honest, attributed practitioner-reference records — legitimate under
your decision 3, and the same kind of material the existing 12 already lean on — but they would be
visibly thinner than a BPC-157 or retatrutide record. Breadth or depth is a product call, and Section 2
should ask it before building anything.

---

*Section 1 complete. No application code, schema, data, publication state or configuration was
changed. Nothing was committed, published, ingested or deployed. Stopping here for your review.*
