"""
Row pass, conflicts (POC, Kevin 2026-11-22): for each polity row of a timeline, the wars, battles, sieges, revolts and
coups it took part in, as reviewable candidates. Never timeline data: nothing here writes data-src.

Which articles: Wikipedia's categories for the row, its phases and their articles ("Wars involving the Ottoman Empire",
"Battles involving France", "Sieges involving …", "Coups d'état and coup attempts in Ethiopia", "Rebellions in …"),
plus Wikidata's links: the polities' own "participant in" (P1344) / "conflict" (P607), and the same links on the
row's rulers (rulers.csv from rulers.py, when it has been run for the timeline).
When: the article's own infobox dates (the extractor's infobox reader), checked against Wikidata (P580/P582/P585).
Kept: articles dated within the row's span (a category reached through a phase: that phase's span); an article
already cited by a timeline event is flagged, not dropped, so review can merge it.

    pipelines/extract/.venv/bin/python -I pipelines/extract/conflicts.py --timeline modern-states --rows france,ethiopia

Writes pipelines/out/rows/<timeline>/conflicts.csv and conflicts-report.md (or --out DIR).
"""
import csv
import json
import math
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
import extractors as X  # noqa: E402
import wp_dump as wp  # noqa: E402
from dates import iso  # noqa: E402
from topics import Tables  # noqa: E402
from wd_join import WD, compare  # noqa: E402
from rulers import hist, stems, title_of  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
WIKI = 'https://en.wikipedia.org/wiki/'
# category name patterns, {} = the row's, a phase's or an article's name (with and without "the")
CATS = ('Wars involving {}', 'Battles involving {}', 'Sieges involving {}', 'Conflicts involving {}',
        "Coups d'état and coup attempts in {}", 'Military coups in {}', 'Rebellions in {}', 'Revolutions in {}',
        'Civil wars involving {}')
PER_YEARS = 10  # suggested importance 2 for the top ~1 per 10 years of the row's span (by inbound links); the rest 3


