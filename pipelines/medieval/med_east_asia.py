"""
Wave 5 of the Medieval World timeline: East Asia. Uses med_europe's helpers and event registry (med_europe.build must
run first); see med_europe's docstring for how rows, events, regions and the 1500 seam work.

China comes from the pilot (Tang to Ming as phases). Modern States' id rule: `korea` carries Goryeo and Joseon as
phases, `japan` its periods and shogunates. Japan's Asuka phase pairs with Ancient's `asuka` row in the seam check
(data-src/seams.json). Rows from Ancient and Classical copied unchanged: silla, goguryeo, baekje, yarlung (the Tibetan
Empire), tuyuhun. Tibet under Yuan rule is shown as in China (its Yuan phase) 1270-1354, from its lead.
Left out: Guge (its article gives no dates).
"""
import json
import os

import med_europe as X

X.TITLES.update({
    ('Jin dynasty (1115–1234)', 'start'): 'Jin dynasty founded',
    ('Jin dynasty (1115–1234)', 'event3'): 'Mongol invasion of the Jin',
    ('Nanzhao', 'end'): 'Nanzhao overthrown',
    ('Dali Kingdom', 'event2'): 'Dali Kingdom re-established',
    ('Goryeo', 'event4'): 'Goryeo military dictatorship',
    ('Goryeo', 'event5'): 'Mongol invasions of Korea',
})
X.ALIAS.update({
    'emperor tianzuo captured by jin': 'fall of liao dynasty',
    'destruction of the liao dynasty': 'fall of liao dynasty',
    'emergence of jin dynasty': 'jin dynasty founded',
    'western liao established': 'yelü dashi proclaims himself king; qara khitai founded',
    'signing of the chanyuan treaty with song': 'chanyuan treaty with liao',
})
# Mongol conquests: the Mongol Empire acted as itself, so they go on its row too
MONGOL = [('Destruction by the Mongol Empire', 1227), ('Subjugation by the Mongol Empire', 1210), ('Mongol invasion of the Jin', 1211),
          ('Fall of Caizhou to the Mongol Empire', 1234), ('Mongol invasions of Korea', 1231), ('Mongol invasion of the Khwarazmian Empire', 1219),
          ("Mongol invasion of Rus'", 1237), ('Mongol conquest of Volga Bulgaria', 1240), ('First Mongol invasion of Hungary', 1241)]
X.KEY.update({'jingkang-incident', 'mongol-conquest-of-the-jin-dynasty', 'founding-of-joseon'})


