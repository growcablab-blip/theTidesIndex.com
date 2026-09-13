"""Writes the funding proposal into the compound packets.

    python scripts/evidence/apply-funding.py --check
    python scripts/evidence/apply-funding.py --write

Funding is context, never a score, and this script is careful about one
distinction in particular: a PubMed record with no grant list and no conflict
statement tells you nothing about how the study was paid for. It is recorded
as `not_checked` with a note saying what was consulted — not as
`none_declared`, which would assert something nobody established.

`manufacturer_involved` is set only where the disclosure itself names the
company that makes or sells the compound. It is the question a reader actually
has, and it is answered from the text rather than guessed from an affiliation.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[2]
PROPOSAL = pathlib.Path(
    r"C:\Users\ianbu\AppData\Local\Temp\claude\C--The-Tides-Index"
    r"\32f9e6c6-4fcf-4e60-b98b-623e91076bee\scratchpad\funding-proposal.json"
)

# The disclosure names the company that makes or sells the compound the record
# is about. Read from the statements printed by fetch-funding.py, one at a time.
MANUFACTURER_NAMED = {
    "SRC-047": "Eli Lilly and Company",
    "SRC-048": "Eli Lilly and Company",
    "SRC-049": "Eli Lilly and Company",
    "SRC-051": "Eli Lilly and Company",
    "SRC-052": "Eli Lilly and Company",
    "SRC-087": "CohBar, Inc.",
    "SRC-092": "CohBar, Inc.",
}

NOT_CHECKED_NOTE = (
    "The PubMed record for this study carries no grant list and no conflict-of-"
    "interest statement, and the full text has not been obtained. This is an "
    "absence in the record consulted on 13 September 2026, not a statement that "
    "the study was unfunded or that nothing was disclosed."
)


def sponsor_for(entry: dict) -> str | None:
    """The funder the disclosure names, or nothing."""
    if entry["sourceKey"] in MANUFACTURER_NAMED:
        return MANUFACTURER_NAMED[entry["sourceKey"]]
    agencies = [g["agency"] for g in entry["grants"] if g["agency"]]
    return agencies[0] if agencies else None


def disclosure_for(entry: dict) -> str:
    parts: list[str] = []
    agencies = sorted({g["agency"] for g in entry["grants"] if g["agency"]})
    if agencies:
        parts.append("Grants recorded by PubMed: " + "; ".join(agencies) + ".")
    for sentence in entry["fundingSentences"][:2]:
        parts.append(sentence.strip())
    if entry["coi"]:
        coi = re.sub(r"\s+", " ", entry["coi"]).strip()
        parts.append("Declared interests: " + (coi[:600] + "…" if len(coi) > 600 else coi))
    return " ".join(parts)


def main() -> int:
    write = "--write" in sys.argv
    proposal = json.loads(PROPOSAL.read_text(encoding="utf-8"))
    by_source = {entry["sourceKey"]: entry for entry in proposal}

    # Each source is recorded once, in the first packet that cites it, so a
    # source two records share does not produce two conflicting rows.
    claimed: set[str] = set()
    tally: Counter[str] = Counter()

    for path in sorted((ROOT / "data/seed/evidence").glob("*.json")):
        packet = json.loads(path.read_text(encoding="utf-8"))
        if "compound" not in packet:
            continue
        first_location: dict[str, str] = {}
        for location in packet.get("locations", []):
            first_location.setdefault(location["sourceKey"], location["key"])

        funding = []
        for source_key, location_key in first_location.items():
            if source_key in claimed or source_key not in by_source:
                continue
            entry = by_source[source_key]
            claimed.add(source_key)
            kind = entry["funderKind"]
            if kind == "not_reported_in_source":
                funding.append(
                    {
                        "fundingKey": f"FUND-{source_key}",
                        "sourceKey": source_key,
                        "locationKey": None,
                        "funderKind": "not_checked",
                        "sponsorName": None,
                        "manufacturerInvolved": None,
                        "institution": None,
                        "grantReference": None,
                        "disclosureText": None,
                        "notes": NOT_CHECKED_NOTE,
                    }
                )
                tally["not_checked"] += 1
                continue

            grant_ids = [g["id"] for g in entry["grants"] if g["id"]]
            funding.append(
                {
                    "fundingKey": f"FUND-{source_key}",
                    "sourceKey": source_key,
                    "locationKey": location_key,
                    "funderKind": kind,
                    "sponsorName": sponsor_for(entry),
                    "manufacturerInvolved": source_key in MANUFACTURER_NAMED,
                    "institution": None,
                    "grantReference": "; ".join(sorted(set(grant_ids))[:6]) or None,
                    "disclosureText": disclosure_for(entry) or None,
                    "notes": (
                        "Read from the PubMed record for this study: its grant list, "
                        "its conflict-of-interest statement, or a funding sentence in "
                        "the abstract. Recorded as context; nothing in this index "
                        "scores a study by who paid for it."
                    ),
                }
            )
            tally[kind] += 1

        if funding:
            packet["funding"] = sorted(funding, key=lambda f: f["sourceKey"])
            print(f"  {path.name:28} {len(funding)} funding records")
            if write:
                path.write_text(
                    json.dumps(packet, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8",
                )

    print()
    for kind, count in tally.most_common():
        print(f"  {kind:26} {count}")
    if not write:
        print("\n  (dry run — pass --write to save)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
