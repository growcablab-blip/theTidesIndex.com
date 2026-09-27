# V1 SECTION 5B — TARGETED TREMBLAY TRANSCRIPT ACQUISITION AND INGESTION

Date: 27 September 2026. Baseline: `cf1d474` (Section 5).

**All three transcripts were acquired. The Tremblay collection now has held sources, and the first
Tremblay-derived claims and protocols are public.**

---

## 1–3. ACQUISITION RESULTS

All three retrieved from their canonical URLs, hashed, and held privately under
`data/private/source-snapshots/tremblay`, which git ignores. Each is the publisher's own full
transcript of the episode.

| | SRC-204 | SRC-206 | SRC-216 |
|---|---|---|---|
| Show | Ben Greenfield Fitness/Life | The Energy Blueprint | The Energy Blueprint |
| Host | Ben Greenfield | Ari Whitten | Ari Whitten |
| Date | 2019-04-13 | 2019-06-14 | 2022-07-09 |
| HTTP | **200** | **200** | **200** |
| Snapshot | 197,767 bytes | 257,760 bytes | 445,373 bytes |
| SHA-256 | `57d9d7a462fcf8c4…` | `26f7db4b4edfdfbc…` | `21c754a480b3ee2e…` |
| Extracted text | 65,455 chars | 60,396 chars | 90,703 chars |
| **Speaker turns** | **180** | **141** | **209** |
| Timestamps | **None** | **None** | **None** |
| Page title matches the registry | Yes — begins "[Transcript] -" | Yes | Yes |

**Section 5's belief that full public transcripts existed was correct for all three.** It was checked
against the pages themselves, not against the derived compilation: each was fetched, parsed, and read
for speaker-labelled turns before anything was recorded.

**One thing Section 5 got wrong, and it matters for locators.** The registry expected timestamped
citation. None of the three transcripts carries timestamps — SRC-216 has a handful of bracketed
`[unintelligible 00:14:47]` markers and nothing else. The locator convention had to be built around
what the artifacts actually are.

---

## 4. SOURCE ARTIFACTS HELD

| Field | Recorded |
|---|---|
| `access_status` | `public_not_yet_retrieved` → **`held`** |
| `qc_status` | `pending` → **`usable`** |
| `local_file_sha256` | The snapshot's SHA-256, on each |
| `local_file_bytes` | The snapshot's size, on each |
| `canonical_url` | The publisher's page |
| `title_page_verified` / `bibliographic_verified` | **true** — the page title was read and matched |
| `verified_at` / `verified_by` | 2026-09-27, Section 5B targeted acquisition |
| `canonical_filename` / `known_local_filename` | **null**, following SRC-153's precedent: those fields name a file under `sources/`, and these are snapshots |

**The recording remains the authority.** Each record states that the transcript is a representation of
the episode, not a second independent source, so nothing is double-counted. The commercial conflict
and the Health Canada history stay on every record in the collection, unchanged from Section 5.

**Nothing copyrighted entered the repository.** The snapshots and the extracted text sit under an
ignored path. The public source page gains citation metadata only.

---

## 5. TRANSCRIPT QUALITY

| Aspect | Finding |
|---|---|
| Completeness | Complete in all three, from the episode introduction to its close |
| Speaker attribution | Explicit and consistent — `Ben:` / `Jean:`, `Ari Whitten:` / `Jean-François Tremblay:` |
| Timestamps | **None.** This is the limiting fact for locators |
| Transcription accuracy | The publishers' own, and imperfect: occasional `[unintelligible]` markers, and slips such as "I don't know have a doctorate" for "I don't have a doctorate" |
| Garbled passages | Present, and not relied on. Where a passage is unclear it was left out rather than repaired |

---

## 6. LOCATOR METHOD

**Speaker turn plus a distinctive phrase from it**, recorded in `locatorText` and `section`:

```
locatorText  "transcript, turn 78 (Tremblay)"
section      "if you were to use half a milligram injected, then if you choose to do orally"
```

A reader opens the publisher's page and searches for the phrase. That is arguably *more* checkable
than a timestamp: it needs no scrubbing through audio and it survives the page being re-paginated.

**It is verified, not asserted.** `npm run evidence:transcript-locators`
([`scripts/sources/verify-transcript-locators.ts`](../scripts/sources/verify-transcript-locators.ts))
parses the turn number and the anchor from every locator on the three sources and checks, against the
held snapshot, that the turn exists, that the anchor is in *that* turn, and that it is **not** in any
other turn. An anchor that matches elsewhere too is reported AMBIGUOUS, because a reader searching for
it would land in the wrong place first. Comparison is on letters and digits only, so a straight
apostrophe still matches the curly one the publishers use.

Two anchors were rejected by that rule during the build and rewritten — one was the single word "it".

---

## 7. COMPOUNDS ENRICHED

**Seven**, all already in the 28. No compound was created.

| Compound | Claims added | Protocols | Gaps | What it gained |
|---|---|---|---|---|
| **BPC-157** | 5 | 1 | 2 | The oral conversion rule; dose-responsiveness and the cancer argument; the literature-concentration claim; the local-injection position across both 2019 and 2022; the injection-accuracy figure |
| **Ipamorelin** | 4 | 1 | 1 | IGF-1 titration and the fasting window; the generational selectivity claim; the combination rationale; the overdose exception |
| **Epitalon** | 3 | — | 1 | The 67 per cent mortality claim; the same speaker reporting a study going badly; his reasons for discounting telomere evidence |
| **Thymosin beta-4** | 2 | — | 1 | The key-chain account of separable fractions; the cancer question answered from clinical observation |
| **TB-500** | 1 | — | 1 | The brand-name history, and that the name has referred to two different molecules |
| **CJC-1295** | 1 | — | 1 | The stated reason for avoiding the DAC form |
| **Modified GRF (1-29)** | 1 | — | — | The division of labour with a secretagogue, and why it allows less of each |
| **Totals** | **17** | **2** | **7** | 21 source locations |

---

## 8. CLAIMS ADDED — 17

Every one begins "Tremblay states…" or "Tremblay describes…", is typed `expert_commentary` →
`reference_opinion`, and carries a turn and an anchor phrase. Six are recorded at **critical**
importance:

| Claim | Why critical |
|---|---|
| BPC-157 dose-responsiveness and the cancer argument | A dose-response assertion that invites taking more, answered on cancer with reasoning rather than data |
| Epitalon, 67 per cent lower mortality and twenty to thirty added years | The strongest longevity claim in the index, about a compound anyone can buy |
| Epitalon, the study that was going badly | Kept beside the claim above deliberately |
| TB-500 is a brand name that has covered two molecules | If true, the name does not identify the molecule and the date matters |
| Thymosin beta-4 and cancer, answered from practice | A cancer reassurance resting on unsystematic observation, which he labels empirical himself |
| CJC-1295 with DAC and blood cancer in mice | A second-hand recollection of unpublished work, and the stated reason an expert refuses a widely sold form |
| Ipamorelin, the overdose exception | See §12 |

---

## 9. PROTOCOLS ADDED — 2

Both source-reported, separately attributed, and neither averaged with anything.

**`BPC-PR-TREMBLAY-ORAL-CONVERSION`** — the oral equivalent of an injected amount, with his reason
(more than half lost to digestion) and his caveat (active, but not cost effective). The index holds
**no other conversion rule from any source**; LaValle gives regimens per route and never relates one
route to another.

**`IPA-PR-TREMBLAY-TITRATED`** — and this one is unusual: **it carries no amount at all.** He gives
none. What it carries is a method — titrate against measured IGF-1, aim to stay inside the normal
range rather than maximise it, leave an hour before food and half an hour after, pair with a
releasing-hormone analogue so that less of each is needed. A protocol record with monitoring,
timing, titration and combination guidance and an empty dose field is an honest shape for what the
source actually says, and it is the first of its kind in the library.

