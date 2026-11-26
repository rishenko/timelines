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
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common'), os.path.join(HERE, '..', 'v2')]
import dates  # noqa: E402
import list_rows as LR  # noqa: E402
import rulers as R  # noqa: E402
import traditions  # noqa: E402
import wp_dump  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
SPEC_FILE = sys.argv[sys.argv.index('--spec') + 1] if '--spec' in sys.argv else os.path.join(HERE, 'list-rulers.json')  # --spec FILE: a pilot's specs, same shape
SPEC = json.load(open(SPEC_FILE, encoding='utf-8'))


CENTURY = re.compile(r'\b(?:early|late|middle|first|second|third|last|end)?[^,;()]*?\d+(?:st|nd|rd|th)\b[^,;()]*?\b(?:century|millennium)\b[^,;()]*', re.I)


def dates_of(text, explicit=False):
    """[(start, end, circa)] from a date cell's plain text (one per stretch: "1808–1811 1814–1817" is two). A single year with no
    end ("1846") is no span, and `present` leaves the end open. `explicit`: only years the cell writes ("Second half of the 7th
    century" is no date, where it would otherwise read as the whole century)."""
    out = []
    if explicit:
        text = CENTURY.sub(' ', text)
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


def header_names(table):
    """The header names by column: LR.header_names, with a header's colspan copied across (Han: "Personal name" over two columns)."""
    names = []
    for line in re.findall(r'^!(.*)$', LR.header_block(table), re.M):
        for h in re.split(r'!!', line):
            m = LR.ATTR.match(h)
            attrs, text = (m.group(1), m.group(2)) if m else ('', h)
            names += [LR.plain(text).lower()] * LR._span(attrs, 'colspan')
    return names


CIRCA = re.compile(r'\{\{\s*circa\s*\|\s*(\d+)\s*\|\s*(\d+)\s*(BC|BCE|AD|CE)?\s*\}\}', re.I)


