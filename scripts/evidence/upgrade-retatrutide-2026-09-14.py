#!/usr/bin/env python3
"""
Retatrutide deep-evidence upgrade, 14 September 2026.

    python -X utf8 scripts/evidence/upgrade-retatrutide-2026-09-14.py

Applies what the newly held documents actually show to data/seed/evidence/retatrutide.json:

  - the phase 2 obesity trial (SRC-050) and its MASLD substudy (SRC-051), now read in full;
  - the registry records with posted results for both phase 2 trials (SRC-126, SRC-129);
  - the final protocols and statistical analysis plans for both (SRC-127/128, SRC-130/131);
  - the body-composition substudy and post hoc biomarker analysis, at abstract level (SRC-132, SRC-133).

Amounts appear only in protocol rows, which are practitioner-only. No claim text, plain-language
text, gap or position carries an arm amount. Idempotent: locations, claims, gaps and funding rows
are upserted by key.
"""
from __future__ import annotations

import json
from pathlib import Path

PACKET = Path(__file__).resolve().parents[2] / "data" / "seed" / "evidence" / "retatrutide.json"
CHECKED = "2026-09-14"

FULL_NEJM = "Full text of the trial report read (N Engl J Med 2023;389:514-26)."
FULL_NATMED = "Full text of the substudy report read (Nat Med 2024;30:2037-48), including Methods and Extended Data."
REGISTRY = "The sponsor's structured results as posted to the ClinicalTrials.gov record, read in full from the committed API snapshot. The registry is itself the primary posting; no secondary characterisation stands between it and this index."
PLAN = "The sponsor's own trial document as posted to the registry, read in full. It states what was planned; it is not a report of what was done."
ABSTRACT = "The cited source is the research itself, held at abstract level: design, setting and size are reliable at this depth and the detail of how outcomes were collected is not."


def loc(key, source, text, page=None, end=None, section=None, table=None, notes=None):
    return {"key": key, "sourceKey": source, "locatorText": text, "pageStart": page, "pageEnd": end,
            "chapter": None, "section": section, "figure": None, "tableNumber": table, "notes": notes}


def ev(location, etype, interpretation, trace, note, relationship="supports"):
    return {"locationKey": location, "evidenceTypeKey": etype, "relationship": relationship,
            "interpretation": interpretation, "primaryTrace": trace, "primaryTraceNote": note}


