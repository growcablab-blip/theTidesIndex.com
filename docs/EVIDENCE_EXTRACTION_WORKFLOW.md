# EVIDENCE EXTRACTION WORKFLOW

The operating procedure for turning a source into evidence in The Tides Index.

Written from what actually happened across Phases C.1 to C.5 — including the
parts that went wrong and had to be corrected. Every rule below traces to a
specific failure or a specific near-miss, and the ones that read as fussy are
the ones that cost the most.

**Companion documents**

| Document | Covers |
|---|---|
| `SOURCE_INTAKE_CHECKLIST.md` | Stages 0–4, as a checklist |
| `LOCATOR_STANDARD.md` | Stage 4, and tables, figures, media |
| `EVIDENCE_GAP_STANDARD.md` | Stage 6, and negative claims |
| `PROTOCOL_EXTRACTION_STANDARD.md` | Protocols, routes, practitioner sources |
| `SOURCE_REPLACEMENT_WORKFLOW.md` | Stage 14, when a source is replaced |

---

## The pipeline

```
0  discovery        →  1  file identity   →  2  bibliographic  →  3  QC
4  locator mapping  →  5  source mapping  →  6  extraction     →  7  reopen
8  primary trace    →  9  interpretation  → 10  contradiction  → 11  packet
12 review           → 13  publication     → 14  maintenance
```

Stages 1–3 gate everything after them. **No source is extracted from until it
has been through them**, and the reason is that five of the first sixteen files
in this register were not the works they claimed to be.

---

## Stage 0 — Source discovery

A candidate enters by being *named*, not by being found. Record it in
`SOURCE_MANIFEST.json` with a key, the bibliographic details as believed, and
`qc_status: pending`.

Registering a source before holding it is deliberate. The USP chapters are
registered with no file, so the absence is part of the record rather than an
unexplained silence — and so "we should get `<71>`" cannot quietly become
"`<71>` says…".

Set `access_status` at this point: `held`, `subscription_required`,
`public_not_yet_retrieved`, `unavailable`, `unknown`. With `access_notes` giving
the reason and the date checked.

**Acquisition rules.** Obtain from the issuing body where possible — ICH Q7,
Q2(R2) and Q14 came directly from `database.ich.org`. Where a source is
paywalled, it stays registered and absent. **Unauthorised copies are refused**,
and copies of standards do circulate on document-sharing sites: V-014 established
exactly what such copies are worth, and using one would discard the reason the
audit exists.

---

## Stage 1 — File identity

Confirm the artefact is what it claims to be.

```bash
npm run sources:audit
```

Records SHA-256, byte size, page count; extracts the first fourteen pages plus
probes at 25/50/75/95%; detects wrapper markers.

The hash matters later: a changed hash is how the database knows a file was
replaced, and every dependent record gets flagged (Stage 14).

---

## Stage 2 — Bibliographic verification

**Open the title page and read it.** Not the filename. Not the PDF metadata.

Confirm title, author **or editor**, edition, date, publisher or issuing body,
and DOI/PMID/ISBN. Record what the title page says in `title_page_title` and
`title_page_authors` — separately from the registry's fields, so a discrepancy is
visible rather than resolved by overwriting.

> **SRC-011.** The aggregator wrapper named Colin T. Mant, lead author of chapter
> 1. The registry nearly recorded him as editor of the volume. The authentic
> Humana front matter on pages 3–4 named Gregg B. Fields.

For regulatory sources, confirm **which body adopted it and when**. ICH adopted
Q2(R2) on 1 November 2023; FDA issued it in March 2024. The registry records the
one matching the held document.

Set `bibliographic_verified` only when all of it is done. **Metadata matching the
filename is not verification** — it is the thing that failed.

---

## Stage 3 — Source QC

```bash
npm run sources:coverage
```

Scans **every page** for the vocabulary the registered work would necessarily
use. This is the decisive test and it is not optional.

| Observed | Reading |
|---|---|
| 61–94% | Genuine |
| 14% | Authentic front matter, then filler |
| 3–6% | **Not the registered work** |

