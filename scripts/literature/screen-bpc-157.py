"""
BPC-157 literature screen.

Turns a PubMed result set into a screening ledger. It is deliberately a script
rather than a conversation: the point of the ledger is that somebody can re-run
the query, re-run this file, and get the same classification without trusting
an opaque judgement made once.

Two passes, and the ledger records which one classified each record:

  rule    a deterministic ladder over MeSH headings and PubMed publication
          types. Reliable for separating animal work, reviews and commentary,
          which is most of the corpus.
  manual  an adjudication written down here by hand, with the reason. Every
          record the human screen flagged is adjudicated this way, because
          publication type is exactly the field that is missing or wrong on the
          records that matter most: none of the three human studies found here
          carries a "Clinical Trial" publication type.

    python scripts/literature/screen-bpc-157.py <records.json> <out.json>
"""
import io
import json
import re
import sys
from collections import Counter

# --- The search that defines the universe ------------------------------------
# "PL-10" was tested and rejected: it matches 158 unrelated records (a common
# laboratory string) and would have made the universe mostly noise. The
# development codes that are unambiguous are kept.
QUERY = '"BPC 157"[All Fields] OR "body protection compound 157"[All Fields] OR "PL 14736"[All Fields]'
DATABASE = 'PubMed (NCBI E-utilities esearch/efetch, db=pubmed)'
SEARCH_DATE = '2026-09-13'
EXPECTED_TOTAL = 230

DEDUPLICATION = (
    'PubMed returns one record per PMID, so within this database the result set '
    'carries no duplicates and none were removed. Records that report the same '
    'underlying study in different journals are NOT deduplicated here: this is a '
    'screen of publications, not of studies, and collapsing them would hide that '
    'one research group accounts for most of the corpus. A withdrawn article and '
    'its erratum are kept and marked rather than dropped.'
)

INCLUSION = (
    'A record is INCLUDED as evidence about BPC-157 when it reports original '
    'observations in which BPC-157 or an identified analogue was administered or '
    'applied, or when it characterises the compound itself. Reviews, commentary, '
    'editorials, replies and records that only mention the compound in passing '
    'are EXCLUDED from the evidence set and retained in the ledger, because a '
    'count of publications must never be read as a count of studies.'
)

HUMAN_PRIMARY_CRITERIA = (
    'A record counts as primary human evidence only when BPC-157 was administered '
    'to human beings and an outcome in those people was reported. A human tissue '
    'or plasma sample studied in a dish is not a person; a human measurement taken '
    'in a study whose BPC-157 arm was in rats is not human evidence for BPC-157; '
    'and a review asserting that trials happened is not a trial report.'
)

