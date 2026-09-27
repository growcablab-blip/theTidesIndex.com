# V1 SECTION 5 — TREMBLAY ARCHIVE REVIEW AND INGESTION

Date: 26 September 2026. Baseline: `e532970` (Section 4, tranche 2).
Archive: the owner-supplied archive folder named in the Section 5 brief, outside this repository.

**Status: archive reviewed in full; source collection registered; no claim or protocol published, and
the reason is structural rather than editorial.**

The archive was supplied from a folder outside this repository. Where a file sits on a disk confers
no authorship, affiliation or identity on The Tides Index, and none appears in this work.

---

## 1. EXECUTIVE SUMMARY

The archive does not contain the Tremblay material. It contains **two derived research documents
about** his public appearances — one of them a rendering of part of the other. The recordings,
transcripts and show notes those documents were built from are not present.

That is not a technicality. Every Tremblay statement in the archive resolves to a timestamp in a
podcast episode this index does not hold — "BPC-157 oral conversion, Energy Blueprint #1, 2019-06-14".
There is no way to open that episode and check it, so under the project's own rule, written into the
source manifest schema — *nothing may rest on a source this index cannot open* — none of it can be
published.

So the section did the work that is actually available and is worth doing:

| Done | Not done, and why |
|---|---|
| Complete recursive inventory, with hashes, and a provenance determination for each file | No Tremblay claims — no locator resolves to a held artifact |
| SRC-016 rewritten from a one-line placeholder into a proper collection record | No Tremblay protocols — same reason, and a regimen is the last thing to publish on an unverifiable citation |
| **23 individual appearances registered** as SRC-201…SRC-223, with dates, hosts, durations, URLs and transcript status | No citation of the extraction record itself — it is unattributable and not public, so a reader could never follow it |
| Commercial conflict and Health Canada regulatory history attached to every record in the collection | No new compounds — nine are on the hold list for the owner |
| Content map across all 28 public compounds | No external retrieval, as instructed |
| Ranked acquisition queue: **three public transcripts** would unblock citation | |

**The distance between this outcome and a citable Tremblay record is three URLs.** Three of the 23
appearances have full public transcripts. Retrieving them converts this section's inventory into real
evidence; nothing else in the collection is anywhere near as cheap.

**One measured correction to a figure reported at the end of Section 4.** The source-concentration
problem was described as "16 of the 28 records rely primarily on SRC-002". Measured precisely against
published claims, it is **15 of 28 single-source, and all 15 of those are LaValle-only**.

---

## 2. ARCHIVE INVENTORY

Full detail in [`docs/TREMBLAY_ARCHIVE_INVENTORY.md`](TREMBLAY_ARCHIVE_INVENTORY.md). Summary:

| Metric | Count |
|---|---|
| Total files in the archive, recursively | **2** |
| Subdirectories | 0 |
| **Usable Tremblay artifacts (class A)** | **0** |
| Related contextual material (class B) | 1 — the consolidated research file |
| Duplicates (class C) | 1 — the PDF, duplicating PART 3 of the markdown |
| Unrelated to Tremblay (class D) | 0 |
| Unreadable or incomplete (class E) | 1 partially — the PDF has no text layer |
| Uncertain identity (class F) | 0 files; the markdown's *authorship* is uncertain |

**`Tremblay_Tides_Index_Complete_Research_File.md`** — 122,884 bytes, SHA-256 `1017753a…`, 1,107
lines, four parts, no author, no publisher, self-described as "READY WITH REVIEW FLAGS". Fully
readable.

**`Tremblay Protocols Pass 2.pdf`** — 8,280,594 bytes, SHA-256 `d328c8fd…`, 15 pages, produced by
Microsoft Print To PDF on 2026-09-26 at 23:04. **Zero extractable characters, no embedded images and
no fonts**: the glyphs are filled vector paths. It was read by rasterising at 140 dpi with PyMuPDF,
which happens to be installed in the system Python — `pdftoppm`, Ghostscript and ImageMagick's PDF
delegate are all absent. Its content matches the markdown's PART 3, verified against the TL;DR,
coverage figures and key findings rather than assumed from the title.

---

## 3. SOURCE REGISTRATION

