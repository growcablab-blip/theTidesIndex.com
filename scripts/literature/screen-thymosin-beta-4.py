"""
Thymosin beta-4 and TB-500 literature screens.

Two screens, deliberately kept apart, because whether they are two screens or
one is exactly the question the sprint was run to answer. Transferring a record
from one ledger to the other would be the merge this platform must not make.

  TB-500            a census. 31 records, every one adjudicated by hand.
  Thymosin beta-4   stratified. The corpus is 1,112 records, which cannot be
                    hand-adjudicated and must not be rule-classified and
                    presented as though it had been. The human stratum — every
                    record carrying a trial, case-report, observational or
                    multicentre publication type, plus every record with the
                    Humans MeSH heading that also names the compound in its
                    title or abstract alongside an administration term — is
                    taken in full, and the rest of the universe is characterised
                    by counts only.

The asymmetry the screens exist to show:

  Thymosin beta-4   1,112 records, 7 randomised controlled trials
  TB-500               31 records, 0 studies in people, 8 false matches

    python scripts/literature/screen-thymosin-beta-4.py <dir> <outdir>

`dir` holds tb4_human_stratum.json, tb500_all.json and tb4_landscape.json as
written by the fetch step; the fetch queries are reproduced verbatim below.
"""
import io
import json
import re
import sys
from collections import Counter

SEARCH_DATE = '2026-09-13'
DATABASE = 'PubMed (NCBI E-utilities esearch/efetch, db=pubmed)'

TB4_QUERY = ('"thymosin beta 4"[All Fields] OR "thymosin beta-4"[All Fields] OR '
             '"Tbeta4"[All Fields] OR "T-beta-4"[All Fields] OR "Tbeta 4"[All Fields]')
TB500_QUERY = '"TB-500"[All Fields] OR "TB500"[All Fields] OR "TB 500"[All Fields]'

TB4_TOTAL = 1112
TB500_TOTAL = 31

TB4_STRATUM = (
    'Human stratum. Every record in the 1,112-record result set carrying a '
    'clinical trial, randomised controlled trial, controlled clinical trial, '
    'phase I/II/III, case report, observational study or multicentre study '
    'publication type; plus every record with the Humans MeSH heading that names '
    'the compound in its title or abstract alongside an administration term '
    '(administered, treatment, therapy, injection, eye drops, topical, placebo, '
    'volunteers, patients). 288 records. The remaining 824 are characterised by '
    'stratum counts and are not individually classified here — the ledger '
    'says what it read, and does not imply a reading it did not do.'
)

TB4_INCLUSION = (
    'Within the human stratum, a record is INCLUDED as evidence about Thymosin '
    'beta-4 when it reports original observations in which the compound was '
    'administered to people or animals, or applied to tissue or cells, or when '
    'it characterises the compound itself. Records that measure endogenous '
    'Thymosin beta-4 as a biomarker are EXCLUDED from the evidence set and kept '
    'in the ledger — this is the dominant confound for this compound, '
    'because it is a protein the human body already makes, so the MeSH heading '
    '"Humans" appears on 603 of the 1,112 records and almost none of them gave '
    'anybody anything.'
)

TB500_INCLUSION = (
    'A record is INCLUDED as evidence about TB-500 when it reports original '
    'observations in which the substance was administered or applied, or when it '
    'characterises what the substance is. Reviews, commentary and records that '
    'only mention the name are retained in the ledger and excluded from the '
    'evidence set. Eight records match the string "TB 500" while being about '
    'something else entirely — a feed additive, an antipsychotic price '
    'table, an arrhythmogenic dose, tuberculosis case counts, biochar, a plant '
    'extract, theobromine and an HIV survey — and are marked as false '
    'matches rather than quietly dropped, because they are 26% of the result '
    'count and the clearest possible demonstration that a search total is not a '
    'body of evidence.'
)

HUMAN_PRIMARY = (
    'A record counts as primary human evidence only when the named substance was '
    'administered to human beings and an outcome in those people was reported. '
    'Measuring the endogenous peptide in patients is not administration; '
    'pre-treating a patient’s own cells in a dish before returning them is '
    'not systemic administration and is classified separately; and a review '
    'asserting that trials happened is not a trial report.'
)