# --- Hand adjudication -------------------------------------------------------
# pmid: (category, included, primary_or_secondary, identity_certainty, reason)
MANUAL = {
    '40131143': (
        'human_interventional', True, 'primary', 'stated',
        'BPC-157 given intravenously to 2 adults (10 mg, then 20 mg, one-hour '
        'infusions) with blood work and vital signs before and after. Original '
        'human observations, so primary human evidence. Two participants, no '
        'control, no blinding, single private clinic, and both had received '
        'intravenous BPC-157 before the study. It reports what was measured; it '
        'does not establish safety.',
    ),
    '39325560': (
        'human_interventional', True, 'primary', 'stated',
        'BPC-157 (10 mg total) injected around the bladder in 12 women with '
        'interstitial cystitis during a single cystoscopy, outcome by Global '
        'Response Assessment questionnaire. Original human observations. '
        'Uncontrolled, unblinded, single arm, single clinic, self-reported '
        'outcome, and the material was compounded by a 503A pharmacy rather than '
        'a characterised investigational product.',
    ),
    '34324435': (
        'human_observational', True, 'primary', 'stated',
        'Retrospective one-year chart review of 17 patients given intra-articular '
        'BPC-157, alone or with thymosin beta-4, followed up by telephone survey. '
        'Original human observations, so primary. Retrospective, unblinded, no '
        'validated instrument, and part of the cohort received two peptides, so '
        'an effect cannot be attributed to either.',
    ),
    '22204800': (
        'animal_in_vivo', True, 'primary', 'stated',
        'Adjudicated as animal evidence. The BPC-157 intervention was in rats. '
        'The human component is oesophageal manometry in acute pancreatitis '
        'patients who were not given BPC-157, so the paper carries a human '
        'measurement and no human evidence about this compound. A screen reading '
        'the MeSH heading "Humans" would have miscounted it.',
    ),
    '17186181': (
        'review', False, 'secondary', 'stated',
        'A review, excluded from the evidence set, but flagged: it asserts that '
        'BPC-157 was "safe in clinical trials for inflammatory bowel disease '
        '(PL 10, PLD 116, PLD 14736, Pliva, Croatia)". No report of those trials '
        'appears in this search universe. The assertion is a lead, not evidence, '
        'and those trials are a named gap.',
    ),
    '42198317': (
        'review', False, 'secondary', 'stated',
        'Narrative review of the development position, searched to April 2026 '
        'across PubMed/MEDLINE, Embase and Cochrane plus patent and regulator '
        'sources. States there is no approved formulation, no validated dosing '
        'regimen and no completed Phase II trial. Excluded as evidence; retained '
        'because it is an independent check on the assertion in PMID 17186181.',
    ),
    '40756949': (
        'review', False, 'secondary', 'stated',
        'Systematic review in an orthopaedic journal, searched to 3 June 2024, '
        'two screeners: 544 records identified, 36 studies included (35 '
        'preclinical, 1 clinical), and "No clinical safety data were found". '
        'Excluded as evidence; it is the closest thing to an independent '
        'replication of this screen and reaches the same shape of answer.',
    ),
    '28035768': (
        'human_pk_safety', True, 'primary', 'stated',
        'Analytical: confiscated vials identified as BPC-157, in vitro plasma '
        'metabolism, and a validated urine detection method. Included as '
        'characterisation of the compound and its human metabolite, which is what '
        'a doping-control method establishes. It says nothing about effect or '
        'safety in a person.',
    ),
    '37959764': (
        'human_pk_safety', True, 'primary', 'stated',
        'In vitro metabolic profiling with stable-isotope-labelled BPC-157 and a '
        'validated method for the parent and five metabolites in human urine. '
        'Same category and same limit as PMID 28035768: metabolite identity, not '
        'clinical effect.',
    ),
    '42328738': (
        'other_peripheral', False, 'primary', 'stated',
        'Doping-control analytical workflow covering many agents, of which '
        'BPC-157 is one. Not a study of the compound.',
    ),
    '42123471': (
        'other_peripheral', False, 'secondary', 'uncertain',
        'Review of peptides in aesthetic, metabolic and endocrine conditions. '
        'BPC-157 is not named in the title or abstract; the record entered the '
        'universe on a full-text match. Peripheral mention.',
    ),
    '39865815': (
        'withdrawn', False, 'primary', 'stated',
        'Withdrawn by the publisher at the authors request. A rat study. Kept in '
        'the ledger and excluded from the evidence set: a withdrawal that '
        'disappears from a count is a count that cannot be audited.',
    ),
    '35126157': (
        'other_peripheral', False, 'secondary', 'stated',
        'Corrigendum to a rat study. Carries no findings of its own.',
    ),
    '41155565': (
        'commentary_editorial', False, 'secondary', 'stated',
        'Comment defending BPC-157 against a review that raised tumorigenesis and '
        'neurodegeneration concerns, asserting "prominent anti-tumor potential, '
        'in vivo and in vitro". One side of the live dispute this index records '
        'rather than resolves.',
    ),
    '41155566': (
        'commentary_editorial', False, 'secondary', 'stated',
        'The reviewed authors reply to PMID 41155565. The other side of the same '
        'exchange.',
    ),
    '42123221': (
        'ex_vivo', True, 'primary', 'stated',
        'Human internal mammary artery rings from 12 patients undergoing coronary '
        'bypass, endothelium-intact and denuded, exposed to BPC-157 in an organ '
        'bath. Human tissue, and therefore NOT human evidence under this screen: '
        'nobody was given the compound. It is the strongest tissue-level evidence '
        'in the corpus and it is still preclinical.',
    ),
    '42555375': (
        'in_vitro', True, 'primary', 'stated',
        'Fabrication and physicochemical characterisation of a chitosan hydrogel '
        'carrying BPC-157. A materials study of a delivery vehicle.',
    ),
    '30191288': (
        'in_vitro', True, 'primary', 'stated',
        'Recombinant Lactococcus lactis engineered to display or secrete BPC-157. '
        'Bacterial expression work; no animal or human administration.',
    ),
    '34571768': (
        'animal_in_vivo', True, 'primary', 'stated',
        'BPC-157 fed to adult honeybees, with haemolymph and gland measurements. '
        'Animal in vivo, in an invertebrate — recorded as such rather than left '
        'unclassified, because the species is the whole of what the result means.',
    ),
    '34680419': (
        'animal_in_vivo', True, 'primary', 'stated',
        'Rat alcohol-induced gastric lesion model. Rule-classified as '
        'unclassifiable only because the abstract names the species late.',
    ),
    '39776466': (
        'other_peripheral', False, 'secondary', 'stated',
        'Survey of the direct-to-consumer compounded GLP-1 market in Colorado. '
        'BPC-157 appears as one of the compounds offered. Not a study of it.',
    ),
    '17657443': (
        'review', False, 'secondary', 'stated',
        'Narrative review of reported effects across organ systems. Also the '
        'earliest record here to state the sequence and a molecular weight '
        '(1419) for the pentadecapeptide.',
    ),
    '40005999': (
        'review', False, 'secondary', 'stated',
        'Literature and patent review raising the possibility that the compound '
        'pro-angiogenic activity could favour tumorigenesis, and stating it is '
        'not approved by the FDA for absence of sufficient clinical study. The '
        'review that PMID 41155565 answers.',
    ),
}