### 3.1 SRC-016 before and after

**Before:** one record titled "Tremblay / CanLab Source Dossier", `access_status: unavailable`,
integrity notes "Not yet captured. No file held." It named nothing anybody could go and find.

**After:** the record of a **collection**, stating that the collection comprises 23 individually
identified appearances, that none is held, that three have full public transcripts, and that no
peer-reviewed publication, patent, thesis or registered trial on peptides by this speaker has been
identified. It carries the conflict-of-interest and regulatory context once, authoritatively.

### 3.2 The 23 artifacts

Registered as **SRC-201 … SRC-223** by
[`scripts/sources/register-tremblay-collection.ts`](../scripts/sources/register-tremblay-collection.ts),
which is idempotent and re-runnable. Nineteen podcast episodes and four videos, January 2018 to
September 2026. Every record carries:

- `source_type: expert_interview` → evidence class `reference_opinion`. It cannot become human
  evidence by any path.
- `access_status: public_not_yet_retrieved` — publicly published, not obtained here.
- `qc_status: pending`, `bibliographic_verified: false`, `title_page_verified: false`. The metadata
  came from the extraction record, not from the publisher, and the record says so.
- The conflict note and the limitations note, in full, on every one.

The manifest holds **220 sources**, up from 197. **None of the 23 is cited by anything.** Published
record counts are unchanged at 905, because a source is not evidence until something rests on it.

### 3.3 Identified and deliberately not registered

Sixteen further items: five web profiles and commercial sites, four secondary third-party reports,
five regulatory and news documents, and two candidate scholarly papers whose identity is `UNCERTAIN`.

The regulatory documents were the closest call. Health Canada's advisory and the permanent injunction
are genuine, citable public documents — but they concern a **company**, and this index has no place
for a claim about a vendor. They are recorded as context on every source record in the collection
instead, which is where a reader needs them.

---

## 4. EXTRACTION AND TRANSCRIPTION

| Artifact | Method | Quality | Limitation |
|---|---|---|---|
| Markdown research file | Native text | Complete | None technical. The limitation is provenance, not extraction |
| PDF | Rasterised at 140 dpi and read page by page | Legible throughout | No text layer exists, so nothing can be searched, quoted exactly or verified programmatically |
| The 23 appearances | **Not attempted** | — | Not in the archive. Three have public transcripts; one has no transcript, captions or chapter markers in any form |

No OCR was used where native extraction was available, and no transcription was attempted, because
there is nothing here to transcribe.

---

## 5. TREMBLAY COMPOUND COVERAGE — ALL 28

Built from the extraction record's peptide index, claim ledger and protocol index. It describes what
the collection **would** cover if the appearances were obtained; nothing here is published.

| # | Compound | Covered | Depth stated | Note |
|---|---|---|---|---|
| 1 | BPC-157 | **Yes** | HIGH | The deepest subject in the collection |
| 2 | TB-500 | **Yes** | MED-HIGH | Nomenclature is his recurring theme |
| 3 | Thymosin beta-4 | **Yes** | MED-HIGH | Treated together with TB-500 |
| 4 | Epitalon | **Yes** | MED, with a conflict | Position changes across 2019→2022 |
| 5 | CJC-1295 | **Yes** | Caution only | "Avoid the DAC form" |
| 6 | Modified GRF (1-29) | **Yes** | MED | His "CJC-1295 no-DAC" |
| 7 | Ipamorelin | **Yes** | MED | The only GH-secretagogue pairing his company sold |
| 8 | Tesamorelin | **Yes** | LOW | Named, no regimen |
| 9 | DSIP | **Yes** | LOW | Unchanged across passes |
| 10 | MOTS-c | **Yes** | LOW-MED | Cycling interval only |
| 11 | GHK-Cu | **Yes** | LOW | Segment identified, not retrieved |
| 12 | Semax | **Yes** | LOW | Intranasal framing |
| 13 | Selank | **Yes** | LOW | Treated with Semax |
| 14 | PT-141 | **Yes** | LOW-MED | A route conversion figure |
| 15 | LL-37 | **Yes** | LOW | Timestamps only |
| 16 | Thymosin alpha-1 | **Yes** | LOW | Discussed as a hybrid component |
| 17 | AOD-9604 | **Yes** | LOW | Combined with a fragment by his company |
| 18 | Semaglutide | **Yes** | LOW | GLP-1 agonists as a class |
| 19 | Sermorelin | **No** | — | **Explicitly searched, nothing found** |
| 20 | KPV | **No** | — | **Explicitly searched, nothing found** |
| 21 | Kisspeptin | **No** | — | **Explicitly searched, nothing found** |
| 22 | ARA-290 | No | — | Not mentioned |
| 23 | Larazotide | No | — | Not mentioned |
| 24 | MGF | No | — | Not mentioned. IGF-1 and IGF-1 LR3 are, and are different compounds |
| 25 | PNC-27 | No | — | Not mentioned |
| 26 | VIP | No | — | Not mentioned |
| 27 | Retatrutide | No | — | Not named; GLP-1 agonists are discussed as a class |
| 28 | **Thymulin** | **No — and this matters** | — | See below |