NEW_LOCATIONS = [
    loc("jastreboff-2023", "SRC-050", "Abstract, p. 514", 514, section="Abstract"),
    loc("jastreboff-2023-p515", "SRC-050", "p. 515", 515, section="Introduction; Methods: trial design, participants, procedures"),
    loc("jastreboff-2023-p517", "SRC-050", "p. 517", 517, section="Procedures (continued); end points and assessments; statistical analysis; participant characteristics"),
    loc("jastreboff-2023-p518", "SRC-050", "p. 518, Table 2", 518, section="Primary and secondary end points", table="2"),
    loc("jastreboff-2023-p520", "SRC-050", "p. 520", 520, section="Changes in body weight (continued); cardiometabolic risk factors; safety"),
    loc("jastreboff-2023-p521", "SRC-050", "p. 521", 521, section="Safety (continued)"),
    loc("jastreboff-2023-p522", "SRC-050", "p. 522, Table 3", 522, section="Adverse events and safety", table="3"),
    loc("jastreboff-2023-p523", "SRC-050", "p. 523, Table 3 (continued)", 523, section="Adverse events of special interest", table="3"),
    loc("jastreboff-2023-p525", "SRC-050", "p. 525", 525, section="Discussion (strengths and limitations); funding statement"),
    loc("sanyal-2024", "SRC-051", "Abstract, p. 2037", 2037, section="Abstract"),
    loc("sanyal-2024-p2038", "SRC-051", "p. 2038", 2038, section="Changes in hepatic fat fraction"),
    loc("sanyal-2024-p2043", "SRC-051", "p. 2043", 2043, section="Metabolic biomarkers; MASH and fibrosis biomarkers; safety"),
    loc("sanyal-2024-p2046", "SRC-051", "p. 2046", 2046, section="Discussion: limitations"),
    loc("sanyal-2024-methods", "SRC-051", "Methods, study design and participants (file p. 13; unnumbered online page)", section="Methods: study design and participants"),
    loc("sanyal-2024-competing", "SRC-051", "Competing interests (file p. 14; unnumbered online page)", section="Author contributions; competing interests"),
    loc("ctgov-nct04867785-record", "SRC-126", "Registry record: identification, sponsor, oversight, design and eligibility modules", section="protocolSection"),
    loc("ctgov-nct04867785-arms", "SRC-126", "Registry record: arms and interventions module", section="protocolSection.armsInterventionsModule"),
    loc("ctgov-nct04867785-sites", "SRC-126", "Registry record: contacts and locations module", section="protocolSection.contactsLocationsModule"),
    loc("ctgov-nct04867785-hba1c", "SRC-126", "Posted results: 'Change From Baseline in Hemoglobin A1c (HbA1c)', baseline to 24 weeks (primary outcome)", section="resultsSection.outcomeMeasuresModule"),
    loc("ctgov-nct04867785-weight", "SRC-126", "Posted results: 'Change From Baseline in Body Weight', 24 and 36 weeks", section="resultsSection.outcomeMeasuresModule"),
    loc("ctgov-nct04867785-flow", "SRC-126", "Posted results: participant flow module", section="resultsSection.participantFlowModule"),
    loc("ctgov-nct04867785-ae", "SRC-126", "Posted results: adverse events module", section="resultsSection.adverseEventsModule"),
    loc("ctgov-nct04881760-record", "SRC-129", "Registry record: identification, sponsor, oversight, design and eligibility modules", section="protocolSection"),
    loc("ctgov-nct04881760-sites", "SRC-129", "Registry record: contacts and locations module", section="protocolSection.contactsLocationsModule"),
    loc("ctgov-nct04881760-weight", "SRC-129", "Posted results: 'Mean Percent Change From Baseline in Body Weight', week 24 (primary outcome) and week 48", section="resultsSection.outcomeMeasuresModule"),
    loc("ctgov-nct04881760-thresholds", "SRC-129", "Posted results: percentage of participants achieving ≥5%, ≥10% and ≥15% body-weight reduction, weeks 24 and 48", section="resultsSection.outcomeMeasuresModule"),
    loc("ctgov-nct04881760-flow", "SRC-129", "Posted results: participant flow module", section="resultsSection.participantFlowModule"),
    loc("ctgov-nct04881760-ae", "SRC-129", "Posted results: adverse events module", section="resultsSection.adverseEventsModule"),
    loc("gzbd-protocol-p7", "SRC-127", "§1.1 Synopsis, p. 7", 7, section="1.1 Synopsis"),
    loc("gzbd-protocol-p9", "SRC-127", "§1.1 Synopsis: overall design, p. 9", 9, section="1.1 Synopsis: overall design; data monitoring committee"),
    loc("gzbd-protocol-p65", "SRC-127", "§9.1–9.3, p. 65", 65, section="9.1 Statistical hypotheses; 9.2 Sample size; 9.3 Populations for analyses"),
    loc("gzbd-protocol-p69", "SRC-127", "§9.5–9.6, pp. 69–70", 69, 70, section="9.5 Interim analyses; 9.6 Data monitoring committee"),
    loc("gzbd-protocol-p117", "SRC-127", "§10.14 Protocol amendment history, pp. 117–118", 117, 118, section="10.14 Appendix 14: Protocol amendment history"),
    loc("gzbd-sap-p7", "SRC-128", "Version history, pp. 7–8", 7, 8, section="Version history"),
    loc("gzbd-sap-p12", "SRC-128", "§1.1 Primary estimand, p. 12", 12, section="1.1 Objectives, endpoints and estimands"),
    loc("gzbd-sap-p16", "SRC-128", "§2.1 Multiplicity adjustment, p. 16", 16, section="2.1 Multiplicity adjustment"),
    loc("gzbd-sap-p44", "SRC-128", "§4.8 Interim analyses, p. 44", 44, section="4.8 Interim analyses"),
    loc("gzbf-protocol-p8", "SRC-130", "§1.1 Synopsis, p. 8", 8, section="1.1 Synopsis"),
    loc("gzbf-protocol-p71", "SRC-130", "§9.2–9.3, pp. 71–72", 71, 72, section="9.2 Sample size determination; 9.3 Populations for analyses"),
    loc("gzbf-protocol-p76", "SRC-130", "§9.5–9.6, p. 76", 76, section="9.5 Interim analyses; 9.6 Data monitoring committee"),
    loc("gzbf-sap-p8", "SRC-131", "Version history, p. 8", 8, section="Version history"),
    loc("gzbf-sap-p15", "SRC-131", "§2.1 Multiplicity adjustment, p. 15", 15, section="2.1 Multiplicity adjustment"),
    loc("gzbf-sap-p51", "SRC-131", "§7.7 NAFLD addendum, pp. 51–52", 51, 52, section="7.7 Appendix 7: Nonalcoholic fatty liver disease"),
    loc("coskun-2025", "SRC-132", "Abstract", section="Abstract (PMID 40609566)"),
    loc("ruotolo-2026", "SRC-133", "Abstract", section="Abstract (PMID 42608321)"),
    loc("urva-2021-104or", "SRC-149", "Conference abstract 104-OR", section="Abstract (Diabetes 2021;70 Suppl 1)"),
    loc("urva-2022-340or", "SRC-150", "Conference abstract 340-OR", section="Abstract (Diabetes 2022;71 Suppl 1)"),
]

CONFERENCE = ("A conference abstract, read in full from the publisher's deposited metadata. It reports the study "
              "itself but gives no registry number, no numbers by group for this outcome, and no peer-reviewed "
              "methods; the journal page refused access.")

