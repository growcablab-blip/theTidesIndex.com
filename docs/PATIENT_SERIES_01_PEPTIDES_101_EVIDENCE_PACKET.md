# Tides Patient Education Series — PDF 01: Peptides 101

## Scientific evidence packet

15 September 2026 · branch `phase-a-foundation` · research input for the
editorial team and the visual production system. This is not patient copy.

---

## 0. Read this first: what the repository can and cannot support

**How the foundations are sourced.** The index does not hold a general
biochemistry textbook or the English edition of a pharmacology textbook:

- SRC-120, Lehninger, is not held.
- SRC-122, Rang & Dale in English, is not held.
- SRC-121 is a partial Spanish sample of chapter 2 only.
- SRC-015, Kastin's *Handbook of Biologically Active Peptides*, is held but
  corrupted, and marked `replace`.

So every foundational statement below rests on one of:

- open-access (CC BY) peer-reviewed reviews;
- public-domain US government material;
- the Rang & Dale Spanish sample;
- the two held peptide-chemistry books, SRC-006 (Grant) and SRC-007 (Kruger &
  Albericio).

Each is recorded as `academic_reference` with primary trace
`cited_not_obtained`.

**What that means for the evidence.** For textbook biology this is the right
kind of evidence. "A peptide is a chain of amino acids" has no primary trial
behind it. It is consensus science, and a review or textbook is the proper
authority for it. "Prefer primary evidence" therefore applies mainly to pages
12 and 13.

**Three provenance states are used throughout.** They follow the index's
three-state model.

| Marker | Meaning |
|---|---|
| **SOURCE FACT** | An existing, word-checked claim in `data/seed/**`. It is citable now. |
| **HELD TEXT — EXTRACT** | The passage exists in a held, licence-checked source snapshot, but no Tides claim has been built from it yet. It must go through the extraction pipeline before it is printed. |
| **TIDES SYNTHESIS** | An existing editorial synthesis in `data/seed/syntheses/foundations.json`. It is a labelled inference that names the claims it rests on. |
| **SOURCE NEEDED** | No held source supports it. It may be true, but it is not printable as fact. |

**How maturity is classified.** The categories below are for foundational
concepts. They are not the compound evidence lanes.

| Label | Use |
|---|---|
| Established science | Uncontested textbook biology or chemistry |
| Established principle, with exceptions | True as a rule; the exceptions must travel with it |
| Convention | A naming or definitional choice, not a finding |
| Established practice | Describes how things are generally done, not how any product was made |
| Teaching analogy | No source; judged only on whether it misleads |
| Tides synthesis | An editorial inference from sourced facts, labelled as such |
| Evidence framework | A Tides classification standard, not a scientific finding |

---

## 1. Evidence packets

### PAGE 1 — Your body already uses peptides

**PATIENT QUESTION.** Are peptides something foreign, or something my body
already has?

**CORE TAKEAWAY.** The human body makes many peptides and uses them in its own
work, including:

- as hormones;
- as signals in the nervous system;
- as part of its built-in defence against microbes.

**SCIENTIFIC EXPLANATION.**

- **Hormones.** Polypeptide and protein hormones are one of several hormone
  classes. The others include steroids and amino-acid derivatives. They act by
  binding receptors on target cells.
- **Neuropeptides.** In the classical account, these are made as longer
  precursor chains (prepropeptides) and cut by enzymes into active peptides.
  They are stored in dense-core vesicles and released when the cell is active.
  The review's own authors note that newer findings challenge parts of this
  account.
- **Host-defence peptides.** These are part of innate immunity, and are usually
  made as precursor proteins that are cut to release the mature peptide. One
  example: the human cathelicidin precursor hCAP18 is cleaved to release LL-37.
- **Storage and release.** Specialised secretory cells, such as pancreatic beta
  cells, store their products in granules and release them on stimulation.
- **Breakdown.** The body also breaks its peptides down with enzymes. One
  review's example is endogenous GLP-1, which the enzyme DPP-4 inactivates
  rapidly.

The key point for the editorial team: the body does not assemble most of its
peptides one amino acid at a time. It usually makes a larger precursor and cuts
it. This is the first place where "natural" and "laboratory" production differ
(see page 10).

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-156 | Hiller-Sturmhöfel S, Bartke A. "The endocrine system: an overview." *Alcohol Health & Research World* 22:153–164, 1998. PMID 15706790. Public domain. | What Are Hormones? > Mechanisms of Action, para 1 (hormone classes); para 3 (peptide hormones act at the cell surface) | Para 3 is SOURCE FACT SIG-03 and END-15. Paras 1–2 (the classes) are SOURCE FACT END-14. |
| SRC-152 | Hevesi Z, Hökfelt T, Harkany T. "Neuropeptides: the evergreen jack-of-all-trades…" *BioEssays* 47:e202400238, 2025. DOI 10.1002/bies.202400238 | Neuropeptide Metabolism: The Classical Concepts, paras 1 and 3 | SOURCE FACT END-03, END-04 |
| SRC-153 | Wang G. "Human antimicrobial peptides and proteins." *Pharmaceuticals* 7:545–594, 2014. DOI 10.3390/ph7050545 | 1. Introduction, para 1; 2.1 Human Defensins, para 1 | SOURCE FACT END-06, END-07 |
| SRC-154 | Alford MA et al. "Cathelicidin host defense peptides and inflammatory signaling." *Front Microbiol* 11:1902, 2020. DOI 10.3389/fmicb.2020.01902 | Regulation of Cathelicidin Expression, para 1 | SOURCE FACT END-08 |
| SRC-151 | Ahmadi SM, Perez ML, Guardia CM. "Secretion of placental peptide hormones." *Front Endocrinol* 16:1584303, 2025. DOI 10.3389/fendo.2025.1584303 | How does secretion of placental peptide hormones happen?, para 1 | SOURCE FACT END-05 |
| SRC-143 | Wang L et al. "Therapeutic peptides: current applications and future directions." *Signal Transduct Target Ther* 7:48, 2022. DOI 10.1038/s41392-022-00904-4 | Therapeutic peptides in the treatment of diabetes mellitus, para 1 | SOURCE FACT END-09. Do not quote the neighbouring sentences: the packet notes an error there. |
| SRC-161 | Apostolopoulos V et al. "A global review on short peptides." *Molecules* 26:430, 2021. DOI 10.3390/molecules26020430 | Abstract (peptides act as signalling entities across all domains of life) | SOURCE FACT SIG-14. The abstract's first sentence is not adopted. |

**EVIDENCE MATURITY.** Established science, at review level.

**IMPORTANT NUANCE.**

- "Uses peptides" covers several jobs: signalling, defence, and structural or
  intracellular roles. It is not only "messages".
- Not every hormone is a peptide. Steroids and amino-acid-derived hormones
  work differently, and the classic account says they can enter cells.
- The body tightly regulates amount, place and timing. Feedback loops keep
  hormone systems within bounds (END-13).
- Where the body's peptides are broken down depends on the peptide and tissue.
  The lysosome statement (END-04) applies to neuropeptides only.
- **Tides synthesis SYN-BODY-01:** that the body makes a peptide does not, by
  itself, show what a product containing it will do.

**DO NOT SAY.**

- "Peptides are natural, so they're safe."
- "Your body makes it, so supplementing it just restores what's missing."
- "All hormones are peptides."
- "Peptides tell your body to heal."
- "As we age we lose our peptides." No held source supports a general decline
  claim.

**OPTIONAL ANALOGY.** The body already has an internal postal system; peptides
are one kind of letter it sends. Keep it light; page 5 carries the message
idea.

**OPTIONAL VISUAL.** A human silhouette with three labelled zones, drawn as
classes with no product names:

- hormone-releasing glands;
- the brain and nerves (neuropeptides);
- a barrier surface such as skin or gut lining (defence peptides).

A small inset shows a long precursor chain with scissors cutting out a short
active peptide.

---

### PAGE 2 — What is an amino acid?

**PATIENT QUESTION.** What are peptides made of?

**CORE TAKEAWAY.** Amino acids are small molecules that share a common core and
differ by a side chain. Living things build peptides and proteins from a
standard set of 20 of them.

**SCIENTIFIC EXPLANATION.**

- Each genetically encoded amino acid has a constant backbone: an amino group,
  a carboxyl (acid) group, and a central alpha carbon.
- A variable side chain is attached to that carbon. The side chain is what makes
  one amino acid different from another.
- The side chain decides whether the amino acid is hydrophilic or hydrophobic,
  and whether it is charged or neutral. Charge also depends on pH, but no held
  source states that, so do not add it.
- The genetically encoded set of 20, the "canonical set", is described in the
  literature as an alphabet.
