"""
Classifies every PubMed record for MOTS-c into the literature screen ledger.

    python scripts/literature/fetch-pubmed.py "<QUERY below>" <dir>
    python scripts/literature/screen-mots-c.py <dir>/records.json

Output: data/seed/literature/mots-c-screen.json

A census. MOTS-c is the clearest example in this index of an evidence ladder
with a missing top rung: a discovery in cells and mice, a large mouse
literature, and a large human literature that MEASURES the body's own MOTS-c
in blood or muscle — and, in the records screened, no study that GIVES MOTS-c
to a person. The rules are built to keep those rungs apart:

  - A human record that measures endogenous MOTS-c, including after exercise,
    heat or a drug, is human_biomarker. It is not evidence about injecting it.
  - A human record counts as interventional only if MOTS-c itself was
    administered. None was found; MANUAL would say so if one were.
  - Analogues (cell-penetrating MOTS-c, oral conjugates) are recorded as
    animal or in vitro work about a different molecule, and say so.

Rules classify from publication type, MeSH and title/abstract wording; the
records the rest of the index cites are adjudicated in MANUAL.
"""
import json
import re
import sys

QUERY = '"MOTS-c"[tiab] OR "MOTSc"[tiab] OR "MOTS c"[tiab] OR "mitochondrial open reading frame of the 12S rRNA-c"[tiab]'
SEARCH_DATE = '2026-09-13'

HUMAN = ('human', True)
PRE = ('preclinical', True)
NOT = ('not_evidence', False)

MANUAL = {
    '25738459': ('animal_in_vivo', PRE, 'Discovery paper: the 16-residue peptide in the 12S rRNA, folate-cycle and AMPK mechanism in cells, and MOTS-c treatment preventing diet-induced and age-dependent insulin resistance and diet-induced obesity in mice. USA.'),
    '33473109': ('animal_in_vivo', PRE, 'MOTS-c treatment improved physical performance in young, middle-aged and old mice, including late-life intermittent treatment; in humans, exercise raised endogenous MOTS-c in muscle and plasma. USA.'),
    '31293078': ('animal_in_vivo', PRE, 'Plasma metabolomics in diet-induced obese mice injected with MOTS-c. USA.'),
    '33861582': ('animal_in_vivo', PRE, 'MOTS-c on memory in mice; peripherally administered MOTS-c did not cross the blood-brain barrier; a cell-penetrating analogue (a different molecule) was developed. China.'),
    '36528071': ('animal_in_vivo', PRE, 'Mouse colitis: intraperitoneal MOTS-c helped, oral MOTS-c did not; an oral cell-penetrating analogue (a different molecule) was developed. China.'),
    '26289118': ('human_biomarker', HUMAN, 'Hypothesis that the Northeast Asian m.1382A>C polymorphism in the MOTS-c coding region relates to Japanese longevity. Genetic association, no administration. Japan.'),
    '29593067': ('human_biomarker', HUMAN, 'Plasma MOTS-c associated with insulin sensitivity in lean but not obese individuals. Endogenous levels. Chile.'),
    '30394592': ('analytical_method', PRE, 'LC-MS detection of MOTS-c in plasma for doping control, compared with a commercial ELISA; stability and in vitro metabolism. Germany.'),
    '34351816': ('human_biomarker', HUMAN, 'Randomised acute exercise study measuring endogenous plasma MOTS-c and humanin; MOTS-c showed only a trend after endurance exercise. Sweden.'),
    '34413391': ('human_biomarker', HUMAN, 'Secondary analysis of a randomised 16-week exercise trial in breast cancer survivors; endogenous MOTS-c rose in non-Hispanic White but not Hispanic women. USA.'),
    '36490309': ('human_biomarker', HUMAN, 'Circulating MOTS-c in a randomised trial of metformin with neoadjuvant therapy for breast cancer; no change. Spain.'),
    '40674654': ('human_biomarker', HUMAN, 'Randomised heat-stress study during immobilisation; endogenous circulating MOTS-c rose with heat. Belgium.'),
    '40008510': ('human_biomarker', HUMAN, 'Observational study of diabetes drugs; endogenous MOTS-c improved with SGLT-2 inhibitors. Greece.'),
    '32052315': ('human_biomarker', HUMAN, 'Low MOTS-c predicted adverse cardiac events in revascularised type 2 diabetics. Greece.'),
    '39111290': ('human_biomarker', HUMAN, 'Higher MOTS-c associated with death and cardiovascular events in haemodialysis patients. Italy.'),
    '38314601': ('human_biomarker', HUMAN, 'Serum MOTS-c before and after radiotherapy in lung and breast cancer. Turkey.'),
    '36786072': ('animal_in_vivo', PRE, 'LPS-induced septic cardiomyopathy model with MOTS-c treatment, measuring cardiomyocyte and circulating injury markers; the species is not named in the abstract. Adjudicated as in vivo experimental work, not a human study.'),
    '39961901': ('in_vitro', PRE, 'MOTS-c on retinal pigment epithelial cells and patient-derived cybrid cells. Cells, not patients. USA.'),
    '35770405': ('review', NOT, 'Narrative review of exerkines.'),
    '37437978': ('review', NOT, 'Narrative review of mitochondria-derived peptides.'),
    '30104535': ('commentary_editorial', NOT, 'Short commentary on nuclear signalling by MOTS-c.'),
    '31131297': ('commentary_editorial', NOT, 'Short perspective on nuclear transcriptional regulation by MOTS-c; no new data in the abstract.'),
    '24463180': ('false_match', NOT, 'Combinatorial therapy discovery by mixed integer linear programming; MOTS is an unrelated acronym.'),
    '35834544': ('false_match', NOT, 'Digital biomarkers for addiction monitoring; MOTS is an unrelated acronym.'),
}

