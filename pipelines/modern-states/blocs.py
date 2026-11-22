"""
Cold War blocs (2026-11-22, Education session; Kevin's decisions 1a–3a, step 5 1a–3a): alliances and economic blocs
as union rows in a top-level "Connections" group, with dated `memberOf` on the member rows (docs/data-format.md:
"a realm in an alliance"). Built on the current schema; no new fields.

Dates come from the Connections claims (connections-claims.json, see CLAIMS below),
built from the same enwiki-20261101 dump by build_claims.py, which checks every quote verbatim against the page and
maps every member to a row. Re-run build_claims.py first when the dump changes.

Rows: NATO, the Warsaw Pact (pilot, approved 2026-11-22), Comecon, SEATO, CENTO, the Non-Aligned Movement (127).
Events: each bloc's founding (on the bloc and its founders) and dissolution (on the bloc and the members still in it);
each admission round its sources date (NATO's member table, Comecon's member table, CENTO's timeline, the NAM's
member lists) as one event on the bloc and the joining rows, named as those memberships' startEvent.

Split states (backlog 1, 2026-11-22, Dev C): a membership held while its row has rival phases names the phase that
held it (`memberOf.phase`, schema v5): West Germany in NATO, East Germany in the Warsaw Pact and Comecon, North and
South Yemen in the Non-Aligned Movement. A membership whose holder changed while it ran is split where the new holder's
phase begins, dated by that phase's own start claim and event (HANDOVER). link_phases does this after every row is built,
since the phases live in other modules.
"""
import json
import os
from collections import OrderedDict


# The claims file next to this module (connections/build_claims.py writes it); TIMELINES_CONNECTIONS_CLAIMS overrides it
CLAIMS = os.environ.get('TIMELINES_CONNECTIONS_CLAIMS',
                        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'connections', 'connections-claims.json'))
BLOCS = ('nato', 'warsaw-pact', 'comecon', 'seato', 'cento', 'non-aligned-movement')
GROUPS = [{'id': 'connections', 'name': 'Connections', 'color': '#6a6a7a'}]

ROWS = {  # id: (name, short name for event titles, colour, article for the row's url)
    'nato': ('NATO', 'NATO', '#2f5f9e', 'NATO'),
    'warsaw-pact': ('Warsaw Pact', 'the Warsaw Pact', '#9e3a3a', 'Warsaw Pact'),
    'comecon': ('Comecon', 'Comecon', '#b0603a', 'Comecon'),
    'seato': ('SEATO', 'SEATO', '#3a7a9e', 'Southeast Asia Treaty Organization'),
    'cento': ('CENTO (Baghdad Pact)', 'the Baghdad Pact', '#8a7a2f', 'Central Treaty Organization'),
    'non-aligned-movement': ('Non-Aligned Movement', 'the Non-Aligned Movement', '#3a8a5a', 'Non-Aligned Movement'),
}
# Founders, where the source names fewer founders than the members dated in the founding year.
FOUNDERS = {
    'comecon': {'Soviet Union', "People's Republic of Bulgaria", 'Czechoslovak Socialist Republic', "Hungarian People's Republic",
                "Polish People's Republic", 'Socialist Republic of Romania'},
    'cento': {'Turkey', 'Kingdom of Iraq'},
}
FOUNDING = {  # id: (event id, title, description)
    'nato': ('nato-founded', 'North Atlantic Treaty signed',
             'Twelve states in Western Europe and North America found NATO, a defensive alliance.'),
    'warsaw-pact': ('warsaw-pact-founded', 'Warsaw Pact founded',
                    'The Soviet Union and seven Eastern European states form an alliance, in response to West Germany joining NATO.'),
    'comecon': ('comecon-founded', 'Comecon founded',
                'The Soviet Union and five Eastern European states set up a council to plan trade between their economies.'),
    'seato': ('seato-founded', 'SEATO founded',
              'Eight states sign the Manila Pact, an alliance against communist expansion in Southeast Asia.'),
    'cento': ('cento-founded', 'Baghdad Pact signed',
              'Iraq and Turkey sign a defence pact; Britain, Pakistan and Iran join later that year. Renamed CENTO in 1959.'),
    'non-aligned-movement': ('nam-founded', 'Non-Aligned Movement founded',
                             'Twenty-five states meet in Belgrade and found a movement of countries in neither Cold War bloc.'),
}
DISSOLVED = {
    'warsaw-pact': ('warsaw-pact-dissolved', 'Warsaw Pact dissolved', 'The six remaining members declare the alliance at an end.'),
    'comecon': ('comecon-dissolved', 'Comecon dissolved', 'The last council session agrees to wind up the organisation.'),
    'seato': ('seato-dissolved', 'SEATO dissolved', 'The alliance is wound up after the end of the Vietnam War.'),
    'cento': ('cento-dissolved', 'CENTO dissolved', 'The alliance ends after Iran and Pakistan leave it in 1979.'),
}
# Memberships kept in the claims but left off the rows, with the reason (reported to Kevin).
SKIP = {('non-aligned-movement', 'Palestine'): 'member from 1976, when the palestine row has no lifespan (1959–1988 gap); '
                                              'a seat held before the State of Palestine (1988), like SWAPO\'s'}
