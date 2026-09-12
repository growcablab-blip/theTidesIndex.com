# FIRST PUBLICATION READINESS — HPLC / chromatographic purity

Exactly what stands between this record and publication.

**Nothing is published. Nothing here publishes anything.** The site remains
`noindex`, and no approval exists against any record in this index.

Regenerate with:

```bash
npm run qa:publication -- hplc-purity
```

That command is the source of this document. A readiness table typed once goes
stale the first time somebody edits a claim, and a stale readiness table is worse
than none.

State below is as of **12 September 2026**, record version **2**.

---

## 1. The short answer

The evidence is complete. The reviews do not exist.

Every mechanical precondition is met: sources verified, locators exact, readings
recorded, uncertainties stated, gaps declared. What is missing is people. The
publish gate wants **human approvals**, and this index has never recorded one.

For the topic record: **one** human scientific approval.
For each of the seven claims: **three** human approvals — source check,
scientific, and compliance.

---

## 2. The one thing that surprises people

Every claim already carries an **approved source check**, and the gate still
asks for one.

`tides_record_automated_check` recorded that every locator in the packet resolves
to the passage it claims, performed by a named tool. That is a real check and it
is why these claims sit at `ready_for_scientific_review` rather than at
`captured`.

It opens no gate. `tides_has_approved_review` counts approvals where
`performed_by = 'human'` and a reviewer is attached. So an automated check
advances the review state and never substitutes for a person — which was the
whole point of migration 0009, and is the reason the publication gate below reads
as though a check that exists does not.

Read every *"an approved … is required"* as *"a human approval is required"*.

---

## 3. Source integrity

| | |
|---|---|
| Sources cited | 1 — SRC-006, Grant, *Synthetic Peptides: A User's Guide*, 2nd edition |
| QC status | `usable` · citable |
| Access | Copy held |
| Title page verified | Yes |
| Bibliography verified | Yes |

The source-integrity audit (C.1) found five held files that were not the works
they claimed to be. SRC-006 is not one of them: its title page was opened and its
bibliography confirmed against the work. Its printed pages and the held file
differ by a fixed offset of 11, recorded so a locator is checkable against this
specific copy.

**No blocker.**

---

## 4. Claims and locator coverage

| | |
|---|---|
| Claims | 7 |
| Evidence links | 10 |
| Exact locator coverage | **10 / 10** |
| Carry a recorded reading | 7 / 7 |
| High-impact claims stating uncertainty | 7 / 7 |

Every claim resolves to a page, a chapter and, where relevant, a table or figure
in a work anybody can open. Six distinct locations in Grant chapter 4: printed
pages 222, 223 (table 4-1), 224, 239 (figure 4-5), 241 and 261.

**No blocker.**

---

## 5. Primary-source verification

| | |
|---|---|
| Primary source traced | **0 / 10 evidence links** |

Nobody at this index has opened the original study behind a cited passage. Where
Grant states something in his own voice the question does not arise; where he
reports another group's work, the trace has not been done.

One attempt was made and failed honestly — the full text was not obtainable — and
is recorded as **V-022**, together with the owner decision not to pursue it
further for now. That attempt did produce a real bibliographic correction.

**Not a gate blocker.** The publish gate does not require a primary trace. It is
reported here because a reviewer is entitled to know the difference between a
source read and a source cited, and because zero out of ten is the kind of number
that should be stated rather than discovered.

---

## 6. Evidence gaps

Four statements this topic deliberately does not make.

| Gap | Type | Tracked as |
|---|---|---|
| `hplc-purity-gap-01` | source missing | V-017 |
| `hplc-purity-gap-02` | source missing | V-018 |
| `hplc-purity-gap-03` | no current reviewed evidence | V-015 |
| `hplc-purity-gap-04` | numerical threshold not established | V-015 |

In words: a purity result says nothing about sterility (V-017) or endotoxin
(V-018); how a certificate's purity figure is calculated is not established from
a current reviewed source (V-015); and no minimum purity for material intended
for human administration is established anywhere this index holds (V-015).

The last is the packet's most consequential silence and the thing to press a
reviewer on hardest.

**Not a gate blocker.** Gaps carry no publication state and become visible
exactly when their subject does — a topic cannot be published with its stated
limits quietly stripped out.

---

## 7. Review status

| Review | Standing at version 2 |
|---|---|
| Scientific | **none** |
| Compliance | **none** |
| Clinical | none — not required for a quality topic |
| Automated checks | 2 recorded — locator resolution only |

No human has reviewed any record in this index. Zero reviewer accounts exist.

**This is the blocker.**

---

## 8. Publication gates

### The topic

```
can publish: no
  · An approved scientific review is required.
```

### Each of the seven claims

```
HPLC-001 … HPLC-007: blocked
  · An approved source check is required.
  · An approved scientific review is required.
  · A high-impact claim requires an approved compliance review.
```

All seven are high-impact or critical, so all seven need the compliance approval
as well.

**Total human approvals needed before anything here can be published: 22.**
Twenty-one across the claims (three each) and one on the topic.

That number is worth seeing before the pilot starts. The first reviewer supplies
seven of them — the scientific approvals on the claims — plus the topic's. The
source checks and the compliance approvals are internal editorial acts and are
still acts a person has to perform under their own account.

---

## 9. Surrounding machinery

| | |
|---|---|
| Correction mechanism | 0 corrections recorded, 0 public. The table, the trigger and `/corrections` exist and have never been needed. |
| Indexing | `noindex`, site-wide. Unchanged. |
| Preview of unpublished content | Disabled by default; enabled only in a development build with `TIDES_PREVIEW_UNPUBLISHED=1`, and refused outright by a production build. |
| Version | 2 |
| Review submitted at | Not recorded — the record entered the ready rung before migration 0019 added the column. Null is not zero wait. |

Lifting `noindex` is a separate owner decision and is not a consequence of
publishing a topic.

---

## 10. What is not blocking, and is worth knowing anyway

- **The USP-NF gap.** V-016 through V-020 stay open. None of them blocks this
  packet: every claim here rests on Grant, which is held and verified. What the
  missing compendial chapters block is sterility, bacterial endotoxin, residual
  solvents, water content, and the chromatographic *method requirements* topic —
  none of which this packet claims anything about.
- **The 2002 edition.** Every claim carries the same recorded uncertainty:
  instrumentation has advanced since, the separation of purity from identity has
  not. A reviewer may reasonably say the packet needs a modern corroborating
  source, and that would be a change request rather than a defect.
- **Scope.** No claim carries a scope sentence. What the record holds is the
  claim category and the chapter and section each passage was read within. The
  bundle prints this, and says so plainly where nothing narrows a claim.

---

## 11. Summary

| | |
|---|---|
| Source integrity | ✔ verified |
| Locator coverage | ✔ 10 / 10 |
| Readings and uncertainties | ✔ 7 / 7 |
| Gaps declared | ✔ 4 |
| Primary-source trace | ✘ 0 / 10 — not a gate condition |
| Human scientific review | ✘ **none** |
| Human compliance review | ✘ **none** |
| Human source check | ✘ **none** — the automated one does not count |
| Publication | blocked, by 22 missing human approvals |
| Indexing | `noindex` |

Everything a machine can do to this record has been done. The rest is a person's
job, and no person has been asked yet.
