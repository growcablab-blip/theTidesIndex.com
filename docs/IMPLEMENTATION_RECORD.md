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

---

## Owner decisions applied (2026-09-11)

### SRC-011 resolved; the wider lesson recorded

Owner inspection settled the attribution: **Gregg B. Fields (ed.), *Peptide
Characterization and Application Protocols*, Methods in Molecular Biology vol.
386, Humana Press, 2007.** Colin T. Mant, named in the third-party filename, is
lead author of Chapter 1 ("HPLC Analysis and Purification of Peptides"), not the
editor.

The registry now carries the correct identity. The held copy remains corrupted —
authentic front matter and the start of Chapter 1, then unrelated material — so
QC status is `replace` and the source is not citable. V-013 continues as the
replacement task.

Added **V-014**: third-party filename metadata is not bibliographic authority.
Eight of sixteen registered sources came through download aggregators and carry
the same risk. Each needs its title page checked before it is used as provenance.

This is the source QC system working as designed: a misattribution was caught
before anything cited it.

### Workflow state split into independent dimensions

`workflow_status` collapsed verification state and publication state into one
ladder, which cannot express the combinations that matter. Now:

| Column | Meaning |
|---|---|
| `review_state` | how far editorial has checked it |
| `publication_state` | whether it is currently public |
| `needs_update` (+ reason) | flagged for attention; orthogonal to both |
| `editorial_state` | **generated** canonical label, derived from the three |

All four of the owner's examples are now representable:

- *scientifically reviewed + unpublished* — `scientific_reviewed` / `unpublished`
- *published + needs update* — `published` / `needs_update = true`; the page
  stays live and the flag travels to the reader through `public_v_*`
- *source checked + awaiting clinical review* — `source_checked`, with the
  outstanding gates visible in the reviews table
- *previously published + superseded* — `superseded`, with `published_at` and
  `superseded_at` both retained

`editorial_state` is a generated column, so the canonical label can never
contradict the dimensions it summarises. Every branch yields a literal because
casting an enum to text is only STABLE and a generated column requires an
immutable expression.

Regulatory state (`regulatory_statuses.status`) and source QC state
(`sources.qc_status`) were already separate and are unchanged.

**`review_state` is maintained by trigger, not by hand.** Recording an approved
review at the record's current version advances it; a material edit resets it to
`captured`. Deriving it from the reviews that actually exist is what stops the
displayed verification state drifting from the evidence for it — and it closed a
parity gap, because a hand-maintained column would have been a publish
precondition the domain layer did not model.

**Gates now distinguish entering publication from editing live content.**
Entering with an unmet requirement is refused. Editing content that is already
live withdraws it and records why, rather than refusing the write — refusing
would mean published content could never be corrected without first being
pulled, which pushes editors toward leaving errors in place. The invariant that
published content satisfies its gate holds either way.

### Drizzle: approved with the parity condition enforced

The owner's condition was that versioned SQL remains the authoritative contract
and that ORM-generated structure must not silently diverge from it.

`tests/integration/schema-parity.test.ts` enforces this. It applies the
migrations as shipped, introspects the result, and requires the Drizzle schema
to match table-for-table and column-for-column including nullability and
generated status. A skipped `db:generate` fails the suite.

Migrations were re-cut once, before any deployment, so the chain reads cleanly
rather than carrying a rename migration for a schema that had never run
anywhere. **From the first deployment they are append-only.**

### Local development database

`npm run db:dev` starts PGlite — real Postgres compiled to WebAssembly — behind
a TCP socket speaking the Postgres wire protocol, applies the migrations, seeds,
and prints a connection string. Nothing to install, and the application cannot
tell it from a server someone set up: development, tests and production all run
the same migrations against the same engine.

Production remains Supabase. No cloud infrastructure was provisioned.

### Patient visibility, analytics, non-peptide compounds

- Patient/simple views keep excluding dose, units, frequency, timing, duration,
  cycle, titration and the number-heavy clinical prose that could reconstruct a
  regimen. The exclusion is structural, in the view definition.
