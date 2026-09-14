# Foundations source report

14 September 2026, branch `phase-a-foundation`. Not deployed; noindex intact;
nothing published; no compound added.

## Decision followed

Owner decision **D-26, closed**: OpenStax is excluded from the source pipeline
because its terms conflict with this index's AI-assisted extraction workflow. It
was not used, registered or cited, and no OpenStax-derived extraction is kept.
The scratch extraction files and the scripts that built them were deleted.

The remaining foundational questions are answered from several permissive
sources rather than one textbook, in the owner's order of preference:

1. peer-reviewed open-access articles under CC BY (3.0 or 4.0);
2. public-domain US government material — the NHGRI glossary, a 1998 NIAAA
   overview, 21 CFR 314.3 and the FDA route data standard;
3. the NCI Thesaurus (CC BY 4.0), using NCI-authored definitions only.

## How each source was checked

For every source:

- **Licence.** Read in the retrieved full text itself — the XML `<license>`
  element for articles, and the terms statement for government pages — and
  recorded verbatim in the manifest's `integrity_notes`. The full text was also
  scanned for text-and-data-mining, machine-learning, AI, NonCommercial and
  NoDerivatives wording. None was found in any accepted source.
- **Bibliographic record.** Title, author list, journal, year, DOI and PMID were
  confirmed against PubMed, including publication types for retractions and
  errata.
- **Retrieved text.** Kept privately in
  `data/private/source-snapshots/foundations/` (gitignored) and pinned by hash.

The build script (`scripts/evidence/build-foundations-2026-09-14.py`) refuses to
write if:

- a quote is not found word for word in the retrieved text;
- a licence is not CC BY, CC0 or public domain, or is NonCommercial or
  NoDerivatives;
- a text-mining or AI restriction is recorded;
- a claim names a first author who is not on the cited source's PubMed author
  list.

It registers only sources that carry at least one kept claim. It de-duplicates by
DOI, PMID and URL, and names one- and two-author papers in full rather than as
"et al.".

Only the claims the publications need were extracted.

## Totals

| Learning topic | Claims | Gaps |
|---|---|---|
| What a peptide is | 11 | 2 |
| Amino acids, peptides, proteins | 8 | 1 |
| Peptides the body makes | 11 | 3 |
| How peptide signalling works | 10 | 1 |
| Receptors, agonists and antagonists (English sources) | 24 | 3 |
| Pharmacokinetic concepts | 17 | 3 |
| Routes of administration | 26 | 2 |
| **Total** | **107** | **15** |

43 new sources are registered (SRC-151 to SRC-193), so the manifest now holds
190. Two held CC BY reviews are reused: SRC-143 (Wang et al. 2022) and SRC-145
(Nugrahadi et al. 2023).

## Sources, by topic

### What a peptide is

| Key | Authors | Venue | Licence |
|---|---|---|---|
| SRC-160 | López-López et al. | Chemical Science 2026 | CC BY 3.0 |
| SRC-161 | Apostolopoulos et al. | Molecules 2021 | CC BY 4.0 |
| SRC-162 | Duengo et al. | Molecules 2023 | CC BY 4.0 |
| SRC-163 | Elsayed et al. | Journal of Peptide Science 2025 | CC BY 4.0 |
| SRC-164 | National Human Genome Research Institute | Talking Glossary, "Peptide" | public domain (credit line requested and printed) |
| SRC-143, SRC-145 | Wang et al.; Nugrahadi et al. | held | CC BY 4.0 |

### Amino acids, peptides, proteins

| Key | Authors | Venue | Licence |
|---|---|---|---|
| SRC-165 | Brown et al. | Life 2023 | CC BY 4.0 |
| SRC-166 | Idrees et al. | Antibiotics 2020 | CC BY 4.0 |
| SRC-167 | Morris et al. | Essays in Biochemistry 2022 | CC BY 4.0 |
| SRC-168 | Muñoz and Cerminara | Biochemical Journal 2016 | CC BY 4.0 |

### Peptides the body makes; How peptide signalling works

