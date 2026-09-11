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

All three were latent. They are the argument for the shuffle rather than against
it.

### Non-determinism found in application code

Shuffling also surfaced a defect outside the tests. A claim resting on two
passages had no tiebreaker in its `ORDER BY`, so its citations could reorder
between renders. Ordered by page with a stable final key.

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
