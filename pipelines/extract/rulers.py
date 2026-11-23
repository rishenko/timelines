"""
Row pass, rulers (Kevin, 2026-11-22): for each polity row of a timeline, every ruler as a reign span event on that row
("Reign of Louis XIV", 1643-05-14 to 1715-09-01), like Ancient's Reign of Akhenaten. No schema change.

Who: Wikidata finds the rulers. The row's article and its phases' articles give polity items; each polity's "office
held by head of state" (P1906) leads to every person whose "position held" (P39) names that office, with its start/end
qualifiers; the polity's own "head of state" (P35) statements add the rest.
When: the dates are the ruler's own Wikipedia infobox (`reign`, `reign1`… for monarchs; `term_start`/`term_end` for office
holders), cited as such. Wikidata's term is the cross-check: a disagreement is a review flag, never a silent fix.
How visible: all rulers are kept. Importance 2 (normal) goes to the top ~1 per 25 years of the row's span in the window,
ranked by reign length times log inbound links; the rest get 3 (minor, folded into "+N").

    pipelines/extract/.venv/bin/python -I pipelines/extract/rulers.py --timeline modern-states --rows france,spain [--preview]

Writes pipelines/out/rows/<timeline>/: rulers.csv (one row per reign, with flags), rulers-events.json (the events and
their sources, for the build or a generator to apply) and report.md.
Reign marker (Kevin, 2026-11-22): the category sub-kind `reign` (REIGN_CATEGORY), no schema change; the app sorts reigns
to the top of a row's events. Every placed reign also has reign=yes in rulers.csv and its id in rulers-events.json's
`reignIds`. --preview also writes a compiled-ready source copy
of the timeline with the events added (id <timeline>-rulers-pilot) for a local preview; it is never committed.
"""
import csv
import json
import math
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
import dates  # noqa: E402
import wp_dump  # noqa: E402
from build_index import INFOBOX, braces_end  # noqa: E402
from wd_join import wd_time  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
ACC = '2026-11-21'  # access date of the dump's text, as in common/wp_claims.py
WP = 'https://en.wikipedia.org/wiki/'
REIGN_CATEGORY = 'reign'  # the reign marker: a sub-kind in pipelines/common/event_categories.py VOCAB (Kevin, 2026-11-22)
PER_YEARS = 25  # one visible ruler per 25 years of the row's span (Kevin)
REIGN = re.compile(r'^(reign|term_start|term_end)(\d*)$')
LEADER = re.compile(r'^leader\d*$')
RULER_WORD = re.compile(r'\b(king|queen|emperor|empress|tsar|tsaritsa|sultan|shah|caliph|monarch|president|grand prince|'
                        r'grand duke|head of state)', re.I)
# offices that name a president but don't head the state ("President of the Senate of Spain")
NOT_HEAD = re.compile(r'\b(administration|chief of staff|deputy|vice|prime|premier|senate|congress|cortes|council|government|court|assembly|parliament|chamber|minister|duma|'
                      r'soviet of|bank|academy|committee|party|olympic|federation|society|university)', re.I)
MAINT_BOX = re.compile(r'\s*(too large|needed|requested)\b', re.I)  # {{Infobox too large}} and the like
LINK = re.compile(r'\[\[([^|\]#]+)')
JULIAN = 'Q1985786'


