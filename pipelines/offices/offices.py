"""
The offices stage (v4 step 2, rules 5 and 6): the holders of the head-of-government and governor offices of the pilot rows, as reign events.

    pipelines/extract/.venv/bin/python -I pipelines/offices/offices.py            build the emitted file and the stage record, fail on a guard
    pipelines/extract/.venv/bin/python -I pipelines/offices/offices.py --check    build in memory and fail if either committed file would change
    pipelines/extract/.venv/bin/python -I pipelines/offices/offices.py --write-expected   print the guard figures as the expected file's skeleton

Inputs: offices-rows.json (the rows, their list pages and phases), hand-rulings.json (sourced rulings keyed by `row/NNN`, each carrying the
record it was made for), offices-expected.json (the count guards, every difference from Wikidata explained), the Wikipedia dump and the Wikidata
tables. Output: pipelines/v2/emitted/offices-modern-states.json (events, sources, review in the shape pipelines/common/reigns.py merges, plus `held` and `guards`) and
data-src/provenance/stages/offices.record.json. gen_modern.py merges the events with reigns.apply and adds the `ruler-kind` facet.
It lives in pipelines/v2/emitted/ (generated files) and is not named *-reigns.json: the reign guards read those against the rulers inputs, and these events are not rulers-pass reigns.

A record is one tenure: a table row of the page with a date pair (or the row's {{Ayd}} date), the person read from its name cell. A person with no
Wikipedia article or whose item cannot be settled has qid null and a flag; nothing is guessed. Held out, never stretched: a record before the
timeline's first year, a person who never took the office (a ruling), one outside every phase of its row.
"""
import collections
import hashlib
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path[:0] = [HERE]
import office_lists as O  # noqa: E402

OUT = os.path.join(ROOT, 'pipelines', 'v2', 'emitted', 'offices-modern-states.json')  # beside the other emitted files: generated, never an input
RECORD = os.path.join(ROOT, 'data-src', 'provenance', 'stages', 'offices.record.json')
CODE = ['pipelines/offices/offices.py', 'pipelines/offices/office_lists.py', 'pipelines/offices/offices-rows.json', 'pipelines/offices/hand-rulings.json',
        'pipelines/offices/offices-expected.json', 'pipelines/common/wp_dump.py', 'pipelines/common/data_root.py', 'pipelines/v2/list_rows.py']
KINDS = {'head-of-government': 'Head of government', 'sub-ruler': 'Governor (sub-ruler)'}


def load(name):
    return json.load(open(os.path.join(HERE, name), encoding='utf-8'))


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def facet():
    """The `ruler-kind` event facet: what kind of ruler an event's holder was. Absent means not stated, never head."""
    return {'name': 'Kind of ruler', 'applies': 'events', 'values': {k: {'name': v} for k, v in KINDS.items()}}


def date_text(iso):
    p = iso.split('-')
    if len(p) == 3: return f'{int(p[2])} {list(O.MN)[int(p[1]) - 1]} {int(p[0])}'
    if len(p) == 2: return f'{list(O.MN)[int(p[1]) - 1]} {int(p[0])}'
    return str(int(p[0]))


def parts(iso):
    p = [int(x) for x in iso.split('-')]
    return p + [None] * (3 - len(p))


def wd_holders(q):
    got = []
    for (p, sid) in O.W.execute("select qid, sid from wd_link where prop='P39' and target=?", (q,)):
        got.append(p)
    terms = O.W.execute("select count(*) from wd_link where prop='P39' and target=?", (q,)).fetchone()[0]
    return set(got), terms


