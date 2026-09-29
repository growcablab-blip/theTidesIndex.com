# EXPERIENCE REVAMP — PHASE 1C, VISUAL TRANSFORMATION

Date: 29 September 2026.
Baseline: `07ca696` (Phase 1B, live).
Scope: `/peptides/bpc-157` and `/protocols/stacks/bpc-157-tb-500`. Nothing else.

**Visual only.** No claim, protocol, source or locator was edited. No
comparison logic changed. The TB-500 / thymosin beta-4 ambiguity is still
unresolved, and there is still no Tides dose.

---

## 1. WHAT CHANGED, IN ONE LINE

The two prototypes stopped being a white paper and became an instrument.

The information architecture from Phase 1/1B is intact — same order, same
records, same derivations. What changed is surface, scale, depth and the fact
that the page now draws things instead of only describing them.

---

## 2. SURFACE RHYTHM

The organising decision. A reference read entirely on white reads as a white
paper however good the words are; read entirely on dark it reads as a
brochure. Both prototypes now alternate deliberately:

| Band | Surface | Carries |
|---|---|---|
| Hero | **deep** + instrument grid | Name, lede, interest tags, telemetry, the molecular field |
| What it is | light | Lead paragraph, identity record, compound mark |
| Why it is studied | soft tech | Research-interest cards |
| Evidence + mechanism | **deep** + grid | The evidence landscape and the pathway diagram |
| What the research says | light | Claim prose |
| Reported protocols | ivory | Protocol cards and the comparison matrix |
| Combinations | soft tech | Stack links |
| Administration, safety, unknowns, quality | light | Claim prose and gaps |
| Context and the rest | **deep** | Regulatory, remaining statements |

Four surfaces, defined once in `globals.css` as `.surface-deep`,
`.surface-soft-tech`, `.surface-ivory` and plain warm white. All additive — no
existing class changed, so the reference layout serving the other
twenty-seven compounds is untouched.

---

## 3. EVERYTHING VISUAL IS DRAWN

No photography and no stock imagery, on principle rather than for lack of
budget: a reference that shows a stock photograph of a laboratory has told the
reader something false before they read a word.

| Visual | What it is |
|---|---|
| `MolecularField` | The hero. A peptide chain projected as a coil over suggested vasculature, inside an instrument ring, lit from behind. `role="img"` with a label that says it is decorative and not measured data |
| `CompoundMark` | A small generated mark, hashed from the slug so it is stable and distinct per compound — deliberately abstract, because an invented "structure" that looked real would be a lie told in pictures |
| `CombinationField` | The combination hero. Two identities joined by a **dashed** line: a solid one reads as a mechanism and nothing held establishes one |
| `PathwayDiagram` | The mechanism, as four stages |
| `EvidenceLandscape` | Proportional bars, each printing its own counts |

All geometry is deterministic — no `Math.random` at render, so server and
client agree and nothing shifts on hydration.

---

## 4. THE MECHANISM SECTION, AND WHY IT NEEDED THE MOST CARE

A pathway drawn as boxes and arrows is the most persuasive object this
reference can put on a page, and therefore the most dangerous. Two failures are
easy and both are fatal: drawing a step no source reports, and drawing a
preclinical step so confidently it reads as established in people.

Three rules answer that, in `src/domain/presentation/mechanism-pathway.ts`:

1. **Every node is a verbatim phrase from a held claim** — a substring, not a
   paraphrase. Built from four records: BPC-004, BPC-013, BPC-003, BPC-012.
2. **Every node renders the claim key it came from**, so any box follows back
   to a record and a source.
3. **A node whose claim is unpublished or reworded does not render.** The
   diagram cannot outlive its evidence; a stage that loses all its nodes
   disappears too.

`tests/unit/mechanism-pathway.test.ts` holds the four claim texts as the record
publishes them and asserts all three — 20 tests. If a record is reworded
upstream, the suite fails rather than leaving a label behind that nothing
supports.

The caption states that an arrow means **reported next**, not **causes**, and
because every record behind the diagram is animal or cell work, the section
says so in bold:

> No step on this diagram rests on evidence from people — every record behind
> it is an animal or a cell study.

That sentence is computed, not typed: `pathwayHasHumanEvidence()` reads the
evidence lanes of the claims actually rendered.

What remains authored is the *arrangement* — which phrase sits in which stage.
That is presentation, it is why the file is scoped to one compound rather than
generalised, and it does not extend to the other records.

---

## 5. PROTOCOLS — THE CENTREPIECE

`ProtocolDataCard` replaces the plain field list.

- The **source's name is the heading**, because that is what the record is: a
  report by an identifiable person or study, not an instruction.
- **Amount, frequency and duration** sit in a three-cell band at display
  weight, so the card is useful at a glance.
- Everything else — route, formulation, timing, cycle, titration, alongside,
  monitoring, outcome — is a labelled data row.
- A field the record does not carry **is not rendered at all**, rather than
  shown as "not specified", which reads like an omission a reader could fill in.
- A colour band identifies the card. It is identity only: never a rank, a
  quality or a recommendation.
- The amount still renders with its unit (`250 mcg`, not `250`).

The lede is unchanged and still says there is no Tides dose and there will not
be one.

---

## 6. THE COMPARISON