# East Germany left the Warsaw Pact and Comecon by reunification: that event ends both memberships.
SHARED = {'reunification': ['warsaw-pact', 'comecon']}
# Memberships whose holder changed while they ran: (bloc, row, first year) -> the phase that took the seat over. The
# split falls where that phase starts, dated by its own start claim and started by its startEvent. Keyed by the
# membership's first year: if a new dump moves that year, the run fails with "add a HANDOVER"; update the key here.
HANDOVER = {
    ('nato', 'germany', 1955): 'Federal Republic (reunified)',  # West Germany's seat, kept by reunified Germany
    ('non-aligned-movement', 'yemen', 1961): 'Yemen Arab Republic (North)',  # North Yemen: the 1962 revolution
}
# Split states: rows whose rival phases are separate states, so each bloc membership names the one that held it. Other
# rows' overlapping phases (a junta inside a kingdom, rival governments in a civil war) are listed in the report only.
SPLIT_ROWS = {'germany', 'yemen', 'vietnam'}
# Rows whose claims notes only explained the missing phase (the phase now says it): those notes are dropped.
PHASED_NOTES = {'germany'}


def _claims():
    d = json.load(open(CLAIMS))
    return {e['id']: e for e in d['entities']}


def _loc(s):
    """sourceLocation text for a claims-file source."""
    loc = s['locator']
    if loc['kind'] == 'infobox':
        return f'infobox {loc["field"]}: {loc["value"]}'
    q = loc['quote']
    if s['checkedIn'] == 'parsed':
        return f'{loc["heading"] or "table"}: {q}'
    return f'text: "{q[:160]}"'


def _ref(M, s):
    return M.G.ref(s['page'], _loc(s))


def _claim(M, year, s, note=None):
    c = {'year': year, 'source': _ref(M, s)}
    if note:
        c['note'] = note
    return [c]


def _founder(rid, e, m):
    if rid in FOUNDERS:
        return m['member'] in FOUNDERS[rid]
    return m['from'] == e['span'][0]['year']


def _rounds(rid, e):
    """Admission rounds after the founding: {year: [memberships]} in year order."""
    out = OrderedDict()
    for m in sorted(e['memberships'], key=lambda m: m['from']):
        if (rid, m['member']) in SKIP:
            continue
        if not _founder(rid, e, m):
            out.setdefault(m['from'], []).append(m)
    return out


def _round_id(rid, year):
    return f'{rid}-admits-{year}'


