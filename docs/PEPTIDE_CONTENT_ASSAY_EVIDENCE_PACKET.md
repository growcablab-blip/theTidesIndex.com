# PEPTIDE CONTENT / ASSAY — EVIDENCE PACKET

What was extracted, the terminology decisions behind it, and the calculation this
index deliberately does not publish.

**Source:** SRC-006 — Grant, G. A. (ed.), *Synthetic Peptides: A User's Guide*,
2nd edn, Oxford University Press, 2002, chapter 4.

**Pages reopened for this packet:** 223, 224, 261, 262, 263, 266. Read again
rather than carried over from the C.2 extraction, as the brief directed. The
`table 4-1` locator was re-resolved visually before being relied on.

---

## 1. Terminology decisions

The brief asked for these to be held apart, and the decisions were made against
the source rather than against usage.

| Term | Decision |
|---|---|
| **Purity** | Proportion among what a method detected. A ratio |
| **Identity** | What the material is |
| **Content / assay** | How much of the target is present. A quantity |
| **Potency** | **Not used.** Nothing held relates chemical amount to biological activity |
| **Label claim** | A statement by whoever wrote the label. Not analytical evidence |
| **Net peptide content** | **Not adopted.** See below |

### "Net peptide content"

The phrase appears **nowhere in SRC-006** — searched, zero pages. It is common in
commercial peptide testing, and adopting it would mean defining it from
commercial usage rather than from a source, when different laboratories may
calculate it differently.

This index uses **peptide content / assay** and records the term itself as a gap
of type `terminology_unresolved`. When a source defines it — with its method and
its calculation basis — it can be captured properly.

### Grant's own words

Grant writes about *quantitation* and *the amount of peptide*. Those are the
terms the claims use.

---

## 2. Claims captured

Six, all `academic_reference`, all resting on SRC-006.

| Key | Claim | Locator |
|---|---|---|
| CON-001 | Quantity and heterogeneity are different analytical questions; the table credits quantitation to amino acid analysis and none to RP-HPLC | p. 223 table 4-1, p. 224 |
| CON-002 | Grant describes amino acid analysis as the best method for determining the amount of peptide | pp. 261, 262 |
| CON-003 | Quantitation is **indirect** — hydrolysis, then quantitation of the fragments, then conversion back | pp. 262, 263 |
| CON-004 | Several residues do not survive acid hydrolysis; Glu and Asp values represent Glu+Gln and Asp+Asn | pp. 266, 224 |
| CON-005 | Post-column ninhydrin does not quantitate accurately below approximately 100 pmol | p. 263 |
| CON-006 | The same analysis yields a mole ratio for comparison against the intended sequence — composition, not quantity | pp. 262, 223 |

### The claim that carries the most weight — CON-003

**Amino acid analysis does not weigh the peptide.** It destroys it.

Grant: all amino acid analysis techniques analyse free amino acids, so any
polypeptide must first be broken into its individual amino acids by hydrolysis of
the peptide bonds, commonly with 6N hydrochloric acid. The amount of each is
measured, and the average is converted back into an amount of peptide.

Every limitation in CON-004 and CON-005 follows from that mechanism. A reader
looking at a reported amount is entitled to know it was arrived at by taking the
sample apart.

### The restraint in CON-002

Grant calls amino acid analysis *"still the best method for peptide
quantitation"*. He is surveying the techniques in his own chapter. **A method
described as best among those discussed is not a statement that others are
invalid, or that any product must use it** — and the claim's uncertainty text and
a separate `scope_not_established` gap both say so.

---

## 3. Numerical values

| Value | Basis |
|---|---|
| ~100 pmol | Lower limit below which **post-column ninhydrin detection** does not quantitate accurately, as of 2002 |

Recorded with its method attached, because it belongs to that detection chemistry
and not to amino acid analysis generally — Grant goes on to describe
o-phthalaldehyde detection reaching the low picomole range and more sensitive
precolumn derivatisation procedures. The uncertainty text states it is not a
general sensitivity limit and not an acceptance criterion.

