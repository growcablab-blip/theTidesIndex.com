#!/usr/bin/env python3
"""
Intake of the owner's 14 September 2026 source batch, plus the trial documents
this index downloaded itself.

    python -X utf8 scripts/sources/register-batch-2026-09-14.py

The owner folder is an INTAKE directory, not a library. Nothing is copied into
sources/ merely because it arrived. Every file is hashed and inspected, and only
files that passed inspection are copied — under a canonical name, never moving
or altering the owner's original. Duplicates, advertisements, mislabelled files
and derivatives stay where they are and are recorded as such.

Two outputs:

  data/sources/intake-2026-09-14.json   every file considered, with disposition
                                         (committed: no content, only identity)
  SOURCE_MANIFEST.json                   upserted entries for the sources

Idempotent: re-running recomputes hashes and rewrites the same entries.
"""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[2]
INTAKE = Path(r"C:\Velara Medical\Research Docs")
SCRATCH_DOWNLOADS = Path(
    r"C:\Users\ianbu\AppData\Local\Temp\claude\C--The-Tides-Index"
    r"\32f9e6c6-4fcf-4e60-b98b-623e91076bee\scratchpad\intake"
)
SOURCES = ROOT / "sources"
REGISTRY_DIR = ROOT / "data" / "sources" / "registry"
TODAY = "2026-09-14"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def pages(path: Path) -> int | None:
    if path.suffix.lower() != ".pdf":
        return None
    with fitz.open(path) as d:
        return d.page_count


# ---------------------------------------------------------------------------
# Files copied into sources/ (the citable working copy of a registered source)
# ---------------------------------------------------------------------------
COPIES = {
    # source_key: (origin path, canonical filename)
    "SRC-121": (INTAKE / "951650680-Rang-Dale-Farmacologia.pdf",
                "Rang_y_Dale_Farmacologia_10ed_ES_2024_sample.pdf"),
    "SRC-123": (SCRATCH_DOWNLOADS / "pardeshi.pdf",
                "Pardeshi_2023_FutJPharmSci_9-99_freeze-drying_review.pdf"),
    "SRC-124": (INTAKE / "EudraLex Volume 4 Annex 1 Manufacture of Sterile Medicinal Products 2022 revision.pdf",
                "EudraLex_Vol4_GMP_Annex1_Sterile_Products_2022.pdf"),
    "SRC-125": (INTAKE / "ORA.007 Pharmaceutical Microbiology Manual.pdf",
                "FDA_ORA007_Pharmaceutical_Microbiology_Manual_Rev02_2020.pdf"),
    "SRC-022": (INTAKE / "484472225-USP-NF-71-Sterility-Tests.pdf",
                "USP71_Sterility_Tests_EN_print_2020-10-15.pdf"),
    "SRC-023": (INTAKE / "795375586-USP-NF-85-Bacterial-Endotoxins-Test.pdf",
                "USP85_Bacterial_Endotoxins_Test_EN_print_2024-11-21.pdf"),
    "SRC-030": (INTAKE / "Lee, Walker & Ayadi Effect of BPC-157.pdf",
                "Lee_Walker_Ayadi_2024_AlternTherHealthMed_30-10_BPC157_IC.pdf"),
    "SRC-050": (INTAKE / "Triple-Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial.pdf",
                "Jastreboff_2023_NEJM_389-514_retatrutide_obesity_phase2.pdf"),
    "SRC-051": (next(INTAKE.glob("Sanyal et al.*")),
                "Sanyal_2024_NatMed_30-2037_retatrutide_MASLD.pdf"),
    "SRC-127": (SCRATCH_DOWNLOADS / "Prot_000.pdf",
                "NCT04867785_Protocol_J1I-MC-GZBD_amendment-c_2022-08-29.pdf"),
    "SRC-128": (SCRATCH_DOWNLOADS / "SAP_001.pdf",
                "NCT04867785_SAP_J1I-MC-GZBD_v3_2022-12-13.pdf"),
    "SRC-130": (SCRATCH_DOWNLOADS / "NCT04881760_Prot_000.pdf",
                "NCT04881760_Protocol_J1I-MC-GZBF_amendment-b_2022-08-29.pdf"),
    "SRC-131": (SCRATCH_DOWNLOADS / "NCT04881760_SAP_001.pdf",
                "NCT04881760_SAP_J1I-MC-GZBF_v4_2022-12-15.pdf"),
}

REGISTRY_SNAPSHOTS = ["NCT04867785", "NCT04881760", "NCT04143802", "NCT06354660", "NCT03841630"]

ABSTRACT_NOTE = (
    "Bibliographic record and abstract retrieved from the NCBI E-utilities API and read. "
    "Full text not obtained. Every location on this source is an abstract and says so."
)

REGISTRY_LIMITS = (
    "A registry record is sponsor-submitted. It states what was registered and, where posted, "
    "the sponsor's structured results; it is not peer-reviewed and it is not a regulator's "
    "decision. Read on 14 September 2026; later updates are not reflected."
)


def entry(**fields):
    base = {
        "priority": "core",
        "public_fulltext_allowed": False,
        "canonical_filename": None,
        "known_local_filename": None,
        "isbn": None,
        "edition": None,
        "publisher": None,
        "publication_name": None,
        "local_file_sha256": None,
        "local_file_bytes": None,
        "page_count": None,
        "printed_page_offset": None,
        "title_page_verified": False,
        "bibliographic_verified": False,
        "title_page_title": None,
        "title_page_authors": None,
        "verified_at": None,
        "verified_by": None,
        "authority_notes": None,
        "limitations_notes": None,
        "integrity_notes": None,
        "doi": None,
        "pmid": None,
        "trial_registry_id": None,
        "canonical_url": None,
    }
    base.update(fields)
    return base


