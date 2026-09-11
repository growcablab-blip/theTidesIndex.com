# PHASE C.9 REPORT — Certificate of analysis

The page a reader arrives at holding something in their hand. The C.5
architecture had been built and tested and never rendered; it is now a page.

---

## 0. Two failure modes hardened first

### Semantic nulls

The same defect had appeared twice — a structured field holding `"Not stated"`,
counted as populated because a string existed. In C.5 that made a document
stating three of four methods report *"none stated"*; in C.8 it made a document
stating none report one.

Now enforced in three places:

- **`tides_is_placeholder(text)`** recognising 19 strings that mean "empty".
- **Check constraints** on `certificates`, `certificate_tests` and
  `source_locations` metadata columns.
- **A zod refinement** in the fixture schema, so a fixture fails at load with a
  readable message rather than at insert with a constraint name.

**The exception is deliberate and tested.** `certificate_tests.result_text` may
contain *"Not determined"* — that is what the document reports, and a
source-reported negative is a finding rather than a hole. The constraint covers
metadata and leaves the result column alone.

### Invalid measurements

`scripts/qa/visual-qa.ts` separates gathering from judging, so the judging is
pure and testable. A measurement is **invalid** — not pass, not fail — when the
viewport or scroll width is zero, the main region has zero width, the document
has not finished loading, a width is not a number, or **viewport emulation did
not take** (measuring 1265px and reporting it as a 375px result would be a pass
for a width nobody tested).

`allPassed` returns false if any measurement was invalid, and an empty run is
unchecked rather than clean.

**One calibration made against evidence rather than assumption.** Visibility was
initially an invalidator. During this phase the browser pane was hidden and the
page measured 1425px throughout — entirely correctly, because a hidden tab still
computes layout. The C.8 failure was *zero width* specifically. Invalidating on
visibility would have made the guard refuse to grade anything in the environment
it exists for, which is how a guard gets switched off. It is now a recorded
caveat.

---

## 1. Public page architecture

`/quality/certificate-of-analysis` — a static route shadowing `/quality/[slug]`
for the same record, so the page can assemble sections the generic template does
not have.

Fourteen sections; full detail in `docs/CERTIFICATE_OF_ANALYSIS_GUIDE.md`.

Page-specific sections live beside the route rather than in the shared component
directory: each is about *this page's argument* rather than about certificates in
general, and promoting them would invite reuse where the wording would stop being
true.

---

## 2. Certificate taxonomy

Five families, each with its issuer, the question it answers, and — the point —
**whether this index holds any content requirement for it**.

| Family | Requirements held |
|---|---|
| Manufacturer certificate | ICH Q7 §11.4 — API and intermediates only |
| Third-party analytical report | **None** |
| Finished-product release | **None** |
| Distributor or repacker certificate | ICH Q7 §11.4 and §17 — API and intermediates only |
| Unknown or other | **None** |

Three of five have none, and the card says so rather than leaving a blank. The
specimen is a third-party report, which Q7 does not govern — so the page's own
example is one the held requirements do not apply to, which is the most direct
way to make the scope boundary visible.

---

## 3. Q7 scope handling

