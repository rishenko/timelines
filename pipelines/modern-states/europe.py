"""
Modern States wave 1: Europe (2026-11-21). Extends the pilot rows in gen_modern.py (France, the German unions,
Prussia, the Yugoslav rows) to every European state, plus the Ottoman Empire (Western Asia) and the Portuguese
and French colonial empires.

Rules applied (data-format.md and Kevin's decisions, 2026-11-21):
- A row that carries on into a state that exists today takes that state's id; older governments are phases.
- Unions (and personal unions with a former-country infobox: Kalmar, Denmark–Norway, Sweden–Norway, the Iberian
  Union, the Polish–Lithuanian Commonwealth, the Habsburg monarchy, Czechoslovakia) are their own rows; members
  carry a dated memberOf. An empire's provinces and vassals are members too.
- A colonial or composite unit that split into several states is its own row (the Habsburg Netherlands).
- Union events: an event goes on a member's row only if it starts or ends that member's membership or phase, or the
  member acted as itself; otherwise it stays on the union row.
- Gaps between phases mean the row didn't exist (Poland after the partitions, Austria after the Anschluss), unless
  a typed lifespan says it lived through them.

Called from gen_modern.py with its module (M).
"""

SHARED = {
    'ww1': ['united-kingdom', 'habsburg-monarchy', 'ottoman-empire', 'italy', 'belgium', 'romania', 'bulgaria',
            'greece', 'portugal', 'montenegro'],
    'ww2': ['united-kingdom', 'italy', 'poland', 'netherlands', 'belgium', 'norway', 'greece', 'hungary', 'romania',
            'bulgaria', 'finland'],
    'franco-prussian-war': [],
}


