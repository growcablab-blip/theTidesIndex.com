# IDENTITY TESTING — EVIDENCE PACKET

What was extracted, from where, what it supports, and what it deliberately
leaves open.

**Source:** SRC-006 — Grant, G. A. (ed.), *Synthetic Peptides: A User's Guide*,
2nd edn, Oxford University Press, 2002. Chapter 4, *Evaluation of the Synthetic
Product*, section *Detailed Characterization of Covalent Structure*.

**Locators:** the book's printed pages. The held copy runs eleven pages ahead, so
every locator reopens with:

```bash
npm run sources:read -- SRC-006 --printed 244
```

---

## 1. The scope caution that governs the whole packet

Grant writes for **a chemist evaluating a synthesis whose intended sequence is
known, using material they made themselves.** In that situation a measured mass
matching the calculated one is strong evidence, and Grant says so in strong terms.

A clinic comparing an unfamiliar sample against a supplier's stated mass is in a
materially weaker position, because the expected value itself comes from the
party supplying the material.

Every claim below is recorded in Grant's scope. None is extended to the clinic
case, and where Grant's own wording runs ahead of what this index will carry, the
claim records the narrower form and the uncertainty field says why.

---

## 2. Claims captured

Seven claims, all `academic_reference`, all resting on SRC-006.

| Key | Claim | Locator | Importance |
|---|---|---|---|
| ID-001 | Homogeneity and covalent structure are separate undertakings; separation methods give no structural information | p. 243 | critical |
| ID-002 | Overall mass determination is the most practical and common use of mass analysis, usually sufficient, particularly alongside other methods | p. 244 | critical |
| ID-003 | Mass measurement can reveal modifications invisible to other procedures | p. 244 | high |
| ID-004 | Electrospray produces multiply charged ions, so one homogeneous peptide gives multiple signals | p. 249 | high |
| ID-005 | A mass result is a measured value compared with a calculated one, with a margin — worked example 4005.3 / 4005.6 / 4006.5 against a calculated 4005.7 | p. 253, table 4-3 | high |
| ID-006 | Fragmentation can produce sequence information; a different measurement from mass determination | pp. 253–254 | critical |
| ID-007 | The techniques are complementary; judgement rests on the set | p. 244 | high |

### The claim that needed the most care — ID-002

Grant writes that a correct mass *"proves in one step that the synthesis was
successful and you have obtained the desired product."*

That is stronger than this index will carry forward, and it is scoped to a known
synthesis by the person who performed it. The claim records the narrower,
better-supported form — that mass determination is the common and usually
sufficient method, used in conjunction with others — and `uncertaintyText` states
plainly that Grant's own wording is stronger and why it was not adopted.

This is the source being reported accurately while the index declines to inherit
its confidence. Both halves matter.

### The claim most useful at a certificate — ID-006

Mass determination and sequence determination are **two different measurements
made on the same class of instrument.** Grant treats them in separate sections:
the first as routine, the second as an additional capability used when something
needs pinpointing.

A document saying "LC-MS" does not indicate which was performed. That is the
single most practically useful thing on the page.

---

## 3. Numerical values

Recorded exactly as the source gives them, unrounded and unconverted, with their
context attached (§6c of the extraction workflow).

| Value | Context |
|---|---|
| 4005.7 | Calculated mass, a specific 33-residue peptide |
| 4005.3, 4006.5 | Averaged masses from manual deconvolution of the electrospray spectrum |
| 4005.6 | Measured mass from MALDI, same peptide, from an (M+H)+ of 4006.6 |

Grant describes the agreement as excellent. **These are not an acceptance
criterion.** They are one worked example on one instrument in one laboratory, and
ID-005's uncertainty text says so: Grant states no general limit for how far an
observed mass may sit from a calculated one, and this index holds no source that
does.

---

## 4. Primary-source trace — Stage 8, attempted and honestly failed

Grant cites two primary works for the sequencing capability behind ID-006. This
was the project's first serious primary-source trace and it produced a useful
outcome, though not the one intended.

**The citations, as Grant gives them:**

> Hunt, D. F., Shabanowitz, J., Yates, J. R., Griffin, P. R., and Zhu, N. Z.
> (1988). In *Analysis of Peptides and Proteins*, C. McNeil, ed., New York, John
> Wiley and Sons, pp. 151–165.

> Griffin, P. R., Martino, P. A., McCormack, A. L., Shabanowitz, J., and Hunt,
> D. F. (1990). Protein and oligopeptide sequence analysis on the TSQ-70 triple
> quadrupole mass spectrometer. In *Current Research in Protein Chemistry*,
> J. J. Villafranca, ed., Academic Press, pp. 419–425.

**What the trace found.**

Both are chapters in edited volumes rather than journal articles, and neither has
a DOI. Searched 11 September 2026: no lawful free full text for either. The 1988
volume is the proceedings of the Fourth Texas Symposium on Mass Spectrometry.

**A bibliographic correction.** Grant gives the 1988 editor as *C. McNeil*. The
volume is edited by **C. J. McNeal**. A small error in the source, now recorded
against SRC-006's integrity notes rather than propagated. It does not affect any
claim.

**The outcome.** Neither primary was obtained, so neither has been read. ID-006
stays attributed to Grant as an academic secondary source and
`primarySourceVerified` remains **false**. Recorded as gap type
`primary_source_missing` and tracked as **V-022**.

This is the correct result. The alternative — marking the trace complete because
the citations were located — would have made the metric look better and the
record worse.

---

## 5. Evidence gaps recorded

Five, and three of them are things a reader would reasonably expect this page to
settle.

| Statement not made | Type |
|---|---|
| That a matching mass establishes the sequence | `no_current_reviewed_evidence` |
| That mass spectrometry cannot distinguish species of equal mass | `no_current_reviewed_evidence` |
| How far an observed mass may differ and still be acceptable | `numerical_threshold_not_established` |
| What the primary literature actually demonstrates | `primary_source_missing` |
| That identity says anything about content, sterility or endotoxin | `source_missing` |

The second deserves comment. *"Mass spectrometry cannot distinguish positional
isomers"* is widely understood and would have been easy to write. It is not in
the pages read, and whether a given method resolves such species depends on the
instrument, the fragmentation applied and the compound — so stating it flatly
would be a generalisation from intuition, which §7 of the brief and the gap
standard both forbid. It is recorded as open.

---

## 6. Relationship to the rest of the quality map

Five new edges out of identity, and the reciprocal that fixes the broken path.

| From → To | Type | Basis |
|---|---|---|
| identity-testing → hplc-purity | `commonly_conflated` | ID-001 |
| identity-testing → mass-spectrometry | `same_process` | ID-002 |
| identity-testing → peptide-content-assay | `commonly_conflated` | ID-007 |
| identity-testing → sterility | `not_addressed_by` | gap 05 |
| identity-testing → coa-literacy | `scoped_by` | structural |

The HPLC page's existing `commonly_conflated → identity-testing` edge now points
at a topic with something to say. **One edge per pair per direction:** a second
`complementary` edge between purity and identity was drafted and removed, because
it would have put the same pair under two headings on the same page.

---

## 7. Review state

The packet is at **`ready_for_scientific_review`**, reached through
`npm run evidence:submit` — an automated source check attributed to a named tool
run by a named editor, which is as far as work no person has reviewed can
honestly go.

Nothing is published. The gate is unchanged and still requires a human scientific
approval, which no one has given.

---

## 8. Verification

```bash
npm run evidence:locators
```

All locators in this packet resolve against the held file, including the
`table 4-3` marker. A resolved locator means the page exists and carries the
marker recorded — not that the statement is correct.