CATEGORIES = (
    'human_interventional',
    'human_observational',
    'case_report',
    'human_pk_safety',
    'animal_in_vivo',
    'ex_vivo',
    'in_vitro',
    'review',
    'commentary_editorial',
    'other_peripheral',
    'withdrawn',
)

ANIMAL_MESH = {'Animals', 'Rats', 'Mice', 'Dogs', 'Rabbits', 'Swine', 'Zebrafish', 'Chick Embryo'}
IN_VITRO = re.compile(
    r'\b(in vitro|cell (line|culture)|cultured (cells?|myoblast)|HUVEC|'
    r'tube formation assay|molecular docking|in silico|homology model)\b', re.I)
EX_VIVO = re.compile(r'\b(ex vivo|isolated (organ|tissue|aorta|ileum|colon)|tissue bath)\b', re.I)
ANIMAL_WORDS = re.compile(
    r'\b(rats?|mice|mouse|murine|rabbits?|canine|porcine|chicks?|zebrafish|'
    r'in vivo model|animal model)\b', re.I)


def classify(rec):
    """Returns (category, included, primary, certainty, reason, how)."""
    pmid = rec['pmid']
    if pmid in MANUAL:
        cat, inc, prim, cert, reason = MANUAL[pmid]
        return cat, inc, prim, cert, reason, 'manual'

    types = set(rec['ptypes'])
    mesh = set(rec['mesh'])
    tiab = rec['title'] + ' ' + rec['abstract']

    if 'Retracted Publication' in types:
        return ('withdrawn', False, 'primary', 'stated',
                'Retracted or withdrawn publication type.', 'rule')
    if types & {'Editorial', 'Comment', 'Letter'}:
        return ('commentary_editorial', False, 'secondary', 'stated',
                'PubMed publication type is editorial, comment or letter.', 'rule')
    if 'Review' in types:
        return ('review', False, 'secondary', 'stated',
                'PubMed publication type is review. Retained in the ledger, '
                'excluded from the evidence set.', 'rule')
    if mesh & ANIMAL_MESH or ANIMAL_WORDS.search(tiab):
        return ('animal_in_vivo', True, 'primary', 'stated',
                'Animal MeSH heading or animal model named in title or abstract, '
                'with no human administration adjudicated.', 'rule')
    if EX_VIVO.search(tiab):
        return ('ex_vivo', True, 'primary', 'stated',
                'Isolated tissue or organ preparation.', 'rule')
    if IN_VITRO.search(tiab):
        return ('in_vitro', True, 'primary', 'stated',
                'Cell, culture or computational work only.', 'rule')
    return ('other_peripheral', False, 'primary', 'uncertain',
            'No animal, tissue, cell or human design could be read from the '
            'record. Needs a full-text look before it is counted as anything.',
            'rule')


