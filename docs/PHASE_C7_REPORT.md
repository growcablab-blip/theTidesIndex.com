# PHASE C.7 REPORT — Identity testing

The HPLC page taught that purity is not identity, and the link it offered led to
an empty room. That was the most important broken path in the quality section,
and it is now closed.

---

## 0. Test-infrastructure safety check (completed first)

Recorded in full in `docs/ENGINEERING_NOTES.md`.

`isolate: false` was approved as a workaround. Proving it safe found that it was
**not sufficient on its own**: with 22 suites, the fork-teardown crash
(`0xC0000003`, ~1 run in 20) had simply been traded for a memory crash (SIGABRT
`134`, ~1 run in 6). One failure mode for another is not a fix.

**The cause was building 22 Postgres images.** One is now built per run and
shared. No suite performs DDL, and every suite already truncates and re-seeds, so
a shared database is as clean at the start of a test as a fresh one.

| | Before | After |
|---|---|---|
| Crashes | ~1 per run, either mode | none in 15+ consecutive runs |
| Duration | 125 s | ~25 s |

Determinism is proved rather than assumed: shuffled file and test order,
`tests/integration/test-isolation.test.ts` as a standing check, and the one test
that mutated a shared singleton rewritten to pass its data in.

**Shuffling immediately found three latent defects**, none caused by the change:
a patient-safety assertion that searched random UUIDs for `'500'` and failed
about one run in six; `seed.test.ts` asserting exact row counts without
truncating first; and `public-surface.test.ts` asserting that nothing is public,
which another suite could satisfy falsely. It also found a real application
defect — a claim's citations could reorder between renders for want of an
`ORDER BY` tiebreaker.

---

## 1. Claims captured

Seven, all from SRC-006 chapter 4, all locator-verified. Full detail in
`docs/IDENTITY_TESTING_EVIDENCE_PACKET.md`.

| Key | Claim | Locator |
|---|---|---|
| ID-001 | Homogeneity and covalent structure are separate; separation methods give no structural information | p. 243 |
| ID-002 | Overall mass determination is the common method, usually sufficient, particularly alongside others | p. 244 |
| ID-003 | Mass measurement can reveal modifications invisible to other procedures | p. 244 |
| ID-004 | Electrospray gives multiple signals for one homogeneous peptide | p. 249 |
| ID-005 | A mass result is a comparison with a margin — 4005.3 / 4005.6 / 4006.5 against a calculated 4005.7 | p. 253, table 4-3 |
| ID-006 | Fragmentation can give sequence information: a different measurement from mass | pp. 253–254 |
| ID-007 | The techniques are complementary; judgement rests on the set | p. 244 |

### The two that took the most care

**ID-002 — declining the source's own confidence.** Grant writes that a correct
mass *"proves in one step that the synthesis was successful."* He is describing a
chemist checking their own synthesis of a known sequence. A clinic comparing an
unfamiliar sample against a supplier's stated mass is in a materially weaker
position, because the expected value itself comes from the party supplying the
material. The claim records the narrower form, and `uncertaintyText` says
explicitly that Grant's wording is stronger and why it was not adopted.

**ID-006 — the most useful thing on the page.** Mass determination and sequence
determination are two different measurements made on the same class of
instrument. Grant treats them in separate sections. **A document saying "LC-MS"
does not indicate which was performed.**

---

## 2. Sources used

Only **SRC-006**, already held, verified and offset-established. No new source
was introduced, as the brief directed: the existing clean academic source was
inspected first and carried the topic.

---

## 3. Primary-source trace — attempted, and honestly incomplete

The project's first serious Stage 8 trace. Grant cites two works for the
sequencing capability behind ID-006:

> Hunt, D. F., Shabanowitz, J., Yates, J. R., Griffin, P. R., and Zhu, N. Z.
> (1988). In *Analysis of Peptides and Proteins*, C. McNeil, ed., Wiley,
> pp. 151–165.

