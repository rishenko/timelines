"""
Modern States wave 3: the Middle East and North Africa (2026-11-21). UN Western Asia without the Caucasus states
(Armenia, Azerbaijan, Georgia: another wave) and without Iran and Afghanistan (Southern Asia: another wave), plus UN
Northern Africa.

Rules applied (data-format.md and Kevin's decisions, 2026-11-21):
- A row that carries on into a state that exists today takes that state's id; older governments are phases.
  Turkey is its own row (from the Grand National Assembly government of 1920), linked to `ottoman-empire` (europe.py)
  by succession events.
- Ottoman provinces (eyalets, vilayets) and the Barbary regencies are phases on the nation's row, plus a dated
  memberOf in `ottoman-empire` (as europe.py does for Bosnia). Mandates and protectorates are phases plus memberships
  in `british-empire` / `french-colonial-empire`; Spanish Morocco and Spanish Sahara in `spanish-empire`; Italian
  Libya in `italy` (there is no Italian colonial empire row).
- Unions are their own rows: the United Arab Republic, the Arab Federation and the Syrian Federation. Mandatory
  Palestine is a colonial unit that split into several states, so it is its own row.
- Historical states with a former-country infobox that lived after 1500 get rows (Funj, Darfur, the Mahdist State,
  the Sharifate of Mecca, the Hadhrami sultanates...). The Saudi states are phases of saudi-arabia.
- Medieval seam (lead, 2026-11-21): mamluk-sultanate, caliphate (last phase only), morocco (Wattasid phase),
  hafsid-tunisia and zayyanid-tlemcen copy Medieval World's ids, dates and claim locations.
- AI-flagged pages are refused by G.art: `Iraq`, `First Syrian Republic` and `Saudi-led intervention in the Yemeni
  civil war` are flagged, so Iraq links to `History of Iraq` and the First Syrian Republic phase is dated from the
  Syria article and the Second Syrian Republic's start.

Called from gen_modern.py with its module (M).
"""

GROUPS = []  # northern-africa moved to groups.py

# rows of this wave added to events other modules define (union-event rule: only rows that acted as themselves)
SHARED = {
    'battle-of-diu-1509': ['mamluk-sultanate'],  # defined in south_asia.py
    'iran-iraq-war': ['iraq'],  # defined in south_asia.py
    'algerian-war': ['algeria', 'french-colonial-empire'],
}


