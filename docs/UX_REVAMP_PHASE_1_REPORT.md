# EXPERIENCE REVAMP — PHASE 1

Date: 28 September 2026.
Baseline: `dd989ce`.
Scope: two gold-standard prototypes, built on the records already in the index.

**Nothing in the evidence engine was rebuilt.** No claim, protocol, source or
locator was edited. Every sentence either comes out of a record or is counted
off one, and where a page needed a judgement that no record carries, the page
does not make it.

---

## 1. WHAT WAS BUILT

| | |
|---|---|
| **A — compound experience** | `/peptides/bpc-157`, behind `EXPERIENCE_SLUGS` |
| **B — combination experience** | `/protocols/stacks/bpc-157-tb-500`, a new route |

The other twenty-seven compounds keep the record layout, on the same data, so
the two can be judged side by side. The switch is one line.

New files:

```
src/components/public/experience.tsx            presentation primitives
src/components/public/compound-experience.tsx   the compound composition
src/components/public/stack-experience.tsx      the combination composition
src/server/public/stacks.ts                     combination register and reader
src/domain/presentation/protocol-comparison.ts  derived source comparison
src/app/(public)/protocols/stacks/[slug]/page.tsx
tests/unit/reported-regimen-comparison.test.ts  9 tests
tests/unit/combination-attribution.test.ts      8 tests
```

---

## 2. THE ORDER OF THE COMPOUND PAGE

The record page opened with review state and nomenclature — the order the
evidence system cares about. A reader arrives with a different order in mind.

```
hero → review state → what it is → what the evidence amounts to →
how it is thought to work → what is reported about it → what sources report doing →
where they agree and differ → combinations → administration → safety →
quality → regulatory status → references
```

Regulatory status is the thirteenth thing a reader meets rather than the
first. It is unchanged in content, date-stamped as before, and still on the
page in full.

---

## 3. WHAT IS DERIVED, AND WHAT IS AUTHORED

This is the part worth checking hardest, because the first draft of both
prototypes got it wrong.

**The first draft hand-wrote the comparison.** A constant in the route file
said things like *"subcutaneous injection is the route every practitioner
source reports"* and *"reported amounts span roughly a fivefold range"*. Every
line was true when written. All of them were medical claims living in a React
component, which `CLAUDE.md` forbids, and all of them would have gone stale
silently the first time a protocol was edited.

They are gone. `compareProtocols()` counts the same thing off the records.

**Still authored, and defensible:**

| Text | Why it is not a medical claim |
|---|---|
| Section headings and ledes | Navigational: what the section contains and how to read it |
| "Three different questions, kept apart" | A statement about the page's own structure |
| The stack register's `title` and `summary` | What the page is, not what the pairing does |
| The interest-signal vocabulary | Maps a protocol's stated objective to a chip; matches text the record already carries |

**Nothing** on either page states an amount, a frequency, a duration, a
mechanism or an outcome that is not read out of a record.

---

## 4. THE COMPARISON, AND THE RULE IT ENFORCES

`compareProtocols()` reports agreement, difference and silence — **within a
kind of record, never across kinds.**

That rule was added after the first derived version produced this:

> 9 reporting sources report 5 different route values.

Nine, because it had pooled three human studies with five practitioner
handbooks and one interview. A trial's dosing schedule and a handbook's
suggestion are not two opinions about the same question, and putting them in
one row manufactures a disagreement nobody asserted. Grouped, the same records
say something real:

> **Records of people** — 3 human records report 3 different route values.
> **Sources reporting their own practice** — 6 reporting sources report 2 different route values.

The third column is the one that makes it honest. Silence is reported as
silence: *"None of the 6 reporting sources states a measured outcome."* And one
line is always present, because it is always true: **no source reports how its
regimen was arrived at.**

For BPC-157 the agreement column is empty, and says so in words rather than
rendering blank: *"Nothing. No field of a reported regimen is stated the same
way by every record of either kind."* That is the most useful sentence the
comparison produces.

Carrying this required one schema-level addition: `isHumanEvidence` on the
protocol shapes, populated from `public_v_evidence_types.is_human_evidence`.
It is a fact about the kind of record, not a regimen detail, so it is present
in both readings.

---

## 5. THE COMBINATION PAGE, AND WHAT IT REFUSES TO DO

A combination page is the most dangerous surface in this index. Two compounds
side by side, each with its own evidence, reads as a recommendation to use
both. The page is built around keeping three questions apart, and says so
in its own second screen:

1. What is known about each compound alone.
2. Who reports using them together, and for what.
3. What has been studied about the combination itself.

The third is answered from the records and is small. It is stated in the hero,
before anything else:

> 6 held records report these compounds being used together, drawn from 5
> identifiable sources. 1 of them is a record of what happened to people — and
> the second compound is named there in a way that does not identify which of
> these it was.
>
> No study held here compares the combination against either compound alone.

**There is no combined regimen anywhere on the page.** Each source's report
stands under that source's name. The single-compound regimens appear in their
own section, explicitly labelled as single-compound, in practitioner reading
only.

### 5.1 The finding the page produced

