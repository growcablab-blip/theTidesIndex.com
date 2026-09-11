# SOURCE REPLACEMENT WORKFLOW

Seven sources in this register need replacing. This document exists because the
obvious way to handle that — drop the new file in, update the filename, carry on
— is wrong in a way that leaves no trace.

**A replacement file is not the same evidence.** It is a different artefact with
its own pagination, possibly a different edition, possibly different content. The
locators recorded against the old copy were promises about pages that no longer
necessarily hold what they held.

---

## 1. Outstanding replacements

Ordered by what unblocks the most work.

| Key | Work | Why it is unusable |
|---|---|---|
| SRC-011 | Fields, *Peptide Characterization and Application Protocols*, MiMB 386 | 96 of ~500 pages; authentic front matter then filler |
| SRC-013 | Costantino & Pikal, *Lyophilization of Biopharmaceuticals* | Two-page contents listing only |
| SRC-014 | Banga, *Therapeutic Peptides and Proteins*, 3e | Not the registered work |
| SRC-008 | Jensen et al., *Peptide Synthesis and Applications*, 2e | Not the registered work |
| SRC-009 | Crommelin et al., *Pharmaceutical Biotechnology*, 6e | Not the registered work |
| SRC-010 | Srivastava, *Peptide-based Drug Discovery* | Not the registered work |
| SRC-015 | Kastin, *Handbook of Biologically Active Peptides*, 2e | Not the registered work |

Plus SRC-021 to SRC-026 (USP chapters), which are not replacements but
acquisitions: registered, never held, awaiting the USP-NF subscription.

---

## 2. Procedure

### 1. Acquire and retain

Obtain lawfully. **Preserve the old artefact privately** — do not delete it. It
is the evidence of what was previously relied on, and if anything was extracted
from it the old file is the only way to audit that extraction.

File the old copy alongside the new one under a name that marks it superseded.
Both stay under `sources/`, which is gitignored.

### 2. Full intake on the new file

Run `SOURCE_INTAKE_CHECKLIST.md` from the top. **All of it.** A replacement is a
new source that happens to share a title, and the failure mode that created this
list in the first place was trusting a title.

```bash
npm run sources:audit
npm run sources:coverage
```

Pay particular attention to:

- **Edition.** A replacement is frequently a different edition. Different edition
  means different pagination *and possibly different content*.
- **Completeness.** Page count consistent with the work.
- **Domain coverage.** The decisive check. A second wrapper decoy is entirely
  possible.

### 3. Record the replacement relationship

Set `replaces_source_key` on the new source. Record in `integrity_notes` what was
wrong with the old copy and what was verified about the new one.

If the replacement is a **different edition**, it is a different work and should
be registered under its own key with the relationship recorded — not by
overwriting the old entry. Overwriting makes the old citations silently point at
a book nobody consulted.

### 4. Do not transplant locators

**This is the step the whole document is for.**

Every `source_location` recorded against the old copy is now suspect. Do not
carry page numbers across. Do not assume a constant offset between editions — it
is almost never constant, because front matter, typesetting and content all
change.

The database enforces the consequence. Changing `local_file_sha256` on a source
that already had a file fires `tides_source_file_replaced`, which flags every
dependent claim and protocol `needs_update` with a reason naming the source and
the date:

> *"The held copy of SRC-011 was replaced on 2026-09-11. Every locator on this
> record was recorded against the previous copy and must be re-resolved against
> the new one before this is relied on again."*

Deliberately a flag, not a withdrawal. The statements are probably still correct.
What is certain is that **nobody has checked them against the new copy**, and
`needs_update` is exactly the state for *live, and somebody must look*.

### 5. Re-establish the offset

From scratch. Two distant pages. See `LOCATOR_STANDARD.md` §2.

### 6. Re-resolve every dependent locator

```bash
npm run evidence:locators
```

For each dependent claim: open the new page, confirm the passage is there and
says what the claim says it says, and update `page_start` and `locator_text`.

If the passage is **not** in the new copy — a different edition dropped it, or
the claim rested on something the old copy invented — the claim does not get a
new locator. It loses its provenance and must be withdrawn or re-sourced.

### 7. Re-check the claims themselves

A new edition can have changed what it says. Re-read each dependent claim against
the new text, not only the page number. Where the wording has materially changed,
the claim is edited — which bumps its version, strands its approvals, and sends
it back for review. That is correct behaviour, not an obstacle.

### 8. Clear the flags

Only after 6 and 7, and only per record as each is confirmed. Clearing them in
bulk defeats the mechanism.

### 9. Update the verification issue

V-013 tracks SRC-011's replacement; V-014 stays open while any source needs
replacing. Close an issue only when the source is registered, accessible,
locator-verified **and** its dependents have been re-checked.

---

## 3. What must never happen

- Overwriting a source entry so old citations silently point at a different book.
- Carrying page numbers from one copy to another.
- Clearing `needs_update` in bulk after a replacement.
- Treating a different edition as the same source.
- Deleting the old artefact.
- Using an unauthorised copy to unblock a topic. The five decoys in this register
  arrived exactly that way, and they carried correct titles and genuine ISBNs.

---

## 4. Acquisitions that are not replacements

SRC-021 to SRC-026 have never been held. There is nothing to re-resolve and
nothing to flag — no claim rests on them, which a test asserts. When the USP-NF
subscription is in place:

1. Retrieve each chapter through the subscription.
2. Full intake, including access status `held` and the acquisition route.
3. Extract with locators in the ordinary way.
4. Close the corresponding gap and its issue (V-016 to V-021) — and **only** the
   one it actually closes. Q7 closed the certificate-content gap for one document
   family and nothing else, which is why V-015 was broken apart rather than
   marked resolved.