# Common names for event titles, where the source gives a state's full official name.
SHORT = {"People's Socialist Republic of Albania": 'Albania', "Mongolian People's Republic": 'Mongolia',
         'Republic of Cuba': 'Cuba', 'Socialist Republic of Vietnam': 'Vietnam', 'Kingdom of Iraq': 'Iraq'}


def _names(ms):
    n = [('West Germany' if m['row'] == 'germany' and m['from'] < 1990 and m['member'] == 'Germany' else SHORT.get(m['member'], m['member']))
         for m in ms]
    return n[0] if len(n) == 1 else ', '.join(n[:-1]) + ' and ' + n[-1]


def tracks(M):
    E = _claims()
    out = []
    for rid in BLOCS:
        e = E[rid]
        name, _, colour, title = ROWS[rid]
        start = next(s for s in e['span'] if s['what'] == 'start')
        end = next((s for s in e['span'] if s['what'] == 'end'), None)
        ongoing = next((s for s in e['span'] if s['what'] == 'ongoing'), None)
        sc = _claim(M, start['year'], start['source'])
        if end:
            st = M.stretch(None, sc, _claim(M, end['year'], end['source']), startEvent=FOUNDING[rid][0], endEvent=DISSOLVED[rid][0])
        else:
            st = M.stretch(None, sc, ongoing=_ref(M, ongoing['source']), startEvent=FOUNDING[rid][0])
        out.append(M.row(rid, name, colour, 'connections', title, span_=M.span(st)))
    return out


def events(M):
    E = _claims()
    out = []
    for rid in BLOCS:
        e = E[rid]
        start = next(s for s in e['span'] if s['what'] == 'start')
        uuid, title, descr = FOUNDING[rid]
        founders = [m['row'] for m in e['memberships'] if _founder(rid, e, m)]
        out.append(M.ev(uuid, title, start['year'], [rid] + founders, _ref(M, start['source']), importance=1, descr=descr))
        short = ROWS[rid][1]
        for year, ms in _rounds(rid, e).items():
            refs = []
            for m in ms:
                r = _ref(M, m['fromSource'])
                if r not in refs:
                    refs.append(r)
            t = f'{_names(ms)} join{"s" if len(ms) == 1 else ""} {short}' if len(ms) <= 3 else f'{len(ms)} states join {short}'
            d = '' if len(ms) <= 3 else f'{_names(ms)}.'
            out.append(M.ev(_round_id(rid, year), t[0].upper() + t[1:], year, [rid] + [m['row'] for m in ms], refs, descr=d))
        if rid in DISSOLVED:
            end = next(s for s in e['span'] if s['what'] == 'end')
            uuid, title, descr = DISSOLVED[rid]
            stayed = [m['row'] for m in e['memberships'] if m['to'] == end['year']]
            out.append(M.ev(uuid, title, end['year'], [rid] + stayed, _ref(M, end['source']), importance=1, descr=descr))
    return out


def extra_memberships(M):
    E = _claims()
    out = {}
    for rid in BLOCS:
        e = E[rid]
        end_year = next((s['year'] for s in e['span'] if s['what'] == 'end'), None)
        for m in e['memberships']:
            if (rid, m['member']) in SKIP:
                continue
            note = None
            if m['row'] not in PHASED_NOTES and m.get('note') and 'no accession cell' not in m['note']:
                note = m['note']
            sc = _claim(M, m['from'], m['fromSource'], note)
            kw = {'startEvent': FOUNDING[rid][0] if _founder(rid, e, m) else _round_id(rid, m['from'])}
            if m['to'] is None:
                ms = M.member(rid, sc, ongoing=True, sources=[_ref(M, m['fromSource'])], **kw)
            else:
                ec = _claim(M, m['to'], m['toSource']) if m.get('toSource') else [{'year': m['to'], 'source': _ref(M, m['fromSource'])}]
                if end_year is not None and m['to'] == end_year:
                    kw['endEvent'] = DISSOLVED[rid][0]
                elif m['row'] == 'germany' and m['to'] == 1990:
                    kw['endEvent'] = 'reunification'
                ms = M.member(rid, sc, ec, sources=[_ref(M, m['fromSource'])], **kw)
            ms['_bloc'] = (rid, m['phaseAtStart'])  # read and removed by link_phases
            out.setdefault(m['row'], []).append(ms)
    return out


