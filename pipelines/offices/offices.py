"""
The offices stage (v4 step 2, rules 5 and 6): the holders of the head-of-government and governor offices of the pilot rows, as reign events.

    pipelines/extract/.venv/bin/python -I pipelines/offices/offices.py            build the emitted file and the stage record, fail on a guard
    pipelines/extract/.venv/bin/python -I pipelines/offices/offices.py --check    build in memory and fail if either committed file would change
    pipelines/extract/.venv/bin/python -I pipelines/offices/offices.py --write-expected   print the guard figures as the expected file's skeleton

Inputs: offices-rows.json (the rows, their list pages and phases), hand-rulings.json (sourced rulings keyed by `row/NNN`, each carrying the
record it was made for), offices-expected.json (the count guards, every difference from Wikidata explained), the Wikipedia dump and the Wikidata
tables. Output: pipelines/offices/emitted/offices-modern-states.json (events, sources, review in the shape pipelines/common/reigns.py merges, plus `held` and `guards`) and
data-src/provenance/stages/offices.record.json. gen_modern.py merges the events with reigns.apply and adds the `ruler-kind` facet.
It lives in pipelines/offices/emitted/ (generated files, hashed as outputs) and is not named *-reigns.json: the reign guards read those against the rulers inputs, and these events are not rulers-pass reigns.

A record is one tenure: a table row of the page with a date pair (or the row's {{Ayd}} date), the person read from its name cell. A person with no
Wikipedia article or whose item cannot be settled has qid null and a flag; nothing is guessed. Held out, never stretched: a record before the
timeline's first year, a person who never took the office (a ruling), one outside every phase of its row.
"""
import collections
import glob
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
from office_guards import check_expected, collapse, guards, load, wd_holders  # noqa: E402,F401

RECORD = os.path.join(ROOT, 'data-src', 'provenance', 'stages', 'offices.record.json')
CODE = ['pipelines/offices/offices.py', 'pipelines/offices/office_lists.py', 'pipelines/offices/office_guards.py', 'pipelines/offices/offices-rows.json', 'pipelines/offices/hand-rulings.json',
        'pipelines/offices/offices-expected.json', 'pipelines/common/wp_dump.py', 'pipelines/common/data_root.py', 'pipelines/v2/list_rows.py']


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def date_text(iso):
    p = iso.split('-')
    if len(p) == 3: return f'{int(p[2])} {list(O.MN)[int(p[1]) - 1]} {int(p[0])}'
    if len(p) == 2: return f'{list(O.MN)[int(p[1]) - 1]} {int(p[0])}'
    return str(int(p[0]))


def parts(iso):
    p = [int(x) for x in iso.split('-')]
    return p + [None] * (3 - len(p))


def read_rows(spec):
    """{row id: (page, [record])}: every record with its key `row/NNN` (NNN: its place in the page's reading order), QID and flags."""
    out = {}
    for r in spec['rows']:
        if r.get('frozen'):  # records frozen from a family's extraction (a Dev's reader run on the page, cut to the colony window): read back as they are
            f = load(r['frozen'])
            recs = [dict(x) for x in f['records']]
            lp = O.wp_dump.page(f['page']['title'])
            if lp and O.wp_dump.ai_flagged(lp['text']):  # the list page itself is flagged: nothing from it is used
                for x in recs: x['held'] = x['held'] or 'the list page is flagged for AI-generated text'
            out[r['id']] = (dict(title=f['page']['title'], revision=f['page']['revision'], timestamp=f['page'].get('timestamp'), text=''), recs)
            continue
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
        elif t == 'date':  # a ruling on a date the list gets wrong, from the person's own page: the end is replaced and the ruling is cited
            rec['end'] = r['end']; rec['end_open'] = False
            rec['flags'].append(f"date ruling: end {r['end']} instead of {r['expect']['end']}: {r['basis']}")
            rec['extra_sources'].append(dict(key=r['source_key'], name=r['source_name'], url=r['source_url'], loc=r['source_loc']))
        elif t == 'pairing':
            if rec['qid'] != r['qid']: raise SystemExit(f"{r['uuid_key']}: expected QID {r['qid']}")


def windows(phases):
    """The row's phase windows as merged year ranges; a row with none has no window."""
    out = []
    for s, e in sorted((p[0], p[1] if p[1] is not None else 10 ** 6) for p in phases):
        if out and s <= out[-1][1]: out[-1][1] = max(out[-1][1], e)
        else: out.append([s, e])
    return out


