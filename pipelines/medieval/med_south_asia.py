"""
Wave 4 of the Medieval World timeline: South Asia. Uses med_europe's helpers and event registry (med_europe.build must
run first); see med_europe's docstring for how rows, events, regions and the 1500 seam work.

Rows from Ancient and Classical copied unchanged: alchon, pallava, anuradhapura.
The Delhi Sultanate carries its five dynasties as phases (each from its own article). Sri Lanka follows Modern States'
id rule: the Sinhalese kingdom's later capitals (Polonnaruwa, Dambadeniya, Gampola, Kotte) are phases of `sri-lanka`;
Ancient's Anuradhapura row stays its own row. Nepal's Malla dynasty is a phase of `nepal`.
Left out: the Kingdom of Kandy (its article carries an AI-generated-text flag); the Eastern Gangas' Khemundi branch
(1436-1947, a later minor line).
"""
import json
import os

import med_europe as X

X.TITLES.update({
    ('Kakatiya dynasty', 'end'): 'Siege of Warangal; end of the Kakatiyas',
    ('Bengal Sultanate', 'start'): 'Unification of Bengal',
    ('Ahom kingdom', 'start'): 'Ahom kingdom established by Sukapha',
    ('Kashmir Sultanate', 'start'): 'Conversion of Rinchan Shah',
    ('Vijayanagara Empire', 'event1'): 'Earliest records of Vijayanagara',
    ('Khandesh Sultanate', 'event1'): "Gujarat Sultanate's campaign in Khandesh",
    ('Berar Sultanate', 'start'): 'Berar Sultanate declares independence',
    ('Eastern Ganga dynasty', 'event2'): 'Malwese invasion of the Eastern Ganga realm',
    ('Eastern Ganga dynasty', 'event3'): 'Sharqi invasions of the Eastern Ganga realm',
})
X.ALIAS.update({"muzaffar shah's invasion of malwa": 'invasion of malwa'})
RENAME = [('Empire at its greatest extent', 1030, 'Chola Empire at its greatest extent'),
          ('Invasion of Malwa', 1407, "Muzaffar Shah's invasion of Malwa")]
X.KEY.update({'first-battle-of-tarain', 'second-battle-of-tarain', 'first-battle-of-panipat', 'battle-of-talikota'})


