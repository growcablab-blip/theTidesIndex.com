"""
Classifies every PubMed record for GHK / GHK-Cu into the literature screen ledger.

    python scripts/literature/fetch-pubmed.py "<QUERY below>" <dir>
    python scripts/literature/screen-ghk-cu.py <dir>/records.json

Output: data/seed/literature/ghk-cu-screen.json

A census. Three problems make this corpus unlike the others and the rules are
built around them:

  1. "GHK" is also the Goldman-Hodgkin-Katz equation, the Gleiser-Hunt-Kohler
     dental staging system, two childhood-obesity programmes and a plasmid.
     Those are false matches, found by pattern and listed, not dropped.
  2. The peptide is endogenous and cheap, so most records are chemistry,
     materials science and cell work. Those are classified by rule from the
     title and abstract, and say so.
  3. Almost every human record tests a cosmetic or clinic formulation in which
     GHK-Cu is one ingredient among several. Those are adjudicated by hand and
     the reason says whether GHK-Cu was the only active tested.
"""
import json
import re
import sys

QUERY = ('"GHK-Cu"[tiab] OR "copper tripeptide"[tiab] OR "glycyl-L-histidyl-L-lysine"[tiab] OR "GHK"[tiab] '
         'OR "Gly-His-Lys"[tiab] OR "copper peptide"[tiab]')
SEARCH_DATE = '2026-09-13'

HUMAN = ('human', True)
PRE = ('preclinical', True)
NOT = ('not_evidence', False)

MANUAL = {
    # --- People -------------------------------------------------------------
    '17147644': ('human_interventional', HUMAN, 'Multicentre randomised, evaluator-blinded, vehicle-controlled trial of a topical GHK-Cu gel in diabetic neuropathic plantar ulcers, USA. GHK-Cu the only investigational active; sponsor not stated in the abstract.'),
    '16847171': ('human_interventional', HUMAN, 'Randomised trial of skin-care products containing GHK-Cu after CO2 laser resurfacing, USA; 13 completed. Products contained other ingredients; objective endpoints showed no difference.'),
    '27489425': ('human_interventional', HUMAN, 'Randomised placebo-controlled trial of a complex of 5-aminolevulinic acid with GHK (no copper stated) for male pattern hair loss, Korea, 45 patients, 6 months. Not GHK-Cu, and not GHK alone.'),
    '29482481': ('human_interventional', HUMAN, 'Open-label single-arm study, 1,000 patients, intradermal scalp injections of a formulation of growth factors, thymosin beta-4 and copper tripeptide-1, India. GHK-Cu one of six actives; its contribution is not separable.'),
    '30057663': ('human_observational', HUMAN, 'Retrospective clinic series, 18,918 men with androgenetic alopecia, Japan: finasteride, minoxidil and a monthly injected solution listing copper tripeptide among fourteen ingredients. GHK-Cu contribution not separable.'),
    '29452017': ('case_report', HUMAN, 'Four cases of pattern hair loss, Brazil: laser-assisted topical finasteride, growth factors and copper peptide. Not separable.'),
    '27064823': ('case_report', HUMAN, 'Single case, Korea: a device-delivered cosmetic mixture containing copper-GHK and four other actives for periorbital wrinkles.'),
    '28133891': ('human_interventional', HUMAN, 'Small uncontrolled volunteer study, Korea: the same device and five-ingredient mixture for melasma. Not separable.'),
    '39449909': ('human_interventional', HUMAN, 'Open-label single-centre study of a scalp scrub plus a serum containing copper tripeptide-1 and four other ingredients for dandruff, India, 15 days, contract research organisation. Not separable.'),
    '41001334': ('human_interventional', HUMAN, 'Open-label study of a commercial scar gel whose proprietary blend includes copper tripeptide-1, in women with acne scars, India. Not separable.'),
    # --- Tissue -----------------------------------------------------------
    '20703511': ('ex_vivo', PRE, 'Human skin in diffusion cells: copper applied as GHK cuprate permeated and was retained in skin layers. Tissue, not a person.'),
    '20721598': ('ex_vivo', PRE, 'Human skin in diffusion cells, penetration by skin layer. Tissue, not a person.'),
    # --- Not administration --------------------------------------------------
    '39802077': ('other_peripheral', NOT, 'Case report of a light-reflecting skin patch said to elevate GHK. No GHK or GHK-Cu was administered or measured.'),
    '40621326': ('other_peripheral', NOT, 'Case report of skin patches said to elevate GHK, carnosine and glutathione. No GHK was administered or measured.'),
    '42032121': ('other_peripheral', NOT, 'A cosmetic hydrogel containing a designed peptide that includes the GHK sequence, with dermatological testing. Not GHK or GHK-Cu.'),
    '42047624': ('other_peripheral', NOT, 'New copper-tripeptide complexes other than GHK-Cu.'),
    '8077675': ('other_peripheral', NOT, 'Macrophage iron uptake from low molecular weight chelates; GHK appears only as one chelator among others.'),
    '33689270': ('other_peripheral', NOT, 'A different copper-tripeptide complex for tumour chemodynamic therapy.'),
    # --- Reviews without a review publication type --------------------------
    '25302294': ('review', NOT, 'Narrative review by the discoverer of GHK on gene-expression effects.'),
    '35083444': ('review', NOT, 'Narrative review of GHK as an anti-aging peptide; source of the frequently repeated plasma-level-by-age figures.'),
    '42619529': ('review', NOT, 'Systematic review: 20 studies, 18 preclinical and 2 RCTs of GHK-Cu as a standalone aesthetic intervention.'),
    '42578445': ('review', NOT, 'Scoping review of six peptides including GHK-Cu for musculoskeletal use; human studies described as few and poorly controlled.'),
    '19336143': ('commentary_editorial', NOT, 'Author commentary on skin-care agents.'),
    '28212278': ('review', NOT, 'Gene-expression database analysis and discussion; no administration.'),
    '22999295': ('commentary_editorial', NOT, 'Commentary on a connectivity-map finding.'),
}