NEW_OR_UPDATED: list[dict] = [
    entry(
        source_key="SRC-120",
        title="Lehninger Principles of Biochemistry, 8th edition",
        authors=["David L. Nelson", "Michael M. Cox"],
        year=None,
        source_type="academic_textbook",
        qc_status="pending",
        primary_role="Foundational biochemistry for Understanding Peptides chapters 1–3: what a peptide is, amino acids to peptides to proteins, peptides in the body.",
        edition="8th edition",
        authority_notes="Standard university biochemistry textbook, named by the owner as a priority acquisition.",
        limitations_notes="NO COPY HELD. Nothing in this index may rest on this work until a genuine copy is obtained and its title page read. Year, publisher and ISBN are deliberately left blank: the only file received carried them in advertising copy, and third-party metadata is not bibliographic authority (V-014).",
        integrity_notes="The file received in the 14 September 2026 intake (1067587256-Ebook-Lehninger-…pdf, 156 pages) is NOT THE REGISTERED WORK: pages 1–5 are a download-site advertisement with prices, ratings and a QR code, and the remaining pages are unrelated text fragments. Recorded as a rejected artifact. SOURCE REPLACEMENT REQUIRED.",
        access_status="unavailable",
        access_notes="Commercial textbook. The owner has undertaken to obtain a legitimate copy; until then this entry records the need, not a holding.",
    ),
    entry(
        source_key="SRC-121",
        title="Rang y Dale. Farmacología, décima edición (Spanish translation of Rang and Dale's Pharmacology, 10th edition) — publisher sample: front matter and chapter 2",
        authors=["James M. Ritter", "Rod J. Flower", "Graeme Henderson", "Yoon Kong Loke", "David MacEwan", "Emma Robinson", "James Fullerton"],
        year=2024,
        source_type="academic_textbook",
        qc_status="incomplete",
        publisher="Elsevier España, S.L.U.",
        edition="Décima edición (Spanish); translation of Rang and Dale's Pharmacology, 10th edition, © 2024 Elsevier Ltd",
        primary_role="General pharmacology principles only, from chapter 2 (how drugs act): drug targets and receptors, agonism, antagonism, partial and inverse agonism, allosteric modulation, desensitisation and the quantitative receptor concepts. Nothing drug-specific and no dosing.",
        authority_notes="Standard pharmacology textbook; authorship and edition confirmed from the title and copyright pages of the file itself (file pp. 1, 4, 5).",
        limitations_notes="PARTIAL AND TRANSLATED. The file is 40 pages: covers, contents, preface and chapter 2 (printed pp. 6–23) with online questions. Every page is marked as an uncorrected proof. Chapter 3 onwards — cell signalling, and every pharmacokinetics chapter — is absent, so nothing about absorption, distribution, metabolism, elimination, half-life or bioavailability may rest on it. It is Spanish: statements drawn from it are paraphrases checked against the Spanish text, never presented as the English edition's wording. Printed page + 14 = file page for chapter 2.",
        integrity_notes="Right work, partial copy. Title page, author list and copyright page confirm Rang y Dale, Farmacología, 10th edition, Elsevier España 2024, translating the 2024 English edition. Pages carry the notice that the PDF is an uncorrected proof for internal business use; the copy's distribution provenance is not verified.",
        printed_page_offset=14,
        title_page_verified=True,
        bibliographic_verified=True,
        title_page_title="RANG Y DALE Farmacología — DÉCIMA EDICIÓN",
        title_page_authors="James M. Ritter, Rod J. Flower, Graeme Henderson, Yoon Kong Loke, David MacEwan, Emma Robinson, James Fullerton",
        verified_at=TODAY,
        verified_by="Front matter read from the file (PyMuPDF text extraction) and compared field by field.",
        access_status="held",
        access_notes="Copy supplied by the owner in the 14 September 2026 intake. Partial sample of a translated edition; see limitations. The complete English 10th edition (SRC-122) has been requested.",
    ),
    entry(
        source_key="SRC-122",
        title="Rang and Dale's Pharmacology, 10th edition",
        authors=["James M. Ritter", "Rod J. Flower", "Graeme Henderson", "Yoon Kong Loke", "David MacEwan", "Emma Robinson", "James Fullerton"],
        year=2024,
        source_type="academic_textbook",
        qc_status="pending",
        publisher="Elsevier",
        edition="10th edition",
        isbn="9780323873956",
        primary_role="The complete English edition: receptors and signalling, and the pharmacokinetics chapters that Understanding Peptides chapter 7 and Science & Applications need.",
        authority_notes="Year and edition confirmed by the copyright page of the Spanish translation held as SRC-121 (file p. 5). The ISBN is as supplied by the owner (print 9780323873956; eBook 9780443108648) and has not been read from the work.",
        limitations_notes="NO COPY HELD. Nothing may rest on it until a copy is obtained and its title page read.",
        integrity_notes="NO COPY HELD. Registered so the gap left by the partial Spanish sample is a named acquisition.",
        access_status="unavailable",
        access_notes="Commercial textbook, requested from the owner. The Spanish sample held as SRC-121 covers chapter 2 only.",
    ),
    entry(
        source_key="SRC-123",
        title="Process development and quality attributes for the freeze-drying process in pharmaceuticals, biopharmaceuticals and nanomedicine delivery: a state-of-the-art review",
        authors=["Sagar R. Pardeshi", "Nilesh S. Deshmukh", "Darshan R. Telange", "Sopan N. Nangare", "Yogesh Y. Sonar", "Sameer H. Lakade", "Minal T. Harde", "Chandrakantsing V. Pardeshi", "Amol Gholap", "Prashant K. Deshmukh", "Mahesh P. More"],
        year=2023,
        source_type="systematic_review_meta_analysis",
        qc_status="usable",
        publisher="Springer Nature (SpringerOpen)",
        publication_name="Future Journal of Pharmaceutical Sciences",
        edition="Volume 9, article 99",
        doi="10.1186/s43094-023-00551-8",
        canonical_url="https://link.springer.com/article/10.1186/s43094-023-00551-8",
        primary_role="Freeze-drying (lyophilisation) as a pharmaceutical process: stages, formulation and process parameters, and product quality attributes. Replaces the index-only Costantino/Pikal file as the citable lyophilisation source.",
        authority_notes="Peer-reviewed open-access narrative review. Title, authors, journal, volume, article number and DOI read from the article's first page and the PDF's own metadata.",
        limitations_notes="A narrative review, not a systematic review: its statements are the authors' synthesis of cited literature. It covers pharmaceuticals, biologics and nanomedicines generally; nothing in it is specific to any peptide in this index or to any vendor's product. Printed page = file page.",
        integrity_notes="Complete, born-digital publisher PDF (31 pages) downloaded by this index from link.springer.com on 14 September 2026.",
        page_count=31,
        title_page_verified=True,
        bibliographic_verified=True,
        title_page_title="Process development and quality attributes for the freeze-drying process in pharmaceuticals, biopharmaceuticals and nanomedicine delivery: a state-of-the-art review",
        title_page_authors="Pardeshi SR, Deshmukh NS, Telange DR, Nangare SN, Sonar YY, Lakade SH, Harde MT, Pardeshi CV, Gholap A, Deshmukh PK, More MP",
        verified_at=TODAY,
        verified_by="Downloaded from the publisher; first page and PDF metadata read and compared with the DOI record.",
        access_status="held",
        access_notes="Open-access article downloaded directly from the publisher on 14 September 2026.",
    ),
    entry(
        source_key="SRC-124",
        title="EudraLex Volume 4, EU Guidelines for Good Manufacturing Practice for Medicinal Products for Human and Veterinary Use — Annex 1: Manufacture of Sterile Medicinal Products",
        authors=["European Commission"],
        year=2022,
        source_type="regulatory_guidance",
        qc_status="usable",
        publisher="European Commission",
        publication_name="The Rules Governing Medicinal Products in the European Union, Volume 4",
        edition="Revision C(2022) 5938 final, Brussels, 22 August 2022",
        canonical_url="https://health.ec.europa.eu/system/files/2022-08/20220825_gmp-an1_en_0.pdf",
        primary_role="Contamination control, aseptic processing, clean-room and environmental monitoring, sterilisation, filtration, fill/finish and sterility-related release practice for sterile medicinal products under EU GMP.",
        authority_notes="Official European Commission guideline. The owner's copy is byte-identical (SHA-256) to the file downloaded by this index from health.ec.europa.eu on 14 September 2026.",
        limitations_notes="SCOPE: sterile medicinal products manufactured under EU GMP. It states what EU GMP expects of licensed manufacturers; it is not evidence about how any unlicensed or research-use product was made, and it must never be presented as a universal requirement or as a test a product passed. Regulatory context, not scientific proof. Printed page + 1 = file page.",
        integrity_notes="Complete, born-digital, 59 pages. Identity confirmed by hash match to the issuer's own file.",
        page_count=59,
        printed_page_offset=1,
        title_page_verified=True,
        bibliographic_verified=True,
        title_page_title="GUIDELINES — The Rules Governing Medicinal Products in the European Union, Volume 4 … Annex 1 Manufacture of Sterile Medicinal Products",
        title_page_authors="European Commission, C(2022) 5938 final",
        verified_at=TODAY,
        verified_by="SHA-256 of owner copy matched to the file downloaded from health.ec.europa.eu; title page read.",
        access_status="held",
        access_notes="Published free by the issuing body; owner copy verified identical to the issuer's download.",
    ),
    entry(
        source_key="SRC-125",
        title="ORA.007 Pharmaceutical Microbiology Manual, Revision 02",
        authors=["U.S. Food and Drug Administration, Office of Regulatory Affairs, Office of Regulatory Science"],
        year=2020,
        source_type="regulatory_guidance",
        qc_status="usable",
        publisher="U.S. Food and Drug Administration",
        edition="Revision 02, revised 25 August 2020",
        canonical_url="https://www.fda.gov/media/88801/download",
        primary_role="How FDA laboratories perform and investigate sterility testing, bacterial endotoxin testing, microbial examination of non-sterile products and related microbiology methods.",
        authority_notes="FDA ORA laboratory manual. The owner's copy is byte-identical (SHA-256) to the file downloaded by this index from fda.gov on 14 September 2026.",
        limitations_notes="An internal laboratory manual for FDA analysts, not guidance to industry and not a compendial standard: it describes how FDA laboratories examine samples. It states on its face that the most current copy is held in FDA's internal system, so revisions after August 2020 are not reflected. Printed page = file page.",
        integrity_notes="Complete, 92 pages. Identity confirmed by hash match to the issuer's own file.",
        page_count=92,
        title_page_verified=True,
        bibliographic_verified=True,
        title_page_title="FOOD AND DRUG ADMINISTRATION, OFFICE OF REGULATORY AFFAIRS — Document Number ORA.007, Revision 02 — Pharmaceutical Microbiology Manual",
        title_page_authors="FDA Office of Regulatory Affairs, Office of Regulatory Science",
        verified_at=TODAY,
        verified_by="SHA-256 of owner copy matched to the file downloaded from fda.gov; title block read.",
        access_status="held",
        access_notes="Published free by the issuing body; owner copy verified identical to the issuer's download.",
    ),
    entry(
        source_key="SRC-022",
        title="USP <71> Sterility Tests",
        authors=["United States Pharmacopeial Convention"],
        year=2012,
        source_type="compendial_standard",
        qc_status="usable",
        publisher="United States Pharmacopeial Convention",
        publication_name="USP-NF",
        edition="General chapter <71>, DocId GUID-481C30EA-8A49-4A77-9E81-D0CD7C533498_1_en-US; 'Official as of 31-Dec-2012'; printed from USP-NF Online 15 October 2020",
        primary_role="The compendial sterility test: culture media and incubation, growth promotion, method suitability, membrane filtration and direct inoculation, and how a result is interpreted — including the chapter's own statement of what a pass does not show.",
        authority_notes="Content appears to reproduce the USP-NF general chapter as printed from USP-NF Online (print header, DocId and official date on every page).",
        limitations_notes="HELD RESEARCH COPY — DISTRIBUTION PROVENANCE UNVERIFIED. The file was obtained by the owner from a document-sharing site (Scribd), not from USP; it is not an official USP artifact obtained from USP and must never be described as one. It shows the chapter as official on its print date (15 October 2020); USP-NF chapters are revised, and nothing here establishes the current official text. Never redistributed. Image-only PDF: text is read from page images, so page locators are confirmed visually.",
        integrity_notes="Two byte-identical downloads of this 8-page English print were received; one is retained. A third file (18 pages, printed 4 August 2022) carries the same chapter GUID in its Spanish-language version (_es-ES) and is a machine translation back into English with Spanish fragments left in: recorded as a non-citable derivative, never used for wording. Not a decoy: title block, DocId and chapter text are consistent throughout.",
        page_count=8,
        title_page_verified=True,
        bibliographic_verified=True,
        title_page_title="〈71〉 STERILITY TESTS (USP-NF, printed 15 Oct 2020, Official as of 31-Dec-2012)",
        title_page_authors="United States Pharmacopeial Convention (© 2020 USPC)",
        verified_at=TODAY,
        verified_by="Page images read; print header, DocId and official date compared across both copies and against the translated derivative.",
        access_status="held",
        access_notes="Held research copy supplied by the owner; content appears to reproduce the USP-NF chapter; distribution provenance unverified (obtained from Scribd, not from USP). A licensed USP-NF copy would replace it.",
    ),
    entry(
        source_key="SRC-023",
        title="USP <85> Bacterial Endotoxins Test",
        authors=["United States Pharmacopeial Convention"],
        year=2018,
        source_type="compendial_standard",
        qc_status="usable",
        publisher="United States Pharmacopeial Convention",
        publication_name="USP-NF",
        edition="General chapter <85>, DocId GUID-F9D9BFA5-099F-452C-9711-47674B37C1CC_2_en-US; 'Official as of 01-May-2018'; printed from USP-NF Online 21 November 2024",
        doi="10.31003/USPNF_M98830_02_01",
        primary_role="The compendial bacterial endotoxins test: gel-clot, turbidimetric and chromogenic techniques, reagents, preparatory testing, interference and how a result is interpreted.",
        authority_notes="Content appears to reproduce the USP-NF general chapter as printed from USP-NF Online (print header, DocId, DOI and 'currently official on 21-Nov-2024' status on the first page).",
        limitations_notes="HELD RESEARCH COPY — DISTRIBUTION PROVENANCE UNVERIFIED. Obtained by the owner from a document-sharing site (Scribd), not from USP; the print itself says 'Do not distribute'. It is not an official USP artifact obtained from USP and must never be described as one. It shows the chapter as official on 21 November 2024; later revisions are not reflected. Never redistributed. Printed page = file page.",
        integrity_notes="Complete 7-page English print with extractable text; title block, DocId and DOI consistent.",
        page_count=7,
        title_page_verified=True,
        bibliographic_verified=True,
        title_page_title="〈85〉 BACTERIAL ENDOTOXINS TEST (USP-NF, printed 21 Nov 2024, Official as of 01-May-2018)",
        title_page_authors="United States Pharmacopeial Convention (© 2024 USPC)",
        verified_at=TODAY,
        verified_by="First page read; DocId, DOI and official date recorded.",
        access_status="held",
        access_notes="Held research copy supplied by the owner; content appears to reproduce the USP-NF chapter; distribution provenance unverified (obtained from Scribd, not from USP). A licensed USP-NF copy would replace it.",
    ),
]

