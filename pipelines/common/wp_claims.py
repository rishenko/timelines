"""
Claims and citations over the extractor (wp_states.extract), shared by the generators: art() reads an article once
(refusing missing and AI-flagged ones), ref() cites it by infobox field, sentence or heading, claims() turns one end of
a phase into its date claims (the chosen value first, the article's other values for that end after), plus the
phase/row/event builders the first generators used.

Every phase date is taken from the extracted Wikipedia data, never typed in: a phase names its article and which field
gives each end; the article's other start/end fields become extra date claims, each cited by its field, so the
article's own disagreements show as uncertainty.

ACC is the access date written into every citation, and PRESENT the year an ongoing state runs to. They are data:
changing either changes every timeline built with them.
"""
import re

from wp_states import extract

WP = 'https://en.wikipedia.org/wiki/'
ACC = '2026-11-21'
PRESENT = 2026
CACHE = {}
SOURCES = {}
REPORT = []


def art(title):
    if title not in CACHE:
        r = extract(title)
        if r.get('missing'):
            raise SystemExit(f'missing article: {title}')
        if r.get('ai_flagged'):
            raise SystemExit(f'AI-flagged article, not usable as a source: {title}')
        CACHE[title] = r
    return CACHE[title]


_QDB = []


def qid_of(title):
    """The Wikidata item of an article (redirects followed), from the extract DB's page_props table: the same lookup build_places.py does.
    None when the article has no Wikidata item. Needs the extract DB (it is a dump-derived input, recorded in the regen stamp's dumps)."""
    import os
    import sqlite3
    import settings
    if not _QDB:
        path = os.path.join(settings.WIKIPEDIA, f'extract-{settings.DUMP_NAME}.sqlite')
        _QDB.append(sqlite3.connect(f'file:{path}?mode=ro', uri=True))
    db = _QDB[0]
    t = title.replace('_', ' ')
    r = db.execute('SELECT q.qid FROM page p JOIN qid q ON q.page_id=p.page_id WHERE p.title=? AND p.ns=0', (t,)).fetchone()
    if not r:
        r = db.execute('SELECT q.qid FROM page p JOIN page t ON t.title=p.redirect_to JOIN qid q ON q.page_id=t.page_id WHERE p.title=? AND p.ns=0', (t,)).fetchone()
    return r[0] if r else None


def fill_wikidata_ids(tracks):
    """R1 (ontology review): every row that links a Wikipedia article carries `ids.wikidata`, the item of that article. Run once over the finished
    rows, so rows built by any route (a row() call, a catch-up copy from another timeline, an emitted conflict row) are covered. A row that
    already has an id keeps it (a different id for its article is an error); a row whose article has no item stays without (row-ids-allow.json)."""
    from urllib.parse import unquote
    n = 0
    for t in tracks:
        url = t.get('url') or ''
        if '/wiki/' not in url:
            continue
        q = qid_of(unquote(url.split('/wiki/', 1)[1]).split('#')[0])
        have = (t.get('ids') or {}).get('wikidata')
        if have and q and have != q:
            raise SystemExit(f"row {t['id']}: ids.wikidata {have} but its article {url} is {q}")
        if q and not have:
            t['ids'] = {**(t.get('ids') or {}), 'wikidata': q}
            n += 1
    return n


def src(title):
    r = art(title)
    key = 'wp-' + re.sub(r'[^a-z0-9]+', '-', r['title'].lower()).strip('-')
    SOURCES.setdefault(key, {'name': f"{r['title']} (Wikipedia)", 'url': WP + r['title'].replace(' ', '_'),
                             'accessed': ACC, 'tags': ['wikipedia']})
    return key


def ref(title, loc):
    return {'sourceKey': src(title), 'sourceLocation': loc}


