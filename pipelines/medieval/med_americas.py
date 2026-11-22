"""
Wave 8 of the Medieval World timeline: the Americas. Uses med_europe's helpers and event registry (med_europe.build
must run first); see med_europe's docstring for how rows, events, regions and the 1500 seam work.

The Aztec Empire is the Triple Alliance, a union row; Tenochtitlan, Tetzcoco and Tlacopan are its members 1428-1521.
`inca-empire` (Modern States' id) carries the Kingdom of Cusco and the Inca Empire as phases. Archaeological cultures
without an infobox are dated from their lead sentence when it gives both ends (Sican, Fremont, Plaquemine).
Rows from Ancient and Classical copied unchanged: dorset, hohokam, teotihuacan, zapotec, tikal, calakmul, copan,
palenque, cueva-manos, moche, nazca, wari, tiwanaku. Group ids follow Ancient's (americas, arctic, north-america,
mesoamerica, south-america).
Left out (their articles give no end year): Chichén Itzá, Cahokia and the Mississippian culture, the Ancestral
Puebloans, the Thule, the Taíno, the Mixtecs, the Chachapoya.
"""
import json
import os

import med_europe as X

X.TITLES.update({
    ('Aztec Empire', 'start'): 'Triple Alliance formed',
    ('Aztec Empire', 'end'): 'Spanish conquest of the Aztec Empire',
    ('Inca Empire', 'start'): 'Pachacuti creates Tawantinsuyu',
})
X.ALIAS.update({
    'formation of the aztec empire': 'triple alliance formed',
    # Kevin (2026-11-21): one event, not two
    'destruction due to the spanish conquest of mexico': 'spanish conquest of the aztec empire',
})


def sec(title, needle, year=None):
    """Ref for the opening sentence of a section containing `needle`; checks it names `year`."""
    for o in X.G.art(title)['body'].get('section_openers', []):
        if needle in o['text']:
            if year is not None and str(year) not in o['text']:
                raise SystemExit(f'{title}: section sentence with {needle!r} has no {year}')
            return X.G.ref(title, f'section "{o["section"]}": "{o["text"][:180]}"')
    raise SystemExit(f'{title}: no section opener with {needle!r}')


def c(year, ref, note=None, margin=None):
    x = {'year': year, 'source': ref}
    if margin:
        x['margin'] = margin
    if note:
        x['note'] = note
    return [x]


def open_end(last, range_end=1500):
    """The open-end rule (Kevin, 2026-11-21): the last cited mention is the best end, and an uncited claim
    at the range end lets the bar fade there. Never ongoing."""
    return [{'year': range_end, 'note': f'No record after {last} in the article; the end fades to the range end ({range_end}).'}]
X.KEY.update({'triple-alliance-formed', 'spanish-conquest-of-the-aztec-empire', 'pachacuti-creates-tawantinsuyu'})