TRIAL_DOCS = [
    entry(
        source_key="SRC-126",
        title="ClinicalTrials.gov record NCT04867785 with posted results — A Study of LY3437943 in Participants With Type 2 Diabetes",
        authors=["Eli Lilly and Company (sponsor)", "U.S. National Library of Medicine"],
        year=2023,
        source_type="clinical_trial_registry",
        qc_status="usable",
        publisher="U.S. National Library of Medicine",
        publication_name="ClinicalTrials.gov",
        edition="Record as retrieved 14 September 2026; results first posted 3 July 2023; last update posted 3 July 2023",
        trial_registry_id="NCT04867785",
        canonical_url="https://clinicaltrials.gov/study/NCT04867785",
        primary_role="Registered design, arms, outcomes and eligibility, and the sponsor's posted structured results: participant flow, primary and secondary outcome measures with analyses, and adverse events.",
        authority_notes="Retrieved from the ClinicalTrials.gov API v2. A snapshot of the response is committed at data/sources/registry/NCT04867785.json so every figure cited can be re-read.",
        limitations_notes=REGISTRY_LIMITS,
        integrity_notes="Structured JSON record; no file pages. Locators name the registry module and outcome measure.",
        bibliographic_verified=True,
        verified_at=TODAY,
        verified_by="ClinicalTrials.gov API v2, full record including resultsSection",
        access_status="held",
        access_notes="Retrieved live from the ClinicalTrials.gov API on 14 September 2026 and pinned by the committed snapshot and its last-update date (3 July 2023).",
    ),
    entry(
        source_key="SRC-127",
        title="Clinical protocol J1I-MC-GZBD, amendment (c): A Phase 2 Study of Once-Weekly LY3437943 Compared with Placebo and Dulaglutide in Participants with Type 2 Diabetes",
        authors=["Eli Lilly and Company"],
        year=2022,
        source_type="other",
        qc_status="usable",
        publisher="Eli Lilly and Company (posted on ClinicalTrials.gov)",
        edition="Amendment (c), approved 29 August 2022 (document VV-CLIN-072318); history: original 19 Feb 2021, amendment a 1 Mar 2021, amendment b 10 May 2021",
        trial_registry_id="NCT04867785",
        canonical_url="https://cdn.clinicaltrials.gov/large-docs/85/NCT04867785/Prot_000.pdf",
        primary_role="Prespecified methodology: objectives and endpoints, design, eligibility, dose-escalation scheme, analysis populations, statistical hypotheses, sample size, interim analyses and oversight.",
        authority_notes="The sponsor's protocol as posted to ClinicalTrials.gov; downloaded by this index directly from the registry's document server on 14 September 2026.",
        limitations_notes="This is the FINAL AMENDMENT, approved after primary completion (8 July 2022). What was prespecified before unblinding can be read only from its amendment history, not from earlier versions, which are not held. A protocol states what was planned, not what was done. Printed page + 1 = file page.",
        integrity_notes="Complete, 123 pages, registry-posted PDF.",
        page_count=123,
        printed_page_offset=1,
        title_page_verified=True,
        bibliographic_verified=True,
        title_page_title="Protocol: J1I-MC-GZBD(c) A Phase 2 Study of Once-Weekly LY3437943 Compared with Placebo and Dulaglutide in Participants with Type 2 Diabetes NCT04867785 Approval Date: 29-Aug-2022",
        title_page_authors="Eli Lilly and Company",
        verified_at=TODAY,
        verified_by="Downloaded from cdn.clinicaltrials.gov; title page and amendment history read.",
        access_status="held",
        access_notes="Registry-posted document downloaded directly from ClinicalTrials.gov on 14 September 2026.",
    ),
    entry(
        source_key="SRC-128",
        title="Statistical analysis plan J1I-MC-GZBD, version 3.0",
        authors=["Eli Lilly and Company"],
        year=2022,
        source_type="other",
        qc_status="usable",
        publisher="Eli Lilly and Company (posted on ClinicalTrials.gov)",
        edition="Version 3.0, approved 13 December 2022 (document VV-CLIN-074016); v1.0 3 Dec 2021, v2.0 7 Apr 2022",
        trial_registry_id="NCT04867785",
        canonical_url="https://cdn.clinicaltrials.gov/large-docs/85/NCT04867785/SAP_001.pdf",
        primary_role="Planned statistical analysis: estimands, analysis sets, multiplicity, interim analyses, sample size, supplemental and exploratory analyses.",
        authority_notes="The sponsor's SAP as posted to ClinicalTrials.gov; downloaded directly from the registry's document server on 14 September 2026.",
        limitations_notes="Version 3.0 was approved after study completion (27 October 2022). Its version history records what changed and why; earlier versions are not held. A plan states intended analyses, not results. Printed page + 1 = file page.",
        integrity_notes="Complete, 54 pages, registry-posted PDF.",
        page_count=54,
        printed_page_offset=1,
        title_page_verified=True,
        bibliographic_verified=True,
        title_page_title="Statistical Analysis Plan: J1I-MC-GZBD (Version 3) … NCT04867785 Approval Date: 13-Dec-2022",
        title_page_authors="Eli Lilly and Company",
        verified_at=TODAY,
        verified_by="Downloaded from cdn.clinicaltrials.gov; title page and version history read.",
        access_status="held",
        access_notes="Registry-posted document downloaded directly from ClinicalTrials.gov on 14 September 2026.",
    ),
    entry(
        source_key="SRC-129",
        title="ClinicalTrials.gov record NCT04881760 with posted results — A Study of LY3437943 in Participants Who Have Obesity or Are Overweight",
        authors=["Eli Lilly and Company (sponsor)", "U.S. National Library of Medicine"],
        year=2023,
        source_type="clinical_trial_registry",
        qc_status="usable",
        publisher="U.S. National Library of Medicine",
        publication_name="ClinicalTrials.gov",
        edition="Record as retrieved 14 September 2026; results first posted 13 September 2023; last update posted 13 September 2023",
        trial_registry_id="NCT04881760",
        canonical_url="https://clinicaltrials.gov/study/NCT04881760",
        primary_role="Registered design, arms, outcomes and eligibility, and the sponsor's posted structured results for the phase 2 obesity trial.",
        authority_notes="Retrieved from the ClinicalTrials.gov API v2; snapshot committed at data/sources/registry/NCT04881760.json.",
        limitations_notes=REGISTRY_LIMITS,
        integrity_notes="Structured JSON record; no file pages. Locators name the registry module and outcome measure.",
        bibliographic_verified=True,
        verified_at=TODAY,
        verified_by="ClinicalTrials.gov API v2, full record including resultsSection",
        access_status="held",
        access_notes="Retrieved live from the ClinicalTrials.gov API on 14 September 2026 and pinned by the committed snapshot and its last-update date (13 September 2023).",
    ),
    entry(
        source_key="SRC-130",
        title="Clinical protocol J1I-MC-GZBF, amendment (b): A Phase 2 Study of Once-Weekly LY3437943 Compared with Placebo in Participants Who Have Obesity or Are Overweight with Weight-Related Comorbidities",
        authors=["Eli Lilly and Company"],
        year=2022,
        source_type="other",
        qc_status="usable",
        publisher="Eli Lilly and Company (posted on ClinicalTrials.gov)",
        edition="Amendment (b), approved 29 August 2022 (document VV-CLIN-072320); history: original 26 Feb 2021, amendment a 21 May 2021",
        trial_registry_id="NCT04881760",
        canonical_url="https://cdn.clinicaltrials.gov/large-docs/60/NCT04881760/Prot_000.pdf",
        primary_role="Prespecified methodology for the phase 2 obesity trial, including the NAFLD/MRI addendum that became the MASLD substudy.",
        authority_notes="The sponsor's protocol as posted to ClinicalTrials.gov; downloaded directly from the registry's document server on 14 September 2026.",
        limitations_notes="FINAL AMENDMENT, approved after primary completion (16 May 2022); earlier versions are not held. A protocol states what was planned, not what was done. Printed page + 1 = file page.",
        integrity_notes="Complete, 127 pages, registry-posted PDF.",
        page_count=127,
        printed_page_offset=1,
        title_page_verified=True,
        bibliographic_verified=True,
        title_page_title="J1I-MC-GZBF (b) Clinical Protocol … NCT04881760 Approval Date: 29-Aug-2022",
        title_page_authors="Eli Lilly and Company",
        verified_at=TODAY,
        verified_by="Downloaded from cdn.clinicaltrials.gov; title page and amendment history read.",
        access_status="held",
        access_notes="Registry-posted document downloaded directly from ClinicalTrials.gov on 14 September 2026.",
    ),
    entry(
        source_key="SRC-131",
        title="Statistical analysis plan J1I-MC-GZBF, version 4.0",
        authors=["Eli Lilly and Company"],
        year=2022,
        source_type="other",
        qc_status="usable",
        publisher="Eli Lilly and Company (posted on ClinicalTrials.gov)",
        edition="Version 4.0, approved 15 December 2022 (document VV-CLIN-076021)",
        trial_registry_id="NCT04881760",
        canonical_url="https://cdn.clinicaltrials.gov/large-docs/60/NCT04881760/SAP_001.pdf",
        primary_role="Planned statistical analysis for the phase 2 obesity trial and its NAFLD addendum.",
        authority_notes="The sponsor's SAP as posted to ClinicalTrials.gov; downloaded directly from the registry's document server on 14 September 2026.",
        limitations_notes="Version 4.0 was approved after study completion (22 November 2022); earlier versions are not held. Printed page + 1 = file page.",
        integrity_notes="Complete, 56 pages, registry-posted PDF.",
        page_count=56,
        printed_page_offset=1,
        title_page_verified=True,
        bibliographic_verified=True,
        title_page_title="J1I-MC-GZBF Statistical Analysis Plan V4.0 … NCT04881760 Approval Date: 15-Dec-2022",
        title_page_authors="Eli Lilly and Company",
        verified_at=TODAY,
        verified_by="Downloaded from cdn.clinicaltrials.gov; title page and version history read.",
        access_status="held",
        access_notes="Registry-posted document downloaded directly from ClinicalTrials.gov on 14 September 2026.",
    ),
]

