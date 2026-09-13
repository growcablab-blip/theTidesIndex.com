# BPC-157 — EVIDENCE REPORT

The hard half of the pair. Three sources, three regimens, and no human study in
anything this index holds.

`/peptides/bpc-157` · packet `data/seed/evidence/bpc-157.json`

---

## 1. What was extracted, and from where

**Three sources**, all practitioner references:

| | | |
|---|---|---|
| SRC-002 | LaValle et al., *Peptide Handbook* (2022) | pp. 27–31 |
| SRC-003 | Campbell, *Optimize Your Health with Therapeutic Peptides* (2023) | pp. 187–188 |
| SRC-005 | Hack Smith, *The Complete Guide to Peptides* (2025) | persona regimens |

Nine locations, seven claims, seven gaps, three routes, five protocols, two
disagreements, one regulatory entry.

## 2. Why this compound

It was chosen as the compound most likely to break the architecture. BPC-157 is
discussed more than almost anything in the field; it has a large preclinical
literature; it has no approved product; and the sources that describe how to use
it do not agree.

The risk here is the opposite of tesamorelin's. Not borrowed authority —
**volume reading as weight**. A page that lists twenty reported mechanisms and
five regimens looks like a page about something well established, whatever the
caveats say.

## 3. The central finding

**No source held by this index reports a clinical trial of BPC-157.** Not a
small one, not a poor one. None.

That is recorded as `BPC-002`, a critical claim, because an absence stated as a
claim survives skim-reading and an empty section does not. Both practitioner
sources are explicit in their own framing — one writes "in laboratory studies
BPC-157 has been reported to", the other "in several animal studies, and even
more anecdotal testimonials from biohackers" — and the record quotes that framing
rather than paraphrasing it away.

The seven claims:

| Key | Weight | In one line |
|---|---|---|
| BPC-001 | high | A synthetic 15-residue peptide, sequence given, derived from a gastric protein |
| BPC-002 | critical | Every reported effect comes from laboratory or animal work; no human study is held |
| BPC-003 | high | Reported healing effects across tendon, ligament, bone, muscle, skin, gastric mucosa |
| BPC-004 | critical | Described as angiomodulatory — increasing and decreasing vessel formation |
| BPC-005 | critical | Subcutaneous, oral and topical all reported; no bioavailability for any |
| BPC-006 | critical | No approved product, no regulatory assessment, in anything held here |
| BPC-007 | critical | A short adverse-effect list from one handbook, which is not a safety dataset |

## 4. The two disagreements

**BPC-D-001 — how much.** Three sources, three regimens: 300–600 mcg daily;
250 mcg twice daily; 500 mcg daily. None cites a study establishing any of them.
The record does not average them, does not choose, and does not state a
recommended amount — it shows three attributed positions and names what would
settle it.

**BPC-D-002 — cancer.** One source advises caution in cancer because the
compound affects angiogenesis, and the *same source* reports that it inhibits
tumour cell lines and counteracts tumour cachexia. Both are on the record. This
is a disagreement *within* a source, and arguably the more instructive kind: the
description "increased when needed, decreased when needed" cannot be wrong, and
the clinical caution attached to it suggests the author does not fully rely on it
either.

## 5. What the architecture caught

Three real defects surfaced only because this record existed.

**A dose reached patient mode through a disagreement.** Protocol dosing has been
suppressed in the simple-mode query since the beginning — the simple relation has
no dosing columns at all. Disagreement *positions* were not, because until a
compound with dose-level disagreements existed there was nothing to leak. The
positions say "gives 250 mcg twice a day". Now suppressed in the query, with the
reader still told that sources differ, how many, and what kind each is.

**A formulation strength reached patient mode.** "2 mg/mL" is a concentration a
reader can compute a dose from. Route formulation, PK notes and bioavailability
are now suppressed in simple mode too.

**The development preview was the least safe surface.** The preview reads base
tables, and the base `protocols` table has no `patient_visibility` filter — the
view *is* the filter. So patient mode in preview would have shown protocols
patient mode is not allowed to show. That is the worst place for such a bug:
visible only to people who already know what the page should say. The filter is
now restated explicitly on the preview path.

All three are pinned by `tests/integration/compound-records.test.ts`.

## 6. What the record refuses to do

- No recommended amount. Three sources, three regimens, no average.
- No human effect claimed, anywhere.
- No regulatory status beyond "not approved", with a note saying that is inferred
  from three handbooks naming no product rather than from a regulator.
- The oral route is recorded because a source reports it, and the record says
  plainly that nothing held here establishes whether a 15-residue peptide
  survives digestion — the question that decides whether the route means
  anything.

## 7. State

| | |
|---|---|
| Publication | Unpublished |
| Review | None |
| Claims located | 10 of 10 evidence links resolve to an exact page |
| Human evidence | **0** |
| Primary sources traced | 0 |
| Patient mode | No amount, no concentration, no regimen detail |

## 8. What would improve it most

1. **Any human study**, if one exists. Its absence is the defining fact of this
   record and the one most worth testing.
2. **A pharmacokinetic study**, for the oral route in particular.
3. **The primary papers** behind the angiogenesis claims, which would let
   BPC-D-002 be resolved rather than only recorded.

## 9. A note on locators

SRC-005's printed page offset is not registered, so its two locations are
recorded as file pages of the held copy and say so in the locator text. That is
checkable but not standard-conforming; registering the offset is a follow-up.