CLAIM_UPDATES = {
    "RETA-001": {
        "claimText": "Retatrutide (LY3437943) is a single synthetic peptide — described in the developer's trial protocols as a 39-residue linear peptide conjugated to a C20 fatty acid moiety — with agonist activity at the glucagon, GIP and GLP-1 receptors; relative to the endogenous ligands it is reported as less potent at the human glucagon and GLP-1 receptors and more potent at the GIP receptor, and in obese mice it reduced body weight, with glucagon-receptor-mediated increases in energy expenditure adding to intake reduction.",
        "interpretationNotes": "The receptor profile is laboratory pharmacology from the developer's discovery paper, restated with potency ratios in the obesity trial report; the energy-expenditure mechanism is from mice. The structural description comes from the developer's own protocols. None of it is a human measurement.",
        "uncertaintyText": "No held document states the amino-acid sequence. How the three receptor activities contribute in people is inferred from this profile and from trial outcomes, not measured directly.",
        "addEvidence": [
            ev("gzbd-protocol-p7", "analytical_characterisation", "The sponsor's protocol synopsis describes the molecule as a linear peptide of 39 amino-acid residues conjugated to a C20 fatty acid moiety.", "primary_source_is_cited", PLAN),
            ev("jastreboff-2023-p515", "in_vitro", "The trial report states that, compared with the endogenous ligands, retatrutide is less potent at the human glucagon and GLP-1 receptors (by factors of 0.3 and 0.4) and more potent at the GIP receptor (by a factor of 8.9), citing the discovery paper.", "cited_not_obtained", "The trial report restates laboratory potency ratios and cites the discovery paper for them; that paper is held at abstract level only, so the ratios have not been traced to the experiment.", relationship="cites"),
        ],
    },
    "RETA-003": {
        "claimText": "In a 48-week phase 2 trial in 338 adults with obesity, or overweight with a weight-related condition, and without diabetes, least-squares mean body-weight change at the 24-week primary endpoint ranged from −7.2% in the lowest-dose group to −17.9% in the highest-responding group against −1.6% with placebo, and at 48 weeks from −8.7% to −24.2% against −2.1%; 2% of placebo participants and 16–83% across retatrutide groups lost 15% or more of their body weight.",
        "interpretationNotes": "Randomised, placebo-controlled and now read in full. The estimate is the efficacy estimand — the effect if treatment had been taken as intended — with no adjustment for multiplicity, a surrogate endpoint (weight), US sites only, and a trial designed, monitored and analysed by the developer. The article, the registry's posted results and the plan agree on design and on every 48-week value; four 24-week group values differ slightly between article and registry, which is recorded against the trial rather than resolved.",
        "uncertaintyText": "48 weeks, 338 participants; the authors read the weight curves as not yet having plateaued. Durability after stopping, and effects on clinical events, are not addressed.",
        "retrace": {"jastreboff-2023": ("full_text_supports", FULL_NEJM + " The abstract's figures match Table 2.")},
        "addEvidence": [
            ev("jastreboff-2023-p518", "human_rct", "Table 2: least-squares mean percentage change in body weight at 24 and 48 weeks by group, differences from placebo, and proportions reaching 5%, 10% and 15% reductions.", "full_text_supports", FULL_NEJM + " Values read from Table 2."),
            ev("ctgov-nct04881760-weight", "human_rct", "Posted primary and secondary outcome measures: percent change in body weight at weeks 24 and 48 by group, with mixed-model comparisons against placebo.", "primary_source_is_cited", REGISTRY),
        ],
    },
    "RETA-004": {
        "addEvidence": [
            ev("ctgov-nct04867785-hba1c", "human_rct", "Posted primary outcome: least-squares mean change in HbA1c from baseline to 24 weeks by group, with comparisons against placebo.", "primary_source_is_cited", REGISTRY),
            ev("ctgov-nct04867785-weight", "human_rct", "Posted secondary outcomes: change in body weight in kilograms at 24 and 36 weeks by group.", "primary_source_is_cited", REGISTRY),
        ],
    },
    "RETA-005": {
        "claimText": "Across the published trials the most common adverse events were gastrointestinal (nausea, diarrhoea, vomiting, constipation), dose-related, mostly mild to moderate, occurring mainly during dose escalation and less often with a lower starting dose. In the 48-week obesity trial, read in full, adverse events led to discontinuation in 6–16% of participants across retatrutide groups and in none on placebo, serious adverse events occurred in 4% of both, and no clinically significant hypoglycaemia was reported; no severe hypoglycaemia was reported in the type 2 diabetes trials, and adverse-event discontinuations were 2–5% in the phase 3 trial.",
        "plainLanguageText": "The main side effects in trials were stomach and bowel symptoms, more common at higher doses and while doses were being increased. In the year-long obesity trial, some people stopped because of side effects; nobody on placebo did.",
        "interpretationNotes": "Consistent across four trials. The obesity-trial figures now come from its full report; the type 2 diabetes trials remain at abstract level, with the phase 2 trial's serious-adverse-event counts also available from its posted registry results. How fast the dose rises changed tolerability, which matters to anyone comparing trial schedules with practitioner schedules.",
        "uncertaintyText": "Trials of up to 48 weeks in selected populations. Rare or long-latency harms are not excluded by trials of this size and length. Adverse-event detail by group for the type 2 diabetes trials is not held beyond the registry's tables.",
        "retrace": {"jastreboff-2023": ("full_text_supports", FULL_NEJM + " The abstract's safety summary matches the Results and Table 3.")},
        "addEvidence": [
            ev("jastreboff-2023-p520", "human_rct", "Safety results: adverse events in 70% of placebo and 73–94% of retatrutide participants; discontinuation for adverse events 6–16% versus none; gastrointestinal events mainly during escalation and partly mitigated by a 2 mg start; 15 serious adverse events in 13 participants, 4% in both groups; one death by drowning judged unrelated by the site investigator.", "full_text_supports", FULL_NEJM),
            ev("jastreboff-2023-p522", "human_rct", "Table 3: adverse events, serious adverse events, deaths and discontinuations by group.", "full_text_supports", FULL_NEJM + " Values read from Table 3."),
            ev("ctgov-nct04867785-ae", "human_rct", "Posted adverse-event tables for the phase 2 type 2 diabetes trial: serious adverse events in one to three participants per group and no deaths.", "primary_source_is_cited", REGISTRY),
        ],
    },
    "RETA-006": {
        "claimText": "In a 98-participant substudy of the phase 2 obesity trial in people with metabolic dysfunction-associated steatotic liver disease and at least 10% liver fat, mean relative liver-fat change at 24 weeks ranged from about −43% to −82% across retatrutide groups against +0.3% with placebo; liver fat fell below 5% in 27–86% of retatrutide participants and in none on placebo; reductions were maintained at 48 weeks and tracked weight loss; and mean ALT, AST, FIB-4 and ELF did not change consistently against placebo.",
        "plainLanguageText": "In people with fatty liver disease in one trial, liver fat fell sharply alongside weight loss. Blood tests of liver injury and scarring did not change in a consistent way.",
        "interpretationNotes": "A substudy of the same trial as RETA-003, not an independent trial, and now read in full. Liver fat is an imaging measure; the liver-injury and fibrosis blood markers the article reports did not move consistently, and there was no biopsy.",
        "uncertaintyText": "No liver histology, no enrichment for fibrosis, type 2 diabetes excluded, no multiplicity control, and 48-week MRI missing for 56.1% of participants; the authors call the results hypothesis-generating. Whether this changes fibrosis or clinical liver outcomes is not addressed.",
        "retrace": {"sanyal-2024": ("full_text_supports", FULL_NATMED + " The abstract's figures match the Results.")},
        "addEvidence": [
            ev("sanyal-2024-p2038", "human_rct", "Liver-fat change at 24 and 48 weeks by group, estimated treatment differences, and proportions reaching normal liver fat.", "full_text_supports", FULL_NATMED),
            ev("sanyal-2024-p2043", "human_rct", "Biomarkers: K-18 and pro-C3 fell in some groups; mean ALT, AST, FIB-4 and ELF did not change consistently versus placebo; no hepatotoxicity signal.", "full_text_supports", FULL_NATMED),
            ev("sanyal-2024-p2046", "human_rct", "Stated limitations: small substudy, US and majority white, type 2 diabetes excluded, no histology, no enrichment for MASH or fibrosis, no multiplicity control, 48-week MRI missing for 56.1%; results hypothesis-generating.", "full_text_supports", FULL_NATMED, relationship="contextualizes"),
        ],
    },
}