> Griffin, P. R., Martino, P. A., McCormack, A. L., Shabanowitz, J., and Hunt,
> D. F. (1990). Protein and oligopeptide sequence analysis on the TSQ-70 triple
> quadrupole mass spectrometer. Academic Press, pp. 419–425.

Both are chapters in edited volumes, not journal articles, and neither has a DOI.
Searched 11 September 2026: **no lawful free full text for either.** The 1988
volume is the proceedings of the Fourth Texas Symposium on Mass Spectrometry.

**Outcome: neither was obtained, so neither has been read.** ID-006 stays
attributed to Grant as a secondary source; `primarySourceVerified` remains
**false** on every identity claim, asserted by test. Recorded as gap type
`primary_source_missing` and tracked as **V-022**.

Marking the trace complete because the citations were located would have improved
the metric and degraded the record. The metric's own note was corrected to say
so.

---

## 4. Source correction

The trace produced a real bibliographic finding. **Grant gives the 1988 editor as
"C. McNeil". The volume is edited by C. J. McNeal.** Recorded against SRC-006's
integrity notes rather than propagated. It affects no claim.

This is the first correction this project has made *to* a source rather than to
its own record of one.

---

## 5. Evidence gaps

Five recorded, three of them things a reader would expect the page to settle.

| Statement not made | Type |
|---|---|
| That a matching mass establishes the sequence | `no_current_reviewed_evidence` |
| That mass spectrometry cannot distinguish species of equal mass | `no_current_reviewed_evidence` |
| How far an observed mass may differ and still be acceptable | `numerical_threshold_not_established` |
| What the primary literature actually demonstrates | `primary_source_missing` |
| That identity says anything about content, sterility or endotoxin | `source_missing` |

The second is the disciplined one. *"Mass spectrometry cannot distinguish
positional isomers"* is widely understood and would have been easy to write. It
is not in the pages read, and whether a method resolves such species depends on
the instrument, the fragmentation and the compound — so it is recorded as open. A
test asserts no claim contains "cannot distinguish".

---

## 6. Identity and HPLC

The path is now two-way, and both directions are evidence-backed.

| From → To | Type | Basis |
|---|---|---|
| hplc-purity → identity-testing | `commonly_conflated` | HPLC-002 *(existing)* |
| identity-testing → hplc-purity | `commonly_conflated` | ID-001 |
| identity-testing → mass-spectrometry | `same_process` | ID-002 |
| identity-testing → peptide-content-assay | `commonly_conflated` | ID-007 |
| identity-testing → sterility | `not_addressed_by` | gap 05 |
| identity-testing → coa-literacy | `scoped_by` | structural |

**One edge per pair per direction.** A `complementary` edge between purity and
identity was drafted and removed: it would have put the same topic under two
headings on the same page. A test enforces this.

No new assertion was written into any edge; the structural edge's rationale is
tested against assertive language.

---

## 7. Certificate-reader integration

The specimen certificate's LC-MS entry now links to **identity-testing** rather
than to mass-spectrometry — the reader's question is what the result establishes,
not which instrument produced it.

The three states stay apart, as C.5 built them:

| State | Where it lives |
|---|---|
| The document reports | `certificate_tests.result_text` — *"Observed mass consistent with the expected monoisotopic mass"* |
| This index interprets | The linked topic, and the entry's teaching note — *no acceptance criterion is stated, so "consistent with" is the laboratory's judgement rather than a measurement against a limit* |
| Independently verified | `independently_verified` — **false**, and the constraint refuses to set it without saying what was checked |

---

## 8. Visuals

One new figure: **IdentityComparisonFigure** — intended peptide → calculated
mass, sample → measured mass, meeting in a comparison.

It exists because *"identity confirmed"* hides the structure of the thing. A
report giving an observed value with nothing to compare it against has not
completed the comparison, and a reader who has seen this shape can notice that.

