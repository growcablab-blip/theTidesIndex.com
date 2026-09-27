"""Reads funding and conflict disclosures out of the PubMed records this index cites.

    python scripts/evidence/fetch-funding.py

Writes a proposal to the scratchpad; it changes no packet. Funding is context a
reader is entitled to and it is not a quality signal, so nothing here scores
anything — the output is the disclosure as the record carries it, plus the
category it falls into, for a person to check before it is loaded.

What it reads is the PubMed record itself: the grant list, the conflict-of-
interest statement, and any "Funded by" sentence in the abstract. That is
metadata published with the study. It is not the full text, so an empty result
means "the PubMed record discloses nothing", never "the study had no funding" —
those are recorded as different states.
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "SOURCE_MANIFEST.json"
OUT = pathlib.Path(os.environ.get("TIDES_SCRATCH_DIR", "review")) / "funding-proposal.json"
EFETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

INDUSTRY = re.compile(
    r"\b(inc\.?|ltd\.?|llc|gmbh|corp\.?|corporation|pharmaceutical|pharma|"
    r"laboratories|biotech|company|co\.|a/s|sa|ag)\b",
    re.I,
)
GOVERNMENT = re.compile(
    r"\b(nih|national institutes? of health|nci|niddk|nhlbi|ninds|nia|nsf|"
    r"medical research council|mrc|wellcome|nihr|european commission|"
    r"ministry|national natural science foundation|department of)\b",
    re.I,
)
ACADEMIC = re.compile(r"\b(universit|college|school of medicine|institute of)\b", re.I)
CHARITY = re.compile(r"\b(foundation|charit|trust|association|society)\b", re.I)


def pmid_of(source: dict) -> str | None:
    url = source.get("canonical_url") or ""
    match = re.search(r"pubmed\.ncbi\.nlm\.nih\.gov/(\d+)", url)
    return match.group(1) if match else None


def cited_sources() -> dict[str, dict]:
    """Sources some packet actually cites. The rest are not worth fetching."""
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    sources = {s["source_key"]: s for s in manifest["sources"]}
    used: set[str] = set()
    for path in (ROOT / "data/seed/evidence").glob("*.json"):
        packet = json.loads(path.read_text(encoding="utf-8"))
        for location in packet.get("locations", []):
            used.add(location["sourceKey"])
    return {key: sources[key] for key in sorted(used) if key in sources}


def fetch(pmids: list[str]) -> dict[str, dict]:
    """One request per 150 identifiers, politely spaced."""
    found: dict[str, dict] = {}
    for start in range(0, len(pmids), 150):
        batch = pmids[start : start + 150]
        query = urllib.parse.urlencode(
            {"db": "pubmed", "id": ",".join(batch), "retmode": "xml"}
        )
        request = urllib.request.Request(
            f"{EFETCH}?{query}", headers={"User-Agent": "TheTidesIndex/1.0"}
        )
        with urllib.request.urlopen(request, timeout=120) as response:
            root = ET.fromstring(response.read().decode("utf-8"))
        for article in root.iter("PubmedArticle"):
            pmid = article.findtext(".//PMID") or ""
            grants = []
            for grant in article.iter("Grant"):
                grants.append(
                    {
                        "agency": (grant.findtext("Agency") or "").strip(),
                        "country": (grant.findtext("Country") or "").strip(),
                        "id": (grant.findtext("GrantID") or "").strip(),
                    }
                )
            abstract = " ".join(
                (node.text or "") for node in article.iter("AbstractText")
            )
            funded = [
                sentence.strip()
                for sentence in re.split(r"(?<=[.])\s+", abstract)
                if re.search(r"funded by|supported by|sponsor", sentence, re.I)
            ]
            found[pmid] = {
                "grants": grants,
                "coi": (article.findtext(".//CoiStatement") or "").strip(),
                "funding_sentences": funded,
            }
        time.sleep(0.4)
    return found


def categorise(record: dict) -> str:
    """The category the disclosure falls into. Never a judgement of the study."""
    text = " ".join(
        [
            " ".join(f"{g['agency']}" for g in record["grants"]),
            " ".join(record["funding_sentences"]),
            record["coi"],
        ]
    )
    if not text.strip():
        return "not_reported_in_source"
    industry = bool(INDUSTRY.search(text))
    public = bool(GOVERNMENT.search(text))
    academic = bool(ACADEMIC.search(text))
    charity = bool(CHARITY.search(text))
    if industry and (public or academic or charity):
        return "mixed"
    if industry:
        return "industry"
    if public:
        return "government"
    if charity:
        return "foundation_or_charity"
    if academic:
        return "academic_institution"
    return "not_reported_in_source"


def main() -> int:
    sources = cited_sources()
    by_pmid = {}
    for key, source in sources.items():
        pmid = pmid_of(source)
        if pmid is not None:
            by_pmid[pmid] = key
    print(f"  {len(sources)} cited sources, {len(by_pmid)} with a PubMed identifier")

    records = fetch(sorted(by_pmid))
    proposal = []
    tally: Counter[str] = Counter()
    for pmid, key in sorted(by_pmid.items(), key=lambda kv: kv[1]):
        record = records.get(pmid)
        if record is None:
            tally["no_record"] += 1
            continue
        kind = categorise(record)
        tally[kind] += 1
        proposal.append(
            {
                "sourceKey": key,
                "pmid": pmid,
                "funderKind": kind,
                "grants": record["grants"],
                "coi": record["coi"],
                "fundingSentences": record["funding_sentences"],
            }
        )

    OUT.write_text(json.dumps(proposal, indent=2, ensure_ascii=False), encoding="utf-8")
    for kind, count in tally.most_common():
        print(f"  {kind:26} {count}")
    print(f"\n  proposal written to {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
