# PHASE C.8 REPORT — Peptide content / assay

The third corner. Purity and identity each pointed at content as a separate
question; content pointed back at nothing. The analytical triangle is now closed,
and every edge inside it rests on a claim.

---

## 0. Owner decisions applied

**V-022.** Recorded as *primary source trace attempted / source identified / full
text not lawfully or reliably obtainable / primary verification not completed*,
priority lowered, and the bibliographic detail retained so the trace can be
reopened if institutional access appears. Grant remains the citable secondary
source; the underlying claims are not marked primary-verified. The McNeil/McNeal
discrepancy stays as a source-level note on SRC-006.

**Mass spectrometry.** Kept as a separate topic, in preparation, and **not
populated to avoid being a stub**. The distinction is now recorded in
`QUALITY_RELATIONSHIP_MAP.md`: identity testing is the *quality question* — what
evidence supports that this is what it is claimed to be — and mass spectrometry
is the *method question*. Identity summarises the method's role; the method topic
would go deeper. The `identity-testing → mass-spectrometry` edge is
`same_process`, resting on ID-002, with no duplicated claims.

---

## 1. Claims captured

Six, all from SRC-006, all locator-verified. Pages 223, 224, 261, 262, 263 and
266 were **reopened and re-read** rather than carried over from C.2, as directed.
Full detail in `docs/PEPTIDE_CONTENT_ASSAY_EVIDENCE_PACKET.md`.

| Key | Claim | Locator |
|---|---|---|
| CON-001 | Quantity and heterogeneity are different analytical questions | p. 223 table 4-1, p. 224 |
| CON-002 | Amino acid analysis described as the best method for determining the amount | pp. 261, 262 |
| CON-003 | Quantitation is **indirect** — hydrolysis, quantitate the fragments, convert back | pp. 262, 263 |
| CON-004 | Several residues do not survive hydrolysis; Glu and Asp report Glu+Gln and Asp+Asn | pp. 266, 224 |
| CON-005 | Post-column ninhydrin does not quantitate accurately below ~100 pmol | p. 263 |
| CON-006 | The same analysis yields a mole ratio — composition, not quantity | pp. 262, 223 |

**CON-003 is the one that matters most.** Amino acid analysis does not weigh the
peptide; it destroys it. The sample is hydrolysed, the fragments are measured, and
the amount is worked back. Every limitation in CON-004 and CON-005 follows from
that mechanism, and a reader looking at a reported amount is entitled to know it
was arrived at by taking the sample apart.

---

## 2. The calculation this index does not publish

> **gross mass × HPLC purity = peptide content**

**No source held here establishes it, and it is not published.**

Grant assigns quantitation to a separate measurement and describes no arithmetic
relating a purity figure to an amount. The calculation would depend on the
analytical framework, on what else the material contains, and on the basis of the
purity figure itself — none of which this index can source.

Recorded as a gap. A test asserts no formula of that shape appears in the topic's
prose or claims, in any of the forms it would take (`×`, `multiplied by`,
`mass x purity`, `purity … gives … amount`).

This is the most important restraint in the phase: the calculation is
obvious-looking, widely circulated, and would arrive carrying this index's
authority.

---

## 3. Terminology decisions

| Term | Decision |
|---|---|
| Purity | Proportion among what a method detected. A ratio |
| Identity | What the material is |
| Content / assay | How much of the target is present. A quantity |
| **Potency** | **Not used.** Nothing held relates chemical amount to biological activity |
| **Label claim** | A statement by whoever wrote the label. Not analytical evidence |
| **Net peptide content** | **Not adopted** |

"Net peptide content" appears **nowhere in SRC-006** — searched, zero pages. It is
common in commercial testing, and adopting it would mean defining it from usage
rather than from a source, when laboratories may calculate it differently. The
term itself is recorded as a `terminology_unresolved` gap.

---

## 4. Methods captured

**Amino acid analysis only**, because it is the only quantitative method any held
source describes. Grant mentions others in passing — UV spectroscopy for
monitoring tryptophan integrity, which he says does not generally yield accurate
quantitation — and the packet does not build a method list from general
knowledge.

The topic architecture accommodates more methods when sources support them.

**CON-002 carries an explicit restraint**: Grant calls amino acid analysis *"the
best method"* among the techniques he surveys. That is not a statement that others
are invalid, or that any product must use it. A `scope_not_established` gap
records that what a product is required to use is a regulatory question no held
source answers.

---

## 5. Evidence gaps

Six — the majority of what a reader might expect the page to settle.

| Statement not made | Type |
|---|---|
| That an amount can be calculated from gross mass and purity | `no_current_reviewed_evidence` |
| What proportion is water, counterion or salt | `source_missing` |
| An acceptable label-to-measurement tolerance | `numerical_threshold_not_established` |
| What method a product is required to use | `scope_not_established` |
| That a measured amount indicates potency | `no_current_reviewed_evidence` |
| A definition of "net peptide content" | `terminology_unresolved` |

The water and counterion gap repeats a restraint already recorded in C.2, where
HPLC-005's uncertainty text declined to assert the same point. **The same
inference declined twice, in two places, by two different mechanisms** — that is
the architecture working rather than a duplication.

