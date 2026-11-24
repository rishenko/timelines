"""
Plan for the disasters bulk (harvest only, no emit): from disaster-bulk.jsonl, the pool that passes the thresholds in each
region x era, a proposed quota per cell, and the top candidates of each cell by toll, as a review file.

    python3 -I pipelines/v2/plan_disasters_bulk.py OUT.md

Thresholds (brief): eruption VEI >= 6 or >= 1,000 deaths; earthquake (with tsunami) magnitude >= 8.5 or >= 10,000 deaths; flood,
storm, famine, epidemic, drought and extreme temperature >= 100,000 deaths. A toll is the high end of its sourced range (the
pool); the key tier uses the low end.
"""
import collections
import json
import os
import sys

DATA = os.path.expanduser(os.environ.get('TIMELINES_DATA', '~/data'))
REGIONS = ['Africa', 'South Asia', 'East Asia', 'SE Asia / Oceania', 'West / Central Asia', 'Americas', 'Europe / Mediterranean']
ERAS = ['Ancient (< 650)', 'Medieval (650–1499)', 'Modern (≥ 1500)']
QUOTA = (3, 6, 10)  # per region and era: a cell holds at most this many, fewer if the pool is smaller


def era(y):
    return 0 if y < 650 else 1 if y < 1500 else 2


def passes(r):
    d = (r['deaths'] or {}).get('high') or 0
    s = r['sub']
    if s == 'eruption':
        return (r['vei'] or 0) >= 6 or d >= 1000
    if s == 'earthquake':
        return (r['magnitude'] or 0) >= 8.5 or d >= 10000
    return d >= 100000


def toll(r):
    d = r['deaths']
    if not d:
        return ''
    return f"{d['low']:,.0f}" + (f"–{d['high']:,.0f}" if d['high'] != d['low'] else '')


def main(out):
    R = [json.loads(l) for l in open(os.path.join(DATA, 'v2', 'candidates', 'disaster-bulk.jsonl'))]
    P = [r for r in R if r['year'] is not None and passes(r)]
    cell = collections.defaultdict(list)
    for r in P:
        reg = r['places'][0][1] if r['places'] else 'unplaced'
        cell[(reg, era(r['year']))].append(r)
    for v in cell.values():
        v.sort(key=lambda r: -((r['deaths'] or {}).get('high') or 0))
    md = ['# Disasters bulk: plan (harvest only, no emit)', '',
          f"{len(R)} articles with a disaster infobox read from the dump (earthquake 1,435, weather event 3,041, epidemic 593, flood, eruption, famine…); "
          f"**{len(P)}** pass the thresholds with a date. Region is read from the article's categories (\"Earthquakes in Turkey\"); "
          f"{len(cell[('unplaced', 0)]) + len(cell[('unplaced', 1)]) + len(cell[('unplaced', 2)])} have no country category and need a place read from the infobox's location or a hand call.", '',
          '## Pool and proposed quota (pool → quota)', '', '| region | ' + ' | '.join(ERAS) + ' | total |', '|---|---|---|---|---|']
    tot = [0, 0, 0]
    totq = [0, 0, 0]
    for reg in REGIONS + ['unplaced']:
        cells, q = [], 0
        for i in range(3):
            n = len(cell[(reg, i)])
            k = min(n, QUOTA[i]) if reg != 'unplaced' else 0
            tot[i] += n
            totq[i] += k
            cells.append(f'{n} → {k}' if n or k else '·')
            q += k
        md.append(f"| {reg} | " + ' | '.join(cells) + f" | {sum(len(cell[(reg, i)]) for i in range(3))} → {q} |")
    md.append(f"| **total** | " + ' | '.join(f'{tot[i]} → {totq[i]}' for i in range(3)) + f" | {sum(tot)} → {sum(totq)} |")
    md += ['', f"Quota rule: at most {QUOTA[0]} / {QUOTA[1]} / {QUOTA[2]} events per region in the Ancient / Medieval / Modern cell, ranked by toll (the pilot's 24 are included). "
           "The Modern record is denser, so its cell is larger; every cell the pool can fill gets at least one.", '',
          '## What the pool says about coverage', '',
          '- **Ancient and Medieval are nearly empty in the infobox pool**: Africa has none before 1500, South Asia none before 1500, East Asia one, the Ancient Americas five. '
          'Wikipedia has articles for the great historical disasters (the 1303 Hongdong and 526 Antioch earthquakes are in the pilot), but many have no infobox or no year in it. '
          'The infobox pool therefore cannot fill the world-coverage quota for those eras. Candidate routes, for Kevin to pick: (a) the articles in "Natural disasters in <country>" / "<century> natural disasters" categories, '
          '(b) "List of natural disasters by death toll" and "List of earthquakes" list pages (rows with date and toll), (c) Wikidata classes (earthquake, famine, epidemic) with a date, whose tolls the dump does not keep (a wide Wikidata pass keeps P1120 deaths and P2528 magnitude).',
          '- **Epidemics and famines** need the type call and the famine evidence test (policy named as a main cause), so they go to review, not straight in.',
          f"- **Unplaced** ({sum(len(cell[('unplaced', i)]) for i in range(3))}): no country category; the place table needs an infobox-location read.", '']
    for reg in REGIONS + ['unplaced']:
        md += [f'## {reg}', '', '| era | title | year | type | toll (sourced range) | magnitude / VEI |', '|---|---|---|---|---|---|']
        for i in range(3):
            for r in cell[(reg, i)][:8]:
                mv = ' / '.join(x for x in (f"M{r['magnitude']:g}" if r['magnitude'] else '', f"VEI {r['vei']:g}" if r['vei'] else '') if x)
                md.append(f"| {ERAS[i]} | [{r['title']}](https://en.wikipedia.org/wiki/{r['title'].replace(' ', '_')}) | {r['year']} | {r['sub']} | {toll(r)} | {mv} |")
        md.append('')
    open(out, 'w').write('\n'.join(md) + '\n')
    print('\n'.join(md[:24]))


if __name__ == '__main__':
    main(sys.argv[1])