def tracks(M):
    G, F, C, E, lead, phase, stretch, span, member, row = (
        M.G, M.F, M.C, M.E, M.lead, M.phase, M.stretch, M.span, M.member, M.row)

    def S1(t, spec='year_start'):
        """The first claim only of an article field: for citing where a neighbouring phase begins or ends."""
        return F(t, spec, 'start')[:1]

    def est(t, k, pos=''):
        return F(t, f'established_date{k}{pos}', 'start')[:1]

    def cur(t, k):
        """Ref saying a state still exists: its infobox's latest established event."""
        f = G.art(t)['fields']
        return G.ref(t, f"infobox established_event{k}: {f[f'established_event{k}']['text']}, "
                        f"{f.get(f'established_date{k}', {}).get('text', '')} (current state)".replace(', ,', ','))

    def EV(t, n, note=None):
        """Claim from an infobox event (date_eventN, or 'start'/'end')."""
        y, r = E(t, n)
        c = {'year': y, 'source': r}
        if note:
            c['note'] = note
        return [c]

    def L(t, needle, year, note=None):
        c = {'year': year, 'source': lead(t, needle)}
        if note:
            c['note'] = note
        return [c]

    def LY(t, needle, k=0, note=None):
        """Claim dated by the k-th year written in the lead sentence that contains `needle` (no typed year)."""
        import wp_states
        for s in G.art(t)['body']['lead']:
            if needle in s['text']:
                ys = wp_states.years_in(s['text'])[0]
                return L(t, needle, ys[k], note)
        raise SystemExit(f'{t}: no lead sentence with {needle!r}')

    def WY(t, k=0, note=None):
        """Claim from a war or treaty infobox date (k-th year)."""
        ys, r = M.W(t)
        c = {'year': ys[k], 'source': r}
        if note:
            c['note'] = note
        return [c]

    def copy_claims(medieval_claims):
        """Medieval World's claims, re-cited from the same dump article at the same location: (title, location, spec)."""
        out = []
        for title, loc, spec, side in medieval_claims:
            y = F(title, spec, side)[0]['year']
            out.append({'year': y, 'source': G.ref(title, loc)})
        return out

    T = []

    # =====================================================================================================
    # Western Asia
    # =====================================================================================================

    # ---------- Turkey ----------
    gna = 'Government of the Grand National Assembly'
    T.append(row('turkey', 'Turkey', '#c0302a', 'western-asia', 'Turkey', phases=[
        phase('Government of the Grand National Assembly', F(gna, 'year_start', 'start'), F(gna, 'year_end', 'end'),
              startEvent='gna-established', endEvent='republic-of-turkey-proclaimed'),
        phase('Republic of Turkey', est('Turkey', 6), ongoing=cur('Turkey', 7), startEvent='republic-of-turkey-proclaimed'),
    ]))
    hs = 'Hatay State'
    T.append(row('hatay-state', 'Hatay State', '#b05a4a', 'western-asia', hs, span_=span(stretch(
        None, F(hs, 'year_start', 'start'), F(hs, 'year_end', 'end'), startEvent='hatay-independence', endEvent='hatay-joins-turkey')),
        memberOf=[member('french-colonial-empire', F(hs, 'year_start', 'start'), F(hs, 'year_end', 'end'),
                         sources=[lead(hs, 'Sanjak of Alexandretta of the French')], endEvent='hatay-joins-turkey')]))
    dk, rm = 'Beylik of Dulkadir', 'Ramadanid Emirate'
    T.append(row('beylik-of-dulkadir', 'Beylik of Dulkadir', '#8a5a3a', 'western-asia', dk, span_=span(stretch(
        None, F(dk, 'year_start', 'start'), F(dk, 'year_end', 'end')))))
    T.append(row('ramadanid-emirate', 'Ramadanid Emirate', '#9a6a4a', 'western-asia', rm, span_=span(stretch(
        None, F(rm, 'year_start', 'start'), F(rm, 'year_end', 'end'))),
        memberOf=[member('ottoman-empire', LY(rm, 'from 1517, a protectorate', -1), F(rm, 'year_end', 'end'),
                         sources=[lead(rm, 'from 1517, a protectorate')], startEvent='ottoman-mamluk-war')]))

    # ---------- Cyprus ----------
    vc, oc, bc, cy = 'Venetian Cyprus', 'Ottoman Cyprus', 'British Cyprus', 'Cyprus'
    T.append(row('cyprus', 'Cyprus', '#c08a3a', 'western-asia', cy, phases=[
        phase('Venetian Cyprus', F(vc, 'year_start', 'start'), F(vc, 'year_end', 'end'), endEvent='ottoman-venetian-war-1570'),
        phase('Ottoman Cyprus', F(oc, 'year_start', 'start'), F(oc, 'year_end', 'end'), startEvent='ottoman-venetian-war-1570',
              endEvent='british-annexation-of-cyprus'),
        # British administration began in 1878 under the Cyprus Convention; annexation and the protectorate came in 1914
        phase('British Cyprus', F(bc, 'year_start', 'start') + [dict(F(bc, 'date_pre', 'start')[0], note='Under British administration from the Cyprus Convention of 1878.')],
              F(bc, 'year_end', 'end'), startEvent='british-annexation-of-cyprus', endEvent='cyprus-independence'),
        phase('Republic of Cyprus', est(cy, 2), ongoing=cur(cy, 3), startEvent='cyprus-independence'),
    ], memberOf=[
        member('venice', F(vc, 'year_start', 'start'), F(vc, 'year_end', 'end'), sources=[lead(vc, 'overseas possession of the Venetians')],
               endEvent='ottoman-venetian-war-1570'),
        member('ottoman-empire', F(oc, 'year_start', 'start'), F(oc, 'year_end', 'end'), sources=[lead(oc, 'eyalet/province of the Ottoman Empire')],
               startEvent='ottoman-venetian-war-1570', endEvent='british-annexation-of-cyprus'),
        member('british-empire', F(bc, 'date_pre', 'start'), F(bc, 'year_end', 'end'), sources=[lead(bc, 'under the dominion of the British Empire')],
               startEvent='cyprus-convention', endEvent='cyprus-independence'),
    ]))
    nc, atca, tfsc = 'Northern Cyprus', 'Autonomous Turkish Cypriot Administration', 'Turkish Federated State of Cyprus'
    T.append(row('northern-cyprus', 'Northern Cyprus (disputed)', '#a04a3a', 'western-asia', nc, phases=[
        phase('Autonomous Turkish Cypriot Administration', F(atca, 'year_start', 'start'), F(atca, 'year_end', 'end'),
              startEvent='turkish-invasion-of-cyprus', endEvent='tfsc-proclaimed'),
        phase('Turkish Federated State of Cyprus', F(tfsc, 'year_start', 'start'), F(tfsc, 'year_end', 'end'),
              startEvent='tfsc-proclaimed', endEvent='trnc-declared'),
        # recognised only by Turkey; UN Security Council Resolution 541 called the declaration legally invalid
        phase('Turkish Republic of Northern Cyprus', est(nc, 4), ongoing=cur(nc, 4), startEvent='trnc-declared'),
    ]))

    # ---------- Syria ----------
    de, sv, akos, sod, soa, sf, sos, ssr, bs, syr = (
        'Damascus Eyalet', 'Syria vilayet', 'Arab Kingdom of Syria', 'State of Damascus', 'State of Aleppo', 'Syrian Federation',
        'State of Syria', 'Second Syrian Republic', "Ba'athist Syria", 'Syria')
    T.append(row('syria', 'Syria', '#3a8a5a', 'western-asia', syr,
                 # inside the United Arab Republic (1958–61) with no government of its own: the lifespan carries it across
                 span_=span(stretch(None, F(de, 'year_start', 'start'), F(sv, 'year_end', 'end')),
                            stretch(None, est(syr, 1), ongoing=cur(syr, 8))),
                 phases=[
        phase('Damascus Eyalet', F(de, 'year_start', 'start'), F(de, 'year_end', 'end'), startEvent='battle-of-marj-dabiq'),
        phase('Syria Vilayet', F(sv, 'year_start', 'start'), F(sv, 'year_end', 'end'), endEvent='sinai-and-palestine-campaign'),
        phase('Arab Kingdom of Syria', est(syr, 1) + F(akos, 'year_start', 'start'), F(akos, 'year_end', 'end'), endEvent='franco-syrian-war'),
        # the mandate's states ran side by side: parallel phases
        phase('State of Damascus', F(sod, 'year_start', 'start'), F(sod, 'year_end', 'end'), startEvent='franco-syrian-war', endEvent='syrian-federation-dissolved'),
        phase('State of Aleppo', F(soa, 'year_start', 'start'), F(soa, 'year_end', 'end'), endEvent='syrian-federation-dissolved'),
        phase('Alawite State', F('Alawite State', 'year_start', 'start'), F('Alawite State', 'year_end', 'end')),
        phase('Jabal Druze State', F('Jabal Druze State', 'year_start', 'start'), F('Jabal Druze State', 'year_end', 'end')),
        phase('State of Syria', F(sos, 'year_start', 'start'), F(sos, 'year_end', 'end'), startEvent='syrian-federation-dissolved'),
        # the First Syrian Republic's article carries an AI-generated-text flag: dated from the Syria article and the
        # Second Republic's start instead
        phase('First Syrian Republic', est(syr, 3), F(ssr, 'date_start', 'start')),
        phase('Second Syrian Republic', F(ssr, 'date_start', 'start'), EV(ssr, 2), endEvent='uar-formed'),
        phase('Second Syrian Republic (restored)', EV(ssr, 3), F(ssr, 'date_end', 'end'), startEvent='syrian-coup-1961', endEvent='syrian-coup-1963'),
        phase("Ba'athist Syria", F(bs, 'year_start', 'start'), F(bs, 'year_end', 'end'), startEvent='syrian-coup-1963', endEvent='fall-of-assad'),
        phase('Syrian transitional government', est(syr, 8), ongoing=cur(syr, 8)),
    ], memberOf=[
        member('ottoman-empire', F(de, 'year_start', 'start'), F(sv, 'year_end', 'end'), sources=[lead(de, 'the Ottomans took it from the Mamluks')],
               startEvent='battle-of-marj-dabiq', endEvent='sinai-and-palestine-campaign'),
        member('french-colonial-empire', F(sod, 'date_pre', 'start'), est(syr, 5), sources=[lead(sos, 'French Mandate state')],
               startEvent='franco-syrian-war', endEvent='syria-independence'),
        member('syrian-federation', F(sf, 'year_start', 'start'), F(sf, 'year_end', 'end'), sources=[lead(sf, 'comprised the States of Aleppo')],
               startEvent='syrian-federation-formed', endEvent='syrian-federation-dissolved'),
        member('united-arab-republic', EV(ssr, 2), EV(ssr, 3), sources=[lead('United Arab Republic', 'political union between the Republic of Egypt')],
               startEvent='uar-formed', endEvent='syrian-coup-1961'),
    ]))
    T.append(row('syrian-federation', 'Syrian Federation', '#5a9a6a', 'western-asia', sf, span_=span(stretch(
        None, F(sf, 'year_start', 'start'), F(sf, 'year_end', 'end'), startEvent='syrian-federation-formed', endEvent='syrian-federation-dissolved')),
        memberOf=[member('french-colonial-empire', F(sf, 'year_start', 'start'), F(sf, 'year_end', 'end'),
                         sources=[lead(sf, 'High Commissary Gouraud')])]))

    # ---------- Lebanon ----------
    eml, dqm, mlm, gl, leb = ('Emirate of Mount Lebanon', 'Double Qaim-Maqamate of Mount Lebanon', 'Mount Lebanon Mutasarrifate',
                              'Greater Lebanon', 'Lebanon')
    T.append(row('lebanon', 'Lebanon', '#2a8a7a', 'western-asia', leb, phases=[
        phase('Emirate of Mount Lebanon', F(eml, 'year_start', 'start'), F(eml, 'year_end', 'end'), startEvent='ottoman-mamluk-war'),
        phase('Double Qaim-Maqamate', F(dqm, 'year_start', 'start'), F(dqm, 'year_end', 'end')),
        phase('Mount Lebanon Mutasarrifate', F(mlm, 'year_start', 'start'), F(mlm, 'year_end', 'end'), startEvent='mount-lebanon-conflict-1860',
              endEvent='sinai-and-palestine-campaign'),
        phase('Greater Lebanon', F(gl, 'year_start', 'start'), F(gl, 'year_end', 'end'), startEvent='greater-lebanon-declared', endEvent='lebanese-independence'),
        phase('Lebanese Republic', est(leb, 6), ongoing=cur(leb, 10), startEvent='lebanese-independence'),
    ], memberOf=[
        member('ottoman-empire', F(eml, 'year_start', 'start'), F(mlm, 'year_end', 'end'), sources=[lead(mlm, "one of the Ottoman Empire's subdivisions")],
               startEvent='ottoman-mamluk-war', endEvent='sinai-and-palestine-campaign'),
        member('french-colonial-empire', F(gl, 'year_start', 'start'), F(gl, 'year_end', 'end'), sources=[lead(gl, 'informally known as French Lebanon')],
               startEvent='greater-lebanon-declared', endEvent='lebanese-independence'),
    ]))

    # ---------- Palestine, Israel ----------
    mp, isr, pal, app = 'Mandatory Palestine', 'Israel', 'Palestine', 'All-Palestine Protectorate'
    T.append(row('mandatory-palestine', 'Mandatory Palestine', '#7a7a4a', 'western-asia', mp, span_=span(stretch(
        None, F(mp, 'year_start', 'start'), F(mp, 'year_end', 'end'), endEvent='israeli-independence')),
        memberOf=[member('british-empire', F(mp, 'year_start', 'start'), F(mp, 'year_end', 'end'),
                         sources=[lead(mp, 'British administrative territory')], endEvent='israeli-independence')]))
    T.append(row('israel', 'Israel', '#3a6ac0', 'western-asia', isr, span_=span(stretch(
        None, est(isr, 1), ongoing=G.ref(isr, 'infobox established_event1: Declaration of independence, 14 May 1948 (current state)'),
        startEvent='israeli-independence'))))
    T.append(row('palestine', 'Palestine (UN observer state)', '#3a9a4a', 'western-asia', pal, phases=[
        phase('All-Palestine Protectorate', F(app, 'year_start', 'start'), F(app, 'year_end', 'end'), startEvent='palestine-war-1948'),
        # a permanent non-member observer state at the UN, recognised by 157 of 193 members; its sovereignty is disputed with Israel
        phase('State of Palestine', est(pal, 1), ongoing=lead(pal, 'permanent non-member observer state'), startEvent='palestinian-declaration-of-independence'),
    ]))

    # ---------- Jordan ----------
    et, jor, af = 'Emirate of Transjordan', 'Jordan', 'Arab Federation'
    T.append(row('jordan', 'Jordan', '#8a3a5a', 'western-asia', jor, phases=[
        phase('Emirate of Transjordan', F(et, 'year_start', 'start'), F(et, 'year_end', 'end'), startEvent='transjordan-established', endEvent='jordanian-independence'),
        phase('Hashemite Kingdom of Jordan', est(jor, 2), ongoing=cur(jor, 3), startEvent='jordanian-independence'),
    ], memberOf=[
        member('british-empire', F(et, 'year_start', 'start'), F(et, 'year_end', 'end'), sources=[lead(jor, 'which became a British protectorate')],
               startEvent='transjordan-established', endEvent='jordanian-independence'),
    ]))
    # the Arab Federation lasted February–August 1958, a change within one year: an event (lead's call, 2026-11-21)

    # ---------- Iraq ----------
    be, oi, mdi, bv, mi, ki, fri, bi, cpa, hi = ('Baghdad Eyalet', 'Ottoman Iraq', 'Mamluk dynasty of Iraq', 'Baghdad vilayet', 'Mandatory Iraq',
                                                'Kingdom of Iraq', 'First Republic of Iraq', "Ba'athist Iraq", 'Coalition Provisional Authority', 'History of Iraq')
    # the `Iraq` article carries an AI-generated-text flag: the row links to History of Iraq
    T.append(row('iraq', 'Iraq', '#2a6a3a', 'western-asia', hi, phases=[
        phase('Baghdad Eyalet', F(be, 'year_start', 'start'), F(be, 'year_end', 'end'), startEvent='capture-of-baghdad-1534'),
        # the Georgian Mamluks governed Iraq semi-autonomously inside the Ottoman province: a parallel phase
        phase('Mamluk dynasty of Iraq', F(mdi, 'year_start', 'start'), F(mdi, 'year_end', 'end')),
        phase('Baghdad Vilayet', F(bv, 'year_start', 'start'), F(bv, 'year_end', 'end'), endEvent='mesopotamian-campaign'),
        phase('Mandatory Iraq', F(mi, 'year_start', 'start'), F(mi, 'year_end', 'end'), startEvent='treaty-of-sevres', endEvent='iraqi-independence'),
        phase('Kingdom of Iraq', F(ki, 'year_start', 'start'), F(ki, 'year_end', 'end'), startEvent='iraqi-independence', endEvent='14-july-revolution'),
        phase('First Republic of Iraq', F(fri, 'year_start', 'start'), F(fri, 'year_end', 'end'), startEvent='14-july-revolution', endEvent='17-july-revolution'),
        phase("Ba'athist Iraq", F(bi, 'year_start', 'start'), F(bi, 'year_end', 'end'), startEvent='17-july-revolution', endEvent='invasion-of-iraq-2003'),
        phase('Coalition Provisional Authority', F(cpa, 'year_start', 'start'), F(cpa, 'year_end', 'end'), startEvent='invasion-of-iraq-2003'),
        phase('Republic of Iraq', S1(cpa, 'year_end'), ongoing=lead('Politics of Iraq', 'federal democratic parliamentary republic')),
    ], memberOf=[
        # apart from the Safavid occupation of 1623–38
        member('ottoman-empire', F(oi, 'year_start', 'start'), LY(hi, 'Safavid occupation from 1623', 0), sources=[lead(hi, 'Safavid occupation from 1623')],
               startEvent='capture-of-baghdad-1534'),
        member('ottoman-empire', LY(hi, 'Safavid occupation from 1623', 1), F(bv, 'year_end', 'end') + [dict(F(oi, 'year_end', 'end')[0], note='Ottoman Iraq counts to the British Mandate of 1920.')],
               sources=[lead(hi, 'Safavid occupation from 1623')], startEvent='siege-of-baghdad-1638', endEvent='mesopotamian-campaign'),
        member('british-empire', F(mi, 'year_start', 'start'), F(mi, 'year_end', 'end'), sources=[lead(mi, 'remained under British administration until 1932')],
               startEvent='treaty-of-sevres', endEvent='iraqi-independence'),
    ]))
    kk = 'Kingdom of Kurdistan'
    T.append(row('kingdom-of-kurdistan', 'Kingdom of Kurdistan', '#6a8a3a', 'western-asia', kk, span_=span(stretch(
        None, F(kk, 'year_start', 'start'), F(kk, 'year_end', 'end') + L(kk, 'until July 1925', 1925, 'The lead runs it to July 1925.'),
        startEvent='kurdistan-proclaimed', endEvent='kurdistan-disestablished'))))

    # ---------- Saudi Arabia and the Hejaz ----------
    fss, sss, tss, sa, koh, som, hv = ('First Saudi state', 'Second Saudi state', 'Third Saudi state', 'Saudi Arabia', 'Kingdom of Hejaz',
                                       'Sharifate of Mecca', 'Hejaz Vilayet')
    T.append(row('saudi-arabia', 'Saudi Arabia', '#2a7a3a', 'western-asia', sa, phases=[
        phase('First Saudi state (Emirate of Diriyah)', F(fss, 'year_start', 'start')
              + [dict(est(sa, 1)[0], note='The Saudi Arabia article dates the First Saudi State from 1727.')],
              F(fss, 'year_end', 'end'), startEvent='diriyah-pact', endEvent='ottoman-wahhabi-war'),
        phase('Second Saudi state (Emirate of Nejd)', F(sss, 'year_start', 'start'), F(sss, 'year_end', 'end'),
              startEvent='reconquest-of-riyadh-1824', endEvent='battle-of-mulayda'),
        phase('Third Saudi state', F(tss, 'date_start', 'start'), F(tss, 'date_end', 'end'), startEvent='battle-of-riyadh-1902', endEvent='saudi-arabia-proclaimed'),
        phase('Kingdom of Saudi Arabia', est(sa, 7), ongoing=cur(sa, 8), startEvent='saudi-arabia-proclaimed'),
    ]))
    T.append(row('sharifate-of-mecca', 'Sharifate of Mecca', '#5a8a2a', 'western-asia', som, span_=span(stretch(
        None, F(som, 'seg0.start', 'start'), F(som, 'seg0.end', 'end'), circa=True, endEvent='arab-revolt')),
        memberOf=[member('ottoman-empire', F(hv, 'year_start', 'start'), F(hv, 'year_end', 'end'),
                         sources=[G.ref(hv, 'infobox: Hejaz Vilayet, a subdivision of the Ottoman Empire, 1517–1916')],
                         startEvent='ottoman-mamluk-war', endEvent='arab-revolt')]))
    T.append(row('kingdom-of-hejaz', 'Kingdom of Hejaz', '#6a9a3a', 'western-asia', koh, span_=span(stretch(
        None, F(koh, 'year_start', 'start'), F(koh, 'year_end', 'end'), startEvent='arab-revolt', endEvent='saudi-conquest-of-hejaz'))))
    js, asir = 'Emirate of Jabal Shammar', 'Emirate of Asir'
    T.append(row('emirate-of-jabal-shammar', 'Emirate of Jabal Shammar', '#7a8a4a', 'western-asia', js, span_=span(stretch(
        None, F(js, 'year_start', 'start'), F(js, 'year_end', 'end'), endEvent='conquest-of-hail'))))
    T.append(row('emirate-of-asir', 'Emirate of Asir', '#4a7a5a', 'western-asia', asir, span_=span(stretch(
        None, F(asir, 'year_start', 'start'), F(asir, 'seg0.end', 'end')))))

    # ---------- Yemen ----------
    ye, yv, qs, kye, yar, ap, ac, aprot, fsa, sy, yem = (
        'Yemen Eyalet', 'Yemen vilayet', 'Qasimid State', 'Kingdom of Yemen', 'Yemen Arab Republic', 'Aden Province', 'Aden Colony',
        'Aden Protectorate', 'Federation of South Arabia', 'South Yemen', 'Yemen')
    T.append(row('yemen', 'Yemen', '#b03a3a', 'western-asia', yem, phases=[
        phase('Yemen Eyalet', F(ye, 'seg0.start', 'start'), F(ye, 'seg0.end', 'end')),
        # the Zaydi imams' state rose against the Ottoman province and expelled it: overlapping phases
        phase('Qasimid State', F(qs, 'year_start', 'start'), F(qs, 'year_end', 'end')),
        phase('Yemen Eyalet (restored)', F(ye, 'seg1.start', 'start'), F(ye, 'seg1.end', 'end')),
        phase('Yemen Vilayet', F(yv, 'year_start', 'start'), F(yv, 'year_end', 'end')),
        phase('Kingdom of Yemen (North)', F(kye, 'year_start', 'start'), F(kye, 'year_end', 'end'), endEvent='north-yemen-civil-war'),
        phase('Yemen Arab Republic (North)', F(yar, 'year_start', 'start'), F(yar, 'year_end', 'end'), startEvent='north-yemen-civil-war', endEvent='yemeni-unification'),
        # the British south ran alongside the north
        phase('Aden Settlement and Province', F(ap, 'year_start', 'start'), F(ap, 'year_end', 'end')),
        phase('Aden Protectorate', F(aprot, 'year_start', 'start'), F(aprot, 'year_end', 'end')),
        phase('Aden Colony', F(ac, 'year_start', 'start'), F(ac, 'year_end', 'end')),
        phase('Federation of South Arabia', F(fsa, 'year_start', 'start'), F(fsa, 'year_end', 'end'), endEvent='south-yemen-independence'),
        phase("People's Democratic Republic of Yemen (South)", F(sy, 'year_start', 'start'), F(sy, 'year_end', 'end'),
              startEvent='south-yemen-independence', endEvent='yemeni-unification'),
        phase('Republic of Yemen', est(yem, 1), ongoing=cur(yem, 2), startEvent='yemeni-unification'),
    ], memberOf=[
        member('ottoman-empire', F(ye, 'seg0.start', 'start'), F(ye, 'seg0.end', 'end') + L(qs, 'completely expelled the Ottomans from Yemen by 1636', 1636),
               sources=[lead(qs, 'Ottoman-ruled Yemen Eyalet')]),
        member('ottoman-empire', F(ye, 'seg1.start', 'start'), F(yv, 'year_end', 'end'), sources=[lead(qs, 'restored Ottoman province of Yemen Eyale')]),
        member('british-empire', F(ap, 'year_start', 'start'), F(fsa, 'year_end', 'end'), sources=[lead(ac, 'annexed by the British in 1839')],
               endEvent='south-yemen-independence'),
    ]))
    tah, kat, lah, qua = 'Tahirid Sultanate', 'Kathiri', 'Sultanate of Lahej', "Qu'aiti"
    T.append(row('tahirid-sultanate', 'Tahirid Sultanate', '#a05a4a', 'western-asia', tah, span_=span(stretch(
        None, F(tah, 'year_start', 'start'), F(tah, 'year_end', 'end')))))
    T.append(row('kathiri', 'Kathiri Sultanate', '#9a6a3a', 'western-asia', kat,
                 # the article dates three Kathiri states; the second and third (1803–58, 1840s–1967) overlap, so one stretch
                 span_=span(stretch(None, est(kat, 1) + L(kat, 'It was established in 1379', 1379, 'The lead dates its founding to 1379.'), est(kat, 2)),
                            stretch(None, est(kat, 3), est(kat, 8), endEvent='south-yemen-independence')),
                 memberOf=[member('british-empire', est(kat, 6), est(kat, 8), sources=[G.ref(kat, 'infobox established_event6: Informal protection treaty with the British signed, 1888')],
                                  startEvent='hadhramaut-protection-1888', endEvent='south-yemen-independence')]))
    T.append(row('sultanate-of-lahej', 'Sultanate of Lahej', '#8a5a5a', 'western-asia', lah, span_=span(stretch(
        None, F(lah, 'year_start', 'start'), F(lah, 'year_end', 'end'), endEvent='south-yemen-independence')),
        memberOf=[member('british-empire', EV(lah, 3), F(lah, 'year_end', 'end') , sources=[lead(lah, 'became part of the Aden Protectorate')],
                         endEvent='south-yemen-independence')]))
    T.append(row('quaiti', "Qu'aiti Sultanate", '#7a5a6a', 'western-asia', qua, span_=span(stretch(
        None, F(qua, 'year_start', 'start'), F(qua, 'year_end', 'end'), endEvent='south-yemen-independence')),
        memberOf=[member('british-empire', EV(qua, 1), F(qua, 'year_end', 'end'), sources=[G.ref(qua, 'infobox event1: British protectorate, 1888')],
                         startEvent='hadhramaut-protection-1888', endEvent='south-yemen-independence')]))

    # ---------- Oman ----------
    om, mo, oe, io = 'Oman', 'Muscat and Oman', 'Omani Empire', 'Imamate of Oman'
    T.append(row('oman', 'Oman', '#c0402a', 'western-asia', om, phases=[
        # the Ibadi imamate held the interior through every coastal government until 1959: a parallel phase
        phase('Imamate of Oman', F(io, 'year_start', 'start') + [dict(est(om, 3)[0], note='The Oman article dates the imamate from 751.')],
              F(io, 'year_end', 'end'), endEvent='jebel-akhdar-war'),
        phase('Portuguese rule (coast)', est(om, 5), est(om, 5, ':last')),
        phase("Ya'rubid dynasty", est(om, 6), S1(oe)),
        phase('Omani Empire', F(oe, 'year_start', 'start'), F(oe, 'year_end', 'end'), endEvent='zanzibar-partition'),
        phase('Muscat and Oman', F(mo, 'year_start', 'start'), F(mo, 'year_end', 'end'), startEvent='zanzibar-partition', endEvent='omani-coup-1970'),
        phase('Sultanate of Oman', est(om, 10), ongoing=cur(om, 11), startEvent='omani-coup-1970'),
    ], memberOf=[
        member('portuguese-empire', est(om, 5), est(om, 5, ':last'), sources=[G.ref(om, 'infobox established_event5: Portuguese rule, 1507–1656')]),
    ]))

    # ---------- the Gulf ----------
    ts, uae = 'Trucial States', 'United Arab Emirates'
    T.append(row('united-arab-emirates', 'United Arab Emirates', '#3a7a6a', 'western-asia', uae, phases=[
        phase('Trucial States', F(ts, 'year_start', 'start'), F(ts, 'year_end', 'end'), startEvent='general-maritime-treaty', endEvent='uae-formed'),
        phase('United Arab Emirates', est(uae, 2), ongoing=cur(uae, 3), startEvent='uae-formed'),
    ], memberOf=[
        member('british-empire', F(ts, 'year_start', 'start'), F(ts, 'year_end', 'end'), sources=[lead(ts, 'informal British protectorate')],
               startEvent='general-maritime-treaty', endEvent='uae-formed'),
    ]))
    qa = 'Qatar'
    T.append(row('qatar', 'Qatar', '#8a1a3a', 'western-asia', qa,
                 span_=span(stretch(None, est(qa, 1) + L(qa, 'signed an agreement with Britain in 1868', 1868, 'The House of Thani has ruled since the 1868 agreement with Britain.'),
                                    ongoing=cur(qa, 3))),
                 memberOf=[member('british-empire', LY(qa, 'became a British protectorate in 1916', 0), LY(qa, 'became a British protectorate in 1916', 1),
                                  sources=[lead(qa, 'became a British protectorate in 1916')], endEvent='qatar-independence')]))
    bd, bh = 'Bahrain and its Dependencies', 'Bahrain'
    T.append(row('bahrain', 'Bahrain', '#c02a3a', 'western-asia', bh, phases=[
        phase('Bahrain and its Dependencies', F(bd, 'year_start', 'start'), F(bd, 'year_end', 'end'), endEvent='bahrain-independence'),
        phase('State of Bahrain', est(bh, 2), est(bh, 4)),
        phase('Kingdom of Bahrain', est(bh, 4), ongoing=cur(bh, 4)),
    ], memberOf=[
        member('british-empire', EV(bd, 1), F(bd, 'year_end', 'end'), sources=[G.ref(bd, 'infobox event1: British protected state, 31 May 1861')],
               endEvent='bahrain-independence'),
    ]))
    ek, kw = 'Emirate of Kuwait', 'Kuwait'
    T.append(row('kuwait', 'Kuwait', '#2a8a4a', 'western-asia', kw, phases=[
        phase('Emirate of Kuwait', F(ek, 'year_start', 'start'), F(ek, 'year_end', 'end'), endEvent='kuwaiti-independence'),
        phase('State of Kuwait', est(kw, 3), ongoing=cur(kw, 4), startEvent='kuwaiti-independence'),
    ], memberOf=[
        member('british-empire', est(kw, 1), est(kw, 3), sources=[lead(ek, 'under the protection of the British')],
               startEvent='anglo-kuwaiti-agreement', endEvent='kuwaiti-independence'),
    ]))

    # =====================================================================================================
    # Northern Africa
    # =====================================================================================================

    # ---------- seam rows (Medieval World ids and dates) ----------
    ms = 'Mamluk Sultanate'
    T.append(row('mamluk-sultanate', 'Mamluk Sultanate', '#a85a2a', 'northern-africa', ms, span_=span(stretch(
        None, copy_claims([(ms, 'infobox year_start: 1250', 'year_start', 'start')]),
        copy_claims([(ms, 'infobox year_end: 1517', 'year_end', 'end')]), endEvent='ottoman-mamluk-war'))))
    ab = 'Abbasid Caliphate'
    T.append(row('caliphate', 'Caliphate', '#2f7d4f', 'northern-africa', 'Caliphate', phases=[
        phase('Abbasid caliphs in Cairo', copy_claims([(ab, 'infobox life span: 1261–1517', 'seg1.start', 'start')]),
              copy_claims([(ab, 'infobox life span: 1261–1517', 'seg1.end', 'end')]), endEvent='ottoman-mamluk-war'),
    ]))

    # ---------- Egypt ----------
    oeg, kh, se_, keg, re_, uar, eg = ('Ottoman Egypt', 'Khedivate of Egypt', 'Sultanate of Egypt', 'Kingdom of Egypt',
                                       'Republic of Egypt (1953–1958)', 'United Arab Republic', 'Egypt')
    T.append(row('egypt', 'Egypt', '#c09a2a', 'northern-africa', eg,
                 # inside the United Arab Republic (1958–71) with no government of its own: the lifespan carries it across
                 span_=span(stretch(None, F(oeg, 'year_start', 'start'), ongoing=cur(eg, 4))),
                 phases=[
        phase('Ottoman Egypt', F(oeg, 'year_start', 'start'), EV(oeg, 5), startEvent='ottoman-mamluk-war', endEvent='khedivate-recognised'),
        phase('Khedivate of Egypt', F(kh, 'year_start', 'start'), F(kh, 'year_end', 'end'), startEvent='khedivate-recognised', endEvent='british-protectorate-egypt'),
        phase('Sultanate of Egypt', F(se_, 'year_start', 'start'), F(se_, 'year_end', 'end'), startEvent='british-protectorate-egypt', endEvent='egyptian-independence'),
        phase('Kingdom of Egypt', F(keg, 'year_start', 'start'), F(keg, 'year_end', 'end'), startEvent='egyptian-independence', endEvent='egypt-republic-declared'),
        phase('Republic of Egypt', F(re_, 'year_start', 'start'), F(re_, 'year_end', 'end'), startEvent='egypt-republic-declared', endEvent='uar-formed'),
        phase('Arab Republic of Egypt', S1(uar, 'year_end'), ongoing=cur(eg, 4), startEvent='uar-renamed'),
    ], memberOf=[
        member('ottoman-empire', F(oeg, 'year_start', 'start'), F(oeg, 'year_end', 'end'), sources=[lead(oeg, 'administrative division of the Ottoman Empire')],
               startEvent='ottoman-mamluk-war', endEvent='british-protectorate-egypt'),
        member('british-empire', LY(oeg, 'de facto British control from 1882', -1), F(se_, 'year_end', 'end'),
               sources=[lead(oeg, 'de facto British control from 1882'), lead(se_, 'was a British protectorate')],
               startEvent='anglo-egyptian-war', endEvent='egyptian-independence'),
        member('united-arab-republic', F(uar, 'year_start', 'start'), F(uar, 'year_end', 'end'), sources=[lead(uar, 'Egypt continued to be known officially')],
               startEvent='uar-formed', endEvent='uar-renamed'),
    ]))
    T.append(row('united-arab-republic', 'United Arab Republic', '#7a6a2a', 'northern-africa', uar, span_=span(stretch(
        None, F(uar, 'year_start', 'start'), F(uar, 'year_end', 'end'), startEvent='uar-formed', endEvent='uar-renamed'))))

    # ---------- Sudan ----------
    tes, aes, rs1, drs, rs2, sud = ('Turco-Egyptian Sudan', 'Anglo-Egyptian Sudan', 'Republic of the Sudan (1956–1969)',
                                    'Democratic Republic of the Sudan', 'Republic of the Sudan (1985–2019)', 'Sudan')
    T.append(row('sudan', 'Sudan', '#3a5a9a', 'northern-africa', sud, phases=[
        phase('Turco-Egyptian Sudan', F(tes, 'year_start', 'start') + [dict(est(sud, 3)[0], note='The Sudan article dates it from 1820.')],
              F(tes, 'year_end', 'end'), startEvent='conquest-of-sudan', endEvent='siege-of-khartoum'),
        phase('Anglo-Egyptian Sudan', F(aes, 'year_start', 'start'), F(aes, 'year_end', 'end'), startEvent='anglo-egyptian-condominium', endEvent='sudanese-independence'),
        phase('Republic of the Sudan', F(rs1, 'year_start', 'start'), F(rs1, 'year_end', 'end'), startEvent='sudanese-independence', endEvent='sudanese-coup-1969'),
        phase('Democratic Republic of the Sudan', F(drs, 'year_start', 'start'), F(drs, 'year_end', 'end'), startEvent='sudanese-coup-1969', endEvent='sudanese-coup-1985'),
        phase('Republic of the Sudan (1985–2019)', F(rs2, 'year_start', 'start'), F(rs2, 'year_end', 'end'), startEvent='sudanese-coup-1985', endEvent='sudanese-revolution'),
        phase('Republic of the Sudan (transitional)', est(sud, 10), ongoing=cur(sud, 10), startEvent='sudanese-revolution'),
    ], memberOf=[
        member('egypt', F(tes, 'year_start', 'start'), F(tes, 'year_end', 'end'), sources=[lead(tes, 'Muhammad Ali Pasha conquered the Funj Sultanate')],
               startEvent='conquest-of-sudan', endEvent='siege-of-khartoum'),
        member('egypt', F(aes, 'year_start', 'start'), F(aes, 'year_end', 'end'), sources=[lead(aes, 'condominium of the United Kingdom and Egypt')],
               startEvent='anglo-egyptian-condominium', endEvent='sudanese-independence'),
        member('british-empire', F(aes, 'year_start', 'start'), F(aes, 'year_end', 'end'), sources=[lead(aes, 'condominium of the United Kingdom and Egypt')],
               startEvent='anglo-egyptian-condominium', endEvent='sudanese-independence'),
    ]))
    fs, dar, taq, mah = 'Funj Sultanate', 'Sultanate of Darfur', 'Taqali', 'Mahdist State'
    T.append(row('funj-sultanate', 'Funj Sultanate', '#5a6aa0', 'northern-africa', fs, span_=span(stretch(
        None, F(fs, 'year_start', 'start'), F(fs, 'year_end', 'end'), startEvent='funj-founded', endEvent='conquest-of-sudan'))))
    T.append(row('sultanate-of-darfur', 'Sultanate of Darfur', '#6a5a8a', 'northern-africa', dar, span_=span(
        # the infobox says "mid-16th century" for its start: 1550, circa, as Medieval World reads a century
        stretch(None, [{'year': 1550, 'margin': 50, 'source': G.ref(dar, 'infobox life span: mid-16th century–1874'),
                        'note': 'The infobox says "mid-16th century" and the lead "from the 16th century": 1550 ± 50 stands for that.'}],
                F(dar, 'seg0.end', 'end'), circa=True, endEvent='darfur-conquered-1874'),
        stretch(None, F(dar, 'seg1.start', 'start'), F(dar, 'seg1.end', 'end'), startEvent='darfur-independence-1898'),
    )))
    T.append(row('taqali', 'Taqali', '#4a6a8a', 'northern-africa', taq, span_=span(stretch(
        None, F(taq, 'year_start', 'start'), F(taq, 'year_end', 'end'), endEvent='sudanese-coup-1969'))))
    T.append(row('mahdist-state', 'Mahdist State', '#3a3a7a', 'northern-africa', mah, span_=span(stretch(
        None, F(mah, 'year_start', 'start'), F(mah, 'year_end', 'end'), startEvent='siege-of-khartoum', endEvent='mahdist-war'))))

    # ---------- Libya ----------
    st, ht, ot, itr, icy, tr, il, bma, ec, kl, gad, ly = (
        'Spanish Tripoli', 'Hospitaller Tripoli', 'Ottoman Tripolitania', 'Italian Tripolitania', 'Italian Cyrenaica', 'Tripolitanian Republic',
        'Italian Libya', 'British Military Administration (Libya)', 'Emirate of Cyrenaica', 'Kingdom of Libya',
        'History of Libya under Muammar Gaddafi', 'Libya')
    T.append(row('libya', 'Libya', '#2a7a2a', 'northern-africa', ly, phases=[
        phase('Spanish Tripoli', F(st, 'year_start', 'start'), F(st, 'year_end', 'end'), startEvent='spanish-conquest-of-tripoli', endEvent='hospitaller-tripoli'),
        phase('Hospitaller Tripoli', F(ht, 'year_start', 'start'), F(ht, 'year_end', 'end'), startEvent='hospitaller-tripoli', endEvent='siege-of-tripoli-1551'),
        phase('Ottoman Tripolitania (Regency of Tripoli)', F(ot, 'year_start', 'start'), F(ot, 'year_end', 'end'), startEvent='siege-of-tripoli-1551',
              endEvent='italo-turkish-war'),
        phase('Italian Tripolitania', F(itr, 'year_start', 'start'), F(itr, 'year_end', 'end'), startEvent='italo-turkish-war', endEvent='italian-libya-unified'),
        phase('Italian Cyrenaica', F(icy, 'year_start', 'start'), F(icy, 'year_end', 'end'), startEvent='italo-turkish-war', endEvent='italian-libya-unified'),
        # a resistance republic inside Italian Tripolitania: a rival phase
        phase('Tripolitanian Republic', F(tr, 'year_start', 'start'), F(tr, 'year_end', 'end')),
        phase('Italian Libya', F(il, 'year_start', 'start'), F(il, 'year_end', 'end'), startEvent='italian-libya-unified', endEvent='western-desert-campaign'),
        phase('British Military Administration', F(bma, 'date_start', 'start') + F(bma, 'seg0.start', 'start'), F(bma, 'date_end', 'end'),
              startEvent='western-desert-campaign', endEvent='libyan-independence'),
        phase('Emirate of Cyrenaica', F(ec, 'date_start', 'start'), F(ec, 'date_end', 'end'), endEvent='libyan-independence'),
        phase('Kingdom of Libya', F(kl, 'year_start', 'start'), F(kl, 'year_end', 'end'), startEvent='libyan-independence', endEvent='libyan-coup-1969'),
        phase('Libyan Arab Republic', F(gad, 'year_start', 'start'), F(gad, 'year_end', 'end'), startEvent='libyan-coup-1969', endEvent='jamahiriya-proclaimed'),
        phase('Libyan Arab Jamahiriya', LY(gad, 'In 1977, the name was changed'), LY(gad, 'marked the end of the Libyan Arab Jamahiriya'),
              startEvent='jamahiriya-proclaimed', endEvent='libyan-civil-war-2011'),
        phase('State of Libya', LY(gad, 'marked the end of the Libyan Arab Jamahiriya'), ongoing=cur(ly, 10), startEvent='libyan-civil-war-2011'),
    ], memberOf=[
        member('spanish-empire', F(st, 'year_start', 'start'), F(st, 'year_end', 'end'), sources=[lead(ly, 'the Spanish Empire and the Knights Hospitaller occupied Tripoli')],
               startEvent='spanish-conquest-of-tripoli', endEvent='hospitaller-tripoli'),
        member('knights-hospitaller', F(ht, 'year_start', 'start'), F(ht, 'year_end', 'end'), sources=[lead(ly, 'the Spanish Empire and the Knights Hospitaller occupied Tripoli')],
               startEvent='hospitaller-tripoli', endEvent='siege-of-tripoli-1551'),
        member('ottoman-empire', F(ot, 'year_start', 'start'), F(ot, 'year_end', 'end'), sources=[lead(ot, 'officially ruled by the Ottoman Empire from 1551 to 1912')],
               startEvent='siege-of-tripoli-1551', endEvent='italo-turkish-war'),
        member('italy', F(itr, 'year_start', 'start'), F(il, 'year_end', 'end'), sources=[lead(il, 'colony of the Kingdom of Italy')],
               startEvent='italo-turkish-war', endEvent='western-desert-campaign'),
        member('british-empire', F(bma, 'date_start', 'start'), F(bma, 'date_end', 'end'), sources=[lead(bma, 'control of the regions of Cyrenaica and Tripolitania')],
               startEvent='western-desert-campaign', endEvent='libyan-independence'),
    ]))

    # ---------- Tunisia ----------
    hd, otu, bt, fpt, kt, tun = ('Hafsid dynasty', 'Ottoman Tunisia', 'Beylik of Tunis', 'French protectorate of Tunisia', 'Kingdom of Tunisia', 'Tunisia')
    T.append(row('hafsid-tunisia', 'Hafsids (Tunisia)', '#c0702a', 'northern-africa', hd, span_=span(stretch(
        None, copy_claims([(hd, 'infobox year_start: 1229', 'year_start', 'start')]),
        copy_claims([(hd, 'infobox year_end: 1574', 'year_end', 'end')]), endEvent='conquest-of-tunis-1574'))))
    T.append(row('tunisia', 'Tunisia', '#d03a3a', 'northern-africa', tun, phases=[
        phase('Ottoman Tunisia', F(otu, 'year_start', 'start'), EV(otu, 3), startEvent='conquest-of-tunis-1574', endEvent='husainid-dynasty'),
        phase('Beylik of Tunis', F(bt, 'year_start', 'start'), F(bt, 'year_end', 'end'), startEvent='husainid-dynasty', endEvent='treaty-of-bardo'),
        phase('French protectorate of Tunisia', F(fpt, 'year_start', 'start'), F(fpt, 'year_end', 'end'), startEvent='treaty-of-bardo', endEvent='tunisian-independence'),
        phase('Kingdom of Tunisia', F(kt, 'year_start', 'start'), F(kt, 'year_end', 'end'), startEvent='tunisian-independence', endEvent='tunisian-republic'),
        phase('Tunisian Republic', est(tun, 12), ongoing=cur(tun, 12), startEvent='tunisian-republic'),
    ], memberOf=[
        member('ottoman-empire', F(otu, 'year_start', 'start'), F(bt, 'year_end', 'end'), sources=[lead(otu, 'the Ottomans maintained control of Tunis')],
               startEvent='conquest-of-tunis-1574', endEvent='treaty-of-bardo'),
        member('french-colonial-empire', F(fpt, 'year_start', 'start'), F(fpt, 'year_end', 'end'), sources=[lead(fpt, 'period of French colonial rule in Tunisia')],
               startEvent='treaty-of-bardo', endEvent='tunisian-independence'),
    ]))

    # ---------- Algeria ----------
    zt, ra, fa, abk, gpra, alg = ('Kingdom of Tlemcen', 'Regency of Algiers', 'French Algeria', 'Emirate of Abdelkader',
                                  'Provisional Government of the Algerian Republic', 'Algeria')
    T.append(row('zayyanid-tlemcen', 'Zayyanids (Tlemcen)', '#5a3a6a', 'northern-africa', zt, span_=span(stretch(
        None, copy_claims([(zt, 'infobox year_start: 1235', 'year_start', 'start')]),
        copy_claims([(zt, 'infobox year_end: 1556', 'year_end', 'end')]), endEvent='tlemcen-annexed'))))
    T.append(row('algeria', 'Algeria', '#2a8a5a', 'northern-africa', alg, phases=[
        phase('Regency of Algiers', F(ra, 'year_start', 'start') + [dict(est(alg, 10)[0], note='The Algeria article dates the Regency from 1515.')],
              F(ra, 'year_end', 'end'), startEvent='capture-of-algiers-1516', endEvent='invasion-of-algiers-1830'),
        phase('French Algeria', F(fa, 'year_start', 'start'), F(fa, 'year_end', 'end'), startEvent='invasion-of-algiers-1830', endEvent='algerian-independence'),
        # Abdelkader's emirate resisted the French conquest; the GPRA was the independence movement's government: rival phases
        phase('Emirate of Abdelkader', F(abk, 'year_start', 'start'), F(abk, 'year_end', 'end'), endEvent='abdelkader-surrenders'),
        phase('Provisional Government of the Algerian Republic', F(gpra, 'year_start', 'start'), F(gpra, 'year_end', 'end'),
              startEvent='gpra-proclaimed', endEvent='algerian-independence'),
        phase("People's Democratic Republic of Algeria", est(alg, 14), ongoing=cur(alg, 14), startEvent='algerian-independence'),
    ], memberOf=[
        member('ottoman-empire', F(ra, 'year_start', 'start'), F(ra, 'year_end', 'end'), sources=[lead(ra, 'semi-independent Ottoman frontier province')],
               startEvent='capture-of-algiers-1516', endEvent='invasion-of-algiers-1830'),
        member('french-colonial-empire', F(fa, 'year_start', 'start'), F(fa, 'year_end', 'end'), sources=[lead(fa, 'French rule lasted from the beginning')],
               startEvent='invasion-of-algiers-1830', endEvent='algerian-independence'),
    ]))
    ku, ba, tg = 'Kingdom of Kuku', 'Kingdom of Beni Abbas', 'Sultanate of Tuggurt'
    T.append(row('kingdom-of-kuku', 'Kingdom of Kuku', '#6a4a7a', 'northern-africa', ku, span_=span(stretch(
        None, F(ku, 'year_start', 'start'), LY(ku, 'ruled by the Ath l-Qadi dynasty until', 1) + LY(ku, 'ruled by the Ath l-Qadi dynasty until', 2), circa=True))))
    T.append(row('kingdom-of-beni-abbas', 'Kingdom of Beni Abbas', '#7a4a6a', 'northern-africa', ba, span_=span(stretch(
        None, F(ba, 'year_start', 'start'), F(ba, 'year_end', 'end')))))
    T.append(row('sultanate-of-tuggurt', 'Sultanate of Tuggurt', '#8a6a4a', 'northern-africa', tg, span_=span(stretch(
        None, F(tg, 'year_start', 'start'), F(tg, 'year_end', 'end'), endEvent='tuggurt-conquered'))))

    # ---------- Morocco ----------
    wd, sad, mor, fpm, spm = 'Wattasid dynasty', 'Saadi Sultanate', 'Morocco', 'French protectorate in Morocco', 'Spanish protectorate in Morocco'
    T.append(row('morocco', 'Morocco', '#a8302a', 'northern-africa', mor, phases=[
        # Medieval World's phase, copied (seam)
        phase('Wattasid dynasty', copy_claims([(mor, 'infobox established_event6: Wattasid Dynasty, 1472', 'established_date6', 'start'),
                                               (wd, 'infobox year_start: 1472', 'year_start', 'start')]),
              copy_claims([(wd, 'infobox year_end: 1554', 'year_end', 'end')]), endEvent='battle-of-tadla'),
        # the Saadis rose in the south from 1510 while the Wattasids held Fez: overlapping phases
        phase('Saadi Sultanate', F(sad, 'year_start', 'start'), F(sad, 'year_end', 'end')),
        # the Alawi sultanate's own article has no infobox: dated by the Morocco infobox and the protectorate's start
        phase('Alawi Sultanate', est(mor, 8), est(mor, 9), endEvent='treaty-of-fez'),
        phase('French protectorate in Morocco', F(fpm, 'year_start', 'start'), F(fpm, 'year_end', 'end'), startEvent='treaty-of-fez', endEvent='moroccan-independence'),
        phase('Spanish protectorate in Morocco', F(spm, 'year_start', 'start'), F(spm, 'year_end', 'end'), startEvent='treaty-of-madrid-1912',
              endEvent='moroccan-independence'),
        phase('Kingdom of Morocco', est(mor, 10), ongoing=cur(mor, 11), startEvent='moroccan-independence'),
    ], memberOf=[
        member('french-colonial-empire', F(fpm, 'year_start', 'start'), F(fpm, 'year_end', 'end'), sources=[lead(fpm, 'period of French colonial rule in Morocco')],
               startEvent='treaty-of-fez', endEvent='moroccan-independence'),
        member('spanish-empire', F(spm, 'year_start', 'start'), F(spm, 'year_end', 'end'), sources=[lead(spm, 'formal Spanish prot')],
               startEvent='treaty-of-madrid-1912', endEvent='moroccan-independence'),
    ]))
    sal, rif = 'Republic of Salé', 'Republic of the Rif'
    T.append(row('republic-of-sale', 'Republic of Salé', '#8a4a3a', 'northern-africa', sal, span_=span(stretch(
        None, F(sal, 'year_start', 'start'), F(sal, 'year_end', 'end')))))
    T.append(row('republic-of-the-rif', 'Republic of the Rif', '#6a3a2a', 'northern-africa', rif, span_=span(stretch(
        None, F(rif, 'year_start', 'start'), F(rif, 'year_end', 'end'), startEvent='rif-war', endEvent='rif-war'))))

    # ---------- Western Sahara ----------
    ss, sadr = 'Spanish Sahara', 'Sahrawi Arab Democratic Republic'
    T.append(row('western-sahara', 'Western Sahara (SADR, disputed)', '#5a8a3a', 'northern-africa', sadr, phases=[
        phase('Spanish Sahara', F(ss, 'year_start', 'start'), F(ss, 'year_end', 'end'), endEvent='sadr-proclaimed'),
        # proclaimed by the Polisario Front; sovereignty disputed with Morocco, which holds most of the territory
        phase('Sahrawi Arab Democratic Republic', est(sadr, 2), ongoing=G.ref(sadr, 'infobox established_event3: Sovereignty disputed with Morocco (current state)'),
              startEvent='sadr-proclaimed'),
    ], memberOf=[
        member('spanish-empire', F(ss, 'year_start', 'start'), F(ss, 'year_end', 'end'), sources=[lead(ss, 'Spanish Possessions in the Sahara')],
               endEvent='sadr-proclaimed'),
    ]))
    return T