---

## 6. Primary-source trace

**None attempted.** Grant cites general references for amino acid analysis (Ozols
1990; Dunn 1995; Crabb et al. 1997) and the method's historical development
(Moore and Stein 1948; Moore et al. 1958; Spackman et al. 1958). None is
load-bearing for a claim here: the claims rest on what Grant states about the
method's capabilities and limits, not on what those works demonstrate.

Per the brief, a trace is not forced to improve a metric. The citations are
recorded in the packet document so a future trace can start from them.

---

## 7. Certificate integration

The specimen now carries a **content entry that was never measured**, which
teaches more than one that was.

| State | Value |
|---|---|
| Label claim | *"Labelled 10 mg per vial (label claim, not a measured result)"* |
| Document reports | `result_text` = *"Not determined"*; numeric and method **null** |
| This index interprets | The linked topic, plus the entry's teaching note |
| Independently verified | **false** |

The teaching note: the vial is labelled 10 mg, this report does not measure how
much peptide is present, and the purity figure above does not supply the missing
number.

**A defect found in the process.** The entry was first written with
`analyticalMethod: "Not stated"` — a *string saying* not stated — which the
transparency dimension counted as **stated**. A field the document does not carry
is `null`. Same class as the C.5 "partial coverage reads as absence" defect, in
reverse.

---

## 8. The quality triangle

`AnalyticalQuestionsFigure`, reusable, with `highlight` marking the topic the
reader is on. Now rendered on all three analytical topics.

| | Question | Approach |
|---|---|---|
| Purity | How mixed is it? | Separation |
| Identity | What is it? | Mass measurement |
| Content | How much is present? | Quantitation |

No ticks, no ordering, no totals, and a caption stating explicitly that this is
**not** a claim that any product must be tested for all three.

---

## 9. Tests

**287 passing across 23 files** (up from 271/22). Sixteen new in
`tests/integration/peptide-content.test.ts`:

- no purity-to-amount formula appears anywhere, in any form
- the absence of that calculation is a recorded gap
- "net peptide content" is not adopted, and is recorded as a terminology gap
- content is not equated with potency
- content stays separate from purity and identity, sourced from its own side
- amino acid analysis is not claimed to be the only valid assay
- quantitation is recorded as indirect
- a reported figure keeps its unit **and its method** (100 pmol, post-column ninhydrin)
- no label-to-measurement tolerance is claimed
- the label claim is held apart from an analytical result
- the unmeasured content entry is shown rather than omitted, with null fields null
- the purity result never stands in for the missing content result
- the triangle is closed and **every edge inside it rests on a claim**
- no assay claim is written into a relationship edge
- simple mode carries no assay jargon
- the topic stays unpublished and off the public surface

---

## 10. Visual QA

| Check | Result |
|---|---|
| Horizontal overflow at 375 / 768 / 1280 | none |
| `h1` count | 1 |
| Text below 4.5:1 contrast | **0** |
| Figure title + desc + `aria-labelledby` | present |
| Review status rendered | *Awaiting scientific review · Not published* |

Screenshot capture remained unreliable in this environment — and on this pass the
Browser pane was hidden, which reports `clientWidth: 0` and makes an overflow
comparison meaningless. Measurements were retaken with explicit viewport sizes.
Worth recording: a zero-width measurement is not a passing measurement, and an
automated check that did not notice would have reported overflow on every page.

---

## 11. Review state

All four packets submitted through the real path and sitting at
`ready_for_scientific_review`. **20 locators resolve, 0 to check, 0 failed.**
Nothing published.

---

## 12. Owner decisions required

1. **Whether the certificate page should carry the three-question figure.** It is
   built to be reusable and is currently on the three analytical topics only.
2. **Whether to pursue a modern quantitative analytical source.** Everything on
   this page is from a 2002 textbook describing one method. That is honest and
   thin, and it is the topic where a current source would add most.
3. **Q2(R2) and Q14 remain held and unextracted.** They were inspected for this
   phase and offer general validation principles, not peptide quantitation — using
   them here would have meant inventing peptide-specific content from general
   guidance, which the brief forbade.

---

## 13. Recommended next phase

**The certificate page itself — `/quality/certificate-of-analysis`.**

The reasoning is that everything it needs now exists and nothing else does:

1. **Three of its four analytical entries now lead somewhere.** Purity, identity
   and content are written; the specimen certificate links to all three. Sterility
   is the one that leads to a preparation notice, and that is honest.
2. **The C.5 architecture has never been rendered.** The taxonomy, transparency
   dimensions, chain-of-custody model and authenticity states were built and
   tested but the page was not built. Reading the rendered page is a required
   stage, and it has found a real defect in every phase that has run it.
3. **It is where a clinic actually starts.** A reader arrives holding a document,
   not a question about chromatography. The quality topics are what the
   certificate page should be able to send them to — and now it can.
4. **It needs no new source.** Q7 §11.4 is extracted and scoped.

After that, the binding constraint remains the USP-NF subscription: sterility,
endotoxin, residual solvents and water cannot be written until it exists, and
those four are what the certificate page will most visibly lack.