DEDUP = (
    'PubMed returns one record per PMID and none were removed. The two screens '
    'are NOT deduplicated against each other: eight records use both names, and '
    'which ledger each belongs to is the open question, so each appears in the '
    'screen whose query returned it.'
)

CATEGORIES = (
    'human_interventional', 'human_observational', 'case_report', 'human_pk_safety',
    'human_biomarker', 'animal_in_vivo', 'ex_vivo', 'in_vitro', 'analytical_method',
    'review', 'commentary_editorial', 'other_peripheral', 'false_match', 'withdrawn',
)

HUMAN_ADMINISTERED = {'human_interventional', 'human_observational', 'case_report'}
PRECLINICAL = {'animal_in_vivo', 'ex_vivo', 'in_vitro'}

# --- Hand adjudication: Thymosin beta-4 --------------------------------------
# pmid: (category, included, primary/secondary, certainty, country, group, reason)
TB4_MANUAL = {
    '34346165': (
        'human_interventional', True, 'primary', 'stated', 'China',
        'Beijing Shijitan Hospital, Capital Medical University',
        'First-in-human randomised, double-blind, placebo-controlled phase I of '
        'recombinant human thymosin beta-4 (NL005) by intravenous injection. '
        'Seven single-dose cohorts, 54 healthy subjects, 0.05–25.0 µg/kg, '
        'followed 28 days; three multiple-dose cohorts, 30 subjects, dosed daily '
        'for 10 days. Adverse events mild to moderate, no dose-limiting '
        'toxicities, no serious adverse events, dose-proportional exposure, no '
        'accumulation. The strongest human safety record for this compound, and '
        'it is Chinese — a register that ranked evidence by regulator would '
        'have missed it.',
    ),
    '20536472': (
        'human_interventional', True, 'primary', 'stated', 'United States',
        'ICON Development Solutions, San Antonio',
        'Randomised placebo-controlled single- and multiple-dose study of '
        'intravenous synthetic thymosin beta-4 in healthy volunteers. Four '
        'cohorts of 10, ascending doses 42–1260 mg, then the same daily for '
        '14 days. Adverse events infrequent and mild to moderate, no '
        'dose-limiting toxicity, dose-proportional single-dose PK with half-life '
        'increasing with dose. Independent of the 2021 Chinese study in group, '
        'country, decade and preparation — and five orders of magnitude '
        'apart in dose, which is a finding in itself.',
    ),
    '25826322': (
        'human_interventional', True, 'primary', 'stated', 'United States',
        'Kresge Eye Institute, Wayne State University',
        'Phase 2 multicentre randomised double-masked placebo-controlled trial of '
        'thymosin beta-4 eye drops (RGN-259, 0.1%) in severe dry eye, two US '
        'sites, 56 days with 28-day follow-up. Nine patients. Statistically '
        'significant improvement in ocular discomfort and corneal fluorescein '
        'staining at day 56. Randomised and controlled, and very small — '
        'both facts belong on the record.',
    ),
    '20536470': (
        'human_interventional', True, 'primary', 'stated', 'Italy and Poland',
        'Istituto Dermopatico dell’Immacolata, Rome',
        'Phase 2 double-blind placebo-controlled dose-escalation study of topical '
        'thymosin beta-4 in venous stasis ulcers, eight European sites (five '
        'Italian, three Polish), 73 patients randomised. Safety comparable to '
        'placebo across all doses; 0.03% suggested as potentially accelerating '
        'healing, with complete healing in about 25% within three months.',
    ),
    '17495250': (
        'human_interventional', True, 'primary', 'stated', 'Italy and Poland',
        'Istituto Dermopatico dell’Immacolata, Rome',
        'The design and interim report of the same European venous-ulcer '
        'programme as PMID 20536470, from the same group. Counted as a record and '
        'NOT as an independent replication: two reports of one programme are one '
        'programme.',
    ),
    '20457990': (
        'case_report', True, 'primary', 'stated', 'United States',
        'Wayne State University, Detroit',
        'Case reports of chronic non-healing neurotrophic corneal epithelial '
        'defects treated with thymosin beta-4. Uncontrolled by design. Overlaps '
        'in institution with the dry-eye trial, so the ocular evidence is not two '
        'independent lines.',
    ),
    '27288307': (
        'ex_vivo', True, 'primary', 'stated', 'China',
        'Sir Run Run Shaw Hospital, Zhejiang University',
        'Ten STEMI patients randomised to transplantation of autologous '
        'endothelial progenitor cells, with the experimental arm’s cells '
        'pre-treated with thymosin beta-4 in culture for 24 hours beforehand. The '
        'compound was applied to cells, not administered to the patients, so this '
        'is not human evidence for administering it — it is ex vivo work '
        'with a human clinical endpoint attached, which is a category the screen '
        'has to be able to express.',
    ),
    '34607232': (
        'human_biomarker', False, 'primary', 'stated', 'not stated',
        None,
        'Observational cohort associating endogenous plasma thymosin beta-4 with '
        'acute kidney injury and mortality in sepsis. Nobody was given anything. '
        'Excluded from the evidence set and kept in the ledger as the clearest '
        'example of the confound that dominates this corpus.',
    ),
    '26022762': (
        'human_biomarker', False, 'primary', 'stated', 'not stated', None,
        'Plasma thymosin beta-4 measured after intracardiac cell therapy in '
        'chronic ischaemic heart failure. A biomarker association; the '
        'intervention was cell therapy.',
    ),
    '27113968': (
        'human_biomarker', False, 'primary', 'stated', 'not stated', None,
        'Proteomic characterisation of renal matrix stones, in which thymosin '
        'beta-4 appears among the detected proteins. Nothing was administered.',
    ),
    '34318587': (
        'human_interventional', True, 'primary', 'stated', 'China',
        'Beijing Institute of Biotechnology',
        'Four-week treatment of 71 patients with seborrheic dermatitis using a '
        'recombinant human thymosin beta-4 gel (0.5 mg/mL) against 2% '
        'ketoconazole lotion, with 21 healthy controls, scored clinically '
        '(adherent scalp flaking, maximum erythema area) and physiologically '
        '(transepidermal water loss, hydration, sebum). Reports greater efficacy '
        'than the comparator and a sustained effect. An active-comparator human '
        'trial in a third indication, from a third country.',
    ),
    '34324435': (
        'human_observational', False, 'primary', 'uncertain', 'United States',
        'Institute for Hormonal Balance, Orlando',
        'The BPC-157 knee chart review, in which part of the cohort also received '
        '"thymosin beta-4" intra-articularly. EXCLUDED from this evidence set on '
        'identity grounds: the report names the peptide but gives no sequence, '
        'form or supplier, and practitioner use of the name is exactly what is '
        'in question here. It is also uncontrolled and co-administered, so no '
        'effect could be attributed to either peptide even if the identity were '
        'settled. Kept in the ledger because a reader will meet it.',
    ),
    '23050818': (
        'other_peripheral', False, 'secondary', 'stated', 'United States',
        'Medical City Children\'s Hospital, Dallas',
        'A published PROPOSAL for a pilot pharmacokinetic and safety trial of '
        'thymosin beta-4 and dexrazoxane in children under one year undergoing '
        'congenital heart surgery, followed by a randomised double-blind trial. '
        'A design, not a result. Recorded because whether it ever ran is a '
        'question this screen cannot answer and a reader should know to ask.',
    ),
    '2279297': (
        'ex_vivo', True, 'primary', 'contradicted', 'Japan', None,
        'Peripheral blood from lupus nephritis patients incubated with synthetic '
        '"thymosin beta Met9", a thymosin beta-4-LIKE peptide isolated from pork '
        'spleen. Human tissue, ex vivo, and a different molecule again: the '
        'thymosin beta family has several members and the literature compares '
        'them under adjacent names. Identity certainty is contradicted because '
        'the record is not about thymosin beta-4 itself.',
    ),
    '6335841': (
        'ex_vivo', True, 'primary', 'contradicted', 'Japan', None,
        'Synthesis of deacetyl-thymosin beta-4 and its effect on peripheral '
        'T-cell subsets in chronic renal failure. A deacetylated analogue, not '
        'the native peptide — the same distinction that separates TB-500 '
        'from thymosin beta-4, drawn here forty years earlier and in the opposite '
        'direction.',
    ),
    # The tail of the human stratum: records that reach it on a MeSH heading and
    # turn out to be cell biology, tissue chemistry or narrative review. Each is
    # adjudicated rather than left to a fallback, because a record sitting in a
    # fallback is a record nobody decided about.
    '37175330': ('in_vitro', True, 'primary', 'stated', 'South Korea', None,
                 'Hippocampal neuronal cells exposed to prion protein peptide, with '
                 'thymosin beta-4 as the intervention. Cell work.'),
    '23712052': ('in_vitro', True, 'primary', 'stated', None, None,
                 'Thymosin beta-4 applied to mesenchymal stem cells in culture to '
                 'test proliferation via an interleukin-8 mechanism.'),
    '18272284': ('in_vitro', True, 'primary', 'stated', 'South Korea', None,
                 'HIF-1 alpha stabilisation by thymosin beta-4 proteins, measured in '
                 'a tumour cell system.'),
    '17254567': ('in_vitro', True, 'primary', 'stated', 'United States', None,
                 'Thymosin beta-4 effect on NF-kappaB in a corneal cell model of '
                 'TNF-alpha-mediated inflammation.'),
    '8069940': ('in_vitro', True, 'primary', 'stated', None, None,
                'Actin polymerisation in human erythroleukemia cells after phorbol '
                'ester, in which thymosin beta-4 is one of the measured components.'),
    '2605693': ('in_vitro', True, 'primary', 'contradicted', 'Japan', None,
                'Synthesis of deacetyl-thymosin beta Xen4, an analogue of a Xenopus '
                'peptide. Another adjacent molecule under an adjacent name.'),
    '8765340': ('human_biomarker', False, 'primary', 'stated', None, None,
                'Concentrations of prothymosin alpha and thymosin beta-4 measured in '
                'forty-four thymic tumours and myasthenic thymus. Tissue chemistry, '
                'not administration.'),
    '34787867': ('review', False, 'secondary', 'stated', 'Italy', None,
                 'Narrative review of fetal programming and atherosclerosis in which '
                 'thymosin beta-4 appears among candidate mediators. No Review '
                 'publication type on the record, which is why the rules missed it.'),
    '17594730': ('other_peripheral', False, 'secondary', 'not_applicable', None, None,
                 'A respiratory-care review of mucolytics and expectorants. Thymosin '
                 'beta-4 appears in passing; the record is not about it.'),
    '8382915': (
        'false_match', False, 'secondary', 'uncertain', 'not stated', None,
        'A 1993 case report of malignant thymoma with T-cell lymphocytosis. It '
        'entered the stratum on a string match and is not about this compound.',
    ),
    '6087503': (
        'review', False, 'secondary', 'uncertain', 'United States', None,
        'A 1984 review of the thymosins. Its clinical trials are of thymosin '
        'fraction 5 and synthetic thymosin alpha-1, not beta-4; it records that '
        'beta-4 had by then been sequenced and synthesised. Retained because it '
        'is the earliest record here showing how easily "thymosin" collapses '
        'several different molecules — the same failure mode as TB-500, '
        'forty years earlier.',
    ),
}

