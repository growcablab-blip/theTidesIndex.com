# IMPLEMENTATION RECORD

A running log of what was built, what was decided, and what deviates from the
handoff specification. Append; do not rewrite history.

---

## Phase A — Foundation

### A.0 Repository normalisation

- Flattened `The_Tides_Index_Claude_Code_Handoff_v1/` into the project root
  documented in `docs/LOCKED_DECISIONS.md` #3. Nothing was lost; the duplicate
  master spreadsheet at the outer root (`Peptide_Education_Evidence_Master_v1.xlsx`)
  is byte-identical to `Tides_Index_Master_Evidence_v1.xlsx` and both remain.
- Initialised git. Baseline commit captures the handoff exactly as received, so
  every subsequent change is reviewable as a diff against the specification.
- Hardened `.gitignore`: nothing under `sources/` is committable except
  `README.md`. The previous pattern only covered `*.pdf`, `*.epub` and `*.docx`.
- Removed the `app/` placeholder directory. The App Router lives at `src/app`;
  Next.js treats a root `app/` and a `src/app/` as a conflict.

### A.1 Application toolchain

Next.js 16 (App Router) · React 19 · TypeScript 6 strict · Tailwind v4 ·
ESLint 9 flat config with type-aware rules · Vitest 5 · Drizzle ORM.

Strictness beyond `strict: true`: `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`,
`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`,
`erasableSyntaxOnly`.

Version decisions that are not "latest":

| Package | Chosen | Latest | Reason |
|---|---|---|---|
| TypeScript | 6.0.3 | 7.0.2 | `typescript-eslint` requires `<6.1.0`. Type-aware linting is worth more than compiler recency. |
| ESLint | 9.39.5 | 10.10.0 | `eslint-config-next@16` is not compatible with ESLint 10 (`scopeManager.addGlobals is not a function`). |

Revisit both when the ecosystem catches up.

### A.2 Stack deviation: Drizzle ORM

**Changed from the implied approach** (hand-written SQL plus untyped
`supabase-js` queries) **to Drizzle ORM with `drizzle-kit` generating the
migrations.** Everything in `docs/LOCKED_DECISIONS.md` #16 is unchanged —
Next.js, TypeScript, Supabase/Postgres, Railway.

Reason: with hand-written SQL as the source of truth, TypeScript types are
either hand-maintained — and drift, which in a provenance schema means a
silently dropped `source_location_id` — or generated from a live hosted
project, which does not exist yet and would block all local work. Drizzle keeps
migrations as versioned, reviewable, hand-editable `.sql` files, derives types
automatically, and lets the **real migration SQL** run against an in-process
Postgres in tests.

Cost: schema authorship moves to TypeScript (`db/schema/*.ts`). Row-level
security, views and triggers are still hand-written SQL. Migrations stay plain
`.sql` on disk, so abandoning Drizzle later costs only the type layer.

### A.3 Schema deviations from `CONTENT_SCHEMA.md`

| Change | Reason |
|---|---|
| One `workflow_status` on evidence entities, instead of both `verification_status` and `publication_status` | Two independently-writable status columns can disagree (`publication_status='published'` while `verification_status='rejected'`). Public visibility is now derived, never separately set. `publication_status` is retained on `publications`, where a document lifecycle genuinely is a separate dimension. |
| Status vocabulary follows `EVIDENCE_MODEL.md` §3, not `CLAUDE.md` | The two documents list different names for the same ladder. `EVIDENCE_MODEL.md` is the superset and includes the scientific-review gate that `docs/REVIEW_WORKFLOW.md` requires. |
| `source_type` and `evidence_type` are foreign keys to reference tables, not free text | A typo cannot invent a new evidence class; public display labels have somewhere to live; and `evidence_class` / `is_human_evidence` make "filter human vs preclinical vs practitioner" a query rather than a hard-coded list. |
| `sources.is_citable` is a generated column | Citability follows from QC status and cannot drift. The publish gates read it. |
| `alias_type` includes `related_but_distinct` | Verification issue V-001. The TB-500 / Thymosin beta-4 relationship must be recordable without asserting identity. |
| `compound_types.is_peptide` | The master index contains MK-677 and 5-Amino-1MQ, which are small molecules. The platform must not present them as peptides. |
| Added `claims.uncertainty_text` | Required before a high-impact claim can publish. |
| Added `claims.is_editorial_non_evidentiary` | The exemption `ACCEPTANCE_TESTS.md` A.1 requires for site copy that makes no evidentiary assertion. |
| Added `protocols.amount_min_numeric` / `amount_max_numeric` | Filtering and comparison only. `amount_reported` text stays canonical for display; the source's own wording is never recalculated. |
| Added `corrections` | `MASTER_BUILD_SPEC.md` §19 requires a public corrections log; no entity was specified. |
| Added `publication_claims` | Makes "generated from reviewed records" auditable, and lets a corrected claim flag every dependent publication. |
| Added `disagreements` / `disagreement_positions` | `EDITORIAL_POLICY.md` forbids averaging away a disagreement; it needed somewhere to live as a displayable record. |
| Added `review_clocks` | The staleness cadences in `docs/REVIEW_WORKFLOW.md` had no field. |
| Added `verification_issues` | The spreadsheet's Verification Queue. What has not been checked is part of the evidence record. |
| Added `search_documents` | Search was specified behaviourally with no schema. |

