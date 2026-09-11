# PHASE C.6 REPORT — The evidence extraction workflow

Turning C.1–C.5 into a durable operating procedure, and enforcing the parts that
actually failed.

The brief asked for a workflow written from what worked, failed, and had to be
corrected — not an aspirational one. Every rule in the documents below traces to
a specific incident, and the ones that read as fussy are the ones that cost the
most.

---

## 1. Documents created

| Document | Covers |
|---|---|
| `EVIDENCE_EXTRACTION_WORKFLOW.md` | The 14-stage pipeline, the automation boundary, batch model, and the recorded failure modes |
| `SOURCE_INTAKE_CHECKLIST.md` | Stages 0–4 as a checklist: file, identity, QC, access, locators, citability |
| `LOCATOR_STANDARD.md` | Printed vs file pages, offsets, front matter, tables, figures, media |
| `EVIDENCE_GAP_STANDARD.md` | Negative claims vs library absence; the 15-type taxonomy; closing a gap |
| `PROTOCOL_EXTRACTION_STANDARD.md` | The three prohibitions, required fields, routes, practitioner sources |
| `SOURCE_REPLACEMENT_WORKFLOW.md` | The seven outstanding replacements and the nine-step procedure |

The workflow document is the entry point; the other five are referenced from it
rather than duplicating it.

---

## 2. Enforcement and tooling added

Writing the procedure exposed three places where it was **only** a procedure —
that is, where the next person in a hurry would silently skip it. Those became
code.

### A replacement file invalidates its locators (migration 0015)

`tides_source_file_replaced` fires when `sources.local_file_sha256` changes on a
source that already had a file. Every dependent claim and protocol is flagged
`needs_update` with a reason naming the source and the date:

> *"The held copy of SRC-011 was replaced on 2026-09-11. Every locator on this
> record was recorded against the previous copy and must be re-resolved against
> the new one before this is relied on again."*

This is the single most valuable addition of the phase. Seven sources need
replacing; each replacement will be a different artefact with its own pagination,
and until now the only thing standing between that and silently wrong citations
was an editor's memory — the thing that failed repeatedly in C.1–C.5.

It **flags rather than withdraws**, deliberately. The statements are probably
still correct; what is certain is that nobody has checked them against the new
copy, and `needs_update` is exactly the state for *live, and somebody must look*.

Three cases are deliberately excluded and tested: a first acquisition (nothing
rested on the absent copy), an edit that does not change the artefact, and
records resting on a different source.

### Gaps became queryable (migration 0015)

`evidence_gaps.gap_type`, a 15-value enum. Gaps were prose-only through C.2–C.5,
which is why V-015 had to be broken apart by hand at the end of C.5: the shape
was not in the data, so "blocked on a document we cannot obtain" could not be
distinguished from "nobody has looked yet" without reading every row.

Existing gaps were classified. Current distribution:

| Type | Count |
|---|---|
| `scope_not_established` | 3 |
| `no_current_reviewed_evidence` | 2 |
| `source_missing` | 2 |
| `chain_of_custody_unknown` | 1 |
| `numerical_threshold_not_established` | 1 |

### Two tools

**`npm run evidence:locators`** — Stage 7, made repeatable. Re-resolves every
recorded locator against the held file: source registered, copy held, QC still
permits citation, printed page resolves inside the file, and any recorded table
or figure marker appears on the resolved page. Reports `resolved` / `to check` /
`failed` and exits non-zero on a failure.

Current state: **9 resolved, 0 to check, 0 failed** — including the `table 4-1`
and `figure 4-5` markers, which is the check that would have caught the C.2
table misattribution earlier.

The tool is explicit about its own limit: *a resolved locator means the page
exists and carries the markers recorded; it does not mean the statement is
correct.*

**`npm run qa:metrics`** — §15's internal dashboard. Never a public figure, and
the script says so in its own header: every number describes how thoroughly this
index has checked itself, not how good any compound or supplier is. Published as
a score it would be read as the second.

Current output, unedited:

```
SOURCES
  bibliographic identity verified              14 / 26  (54%)
  copy actually held                           19 / 26  (73%)
  citable                                      19 / 26  (73%)
  awaiting replacement                         7

CLAIMS
  resolve to an exact locator                  14 / 14  (100%)
  primary source traced                         0 / 14  (0%)
  carry a recorded reading                     14 / 14  (100%)
  high-impact stating uncertainty              14 / 14  (100%)
  published                                     0 / 14  (0%)

QUEUE
  open verification issues                     21
  demonstration records present                 0
```

The numbers are meant to be uncomfortable. 54% identity-verified is the honest
consequence of registering sources this index does not hold; 0% published is the
honest consequence of refusing to manufacture reviews.

---

## 3. The three validation cases (§19)

The brief asked the workflow to handle three deliberately different cases without
special pleading. Each is now an executable test in
`tests/integration/extraction-workflow.test.ts` rather than an assertion in prose.

### Case A — Grant textbook, HPLC claim

Claim HPLC-002 resolves to SRC-006, printed page 223, file page 234 (offset +11),
locator naming `table 4-1`. Carries a recorded reading and stated uncertainty.
Certificate scope correctly **null** — a textbook claim must not acquire one.

The test also pins the evidence **ordering**, which exposed a real defect: the
claim rests on two passages (pp. 223 and 224) and the query's `ORDER BY` had no
tiebreaker, so citations could reorder between renders. Now ordered by page with
a stable final key.

