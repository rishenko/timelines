"""
Wave 6 of the Medieval World timeline: Southeast Asia and Oceania. Uses med_europe's helpers and event registry
(med_europe.build must run first); see med_europe's docstring for how rows, events, regions and the 1500 seam work.

Modern States' id rule: `vietnam` carries the Đại Việt dynasties as phases (Ngô to the Later Lê; the Lê dynasty's life
span gives two stretches around the Mạc interruption), `thailand` the Ayutthaya Kingdom, `brunei` the Sultanate of
Brunei, `tonga` the Tuʻi Tonga Empire. Ava and Hanthawaddy are separate rows (their note).
Rows from Ancient and Classical copied unchanged: pyu, chenla, champa, bujang-valley, tarumanagara, kutai,
sa-huynh-kalanay, pohnpei (which already covers the Saudeleur dynasty, 1100-1628).
Left out: the Demak Sultanate (its article gives no start year).
"""
import json
import os

import med_europe as X

X.ALIAS.update({
    'lan xang founded': 'founded by fa ngum',
    'empress dương vân nga enthroned lê hoàn': 'general lê hoàn succeeded the throne',
    'coronation of trần cảnh': 'lý chiêu hoàng abdicates, cedes throne to trần cảnh',
    'jayakatwang rebellion': 'revival of the kediri by jayakatwang',
    'battle of genter': 'kertajaya defeat to ken arok of singhasari',
})
RENAME = [('Founded', 671, 'Srivijaya founded'), ('Foundation', 1267, 'Samudera Pasai founded'),
          ('Founding', 1400, 'Malacca Sultanate founded'), ('Peak', 1174, 'Pagan Kingdom at its peak'),
          ('Golden Age', 1426, 'Hanthawaddy golden age'), ('First Mongol invasion', 1277, 'First Mongol invasion of Burma'),
          ('Kingdom official establishment', 1351, 'Ayutthaya Kingdom established'), ('Founding of kingdom', 849, 'Pagan Kingdom founded'),
          ('Founded by Fa Ngum', 1353, 'Lan Xang founded by Fa Ngum')]
MONGOL = [('First Mongol invasion', 1277), ('Mongol invasions of Vietnam', 1258)]
X.KEY.update({'fall-of-malacca', 'capture-of-malacca'})


