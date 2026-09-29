# EXPERIENCE REVAMP — PHASE 1B, PROTOTYPE POLISH

Date: 28 September 2026.
Baseline: `618b43e` (Phase 1).
Scope: polish the two prototypes. No new surfaces, no rollout.

---

## 1. THE WAVE MOTIF IS GONE

It was in two places, not one, and the second was only found by scanning the
served stylesheet rather than the header.

| | Was | Now |
|---|---|---|
| `.tide-rule` | A repeating inline SVG of **two sine paths**, tiled across the full width at 10px tall | A 2px hairline: teal → indigo → cyan, fading out at both ends |
| `.editorial-break::before` | **The same wave**, a second copy, drawn above every editorial section break | The same hairline, at lower opacity |
| Site header | Carried a `<hr class="tide-rule">` directly beneath the wordmark | **Carries nothing.** Its own bottom border is the separation |

The stylesheet's own design note had promised *"No waves, no beaches"* eight
lines above the first wave. The note now describes what is actually drawn.

`grep -c "svg+xml" src/styles/globals.css` returns **0**: no inline-SVG motif
remains anywhere in the stylesheet.

The hairline still appears on the homepage, the legacy record pages and the
certificate page — nineteen call sites, untouched. Only its shape changed, so
this is not a redesign of those pages.

---

## 2. THE CLAIM PROSE IS RANKED, NOT REWRITTEN

The compound record's claims run to 430–620 characters. In one block of running
text nothing in them can be found.

**Nothing was summarised.** Summarising would put a sentence on a public record
that no reviewer wrote. What changed is which part of the existing text the eye
lands on first:

1. **The evidence lane moves above the statement.** A reader deciding whether
   to read a paragraph is owed *Preclinical · 3 citations* before the paragraph,
   not after it.
2. **The lead sentence is set at reading size**, the remainder follows beneath
   it in paragraphs of two sentences. In every claim on this record the first
   sentence carries the finding:

   > **A PubMed screen conducted on 13 September 2026 returned 230 records and
   > identified three primary human studies of BPC-157, involving 31 people in
   > total.**
   >
   > All three are small, uncontrolled, unblinded, single-site and published in
   > the same journal. The remaining evidence identified by the screen is
   > preclinical: 161 animal studies, one human-tissue preparation and three in
   > vitro studies, alongside 48 reviews and 7 commentary pieces.

3. **Nothing is hidden.** There is no "read more". The full text is on the page
   in both states.

### The losslessness guarantee

`splitSentences()` and `rankProse()` live in `src/domain/presentation/prose.ts`
and are pure. The test that matters asserts that **no word is dropped, added or
reordered** — for each of three real claim texts:

```
splitSentences(text).join('') === text
[lead, ...rest].join(' ').split(/\s+/) === text.split(/\s+/)
```

Every remaining risk is a split in the wrong place, which is cosmetic. There is
no path by which this can change meaning.

Boundary detection handles what these records actually contain: `et al.`,
`vs.`, `approx.`, initials (`J. F. Tremblay`), decimals (`0.5 hours`) and
ranges (`14–19%`). Fourteen tests, including the four real claim texts.

A claim below 260 characters, or one that is a single sentence however long, is
left whole — breaking up two short sentences makes them harder to read, not
easier.

---

## 3. CITATION AND QUOTATION WEIGHT

Provenance is unchanged. Every citation, locator, printed page and file page is
still on the page and still one click away.

| | Was | Now |
|---|---|---|
| Section source marker | Teal, underlined, body size | **Slate, uppercase micro-type**, with a chevron that rotates open |
| Per-claim evidence chips | Bordered boxes below the text | Unboxed micro-type above the text |
| Citation title in the drawer | `font-medium` | Normal weight |
| Uncertainty note | Neutral left rule | Neutral left rule, slightly more inset |

The reasoning on the marker: teal is the site's accent, and spending it on a
citation marker ranked the citations above the findings they support. Slate
puts them back under.

**Amber is now reserved for one thing.** It briefly went on the uncertainty
note; it has been taken back off. It means "this cannot be determined from the
record", and on these two prototypes it appears in exactly one place — the
TB-500 / thymosin beta-4 naming ambiguity on the combination page. Two meanings
for one colour would have cost that note its force.

---

## 4. PROTOCOLS STAY PROMINENT

Unchanged and, relatively, louder: the surrounding claim prose got lighter
while the protocol cards kept their borders, their two-column grid and their
source-name headings. *What identifiable sources report doing* remains the
heaviest block on the record.

The lede is unchanged and still says there is no Tides dose.

---

## 5. THE COMBINATION EXPERIENCE IS PRESERVED

`/protocols/stacks/bpc-157-tb-500` is untouched except for one alignment fix:
the reading-depth switch right-aligns its own caption, which flew to the far
edge of the page when given the full width. It is now shrink-wrapped.

Everything else stands: the three-questions frame, the six combination reports,
the amber naming-ambiguity note, and the absence of any combined regimen.

---

## 6. SIMPLE / PRACTITIONER BOUNDARIES

Re-verified after every change in this pass, by markup rather than by eye.

| Check | Compound page | Combination page |
|---|---|---|
| Source comparison in simple | absent | n/a |
| Protocol cards in simple | absent | absent |
| Dose-shaped figures in simple | **none** | **none** |
| Combination prose in simple | n/a | absent |
| Source attribution in simple | present | **present** (4 sources) |
| Ambiguity note in simple | n/a | **present** |
| Citation markers | present, both modes | present, both modes |

`npm run qa:doses` is clean across 28 compounds and the combination page.

---

## 7. QA

| Check | Result |
|---|---|
| `npm run lint` | **Clean** |
| `npm run typecheck` | **Clean** |
| `npx vitest run tests/unit` | **469 passed, 34 files** — 14 new |
| `npm run qa:doses` | **No dose-shaped strings in any patient payload** |
| `npm run qa:production` | **No blockers** |
| `npm run build` | **Clean**; `/protocols/stacks/[slug]` present |
| All routes, both reading modes | **200** — `/`, `/protocols`, both prototypes |
| `npx vitest run tests/integration` | See §9 |

---

## 8. WHAT WAS NOT TOUCHED

- The other twenty-seven compound pages. Still the record layout.
- The homepage, `/learn`, `/quality`, `/research`, `/sources`.
- Any claim, protocol, source, locator, migration or seed record.
- `TIDES_ALLOW_INDEXING` — **still unset**; `robots.txt` still disallows
  everything.
- No commerce, clinic, order, payment, inventory or product-sale concept exists
  in this repository, and none was introduced.

---

## 9. STATUS AND WHAT "DEPLOY" CAN MEAN TODAY

The integration suite was running when this report was written; the commit
should not be treated as released until it passes, and its result belongs here.

**A live deployment is still blocked, and not by this work.** Production has no
working `DATABASE_URL`, so every database-backed route on Railway returns 500 —
unchanged since `RAILWAY_PRODUCTION_RECOVERY_REPORT.md` §14. Until the owner
supplies the Railway Postgres public proxy URL or the runtime log, neither
prototype can be reviewed anywhere but locally.

So "deployed for owner review" today means: **committed and pushed to
`phase-a-foundation`**, and running locally at

```
http://127.0.0.1:3000/peptides/bpc-157
http://127.0.0.1:3000/protocols/stacks/bpc-157-tb-500
```

Work stops here pending owner review, as instructed.