def field_year(title, spec):
    """spec: 'seg0.start', 'seg-1.end', a field name ('year_start'), 'field:first'/'field:last', or an int."""
    r = art(title)
    if isinstance(spec, int):
        return spec, None
    if spec.startswith('seg'):
        i, side = spec[3:].split('.')
        seg = r['life_span_segments'][int(i)]
        y = seg[side]
        return (PRESENT if y is None else y), f"infobox life span: {seg['text']}"
    name, _, pos = spec.partition(':')
    if name not in r['fields'] and name in ('year_start', 'year_end'):
        # fall back to the article's own candidates for that end (life span, date_start/date_end…)
        cands = [(k, v) for k, v in (r['start_candidates'] if name == 'year_start' else r['end_candidates'])
                 if not k.startswith(('date_pre', 'date_post')) and isinstance(v, int)]
        if not cands:
            raise SystemExit(f'{title}: no {name} and no other start/end fields: {sorted(r["fields"])}')
        k, v = cands[0] if name == 'year_start' else cands[-1]
        f = r['fields'].get(k)
        return v, (f'infobox life span: {r["fields"]["life_span"]["text"][:80]}' if k == 'life_span' else f'infobox {k}: {f["text"][:80]}' if f else f'infobox {k}')
    f = r['fields'][name]
    y = f['years'][-1 if pos == 'last' else 0]
    label = f['text'][:80]
    if name.startswith('established_date'):
        ev = r['fields'].get(name.replace('date', 'event'), {}).get('text', '')
        return y, f'infobox: {ev} ({label})'
    return y, f'infobox {name}: {label}'


def claims(title, spec, side):
    """The chosen value first, then every other value the article gives for that end (its own disagreement)."""
    y, loc = field_year(title, spec)
    out = [{'year': y, 'source': ref(title, loc)}] if loc else [{'year': y, 'source': ref(title, 'infobox')}]
    r = art(title)
    # extra claims only when the field is this side's own field (an article's end used as a phase's start, e.g.
    # Egypt's 1971 renaming taken from the UAR's end, must not pick up the UAR's start years)
    if (spec, side) not in (('year_start', 'start'), ('year_end', 'end')):
        return y, out  # a single stretch or a founding-list entry: its own value only
    cands = r['start_candidates'] if side == 'start' else r['end_candidates']
    seen = {y}
    for k, v in cands:
        if k.startswith('date_pre') or k.startswith('date_post') or not isinstance(v, int) or v in seen:
            continue
        if abs(v - y) > 15:  # a different era of the article, not a disagreement about this end
            continue
        seen.add(v)
        f = r['fields'].get(k)
        out.append({'year': v, 'source': ref(title, f'infobox {k}: {f["text"][:80]}' if f else f'infobox {k}'),
                    'note': 'The same article gives this year too.'})
    return y, out


def phase(name, title, start, end, end_title=None, note=None, start_title=None):
    s, sc = claims(start_title or title, start, 'start')
    e, ec = claims(end_title or title, end, 'end')
    p = {'name': name, 'start': s, 'end': max(e, s), 'startDates': sc, 'endDates': ec}
    if e == PRESENT and end_title is None and str(end).endswith('end'):
        ec[0]['note'] = 'Still in being; today\'s format has no "ongoing", so it ends at the present year.'
    REPORT.append(f'  {name:42} {s}–{e}  ({title})' + (f'  claims s={sorted({c["year"] for c in sc})} e={sorted({c["year"] for c in ec})}' if len(sc) > 1 or len(ec) > 1 else ''))
    return p


def present_end(name, title, start):
    s, sc = claims(title, start, 'start')
    REPORT.append(f'  {name:42} {s}–present  ({title})')
    return {'name': name, 'start': s, 'end': PRESENT, 'startDates': sc,
            'endDates': [{'year': PRESENT, 'source': ref(title, 'infobox: current state'),
                          'note': 'Still in being; today\'s format has no "ongoing", so it ends at the present year.'}]}


def row(id_, name, color, parent, phases, url_title):
    REPORT.append(f'{name}')
    span = {'start': phases[0]['start'], 'end': max(p['end'] for p in phases),
            'startDates': phases[0]['startDates'], 'endDates': max(phases, key=lambda p: p['end'])['endDates']}
    return {'id': id_, 'name': name, 'color': color, 'parent': parent, 'url': WP + url_title.replace(' ', '_'),
            'span': span, 'phases': phases}


def ev(uuid, title, start, tracks, sref, end=None, importance=None, descr='', links=None):
    e = {'uuid': uuid, 'title': title, 'descr': descr, 'start': start, 'tracks': tracks, 'sources': [sref]}
    if end is not None:
        e['end'] = end
    if importance:
        e['importance'] = importance
    if links:
        e['links'] = links
    return e