- No analytics added. An abstraction will be introduced only if it earns its
  place architecturally.
- MVP public scope stays peptides and peptide therapeutics.
  `compound_types.is_peptide` already distinguishes them, so supporting
  peptide-adjacent compounds later needs no schema rewrite — only a decision
  about scope.

**118 tests.** Lint, typecheck, tests and production build pass.

---

## Phase B — The public reference experience

Full account in `docs/PHASE_B_REPORT.md`. Recorded here: the decisions that
changed the architecture.

### B.1 Reading mode is a data-access decision

The mode switch is a server action, not client state. The choice decides which
relation the next render reads from, so doing it on the client would mean the
practitioner payload — doses included — had already been sent to a reader in
patient mode.

`src/server/public/protocol-reader.ts` branches on the mode and selects from
different relations. Patient mode reads `public_v_protocol_simple`, which has no
dosing columns, so the values never enter the process.

Two modules exist to keep this testable outside a browser: `shapes.ts` (types and
row helpers, free of `server-only`) and `protocol-reader.ts` (taking a database
handle). `tests/integration/reading-mode.test.ts` serialises the patient payload
and requires that no dose value appears anywhere in it.

### B.2 The register: a page for a compound that has none

Migration 0006. A registered-but-unpublished compound previously 404'd, which
hid the most useful thing an early reference can say — what it is working on.
`public_v_peptide_register` exposes name, alternative names and how far the work
has got, and carries no summary, no claim and no medical content.

The distinction it enables is the honest one: "no reviewed human evidence is
recorded here" is a statement about this index; "this compound is not in the
index" is a different statement; a reader deserves to tell them apart.

### B.3 Public reads run as `anon`

Every query in `src/server/public/queries.ts` runs inside `withPublicSession`,
which drops the connection to the `anon` role. That role holds privileges on the
`public_v_*` views and nothing else, so a mistake in a query cannot reach a draft
record, a private column, or a dose. The boundary is the database's.

### B.4 Public pages render on demand

`force-dynamic` on every data-reading page. Content changes when an editor
publishes, not when the application deploys, so a build-time snapshot would serve
stale evidence until the next deploy. It also means a build does not need
database access, which decouples deployment from database availability.

### B.5 Defects found by building and looking

Beyond the schema-level fixes recorded above:

- **Trigger firing order.** Postgres fires BEFORE triggers alphabetically by
  name; `claims_touch` sorted after `claims_a_coherence`, so coherence saw
  pre-version-bump values. Names now encode the sequence.
- **Gates blocked editing published content.** An edit strands approvals, so the
  gate refused the write — meaning published content could never be corrected
  without first being pulled, which encourages leaving errors in place. Gates now
  separate entering publication (refuse) from editing live content (withdraw with
  the reason recorded).
- **Contrast.** Two tones measured below 4.5:1; found by auditing rather than
  assuming. `slate` darkened from the brief's `#66747b`, and the lightest tone
  reserved for placeholders.
- **Dev database served one connection.** `PGLiteSocketServer` defaults to
  `maxConnections: 1`.
- **Connection leak under hot reload.** Clients now cached on `globalThis` in
  development.

### B.6 The demonstration dataset, and why BPC-157 is not it

The instruction was to build one complete vertical around BPC-157 using only the
reviewed data available, to prove the system rather than publish clinical
content. Those pull apart: there is no reviewed data for BPC-157, so exercising
the vertical there would have required writing content for it.

The vertical is therefore built on a **Demonstration Compound** whose name,
sources and every field announce it as a demonstration. It runs through the real
publish gates — the seeder creates four staff members because no single account
can sign every gate. BPC-157 stays honest: registered, in preparation, nothing
asserted.

`npm run db:demo`, guarded by an opt-in and a localhost-only check.

**127 tests.** Lint, typecheck, tests and production build pass.

---

## Phase C.1 — Source integrity