# --- Hand adjudication: TB-500 ------------------------------------------------
TB500_MANUAL = {
    '22962027': (
        'analytical_method', True, 'primary', 'analytically_established', 'Italy',
        None,
        'THE identity record. High-resolution mass spectrometry of the TB-500 '
        'formulation identified the N-terminally acetylated 17–23 fragment '
        'of human thymosin beta-4, Ac-LKKTETQ; the fragment was then synthesised '
        'and an assay developed for plasma and urine. Seven residues, not '
        'forty-three. This is an analytical measurement of the substance itself, '
        'which is the only kind of evidence that can settle what a name refers '
        'to.',
    ),
    '23084823': (
        'analytical_method', True, 'primary', 'analytically_established',
        'Hong Kong', None,
        'Independent confirmation, in a different laboratory and a different '
        'matrix: "The key ingredient of TB-500 is the peptide LKKTETQ with '
        'artificial acetylation of the N-terminus", with a detection method for '
        'the parent and its metabolites in equine urine and plasma. States that '
        '17-LKKTETQ-23 is the actin-binding site within thymosin beta-4.',
    ),
    '38382158': (
        'animal_in_vivo', True, 'primary', 'analytically_established',
        'South Korea', None,
        'Quantification of TB-500 (Ac-LKKTETQ) and its metabolites in vitro and '
        'in rats. States plainly that "the biological effects of TB-500 have not '
        'been documented". Ac-LK was the main early metabolite and Ac-LKK '
        'persisted to 72 hours; of the metabolites tested only Ac-LKKTE showed '
        'wound-healing activity in fibroblasts.',
    ),
    '36482504': (
        'analytical_method', True, 'primary', 'stated', 'France', None,
        'Analysis of three misbranded products sold online, including TB500 and '
        'TB1000: "the content of TB500/TB1000 products is not systematically '
        'consistent with its former descriptions". The finding that keeps the '
        'identity question open in the only place it matters to a clinic — '
        'knowing what the name means does not tell you what is in the vial.',
    ),
    '42542926': (
        'animal_in_vivo', True, 'primary', 'contradicted', 'Türkiye', None,
        'Rat Achilles tendon transection model, 32 animals, four arms, '
        'intraperitoneal for four weeks. Reports higher load to failure and lower '
        'Bonar and Movin scores in the TB-500 arm. Identity certainty is recorded '
        'as CONTRADICTED: the title calls TB-500 "synthetic thymosin beta-4", '
        'which the analytical literature establishes it is not. A 2026 '
        'peer-reviewed paper making the conflation this index exists to prevent.',
    ),
    '41359360': (
        'in_vitro', True, 'primary', 'analytically_established', 'China', None,
        'An enzyme-responsive peptide hydrogel incorporating TB500, sequence '
        'given as LKKTETQ, for corneal repair; human corneal epithelial cells and '
        'stromal fibroblasts in vitro plus a rat alkali burn model. Independently '
        'states the seven-residue sequence, and is the first ocular application '
        'of the fragment.',
    ),
    '41443105': (
        'animal_in_vivo', True, 'primary', 'stated', 'not stated', None,
        'Thymosin beta-4-DERIVED peptides in cell models and 5xFAD mice for '
        'neuroinflammation and neurite atrophy. Fragment work rather than '
        'full-length, which is why it sits in this ledger.',
    ),
    '27569051': (
        'in_vitro', True, 'primary', 'stated', 'Russia', None,
        'In vitro metabolism of synthetic doping peptides including TB-500 across '
        'proteolytic enzymes, human serum, liver and kidney microsomes and liver '
        'S9. Notes that in vivo studies with human volunteers are limited '
        'precisely because these peptides are not approved for human '
        'consumption — the reason the human column here is empty.',
    ),
    '35730516': ('false_match', False, 'secondary', 'not_applicable', 'Türkiye', None,
                 'An antipsychotic cost table in which "tb 500-1,000" is a tablet dose range.'),
    '33318598': ('false_match', False, 'secondary', 'not_applicable', 'Pakistan', None,
                 'Tuberculosis incidence: "500 had TB and 300 did not".'),
    '31791503': ('false_match', False, 'secondary', 'not_applicable', 'not stated', None,
                 'Tobacco biochar and trace-element stabilisation in contaminated soils.'),
    '20726336': ('false_match', False, 'secondary', 'not_applicable', 'India', None,
                 'Hydroalcoholic extract of Trapa bispinosa fruits in a rat brain model.'),
    '8837245': ('false_match', False, 'secondary', 'not_applicable', 'not stated', None,
                'Elimination of theobromine metabolites in healthy adults.'),
    '12290626': ('false_match', False, 'secondary', 'not_applicable', 'Guatemala', None,
                 'A 1992 Spanish-language HIV survey.'),
    '1977520': ('false_match', False, 'secondary', 'not_applicable', 'not stated', None,
                'Sympathomimetic amines and cardiac arrhythmias: "Tb 500" is an '
                'arrhythmogenic dose in micrograms.'),
    '40681595': ('false_match', False, 'secondary', 'not_applicable', 'not stated', None,
                 'Broiler chicken feed trial in which TB-500 is a tributyrin '
                 'supplement code.'),
}

