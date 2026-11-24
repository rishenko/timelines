"""
People pass report (no data change): who would be shown by default, if each country keeps at most N people per decade.

    pipelines/extract/.venv/bin/python -I pipelines/extract/people_report.py [--cap 5] [--floors 50,100,200] [--seed 1] [--out report.md] [--lists DIR] [--db FILE]

Reads wikidata-<dump>-people.sqlite (wd_people_attrs.py) and the enwiki inlink counts (extract-enwiki-*.sqlite), and people-areas.json (the
reviewable occupation to area map). Rules (Kevin, 2026-11-24):
  area      one of four (rulers/politics/military, religion, science/tech/math, culture/philosophy); a person whose only occupations are sport or
            entertainment is out; with several areas the priority order above decides (the count of such people is reported)
  country   P27 (first with an English label), else P17 of the birthplace (P19); historical states count as countries; nobody dropped silently:
            people with no country are listed in unplaced.csv
  decade    activity decade: midpoint of birth and death when both are known, else birth + 30, else death - 20
  cell      per country x decade, rank by enwiki inlinks, keep the top CAP; the floor drops anyone below FLOOR inlinks first
"""
import collections
import json
import os
import random
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import wikidata as W  # noqa: E402

PEOPLE = os.path.join(W.W, f'{W.DUMP_NAME}-people.sqlite')
EXTRACT = os.path.join(os.path.dirname(W.W), 'wikipedia', 'extract-enwiki-20261101.sqlite')
ARGS = sys.argv[1:]


def flag(n, d=None):
    return ARGS[ARGS.index(n) + 1] if n in ARGS else d


def year(t):
    """'+1564-04-23T00:00:00Z' -> 1564; '-0356-...' -> -356 (as Wikidata gives it)."""
    m = re.match(r'([+-])0*(\d+)-', t or '')
    return (-1 if m.group(1) == '-' else 1) * int(m.group(2)) if m else None


def activity_year(b, d):
    if b is not None and d is not None and d >= b:
        return (b + d) // 2
    if b is not None:
        return b + 30
    if d is not None:
        return d - 20
    return None