def read_rows(spec):
    """{row id: (page, [record])}: every record with its key `row/NNN` (NNN: its place in the page's reading order), QID and flags."""
    out = {}
    for r in spec['rows']:
        pg, tn = O.read(r['page'], r['tables'], r['keep_nameless'], [])
        recs = []
        for k, t in enumerate(tn):
            q = O.qid_of(t['link'])
            fl = list(t['flags'])
            if not t['link'] and not any('Interlanguage' in f for f in fl): fl.append('no person link on the page: unresolved')
            elif t['link'] and not q: fl.append(f"link {t['link']!r} has no Wikidata item in the dump: unresolved")
            quote = f"{t['name']} | {t['start_text']} | {t['end_text']}" + (f" ({t['note']})" if t['note'] else '')
            recs.append(dict(key=f"{r['id']}/{k:03d}", row=r['id'], qid=q, name=t['name'], link=t['link'], start=t['start'], end=t['end'], end_open=t['end_open'],
                             number=t['number'], cabinets=t['cabinets'], table=t['table'], rowidx=t['rowidx'], quote=quote, flags=fl, extra_sources=[], held=None))
        out[r['id']] = (pg, recs)
    return out


def apply_rulings(rows, rulings):
    """Each ruling names the record it was made for (`expect`); a record that moved fails the build rather than taking another's ruling."""
    by = {rec['key']: rec for _, recs in rows.values() for rec in recs}
    for r in rulings:
        rec = by.get(r['uuid_key'])
        if rec is None or (rec['name'], rec['start'], rec['end']) != (r['expect']['name'], r['expect']['start'], r['expect']['end']):
            raise SystemExit(f"hand-rulings.json: {r['uuid_key']} is not the record the ruling was made for ({r['expect']}); got {rec and (rec['name'], rec['start'], rec['end'])}")
        t = r['type']
        if t == 'qid-from-sitelink':
            if r['decision'] == 'accept': rec['qid'] = r['qid']; rec['flags'] = [f for f in rec['flags'] if 'Interlanguage' not in f] + [f"QID from the other-language page's Wikidata sitelink ({r['basis']})"]
            else: rec['flags'].append(f"candidate {r['candidate_qid']} not taken: {r['basis']}")
        elif t == 'link':
            if rec['link'] != r['link']: raise SystemExit(f"{r['uuid_key']}: the reader chose link {rec['link']!r}, the ruling says {r['link']!r}")
        elif t == 'hand-entry':
            rec['qid'] = r['qid']
            rec['flags'] = [f for f in rec['flags'] if 'unresolved' not in f] + r['flags'] + [f"hand entry from {r['source']}: {r['quote_es']!r}"]
            rec['extra_sources'].append(dict(key='wp-es-' + slug(rec['name']), name=f"{rec['name']} (Spanish Wikipedia, translated)", url='https://es.wikipedia.org/wiki/' + 'Juan_Peñalosa_y_Benavides',
                                             loc=f"lead: {r['quote_es']}"))
        elif t == 'exclude':
            rec['held'] = f"{r['decision']}: {r['quote']} ({r['source']})"
        elif t == 'pairing':
            if rec['qid'] != r['qid']: raise SystemExit(f"{r['uuid_key']}: expected QID {r['qid']}")


def windows(phases):
    """The row's phase windows as merged year ranges; a row with none has no window."""
    out = []
    for s, e in sorted((p[0], p[1] if p[1] is not None else 10 ** 6) for p in phases):
        if out and s <= out[-1][1]: out[-1][1] = max(out[-1][1], e)
        else: out.append([s, e])
    return out


def existing(spec):
    """The reigns already committed for the timeline (the generator's inputs, not its output): ({(track, qid): [(start, end, uuid)]}, {uuid})."""
    by, uuids = collections.defaultdict(list), set()
    for f in ('reigns.json', 'extra-reigns.json'):
        p = os.path.join(ROOT, 'pipelines', spec['timeline'], f)
        if not os.path.exists(p): continue
        d = json.load(open(p, encoding='utf-8'))
        ev = {e['uuid']: e for e in d['events']}
        uuids |= set(ev)
        for u, r in d['review'].items():
            if r.get('qid'): by[(r['row'], r['qid'])].append((ev[u]['start'], ev[u].get('end', ev[u]['start']), u))
    red = os.path.join(ROOT, 'pipelines', spec['timeline'], 'redirects.json')  # an id removed on purpose stays retired: a new event takes another id
    if os.path.exists(red): uuids |= set(json.load(open(red, encoding='utf-8'))['redirects'])
    return by, uuids