def to_gregorian(t):
    """A Julian (y, m, d) to the Gregorian date of the same day. Year or month precision is unchanged."""
    if not t or t[2] is None:
        return t
    y, m, d = t
    a = (14 - m) // 12
    yy, mm = y + 4800 - a, m + 12 * a - 3
    jdn = d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - 32083
    a = jdn + 32044
    b = (4 * a + 3) // 146097
    c = a - 146097 * b // 4
    dd = (4 * c + 3) // 1461
    e = c - 1461 * dd // 4
    mo = (5 * e + 2) // 153
    return (100 * b + dd - 4800 + mo // 10, mo + 3 - 12 * (mo // 10), e - (153 * mo + 2) // 5 + 1)


def to_julian(t):
    """A proleptic-Gregorian (y, m, d) to the Julian date of the same day. Year or month precision is unchanged."""
    if not t or t[2] is None:
        return t
    y, m, d = t
    a = (14 - m) // 12
    yy, mm = y + 4800 - a, m + 12 * a - 3
    jdn = d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045
    c = jdn + 32082
    dd = (4 * c + 3) // 1461
    e = c - 1461 * dd // 4
    mo = (5 * e + 2) // 153
    return (dd - 4800 + mo // 10, mo + 3 - 12 * (mo // 10), e - (153 * mo + 2) // 5 + 1)


def flag(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def title_of(url):
    return url.rsplit('/wiki/', 1)[-1].replace('_', ' ') if url and '/wiki/' in url else None


# ---- Wikipedia side ----

def infobox_params(text):
    """{field: raw} of the first infobox's top-level parameters (lowercased names). Maintenance tags named like an
    infobox ({{Infobox too large}} on Kangxi Emperor) are skipped."""
    import mwparserfromhell
    m = next((m for m in INFOBOX.finditer(text or '') if not MAINT_BOX.match(m.group(1))), None)
    if not m:
        return {}
    try:
        tpl = mwparserfromhell.parse(text[m.start():braces_end(text, m.start())]).filter_templates(recursive=False)
    except Exception:  # malformed wikitext
        return {}
    return {str(p.name).strip().lower(): str(p.value).strip() for p in tpl[0].params} if tpl else {}


def wp_reigns(params):
    """[(field, span, succession text)] from reign/reignN, or term_startN + term_endN, of one infobox."""
    out = []
    for k, raw in params.items():
        m = REIGN.match(k)
        if not m or not raw:
            continue
        kind, n = m.groups()
        if kind == 'reign':
            for s in dates.spans(raw):
                out.append((k, s, dates.clean(params.get(f'succession{n}', ''))))
        elif kind == 'term_start':
            st = dates.spans(raw)
            en = dates.spans(params.get(f'term_end{n}', '')) if params.get(f'term_end{n}') else []
            if st:
                s = dict(st[0])
                s['end'] = en[0]['start'] if en else None
                s['text'] = f"{st[0]['text']} – {en[0]['text'] if en else ''}".strip(' –')
                s['old_style'] = st[0]['old_style'] or bool(en and en[0]['old_style'])
                out.append((f'term_start{n}', s, dates.clean(params.get(f'office{n}', ''))))
    return out


# ---- Wikidata side ----

class Sources:
    def __init__(self, data):
        self.wd = sqlite3.connect(f'file:{os.path.join(data, "wikidata", "wikidata-20261116.sqlite")}?mode=ro', uri=True)
        self.wp = sqlite3.connect(f'file:{os.path.join(data, "wikipedia", "extract-enwiki-20261101.sqlite")}?mode=ro', uri=True)

    def qid(self, title):
        r = self.wd.execute('SELECT qid FROM wd_item WHERE enwiki=?', (title,)).fetchone()
        return r[0] if r else None

    def title(self, qid):
        r = self.wd.execute('SELECT enwiki FROM wd_item WHERE qid=?', (qid,)).fetchone()
        return r[0] if r else None

    def inlinks(self, title):
        r = self.wp.execute('SELECT n FROM inlink WHERE title=?', (title,)).fetchone()
        return r[0] if r else 0

    def terms(self, sid):
        # Julian-model values are mixed in the dump: some are the Julian date as written (Henry II of France, 1547-03-31;
        # Catherine the Great, 1762-06-28 where Wikipedia gives 9 July New Style), others its Gregorian twin under the
        # Julian label (Francis II, 1559-07-20 for 10 July). Keep the other readings beside the value.
        q = {qp: (wd_time(t, p), (to_julian(wd_time(t, p)), to_gregorian(wd_time(t, p))) if cal == JULIAN else None)
             for qp, t, p, cal in self.wd.execute('SELECT qprop, time, precision, calendar FROM wd_qual WHERE sid=?', (sid,))
             if p and p >= 9} if sid else {}
        return q.get('P580', (None, None))[0], q.get('P582', (None, None))[0], q.get('P580', (None, None))[1], q.get('P582', (None, None))[1]

    def holders(self, offices):
        """{person qid: [terms]} of everyone whose position held (P39) names one of the offices."""
        out = {}
        if offices:
            oh = ','.join('?' * len(offices))
            for person, sid, office in self.wd.execute(
                    f"SELECT qid, sid, target FROM wd_link WHERE prop='P39' AND rank != 'deprecated' AND target IN ({oh})", list(offices)):
                out.setdefault(person, []).append(self.terms(sid) + (f'P39 {office}',))
        return out

    def offices_of(self, people, words):
        """Head-of-state offices the people held, by title: a ruler's word and one of the row's words ("Tsar of all
        Russia"). One hop, for polities whose items lack P1906 (Tsardom of Russia)."""
        ph = ','.join('?' * len(people))
        out = set()
        for (o,) in self.wd.execute(f"SELECT DISTINCT target FROM wd_link WHERE prop='P39' AND qid IN ({ph})", list(people)):
            t = (self.title(o) or '').lower()
            if RULER_WORD.search(t) and not NOT_HEAD.search(t) and any(w in t for w in words):
                out.add(o)
        return out

    def rulers(self, polity_qids, via):
        """{person qid: [(start, end, how)]} from P1906 offices' holders and the polities' own P35. `via` gets
        {person: {polity qids that led to them}}, so a reign can be kept to that polity's phase."""
        out = {}
        ph = ','.join('?' * len(polity_qids))
        office_of = {}
        for polity, office in self.wd.execute(f"SELECT DISTINCT qid, target FROM wd_link WHERE prop='P1906' AND qid IN ({ph})", polity_qids):
            office_of.setdefault(office, set()).add(polity)
        p35 = list(self.wd.execute(f"SELECT qid, target, sid FROM wd_link WHERE prop='P35' AND rank != 'deprecated' AND qid IN ({ph})", polity_qids))
        for polity, target, sid in p35:  # a P35 that names the office, not a person (Republic of Venice: Doge of Venice)
            if self.wd.execute("SELECT 1 FROM wd_link WHERE prop='P39' AND target=? LIMIT 1", (target,)).fetchone():
                office_of.setdefault(target, set()).add(polity)
        if office_of:
            oh = ','.join('?' * len(office_of))
            for person, sid, office in self.wd.execute(
                    f"SELECT qid, sid, target FROM wd_link WHERE prop='P39' AND rank != 'deprecated' AND target IN ({oh})", list(office_of)):
                out.setdefault(person, []).append(self.terms(sid) + (f'P39 {office}',))
                via.setdefault(person, set()).update(office_of[office])
        for polity, person, sid in p35:
            if person not in office_of:
                out.setdefault(person, []).append(self.terms(sid) + (f'P35 of {polity}',))
                via.setdefault(person, set()).add(polity)
        return out


# ---- matching and scoring ----

def year(t):
    return t[0] if t else None


def overlap(a0, a1, b0, b1):
    """Years two spans share (an open end runs to b1 or a1); negative when apart."""
    a1 = a1 if a1 is not None else a0
    b1 = b1 if b1 is not None else b0
    return min(a1, b1) - max(a0, b0)


def same(a, b):
    """Two (y, m, d) agree at the coarser precision of the two."""
    if a is None or b is None:
        return a is b
    n = min(sum(x is not None for x in a), sum(x is not None for x in b))
    return a[:n] == b[:n]


def merge_terms(terms):
    """A person's back-to-back terms as one (Louis XIII: 1610–1617 under regency, 1617–1643 in Wikidata)."""
    out = []
    for t in sorted((t for t in terms if t[0]), key=lambda t: tuple(x or 0 for x in t[0])):
        if out and out[-1][1] and same(out[-1][1], t[0]):
            out[-1] = (out[-1][0], t[1], out[-1][2], t[3], out[-1][4])
        else:
            out.append(t)
    return out + [t for t in terms if not t[0]]


def agrees(st, en, term, terms):
    """The Wikipedia span agrees with the chosen Wikidata term, reading a Julian-model value either way."""
    full = next(t for t in terms if t[0] == term[0] and t[1] == term[1])
    ok_s = same(st, full[0]) or any(same(st, x) for x in full[2] or ())
    ok_e = same(en, full[1]) or any(same(en, x) for x in full[3] or ())
    return ok_s and ok_e


def days(t):
    return t[0] * 372 + (t[1] or 1) * 31 + (t[2] or 1) if t else None


def picks(spans, terms, words):
    """Every Wikipedia span for this row: the closest to each Wikidata term, plus the person's other spans for the same
    office (Philip V of Spain's two reigns, 1700–1724 and 1724–1746)."""
    out = []
    for t in [t for t in terms if t[0]] or [None]:
        g = pick(spans, [t] if t else [], words)
        if g and all(g[1] is not o[1] for o in out):
            out.append(g)
    offices = {norm(o[2]) for o in out if o[2]}
    for f, s, succ in spans:
        if succ and norm(succ) in offices and all(s is not o[1] for o in out):
            out.append((f, s, succ, None))
    return out


def norm(succ):
    return re.sub(r'\W+', ' ', succ.lower()).strip()


def pick(spans, terms, words):
    """The Wikipedia span for this row: the one overlapping a Wikidata term most, else one whose succession names the
    row, else the only one. (field, span, succession, term) or None."""
    best = None
    for f, s, succ in spans:
        for t0, t1, *_ in terms:
            if t0 and overlap(s['start'][0], year(s['end']), t0[0], year(t1)) >= 0:
                # closest match, not widest overlap (Alain Poher: a 24-year Senate term beside a 2-month acting presidency)
                score = -abs(days(s['start']) - days(t0)) - (abs(days(s['end']) - days(t1)) if s['end'] and t1 else 0)
                if not best or score > best[0]:
                    best = (score, (f, s, succ, (t0, t1)))
    if best:
        return best[1]
    named = [x for x in spans if any(w in x[2].lower() for w in words)]
    if len(named) == 1 or (len(spans) == 1):
        f, s, succ = (named or spans)[0]
        return f, s, succ, None
    return None


def date_fields(prefix, t):
    d = {prefix: t[0]}
    if t[1]:
        d[prefix + 'Month'] = t[1]
    if t[2]:
        d[prefix + 'Day'] = t[2]
    return d


def fmt(t):
    months = 'January February March April May June July August September October November December'.split()
    if not t:
        return ''
    y = f'{-t[0]} BCE' if t[0] < 0 else str(t[0])
    return ' '.join(x for x in (str(t[2]) if t[2] else '', months[t[1] - 1] if t[1] else '', y) if x)


# ---- the pass ----

def run(timeline, row_ids, src):
    ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json')))
    w0, w1 = ds['meta']['range']['start'], ds['meta']['range']['end']
    tracks = {t['id']: t for t in ds['tracks']}
    existing = {e['title'].lower(): e['uuid'] for e in ds['events']}
    rows, events, sources = [], {}, {}
    gathered = []  # (rid, r0, r1, found): ranked after every row is gathered, so a reign two rows share is placed once
    for rid in row_ids:
        tr = tracks[rid]
        titles = [title_of(tr.get('url'))]
        phase_win = {}  # title -> the phase spans it dates; the row's own article -> None (the whole row)
        for p in tr.get('phases', []):
            for d in p.get('startDates', []) + p.get('endDates', []):
                t = title_of(ds['sources'].get(d['source']['sourceKey'], {}).get('url'))
                titles.append(t)
                phase_win.setdefault(t, []).append((p['start'], p.get('end', w1)))
        phase_win[titles[0]] = None
        titles = [t for t in dict.fromkeys(titles) if t]
        polities = [q for q in (src.qid(t) for t in titles) if q]
        polity_win = {src.qid(t): w for t, w in phase_win.items() if t and src.qid(t)}
        # phases, else the lifespan: one stretch or a list of stretches (Mughal Empire: the 1540–1555 interregnum)
        stretches = tr.get('phases') or (tr['span'] if isinstance(tr.get('span'), list) else [tr['span']])
        spans = [(p['start'], p.get('end', w1)) for p in stretches]
        r0, r1 = max(w0, min(s for s, _ in spans)), min(w1, max(e for _, e in spans))
        words = {w.lower() for w in [tr['name']] + [p['name'] for p in tr.get('phases', [])] for w in re.findall(r'[A-Z][a-z]{3,}', w)}
        found = []
        via = {}
        ruled = src.rulers(polities, via)
        for t in titles:  # Wikipedia's route: the state infoboxes' leader1, leader2… (Bourbon Restoration, July Monarchy)
            pg = wp_dump.page(t)
            for k, raw in infobox_params(pg['text'] if pg else '').items():
                if LEADER.match(k):
                    for target in LINK.findall(raw):
                        q = src.qid(target.strip())
                        if q:
                            ruled.setdefault(q, [])
                            via.setdefault(q, set()).add(src.qid(t))
        # one hop by the row's words ("Tsar of all Russia"); such an office belongs to a phase whose name is in its
        # title ("President of the Republic of China" -> the Republic of China phase, 1912-1949), else to the whole row
        for o in src.offices_of(list(ruled), words):
            ot = (src.title(o) or '').lower()
            polity_win[('office', o)] = [(p['start'], p.get('end', w1)) for p in tr.get('phases', []) if p['name'].lower() in ot] or None
        for person, terms in src.holders([k[1] for k in polity_win if isinstance(k, tuple)]).items():
            ruled.setdefault(person, []).extend(t for t in terms if t not in ruled[person])
            via.setdefault(person, set()).update(('office', t[-1].split(' ', 1)[1]) for t in terms)
        for person, terms in ruled.items():
            terms = merge_terms(list(dict.fromkeys(terms)))
            name = src.title(person)
            if not name:
                continue
            page = wp_dump.page(name)
            flags = []
            if not page:
                continue
            if wp_dump.ai_flagged(page['text']):
                flags.append('AI-flagged article: not usable')
            # a span whose own office text is a non-head office (Franco as head of government) isn't a reign
            got = picks([x for x in wp_reigns(infobox_params(page['text'])) if not NOT_HEAD.search(x[2])], terms, words)
            dated = [t for t in terms if t[0]]
            if not got:
                if dated and any(overlap(t[0][0], year(t[1]), r0, r1) >= 0 for t in dated):
                    t0, t1 = dated[0][:2]
                    rows.append(dict(row=rid, person=name, qid=person, start=fmt(t0), end=fmt(t1), field='', quote='',
                                     wd=f'{fmt(t0)} – {fmt(t1)}', importance='', flags='no Wikipedia reign: not placed'))
                continue
            # a ruler reached only through a phase's polity is kept to that phase (Taiwan's presidents hold the office
            # of the Republic of China, which is a 1912–1949 phase of the China row)
            wins = None
            if via.get(person) and all(polity_win.get(q) for q in via[person]):
                wins = [w for q in via[person] for w in polity_win[q]]
            for field, s, succ, term in got:
                place(rid, name, person, field, s, succ, term, terms, list(flags), r0, r1, wins, w1, src, rows, found)
        gathered.append((rid, r0, r1, found))
    # a reign found on two rows stays only where it falls inside the phase that led to it (Taiwan's presidents: the
    # Taiwan row's Republic of China phase, not the China row's 1912-1949 one); a reign outside its phase with no
    # other row claiming it stays (Philip II reaches Spain through the Crown of Castile, whose office outlived the phase)
    homes = {}
    for _, _, _, found in gathered:
        for r in found:
            homes.setdefault((r['qid'], r['st']), []).append(r)
    for same in homes.values():
        if any(r['in_phase'] for r in same) and not all(r['in_phase'] for r in same):
            for r in same:
                r['drop'] = not r['in_phase']
    for rid, r0, r1, found in gathered:
        for r in found:
            if r.get('drop'):
                others = sorted({x['row'] for x in homes[(r['qid'], r['st'])] if x['in_phase']})
                rows.append(dict(row=rid, person=r['person'], qid=r['qid'], start=fmt(r['st']), end=fmt(r['en']), field=r['field'],
                                 quote=r['quote'], wd=r['wd'], importance='', flags=f"outside its phase here; placed on {', '.join(others)}"))
        found[:] = [r for r in found if not r.get('drop')]
        finish(rid, r0, r1, found, rows, events, sources, tracks, existing, w1)
    return ds, rows, list(events.values()), sources, (w0, w1)


def place(rid, name, person, field, s, succ, term, terms, flags, r0, r1, wins, w1, src, rows, found):
    """One reign span: flags, or a candidate for the row. `wins`: the phase spans that led to this ruler (None: the
    whole row)."""
    st, en = s['start'], s['end']
    if overlap(st[0], year(en), r0, r1) < 0:
        return  # outside the row's span in this timeline's window
    in_phase = wins is None or any(overlap(st[0], year(en), a, b) >= 0 for a, b in wins)
    if term and not agrees(st, en, term, terms):
        flags.append(f'Wikidata differs: {fmt(term[0])} – {fmt(term[1])}')
    if not term:
        flags.append('no Wikidata term to check')
    if s['old_style']:
        flags.append('Old Style date as written')
    if flags and flags[0].startswith('AI'):
        rows.append(dict(row=rid, person=name, qid=person, start=fmt(st), end=fmt(en), field=field, quote=s['text'],
                         wd='', importance='', flags='; '.join(flags)))
        return
    yrs = max(1, (year(en) or w1) - st[0])
    found.append(dict(row=rid, person=name, qid=person, st=st, en=en, field=field, quote=s['text'], succ=succ,
                      office=field.startswith('term'), score=yrs * math.log10(src.inlinks(name) + 10), flags=flags, in_phase=in_phase,
                      wd=f'{fmt(term[0])} – {fmt(term[1])}' if term else ''))


def finish(rid, r0, r1, found, rows, events, sources, tracks, existing, w1):
    """Rank the row's reigns (top ~1 per 25 years visible) and turn them into events."""
    # the same reign reached by two routes, or one person's overlapping spans (Franco: two head-of-state fields):
    # keep the one that matched a Wikidata term, else the longer
    found.sort(key=lambda r: (not r['wd'], -((year(r['en']) or w1) - r['st'][0])))
    kept = []
    for r in found:
        if not any(k['person'] == r['person'] and overlap(k['st'][0], year(k['en']) or w1, r['st'][0], year(r['en']) or w1) > 0
                   for k in kept):
            kept.append(r)
    found[:] = kept
    found.sort(key=lambda r: tuple(x or 0 for x in r['st']))
    visible = math.ceil(max(1, r1 - r0) / PER_YEARS)
    top = {id(r) for r in sorted(found, key=lambda r: -r['score'])[:visible]}
    for r in found:
        imp = 2 if id(r) in top else 3
        noun = 'Presidency' if r['office'] else 'Reign'
        title = f"{noun} of {r['person']}"
        uid = 'reign-' + slug(r['person'])
        n = 2
        while uid in events and events[uid]['tracks'] != [rid]:
            uid, n = f"reign-{slug(r['person'])}-{n}", n + 1
        if uid in events:  # the same person twice on this row (two reigns): number the later one
            uid = f"{uid}-{r['st'][0]}"
        key = 'wp-' + slug(r['person'])
        sources[key] = {'name': f"{r['person']} (Wikipedia)", 'url': WP + r['person'].replace(' ', '_'), 'accessed': ACC,
                        'tags': ['wikipedia']}
        loc = f"infobox {r['field']}: {r['quote']}"
        yrs = (year(r['en']) or w1) - r['st'][0]
        descr = (f"{'Holds office' if r['office'] else 'Rules'} as head of state of {tracks[rid]['name']}"
                 f" from {fmt(r['st'])}{' to ' + fmt(r['en']) if r['en'] else ''}"
                 f"{f' ({yrs} years)' if yrs >= 2 else ''}.")
        ev = {'uuid': uid, 'title': title, **date_fields('start', r['st']), **(date_fields('end', r['en']) if r['en'] else {}),
              'tracks': [rid], 'descr': descr, 'sources': [{'sourceKey': key, 'sourceLocation': loc}], 'importance': imp,
              'memberships': [{'facet': 'category', 'value': REIGN_CATEGORY, 'sources': [{'sourceKey': key, 'sourceLocation': loc}]}]}
        if r['en'] is None:
            ev.pop('end', None)
        events[uid] = ev
        if title.lower() in existing:
            r['flags'].append(f"timeline already has {existing[title.lower()]}")
        rows.append(dict(row=rid, person=r['person'], qid=r['qid'], start=fmt(r['st']), end=fmt(r['en']), field=r['field'],
                         quote=r['quote'], wd=r['wd'], importance=imp, flags='; '.join(r['flags']), uuid=uid, reign='yes'))


def main():
    timeline = flag('--timeline', 'modern-states')
    row_ids = flag('--rows', '').split(',')
    if row_ids == ['all']:  # every polity row: a row with its own article (groups have none)
        row_ids = [t['id'] for t in json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json')))['tracks'] if t.get('url')]
    out = flag('--out') or os.path.join(ROOT, 'pipelines', 'out', 'rows', timeline)
    os.makedirs(out, exist_ok=True)
    ds, rows, events, sources, win = run(timeline, row_ids, Sources(settings.DATA))
    cols = ['row', 'person', 'qid', 'start', 'end', 'importance', 'reign', 'field', 'quote', 'wd', 'flags', 'uuid']
    with open(os.path.join(out, 'rulers.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, cols, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    json.dump({'reignIds': [e['uuid'] for e in events], 'events': events, 'sources': sources}, open(os.path.join(out, 'rulers-events.json'), 'w'), indent=1, ensure_ascii=False)
    md = [f'# Rulers pass: {timeline} ({", ".join(row_ids)})', '',
          f'Window {win[0]}–{win[1]}; one visible ruler (importance 2) per {PER_YEARS} years of each row; the rest importance 3.', '',
          '| Row | Placed | Visible | Wikidata differs | No Wikidata term | Not placed (no Wikipedia reign) | Already on the timeline |',
          '|---|---|---|---|---|---|---|']
    for rid in row_ids:
        rr = [r for r in rows if r['row'] == rid]
        placed = [r for r in rr if r.get('uuid')]
        md.append(f"| {rid} | {len(placed)} | {sum(r['importance'] == 2 for r in placed)} | "
                  f"{sum('Wikidata differs' in r['flags'] for r in placed)} | {sum('no Wikidata term' in r['flags'] for r in placed)} | "
                  f"{sum('not placed' in r['flags'] for r in rr)} | {sum('already has' in r['flags'] for r in placed)} |")
    md += ['', '## Review flags', ''] + [f"- {r['row']} · {r['person']} ({r['start']} – {r['end']}): {r['flags']}" for r in rows if r['flags']]
    open(os.path.join(out, 'report.md'), 'w').write('\n'.join(md) + '\n')
    if '--preview' in ARGS:
        pv = dict(ds)
        pv['meta'] = dict(ds['meta'], id=f'{timeline}-rulers-pilot', title=f"{ds['meta']['title']} (rulers pilot)")
        pv['sources'] = {**ds['sources'], **{k: v for k, v in sources.items() if k not in ds['sources']}}
        ids = {e['uuid'] for e in ds['events']}
        pv['events'] = ds['events'] + [e for e in events if e['uuid'] not in ids]
        json.dump(pv, open(os.path.join(out, f'{timeline}-rulers-pilot.src.json'), 'w'), ensure_ascii=False)
    print(f"{len(events)} reign events on {len(row_ids)} rows, {sum(1 for r in rows if r['flags'])} flagged -> {out}")


if __name__ == '__main__':
    main()