def read_table(table, spec, report=None):
    """The reigns of one table. Dates come from one cell (`date_header`: "Reign", "Approximate dates") or, for a list that gives a
    reign's start and end in two columns (the King of Italy page: "Coronation" and "Ceased to be King"), from `start_header` and
    `end_header`: each cell's first date, the end left open only when the end cell says "present"."""
    out = []
    names = header_names(table)
    col = {}
    for i, n in enumerate(names):
        if 'number' not in col and re.match(r'^(no\b|no\.|#)', n):
            col['number'] = i
        elif 'name' not in col and re.match(spec.get('name_header', r"^(name|mai|ruler|asantehene)"), n):
            col['name'] = i
        elif 'start_header' in spec and 'start' not in col and re.search(spec['start_header'], n):
            col['start'] = i
        elif 'end_header' in spec and 'end' not in col and re.search(spec['end_header'], n):
            col['end'] = i
        elif 'start_header' not in spec and re.search(spec.get('date_header', r'approximate dates|reign'), n):
            if 'date' not in col or 'approximate' in n:
                col['date'] = i
        if 'fallback' not in col and 'date_fallback' in spec and re.search(spec['date_fallback'], n):
            col['fallback'] = i  # a second chronology on the page, read only where the first column gives no span
    carry = {}
    for row in table.split('\n|-')[1:]:
        if row.lstrip().startswith('!') and '\n|' not in row:
            continue
        shared = {c for c, v in carry.items() if v[1] > 0}  # columns whose cell came down from an earlier row
        cells = LR.expand(LR._cells(row), carry)
        if not cells:
            continue
        shared |= {c for c, v in carry.items() if v[1] > 0}  # ... or spans several rows from this one
        if len(cells) != len(names) or len({LR.plain(c) for c in cells[:2]}) == 1:
            if report is not None:
                report.append(f"note: {LR.plain(cells[0])[:70]}")
            continue
        name_raw = cells[col['name']]
        name = LR.plain(name_raw)
        name = re.sub(r'\s*\((?!(?:I{1,3}|IV|V)\))[^)]*\)', '', name).strip()  # "Susam (or Sef)" -> the first name; "Ḫuzziya I (II)" keeps its (II)
        name = re.sub(r'^(Otumfuo\s+)?(Nana\s+)?', '', name)  # Asante honorifics: "Otumfuo Nana Osei Tutu I" -> "Osei Tutu I"
        if 'start' in col and 'end' in col:  # two columns: the reign's start and end, each cell's first date; quoted "<start> | <end>"
            a, b = LR.plain(cells[col['start']]), LR.plain(cells[col['end']])
            date_cell = f'{a} | {b}'
            sa = [x for x in dates.spans(LR.REF.sub('', cells[col['start']])) if x['start'][0] is not None][:1]  # raw: {{circa|616}} is a date
            sb = [x for x in dates.spans(LR.REF.sub('', cells[col['end']])) if x['start'][0] is not None][:1]
            open_end = bool(re.search(r'present|current|incumbent', b, re.I))
            ds = [(sa[0]['start'], sb[0]['start'] if sb else None, sa[0]['circa'] or bool(sb and sb[0]['circa']))] if sa and (sb or open_end) else []
        else:
            raw = CIRCA.sub(lambda m: f"c. {m.group(1)}–{m.group(2)} {m.group(3) or ''}", cells[col['date']]) if 'date' in col else ''
            date_cell = LR.plain(raw) if 'date' in col else ''  # {{circa|1680|1650 BC}} is the Hittite page's date: read as "c. 1680–1650 BC"
            ds = [] if spec.get('skip_shared_dates') and col.get('date') in shared else dates_of(date_cell, spec.get('explicit_years', False))  # one date over several rulers dates none of them
            if not ds and 'fallback' in col:
                raw = CIRCA.sub(lambda m: f"c. {m.group(1)}–{m.group(2)} {m.group(3) or ''}", cells[col['fallback']])
                alt = LR.plain(raw)
                ds = dates_of(alt)
                if ds:
                    date_cell = f"{alt} ({names[col['fallback']]})"
        if not ds:
            if report is not None:
                report.append(f"undated: {LR.plain(cells[col['number']]) if 'number' in col else ''} {name}: \"{date_cell[:50]}\"")
            continue
        m = LR.LINK.search(LR.REF.sub('', name_raw))
        for d in ds:
            if spec.get('one_row_per_ruler') and any(o['name'] == name and o['st'] == d[0] and o['en'] == d[1] for o in out):
                continue  # a ruler with several era names has a row for each, all with the same reign
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


def reign_name(r, spec):
    """The ruler's name for the reign's title: the list's name cell, or with `title_from: "article"` the linked article ("Guy III of
    Spoleto", not the list's "Guy"), so it cannot be confused with another ruler of that name."""
    return (r['article'] or r['name']).strip() if spec.get('title_from') == 'article' else r['name']