NEW_CLAIMS = [
    {
        "claimKey": "RETA-009",
        "claimText": "In the 48-week obesity trial heart rate rose with retatrutide in a dose-dependent manner up to 24 weeks and declined thereafter; cardiac arrhythmia events (supraventricular arrhythmias and conduction disorders) were reported in 6% of retatrutide participants and 3% of placebo participants, mild to moderate except one severe prolonged-QT event in a participant also treated with ondansetron. Conference abstracts of the two phase 1 studies report heart-rate increases as well: dose-dependent after single injections in healthy participants, returning to near baseline by day 29, and over 12 weeks in type 2 diabetes within most retatrutide cohorts and with dulaglutide, but not with placebo.",
        "plainLanguageText": "Heart rate went up during the first half of the obesity trial and then came down. Short early studies also saw heart rate rise. Heart-rhythm events were uncommon and mostly mild.",
        "claimCategory": "safety-human",
        "importance": "high",
        "interpretationNotes": "Read in full from the trial report and its Table 3. The article compares the heart-rate increase with that reported for GLP-1 receptor agonists; that comparison is the authors' and is not tested here.",
        "uncertaintyText": "One trial of 48 weeks with 337 treated participants read in full. The phase 1 findings are conference abstracts, qualitative, with no size of change given. Heart-rate results for the phase 2 and phase 3 type 2 diabetes trials are not in any held document or in the registry's posted results.",
        "evidence": [
            ev("jastreboff-2023-p521", "human_rct", "Heart rate increased dose-dependently up to 24 weeks then declined; arrhythmias mild to moderate except one severe prolonged-QT event in a participant treated with ondansetron.", "full_text_supports", FULL_NEJM),
            ev("jastreboff-2023-p523", "human_rct", "Table 3 (continued): cardiac arrhythmia events in 19 of 337 retatrutide and 2 of 70 placebo participants.", "full_text_supports", FULL_NEJM + " Values read from Table 3."),
            ev("urva-2021-104or", "human_rct", "First-in-human single-ascending-dose study in 45 healthy participants: dose-dependent increases in heart rate that returned to near baseline by day 29.", "abstract_only", CONFERENCE),
            ev("urva-2022-340or", "human_rct", "Phase 1b multiple-ascending-dose study in 72 people with type 2 diabetes: by week 12, pulse and heart rate increased from baseline within most retatrutide cohorts and with dulaglutide, but not with placebo.", "abstract_only", CONFERENCE),
        ],
    },
    {
        "claimKey": "RETA-010",
        "claimText": "In the 48-week obesity trial the text reports cutaneous hyperaesthesia or skin-sensitivity adverse events in 7% of retatrutide participants and 1% of placebo participants, none severe or serious, none with overt skin findings and none leading to discontinuation; Table 3 lists hyperaesthesia or related events in 20 of 337 retatrutide participants (6%).",
        "plainLanguageText": "Some people taking retatrutide reported unusual skin sensitivity. None of these reactions was serious, and nobody stopped because of them.",
        "claimCategory": "safety-human",
        "importance": "medium",
        "interpretationNotes": "Recorded because it is an adverse event not usually associated with this drug class. The article's text and its table give slightly different percentages, and both are shown.",
        "uncertaintyText": "One trial; the underlying cause is not established, and the authors state only that the events did not appear related to the magnitude or rate of weight loss.",
        "evidence": [
            ev("jastreboff-2023-p521", "human_rct", "Cutaneous hyperaesthesia and skin-sensitivity events in 7% versus 1%; none severe, serious, with overt skin findings or leading to discontinuation.", "full_text_supports", FULL_NEJM),
            ev("jastreboff-2023-p523", "human_rct", "Table 3 (continued): hyperaesthesia or related adverse event in 20 (6%) retatrutide and 1 (1%) placebo participants.", "full_text_supports", FULL_NEJM + " The table's 6% differs from the text's 7%; both are recorded."),
        ],
    },
    {
        "claimKey": "RETA-011",
        "claimText": "In the 48-week obesity trial antidrug antibodies developed during treatment in 31 of 337 retatrutide participants (9%) and in 1 of 70 placebo participants, and hypersensitivity adverse events were reported in 9% and 3%; the article does not report whether antibodies affected response or safety.",
        "plainLanguageText": "About one in ten people on retatrutide developed antibodies against it. The trial report does not say whether that made a difference.",
        "claimCategory": "safety-human",
        "importance": "medium",
        "interpretationNotes": "Immunogenicity is expected for a peptide medicine and is measured in trials for that reason. What matters clinically — whether antibodies neutralise the drug or relate to hypersensitivity — is not reported in the held article.",
        "uncertaintyText": "Antibody data were unavailable for ten participants. The relationship between antibodies and pharmacokinetics or safety is planned in the protocols but not reported in any held document.",
        "evidence": [
            ev("jastreboff-2023-p523", "human_rct", "Table 3 (continued): antidrug antibodies during treatment and hypersensitivity events by group.", "full_text_supports", FULL_NEJM + " Values read from Table 3."),
        ],
    },
    {
        "claimKey": "RETA-012",
        "claimText": "Both phase 2 trials were designed, monitored and analysed by the developer, had no data monitoring committee, applied no adjustment for multiplicity, and took as their primary estimand the effect if treatment had been taken as intended. The type 2 diabetes trial's statistical analysis plan records that three interim analyses were planned after its protocol was approved, the third requested by the developer's senior management to support end-of-phase-2 interactions with regulators; the obesity trial's plan records a third interim analysis added on the same request, although its protocol stated that no interim analyses were planned.",
        "plainLanguageText": "Both phase 2 trials were run and analysed by the company developing the drug, and some analyses were added after the trials were planned. The trials' own planning documents say so.",
        "claimCategory": "study-design",
        "importance": "high",
        "interpretationNotes": "Read from the protocols and statistical analysis plans posted to the registry, and from the trial report's own description of the sponsor's role. These are ordinary features of developer-run phase 2 trials and are recorded as context for reading the results, not as a finding that anything was wrong. Adjudication committees for deaths and selected events existed; they are not data monitoring committees.",
        "uncertaintyText": "The held protocol and plan versions are final amendments approved after primary completion, so earlier versions cannot be compared. Nothing held shows that any analysis was changed in response to results.",
        "evidence": [
            ev("gzbd-protocol-p9", "human_rct", "Type 2 diabetes protocol synopsis: 'Data Monitoring Committee: No'.", "primary_source_is_cited", PLAN, relationship="contextualizes"),
            ev("gzbd-protocol-p65", "human_rct", "Type 2 diabetes protocol: superiority of each dose to placebo tested at two-sided 0.05; 'No adjustment for multiplicity will be performed'.", "primary_source_is_cited", PLAN, relationship="contextualizes"),
            ev("gzbd-sap-p12", "human_rct", "Type 2 diabetes plan: the primary 'efficacy estimand' handles treatment discontinuation and rescue medication by the hypothetical strategy.", "primary_source_is_cited", PLAN, relationship="contextualizes"),
            ev("gzbd-sap-p7", "human_rct", "Type 2 diabetes plan version history: the third interim analysis 'was requested by Lilly senior management to help support end of phase 2 interactions'.", "primary_source_is_cited", PLAN, relationship="contextualizes"),
            ev("gzbd-sap-p44", "human_rct", "Type 2 diabetes plan §4.8: three interim analyses; the first 'was planned after the approval of the protocol', and 'the second and third interim analyses were planned after the approval of the protocol and thus were not documented in the protocol'.", "primary_source_is_cited", PLAN, relationship="contextualizes"),
            ev("gzbf-protocol-p76", "human_rct", "Obesity protocol §9.5–9.6: 'No interim analyses are planned for this study'; an interim analysis may be added without a protocol amendment; data monitoring committee not applicable.", "primary_source_is_cited", PLAN, relationship="contextualizes"),
            ev("gzbf-sap-p8", "human_rct", "Obesity plan version 4.0 history: details of the third interim analysis added, 'requested by Lilly senior management to help support end of phase 2 interactions with regulatory agencies'.", "primary_source_is_cited", PLAN, relationship="contextualizes"),
            ev("jastreboff-2023-p515", "human_rct", "Obesity trial report: the sponsor designed and oversaw the trial and undertook site monitoring, data collation and data analysis.", "full_text_supports", FULL_NEJM, relationship="contextualizes"),
            ev("jastreboff-2023-p517", "human_rct", "Obesity trial report: efficacy estimand; no multiplicity adjustment, so confidence intervals should not be used to infer definitive treatment effects; site personnel remained unaware of assignments after the interim 24-week analyses.", "full_text_supports", FULL_NEJM, relationship="contextualizes"),
        ],
    },
    {
        "claimKey": "RETA-013",
        "claimText": "In a dual-energy X-ray absorptiometry substudy of the phase 2 type 2 diabetes trial (189 enrolled; 103 with baseline and week-36 scans), total fat mass fell by 4.9% in the lowest-dose retatrutide group and by 15.2% to 26.1% in the higher-dose groups, against 4.5% with placebo and 2.6% with dulaglutide; the authors state that the proportion of lean-mass loss to weight loss was similar to other obesity treatments.",
        "plainLanguageText": "In people with type 2 diabetes, body scans showed that much of the weight lost on retatrutide was fat. The researchers say the share of muscle and other lean tissue lost was similar to other weight-loss medicines, but the abstract does not give those figures.",
        "claimCategory": "efficacy-human",
        "importance": "medium",
        "interpretationNotes": "A substudy of the same trial as the type 2 diabetes results in RETA-004, not a separate trial, and developer-authored. The lean-mass comparison is the authors' statement, not a figure this index can check.",
        "uncertaintyText": "Abstract only: lean-mass values are not given, and only 103 of 189 substudy participants had both scans. No body-composition data are held for the obesity trials.",
        "evidence": [
            ev("coskun-2025", "human_rct", "Percent change in total fat mass at week 36 by group versus placebo and dulaglutide, and the authors' statement on the lean-mass proportion.", "abstract_only", ABSTRACT),
        ],
    },
    {
        "claimKey": "RETA-015",
        "claimText": "The adverse-event tables posted to the registry for the phase 2 type 2 diabetes trial list serious adverse events of acute pancreatitis in two participants, atrial fibrillation in one and chronic cholecystitis in one — all in retatrutide groups, none in the placebo or dulaglutide groups. Among events above the 5% reporting threshold, nausea, diarrhoea and decreased appetite were listed more often in the higher maintenance-dose retatrutide groups than in the lowest-dose group or with placebo; vomiting and constipation are also listed, without a consistent pattern across groups.",
        "plainLanguageText": "In the diabetes trial's own posted results, a few serious events such as inflammation of the pancreas and an irregular heart rhythm occurred in people taking retatrutide. Nausea, diarrhoea and loss of appetite were among the side effects listed most often.",
        "claimCategory": "safety-human",
        "importance": "high",
        "interpretationNotes": "Read from the sponsor's posted registry results because the trial article is held at abstract level only. Single serious events in groups of 23 to 47 participants cannot establish a rate or a cause, and the posting does not say whether investigators judged them related.",
        "uncertaintyText": "Non-serious events appear in the posting only above a 5% threshold, so a term's absence there is not evidence it did not occur. No heart-rate measurements or adverse events of special interest are posted; those remain a question for the article's full text.",
        "evidence": [
            ev("ctgov-nct04867785-ae", "human_rct", "Serious adverse events by term and group, and other adverse events above the 5% threshold by term and group, as posted.", "primary_source_is_cited", REGISTRY),
        ],
    },
    {
        "claimKey": "RETA-014",
        "claimText": "A post hoc analysis of both phase 2 trials reports reductions with retatrutide against placebo in non-HDL cholesterol, apolipoprotein B, triglyceride-rich lipoprotein particles and small LDL particles in both trials, and in high-sensitivity C-reactive protein and interleukin-6 in the obesity trial only.",
        "plainLanguageText": "In a later analysis of the two phase 2 trials, blood fats linked to heart disease fell, and markers of inflammation fell in people without diabetes.",
        "claimCategory": "efficacy-human",
        "importance": "medium",
        "interpretationNotes": "Biomarkers are surrogate measures, not cardiovascular events, and the analysis was post hoc and developer-authored. It adds context to the unresolved question of cardiovascular outcomes; it does not answer it.",
        "uncertaintyText": "Abstract only; post hoc; false-discovery-rate adjustment as stated in the abstract. Whether these changes translate into fewer cardiovascular events awaits the registered outcomes trial.",
        "evidence": [
            ev("ruotolo-2026", "human_rct", "Placebo-adjusted percentage changes in lipoprotein and inflammatory biomarkers in the two phase 2 trials.", "abstract_only", ABSTRACT),
        ],
    },
]

