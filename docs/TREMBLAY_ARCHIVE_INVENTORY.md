# TREMBLAY ARCHIVE INVENTORY

Date: 26 September 2026. Baseline: `e532970` (Section 4, tranche 2).
Archive reviewed: the owner-supplied archive folder named in the Section 5 brief, recursively.
It sits outside this repository and its path is deliberately not recorded here.

**This is the authoritative inventory of the archive supplied for Section 5.** It records what the
archive contains, what it does not contain, and the provenance determination that follows.

The archive was supplied from a folder outside this repository. Where a file happens to sit on a
disk is a fact about storage and nothing else: it confers no authorship, no affiliation and no
identity on The Tides Index, and none appears anywhere in this work.

---

## 1. THE HEADLINE FINDING

**The archive contains no Tremblay artifact.**

It contains two files. Both are *extraction records about* Jean-François Tremblay's public
appearances — research working documents, one of them a rendering of part of the other. Neither is a
recording, a transcript, a document he wrote, or anything else he produced.

The nineteen podcast episodes and four videos that the extraction record is built from are **not in
the archive**. They are named, dated and linked, and three of them have full public transcripts, but
none has been obtained.

This governs everything that follows, and it is the reason no Tremblay claim or protocol has been
published. The rule is the project's own, written into the source manifest schema: *nothing may rest
on a source this index cannot open.*

---

## 2. COMPLETE FILE INVENTORY

Two files. No subdirectories, no hidden files.

### 2.1 `Tremblay_Tides_Index_Complete_Research_File.md`

| Field | Value |
|---|---|
| Full path | `<ARCHIVE>/Tremblay_Tides_Index_Complete_Research_File.md` |
| Type | Markdown, UTF-8 |
| Size | 122,884 bytes |
| SHA-256 | `1017753ab1c9ae6693ba65ab1f5208d26e29c931dab2f1958fb5f1bbad75d259` |
| Lines | 1,107 |
| Title (self-declared) | "JEAN-FRANÇOIS TREMBLAY (CanLab) — COMPLETE RESEARCH FILE FOR THE TIDES INDEX" |
| Author | **None stated.** No byline, no organisation, no publication status |
| Date (self-declared) | Consolidated 2026-09-26 from three passes (2026-09-24 archive; 2026-09-25 protocols v0.9; 2026-09-25 protocols pass 2) |
| Status (self-declared) | "READY WITH REVIEW FLAGS" |
| Language | English |
| Text extraction | Native; fully readable |
| OCR required | No |
| Structure | Four parts: knowledge archive, protocols v0.9, protocols pass 2, consolidated position history |
| **Classification** | **B — related contextual material** (a derived research compilation), not A |
| Provenance confidence | Content verifiable as a document; **authorship unattributable** |

**What it holds.** A master source registry (39 rows), a claim ledger (40 claims with per-claim
evidence assessments), a peptide index, a referenced-literature list, a compound-by-compound protocol
outline with timestamps, a "Tremblay vs literature" comparison, a search audit, and six
high-priority human-review flags.

**What it is not.** It has no author, no publisher and no public existence. A citation pointing at it
is a citation no reader could ever check, which is the one thing a Tides locator must never be.

### 2.2 `Tremblay Protocols Pass 2.pdf`

| Field | Value |
|---|---|
| Full path | `<ARCHIVE>/Tremblay Protocols Pass 2.pdf` |
| Type | PDF 1.7 |
| Size | 8,280,594 bytes |
| SHA-256 | `d328c8fd2aa2f22f950137920d5ac2e120074452919b92d39ad284386f08ee5b` |
| Pages | 15 |
| Embedded title | "Tremblay Peptide Protocols Pass 2: Extraction Record for The Tides Index" |
| Producer | Microsoft: Print To PDF |
| Created | 2026-09-26 23:04:23 −04:00 |
| Text extraction | **None. Zero extractable characters across all 15 pages** |
| Embedded images | **None** |
| Fonts | **None** |
| Why | Glyphs are drawn as filled vector paths, so there is no text layer and no image to read |
| Read by | Rasterising with PyMuPDF at 140 dpi and reading the pages |
| **Classification** | **C — duplicate** of the markdown file's PART 3 |
| Provenance confidence | High: title, date and content all match PART 3 |

