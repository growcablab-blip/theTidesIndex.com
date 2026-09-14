# Visual experience v1 — report

Branch `phase-a-foundation`, continuing from `8e83ce8`. Nothing deployed,
robots still noindex, nothing published, no compound added.

The brief for this sprint was that the product reads as a reference database
rather than as somewhere a person wants to learn. The changes below are about
hierarchy and rhythm rather than architecture: nothing was removed from the
provenance layer, and several things were moved behind it.

## WHAT CHANGED

- The record page now has a different **shape in each reading depth** instead
  of one shape with fields removed.
- The **literature ledger moved below the practical sections**. It was the
  second thing a clinician met; it is how the evidence was assembled, not what
  anybody came for.
- **Nomenclature became practitioner depth.** Four analytical tables between a
  patient and what is known was the wrong order for that reader.
- Simple mode **ends on questions for a clinician** rather than on an absence.
- The manufacturing pathway reads as a **journey**: each stage now says what it
  hands to the next.
- The homepage entry paths are **the six journeys the brief names**.
- A new **protocol provenance figure** answers "is any of this from a trial?"
  before the comparison table answers "what does each source say?".
- The five publications are **visibly one family**: volumes one to five, each
  numbered on its cover.
- Twelve owner decisions closed in `docs/OWNER_DECISIONS_REQUIRED.md`, and the
  readiness tool now says **mechanically ready for scientific review**.

## HOME

The six task cards were a mix of destinations and repeats — two pointed at the
compound register and "what is still unknown" led to the coverage page rather
than to the research agenda, which now exists. They are now the six journeys:
understand a peptide, compare protocols, explore the evidence, understand
quality, see how peptides are made, explore open research questions. The
patient path and "how this works" both open into Learn rather than dropping a
newcomer into the quality register or the methodology.

The provenance promise and the "what makes this different" band are unchanged.

## SIMPLE MODE

It was practitioner mode with the dosing removed. It now has its own sequence:
what it is, what is known, what is not, what sources report, and questions
worth asking a clinician. Nomenclature and the literature ledger are gone from
this depth — not hidden by CSS, absent from the page — and the contents rail
matches, including an entry for the closing section that exists only here.

Verified on BPC-157 in simple depth: the clinician questions render, and both
the ledger and the provenance figure are absent.

The patient-safety boundary is unchanged and re-audited: 10 of 12 records
clean, 12 flagged strings, every one of them the word "reconstitution" inside
either a MOTS-c research question about product stability or tesamorelin's own
notice that strengths and reconstitution are withheld. No amounts, ranges,
concentrations or titration language anywhere, in screen or print.

## PRACTITIONER MODE

The order now runs: what it is, nomenclature, evidence, replication,
pharmacokinetics, routes, protocols, then the literature ledger, then
disagreements, research questions, products, regulatory, references, record.
A clinician reaches routes, PK and regimens without traversing a screen of 230
records first, and the ledger is still there in full for anyone interrogating
the screen.

Each evidence card carries its primary-source status, and the reference list
stays collapsed behind a disclosure.

## PROTOCOLS

The library opens with what it can answer — what sources report, where they
agree, where they differ, what is trial-derived, practitioner-derived,
preclinical — each line pointing at a part of the page rather than explaining
itself. The comparison names the fields every source states identically as
well as the ones that vary; a reader told only what differs assumes the rest
was never reported.

On a record, the provenance figure sits above the comparison: one mark per
regimen, in the lane for the kind of source that published it. For BPC-157 it
reads three from studies in people and five from practitioner material, which
is the fact a clinician needs before reading any row.

Amounts now print their unit everywhere. Six regimens stored the number and
the unit separately, so the practitioner card had been showing "Amount 250".

## RESEARCH

Each question shows what is unknown, why, and what would settle it, and the
page separates questions waiting on new research from those waiting on a paper
this index has not obtained. Gap families are distinguished by colour and
shape of border — access, human, method, identity, product — with no ordering
and no score attached to any of them.

## MANUFACTURING

Fourteen of the fifteen stages now state what leaves them and arrives at the
next; the final vial hands on to nobody. The transitions name material and
nothing else, so the unsourced stages still say source needed rather than
acquiring prose. The flow figure, the checkpoints and the five questions are
unchanged.

## ILLUSTRATION SYSTEM

Families already in place: evidence landscape, route map, nomenclature map,
replication map, pharmacokinetics, product distinction, chemical forms,
provenance chain, and the manufacturing and quality figure sets.

Added this sprint: **protocol provenance** — deterministic SVG, drawn from the
records, with lanes ordered by provenance and an accessible description
generated from the same data.

Not added: a mechanism illustration. There is no sourced mechanism data to
draw; a mechanism diagram would be an invention, and this is the one place in
the product where a beautiful figure would do the most damage.

## PUBLICATIONS

All five rebuilt and visibly related: Reference series volumes one to five, in
the same cover system, with the same chapter openers, source notes and
current-version blocks.

| Volume | Pages | State |
|---|---|---|
| One — Understanding Peptides | 18 | PARTIAL DRAFT, 5 of 12 chapters |
| Two — Peptide Science & Applications | 13 | PARTIAL DRAFT, 2 chapters source-needed |
| Three — Peptide Quality: From Manufacturing to the Final Vial | 15 | Complete first draft, unreviewed |
| Four — The Peptide Reference Guide | 87 | Complete first draft, unreviewed |
| Five — Peptide Protocols & Clinical Quick Reference | 72 | Complete first draft, unreviewed |

No scientific content was written this sprint. The partial drafts still say so
on their covers.

## MOBILE

The owner board carries the homepage at 390 px. The full mobile set —
every surface plus records in both depths at 375 px — is regenerated in
`review/human-scale-v1/` after these changes.

## WHAT STILL FEELS ROUGH

- **Spacing and rhythm were not systematically redesigned.** This sprint moved
  things and wrote copy; it did not revisit the type scale, the vertical
  rhythm or the card treatment across the site. That is the largest remaining
  piece of the warmth brief.
- **Simple mode is still long.** It is better ordered, but a record with eight
  gaps and ten claims is a lot of page for a patient.
- **Empty states vary in tone.** Some read as editorial, some as system
  messages.
- **The research agenda is still a list of cards.** The families are visible
  now; the page does not yet tell a story about where the field is thin.
- **Homepage metrics remain** in the sidebar. They are honest and they are the
  least human thing on the page.
- **The contact sheet is static HTML.** It is enough for review and it is not
  a product surface.