for key, nct, title, posted in [
    ("SRC-137", "NCT04143802", "A Study of LY3437943 in Participants With Type 2 Diabetes Mellitus (T2DM) — phase 1b", "No results posted to the registry."),
    ("SRC-138", "NCT06354660", "TRANSCEND-T2D-1: Effect of Retatrutide Compared With Placebo in Adult Participants With Type 2 Diabetes and Inadequate Glycemic Control With Diet and Exercise Alone", "No results posted to the registry on the retrieval date."),
    ("SRC-139", "NCT03841630", "A Safety Study of LY3437943 Given as a Single Injection in Healthy Participants — phase 1", "No results posted to the registry."),
]:
    TRIAL_DOCS.append(entry(
        source_key=key,
        title=f"ClinicalTrials.gov record {nct} — {title}",
        authors=["Eli Lilly and Company (sponsor)", "U.S. National Library of Medicine"],
        year=None,
        source_type="clinical_trial_registry",
        qc_status="usable",
        publisher="U.S. National Library of Medicine",
        publication_name="ClinicalTrials.gov",
        edition="Record as retrieved 14 September 2026",
        trial_registry_id=nct,
        canonical_url=f"https://clinicaltrials.gov/study/{nct}",
        primary_role=f"Registered design, arms, enrolment, dates and linked publications for {nct}. {posted}",
        authority_notes=f"Retrieved from the ClinicalTrials.gov API v2; snapshot committed at data/sources/registry/{nct}.json.",
        limitations_notes=REGISTRY_LIMITS + " " + posted,
        integrity_notes="Structured JSON record; no file pages.",
        bibliographic_verified=True,
        verified_at=TODAY,
        verified_by="ClinicalTrials.gov API v2",
        access_status="held",
        access_notes="Retrieved live from the ClinicalTrials.gov API on 14 September 2026 and pinned by the committed snapshot.",
    ))

