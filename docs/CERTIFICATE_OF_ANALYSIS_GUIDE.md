# CERTIFICATE OF ANALYSIS — PAGE GUIDE

How `/quality/certificate-of-analysis` is built, and the rules it holds to.

This is an **information-architecture and document-literacy page**. It introduces
no new scientific claims: it assembles the C.5 certificate architecture and the
analytical topics from C.4, C.7 and C.8 around a document a reader is actually
holding.

---

## 1. The argument the page makes

A reader arrives with a document, not a question about chromatography. The page's
job is to make **"99% purity" feel like one data point** rather than the
conclusion of a quality evaluation.

So the analytical topics are reached *through* the document rather than the other
way round, and the document's omissions get as much room as its results. The
specimen carries 31 marked absences and 5 unverified results — those are the
teaching material.

The central question is not *what does the number say* but **does this document
describe the material in front of me?**

---

## 2. Page structure

| Section | What it does |
|---|---|
| In short | Mode-dependent orientation |
| **Which document is it?** | Five document families, and which this index holds requirements for |
| **A specimen, annotated** | The fictional document, field by field |
| **Which batch was tested?** | The chain, and where it is only stated |
| What each test addresses | Every result links to its topic |
| **Three different questions** | Purity / identity / content triangle |
| What the document carries | Transparency dimensions — never a score |
| **A complete document is not a good product** | Both directions of the confusion |
| Source-linked detail | The Q7 claims, with scope |
| Not established here | The recorded gaps |
| **Questions to ask** | Nine, none implying a requirement |
| Related topics | The quality map |
| References, About this record | Provenance and state |

---

## 3. Document taxonomy, and the scope boundary

Five families, each with its issuer and the question it answers:

| Family | Requirements this index holds |
|---|---|
| Manufacturer certificate of analysis | **ICH Q7 §11.4** — API and intermediates only |
| Third-party analytical test report | **None** |
| Finished-product release document | **None** |
| Distributor or repacker certificate | **ICH Q7 §11.4 and §17** — API and intermediates only |
| Unknown or other | **None** |

Where this index holds nothing, the card says so explicitly rather than leaving a
blank. **Three of five families have no content requirement here at all**, and
that is the honest state — Q7 governs pharmaceutical manufacture, and the
specimen is a third-party report, which Q7 does not address.

The scope reaches the reader three ways: on the taxonomy card, in the
`certificateTypeScope` field on each claim, and **inside the claim text itself**
(*"For an active pharmaceutical ingredient or intermediate…"*). A test asserts
the last of these, because a scope living only in a field is a scope that can be
dropped in rendering — which happened once already in C.5.

---

## 4. The annotated specimen

Fictional, and says so in four places: the page title of the document
(`SPECIMEN — Analytical Test Report (fictional teaching document)`), a dashed
notice above it, the artefact itself, and every invented name (`Example
Analytical Services`, `Example Peptide Supply Co.`, `EXB-0000`, `SPEC-TR-000000`).

A database constraint refuses a specimen whose title does not declare itself.

**It is deliberately imperfect.** It names no manufacturer, states no acceptance
criterion for identity, gives no method for two of five tests, never measures
content despite a 10 mg label, and lists sterility precisely because it was not
performed. The omissions are the lesson.

---

## 5. Batch linkage

`ChainOfCustodyFigure` renders:

```
product → lot/batch → submitted sample → laboratory → report → result
```

with each link labelled by what is actually known. The specimen's linkage is
`stated_only`: the batch number appears on the document because the submitter
wrote it there, and `chainOfCustodyKnown` is false.

**A document stating a link and a link being established are different things**,
and the model has four states — `established`, `stated_only`, `not_established`,
`unknown` — so the difference can be recorded rather than glossed.

---

## 6. Three states per result

Kept visibly apart on every row:

| State | Specimen example |
|---|---|
| **The document reports** | *99.1 % of total peak area* |
| **What that addresses** | Link to HPLC / chromatographic purity |
| **Checked by this index** | *Not checked — this index has not verified this result* |

The third is false on every result and is never softened. A database constraint
refuses `independently_verified = true` without verification notes, so the state
cannot be set without saying what was checked.

Authenticity is `not_checked` with no notes. There is deliberately **no state
meaning "looks genuine"** — a professional-looking PDF is not evidence of its own
authenticity.

---

## 7. Transparency dimensions, not a score

Eleven dimensions of what a document states. Each is `present`, `partial` or
`absent`, with the specific fields named.

**No score, no grade, no total.** A test asserts no dimension carries `score` or
`weight`, and that no label reads like a grade. Document completeness is not
product quality, and a number would be read as the second.

Partial coverage is reported as a **count** — *"method: stated for 3 of 5
tests"* — because collapsing it to present/absent loses it in both directions.
That was a real defect in C.5 and again, inverted, in C.8.

---

## 8. Absence is absence

A field the document does not carry is `null` in the database and renders as
*"Not stated on this document"* at presentation time. Never `"N/A"`, never blank.

Enforced by `certificates_no_placeholder_metadata` and
`certificate_tests_no_placeholder_metadata`, which refuse 19 placeholder strings
in structured metadata columns.

**One exception, deliberately preserved.** `result_text` may contain *"Not
determined"* or *"Not tested"*, because that is what the document itself reports.
A source-reported negative is a finding; a database placeholder is a hole. The
constraint covers the metadata columns and leaves the result column alone.

---

## 9. Questions to ask

Nine, each with why it matters. Every one is answerable from the document or not,
and **none implies that a particular answer is required** — which would smuggle
in a specification this index cannot source.

> *"Was an acceptance criterion stated, and by whom?"* — a question about the
> document.
> ~~*"Does it meet specification?"*~~ — would not be.

A test asserts the second shape does not appear.

---

## 10. What the page does not do

- No score, grade or rating of any kind.
- No universal requirements: Q7's scope is stated wherever Q7 is used.
- No claim that any product must be tested for anything.
- No verification it has not performed.
- No authenticity inference from appearance.
- No acceptance thresholds — none are held.
- Sterility, endotoxin, residual solvents and water lead to preparation notices,
  which is correct while the USP-NF subscription is outstanding.
