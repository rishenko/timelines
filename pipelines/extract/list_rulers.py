"""
Ruler list-page route (pilot, Kevin's world-coverage rule): the rulers of a row whose Wikipedia article has no readable
Wikidata office, read from the dated table of a "List of rulers of ..." page. The pilot rows are specs in list-rulers.json.

    pipelines/extract/.venv/bin/python -I pipelines/extract/list_rulers.py --check          # every cell is on its page, counts hold
    pipelines/extract/.venv/bin/python -I pipelines/extract/list_rulers.py --report         # what each table gives, row by row
    pipelines/extract/.venv/bin/python -I pipelines/extract/list_rulers.py --timeline medieval --out DIR   # rulers.csv + rulers-events.json

A table is read through its header (list_rows.py, Dev C's reader for disaster lists: header roles, rowspans, colspans). The
date is the row's own date cell run through dates.spans, quoted as the cell reads; a row whose cell holds no year ("20 years"),
or a regent's note spanning the row, is listed as skipped and never given a date. The reign events are built by rulers.finish,
so they look like every other reign (importance, uuid, source "table row: <name> <date cell>").
Two date columns (the King of Italy page): a spec with `start_header` and `end_header` (regexes on the header names) reads each reign
from its start and end cells, quoted "<start> | <end>"; `tables: "all"` takes every table of the page.
Counts (the spec's `count`): the number of reigns read from the table must equal the number the page states, or the
last number of its numbered column: the check fails otherwise.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common'), os.path.join(HERE, '..', 'v2')]
import dates  # noqa: E402
import list_rows as LR  # noqa: E402
import rulers as R  # noqa: E402
import traditions  # noqa: E402
import wp_dump  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
SPEC = json.load(open(os.path.join(HERE, 'list-rulers.json')))


def dates_of(text):
    """[(start, end, circa)] from a date cell's plain text (one per stretch: "1808–1811 1814–1817" is two). A single year with no
    end ("1846") is no span, and `present` leaves the end open."""
    out = []
    for s in dates.spans(text):
        if s['start'][0] is None:
            continue
        if s['end'] is None and not re.search(r'present|current|incumbent', text, re.I):
            continue
        out.append((s['start'], s['end'], s['circa']))
    return out


def read(spec, report=None):
    """The reigns of one spec: [{number, name, article, st, en, circa, name_cell, date_cell}]. `report` collects
    ("undated", ...) and ("note", ...) lines; its "undated" lines are counted by the check."""
    page = wp_dump.page(spec['page'])
    if not page or wp_dump.ai_flagged(page['text']):
        raise SystemExit(f"{spec['page']}: missing or flagged for AI text")
    out = []
    for ti, tm in enumerate(re.finditer(r'\{\|.*?\n\|\}', page['text'], re.S)):
        if spec['tables'] == 'all' or ti in spec['tables']:
            out += read_table(tm.group(0), spec, report)
    return out


def read_table(table, spec, report=None):
    """The reigns of one table. Dates come from one cell (`date_header`: "Reign", "Approximate dates") or, for a list that gives a
    reign's start and end in two columns (the King of Italy page: "Coronation" and "Ceased to be King"), from `start_header` and
    `end_header`: each cell's first date, the end left open only when the end cell says "present"."""
    out = []
    names = LR.header_names(table)
    col = {}
    for i, n in enumerate(names):
        if 'number' not in col and re.match(r'^(no\b|no\.|#)', n):
            col['number'] = i
        elif 'name' not in col and re.match(r"^(name|mai|ruler|asantehene)", n):
            col['name'] = i
        elif 'start_header' in spec and 'start' not in col and re.search(spec['start_header'], n):
            col['start'] = i
        elif 'end_header' in spec and 'end' not in col and re.search(spec['end_header'], n):
            col['end'] = i
        elif 'start_header' not in spec and re.search(spec.get('date_header', r'approximate dates|reign'), n):
            if 'date' not in col or 'approximate' in n:
                col['date'] = i
    carry = {}
    for row in table.split('\n|-')[1:]:
        if row.lstrip().startswith('!') and '\n|' not in row:
            continue
        cells = LR.expand(LR._cells(row), carry)
        if not cells:
            continue
        if len(cells) != len(names) or len({LR.plain(c) for c in cells[:2]}) == 1:
            if report is not None:
                report.append(f"note: {LR.plain(cells[0])[:70]}")
            continue
        name_raw = cells[col['name']]
        name = LR.plain(name_raw)
        name = re.sub(r'\s*\(.*?\)', '', name).strip()  # "Susam (or Sef)" -> the first name
        name = re.sub(r'^(Otumfuo\s+)?(Nana\s+)?', '', name)  # Asante honorifics: "Otumfuo Nana Osei Tutu I" -> "Osei Tutu I"
        if 'start' in col and 'end' in col:  # two columns: the reign's start and end, each cell's first date; quoted "<start> | <end>"
            a, b = LR.plain(cells[col['start']]), LR.plain(cells[col['end']])
            date_cell = f'{a} | {b}'
            sa = [x for x in dates.spans(LR.REF.sub('', cells[col['start']])) if x['start'][0] is not None][:1]  # raw: {{circa|616}} is a date
            sb = [x for x in dates.spans(LR.REF.sub('', cells[col['end']])) if x['start'][0] is not None][:1]
            open_end = bool(re.search(r'present|current|incumbent', b, re.I))
            ds = [(sa[0]['start'], sb[0]['start'] if sb else None, sa[0]['circa'] or bool(sb and sb[0]['circa']))] if sa and (sb or open_end) else []
        else:
            date_cell = LR.plain(cells[col['date']]) if 'date' in col else ''
            ds = dates_of(date_cell)
        if not ds:
            if report is not None:
                report.append(f"undated: {LR.plain(cells[col['number']]) if 'number' in col else ''} {name}: \"{date_cell[:50]}\"")
            continue
        m = LR.LINK.search(LR.REF.sub('', name_raw))
        for d in ds:
            out.append(dict(number=LR.plain(cells[col['number']]) if 'number' in col else '', name=name, article=m.group(1) if m else None,
                            st=d[0], en=d[1], circa=d[2], name_cell=LR.plain(name_raw), date_cell=date_cell))
    return out


