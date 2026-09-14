#!/usr/bin/env python3
"""
Render representative pages of the two foundation publications for the owner
review board.

    python -X utf8 scripts/qa/render-publication-pages.py

Reads the built PDFs in build/publications/ (run `npm run pdf` and
`npm run pdf:science` first) and writes PNGs to
review/product-experience-v1/publications/. Pages are chosen by the text they
carry, not by number, so a rebuilt volume with different pagination still
yields the same review set.
"""
from __future__ import annotations

import re
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "build" / "publications"
OUT = ROOT / "review" / "product-experience-v1" / "publications"

PICKS = {
    "tides-index-understanding-peptides.pdf": [
        ("understanding-01-cover", None),
        ("understanding-02-what-is-a-peptide", "WHERE A PEPTIDE ENDS"),
        ("understanding-03-peptides-in-the-body", "KINDS OF PEPTIDE THE BODY MAKES"),
        ("understanding-03b-tides-synthesis", "TIDES SYNTHESIS · SYN-BODY-01"),
        ("understanding-04-signalling", "A MESSAGE AND A RECEIVER"),
        ("understanding-05-routes", "THE ROUTES, AS REGULATORS DEFINE THEM"),
    ],
    "tides-index-peptide-science-and-applications.pdf": [
        ("science-01-cover", None),
        ("science-02-inside-the-cell", "INSIDE THE CELL"),
        ("science-03-terms-defined", "THE TERMS, DEFINED"),
    ],
}


def squash(text: str) -> str:
    return re.sub(r"\s+", "", text).upper()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    written = 0
    for pdf_name, picks in PICKS.items():
        path = BUILD / pdf_name
        if not path.exists():
            print(f"  missing {pdf_name} — build it first")
            continue
        with fitz.open(path) as doc:
            texts = [squash(p.get_text()) for p in doc]
            for name, marker in picks:
                index = 0 if marker is None else next(
                    (i for i, t in enumerate(texts) if squash(marker) in t), None
                )
                if index is None:
                    print(f"  {name}: marker not found")
                    continue
                doc[index].get_pixmap(dpi=70).save(OUT / f"{name}.png")
                written += 1
                print(f"  {name}: page {index + 1}")
    print(f"  {written} page image(s) in {OUT}")


if __name__ == "__main__":
    main()
