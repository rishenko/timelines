"""
Candidates for the thin cells of the disasters bulk (Africa Medieval, South Asia both eras, East Asia Ancient, SE Asia / Oceania Medieval,
Americas Medieval), from two routes, as a review table (nothing is emitted):
  - the parsed Wikipedia list rows (list_rows.py): article, the row's quoted date, toll, region;
  - the NOAA NCEI/WDS significant-hazard catalogue (earthquakes, eruptions, tsunamis) by country: record id, year (month, day), toll,
    magnitude. NCEI records have no article; they would cite the record, as in the catalogue pilot.

    pipelines/extract/.venv/bin/python -I pipelines/v2/thin_cells.py OUT.md
"""
import json
import os
import sqlite3
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path[:0] = [os.path.join(ROOT, 'pipelines', 'common'), os.path.join(ROOT, 'pipelines', 'extract'), HERE]
import settings  # noqa: E402

settings.take_flags([])
import list_rows as L  # noqa: E402
import regions  # noqa: E402
import wp_dump  # noqa: E402
from routes_dry_run import LISTS, place_in  # noqa: E402

API = 'https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1'
CELLS = [('Africa', 1), ('South Asia', 0), ('South Asia', 1), ('East Asia', 0), ('SE Asia / Oceania', 1), ('Americas', 1)]
ERA = ['Ancient (< 650)', 'Medieval (650–1499)']
HAZ = [('earthquakes', 'earthquake'), ('volcanoes', 'eruption'), ('tsunamis/events', 'tsunami')]


def era(y):
    return 0 if y < 650 else 1 if y < 1500 else None


def ncei(country, hazard):
    q = urllib.parse.urlencode({'country': country, 'minYear': -5000, 'maxYear': 1499, 'itemsPerPage': 200})
    try:
        return json.load(urllib.request.urlopen(f'{API}/{hazard}?{q}', timeout=60))['items']
    except Exception:
        return []


def main(out):
    db = sqlite3.connect(f'file:{os.path.join(settings.WIKIPEDIA, "extract-" + settings.DUMP_NAME + ".sqlite")}?mode=ro', uri=True)
    exists = lambda t: bool(db.execute('SELECT 1 FROM page WHERE title=? AND ns=0', (t,)).fetchone())  # noqa: E731
    cand = {c: [] for c in CELLS}
    for lt in LISTS:
        pg = wp_dump.page(lt)
        if not pg or wp_dump.ai_flagged(pg['text']):
            continue
        for r in L.rows(pg['text'], exists):
            e = era(r['year'])
            reg = place_in(r['location'] + ' ' + r['event'] + ' ' + lt)
            if e is not None and (reg, e) in cand:
                cand[(reg, e)].append({'src': 'list', 'who': r['article'] or r['event'][:60] or '(no name)', 'article': bool(r['article']), 'year': r['year'], 'month': r['month'],
                                       'day': r['day'], 'quote': r['dateQuote'][:50], 'toll': r['toll'], 'where': r['location'][:40] or lt[8:30]})
    seen = set()
    for reg in {c[0] for c in CELLS}:
        names = [n for n, v in regions.LOOKUP.items() if v == reg and n[0].isupper() and not n.startswith(('The ', 'the ')) and n not in ('Africa', 'Oceania', 'Polynesia', 'Micronesia', 'Melanesia', 'Southeast Asia', 'Hawaii', 'Guam', 'Tibet', 'Bengal', 'Kashmir', 'Sahel', 'Réunion', 'Western Sahara', 'North America', 'South America', 'Central America', 'Alaska', 'California', 'Louisiana', 'Florida', 'Texas', 'Oklahoma', 'Missouri', 'Mississippi', 'Alabama')]
        for n in names:
            for hz, kind in HAZ:
                for it in ncei(n if hz == 'volcanoes' else n.upper(), hz):
                    key = (hz, it['id'])
                    y = it.get('year')
                    if y is None or key in seen or (reg, era(y) if era(y) is not None else -1) not in cand:
                        continue
                    if it.get('country') and it['country'].upper() != n.upper():
                        continue  # the API returned a record of another country
                    seen.add(key)
                    toll = it.get('deathsTotal') or it.get('deaths') or 0
                    cand[(reg, era(y))].append({'src': 'NCEI', 'who': f"{kind} record {it['id']}", 'article': False, 'year': y, 'month': it.get('month'), 'day': it.get('day'),
                                                'quote': f"year {y}" + (f", month {it['month']}" if it.get('month') else '') + (f", day {it['day']}" if it.get('day') else ''),
                                                'toll': float(toll), 'mag': it.get('eqMagnitude') or it.get('vei'), 'where': (it.get('locationName') or it.get('name') or n)[:50]})
    md = ['### Thin-cell candidates (Dev C, 2026-11-24; candidates only, nothing emitted)', '',
          'Two routes: parsed list rows (article, the row\'s quoted date) and the NCEI catalogue (a record id, its own year). Ranked by toll; 12 per cell shown. '
          '"Article" means the row links an event article (the quote gate can run on it); NCEI records cite the record instead.', '']
    for c in CELLS:
        rows = sorted(cand[c], key=lambda x: (-x['toll'], x['year']))
        md += [f'#### {c[0]}, {ERA[c[1]]}: {len(rows)} candidates ({sum(1 for r in rows if r["src"] == "NCEI")} NCEI, {sum(1 for r in rows if r["src"] == "list")} list rows, {sum(1 for r in rows if r["article"])} with an article)', '',
               '| source | event / record | year (quoted) | toll | magnitude / VEI | where | article |', '|---|---|---|---|---|---|---|']
        for r in rows[:12]:
            md.append(f"| {r['src']} | {r['who']} | {r['quote']} | {r['toll']:,.0f} | {r.get('mag') or ''} | {r['where']} | {'yes' if r['article'] else ''} |")
        md.append('')
    open(out, 'w').write('\n'.join(md) + '\n')
    print('\n'.join(l for l in md if l.startswith('####')))


if __name__ == '__main__':
    main(sys.argv[1])
