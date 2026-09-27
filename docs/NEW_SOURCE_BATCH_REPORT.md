# New source batch report

Intake of an owner-supplied research folder outside this repository, 14 September 2026. Branch
`phase-a-foundation`. Not deployed, noindex intact, nothing published, no
compound added.

The folder was treated as an intake directory. Every file was hashed and read
before anything was decided; nothing was copied into `sources/` because it had
arrived, and no owner file was moved, renamed or altered. The full register —
45 files with hash, size, pages, type, language, text extractability,
classification and disposition — is committed at
`data/seed/source-artifacts/intake-2026-09-14.json`, and the 26 files belonging to
a registered source are loaded into the new `source_artifacts` table.

Registration: `scripts/sources/register-batch-2026-09-14.py`.
Register: `scripts/sources/intake-register-2026-09-14.py`.

## GOOD SOURCES INGESTED

| Key | Source | How verified | Copy |
|---|---|---|---|
| SRC-124 | EudraLex Vol. 4 GMP Annex 1, Manufacture of Sterile Medicinal Products, C(2022) 5938 final | Owner copy **byte-identical** to the file downloaded from health.ec.europa.eu | 59 pp. |
| SRC-125 | FDA ORA.007 Pharmaceutical Microbiology Manual, Revision 02 (25 Aug 2020) | Owner copy **byte-identical** to fda.gov/media/88801/download | 92 pp. |
| SRC-123 | Pardeshi SR et al., *Future J Pharm Sci* 2023;9:99, doi 10.1186/s43094-023-00551-8 — open-access freeze-drying review | Downloaded by this index from the publisher; title, authors, DOI, 31 pages confirmed; two publisher URLs gave identical bytes | 31 pp. |
| SRC-022 | USP <71> Sterility Tests (English print, 15 Oct 2020, "official as of 31-Dec-2012") | Title block and DocId read from page images | 8 pp., held research copy |
| SRC-023 | USP <85> Bacterial Endotoxins Test (English print, 21 Nov 2024, "official as of 01-May-2018") | Title block, DocId and DOI read | 7 pp., held research copy |
| SRC-030 | Lee, Walker & Ayadi, *Altern Ther Health Med* 2024;30(10):12–17 — BPC-157 interstitial cystitis | Full text read; PMID 39325560 confirmed | 6 pp. |
| SRC-050 | Jastreboff et al., *N Engl J Med* 2023;389:514–26 — retatrutide phase 2 obesity | Full text read | 13 pp. |
| SRC-051 | Sanyal et al., *Nat Med* 2024;30:2037–48 — retatrutide MASLD substudy | Full text read | 31 pp. |
| SRC-126, SRC-129, SRC-137–139 | ClinicalTrials.gov records for five retatrutide trials, two with posted results | Retrieved from the registry API; snapshots committed in `data/sources/registry/` | Structured |
| SRC-127, SRC-130 | Retatrutide phase 2 protocols (final amendments) | Downloaded from ClinicalTrials.gov's document server | 123 and 127 pp. |
| SRC-128, SRC-131 | Retatrutide phase 2 statistical analysis plans | Downloaded from ClinicalTrials.gov's document server | 54 and 56 pp. |
| SRC-132–136 | Five trial-linked retatrutide publications | PubMed records and abstracts read | Abstract only |
| SRC-143 | Wang et al., *Signal Transduct Target Ther* 2022;7:48 — therapeutic peptides review (CC BY) | Full text from the Europe PMC API; PubMed confirmed; quotes checked word for word | Private text snapshot |
| SRC-145 | Nugrahadi et al., *Pharmaceutics* 2023;15:935 — peptide formulation review (CC BY) | Same | Private text snapshot |
| SRC-146 | Chen et al., *Theranostics* 2022;12:1419 — oral protein and peptide delivery review (CC BY) | Same; its editing errors recorded, affected passages unused | Private text snapshot |
| SRC-144 | Al Musaimi et al., *Pharmaceuticals* 2022;15:1283 (CC BY) | Read in full and set aside: it concerns stability in the body, not on the shelf | Registered, cited by nothing |
| SRC-147 | ICH Q5C, Step 4, 30 Nov 1995 | Downloaded from database.ich.org; title page read; page offset checked against every locator | 10 pp. |
| SRC-148 | ICH Q1A(R2), Step 4, 6 Feb 2003 | Same | 24 pp. |
| SRC-149, SRC-150 | ADA conference abstracts 104-OR (2021) and 340-OR (2022) — retatrutide phase 1 and 1b | Abstract text from the publisher's Crossref deposit; journal page refused access | Abstract only |