---

## 10. GAPS ADDED — 7

Each is a question the new source opened rather than answered.

| Compound | Gap |
|---|---|
| BPC-157 | The actual oral bioavailability, and whether any conversion ratio holds |
| BPC-157 | Whether the literature really is concentrated in one research group |
| Epitalon | Whether it lengthens telomeres, shortens them, or does neither — `conflicting_sources` |
| TB-500 | Which molecule a given use of the name refers to, and from when |
| Thymosin beta-4 | Whether it affects cancer risk or progression in people |
| Ipamorelin | What IGF-1 range dosing should be titrated to — no figure is given by anyone |
| CJC-1295 | Whether the albumin-binding form carries any oncological risk |

---

## 11–12. SOURCE DIFFERENCES, AND TREMBLAY VERSUS LAVALLE

Classified using the brief's scheme. **Neither practitioner is adjudicated anywhere**, and no regimen
was averaged.

| Topic | LaValle | Tremblay | Relationship |
|---|---|---|---|
| **TB-500 and thymosin beta-4** | Two records, split on analytical grounds | Independently reaches the same split, and adds that one vendor kept the brand name while changing the molecule | **AGREEMENT**, with a sharper edge |
| **Route conversion** | Regimens per route, no conversion rule | An explicit oral multiplier with a mechanism | **DIFFERENCE** — the index held nothing comparable |
| **GH-secretagogue dosing** | Fixed regimens, no monitoring target, no timing rationale | No amounts at all; titrate against IGF-1, stay in range, dose away from food | **DIFFERENCE in kind** — a method where the handbook gives a number |
| **Epitalon telomeres** | Reports a specific telomere-elongation result | Discounts the telomere evidence, and reports a preliminary marker showing shortening | **CONTRADICTION**, both preserved, neither resolved |
| **Epitalon benefit** | Reported multi-year mortality trials | 67 per cent lower mortality and twenty to thirty added years — *and* a study going badly | **VARIATION within one source**, which is itself the finding |
| **Local injection** | Not addressed | Near the injury is pointless, within it works, imaging needed | **UNRELATED CONTEXT** — the handbook is silent |
| **General overdose safety** | Compound-by-compound cautions | Most peptides cannot be overdosed — **except** growth hormone secretagogues | See below |
| **CJC-1295 with DAC** | Carried as a distinct record | Avoid it, on a second-hand animal recollection | **DIFFERENCE** in practice, on evidence that is thin and says so |

### 12.1 Two Section-5 conclusions the transcripts did not support

Part 9 said not to inherit the derived compilation's conclusions without verifying the passages
underneath them. Two did not survive verification.

**The local-injection "position change" is not a position change.** The compilation described 2019 as
calling local injection a myth and 2022 as a reversal to ultrasound-guided intralesional
administration. Reading both transcripts, the position is the *same* in each, three years apart:
injecting *near* an injury is pointless because the bloodstream takes the peptide up first; injecting
*within* it does work; imaging is needed to place it. SRC-204 turn 31 says so in 2019 in as many
words. What 2022 adds is a technique and a case, not a different view. The claim is recorded as
consistent, and the record says why.

**The general safety claim is qualified at source.** The compilation recorded "overdosing most
peptides means it didn't work" as a claim contradicted by a regulator. The transcript shows him making
the exception *in the same breath*: growth hormone secretagogues are different, and too much produces
carpal tunnel syndrome or IGF-1 rising far too high — through the hormone released rather than the
peptide. That exception is now a claim of its own on the ipamorelin record. The general claim remains
unsupported by anything held and the record still says so; it is simply not the unqualified statement
the summary reported.