Recorded in full in `docs/SOURCE_INTEGRITY_REPORT.md`. In summary: every held
file was opened, hashed, page-counted, its front matter read, and its whole text
scanned for the vocabulary its registered work would necessarily use. Five of
sixteen registered sources are not the works they claim to be. Three of those had
been recorded as "genuine content after promotional pages" — the description that
would have permitted them to be cited.

Nothing in the index was affected, because nothing had been published. The
enforcement is automatic rather than editorial: `sources.is_citable` is generated
from QC status, the publish gates read it, and downgrading a source withdraws
anything resting on it.

## Phase C.2 — The HPLC evidence packet

The first real extracted content in the index: seven claims about chromatographic
purity, taken from SRC-006 (Grant, *Synthetic Peptides: A User's Guide*, 2nd edn,
OUP 2002), chapter 4.

### C.2.1 A packet is a unit of work, not a page

`data/seed/evidence/hplc-purity.json` holds the extraction: the topic's two
halves, six source locations, seven discrete claims, and four statements the
extraction could **not** support. It is JSON on disk for the same reason the
vocabularies are — the material is editorial work, and it should be reviewable as
a diff before it is reviewable as a record.

Three things had to become representable before a packet could survive being
re-loaded and still be handed to a reviewer honestly:

- **`source_locations.location_key`.** Without a stable handle, re-running an
  extraction either duplicates locators or orphans the evidence pointing at them.
- **`claim_evidence (claim_id, source_location_id)` unique.** Re-extraction
  revises a reading; it does not accumulate citations of the same passage.
- **`sources.printed_page_offset`.** Locators are the work's own printed pages,
  because that is what a reader with any copy can find. The held file numbers
  from its cover and runs eleven pages ahead. Storing the offset is what makes a
  locator re-checkable against the specific copy the register holds, rather than
  re-derived by whoever opens it next.

### C.2.2 What the packet could not support, recorded as firmly as what it could

`evidence_gaps` is a new table, and deliberately neither a claim nor a
verification issue. A claim asserts something and must resolve to a citable
location; a gap asserts nothing, so it has no provenance to give. A verification
issue is the work queue; a gap is the reader-facing consequence.

"Purity says nothing about sterility" is true, is what everyone expects a page
like this to say, and is supported by nothing in this register — SRC-006 is a
synthetic chemistry text and does not address release testing of a finished
injectable. It is held as an absence with a named reason (V-015) rather than
printed as received wisdom. So is the endotoxin statement, the peak-area
calculation, and any minimum purity threshold.

Gaps carry no publication state of their own. They are visible exactly when their
subject is, so there is no state in which a topic is live and its stated limits
have been quietly stripped out.

### C.2.3 Automation checked the sources; it cannot approve them

Recording automated work honestly turned out to need two changes.

A `reviews_automation_scope` check constraint: `performed_by = 'automated'`
implies a review type of `source_check` or `primary_verification`. An automated
scientific, clinical or compliance approval is now not merely disallowed by
policy — it cannot be written down, including by the table owner.

And `tides_record_automated_check()`, because the `reviews` insert policy
requires `reviewer_user_id = tides_current_user_id()`, which an automated check
cannot satisfy by construction. Without a route in, automated work would have had
to be written by a superuser, which is how "an editor ran a tool" quietly becomes
"nobody knows who ran it". The function requires an editor or admin caller, names
the tool, and refuses any review type that constitutes an approval.

The packet therefore reaches **ready for scientific review** and stops. Every
locator was resolved against the registered file, which is a real source check;
no person has read the claims, and nothing pretends otherwise. The publish gate
refuses twice over — first because `tides_has_approved_review` counts human
approvals only, so even the source check is unsatisfied, and then because a
scientific approval is required.

### C.2.4 The reviewer can actually read it

A record sitting at `ready_for_scientific_review` is a promise that the packet is
complete enough to be judged. `src/server/editorial/review-packet.ts` assembles
it and the admin quality-topic page renders it: each claim, the platform's
reading, what it admits is uncertain, every passage with a locator **and the page
of the held file**, then the gaps — so an absence is something a reviewer is
asked to confirm rather than something they have to notice is missing.