def existing(timeline):
    """The reigns already committed for a timeline (the generator's inputs, not its output): ({(track, qid): [(start, end, uuid)]}, {uuid})."""
    by, uuids = collections.defaultdict(list), set()
    folder = {'modern-states': 'modern-states', 'medieval': 'medieval', 'ancient-classical': 'ancient'}[timeline]
    for f in ('reigns.json', 'extra-reigns.json'):
        p = os.path.join(ROOT, 'pipelines', folder, f)
        if not os.path.exists(p): continue
        d = json.load(open(p, encoding='utf-8'))
        ev = {e['uuid']: e for e in d['events']}
        uuids |= set(ev)
        for u, r in d['review'].items():
            if r.get('qid'): by[(r['row'], r['qid'])].append((ev[u]['start'], ev[u].get('end', ev[u]['start']), u))
    red = os.path.join(ROOT, 'pipelines', folder, 'redirects.json')  # an id removed on purpose stays retired: a new event takes another id
    if os.path.exists(red): uuids |= set(json.load(open(red, encoding='utf-8'))['redirects'])
    return by, uuids


def window(tl):
    """A row's window in a timeline: its phases merged, else its span; None when it has neither (any year of the timeline)."""
    if tl.get('phases'): return windows(tl['phases'])
    if tl.get('span') and tl['span'][0] is not None: return [[tl['span'][0], tl['span'][1] if tl['span'][1] is not None else 10 ** 6]]
    return None


def hold_out(rows, spec):
    """Gives each record its timeline (`rec['timeline']`) or the reason it is held. A tenure goes to the first timeline whose year range holds all of it and
    whose window for the row (phases, else span) does too."""
    by = {tl: existing(tl)[0] for tl in spec['timelines']}
    for _, recs in rows.values():
        # The same person twice (same QID, or the same name where both QIDs are null): with the same dates, the page lists the tenure twice (Ahmed Vefik, 4 Feb-18 Apr 1878,
        # ends table 3 and opens table 4); with the same start and an end no later, the earlier record covers it (R15: Qadi Jahan Qazvini's joint 1535 term starts his
        # continuous spell). The first live record stands. Records split from one joint line are co-holders of different people and are never compared by quote.
        live = {}
        for rec in recs:
            if rec['held']: continue
            who = rec['qid'] or ('name', rec['name'])
            for key, st, en in live.get(who, []):
                if st == rec['start'] and en == rec['end']: rec['held'] = f"repeated on the page: the same person and dates as {key}"; break
                if st == rec['start'] and rec['end'] and en and rec['end'] <= en: rec['held'] = f"covered by {key} (the same person's spell from {st}): R15"; break
            else:
                live.setdefault(who, []).append((rec['key'], rec['start'], rec['end']))
    for r in spec['rows']:
        for rec in rows[r['id']][1]:
            if rec['held']: continue
            if not rec['start'] or (not rec['end'] and not rec['end_open']):  # a page that prints one end of a term as "?" or nothing: not placed, nothing filled from the next row
                rec['held'] = 'the page gives only one end of the term (the other is "?" or missing): not placed, nothing filled in'; continue
            y0 = parts(rec['start'])[0]
            y1 = 10 ** 6 if rec['end_open'] else parts(rec['end'])[0]
            why = []
            for name, cfg in spec['timelines'].items():
                row = r['timelines'].get(name)
                if row is None: why.append(f'{name}: the row is not in the timeline'); continue
                dup = [u for a, b, u in by[name].get((r['track'], rec['qid']), []) if rec['qid'] and a == y0 and b == (y1 if y1 != 10 ** 6 else b)]
                if dup: rec['held'] = f'already a reign event ({dup[0]}, the same person, row and years)'; break
                lo, hi = cfg['from'], cfg['to']
                if not (lo <= y0 and (y1 <= hi or (rec['end_open'] and hi >= 2026))): why.append(f'{name}: outside its years {lo}-{hi}'); continue
                w = window(row)
                if w and r.get('window_from') is not None: w = [[min(w[0][0], r['window_from']), w[0][1]]] + w[1:]  # a ruled exception to the row's span (offices-rows.json `window_why`)
                if w and not any(a <= y0 and y1 <= b for a, b in w): why.append(f'{name}: outside every phase or the span of the row {w}'); continue
                rec['timeline'] = name; break
            if not rec.get('timeline') and not rec['held']:
                rec['held'] = 'no timeline holds it: ' + '; '.join(why)


