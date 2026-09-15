#!/usr/bin/env python3
"""
Owner review board for the five publications.

    python -X utf8 scripts/qa/render-publications-v2.py

Reads the built PDFs in build/publications/ and writes, for each volume, into
review/publications-v2/<volume>/:

    01-cover.png            the cover
    02-opening.png          the contents, or the first page after the cover
    03..06-spread-*.png     representative two-page spreads, evenly spaced
    07-illustration.png     the page carrying the most vector drawing
    08-technical.png        the densest page of running text
    09-sources.png          the page carrying the most source identifiers

Pages are chosen by what they contain, not by page number, so a rebuilt volume
with different pagination yields the same kind of board. It also copies each PDF
into review/publications-v2/pdf/, writes summary.json, and writes CONTACT_SHEET.html
linking every image, the PDFs, the figure proof and any web-print captures.
"""
from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "build" / "publications"
OUT = ROOT / "review" / "publications-v2"

BOOKS = [
    ("understanding-peptides", "tides-index-understanding-peptides.pdf", "Understanding Peptides", "Volume one · patients and new clinic staff"),
    ("science-applications", "tides-index-peptide-science-and-applications.pdf", "Peptide Science & Applications", "Volume two · clinicians"),
    ("reference-guide", "tides-index-peptide-reference-guide.pdf", "The Peptide Reference Guide", "Volume three · clinicians"),
    ("protocols", "tides-index-peptide-protocols-quick-reference.pdf", "Peptide Protocols & Clinical Quick Reference", "Volume four · clinics comparing sources"),
    ("peptide-quality", "tides-index-peptide-quality.pdf", "Peptide Quality: From Manufacturing to the Final Vial", "Volume five · anyone reading a certificate"),
]

DPI = 80
# What a reference line looks like across the five volumes: a source key, a DOI or
# URL, a standard's section mark, or a named compendium or guideline.
SOURCE_ID = re.compile(r"\bSRC-\d{3}\b|\bdoi\b|https?://|§|\bICH Q\d|\bUSP <\d+>|\bet al\.", re.I)


def render(page: fitz.Page, path: Path) -> None:
    page.get_pixmap(dpi=DPI).save(path)