Presentation only. `compareProtocols` is byte-for-byte unchanged: still counted
off the records, still grouped so a trial is never compared with a handbook,
still reporting silence as silence, and an empty column still says so in words
rather than rendering blank.

`ComparisonMatrix` gives each column a header, a line count, a colour band and
its records grouped by kind.

---

## 7. THE COMBINATION PAGE

- **Hero**: the combination field, with the three-part statement beside it.
- **Framework**: `01 INDIVIDUAL EVIDENCE / 02 COMBINATION REPORTS / 03 DIRECT
  COMBINATION EVIDENCE`, at display size, with the third panel given the
  heavier treatment because it is the one that matters.
- **Members**: graphical cards — compound mark, summary, human-evidence count,
  regimen count.
- **Reports**: one card per held record, amber ambiguity note intact.

**The ambiguity is not resolved visually.** TB-500 and thymosin beta-4 are
drawn as two overlapping circles inside a *dashed* boundary labelled `NAMED
INTERCHANGEABLY BY SOURCES` — shown as an ambiguity, never merged by the
picture into one thing.

---

## 8. A REAL BUG FOUND AND FIXED

`h1, h2, h3, h4 { color: var(--color-ink) }` sat unlayered in `globals.css`.
Unlayered author rules beat every layered one whatever the specificity, and
Tailwind's utilities are layered — so `text-on-deep` and `text-warm-white` on a
heading were being silently discarded.

**Every dark-panel heading on the prototypes was ink on navy**, and had been
since Phase 1. It is visible in the earlier screenshots once you know to look.

Only the colour declaration moved into `@layer base`: a heading that asks for
nothing still gets ink, and a utility now wins as it should. Verified live —
the H1 computes to `rgb(234, 244, 246)`.

---

## 9. SIMPLE / PRACTITIONER

Unweakened. Verified against the **live** pages, by markup:

| | Compound page | Combination page |
|---|---|---|
| Dose-shaped figures, simple | **0** | **0** |
| Dose-shaped figures, practitioner | 11 | 20 |
| Protocol cards, simple | absent | absent |
| Comparison, simple | absent | n/a |
| Single-compound regimens, simple | n/a | absent |
| Source attribution, simple | present | present |
| Ambiguity note, simple | n/a | **present** |

`qa:doses` is clean across 28 compounds and the combination page.

**One deliberate consequence to record.** The research-interests band is
practitioner-only. It derives from protocol objective contexts, and every
BPC-157 protocol carries `patient_visibility = false`, so simple reading has no
regimens to derive from and the band does not render. The honest options were
to leave it out or to invent a second derivation from other text; inventing one
is exactly what this pass was told not to do. Worth an owner decision.

---

## 10. TYPOGRAPHY, COLOUR, MOTION

**Typography** — display sizes lifted (hero to `text-7xl`, section titles to
`2.75rem`), a `.numeric` class with tabular figures for data, and `.label-micro`
for metadata so explanation and evidence-metadata separate cleanly.

**Colour** — added, never replaced: abyss, deep navy, cyan, scientific blue,
indigo, restrained violet, ivory, plus three text tones for the deep surfaces.
No rainbow and no neon; the luminous values appear only on the deep bands.

**Motion** — three effects only: a slow drift on the hero's illumination and
ring, a pulse on one node and the source-linked dot. All decorative, all paired
with a word, and all stopped by `prefers-reduced-motion: reduce`. Nothing
conveys state by movement.

**Print** — the deep surfaces and glass panels flatten to white; the instrument
grid is removed.

---

## 11. HEADER

Taller bar (4.75rem, 5.25rem from md), larger wordmark, roomier navigation with
an underline that grows on hover, a softer search control, and the movement
hairline along the bottom edge. No wave.

---

## 12. QA

| Check | Result |
|---|---|
| `npm run lint` | **Clean** |
| `npm run typecheck` | **Clean** |
| `npx vitest run tests/unit` | **489 passed, 35 files** — 20 new |
| Integration: peptide-experience, every-compound-renders, reading-mode | **28 passed** |
| `npx vitest run tests/integration` (full) | **435 passed, 37 files**, 46 minutes |
| `npm run qa:doses` | **Clean** |
| `npm run build` | **Clean** |
| Horizontal overflow, 390 / 1440 | **None**, both pages, local and live |
| Live routes, both modes | **200** |
| `robots.txt` | `Disallow: /` — indexing still off |

The full integration suite passed after the deploy: **435 tests across 37
files**. Nothing in this pass touched shared query or schema code — the
changes are components, one domain module and stylesheet additions — and the
suite confirms it.

---

## 13. WHAT WAS NOT TOUCHED

- The other twenty-seven compound pages.
- The homepage, `/learn`, `/quality`, `/research`, `/sources`, `/protocols`.
- Any claim, protocol, source, locator, migration or seed record.
- The comparison derivation, the attribution logic, the dose boundary.
- `TIDES_ALLOW_INDEXING` — still unset.

---

## 14. LIVE, FOR OWNER REVIEW

- https://thetidesindexcom-production.up.railway.app/peptides/bpc-157
- https://thetidesindexcom-production.up.railway.app/protocols/stacks/bpc-157-tb-500

Both render from the production database, in both reading modes.

The question to answer before anything is rolled out:

> **Does this now feel like TECH + PEPTIDES + ADVANCED HUMAN RESEARCH?**

Work stops here.
