#!/usr/bin/env python3
"""
Brings three verification issues in line with what the register now holds.

    python -X utf8 scripts/evidence/update-verification-issues-2026-09-14.py

V-017 and V-018 were titled "cannot be written at all" because no sterility or
endotoxin source was held. On 14 September 2026 the owner directed that the USP
<71> and <85> copies obtained from a document-sharing site be used as held
research copies with their provenance stated (owner decision D-21), and EU GMP
Annex 1 and FDA ORA.007 were verified against their issuers. Both topics are
now written. Neither issue is closed: the licensed USP-NF copies are still the
stated need, because the research copies' distribution provenance is unverified
and their text may not be current.

The seed format has no status or resolution field, so the issues stay open and
their wording changes to describe the present state. Nothing is deleted.
Idempotent.
"""
from __future__ import annotations

import json
from pathlib import Path

PATH = Path(__file__).resolve().parents[2] / "data" / "seed" / "verification_issues.json"

UPDATES = {
    "V-009": {
        "currentSourceSignal": "Now addressed as separate topics: sterility (STER-001 to STER-011) and bacterial endotoxin (ENDO-001 to ENDO-005), from EU GMP Annex 1 (SRC-124), FDA ORA.007 (SRC-125) and USP <71>/<85> held research copies (SRC-022, SRC-023). No held source states the comparison with chromatographic purity directly.",
        "neededVerification": "Keep the purity-versus-sterility and purity-versus-endotoxin sentences unmade until a source states the comparison; the facts on each side are sourced separately. Replace the USP research copies with licensed USP-NF copies when a subscription is held.",
    },
    "V-017": {
        "topic": "Sterility is written from research copies; a licensed USP <71> is still needed",
        "whyItMatters": "The sterility topic now explains what a sterility result does and does not show, resting partly on a copy of USP <71> whose distribution provenance is unverified. The explanation is sound; the copy it rests on is not the authoritative artefact, and its text may not be the current official chapter.",
        "currentSourceSignal": "SRC-022 (USP <71>) held as a research copy printed from USP-NF Online on 15 October 2020, obtained by the owner from a document-sharing site; used on the owner's instruction of 14 September 2026 (D-21), labelled as such on every claim. EU GMP Annex 1 (SRC-124) and FDA ORA.007 (SRC-125) are held and verified against their issuers.",
        "neededVerification": "Obtain a licensed USP-NF copy of <71>, compare it with the research copy, and re-check STER-003 to STER-006. The owner decision of 11 September 2026 to refuse unauthorised copies was superseded by the owner on 14 September 2026 (D-21); the research copy is never redistributed and never described as official.",
    },
    "V-018": {
        "topic": "Bacterial endotoxin is written from a research copy; a licensed USP <85> is still needed",
        "whyItMatters": "The endotoxin topic now explains that a result means something only against a product-specific, dose-based limit and a method shown free of interference, resting partly on a copy of USP <85> whose distribution provenance is unverified. Endotoxin remains among the attributes a reader is most likely to assume a purity figure covers.",
        "currentSourceSignal": "SRC-023 (USP <85>) held as a research copy printed from USP-NF Online on 21 November 2024, marked 'Do not distribute', obtained by the owner from a document-sharing site; used on the owner's instruction of 14 September 2026 (D-21). SRC-026 (USP <1085>) is not held. FDA ORA.007 (SRC-125) and EU GMP Annex 1 (SRC-124) are held and verified.",
        "neededVerification": "Obtain licensed USP-NF copies of <85> and <1085>, compare <85> with the research copy, and re-check ENDO-002 to ENDO-004. The research copy is never redistributed and never described as official.",
    },
}


def main() -> None:
    issues = json.loads(PATH.read_text(encoding="utf-8"))
    by_key = {i["issueKey"]: i for i in issues}
    for key, fields in UPDATES.items():
        by_key[key].update(fields)
    PATH.write_text(json.dumps(issues, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("updated", ", ".join(UPDATES))


if __name__ == "__main__":
    main()
