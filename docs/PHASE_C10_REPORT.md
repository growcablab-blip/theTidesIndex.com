# PHASE C.10 REPORT — The quality index, and readiness for a human reviewer

Two halves. The public entrance to the quality section, and everything that has
to be true before a real person is asked to review anything.

Nothing was reviewed. No approval exists. No reviewer was contacted, invited or
invented, and no external infrastructure was provisioned.

---

## Part A — `/quality`

### A.1 The problem

The index listed **published topics only**, and nothing is published. A section
with four written topics and fifteen registered ones rendered as an empty state.

This is the failure the compound register solved in migration 0006, with the same
answer: *"nothing is published here yet"* and *"this subject is not in the index"*
are different statements, and a reader deserves to tell them apart.

### A.2 The register

`public_v_quality_register` (migrations 0018, 0020) exposes every topic with
name, family, review state, publication state, claim/gap/relationship counts, and
the lowest-numbered open verification issue naming it.

**It carries no prose.** A short description is unreviewed content until the
topic publishes, and the view is readable by `anon`. Asserted as a test rather
than a convention.

### A.3 Five states, in words

| State | Meaning |
|---|---|
| Published | Reviewed and live |
| Written — awaiting scientific review | Complete, prepared, waiting on a person |
| Evidence captured | Claims exist, not yet submitted |
| Open question recorded | Unwritten, and the queue records a question about it |
| In preparation | Registered; nobody has started |

Current: 8 awaiting review, 8 with an open question recorded, 9 in preparation,
0 published.

### A.4 A label that was overstating — found and fixed

The fourth state read **"Source access pending"**, derived from a register field
called `blocking_issue_key`.

Both overstated the data. `related_keys` links a verification issue to a topic; it
does not record whether that issue is what is holding the topic up, and several
are not. V-008 — the conflation of purity, identity and content — names
`hplc-purity`, which is written and blocked by nothing.

The page was saved only by a short-circuit: it consults the field solely for
topics with no claims, so nothing was displayed wrongly. But a field whose name
does not mean what it returns is a defect waiting for the next person who trusts
it.

Whether an issue blocks a *particular* topic is a property of the pair, and the
queue has nowhere to record it. Rather than invent that classification:

- migration 0020 renames the field to `open_issue_key`;
- the label becomes **"Open question recorded"**, which is what the data
  supports;
- the page and footer wording follow;
- `docs/QUALITY_INDEX_ARCHITECTURE.md` records why it says less than it used to.

For sterility and bacterial endotoxin the old label was accurate. For the
manufacturing-geography and GMP topics it was not, and those are the ones the
change is for.

### A.5 Families are editorial, not scientific

Grouping comes from `quality_topics.family`, deliberately **not** from the
relationship map. A map edge is a claim about how two topics relate and must cite
its basis; a family is a shelf somebody put a topic on. A test asserts every
topic lands in a family the page can render — one that does not silently
disappears from the index.

---

## Part B — Readiness for a human reviewer

### B.1 The review packet as a document

A reviewer with standing in this field is a person with a calendar, not an
account. The realistic first review is somebody reading a document, marking it
up, and sending back prose.

`src/server/editorial/packet-export.ts` builds it; a new component renders it at
`/admin/quality-topics/<id>/export` and `/dev/review-packet/<slug>/export`.

Three constraints shape it, each enforced rather than intended:

**It cannot carry the sources.** Held files are third-party copyrighted works and
are not redistributed. The document carries locators — the work's own printed
pages — plus a "sources you need in front of you" section with access status for
each. That is a real limitation, and it is stated on the document instead of
hidden by it.

**It cannot carry private file identity.** Source fields are chosen by an
**allowlist**, so a column added to `sources` later is absent by default rather
than leaked by default. A test writes a filename and a checksum into the row and
asserts neither reaches the export.

**It cannot be an approval.** The document contains **no interactive control of
any kind** — no form, button, input, select or textarea — asserted against the
rendered markup. It states that returning it, signed or annotated, approves
nothing; that comments can be transcribed verbatim and attributed; and that a
*decision* is made by the reviewer in the application against the named version.
Producing the document writes no review row and does not move the record.

The identifier `RP-<KEY>-v<version>-<date>` binds the paper to the version. An
edit issues a different document.

#### Two defects found by reading the rendered document

- **`access_notes` leaked internal prose.** SRC-006's note reads "acquired before
  the C.5 access-status field existed; provenance recorded in integrity_notes" —
  a build phase and a database column, shown to an external reviewer. Removed
  from the allowlist; the reviewer gets a sentence written for them instead.
- **The edition printed twice.** "Synthetic Peptides: A User's Guide, 2nd
  Edition, 2nd", because the registered title already carries the edition. The
  edition is not dropped in general — two editions paginate differently, so a
  locator is only checkable against the edition it was read in — only where
  repeating it adds nothing.

### B.2 Visual QA of the admin surfaces

The review packet was the one major interface never visually inspected. It now
has been, along with the export document and `/quality`, at 1440 / 1024 / 768 /
375 and at print width with the print rules forced.