- The same source paragraph notes two additions in some lineages:
  selenocysteine, a 21st, and pyrrolysine, a 22nd. Pyrrolysine is not found in
  humans; the source places it in archaea and bacteria.
- Laboratory-made peptides can also contain amino acids outside the genetic
  code, such as D-amino acids and other non-coded residues (PK-14; Apostolopoulos
  2021, section 4).

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-165 | Brown SM, Mayer-Bacon C, Freeland S. "Xeno amino acids: a look into biochemistry as we do not know it." *Life* 13:2281, 2023. DOI 10.3390/life13122281 | 1. Introduction, para 2 (the alphabet of 20; Sec and Pyl); para 5, Box 1 (backbone and side chain) | FND-10, FND-09 and FND-21 (Sec/Pyl) are SOURCE FACT. |
| SRC-166 | Idrees M et al. "Multimodal role of amino acids in microbial control and drug development." *Antibiotics* 9:330, 2020. DOI 10.3390/antibiotics9060330 | 7. Amino Acids as Solubility Enhancing Agents, para 13 | SOURCE FACT FND-11 |
| SRC-143 | Wang L et al. 2022 (as above) | Chemical modification… > Backbone modification of peptides | SOURCE FACT PK-14 (non-natural and D-amino acids) |
| SRC-161 | Apostolopoulos V et al. 2021 (as above) | Section on analogue design with non-coded α-amino acid residues | Not extracted: not in Section E, and PK-14 and ORG-11 already support non-natural building blocks. |

**EVIDENCE MATURITY.** Established science.

**IMPORTANT NUANCE.**

- "20" is the canonical genetic set, not the total number of amino acids that
  exist. Labs use many more.
- Amino-acid *derivatives* can be hormones in their own right (SRC-156). An
  amino acid is not a small peptide.
- The evolutionary-history clause in FND-10 is the authors' interpretation.
  Use the alphabet framing without it.

**DO NOT SAY.**

- "There are only 20 amino acids."
- "Amino acids are peptides."
- "Taking amino acids is like taking peptides."
- Any nutrition claim, such as essential amino acids or protein intake. None
  is sourced in this packet, and all are out of scope.

**OPTIONAL ANALOGY.** Beads that share the same clasp on both ends, but each
bead has a different charm hanging off it. The clasp is the backbone; the charm
is the side chain.

**OPTIONAL VISUAL.** One amino acid drawn as a simple shape: a common "core"
block with a variable "tag". Show three or four tags in different shapes and
colours to convey variety. Do not draw chemical structures.

---

### PAGE 3 — What is a peptide?

**PATIENT QUESTION.** So what exactly is a peptide?

**CORE TAKEAWAY.** A peptide is a chain of amino acids joined by peptide bonds.
Peptides are shorter than proteins, but where "peptide" ends and "protein"
begins is a naming convention that sources set differently.

**SCIENTIFIC EXPLANATION.**

- **The bond.** Amino acids are linked by amide bonds between the carboxyl group
  of one and the alpha-amino group of the next; this is the "peptide bond".
  Forming it is a condensation reaction that releases water. In laboratory
  synthesis an activating reagent is usually needed.
- **Peptide versus protein.** Both are made of amino acids; peptides are the
  smaller molecules.
- **Where the boundary sits.** Definitions set it in different places:
  - NHGRI: 2–50 amino acids is a peptide; 51 or more is a polypeptide.
  - One 2026 review: from 2 residues up to an arbitrary cut-off, typically
    below 50 or 100.
  - One 2021 review: published limits of under 30, under 50, or up to 100.
  - Nugrahadi et al. cite yet another convention.
- **Structure.** Short peptides generally lack a fixed 3-D shape, while proteins
  usually fold into one. Some peptides are held in shape by disulfide bridges
  and other internal interactions. FND-05 and FND-16 must be used together
  because FND-16 is more absolute.
- **Why size still matters.** Chemical synthesis of peptides under about 50
  residues is relatively routine. Longer chains are harder, especially at
  scale.

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-164 | National Human Genome Research Institute, Talking Glossary: "Peptide" (credit line required). Public domain. | genetics-glossary/Peptide > Definition | SOURCE FACT FND-04 |
| SRC-160 | López-López E et al. "Exploring and expanding the chemical multiverse of peptides." *Chem Sci* 17:1461–1479, 2026. DOI 10.1039/d5sc04465k | The size of the chemical space of peptides, para 2 | SOURCE FACT FND-01 |
| SRC-161 | Apostolopoulos V et al. 2021 | 3. Short Peptides: Definition, para 1 | SOURCE FACT FND-02 |
| SRC-145 | Nugrahadi PP et al. "Designing formulation strategies for enhanced stability of therapeutic peptides in aqueous solutions." *Pharmaceutics* 15:935, 2023. DOI 10.3390/pharmaceutics15030935 | 1. Introduction, para 3; §3 para 2 | SOURCE FACT FND-03, FND-05, FND-16 |
| SRC-162 | Duengo S et al. "Epimerisation in peptide synthesis." *Molecules* 28:8017, 2023. DOI 10.3390/molecules28248017 | 2.1 Activation of Carboxylic Groups…, para 1 | SOURCE FACT FND-06, FND-07 |
| SRC-143 | Wang L et al. 2022 | Chemical synthesis of peptides, para 5 | SOURCE FACT FND-17 |
| — | Tides synthesis | `syntheses/foundations.json` | SYN-PEP-01 (the boundary is a convention) |

**EVIDENCE MATURITY.**

- The chain and the bond: established science.
- The peptide/protein boundary: convention.

**IMPORTANT NUANCE.**

- **Sources disagree on the numeric cut-off.** This is not an error to resolve.
  It is the finding. Never print a single number as "the" definition. If a
  number is shown, attribute it: "one US government glossary uses 50".
- **Insulin sits right on the line.** It is a 51-amino-acid peptide hormone
  (SRC-143, Introduction). It is widely called a peptide, yet under NHGRI's
  numbers it would be a "polypeptide". This is a good worked example of the
  convention, or a trap if a single cut-off is printed.
- **Short chains are not floppy by rule.** Some peptides are rigid, and some are
  ring-shaped (cyclic). SRC-161 discusses cyclic peptides.
- **Repository gaps.**
  - The N- and C-terminus and the word "residue" are SOURCE NEEDED. Avoid the
    terms, or source them first.
  - How measurement changes with chain length is SOURCE NEEDED.

**DO NOT SAY.**

- "A peptide is anything under 50 amino acids."
- "Peptides are mini-proteins" said as a rule. Say "shorter chains", not
  "smaller versions of proteins".
- "Peptides are simpler, so they're gentler."
- "Peptides are just protein fragments." Many are made as fragments of
  precursors, but the phrase implies all peptides are breakdown products. See
  the nuance on page 1.

**OPTIONAL ANALOGY.** Beads on a string. Two beads is the shortest peptide;
there is no natural point where a necklace becomes a rope, so scientists pick
one.

**OPTIONAL VISUAL.** A horizontal size scale:

1. one bead (amino acid);
2. a short string (peptide);
3. a long folded string (protein).

Mark the peptide/protein transition with a dashed, deliberately fuzzy line
labelled "where scientists draw the line varies". The existing web illustration
`chain-scale` in `src/components/illustrations/biology.tsx` already does this
and can be reused.

---

### PAGE 4 — Amino acids are like letters; peptides are like short words

**PATIENT QUESTION.** Why does the order of amino acids matter?

**CORE TAKEAWAY.** The order of amino acids in a chain (its sequence) defines
the peptide. A very small change in sequence can change how a receptor
recognises it.

**SCIENTIFIC EXPLANATION.**

- The amino acid sequence is the chain's primary structure.
- In proteins, the sequence carries the information for folding into a working
  shape (the Anfinsen principle). Cellular folding can involve helper proteins,
  so avoid "always folds by itself".
- **Receptor specificity can hinge on single residues.** Rang & Dale's
  illustration uses angiotensin: flipping one amino acid from its L to its D
  form, or deleting one residue, can abolish activity because the receptor no
  longer recognises it. This is an example of what can happen, not a rule for
  every change.
- **The alphabet framing is sourced.** SRC-165 calls the canonical 20 an
  "alphabet". The *word* extension is an editorial analogy.

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-167 | Morris R, Black KA, Stollar EJ. "Uncovering protein function: from classification to complexes." *Essays Biochem* 66:255–285, 2022. DOI 10.1042/ebc20200108 | Classifying protein function, para 1 | SOURCE FACT FND-12 |
| SRC-168 | Muñoz V, Cerminara M. "When fast is better: protein folding fundamentals…" *Biochem J* 473:2545–59, 2016. DOI 10.1042/bcj20160107 | BACKGROUND, para 1 | SOURCE FACT FND-14 |
| SRC-165 | Brown SM et al. 2023 | 1. Introduction, para 2 | SOURCE FACT FND-10 (the alphabet) |
| SRC-121 | Ritter JM et al. *Rang y Dale. Farmacología*, 10th ed. (Spanish), Elsevier España 2024 — publisher sample, ch. 2 | ch. 2, p. 7, "Especificidad de los fármacos" | SOURCE FACT RECEPT-005. It is paraphrased from the Spanish; re-check against the English SRC-122 when obtained. |

