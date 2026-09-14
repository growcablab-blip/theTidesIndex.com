#!/usr/bin/env python3
"""
Builds data/seed/trials/retatrutide-trials.json.

    python -X utf8 scripts/evidence/build-retatrutide-trials.py

Registry facts — dates, enrolment, phase, masking, sponsor, site count, countries,
registered outcomes — are read from the committed ClinicalTrials.gov snapshots in
data/sources/registry/, never retyped. Editorial fields (population as the
documents describe it, the statistical plan, oversight, which document answers
which question) and the comparisons between documents are written here, each
comparison pointing at two exact locations the compound packet defines.

A date the registry gives only as a month is left null rather than given an
invented day.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REG = ROOT / "data" / "sources" / "registry"
OUT = ROOT / "data" / "seed" / "trials" / "retatrutide-trials.json"
CHECKED = "2026-09-14"


def full_date(struct):
    value = (struct or {}).get("date")
    return value if value and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) else None


def registry_fields(nct: str) -> dict:
    d = json.loads((REG / f"{nct}.json").read_text(encoding="utf-8"))
    p = d["protocolSection"]
    ident, status, design = p["identificationModule"], p["statusModule"], p["designModule"]
    info = design.get("designInfo", {})
    masking = info.get("maskingInfo", {})
    who = ", ".join(w.lower() for w in masking.get("whoMasked", []))
    locations = p.get("contactsLocationsModule", {}).get("locations", [])
    countries = Counter(l.get("country") for l in locations if l.get("country"))
    enrol = design.get("enrollmentInfo", {})
    design_text = ", ".join(filter(None, [
        "/".join(ph.replace("PHASE", "Phase ") for ph in design.get("phases", [])),
        (info.get("allocation") or "").replace("_", " ").lower() or None,
        f"{masking.get('masking', '').lower()} masking ({who})" if masking.get("masking") else None,
        (info.get("interventionModel") or "").lower().replace("_", " ") + " assignment" if info.get("interventionModel") else None,
        f"primary purpose: {(info.get('primaryPurpose') or '').lower()}" if info.get("primaryPurpose") else None,
    ]))
    month_only = {k: (status.get(k) or {}).get("date") for k in ("startDateStruct", "primaryCompletionDateStruct", "completionDateStruct")
                  if (status.get(k) or {}).get("date") and not full_date(status.get(k))}
    return {
        "registryName": "ClinicalTrials.gov",
        "registryId": nct,
        "sponsorProtocolId": (ident.get("orgStudyIdInfo") or {}).get("id"),
        "acronym": ident.get("acronym"),
        "officialTitle": ident.get("officialTitle") or ident["briefTitle"],
        "phase": "/".join(ph.replace("PHASE", "Phase ") for ph in design.get("phases", [])) or "Not stated",
        "design": design_text[0].upper() + design_text[1:],
        "enrolmentText": f"{enrol.get('count')} ({(enrol.get('type') or '').lower()})" if enrol else None,
        "countries": "; ".join(f"{c} ({n} site entries)" for c, n in countries.most_common()) or None,
        "siteCount": len(locations) or None,
        "primaryOutcome": "; ".join(f"{o['measure']} ({o.get('timeFrame', '')})" for o in p["outcomesModule"]["primaryOutcomes"]),
        "secondaryOutcomes": "; ".join(f"{o['measure']} ({o.get('timeFrame', '')})" for o in p["outcomesModule"].get("secondaryOutcomes", [])) or None,
        "sponsor": p["sponsorCollaboratorsModule"]["leadSponsor"]["name"],
        "registryStatus": status["overallStatus"].replace("_", " ").lower(),
        "startDate": full_date(status.get("startDateStruct")),
        "primaryCompletionDate": full_date(status.get("primaryCompletionDateStruct")),
        "completionDate": full_date(status.get("completionDateStruct")),
        "resultsPostedDate": full_date(status.get("resultsFirstPostDateStruct")),
        "registryLastUpdate": full_date(status.get("lastUpdatePostDateStruct")),
        "registryCheckedAt": CHECKED,
        "_monthOnly": month_only,
        "_hasDmc": (p.get("oversightModule") or {}).get("oversightHasDmc"),
    }


def doc(source, role, basis, depth, answers, version=None, date=None, notes=None):
    return {"sourceKey": source, "role": role, "linkBasis": basis, "depth": depth, "versionLabel": version,
            "documentDate": date, "answers": answers, "notes": notes}


def cmp(key, topic, a, a_reports, b, b_reports, state, explanation, why=None, dose=False):
    return {"comparisonKey": key, "topic": topic, "locationAKey": a, "aReports": a_reports, "locationBKey": b,
            "bReports": b_reports, "state": state, "knownExplanation": explanation, "whyItMatters": why, "doseSpecific": dose}


TRIALS = [
    {
        "trialKey": "retatrutide-phase1-sad",
        "nct": "NCT03841630",
        "population": "Healthy participants, as registered.",
        "comparator": None,
        "durationText": "Single injection with follow-up, as registered.",
        "analysisPopulations": None, "statisticalPlan": None, "oversight": None,
        "doseArmsText": None,
        "notes": "No results posted, and no protocol or statistical analysis plan posted. The discovery paper (SRC-047) reports a phase 1 single-ascending-dose study in healthy participants; neither it nor this record names the other, so the link is recorded as unconfirmed and the two are not merged.",
        "documents": [
            doc("SRC-139", "registry_record", "posted_to_registry", "structured_record_held", "What was registered: design, enrolment, dates and status."),
            doc("SRC-047", "primary_publication", "unconfirmed", "abstract_only", "Single-dose pharmacokinetics and tolerability, as reported with the discovery work.",
                notes="The abstract gives no registry number and the registry lists no publication. Plausibly this study; not confirmed. Full text not held."),
            doc("SRC-149", "conference_material", "unconfirmed", "abstract_only", "Single-dose safety, heart rate, blood pressure, half-life and weight, as presented at the 2021 ADA Scientific Sessions.", date="2021-06-01",
                notes="Conference abstract 104-OR. It describes a randomised, placebo-controlled first-in-human single-ascending-dose study in 45 healthy participants, which matches this record's enrolment, but gives no registry number. Link not confirmed. Date is the journal supplement's issue date in the publisher's Crossref record."),
        ],
        "comparisons": [],
    },
    {
        "trialKey": "retatrutide-phase1b-t2d",
        "nct": "NCT04143802",
        "population": "Adults aged 20 to 70 with type 2 diabetes, HbA1c 7.0–10.5% and BMI 23–50, at four US centres (article abstract).",
        "comparator": "Placebo and dulaglutide within each cohort",
        "durationText": "12 weeks of once-weekly treatment (article abstract).",
        "analysisPopulations": "Safety: all who received at least one dose (72). Pharmacokinetics and pharmacodynamics: those with evaluable data (article abstract).",
        "statisticalPlan": None,
        "oversight": None,
        "doseArmsText": "Five ascending once-weekly subcutaneous cohorts — 0.5 mg, 1.5 mg, 3 mg, 3/6 mg and 3/6/9/12 mg by stepwise escalation — each with placebo and dulaglutide participants (article abstract). Study-design data, not a regimen.",
        "notes": "No results posted, and no protocol or statistical analysis plan posted. FULL TEXT NOT HELD for the article.",
        "documents": [
            doc("SRC-137", "registry_record", "posted_to_registry", "structured_record_held", "What was registered: design, enrolment, dates and status."),
            doc("SRC-048", "primary_publication", "registry_and_publication", "abstract_only", "Safety, pharmacokinetics (half-life about six days) and pharmacodynamics.",
                notes="FULL TEXT NOT HELD. The registry lists this article and the abstract gives the registry number."),
            doc("SRC-150", "conference_material", "unconfirmed", "abstract_only", "Twelve-week safety, heart rate, blood pressure, HbA1c and weight, as presented at the 2022 ADA Scientific Sessions, before the article.", date="2022-06-01",
                notes="Conference abstract 340-OR. It describes a randomised, placebo-controlled multiple-ascending-dose study in 72 people with type 2 diabetes with dulaglutide as a comparator, which matches this record, but gives no registry number. Link not confirmed. Date is the journal supplement's issue date in the publisher's Crossref record."),
        ],
        "comparisons": [],
    },
    {
        "trialKey": "retatrutide-phase2-t2d",
        "nct": "NCT04867785",
        "population": "Adults aged 18 to 75 with type 2 diabetes, HbA1c 7.0–10.5% and BMI 25–50, on diet and exercise alone or a stable dose of metformin (protocol synopsis; article abstract).",
        "comparator": "Placebo and dulaglutide (double-dummy)",
        "durationText": "36-week treatment period with the primary endpoint at 24 weeks, then 4-week safety follow-up (protocol).",
        "analysisPopulations": "Efficacy: randomised participants excluding those inadvertently enrolled (275 of 281, article abstract). Safety: all who received at least one dose (281).",
        "statisticalPlan": "Superiority of each maintenance dose to placebo for HbA1c change at 24 weeks, by mixed model for repeated measures under the efficacy estimand (hypothetical strategy for stopping treatment or starting rescue medication), two-sided 0.05, no adjustment for multiplicity. About 300 to be randomised, giving at least 99% power under the protocol's assumed effect (protocol §9; SAP §1.1, §2.1, §5).",
        "oversight": "No data monitoring committee (protocol synopsis; registry). An internal assessment committee reviewed interim analyses unblinded; the SAP documents three interim analyses, the second and third planned after protocol approval and the third requested by the sponsor's senior management to support end-of-phase-2 regulatory interactions.",
        "doseArmsText": "Once-weekly subcutaneous maintenance doses: 0.5 mg; 4 mg from a 2 mg start; 4 mg with no escalation; 8 mg from a 2 mg start; 8 mg from a 4 mg start; 12 mg from a 2 mg start; dulaglutide 1.5 mg; placebo. Randomised 2:2:2:1:1:1:1:2 (placebo, dulaglutide, then retatrutide groups) with escalation up to week 12 (protocol; registry arms). Study-design data, not a regimen.",
        "notes": "Final protocol amendment (c) approved 29 August 2022 and SAP version 3.0 approved 13 December 2022, both after primary completion; earlier versions not held. FULL TEXT NOT HELD for the main article.",
        "documents": [
            doc("SRC-126", "registry_record", "posted_to_registry", "structured_record_held", "What was registered: design, arms, eligibility, outcomes, sites and oversight."),
            doc("SRC-126", "posted_results", "posted_to_registry", "structured_record_held", "The sponsor's posted participant flow, outcome measures with analyses, and adverse events.", date="2023-07-03"),
            doc("SRC-127", "protocol", "posted_to_registry", "full_text_held", "Prespecified objectives, design, eligibility, escalation scheme, sample size, analysis populations and interim-analysis plan.", version="Amendment (c)", date="2022-08-29"),
            doc("SRC-128", "statistical_analysis_plan", "posted_to_registry", "full_text_held", "Estimands, analysis sets, multiplicity, interim analyses and their history.", version="Version 3.0", date="2022-12-13"),
            doc("SRC-049", "primary_publication", "registry_and_publication", "abstract_only", "Peer-reviewed results and the authors' interpretation.",
                notes="FULL TEXT NOT HELD (Rosenstock et al., Lancet 2023)."),
            doc("SRC-132", "substudy_publication", "registry_and_publication", "abstract_only", "Body composition by DXA in 189 participants.",
                notes="A substudy of this trial, not a separate trial. Full text not held."),
            doc("SRC-133", "post_hoc_publication", "registry_and_publication", "abstract_only", "Post hoc lipoprotein and inflammatory biomarkers, pooled with the obesity trial.",
                notes="Post hoc; shares participants with this trial and NCT04881760."),
        ],
        "comparisons": [
            cmp("RETA-T2D-CMP-01", "Primary endpoint: HbA1c change from baseline to 24 weeks",
                "rosenstock-2023", "Placebo −0.01%; retatrutide groups from −0.43% to −2.02%; dulaglutide −1.41%.",
                "ctgov-nct04867785-hba1c", "Placebo −0.05%; retatrutide groups from −0.43% to −2.01%; dulaglutide −1.41%.",
                "differ",
                "Six of the eight group values are identical. The placebo value differs by 0.04 points and the lowest (most negative) retatrutide value by 0.01. The abstract describes efficacy analysis in randomised participants except those inadvertently enrolled; the registry describes participants with baseline and post-baseline values, excluding those discontinuing for inadvertent enrolment. Neither explains the difference, and the article's full text is not held.",
                "Too small to change any comparison with placebo; recorded so that neither figure is silently preferred."),
            cmp("RETA-T2D-CMP-02", "Number of sites",
                "rosenstock-2023", "42 research and health-care centres in the USA.",
                "ctgov-nct04867785-sites", "43 site entries: 40 in the United States and 3 in Puerto Rico.",
                "differ", "Neither source explains the difference.", "Minor; recorded rather than harmonised."),
            cmp("RETA-T2D-CMP-03", "Interim analyses",
                "gzbd-protocol-p69", "One interim efficacy and safety assessment after all participants complete week 16; additional interim analyses may be conducted to monitor safety, and an interim analysis may be added without a protocol amendment.",
                "gzbd-sap-p44", "Three interim analyses: a safety analysis when about 15% complete week 16, a safety and efficacy analysis when about 60% complete week 16 that may inform future doses, and a third when all complete 36 weeks to support end-of-phase-2 interactions with regulators; the second and third 'were planned after the approval of the protocol and thus were not documented in the protocol'.",
                "differ",
                "The plan gives the reason itself: these analyses were planned after the protocol was approved. The final protocol amendment still describes a single week-16 interim analysis.",
                "Sponsor interim looks at unblinded data are common in dose-finding trials; a reader of the results is entitled to know they happened and why."),
            cmp("RETA-T2D-CMP-04", "Participants completing the study",
                "rosenstock-2023", "237 (84%) completed the study and 222 (79%) completed study treatment.",
                "ctgov-nct04867785-flow", "Posted participant flow: 237 of 281 completed.",
                "agree", "The completion counts match."),
            cmp("RETA-T2D-CMP-05", "Data monitoring committee",
                "gzbd-protocol-p9", "Data Monitoring Committee: No.",
                "ctgov-nct04867785-record", "Oversight module: has data monitoring committee — no.",
                "agree", "Protocol and registry agree."),
            cmp("RETA-T2D-CMP-06", "Adjustment for multiplicity",
                "gzbd-protocol-p65", "No adjustment for multiplicity will be performed.",
                "gzbd-sap-p16", "No adjustment for multiplicity will be performed.",
                "agree", "Protocol and plan agree.",
                "With several dose groups each compared with placebo, unadjusted p-values overstate certainty; the obesity trial report makes the same caution explicit."),
        ],
    },
    {
        "trialKey": "retatrutide-phase2-obesity",
        "nct": "NCT04881760",
        "population": "Adults aged 18 to 75 with BMI 30 to 50, or 27 to under 30 with a weight-related condition, without diabetes; enrolment managed for approximately equal numbers of women and men (article; protocol).",
        "comparator": "Placebo",
        "durationText": "48-week treatment period with the primary endpoint at 24 weeks, then 4-week safety follow-up (protocol; article).",
        "analysisPopulations": "Efficacy: randomised participants excluding those who discontinued because of inadvertent enrolment. Safety: randomised participants who received at least one dose (337) (article; protocol §9.3).",
        "statisticalPlan": "Superiority of each maintenance dose to placebo for percent body-weight change at 24 weeks, by mixed model for repeated measures under the efficacy estimand, two-sided 0.05, no adjustment for multiplicity; about 300 to be randomised, giving at least 97% power assuming an 8-point difference, SD 10% and 20% dropout (protocol §9.2; SAP §2.1; article p. 517).",
        "oversight": "No data monitoring committee (protocol; registry). An external committee adjudicated deaths and an independent clinical end-point committee confirmed major adverse cardiovascular events and pancreatitis (article, Table 3 notes). The protocol planned no interim analyses; SAP version 4.0 documents a third interim analysis requested by the sponsor's senior management, and the article refers to interim 24-week analyses.",
        "doseArmsText": "Once-weekly subcutaneous 1 mg; 4 mg from a 2 mg start; 4 mg from a 4 mg start; 8 mg from a 2 mg start; 8 mg from a 4 mg start; 12 mg from a 2 mg start; placebo. Randomised 2:1:1:1:1:2:2, stratified by sex and BMI, with escalation every 4 weeks for up to 12 weeks (article pp. 515–517). Study-design data, not a regimen.",
        "notes": "Over-enrolled (338 against about 300 planned) to reach the target of the MRI substudy, reported as the MASLD substudy (SRC-051 Methods). Final protocol amendment (b) and SAP version 4.0 were approved after primary completion; earlier versions not held. The article's Supplementary Appendix and protocol at NEJM.org are not held.",
        "documents": [
            doc("SRC-129", "registry_record", "posted_to_registry", "structured_record_held", "What was registered: design, arms, eligibility, outcomes, sites and oversight."),
            doc("SRC-129", "posted_results", "posted_to_registry", "structured_record_held", "The sponsor's posted participant flow, outcome measures with analyses, and adverse events.", date="2023-09-13"),
            doc("SRC-130", "protocol", "posted_to_registry", "full_text_held", "Prespecified objectives, design, eligibility, sample size, analysis sets, interim-analysis and oversight statements.", version="Amendment (b)", date="2022-08-29"),
            doc("SRC-131", "statistical_analysis_plan", "posted_to_registry", "full_text_held", "Estimands, analysis sets, multiplicity, interim analyses, and the NAFLD addendum analyses.", version="Version 4.0", date="2022-12-15"),
            doc("SRC-050", "primary_publication", "registry_and_publication", "full_text_held", "Peer-reviewed results by group at 24 and 48 weeks, safety tables and the authors' interpretation."),
            doc("SRC-051", "substudy_publication", "registry_and_publication", "full_text_held", "Liver fat by MRI, abdominal fat depots and liver biomarkers in 98 participants with MASLD.",
                notes="A substudy of this trial, not a separate trial."),
            doc("SRC-133", "post_hoc_publication", "registry_and_publication", "abstract_only", "Post hoc lipoprotein and inflammatory biomarkers, pooled with the type 2 diabetes trial.",
                notes="Post hoc; shares participants with this trial and NCT04867785."),
            doc("SRC-134", "secondary_publication", "stated_in_publication", "abstract_only", "Qualitative exit interviews with 40 participants.",
                notes="Gives this registry number; not listed in the registry record."),
            doc("SRC-135", "secondary_publication", "registry_and_publication", "abstract_only", "Development of an eating-behaviour questionnaire using exit-interview data. No trial outcomes."),
            doc("SRC-136", "secondary_publication", "stated_in_publication", "abstract_only", "Development of a weight-and-emotions questionnaire using exit-interview data. No trial outcomes.",
                notes="Gives this registry number; not listed in the registry record."),
        ],
        "comparisons": [
            cmp("RETA-OB-CMP-01", "Primary endpoint: percent body-weight change at 24 weeks, by group",
                "jastreboff-2023-p518", "Table 2: placebo −1.6; 1 mg −7.2; 4 mg (2 mg start) −11.8; 4 mg (4 mg start) −13.9; 8 mg (2 mg start) −16.7; 8 mg (4 mg start) −17.9; 12 mg −17.5.",
                "ctgov-nct04881760-weight", "Posted: placebo −1.55; 1 mg −7.18; 4 mg (2 mg start) −12.00; 4 mg −13.80; 8 mg (2 mg start) −16.64; 8 mg (4 mg start) −18.26; 12 mg −17.39.",
                "differ",
                "Placebo, 1 mg and 8 mg from a 2 mg start agree to rounding. The two 4 mg groups differ by 0.2 and 0.1 points, 8 mg from a 4 mg start by 0.36 and 12 mg by 0.1. Both describe least-squares means from a mixed model in randomised participants excluding inadvertent enrolment; neither explains the difference. The 48-week values agree.",
                "Small, and in no group large enough to change the comparison with placebo — but anyone citing a 24-week figure should know the article and the registry do not print the same numbers.",
                dose=True),
            cmp("RETA-OB-CMP-02", "Body weight at 48 weeks and proportions reaching 5%, 10% and 15% reductions",
                "jastreboff-2023-p518", "Table 2 at 48 weeks: least-squares means from −2.1% (placebo) to −24.2%; 27% to 100% reaching a 5% reduction and 2% to 83% reaching a 15% reduction.",
                "ctgov-nct04881760-thresholds", "Posted 48-week values: percent change from −2.11% to −24.22%; 27% to 100% reaching 5% and 2% to 83% reaching 15%.",
                "agree", "Every 48-week group value agrees to rounding."),
            cmp("RETA-OB-CMP-03", "Interim analyses",
                "gzbf-protocol-p76", "No interim analyses are planned; an interim analysis may be added at any time without a protocol amendment.",
                "gzbf-sap-p8", "Version 4.0 adds the details and rationale of a third interim analysis, requested by the sponsor's senior management to support end-of-phase-2 interactions with regulators.",
                "differ",
                "The protocol permits interim analyses to be added without amendment, so the plan does not breach it; the difference is between what was planned at the outset and what was done. The trial report refers to 'interim 24-week analyses' (p. 517).",
                "A reader of the results should know the sponsor looked at unblinded data before the trial ended, and why."),
            cmp("RETA-OB-CMP-04", "Planned and actual enrolment",
                "gzbf-protocol-p71", "Approximately 300 participants to be randomised.",
                "sanyal-2024-methods", "The main study was over-enrolled (338 against 300 planned) to reach the MASLD substudy's target of about 100 participants.",
                "differ",
                "The substudy report states the reason. The obesity trial report does not mention the over-enrolment.",
                "Explains a 13% over-enrolment that the main report leaves unexplained."),
            cmp("RETA-OB-CMP-05", "Participants completing the trial",
                "jastreboff-2023-p517", "81% completed the 52-week trial: 76–87% across retatrutide groups and 71% with placebo.",
                "ctgov-nct04881760-flow", "Posted participant flow: 275 of 338 completed, including 50 of 70 on placebo.",
                "agree", "275 of 338 is 81% and 50 of 70 is 71%."),
            cmp("RETA-OB-CMP-06", "Deaths",
                "jastreboff-2023-p522", "One death, by drowning, in a retatrutide group; assessed by the site investigator as unrelated and adjudicated as undetermined.",
                "ctgov-nct04881760-ae", "Posted adverse events: one death, in a retatrutide group; none with placebo.",
                "agree", "Article and registry agree."),
            cmp("RETA-OB-CMP-08", "Skin sensitivity adverse events",
                "jastreboff-2023-p521", "Cutaneous hyperaesthesia and skin-sensitivity events in 7% of retatrutide participants and 1% of placebo participants, grouped as a customised cluster of related terms.",
                "ctgov-nct04881760-ae", "Among events above the 5% threshold: 'hyperaesthesia' in 7 retatrutide participants and 1 on placebo, and 'sensitive skin' in 5 retatrutide participants and none on placebo, each listed as a separate term.",
                "not_comparable",
                "Both point the same way — more frequent with retatrutide — but they count differently: the article groups related terms into one cluster of participants, while the registry lists individual terms, and one participant may appear under both. The two sets of numbers cannot be reconciled from what is held.",
                "The registry corroborates the direction of an unusual adverse event without confirming its size."),
            cmp("RETA-OB-CMP-09", "Acute pancreatitis",
                "jastreboff-2023-p521", "Increases in amylase and lipase were asymptomatic except for one serious adverse event of acute pancreatitis.",
                "ctgov-nct04881760-ae", "Posted serious adverse events: acute pancreatitis in one participant, in a retatrutide group; none on placebo.",
                "agree", "Article and registry each report a single serious event of acute pancreatitis."),
            cmp("RETA-OB-CMP-07", "Oversight committees",
                "gzbf-protocol-p76", "Data monitoring committee: not applicable.",
                "jastreboff-2023-p523", "An external committee adjudicated deaths, and an independent clinical end-point committee confirmed major adverse cardiovascular events and pancreatitis.",
                "not_comparable",
                "Not a contradiction. Adjudication committees classify events; a data monitoring committee reviews accumulating unblinded data to protect participants. The registry also records no data monitoring committee.",
                "Readers often assume every large trial has an independent data monitoring committee; this one did not."),
        ],
    },
    {
        "trialKey": "retatrutide-phase3-transcend-t2d-1",
        "nct": "NCT06354660",
        "acronym": "TRANSCEND-T2D-1",
        "population": "Adults aged 18 or over with type 2 diabetes inadequately controlled by diet and exercise alone, HbA1c 7.0–9.5% and BMI 23 or more, at 48 sites in the USA, Mexico and India (article abstract).",
        "comparator": "Placebo",
        "durationText": "40 weeks (article abstract).",
        "analysisPopulations": None,
        "statisticalPlan": None,
        "oversight": None,
        "doseArmsText": "Once-weekly subcutaneous retatrutide 4 mg, 9 mg or 12 mg, or placebo, randomised 1:1:1:1 (article abstract). Study-design data, not a regimen.",
        "notes": "No results posted on the retrieval date; no protocol or statistical analysis plan posted. FULL TEXT NOT HELD for the article.",
        "documents": [
            doc("SRC-138", "registry_record", "posted_to_registry", "structured_record_held", "What was registered: design, arms, outcomes, sites and status."),
            doc("SRC-052", "primary_publication", "registry_and_publication", "abstract_only", "Peer-reviewed phase 3 results and interpretation.",
                notes="FULL TEXT NOT HELD (Bajaj et al., Lancet 2026)."),
        ],
        "comparisons": [],
    },
]


def main() -> None:
    trials = []
    for t in TRIALS:
        reg = registry_fields(t["nct"])
        month_only = reg.pop("_monthOnly")
        has_dmc = reg.pop("_hasDmc")
        record = {"trialKey": t["trialKey"], **reg}
        # The registry leaves the acronym blank for TRANSCEND-T2D-1 and puts it in the title.
        if t.get("acronym"):
            record["acronym"] = t["acronym"]
        for field in ("population", "comparator", "durationText", "analysisPopulations", "statisticalPlan",
                      "oversight", "doseArmsText", "notes", "documents", "comparisons"):
            record[field] = t[field]
        extras = []
        if month_only:
            extras.append("Registry gives month only for: " + ", ".join(f"{k.replace('DateStruct', '')} {v}" for k, v in month_only.items()) + ".")
        if record["oversight"] is None and has_dmc is not None:
            record["oversight"] = f"Registry oversight module: data monitoring committee — {'yes' if has_dmc else 'no'}."
        if extras:
            record["notes"] = (record["notes"] + " " if record["notes"] else "") + " ".join(extras)
        trials.append(record)

    packet = {
        "packetKey": "retatrutide-trials",
        "peptideKey": "retatrutide",
        "note": "Five registered retatrutide trials with published or registered human results, each counted once however many documents describe it. Registry facts are read from the committed snapshots in data/sources/registry (retrieved 14 September 2026). Every comparison cites two exact locations defined in data/seed/evidence/retatrutide.json. Dose arms are study-design data for practitioner depth and are never a recommended regimen.",
        "trials": trials,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(trials)} trials, {sum(len(t['documents']) for t in trials)} documents, {sum(len(t['comparisons']) for t in trials)} comparisons")
    for t in trials:
        print(" ", t["registryId"], t["phase"], "|", t["enrolmentText"], "|", t["siteCount"], "|", t["startDate"], t["completionDate"], "|", t["design"][:90])


if __name__ == "__main__":
    main()
