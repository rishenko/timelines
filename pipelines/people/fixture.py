"""Builds src/data/fixtures/people-pilot.json: a small schema 11.2 timeline holding 20 people from the people pass
(Dev C's kept.csv), to test the `people` block on real rows. A test fixture, not timeline data: no bulk add.

    python3 -I pipelines/people/fixture.py <kept.csv> [--db <data root>/wikidata/wikidata-20261116-people.sqlite]

The 20 are a seeded, stratified pick (timeline x area, both kinds of `via`), plus Darius II (Q202236), whose two
reigns on main are the case the block was designed for. born/died come from the Wikidata people store (P569/P570, year
only: the store keeps no precision); `active` is derived by the pass's own rule, and the script fails if that rule
doesn't give the pass's year.
"""
import csv
import json
import os
import random
import re
import sqlite3
import sys
import unicodedata

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'common'))
import data_root  # noqa: E402

DUMP = 'wikidatawiki-20261116'
AREAS = {'rulers-politics-military': 'Rulers, politics and military', 'culture-philosophy': 'Culture and philosophy',
         'science-tech-math': 'Science, technology and mathematics', 'religion': 'Religion'}
VIA = {'P27': 'citizenship', 'P17 of birthplace': 'birthplace'}
PICK = {'Ancient': 6, 'Medieval': 6, 'Modern': 8}


def year(t):
    m = re.match(r'([+-])0*(\d+)-', t or '')
    return (-1 if m.group(1) == '-' else 1) * int(m.group(2)) if m else None


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def active(b, d):  # the pass's activity_year (pipelines/extract/people_report.py), with the rule's name
    if b is not None and d is not None and d >= b:
        return (b + d) // 2, 'born-died'
    if b is not None:
        return b + 30, 'born'
    if d is not None:
        return d - 20, 'died'
    return None, None


def main(path, db):
    rows = list(csv.DictReader(open(path, newline='', encoding='utf-8')))
    rnd = random.Random(20261124)
    chosen = [r for r in rows if r['qid'] == 'Q202236']
    for tl, n in PICK.items():
        pool = [r for r in rows if r['timeline'] == tl and r['qid'] != 'Q202236']
        rnd.shuffle(pool)
        areas = list(AREAS)
        want = n - (1 if tl == 'Ancient' else 0)
        got = []
        while len(got) < want and pool:  # round-robin over areas so each timeline has every area it can
            for a in areas:
                r = next((x for x in pool if x['area'] == a and x not in got), None)
                if r and len(got) < want:
                    got.append(r)
            if not any(x['area'] in areas for x in pool if x not in got):
                break
        if not any(VIA[r['via']] == 'birthplace' for r in got):  # both kinds of via
            b = next((x for x in pool if VIA.get(x['via']) == 'birthplace'), None)
            if b:
                got[-1] = b
        chosen += got
    con = sqlite3.connect(f'file:{os.path.expanduser(db)}?mode=ro', uri=True)
    src = {
        'wikidata': {'name': 'Wikidata', 'tags': ['reference'], 'url': 'https://www.wikidata.org/', 'dump': DUMP},
        'people-pass': {'name': 'People pass (Wikidata occupations, citizenship and birthplace)', 'tags': ['reference'], 'dump': DUMP},
    }
    tracks, people, events = {}, {}, []
    for r in chosen:
        b, d = (year(x) for x in con.execute('select born, died from person where qid=?', (r['qid'],)).fetchone())
        y, rule = active(b, d)
        if y != int(r['year']):
            sys.exit(f"{r['qid']} {r['label']}: the rule gives {y}, the pass says {r['year']}")
        tid = slug(r['country'])
        tracks.setdefault(tid, {'id': tid, 'name': r['country'], 'color': '#7c8591'})
        pid = slug(r['label'])
        p = {'name': r['label'], 'ids': {'wikidata': r['qid']}, 'active': {'year': y, 'from': rule}}
        if b is not None:
            p['born'] = {'year': b, 'source': {'sourceKey': 'wikidata', 'sourceLocation': f"{r['qid']} P569 date of birth"}}
        if d is not None:
            p['died'] = {'year': d, 'source': {'sourceKey': 'wikidata', 'sourceLocation': f"{r['qid']} P570 date of death"}}
        p['memberships'] = [{'facet': 'area', 'value': r['area'], 'sources': [{'sourceKey': 'people-pass', 'sourceLocation': f"{r['qid']} P106 occupation"}]}]
        p['rows'] = [{'row': tid, 'via': VIA[r['via']], 'sources': [{'sourceKey': 'wikidata', 'sourceLocation': f"{r['qid']} {'P27' if r['via'] == 'P27' else 'P19 → P17'}"}]}]
        people[pid] = p
    # Darius II's two reigns, as on main (ids reign-darius-ii-persia / -egypt), now naming one person
    tracks.setdefault('egypt', {'id': 'egypt', 'name': 'Egypt', 'color': '#c8a24a'})
    for row, uuid in (('achaemenid-empire', 'reign-darius-ii-persia'), ('egypt', 'reign-darius-ii-egypt')):
        events.append({'uuid': uuid, 'title': 'Reign of Darius II', 'descr': 'Darius II reigns.', 'start': -423, 'end': -404,
                       'tracks': [row], 'sources': [{'sourceKey': 'wikidata', 'sourceLocation': 'Q202236'}], 'people': ['darius-ii']})
    ds = {
        'schemaVersion': 11, 'schemaMinor': 2,
        'meta': {'id': 'people-pilot', 'title': 'People pilot', 'description': f'{len(people)} people from the people pass (fixture).',
                 'calendar': {'before': 'BCE', 'after': 'CE', 'yearZero': False}, 'increments': [1, 10, 100], 'defaultIncrement': 100,
                 'facets': {'area': {'name': 'Area', 'applies': 'people', 'values': {k: {'name': v} for k, v in AREAS.items()}}}},
        'tracks': sorted(tracks.values(), key=lambda t: t['id']), 'sources': src, 'tags': {'reference': {'name': 'Reference'}},
        'events': events, 'people': dict(sorted(people.items())),
    }
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'data', 'fixtures', 'people-pilot.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(ds, f, ensure_ascii=False, indent=2)
        f.write('\n')
    by = {}
    for r in chosen:
        by.setdefault(r['timeline'], []).append(r['area'][:4])
    print(f"{len(people)} people · " + ' · '.join(f"{k} {len(v)} ({', '.join(sorted(set(v)))})" for k, v in by.items())
          + f" · via birthplace {sum(VIA[r['via']] == 'birthplace' for r in chosen)}")


if __name__ == '__main__':
    a = sys.argv[1:]
    db = a[a.index('--db') + 1] if '--db' in a else data_root.where('wikidata', 'wikidata-20261116-people.sqlite')
    main(a[0], db)