**EVIDENCE MATURITY.**

- Sequence defines the molecule: established science.
- Single-residue sensitivity: established principle, with exceptions.
- Letters and words: teaching analogy.

**IMPORTANT NUANCE.** Where the analogy breaks:

1. **Meaning is not in the spelling alone.** A peptide's effect comes from its
   3-D shape and chemistry meeting a receptor. It also depends on which cell
   "reads" it (page 8).
2. **Not every one-letter change destroys function.** Some changes are made
   deliberately to keep function while improving stability (PK-14).
3. **Lab peptides can use letters outside the alphabet** (page 2).
4. **A long word is not automatically a protein.** The boundary is conventional
   (page 3).

**DO NOT SAY.**

- "Peptides are words your cells read like instructions." That wording
  conflates peptides with DNA/RNA, which really are read as code.
- "Change one letter and it stops working" as a universal rule.
- "Peptides are the body's language" when used to imply peptides direct
  everything.

**OPTIONAL ANALOGY.** Letters → words is acceptable if the page says the analogy
is about *order*, not *reading*. A stronger variant: same letters in a different
order make a different word (an anagram), so the same amino acids in a
different order make a different peptide. This is true by definition from
FND-12.

**OPTIONAL VISUAL.** Two short bead chains made of identical beads in a
different order, labelled "different peptides". A third chain has one bead
swapped; show a receptor outline that no longer matches it.

**RECOMMENDATION.** Do not give this its own page. Merge it into page 3 as the
visual of the chain (see section A).

---

### PAGE 5 — Peptides can act as biological messages

**PATIENT QUESTION.** What do peptides actually do?

**CORE TAKEAWAY.** Many of the body's peptides work as chemical signals. One
cell releases them, and they change the activity of other cells that carry a
matching receptor. Not every peptide works this way.

**SCIENTIFIC EXPLANATION.**

- **Target cells.** A hormone's target cells are those carrying receptors for
  it.
- **The receiving cell responds.** Binding triggers a cascade of reactions
  inside the target cell that modifies its function. The response is produced
  by the receiving cell's own machinery. SIG-02 supports this only implicitly,
  so phrase it as "the receiving cell responds", not "the peptide carries
  instructions".
- **How far signals travel.** Endocrine signals travel in the blood to distant
  cells. Cells also signal locally through autocrine, paracrine, intracrine and
  juxtacrine communication. Plain definitions of paracrine and autocrine are
  SOURCE NEEDED; Tse & Wong only describe paracrine molecules acting on
  neighbouring islet cells.
- **Class-level roles.** A 2022 review describes therapeutic peptides as
  commonly acting as hormones, growth factors, neurotransmitters, ion-channel
  ligands or anti-infectives.

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-156 | Hiller-Sturmhöfel & Bartke 1998 | What Are Hormones?, para 1 | SOURCE FACT SIG-01, SIG-02 |
| SRC-155 | Tse LH, Wong YH. "GPCRs in autocrine and paracrine regulations." *Front Endocrinol* 10:428, 2019. DOI 10.3389/fendo.2019.00428 | Introduction, para 1; GPCRs for Bridging the Autocrine/Paracrine Network…, para 1 | SOURCE FACT SIG-04, SIG-06 |
| SRC-143 | Wang L et al. 2022 | Therapeutic peptides: advantages and drawbacks, para 1 | SOURCE FACT PK-08 |
| SRC-161 | Apostolopoulos V et al. 2021 | Abstract | SOURCE FACT SIG-14 (peptides act as signalling entities); SIG-15 (some peptide drugs cross membranes or reach intracellular targets) |
| SRC-153 | Wang G 2014 | 1. Introduction, para 1 | SOURCE FACT END-06 (a non-messenger role: defence) |

**EVIDENCE MATURITY.**

- Peptides as signals: established science.
- "Many, not all": established principle, with exceptions.

**IMPORTANT NUANCE.**

- **Not all peptides are messengers.** Antimicrobial and host-defence peptides
  act against microbes (END-06). Internal index records describe thymosin
  beta-4 as the main actin-sequestering peptide *inside* mammalian cells: a
  structural and intracellular role, not a message.
  - Source: claim TB4-001 in `data/seed/evidence/thymosin-beta-4.json`
    (summarised in `docs/TB500_THYMOSIN_BETA4_EVIDENCE_REPORT.md` §1).
- **Not all messengers are peptides.** Steroids and small molecules are
  messengers too.
- **A message does not have a fixed meaning.** The receiving cell decides the
  response (SIG-06, SYN-SIG-01).
- **The metaphor must not imply that a peptide carries or delivers
  instructions.**

**DO NOT SAY.**

- "Peptides are messengers that tell cells what to do."
- "Peptides send instructions to heal, burn fat, build muscle…"
- "All peptides are signalling molecules."
- "Peptides are the body's master regulators."

**OPTIONAL ANALOGY.** A doorbell: pressing it doesn't open the door; whoever is
inside decides what to do. This captures "the receiving cell responds" better
than "letter with instructions".

**OPTIONAL VISUAL.** Cell A releases small dots. Cell B, which has matching
receivers, lights up. Cell C, which has none, does not. A second inset shows
two travel modes: via the bloodstream (far) and to a next-door cell (near).

---

### PAGE 6 — Cells receive messages through receptors

**PATIENT QUESTION.** How does a cell "hear" a peptide?

**CORE TAKEAWAY.** Signalling peptides act by binding receptors, which are
proteins on the cell that recognise particular messengers. When a receptor is
activated it changes shape and sets off a chain of events inside the cell.

**SCIENTIFIC EXPLANATION.**

- **Binding comes first.** For most drugs and messengers, an effect requires
  binding to a specific cellular component. In its pharmacological sense,
  "receptor" means a protein whose role is to recognise and respond to the
  body's own chemical signals.
- **Receptors are one kind of target among several.** Drug targets are grouped
  into:
  - receptors: GPCRs, ion channels, catalytic receptors, nuclear hormone
    receptors;
  - enzymes;
  - transporters;
  - other proteins.
- **Where peptide hormones act.** The 1998 overview states that polypeptide
  hormones cannot enter cells and act on cell-surface receptors.
- **GPCRs.** They form the largest receptor superfamily, with over 800 members
  (Culhane 2015). Ligand binding changes the receptor's shape in its membrane
  region and activates a G protein inside the cell.
- **Peptide receptor families.** All 15 family B (secretin-family) GPCRs bind
  peptide hormones, and those ligands are 27–141 residues long. Class A also
  includes peptide receptors.

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-121 | *Rang y Dale* 10th ed. (Spanish sample) | ch. 2, pp. 6–7 | SOURCE FACT RECEPT-001, RECEPT-002 |
| SRC-171 | Alexander SPH et al. "The Concise Guide to PHARMACOLOGY 2025/26: Introduction and Other Protein Targets." *Br J Pharmacol* 182 Suppl 1:S1–S23, 2025. DOI 10.1111/bph.70229 | Introduction | SOURCE FACT REC-01 |
| SRC-170 | Alexander SPH et al. "Concise Guide 2025/26: G protein-coupled receptors." *Br J Pharmacol* 182 Suppl 1:S24–S151. DOI 10.1111/bph.70230 | Introduction | SOURCE FACT REC-27 |
| SRC-157 | Culhane KJ, Liu Y, Cai Y, Yan EC. "Transmembrane signal transduction by peptide hormones via family B GPCRs." *Front Pharmacol* 6:264, 2015. DOI 10.3389/fphar.2015.00264 | Introduction, para 1 | SOURCE FACT SIG-07 (activation), SIG-16 (over 800 GPCRs), SIG-17 (all family B receptors bind peptide hormones). |
| SRC-156 | Hiller-Sturmhöfel & Bartke 1998 | Mechanisms of Action, para 3 | SOURCE FACT SIG-03 |
| SRC-172 | Watts SW, Townsend RR, Neubig RR. *Am J Hypertens* 37:248–260, 2023. DOI 10.1093/ajh/hpad121 | Affinity: common ground for drugs | SOURCE FACT REC-02 |

**EVIDENCE MATURITY.**

- Receptor binding: established science.
- "Peptide hormones act at the cell surface": established principle, with
  exceptions.

**IMPORTANT NUANCE.**