**This is the clearest argument in either section for holding artifacts rather than summaries.** Two
of the compilation's most quotable findings were wrong in the direction that made the source look
worse, and only the transcripts could show it.

### 12.2 Material deliberately not ingested from the three held transcripts

| Material | Why |
|---|---|
| A second-hand allegation about a named research group's conduct (SRC-204 turn 53) | Hearsay about identifiable third parties. Recorded nowhere; the location note says it was seen and left |
| A reported case of long-standing pain resolving after hydrodissection | Carried as context inside the administration claim, not as a standalone efficacy claim: one unpublished case described second hand |
| A cardiology paper he offers to send | No reference is given and none is held. Left as a research lead, not a citation |
| Compound content this pass did not reach — Semax and intranasal targeting, PT-141, MOTS-c, GHK, tesamorelin, AOD-9604 | Present in the held transcripts and **not exhausted**. This was one targeted pass; the remaining material is available whenever the owner wants a second one, and is not lost |

---

## 13. SOURCE CONCENTRATION — BEFORE AND AFTER

| Measure | Before (Section 5) | After | Change |
|---|---|---|---|
| Public compounds | 28 | 28 | — |
| **Single-source compounds** | **15** | **14** | **−1** |
| Compounds with 3+ distinct sources | 13 | **14** | +1 |
| Compounds carrying Tremblay | 0 | **7** | +7 |
| Compounds with a Tremblay protocol | 0 | **2** | +2 |
| Compounds with meaningful Tremblay/LaValle variation | 0 | **5** | +5 |

**The single-source count moved by one, not by four, and Section 5's projection was optimistic.**
Only Epitalon left the group, 1 source to 3. The reason is plain in the data: the three transcripts'
deepest content is on compounds that were *already* well sourced — BPC-157 now has 13 distinct
sources, ipamorelin 11, thymosin beta-4 12 — while the single-source compounds this speaker does
cover (PT-141, AOD-9604, semaglutide, DSIP, thymosin alpha-1) are covered in the *other twenty*
appearances, not in these three.

**Still single-source, all LaValle-only (14):** AOD-9604, ARA-290, DSIP, Kisspeptin, KPV, Larazotide,
MGF, PNC-27, PT-141, Semaglutide, Sermorelin, Thymosin alpha-1, Thymulin, VIP.

No overlap was manufactured to improve the metric. Where the transcripts say nothing about a
compound, nothing was written.

---

## 14. SECTION-5 STATEMENTS STILL HELD BACK

Everything attributed to the other twenty appearances. Those artifacts are still not held, their
locators still cannot be verified, and none of it is published. Specifically:

- the setmelanotide titration, the GH-secretagogue timing ranking and the intranasal multiplier, all
  from host show notes on episodes not acquired;
- the bioregulator dose correction as explained in 2021 (SRC-214, not acquired). **Note:** SRC-216 is
  held and does discuss Epitalon, but the passages read do not restate the numeric correction, so it
  is not recorded;
- the cycling doctrine, which the compilation traces mainly to SRC-218, whose audio has no transcript
  in any form;
- every quality and manufacturing statement: stability, reconstitution, label accuracy, supply chain,
  mixing compatibility, analytical capability. **No quality topic was enriched in this pass**, and
  none should be until the episodes carrying that material are held.

## 15. NEW-COMPOUND MENTIONS HELD BACK

The three transcripts mention compounds outside the 28 — FOXO4-DRI and humanin in SRC-206, a
non-peptide research compound in both 2019 episodes, and thymalin across the collection. **No compound
record was created.** The Section 5 hold list stands unchanged at nine candidates, with Thymalin and
HGH Frag 176-191 still requiring an identity decision before any build.

---

## 16. LOCATOR VERIFICATION

```
npm run evidence:transcript-locators

  Tremblay locations  21
  resolved            21
  ambiguous            0
  failed               0
```

Every anchor phrase is in the turn its locator names, and in no other turn of that transcript.

