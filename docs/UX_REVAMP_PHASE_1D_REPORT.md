# EXPERIENCE REVAMP — PHASE 1D, EDITORIAL VOICE

Date: 29 September 2026.
Baseline: `dc40d88` (Phase 1C, live).
Scope: `/peptides/bpc-157` and `/protocols/stacks/bpc-157-tb-500`.

**Copy only.** No claim, protocol, source or locator was edited. No comparison
or attribution logic changed. No evidence classification moved. The TB-500 /
thymosin beta-4 ambiguity is still unresolved, and there is still no Tides
dose.

---

## 1. THE PROBLEM, STATED PRECISELY

The pages were describing their own machinery. Every flagged phrase was
accurate and every one of them made Tides sound like an internal
evidence-management system:

| Was | Now |
|---|---|
| "held records", "held claims" | published sources, reported protocols, research |
| "identifiable sources" | named sources |
| "a record of what happened to people" | human evidence / reports involving human use |
| "this page never merges them" | evidence for each compound is kept separate from evidence for the combination |
| "Where the sources agree, and where they do not" | How the sources differ |
| "What this index does not know" | What remains uncertain |
| "The rest of the record" | Further research notes |
| "Sources for this section (13)" | Sources (13) |

**Audit on the live pages: eight internal phrases searched, zero found.**

---

## 2. THE PRINCIPLE APPLIED

Teach first, qualify precisely, show the provenance underneath.

The qualifiers did not go away; they moved. The protocols section used to open
with *"There is no Tides dose and there will not be one: these are not
averaged, reconciled or ranked."* It now opens with what the cards are, and the
same guarantee follows in one line: **"Tides never averages them into a single
dose."** Shorter, still unambiguous, and no longer the narrator of the page.

Same treatment for safety: the heading became "What is known about safety" and
the qualifier — *no reported harm is not the same as evidence of safety; small
studies cannot detect rare effects* — sits directly under it rather than inside
every sentence.

---

## 3. PART A — THE COMBINATION PAGE

**Headline** is now `BPC-157 + TB-500`, with the subtitle **Recovery and
tissue-repair research**.

Both subtitle terms were checked against the records before being used:

| Term | Support |
|---|---|
| recovery | 1 of 6 combination reports — *"Injury recovery and soft tissue, muscle and joint repair"* |
| tissue / repair | 3 of 6 — Campbell's book, the Hack Smith guide, the Hack Smith worked example |

`tests/unit/stack-register.test.ts` binds the subtitle to those objectives: if a
record is reworded so a term loses support, the suite fails rather than leaving
an unsupported headline on the most-read line of the page. The same suite
refuses thirteen outcome words (`proven`, `effective`, `works`, `safe`, …) in
any register copy.

**The naming problem moved out of the H1 and became more visible, not less.**
It is now a bordered note on the first screen:

> **A note on TB-500**
> Sources do not always distinguish TB-500 from thymosin beta-4 consistently.
> Tides preserves that uncertainty rather than assuming the terms are
> interchangeable, so both compounds appear here and reports that do not
> identify which was used say so.

The per-report amber note is unchanged in meaning and lighter in wording:
*"This source says thymosin beta-4, a name used for TB-500 (Ac-LKKTETQ) and
Thymosin beta-4 alike. Which one was used cannot be determined from the report,
and Tides does not choose for it."*

**Opening copy** is now prose with the numbers pulled out as telemetry, as the
brief suggested:

> BPC-157 and TB-500 are discussed together across practitioner and research
> sources. Tides tracks what research shows for each compound separately, which
> sources report combining them, and how much evidence exists for the
> combination itself.

`SOURCES 5 · COMBINATION REPORTS 6 · DIRECT HUMAN EVIDENCE Limited` — computed,
not written.

**The three layers** became `01 EACH COMPOUND / 02 USED TOGETHER / 03 THE
COMBINATION ITSELF` under the heading **Understanding the evidence**, with the
lede the brief suggested. The limitation now lives inside card 03 where it
belongs — *"no study Tides holds compares the combination against either
compound alone"* — instead of narrating the whole page.

---

## 4. PART B — THE COMPOUND PAGE

Every section audited. The substantive changes:

- **Hero classification** is now the compound's own reviewed category —
  *Peptide · Repair and recovery* — instead of an interest inferred from
  protocols. It works in **both** readings, which the old line did not.
