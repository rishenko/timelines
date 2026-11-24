"""
Catalogue pilot (Kevin, 2026-11-24): NOAA NCEI/WDS significant earthquakes, volcanic eruptions and tsunamis as a named source, each
event cited by its catalogue record id. Two steps, so a run needs the network only once:

    python3 -I pipelines/v2/catalogue_ncei.py fetch   # reads pilot-catalogue.json, caches the records in pipelines/v2/catalogue/ncei-records.json
    python3 -I pipelines/v2/catalogue_ncei.py emit    # writes pipelines/v2/emitted/catalogue-<timeline>.json (events and sources)

The date is the catalogue record's own year, month and day (month and day only where the record has them); the source is the record:
key ncei-<hazard>-<id>, tag "catalogue", url the HazEL event page. A record's toll is shown in the review file only (the records often
give an order of magnitude, not a count). Nothing is typed: change the seed and rerun.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SEED = json.load(open(os.path.join(HERE, 'pilot-catalogue.json')))
CACHE = os.path.join(HERE, 'catalogue', 'ncei-records.json')
WINDOWS = json.load(open(os.path.join(HERE, 'rules', 'disasters.json')))['windows']
PAGE = {'earthquakes': 'earthquake', 'volcanoes': 'volcano', 'tsunamis/events': 'tsunami'}
SHORT = {'earthquakes': 'eq', 'volcanoes': 'vol', 'tsunamis/events': 'tsu'}


def fetch():
    out = {}
    for e in SEED['events']:
        q = urllib.parse.urlencode({'country': e['country'], 'minYear': -5000, 'maxYear': 1499, 'itemsPerPage': 200})
        items = json.load(urllib.request.urlopen(f"{SEED['api']}/{e['hazard']}?{q}", timeout=60))['items']
        rec = next((r for r in items if r['id'] == e['id']), None)
        if not rec:
            raise SystemExit(f"{e['label']}: record {e['id']} not found under {e['country']}")
        out[f"{SHORT[e['hazard']]}-{e['id']}"] = rec
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump({'fetched': os.environ.get('FETCH_DATE', '2026-11-24'), 'api': SEED['api'], 'records': out}, open(CACHE, 'w'), indent=1, sort_keys=True)
    print(f'{len(out)} records cached')


def astro(y):
    return y + 1 if y < 0 else y


def emit():
    cache = json.load(open(CACHE))
    out = {}
    for e in SEED['events']:
        key = f"{SHORT[e['hazard']]}-{e['id']}"
        r = cache['records'][key]
        y = astro(r['year'])
        tl = next(t for t, (a, b) in WINDOWS.items() if (a is None or y >= a) and (b is None or y <= b))
        rows = e['rows'].get(tl)
        if not rows:
            raise SystemExit(f"{e['label']}: no rows for {tl}")
        skey = f"ncei-{key}"
        parts = [f"year {r['year']}"] + ([f"month {r['month']}"] if r.get('month') else []) + ([f"day {r['day']}"] if r.get('day') else [])
        loc = f"{PAGE[e['hazard']]} record {r['id']}: " + ', '.join(parts)
        ev = {'uuid': f"disaster-ncei-{key}", 'title': e['label'], 'descr': '', 'start': y, 'tracks': rows}
        if r.get('month'):
            ev['startMonth'] = r['month']
        if r.get('day'):
            ev['startDay'] = r['day']
        ev['sources'] = [{'sourceKey': skey, 'sourceLocation': loc}]
        ev['memberships'] = [{'facet': 'category', 'value': e['sub'], 'sources': ev['sources']}]
        t = out.setdefault(tl, {'events': [], 'sources': {}})
        t['events'].append(ev)
        t['sources'][skey] = {'name': f"NCEI/WDS Global Significant {'Earthquake' if e['hazard'] == 'earthquakes' else 'Volcanic Eruptions' if e['hazard'] == 'volcanoes' else 'Tsunami'} Database, record {r['id']}",
                              'url': f"https://www.ngdc.noaa.gov/hazel/view/hazards/{PAGE[e['hazard']]}/event-more-info/{r['id']}",
                              'accessed': cache['fetched'], 'tags': ['catalogue']}
    for tl, v in out.items():
        v['events'].sort(key=lambda x: (x['start'], x['uuid']))
        path = os.path.join(HERE, 'emitted', f'catalogue-{tl}.json')
        json.dump({'note': 'Emitted by pipelines/v2/catalogue_ncei.py from the NCEI records cached in pipelines/v2/catalogue/; merged by the generators.', **v},
                  open(path, 'w'), indent=1, ensure_ascii=False)
        open(path, 'a').write('\n')
        print(f'{tl}: {len(v["events"])} events')


if __name__ == '__main__':
    {'fetch': fetch, 'emit': emit}[sys.argv[1]]()