ANALYTICAL = re.compile(
    r'\b(mass spectrom|LC[-/]MS|UHPLC|HPLC|doping control|solid.phase extraction|'
    r'screening method|detection|quantification|assay|chromatograph)\b', re.I)
ANIMAL = re.compile(
    r'\b(rats?|mice|mouse|murine|rabbits?|canine|porcine|equine|horses?|zebrafish|'
    r'in vivo|swine|chick)\b', re.I)
IN_VITRO = re.compile(
    r'\b(in vitro|cell (line|culture)|cultured|fibroblast|HUVEC|keratinocyte|'
    r'transfect|knockdown|siRNA|western blot|in silico|molecular docking)\b', re.I)
EX_VIVO = re.compile(r'\b(ex vivo|isolated (organ|tissue|artery|aorta)|organ bath)\b', re.I)
BIOMARKER = re.compile(
    r'\b(serum|plasma|expression|overexpress|proteomic|prognos|biomarker|'
    r'methylation|immunohistochem|correlat|associated with|levels? (of|in|after)|'
    r'marker|profiling|MALDI|signature|abundance|predicts?)\b', re.I)


def classify(rec, manual):
    pmid = rec['pmid']
    if pmid in manual:
        cat, inc, prim, cert, country, group, reason = manual[pmid]
        return cat, inc, prim, cert, country, group, reason, 'manual'

    types = set(rec['ptypes'])
    mesh = set(rec['mesh'])
    tiab = rec['title'] + ' ' + rec['abstract']
    country = country_of(rec)

    if 'Retracted Publication' in types:
        return ('withdrawn', False, 'primary', 'stated', country, None,
                'Retracted or withdrawn publication type.', 'rule')
    if types & {'Editorial', 'Comment', 'Letter'}:
        return ('commentary_editorial', False, 'secondary', 'stated', country, None,
                'PubMed publication type is editorial, comment or letter.', 'rule')
    if 'Review' in types:
        return ('review', False, 'secondary', 'stated', country, None,
                'PubMed publication type is review. Retained in the ledger, '
                'excluded from the evidence set.', 'rule')
    if ANALYTICAL.search(tiab) and not ANIMAL.search(tiab):
        return ('analytical_method', True, 'primary', 'stated', country, None,
                'An analytical or doping-control method. It characterises the '
                'substance or detects it in a matrix; it says nothing about '
                'effect.', 'rule')
    if ANIMAL.search(tiab) or mesh & {'Animals', 'Rats', 'Mice', 'Horses'}:
        return ('animal_in_vivo', True, 'primary', 'stated', country, None,
                'Animal model named in the record.', 'rule')
    if EX_VIVO.search(tiab):
        return ('ex_vivo', True, 'primary', 'stated', country, None,
                'Isolated tissue or organ preparation.', 'rule')
    # Tested before the in vitro rule, deliberately. An expression study in
    # patient tissue uses cell-biology methods and is not cell-biology work: it
    # measures the endogenous peptide in people. Ordering the rules the other way
    # filed most of this corpus as "in vitro", which is the wrong answer to the
    # question a reader is asking.
    if 'Humans' in mesh and BIOMARKER.search(tiab):
        return ('human_biomarker', False, 'primary', 'stated', country, None,
                'The endogenous peptide measured, profiled or correlated in '
                'people rather than administered to them. The dominant confound '
                'in this corpus: thymosin beta-4 is a protein the human body '
                'already makes, so 603 of the 1,112 records carry the MeSH '
                'heading "Humans" and almost none of them gave anybody anything.',
                'rule')
    if IN_VITRO.search(tiab):
        return ('in_vitro', True, 'primary', 'stated', country, None,
                'Cell, culture or computational work only.', 'rule')
    return ('other_peripheral', False, 'primary', 'uncertain', country, None,
            'No model or design could be read from the record.', 'rule')