The standing PDF verifier is unchanged at **224 resolved, 0 to check, 0 failed**. Its skipped count
rises from 380 to 401 — the 21 transcript locators, which have no page and are checked by the
dedicated verifier instead. That is the correct division, and is stated here so the higher skip count
is not read as a regression.

---

## 17. QA RESULTS

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npx vitest run tests/unit` | **433 passing** across 30 files |
| Targeted integration (render, re-seed, source reconciliation, compound records, evidence priority) | **54 passing** across 5 files |
| `npm run qa:publication-integrity` | **A deterministic re-seed preserves every published record** |
| `npm run qa:production` | **No blockers. This database may serve the public.** |
| `npm run qa:doses` | **No dose-shaped strings in any patient payload** — run after each record, not only at the end |
| `npm run evidence:locators` | **224 resolved, 0 to check, 0 failed** (401 skipped) |
| `npm run evidence:transcript-locators` | **21 locations, 21 resolved, 0 ambiguous, 0 failed** |
| `npm run build` | succeeds; 20 static pages generated |
| `npx vitest run tests/integration` | **435 passing** across 37 files, 0 failures, 28 minutes — one clean run on the final state |

### Final sequence, after the suite

```
Seed          new records arrive unpublished, existing publication states unchanged
Integrity     a deterministic re-seed preserves every published record
Counts        28 public compounds, 924 published records, 113 practitioner protocols
Withdrawals   0 unintended
Locators      21 Tremblay locations, all resolved against the held transcripts
```

### Two test failures this work caused, and what they caught

Both were real, and both were fixed at the cause rather than in the test.

**`editorial-syntheses.test.tsx` broke** because the transcript additions were first written into
`data/seed/evidence/`, which is globbed as "every evidence packet". A file in that directory that is
not a packet breaks the loader. The additions moved to `data/seed/tremblay/`, and the script says why
in a comment.

**`source-integrity.test.ts` broke** on two invariants written for PDFs: every source with a
`known_local_filename` must have a page count above zero and a file under `sources/`. A web transcript
has neither. SRC-153 met the same situation before and solved it by leaving the filename fields null
on a snapshot-held source; these three now follow that precedent, with the SHA-256 and the snapshot
path recorded in the access notes. Neither invariant was weakened.

---

## 18. FINAL PUBLIC COUNTS

| Measure | Section 5 | Section 5B |
|---|---|---|
| Public compounds | 28 | **28** |
| Published records | 905 | **924** |
| Published claims | 476 | **493** |
| Practitioner protocols public | 111 | **113** |
| Withdrawn | 0 | **0** |
| Compounds claiming a human review | 0 | **0** |
| Registered sources | 220 | 220 |
| **Sources held** | 94 | **97** |

Publication refusals remain exactly the 8 unwritten quality topics.

---

## 19. LAUNCH IMPLICATIONS

**The collection is no longer theoretical.** Three sources are held, 21 locators resolve against them,
and seven compound records carry a second independent practitioner voice. The architecture built in
Section 5 — collection record, individual artifacts, conflict context on every one — took the
transcripts without modification.

**But the source-concentration problem is not solved by this route, and the numbers now say so
precisely.** Fourteen compounds remain single-source. The twenty unacquired appearances would, on the
Section 5 mapping, reach at most five of them. **Literature screens, not more practitioner sources,
are what those fourteen need** — and nine of them are compounds this speaker never discusses at all.

**Three launch blockers are unchanged:** the eight unwritten quality topics, the fourteen
single-source compounds, and the absence of any literature screen for the sixteen records added in
Section 4. Section 5B removed none of them and added none.

**Recommended next step: literature screens, beginning with Larazotide and AOD-9604.** Both carry
named trials reported second-hand by a handbook and nothing else. A screen would be the first work in
this sequence to move a record from practitioner-reference depth towards held primary evidence, which
is the axis that has not moved in three sections.