def build(mod, repo):
    M, G = mod, mod.G
    S, P, on = X.S, X.P, X.on
    anc = json.load(open(os.path.join(repo, 'public', 'timelines', 'ancient-classical.json')))
    R = [{'id': 'americas', 'name': 'The Americas', 'color': '#3a8a5a'}]

    def row(id_, name, parent, title, region, color, **kw):
        t = M.row(id_, name, color, parent, title, regions=[M.region(region, X.capital(title))], **kw)
        R.append(t)
        return t

    def grp(id_, name, color):
        R.append({'id': id_, 'name': name, 'color': color, 'parent': 'americas'})

    def simple(id_, name, parent, title, region, color, **kw):
        return row(id_, name, parent, title, region, color, span=S(title, track=id_, **kw))

    def from_lead(id_, name, parent, title, region, color, needle, start, end):
        return row(id_, name, parent, title, region, color, span=M.stretch(M.L(start, title, needle), M.L(end, title, needle), circa=True))

    # ----- North America and the Arctic -----
    grp('north-america', 'North America and the Arctic', '#5a7a3a')
    for id_ in ('dorset', 'hohokam'):
        R.append(X.ancient_row(anc, id_, 'north-america'))
    from_lead('fremont-culture', 'Fremont culture', 'north-america', 'Fremont culture', 'oasisamerica', '#8a6a3a', 'from AD 1 to 1301', 1, 1301)
    from_lead('plaquemine-culture', 'Plaquemine culture', 'north-america', 'Plaquemine culture', 'eastern-woodlands', '#5a8a6a', 'circa 1200 to 1700 CE', 1200, 1700)

    # ----- Mesoamerica -----
    grp('mesoamerica', 'Mesoamerica', '#a8603a')
    for id_ in ('teotihuacan', 'zapotec', 'tikal', 'calakmul', 'copan', 'palenque'):
        R.append(X.ancient_row(anc, id_, 'mesoamerica'))
    simple('toltec-empire', 'Toltec Empire', 'mesoamerica', 'Toltec Empire', 'mesoamerica', '#8a5a7a')
    simple('league-of-mayapan', 'League of Mayapan', 'mesoamerica', 'League of Mayapan', 'maya-region', '#3a7a5a')
    simple('kiche-kingdom-of-qumarkaj', 'Kʼicheʼ kingdom of Qʼumarkaj', 'mesoamerica', 'Kʼicheʼ kingdom of Qʼumarkaj', 'maya-region', '#5a8a3a')
    simple('purepecha-empire', 'Purépecha (Tarascan) Empire', 'mesoamerica', 'Tarascan state', 'mesoamerica', '#7a3a3a')
    simple('tlaxcala-nahua-state', 'Tlaxcala', 'mesoamerica', 'Tlaxcala (Nahua state)', 'mesoamerica', '#c08a3a')
    az = 'Aztec Empire'
    row('aztec-empire', 'Aztec Empire (Triple Alliance)', 'mesoamerica', az, 'mesoamerica', '#2a8a7a', span=S(az, track='aztec-empire'))
    asc, aec = M.F(az, 'year_start', 'start'), M.F(az, 'year_end', 'end')
    a_start, a_end = R[-1]['span'].get('startEvent'), X.event(az, 'end', 'aztec-empire', force=True)
    union_src = [X.infobox_event(az, 'start')[2]]
    for id_, name, title, color in (('tenochtitlan', 'Tenochtitlan', 'Tenochtitlan', '#3a6aa8'),
                                    ('tetzcoco', 'Tetzcoco', 'Tetzcoco (altepetl)', '#6a8aa8'),
                                    ('tlacopan', 'Tlacopan', 'Tlacopan', '#8a8aa8')):
        simple(id_, name, 'mesoamerica', title, 'mesoamerica', color)
        R[-1]['memberOf'] = [M.member('aztec-empire', asc, aec, sources=union_src,
                                      startEvent=on(a_start, id_), endEvent=on(a_end, id_))]

    # ----- South America -----
    grp('south-america', 'South America', '#3a6a8a')
    for id_ in ('cueva-manos', 'moche', 'nazca', 'wari', 'tiwanaku'):
        R.append(X.ancient_row(anc, id_, 'south-america'))
    from_lead('sican-culture', 'Sican culture (Lambayeque)', 'south-america', 'Sican culture', 'andes', '#c0a03a', 'between about 750 and 1375 CE', 750, 1375)
    simple('chimor', 'Chimor (Chimú)', 'south-america', 'Chimor', 'andes', '#8a3a5a')
    simple('muisca-confederation', 'Muisca Confederation', 'south-america', 'Muisca Confederations (political units)', 'andes', '#5a5a3a')
    row('inca-empire', 'Inca Empire', 'south-america', 'Inca Empire', 'andes', '#c0302a', phases=X.link_phases([
        P('Kingdom of Cusco', 'Kingdom of Cusco', track='inca-empire'),
        P('Inca Empire (Tawantinsuyu)', 'Inca Empire', track='inca-empire',
          ec=M.F('Inca Empire', 'year_end', 'end') + X.claim(1572, 'Inca Empire', 'infobox year_end: 1533/1572', 'The infobox gives 1533 or 1572.')),
    ]))

    X.EVENTS[X.find('Foundation', 1325)]['title'] = 'Tenochtitlan founded'
    # ----- Kevin (2026-11-21): the cultures left out of wave 8, with uncertain ends -----
    def culture(id_, name, parent, title, region, color, sc, ec, events=()):
        t = M.row(id_, name, color, parent, title, regions=[M.region(region, X.capital(title))],
                  span=M.stretch(sc, ec, circa=True))
        idx = max(i for i, x in enumerate(R) if x['id'] == parent or x.get('parent') == parent)
        R.insert(idx + 1, t)
        for uuid, etitle, y, ref in events:
            X.register(M.ev(uuid, etitle, [y], [id_], [ref], circa=True))
        return t

    ci = 'Chichen Itza'
    culture('chichen-itza', 'Chichén Itzá', 'mesoamerica', ci, 'maya-region', '#c09a5a',
            M.L(600, ci, 'Late Classic (c. 600–900 AD)'),
            M.L(1200, ci, 'Late Classic (c. 600–900 AD)', 'Last dated: the early Postclassic, c. 900–1200 AD.') + open_end(1200))
    mx = 'Mixtec culture'
    mx_lead = M.lead(mx, 'Middle Preclassic period')
    culture('mixtec-culture', 'Mixtecs', 'mesoamerica', mx, 'mesoamerica', '#8a5a3a',
            c(-1149, mx_lead, 'The lead: "Middle Preclassic period (12th century BC – 10th century BC)".', 50),
            c(1520, mx_lead, 'The lead: "ended with the Spanish conquest in the first decades of the 16th century".', 10))
    ms, ca = 'Mississippian culture', 'Cahokia'
    culture('mississippian-culture', 'Mississippian culture (Cahokia)', 'north-america', ms, 'eastern-woodlands', '#7a5a3a',
            M.L(1000, ca, 'beginning around 1000 AD'), M.L(1600, ms, 'The Late Mississippian period (1400–1600)'),
            events=[('cahokia-founded', 'Cahokia founded', 1050, M.lead(ms, 'Founded in 1050', 1050)),
                    ('cahokia-at-its-peak', 'Cahokia at its peak', 1124, M.lead(ms, 'at its peak around 1124', 1124)),
                    ('exodus-from-cahokia', 'Exodus of half the Cahokians', 1275, M.lead(ms, 'exodus of some 50%', 1275))])
    ap = 'Ancestral Puebloans'
    culture('ancestral-puebloans', 'Ancestral Puebloans', 'north-america', ap, 'oasisamerica', '#a87a4a',
            c(-1149, M.lead(ap, 'around the 12th century BCE'), 'The lead: "emergence around the 12th century BCE".', 50),
            c(1350, sec(ap, 'from about 900 to 1350', 1350), 'Last dated: the Pueblo II and III eras, about 900 to 1350.') + open_end(1350))
    tp = 'Thule people'
    tl = M.lead(tp, 'Little Ice Age', 1650)
    culture('thule-people', 'Thule', 'north-america', tp, 'na-arctic', '#5a8aa8',
            M.L(1000, tp, 'by 1000 CE'),
            c(1650, tl, 'The communities broke apart during the Little Ice Age (1650–1850).') + c(1850, tl, 'The Little Ice Age ends in 1850.'))
    ta = 'Taíno'
    culture('taino', 'Taíno', 'north-america', ta, 'caribbean', '#3a8a8a',
            c(850, sec(ta, '8th- to 10th'), 'An "8th- to 10th–century \"ancient Taíno\"" woman (DNA studies).', 50),
            c(1514, sec(ta, 'Census records from 1514', 1514), 'Last dated mention in the article; Modern States carries the row on.'))
    cc = 'Chachapoya culture'
    ch = sec(cc, 'started around the year 800', 1470)
    culture('chachapoya-culture', 'Chachapoya', 'south-america', cc, 'andes', '#6a7a4a',
            c(800, ch), c(1470, ch, 'Conquered by the Inca in about 1470.') + c(1550, ch, 'Some elements continued until the Spanish conquest of the Inca "in the 1500s".', 50))

    X.modern_sync(R)
    for u in X.KEY:
        if u in X.EVENTS:
            X.EVENTS[u]['importance'] = 1
    return R