def page_sources(spec, rows):
    """Source entries: each list page and each person's article, keyed wp-<slug>."""
    src = {}
    for r in spec['rows']:
        pg = rows[r['id']][0]
        src['wp-' + slug(pg['title'])] = dict(name=f"{pg['title']} (Wikipedia)", url='https://en.wikipedia.org/wiki/' + pg['title'].replace(' ', '_'), accessed=spec['accessed'], tags=['wikipedia'])
    return src


_PAGES = {}


def person_page_ok(title, rec):
    """Whether a person's article may be cited: it is in the dump and is not flagged for AI-generated text (data:check refuses a flagged source). Said in the record's flags when not."""
    if title not in _PAGES:
        p = O.wp_dump.page(title)
        _PAGES[title] = 'missing' if not p else 'flagged' if O.wp_dump.ai_flagged(p['text']) else 'ok'
    if _PAGES[title] == 'ok': return True
    rec['flags'].append(f"the article {title!r} is {'not in the dump enwiki-20261101' if _PAGES[title] == 'missing' else 'flagged for AI-generated text'}: not cited")
    return False


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
    if cited and not person_page_ok(cited, rec):  # a page the dump lacks, or one flagged for AI-generated text: the list row is the source, the record stays
        cited = None
    if cited and not rec['extra_sources']:
        k = 'wp-' + slug(cited)
        sources.setdefault(k, dict(name=f'{cited} (Wikipedia)', url='https://en.wikipedia.org/wiki/' + cited.replace(' ', '_'), accessed=sources[row_key]['accessed'], tags=['wikipedia']))
        srcs.append(dict(sourceKey=k, sourceLocation=f'article: {cited}'))
    for x in rec['extra_sources']:
        sources.setdefault(x['key'], dict(name=x['name'], url=x['url'], accessed=sources[row_key]['accessed'], tags=['wikipedia']))
        srcs.append(dict(sourceKey=x['key'], sourceLocation=x['loc']))
    y0, m0, d0 = parts(s0)
    ev = dict(uuid=uuid, title=f"{r.get('event_title', r['office'])} {name}", start=y0)
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
    ec = rec.get('extra_claims') or {}  # a date the person's page gives differently from the list: the list's first, the page's second, each cited
    locs = {x['key']: x['loc'] for x in rec['extra_sources']}

    def claim(iso, **src):
        y, m, d = parts(iso)
        return dict(year=y, **({'month': m} if m else {}), **({'day': d} if d else {}), source=src)

    def extra(c):
        iso = f"{c['year']:04d}" + (f"-{c['month']:02d}" if c.get('month') else '') + (f"-{c['day']:02d}" if c.get('day') else '')
        return dict(claim(iso, sourceKey=c['source_key'], sourceLocation=locs[c['source_key']]), **({'note': c['note']} if c.get('note') else {}))
    if ec.get('startDates'):
        ev['startDates'] = [claim(s0, sourceKey=row_key, sourceLocation=loc)] + [extra(c) for c in ec['startDates']]
    if ec.get('endDates') and not rec['end_open']:
        ev['endDates'] = [claim(e0, sourceKey=row_key, sourceLocation=loc)] + [extra(c) for c in ec['endDates']]
    return ev


def build():
    return build_from(load('offices-rows.json'), load('hand-rulings.json'))


def cited(events):
    keys = set()
    for e in events:
        for x in e['sources'] + e.get('ongoingSources', []) + [y for m in e.get('memberships', []) for y in m['sources']]: keys.add(x['sourceKey'])
    return keys