Assign `qc_status`: `usable` / `incomplete` / `replace` / `pending` / `exclude`.
`is_citable` is **generated** from it, so citability cannot drift, and the publish
gates read the generated column.

Also check: corruption, duplicates, superseded editions, and whether a
plausible-looking document is actually a different artefact — the PDG harmonised
`<621>` text is genuine, published by USP, and **not the USP-NF chapter**. It is
registered as what it is, held at `pending`, and scoped so it cannot be cited as
the current requirement.

---

## Stage 4 — Locator mapping

Full rules in `LOCATOR_STANDARD.md`. In summary:

- Record the **printed page**, the number the work carries.
- Establish `printed_page_offset` and **confirm it at two distant pages**.
- Handle Roman front matter separately; never convert to an integer.
- Tables and figures need `table_number` / `figure` on the locator.
- Media needs a timestamp. A ninety-minute interview is not a locator.

---

## Stage 5 — Source mapping

Before extracting, read enough to write down: the relevant chapters, what the
source covers for the topics in hand, what primary literature it cites, and — the
part that gets skipped — **its major limitations and its scope**.

Write the scope into `limitations_notes` *at this stage*, before any claim
exists:

> **SRC-017.** "SCOPE IS API AND INTERMEDIATE MANUFACTURE. Q7 does not state
> requirements for finished drug products, for third-party analytical test
> reports, or for research-use materials."

That sentence, written at Stage 5, is what later forced the
`certificate_type_scope` column and the constraint behind it. Written afterwards
it would have been a rationalisation.

---

## Stage 6 — Discrete extraction

**Do not write one source summary and call it extraction.** Extract into separate
records: claims, protocols, routes, safety observations, quality statements,
regulatory statements, disagreements, evidence gaps, cited primary references.

A packet (`data/seed/evidence/*.json`) is the unit: one source, one topic, a set
of discrete claims each pinned to a locator, plus the statements the extraction
**could not** support.

Every claim carries:

| Field | Rule |
|---|---|
| `claimText` | The proposition as this index states it |
| `plainLanguageText` | The same proposition in plain language, so simple mode is never left empty |
| `interpretationNotes` | **How this index reads the passage** — distinct from what the source says |
| `uncertaintyText` | What remains uncertain. Required for high and critical claims |
| `importance` | Drives the strictness of the publish gate |
| `certificateTypeScope` | Required for `certificate-content` claims. See Stage 6b |
| evidence → `interpretation` | How this index reads **this specific passage** |

Gaps are written **in the same pass**, not afterwards. See
`EVIDENCE_GAP_STANDARD.md`. Written later they become explanations for criticism;
written during extraction they are an honest inventory.

### Stage 6a — Negative claims

Two statements that look identical in prose:

**A source-supported negative claim** — a source establishes the limitation. This
is a claim, with provenance.

**An absence in this library** — nothing held settles it. This is a **gap**, and
it asserts nothing about the world.

> Do not silently turn absence in our library into absence in science.

### Stage 6b — Scope

Every high-impact claim states what it applies to: material scope (API,
intermediate, finished product, research material), population or model, route,
formulation, jurisdiction.

For certificate-content claims this is enforced in the database — a claim in that
family with no `certificate_type_scope` is refused. The rule generalises: **when a
claim family has a scope that could be dropped, the constraint goes in the
database, not in this document.** A convention is not an enforcement mechanism.

### Stage 6c — Numerical values

Every number needs: exact value, exact unit, context, locator, source,
formulation where relevant, population or model, and who verified it.

**Never normalise units destructively.** Store the source-reported form; store a
normalised representation separately and additionally if one is useful. Storing
the normalised figure and reconstructing the original for display loses the audit
and introduces arithmetic nobody checked.

---

## Stage 7 — Reopen and verify

**Mandatory** for tables, figures, numerical values, doses, units, routes,
percentages, regulatory requirements, negative statements and quoted limitations.

```bash
npm run sources:read -- SRC-006 --printed 223
npm run evidence:locators
```