| Key | Authors | Venue | Licence |
|---|---|---|---|
| SRC-151 | Ahmadi et al. | Frontiers in Endocrinology 2025 | CC BY |
| SRC-152 | Hevesi, Hökfelt and Harkany | BioEssays 2025 | CC BY 4.0 |
| SRC-153 | Wang G | Pharmaceuticals 2014 | CC BY 3.0 |
| SRC-154 | Alford et al. | Frontiers in Microbiology 2020 | CC BY 4.0 |
| SRC-155 | Tse and Wong | Frontiers in Endocrinology 2019 | CC BY |
| SRC-156 | Hiller-Sturmhöfel and Bartke | Alcohol Health and Research World 1998 | public domain (US government) |
| SRC-157 | Culhane et al. | Frontiers in Pharmacology 2015 | CC BY 4.0 |
| SRC-158 | Cho et al. | Biomolecules 2025 | CC BY 4.0 |
| SRC-159 | Seyedabadi et al. | Biomolecules 2021 | CC BY 4.0 |

### Receptors (English sources)

| Key | Authors | Venue | Licence |
|---|---|---|---|
| SRC-169 | Higham and Colquhoun | Royal Society Open Science 2024 | CC BY 4.0 |
| SRC-170, SRC-171 | Alexander et al. | British Journal of Pharmacology 2025 (Concise Guide 2025/26) | CC BY 4.0 |
| SRC-172 | Watts et al. | American Journal of Hypertension 2023 | CC BY 4.0 |
| SRC-173 | Liu et al. | Circulation Research 2024 | CC BY 4.0 |
| SRC-174 | Gundry et al. | Frontiers in Neuroscience 2017 | CC BY 4.0 |
| SRC-175 | Allouche et al. | Frontiers in Pharmacology 2014 | CC BY 4.0 |
| SRC-176 | Costa-Neto and Parreiras-E-Silva | Clinical Science 2025 | CC BY 4.0 |
| SRC-177 | Michel et al. | Cells 2020 | CC BY 4.0 |
| SRC-178 | Kale et al. | Anesthesia and Analgesia 2026 | CC BY 4.0 |
| SRC-179 | Fenouillet et al. | International Journal of Molecular Sciences 2019 | CC BY 4.0 |
| SRC-180 | Horowitz et al. | Psychological Medicine 2026 | CC BY 4.0 |

### Pharmacokinetic concepts; Routes of administration

| Key | Authors | Venue | Licence |
|---|---|---|---|
| SRC-181 | Straehla and Warren | Pharmaceutics 2020 | CC BY 4.0 |
| SRC-182 | Yousef et al. | Biomedicines 2024 | CC BY 4.0 |
| SRC-183 | Lin and Wong | Pharmaceutics 2017 | CC BY 4.0 |
| SRC-184 | Stepensky | Toxins 2018 | CC BY 4.0 |
| SRC-185 | Mahmood and Pettinato | Antibodies 2021 | CC BY 4.0 |
| SRC-186 | Office of the Federal Register | 21 CFR 314.3, 2025 edition (govinfo.gov) | public domain |
| SRC-187 | National Cancer Institute EVS | NCI Thesaurus | CC BY 4.0 |
| SRC-188 | Pitiot et al. | Antibodies 2022 | CC BY 4.0 |
| SRC-189 | Kirkby et al. | Pharmaceutical Research 2020 | CC BY 4.0 |
| SRC-190 | Bose et al. | Cells 2022 | CC BY 4.0 |
| SRC-191 | Plaunt et al. | Pharmaceutics 2022 | CC BY 4.0 |
| SRC-192 | Bahraminejad and Almoazen | Pharmaceutics 2025 | CC BY 4.0 |
| SRC-193 | FDA CDER | Data Standards Manual: Route of Administration (page current 14 Nov 2017) | public domain |

## Excluded after review (reasons recorded in the build script)

- **Elphick et al. 2018** carries a published correction that is not open access
  and whose text could not be read, so three candidates were dropped. The same
  points are covered by Hevesi et al. 2025 and Culhane et al. 2015.
- **Two GLP-1 receptor statements** (Cho et al. 2025) were dropped as
  compound-adjacent detail for a patient chapter. One of them also gives an
  incomplete description of protein kinase A.
- **The smallest and largest protein superlatives** (Apostolopoulos et al. 2021)
  were not checked, so they were not used.
- **Two occupancy-equation passages** come from a lower-selectivity venue (Cureus
  2026), so the concentration–occupancy relation is recorded as a gap.
- **An opioid-specific, largely preclinical account of pharmacokinetic
  tolerance** was not used.
- **A structural review that discloses an AI-drafted summary** (Exp Mol Med 2025)
  was not used.
- **A single-author review of oral peptide pharmacokinetics** (Niazi 2026)
  discusses products and dosing intervals, so it was not used, and steady state
  stays SOURCE NEEDED.