**Covered: 18 of 28. Not covered: 10, of which three were explicitly searched for and not found.**

### 5.1 Thymulin is not covered, and the archive proves the point Tranche 2 made

The collection discusses **Thymalin** — repeatedly, with regimens, and with a dose correction across
eras. Thymalin is not Thymulin.

Section 4's tranche 2 recorded Thymalin as `related_but_distinct` from Thymulin, because the LaValle
handbook lists it under "Other Name(s)" and nothing held established that the two names refer to the
same substance. The archive now supplies the same question from the other direction: a second source
talking at length about "Thymalin" as a bioregulator in the Khavinson tradition, alongside Epitalon,
which is not how LaValle's thymulin monograph frames it.

**Attaching this material to the Thymulin record would merge two identities on no evidence at all.**
It is not done. Thymalin is on the hold list as a candidate compound in its own right, and the
identity question is now recorded twice, from both sides.

---

## 6. EXISTING RECORDS ENRICHED

**Zero.**

Not because the material is worthless — several of the 18 covered compounds would gain a genuinely
independent second practitioner voice — but because no statement in the collection resolves to an
artifact this index holds. A claim reading "Tremblay reports X" would have to cite either a podcast
nobody here has listened to, or an unattributable working document. Neither is a citation a reader
can check, and a citation a reader cannot check is the one thing this project has consistently
refused to publish.

---

## 7. CLAIMS ADDED

**Zero.** For the reason in §6.

The extraction record catalogues 40 Tremblay claims with its own per-claim evidence assessment. That
assessment is worth reproducing, because it bears directly on how valuable the collection is:

| Assessment | Count |
|---|---|
| **Contradicted**, including by a regulator | **4** |
| Unsupported | 7 |
| Unverifiable | 15 |
| Partly supported or consistent | 6 |
| Opinion, history, secondary or uncertain attribution | 8 |

Four contradicted claims include two general safety statements — that overdosing most peptides means
only "it didn't work", and that for more than ninety per cent of peptides one cannot overdose or have
bad side effects — against which Health Canada's own risk list is cited. The extraction record's own
review flags say these "must always be shown with the evidence that contradicts them".

**This is the strongest argument for doing the acquisition properly rather than quickly.** A source
whose most quotable general claims are contradicted safety statements is a source that has to be
cited exactly, from the recording, with the timestamp — not paraphrased from a working file.

---

## 8. PROTOCOLS ADDED

**Zero.**

The collection contains real protocol content — the extraction record's protocol index lists 22
compound rows with routes, cycles and stacking. Publishing any of it would have required inventing a
locator, and the instruction on this is explicit in both the project's rules and the section brief.

What the collection would add, if obtained, is recorded in §13 as differences from LaValle rather
than as protocols, because a difference is a research finding and a regimen is an instruction.

---

## 9. ROUTES, CAUTIONS AND MONITORING ADDED

**Zero.** Same reason.

Worth naming for the acquisition case: the collection contains an explicit route-conversion rule (an
oral multiplier for BPC-157 and an intranasal multiplier for PT-141), a fasting window and a
biomarker titration target for growth-hormone secretagogues, and a cycling doctrine. The index
currently holds no comparable material from any source — LaValle gives regimens without conversion
rules. This is the single largest category of content that acquisition would unlock.