- **SIG-03 is categorical and from a 1998 general overview.**
  - Some peptides do enter cells. Cell-penetrating peptides are a studied class
    (SRC-161 §7.1; SRC-146 "Cell-penetrating peptides").
  - Some peptides act inside cells, such as thymosin beta-4.
  - Softening to "generally act at the cell surface" is defensible because
    PK-10 lists poor membrane permeability as a class trait.
  - Mark the softening as editorial and keep the patient page scoped to
    *signalling* peptides.
- **Not all peptide receptors are GPCRs.** "Most peptide hormones act through
  GPCRs" is **SOURCE NEEDED**. Do not print it. Say "receptors", not "GPCRs".
- **Receptors are not permanently fixed.** They can desensitise and be removed
  from the surface after prolonged stimulation (REC-20, SIG-12). This matters
  for page 7's lock image.

**DO NOT SAY.**

- "Every cell has receptors for every peptide."
- "Peptides can't get into cells" said as a universal fact.
- "Most peptides work through G-protein receptors."
- "Receptors are like antennas that always pick up the signal."

**OPTIONAL ANALOGY.** A receiver or docking point built into the cell's outer
wall. The house illustration key is `message-receiver`.

**OPTIONAL VISUAL.** A cross-section of a cell membrane with a receptor spanning
it. Outside, a peptide docks; inside, a spark or relay ripples outward. Do not
label the relay "G protein" for patients.

---

### PAGE 7 — Simple peptide + receptor: key and lock

**PATIENT QUESTION.** Why does a peptide affect some cells and not others?

**CORE TAKEAWAY.** Receptors are selective: a messenger has to fit a receptor to
bind it, and binding is not the same as switching the receptor on. The fit is
selective but never perfectly exclusive.

**SCIENTIFIC EXPLANATION.**

- **No held source uses the lock-and-key analogy.** The full foundations
  snapshot set was searched, and the phrase does not occur.
- **Sourced principles the analogy must respect:**
  1. A molecule must bind (have affinity for) its target before acting
     (REC-02, RECEPT-001).
  2. Binding (affinity) and activation (efficacy) are distinct properties
     (REC-03, RECEPT-006). They cannot be read off separately from binding
     data (REC-06, Higham & Colquhoun 2024).
  3. Agonists switch receptors on. Antagonists occupy the site without
     activating it and block agonists. Partial agonists produce less than a
     full response even when bound (RECEPT-003, REC-04, REC-05, RECEPT-007).
  4. Specificity is reciprocal but never absolute. At higher amounts, many
     drugs act on targets beyond the main one (RECEPT-004). Anaesthetic
     research finds agents act on several targets (REC-25; that is an
     extrapolation beyond anaesthetics).
  5. Tiny structural changes can abolish recognition (RECEPT-005).
  6. Receptors change shape when activated (SIG-07). Some receptors are partly
     active with nothing bound (REC-11).
  7. Labels like "agonist" describe behaviour in a test system, not a fixed
     property (TIDES SYNTHESIS SYN-REC-01; REC-13; RECEPT-007).

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-121 | *Rang y Dale* 10th ed. (Spanish sample) | ch. 2, pp. 7–8, 13–14 | SOURCE FACT RECEPT-003 to RECEPT-007 |
| SRC-172 | Watts et al. 2023 | Agonism: EFFICACY; Antagonism | SOURCE FACT REC-04, REC-05 |
| SRC-173 | Liu S, Anderson PJ, Rajagopal S, Lefkowitz RJ, Rockman HA. "G protein-coupled receptors: a century of research and discovery." *Circ Res* 135:174–197, 2024. DOI 10.1161/circresaha.124.323067 | Early history of receptor biology | SOURCE FACT REC-03 |
| SRC-169 | Higham JP, Colquhoun D. "The affinity–efficacy problem." *R Soc Open Sci* 11:240487, 2024. DOI 10.1098/rsos.240487 | A simple agonist mechanism | SOURCE FACT REC-06 |
| SRC-177 | Michel MC, Michel-Reher MB, Hein P. "A systematic review of inverse agonism at adrenoceptor subtypes." *Cells* 9:1923, 2020. DOI 10.3390/cells9091923 | 1. Introduction | SOURCE FACT REC-13 |
| — | Tides synthesis | `syntheses/foundations.json` | SYN-REC-01 |

**EVIDENCE MATURITY.**

- The receptor principles: established science.
- Lock and key: teaching analogy, with no source.

**IMPORTANT NUANCE.** A simple lock-and-key picture implies four false things:

| Implied by the picture | What the sources say |
|---|---|
| One key, one lock | Specificity is never absolute (RECEPT-004). One ligand can activate more than one receptor type (Tse & Wong: ligands in the pancreatic islet). |
| Fitting means opening | Antagonists fit without activating, and partial agonists half-turn (RECEPT-003, RECEPT-007). |
| The lock is rigid and passive | Receptors change shape (SIG-07), can be partly on by themselves (REC-11), and desensitise (REC-20). |
| Opening the lock always gives the same result | The result depends on the cell and the receptor subtype (SIG-05, SYN-SIG-01). |

**DO NOT SAY.**

- "Each peptide fits only one receptor."
- "If it fits, it works."
- "Peptides are perfectly targeted, so they have no side effects."
- "Peptides only do exactly what they're designed to do."
- "Peptides are more specific than drugs" said as an absolute. PK-09 is a
  class-level *relative* comparison from one review, and does not apply to
  every peptide.

**OPTIONAL ANALOGY.** A key that must fit *and turn*:

- some keys fit and turn fully;
- some turn partway;
- some fit and jam the lock without turning, which blocks the right key;
- a key cut for one lock can sometimes open a similar one.

If that is too complex for one page, use "docking and switching on" instead of
lock and key.

**OPTIONAL VISUAL.** A three-panel strip, reusing the house `receptor states`
figure in `biology.tsx`:

1. fits and switches on (full glow);
2. fits and switches partly on (dim glow);
3. fits but blocks (no glow, with a second key waiting outside).

**RECOMMENDATION.** Merge with page 6 (see section A).

---

### PAGE 8 — Different peptides can carry different messages

**PATIENT QUESTION.** If peptides are all chains of amino acids, why do they do
different things?

**CORE TAKEAWAY.** Different peptides bind different receptors. Even the same
signal can mean different things to different cells, depending on which
receptors each cell has and what other signals it is receiving.

**SCIENTIFIC EXPLANATION.**

- **Different sequences, different shapes, different receptor preferences** —
  see pages 3, 4 and 7.
- **One signal, different effects.** A single paracrine signal can activate some
  cell types and inhibit others through different GPCR subtypes. The source
  hedges this with "could"; keep the hedge.
- **Cells combine signals.** Cells express many receptors and integrate
  circulating and local signals.
- **Receptors shape the outcome.** One review argues that the diversity of
  receptors, in place and over time, is the chief determinant of what a
  messenger does. That is the authors' interpretation, so attribute it.
- **Context of use.** The same molecule can serve endocrine, paracrine,
  autocrine or synaptic roles.
- **Different internal pathways.** One receptor can activate different internal
  pathways depending on what binds it (biased agonism).

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-155 | Tse & Wong 2019 | GPCRs for Bridging the Autocrine/Paracrine Network…, para 1; GPCRs and the Hierarchy…, para 1 | SOURCE FACT SIG-05, SIG-06, END-12 |
| SRC-152 | Hevesi et al. 2025 | Neuropeptide Receptors: GPCRs With Many Modalities, para 1 | SOURCE FACT END-11 |
| SRC-158 | Cho YY et al. "GPCR signaling and pharmacology in metabolism." *Biomolecules* 15:291, 2025. DOI 10.3390/biom15020291 | 1. Introduction, para 2 | SOURCE FACT SIG-09 |
| SRC-173 | Liu et al. 2024 | Biased Agonism | SOURCE FACT REC-16 |
| SRC-153 | Wang G 2014 | §3.7, para 5 | SOURCE FACT END-10 (effect depends on context, concentration, proteases and metabolic state) |
| — | Tides synthesis | `syntheses/foundations.json` | SYN-SIG-01 |

**EVIDENCE MATURITY.**

- Different receptors give different effects: established science.
- Context-dependence of effect: established principle.
- The integration of these points: Tides synthesis SYN-SIG-01.

**IMPORTANT NUANCE.**

- **"Carry different messages" risks saying the meaning lives in the peptide.**
  It is more accurate to say the peptide binds a receptor and the receiving
  cell determines the outcome.
- **Amount matters.** END-10 and RECEPT-004 say effects change with
  concentration.
- **Signals are also switched off.** Receptors are desensitised, arrestins stop
  G-protein signalling, and peptides are broken down by enzymes (SIG-12,
  SIG-13, END-04, END-09). A message model with no "off" misleads.

**DO NOT SAY.**