COUNTRIES = [
    ('China', re.compile(r'\bChina\b|\bP\.?R\.? China\b|Hong Kong|Taiwan', re.I)),
    ('United States', re.compile(r'\bUSA\b|United States|\b[A-Z]{2}\s*\d{5}\b', re.I)),
    ('South Korea', re.compile(r'\bKorea\b', re.I)),
    ('Japan', re.compile(r'\bJapan\b', re.I)),
    ('Germany', re.compile(r'\bGermany\b', re.I)),
    ('Italy', re.compile(r'\bItaly\b|\bItalia\b', re.I)),
    ('Poland', re.compile(r'\bPoland\b', re.I)),
    ('United Kingdom', re.compile(r'United Kingdom|\bEngland\b|\bScotland\b|\bUK\b', re.I)),
    ('Russia', re.compile(r'\bRussia\b', re.I)),
    ('India', re.compile(r'\bIndia\b', re.I)),
    ('Canada', re.compile(r'\bCanada\b', re.I)),
    ('Australia', re.compile(r'\bAustralia\b', re.I)),
    ('Türkiye', re.compile(r'\bTurkey\b|\bTürkiye\b', re.I)),
    ('France', re.compile(r'\bFrance\b', re.I)),
    ('Spain', re.compile(r'\bSpain\b', re.I)),
]