def numbered_last(spec):
    """The last number of the page's numbered column(s), read from every table in spec['count']['tables']."""
    page = wp_dump.page(spec['page'])
    best = 0
    for ti, tm in enumerate(re.finditer(r'\{\|.*?\n\|\}', page['text'], re.S)):
        if ti in spec['count']['tables']:
            for m in re.finditer(r'\n\|-\s*\n\|\s*(\d+)\s*\n\|', tm.group(0)):
                best = max(best, int(m.group(1)))
    return best


def check():
    ok = True
    for spec in SPEC['pages']:
        page = wp_dump.page(spec['page'])
        text = re.sub(r'\s+', ' ', traditions.render(page['text']))
        rep = []
        reigns = read(spec, rep)
        und = sum(x.startswith('undated') for x in rep)
        people = len({(r['number'], r['name']) for r in reigns})
        n = people + und
        c = spec['count']
        if c['kind'] == 'none':  # the page states no count (King of Italy): report what was read; known-counts.json checks the names
            print(f"ok   {spec['page']} → {spec['row']}: no stated count ({c['why']}); read {people} dated + {und} undated")
            continue
        exp = c['expected']
        if c['kind'] == 'list':
            got = numbered_last(spec)
            line = f"numbered list: last number {got}, rows read {people} dated + {und} undated = {n}"
            good = got == exp and n == exp
        else:
            q = c['quote']
            got = n
            line = f"read {people} dated + {und} undated = {n}; page: \"{q}\""
            good = n == exp and re.sub(r'\s+', ' ', q) in text
        print(('ok   ' if good else 'FAIL ') + f"{spec['page']} → {spec['row']}: expected {exp}, {line}")
        ok &= good
    return ok