- "Each peptide has one job."
- "Peptide X is the [healing / fat-burning / sleep] peptide."
- "More of the message means more of the effect."
- "Peptides keep working until the job is done."

**OPTIONAL ANALOGY.** The same ringtone means "answer" to one person and
"ignore" to another, and every phone eventually stops ringing.

**OPTIONAL VISUAL.**

- Left: one kind of dot reaching two different cells with different receivers.
  One brightens and one dims.
- Right: several kinds of dot converging on one cell, whose response is a
  blend.
- A small "off" icon shows the receptor being pulled inside the cell.

---

### PAGE 9 — Broad biological areas involving peptide signalling

**PATIENT QUESTION.** Where in the body does peptide signalling matter?

**CORE TAKEAWAY.** Sources describe the body's peptides in hormone systems, in
the nervous system, in immune defence, in pregnancy, and in regulating things
like blood sugar, calcium balance and blood vessels.

**SCIENTIFIC EXPLANATION.** These are the areas the held sources name. Use only
these unless more are extracted.

| Area | What the source says | Tides ID | State |
|---|---|---|---|
| Hormone systems (hypothalamus, pituitary, target glands) | Pituitary hormones regulate other glands; feedback loops keep hormone activity within bounds | SRC-156, Regulation of Hormone Activity para 2; The Anterior Pituitary | SOURCE FACT END-13. Pituitary detail is HELD TEXT — EXTRACT. |
| Nervous system | Neuropeptides are made, stored and released by neurons, and act on diverse receptors | SRC-152 | SOURCE FACT END-03, END-11 |
| Innate immune defence | Host-defence and antimicrobial peptides | SRC-153; SRC-154 | SOURCE FACT END-06, END-07, END-08 |
| Pregnancy and placenta | Placental peptide hormone secretion | SRC-151 | SOURCE FACT END-05 |
| Blood glucose, calcium balance, blood vessel dilation, heart contraction | Family B receptors for peptide hormones are grouped by physiological role, including insulin secretion, vasodilation, Ca²⁺ homeostasis and cardiac contractility | SRC-157, Introduction, paras 3 and 5 | SOURCE FACT END-16. Table 1 was not used, so its drug and disease columns are not carried; "pain signalling" has no extracted source and is dropped. |
| Metabolism (gut hormone example) | Endogenous GLP-1 is rapidly degraded by DPP-4 | SRC-143 | SOURCE FACT END-09 |

**EVIDENCE MATURITY.** Established science.

**IMPORTANT NUANCE.**

- This page is the highest-risk page for **implied product claims**. A list of
  body areas next to "peptides" reads to a patient as "peptides can fix these".
  The page must describe the body's own signalling only.
- **Growth factors as a class** are SOURCE NEEDED.
- **"Tissue repair", "healing", "ageing", "longevity", "muscle", "fat loss",
  "sleep", "cognition" and "skin"** have no general physiological source in
  the foundations set. Where they appear in the repository, it is in compound
  records, mostly from practitioner or preclinical evidence. They must not
  appear here.
- **An area where a natural peptide acts is not an area where a product has
  been shown to work** (SYN-BODY-01).

**DO NOT SAY.**

- "Peptides support immunity, metabolism, brain health, and recovery."
- Any list framed as benefits.
- Any area paired with an icon or verb that implies an outcome, such as
  "boost" or "restore".

**OPTIONAL ANALOGY.** None needed.

**OPTIONAL VISUAL.** A simple body map with neutral labels ("hormone glands",
"brain and nerves", "defence at body surfaces", "placenta", "blood sugar and
calcium control", "blood vessels"). There are no arrows *into* the body, and no
syringes or vials.

---

### PAGE 10 — Natural peptides versus laboratory-made peptides

**PATIENT QUESTION.** What's the difference between a peptide my body makes and
one made in a lab?

**CORE TAKEAWAY.** "Natural" and "lab-made" describe where a peptide came from,
not what it does or how safe it is.

**SCIENTIFIC EXPLANATION.**

**Where peptides for medicine and research come from.**

- Extraction from natural sources.
- Enzymatic synthesis.
- Fermentation.
- Recombinant DNA technology.
- Semisynthesis.
- Chemical synthesis, especially solid-phase peptide synthesis (SPPS, Merrifield
  1963).
- These are used alone or in combination, depending on how hard the peptide is
  to prepare.
- The review describes chemical synthesis as suited to short and medium-sized
  peptides, and recombinant production as useful for long or complicated ones
  (ORG-07, ORG-11). Its sentence calling a chemically made peptide a
  "recombinant peptide drug" was excluded as inconsistent.

**History.** Insulin was first isolated in the 1920s from animal pancreata.
Animal-derived insulins dominated for decades until recombinant insulin
replaced them.

**"Natural" is not only human.** Natural sources include animals, bacteria,
fungi, venoms, toxins and plants. Non-ribosomal peptides from bacteria and fungi
are an example, and some contain non-standard residues.

**A lab-made peptide can be any of these:**

| Kind | Source |
|---|---|
| **Sequence-identical** to a natural peptide ("synthetic oxytocin") | SRC-143, Introduction |
| **Modified analogue**: sequence changes, non-natural amino acids, or attached fatty acids or larger molecules to extend its time in the body | PK-13, PK-14; SRC-143 Introduction |
| **Fragment** of a natural peptide made on its own | Internal: TB-500 is residues 17–23 of thymosin beta-4, acetylated — claim TB500-001 |
| **Sequence not found in humans at all** | SRC-143, Introduction: peptide drugs "no longer simply hormone mimics" |

**How the product differs from the process.**

- **The body** usually makes peptides from gene-encoded precursors cut by
  enzymes (END-03, END-07).
- **Chemical synthesis** builds the chain step by step and yields a *crude
  mixture* that must be purified (SPPS-002, SPPS-004).
- **Recombinant crude product** can carry biological contaminants that chemical
  synthesis does not, such as DNA, RNA and unrelated proteins (ORG-10). This
  is the review's comparison; keep it attributed. The same review calls
  purification after chemical synthesis "relatively uncomplicated", which
  conflicts with PUR-003 (labour-intensive); that is recorded as a gap.

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-143 | Wang L et al. 2022 | Introduction, paras on insulin history and synthetic peptides; Natural peptides/hormones in the human body, para 1; Peptides identified from natural products; Chemical synthesis of peptides, paras 1 and 3; Peptide production by recombinant technology, paras 1–2 | SOURCE FACT ORG-01 to ORG-17 in `data/seed/learning/where-peptides-come-from.json`. Excluded passages and five recorded gaps are listed in that packet. |
| SRC-143 | Wang L et al. 2022 | PEGylation…; Backbone modification… | SOURCE FACT PK-13, PK-14 |
| SRC-152, SRC-153 | Hevesi 2025; Wang G 2014 | as page 1 | SOURCE FACT END-03, END-07 |
| SRC-006 | Grant GA (ed.). *Synthetic Peptides: A User's Guide*, 2nd ed., Oxford University Press, 2002 | ch. 3, pp. 95–96, 163 | SOURCE FACT SPPS-001, SPPS-002, SPPS-004 |
| Internal | TB-500 and thymosin beta-4 records (analytical identification: PMID 22962027; PMID 23084823) | `data/seed/evidence/tb-500.json` TB500-001 (fragment), TB500-003 (products not matching descriptions); `thymosin-beta-4.json` TB4-001 | Existing compound evidence. Use only as an unnamed illustration of "fragment" in patient copy, if at all. |
| — | Tides synthesis | `syntheses/foundations.json` | SYN-BODY-01 |

**EVIDENCE MATURITY.**

- Production routes: established science and practice, at review level.
- Natural does not equal safe: Tides synthesis.
- Identical, analogue or fragment: established science.

**IMPORTANT NUANCE.**

- **Identical sequence is not identical material.** A synthetic peptide with
  the right sequence still comes with process-related impurities unless they
  are removed and tested (SPPS-004, PUR-001, HPLC-003). Products sold under a
  peptide's name have been found not to match their described content (claim
  TB500-003; the TB-500 report §3 cites a 2023 French analysis, PMID 36482504).
- **Fragments and analogues are different molecules.** Evidence about the
  parent peptide does not automatically apply to them.
- **Chemical synthesis has limits.** It is routine for shorter chains and harder
  for long ones (FND-17). "Lab-made" is not one process.

**DO NOT SAY.**

- "Bioidentical."
- "Natural peptides are safer."
- "Synthetic peptides are artificial and dangerous."
- "Lab-made peptides are exact copies of what your body makes" said as a rule.
- "Since it's identical to your own, your body knows what to do with it."
- "Pure" as a synonym for "lab-made".