The scope reaches the reader **three ways**: on the taxonomy card, in the
`certificateTypeScope` field, and inside the claim text itself (*"For an active
pharmaceutical ingredient or intermediate…"*).

A test asserts the third, because a scope living only in a field is a scope that
can be dropped in rendering — which happened in C.5 and cost a phase to notice.

---

## 4. Annotated specimen

Fictional, declared in four places, with a database constraint refusing a
specimen whose title does not declare itself. Rendered with **20 fictional
labels** on the page.

Deliberately imperfect: no manufacturer named, no acceptance criterion for
identity, no method for two of five tests, no content measurement despite a 10 mg
label, and sterility listed precisely because it was not performed.

**31 marked absences and 5 unverified results** on one page. That is the teaching
material.

---

## 5. Batch-linkage model

```
product → lot/batch → submitted sample → laboratory → report → result
```

The specimen is `stated_only`: the batch number is on the document because the
submitter wrote it there. `chainOfCustodyKnown` is false. Four states exist —
`established`, `stated_only`, `not_established`, `unknown` — so *a document
stating a link* and *a link being established* can be told apart.

---

## 6. Analytical-topic links

| Result | Topic | State |
|---|---|---|
| Purity by reversed-phase HPLC | HPLC / chromatographic purity | written |
| Identity by LC-MS | Identity testing | written |
| Peptide content | Peptide content / assay | written |
| Sterility | Sterility | **in preparation** |

Four results, four distinct topics, asserted by test. The sterility card shows
the name and its state and **nothing that topic would say if written** — which is
correct while the USP-NF subscription is outstanding.

---

## 7. Transparency dimensions

Eleven, each `present` / `partial` / `absent` with the specific fields named.
Partial coverage reported as a count.

**No score.** A test asserts no dimension carries `score` or `weight`, no label
reads like a grade, and there is no total. Document completeness is not product
quality, and a number would be read as the second.

---

## 8. Authenticity

Rendered as `not_checked`, with no notes. There is deliberately **no state
meaning "looks genuine"**. A constraint refuses any non-default authenticity
state without notes explaining what was checked.

---

## 9. Demonstration-data safety

| Guard | Mechanism | Tested |
|---|---|---|
| Only a declared specimen is public | `public_v_certificates` filters `is_specimen AND NOT is_demonstration` | yes — a real certificate inserted alongside does not appear |
| Cannot be mistaken for real | Title constraint, four on-page declarations | yes |
| Not in the search index | No indexing path; asserted absent | yes |
| Not indexed by engines | Site-wide `noindex`, unchanged | — |
| No edge to a real compound | Asserted no specimen test reaches a peptide-scoped claim | yes |
| Does not trip the production guard | Specimen is published content, not the local fixture; `tides_demonstration_record_count()` returns 0 | yes |

The last distinction matters: conflating "fictional teaching document" with
"local editorial fixture" would make `db:verify-production` refuse a database
that legitimately contains the teaching document. They are two flags.

---

## 10. Responsive QA

Measured through the new guard, not by eye.

```
  PASS  desktop-1440 — no horizontal overflow at 1425px
  PASS  tablet-1024  — no horizontal overflow at 1009px
  PASS  tablet-768   — no horizontal overflow at 753px
  PASS  mobile-375   — no horizontal overflow at 375px

  All widths checked and clean.
```

Every measurement valid: non-zero widths, loaded, emulation took, main region
laid out. One caveat recorded — measured while the pane was hidden — which the
guard reports without letting it invalidate a page that demonstrably laid out.

---

## 11. Accessibility

| Check | Result |
|---|---|
| `h1` count | 1 |
| Heading hierarchy | h1 → h2 → h3 |
| Annotations work without hover | yes — all static markup, no hover-only content |
| Status not carried by colour alone | yes — every state has a worded label |
| Specimen state accessible | `role="note"` with `aria-label`, plus text |
| SVG title + desc | both figures |
| Keyboard navigation | no positive `tabindex`, no custom widgets |
| Mobile reading order | source order; no absolute positioning |

---

## 12. Print

`.no-print` hides the legend and mode switch. The specimen notice, absence
markers and *"Not checked"* labels all print, because they are wording rather
than colour. Figures carry `break-inside: avoid`.

Not visually rendered — this environment cannot produce a print preview — so this
is stylesheet analysis, as in C.4.

---

## 13. Tests

**328 passing across 25 files** (up from 302/24). Twenty-five new in
`tests/integration/certificate-page.test.tsx`, plus 16 in
`tests/unit/visual-qa.test.ts`:

- unstated fields are null; `"Not determined"` survives in a result field
- a placeholder string in structured metadata is refused by the database
- nothing is verified, and verification cannot be set without notes
- authenticity stays unchecked
- each result leads to its own topic; four results, four topics
- the sterility card exposes nothing from an unwritten topic
- every certificate-content claim carries a document family, in the text as well
  as the field
- dimensions carry no score, weight, grade or total
- partial coverage reports a count
- laboratory, manufacturer and distributor stay separate; a missing one stays null
- batch linkage is `stated_only`
- only a declared specimen reaches the public view
- the specimen does not trip the production demonstration guard
- the specimen is absent from the search index
- no specimen result links to a real compound
- rendered output marks absences and non-verification
- simple mode carries fewer method fields; verification state is in both
- the questions imply no requirement

---

## 14. Remaining gaps

1. **Print not visually rendered** — stylesheet analysis only, unchanged since C.4.
2. **Screenshots remain unreliable** in this environment; layout verified by
   measurement, which is stricter.
3. **Sterility, endotoxin, residual solvents and water** lead to preparation
   notices. This is what the page most visibly lacks, and it is honest.
4. **Three of five document families have no content requirements held.** The
   page says so; it is still a gap.
5. **The page is unpublished**, like everything else, awaiting human scientific
   review.

---

## 15. Owner decisions

1. **Whether the certificate page should be the quality section's entry point.**
   It is currently one topic among nineteen in `/quality`. It is the page a clinic
   would most likely want first, and promoting it is an editorial call.
2. **Whether to seek a source on third-party analytical report conventions**
   (V-021). The specimen is that kind of document and this index holds no
   requirements for it — the most conspicuous gap on the page.
3. **Whether `/quality` should group topics by written / in preparation.** With
   four written and fifteen not, the index page currently reads as sparser than
   the section is.

---

## 16. Recommendation for what comes after C.9

**The quality section index — `/quality` — and then a pause on new topics.**

Reasoning:

1. **Four topics are written and fifteen are not.** A reader landing on `/quality`
   sees a flat list that does not distinguish them, so the section looks thinner
   and less organised than it is. Grouping by state, with the certificate page
   given first position, is a small change with a large effect on how the work
   reads.
2. **Nothing further can be written without the USP-NF subscription.** Sterility,
   endotoxin, residual solvents and water are the next four topics by reader
   demand and all four are blocked. Writing a fifth analytical topic from Grant
   would be reaching.
3. **The evidence architecture is ahead of its content.** Twelve migrations of
   structure now carry four topics, 27 claims and 22 gaps. The next genuinely
   valuable work is either acquiring sources or preparing the first human review
   — not more scaffolding.
4. **Nothing has been reviewed by a person.** Twenty-seven claims sit at
   `ready_for_scientific_review`. The review packet exists and has never been
   used by a reviewer. That is the largest untested assumption in the project.

So: finish the section's front door, then either acquire the compendial sources
or run the first real scientific review. I would recommend the review — it tests
an assumption that everything else rests on.
