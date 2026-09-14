#!/usr/bin/env python3
"""
Accessible sources that answer the questions three unobtainable books were meant to answer.

    python -X utf8 scripts/sources/register-alternatives-2026-09-14.py

Owner direction, 14 September 2026: manual acquisition is finished. For a source
that is paywalled, partial, the wrong edition or impractical to obtain, ask
whether the scientific question can be answered better from other legitimate
sources, record SOURCE NOT HELD, and answer the question from those — without
pretending an alternative is the missing source and without lowering standards.

This script:

  - registers four open-access peer-reviewed reviews and two ICH stability
    guidelines as sources in their own right (OpenStax textbooks were considered
    and not used: their pages prohibit ingestion into large language models
    without permission — owner decision D-26);
  - marks Lehninger (SRC-120), Banga (SRC-014) and the English Rang and Dale
    (SRC-122) as SOURCE NOT HELD, naming the questions each was meant to answer
    and the sources now answering them;
  - records a third Banga file (Downloads, 166 pages) as a rejected advertisement.

Web-page and XML sources have no file in sources/: they are held as text
snapshots in data/private/source-snapshots/ (gitignored), pinned by URL,
retrieval date and snapshot hash, the way registry records are.
Idempotent.
"""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
SCRATCH = Path(r"C:\Users\ianbu\AppData\Local\Temp\claude\C--The-Tides-Index"
               r"\32f9e6c6-4fcf-4e60-b98b-623e91076bee\scratchpad\alt")
SNAP = ROOT / "data" / "private" / "source-snapshots"
SOURCES = ROOT / "sources"
REGISTER = ROOT / "data" / "seed" / "source-artifacts" / "intake-2026-09-14.json"
BANGA_THIRD = Path(r"C:\Users\ianbu\Downloads"
                   r"\1048107782-Ebook-Therapeutic-Peptides-and-Proteins-Formulation-Processing-and-Delivery-Systems-Third-Edition.pdf")
TODAY = "2026-09-14"

