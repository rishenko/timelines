"""Pilot of the list-row parser on named rows: prints what each row gives (year, toll, location, quote, list) and writes
pilot-disasters-bulk10.json for the harvest (HARVEST_PILOT=pilot-disasters-bulk10.json HARVEST_NAME=disaster-bulk10), whose
quote-gated article dates then check the row's year.

    pipelines/extract/.venv/bin/python -I pipelines/v2/pilot_list_rows.py
"""
import json
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path[:0] = [os.path.join(ROOT, 'pipelines', 'common'), os.path.join(ROOT, 'pipelines', 'extract'), HERE]
import settings  # noqa: E402

settings.take_flags([])
import regions  # noqa: E402
import wp_dump  # noqa: E402
import list_rows as L  # noqa: E402
from routes_dry_run import LISTS, place_in  # noqa: E402

WANT = ['Mount Tai earthquake', '479 BC Potidaea earthquake', '893 Ardabil earthquake', 'Mustansirite Hardship', 'Great Famine of 1315–1317',
        'Plague of Justinian', '512 Shaanxi earthquake', 'Yōwa famine', 'Chinese famine of 1333–1337', '684 Hakuhō earthquake']
db = sqlite3.connect(f'file:{os.path.join(settings.WIKIPEDIA, "extract-" + settings.DUMP_NAME + ".sqlite")}?mode=ro', uri=True)
exists = lambda t: bool(db.execute('SELECT 1 FROM page WHERE title=? AND ns=0', (t,)).fetchone())  # noqa: E731
found = {}
for lt in LISTS:
    pg = wp_dump.page(lt)
    if not pg:
        continue
    for r in L.rows(pg['text'], exists):
        if r.get('article') in WANT and r['article'] not in found:
            found[r['article']] = {**r, 'list': lt}
for t in WANT:
    r = found.get(t)
    print(t, '->', 'NO ROW' if not r else (r['year'], r['month'], r['day'], r['toll'], r['location'], '|', r['dateQuote'][:50], '|', r['list'][8:30]))
seeds = []
for t, r in found.items():
    names = [n for n in regions.NAMES if n in r['location']][:2] or [n for n in ('China', 'Japan') if n in r['list']]
    seeds.append({'title': t, 'sub': 'earthquake' if 'quake' in t else 'famine' if 'amine' in t else 'epidemic', 'countries': names,
                  'region': place_in(r['location'] + ' ' + r['list']) or 'unplaced', 'from': 'list', 'rowYear': r['year'], 'rowQuote': r['dateQuote']})
json.dump({'_note': 'Row-parser pilot: named list rows', 'events': seeds}, open(os.path.join(HERE, 'pilot-disasters-bulk10.json'), 'w'), indent=1, ensure_ascii=False)