ABSTRACTS = [
    ("SRC-132", "40609566", "10.1016/S2213-8587(25)00092-0",
     "Effects of retatrutide on body composition in people with type 2 diabetes: a substudy of a phase 2, double-blind, parallel-group, placebo-controlled, randomised trial",
     ["Coskun T", "Wu Q", "Schloot NC", "Haupt A", "Milicevic Z", "Khouli C", "Harris C"], 2025,
     "The Lancet Diabetes & Endocrinology",
     "DXA body-composition substudy of NCT04867785 (phase 2, type 2 diabetes, 36 weeks). A substudy of the same trial, not a separate trial.",
     "Developer-authored and developer-funded. 189 enrolled in the substudy, 103 with baseline and week-36 scans. Fat mass is reported at abstract level; lean-mass figures are not in the abstract."),
    ("SRC-133", "42608321", "10.1111/dom.71200",
     "Retatrutide-Associated Improvements in Cardiovascular Risk Biomarkers in Adults With Obesity With or Without Type 2 Diabetes",
     ["Ruotolo G", "Harris C", "Lin Y", "Wilson JM", "Pirro V", "Duffin KL", "Thomas MK", "Hartman ML", "Neill CO", "Coskun T", "Milicevic Z", "Haupt A", "Sattar N", "Nicholls SJ"], 2026,
     "Diabetes, Obesity & Metabolism",
     "Post hoc biomarker analysis pooling data from NCT04867785 and NCT04881760. Not a separate trial.",
     "Post hoc, biomarkers only (lipoproteins, inflammation): surrogate measures, not cardiovascular events. Developer-funded."),
    ("SRC-134", "41216380", "10.1016/j.obpill.2025.100220",
     "Perceived benefits of treatment for obesity with retatrutide: A qualitative study of patients in a phase 2 clinical trial",
     ["Goetz IA", "Kanu C", "Hoover A", "Jimenez-Moreno C", "Karn H", "Kimel M", "Neff LM", "Boye KS"], 2025,
     "Obesity Pillars",
     "Qualitative exit interviews with 40 participants leaving NCT04881760. Not a separate trial.",
     "Qualitative, 40 self-selected interviewees including 4 on placebo; describes experiences, not effects. Developer-funded; interviews conducted by a contractor paid by the developer."),
    ("SRC-135", "41201783", "10.1007/s12325-025-03386-2",
     "Development and Content Evaluation of the Eating Behavior and Appetite Questionnaire (EBAQ) for Individuals with Obesity",
     ["Kanu C", "Clucas C", "Skalicky A", "Samuelson A", "Goetz I", "Neff LM", "Boye KS", "Karn H"], 2026,
     "Advances in Therapy",
     "Questionnaire development drawing on NCT04881760 exit interviews. Reports no efficacy or safety results.",
     "Instrument development; developer-funded and developer-copyrighted. No trial outcomes."),
    ("SRC-136", "41589220", "10.1002/osp4.70119",
     "Development of the Weight and Emotions Scale (WES)",
     ["Kanu C", "Kimel M", "Goetz I", "Neff LM", "Boye KS", "Stefan M", "Jordan J"], 2026,
     "Obesity Science & Practice",
     "Questionnaire development drawing on NCT04881760 exit interviews. Reports no efficacy or safety results.",
     "Instrument development; developer-funded and developer-copyrighted. No trial outcomes."),
]
for key, pmid, doi, title, authors, year, journal, role, limits in ABSTRACTS:
    TRIAL_DOCS.append(entry(
        source_key=key, title=title, authors=authors, year=year,
        source_type="primary_journal_article", qc_status="usable",
        publication_name=journal, doi=doi, pmid=pmid,
        canonical_url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
        primary_role=role,
        authority_notes="Peer-reviewed journal record linked to the trial by the ClinicalTrials.gov record's own reference list and by the registry number in the abstract. Cited by PubMed identifier and by abstract.",
        limitations_notes=limits + " " + ABSTRACT_NOTE,
        integrity_notes="Bibliographic record retrieved from the NCBI E-utilities API, so title, journal, year and publication type are the database's own and not transcribed. The full text is not held.",
        bibliographic_verified=True, verified_at=TODAY,
        verified_by="NCBI E-utilities efetch, abstract read",
        access_status="abstract_held", access_notes=ABSTRACT_NOTE,
    ))