def build(mod, repo):
    M, G = mod, mod.G
    S, P, on = X.S, X.P, X.on
    anc = json.load(open(os.path.join(repo, 'public', 'timelines', 'ancient-classical.json')))
    R = [{'id': 'south-asia', 'name': 'South Asia', 'color': '#c0702a'}]

    def row(id_, name, parent, title, region, color, **kw):
        t = M.row(id_, name, color, parent, title, regions=[M.region(region, X.capital(title))], **kw)
        R.append(t)
        return t

    def grp(id_, name, color):
        R.append({'id': id_, 'name': name, 'color': color, 'parent': 'south-asia'})

    def simple(id_, name, parent, title, region, color, **kw):
        return row(id_, name, parent, title, region, color, span=S(title, track=id_, **kw))

    def stretches(id_, name, parent, title, region, color, n):
        return row(id_, name, parent, title, region, color,
                   span=[S(title, f'seg{i}.start', f'seg{i}.end', id_) for i in range(n)])

    # ----- The northwest, Kashmir and the Himalaya -----
    grp('northwest-india', 'The northwest, Kashmir and Nepal', '#7a6a9a')
    R.append(X.ancient_row(anc, 'alchon', 'northwest-india'))
    simple('karkota-dynasty', 'Karkota dynasty (Kashmir)', 'northwest-india', 'Karkota dynasty', 'south-asia', '#5a7aa8')
    simple('utpala-dynasty', 'Utpala dynasty (Kashmir)', 'northwest-india', 'Utpala dynasty', 'south-asia', '#4a6a98')
    simple('lohara-dynasty', 'Lohara dynasty (Kashmir)', 'northwest-india', 'Lohara dynasty', 'south-asia', '#3a5a88')
    stretches('kashmir-sultanate', 'Kashmir Sultanate', 'northwest-india', 'Kashmir Sultanate', 'south-asia', '#2a7a5a', 2)
    simple('hindu-shahis', 'Hindu Shahis', 'northwest-india', 'Hindu Shahis', 'gandhara', '#a86a3a')
    simple('ghurid-dynasty', 'Ghurids', 'northwest-india', 'Ghurid dynasty', 'iranian-plateau', '#6a8a3a')
    simple('langah-sultanate', 'Langah Sultanate (Multan)', 'northwest-india', 'Langah Sultanate', 'indus-valley', '#8a7a4a')
    row('nepal', 'Nepal', 'northwest-india', 'Malla dynasty (Nepal)', 'south-asia', '#c03a4a',
        phases=[P('Malla dynasty', 'Malla dynasty (Nepal)', track='nepal')])

    # ----- Northern India -----
    grp('north-india', 'Northern India', '#c08a3a')
    simple('pratihara-dynasty', 'Gurjara-Pratiharas', 'north-india', 'Gurjara-Pratihara dynasty', 'gangetic-plain', '#a8603a')
    simple('chandela-empire', 'Chandelas', 'north-india', 'Chandela dynasty', 'gangetic-plain', '#8a5a7a')
    simple('paramara-dynasty', 'Paramaras', 'north-india', 'Paramara dynasty', 'deccan', '#6a5a3a')
    ds = 'delhi-sultanate'
    row(ds, 'Delhi Sultanate', 'north-india', 'Delhi Sultanate', 'gangetic-plain', '#2a6a3a', phases=X.link_phases([
        P('Mamluk dynasty', 'Mamluk dynasty (Delhi)', track=ds),
        P('Khalji dynasty', 'Khalji dynasty', track=ds),
        P('Tughlaq dynasty', 'Tughlaq dynasty', track=ds),
        P('Sayyid dynasty', 'Sayyid dynasty', track=ds),
        P('Lodi dynasty', 'Lodi dynasty', track=ds),
    ]))
    X.all_events('Delhi Sultanate', ds)
    simple('jaunpur-sultanate', 'Jaunpur Sultanate', 'north-india', 'Jaunpur Sultanate', 'gangetic-plain', '#5a8a8a')
    simple('malwa-sultanate', 'Malwa Sultanate', 'north-india', 'Malwa Sultanate', 'deccan', '#7a8a3a')
    simple('gujarat-sultanate', 'Gujarat Sultanate', 'north-india', 'Gujarat Sultanate', 'indus-valley', '#3a8a5a')
    stretches('mewar', 'Mewar', 'north-india', 'Kingdom of Mewar', 'indus-valley', '#c0502a', 2)

    # ----- The Deccan -----
    grp('deccan-group', 'The Deccan', '#8a6a4a')
    simple('rashtrakuta-empire', 'Rashtrakutas', 'deccan-group', 'Rashtrakuta dynasty', 'deccan', '#a84a4a')
    simple('eastern-chalukyas', 'Eastern Chalukyas', 'deccan-group', 'Eastern Chalukyas', 'deccan', '#8a7a5a')
    simple('western-chalukya-empire', 'Western Chalukyas', 'deccan-group', 'Western Chalukya Empire', 'deccan', '#6a7a5a')
    simple('seuna-dynasty', 'Seunas (Yadavas)', 'deccan-group', 'Seuna (Yadava) dynasty', 'deccan', '#9a6a2a')
    simple('kakatiya-dynasty', 'Kakatiyas', 'deccan-group', 'Kakatiya dynasty', 'deccan', '#4a7a6a')
    simple('bahmani-sultanate', 'Bahmani Sultanate', 'deccan-group', 'Bahmani Sultanate', 'deccan', '#2a5a4a')
    simple('khandesh-sultanate', 'Khandesh Sultanate (Farooqui)', 'deccan-group', 'Khandesh Sultanate', 'deccan', '#5a6a8a')
    for id_, name, title, color in (('ahmadnagar-sultanate', 'Ahmadnagar Sultanate', 'Ahmadnagar Sultanate', '#3a7a8a'),
                                    ('bijapur-sultanate', 'Bijapur Sultanate', 'Bijapur Sultanate', '#3a5a6a'),
                                    ('berar-sultanate', 'Berar Sultanate', 'Berar Sultanate', '#6a4a6a'),
                                    ('bidar-sultanate', 'Bidar Sultanate', 'Bidar Sultanate', '#7a6a6a')):
        simple(id_, name, 'deccan-group', title, 'deccan', color)

    # ----- South India and Sri Lanka -----
    grp('south-india-group', 'South India and Sri Lanka', '#3a7a5a')
    R.append(X.ancient_row(anc, 'pallava', 'south-india-group'))
    simple('chola-empire', 'Chola Empire', 'south-india-group', 'Chola Empire', 'south-india', '#a83a2a')
    simple('pandya-dynasty', 'Pandyas', 'south-india-group', 'Pandya dynasty', 'south-india', '#2a5a8a', circa=True)
    simple('hoysala-empire', 'Hoysalas', 'south-india-group', 'Hoysala Empire', 'south-india', '#8a3a6a')
    simple('vijayanagara-empire', 'Vijayanagara Empire', 'south-india-group', 'Vijayanagara Empire', 'south-india', '#c08a2a')
    R.append(X.ancient_row(anc, 'anuradhapura', 'south-india-group'))
    row('sri-lanka', 'Sri Lanka', 'south-india-group', 'Kingdom of Kotte', 'sri-lanka', '#a85a2a', phases=X.link_phases([
        P('Kingdom of Polonnaruwa', 'Kingdom of Polonnaruwa', track='sri-lanka'),
        P('Kingdom of Dambadeniya', 'Kingdom of Dambadeniya', track='sri-lanka'),
        P('Kingdom of Gampola', 'Kingdom of Gampola', track='sri-lanka'),
        P('Kingdom of Kotte', 'Kingdom of Kotte', track='sri-lanka'),
    ]))
    jk = 'Jaffna Kingdom'
    j3, j4 = X.infobox_event(jk, 3), X.infobox_event(jk, 4)
    simple('jaffna-kingdom', 'Jaffna Kingdom', 'south-india-group', jk, 'sri-lanka', '#5a3a8a')
    R[-1]['memberOf'] = [M.member('sri-lanka', [{'year': j3[0][0], 'source': j3[2]}], [{'year': j4[0][0], 'source': j4[2]}],
                                  sources=[j3[2]], startEvent=X.event(jk, 3, 'jaffna-kingdom'), endEvent=X.event(jk, 4, 'jaffna-kingdom'))]

    # ----- Bengal, Odisha and Assam -----
    grp('east-india', 'Bengal, Odisha and Assam', '#4a8a6a')
    simple('pala-empire', 'Pala Empire', 'east-india', 'Pala Empire', 'gangetic-plain', '#8a5a2a')
    simple('sena-dynasty', 'Senas', 'east-india', 'Sena dynasty', 'gangetic-plain', '#6a4a2a')
    stretches('bengal-sultanate', 'Bengal Sultanate', 'east-india', 'Bengal Sultanate', 'gangetic-plain', '#2a8a4a', 2)
    eg = 'Eastern Ganga dynasty'
    row('eastern-ganga-dynasty', 'Eastern Gangas', 'east-india', eg, 'south-asia', '#a86a5a', phases=X.link_phases([
        P('Eastern Gangas of Kalinga', eg, 'seg0.start', 'seg0.end', 'eastern-ganga-dynasty'),
        P('Eastern Gangas of Trikalinga', eg, 'seg1.start', 'seg1.end', 'eastern-ganga-dynasty'),
    ]))
    simple('gajapati-empire', 'Gajapati Empire', 'east-india', 'Gajapati Empire', 'south-asia', '#c0a03a')
    simple('kamarupa', 'Kamarupa', 'east-india', 'Kamarupa', 'south-asia', '#5a7a3a')
    simple('ahom-kingdom', 'Ahom kingdom', 'east-india', 'Ahom kingdom', 'south-asia', '#3a6a3a')

    for old, y, new in RENAME:
        u = X.find(old, y)
        if u:
            X.EVENTS[u]['title'] = new
    X.modern_sync(R)
    for u in X.KEY:
        if u in X.EVENTS:
            X.EVENTS[u]['importance'] = 1
    return R