**USP provenance, stated plainly.** Both USP chapters were obtained by the owner
from Scribd, not from USP. They are recorded as *held research copies: content
appears to reproduce the USP-NF chapter; distribution provenance unverified; not
an official USP artifact obtained from USP*. The <85> print carries the notice
"Do not distribute" and names the subscriber who printed it; that name is not
recorded here. Neither file is redistributed. This follows the owner's
instruction in the batch brief and reverses the earlier refusal under V-017 and
V-018; it is recorded as owner decision D-21. A unit test fails if any record
describes them as official.

**Lyophilisation decision.** Costantino and Pikal (SRC-013) stays a
bibliographic and index source only — its file is a two-page contents listing —
and the citable freeze-drying source is now the open-access Pardeshi review. The
owner is not asked to obtain the 686-page book.

## DUPLICATES

| File | Disposition |
|---|---|
| 15 files byte-identical to copies already registered (SRC-001–012, 014, 015) | Recorded, not retained |
| Second LaValle handbook file (different bytes, all 281 pages identical text to SRC-002) | Recorded, not retained |
| `peptidebooks.zip` (the SRC-001, 003, 004 files again) | Recorded, not extracted |
| `484472225-USP-NF-71-Sterility-Tests (1).pdf` | **Byte-identical** to the retained USP <71> copy; one kept |
| `88403241-Lyophilization-of-Biopharmaceuticals (1).pdf` | Same two-page contents listing as SRC-013, different bytes; not retained |

**USP <71> comparison.** Three files. Two are byte-identical English prints
(15 Oct 2020). The third (18 pp., printed 4 Aug 2022) carries the same chapter
and version identifier in its Spanish-language form, machine-translated back
into English with Spanish sentences left in and meaning-changing errors (a
sample-size rule reading "10% of 4 containers" where the English reads "10% or 4
containers, whichever is the greater"). Same chapter, same version; the English
print is the working copy and the translation is never used for wording.

## PARTIAL SOURCES

| Key | Source | State |
|---|---|---|
| SRC-121 | *Rang y Dale. Farmacología*, 10.ª edición (Spanish, Elsevier España 2024) — publisher sample | **10th edition, confirmed. Spanish translation. Incomplete:** 40 pages — front matter, contents, preface and chapter 2 only, marked as an uncorrected proof. Usable for chapter 2 receptor concepts; 16 claims extracted as paraphrases. Nothing on signalling (chapter 3) or pharmacokinetics (chapters 9–11) may rest on it. |

**Would the English copy materially improve extraction? Yes.** The chapters
blocking Understanding Peptides chapters Four and Seven and Science & Applications
chapter Five are absent from the sample; the translation carries at least two
printing errors (a summary box calling occupancy "proportional" to
concentration; an online answer writing "antagonist" for agonist); and its own
publisher disclaims the translation. Registered as SRC-122 (ISBN
9780323873956), not held.

## REJECTED SOURCES

| File | What it actually is | Disposition |
|---|---|---|
| `1067587256-Ebook-Lehninger-Principles-of-Biochemistry-8th-edition…pdf` | A download-site **advertisement** (prices, ratings, QR code) followed by unrelated text fragments | Rejected. **Not Lehninger.** SRC-120 registered with no copy |
| `1047650095-…Therapeutic-Peptides-and-Proteins…146656606X (1).pdf` | The same kind of **advertisement**; a second copy of what SRC-014 already was | Rejected. **Not Banga.** SRC-014 stays `replace` |
| `Lee & Padgett "Intra Articular Injection of BPC 157…pdf` | **A different article**: Lee E, "Effects of Nitric Oxide on Carotid Intima Media Thickness", *Altern Ther Health Med* 2016;22(S2):32–34 (PMID 27433839). No BPC-157 content | Rejected as mislabelled. SRC-031 stays abstract-only |
| `EL_Choco_DEVELOPER_Brochure.pdf`, `El_Choco_Brochure_Clean_Vector_Text.pdf` | Commercial brochures unrelated to peptide research | Out of scope |

## TRANSCRIPTIONS

| File | Original source | State |
|---|---|---|
| `Lee & Burgess Safety of Intravenous Infusion of BPC157 in Humans A Pilot Study.docx` | Lee E, Burgess K, *Altern Ther Health Med* 2025;31(5):20–24, PMID 40131143 (SRC-029) | **Owner-created transcription — not the publisher's artifact.** Recorded as a separate working artifact, `transcription_unverified`. Its abstract matches PubMed except for one hyphen; its body cannot be verified (one participant's table missing, another labelled for the wrong participant, passages out of order). SRC-029 stays at abstract level and nothing is cited from the transcription's body. |

