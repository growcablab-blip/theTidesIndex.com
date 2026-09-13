"""
Classifies every PubMed record for CJC-1295 and modified GRF (1-29).

    python scripts/literature/fetch-pubmed.py "<QUERY below>" <dir>
    python scripts/literature/screen-cjc-1295.py <dir>/records.json

Output: data/seed/literature/cjc-1295-screen.json

A census of 38 records, every one adjudicated by hand. The ledger belongs to the
CJC-1295 record; records that concern modified GRF (1-29) say so in their
reason, because the two names denote different molecules and the evidence for
one is not evidence for the other. Six records match only because "GRF" is also
glutinous rice flour, graphene film or ground reaction force.
"""
import json
import sys

QUERY = ('"CJC-1295"[tiab] OR "CJC1295"[tiab] OR "CJC 1295"[tiab] OR "DAC:GRF"[tiab] OR "modified GRF"[tiab] '
         'OR "Mod GRF"[tiab] OR "tetrasubstituted GRF"[tiab] OR "drug affinity complex"[tiab]')
SEARCH_DATE = '2026-09-13'

HUMAN = ('human', True)
PRE = ('preclinical', True)
NOT = ('not_evidence', False)

MANUAL = {
    '16352683': ('human_interventional', HUMAN, 'Two randomised, placebo-controlled, double-blind ascending-dose trials of subcutaneous CJC-1295 in healthy adults aged 21-61, 28 and 49 days: pharmacokinetics, GH and IGF-I, safety. USA.', 'USA'),
    '17018654': ('human_interventional', HUMAN, 'GH pulsatility overnight before and one week after a single injection of CJC-1295 in healthy men aged 20-40. USA; investigators overlap with the ascending-dose trials.', 'USA'),
    '19386527': ('human_interventional', HUMAN, 'Serum proteomics before and one week after CJC-1295 injection in 11 healthy men. USA. Whether participants overlap with the pulsatility study is not stated.', 'USA'),
    '15817669': ('animal_in_vivo', PRE, 'Originator paper: maleimido derivatives of hGRF(1-29) bioconjugated to albumin; CJC-1295 selected and characterised in rats. Defines the molecule. Canada, developer.', 'Canada'),
    '16822960': ('animal_in_vivo', PRE, 'CJC-1295 at 24, 48 and 72 hour intervals in GHRH-knockout mice; daily administration normalised growth. USA.', 'USA'),
    '19332789': ('animal_in_vivo', PRE, 'Muscarinic receptor knockout mice with pituitary hypoplasia; CJC-1295 used as a pharmacological tool. USA.', 'USA'),
    '30489688': ('analytical_method', PRE, 'Immuno-PCR detection of CJC-1295 in equine plasma after administration to racehorses; describes CJC-1295 as a 30-residue peptide with a maleimidopropionic group. Australia.', 'Australia'),
    '30938069': ('analytical_method', PRE, 'LC-MS/MS confirmation of albumin-conjugated CJC-1295 in equine plasma. Australia.', 'Australia'),
    '21204297': ('analytical_method', PRE, 'A seized preparation identified by mass spectrometry as a 29-residue C-terminal amide consistent with a product marketed as CJC-1295. Norway. Bears on modified GRF (1-29), not on the albumin-binding molecule.', 'Norway'),
    '30136411': ('analytical_method', PRE, 'Seized powders identified as N-terminally glycine-extended analogues of several secretagogues including modified GRF 1-29. Denmark. Concerns modified GRF (1-29).', 'Denmark'),
    '34665524': ('analytical_method', PRE, 'In vitro metabolism and urinary detection of sermorelin, tesamorelin, CJC-1295 and CJC-1295 with drug affinity complex as separate analytes. United Kingdom.', 'United Kingdom'),
    '23318763': ('analytical_method', NOT, 'Doping-control extraction method for seven peptides including CJC-1295 in horse plasma. Method only. Hong Kong.', 'China'),
    '26382721': ('analytical_method', NOT, 'Anti-doping test method for peptides over 2 kDa including CJC-1295. Method only. Germany.', 'Germany'),
    '26879649': ('analytical_method', NOT, 'Anti-doping identification of GHRH analogues including CJC-1295 in plasma. Method only. Germany.', 'Germany'),
    '32971474': ('analytical_method', NOT, 'Immunopurification comparison for GHRH analogues including CJC-1295. Method only. Spain.', 'Spain'),
    '35298973': ('analytical_method', NOT, 'Ultrafiltration assay for GHRH analogues including CJC-1295 in urine. Method only. Belgium.', 'Belgium'),
    '37806509': ('analytical_method', NOT, 'SPE and UHPLC-MS/MS detection of GHRH analogues including CJC-1295. Method only. Romania.', 'Romania'),
    '38716080': ('analytical_method', NOT, 'Blood screening for 2-10 kDa peptides in doping control. Method only. Germany.', 'Germany'),
    '38197510': ('analytical_method', NOT, 'Urine screening for 2-10 kDa peptides in doping control. Method only. Germany.', 'Germany'),
    '41138283': ('analytical_method', NOT, 'Nano-LC orbitrap detection of GHRH analogues including CJC-1295 in urine. Method only. Turkey.', 'Turkey'),
    '34736642': ('other_peripheral', NOT, 'Cannabinoid detection assay in which CJC-1295 appears as an interferent. Romania.', 'Romania'),
    '27710891': ('other_peripheral', NOT, 'Intelligence from internet doping forums; CJC-1295 among products discussed. Switzerland.', 'Switzerland'),
    '26771670': ('other_peripheral', NOT, 'Netnography of women discussing CJC-1295 on bodybuilding forums. Reported experiences, not outcomes. Ireland.', 'Ireland'),
    '21871962': ('review', NOT, 'Methods review of immunoaffinity purification in doping control.', 'Germany'),
    '25382550': ('review', NOT, 'Review of detection of peptidic doping agents.', 'Germany'),
    '42578445': ('review', NOT, 'Scoping review of six peptides for musculoskeletal use.', 'USA'),
    '42395176': ('review', NOT, 'Narrative review contrasting clinical evidence with online self-administration protocols; lists CJC-1295 with and without DAC as distinct agents.', 'Poland'),
    '42160466': ('review', NOT, 'Structured narrative review of injectable peptides in sports medicine.', 'USA'),
    '42123471': ('review', NOT, 'Narrative review of therapeutic peptides in aesthetic, metabolic and endocrine conditions.', 'Brazil'),
    '42021992': ('review', NOT, 'Narrative review of peptides in gerontology.', 'Saudi Arabia'),
    '41966639': ('review', NOT, 'Review of approved and unapproved peptide therapies in sports medicine.', 'USA'),
    '41880199': ('review', NOT, 'Critical review of peptide use in sport and bodybuilding.', 'Brazil'),
    '41490200': ('review', NOT, 'Narrative review of peptides in orthopaedics.', 'USA'),
    '41476424': ('review', NOT, 'Narrative primer on injectable peptides.', 'USA'),
    '27722075': ('false_match', NOT, 'GrF is graphene film. Unrelated.', 'China'),
    '27537844': ('false_match', NOT, 'GRF is glutinous rice flour. Unrelated.', 'China'),
    '38996639': ('false_match', NOT, 'GRF is glutinous rice flour. Unrelated.', 'China'),
    '29851844': ('false_match', NOT, 'GRF is ground reaction force. Unrelated.', 'Spain'),
}


