# ENGINEERING NOTES

Decisions about how this repository is built and tested, with the reasoning that
produced them. Separate from the evidence workflow: nothing here is about medical
content.

---

## Test isolation and worker stability

**Decision.** One PGlite database is built per test run and shared by every
suite. Vitest runs with `isolate: false` and a shuffled file and test order.

### The problem

Each integration suite needs a real Postgres, and PGlite provides one by
compiling Postgres to WebAssembly. That is what makes the publish gates,
triggers, views and constraints testable as the *same SQL that will run in
production* rather than a re-implementation — and it is expensive: each instance
is a full database image in memory.

With 22 suites, two configurations were tried and both crashed:

| Configuration | Failure | Frequency |
|---|---|---|
| `isolate: true` — a fork per file | Worker abort, exit `0xC0000003` | ~1 in 20 full runs |
| `isolate: false` — 22 instances in one process | Worker abort, exit `134` (SIGABRT) | ~1 in 6 full runs |

Neither was a test failure. Both reported a *different file each time*, which is
what distinguished them from a real defect. The first was repeated fork teardown
around a WASM heap; the second was 22 accumulated heaps in one process.

Swapping one crash for the other would not have been a fix.

### The decision

**Remove the cause, not the symptom: build one database.**

No suite performs DDL — checked, and there is nothing in the tests but DML and
introspection. The only thing any suite needs is *migrations applied*, and one
instance provides that. Every suite already truncates and re-seeds in
`beforeEach`, so a shared database is as clean at the start of a test as a fresh
one.

Results: no crash in more than fifteen consecutive full runs, and the suite runs
in about 25 seconds instead of 125.

`createIsolatedTestDb()` exists unused, so that a future suite needing real
isolation has an honest way to ask for it rather than quietly breaking everyone
else's.

### Proving determinism

Sharing a worker and a database creates a real risk: a suite that mutates an
imported singleton, or leans on rows another suite created, can pass in one order
and fail in another. Four safeguards:

**1. Shuffled order.** `sequence.shuffle` on files and tests, seeded per run and
printed. A suite that starts depending on a predecessor fails within a run or
two rather than on the day somebody adds a file.

**2. A standing isolation suite.** `tests/integration/test-isolation.test.ts`
asserts pinned row counts after seeding, that a row written by one test is not
visible to the next, that a mutation to seeded content is reset, that the
`seedData` singleton is unmutated, and that no transaction-local role setting has
escaped into the connection.

**3. No test mutates a shared module.** One did: a C.3 test wrote bad edges over
`seedData.qualityMap` and restored them in a `finally`. Under a shared worker
that leaves the rest of the run one aborted assertion away from corrupt data.
`loadQualityMap` now takes its edges as an argument and the test passes them in.

**4. Repeated execution.** Full runs are repeated after any change to test
infrastructure.

### What shuffling found immediately

Three real defects, none of which was caused by the configuration change:

- **A flaky assertion.** A patient-safety test searched the whole serialised
  payload — *including random UUIDs* — for `'500'`. A generated UUID containing
  `4500` failed it roughly one run in six. Identifiers are not content; they are
  now stripped before the search, which keeps the strong property without the
  false positive.
- **`seed.test.ts` seeded without truncating**, and asserts exact row counts
  against the seed files. It had been relying on a private database.
- **`public-surface.test.ts` asserts that nothing is public**, which another
  suite publishing a record of its own would satisfy falsely.

A fourth appeared during the human review pilot, when new suites changed the
shuffle distribution: **`reading-mode.test.ts` seeded in `beforeAll` without
truncating**, and asserts on the register of compounds with *no* published
record. A peptide left published by an earlier suite removed a row it expected.
Same defect, same fix, and the fourth time the shuffle has found a suite quietly
relying on a private database.

All four were latent. They are the argument for the shuffle rather than against
it.

### Non-determinism found in application code

Shuffling also surfaced a defect outside the tests. A claim resting on two
passages had no tiebreaker in its `ORDER BY`, so its citations could reorder
between renders. Ordered by page with a stable final key.

### A second layout-dependent trap: `innerText`

Found in C.10, and the same family as the zero-width measurement.

Checking a rendered page for content with `element.innerText` reported six of
seven headings present. `textContent` reported all seven, and the DOM had all
seven. `innerText` is defined in terms of *rendered* text — it depends on layout
and on what a browser considers visible — so on a hidden or backgrounded document
it under-reports.