**OPTIONAL ANALOGY.** A recipe versus a meal: the same recipe (sequence) can be
cooked in different kitchens by different methods. What ends up on the plate
depends on the kitchen and on what was checked. Some chefs also change the
recipe on purpose.

**OPTIONAL VISUAL.** Three origin icons (body, other living things, laboratory)
feeding into a single chain. Below, three variants side by side:

- same chain;
- chain with one bead swapped or a tag attached;
- short piece of a longer chain.

---

### PAGE 11 — Why scientists make peptides in laboratories

**PATIENT QUESTION.** If the body makes peptides, why make them in a lab?

**CORE TAKEAWAY.** Scientists make peptides in laboratories:

- to study them;
- to use them as research tools and reference standards;
- to produce enough of a peptide reliably;
- to design changed versions that last longer or behave differently from the
  natural molecule.

**SCIENTIFIC EXPLANATION.**

- **Replacing animal sources.** Animal-derived insulin was replaced by
  recombinant insulin (ORG-02). The review's sentence saying supply could not
  meet demand was excluded as ambiguous, so "not enough natural supply" is
  **not** a sourced reason; do not print it.
- **Improving on natural sequences.** Drawbacks of natural peptides led to
  optimised, hormone-mimetic sequences (ORG-15, ORG-16).
- **Weaknesses of natural peptides.** These drove sequence optimisation and
  hormone-mimetic analogues (SRC-143, Natural peptides/hormones, para 1 — HELD
  TEXT — EXTRACT). As a class, peptides have poor membrane permeability and
  poor stability in the body (PK-10). Most peptide drugs are injected because
  digestive enzymes break peptides down (PK-11).
- **Design.** Researchers substitute non-natural amino acids at cleavage sites,
  or attach fatty acids or larger proteins to reduce kidney filtration and
  degradation (PK-13, PK-14).
- **Research use.** Peptides are made crude for antibody production or
  screening, and purified further for use as standards (PUR-002).
- **Feasibility.** SPPS made chemical production of shorter peptides relatively
  routine (FND-17; SRC-143, Chemical synthesis of peptides).
- **Two scales.** Small-scale custom synthesis and large-scale manufacture with
  process development are different activities (SPPS-006).

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-143 | Wang L et al. 2022 | Therapeutic peptides: advantages and drawbacks; Developments in peptide drug delivery; PEGylation…; Backbone modification… | SOURCE FACT PK-10, PK-11, PK-13, PK-14 |
| SRC-143 | Wang L et al. 2022 | Introduction; Natural peptides/hormones in the human body; Chemical synthesis of peptides, para 5; Peptide production by recombinant technology, paras 1 and 3 | SOURCE FACT ORG-02, ORG-07, ORG-11, ORG-12, ORG-15 |
| SRC-007 | Kruger G, Albericio F (eds). *Advances in the Discovery and Development of Peptide Therapeutics*, Future Science 2015; ch. 3 "Peptide manufacturing" (Saneii H) | printed pp. 46, 49 (file pp. 51, 54) | SOURCE FACT SPPS-006, PUR-002 |
| SRC-146 | Chen G et al. "Oral delivery of protein and peptide drugs…" *Theranostics* 12:1419, 2022. DOI 10.7150/thno.61747 | Conclusions and future perspectives, para 1 | SOURCE FACT PK-07. Carries reliability caveats; use only corroborated points. |

**EVIDENCE MATURITY.** Established science and practice, at review level.

**IMPORTANT NUANCE.**

- **"Why scientists make peptides" is not "why products are sold".** Making a
  peptide in a lab says nothing about whether it works for anything.
- **Both held reviews lean towards advocacy.** Attrition, meaning how often
  peptide candidates fail, is recorded as a gap: `no_current_reviewed_evidence`
  in `peptides-as-medicines.json`.
- **Approval counts conflict between reviews** (>240 vs >80, with different
  scopes). **Do not print a count.**
- **Oral approaches.** Many oral-delivery strategies were still clinically
  unvalidated as of 2022 (PK-18). This belongs to a later guide.

**DO NOT SAY.**

- "Scientists improved on nature."
- "Lab peptides are stronger or longer-lasting versions of your own" said as a
  rule.
- "Peptides are the future of medicine."
- "There are over X approved peptide drugs."

**OPTIONAL ANALOGY.** None needed. Four simple reason icons work better:

- study (magnifier);
- enough supply (stack);
- a reference to compare against (ruler);
- redesign (pencil on chain).

**OPTIONAL VISUAL.** Those four icons, each with a one-line neutral label.

---

### PAGE 12 — Simple preview of synthesis

**PATIENT QUESTION.** How does a lab actually make a peptide?

**CORE TAKEAWAY.** A common lab method builds the chain one amino acid at a time
on tiny beads. What comes off is a mixture, so it has to be purified and then
tested in several separate ways.

**SCIENTIFIC EXPLANATION.**

**Build.** In stepwise SPPS:

1. The first protected amino acid is anchored to insoluble resin.
2. Cycles of deprotection and coupling of the next protected amino acid build
   the sequence.
3. Excess reagents are washed away between steps.
4. The chain is cleaved from the resin.

**Crude product.** Incomplete steps leave deletion or truncated chains. Cleavage
can chemically modify some amino acids. Some sequences aggregate and couple
poorly.

**Purify.** By-products must be separated out, usually by preparative HPLC. How
far material is purified depends on its intended use.

**Test.** These are separate questions:

| Question | Method | What it does not show |
|---|---|---|
| How mixed is it (purity)? | HPLC | Identity or amount; a single peak can hide a co-eluting impurity |
| What is it (identity)? | Mass spectrometry | Amount |
| How much is there (quantity)? | Amino acid analysis | — |

No single technique is sufficient.

**Raw materials.** In well-run manufacturing, starting materials are specified,
quarantined and tested *before* use.

**Other routes.** Long peptides may be built in segments joined in solution.
Recombinant and other routes exist (page 10).

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| SRC-006 | Grant GA (ed.) 2002 | ch. 3, pp. 95–96 (fig. 3-1), 149, 163, 165 | SOURCE FACT SPPS-001 to SPPS-005 |
| SRC-006 | Grant GA (ed.) 2002 | ch. 4, pp. 222–224, 239, 243–244, 261–262, 284 | SOURCE FACT HPLC-001 to HPLC-007, ID-001, ID-002, CON-001, CON-002, PUR-005 |
| SRC-007 | Kruger & Albericio 2015, ch. 3 (Saneii) | printed pp. 46, 49, 50, 52, 53 | SOURCE FACT SPPS-006 to SPPS-008, PUR-002 to PUR-004 |
| SRC-163 | Elsayed YY, Kühl T, Imhof D. "Regulatory guidelines for the analysis of therapeutic peptides and proteins." *J Pept Sci* 31:e70001, 2025. DOI 10.1002/psc.70001 | Introduction, para 3 | SOURCE FACT FND-18 (identity, purity and activity) |
| SRC-143 | Wang L et al. 2022 | Chemical synthesis of peptides, para 1 (Merrifield 1963) | SOURCE FACT ORG-09, ORG-10 |

**EVIDENCE MATURITY.** Established practice. It describes the general method,
not how any product was made.

**IMPORTANT NUANCE.** The proposed chain, "amino acids → peptide chain →
purification → testing → finished material", has four accuracy problems:

1. **It omits the crude mixture.** That is the most important idea on the page,
   because it is the reason purification and testing exist.
2. **It places testing only at the end.** Testing also happens on raw materials
   (SPPS-008) and after purification.
3. **"Testing" reads as one pass/fail event.** Purity, identity and amount are
   different measurements, and none implies the others.
4. **"Finished material" hides several stages** that affect what reaches a
   patient. These include formulation, freeze-drying, sterile filling,
   sterility and bacterial endotoxin control.
   - Separate Tides quality packets exist for these: `lyophilization.json`,
     `sterility.json`, `bacterial-endotoxin.json`,
     `formulation-excipients.json`.
   - SRC-006 and SRC-007 do not describe fill/finish.

Also:

- SPPS is *a* common method, not *the* method.
- Grant is a 2002 text. Reagents and instruments have changed; the principle
  has not (SPPS-002 uncertainty note).
- Nothing held describes how any specific product sold today was made
  (`source_missing` gap in `peptide-synthesis-spps.json`).

**DO NOT SAY.**

- "Peptides are made to be 99% pure."
- "Lab testing confirms the peptide is safe."
- "Purity tells you it's the right peptide."
- "Every peptide goes through this process."
- Any purity percentage as a standard. The 98% figure in PUR-002 is for
  research standards only.

**OPTIONAL ANALOGY.** Building a bead necklace on a pegboard, then sorting out
the necklaces that came out wrong. The sorting and checking is most of the
work.