def decade(y):
    return (y // 10) * 10  # floor, so 1564 -> 1560 and -356 -> -360


def timeline(y):
    return 'Ancient' if y < 650 else 'Medieval' if y < 1500 else 'Modern'


ERAS = [(-10 ** 6, -500, 'before 500 BCE'), (-500, 1, '500 BCE - 1 CE'), (1, 500, '1 - 500'), (500, 1000, '500 - 1000'), (1000, 1500, '1000 - 1500'),
        (1500, 1800, '1500 - 1800'), (1800, 1900, '1800 - 1900'), (1900, 2000, '1900 - 2000'), (2000, 10 ** 6, '2000 +')]


def era(y):
    return next(n for a, b, n in ERAS if a <= y < b)


def main():
    cap = int(flag('--cap', 5))
    floors = [int(x) for x in flag('--floors', '50,100,200').split(',')]
    main_floor = floors[0]
    rng = random.Random(int(flag('--seed', 1)))
    amap = json.load(open(os.path.join(HERE, 'people-areas.json')))
    label_area = {l.lower(): a for a, ls in amap['areas'].items() for l in ls}
    for l in amap['exclude']:
        label_area[l.lower()] = 'EXCLUDED'
    db = sqlite3.connect(f'file:{flag("--db", PEOPLE)}?mode=ro', uri=True)
    db.execute(f"ATTACH 'file:{EXTRACT}?mode=ro' AS x")
    ref = {}

    def R(q):
        if q not in ref:
            r = db.execute('SELECT label, p279, p17, p30 FROM ref WHERE qid=?', (q,)).fetchone()
            ref[q] = (r[0], json.loads(r[1] or '[]'), r[2], json.loads(r[3] or '[]')) if r else (None, [], None, [])
        return ref[q]

    area_cache = {}

    def occ_area(q):
        """The area of an occupation item: its own label, else the nearest P279 ancestor's (breadth first, depth 6)."""
        if q in area_cache:
            return area_cache[q]
        seen, level, found = {q}, [q], None
        for _ in range(7):
            nxt = []
            for x in level:
                lab, sup = R(x)[0], R(x)[1]
                a = label_area.get((lab or '').lower())
                if a:
                    found = a
                    break
                nxt += [s for s in sup if s not in seen]
                seen.update(sup)
            if found:
                break
            level = nxt
        area_cache[q] = found
        return found

    stats = collections.Counter()
    unmapped = collections.Counter()
    rows = []
    unplaced = []
    for qid, label, enwiki, p106, p27, p19, born, died in db.execute('SELECT qid,label,enwiki,p106,p27,p19,born,died FROM person'):
        stats['persons'] += 1
        areas = [occ_area(o) for o in json.loads(p106 or '[]')]
        real = [a for a in areas if a and a != 'EXCLUDED']
        if not real:
            if any(a == 'EXCLUDED' for a in areas):
                stats['out: only sport or entertainment'] += 1
            else:
                stats['out: no occupation maps to an area'] += 1
                for o in json.loads(p106 or '[]')[:3]:
                    unmapped[R(o)[0] or o] += 1
            continue
        if len(set(real)) > 1:
            stats['several areas'] += 1
        order = ['rulers-politics-military', 'religion', 'science-tech-math', 'culture-philosophy']
        area = min(real, key=order.index)  # priority, not listing order: a poet-emperor is a ruler, a saint-writer religion
        y = activity_year(year(born), year(died))
        if y is None:
            stats['out: no dates'] += 1
            continue
        country = next((c for c in json.loads(p27 or '[]') if R(c)[0]), None)
        via = 'P27'
        birth_country = next((R(pl)[2] for pl in json.loads(p19 or '[]') if R(pl)[2] and R(R(pl)[2])[0]), None)  # P17 of the birthplace: where the person was active
        if not country:
            for pl in json.loads(p19 or '[]'):
                c = R(pl)[2]
                if c and R(c)[0]:
                    country, via = c, 'P17 of birthplace'
                    break
        if not country:
            unplaced.append((qid, label, enwiki, area, y))
            stats['no country'] += 1
            continue
        rows.append((qid, label, enwiki, area, y, country, via, birth_country))
    n = db.execute('SELECT COUNT(*) FROM person').fetchone()[0]
    inl = {}  # the inlink table keys titles with spaces, as the persons store does
    titles = [r[2] for r in rows] + [u[2] for u in unplaced]
    for i in range(0, len(titles), 500):
        part = titles[i:i + 500]
        for t, c in db.execute(f"SELECT title, n FROM x.inlink WHERE title IN ({','.join('?' * len(part))})", part):
            inl[t] = c
    people = [dict(qid=r[0], label=r[1], enwiki=r[2], area=r[3], year=r[4], country=r[5], via=r[6], birth_country=r[7], inlinks=inl.get(r[2], 0)) for r in rows]

    def keep(floor):
        cells = collections.defaultdict(list)
        for p in people:
            if p['inlinks'] >= (floor(p['year']) if callable(floor) else floor):
                cells[(p['country'], decade(p['year']))].append(p)
        out = []
        for k, ps in cells.items():
            ps.sort(key=lambda p: -p['inlinks'])
            out += ps[:cap]
        return out, cells

    def cont(c):
        return next((R(x)[0] for x in R(c)[3] if R(x)[0]), 'no continent on the country item')

    def act(p):
        """The country the continent is read from: where the person was active (the birthplace's country), else the citizenship's; a multi-continent
        state (Umayyad, Roman, Ottoman, Mongol) tagged with one continent never decides for people born elsewhere."""
        b = p.get('birth_country')
        return b if b and cont(b) != 'no continent on the country item' else p['country']

    L = []
    L.append(f"# People pass report (cap {cap} per country per decade)\n")
    L.append(f"Persons read: {n:,}. Mapped to an area, dated and placed: {len(people):,}. Out or aside: " + '; '.join(f'{k} {v:,}' for k, v in stats.most_common() if k != 'persons') + '.\n')
    L.append('| inlink floor | people with floor, no cap | kept after cap | cells |\n|---|---|---|---|')
    for fl in floors:
        k, cells = keep(fl)
        L.append(f"| {fl} | {sum(len(v) for v in cells.values()):,} | **{len(k):,}** | {len(cells):,} |")
    k0, cells0 = keep(0)
    L.append(f"| 0 (no floor) | {len(people):,} | {len(k0):,} | {len(cells0):,} |\n")
    kept, cells = keep(main_floor)
    varying = lambda y: 50 if y < 1500 else 100  # era-varying floor: 50 before 1500, 100 from 1500 on
    kept_v, cells_v = keep(varying)

    def table(title, key):
        c = collections.Counter(key(p) for p in kept)
        L.append(f'\n**By {title}** (floor {main_floor})\n\n| {title} | kept |\n|---|---|')
        for k, v in sorted(c.items(), key=lambda kv: -kv[1]):
            L.append(f'| {k} | {v:,} |')
    table('timeline', lambda p: timeline(p['year']))
    table('era', lambda p: era(p['year']))
    table('area', lambda p: p['area'])
    table('world region (continent where the person was active)', lambda p: cont(act(p)))

    def split(title, ppl, key):
        c = collections.Counter(key(p) for p in ppl)
        return ', '.join(f'{k} {v:,}' for k, v in sorted(c.items(), key=lambda kv: -kv[1]))
    big = lambda p: {'North America': 'Americas', 'South America': 'Americas', 'Central America': 'Americas', 'Insular Oceania': 'Oceania', 'Indian subcontinent': 'Asia', 'Eurasia': 'Asia/Europe (Eurasia)'}.get(cont(act(p)), cont(act(p)))
    L.append(f"\n## Variant: floor 50 before 1500, 100 from 1500 on (same cap {cap})\n")
    L.append(f"Kept: **{len(kept_v):,}** (flat 50: {len(kept):,}; flat 100: {len(keep(100)[0]):,}).\n")
    for nm, ppl in (('flat 50', kept), ('era-varying 50/100', kept_v), ('flat 100', keep(100)[0])):
        L.append(f"- **{nm}** by timeline: {split('timeline', ppl, lambda p: timeline(p['year']))}; by continent: {split('continent', ppl, big)}")
    L.append("\n**Africa, Asia and the Americas per century before 1500** (era-varying floor; flat 50 in brackets)\n\n| century | Africa | Asia | Americas | Europe | all |\n|---|---|---|---|---|---|")
    cen = lambda y: (y // 100) * 100
    for c0 in range(-1000, 1500, 100):
        row = []
        for g in ('Africa', 'Asia', 'Americas', 'Europe'):
            a = sum(1 for p in kept_v if cen(p['year']) == c0 and big(p) == g)
            b = sum(1 for p in kept if cen(p['year']) == c0 and big(p) == g)
            row.append(f'{a} ({b})')
        a = sum(1 for p in kept_v if cen(p['year']) == c0)
        b = sum(1 for p in kept if cen(p['year']) == c0)
        L.append(f"| {c0} to {c0 + 99} | " + ' | '.join(row) + f" | {a} ({b}) |")

    # Kevin (2026-11-24): the cap is a ceiling and a guide, never a target; where a region is thin before 1500 the floor may drop to 20 if a blind sample
    # shows the extra names are significant. Variant: 50 before 1500 and 100 after, but 20 before 1500 for Africa, the Americas and Oceania.
    THIN = {'Africa', 'Americas', 'Oceania'}
    thin_floor = int(flag('--thin-floor', 20))
    def varying_thin(p):
        if p['year'] >= 1500:
            return 100
        return thin_floor if big(p) in THIN else 50
    def keep_fn(fn):
        cells = collections.defaultdict(list)
        for p in people:
            if p['inlinks'] >= fn(p):
                cells[(p['country'], decade(p['year']))].append(p)
        out = []
        for ps in cells.values():
            ps.sort(key=lambda p: -p['inlinks'])
            out += ps[:cap]
        return out
    kept_t = keep_fn(varying_thin)
    have = {p['qid'] for p in kept_v}
    added = [p for p in kept_t if p['qid'] not in have]
    L.append(f"\n## Variant: as above, but floor {thin_floor} before 1500 for Africa, the Americas and Oceania\n")
    L.append(f"Kept: **{len(kept_t):,}** (era-varying 50/100: {len(kept_v):,}); added by the lower floor: **{len(added):,}**.\n")
    L.append(f"- by timeline: {split('timeline', kept_t, lambda p: timeline(p['year']))}")
    L.append(f"- by continent: {split('continent', kept_t, big)}")
    L.append(f"- the added names by continent: {split('continent', added, big)}; by area: {split('area', added, lambda p: p['area'])}\n")
    L.append('| century | Africa | Americas | Oceania |\n|---|---|---|---|')
    for c0 in range(-1000, 1500, 100):
        row = [f"{sum(1 for p in kept_t if cen(p['year']) == c0 and big(p) == g)} ({sum(1 for p in kept_v if cen(p['year']) == c0 and big(p) == g)})" for g in ('Africa', 'Americas', 'Oceania')]
        L.append(f"| {c0} to {c0 + 99} | " + ' | '.join(row) + ' |')
    L.append('\n(in brackets: the era-varying 50/100 count)')
    L.append(f'\n**20 largest country x decade cells** (floor {main_floor}, before the cap)\n\n| country | decade | people at floor | kept |\n|---|---|---|---|')
    for (c, d), ps in sorted(cells.items(), key=lambda kv: -len(kv[1]))[:20]:
        L.append(f'| {R(c)[0]} | {d} | {len(ps)} | {min(cap, len(ps))} |')
    for tl in ('Ancient', 'Medieval'):
        pool = [p for p in kept if timeline(p['year']) == tl]
        L.append(f'\n**30 random kept people, {tl}** (seed {flag("--seed", 1)}; of {len(pool):,})\n')
        for p in sorted(rng.sample(pool, min(30, len(pool))), key=lambda p: p['year']):
            L.append(f"- {p['label']} ({p['year']}, {R(p['country'])[0]}, {p['area']}, {p['inlinks']} inlinks)")
    L.append(f"\n**People with no country** (floor {main_floor}): {sum(1 for u in unplaced if inl.get(u[2], 0) >= main_floor):,} of {len(unplaced):,} (all listed in unplaced.csv)")
    L.append('\n**Most common occupations that map to no area** (first three per person): ' + ', '.join(f'{k} {v:,}' for k, v in unmapped.most_common(40)))
    text = '\n'.join(L) + '\n'
    if flag('--out'):
        open(flag('--out'), 'w').write(text)
    else:
        print(text)
    if flag('--lists'):
        os.makedirs(flag('--lists'), exist_ok=True)
        import csv
        with open(os.path.join(flag('--lists'), 'kept.csv'), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['qid', 'label', 'enwiki', 'area', 'year', 'decade', 'country', 'via', 'inlinks', 'timeline'])
            for p in sorted(kept, key=lambda p: (p['year'], -p['inlinks'])):
                w.writerow([p['qid'], p['label'], p['enwiki'], p['area'], p['year'], decade(p['year']), R(p['country'])[0], p['via'], p['inlinks'], timeline(p['year'])])
        import wp_dump
        def lead(t):
            pg = wp_dump.page(t)
            tx = (pg or {}).get('text', '')
            for _ in range(3):
                tx = re.sub(r'\{\{[^{}]*\}\}', '', tx)
            tx = re.sub(r'<ref[^>]*?/>|<ref.*?</ref>', '', tx, flags=re.S)
            tx = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', tx)
            m = re.search(r"\n([^\n=|{}*][^\n]{80,})", tx)
            return re.sub(r'\s+', ' ', m.group(1))[:300] if m else ''
        with open(os.path.join(flag('--lists'), 'added-low-link.csv'), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['qid', 'person', 'year', 'country', 'region', 'area', 'inlinks', 'lead'])
            for p in sorted(added, key=lambda p: p['year']):
                w.writerow([p['qid'], p['label'], p['year'], R(p['country'])[0], big(p), p['area'], p['inlinks'], lead(p['enwiki'])])
        with open(os.path.join(flag('--lists'), 'unplaced.csv'), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['qid', 'label', 'enwiki', 'area', 'year', 'inlinks'])
            for u in unplaced:
                w.writerow([*u[:4], u[4], inl.get(u[2], 0)])


if __name__ == '__main__':
    main()
