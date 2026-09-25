#!/usr/bin/env python3
"""
BPC-157 targeted evidence repair, 15 September 2026.

    python -X utf8 scripts/evidence/strengthen-bpc-157-2026-09-15.py

Why this exists. The BPC-157 record reported human evidence present and
preclinical evidence zero, while discussing a large laboratory and animal
literature. The zero was real in the data: every laboratory or animal finding on
the record reached it through a practitioner handbook (practitioner_reference)
or through the abstract of a systematic review (academic_reference), both in the
reference lane. The 165 preclinical publications counted by the PubMed screen
are a ledger, not evidence rows, so nothing reached the preclinical lane.

What this does, and nothing more:

  - Registers three primary preclinical studies that the Vasireddi/Voos
    systematic review (SRC-032) maps in its reference list, chosen because each
    is open access under CC BY and could be read in full:
      Japjec et al. 2021 (Biomedicines)      rat myotendinous junction, in vivo
      Chang et al. 2014 (Molecules)          rat tendon fibroblasts, in vitro
      He et al. 2022 (Front Pharmacol)       rat and dog pharmacokinetics
    Each licence is read from the retrieved XML and the build refuses anything
    that is not CC BY (NonCommercial and NoDerivatives are refused). Anchor
    phrases each claim relies on are checked word for word in the retrieved
    text. Snapshots are private (data/private is gitignored).
  - Adds one claim per study, each citing the primary paper by section.
  - Records the review as what it is: an evidence map, cited at abstract level
    for claims about the shape of the literature only (BPC-011). Its full text
    is in PubMed Central without an open licence this index could confirm, so
    it is not extracted. It is never cited for a preclinical claim.
  - Registers four ClinicalTrials.gov records as trials with no results
    posted. They are not claim evidence and cannot count as human evidence.
  - Records what could not be read as gaps rather than citing it through the
    review.
  - Corrects SRC-032's author list (it held the journal name).

Nothing is marked reviewed or published. No amount from any registry record or
paper is written into claims, trials or gaps. Idempotent.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "SOURCE_MANIFEST.json"
PACKET = ROOT / "data" / "seed" / "evidence" / "bpc-157.json"
SCREEN = ROOT / "data" / "seed" / "literature" / "bpc-157-screen.json"
TRIALS = ROOT / "data" / "seed" / "trials" / "bpc-157-trials.json"
REGISTRY = ROOT / "data" / "sources" / "registry"
SNAP = ROOT / "data" / "private" / "source-snapshots" / "bpc-157"
TODAY = "2026-09-15"
UA = {"User-Agent": "TheTidesIndex-evidence-build/1.0 (research index; licence-checked retrieval)"}

PERMITTED = re.compile(r"creativecommons\.org/licenses/by/|Creative Commons Attribution(?: 4\.0 International)? (?:\(CC BY\) )?[Ll]icen[cs]e|\(CC BY\)", re.I)
FORBIDDEN = re.compile(r"licenses/by-(nc|nd)|cc by-nc|cc by-nd|noncommercial|non-commercial|noderivatives|no derivatives", re.I)
TDM = re.compile(r"text[- ]and[- ]data[- ]mining|machine learning|artificial intelligence", re.I)


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def xml_to_text(raw: str) -> str:
    t = re.sub(r"(?s)<ref-list.*?</ref-list>", "", raw)
    t = re.sub(r"(?s)<table-wrap.*?</table-wrap>", lambda m: "\n[TABLE] " + re.sub(r"<[^>]+>", " ", m.group(0)) + "\n", t)
    t = re.sub(r"<title>(.*?)</title>", lambda m: "\n\n## " + re.sub(r"<[^>]+>", "", m.group(1)) + "\n", t)
    t = re.sub(r"</p>", "\n", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t]+", " ", t)
    return re.sub(r"\n\s*\n+", "\n\n", t)


# ---------------------------------------------------------------------------
# Primary preclinical studies
# ---------------------------------------------------------------------------

STUDIES = [
    {
        "slug": "japjec2021-myotendinous-junction",
        "pmcid": "PMC8615275",
        "pmid": "34829776",
        "doi": "10.3390/biomedicines9111547",
        "title": "Stable Gastric Pentadecapeptide BPC 157 as a Therapy for the Disable Myotendinous Junctions in Rats",
        "authors": ["Japjec M", "Horvat Pavlov K", "Petrovic A", "Staresinic M", "Sebecic B", "Buljan M", "Vranes H",
                    "Giljanovic A", "Drmic D", "Japjec M", "Prtoric A", "Lovric E", "Batelja Vuletic L", "Dobric I",
                    "Boban Blagaic A", "Skrtic A", "Seiwerth S", "Predrag S"],
        "year": 2021,
        "publication_name": "Biomedicines",
        "publisher": "MDPI",
        "edition": "Biomedicines 2021;9(11):1547",
        "primary_role": "Primary animal evidence for BPC-157 in a musculoskeletal injury model: a rat quadriceps myotendinous-junction defect, with functional, biomechanical, histological and biochemical outcomes against controls. One of the preclinical studies mapped by the orthopaedic systematic review (SRC-032).",
        "limitations_notes": "One rat study, six animals per group and time point, in a lesion model created by the investigators. Random assignment and blinded surgery and assessment are stated; no sample-size calculation is described. From the Zagreb group, whose earlier muscle, tendon and ligament studies it cites as its premise, so it is not independent replication of them. Amounts given are rat amounts. A rat result does not establish any effect in people. PubMed lists the last author as 'Predrag S'; the article gives the name as Sikiric Predrag. The author list is recorded as PubMed gives it.",
        "anchors": {
            "bpc-japjec-methods": ["randomly assigned at 6 rats/group/interval", "The surgical procedure was carried out in a blinded fashion",
                                   "The experiments were assessed by observers blinded as to the treatment", "99% (HPLC) purity"],
            "bpc-japjec-results": ["the leg contractures disappeared in those rats", "BPC 157 increases eNOS mRNA levels and decreases COX 2 mRNA levels",
                                   "control rats exhibit areas of smaller muscle fibers", "BPC 157 opposes oxidative stress"],
            "bpc-japjec-discussion": ["cannot provide precise information about the full mechanisms responsible", "University of Zagreb, Zagreb, Croatia (Grant BM 099)",
                                      "The authors declare that there are no conflicts of interest"],
        },
    },
    {
        "slug": "chang2014-tendon-fibroblast-ghr",
        "pmcid": "PMC6271067",
        "pmid": "25415472",
        "doi": "10.3390/molecules191119066",
        "title": "Pentadecapeptide BPC 157 enhances the growth hormone receptor expression in tendon fibroblasts",
        "authors": ["Chang CH", "Tsai WC", "Hsu YH", "Pang JH"],
        "year": 2014,
        "publication_name": "Molecules",
        "publisher": "MDPI",
        "edition": "Molecules 2014;19(11):19066-19077",
        "primary_role": "Primary in vitro evidence for a proposed BPC-157 mechanism in tendon: growth hormone receptor expression in cultured rat Achilles tendon fibroblasts. From a group independent of the Zagreb group. One of the preclinical studies mapped by the orthopaedic systematic review (SRC-032).",
        "limitations_notes": "Cells in culture from male Sprague-Dawley rats; each experiment repeated three times with cells from a different rat; t-test comparisons. The microarray that prompted the study came from the group's earlier work. The authors state that culture cannot reproduce the environment of a healing tendon, and that their earlier study found no direct proliferative effect of BPC-157 alone. The peptide was bought from a named supplier with sequence and molecular weight given; no purity or identity testing is reported. No animal or human outcome was measured.",
        "anchors": {
            "bpc-chang-results": ["the expression of growth hormone receptor was found to increase in a dose-dependent manner",
                                  "Up to sevenfold increases could be observed at day three", "the level of phosphorylated but not the total amount of Jak2"],
            "bpc-chang-discussion": ["BPC 157 actually has no direct effect on promoting the proliferation", "could not mimic the real environment of tendon"],
            "bpc-chang-methods": ["Each experiment was repeated three times using tendon fibroblasts isolated from a different rat",
                                  "Kelowna International Scientific Inc.", "National Science Council of Taiwan", "The authors declare no conflict of interest"],
        },
    },
    {
        "slug": "he2022-pharmacokinetics-rats-dogs",
        "pmcid": "PMC9794587",
        "pmid": "36588717",
        "doi": "10.3389/fphar.2022.1026182",
        "title": "Pharmacokinetics, distribution, metabolism, and excretion of body-protective compound 157, a potential drug for treating various wounds, in rats and dogs",
        "authors": ["He L", "Feng D", "Guo H", "Zhou Y", "Li Z", "Zhang K", "Zhang W", "Wang S", "Wang Z", "Hao Q", "Zhang C",
                    "Gao Y", "Gu J", "Zhang Y", "Li W", "Li M"],
        "year": 2022,
        "publication_name": "Frontiers in Pharmacology",
        "publisher": "Frontiers Media",
        "edition": "Frontiers in Pharmacology 2022;13:1026182",
        "primary_role": "The only pharmacokinetic study of BPC-157 this index holds: intravenous and intramuscular administration in rats and beagle dogs, with radiolabel excretion, metabolism and tissue distribution in rats. Mapped by the orthopaedic systematic review (SRC-032) for its half-life statement.",
        "limitations_notes": "Animal study; intravenous and intramuscular routes only, so it says nothing about oral or subcutaneous administration. Material synthesised and purified by the authors' own laboratory. The authors state that many methodological validations were omitted for space and that metabolites in tissues were not analysed. Total-radioactivity measurements track breakdown products as well as intact peptide. The authors' description of their results as proving metabolic safety is their interpretation and is not adopted here.",
        "anchors": {
            "bpc-he-rat-pk": ["its elimination half-life was less than 30 min",
                              "The absolute bioavailability after IM administration of each dose was 18.82%, 14.49%, and 19.35%"],
            "bpc-he-dog-pk": ["The absolute bioavailability observed after IM administration of each dose in dogs was 45.27%, 47.64%, and 50.56%",
                              "The prototype drug could not be detected 4 h after administration"],
            "bpc-he-adme": ["urinary excretion is the dominant route of elimination", "subsequently degraded into small molecular peptide fragments"],
            "bpc-he-discussion-methods": ["we did not conduct metabolite analysis in tissues", "Many methodological validations were not included",
                                          "synthesized and purified via HPLC in our laboratory with 99% purity", "National Natural Science Foundation of China"],
        },
    },
]

REGISTRY_RECORDS = [
    {"nct": "NCT02637284", "sponsor": "PharmaCotherapia d.o.o. (sponsor)", "year": 2015,
     "edition": "Record as retrieved 15 September 2026; first posted 22 December 2015; last update posted 22 December 2015; no results posted"},
    {"nct": "NCT07437547", "sponsor": "Hudson Biotech (sponsor)", "year": 2026,
     "edition": "Record as retrieved 15 September 2026; first posted 27 February 2026; last update posted 27 February 2026; no results posted"},
    {"nct": "NCT07803250", "sponsor": "University of Arkansas (sponsor)", "year": 2026,
     "edition": "Record as retrieved 15 September 2026; first posted 3 September 2026; last update posted 3 September 2026; no results posted"},
    {"nct": "NCT07752381", "sponsor": "Parlay Wellness (sponsor)", "year": 2026,
     "edition": "Record as retrieved 15 September 2026; first posted 7 August 2026; last update posted 7 August 2026; no results posted"},
]


def next_key(manifest: dict) -> str:
    n = max(int(s["source_key"].split("-")[1]) for s in manifest["sources"]) + 1
    return f"SRC-{n:03d}"


def find(manifest: dict, **ident: str) -> dict | None:
    for s in manifest["sources"]:
        for k, v in ident.items():
            if v and s.get(k) == v:
                return s
    return None


def register_study(manifest: dict, st: dict) -> str:
    SNAP.mkdir(parents=True, exist_ok=True)
    xml_path = SNAP / f"{st['slug']}.xml"
    if not xml_path.exists():
        xml_path.write_bytes(fetch(f"https://www.ebi.ac.uk/europepmc/webservices/rest/{st['pmcid']}/fullTextXML"))
    raw_bytes = xml_path.read_bytes()
    raw = raw_bytes.decode("utf-8")
    perms = re.search(r"(?s)<permissions>.*?</permissions>", raw)
    if not perms:
        raise SystemExit(f"{st['slug']}: no permissions element in retrieved XML")
    licence_text = norm(html.unescape(re.sub(r"<[^>]+>", " ", perms.group(0))))
    hrefs = re.findall(r'xlink:href="([^"]+)"', perms.group(0))
    licence_blob = licence_text + " " + " ".join(hrefs)
    if FORBIDDEN.search(licence_blob) or not PERMITTED.search(licence_blob):
        raise SystemExit(f"{st['slug']}: licence not permitted: {licence_blob[:300]}")
    if TDM.search(raw):
        raise SystemExit(f"{st['slug']}: text-mining or AI wording present; review before use")

    text = xml_to_text(raw)
    (SNAP / f"{st['slug']}.txt").write_text(text, encoding="utf-8")
    flat = norm(text)
    for loc, phrases in st["anchors"].items():
        for phrase in phrases:
            if norm(phrase) not in flat:
                raise SystemExit(f"{st['slug']} {loc}: anchor not found word for word: {phrase!r}")

    existing = find(manifest, doi=st["doi"], pmid=st["pmid"])
    key = existing["source_key"] if existing else next_key(manifest)
    entry = {
        "source_key": key,
        "title": st["title"],
        "authors": st["authors"],
        "year": st["year"],
        "source_type": "primary_journal_article",
        "priority": "core",
        "qc_status": "usable",
        "canonical_filename": None,
        "known_local_filename": None,
        "primary_role": st["primary_role"],
        "public_fulltext_allowed": False,
        "authority_notes": f"Peer-reviewed open-access primary study ({st['pmcid']}). Bibliographic fields confirmed against PubMed (PMID {st['pmid']}); PubMed lists no retraction, erratum or comment for it. Identified from the reference list of the systematic review SRC-032, retrieved as PubMed bibliographic metadata.",
        "limitations_notes": st["limitations_notes"],
        "isbn": None,
        "edition": st["edition"],
        "publisher": st["publisher"],
        "publication_name": st["publication_name"],
        "local_file_sha256": None,
        "local_file_bytes": None,
        "page_count": None,
        "printed_page_offset": None,
        "title_page_verified": False,
        "bibliographic_verified": True,
        "title_page_title": None,
        "title_page_authors": None,
        "integrity_notes": (f"Licence as stated in the retrieved full text: \"{licence_text}\". No text-and-data-mining or AI restriction found. "
                            f"Full-text XML retrieved from the Europe PMC REST API on {TODAY} (sha256 {sha(raw_bytes)[:16]}), converted to section-headed text in "
                            f"data/private/source-snapshots/bpc-157/{st['slug']}.txt. Locators are section headings; anchor phrases for every location were checked word for word."),
        "verified_at": TODAY,
        "verified_by": "Europe PMC full-text XML and PubMed efetch.",
        "access_status": "held",
        "access_notes": "Open access; full text retrieved from the Europe PMC API and pinned by PMCID, date and hash. No file in sources/.",
        "doi": st["doi"],
        "pmid": st["pmid"],
        "trial_registry_id": None,
        "canonical_url": f"https://europepmc.org/article/PMC/{st['pmcid'][3:]}",
    }
    if existing:
        existing.clear()
        existing.update(entry)
    else:
        manifest["sources"].append(entry)
    return key


def register_registry(manifest: dict, rec: dict) -> tuple[str, dict]:
    REGISTRY.mkdir(parents=True, exist_ok=True)
    path = REGISTRY / f"{rec['nct']}.json"
    if not path.exists():
        data = json.loads(fetch(f"https://clinicaltrials.gov/api/v2/studies/{rec['nct']}"))
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    study = json.loads(path.read_text(encoding="utf-8"))
    if study.get("hasResults"):
        raise SystemExit(f"{rec['nct']}: results are now posted; this build records registrations only. Re-extract.")
    blob = json.dumps(study)
    if not re.search(r"BPC[- ]?157|Bepecin", blob):
        raise SystemExit(f"{rec['nct']}: record does not name BPC-157")
    brief = study["protocolSection"]["identificationModule"]["briefTitle"]
    existing = find(manifest, trial_registry_id=rec["nct"])
    key = existing["source_key"] if existing else next_key(manifest)
    entry = {
        "priority": "core",
        "public_fulltext_allowed": False,
        "canonical_filename": None,
        "known_local_filename": None,
        "isbn": None,
        "edition": rec["edition"],
        "publisher": "U.S. National Library of Medicine",
        "publication_name": "ClinicalTrials.gov",
        "local_file_sha256": None,
        "local_file_bytes": None,
        "page_count": None,
        "printed_page_offset": None,
        "title_page_verified": False,
        "bibliographic_verified": True,
        "title_page_title": None,
        "title_page_authors": None,
        "verified_at": TODAY,
        "verified_by": "ClinicalTrials.gov API v2, full record (hasResults false)",
        "authority_notes": f"Retrieved from the ClinicalTrials.gov API v2. A snapshot of the response is committed at data/sources/registry/{rec['nct']}.json so every field cited can be re-read.",
        "limitations_notes": "A registry record is sponsor-submitted. It states what was registered: design, population, planned outcomes, dates and status. No results are posted, so it reports no finding, and nothing on this index treats it as evidence of an effect or of safety. Read on 15 September 2026; later updates are not reflected.",
        "integrity_notes": "Structured JSON record; no file pages. Locators name the registry module.",
        "doi": None,
        "pmid": None,
        "trial_registry_id": rec["nct"],
        "canonical_url": f"https://clinicaltrials.gov/study/{rec['nct']}",
        "source_key": key,
        "title": f"ClinicalTrials.gov record {rec['nct']}, no results posted — {brief}",
        "authors": [rec["sponsor"], "U.S. National Library of Medicine"],
        "year": rec["year"],
        "source_type": "clinical_trial_registry",
        "qc_status": "usable",
        "primary_role": "What was registered for a study of BPC-157 in people. A registration, not a result.",
        "access_status": "held",
        "access_notes": "Retrieved live from the ClinicalTrials.gov API on 15 September 2026 and pinned by the committed snapshot and its last-update date.",
    }
    if existing:
        existing.clear()
        existing.update(entry)
    else:
        manifest["sources"].append(entry)
    return key, study


def fix_review(manifest: dict) -> None:
    s = find(manifest, source_key="SRC-032")
    assert s is not None
    s["authors"] = ["Vasireddi N", "Hahamyan H", "Salata MJ", "Karns M", "Calcei JG", "Voos JE", "Apostolakos JM"]
    s["doi"] = "10.1177/15563316251355551"
    s["pmid"] = "40756949"
    s["edition"] = "HSS Journal 2025;21(4)"
    s["primary_role"] = ("An evidence map and secondary synthesis, not evidence about the compound. Two reviewers, three databases, searched to 3 June 2024: "
                         "544 records identified, 36 studies included — 35 preclinical and 1 clinical — and no clinical safety data found. Used for claims about the "
                         "shape of the literature (BPC-011), and its reference list, retrieved as bibliographic metadata, identified which primary preclinical studies to seek. "
                         "It is never cited for a preclinical finding: the preclinical statements on this record cite the primary papers.")
    s["access_notes"] = ("Bibliographic record and abstract retrieved from the NCBI E-utilities API and read, and re-read on 15 September 2026. Full text not obtained for extraction: "
                         "it is in PubMed Central (PMC12313605) under an author copyright line ('© The Author(s) 2025') with no open licence this index could confirm, and Europe PMC "
                         "does not list it as open access. Every location on this source is an abstract and says so.")
    tail = " 15 September 2026: author list corrected from the journal name to the PubMed author list; DOI and PMID recorded; reference list (52 PubMed-linked records) retrieved via E-utilities elink as metadata only."
    if tail.strip() not in (s.get("integrity_notes") or ""):
        s["integrity_notes"] = (s.get("integrity_notes") or "") + tail


# ---------------------------------------------------------------------------
# Packet
# ---------------------------------------------------------------------------

def upsert(items: list, item: dict, key: str) -> None:
    for i, existing in enumerate(items):
        if existing[key] == item[key]:
            items[i] = item
            return
    items.append(item)


def trace(pmcid: str, sections: str) -> str:
    return f"Open-access full text (CC BY) retrieved from Europe PMC ({pmcid}) on 15 September 2026 and read; {sections}."


def update_packet(keys: dict[str, str], trial_keys: dict[str, str]) -> None:
    p = json.loads(PACKET.read_text(encoding="utf-8"))
    J, C, H = keys["japjec2021-myotendinous-junction"], keys["chang2014-tendon-fibroblast-ghr"], keys["he2022-pharmacokinetics-rats-dogs"]

    tail = (" Updated 15 September 2026, targeted evidence repair: the preclinical lane was empty because every laboratory or animal finding reached this record "
            "through a practitioner handbook or a review abstract. Three primary preclinical studies mapped by the orthopaedic systematic review (SRC-032) were read "
            "in full under CC BY and are cited directly (BPC-012 to BPC-014); the review itself is cited only for the shape of the literature (BPC-011); four "
            "ClinicalTrials.gov registrations are recorded as trials with no results; what could not be read is recorded as gaps.")
    if tail.strip() not in p["note"]:
        p["note"] += tail

    for loc in p["locations"]:
        if loc["key"] == "bpc-systematic-review-abstract":
            loc["notes"] = ("Abstract re-read from PubMed on 15 September 2026. The full text is in PubMed Central without an open licence this index could confirm, "
                            "so nothing beyond the abstract is used.")

    new_locations = [
        {"key": "bpc-japjec-methods", "sourceKey": J, "locatorText": "Materials and Methods, sections 2.1–2.4 (PMC8615275)",
         "section": "2.1 Animals; 2.2 Surgery; 2.3 Drugs; 2.4 Experimental Protocol and Assessments", "notes": "Web full text; no page numbers. Section headings as published."},
        {"key": "bpc-japjec-results", "sourceKey": J, "locatorText": "Results, sections 3.1–3.3 (PMC8615275)",
         "section": "3.1 Functional Recovery; 3.2 Muscle Size Recovery; 3.3 Oxidative Stress and eNOS, COX-2 mRNA", "notes": "Web full text; no page numbers. Section headings as published."},
        {"key": "bpc-japjec-discussion", "sourceKey": J, "locatorText": "Discussion; Funding; Institutional Review Board Statement; Conflicts of Interest (PMC8615275)",
         "section": "4. Discussion; Funding; Conflicts of Interest", "notes": "Web full text; no page numbers. Section headings as published."},
        {"key": "bpc-chang-results", "sourceKey": C, "locatorText": "Results, sections 2.1–2.3 (PMC6271067)",
         "section": "2.1 Growth hormone receptor expression; 2.2 Cell proliferation; 2.3 JAK2 activation", "notes": "Web full text; no page numbers. Section headings as published."},
        {"key": "bpc-chang-discussion", "sourceKey": C, "locatorText": "Discussion, section 3 (PMC6271067)",
         "section": "3. Discussion", "notes": "Web full text; no page numbers. Section headings as published."},
        {"key": "bpc-chang-methods", "sourceKey": C, "locatorText": "Experimental Section 4.1–4.2; Acknowledgments; Conflicts of Interest (PMC6271067)",
         "section": "4.1 Primary culture of tendon fibroblasts; 4.2 BPC 157 treatment; Acknowledgments; Conflicts of Interest", "notes": "Web full text; no page numbers. Section headings as published."},
        {"key": "bpc-he-rat-pk", "sourceKey": H, "locatorText": "Results, section 2.1; Tables 1–3 (PMC9794587)",
         "section": "2.1 Pharmacokinetic studies of BPC157 in rats", "tableNumber": "1–3", "notes": "Web full text; no page numbers. Tables read as structured XML cells, not flattened page text."},
        {"key": "bpc-he-dog-pk", "sourceKey": H, "locatorText": "Results, section 2.2; Tables 4–6 (PMC9794587)",
         "section": "2.2 Pharmacokinetic studies of BPC157 in beagle dogs", "tableNumber": "4–6", "notes": "Web full text; no page numbers. Tables read as structured XML cells, not flattened page text."},
        {"key": "bpc-he-adme", "sourceKey": H, "locatorText": "Results, sections 2.3.1–2.3.4 (PMC9794587)",
         "section": "2.3 Excretion, metabolism, and tissue distribution of BPC157", "notes": "Web full text; no page numbers. Section headings as published."},
        {"key": "bpc-he-discussion-methods", "sourceKey": H, "locatorText": "Discussion; section 4.1 Test article; Funding; Conflict of interest (PMC9794587)",
         "section": "3 Discussion; 4.1 Test article and materials; Funding; Conflict of interest", "notes": "Web full text; no page numbers. Section headings as published."},
    ]
    for loc in new_locations:
        loc.setdefault("pageStart", None)
        upsert(p["locations"], loc, "key")

    claims = {c["claimKey"]: c for c in p["claims"]}

    # --- Changed claims ------------------------------------------------------
    c2 = claims["BPC-002"]
    c2["claimText"] = c2["claimText"].replace("162 animal studies, one human-tissue preparation and two in vitro studies",
                                              "161 animal studies, one human-tissue preparation and three in vitro studies")
    extra2 = (" One record the screen's rule had classified as an animal study (Chang et al. 2014, PMID 25415472) was reclassified as in vitro on 15 September 2026, "
              "when its full text was read: it used tendon cells cultured from rats, not live animals.")
    if extra2.strip() not in c2["uncertaintyText"]:
        c2["uncertaintyText"] += extra2

    c3 = claims["BPC-003"]
    c3["uncertaintyText"] = ("Preclinical, entirely. A result in an animal model is not a result in a person, and a mechanism operating in cell culture is not an effect in a body. "
                             "The papers these practitioner sources cite have not been opened by this index, so the models, doses and routes behind this list are unknown here. "
                             "Separately, three primary preclinical studies mapped by an independent systematic review have been read and are recorded as their own statements "
                             "(BPC-012 to BPC-014); they cover a rat myotendinous-junction model, cultured tendon cells and pharmacokinetics, not the full tissue list above. "
                             "The primary tendon, ligament, muscle and bone studies that could not be read are recorded as a gap.")

    c5 = claims["BPC-005"]
    c5["claimText"] = ("The practitioner sources held here report both subcutaneous and oral administration, and topical application in an animal burn model, "
                       "without comparing them or reporting bioavailability for any route.")
    c5["uncertaintyText"] = ("That an amount is reported for a route is not evidence that the route delivers the peptide. One animal pharmacokinetic study is now held "
                             "(BPC-014): it tested intravenous and intramuscular injection in rats and dogs only. No bioavailability figure for oral or subcutaneous "
                             "administration, in any species, appears in anything held here, and nothing held here addresses whether the peptide survives digestion.")

    c10 = claims["BPC-010"]
    extra10 = (" ClinicalTrials.gov was searched on 15 September 2026 (BPC-157, BPC 157, PL 14736, pentadecapeptide, body protection compound). It lists no completed "
               "controlled trial with results: a 2015 phase 1 registration with unknown status, a phase 2 registration recruiting since February 2026, a pilot not yet "
               "recruiting, and a single-arm supplement study, none with results posted. A registration is not a result and is not cited as evidence here.")
    if extra10.strip() not in c10["uncertaintyText"]:
        c10["uncertaintyText"] += extra10

    # --- New claims ----------------------------------------------------------
    new_claims = [
        {
            "claimKey": "BPC-011",
            "claimText": ("A systematic review written from an orthopaedic sports-medicine perspective (Vasireddi et al., HSS Journal, 2025), searching PubMed, Cochrane "
                          "and Embase to 3 June 2024 with two reviewers, identified 544 records and included 36 studies: 35 preclinical and 1 clinical. It reports "
                          "preclinical improvements in muscle, tendon, ligament and bone injury models, describes the included studies as level IV and level V evidence, "
                          "and states that it found no clinical safety data."),
            "plainLanguageText": ("An independent review of the sports-medicine research on BPC-157 found 36 relevant studies. Thirty-five were animal or laboratory "
                                  "studies and one was a study in people, and the review found no safety data from studies in people."),
            "claimCategory": "evidence-base",
            "importance": "critical",
            "interpretationNotes": ("Recorded as a map of the literature, not as evidence about the compound. What the review says about the animal studies is its "
                                    "summary of them. The preclinical statements on this record (BPC-012 to BPC-014) cite the primary papers, which this index read, and "
                                    "never this review. The review's reference list was retrieved as PubMed metadata to identify which primary studies to seek; the ones "
                                    "that could not be read are recorded as a gap rather than cited through the review."),
            "uncertaintyText": ("Read at abstract level. The full text is in PubMed Central under an author copyright line with no open licence this index could confirm, "
                                "so its per-study detail is not used. Its abstract summarises its one clinical study as seven of twelve patients reporting relief for "
                                "more than six months after a knee injection. The abstract of the knee study held here (SRC-031) reports 17 patients, 16 reached, and "
                                "11 of the 12 given BPC-157 alone reporting significant improvement, without a breakdown by duration. The two are not necessarily in "
                                "conflict, and the full texts that could settle it are not held. 'Level IV and level V' is the review's own grading."),
            "evidence": [
                {"locationKey": "bpc-systematic-review-abstract", "evidenceTypeKey": "academic_reference", "relationship": "supports",
                 "interpretation": ("The abstract gives the databases, the search date, the two-reviewer screening, 544 records, 36 included studies (35 preclinical, "
                                    "1 clinical), preclinical improvements in muscle, tendon, ligament and bony injury models, no clinical safety data found, and the "
                                    "grading of the included studies as level IV and level V."),
                 "populationModel": "Not applicable — a review of the literature.",
                 "primaryTrace": "abstract_only",
                 "primaryTraceNote": ("The statement concerns what the review itself reports, so the review is the source, read at abstract level. Its characterisation "
                                      "of individual studies has not been checked against them, except for the three read in full (BPC-012 to BPC-014).")},
            ],
        },
        {
            "claimKey": "BPC-012",
            "claimText": ("In male rats with a surgically created quadriceps myotendinous-junction defect, which the authors report does not heal on its own, BPC-157 given "
                          "by intraperitoneal injection or in drinking water was reported to abolish the leg contracture seen in every control animal, to improve walking "
                          "and motor-function indices, to shrink the defect and prevent muscle atrophy, and to improve collagen organisation and vascularity at the "
                          "junction over 42 days, with lower oxidative-stress and nitric-oxide levels, higher eNOS mRNA and lower COX-2 mRNA in the tissue than in controls."),
            "plainLanguageText": ("In one rat study, animals whose thigh tendon had been surgically separated from the muscle recovered movement and tissue structure "
                                  "when given BPC-157, while untreated animals did not. This is an animal result. It does not show what happens in people."),
            "claimCategory": "preclinical-effect",
            "importance": "high",
            "interpretationNotes": ("Primary animal study, read in full. The outcomes are the authors' functional, biomechanical, macroscopic, microscopic and "
                                    "biochemical assessments against saline or water controls, recorded as reported. The study comes from the Zagreb group and rests its "
                                    "premise on that group's earlier muscle, tendon and ligament studies, so it extends that work rather than independently replicating it."),
            "uncertaintyText": ("One rat study, six animals per group and time point, in a lesion model created for it. Random assignment and blinded surgery and "
                                "assessment are stated; the methods describe no sample-size calculation. Most comparisons are reported in figures, which this index has "
                                "not re-analysed. The amounts used are rat amounts, not human ones, and are deliberately not reproduced here. A result in a rat "
                                "myotendinous-junction model does not establish any effect in a human muscle or tendon injury."),
            "evidence": [
                {"locationKey": "bpc-japjec-methods", "evidenceTypeKey": "animal_in_vivo", "relationship": "supports",
                 "interpretation": ("Twelve-week-old male Wistar rats, randomly assigned at six per group per interval; the quadriceps tendon dissected from the muscle "
                                    "under anaesthesia; BPC-157 at two dose levels intraperitoneally or in drinking water, against saline or water controls, with "
                                    "assessments at days 7, 14, 28 and 42. Surgery and assessment are stated to be blinded; the peptide is stated to be 99% pure by HPLC."),
                 "populationModel": "Male Wistar rats with a surgically created quadriceps myotendinous-junction defect.",
                 "primaryTrace": "full_text_supports", "primaryTraceNote": trace("PMC8615275", "sections 2.1–2.4")},
                {"locationKey": "bpc-japjec-results", "evidenceTypeKey": "animal_in_vivo", "relationship": "supports",
                 "interpretation": ("Leg contracture present in all controls and absent in all treated rats; improved motor-function and walking indices; smaller "
                                    "defect and preserved muscle fibre size against progressive atrophy in controls; earlier and better-oriented collagen type I; "
                                    "lower MDA and NO tissue levels, higher eNOS and lower COX-2 mRNA than controls."),
                 "populationModel": "Male Wistar rats with a surgically created quadriceps myotendinous-junction defect.",
                 "primaryTrace": "full_text_supports", "primaryTraceNote": trace("PMC8615275", "sections 3.1–3.3")},
                {"locationKey": "bpc-japjec-discussion", "evidenceTypeKey": "animal_in_vivo", "relationship": "contextualizes",
                 "interpretation": ("The authors state that the study cannot provide precise information about the full mechanisms responsible, and frame the result "
                                    "through their group's earlier tendon, muscle and ligament studies. Funded by a University of Zagreb grant; no conflicts of interest declared."),
                 "populationModel": "Male Wistar rats.",
                 "primaryTrace": "full_text_supports", "primaryTraceNote": trace("PMC8615275", "Discussion, Funding and Conflicts of Interest")},
            ],
        },
        {
            "claimKey": "BPC-013",
            "claimText": ("In fibroblasts cultured from rat Achilles tendon, BPC-157 increased growth hormone receptor expression at both mRNA and protein level, rising "
                          "with concentration and with time over three days. When growth hormone was added to cells pretreated with BPC-157, the number of viable cells, "
                          "PCNA expression and JAK2 phosphorylation increased."),
            "plainLanguageText": ("In cells taken from rat tendon and grown in a dish, BPC-157 increased a receptor that responds to growth hormone. This is a laboratory "
                                  "finding about cells, not a finding about healing in a body."),
            "claimCategory": "mechanism",
            "importance": "high",
            "interpretationNotes": ("Primary in vitro study from a group independent of the Zagreb group, read in full, and recorded as a proposed mechanism, which is how "
                                    "its authors present it. The mechanism list on this record, taken from practitioner sources, includes 'upregulation of growth hormone'. "
                                    "This study reports increased expression of the growth hormone receptor in tendon cells, which is a different thing, and does not measure "
                                    "growth hormone itself. The authors also report that their own earlier study found no direct effect of BPC-157 alone on the proliferation "
                                    "of these cells."),
            "uncertaintyText": ("Cells in culture from rats; each experiment repeated three times with cells from a different rat, compared by t-test. The microarray result "
                                "that prompted the study came from the group's earlier work. The authors state that culture cannot reproduce the environment of a healing "
                                "tendon. The peptide was bought from a named supplier and no purity or identity testing is reported. No animal or human outcome was measured."),
            "evidence": [
                {"locationKey": "bpc-chang-results", "evidenceTypeKey": "in_vitro", "relationship": "supports",
                 "interpretation": ("Growth hormone receptor mRNA and protein rose with BPC-157 concentration at 24 hours and with time over one to three days, up to "
                                    "sevenfold at day three; with growth hormone added, viable-cell counts (MTT) and PCNA expression rose with BPC-157 pretreatment, and "
                                    "phosphorylated but not total JAK2 increased with longer pretreatment."),
                 "populationModel": "Primary tendon fibroblasts from Achilles tendons of male Sprague-Dawley rats, passages 2 to 4.",
                 "primaryTrace": "full_text_supports", "primaryTraceNote": trace("PMC6271067", "sections 2.1–2.3")},
                {"locationKey": "bpc-chang-discussion", "evidenceTypeKey": "in_vitro", "relationship": "contextualizes",
                 "interpretation": ("The authors state that their earlier study found BPC-157 had no direct effect on the proliferation or PCNA expression of tendon "
                                    "fibroblasts, and that in vitro culture cannot mimic the environment of a healing tendon."),
                 "populationModel": "Cultured rat tendon fibroblasts.",
                 "primaryTrace": "full_text_supports", "primaryTraceNote": trace("PMC6271067", "section 3")},
                {"locationKey": "bpc-chang-methods", "evidenceTypeKey": "in_vitro", "relationship": "contextualizes",
                 "interpretation": ("Each experiment was repeated three times with fibroblasts from a different rat. The peptide was synthesised and purchased from a "
                                    "named supplier, with its sequence and molecular weight given and no purity or identity testing reported. Supported by the National "
                                    "Science Council of Taiwan and Chang Gung Memorial Hospital; no conflict of interest declared."),
                 "populationModel": "Cultured rat tendon fibroblasts.",
                 "primaryTrace": "full_text_supports", "primaryTraceNote": trace("PMC6271067", "sections 4.1–4.2, Acknowledgments and Conflicts of Interest")},
            ],
        },
        {
            "claimKey": "BPC-014",
            "claimText": ("In rats and beagle dogs given BPC-157 intravenously or by intramuscular injection, intact peptide peaked in plasma within minutes, was "
                          "eliminated with a half-life under 30 minutes, and could not be detected 4 hours after dosing. Absolute bioavailability after intramuscular "
                          "injection was reported as about 14–19% in rats and 45–51% in dogs. In rats, radiolabelled peptide was broken down into smaller peptide "
                          "fragments and amino acids, with urine the main route of excretion. Oral and subcutaneous administration were not studied."),
            "plainLanguageText": ("In rats and dogs, injected BPC-157 was broken down and cleared from the blood quickly. The study did not test it taken by mouth, "
                                  "and it was not done in people."),
            "claimCategory": "pharmacokinetics",
            "importance": "critical",
            "interpretationNotes": ("The only pharmacokinetic study of BPC-157 this index holds, read in full. It is an animal study and says nothing directly about "
                                    "people. It matters to this record for two reasons: it replaces 'no pharmacokinetic data in anything held here' with a bounded "
                                    "animal result, and it leaves the oral-route question where it was, because oral administration was not part of it. The authors' "
                                    "description of their radiolabel results as proving metabolic safety is their interpretation and is not adopted here."),
            "uncertaintyText": ("Two species; in rats, six animals per time point, and in dogs, six animals across four dosing cycles; intravenous and intramuscular routes "
                                "only; material the authors synthesised and purified themselves. The authors state that many methodological validations were omitted "
                                "for space and that metabolites in tissues were not analysed. Measurements after the radiolabelled dose track total radioactivity, "
                                "including breakdown products, not intact peptide. No figure here transfers to a person, to another route, or to material of other origin."),
            "evidence": [
                {"locationKey": "bpc-he-rat-pk", "evidenceTypeKey": "animal_in_vivo", "relationship": "supports",
                 "interpretation": ("After intravenous and single or repeated intramuscular dosing in rats, intact peptide peaked at 3 minutes, had an elimination "
                                    "half-life under 30 minutes, was undetectable at 4 hours, and showed intramuscular absolute bioavailability of 14.49% to 19.35% "
                                    "across three dose levels, with exposure rising linearly with dose."),
                 "populationModel": "Sprague-Dawley rats, male and female.",
                 "primaryTrace": "full_text_supports", "primaryTraceNote": trace("PMC9794587", "section 2.1 and Tables 1–3")},
                {"locationKey": "bpc-he-dog-pk", "evidenceTypeKey": "animal_in_vivo", "relationship": "supports",
                 "interpretation": ("In beagle dogs, intact peptide peaked within about 9 minutes of intramuscular dosing, had an elimination half-life under 30 "
                                    "minutes, was undetectable at 4 hours, and showed intramuscular absolute bioavailability of 45.27% to 50.56% across three dose levels."),
                 "populationModel": "Beagle dogs, three male and three female.",
                 "primaryTrace": "full_text_supports", "primaryTraceNote": trace("PMC9794587", "section 2.2 and Tables 4–6")},
                {"locationKey": "bpc-he-adme", "evidenceTypeKey": "animal_in_vivo", "relationship": "supports",
                 "interpretation": ("After an intramuscular radiolabelled dose in rats, urine was the dominant excretion route; the parent peptide was the main plasma "
                                    "component at 3 minutes and was degraded into small peptide fragments within 10 minutes, with labelled proline predominating at "
                                    "1 hour; radioactivity peaked in most tissues at 1 hour, highest in kidney."),
                 "populationModel": "Sprague-Dawley rats, intact, bile-duct cannulated and jugular-vein cannulated.",
                 "primaryTrace": "full_text_supports", "primaryTraceNote": trace("PMC9794587", "sections 2.3.1–2.3.4")},
                {"locationKey": "bpc-he-discussion-methods", "evidenceTypeKey": "animal_in_vivo", "relationship": "contextualizes",
                 "interpretation": ("The authors synthesised and purified the peptide in their own laboratory; state that metabolites were not analysed in tissues and "
                                    "that many methodological validations were omitted for space; and were funded by Chinese national and provincial science grants, "
                                    "declaring no commercial or financial conflict."),
                 "populationModel": "Rats and beagle dogs.",
                 "primaryTrace": "full_text_supports", "primaryTraceNote": trace("PMC9794587", "Discussion, section 4.1, Funding and Conflict of interest")},
            ],
        },
    ]
    for c in new_claims:
        upsert(p["claims"], c, "claimKey")

    # --- Compound text -------------------------------------------------------
    comp = p["compound"]
    reg_sentence = ("As of 15 September 2026, ClinicalTrials.gov lists three placebo- or sham-controlled studies of BPC-157 in people — one registered in 2015 whose "
                    "status has not been updated since, and two registered in 2026 that have not finished — and one uncontrolled supplement study. None has posted results.")
    if reg_sentence not in comp["simpleSummary"]:
        comp["simpleSummary"] = comp["simpleSummary"].replace(
            "Almost everything else is animal research.",
            "Almost everything else is animal research. " + reg_sentence)
    comp["practitionerSummary"] = comp["practitionerSummary"].replace(
        "Pharmacokinetics: nothing. No source held here reports bioavailability, half-life, distribution or elimination for any route.",
        "Pharmacokinetics: one animal study held (BPC-014) — intravenous and intramuscular dosing in rats and beagle dogs; intact peptide half-life under 30 minutes; "
        "intramuscular absolute bioavailability about 14–19% in rats and 45–51% in dogs; degradation to peptide fragments and amino acids, excreted mainly in urine. "
        "No oral or subcutaneous data in any species, and nothing in humans.")
    pre_para = ("**Primary preclinical studies read.** The orthopaedic systematic review (SRC-032; 35 preclinical and 1 clinical study included) is used as a map. "
                "Three primary studies it cites were read in full under CC BY: a rat myotendinous-junction defect model (BPC-012; Zagreb group), growth hormone "
                "receptor expression in cultured rat tendon fibroblasts (BPC-013; an independent group — receptor, not hormone), and rat and dog pharmacokinetics "
                "(BPC-014). The tendon, ligament, muscle and bone healing studies and the preclinical toxicology study it cites are not open access and are recorded as gaps.")
    reg_para = ("**Registered trials.** ClinicalTrials.gov, 15 September 2026: NCT02637284 (phase 1, oral, healthy volunteers, placebo-controlled; registered 2015, "
                "status unknown), NCT07437547 (phase 2, acute hamstring strain, placebo-controlled; recruiting), NCT07803250 (pilot after rotator cuff repair, "
                "sham-controlled; not yet recruiting), NCT07752381 (single-arm supplement study; completed, registered after completion). No results posted for any. "
                "Recorded as registrations, not as evidence.")
    if pre_para not in comp["practitionerSummary"]:
        comp["practitionerSummary"] += "\n\n" + pre_para
    if reg_para not in comp["practitionerSummary"]:
        comp["practitionerSummary"] += "\n\n" + reg_para
    unk = ("Controlled studies in people have now been registered; none has reported. Until one does, the animal work — however much of it there is — "
           "remains the main body of evidence, and it cannot answer questions about people.")
    if unk not in comp["unknownsSummary"]:
        comp["unknownsSummary"] = comp["unknownsSummary"].replace(
            "The volume of discussion around this compound is not evidence",
            unk + "\n\nThe volume of discussion around this compound is not evidence")

    for r in p["routes"]:
        if r["routeKey"] in ("subcutaneous", "oral"):
            r["limitationsNotes"] = r["limitationsNotes"].replace(
                "No pharmacokinetic data, no bioavailability figure and no study establishing this route appear in anything held here.",
                "No bioavailability figure and no study establishing this route appear in anything held here; the one animal pharmacokinetic study held (BPC-014) tested intravenous and intramuscular injection only.")
            if r["routeKey"] == "oral" and "BPC-014" not in r["limitationsNotes"]:
                r["limitationsNotes"] += " The one animal pharmacokinetic study held (BPC-014) did not test oral administration."

    # --- Funding -------------------------------------------------------------
    for f in [
        {"fundingKey": f"FUND-{J}", "sourceKey": J, "locationKey": "bpc-japjec-discussion", "funderKind": "academic_institution",
         "sponsorName": None, "manufacturerInvolved": None, "institution": "University of Zagreb", "grantReference": "BM 099",
         "disclosureText": "The authors declare that there are no conflicts of interest.",
         "notes": "Funding and conflict statements read in the full text on 15 September 2026. The declaration is the authors' statement and is recorded as such."},
        {"fundingKey": f"FUND-{C}", "sourceKey": C, "locationKey": "bpc-chang-methods", "funderKind": "mixed",
         "sponsorName": "National Science Council of Taiwan", "manufacturerInvolved": None, "institution": "Chang Gung Memorial Hospital", "grantReference": None,
         "disclosureText": "The authors declare no conflict of interest.",
         "notes": "The acknowledgments thank the National Science Council of Taiwan and Chang Gung Memorial Hospital for supporting the work; no grant number is given. Read 15 September 2026."},
        {"fundingKey": f"FUND-{H}", "sourceKey": H, "locationKey": "bpc-he-discussion-methods", "funderKind": "government",
         "sponsorName": "National Natural Science Foundation of China; Natural Science Foundation of Shaanxi; Key Research and Development Program of Shaanxi Province",
         "manufacturerInvolved": None, "institution": "Air Force Medical University, Xi'an", "grantReference": "NSFC 81672800, 81603009, 81673020, 81802632, 82173830; 2020JQ-445; 2021SF-207, 2021SF-223, 2022ZDLSF05-19",
         "disclosureText": "The authors declare that the research was conducted in the absence of any commercial or financial relationships that could be construed as a potential conflict of interest.",
         "notes": "Read 15 September 2026. The authors made the peptide themselves and state that they intend to conduct clinical trials of it; recorded as context."},
    ]:
        upsert(p["funding"], f, "fundingKey")

    # --- Gaps ----------------------------------------------------------------
    gaps = p["notYetSupported"]
    by_stmt = {g["statement"]: g for g in gaps}
    oral = by_stmt["What proportion of an orally administered amount reaches the circulation intact."]
    oral["resolution"] = {"state": "open", "checkedAt": TODAY,
                          "note": "Checked 15 September 2026. The animal pharmacokinetic study now held (BPC-014) tested intravenous and intramuscular injection only. The 2015 registered phase 1 study (NCT02637284) lists oral pharmacokinetics as an outcome and has posted no results. Unchanged."}
    safety = by_stmt["The safety profile of BPC-157 in humans, including with prolonged use."]
    safety["resolution"] = {"state": "open", "checkedAt": TODAY,
                            "note": "Checked 15 September 2026. Four registered studies list adverse events or safety monitoring; none has posted results. Preclinical toxicology is recorded as its own gap and would not settle this one."}
    lab = by_stmt["What the laboratory studies behind every mechanism on this page actually did and found."]
    lab["resolution"] = {"state": "partially_resolved", "checkedAt": TODAY,
                         "note": "Checked 15 September 2026. Three primary preclinical studies mapped by the orthopaedic systematic review were read in full under CC BY and are cited directly (BPC-012 to BPC-014). The papers the practitioner sources cite for each mechanism remain unopened, and the core tendon, ligament, muscle and bone healing studies are recorded as a separate gap."}
    ibd = by_stmt["The inflammatory bowel disease trials reported under the development codes PL 10, PLD 116 and PL 14736."]
    ibd["resolution"] = {"state": "open", "checkedAt": TODAY,
                         "note": "Checked 15 September 2026. ClinicalTrials.gov returns no study under PL 14736 or PL-14736. The only BPC-157 registration from before 2026 is an oral phase 1 study in healthy volunteers (NCT02637284), not an inflammatory bowel disease trial."}

    registry_list = ", ".join(f"{trial_keys[n]} ({n})" for n in ("NCT02637284", "NCT07437547", "NCT07803250", "NCT07752381"))
    for new in [
        {"gapType": "primary_source_missing",
         "statement": "What the primary animal studies of tendon, ligament, muscle and bone healing mapped by the orthopaedic systematic review report.",
         "why": ("They are the core of the musculoskeletal literature the review maps, and its reference list includes them, but none is open access according to Europe "
                 "PMC and none is held: Staresinic et al. 2003 and Krivic et al. 2006 and 2008 (Achilles tendon), Chang et al. 2011 (tendon), Cerovecki et al. 2010 "
                 "(medial collateral ligament), Staresinic et al. 2006, Novinscak et al. 2008 and Pevec et al. 2010 (transected, crushed and corticosteroid-impaired "
                 "muscle), and Sebecic et al. 1999 (segmental bone defect in rabbits). They are not cited through the review, and nothing on this record states what they found."),
         "whatWouldResolveIt": "The publisher versions of PMIDs 14554208, 16583442, 18594781, 21030672, 20225319, 16609979, 18668315, 20190676 and 10071911, obtained as held copies or under a licence that permits extraction, and read.",
         "verificationIssueKey": None, "researchQuestion": None, "opportunityType": None, "resolution": None},
        {"gapType": "safety_not_established",
         "statement": "What formal preclinical toxicology studies of BPC-157 examined and found.",
         "why": ("The systematic review's abstract states that preclinical safety studies showed no adverse effects across several organ systems, and the pharmacokinetic "
                 "study held here refers to its authors' earlier safety evaluation (Xu et al., Regulatory Toxicology and Pharmacology 2020, PMID 32334036). That paper is "
                 "not open access and has not been read, so neither statement is adopted here. Preclinical toxicology would not, in any case, establish safety in people."),
         "whatWouldResolveIt": "The full text of Xu et al. 2020, read, with species, duration, endpoints and findings recorded.",
         "verificationIssueKey": None, "researchQuestion": None, "opportunityType": None, "resolution": None},
        {"gapType": "no_current_reviewed_evidence",
         "statement": "Whether the musculoskeletal healing results reported in animals have been reproduced by independent research groups.",
         "why": ("The animal healing study read here (BPC-012) comes from the Zagreb group and rests its premise on that group's own earlier tendon, muscle and ligament "
                 "studies. The one study from an independent group read here (BPC-013) examined a mechanism in cultured cells, not healing in an animal. This index has "
                 "not assessed replication across the corpus."),
         "whatWouldResolveIt": "A replication assessment across the primary musculoskeletal studies, recording research group, country, model and outcome for each.",
         "verificationIssueKey": None,
         "researchQuestion": "Do the musculoskeletal healing effects reported for BPC-157 in rats replicate in independent laboratories using pre-specified outcomes?",
         "opportunityType": "independent_replication", "resolution": None},
        {"gapType": "human_evidence_not_established",
         "statement": "What the registered studies of BPC-157 in people found, or will find.",
         "why": ("ClinicalTrials.gov, as retrieved on 15 September 2026, lists " + registry_list + ": a randomised placebo-controlled phase 1 study in healthy volunteers "
                 "registered in 2015, status unknown and not updated since; a randomised placebo-controlled phase 2 study in acute hamstring strain, recruiting since "
                 "February 2026; a randomised sham-controlled pilot after rotator cuff repair, not yet recruiting; and a single-arm supplement study registered in August "
                 "2026 after its stated completion. None has posted results. A registration states what was planned; it is not a finding, and none of these is counted as evidence."),
         "whatWouldResolveIt": "Posted results or peer-reviewed reports of these studies, read in full.",
         "verificationIssueKey": None,
         "researchQuestion": "What do the registered placebo- and sham-controlled studies of BPC-157 report when they finish, and are their results made public?",
         "opportunityType": "human_evidence", "resolution": None},
        {"gapType": "source_inaccessible",
         "statement": "What the orthopaedic systematic review's full text reports for each included study, including its account of its one clinical study.",
         "why": ("The full text is in PubMed Central under an author copyright line with no open licence this index could confirm, and Europe PMC does not list it as "
                 "open access, so only the abstract is used. Its abstract's summary of the knee study cannot be checked against the knee study's own abstract (BPC-011)."),
         "whatWouldResolveIt": "Confirmation of the article's licence terms or permission to extract, then the full text read.",
         "verificationIssueKey": None, "researchQuestion": None, "opportunityType": None, "resolution": None},
    ]:
        if new["statement"] not in by_stmt:
            gaps.append(new)
        else:
            by_stmt[new["statement"]].update(new)

    PACKET.write_text(json.dumps(p, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"BPC-157 packet: claims {len(p['claims'])}, locations {len(p['locations'])}, gaps {len(gaps)}, funding {len(p['funding'])}")


def update_screen() -> None:
    s = json.loads(SCREEN.read_text(encoding="utf-8"))
    changed = 0
    for r in s["records"]:
        if r["pmid"] == "25415472":
            r.update({"studyType": "in_vitro", "evidenceClass": "preclinical", "included": True, "classifiedBy": "manual", "fullTextStatus": "full_text_held",
                      "reason": "Full text read 15 September 2026 (CC BY): primary tendon fibroblasts cultured from rat Achilles tendon, treated with BPC-157 in a dish. No live-animal outcome, so in vitro; the rule had classified it as an animal study from the MeSH animal heading."})
            changed += 1
        if r["pmid"] == "34829776":
            r.update({"classifiedBy": "manual", "fullTextStatus": "full_text_held",
                      "reason": "Full text read 15 September 2026 (CC BY): male Wistar rats with a surgically created quadriceps myotendinous-junction defect, BPC-157 intraperitoneally or in drinking water against controls. Animal in vivo confirmed."})
            changed += 1
        if r["pmid"] == "36588717":
            r.update({"classifiedBy": "manual", "fullTextStatus": "full_text_held",
                      "reason": "Full text read 15 September 2026 (CC BY): pharmacokinetics, excretion, metabolism and distribution after intravenous and intramuscular dosing in rats and beagle dogs. Animal in vivo confirmed."})
            changed += 1
    SCREEN.write_text(json.dumps(s, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"screen rows updated: {changed}")


def trial_row(key: str, nct: str, study: dict, **fields) -> dict:
    ps = study["protocolSection"]
    status = ps["statusModule"]
    row = {
        "trialKey": fields.pop("trialKey"),
        "registryName": "ClinicalTrials.gov",
        "registryId": nct,
        "sponsorProtocolId": ps["identificationModule"].get("orgStudyIdInfo", {}).get("id"),
        "acronym": ps["identificationModule"].get("acronym"),
        "officialTitle": ps["identificationModule"].get("officialTitle") or ps["identificationModule"]["briefTitle"],
        "resultsPostedDate": None,
        "registryLastUpdate": status["lastUpdatePostDateStruct"]["date"],
        "registryCheckedAt": TODAY,
        "doseArmsText": None,
        "analysisPopulations": None,
        "statisticalPlan": None,
        "documents": [{
            "sourceKey": key, "role": "registry_record", "linkBasis": "posted_to_registry", "depth": "structured_record_held",
            "versionLabel": None, "documentDate": None,
            "answers": "What was registered: design, population, planned outcomes, dates and status. No results are posted.",
            "notes": None,
        }],
        "comparisons": [],
    }
    row.update(fields)
    return row


def build_trials(registry: dict[str, tuple[str, dict]]) -> None:
    k = {n: v[0] for n, v in registry.items()}
    s = {n: v[1] for n, v in registry.items()}
    trials = [
        trial_row(k["NCT02637284"], "NCT02637284", s["NCT02637284"],
                  trialKey="bpc-157-pco-02-phase1",
                  phase="Phase 1",
                  design="Randomised, placebo-controlled, quadruple-masked, parallel assignment; primary purpose basic science, as registered",
                  population="Healthy volunteers aged 18 to 35, as registered.",
                  comparator="Placebo tablets",
                  enrolmentText="42 (estimated)",
                  countries="Mexico (1 site entry)", siteCount=1,
                  durationText="Single-dose cohorts and a two-week repeated-dose cohort, as registered.",
                  primaryOutcome="Adverse events (six months)",
                  secondaryOutcomes="Maximum plasma concentration; time to maximum plasma concentration; area under the curve; elimination half-life (168 hours)",
                  oversight=None,
                  sponsor="PharmaCotherapia d.o.o.",
                  registryStatus="unknown (last known status: active, not recruiting)",
                  startDate=None, primaryCompletionDate=None, completionDate=None,
                  notes=("No results posted. The registered intervention is named Bepecin; the official title states that its active ingredient is BPC-157. "
                         "The registry gives dates to the month only (start October 2015; estimated completion March 2016), so no calendar dates are recorded here. "
                         "Status last verified October 2015; the registry marks it unknown. The record's submission-tracking data show a results submission dated "
                         "23 May 2016, and no results are posted. The registered description gives a different protocol number and study period from the "
                         "structured fields. Nothing about outcomes can be inferred from this record.")),
        trial_row(k["NCT07437547"], "NCT07437547", s["NCT07437547"],
                  trialKey="bpc-157-hamstring-phase2",
                  phase="Phase 2",
                  design="Randomised 1:1, placebo-controlled, quadruple-masked, parallel assignment; primary purpose treatment, as registered",
                  population="Adults aged 18 to 45 with an MRI-confirmed acute grade II hamstring strain presenting within 72 hours of onset, as registered.",
                  comparator="Matching placebo, with the same standardised rehabilitation programme",
                  enrolmentText="120 (estimated)",
                  countries="China (1 site entry)", siteCount=1,
                  durationText="A 14-day treatment period, with assessments to day 56 and follow-up three months after return to sport, as registered.",
                  primaryOutcome="Time to return to unrestricted sport participation (8 weeks); change from baseline to day 14 in MRI-assessed hamstring injury volume",
                  secondaryOutcomes="Pain during activity on a 0–10 numeric rating scale; hamstring strength limb symmetry index by isokinetic dynamometry; Lower Extremity Functional Scale (56 days)",
                  oversight="The registered description states that an independent Data and Safety Monitoring Committee will review unblinded safety data.",
                  sponsor="Hudson Biotech",
                  registryStatus="recruiting",
                  startDate="2026-02-02", primaryCompletionDate="2027-02-14", completionDate="2028-02-17",
                  notes=("No results posted. Subcutaneous administration, as registered. Start date actual; completion dates estimated. As registered, both arm "
                         "entries are typed experimental and each lists both interventions, although the arm descriptions assign BPC-157 to one arm and placebo "
                         "to the other; this is recorded as the registry states it.")),
        trial_row(k["NCT07803250"], "NCT07803250", s["NCT07803250"],
                  trialKey="bpc-157-rotator-cuff-pilot",
                  phase="Phase 1",
                  design="Randomised, sham-controlled, quadruple-masked, parallel assignment pilot; primary purpose treatment, as registered",
                  population="Adults with a full-thickness posterosuperior rotator cuff tear under 2.5 cm in anteroposterior dimension, scheduled for arthroscopic repair, as registered.",
                  comparator="Sham: registered in the arm description as saline injections and in the intervention description as no injections",
                  enrolmentText="30 (estimated)",
                  countries="United States (1 site entry)", siteCount=1,
                  durationText="A 90-day postoperative treatment period, with assessment to five months after surgery, as registered.",
                  primaryOutcome="Isometric shoulder strength by handheld dynamometer (baseline, 12 weeks and 5 months after surgery)",
                  secondaryOutcomes=None,
                  oversight=None,
                  sponsor="University of Arkansas",
                  registryStatus="not yet recruiting",
                  startDate="2027-01-01", primaryCompletionDate="2027-08-01", completionDate="2027-08-01",
                  notes=("No results; not yet started. Subcutaneous self-administration, as registered. Dates estimated. The record is internally inconsistent as "
                         "registered: the summary describes twenty patients and the enrolment field 30; the comparator is described both as saline injections and "
                         "as no injections; and the summary names MRI, patient-reported outcomes, range of motion and blood biomarkers, while only shoulder strength "
                         "is registered as an outcome.")),
        trial_row(k["NCT07752381"], "NCT07752381", s["NCT07752381"],
                  trialKey="bpc-157-supplement-single-arm",
                  phase="Not applicable (dietary supplement)",
                  design="Single group, open label, no masking; primary purpose treatment, as registered",
                  population="Physically active adults aged 18 to 65 with weekly post-exercise musculoskeletal symptoms, as registered.",
                  comparator=None,
                  enrolmentText="40 (actual)",
                  countries="United States (1 site entry)", siteCount=1,
                  durationText="Eight weeks, as registered.",
                  primaryOutcome="Change in hs-CRP and IL-6 (baseline and week 8); change in self-reported swelling",
                  secondaryOutcomes="Self-reported aching, stiffness, muscle function and recovery (baseline to week 8)",
                  oversight=None,
                  sponsor="Parlay Wellness (collaborator: Citruslabs)",
                  registryStatus="completed",
                  startDate="2025-09-01", primaryCompletionDate="2025-11-01", completionDate="2025-11-01",
                  notes=("No results posted. A commercial product registered as a dietary supplement; the registry states that it contains BPC-157, and nothing in "
                         "the record characterises the material. First submitted to the registry on 3 August 2026, after its stated completion in November 2025. "
                         "Single arm with no comparator, so it could not attribute any change to the product.")),
    ]
    packet = {
        "packetKey": "bpc-157-trials",
        "peptideKey": "bpc-157",
        "note": ("ClinicalTrials.gov registrations for BPC-157, retrieved from the API v2 on 15 September 2026 by searching BPC-157, BPC 157, PL 14736, PL-14736, "
                 "pentadecapeptide and body protection compound, and kept where the record names BPC-157. Snapshots are committed in data/sources/registry/. "
                 "None has posted results. These are registrations: what was planned, not what was found. No registry record is cited as claim evidence, and "
                 "no amount from any record is transcribed."),
        "trials": trials,
    }
    TRIALS.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"trials written: {len(trials)}")


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    keys = {st["slug"]: register_study(manifest, st) for st in STUDIES}
    registry = {rec["nct"]: register_registry(manifest, rec) for rec in REGISTRY_RECORDS}
    fix_review(manifest)
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("registered:", keys, {n: v[0] for n, v in registry.items()})
    update_packet(keys, {n: v[0] for n, v in registry.items()})
    update_screen()
    build_trials(registry)


if __name__ == "__main__":
    main()
