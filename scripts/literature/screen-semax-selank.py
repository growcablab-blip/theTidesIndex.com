"""
Classifies every PubMed record for Semax and for Selank into two ledgers.

    python scripts/literature/fetch-pubmed.py "<SEMAX_QUERY>" <semax-dir>
    python scripts/literature/fetch-pubmed.py "<SELANK_QUERY>" <selank-dir>
    python scripts/literature/screen-semax-selank.py <semax-dir>/records.json <selank-dir>/records.json

Output: data/seed/literature/semax-screen.json, data/seed/literature/selank-screen.json

Both peptides come from one Russian research institute, and much of their
human literature is published in Russian. The rules therefore record the
language of every record, and the ledger says which human records were read
only through the English abstract PubMed carries. No machine translation is
used: a record with no English abstract is classified from its English title
and says so. Human records are adjudicated by hand.
"""
import json
import re
import sys

SEARCH_DATE = '2026-09-13'
SEMAX_QUERY = '"semax"[tiab] OR "Semaks"[tiab] OR "ACTH(4-7)PGP"[tiab] OR "ACTH 4-7 PGP"[tiab] OR "Met-Glu-His-Phe-Pro-Gly-Pro"[tiab]'
SELANK_QUERY = '"selank"[tiab] OR ("TP-7"[tiab] AND tuftsin[tiab]) OR "Thr-Lys-Pro-Arg-Pro-Gly-Pro"[tiab]'

HUMAN = ('human', True)
PRE = ('preclinical', True)
NOT = ('not_evidence', False)

SEMAX_MANUAL = {
    '11517472': ('human_interventional', HUMAN, 'Controlled clinical study: Semax added to therapy in 30 patients with acute ischaemic stroke against 80 conventionally treated controls. Non-randomised.'),
    '29798983': ('human_interventional', HUMAN, 'Semax in 110 patients at early and late rehabilitation after ischaemic stroke, with plasma BDNF and functional outcomes; allocation not stated.'),
    '10358912': ('human_interventional', HUMAN, 'Retrospective comparative clinical-immunobiochemical analysis of Semax in acute ischaemic stroke: inflammatory mediators. Same clinical group as the 1997 stroke study.'),
    '10741256': ('human_interventional', HUMAN, 'Controlled clinical study: Semax by nasal drops or endonasal electrophoresis added to therapy in optic nerve disease.'),
    '11569188': ('human_interventional', HUMAN, 'Neuroprotective complex including Semax in glaucomatous optic neuropathy against traditional treatment; design not stated.'),
    '12459874': ('human_interventional', HUMAN, 'Intranasal Semax added to standard therapy for refractory peptic ulcer against a control group.'),
    '15792140': ('human_interventional', HUMAN, 'Semax in 187 patients with cerebrovascular insufficiency; tolerability and progression; comparison group not clearly stated.'),
    '18379501': ('human_interventional', HUMAN, 'Open-label study of intranasal Semax in 27 patients with motor neuron disease.'),
    '10199046': ('human_interventional', HUMAN, 'Semax in 73 patients with posthypoxic encephalopathy; notes EEG paroxysmal activity after some injections.'),
    '27051926': ('human_interventional', HUMAN, 'Intranasal Semax added to conventional therapy in 60 of 118 patients with psoriasis and metabolic syndrome: lipid changes.'),
    '24437205': ('human_interventional', HUMAN, 'Endonasal electrophoresis or intranasal Semax against standard therapy in 114 patients with diabetic retinopathy.'),
    '23289234': ('human_interventional', HUMAN, 'Semax in rehabilitation of veterans exposed to radiation incidents; design not stated.'),
    '30225715': ('human_interventional', HUMAN, 'Resting-state fMRI after intranasal Semax or placebo in 24 healthy volunteers.'),
    '32342318': ('human_interventional', HUMAN, 'Resting-state functional connectivity after Selank, Semax or placebo in 52 healthy participants.'),
    '36083821': ('human_interventional', HUMAN, 'A combined physiotherapy programme including Semax electrophoresis in vascular optic neuropathy. Semax contribution not separable.'),
    '42366656': ('human_interventional', HUMAN, 'Semax given to both groups after retinal detachment surgery; the comparison is of physiotherapy methods, not of Semax.'),
    '8679991': ('human_interventional', HUMAN, 'Effect of Semax on the human electroencephalogram. No abstract; classified from the English title.'),
    '8998343': ('other_peripheral', NOT, 'Analgesic effect of the Semax preparation. No abstract; species and design cannot be established from the title.'),
    '11443939': ('in_vitro', PRE, 'Inhibition of enkephalin-degrading enzymes in human serum by Semax and Selank in vitro.'),
    '11103338': ('in_vitro', PRE, 'Semax on calcium responses of human neutrophils. No abstract; classified from the title.'),
    '12918351': ('in_vitro', PRE, 'Semax on the respiratory burst of human neutrophils. No abstract; classified from the title.'),
    '31760919': ('in_vitro', PRE, 'Human induced pluripotent stem cell-derived neurons for testing neuroprotective compounds.'),
    '35080861': ('in_vitro', PRE, 'Semax and copper-induced amyloid-beta aggregation in artificial membranes.'),
    '25102733': ('in_vitro', PRE, 'Antiaggregation activity of arachidonic acid conjugates with Semax; conjugates are different molecules.'),
    '27586814': ('analytical_method', NOT, 'Copper and zinc coordination chemistry of Semax and its N-acetylated form.'),
    '16996699': ('commentary_editorial', NOT, 'Hypothesis paper proposing Semax for ADHD and Rett syndrome.'),
    '28514338': ('other_peripheral', NOT, 'In silico chemoreactome analysis of another drug.'),
    '6455927': ('false_match', NOT, 'Neuromuscular blocking drug dose-response; unrelated.'),
    '15503962': ('false_match', NOT, 'Respiratory acoustic imaging; unrelated.'),
    '16082427': ('false_match', NOT, 'Bibliography of clinical trial gateways; unrelated.'),
    '28505067': ('false_match', NOT, 'Pesticide exposure in florists; unrelated.'),
    '35853762': ('false_match', NOT, 'Thyroid nodule elastography; unrelated.'),
    '31667971': ('analytical_method', PRE, 'Semax and Selank identified in seized unknown preparations; LC-MS/MS method for research peptides sold online. Belgium.'),
    '42021992': ('review', NOT, 'Narrative review of peptides in gerontology.'),
}

