"""
Selects the disasters bulk seed (v2 step 2, bulk): per region x era cell (quota 3 / 6 / 10 for Ancient / Medieval / Modern), the highest-toll
candidates from (1) the infobox pool (disaster-bulk.jsonl, thresholds as in plan_disasters_bulk.py) and (2) the articles linked from the
list pages' pre-1500 rows (routes_dry_run.LISTS; the row's date cell is its quote). The pilot's 24 events count toward their cells and stay.
Writes pilot-disasters-bulk.json (the harvest seed; HARVEST_PILOT=pilot-disasters-bulk.json HARVEST_NAME=disaster-bulk-harvest) and a
cell table. Nothing is typed: tolls, dates and regions are read; the harvest quote-gates every date.

    pipelines/extract/.venv/bin/python -I pipelines/v2/select_disasters_bulk.py OUT.md
"""
import collections
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path[:0] = [os.path.join(ROOT, 'pipelines', 'common'), os.path.join(ROOT, 'pipelines', 'extract'), HERE]
import settings  # noqa: E402

settings.take_flags(sys.argv[1:])
import regions  # noqa: E402
import wp_dump  # noqa: E402
from dates import spans  # noqa: E402
from plan_disasters_bulk import QUOTA, REGIONS, passes, era  # noqa: E402
from routes_dry_run import LISTS, place_in  # noqa: E402

DATA = settings.DATA
SUB = {'earthquake': 'earthquake', 'tsunami': 'tsunami', 'famine': 'famine', 'epidemic': 'epidemic', 'pandemic': 'epidemic', 'flood': 'flood',
       'volcanic': 'eruption', 'eruption': 'eruption'}


def sub_of(title, text):
    s = (title + ' ' + text).lower()
    for k, v in SUB.items():
        if k in s:
            return v
    return 'other'


KEYWORD = re.compile(r'earthquake|quake|famine|plague|epidemic|pandemic|flood|tsunami|eruption|volcan|drought|hardship|disaster|hailstorm|storm|cyclone|typhoon|hurricane|outbreak|pestilence|fever|smallpox|death|landslide|avalanche|tornado|heat wave|cholera|fire', re.I)


def tolls(text):
    text = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>|\[\d+\]', '', text)
    out = []
    for m in re.finditer(r'(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?\s*(?:million|billion)|\d{4,})', text):
        s = m.group(1).replace(',', '')
        mult = 1e6 if 'million' in s else 1e9 if 'billion' in s else 1
        out.append(float(re.sub(r'[^\d.]', '', s)) * mult)
    return max([x for x in out if 3000 < x < 1e9] or [0])  # a year is not a toll; nothing over a billion


def list_rows(db):
    out = {}
    for lt in LISTS:
        pg = wp_dump.page(lt)
        if not pg or wp_dump.ai_flagged(pg['text']):
            continue
        for tm in re.finditer(r'\{\|.*?\n\|\}', pg['text'], re.S):
            for row in re.split(r'\n\|-', tm.group(0))[1:]:
                cells = [x.strip() for x in re.split(r'\n[|!]', '\n' + row.strip()) if x.strip()]
                y = quote = None
                for ce in cells[:4]:
                    plain = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', ce)
                    sp = spans(plain)[:1]
                    if sp and sp[0]['start'][0] is not None and abs(sp[0]['start'][0]) < 3000:
                        y, quote = sp[0]['start'][0], plain; break
                if y is None or era(y) > 1:
                    continue
                links = [m.group(1).strip() for m in re.finditer(r'\[\[([^|\]#]+)', ' '.join(cells))]
                title = next((t for t in links if db.execute('SELECT 1 FROM page WHERE title=? AND ns=0', (t,)).fetchone()
                              and not re.fullmatch(r'\d+( BCE?| AD)?|[A-Z][a-z]+ \d+', t) and KEYWORD.search(t) and not re.match(r'List of', t)), None)
                if not title or (re.match(r'(1[5-9]|20)\d\d\b', title) and era(y) < 2):
                    continue
                rowtext = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', ' '.join(cells))
                reg = place_in(rowtext) or place_in(lt)
                names = [n for n in regions.NAMES if re.search(r'(?<![\w])' + re.escape(n) + r'(?![\w])', rowtext + ' ' + lt) and regions.LOOKUP[n] == reg]
                prev = out.get(title)
                cand = {'title': title, 'year': y, 'region': reg or 'unplaced', 'toll': tolls(rowtext), 'sub': sub_of(title, lt), 'countries': names[:2],
                        'list': lt, 'rowQuote': quote[:200]}
                if not prev or cand['toll'] > prev['toll']:
                    out[title] = cand
    return out