`evidence:locators` re-resolves every recorded locator against the held file:
source registered, copy held, QC permits citation, page resolves inside the file,
recorded table and figure markers present on the page. It reports `resolved`, `to
check` and `failed`, and exits non-zero on a failure.

**A resolved locator does not mean the statement is correct.** The tool checks
that a page exists and carries the markers. Only a person reading it settles the
rest.

### The table rule

**Extracted text flattens a table into a single column.** Row and column
relationships are destroyed, not preserved in order.

1. Reopen the original **visually**.
2. Identify headers and the axis of each relationship.
3. Verify the specific cell, its row and its column.
4. Record the table locator.
5. Only then write the claim.

**If the visual structure cannot be verified, record a gap rather than guessing.**
Where a cell is relied on and neighbouring rows could not be confirmed, say so in
`uncertaintyText` and rest the claim on the unambiguous part.

---

## Stage 8 — Primary-source trace

Where a secondary or practitioner source cites a study:

1. Capture the citation.
2. Obtain the primary source where possible.
3. Verify whether the secondary interpretation matches it. Record divergence in
   `interpretationConcerns`.
4. **Link, do not replace.** The secondary source remains the record of what that
   author said; the primary source is added alongside.
5. Set `primarySourceVerified` only when someone has actually opened the primary.

If sources cite each other, preserve the chain. Three books repeating one claim
is one source, not three. If no original support can be found, retain the
statement as commentary with `primary_source_missing` recorded — erasing it loses
the fact that it circulates.

---

## Stage 9 — Interpretation

Keep apart, in different fields:

- **what the source says** — `claim_evidence.interpretation`, tied to a passage;
- **how this index reads it** — `claims.interpretationNotes`;
- **what remains uncertain** — `claims.uncertaintyText`;
- **scope, limits, applicability**.

The public surface renders these distinctly, labelled *"The Tides Index reads
this as"*. A reader must always be able to tell the source's words from this
index's reading of them.

---

## Stage 10 — Contradiction check

Look for conflicting routes, conflicting amounts, terminology mismatches,
different formulations, population differences, preclinical versus human,
publication-date differences, conflicting outcomes.

**Do not reconcile automatically.** Record a `disagreement` with both positions
attached, a *candidate* explanation, and a resolution requirement stating what
evidence would settle it. Contradicting evidence is retained and displayed; it is
never resolved by deletion.

---

## Stage 11 — Review packet

Everything a reviewer needs, in one place, without leaving the page: each claim,
the reading, the stated uncertainty, every passage with a locator **and the page
of the held copy**, the relationship map with each edge's basis, and the recorded
gaps — so an absence is something a reviewer is asked to confirm rather than
something they must notice is missing.

`src/server/editorial/review-packet.ts`, rendered on the admin quality-topic page.

---

## Stage 12 — Review

**Automation may:** extract, structure, compare, confirm that a citation resolves
to the passage it claims, flag contradictions, assemble packets, draft
plain-language summaries, suggest metadata, detect duplicates, parse citations.

**Automation may not:** stand in for scientific, clinical or compliance approval.

This is structural. `reviews_automation_scope` confines `performed_by =
'automated'` to `source_check` and `primary_verification`; an automated
scientific approval **cannot be written to the database**, by anyone, including
the table owner. `tides_has_approved_review` counts only human approvals, so the
publish gate refuses twice over.

```bash
npm run evidence:submit -- <packet-key> --as <staff-user-id>
```

Records the automated check under a named tool run by a named editor, and
advances to `ready_for_scientific_review` — which is as far as work no person has
reviewed can honestly go. An unpublished record in that state is a better outcome
than a published one resting on a fictional approval.

### Stage 12a — Rendering review

**Read the rendered page.** This is a required step, not a courtesy.

Both C.4 and C.5 found real defects that the code and the tests did not: a
transparency dimension reporting *"none of these are stated"* about a document
stating three of four; a structural relationship whose rationale asserted the
very inference the packet had explicitly declined to make; a certificate scope
that reached the database and stopped there instead of reaching the reader.

