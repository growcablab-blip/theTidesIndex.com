#!/usr/bin/env python3
"""
Render the illustration proof into one PNG per registered figure, named by key.

    npx tsx --tsconfig tsconfig.scripts.json scripts/publishing/build-figure-proof.tsx
    python -X utf8 scripts/qa/render-figure-proof.py [out-dir]

Earlier proof images were named by page position and re-rendered piecemeal as
figures were added, so a page inserted in the middle shifted later positions and
left two stale files identical to their neighbours. Here every image is named by
the registry key printed at the top of its proof page, the folder is emptied
first, and the run fails if two figures render identically or a key is missing.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "build" / "publications" / "figure-proof.pdf"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "review" / "publications-v3" / "figure-proof"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()
    doc = fitz.open(PDF)
    rendered: dict[str, str] = {}
    hashes: dict[str, str] = {}
    for page in doc:
        # The proof page's first line of body text is "<key> — <title>".
        lines = [ln for ln in page.get_text().splitlines() if " — " in ln]
        if not lines:
            raise SystemExit(f"page {page.number + 1}: no key line found")
        key = lines[0].split(" — ", 1)[0].strip()
        if key in rendered:
            raise SystemExit(f"key {key} appears on more than one proof page")
        # Patient versions are keyed "patient/<key>"; the slash becomes "--" in a filename.
        path = OUT / f"{key.replace('/', '--')}.png"
        page.get_pixmap(dpi=110, clip=fitz.Rect(40, 40, 560, 500)).save(path)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in hashes:
            raise SystemExit(f"{key} renders identically to {hashes[digest]}")
        hashes[digest] = key
        rendered[key] = path.name
    summary = {"proof_pages": len(doc), "unique_renders": len(hashes), "keys": sorted(rendered)}
    (OUT / "proof-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"  {len(doc)} proof pages, {len(hashes)} unique renders -> {OUT}")


if __name__ == "__main__":
    main()
