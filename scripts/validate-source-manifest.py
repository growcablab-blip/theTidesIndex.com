#!/usr/bin/env python3
from pathlib import Path
import json, sys

root = Path(__file__).resolve().parents[1]
manifest = root / "SOURCE_MANIFEST.json"
data = json.loads(manifest.read_text(encoding="utf-8"))

PUBLIC_RECORD_TYPES = {"regulatory_label", "regulatory_guidance"}

errors = []
keys = set()
for s in data.get("sources", []):
    key = s.get("source_key")
    if not key:
        errors.append("Missing source_key")
    elif key in keys:
        errors.append(f"Duplicate source_key: {key}")
    keys.add(key)
    if not s.get("title"):
        errors.append(f"{key}: missing title")
    if s.get("qc_status") not in {"usable","incomplete","replace","pending","exclude"}:
        errors.append(f"{key}: invalid qc_status")
    # A copyrighted work may not have its full text published; a United States
    # government public record may. The flag was `false` everywhere because
    # every source was a book, and this check read as "nothing may ever be
    # republished" — which became wrong the moment an FDA label was registered.
    # It now states the rule it always meant.
    if s.get("public_fulltext_allowed") is True:
        if s.get("source_type") not in PUBLIC_RECORD_TYPES:
            errors.append(
                f"{key}: public_fulltext_allowed is true but source_type is "
                f"{s.get('source_type')!r}, which is not a public record"
            )
    elif s.get("public_fulltext_allowed") is not False:
        errors.append(f"{key}: public_fulltext_allowed must be true or false")

if errors:
    print("SOURCE MANIFEST VALIDATION FAILED")
    for e in errors:
        print("-", e)
    sys.exit(1)

print(f"SOURCE MANIFEST PASS — {len(data.get('sources', []))} records")
