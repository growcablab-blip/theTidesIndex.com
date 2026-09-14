# Owner source acquisition queue

Exact acquisition targets, in priority order. Every item says what it unlocks,
so a partial purchase still buys something specific.

Nothing here is a nice-to-have. The register currently holds **zero full texts
that have been read and judged**: 114 evidence rows sit at abstract level and
94 rest on secondary sources whose citations have never been obtained. That is
the single largest weakness in the index, and it is a purchasing problem rather
than an editorial one.

A note on what "abstract held" means in this register: the PubMed record was
retrieved and read, so the design, setting, population and headline result are
reliable. What an abstract cannot carry is how outcomes were measured, what the
protocol actually was, who dropped out, what the adverse-event table says, and
what the funding statement says. Those are the things the full texts below
would supply.

DOIs are not recorded in the source register — a registry gap worth closing —
so each entry gives the PubMed identifier, which resolves to the DOI.

---

## Priority 1 — Retatrutide: the five trial papers

The strongest human evidence in the register, and the record most likely to be
read by a clinician. All five are developer-sponsored (Eli Lilly), which is
recorded as context rather than as a mark against them.

| # | Source | Details | Access state |
|---|---|---|---|
| 1 | **SRC-050** | Jastreboff AM, Kaplan LM, Frías JP, Wu Q, Du Y, Gurbuz S et al. *Triple-Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial.* New England Journal of Medicine, 2023. PMID 37366315 | Abstract held; full text not obtained |
| 2 | **SRC-049** | Rosenstock J, Frias J, Jastreboff AM, Du Y, Lou J, Gurbuz S et al. *Retatrutide, a GIP, GLP-1 and glucagon receptor agonist, for people with type 2 diabetes: a randomised, double-blind, placebo and active-controlled, parallel-group, phase 2 trial conducted in the USA.* The Lancet, 2023. PMID 37385280 | Abstract held; full text not obtained |
| 3 | **SRC-052** | Bajaj HS, Welch M, Shah P, Luna E, Jaouimaa FZ, Liu B et al. *Efficacy and safety of retatrutide … in people with type 2 diabetes and inadequate glycaemic control with diet and exercise (TRANSCEND-T2D-1): a double-blind, randomised, phase 3 trial.* The Lancet, 2026. PMID 42250575 | Abstract held; full text not obtained |
| 4 | **SRC-051** | Sanyal AJ, Kaplan LM, Frias JP, Brouwers B, Wu Q, Thomas MK et al. *Triple hormone receptor agonist retatrutide for metabolic dysfunction-associated steatotic liver disease: a randomized phase 2a trial.* Nature Medicine, 2024. PMID 38858523 | Abstract held; full text not obtained |
| 5 | **SRC-048** | Urva S, Coskun T, Loh MT, Du Y, Thomas MK, Gurbuz S et al. *LY3437943, a novel triple GIP, GLP-1, and glucagon receptor agonist in people with type 2 diabetes: a phase 1b … multiple-ascending dose trial.* The Lancet, 2022. PMID 36354040 | Abstract held; full text not obtained |

Also in this family, lower priority: **SRC-047** (Coskun T et al., *Cell
Metabolism*, 2022, PMID 35985340) — the discovery paper, mostly preclinical
pharmacology with a single-dose human study.

**Why the full texts are needed.** Four specific things the record cannot
currently state, and would be able to:

1. **Body composition.** A practitioner source claims the weight lost is
   "almost entirely fat", citing a mouse figure. A DXA substudy exists in the
   type 2 diabetes trial; its results have never been extracted, so the index
   records the claim as unsupported. The full text settles it.
2. **Adverse events in full.** Abstracts give headline tolerability. The record
   cannot currently say what happened at each dose, how many withdrew and why.
3. **What was actually administered.** Titration schedules and dose escalation
   appear in the methods, not the abstract. Four of the six recorded regimens
   are trial arms, and they are recorded at the precision the abstract allows.
4. **The funding and conflict statements in the papers themselves**, rather
   than the PubMed conflict field.

**How to obtain.** NEJM, Lancet and Nature Medicine institutional access, or
single-article purchase (roughly £30–50 each). If only one is bought, buy
**SRC-050**: it is the trial everyone cites.

---

## Priority 2 — BPC-157: the three human studies

The compound with the widest gap between how much it is discussed and how much
is known. All three are small and uncontrolled, and the register says so — but
it says so from abstracts.

| # | Source | Details | Access state |
|---|---|---|---|
| 1 | **SRC-030** | *Effect of BPC-157 on Symptoms in Patients with Interstitial Cystitis: A Pilot Study.* Alternative Therapies in Health and Medicine, 2024. PMID 39325560 | Abstract held; full text not obtained |
| 2 | **SRC-031** | *Intra-Articular Injection of BPC 157 for Multiple Types of Knee Pain.* Alternative Therapies in Health and Medicine, 2021. PMID 34324435 | Abstract held; full text not obtained |
| 3 | **SRC-029** | *Safety of Intravenous Infusion of BPC157 in Humans: A Pilot Study.* Alternative Therapies in Health and Medicine, 2025. PMID 40131143 | Abstract held; full text not obtained |