Thirteen measurements, all graded through the C.9 guard, all `PASS`. The guard is
now callable: `npm run qa:visual -- <measurements.json>` exits non-zero on any
failed **or invalid** measurement, so a run containing an unrenderable viewport
reports "not checked" rather than a clean pass.

Print layout verified concretely: screen-only elements hidden, zero interactive
controls, no overflow, two deliberate page breaks, 33 blocks marked not to break
across pages. Admin chrome is `print:hidden`, so the packet prints as a document
rather than as a screenshot of an application with a sign-out link in the corner.

### B.3 Turnaround, measured rather than estimated

`qa:metrics` gains a REVIEW section: claims and topics awaiting review, standing
human approvals bound to the current version, approvals invalidated by later
edits, returns, rejections, human reviews, automated checks, and reviewer
standing.

Turnaround could not be computed — nothing recorded when a record was handed to a
reviewer. `updated_at` is not a substitute; it moves on every edit, including
edits made after submission, and deriving a submission date from it would have
produced a confident number measuring something else.

Migration 0019 adds `review_submitted_at` to claims, quality topics, protocols and
peptides, maintained by `tides_track_review_submission`:

- set when a record enters `ready_for_scientific_review`;
- cleared when it falls back below that rung, because the wait that matters is
  the new one;
- kept when it advances past, so a completed review stays measurable;
- added to the touch trigger's ignore list, so recording a submission does not
  bump the version and strand the very approvals it is collecting.

Rows already at the ready rung are **not backfilled**. The metric reports them as
*not measurable* rather than as zero wait.

`records beyond their review clock` is reported as **not computable**, with the
reason: `review_clocks` defines the cadences but no content record carries a
clock class. Assigning one is an editorial decision, not a derivation.

### B.4 A demonstration reviewer would have satisfied a real gate

`tides_has_approved_review` counts any human approval with a reviewer attached.
The demonstration dataset seeds a profile called "Demo Scientific Reviewer". In
development that is the point — demonstration content flows through the real
gates. In production it is a fabricated scientific approval on real medical
content.

`tides_demonstration_record_count()` has carried the comment *"must be zero in
production"* since migration 0009, and nothing evaluated it.

Rather than teach the gate to recognise a fake person — a worse gate — the guard
is at the door. `src/server/ops/production-readiness.ts` judges four conditions
and `npm run qa:production` exits non-zero with the reasons:

| Blocker | Why |
|---|---|
| Demonstration records present | Their reviewer's approvals satisfy the publish gates |
| Reviews by a demonstration reviewer | Deleting the profile leaves the review row behind |
| Published with no standing human approval | The gates are triggers; a non-zero count means one is missing or was bypassed |
| Preview enabled in a production build | Unreviewed medical content readable by URL |

Run against the development database it currently reports one blocker: a
"Local Dev Editor" profile.

### B.5 The dry run

`tests/integration/review-dry-run.test.ts` walks one claim the whole way —
submitted, source-checked, scientifically approved, compliance-approved,
published, edited, withdrawn — because a chain of individually correct links can
still fail to be a chain. It confirms that a change request cannot be published
on, and that the submission clock behaves at each transition.

The reviewer is a fixture. Nothing it does is a scientific opinion.

### B.6 A reproducibility gap, now recorded

Loading an evidence packet is data. *Submitting* one is an action the database
insists on attributing to a named editor, so `seedDatabase` cannot perform it and
does not try.

A freshly seeded database therefore shows the four written topics as **evidence
captured**, not **awaiting scientific review**. The development database reads
otherwise only because `npm run evidence:submit` was run against it by hand, in
an earlier phase.

That is correct behaviour and an undocumented step. It is now pinned by a test
and written into `docs/HPLC_REVIEW_PACKET.md` §7.

---

## What was added

| | |
|---|---|
| Migrations | 0019 (submission clock), 0020 (`open_issue_key`) |
| Server | `packet-export.ts`, `production-readiness.ts` |
| Components | `packet-export-document.tsx` |
| Routes | `/admin/quality-topics/[id]/export`, `/dev/review-packet/[slug]/export` |
| Scripts | `qa:visual`, `qa:production`; REVIEW sections in `qa:metrics` |
| Tests | `packet-export` (11), `review-dry-run` (8), `quality-register` (11) |
| Docs | `HPLC_REVIEW_PACKET.md`, this report; `QUALITY_INDEX_ARCHITECTURE.md` updated |

**29 test files, 372 tests, all passing.**

---

## What is still not true

- **No human has reviewed anything.** Zero standing approvals, zero published
  records. Everything above is preparation.
- **No reviewer exists.** Zero scientific reviewer accounts. Standing and
  conflicts columns exist and are unpopulated, which is the honest state.
- **Turnaround has no data.** The clock starts from the next submission; existing
  rows read *not measurable*.
- **Staleness cannot be computed.** No content record carries a review clock
  class.
- **Four quality topics cannot be written.** Sterility, bacterial endotoxin,
  residual solvents and water content wait on the USP-NF subscription
  (V-017–V-020). Recorded, not hidden.
- **No primary source has been traced.** 0 of 27 claims. V-022 records the one
  attempt and the owner decision not to pursue it further for now.
- **The site remains `noindex`.**