**For presence checks, use `textContent`.** Reserve `innerText` for cases where
what a user would actually see is the question, and treat a negative result from
it on a hidden pane as unmeasured rather than absent.

Both traps have the same shape: a browser API that silently answers a slightly
different question than the one being asked, and returns a plausible number
instead of an error.

---

## Why the gates run against real SQL

The migrations under `db/migrations` are applied verbatim in tests. The publish
gates are database triggers rather than application code, so a test that
exercised a TypeScript re-implementation would prove nothing about what runs in
production.

This is the reason the test suite is expensive, and the reason the expense is
worth paying. `tests/integration/schema-parity.test.ts` holds the other half:
the ORM's view of the schema must match the introspected database column for
column, so two descriptions of one database cannot drift.

---

## Context-bound facts (migration 0022)

Added after a specific failure: the previous sprint traced the FDA labelling for
tesamorelin, found five places where it differed from a practitioner handbook,
and recorded all five as the label correcting an error. Four were not errors.

The reason they could not be recorded correctly is that the schema had nowhere
to put the *conditions* of a fact. A claim could hold a number and a citation; a
peptide had one `molecular_description`; a disagreement could name a candidate
explanation but never say that the explanation had been established.

**`compound_products`** — the marketed product, distinct from the molecule.
Tesamorelin is three products under one application with different strengths,
doses, reconstitution, storage and pharmacokinetics, and the labelling states
they are not substitutable. Strength, reconstitution, labelled dose and the
editorial note are withheld from patient mode in the query. So is the product
*name*, in the sense that a name may not carry a strength — a name cannot be
suppressed, so it must not contain one.

**`compound_forms`** — a chemical form and the weight that belongs to it, with
`weight_basis` required by a check constraint wherever a weight is given. A
molecular weight without a basis is ambiguous between the free base, the salt as
supplied, and the free-base equivalent of a salt. For tesamorelin those differ
by hundreds of daltons and none is wrong.

**`pk_observations`** — one reported value with its product, dose, single or
repeated administration, population, route, study condition, source and locator.
There is deliberately no `half_life` column anywhere, and a test asserts there
never is: the FDA's two current tesamorelin labels, effective the same day, give
8 minutes and 11 minutes for the same molecule in the same population by the
same route, because the products differ.

**`disagreement_resolution`** — a second axis on `disagreements`, separate from
the existing `disagreement_explanation`. The old column conflated the axis a
difference lies on with whether it had been settled: `unresolved` sat alongside
`formulation` as though they were alternatives. `resolution_basis` is required
by a check constraint for any value but `unresolved`, because marking a conflict
settled is the one operation here that takes information away from a reader.

`index_error_confirmed` is kept distinct from `source_error_confirmed`.
Attributing an in-house extraction mistake to the source it was extracted from
is its own kind of error, and it is one this codebase has actually made.

**`literature_screens` / `literature_screen_records`** — a search, its criteria,
and every record it returned, so that "no primary human study was identified"
can be a statement with a query, a date and a ledger behind it. `result_count`
is the size of the universe and never a count of evidence; the counts shown
beside it are computed from the classified rows.

## `abstract_held`

A source access state added when a literature screen brought in journal records
whose abstracts were retrieved and read and whose full texts were not obtained.
`held` would claim a copy that is not there; `public_not_yet_retrieved` would say
nobody had read it and put the source under the rule that nothing may rest on a
source this index cannot open. A test requires every locator on such a source to
identify itself as an abstract, so the new state cannot become a way around that
rule.

## `tsconfig.scripts.json`

`src/server/public/queries.ts` opens with `import 'server-only'`, which the Next
build enforces. A Node build script — the reference-sheet renderer — is neither
a client nor a server component, so the package throws on sight.

The alternative was a second copy of the query, which is the thing this codebase
avoids everywhere else. The stub is therefore scoped to a config that only `tsx`
uses; the application build resolves the real package and the guard stands.
Running with `--conditions=react-server` was tried first and breaks
`@react-pdf`, which needs the non-react-server React build.

## Heredocs and control characters

A Python script written through a shell heredoc turned `\b` into a literal
backspace byte inside a JavaScript regular expression. It was invisible in every
editor view and in the Read tool, and it made the regex match nothing. If an
assertion fails for no discoverable reason, check the bytes: `od -c` on the
line. Prefer the Write/Edit tools over heredocs for files containing escape
sequences.