**A registry defect to fix alongside this.** For all three, the author list in
`SOURCE_MANIFEST.json` contains the journal name rather than the authors. No
author names have been invented to fill the gap; they should be corrected from
the papers when obtained.

**Why the full texts are needed.**

1. **What material was given.** One study names a 503A compounding pharmacy;
   none reports identity or purity testing. If the full texts carry a
   certificate or a specification, the record can say what was administered —
   and if they do not, that absence becomes citable rather than inferred.
2. **How outcomes were collected.** A self-reported global response
   questionnaire after a single procedure is what the abstract describes; the
   instrument, timing and analysis are in the methods.
3. **The combined-treatment problem.** Part of the knee-pain cohort received
   thymosin beta-4 as well. How many, and whether results were separated, is
   not in the abstract — and it decides whether the study says anything about
   BPC-157 at all.

**How to obtain.** *Alternative Therapies in Health and Medicine* sells single
articles and back issues; it is not in most institutional collections.

---

## Priority 3 — One biochemistry / physiology reference

**What it unlocks: five chapters of Understanding Peptides and one of Peptide
Science & Applications** — the largest single gain available for one purchase.

Requirements: a standard, current, citable textbook covering amino acids,
peptide bonds and the peptide/protein boundary, endogenous peptide families and
their physiological roles, and peptide signalling at a level suitable for
patient-facing explanation. Page-level citable (not a website), with a stated
edition and year.

Best candidates, in order:

1. **Nelson DL & Cox MM, *Lehninger Principles of Biochemistry*, 8th edition
   (Macmillan, 2021).** Covers amino acids, peptide bonds, structure and
   signalling in one work; universally citable; readily available new or used.
2. **Berg JM, Tymoczko JL, Gatto GJ, Stryer L, *Biochemistry*, 9th edition
   (Macmillan, 2019).** Equivalent standing, slightly more concise.

One is enough. Buying both adds overlap rather than coverage.

---

## Priority 4 — One pharmacology reference

**What it unlocks: two chapters of Understanding Peptides, two of Peptide
Science & Applications, and the vocabulary the compound records already use.**

Requirements: receptor binding, agonism, antagonism and allosteric modulation;
selectivity; dose–response; and ADME with enough on peptide-specific problems
(proteolysis, oral bioavailability, half-life extension) to support the routes
chapter.

Best candidates, in order:

1. **Rang & Dale's *Pharmacology*, 10th edition (Elsevier, 2023).** Receptor
   theory and ADME in a form that is straightforward to cite at page level.
2. **Brunton LL et al., *Goodman & Gilman's The Pharmacological Basis of
   Therapeutics*, 14th edition (McGraw Hill, 2022).** More authoritative and
   more expensive; better if only one pharmacology work will ever be bought.

One is enough.

---

## Priority 5 — Replace two wrong or unusable manufacturing texts

Both are registered and neither is the work it claims to be. Each unlocks one
"source needed" stage in *From sequence to final vial*.

1. **SRC-013 — Costantino HR & Pikal MJ (eds), *Lyophilization of
   Biopharmaceuticals* (AAPS Press, 2004).** The held file is a two-page
   contents listing. Unlocks the lyophilisation stage.
2. **SRC-014 — Banga AK, *Therapeutic Peptides and Proteins: Formulation,
   Processing, and Delivery Systems*, 3rd edition (CRC Press, 2015).** The held
   copy is the wrong work. Unlocks the formulation stage, and would support the
   formulation chapter of Peptide Science & Applications.

---

## Priority 6 — Sterility, endotoxin and sterile manufacturing

Unlocks the fill/finish and finished-product release stages, and the sterility
and endotoxin quality topics that are currently blocked entirely.

Exact requirements:

1. **USP <71> Sterility Tests** and **USP <85> Bacterial Endotoxins Test** —
   the compendial chapters themselves, via a USP–NF subscription or single
   chapter purchase. European Pharmacopoeia 2.6.1 and 2.6.14 are acceptable
   equivalents if easier to obtain.
2. **USP <797> Pharmaceutical Compounding — Sterile Preparations**, which is
   the standard that actually governs the compounding pharmacies several
   records mention.
3. A **finished-product sterile manufacturing reference** — either *ICH Q7* (already
   held, SRC-017) supplemented by **EU GMP Annex 1 (2022)**, which is free to
   download and covers sterile fill/finish directly. Try Annex 1 first: it
   costs nothing and may close most of the gap.

---

## Not requested

- Anything behind a paywall that a free equivalent would answer. Annex 1 above
  is the example: free, current, and directly on point.
- Machine-translated Russian full texts. Semax and Selank need a qualified
  reader, not a translation tool, and that is a service rather than a purchase.
- More overlapping textbooks. Two references — one biochemistry, one
  pharmacology — unlock nine chapters between them. A third adds little.
