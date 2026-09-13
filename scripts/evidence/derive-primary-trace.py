"""Records how far each piece of evidence has been traced to the research.

    python scripts/evidence/derive-primary-trace.py --check
    python scripts/evidence/derive-primary-trace.py --write

Every claim in this index points at a location in a source. What that citation
is *worth* depends on something the citation itself does not say: whether the
source is the research, a regulator's account of it, or a practitioner's
recollection of a paper nobody here has opened.

This writes that state onto each evidence row from the source register, so it
is derived from what the index demonstrably holds rather than asserted. The
rules are deliberately coarse and each one records its basis in the note, so a
reviewer can disagree with a category rather than with 400 invisible decisions.

It never invents a verdict. `full_text_*` states — the ones that say a paper
was read and what it showed — are only ever set by hand, in the packet, by
somebody who read the paper. This script will not write them and refuses to
overwrite one.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[2]
PACKETS = sorted((ROOT / "data/seed/evidence").glob("*.json"))
MANIFEST = ROOT / "SOURCE_MANIFEST.json"

# A verdict about a full text is a human act, not a derivation.
HUMAN_ONLY = {
    "full_text_supports",
    "full_text_partially_supports",
    "full_text_does_not_support",
    "full_text_different_context",
}

ABSTRACT_MARKERS = ("abstract", "not obtained")


def state_for(source: dict, locator: str) -> tuple[str, str]:
    """The trace state for evidence citing this source at this locator."""
    kind = source.get("source_type")
    access = (source.get("access_status") or "").lower()
    limits = (source.get("limitations_notes") or "").lower()
    notes = (source.get("access_notes") or "").lower()
    held_at_abstract = (
        "abstract" in access
        or any(m in limits for m in ABSTRACT_MARKERS)
        or any(m in notes for m in ABSTRACT_MARKERS)
        or "abstract" in (locator or "").lower()
    )

    if kind in {"primary_journal_article", "clinical_trial_registry"}:
        if held_at_abstract:
            return (
                "abstract_only",
                "The cited source is the research itself, held at abstract level: "
                "design, setting and size are reliable at this depth and the detail "
                "of how outcomes were collected is not.",
            )
        return (
            "primary_source_is_cited",
            "The cited source is the research itself, held in full. No secondary "
            "characterisation stands between this index and the study.",
        )

    if kind in {
        "regulatory_label",
        "regulatory_guidance",
        "compendial_standard",
        "academic_methods_reference",
    }:
        return (
            "primary_source_is_cited",
            "The document is the authority for what it states — labelling, a "
            "standard or a stated method — rather than an account of research "
            "reported elsewhere.",
        )

    if kind == "systematic_review_meta_analysis":
        return (
            "cited_not_obtained",
            "A review characterising studies this index has not obtained. Its "
            "account of them has not been checked against the papers.",
        )

    if kind in {"practitioner_handbook", "academic_textbook", "expert_interview"}:
        return (
            "cited_not_obtained",
            "A secondary source. Where it cites primary literature it does so by "
            "superscript, link or not at all, and none of those citations has been "
            "obtained and read by this index.",
        )

    return (
        "not_attempted",
        "Source type carries no general rule; nobody has traced this citation.",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write the packets")
    parser.parse_args()
    write = "--write" in sys.argv

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    sources = {s["source_key"]: s for s in manifest["sources"]}

    tally: Counter[str] = Counter()
    kept = 0
    changed = 0

    for path in PACKETS:
        packet = json.loads(path.read_text(encoding="utf-8"))
        if "compound" not in packet and "topic" not in packet:
            continue
        locations = {loc["key"]: loc for loc in packet.get("locations", [])}
        dirty = False

        for claim in packet.get("claims", []):
            for evidence in claim.get("evidence", []):
                current = evidence.get("primaryTrace")
                if current in HUMAN_ONLY:
                    kept += 1
                    tally[current] += 1
                    continue
                location = locations.get(evidence["locationKey"])
                if location is None:
                    print(f"  {path.name}: no location {evidence['locationKey']}")
                    continue
                source = sources.get(location["sourceKey"])
                if source is None:
                    print(f"  {path.name}: no source {location['sourceKey']}")
                    continue
                state, note = state_for(source, location.get("locatorText") or "")
                tally[state] += 1
                if current != state or evidence.get("primaryTraceNote") != note:
                    evidence["primaryTrace"] = state
                    evidence["primaryTraceNote"] = note
                    dirty = True
                    changed += 1

        if dirty and write:
            path.write_text(
                json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
            )

    for state, count in tally.most_common():
        print(f"  {state:28} {count}")
    print(f"\n  {changed} evidence rows updated, {kept} hand-set verdicts left alone.")
    if not write:
        print("  (dry run — pass --write to save)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
