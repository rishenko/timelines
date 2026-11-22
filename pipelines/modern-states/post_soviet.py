"""
Modern States wave 2: the post-Soviet states (2026-11-21). Russia, Ukraine, Belarus, Moldova, Estonia, Latvia, the
Caucasus and Central Asia, the de facto states, the Soviet Union and Transcaucasian SFSR (union rows), and the
khanates and other states since 1500 that the rules give rows. Lithuania is in europe.py (with the Commonwealth).

The Russian Empire is Russia's own government, so it is a phase of `russia`; its provinces and protectorates
(Finland, Congress Poland, Bessarabia, Turkestan, Bukhara and Khiva) are memberships of `russia`. Autonomous
republics inside the RSFSR (the Kazakh and Kirghiz ASSRs) are memberships of `russia` too.

Ids that cross 1500 (for Medieval): russia, golden-horde (Medieval's), crimean-khanate, kazan-khanate,
astrakhan-khanate, khanate-of-sibir, nogai-horde, terra-mariana, kartli, kakheti, imereti, kazakhstan.
"""

GROUPS = [
    {'id': 'central-asia', 'name': 'Central Asia', 'color': '#7a8f3a', 'parent': 'asia'},
]

SHARED = {
    'great-northern-war': ['russia'],
    'napoleonic-wars': ['russia'],
    'ww1': ['russia'],
    'ww2': ['soviet-union'],
    'third-partition': ['russia'],
    'russo-turkish-war-1877': ['russia'],
    'congress-of-berlin': ['russia'],
    'invasion-of-poland': ['soviet-union'],
    'finnish-independence': ['russia'],
}