GAP_RESOLUTIONS = {
    0: ("open", "Checked 14 September 2026. The phase 2 registry results, protocols and plans, and a post hoc lipoprotein and inflammation analysis, were added; biomarkers are surrogate measures and the outcomes trial has not reported."),
    1: ("open", "Checked 14 September 2026. Every document added in this upgrade — publications, registry postings, protocols and plans — is authored, posted or funded by the developer."),
    2: ("open", "Checked 14 September 2026. Both phase 2 protocols specify once-weekly administration only; no held document studies another schedule."),
    3: ("open", "Checked 14 September 2026. The posted results cover the treatment period plus a four-week safety follow-up; no held document reports weight or metabolic measures after stopping."),
    4: ("open", "Checked 14 September 2026. Nothing in the new documents concerns products sold outside trials."),
    5: ("open", "Checked 14 September 2026. The registered eligibility criteria of both phase 2 trials exclude type 1 diabetes."),
    6: ("partially_resolved", "Checked 14 September 2026. A body-composition substudy of the phase 2 type 2 diabetes trial (SRC-132, abstract) reports fat-mass reductions by group and states that the lean-mass share of weight lost was similar to other obesity treatments. Lean-mass values need the full text, and no body-composition data are held for the obesity trials."),
    7: ("open", "Checked 14 September 2026. No head-to-head result is in any held document."),
}

