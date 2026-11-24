"""
Wave 3 of the Medieval World timeline: the steppe and Central Asia. Uses med_europe's helpers and event registry
(med_europe.build must run first); see med_europe's docstring for how rows, events, regions and the 1500 seam work.

Rows from Ancient and Classical copied unchanged: western-turkic, avars.
The Mongol Empire and the Golden Horde come from the pilot; the Chagatai Khanate joins them as a member of the Mongol
Empire until the division after 1259 (its lead). Ids across 1500 follow Modern States' list (crimean-khanate,
kazan-khanate, astrakhan-khanate, khanate-of-sibir, nogai-horde, kazakhstan with the Kazakh Khanate as a phase).
Left out: the Yenisei Kyrgyz and Gaochang (no dates in their articles); the Great Horde (the Golden Horde's own last
name, per its article: "By 1466, it was being referred to simply as the 'Great Horde'").
"""
import json
import os

import med_europe as X

X.ALIAS.update({
    'fall of dadu to ming forces': 'fall of dadu',
})
X.TITLES.update({
    ('Khazars', 'end'): "Sviatoslav sacks Atil; end of the Khazar Khaganate",
    ('Volga Bulgaria', 'end'): 'Mongol conquest of Volga Bulgaria',
    ('Qara Khitai', 'start'): 'Yelü Dashi proclaims himself king; Qara Khitai founded',
    ('Qara Khitai', 'end'): 'Kuchlug executed by the Mongols; end of Qara Khitai',
    ('Chagatai Khanate', 'start'): 'Chagatai Khan inherits part of the Mongol Empire',
    ('Northern Yuan', 'end'): 'Ejei Khan submits to the Later Jin',
})
X.KEY.update({'sviatoslav-sacks-atil-end-of-the-khazar-khaganate', 'battle-of-talas', 'mongol-conquest-of-volga-bulgaria'})


