# SOURCE INTEGRITY REPORT

**Verification issue V-014. Audit date: 11 September 2026.**

Every held file was opened, hashed, page-counted, its front matter read, and its
entire text scanned for the vocabulary the registered work would necessarily use.

---

## Headline finding

**Five of the sixteen registered sources are not the works they claim to be.**

They are aggregator decoys: two or three cover pages carrying the correct title,
the correct ISBN, a price and a download link — followed by a hundred-plus pages
of unrelated text scraped from other books. In a file listing they are
indistinguishable from real copies.

Three of them were previously recorded in the registry as *"genuine content after
promotional pages"*. That description was wrong, and it was the description that
would have permitted them to be cited.

A sixth file, SRC-011, holds authentic front matter and the opening of its first
chapter before degenerating into the same filler — which is why its correct
editor could be confirmed from it even though the copy is unusable.

**Nothing in the index was affected**, because nothing has been published yet.
Had extraction begun before this audit, work would have been done against books
that do not exist in this library, and the citations would have pointed at pages
of fiction.

---

## Method

`npm run sources:audit` — opens each PDF, records SHA-256, byte size and page
count, extracts the first fourteen pages plus probes at 25%, 50%, 75% and 95%,
and looks for wrapper markers, ISBNs, publisher names and title-page structure.
Full output to `data/private/source-audit.json`, which is gitignored because it
contains extracted copyrighted text.

`npm run sources:coverage` — scans **every page** of every file for peptide
domain vocabulary (`peptide`, `amino acid`, `chromatograph`, `hplc`,
`mass spectrom`, `lyophil`, `synthesis`, `residue`, `sequence`, `purification`).

That second measure is what separates a partial copy from a decoy, and it is
decisive. A peptide chemistry text mentions its own subject on almost every
page. A file carrying the title of one and mentioning peptides on 4% of its pages
is not a damaged copy of that book.

`npm run sources:apply-audit` writes the conclusions into `SOURCE_MANIFEST.json`,
which is the durable record; the findings are re-checkable rather than
remembered.

---

## Results

Domain coverage is the share of pages containing any domain term.

| Key | Pages | Domain | QC | Verdict |
|---|---:|---:|---|---|
| SRC-001 | 322 | 39% | **usable** | Complete |
| SRC-002 | 281 | 61% | **usable** | Complete |
| SRC-003 | 264 | 70% | **usable** | Complete |
| SRC-004 | 10 | 70% | **usable** | Complete |
| SRC-005 | 208 | 81% | **usable** | Complete |
| SRC-006 | 401 | **93%** | **usable** | Complete and clean |
| SRC-007 | 201 | **94%** | **usable** | Complete |
| SRC-008 | 204 | 4% | replace | **Not the registered work** |
| SRC-009 | 201 | 6% | replace | **Not the registered work** |
| SRC-010 | 196 | 6% | replace | **Not the registered work** |
| SRC-011 | 96 | 14% | replace | Authentic front matter, then filler |
| SRC-012 | 283 | 83% | **usable** | Complete |
| SRC-013 | 2 | 100% | replace | Contents listing only |
| SRC-014 | 157 | 3% | replace | **Not the registered work** |
| SRC-015 | 163 | 5% | replace | **Not the registered work** |
| SRC-016 | — | — | pending | Not captured |

**Eight citable. Seven requiring replacement. One not yet captured.**

---

## Source by source

### Confirmed and usable

**SRC-001 — Seeds, *The Peptide Protocols, Volume 1*, Spire Institute, 2020**
ISBN 9780578624358 · 322 pages. Title page, copyright page and full contents
present.
*Strongest use:* mechanisms and cellular systems as the author presents them;
practitioner protocol examples. Not a source of trial evidence.

**SRC-002 — LaValle, Crozier, Cleaver, Heyman, *Peptide Handbook*, Integrative
Health Resources, 2022**
281 pages, monograph structure intact.
*Caveat:* scanned rather than born-digital; text extraction is imperfect, so page
locators must be confirmed visually before citation.
*Strongest use:* standardised monographs, routes and cautions as described.

**SRC-003 — Campbell, *Optimize Your Health with Therapeutic Peptides*, 2023**
264 pages. *Strongest use:* a record of what the author advocates.

**SRC-004 — Campbell, *Peptide Cheat Sheet*, 2025**
10 pages of tabulated regimens with **no cited sources and no stated derivation**.
*Strongest use:* evidence that these figures circulate. Every number in it needs
independent verification before it could support anything.

**SRC-005 — Hack Smith, *The Complete Guide to Peptides*, 2025**
208 pages. Self-published compilation.
*Strongest use:* discovering which compounds are discussed in practice.

**SRC-006 — Grant (ed.), *Synthetic Peptides: A User's Guide*, 2nd edn, Oxford
University Press, 2002** · ISBN 0-19-513261-0 · 401 pages · **93% domain
coverage**

The single most important result of this audit. Complete, clean, born-digital,
and its embedded PDF metadata agrees with its title page. Series: *Advances in
Molecular Biology*.

*Strongest use:* **chromatographic and analytical principles — the spine of the
quality section.** Authoritative on separation, detection and what a purity
figure describes.
*Limits:* published 2002. Principles have not changed; instrumentation,
regulatory expectations and compendial method requirements have.

**SRC-007 — Kruger & Albericio (eds.), *Advances in the Discovery and Development
of Peptide Therapeutics*, Future Science Ltd, 2015** · ISBN 978-1-910419-02-1 ·
201 pages · 94% domain coverage