def hold_out(rows, spec):
    by, _ = existing(spec)
    for r in spec['rows']:
        w = windows(r['phases'])
        for rec in rows[r['id']][1]:
            if rec['held']: continue
            y0 = parts(rec['start'])[0]
            y1 = 10 ** 6 if rec['end_open'] else parts(rec['end'])[0]
            dup = [u for a, b, u in by.get((r['track'], rec['qid']), []) if rec['qid'] and a == y0 and b == (y1 if y1 != 10 ** 6 else b)]
            if dup: rec['held'] = f'already a reign event ({dup[0]}, the same person, row and years)'
            elif y0 < spec['from']: rec['held'] = f"before the timeline's first year ({spec['from']})"
            elif w and not any(a <= y0 and y1 <= b for a, b in w): rec['held'] = f'outside every phase of the row {w}'


def page_sources(spec, rows):
    """Source entries: each list page and each person's article, keyed wp-<slug>."""
    src = {}
    for r in spec['rows']:
        pg = rows[r['id']][0]
        src['wp-' + slug(pg['title'])] = dict(name=f"{pg['title']} (Wikipedia)", url='https://en.wikipedia.org/wiki/' + pg['title'].replace(' ', '_'), accessed=spec['accessed'], tags=['wikipedia'])
    return src


def event(rec, r, pg, n_before, sources):
    """The reign event of one record, the shape of the rulers-pass reigns (title, descr, tracks, sources, importance, memberships)."""
    row_key = 'wp-' + slug(pg['title'])
    s0, e0 = rec['start'], rec['end']
    name = rec['name']
    cited = rec['link'] or None
    base = slug(cited or name)
    uuid = f"reign-{base}-{r['track']}" + (f"-{parts(s0)[0]}" if n_before else '')
    loc = f"table {rec['table']}, row {rec['rowidx']}: {rec['quote']}"
    srcs = [dict(sourceKey=row_key, sourceLocation=loc)]
    if cited and not rec['extra_sources']:
        k = 'wp-' + slug(cited)
        sources.setdefault(k, dict(name=f'{cited} (Wikipedia)', url='https://en.wikipedia.org/wiki/' + cited.replace(' ', '_'), accessed=sources[row_key]['accessed'], tags=['wikipedia']))
        srcs.append(dict(sourceKey=k, sourceLocation=f'article: {cited}'))
    for x in rec['extra_sources']:
        sources.setdefault(x['key'], dict(name=x['name'], url=x['url'], accessed=sources[row_key]['accessed'], tags=['wikipedia']))
        srcs.append(dict(sourceKey=x['key'], sourceLocation=x['loc']))
    y0, m0, d0 = parts(s0)
    ev = dict(uuid=uuid, title=f"{r['office']} {name}", start=y0)
    if m0: ev['startMonth'] = m0
    if d0: ev['startDay'] = d0
    if rec['end_open']:
        ev['ongoing'] = True
        ev['ongoingSources'] = [dict(srcs[0])]
        span = f'from {date_text(s0)} to the present'
    else:
        y1, m1, d1 = parts(e0)
        ev['end'] = y1
        if m1: ev['endMonth'] = m1
        if d1: ev['endDay'] = d1
        span = f'from {date_text(s0)} to {date_text(e0)}'
    ev.update(tracks=[r['track']], descr=f"Holds the office of {r['office']} ({r['of'].split(' (')[0]}) of {r['name']} {span}.", sources=srcs, importance=3,
              memberships=[dict(facet='category', value='reign', sources=[dict(srcs[0])]), dict(facet='ruler-kind', value=r['kind'], sources=[dict(srcs[0])])])
    return ev