---

## 10. EVIDENCE GAPS ADDED

**Zero gaps were added to compound records**, because a gap hangs off a compound record and none was
touched.

The gaps are recorded where they belong instead: as the acquisition queue in the inventory, and as
the hold list in §18. Recording "no literature screen has been run" on a compound page is useful
because it tells a reader something about the compound; recording "a podcast nobody has listened to
might say something" on a compound page would tell them about this project's to-do list.

---

## 11. QUALITY AND MANUFACTURING CONTENT

The collection carries more quality and manufacturing material than any practitioner source the index
holds, which is unsurprising: the speaker manufactures. **None was ingested**, for the reason in §6.
It is catalogued here so the value is visible when the acquisition decision is made.

| Topic | What the collection contains | Quality topic it would meet |
|---|---|---|
| Stability, temperature and light | Most peptides stable at room temperature and more light- than heat-sensitive, with growth hormone singled out as fragile. The extraction record marks it **partially contradicted** on the stated structural reasoning | storage and handling |
| Reconstitution | Cloudiness on reconstitution as a bad sign, with one compound named as an exception | reconstitution |
| Label accuracy | An unnamed Scandinavian study said to have found vials labelled at one strength holding half of it across fifteen vendors. **Unverifiable** — the study is not identified | certificate of analysis; label versus measurement |
| Supply chain | An overwhelming majority of internet peptides said to originate from a few factories in one country. **Unverifiable**, no quantitative source | global manufacturing |
| Mixing and compatibility | Peptides mixed in one vial without interaction, on the strength of unpublished in-house testing. **Unverifiable, and a direct commercial conflict** | administration and delivery |
| Analytical capability | Self-reported equipment and HPLC maintenance costs. **Unverifiable self-report** | mass spectrometry; HPLC |

Five of the six are marked unverifiable or contradicted by the extraction record itself, and two rest
on the speaker's own unpublished testing of his own product. **The quality material is the part of
this collection most in need of an exact citation and most damaging if paraphrased.** Eight of the
index's quality topics are currently unwritten; none of them should be written from this.

---

## 12. AGREEMENTS WITH LAVALLE

Convergence that *would* exist if the appearances were held. None is published.

| Topic | Where the two sources agree |
|---|---|
| TB-500 and thymosin beta-4 are not the same thing | Both treat them as distinct. The index already carries two records on analytical grounds; a second practitioner source reaching the same conclusion independently would be genuine convergence |
| Bioregulator dosing is in micrograms, not milligrams | Tremblay's 2021–22 correction moves him towards the microgram scale, which is the register LaValle's Epitalon monograph uses. The index's Epitalon record already carries the Epitalon-versus-Epithalamin distinction as a gap, which is what the correction turns on |
| Breadth of BPC-157 preclinical findings | Both describe a wide preclinical range; neither claims established human efficacy |
| Fat loss needs diet, movement and sleep; peptides are adjuncts | Consistent with the framing of the index's metabolic records |
| Growth-hormone secretagogues are titrated, not fixed | LaValle gives regimens; Tremblay gives a titration target. Compatible rather than conflicting |

---

## 13. DIFFERENCES FROM LAVALLE

The most valuable content in the collection, and the clearest argument for acquiring it. Classified
using the section brief's own scheme. **None is published.**

