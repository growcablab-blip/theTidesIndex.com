#!/usr/bin/env python3
"""
Foundational learning topics from permissively licensed sources.

    python -X utf8 scripts/evidence/build-foundations-2026-09-14.py

Owner decision D-26 (closed 14 September 2026): OpenStax is excluded. The
foundational questions of Understanding Peptides chapters One to Four, receptors,
general pharmacokinetics and routes of administration are answered from several
permissive sources — CC BY-type open-access articles, public-domain government
material — each registered and cited as itself.

Reads the extraction results in the scratchpad (one results.json per question
area), and for every source that passed licence and bibliographic checks:

  - re-verifies each accepted quote word for word against the retrieved text,
    and refuses to write if one is missing;
  - registers the source in SOURCE_MANIFEST.json, reusing the key of a source
    already registered under the same DOI;
  - copies the retrieved text into data/private/source-snapshots/foundations/
    (gitignored), pinned by hash;
  - writes one learning packet per area into data/seed/learning/.

Editorial decisions live in this file, not in the scratchpad: EXCLUDE drops a
candidate, REWORD tightens its wording, and GAPS records what stays SOURCE
NEEDED. Only claims the publications need are taken. Idempotent.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRATCH = Path(r"C:\Users\ianbu\AppData\Local\Temp\claude\C--The-Tides-Index"
               r"\32f9e6c6-4fcf-4e60-b98b-623e91076bee\scratchpad\foundations2")
SNAP = ROOT / "data" / "private" / "source-snapshots" / "foundations"
HELD_REVIEWS = ROOT / "data" / "private" / "source-snapshots" / "reviews"
MANIFEST = ROOT / "SOURCE_MANIFEST.json"
TODAY = "2026-09-14"

# Packet id -> definition. "dir" is the extraction area in the scratchpad;
# "include" lists the candidates this packet takes from it.
REVIEW_UNCERTAINTY = ("Foundational statement from a peer-reviewed review, not a systematic review. It describes "
                      "general biology and says nothing about any peptide product or treatment.")

AREAS: dict[str, dict] = {
    "peptides-in-the-body": {
        "dir": "ch3-4",
        "include": ["END-03", "END-04", "END-05", "END-06", "END-07", "END-08", "END-09", "END-10",
                    "END-11", "END-12", "END-13"],
        "category": "physiology",
        "uncertainty": REVIEW_UNCERTAINTY,
        "topic": {
            "topicKey": "peptides-in-the-body",
            "slug": "peptides-in-the-body",
            "title": "Peptides the body makes",
            "publicationChapter": "Understanding Peptides — Three: Peptides in the human body",
            "summary": "What reviews of physiology say about the body's own peptides: the classes they fall into, how they are made from larger precursors, stored and released, how they are broken down, and why what a peptide does depends on context. General biology, not statements about any peptide product.",
            "notes": "Growth factors as a class, a general statement that the body's peptides are short-lived, and the inference that 'the body makes it' is not an argument about safety or efficacy are not stated by any source held, and are recorded as gaps.",
        },
        "note": ("Extracted 14 September 2026 from permissively licensed reviews (CC BY, or public domain for the 1998 US government "
                 "overview), each licence read in the retrieved full text, with no text-and-data-mining or AI restriction found. "
                 "OpenStax is excluded (D-26). Elphick et al. 2018 was not used: it carries a published correction whose text could "
                 "not be obtained. Every quote was checked word for word against the retrieved text. Endogenous examples are the "
                 "sources' own; none is a statement about treatment."),
    },
    "peptide-signalling": {
        "dir": "ch3-4",
        "include": ["SIG-01", "SIG-02", "SIG-03", "SIG-04", "SIG-05", "SIG-06", "SIG-07", "SIG-09", "SIG-12", "SIG-13"],
        "category": "cell-signalling",
        "uncertainty": REVIEW_UNCERTAINTY,
        "topic": {
            "topicKey": "peptide-signalling",
            "slug": "peptide-signalling",
            "title": "How peptide signalling works",
            "publicationChapter": "Understanding Peptides — Four: How peptide signalling works; Peptide Science & Applications — Four (signalling half)",
            "summary": "Hormones and other messengers act only on cells carrying their receptor; peptide hormones act at the cell surface; binding starts a chain of reactions inside the receiving cell; the same signal can have different effects through different receptor subtypes; and signals are switched off. General cell biology.",
            "notes": "Definitions of paracrine and autocrine signalling are not stated explicitly by any source held. The statement that peptide hormones cannot enter cells comes from a 1998 general overview and is worded categorically.",
        },
        "note": ("Extracted 14 September 2026 from permissively licensed reviews (CC BY 4.0, or public domain for the 1998 US "
                 "government overview), each licence read in the retrieved full text, with no AI restriction found. OpenStax is "
                 "excluded (D-26). Two GLP-1-receptor statements from a metabolism review were not used, to keep a patient "
                 "chapter free of compound-adjacent detail. Every quote was checked word for word."),
    },
    "what-is-a-peptide": {
        "dir": "ch1-2",
        "include": ["FND-01", "FND-02", "FND-03", "FND-04", "FND-05", "FND-06", "FND-07", "FND-16",
                    "FND-17", "FND-18", "FND-19"],
        "category": "biochemistry",
        "uncertainty": ("Foundational statement from a peer-reviewed review or a US government glossary. Definitions "
                        "of 'peptide' are conventions and differ between sources; none describes any peptide product."),
        "topic": {
            "topicKey": "what-is-a-peptide",
            "slug": "what-is-a-peptide",
            "title": "What a peptide is",
            "publicationChapter": "Understanding Peptides — One: What is a peptide?",
            "summary": "A peptide is a chain of amino acids joined by peptide bonds; where a peptide ends and a protein begins is a convention that sources set differently; and the difference in size matters for how molecules are made, stored and tested.",
            "notes": "What the two ends of a chain (N- and C-terminus) and a 'residue' are, and how measurement changes with chain size, are not stated by any permissive source held.",
        },
        "note": ("Extracted 14 September 2026 from CC BY reviews and the public-domain NHGRI Talking Glossary ('Courtesy: "
                 "National Human Genome Research Institute'), each licence read in the retrieved text, with no AI restriction "
                 "found. OpenStax is excluded (D-26). A passage giving the smallest and largest proteins was not used: its "
                 "superlatives are the review's cited claims and were not checked. Every quote was checked word for word."),
    },
    "amino-acids-to-proteins": {
        "dir": "ch1-2",
        "include": ["FND-08", "FND-09", "FND-10", "FND-11", "FND-12", "FND-13", "FND-14", "FND-15"],
        "category": "biochemistry",
        "uncertainty": "Foundational statement from a peer-reviewed review. General biochemistry, not about any peptide product.",
        "topic": {
            "topicKey": "amino-acids-to-proteins",
            "slug": "amino-acids-to-proteins",
            "title": "Amino acids, peptides, proteins",
            "publicationChapter": "Understanding Peptides — Two: Amino acids, peptides, proteins",
            "summary": "Amino acids share a common backbone and differ by their side chains; twenty make up the standard set; the sequence is the primary structure, and it carries the information for folding into secondary and tertiary structure.",
            "notes": "What else changes as a chain gets longer — stability, immune recognition — is not stated by any permissive source held.",
        },
        "note": ("Extracted 14 September 2026 from CC BY reviews in Essays in Biochemistry, Biochemical Journal, Life and "
                 "Antibiotics, each licence read in the retrieved full text, with no AI restriction found. OpenStax is excluded "
                 "(D-26). Every quote was checked word for word."),
    },
    "receptor-pharmacology": {
        "dir": "receptors",
        "include": ["REC-01", "REC-02", "REC-03", "REC-04", "REC-05", "REC-06", "REC-09", "REC-10", "REC-11",
                    "REC-12", "REC-13", "REC-14", "REC-15", "REC-16", "REC-17", "REC-18", "REC-19", "REC-20",
                    "REC-21", "REC-22", "REC-24", "REC-25", "REC-26", "REC-27"],
        "category": "pharmacology",
        "uncertainty": ("General receptor pharmacology from peer-reviewed English-language sources. Several illustrate a "
                        "principle with one drug class; applying the principle to peptides is an extrapolation and is "
                        "labelled as one. Nothing here says which receptor any peptide acts on."),
        "topic": {
            "topicKey": "receptor-pharmacology",
            "slug": "receptor-pharmacology",
            "title": "Receptors, agonists and antagonists (English sources)",
            "publicationChapter": "Understanding Peptides — Five: Receptors; Peptide Science & Applications — Four: Receptors, signalling and modulation",
            "summary": "Kinds of drug target; binding as the basis of action; affinity and efficacy and why they cannot simply be measured apart; full, partial and inverse agonists; antagonists; spare receptors; constitutive activity; biased agonism; allosteric modulation; desensitisation, tachyphylaxis and tolerance; and why selectivity is relative. Corroborates, and in one place qualifies, the claims read from the Spanish sample of Rang and Dale.",
            "notes": "Tolerance from mediator depletion, a clean definition of surmountable competitive antagonism, and a statement that most peptide hormones act through GPCRs are not in any permissive source held.",
        },
        "note": ("Extracted 14 September 2026 from fourteen CC BY 4.0 articles, each licence read in the retrieved full text, "
                 "with no text-and-data-mining or AI restriction found. OpenStax is excluded (D-26). Not used: two passages "
                 "on the occupancy equation from a lower-selectivity venue; an opioid-specific, largely preclinical account of "
                 "pharmacokinetic tolerance; and a structural review that discloses an AI-drafted summary. The selectivity "
                 "statements come from anaesthetic pharmacology and carry that label; a published comment on that article was "
                 "not read. Every quote was checked word for word."),
    },
    "pharmacokinetic-concepts": {
        "dir": "pk-routes",
        "include": ["PKG-01", "PKG-02", "PKG-03", "PKG-04", "PKG-05", "PKG-06", "PKG-07", "PKG-08", "PKG-12",
                    "PKG-13", "PKG-14", "PKG-15", "PKG-17", "PKG-18", "PKG-19", "PKG-20", "PKG-21"],
        "category": "pharmacokinetics",
        "uncertainty": ("General pharmacokinetic definitions and peptide-specific generalisations from peer-reviewed "
                        "open-access reviews, the NCI Thesaurus (CC BY 4.0) and US federal regulation (public domain). "
                        "Nothing here is a statement about any peptide product, and nothing here is dosing guidance."),
        "topic": {
            "topicKey": "pharmacokinetic-concepts",
            "slug": "pharmacokinetic-concepts",
            "title": "Pharmacokinetic concepts",
            "publicationChapter": "Peptide Science & Applications — Five: Interpreting pharmacokinetics; Understanding Peptides — Seven (in part)",
            "summary": "Absorption, distribution, metabolism and elimination; Cmax, Tmax and AUC; half-life, volume of distribution, clearance and bioavailability as defined terms; first-pass metabolism; and how the pharmacokinetics of peptides differ from small molecules — proteolysis, renal filtration, a small volume of distribution, and factors whose effect on peptides is not well established.",
            "notes": "Time to steady state, what half-life does and does not tell you, general plasma protein binding, and absolute versus relative bioavailability are not stated by any permissive source held, and are recorded as gaps.",
        },
        "note": ("Extracted 14 September 2026 from CC BY 4.0 reviews, the NCI Thesaurus (CC BY 4.0, NCI-authored definitions "
                 "only) and 21 CFR 314.3 (US federal regulation, public domain; 2025 edition via govinfo.gov). Each licence "
                 "or terms statement was read at the source, with no AI restriction found. OpenStax is excluded (D-26). Not used: "
                 "a single-author review of oral peptide pharmacokinetics that discusses products and dosing intervals; an "
                 "illustration drawn from specific anti-diabetic products; and a protein-binding statement limited to the "
                 "blood-brain barrier. Every quote was checked word for word. No dose, interval or product figure is carried."),
    },
    "routes-of-administration": {
        "dir": "pk-routes",
        "include": ["RTE-01", "RTE-02", "RTE-03", "RTE-04", "RTE-05", "RTE-06", "RTE-07", "RTE-08", "RTE-09",
                    "RTE-10", "RTE-11", "RTE-12", "RTE-13", "RTE-14", "RTE-16", "RTE-17", "RTE-19", "RTE-20",
                    "RTE-21", "RTE-22", "RTE-23", "RTE-24", "RTE-25", "RTE-26", "RTE-27", "RTE-28"],
        "category": "routes-of-administration",
        "uncertainty": ("Route definitions from the FDA's data standards (public domain) and the NCI Thesaurus (CC BY 4.0), "
                        "and route characteristics from peer-reviewed open-access reviews, several written for antibodies or "
                        "other macromolecules. Describes routes; says nothing about how any product should be given."),
        "topic": {
            "topicKey": "routes-of-administration",
            "slug": "routes-of-administration",
            "title": "Routes of administration",
            "publicationChapter": "Understanding Peptides — Seven: Routes of administration; Peptide Science & Applications — Five (routes)",
            "summary": "What each route is, as the FDA's data standards define it, and what each demands: subcutaneous and intramuscular absorption through blood and lymph, breakdown at the injection site, limits on injection volume, and the barriers facing nasal, transdermal, inhaled, sublingual and buccal delivery of large molecules.",
            "notes": "Sterility as a requirement of injectable products, systemic absorption of inhaled peptides, and route-specific stability demands in general are not stated by any permissive source held, and are recorded as gaps.",
        },
        "note": ("Extracted 14 September 2026 from the FDA CDER Data Standards Manual route monograph (US government work, "
                 "public domain; page current as of 14 November 2017), the NCI Thesaurus (CC BY 4.0) and CC BY 4.0 reviews, "
                 "each licence or terms statement read at the source, with no AI restriction found. OpenStax is excluded (D-26). "
                 "Not used: a subcutaneous absorption model's simulated size thresholds, and an injectable dosage-form definition "
                 "that the thesaurus takes from another terminology. Every quote was checked word for word."),
    },
}

# Candidate ids dropped after review, with the reason recorded here.
EXCLUDE: dict[str, str] = {
    "END-01": "Elphick et al. 2018 has a published correction whose text could not be obtained; covered by END-03.",
    "END-02": "As END-01.",
    "SIG-08": "As END-01; the GPCR point is covered by SIG-07.",
    "SIG-10": "GLP-1 receptor coupling: compound-adjacent detail not needed for a patient chapter.",
    "SIG-11": "Its sentence gives an incomplete structural description of protein kinase A.",
    "FND-20": "Smallest and largest protein superlatives are the review's cited claims, not checked.",
    "REC-07": "Occupancy hyperbola: lower-selectivity venue; a stronger source is needed.",
    "REC-08": "As REC-07.",
    "REC-23": "Opioid-specific, largely preclinical account of pharmacokinetic tolerance.",
    "REC-28": "The article discloses an AI-drafted summary; not used.",
    "PKG-09": "Single-author review arguing a position and discussing products; steady state left SOURCE NEEDED.",
    "PKG-10": "As PKG-09, and dosing-interval framing.",
    "PKG-11": "Illustration drawn from specific anti-diabetic products.",
    "PKG-16": "Protein binding stated only for the blood-brain barrier.",
    "RTE-15": "Model simulation, not observed data; RTE-13 covers the point.",
    "RTE-18": "Definition taken by the thesaurus from CDISC, not NCI-authored.",
}

# The pharmacokinetics extraction labelled two sources by the wrong first author;
# PubMed gives Mahmood I (PMID 35076485) and Pitiot A (PMID 36134952).
AUTHOR_FIX: dict[str, list[tuple[str, str]]] = {
    **{cid: [("Zhu et al.", "Mahmood and Pettinato")] for cid in ("PKG-17", "PKG-18", "PKG-19", "PKG-20", "RTE-13", "RTE-14")},
    **{cid: [("Jiang et al.", "Pitiot et al.")] for cid in ("RTE-12", "RTE-16")},
    # Two-author papers are named by both authors, not "et al.".
    **{cid: [("Higham et al.", "Higham and Colquhoun")] for cid in ("REC-06", "REC-09")},
}

LEADING_AUTHOR = re.compile(r"^([A-Z][A-Za-zÀ-ÿ'’\-]+)(?:(?:,? (?:and|&) [A-Z][A-Za-zÀ-ÿ'’\-]+)?(?: et al\.)? \(\d{4}| et al\.)")

# Candidate id -> {"claimText": ..., "plainLanguageText": ...}.
REWORD: dict[str, dict] = {
    "SIG-03": {"plainLanguageText": "An overview of hormones states that peptide hormones cannot get inside cells, so they pass their message through receptors on the cell's outer surface."},
    "END-09": {"plainLanguageText": "One example given in a review: the body's own GLP-1 is quickly broken down by an enzyme."},
    "FND-07": {"plainLanguageText": "When two amino acids join by a peptide bond, a molecule of water is released."},
    "REC-25": {"claimText": "Kale et al. (2026) argue that most general anaesthetic agents bind several targets, with far less selectivity than common terminology implies; this is evidence about anaesthetics, and applying it to other molecules is an extrapolation.",
               "plainLanguageText": "Research on anaesthetics finds that drugs described as acting on one receptor often act on several."},
    "REC-26": {"claimText": "Kale et al. (2026) suggest that effects seen at high doses of anaesthetic agents may involve receptors other than an agent's most potent target.",
               "plainLanguageText": "Researchers suggest that, at higher amounts, a drug may start acting on receptors beyond its main one."},
    "PKG-06": {"claimText": "Yousef et al. (2024) describe clearance as the aggregate of all the elimination processes, and state that when clearance stays constant, exposure over a dosing interval at steady state equals total exposure after a single dose.",
               "plainLanguageText": "Clearance sums up all the ways the body removes a drug."},
    "PKG-08": {"plainLanguageText": "Half-life is the time it takes for half of a substance to be removed from the blood or the body."},
    "RTE-24": {"claimText": "A 2022 review of pulmonary delivery (Pharmaceutics), writing about therapy aimed at the lung, lists major barriers including the cough reflex after inhalation, low delivery efficiency to target lung regions, and rapid loss of active molecules from the lung by degradation, clearance or systemic absorption.",
               "plainLanguageText": "For medicines meant to act in the lung, a review lists coughing, difficulty reaching the right part of the lung, and quick breakdown or removal as barriers."},
    "REC-24": {"claimText": "Horowitz et al. (2026), reviewing benzodiazepine pharmacology, state that adaptations to a substance cause tolerance during exposure and predict withdrawal when it is removed.",
               "plainLanguageText": "A review of one group of medicines explains that the body adapts to a substance over time, which blunts its effect and can cause problems when it is stopped."},
}

# Packet id -> gaps for subsections left SOURCE NEEDED.
GAPS: dict[str, list] = {
    "peptides-in-the-body": [
        {"gapType": "source_missing",
         "statement": "Growth factors as a class of signals made by the body.",
         "why": "No permissively licensed source retrieved describes them as a class.",
         "whatWouldResolveIt": "A CC BY-type review of growth factors, obtained and read."},
        {"gapType": "source_missing",
         "statement": "That the body's own peptides are, as a general rule, short-lived and cleared by peptidases.",
         "why": "The sources held describe enzymatic breakdown of neuropeptides and give one hormone example; none states the general rule.",
         "whatWouldResolveIt": "A permissively licensed review of peptide hormone clearance."},
        {"gapType": "source_missing",
         "statement": "That 'the body makes it' is not, by itself, an argument about safety or efficacy.",
         "why": "The facts it would rest on are sourced — effects depend on context, concentration and receptors, and hormone levels are held within range by feedback — but no source draws the conclusion, and this index does not draw it for them.",
         "whatWouldResolveIt": "A source that states the inference, or a scientific reviewer's approval of it as an editorial conclusion labelled as such."},
    ],
    "what-is-a-peptide": [
        {"gapType": "source_missing",
         "statement": "What the N-terminus and C-terminus of a chain are, and what 'residue' means.",
         "why": "No permissively licensed source retrieved defines them.",
         "whatWouldResolveIt": "A CC BY-type biochemistry review or public-domain glossary entry that defines them."},
        {"gapType": "source_missing",
         "statement": "How the way a molecule is measured changes with chain length.",
         "why": "The sources state that identity, purity and activity are characterised for peptides and proteins, but not how methods differ with size.",
         "whatWouldResolveIt": "A permissively licensed analytical review comparing peptide and protein characterisation."},
    ],
    "amino-acids-to-proteins": [
        {"gapType": "source_missing",
         "statement": "What else changes as a chain gets longer, such as stability or recognition by the immune system.",
         "why": "The sources cover folding and structure; none states these length effects in general terms.",
         "whatWouldResolveIt": "A permissively licensed review addressing length-dependent properties."},
    ],
    "receptor-pharmacology": [
        {"gapType": "source_missing",
         "statement": "That most peptide hormones act through G-protein-coupled receptors.",
         "why": "The nomenclature guide states that one GPCR family binds polypeptide hormones and that class A includes peptide receptors; no permissive source held states the general proportion.",
         "whatWouldResolveIt": "A permissively licensed source stating it."},
        {"gapType": "source_missing",
         "statement": "Tolerance arising from depletion of a mediator, and a definition of competitive antagonism as surmountable.",
         "why": "Not stated by any permissive source retrieved; the Spanish sample of Rang and Dale states both but is not permissively licensed and is a translation.",
         "whatWouldResolveIt": "A permissively licensed pharmacology review covering them."},
        {"gapType": "source_missing",
         "statement": "The concentration–occupancy relation from a strong source.",
         "why": "The only permissive account retrieved is in a lower-selectivity venue and was not used.",
         "whatWouldResolveIt": "A CC BY-type pharmacology tutorial deriving or stating it."},
    ],
    "pharmacokinetic-concepts": [
        {"gapType": "source_missing",
         "statement": "How long repeated administration takes to reach steady state, expressed in half-lives, and how long a substance takes to be eliminated.",
         "why": "The only permissive statement retrieved is in a single-author review that discusses products and dosing intervals, and was not used.",
         "whatWouldResolveIt": "A permissively licensed pharmacokinetics tutorial stating it."},
        {"gapType": "source_missing",
         "statement": "What half-life does not tell you: its dependence on clearance and volume of distribution, and why an effect can outlast a substance's presence in the blood.",
         "why": "Not stated in general terms by any permissive source retrieved.",
         "whatWouldResolveIt": "A permissively licensed pharmacokinetics tutorial stating it."},
        {"gapType": "source_missing",
         "statement": "Plasma protein binding in general, and absolute versus relative bioavailability.",
         "why": "The protein-binding statement retrieved is limited to the blood-brain barrier; no permissive source distinguishes absolute and relative bioavailability.",
         "whatWouldResolveIt": "A permissively licensed pharmacokinetics source covering both."},
    ],
    "routes-of-administration": [
        {"gapType": "source_missing",
         "statement": "Sterility as a requirement of products given by injection, stated as a route demand.",
         "why": "The only definition retrieved is one the NCI Thesaurus takes from another terminology; sterility expectations for licensed sterile products are held on the quality pages from EU GMP Annex 1 and USP <71>, which describe manufacturing, not routes.",
         "whatWouldResolveIt": "A permissively licensed source stating that parenteral routes require sterile products."},
        {"gapType": "source_missing",
         "statement": "Whether, and how well, inhaled peptides are absorbed into the body.",
         "why": "The pulmonary review retrieved is written about therapy aimed at the lung.",
         "whatWouldResolveIt": "A permissively licensed review of systemic pulmonary peptide delivery."},
    ],
    "peptide-signalling": [
        {"gapType": "terminology_unresolved",
         "statement": "Plain definitions of paracrine and autocrine signalling.",
         "why": "The sources name these modes and define endocrine signalling, but do not define the other two explicitly.",
         "whatWouldResolveIt": "A permissively licensed source defining them."},
    ],
}

PERMITTED = re.compile(r"creativecommons\.org/(licenses/by(-sa)?/|publicdomain/(zero|mark)/)|cc by(-sa)? [34]\.0|cc by|"
                       r"creative commons attribution(-sharealike)? [34]\.0|cc0|public domain", re.I)
FORBIDDEN = re.compile(r"creativecommons\.org/licenses/by-(nc|nd)|cc by-nc|cc by-nd|noncommercial|non-commercial|noderivatives|no derivatives", re.I)

REVIEW_TRACE = "A review. The primary studies it cites have not been obtained and read by this index."
UNCITED_TRACE = "The review's own statement, with no citation attached; nothing behind it can be traced."
GOV_TRACE = "The issuing body's own document, retrieved from it and read."
GOV_EVIDENCE_TYPE = {
    "cfr-21-314-3-definitions": "regulatory_reference",
    "fda-dsm-route-of-administration": "regulatory_reference",
}


def norm(s: str) -> str:
    s = re.sub(r"\[[\d,\s–-]+\]", "", s)
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("‐", "-").replace("‑", "-").replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip().lower()


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def resolve(area_dir: Path, rel: str | None) -> Path | None:
    if not rel:
        return None
    p = Path(rel)
    if not p.is_absolute():
        p = area_dir / rel
    return p if p.exists() else None


def check_quote(cid: str, text: str, quote: str) -> None:
    for part in re.split(r"\s*(?:…|\.\.\.)\s*", quote):
        words = norm(part).strip(" .,;:").split()
        if not words:
            continue
        probe = " ".join(words[: min(len(words), 12)])
        if probe not in text:
            raise SystemExit(f"{cid}: quote not found in retrieved text: {probe!r}")


def next_key(manifest: dict) -> int:
    return max(int(s["source_key"].split("-")[1]) for s in manifest["sources"]) + 1


def register(manifest: dict, src: dict, area_dir: Path) -> str:
    licence = f"{src.get('licence', '')} {src.get('licenceEvidence', '')}"
    if FORBIDDEN.search(licence) or not PERMITTED.search(licence):
        raise SystemExit(f"{src.get('slug')}: licence not permitted: {licence[:200]}")
    restriction = (src.get("aiOrTdmRestriction") or "").strip().lower()
    if restriction and not restriction.startswith("none"):
        raise SystemExit(f"{src.get('slug')}: AI/TDM restriction recorded: {restriction[:200]}")

    doi = (src.get("doi") or "").lower() or None
    pmid = src.get("pmid") or None
    url = src.get("url") or (src.get("article") if str(src.get("article") or "").startswith("http") else None)
    existing = next((s for s in manifest["sources"]
                     if (doi and (s.get("doi") or "").lower() == doi)
                     or (pmid and s.get("pmid") == pmid)
                     or (url and s.get("canonical_url") == url)), None)
    if existing is not None:
        return existing["source_key"]

    text_path = resolve(area_dir, src.get("textFile"))
    if text_path is None:
        raise SystemExit(f"{src.get('slug')}: retrieved text missing")
    SNAP.mkdir(parents=True, exist_ok=True)
    snapshot = SNAP / f"{src['slug']}.txt"
    shutil.copy2(text_path, snapshot)
    xml_path = resolve(area_dir, src.get("xmlFile"))
    if xml_path is not None:
        shutil.copy2(xml_path, SNAP / f"{src['slug']}{xml_path.suffix}")

    key = f"SRC-{next_key(manifest)}"
    government = not src.get("pmid")
    pinned = src.get("sha256")
    if not isinstance(pinned, str) or len(pinned) < 16:
        # Some extractions record several hashes; pin the file actually kept.
        pinned = sha(xml_path or snapshot)
    entry = {
        "source_key": key, "title": src["title"], "authors": src.get("authors") or [],
        "year": int(str(src["year"])) if str(src.get("year") or "").isdigit() else None,
        "source_type": "other" if government else "systematic_review_meta_analysis",
        "priority": "core", "qc_status": "usable", "public_fulltext_allowed": False,
        "canonical_filename": None, "known_local_filename": None, "isbn": None,
        "edition": (f"Volume {src['volume']}, article {src['article']}" if src.get("volume") else None),
        "publisher": src.get("publisher") or ((src.get("authors") or [None])[0] if government else None),
        "publication_name": src.get("journal"),
        "local_file_sha256": None, "local_file_bytes": None, "page_count": None,
        "printed_page_offset": None, "title_page_verified": False, "bibliographic_verified": True,
        "title_page_title": None, "title_page_authors": None, "verified_at": TODAY,
        "verified_by": ("Europe PMC full-text XML and PubMed record." if src.get("pmid")
                        else "Retrieved from the issuing body; terms statement read."),
        "authority_notes": (f"Peer-reviewed open-access article ({src.get('pmcid') or 'no PMCID'}); bibliographic fields confirmed against PubMed (PMID {src.get('pmid')})."
                            if src.get("pmid") else "Government or standards material, retrieved from the issuing body."),
        "limitations_notes": (("A US government reference page: a definition as the issuing body states it, one convention among several, "
                               "not a scientific finding. Page date not stated beyond the access date. "
                               if government else
                               "A review, not a systematic review unless it says so: its statements characterise literature this index has not read. "
                               "Used for general, foundational statements only. ") + (src.get("qualityNotes") or "")).strip(),
        "integrity_notes": (f"Licence as stated in the retrieved full text: {src.get('licenceEvidence')}. No text-and-data-mining or AI restriction found. "
                            f"Retrieved {TODAY}; text snapshot data/private/source-snapshots/foundations/{snapshot.name} (sha256 {pinned[:16]})."),
        "doi": doi, "pmid": src.get("pmid"), "trial_registry_id": None,
        "canonical_url": (f"https://doi.org/{doi}" if doi else url),
        "primary_role": src.get("role") or "Foundational statements for Understanding Peptides and Peptide Science & Applications.",
        "access_status": "held",
        "access_notes": "Open access; full text retrieved from the publisher or Europe PMC and pinned by identifier, date and hash. No file in sources/.",
    }
    manifest["sources"].append(entry)
    return key


def build_area(area: str, spec: dict, manifest: dict) -> dict:
    area_dir = SCRATCH / spec["dir"]
    results = json.loads((area_dir / "results.json").read_text(encoding="utf-8"))
    wanted = {c["sourceSlug"] for c in results["candidates"]
              if c["id"] not in EXCLUDE and (not spec.get("include") or c["id"] in spec["include"])}
    slug_key: dict[str, str] = {}
    texts: dict[str, str] = {}
    for src in results["sources"]:
        if src["slug"] not in wanted:
            continue
        key = register(manifest, src, area_dir)
        slug_key[src["slug"]] = key
        path = resolve(area_dir, src.get("textFile")) or (SNAP / f"{src['slug']}.txt")
        texts[src["slug"]] = norm(path.read_text(encoding="utf-8"))
    # Sources already held by the index may be cited by slug.
    for slug, key in spec.get("heldSources", {}).items():
        slug_key[slug] = key
        texts[slug] = norm((HELD_REVIEWS / f"{slug}.txt").read_text(encoding="utf-8"))

    locations, claims = [], []
    for c in results["candidates"]:
        cid = c["id"]
        if cid in EXCLUDE or (spec.get("include") and cid not in spec["include"]):
            continue
        slug = c["sourceSlug"]
        if slug not in slug_key:
            raise SystemExit(f"{cid}: source {slug} was not accepted")
        check_quote(cid, texts[slug], c["quote"])
        key = slug_key[slug]
        loc_key = cid.lower()
        locations.append({"key": loc_key, "sourceKey": key, "locatorText": c["locator"][:300],
                          "section": c["locator"][:300],
                          "notes": "Web full text; no page numbers. Located by section heading and paragraph."})
        trace = c.get("primaryTrace", "cited_not_obtained")
        government = not next((s for s in results["sources"] if s["slug"] == slug), {}).get("pmid") and slug not in spec.get("heldSources", {})
        words = REWORD.get(cid, {})
        claim_text = words.get("claimText", c["proposedClaim"])
        for wrong, right in AUTHOR_FIX.get(cid, []):
            claim_text = claim_text.replace(wrong, right)
        named = LEADING_AUTHOR.match(claim_text)
        if named and not government:
            entry = next(s for s in manifest["sources"] if s["source_key"] == key)
            surnames = {a.split()[0].lower() for a in entry.get("authors") or []}
            if named.group(1).lower() not in surnames:
                raise SystemExit(f"{cid}: claim names '{named.group(1)}', not an author of {key}")
            authors = entry.get("authors") or []
            if " et al." in named.group(0) and len(authors) <= 2:
                # One or two authors are named in full, from the verified record.
                who = " and ".join(a.split()[0] for a in authors)
                claim_text = claim_text.replace(f"{named.group(1)} et al.", who, 1)
        claims.append({
            "claimKey": cid,
            "claimText": claim_text,
            "plainLanguageText": words.get("plainLanguageText", c["plainLanguage"]),
            "claimCategory": spec["category"],
            "importance": "medium",
            "interpretationNotes": c.get("scopeNote") or "A definitional statement, taken as the source states it.",
            "uncertaintyText": spec["uncertainty"],
            "evidence": [{
                "locationKey": loc_key,
                "evidenceTypeKey": GOV_EVIDENCE_TYPE.get(slug, "academic_reference"),
                "interpretation": c.get("scopeNote") or "A definitional statement, taken as the source states it.",
                "primaryTrace": "primary_source_is_cited" if government else "cited_not_obtained",
                "primaryTraceNote": GOV_TRACE if government else (UNCITED_TRACE if trace == "uncited_in_review" else REVIEW_TRACE),
            }],
        })
    if not claims:
        raise SystemExit(f"{area}: no claims")
    return {
        "packetKey": spec["topic"]["topicKey"],
        "note": spec["note"],
        "topic": spec["topic"],
        "locations": locations,
        "claims": claims,
        "notYetSupported": GAPS.get(area, []),
    }


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for area, spec in AREAS.items():
        packet = build_area(area, spec, manifest)
        out = ROOT / "data" / "seed" / "learning" / f"{spec['topic']['topicKey']}.json"
        out.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"{area}: {len(packet['claims'])} claims, {len(packet['notYetSupported'])} gaps -> {out.name}")
    manifest["sources"].sort(key=lambda s: int(s["source_key"].split("-")[1]))
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"manifest: {len(manifest['sources'])} sources")


if __name__ == "__main__":
    main()