def country_of(rec):
    blob = ' '.join(rec.get('affiliations') or [])
    for name, pattern in COUNTRIES:
        if pattern.search(blob):
            return name
    return None


def build(recs, manual, key, peptide_key, query, total, inclusion, stratum, notes):
    rows = []
    for r in sorted(recs, key=lambda x: (-int(x['year'] or 0), x['pmid'])):
        cat, inc, prim, cert, country, group, reason, how = classify(r, manual)
        assert cat in CATEGORIES, cat
        rows.append({
            'pmid': r['pmid'],
            'title': r['title'],
            'year': r['year'],
            'journal': r['journal'],
            'publicationTypes': r['ptypes'],
            'studyType': cat,
            'evidenceClass': (
                'human' if cat in HUMAN_ADMINISTERED or cat in ('human_pk_safety', 'human_biomarker')
                else 'preclinical' if cat in PRECLINICAL
                else 'not_evidence'),
            'included': inc,
            'primaryOrSecondary': prim,
            'peptideIdentityCertainty': cert,
            'fullTextStatus': 'abstract_only',
            'classifiedBy': how,
            'reason': reason,
            'country': country,
            'language': r.get('lang') or None,
            'researchGroup': group,
        })

    unadjudicated = [r['pmid'] for r in rows
                     if r['classifiedBy'] == 'rule'
                     and r['peptideIdentityCertainty'] == 'uncertain']
    if unadjudicated:
        raise SystemExit(f'{key}: unadjudicated records: ' + ', '.join(unadjudicated))

    return {
        'screenKey': key,
        'peptideKey': peptide_key,
        'database': DATABASE,
        'query': query,
        'searchDate': SEARCH_DATE,
        'resultCount': total,
        'screenedCount': len(rows),
        'stratum': stratum,
        'deduplication': DEDUP,
        'inclusionCriteria': inclusion,
        'humanPrimaryCriteria': HUMAN_PRIMARY,
        'notes': notes,
        'records': rows,
    }