NEW_GAPS = [
    {
        "gapType": "primary_source_missing",
        "statement": "Group-level safety detail for the phase 2 type 2 diabetes trial beyond the registry's adverse-event tables: heart rate, adverse events of special interest, and discontinuations for adverse events by group.",
        "why": "The article (Rosenstock et al., Lancet 2023) is held at abstract level. The registry posts serious and other adverse events and reasons for leaving the study, but not heart rate or adverse events of special interest; the protocol and plan show these were planned.",
        "whatWouldResolveIt": "The full text and appendix of Rosenstock et al., Lancet 2023 (FULL TEXT NOT HELD).",
    },
    {
        "gapType": "primary_source_missing",
        "statement": "Adverse events of special interest, heart rate and discontinuation detail for the phase 3 TRANSCEND-T2D-1 trial.",
        "why": "The article (Bajaj et al., Lancet 2026) is held at abstract level and the registry record has no posted results.",
        "whatWouldResolveIt": "The full text of Bajaj et al., Lancet 2026 (FULL TEXT NOT HELD), or results posted to NCT06354660.",
    },
    {
        "gapType": "primary_source_missing",
        "statement": "Pharmacokinetic parameters beyond the half-life, and the per-cohort safety detail, of the phase 1b trial.",
        "why": "The article (Urva et al., Lancet 2022) is held at abstract level and NCT04143802 has no posted results.",
        "whatWouldResolveIt": "The full text of Urva et al., Lancet 2022 (FULL TEXT NOT HELD).",
    },
    {
        "gapType": "primary_source_missing",
        "statement": "How much lean mass was lost with retatrutide in the type 2 diabetes body-composition substudy.",
        "why": "The abstract gives fat-mass changes and a qualitative statement about lean mass, but no lean-mass values.",
        "whatWouldResolveIt": "The full text of Coskun et al., Lancet Diabetes Endocrinol 2025.",
    },
    {
        "gapType": "conflicting_sources",
        "statement": "Why four 24-week body-weight group values in the obesity trial, and the 24-week placebo HbA1c value in the type 2 diabetes trial, differ slightly between the published articles and the registry's posted results.",
        "why": "Both describe the same outcome and a similar analysis population, and neither explains the difference. The obesity article's Supplementary Appendix, which holds its estimand analyses, was refused to this index by the publisher's site.",
        "whatWouldResolveIt": "The obesity trial's Supplementary Appendix (Tables S4–S5), the full text of Rosenstock et al. 2023, or a statement from the sponsor.",
    },
    {
        "gapType": "primary_source_missing",
        "statement": "Whether the first-in-human single-dose study reported in the discovery paper is the study registered as NCT03841630.",
        "why": "The registry record lists no publication and the discovery paper's abstract gives no registry number, so the link is plausible and unconfirmed; the two are not merged.",
        "whatWouldResolveIt": "The full text of Coskun et al., Cell Metab 2022.",
    },
]

