"""
Fetch step for the Thymosin beta-4 / TB-500 screens.

Writes tb4_human_stratum.json and tb500_all.json to the working directory,
from the exact PubMed queries the screening script records. Run in a scratch
directory, then pass that directory to screen-thymosin-beta-4.py.

    python scripts/literature/fetch-thymosin-beta-4.py
"""
# -*- coding: utf-8 -*-
import io, json, re, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
TB4 = ('"thymosin beta 4"[All Fields] OR "thymosin beta-4"[All Fields] OR '
       '"Tbeta4"[All Fields] OR "T-beta-4"[All Fields] OR "Tbeta 4"[All Fields]')
TB500 = '"TB-500"[All Fields] OR "TB500"[All Fields] OR "TB 500"[All Fields]'

ADMIN = ('("administered"[All Fields] OR "administration"[All Fields] OR '
         '"treated with"[All Fields] OR "therapy"[All Fields] OR '
         '"treatment"[All Fields] OR "injection"[All Fields] OR '
         '"eye drops"[All Fields] OR "topical"[All Fields] OR '
         '"placebo"[All Fields] OR "volunteers"[All Fields] OR '
         '"patients"[All Fields])')

STRATA = {
    'tb4_human_stratum': (
        f'({TB4}) AND ('
        f'"clinical trial"[Publication Type] OR '
        f'"randomized controlled trial"[Publication Type] OR '
        f'"controlled clinical trial"[Publication Type] OR '
        f'"clinical trial, phase i"[Publication Type] OR '
        f'"clinical trial, phase ii"[Publication Type] OR '
        f'"clinical trial, phase iii"[Publication Type] OR '
        f'"case reports"[Publication Type] OR '
        f'"observational study"[Publication Type] OR '
        f'"multicenter study"[Publication Type] OR '
        f'(humans[MeSH Terms] AND {ADMIN} AND '
        f'("thymosin beta 4"[Title/Abstract] OR "thymosin beta-4"[Title/Abstract] OR '
        f'"Tbeta4"[Title/Abstract] OR "TB4"[Title/Abstract])))'
    ),
    'tb500_all': TB500,
}


def get(url, data=None):
    req = urllib.request.Request(url, data=data.encode() if data else None)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                return r.read()
        except Exception as exc:  # noqa: BLE001
            if attempt == 3:
                raise
            print('  retry', attempt + 1, exc, file=sys.stderr)
            time.sleep(4)
    raise RuntimeError('unreachable')


def esearch(term, retmax=0):
    url = BASE + 'esearch.fcgi?' + urllib.parse.urlencode(
        {'db': 'pubmed', 'term': term, 'retmax': retmax, 'retmode': 'json'})
    return json.loads(get(url))['esearchresult']


def efetch(ids):
    out = []
    for i in range(0, len(ids), 180):
        chunk = ids[i:i + 180]
        data = urllib.parse.urlencode(
            {'db': 'pubmed', 'retmode': 'xml', 'id': ','.join(chunk)})
        out.append(get(BASE + 'efetch.fcgi', data))
        time.sleep(0.5)
    return out


def parse(chunks):
    recs = []
    for raw in chunks:
        root = ET.fromstring(raw)
        for art in root.iter('PubmedArticle'):
            m = art.find('MedlineCitation')
            a = m.find('Article')
            title_el = a.find('ArticleTitle')
            ab = a.find('Abstract')
            affils = [x.text for x in a.findall('.//Affiliation') if x.text]
            recs.append({
                'pmid': m.findtext('PMID'),
                'title': ''.join(title_el.itertext()) if title_el is not None else '',
                'abstract': ' '.join(''.join(x.itertext()) for x in ab.findall('AbstractText'))
                            if ab is not None else '',
                'year': (a.findtext('.//PubDate/Year')
                         or a.findtext('.//PubDate/MedlineDate') or '')[:4],
                'journal': a.findtext('.//Journal/Title') or '',
                'ptypes': [p.text for p in a.findall('.//PublicationType')],
                'mesh': [x.findtext('DescriptorName') for x in m.findall('.//MeshHeading')],
                'lang': a.findtext('.//Language') or '',
                'affiliations': affils[:4],
                'authors': [
                    ((au.findtext('LastName') or '') + ' ' + (au.findtext('Initials') or '')).strip()
                    for au in a.findall('.//Author')][:12],
            })
    return recs


if __name__ == '__main__':
    summary = {}
    for name, term in STRATA.items():
        d = esearch(term, retmax=2000)
        ids = d['idlist']
        print(f'{name}: {d["count"]} records')
        recs = parse(efetch(ids))
        io.open(f'{name}.json', 'w', encoding='utf8').write(
            json.dumps(recs, indent=0, ensure_ascii=False))
        summary[name] = {'count': int(d['count']), 'query': d.get('querytranslation')}
    io.open('tb4_strata.json', 'w', encoding='utf8').write(
        json.dumps(summary, indent=2, ensure_ascii=False))
    print('done')