def events(M):
    G, E, W, F, ev, lead = M.G, M.E, M.W, M.F, M.ev, M.lead
    import wp_states

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
        """An event dated by an infobox event (date_eventN, or 'start'/'end'); a range becomes start and end."""
        r = G.art(article)
        f = r['fields']
        dk = f'date_event{n}' if n not in ('start', 'end') else f'date_{n}'
        ys = (f.get(dk) or {}).get('years') or []
        y, ref = E(article, n)
        if len(ys) > 1 and ys[-1] != ys[0]:
            kw.setdefault('end', ys[-1])
        return ev(uuid, title, y, tracks, ref, **kw)

    def lev(uuid, title, article, needle, tracks, k=0, end_k=None, **kw):
        """An event dated by a year written in a lead sentence (the k-th year; end_k for a range)."""
        for s in G.art(article)['body']['lead']:
            if needle in s['text']:
                ys = wp_states.years_in(s['text'])[0]
                if end_k is not None:
                    kw['end'] = ys[end_k]
                return ev(uuid, title, ys[k], tracks, G.ref(article, f'lead: "{s["text"][:160]}"'), **kw)
        raise SystemExit(f'{article}: no lead sentence with {needle!r}')

    def ongoing(e):
        e.pop('end', None)
        e['ongoing'] = True
        return e

    return [
        # ================= Ottoman conquests (1510s) and the seam rows =================
        wev('battle-of-turnadag', 'Battle of Turnadağ', 'Battle of Turnadağ', ['beylik-of-dulkadir', 'ottoman-empire'],
            descr='The Ottomans defeat Dulkadir; the beylik becomes an Ottoman vassal.'),
        wev('battle-of-marj-dabiq', 'Battle of Marj Dabiq', 'Battle of Marj Dabiq', ['ottoman-empire', 'mamluk-sultanate', 'syria'],
            descr='Selim I defeats the Mamluk sultan Qansuh al-Ghawri north of Aleppo; Syria passes to the Ottomans.'),
        wev('ottoman-mamluk-war', 'Ottoman–Mamluk War', 'Ottoman–Mamluk War (1516–1517)',
            ['ottoman-empire', 'mamluk-sultanate', 'caliphate', 'egypt', 'lebanon', 'sharifate-of-mecca', 'ramadanid-emirate'], importance=1,
            descr='The Ottomans conquer Syria, Egypt and the Hejaz; the Mamluk Sultanate ends and the last Abbasid caliph of Cairo is taken to Constantinople.'),
        wev('battle-of-ridaniya', 'Battle of Ridaniya', 'Battle of Ridaniya', ['ottoman-empire', 'mamluk-sultanate', 'egypt'],
            descr='Selim I defeats Tuman Bay II outside Cairo on 22 January 1517.'),
        fev('dulkadir-annexed', 'Dulkadir annexed by the Ottomans', 'Beylik of Dulkadir', 'year_end', ['beylik-of-dulkadir', 'ottoman-empire']),
        fev('ramadanid-end', 'End of the Ramadanid Emirate', 'Ramadanid Emirate', 'year_end', ['ramadanid-emirate']),
        wev('siege-of-aden-1513', 'Portuguese siege of Aden', 'Siege of Aden (1513)', ['tahirid-sultanate', 'portuguese-empire'],
            descr='Afonso de Albuquerque fails to take Aden from the Tahirids.'),
        fev('tahirid-end', 'End of the Tahirid Sultanate', 'Tahirid Sultanate', 'year_end', ['tahirid-sultanate'],
            descr='The Tahirids fall in 1517, the year the Mamluks and then the Ottomans reach Yemen.'),

        # ================= Turkey and Cyprus =================
        wev('turkish-war-of-independence', 'Turkish War of Independence', 'Turkish War of Independence', ['turkey', 'ottoman-empire', 'greece'], importance=1,
            descr='The Ankara government fights the Allied occupation and partition of Anatolia.'),
        fev('gna-established', 'Grand National Assembly opens in Ankara', 'Government of the Grand National Assembly', 'year_start', ['turkey'],
            descr='The nationalist parliament opens on 23 April 1920 and forms a rival government to the Sultan\'s.'),
        wev('treaty-of-sevres', 'Treaty of Sèvres', 'Treaty of Sèvres', ['ottoman-empire', 'iraq', 'turkey'],
            descr='The Allies partition the Ottoman Empire; the Ankara government rejects the treaty. The mandates it confirms include Iraq.'),
        fev('sultanate-abolished', 'Ottoman sultanate abolished', 'Turkey', 'established_date4', ['turkey', 'ottoman-empire'], importance=1,
            descr='The Grand National Assembly abolishes the sultanate on 1 November 1922: the Ottoman Empire ends.'),
        wev('treaty-of-lausanne', 'Treaty of Lausanne', 'Treaty of Lausanne', ['turkey', 'greece', 'cyprus'],
            descr='The Allies recognise the new Turkish state; Turkey gives up its claim to Cyprus and the Arab provinces.'),
        fev('republic-of-turkey-proclaimed', 'Republic of Turkey proclaimed', 'Turkey', 'established_date6', ['turkey'], importance=1,
            descr='Mustafa Kemal becomes the first president on 29 October 1923.'),
        fev('hatay-independence', 'Hatay State proclaimed', 'Hatay State', 'year_start', ['hatay-state', 'french-colonial-empire'],
            descr='The Sanjak of Alexandretta becomes a nominally independent state under French and Turkish supervision.'),
        iev('hatay-joins-turkey', 'Hatay joins Turkey', 'Hatay State', 6, ['hatay-state', 'turkey', 'french-colonial-empire'],
            descr='The Hatay assembly votes to join Turkey on 29 June 1939; France cedes the sanjak.'),
        wev('turkish-coup-1960', '1960 Turkish coup', "1960 Turkish coup d'état", ['turkey']),
        wev('turkish-coup-1980', '1980 Turkish coup', "1980 Turkish coup d'état", ['turkey']),
        fev('turkish-constitution-1982', 'Constitution of 1982', 'Turkey', 'established_date7', ['turkey'], descr='Turkey\'s current constitution, adopted under military rule.'),
        wev('turkish-coup-attempt-2016', '2016 Turkish coup attempt', '2016 Turkish coup attempt', ['turkey']),
        wev('ottoman-venetian-war-1570', 'Ottoman–Venetian War (Cyprus)', 'Ottoman–Venetian War (1570–1573)', ['cyprus', 'venice', 'ottoman-empire'], importance=1,
            descr='The Ottomans take Cyprus from Venice; Famagusta falls in 1571.'),
        fev('cyprus-convention', 'Cyprus Convention', 'British Cyprus', 'date_pre', ['cyprus', 'british-empire', 'ottoman-empire'],
            descr='The Ottomans hand Cyprus to British administration on 4 June 1878, keeping nominal sovereignty.'),
        iev('british-annexation-of-cyprus', 'Britain annexes Cyprus', 'British Cyprus', 1, ['cyprus', 'british-empire', 'ottoman-empire'],
            descr='On the Ottoman entry into the First World War, Britain annexes the island on 5 November 1914.'),
        wev('cyprus-emergency', 'Cyprus Emergency', 'Cyprus Emergency', ['cyprus', 'british-empire'], descr='EOKA\'s armed campaign against British rule.'),
        fev('cyprus-independence', 'Cyprus independent', 'Cyprus', 'established_date2', ['cyprus', 'british-empire'], importance=1,
            descr='The Republic of Cyprus is proclaimed on 16 August 1960 under the London and Zürich Agreements.'),
        lev('cyprus-crisis-1963', 'Cypriot intercommunal crisis', 'Cyprus', 'The crisis of 1963–64', ['cyprus'], k=0,
            descr='Intercommunal violence drives Turkish Cypriots into enclaves and out of the government.'),
        wev('cypriot-coup-1974', 'Cypriot coup', "1974 Cypriot coup d'état", ['cyprus', 'greece'],
            descr='Greek Cypriot nationalists and the Greek junta overthrow President Makarios.'),
        wev('turkish-invasion-of-cyprus', 'Turkish invasion of Cyprus', 'Turkish invasion of Cyprus', ['cyprus', 'northern-cyprus', 'turkey'], importance=1,
            descr='Turkey invades after the coup and takes the northern third of the island.'),
        fev('tfsc-proclaimed', 'Turkish Federated State of Cyprus', 'Turkish Federated State of Cyprus', 'year_start', ['northern-cyprus']),
        fev('trnc-declared', 'Northern Cyprus declares independence', 'Northern Cyprus', 'established_date4', ['northern-cyprus'], importance=1,
            descr='Recognised only by Turkey; UN Security Council Resolution 541 calls the declaration legally invalid.'),
        lev('cyprus-joins-eu', 'Cyprus joins the European Union', 'Cyprus', 'joined the European Union in 2004', ['cyprus'], k=0),

        # ================= the Levant =================
        wev('french-invasion-of-egypt', 'French invasion of Egypt and Syria', 'French invasion of Egypt and Syria', ['egypt', 'ottoman-empire', 'france'], importance=1,
            descr='Bonaparte occupies Egypt; British and Ottoman forces expel the French in 1801.'),
        wev('egyptian-ottoman-war-1831', 'Egyptian–Ottoman War', 'Egyptian–Ottoman War (1831–1833)', ['egypt', 'ottoman-empire', 'syria'],
            descr='Muhammad Ali\'s Egypt takes Syria from the Sultan.'),
        wev('mount-lebanon-conflict-1860', 'Civil conflict in Mount Lebanon and Damascus', '1860 civil conflict in Mount Lebanon and Damascus', ['lebanon', 'syria'],
            descr='Druze–Maronite war; the powers impose an autonomous Mount Lebanon Mutasarrifate.'),
        wev('sinai-and-palestine-campaign', 'Sinai and Palestine campaign', 'Sinai and Palestine campaign', ['ottoman-empire', 'british-empire', 'syria', 'lebanon'],
            importance=1, descr='British Empire forces drive the Ottomans out of the Levant.'),
        wev('arab-revolt', 'Arab Revolt', 'Arab Revolt', ['ottoman-empire', 'sharifate-of-mecca', 'kingdom-of-hejaz', 'british-empire'], importance=1,
            descr='Sharif Hussein of Mecca rises against the Ottomans with British support and proclaims the Kingdom of Hejaz.'),
        wev('armistice-of-mudros', 'Armistice of Mudros', 'Armistice of Mudros', ['ottoman-empire', 'yemen'],
            descr='The Ottomans leave the war; their garrisons in the Arab lands withdraw, and Imam Yahya takes Sanaa.'),
        wev('franco-syrian-war', 'Franco-Syrian War', 'Franco-Syrian War', ['syria', 'french-colonial-empire', 'france'], importance=1,
            descr='France defeats the Arab Kingdom at Maysalun and takes Damascus: the French Mandate begins.'),
        fev('greater-lebanon-declared', 'State of Greater Lebanon declared', 'Greater Lebanon', 'year_start', ['lebanon', 'french-colonial-empire'],
            descr='General Gouraud declares the state on 1 September 1920.'),
        fev('syrian-federation-formed', 'Syrian Federation formed', 'Syrian Federation', 'year_start', ['syrian-federation', 'syria'],
            descr='The High Commissioner joins the States of Aleppo, Damascus and the Alawites on 28 June 1922.'),
        fev('syrian-federation-dissolved', 'State of Syria replaces the Federation', 'State of Syria', 'year_start', ['syrian-federation', 'syria'],
            descr='The States of Damascus and Aleppo merge into the State of Syria from 1 January 1925.'),
        wev('great-syrian-revolt', 'Great Syrian Revolt', 'Great Syrian Revolt', ['syria', 'french-colonial-empire']),
        fev('lebanese-independence', 'Lebanon declares independence', 'Lebanon', 'established_date6', ['lebanon', 'french-colonial-empire'], importance=1,
            descr='Lebanon declares independence from Free France on 22 November 1943.'),
        fev('syria-independence', 'End of the French Mandate in Syria', 'Syria', 'established_date5', ['syria', 'french-colonial-empire'], importance=1,
            descr='The last French troops leave on 17 April 1946.'),
        wev('syrian-coup-1961', "Syrian coup; Syria leaves the UAR", "1961 Syrian coup d'état", ['syria', 'united-arab-republic'], importance=1),
        wev('syrian-coup-1963', "Ba'athist coup in Syria", "1963 Syrian coup d'état", ['syria'], importance=1),
        iev('corrective-revolution-syria', 'Hafez al-Assad seizes power', "Ba'athist Syria", 3, ['syria'], descr='The Corrective Movement of November 1970.'),
        wev('lebanese-civil-war', 'Lebanese Civil War', 'Lebanese Civil War', ['lebanon', 'syria', 'israel'], importance=1),
        wev('lebanon-crisis-1958', '1958 Lebanon crisis', '1958 Lebanon crisis', ['lebanon']),
        fev('israeli-withdrawal-lebanon', 'Israel withdraws from southern Lebanon', 'Lebanon', 'established_date9', ['lebanon', 'israel']),
        fev('syrian-withdrawal-lebanon', 'Syria withdraws from Lebanon', 'Lebanon', 'established_date10', ['lebanon', 'syria'],
            descr='After the assassination of Rafic Hariri and the Cedar Revolution.'),
        wev('lebanon-war-2006', '2006 Lebanon War', '2006 Lebanon War', ['lebanon', 'israel']),
        wev('beirut-explosion', 'Beirut port explosion', '2020 Beirut explosion', ['lebanon']),
        wev('syrian-civil-war', 'Syrian civil war', 'Syrian civil war', ['syria'], importance=1),
        iev('fall-of-assad', 'Fall of the Assad regime', "Ba'athist Syria", 'end', ['syria'], importance=1,
            descr='Opposition offensives take Damascus on 8 December 2024.'),
        wev('mandate-revolt-1936', 'Arab revolt in Palestine', '1936–1939 Arab revolt in Palestine', ['mandatory-palestine', 'british-empire']),
        wev('palestine-war-1948', '1948 Palestine war', '1948 Palestine war', ['mandatory-palestine', 'israel', 'palestine', 'egypt', 'jordan', 'syria', 'iraq', 'lebanon'],
            importance=1, descr='Civil war in the Mandate, then war between Israel and the Arab states; the territory is divided.'),
        fev('israeli-independence', 'Israel declares independence', 'Israel', 'established_date1', ['israel', 'mandatory-palestine', 'british-empire'], importance=1,
            descr='Israel is proclaimed on 14 May 1948 as the British Mandate ends.'),
        fev('west-bank-annexed', 'Jordan annexes the West Bank', 'Jordanian annexation of the West Bank', 'year_start', ['jordan']),
        wev('suez-crisis', 'Suez Crisis', 'Suez Crisis', ['egypt', 'israel', 'united-kingdom', 'france'], importance=1,
            descr='Israel, Britain and France invade after Egypt nationalises the Suez Canal; they withdraw under US and Soviet pressure.'),
        wev('six-day-war', 'Six-Day War', 'Six-Day War', ['israel', 'egypt', 'united-arab-republic', 'syria', 'jordan'], importance=1,
            descr='Israel takes Sinai and Gaza, the West Bank and East Jerusalem, and the Golan Heights.'),
        wev('black-september', 'Black September', 'Black September', ['jordan'], descr='The Jordanian army expels the Palestinian fedayeen.'),
        wev('yom-kippur-war', 'Yom Kippur War', 'Yom Kippur War', ['israel', 'egypt', 'syria'], importance=1),
        wev('camp-david-accords', 'Camp David Accords', 'Camp David Accords', ['egypt', 'israel']),
        wev('egypt-israel-peace-treaty', 'Egypt–Israel peace treaty', 'Egypt–Israel peace treaty', ['egypt', 'israel'], importance=1),
        wev('lebanon-war-1982', '1982 Lebanon War', '1982 Lebanon War', ['israel', 'lebanon', 'syria']),
        wev('first-intifada', 'First Intifada', 'First Intifada', ['palestine', 'israel']),
        fev('palestinian-declaration-of-independence', 'Palestinian Declaration of Independence', 'Palestine', 'established_date1', ['palestine'], importance=1,
            descr='The PLO declares the State of Palestine on 15 November 1988.'),
        wev('oslo-accords', 'Oslo Accords', 'Oslo Accords', ['israel', 'palestine'], importance=1,
            descr='Limited Palestinian self-rule in the West Bank and Gaza through the Palestinian Authority.'),
        wev('israel-jordan-peace-treaty', 'Israel–Jordan peace treaty', 'Israel–Jordan peace treaty', ['israel', 'jordan']),
        wev('second-intifada', 'Second Intifada', 'Second Intifada', ['palestine', 'israel']),
        wev('battle-of-gaza-2007', 'Hamas takes Gaza', 'Battle of Gaza (2007)', ['palestine']),
        wev('october-7-attacks', 'October 7 attacks and the Gaza war', 'October 7 attacks', ['israel', 'palestine'], importance=1,
            descr='Hamas attacks Israel; Israel launches a large-scale war in Gaza.'),
        fev('transjordan-established', 'Emirate of Transjordan established', 'Emirate of Transjordan', 'year_start', ['jordan', 'british-empire'],
            descr='Abdullah bin Hussein rules the territory under the British mandate from 11 April 1921.'),
        fev('jordanian-independence', 'Jordan independent', 'Jordan', 'established_date2', ['jordan', 'british-empire'], importance=1,
            descr='The Hashemite Kingdom of Transjordan becomes independent on 25 May 1946.'),
        fev('arab-federation-formed', 'Arab Federation formed', 'Arab Federation', 'year_start', ['iraq', 'jordan'],
            descr='The Hashemite kings of Iraq and Jordan unite their kingdoms on 14 February 1958, in answer to the UAR.'),

        # ================= Iraq =================
        wev('capture-of-baghdad-1534', 'Ottoman capture of Baghdad', 'Capture of Baghdad (1534)', ['iraq', 'ottoman-empire'], importance=1,
            descr='Suleiman I takes Baghdad from the Safavids.'),
        wev('siege-of-baghdad-1638', 'Ottoman reconquest of Baghdad', 'Siege of Baghdad (1638)', ['iraq', 'ottoman-empire'],
            descr='Murad IV retakes Baghdad after fifteen years of Safavid rule.'),
        fev('iraqi-mamluks', 'Mamluk rule in Iraq begins', 'Mamluk dynasty of Iraq', 'year_start', ['iraq']),
        fev('iraqi-mamluks-end', 'Ottomans overthrow the Iraqi Mamluks', 'Mamluk dynasty of Iraq', 'year_end', ['iraq', 'ottoman-empire']),
        wev('mesopotamian-campaign', 'Mesopotamian campaign', 'Mesopotamian campaign', ['iraq', 'ottoman-empire', 'british-empire'],
            descr='British Empire forces take Basra, Baghdad (1917) and Mosul from the Ottomans.'),
        wev('iraqi-revolt-1920', 'Iraqi revolt of 1920', 'Iraqi revolt of 1920', ['iraq', 'british-empire'],
            descr='A rising against British rule; Britain sets up a kingdom under Faisal.'),
        fev('kurdistan-proclaimed', 'Kingdom of Kurdistan proclaimed', 'Kingdom of Kurdistan', 'year_start', ['kingdom-of-kurdistan'],
            descr='Sheikh Mahmud Barzanji proclaims a Kurdish kingdom in Sulaymaniyah.'),
        fev('kurdistan-disestablished', 'Kingdom of Kurdistan suppressed', 'Kingdom of Kurdistan', 'year_end', ['kingdom-of-kurdistan', 'british-empire']),
        fev('iraqi-independence', 'Iraq independent', 'Kingdom of Iraq', 'year_start', ['iraq', 'british-empire'], importance=1,
            descr='The British Mandate ends on 3 October 1932.'),
        wev('anglo-iraqi-war', 'Anglo-Iraqi War', 'Anglo-Iraqi War', ['iraq', 'united-kingdom'],
            descr='Britain overthrows the pro-Axis government of Rashid Ali.'),
        wev('14-july-revolution', '14 July Revolution', '14 July Revolution', ['iraq', 'jordan'], importance=1,
            descr='Army officers overthrow the Iraqi monarchy; the new republic dissolves the Arab Federation on 2 August.'),
        fev('17-july-revolution', "17 July Revolution (Ba'athist coup)", "Ba'athist Iraq", 'year_start', ['iraq'], importance=1),
        wev('iraqi-invasion-of-kuwait', 'Iraqi invasion of Kuwait', 'Iraqi invasion of Kuwait', ['iraq', 'kuwait'], importance=1,
            descr='Iraq occupies Kuwait, installs a puppet republic and annexes it.'),
        wev('gulf-war', 'Gulf War', 'Gulf War', ['iraq', 'kuwait', 'saudi-arabia', 'united-kingdom'], importance=1,
            descr='A US-led coalition expels Iraq from Kuwait; Kuwait is liberated in February 1991.'),
        wev('invasion-of-iraq-2003', '2003 invasion of Iraq', '2003 invasion of Iraq', ['iraq', 'united-kingdom'], importance=1,
            descr='A US-led coalition overthrows Saddam Hussein; the Coalition Provisional Authority governs.'),
        wev('iraq-war', 'Iraq War', 'Iraq War', ['iraq']),
        lev('iraqi-constitution-2005', 'Iraqi constitution', 'Constitution of Iraq', 'confirmed by constitutional referendum', ['iraq'], k=0,
            descr='Adopted by referendum on 15 October 2005.'),
        wev('iraqi-civil-war-2014', 'War against the Islamic State in Iraq', 'Iraqi Civil War (2014–2017)', ['iraq']),

        # ================= Arabia =================
        iev('diriyah-pact', 'Pact of Diriyah', 'First Saudi state', 1, ['saudi-arabia'], importance=1,
            descr='Muhammad bin Saud and Muhammad ibn Abd al-Wahhab ally: the first Saudi state.'),
        wev('ottoman-wahhabi-war', 'Ottoman–Wahhabi war', 'Ottoman–Wahhabi war', ['saudi-arabia', 'ottoman-empire', 'egypt'], importance=1,
            descr='Muhammad Ali\'s Egyptian army, for the Sultan, destroys Diriyah in 1818.'),
        fev('reconquest-of-riyadh-1824', 'Turki bin Abdullah retakes Riyadh', 'Second Saudi state', 'year_start', ['saudi-arabia'],
            descr='The second Saudi state begins.'),
        wev('battle-of-mulayda', 'Battle of Mulayda', 'Battle of Mulayda', ['saudi-arabia', 'emirate-of-jabal-shammar'],
            descr='The Rashidis of Ha\'il defeat the Saudis; the second Saudi state ends.'),
        fev('jabal-shammar-founded', 'Rashidi emirate founded in Ha\'il', 'Emirate of Jabal Shammar', 'year_start', ['emirate-of-jabal-shammar']),
        wev('battle-of-riyadh-1902', 'Ibn Saud takes Riyadh', 'Battle of Riyadh (1902)', ['saudi-arabia', 'emirate-of-jabal-shammar'], importance=1,
            descr='Abdulaziz Ibn Saud seizes Riyadh from the Rashidis on 13 January 1902.'),
        wev('conquest-of-hail', 'Saudi conquest of Ha\'il', "Conquest of Ha'il", ['saudi-arabia', 'emirate-of-jabal-shammar'],
            descr='Ibn Saud ends the Rashidi emirate.'),
        fev('asir-independence', 'Emirate of Asir independent', 'Emirate of Asir', 'year_start', ['emirate-of-asir']),
        iev('idrisid-mutawakkilite-war', 'Idrisid–Mutawakkilite war', 'Emirate of Asir', 3, ['emirate-of-asir', 'yemen']),
        iev('asir-protectorate', 'Asir becomes a Saudi protectorate', 'Emirate of Asir', 4, ['emirate-of-asir', 'saudi-arabia']),
        wev('saudi-conquest-of-hejaz', 'Saudi conquest of Hejaz', 'Saudi conquest of Hejaz', ['saudi-arabia', 'kingdom-of-hejaz'], importance=1,
            descr='Ibn Saud takes Mecca and Jeddah; the Hashemite kingdom ends.'),
        wev('ikhwan-revolt', 'Ikhwan revolt', 'Ikhwan revolt', ['saudi-arabia']),
        fev('saudi-arabia-proclaimed', 'Kingdom of Saudi Arabia proclaimed', 'Saudi Arabia', 'established_date7', ['saudi-arabia'], importance=1,
            descr='Ibn Saud unites his dominions as Saudi Arabia on 23 September 1932.'),
        wev('saudi-yemeni-war-1934', 'Saudi–Yemeni War', 'Saudi–Yemeni War (1934)', ['saudi-arabia', 'yemen', 'emirate-of-asir'],
            descr='Saudi Arabia defeats Yemen; the Treaty of Taif confirms its annexation of Asir.'),
        lev('saudi-oil', 'Oil discovered in Saudi Arabia', 'Saudi Arabia', 'petroleum was discovered', ['saudi-arabia'], k=0),
        fev('saudi-basic-law', 'Basic Law of Saudi Arabia', 'Saudi Arabia', 'established_date8', ['saudi-arabia']),

        # ================= Yemen and the Hadhramaut =================
        fev('qasimid-rising', 'Imam al-Qasim proclaims the Qasimid state', 'Qasimid State', 'year_start', ['yemen']),
        lev('ottomans-expelled-yemen', 'Ottomans expelled from Yemen', 'Qasimid State', 'completely expelled the Ottomans', ['yemen', 'ottoman-empire'], k=-1),
        iev('lahej-independence', 'Lahej independent of the Zaydi imams', 'Sultanate of Lahej', 1, ['sultanate-of-lahej', 'yemen']),
        iev('british-take-aden', 'British take Aden', 'Sultanate of Lahej', 2, ['yemen', 'sultanate-of-lahej', 'british-empire'], importance=1,
            descr='The Bombay Presidency captures Aden in January 1839.'),
        fev('ottoman-return-yemen', 'Ottomans return to Yemen', 'Yemen Eyalet', 'seg1.start', ['yemen', 'ottoman-empire']),
        ev('hadhramaut-protection-1888', 'British protection treaties in the Hadhramaut', E("Qu'aiti", 1)[0], ['quaiti', 'kathiri', 'british-empire'],
           [E("Qu'aiti", 1)[1], G.ref('Kathiri', 'infobox established_event6: Informal protection treaty with the British signed, 1888')],
           descr="The Qu'aiti and Kathiri sultanates sign protection treaties with Britain."),
        fev('kingdom-of-yemen', 'Imam Yahya founds the Kingdom of Yemen', 'Kingdom of Yemen', 'year_start', ['yemen'], importance=1,
            descr='The Ottomans withdraw after the Armistice of Mudros; Imam Yahya enters Sanaa.'),
        wev('north-yemen-civil-war', 'North Yemen Civil War', 'North Yemen Civil War', ['yemen', 'saudi-arabia', 'egypt', 'united-arab-republic'], importance=1,
            descr='Republicans backed by Egypt fight royalists backed by Saudi Arabia; the kingdom is dissolved in 1970.'),
        wev('aden-emergency', 'Aden Emergency', 'Aden Emergency', ['yemen', 'british-empire']),
        fev('south-yemen-independence', 'South Yemen independent', 'South Yemen', 'year_start', ['yemen', 'british-empire', 'kathiri', 'quaiti', 'sultanate-of-lahej'],
            importance=1, descr='The British leave Aden on 30 November 1967; the NLF abolishes the sultanates.'),
        fev('yemeni-unification', 'Yemeni unification', 'Yemen', 'established_date1', ['yemen'], importance=1,
            descr='North and South Yemen unite as the Republic of Yemen on 22 May 1990.'),
        wev('yemeni-civil-war-1994', '1994 Yemeni civil war', '1994 Yemeni civil war', ['yemen']),
        wev('yemeni-revolution', 'Yemeni revolution', 'Yemeni revolution', ['yemen']),
        ongoing(lev('yemeni-civil-war', 'Yemeni civil war', 'Yemen', 'By 2015, the country became engulfed', ['yemen', 'saudi-arabia'], k=0, importance=1,
                    descr='The Houthi movement and the internationally recognised government fight for the country; Saudi Arabia leads an intervention.')),

        # ================= Oman and the Gulf =================
        wev('capture-of-muscat-1650', 'Omanis take Muscat from the Portuguese', 'Capture of Muscat (1650)', ['oman', 'portuguese-empire'], importance=1),
        fev('al-bu-said', 'Al Bu Said dynasty', 'Oman', 'established_date8', ['oman'], descr='The dynasty that still rules Oman.'),
        fev('zanzibar-partition', 'Omani Empire divided', 'Muscat and Oman', 'year_start', ['oman'],
            descr='Said bin Sultan\'s death splits his realm into Muscat and Oman and the Sultanate of Zanzibar.'),
        iev('treaty-of-seeb', 'Treaty of Seeb', 'Muscat and Oman', 2, ['oman'], descr='The sultan recognises the interior imamate\'s autonomy.'),
        wev('jebel-akhdar-war', 'Jebel Akhdar War', 'Jebel Akhdar War', ['oman', 'united-kingdom'], descr='The sultan, with British help, ends the Imamate of Oman.'),
        wev('dhofar-rebellion', 'Dhofar Rebellion', 'Dhofar Rebellion', ['oman', 'yemen', 'united-kingdom']),
        wev('omani-coup-1970', 'Qaboos takes power', "1970 Omani coup d'état", ['oman'], importance=1,
            descr='Said bin Taimur is deposed; his son Qaboos founds the modern Sultanate of Oman.'),
        fev('general-maritime-treaty', 'General Maritime Treaty', 'Trucial States', 'year_start', ['united-arab-emirates', 'british-empire', 'bahrain'],
            descr='The Gulf sheikhdoms sign treaties with Britain that make them its protected states.'),
        iev('exclusive-agreement', 'Exclusive Agreement', 'Trucial States', 2, ['united-arab-emirates', 'british-empire']),
        fev('uae-formed', 'United Arab Emirates formed', 'United Arab Emirates', 'established_date2', ['united-arab-emirates', 'british-empire'], importance=1,
            descr='Six emirates unite on 2 December 1971, the day after the British treaties end; Ras Al Khaimah joins in February 1972.'),
        fev('ras-al-khaimah-joins', 'Ras Al Khaimah joins the UAE', 'United Arab Emirates', 'established_date3', ['united-arab-emirates']),
        iev('qatari-bahraini-war', 'Qatari–Bahraini War', 'Bahrain and its Dependencies', 2, ['bahrain', 'qatar'],
            descr='British intervention ends the war and separates Qatar from Bahrain.'),
        lev('qatar-agreement-1868', 'Al Thani agreement with Britain', 'Qatar', 'signed an agreement with Britain in 1868', ['qatar']),
        wev('battle-of-al-wajbah', 'Battle of Al Wajbah', 'Battle of Al Wajbah', ['qatar', 'ottoman-empire'], descr='Qatari forces defeat the Ottomans.'),
        lev('qatar-protectorate', 'Qatar becomes a British protectorate', 'Qatar', 'became a British protectorate in 1916', ['qatar', 'british-empire'], k=0),
        fev('qatar-independence', 'Qatar independent', 'Qatar', 'established_date3', ['qatar', 'british-empire'], importance=1),
        wev('qatar-diplomatic-crisis', 'Qatar diplomatic crisis', 'Qatar diplomatic crisis', ['qatar', 'saudi-arabia', 'bahrain', 'united-arab-emirates', 'egypt']),
        fev('bahrain-al-khalifa', 'Al Khalifa take Bahrain', 'Bahrain', 'established_date1', ['bahrain']),
        iev('bahrain-protected', 'Bahrain a British protected state', 'Bahrain and its Dependencies', 1, ['bahrain', 'british-empire']),
        fev('bahrain-independence', 'Bahrain independent', 'Bahrain', 'established_date2', ['bahrain', 'british-empire'], importance=1),
        fev('kingdom-of-bahrain', 'Kingdom of Bahrain proclaimed', 'Bahrain', 'established_date4', ['bahrain']),
        wev('bahraini-uprising-2011', 'Bahraini uprising', 'Bahraini uprising of 2011', ['bahrain', 'saudi-arabia']),
        fev('kuwait-sheikhdom', 'Sheikhdom of Kuwait', 'Emirate of Kuwait', 'year_start', ['kuwait'], descr='Kuwait becomes independent of the Bani Khalid.'),
        iev('anglo-kuwaiti-agreement', 'Anglo-Kuwaiti Agreement', 'Emirate of Kuwait', 3, ['kuwait', 'british-empire'], importance=1),
        iev('battle-of-jahra', 'Battle of Jahra', 'Emirate of Kuwait', 7, ['kuwait']),
        fev('kuwaiti-independence', 'Kuwait independent', 'Kuwait', 'established_date3', ['kuwait', 'british-empire'], importance=1),
        fev('kuwait-constitution', 'Constitution of Kuwait', 'Kuwait', 'established_date4', ['kuwait']),
        fev('liberation-of-kuwait', 'Liberation of Kuwait', 'Kuwait', 'established_date6', ['kuwait']),

        # ================= Egypt =================
        iev('muhammad-ali-rise', 'Muhammad Ali takes power in Egypt', 'Ottoman Egypt', 2, ['egypt'], importance=1),
        iev('khedivate-recognised', 'Khedivate of Egypt recognised', 'Ottoman Egypt', 5, ['egypt', 'ottoman-empire'],
            descr='The Sultan grants Isma\'il Pasha the title of Khedive and near-total autonomy.'),
        iev('suez-canal-opened', 'Suez Canal opens', 'Khedivate of Egypt', 1, ['egypt'], importance=1),
        iev('urabi-revolt', 'Urabi revolt', 'Khedivate of Egypt', 2, ['egypt']),
        wev('anglo-egyptian-war', 'Anglo-Egyptian War', 'Anglo-Egyptian War', ['egypt', 'british-empire'], importance=1,
            descr='Britain occupies Egypt; Ottoman sovereignty is nominal from now on.'),
        fev('british-protectorate-egypt', 'British protectorate over Egypt', 'Sultanate of Egypt', 'year_start', ['egypt', 'british-empire', 'ottoman-empire'],
            descr='Britain ends Ottoman sovereignty and proclaims the Sultanate of Egypt on 5 November 1914.'),
        wev('egyptian-revolution-1919', 'Egyptian revolution of 1919', 'Egyptian revolution of 1919', ['egypt', 'british-empire']),
        fev('egyptian-independence', 'Egypt independent', 'Egypt', 'established_date1', ['egypt', 'british-empire'], importance=1,
            descr='Britain\'s unilateral declaration of 28 February 1922; Sultan Fuad becomes King.'),
        wev('anglo-egyptian-treaty-1936', 'Anglo-Egyptian treaty', 'Anglo-Egyptian treaty of 1936', ['egypt', 'united-kingdom']),
        wev('egyptian-revolution-1952', 'Egyptian revolution of 1952', '1952 Egyptian revolution', ['egypt'], importance=1,
            descr='The Free Officers overthrow King Farouk.'),
        fev('egypt-republic-declared', 'Egypt declared a republic', 'Egypt', 'established_date3', ['egypt']),
        fev('uar-formed', 'United Arab Republic formed', 'United Arab Republic', 'year_start', ['united-arab-republic', 'egypt', 'syria'], importance=1,
            descr='Egypt and Syria unite under Nasser on 22 February 1958.'),
        fev('uar-renamed', 'Egypt drops the name United Arab Republic', 'United Arab Republic', 'year_end', ['united-arab-republic', 'egypt'],
            descr='Sadat renames the country the Arab Republic of Egypt in September 1971.'),
        wev('egyptian-revolution-2011', 'Egyptian revolution of 2011', 'Egyptian revolution of 2011', ['egypt'], importance=1, descr='Mubarak resigns.'),
        wev('egyptian-coup-2013', '2013 Egyptian coup', "2013 Egyptian coup d'état", ['egypt'], descr='The army removes President Morsi.'),
        fev('egyptian-constitution-2014', 'Constitution of 2014', 'Egypt', 'established_date4', ['egypt']),

        # ================= Sudan =================
        fev('funj-founded', 'Funj Sultanate founded', 'Funj Sultanate', 'year_start', ['funj-sultanate'],
            descr='Amara Dunqas founds the sultanate at Sennar on the Blue Nile, after the Nubian kingdoms.'),
        lev('hamaj-coup', 'Hamaj take power in Sennar', 'Funj Sultanate', 'the Hamaj seized power', ['funj-sultanate'], k=-1),
        iev('conquest-of-sudan', 'Egyptian conquest of Sudan', 'Ottoman Egypt', 3, ['sudan', 'funj-sultanate', 'egypt'], importance=1,
            descr='Muhammad Ali\'s army conquers the Funj Sultanate.'),
        iev('conquest-of-kordofan', 'Darfur conquers Kordofan', 'Sultanate of Darfur', 2, ['sultanate-of-darfur']),
        iev('darfur-conquered-1874', 'Al-Zubayr conquers Darfur', 'Sultanate of Darfur', 3, ['sultanate-of-darfur']),
        iev('darfur-independence-1898', 'Darfur restored', 'Sultanate of Darfur', 4, ['sultanate-of-darfur', 'mahdist-state']),
        fev('darfur-invaded-1916', 'British invasion of Darfur', 'Sultanate of Darfur', 'year_end', ['sultanate-of-darfur', 'british-empire', 'sudan']),
        iev('taqali-mahdists', 'Mahdists conquer Taqali', 'Taqali', 1, ['taqali', 'mahdist-state']),
        iev('taqali-restored', 'Taqali a British client state', 'Taqali', 2, ['taqali', 'british-empire']),
        wev('mahdist-war', 'Mahdist War', 'Mahdist War', ['mahdist-state', 'sudan', 'egypt', 'british-empire'], importance=1,
            descr='The Mahdi\'s rising against Egyptian rule, then the Anglo-Egyptian reconquest.'),
        wev('siege-of-khartoum', 'Siege of Khartoum', 'Siege of Khartoum', ['mahdist-state', 'sudan', 'egypt', 'british-empire'], importance=1,
            descr='The Mahdists take Khartoum on 26 January 1885; Gordon is killed.'),
        wev('battle-of-omdurman', 'Battle of Omdurman', 'Battle of Omdurman', ['mahdist-state', 'british-empire', 'egypt']),
        iev('anglo-egyptian-condominium', 'Anglo-Egyptian condominium', 'Mahdist State', 1, ['sudan', 'egypt', 'british-empire'],
            descr='The Sudan Convention of 18 January 1899 sets up joint British and Egyptian rule.'),
        wev('first-sudanese-civil-war', 'First Sudanese Civil War', 'First Sudanese Civil War', ['sudan']),
        fev('sudanese-independence', 'Sudan independent', 'Sudan', 'established_date6', ['sudan', 'egypt', 'british-empire'], importance=1),
        fev('sudanese-coup-1969', "Nimeiry's coup", 'Democratic Republic of the Sudan', 'year_start', ['sudan']),
        wev('second-sudanese-civil-war', 'Second Sudanese Civil War', 'Second Sudanese Civil War', ['sudan'], importance=1),
        wev('sudanese-coup-1985', '1985 Sudanese coup', "1985 Sudanese coup d'état", ['sudan']),
        wev('sudanese-coup-1989', "Bashir's coup", "1989 Sudanese coup d'état", ['sudan']),
        fev('south-sudan-secession', 'South Sudan secedes', 'Sudan', 'established_date9', ['sudan'], importance=1),
        wev('sudanese-revolution', 'Sudanese revolution', 'Sudanese revolution', ['sudan'], importance=1, descr='Protests bring down Omar al-Bashir in April 2019.'),
        ongoing(wev('sudanese-civil-war-2023', 'Sudanese civil war', 'Sudanese civil war (2023–present)', ['sudan'], importance=1,
                    descr='The army and the Rapid Support Forces fight for control of the country.')),

        # ================= Libya =================
        fev('spanish-conquest-of-tripoli', 'Spain takes Tripoli', 'Spanish Tripoli', 'year_start', ['libya', 'spanish-empire']),
        fev('hospitaller-tripoli', 'Tripoli given to the Knights Hospitaller', 'Hospitaller Tripoli', 'year_start', ['libya', 'knights-hospitaller', 'spanish-empire']),
        wev('siege-of-tripoli-1551', 'Ottoman siege of Tripoli', 'Siege of Tripoli (1551)', ['libya', 'ottoman-empire', 'knights-hospitaller'], importance=1),
        iev('karamanli-dynasty', 'Karamanli dynasty takes power', 'Ottoman Tripolitania', 1, ['libya'],
            descr='The Karamanlis rule Tripoli as a hereditary monarchy under nominal Ottoman suzerainty.'),
        wev('first-barbary-war', 'First Barbary War', 'First Barbary War', ['libya']),
        iev('ottoman-direct-rule-tripoli', 'Ottomans restore direct rule in Tripoli', 'Ottoman Tripolitania', 3, ['libya', 'ottoman-empire']),
        wev('italo-turkish-war', 'Italo-Turkish War', 'Italo-Turkish War', ['libya', 'italy', 'ottoman-empire'], importance=1,
            descr='Italy takes Tripolitania and Cyrenaica from the Ottomans.'),
        fev('tripolitanian-republic', 'Tripolitanian Republic proclaimed', 'Libya', 'established_date4', ['libya']),
        fev('italian-libya-unified', 'Italian Libya unified', 'Italian Libya', 'year_start', ['libya', 'italy']),
        wev('western-desert-campaign', 'Western Desert campaign', 'Western Desert campaign', ['libya', 'egypt', 'italy', 'united-kingdom'], importance=1,
            descr='The Second World War in Libya and Egypt; the Allies take Tripoli in January 1943.'),
        fev('libyan-independence', 'Libya independent', 'Kingdom of Libya', 'year_start', ['libya', 'british-empire'], importance=1,
            descr='The United Kingdom of Libya becomes independent on 24 December 1951.'),
        wev('libyan-coup-1969', "Gaddafi's coup", "1969 Libyan coup d'état", ['libya'], importance=1),
        fev('jamahiriya-proclaimed', 'Jamahiriya proclaimed', 'Libya', 'established_date7', ['libya']),
        wev('libyan-civil-war-2011', 'Libyan civil war', 'Libyan civil war (2011)', ['libya'], importance=1, descr='Gaddafi is overthrown and killed.'),
        wev('second-libyan-civil-war', 'Second Libyan Civil War', 'Second Libyan Civil War', ['libya'], descr='Rival governments in Tripoli and the east.'),

        # ================= Tunisia =================
        iev('conquest-of-tunis-1535', 'Charles V takes Tunis', 'Hafsid dynasty', 1, ['hafsid-tunisia', 'spanish-empire', 'ottoman-empire'],
            descr='The emperor expels Barbarossa and restores the Hafsids as Spanish vassals.'),
        wev('conquest-of-tunis-1574', 'Ottoman conquest of Tunis', 'Conquest of Tunis (1574)', ['hafsid-tunisia', 'tunisia', 'ottoman-empire', 'spanish-empire'],
            importance=1, descr='The Ottomans take Tunis from Spain; the Hafsid dynasty ends.'),
        iev('muradid-dynasty', 'Muradid beys rise', 'Ottoman Tunisia', 2, ['tunisia']),
        iev('husainid-dynasty', 'Husainid dynasty founded', 'Ottoman Tunisia', 3, ['tunisia'],
            descr='Hussein I founds the beylical dynasty that rules until 1957.'),
        wev('treaty-of-bardo', 'Treaty of Bardo', 'Treaty of Bardo', ['tunisia', 'french-colonial-empire', 'france'], importance=1,
            descr='France makes Tunisia a protectorate.'),
        fev('tunisian-independence', 'Tunisia independent', 'French protectorate of Tunisia', 'year_end', ['tunisia', 'french-colonial-empire'], importance=1),
        fev('tunisian-republic', 'Tunisian Republic declared', 'Tunisia', 'established_date12', ['tunisia'], descr='The monarchy is abolished; Bourguiba becomes president.'),
        wev('tunisian-coup-1987', 'Ben Ali replaces Bourguiba', "1987 Tunisian coup d'état", ['tunisia']),
        wev('tunisian-revolution', 'Tunisian revolution', 'Tunisian revolution', ['tunisia'], importance=1,
            descr='Ben Ali falls; the Arab Spring begins.'),
        wev('tunisian-self-coup-2021', 'President Saied seizes power', '2021 Tunisian self-coup', ['tunisia']),

        # ================= Algeria =================
        iev('tlemcen-spaniards', 'Tlemcen fights the Spaniards', 'Kingdom of Tlemcen', 8, ['zayyanid-tlemcen', 'spanish-empire']),
        fev('tlemcen-annexed', 'Ottomans annex Tlemcen', 'Kingdom of Tlemcen', 'year_end', ['zayyanid-tlemcen', 'ottoman-empire']),
        wev('capture-of-algiers-1516', 'Barbarossa takes Algiers', 'Capture of Algiers (1516)', ['algeria', 'ottoman-empire'], importance=1,
            descr='Aruj Barbarossa takes Algiers; the Regency becomes an Ottoman province.'),
        lev('kuku-holds-algiers', 'Kuku controls Algiers', 'Kingdom of Kuku', 'From 1520 to 1527', ['kingdom-of-kuku', 'algeria'], k=0, end_k=1),
        ev('algiers-expedition-1541', 'Charles V\'s Algiers expedition', E('Regency of Algiers', 2)[0], ['algeria', 'spanish-empire', 'kingdom-of-kuku'],
           [E('Regency of Algiers', 2)[1], lead('Kingdom of Kuku', 'failed expedition of Charles V against Algiers in 1541')],
           descr='A Spanish attack on Algiers fails; the Kingdom of Kuku takes part.'),
        iev('tuggurt-expedition', 'Tuggurt Expedition', 'Sultanate of Tuggurt', 1, ['sultanate-of-tuggurt', 'algeria']),
        iev('janissary-revolution-1659', 'Janissary revolution in Algiers', 'Regency of Algiers', 6, ['algeria'],
            descr='Algiers becomes a military republic whose rulers are elected rather than appointed from Constantinople.'),
        wev('bombardment-of-algiers', 'Bombardment of Algiers', 'Bombardment of Algiers (1816)', ['algeria', 'united-kingdom', 'netherlands']),
        wev('invasion-of-algiers-1830', 'French invasion of Algiers', 'Invasion of Algiers in 1830', ['algeria', 'france', 'french-colonial-empire'], importance=1,
            descr='France overthrows the Regency of Algiers.'),
        wev('french-conquest-of-algeria', 'French conquest of Algeria', 'French conquest of Algeria', ['algeria', 'french-colonial-empire']),
        iev('treaty-of-tafna', 'Treaty of Tafna', 'Emirate of Abdelkader', 2, ['algeria', 'france']),
        fev('abdelkader-surrenders', 'Abdelkader surrenders', 'Emirate of Abdelkader', 'year_end', ['algeria', 'french-colonial-empire']),
        fev('beni-abbas-end', 'End of the Kingdom of Beni Abbas', 'Kingdom of Beni Abbas', 'year_end', ['kingdom-of-beni-abbas', 'french-colonial-empire'],
            descr='The Mokrani revolt of 1871 is defeated and the French take the Kalâa.'),
        fev('tuggurt-conquered', 'France conquers Tuggurt', 'Sultanate of Tuggurt', 'year_end', ['sultanate-of-tuggurt', 'french-colonial-empire']),
        fev('gpra-proclaimed', 'Provisional Government of the Algerian Republic', 'Provisional Government of the Algerian Republic', 'year_start', ['algeria']),
        fev('algerian-independence', 'Algeria independent', 'Algeria', 'established_date14', ['algeria', 'french-colonial-empire', 'france'], importance=1,
            descr='Independence on 5 July 1962, after the Évian Accords and a referendum.'),
        wev('algerian-civil-war', 'Algerian Civil War', 'Algerian Civil War', ['algeria'], importance=1),
        wev('algerian-protests-2019', 'Hirak protests', '2019–2020 Algerian protests', ['algeria'], descr='Bouteflika resigns.'),

        # ================= Morocco and Western Sahara =================
        wev('battle-of-tadla', 'Battle of Tadla', 'Battle of Tadla', ['morocco'], descr='The Saadis defeat the last Wattasid sultan.'),
        wev('battle-of-alcacer-quibir', 'Battle of Alcácer Quibir', 'Battle of Alcácer Quibir', ['morocco', 'portugal', 'portuguese-empire'], importance=1,
            descr='The Battle of the Three Kings: Sebastian of Portugal is killed; Ahmad al-Mansur becomes sultan.'),
        wev('battle-of-tondibi', 'Battle of Tondibi', 'Battle of Tondibi', ['morocco'], descr='A Saadi army destroys the Songhai Empire.'),
        fev('republic-of-sale-founded', 'Republic of Salé founded', 'Republic of Salé', 'year_start', ['republic-of-sale']),
        fev('republic-of-sale-end', 'Alawis take Salé', 'Republic of Salé', 'year_end', ['republic-of-sale', 'morocco']),
        fev('alawi-dynasty', 'Alawi dynasty takes power', 'Morocco', 'established_date8', ['morocco'], importance=1, descr='The dynasty that still rules Morocco.'),
        fev('treaty-of-fez', 'Treaty of Fez', 'Morocco', 'established_date9', ['morocco', 'french-colonial-empire', 'france'], importance=1,
            descr='Sultan Abd al-Hafid accepts a French protectorate on 30 March 1912.'),
        fev('treaty-of-madrid-1912', 'Spanish protectorate in Morocco', 'Spanish protectorate in Morocco', 'year_start', ['morocco', 'spanish-empire'],
            descr='A Franco-Spanish treaty of 27 November 1912 makes the north a Spanish protectorate.'),
        wev('rif-war', 'Rif War', 'Rif War', ['morocco', 'republic-of-the-rif', 'spanish-empire', 'french-colonial-empire'], importance=1,
            descr='Abd el-Krim\'s Rif Republic fights Spain and then France.'),
        wev('battle-of-annual', 'Battle of Annual', 'Battle of Annual', ['republic-of-the-rif', 'spanish-empire']),
        fev('moroccan-independence', 'Morocco independent', 'Morocco', 'established_date10', ['morocco', 'french-colonial-empire', 'spanish-empire'], importance=1),
        fev('ifni-retroceded', 'Spain returns Ifni', 'Ifni', 'year_end', ['morocco', 'spanish-empire']),
        wev('green-march', 'Green March', 'Green March', ['morocco', 'western-sahara', 'spanish-empire'], importance=1),
        wev('madrid-accords', 'Madrid Accords', 'Madrid Accords', ['western-sahara', 'spanish-empire', 'morocco'],
            descr='Spain hands the administration of Spanish Sahara to Morocco and Mauritania.'),
        fev('sadr-proclaimed', 'Sahrawi Arab Democratic Republic proclaimed', 'Sahrawi Arab Democratic Republic', 'established_date2', ['western-sahara'], importance=1,
            descr='The Polisario Front proclaims the SADR on 27 February 1976.'),
        wev('western-sahara-war', 'Western Sahara War', 'Western Sahara War', ['western-sahara', 'morocco'], importance=1,
            descr='Polisario fights Morocco and Mauritania; a UN ceasefire in 1991 leaves sovereignty unresolved.'),
        fev('moroccan-constitution-2011', 'Constitution of 2011', 'Morocco', 'established_date11', ['morocco']),
    ]