| Topic | LaValle (held) | Tremblay (not held) | Relationship |
|---|---|---|---|
| **Epitalon dose scale** | A regimen with the Epithalamin distinction recorded as an open gap | A documented position change: a milligram-scale course in 2019, corrected downward in 2021–22, the correction explained as a misapplication of an extract's dosing to the peptide | **DIFFERENCE**, and the most useful kind — a source correcting itself and saying why |
| **Route conversion** | Regimens per route, no conversion rule anywhere | An explicit oral multiplier for BPC-157 and an intranasal multiplier for PT-141 | **DIFFERENCE** — the index holds nothing comparable from any source |
| **Local versus systemic injection** | Not addressed | A position change: local injection dismissed as no advantage in 2019, then ultrasound-guided intralesional administration described in 2022 | **DIFFERENCE**, again a self-correction |
| **GH-secretagogue timing** | Regimens without timing rationale | A fasting window, waking or pre-bed dosing, and a biomarker used to titrate | **VARIATION** — compatible, and more specific |
| **General overdose safety** | Compound-by-compound cautions | A general claim that overdosing most peptides means only that it did not work | **CONTRADICTION**, marked contradicted by a regulator's risk list in the extraction record itself |
| **AOD-9604** | A monograph with a second-hand meta-analysis and an internally inconsistent sequence | A commercial combination with a growth-hormone fragment, no doses given | **UNRELATED CONTEXT** — different subject matter, not a disagreement |
| **Thymalin versus Thymulin** | Thymalin listed under "Other Name(s)" for Thymulin, recorded as `related_but_distinct` | Thymalin as a bioregulator in its own right, alongside Epitalon | **The open identity question, now attested from both sides** |

**Neither source is adjudicated.** Tremblay is not treated as correct because he is more recent or
more specific, and LaValle is not treated as correct because he is in print. Where they differ, both
positions would be recorded with their provenance and the difference left standing — which is what
the index already does for CJC-1295 and for TB-500.

---

## 14. OTHER CROSS-SOURCE DIFFERENCES

One conflict is internal to the collection and would have to be resolved before anything from it is
published:

**A third-party blog attributes to Tremblay a milligram-scale Epitalon-plus-Thymalin regimen, undated
and at odds with his own 2021–22 correction to a far smaller scale.** The extraction record flags it
as a secondary attribution, notes that it fits his pre-correction era, and lists resolving it as a
high-priority review item before any comparison table is published. Publishing the blog's version
would attribute to a named person a regimen he has publicly corrected.

A second, quieter one: the collection's own assessment marks a claim about a non-peptide research
compound's cancer signal as **contradicted** by a manufacturer's letter and an anti-doping authority's
position. That compound is not in the register and the hold list keeps it there.

---

## 15. SOURCE-CONCENTRATION IMPROVEMENT

Measured, not estimated, against published claims.

### Before — and now, unchanged

| Measure | Count |
|---|---|
| Public compounds | 28 |
| **Single-source compounds** | **15** |
| Of those, LaValle-only | **15 — all of them** |
| Compounds with 3 or more distinct sources | 13 |
| Compounds carrying Tremblay as a second source | **0** |

The fifteen: AOD-9604, ARA-290, DSIP, Epitalon, Kisspeptin, KPV, Larazotide, MGF, PNC-27, PT-141,
Semaglutide, Sermorelin, Thymosin alpha-1, Thymulin, VIP.

### What acquisition would buy

| Scenario | Single-source compounds afterwards |
|---|---|
| Nothing acquired (today) | 15 |
| **The three public transcripts only** | **11** — Epitalon, PT-141, AOD-9604 and Semaglutide gain a second independent practitioner source |
| The full collection, all 23 appearances transcribed | **9** — adding DSIP and Thymosin alpha-1 |

**Nine compounds stay single-source whatever happens here:** ARA-290, Kisspeptin, KPV, Larazotide,
MGF, PNC-27, Sermorelin, Thymulin and VIP. Three of those were explicitly searched for in the
collection and not found. For those nine the answer is a literature screen, not another practitioner.

Best case, the entire collection moves the single-source count from 15 to 9. That is a real
improvement and it is not a transformation, and the acquisition decision should be made on those
terms rather than on the collection's apparent bulk.

---

## 16. DOSE-SAFETY RESULTS

No dose text was ingested, so no new exposure was created. The standing checks were run anyway,
before and after the source registration:

| Check | Result |
|---|---|
| `qa:doses` before registration | No dose-shaped strings in any patient payload |
| `qa:doses` after registration | No dose-shaped strings in any patient payload |

The shared dose rule established in Section 4 (`src/domain/presentation/dose-text.ts`) is unchanged
and remains the single definition used by the scan, the unit tests and the render suite.

**Recorded for the acquisition:** the collection is dense with amounts, multipliers and titration
targets. Every one belongs in the protocol layer, and the route-conversion rules in particular are the
kind of content that reads naturally in prose and would leak straight through a claim field.

