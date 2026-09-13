"""
Classifies every PubMed record for retatrutide into the literature screen ledger.

    python scripts/literature/screen-retatrutide.py <records.json>

`records.json` is the efetch output (title, abstract, publication types, MeSH,
first affiliation, language) for the query below, fetched on the search date.
Output: data/seed/literature/retatrutide-screen.json

A census: every record the query returned is classified. Rules settle what the
publication type and MeSH make unambiguous; everything else is adjudicated by
hand in MANUAL, with a reason. The script refuses to write if any record is left
unclassified, so a new record in a re-run cannot slip through on a default.
"""
import json
import re
import sys

QUERY = 'retatrutide[tiab] OR LY3437943[tiab]'
SEARCH_DATE = '2026-09-13'
TRIAL = {'Clinical Trial', 'Randomized Controlled Trial', 'Clinical Trial, Phase I',
         'Clinical Trial, Phase II', 'Clinical Trial, Phase III'}
NAMED = re.compile(r'retatrutide|LY3437943', re.I)

HUMAN = ('human', True)
PRE = ('preclinical', True)
NOT = ('not_evidence', False)

# pmid -> (studyType, (evidenceClass, included), reason)
MANUAL = {
    # --- Human records -------------------------------------------------------
    '36354040': ('human_interventional', HUMAN, 'Phase 1b multiple-ascending-dose RCT in type 2 diabetes, four US centres, 12 weeks, once-weekly subcutaneous (NCT04143802). Sponsor-affiliated authors.'),
    '37385280': ('human_interventional', HUMAN, 'Phase 2 RCT in type 2 diabetes, 42 US centres, placebo and dulaglutide controlled, 36 weeks (NCT04867785).'),
    '37366315': ('human_interventional', HUMAN, 'Phase 2 RCT in obesity or overweight, 48 weeks, six dose arms and placebo (NCT04881760).'),
    '42250575': ('human_interventional', HUMAN, 'Phase 3 RCT, TRANSCEND-T2D-1: monotherapy in type 2 diabetes, 48 sites in the USA, Mexico and India, 40 weeks (NCT06354660).'),
    '38858523': ('human_interventional', HUMAN, 'Substudy of the phase 2 obesity trial (NCT04881760): liver fat in participants with MASLD. Same participants and programme, not an independent trial.'),
    '40609566': ('human_interventional', HUMAN, 'Body-composition substudy of the phase 2 type 2 diabetes trial (NCT04867785). Same programme.'),
    '40916752': ('human_interventional', HUMAN, 'Prespecified exploratory appetite analysis of the phase 2 type 2 diabetes trial (NCT04867785). Same programme.'),
    '40726454': ('human_interventional', HUMAN, 'Post hoc lipid-biomarker analysis of both phase 2 trials, with an in vitro hepatocyte arm. Same programme.'),
    '40630318': ('human_interventional', HUMAN, 'Post hoc kidney-parameter analysis of phase 2 participants with type 2 diabetes and/or obesity. Same programme.'),
    '42135195': ('human_interventional', HUMAN, 'Post hoc metabolome and lipidome analysis of the phase 2 trials. Same programme.'),
    '42608321': ('human_interventional', HUMAN, 'Post hoc cardiovascular-biomarker analysis of the phase 2 trials. Same programme.'),
    '41216380': ('human_observational', HUMAN, 'Qualitative exit interviews with 40 participants leaving the phase 2 obesity trial (NCT04881760). Perceptions, not outcomes.'),
    '35985340': ('human_pk_safety', HUMAN, 'Discovery paper: receptor pharmacology in vitro, obese mice, and a phase 1 single-ascending-dose study in people supporting once-weekly dosing. The human part is the first-in-human study.'),
    '42669023': ('case_report', HUMAN, 'Case report, Edinburgh: a man with type 1 diabetes developed ketonaemia and acute kidney injury after self-administering an online-purchased product marketed as retatrutide, with concurrent Shigella infection. Product identity not established.'),
    # --- Preclinical -------------------------------------------------------
    '37178114': ('in_vitro', PRE, 'Laboratory protocol: differentiated human subcutaneous adipocytes and lipolysis with GIP or LY3437943.'),
    '40613938': ('ex_vivo', PRE, 'Isolated human atrial tissue preparations: inotropic effects. Tissue, not a person.'),
    '39868848': ('animal_in_vivo', PRE, 'Obesity-associated triple-negative breast cancer: multiomic analysis, cell and mouse models.'),
    '40094000': ('animal_in_vivo', PRE, 'Preclinical obesity-associated cancer models in mice.'),
    '41964043': ('animal_in_vivo', PRE, 'Multi-omic profiling of adipose tissue fibrosis in an animal model.'),
    '42630988': ('animal_in_vivo', PRE, 'Renal fibrosis in unilateral ureteral obstruction and aged mice, compared with semaglutide and tirzepatide.'),
    '42603384': ('analytical_method', PRE, 'Validated LC-HRMS method identifying and quantifying nine GLP-1 receptor agonists including retatrutide, with pharmaceutical application. Bears on product characterisation.'),
    # --- Not evidence about effects ----------------------------------------
    '42224238': ('analytical_method', NOT, 'A liquid-phase synthesis route for retatrutide. Chemistry of manufacture, not evidence about effects.'),
    '42559975': ('analytical_method', NOT, 'Letter whose title reports composition and labelling accuracy of products sold as retatrutide in Australia. No abstract is available, so its findings are not recorded here.'),
    '37311727': ('other_peripheral', NOT, 'Title reports that retatrutide delays gastric emptying. No abstract, so design, population and sponsor cannot be established from the record.'),
    '41090431': ('other_peripheral', NOT, 'Rationale and design of TRIUMPH phase 3 trials. No outcomes.'),
    '41160422': ('other_peripheral', NOT, 'Rationale, design and baseline characteristics of TRANSCEND-CKD (NCT05936151). No outcomes.'),
    '41201783': ('other_peripheral', NOT, 'Development of an eating-behaviour questionnaire. Instrument, not evidence about the compound.'),
    '41589220': ('other_peripheral', NOT, 'Development of a weight-and-emotions scale. Instrument, not evidence about the compound.'),
    '40958513': ('other_peripheral', NOT, 'Design of other triple agonists with retatrutide as a comparator.'),
    '39776466': ('other_peripheral', NOT, 'Direct-to-consumer market for compounded GLP-1 receptor agonists in Colorado.'),
    '37405802': ('commentary_editorial', NOT, 'News item on the phase 2 obesity result.'),
    '38055301': ('commentary_editorial', NOT, 'Conference news item.'),
    '38323122': ('commentary_editorial', NOT, 'Correspondence.'),
    '39429457': ('commentary_editorial', NOT, 'Drug profile, no abstract.'),
    '42264536': ('commentary_editorial', NOT, 'News item on the phase 3 type 2 diabetes result.'),
    '42425580': ('commentary_editorial', NOT, 'News fact-check on a reported death after an unapproved retatrutide product. Journalism, not a case report.'),
    '42567543': ('commentary_editorial', NOT, 'News item on US expanded access.'),
    '42527705': ('commentary_editorial', NOT, 'Research highlight on a rat cognition study, no abstract.'),
    '37086147': ('review', NOT, 'Expert opinion review.'),
    '37902090': ('review', NOT, 'Narrative review.'),
    '37995806': ('review', NOT, 'Narrative review of obesity pharmacotherapy.'),
    '38184193': ('review', NOT, 'Narrative review of peptide therapies.'),
    '39507873': ('review', NOT, 'Commentary built on a literature review.'),
    '39724554': ('review', NOT, 'Narrative review.'),
    '39980735': ('review', NOT, 'Model-based meta-analysis.'),
    '41540866': ('review', NOT, 'Annual nephrology round-up.'),
    '41711462': ('review', NOT, 'Systematic review and meta-analysis.'),
    '42108533': ('review', NOT, 'Narrative review.'),
    '42219269': ('review', NOT, 'Scoping review.'),
    '42444567': ('review', NOT, 'Narrative review.'),
    '42562129': ('review', NOT, 'Narrative review.'),
    '42649514': ('review', NOT, 'Narrative review.'),
    '42682157': ('review', NOT, 'Narrative review.'),
    '42688617': ('review', NOT, 'Network meta-analysis.'),
    '42721492': ('review', NOT, 'Narrative review.'),
    '42156758': ('other_peripheral', NOT, 'Atrial fibrillation and epicardial fat mechanism; retatrutide is not the subject.'),
}