**OPTIONAL VISUAL.** Show five stages: building blocks → chain built step by
step → crude mixture (many chain lengths) → purified → checked with three
separate magnifiers (what / how pure / how much). Add a ghosted "and then…"
arrow pointing off-page to PDF 02.

**RECOMMENDATION.** Reduce this to a one-panel bridge. Do not make it a full
page (see section A).

---

### PAGE 13 — Not every peptide has the same evidence or purpose

**PATIENT QUESTION.** Does "it's a peptide" tell me whether it works?

**CORE TAKEAWAY.** No. Each peptide has its own body of evidence, which may come
from studies in people, from animal or cell studies, or only from practice
reports. What is known about one peptide, route or use does not transfer to
another.

**SCIENTIFIC EXPLANATION.**

**How Tides classifies evidence.** The model keeps these separate:

- source type;
- evidence type (human, preclinical, reference or opinion);
- verification status;
- regulatory status.

It gives no single numeric score. Public displays use three lanes: *Studied in
people*, *Studied in animals or cells*, and *Described in practice or reference
works* (`EVIDENCE_MODEL.md`; `PRODUCT_EXPERIENCE_V1_REPORT.md`).

**The range within the index's own records:**

- **Retatrutide.** Five registered human trials with published or registered
  results, from phase 1 to phase 3. Five are counted in
  `docs/RETATRUTIDE_DEEP_EVIDENCE_REPORT.md`, "Trials identified".
- **BPC-157.** No source held by the index reports a clinical trial. Reported
  effects come from laboratory or animal work and practitioner sources
  (`docs/BPC157_EVIDENCE_REPORT.md` §3; claim BPC-002).
- **TB-500 and thymosin beta-4.** Two different molecules. Evidence about one
  does not automatically apply to the other (TB-500 report §§1–3).

**Lab results do not simply transfer to bodies.**

- Receptor labels from lab tests are system-dependent (SYN-REC-01, RECEPT-007).
- Biased-agonist effects often cannot be predicted from lab profiles and must be
  tested in living systems (REC-17).
- Oral-delivery strategies that looked promising in the lab were not validated
  in large human trials as of 2022 (PK-18).

**Regulatory status** is secondary, date-stamped context (CLAUDE.md;
EVIDENCE_MODEL §4). Evidence must be judged on its own terms, globally.

**BEST SOURCES.**

| Tides ID | Source | Locator | State |
|---|---|---|---|
| Tides standard | `EVIDENCE_MODEL.md` §§1–7; `docs/EVIDENCE_GAP_STANDARD.md` (gap types incl. `human_evidence_not_established`) | — | Evidence framework |
| Internal | Retatrutide trial records: NCT03841630, NCT04143802, NCT04867785, NCT04881760, NCT06354660; Jastreboff 2023 *NEJM* 389:514; Sanyal 2024 *Nat Med* 30:2037 (held in `sources/`) | `data/seed/trials/retatrutide-trials.json` | Existing compound evidence (primary) |
| Internal | BPC-157 record (practitioner sources SRC-002, SRC-003, SRC-005) | `data/seed/evidence/bpc-157.json`, BPC-002 | Existing compound evidence |
| SRC-174 | Gundry J, Glenn R, Alagesan P, Rajagopal S. "A practical guide to approaching biased agonism at GPCRs." *Front Neurosci* 11:17, 2017. DOI 10.3389/fnins.2017.00017 | Abstract | SOURCE FACT REC-17 |
| SRC-146 | Chen G et al. 2022 | Mucolytic agents; Cell-penetrating peptides | SOURCE FACT PK-18 |
| — | Tides syntheses | SYN-REC-01, SYN-BODY-01 | TIDES SYNTHESIS |

**EVIDENCE MATURITY.**

- Evidence is specific to the peptide: evidence framework plus established
  scientific method.
- The contrast between records: primary and registry evidence (retatrutide)
  against an absence of human studies in held sources (BPC-157).

**IMPORTANT NUANCE.**

- **"No human study held by the index" is not "no human study exists".** It is
  also not "shown not to work" or "shown to be unsafe". It is an evidence gap,
  and the page must say so.
- **Human trial evidence is specific.** It applies to a particular population,
  outcome, formulation and route. It is not a blanket endorsement.
- **Approval (or its absence) is not a substitute** for reading the evidence,
  in either direction.
- **Naming compounds.** Doing so in PDF 01 would turn it into a catalog.
  Recommendation: describe the *range* without names. Keep the internal records
  as the editorial basis so the statement is backed.

**DO NOT SAY.**

- "Peptides are proven."
- "Peptides are experimental."
- "Research shows peptides can…"
- "FDA-approved means it works; unapproved means it doesn't."
- "Studies show" when the study was in animals or cells.
- "Clinically proven" about practitioner reports.

**OPTIONAL ANALOGY.** Three shelves in a library: studies in people, studies in
animals or cells, and reports from practice. Every peptide has its own set of
shelves, and some shelves are empty.

**OPTIONAL VISUAL.** The house `evidence-lanes` illustration: three lanes, and
several unnamed peptide tokens with differently filled lanes. One token is full
across the people lane; one has only the animals/cells and practice lanes
filled.

---

### PAGE 14 — Bridge into PDF 02: How Peptides Are Made

**PATIENT QUESTION.** What should I understand next?

**CORE TAKEAWAY.** How a peptide was made, purified and tested decides what is
actually in the material. That is a separate question from what the peptide
molecule can do.

**SCIENTIFIC EXPLANATION.** This page bridges the two volumes:

- **Molecule versus material.** PDF 01 establishes what a peptide *molecule* is
  and how signalling works. PDF 02 is about the *material*.
- **Why the distinction holds.** Synthesis produces mixtures, purification
  varies with purpose, and purity, identity and amount are separate
  measurements.
- **Product-specific routes are unknown.** No held source describes how any
  specific product was made.

**BEST SOURCES.** SPPS-002, SPPS-004, SPPS-006, PUR-002, HPLC-007, ID-007 (SRC-006;
SRC-007), and the `sequence-to-vial` quality pathway already in the index.

**EVIDENCE MATURITY.** Established practice.

**IMPORTANT NUANCE.**

- The bridge must not suggest that a good manufacturing process makes a peptide
  effective.
- It must not suggest that a certificate settles quality.

**DO NOT SAY.**

- "Quality peptides."
- "Pharmaceutical-grade" said as a verified status.
- "Know what you're getting." That reads as sourcing advice.

**OPTIONAL ANALOGY.** A recipe (the molecule) versus what's on the plate (the
material).

**OPTIONAL VISUAL.** A chain on the left turns into a vial silhouette on the
right, with a closed door between them labelled "PDF 02".

---

## A. Recommended scientific story order

**Change the sequence from 14 pages to 10.** Three reasons:

1. **Pages 4, 6/7 and 12/14 are not independent concepts.** The letters/words
   point is *why* page 3 matters. Receptors and lock-and-key are one mechanism.
   The synthesis preview is the bridge. Splitting them repeats ideas and
   thins the caveats.
2. **"Not every peptide has the same evidence" should come *before* the
   synthesis preview, not after.** It closes the biology arc: the body making
   it does not show what a product does, and evidence is peptide-specific.
   The volume can then end on the making step that opens PDF 02.
3. **"Natural vs lab-made" and "why labs make peptides" belong together.** They
   answer one patient question: where do peptides come from? Merging them keeps
   the "natural ≠ safe" and "identical sequence ≠ identical material" caveats
   on the same page as the claim they qualify.

| # | Page | Merges |
|---|---|---|
| 1 | Your body already makes and uses peptides | 1 |
| 2 | Amino acids: the building blocks | 2 |
| 3 | A peptide is a chain, and the order matters (the peptide/protein line is a convention) | 3 + 4 |
| 4 | Many peptides act as signals, and not all do | 5 |
| 5 | Receptors: fit, switch on, or block (selective, never perfect) | 6 + 7 |
| 6 | Same signal, different effects; signals switch off | 8 |
| 7 | Where the body uses peptide signalling (neutral map, no benefits) | 9 |
| 8 | Where peptides come from: body, other living things, laboratories, and why labs make them (identical, modified, fragment) | 10 + 11 |
| 9 | "It's a peptide" says nothing about evidence: each peptide has its own evidence, and the body making it is not evidence about a product | 13 + SYN-BODY-01 |
| 10 | From sequence to material: the one-panel preview → PDF 02 | 12 + 14 |

---

## B. Essential concepts

Without these, a patient's fundamental understanding would be inaccurate.

1. **A peptide is a chain of amino acids.** Its sequence defines it, and the
   peptide/protein boundary is a convention (FND-01 to FND-04, FND-12,
   SYN-PEP-01).
2. **The body makes many peptides, and not all hormones are peptides.**
   (END-14, END-15).
3. **Many peptides are signals, but not all.** Defence and intracellular roles
   also exist (END-06; TB4-001).
