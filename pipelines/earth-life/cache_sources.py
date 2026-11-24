"""
Fills the source caches the Earth and Life events read (evidence.py), for whatever events_data.py names and isn't cached yet:
  Europe PMC records by DOI, open-access full texts by PMC id, and the Smithsonian species pages.
Only open, programmatic endpoints are used (Europe PMC's REST API; the Smithsonian's public pages). Run once per new source:
  python3 -I pipelines/earth-life/cache_sources.py
"""
import json
import os
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
sys.path.insert(0, HERE)
import settings  # noqa: E402
import events_data  # noqa: E402


def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def main():
    pmc = os.path.join(settings.DATA, 'europepmc')
    si = os.path.join(settings.DATA, 'smithsonian')
    os.makedirs(pmc, exist_ok=True)
    os.makedirs(si, exist_ok=True)
    dois, pmcids, pages = set(), set(), set()
    for e in events_data.EVENTS:
        for c in e['claims']:
            if c['kind'] == 'paper':
                dois.add(c['source'])
            elif c['kind'] == 'oa':
                pmcids.add(c['source'])
                dois.add(c['doi'])
            elif c['kind'] == 'smithsonian':
                pages.add(c['source'])
    for doi in sorted(dois):
        f = os.path.join(pmc, doi.replace('/', '_') + '.json')
        if os.path.exists(f):
            continue
        q = urllib.parse.urlencode({'query': f'DOI:"{doi}"', 'format': 'json', 'resultType': 'core', 'pageSize': 1})
        r = json.loads(get('https://www.ebi.ac.uk/europepmc/webservices/rest/search?' + q))['resultList']['result']
        if not r:
            print('not found:', doi)
            continue
        json.dump(r[0], open(f, 'w'))
        print('cached', doi)
    for p in sorted(pmcids):
        f = os.path.join(pmc, p + '.xml')
        if not os.path.exists(f):
            open(f, 'wb').write(get(f'https://www.ebi.ac.uk/europepmc/webservices/rest/{p}/fullTextXML'))
            print('cached', p)
    for page in sorted(pages):
        f = os.path.join(si, page + '.html')
        if not os.path.exists(f):
            open(f, 'wb').write(get(f'https://humanorigins.si.edu/evidence/human-fossils/species/{page}'))
            print('cached', page)


if __name__ == '__main__':
    sys.argv[1:] = settings.take_flags(sys.argv[1:])
    main()
