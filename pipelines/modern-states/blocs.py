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

Split states: East and West Germany are overlapping phases of one row (`germany`), so that row is in NATO and the
Warsaw Pact at once from 1955 to 1990. The claims say so in a note until schema v5 adds `phase` on memberOf.
"""
import json
import os
from collections import OrderedDict

import settings  # noqa: E402

# Education's claims file, outside the repo until its data PR decides where it lives: TIMELINES_CONNECTIONS_CLAIMS,
# else its research folder under the data folder (settings.py)
CLAIMS = os.environ.get('TIMELINES_CONNECTIONS_CLAIMS',
                        os.path.join(settings.DATA, 'timelines-analysis', '2026-11-22-connections', 'connections-claims.json'))
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
SPLIT_NOTE = {
    ('nato', 'germany'): 'West Germany joined in 1955; reunified Germany kept the membership in 1990. East and West Germany are '
                         'phases of one row here, so this row also shows East Germany in the Warsaw Pact and Comecon.',
    ('warsaw-pact', 'germany'): 'East Germany was the member. East and West Germany are phases of one row here, so this row also '
                                'shows West Germany in NATO from 1955.',
    ('comecon', 'germany'): 'East Germany was the member. East and West Germany are phases of one row here, so this row also '
                            'shows West Germany in NATO from 1955.',
}


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
            note = SPLIT_NOTE.get((rid, m['row']))
            if not note and m.get('note') and 'no accession cell' not in m['note']:
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
            out.setdefault(m['row'], []).append(ms)
    return out