FALSE = re.compile(r'Goldman|Hodgkin|Gleiser|Healthy Kids|GHK equation|G-H-K|phages?|keratin gene|YCplac33|dental age|third molar', re.I)
FALSE_IDS = {'373321', '7036596', '2470667', '9087159', '11156298', '20143136', '34722301', '41238421', '42016822',
             '40429775', '40587520', '19137284', '30776683', '35366283', '6244261', '20657620', '23430413',
             '34546033', '11426517', '33661050', '40421934', '35493947', '23585360', '2098549', '37287524'}
NAMED = re.compile(r'\bGHK|Gly-His-Lys|glycyl-?\s?L?-?histidyl-?\s?L?-?lysine|glycylhistidyllysine|copper tripeptide|\bGHL\b', re.I)
ANIMAL = re.compile(r'\b(rats?|mice|mouse|murine|rabbits?|guinea[- ]pigs?|pigs?|swine|dogs?|zebrafish|hamsters?)\b', re.I)
CHEM = re.compile(r'\bNMR\b|n\.m\.r|e\.p\.r|\bEPR\b|spectroscop|potentiometric|titration|crystal|calorimetr|mass spectrometr|LC-MS|'
                  r'chromatograph|electrophoresis|coordination|complexation|binding constant|DFT|molecular dynamics|theoretical', re.I)
COUNTRIES = ['USA', 'United States', 'China', 'Japan', 'Korea', 'Germany', 'United Kingdom', 'UK', 'France', 'Italy', 'Spain',
             'Poland', 'India', 'Brazil', 'Canada', 'Australia', 'Iran', 'Taiwan', 'Russia', 'Hungary', 'Czech', 'Slovakia',
             'Greece', 'Turkey', 'Israel', 'Netherlands', 'Switzerland', 'Belgium', 'Sweden', 'Denmark', 'Portugal', 'Mexico',
             'Thailand', 'Malaysia', 'Singapore', 'Egypt', 'Saudi Arabia', 'Pakistan', 'Lithuania', 'Romania', 'Serbia', 'Chile']
NORMAL = {'United States': 'USA', 'UK': 'United Kingdom'}


def country(aff: str) -> str:
    hits = [(aff.rfind(c), c) for c in COUNTRIES if re.search(r'\b' + re.escape(c) + r'\b', aff)]
    return NORMAL.get(max(hits)[1], max(hits)[1]) if hits else 'not stated'


