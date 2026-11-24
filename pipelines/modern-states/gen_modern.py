"""
Builds the Modern States timeline (data-src/modern-states.json in the timelines repo) in the format of PR #19:
lifespans worked out from phases (typed only across gaps a row lived through), `ongoing` + `ongoingSources`,
unions as their own rows with dated `memberOf` on members, and `startEvent`/`endEvent` naming the events that
began and ended phases, lifespans and memberships.

Every date comes from the offline Wikipedia dump via wp_states.extract (through gen_testset's helpers): a phase
names its article and the field that gives each end, and the article's other values for that end become extra
claims. Hand-cited values (a lead sentence) use C(). Pages with an AI-generated-text flag are refused.

PILOT (2026-11-21): France, Holy Roman Empire, German Confederation, Germany, Prussia, Yugoslavia,
Serbia and Montenegro, Serbia, Croatia. COLONIAL PILOT (2026-11-21): colonial.py (start year moved to 1500).
WAVE 1 (2026-11-21): europe.py; group rows in groups.py. WAVE 2 (2026-11-21): post_soviet.py.
UNIT 7 (2026-11-22): unit7.py, key events of 1900–1945 for history courses, on existing rows.
BLOCS (2026-11-22, Education): blocs.py, the Cold War blocs as union rows in a Connections group, with memberOf on members.

Usage (from the repo, see pipelines/README.md):
       python -I pipelines/modern-states/gen_modern.py [repo] [module,module,...] [--data DIR] [--dump NAME]
       repo defaults to this checkout; modules default to MODULES.
Writes data-src/modern-states.json and, for a full run, its provenance manifest data-src/provenance/modern-states.json.
A run over some modules writes its manifest to pipelines/out/ instead; the report always goes to pipelines/out/.
Then:  npm run data -- build modern-states
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PIPELINES = os.path.dirname(HERE)
sys.path[:0] = [HERE, os.path.join(PIPELINES, 'common')]
from settings import take_flags  # noqa: E402

ARGS = take_flags(sys.argv[1:]) if __name__ == '__main__' else []
import wp_claims as G  # noqa: E402  (art/ref/claims over wp_states.extract; refuses AI-flagged pages)

PRESENT = G.PRESENT
REPORT = []


# ---------- claims ----------

def F(title, spec, side):
    """Claims for one end of a phase from an article field (the chosen value first, the article's others after)."""
    return G.claims(title, spec, side)[1]


def C(year, title, loc, note=None):
    """One hand-cited claim (a lead sentence, an infobox event)."""
    c = {'year': year, 'source': G.ref(title, loc)}
    if note:
        c['note'] = note
    return [c]


def E(title, n):
    """(year, source ref) of an infobox event: n = 1, 2… (date_eventN/eventN), 'start' or 'end'."""
    r = G.art(title)
    f = r['fields']
    if n in ('start', 'end'):
        dk, ek, yk = f'date_{n}', f'event_{n}', f'year_{n}'
    else:
        dk, ek, yk = f'date_event{n}', f'event{n}', None
    d = f.get(dk)
    years = (d or {}).get('years') or (f.get(yk) or {}).get('years')
    if not years:
        raise SystemExit(f'{title}: no year for event {n}')
    label = f.get(ek, {}).get('text', '')
    text = (d['text'] if d else '') + (f' {f[yk]["text"]}' if yk and yk in f and d and not d.get('years') else '')
    return years[0], G.ref(title, f'infobox {ek}: {label}, {text.strip()}'.strip(', '))


def W(title, field='date'):
    """(years, source ref) from any infobox's field: war and battle infoboxes, which wp_states doesn't read."""
    import mwparserfromhell as mw
    import wp_states
    G.art(title)  # refuses missing and AI-flagged pages, registers the source
    code = mw.parse(wp_states.wp_dump.page(title)['text'])
    for t in code.filter_templates(recursive=True):
        if not wp_states.tname(t).startswith('infobox'):
            continue
        for fld in ((field, 'date_signed') if field == 'date' else (field,)):  # treaties use date_signed
            if t.has(fld):
                txt = wp_states.plain(t.get(fld).value, []).split(' / ')[0].strip()
                ys = wp_states.years_in(txt)[0]
                if ys:
                    return ys, G.ref(title, f'infobox {fld}: {txt[:80]}')
    raise SystemExit(f'{title}: no infobox {field} with a year')


def lead(title, needle):
    """Source ref for the lead sentence of an article that contains `needle`."""
    for s in G.art(title)['body']['lead']:
        if needle in s['text']:
            return G.ref(title, f'lead: "{s["text"][:160]}"')
    raise SystemExit(f'{title}: no lead sentence with {needle!r}')


# ---------- rows ----------

def phase(name, sc, ec=None, *, ongoing=None, startEvent=None, endEvent=None, circa=False):
    """sc/ec: claim lists (best first). ongoing: the ref that says it still exists (instead of ec)."""
    p = {'name': name, 'start': sc[0]['year']}
    if ongoing:
        p['ongoing'] = True
    else:
        p['end'] = max(ec[0]['year'], p['start'])
    if circa:
        p['circa'] = True
    p['startDates'] = sc
    if ongoing:
        p['ongoingSources'] = [ongoing]
    else:
        p['endDates'] = ec
    if startEvent:
        p['startEvent'] = startEvent
    if endEvent:
        p['endEvent'] = endEvent
    yrs = lambda cs: '/'.join(str(c['year']) for c in cs)  # noqa: E731
    REPORT.append(f'    {name or "(lifespan)":44} {yrs(sc)} – {"ongoing" if ongoing else yrs(ec)}')
    return p


stretch = phase  # a typed lifespan stretch is dated like a phase, without a name


def span(*stretches):
    out = []
    for s in stretches:
        s = {k: v for k, v in s.items() if k != 'name'}
        out.append(s)
    return out[0] if len(out) == 1 else out


def member(row, sc, ec=None, *, sources, ongoing=None, startEvent=None, endEvent=None):
    m = {'row': row, 'start': sc[0]['year']}
    if ongoing:
        m['ongoing'] = True
    else:
        m['end'] = ec[0]['year']
    m['startDates'] = sc
    if not ongoing:
        m['endDates'] = ec
    m['sources'] = sources
    if startEvent:
        m['startEvent'] = startEvent
    if endEvent:
        m['endEvent'] = endEvent
    REPORT.append(f'    in {row:41} {m["start"]} – {"ongoing" if ongoing else m["end"]}')
    return m


def row(id_, name, color, parent, url_title, *, phases=None, span_=None, memberOf=None):
    REPORT.append(f'  {name} ({id_})')
    t = {'id': id_, 'name': name, 'color': color, 'parent': parent,
         'url': G.WP + G.art(url_title)['title'].replace(' ', '_')}
    if span_:
        t['span'] = span_
    if phases:
        t['phases'] = phases
    if memberOf:
        t['memberOf'] = memberOf
    return t


def ev(uuid, title, start, tracks, sources, *, end=None, descr='', importance=None, links=None):
    e = {'uuid': uuid, 'title': title, 'descr': descr, 'start': start}
    if end is not None:
        e['end'] = end
    e['tracks'] = tracks
    e['sources'] = sources if isinstance(sources, list) else [sources]
    if importance:
        e['importance'] = importance
    if links:
        e['links'] = links
    return e


def still(title, loc='infobox life span: 1958–present'):
    return G.ref(title, loc)


# ---------- the pilot ----------

def tracks():
    T = []
    # group rows come from groups.py (continents, then UN subregions)

    # France: one row, its governments as phases; Vichy and Free France are rival phases.
    kof, k91 = 'Kingdom of France', 'Kingdom of France (1791–92)'
    T.append(row('france', 'France', '#3f62b0', 'western-europe', 'France', phases=[
        phase('Kingdom of France', F(kof, 'seg0.start', 'start'), F(k91, 'year_start', 'start')),
        phase('Constitutional monarchy', F(k91, 'year_start', 'start'), F(k91, 'year_end', 'end'), endEvent='monarchy-abolished'),
        phase('First Republic', F('French First Republic', 'year_start', 'start'), F('French First Republic', 'year_end', 'end'),
              startEvent='monarchy-abolished', endEvent='napoleon-crowned'),
        phase('First Empire', F('First French Empire', 'seg0.start', 'start'), F('First French Empire', 'seg0.end', 'end'), startEvent='napoleon-crowned'),
        phase('Bourbon Restoration', F('Bourbon Restoration in France', 'year_start', 'start'), F('Bourbon Restoration in France', 'year_end', 'end'), endEvent='july-revolution'),
        phase('July Monarchy', F('July Monarchy', 'year_start', 'start'), F('July Monarchy', 'year_end', 'end'), startEvent='july-revolution'),
        phase('Second Republic', F('French Second Republic', 'year_start', 'start'), F('French Second Republic', 'year_end', 'end')),
        phase('Second Empire', F('Second French Empire', 'year_start', 'start'), F('Second French Empire', 'year_end', 'end'), endEvent='franco-prussian-war'),
        phase('Third Republic', F('French Third Republic', 'year_start', 'start'), F('French Third Republic', 'year_end', 'end')),
        phase('Vichy France', F('Vichy France', 'year_start', 'start'), F('Vichy France', 'year_end', 'end')),
        phase('Free France', F('Free France', 'year_start', 'start'), F('Free France', 'year_end', 'end')),
        phase('Provisional Government', F('Provisional Government of the French Republic', 'seg0.start', 'start'),
              F('Provisional Government of the French Republic', 'seg0.end', 'end')),
        phase('Fourth Republic', F('French Fourth Republic', 'year_start', 'start'), F('French Fourth Republic', 'year_end', 'end')),
        phase('Fifth Republic', F('French Fifth Republic', 'seg0.start', 'start'), ongoing=still('French Fifth Republic')),
    ]))

    # Unions of German states: their own rows (Kevin, 2026-11-21).
    T.append(row('hre', 'Holy Roman Empire', '#8a6d3b', 'western-europe', 'Holy Roman Empire',
                 span_=span(stretch(None, F('Holy Roman Empire', 'date_start', 'start')
                                    + C(800, 'Holy Roman Empire', 'infobox life span: 800/962–1806', 'Counted from Charlemagne\'s coronation by some historians.'),
                                    F('Holy Roman Empire', 'date_end', 'end'), endEvent='hre-dissolved'))))
    gc = 'German Confederation'
    T.append(row('german-confederation', 'German Confederation', '#6b7f3a', 'western-europe', gc, phases=[
        phase('German Confederation', F(gc, 'seg0.start', 'start') + C(1813, gc, 'infobox year_start: 1813 (German campaign)', 'The infobox dates its start to the 1813 campaign.'),
              F(gc, 'seg0.end', 'end'), startEvent='gc-founded', endEvent='revolutions-1848'),
        phase('German Empire of 1848–49', F('German Empire (1848–1849)', 'year_start', 'start'), F('German Empire (1848–1849)', 'year_end', 'end'),
              startEvent='revolutions-1848'),
        phase('German Confederation (restored)', F(gc, 'seg1.start', 'start'), F(gc, 'seg1.end', 'end'), endEvent='austro-prussian-war'),
    ]))
    T.append(row('germany', 'Germany', '#b0563f', 'western-europe', 'Germany', phases=[
        phase('North German Confederation', F('North German Confederation', 'year_start', 'start'), F('North German Confederation', 'year_end', 'end'),
              startEvent='ngc-founded', endEvent='german-empire-proclaimed'),
        phase('German Empire', F('German Empire', 'date_start', 'start'), F('German Empire', 'date_end', 'end'),
              startEvent='german-empire-proclaimed', endEvent='german-revolution'),
        phase('Weimar Republic', F('Weimar Republic', 'year_start', 'start'), F('Weimar Republic', 'year_end', 'end'), startEvent='german-revolution'),
        phase('Nazi Germany', F('Nazi Germany', 'year_start', 'start'), F('Nazi Germany', 'year_end', 'end')),
        phase('Allied occupation', F('Allied-occupied Germany', 'date_start', 'start'), F('Allied-occupied Germany', 'date_end', 'end')),
        phase('West Germany', F('West Germany', 'year_start', 'start'), F('West Germany', 'year_end', 'end'), endEvent='reunification'),
        phase('East Germany', F('East Germany', 'year_start', 'start'), F('East Germany', 'year_end', 'end'), endEvent='reunification'),
        phase('Federal Republic (reunified)', C(*E('West Germany', 'end')[:1], 'West Germany', E('West Germany', 'end')[1]['sourceLocation']),
              ongoing=lead('Germany', 'Germany'), startEvent='reunification'),
    ]))
    kp = 'Kingdom of Prussia'
    mb = 'Margraviate of Brandenburg'
    T.append(row('prussia', 'Prussia', '#4a5a7a', 'western-europe', 'Prussia', phases=[
        phase('Margraviate of Brandenburg', F(mb, 'year_start', 'start'), C(*E(mb, 2)[:1], mb, E(mb, 2)[1]['sourceLocation'])),
        phase('Brandenburg–Prussia', F('Brandenburg–Prussia', 'year_start', 'start'), F('Brandenburg–Prussia', 'year_end', 'end')),
        phase('Kingdom of Prussia', F(kp, 'year_start', 'start'), F(kp, 'year_end', 'end'), endEvent='german-revolution'),
        phase('Free State of Prussia', F('Free State of Prussia', 'year_start', 'start'), F('Free State of Prussia', 'year_end', 'end'),
              startEvent='german-revolution'),
    ], memberOf=[
        member('hre', F(mb, 'year_start', 'start'), C(*E(kp, 1)[:1], kp, E(kp, 1)[1]['sourceLocation']),
               sources=[lead('Brandenburg–Prussia', 'dissolution of the Holy Roman Empire')], endEvent='hre-dissolved'),
        member('german-confederation', C(*E(kp, 2)[:1], kp, E(kp, 2)[1]['sourceLocation']), C(*E(kp, 4)[:1], kp, E(kp, 4)[1]['sourceLocation']),
               sources=[lead(kp, 'two most powerful member states')], startEvent='gc-founded', endEvent='austro-prussian-war'),
        member('germany', C(*E(kp, 4)[:1], kp, E(kp, 4)[1]['sourceLocation']), F('Free State of Prussia', 'year_end', 'end'),
               sources=[lead(kp, 'major constituent of the German Empire'), lead('Free State of Prussia', 'constituent states')],
               startEvent='ngc-founded'),
    ]))

    # Yugoslavia: a union; the royal government-in-exile and the Partisans' Democratic Federal Yugoslavia are rival phases.
    T.append(row('yugoslavia', 'Yugoslavia', '#3a7f8f', 'southern-europe', 'Yugoslavia', phases=[
        phase('Kingdom of Yugoslavia', F('Kingdom of Yugoslavia', 'seg0.start', 'start'), F('Kingdom of Yugoslavia', 'seg0.end', 'end'),
              startEvent='yugoslavia-created', endEvent='axis-invasion-yugoslavia'),
        phase('Royal government-in-exile', F('Yugoslav government-in-exile', 'seg0.start', 'start'), F('Yugoslav government-in-exile', 'seg0.end', 'end'),
              startEvent='axis-invasion-yugoslavia'),
        phase('Democratic Federal Yugoslavia', F('Democratic Federal Yugoslavia', 'year_start', 'start'), F('Democratic Federal Yugoslavia', 'year_end', 'end')),
        phase('Socialist Federal Republic', F('Socialist Federal Republic of Yugoslavia', 'year_start', 'start'),
              F('Socialist Federal Republic of Yugoslavia', 'year_end', 'end'), endEvent='fry-proclaimed'),
    ]))
    sm = 'Serbia and Montenegro'
    T.append(row('serbia-and-montenegro', 'Serbia and Montenegro', '#5f6f9f', 'southern-europe', sm, phases=[
        phase('Federal Republic of Yugoslavia', F(sm, 'year_start', 'start'), C(*E(sm, 5)[:1], sm, E(sm, 5)[1]['sourceLocation']), startEvent='fry-proclaimed'),
        phase('State Union of Serbia and Montenegro', C(*E(sm, 5)[:1], sm, E(sm, 5)[1]['sourceLocation']), F(sm, 'year_end', 'end'),
              endEvent='montenegro-independence'),
    ]))
    srb, sr = 'Serbia', 'Socialist Republic of Serbia'
    T.append(row('serbia', 'Serbia', '#a03a3a', 'southern-europe', 'Serbia',
                 # inside Yugoslavia 1918–41 Serbia had no government of its own: the lifespan carries it across
                 # the medieval stretches match the Medieval World timeline's phases (seam check, 2026-11-21)
                 span_=span(stretch(None, F('Principality of Serbia (early medieval)', 'year_start', 'start'), F('Principality of Serbia (early medieval)', 'year_end', 'end')),
                            stretch(None, F('Grand Principality of Serbia', 'year_start', 'start'), F('Serbian Empire', 'year_end', 'end')),
                            stretch(None, F('Serbian Despotate', 'seg0.start', 'start'), F('Serbian Despotate', 'seg0.end', 'end')),
                            stretch(None, F('Serbian Despotate', 'seg1.start', 'start'), F('Serbian Despotate', 'seg1.end', 'end')),
                            stretch(None, F('Revolutionary Serbia', 'year_start', 'start'), F('Revolutionary Serbia', 'year_end', 'end')),
                            stretch(None, F('Principality of Serbia', 'year_start', 'start'), ongoing=G.ref(srb, 'infobox established_event9: Republic of Serbia, 2006'))),
                 phases=[
        phase('Revolutionary Serbia', F('Revolutionary Serbia', 'year_start', 'start'), F('Revolutionary Serbia', 'year_end', 'end')),
        phase('Principality of Serbia', F('Principality of Serbia', 'year_start', 'start'), F('Principality of Serbia', 'year_end', 'end')),
        phase('Kingdom of Serbia', F('Kingdom of Serbia', 'year_start', 'start'), F('Kingdom of Serbia', 'year_end', 'end'), endEvent='yugoslavia-created'),
        phase('Military Commander in Serbia (German occupation)', F('Territory of the Military Commander in Serbia', 'year_start', 'start'),
              F('Territory of the Military Commander in Serbia', 'year_end', 'end'), startEvent='axis-invasion-yugoslavia'),
        phase('Socialist Republic of Serbia', F(sr, 'seg0.start', 'start'), F(sr, 'seg0.end', 'end')
              + C(1990, sr, 'infobox year_end: 1990 (last constitution adopted)', 'The infobox closes its dates at the 1990 constitution.'),
              endEvent='fry-proclaimed'),
        phase('Republic of Serbia (in FR Yugoslavia)', F('Republic of Serbia (1992–2006)', 'seg0.start', 'start')
              + C(1990, 'Republic of Serbia (1992–2006)', 'infobox year_start: 1990 (constitution adopted)', 'The infobox opens its dates at the 1990 constitution.'),
              F('Republic of Serbia (1992–2006)', 'seg0.end', 'end'), startEvent='fry-proclaimed', endEvent='montenegro-independence'),
        phase('Republic of Serbia', F(srb, 'established_date9', 'start'), ongoing=G.ref(srb, 'infobox established_event9: Republic of Serbia, 2006 (current state)'),
              startEvent='montenegro-independence'),
    ], memberOf=[
        member('ottoman-empire', F('Principality of Serbia', 'year_start', 'start'),
               [{'year': 1878, 'source': lead('Principality of Serbia', 'recognized internationally in 1878')}],
               sources=[lead('Principality of Serbia', 'Ottoman official Marashli Pasha')], endEvent='congress-of-berlin'),
        member('yugoslavia', F(srb, 'established_date6', 'start'), F(srb, 'established_date8', 'start'),
               sources=[G.ref(srb, 'infobox established_event6: Kingdom of Yugoslavia, 1918'), G.ref(srb, 'infobox established_event7: Socialist Yugoslavia (constituent republic), 1945')],
               startEvent='yugoslavia-created', endEvent='fry-proclaimed'),
        member('serbia-and-montenegro', F(srb, 'established_date8', 'start'), F(srb, 'established_date9', 'start'),
               sources=[G.ref(srb, 'infobox established_event8: Serbia and Montenegro (constituent state), 1992')],
               startEvent='fry-proclaimed', endEvent='montenegro-independence'),
    ]))
    cro, kc, ndh, src_ = 'Croatia', 'Kingdom of Croatia (Habsburg)', 'Independent State of Croatia', 'Socialist Republic of Croatia'
    T.append(row('croatia', 'Croatia', '#c07a2a', 'southern-europe', 'Croatia',
                 # 1918–39 inside Yugoslavia with no government of its own: the lifespan carries it across
                 span_=span(stretch(None, C(700, 'Duchy of Croatia', 'infobox year_start: 7th/8th century', 'The infobox gives "7th/8th century"; 700 as in the Medieval World timeline.'), circa=True, ongoing=G.ref(cro, 'infobox established_event8: Declaration of independence, 25 June 1991 (current state)'))),
                 phases=[
        phase('Kingdom of Croatia (in union with Hungary)', F('Croatia in personal union with Hungary', 'year_start', 'start'),
              F('Croatia in personal union with Hungary', 'year_end', 'end'), endEvent='battle-of-mohacs'),
        phase('Kingdom of Croatia (Habsburg)', F(kc, 'year_start', 'start'), F(kc, 'year_end', 'end')),
        phase('Kingdom of Croatia-Slavonia', F('Kingdom of Croatia-Slavonia', 'year_start', 'start'), F('Kingdom of Croatia-Slavonia', 'year_end', 'end'),
              endEvent='dissolution-of-austria-hungary'),
        phase('Banovina of Croatia', F('Banovina of Croatia', 'year_start', 'start'), F('Banovina of Croatia', 'year_end', 'end'),
              endEvent='axis-invasion-yugoslavia'),
        phase('Independent State of Croatia (Axis puppet)', F(ndh, 'year_start', 'start'), F(ndh, 'year_end', 'end'), startEvent='axis-invasion-yugoslavia'),
        phase('Socialist Republic of Croatia', F(src_, 'year_start', 'start'), F(src_, 'year_end', 'end'), endEvent='croatia-independence'),
        phase('Republic of Croatia', F(cro, 'established_date8', 'start'), ongoing=G.ref(cro, 'infobox established_event8: Declaration of independence, 25 June 1991 (current state)'),
              startEvent='croatia-independence'),
    ], memberOf=[
        member('habsburg-monarchy', F(kc, 'year_start', 'start'), F('Kingdom of Croatia-Slavonia', 'year_end', 'end'),
               sources=[lead(kc, 'part of the lands of the Habsburg monarchy from 1527')], endEvent='dissolution-of-austria-hungary'),
        member('yugoslavia', F(cro, 'established_date6', 'start'), F(ndh, 'year_start', 'start'),
               sources=[G.ref(cro, 'infobox established_event6: Creation of Yugoslavia, 4 December 1918')],
               startEvent='yugoslavia-created', endEvent='axis-invasion-yugoslavia'),
        member('yugoslavia', F(src_, 'year_start', 'start'), F(cro, 'established_date8', 'start'),
               sources=[G.ref(cro, 'infobox established_event7: Socialist Republic of Croatia in Yugoslavia, 9 May 1944')],
               endEvent='croatia-independence'),
    ]))
    return T


def events():
    R = G.ref
    y = lambda t, n: E(t, n)[0]  # noqa: E731
    s = lambda t, n: E(t, n)[1]  # noqa: E731
    return [
        # France
        ev('bastille', 'Storming of the Bastille', 1789, ['france'], R('Storming of the Bastille', 'infobox date: 14 July 1789'), importance=1,
           descr='Parisians take the royal fortress-prison on 14 July: the Revolution reaches the streets.'),
        ev('monarchy-abolished', 'French monarchy abolished', y('French First Republic', 'start'), ['france'], s('French First Republic', 'start'),
           descr='The National Convention abolishes the monarchy on 21 September 1792 and proclaims the Republic.'),
        ev('napoleon-crowned', 'Coronation of Napoleon', 1804, ['france'], R('First French Empire', 'infobox: coronation, 2 December 1804')),
        ev('hundred-days', 'Hundred Days', 1815, ['france'], R('First French Empire', 'infobox life span: 20 March – 7 July 1815'),
           descr='Napoleon returns from Elba and rules again until Waterloo; months long, so shown as an event until dates can carry months.'),
        ev('july-revolution', 'July Revolution', 1830, ['france'], R('July Monarchy', 'infobox event_pre: July Revolution, 1830'), descr='Charles X is overthrown; Louis Philippe becomes King of the French.'),
        ev('algerian-war', 'Algerian War', 1954, ['france'], R('Algerian War', 'infobox date: 1954–1962'), end=1962),
        # German lands
        ev('hre-dissolved', 'Dissolution of the Holy Roman Empire', y('Holy Roman Empire', 'end'), ['hre', 'prussia'], s('Holy Roman Empire', 'end'), importance=1,
           descr='Francis II lays down the imperial crown on 6 August 1806.'),
        ev('gc-founded', 'German Confederation founded', y('German Confederation', 2), ['german-confederation', 'prussia'], s('German Confederation', 2),
           descr='The Congress of Vienna creates a league of 39 German states.'),
        ev('revolutions-1848', 'German revolutions of 1848–49', 1848, ['german-confederation', 'prussia'], R('German Confederation', 'infobox event4: German Revolutions, 13 March 1848'),
           end=1849, descr='The Frankfurt Parliament tries to unite Germany under a constitution and fails.'),
        ev('austro-prussian-war', 'Austro-Prussian War', y('German Confederation', 6), ['german-confederation', 'prussia'], s('German Confederation', 6), importance=1,
           descr='Prussia defeats Austria; the Peace of Prague dissolves the German Confederation.',
           links=[{'to': 'ngc-founded', 'kind': 'causes'}]),
        ev('ngc-founded', 'North German Confederation Treaty', y('North German Confederation', 'start'), ['germany', 'prussia'], s('North German Confederation', 'start')),
        ev('franco-prussian-war', 'Franco-Prussian War', 1870, ['france', 'germany', 'prussia'], R('Franco-Prussian War', 'infobox date: 19 July 1870 – 28 January 1871'),
           end=1871, importance=1, links=[{'to': 'german-empire-proclaimed', 'kind': 'causes'}]),
        ev('german-empire-proclaimed', 'German Empire proclaimed', y('German Empire', 'start'), ['germany'], s('German Empire', 'start'), importance=1,
           descr='Wilhelm I is proclaimed German Emperor at Versailles on 18 January 1871.'),
        ev('ww1', 'First World War', 1914, ['france', 'germany', 'serbia'], R('World War I', 'infobox date: 28 July 1914 – 11 November 1918'), end=1918, importance=1),
        ev('german-revolution', 'German Revolution', y('German Empire', 'end'), ['germany', 'prussia'], s('German Empire', 'end'),
           descr='Wilhelm II abdicates; a republic is proclaimed and the German monarchies fall.'),
        ev('ww2', 'Second World War', 1939, ['france', 'germany', 'yugoslavia'], R('World War II', 'infobox date: 1 September 1939 – 2 September 1945'), end=1945, importance=1),
        ev('berlin-wall', 'Berlin Wall', 1961, ['germany'], R('Berlin Wall', 'infobox: 13 August 1961 – 9 November 1989'), end=1989,
           descr='Built from 13 August 1961; opened on 9 November 1989.'),
        ev('reunification', 'German reunification', y('West Germany', 'end'), ['germany'], s('West Germany', 'end'), importance=1),
        # South Slavs
        ev('serbian-revolution', 'Serbian Revolution', 1804, ['serbia'], R('Revolutionary Serbia', 'infobox year_start: 1804'), end=1817,
           descr='Uprisings against Ottoman rule that end in an autonomous Principality of Serbia.'),
        ev('yugoslavia-created', 'Kingdom of Serbs, Croats and Slovenes created', y('Kingdom of Yugoslavia', 'start'), ['yugoslavia', 'serbia', 'croatia'],
           s('Kingdom of Yugoslavia', 'start'), importance=1, descr='Serbia and the South Slav lands of Austria-Hungary unite on 1 December 1918.'),
        ev('axis-invasion-yugoslavia', 'Axis invasion of Yugoslavia', y('Kingdom of Yugoslavia', 8), ['yugoslavia', 'serbia', 'croatia'], s('Kingdom of Yugoslavia', 8),
           descr='Germany, Italy and Hungary invade on 6 April 1941; the country is partitioned.'),
        ev('croatia-independence', 'Croatia declares independence', y('Socialist Republic of Croatia', 'end'), ['croatia', 'yugoslavia'], s('Socialist Republic of Croatia', 'end'), importance=1),
        ev('yugoslav-wars', 'Yugoslav Wars', y('Socialist Federal Republic of Yugoslavia', 9), ['yugoslavia', 'serbia', 'croatia', 'serbia-and-montenegro'],
           s('Socialist Federal Republic of Yugoslavia', 9), end=2001, descr='Wars of independence and ethnic conflict as Yugoslavia breaks up.'),
        ev('fry-proclaimed', 'Federal Republic of Yugoslavia proclaimed', y('Serbia and Montenegro', 'start'), ['yugoslavia', 'serbia-and-montenegro', 'serbia'],
           s('Socialist Federal Republic of Yugoslavia', 'end'), descr='Serbia and Montenegro form a new federation on 27 April 1992; the socialist federation is gone.'),
        ev('kosovo-war', 'Kosovo War', 1998, ['serbia-and-montenegro', 'serbia'], R('Serbia and Montenegro', 'infobox event2: Kosovo War, 1998–1999'), end=1999),
        ev('montenegro-independence', 'Montenegro independent; the State Union ends', y('Serbia and Montenegro', 'end'), ['serbia-and-montenegro', 'serbia'],
           s('Serbia and Montenegro', 'end'), descr='Montenegro leaves on 3 June 2006; Serbia declares itself the successor on 5 June.'),
    ]


def build(repo, module_names=None):
    module_names = module_names or MODULES
    data = {
        'schemaVersion': 7,  # v7 only adds Era.tracks; v6 data is valid v7
        'meta': {
            'id': 'modern-states', 'title': 'Modern States', 'subtitle': 'Every state in the world, 1500 to today',
            'description': 'States from 1500 to today: their governments as phases, unions as their own rows, and which union each state was part of when.',
            'credits': 'Dates from Wikipedia articles, read from the English Wikipedia dump of 1 November 2026; each date cites its infobox field.',
            'calendar': {'before': 'BCE', 'after': 'CE', 'yearZero': False, 'aliases': {'before': ['BC'], 'after': ['AD']}},
            'increments': [1, 5, 10, 25, 50], 'defaultIncrement': 10,
            'range': {'start': 1500, 'end': PRESENT},
            # set by the Medieval World session, which owns the continues links (relayed 2026-11-22)
            'continues': [{'timeline': 'medieval', 'at': 1500, 'side': 'before'}],
        },
        'present': PRESENT,
        'tracks': tracks(),
        'events': events(),
    }
    # region modules (one per pilot or wave), sharing this module's helpers; group rows first
    import importlib
    import groups
    me = sys.modules[__name__]
    modules = [importlib.import_module(n) for n in module_names]
    # a region module may add its own group rows (subregions) in GROUPS: [{'id', 'name', 'color', 'parent'}]
    extra_groups = [g for mod in modules for g in getattr(mod, 'GROUPS', [])]
    data['tracks'] = list(groups.GROUPS) + extra_groups + data['tracks']
    for mod in modules:
        data['tracks'] += mod.tracks(me)
        data['events'] += mod.events(me)
    for mod in modules:
        for e in data['events']:
            e['tracks'] += [t for t in mod.SHARED.get(e['uuid'], []) if t not in e['tracks']]
    # a module may add memberships to rows defined in other modules: extra_memberships(M) -> {row id: [member(...)]}
    by_id = {t['id']: t for t in data['tracks']}
    for mod in modules:
        if hasattr(mod, 'extra_memberships'):
            for rid, ms in mod.extra_memberships(me).items():
                by_id[rid].setdefault('memberOf', []).extend(ms)
    # then a module may adjust its memberships against every row's phases: link_phases(M, by_id)
    for mod in modules:
        if hasattr(mod, 'link_phases'):
            mod.link_phases(me, by_id)
    # golden ages and eras (pipelines/common/periods.py from periods.json): before the sources, which they cite; a
    # partial run (some modules) leaves them out, since their rows may be missing
    if tuple(module_names) == MODULES:
        import periods
        REPORT.append(f'periods: {periods.apply(data, "modern-states")}')
    data['sources'] = G.SOURCES
    data['tags'] = {'wikipedia': {'name': 'Wikipedia'}}
    full = tuple(module_names) == MODULES
    # reigns (pipelines/common/reigns.py): the frozen rulers pass, on a full run only (a partial run lacks their rows);
    # before the categories, so the classifier sees them
    if full:
        import reigns
        REPORT.append(f'reigns: {reigns.apply(data, os.path.join(HERE, "reigns.json"), os.path.join(repo, "data-src", "provenance", "modern-states-reigns.json"))}')
    # traditions with no founder (pipelines/common/traditions.py from traditions.json): rows, events and their sources,
    # after the sources are set and before the categories, which classify their events; a partial run leaves them out
    if tuple(module_names) == MODULES:
        import traditions
        REPORT.append(f'traditions: {traditions.apply(data, "modern-states")}')
    # event categories (pipelines/common/event_categories.py): the facet, each event's categories, and their evidence
    import event_categories
    REPORT.append(f'categories: {event_categories.apply(data, os.path.join(HERE, "categories.json"), os.path.join(repo, "data-src", "provenance", "modern-states-categories.json") if full else None)}')
    order = ['schemaVersion', 'meta', 'present', 'tracks', 'sources', 'tags', 'events']
    data = {k: data[k] for k in order}
    out = os.path.join(repo, 'data-src', 'modern-states.json')
    json.dump(data, open(out, 'w'), indent=2, ensure_ascii=False)
    write_manifest(data, module_names, os.path.join(repo, 'data-src', 'provenance', 'modern-states.json') if full
                   else os.path.join(OUT, f'provenance-modern-states-{module_names[-1]}.json'))
    os.makedirs(OUT, exist_ok=True)
    rep = 'gen_modern-report.txt' if full else f'gen_modern-report-{module_names[-1]}.txt'
    open(os.path.join(OUT, rep), 'w').write('\n'.join(REPORT) + '\n')
    print('\n'.join(REPORT))
    print(f'wrote {out}: {len(data["tracks"])} tracks, {len(data["events"])} events, {len(G.SOURCES)} sources')


def write_manifest(data, module_names, path):
    """Provenance manifest (Kevin, 2026-11-21: re-check every page and field against later monthly dumps).
    One entry per cited article: its title, URL and every location (infobox field or lead sentence) the timeline
    cites, with which dump the values were read from. No timestamp, so it changes only when the data does; one
    source per line, so a diff shows which articles changed."""
    import wp_dump
    locs = {}

    def walk(x):
        if isinstance(x, dict):
            if 'sourceKey' in x and 'sourceLocation' in x:
                locs.setdefault(x['sourceKey'], set()).add(x['sourceLocation'])
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(data['tracks'])
    walk(data['events'])
    man = {
        'timeline': data['meta']['id'],
        'dump': os.path.basename(wp_dump.DUMP),
        'generator': 'gen_modern.py',
        'modules': list(module_names),
        'note': 'Every value is re-derivable: run gen_modern.py against a new dump and diff. Hand claims (C(), L(), notes) '
                'live in the modules as data; a lead or section sentence is matched by its quoted text.',
        'sources': {k: {'title': v['name'].removesuffix(' (Wikipedia)'), 'url': v['url'], 'locations': sorted(locs.get(k, []))}
                    for k, v in sorted(G.SOURCES.items())},
    }
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sources = man.pop('sources')
    head = json.dumps(man, indent=1, ensure_ascii=False)[:-2]
    lines = [f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in sources.items()]
    open(path, 'w').write(head + ',\n "sources": {\n' + ',\n'.join(lines) + '\n }\n}\n')


# Region modules in build order. A wave agent runs: gen_modern.py <its worktree> colonial,europe,...,<its module>
OUT = os.path.join(PIPELINES, 'out')
MODULES = ('colonial', 'europe', 'post_soviet', 'south_asia', 'mena', 'east_asia', 'americas', 'africa_west', 'africa_east', 'oceania', 'unit7', 'blocs')

if __name__ == '__main__':
    repo = ARGS[0] if ARGS else os.path.dirname(PIPELINES)
    build(repo, tuple(ARGS[1].split(',')) if len(ARGS) > 1 else MODULES)