### Case B — ICH Q7 regulatory requirement

Claim COA-002 resolves to SRC-017, printed page 24, file page 30 (offset +6),
evidence type `regulatory_reference` rather than `academic_reference` — a
guideline states what should be done rather than reporting a result, and the
taxonomy distinguishes them.

`certificate_type_scope` is `manufacturer_coa` and **reaches the reader**, not
just the database. Three scope gaps are recorded rather than extending Q7 to
document types it does not govern.

### Case C — a practitioner protocol

No practitioner protocol has been extracted, so the case is validated
structurally: the standard's required fields all exist and are **nullable**, so a
field the source does not state can be stored as absent rather than guessed; and
every dosing-shaped column is confirmed absent from `public_v_protocol_simple`.

The test asserts `protocols` is empty — which is the honest state, and stops the
case being "validated" by quietly inventing a protocol to validate it against.

**No special pleading was needed.** The one adjustment the three cases forced was
the ordering fix, which was a real bug rather than an accommodation.

---

## 4. Gaps the workflow exposed

Writing it down surfaced things the code did not:

1. **Evidence ordering was non-deterministic.** Found by Case A. Fixed.
2. **Gaps were unqueryable.** Fixed by `gap_type`.
3. **Nothing connected a replaced file to its dependent locators.** Fixed by the
   trigger — and this was pure procedure before, with seven replacements pending.
4. **Scope is a general problem, not a certificate problem.** Q7 forced
   `certificate_type_scope`; the workflow now states the general rule — when a
   claim family has a scope that could be dropped, the constraint goes in the
   database. Other families (population, route, jurisdiction) are covered by
   convention only, and remain a known weakness.
5. **Stage 12a, rendering review, had no home.** Both C.4 and C.5 found real
   defects only by reading the rendered page. It is now a required stage.

---

## 5. Test infrastructure defect found and fixed

The full suite began failing roughly once per run with a worker crash — exit code
`0xC0000003`, in a **different file each time**, which is what distinguished it
from a test failure. With twenty suites each building a real Postgres image in
WebAssembly, spawning and tearing down a fork around every one was crashing the
worker on Windows.

Fixed by `isolate: false` in `vitest.config.ts`: one worker process for the run
instead of a fresh fork per file. Each suite still closes its own database in
`afterAll`, so nothing accumulates.

Three consecutive clean runs, and the suite got **34% faster** (125s → 82s).

Worth recording that this was genuine flakiness and was treated as a defect
rather than retried until green.

---

## 6. Engineering gates

| Gate | Result |
|---|---|
| Lint | Pass |
| Typecheck | Pass |
| Tests | **245 passing, 20 files** |
| Production build | Pass |
| Migration tests | Pass — 0015 applies cleanly |
| Schema parity | Pass — migrations and ORM agree column for column |
| Gate parity | Pass |
| Data-leakage tests | Pass — `extracted_text_private` and private supplier data confined |

---

## 7. Owner decisions recorded

**USP-NF.** A legitimate single-user USP-NF Online subscription will be obtained.
Until then, unauthorised copies are refused, and publicly visible previews and
harmonisation snippets are not treated as possession of the current chapter. This
decision is now written into V-016 to V-020, so the constraint travels with the
work rather than living in a conversation.

The PDG harmonised `<621>` text remains registered at `pending`, scoped so it
cannot be cited as the current USP-NF requirement.

---

## 8. Remaining owner decisions

1. **Which finished-product and test-report sources to pursue** (V-021). Q7
   covers API certificates; finished-product release documentation and
   third-party laboratory report conventions have no identified source yet, and
   choosing one is an editorial judgement rather than a technical step.
2. **Whether to extract Q2(R2) and Q14 now.** Both are held and verified and
   nothing rests on them. They would support analytical-method claims but are not
   required by any page currently in preparation.
3. **When to lift `noindex`.** Unchanged and still correct while nothing is
   published; the criteria remain undocumented.
4. **Whether a public-facing "how we work" page should summarise this workflow.**
   The methodology page exists; these documents are internal and considerably
   more detailed.

---

## 9. Recommended next topic

**Identity testing, as the first application of the workflow to a topic with no
prepared material.**

Reasons, in order:

1. **It is the strongest remaining conflation.** The HPLC page already states
   that purity is not identity, and the map records it as `commonly_conflated`
   with a sourced basis — but the topic it points at is empty. A reader following
   the most important link on the page currently reaches a preparation notice.
2. **A source is already held and verified.** SRC-006 chapter 4 covers mass
   spectrometry and sequence analysis directly, with the same offset and the same
   extraction conditions already established. Nothing needs acquiring.
3. **It exercises Stage 8, which nothing has yet.** Primary-source tracing sits
   at 0% because every source so far has been a primary one. Identity testing in
   Grant cites primary literature, so it is the natural first test of the
   secondary-to-primary path.
4. **It does not depend on the USP subscription.** Sterility, endotoxin, residual
   solvents and water are all blocked; identity is not.

Suggested sequence: extract identity testing and mass spectrometry as one packet
from SRC-006 chapter 4, take both to `ready_for_scientific_review`, extend the
quality map, and re-point the HPLC page's `commonly_conflated` edge at a topic
that has something to say.

After that, the binding constraint is the USP-NF subscription, and the honest
position is that four quality topics cannot be written until it exists.