def main(out):
    db = sqlite3.connect(f'file:{os.path.join(settings.WIKIPEDIA, "extract-" + settings.DUMP_NAME + ".sqlite")}?mode=ro', uri=True)
    pilot = {e['title'] for e in json.load(open(os.path.join(HERE, 'pilot-disasters.json')))['events']}
    pilot_by_title = {json.loads(l)['title']: json.loads(l) for l in open(os.path.join(DATA, 'v2', 'candidates', 'disaster.jsonl'))}
    cands = {}
    for l in open(os.path.join(DATA, 'v2', 'candidates', 'disaster-bulk.jsonl')):
        r = json.loads(l)
        if r['year'] is None or not passes(r) or r['sub'] in ('other',):
            continue
        reg = r['places'][0][1] if r['places'] else 'unplaced'
        cands[r['title']] = {'title': r['title'], 'year': r['year'], 'region': reg, 'toll': (r['deaths'] or {}).get('high') or 0, 'sub': r['sub'],
                             'countries': [p[0] for p in r['places'][:2]], 'src': 'infobox'}
    for t, c in list_rows(db).items():
        if t not in cands:
            cands[t] = {**c, 'src': 'list'}
    cell = collections.defaultdict(list)
    for t, c in cands.items():
        if t in pilot or c['region'] == 'unplaced':
            continue
        cell[(c['region'], era(c['year']))].append(c)
    in_pilot = collections.Counter()
    for t, e in pilot_by_title.items():
        if e.get('year'):
            pass
    chosen, md = [], ['# Disasters bulk: selection', '', '| region | Ancient | Medieval | Modern |', '|---|---|---|---|']
    pilot_cells = collections.Counter()
    for t, e in pilot_by_title.items():
        y = (e['dates'][0]['year'] if e['dates'] else None)
        reg = next((regions.LOOKUP.get(c) for c in e['countries'] if regions.LOOKUP.get(c)), 'unplaced')
        if y is not None:
            pilot_cells[(reg, era(y))] += 1
    thin = []
    for reg in REGIONS:
        row = []
        for i in range(3):
            room = max(0, QUOTA[i] - pilot_cells[(reg, i)])
            pick = sorted(cell[(reg, i)], key=lambda c: -c['toll'])[:room]
            chosen += pick
            n = len(pick) + pilot_cells[(reg, i)]
            row.append(f'{n} ({len(pick)} new; pool {len(cell[(reg, i)])})')
            if n < 3:
                thin.append(f'{reg} {["Ancient", "Medieval", "Modern"][i]}: {n}')
        md.append(f'| {reg} | ' + ' | '.join(row) + ' |')
    md += ['', f'**{len(chosen)} new events selected** (pilot 24 stay). Cells under 3: ' + (', '.join(thin) or 'none') + '.', '',
           '| region | era | title | year | type | toll | from |', '|---|---|---|---|---|---|---|']
    for c in sorted(chosen, key=lambda c: (REGIONS.index(c['region']), c['year'])):
        md.append(f"| {c['region']} | {['Ancient', 'Medieval', 'Modern'][era(c['year'])]} | {c['title']} | {c['year']} | {c['sub']} | {c['toll']:,.0f} | {c['src']} |")
    seeds = [{'title': c['title'], 'sub': c['sub'] if c['sub'] != 'other' else 'natural', 'countries': c['countries'] or [], 'region': c['region'], 'from': c['src']} for c in chosen]
    json.dump({'_note': 'The disasters bulk seed (select_disasters_bulk.py): quota 3/6/10 per region x era, highest toll first, from the infobox pool and the list pages.', 'events': seeds},
              open(os.path.join(HERE, 'pilot-disasters-bulk.json'), 'w'), indent=1, ensure_ascii=False)
    open(out, 'w').write('\n'.join(md) + '\n')
    print('\n'.join(md[:16]))


if __name__ == '__main__':
    main(sys.argv[1])