def tracks(M):
    G, F, C, E, lead, phase, stretch, span, member, row = (
        M.G, M.F, M.C, M.E, M.lead, M.phase, M.stretch, M.span, M.member, M.row)

    def S1(t, spec='year_start'):
        return F(t, spec, 'start')[:1]

    def est(t, k):
        return F(t, f'established_date{k}', 'start')[:1]

    def cur(t, k):
        f = G.art(t)['fields']
        return G.ref(t, f"infobox established_event{k}: {f[f'established_event{k}']['text']}, "
                        f"{f.get(f'established_date{k}', {}).get('text', '')} (current state)".replace(', ,', ','))

    def L(t, needle, year, note=None):
        c = {'year': year, 'source': lead(t, needle)}
        if note:
            c['note'] = note
        return [c]

    def ref_est(t, k):
        f = G.art(t)['fields']
        return G.ref(t, f"infobox established_event{k}: {f[f'established_event{k}']['text']}, {f.get(f'established_date{k}', {}).get('text', '')}")

    su, tsfsr = 'Soviet Union', 'Transcaucasian Socialist Federative Soviet Republic'
    T = []

    # ================= Eastern Europe =================
    gpm, tr, re_, rr, rsfsr = ('Grand Principality of Moscow', 'Tsardom of Russia', 'Russian Empire', 'Russian Republic',
                               'Russian Soviet Federative Socialist Republic')
    T.append(row('russia', 'Russia', '#c0303a', 'eastern-europe', 'Russia', phases=[
        # the Moscow phase matches the Medieval World timeline (seam at 1500)
        phase('Grand Principality of Moscow', F(gpm, 'year_start', 'start'), F(gpm, 'year_end', 'end')),
        phase('Tsardom of Russia', F(tr, 'year_start', 'start'), F(tr, 'year_end', 'end'), endEvent='great-northern-war'),
        phase('Russian Empire', F(re_, 'year_start', 'start'), F(re_, 'year_end', 'end'), startEvent='great-northern-war', endEvent='russian-revolution'),
        phase('Russian Republic', F(rr, 'year_start', 'start'), F(rr, 'year_end', 'end'), startEvent='russian-revolution'),
        # the Soviet republic and the Provisional Government's republic overlapped in 1917–18: rival phases
        phase('Russian SFSR', F(rsfsr, 'seg0.start', 'start'), F(rsfsr, 'seg0.end', 'end'), startEvent='russian-revolution',
              endEvent='dissolution-of-the-soviet-union'),
        phase('Russian Federation', est('Russia', 9), ongoing=cur('Russia', 10), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[member('soviet-union', F(su, 'seg0.start', 'start'), F(su, 'seg0.end', 'end'),
                        sources=[ref_est('Russia', 7)], startEvent='soviet-union-founded', endEvent='dissolution-of-the-soviet-union')]))
    T.append(row('soviet-union', 'Soviet Union', '#b02020', 'eastern-europe', su, span_=span(stretch(
        None, F(su, 'seg0.start', 'start'), F(su, 'seg0.end', 'end'), startEvent='soviet-union-founded', endEvent='dissolution-of-the-soviet-union'))))

    ch, upr, us, wupr, ussr = ('Cossack Hetmanate', "Ukrainian People's Republic", 'Ukrainian State', "West Ukrainian People's Republic",
                               'Ukrainian Soviet Socialist Republic')
    T.append(row('ukraine', 'Ukraine', '#2a6ad0', 'eastern-europe', 'Ukraine', phases=[
        phase('Cossack Hetmanate', F(ch, 'date_start', 'start'), F(ch, 'year_end', 'end'), startEvent='khmelnytsky-uprising'),
        phase("Ukrainian People's Republic", F(upr, 'year_start', 'start'), F(upr, 'year_end', 'end')),
        # the Hetman's state (1918) and the western republic (1918–19) ran alongside the People's Republic
        phase('Ukrainian State', F(us, 'year_start', 'start'), F(us, 'year_end', 'end')),
        phase("West Ukrainian People's Republic", F(wupr, 'year_start', 'start'), F(wupr, 'year_end', 'end')),
        phase('Ukrainian SSR', F(ussr, 'seg0.start', 'start'), F(ussr, 'seg0.end', 'end'), endEvent='dissolution-of-the-soviet-union'),
        phase('Ukraine', est('Ukraine', 10), ongoing=cur('Ukraine', 11), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[
        member('russia', L(ch, 'vassal relations with the Tsardom of Moscow', 1654), F(ch, 'year_end', 'end'),
               sources=[lead(ch, 'vassal relations with the Tsardom of Moscow')]),
        member('soviet-union', F(su, 'seg0.start', 'start'), F(ussr, 'seg0.end', 'end'),
               sources=[G.ref(ussr, 'infobox event_start: USSR created, 30 December 1922')], startEvent='soviet-union-founded',
               endEvent='dissolution-of-the-soviet-union'),
    ]))
    bpr, bssr = "Belarusian People's Republic", 'Byelorussian Soviet Socialist Republic'
    T.append(row('belarus', 'Belarus', '#3a9a4a', 'eastern-europe', 'Belarus', phases=[
        phase("Belarusian People's Republic", F(bpr, 'year_start', 'start'), F(bpr, 'year_end', 'end')),
        phase('Byelorussian SSR', F(bssr, 'seg0.start', 'start'), F(bssr, 'seg0.end', 'end'), endEvent='dissolution-of-the-soviet-union'),
        phase('Republic of Belarus', est('Belarus', 5), ongoing=cur('Belarus', 7), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[member('soviet-union', F(su, 'seg0.start', 'start'), F(bssr, 'seg0.end', 'end'), sources=[ref_est('Belarus', 4)],
                        startEvent='soviet-union-founded', endEvent='dissolution-of-the-soviet-union')]))
    bg, mdr, mssr = 'Bessarabia Governorate', 'Moldavian Democratic Republic', 'Moldavian Soviet Socialist Republic'
    T.append(row('moldova', 'Moldova', '#3a5ab0', 'eastern-europe', 'Moldova',
                 # 1918–40 inside Romania with no government of its own: the lifespan carries it across
                 span_=span(stretch(None, F(bg, 'year_start', 'start'), ongoing=cur('Moldova', 9))),
                 phases=[
        phase('Bessarabia Governorate', F(bg, 'year_start', 'start'), F(bg, 'year_end', 'end')),
        phase('Moldavian Democratic Republic', F(mdr, 'seg0.start', 'start'), F(mdr, 'seg0.end', 'end'), endEvent='union-of-bessarabia-with-romania'),
        phase('Moldavian SSR', F(mssr, 'seg0.start', 'start'), F(mssr, 'seg0.end', 'end'), endEvent='dissolution-of-the-soviet-union'),
        phase('Republic of Moldova', est('Moldova', 8), ongoing=cur('Moldova', 9), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[
        member('russia', F(bg, 'year_start', 'start'), F(bg, 'year_end', 'end'), sources=[lead(bg, 'annexed by Russia')]),
        member('romania', est('Moldova', 4), F(mssr, 'seg0.start', 'start'), sources=[ref_est('Moldova', 4)], startEvent='union-of-bessarabia-with-romania'),
        member('soviet-union', F(mssr, 'seg0.start', 'start'), F(mssr, 'seg0.end', 'end'), sources=[ref_est('Moldova', 6)],
               endEvent='dissolution-of-the-soviet-union'),
    ]))
    T.append(row('transnistria', 'Transnistria (disputed)', '#7a3a3a', 'eastern-europe', 'Transnistria', span_=span(stretch(
        None, est('Transnistria', 1), ongoing=G.ref('Transnistria', 'infobox established_event1: Independence from Moldavian SSR declared, 1990 '
                                                                   '(current state; unrecognised, claimed by Moldova)'),
        startEvent='transnistria-war'))))

    # ================= Northern Europe: Estonia, Latvia, and Livonia before them =================
    tm = 'Terra Mariana'
    T.append(row('terra-mariana', 'Terra Mariana (Livonian Confederation)', '#6a6a7a', 'northern-europe', tm, span_=span(stretch(
        None, F(tm, 'year_start', 'start'), F(tm, 'year_end', 'end'), endEvent='livonian-war'))))
    dc, dl, sl = 'Duchy of Courland and Semigallia', 'Duchy of Livonia', 'Swedish Livonia'
    T.append(row('duchy-of-courland', 'Duchy of Courland and Semigallia', '#8a6a3a', 'northern-europe', dc,
                 span_=span(stretch(None, F(dc, 'year_start', 'start'), F(dc, 'year_end', 'end'), startEvent='livonian-war', endEvent='third-partition')),
                 memberOf=[member('polish-lithuanian-commonwealth', F('Polish–Lithuanian Commonwealth', 'year_start', 'start'), F(dc, 'year_end', 'end'),
                                  sources=[lead(dc, 'nominal vassal state')], startEvent='union-of-lublin', endEvent='third-partition')]))
    T.append(row('duchy-of-livonia', 'Duchy of Livonia', '#9a7a4a', 'northern-europe', dl,
                 span_=span(stretch(None, F(dl, 'year_start', 'start'), F(dl, 'year_end', 'end'), startEvent='livonian-war')),
                 memberOf=[member('polish-lithuanian-commonwealth', F('Polish–Lithuanian Commonwealth', 'year_start', 'start'), F(dl, 'year_end', 'end'),
                                  sources=[lead(dl, 'semi-autonomous vassal state')], startEvent='union-of-lublin')]))
    T.append(row('swedish-livonia', 'Swedish Livonia', '#4a6aa0', 'northern-europe', sl,
                 span_=span(stretch(None, F(sl, 'year_start', 'start'), F(sl, 'year_end', 'end'), endEvent='great-northern-war')),
                 memberOf=[member('sweden', F(sl, 'year_start', 'start'), F(sl, 'year_end', 'end'), sources=[lead(sl, 'dominion of the Swedish Empire')],
                                  endEvent='great-northern-war')]))
    est_r, essr = 'History of Estonia (1920–1939)', 'Estonian Soviet Socialist Republic'
    T.append(row('estonia', 'Estonia', '#2a7ac0', 'northern-europe', 'Estonia',
                 # occupied 1940–91 (German occupation 1941–44 between the two Soviet periods): the lifespan carries it across
                 span_=span(stretch(None, est('Estonia', 1), ongoing=cur('Estonia', 5))),
                 phases=[
        phase('Republic of Estonia', F(est_r, 'year_start', 'start'), F(est_r, 'year_end', 'end'), endEvent='soviet-occupation-of-the-baltic-states'),
        phase('Estonian SSR', F(essr, 'year_start', 'start'), C(1941, essr, 'infobox life span: 1940–1941, 1944–1990'), startEvent='soviet-occupation-of-the-baltic-states'),
        phase('Estonian SSR (reoccupied)', C(1944, essr, 'infobox life span: 1940–1941, 1944–1990'), F(essr, 'year_end', 'end')),
        phase('Republic of Estonia (restored)', est('Estonia', 5), ongoing=cur('Estonia', 5), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[
        member('soviet-union', F(essr, 'year_start', 'start'), C(1941, essr, 'infobox life span: 1940–1941, 1944–1990'), sources=[ref_est('Estonia', 4)],
               startEvent='soviet-occupation-of-the-baltic-states'),
        member('soviet-union', C(1944, essr, 'infobox life span: 1940–1941, 1944–1990'), est('Estonia', 5), sources=[ref_est('Estonia', 4)], endEvent='dissolution-of-the-soviet-union'),
    ]))
    lssr_ = 'Latvian Soviet Socialist Republic'
    T.append(row('latvia', 'Latvia', '#a03040', 'northern-europe', 'Latvia',
                 span_=span(stretch(None, est('Latvia', 1), ongoing=cur('Latvia', 4))),
                 phases=[
        # the inter-war republic's article has no infobox: Latvia's own infobox and the SSR's start date it
        phase('Republic of Latvia', est('Latvia', 1), S1(lssr_), endEvent='soviet-occupation-of-the-baltic-states'),
        phase('Latvian SSR', F(lssr_, 'seg0.start', 'start'), F(lssr_, 'seg0.end', 'end'), startEvent='soviet-occupation-of-the-baltic-states'),
        phase('Republic of Latvia (restored)', F(lssr_, 'seg0.end', 'end') + est('Latvia', 4), ongoing=cur('Latvia', 4),
              startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[member('soviet-union', F(lssr_, 'seg0.start', 'start'), F(lssr_, 'seg0.end', 'end'),
                        sources=[G.ref(lssr_, 'infobox life span: 1940–1990 / 1941–1944/45: German occupation')],
                        startEvent='soviet-occupation-of-the-baltic-states', endEvent='dissolution-of-the-soviet-union')]))

    # ================= the khanates of the steppe =================
    gh = 'Golden Horde'
    T.append(row('golden-horde', 'Golden Horde', '#c0a030', 'eastern-europe', gh, span_=span(stretch(
        None, F(gh, 'year_start', 'start'), F(gh, 'year_end', 'end'), circa=True))))
    ck = 'Crimean Khanate'
    T.append(row('crimean-khanate', 'Crimean Khanate', '#5a8a3a', 'eastern-europe', ck,
                 span_=span(stretch(None, F(ck, 'year_start', 'start'), F(ck, 'year_end', 'end'), endEvent='annexation-of-crimea-1783')),
                 # its Ottoman vassalage (from 1475) has no cited start year in the dump, so it is left out
                 ))
    for id_, name, color, t, end_ev in [('kazan-khanate', 'Khanate of Kazan', '#3a7a5a', 'Khanate of Kazan', 'siege-of-kazan'),
                                        ('astrakhan-khanate', 'Astrakhan Khanate', '#7a5a3a', 'Astrakhan Khanate', None),
                                        ('khanate-of-sibir', 'Khanate of Sibir', '#4a5a7a', 'Khanate of Sibir', None),
                                        ('nogai-horde', 'Nogai Horde', '#8a7a3a', 'Nogai Horde', None),
                                        ('kalmyk-khanate', 'Kalmyk Khanate', '#6a4a7a', 'Kalmyk Khanate', None)]:
        T.append(row(id_, name, color, 'eastern-europe', t, span_=span(stretch(
            None, F(t, 'year_start', 'start'), F(t, 'year_end', 'end'), endEvent=end_ev))))

    # ================= the Caucasus (Western Asia) =================
    kk, kka, ki_, kkk = 'Kingdom of Kartli', 'Kingdom of Kakheti', 'Kingdom of Imereti', 'Kingdom of Kartli-Kakheti'
    for id_, name, color, t in [('kartli', 'Kingdom of Kartli', '#a04a4a', kk), ('kakheti', 'Kingdom of Kakheti', '#8a3a5a', kka)]:
        T.append(row(id_, name, color, 'western-asia', t, span_=span(stretch(
            None, F(t, 'year_start', 'start'), F(t, 'year_end', 'end'), endEvent='union-of-kartli-and-kakheti'))))
    T.append(row('imereti', 'Kingdom of Imereti', '#7a4a6a', 'western-asia', ki_, span_=span(stretch(
        None, F(ki_, 'year_start', 'start'), F(ki_, 'year_end', 'end')))))
    drg, gssr = 'Democratic Republic of Georgia', 'Georgian Soviet Socialist Republic'
    T.append(row('georgia', 'Georgia', '#d03040', 'western-asia', 'Georgia (country)', phases=[
        phase('Kingdom of Kartli-Kakheti', F(kkk, 'year_start', 'start'), F(kkk, 'year_end', 'end'), startEvent='union-of-kartli-and-kakheti'),
        phase('Democratic Republic of Georgia', F(drg, 'year_start', 'start'), F(drg, 'year_end', 'end'), endEvent='red-army-invasion-of-georgia'),
        phase('Georgian SSR', F(gssr, 'seg0.start', 'start'), F(gssr, 'seg0.end', 'end'), startEvent='red-army-invasion-of-georgia',
              endEvent='dissolution-of-the-soviet-union'),
        phase('Georgia', est('Georgia (country)', 9), ongoing=cur('Georgia (country)', 10), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[
        member('transcaucasian-sfsr', F(tsfsr, 'year_start', 'start'), F(tsfsr, 'year_end', 'end'), sources=[lead(tsfsr, 'its constituent republics were elevated')]),
        member('soviet-union', F(tsfsr, 'year_end', 'end'), F(gssr, 'seg0.end', 'end'), sources=[ref_est('Georgia (country)', 8)],
               endEvent='dissolution-of-the-soviet-union'),
    ]))
    T.append(row('transcaucasian-sfsr', 'Transcaucasian SFSR', '#8a5a3a', 'western-asia', tsfsr,
                 span_=span(stretch(None, F(tsfsr, 'year_start', 'start'), F(tsfsr, 'year_end', 'end'))),
                 memberOf=[member('soviet-union', F(su, 'seg0.start', 'start'), F(tsfsr, 'year_end', 'end'), sources=[lead(tsfsr, 'Treaty on the Creation')],
                                  startEvent='soviet-union-founded')]))
    fra, assr = 'First Republic of Armenia', 'Armenian Soviet Socialist Republic'
    T.append(row('armenia', 'Armenia', '#d08020', 'western-asia', 'Armenia', phases=[
        phase('First Republic of Armenia', F(fra, 'year_start', 'start'), F(fra, 'year_end', 'end')),
        phase('Armenian SSR', F(assr, 'seg0.start', 'start'), F(assr, 'seg0.end', 'end'), endEvent='dissolution-of-the-soviet-union'),
        phase('Republic of Armenia', est('Armenia', 5), ongoing=cur('Armenia', 6), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[
        member('transcaucasian-sfsr', F(tsfsr, 'year_start', 'start'), F(tsfsr, 'year_end', 'end'), sources=[G.ref(assr, 'infobox event_start: Becomes part of the Transcaucasian SFSR')]),
        member('soviet-union', F(tsfsr, 'year_end', 'end'), F(assr, 'seg0.end', 'end'), sources=[ref_est('Armenia', 4)], endEvent='dissolution-of-the-soviet-union'),
    ]))
    adr, azssr = 'Azerbaijan Democratic Republic', 'Azerbaijan Soviet Socialist Republic'
    T.append(row('azerbaijan', 'Azerbaijan', '#2a8ac0', 'western-asia', 'Azerbaijan', phases=[
        phase('Azerbaijan Democratic Republic', F(adr, 'year_start', 'start'), F(adr, 'year_end', 'end')),
        phase('Azerbaijan SSR', F(azssr, 'seg0.start', 'start'), F(azssr, 'seg0.end', 'end'), endEvent='dissolution-of-the-soviet-union'),
        phase('Republic of Azerbaijan', est('Azerbaijan', 3), ongoing=cur('Azerbaijan', 4), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[
        member('transcaucasian-sfsr', F(tsfsr, 'year_start', 'start'), F(tsfsr, 'year_end', 'end'), sources=[lead(tsfsr, 'its constituent republics were elevated')]),
        member('soviet-union', F(tsfsr, 'year_end', 'end'), F(azssr, 'seg0.end', 'end'), sources=[ref_est('Azerbaijan', 2)], endEvent='dissolution-of-the-soviet-union'),
    ]))
    for id_, name, color, t, k, note in [
            ('abkhazia', 'Abkhazia (disputed)', '#4a8a6a', 'Abkhazia', 5, 'unrecognised by most states; claimed by Georgia'),
            ('south-ossetia', 'South Ossetia (disputed)', '#6a8a4a', 'South Ossetia', 3, 'unrecognised by most states; claimed by Georgia')]:
        f = G.art(t)['fields']
        T.append(row(id_, name, color, 'western-asia', t, span_=span(stretch(
            None, est(t, k), ongoing=G.ref(t, f"infobox established_event{k}: {f[f'established_event{k}']['text']}, "
                                              f"{f[f'established_date{k}']['text']} (current state; {note})")))))
    ra = 'Republic of Artsakh'
    T.append(row('artsakh', 'Artsakh (disputed)', '#9a5a2a', 'western-asia', ra, span_=span(stretch(
        None, F(ra, 'seg0.start', 'start'), F(ra, 'seg0.end', 'end'), endEvent='azerbaijani-offensive-2023'))))

    # ================= Central Asia =================
    kzk, alash, kzassr, kzssr = 'Kazakh Khanate', 'Alash Autonomy', 'Kazakh Autonomous Socialist Soviet Republic', 'Kazakh Soviet Socialist Republic'
    T.append(row('kazakhstan', 'Kazakhstan', '#2a9ab0', 'central-asia', 'Kazakhstan', phases=[
        phase('Kazakh Khanate', F(kzk, 'year_start', 'start'), F(kzk, 'year_end', 'end') + est('Kazakhstan', 3)),
        phase('Alash Autonomy', F(alash, 'seg0.start', 'start'), F(alash, 'seg0.end', 'end')),
        phase('Kazakh ASSR', F(kzassr, 'year_start', 'start'), F(kzassr, 'year_end', 'end')),
        phase('Kazakh SSR', F(kzssr, 'year_start', 'start'), F(kzssr, 'year_start:last', 'end'), endEvent='dissolution-of-the-soviet-union'),
        phase('Republic of Kazakhstan', est('Kazakhstan', 7), ongoing=cur('Kazakhstan', 8), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[
        member('russia', F(kzassr, 'year_start', 'start'), F(kzassr, 'year_end', 'end'), sources=[lead(kzassr, 'autonomous republic of the Russian')]),
        member('soviet-union', F(kzssr, 'year_start', 'start'), F(kzssr, 'year_start:last', 'end'), sources=[ref_est('Kazakhstan', 6)],
               endEvent='dissolution-of-the-soviet-union'),
    ]))
    kb, eb, bpsr = 'Khanate of Bukhara', 'Emirate of Bukhara', "Bukharan People's Soviet Republic"
    T.append(row('bukhara', 'Bukhara', '#b07a2a', 'central-asia', eb, phases=[
        phase('Khanate of Bukhara', F(kb, 'year_start', 'start'), F(kb, 'year_end', 'end')),
        phase('Emirate of Bukhara', F(eb, 'year_start', 'start'), F(eb, 'year_end', 'end')),
        phase("Bukharan People's Soviet Republic", F(bpsr, 'year_start', 'start'), F(bpsr, 'year_end', 'end'), endEvent='national-delimitation'),
    ]))
    kh, kpsr = 'Khanate of Khiva', "Khorezm People's Soviet Republic"
    T.append(row('khiva', 'Khiva', '#8a6a2a', 'central-asia', kh, phases=[
        phase('Khanate of Khiva', F(kh, 'year_start', 'start'), F(kh, 'year_end', 'end')),
        phase("Khorezm People's Soviet Republic", F(kpsr, 'year_start', 'start'), F(kpsr, 'year_end', 'end'), endEvent='national-delimitation'),
    ], memberOf=[member('russia', L(kh, 'became a Russian protectorate', 1873), F(kh, 'year_end', 'end'), sources=[lead(kh, 'became a Russian protectorate')])]))
    kok = 'Khanate of Kokand'
    T.append(row('kokand', 'Khanate of Kokand', '#6a8a2a', 'central-asia', kok, span_=span(stretch(
        None, F(kok, 'year_start', 'start'), F(kok, 'year_end', 'end')))))
    rt, tassr = 'Russian Turkestan', 'Turkestan Autonomous Soviet Socialist Republic'
    T.append(row('turkestan', 'Turkestan', '#7a7a3a', 'central-asia', rt, phases=[
        phase('Governorate-General of Turkestan', F(rt, 'year_start', 'start'), F(rt, 'year_end', 'end')),
        phase('Turkestan ASSR', F(tassr, 'year_start', 'start'), F(tassr, 'year_end', 'end'), endEvent='national-delimitation'),
    ], memberOf=[
        member('russia', F(rt, 'year_start', 'start'), F(tassr, 'year_end', 'end'), sources=[lead(tassr, 'autonomous republic of the Russian')],
               endEvent='national-delimitation'),
    ]))
    uzssr = 'Uzbek Soviet Socialist Republic'
    T.append(row('uzbekistan', 'Uzbekistan', '#2a9a7a', 'central-asia', 'Uzbekistan', phases=[
        phase('Uzbek SSR', F(uzssr, 'year_start', 'start'), F(uzssr, 'year_end', 'end'), startEvent='national-delimitation', endEvent='dissolution-of-the-soviet-union'),
        phase('Republic of Uzbekistan', est('Uzbekistan', 5), ongoing=cur('Uzbekistan', 7), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[member('soviet-union', F(uzssr, 'year_start', 'start'), F(uzssr, 'year_end', 'end'), sources=[ref_est('Uzbekistan', 3)],
                        startEvent='national-delimitation', endEvent='dissolution-of-the-soviet-union')]))
    tkssr = 'Turkmen Soviet Socialist Republic'
    T.append(row('turkmenistan', 'Turkmenistan', '#3a8a5a', 'central-asia', 'Turkmenistan', phases=[
        phase('Turkmen SSR', F(tkssr, 'seg0.start', 'start'), F(tkssr, 'seg0.end', 'end'), endEvent='dissolution-of-the-soviet-union'),
        phase('Turkmenistan', est('Turkmenistan', 2), ongoing=cur('Turkmenistan', 3), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[member('soviet-union', F(tkssr, 'seg0.start', 'start'), F(tkssr, 'seg0.end', 'end'),
                        sources=[G.ref(tkssr, 'infobox event_start: Republic proclaimed, 13 May 1925')], endEvent='dissolution-of-the-soviet-union')]))
    kao, kgssr = 'Kara-Kirghiz Autonomous Oblast', 'Kirghiz Soviet Socialist Republic'
    T.append(row('kyrgyzstan', 'Kyrgyzstan', '#c03a3a', 'central-asia', 'Kyrgyzstan', phases=[
        phase('Kara-Kirghiz Autonomous Oblast', F(kao, 'year_start', 'start'), F(kao, 'year_end', 'end'), startEvent='national-delimitation'),
        # the Kirghiz ASSR's article has no infobox: Kyrgyzstan's established events date it
        phase('Kirghiz ASSR', est('Kyrgyzstan', 5), est('Kyrgyzstan', 6)),
        phase('Kirghiz SSR', F(kgssr, 'year_start', 'start'), F(kgssr, 'year_end', 'end'), endEvent='dissolution-of-the-soviet-union'),
        phase('Kyrgyz Republic', est('Kyrgyzstan', 8), ongoing=cur('Kyrgyzstan', 10), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[
        member('russia', F(kao, 'year_start', 'start'), est('Kyrgyzstan', 6), sources=[lead(kao, 'within the Russian SFSR')], startEvent='national-delimitation'),
        member('soviet-union', F(kgssr, 'year_start', 'start'), F(kgssr, 'year_end', 'end'), sources=[ref_est('Kyrgyzstan', 6)],
               endEvent='dissolution-of-the-soviet-union'),
    ]))
    tjassr, tjssr = 'Tajik Autonomous Soviet Socialist Republic', 'Tajik Soviet Socialist Republic'
    T.append(row('tajikistan', 'Tajikistan', '#d0a030', 'central-asia', 'Tajikistan', phases=[
        phase('Tajik ASSR', F(tjassr, 'year_start', 'start'), F(tjassr, 'year_end', 'end'), startEvent='national-delimitation'),
        phase('Tajik SSR', F(tjssr, 'year_start', 'start'), F(tjssr, 'year_end', 'end'), endEvent='dissolution-of-the-soviet-union'),
        phase('Republic of Tajikistan', est('Tajikistan', 2), ongoing=cur('Tajikistan', 3), startEvent='dissolution-of-the-soviet-union'),
    ], memberOf=[
        member('uzbekistan', F(tjassr, 'year_start', 'start'), F(tjassr, 'year_end', 'end'), sources=[lead(tjassr, 'partitioned the three existing regional entities')],
               startEvent='national-delimitation'),
        member('soviet-union', F(tjssr, 'year_start', 'start'), F(tjssr, 'year_end', 'end'), sources=[ref_est('Tajikistan', 1)],
               endEvent='dissolution-of-the-soviet-union'),
    ]))
    return T


def events(M):
    G, E, W, F, ev, lead = M.G, M.E, M.W, M.F, M.ev, M.lead

    def wev(uuid, title, article, tracks, **kw):
        ys, r = W(article)
        if len(ys) > 1 and ys[-1] != ys[0]:
            kw.setdefault('end', ys[-1])
        return ev(uuid, title, ys[0], tracks, r, **kw)

    def fev(uuid, title, article, spec, tracks, **kw):
        c = F(article, spec, 'start')[0]
        return ev(uuid, title, c['year'], tracks, c['source'], **kw)

    ruw = wev('russo-ukrainian-war', 'Russo-Ukrainian war', 'Russo-Ukrainian war', ['russia', 'ukraine'], importance=1,
              descr='From the annexation of Crimea and the war in Donbas to the full-scale invasion of February 2022.')
    ruw['ongoing'] = True

    return [
        # ---- Russia ----
        wev('siege-of-kazan', 'Siege of Kazan', 'Siege of Kazan', ['russia', 'kazan-khanate'], importance=1,
            descr='Ivan IV takes Kazan; the khanate is annexed.'),
        wev('livonian-war', 'Livonian War', 'Livonian War', ['terra-mariana', 'russia', 'sweden', 'polish-lithuanian-union', 'denmark']),
        wev('russian-conquest-of-siberia', 'Russian conquest of Siberia', 'Russian conquest of Siberia', ['russia', 'khanate-of-sibir'], end=1778),
        wev('polish-muscovite-war', 'Polish–Muscovite War', 'Polish–Muscovite War (1605–1618)', ['russia', 'polish-lithuanian-commonwealth'],
            descr="Part of Russia's Time of Troubles; Polish forces hold Moscow in 1610–12."),
        wev('khmelnytsky-uprising', 'Khmelnytsky Uprising', 'Khmelnytsky Uprising', ['ukraine', 'polish-lithuanian-commonwealth'], importance=1,
            descr='A Cossack rising against the Commonwealth founds the Hetmanate.'),
        wev('battle-of-poltava', 'Battle of Poltava', 'Battle of Poltava', ['russia', 'sweden', 'ukraine'], importance=1),
        wev('russo-turkish-war-1768', 'Russo-Turkish War of 1768–74', 'Russo-Turkish War (1768–1774)', ['russia', 'ottoman-empire', 'crimean-khanate']),
        ev('annexation-of-crimea-1783', 'Russia annexes the Crimean Khanate', 1783, ['crimean-khanate', 'russia'],
           G.ref('Crimean Khanate', 'infobox year_end: 1783 (Annexation by the Russian Empire)')),
        wev('french-invasion-of-russia', 'French invasion of Russia', 'French invasion of Russia', ['russia', 'france'], importance=1),
        wev('crimean-war', 'Crimean War', 'Crimean War', ['russia', 'ottoman-empire', 'united-kingdom', 'france', 'italy'], importance=1),
        wev('russo-japanese-war', 'Russo-Japanese War', 'Russo-Japanese War', ['russia']),
        wev('russian-revolution', 'Russian Revolution', 'Russian Revolution', ['russia'], importance=1,
            descr='The February Revolution ends the monarchy; the Bolsheviks take power in October.'),
        wev('russian-civil-war', 'Russian Civil War', 'Russian Civil War', ['russia', 'ukraine', 'belarus'], importance=1),
        ev('soviet-union-founded', 'Treaty on the Creation of the USSR', 1922, ['soviet-union', 'russia', 'ukraine', 'belarus', 'transcaucasian-sfsr'],
           G.ref('Soviet Union', 'infobox event_start: Treaty of Creation, 30 December 1922'), importance=1),
        wev('molotov-ribbentrop-pact', 'Molotov–Ribbentrop Pact', 'Molotov–Ribbentrop Pact', ['soviet-union', 'germany']),
        wev('soviet-occupation-of-the-baltic-states', 'Soviet occupation of the Baltic states', 'Soviet occupation of the Baltic states (1940)',
            ['soviet-union', 'estonia', 'latvia', 'lithuania'], importance=1),
        wev('chernobyl', 'Chernobyl disaster', 'Chernobyl disaster', ['ukraine', 'soviet-union']),
        wev('singing-revolution', 'Singing Revolution', 'Singing Revolution', ['estonia', 'latvia', 'lithuania']),
        fev('dissolution-of-the-soviet-union', 'Dissolution of the Soviet Union', 'Soviet Union', 'seg0.end',
            ['soviet-union', 'russia', 'ukraine', 'belarus', 'moldova', 'estonia', 'latvia', 'georgia', 'armenia', 'azerbaijan',
             'kazakhstan', 'uzbekistan', 'turkmenistan', 'kyrgyzstan', 'tajikistan'], importance=1,
            descr='The union is formally dissolved on 26 December 1991; its fifteen republics are independent.'),
        wev('first-chechen-war', 'First Chechen War', 'First Chechen War', ['russia']),
        wev('orange-revolution', 'Orange Revolution', 'Orange Revolution', ['ukraine']),
        wev('revolution-of-dignity', 'Revolution of Dignity', 'Revolution of Dignity', ['ukraine'], importance=1),
        ruw,
        # ---- Moldova, the Caucasus, Central Asia ----
        ev('union-of-bessarabia-with-romania', 'Union of Bessarabia with Romania', 1918, ['moldova', 'romania'],
           G.ref('Moldavian Democratic Republic', 'infobox event_end: Union with Romania, 9 April 1918')),
        wev('transnistria-war', 'Transnistria War', 'Transnistria War', ['moldova', 'transnistria']),
        fev('union-of-kartli-and-kakheti', 'Union of Kartli and Kakheti', 'Kingdom of Kartli-Kakheti', 'year_start', ['kartli', 'kakheti', 'georgia']),
        wev('treaty-of-georgievsk', 'Treaty of Georgievsk', 'Treaty of Georgievsk', ['georgia', 'russia'], descr='Kartli-Kakheti becomes a Russian protectorate.'),
        fev('red-army-invasion-of-georgia', 'Red Army invasion of Georgia', 'Democratic Republic of Georgia', 'year_end', ['georgia']),
        wev('rose-revolution', 'Rose Revolution', 'Rose Revolution', ['georgia']),
        wev('russo-georgian-war', 'Russo-Georgian War', 'Russo-Georgian War', ['russia', 'georgia', 'south-ossetia', 'abkhazia'], importance=1),
        wev('first-nagorno-karabakh-war', 'First Nagorno-Karabakh War', 'First Nagorno-Karabakh War', ['armenia', 'azerbaijan', 'artsakh'], importance=1),
        wev('second-nagorno-karabakh-war', 'Second Nagorno-Karabakh War', 'Second Nagorno-Karabakh War', ['armenia', 'azerbaijan', 'artsakh']),
        wev('azerbaijani-offensive-2023', 'Azerbaijani offensive in Nagorno-Karabakh', '2023 Azerbaijani offensive in Nagorno-Karabakh', ['azerbaijan', 'artsakh'],
            descr='Artsakh capitulates and is dissolved; nearly all its Armenian population leaves.'),
        ev('national-delimitation', 'National delimitation in Central Asia', 1924, ['turkestan', 'bukhara', 'khiva', 'uzbekistan', 'tajikistan', 'kyrgyzstan'],
           lead('Tajik Autonomous Soviet Socialist Republic', 'partitioned the three existing regional entities'), importance=1,
           descr='Turkestan, Bukhara and Khorezm are divided into national republics on 14 October 1924.'),
        wev('tajik-civil-war', 'Tajikistani Civil War', 'Tajikistani Civil War', ['tajikistan']),
        wev('russian-conquest-of-central-asia', 'Russian conquest of Central Asia', 'Russian conquest of Central Asia',
            ['russia', 'bukhara', 'khiva', 'kokand', 'turkestan']),
        wev('belarusian-protests-2020', 'Belarusian protests', '2020–2021 Belarusian protests', ['belarus']),
    ]