def spread(doc: fitz.Document, left: int, path: Path) -> None:
    images = []
    for index in (left, left + 1):
        if index < len(doc):
            pix = doc[index].get_pixmap(dpi=DPI)
            images.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    width = sum(im.width for im in images) + 12 * (len(images) - 1)
    sheet = Image.new("RGB", (width, images[0].height), (214, 224, 226))
    x = 0
    for im in images:
        sheet.paste(im, (x, 0))
        x += im.width + 12
    sheet.save(path)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "pdf").mkdir(exist_ok=True)
    summary: dict[str, object] = {}
    sections: list[str] = []

    for slug, filename, title, audience in BOOKS:
        pdf = BUILD / filename
        if not pdf.exists():
            print(f"  missing {filename}")
            continue
        folder = OUT / slug
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True)
        shutil.copy2(pdf, OUT / "pdf" / filename)

        with fitz.open(pdf) as doc:
            n = len(doc)
            texts = [p.get_text() for p in doc]
            body = list(range(1, n))
            opening = next((i for i in body if "CONTENTS" in texts[i].upper()[:400]), 1)
            # Each role takes a different page: a page picked once is not offered again.
            taken = {0, opening}
            illustration = max((i for i in body if i not in taken), key=lambda i: len(doc[i].get_drawings()))
            taken.add(illustration)
            sources = max((i for i in body if i not in taken), key=lambda i: len(SOURCE_ID.findall(texts[i])))
            taken.add(sources)
            technical = max(
                (i for i in body if i not in taken and len(SOURCE_ID.findall(texts[i])) < 4),
                key=lambda i: len(texts[i]),
                default=1,
            )
            taken.add(technical)
            candidates = [i for i in range(2, n - 2) if i not in taken and i + 1 not in taken]
            spreads = [candidates[round(k * (len(candidates) - 1) / 3)] for k in range(4)] if len(candidates) >= 4 else candidates

            picks: list[tuple[str, str, list[int]]] = []
            render(doc[0], folder / "01-cover.png")
            picks.append(("01-cover.png", "Cover", [1]))
            render(doc[opening], folder / "02-opening.png")
            picks.append(("02-opening.png", "Contents / opening", [opening + 1]))
            for k, left in enumerate(dict.fromkeys(spreads)):
                name = f"{k + 3:02d}-spread-p{left + 1}-{left + 2}.png"
                spread(doc, left, folder / name)
                picks.append((name, "Representative spread", [left + 1, left + 2]))
            render(doc[illustration], folder / "07-illustration.png")
            picks.append(("07-illustration.png", "Illustration-heavy page", [illustration + 1]))
            render(doc[technical], folder / "08-technical.png")
            picks.append(("08-technical.png", "Deep technical page", [technical + 1]))
            render(doc[sources], folder / "09-sources.png")
            picks.append(("09-sources.png", "Source / reference page", [sources + 1]))

        summary[slug] = {"title": title, "file": filename, "pages": n, "picks": [{"image": p[0], "role": p[1], "pages": p[2]} for p in picks]}
        print(f"  {slug}: {n} pages")

        cards = "".join(
            f'<figure class="{"wide" if "spread" in name else ""}"><a href="{slug}/{name}"><img src="{slug}/{name}" alt="{html.escape(title)}: {html.escape(role)}"></a>'
            f'<figcaption><strong>{html.escape(role)}</strong> <span>p. {"–".join(str(p) for p in pages)}</span></figcaption></figure>'
            for name, role, pages in picks
        )
        sections.append(
            f'<section><h2>{html.escape(title)}</h2><p class="meta">{html.escape(audience)} · {n} pages · '
            f'<a href="pdf/{filename}">full PDF</a></p><div class="grid">{cards}</div></section>'
        )

    extras = []
    for folder, label in (
        ("figure-proof", "Illustration proof — every web figure as it prints"),
        ("web-print", "Website print captures — disclosures expanded"),
        ("protocols-semantics", "Protocol comparison — agreement, difference, not reported"),
        ("reference-guide", ""),
    ):
        path = OUT / folder
        if not label or not path.exists():
            continue
        items = sorted(p.name for p in path.iterdir() if p.suffix.lower() in (".png", ".pdf"))
        links = "".join(
            f'<a class="thumb" href="{folder}/{name}">'
            + (f'<img src="{folder}/{name}" alt="{html.escape(name)}">' if name.endswith(".png") else "")
            + f"<span>{html.escape(name)}</span></a>"
            for name in items
        )
        extras.append(f'<section><h2>{html.escape(label)}</h2><div class="thumbs">{links}</div></section>')

    (OUT / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (OUT / "CONTACT_SHEET.html").write_text(
        f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>The Tides Index — Publications v2</title>
<style>
body{{margin:0;padding:40px 48px 64px;background:#fbfcfa;color:#0b1f2a;font-family:Georgia,'Source Serif 4',serif}}
h1{{font-size:34px;margin:0 0 6px}} h2{{font-size:24px;margin:52px 0 6px;border-top:1px solid #d6e0e2;padding-top:28px}}
p.lede,p.meta{{font-family:Inter,system-ui,sans-serif;color:#2c4551;max-width:84ch;font-size:15px;line-height:1.6;margin:0 0 14px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}}
figure{{margin:0;background:#fff;border:1px solid #d6e0e2;border-radius:8px;overflow:hidden}}
figure.wide{{grid-column:span 2}}
figure img{{display:block;width:100%;border-bottom:1px solid #e6edee}}
figcaption{{padding:8px 10px;font-family:Inter,system-ui,sans-serif;font-size:12.5px}} figcaption span{{color:#5d6b72}}
.thumbs{{display:flex;flex-wrap:wrap;gap:14px}} .thumb{{display:flex;flex-direction:column;gap:4px;width:210px;text-decoration:none;font-family:Inter,system-ui,sans-serif;font-size:11.5px;color:#2c4551}}
.thumb img{{width:210px;border:1px solid #d6e0e2;background:#fff}} a{{color:#123f4a}}
</style></head><body>
<h1>The Tides Index — Publications v2</h1>
<p class="lede">Owner review board for the five publications. For each: the cover, the contents or opening, representative spreads, the most illustrated page, the densest technical page and a source page — chosen by what the pages contain, not by page number. Every image links to its full-size rendering; each volume links to its complete PDF. Nothing here is published, and nothing has been through scientific or clinical review.</p>
{''.join(sections)}
{''.join(extras)}
</body></html>""",
        encoding="utf-8",
    )
    print(f"  written to {OUT}")


if __name__ == "__main__":
    main()