- **Three further PK and route candidates** were not used:
  - an illustration drawn from specific anti-diabetic products;
  - a protein-binding statement limited to the blood–brain barrier;
  - a subcutaneous model's simulated size thresholds.
- **An injectable dosage-form definition** that the NCI Thesaurus takes from
  CDISC, rather than authoring itself, was not used.
- **Al Musaimi et al. 2022** is permissively licensed but off-topic (stability in
  the body), and another candidate article's licence could not be verified in its
  XML. Neither is registered.

Corrections made during the build:

- **Author names.** The pharmacokinetics extraction labelled two sources by the
  wrong first author. PubMed gives Mahmood and Pettinato (not "Zhu") and Pitiot
  et al. (not "Jiang"). Both were corrected, and the build now checks every
  leading author name against the manifest.
- **Duplicate registration.** A source with no DOI (the 1998 overview) had been
  registered twice. The manifest was reset and rebuilt with PMID and URL
  de-duplication.

## What the publications now say

**Understanding Peptides.**

- **Chapters written.** Chapters One to Four and Seven are written from these
  claims. The volume now has eleven chapters written and one brief (Six, why
  peptides are studied), and stays PARTIAL DRAFT.
- **Chapter Five.** Keeps its Spanish-sample basis and is now corroborated by
  English CC BY sources. In one place it is qualified: Higham and Colquhoun show
  that measured agonist binding depends on efficacy as well as affinity.
- **Chapter Seven.** Describes routes and instructs nothing — no volume,
  technique, frequency or amount.

**Peptide Science & Applications.**

- **Chapter Four.** The signalling half is written: GPCR activation, second
  messengers, biased agonism, receptor subtypes, arrestins and downregulation.
- **Chapter Five.** Now defines ADME, Cmax, Tmax, AUC, clearance, volume of
  distribution, half-life and bioavailability, and covers first-pass metabolism,
  how peptides differ and the routes.

**Sources not held.** SRC-120 (Lehninger) and SRC-122 (English Rang and Dale)
now name the permissive sources answering their questions, and the points still
open.

## SOURCE NEEDED — printed on the page, recorded as gaps

Chapter One:

- what the N- and C-terminus of a chain are, and what a "residue" is;
- how measurement changes with chain length.

Chapter Two:

- other effects of length, such as stability or immune recognition.

Chapter Three:

- growth factors as a class;
- a general rule that the body's peptides are short-lived;
- **that "the body makes it" is not, by itself, an argument about safety or
  efficacy.** The facts it would rest on are sourced; no source draws the
  conclusion, so the index does not.

Chapter Four:

- plain definitions of paracrine and autocrine signalling.

Chapter Seven:

- systemic absorption of inhaled peptides;
- sterility stated as a demand of the injectable route.

Receptors:

- that most peptide hormones act through GPCRs;
- tolerance from mediator depletion;
- surmountable competitive antagonism;
- the concentration–occupancy relation.

Pharmacokinetics (Science & Applications, chapter Five):

- time to steady state;
- what half-life does not tell you;
- general plasma protein binding;
- absolute versus relative bioavailability;
- kinase cascades (Science & Applications, chapter Four).

## QA

These are the final gates, run on 14 September 2026 after every fix, against the
final data (190 sources).

| Gate | Result |
|---|---|
| Unit tests | 158 / 158 |
| Full integration suite | **379 / 379 tests, 31 / 31 files** — one whole-suite run from the final post-fix state, with no targeted reruns |
| Locators | 172 resolved, 0 to check, 0 failed, 352 skipped |
| Patient audit | 12 / 12 records checked; 10 clean; MOTS-c (8) and tesamorelin (4) strings inspected — the same benign "reconstitution" wording as before |
| Dose scan | all 12 records clean; no dose-shaped strings in any patient payload |
| Typecheck | clean |
| Lint | clean |
| Production build | passes (TypeScript clean; 17 / 17 static pages); `next-env.d.ts` restored |

Notes on the table:

- **Locators.** The skipped count rose from 245 because web full texts and
  government pages carry no page numbers. Their locators are section headings.
- **Publications.** All rebuilt from the reseeded database.
  - Understanding Peptides is 26 pages, with 12 SOURCE NEEDED markers and no
  amounts in mg, mcg or µg.
  - Science & Applications is 17 pages, with 5 SOURCE NEEDED markers.
  - A text search of both PDFs finds no occurrence of "OpenStax".
  - A rendered page of chapter Three was inspected, and its SOURCE NEEDED boxes
    set correctly.