COUNTRIES = ['USA', 'United States', 'China', 'Japan', 'Korea', 'Germany', 'United Kingdom', 'UK', 'GBR',
             'Italy', 'France', 'Spain', 'Canada', 'Australia', 'India', 'Brazil', 'Netherlands', 'Greece',
             'Switzerland', 'Denmark', 'Sweden', 'Poland', 'Turkey', 'Iran', 'Pakistan', 'Egypt', 'Saudi Arabia',
             'Mexico', 'Israel', 'Belgium', 'Austria', 'Portugal', 'Singapore', 'Taiwan', 'Ireland', 'Norway',
             'Finland', 'Czech', 'Hungary', 'Romania', 'Nigeria', 'Bangladesh', 'Nepal', 'Qatar', 'Lebanon']
NORMAL = {'United States': 'USA', 'UK': 'United Kingdom', 'GBR': 'United Kingdom'}


def country(affiliation: str) -> str:
    hits = [(affiliation.rfind(c), c) for c in COUNTRIES if re.search(r'\b' + re.escape(c) + r'\b', affiliation)]
    if not hits:
        return 'not stated'
    return NORMAL.get(max(hits)[1], max(hits)[1])


def rule(x):
    pt = set(x['pubtypes'])
    mesh = set(x['mesh'])
    if pt & {'Review', 'Systematic Review', 'Meta-Analysis', 'Network Meta-Analysis'}:
        return ('review', NOT, 'Review or meta-analysis by publication type.')
    if pt & {'Letter', 'Comment', 'Editorial'}:
        return ('commentary_editorial', NOT, 'Letter, comment or editorial by publication type.')
    if 'Animals' in mesh and 'Humans' not in mesh:
        return ('animal_in_vivo', PRE, 'Animal study by MeSH (Animals, not Humans).')
    return None


