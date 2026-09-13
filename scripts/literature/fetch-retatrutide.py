"""
Fetches the retatrutide PubMed record set and the ClinicalTrials.gov registrations.

    python scripts/literature/fetch-retatrutide.py <out-dir>

Writes <out-dir>/records.json (efetch: title, abstract, publication types, MeSH,
first affiliation, language) and <out-dir>/ctgov.json (ClinicalTrials.gov API v2).
Feed records.json to screen-retatrutide.py. Nothing here decides anything; it
only captures what the two databases returned on the day.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
QUERY = '(retatrutide[tiab] OR LY3437943[tiab])'


def pubmed(out: str) -> None:
    ids = json.load(urllib.request.urlopen(
        BASE + 'esearch.fcgi?db=pubmed&retmode=json&retmax=1000&term=' + urllib.parse.quote(QUERY), timeout=60,
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
        time.sleep(0.5)
    with open(os.path.join(out, 'records.json'), 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=1)
    print('pubmed', len(ids), 'ids,', len(records), 'records')


def registry(out: str) -> None:
    url = 'https://clinicaltrials.gov/api/v2/studies?' + urllib.parse.urlencode({
        'query.intr': 'retatrutide OR LY3437943', 'pageSize': 100, 'format': 'json',
        'fields': 'NCTId,BriefTitle,Acronym,Phase,OverallStatus,StartDate,PrimaryCompletionDate,'
                  'Condition,EnrollmentCount,LocationCountry,LeadSponsorName',
    })
    data = json.load(urllib.request.urlopen(url, timeout=60))
    with open(os.path.join(out, 'ctgov.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print('clinicaltrials.gov', len(data.get('studies', [])), 'studies')


if __name__ == '__main__':
    target = sys.argv[1]
    os.makedirs(target, exist_ok=True)
    pubmed(target)
    registry(target)