The assembly takes a database handle and avoids `server-only`, following
`src/server/public/shapes.ts`, so what a reviewer is shown is tested against a
real database rather than asserted about in prose.

### C.2.5 A correction the process caught

Table 4-1 extracts as flat columns rather than rows, so which limitation belongs
to which technique is partly reconstructed from order. An early draft attributed
"not reliable for quantitation" to mass spectrometry; on re-reading, it more
likely belongs to the sequence-analysis row above it. The claim now rests only on
"not quantitative", which is the final entry and therefore unambiguous, and the
uncertainty text says why. The packet note records both extraction caveats — that
one, and that text extraction clips the first characters of many lines, which is
why the packet paraphrases rather than quotes.

### C.2.6 Reading a source is now a repeatable operation

`npm run sources:read -- SRC-006 --printed 239` opens the printed page, resolving
the offset from the registry and reporting both numbers. The scratch reader used
during C.1 has been replaced by it. Extraction is only reproducible if the next
person can open the same page.

**152 tests.** Lint, typecheck, tests and production build pass.

## Phase C.3 — The quality map

A certificate of analysis is a list of separate answers, and it gets read as one
verdict. The map is the structure that holds them apart: for a given test, what
else it relates to and — the half that actually helps — what it does not answer.

`quality_relationships` holds typed directed edges. Six types, each carrying a
one-sentence rationale: `complementary`, `commonly_conflated`,
`not_addressed_by`, `same_process`, `other_attribute`, `scoped_by`.

### C.3.1 The map must not become a second evidence layer

"A purity figure says nothing about sterility" is a statement about evidence. A
map free to assert it would be a second place where medical content is written —
outside the provenance chain, outside the publish gates, and much easier to edit
than a claim. That is the failure this design is built against.

So `quality_relationships_basis` requires the two types that make such a
statement, `commonly_conflated` and `not_addressed_by`, to cite the claim that
establishes it or the recorded gap that explains why the register cannot. The
remaining types may declare themselves structural, and a structural edge must not
smuggle an assertion into its rationale.

The distinction the design turns on is visible in one row: the sterility edge
cites `hplc-purity-gap-01`, not a claim. This index does not know that purity
says nothing about sterility because a source said so — it knows that no source
it holds addresses sterility at all. Those are different facts, and the map
points at the right one.

### C.3.2 The HPLC hub

Eleven edges. Identity testing and content/assay as `commonly_conflated`, resting
on HPLC-002 and HPLC-005; mass spectrometry as `complementary` on HPLC-006;
purification as `same_process`; sterility and bacterial endotoxin as
`not_addressed_by`, resting on the recorded gaps; residual solvents, water
content, pH and heavy metals as structural `other_attribute` links; batch
traceability as `scoped_by`.

pH and heavy metals were added as empty topic shells, since the map needed
somewhere to point. Nothing is written on them.

Residual solvents is *not* recorded as `not_addressed_by`, though it would have
been an easy edge to write. Whether chromatographic purity bears on residual
solvents is a claim, and no source in the register supports one either way, so
the edge says only that it is a separate attribute.

### C.3.3 An edge may point at an empty room

`public_v_quality_relationships` is gated on the topic the reader is *on*, not the
topic being pointed at, and carries the target's publication state. An edge to a
topic with nothing written is worth showing: "sterility is a separate question
and this index has no record for it" is true and useful, and hiding it would
leave purity looking like the whole story. Same choice as the compound register
in migration 0006.

### C.3.4 Two things caught by looking at the output

The map renders into the reviewer's packet, grouped by relationship type. Reading
that output rather than trusting the JSON caught both:

- The label repeated above every row, burying the relationship it was meant to
  foreground. Now grouped.
- The water-content edge read "it bears on how a purity figure relates to the
  mass in a vial" — which is precisely the inference HPLC-005's uncertainty text
  says is "not asserted here", appearing on a structural edge that cites nothing.
  Exactly the smuggling the basis rule exists to prevent, arriving through the
  one door the rule leaves open. Rewritten to assert nothing.

**162 tests.** Lint, typecheck, tests and production build pass.