No other number was extracted. Grant's table 4-4 tabulates a worked analysis, and
it was **not** captured: it is one 24-residue peptide's composition, and lifting
its figures would put numbers on a page where they could only be misapplied.

---

## 4. The calculation this index does not publish

> **gross mass × HPLC purity = peptide content**

**No source held here establishes this, and it is not published.**

Grant assigns quantitation to a separate measurement and describes no arithmetic
relating a purity figure to an amount. Such a calculation would depend on the
analytical framework, on what else the material contains, and on the basis of the
purity figure itself — none of which this index can currently source.

Recorded as a gap. A test asserts that no formula of that shape appears anywhere
in the topic's prose or claims, in any of the forms it would take.

This is the single most important restraint in the phase. The calculation is
obvious-looking, widely circulated, and would arrive carrying this index's
authority.

---

## 5. Evidence gaps

Six, and they are the majority of what a reader might expect this page to settle.

| Statement not made | Type |
|---|---|
| That an amount can be calculated from gross mass and purity | `no_current_reviewed_evidence` |
| What proportion of a preparation is water, counterion or salt | `source_missing` |
| An acceptable tolerance between label and measurement | `numerical_threshold_not_established` |
| What method a product is required to use | `scope_not_established` |
| That a measured amount indicates biological potency | `no_current_reviewed_evidence` |
| A definition of "net peptide content" | `terminology_unresolved` |

The water and counterion gap repeats the restraint recorded on the purity topic
in C.2, where HPLC-005's uncertainty text already declined to assert it. The same
point declined twice, in two places, is the architecture working.

---

## 6. Primary-source trace

Grant cites general references for amino acid analysis (Ozols 1990; Dunn 1995;
Crabb et al. 1997) and the historical development of the method (Moore and Stein
1948; Moore et al. 1958; Spackman et al. 1958 — Nobel Prize in Chemistry, 1972).

**No trace was attempted.** None of these is load-bearing for a claim in this
packet: the claims rest on what Grant states about the method's capabilities and
limits, not on what the cited works demonstrate. Per the brief, a trace is not
forced merely to improve a metric.

The historical citations are recorded here so a future trace can begin from them
if the method's development ever becomes load-bearing.

---

## 7. Certificate integration

The specimen certificate now carries a **content entry that was never measured**,
which is the more instructive case.

| Field | Value |
|---|---|
| Label | `stated_strength` = *"Labelled 10 mg per vial (label claim, not a measured result)"* |
| Document reports | `result_text` = *"Not determined"*; `result_numeric` and `analytical_method` **null** |
| This index interprets | The linked topic, and the entry's teaching note |
| Independently verified | **false** |

The teaching note makes the point directly: the vial is labelled 10 mg, this
report does not measure how much peptide is present, and the purity figure above
does not supply the missing number.

**A defect found while doing this.** The entry was first written with
`analyticalMethod: "Not stated"` — a *string saying* not stated — which the
transparency dimension counted as stated. A field the document does not carry is
`null`. This is the same class of error as the C.5 "partial coverage reads as
absence" defect, in reverse.

---

## 8. The quality triangle

`AnalyticalQuestionsFigure` — three questions side by side, with `highlight`
marking the one the reader is on. Reused across purity, identity and content, and
available to the certificate page.

| | Question | Approach |
|---|---|---|
| Purity | How mixed is it? | Separation |
| Identity | What is it? | Mass measurement |
| Content | How much is present? | Quantitation |

No ticks, no ordering, no totals, and an explicit caption that this is **not** a
statement that any product must be tested for all three — that is a regulatory
question and this index holds no regulatory source.

---

## 9. Review state

`ready_for_scientific_review`, through the real submission path. Nothing
published; the gate still requires a human scientific approval.

```bash
npm run evidence:locators
```

All locators in the packet resolve, including `table 4-1`.