def tracks(M):
    G, F, C, E, lead, phase, stretch, span, member, row = (
        M.G, M.F, M.C, M.E, M.lead, M.phase, M.stretch, M.span, M.member, M.row)

    def S1(t, spec='year_start'):
        """The first start claim of an article (no alternatives): for citing where the next phase begins."""
        return F(t, spec, 'start')[:1]

    def est(t, k):
        return F(t, f'established_date{k}', 'start')[:1]

    def cur(t, k):
        """Ref saying a state still exists: its infobox's latest established event."""
        f = G.art(t)['fields']
        return G.ref(t, f"infobox established_event{k}: {f[f'established_event{k}']['text']}, "
                        f"{f.get(f'established_date{k}', {}).get('text', '')} (current state)".replace(', ,', ','))

    def ev_claim(t, n):
        y, r = E(t, n)
        return [{'year': y, 'source': r}]

    def L(t, needle, year, note=None):
        c = {'year': year, 'source': lead(t, needle)}
        if note:
            c['note'] = note
        return [c]

    T = []

    # ================= Northern Europe =================
    ke, gb, ukgbi, uk = 'Kingdom of England', 'Kingdom of Great Britain', 'United Kingdom of Great Britain and Ireland', 'United Kingdom'
    T.append(row('united-kingdom', 'United Kingdom', '#2f4f8f', 'northern-europe', uk, phases=[
        phase('Kingdom of England', F(ke, 'year_start', 'start'), F(ke, 'year_end', 'end'), endEvent='acts-of-union-1707'),
        # the republic of 1649–60 ran alongside the exiled monarchy: a rival phase
        phase('Commonwealth and Protectorate', C(1649, ke, 'infobox life span: 927–1707 / (1649–1660: Commonwealth)'),
              C(1660, ke, 'infobox life span: 927–1707 / (1649–1660: Commonwealth)')),
        phase('Kingdom of Great Britain', F(gb, 'year_start', 'start'), S1(ukgbi) + F(gb, 'year_end', 'end'),
              startEvent='acts-of-union-1707', endEvent='acts-of-union-1800'),
        phase('United Kingdom of Great Britain and Ireland', F(ukgbi, 'year_start', 'start'), F(ukgbi, 'year_end', 'end'),
              startEvent='acts-of-union-1800', endEvent='irish-free-state'),
        phase('United Kingdom of Great Britain and Northern Ireland', est(uk, 6), ongoing=cur(uk, 6), startEvent='irish-free-state'),
    ]))
    ks = 'Kingdom of Scotland'
    T.append(row('scotland', 'Scotland', '#3a5f9f', 'northern-europe', 'Scotland',
                 # a country of the United Kingdom since 1707, with no government of its own until devolution
                 span_=span(stretch(None, F(ks, 'year_start', 'start'), ongoing=cur('Scotland', 5))),
                 phases=[phase('Kingdom of Scotland', F(ks, 'year_start', 'start'), F(ks, 'year_end', 'end'), endEvent='acts-of-union-1707')],
                 memberOf=[member('united-kingdom', est('Scotland', 4), ongoing=True,
                                  sources=[G.ref('Scotland', 'infobox established_event4: Union with England, 1 May 1707')],
                                  startEvent='acts-of-union-1707')]))
    pw = 'Principality of Wales'
    T.append(row('wales', 'Wales', '#b0303a', 'northern-europe', pw, phases=[
        phase('Principality of Wales (English Crown)', F(pw, 'seg1.start', 'start'), F(pw, 'seg1.end', 'end')),
    ], memberOf=[member('united-kingdom', F(pw, 'seg1.start', 'start'), F(pw, 'seg1.end', 'end'),
                        sources=[G.ref(pw, 'infobox life span: 1283–1542: possession of the English Crown')])]))
    li, ki, ir, ifs, roi = 'Lordship of Ireland', 'Kingdom of Ireland', 'Irish Republic', 'Irish Free State', 'Republic of Ireland'
    T.append(row('ireland', 'Ireland', '#2f8f4f', 'northern-europe', roi,
                 span_=span(stretch(None, F(li, 'year_start', 'start'), ongoing=cur(roi, 6))),
                 phases=[
        phase('Lordship of Ireland', F(li, 'year_start', 'start'), F(li, 'year_end', 'end')),
        phase('Kingdom of Ireland', F(ki, 'year_start', 'start'), S1(ukgbi) + F(ki, 'year_end', 'end'), endEvent='acts-of-union-1800'),
        phase('Irish Republic', F(ir, 'year_start', 'start'), F(ir, 'year_end', 'end'), startEvent='irish-war-of-independence', endEvent='irish-free-state'),
        phase('Irish Free State', F(ifs, 'year_start', 'start'), F(ifs, 'year_end', 'end'), startEvent='irish-free-state'),
        phase('Ireland', est(roi, 5), ongoing=cur(roi, 6)),
    ], memberOf=[
        member('united-kingdom', F(ukgbi, 'year_start', 'start'), F(ukgbi, 'year_end', 'end'),
               sources=[G.ref(ukgbi, 'infobox event_start: Acts of Union, 1 January 1801')], startEvent='acts-of-union-1800', endEvent='irish-free-state'),
    ]))

    ku, dn, sn = 'Kalmar Union', 'Denmark–Norway', 'Union between Sweden and Norway'
    T.append(row('kalmar-union', 'Kalmar Union', '#7a5a8f', 'northern-europe', ku, span_=span(stretch(
        None, F(ku, 'year_start', 'start'), F(ku, 'year_end', 'end'), endEvent='swedish-war-of-liberation'))))
    T.append(row('denmark-norway', 'Denmark–Norway', '#a04a4a', 'northern-europe', dn, span_=span(stretch(
        None, F(dn, 'seg0.start', 'start'), F(dn, 'seg0.end', 'end'), endEvent='treaty-of-kiel'))))
    T.append(row('sweden-norway', 'Sweden–Norway', '#4a7aa0', 'northern-europe', sn, span_=span(stretch(
        None, F(sn, 'year_start', 'start'), F(sn, 'year_end', 'end'), startEvent='treaty-of-kiel', endEvent='union-dissolved-1905'))))

    T.append(row('denmark', 'Denmark', '#c0303a', 'northern-europe', 'Danish Realm',
                 span_=span(stretch(None, est('Danish Realm', 1), ongoing=G.ref('Danish Realm', 'infobox established_event1: Unification, c. 965 (current state)'))),
                 memberOf=[
        member('kalmar-union', F(ku, 'year_start', 'start'), F(ku, 'year_end', 'end'), sources=[lead(ku, 'three kingdoms of Denmark')]),
        member('denmark-norway', F(dn, 'seg0.start', 'start'), F(dn, 'seg0.end', 'end'), sources=[lead(dn, 'Denmark and Norway formed a personal union')],
               endEvent='treaty-of-kiel'),
    ]))
    T.append(row('norway', 'Norway', '#b04a5a', 'northern-europe', 'Norway',
                 # in unions with Denmark and then Sweden, Norway carried on as a kingdom: the lifespan runs through
                 span_=span(stretch(None, est('Norway', 1), ongoing=G.ref('Norway', 'infobox established_event8: Union dissolved, 1905 (current state)'))),
                 memberOf=[
        member('kalmar-union', est('Norway', 3), F(ku, 'year_end', 'end'), sources=[lead(ku, 'three kingdoms of Denmark')]),
        member('denmark-norway', F(dn, 'seg0.start', 'start') + est('Norway', 4), F(dn, 'seg0.end', 'end'),
               sources=[lead(dn, 'Denmark and Norway formed a personal union')], endEvent='treaty-of-kiel'),
        member('sweden-norway', F(sn, 'year_start', 'start'), F(sn, 'year_end', 'end'), sources=[lead(sn, 'personal union of the separate kingd')],
               startEvent='treaty-of-kiel', endEvent='union-dissolved-1905'),
    ]))
    se = 'Swedish Empire'
    T.append(row('sweden', 'Sweden', '#2a6ab0', 'northern-europe', 'Sweden',
                 span_=span(stretch(None, C(980, 'Sweden', 'infobox established_event1: A unified Swedish kingdom established, by the late 10th century',
                                            'The infobox says "by the late 10th century"; 980 stands for that.'),
                                    ongoing=G.ref('Sweden', 'lead: constitutional monarchy and a parliamentary democracy (current state)'), circa=True)),
                 phases=[phase('Swedish Empire', F(se, 'year_start', 'start'), F(se, 'year_end', 'end'), endEvent='great-northern-war')],
                 memberOf=[
        member('kalmar-union', L('Sweden', 'In 1397, Sweden joined', 1397), L('Sweden', 'In 1397, Sweden joined', 1523),
               sources=[lead('Sweden', 'In 1397, Sweden joined')], endEvent='swedish-war-of-liberation'),
        member('sweden-norway', F(sn, 'year_start', 'start'), F(sn, 'year_end', 'end'), sources=[lead(sn, 'personal union of the separate kingd')],
               startEvent='treaty-of-kiel', endEvent='union-dissolved-1905'),
    ]))
    gdf, fswr = 'Grand Duchy of Finland', "Finnish Socialist Workers' Republic"
    T.append(row('finland', 'Finland', '#4a8ac0', 'northern-europe', 'Finland', phases=[
        phase('Grand Duchy of Finland', F(gdf, 'year_start', 'start'), F(gdf, 'year_end', 'end'), endEvent='finnish-independence'),
        phase('Republic of Finland', est('Finland', 2), ongoing=cur('Finland', 3), startEvent='finnish-independence'),
        # the Reds' rival government during the civil war
        phase("Finnish Socialist Workers' Republic", F(fswr, 'year_start', 'start'), F(fswr, 'year_end', 'end')),
    ], memberOf=[member('russia', F(gdf, 'year_start', 'start'), F(gdf, 'year_end', 'end'), sources=[lead(gdf, 'autonomous region within the Russian Empire')],
                        endEvent='finnish-independence')]))
    kic = 'Kingdom of Iceland'
    T.append(row('iceland', 'Iceland', '#5a8ab0', 'northern-europe', 'Iceland', phases=[
        phase('Kingdom of Iceland', F(kic, 'year_start', 'start'), F(kic, 'year_end', 'end')),
        phase('Republic of Iceland', S1(kic, 'year_end'), ongoing=G.ref(kic, 'infobox event_end: Republic proclaimed, 17 June 1944 (current state)')),
    ]))
    gdl, lssr = 'Grand Duchy of Lithuania', 'Lithuanian Soviet Socialist Republic'
    T.append(row('lithuania', 'Lithuania', '#b08a2a', 'northern-europe', 'Lithuania', phases=[
        phase('Grand Duchy of Lithuania', F(gdl, 'seg0.start', 'start'), F(gdl, 'year_end', 'end'), endEvent='third-partition'),
        phase('Republic of Lithuania', est('Lithuania', 7), S1(lssr)),
        # the Soviet membership comes with the post-Soviet wave
        phase('Lithuanian SSR', F(lssr, 'year_start', 'start'), F(lssr, 'year_end', 'end')),
        phase('Republic of Lithuania (restored)', est('Lithuania', 9), ongoing=cur('Lithuania', 9)),
    ], memberOf=[
        member('polish-lithuanian-union', est('Lithuania', 4), C(*E(gdl, 3)[:1], gdl, E(gdl, 3)[1]['sourceLocation']),
               sources=[G.ref('Lithuania', 'infobox established_event4: Union with Poland, 1386')], endEvent='union-of-lublin'),
        member('polish-lithuanian-commonwealth', est('Lithuania', 5), F(gdl, 'year_end', 'end'),
               sources=[lead('Polish–Lithuanian Commonwealth', 'federative real union')], startEvent='union-of-lublin', endEvent='third-partition'),
        member('soviet-union', F(lssr, 'seg0.start', 'start'), F(lssr, 'seg0.end', 'end'), sources=[G.ref(lssr, 'infobox life span: 1940–1941 / (1941–1944: German occupation) / 1944–1990')],
               startEvent='soviet-occupation-of-the-baltic-states'),
        member('soviet-union', F(lssr, 'seg2.start', 'start'), F(lssr, 'seg2.end', 'end'), sources=[G.ref(lssr, 'infobox life span: 1940–1941 / (1941–1944: German occupation) / 1944–1990')],
               endEvent='dissolution-of-the-soviet-union'),
    ]))

    # ================= Western Europe =================
    hm, ae, ah = 'Habsburg monarchy', 'Austrian Empire', 'Austria-Hungary'
    T.append(row('habsburg-monarchy', 'Habsburg monarchy', '#c8a030', 'western-europe', hm, phases=[
        phase('Habsburg monarchy', F(hm, 'year_start', 'start'), F(ae, 'year_start', 'start')),
        phase('Austrian Empire', F(ae, 'year_start', 'start'), F(ae, 'year_end', 'end'), endEvent='compromise-1867'),
        phase('Austria-Hungary', F(ah, 'year_start', 'start'), F(ah, 'seg0.end', 'end'), startEvent='compromise-1867', endEvent='dissolution-of-austria-hungary'),
    ]))
    aa, gea, far, fsa, aoa = 'Archduchy of Austria', 'Republic of German-Austria', 'First Austrian Republic', 'Federal State of Austria', 'Allied-occupied Austria'
    T.append(row('austria', 'Austria', '#d04040', 'western-europe', 'Austria', phases=[
        phase('Archduchy of Austria', F(aa, 'year_start', 'start'), F(aa, 'year_end', 'end'), endEvent='dissolution-of-austria-hungary'),
        phase('Republic of German-Austria', F(gea, 'year_start', 'start'), F(gea, 'year_end', 'end'), startEvent='dissolution-of-austria-hungary'),
        phase('First Republic', F(far, 'year_start', 'start'), F(far, 'year_end', 'end')),
        phase('Federal State of Austria', F(fsa, 'year_start', 'start'), F(fsa, 'year_end', 'end'), endEvent='anschluss'),
        phase('Allied-occupied Austria', F(aoa, 'year_start', 'start'), F(aoa, 'year_end', 'end'), endEvent='austrian-state-treaty'),
        phase('Second Republic', est('Austria', 12), ongoing=cur('Austria', 12), startEvent='austrian-state-treaty'),
    ], memberOf=[
        member('hre', F(aa, 'year_start', 'start'), F('Holy Roman Empire', 'date_end', 'end'),
               sources=[lead(aa, 'history as an imperial state ended')], endEvent='hre-dissolved'),
        member('habsburg-monarchy', F(aa, 'year_start', 'start'), F(aa, 'year_end', 'end'),
               sources=[lead(aa, 'ruled by the Habsburg Dynasty')], endEvent='dissolution-of-austria-hungary'),
        member('german-confederation', F('German Confederation', 'seg0.start', 'start'), F('German Confederation', 'seg1.end', 'end'),
               sources=[lead('German Confederation', 'Austrian')], startEvent='gc-founded', endEvent='austro-prussian-war'),
    ]))
    osc, hr, nap = 'Old Swiss Confederacy', 'Helvetic Republic', 'Switzerland in the Napoleonic era'
    T.append(row('switzerland', 'Switzerland', '#c03030', 'western-europe', 'Switzerland', phases=[
        phase('Old Swiss Confederacy', F(osc, 'year_start', 'start'), F(osc, 'year_end', 'end'), endEvent='french-invasion-of-switzerland'),
        phase('Helvetic Republic', F(hr, 'year_start', 'start'), F(hr, 'year_end', 'end'), startEvent='french-invasion-of-switzerland'),
        phase('Swiss Confederation (Act of Mediation)', F(nap, 'year_start', 'start'), F(nap, 'year_end', 'end')),
        phase('Restored Confederation', est('Switzerland', 3), est('Switzerland', 4), endEvent='swiss-federal-state'),
        phase('Swiss federal state', est('Switzerland', 4), ongoing=cur('Switzerland', 4), startEvent='swiss-federal-state'),
    ]))
    hn, sp, spn, an = 'Habsburg Netherlands', 'Seventeen Provinces', 'Spanish Netherlands', 'Austrian Netherlands'
    T.append(row('habsburg-netherlands', 'Habsburg Netherlands', '#b07a3a', 'western-europe', hn, span_=span(stretch(
        None, F(hn, 'year_start', 'start'), F(sp, 'year_end', 'end'), endEvent='act-of-abjuration'))))
    dr, br, koh, spun, ukn = 'Dutch Republic', 'Batavian Republic', 'Kingdom of Holland', 'Sovereign Principality of the United Netherlands', 'United Kingdom of the Netherlands'
    T.append(row('netherlands', 'Netherlands', '#e07020', 'western-europe', 'Kingdom of the Netherlands',
                 # annexed to France 1810–13 with no government of its own: the lifespan carries the row across
                 span_=span(stretch(None, F(dr, 'date_pre', 'start'), ongoing=G.ref('Kingdom of the Netherlands', 'infobox established_event5: Kingdom of the Netherlands, 1815 (current state)'))),
                 phases=[
        phase('Dutch Republic', F(dr, 'date_pre', 'start'), F(dr, 'year_end', 'end'), startEvent='act-of-abjuration', endEvent='batavian-revolution'),
        phase('Batavian Republic', F(br, 'year_start', 'start'), F(br, 'year_end', 'end'), startEvent='batavian-revolution'),
        phase('Kingdom of Holland', F(koh, 'seg0.start', 'start'), F(koh, 'seg0.end', 'end')),
        phase('Sovereign Principality', F(spun, 'year_start', 'start'), F(spun, 'year_end', 'end')),
        phase('United Kingdom of the Netherlands', F(ukn, 'year_start', 'start'), F(ukn, 'year_end', 'end')),
        phase('Kingdom of the Netherlands', S1(ukn, 'year_end'), ongoing=G.ref('Kingdom of the Netherlands', 'infobox established_event5: Kingdom of the Netherlands, 1815 (current state)')),
    ], memberOf=[
        member('france', est('Kingdom of Holland', 2), F(spun, 'year_start', 'start'),
               sources=[G.ref('Kingdom of Holland', 'infobox established_event2: Annexed by France, 1810')]),
    ]))
    T.append(row('belgium', 'Belgium', '#d0a020', 'western-europe', 'Belgium',
                 span_=span(stretch(None, F(sp, 'year_end', 'end'), ongoing=cur('Belgium', 3))),
                 phases=[
        phase('Spanish Netherlands', F(sp, 'year_end', 'end') + F(spn, 'year_start', 'start'), F(spn, 'year_end', 'end'),
              startEvent='act-of-abjuration', endEvent='treaty-of-rastatt'),
        phase('Austrian Netherlands', F(an, 'seg0.start', 'start'), F(an, 'date_end', 'end'), startEvent='treaty-of-rastatt'),
        phase('Kingdom of Belgium', est('Belgium', 1), ongoing=cur('Belgium', 3), startEvent='belgian-revolution'),
    ], memberOf=[
        member('spain', F(sp, 'year_end', 'end'), F(spn, 'year_end', 'end'), sources=[lead(spn, 'held in personal union by the Spanish Habsburgs')],
               startEvent='act-of-abjuration', endEvent='treaty-of-rastatt'),
        member('habsburg-monarchy', F(an, 'seg0.start', 'start'), F(an, 'date_end', 'end'), sources=[lead(an, 'acquisition by the Austrian Habsburg monarchy')],
               startEvent='treaty-of-rastatt'),
        member('france', F(an, 'date_end', 'end'), F(ukn, 'year_start', 'start'),
               sources=[G.ref(an, 'infobox event_end: Battle of Sprimont, 18 September 1794'), G.ref(an, 'infobox event_post: Treaty of Campo Formio, 17 October 1797')]),
        member('netherlands', F(ukn, 'year_start', 'start'), est('Belgium', 1), sources=[G.ref('Kingdom of the Netherlands', 'infobox established_event6: Secession of Belgium, 1830–1839')],
               endEvent='belgian-revolution'),
    ]))
    T.append(row('luxembourg', 'Luxembourg', '#5aa0c0', 'western-europe', 'Luxembourg', span_=span(stretch(
        None, est('Luxembourg', 1), ongoing=cur('Luxembourg', 4)))))
    T.append(row('liechtenstein', 'Liechtenstein', '#3a5ac0', 'western-europe', 'Liechtenstein',
                 span_=span(stretch(None, est('Liechtenstein', 1), ongoing=cur('Liechtenstein', 3))),
                 memberOf=[
        member('hre', est('Liechtenstein', 1), est('Liechtenstein', 2), sources=[G.ref('Liechtenstein', 'infobox established_event1: Union between Vaduz and Schellenberg, 1719')],
               endEvent='hre-dissolved'),
        member('confederation-of-the-rhine', est('Liechtenstein', 2), F('Confederation of the Rhine', 'year_end', 'end'),
               sources=[G.ref('Liechtenstein', 'infobox established_event2: Treaty of Pressburg, 1806')]),
        member('german-confederation', F('German Confederation', 'seg0.start', 'start'), est('Liechtenstein', 3),
               sources=[lead('Liechtenstein', 'dissolution of the German Confederation')], startEvent='gc-founded', endEvent='austro-prussian-war'),
    ]))
    T.append(row('monaco', 'Monaco', '#d03050', 'western-europe', 'Monaco', span_=span(stretch(
        None, est('Monaco', 1), ongoing=cur('Monaco', 5)))))
    db = 'Duchy of Burgundy'
    T.append(row('duchy-of-burgundy', 'Duchy of Burgundy', '#8a3a5a', 'western-europe', db, span_=span(stretch(
        None, F(db, 'year_start', 'start'), F(db, 'year_end', 'end')))))
    cor = 'Confederation of the Rhine'
    T.append(row('confederation-of-the-rhine', 'Confederation of the Rhine', '#7a8a3a', 'western-europe', cor, span_=span(stretch(
        None, F(cor, 'year_start', 'start'), F(cor, 'year_end', 'end'), startEvent='hre-dissolved'))))

    # ================= Southern Europe =================
    cc, hs, bs, sjb, fsr, ssr, fs = ('Crown of Castile', 'Habsburg Spain', 'History of Spain (1700–1808)', 'Spain under Joseph Bonaparte',
                                     'First Spanish Republic', 'Second Spanish Republic', 'Francoist Spain')
    T.append(row('spain', 'Spain', '#c8302a', 'southern-europe', 'Spain', phases=[
        phase('Crown of Castile', F(cc, 'year_start', 'start'), S1(hs)),
        phase('Habsburg Spain', F(hs, 'year_start', 'start'), F(hs, 'year_end', 'end'), endEvent='war-of-the-spanish-succession'),
        phase('Bourbon Spain', F(bs, 'year_start', 'start'), F(bs, 'year_end', 'end')),
        # Joseph Bonaparte's kingdom against the patriot juntas and the Cortes of Cádiz: rival phases
        phase('Kingdom under Joseph Bonaparte', F(sjb, 'year_start', 'start'), F(sjb, 'year_end', 'end')),
        phase('Patriot Spain and the Cortes of Cádiz', F(bs, 'year_end', 'end'), F(sjb, 'year_end', 'end')),
        phase('Constitutional monarchy', F(sjb, 'year_end', 'end'), S1(fsr)),
        phase('First Spanish Republic', F(fsr, 'year_start', 'start'), F(fsr, 'year_end', 'end')),
        # "Restoration (Spain)" carries an AI-generated-text flag, so the neighbouring articles date it
        phase('Restoration monarchy', F(fsr, 'year_end', 'end'), S1(ssr)),
        phase('Second Spanish Republic', F(ssr, 'year_start', 'start'), F(ssr, 'year_end', 'end'), endEvent='spanish-civil-war'),
        phase('Francoist Spain', F(fs, 'seg0.start', 'start'), F(fs, 'seg0.end', 'end'), startEvent='spanish-civil-war'),
        phase('Kingdom of Spain', F(fs, 'seg0.end', 'end'), ongoing=cur('Spain', 5)),
    ], memberOf=[
        member('iberian-union', F('Iberian Union', 'year_start', 'start'), F('Iberian Union', 'year_end', 'end'),
               sources=[lead('Iberian Union', 'Monarchy of Spain under the Habsburg')], endEvent='portuguese-restoration-war'),
    ]))
    ca = 'Crown of Aragon'
    T.append(row('crown-of-aragon', 'Crown of Aragon', '#d0a040', 'southern-europe', ca,
                 span_=span(stretch(None, F(ca, 'year_start', 'start'), F(ca, 'year_end', 'end') + C(1716, ca, 'lead: Nueva Planta decrees, 1707–1716'),
                                    endEvent='war-of-the-spanish-succession')),
                 memberOf=[member('spain', est('Spain', 1), F(ca, 'year_end', 'end'), sources=[lead(ca, 'new dynastic union of the Crown of Aragon')],
                                  endEvent='war-of-the-spanish-succession')]))
    kn = 'Kingdom of Navarre'
    T.append(row('navarre', 'Navarre', '#a03a5a', 'southern-europe', kn,
                 span_=span(stretch(None, F(kn, 'year_start', 'start'), F(kn, 'year_end', 'end'))),
                 memberOf=[member('spain', L(kn, 'annexed by the Courts of Castile', 1515), F(kn, 'year_end', 'end'),
                                  sources=[lead(kn, 'annexed by the Courts of Castile')])]))
    kar = 'Kingdom of Aragon'
    T.append(row('aragon', 'Kingdom of Aragon', '#c0702a', 'southern-europe', kar,
                 span_=span(stretch(None, F(kar, 'year_start', 'start'), F(kar, 'year_end', 'end'), endEvent='war-of-the-spanish-succession')),
                 memberOf=[member('crown-of-aragon', F(ca, 'year_start', 'start'), F(kar, 'year_end', 'end'), sources=[G.ref(ca, 'infobox event_start: Aragon–Barcelona Union, 1162')],
                                  endEvent='war-of-the-spanish-succession')]))
    for id_, name, color, t in [('catalonia', 'Principality of Catalonia', '#d0b030', 'Principality of Catalonia'),
                                ('kingdom-of-valencia', 'Kingdom of Valencia', '#c08040', 'Kingdom of Valencia')]:
        T.append(row(id_, name, color, 'southern-europe', t,
                     span_=span(stretch(None, F(t, 'year_start', 'start'), F(t, 'year_end', 'end'))),
                     memberOf=[member('crown-of-aragon', F(t, 'year_start', 'start'), F(ca, 'year_end', 'end'),
                                      sources=[lead(t, 'dynastic union, later known as the Crown of Aragon' if id_ == 'catalonia' else 'other components of the old crown of Aragon')], endEvent='war-of-the-spanish-succession')]))
    iu = 'Iberian Union'
    T.append(row('iberian-union', 'Iberian Union', '#9a6a3a', 'southern-europe', iu, span_=span(stretch(
        None, F(iu, 'year_start', 'start'), F(iu, 'year_end', 'end'), endEvent='portuguese-restoration-war'))))
    kp, fpr, dn_, en = 'Kingdom of Portugal', 'First Portuguese Republic', 'Ditadura Nacional', 'Estado Novo (Portugal)'
    T.append(row('portugal', 'Portugal', '#2a8a3a', 'southern-europe', 'Portugal', phases=[
        phase('Kingdom of Portugal', F(kp, 'year_start', 'start'), F(kp, 'year_end', 'end'), endEvent='revolution-1910'),
        phase('First Republic', F(fpr, 'year_start', 'start'), F(fpr, 'year_end', 'end'), startEvent='revolution-1910'),
        phase('Ditadura Nacional', F(dn_, 'year_start', 'start'), F(dn_, 'year_end', 'end')),
        phase('Estado Novo', F(en, 'year_start', 'start'), F(en, 'year_end', 'end'), endEvent='carnation-revolution'),
        phase('Revolutionary transition', F(en, 'year_end', 'end'), est('Portugal', 9), startEvent='carnation-revolution'),
        phase('Third Republic', est('Portugal', 9), ongoing=cur('Portugal', 9)),
    ], memberOf=[
        member('iberian-union', F(iu, 'year_start', 'start'), F(iu, 'year_end', 'end'), sources=[lead(iu, 'Monarchy of Spain under the Habsburg')],
               endEvent='portuguese-restoration-war'),
    ]))

    sav, ksa, ki_, rsi = 'Duchy of Savoy', 'Kingdom of Sardinia', 'Kingdom of Italy', 'Italian Social Republic'
    # the Duchy of Savoy is its own row (it went to France in 1860); the Savoyard kingdom of 1720 carries on as Italy
    T.append(row('savoy', 'Savoy', '#5a7a9a', 'southern-europe', sav, phases=[
        phase('Duchy of Savoy', F(sav, 'seg0.start', 'start'), F(sav, 'seg0.end', 'end')),
        phase('Duchy of Savoy (restored)', F(sav, 'seg1.start', 'start'), F(sav, 'seg1.end', 'end')),
    ], memberOf=[
        member('italy', L(ksa, 'In 1720, the island', 1720), F(sav, 'seg0.end', 'end'), sources=[lead(ksa, 'possession of the Savoyard state')]),
        member('italy', F(sav, 'seg1.start', 'start'), F(sav, 'seg1.end', 'end'), sources=[lead(ksa, 'returned to Savoy its mainland possessions')]),
    ]))
    T.append(row('italy', 'Italy', '#2a9a5a', 'southern-europe', 'Italy', phases=[
        phase('Kingdom of Sardinia', L(ksa, 'In 1720, the island', 1720), S1(ki_), endEvent='kingdom-of-italy-proclaimed'),
        phase('Kingdom of Italy', F(ki_, 'year_start', 'start'), F(ki_, 'year_end', 'end'), startEvent='kingdom-of-italy-proclaimed'),
        phase('Italian Social Republic', F(rsi, 'year_start', 'start'), F(rsi, 'year_end', 'end')),
        phase('Italian Republic', est('Italy', 7), ongoing=cur('Italy', 7)),
    ]))
    ps, vc = 'Papal States', 'Vatican City'
    T.append(row('papal-states', 'Papal States and Vatican City', '#e0c040', 'southern-europe', ps,
                 # 1870–1929 the Holy See had no territory but carried on: the lifespan runs through
                 span_=span(stretch(None, F(ps, 'year_start', 'start'), ongoing=cur(vc, 1))),
                 phases=[
        phase('Papal States', F(ps, 'year_start', 'start'), F(ps, 'year_end', 'end'), endEvent='capture-of-rome'),
        phase('Vatican City', est(vc, 1), ongoing=cur(vc, 1), startEvent='lateran-treaty'),
    ]))
    for id_, name, color, t in [('venice', 'Republic of Venice', '#b03a3a', 'Republic of Venice'),
                                ('genoa', 'Republic of Genoa', '#8a3ab0', 'Republic of Genoa')]:
        T.append(row(id_, name, color, 'southern-europe', t, span_=span(stretch(
            None, F(t, 'year_start', 'start'), F(t, 'seg0.end' if id_ == 'genoa' else 'year_end', 'end'), endEvent='treaty-of-campo-formio'))))
    dm = 'Duchy of Milan'
    T.append(row('milan', 'Duchy of Milan', '#6a8a3a', 'southern-europe', dm, span_=span(stretch(
        None, F(dm, 'seg0.start', 'start'), F(dm, 'seg1.end', 'end')))))
    rf, df, gdt = 'Republic of Florence', 'Duchy of Florence', 'Grand Duchy of Tuscany'
    T.append(row('florence', 'Florence and Tuscany', '#a05a2a', 'southern-europe', gdt, phases=[
        phase('Republic of Florence', F(rf, 'year_start', 'start'), S1(df)),
        phase('Duchy of Florence', F(df, 'year_start', 'start'), F(df, 'year_end', 'end')),
        phase('Grand Duchy of Tuscany', F(gdt, 'seg0.start', 'start'), F(gdt, 'seg0.end', 'end')),
        phase('Grand Duchy of Tuscany (restored)', F(gdt, 'seg1.start', 'start'), F(gdt, 'seg1.end', 'end')),
    ]))
    kna, nn, kts, ksi = 'Kingdom of Naples', 'Kingdom of Naples (Napoleonic)', 'Kingdom of the Two Sicilies', 'Kingdom of Sicily'
    T.append(row('naples', 'Naples and the Two Sicilies', '#4a7a3a', 'southern-europe', kts, phases=[
        phase('Kingdom of Naples', F(kna, 'seg0.start', 'start'), F(kna, 'seg0.end', 'end')),
        phase('Napoleonic Kingdom of Naples', F(nn, 'year_start', 'start'), F(nn, 'year_end', 'end')),
        phase('Kingdom of the Two Sicilies', F(kts, 'seg0.start', 'start'), F(kts, 'year_end', 'end'), startEvent='two-sicilies', endEvent='kingdom-of-italy-proclaimed'),
    ]))
    T.append(row('sicily', 'Sicily', '#6a9a4a', 'southern-europe', ksi, phases=[
        phase('Kingdom of Sicily', F(ksi, 'year_start', 'start'), F(ksi, 'year_end', 'end'), endEvent='two-sicilies')]))
    rr = 'Republic of Ragusa'
    T.append(row('ragusa', 'Republic of Ragusa', '#3a8a8a', 'southern-europe', rr, span_=span(stretch(
        None, F(rr, 'year_start', 'start'), F(rr, 'year_end', 'end')))))
    hrh, hma = 'Hospitaller Rhodes', 'Hospitaller Malta'
    T.append(row('knights-hospitaller', 'Knights Hospitaller', '#5a3a2a', 'southern-europe', hma,
                 span_=span(stretch(None, F(hrh, 'year_start', 'start'), F(hma, 'year_end', 'end'), endEvent='french-invasion-of-malta')),
                 phases=[
        phase('Hospitaller Rhodes', F(hrh, 'year_start', 'start'), F(hrh, 'year_end', 'end'), endEvent='siege-of-rhodes'),
        phase('Hospitaller Malta', F(hma, 'year_start', 'start'), F(hma, 'year_end', 'end'), endEvent='french-invasion-of-malta'),
    ]))
    fom, mp, ccm, som = 'French occupation of Malta', 'Malta Protectorate', 'Crown Colony of Malta', 'State of Malta'
    T.append(row('malta', 'Malta', '#c04040', 'southern-europe', 'Malta', phases=[
        phase('French occupation', F(fom, 'year_start', 'start'), F(fom, 'year_end', 'end'), startEvent='french-invasion-of-malta'),
        phase('Malta Protectorate', F(mp, 'year_start', 'start'), F(mp, 'year_end', 'end')),
        phase('Crown Colony of Malta', F(ccm, 'year_start', 'start'), F(ccm, 'year_end', 'end'), endEvent='maltese-independence'),
        phase('State of Malta', F(som, 'year_start', 'start'), F(som, 'year_end', 'end'), startEvent='maltese-independence'),
        phase('Republic of Malta', est('Malta', 2), ongoing=cur('Malta', 2)),
    ], memberOf=[
        member('british-empire', F(mp, 'year_start', 'start'), F(ccm, 'year_end', 'end'),
               sources=[G.ref(mp, 'infobox event_start: Surrendered to the British, 4 September 1800')], endEvent='maltese-independence'),
    ]))
    T.append(row('san-marino', 'San Marino', '#4a9ac0', 'southern-europe', 'San Marino', span_=span(stretch(
        None, est('San Marino', 1), ongoing=cur('San Marino', 3)))))
    T.append(row('andorra', 'Andorra', '#3a6aa0', 'southern-europe', 'Andorra', span_=span(stretch(
        None, est('Andorra', 1), ongoing=cur('Andorra', 5)))))

    fhr, kg, shr, hst, gj = 'First Hellenic Republic', 'Kingdom of Greece', 'Second Hellenic Republic', 'Hellenic State (1941–1944)', 'Greek junta'
    T.append(row('greece', 'Greece', '#2a6ad0', 'southern-europe', 'Greece', phases=[
        phase('First Hellenic Republic', F(fhr, 'year_start', 'start'), F(fhr, 'year_end', 'end'), startEvent='greek-war-of-independence'),
        phase('Kingdom of Greece', F(kg, 'seg0.start', 'start'), F(kg, 'seg0.end', 'end')),
        phase('Second Hellenic Republic', F(shr, 'year_start', 'start'), F(shr, 'year_end', 'end')),
        phase('Kingdom of Greece (restored)', F(kg, 'seg1.start', 'start'), F(kg, 'seg1.end', 'end')),
        # the collaborationist state and the colonels' regime ran alongside the monarchy: rival phases
        phase('Hellenic State (Axis occupation)', F(hst, 'year_start', 'start'), F(hst, 'year_end', 'end')),
        phase('Military junta', F(gj, 'year_start', 'start'), F(gj, 'year_end', 'end')),
        phase('Third Hellenic Republic', est('Greece', 8), ongoing=cur('Greece', 9)),
    ]))
    pal, ar, ak, aki, psra = ('Principality of Albania', 'Albanian Republic (1925–1928)', 'Albanian Kingdom (1928–1939)',
                              'Kingdom of Albania in personal union with Italy', "People's Socialist Republic of Albania")
    T.append(row('albania', 'Albania', '#c02030', 'southern-europe', 'Albania',
                 span_=span(stretch(None, est('Albania', 8), ongoing=cur('Albania', 15))),
                 phases=[
        phase('Provisional Government', est('Albania', 8), S1(pal)),
        phase('Principality of Albania', F(pal, 'year_start', 'start'), F(pal, 'year_end', 'end')),
        phase('Albanian Republic', F(ar, 'year_start', 'start'), F(ar, 'year_end', 'end')),
        phase('Albanian Kingdom', F(ak, 'year_start', 'start'), F(ak, 'year_end', 'end'), endEvent='italian-invasion-of-albania'),
        phase('Kingdom of Albania (under Italy)', F(aki, 'year_start', 'start'), F(aki, 'year_end', 'end'), startEvent='italian-invasion-of-albania'),
        phase("People's Socialist Republic", F(psra, 'year_start', 'start'), F(psra, 'year_end', 'end')),
        phase('Republic of Albania', est('Albania', 14), ongoing=cur('Albania', 15)),
    ], memberOf=[
        member('italy', F(aki, 'year_start', 'start'), F(aki, 'year_end', 'end'), sources=[lead(aki, 'personal union with the Kingdom of Italy')],
               startEvent='italian-invasion-of-albania'),
    ]))
    pbm, pm, km, srm = 'Prince-Bishopric of Montenegro', 'Principality of Montenegro', 'Kingdom of Montenegro', 'Socialist Republic of Montenegro'
    T.append(row('montenegro', 'Montenegro', '#a0302a', 'southern-europe', 'Montenegro',
                 # 1918–44 inside Yugoslavia with no government of its own: the lifespan carries it across
                 span_=span(stretch(None, F(pbm, 'year_start', 'start'), ongoing=cur('Montenegro', 10))),
                 phases=[
        phase('Prince-Bishopric of Montenegro', F(pbm, 'year_start', 'start'), F(pbm, 'year_end', 'end')),
        phase('Principality of Montenegro', F(pm, 'year_start', 'start'), F(pm, 'year_end', 'end')),
        phase('Kingdom of Montenegro', F(km, 'year_start', 'start'), F(km, 'year_end', 'end'), endEvent='yugoslavia-created'),
        phase('Socialist Republic of Montenegro', F(srm, 'year_start', 'start'), F(srm, 'year_end', 'end'), endEvent='fry-proclaimed'),
        phase('Republic of Montenegro (in FR Yugoslavia)', est('Montenegro', 9), est('Montenegro', 10), startEvent='fry-proclaimed',
              endEvent='montenegro-independence'),
        phase('Montenegro', est('Montenegro', 10), ongoing=cur('Montenegro', 10), startEvent='montenegro-independence'),
    ], memberOf=[
        member('yugoslavia', est('Montenegro', 7), est('Montenegro', 9), sources=[G.ref('Montenegro', 'infobox established_event7: Kingdom of Yugoslavia, 1918'),
                                                                                   G.ref('Montenegro', 'infobox established_event8: SFR Yugoslavia, 1945')],
               startEvent='yugoslavia-created', endEvent='fry-proclaimed'),
        member('serbia-and-montenegro', est('Montenegro', 9), est('Montenegro', 10), sources=[G.ref('Montenegro', 'infobox established_event9: Serbia and Montenegro, 1992')],
               startEvent='fry-proclaimed', endEvent='montenegro-independence'),
    ]))
    be, bv, ahb, srb_, rbh, bih = ('Bosnia Eyalet', 'Bosnia vilayet', 'Austro-Hungarian rule in Bosnia and Herzegovina',
                                  'Socialist Republic of Bosnia and Herzegovina', 'Republic of Bosnia and Herzegovina', 'Bosnia and Herzegovina')
    T.append(row('bosnia-and-herzegovina', 'Bosnia and Herzegovina', '#3a5ab0', 'southern-europe', bih,
                 span_=span(stretch(None, F('Banate of Bosnia', 'year_start', 'start'), ongoing=cur(bih, 12))),
                 phases=[
        phase('Bosnia Eyalet', F(be, 'year_start', 'start'), F(be, 'year_end', 'end')),
        # Austria-Hungary took it over in 1878; the Ottoman title lasted until the 1908 annexation
        phase('Bosnia Vilayet', F(bv, 'year_start', 'start'),
              C(1878, bv, 'infobox life span: 1867–1878 de facto, 1908 de jure', 'Ottoman rule ended de facto in 1878.') + F(bv, 'year_end', 'end'),
              endEvent='congress-of-berlin'),
        phase('Austro-Hungarian rule', F(ahb, 'year_start', 'start'), F(ahb, 'year_end', 'end'), startEvent='congress-of-berlin', endEvent='yugoslavia-created'),
        phase('Socialist Republic of Bosnia and Herzegovina', F(srb_, 'year_start', 'start'), F(srb_, 'year_end', 'end'), endEvent='bosnian-war'),
        phase('Republic of Bosnia and Herzegovina', F(rbh, 'year_start', 'start'), F(rbh, 'year_end', 'end'), startEvent='bosnian-war', endEvent='dayton-agreement'),
        phase('Bosnia and Herzegovina (Dayton)', est(bih, 12), ongoing=cur(bih, 12), startEvent='dayton-agreement'),
    ], memberOf=[
        member('ottoman-empire', est(bih, 4), F(bv, 'year_end', 'end'),
               sources=[G.ref(bih, 'infobox established_event4: Ottoman conquest, 1463'), G.ref(bv, 'infobox life span: 1867–1878 de facto, 1908 de jure')]),
        member('habsburg-monarchy', F(ahb, 'year_start', 'start'), F(ahb, 'year_end', 'end'),
               sources=[G.ref(bih, 'infobox established_event5: Austro-Hungarian conquest and occupation, 1878')], startEvent='congress-of-berlin',
               endEvent='dissolution-of-austria-hungary'),
        member('yugoslavia', est(bih, 7), F(srb_, 'year_end', 'end'), sources=[G.ref(bih, 'infobox established_event7: Absorbed into the Kingdom of Yugoslavia, 1918')],
               startEvent='yugoslavia-created', endEvent='bosnian-war'),
    ]))
    srmk = 'Socialist Republic of Macedonia'
    T.append(row('north-macedonia', 'North Macedonia', '#d07a20', 'southern-europe', 'North Macedonia', phases=[
        phase('Socialist Republic of Macedonia', F(srmk, 'year_start', 'start'), F(srmk, 'year_end', 'end')),
        phase('Republic of North Macedonia', est('North Macedonia', 2), ongoing=cur('North Macedonia', 2)),
    ], memberOf=[member('yugoslavia', F(srmk, 'year_start', 'start'), F(srmk, 'year_end', 'end'),
                        sources=[G.ref('North Macedonia', 'infobox established_event1: Socialist Republic of Macedonia, 1944')])]))
    srsl = 'Socialist Republic of Slovenia'
    T.append(row('slovenia', 'Slovenia', '#3a8ac0', 'southern-europe', 'Slovenia',
                 span_=span(stretch(None, est('Slovenia', 3), ongoing=cur('Slovenia', 8))),
                 phases=[
        phase('Socialist Republic of Slovenia', F(srsl, 'year_start', 'start'), F(srsl, 'year_end', 'end'), endEvent='ten-day-war'),
        phase('Republic of Slovenia', est('Slovenia', 6), ongoing=cur('Slovenia', 8), startEvent='ten-day-war'),
    ], memberOf=[member('yugoslavia', est('Slovenia', 3), est('Slovenia', 6),
                        sources=[G.ref('Slovenia', 'infobox established_event3: Kingdom of Serbs, Croats and Slovenes, 1918')],
                        startEvent='yugoslavia-created', endEvent='ten-day-war')]))
    sapk = 'Socialist Autonomous Province of Kosovo'
    T.append(row('kosovo', 'Kosovo (disputed)', '#4a6ad0', 'southern-europe', 'Kosovo', phases=[
        phase('Socialist Autonomous Province of Kosovo', F(sapk, 'year_start', 'start'), F(sapk, 'year_end', 'end')),
        # the parallel Republic of Kosova (1990–99) ran alongside Serbian rule
        phase('Republic of Kosova (parallel government)', est('Kosovo', 5), est('Kosovo', 7)),
        phase('UN administration', est('Kosovo', 7), est('Kosovo', 8), startEvent='kosovo-war', endEvent='kosovo-independence'),
        phase('Republic of Kosovo', est('Kosovo', 8), ongoing=G.ref('Kosovo', 'infobox established_event8: Declaration of independence, 2008 (current state; Serbia does not recognise it)'),
              startEvent='kosovo-independence'),
    ], memberOf=[member('serbia', F(sapk, 'year_start', 'start'), est('Kosovo', 7),
                        sources=[G.ref('Kosovo', 'infobox established_event4: Autonomous Province within Yugoslavia, 1946')], endEvent='kosovo-war')]))

    # ================= Eastern Europe =================
    sto = 'State of the Teutonic Order'
    T.append(row('teutonic-order', 'State of the Teutonic Order', '#4a4a4a', 'eastern-europe', sto, span_=span(stretch(
        None, F(sto, 'year_start', 'start'), F(sto, 'year_end', 'end')))))
    gdl_ = 'Grand Duchy of Lithuania'
    T.append(row('polish-lithuanian-union', 'Polish–Lithuanian union', '#a05060', 'eastern-europe', 'Polish–Lithuanian union', span_=span(stretch(
        None, C(*E(gdl_, 2)[:1], gdl_, E(gdl_, 2)[1]['sourceLocation']), C(*E(gdl_, 3)[:1], gdl_, E(gdl_, 3)[1]['sourceLocation']), endEvent='union-of-lublin'))))
    plc = 'Polish–Lithuanian Commonwealth'
    T.append(row('polish-lithuanian-commonwealth', 'Polish–Lithuanian Commonwealth', '#a03050', 'eastern-europe', plc, span_=span(stretch(
        None, F(plc, 'year_start', 'start'), F(plc, 'year_end', 'end'), startEvent='union-of-lublin', endEvent='third-partition'))))
    ckp, dw, cp, kpr, spr, pge, pgnu, ppr = ('Crown of the Kingdom of Poland', 'Duchy of Warsaw', 'Congress Poland', 'Kingdom of Poland (1917–1918)',
                                            'Second Polish Republic', 'Polish government-in-exile', 'Provisional Government of National Unity',
                                            "Polish People's Republic")
    T.append(row('poland', 'Poland', '#d02040', 'eastern-europe', 'Poland', phases=[
        phase('Crown of the Kingdom of Poland', F(ckp, 'year_start', 'start'), F(ckp, 'year_end', 'end'), endEvent='third-partition'),
        phase('Duchy of Warsaw', F(dw, 'year_start', 'start'), F(dw, 'year_end', 'end')),
        # Congress Poland's ties to the Russian Empire come with the post-Soviet wave
        phase('Congress Poland', F(cp, 'seg0.start', 'start'), F(cp, 'seg0.end', 'end')),
        phase('Kingdom of Poland (1917–18)', F(kpr, 'year_start', 'start'), F(kpr, 'year_end', 'end')),
        phase('Second Polish Republic', F(spr, 'seg0.start', 'start'), F(spr, 'seg0.end', 'end'), endEvent='invasion-of-poland'),
        phase('Government-in-exile', F(pge, 'year_start', 'start'), F(pge, 'year_end', 'end'), startEvent='invasion-of-poland'),
        phase('Provisional Government of National Unity', F(pgnu, 'year_start', 'start'), F(pgnu, 'year_end', 'end')),
        phase("Polish People's Republic", F(ppr, 'year_start', 'start'), F(ppr, 'year_end', 'end'), endEvent='revolutions-of-1989'),
        phase('Third Republic', est('Poland', 7), ongoing=cur('Poland', 7), startEvent='revolutions-of-1989'),
    ], memberOf=[
        member('polish-lithuanian-union', C(*E(gdl_, 2)[:1], gdl_, E(gdl_, 2)[1]['sourceLocation']), C(*E(gdl_, 3)[:1], gdl_, E(gdl_, 3)[1]['sourceLocation']),
               sources=[lead(plc, 'personal union since the Krewo Agreement')], endEvent='union-of-lublin'),
        member('polish-lithuanian-commonwealth', F(plc, 'year_start', 'start'), F(plc, 'year_end', 'end'),
               sources=[lead(plc, 'federative real union')], startEvent='union-of-lublin', endEvent='third-partition'),
        member('russia', F(cp, 'seg0.start', 'start'), F(cp, 'seg0.end', 'end'), sources=[lead(cp, 'in personal union with the')])]))

    kh, rh, ehk, fhr_, hsr, kh2, shr2, hpr = ('Kingdom of Hungary', 'Kingdom of Hungary (1526–1867)', 'Eastern Hungarian Kingdom', 'First Hungarian Republic',
                                             'Hungarian Soviet Republic', 'Kingdom of Hungary (1920–1946)', 'Second Hungarian Republic', "Hungarian People's Republic")
    T.append(row('hungary', 'Hungary', '#3a8a4a', 'eastern-europe', 'Hungary',
                 span_=span(stretch(None, F('Principality of Hungary', 'seg0.start', 'start'), ongoing=cur('Hungary', 11))),
                 phases=[
        phase('Kingdom of Hungary', F(kh, 'year_start', 'start'), S1(rh), endEvent='battle-of-mohacs'),
        # after Mohács two kings were elected: the Habsburg kingdom and John Zápolya's eastern kingdom (rival phases)
        phase('Royal Hungary (Habsburg)', F(rh, 'year_start', 'start'), F(rh, 'year_end', 'end'), startEvent='battle-of-mohacs', endEvent='compromise-1867'),
        phase('Eastern Hungarian Kingdom', F(ehk, 'year_start', 'start'), F(ehk, 'year_end', 'end'), startEvent='battle-of-mohacs'),
        phase('Kingdom of Hungary (in Austria-Hungary)', F(rh, 'year_end', 'end'), F(kh, 'seg0.end', 'end'), startEvent='compromise-1867',
              endEvent='dissolution-of-austria-hungary'),
        phase('First Hungarian Republic', F(fhr_, 'seg0.start', 'start'), F(fhr_, 'seg0.end', 'end'), startEvent='dissolution-of-austria-hungary'),
        phase('Hungarian Soviet Republic', F(hsr, 'year_start', 'start'), C(1919, hsr, 'infobox life span: 21 March – 1 August 1919')),
        phase('Kingdom of Hungary (1920–46)', F(kh2, 'year_start', 'start'), F(kh2, 'year_end', 'end')),
        phase('Second Hungarian Republic', F(shr2, 'year_start', 'start'), F(shr2, 'year_end', 'end')),
        phase("Hungarian People's Republic", F(hpr, 'year_start', 'start'), F(hpr, 'year_end', 'end'), endEvent='revolutions-of-1989'),
        phase('Third Republic', est('Hungary', 11), ongoing=cur('Hungary', 11), startEvent='revolutions-of-1989'),
    ], memberOf=[member('habsburg-monarchy', F(rh, 'year_start', 'start'), F(kh, 'seg0.end', 'end'), sources=[lead(rh, 'part of the lands of the Habsburg monarchy')],
                        startEvent='battle-of-mohacs', endEvent='dissolution-of-austria-hungary')]))
    pt, gpt = 'Principality of Transylvania (1570–1711)', 'Principality of Transylvania (1711–1867)'
    T.append(row('transylvania', 'Transylvania', '#7a4a8a', 'eastern-europe', pt, phases=[
        phase('Principality of Transylvania', F(pt, 'year_start', 'start'), F(pt, 'year_end', 'end')),
        phase('Principality of Transylvania (Habsburg)', F(gpt, 'seg0.start', 'start'), F(gpt, 'seg0.end', 'end'), endEvent='compromise-1867'),
    ], memberOf=[member('habsburg-monarchy', F(gpt, 'seg0.start', 'start'), F(gpt, 'seg0.end', 'end'),
                        sources=[G.ref(gpt, 'infobox event_start: Peace of Szatmár, 29 April 1711')])]))

    kb, cs, fcr, pbm_, csr, sr39, ssr_ = ('Kingdom of Bohemia', 'Czechoslovakia', 'First Czechoslovak Republic', 'Protectorate of Bohemia and Moravia',
                                         'Czech Socialist Republic', 'Slovak Republic (1939–1945)', 'Slovak Socialist Republic')
    T.append(row('czechoslovakia', 'Czechoslovakia', '#3a6a9a', 'eastern-europe', cs, phases=[
        phase('First and Second Republics', F(cs, 'seg0.start', 'start'), F(cs, 'seg0.end', 'end'), startEvent='dissolution-of-austria-hungary', endEvent='german-occupation-of-czechoslovakia'),
        phase('Government-in-exile', F(cs, 'seg1.start', 'start'), F(cs, 'seg1.end', 'end'), startEvent='german-occupation-of-czechoslovakia'),
        phase('Czechoslovakia (restored)', F(cs, 'seg2.start', 'start'), F(cs, 'year_end', 'end'), endEvent='dissolution-of-czechoslovakia'),
    ]))
    T.append(row('czechia', 'Czechia', '#2a5aa0', 'eastern-europe', 'Czech Republic',
                 # inside Czechoslovakia 1918–69 with no government of its own: the lifespan carries it across
                 span_=span(stretch(None, F('Duchy of Bohemia', 'year_start', 'start'), ongoing=cur('Czech Republic', 4))),
                 phases=[
        phase('Kingdom of Bohemia', F(kb, 'year_start', 'start'), F(kb, 'year_end', 'end'), endEvent='dissolution-of-austria-hungary'),
        phase('Protectorate of Bohemia and Moravia', F(pbm_, 'seg0.start', 'start'), F(pbm_, 'seg0.end', 'end'), startEvent='german-occupation-of-czechoslovakia'),
        phase('Czech Socialist Republic', F(csr, 'year_start', 'start'), F(csr, 'year_end', 'end'), endEvent='dissolution-of-czechoslovakia'),
        phase('Czech Republic', est('Czech Republic', 4), ongoing=cur('Czech Republic', 4), startEvent='dissolution-of-czechoslovakia'),
    ], memberOf=[
        member('hre', F(kb, 'year_start', 'start'), F('Holy Roman Empire', 'date_end', 'end'), sources=[lead(kb, 'dissolution of the Holy Roman Empire')],
               endEvent='hre-dissolved'),
        member('habsburg-monarchy', L(kb, 'from 1526 the House of Habsburg', 1526), F(kb, 'year_end', 'end'), sources=[lead(kb, 'from 1526 the House of Habsburg')],
               endEvent='dissolution-of-austria-hungary'),
        member('czechoslovakia', F(cs, 'seg0.start', 'start'), F(cs, 'seg0.end', 'end'), sources=[G.ref('Czech Republic', 'infobox established_event3: Czechoslovakia, 1918')],
               startEvent='dissolution-of-austria-hungary', endEvent='german-occupation-of-czechoslovakia'),
        member('germany', F(pbm_, 'seg0.start', 'start'), F(pbm_, 'seg0.end', 'end'), sources=[lead(pbm_, 'partially annexed territory of Nazi Germany')],
               startEvent='german-occupation-of-czechoslovakia'),
        member('czechoslovakia', F(cs, 'seg2.start', 'start'), F(cs, 'year_end', 'end'), sources=[lead(cs, 'Czechoslovakia was re-established')],
               endEvent='dissolution-of-czechoslovakia'),
    ]))
    T.append(row('slovakia', 'Slovakia', '#4a7ac0', 'eastern-europe', 'Slovakia',
                 span_=span(stretch(None, est('Slovakia', 1), ongoing=cur('Slovakia', 10))),
                 phases=[
        phase('Slovak Republic (1939–45)', F(sr39, 'year_start', 'start'), F(sr39, 'year_end', 'end'), startEvent='german-occupation-of-czechoslovakia'),
        phase('Slovak Socialist Republic', F(ssr_, 'year_start', 'start'), F(ssr_, 'year_end', 'end'), endEvent='dissolution-of-czechoslovakia'),
        phase('Slovak Republic', est('Slovakia', 10), ongoing=cur('Slovakia', 10), startEvent='dissolution-of-czechoslovakia'),
    ], memberOf=[
        member('czechoslovakia', est('Slovakia', 1), F(sr39, 'year_start', 'start'), sources=[G.ref('Slovakia', 'infobox established_event1: Independence from Austria-Hungary (as part of Czechoslovakia), 1918')],
               startEvent='dissolution-of-austria-hungary', endEvent='german-occupation-of-czechoslovakia'),
        member('czechoslovakia', est('Slovakia', 5), est('Slovakia', 10), sources=[G.ref('Slovakia', 'infobox established_event5: Third Czechoslovak Republic, 1945')],
               endEvent='dissolution-of-czechoslovakia'),
    ]))

    wal, mol, up, kr, srr = 'Wallachia', 'Moldavia', 'United Principalities of Moldavia and Wallachia', 'Kingdom of Romania', 'Socialist Republic of Romania'
    for id_, name, color, t in [('wallachia', 'Wallachia', '#c08a2a', wal), ('moldavia', 'Moldavia', '#8a5aa0', mol)]:
        # Moldavia's Ottoman vassalage has no single cited year (the lead: "later autonomous under Ottoman overlordship"),
        # so only Wallachia carries the membership for now
        T.append(row(id_, name, color, 'eastern-europe', t,
                     span_=span(stretch(None, F(t, 'date_start' if t == wal else 'year_start', 'start'),
                                        F(up, 'year_start', 'start') + F(t, 'year_end' if t == mol else 'seg0.end', 'end'), endEvent='union-of-the-principalities')),
                     memberOf=[member('ottoman-empire', L(wal, 'In 1417', 1417), F(up, 'year_start', 'start'), sources=[lead(wal, 'In 1417')],
                                      endEvent='union-of-the-principalities')] if t == wal else None))
    T.append(row('romania', 'Romania', '#e0b020', 'eastern-europe', 'Romania', phases=[
        phase('United Principalities', F(up, 'year_start', 'start'), F(up, 'year_end', 'end'), startEvent='union-of-the-principalities'),
        phase('Kingdom of Romania', F(kr, 'year_start', 'start'), F(kr, 'year_end', 'end')),
        phase('Socialist Republic of Romania', F(srr, 'year_start', 'start'), F(srr, 'year_end', 'end'), endEvent='romanian-revolution'),
        phase('Romania', F(srr, 'year_end', 'end'), ongoing=cur('Romania', 8), startEvent='romanian-revolution'),
    ], memberOf=[member('ottoman-empire', F(up, 'year_start', 'start'), est('Romania', 4), sources=[lead(up, 'nominally a v')],
                        startEvent='union-of-the-principalities', endEvent='russo-turkish-war-1877')]))
    pb, prb = 'Principality of Bulgaria', "People's Republic of Bulgaria"
    T.append(row('bulgaria', 'Bulgaria', '#2a9a6a', 'eastern-europe', 'Bulgaria', phases=[
        phase('Principality of Bulgaria', F(pb, 'year_start', 'start'), F(pb, 'year_end', 'end'), startEvent='congress-of-berlin'),
        # the Tsardom's article has no infobox dates: the neighbouring articles date it
        phase('Tsardom of Bulgaria', F(pb, 'year_end', 'end'), S1(prb, 'seg0.start')),
        phase("People's Republic of Bulgaria", F(prb, 'seg0.start', 'start'), F(prb, 'seg0.end', 'end'), endEvent='revolutions-of-1989'),
        phase('Republic of Bulgaria', est('Bulgaria', 6), ongoing=cur('Bulgaria', 6), startEvent='revolutions-of-1989'),
    ], memberOf=[member('ottoman-empire', F(pb, 'year_start', 'start'), F(pb, 'year_end', 'end'),
                        sources=[G.ref('Bulgaria', 'infobox established_event4: Independence from the Ottoman Empire, 1908')], startEvent='congress-of-berlin')]))

    # ================= Western Asia (for Europe's memberships) =================
    oe = 'Ottoman Empire'
    T.append(row('ottoman-empire', 'Ottoman Empire', '#8a2a2a', 'western-asia', oe, span_=span(stretch(
        None, F(oe, 'seg0.start', 'start'), F(oe, 'seg0.end', 'end'), circa=True, endEvent='sultanate-abolished'))))

    # ================= Colonial empires (members come with later waves) =================
    pe, fce = 'Portuguese Empire', 'French colonial empire'
    T.append(row('portuguese-empire', 'Portuguese Empire', '#2a7a4a', 'colonial-empires', pe, span_=span(stretch(
        None, F(pe, 'seg0.start', 'start'), F(pe, 'seg0.end', 'end')))))
    T.append(row('french-colonial-empire', 'French colonial empire', '#3a52a0', 'colonial-empires', fce, span_=span(stretch(
        None, F(fce, 'year_start', 'start'), F(fce, 'year_end', 'end')))))
    return T