ANIMAL = re.compile(r'\b(mice|mouse|murine|rats?|rodents?|zebrafish|C\. elegans|Caenorhabditis|drosophila|pigs?|piglets?|rabbits?|ewes?|sheep|cattle|chickens?|hamsters?)\b', re.I)
CELLS = re.compile(r'\b(cells?|cell line|in vitro|cultured|myotubes|organoids?|HEK293|C2C12|3T3-L1|fibroblasts|macrophages)\b', re.I)
HUMANS = re.compile(r'\b(patients?|participants|volunteers|subjects|women|men|children|adolescents|individuals|cohort|serum|plasma levels?|circulating)\b', re.I)
NAMED = re.compile(r'MOTS-?c|MOTSc|mitochondrial open reading frame of the 12S', re.I)
ADMIN_HUMAN = re.compile(r'(administered|injected|given|treated with)\s+(synthetic\s+)?MOTS-?c\s+(to|in)\s+(healthy\s+)?(humans|participants|volunteers|patients)', re.I)
COUNTRIES = ['USA', 'United States', 'China', 'Japan', 'Korea', 'Germany', 'United Kingdom', 'UK', 'France', 'Italy', 'Spain',
             'Poland', 'India', 'Brazil', 'Canada', 'Australia', 'Iran', 'Taiwan', 'Russia', 'Turkey', 'Türkiye', 'Greece',
             'Sweden', 'Denmark', 'Belgium', 'Netherlands', 'Switzerland', 'Chile', 'Mexico', 'Egypt', 'Saudi Arabia', 'Israel',
             'Czech', 'Austria', 'Portugal', 'Finland', 'Norway', 'Ireland', 'Singapore', 'Thailand', 'Pakistan', 'Iraq']
NORMAL = {'United States': 'USA', 'UK': 'United Kingdom', 'Türkiye': 'Turkey'}


def country(aff: str) -> str:
    hits = [(aff.rfind(c), c) for c in COUNTRIES if re.search(r'\b' + re.escape(c) + r'\b', aff)]
    if not hits:
        if re.search(r', CA\b|, NY\b|, MA\b|, TX\b|California|Los Angeles', aff):
            return 'USA'
        return 'not stated'
    return NORMAL.get(max(hits)[1], max(hits)[1])