NEW_FUNDING = [
    {
        "fundingKey": "FUND-SRC-050", "sourceKey": "SRC-050", "locationKey": "jastreboff-2023-p525",
        "funderKind": "industry", "sponsorName": "Eli Lilly and Company", "manufacturerInvolved": True,
        "institution": None, "grantReference": None, "disclosureText": "Supported by Eli Lilly.",
        "notes": "Full text read. The article also states that the sponsor designed and oversaw the trial, undertook site monitoring, data collation and data analysis, and that the first draft was written by the first author and the last author, a sponsor employee (p. 515). The authors' disclosure forms are published only at NEJM.org and were not obtained, so individual conflicts of interest are not recorded here. Recorded as context; nothing in this index scores a study by who paid for it.",
    },
    {
        "fundingKey": "FUND-SRC-126", "sourceKey": "SRC-126", "locationKey": "ctgov-nct04867785-record",
        "funderKind": "industry", "sponsorName": "Eli Lilly and Company", "manufacturerInvolved": True,
        "institution": None, "grantReference": None, "disclosureText": "Lead sponsor: Eli Lilly and Company (class: industry).",
        "notes": "Read from the registry record's sponsor module. The results posting is the sponsor's own submission.",
    },
    {
        "fundingKey": "FUND-SRC-129", "sourceKey": "SRC-129", "locationKey": "ctgov-nct04881760-record",
        "funderKind": "industry", "sponsorName": "Eli Lilly and Company", "manufacturerInvolved": True,
        "institution": None, "grantReference": None, "disclosureText": "Lead sponsor: Eli Lilly and Company (class: industry).",
        "notes": "Read from the registry record's sponsor module. The results posting is the sponsor's own submission.",
    },
    {
        "fundingKey": "FUND-SRC-132", "sourceKey": "SRC-132", "locationKey": "coskun-2025",
        "funderKind": "industry", "sponsorName": "Eli Lilly and Company", "manufacturerInvolved": True,
        "institution": None, "grantReference": None,
        "disclosureText": "The study was funded by Eli Lilly and Company. Declared interests: all seven authors are employees and shareholders of Eli Lilly and Company.",
        "notes": "Read from the PubMed record: the funding sentence in the abstract and the conflict-of-interest statement.",
    },
    {
        "fundingKey": "FUND-SRC-133", "sourceKey": "SRC-133", "locationKey": "ruotolo-2026",
        "funderKind": "industry", "sponsorName": "Eli Lilly and Company", "manufacturerInvolved": True,
        "institution": None, "grantReference": None,
        "disclosureText": "PubMed grant list: Eli Lilly and Company.",
        "notes": "What was read is the PubMed record's grant list, which names Eli Lilly and Company. The record carries no conflict-of-interest statement and the full text is not held, so individual conflicts of interest are not checked — which is not the same as none declared.",
    },
]


def upsert(items, item, key):
    for i, existing in enumerate(items):
        if existing[key] == item[key]:
            items[i] = item
            return
    items.append(item)


