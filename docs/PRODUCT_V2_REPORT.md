# PRODUCT V2 REPORT

Warmth, humanity, clarity and task-based entry, over the same evidence
architecture. No scientific topic was added, nothing was published, `noindex` is
unchanged.

Outputs: `review/product-v2/` — eight desktop screenshots, four mobile, and both
PDFs.

---

## 1 · The demonstration compound is no longer public

This was the serious one. The fixture was the only *published* record, so the
compound directory listed it, search returned it, and the front page counted it
as **“1 compound published”**. The single sentence this index makes to a reader
is that a published statement has been traced and reviewed. It was telling them
one had, and none had.

Migration **0021** removes demonstration records from every public view:
compounds, the compound register, quality topics, the quality register, claims,
sources and the search index. Claims carry no flag of their own — a claim is a
demonstration claim exactly when its subject is — so it is derived rather than
duplicated.

The fixture is **not deleted**. It is still the only way to exercise the
published path locally, and it remains reachable through the editorial and
development surfaces.

`tests/integration/demonstration-not-public.test.ts` (10 tests) pins this against
the views rather than against a page, including a first assertion that the
fixture really is published — otherwise the rest would pass vacuously.

**One consequence worth knowing.** The reading-mode suite proves a dose cannot
reach a patient payload, and it needed the one published record that had just
become invisible to the public reader it tests. Clearing the flag afterwards is
not an option: that is a column change, so the version bumps, the approvals are
stranded and the gate withdraws the record — the machinery working. So
`seedDemoData` now takes `{ markAsDemonstration: false }`, used by that one suite
and by nothing else.

## 2 · Honest coverage language

The front page reported published counts. With the fixture correctly excluded
those are all zero, and “zero published” reads as an empty site.

It now reports what is true and more useful:

> **10** compounds in development · **4** quality references written, of 21
> registered · **27** statements extracted and awaiting scientific review ·
> **26** sources registered

with the line that nothing is published yet and why.

## 3 · The homepage answers three questions

Four bands, alternating surface, in the order a first-time reader needs them.

**What is here** — the promise, the search box, and the provenance figure.
**Who is it for** — two entry cards, patient and clinician, over one database
and differing only in presentation depth. **What can I do next** — six task
cards. **What makes this different** — the six rules, now with the coverage
panel beside them rather than at the top.

Two of the six task cards lead nowhere and say so on the card: protocols and
manufacturing are registered and unwritten. A card that led somewhere empty
would be worse than no card.

## 4 · Overstated copy corrected

Ten places across the seed data, the site and the PDF where the text asserted
what the register records as a *gap*. The pattern was always the same: a
conclusion stated in the topic’s own summary that the gap beneath it declines to
state.

| Was | Now |
|---|---|
| “…which are microbiological questions that chromatography does not address” | “The reviewed evidence held here does not establish anything about sterility or bacterial endotoxin from a purity result” |
| “A break anywhere in this chain means the result describes a different material” | “A break in the documented chain means the record cannot establish that the tested sample represents the material in hand” |
| “no single technique addresses more than one of them well” | “the source held here states that no single technique addresses homogeneity and covalent structure both” |
| “Sterility · Chromatography does not address it” | “Sterility · No source held here establishes it from this result” |

One was internally contradictory before the fix: a quality-map rationale that
asserted the conclusion and then said it was recording the gap instead.

## 5 · Progressive disclosure

A new `Disclosure` primitive, built on native `<details>` — no JavaScript, works
with a keyboard, announced by screen readers, and **forced open when printing**,
because a printed page with a collapsed section is a printed page with a hole in
it.

Applied to the two deepest sections of a quality topic: the statement-by-statement
evidence, and the record’s own version and review state. It opens by default in
practitioner mode and is closed in simple mode — a practitioner is here *for* the
evidence; a reader who chose plain language has said what depth they want.

Nothing is removed and nothing is hidden.

## 6 · The mode switch says what it does

It was two unlabelled words. A reader had to press one to find out what it did,
and pressing the wrong one on a patient-facing page is the press that matters. It
now carries a “Reading depth” label and a line stating the current depth: *plain
language, no doses* or *full evidence, sources and reported regimens*.

## 7 · Quality index: pathways over a flat directory

Twenty-one topics of equal visual weight is accurate and useless as a starting
point. **Learning pathway one — Understanding analytical testing** now leads,
with the three planned pathways named beneath it and their state shown. The full
directory is retained below, more compact.

## 8 · Certificate page

Ten numbered annotations — material, batch, sample, laboratory, test, method,
result, date, specification, report ID — keyed above the document and marked on
it, so the numbers can be carried to a real certificate. Six of the ten are about
whether the document describes the material in hand rather than about the result,
which is the ratio the page argues for.

## 9 · PDF

12 pages. Cover gains a series line (*Reference series · Volume three*), a spine
band and a per-volume `SeriesMark` — the same motif with the strata count and
accent set by volume number, so five books read as siblings rather than copies.

The fake QR code is gone. A square of finder patterns that cannot be scanned is
worse than nothing: a reader points a phone at it, gets nothing, and concludes
the document is broken. It says where to look in words until a public URL exists.

The content figure was crowded — captions ran into each other and into the
footnote, on a figure whose whole point is that two things are not the same. It
is taller, the vials narrower and further apart.

## 10 · Mobile

A real pass, not an overflow check.

| Found | Fixed |
|---|---|
| Section-nav links 17px tall | Padding moved from the row to the link; 44px |
| Footer links 17px | Padded on phones, tight on desktop |
| Contents-rail links 26px | Padded below `lg` |
| Breadcrumb 17px | Padded below `lg` |
| Mode-switch buttons 34px | 40px |
| Diagrams forced to 520px in a 375px window | `min-w-[340px]` on phones, 520 above `sm` |

Elements wider than the viewport: **0**.

## 11 · A recurring instability, diagnosed

`DATABASE_POOL_MAX=4` against the development database, which answers **one**
connection at a time. A larger pool interleaves prepared statements across
connections it does not really have, and it does not fail cleanly — it fails as
`bind message supplies 1 parameters, but prepared statement "" requires 0` and
intermittent `ECONNRESET`, on pages that are perfectly correct.

That cost several hours across this project before the cause was found.
`npm run tides` now sets it rather than trusting whatever `.env.local` carries,
and `.env.example` says why.

Separately, `npm run pdf` now renders beside its target and renames, so a PDF
open in a viewer no longer fails the build — it writes `.pdf.new` and says so.

---

## Unresolved product decisions

1. **Protocol views still carry demonstration protocols.** Not reachable — the
   peptide page 404s and search excludes it — but the exclusion should extend to
   `public_v_protocol_simple` and `public_v_protocol_practitioner` for
   consistency. Deliberately left, to keep this migration to what was needed.
2. **`/peptides` is a register of unwritten records.** The compound half of the
   product stays thin until evidence extraction resumes. No design change fixes
   it.
3. **Patient-facing content does not exist yet.** The patient entry card points
   at quality and testing, which is the closest thing written. The real
   destination is the *Understanding Peptides* volume.
4. **The certificate annotations are not drawn on a facsimile.** They are keyed
   and marked on a structured rendering. A true annotated image — callout lines
   to a document facsimile — would be stronger and is a larger piece of work.
5. **Tap targets in the page header** (brand 30px, search 28px) are still under
   44px. Fixing them changes the header proportions on desktop, which is a design
   decision rather than a defect.
6. **No pathway exists for the three future learning pathways.** They are named
   and state their blocker; building them needs the topics written.