**Publisher corrected.** The registry recorded none, and an incidental reference
to the Royal Society of Chemistry in the body could have led to a wrong
attribution. The title page states Future Science Ltd, ISSN 2047-332X.
*Strongest use:* manufacturing, formulation and delivery. Review chapters —
trace to the primary study before relying on a specific finding.

**SRC-012 — Xu, Ye & Tam (eds.), *Peptides: Biology and Chemistry*, Kluwer, 2002**
ISBN 0-306-46859-X · 283 pages. Proceedings of the 1996 Chinese Peptide
Symposium. Confirmed as the proceedings, **not** the Sewald/Jakubke textbook it
is sometimes confused with.
*Strongest use:* historical and supporting only.

### Requiring replacement — not the registered work

Each of these is a wrapper plus unrelated filler. None can support any statement.

| Key | Registered as | What the file actually contains |
|---|---|---|
| SRC-008 | Jensen et al., *Peptide Synthesis and Applications*, 2e | Climate policy, human trafficking, family systems, fiction |
| SRC-009 | Crommelin et al., *Pharmaceutical Biotechnology*, 6e | Hume scholarship, parliamentary debate, island snake biogeography |
| SRC-010 | Srivastava (ed.), *Peptide-based Drug Discovery* | Barometric measurement; fiction in English, Spanish and German. The strongest title-like heading belongs to *Herbal Bioactive-Based Drug Delivery Systems* |
| SRC-014 | Banga, *Therapeutic Peptides and Proteins*, 3e | African Union politics, psychoanalysis, portfolio management |
| SRC-015 | Kastin (ed.), *Handbook of Biologically Active Peptides*, 2e | Project management, educational psychology, marketing |

The wrappers carry genuine ISBNs — SRC-009's `978-3-031-30022-6` is the real
Springer identifier — which is precisely why a listing cannot be trusted.

### Requiring replacement — right work, unusable copy

**SRC-011 — Fields (ed.), *Peptide Characterization and Application Protocols*,
Methods in Molecular Biology vol. 386, Humana Press, 2007** · ISBN
978-1-58829-550-7

**Identity confirmed and corrected (V-013 resolved as to identity).** Page 1 is a
Scribd wrapper naming Colin T. Mant — lead author of Chapter 1, not the editor.
Pages 3–4 carry the authentic Humana front matter: the *Methods in Molecular
Biology* series listing, John M. Walker as series editor, and both real ISBNs.

The copy holds 96 of roughly 500 pages, and the body after the opening of
Chapter 1 is filler. Not citable, including from the authentic pages, until a
complete copy is verified. **V-013 remains open for the replacement.**

**SRC-013 — Costantino & Pikal, *Lyophilization of Biopharmaceuticals***
Two pages, a contents listing generated from a Word document. Confirms the work's
identity and chapter structure; contains no body text.

### Not captured

**SRC-016 — Tremblay / CanLab dossier.** No file held. Expert commentary; will
require exact source, date and timestamp before any use.

---

## Consequences for the index

**The quality section now rests on one source.** SRC-006 is the only complete
analytical reference held. SRC-011 and SRC-013 — the other analytical and
formulation references — are both unusable, and no compendial or regulatory
source is in the register at all. Logged as **V-015**.

This constrains what the HPLC module can honestly say. Chromatographic
principles, what a purity figure describes, and what it does not — these SRC-006
supports directly. Current compendial method requirements and regulatory
expectations it cannot, and the module says so rather than filling the gap.

**Sterility, bacterial endotoxin, GMP systems and residual solvents cannot be
written at all** from the current register. They need official standards and
guidance that are not held.

**The enforcement is automatic, not editorial.** `sources.is_citable` is a
generated column derived from QC status; the publish gates read it. Anything
resting on a `replace` source would be refused at publication, and had something
already been published on one, downgrading the source would have withdrawn that
content and flagged it with the reason. No editor has to remember this.

---

## Replacements needed

Ordered by what unblocks the most work.

1. **SRC-011** — Fields, *Peptide Characterization and Application Protocols*,
   MiMB 386, Humana, 2007. Unblocks HPLC, mass spectrometry and identity testing.
2. **A current compendial or regulatory analytical source.** Nothing in the
   register is current on method requirements (V-015).
3. **SRC-013** — Costantino & Pikal, *Lyophilization of Biopharmaceuticals*.
   Unblocks lyophilisation and storage stability.
4. **SRC-014** — Banga, *Therapeutic Peptides and Proteins*, 3e. Unblocks
   formulation and administration routes.
5. **SRC-008** — Jensen et al., *Peptide Synthesis and Applications*, 2e.
6. **SRC-009** — Crommelin et al., *Pharmaceutical Biotechnology*, 6e.
7. **SRC-010** — Srivastava (ed.), *Peptide-based Drug Discovery*.
8. **SRC-015** — Kastin (ed.), *Handbook of Biologically Active Peptides*, 2e.

---

## The lesson, recorded

Third-party filenames, wrapper cover pages and embedded ISBNs are **not**
bibliographic authority. All three were correct on files containing none of the
work they named.

What settled it in every case was opening the file and reading its front matter,
then checking whether the body discusses the subject at all. Both are now
scripted and repeatable:

```bash
npm run sources:audit       # hash, page count, front matter, wrapper detection
npm run sources:coverage    # does the body discuss the subject?
npm run sources:apply-audit # write conclusions to SOURCE_MANIFEST.json
npm run sources:verify      # registry still binds to files on disk
```

`tests/unit/source-integrity.test.ts` holds the conclusions in place: a source
whose bibliographic identity is unconfirmed cannot carry a citable QC status, and
every held file must have had its front matter read.

**No new source should be extracted from until it has been through this.**