def build():
    spec, rulings = load('offices-rows.json'), load('hand-rulings.json')
    rows = read_rows(spec)
    apply_rulings(rows, rulings)
    hold_out(rows, spec)
    sources = page_sources(spec, rows)
    _, taken = existing(spec)
    events, review, held = [], {}, []
    for r in spec['rows']:
        pg, recs = rows[r['id']]
        per = collections.Counter()
        for rec in recs:
            who = rec['qid'] or rec['link'] or rec['name']
            if rec['held']:
                per[who] += 1  # a held term still counts as a term of the person, so a later term keeps its -<year> uuid
                held.append(dict(key=rec['key'], row=r['id'], name=rec['name'], start=rec['start'], end=rec['end'], reason=rec['held'])); continue
            ev = event(rec, r, pg, per[who], sources)
            per[who] += 1
            n = 1
            while ev['uuid'] in taken:  # another person's slug, or a committed reign of the same name: the year, then a number
                n += 1
                ev['uuid'] = re.sub(r'(-\d{3,4})?(-\d+)?$', '', ev['uuid']) if False else ev['uuid']
                ev['uuid'] = f"{ev['uuid']}-{parts(rec['start'])[0]}" if n == 2 else f"{ev['uuid']}-{n}"
            taken.add(ev['uuid'])
            events.append(ev)
            review[ev['uuid']] = dict(row=r['track'], person=rec['name'], qid=rec['qid'], route=f"list: {pg['title']}", cited=rec['link'], office=r['office'], kind=r['kind'],
                                      pageNumber=rec['number'], cabinets=rec['cabinets'], key=rec['key'], toCheck=rec['flags'])
    return spec, rows, dict(note='Generated by pipelines/offices/offices.py (v4 step 2); do not edit. Merged by gen_modern.py with reigns.apply.', events=events, sources=sources, review=review,
                            held=held)