def build(mod, repo):
    M, G = mod, mod.G
    S, P, on, claim = X.S, X.P, X.on, X.claim
    anc = json.load(open(os.path.join(repo, 'public', 'timelines', 'ancient-classical.json')))
    R = []

    def row(id_, name, parent, title, region, color, **kw):
        t = M.row(id_, name, color, parent, title, regions=[M.region(region, X.capital(title))], **kw)
        R.append(t)
        return t

    def grp(id_, name, color):
        R.append({'id': id_, 'name': name, 'color': color, 'parent': 'east-asia'})

    def simple(id_, name, parent, title, region, color, **kw):
        return row(id_, name, parent, title, region, color, span=S(title, track=id_, **kw))

    # ----- China and its northern and southern neighbours -----
    grp('china-group', 'China and its neighbours', '#b0302f')
    R.append(M.PILOT_ROWS['china'] | {'parent': 'china-group'})
    simple('liao-dynasty', 'Liao dynasty (Khitan)', 'china-group', 'Liao dynasty', 'northeast-china', '#5a6a9a')
    simple('western-xia', 'Western Xia', 'china-group', 'Western Xia', 'china', '#8a6a3a')
    simple('jin-dynasty', 'Jin dynasty (Jurchen)', 'china-group', 'Jin dynasty (1115–1234)', 'northeast-china', '#3a7a6a')
    on(X.find('Jingkang incident', 1127), 'jin-dynasty')
    simple('nanzhao', 'Nanzhao', 'china-group', 'Nanzhao', 'china', '#8a4a6a')
    dk = 'Dali Kingdom'
    row('dali-kingdom', 'Dali Kingdom', 'china-group', dk, 'china', '#6a3a5a',
        span=S(dk, 'seg0.start', 'seg0.end', 'dali-kingdom'))

    # ----- Tibet -----
    grp('tibet-group', 'Tibet', '#a87a3a')
    R.append(X.ancient_row(anc, 'yarlung', 'tibet-group'))
    R.append(X.ancient_row(anc, 'tuyuhun', 'tibet-group'))
    ty = 'Tibet under Yuan rule'
    lead_ty = M.lead(ty, "Yuan dynasty's rule over Tibet from approximately 1270 to 1354", 1270)
    row('tibet-under-yuan-rule', 'Tibet under Yuan rule (Sakya)', 'tibet-group', ty, 'tibetan-plateau', '#c09a5a',
        span=S(ty, track='tibet-under-yuan-rule', circa=True),
        memberOf=[M.member('china', M.F(ty, 'year_start', 'start'), M.F(ty, 'year_end', 'end'), sources=[lead_ty], circa=True)])
    simple('phagmodrupa-dynasty', 'Phagmodrupa dynasty', 'tibet-group', 'Phagmodrupa dynasty', 'tibetan-plateau', '#9a5a3a')
    simple('rinpungpa', 'Rinpungpa', 'tibet-group', 'Rinpungpa', 'tibetan-plateau', '#7a4a3a')

    # ----- Korea -----
    grp('korea-group', 'Korea', '#3a6aa8')
    for id_ in ('goguryeo', 'baekje', 'silla'):
        R.append(X.ancient_row(anc, id_, 'korea-group'))
    simple('balhae', 'Balhae', 'korea-group', 'Balhae', 'northeast-china', '#5a8aa8')
    row('korea', 'Korea', 'korea-group', 'Joseon', 'korea', '#2a4a8a', phases=X.link_phases([
        P('Goryeo', 'Goryeo', track='korea'),
        P('Joseon', 'Joseon', track='korea'),
    ]))

    # ----- Japan -----
    grp('japan-group', 'Japan', '#c03a3a')
    ks = 'Kamakura shogunate'
    row('japan', 'Japan', 'japan-group', 'Ashikaga shogunate', 'japan', '#c0302a', phases=X.link_phases([
        M.phase('Asuka period', M.L(538, 'Asuka period', 'lasting from 538 to 710'), M.L(710, 'Asuka period', 'lasting from 538 to 710')),
        M.phase('Nara period', M.L(710, 'Nara period', 'covers the years from 710 to 794'), M.L(794, 'Nara period', 'covers the years from 710 to 794')),
        M.phase('Heian period', M.L(794, 'Heian period', 'running from 794 to 1185'), M.L(1185, 'Heian period', 'running from 794 to 1185')),
        P('Kamakura shogunate', ks, track='japan',
          sc=M.L(1185, 'Kamakura period', 'the prevailing theory was that the year was 1185', 'The prevailing view; the shogunate was formally established in 1192.')
          + M.F(ks, 'year_start', 'start')),
        P('Kenmu Restoration', 'Kenmu Restoration', track='japan'),
        P('Ashikaga (Muromachi) shogunate', 'Ashikaga shogunate', track='japan'),
    ]))
    simple('ryukyu-kingdom', 'Ryukyu Kingdom', 'japan-group', 'Ryukyu Kingdom', 'japan', '#3a8aa8')

    for title, y in MONGOL:
        u = X.find(title, y)
        if not u:
            raise SystemExit(f'no event {title} {y}')
        on(u, 'mongol-empire')
    for old, y, new in (('Destruction by the Mongol Empire', 1227, 'Mongol destruction of Western Xia'),
                        ('Subjugation by the Mongol Empire', 1210, 'Western Xia submits to the Mongol Empire')):
        X.EVENTS[X.find(old, y)]['title'] = new
    X.modern_sync(R)
    for u in X.KEY:
        if u in X.EVENTS:
            X.EVENTS[u]['importance'] = 1
    return R