The original source and the working artifact are distinct records: the
`sources` row is the journal article; the `source_artifacts` row is the Word
document, and a database constraint prevents a transcription from ever being
marked verified.

## SOURCE REPLACEMENTS STILL NEEDED

**Reframed per owner direction (14 September 2026): the owner is not being sent
back to look for these.** For each, the source is recorded as SOURCE NOT HELD, the
scientific questions it was meant to answer are named, and those questions are
answered where possible from other legitimate sources. Each of those is cited as
itself and never presented as the missing work. Where nothing suitable is held,
the question stays a recorded gap.

| Source not held | Questions it was meant to answer | How each question is now handled |
|---|---|---|
| **Banga, Therapeutic Peptides and Proteins, 3e** (SRC-014). A third file received was also an advertisement (166 pp, rejected). | Degradation routes, excipients, pH and buffers, stability testing | **Answered in part.** New quality packet `formulation-excipients` (28 claims) from Nugrahadi et al., *Pharmaceutics* 2023 (SRC-145, CC BY review), ICH Q1A(R2) (SRC-148) and ICH Q5C (SRC-147), both retrieved from ich.org. The sequence-to-vial formulation stage is now sourced. **Still open:** tonicity agents, lyoprotectants, adsorption controls, the purpose of preservatives, and what any product contains. SRC-144 (Al Musaimi 2022) was read and set aside: its "stability" means stability in the body. |
| **Rang and Dale's Pharmacology, 10e, English** (SRC-122) | Signalling beyond receptors; pharmacokinetics; routes | **Answered in part.** New learning packet `peptides-as-medicines` (18 claims) from Wang et al., *STTT* 2022 (SRC-143) and Chen et al., *Theranostics* 2022 (SRC-146), both CC BY: peptides' strengths and two weaknesses as a class, why most are injected, oral delivery barriers, short half-life and renal clearance. **Since answered in part:**
<ul>
<li>General pharmacokinetic definitions and route descriptions, from CC BY reviews, the NCI Thesaurus, 21 CFR 314.3 and the FDA route data standard (SRC-181 to SRC-193).</li>
<li>Receptors corroborated and signalling written from English CC BY sources (SRC-155, SRC-157 to SRC-159, SRC-169 to SRC-180).</li>
</ul>
**Still open:** steady state, the limits of half-life, protein binding and kinase cascades. See `docs/FOUNDATIONS_SOURCE_REPORT.md`. |
| **Lehninger, Principles of Biochemistry, 8e** (SRC-120) | Understanding Peptides chapters One to Four | **Answered, with gaps.** OpenStax is excluded (D-26, closed by the owner). Chapters One to Four are written from CC BY reviews and public-domain US government material (SRC-143, SRC-145, SRC-151 to SRC-168). Points no source states stay SOURCE NEEDED. See `docs/FOUNDATIONS_SOURCE_REPORT.md`. |
| **Lee & Padgett 2021, publisher PDF** (SRC-031) | What the knee-injection report contains beyond its abstract | Stays at abstract level; no other legitimate copy is held, and the gap names what the full text would settle. |
| **Lee & Burgess 2025, publisher PDF** (SRC-029) | Verifying the owner's transcription | Stays abstract-level. Nothing is cited from the transcription body. |
| **Licensed USP-NF <71> and <85>** | Official chapter wording | Topics written from the research copies, cross-checked with EU GMP Annex 1 and FDA ORA.007, which were verified against their issuers (D-21). |
| **Retatrutide journal full texts** | Trial detail | Answered from the trial ecosystem: registry records and posted results, protocols, SAPs and substudies. See `docs/RETATRUTIDE_DEEP_EVIDENCE_REPORT.md`. |

The owner's `NCT04867785.csv` was not in the folder. Its document links, as
quoted in the brief, were used directly.

## WHAT THE BATCH CHANGED

**Quality and the final vial.** Three new quality-topic packets — sterility (11
claims), bacterial endotoxin (5) and lyophilisation (5) — from Annex 1, ORA.007,
the USP research copies and the Pardeshi review. Each claim is scoped as an
expectation for licensed sterile medicines, never as a description of a product.
Fill and finish, lyophilisation and finished-product release in the
sequence-to-vial pathway are now sourced. Formulation followed on owner
direction, as a fourth packet (`formulation-excipients`, 28 claims, 4 gaps) from
an open-access formulation review and ICH Q1A(R2) and Q5C, so no stage of the
pathway is unsourced. Its quotes were checked mechanically against the review's
full text and the ICH PDFs, and the ICH page offsets were checked against every
candidate. The lyophilisation page's excipient-design gap is partially resolved;
the two reconstitution gaps were checked and stay open, with a note on why the
ICH requirement explains the gap without answering it. The HPLC page's two
held gaps ("purity says nothing about sterility / endotoxin") are marked partially
resolved: the facts are now sourced separately, and no source states the
comparison itself, so that sentence stays unmade. The storage page's
lyophilisation-process gap is likewise partially resolved. Agent-proposed quotes
were checked mechanically against the extracted page text (28 of 29 matched; the
remaining one, a table, was checked visually and corrected an omitted attribute).