def freeze(timeline, row, path, note):
    """A row's reigns from a build into a frozen claims file the generator merges (the Kingdom of Italy row: italy-reigns.json),
    each marked "list-page date" to check. Re-run to refresh; never edit the file by hand."""
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        build(timeline, tmp)
        o = json.load(open(os.path.join(tmp, 'rulers-events.json'), encoding='utf-8'))
    ev = [e for e in o['events'] if e['tracks'] == [row]]
    keys = {x['sourceKey'] for e in ev for x in e['sources']} | {x['sourceKey'] for e in ev for m in e.get('memberships', []) for x in m['sources']}
    out = {'note': note, 'events': ev, 'sources': {k: v for k, v in o['sources'].items() if k in keys},
           'review': {e['uuid']: {'row': row, 'toCheck': ['list-page date']} for e in ev},
           'inputs': {'wikipedia': 'enwiki-20261101', 'pages': [x['page'] for x in SPEC['pages'] if x['row'] == row]}}
    json.dump(out, open(path, 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
    open(path, 'a', encoding='utf-8', newline='\n').write('\n')
    print(f'{row}: {len(ev)} reigns -> {path}')


def build(timeline, out):
    """rulers.csv and rulers-events.json of this timeline's share of the pilot rows (a reign by the timeline's window)."""
    ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json'), encoding='utf-8'))
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
        r0 = max(w0, min(R.hist(p['start']) for p in ph) if ph else R.hist(sp['start']))  # numbers, not strings: "c. 1400 BCE" sorts before "c. 1650 BCE"
        r1 = min(w1, max(R.hist(p.get('end', w1)) for p in ph) if ph else R.hist(sp.get('end', w1)))
        found, names = [], {}
        for r in read(spec):
            st, en = r['st'], r['en']
            if R.overlap(st[0], R.year(en), r0, r1) < 0:
                continue
            if 'from' in spec and st[0] < spec['from']:
                continue
            if r['name'] in spec.get('skip_names', []):  # the row's hand-authored kings and the ones the spec leaves out (skip_note)
                continue
            person = reign_name(r, spec)
            names[person] = r['name_cell']
            ov = spec.get('date_overrides', {}).get(r['name'])  # a better-sourced span than the list's cell: the ruler's own article, cited in its place
            if ov:
                (st, en, circa_), = dates_of(ov['cell'])[:1]
                r = dict(r, circa=circa_, date_cell=ov['cell'])
            found.append(dict(row=rid, person=person, qid='', st=st, en=en, field='table', quote=r['date_cell'],
                              succ=None, cite=ov['page'] if ov else spec['page'], office=False, score=max(1, (R.year(en) or w1) - st[0]), flags=['list-page date' + (' (c.)' if r['circa'] else '')],
                              in_phase=True, route=f"list table: {spec['page']}", wd=''))
        R.finish(rid, r0, r1, found, rows, events, sources, tracks, existing, w1)
        ovs = {n: o for n, o in spec.get('date_overrides', {}).items()}
        for ev in events.values():  # the cited row names its ruler: "table row: <name cell> <date cell>"
            if ev['tracks'] == [rid] and ev['title'][9:] in names:
                loc = f"table row: {names[ev['title'][9:]]} {ev['sources'][0]['sourceLocation'][len('table row: '):]}"
                if ev['title'][9:] in ovs:
                    loc = ovs[ev['title'][9:]]['location']
                ev['sources'][0]['sourceLocation'] = loc
                for m in ev['memberships']:
                    for src_ in m['sources']:
                        src_['sourceLocation'] = loc
    for old in [u for u, ev in events.items() if re.search(r'[^\x00-\x7f]', ev['title']) and u not in set(existing.values())]:  # "Ḫantili" slugs to "antili": fold the letters first (rulers.slug stays as it is; an id that already shipped is never renamed)
        new = 'reign-' + R.slug(''.join(c for c in unicodedata.normalize('NFKD', events[old]['title'][9:]) if not unicodedata.combining(c)))
        if new != old and new not in events:
            events[new] = events.pop(old)
            events[new]['uuid'] = new
            for r_ in rows:
                if r_.get('uuid') == old:
                    r_['uuid'] = new
    os.makedirs(out, exist_ok=True)
    cols = ['row', 'person', 'qid', 'start', 'end', 'importance', 'reign', 'field', 'office', 'quote', 'wd', 'flags', 'route', 'cited', 'uuid']
    import csv
    with open(os.path.join(out, 'rulers.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, cols, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    json.dump({'reignIds': list(events), 'events': list(events.values()), 'sources': sources}, open(os.path.join(out, 'rulers-events.json'), 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
    print(f'{timeline}: {len(rows)} reigns -> {out}')


def norm_name(n):
    """A ruler's name reduced to compare a list's cell with a committed reign's title: no diacritics, titles, brackets or ordinal punctuation."""
    n = ''.join(c for c in unicodedata.normalize('NFKD', n or '') if not unicodedata.combining(c)).lower()
    n = re.sub(r'\([^)]*\)', ' ', n)
    n = re.sub(r"\b(emperor|empress|king|queen|pharaoh|mansa|sultan|of|the|marquis|marquess)\b", ' ', n)
    return re.sub(r'[^a-z0-9]+', ' ', n).strip()


def same_ruler(a, b):
    a, b = norm_name(a), norm_name(b)
    return bool(a and b and (a == b or set(a.split()) <= set(b.split()) or set(b.split()) <= set(a.split())) and min(len(a), len(b)) > 2)


def committed_reigns(timeline, row):
    """[(person, start year, end year or None)] of the reigns the timeline carries on `row` (events 'reign-*', title 'Reign of <person>' or the person)."""
    try:
        ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json'), encoding='utf-8'))
    except OSError:
        return None
    return [(re.sub(r'^Reign of ', '', e['title']), e.get('start'), e.get('end')) for e in ds['events'] if e['uuid'].startswith('reign-') and row in e.get('tracks', [])]


def row_window(timeline, row):
    """(first, last) historical year the row covers in the timeline: its phases or span, clamped to the timeline's range (as build() does)."""
    ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json'), encoding='utf-8'))
    tr = next(t for t in ds['tracks'] if t['id'] == row)
    w0, w1 = R.hist(ds['meta']['range']['start']), R.hist(ds['meta']['range']['end'])
    ph, sp = tr.get('phases') or [], tr.get('span') or {}
    r0 = max(w0, min(R.hist(p['start']) for p in ph) if ph else R.hist(sp['start']))
    r1 = min(w1, max(R.hist(p.get('end', w1)) for p in ph) if ph else R.hist(sp.get('end', w1)))
    return r0, r1


def diff(spec):
    """Candidate reigns of a spec against what the timelines already carry on the row: matched (same ruler, start within 2 years), date
    conflicts (same ruler, start apart by more), new (not on the row), and committed reigns the list does not name. Nothing is written."""
    wins = [row_window(t, spec['row']) for t in spec['timelines']]
    cands = [c for c in read(spec) if any(R.overlap(c['st'][0], R.year(c['en']), a, b) >= 0 for a, b in wins)]  # inside the row's own window
    mine = []
    for t in spec['timelines']:
        mine += committed_reigns(t, spec['row']) or []
    names = {}
    for c in cands:
        names.setdefault(c['name'], []).append(c)
    matched, conflict, new = [], [], []
    for name, cs in names.items():
        hit = [m for m in mine if same_ruler(name, m[0]) or same_ruler(cs[0]['article'] or '', m[0])]
        if not hit:
            new.append((name, cs))
        elif any(m[1] is not None and abs(R.hist(m[1]) - c['st'][0]) <= 2 for m in hit for c in cs):
            matched.append((name, cs))
        else:
            conflict.append((name, cs, hit))
    absent = [m for m in mine if not any(same_ruler(m[0], n) for n in names)]
    return cands, mine, matched, conflict, new, absent


def show_diff(spec):
    cands, mine, matched, conflict, new, absent = diff(spec)
    rep = []
    read(spec, rep)
    span = lambda c: f"{c['st'][0]}–{c['en'][0] if c['en'] else ''}{' c.' if c['circa'] else ''}"
    print(f"## {spec['row']} ← {spec['page']}: {len(mine)} reigns on the row; list gives {len({c['name'] for c in cands})} dated rulers ({len([x for x in rep if x.startswith('undated')])} rows undated, {len([x for x in rep if x.startswith('note')])} skipped as irregular)")
    print(f"  matched {len(matched)}, date conflicts {len(conflict)}, new candidates {len(new)}, on the row but not named by the list {len(absent)}")
    for name, cs, hit in conflict:
        print(f"  conflict: {name} list {', '.join(span(c) for c in cs[:2])} vs row {hit[0][0]} {hit[0][1]}–{hit[0][2]}")
    for name, cs in new[:200]:
        print(f"  new: {name} {span(cs[0])}  | {cs[0]['date_cell'][:45]}")
    for m in absent[:20]:
        print(f"  row-only: {m[0]} {m[1]}–{m[2]}")


def main():
    args = sys.argv[1:]
    if '--check' in args:
        sys.exit(0 if check() else 1)
    if '--diff' in args:
        for spec in SPEC['pages']:
            show_diff(spec)
        return
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
    if '--freeze' in args:  # --timeline T --freeze ROW --to FILE "note"
        freeze(args[args.index('--timeline') + 1], args[args.index('--freeze') + 1], args[args.index('--to') + 1], args[-1])
        return
    if '--timeline' in args:
        build(args[args.index('--timeline') + 1], args[args.index('--out') + 1])
        return
    print(__doc__)


if __name__ == '__main__':
    main()