def digits(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def main(argv):
    spec, rows, out = build()
    out['guards'] = guards(spec, rows, out)
    text = json.dumps(out, ensure_ascii=False, indent=1) + '\n'
    if '--write-expected' in argv:
        print(json.dumps(out['guards'], ensure_ascii=False, indent=1)); return
    problems = check_expected(out['guards'])
    if problems:
        print('guard failures:\n  ' + '\n  '.join(problems)); sys.exit(1)
    rec = json.dumps(record(spec, rows, text), ensure_ascii=False, indent=1) + '\n'
    if '--check' in argv:
        stale = [p for p, t in ((OUT, text), (RECORD, rec)) if not os.path.exists(p) or open(p, encoding='utf-8').read() != t]
        if stale: print('stale: ' + ', '.join(os.path.relpath(p, ROOT) for p in stale)); sys.exit(1)
        print(f"offices: {len(out['events'])} events, {len(out['held'])} held: committed files match"); return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
    os.makedirs(os.path.dirname(RECORD), exist_ok=True)
    open(RECORD, 'w', encoding='utf-8', newline='\n').write(rec)
    print(f"offices: {len(out['events'])} events on {len(spec['rows'])} rows, {len(out['held'])} held out")


def record(spec, rows, text):
    return dict(stage='offices', layer='L3', dumps=dict(wikipedia=os.environ.get('TIMELINES_WP_DUMP', 'enwiki-20261101'), wikidata='wikidata-20261116'),
                pages={r['page']: rows[r['id']][0]['revision'] for r in spec['rows']}, code={f: digits(os.path.join(ROOT, f)) for f in CODE},
                outputs={'pipelines/v2/emitted/offices-modern-states.json': hashlib.sha256(text.encode('utf-8')).hexdigest()})


def guards(spec, rows, out):
    """The count guards: each row's records against Wikidata's P39 holders and the page's own numbering, every difference listed by its QID."""
    g = {}
    tbls = {}
    for r in spec['rows']:
        pg, recs = rows[r['id']]
        people = {x['qid'] for x in recs if x['qid']}
        wd, terms = wd_holders(r['wd']) if r['wd'] else (set(), 0)
        gr = dict(records=len(recs), people=len(people), unresolved=sum(1 for x in recs if not x['qid']), wikidata_people=len(wd), wikidata_terms=terms, both=len(people & wd),
                  list_only=sorted(people - wd), wikidata_only=sorted(wd - people))
        nums = [x for x in recs if x['number']]
        if r['id'] in ('denmark', 'british-india', 'peru'):
            seqs = collections.defaultdict(list)
            for x in recs:
                if x['number']: seqs[x['table']].append(int(re.sub(r'\D', '', x['number'])) if not x['number'].startswith('(') else None)
            gr['numbering'] = {str(t): collapse([v for v in s if v is not None]) for t, s in sorted(seqs.items())}
            gr['unnumbered'] = sum(1 for x in recs if not x['number'])
        text = pg['text']
        alltb = [m.group(0) for m in re.finditer(r'\{\|.*?\n\|\}', text, re.S)]
        have = {(x['table'], x['rowidx']) for x in recs}
        cand = []
        namecells = 0
        for ti in r['tables']:
            for ri, rw in enumerate(alltb[ti].split('\n|-')[1:]):
                raw = [c[0] for c in O.LR._cells(rw)]
                plain = [O.clean(c) for c in raw]
                link = any((O.person_link(c) or O.ILL.search(c)) and not re.search(r'\bcabinet\b', c, re.I) for c in raw)
                dated = bool(O.AYD.search(rw)) or any(O.date_cell(c) for c in plain)
                if r['id'] == 'ottoman':
                    nc = [c for c in raw if "'''" in c and (O.LR.LINK.search(c) or O.ILL.search(c)) and not re.search(r'\[\[(File|Image):', c, re.I)]
                    namecells += len(nc) if (ti, ri) in have else 0
                    gr.setdefault('name_cells_unrecorded', 0)
                    gr['name_cells_unrecorded'] += 0 if (ti, ri) in have else len(nc)
                if link and dated and (ti, ri) not in have:
                    cand.append(len([c for c in plain if c]) <= 3 or bool(re.search(r'\d+\. ', ' | '.join(plain))))
        gr['page_rows_without_record'] = len(cand)
        gr['page_rows_unexplained'] = sum(1 for c in cand if not c)
        if r['id'] == 'ottoman': gr['name_cells_with_record'] = namecells
        if r['id'] == 'japan':
            order = sorted(x['rowidx'] for x in recs if x['table'] == 1)
            cab = []
            for ri, rw in enumerate(alltb[1].split('\n|-')[1:]):
                for c in O.LR._cells(rw):
                    cc = O.clean(c[0])
                    if re.match(r'^\d+\. \S', cc): cab.append(int(cc.split('.')[0]))
            gr['cabinets'] = len(cab)
            gr['cabinets_contiguous'] = sorted(cab) == list(range(1, len(cab) + 1))
        gr['held'] = sum(1 for x in recs if x['held'])
        g[r['id']] = gr
    return g


def collapse(v):
    """[1,2,3,1,2] -> ['1-3', '1-2']: the runs of the page's number column."""
    runs = []
    for x in v:
        if runs and x == runs[-1][-1] + 1: runs[-1].append(x)
        else: runs.append([x])
    return [f'{r[0]}-{r[-1]}' for r in runs]


def check_expected(g):
    exp = load('offices-expected.json')['rows']
    problems = []
    for rid, got in g.items():
        want = exp.get(rid)
        if want is None: problems.append(f'{rid}: no expected figures'); continue
        for k, v in got.items():
            if k in ('list_only', 'wikidata_only'):
                if sorted(want[k]) != v: problems.append(f"{rid}: {k} differs: unexplained {sorted(set(v) ^ set(want[k]))}")
            elif want.get(k) != v: problems.append(f'{rid}: {k} is {v}, expected {want.get(k)}')
        if got['page_rows_unexplained']: problems.append(f"{rid}: {got['page_rows_unexplained']} page rows look like tenures and have no record")
    return problems


if __name__ == '__main__':
    main(sys.argv[1:])