Each looked correct in the source and wrong on the page.

---

## Stage 13 — Publication

Only when the gates are satisfied — and they are database triggers, not
application code:

- provenance resolves to an exact location in a citable source;
- `interpretationNotes` present;
- approved **human** source check at the current version;
- approved **human** scientific review at the current version;
- high and critical claims additionally require stated uncertainty and an
  approved compliance review;
- quality topics must state both what a test establishes and what it does not.

Editing published content bumps its version, stranding approvals. The gate
distinguishes entering publication (refuse) from editing live content (withdraw
and flag with the reason) — so a correction is never blocked by the gate meant to
protect it.

---

## Stage 14 — Maintenance

**Review clocks.** Content classes carry re-review intervals. A record past its
clock is flagged, not withdrawn.

**Source downgrades.** Downgrading a source's QC status withdraws anything
resting on it and records why. Automatic; no editor has to remember.

**Source replacement.** Changing a source's file hash flags every dependent claim
and protocol `needs_update` with a reason naming the source and date. Full
procedure in `SOURCE_REPLACEMENT_WORKFLOW.md`. A replacement file is **not the
same evidence**.

**Corrections.** Public, with severity recorded.

**Metrics.**

```bash
npm run qa:metrics
```

Internal only, never a public figure. Every number describes how thoroughly this
index has checked itself — not how good any compound or supplier is. Published as
a score it would be read as the second.

---

## Extraction batches

Do not ingest a library blindly. For a compound, in order, each batch reviewable
on its own:

1. identity, synonyms, nomenclature
2. mechanism and targets
3. human studies
4. preclinical evidence
5. routes and PK
6. safety
7. practitioner protocols
8. regulatory and development status
9. disagreements and unknowns

Identity comes first because everything after it depends on knowing what is being
discussed — V-001 exists because practitioner sources treat "TB-500" and
full-length Thymosin beta-4 as interchangeable, and they are not.

---

## Lessons from the first extraction cycle

The concrete failures, recorded so they are not rediscovered.

**Filenames are not bibliographic authority.** SRC-011's aggregator wrapper named
a chapter author as the volume's editor.

**Neither are ISBNs, titles or cover pages.** Five files carried correct titles
and genuine ISBNs over a hundred-plus pages of unrelated text — climate policy,
Hume scholarship, fiction in three languages. Three had been recorded as "genuine
content after promotional pages", the description that would have permitted
citation. Domain coverage caught them; nothing else would have.

**Printed pages and file pages differ, and the difference is silent.** SRC-006 by
eleven, SRC-017 by six. A locator nobody can reopen is not provenance.

**Extracted tables lose their structure.** Table 4-1 flattens to a single column;
an early draft attributed "not reliable for quantitation" to mass spectrometry
when it more likely belongs to the row above. The claim now rests only on the
unambiguous final entry, and says why.

**Structural copy smuggles assertions.** A navigational map edge carried the
sentence *"water content bears on how a purity figure relates to the mass in a
vial"* — precisely the inference the claim it sat beside had explicitly declined
to make. The basis rule exists to stop this; it arrived through the one door the
rule leaves open.

**Scope evaporates.** Q7's API certificate requirements were one careless
sentence from becoming universal certificate requirements. The fix was a database
constraint, not a style note.

**Scope can also be lost in transit.** `certificate_type_scope` reached the
database and stopped: it was not in the public view, so a requirement scoped in
storage arrived at the reader unscoped — the useless half of the work.

**Partial coverage reads as absence.** A dimension marked `absent` unless *every*
test satisfied it displayed "none of these are stated" about a document that
stated three of four. False, and the kind of false that damages a supplier.

**Demonstration data and teaching content are different things.** The local
editorial fixture must never reach production; the specimen certificate is
published deliberately and must be labelled everywhere. One flag could not carry
both meanings, so there are two.

**An absence of evidence is not evidence of absence, and the wording is where it
goes wrong.** "The sources held here do not settle this" is checkable. "HPLC
cannot tell you this" is a claim, and nothing supports it.
