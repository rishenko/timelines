"""
Wave 7 of the Medieval World timeline: Africa south of the Sahara (Egypt and the Maghreb, also under Africa, come
from med_near_east). Uses med_europe's helpers and event registry
(med_europe.build must run first); see med_europe's docstring for how rows, events, regions and the 1500 seam work.

Where an infobox gives only a century ("11th century"), the claim is the middle of that century with a margin of 50
years, quoting the field in its note (as for Sweden). Rows from Ancient and Classical copied unchanged: aksum,
djenne-djenno, pastoral-neolithic. The Mali Empire comes from the pilot.
`bornu-empire` (Modern States' id) is the Kanem–Bornu Empire: "Bornu Empire" and "Kanem Empire" both redirect to it;
its phases come from the article's section headings. `ethiopia` carries the Zagwe dynasty and the Ethiopian Empire.
Left out (no usable dates in their articles): the Oyo Empire, the Hausa Kingdoms, Ife.
"""
import json
import os

import date_rulings as DR
import med_europe as X

X.ALIAS.update({
    'battle of kirina': 'conquest of sosso',
    'fall of mapungubwe, rise of great zimbabwe': 'mapungubwe hill abandoned',
})
RENAME = [('Christianisation', 1491, 'Christianisation of Kongo'), ('Mapungubwe Hill abandoned', 1300, 'Fall of Mapungubwe, rise of Great Zimbabwe')]
# Events where a second row acted (the conqueror or the founder), so they go on its row too
ALSO = [('Sultanate of Shewa annexed by Ifat', 1285, 'ifat-sultanate'), ('Conquered and vassalized by Mali Empire', 1285, 'mali-empire'),
        ('Conquered by Jolof Empire', 1456, 'jolof-empire'), ('Nyatsimba Mutota leaves to establish the Kingdom of Mutapa', 1450, 'mutapa'),
        ('Mapungubwe Hill abandoned', 1300, 'kingdom-of-zimbabwe')]
X.KEY.update({'battle-of-tondibi', 'conquest-of-sosso'})


def century(title, field, text, mid, note=None):
    """A claim for an infobox value given only as a century: `mid` with a margin of 50 (or as given)."""
    margin = 50
    if isinstance(mid, tuple):
        mid, margin = mid
    return [{'year': mid, 'margin': margin, 'source': X.G.ref(title, f'infobox {field}: {text}'),
             'note': note or f'The infobox says "{text}".'}]


