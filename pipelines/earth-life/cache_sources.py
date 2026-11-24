"""
Fills the source caches the Earth and Life events read (evidence.py), for whatever events_data.py names and isn't cached yet:
  Europe PMC records by DOI, open-access full texts by PMC id, and the Smithsonian species pages.
The fetching and the cache layout are the shared module pipelines/common/source_cache.py. Run once per new source:
  python3 -I pipelines/earth-life/cache_sources.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
sys.path.insert(0, HERE)
import events_data  # noqa: E402
import source_cache  # noqa: E402


def main():
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
        r = source_cache.fetch_paper(doi)
        if r != 'have':
            print(r, doi)
    for p in sorted(pmcids):
        if source_cache.fetch_oa(p) != 'have':
            print('cached', p)
    for page in sorted(pages):
        if source_cache.fetch_si(page) != 'have':
            print('cached', page)


if __name__ == '__main__':
    main()
