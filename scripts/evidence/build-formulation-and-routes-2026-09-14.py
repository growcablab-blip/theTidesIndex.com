#!/usr/bin/env python3
"""
Formulation and excipients, and why most peptides are injected.

    python -X utf8 scripts/evidence/build-formulation-and-routes-2026-09-14.py

Owner direction, 14 September 2026: where a book cannot be obtained, answer the
scientific question from other legitimate sources, cited as themselves.

Writes two packets from extraction candidates that were checked word for word
against the held texts:

  data/seed/evidence/formulation-excipients.json   (quality topic)
      SRC-145  Nugrahadi et al., Pharmaceutics 2023 — open-access review
      SRC-147  ICH Q5C (1995)
      SRC-148  ICH Q1A(R2) (2003)

  data/seed/learning/peptides-as-medicines.json    (learning topic)
      SRC-143  Wang et al., Signal Transduction and Targeted Therapy 2022
      SRC-146  Chen et al., Theranostics 2022

Neither answers what Banga (SRC-014) or the English Rang and Dale (SRC-122)
would have: general pharmacokinetic definitions, the individual routes and
freeze-drying formulation design stay recorded as gaps. OpenStax textbooks were
not used (owner decision D-26).

Every quote is re-checked against its source before anything is written; the
script refuses to write if one is missing. Idempotent.

Also records resolution states on the older gaps these packets bear on, without
deleting any.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
EXTRACT = Path(r"C:\Users\ianbu\AppData\Local\Temp\claude\C--The-Tides-Index"
               r"\32f9e6c6-4fcf-4e60-b98b-623e91076bee\scratchpad\extract")
SNAP = ROOT / "data" / "private" / "source-snapshots" / "reviews"
TODAY = "2026-09-14"

REVIEW_TRACE = "A narrative review. The primary studies it cites have not been obtained and read by this index."
UNCITED_TRACE = "A narrative review's own summary sentence, with no citation attached; nothing behind it can be traced."
ICH_TRACE = "The guideline itself, retrieved from the issuing body and read."

SOURCE_OF = {
    "pharmaceutics-2023": "SRC-145", "ich-q1a": "SRC-148", "ich-q5c": "SRC-147",
    "theranostics-2022": "SRC-146", "sttt-2022": "SRC-143",
}
SNAPSHOT_OF = {
    "SRC-145": SNAP / "formulation-peptides-aqueous-2023.txt",
    "SRC-146": SNAP / "oral-delivery-proteins-peptides-2022.txt",
    "SRC-143": SNAP / "wang2022-therapeutic-peptides.txt",
}
PDF_OF = {
    "SRC-147": ROOT / "sources" / "ICH_Q5C_Stability_Biotechnological_Products_Step4_1995.pdf",
    "SRC-148": ROOT / "sources" / "ICH_Q1A_R2_Stability_Testing_Step4_2003.pdf",
}
# printed page + offset = file page
OFFSET = {"SRC-147": 2, "SRC-148": 6}


def norm(s: str) -> str:
    s = re.sub(r"\[[\d,\s–-]+\]", "", s)
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("-\n", "")
    return re.sub(r"\s+", " ", s).strip().lower()


_texts: dict[str, str] = {}


def text_of(key: str) -> str:
    if key not in _texts:
        if key in SNAPSHOT_OF:
            _texts[key] = norm(SNAPSHOT_OF[key].read_text(encoding="utf-8"))
        else:
            with fitz.open(PDF_OF[key]) as d:
                _texts[key] = norm(" ".join(p.get_text() for p in d))
    return _texts[key]


def check_quote(cid: str, key: str, quote: str) -> None:
    for part in re.split(r"\s*…\s*", quote):
        seg = norm(part).strip(" .,;")
        # Tolerate hyphenation and line-break differences in PDF text by
        # checking a run of the segment's words.
        words = seg.split()
        probe = " ".join(words[: min(len(words), 12)])
        if probe and probe not in text_of(key):
            raise SystemExit(f"{cid}: quote not found in {key}: {probe!r}")


def load(name: str) -> dict:
    return json.loads((EXTRACT / name).read_text(encoding="utf-8"))


# --- Formulation and excipients ----------------------------------------------

FORM_CATEGORY = {
    **{f"FORM-{n:02d}": "degradation-pathways" for n in range(1, 9)},
    **{f"FORM-{n:02d}": "excipient-purpose" for n in (9, 10, 11, 12, 13, 14)},
    "FORM-15": "formulation-principle", "FORM-16": "formulation-principle",
    "FORM-17": "regulatory-scope", "FORM-24": "regulatory-scope", "FORM-25": "regulatory-scope",
    "FORM-18": "stability-testing", "FORM-19": "stability-testing", "FORM-20": "stability-testing",
    "FORM-21": "stability-testing", "FORM-22": "stability-testing", "FORM-26": "stability-testing",
    "FORM-27": "stability-testing", "FORM-28": "stability-testing",
    "FORM-23": "definitions",
}
FORM_HIGH = {"FORM-01", "FORM-02", "FORM-09", "FORM-15", "FORM-18", "FORM-22", "FORM-23", "FORM-24", "FORM-28"}

# Wording tightened from the candidates where the candidate carried more than
# the claim needs.
FORM_TEXT = {
    "FORM-16": ("The review states that reconstituting a dried product poses a risk of contamination.",
                "Adding liquid to a dried peptide introduces a chance of contamination."),
}

REVIEW_UNCERTAINTY = ("A narrative review of therapeutic peptides in aqueous solution, not a systematic review; "
                      "it characterises literature this index has not read. Its tables and figures were not in the "
                      "held text and nothing is taken from them.")
Q1A_UNCERTAINTY = ("ICH guidance for registration applications for new medicines (Step 4, 6 February 2003). "
                   "It describes what applicants submit, not how any research-use product was made or tested. "
                   "Time-sensitive: current ICH status re-checked before publication.")
Q5C_UNCERTAINTY = ("ICH guidance for marketing applications for well-characterised proteins and polypeptides from "
                   "biological sources or rDNA (Step 4, 30 November 1995). Chemically synthesised peptides are not "
                   "within its stated scope, and it describes nothing about research-use products.")


def section_of(locator: str) -> str:
    m = re.search(r"§[\d.]+\s*[^;]*", locator)
    return (m.group(0) if m else locator).strip().rstrip(",")


def build_formulation() -> dict:
    src = load("formulation.json")
    locations, claims = [], []
    for c in src["candidates"]:
        cid, key = c["id"], SOURCE_OF[c["source"]]
        check_quote(cid, key, c["quote"])
        loc_key = cid.lower()
        sec = section_of(c["locator"])
        if key in OFFSET:
            printed = str(c["printedPage"])
            first, _, last = printed.partition("–")
            p0 = int(first)
            p1 = int(last) if last else None
            if int(c["filePage"]) != p0 + OFFSET[key]:
                raise SystemExit(f"{cid}: file page {c['filePage']} is not printed {p0} + {OFFSET[key]}")
            name = "ICH Q1A(R2)" if key == "SRC-148" else "ICH Q5C"
            locations.append({"key": loc_key, "sourceKey": key,
                              "locatorText": f"{name} {sec}, p. {printed}",
                              "pageStart": p0, **({"pageEnd": p1} if p1 else {}), "section": sec})
            evidence = {"locationKey": loc_key, "evidenceTypeKey": "regulatory_reference",
                        "interpretation": c["scopeNote"], "primaryTrace": "primary_source_is_cited",
                        "primaryTraceNote": ICH_TRACE}
            uncertainty = Q1A_UNCERTAINTY if key == "SRC-148" else Q5C_UNCERTAINTY
        else:
            locations.append({"key": loc_key, "sourceKey": key,
                              "locatorText": f"Nugrahadi et al. 2023, {sec}",
                              "section": sec,
                              "notes": "Web full text (Europe PMC); no page numbers. Located by section heading."})
            evidence = {"locationKey": loc_key, "evidenceTypeKey": "academic_reference",
                        "interpretation": c["scopeNote"], "primaryTrace": "cited_not_obtained",
                        "primaryTraceNote": REVIEW_TRACE}
            uncertainty = REVIEW_UNCERTAINTY
        text, plain = FORM_TEXT.get(cid, (c["proposedClaim"], c["plainLanguage"]))
        claims.append({
            "claimKey": cid, "claimText": text, "plainLanguageText": plain,
            "claimCategory": FORM_CATEGORY[cid], "importance": "high" if cid in FORM_HIGH else "medium",
            "interpretationNotes": c["scopeNote"], "uncertaintyText": uncertainty,
            "evidence": [evidence],
        })

    return {
        "packetKey": "formulation-excipients",
        "qualityKey": "formulation-excipients",
        "note": ("Extracted 14 September 2026. The formulation text registered for this topic (Banga, SRC-014) is not "
                 "held: three files received under its title were download-site advertisements. Per owner direction "
                 "the questions are answered instead from an open-access review of peptide formulation in aqueous "
                 "solution (Nugrahadi et al., Pharmaceutics 2023; SRC-145) and two ICH stability guidelines (Q1A(R2), "
                 "SRC-148; Q5C, SRC-147), each cited as itself and none presented as the missing book. A second review "
                 "(SRC-144) was read and not used: its 'stability' is stability in the body. The review names approved "
                 "medicines as examples throughout; none is carried into a claim, and none of its numeric pH ranges is "
                 "carried as guidance. Every quote was checked word for word against the held text. SRC-145 is a web "
                 "full text located by section; ICH Q5C printed page + 2 = file page; ICH Q1A(R2) printed page + 6 = file page."),
        "topic": src["topicDraft"],
        "locations": locations,
        "claims": claims,
        "notYetSupported": [
            {
                "gapType": "source_missing",
                "statement": "What tonicity agents, lyoprotectants and bulking agents, adsorption controls and antimicrobial preservatives are for in a peptide formulation.",
                "why": "None of the held sources explains them. The formulation review names adsorption without mechanism or mitigation and does not discuss freeze-drying excipients; ICH Q1A(R2) requires preservative content to be tested but does not say why a preservative is added.",
                "whatWouldResolveIt": "A pharmaceutics source on parenteral and freeze-dried formulation excipients, obtained and read.",
            },
            {
                "gapType": "formulation_unspecified",
                "statement": "What any particular product contains besides the peptide, and whether that formulation suits the peptide.",
                "why": "General literature explains why excipients are used; what a product contains, and whether it was tested, is product-specific. The review itself states that methods may not work for all peptides (FORM-15).",
                "whatWouldResolveIt": "A product's own composition and the stability data for that formulation.",
            },
            {
                "gapType": "scope_not_established",
                "statement": "Whether ICH Q5C's expectations apply to chemically synthesised peptides.",
                "why": "Q5C's stated scope is well-characterised proteins and polypeptides isolated from biological sources or made by rDNA technology. It neither names nor excludes synthetic peptides, so this index does not apply it to them.",
                "whatWouldResolveIt": "Regulatory guidance that states which stability guideline governs synthetic peptides.",
            },
            {
                "gapType": "regulatory_status_unverified",
                "statement": "Whether ICH Q1A(R2) and Q5C are still the current ICH stability guidelines.",
                "why": "ICH has been consolidating its stability guidelines into a revised Q1. The held files are the Step 4 texts of 2003 and 1995; their current status was not checked.",
                "whatWouldResolveIt": "The ICH guideline register checked on a stated date.",
            },
        ],
    }


# --- Why most peptides are injected -------------------------------------------

PK_TEXT = {
    "PK-07": ("A 2022 review of oral protein and peptide delivery notes that oral insulin was first attempted in the 1920s, that very few marketed oral formulations of such large molecules exist, and that moving the approaches it describes from bench to bedside faces many challenges.",
              None),
    "PK-08": ("A 2022 review characterises therapeutic peptides as commonly acting as hormones, growth factors, neurotransmitters, ion-channel ligands or anti-infectives, binding cell-surface receptors with high affinity and specificity.",
              None),
    "PK-12": ("The review states that short protein and peptide therapeutics produced by genetic code expansion have a short half-life because of fast serum degradation and quick elimination, and that increasing their size reduces renal clearance by kidney filtration.",
              "Some small engineered peptides disappear from the blood quickly, both because they are broken down and because the kidneys filter them out."),
}
PK_CATEGORY = {
    **{k: "oral-delivery-barriers" for k in ("PK-01", "PK-02", "PK-03", "PK-04", "PK-17")},
    **{k: "delivery-trade-offs" for k in ("PK-05", "PK-06", "PK-16")},
    **{k: "research-status" for k in ("PK-07", "PK-15", "PK-18")},
    **{k: "peptides-as-a-class" for k in ("PK-08", "PK-09", "PK-10", "PK-11")},
    **{k: "half-life-and-clearance" for k in ("PK-12", "PK-13", "PK-14")},
}
PK_HIGH = {"PK-01", "PK-04", "PK-10", "PK-11"}
UNCITED = {"PK-04", "PK-07", "PK-11", "PK-18"}
THERANOSTICS = ("A narrative review, unevenly edited: elsewhere it misnames non-peptides as peptide drugs and misstates a "
                "permeability rule, and its citations may be misplaced in places. Used only where its general statement "
                "is plain and, for the core oral-delivery difficulty, corroborated by SRC-143. As of 2022.")
STTT = ("A narrative review of therapeutic peptides; class-level generalisations that do not establish anything for an "
        "individual peptide. As of 2022.")


def build_routes() -> dict:
    src = load("pk-routes.json")
    locations, claims = [], []
    for c in src["candidates"]:
        cid, key = c["id"], SOURCE_OF[c["source"]]
        check_quote(cid, key, c["quote"])
        loc_key = cid.lower()
        m = re.search(r"section (.+)$", c["locator"])
        sec = (m.group(1) if m else c["locator"].split(",", 2)[-1]).strip()
        who = "Chen et al. 2022" if key == "SRC-146" else "Wang et al. 2022"
        locations.append({"key": loc_key, "sourceKey": key, "locatorText": f"{who}, {sec}"[:300],
                          "section": sec[:300],
                          "notes": "Web full text (Europe PMC); no page numbers. Located by section heading and paragraph."})
        text, plain = PK_TEXT.get(cid, (None, None))
        claims.append({
            "claimKey": cid, "claimText": text or c["proposedClaim"],
            "plainLanguageText": plain or c["plainLanguage"],
            "claimCategory": PK_CATEGORY[cid], "importance": "high" if cid in PK_HIGH else "medium",
            "interpretationNotes": c["scopeNote"],
            "uncertaintyText": THERANOSTICS if key == "SRC-146" else STTT,
            "evidence": [{
                "locationKey": loc_key, "evidenceTypeKey": "academic_reference",
                "interpretation": c["scopeNote"], "primaryTrace": "cited_not_obtained",
                "primaryTraceNote": UNCITED_TRACE if cid in UNCITED else REVIEW_TRACE,
            }],
        })

    return {
        "packetKey": "peptides-as-medicines",
        "note": ("Extracted 14 September 2026 from two open-access (CC BY) narrative reviews: Wang et al., Signal "
                 "Transduction and Targeted Therapy 2022 (SRC-143) and Chen et al., Theranostics 2022 (SRC-146). They "
                 "answer part of what the English Rang and Dale (SRC-122, not held) was registered for — why peptides are "
                 "studied as a class, why most are injected and why many are short-lived — and are cited as themselves. "
                 "They do not define general pharmacokinetic terms, and none of that is written from them. Both reviews "
                 "name approved and investigational compounds; none is carried into a claim, and neither review's "
                 "approval count is used (they conflict and neither is primary). OpenStax textbooks were read and set "
                 "aside before extraction because their pages prohibit ingestion into large language models without "
                 "permission (D-26); nothing here draws on them. Every quote was checked word for word against the held text."),
        "topic": {
            "topicKey": "peptides-as-medicines",
            "slug": "peptides-as-medicines",
            "title": "Peptides as medicines: strengths, weaknesses and why most are injected",
            "publicationChapter": "Understanding Peptides — Six: Why peptides are studied (in part); Seven: Routes (in part); Peptide Science & Applications — Five: half-life and clearance points only",
            "summary": "What reviews of the field say peptides do well as medicines, the two weaknesses they share as a class, why swallowing them rarely works, and why many are short-lived in the blood. Class-level statements from narrative reviews, not statements about any peptide in this index.",
            "notes": "General pharmacokinetic definitions and descriptions of the individual routes are not in these sources and are recorded below as gaps.",
        },
        "locations": locations,
        "claims": claims,
        "notYetSupported": [
            {
                "gapType": "source_missing",
                "statement": "General pharmacokinetic concepts: absorption, distribution, metabolism and elimination; half-life; bioavailability; first-pass metabolism; clearance; volume of distribution; steady state.",
                "why": "The pharmacology textbook registered for these (SRC-122) is not held, and the reviews held define none of them. The open textbooks considered state that they may not be ingested into large language models without permission, so they were not used (D-26).",
                "whatWouldResolveIt": "A pharmacokinetics source whose terms permit this use, obtained and read.",
            },
            {
                "gapType": "source_missing",
                "statement": "The individual routes by which peptides are given — subcutaneous, intramuscular, intravenous, nasal and others — and what each demands of a product.",
                "why": "The reviews explain why oral delivery is difficult and say most peptide drugs are injected; neither describes the routes themselves or their sterility and handling implications.",
                "whatWouldResolveIt": "A pharmaceutics or pharmacology source describing routes of administration, obtained and read.",
            },
            {
                "gapType": "numerical_threshold_not_established",
                "statement": "A typical oral bioavailability for peptides as a class.",
                "why": "The only figures in the held reviews are for single products or preclinical devices, and cannot be generalised.",
                "whatWouldResolveIt": "A systematic source reporting oral bioavailability across peptides, with its methods.",
            },
            {
                "gapType": "no_current_reviewed_evidence",
                "statement": "How often peptide candidates fail in development, and how approved peptide medicines differ from research-only peptides.",
                "why": "Both reviews lean towards advocacy and neither quantifies attrition or separates approved from unapproved peptides.",
                "whatWouldResolveIt": "A systematic analysis of peptide clinical development, and dated regulatory sources.",
            },
            {
                "gapType": "conflicting_sources",
                "statement": "How many peptide medicines have been approved.",
                "why": "One review gives more than 240 protein and peptide drugs approved by the FDA; the other gives more than 80 peptide drugs worldwide. The scopes differ and neither is a primary regulatory source, so neither count is used.",
                "whatWouldResolveIt": "A dated count from regulators' own approval databases, with the definition used.",
            },
        ],
    }


# --- Older gaps these bear on ---------------------------------------------------

RESOLUTIONS = [
    ("evidence/lyophilization.json", "How a freeze-drying cycle and excipient system is designed for any particular peptide.",
     {"state": "partially_resolved", "checkedAt": TODAY,
      "note": "Checked 14 September 2026. The general logic of choosing excipients is now sourced on the formulation page (FORM-01 to FORM-15): start from a peptide's degradation routes, test pH early, and expect each excipient to help one peptide and not another. The formulation review is about liquid formulations; freeze-drying cycle design, lyoprotectants and design for any particular peptide remain unsourced."}),
    ("evidence/lyophilization.json", "How stable any peptide is after a freeze-dried product is reconstituted.",
     {"state": "open", "checkedAt": TODAY,
      "note": "Checked 14 September 2026 and still open. ICH Q5C and Q1A(R2) now establish that, for registered products, stability after reconstitution is a separate property that has to be shown for the labelled conditions and period (FORM-22, FORM-28). That explains why the gap matters; it does not answer it for any peptide."}),
]


def apply_resolutions() -> list[str]:
    done = []
    for rel, statement, resolution in RESOLUTIONS:
        path = ROOT / "data" / "seed" / rel
        packet = json.loads(path.read_text(encoding="utf-8"))
        gap = next((g for g in packet["notYetSupported"] if g["statement"] == statement), None)
        if gap is None:
            raise SystemExit(f"gap not found in {rel}: {statement}")
        gap["resolution"] = resolution
        path.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        done.append(f"{rel}: {resolution['state']}")
    path = ROOT / "data" / "seed" / "evidence" / "storage-stability.json"
    packet = json.loads(path.read_text(encoding="utf-8"))
    for g in packet["notYetSupported"]:
        if "reconstitut" in g["statement"].lower() and g.get("resolution") is None:
            g["resolution"] = RESOLUTIONS[1][2]
            done.append(f"storage-stability: open — {g['statement'][:60]}")
    path.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return done


def main() -> None:
    form = build_formulation()
    routes = build_routes()
    (ROOT / "data" / "seed" / "evidence" / "formulation-excipients.json").write_text(
        json.dumps(form, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (ROOT / "data" / "seed" / "learning" / "peptides-as-medicines.json").write_text(
        json.dumps(routes, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"formulation-excipients: {len(form['claims'])} claims, {len(form['notYetSupported'])} gaps")
    print(f"peptides-as-medicines: {len(routes['claims'])} claims, {len(routes['notYetSupported'])} gaps")
    for line in apply_resolutions():
        print("resolution", line)


if __name__ == "__main__":
    main()
