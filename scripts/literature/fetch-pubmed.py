"""
Fetches a PubMed record set for a literature screen.

    python scripts/literature/fetch-pubmed.py "<query>" <out-dir>

Writes <out-dir>/records.json: for every PMID the query returns, the title,
abstract, publication types, MeSH headings, first affiliation, journal, year
and language, exactly as efetch returned them on the day. It decides nothing;
the per-compound screen script classifies what this captures.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'


def fetch(query: str, out: str) -> None:
    ids = json.load(urllib.request.urlopen(
        BASE + 'esearch.fcgi?db=pubmed&retmode=json&retmax=5000&term=' + urllib.parse.quote(query), timeout=60,
    ))['esearchresult']['idlist']
    records = {}
    for i in range(0, len(ids), 100):
        data = urllib.parse.urlencode({'db': 'pubmed', 'retmode': 'xml', 'id': ','.join(ids[i:i + 100])}).encode()
        root = ET.fromstring(urllib.request.urlopen(BASE + 'efetch.fcgi', data=data, timeout=120).read())
        for art in root.findall('.//PubmedArticle'):
            pmid = art.findtext('.//PMID')
            a = art.find('.//Article')
            title = a.find('ArticleTitle')
            records[pmid] = {
                'pmid': pmid,
                'title': ''.join(title.itertext()) if title is not None else '',
                'journal': art.findtext('.//Journal/ISOAbbreviation') or '',
                'year': art.findtext('.//JournalIssue/PubDate/Year')
                or (art.findtext('.//JournalIssue/PubDate/MedlineDate') or '')[:4],
                'language': art.findtext('.//Language') or '',
                'pubtypes': [p.text for p in art.findall('.//PublicationType')],
                'mesh': [m.findtext('DescriptorName') for m in art.findall('.//MeshHeading')],
                'affiliation': art.findtext('.//AffiliationInfo/Affiliation') or '',
                'abstract': ' '.join(''.join(x.itertext()) for x in a.findall('.//AbstractText')),
            }
        time.sleep(0.4)
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'records.json'), 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=1)
    print('query returned', len(ids), 'ids;', len(records), 'records written')


if __name__ == '__main__':
    fetch(sys.argv[1], sys.argv[2])