**BPC-157.** The interstitial cystitis study, now read in full, is a
**retrospective chart review**, not a prospective study; its material came from
a 503A compounding pharmacy the authors do not name; no ethics approval is stated
for it. Evidence type, traces, the protocol row (practitioner only) and the
funding row (conflict declaration located; no funding statement) were updated
accordingly. The gap "what the full texts report" is partially resolved; two new
gaps name the replacement files still needed.

**Education.** A new `learning_topics` subject holds 16 receptor claims from Rang
and Dale chapter 2. Understanding Peptides chapter Five (Receptors) is now
written from them and says on its own pages that it rests on a partial
translated sample; the volume remains PARTIAL DRAFT, six chapters written and six
briefs. Science & Applications chapter Four now has its receptor half written;
the intracellular-signalling half remains source needed, naming SRC-122.

A second learning packet, `peptides-as-medicines` (18 claims, 5 gaps), comes
from two CC BY reviews (SRC-143, SRC-146). It covers peptides' strengths and
two weaknesses as a class, why most are injected, oral delivery barriers, and
protease cleavage and kidney filtration as limits on time in the blood. Science
& Applications chapter Five now answers "why is oral bioavailability hard" from
it. General pharmacokinetic definitions and the individual routes stay source
needed. Both are recorded as gaps, and the book says why: OpenStax was set
aside, D-26. The Theranostics review's editing errors were found during
extraction; none of the affected passages is used, and every claim resting on it
carries that caveat.

**Schema.** Migration 0026: `source_artifacts`, `clinical_trials`,
`trial_documents`, `trial_source_comparisons`, `learning_topics`, gap resolution
states. It also fixes a latent defect from 0025: `study_funding` used a trigger
that dereferences a review-state column the table does not have, so any material
correction to a funding row would have failed. Found by the new integration test.

## QA

Gates run on 14 September 2026 against the final data (147 sources).

| Gate | Result |
|---|---|
| Unit tests | 154 / 154 |
| Typecheck | clean |
| Lint | clean |
| Integration tests | 376 / 378 on the full run; the 2 failures were stale premises, both fixed and rerun (29 / 29 in those files): the certificates test still expected USP <71> and <85> to be unheld (they are held research copies under D-21), and the learning-claims test counted every learning topic as the receptor topic (it now checks each topic separately, and that the new one rests only on SRC-143 and SRC-146) |
| Production build | passes (`next build`: TypeScript clean, 17 static pages generated); `next-env.d.ts` restored afterwards |
| Source verification | clean; SRC-014 "not citable"; abstract-only and web-snapshot sources report "no file recorded", as intended |
| Locators | 172 resolved, 0 to check, 0 failed, 245 skipped (no page or no held file) |
| Dose-leak scan | all 12 records clean |
| Patient audit | 12 / 12 checked; 10 clean; MOTS-c (8) and tesamorelin (4) strings inspected and benign ("reconstituted" in research-question and uncertainty text) |
| Publications | Peptide Quality, Understanding Peptides, Science & Applications and the Reference Guide rebuilt; reference sheets rebuilt |
| Robots | noindex unchanged; nothing deployed |

**Defects found and fixed during the gates.**

- *Dev-database contention.* With one connection allowed, a record page that
  opened an extra independent loader for trials intermittently failed with
  `bind message supplies N parameters` (08P01). The patient audit then printed
  "no mode switch found — skipped" and still exited 0. The trials read now runs
  inside the page's existing session. One further intermittent skip (retatrutide)
  was seen while a PDF build shared the database; an immediate rerun was clean.
  The audit's exit code alone is not proof of coverage, so the per-record lines
  are read each time.
- *`study_funding` trigger.* Migration 0025 attached a trigger that reads a
  review-state column the table does not have; any material edit to a funding row
  would have failed. Migration 0026 re-points it to a trigger without that
  dependency, with a regression test.
- *Trial document dates.* A conference abstract dated by month only ("2021-06")
  failed at insert into a `date` column. The dates now use the supplement's
  issue date, with a note saying so, and the seed schema rejects anything but a
  full calendar date.
- *A held book that was not held.* SRC-014 was marked `held` because an
  advertisement file sat on the record. It is now `unavailable`, and a unit test
  asserts that none of the three not-held books is marked held or usable.
