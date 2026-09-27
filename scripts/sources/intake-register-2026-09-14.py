#!/usr/bin/env python3
"""
The intake register for the owner's 14 September 2026 batch.

    python -X utf8 scripts/sources/intake-register-2026-09-14.py

Every file in the intake folder, and every document this index downloaded for
the batch, gets one row: its identity (hash, size, pages, type, language), what
it turned out to be, and what was done with it. Rows that belong to a
registered source also carry an artifact record, which the seed loads into
`source_artifacts`.

Nothing is inferred from a filename. Every classification below was made by
reading the file; the notes say what was read.

Writes data/seed/source-artifacts/intake-2026-09-14.json (committed).
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
INTAKE = Path(os.environ.get("TIDES_INTAKE_DIR", ""))  # owner-supplied intake folder,
# outside this repository; set TIDES_INTAKE_DIR to re-run this historical script
DOWNLOADS = Path(
    Path(os.environ.get("TIDES_SCRATCH_DIR", "review")) / "intake"
)
OUT = ROOT / "data" / "seed" / "source-artifacts" / "intake-2026-09-14.json"
DATE = "2026-09-14"
SCRIBD = "Obtained by the owner from a document-sharing site (Scribd): a subscriber's print from USP-NF Online, not a copy obtained from USP."


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def pdf_pages(path: Path) -> tuple[int | None, bool | None]:
    if path.suffix.lower() != ".pdf":
        return None, None
    with fitz.open(path) as d:
        chars = sum(len(d[i].get_text().strip()) for i in range(d.page_count))
        return d.page_count, chars > 50 * d.page_count


def dup(key: str, what: str) -> dict:
    return {
        "classification": "duplicate",
        "sourceKey": key,
        "disposition": "not_retained",
        "notes": f"Byte-identical to the copy already registered as {key} ({what}). Nothing new; left in the intake folder.",
    }


# filename prefix -> description. Matched by startswith so long aggregator names need not be repeated.
OWNER_FILES: list[tuple[str, dict]] = [
    ("1010686727-", dup("SRC-011", "Peptide Characterization and Application Protocols; a registered decoy")),
    ("1029470766-", dup("SRC-007", "Advances in the Discovery and Development of Peptide Therapeutics")),
    ("1042230279-", dup("SRC-010", "Peptide-based Drug Discovery; a registered decoy")),
    ("1047568316-", dup("SRC-015", "Handbook of Biologically Active Peptides; registered for replacement")),
    ("1047650095-Download-Ebook-Therapeutic-Peptides-and-Proteins-Formulation-Processing-and-Delivery-Systems-3rd-Edition-146656606X (1)", {
        "classification": "advertisement",
        "title": "Therapeutic Peptides and Proteins: Formulation, Processing, and Delivery Systems, 3rd edition (Banga) — as named by the file",
        "language": "en",
        "sourceKey": "SRC-014",
        "disposition": "rejected",
        "artifact": {"key": "ART-SRC014-ADVERT-2", "kind": "advertisement", "verification": "identity_refuted",
                     "publicNote": "A second file received under this title was also a download-site advertisement, not the book."},
        "notes": "Pages 1-4 are a download-site sales page (formats, star rating, prices, 'How To Access Product', QR code) and a list of related titles; from page 5 the text is unrelated fragments of other works. 157 pages, different bytes from the registered SRC-014 file, same content pattern. NOT THE BOOK. SOURCE REPLACEMENT REQUIRED.",
    }),
    ("1047650095-Download-Ebook-Therapeutic-Peptides-and-Proteins-Formulation-Processing-and-Delivery-Systems-3rd-Edition-146656606X.pdf",
     dup("SRC-014", "the advertisement already registered for replacement")),
    ("1067587256-", {
        "classification": "advertisement",
        "title": "Lehninger Principles of Biochemistry, 8th edition (Nelson & Cox) — as named by the file",
        "language": "en",
        "sourceKey": "SRC-120",
        "disposition": "rejected",
        "artifact": {"key": "ART-SRC120-ADVERT", "kind": "advertisement", "verification": "identity_refuted",
                     "publicNote": "The only file received under this title was a download-site advertisement, not the book. No copy is held."},
        "notes": "Pages 1-5 are a download-site advertisement ('Verified Quality', 'Instant Download', ratings, $35.00/$50.00, QR code) and lists of unrelated ebooks; page 6 onwards is disconnected text from other works (HIV epidemiology, anatomy). Not the textbook, not a preview of it. SOURCE REPLACEMENT REQUIRED.",
    }),
    ("1071771071-", dup("SRC-009", "Pharmaceutical Biotechnology; a registered decoy")),
    ("1074265399-", dup("SRC-008", "Peptide Synthesis and Applications; a registered decoy")),
    ("185968952-", dup("SRC-012", "Peptides: Biology and Chemistry")),
    ("484472225-USP-NF-71-Sterility-Tests (1)", {
        "classification": "duplicate",
        "title": "USP <71> Sterility Tests (English print, 15 Oct 2020)",
        "language": "en",
        "sourceKey": "SRC-022",
        "disposition": "not_retained",
        "artifact": {"key": "ART-SRC022-EN-2020-DUP", "kind": "duplicate", "verification": "title_page_verified",
                     "duplicateOf": "ART-SRC022-EN-2020", "distribution": SCRIBD},
        "notes": "Byte-identical (SHA-256) to 484472225-USP-NF-71-Sterility-Tests.pdf. Not retained separately.",
    }),
    ("484472225-USP-NF-71-Sterility-Tests.pdf", {
        "classification": "complete_source",
        "title": "USP-NF 〈71〉 Sterility Tests — DocId 1_GUID-481C30EA-8A49-4A77-9E81-D0CD7C533498_1_en-US; Official as of 31-Dec-2012; printed 15 Oct 2020",
        "language": "en",
        "sourceKey": "SRC-022",
        "disposition": "working_copy",
        "artifact": {"key": "ART-SRC022-EN-2020", "kind": "research_copy_unverified_distribution", "verification": "title_page_verified",
                     "distribution": SCRIBD,
                     "publicNote": "Held research copy. Content appears to reproduce the USP-NF chapter as printed on 15 October 2020; distribution provenance unverified; not an official USP artifact obtained from USP. Never redistributed."},
        "notes": "Complete 8-page English print from USP-NF Online with print header and DocId on every page. Image-only PDF (no text layer): read from page images. Chosen as the working copy because it is the English text.",
    }),
    ("73671816-", dup("SRC-006", "Synthetic Peptides: A User's Guide")),
    ("795375586-", {
        "classification": "complete_source",
        "title": "USP-NF 〈85〉 Bacterial Endotoxins Test — DocId GUID-F9D9BFA5-099F-452C-9711-47674B37C1CC_2_en-US; DOI 10.31003/USPNF_M98830_02_01; Official as of 01-May-2018; printed 21 Nov 2024",
        "language": "en",
        "sourceKey": "SRC-023",
        "disposition": "working_copy",
        "artifact": {"key": "ART-SRC023-EN-2024", "kind": "research_copy_unverified_distribution", "verification": "title_page_verified",
                     "distribution": SCRIBD + " The print carries the notice 'Do not distribute'.",
                     "publicNote": "Held research copy. Content appears to reproduce the USP-NF chapter as current on 21 November 2024; distribution provenance unverified; not an official USP artifact obtained from USP. Never redistributed."},
        "notes": "Complete 7-page English print with extractable text. The print names the subscriber who printed it; that name is not recorded in this index.",
    }),
    ("88403241-Lyophilization-of-Biopharmaceuticals (1)", {
        "classification": "index_toc_only",
        "title": "Lyophilization of Biopharmaceuticals (Costantino & Pikal, eds.) — table of contents",
        "language": "en",
        "sourceKey": "SRC-013",
        "disposition": "not_retained",
        "artifact": {"key": "ART-SRC013-TOC-2", "kind": "index_only", "verification": "title_page_verified",
                     "publicNote": "Only the book's contents listing is held. It identifies the work and supports no statement."},
        "notes": "Two-page contents listing, same text as the registered SRC-013 file with different bytes. Remains a bibliographic/index source only; the citable lyophilisation source is now SRC-123.",
    }),
    ("88403241-Lyophilization-of-Biopharmaceuticals.pdf", dup("SRC-013", "the contents listing of Lyophilization of Biopharmaceuticals")),
    ("904653287-", {
        "classification": "duplicate",
        "title": "Peptide Handbook: A Professional's Guide to Peptide Therapeutics (LaValle et al., 2022)",
        "language": "en",
        "sourceKey": "SRC-002",
        "disposition": "not_retained",
        "notes": "Different bytes from the registered SRC-002 file, but all 281 pages have identical extracted text: the same document with different file packaging. Not retained.",
    }),
    ("951650680-", {
        "classification": "partial_source",
        "title": "Rang y Dale. Farmacología, 10.ª edición (Ritter, Flower, Henderson, Loke, MacEwan, Robinson, Fullerton; Elsevier España 2024; ISBN 978-84-1382-690-5)",
        "language": "es",
        "sourceKey": "SRC-121",
        "disposition": "working_copy",
        "artifact": {"key": "ART-SRC121-ES-SAMPLE", "kind": "partial_translated_copy", "verification": "title_page_verified",
                     "distribution": "Supplied by the owner. The file carries the typesetter's notice that it is an uncorrected proof for internal business use; how it reached the owner is not recorded.",
                     "publicNote": "A 40-page Spanish-language sample of the 10th edition: front matter and chapter 2 only. Statements drawn from it are paraphrases checked against the Spanish text."},
        "notes": "10th edition, confirmed by title and copyright pages; Spanish translation of the 2024 English edition (ISBN 978-0-323-87395-6 per the copyright page). Present: covers, contents, preface, chapter 2 (printed pp. 6-23) and its online questions. Absent: chapter 1, chapter 3 (signalling), chapter 5 (biopharmaceuticals), chapters 8-11 (methods and pharmacokinetics) and everything after. Usable for chapter 2 concepts; the complete English edition would materially improve extraction (missing chapters, and the translation carries identified wording errors).",
    }),
    ("971365311-", {
        "classification": "machine_translated_derivative",
        "title": "USP-NF 〈71〉 Sterility Testing — DocId 4_GUID-481C30EA-…_1_es-ES; printed 4 Aug 2022",
        "language": "en (machine translated from es-ES, Spanish fragments remain)",
        "sourceKey": "SRC-022",
        "disposition": "not_retained",
        "artifact": {"key": "ART-SRC022-ES-2022-MT", "kind": "machine_translated_derivative", "verification": "title_page_verified",
                     "distribution": SCRIBD,
                     "publicNote": "A machine-translated copy of the same chapter is recorded and never used for wording."},
        "notes": "Same chapter and version GUID as the English print, taken from the Spanish-language USP-NF page and machine-translated back into English. Spanish sentences remain, and translation errors change meaning (e.g. a sample-size rule reading '10% of 4 containers' where the English reads '10% or 4 containers, whichever is the greater'). Not citable for wording.",
    }),
    ("EL_Choco_DEVELOPER_Brochure", {"classification": "out_of_scope", "disposition": "not_retained", "language": "en",
                                     "notes": "Commercial brochure unrelated to peptide research. Not a source."}),
    ("El_Choco_Brochure_Clean_Vector_Text", {"classification": "out_of_scope", "disposition": "not_retained", "language": "en",
                                             "notes": "Commercial brochure unrelated to peptide research. Not a source."}),
    ("EudraLex Volume 4 Annex 1", {
        "classification": "complete_source",
        "title": "EudraLex Volume 4 GMP Annex 1: Manufacture of Sterile Medicinal Products, C(2022) 5938 final, 22 Aug 2022",
        "language": "en",
        "sourceKey": "SRC-124",
        "disposition": "working_copy",
        "artifact": {"key": "ART-SRC124-OWNER", "kind": "issuer_download", "verification": "matched_to_issuer",
                     "publicNote": "The copy held is byte-identical to the European Commission's own published file."},
        "notes": "Complete, 59 pages. SHA-256 identical to the file this index downloaded from health.ec.europa.eu on 14 September 2026.",
    }),
    ("Handbook-a-Professional-s-Guide", dup("SRC-002", "Peptide Handbook: A Professional's Guide to Peptide Therapeutics")),
    ("Lee & Burgess", {
        "classification": "owner_transcription",
        "title": "Safety of Intravenous Infusion of BPC157 in Humans: A Pilot Study (Lee E, Burgess K; Altern Ther Health Med 2025;31(5):20-24; PMID 40131143) — owner transcription",
        "language": "en",
        "sourceKey": "SRC-029",
        "disposition": "retained_reference",
        "artifact": {"key": "ART-SRC029-TRANSCRIPTION", "kind": "owner_transcription", "verification": "transcription_unverified",
                     "publicNote": "An owner-made transcription of the article text is held. It is not the publisher's version and nothing is cited from its body."},
        "notes": "Word document typed or pasted by the owner on 14 September 2026; not the publisher artifact. Its abstract matches the PubMed abstract except for one hyphen. Its body cannot be verified: Table 1 is missing, Table 2 is labelled for the wrong participant, and passages are out of order. Remains transcription_unverified until the publisher PDF is obtained and compared page by page.",
    }),
    ("Lee & Padgett", {
        "classification": "mislabelled",
        "title": "Named 'Intra Articular Injection of BPC 157 for Multiple Types of Knee Pain'; actually Lee E, 'Effects of Nitric Oxide on Carotid Intima Media Thickness: A Pilot Study', Altern Ther Health Med 2016;22(S2):32-34, PMID 27433839",
        "language": "en",
        "sourceKey": "SRC-031",
        "disposition": "rejected",
        "artifact": {"key": "ART-SRC031-MISLABELLED", "kind": "mislabelled_file", "verification": "identity_refuted",
                     "publicNote": "The file received under this article's title was a different article. The knee-pain study is still held at abstract level only."},
        "notes": "All three pages read: a nitric-oxide supplement pilot study on carotid intima-media thickness, with no BPC-157 content. SOURCE REPLACEMENT REQUIRED: Lee E, Padgett B, Altern Ther Health Med 2021;27(4):8-13, PMID 34324435.",
    }),
    ("Lee, Walker & Ayadi", {
        "classification": "complete_source",
        "title": "Effect of BPC-157 on Symptoms in Patients with Interstitial Cystitis: A Pilot Study (Lee E, Walker C, Ayadi B; Altern Ther Health Med 2024;30(10):12-17; PMID 39325560)",
        "language": "en",
        "sourceKey": "SRC-030",
        "disposition": "working_copy",
        "artifact": {"key": "ART-SRC030-PUBLISHER", "kind": "publisher_version", "verification": "title_page_verified",
                     "publicNote": "The publisher's PDF of the full article is held and was read."},
        "notes": "Complete publisher PDF, 6 pages (printed pp. 12-17), with the journal's copyright banner.",
    }),
    ("ORA.007", {
        "classification": "complete_source",
        "title": "FDA ORA.007 Pharmaceutical Microbiology Manual, Revision 02, 25 Aug 2020",
        "language": "en",
        "sourceKey": "SRC-125",
        "disposition": "working_copy",
        "artifact": {"key": "ART-SRC125-OWNER", "kind": "issuer_download", "verification": "matched_to_issuer",
                     "publicNote": "The copy held is byte-identical to the FDA's own published file."},
        "notes": "Complete, 92 pages. SHA-256 identical to the file this index downloaded from fda.gov/media/88801/download on 14 September 2026.",
    }),
    ("Peptide Protocol Dr. Seeds", dup("SRC-001", "The Peptide Protocols, Volume 1")),
    ("Peptide book 3", dup("SRC-005", "The Complete Guide to Peptides")),
    ("Peptide book.pdf", dup("SRC-003", "Optimize Your Health with Therapeutic Peptides")),
    ("Peptide cheat sheet 1", dup("SRC-004", "Peptide Cheat Sheet")),
    ("Sanyal et al.", {
        "classification": "complete_source",
        "title": "Triple hormone receptor agonist retatrutide for metabolic dysfunction-associated steatotic liver disease: a randomized phase 2a trial (Sanyal AJ et al.; Nat Med 2024;30:2037-2048; doi 10.1038/s41591-024-03018-2; PMID 38858523)",
        "language": "en",
        "sourceKey": "SRC-051",
        "disposition": "working_copy",
        "artifact": {"key": "ART-SRC051-PUBLISHER", "kind": "publisher_version", "verification": "title_page_verified",
                     "publicNote": "The publisher's PDF of the full article, including Methods and Extended Data, is held and was read."},
        "notes": "Complete publisher PDF, 31 pages (article, Methods, Extended Data, reporting summary).",
    }),
    ("Triple-Hormone-Receptor Agonist Retatrutide for Obesity", {
        "classification": "complete_source",
        "title": "Triple-Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial (Jastreboff AM et al.; N Engl J Med 2023;389:514-26; doi 10.1056/NEJMoa2301972; PMID 37366315)",
        "language": "en",
        "sourceKey": "SRC-050",
        "disposition": "working_copy",
        "artifact": {"key": "ART-SRC050-PUBLISHER", "kind": "publisher_version", "verification": "title_page_verified",
                     "publicNote": "The publisher's PDF of the full article is held and was read. Its Supplementary Appendix and protocol are not held."},
        "notes": "Complete publisher PDF, 13 pages, footer 'Downloaded from nejm.org on September 14, 2026'.",
    }),
    ("nejmoa2301972.pptx", {
        "classification": "supplementary_material",
        "title": "NEJM slide set for Jastreboff et al. 2023 (8 slides)",
        "language": "en",
        "sourceKey": "SRC-050",
        "disposition": "retained_reference",
        "artifact": {"key": "ART-SRC050-SLIDES", "kind": "supplementary_material", "verification": "title_page_verified",
                     "publicNote": "The journal's slide set for the article was also received; it repeats the article's figures and is not cited."},
        "notes": "Publisher slide deck: title, study overview, figures and tables as images, conclusions. Adds nothing beyond the article; not cited.",
    }),
    ("peptidebooks.zip", {"classification": "duplicate", "disposition": "not_retained", "language": "en",
                          "notes": "Archive containing three files byte-for-byte the same size and name as the registered SRC-001, SRC-003 and SRC-004 copies. Not extracted or retained."}),
]

DOWNLOADED: list[tuple[str, dict]] = [
    ("pardeshi.pdf", {
        "origin": "https://link.springer.com/content/pdf/10.1186/s43094-023-00551-8.pdf",
        "classification": "complete_source",
        "title": "Pardeshi SR et al., Process development and quality attributes for the freeze-drying process …, Future J Pharm Sci 2023;9:99, doi 10.1186/s43094-023-00551-8",
        "language": "en", "sourceKey": "SRC-123", "disposition": "working_copy",
        "artifact": {"key": "ART-SRC123-PUBLISHER", "kind": "publisher_version", "verification": "title_page_verified",
                     "publicNote": "Open-access publisher PDF downloaded directly from the journal."},
        "notes": "Downloaded twice by two publisher URLs; both byte-identical. Title, authors, DOI and 31 pages confirmed.",
    }),
    ("Prot_000.pdf", {
        "origin": "https://cdn.clinicaltrials.gov/large-docs/85/NCT04867785/Prot_000.pdf",
        "classification": "complete_source", "title": "Protocol J1I-MC-GZBD amendment (c), 29 Aug 2022",
        "language": "en", "sourceKey": "SRC-127", "disposition": "working_copy",
        "artifact": {"key": "ART-SRC127-REGISTRY", "kind": "registry_document", "verification": "title_page_verified",
                     "publicNote": "The protocol as posted to the ClinicalTrials.gov record, downloaded directly from the registry."},
        "notes": "123 pages. The owner's NCT04867785.csv was not present in the intake folder; the document link given in the brief was used directly.",
    }),
    ("SAP_001.pdf", {
        "origin": "https://cdn.clinicaltrials.gov/large-docs/85/NCT04867785/SAP_001.pdf",
        "classification": "complete_source", "title": "Statistical analysis plan J1I-MC-GZBD v3.0, 13 Dec 2022",
        "language": "en", "sourceKey": "SRC-128", "disposition": "working_copy",
        "artifact": {"key": "ART-SRC128-REGISTRY", "kind": "registry_document", "verification": "title_page_verified",
                     "publicNote": "The statistical analysis plan as posted to the ClinicalTrials.gov record, downloaded directly from the registry."},
        "notes": "54 pages.",
    }),
    ("NCT04881760_Prot_000.pdf", {
        "origin": "https://cdn.clinicaltrials.gov/large-docs/60/NCT04881760/Prot_000.pdf",
        "classification": "complete_source", "title": "Protocol J1I-MC-GZBF amendment (b), 29 Aug 2022",
        "language": "en", "sourceKey": "SRC-130", "disposition": "working_copy",
        "artifact": {"key": "ART-SRC130-REGISTRY", "kind": "registry_document", "verification": "title_page_verified",
                     "publicNote": "The protocol as posted to the ClinicalTrials.gov record, downloaded directly from the registry."},
        "notes": "127 pages. Located from the registry record's document section.",
    }),
    ("NCT04881760_SAP_001.pdf", {
        "origin": "https://cdn.clinicaltrials.gov/large-docs/60/NCT04881760/SAP_001.pdf",
        "classification": "complete_source", "title": "Statistical analysis plan J1I-MC-GZBF v4.0, 15 Dec 2022",
        "language": "en", "sourceKey": "SRC-131", "disposition": "working_copy",
        "artifact": {"key": "ART-SRC131-REGISTRY", "kind": "registry_document", "verification": "title_page_verified",
                     "publicNote": "The statistical analysis plan as posted to the ClinicalTrials.gov record, downloaded directly from the registry."},
        "notes": "56 pages.",
    }),
]
for nct, key in [("NCT04867785", "SRC-126"), ("NCT04881760", "SRC-129"), ("NCT04143802", "SRC-137"),
                 ("NCT06354660", "SRC-138"), ("NCT03841630", "SRC-139")]:
    DOWNLOADED.append((f"{nct}.json", {
        "origin": f"https://clinicaltrials.gov/api/v2/studies/{nct}",
        "classification": "complete_source", "title": f"ClinicalTrials.gov API v2 record {nct}",
        "language": "en", "sourceKey": key, "disposition": "working_copy",
        "artifact": {"key": f"ART-{key.replace('-', '')}-SNAPSHOT", "kind": "registry_snapshot", "verification": "matched_to_issuer",
                     "publicNote": "The registry record as retrieved from ClinicalTrials.gov on 14 September 2026; a snapshot is kept so every figure can be re-read."},
        "notes": f"Committed at data/sources/registry/{nct}.json.",
    }))


def describe(path: Path, meta: dict, origin: str) -> dict:
    pages, extractable = pdf_pages(path)
    row = {
        "file": path.name,
        "origin": origin,
        "sha256": sha256(path),
        "bytes": path.stat().st_size,
        "pages": pages,
        "documentType": path.suffix.lower().lstrip("."),
        "textExtractable": extractable,
        **{k: v for k, v in meta.items() if k != "artifact"},
    }
    art = meta.get("artifact")
    if art:
        row["artifact"] = {
            "artifactKey": art["key"],
            "sourceKey": meta["sourceKey"],
            "artifactKind": art["kind"],
            "disposition": meta["disposition"],
            "verification": art["verification"],
            "filename": path.name,
            "sha256": row["sha256"],
            "bytes": row["bytes"],
            "pageCount": pages,
            "language": meta.get("language"),
            "acquiredFrom": origin,
            "acquiredAt": DATE,
            "duplicateOfArtifactKey": art.get("duplicateOf"),
            "distributionProvenance": art.get("distribution"),
            "notes": meta.get("notes"),
            "publicNote": art.get("publicNote"),
        }
    return row


def main() -> None:
    rows = []
    claimed = set()
    for path in sorted(INTAKE.iterdir()):
        if not path.is_file():
            continue
        if path.suffix.lower() in (".tmp", ".crdownload") or path.stat().st_size == 0:
            continue
        match = next((m for prefix, m in OWNER_FILES if path.name.startswith(prefix)), None)
        if match is None:
            raise SystemExit(f"Unclassified intake file: {path.name}")
        claimed.add(path.name)
        rows.append(describe(path, match, f"Owner intake folder, {DATE}"))
    for name, meta in DOWNLOADED:
        rows.append(describe(DOWNLOADS / name, meta, meta["origin"]))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"intakeDate": DATE, "intakeFolder": str(INTAKE), "files": rows},
                              indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    kinds: dict[str, int] = {}
    for r in rows:
        kinds[r["classification"]] = kinds.get(r["classification"], 0) + 1
    print(f"{len(rows)} files registered; {sum(1 for r in rows if 'artifact' in r)} artifacts")
    for k, v in sorted(kinds.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