The six reports were not assembled by hand. They are every published protocol
on any member whose `combinations_text` names another member.

| Record | Kind | Names |
|---|---|---|
| `BPC-PR-STUDY-KNEE` (Lee E) | Human observational | **ambiguous** |
| `TB4-PR-SEEDS-SQ` (Seeds) | Practitioner reference | BPC-157 |
| `TB500-PR-CAMPBELL-BOOK` (Campbell) | Practitioner reference | BPC-157 |
| `TB500-PR-CAMPBELL-SHEET` (Campbell) | Practitioner reference | BPC-157 |
| `TB500-PR-HACKSMITH-GUIDE` (Hack Smith) | Practitioner reference | BPC-157 |
| `TB500-PR-HACKSMITH-PERSONA` (Hack Smith) | Practitioner reference | BPC-157 |

`TB4-PR-STUDY-ULCER`'s combinations note is about compression therapy, so it
is correctly not a report of this combination.

### 5.2 The naming ambiguity, which is the point of the page

The register holds **"TB-500" as an alias of thymosin beta-4, and "Thymosin
beta-4" as an alias of TB-500** — because sources use the two names
interchangeably for a 43-amino-acid peptide and a seven-amino-acid fragment of
it.

So when the knee study says *"Some patients received BPC-157 combined with
thymosin beta-4,"* that name denotes both members of this stack. A matcher that
picked one would have put an attribution on the public site that the record
does not support — and it would have been the **only human record on the
page**, so the error would have landed on the highest-consequence line.

`attributeNames()` refuses. A name owned by exactly one compound attributes; a
name owned by several does not, and is carried to the reader:

> This record names **Thymosin beta-4**, which the register holds as a name for
> TB-500 (Ac-LKKTETQ) and Thymosin beta-4 alike. Which of them was given cannot
> be determined from the record, and this index does not choose one.

One refinement: an ambiguous name that the *same* note resolves elsewhere — by
also giving `Ac-LKKTETQ`, which only TB-500 carries — is not reported, because
the reader already knows. Both behaviours are under test.

---

## 6. NO TIDES DOSE

Stated on the compound page, in the protocols section lede:

> Each card is one source's regimen, under that source's name. There is no
> Tides dose and there will not be one: these are not averaged, reconciled or
> ranked.

Nothing computes across sources. The comparison counts how many distinct values
exist; it never prints a range, a midpoint, a mean or a "typical". A field the
record does not carry is not rendered at all, rather than shown as "not
specified".

One correctness fix on the way: reported amounts rendered as `250` with the
unit in its own column. They now render `250 mcg`. A figure without its unit is
the one kind of dose error that reads as authoritative.

---

## 7. CITATIONS

Every citation is kept. None is in running text.

`SourceDrawer` is a closed `<details>` marked *"Sources for this section (13)"*
or *"Source"*, which opens to the full citation — title, authors, year, source
type, and the exact locator, printed page and file page as before. The
references section at the foot of the record is unchanged.

The count is always visible, because "this rests on thirteen sources" and "this
rests on one" are different statements and a reader should not have to open
anything to tell them apart.

---

## 8. SIMPLE / PRACTITIONER BOUNDARY

Verified on both prototypes, in both readings.

| | Simple | Practitioner |
|---|---|---|
| Protocol cards | None. `public_v_protocol_simple` returns nothing: every protocol has `patient_visibility = false` | 9 cards on the compound page |
| Source comparison | **Not rendered.** Simple reading holds no `PractitionerProtocol`, so it cannot be computed | Rendered, grouped |
| Combination notes (`combinationsText`) | `null` — nulled in the reader, not hidden in a component | The source's own words |
| Combination attribution and citations | **Present.** Who reports a thing is what simple reading is for | Present |
| Hero "reported protocols" stat | Suppressed | Shown |

Two leaks were found and closed during this work:

1. **The hand-written comparison rendered in simple mode**, and two of its lines
   were about frequency — *"all of them describe daily or twice-daily use"*.
   Frequency is a dosing-centric detail. The derived replacement cannot leak it:
   the dimension is dropped, not blanked, and there is a test asserting that the
   word "frequency" does not appear at all when dosing is excluded.
2. **The combination cards were unattributed in simple reading**, headed by the
   compound's name instead of the source's, because citations were being read
   off a protocol list that is empty in that mode. They are now read directly,
   in both modes.

A third, smaller one: the hero and the stack member cards showed
`0 reported protocols` in simple mode, which reads as *none has ever been
recorded* rather than *none is shown in this view*. The figure is now
suppressed there.

`npm run qa:doses` was extended to scan the new combination surface, not only
compound pages. A boundary that holds on one surface can fail on another
reading the same records through a different query.

---

## 9. VISUAL DIRECTION

Deep blue-teal-indigo-cyan, on the existing token set. Serif display over the
existing sans body. Generous vertical rhythm; sections are movements separated
by space rather than boxes in a stack.

**The hero graphic was redrawn.** The first version used smooth sinusoidal
paths, which on a site called The Tides Index read as waves — the one
association this brand must not have. It is now a peptide backbone: a
polyline of tetrahedral zig-zag bonds with a residue at every second vertex and
faint side-chain stubs, held to the right of the panel so no line crosses the
text. Pure inline SVG; no image request, no stock photography, and it scales to
any width without a second asset.