- **"Why it is being researched"** replaced "What the held regimens are for";
  cards now read *"Named in 3 of 9 reported protocols. One describes it as: …"*.
- **"What the evidence looks like"** replaced "What kind of evidence stands
  behind this", and the lanes describe what each kind of research can show
  rather than what a lane is.
- **"Practitioner and reference"** became **"Practitioner reports"**.
- **Mechanism caption** now reads *"Each step is taken word for word from the
  research named beneath it"*; stages are *Where it acts* and *Observed in the
  study*. The binding, the claim keys and the animal-and-laboratory caveat are
  untouched.

---

## 5. SIMPLE-MODE RESEARCH INTERESTS — INVESTIGATED, NOT BUILT

The brief asked whether a patient-safe taxonomy could be derived
deterministically. It cannot, and the reasoning is recorded in
`src/domain/presentation/research-interests.ts`:

| Option | Verdict |
|---|---|
| Derive from simple-eligible claim prose | **Rejected.** The same regex inference on a different paragraph. A research area inferred from a sentence about pharmacokinetics is a category nobody assigned |
| Use `primary_category_key` | **Structured and reviewed**, but the register holds exactly **one** per compound (BPC-157 is `repair-recovery`). That is a classification, not a set of interests — a band built from it would overstate the register |
| Tag research areas structurally | **The real fix.** A reviewed many-to-many compound-to-research-area relation, or a patient-visible research-area column on protocols |

So the band stays practitioner-only, and option 2 was put to its honest use:
the single category now carries the hero classification in both readings. The
data-model requirement is written down for later.

**The interest table also moved out of the React component** into
`research-interests.ts`. A statement about what a compound is studied for had
no business living untested in a render tree.

---

## 6. WHAT THE TESTS NOW GUARD

`tests/unit/public-voice.test.ts` reads the component sources and holds the four
lines this pass could have crossed:

1. **No invented recommendation.** Eight phrases refused; "Tides dose" is
   permitted only inside a denial.
2. **No upgraded evidence.** Six phrases refused; the lane descriptions, the
   "not a grade" line and the mechanism caveat are asserted present.
3. **No collapsed compound names.** Three phrases refused, and
   *interchangeable* is asserted to appear **exactly once, inside its own
   negation**.
4. **No lost attribution.** Source-named headings, source drawers and
   per-report attribution asserted present on both pages.

Plus `tests/unit/stack-register.test.ts` — 12 tests binding the headline and
subtitle to the records.

---

## 7. QA

| Check | Result |
|---|---|
| `npm run lint` | **Clean** |
| `npm run typecheck` | **Clean** |
| `npx vitest run tests/unit` | **524 passed, 37 files** — 35 new |
| Integration: peptide-experience, every-compound-renders, reading-mode, public-surface | **39 passed** |
| `npx vitest run tests/integration` (full) | **435 passed, 37 files**, 42 minutes |
| `npm run qa:doses` | **Clean** |
| `npm run build` | **Clean** |
| Live, both pages, both readings | **200** |
| Dose figures, simple reading | **0** on both pages (11 and 20 in practitioner) |
| `robots.txt` | `Disallow: /` |

The full integration suite was run because `StackPage` gained a field, which
is shared domain rather than component copy. It passed: **435 tests across 37
files**, unchanged from Phase 1C.

---

## 8. WHAT WAS DELIBERATELY LEFT

**Record-level copy still carries some old vocabulary.** BPC-157's own
description says *"described by the sources held here"* — six such phrases
across claims and summaries. These are **records, not component copy**. Editing
them means editing the evidence corpus, which has a review workflow and was not
in this pass's scope. It is an editorial task, not a presentation one.

**`ModeExplainer` is global chrome**, shown on all 28 compound pages. Its
wording — *"source-reported regimens … are not recommendations"* — is still in
the old register. Changing it changes every page, which this pass was scoped
not to do.

**The other twenty-seven compounds** keep the record layout and the old voice.

---

## 9. LIVE, FOR OWNER REVIEW

- https://thetidesindexcom-production.up.railway.app/peptides/bpc-157
- https://thetidesindexcom-production.up.railway.app/protocols/stacks/bpc-157-tb-500

The success test for this pass: a visitor should come away thinking *I
understand what this is, why people are researching it, what the evidence looks
like, what protocols have been reported, and what is still uncertain* — without
having learned anything about how the database stores evidence.

Work stops here.