# Updates to existing entries: fields merged over what is already there.
UPDATES = {
    "SRC-013": {
        "limitations_notes": "BIBLIOGRAPHIC / INDEX SOURCE ONLY. The held file is the book's table of contents, which identifies the work and its chapters and supports nothing else. Lyophilisation statements rest on SRC-123 (Pardeshi et al. 2023) instead. The owner is not required to obtain the complete 686-page book.",
        "integrity_notes_append": " A second copy received on 14 September 2026 (different bytes, same two-page contents listing) is recorded as a duplicate and not retained.",
    },
    "SRC-014": {
        "integrity_notes_append": " A second file received on 14 September 2026 (1047650095-…146656606X (1).pdf, 157 pages, different bytes) is the same download-site advertisement followed by unrelated text; it is not the book either. SOURCE REPLACEMENT REQUIRED.",
    },
    "SRC-029": {
        "authors": ["Lee E", "Burgess K"],
        "pmid": "40131143",
        "edition": "Alternative Therapies in Health and Medicine 2025;31(5):20-24",
        "access_notes": "Bibliographic record and abstract retrieved from the NCBI E-utilities API and read. Full text not obtained: the owner supplied a manually made Word transcription of the article text, which is held as a working artifact and has not been verified against the publisher's version. Every location on this source is an abstract and says so.",
        "integrity_notes_append": " 14 September 2026: owner transcription (Word document) recorded as a separate working artifact with verification state transcription_unverified. It is not the publisher's artifact and nothing is cited from its body.",
    },
    "SRC-030": {
        "authors": ["Lee E", "Walker C", "Ayadi B"],
        "pmid": "39325560",
        "limitations_notes": "Retrospective chart review of twelve women treated at one urogynaecology practice, per the full text (printed pp. 13-14); no control group, no ethics approval stated for this study, no trial registration. The peptide came from a 503A compounding pharmacy the authors do not name, with no certificate of analysis or identity testing reported. Outcome was a single self-rated five-point Global Response Assessment, with collection timing reported inconsistently (six weeks; four to six months). Printed page - 11 = file page.",
        "known_local_filename": "Lee_Walker_Ayadi_2024_AlternTherHealthMed_30-10_BPC157_IC.pdf",
        "access_status": "held",
        "access_notes": "Full text (publisher PDF, 6 pages) supplied by the owner on 14 September 2026 and read. The PubMed abstract was read first, on 13 September.",
        "printed_page_offset": -11,
        "title_page_verified": True,
        "title_page_title": "Effect of BPC-157 on Symptoms in Patients with Interstitial Cystitis: A Pilot Study",
        "title_page_authors": "Edwin Lee, MD; Christopher Walker, MD; Bahram Ayadi, BS",
        "publisher": "InnoVision Health Media",
        "edition": "Alternative Therapies in Health and Medicine, October 2024, vol. 30 no. 10, pp. 12–17",
        "limitations_now": True,
        "verified_at": TODAY,
        "verified_by": "Full text read; article title block compared with the PubMed record.",
        "integrity_notes_append": " 14 September 2026: publisher PDF held (6 pages, printed pp. 12–17). Printed page − 11 = file page.",
    },
    "SRC-031": {
        "authors": ["Lee E", "Padgett B"],
        "pmid": "34324435",
        "edition": "Alternative Therapies in Health and Medicine 2021;27(4):8-13",
        "integrity_notes_append": " 14 September 2026: the file supplied as this article ('Lee & Padgett “Intra Articular Injection of BPC 157…pdf', 3 pages) is a different article — Lee E, 'Effects of Nitric Oxide on Carotid Intima Media Thickness: A Pilot Study', Alternative Therapies vol. 22 no. S2, pp. 32–34 — and contains no BPC-157 content. Recorded as a mislabelled, rejected artifact. SOURCE REPLACEMENT REQUIRED for the knee-pain article.",
    },
    "SRC-050": {
        "known_local_filename": "Jastreboff_2023_NEJM_389-514_retatrutide_obesity_phase2.pdf",
        "access_status": "held",
        "access_notes": "Full text (publisher PDF, 13 pages, downloaded from nejm.org) supplied by the owner on 14 September 2026 and read. The Supplementary Appendix, protocol and disclosure forms referred to by the article are not held: nejm.org refused this index's direct request (HTTP 403).",
        "printed_page_offset": -513,
        "title_page_verified": True,
        "title_page_title": "Triple–Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial",
        "title_page_authors": "Ania M. Jastreboff, Lee M. Kaplan, Juan P. Frías, Qiwei Wu, Yu Du, Sirel Gurbuz, Tamer Coskun, Axel Haupt, Zvonko Milicevic, Mark L. Hartman, for the Retatrutide Phase 2 Obesity Trial Investigators",
        "publisher": "Massachusetts Medical Society",
        "edition": "N Engl J Med 2023;389:514-26 (10 August 2023; published online 26 June 2023)",
        "doi": "10.1056/NEJMoa2301972",
        "pmid": "37366315",
        "trial_registry_id": "NCT04881760",
        "limitations_notes": "Developer-sponsored, 338 participants, 48 weeks, United States only. Efficacy by dose group under an efficacy estimand; no multiplicity adjustment. Not powered for clinical outcomes. Supplementary tables cited in the text (e.g. S4–S15) are not held. Printed page − 513 = file page.",
        "verified_at": TODAY,
        "verified_by": "Full text read; title block compared with the PubMed record.",
        "integrity_notes": "Publisher PDF held (13 pages, printed pp. 514–526), downloaded from nejm.org per its footer. The publisher's slide set for the article (nejmoa2301972.pptx) was also received and is recorded as supplementary material, not cited.",
    },
    "SRC-051": {
        "known_local_filename": "Sanyal_2024_NatMed_30-2037_retatrutide_MASLD.pdf",
        "access_status": "held",
        "access_notes": "Full text (publisher PDF, 31 pages including Methods, Extended Data and reporting summary) supplied by the owner on 14 September 2026 and read.",
        "printed_page_offset": -2036,
        "title_page_verified": True,
        "title_page_title": "Triple hormone receptor agonist retatrutide for metabolic dysfunction-associated steatotic liver disease: a randomized phase 2a trial",
        "title_page_authors": "Arun J. Sanyal, Lee M. Kaplan, Juan P. Frias, Bram Brouwers, Qiwei Wu, Melissa K. Thomas, Charles Harris, Nanette C. Schloot, Yu Du, Kieren J. Mather, Axel Haupt, Mark L. Hartman",
        "publisher": "Springer Nature",
        "edition": "Nature Medicine 2024;30:2037–2048 (published online 10 June 2024)",
        "doi": "10.1038/s41591-024-03018-2",
        "pmid": "38858523",
        "trial_registry_id": "NCT04881760",
        "limitations_notes": "A substudy of the phase 2 obesity trial (NCT04881760), not a separate trial: 98 participants with MASLD and ≥10% liver fat. MRI endpoints and blood biomarkers, no liver histology, no multiplicity control, and no 48-week MRI for 56.1% of participants. The authors describe the results as hypothesis-generating. Main-text printed page − 2036 = file page; Methods and Extended Data pages (file pp. 13 onwards) carry no printed page numbers and are located by file page.",
        "verified_at": TODAY,
        "verified_by": "Full text read; title block compared with the PubMed record.",
        "integrity_notes": "Publisher PDF held, 31 pages.",
    },
}


