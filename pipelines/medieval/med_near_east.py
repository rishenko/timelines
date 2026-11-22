"""
Wave 2 of the Medieval World timeline: the Near East and North Africa. Uses med_europe's helpers and event registry
(med_europe.build must run first): phases and lifespans cite infobox fields, infobox events from 650-1500 become
cited events, the union-event rule applies, region memberships cite the infobox capital, and rows crossing 1500 take
Modern States' phases and typed lifespans (med_europe.modern_sync, from their committed build).

Rows from Ancient and Classical copied unchanged: makuria, alodia (Nubia), sasanian, garamantes.
Morocco follows Modern States' id rule (today's state, older governments as phases): its infobox lists the Idrisid,
Almoravid, Almohad, Marinid and Wattasid dynasties with their start years; each phase's end comes from its own article.
"""
import json
import os

import med_europe as X

X.ALIAS.update({
    'established by saladin': 'saladin abolishes the fatimid caliphate',
    'overthrown by the fatimids': 'fatimids overthrow the aghlabids',
    'fatimid conquest': 'fatimid conquest of egypt and foundation of cairo',
    'conquest of constantinople': 'fall of constantinople',
})
X.TITLES.update({
    ('Fatimid Caliphate', 'end'): 'Saladin abolishes the Fatimid Caliphate',
    ('Fatimid Caliphate', 'start'): 'Fatimids overthrow the Aghlabids',
    ('Ottoman Empire', 'start'): 'Ottoman state founded',
    ('Kingdom of Georgia', 'start'): 'Unification of Georgia',
    ('Kingdom of Georgia', 'end'): 'Collapse of the Kingdom of Georgia',
    ('Mamluk Sultanate', 'start'): 'Murder of Turanshah; the Mamluks take power',
    ('Principality of Antioch', 'start'): 'Principality of Antioch founded (First Crusade)',
    ('Qarmatians', 'end'): 'Qarmatians overthrown',
    ('Ikhshidid dynasty', 'end'): 'Fatimid conquest of Egypt and foundation of Cairo',
    ('Kingdom of Georgia', 'event2'): 'Georgian interregnum',
    ('Kingdom of Georgia', 'event3'): 'Georgia divided into east and west',
    ('Kingdom of Georgia', 'event4'): 'Reunification of Georgia',
    ('Ottoman Empire', 'event1'): 'Ottoman Interregnum',
    ('Aq Qoyunlu', 'event3'): 'Reunification of the Aq Qoyunlu',
    ('Armenian Kingdom of Cilicia', 'event2'): 'Cilicia becomes tributary to the Mongols',
    ('Ghaznavids', 'event2'): 'Ghaznavid campaigns in India',
    ('Ghaznavids', 'event4'): 'Ghaznavid campaigns in Persia',
})
X.KEY.update({'battle-of-manzikert', 'ottoman-state-founded', 'saladin-abolishes-the-fatimid-caliphate', 'battle-of-hattin',
              'siege-of-jerusalem', 'murder-of-turanshah-the-mamluks-take-power', 'battle-of-ain-jalut'})