def build(mod, repo):
    M, G = mod, mod.G
    S, P, on = X.S, X.P, X.on
    anc = json.load(open(os.path.join(repo, 'public', 'timelines', 'ancient-classical.json'), encoding='utf-8'))
    R = [{'id': 'se-asia-oceania', 'name': 'Southeast Asia and Oceania', 'color': '#2a8a7a'}]

    def row(id_, name, parent, title, region, color, **kw):
        t = M.row(id_, name, color, parent, title, regions=[M.region(region, X.capital(title))], **kw)
        R.append(t)
        return t

    def grp(id_, name, color):
        R.append({'id': id_, 'name': name, 'color': color, 'parent': 'se-asia-oceania'})

    def simple(id_, name, parent, title, region, color, **kw):
        return row(id_, name, parent, title, region, color, span=S(title, track=id_, **kw))

    # ----- Mainland Southeast Asia -----
    grp('mainland-se-asia', 'Mainland Southeast Asia', '#3a8a5a')
    for id_ in ('pyu', 'chenla', 'champa'):
        R.append(X.ancient_row(anc, id_, 'mainland-se-asia'))
    # Modern States' id rule: the kingdom carried on into today's Cambodia, so the Khmer Empire is that row's first phase.
    row('cambodia', 'Cambodia (Khmer Empire)', 'mainland-se-asia', 'Khmer Empire', 'mainland-sea', '#a8603a',
        phases=[P('Khmer Empire', 'Khmer Empire', track='cambodia')])
    simple('pagan-kingdom', 'Pagan Kingdom', 'mainland-se-asia', 'Pagan Kingdom', 'mainland-sea', '#c09a3a')
    simple('kingdom-of-ava', 'Kingdom of Ava', 'mainland-se-asia', 'Ava Kingdom', 'mainland-sea', '#8a6a3a')
    simple('hanthawaddy-kingdom', 'Hanthawaddy Kingdom', 'mainland-se-asia', 'Hanthawaddy kingdom', 'mainland-sea', '#6a8a3a')
    simple('sukhothai-kingdom', 'Sukhothai Kingdom', 'mainland-se-asia', 'Sukhothai Kingdom', 'mainland-sea', '#3a6a9a')
    row('thailand', 'Thailand (Ayutthaya)', 'mainland-se-asia', 'Ayutthaya Kingdom', 'mainland-sea', '#2a4a9a',
        phases=[P('Ayutthaya Kingdom', 'Ayutthaya Kingdom', track='thailand')])
    simple('lan-na', 'Lan Na', 'mainland-se-asia', 'Lan Na', 'mainland-sea', '#7a3a6a')
    simple('lan-xang', 'Lan Xang', 'mainland-se-asia', 'Lan Xang', 'mainland-sea', '#a83a5a')
    le = 'Later Lê dynasty'
    row('vietnam', 'Vietnam (Đại Việt)', 'mainland-se-asia', le, 'red-river-delta', '#c0302a', phases=X.link_phases([
        P('Ngô dynasty', 'Ngô dynasty', track='vietnam'),
        P('Đinh dynasty', 'Đinh dynasty', track='vietnam'),
        P('Early Lê dynasty', 'Early Lê dynasty', track='vietnam'),
        P('Lý dynasty', 'Lý dynasty', track='vietnam'),
        P('Trần dynasty', 'Trần dynasty', track='vietnam'),
        P('Hồ dynasty', 'Hồ dynasty', track='vietnam'),
        P('Later Lê dynasty', le, 'seg0.start', 'seg0.end', 'vietnam'),
        P('Later Lê dynasty (restored)', le, 'seg1.start', 'seg1.end', 'vietnam'),
    ]))

    # ----- Maritime Southeast Asia -----
    grp('maritime-se-asia', 'Maritime Southeast Asia', '#3a7aa8')
    for id_ in ('tarumanagara', 'bujang-valley', 'kutai', 'sa-huynh-kalanay'):
        R.append(X.ancient_row(anc, id_, 'maritime-se-asia'))
    for id_, name, title, color in (('srivijaya', 'Srivijaya', 'Srivijaya', '#c0702a'),
                                    ('mataram-kingdom', 'Mataram Kingdom', 'Mataram Kingdom', '#8a5a3a'),
                                    ('kediri-kingdom', 'Kediri Kingdom', 'Kediri Kingdom', '#6a7a3a'),
                                    ('singhasari', 'Singhasari', 'Singhasari', '#5a5a8a'),
                                    ('majapahit', 'Majapahit', 'Majapahit', '#a83a3a'),
                                    ('samudera-pasai-sultanate', 'Samudera Pasai Sultanate', 'Samudera Pasai Sultanate', '#2a7a4a'),
                                    ('malacca-sultanate', 'Malacca Sultanate', 'Malacca Sultanate', '#c0a03a'),
                                    ('sultanate-of-sulu', 'Sultanate of Sulu', 'Sultanate of Sulu', '#3a8a8a')):
        simple(id_, name, 'maritime-se-asia', title, 'maritime-sea', color)
    row('brunei', 'Brunei', 'maritime-se-asia', 'Bruneian Empire', 'maritime-sea', '#d0c03a',
        phases=[P('Sultanate of Brunei', 'Bruneian Empire', track='brunei')])

    # ----- Oceania -----
    grp('oceania-group', 'Oceania', '#3a6a8a')
    R.append(X.ancient_row(anc, 'pohnpei', 'oceania-group'))
    row('tonga', 'Tonga', 'oceania-group', 'Tuʻi Tonga Empire', 'polynesia', '#a8302a',
        phases=[P('Tuʻi Tonga Empire', 'Tuʻi Tonga Empire', track='tonga')])

    for old, y, new in RENAME:
        u = X.find(old, y)
        if not u:
            raise SystemExit(f'no event {old} {y}')
        X.EVENTS[u]['title'] = new
    for t, y in MONGOL:
        on(X.find(t, y), 'mongol-empire')
    # Kevin (2026-11-21): Cliopatria's later end as a second claim, since the article describes a gradual end
    sv = next(t for t in R if t['id'] == 'srivijaya')['span']
    sv['endDates'] += X.clio('Srivijaya', 'end', 'Historians describe a long decline after the Chola raids of 1025 (the article: "may have disintegrated after 1025"); Cliopatria draws Srivijaya to 1293.')
    X.modern_sync(R)
    for u in X.KEY:
        if u in X.EVENTS:
            X.EVENTS[u]['importance'] = 1
    return R