def build_from(spec, rulings):
    """(spec, rows, files): files = {timeline: {note, events, sources, review}}, the first timeline's file also carrying `held` (every record held out, with its reason)."""
    rows = read_rows(spec)
    apply_rulings(rows, rulings)
    hold_out(rows, spec)
    sources = page_sources(spec, rows)
    taken = {tl: existing(tl)[1] for tl in spec['timelines']}
    files = {tl: dict(events=[], review={}) for tl in spec['timelines']}
    held = []
    for r in spec['rows']:
        pg, recs = rows[r['id']]
        per = collections.Counter()
        for rec in recs:
            who = rec['qid'] or rec['link'] or rec['name']
            if rec['held']:
                per[who] += 1  # a held term still counts as a term of the person, so a later term keeps its -<year> uuid
                held.append(dict(key=rec['key'], row=r['id'], name=rec['name'], start=rec['start'], end=rec['end'], reason=rec['held'])); continue
            tl = rec['timeline']
            ev = event(rec, r, pg, per[who], sources)
            per[who] += 1
            n = 1
            while ev['uuid'] in taken[tl]:  # another person's slug, or a committed reign of the same name: the year, then a number
                n += 1
                ev['uuid'] = f"{ev['uuid']}-{parts(rec['start'])[0]}" if n == 2 else f"{ev['uuid']}-{n}"
            taken[tl].add(ev['uuid'])
            files[tl]['events'].append(ev)
            files[tl]['review'][ev['uuid']] = dict(row=r['track'], person=rec['name'], qid=rec['qid'], route=f"list: {pg['title']}", cited=rec['link'], office=r['office'], kind=r['kind'],
                                                   pageNumber=rec['number'], cabinets=rec['cabinets'], key=rec['key'], toCheck=rec['flags'])
    for tl, f in files.items():
        keys = cited(f['events'])
        f['sources'] = {k: v for k, v in sources.items() if k in keys}
        f['note'] = f'Generated by pipelines/offices/offices.py (v4 step 2); do not edit. Merged by the {tl} generator with reigns.apply_offices.'
    files[next(iter(spec['timelines']))]['held'] = held
    return spec, rows, files


def digits(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def emitted_path(tl):
    return os.path.join(HERE, 'emitted', f'offices-{tl}.json')


def main(argv):
    spec, rows, files = build()
    primary = next(iter(spec['timelines']))
    files[primary]['guards'] = guards(spec, rows, files)
    if '--write-expected' in argv:
        print(json.dumps(files[primary]['guards'], ensure_ascii=False, indent=1)); return
    problems = check_expected(files[primary]['guards'])
    if problems:
        print('guard failures:\n  ' + '\n  '.join(problems)); sys.exit(1)
    texts = {tl: json.dumps(f, ensure_ascii=False, indent=1) + '\n' for tl, f in files.items() if f['events'] or tl == primary}  # a timeline with no records gets no file
    rec = json.dumps(record(spec, rows, texts), ensure_ascii=False, indent=1) + '\n'
    summary = ', '.join(f"{len(files[tl]['events'])} {tl}" for tl in files)
    if '--check' in argv:
        want = {emitted_path(tl): t for tl, t in texts.items()}
        want[RECORD] = rec
        stale = [p for p, t in want.items() if not os.path.exists(p) or open(p, encoding='utf-8').read() != t]
        stale += [emitted_path(tl) for tl in files if tl not in texts and os.path.exists(emitted_path(tl))]
        if stale: print('stale: ' + ', '.join(os.path.relpath(p, ROOT) for p in stale)); sys.exit(1)
        print(f"offices: {sum(len(f['events']) for f in files.values())} events ({summary}), {len(files[primary]['held'])} held: committed files match"); return
    os.makedirs(os.path.dirname(emitted_path(primary)), exist_ok=True)
    for tl in files:
        if tl in texts: open(emitted_path(tl), 'w', encoding='utf-8', newline='\n').write(texts[tl])
        elif os.path.exists(emitted_path(tl)): os.remove(emitted_path(tl))
    os.makedirs(os.path.dirname(RECORD), exist_ok=True)
    open(RECORD, 'w', encoding='utf-8', newline='\n').write(rec)
    print(f"offices: {sum(len(f['events']) for f in files.values())} events ({summary}) on {len(spec['rows'])} rows, {len(files[primary]['held'])} held out")


def record(spec, rows, texts):
    return dict(stage='offices', layer='L3', dumps=dict(wikipedia=os.environ.get('TIMELINES_WP_DUMP', 'enwiki-20261101'), wikidata='wikidata-20261116'),
                pages={r['page']: rows[r['id']][0]['revision'] for r in spec['rows']}, code={f: digits(os.path.join(ROOT, f)) for f in CODE + sorted(os.path.relpath(x, ROOT).replace(os.sep, '/') for x in glob.glob(os.path.join(HERE, 'frozen', '*.json')))},
                outputs={f'pipelines/offices/emitted/offices-{tl}.json': hashlib.sha256(t.encode('utf-8')).hexdigest() for tl, t in texts.items()})


if __name__ == '__main__':
    main(sys.argv[1:])
