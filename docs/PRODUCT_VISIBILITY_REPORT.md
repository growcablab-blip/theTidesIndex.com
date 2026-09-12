# PRODUCT VISIBILITY REPORT

The sprint that made the product visible. Nothing scientific was added, nothing
was published, `noindex` is unchanged, and no approval was fabricated.

---

## 1 · The command

```bash
npm run tides
```

Or right-click `scripts\start-tides.ps1` → **Run with PowerShell**.

It starts a real Postgres from `.pglite/`, applies the migrations, loads the
evidence, loads the demonstration compound, submits the four evidence packets for
review as the local editor, starts the site, and prints the pages to open. Ctrl+C
stops everything. First run takes a minute or two; afterwards about ten seconds.

`START_HERE.md` is the one-page version, including what to do when something
goes wrong.

**Nothing was weakened to achieve this.** The demonstration loader still refuses
a non-local database and the launcher checks localhost itself before asking for
it; the publish gates are untouched; packet submission is still attributed to a
named editor; and `TIDES_PREVIEW_UNPUBLISHED=1` renders unreviewed records at
their public routes *with their banners*, which a production build refuses
outright regardless of the flag.

---

## 2 · The URL

```
http://localhost:3000
```

---

## 3 · Routes available

| | |
|---|---|
| `/` | Home |
| `/quality` | Quality and testing — 19 topics, 4 written |
| `/quality/hplc-purity` | Chromatographic purity |
| `/quality/identity-testing` | Identity testing |
| `/quality/peptide-content-assay` | Content / assay |
| `/quality/certificate-of-analysis` | Reading a certificate |
| `/peptides` · `/peptides/[slug]` | Compound register and pages |
| `/search` | Deterministic search |
| `/sources` · `/sources/[key]` | Source register |
| `/methodology` · `/editorial-policy` · `/evidence` · `/routes` | How it works |
| `/coverage` · `/corrections` | What is and is not here |
| `/dev/review-packet/[slug]` | Reviewer packet — development only |
| `/dev/review-packet/[slug]/export` | Printable packet — development only |
| `/dev/review-packet/[slug]/bundle` | External review bundle — development only |
| `/admin/**` | Editorial surfaces — require a staff session |

The `/dev` routes are closed by two independent conditions: not a production
build, and preview explicitly enabled. They 404 when either fails.

---

## 4 · Screenshots

```bash
npm run screenshots
```

Eight full-page captures at 1440×900 in `review/screenshots/` (gitignored):

`01-home` · `02-quality-index` · `03-hplc-purity` · `04-identity-testing` ·
`05-peptide-content-assay` · `06-certificate-of-analysis` · `07-peptides` ·
`08-sources`

Driven by `playwright-core` against the **browser already installed on this
machine**. No browser download — a hundred-megabyte dependency to take eight
pictures is not a trade worth making, and the system browser renders the same
engine you will look at the site in.

---

## 5 · PDF prototype

```bash
npm run pdf
```

| | |
|---|---|
| Path | `build/publications/tides-index-peptide-quality.pdf` |
| Pages | **12** — cover plus eleven, one chapter per page, no continuation pages |
| Size | ~78 KB |
| Title | *Peptide Quality — From Manufacturing to the Final Vial* |

Contents: cover · what quality means · the three analytical questions · purity ·
identity · content · a certificate is not one test · which batch was tested ·
how to read a certificate · what a purity percentage does not settle · quality is
multi-dimensional · how this was made.

Eight vector figures, all drawn: the three-question triangle, one peak versus the
same sample resolved, separation versus mass, two vials at the same purity,
certificate anatomy, the traceability chain, the dimensions of quality with each
one's state, and the provenance chain.

**Safety.** Every statement paraphrases a located claim in the evidence
architecture — nothing was written to fill a page. No source is reproduced at
length and no source file is embedded. The specimen certificate is fictional and
carries a DEMONSTRATION ONLY stamp. Recorded gaps are printed as gaps in the same
typeface as everything else. The cover, the status line and the back matter each
say that no human reviewer has approved any of it.

Rendered with `@react-pdf/renderer` rather than by printing a web page: the same
input produces the same bytes on any machine, with no headless browser, and every
diagram stays vector at any zoom. Fonts are Source Serif 4 and Inter — the site's
own families, both SIL Open Font License, vendored under `assets/fonts` so a
build needs no network and the embedded faces are ones this project may embed.