def build(timeline, out):
    """rulers.csv and rulers-events.json of this timeline's share of the pilot rows (a reign by the timeline's window)."""
    ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json')))
    w0, w1 = R.hist(ds['meta']['range']['start']), R.hist(ds['meta']['range']['end'])
    tracks = {t['id']: t for t in ds['tracks']}
    existing = {e['title'].lower(): e['uuid'] for e in ds['events']}
    rows, events, sources = [], {}, {}
    for spec in SPEC['pages']:
        if timeline not in spec['timelines']:
            continue
        rid = spec['row']
        tr = tracks[rid]
        ph = tr.get('phases') or []
        sp = tr.get('span') or {}
        r0 = max(w0, R.hist(min(p['start'] for p in ph)) if ph else R.hist(sp['start']))
        r1 = min(w1, R.hist(max(p.get('end', w1) for p in ph)) if ph else R.hist(sp.get('end', w1)))
        found, names = [], {}
        for r in read(spec):
            st, en = r['st'], r['en']
            if R.overlap(st[0], R.year(en), r0, r1) < 0:
                continue
            if 'from' in spec and st[0] < spec['from']:
                continue
            # `title_from: "article"`: the reign is named after the linked article ("Guy III of Spoleto", not the list's "Guy"), so it
            # cannot be confused with another ruler of that name and matches the article-titled known-counts specs
            person = (r['article'] or r['name']).strip() if spec.get('title_from') == 'article' else r['name']
            names[person] = r['name_cell']
            found.append(dict(row=rid, person=person, qid='', st=st, en=en, field='table', quote=r['date_cell'],
                              succ=None, cite=spec['page'], office=False, score=max(1, (R.year(en) or w1) - st[0]), flags=['list-page date' + (' (c.)' if r['circa'] else '')],
                              in_phase=True, route=f"list table: {spec['page']}", wd=''))
        R.finish(rid, r0, r1, found, rows, events, sources, tracks, existing, w1)
        for ev in events.values():  # the cited row names its ruler: "table row: <name cell> <date cell>"
            if ev['tracks'] == [rid] and ev['title'][9:] in names:
                loc = f"table row: {names[ev['title'][9:]]} {ev['sources'][0]['sourceLocation'][len('table row: '):]}"
                ev['sources'][0]['sourceLocation'] = loc
                for m in ev['memberships']:
                    for src_ in m['sources']:
                        src_['sourceLocation'] = loc
    os.makedirs(out, exist_ok=True)
    cols = ['row', 'person', 'qid', 'start', 'end', 'importance', 'reign', 'field', 'office', 'quote', 'wd', 'flags', 'route', 'cited', 'uuid']
    import csv
    with open(os.path.join(out, 'rulers.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, cols, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    json.dump({'reignIds': list(events), 'events': list(events.values()), 'sources': sources}, open(os.path.join(out, 'rulers-events.json'), 'w'), indent=1, ensure_ascii=False)
    print(f'{timeline}: {len(rows)} reigns -> {out}')


def main():
    args = sys.argv[1:]
    if '--check' in args:
        sys.exit(0 if check() else 1)
    if '--report' in args:
        for spec in SPEC['pages']:
            rep = []
            reigns = read(spec, rep)
            print(f"## {spec['page']} → {spec['row']}: {len(reigns)} dated reign stretches")
            for r in reigns:
                print(f"  {r['number']:>3} {r['name'][:38]:38} {r['st'][0]}–{r['en'][0] if r['en'] else ''}{' c.' if r['circa'] else ''}  | {r['date_cell'][:40]}")
            for x in rep:
                print('  -', x)
        return
    if '--timeline' in args:
        build(args[args.index('--timeline') + 1], args[args.index('--out') + 1])
        return
    print(__doc__)


if __name__ == '__main__':
    main()
