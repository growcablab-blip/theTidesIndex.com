#!/usr/bin/env python3
"""
Two conference abstracts from the early retatrutide studies.

    python -X utf8 scripts/sources/register-retatrutide-conference-abstracts-2026-09-14.py

Owner direction, 14 September 2026: do not let inaccessible journal PDFs stop deep
evidence extraction; use the evidence ecosystem around each trial. The phase 1
and phase 1b journal articles are paywalled and no supplement is freely
available, but the American Diabetes Association abstracts presented before
them are deposited, with their full abstract text, in the publisher's Crossref
record.

Registers:
  SRC-149  104-OR, Diabetes 2021;70(Suppl 1) — first-in-human single-dose study
  SRC-150  340-OR, Diabetes 2022;71(Suppl 1) — phase 1b multiple-dose study in T2D

Neither gives a registry number, so their links to NCT03841630 and NCT04143802
are recorded as unconfirmed in the trial packet. The Crossref records are saved as
private snapshots pinned by DOI, retrieval date and hash. Idempotent.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = Path(r"C:\Users\ianbu\AppData\Local\Temp\claude\C--The-Tides-Index"
           r"\32f9e6c6-4fcf-4e60-b98b-623e91076bee\scratchpad\reta-ecosystem\raw")
SNAP = ROOT / "data" / "private" / "source-snapshots" / "abstracts"
TODAY = "2026-09-14"

ABSTRACTS = [
    ("SRC-149", "cr_db21-104-OR.json", "10.2337/db21-104-OR", 2021, "70",
     "First-in-human single-ascending-dose study of retatrutide (LY3437943) in 45 healthy participants: safety, heart rate and blood pressure, half-life, insulin and C-peptide, weight and appetite. Plausibly NCT03841630; the abstract gives no registry number.",
     "Conference abstract of a phase 1 study, 45 healthy participants, single injections; developer-funded, and six of seven authors declare employment by the developer. Qualitative for heart rate; no numbers by group. Abstract read in full from the publisher's Crossref deposit; the journal page refused access (HTTP 403) and the licence page could not be read. Full text not obtained; there is no full text beyond the abstract."),
    ("SRC-150", "cr_db22-340-OR.json", "10.2337/db22-340-OR", 2022, "71",
     "Phase 1b multiple-ascending-dose study of retatrutide in 72 people with type 2 diabetes over 12 weeks, as presented before the journal article (SRC-048): safety, heart rate and blood pressure, HbA1c and weight. Plausibly NCT04143802; the abstract gives no registry number.",
     "Conference abstract of a phase 1b study, 72 participants, 12 weeks; developer-funded, and seven of eight authors declare employment by the developer. Qualitative for heart rate; no per-cohort numbers and no pharmacokinetic parameters. Abstract read in full from the publisher's Crossref deposit; the journal page refused access (HTTP 403) and the licence page could not be read. Full text not obtained; the peer-reviewed article is SRC-048."),
]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    SNAP.mkdir(parents=True, exist_ok=True)
    mpath = ROOT / "SOURCE_MANIFEST.json"
    manifest = json.loads(mpath.read_text(encoding="utf-8"))
    by_key = {s["source_key"]: s for s in manifest["sources"]}

    for key, fname, doi, year, volume, role, limits in ABSTRACTS:
        raw = RAW / fname
        target = SNAP / fname
        shutil.copy2(raw, target)
        digest = sha(target.read_bytes())
        m = json.loads(target.read_text(encoding="utf-8"))["message"]
        title = re.sub(r"\s+", " ", m["title"][0]).strip()
        authors = [f"{a['family'].title()} {''.join(p[0] for p in re.split(r'[ .-]+', a['given']) if p)}"
                   for a in m["author"]]
        if not m.get("abstract"):
            raise SystemExit(f"{key}: Crossref record carries no abstract")
        entry = {
            "source_key": key, "title": title, "authors": authors, "year": year,
            "source_type": "conference_presentation", "priority": "supporting", "qc_status": "usable",
            "public_fulltext_allowed": False, "canonical_filename": None, "known_local_filename": None,
            "isbn": None, "edition": f"Volume {volume}, Supplement 1", "publisher": "American Diabetes Association",
            "publication_name": "Diabetes", "local_file_sha256": None, "local_file_bytes": None,
            "page_count": None, "printed_page_offset": None, "title_page_verified": False,
            "bibliographic_verified": True, "title_page_title": None, "title_page_authors": None,
            "verified_at": TODAY, "verified_by": "Crossref REST API record for the DOI, deposited by the publisher; abstract read in full.",
            "authority_notes": "Abstract presented at the American Diabetes Association Scientific Sessions and published in the journal's supplement. Not peer reviewed as an article. Bibliographic fields are the publisher's own Crossref deposit.",
            "limitations_notes": limits,
            "integrity_notes": f"Crossref record retrieved {TODAY} and saved as a private snapshot in data/private/source-snapshots/abstracts/{fname} (sha256 {digest[:16]}).",
            "doi": doi.lower(), "pmid": None, "trial_registry_id": None,
            "canonical_url": f"https://doi.org/{doi}", "primary_role": role,
            "access_status": "abstract_held",
            "access_notes": "Conference abstract read in full from the publisher's Crossref deposit. Full text not obtained: none exists beyond the abstract, and the journal page refused access.",
        }
        if key in by_key:
            by_key[key].update(entry)
        else:
            manifest["sources"].append(entry)
            by_key[key] = entry

    manifest["sources"].sort(key=lambda s: int(s["source_key"].split("-")[1]))
    mpath.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"manifest: {len(manifest['sources'])} sources")


if __name__ == "__main__":
    main()