def rule(x):
    pt = set(x['pubtypes'])
    mesh = set(x['mesh'])
    # Some records spell the name with a non-breaking hyphen (U+2011).
    blob = (x['title'] + ' ' + x['abstract']).replace('‑', '-').replace('‐', '-')
    if pt & {'Review', 'Systematic Review', 'Meta-Analysis'}:
        return ('review', NOT, 'Review by publication type.')
    if pt & {'Published Erratum'}:
        return ('other_peripheral', NOT, 'Erratum.')
    if pt & {'Editorial', 'Comment', 'Letter'}:
        return ('commentary_editorial', NOT, 'Editorial, comment or letter by publication type.')
    if not NAMED.search(blob):
        return ('other_peripheral', NOT, 'MOTS-c is not named in the title or abstract.')
    if ADMIN_HUMAN.search(blob):
        return None  # would be human administration: must be adjudicated by hand
    animal = 'Animals' in mesh or bool(ANIMAL.search(blob))
    human = bool(HUMANS.search(blob)) or bool(re.search(r'(athletes|pregnant|diabetes subjects|polymorphism)', blob, re.I))
    if animal:
        return ('animal_in_vivo', PRE, 'Animal work, by MeSH or species named. Any MOTS-c given was given to animals.')
    if human:
        return ('human_biomarker', HUMAN, 'Human study measuring endogenous MOTS-c (blood, muscle or tissue) or a related genetic variant. No MOTS-c was administered to people.')
    if CELLS.search(blob) or 'Humans' in mesh:
        return ('in_vitro', PRE, 'Cell or tissue work in the laboratory, by title and abstract.')
    return ('other_peripheral', NOT, 'Not classifiable as original MOTS-c research from the title and abstract.')


def main(path: str) -> None:
    records = json.load(open(path, encoding='utf-8'))
    out, missing = [], []
    for pmid, x in records.items():
        decided, by = MANUAL.get(pmid), 'manual'
        if decided is None:
            decided, by = rule(x), 'rule'
        if decided is None:
            missing.append(pmid)
            continue
        study, (klass, included), reason = decided
        out.append({
            'pmid': pmid, 'title': x['title'] or '[no title]', 'year': x['year'], 'journal': x['journal'],
            'publicationTypes': x['pubtypes'], 'studyType': study, 'evidenceClass': klass, 'included': included,
            'primaryOrSecondary': 'secondary' if study in ('review', 'commentary_editorial') else 'primary',
            'peptideIdentityCertainty': 'endogenous peptide measured' if study == 'human_biomarker' else 'stated',
            'fullTextStatus': 'abstract_only' if x['abstract'] else 'no_abstract', 'classifiedBy': by, 'reason': reason,
            'country': country(x['affiliation']), 'language': x['language'] or None, 'researchGroup': None,
        })
    if missing:
        sys.exit(f'Possible human administration records need adjudication: {", ".join(missing)}')
    out.sort(key=lambda r: (r['year'], r['pmid']))
    counts = {}
    for r in out:
        counts[r['studyType']] = counts.get(r['studyType'], 0) + 1
    screen = {
        'screenKey': 'mots-c-pubmed-2026-09',
        'peptideKey': 'mots-c',
        'database': 'PubMed (NCBI E-utilities esearch/efetch, db=pubmed)',
        'query': QUERY,
        'searchDate': SEARCH_DATE,
        'resultCount': len(out),
        'screenedCount': len(out),
        'stratum': None,
        'deduplication': 'One record per PMID; none removed.',
        'inclusionCriteria': 'INCLUDED when MOTS-c (or a stated analogue, marked as such) was administered to animals, tissue or cells, when a human study measured endogenous MOTS-c or a MOTS-c genetic variant, or when a record characterises how MOTS-c is measured. Reviews, commentary, errata, false matches on the acronym and records not naming the peptide are retained and excluded.',
        'humanPrimaryCriteria': 'Primary human evidence of administration requires MOTS-c itself to have been given to people with an outcome measured. Measuring the body\'s own MOTS-c, including after exercise, heat or other drugs, is recorded as human_biomarker and is not evidence about administering the peptide.',
        'notes': 'A census of ' + str(len(out)) + ' records. Study types: ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())) + '. No record of MOTS-c administered to a human was identified; every human record measures endogenous MOTS-c or a genetic variant. Human associations run in both directions: low MOTS-c predicted cardiac events in diabetics, high MOTS-c predicted death and cardiovascular events in haemodialysis patients.',
        'records': out,
    }
    with open('data/seed/literature/mots-c-screen.json', 'w', encoding='utf-8', newline='\n') as f:
        json.dump(screen, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(json.dumps(counts, indent=1))


if __name__ == '__main__':
    main(sys.argv[1])