def _end(p, present):
    return present if p.get('ongoing') else p['end']


def _with_phase(ms, name):
    """The membership with `phase` placed after `row`, where the format lists it."""
    return {k: v for k, v in [('row', ms['row']), ('phase', name)] + [(k, v) for k, v in ms.items() if k != 'row']}


def link_phases(M, by_id):
    """Name the holding phase on bloc memberships held while the row had rival phases, splitting at HANDOVER.
    Fails the run if such a membership outlasts its phase without a HANDOVER."""
    for tid, t in by_id.items():
        out = []
        for ms in t.get('memberOf', []):
            if '_bloc' not in ms:
                out.append(ms)
                continue
            rid, first = ms.pop('_bloc')
            if not t.get('phases') or not first:
                out.append(ms)
                continue
            pieces = [(ms, first)]
            dest = HANDOVER.get((rid, tid, ms['start']))
            if dest:
                d = next((p for p in t['phases'] if p['name'] == dest), None)
                if not d:
                    raise SystemExit(f'blocs: HANDOVER {(rid, tid, ms["start"])} names phase "{dest}", which {tid} lacks')
                a = {k: v for k, v in ms.items() if k not in ('ongoing', 'endDates', 'endEvent')}
                a['end'] = d['start']
                a = {k: a[k] for k in ['row', 'start', 'end', 'startDates'] if k in a} | \
                    {'endDates': [dict(c) for c in d['startDates']]} | {k: a[k] for k in a if k not in ('row', 'start', 'end', 'startDates')}
                a['endEvent'] = d['startEvent']
                b = dict(ms, start=d['start'], startDates=[dict(c) for c in d['startDates']], startEvent=d['startEvent'])
                pieces = [(a, first), (b, dest)]
                M.REPORT.append(f'  split {tid} in {rid} at {d["start"]}: {first} {a["start"]}–{a["end"]}, then {dest}')
            for p, name in pieces:
                pend = _end(p, M.PRESENT)
                ph = [x for x in t['phases'] if x['name'] == name and x['start'] <= p['start'] <= _end(x, M.PRESENT)]
                if len(ph) != 1:
                    raise SystemExit(f'blocs: {tid} in {rid} from {p["start"]}: no single phase "{name}" holds its start')
                ph = ph[0]
                # rivals: other phases alongside the holding phase while it held the membership (successors don't count)
                lo, hi = max(p['start'], ph['start']), min(pend, _end(ph, M.PRESENT))
                rivals = [x['name'] for x in t['phases'] if x is not ph and x['start'] < hi and _end(x, M.PRESENT) > lo]
                if rivals and tid not in SPLIT_ROWS:
                    M.REPORT.append(f'    (not a split state) {tid} in {rid} {p["start"]}–{pend} under {name}, beside {", ".join(rivals)}')
                elif rivals:
                    if pend > _end(ph, M.PRESENT):
                        raise SystemExit(f'blocs: {tid} in {rid} {p["start"]}–{pend} outlasts its phase "{name}" beside '
                                         f'{", ".join(rivals)}; add a HANDOVER')
                    if not p.get('ongoing') and 'endEvent' not in p and p['end'] == _end(ph, M.PRESENT) and ph.get('endEvent'):
                        p['endEvent'] = ph['endEvent']
                    p = _with_phase(p, name)
                    M.REPORT.append(f'    {tid} in {rid} {p["start"]}–{pend}: phase {name} (rivals: {", ".join(rivals)})')
                out.append(p)
        if 'memberOf' in t:
            t['memberOf'] = out
