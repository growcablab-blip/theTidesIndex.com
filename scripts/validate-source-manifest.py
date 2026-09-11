#!/usr/bin/env python3
from pathlib import Path
import json, sys

root = Path(__file__).resolve().parents[1]
manifest = root / "SOURCE_MANIFEST.json"
data = json.loads(manifest.read_text(encoding="utf-8"))

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
    if s.get("public_fulltext_allowed") is not False:
        errors.append(f"{key}: public_fulltext_allowed should default false for current book archive")

if errors:
    print("SOURCE MANIFEST VALIDATION FAILED")
    for e in errors:
        print("-", e)
    sys.exit(1)

print(f"SOURCE MANIFEST PASS — {len(data.get('sources', []))} records")