def events(M):
    G, E, W, F, ev, lead = M.G, M.E, M.W, M.F, M.ev, M.lead

    def wev(uuid, title, article, tracks, **kw):
        ys, r = W(article)
        if len(ys) > 1 and ys[-1] != ys[0]:
            kw.setdefault('end', ys[-1])
        return ev(uuid, title, ys[0], tracks, r, **kw)

    def fev(uuid, title, article, spec, tracks, **kw):
        """An event dated by an infobox field of a state article (its start or end, an established event)."""
        c = F(article, spec, 'start')[0]
        return ev(uuid, title, c['year'], tracks, c['source'], **kw)

    def iev(uuid, title, article, n, tracks, **kw):
        y, r = E(article, n)
        return ev(uuid, title, y, tracks, r, **kw)

    return [
        # ---- unions and successions ----
        fev('acts-of-union-1707', 'Acts of Union (England and Scotland)', 'Kingdom of Great Britain', 'year_start', ['united-kingdom', 'scotland'], importance=1,
            descr='England and Scotland unite as the Kingdom of Great Britain on 1 May 1707.'),
        fev('acts-of-union-1800', 'Acts of Union (Great Britain and Ireland)', 'United Kingdom of Great Britain and Ireland', 'year_start',
            ['united-kingdom', 'ireland'], descr='The United Kingdom of Great Britain and Ireland begins on 1 January 1801.'),
        wev('irish-war-of-independence', 'Irish War of Independence', 'Irish War of Independence', ['ireland', 'united-kingdom']),
        fev('irish-free-state', 'Irish Free State established', 'Irish Free State', 'year_start', ['ireland', 'united-kingdom'], importance=1,
            descr='Most of Ireland leaves the United Kingdom on 6 December 1922; Northern Ireland stays.'),
        wev('swedish-war-of-liberation', 'Swedish War of Liberation', 'Swedish War of Liberation', ['sweden', 'kalmar-union', 'denmark'], end=1523,
            descr='Gustav Vasa leads Sweden out of the Kalmar Union; he is elected king in 1523.'),
        fev('treaty-of-kiel', 'Treaty of Kiel', 'Union between Sweden and Norway', 'year_start', ['denmark-norway', 'sweden-norway', 'denmark', 'norway', 'sweden'],
            importance=1, descr='Denmark cedes Norway to Sweden on 14 January 1814; Norway declares independence and is forced into union with Sweden.'),
        fev('union-dissolved-1905', 'Union of Sweden and Norway dissolved', 'Union between Sweden and Norway', 'year_end', ['sweden-norway', 'sweden', 'norway'],
            importance=1),
        fev('finnish-independence', 'Finland declares independence', 'Grand Duchy of Finland', 'year_end', ['finland'], importance=1,
            descr='Finland declares independence from Russia on 6 December 1917.'),
        wev('finnish-civil-war', 'Finnish Civil War', 'Finnish Civil War', ['finland']),
        ev('union-of-lublin', 'Union of Lublin', 1569, ['polish-lithuanian-commonwealth', 'polish-lithuanian-union', 'poland', 'lithuania'],
           lead('Polish–Lithuanian Commonwealth', 'The Union of Lublin'), importance=1,
           descr='Poland and Lithuania form a single Commonwealth on 1 July 1569.'),
        fev('third-partition', 'Third Partition of Poland', 'Polish–Lithuanian Commonwealth', 'year_end', ['polish-lithuanian-commonwealth', 'poland', 'lithuania'],
            importance=1, descr='Russia, Prussia and Austria divide what is left of the Commonwealth.'),
        fev('compromise-1867', 'Austro-Hungarian Compromise', 'Austria-Hungary', 'year_start', ['habsburg-monarchy', 'hungary', 'transylvania'], importance=1,
            descr='The empire becomes the Dual Monarchy of Austria-Hungary; Transylvania is joined to Hungary.'),
        fev('dissolution-of-austria-hungary', 'Dissolution of Austria-Hungary', 'Austria-Hungary', 'seg0.end',
            ['habsburg-monarchy', 'austria', 'hungary', 'czechia', 'czechoslovakia', 'slovakia', 'bosnia-and-herzegovina', 'croatia'], importance=1,
            descr='Defeat in the First World War breaks the monarchy into successor states.'),
        fev('act-of-abjuration', 'Act of Abjuration', 'Dutch Republic', 'date_pre', ['habsburg-netherlands', 'netherlands', 'belgium'], importance=1,
            descr='The northern provinces renounce Philip II; the south stays with Spain.'),
        wev('eighty-years-war', "Eighty Years' War", "Eighty Years' War", ['netherlands', 'spain', 'habsburg-netherlands'], importance=1),
        fev('batavian-revolution', 'Batavian Revolution', 'Batavian Republic', 'year_start', ['netherlands']),
        wev('belgian-revolution', 'Belgian Revolution', 'Belgian Revolution', ['belgium', 'netherlands'], importance=1),
        wev('treaty-of-rastatt', 'Treaty of Rastatt', 'Treaty of Rastatt', ['belgium', 'spain', 'habsburg-monarchy'],
            descr='The Spanish Netherlands pass to the Austrian Habsburgs.'),
        fev('french-invasion-of-switzerland', 'French invasion of Switzerland', 'Helvetic Republic', 'date_pre', ['switzerland', 'france']),
        fev('swiss-federal-state', 'Swiss federal state founded', 'Switzerland', 'established_date4', ['switzerland']),
        fev('anschluss', 'Anschluss', 'Federal State of Austria', 'year_end', ['austria', 'germany'], importance=1,
            descr='Nazi Germany annexes Austria in March 1938.'),
        fev('austrian-state-treaty', 'Austrian State Treaty', 'Allied-occupied Austria', 'year_end', ['austria'],
            descr='The occupying powers leave; Austria is independent and neutral.'),
        wev('war-of-the-spanish-succession', 'War of the Spanish Succession', 'War of the Spanish Succession',
            ['spain', 'crown-of-aragon', 'france', 'united-kingdom', 'habsburg-monarchy', 'netherlands'], importance=1,
            descr='The Bourbons win the Spanish throne; the Nueva Planta decrees abolish the Crown of Aragon.'),
        wev('portuguese-restoration-war', 'Portuguese Restoration War', 'Portuguese Restoration War', ['portugal', 'spain', 'iberian-union'], importance=1),
        fev('revolution-1910', '5 October 1910 revolution', 'Kingdom of Portugal', 'year_end', ['portugal'], descr='The Portuguese monarchy is overthrown.'),
        fev('carnation-revolution', 'Carnation Revolution', 'Estado Novo (Portugal)', 'year_end', ['portugal', 'portuguese-empire'], importance=1),
        wev('spanish-civil-war', 'Spanish Civil War', 'Spanish Civil War', ['spain'], importance=1),
        fev('kingdom-of-italy-proclaimed', 'Kingdom of Italy proclaimed', 'Kingdom of Italy', 'year_start', ['italy', 'naples'], importance=1),
        wev('capture-of-rome', 'Capture of Rome', 'Capture of Rome', ['papal-states', 'italy'], importance=1),
        wev('lateran-treaty', 'Lateran Treaty', 'Lateran Treaty', ['papal-states', 'italy']),
        wev('treaty-of-campo-formio', 'Treaty of Campo Formio', 'Treaty of Campo Formio', ['venice', 'genoa', 'habsburg-monarchy', 'france'],
            descr='France and Austria end the Venetian Republic.'),
        fev('two-sicilies', 'Kingdom of the Two Sicilies established', 'Kingdom of the Two Sicilies', 'seg0.start', ['naples', 'sicily']),
        wev('italian-wars', 'Italian Wars', 'Italian Wars', ['france', 'spain', 'venice', 'milan', 'florence', 'naples', 'papal-states'], importance=1),
        wev('siege-of-rhodes', 'Siege of Rhodes', 'Siege of Rhodes (1522)', ['knights-hospitaller', 'ottoman-empire']),
        wev('great-siege-of-malta', 'Great Siege of Malta', 'Great Siege of Malta', ['knights-hospitaller', 'ottoman-empire']),
        wev('battle-of-lepanto', 'Battle of Lepanto', 'Battle of Lepanto', ['ottoman-empire', 'spain', 'venice', 'genoa', 'papal-states'], importance=1),
        wev('french-invasion-of-malta', 'French invasion of Malta', 'French invasion of Malta', ['knights-hospitaller', 'malta', 'france']),
        fev('maltese-independence', 'Maltese independence', 'State of Malta', 'year_start', ['malta', 'british-empire']),
        wev('greek-war-of-independence', 'Greek War of Independence', 'Greek War of Independence', ['greece', 'ottoman-empire'], importance=1),
        ev('italian-invasion-of-albania', 'Italian invasion of Albania', 1939, ['albania', 'italy'],
           G.ref('Albanian Kingdom (1928–1939)', 'infobox event_end: Government exiled, 9 April 1939')),
        wev('congress-of-berlin', 'Treaty of Berlin', 'Treaty of Berlin (1878)', ['ottoman-empire', 'bulgaria', 'bosnia-and-herzegovina', 'romania', 'serbia', 'montenegro'],
            importance=1, descr='The powers recognise Serbia, Montenegro and Romania; Bulgaria becomes an autonomous principality; Austria-Hungary occupies Bosnia.'),
        wev('russo-turkish-war-1877', 'Russo-Turkish War of 1877–78', 'Russo-Turkish War (1877–1878)', ['ottoman-empire', 'romania', 'serbia', 'montenegro']),
        wev('balkan-wars', 'Balkan Wars', 'Balkan Wars', ['ottoman-empire', 'bulgaria', 'greece', 'serbia', 'montenegro', 'albania'], importance=1),
        wev('bosnian-war', 'Bosnian War', 'Bosnian War', ['bosnia-and-herzegovina', 'yugoslavia', 'serbia-and-montenegro', 'croatia'], importance=1),
        fev('dayton-agreement', 'Dayton Agreement', 'Republic of Bosnia and Herzegovina', 'year_end', ['bosnia-and-herzegovina']),
        wev('ten-day-war', 'Ten-Day War', 'Ten-Day War', ['slovenia', 'yugoslavia'], importance=1, descr='Slovenia secures its independence from Yugoslavia.'),
        fev('kosovo-independence', 'Kosovo declares independence', 'Kosovo', 'established_date8', ['kosovo', 'serbia'], importance=1,
            descr='Serbia and many other states do not recognise it.'),
        # ---- Central and Eastern Europe ----
        wev('battle-of-mohacs', 'Battle of Mohács', 'Battle of Mohács', ['hungary', 'croatia', 'ottoman-empire', 'habsburg-monarchy'], importance=1,
            descr='The Ottomans destroy the Hungarian army; the kingdom splits between Habsburg and Ottoman-backed kings.'),
        wev('battle-of-vienna', 'Siege of Vienna', 'Battle of Vienna', ['ottoman-empire', 'habsburg-monarchy', 'polish-lithuanian-commonwealth'], importance=1),
        wev('treaty-of-karlowitz', 'Treaty of Karlowitz', 'Treaty of Karlowitz', ['ottoman-empire', 'habsburg-monarchy', 'hungary', 'polish-lithuanian-commonwealth', 'venice'],
            descr='The Ottomans cede most of Hungary to the Habsburgs.'),
        wev('thirty-years-war', "Thirty Years' War", "Thirty Years' War", ['hre', 'czechia', 'sweden', 'france', 'denmark', 'spain', 'habsburg-monarchy'], importance=1,
            descr='Begins with the Bohemian revolt in Prague; ends with the Peace of Westphalia.'),
        wev('great-northern-war', 'Great Northern War', 'Great Northern War', ['sweden', 'polish-lithuanian-commonwealth', 'denmark-norway'], importance=1,
            descr='Sweden loses its Baltic empire.'),
        wev('napoleonic-wars', 'Napoleonic Wars', 'Napoleonic Wars', ['france', 'united-kingdom', 'habsburg-monarchy', 'prussia', 'spain', 'portugal', 'sweden'],
            importance=1),
        wev('revolutions-1848-hungary', 'Hungarian Revolution of 1848', 'Hungarian Revolution of 1848', ['hungary', 'habsburg-monarchy']),
        ev('german-occupation-of-czechoslovakia', 'German occupation of Czechoslovakia', 1939, ['czechoslovakia', 'czechia', 'slovakia', 'germany'],
           G.ref('Protectorate of Bohemia and Moravia', 'infobox event_start: German occupation, 15 March 1939'), importance=1,
           descr='Slovakia declares independence on 14 March 1939; Germany occupies the Czech lands the next day.'),
        wev('invasion-of-poland', 'Invasion of Poland', 'Invasion of Poland', ['poland', 'germany'], importance=1,
            descr='Germany and then the Soviet Union invade; the Second World War begins.'),
        wev('warsaw-uprising', 'Warsaw Uprising', 'Warsaw Uprising', ['poland']),
        wev('hungarian-revolution-1956', 'Hungarian Revolution of 1956', 'Hungarian Revolution of 1956', ['hungary'], importance=1),
        wev('prague-spring', 'Prague Spring', 'Prague Spring', ['czechoslovakia'], importance=1),
        fev('revolutions-of-1989', 'Revolutions of 1989', "Polish People's Republic", 'year_end', ['poland', 'hungary', 'czechoslovakia', 'bulgaria'],
            importance=1, descr='Communist rule ends across Central and Eastern Europe.'),
        wev('romanian-revolution', 'Romanian Revolution', 'Romanian Revolution', ['romania'], importance=1),
        fev('dissolution-of-czechoslovakia', 'Dissolution of Czechoslovakia', 'Czechoslovakia', 'year_end', ['czechoslovakia', 'czechia', 'slovakia'], importance=1,
            descr='Czechoslovakia splits peacefully into the Czech Republic and Slovakia on 1 January 1993.'),
        fev('union-of-the-principalities', 'Union of Moldavia and Wallachia', 'United Principalities of Moldavia and Wallachia', 'year_start',
            ['wallachia', 'moldavia', 'romania'], importance=1, descr='Both principalities elect Alexandru Ioan Cuza as prince in 1859.'),
    ]
