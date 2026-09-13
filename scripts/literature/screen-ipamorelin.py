"""
Classifies every PubMed record for ipamorelin.

    python scripts/literature/fetch-pubmed.py "<QUERY below>" <dir>
    python scripts/literature/screen-ipamorelin.py <dir>/records.json

Output: data/seed/literature/ipamorelin-screen.json

A census of 50 records, every one adjudicated by hand. Two features shape it:
the developer's medicinal-chemistry programme, in which ipamorelin is the lead
compound for other molecules (those records concern the other molecules), and
a large anti-doping literature that detects ipamorelin without studying it.
"""
import json
import sys

QUERY = '"ipamorelin"[tiab] OR "NNC 26-0161"[tiab] OR "NNC26-0161"[tiab]'
SEARCH_DATE = '2026-09-13'

HUMAN = ('human', True)
PRE = ('preclinical', True)
NOT = ('not_evidence', False)

MANUAL = {
    # People
    '10496658': ('human_interventional', HUMAN, 'Dose-escalation PK/PD study of 15-minute intravenous infusions in healthy men, five dose levels, eight per level. USA (academic pharmacometrics).', 'USA'),
    '25331030': ('human_interventional', HUMAN, 'Phase 2 multicentre randomised double-blind placebo-controlled trial of intravenous ipamorelin twice daily after bowel resection (NCT00672074), 114 analysed. USA.', 'USA'),
    '25869809': ('human_pk_safety', HUMAN, 'Anti-doping excretion study: nasal administration of five secretagogues including ipamorelin, each to one volunteer; urinary metabolites. Russia. Identity of metabolites, not a clinical outcome.', 'Russia'),
    # Animals
    '9849822': ('animal_in_vivo', PRE, 'Developer pharmacology: GH release in rat pituitary cells, anaesthetised rats and conscious swine; specificity against ACTH and cortisol in swine. Denmark.', 'Denmark'),
    '9879640': ('animal_in_vivo', PRE, 'Rat pharmacokinetics by intravenous and intranasal routes; nasal bioavailability about 20%. Denmark, developer.', 'Denmark'),
    '9733495': ('animal_in_vivo', PRE, 'Medicinal chemistry of ipamorelin-derived peptides, including oral ipamorelin raising basal GH in dogs. Denmark, developer.', 'Denmark'),
    '10629165': ('animal_in_vivo', PRE, 'Intravenous ipamorelin four times daily with methylprednisolone in rats: GH response and weight. Denmark, developer.', 'Denmark'),
    '10373343': ('animal_in_vivo', PRE, 'Subcutaneous ipamorelin three times daily for 15 days in adult female rats: bone growth, weight, IGF-I unchanged. Denmark, developer.', 'Denmark'),
    '10828840': ('animal_in_vivo', PRE, 'Continuous subcutaneous ipamorelin or GHRP-6 for 12 weeks in female rats: bone mineral content rose with body weight. Sweden.', 'Sweden'),
    '11735244': ('animal_in_vivo', PRE, 'Ipamorelin with methylprednisolone for 3 months in rats: muscle strength and bone formation preserved. Denmark (academic).', 'Denmark'),
    '11162489': ('animal_in_vivo', PRE, 'Twice-daily ipamorelin in GH-deficient and intact mice: increased relative body fat and food intake, independently of GH. United Kingdom.', 'United Kingdom'),
    '12168778': ('animal_in_vivo', PRE, 'Chronic ipamorelin in young female rats, pituitary cells studied in culture. Spain.', 'Spain'),
    '14630569': ('animal_in_vivo', PRE, 'Intravenous ipamorelin as a GH provocation test in diabetic and non-diabetic mice. Denmark, developer.', 'Denmark'),
    '19289567': ('animal_in_vivo', PRE, 'Intravenous ipamorelin in a rat model of postoperative ileus. USA.', 'USA'),
    '19231263': ('animal_in_vivo', PRE, 'Ipamorelin in prednisolone-treated rats: nitrogen balance and urea synthesis. Denmark.', 'Denmark'),
    '27186127': ('animal_in_vivo', PRE, 'Intravenous ipamorelin on gastric emptying after abdominal surgery in rats. USA.', 'USA'),
    '32801950': ('animal_in_vivo', PRE, 'Intravenous ipamorelin on visceral and somatic pain in rats. USA.', 'USA'),
    '39043357': ('animal_in_vivo', PRE, 'Intraperitoneal ipamorelin and anamorelin in cisplatin-treated ferrets. China (Hong Kong).', 'China'),
    '38996787': ('animal_in_vivo', PRE, 'Ipamorelin acetate on the reproductive axis of tilapia. India.', 'India'),
    # Tissue and cells
    '15665799': ('ex_vivo', PRE, 'Insulin release from rat pancreatic tissue fragments exposed to ipamorelin. United Arab Emirates.', 'United Arab Emirates'),
    '15556068': ('in_vitro', PRE, 'GH secretion from seabream pituitary cells in culture, including ipamorelin. China (Hong Kong).', 'China'),
    # Product identity and metabolism
    '29864719': ('analytical_method', PRE, 'Black-market products analysed: N-terminally glycine-extended ipamorelin identified and confirmed by synthesis. Germany.', 'Germany'),
    '30136411': ('analytical_method', PRE, 'Seized powders containing glycine-extended ipamorelin among other secretagogue analogues. Denmark.', 'Denmark'),
    '23101768': ('analytical_method', PRE, 'Metabolism of GHRPs including ipamorelin in rats and human serum, for doping control. Germany.', 'Germany'),
    '26811125': ('analytical_method', NOT, 'Receptor-assay structure-activity study of GHRPs with urine from nasal excretion studies. Spain. Method.', 'Spain'),
    '21298258': ('analytical_method', NOT, 'Urine detection method for GHRPs including ipamorelin. Germany. Method only.', 'Germany'),
    '22901302': ('analytical_method', NOT, 'Urine screening for small prohibited peptides including ipamorelin. Germany. Method only.', 'Germany'),
    '23318763': ('analytical_method', NOT, 'Horse plasma detection of seven peptides including ipamorelin. Hong Kong. Method only.', 'China'),
    '24574167': ('analytical_method', NOT, 'LC-MS/MS screen for GHRPs in equine and human urine, validated with rat urine. Australia. Method only.', 'Australia'),
    '26578461': ('analytical_method', NOT, 'Direct-injection urine screen for small peptides including ipamorelin. Germany. Method only.', 'Germany'),
    '26472487': ('analytical_method', NOT, 'Solid-phase extraction of small peptides from urine, confirmed with ipamorelin-containing samples. Russia. Method only.', 'Russia'),
    # Other molecules and peripheral
    '9733496': ('other_peripheral', NOT, 'Orally active secretagogues derived from ipamorelin as lead; the compounds studied are other molecules. Denmark, developer.', 'Denmark'),
    '10427162': ('other_peripheral', NOT, 'Pharmacology of NN703, an ipamorelin-derived oral secretagogue. Denmark, developer.', 'Denmark'),
    '11459660': ('other_peripheral', NOT, 'Hybrids of NN703 and ipamorelin; other molecules. Denmark, developer.', 'Denmark'),
    '11322495': ('other_peripheral', NOT, 'Stomach accumulation of NN703 and GHRP-6; ipamorelin mentioned as an intermediate in NN703 design. Denmark.', 'Denmark'),
    '12204475': ('other_peripheral', NOT, 'C-terminal modifications of secretagogues derived from ipamorelin and NN703; other molecules. Denmark.', 'Denmark'),
    '16648303': ('other_peripheral', NOT, 'Seabream ghrelin gene cloning; ipamorelin mentioned in background. China (Hong Kong).', 'China'),
    '30282322': ('other_peripheral', NOT, 'Fluorinated secretagogue derivatives for PET imaging, including ipamorelin analogues. Canada.', 'Canada'),
    '30168238': ('other_peripheral', NOT, 'Boron-loaded ghrelin receptor agonists built on GHRP-6 and ipamorelin backbones. Germany.', 'Germany'),
    '27497113': ('other_peripheral', NOT, 'Stabilising urine collection containers for doping control. Greece.', 'Greece'),
    # Reviews
    '32257855': ('review', NOT, 'Review of secretagogues in hypogonadal men; notes the paucity of clinical data.', 'USA'),
    '42578445': ('review', NOT, 'Scoping review of six peptides for musculoskeletal use.', 'USA'),
    '42395176': ('review', NOT, 'Narrative review contrasting clinical evidence with online self-administration of GH-axis peptides.', 'Poland'),
    '42160466': ('review', NOT, 'Structured narrative review of injectable peptides in sports medicine.', 'USA'),
    '42123471': ('review', NOT, 'Narrative review of therapeutic peptides.', 'Brazil'),
    '42021992': ('review', NOT, 'Narrative review of peptides in gerontology.', 'Saudi Arabia'),
    '41966639': ('review', NOT, 'Review of approved and unapproved peptides in sports medicine.', 'USA'),
    '41880199': ('review', NOT, 'Critical review of peptides in sport and bodybuilding.', 'Brazil'),
    '41490200': ('review', NOT, 'Narrative review of peptides in orthopaedics.', 'USA'),
    '41476424': ('review', NOT, 'Narrative primer on injectable peptides including CJC-1295 with ipamorelin.', 'USA'),
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
            'peptideIdentityCertainty': 'analytically characterised' if pmid in ('29864719', '30136411') else 'stated',
            'fullTextStatus': 'abstract_only' if x['abstract'] else 'no_abstract', 'classifiedBy': 'manual', 'reason': reason,
            'country': country, 'language': x['language'] or None,
            'researchGroup': 'Novo Nordisk' if 'developer' in reason else None,
        })
    out.sort(key=lambda r: (r['year'], r['pmid']))
    counts = {}
    for r in out:
        counts[r['studyType']] = counts.get(r['studyType'], 0) + 1
    screen = {
        'screenKey': 'ipamorelin-pubmed-2026-09',
        'peptideKey': 'ipamorelin',
        'database': 'PubMed (NCBI E-utilities esearch/efetch, db=pubmed)',
        'query': QUERY,
        'searchDate': SEARCH_DATE,
        'resultCount': len(out),
        'screenedCount': len(out),
        'stratum': None,
        'deduplication': 'One record per PMID; none removed.',
        'inclusionCriteria': 'INCLUDED when ipamorelin itself was administered to people, animals, tissue or cells, or when a record characterises what products sold as ipamorelin contain or how it is metabolised. Records about molecules derived from ipamorelin, detection-only anti-doping methods and reviews are retained and excluded.',
        'humanPrimaryCriteria': 'Primary human evidence requires ipamorelin to have been administered to people with a measured outcome. The anti-doping excretion study is counted as a human pharmacokinetic record, not as clinical evidence.',
        'notes': 'A census of ' + str(len(out)) + ' records, all adjudicated by hand. Study types: ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())) + '. Both clinical human studies used intravenous ipamorelin; no human study of the subcutaneous route practitioner sources describe was identified. No human study of ipamorelin combined with a GHRH analogue was identified.',
        'records': out,
    }
    with open('data/seed/literature/ipamorelin-screen.json', 'w', encoding='utf-8', newline='\n') as f:
        json.dump(screen, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(json.dumps(counts, indent=1))


if __name__ == '__main__':
    main(sys.argv[1])
