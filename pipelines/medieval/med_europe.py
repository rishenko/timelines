"""
Wave 1 of the Medieval World timeline: Europe (brief "Plan", wave 1). Imported by gen_medieval.py, which passes
itself as `M` (its claim/row helpers, G, and the pilot's rows and events).

How rows are dated: each phase or lifespan names its Wikipedia article and the infobox field for each end (via
M.F / G.field_year, which check the dump). Hand-written claims cite the field text they quote.

Events: every infobox event of a row's own articles (eventN/date_eventN, event_start/event_end with their years,
established_eventN) whose start falls in 650-1500 becomes an event on that row, cited to the field. The same event
named by several articles is merged (same title within a year, or an alias below) and placed on each row. Union rule
(Kevin, 2026-11-21): a union's own events stay on the union row; a member's row gets one only when it starts or ends
that member's membership or phase (done through startEvent/endEvent below), or when it comes from the member's own
article (the member acting as itself).

Regions: each row's geography facet values are chosen by its group, cited to the article's infobox capital (or its
first lead sentence when the infobox names none).

Seams: rows from Ancient and Classical (lombards, visigoths, anglo-saxons, slavs) are copied from its compiled file
unchanged; France's "Kingdom of France" phase is copied from Modern States' row.
"""
import functools
import json
import os
import re
import subprocess

import mwparserfromhell as mw

M = None  # set by build()
G = None
LO, HI = 650, 1500
EVENTS = {}   # uuid -> event
INDEX = {}    # (normalized title) -> [uuid]
ALIAS = {
    'division after the treaty of verdun': 'treaty of verdun',
    'charlemagne crowned emperor of the romans': 'charlemagne crowned emperor',
    'coronation of charlemagne': 'charlemagne crowned emperor',
    'fall of constantinople to the fourth crusade': 'sack of constantinople (fourth crusade)',
    'sack of constantinople': 'sack of constantinople (fourth crusade)',
    'treaty of venice (sovereignty reaffirmed)': 'treaty of venice',
    'castilian conquest': 'conquest of granada',
    'tvrtko i crowned king of bosnia': 'coronation of tvrtko i',
    'norman conquest': 'battle of hastings',
    "charles iv's golden bull": 'golden bull of 1356',  # the Old Swiss Confederacy's infobox label for the same act (one event, on both rows)
    'unification of the angles, saxons and danes': 'unification of the angles, saxons and danes',
    'part of the kalmar union': 'kalmar union formed',
    'kingdom of león established': 'creations of the kingdoms of galicia and león',
    'kingdom of valencia established': 'conquest of the kingdom of valencia',
    'elevated to the status of kingdom': 'elevation to kingdom',
    'coronation of coloman in biograd': 'coloman crowned king of croatia',
    'succession crisis and coronation of king coloman of hungary': 'coloman crowned king of croatia',
    'personal union with croatia': 'coloman crowned king of croatia',
    'raised to kingdom': 'bohemia raised to a kingdom',
    'kingdom of bohemia: kingdom established': 'bohemia raised to a kingdom',
    'death of king andrew iii, the last member of the house of árpád': 'extinction of the árpád dynasty',
    'raised to duchy by sigismund': 'county of savoy raised to duchy',
    'emperor frederick iii acknowledged archducal title': 'archduchy recognized',
    'permanent union of castile & león': 'permanent union of castile and león',
}
GENERIC = {'established', 'establishment', 'disestablished', 'independence', 'kingdom', 'inception', 'united',
           'first established', 'duchy established', 'kingdom established', 'reestablishment', 'conquered', 'formed',
           'state established', 'fall of the empire', 'decline and fall', 'establishment under first dogea as province of the byzantine empire'}
TITLES = {  # (article, field) -> title, where the infobox label alone reads badly
    ('Kingdom of Galicia–Volhynia', 'event2'): 'Galicia–Volhynia becomes a kingdom',
    ('Republic of Venice', 'start'): 'First doge elected; Venice a Byzantine province',
    ('Duchy of Croatia', 'event1'): 'Croatia under Frankish vassalage',
    ('Serbian Despotate', 'established_event2'): 'Ottoman conquest of the Serbian Despotate',
    ('Serbian Despotate', 'established_event4'): 'Ottoman reconquest of the Serbian Despotate',
    ('Despotate of Epirus', 'event1'): 'Byzantine conquest of Epirus',
    ('Kingdom of Bosnia', 'end'): 'Ottoman conquest of Bosnia',
    ('Principality of Serbia (early medieval)', 'end'): 'Byzantine annexation of Serbia',
    ('Kingdom of Asturias', 'end'): 'Asturias annexed by León',
    ('Kalmar Union', 'start'): 'Kalmar Union formed',
    ('Kingdom of Hungary (1301–1526)', 'event1'): 'Hungarian interregnum',
    ('Kingdom of Lithuania', 'x'): '',
    ('Grand Duchy of Lithuania', 'event1'): 'Kingdom of Lithuania (Mindaugas)',
    ('Grand Duchy of Lithuania', 'start'): 'Consolidation of Lithuania begins',
    ('Lordship of Ireland', 'start'): 'Lordship of Ireland established',
    ('Republic of Florence', 'start'): 'Republic of Florence first established',
    ('Kingdom of the Lombards', 'end'): 'Frankish conquest of the Lombard kingdom',
    ('Wallachia', 'start'): 'Wallachian independence',
    ('Kingdom of Scotland', 'start'): 'Scotland united',
    ('Papal States', 'event1'): 'Papal States codified',
    ('Papal States', 'event2'): 'Treaty of Venice',
    ('First Bulgarian Empire', 'event1'): 'Christianisation of Bulgaria',
    ("Kievan Rus'", 'event2'): "Christianization of Kievan Rus'",
    ("Kievan Rus'", 'event4'): "Mongol invasion of Rus'",
    ('Kingdom of Hungary (1000–1301)', 'event5'): 'First Mongol invasion of Hungary',
    ('Kingdom of Hungary (1000–1301)', 'event6'): 'Second Mongol invasion of Hungary',
    ('Kingdom of Hungary (1000–1301)', 'event2'): 'Golden Bull of 1222',
    ('Kingdom of Hungary (1000–1301)', 'event1'): 'Coloman crowned king of Croatia',
    ('Principality of Catalonia', 'event2'): 'Generalitat of Catalonia founded',
    ('Serbian Empire', 'event2'): 'Serbian nobility conflict',
    ('Serbian Despotate', 'established_event1'): 'Serbian Despotate established',
    ('Serbian Despotate', 'established_event3'): 'Serbian Despotate re-established',
    ('Kingdom of Portugal', 'event1'): 'Avis dynasty begins',
    ('Republic of Ragusa', 'event3'): 'Ragusa becomes an Ottoman tributary',
    ('Republic of Ragusa', 'event1'): 'Fourth Crusade: Venetian invasion of Ragusa',
    ('Duchy of Burgundy', 'event1'): 'Burgundian succession crisis',
    ('Duchy of Bohemia', 'event2'): 'Bohemia becomes a state of the Holy Roman Empire',
    ('Icelandic Commonwealth', 'end'): 'Iceland accepts Norwegian kingship',
    ('Kingdom of Sicily', 'event2'): 'Sicily annexed to the Aragonese dominions',
    ('Grand Duchy of Moscow', 'event1'): 'Moscow elevated to grand principality',
    ('Kingdom of Bohemia', 'start'): 'Bohemia raised to a kingdom',
    ('Duchy of Bohemia', 'start'): 'Duchy of Bohemia established',
    ('Croatia in personal union with Hungary', 'start'): 'Coloman crowned king of Croatia',
}
SKIP = {('Duchy of Milan', 1), ('Duchy of Milan', 2), ('Kingdom of Sicily', 3), ('Kingdom of Sicily', 4),
        ('Republic of Genoa', 8), ('Kingdom of Hungary (1301–1526)', 2), ('Kingdom of León', 'end'), ('Kingdom of Castile', 'end')}