def rule(x):
    pt = set(x['pubtypes'])
    blob = x['title'] + ' ' + x['abstract']
    if x['pmid'] in FALSE_IDS or FALSE.search(blob):
        return ('false_match', NOT, 'GHK here is something else (an equation, a staging system, a programme, a gene or plasmid name) or the record is unrelated; retained as a false match.')
    if pt & {'Review', 'Systematic Review', 'Meta-Analysis'}:
        return ('review', NOT, 'Review by publication type.')
    if pt & {'Letter', 'Comment', 'Editorial'}:
        return ('commentary_editorial', NOT, 'Letter, comment or editorial by publication type.')
    if not NAMED.search(blob):
        return ('other_peripheral', NOT, 'GHK is not named in the title or abstract; indexed for a generic copper-peptide or passing mention.')
    if ('Animals' in x['mesh'] and 'Humans' not in x['mesh']) or ANIMAL.search(blob):
        return ('animal_in_vivo', PRE, 'Animal work, by MeSH or by the species named in the title or abstract.')
    if CHEM.search(blob):
        return ('analytical_method', NOT, 'Chemistry of the peptide or its metal complexes (structure, binding, spectroscopy, synthesis). Not evidence about effects.')
    return ('in_vitro', PRE, 'Cell, tissue-engineering or materials work in the laboratory, by title and abstract. No administration to people or animals identified.')


def main(path: str) -> None:
    records = json.load(open(path, encoding='utf-8'))
    out = []
    for pmid, x in records.items():
        decided, by = MANUAL.get(pmid), 'manual'
        if decided is None:
            decided, by = rule(x), 'rule'
        study, (klass, included), reason = decided
        out.append({
            'pmid': pmid, 'title': x['title'] or '[no title]', 'year': x['year'], 'journal': x['journal'],
            'publicationTypes': x['pubtypes'], 'studyType': study, 'evidenceClass': klass, 'included': included,
            'primaryOrSecondary': 'secondary' if study in ('review', 'commentary_editorial') else 'primary',
            'peptideIdentityCertainty': 'formulation ingredient' if by == 'manual' and klass == 'human' and 'separable' in reason else 'stated',
            'fullTextStatus': 'abstract_only' if x['abstract'] else 'no_abstract', 'classifiedBy': by, 'reason': reason,
            'country': country(x['affiliation']), 'language': x['language'] or None, 'researchGroup': None,
        })
    out.sort(key=lambda r: (r['year'], r['pmid']))
    counts = {}
    for r in out:
        counts[r['studyType']] = counts.get(r['studyType'], 0) + 1
    standalone = [r['pmid'] for r in out if r['evidenceClass'] == 'human' and 'only investigational active' in r['reason']]
    screen = {
        'screenKey': 'ghk-cu-pubmed-2026-09',
        'peptideKey': 'ghk-cu',
        'database': 'PubMed (NCBI E-utilities esearch/efetch, db=pubmed)',
        'query': QUERY,
        'searchDate': SEARCH_DATE,
        'resultCount': len(out),
        'screenedCount': len(out),
        'stratum': None,
        'deduplication': 'One record per PMID; none removed. The query deliberately includes the bare string GHK, so false matches are a large, visible share of the ledger rather than silently excluded.',
        'inclusionCriteria': 'INCLUDED when GHK or GHK-Cu (or a formulation containing it) was administered to people, animals, tissue or cells. Chemistry of the peptide, reviews, commentary, false matches, and records about other copper peptides are retained and excluded from the evidence set. Human records testing a multi-ingredient formulation are included and marked as not separable.',
        'humanPrimaryCriteria': 'Primary human evidence requires GHK or GHK-Cu, alone or in a formulation, to have been applied or given to people with an outcome reported. Human skin in a diffusion cell is ex vivo. A device claimed to raise GHK levels, without GHK being given or measured, is not administration.',
        'notes': f"A census of {len(out)} records. Study types: " + ', '.join(f'{k} {v}' for k, v in sorted(counts.items())) + f". Human records in which GHK-Cu was the only investigational active: {len(standalone)} ({', '.join(standalone)}). Every other human record tested a formulation with other actives. No human record of injected or oral GHK-Cu was found.",
        'records': out,
    }
    with open('data/seed/literature/ghk-cu-screen.json', 'w', encoding='utf-8', newline='\n') as f:
        json.dump(screen, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(json.dumps(counts, indent=1))
    print('standalone human', standalone)


if __name__ == '__main__':
    main(sys.argv[1])