**The duplicate relationship was verified, not assumed.** Page 1 of the PDF and the markdown's PART 3
carry the same TL;DR, the same coverage figures (of 19 target appearances, 1 fully mined, 10 with
timestamped notes, 8 inaccessible), the same conflict about the Jay Campbell attribution, and the
same two newly identified appearances. The markdown is the superset: it contains PART 3 plus three
other parts.

**A tooling note worth recording.** This file is unreadable by the project's normal path. `unpdf`
extracts nothing because there is nothing to extract, and no rasteriser is installed (`pdftoppm`,
Ghostscript and ImageMagick's `convert` for PDF are all absent). It was read only because PyMuPDF
happens to be present in the system Python. Any future archive arriving as a print-to-PDF will hit
the same wall.

### 2.3 Classification summary

| Class | Count | Files |
|---|---|---|
| A — Tremblay / CanLab source material | **0** | — |
| B — related contextual material | 1 | the markdown research file |
| C — duplicate | 1 | the PDF, duplicating PART 3 of the markdown |
| D — unrelated to Tremblay | 0 | — |
| E — unreadable / incomplete | 0 outright; 1 partially | the PDF has no text layer, and was read only by rasterising |
| F — uncertain identity | 0 files; see below | the markdown's *authorship* is uncertain, though its content is not |

---

## 3. WHAT THE ARCHIVE SAYS EXISTS, AND IS NOT IN IT

The extraction record identifies 39 items. None is present as a file.

### 3.1 Registered in this section — 23 speech artifacts

Nineteen podcast episodes and four videos, now registered individually as **SRC-201 … SRC-223**, with
SRC-016 rewritten from a placeholder into the collection record. Every one carries
`access_status: public_not_yet_retrieved`, the commercial conflict note and the limitations note.
**Nothing in the index cites any of them.**

| Key | Appearance | Date | Transcript |
|---|---|---|---|
| SRC-201 | Under The Bar Ep 84 | 2018-04-29 | No |
| SRC-202 | Muscle Expert 68 | 2018-01-18 | No; timestamped notes |
| SRC-203 | The Question Bus 84 | 2018-11-19 | No; content unknown |
| **SRC-204** | **Ben Greenfield, "The Peptides Podcast"** | **2019-04-13** | **Full, public** |
| SRC-205 | Muscle Intelligence 021 | 2019-04-29 | Auto, behind login |
| **SRC-206** | **The Energy Blueprint #1** | **2019-06-14** | **Full, public** |
| SRC-207 | Under The Bar Ep 114 | 2020-02-23 | No |
| SRC-208 | Decoding Superhuman 141 | 2019-12-24 | No; timestamped notes |
| SRC-209 | Niddam, "Peptides for Fat Loss" | 2020-09-25 | No; rich notes |
| SRC-210 | Niddam, "TB500 vs Thymosin Beta 4" | 2020-10-29 | No; timestamps |
| SRC-211 | Niddam, "Love Your Liver" | 2020-12-08 | No; topics only |
| SRC-212 | United Fight Alliance | 2021-01-11 | No; timestamps |
| SRC-213 | Niddam Ep 25, BPC-157 | 2021-02-05 | No |
| SRC-214 | Niddam Ep 54 | 2021-08-03 | No |
| SRC-215 | Niddam Ep 102 | 2022-06-28 | No |
| **SRC-216** | **The Energy Blueprint #2** | **2022-07-09** | **Full, public** |
| SRC-217 | RX'D Radio E448 | 2024-01-03 | No |
| SRC-218 | Architect of Resilience #55 | 2026-09-09 | **None at all** |
| SRC-219 | Human Optimization Podcast | 2021-05-21 | No |
| SRC-220 | Niddam YouTube, "Talking Peptides" | undated | Captions unchecked |
| SRC-221 | Niddam YouTube, "Myth Busting" | undated | Captions unchecked |
| SRC-222 | Danny Bossa Podcast | undated | Captions unchecked |
| SRC-223 | YouTube "Peptides For Healing and Health" Pt 3 | undated | Captions unchecked |

### 3.2 Identified and deliberately not registered — 16 items

| Kind | Count | Why not registered |
|---|---|---|
| Web profiles and commercial sites | 5 | A vendor's shop front and a membership profile are context, not evidence. A membership is not a credential |
| Secondary third-party reports | 4 | Other people's accounts of what he said. One matters and is tracked as a conflict: an undated blog attributing a bioregulator regimen that contradicts his own later correction |
| Regulatory and news documents | 5 | Health Canada's advisory and injunction, and press coverage. Genuinely citable public documents, but they concern a *company*, and this index has no place for a claim about a vendor. Recorded as context on every source record instead |
| Candidate scholarly papers | 2 | Both `UNCERTAIN` identity. Registering them would attach a stranger's work to this speaker on the strength of a surname |

---

## 4. WHO THE SOURCE IS, AND THE CONTEXT THAT TRAVELS WITH HIM

Recorded because it is observable and disclosed, not speculative, and because it must be attached to
every record in the collection before anything is ever cited from it.

- **Role.** Founder and owner of CanLab (also CanLab Sciences, Canlab Research), a peptide vendor in
  Montreal / Laval, Quebec. He is describing products he sells.
- **Credentials.** Unverified and inconsistent across appearances. In the April 2019 Greenfield
  episode he corrects the host on air: he holds a master's degree, not a doctorate. **The title "Dr."
  must never be displayed.**
- **Research record.** No peer-reviewed publication, patent, thesis or registered clinical trial on
  peptides by this person has been identified. Two candidate papers carry a matching surname and
  `UNCERTAIN` identity.
- **Regulatory history.** Health Canada public advisory against Canlab Research, 13 December 2023;
  a Ministerial Order and a provisional injunction in 2024; and a **permanent injunction granted by
  the Superior Court of Quebec on 11 June 2026**, announced 29 July 2026, under which the company
  cannot manufacture, test, distribute or sell unauthorised injectable peptides, nor assist others in
  doing so. No public document located names him personally, so he is **not** described as personally
  enjoined.

None of this decides whether any individual statement is right. It is context a reader is entitled to
have, and it is now on the record rather than in somebody's memory.

---

## 5. ACQUISITION PRIORITY

What to obtain, in order, and what each unlocks.

| Priority | Artifact | Why first |
|---|---|---|
| 1 | **SRC-206** — Energy Blueprint #1, 2019-06-14 | Full public transcript, and the only appearance from which a complete protocol extraction has been attempted. Holding it would make the oral-versus-injected BPC-157 conversion and the growth-hormone-secretagogue timing rules citable with exact timestamps |
| 2 | **SRC-204** — Ben Greenfield, 2019-04-13 | Full public transcript. The largest single body of general positions — administration, safety, sourcing and quality — and the episode where the doctorate is disclaimed on air |
| 3 | **SRC-216** — Energy Blueprint #2, 2022-07-09 | Full public transcript. The appearance where two positions change: local injection, and the bioregulator dose correction. Position changes are more valuable than positions |
| 4 | **SRC-218** — Architect of Resilience #55, 2026-09-09 | No transcript, captions or chapter markers exist; its cycling and dosing content lives only in the audio. The most recent appearance and the largest unrecorded item. Needs transcription, not retrieval |
| 5 | SRC-209, SRC-210, SRC-214, SRC-215 | Timestamped host notes already point at specific dosing segments; each would need transcription of a named window rather than a whole episode |

Three transcripts are public web pages. **The distance between this section's outcome and a citable
Tremblay record is retrieving three URLs.**

---

## 6. WHAT WAS NOT DONE, AND WHY

- **No Tremblay claim or protocol was published.** No locator can be verified against any held
  artifact, and Part 5 of the section brief is explicit: where a precise locator cannot be
  established, the statement is not published.
- **No claim cites the extraction record.** It is unattributable and not public. Citing it would put
  on the public site a reference no reader could follow.
- **No broad external retrieval was attempted**, as instructed. The three public transcripts were
  identified, not fetched.
- **No new compounds were created.** Compounds the collection discusses that the register does not
  carry are in the hold list in the Section 5 report.
- **Nothing was copied into the repository.** No transcript, no PDF, no rendered page. The rasterised
  pages used to read the PDF were written to a scratch directory outside the project and are not
  committed.