No ocean, no wave, no tide imagery in anything added here. No third-party
organisation's branding or identity. No commerce, no vendor, no product, no
price.

**Outside this work, and flagged rather than changed:** the site header carries
a decorative wavy rule under the wordmark. It is pre-existing global chrome and
Phase 1 was scoped not to touch it. It should go.

---

## 10. REGULATORY STATUS

Still on the record, still date-stamped, still in full. Moved from the opening
to the thirteenth section and rendered in the same weight as the other context
sections rather than as a warning band. It has stopped being the personality of
the page.

---

## 11. QA

| Check | Result |
|---|---|
| `npm run lint` | **Clean** |
| `npm run typecheck` | **Clean** (strict, `exactOptionalPropertyTypes`) |
| `npx vitest run tests/unit` | **455 passed, 33 files** — including 17 new |
| `npm run qa:doses` | **No dose-shaped strings in any patient payload**, 28 compounds and 1 combination page |
| `npm run qa:production` | **No blockers** |
| `npm run qa:publication-integrity` | 938 rows, 924 published; **a deterministic re-seed preserves every published record** |
| `npm run build` | **Clean**; `/protocols/stacks/[slug]` in the route table |
| `npx vitest run tests/integration` | **435 passed, 37 files**, 32 minutes |

### New tests

`tests/unit/reported-regimen-comparison.test.ts` — that a human record is never
compared with a practitioner source; that excluding dosing removes the
dimension rather than blanking it; that no dose figure survives that exclusion;
that silence is reported as silence and not as agreement.

`tests/unit/combination-attribution.test.ts` — that a name owned by one
compound attributes, that a name two compounds share does not, that an
ambiguity the same text resolves elsewhere is not reported, and that a note
about standard care attributes to nothing.

---

## 12. RESPONSIVE

| Width | Result |
|---|---|
| 1440 | Both prototypes as designed; comparison in three columns |
| 1280 | Same |
| 768 | Comparison holds three columns and stays legible; member cards stack |
| 390 | Single column throughout; **no horizontal page scroll** (`scrollWidth === clientWidth === 390`) |
| 375 | Same |

At 768 the document is 2px wider than the client box. It comes from the
horizontally scrolling primary navigation, which is pre-existing, not from
anything added here.

---

## 13. REACHABILITY

The combination page is linked from three places and is not an orphan:

- the BPC-157 record, in a *Reported alongside* section derived from the stack
  register rather than hard-coded;
- `/protocols`, in a new *Compounds sources report using together* section;
- `sitemap.xml`, via `listPublishedStacks()`, which lists only combinations
  whose compounds are actually published — the sitemap's own rule is that it
  never names a URL that would 404.

`TIDES_ALLOW_INDEXING` remains unset; `robots.txt` still disallows everything.

---

## 14. WHAT WAS NOT DONE

- The other twenty-seven compound pages. Unchanged, by instruction.
- The homepage, `/learn`, `/quality`, `/research`, `/sources`. Untouched.
- `/protocols` got one new section and no redesign.
- No second combination page. The register holds one definition; adding another
  is three lines and a data question, not a code question.
- No evidence-engine change. No claim, protocol, source, locator or migration
  was written.
- The claim-prose stretches on the compound page — *what is reported about it*
  and the literature-screen commentary — are long unbroken paragraphs rendered
  from records that are themselves long. That is the weakest part of the
  prototype visually. It needs editorial work on the records, not layout work
  on the page, which is why it was left alone.

---

## 15. OUTSTANDING

The integration suite passed in full: **435 tests across 37 files, 32 minutes.**

Two changes in this work touch shared code that suite covers, and both are
clean under it:

1. `isHumanEvidence` added to `SimpleProtocol` and populated in both branches of
   `protocol-reader.ts` and in `protocol-library.ts`.
2. Citations on combination reports read through `public_v_protocol_sources`
   directly rather than through a compound page.

Unrelated and unchanged since the last report: production still has no working
`DATABASE_URL`, so every database-backed route on Railway returns 500. Neither
prototype can be seen on the live site until that is resolved. See
`RAILWAY_PRODUCTION_RECOVERY_REPORT.md` §14.

---

## 16. WHAT PHASE 2 SHOULD DECIDE

1. **Whether this order is right**, before it is applied to twenty-seven more
   compounds. The switch is one line; the decision is not.
2. **The claim-prose problem.** Records written as three-hundred-word paragraphs
   will not read well in any layout. This is an editorial question.
3. **Which combinations deserve a page.** The register is a list of slugs. The
   BPC-157 pairing earned one because five sources report it; the criterion
   should be written down before a second is added.
4. **The header's wavy rule**, and any other pre-existing brand chrome that
   reads as the sea.
5. **Whether `attributeNames`' ambiguity treatment belongs on compound pages
   too.** The TB-500 / thymosin beta-4 conflation is not confined to the
   combination page; it is a fact about the register, and the compound records
   currently state it in prose rather than structurally.