---

## 17. LOCATOR VERIFICATION

| Measure | Count |
|---|---|
| Tremblay locators created | **0** |
| Resolved | 0 |
| **Failed** | **0** |
| Ambiguous | 0 |

Zero failures because zero were created, and that is the honest reading. Had the collection's
locators been transcribed into the index, **every one would have failed verification**: each names a
timestamp in a recording that is not held, and the verifier's first test is whether the artifact
exists.

The standing verification run across the whole index is unchanged: **224 resolved, 0 to check, 0
failed, 380 skipped** — the same four numbers as before the registration. The 23 new sources do not
appear in them at all, because the verifier counts locators and these sources have none. A source
with nothing resting on it is invisible to locator verification, which is the correct behaviour and
worth stating so the unchanged numbers are not mistaken for an oversight.

---

## 18. NEW-COMPOUND HOLD LIST

Compounds the collection discusses that the register does not carry. **None was built.** The owner
decides whether any joins the cohort.

| Compound | Appearances | Protocol content | Other held Tides source? | Recommendation |
|---|---|---|---|---|
| **Thymalin / Thymogen** | 5 | Daily dosing, 20–30 day courses, paired with Epitalon; a dose correction across eras | Yes — named in the LaValle Thymulin monograph under "Other Name(s)" | **IDENTITY REVIEW REQUIRED.** Two sources now attest Thymalin as a thing with its own regimens, and neither establishes whether it is Thymulin |
| **Setmelanotide** | 1 | The only numeric titration in the collection; an approved product exists | No | **HOLD.** An approved medicine with a narrow genetic indication. Its evidence belongs in a label and trials, not a podcast |
| **Livagen** | 1 | Named in a proprietary combination | No | **HOLD.** One episode, proprietary combination, commercial conflict |
| **FOXO4-DRI** | 1 | None; named without doses | Yes — a LaValle monograph exists, in the tranche-2 backlog | **BUILD AFTER TREMBLAY** if at all; the handbook is the better basis |
| **Humanin** | 2 | None | No | **HOLD** |
| **HGH Frag 176-191** | 2 | Combined with AOD-9604 by his company; no doses | Partly — AOD-9604 is in the register, the fragment is not | **IDENTITY REVIEW REQUIRED.** Whether it is distinct from AOD-9604 is exactly what that record's open gap asks |
| **TA1/LL-37 hybrid, TA1-RGDR** | 2 | None; timestamps only | No | **HOLD.** Proprietary constructs with no published data by the collection's own assessment |
| **Tesofensine** | 1 | None | No | **HOLD.** Non-peptide; same taxonomy question as MK-677 |
| **GW-501516, RAD-140, myostatin inhibitors** | 3–5 | Dosing segments exist, not retrieved | No | **HOLD.** Non-peptides, and the collection marks the safety claim about one of them as contradicted |

Nine candidates. **Two need an identity decision before anything else**, and both are questions the
register already carries as open gaps — a good sign the architecture is catching the right things.

---

## 19. TREMBLAY MATERIAL NOT INGESTED, AND WHY

Everything. The reasons, grouped:

| Material | Why not ingested |
|---|---|
| 40 catalogued claims | No locator resolves to a held artifact. Four are contradicted, seven unsupported and fifteen unverifiable by the extraction record's own assessment |
| 22 rows of protocol content | Same — and a regimen is the last thing that should rest on an unverifiable citation |
| Route-conversion rules, titration targets, cycling doctrine | Same. The most valuable content in the collection and the most dependent on exact wording |
| Six quality and manufacturing topics | Same, plus a direct commercial conflict on two of them |
| Health Canada regulatory history | Concerns a company, not a compound. Recorded as source context instead |
| The speaker's own research record | There is none on peptides. Two candidate papers have `UNCERTAIN` identity and were not attached |
| Hearsay about third parties | The extraction record flags it as potentially defamatory. It stays out entirely |

---

## 20. PUBLICATION-INTEGRITY RESULT

Run before ingestion, and again after the source registration.

| When | Result |
|---|---|
| Baseline, before any change | 919 rows across 14 publishable relations, 905 published. **A deterministic re-seed preserves every published record** |
| After registering 23 sources and rewriting SRC-016 | 919 rows, 905 published. **Unchanged, and still preserved across a re-seed** |