def build(mod, repo):
    M, G = mod, mod.G
    P, S, event, on, claim, ie = X.P, X.S, X.event, X.on, X.claim, X.infobox_event
    anc = json.load(open(os.path.join(repo, 'public', 'timelines', 'ancient-classical.json')))
    R = []

    def row(id_, name, parent, title, region, color, **kw):
        t = M.row(id_, name, color, parent, title, regions=[M.region(region, X.capital(title))], **kw)
        R.append(t)
        return t

    def grp(id_, name, color):
        R.append({'id': id_, 'name': name, 'color': color, 'parent': 'near-east'})

    R.append(M.PILOT_ROWS['caliphate'])

    # ----- Egypt and Nubia -----
    grp('egypt', 'Egypt and Nubia', '#b08a3a')
    for id_, name, title in (('tulunids', 'Tulunids', 'Tulunid dynasty'), ('ikhshidid-dynasty', 'Ikhshidids', 'Ikhshidid dynasty'),
                             ('fatimid-caliphate', 'Fatimid Caliphate', 'Fatimid Caliphate'), ('ayyubid-dynasty', 'Ayyubids', 'Ayyubid Sultanate'),
                             ('mamluk-sultanate', 'Mamluk Sultanate', 'Mamluk Sultanate')):
        row(id_, name, 'egypt', title, 'nile', {'tulunids': '#8a6a2a', 'ikhshidid-dynasty': '#7a7a3a', 'fatimid-caliphate': '#2a8a4a',
                                               'ayyubid-dynasty': '#c09a2a', 'mamluk-sultanate': '#a85a2a'}[id_], span=S(title, track=id_))
    u = X.find('Ottoman conquest of Cairo', 1517)
    if u:
        on(u, 'caliphate')
        M.PILOT_ROWS['caliphate']['phases'][-1]['endEvent'] = u
    for id_ in ('makuria', 'alodia'):
        R.append(X.ancient_row(anc, id_, 'egypt'))

    # ----- Levant -----
    grp('levant', 'Levant and the Crusader states', '#6a8a3a')
    kj = 'Kingdom of Jerusalem'
    row('kingdom-of-jerusalem', 'Kingdom of Jerusalem', 'levant', kj, 'levant', '#c0c0c0',
        span=[S(kj, 'seg0.start', 'seg0.end', 'kingdom-of-jerusalem'), S(kj, 'seg1.start', 'seg1.end', 'kingdom-of-jerusalem')])
    for id_, name, title, color in (('principality-of-antioch', 'Principality of Antioch', 'Principality of Antioch', '#8a8a9a'),
                                    ('county-of-edessa', 'County of Edessa', 'County of Edessa', '#7a7a8a'),
                                    ('county-of-tripoli', 'County of Tripoli', 'County of Tripoli', '#9a9aaa'),
                                    ('zengid-dynasty', 'Zengids', 'Zengid dynasty', '#4a7a3a'),
                                    ('hamdanid-dynasty', 'Hamdanids', 'Hamdanid dynasty', '#5a6a2a')):
        row(id_, name, 'levant', title, 'mesopotamia' if id_ == 'hamdanid-dynasty' else 'levant', color, span=S(title, track=id_))

    # ----- Anatolia and the Caucasus -----
    grp('anatolia', 'Anatolia and the Caucasus', '#8a4a3a')
    row('sultanate-of-rum', 'Sultanate of Rum', 'anatolia', 'Sultanate of Rum', 'anatolia', '#3a7a6a', span=S('Sultanate of Rum', track='sultanate-of-rum'))
    row('ottoman-empire', 'Ottoman Empire', 'anatolia', 'Ottoman Empire', 'anatolia', '#a82a2a',
        span=S('Ottoman Empire', 'seg0.start', 'seg0.end', 'ottoman-empire', circa=True))
    on('fall-of-constantinople', 'ottoman-empire')
    row('armenian-kingdom-of-cilicia', 'Armenian Kingdom of Cilicia', 'anatolia', 'Armenian Kingdom of Cilicia', 'anatolia', '#c0602a',
        span=S('Armenian Kingdom of Cilicia', track='armenian-kingdom-of-cilicia'))
    kg = 'Kingdom of Georgia'
    row('georgia', 'Georgia', 'anatolia', kg, 'caucasus', '#a83a3a', phases=[
        P('Kingdom of Georgia', kg, 'year_start', 'seg0.end', 'georgia', circa=True,
          ec=M.F(kg, 'seg0.end', 'end') + claim(1463, kg, 'infobox year_end: 1463 / 1490', 'The infobox gives 1463 (de facto) and 1490 (de jure).')),
    ])
    row('armenia', 'Armenia', 'anatolia', 'Bagratid Armenia', 'caucasus', '#d07a2a', phases=[P('Bagratid Armenia', 'Bagratid Armenia', track='armenia')])

    # ----- Iran and Iraq -----
    grp('iran-iraq', 'Iran and Iraq', '#a84a2a')  # group id: 'iran' is Modern States' state row
    R.append(X.ancient_row(anc, 'sasanian', 'iran-iraq'))
    on('conquest-of-persia', 'sasanian')
    for id_, name, title, region, color in (
            ('tahirid-dynasty', 'Tahirids', 'Tahirid dynasty', 'iranian-plateau', '#6a4a2a'),
            ('samanid-empire', 'Samanid Empire', 'Samanid Empire', 'central-asia', '#3a6a9a'),
            ('saffarid-dynasty', 'Saffarids', 'Saffarid dynasty', 'iranian-plateau', '#9a4a3a'),
            ('buyid-dynasty', 'Buyids', 'Buyid dynasty', 'mesopotamia', '#4a8a7a'),
            ('ghaznavid-empire', 'Ghaznavid Empire', 'Ghaznavids', 'iranian-plateau', '#7a3a7a'),
            ('seljuk-empire', 'Seljuk Empire', 'Seljuk Empire', 'iranian-plateau', '#2a6a5a')):
        row(id_, name, 'iran-iraq', title, region, color, span=S(title, track=id_))
    il = 'Ilkhanate'
    row('ilkhanate', 'Ilkhanate', 'iran-iraq', il, 'iranian-plateau', '#5a5a9a', span=S(il, 'seg0.start', 'seg0.end', 'ilkhanate'),
        memberOf=[M.member('mongol-empire', M.F(il, 'seg0.start', 'start'), M.L(1259, il, 'after his brother Möngke Khan died'),
                           sources=[M.lead(il, 'after his brother Möngke Khan died', 1259)], endEvent=on('mongke-dies', 'ilkhanate'))])
    on('siege-of-baghdad', 'ilkhanate')
    for id_, name, title, region, color in (
            ('jalayirid-sultanate', 'Jalayirids', 'Jalayirid Sultanate', 'mesopotamia', '#6a7a3a'),
            ('qara-qoyunlu', 'Qara Qoyunlu', 'Qara Qoyunlu', 'iranian-plateau', '#2a2a5a'),
            ('aq-qoyunlu', 'Aq Qoyunlu', 'Aq Qoyunlu', 'iranian-plateau', '#c0c0a0'),
            ('timurid-empire', 'Timurid Empire', 'Timurid Empire', 'central-asia', '#3a8a8a')):
        row(id_, name, 'iran-iraq', title, region, color, span=S(title, track=id_))

    # ----- Arabia -----
    grp('arabia', 'Arabia', '#c09a4a')
    row('qarmatians', 'Qarmatians', 'arabia', 'Qarmatians', 'arabia', '#7a5a3a', span=S('Qarmatians', track='qarmatians'))
    row('rasulid-dynasty', 'Rasulids (Yemen)', 'arabia', 'Rasulid dynasty', 'arabia', '#2a7a7a', span=S('Rasulid dynasty', track='rasulid-dynasty'))

    # ----- The Maghreb -----
    grp('maghreb', 'The Maghreb', '#8a5a3a')
    R.append(X.ancient_row(anc, 'garamantes', 'maghreb'))
    for id_, name, title, color in (('rustamid-dynasty', 'Rustamids', 'Rustamid dynasty', '#6a8a5a'),
                                    ('aghlabid-dynasty', 'Aghlabids', 'Aghlabid dynasty', '#8a7a2a')):
        row(id_, name, 'maghreb', title, 'north-africa', color, span=S(title, track=id_))
    mo = 'Morocco'

    def mphase(name, title, n):
        y, _, ref = ie(mo, f'established_event{n}')
        return P(name, title, track='morocco', sc=[{'year': y[0], 'source': ref}] + M.F(title, 'year_start', 'start'))
    row('morocco', 'Morocco', 'maghreb', 'Morocco', 'north-africa', '#a8302a', phases=X.link_phases([
        mphase('Idrisid dynasty', 'Idrisid dynasty', 2),
        mphase('Almoravid dynasty', 'Almoravid dynasty', 3),
        mphase('Almohad Caliphate', 'Almohad Caliphate', 4),
        mphase('Marinid Sultanate', 'Marinid dynasty', 5),
        mphase('Wattasid dynasty', 'Wattasid dynasty', 6),
    ]))
    row('zirid-dynasty', 'Zirids', 'maghreb', 'Zirid dynasty', 'north-africa', '#4a6a8a', span=S('Zirid dynasty', track='zirid-dynasty'))
    row('hafsid-tunisia', 'Hafsids (Tunisia)', 'maghreb', 'Hafsid dynasty', 'north-africa', '#c0702a', span=S('Hafsid dynasty', track='hafsid-tunisia'))
    row('zayyanid-tlemcen', 'Zayyanids (Tlemcen)', 'maghreb', 'Kingdom of Tlemcen', 'north-africa', '#5a3a6a',
        span=S('Kingdom of Tlemcen', track='zayyanid-tlemcen'))

    # Second dates the articles give
    rows = {t['id']: t for t in R}
    rows['zengid-dynasty']['span']['endDates'] += claim(1250, 'Zengid dynasty', 'infobox year_end: 1174 / (with nominal power until 1250)', 'Nominal power until 1250.')
    rows['aq-qoyunlu']['span']['startDates'] += claim(1378, 'Aq Qoyunlu', 'infobox life span: 1378–1508', 'The infobox life span starts in 1378.')
    rows['aq-qoyunlu']['span']['endDates'] += claim(1508, 'Aq Qoyunlu', 'infobox life span: 1378–1508', 'The infobox life span ends in 1508.')
    X.modern_sync(R)
    for u in X.KEY:
        if u in X.EVENTS:
            X.EVENTS[u]['importance'] = 1
    return R
