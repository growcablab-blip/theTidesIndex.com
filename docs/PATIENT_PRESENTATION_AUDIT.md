# Patient presentation audit

**Date:** 13 September 2026. **Scope:** all 12 compound records in simple
mode, plus search results. **Method:** `npm run audit:patient`
(`scripts/qa/patient-audit.ts`), re-runnable.

## What this audit is for

The query layer already refuses to select dosing columns in simple mode, and a
test asserts that no patient payload contains a dose-shaped string. That
proves the data is clean. It does not prove the *page* is clean: a caption, an
alt attribute, a tooltip, a collapsed disclosure, a search snippet or the print
stylesheet can each put an amount in front of a patient without the payload
ever carrying one.

So this audit reads what is actually rendered. For every record it collects:

- the visible text of the page in simple mode
- every `alt`, `title` and `aria-label` attribute
- the contents of every `<details>`, forced open
- the print rendering of the same page
- the search results page for the compound's name

and scans all of it for amounts with units, amount ranges, concentrations,
reconstitution and administration detail, and titration language.

## Result

**No dose amount, dose range, concentration or titration instruction appears
on any patient surface of any record, in screen or print rendering.**

| Surface | Records checked | Amounts | Ranges | Concentrations | Titration |
|---|---|---|---|---|---|
| Visible text | 12 | 0 | 0 | 0 | 0 |
| alt / title / aria-label | 12 | 0 | 0 | 0 | 0 |
| Opened disclosures | 12 | 0 | 0 | 0 | 0 |
| Print rendering | 12 | 0 | 0 | 0 | 0 |
| Search results | 3 sampled | 0 | 0 | 0 | 0 |

## One finding, fixed

**Tesamorelin, product presentation.** Patient mode was rendering a product
presentation string taken from the approved labelling:

> "…powder with a diluent of Sterile Water for Injection, for subcutaneous
> injection into the abdomen."

No amount, so the dose scan never saw it — and still administration detail,
which patient mode is not for. Two other products carried "reconstituted
before use" in the same field.

**Fix.** `presentation` is now nulled in simple mode in the query, alongside
strength, reconstitution text, labelled dose, excipients and product notes. It
is untouched in practitioner mode. The suppression is in the query rather than
in a component, which is the same rule the rest of the dosing fields follow:
the value never enters the process, so no rendering mistake can reveal it.

Patient mode still shows, for each product: the product name, its proprietary
name, the manufacturer, the authority and jurisdiction, the application
number, marketing status, storage, and the note that the products are not
substitutable for one another. That is enough to make the point the section
exists for — one molecule is several products, and a figure quoted for one is
not a figure for another — without describing how any of them is given.

## What the audit still flags, and why it is correct

Eight strings remain. All are the word "reconstitut*", none is an instruction,
and all are wanted:

1. **MOTS-c research questions (4, doubled in print).** "How quickly does
   reconstituted MOTS-c degrade?" and "stability of reconstituted peptide".
   These describe what is *unknown* about product stability. Removing the word
   would make the open question unstatable.
2. **Tesamorelin suppression notice (2, doubled in print).** "Vial strengths,
   reconstitution volumes and labelled doses are not given on this view" and
   "Strengths, doses and reconstitution are shown in the practitioner view".
   These name the categories being withheld and give no values. Telling a
   reader what is missing and why is the opposite of a leak, and removing
   these would make the page quietly incomplete instead of openly partial.

The scanner deliberately still reports them. A pattern list that suppresses
its own known-good matches stops being a check on the next change.

## What was not weakened

Practitioner mode is unchanged: amounts, frequencies, durations,
reconstitution, strengths and excipients all render exactly as before, and the
protocol comparison still shows every source-reported regimen side by side.
The only behavioural change is that one label-derived field no longer reaches
simple mode.

## Re-running this

```
npm run tides           # in one terminal
npm run audit:patient   # in another
```

Findings are written to the scratchpad as JSON as well as printed. The audit
should be re-run whenever a new record is added, a new patient-facing
component is written, or the reading-mode query changes — and it belongs in
the release checklist for the first published record.

## Limitation

This audit reads rendered pages. It does not test a reader with a screen
reader, and it does not cover any surface that does not exist yet — an API, a
feed, or an exported file. Those need their own check when they are built.
