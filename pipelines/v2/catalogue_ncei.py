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
import re
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from emit import src_loc  # noqa: E402
SEED = json.load(open(os.path.join(HERE, 'pilot-catalogue.json')))
CACHE = os.path.join(HERE, 'catalogue', 'ncei-records.json')
WINDOWS = json.load(open(os.path.join(HERE, 'rules', 'disasters.json')))['windows']
PAGE = {'earthquakes': 'earthquake', 'volcanoes': 'volcano', 'tsunamis/events': 'tsunami'}
SHORT = {'earthquakes': 'eq', 'volcanoes': 'vol', 'tsunamis/events': 'tsu'}


def fetch():
    out = {}
    for e in [x for s in SEED['events'] for x in [s, *s.get('also', [])]]:
        q = urllib.parse.urlencode({'country': e['country'], 'minYear': -5000, 'maxYear': 1499, 'itemsPerPage': 200})
        items = json.load(urllib.request.urlopen(f"{SEED['api']}/{e['hazard']}?{q}", timeout=60))['items']
        rec = next((r for r in items if r['id'] == e['id']), None)
        if not rec:
            raise SystemExit(f"{e.get('label', e['id'])}: record {e['id']} not found under {e['country']}")
        out[f"{SHORT[e['hazard']]}-{e['id']}"] = rec
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump({'fetched': os.environ.get('FETCH_DATE', '2026-11-24'), 'api': SEED['api'], 'records': out}, open(CACHE, 'w'), indent=1, sort_keys=True)
    print(f'{len(out)} records cached')


def astro(y):
    return y + 1 if y < 0 else y


def tcase(s):
    parts = [x.strip().title() for x in s.split(':') if x.strip()]
    return ', '.join(parts[1:] if len(parts) > 1 else parts)


def descr(recs, label):
    """One line from the record's own fields: place, magnitude, deaths. Nothing typed."""
    r = recs[0]
    kind = 'Eruption' if 'vei' in r else 'Earthquake'
    place = r.get('locationName') or r.get('name') or ''
    bits = []
    if r.get('eqMagnitude'):
        bits.append(f"magnitude {r['eqMagnitude']}")
    if r.get('vei'):
        bits.append(f"VEI {r['vei']}")
    toll = next((x[k] for x in recs for k in ('deathsTotal', 'deaths') if x.get(k)), None)
    if toll:
        bits.append(f"{toll:,} deaths")
    s = f"{kind} in {tcase(place)}" if place else kind
    return s + (': ' + ', '.join(bits) if bits else '') + ' (NCEI record).'


def emit():
    cache = json.load(open(CACHE))
    wp = {}
    wpf = os.path.expanduser(os.path.join(os.environ.get('TIMELINES_DATA', '~/data'), 'v2', 'candidates', 'catalogue-wp.jsonl'))
    if os.path.exists(wpf):
        for line in open(wpf):
            c = json.loads(line)
            wp[c['wp']['title']] = c
    out = {}
    for e in SEED['events']:
        key = f"{SHORT[e['hazard']]}-{e['id']}"
        recs = [cache['records'][key]] + [cache['records'][f"{SHORT[a['hazard']]}-{a['id']}"] for a in e.get('also', [])]
        keys = [key] + [f"{SHORT[a['hazard']]}-{a['id']}" for a in e.get('also', [])]
        kinds = [e['hazard']] + [a['hazard'] for a in e.get('also', [])]
        r = recs[0]
        y = astro(r['year'])
        tl = next(t for t, (a, b) in WINDOWS.items() if (a is None or y >= a) and (b is None or y <= b))
        rows = e['rows'].get(tl)
        if not rows:
            raise SystemExit(f"{e['label']}: no rows for {tl}")
        refs = []
        for k, h, rec in zip(keys, kinds, recs):
            parts = [f"year {rec['year']}"] + ([f"month {rec['month']}"] if rec.get('month') else []) + ([f"day {rec['day']}"] if rec.get('day') else [])
            refs.append({'sourceKey': f"ncei-{k}", 'sourceLocation': f"{PAGE[h]} record {rec['id']}: " + ', '.join(parts)})
        ev = {'uuid': f"disaster-ncei-{key}", 'title': e['label'], 'descr': descr(recs, e['label']), 'start': y, 'tracks': rows}
        if r.get('month'):
            ev['startMonth'] = r['month']
        if r.get('day'):
            ev['startDay'] = r['day']
        t = out.setdefault(tl, {'events': [], 'sources': {}})
        for k, h, rec in zip(keys, kinds, recs):
            t['sources'][f"ncei-{k}"] = {'name': f"NCEI/WDS Global Significant {'Earthquake' if h == 'earthquakes' else 'Volcanic Eruptions' if h == 'volcanoes' else 'Tsunami'} Database, record {rec['id']}",
                                         'url': f"https://www.ngdc.noaa.gov/hazel/view/hazards/{PAGE[h]}/event-more-info/{rec['id']}",
                                         'accessed': cache['fetched'], 'tags': ['catalogue']}
        c = wp.get(e.get('wiki'))
        if c:  # a Wikipedia article agreeing with the record's date is a second source, with its quoted sentence
            q = next((d for d in c['dates'] if d['from'] == 'wikipedia' and d['year'] == r['year']), None)
            if q:
                wkey = 'wp-' + re.sub(r'[^a-z0-9]+', '-', c['wp']['title'].lower()).strip('-')
                refs.append({'sourceKey': wkey, 'sourceLocation': src_loc(q)})
                t['sources'][wkey] = {'name': f"{c['wp']['title']} (Wikipedia)", 'url': 'https://en.wikipedia.org/wiki/' + c['wp']['title'].replace(' ', '_'),
                                      'accessed': c['harvest']['at'], 'tags': ['wikipedia']}
        ev['sources'] = refs
        ev['memberships'] = [{'facet': 'category', 'value': e['sub'], 'sources': refs}]
        t['events'].append(ev)
    for tl, v in out.items():
        v['events'].sort(key=lambda x: (x['start'], x['uuid']))
        path = os.path.join(HERE, 'emitted', f'catalogue-{tl}.json')
        json.dump({'note': 'Emitted by pipelines/v2/catalogue_ncei.py from the NCEI records cached in pipelines/v2/catalogue/; merged by the generators.', **v},
                  open(path, 'w'), indent=1, ensure_ascii=False)
        open(path, 'a').write('\n')
        print(f'{tl}: {len(v["events"])} events')


if __name__ == '__main__':
    {'fetch': fetch, 'emit': emit}[sys.argv[1]]()