def build(mod, repo):
    M, G = mod, mod.G
    S, P, on = X.S, X.P, X.on
    anc = json.load(open(os.path.join(repo, 'public', 'timelines', 'ancient-classical.json'), encoding='utf-8'))
    R = []

    def row(id_, name, parent, title, region, color, **kw):
        t = M.row(id_, name, color, parent, title, regions=[M.region(region, X.capital(title))], **kw)
        R.append(t)
        return t

    def grp(id_, name, color):
        R.append({'id': id_, 'name': name, 'color': color, 'parent': 'africa'})

    def simple(id_, name, parent, title, region, color, **kw):
        return row(id_, name, parent, title, region, color, span=S(title, track=id_, **kw))

    def cent(id_, name, parent, title, region, color, sc=None, ec=None, **kw):
        return row(id_, name, parent, title, region, color,
                   span=S(title, None if sc else 'year_start', None if ec else 'year_end', id_, sc=sc, ec=ec, circa=True, **kw))

    # ----- West Africa -----
    grp('west-africa-group', 'West Africa', '#c08a2a')
    R.append(X.ancient_row(anc, 'djenne-djenno', 'west-africa-group'))
    cent('ghana-empire', 'Ghana Empire', 'west-africa-group', 'Ghana Empire', 'west-africa', '#a86a2a',
         ec=century('Ghana Empire', 'year_end', 'c. mid-13th century', (1250, 10)))
    cent('kingdom-of-gao', 'Kingdom of Gao', 'west-africa-group', 'Kingdom of Gao', 'west-africa', '#7a5a3a',
         sc=century('Kingdom of Gao', 'year_start', 'c. 7th century', 650),
         ec=DR.gao_end())  # c. 1300 (ruling 2026-11-24); the infobox's late 1200s and the textbook 1325 are claims
    cent('takrur', 'Takrur', 'west-africa-group', 'Takrur', 'west-africa', '#5a7a3a',
         sc=century('Takrur', 'year_start', '9th century', 850))
    simple('sosso-empire', 'Sosso Empire', 'west-africa-group', 'Sosso Empire', 'west-africa', '#8a3a2a')
    on(X.find('Conquest of Sosso', 1235), 'sosso-empire')
    R.append(M.PILOT_ROWS['mali-empire'] | {'parent': 'west-africa-group'})
    X.event('Songhai Empire', 'start', 'songhai-empire', None)  # the infobox's "Independence from Mali Empire" (c. 1430s) stays an event on the row
    row('songhai-empire', 'Songhai Empire', 'west-africa-group', 'Songhai Empire', 'west-africa', '#c0a03a',  # start c. 1464 (ruling 2026-11-24)
        span=S('Songhai Empire', None, 'year_end', 'songhai-empire', sc=DR.songhai_start(), circa=True))
    simple('jolof-empire', 'Jolof Empire', 'west-africa-group', 'Jolof Empire', 'west-africa', '#3a7a5a')
    cent('mossi-kingdoms', 'Mossi Kingdoms', 'west-africa-group', 'Mossi Kingdoms', 'west-africa', '#8a6a5a',
         sc=century('Mossi Kingdoms', 'year_start', '11th century', 1050))
    kb = 'Kanem–Bornu Empire'
    row('bornu-empire', 'Kanem–Bornu', 'west-africa-group', kb, 'sahara', '#6a4a8a', phases=X.link_phases([
        P('Kanem', kb, None, None, 'bornu-empire', circa=True,
          sc=M.H(kb, 'Medieval period (c. 700–1472)', 'start'), ec=M.H(kb, 'Conversion to Islam (c. 1000–1380)', 'end')),
        P('Era of Instability', kb, None, None, 'bornu-empire',
          sc=M.H(kb, 'Era of Instability (c. 1380–1472)', 'start'), ec=M.H(kb, 'Era of Instability (c. 1380–1472)', 'end')),
        P('Bornu', kb, None, None, 'bornu-empire',
          sc=M.H(kb, 'Modern period (1472–1893)', 'start'), ec=M.H(kb, 'Modern period (1472–1893)', 'end')),
    ]))
    cent('kingdom-of-nri', 'Kingdom of Nri', 'west-africa-group', 'Kingdom of Nri', 'west-africa', '#4a8a6a',
         sc=century('Kingdom of Nri', 'year_start', 'c. 10th century (traditional chronology)', 950))
    simple('kingdom-of-benin', 'Kingdom of Benin', 'west-africa-group', 'Kingdom of Benin', 'west-africa', '#a83a3a')

    # ----- Central Africa -----
    grp('central-africa', 'Central Africa', '#5a8a3a')
    simple('kingdom-of-kongo', 'Kingdom of Kongo', 'central-africa', 'Kingdom of Kongo', 'africa', '#3a5a9a')

    # ----- The Horn and East Africa -----
    grp('horn-east-africa', 'The Horn and East Africa', '#7a5a3a')
    R.append(X.ancient_row(anc, 'aksum', 'horn-east-africa'))
    R.append(X.ancient_row(anc, 'pastoral-neolithic', 'horn-east-africa'))
    row('ethiopia', 'Ethiopia', 'horn-east-africa', 'Ethiopian Empire', 'horn-of-africa', '#2a7a3a', phases=X.link_phases([
        P('Zagwe dynasty', 'Zagwe dynasty', track='ethiopia'),
        P('Ethiopian Empire (Solomonic)', 'Ethiopian Empire', 'year_start', 'seg0.end', 'ethiopia'),
    ]))
    simple('sultanate-of-shewa', 'Sultanate of Shewa', 'horn-east-africa', 'Sultanate of Showa', 'horn-of-africa', '#6a8a3a')
    simple('ifat-sultanate', 'Ifat Sultanate', 'horn-east-africa', 'Ifat Sultanate', 'horn-of-africa', '#4a6a3a')
    simple('adal-sultanate', 'Adal Sultanate', 'horn-east-africa', 'Adal Sultanate', 'horn-of-africa', '#2a5a5a')
    cent('ajuran-sultanate', 'Ajuran Sultanate', 'horn-east-africa', 'Ajuran Sultanate', 'horn-of-africa', '#3a8a8a',
         sc=century('Ajuran Sultanate', 'year_start', '13th century', 1250))
    cent('sultanate-of-mogadishu', 'Sultanate of Mogadishu', 'horn-east-africa', 'Sultanate of Mogadishu', 'horn-of-africa', '#5a5a8a',
         sc=century('Sultanate of Mogadishu', 'year_start', '10th century', 950),
         ec=century('Sultanate of Mogadishu', 'year_end', '16th century', 1550))
    simple('kilwa-sultanate', 'Kilwa Sultanate', 'horn-east-africa', 'Kilwa Sultanate', 'east-africa', '#a86a4a')

    # ----- Southern Africa -----
    grp('southern-africa-group', 'Southern Africa', '#8a6a2a')
    simple('kingdom-of-mapungubwe', 'Kingdom of Mapungubwe', 'southern-africa-group', 'Kingdom of Mapungubwe', 'southern-africa', '#9a7a3a')
    cent('kingdom-of-zimbabwe', 'Kingdom of Zimbabwe (Great Zimbabwe)', 'southern-africa-group', 'Kingdom of Zimbabwe', 'southern-africa', '#7a6a4a',
         sc=century('Kingdom of Zimbabwe', 'year_start', '13th century', 1250),
         ec=century('Kingdom of Zimbabwe', 'year_end', '16th/17th century', (1600, 100)))
    simple('kingdom-of-butua', 'Kingdom of Butua', 'southern-africa-group', 'Kingdom of Butua', 'southern-africa', '#5a4a3a')
    cent('mutapa', 'Kingdom of Mutapa', 'southern-africa-group', 'Kingdom of Mutapa', 'southern-africa', '#a85a3a',
         sc=century('Kingdom of Mutapa', 'year_start', '15th century', 1450))

    for title, y, track in ALSO:
        u = X.find(title, y)
        if not u:
            raise SystemExit(f'no event {title} {y}')
        on(u, track)
    for old, y, new in RENAME:
        X.EVENTS[X.find(old, y)]['title'] = new
    X.modern_sync(R)
    for u in X.KEY:
        if u in X.EVENTS:
            X.EVENTS[u]['importance'] = 1
    return R