SELANK_MANUAL = {
    '18454096': ('human_interventional', HUMAN, 'Randomised comparison of Selank with medazepam in 62 patients with generalised anxiety disorder or neurasthenia.'),
    '25176261': ('human_interventional', HUMAN, 'Comparative study of Selank and phenazepam in 60 patients with anxiety and somatoform disorders; allocation not stated.'),
    '26356395': ('human_interventional', HUMAN, 'Randomised study of phenazepam alone against phenazepam plus Selank in 70 patients with anxiety disorders.'),
    '18577961': ('human_interventional', HUMAN, 'Selank on cytokines: patient blood cells in vitro, and serum after 14 days of treatment in anxiety-asthenic disorders.'),
    '32342318': ('human_interventional', HUMAN, 'Resting-state functional connectivity after Selank, Semax or placebo in 52 healthy participants.'),
    '11550013': ('in_vitro', PRE, 'Enkephalinase activity measured in patients with anxiety disorders; Selank inhibition of enkephalin hydrolysis tested in plasma in vitro. No administration.'),
    '11443939': ('in_vitro', PRE, 'Inhibition of enkephalin-degrading enzymes in human serum by Semax and Selank in vitro.'),
    '15344652': ('analytical_method', NOT, 'Tritium-labelled enkephalin method for measuring plasma enkephalinases, with Selank specificity.'),
    '31667971': ('analytical_method', PRE, 'Selank and Semax identified in seized unknown preparations; LC-MS/MS method for research peptides sold online. Belgium.'),
    '28293190': ('in_vitro', PRE, 'IMR-32 neuroblastoma cells: no direct effect of Selank on GABAergic gene mRNA levels.'),
    '34396551': ('review', NOT, 'Review of sedative-hypnotic GABAergic agents including Selank.'),
    '28745220': ('review', NOT, 'Review of tuftsin and its analogues.'),
    '41490200': ('review', NOT, 'Narrative review of peptides in orthopaedics.'),
}

ANIMAL = re.compile(r'\b(rats?|mice|mouse|murine|rabbits?|cats?|dogs?|guinea pigs?|zebrafish|animals?|pups|rodents?)\b', re.I)
CELLS = re.compile(r'\b(cells?|cultures?|in vitro|neurons in culture|plasma membranes|homogenates?)\b', re.I)


def country(aff: str, language: str) -> str:
    if re.search(r'Russia|Moscow|USSR|St\.? Petersburg|Novosibirsk', aff):
        return 'Russia'
    if re.search(r'Ukraine|Kyiv|Kiev', aff):
        return 'Ukraine'
    for c in ('USA', 'Belgium', 'Germany', 'China', 'Taiwan', 'United Kingdom', 'Spain', 'Italy', 'Poland', 'Iran', 'India', 'Japan'):
        if c in aff:
            return c
    if not aff and language == 'rus':
        return 'not stated (Russian-language journal)'
    return 'not stated'


