"""
Counts the 1,112-record Thymosin beta-4 universe by stratum and by affiliation
country, writing tb4_landscape.json. The counts are carried into the screen
record as notes; they are counted, not classified.

    python scripts/literature/count-thymosin-beta-4-strata.py
"""
# -*- coding: utf-8 -*-
import io, json, sys, time, urllib.parse, urllib.request

BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
TB4 = ('"thymosin beta 4"[All Fields] OR "thymosin beta-4"[All Fields] OR '
       '"Tbeta4"[All Fields] OR "T-beta-4"[All Fields] OR "Tbeta 4"[All Fields]')

STRATA = {
    'total': '',
    'human_mesh': ' AND humans[MeSH Terms]',
    'animals_mesh': ' AND animals[MeSH Terms]',
    'trial_pt': (' AND ("clinical trial"[Publication Type] OR '
                 '"randomized controlled trial"[Publication Type] OR '
                 '"controlled clinical trial"[Publication Type])'),
    'rct_pt': ' AND "randomized controlled trial"[Publication Type]',
    'case_pt': ' AND "case reports"[Publication Type]',
    'review_pt': ' AND review[Publication Type]',
    'systematic_pt': ' AND "systematic review"[Publication Type]',
    'in_vitro_mesh': ' AND ("cells, cultured"[MeSH Terms] OR "in vitro techniques"[MeSH Terms])',
    'english': ' AND english[Language]',
    'non_english': ' AND NOT english[Language]',
    'before_2000': ' AND ("1800"[Date - Publication] : "1999"[Date - Publication])',
    'from_2000': ' AND ("2000"[Date - Publication] : "3000"[Date - Publication])',
}

COUNTRY_TERMS = {
    'china': ' AND (china[Affiliation] OR chinese[Affiliation])',
    'usa': ' AND (usa[Affiliation] OR "united states"[Affiliation])',
    'japan': ' AND japan[Affiliation]',
    'korea': ' AND korea[Affiliation]',
    'italy': ' AND italy[Affiliation]',
    'germany': ' AND germany[Affiliation]',
    'uk': ' AND ("united kingdom"[Affiliation] OR england[Affiliation])',
    'russia': ' AND russia[Affiliation]',
    'india': ' AND india[Affiliation]',
    'poland': ' AND poland[Affiliation]',
}


def get(url):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=180) as r:
                return r.read()
        except Exception as exc:  # noqa: BLE001
            if attempt == 3:
                raise
            print('  retry', exc, file=sys.stderr)
            time.sleep(3)
    raise RuntimeError('unreachable')


def count(term):
    url = BASE + 'esearch.fcgi?' + urllib.parse.urlencode(
        {'db': 'pubmed', 'term': term, 'retmax': 0, 'retmode': 'json'})
    return int(json.loads(get(url))['esearchresult']['count'])


if __name__ == '__main__':
    out = {'strata': {}, 'countries': {}}
    for key, suffix in STRATA.items():
        n = count(f'({TB4}){suffix}')
        out['strata'][key] = n
        print(f'{key:16s} {n:>6}')
        time.sleep(0.4)
    print()
    for key, suffix in COUNTRY_TERMS.items():
        n = count(f'({TB4}){suffix}')
        out['countries'][key] = n
        print(f'{key:16s} {n:>6}')
        time.sleep(0.4)
    io.open('tb4_landscape.json', 'w', encoding='utf8').write(
        json.dumps(out, indent=2))
