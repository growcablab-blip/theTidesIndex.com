# OWNER PRODUCT TOUR

What to open, in what order, and what to look at. About twenty minutes.

Start it with:

```bash
npm run tides
```

Then follow the stops below. Every URL assumes `http://localhost:3000`.

**Before you start, two things to hold in mind.** Nothing on this site has been
reviewed by a human scientist, and nothing is published — so almost every page
carries a banner saying so, and that is the product working, not a rough edge.
And the one compound that *is* published is a fictional demonstration record,
loaded so the compound pages have something to show.

---

## 1 · Home — `/`

**Look at:** the headline, the four differentiators, and the coverage panel.

The whole positioning is in one sentence: *every statement here can be traced to
a source, a page, and a review*. The figure on the right restates it
structurally. The differentiators below are the four rules the database actually
enforces, not aspirations — protocols are never merged because the schema has no
place to merge them into.

**Works:** everything. The coverage numbers are read live from the database.

**Intentionally incomplete:** the coverage panel reads *1 compound published*.
That is the demonstration compound. No real record is published.

---

## 2 · Quality and testing — `/quality`

**Look at:** "Start here", then the six families below it.

This is the page the last two days of work were about. Four written topics in
reading order, then every topic the index recognises — nineteen of them —
each with how far it has got.

**Works:** every state you see is derived from the database. Nothing is
hand-maintained.

**Intentionally incomplete:** most of the section. *Open question recorded*
means the index has a specific recorded reason it has not been written;
*In preparation* means nobody has started. Sterility, endotoxin, residual
solvents and water content are blocked on compendial chapters we do not hold.

**Worth trying:** the Simple / Practitioner switch, top right. Practitioner adds
claim and gap counts.

---

## 3 · HPLC / chromatographic purity — `/quality/hplc-purity`

**Look at:** the banner at the top, then any statement, then the "Not
established here" section.

This is the most finished page in the product and the one being prepared for the
first human review. Seven statements, each with the passage it rests on, how the
index reads that passage, and what it records as uncertain.

**Works:** every citation resolves to a page in Grant, *Synthetic Peptides: A
User's Guide*, 2nd edition. The contents rail follows you down the page.

**Intentionally incomplete:** the review. The banner says the record is awaiting
scientific review, and it is telling the truth.

**The thing to notice:** the section headed by what the test *does not*
establish. Four statements this page declines to make, each with the reason and
the source that would settle it. Most references have no such section.

---

## 4 · Identity testing — `/quality/identity-testing`

**Look at:** how it draws the line between "how many species" and "which
species".

**Works:** same structure, same provenance.

**Intentionally incomplete:** mass spectrometry has its own topic and it is
unwritten. This page therefore stops short of what a full treatment would say,
deliberately.

---

## 5 · Peptide content / assay — `/quality/peptide-content-assay`

**Look at:** the point that a purity percentage carries no quantity.

**Works:** six statements, all located.

**Intentionally incomplete:** there is no acceptable tolerance between a stated
label amount and a measured one anywhere in this index, because no source we hold
establishes one. The page says so rather than guessing.

---

## 6 · Reading a certificate of analysis — `/quality/certificate-of-analysis`

**Look at:** the annotated specimen certificate, and the scope notice above the
requirements.

The page a reader arrives at holding something in their hand.

**Works:** the specimen is fictional and says so in its title, in a notice above
it, and on the artefact itself. The chain-of-custody figure shows why a matching
lot number is not the same as a matching batch.

**Intentionally incomplete:** the requirements shown govern certificates for
*active pharmaceutical ingredients and intermediates* only. Finished drug
products, third-party laboratory reports and research-use material are different
documents and we do not hold sources for them. The scope block says this
prominently — that limitation is the page's most important sentence.

---

## 7 · Compounds — `/peptides`

**Look at:** the register, and the fact that almost everything in it is
unpublished and says so.

**Works:** the register lists what is in scope, which is a different statement
from what is finished.

**Intentionally incomplete:** all of it, except the demonstration compound.

---

## 8 · BPC-157 — `/peptides/bpc-157`

**Look at:** what a compound page looks like before any evidence has been
extracted for it.

**Intentionally incomplete:** entirely. There is no BPC-157 evidence packet. The
page exists to show that the index knows the compound exists and has not written
it, which is the honest state.

---

## 9 · Search — `/search`

Try `purity`, `HPLC`, `certificate`, `BPC`.

**Works:** deterministic Postgres full-text and trigram search across compounds,
quality topics, sources and claims.

**Intentionally incomplete:** it searches what exists, which is not much yet. No
semantic or vector search — that is planned as a discovery layer later and will
never be the provenance authority.

---

## 10 · Simple / Practitioner — any quality or compound page

Switch modes on a page with content and watch what changes.

**Works:** the two modes read the same reviewed records. Practitioner adds
source-reported regimens and evidence detail; simple carries no dosing at all,
and that is enforced in the query rather than by hiding it in the component.

---

## 11 · The reviewer's view — `/dev/review-packet/hplc-purity`

Development only, and it 404s in a production build.

**Look at:** what a scientific reviewer is actually sent. Then
`/dev/review-packet/hplc-purity/bundle` for the external version — cover, guide,
evidence, response form — which is what would go to a real reviewer.

**Works:** it is the real packet from the real database. Nothing is a mock.

**Intentionally incomplete:** nobody has been sent it.

---

## 12 · The first publication

Not a web page. Build it with:

```bash
npm run pdf
```

Then open `build/publications/tides-index-peptide-quality.pdf` — twelve pages,
drawn from the same evidence as the pages above.

`tides-index-understanding-peptides-skeleton.pdf` is the second book's design
skeleton: structure, page templates and illustration placeholders, and
deliberately no medical content at all.

---

## What to judge

1. Does it read as authoritative without overclaiming?
2. Do the honest gaps make it feel more trustworthy, or unfinished?
3. Is the PDF something you would put your name on?
4. Is anything here saying something you do not want it to say?