def main(path: str) -> None:
    records = json.load(open(path, encoding='utf-8'))
    out, missing = [], []
    for pmid, x in records.items():
        decided = MANUAL.get(pmid)
        by = 'manual'
        if decided is None:
            decided = rule(x)
            by = 'rule'
        if decided is None:
            missing.append(pmid)
            continue
        study, (klass, included), reason = decided
        if by == 'rule' and not NAMED.search(x['title'] + ' ' + x['abstract']) and x['abstract']:
            study, klass, included = 'other_peripheral', 'not_evidence', False
            reason = 'Retatrutide is not named in the title or abstract; indexed for a passing mention.'
        out.append({
            'pmid': pmid,
            'title': x['title'],
            'year': x['year'],
            'journal': x['journal'],
            'publicationTypes': x['pubtypes'],
            'studyType': study,
            'evidenceClass': klass,
            'included': included,
            'primaryOrSecondary': 'secondary' if study in ('review', 'commentary_editorial') else 'primary',
            'peptideIdentityCertainty': 'stated' if study != 'case_report' else 'product marketed under the name; not analysed',
            'fullTextStatus': 'abstract_only' if x['abstract'] else 'no_abstract',
            'classifiedBy': by,
            'reason': reason,
            'country': country(x['affiliation']),
            'language': x['language'] or None,
            'researchGroup': 'Eli Lilly and Company' if 'Lilly' in x['affiliation'] else None,
        })
    if missing:
        sys.exit(f'Unclassified records: {", ".join(sorted(missing))}. Adjudicate them in MANUAL.')

    out.sort(key=lambda r: (r['year'], r['pmid']))
    counts = {}
    for r in out:
        counts[r['studyType']] = counts.get(r['studyType'], 0) + 1
    screen = {
        'screenKey': 'retatrutide-pubmed-2026-09',
        'peptideKey': 'retatrutide',
        'database': 'PubMed (NCBI E-utilities esearch/efetch, db=pubmed)',
        'query': QUERY,
        'searchDate': SEARCH_DATE,
        'resultCount': len(out),
        'screenedCount': len(out),
        'stratum': None,
        'deduplication': 'PubMed returns one record per PMID; none removed. Substudies and post hoc analyses of the same trial are kept as separate records and marked as belonging to the same programme in their reasons, so the record count is not read as a count of independent trials.',
        'inclusionCriteria': 'A record is INCLUDED as evidence about retatrutide when it reports original observations in which retatrutide was administered to people, animals, tissue or cells, or characterises the substance analytically. Reviews, meta-analyses, news, commentary, trial-design papers without outcomes, instrument development and records that only mention the name are retained in the ledger and excluded from the evidence set.',
        'humanPrimaryCriteria': 'A record counts as primary human evidence when retatrutide was administered to human beings and an outcome in those people was reported. Substudies and post hoc analyses of a trial count as records but not as additional trials. A case report of an online-purchased product marketed as retatrutide counts as a human record whose product identity was not established.',
        'notes': f"A census of all {len(out)} records. Study types: " + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())) + '. Four trials have published outcome reports in PubMed (phase 1b and two phase 2 trials, all US; one phase 3 in the USA, Mexico and India), all sponsored by or affiliated with the developer. ClinicalTrials.gov lists 34 registered studies on the search date, 33 with the developer as lead sponsor.',
        'records': out,
    }
    with open('data/seed/literature/retatrutide-screen.json', 'w', encoding='utf-8') as f:
        json.dump(screen, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(json.dumps(counts, indent=1))
    print('included', sum(1 for r in out if r['included']), 'manual', sum(1 for r in out if r['classifiedBy'] == 'manual'))


if __name__ == '__main__':
    main(sys.argv[1])
