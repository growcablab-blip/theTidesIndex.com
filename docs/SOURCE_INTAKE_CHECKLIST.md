# SOURCE INTAKE CHECKLIST

Run for every source before anything is extracted from it. No exceptions, and in
particular no exception for a source that is obviously what it says it is — five
of the first sixteen files in this register were obviously what they said they
were, and were not.

**A source is not verified because its metadata matches its filename.** That
sentence is the whole reason this document exists.

---

## FILE

- [ ] Original artefact retained, unmodified, under `sources/` (gitignored)
- [ ] SHA-256 recorded in `local_file_sha256`
- [ ] Byte size recorded
- [ ] Page count recorded
- [ ] Canonical filename assigned in `canonical_filename`
- [ ] Original acquired filename preserved in `local_private_filename`

The canonical name is what the copy *should* be filed as; the local name is what
it actually arrived as. Keeping both is how an aggregator's filename stops being
evidence of anything.

```bash
npm run sources:audit        # hash, size, pages, front matter, wrapper markers
```

---

## IDENTITY

- [ ] **Title page opened and read.** Not the filename, not the PDF metadata
- [ ] Title recorded as the title page states it, in `title_page_title`
- [ ] Authors or **editors** recorded, in `title_page_authors`
- [ ] Edition confirmed
- [ ] Publication or adoption date confirmed
- [ ] Publisher or issuing body confirmed
- [ ] DOI / PMID / ISBN confirmed where applicable
- [ ] `bibliographic_verified` set only after all of the above

> **The SRC-011 case.** An aggregator wrapper named Colin T. Mant — the lead
> author of chapter 1, not the editor. The registry nearly recorded the wrong
> person as editor of the entire volume. Pages 3–4 carried the authentic Humana
> front matter naming Gregg B. Fields. The filename was confident and wrong.

For a regulatory or compendial source, also confirm **which body adopted it and
when**. ICH adopted Q2(R2) on 1 November 2023; the FDA issued it in March 2024.
Both are true, of different bodies, and the registry records the one that matches
the held document.

---

## QC

- [ ] Complete — page count consistent with the work
- [ ] Corruption checked
- [ ] **Wrapper contamination checked** — see below
- [ ] Duplicate of an existing source checked
- [ ] Superseded edition checked
- [ ] `qc_status` assigned: `usable` / `incomplete` / `replace` / `pending` / `exclude`

```bash
npm run sources:coverage     # does the body discuss the subject at all?
```

**Domain coverage is the decisive test**, and it is not optional. A peptide
chemistry text mentions peptides on almost every page. A file carrying that title
and mentioning them on 4% of its pages is not a damaged copy of that book — it is
a different book with a cover page glued on.

| Observed | Reading |
|---|---|
| 61–94% | Genuine |
| 14% | Authentic front matter, then filler (SRC-011) |
| 3–6% | **Not the registered work.** Wrapper plus unrelated text |

The decoys carried genuine ISBNs. SRC-009's `978-3-031-30022-6` is the real
Springer identifier for the book it claimed to be. An ISBN is not authority.

---

## ACCESS AND COPYRIGHT

- [ ] `access_status` recorded: `held` / `subscription_required` /
      `public_not_yet_retrieved` / `unavailable` / `unknown`
- [ ] `access_notes` explain the status, with the date checked
- [ ] `public_fulltext_allowed` set — **false for every copyrighted work**
- [ ] Acquisition route recorded in `integrity_notes`

**A source that cannot be obtained lawfully is registered as absent, not
substituted.** Unauthorised copies of paywalled standards circulate and are
refused here — the V-014 finding applies exactly to them, and using one would
discard the reason the audit exists. SRC-021 to SRC-026 are registered with no
file and an explanation.

Do not treat a preview, an abstract, a harmonisation snippet or a summary as
possession of the full text. Where a related document is genuinely published by
the issuing body — as the PDG harmonised `<621>` text is — register it as **what
it is**, scoped so it cannot be cited as the current chapter.

---

## LOCATORS

- [ ] File page model understood
- [ ] Printed page model understood
- [ ] Offset established **and confirmed at two distant pages**
- [ ] Offset recorded in `printed_page_offset`
- [ ] Front matter pagination handled — see `LOCATOR_STANDARD.md` §3
- [ ] Tables and figures locatable by number

---

## CITABILITY

- [ ] QC status permits citation (`is_citable` is generated, not set)
- [ ] Access status permits use
- [ ] `source_type` assigned from the controlled vocabulary
- [ ] **Scope understood and recorded in `limitations_notes`**

Scope is the one that gets skipped and the one that does damage. Write down what
the source does *not* cover, in the entry, before extracting:

> **SRC-017, ICH Q7.** "SCOPE IS API AND INTERMEDIATE MANUFACTURE. Q7 does not
> state requirements for finished drug products, for third-party analytical test
> reports, or for research-use materials. A Q7 certificate requirement is not a
> universal certificate requirement and must never be presented as one."

That sentence, written at intake, is what later forced the
`certificate_type_scope` column and the constraint behind it.

---

## SIGN-OFF

- [ ] `verified_at` and `verified_by` recorded
- [ ] `integrity_notes` describe what was found, including what is wrong with it
- [ ] `primary_role` states what this source can legitimately support
- [ ] `limitations_notes` state what it cannot

Then, and only then, extraction may begin.

```bash
npm run sources:verify       # registry still binds to files on disk
```