**No numbers in the figure**, for the same reason as the chromatography figure:
the worked example is one peptide on one instrument, and putting its figures in a
diagram would read as a tolerance. The source states none.

The quality-dimensions figure is now shown on both topics, since both are places
a reader is being told these are separate questions.

---

## 9. Accessibility and responsive

Measured, not assumed.

| Check | Result |
|---|---|
| Horizontal overflow at 375 / 768 / desktop | none |
| `h1` count | 1 |
| Heading hierarchy | h1 → h2 → h3, no skips |
| Text below 4.5:1 contrast | **0** |
| SVG title + desc + `aria-labelledby` | both figures |
| Figure geometry | no text outside the viewBox, no overlapping labels |

Screenshot capture remained intermittently blank in this environment, so layout
was verified by DOM and SVG geometry — which is stricter than looking.

---

## 10. Tests

**271 passing across 22 files** (up from 245/20). Eighteen new in
`tests/integration/identity-testing.test.ts`:

- purity does not imply identity, and the separation is sourced from identity's
  own side
- mass determination and sequence determination stay separate measurements
- no claim asserts a matching mass establishes the sequence
- the specificity limit is recorded as open, not asserted
- the worked example keeps its exact values and context, and is explicitly not an
  acceptance criterion
- `primarySourceVerified` is false on every identity claim
- the failed trace is a recorded gap, tracked as V-022
- every claim is attributed to the source actually read
- the claim does not inherit the source's strongest wording
- identity claims carry no certificate scope
- the purity link is reciprocal and evidence-backed
- each pair appears under one heading only
- no relationship edge carries an unsupported assertion
- the certificate identity entry links to the topic and is unverified
- simple mode is free of method vocabulary
- the topic stays off the public surface while unpublished

---

## 11. Engineering findings

1. **`gap_type` reached the database and the public view and stopped there** — it
   was never carried into the reader. Precisely the "scope reached the database
   and stopped" failure recorded in C.5, repeated on a different field, and found
   by a test rather than by reading. Now carried through.
2. **Three latent test defects and one application defect** found by shuffling
   (§0).
3. **Grant's reference list contains an error** (§4).

---

## 12. Review state

`ready_for_scientific_review`, via `npm run evidence:submit`. All 14 locators in
the register resolve. Nothing is published; the gate still requires a human
scientific approval that no one has given.

Current metrics: 21 claims, all with exact locators, all carrying a recorded
reading, all high-impact ones stating uncertainty. 0 published. 0 primary-source
traced, with the attempt recorded as V-022.

---

## 13. Owner decisions required

1. **Whether to pursue the two Hunt/Griffin chapters** (V-022) through library
   access or purchase, or to accept Grant as a secondary source for ID-006 and
   close the trace as "attempted, not obtainable". Either is defensible; the
   record currently reflects the second without deciding it.
2. **Whether `mass-spectrometry` should remain a separate topic.** Identity now
   covers the method substantively, and the separate topic risks becoming a stub
   that says the same thing. The alternative is to fold it into identity and
   retire the topic.
3. **Q2(R2) and Q14 remain held and unextracted.** Still not required by any page
   in preparation.

---

## 14. Recommended next topic

**Peptide content / assay.**

1. It is the third corner of the triangle. Purity and identity are now written
   and both point at content as a separate question; content points back at
   nothing.
2. **The source is already held and the material already located.** Grant p. 261
   — *"amino acid analysis is still the best method for peptide quantitation"* —
   is already cited by HPLC-005, and pp. 262–263 carry the compositional analysis
   detail that was read during C.2 and not extracted.
3. It completes the reader's path from a certificate. The specimen certificate
   has purity, identity, water and sterility entries; content is the one a reader
   most often conflates with purity, and the one where "99% pure" misleads most.
4. **It does not depend on the USP subscription**, which still blocks sterility,
   endotoxin, residual solvents and water.

After content, the binding constraint is the USP-NF subscription, and the honest
position remains that four quality topics cannot be written until it exists.