The Section-4 seed-rebuild defect was not recreated. Sources are not a publishable relation, so
registering 23 of them changes no publication state — which the check confirms rather than assumes.

---

## 21. FULL QA RESULT

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npx vitest run tests/unit` | **433 passing** across 30 files |
| Targeted integration (render, re-seed, source reconciliation, seed cohort) | **33 passing** across 4 files |
| `npm run qa:publication-integrity` | **919 rows across 14 relations, 905 published — a deterministic re-seed preserves every published record** |
| `npm run qa:production` | **No blockers. This database may serve the public.** |
| `npm run qa:doses` | **No dose-shaped strings in any patient payload** |
| `npm run evidence:locators` | **224 resolved, 0 to check, 0 failed, 380 skipped** — identical to the pre-ingestion run |
| `npm run build` | succeeds; 20 static pages generated |
| `npx vitest run tests/integration` | **435 passing** across 37 files, 0 failures, 26 minutes — one clean run on the final state |

### Final sequence, after the suite

```
Seed          new records arrive unpublished, existing publication states unchanged
Integrity     a deterministic re-seed preserves every published record
Counts        28 public compounds, 905 published records, 0 withdrawn, 0 claiming review
Withdrawals   0 unintended
Locators      every Tremblay location resolves — there are none, and none was created
```

---

## 22. FINAL PUBLIC COUNTS

| Measure | Before Section 5 | After |
|---|---|---|
| Public compounds | 28 | **28** |
| Published records | 905 | **905** |
| Practitioner protocols public | 111 | **111** |
| Withdrawn | 0 | **0** |
| Compounds claiming a human review | 0 | **0** |
| Registered sources | 197 | **220** |
| Search index documents | 238 | **261** |

The only change to the public surface is 23 source records that say plainly what they are: registered,
not held, cited by nothing.

---

## 23. REMAINING V1 LAUNCH BLOCKERS

| # | Blocker | Owner decision or work |
|---|---|---|
| 1 | **Eight quality topics are unwritten** and refuse publication at the gate — the only standing publication refusals in the library | Editorial work. They must not be written from the Tremblay collection |
| 2 | **15 of 28 compounds are single-source**, all LaValle | Literature screens; Larazotide and AOD-9604 first |
| 3 | **No literature screen exists for any of the 16 records added in Section 4** | The same work as (2) |
| 4 | Tremblay acquisition decision | Three public transcripts, ranked in the inventory |
| 5 | Two open identity questions — Thymalin versus Thymulin, and HGH Frag 176-191 versus AOD-9604 | Owner decision, informed by acquisition |
| 6 | Non-peptide taxonomy question — MK-677, 5-Amino-1MQ, tesofensine, GW-501516 | Owner decision on whether a peptide index carries non-peptides at all |
| 7 | Deployment prerequisites: DNS, HTTPS, analytics and privacy decision, error monitoring, backups | Section H of `ACCEPTANCE_TESTS.md`, untouched and out of scope here |

Nothing in this section added a blocker.

---

## 24. RECOMMENDED NEXT STEP

**Retrieve the three public transcripts — SRC-206, SRC-204, SRC-216, in that order — and run a
second, short ingestion pass against them.**

It is the cheapest high-value work available: three web pages, already identified, each with a full
transcript, together covering the collection's deepest material on BPC-157, the bioregulators, the
growth-hormone axis and the route-conversion rules. Holding them would turn every "would" in this
report into a claim with a timestamp somebody can check, and would move four compounds off the
single-source list.

Doing it *before* any further compound expansion is the right order, because the same three
transcripts also bear on two of the open identity questions and would otherwise have to be revisited.

**One caution to carry into that pass.** This is a vendor describing his own products, with a
regulator's permanent injunction against his company, and an extraction record whose own assessment
finds four of his general claims contradicted — two of them safety claims. That does not disqualify
the source; expert practice is exactly what a `reference_opinion` lane is for. It does mean every
claim must be quoted from the transcript with its timestamp, attributed in the sentence, and — where
the contradicting evidence is held — shown next to it.