def main() -> None:
    packet = json.loads(PACKET.read_text(encoding="utf-8"))

    packet["note"] = (
        "Extracted 13 September 2026 and upgraded 14 September 2026. The clinical-development archetype: almost all human evidence comes from one developer's registered trial programme. "
        "The phase 2 obesity trial (SRC-050) and its MASLD substudy (SRC-051) are now read in full. For both phase 2 trials the registry records with posted results (SRC-126, SRC-129), the final protocols (SRC-127, SRC-130) and the statistical analysis plans (SRC-128, SRC-131) are held and read, and are kept as distinct sources because each answers a different question. "
        "The phase 1b, phase 2 type 2 diabetes and phase 3 articles (SRC-048, SRC-049, SRC-052) remain at abstract level — FULL TEXT NOT HELD — as do the discovery paper, the body-composition substudy and the post hoc biomarker analysis. Trials, and the differences between documents of one trial, are recorded in data/seed/trials/retatrutide-trials.json. "
        "Three practitioner sources sit alongside (SRC-003, SRC-004, SRC-005). Amounts appear only in protocol fields, which are practitioner-view only; claim text, plain-language text, gaps and positions describe dose groups without amounts, because patient payloads must not carry dosing merely because a component does not render it."
    )
    packet["compound"]["molecularDescription"] = (
        "A single synthetic peptide with agonist activity at the GIP, GLP-1 and glucagon receptors. The developer's trial protocols describe a linear peptide of 39 amino-acid residues conjugated to a C20 fatty acid moiety, and the obesity trial report describes the conjugate as a fatty diacid moiety. No held document states the sequence, so none is recorded here."
    )
    ps = packet["compound"]["practitionerSummary"]
    addition = " For both phase 2 trials this index holds the registry records with posted results, the final protocols and the statistical analysis plans alongside the articles; the obesity trial and its MASLD substudy are read in full, the others at abstract level."
    if addition.strip() not in ps:
        packet["compound"]["practitionerSummary"] = ps + addition

    for location in NEW_LOCATIONS:
        upsert(packet["locations"], location, "key")

    claims = {c["claimKey"]: c for c in packet["claims"]}
    for key, change in CLAIM_UPDATES.items():
        claim = claims[key]
        for field in ("claimText", "plainLanguageText", "interpretationNotes", "uncertaintyText"):
            if field in change:
                claim[field] = change[field]
        for location, (trace, note) in change.get("retrace", {}).items():
            for row in claim["evidence"]:
                if row["locationKey"] == location:
                    row["primaryTrace"] = trace
                    row["primaryTraceNote"] = note
        for row in change.get("addEvidence", []):
            upsert(claim["evidence"], row, "locationKey")
    for claim in NEW_CLAIMS:
        upsert(packet["claims"], claim, "claimKey")

    gaps = packet["notYetSupported"]
    for index, (state, note) in GAP_RESOLUTIONS.items():
        gaps[index]["resolution"] = {"state": state, "note": note, "checkedAt": CHECKED}
    for gap in NEW_GAPS:
        if not any(g["statement"] == gap["statement"] for g in gaps):
            gaps.append({**gap, "verificationIssueKey": None, "researchQuestion": None, "opportunityType": None,
                         "resolution": None})
    for g in gaps:
        if g["statement"].startswith("Group-level safety detail for the phase 2 type 2 diabetes trial"):
            g["resolution"] = {
                "state": "open",
                "checkedAt": CHECKED,
                "note": "Checked 14 September 2026 against the trial's wider evidence, since the article's full text is not held. The registry's posted serious events and events above the 5% threshold are now extracted (RETA-015). Heart rate, adverse events of special interest and discontinuations for adverse events by group are not posted anywhere held, so this remains open.",
            }

    for protocol in packet["protocols"]:
        if protocol["protocolKey"] == "RETA-PR-STUDY-PHASE2-OBESITY":
            protocol["locationKey"] = "jastreboff-2023-p515"
            protocol["titrationText"] = "Groups assigned 4 mg or more started at 2 mg or 4 mg with escalation every 4 weeks for up to 12 weeks: 4 mg from a 2 mg or 4 mg start; 8 mg from a 2 mg or 4 mg start; 12 mg from a 2 mg start."
            protocol["combinationsText"] = "All participants received a lifestyle intervention with regular counselling by a dietitian or qualified professional; the protocol did not require a specific energy deficit."
            protocol["monitoringText"] = "A 4-week safety follow-up followed the 48-week treatment period. Eight retatrutide participants whose BMI fell to 22 or lower had protocol-driven dose reductions (p. 520)."
            protocol["safetyNotes"] = "Adverse events led to discontinuation in 6–16% across retatrutide groups and in no placebo participants. Gastrointestinal events occurred mainly during escalation and were less frequent with a 2 mg than a 4 mg start. Heart rate rose dose-dependently to 24 weeks and declined thereafter."
            protocol["populationModel"] = "338 adults aged 18 to 75 with BMI 30 to 50, or 27 to under 30 with a weight-related condition, without diabetes, at US sites; enrolment managed for approximately equal numbers of women and men."

    for d in packet["disagreements"]:
        if d["disagreementKey"] == "RETA-D-003":
            d["explanationNotes"] = (
                "The book presents a mouse study comparison figure and draws a body-composition conclusion in the same passage about human use. "
                "Human body composition has since been reported at abstract level for the type 2 diabetes trial: fat mass fell substantially, and the authors state that the lean-mass share of weight lost was similar to other obesity treatments, which does not fit 'almost entirely fat'. "
                "Without the lean-mass values the human answer is recorded as partly characterised rather than settled."
            )
            d["resolutionRequirement"] = "Lean-mass values from the full text of the body-composition substudy (SRC-132), and body-composition data from the obesity trials."
            upsert(d["positions"], {
                "locationKey": "coskun-2025", "evidenceTypeKey": "human_rct",
                "positionText": "In people with type 2 diabetes, scans showed substantial fat-mass loss, and the authors state that the lean-mass proportion of weight lost was similar to other obesity treatments.",
            }, "locationKey")

    for r in packet["replication"]:
        if r["assessmentKey"] in ("RETA-REP-001", "RETA-REP-002", "RETA-REP-003"):
            tail = " Counted by trial, not by publication: the MASLD, body-composition and biomarker papers share participants with these trials and add none."
            if tail.strip() not in r["basis"]:
                r["basis"] += tail
        if r["assessmentKey"] == "RETA-REP-004" and "read in full" not in r["basis"]:
            r["basis"] = "One substudy of the phase 2 obesity trial, read in full."

    for row in NEW_FUNDING:
        upsert(packet["funding"], row, "fundingKey")
    for row in packet["funding"]:
        if row["fundingKey"] == "FUND-SRC-051":
            row["locationKey"] = "sanyal-2024-competing"
            row["notes"] = "Read in full from the article's competing-interests section; the declared interests are those also carried by the PubMed record. Recorded as context; nothing in this index scores a study by who paid for it."

    for identity in packet["identities"]:
        if identity["identityKey"] == "RETA-ID-001":
            identity["notes"] = "No held document states the sequence. The developer's protocols describe 39 residues conjugated to a C20 fatty acid moiety."

    PACKET.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"locations {len(packet['locations'])}, claims {len(packet['claims'])}, gaps {len(packet['notYetSupported'])}, funding {len(packet['funding'])}")


if __name__ == "__main__":
    main()