### A.4 Enforcement in the database

`db/migrations/0002_audit_and_publish_gates.sql`

Publish gates are triggers, not application code, because the guarantee must
hold for every writer — the web app, a seeding script, a future import job, or
an editor at a SQL console.

- **Claims** require an evidence link to an exact location in a citable source,
  recorded interpretation, an approved source check and an approved scientific
  review. High and critical claims additionally require stated uncertainty and
  an approved compliance review. Editorial non-evidentiary copy is exempt from
  provenance but not from review.
- **Protocols** require citable provenance with a locator, a population or
  model, a route, regulatory framing, and four approvals (source check,
  scientific, clinical, compliance).
- **Peptides** require a plain-language summary, an `unknowns_summary`, and
  scientific plus compliance approval. A page that cannot say what is unknown
  is not ready to be read.
- **Quality topics** require both `what_it_proves` and `what_it_does_not_prove`.
- **Peptide-route records** require a locator, a citable source and a population.
- **Regulatory statuses** require an authority source, a `checked_at` that is not
  in the future, and compliance approval.

Two propagation rules:

- Deleting the last evidence link under a published claim demotes it to
  `needs_update`, so it leaves the public site immediately rather than standing
  with nothing behind it.
- When a source stops being citable, every published record resting on it is
  demoted. Quality state propagates.

An approved review counts only when it names a human reviewer **and** was
recorded against the record's current version. Any material edit bumps the
version, which strands prior approvals — review does not survive rewriting.
This is the mechanism behind `docs/LOCKED_DECISIONS.md` #20.

### A.5 Access control and the public surface

`db/migrations/0003_security_and_public_views.sql`

- The `anon` role holds **no privilege on any base table**. Public reads go
  exclusively through `public_v_*` views. Row-level security filters rows; some
  of what must never be public is a *column* — `claim_evidence.extracted_text_private`
  holds verbatim text from copyrighted books, kept only so a reviewer can
  confirm a reading.
- Staff reach base tables through their own JWT, so role policies are enforced
  by the database rather than by whichever code path made the query.
- A reviewer may only record the kind of review their role performs, and only in
  their own name. One account cannot manufacture the full set of approvals a
  protocol needs.
- RLS is `ENABLE`d but not `FORCE`d: forcing would subject the table owner to
  the same policies and break the `SECURITY DEFINER` audit and cascade triggers.
  Application roles are not table owners, so their access is unchanged.

**`public_v_protocol_simple` has no dosing columns.** No amount, unit,
frequency, timing, duration, cycle or titration — and no `monitoring_text`,
`contraindications_text` or `safety_notes`, because that prose routinely carries
embedded numbers. Their existence is signalled by `has_monitoring_guidance` and
`has_safety_guidance` so the interface can say guidance exists and point the
reader at a clinician. Patient mode is structurally incapable of receiving a
dose; it is not a conditional in a component.

### A.6 Search

`db/migrations/0004_search_indexing.sql`, `src/server/search/search-service.ts`

Postgres full-text with a trigram fallback. Only published records are indexed,
so the index cannot become a side channel for draft content. `related_but_distinct`
aliases are indexed with the qualifier attached, so searching "TB-500" reaches
the Thymosin beta-4 record — which is where the discussion lives — while the
interface still says the relationship is unresolved.

### A.7 Source registry reconciliation

`SOURCE_MANIFEST.json` recorded filenames that did not exist on disk: eight
entries carried `(1)` suffixes or truncated names. Ingestion would have silently
failed to bind sources to files. All sixteen entries now resolve;
`npm run sources:verify` re-checks and records a SHA-256 inventory to
`data/private/` (gitignored) so a quietly swapped copy is detectable — page
numbers in a citation refer to one specific printing.