def make_rule(named: re.Pattern, compound: str):
    def rule(x):
        pt = set(x['pubtypes'])
        blob = x['title'] + ' ' + x['abstract']
        if pt & {'Review', 'Systematic Review', 'Meta-Analysis'}:
            return ('review', NOT, 'Review by publication type.')
        if pt & {'Letter', 'Comment', 'Editorial'}:
            return ('commentary_editorial', NOT, 'Letter, comment or editorial by publication type.')
        if not named.search(blob):
            return ('other_peripheral', NOT, f'{compound} is not named in the title or abstract.')
        if 'Humans' in x['mesh'] and 'Animals' not in x['mesh'] and not CELLS.search(blob):
            return None  # possible human study: adjudicate by hand
        if 'Animals' in x['mesh'] or ANIMAL.search(blob):
            reason = 'Animal work, by MeSH or species named.'
            if not x['abstract']:
                reason = 'Animal work, classified from the English title and MeSH; no abstract.'
            return ('animal_in_vivo', PRE, reason)
        if CELLS.search(blob):
            return ('in_vitro', PRE, 'Cell, tissue or membrane work in the laboratory, by title and abstract.')
        return ('other_peripheral', NOT, 'Not classifiable as original research from the title and abstract.')
    return rule


def screen(path: str, manual: dict, rule, key: str, peptide: str, query: str, notes_extra: str, out_file: str) -> None:
    records = json.load(open(path, encoding='utf-8'))
    out, missing = [], []
    for pmid, x in records.items():
        decided, by = manual.get(pmid), 'manual'
        if decided is None:
            decided, by = rule(x), 'rule'
        if decided is None:
            missing.append(pmid)
            continue
        study, (klass, included), reason = decided
        lang = x['language'] or None
        if lang and lang != 'eng':
            reason += ' Non-English original' + (' read through its English abstract.' if x['abstract'] else '; no English abstract.')
        out.append({
            'pmid': pmid, 'title': x['title'] or '[no title]', 'year': x['year'], 'journal': x['journal'],
            'publicationTypes': x['pubtypes'], 'studyType': study, 'evidenceClass': klass, 'included': included,
            'primaryOrSecondary': 'secondary' if study in ('review', 'commentary_editorial') else 'primary',
            'peptideIdentityCertainty': 'stated',
            'fullTextStatus': 'abstract_only' if x['abstract'] else 'no_abstract', 'classifiedBy': by, 'reason': reason,
            'country': country(x['affiliation'], x['language']), 'language': lang, 'researchGroup': None,
        })
    if missing:
        sys.exit(f'{peptide}: possible human records need adjudication: {", ".join(sorted(missing))}')
    out.sort(key=lambda r: (r['year'], r['pmid']))
    counts = {}
    for r in out:
        counts[r['studyType']] = counts.get(r['studyType'], 0) + 1
    russian = sum(1 for r in out if r['language'] == 'rus')
    human_rus = sum(1 for r in out if r['evidenceClass'] == 'human' and r['language'] == 'rus')
    human_all = sum(1 for r in out if r['evidenceClass'] == 'human')
    data = {
        'screenKey': key,
        'peptideKey': peptide,
        'database': 'PubMed (NCBI E-utilities esearch/efetch, db=pubmed)',
        'query': query,
        'searchDate': SEARCH_DATE,
        'resultCount': len(out),
        'screenedCount': len(out),
        'stratum': None,
        'deduplication': 'One record per PMID; none removed. Records about both peptides appear in both ledgers.',
        'inclusionCriteria': 'INCLUDED when the peptide was administered to people, animals, tissue or cells, or when a record characterises seized or sold material. Reviews, commentary, chemistry without biological testing, false matches and records not naming the peptide are retained and excluded.',
        'humanPrimaryCriteria': 'Primary human evidence requires the peptide to have been given to people with an outcome reported. A Russian-language record is included on the strength of its English abstract and marked as such; no translation was performed.',
        'notes': f'A census of {len(out)} records, {russian} in Russian. Study types: ' + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())) + f'. {human_rus} of {human_all} human records are Russian-language publications read through English abstracts. ' + notes_extra,
        'records': out,
    }
    with open(out_file, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(peptide, json.dumps(counts))


if __name__ == '__main__':
    screen(sys.argv[1], SEMAX_MANUAL, make_rule(re.compile(r'semax|semaks|ACTH ?\(?4-7\)? ?-?PGP|MEHFPGP|Met-Glu-His-Phe-Pro-Gly-Pro', re.I), 'Semax'),
           'semax-pubmed-2026-09', 'semax', SEMAX_QUERY,
           'No human trial registered outside Russia, and no human pharmacokinetic study, was identified. Human studies are small, mostly add-on designs without stated randomisation or blinding.',
           'data/seed/literature/semax-screen.json')
    screen(sys.argv[2], SELANK_MANUAL, make_rule(re.compile(r'selank|TP-7|Thr-Lys-Pro-Arg-Pro-Gly-Pro|TKPRPGP', re.I), 'Selank'),
           'selank-pubmed-2026-09', 'selank', SELANK_QUERY,
           'The controlled human studies compare Selank with benzodiazepines or add it to one; no placebo-controlled trial in patients and no human pharmacokinetic study was identified.',
           'data/seed/literature/selank-screen.json')
