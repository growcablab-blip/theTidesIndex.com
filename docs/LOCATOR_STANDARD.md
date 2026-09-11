# LOCATOR STANDARD

A locator is a promise that somebody else can open the page and disagree with
you. Everything below exists to keep that promise true a year from now, when the
file has been replaced and the person checking is not the person who wrote it.

---

## 1. The rule

**Record the locator the work carries, not the one the file carries.**

A reader with any copy of Grant can find printed page 223. Only someone holding
*this* PDF can find file page 234. The printed page is therefore the citation;
the file page is a convenience for whoever is checking against the held copy, and
the two are stored separately because they answer different questions.

```
printed page  +  sources.printed_page_offset  =  page of the held file
```

`printed_page_offset` is a property of **the copy**, not of the work. A different
scan of the same book has a different offset. When no offset is recorded, the
file page is **unknown** — not equal to the printed page. Nothing guesses.

| Source | Offset | Meaning |
|---|---|---|
| SRC-006 Grant | +11 | Printed 223 is file page 234 |
| SRC-017 ICH Q7 | +6 | Printed 24 is file page 30 |
| SRC-018 / SRC-019 | — | Not yet established; file pages unknown |

---

## 2. Establishing the offset

1. Find a page that prints its own number — a running header or footer.
2. Note the file page the reader reports for it.
3. `offset = file page − printed page`.
4. **Confirm on a second page far from the first.** Front matter, inserted
   plates and multi-part volumes all break a single-point offset.
5. Record it on the source. Do not keep it in your head or in a commit message.

```bash
npm run sources:read -- SRC-006 --printed 239
```

Prints `PRINTED PAGE 239 (file page 250)` and the page text. If the running
header does not say 239, the offset is wrong.

---

## 3. Front matter

Roman-numeral front matter does not share the body's offset and usually has its
own. Where a locator falls in front matter:

- record the Roman numeral in `locator_text` exactly as printed (`p. xiv`);
- leave `page_start` **null** rather than converting to an integer;
- record the file page in `notes` if it is needed.

An integer page number silently meaning a Roman one is the kind of error that
survives review.

---

## 4. What a locator must carry

| Field | When |
|---|---|
| `locator_text` | Always. The human-readable form, as it should be printed |
| `page_start` / `page_end` | Paginated sources, Arabic numerals only |
| `chapter` | Always where the work has chapters |
| `section` | Numbered guidance and standards — `11.4`, `17.2` |
| `table_number` | **Mandatory for anything drawn from a table** |
| `figure` | **Mandatory for anything drawn from a figure** |
| `timestamp_start_seconds` | Audio and video. See §7 |
| `url_fragment` | Web sources with addressable anchors |
| `location_key` | Any locator loaded from an extraction packet |

`location_key` exists so a packet can be re-loaded without duplicating locators
or orphaning the evidence that points at them. Ad-hoc locators created by an
editor have none.

---

## 5. Tables and figures

**This section is policy because of a specific failure.** See
`EVIDENCE_EXTRACTION_WORKFLOW.md` §17.

Extracted PDF text flattens a table into a single column. Row and column
relationships are *destroyed*, not preserved in order. Reading a flattened table
and inferring which limitation belongs to which technique produced a real
misattribution in C.2 that survived into a written claim.

**Required for any table or figure extraction:**

1. Reopen the original **visually**. Not the extracted text.
2. Identify the headers and the axis of each relationship.
3. Verify the specific cell and its row and column.
4. Record `table_number` or `figure` on the locator.
5. Only then write the claim.

**If the visual structure cannot be verified, record an evidence gap.** Do not
reconstruct it from ordering, however obvious the ordering seems. Where a cell is
relied on and the surrounding rows could not be confirmed, say so in
`uncertainty_text` and rest the claim on the part that is unambiguous — as
HPLC-006 does.

The same applies to charts, multi-column layouts, footnotes, captions and boxed
warnings.

---

## 6. Quoting

Text extraction in this project routinely clips the first one or two characters
of a line. `"es not guarantee homogeneity"` is what the tool returns for `"does
not guarantee homogeneity"`.

So: **paraphrase with an exact locator.** Quote only where a phrase is short
enough to be unambiguous and has been read visually. Never paste extracted text
into a claim.

`claim_evidence.extracted_text_private` may hold a verbatim extract so a reviewer
can confirm a reading. It is copyrighted and private, never selected by any
public query path, and there is a test asserting it cannot leave the database.

---

## 7. Audio and video

A ninety-minute interview is not a locator. Record:

- `timestamp_start_seconds`, and `timestamp_end_seconds` where a passage runs;
- the exact `locator_text` a reader would use — `42:15–43:02`;
- in `notes`: the platform, the upload or broadcast date, and **confidence in the
  transcription**, because automatic transcripts mishear numbers and drug names
  precisely where it matters most.

A numerical value taken from an automatic transcript is unverified until someone
has listened to it. Mark it so.

---

## 8. Verification

```bash
npm run evidence:locators
```

Re-resolves every recorded locator against the held file: source registered, copy
held, QC still permits citation, printed page resolves inside the file, and any
recorded table or figure marker appears on the resolved page.

It reports three outcomes. `resolved` means the page exists and carries the
markers recorded. `to check` means a marker was not found — extraction is
imperfect, so this asks a person to look rather than declaring an error.
`failed` means the locator cannot be resolved at all, and exits non-zero.

**A resolved locator does not mean the statement is correct.** The tool checks
that a page exists. Only a person reading it settles the rest.

---

## 9. When a file is replaced

Pagination is a property of a copy. A replacement copy is a different artefact
and its page numbers are not transferable.

The database enforces this: changing `sources.local_file_sha256` on a source that
already had a file flags every dependent claim and protocol `needs_update`, with
a reason naming the source and the date. Nothing is withdrawn — the statements
are probably still right — but nobody has checked them against the new copy, and
`needs_update` is exactly the state for *live, and somebody must look*.

Full procedure in `SOURCE_REPLACEMENT_WORKFLOW.md`.