**Raised for the owner: SRC-011 attribution conflict (verification issue V-013).**
The registry records *Peptide Characterization and Application Protocols*, ed.
Gregg B. Fields (Humana, 2007). The filename of the held copy names Colin T.
Mant, associated with *HPLC of Peptides and Proteins*. One of the two is wrong.
The source has been moved to `pending` and is not citable until someone opens
the copy and confirms the title page. This was not resolved by guessing.

### A.8 Seed data

Ten compounds (`docs/LOCKED_DECISIONS.md` #13), nineteen quality topics, the
full controlled vocabularies, the source registry, and thirteen verification
issues.

**Every seeded record is unpublished and empty of medical content.** Compound
summaries are null; `what_it_proves` / `what_it_does_not_prove` are null. The
publish gates refuse them in that state, which is correct: writing placeholder
medical text to make pages look finished is exactly what `MASTER_BUILD_SPEC.md`
§13 forbids.

`data/seed/evidence_taxonomy.json` — the handoff's authoritative key list — is
left untouched, and a test asserts the labelled seed files cover it exactly, so
neither can drift from the other.

### A.9 Tests

79 tests. Unit tests run in ~0.6s; integration tests apply the real migrations
to an in-process Postgres (PGlite), so no Docker and no cloud dependency.

| Suite | Covers |
|---|---|
| `tests/unit/domain.test.ts` | Evidence semantics, publish gates as pure functions, patient-safe output |
| `tests/unit/source-manifest.test.ts` | Registry binds to files on disk; no copyrighted book marked publishable |
| `tests/integration/migrations.test.ts` | Migrations apply; schema shape; triggers installed |
| `tests/integration/seed.test.ts` | Idempotence; taxonomy coverage; no fabricated content |
| `tests/integration/publish-gates.test.ts` | Every gate, driven directly against the database |
| `tests/integration/public-surface.test.ts` | No dosing columns in patient view; no private columns anywhere public; `anon` cannot read base tables |
| `tests/integration/search.test.ts` | Canonical, alias and fuzzy matching; filters; withdrawal from the index |

The publish gates are tested twice on purpose: as pure functions in
`src/domain/publishing/gates.ts` (which the editorial interface uses to explain
what is missing *before* an editor attempts to publish) and as database triggers.
If the two diverge, one suite passes while the other fails.

---

## Open items

- **Phase A remaining:** Supabase Auth wiring, editorial/admin CRUD surfaces,
  review queue UI.
- **Blocked on credentials:** no Supabase project is provisioned. Everything
  runs against local Postgres; migrations are ready to push.
- **Owner decisions outstanding:** see `docs/OWNER_DECISIONS.md`.

---

## Phase A (continued) — Authentication and the editorial workflow

### A.10 Role-scoped database sessions

`src/server/db/session.ts`

The row-level security policies in migration 0003 are written against the
`authenticated` and `anon` roles and against the acting user's id. Those
policies do nothing unless a query actually arrives under that role — a direct
Postgres connection authenticates as the connection's own role and would bypass
every one of them.

Each unit of work therefore runs inside a transaction that first drops to the
right role and declares who is acting:

```sql
set local role authenticated;
set local request.jwt.claim.sub = '<user id>';
```

`set local` unwinds on commit or rollback, so a pooled connection cannot leak
one request's identity into the next. An editor's session is constrained by the
same policies that would constrain them through any other client.

**Bug found and fixed by this work:** migration 0003 revoked EXECUTE on two
helper functions from `PUBLIC`, which silently removed the grant `authenticated`
had inherited. Every policy calling `tides_current_staff_role()` then failed, as
did every publish-gate trigger, because a trigger body executes as the user
whose statement fired it. Function privileges are now revoked and re-granted
deliberately, with `anon` holding none (the public views run as their owner and
call nothing).

### A.11 Authentication

Supabase Auth provides identity only. Authorisation is settled in Postgres.

- One-time email link, no passwords: there is no credential for the platform to
  store, leak or rotate.
- `shouldCreateUser: false`. Signing in never creates an account.
- Receiving a link is not access. Authorisation comes from an active row in
  `profiles`, which only an administrator can create. Someone who authenticates
  without a staff profile holds no privileges on anything.
- `getUser()` rather than `getSession()` in the session resolver: the former
  revalidates the token with Supabase, the latter trusts a cookie.
- The sign-in response is identical whether or not an address is registered.
- `src/proxy.ts` refreshes the session and keeps unauthenticated visitors out of
  `/admin`. It is a convenience gate, not the boundary — a request that reached
  an admin route without a session would still carry no staff identity.

### A.12 Editorial surfaces

Sign-in, overview, review queue, sources (list / register / detail with
locations), compounds (list / detail with summaries, aliases, claims,
protocols), claims (create / edit / attach evidence / review / publish).

Two decisions worth recording:

**Postgres enforces RLS asymmetrically.** An INSERT that fails `WITH CHECK`
raises; an UPDATE or DELETE whose `USING` clause excludes the row simply affects
nothing and reports success. Treating "no error" as "it worked" would show an
editor a confirmation for an action the database refused. Every update and
delete in `src/server/editorial/mutations.ts` checks the affected row count, and
the access-control tests assert the *effect* rather than the error for those
cases.

**The gate is explained before it is hit.** `src/server/editorial/gate-status.ts`
reads a record's real state and runs it through the same pure functions the
interface uses, so an editor sees a list of specific gaps rather than a
constraint violation. The database still enforces; this is the explanation.

### A.13 Gate parity

`tests/integration/gate-parity.test.ts`

The publish rules exist twice — as triggers, which enforce them, and as pure
functions, which explain them. Two implementations of a safety rule drift unless
something holds them together. For each of ten scenarios this suite asks the
domain layer whether a record can publish, then asks the database to publish it,
and requires the two answers to agree. A divergence in either direction is a
defect: too permissive and an editor is told they may publish and then hits a
raw error; too strict and the interface blocks work the rules allow.

### A.14 Version control of review

A material edit bumps the record's version, and approvals are recorded against a
specific version. Rewriting a reviewed record therefore strands its approvals
and it must pass the gates again. A reviewer approved the text they read, not
the text that replaced it.

### State at the end of Phase A

101 tests. Lint, typecheck, tests and production build all pass.

Remaining before Phase B: protocol editing surfaces (the schema, gates and
public views are complete; only the admin forms are outstanding), quality-topic
editing, and an administrator surface for creating staff profiles.

### A.15 Remaining editorial surfaces

Protocols (create / edit / attach source, with sibling regimens for the same
compound shown alongside and never merged), quality topics, and staff
administration.

Two things the protocol surface does deliberately:

- The dosing fields are grouped under "As reported", with the instruction not to
  convert units, normalise ranges or tidy up phrasing. What the source said is
  the record.
- `patientVisibility` is labelled with what it does *not* do: patient mode still
  receives no amount, frequency, timing, duration, cycle or titration, because
  those columns do not exist in the patient-facing view.

Staff administration is two deliberate steps — invite in Supabase Auth, then
record the profile here. Authentication alone confers nothing.

### A.16 Withdrawal on a non-approving review

`db/migrations/0005_review_withdrawal.sql`

A reviewer who rejects a record or asks for changes must take published content
off the public site immediately. But reviewers hold no write access to content
by design: they record decisions, they do not rewrite the record under review.
Attempting the demotion as the reviewer silently affected zero rows.

Resolved with a `SECURITY DEFINER` function that first confirms the caller
actually recorded such a review, so it cannot be used as a general way to change
a workflow status. The withdrawal is a consequence of the review, not an
editorial edit — the same shape as the provenance cascade in migration 0002.

Related fix: `recordReview` no longer uses `SELECT ... FOR UPDATE` to read the
version. Row locking applies the UPDATE policy, which a reviewer does not
satisfy, so the lookup returned nothing and every review failed. A plain read is
also correct on the merits: if a concurrent edit bumps the version, the review
attaches to a superseded version and correctly fails to count.

### A.17 Dependency injection in the service layer

Editorial services now take the database handle explicitly rather than reaching
for a connection of their own, matching the rest of the codebase. The whole
layer is therefore exercised against the in-process Postgres in
`tests/integration/editorial-services.test.ts` — covering the SQL itself, the
affected-row checks that stop a silently-refused update reporting success, and
the translation of database errors into sentences an editor can act on.

---

## Phase A: complete

109 tests across 10 files. Lint, typecheck, tests and production build all pass.

| Acceptance criterion | State |
|---|---|
| A. Data and provenance | Covered by `publish-gates`, `gate-parity` and `editorial-services` |
| B. Patient/practitioner modes | Structural guarantee tested in `public-surface`; the public *pages* are Phase B |
| C. Search | Covered by `search` (canonical, alias, fuzzy, filters, withdrawal) |
| D. Peptide page | Phase B |
| E. Quality | Gate enforced and tested; explainer content awaits extraction |
| F. Admin | Covered by `access-control` and `editorial-services` |
| G. Engineering | Lint, typecheck, tests, build pass; no secrets; no source PDFs in public paths |
| H. Launch | Phase F |

**Next: Phase B — the public reference experience.** Layout and navigation,
global search, the peptide page template, the simple/practitioner switch,
evidence cards, route components, protocol source cards, the disagreements
module, source metadata pages, and the methodology pages.