def report(screen):
    rows = screen['records']
    counts = Counter(r['studyType'] for r in rows)
    print(f"\n{screen['screenKey']}  "
          f"{screen['resultCount']} returned, {screen['screenedCount']} classified\n")
    for k in CATEGORIES:
        if counts[k]:
            print(f'  {counts[k]:4d}  {k}')
    people = sum(1 for r in rows if r['studyType'] in HUMAN_ADMINISTERED and r['included'])
    print(f'\n  studies in people:  {people}')
    print(f'  hand-adjudicated:   {sum(1 for r in rows if r["classifiedBy"] == "manual")}')
    countries = Counter(r['country'] for r in rows if r['country'])
    print(f'  countries seen:     {dict(countries.most_common(6))}')


if __name__ == '__main__':
    src, dest = sys.argv[1], sys.argv[2]
    landscape = json.load(io.open(f'{src}/tb4_landscape.json', encoding='utf8'))

    tb4 = build(
        json.load(io.open(f'{src}/tb4_human_stratum.json', encoding='utf8')),
        TB4_MANUAL, 'thymosin-beta-4-pubmed-2026-09', 'thymosin-beta-4',
        TB4_QUERY, TB4_TOTAL, TB4_INCLUSION, TB4_STRATUM,
        'Universe strata, counted rather than classified: '
        + ', '.join(f'{k} {v}' for k, v in landscape['strata'].items() if k != 'non_english')
        + '. Affiliation counts by country: '
        + ', '.join(f'{k} {v}' for k, v in landscape['countries'].items())
        + '. Country counts overlap, because a multicentre paper has several.',
    )
    tb500 = build(
        json.load(io.open(f'{src}/tb500_all.json', encoding='utf8')),
        TB500_MANUAL, 'tb-500-pubmed-2026-09', 'tb-500',
        TB500_QUERY, TB500_TOTAL, TB500_INCLUSION, None,
        'A census: every record the query returned is classified here.',
    )

    for screen, name in ((tb4, 'thymosin-beta-4-screen.json'), (tb500, 'tb-500-screen.json')):
        io.open(f'{dest}/{name}', 'w', encoding='utf8', newline='\n').write(
            json.dumps(screen, indent=2, ensure_ascii=False) + '\n')
        report(screen)