REVIEW_LIMITS = (
    "A narrative review, not a systematic review: its statements characterise literature it "
    "cites, which this index has not obtained, so evidence resting on it is traced as "
    "cited_not_obtained. General statements only; no figure is taken from it without its own "
    "wording and a note of what it cites. Open access under CC BY; the full text was retrieved "
    "from the Europe PMC API and read."
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def base(**f):
    e = {
        "priority": "core", "public_fulltext_allowed": False, "canonical_filename": None,
        "known_local_filename": None, "isbn": None, "edition": None, "publisher": None,
        "publication_name": None, "local_file_sha256": None, "local_file_bytes": None,
        "page_count": None, "printed_page_offset": None, "title_page_verified": False,
        "bibliographic_verified": True, "title_page_title": None, "title_page_authors": None,
        "verified_at": TODAY, "authority_notes": None, "limitations_notes": None,
        "integrity_notes": None, "doi": None, "pmid": None, "trial_registry_id": None,
        "canonical_url": None, "access_status": "held",
    }
    e.update(f)
    return e


def review(key, name, title, authors, year, journal, vol, art, doi, pmid, pmcid, role):
    meta = json.loads((SNAP / "reviews" / "_meta.json").read_text(encoding="utf-8"))[name]
    return base(
        source_key=key, title=title, authors=authors, year=year,
        source_type="systematic_review_meta_analysis", qc_status="usable",
        publication_name=journal, edition=f"Volume {vol}, article {art}",
        doi=doi, pmid=pmid, canonical_url=f"https://europepmc.org/article/PMC/{pmcid[3:]}",
        primary_role=role,
        authority_notes=f"Peer-reviewed open-access review ({pmcid}). Bibliographic fields confirmed against PubMed (PMID {pmid}).",
        limitations_notes=REVIEW_LIMITS,
        integrity_notes=f"Full-text XML retrieved from the Europe PMC REST API on 14 September 2026 (sha256 {meta['sha256'][:16]}), converted to section-headed text in data/private/source-snapshots/reviews/{name}.txt. Locators are section headings.",
        verified_by="Europe PMC full-text XML and PubMed esummary.",
        access_status="held",
        access_notes="Open access; retrieved from the Europe PMC API and pinned by PMCID, date and hash. No file in sources/.",
    )


NEW = [
    review("SRC-143", "wang2022-therapeutic-peptides", "Therapeutic peptides: current applications and future directions",
           ["Wang L", "Wang N", "Zhang W", "Cheng X", "Yan Z", "Shao G", "Wang X", "Wang R", "Fu C"], 2022,
           "Signal Transduction and Targeted Therapy", "7", "48", "10.1038/s41392-022-00904-4", "35165272", "PMC8844085",
           "Why peptides are studied as a class and the practical difficulties they bring (Understanding Peptides chapter Six), and routes and delivery barriers."),
    review("SRC-144", "strategies-peptide-stability-2022", "Strategies for Improving Peptide Stability and Delivery",
           ["Al Musaimi O", "Lombardi L", "Williams DR", "Albericio F"], 2022,
           "Pharmaceuticals (Basel)", "15", "1283", "10.3390/ph15101283", "36297395", "PMC9610364",
           "Read for the formulation questions Banga (SRC-014) was meant to answer and found off-topic: its 'stability' is proteolytic and metabolic stability in the body, not shelf stability. Registered so the reading is on record; no claim rests on it."),
    review("SRC-145", "formulation-peptides-aqueous-2023", "Designing Formulation Strategies for Enhanced Stability of Therapeutic Peptides in Aqueous Solutions: A Review",
           ["Nugrahadi PP", "Hinrichs WLJ", "Frijlink HW", "Schöneich C", "Avanti C"], 2023,
           "Pharmaceutics", "15", "935", "10.3390/pharmaceutics15030935", "36986796", "PMC10056213",
           "Chemical and physical instability of peptides in solution and the role of pH, buffers and excipients in formulation."),
    review("SRC-146", "oral-delivery-proteins-peptides-2022", "Oral delivery of protein and peptide drugs: from non-specific formulation approaches to intestinal cell targeting strategies",
           ["Chen G", "Kang W", "Li W", "Chen S", "Gao Y"], 2022,
           "Theranostics", "12", "1419", "10.7150/thno.61747", "35154498", "PMC8771547",
           "Why oral delivery of peptides is difficult: enzymatic and epithelial barriers, and the approaches studied to overcome them."),
]

ICH = [
    ("SRC-147", "ICH_Q5C.pdf", "ICH_Q5C_Stability_Biotechnological_Products_Step4_1995.pdf",
     "ICH Q5C: Quality of Biotechnological Products — Stability Testing of Biotechnological/Biological Products",
     1995, "Step 4, 30 November 1995",
     "What stability testing of biotechnological/biological products is for, which attributes and conditions it addresses, and why a product's stability must be shown rather than assumed.",
     "SCOPE: biotechnological/biological products (for example proteins and polypeptides produced by recombinant or other biological processes) submitted for registration. It is not automatically a requirement for chemically synthesised peptides or research-use materials, and it sets no shelf life for any product."),
    ("SRC-148", "ICH_Q1A_R2.pdf", "ICH_Q1A_R2_Stability_Testing_Step4_2003.pdf",
     "ICH Q1A(R2): Stability Testing of New Drug Substances and Products",
     2003, "Step 4, 6 February 2003",
     "The purpose and design of formal stability studies for new drug substances and products: storage conditions, attributes tested and how a re-test period or shelf life is established.",
     "SCOPE: registration applications for new molecular entities and their products in the ICH regions. A description of how registered products are tested; not evidence about any research-use product."),
]

NOT_HELD = {
    "SRC-120": ('Understanding Peptides chapters One to Four (what a peptide is; amino acids, peptides and proteins; peptides in the body; signalling)', "permissively licensed sources registered as themselves: CC BY reviews SRC-143, SRC-145, SRC-151 to SRC-163 and SRC-165 to SRC-168, the public-domain NHGRI glossary (SRC-164) and a public-domain 1998 US government overview (SRC-156); OpenStax is excluded (owner decision D-26, closed). Points no source held states — chain termini and 'residue', growth factors as a class, a general rule on peptide half-life, paracrine and autocrine definitions, and whether 'the body makes it' bears on safety — stay SOURCE NEEDED"),
    "SRC-122": ('Receptor signalling beyond chapter 2, and pharmacokinetics (absorption, distribution, metabolism, elimination, half-life, bioavailability, routes)', 'SRC-146 and SRC-143 (why oral peptide delivery is hard; short half-lives), CC BY receptor and signalling reviews SRC-155, SRC-157 to SRC-159 and SRC-169 to SRC-180, CC BY pharmacokinetics and route reviews SRC-181 to SRC-185 and SRC-188 to SRC-192, the NCI Thesaurus (SRC-187, CC BY 4.0), 21 CFR 314.3 (SRC-186) and the FDA route data standard (SRC-193), both public domain; OpenStax is excluded (D-26). Steady state, what half-life does not tell you, general protein binding, and kinase cascades stay SOURCE NEEDED'),
    "SRC-014": ("Peptide formulation: degradation pathways, excipients, pH and buffers, stability testing",
                "SRC-145 (open-access formulation and stability review), SRC-147 (ICH Q5C) and SRC-148 (ICH Q1A(R2)); SRC-144 was read and supports none of these questions"),
}


def main() -> None:
    mpath = ROOT / "SOURCE_MANIFEST.json"
    manifest = json.loads(mpath.read_text(encoding="utf-8"))
    by_key = {s["source_key"]: s for s in manifest["sources"]}

    for key, fname, canonical, title, year, edition, role, limits in ICH:
        target = SOURCES / canonical
        shutil.copy2(SCRATCH / fname, target)
        with fitz.open(target) as d:
            pages = d.page_count
        NEW.append(base(
            source_key=key, title=title,
            authors=["International Conference on Harmonisation of Technical Requirements for Registration of Pharmaceuticals for Human Use"],
            year=year, source_type="regulatory_guidance", qc_status="usable", publisher="ICH",
            publication_name="ICH Harmonised Tripartite Guideline", edition=edition,
            canonical_url="https://database.ich.org/sites/default/files/" + ("Q5C%20Guideline.pdf" if key == "SRC-147" else "Q1A%28R2%29%20Guideline.pdf"),
            primary_role=role,
            authority_notes="Official ICH guideline, retrieved directly from database.ich.org on 14 September 2026.",
            limitations_notes=limits + " Regulatory context, not scientific proof. Locators use printed pages: printed page + " + ("2" if key == "SRC-147" else "6") + " = file page.",
            integrity_notes="Complete, born-digital, retrieved from the issuing body. Title page confirms the guideline, its code and its Step 4 date.",
            known_local_filename=canonical, canonical_filename=canonical,
            printed_page_offset=2 if key == "SRC-147" else 6,
            local_file_sha256=sha(target), local_file_bytes=target.stat().st_size, page_count=pages,
            title_page_verified=True, title_page_title=title,
            title_page_authors="ICH Expert Working Group",
            verified_by="Retrieved from the issuing body; title page read and compared with the registry.",
            access_notes="Published free by the issuing body and retrieved directly from it.",
        ))

    for entry in NEW:
        if entry["source_key"] in by_key:
            by_key[entry["source_key"]].update(entry)
        else:
            manifest["sources"].append(entry)
            by_key[entry["source_key"]] = entry

    for key, (questions, answered_by) in NOT_HELD.items():
        s = by_key[key]
        note = (f" SOURCE NOT HELD (owner direction, 14 September 2026: acquisition for this round is finished; "
                f"no further copies are to be sought). The questions it was meant to answer — {questions} — "
                f"are answered instead from {answered_by}. Those are different works, cited as themselves; "
                f"none is presented as this source.")
        existing = s.get("limitations_notes") or ""
        # Replace an earlier version of the note rather than appending a second one.
        cut = existing.find(" SOURCE NOT HELD (owner direction")
        s["limitations_notes"] = (existing[:cut] if cut >= 0 else existing).rstrip() + note

    b = by_key["SRC-014"]
    # "Held" described the advertisement, not the book. The file record stays
    # (its hash identifies a rejected artifact); the book itself is not held.
    b["access_status"] = "unavailable"
    b["access_notes"] = ("SOURCE NOT HELD. Three files received under this title were download-site "
                         "advertisements, recorded as rejected artifacts; the filename and hash on this record "
                         "identify the first of them, not the book. Per owner direction (14 September 2026) no "
                         "further copy is sought.")
    b["integrity_notes"] = b["integrity_notes"].replace("SOURCE REPLACEMENT REQUIRED.", "SOURCE NOT HELD.")
    third = " A third file (Downloads, 166 pages, 14 September 2026) is the same download-site advertisement followed by unrelated text; rejected."
    if third.strip() not in (b.get("integrity_notes") or ""):
        b["integrity_notes"] = (b.get("integrity_notes") or "") + third

    manifest["sources"].sort(key=lambda s: int(s["source_key"].split("-")[1]))
    mpath.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    register = json.loads(REGISTER.read_text(encoding="utf-8"))
    if not any(r["file"] == BANGA_THIRD.name for r in register["files"]):
        with fitz.open(BANGA_THIRD) as d:
            pages = d.page_count
        digest = sha(BANGA_THIRD)
        register["files"].append({
            "file": BANGA_THIRD.name, "origin": "Owner Downloads folder, 2026-09-14",
            "sha256": digest, "bytes": BANGA_THIRD.stat().st_size, "pages": pages,
            "documentType": "pdf", "textExtractable": True,
            "classification": "advertisement",
            "title": "Therapeutic Peptides and Proteins: Formulation, Processing, and Delivery Systems, Third Edition (Banga) — as named by the file",
            "language": "en", "sourceKey": "SRC-014", "disposition": "rejected",
            "notes": "Pages 1–4 are a download-site sales page (formats, rating, prices, related titles); from page 5 the text is unrelated fragments of other works. The third such file received under this title. Not the book. Per owner direction, no further copy is sought; the formulation questions are answered from SRC-145, SRC-147 and SRC-148.",
            "artifact": {
                "artifactKey": "ART-SRC014-ADVERT-3", "sourceKey": "SRC-014", "artifactKind": "advertisement",
                "disposition": "rejected", "verification": "identity_refuted", "filename": BANGA_THIRD.name,
                "sha256": digest, "bytes": BANGA_THIRD.stat().st_size, "pageCount": pages, "language": "en",
                "acquiredFrom": "Owner Downloads folder, 2026-09-14", "acquiredAt": TODAY,
                "duplicateOfArtifactKey": None, "distributionProvenance": None,
                "notes": "Third download-site advertisement received under this title.",
                "publicNote": "A third file received under this title was also an advertisement. The book is not held; its formulation topics are answered from open-access reviews and ICH stability guidelines.",
            },
        })
        REGISTER.write_text(json.dumps(register, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"manifest: {len(manifest['sources'])} sources; register: {len(register['files'])} files")


if __name__ == "__main__":
    main()