SEEN = {}  # (article, field) -> uuid: an article used by several phases gives each event once
KEY = {"christianization-of-kievan-rus", 'christianisation-of-bulgaria', 'mongol-invasion-of-rus', 'treaty-of-verdun', 'battle-of-hastings', 'magna-carta', 'conquest-of-granada', 'battle-of-grunwald',
       'kalmar-union-formed', 'union-of-krewo', 'christianization', 'coronation-of-stephen-i', 'sicilian-vespers',
       'hundred-years-war', 'battle-of-mohacs', 'golden-bull', 'mongol-invasion', 'siege-of-kiev',
       'abd-al-rahman-iii-proclaims-himself-caliph', 'proclamation-of-the-empire', 'baptism-of-poland',
       'treaty-of-zamora', 'capetian-dynasty-established', 'union-of-ferdinand-ii-and-isabella-i'}


def norm(s):
    s = re.sub(r'\s+', ' ', s.replace('/', ' ')).strip().lower()
    return ALIAS.get(s, s)


def slug(s):
    s = s.lower().replace('ł', 'l').replace('ü', 'u').replace('é', 'e').replace('á', 'a').replace('ó', 'o')
    s = re.sub(r"[’']", '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60]


def clean(label):
    import html
    label = html.unescape(label).replace('\xa0', ' ')
    label = re.sub(r'\s*/\s*\d?', ' ', label)
    return re.sub(r'\s+', ' ', label).strip()


def generic(name, label):
    l = label.lower()
    if l in ('established', 'establishment', 'first established', 'duchy established', 'kingdom established', 'state established', 'formed', 'united', 'inception'):
        return f'{name} established'
    if l == 'reestablishment':
        return f'{name} re-established'
    if l in ('decline and fall', 'fall of the empire', 'conquered', 'disestablished'):
        return f'End of {name}' if name.startswith('Great ') else f'End of the {name}'
    return f'{name}: {label}'


def register(e):
    EVENTS[e['uuid']] = e
    INDEX.setdefault(norm(e['title']), []).append(e['uuid'])


def find(title, year):
    for u in INDEX.get(norm(title), []):
        if abs(EVENTS[u]['start'] - year) <= 1:
            return u
    return None


def infobox_event(title, which):
    """(years, label, ref) of an infobox event, or None. which: 1..n, 'start', 'end', 'pre', 'post', or 'established_eventN'."""
    f = G.art(title).get('fields') or {}
    if isinstance(which, str) and which.startswith('established_event'):
        n = which[len('established_event'):]
        d, label = f.get(f'established_date{n}'), f.get(which, {}).get('text', '')
        if not d or not d.get('years'):
            return None
        return d['years'], label, G.ref(title, f'infobox {which}: {label}, {d["text"]}')
    try:
        years, ref = M.E(title, which)
    except SystemExit:
        return None
    ek = f'event_{which}' if which in ('start', 'end', 'pre', 'post') else f'event{which}'
    return years, f.get(ek, {}).get('text', ''), ref


def event(title, which, track, name=None, *, force=False):
    """Make (or find) the event for an infobox event of `title` and put it on `track`. Returns its uuid or None."""
    if (title, which) in SKIP:
        return None
    if (title, which) in SEEN:
        u = SEEN[(title, which)]
        if u and track not in EVENTS[u]['tracks']:
            EVENTS[u]['tracks'].append(track)
        return u
    got = infobox_event(title, which)
    if not got:
        return None
    years, label, ref = got
    label = clean(label)
    if not label:
        return None
    y0 = years[0]
    if not force and not (LO <= y0 <= HI):
        return None
    t = TITLES.get((title, which if isinstance(which, str) else f'event{which}'))
    if t is None:
        t = generic(name or title, label) if label.lower() in GENERIC else label
    if not t:
        return None
    u = find(t, y0)
    if u:
        e = EVENTS[u]
        if track not in e['tracks']:
            e['tracks'].append(track)
        if ref not in e['sources']:
            e['sources'].append(ref)
        SEEN[(title, which)] = u
        return u
    u = slug(t)
    if u in EVENTS:
        u = f'{u}-{y0}'
    yrs = [y0] + ([max(years)] if max(years) > y0 and len(years) <= 2 else [])
    e = M.ev(u, t, yrs, [track], [ref])
    register(e)
    SEEN[(title, which)] = u
    return u


def all_events(title, track, name=None):
    f = G.art(title).get('fields') or {}
    for k in sorted(f, key=lambda k: (len(k), k)):
        m = re.fullmatch(r'event(\d+)', k) or re.fullmatch(r'(established_event\d+)', k)
        if m:
            event(title, int(m.group(1)) if k.startswith('event') else m.group(1), track, name)


def capital(title):
    code = mw.parse(M.wp_states.wp_dump.page(G.art(title)['title'])['text'])
    for t in code.filter_templates(recursive=True):
        if M.wp_states.tname(t).startswith('infobox'):
            for key in ('capital', 'capital_city', 'seat'):
                if t.has(key):
                    txt = M.wp_states.plain(t.get(key).value, []).strip()
                    txt = re.sub(r'\s+', ' ', txt)[:70]
                    if txt:
                        return G.ref(title, f'infobox {key}: {txt}')
            break
    lead = G.art(title)['body'].get('lead') or []
    return G.ref(title, f'lead: "{lead[0]["text"][:160]}"') if lead else G.ref(title, 'article')


# ---------- phases with their events ----------

def P(name, title, s='year_start', e='year_end', track=None, *, sc=None, ec=None, circa=False, startEvent=None, endEvent=None):
    """A phase from `title`: claims from fields s/e (or given lists); start and end events from the infobox when the
    article's event_start/event_end falls within a year of the edge. Adds the article's other events to `track`."""
    sc = sc or M.F(title, s, 'start')
    ec = ec or M.F(title, e, 'end')
    def near(which, edge):
        got = infobox_event(title, which)
        return bool(got) and min(got[0]) - 1 <= edge <= max(got[0]) + 1
    if startEvent is None and s in ('year_start', 'date_start') and near('start', sc[0]['year']):
        startEvent = event(title, 'start', track, name)
    if endEvent is None and e in ('year_end', 'date_end') and ec[0]['year'] <= HI + 30 and near('end', ec[0]['year']):
        endEvent = event(title, 'end', track, name, force=True)
    p = M.phase(name, sc, ec, circa=circa)
    for k, u in (('startEvent', startEvent), ('endEvent', endEvent)):
        if u:
            edge = p['start'] if k == 'startEvent' else p['end']
            ev_ = EVENTS[u]
            if ev_['start'] - 1 <= edge <= ev_.get('end', ev_['start']) + 1:
                p[k] = u
    all_events(title, track, name)
    return p


def S(title, s='year_start', e='year_end', track=None, *, sc=None, ec=None, circa=False, ongoing=None, name=None):
    """A typed lifespan stretch (same as P, without a name). ongoing: the ref saying it still exists."""
    if ongoing:
        sc = sc or M.F(title, s, 'start')
        st = {'start': sc[0]['year'], 'ongoing': True}
        if circa:
            st['circa'] = True
        st['startDates'] = sc
        st['ongoingSources'] = [ongoing]
        u = event(title, 'start', track, name) if s in ('year_start', 'date_start') else None
        if u and abs(EVENTS[u]['start'] - st['start']) <= 1:
            st['startEvent'] = u
        all_events(title, track, name)
        M.REPORT.append(f'    {"(lifespan)":44} {st["start"]} – ongoing')
        return st
    p = P(None, title, s, e, track, sc=sc, ec=ec, circa=circa)
    p.pop('name')
    return p


def link_phases(phases):
    """Where one phase's end event is within a year of the next phase's start, it began the next too (and back)."""
    for a, b in zip(phases, phases[1:]):
        if a.get('endEvent') and not b.get('startEvent'):
            e = EVENTS[a['endEvent']]
            if e['start'] - 1 <= b['start'] <= e.get('end', e['start']) + 1:
                b['startEvent'] = a['endEvent']
        if b.get('startEvent') and not a.get('endEvent'):
            e = EVENTS[b['startEvent']]
            if e['start'] - 1 <= a['end'] <= e.get('end', e['start']) + 1:
                a['endEvent'] = b['startEvent']
    return phases


def on(u, *tracks):
    for t in tracks:
        if u and t not in EVENTS[u]['tracks']:
            EVENTS[u]['tracks'].append(t)
    return u


def claim(year, title, loc, note=None, margin=None):
    c = {'year': year, 'source': G.ref(title, loc)}
    if margin:
        c['margin'] = margin
    if note:
        c['note'] = note
    return [c]


CLIO = None


def clio(polity, side, note):
    """A date claim from Cliopatria (trusted, Kevin 2026-11-20): the first or last year it draws `polity`.
    Used only where Cliopatria differs from the infobox by a lot AND the article describes a gradual end (Kevin,
    2026-11-21), never for Cliopatria's usual splits of polities."""
    global CLIO
    if CLIO is None:
        CLIO = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clio-years.json')))
    c = CLIO[polity]
    astro = lambda y: y + 1 if y < 0 else y  # noqa: E731  (Cliopatria: BCE negative, no year 0)
    G.SOURCES.setdefault('cliopatria', {'name': 'Cliopatria (Seshat Global History Databank), v0.2.1', 'author': 'Seshat Global History Databank',
                                        'url': 'https://github.com/Seshat-Global-History-Databank/cliopatria', 'accessed': '2026-11-21',
                                        'tags': ['cliopatria']})
    y = astro(c['from'] if side == 'start' else c['to'])
    return [{'year': y, 'source': {'sourceKey': 'cliopatria', 'sourceLocation': f'polity "{polity}": {astro(c["from"])}–{astro(c["to"])}'}, 'note': note}]


def ancient_row(anc, id_, parent):
    """Copy a row from Ancient and Classical unchanged (its claims and sources too), under a Medieval parent."""
    t = json.loads(json.dumps(next(x for x in anc['tracks'] if x['id'] == id_)))
    t['parent'] = parent
    t.pop('chronology', None)
    if t.get('memberships'):  # Medieval defines only the geography facet
        t['memberships'] = [m for m in t['memberships'] if m['facet'] == 'geography']
    for st in (t['span'] if isinstance(t.get('span'), list) else [t.get('span') or {}]) + t.get('phases', []):
        st.pop('startEvent', None)
        st.pop('endEvent', None)
    keys = sorted(set(re.findall(r'"sourceKey": "([^"]+)"', json.dumps(t))))  # sorted: rebuilds must be byte-identical
    for k in keys:
        src = anc['sources'][k]
        if k in G.SOURCES and G.SOURCES[k] != src:
            raise SystemExit(f'source key {k} differs between Ancient and Medieval')
        G.SOURCES[k] = src
    M.REPORT.append(f'  {t["name"]} ({id_}) copied from ancient-classical')
    return t


# ---------- the 1500 seam: Modern States owns what spans it ----------

# Modern States' committed build, read from git (never their working copy): commit d9c6674 on main (Modern after the blocs, #42)
# (after #32).
# To sync with a later Modern States build, change the commit and rerun.
MODERN_COMMIT = 'd9c6674'
SEAM_OWN = {'songhai-empire'}  # rows whose span a headline-date ruling sets (common/date_rulings.py): not copied from the pinned Modern file


@functools.lru_cache(maxsize=None)
def modern_seam_bytes():
    here = os.path.dirname(os.path.abspath(__file__))
    return subprocess.check_output(['git', '-C', here, 'show', f'{MODERN_COMMIT}:public/timelines/modern-states.json'])


def modern_seam():
    return json.loads(modern_seam_bytes())


NEEDS = []  # rows whose typed lifespan in Modern States can't hold Medieval's phases


def _strip(x):
    x = json.loads(json.dumps(x))
    x.pop('startEvent', None)
    x.pop('endEvent', None)
    return x


def _copy_sources(obj, srcs):
    for k in sorted(set(re.findall(r'"sourceKey": "([^"]+)"', json.dumps(obj)))):  # sorted: rebuilds must be byte-identical
        if k not in G.SOURCES:
            G.SOURCES[k] = srcs[k]


def modern_sync(R):
    """For rows Modern States also has: copy its phases that span 1500 (dropping Medieval's phases they cover) and its
    typed lifespan when Medieval's phases fit inside it; else list the row in NEEDS for the report."""
    mod = modern_seam()
    mrows = {t['id']: t for t in mod['tracks']}
    for t in R:
        m = mrows.get(t['id'])
        if not m or t['id'] in ('hre', 'france'):
            continue
        for mp in [p for p in m.get('phases', []) if p['start'] <= HI and (p.get('ongoing') or p['end'] >= HI)]:
            cp = _strip(mp)
            old = [p for p in t.get('phases', []) if p['name'] == cp['name'] or (p['start'] >= cp['start'] and p['end'] <= cp.get('end', 9999))]
            for p in old:
                if p.get('startEvent') and p['start'] == cp['start']:
                    cp['startEvent'] = p['startEvent']
            t['phases'] = sorted([p for p in t.get('phases', []) if p not in old] + [cp], key=lambda p: p['start'])
            _copy_sources(cp, mod['sources'])
            M.REPORT.append(f'  {t["id"]}: phase "{cp["name"]}" {cp["start"]}–{cp.get("end", "ongoing")} copied from Modern States')
            if t.get('span') and not m.get('span'):
                t.pop('span')
        if m.get('span') and t['id'] not in SEAM_OWN:  # SEAM_OWN: a ruling sets the span on both timelines from one list (date_rulings.py), so the seam copy of the pinned Modern file would only undo it
            ms = m['span'] if isinstance(m['span'], list) else [m['span']]
            inside = all(any(st['start'] <= p['start'] and (st.get('ongoing') or p['end'] <= st['end']) for st in ms) for p in t.get('phases', []))
            if inside:
                t['span'] = _strip(m['span']) if not isinstance(m['span'], list) else [_strip(x) for x in m['span']]
                _copy_sources(t['span'], mod['sources'])
                M.REPORT.append(f'  {t["id"]}: typed lifespan copied from Modern States')
            else:
                NEEDS.append(t['id'])


# ---------- rows ----------

def build(mod, repo):
    global M, G
    M, G = mod, mod.G
    import wp_states  # noqa: F401  (for capital())
    M.wp_states = wp_states
    anc = json.load(open(os.path.join(repo, 'public', 'timelines', 'ancient-classical.json')))
    for e in M.PILOT_EVENTS:
        register(e)

    R = []

    def row(id_, name, parent, title, region, color, **kw):
        t = M.row(id_, name, color, parent, title, regions=[M.region(region, capital(title))], **kw)
        R.append(t)
        return t

    def grp(id_, name, color):
        R.append({'id': id_, 'name': name, 'color': color, 'parent': 'europe'})

    # ----- Southeastern Europe -----
    grp('southeast-europe', 'Southeastern Europe', '#8a3a6a')
    R.append({**M.PILOT_ROWS['eastern-roman'], 'parent': 'southeast-europe'})
    T = 'bulgaria'
    row(T, 'Bulgaria', 'southeast-europe', 'First Bulgarian Empire', 'balkans', '#5a8a4a', phases=link_phases([
        P('First Bulgarian Empire', 'First Bulgarian Empire', track=T),
        P('Second Bulgarian Empire', 'Second Bulgarian Empire', track=T,
          ec=claim(1396, 'Second Bulgarian Empire', 'infobox life span: 1185 – 1396 or 1422')
          + claim(1422, 'Second Bulgarian Empire', 'infobox life span: 1185 – 1396 or 1422', 'The infobox gives 1396 or 1422.')),
    ]))
    T = 'serbia'
    row(T, 'Serbia', 'southeast-europe', 'Serbian Empire', 'balkans', '#7a4a3a', phases=link_phases([
        P('Principality of Serbia (early medieval)', 'Principality of Serbia (early medieval)', track=T),
        P('Grand Principality of Serbia', 'Grand Principality of Serbia', track=T),
        P('Kingdom of Serbia (medieval)', 'Kingdom of Serbia (1217–1346)', track=T),
        P('Serbian Empire', 'Serbian Empire', track=T),
        P('Serbian Despotate', 'Serbian Despotate', 'seg0.start', 'seg0.end', track=T),
        P('Serbian Despotate (restored)', 'Serbian Despotate', 'seg1.start', 'seg1.end', track=T),
    ]))
    T = 'croatia'
    croatia_union = 'Croatia in personal union with Hungary'
    row(T, 'Croatia', 'southeast-europe', 'Kingdom of Croatia (925–1102)', 'balkans', '#3a5a8a', phases=link_phases([
        P('Duchy of Croatia', 'Duchy of Croatia', track=T, circa=True,
          sc=claim(700, 'Duchy of Croatia', 'infobox year_start: 7th/8th century', 'The infobox gives the 7th or 8th century.', margin=100)),
        P('Kingdom of Croatia', 'Kingdom of Croatia (925–1102)', track=T, circa=True),
        P('Kingdom of Croatia (in union with Hungary)', croatia_union, track=T),
    ]), memberOf=[M.member('hungary', M.F(croatia_union, 'year_start', 'start'), M.F(croatia_union, 'year_end', 'end'),
                           sources=[infobox_event(croatia_union, 'start')[2]])])
    T = 'bosnia-and-herzegovina'
    row(T, 'Bosnia', 'southeast-europe', 'Kingdom of Bosnia', 'balkans', '#4a6a7a', phases=link_phases([
        P('Banate of Bosnia', 'Banate of Bosnia', track=T),
        P('Kingdom of Bosnia', 'Kingdom of Bosnia', track=T),
    ]))
    T = 'wallachia'
    row(T, 'Wallachia', 'southeast-europe', 'Wallachia', 'balkans', '#9a7a2a',
        span=S('Wallachia', 'date_start', 'date_end', T,
               ec=M.F('Wallachia', 'date_end', 'end') + claim(1862, 'Wallachia', 'infobox life span: 1330–1862', 'The infobox life span ends in 1862.')))
    T = 'moldavia'  # Modern States: Moldavia carried on into Romania, not today's Moldova; dates follow their row
    row(T, 'Moldavia', 'southeast-europe', 'Moldavia', 'balkans', '#6a5a9a', span=S('Moldavia', track=T))
    T = 'ragusa'
    row(T, 'Republic of Ragusa', 'southeast-europe', 'Republic of Ragusa', 'balkans', '#2a7a8a', span=S('Republic of Ragusa', track=T))
    T = 'latin-empire'
    row(T, 'Latin Empire', 'southeast-europe', 'Latin Empire', 'balkans', '#8a5a2a', span=S('Latin Empire', track=T))
    on('sack-of-constantinople', T)
    R[-1]['span']['startEvent'] = 'sack-of-constantinople'
    R[-1]['span']['endEvent'] = 'constantinople-recovered'
    on('constantinople-recovered', T)
    T = 'despotate-of-epirus'
    row(T, 'Despotate of Epirus', 'southeast-europe', 'Despotate of Epirus', 'balkans', '#5a7a5a',
        span=[S('Despotate of Epirus', 'seg0.start', 'seg0.end', T), S('Despotate of Epirus', 'seg1.start', 'seg1.end', T)])
    T = 'empire-of-trebizond'
    row(T, 'Empire of Trebizond', 'southeast-europe', 'Empire of Trebizond', 'anatolia', '#7a3a5a', span=S('Empire of Trebizond', track=T))

    # ----- Central Europe -----
    grp('central-europe', 'Central Europe', '#8a6d3b')
    R.append({**M.PILOT_ROWS['hre'], 'parent': 'central-europe'})
    T = 'east-francia'
    row(T, 'East Francia', 'central-europe', 'East Francia', 'central-europe', '#6a5a3a', span=S('East Francia', track=T),
        memberOf=[M.member('carolingian-empire', M.F('East Francia', 'year_start', 'start'), M.F('Carolingian Empire', 'year_end', 'end'),
                           sources=[infobox_event('Carolingian Empire', 1)[2]])])
    T = 'great-moravia'
    row(T, 'Great Moravia', 'central-europe', 'Great Moravia', 'central-europe', '#5a6a3a', span=S('Great Moravia', track=T, circa=True))
    T = 'czechia'
    row(T, 'Czechia (Bohemia)', 'central-europe', 'Kingdom of Bohemia', 'central-europe', '#3a4a8a', phases=link_phases([
        P('Duchy of Bohemia', 'Duchy of Bohemia', track=T, circa=True),
        P('Kingdom of Bohemia', 'Kingdom of Bohemia', track=T),
    ]), memberOf=[M.member('hre', [{'year': infobox_event('Duchy of Bohemia', 2)[0][0], 'source': infobox_event('Duchy of Bohemia', 2)[2]}],
                           [{'year': 1806, 'source': G.ref('Holy Roman Empire', 'infobox date_end: 6 August 1806')}],
                           sources=[infobox_event('Duchy of Bohemia', 2)[2]], startEvent=event('Duchy of Bohemia', 2, 'czechia'))])
    T = 'austria'
    row(T, 'Austria', 'central-europe', 'Duchy of Austria', 'central-europe', '#a83a3a', phases=link_phases([
        P('Margraviate of Austria', 'Margraviate of Austria', track=T, circa=True),
        P('Duchy of Austria', 'Duchy of Austria', track=T),
        P('Archduchy of Austria', 'Archduchy of Austria', 'year_start', 'seg0.end', track=T),
    ]))
    T = 'prussia'
    bra = 'Margraviate of Brandenburg'
    b_end = infobox_event(bra, 2)
    row(T, 'Prussia', 'central-europe', bra, 'central-europe', '#4a4a4a', phases=[
        P('Margraviate of Brandenburg', bra, track=T, ec=[{'year': b_end[0][0], 'source': b_end[2], 'note': 'Ends where Brandenburg–Prussia begins.'}]),
    ], memberOf=[M.member('hre', M.F(bra, 'year_start', 'start'), [{'year': b_end[0][0], 'source': b_end[2], 'note': 'Medieval ends the row where Brandenburg–Prussia begins; Modern States carries the membership on.'}],
                         sources=[infobox_event(bra, 'end')[2]])])
    T = 'hungary'
    hp = 'Principality of Hungary'
    row(T, 'Hungary', 'central-europe', 'Kingdom of Hungary (1000–1301)', 'central-europe', '#3a7a4a', phases=link_phases([
        P('Principality of Hungary', hp, 'seg0.start', 'seg0.end', track=T, circa=True,
          ec=M.F(hp, 'seg0.end', 'end') + claim(1001, hp, 'infobox date_end: 25 December 1000 / or 1 January 1001', 'Stephen I was crowned on 25 December 1000 or 1 January 1001.'),
          endEvent=event(hp, 'end', T, force=True)),
        P('Kingdom of Hungary (Árpád dynasty)', 'Kingdom of Hungary (1000–1301)', track=T),
        P('Kingdom of Hungary', 'Kingdom of Hungary (1301–1526)', track=T),
    ]))
    T = 'poland'
    cr = 'Crown of the Kingdom of Poland'
    row(T, 'Poland', 'central-europe', 'Kingdom of Poland', 'central-europe', '#b04a4a', phases=link_phases([
        P('Civitas Schinesghe (Duchy of Poland)', 'Civitas Schinesghe', track=T, circa=True),
        P('Kingdom of Poland', 'Kingdom of Poland', 'seg0.start', 'seg0.end', track=T,
          ec=[{**M.F(cr, 'year_start', 'start')[0], 'note': 'Ends where the Crown of the Kingdom of Poland begins.'}]),
        P('Crown of the Kingdom of Poland', cr, track=T, startEvent=False),
    ]))
    T = 'lithuania'
    gdl = 'Grand Duchy of Lithuania'
    row(T, 'Lithuania', 'central-europe', gdl, 'northern-europe', '#5a8a3a', phases=[
        P('Grand Duchy of Lithuania', gdl, 'seg0.start', 'seg0.end', track=T, circa=True,
          sc=M.F(gdl, 'seg0.start', 'start') + claim(1180, gdl, 'infobox year_start: 1180s', 'Consolidation began in the 1180s.')),
    ])
    krewo, lublin = infobox_event(gdl, 2), infobox_event(gdl, 3)
    T = 'polish-lithuanian-union'
    plu = M.row(T, 'Polish–Lithuanian union', '#8a4a6a', 'central-europe', 'Polish–Lithuanian union',
                regions=[M.region('central-europe', M.lead('Polish–Lithuanian union', 'The Polish–Lithuanian union was a relationship'))],
                span=M.stretch([{'year': krewo[0][0], 'source': krewo[2]}], [{'year': lublin[0][0], 'source': lublin[2]}]))
    R.append(plu)
    u_krewo = on(event(gdl, 2, T), 'poland', 'lithuania')
    plu['span']['startEvent'] = u_krewo
    union_src = [M.lead('Polish–Lithuanian union', 'The Polish–Lithuanian union was a relationship')]
    for m in ('poland', 'lithuania'):
        next(t for t in R if t['id'] == m)['memberOf'] = [M.member(T, [{'year': krewo[0][0], 'source': krewo[2]}],
                                                                   [{'year': lublin[0][0], 'source': lublin[2]}], sources=union_src, startEvent=u_krewo)]
    T = 'teutonic-order'
    row(T, 'State of the Teutonic Order', 'central-europe', 'State of the Teutonic Order', 'northern-europe', '#2a2a2a', span=S('State of the Teutonic Order', track=T))
    T = 'switzerland'
    osc = 'Old Swiss Confederacy'
    ind = infobox_event(osc, 4)
    row(T, 'Switzerland', 'central-europe', osc, 'central-europe', '#c03030', phases=[P('Old Swiss Confederacy', osc, track=T)],
        memberOf=[M.member('hre', M.F(osc, 'year_start', 'start'), [{'year': ind[0][0], 'source': ind[2]}], sources=[ind[2]])])

    # ----- Italy -----
    grp('italian-peninsula', 'Italy', '#2a7a5a')
    R.append(ancient_row(anc, 'lombards', 'italian-peninsula'))
    all_events('Kingdom of the Lombards', 'lombards')
    event('Kingdom of the Lombards', 'end', 'lombards', force=True)
    # DRAFT (2026-11-24, for Kevin's call on a new row): the Kingdom of Italy from the Frankish conquest (774), so the
    # Carolingian and post-Carolingian kings of Italy who were also emperors (Louis II, Guy III and Lambert II of Spoleto,
    # Louis the Blind, Berengar I) have a row; the infobox's 962 (Otto I) is a claim. Its reigns: italy-reigns.json.
    T = 'kingdom-of-italy'
    kit = 'Kingdom of Italy (Holy Roman Empire)'
    row(T, 'Kingdom of Italy', 'italian-peninsula', kit, 'italy', '#3a7a9a',
        span=S(kit, track=T, sc=M.L(774, kit, 'In June 774, the kingdom collapsed') + M.F(kit, 'year_start', 'start', note='The kingdom within the Holy Roman Empire, from Otto I (962).')))
    T = 'papal-states'
    row(T, 'Papal States', 'italian-peninsula', 'Papal States', 'italy', '#c0a030', span=S('Papal States', track=T))
    T = 'venice'
    row(T, 'Republic of Venice', 'italian-peninsula', 'Republic of Venice', 'italy', '#a03a3a', span=S('Republic of Venice', track=T))
    T = 'genoa'
    row(T, 'Republic of Genoa', 'italian-peninsula', 'Republic of Genoa', 'italy', '#3a3aa0',
        span=[S('Republic of Genoa', 'seg0.start', 'seg0.end', T), S('Republic of Genoa', 'seg1.start', 'seg1.end', T)])
    T = 'emirate-of-sicily'
    row(T, 'Emirate of Sicily', 'italian-peninsula', 'Emirate of Sicily', 'italy', '#2a8a5a', span=S('Emirate of Sicily', track=T))
    T = 'sicily'
    row(T, 'Sicily', 'italian-peninsula', 'Kingdom of Sicily', 'italy', '#c06a2a', phases=link_phases([
        P('County of Sicily', 'County of Sicily', track=T),
        P('Kingdom of Sicily', 'Kingdom of Sicily', track=T),
    ]))
    T = 'naples'
    row(T, 'Kingdom of Naples', 'italian-peninsula', 'Kingdom of Naples', 'italy', '#6a8ac0',
        span=[S('Kingdom of Naples', 'seg0.start', 'seg0.end', T), S('Kingdom of Naples', 'seg1.start', 'seg1.end', T)])
    on(event('Kingdom of Naples', 'start', T), T)
    R[-1]['span'][0]['startEvent'] = find('Sicilian Vespers', 1282)
    T = 'milan'
    mil = 'Duchy of Milan'
    amb = infobox_event(mil, 1)
    row(T, 'Milan', 'italian-peninsula', mil, 'italy', '#4a8a8a', phases=[
        P('Duchy of Milan', mil, 'seg0.start', 'seg0.end', track=T),
        M.phase('Golden Ambrosian Republic', [{'year': amb[0][0], 'source': amb[2]}], [{'year': amb[0][-1], 'source': amb[2]}]),
        P('Duchy of Milan (restored)', mil, 'seg1.start', 'seg1.end', track=T),
    ])
    T = 'florence'
    row(T, 'Republic of Florence', 'italian-peninsula', 'Republic of Florence', 'italy', '#8a2a6a', span=S('Republic of Florence', track=T))
    T = 'savoy'
    row(T, 'Savoy', 'italian-peninsula', 'Duchy of Savoy', 'italy', '#3a6a9a', phases=link_phases([
        P('County of Savoy', 'County of Savoy', track=T),
        P('Duchy of Savoy', 'Duchy of Savoy', 'year_start', 'seg0.end', track=T),
        P('Duchy of Savoy (restored)', 'Duchy of Savoy', 'seg1.start', 'seg1.end', track=T),
    ]))

    # ----- Iberia -----
    grp('iberia', 'Iberia', '#a8732f')
    R.append(ancient_row(anc, 'visigoths', 'iberia'))
    all_events('Visigothic Kingdom', 'visigoths')
    event('Visigothic Kingdom', 'end', 'visigoths', force=True)
    T = 'spain'
    leon_union = infobox_event('Kingdom of León', 1)
    cast_union = infobox_event('Kingdom of Castile', 1)
    row(T, 'Spain (Asturias, León, Castile)', 'iberia', 'Crown of Castile', 'iberia', '#c08a2a', phases=link_phases([
        P('Kingdom of Asturias', 'Kingdom of Asturias', track=T),
        P('Kingdom of León', 'Kingdom of León', track=T, ec=[{'year': leon_union[0][0], 'source': leon_union[2]}]),
        P('Kingdom of Castile', 'Kingdom of Castile', track=T, ec=[{'year': cast_union[0][0], 'source': cast_union[2]}]),
        P('Crown of Castile', 'Crown of Castile', track=T),
    ]))
    sp = R[-1]['phases']
    sp[1]['endEvent'] = find('Permanent union of Castile and León', 1230)
    ca = 'Crown of Aragon'
    T = 'crown-of-aragon'
    row(T, 'Crown of Aragon', 'iberia', ca, 'iberia', '#d0a020', span=S(ca, track=T))
    ca_start = R[-1]['span'].get('startEvent')
    ca_end = M.F(ca, 'year_end', 'end')
    T = 'aragon'
    row(T, 'Kingdom of Aragon', 'iberia', 'Kingdom of Aragon', 'iberia', '#b08a3a', span=S('Kingdom of Aragon', track=T),
        memberOf=[M.member(ca and 'crown-of-aragon', M.F(ca, 'year_start', 'start'), ca_end,
                           sources=[G.ref('Kingdom of Aragon', 'infobox successor: Crown of Aragon')], startEvent=on(ca_start, 'aragon'))])
    T = 'catalonia'
    row(T, 'Principality of Catalonia', 'iberia', 'Principality of Catalonia', 'iberia', '#c0402a', span=S('Principality of Catalonia', track=T),
        memberOf=[M.member('crown-of-aragon', M.F('Principality of Catalonia', 'year_start', 'start'), ca_end,
                           sources=[G.ref(ca, 'infobox event_start: Aragon–Barcelona Union')])])
    T = 'kingdom-of-valencia'
    val = infobox_event(ca, 2)
    u_val = event(ca, 2, 'crown-of-aragon')
    row(T, 'Kingdom of Valencia', 'iberia', 'Kingdom of Valencia', 'iberia', '#d07a2a', span=S('Kingdom of Valencia', track=T),
        memberOf=[M.member('crown-of-aragon', M.F('Kingdom of Valencia', 'year_start', 'start'), ca_end, sources=[val[2]], startEvent=on(u_val, T))])
    T = 'navarre'
    row(T, 'Kingdom of Navarre', 'iberia', 'Kingdom of Navarre', 'iberia', '#8a3a3a', span=S('Kingdom of Navarre', track=T))
    T = 'portugal'
    row(T, 'Portugal', 'iberia', 'Kingdom of Portugal', 'iberia', '#2a7a3a', phases=link_phases([
        P('County of Portugal', 'County of Portugal', 'seg0.start', 'seg0.end', track=T),
        P('County of Portugal (restored)', 'County of Portugal', 'seg1.start', 'seg1.end', track=T),
        P('Kingdom of Portugal', 'Kingdom of Portugal', track=T),
    ]))
    T = 'umayyad-cordoba'
    cor = 'Emirate of Córdoba'
    cal = infobox_event(cor, 1)
    u_cal = event(cor, 1, T)
    row(T, 'Umayyad Córdoba', 'iberia', cor, 'iberia', '#2f7d4f', phases=[
        P('Emirate of Córdoba', cor, track=T, ec=[{'year': cal[0][0], 'source': cal[2]}], endEvent=u_cal),
        P('Caliphate of Córdoba', cor, track=T, sc=[{'year': cal[0][0], 'source': cal[2]}], startEvent=u_cal),
    ])
    T = 'emirate-of-granada'
    row(T, 'Emirate of Granada', 'iberia', 'Emirate of Granada', 'iberia', '#3a8a6a', span=S('Emirate of Granada', track=T))

    # ----- Western Europe -----
    grp('western-europe', 'Western Europe', '#3f6aa8')
    T = 'francia'
    row(T, 'Francia', 'western-europe', 'Francia', 'western-europe', '#3a5a9a', span=S('Francia', track=T))
    on('charlemagne-crowned', T)
    T = 'carolingian-empire'
    row(T, 'Carolingian Empire', 'western-europe', 'Carolingian Empire', 'western-europe', '#5a3a8a', span=S('Carolingian Empire', track=T))
    for t in R:
        if t['id'] == 'east-francia':
            t['memberOf'][0]['startEvent'] = find('Treaty of Verdun', 843)
    T = 'france'
    fr_phase = {"name": "Kingdom of France", "start": 987, "end": 1791,
                "startDates": [{"year": 987, "source": G.ref('Kingdom of France', 'infobox life span: 987–1792')}],
                "endDates": [{"year": 1791, "source": G.ref('Kingdom of France (1791–92)', 'infobox year_start: 1791')}]}
    wf = P('West Francia', 'West Francia', track=T)
    cap = event('Kingdom of France', 'start', T, 'Kingdom of France')
    all_events('Kingdom of France', T)
    if cap:
        fr_phase['startEvent'] = cap
    row(T, 'France', 'western-europe', 'Kingdom of France', 'western-europe', '#3a4aa8', phases=link_phases([wf, fr_phase]),
        memberOf=[M.member('carolingian-empire', M.F('West Francia', 'year_start', 'start'), M.F('Carolingian Empire', 'year_end', 'end'),
                           sources=[infobox_event('Carolingian Empire', 1)[2]], startEvent=find('Treaty of Verdun', 843))])
    T = 'duchy-of-burgundy'
    row(T, 'Duchy of Burgundy', 'western-europe', 'Duchy of Burgundy', 'western-europe', '#7a2a4a', span=S('Duchy of Burgundy', track=T, circa=True))
    T = 'duchy-of-normandy'
    row(T, 'Duchy of Normandy', 'western-europe', 'Duchy of Normandy', 'western-europe', '#9a6a2a', span=S('Duchy of Normandy', track=T))

    # ----- British Isles -----
    grp('british-isles', 'British Isles', '#4a6a8a')
    R.append(ancient_row(anc, 'anglo-saxons', 'british-isles'))
    all_events('Anglo-Saxon England', 'anglo-saxons')
    event('Anglo-Saxon England', 'end', 'anglo-saxons', force=True)
    T = 'united-kingdom'
    row(T, 'United Kingdom (England)', 'british-isles', 'Kingdom of England', 'british-isles', '#a8303a',
        phases=[P('Kingdom of England', 'Kingdom of England', 'year_start', 'seg0.end', track=T)])
    T = 'scotland'
    row(T, 'Scotland', 'british-isles', 'Kingdom of Scotland', 'british-isles', '#2a4a8a',
        phases=[P('Kingdom of Scotland', 'Kingdom of Scotland', 'year_start', 'seg0.end', track=T)])
    T = 'wales'
    pw = 'Principality of Wales'
    row(T, 'Wales', 'british-isles', pw, 'british-isles', '#3a8a3a', phases=link_phases([
        P('Principality of Wales (Princes of Gwynedd)', pw, 'seg0.start', 'seg0.end', track=T),
        P('Principality of Wales (English Crown)', pw, 'seg1.start', 'seg1.end', track=T),
    ]), memberOf=[M.member('united-kingdom', M.F(pw, 'seg1.start', 'start'), M.F(pw, 'seg1.end', 'end'),
                           sources=[G.ref(pw, 'infobox life span: 1283–1542: possession of the English Crown')])])
    T = 'ireland'
    row(T, 'Ireland', 'british-isles', 'Lordship of Ireland', 'british-isles', '#3a8a5a', phases=[P('Lordship of Ireland', 'Lordship of Ireland', track=T)])

    # ----- Scandinavia and the North -----
    grp('northern-europe', 'Scandinavia and the North', '#5a7a9a')
    ku = 'Kalmar Union'
    T = 'kalmar-union'
    row(T, 'Kalmar Union', 'northern-europe', ku, 'northern-europe', '#a83a5a', span=S(ku, track=T))
    k_start = R[-1]['span'].get('startEvent')
    k_end = event(ku, 'end', T, force=True)
    R[-1]['span']['endEvent'] = k_end
    ksc, kec = M.F(ku, 'year_start', 'start'), M.F(ku, 'year_end', 'end')
    T = 'denmark'
    hd = 'History of Denmark'
    row(T, 'Denmark', 'northern-europe', hd, 'northern-europe', '#c83a3a',
        span=S(hd, 'seg0.start', None, T, sc=M.F(hd, 'seg0.start', 'start') + claim(965, 'Danish Realm', 'infobox established_event1: Unification, c. 965', 'The Danish Realm dates unification to c. 965.'),
               ongoing=G.ref('Danish Realm', 'infobox: the Danish Realm, a current state (established_event1: Unification, c. 965)')),
        phases=[P('Kingdom of Denmark', hd, 'seg0.start', 'seg0.end', track=T,
                  sc=claim(965, 'Danish Realm', 'infobox established_event1: Unification, c. 965', 'Modern States dates Denmark from c. 965.') + M.F(hd, 'seg0.start', 'start'))],
        memberOf=[M.member('kalmar-union', ksc, kec, sources=[G.ref(hd, 'infobox event_end: Incorporated into the Kalmar Union, 1397')],
                           startEvent=on(k_start, T), endEvent=on(k_end, T))])
    T = 'norway'
    kn = 'Kingdom of Norway (872–1397)'
    row(T, 'Norway', 'northern-europe', kn, 'northern-europe', '#3a5aa8',
        span=S(kn, track=T, ongoing=G.ref('Norway', 'infobox established_event5: State re-established, 25 February 1814 (a current state)')),
        phases=[P('Kingdom of Norway', kn, track=T)],
        memberOf=[M.member('kalmar-union', ksc, kec, sources=[infobox_event('Norway', 'established_event3')[2]],
                           startEvent=on(k_start, T), endEvent=on(k_end, T))])
    T = 'sweden'
    row(T, 'Sweden', 'northern-europe', 'Sweden', 'northern-europe', '#2a6aa8',
        span=S('Sweden', None, None, T, circa=True, sc=claim(975, 'Sweden', 'infobox established_event1: A unified Swedish kingdom established, By the late 10th century',
                                                         'The infobox says "By the late 10th century".', margin=25),
               ongoing=G.ref('Sweden', 'infobox established_event1: A unified Swedish kingdom established (a current state)')),
        memberOf=[M.member('kalmar-union', ksc, kec, sources=[infobox_event('Sweden', 'established_event2')[2]],
                           startEvent=on(k_start, T), endEvent=on(k_end, T))])
    T = 'iceland'
    row(T, 'Iceland', 'northern-europe', 'Icelandic Commonwealth', 'northern-europe', '#5a9aa8',
        phases=[P('Icelandic Commonwealth', 'Icelandic Commonwealth', track=T, circa=True)])

    # ----- Eastern Europe -----
    grp('eastern-europe', 'Eastern Europe', '#6a5a8a')
    R.append(ancient_row(anc, 'slavs', 'eastern-europe'))
    T = 'kievan-rus'
    row(T, "Kievan Rus'", 'eastern-europe', "Kievan Rus'", 'eastern-europe', '#8a6a2a', span=S("Kievan Rus'", track=T, circa=True))
    T = 'novgorod-republic'
    row(T, 'Novgorod Republic', 'eastern-europe', 'Novgorod Republic', 'eastern-europe', '#5a3a2a', span=S('Novgorod Republic', track=T))
    T = 'vladimir-suzdal'
    row(T, 'Vladimir-Suzdal', 'eastern-europe', 'Vladimir-Suzdal', 'eastern-europe', '#7a5a3a', span=S('Vladimir-Suzdal', track=T))
    T = 'russia'
    gm = 'Grand Duchy of Moscow'
    row(T, 'Russia (Muscovy)', 'eastern-europe', gm, 'eastern-europe', '#a83a2a', phases=[
        P('Grand Principality of Moscow', gm, track=T,
          ec=M.F(gm, 'year_end', 'end') + claim(1478, gm, 'infobox life span: 1263–1478/1547', 'The infobox also ends it in 1478.')),
    ], memberOf=[M.member('golden-horde', [{**M.F(gm, 'year_start', 'start')[0], 'note': 'From the principality\'s founding.'}],
                          M.L(1480, 'Golden Horde', 'Great Stand on the Ugra River in 1480'),
                          sources=[M.lead('Golden Horde', 'Great Stand on the Ugra River in 1480', 1480)], endEvent=on('great-stand-ugra', T))])
    T = 'galicia-volhynia'
    gv = 'Kingdom of Galicia–Volhynia'
    row(T, 'Galicia–Volhynia', 'eastern-europe', gv, 'eastern-europe', '#3a6a5a',
        span=S(gv, 'seg0.start', 'seg0.end', T, ec=M.F(gv, 'seg0.end', 'end') + claim(1452, gv, 'infobox date_end: 1452', 'Volhynia was incorporated by Lithuania in 1452.')))

    modern_sync(R)
    for u in KEY:
        if u in EVENTS:
            EVENTS[u]['importance'] = 1
    new_events = [e for u, e in EVENTS.items() if e not in M.PILOT_EVENTS]
    return R, new_events
