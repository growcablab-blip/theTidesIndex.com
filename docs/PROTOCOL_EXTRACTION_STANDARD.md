# PROTOCOL EXTRACTION STANDARD

Protocols are the highest-risk records in this index. A claim that is wrong
misleads; a protocol that is wrong is a set of instructions somebody may follow.

Nothing in this document is yet in production use: no practitioner protocol has
been extracted. It is written now, from the analytical extractions in C.2 and
C.5 and from the rules laid down in Phase A, so that the first one is done under
a standard rather than under time pressure.

---

## 1. The three prohibitions

These are not guidance.

**Never average authors.** Two practitioners describing different regimens are
two records. A mean of them is a regimen no source states and nobody is
accountable for — a synthetic protocol wearing the authority of both.

**Never translate animal regimens into human ones.** Not by allometric scaling,
not by body-weight arithmetic, not "for illustration". An animal regimen is
recorded with its species and its model, and stays there.

**Never create a "recommended dose" field** unless a source carries a directly
applicable approved recommendation *and* the editorial architecture explicitly
supports it. The absence of that field is deliberate. Adding it would convert
every extracted regimen into advice.

---

## 2. What every protocol record carries

| Field | Rule |
|---|---|
| Source | Always |
| Exact locator | Always. Page, chapter, table — see `LOCATOR_STANDARD.md` |
| Peptide or combination | Named as the source names it, plus the resolved compound |
| Objective / context | What the source was trying to achieve |
| Population or model | **Species and model.** "Rat" is not "patient" |
| Formulation | As reported. Null if the source does not say |
| Route | See `§5` |
| Amount as reported | **The source's own figure and form.** Never normalised in place |
| Unit | Exactly as printed |
| Frequency, timing, duration | As reported |
| Titration | As reported |
| Cycle / off period | As reported |
| Combinations | Other agents in the same regimen |
| Monitoring | As reported |
| Cautions | As reported, including any the source states and this index would not |
| Regulatory context | Approval status of the compound for that use, date-stamped |
| Evidence type | Practitioner reference, human trial, animal study — never inferred |

A field the source does not state is **null**, and renders as *not stated*. It is
never filled from a neighbouring protocol, a different author, or general
knowledge.

---

## 3. Preserving the source's own form

A protocol must remain auditable against the page it came from. That means the
source-reported form is stored, and any normalised representation is stored
**separately and additionally** — never in place of it.

If a source says `250 mcg twice weekly`, that is what is stored. A normalised
`micrograms per week` may sit alongside it for comparison. The reverse — storing
the normalised figure and reconstructing the original for display — loses the
audit and introduces arithmetic nobody checked.

See `EVIDENCE_EXTRACTION_WORKFLOW.md` §6 for the numerical rules that apply to
every figure in a protocol.

---

## 4. Patient mode

The `public_v_protocol_simple` view **has no dosing columns at all** — no amount,
unit, frequency, timing, duration, cycle, titration, or number-heavy monitoring
instruction from which a regimen could be reconstructed.

This is a database boundary, not a front-end one. A protocol extraction that
would require patient mode to hide a field is extracting the field into the wrong
place. Check the view, not the component.

---

## 5. Routes

A route is not a checkbox. A route record is the tuple:

```
route + compound + formulation + population/model + source + PK context + evidence type
```

**Do not infer that a route used in practice has published human PK evidence.**
That a practitioner describes subcutaneous administration is evidence that they
describe it. Whether human pharmacokinetic data exists for that compound by that
route is a separate question with its own source, and if nothing is held, it is
a gap of type `route_not_established`.

---

## 6. Disagreement is preserved, not resolved

Two sources describing different regimens for the same objective are recorded as
two protocols and, where the difference matters, as a `disagreement` with both
positions attached.

Do not reconcile automatically. Candidate explanations — different population,
different formulation, different era, different objective, preclinical versus
human — are recorded as *candidate* explanations, and the resolution requirement
states what evidence would settle it.

---

## 7. Practitioner sources

Practitioner books and interviews are legitimate sources of one thing: **what the
practitioner says.** That is recorded faithfully and labelled with its evidence
type. It is not upgraded by being repeated, and not deleted for being
unsupported.

- If the source cites studies, **trace them** (`EVIDENCE_EXTRACTION_WORKFLOW.md`
  §8). Record whether the primary source supports the characterisation.
- If sources cite each other, preserve the chain rather than collapsing it. Three
  books repeating one claim is one source, not three.
- If a statement is personal clinical experience, label it as such.
- If no original support can be found, **retain the statement** as practitioner
  commentary with `primary_source_missing` recorded. Erasing it loses the fact
  that it circulates, which is itself worth knowing.

SRC-004 is the standing example: ten pages of tabulated regimens with **no cited
sources and no stated derivation**. Its legitimate use is as evidence that those
figures circulate. Every number in it needs independent verification before it
could support anything else.

---

## 8. Before a protocol is submitted for review

- [ ] Every field either populated from the source or null
- [ ] Amounts and units in the source's own form, locator recorded
- [ ] Population and model recorded; species never implied
- [ ] Route tuple complete, or the missing parts recorded as gaps
- [ ] Evidence type assigned, not inferred from the source's confidence
- [ ] Regulatory context date-stamped
- [ ] Numerical values re-opened against the original (Stage 7 — mandatory)
- [ ] No averaging, no species translation, no recommendation field
- [ ] Contradictions with existing protocols recorded, not reconciled
- [ ] `public_v_protocol_simple` checked: nothing dosing-shaped reaches it
