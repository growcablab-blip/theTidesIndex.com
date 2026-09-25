#!/usr/bin/env python3
"""
Peptides 101 pre-publication extraction: where peptides come from, and four
foundational points the patient series needs.

    python -X utf8 scripts/evidence/build-peptides-101-2026-09-15.py

Answers Section E of docs/PATIENT_SERIES_01_PEPTIDES_101_EVIDENCE_PACKET.md.
Every passage comes from a source already registered, licence-checked and held
as a text snapshot; nothing is fetched and no source is registered.

Writes:

  data/seed/learning/where-peptides-come-from.json   (new learning packet)
      SRC-143  Wang et al., Signal Transduction and Targeted Therapy 2022

and adds claims, by key, to three packets built by
build-foundations-2026-09-14.py (run this script again after that one):

  peptides-in-the-body.json    END-14 to END-16  (SRC-156, SRC-157)
  peptide-signalling.json      SIG-14 to SIG-17  (SRC-161, SRC-157)
  amino-acids-to-proteins.json FND-21            (SRC-165)

For every evidence row the script:

  - checks every quoted segment in full, not a prefix, against the normalised
    snapshot text, and requires all of a row's segments to sit in one paragraph;
  - derives the section heading and paragraph number from where the passage
    actually is, and refuses to write if that differs from the declared locator.

Editorial decisions live in this file: EXCLUDED records passages read and
deliberately not used, with the reason. Compound names, approval counts and
indications in the source's examples are not carried into any claim. Idempotent.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAP = ROOT / "data" / "private" / "source-snapshots"
LEARNING = ROOT / "data" / "seed" / "learning"
MANIFEST = ROOT / "SOURCE_MANIFEST.json"

SNAPSHOT_OF = {
    "SRC-143": SNAP / "reviews" / "wang2022-therapeutic-peptides.txt",
    "SRC-156": SNAP / "foundations" / "hillersturmhofel1998-endocrine-overview.txt",
    "SRC-157": SNAP / "foundations" / "culhane2015-familyB-gpcr-peptide-hormones.txt",
    "SRC-161": SNAP / "foundations" / "apostolopoulos2021-global-review-short-peptides.txt",
    "SRC-165": SNAP / "foundations" / "brown2023-xeno-amino-acids.txt",
}

REVIEW_TRACE = "A review. The primary studies it cites have not been obtained and read by this index."
UNCITED_TRACE = "The review's own statement, with no citation attached; nothing behind it can be traced."

WANG_UNCERTAINTY = (
    "A narrative review of therapeutic peptides, unevenly worded in places: within its own text it describes "
    "insulin's 1921 preparation both as isolation and as synthesis, and uses 'synthetic' and 'recombinant' loosely. "
    "Used only where its statement is plain, as of 2022. Nothing here is a statement about any peptide product."
)
REVIEW_UNCERTAINTY = (
    "Foundational statement from a peer-reviewed review, not a systematic review. It describes general biology "
    "and says nothing about any peptide product or treatment."
)
AMINO_UNCERTAINTY = "Foundational statement from a peer-reviewed review. General biochemistry, not about any peptide product."


def ev(source: str, heading: str, para: int, segments: list[str], trace: str, interpretation: str) -> dict:
    return {"source": source, "heading": heading, "para": para, "segments": segments,
            "trace": trace, "interpretation": interpretation}


# --- Where peptides come from (SRC-143) --------------------------------------

INTRO = "Introduction"
RECOMB = "Peptide production by recombinant technology"
CHEM = "Chemical synthesis of peptides"
NATPROD = "Peptides identified from natural products"
NATHORM = "Natural peptides/hormones in the human body"
MIMIC = "Peptides mimicking hormones"

ORIGIN_CLAIMS: list[dict] = [
    {
        "claimKey": "ORG-01", "category": "production-history", "importance": "medium",
        "claimText": "Wang et al. (2022) state that research into therapeutic peptides began with fundamental studies of natural human hormones, including insulin, oxytocin, vasopressin and gonadotropin-releasing hormone, and their physiological activities in the body.",
        "plain": "Research into peptide medicines began with studying hormones the human body already makes.",
        "notes": "Introduction, paragraph 1. The next sentence dates 'the synthesis of the first therapeutic peptide, insulin' to 1921 and gives an approval count; neither is used (see EXCLUDED and ORG-02).",
        "evidence": [ev("SRC-143", INTRO, 1, [
            "Research into therapeutic peptides started with fundamental studies of natural human hormones, including insulin, oxytocin, vasopressin, and gonadotropin-releasing hormone (GnRH), and their specific physiological activities in the human body",
        ], "cited", "The review's account of where therapeutic peptide research began.")],
    },
    {
        "claimKey": "ORG-02", "category": "production-history", "importance": "medium",
        "claimText": "Wang et al. (2022) describe insulin, a peptide of 51 amino acids, as first isolated in 1921 and as the first commercial peptide drug in 1923, and state that animal-derived bovine and porcine insulins dominated the market for almost 90 years until recombinant insulin replaced them.",
        "plain": "Insulin, one of the first peptide medicines, was at first obtained from animals and was later replaced by insulin made with recombinant technology.",
        "notes": "Introduction, paragraph 2. Isolation rather than synthesis is corroborated in the same review (ORG-03, isolation from livestock pancreata); paragraph 1 instead says 'synthesis', an internal inconsistency recorded as a gap. The paragraph's naming of the people who developed insulin is garbled in the source and is not carried, nor is its sentence on the supply of human insulin, whose meaning is unclear. 'Almost 90 years' is the review's figure; no primary history is held. At 51 amino acids, insulin sits on the boundary one glossary uses (FND-04), which is why the index treats that boundary as a convention (SYN-PEP-01).",
        "evidence": [ev("SRC-143", INTRO, 2, [
            "The discovery and development of insulin, a peptide with 51 amino acids, has been considered as one of the monumental scientific achievements in drug discovery",
            "It was first isolated by Frederick Banting in 1921",
            "In 1923, insulin became the first commercial peptide drug",
            "animal-derived insulins, such as bovine and porcine insulin, dominated the insulin market for almost 90 years until they were replaced by recombinant insulin",
        ], "cited", "Insulin's isolation, first commercial use, and replacement of animal insulin by recombinant insulin, as the review recounts them.")],
    },
    {
        "claimKey": "ORG-03", "category": "production-history", "importance": "medium",
        "claimText": "Wang et al. (2022) trace the isolation of peptide drugs from natural sources to the 1920s, when insulin was first isolated from livestock pancreata and used to treat diabetes, and state that several other animal-derived peptide drugs subsequently entered clinical use.",
        "plain": "Early peptide medicines, starting with insulin in the 1920s, were extracted from animal tissue.",
        "notes": "Peptide production by recombinant technology, paragraph 3. The named later drugs are the source's examples and are not carried. Corroborates the isolation account in ORG-02.",
        "evidence": [ev("SRC-143", RECOMB, 3, [
            "The practice of isolating peptide drugs from natural sources can be traced back to the 1920s, when insulin was first isolated from livestock pancreata and used to treat diabetes",
            "several other animal-derived peptide drugs subsequently successfully entered clinical use",
        ], "cited", "Extraction from animal tissue as the earliest source of peptide drugs.")],
    },
    {
        "claimKey": "ORG-04", "category": "production-methods", "importance": "high",
        "claimText": "Wang et al. (2022) state that, in addition to chemical synthesis, therapeutic peptides can be prepared by biological methods, namely extraction from natural sources, enzymatic synthesis, fermentation, recombinant DNA technology and semisynthesis, applied alone or in combination depending on the complexity and difficulty of preparing the peptide.",
        "plain": "Peptides for medicine and research can be made in several ways: extracted from natural sources, built chemically, or produced by biological methods such as recombinant technology, sometimes in combination.",
        "notes": "Peptide production by recombinant technology, paragraph 2. The list of methods sits between the two quoted segments, interleaved with citation markers, so it is paraphrased rather than quoted. No method is said to be better in general; the choice depends on the peptide.",
        "evidence": [ev("SRC-143", RECOMB, 2, [
            "In addition to chemical synthesis, therapeutic peptides can be prepared by various biological methods, such as isolating bioactive peptides from natural sources by extraction",
            "These approaches can be applied exclusively or in combination, depending on the complexity and difficulty of preparing the peptide",
        ], "cited", "The range of production routes for therapeutic peptides.")],
    },
    {
        "claimKey": "ORG-05", "category": "natural-sources", "importance": "medium",
        "claimText": "Wang et al. (2022) describe bioactive peptides from bacteria, fungi, plants and animals as possessing therapeutic properties, and venoms and toxins as valuable natural starting points for identifying bioactive peptides.",
        "plain": "Peptides studied for medicine do not only come from humans: bacteria, fungi, plants and animals, including their venoms, are also sources.",
        "notes": "'Possess therapeutic properties' is the review's characterisation of a class, not evidence that any peptide treats anything. Used only to show that natural sources are not only human.",
        "evidence": [
            ev("SRC-143", NATPROD, 1, [
                "Many bioactive peptides from bacteria, fungi, plants, and animals possess therapeutic properties",
            ], "cited", "Non-human natural sources of bioactive peptides."),
            ev("SRC-143", RECOMB, 3, [
                "Venoms and toxins are recognized as valuable natural sources as starting points for identifying bioactive peptides",
            ], "cited", "Venoms and toxins as starting points for peptide discovery."),
        ],
    },
    {
        "claimKey": "ORG-06", "category": "natural-sources", "importance": "low",
        "claimText": "Wang et al. (2022) state that non-ribosomal peptides, mostly studied from bacteria and fungi, contain non-standard residues and are not produced through the traditional biosynthesis pathways via ribosomes, but by non-ribosomal peptide synthetases.",
        "plain": "Some peptides from bacteria and fungi are made by special enzymes rather than the usual route, and can contain unusual building blocks.",
        "notes": "Natural products section, paragraph 3. The named compounds are not carried, nor is the paragraph's statement about oral delivery. Shows that 'natural' peptides are not all built from the standard amino acids by the usual route; the source does not describe the ribosomal route itself, which remains a gap.",
        "evidence": [ev("SRC-143", NATPROD, 3, [
            "The non-standard residues contained in the sequence mean that NRPs are not produced through the traditional biosynthesis pathways via ribosomes",
            "but are produced by non-ribosomal peptide synthetases",
            "The most-studied NRPs are mainly derived from bacteria and fungi",
        ], "cited", "Non-ribosomal peptides as a natural class made by a different route.")],
    },
    {
        "claimKey": "ORG-07", "category": "production-methods", "importance": "high",
        "claimText": "Wang et al. (2022) state that recombinant DNA technology enables production of peptides and proteins with defined sequences and homogeneity, is particularly useful for long or complicated peptides with multiple disulfide bonds that are otherwise difficult to synthesise chemically, and give human insulin and growth hormone as representative peptide drugs made this way.",
        "plain": "Recombinant technology is especially useful for long or complicated peptides that are hard to build chemically.",
        "notes": "Peptide production by recombinant technology, paragraph 3; uncited sentences. The review calls both examples 'peptide drugs'; whether a given chain is called a peptide or a protein depends on the convention used (SYN-PEP-01). The paragraph's statement that recombinant methods can be combined with genetic code expansion is not carried.",
        "evidence": [ev("SRC-143", RECOMB, 3, [
            "Recombinant DNA technology enables the production of peptides and proteins with defined sequences and homogeneity",
            "This approach is particularly useful for manufacturing long or complicated peptides with multiple disulfide bonds, which can otherwise be difficult to synthesize chemically",
            "Human insulin and growth hormone are representative examples of the many available peptide drugs made using recombinant DNA technology",
        ], "uncited", "When recombinant production is used, as the review describes it.")],
    },
    {
        "claimKey": "ORG-08", "category": "production-methods", "importance": "low",
        "claimText": "Wang et al. (2022) describe semisynthesis as producing large bioactive polypeptides by linking synthetic peptides and recombinant DNA-expressed peptides, particularly useful when multiple artificial modifications are needed.",
        "plain": "Some large peptides are made by joining a chemically built piece to a piece made with recombinant technology.",
        "notes": "Peptide production by recombinant technology, paragraph 3.",
        "evidence": [ev("SRC-143", RECOMB, 3, [
            "Semi-synthesis provides a flexible approach for producing large bioactive polypeptides by linking synthetic peptides and recombinant DNA-expressed peptides",
            "is a particularly useful approach when multiple artificial modifications are needed",
        ], "cited", "Semisynthesis as a combined route.")],
    },
    {
        "claimKey": "ORG-09", "category": "production-methods", "importance": "medium",
        "claimText": "Wang et al. (2022) state that chemical synthesis of peptides is well developed, particularly solid-phase peptide synthesis (SPPS), developed by Merrifield in 1963, which plays a crucial role in modern peptide production and led to automatic peptide synthesizers.",
        "plain": "Building peptides step by step on a solid support, a method developed in 1963, is central to making peptides chemically today, and it can be automated.",
        "notes": "Chemical synthesis of peptides, paragraph 1. The method itself is described from SRC-006 in SPPS-001 and SPPS-002.",
        "evidence": [ev("SRC-143", CHEM, 1, [
            "The chemical synthesis of peptides is well-developed, particularly solid-phase peptide synthesis (SPPS) technology developed by Merrifield in 1963",
            "plays a crucial role in modern peptide production",
            "has further led to the invention of automatic peptide synthesizers",
        ], "cited", "SPPS as the established chemical route.")],
    },
    {
        "claimKey": "ORG-10", "category": "production-methods", "importance": "medium",
        "claimText": "Wang et al. (2022) state that, compared with recombinant technology, crude peptides from SPPS are free of other biological compounds such as enzymes, DNA and RNA fragments and unrelated proteins, that impurities in the final SPPS product derive mainly from incomplete or side reactions and are easily identified, and that subsequent purification is relatively uncomplicated.",
        "plain": "Chemically built peptides avoid the biological leftovers that come with recombinant production; their impurities are mostly the results of incomplete or unwanted reactions during building.",
        "notes": "Chemical synthesis of peptides, paragraph 1. The review's comparison, cited to references not obtained. The origin of synthesis impurities agrees with SPPS-004 and PUR-001. 'Relatively uncomplicated' purification is in tension with SRC-007, which describes preparative purification as labour-intensive and not automated (PUR-003); recorded as a gap rather than resolved.",
        "evidence": [ev("SRC-143", CHEM, 1, [
            "Compared with recombinant technology, the crude peptides obtained by SPPS are more monotonous, without other biological compounds such as enzymes, DNA and RNA fragments, non-related proteins, and peptides",
            "the impurities in the final SPPS product are easily identified because they are mainly derived from incomplete or side reactions during the synthesis procedure",
            "making subsequent purification relatively uncomplicated",
        ], "cited", "How impurities differ between chemical and recombinant production, in the review's comparison.")],
    },
    {
        "claimKey": "ORG-11", "category": "why-laboratories", "importance": "high",
        "claimText": "Wang et al. (2022) describe chemical synthesis as the preferred method for industrial preparation of peptides because it can introduce building blocks beyond the proteinogenic amino acids, such as unnatural amino acids and biochemical or biophysical probes, and can be fully automated and easily scaled up, while chemical synthesis of long peptides remains challenging and requires alternative strategies.",
        "plain": "Building peptides chemically lets makers use building blocks the body does not use, and it can be automated, but long peptides are still hard to make this way.",
        "notes": "Peptide production by recombinant technology, paragraph 1; an uncited paragraph. 'Preferred' is the review's characterisation of industry as of 2022. Consistent with FND-17 on long peptides and with ORG-07 on recombinant production as the alternative.",
        "evidence": [ev("SRC-143", RECOMB, 1, [
            "Chemical synthesis is the preferred method for the industrial preparation of peptides, because it can introduce versatile synthetic building blocks beyond the proteinogenic amino acids, such as unnatural amino acids, and biochemical or biophysical probes, allowing further modification or conjugation",
            "the chemical synthesis process can be fully automated and easily scaled up",
            "the chemical synthesis of long peptides remains challenging, and alternative strategies are therefore required",
        ], "uncited", "Why chemical synthesis is used, and its limit.")],
    },
    {
        "claimKey": "ORG-12", "category": "why-laboratories", "importance": "medium",
        "claimText": "Wang et al. (2022) state that automated synthesizers are extremely helpful for laboratory-scale peptide synthesis, producing the desired peptides rapidly for further structural and functional studies.",
        "plain": "In research laboratories, machines build peptides quickly so that scientists can study their structure and what they do.",
        "notes": "Chemical synthesis of peptides, paragraph 5; the same paragraph as FND-17. The named instruments and their capacity are not carried. Research use, not manufacture for people.",
        "evidence": [ev("SRC-143", CHEM, 5, [
            "Such synthesizers are extremely helpful for laboratory-scale peptide synthesis, producing the desired peptides rapidly for further structural and functional studies",
        ], "uncited", "Making peptides in order to study them.")],
    },
    {
        "claimKey": "ORG-13", "category": "production-history", "importance": "medium",
        "claimText": "Wang et al. (2022) state that more peptide hormones and their receptors were identified from the 1950s to the 1990s, that progress in protein purification and synthesis, structure elucidation and sequencing accelerated peptide drug development, and that synthetic peptides began to be developed in addition to natural peptides.",
        "plain": "From the 1950s, as tools for purifying, building and analysing peptides improved, laboratory-made peptides began to be developed alongside natural ones.",
        "notes": "Introduction, paragraph 3. The review's examples list recombinant human insulin among 'synthetic peptides', a looser use of 'synthetic' than elsewhere; recorded as a terminology gap. The paragraph's approval count is not used.",
        "evidence": [ev("SRC-143", INTRO, 3, [
            "More peptide hormones and their receptors with therapeutic potential were identified and characterized from the 1950s to the 1990s",
            "the technologies used for protein purification and synthesis, structure elucidation, and sequencing made substantial progress, thus accelerating the development of peptide drugs",
            "synthetic peptides such as synthetic oxytocin",
            "began to be developed in addition to natural peptides",
        ], "cited", "The shift from natural to laboratory-made peptides.")],
    },
    {
        "claimKey": "ORG-14", "category": "peptide-design", "importance": "high",
        "claimText": "Wang et al. (2022) state that peptide drugs developed since 2000 are no longer simply hormone mimics or composed simply of natural amino acids, giving examples that include a peptide mimicking viral proteins, a peptide derived from a cone snail, an analogue manufactured in Escherichia coli modified by recombinant DNA technology, and a chemically synthesised analogue of a human hormone with an attached fatty acid.",
        "plain": "Newer peptide medicines are not always copies of human hormones: some are based on molecules from viruses or other animals, and some carry added chemical groups.",
        "notes": "Introduction, paragraph 4. Compound names are the source's examples and are deliberately not carried, as in PK-13. The paragraph's count of approvals since 2000 is not used.",
        "evidence": [ev("SRC-143", INTRO, 4, [
            "these peptide drugs are no longer simply hormone mimics or composed simply of natural amino acids",
            "is a 36-amino acid biomimetic peptide mimicking human immunodeficiency virus (HIV) proteins",
            "is a neurotoxic peptide derived from the cone snail Conus magus",
            "is manufactured using a strain of Escherichia coli modified by recombinant DNA technology",
            "is a chemically synthesized analogue of human glucagon-like peptide",
            "made by attaching a C-16 fatty acid (palmitic acid)",
        ], "cited", "Laboratory-made peptides that are not copies of human hormones.")],
    },
    {
        "claimKey": "ORG-15", "category": "why-laboratories", "importance": "high",
        "claimText": "Wang et al. (2022) state that peptide drug discovery began by using natural hormones and peptides with well-studied physiological functions to treat hormone-deficiency diseases, with natural peptides or animal homologues as the initial strategies, and that the drawbacks of these natural peptides prompted optimisation of their natural sequences, leading to hormone-mimetic peptide drugs.",
        "plain": "Natural hormones were used as medicines first; because natural peptides have drawbacks, scientists then began changing their sequences, creating hormone-like peptide medicines.",
        "notes": "Natural peptides/hormones in the human body, paragraph 1. The drawbacks are not listed in this paragraph; the review names them elsewhere as poor membrane permeability and poor stability in the body (PK-10). The named hormones are the source's list of initial targets.",
        "evidence": [ev("SRC-143", NATHORM, 1, [
            "The history of peptide drug discovery started by exploiting natural hormones and peptides with well-studied physiological functions for treating diseases caused by hormone deficiencies",
            "Searching for natural peptides and hormones or replace them by animal homologues",
            "were the initial strategies used for peptide drug discovery and development",
            "the drawbacks associated with these natural peptides aroused interest in optimizing their natural sequences, leading to a series of natural hormone-mimetic peptide drugs",
        ], "cited", "Why laboratories moved from natural peptides to modified sequences.")],
    },
    {
        "claimKey": "ORG-16", "category": "peptide-design", "importance": "medium",
        "claimText": "Wang et al. (2022) describe GLP-1, a hormone that regulates insulin production and secretion, as having a very short half-life in the body, and state that extensive efforts modified its sequence to enhance its stability while maintaining its potency and pharmacological effect.",
        "plain": "Scientists changed the sequence of a natural hormone that breaks down quickly, aiming to make it last longer while still acting in the same way.",
        "notes": "Peptides mimicking hormones, paragraph 1. The products named in the paragraph are not carried. States a design aim; it does not describe the properties of any particular product. No half-life figure is given or carried.",
        "evidence": [ev("SRC-143", MIMIC, 1, [
            "GLP-1 is a 37-amino acid peptide that regulates insulin production and secretion",
            "with a very short half-life in vivo",
            "Extensive efforts have been made to modify its sequence to enhance the stability of this hormone, while maintaining its potency and pharmacological effect",
        ], "cited", "Sequence modification to extend a natural hormone's stability.")],
    },
    {
        "claimKey": "ORG-17", "category": "peptide-design", "importance": "medium",
        "claimText": "Wang et al. (2022) describe drugs developed by modifying the native sequence of GnRH, a 10-amino-acid hypothalamic peptide: one has the same biological activity as GnRH by activating GnRH receptors, while another, although optimised from the GnRH sequence, acts as a GnRH antagonist by binding the receptor competitively.",
        "plain": "Two medicines built from the same natural hormone can do opposite things: one switches the hormone's receptor on, the other blocks it.",
        "notes": "Peptides mimicking hormones, paragraph 3. Drug names and the conditions treated are not carried. Shows that a modified analogue is a different molecule whose action cannot be assumed from its parent (compare RECEPT-003 and RECEPT-005).",
        "evidence": [ev("SRC-143", MIMIC, 3, [
            "GnRH is a peptide containing 10 amino acids that is produced by GnRH neurons in the hypothalamus",
            "Modification of the native sequence of GnRH has led to the development of several peptide drugs",
            "has the same biological activity as GnRH by activating GnRH receptors",
            "acts as a GnRH antagonist by competitively binding to the GnRH receptor",
        ], "cited", "Analogues of one hormone with opposite actions at its receptor.")],
    },
]

# Passages read and deliberately not used, with the reason.
EXCLUDED: dict[str, str] = {
    "SRC-143 Introduction, paragraph 1 (insulin 'synthesis' in 1921; more than 80 approvals)":
        "Contradicted within the review, which twice describes insulin as isolated from animal pancreata; the approval count conflicts with another review and neither is primary.",
    "SRC-143 Introduction, paragraph 2 (who developed insulin; supply of human insulin)":
        "The names are garbled in the source, and the sentence on human insulin supply is ambiguous.",
    "SRC-143 Introduction, paragraphs 3 and 4 (approval counts)":
        "Approval counts are not used: the held reviews conflict and neither is a regulatory source.",
    "SRC-143 Chemical synthesis of peptides, paragraph 6 ('recombinant peptide drugs' made by chemical synthesis)":
        "Calls a peptide the same review elsewhere lists as synthetic a 'recombinant peptide drug'; terminology inconsistent.",
    "SRC-143 Peptides identified from natural products, paragraph 3 (oral delivery of non-ribosomal peptides)":
        "Compound-adjacent route claim, not needed.",
    "SRC-157 Table 1":
        "Extracted as flattened columns, and its drug and disease columns are compound detail; the physiological roles are taken from the paragraph text instead.",
    "SRC-161 Abstract, sentence 1 ('Peptides are fragments of proteins…')":
        "Looser than the definition the index uses (FND-03), and implies all peptides are breakdown products.",
}

ORIGIN_GAPS = [
    {"gapType": "primary_source_missing",
     "statement": "A primary historical account of insulin's first isolation, its first commercial use, and the replacement of animal insulin by recombinant insulin.",
     "why": "The only held account is a 2022 narrative review, which describes the 1921 preparation as isolation in two places and as synthesis in one, and names its developers inaccurately.",
     "whatWouldResolveIt": "A historical or primary source for the isolation and commercial introduction of insulin, obtained and read."},
    {"gapType": "terminology_unresolved",
     "statement": "Consistent definitions of 'natural', 'synthetic' and 'recombinant' as descriptions of how a peptide was produced.",
     "why": "The held review lists recombinant insulin among 'synthetic peptides' in one paragraph and calls a chemically made peptide a 'recombinant peptide drug' in another.",
     "whatWouldResolveIt": "A permissively licensed source, or regulatory glossary, defining these production categories."},
    {"gapType": "conflicting_sources",
     "statement": "How difficult it is to purify a chemically synthesised peptide.",
     "why": "SRC-143 describes purification after solid-phase synthesis as relatively uncomplicated (ORG-10); SRC-007 describes preparative purification as labour-intensive and not automated (PUR-003). The scopes differ, identifying impurities against separating them, and neither is primary.",
     "whatWouldResolveIt": "A current peptide process-chemistry reference addressing purification effort directly."},
    {"gapType": "source_missing",
     "statement": "How the body builds peptides from genetic information on ribosomes, stated in general terms.",
     "why": "The held sources describe precursors cut into active peptides (END-03, END-07) and mention the ribosomal route only by contrast with non-ribosomal peptides (ORG-06).",
     "whatWouldResolveIt": "A permissively licensed biochemistry source describing ribosomal peptide synthesis."},
    {"gapType": "source_missing",
     "statement": "Whether a laboratory-made peptide with the same sequence as one the body makes behaves in the same way once in the body.",
     "why": "No held source compares them in general; the review compares production routes, not behaviour.",
     "whatWouldResolveIt": "A permissively licensed review comparing endogenous and synthetic peptides of identical sequence."},
]

ORIGIN_TOPIC = {
    "topicKey": "where-peptides-come-from",
    "slug": "where-peptides-come-from",
    "title": "Where peptides come from: the body, other living things and laboratories",
    "publicationChapter": "Understanding Peptides — Six: Why peptides are studied (in part); Patient Education Series 01, Peptides 101 (origins and laboratory production)",
    "summary": "How peptides used in medicine and research are obtained: extraction from animal and other natural sources, chemical synthesis, recombinant DNA technology and combined routes; why laboratories make and modify peptides; and how laboratory-made peptides can copy, alter or depart from natural sequences. Class-level statements from a narrative review, not statements about any peptide product.",
    "notes": "The review is inconsistent in places (insulin's 1921 preparation; its use of 'synthetic' and 'recombinant'), and those passages were not used. Compound names, approval counts and indications in its examples are not carried.",
}

ORIGIN_NOTE = (
    "Extracted 15 September 2026 from SRC-143 (Wang et al. 2022, CC BY 4.0, licence read in the retrieved full text), "
    "already registered and held. Every quoted segment was checked in full against the held text, and every locator was "
    "derived from where the passage sits. Passages read and not used: " +
    "; ".join(f"{k}: {v}" for k, v in EXCLUDED.items() if k.startswith("SRC-143")) + "."
)

# --- Additions to foundations packets ----------------------------------------

HORMONES = "What Are Hormones? > Mechanisms of Action"
C_INTRO = "Introduction"

SUPPLEMENTS: dict[str, list[dict]] = {
    "peptides-in-the-body": [
        {
            "claimKey": "END-14", "category": "physiology", "importance": "medium",
            "claimText": "Hiller-Sturmhöfel and Bartke (1998) state that hormones fall into several classes, including steroids, amino acid derivatives, and polypeptides and proteins, whose structural differences mean their mechanisms of action differ, including whether they can enter target cells, and that steroids and amino acid derivatives can enter cells.",
            "plain": "Not all hormones are peptides. Some, such as steroids, have a different structure and can enter the cells they act on.",
            "notes": "1998 general overview. Pairs with SIG-03, from the same section, on peptide hormones acting at the cell surface. About hormones only, not all signalling molecules.",
            "uncertainty": REVIEW_UNCERTAINTY,
            "evidence": [
                ev("SRC-156", HORMONES, 1, [
                    "Several classes of hormones exist, including steroids, amino acid derivatives, and polypeptides and proteins",
                    "their mechanisms of action (e.g., whether they can enter their target cells and how they modulate the activity of those cells) also differ",
                    "The molecules can enter their target cells and interact with receptors in the fluid that fills the cell",
                ], "uncited", "Hormone classes, and steroids entering cells."),
                ev("SRC-156", HORMONES, 2, [
                    "Like steroids, amino acid derivatives can enter the cell",
                ], "uncited", "Amino acid derivative hormones entering cells."),
            ],
        },
        {
            "claimKey": "END-15", "category": "physiology", "importance": "medium",
            "claimText": "Hiller-Sturmhöfel and Bartke (1998) describe polypeptide and protein hormones as chains of amino acids of various lengths, from three to several hundred amino acids, found primarily in the hypothalamus, pituitary gland and pancreas, and in some instances derived from inactive precursors, or pro-hormones, cleaved into active hormones.",
            "plain": "Peptide and protein hormones vary widely in length, and some are made as inactive precursors that are cut into their active form.",
            "notes": "The same paragraph as SIG-03. 'Primarily' is the source's hedge. The length range describes hormones; it is not a definition of 'peptide' (SYN-PEP-01).",
            "uncertainty": REVIEW_UNCERTAINTY,
            "evidence": [ev("SRC-156", HORMONES, 3, [
                "Polypeptide and protein hormones are chains of amino acids of various lengths (from three to several hundred amino acids)",
                "These hormones are found primarily in the hypothalamus, pituitary gland, and pancreas",
                "In some instances, they are derived from inactive precursors, or pro-hormones, which can be cleaved into one or more active hormones",
            ], "uncited", "What peptide hormones are, where they are made, and precursors.")],
        },
        {
            "claimKey": "END-16", "category": "physiology", "importance": "medium",
            "claimText": "Culhane et al. (2015) state that the 15 family B G protein-coupled receptors for peptide hormones are grouped by physiological role, including insulin secretion, vasodilation, regulation of calcium homeostasis and cardiac contractility, and that these receptors modulate physiological processes such as calcium homeostasis and regulation of blood glucose.",
            "plain": "Receptors for one family of peptide hormones help control things such as blood sugar, calcium balance, the widening of blood vessels and heart contraction.",
            "notes": "Introduction. The paragraph's statements about drug targets and diseases, and Table 1, are not carried. Describes the body's own signalling, not any treatment.",
            "uncertainty": REVIEW_UNCERTAINTY,
            "evidence": [
                ev("SRC-157", C_INTRO, 3, [
                    "The 15 family B GPCRs for various peptide hormones are grouped into subfamilies based on their physiological roles, including insulin secretion, vasodilation, regulation of Ca2+ homeostasis, and cardiac contractility",
                ], "uncited", "Physiological roles of family B peptide-hormone receptors."),
                ev("SRC-157", C_INTRO, 5, [
                    "all family B receptors bind peptide hormones, modulating physiological processes such as calcium homeostasis and regulation of blood glucose",
                ], "uncited", "Processes family B receptors modulate."),
            ],
        },
    ],
    "peptide-signalling": [
        {
            "claimKey": "SIG-14", "category": "cell-signalling", "importance": "medium",
            "claimText": "Apostolopoulos et al. (2021) describe peptides as acting as signalling entities across all domains of life and as interfering with protein-protein interactions.",
            "plain": "Across living things, peptides act as signals and can affect how proteins interact with each other.",
            "notes": "An uncited abstract statement in a 25-author review. It does not say all peptides are signals. The abstract's opening definition ('fragments of proteins') is not adopted.",
            "uncertainty": REVIEW_UNCERTAINTY,
            "evidence": [ev("SRC-161", "Abstract", 1, [
                "They act as signaling entities via all domains of life and interfere with protein-protein interactions, which are indispensable in bio-processes",
            ], "uncited", "Peptides as signals across living things.")],
        },
        {
            "claimKey": "SIG-15", "category": "cell-signalling", "importance": "medium",
            "claimText": "Apostolopoulos et al. (2021) state that peptide drugs initially served only as hormone analogues but now achieve numerous biomedical tasks, and can cross membranes or reach intracellular targets.",
            "plain": "Peptide medicines began as copies of hormones; some newer ones can cross cell membranes or act inside cells.",
            "notes": "An uncited abstract statement about peptide drugs as a class, not about hormones. It qualifies, without contradicting, SIG-03 (polypeptide hormones cannot enter cells) and PK-10 (poor membrane permeability as a class drawback): the scopes differ. It does not say which peptides, or how.",
            "uncertainty": REVIEW_UNCERTAINTY,
            "evidence": [ev("SRC-161", "Abstract", 1, [
                "initially played only the role of hormone analogs to balance disorders",
                "Nowadays, they achieve numerous biomedical tasks, can cross membranes, or reach intracellular targets",
            ], "uncited", "Peptide drugs reaching inside cells.")],
        },
        {
            "claimKey": "SIG-16", "category": "cell-signalling", "importance": "medium",
            "claimText": "Culhane et al. (2015) describe G protein-coupled receptors as the largest protein superfamily of the vertebrate genome, over 800 different receptors detecting extracellular signals that range from photons and small molecules to hormones and proteins.",
            "plain": "One very large family of receptors, the G protein-coupled receptors, picks up many kinds of signal, from light to hormones.",
            "notes": "Introduction, paragraph 1, the same paragraph as SIG-07. It does not say what share of peptide hormones act through these receptors, which remains SOURCE NEEDED.",
            "uncertainty": REVIEW_UNCERTAINTY,
            "evidence": [ev("SRC-157", C_INTRO, 1, [
                "G protein-coupled receptors (GPCRs), which form the largest protein superfamily of the vertebrate genome",
                "These extracellular signals range from photons and small molecules to hormones and proteins",
                "the structural and functional diversity of over 800 different GPCRs",
            ], "cited", "The size and range of the GPCR family.")],
        },
        {
            "claimKey": "SIG-17", "category": "cell-signalling", "importance": "medium",
            "claimText": "Culhane et al. (2015) state that, while GPCRs in other families have a wide range of ligands, all family B receptors bind peptide hormones.",
            "plain": "Every receptor in one family of these receptors binds peptide hormones.",
            "notes": "Family B only. It does not say most peptide hormones act through GPCRs, which remains SOURCE NEEDED. Corroborates REC-27.",
            "uncertainty": REVIEW_UNCERTAINTY,
            "evidence": [ev("SRC-157", C_INTRO, 5, [
                "While GPCRs in other families have a wide range of ligands, such as small molecules, ions, lipids, and proteins, all family B receptors bind peptide hormones",
            ], "uncited", "A receptor family defined by peptide-hormone ligands.")],
        },
    ],
    "amino-acids-to-proteins": [
        {
            "claimKey": "FND-21", "category": "biochemistry", "importance": "medium",
            "claimText": "Brown et al. (2023) state that, since the genetically encoded set of 20 amino acids was established, the greatest deviations have been the addition of a 21st amino acid, selenocysteine, within some lineages of bacteria, archaea and eukaryotes, and a 22nd, pyrrolysine, in archaea and bacteria.",
            "plain": "Some living things use one or two amino acids beyond the standard 20.",
            "notes": "Introduction, paragraph 2, the same paragraph as FND-10. The source does not say which organisms use selenocysteine, including whether humans do; do not add it. The evolutionary time-scale framing is the authors' and is not carried.",
            "uncertainty": AMINO_UNCERTAINTY,
            "evidence": [ev("SRC-165", "1. Introduction", 2, [
                "the greatest deviations",
                "have been the addition of a 21st amino acid (Selenocysteine, Sec) within some lineages of bacteria",
                "and a 22nd (Pyrrolysine, Pyl), in two of these three domains",
            ], "cited", "Amino acids beyond the canonical twenty.")],
        },
    ],
}

SUPPLEMENT_NOTE = ("Supplemented 15 September 2026 by scripts/evidence/build-peptides-101-2026-09-15.py for the Peptides 101 "
                   "patient series, from sources already held, every quoted segment checked in full.")


# --- Checking -----------------------------------------------------------------

def norm(s: str) -> str:
    s = re.sub(r"\[[\d,\s–-]+\]", "", s)
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("‐", "-").replace("‑", "-").replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip().lower()


_lines: dict[str, list[str]] = {}


def lines_of(key: str) -> list[str]:
    if key not in _lines:
        _lines[key] = SNAPSHOT_OF[key].read_text(encoding="utf-8").splitlines()
    return _lines[key]


def locate(cid: str, e: dict) -> str:
    """Checks every segment in full and returns the derived locator text."""
    raw = lines_of(e["source"])
    normed = [norm(line) for line in raw]
    found: set[int] = set()
    for seg in e["segments"]:
        probe = norm(seg).strip(" .,;")
        hits = [i for i, line in enumerate(normed) if probe in line]
        if not hits:
            raise SystemExit(f"{cid}: segment not found in {e['source']}: {probe!r}")
        found.add(hits[0])
    if len(found) != 1:
        raise SystemExit(f"{cid}: segments span several paragraphs in {e['source']}: lines {sorted(found)}")
    i = found.pop()
    if raw[i].startswith("Abstract"):
        heading, para = "Abstract", 1
    else:
        j = i
        while j > 0 and not raw[j - 1].startswith("#"):
            j -= 1
        heading = raw[j - 1].lstrip("#").strip() if j > 0 else ""
        para = sum(1 for line in raw[j:i + 1] if line.strip())
    if (heading, para) != (e["heading"], e["para"]):
        raise SystemExit(f"{cid}: declared '{e['heading']}, paragraph {e['para']}' but passage is at "
                         f"'{heading}, paragraph {para}' in {e['source']}")
    return f"{heading}, paragraph {para}"


def check_author(cid: str, claim_text: str, source: str, manifest: dict) -> None:
    entry = next(s for s in manifest["sources"] if s["source_key"] == source)
    if entry.get("qc_status") != "usable" or entry.get("access_status") != "held":
        raise SystemExit(f"{cid}: {source} is not usable and held")
    first = re.match(r"^([A-Z][A-Za-zÀ-ÿ'’\-]+)", claim_text)
    surnames = {a.split()[0].lower() for a in entry.get("authors") or []}
    if first is None or first.group(1).lower() not in surnames:
        raise SystemExit(f"{cid}: claim does not open with an author of {source}")


def build_claims(specs: list[dict], manifest: dict, uncertainty: str | None) -> tuple[list, list]:
    locations, claims = [], []
    seen: set[str] = set()
    for c in specs:
        cid = c["claimKey"]
        if cid in seen:
            raise SystemExit(f"{cid}: duplicate claim key")
        seen.add(cid)
        evidence = []
        for n, e in enumerate(c["evidence"]):
            check_author(cid, c["claimText"], e["source"], manifest)
            locator = locate(cid, e)
            loc_key = cid.lower() if n == 0 else f"{cid.lower()}-{n + 1}"
            locations.append({"key": loc_key, "sourceKey": e["source"], "locatorText": locator,
                              "section": locator,
                              "notes": "Web full text; no page numbers. Located by section heading and paragraph."})
            evidence.append({
                "locationKey": loc_key,
                "evidenceTypeKey": "academic_reference",
                "interpretation": e["interpretation"],
                "primaryTrace": "cited_not_obtained",
                "primaryTraceNote": UNCITED_TRACE if e["trace"] == "uncited" else REVIEW_TRACE,
            })
        claims.append({
            "claimKey": cid,
            "claimText": c["claimText"],
            "plainLanguageText": c["plain"],
            "claimCategory": c["category"],
            "importance": c["importance"],
            "interpretationNotes": c["notes"],
            "uncertaintyText": c.get("uncertainty") or uncertainty,
            "evidence": evidence,
        })
    return locations, claims


def existing_keys() -> dict[str, str]:
    keys: dict[str, str] = {}
    for path in (ROOT / "data" / "seed").rglob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
        if isinstance(data, dict) and isinstance(data.get("claims"), list):
            for c in data["claims"]:
                if isinstance(c, dict) and "claimKey" in c:
                    keys[c["claimKey"]] = path.name
    return keys


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    taken = existing_keys()

    origin_file = LEARNING / "where-peptides-come-from.json"
    locations, claims = build_claims(ORIGIN_CLAIMS, manifest, WANG_UNCERTAINTY)
    for c in claims:
        if taken.get(c["claimKey"], origin_file.name) != origin_file.name:
            raise SystemExit(f"{c['claimKey']}: key already used in {taken[c['claimKey']]}")
    packet = {"packetKey": ORIGIN_TOPIC["topicKey"], "note": ORIGIN_NOTE, "topic": ORIGIN_TOPIC,
              "locations": locations, "claims": claims, "notYetSupported": ORIGIN_GAPS}
    origin_file.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{origin_file.name}: {len(claims)} claims, {len(ORIGIN_GAPS)} gaps")

    for name, specs in SUPPLEMENTS.items():
        path = LEARNING / f"{name}.json"
        target = json.loads(path.read_text(encoding="utf-8"))
        new_locations, new_claims = build_claims(specs, manifest, None)
        new_claim_keys = {c["claimKey"] for c in new_claims}
        new_location_keys = {l["key"] for l in new_locations}
        for key in new_claim_keys:
            if taken.get(key, path.name) != path.name:
                raise SystemExit(f"{key}: key already used in {taken[key]}")
        target["claims"] = [c for c in target["claims"] if c["claimKey"] not in new_claim_keys] + new_claims
        target["locations"] = [l for l in target["locations"] if l["key"] not in new_location_keys] + new_locations
        if SUPPLEMENT_NOTE not in target["note"]:
            target["note"] = f"{target['note']} {SUPPLEMENT_NOTE}"
        path.write_text(json.dumps(target, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"{path.name}: +{len(new_claims)} claims ({', '.join(sorted(new_claim_keys))})")


if __name__ == "__main__":
    main()