def main() -> None:
    manifest_path = ROOT / "SOURCE_MANIFEST.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    by_key = {s["source_key"]: s for s in manifest["sources"]}

    # --- copies into sources/ -------------------------------------------------
    for key, (origin, canonical) in COPIES.items():
        if not origin.exists():
            raise SystemExit(f"{key}: origin missing: {origin}")
        target = SOURCES / canonical
        if not target.exists() or sha256(target) != sha256(origin):
            shutil.copy2(origin, target)

    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    for nct in REGISTRY_SNAPSHOTS:
        shutil.copy2(SCRATCH_DOWNLOADS / f"{nct}.json", REGISTRY_DIR / f"{nct}.json")

    def with_file(e: dict) -> dict:
        copy = COPIES.get(e["source_key"])
        if copy:
            target = SOURCES / copy[1]
            e["known_local_filename"] = copy[1]
            e["canonical_filename"] = copy[1]
            e["local_file_sha256"] = sha256(target)
            e["local_file_bytes"] = target.stat().st_size
            e["page_count"] = pages(target)
        return e

    for e in NEW_OR_UPDATED + TRIAL_DOCS:
        e = with_file(e)
        if e["source_key"] in by_key:
            by_key[e["source_key"]].update(e)
        else:
            manifest["sources"].append(e)
            by_key[e["source_key"]] = e

    for key, change in UPDATES.items():
        s = by_key[key]
        change = dict(change)
        append = change.pop("integrity_notes_append", None)
        change.pop("limitations_now", None)
        s.update(change)
        if append and append.strip() not in (s.get("integrity_notes") or ""):
            s["integrity_notes"] = (s.get("integrity_notes") or "") + append
        with_file(s)

    manifest["sources"].sort(key=lambda s: int(s["source_key"].split("-")[1]))
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Manifest: {len(manifest['sources'])} sources")
    for key in sorted(COPIES):
        s = by_key[key]
        print(f"  {key} {s['local_file_sha256'][:12]} {s['page_count']:>4}pp  {s['known_local_filename']}")


if __name__ == "__main__":
    main()