def build(mod, repo):
    M, G = mod, mod.G
    S, P, on, claim = X.S, X.P, X.on, X.claim
    anc = json.load(open(os.path.join(repo, 'public', 'timelines', 'ancient-classical.json'), encoding='utf-8'))
    R = []

    def row(id_, name, parent, title, region, color, **kw):
        t = M.row(id_, name, color, parent, title, regions=[M.region(region, X.capital(title))], **kw)
        R.append(t)
        return t

    def grp(id_, name, color):
        R.append({'id': id_, 'name': name, 'color': color, 'parent': 'steppe'})

    def simple(id_, name, parent, title, region, color, **kw):
        return row(id_, name, parent, title, region, color, span=S(title, track=id_, **kw))

    # ----- Mongolia and the eastern steppe -----
    grp('eastern-steppe', 'Mongolia and the eastern steppe', '#4a5a8a')
    simple('second-turkic-khaganate', 'Second Turkic Khaganate', 'eastern-steppe', 'Second Turkic Khaganate', 'mongolian-plateau', '#6a7aa8')
    simple('uyghur-khaganate', 'Uyghur Khaganate', 'eastern-steppe', 'Uyghur Khaganate', 'mongolian-plateau', '#3a8a7a')
    simple('ganzhou-uyghur-kingdom', 'Ganzhou Uyghur Kingdom', 'eastern-steppe', 'Ganzhou Uyghur Kingdom', 'china', '#5a9a8a')
    R.append(M.PILOT_ROWS['mongol-empire'] | {'parent': 'eastern-steppe'})
    # Modern States' id rule: the Northern Yuan carries on into today's Mongolia, so it is that row's first phase.
    row('mongolia', 'Mongolia', 'eastern-steppe', 'Northern Yuan', 'mongolian-plateau', '#7a5a9a',
        phases=[P('Northern Yuan', 'Northern Yuan', track='mongolia', startEvent=on(X.find('Fall of Dadu', 1368), 'mongolia'))])
    simple('four-oirat', 'Four Oirat', 'eastern-steppe', 'Four Oirat', 'mongolian-plateau', '#9a7a3a')

    # ----- Central Asia -----
    grp('central-asia-steppe', 'Central Asia', '#3a8a8a')
    R.append(X.ancient_row(anc, 'western-turkic', 'central-asia-steppe'))
    simple('turgesh', 'Türgesh', 'central-asia-steppe', 'Turgesh', 'kazakh-steppe', '#8a8a3a')
    simple('kimek-kipchak-confederation', 'Kimek–Kipchak confederation', 'central-asia-steppe', 'Kimek–Kipchak confederation', 'kazakh-steppe', '#6a6a4a')
    simple('kara-khanid-khanate', 'Kara-Khanid Khanate', 'central-asia-steppe', 'Kara-Khanid Khanate', 'central-asia', '#2a6a4a')
    simple('kingdom-of-khotan', 'Kingdom of Khotan', 'central-asia-steppe', 'Kingdom of Khotan', 'central-asia', '#a87a4a', circa=True)
    simple('khwarazmian-empire', 'Khwarazmian Empire', 'central-asia-steppe', 'Khwarazmian Empire', 'central-asia', '#8a4a6a', circa=True)
    simple('qara-khitai', 'Qara Khitai', 'central-asia-steppe', 'Qara Khitai', 'central-asia', '#4a4a8a')
    ch = 'Chagatai Khanate'
    row('chagatai-khanate', 'Chagatai Khanate', 'central-asia-steppe', ch, 'central-asia', '#5a7a3a', phases=[
        P('Chagatai Khanate', ch, 'date_start', 'seg0.end', 'chagatai-khanate'),
        P('Western Chagatai Khanate', ch, 'seg1.start', 'seg1.end', 'chagatai-khanate'),
        P('Eastern Chagatai Khanate (Moghulistan)', ch, 'seg2.start', 'seg2.end', 'chagatai-khanate'),
    ], memberOf=[M.member('mongol-empire', M.F(ch, 'date_start', 'start'), M.L(1259, ch, 'With the division of the Mongol Empire after 1259'),
                          sources=[M.lead(ch, 'With the division of the Mongol Empire after 1259', 1259)],
                          endEvent=on('mongke-dies', 'chagatai-khanate'))])
    simple('uzbek-khanate', 'Uzbek Khanate', 'central-asia-steppe', 'Uzbek Khanate', 'kazakh-steppe', '#3a6a9a')
    row('kazakhstan', 'Kazakhstan', 'central-asia-steppe', 'Kazakh Khanate', 'kazakh-steppe', '#2a8ac0',
        phases=[P('Kazakh Khanate', 'Kazakh Khanate', track='kazakhstan')])

    # ----- The western steppe and the Volga -----
    grp('western-steppe', 'The western steppe and the Volga', '#8a6a3a')
    R.append(X.ancient_row(anc, 'avars', 'western-steppe'))
    simple('khazars', 'Khazars', 'western-steppe', 'Khazars', 'pontic-caspian-steppe', '#5a8a5a', circa=True)
    vb = 'Volga Bulgaria'
    row('volga-bulgaria', 'Volga Bulgaria', 'western-steppe', vb, 'eastern-europe', '#3a7a3a',
        span=S(vb, None, 'year_end', 'volga-bulgaria', circa=True,
               sc=claim(885, vb, 'infobox year_start: late 9th century', 'The infobox says "late 9th century".', margin=15)))
    simple('pechenegs', 'Pechenegs', 'western-steppe', 'Pechenegs', 'pontic-caspian-steppe', '#8a5a3a')
    row('cumania', 'Cumania', 'western-steppe', 'Cumania', 'pontic-caspian-steppe', '#9a7a5a',
        span=S('Cumania', None, 'year_end', 'cumania', circa=True,
               sc=claim(950, 'Cumania', 'infobox year_start: 10th century', 'The infobox says "10th century".', margin=50)))
    R.append(M.PILOT_ROWS['golden-horde'] | {'parent': 'western-steppe'})
    for id_, name, title, region, color in (
            ('kazan-khanate', 'Khanate of Kazan', 'Khanate of Kazan', 'eastern-europe', '#2a5a3a'),
            ('crimean-khanate', 'Crimean Khanate', 'Crimean Khanate', 'pontic-caspian-steppe', '#3a6aa8'),
            ('astrakhan-khanate', 'Astrakhan Khanate', 'Astrakhan Khanate', 'pontic-caspian-steppe', '#6a8aa8'),
            ('khanate-of-sibir', 'Khanate of Sibir', 'Khanate of Sibir', 'siberia', '#5a5a5a'),
            ('nogai-horde', 'Nogai Horde', 'Nogai Horde', 'pontic-caspian-steppe', '#a85a5a')):
        simple(id_, name, 'western-steppe', title, region, color)

    # Events that also belong on a second row
    u = on(X.find('Janibeg and Kerei found the Kazakh Khanate', 1466), 'kazakhstan')
    kz = next(t for t in R if t['id'] == 'kazakhstan')['phases'][0]
    if u and not kz.get('startEvent'):
        kz['startEvent'] = u
    on(X.find('Esen Taishi becomes Northern Yuan Khagan', 1453), 'mongolia')
    X.modern_sync(R)
    for u in X.KEY:
        if u in X.EVENTS:
            X.EVENTS[u]['importance'] = 1
    return R