4. **Signals act only through receptors the receiving cell has, and the cell
   produces the response** (SIG-01, SIG-02, SIG-06).
5. **Binding is not activation.** Molecules can switch receptors on, partly on,
   or block them (REC-03, RECEPT-003, RECEPT-006, RECEPT-007).
6. **Specificity is real but never absolute, and amount matters** (RECEPT-004,
   END-10).
7. **Signals are switched off.** The body desensitises receptors and breaks
   peptides down with enzymes (SIG-12, SIG-13, END-04, END-09). Without this,
   the message model implies that more is always better.
8. **"Natural" or "made by the body" is not evidence of safety or effect** for a
   product (SYN-BODY-01).
9. **Lab-made peptides may be identical, modified, or fragments.** A name does
   not guarantee the molecule, and a sequence does not guarantee the material
   (PK-13, PK-14; TB500-001, TB500-003; SPPS-004).
10. **Evidence belongs to a specific peptide, use and route.** Lab or animal
    findings are labelled as such, and regulatory status is secondary context
    (EVIDENCE_MODEL; REC-17; SYN-REC-01).

---

## C. Unnecessary concepts

These belong in later guides, not Peptides 101.

| Concept | Better home | Why not here |
|---|---|---|
| Peptide-bond chemistry (condensation, amide, Emil Fischer) | Science & Applications | Not needed for the mental model. The Fischer attribution is cited, not obtained. |
| Secondary, tertiary and quaternary structure; folding | Science & Applications | Adds vocabulary without changing the patient's decisions |
| G proteins, second messengers, arrestins, GRKs | Science & Applications ch. 4 | Mechanism depth. One "switched off" line is enough. |
| Inverse agonism, allosteric modulation, biased agonism, spare receptors | Science & Applications ch. 4 | Easy to misread. Keep only on / partly on / block. |
| Paracrine, autocrine, intracrine, juxtacrine terms | Later | The definitions are SOURCE NEEDED anyway; "near and far" suffices |
| Pharmacokinetics (ADME, half-life, bioavailability, clearance) | PDF on "How peptides move through the body" | A separate learning step in the index |
| Routes of administration; why most peptides are injected; oral delivery | Same later PDF | Close to instruction territory. Many oral claims are 2022 date-stamped. |
| SPPS chemistry (Fmoc, resins, TFA cleavage, scavengers, aggregation) | PDF 02 | Preview only here |
| HPLC, mass spectrometry, amino acid analysis, purity percentages, certificates of analysis | PDF 02 and the quality guide | Needs its own caveats |
| Sterility, endotoxin, lyophilisation, storage, cold chain (FND-19) | PDF 02 and quality | Handling-adjacent |
| Regulatory status, approval counts (conflicting sources), jurisdictions | Later, date-stamped | Secondary context; the counts conflict |
| Any named compound, dose, protocol, route or indication | Compound and protocol guides | PDF 01 is not a catalog. Patient mode suppresses dosing. |
| Cyclic, non-ribosomal and cell-penetrating peptides, stapling, PEGylation by name | Science & Applications | One general "some are modified" line covers it |
| Selenocysteine, pyrrolysine, xeno amino acids, evolutionary origin of the 20 | Footnote at most | Keep only "20 standard, labs can use others" |
| Nutrition: essential amino acids, dietary or collagen peptides | Out of scope | No held source in the foundations set; a strong misconception magnet |
| Receptor desensitisation, tolerance and tachyphylaxis in detail | Later | One sentence ("signals switch off") is sufficient |

---

## D. Scientific landmines

The ten most important ways a patient-friendly Peptides 101 could oversimplify
the science into something incorrect.

1. **"Natural means safe" and "the body makes it, so it's fine."**
   - What the sources say: effects depend on amount, place, receptors and
     feedback (END-10 to END-13).
   - The index's position is labelled synthesis SYN-BODY-01: the body making a
     peptide is not evidence about a product. Neither "safe" nor "unsafe"
     follows.

2. **"Each peptide fits one receptor and does one job."**
   - Specificity is never absolute, and higher amounts engage other targets
     (RECEPT-004).
   - Ligands can activate multiple receptor types (Tse & Wong).
   - One signal activates some cells and inhibits others (SIG-05).
   - A rigid lock-and-key image teaches this error by default.

3. **"If it binds, it works."** Binding and activation are distinct, and
   antagonists bind and block (REC-03, RECEPT-003, RECEPT-006). The key must
   fit *and turn*.

4. **"Peptides are messages that tell your cells what to do."**
   - The receiving cell produces the response, and it integrates many signals
     (SIG-02, SIG-06).
   - Not all peptides are messengers (END-06).
   - The "instructions" framing also blurs peptides with DNA.

5. **A single number as "the definition" of a peptide.**
   - Sources give 30, 50 or 100 as the upper limit, and NHGRI uses 2–50 (FND-01,
     FND-02, FND-04).
   - Printing "under 50" contradicts the index's own synthesis SYN-PEP-01, and
     would make insulin (51) a non-peptide.

6. **"Lab-made peptides are exact copies of the body's."**
   - Many are modified analogues, fragments, or sequences not found in humans
     (PK-13, PK-14; TB500-001; SRC-143 Introduction).
   - Even a sequence-identical synthesis yields a crude mixture that must be
     purified and tested (SPPS-004, PUR-001).
   - Avoid "bioidentical".

7. **A body-map of peptide areas that reads as a benefits list.**
   - Naming immunity, metabolism or the brain beside "peptides" implies
     therapeutic claims the foundations sources do not make.
   - Healing, tissue repair, ageing, fat loss, muscle, sleep and cognition have
     no general physiological source here, and growth factors are SOURCE
     NEEDED.

8. **"Peptides are proven" or "peptides are experimental" as a class.**
   - Evidence ranges within the index from phase 3 human trials (retatrutide)
     to no held human study (BPC-157).
   - Evidence is peptide-, use-, route- and population-specific.
   - Animal and cell findings must be labelled (REC-17; EVIDENCE_MODEL).

9. **Using regulatory status as the evidence verdict.** Approval is
   jurisdiction-specific, time-sensitive and secondary. Its absence is neither
   proof of harm nor of ineffectiveness, and approval does not validate uses
   outside what was studied. Published approval counts conflict (the
   `peptides-as-medicines` gap), so print none.

10. **Collapsing "made, purified, tested" into a guarantee.**
    - The simple arrow "synthesis → purification → testing → finished" omits
      the crude mixture and implies testing is one event.
    - Purity is not identity, and identity is not amount (HPLC-003, HPLC-005,
      ID-001, CON-001).
    - Fill/finish, sterility and endotoxin are separate stages.

**Close runners-up:**

- "Peptides can't enter cells." SIG-03 is categorical and from 1998, and
  cell-penetrating peptides exist.
- "Most peptide hormones act via GPCRs." This is SOURCE NEEDED.
- "There are only 20 amino acids."

---

## E. Before any patient copy is printed

1. **Extract HELD TEXT passages into claims.** *Done 15 September 2026* by
   `scripts/evidence/build-peptides-101-2026-09-15.py`, with every quoted
   segment checked in full and every locator derived from the text:
   - SRC-143 (Wang 2022): ORG-01 to ORG-17 in the new packet
     `where-peptides-come-from`, with five gaps;
   - SRC-156: END-14 (hormone classes; steroids and amino-acid derivatives
     enter cells) and END-15 (peptide hormone lengths and precursors);
   - SRC-157: END-16 (physiological roles), SIG-16 (over 800 GPCRs) and
     SIG-17 (family B binds peptide hormones). Table 1 was not used;
   - SRC-165: FND-21 (selenocysteine and pyrrolysine);
   - SRC-161: SIG-14 (signalling entities) and SIG-15 (some peptide drugs
     cross membranes or reach intracellular targets).
   The claims are loaded as unreviewed drafts; scientific review is still
   required.
2. **Record lock and key as an editorial analogy**, reviewed by a scientific
   reviewer, since no source uses it.
3. **Get scientific-reviewer sign-off on the editorial softenings:**
   - "generally act at the cell surface" (SIG-03);
   - "many, not all, peptides are signals".
4. **Re-check the Rang & Dale claims used here** (RECEPT-001 to RECEPT-007)
   against the English 10th edition (SRC-122) if acquired.
5. **Keep the open SOURCE NEEDED items off the page, or source them first:**
   - N- and C-terminus and "residue";
   - paracrine and autocrine definitions;
   - growth factors as a class;
   - a general short-lifespan rule for the body's peptides;
   - "most peptide hormones act via GPCRs".
6. **Run the usual patient gates on the final copy:** the patient-mode dose
   scan, a no-compound-name check, and a no-numerals check for synthesis-derived
   statements.