def main(src, dest):
    recs = json.load(io.open(src, encoding='utf8'))
    if len(recs) != EXPECTED_TOTAL:
        print('warning: %d records, expected %d' % (len(recs), EXPECTED_TOTAL))

    rows = []
    for r in sorted(recs, key=lambda x: (-int(x['year'] or 0), x['pmid'])):
        cat, inc, prim, cert, reason, how = classify(r)
        assert cat in CATEGORIES, cat
        rows.append({
            'pmid': r['pmid'],
            'title': r['title'],
            'year': r['year'],
            'journal': r['journal'],
            'publicationTypes': r['ptypes'],
            'studyType': cat,
            'evidenceClass': (
                'human' if cat.startswith('human') or cat == 'case_report'
                else 'preclinical' if cat in ('animal_in_vivo', 'ex_vivo', 'in_vitro')
                else 'not_evidence'),
            'included': inc,
            'primaryOrSecondary': prim,
            'peptideIdentityCertainty': cert,
            'fullTextStatus': 'abstract_only',
            'classifiedBy': how,
            'reason': reason,
        })

    # Nothing may be left in the corpus that the rules could not read. The
    # fallback branch exists to surface records for adjudication, not to be a
    # resting place: a record sitting there is a record nobody has decided about,
    # and it would still be counted in whatever total it landed in.
    unadjudicated = [r['pmid'] for r in rows
                     if r['classifiedBy'] == 'rule'
                     and r['peptideIdentityCertainty'] == 'uncertain']
    if unadjudicated:
        raise SystemExit(
            'unadjudicated records, add them to MANUAL: ' + ', '.join(unadjudicated))

    screen = {
        'screenKey': 'bpc-157-pubmed-2026-09',
        'peptideKey': 'bpc-157',
        'database': DATABASE,
        'query': QUERY,
        'searchDate': SEARCH_DATE,
        'resultCount': len(rows),
        'deduplication': DEDUPLICATION,
        'inclusionCriteria': INCLUSION,
        'humanPrimaryCriteria': HUMAN_PRIMARY_CRITERIA,
        'records': rows,
    }
    io.open(dest, 'w', encoding='utf8', newline='\n').write(
        json.dumps(screen, indent=2, ensure_ascii=False) + '\n')

    counts = Counter(r['studyType'] for r in rows)
    print('%d records\n' % len(rows))
    for k in CATEGORIES:
        if counts[k]:
            print('  %4d  %s' % (counts[k], k))
    print('\n  included as evidence: %d' % sum(1 for r in rows if r['included']))
    # Studies in people. Not the same as records with a human matrix: two of the
    # human-class rows here are doping-control methods validated in human urine,
    # in which nobody was given anything.
    print('  studies in people:    %d' % sum(
        1 for r in rows
        if r['included'] and r['primaryOrSecondary'] == 'primary'
        and r['studyType'] in ('human_interventional', 'human_observational', 'case_report')))
    print('  hand-adjudicated:     %d' % sum(1 for r in rows if r['classifiedBy'] == 'manual'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
