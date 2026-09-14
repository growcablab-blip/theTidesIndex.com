#!/usr/bin/env python3
"""
BPC-157 human-evidence update, 14 September 2026.

    python -X utf8 scripts/evidence/upgrade-bpc-157-2026-09-14.py

Applies only what the newly held material supports:

  - SRC-030 (interstitial cystitis) is now held in full and was read. It is a
    retrospective chart review, not a prospective study; the material came from a
    compounding pharmacy the authors do not name; no ethics approval is stated.
  - SRC-029 (intravenous pilot) is held only as an owner transcription. Its abstract
    matches PubMed; its body is unverified, so nothing is cited from it.
  - SRC-031 (knee pain): the file supplied was a different article. Nothing changes.

Study amounts stay in practitioner-only protocol rows. Idempotent.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKET = ROOT / "data" / "seed" / "evidence" / "bpc-157.json"
SCREEN = ROOT / "data" / "seed" / "literature" / "bpc-157-screen.json"
CHECKED = "2026-09-14"
FULL_IC = "Full text held and read (Altern Ther Health Med 2024;30(10):12-17)."


def upsert(items, item, key):
    for i, existing in enumerate(items):
        if existing[key] == item[key]:
            items[i] = item
            return
    items.append(item)


def main() -> None:
    p = json.loads(PACKET.read_text(encoding="utf-8"))

    tail = (" Updated 14 September 2026: the interstitial cystitis study (SRC-030) is now held in full and read; "
            "the intravenous pilot (SRC-029) is held only as an owner transcription whose body is unverified, so it stays at abstract level; "
            "the file supplied for the knee-pain study (SRC-031) was a different article, so that study also stays at abstract level.")
    if tail.strip() not in p["note"]:
        p["note"] += tail

    for loc in p["locations"]:
        if loc["key"] == "bpc-cystitis-abstract":
            loc["notes"] = "Abstract verified against the PubMed record and against the held full text."
        if loc["key"] == "bpc-iv-safety-abstract":
            loc["notes"] = "Abstract re-verified against PubMed on 14 September 2026. An owner transcription of the article body is held as a working artifact and is unverified; no location cites it."
    for new in [
        {"key": "bpc-cystitis-methods", "sourceKey": "SRC-030", "locatorText": "pp. 13–14, Methods", "pageStart": 13, "pageEnd": 14,
         "section": "Study design / chart review and data analysis; inclusion; patients; procedure", "notes": None},
        {"key": "bpc-cystitis-results", "sourceKey": "SRC-030", "locatorText": "p. 14, Results; Table 1", "pageStart": 14, "pageEnd": None,
         "section": "Results; Global Response Assessment", "tableNumber": "1", "notes": None},
        {"key": "bpc-cystitis-limitations-coi", "sourceKey": "SRC-030", "locatorText": "p. 16, Limitations; Conflict of interest", "pageStart": 16, "pageEnd": None,
         "section": "Limitations; conflict of interest", "notes": None},
    ]:
        upsert(p["locations"], new, "key")

    claims = {c["claimKey"]: c for c in p["claims"]}

    c2 = claims["BPC-002"]
    c2["interpretationNotes"] = c2["interpretationNotes"].replace(
        "two participants, twelve participants and a seventeen-patient chart review",
        "a two-participant infusion pilot and two retrospective chart reviews of twelve and seventeen patients")
    c2["uncertaintyText"] = c2["uncertaintyText"].replace(
        "All three human studies were read at abstract level; the full texts are not held.",
        "The interstitial cystitis study has been read in full. The intravenous study is verified at abstract level; an owner transcription of its body is held but unverified. The knee study is held at abstract level only.")
    c2["evidence"] = [e for e in c2["evidence"] if e["locationKey"] != "bpc-cystitis-abstract"]
    c2["evidence"].insert(1, {
        "locationKey": "bpc-cystitis-methods", "evidenceTypeKey": "human_observational", "relationship": "supports",
        "interpretation": "A retrospective chart review of twelve women with moderate to severe interstitial cystitis, all of whom had previously tried pentosan polysulfate, each treated with injections into the bladder wall during a single cystoscopy at a urogynaecology practice. The outcome was a single five-point Global Response Assessment, collected when patients were contacted afterwards; the report gives both six weeks and, for most patients, four to six months. Cystoscopic change is illustrated for one patient only.",
        "populationModel": "Twelve women aged 39 to 76 at one urogynaecology practice where a co-author practises; participants paid for the material.",
        "primaryTrace": "full_text_partially_supports",
        "primaryTraceNote": FULL_IC + " It confirms the population, the single procedure and the self-rated outcome recorded from the abstract, and shows that the study was a retrospective chart review rather than a prospective one, with outcome timing reported inconsistently.",
    })

    c8 = claims["BPC-008"]
    c8["claimText"] = ("None of the three identified human studies had a control group, a randomisation procedure or blinding; all three were conducted at private clinics and published in the same journal, and two of the three were retrospective chart reviews. "
                       "In at least two, what was administered is not established by the report: in one the material came from a 503A compounding pharmacy the authors do not name, with no certificate of analysis or identity or purity testing reported, and another gave a second peptide to part of the cohort. "
                       "The interstitial cystitis report states no ethics committee approval for the study it reports.")
    c8["uncertaintyText"] = ("The interstitial cystitis study has now been read in full. It confirmed the absence of a control group and added that the study was retrospective, that no ethics approval is stated, and that the timing of the outcome is reported inconsistently. "
                             "The intravenous study is verified at abstract level only, and the knee study is held at abstract level only.")
    c8["evidence"] = [e for e in c8["evidence"] if e["locationKey"] != "bpc-cystitis-abstract"]
    c8["evidence"].insert(0, {
        "locationKey": "bpc-cystitis-methods", "evidenceTypeKey": "human_observational", "relationship": "supports",
        "interpretation": "The full text states that the peptide came from a US 503A compounding pharmacy that does not wish to disclose its name, and reports no certificate of analysis, lot, identity or purity testing for it. It describes the study as a retrospective chart review of patients who had received an experimental treatment, and states no ethics committee approval for it.",
        "populationModel": "Twelve women.",
        "primaryTrace": "full_text_supports",
        "primaryTraceNote": FULL_IC + " Each element read at printed pp. 13–14.",
    })
    c8["evidence"].insert(1, {
        "locationKey": "bpc-cystitis-limitations-coi", "evidenceTypeKey": "human_observational", "relationship": "contextualizes",
        "interpretation": "The authors' stated limitations are sample size, ethnic variation and the lack of a sham control group, with biopsies not performed because of cost. They do not name the retrospective design, self-rated outcome or unnamed supplier as limitations.",
        "populationModel": "Twelve women.",
        "primaryTrace": "full_text_supports",
        "primaryTraceNote": FULL_IC + " Read at printed p. 16.",
    })

    gaps = p["notYetSupported"]
    gaps[0]["why"] = gaps[0]["why"].replace(
        "twelve women treated in a single procedure with outcomes self-rated afterwards",
        "twelve women treated in a single procedure and reviewed retrospectively from charts, with outcomes self-rated weeks to months afterwards")
    for g in gaps:
        g["resolution"] = g.get("resolution") or {"state": "open", "note": "Checked 14 September 2026 against the newly supplied human-study material; unchanged.", "checkedAt": CHECKED}
    gaps[0]["resolution"] = {"state": "open", "note": "Checked 14 September 2026. The interstitial cystitis full text confirms it had no comparison group; nothing supplied could establish an effect.", "checkedAt": CHECKED}
    gaps[8]["resolution"] = {"state": "partially_resolved", "note": "Checked 14 September 2026. The interstitial cystitis full text was obtained and read. The file supplied for the knee-pain study was a different article, and the intravenous study is held only as an unverified owner transcription, so two of the three remain at abstract level.", "checkedAt": CHECKED}
    gaps[9]["resolution"] = {"state": "open", "note": "Checked 14 September 2026. The interstitial cystitis full text confirms the material came from an unnamed 503A compounding pharmacy with no characterisation reported.", "checkedAt": CHECKED}
    for new in [
        {"gapType": "primary_source_missing",
         "statement": "What the full text of the intra-articular knee-pain study reports (Lee and Padgett, 2021).",
         "why": "The file supplied under this title on 14 September 2026 was a different article, on nitric oxide and carotid intima-media thickness, with no BPC-157 content. SOURCE REPLACEMENT REQUIRED.",
         "whatWouldResolveIt": "The publisher's version of Lee E, Padgett B, Altern Ther Health Med 2021;27(4):8-13 (PMID 34324435).",
         "verificationIssueKey": None, "researchQuestion": None, "opportunityType": None, "resolution": None},
        {"gapType": "primary_source_missing",
         "statement": "Whether the owner transcription of the intravenous safety pilot faithfully reproduces the published article's body, including its tables and disclosures.",
         "why": "The transcription's abstract matches PubMed, but its body cannot be checked: one participant's table is missing, another is labelled for the wrong participant, and passages are out of order. Nothing is cited from it.",
         "whatWouldResolveIt": "The publisher's version of Lee E, Burgess K, Altern Ther Health Med 2025;31(5):20-24 (PMID 40131143), compared page by page.",
         "verificationIssueKey": None, "researchQuestion": None, "opportunityType": None, "resolution": None},
    ]:
        if not any(g["statement"] == new["statement"] for g in gaps):
            gaps.append(new)

    for pr in p["protocols"]:
        if pr["protocolKey"] == "BPC-PR-STUDY-CYSTITIS":
            pr["locationKey"] = "bpc-cystitis-methods"
            pr["evidenceTypeKey"] = "human_observational"
            pr["formulation"] = "Solution at 2 mg/mL from a US 503A compounding pharmacy the authors do not name; no certificate of analysis or identity testing reported."
            pr["timingText"] = "Ten injections into the bladder wall (dome and trigone) through a cystoscope during one procedure, as reported. The authors call this intravesical; it is injection into the wall, not instillation."
            pr["frequencyText"] = "Once, during a single procedure. The two participants reporting partial improvement were later scheduled for a second injection, with no outcome reported."
            pr["monitoringText"] = "Baseline cystoscopy; follow-up cystoscopy at six weeks; Global Response Assessment when patients were contacted, most four to six months after treatment. No laboratory monitoring or adverse-event instrument is described."
            pr["safetyNotes"] = "The report states no post-procedural haematuria or acute cystitis and no fever, rash, nausea, vomiting, irritative urinary symptoms or dyspareunia; how adverse events were collected is not described. Twelve participants, retrospective: not a safety establishment."
            pr["populationModel"] = "Twelve women aged 39 to 76 with moderate to severe interstitial cystitis at one urogynaecology practice where a co-author practises; participants paid for the material."
            pr["regulatoryContext"] = "What a retrospective chart review reports twelve women received. No comparison group, no stated ethics approval and an unnamed supplier, so it cannot show that anything observed was caused by the compound, or establish what was given. Not a recommendation."
        if pr["protocolKey"] == "BPC-PR-STUDY-IV-PILOT":
            pr["monitoringText"] = "Baseline blood work and vital signs, and before and after each infusion; fasting blood work repeated on days 2 and 3; participants asked about side effects at each appointment."

    for f in p["funding"]:
        if f["fundingKey"] == "FUND-SRC-029":
            extra = " An owner transcription of the full text is held but unverified; its funding and conflict statements are not recorded here until the publisher's version is checked."
            if extra.strip() not in f["notes"]:
                f["notes"] += extra
        if f["fundingKey"] == "FUND-SRC-030":
            f.update({
                "locationKey": "bpc-cystitis-limitations-coi",
                "funderKind": "not_reported_in_source",
                "sponsorName": None, "manufacturerInvolved": None, "institution": None, "grantReference": None,
                "disclosureText": "The authors declare there is no conflict of interest in the authorship or publication of this manuscript.",
                "notes": "Full text read (printed pp. 12-17). It carries this conflict-of-interest declaration and no funding statement. Participants paid for the peptide and received no honorarium (p. 14); treatment was given at the practice where a co-author works; the supplying pharmacy is not named; and the article argues for regulatory reclassification of BPC-157 (p. 16). The declaration is the authors' statement and is recorded as such.",
            })

    PACKET.write_text(json.dumps(p, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if SCREEN.exists():
        s = json.loads(SCREEN.read_text(encoding="utf-8"))
        changed = 0
        for key in ("records", "included"):
            for r in s.get(key, []) or []:
                if str(r.get("externalId") or r.get("pmid")) == "39325560" and r.get("studyType") != "human_observational":
                    r["studyType"] = "human_observational"
                    changed += 1
        if changed:
            SCREEN.write_text(json.dumps(s, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"screen rows updated: {changed}")
    print(f"BPC-157: locations {len(p['locations'])}, gaps {len(gaps)}")


if __name__ == "__main__":
    main()