def main(path: str) -> None:
    records = json.load(open(path, encoding='utf-8'))
    missing = sorted(set(records) - set(MANUAL))
    if missing:
        sys.exit(f'Unclassified records: {", ".join(missing)}. Adjudicate them in MANUAL.')
    out = []
    for pmid, x in records.items():
        study, (klass, included), reason, country = MANUAL[pmid]
        out.append({
            'pmid': pmid, 'title': x['title'], 'year': x['year'], 'journal': x['journal'],
            'publicationTypes': x['pubtypes'], 'studyType': study, 'evidenceClass': klass, 'included': included,
            'primaryOrSecondary': 'secondary' if study == 'review' else 'primary',
            'peptideIdentityCertainty': 'analytically characterised' if pmid in ('21204297', '30136411', '15817669') else 'stated',
            'fullTextStatus': 'abstract_only' if x['abstract'] else 'no_abstract', 'classifiedBy': 'manual', 'reason': reason,
            'country': country, 'language': x['language'] or None, 'researchGroup': 'ConjuChem' if pmid == '15817669' else None,
        })
    out.sort(key=lambda r: (r['year'], r['pmid']))
    counts = {}
    for r in out:
        counts[r['studyType']] = counts.get(r['studyType'], 0) + 1
    screen = {
        'screenKey': 'cjc-1295-pubmed-2026-09',
        'peptideKey': 'cjc-1295',
        'database': 'PubMed (NCBI E-utilities esearch/efetch, db=pubmed)',
        'query': QUERY,
        'searchDate': SEARCH_DATE,
        'resultCount': len(out),
        'screenedCount': len(out),
        'stratum': None,
        'deduplication': 'One record per PMID; none removed. Records about modified GRF (1-29) are kept in this ledger because the query that finds one name finds the other, and each such record says which molecule it concerns.',
        'inclusionCriteria': 'INCLUDED when CJC-1295 or modified GRF (1-29) was administered to people or animals, or when a record characterises what a product sold under either name contains or how the molecules are metabolised. Anti-doping methods that only detect the analyte, reviews, forum studies and false matches are retained and excluded from the evidence set.',
        'humanPrimaryCriteria': 'Primary human evidence requires CJC-1295 to have been administered to people with an outcome measured. Forum posts about use are not outcomes.',
        'notes': 'A census of ' + str(len(out)) + ' records, all adjudicated by hand. Study types: ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())) + '. All three human records are in healthy adults in the USA, published 2006-2009, from overlapping investigators. No human study of modified GRF (1-29) was identified. The practitioner-reported phase II trial in HIV lipodystrophy was not found in PubMed.',
        'records': out,
    }
    with open('data/seed/literature/cjc-1295-screen.json', 'w', encoding='utf-8', newline='\n') as f:
        json.dump(screen, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(json.dumps(counts, indent=1))


if __name__ == '__main__':
    main(sys.argv[1])
