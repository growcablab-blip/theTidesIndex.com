# TESAMORELIN — EVIDENCE REPORT

The first compound record built from held sources. Extracted, located, and not
reviewed by anyone.

`/peptides/tesamorelin` · packet `data/seed/evidence/tesamorelin.json`

---

## 1. What was extracted, and from where

**One source.** SRC-002 — LaValle, Crozier, Cleaver and Heyman, *Peptide
Handbook: A Professional's Guide to Peptide Therapeutics*, 2022 — printed pages
141–146 of the tesamorelin monograph.

Six locations, eight claims, five gaps, one route, one protocol, one
disagreement, one regulatory entry.

That is one source for a compound with an approved product and named Phase III
trials, and it is the most important limitation on this record. Every number
here reaches the index through a practitioner handbook's summary of literature
this index has not read.

## 2. Why this compound

It was chosen as the *easy* half of a pair, to prove the architecture does not
inflate a strong evidence base. Tesamorelin has what almost nothing else in this
register has: a named product, a named manufacturer, an approved indication, and
two Phase III trials with an n.

The risk on a record like this is not fabrication. It is **borrowed authority** —
reporting a trial result as though this index had read the trial, or letting an
approval for one indication read as evidence for any other use.

## 3. The eight claims

| Key | Weight | In one line |
|---|---|---|
| TESA-001 | critical | A GHRH analogue that stimulates endogenous GH, not exogenous GH |
| TESA-002 | critical | An approved product exists: Egrifta, Theratechnologies, with a stated composition |
| TESA-003 | critical | Two Phase III trials, n=412: visceral fat −15% over 26 weeks, subcutaneous fat and BMI unchanged |
| TESA-004 | critical | The result is confined to HIV-associated lipodystrophy |
| TESA-005 | high | Half-life 26 min in healthy subjects, 38 min in HIV-infected patients |
| TESA-006 | high | IGF-1 +181 µg/L in men; TSH, LH, ACTH and prolactin not substantially affected |
| TESA-007 | critical | Contraindications, including pregnancy, active malignancy and pituitary disease |
| TESA-008 | critical | The source states that long-term use has not been studied |

**TESA-004 is the one that matters architecturally.** The inference from
"reduces visceral fat in HIV lipodystrophy" to "reduces visceral fat" is the
likeliest misreading of this record, and it is what most non-clinical interest in
the compound rests on. It is recorded as its own critical claim rather than as a
caveat on TESA-003, because a caveat can be skipped and a claim cannot.

**TESA-008 is unusual.** A source stating the limit of its own evidence is worth
recording as a claim in its own right. It bounds everything else: a 26-week
result and a 26-minute half-life say nothing about years.

## 4. Where the record stops

Five recorded gaps:

1. **The regulatory position.** This index holds no regulatory document, no
   approved labelling and no marketing authorisation. It knows a product exists
   because a handbook names one. It cannot state the authority, the jurisdiction,
   the date or the approved indication in a regulator's words.
2. **The trials themselves.** Not opened. No trial name, registration number,
   journal, comparator or measurement method is known here.
3. **Anything outside the indication.** No evidence held for use in anyone
   without HIV-associated lipodystrophy.
4. **Long-term use.** The source says it has not been studied.
5. **Any route but subcutaneous.**

A sixth records that the reported cognitive findings in older adults concern
*GHRH administration*, which this index cannot confirm is the same intervention.

## 5. The disagreement

One, and it is inside a single source. The handbook records 2 mg as the
manufacturer's recommendation and 1 mg as what "many experts" use — on the
stated basis of **cost effectiveness**, not comparative evidence.

That is worth surfacing precisely because it is easy to read the lower figure as
evidence that less works as well. An amount chosen for cost is not an amount
shown to be equivalent, and the record says so.

## 6. What the architecture had to do

- **Separate the approval from the evidence.** The regulatory entry records
  `approved` with an authority field that says, in words, that no source here
  names the approving authority. A status without a source is not a status.
- **Keep a trial result at one remove.** Every trial claim's uncertainty text
  says the primary paper has not been opened.
- **Date the regulatory statement.** `checkedAt` is the date the *source was
  read*, not the date of any regulatory action, and the note says so.

## 7. State

| | |
|---|---|
| Publication | Unpublished |
| Review | None. No human has read this record |
| Claims located | 9 of 9 evidence links resolve to an exact page |
| Primary sources traced | 0 |
| Patient mode | No amount appears anywhere in the payload |

## 8. What would improve it most

In order:

1. **The approved labelling.** It would convert the strongest fact on this record
   from hearsay into a citation, and give the indication in the regulator's own
   words.
2. **The two Phase III papers.** They would let the central claim rest on the
   trial rather than on a summary of it.
3. **A second practitioner or academic source**, to show whether the handbook's
   framing is idiosyncratic.