def flag(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default


def year(v):
    return v[0] if v else None


def main():
    timeline = flag('--timeline', 'modern-states')
    ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json'), encoding='utf-8'))
    w0, w1 = hist(ds['meta']['range']['start']), hist(ds['meta']['range']['end'])
    tracks = {t['id']: t for t in ds['tracks']}
    row_ids = flag('--rows', '').split(',')
    out = flag('--out') or os.path.join(ROOT, 'pipelines', 'out', 'rows', timeline)
    os.makedirs(out, exist_ok=True)
    T = Tables(os.path.join(settings.WIKIPEDIA, f'extract-{settings.DUMP_NAME}.sqlite'), settings.DUMP_NAME)
    wd = WD.open(settings.DATA)
    import event_categories
    from extract import WpShim
    shim = WpShim(T)
    # articles the timeline already cites, by URL: a candidate there is flagged for merging, not added twice
    cited = {}
    for e in ds['events']:
        for s in e.get('sources', []):
            u = ds['sources'].get(s.get('sourceKey'), {}).get('url', '')
            if u.startswith(WIKI):
                cited.setdefault(title_of(u), e['uuid'])
    # rulers from rulers.py's output for this timeline, if any (their P607/P1344 links are one more route)
    rulers = {}
    rpath = os.path.join(ROOT, 'pipelines', 'out', 'rows', timeline, 'rulers.csv')
    if os.path.exists(rpath):
        for r in csv.DictReader(open(rpath, encoding='utf-8')):
            if r.get('uuid') and r.get('qid'):
                rulers.setdefault(r['row'], set()).add(r['qid'])

    rows = []
    for rid in row_ids:
        tr = tracks[rid]
        span = tr.get('span') or {'start': w0, 'end': w1}
        stretches = tr.get('phases') or (span if isinstance(span, list) else [span])
        r0 = max(w0, min(hist(p['start']) for p in stretches))
        r1 = min(w1, max(hist(p.get('end', w1)) for p in stretches))
        # names: the row's (whole row) and each phase's name and article (that phase's span)
        names = {tr['name']: None, title_of(tr.get('url')): None}
        for p in tr.get('phases', []):
            pw = (hist(p['start']), hist(p.get('end', w1)))
            for n in [p['name']] + [title_of(ds['sources'].get(d['source']['sourceKey'], {}).get('url'))
                                    for d in p.get('startDates', []) + p.get('endDates', [])]:
                if n and names.get(n, 0) is not None:
                    names.setdefault(n, [])
                    names[n] = (names[n] or []) + [pw]
        found = {}  # article title -> {'routes': set, 'wins': list or None}

        def add(title, route, win):
            a = found.setdefault(title, {'routes': set(), 'wins': []})
            a['routes'].add(route)
            a['wins'] = None if win is None or a['wins'] is None else a['wins'] + win

        for n, win in names.items():
            if not n:
                continue
            for pat in CATS:
                for c in {pat.format(n), pat.format('the ' + n)}:
                    for (title,) in T.db.execute('SELECT p.title FROM category c JOIN page p ON p.page_id = c.page_id '
                                                 'WHERE c.name=? AND p.ns=0', (c,)):
                        add(title, 'cat: ' + c, win)
        # Wikidata: the polities' and the rulers' P1344 / P607 links
        if wd:
            pol = {}
            for n, win in names.items():
                q = wd.db.execute('SELECT qid FROM wd_item WHERE enwiki=?', (n,)).fetchone() if n else None
                if q:
                    pol[q[0]] = win
            people = rulers.get(rid, set())
            for who, win, label in [(q, w, 'polity') for q, w in pol.items()] + [(q, None, 'ruler') for q in people]:
                for prop, target in wd.db.execute("SELECT prop, target FROM wd_link WHERE qid=? AND prop IN ('P1344','P607') "
                                                  "AND rank != 'deprecated'", (who,)):
                    t = wd.db.execute('SELECT enwiki FROM wd_item WHERE qid=?', (target,)).fetchone()
                    if t and t[0]:
                        add(t[0], f'wd {label} {prop}', win if label == 'polity' else None)

        cands = []
        for title, a in found.items():
            p = T.page(title)
            if not p:
                continue
            pid, title, box, ai, _rev = p
            flags = []
            if ai:
                flags.append('AI-flagged article: not usable')
            sp = [c for c in X.infobox(T.fields(pid))]
            if not sp:
                rows.append(dict(row=rid, article=title, routes='; '.join(sorted(a['routes'])), flags='no infobox date: not placed'))
                continue
            # the article's own dates: the first infobox date field (date / year / start); later ones (aftermath) are alternates
            c = sp[0]
            st, en = c['span']['start'], c['span']['end']
            y0, y1 = st[0], year(en) or st[0]
            if y1 < r0 or y0 > r1:
                continue  # outside the row's span in this window
            if a['wins'] and not any(y1 >= lo and y0 <= hi for lo, hi in a['wins']):
                flags.append('outside the phase whose category found it')
            q = T.qid(pid)
            res = compare(c['span'], wd.dates(q)) if wd and q else ('no item' if wd else 'not loaded')
            if res.startswith('differs'):
                flags.append('Wikidata ' + res)
            if title in cited:
                flags.append(f'timeline already cites it ({cited[title]})')
            e = {'title': title, 'descr': c['quote'][:300], 'tracks': [], 'sources': [{'sourceKey': 'wp', 'sourceLocation': c['sourceLocation']}]}
            cat = event_categories.classify(e, {'sources': {'wp': {'url': WIKI + title.replace(' ', '_')}}, 'tracks': []}, shim)
            cands.append(dict(row=rid, article=title, qid=q or '', start=iso(st), end=iso(en), precision=c['span']['precision'],
                              circa=int(c['span']['circa']), category_main=cat[0][0] if cat else '',
                              category_second=cat[1][0] if len(cat) > 1 else '', box=box or '', sourceLocation=c['sourceLocation'],
                              routes='; '.join(sorted(a['routes'])), inlinks=T.inlinks(title), wikidata=res, flags='; '.join(flags)))
        # suggested importance: ~1 per PER_YEARS years of the row's span get 2, by inbound links, tripled when the title
        # names the row ("Second Italo-Ethiopian War" over "Korean War" on Ethiopia); the rest 3
        top = math.ceil(max(1, r1 - r0) / PER_YEARS)
        own = stems({w.lower() for n in names if n for w in re.findall(r'[A-Za-z]{4,}', n)})
        for c in cands:
            c['names_row'] = int(any(st in c['article'].lower() for st in own))
        for i, c in enumerate(sorted(cands, key=lambda c: -c['inlinks'] * (3 if c['names_row'] else 1))):
            c['importance_suggested'] = 2 if i < top else 3
        rows += sorted(cands, key=lambda c: c['start'])

    cols = ['row', 'article', 'qid', 'start', 'end', 'precision', 'circa', 'category_main', 'category_second', 'importance_suggested', 'names_row',
            'inlinks', 'box', 'sourceLocation', 'wikidata', 'routes', 'flags']
    with open(os.path.join(out, 'conflicts.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, cols, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    md = [f'# Conflicts pass (POC): {timeline} ({", ".join(row_ids)})', '',
          '| Row | Candidates | Suggested visible | Wikidata differs | Already cited | No infobox date (not placed) | Top categories |',
          '|---|---|---|---|---|---|---|']
    for rid in row_ids:
        rr = [r for r in rows if r['row'] == rid]
        placed = [r for r in rr if r.get('start')]
        cats = Counter(r['category_main'] or '(none)' for r in placed).most_common(4)
        md.append(f"| {rid} | {len(placed)} | {sum(r['importance_suggested'] == 2 for r in placed)} | "
                  f"{sum('Wikidata differs' in r['flags'] for r in placed)} | {sum('already cites' in r['flags'] for r in placed)} | "
                  f"{sum('not placed' in r['flags'] for r in rr)} | {', '.join(f'{k} {v}' for k, v in cats)} |")
    routes = Counter(x.split(':')[0] if x.startswith('cat') else x for r in rows if r.get('start') for x in r['routes'].split('; '))
    md += ['', 'Routes (an article may have several): ' + ', '.join(f'{k} {v}' for k, v in routes.most_common()), '']
    open(os.path.join(out, 'conflicts-report.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    print(f"{sum(1 for r in rows if r.get('start'))} conflict candidates on {len(row_ids)} rows -> {out}")


if __name__ == '__main__':
    main()