---

## 6 · Reusable publishing components

Built as a system, not a one-off. `src/publishing/`:

| Module | What it holds |
|---|---|
| `theme.ts` | Palette, type scale, A4 geometry, twelve-column grid, font registration |
| `primitives.tsx` | `Cover`, `PublicationPage` (running head, folio), `ChapterOpener`, `SectionHeading`, `SubHeading`, `Body`, `Lede`, `Bullets`, `Figure`, `Callout`, `EvidenceNote`, `SourceNote`, `InPreparation`, `DemonstrationStamp`, `Comparison`, `Table`, `CurrentVersionBlock`, `CurvedDivider` |
| `figures.tsx` | Eight deterministic diagrams plus the cover mark |
| `books/` | One file per publication |

The three that matter most are about evidence rather than layout.
`EvidenceNote` prints what a statement rests on beside what it does not settle;
`SourceNote` carries the citations; `InPreparation` marks a subject the index
recognises and has not written. They exist so a page cannot be made to read as
settled when the record behind it is not.

---

## 7 · Understanding Peptides skeleton

| | |
|---|---|
| Path | `build/publications/tides-index-understanding-peptides-skeleton.pdf` |
| Pages | 15 — cover, about, contents, eleven chapter templates, back matter |
| Status | **Structure only. No medical content.** |

Each chapter carries a sized illustration placeholder, a brief of what it will
cover, and what has to exist before it can be written. Nothing on any page states
anything about peptides.

That is deliberate rather than unfinished. This is the volume read by the people
least able to check it, and a plausible paragraph written to fill a page is
indistinguishable from a sourced one once it is set in the same typeface.

Two chapters can be written first: *Understanding evidence*, which rests on the
editorial method rather than on peptide science; and *Quality, source and
testing*, which can be drawn from the Peptide Quality material once its review is
complete. The other nine need sources this index does not hold.

---

## 8 · What was changed in the product itself

Deliberately little. The site was already close, and this sprint was about making
it visible rather than rebuilding it.

- **Homepage hero.** The right half was empty. It now carries a drawn provenance
  figure — source → page → claim → review — restating the headline structurally.
  The alternatives that usually fill that space, a vial or a laboratory, would
  each say something this index is not.
- Everything else was audited and left alone.

---

## 9 · Remaining visual and product deficiencies

Honest list, worst first.

1. **The compound pages are nearly empty.** `/peptides` is a register of
   unwritten records. Correct, and it makes the compound half of the product look
   thin next to the quality half. Only evidence extraction fixes it.
2. **The homepage says "1 compound published".** It is the demonstration record.
   The public views do not expose the demonstration flag, so the page cannot
   caveat it without a migration — which this sprint was told not to make. In
   production the number is 0 and the question does not arise.
3. **`/quality` has an awkward measure.** The intro callout is narrow against a
   full-width family grid below it, and the three-questions figure leaves a large
   gap on the right at 1440px.
4. **No mobile pass.** Every page was checked for overflow at 375px and none
   overflows, but nothing has been *designed* for small screens.
5. **The PDF has no index, no glossary and no page cross-references.** Fine for a
   twelve-page excerpt, not for a finished volume.
6. **The QR block is a placeholder.** It is drawn to look like what it will be and
   is labelled "placeholder"; the real code needs a public URL.
7. **Print stylesheets for the website** have not been looked at since C.9.
8. **Search returns little**, because there is little. Not a defect.

---

## 10 · Recommended next action

**Look at the two things, in this order.**

First `npm run tides` and the twelve stops in `docs/OWNER_PRODUCT_TOUR.md` —
about twenty minutes. Then `npm run pdf` and read the Peptide Quality PDF end to
end, which takes ten.

Then the decision worth making is which of these three the next sprint is:

| | |
|---|---|
| **A — Send the HPLC packet to a real reviewer** | The evidence is ready and the bundle is built. It needs a person, and that is your call, not a build task. |
| **B — Extend the evidence** | Start BPC-157 or the peptide-science topics, and the compound half of the product stops being empty. |
| **C — Finish the publication** | Take Peptide Quality from prototype to a reviewed first edition, which means A first. |

The argument for **A** is that everything built in the last three days rests on
an untested assumption: that a qualified person will engage with a packet in this
form. Until one has, more evidence is more of something that may need reworking.

Nothing further will be built until you have looked.
