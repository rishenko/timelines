"""
Modern States wave 8: Oceania (2026-11-21). The 14 UN members in Oceania, the historical states with a former-country
infobox that lived after 1500 (the Hawaiian Kingdom, the Kingdom of Tahiti, Rarotonga and the Cook Islands Federation,
the Kingdom of Easter Island, the Saudeleur dynasty of Pohnpei, the Republic of the North Solomons), the Gilbert and
Ellice Islands (a colony that split into Kiribati and Tuvalu), and Oceania's group rows.

Rules applied (data-format.md and Kevin's decisions, 2026-11-21):
- A row that carries on into a state that exists today takes that state's id; older governments are phases. The
  Kingdom of Fiji, the Kingdom of Samoa, the United Tribes of New Zealand and the Tuʻi Tonga Empire are earlier phases
  of fiji, samoa, new-zealand and tonga.
- Australia (call recorded in the report): the six colonies are parallel phases of `australia` (Colony of New South
  Wales first), as Upper and Lower Canada are on `canada` in americas.py. Each maps onto part of one state and they
  federated into it; none split into several states, so none is its own row. The states of Australia are not rows,
  as Canada's provinces are not.
- Colonial rule is a phase plus a dated membership in the empire: British, French and Spanish rule in british-empire,
  french-colonial-empire and spanish-empire; German rule (German New Guinea, German Samoa, the Marshall Islands
  protectorate, Nauru) in `germany`; the Australian and New Zealand mandates and trust territories in `australia` and
  `new-zealand`; the US Trust Territory of the Pacific Islands and the South Seas Mandate in their own rows (below);
  Japan's 1914–19 occupation of Micronesia and the wartime occupations (Nauru, the Gilbert Islands) in `japan`. The New Hebrides Condominium is a phase of vanuatu
  with memberships in both british-empire and french-colonial-empire.
- The Gilbert and Ellice Islands split into two states: its own row, joined to kiribati and tuvalu by the separation
  event. The US Trust Territory and the South Seas Mandate also covered several of today's states: they were first
  phases plus memberships of united-states and japan (the lead's brief, 2026-11-21); since 2026-11-22 (Kevin) each is
  its own row, a member of united-states or japan, and the states are its members, as with Italian East Africa.
- The Federated States of Micronesia take the id federated-states-of-micronesia: `micronesia` is the subregion group
  the lead asked for (2026-11-21), and ids are unique.
- Rows crossing 1500 match the Medieval World timeline: `tonga` (its first phase is the Tuʻi Tonga Empire, 950–1865,
  with Medieval's claims) and `pohnpei` (1–1628, typed). New crossing id: kingdom-of-easter-island (reported).
- Union events: an event goes on a member's row only if it starts or ends that membership or phase, or the member
  acted as itself.

Hand calls (Kevin, 2026-11-21: every hand call is data here, with a comment) are marked "HAND:" below.

Called from gen_modern.py with its module (M).
"""

GROUPS = [
    {'id': 'oceania', 'name': 'Oceania', 'color': '#2a7a9a'},
    {'id': 'australia-and-new-zealand', 'name': 'Australia and New Zealand', 'color': '#3a6a9a', 'parent': 'oceania'},
    {'id': 'melanesia', 'name': 'Melanesia', 'color': '#3a8a6a', 'parent': 'oceania'},
    {'id': 'micronesia', 'name': 'Micronesia', 'color': '#2a8a9a', 'parent': 'oceania'},
    {'id': 'polynesia', 'name': 'Polynesia', 'color': '#4a7aaa', 'parent': 'oceania'},
]

ANZ, MEL, MIC, POL = 'australia-and-new-zealand', 'melanesia', 'micronesia', 'polynesia'

# rows added to events that other modules define
SHARED = {
    # Australia and New Zealand fought both world wars as dominions; Tonga declared war in 1939 (History of Tonga,
    # section "World War II": "formally declared war"); the Pacific War also began and ended Nauru's Japanese occupation
    # and the Japanese occupation of the Gilbert Islands
    'ww1': ['australia', 'new-zealand', 'nauru'],
    'ww2': ['australia', 'new-zealand', 'tonga'],
    'pacific-war': ['australia', 'new-zealand', 'nauru', 'gilbert-and-ellice-islands'],
}


def tracks(M):
    G, F, C, E, lead, phase, stretch, span, member, row = (
        M.G, M.F, M.C, M.E, M.lead, M.phase, M.stretch, M.span, M.member, M.row)

    def S1(t, spec='year_start'):
        """The first start claim of an article: for citing where the next phase begins."""
        return F(t, spec, 'start')[:1]

    def E1(t, spec='year_end'):
        """The first end claim of an article."""
        return F(t, spec, 'end')[:1]

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
        """A claim from a lead sentence (HAND: the year is read from that sentence)."""
        c = {'year': year, 'source': lead(t, needle)}
        if note:
            c['note'] = note
        return [c]

    def sec(t, section, needle):
        """Source ref for a section's first dated sentence (wp_states' section openers) that contains `needle`."""
        for s_ in G.art(t)['body']['section_openers']:
            if s_['section'] == section and needle in s_['text']:
                return G.ref(t, f'section "{section}": "{s_["text"][:160]}"')
        raise SystemExit(f'{t}: no opener in {section!r} with {needle!r}')

    def SC(t, section, needle, year, note=None):
        """A claim from a section's first dated sentence (HAND: the year is read from that sentence)."""
        c = {'year': year, 'source': sec(t, section, needle)}
        if note:
            c['note'] = note
        return [c]

    def noted(cs, note):
        return [dict(c, note=note) for c in cs]

    def ph(name, t, s='year_start', e='year_end', **kw):
        return phase(name, F(t, s, 'start'), F(t, e, 'end'), **kw)

    def ph1(name, t, **kw):
        return phase(name, S1(t), E1(t), **kw)

    def seg(name, t, **kw):
        return phase(name, F(t, 'seg0.start', 'start'), F(t, 'seg0.end', 'end'), **kw)

    T = []

    # ================= Australia and New Zealand =================
    nsw, vdl, tas, wa, sa, vic, qld, au = (
        'Colony of New South Wales', "Van Diemen's Land", 'Colony of Tasmania', 'History of Western Australia',
        'British colonisation of South Australia', 'Colony of Victoria', 'Colony of Queensland', 'Australia')
    fed = 'federation-of-australia'
    T.append(row('australia', 'Australia', '#2a5a9a', ANZ, au, phases=[
        # the colonies ran side by side until they federated: parallel phases
        ph('Colony of New South Wales', nsw, startEvent='first-fleet', endEvent=fed),
        ph("Van Diemen's Land", vdl, endEvent='tasmania-self-government'),
        ph('Colony of Tasmania', tas, startEvent='tasmania-self-government', endEvent=fed),
        ph('Colony of Western Australia', wa, startEvent='swan-river-colony-founded', endEvent=fed),
        ph('Colony of South Australia', sa, endEvent=fed),
        ph('Colony of Victoria', vic, endEvent=fed),
        ph('Colony of Queensland', qld, endEvent=fed),
        phase('Commonwealth of Australia', est(au, 1), ongoing=cur(au, 4), startEvent=fed),
    ], memberOf=[
        # HAND: the membership ends with the Statute of Westminster Adoption Act (legislative independence), as the
        # Australia infobox lists it; canada's ends with the Statute itself in americas.py
        member('british-empire', S1(nsw), est(au, 3),
               sources=[lead(nsw, 'self-governing Crown colony within the British Empire'),
                        lead(au, 'Statute of Westminster Adoption Act 1942')],
               startEvent='first-fleet', endEvent='statute-of-westminster-adoption-australia'),
    ]))

    ut, cnz, dnz, nz = 'United Tribes of New Zealand', 'Colony of New Zealand', 'Dominion of New Zealand', 'New Zealand'
    T.append(row('new-zealand', 'New Zealand', '#1a3a6a', ANZ, nz, phases=[
        ph1('United Tribes of New Zealand', ut, startEvent='nz-declaration-of-independence', endEvent='treaty-of-waitangi'),
        ph1('Colony of New Zealand', cnz, startEvent='colony-of-new-zealand-separated', endEvent='dominion-of-new-zealand'),
        phase('Dominion of New Zealand', F(dnz, 'seg0.start', 'start'), F(dnz, 'seg0.end', 'end'),
              startEvent='dominion-of-new-zealand', endEvent='statute-of-westminster-adoption-nz'),
        phase('New Zealand', est(nz, 5), ongoing=cur(nz, 6), startEvent='statute-of-westminster-adoption-nz'),
    ], memberOf=[
        # HAND: as Australia's, the membership ends with the Statute of Westminster Adoption Act (1947)
        member('british-empire', est(nz, 1), est(nz, 5), sources=[lead(cnz, 'colony of the United Kingdom from 1841 to 1907')],
               startEvent='treaty-of-waitangi', endEvent='statute-of-westminster-adoption-nz'),
    ]))

    # ================= Melanesia =================
    kf, cf, df, fj = 'Kingdom of Fiji', 'Colony of Fiji', 'Dominion of Fiji', 'Fiji'
    T.append(row('fiji', 'Fiji', '#3a8ac0', MEL, fj, phases=[
        ph1('Kingdom of Fiji', kf, startEvent='kingdom-of-fiji-established', endEvent='fiji-ceded-to-britain'),
        ph1('Colony of Fiji', cf, startEvent='fiji-ceded-to-britain', endEvent='fiji-independence'),
        ph1('Dominion of Fiji', df, startEvent='fiji-independence', endEvent='fijian-coups-1987'),
        phase('Republic of Fiji', est(fj, 2), ongoing=cur(fj, 3), startEvent='fijian-coups-1987'),
    ], memberOf=[
        member('british-empire', S1(cf), E1(cf), sources=[lead(cf, 'Crown colony that existed from 1874 to 1970')],
               startEvent='fiji-ceded-to-britain', endEvent='fiji-independence'),
    ]))

    bng, tp, gng, tng, tpng, png = ('British New Guinea', 'Territory of Papua', 'German New Guinea', 'Territory of New Guinea',
                                    'Territory of Papua and New Guinea', 'Papua New Guinea')
    union49 = S1(tpng)
    T.append(row('papua-new-guinea', 'Papua New Guinea', '#c03a2a', MEL, png, phases=[
        # the south (British, then Australian Papua) and the north (German, then Australian New Guinea) were ruled apart
        # until 1949: parallel phases
        seg('British New Guinea', bng, startEvent='british-new-guinea-protectorate', endEvent='papua-transferred-to-australia'),
        phase('Territory of Papua', F(tp, 'seg0.start', 'start')
              + L(tp, 'formally organised as a separate territory in 1906', 1906, 'The territory was formally organised in 1906.'),
              union49, startEvent='papua-transferred-to-australia', endEvent='papua-new-guinea-administrative-union'),
        seg('German New Guinea', gng, startEvent='german-new-guinea-established', endEvent='australian-occupation-of-german-new-guinea'),
        phase('Territory of New Guinea', S1(tng), union49, startEvent='australian-occupation-of-german-new-guinea',
              endEvent='papua-new-guinea-administrative-union'),
        ph1('Territory of Papua and New Guinea', tpng, startEvent='papua-new-guinea-administrative-union', endEvent='png-independence'),
        phase('Papua New Guinea', est(png, 5), ongoing=cur(png, 5), startEvent='png-independence'),
    ], memberOf=[
        member('british-empire', F(bng, 'seg0.start', 'start'), F(bng, 'seg0.end', 'end'),
               sources=[lead(bng, 'protectorate and later Crown colony within the British Empire')],
               startEvent='british-new-guinea-protectorate', endEvent='papua-transferred-to-australia'),
        member('germany', F(gng, 'seg0.start', 'start'), F(gng, 'seg0.end', 'end'),
               sources=[lead(gng, 'became a German protectorate in 1884')],
               startEvent='german-new-guinea-established', endEvent='australian-occupation-of-german-new-guinea'),
        # Papua from 1902 and New Guinea from 1914 were Australian territories until independence: one membership
        member('australia', F(tp, 'seg0.start', 'start'), est(png, 5),
               sources=[lead(tp, 'ceded to Australia in 1902'), lead(tng, 'Australian-administered territory')],
               startEvent='papua-transferred-to-australia', endEvent='png-independence'),
    ]))

    rns = 'Republic of the North Solomons'
    T.append(row('republic-of-the-north-solomons', 'Republic of the North Solomons', '#8a5a3a', MEL, rns, span_=span(stretch(
        None, S1(rns), E1(rns), startEvent='north-solomons-declared', endEvent='north-solomons-reintegrated'))))

    bsi, si = 'British Solomon Islands', 'Solomon Islands'
    T.append(row('solomon-islands', 'Solomon Islands', '#2a7a5a', MEL, si, phases=[
        ph1('British Solomon Islands Protectorate', bsi, startEvent='british-solomon-islands-protectorate', endEvent='solomon-islands-independence'),
        phase('Solomon Islands', est(si, 1), ongoing=cur(si, 1), startEvent='solomon-islands-independence'),
    ], memberOf=[
        member('british-empire', S1(bsi), E1(bsi), sources=[lead(bsi, 'British protectorate in the South Pacific from 1893 to 1978')],
               startEvent='british-solomon-islands-protectorate', endEvent='solomon-islands-independence'),
    ]))

    nh, vu = 'New Hebrides', 'Vanuatu'
    condo = [lead(nh, 'New Hebrides Condominium')]
    T.append(row('vanuatu', 'Vanuatu', '#c0902a', MEL, vu, phases=[
        ph1('New Hebrides Condominium', nh, startEvent='new-hebrides-condominium', endEvent='vanuatu-independence'),
        phase('Republic of Vanuatu', est(vu, 1), ongoing=cur(vu, 1), startEvent='vanuatu-independence'),
    ], memberOf=[
        member('british-empire', S1(nh), E1(nh), sources=condo, startEvent='new-hebrides-condominium', endEvent='vanuatu-independence'),
        member('french-colonial-empire', S1(nh), E1(nh), sources=condo, startEvent='new-hebrides-condominium', endEvent='vanuatu-independence'),
    ]))

    # ================= Micronesia =================
    # pohnpei: the Medieval World timeline's row (id, lifespan 1–1628 typed, its start claim)
    nm, sd = 'Nan Madol', 'Saudeleur dynasty'
    T.append(row('pohnpei', 'Pohnpei (Saudeleur dynasty)', '#5a7a6a', MIC, sd, span_=span(stretch(
        None,
        # HAND: "probably around AD 1" → AD 1 ± 50, as the Medieval World timeline reads it
        [{'year': 1, 'margin': 50, 'source': G.ref(nm, 'section "Archaeology": "The earliest settlement on Pohnpei was probably around AD 1 '
                                                       'although radiocarbon dating shows human activity starting around AD 80–200."')}],
        L(nm, 'until about 1628', 1628) + E1(sd), circa=True, endEvent='isokelekel-conquers-the-saudeleur'))))

    sei, sp = 'Spanish East Indies', 'Pohnpei'
    jap_mic = 'japan-occupies-german-micronesia'
    ttpi, ssm = 'Trust Territory of the Pacific Islands', 'South Seas Mandate'

    def jap_mandate(start_claims):
        return phase('Japanese rule (South Seas Mandate)', start_claims, E1(ssm), startEvent=jap_mic, endEvent='ttpi-established')

    # The South Seas Mandate and the Trust Territory are rows (follow-up, Kevin 2026-11-22): each covered several of
    # today's states, as Italian East Africa did (africa_east.py). The states keep their phases; their memberships are
    # in the two rows, which are members of japan and united-states. Japan's wartime occupation (1914) until the
    # mandate (1919) stays a membership of japan.
    ssm_src = G.ref(ssm, 'infobox former country: South Seas Mandate, 1919–1947')
    ttpi_src = lead(ttpi, 'administered by the United States from 1947 to 1994')
    T.append(row('south-seas-mandate', 'South Seas Mandate', '#8a5a6a', MIC, ssm,
                 span_=span(stretch(None, S1(ssm), E1(ssm), startEvent='south-seas-mandate', endEvent='ttpi-established')),
                 memberOf=[member('japan', S1(ssm), E1(ssm), sources=[ssm_src], startEvent='south-seas-mandate', endEvent='ttpi-established')]))
    T.append(row('trust-territory-of-the-pacific-islands', 'Trust Territory of the Pacific Islands', '#4a6a9a', MIC, ttpi,
                 span_=span(stretch(None, S1(ttpi), E1(ttpi), startEvent='ttpi-established', endEvent='palau-compact-of-free-association')),
                 memberOf=[member('united-states', S1(ttpi), E1(ttpi), sources=[ttpi_src], startEvent='ttpi-established',
                                  endEvent='palau-compact-of-free-association')]))

    def jap_member(start_claims):
        return [member('japan', start_claims, S1(ssm), sources=[lead('German New Guinea', 'Japan occupied most of the remaining German possessions')],
                       startEvent=jap_mic, endEvent='south-seas-mandate'),
                member('south-seas-mandate', S1(ssm), E1(ssm), sources=[ssm_src], startEvent='south-seas-mandate', endEvent='ttpi-established')]

    def us_member(end_claims, endEvent):
        return member('trust-territory-of-the-pacific-islands', S1(ttpi), end_claims, sources=[ttpi_src],
                      startEvent='ttpi-established', endEvent=endEvent)

    fsm, hfsm, ci = 'Federated States of Micronesia', 'History of the Federated States of Micronesia', 'Caroline Islands'
    fsm_spain = SC(sp, 'History > Spanish rule', 'By 1886 the Spaniards claimed', 1886)
    fsm_sold = SC(hfsm, 'European colonisation', 'Spain sold the islands to Germany in 1899', 1899)
    fsm_japan = SC(ci, 'History > Japanese colony', 'Japan invaded and occupied the islands in 1914', 1914)
    T.append(row('federated-states-of-micronesia', 'Federated States of Micronesia', '#2a6a8a', MIC, fsm, phases=[
        phase('Spanish Carolines', fsm_spain, fsm_sold, endEvent='german-spanish-treaty-1899'),
        phase('German Carolines', fsm_sold, fsm_japan, startEvent='german-spanish-treaty-1899', endEvent=jap_mic),
        jap_mandate(fsm_japan),
        phase('Trust Territory of the Pacific Islands', S1(ttpi), est(fsm, 1), startEvent='ttpi-established', endEvent='fsm-constitution'),
        phase('Federated States of Micronesia', est(fsm, 1), ongoing=cur(fsm, 2), startEvent='fsm-constitution'),
    ], memberOf=[
        member('spanish-empire', fsm_spain, fsm_sold, sources=[sec(sp, 'History > Spanish rule', 'By 1886 the Spaniards claimed')],
               endEvent='german-spanish-treaty-1899'),
        member('germany', fsm_sold, fsm_japan, sources=[lead(gng, 'The Caroline Islands, Palau, and the Mariana Islands')],
               startEvent='german-spanish-treaty-1899', endEvent=jap_mic),
        *jap_member(fsm_japan),
        us_member(est(fsm, 2), 'compact-of-free-association-1986'),
    ]))

    pw, hpw = 'Palau', 'History of Palau'
    pw_spain = L(pw, 'made part of the Spanish East Indies in 1885', 1885)
    pw_sold = L(pw, 'sold to Germany in 1899', 1899)
    pw_japan = SC(hpw, 'Japanese mandate', 'declared war on the German Empire in 1914', 1914)
    T.append(row('palau', 'Palau', '#3a9ab0', MIC, pw, phases=[
        phase('Spanish Palau', pw_spain, pw_sold, endEvent='german-spanish-treaty-1899'),
        phase('German Palau', pw_sold, pw_japan, startEvent='german-spanish-treaty-1899', endEvent=jap_mic),
        jap_mandate(pw_japan),
        phase('Trust Territory of the Pacific Islands', S1(ttpi), est(pw, 2), startEvent='ttpi-established', endEvent='republic-of-palau-established'),
        phase('Republic of Palau', est(pw, 2), ongoing=cur(pw, 3), startEvent='republic-of-palau-established'),
    ], memberOf=[
        member('spanish-empire', pw_spain, pw_sold, sources=[lead(pw, 'made part of the Spanish East Indies in 1885')],
               endEvent='german-spanish-treaty-1899'),
        member('germany', pw_sold, pw_japan, sources=[lead(pw, 'administered as part of German New Guinea')],
               startEvent='german-spanish-treaty-1899', endEvent=jap_mic),
        *jap_member(pw_japan),
        us_member(est(pw, 3) + E1(ttpi), 'palau-compact-of-free-association'),
    ]))

    mh = 'Marshall Islands'
    mh_de = L(mh, 'annexed the Marshalls as a protectorate in 1885', 1885)
    mh_japan = L(mh, 'occupied the islands in the autumn of 1914', 1914)
    T.append(row('marshall-islands', 'Marshall Islands', '#2a5a8a', MIC, mh, phases=[
        phase('German protectorate', mh_de, mh_japan, startEvent='german-protectorate-of-the-marshall-islands', endEvent=jap_mic),
        jap_mandate(mh_japan),
        phase('Trust Territory of the Pacific Islands', S1(ttpi), est(mh, 1), startEvent='ttpi-established', endEvent='marshall-islands-self-government'),
        phase('Republic of the Marshall Islands', est(mh, 1), ongoing=cur(mh, 2), startEvent='marshall-islands-self-government'),
    ], memberOf=[
        member('germany', mh_de, mh_japan, sources=[lead(mh, 'annexed the Marshalls as a protectorate in 1885')],
               startEvent='german-protectorate-of-the-marshall-islands', endEvent=jap_mic),
        *jap_member(mh_japan),
        us_member(est(mh, 2), 'compact-of-free-association-1986'),
    ]))

    nr, hnr, jon = 'Nauru', 'History of Nauru', 'Japanese occupation of Nauru'
    nr_de = (L(hnr, 'annexed the island in 1888', 1888)
             + SC(hnr, 'German protectorate', 'In 1886 Germany was granted the island', 1886,
                  'The Anglo-German Declaration granted the island to Germany in 1886.'))
    nr_au = SC(hnr, 'World War I to World War II', 'captured by Australian troops', 1914)
    T.append(row('nauru', 'Nauru', '#3a5aa0', MIC, nr, phases=[
        phase('German Nauru', nr_de, nr_au, startEvent='german-annexation-of-nauru', endEvent='ww1'),
        # the League mandate (from 1920) and the UN trust territory (from 1947) were both administered by Australia
        phase('Australian administration', nr_au, est(nr, 1), startEvent='ww1', endEvent='nauru-independence'),
        # the Japanese occupation ran alongside the Australian administration it displaced: a rival phase
        seg('Japanese occupation', jon, startEvent='pacific-war', endEvent='pacific-war'),
        phase('Republic of Nauru', est(nr, 1), ongoing=cur(nr, 1), startEvent='nauru-independence'),
    ], memberOf=[
        member('germany', nr_de, nr_au, sources=[lead(hnr, 'annexed the island in 1888')], startEvent='german-annexation-of-nauru', endEvent='ww1'),
        member('australia', nr_au, est(nr, 1), sources=[lead(nr, 'gained its independence from Australia in 1968'),
                                                       sec(hnr, 'World War I to World War II', 'captured by Australian troops')],
               startEvent='ww1', endEvent='nauru-independence'),
        member('japan', F(jon, 'seg0.start', 'start'), F(jon, 'seg0.end', 'end'), sources=[lead(jon, 'occupied by the Japanese military')],
               startEvent='pacific-war', endEvent='pacific-war'),
    ]))

    geic, jog = 'Gilbert and Ellice Islands', 'Japanese occupation of the Gilbert Islands'
    T.append(row('gilbert-and-ellice-islands', 'Gilbert and Ellice Islands', '#5a8a9a', MIC, geic,
                 span_=span(stretch(None, S1(geic), E1(geic), startEvent='gilbert-and-ellice-protectorate', endEvent='gilbert-and-ellice-separation')),
                 phases=[
        # the Japanese occupation of the Gilberts ran alongside the British administration on Ocean Island: a rival phase
        seg('Japanese occupation of the Gilbert Islands', jog, startEvent='pacific-war', endEvent='battle-of-tarawa'),
    ], memberOf=[
        member('british-empire', S1(geic), E1(geic), sources=[lead(geic, 'British territory in the southern Pacific Ocean from 1892 to 1976')],
               startEvent='gilbert-and-ellice-protectorate', endEvent='gilbert-and-ellice-separation'),
        member('japan', F(jog, 'seg0.start', 'start'), F(jog, 'seg0.end', 'end'), sources=[lead(jog, 'From 1941 to 1943')],
               startEvent='pacific-war', endEvent='battle-of-tarawa'),
    ]))

    gi, ki = 'Gilbert Islands', 'Kiribati'
    T.append(row('kiribati', 'Kiribati', '#c04a2a', MIC, ki, phases=[
        ph1('Colony of the Gilbert Islands', gi, startEvent='gilbert-and-ellice-separation', endEvent='kiribati-independence'),
        phase('Republic of Kiribati', est(ki, 1), ongoing=cur(ki, 2), startEvent='kiribati-independence'),
    ], memberOf=[
        member('british-empire', S1(gi), est(ki, 1), sources=[lead(ki, 'gained its independence from the United Kingdom')],
               startEvent='gilbert-and-ellice-separation', endEvent='kiribati-independence'),
    ]))

    # ================= Polynesia =================
    tv = 'Tuvalu'
    tv_col = L(tv, 'two separate British colonies, Kiribati and Tuvalu, were formed', 1976)
    T.append(row('tuvalu', 'Tuvalu', '#3a9aca', POL, tv, phases=[
        phase('Colony of Tuvalu', tv_col, est(tv, 1), startEvent='gilbert-and-ellice-separation', endEvent='tuvalu-independence'),
        phase('Tuvalu', est(tv, 1), ongoing=cur(tv, 1), startEvent='tuvalu-independence'),
    ], memberOf=[
        member('british-empire', tv_col, est(tv, 1), sources=[lead(tv, 'two separate British colonies, Kiribati and Tuvalu, were formed')],
               startEvent='gilbert-and-ellice-separation', endEvent='tuvalu-independence'),
    ]))

    tte, kt19, to = 'Tuʻi Tonga Empire', 'Kingdom of Tonga (1900–1970)', 'Tonga'
    T.append(row('tonga', 'Tonga', '#a8302a', POL, to, phases=[
        # the Medieval World timeline's phase: its name and its claims (the first claim of each infobox field)
        phase('Tuʻi Tonga Empire', S1(tte), E1(tte), endEvent='tui-tonga-title-abolished'),
        # the Tupou kingdom unified Tonga in 1845 while the Tuʻi Tonga title lasted until 1865: overlapping phases
        phase('Kingdom of Tonga (Tupou dynasty)', est(to, 1), S1(kt19), startEvent='tonga-unified', endEvent='tonga-protected-state'),
        ph1('British protected state', kt19, startEvent='tonga-protected-state', endEvent='tonga-protection-ends'),
        phase('Kingdom of Tonga', est(to, 3), ongoing=cur(to, 3), startEvent='tonga-protection-ends'),
    ], memberOf=[
        member('british-empire', S1(kt19), E1(kt19), sources=[lead(kt19, 'protected state of the United Kingdom from 1900 to 1970')],
               startEvent='tonga-protected-state', endEvent='tonga-protection-ends'),
    ]))

    ks, gs, tws, ws = 'Kingdom of Samoa', 'German Samoa', 'Territory of Western Samoa', 'Samoa'
    gs_end = F(gs, 'seg0.end', 'end') + noted(E1(gs), 'The infobox ends German Samoa with the League mandate of 1920.')
    ws_start = (C(1914, tws, 'infobox event_pre: Occupation, 30 August 1914')
                + noted(S1(tws), 'The civil administration (the League mandate) dates from 1920.'))
    T.append(row('samoa', 'Samoa', '#2a4a9a', POL, ws, phases=[
        seg('Kingdom of Samoa', ks, endEvent='tripartite-convention-1899'),
        phase('German Samoa', S1(gs) + L(ws, 'colony of the German Empire in 1899', 1899, 'The Samoa article dates the colony from the 1899 convention.'),
              gs_end, startEvent='tripartite-convention-1899', endEvent='occupation-of-german-samoa'),
        phase('Western Samoa (New Zealand)', ws_start, E1(tws), startEvent='occupation-of-german-samoa', endEvent='samoan-independence'),
        phase('Independent State of Samoa', est(ws, 7), ongoing=cur(ws, 7), startEvent='samoan-independence'),
    ], memberOf=[
        member('germany', S1(gs), F(gs, 'seg0.end', 'end'), sources=[lead(gs, 'German protectorate from 1900 to 1920')],
               startEvent='tripartite-convention-1899', endEvent='occupation-of-german-samoa'),
        member('new-zealand', ws_start, E1(tws), sources=[lead(tws, 'civil administration of Western Samoa by New Zealand')],
               startEvent='occupation-of-german-samoa', endEvent='samoan-independence'),
    ]))

    hk, pgh, rh = 'Hawaiian Kingdom', 'Provisional Government of Hawaii', 'Republic of Hawaii'
    T.append(row('hawaiian-kingdom', 'Hawaiian Kingdom', '#c06a2a', POL, hk, phases=[
        ph1('Hawaiian Kingdom', hk, startEvent='battle-of-nuuanu', endEvent='overthrow-of-the-hawaiian-kingdom'),
        ph1('Provisional Government', pgh, startEvent='overthrow-of-the-hawaiian-kingdom', endEvent='republic-of-hawaii-proclaimed'),
        ph1('Republic of Hawaii', rh, startEvent='republic-of-hawaii-proclaimed', endEvent='annexation-of-hawaii'),
    ]))

    kt = 'Kingdom of Tahiti'
    T.append(row('kingdom-of-tahiti', 'Kingdom of Tahiti', '#a03a6a', POL, kt, span_=span(stretch(
        None, S1(kt) + C(1791, kt, 'infobox year_start: 1788/91', 'The infobox gives 1788 or 1791 for the founding.'),
        E1(kt), endEvent='tahiti-annexed-by-france')),
        memberOf=[member('french-colonial-empire', ev_claim(kt, 2), E1(kt), sources=[lead(kt, 'French protectorates in 1842')],
                         startEvent='tahiti-french-protectorate', endEvent='tahiti-annexed-by-france')]))

    kr, cif = 'Kingdom of Rarotonga', 'Cook Islands Federation'
    T.append(row('kingdom-of-rarotonga', 'Rarotonga (Cook Islands Federation)', '#6a5a9a', POL, kr, phases=[
        # HAND: the kingdom phase ends where the federation's own article starts it (1891); the kingdom's article
        # dates the renaming to 1893, kept as a second claim
        phase('Kingdom of Rarotonga', S1(kr), S1(cif) + noted(E1(kr), 'The Kingdom of Rarotonga article dates the renaming to the Cook Islands Federation to 1893.'),
              endEvent='cook-islands-federation-created'),
        ph1('Cook Islands Federation', cif, startEvent='cook-islands-federation-created', endEvent='cook-islands-annexed-by-new-zealand'),
    ], memberOf=[
        member('british-empire', ev_claim(kr, 1), E1(cif), sources=[lead(kr, 'protectorate of the United Kingdom')],
               startEvent='rarotonga-protectorate', endEvent='cook-islands-annexed-by-new-zealand'),
    ]))

    kei = 'Kingdom of Easter Island'
    T.append(row('kingdom-of-easter-island', 'Kingdom of Easter Island (Rapa Nui)', '#7a6a4a', POL, kei, span_=span(stretch(
        None,
        # HAND: "300–400 CE" → 350 ± 50 (a range is its midpoint with a margin, data-format.md)
        [{'year': 350, 'margin': 50, 'source': G.ref(kei, 'infobox year_start: 300–400 CE')}],
        F(kei, 'year_end', 'end'), circa=True, endEvent='chilean-annexation-of-easter-island'))))
    return T


def events(M):
    G, E, W, F, ev, lead = M.G, M.E, M.W, M.F, M.ev, M.lead

    def wev(uuid, title, article, tracks, **kw):
        """An event dated by an infobox `date` field of its own article (a war, battle or treaty infobox)."""
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

    def lev(uuid, title, article, needle, year, tracks, **kw):
        """An event dated by a lead sentence (HAND: the year is read from that sentence)."""
        return ev(uuid, title, year, tracks, lead(article, needle), **kw)

    mic3 = ['federated-states-of-micronesia', 'palau', 'marshall-islands']
    return [
        # ---------- Australia ----------
        fev('first-fleet', 'First Fleet founds New South Wales', 'Colony of New South Wales', 'year_start', ['australia', 'british-empire'], importance=1,
            descr='The penal colony at Sydney Cove begins British settlement of Australia.'),
        wev('australian-frontier-wars', 'Australian frontier wars', 'Australian frontier wars', ['australia'],
            descr='Conflicts between Aboriginal and Torres Strait Islander peoples and the settlers.'),
        fev('tasmania-self-government', "Van Diemen's Land becomes Tasmania", "Van Diemen's Land", 'year_end', ['australia'],
            descr='The colony is renamed and gains responsible government.'),
        fev('swan-river-colony-founded', 'Swan River Colony founded', 'Swan River Colony', 'year_start', ['australia']),
        fev('federation-of-australia', 'Federation of Australia', 'Australia', 'established_date1', ['australia'], importance=1,
            descr='The six colonies federate as the Commonwealth of Australia on 1 January 1901.'),
        wev('gallipoli-campaign', 'Gallipoli campaign', 'Gallipoli campaign', ['australia', 'new-zealand', 'ottoman-empire', 'british-empire'], importance=1),
        fev('balfour-declaration-1926', 'Balfour Declaration', 'Australia', 'established_date2', ['australia', 'new-zealand', 'british-empire'],
            descr='The dominions are declared equal in status with the United Kingdom.'),
        fev('statute-of-westminster-adoption-australia', 'Statute of Westminster Adoption Act (Australia)', 'Australia', 'established_date3',
            ['australia', 'british-empire']),
        wev('kokoda-track-campaign', 'Kokoda Track campaign', 'Kokoda Track campaign', ['australia', 'papua-new-guinea', 'japan']),
        fev('australia-act-1986', 'Australia Act', 'Australia', 'established_date4', ['australia'],
            descr='The last constitutional links with the United Kingdom are cut.'),
        # ---------- New Zealand ----------
        fev('nz-declaration-of-independence', 'Declaration of Independence of New Zealand', 'United Tribes of New Zealand', 'year_start', ['new-zealand'],
            descr='Northern Māori chiefs proclaim the United Tribes of New Zealand.'),
        wev('treaty-of-waitangi', 'Treaty of Waitangi', 'Treaty of Waitangi', ['new-zealand', 'british-empire'], importance=1,
            descr='Māori chiefs and the Crown sign the treaty on 6 February 1840.'),
        fev('colony-of-new-zealand-separated', 'Colony of New Zealand separated from New South Wales', 'Colony of New Zealand', 'year_start',
            ['new-zealand', 'australia']),
        wev('new-zealand-wars', 'New Zealand Wars', 'New Zealand Wars', ['new-zealand'], importance=1),
        fev('dominion-of-new-zealand', 'New Zealand becomes a dominion', 'Dominion of New Zealand', 'year_start', ['new-zealand']),
        fev('statute-of-westminster-adoption-nz', 'Statute of Westminster Adoption Act (New Zealand)', 'New Zealand', 'established_date5',
            ['new-zealand', 'british-empire']),
        fev('nz-constitution-act-1986', 'Constitution Act 1986', 'New Zealand', 'established_date6', ['new-zealand']),
        # ---------- Fiji ----------
        fev('kingdom-of-fiji-established', 'Kingdom of Fiji established', 'Kingdom of Fiji', 'year_start', ['fiji'],
            descr='Seru Epenisa Cakobau becomes king of a united Fiji.'),
        fev('fiji-ceded-to-britain', 'Fiji ceded to Britain', 'Colony of Fiji', 'year_start', ['fiji', 'british-empire'], importance=1),
        fev('fiji-independence', 'Fijian independence', 'Fiji', 'established_date1', ['fiji', 'british-empire'], importance=1),
        wev('fijian-coups-1987', 'Fijian coups of 1987', "1987 Fijian coups d'état", ['fiji'],
            descr='Two military coups; the military government declares a republic.'),
        wev('fijian-coup-2000', 'Fijian coup of 2000', "2000 Fijian coup d'état", ['fiji']),
        wev('fijian-coup-2006', 'Fijian coup of 2006', "2006 Fijian coup d'état", ['fiji'], descr='Frank Bainimarama seizes power.'),
        # ---------- Papua New Guinea ----------
        fev('british-new-guinea-protectorate', 'British protectorate over south-east New Guinea', 'British New Guinea', 'established_date1', ['papua-new-guinea', 'british-empire']),
        fev('german-new-guinea-established', 'German New Guinea established', 'German New Guinea', 'year_start', ['papua-new-guinea', 'germany']),
        fev('papua-transferred-to-australia', 'British New Guinea transferred to Australia', 'British New Guinea', 'established_date3',
            ['papua-new-guinea', 'australia', 'british-empire']),
        wev('australian-occupation-of-german-new-guinea', 'Australian occupation of German New Guinea', 'Australian occupation of German New Guinea',
            ['papua-new-guinea', 'australia', 'germany']),
        fev('papua-new-guinea-administrative-union', 'Papua and New Guinea united', 'Territory of Papua and New Guinea', 'year_start',
            ['papua-new-guinea', 'australia']),
        fev('png-independence', 'Papua New Guinean independence', 'Papua New Guinea', 'established_date5', ['papua-new-guinea', 'australia'], importance=1),
        fev('north-solomons-declared', 'Republic of the North Solomons declared', 'Republic of the North Solomons', 'year_start',
            ['republic-of-the-north-solomons', 'papua-new-guinea'], descr='Bougainville declares independence from Papua New Guinea.'),
        iev('north-solomons-reintegrated', 'North Solomons reintegrated into Papua New Guinea', 'Republic of the North Solomons', 1,
            ['republic-of-the-north-solomons', 'papua-new-guinea']),
        wev('bougainville-civil-war', 'Bougainville Civil War', 'Bougainville Civil War', ['papua-new-guinea'], importance=1),
        # ---------- Solomon Islands ----------
        fev('british-solomon-islands-protectorate', 'British Solomon Islands Protectorate declared', 'British Solomon Islands', 'year_start',
            ['solomon-islands', 'british-empire']),
        wev('guadalcanal-campaign', 'Guadalcanal campaign', 'Guadalcanal campaign', ['solomon-islands', 'united-states', 'japan'], importance=1),
        fev('solomon-islands-independence', 'Solomon Islands independence', 'Solomon Islands', 'established_date1', ['solomon-islands', 'british-empire'],
            importance=1),
        wev('ramsi', 'Regional Assistance Mission to Solomon Islands', 'Regional Assistance Mission to Solomon Islands',
            ['solomon-islands', 'australia', 'new-zealand'], descr='An Australian-led intervention after years of ethnic violence.'),
        wev('solomon-islands-unrest-2021', 'Solomon Islands unrest', '2021 Solomon Islands unrest', ['solomon-islands']),
        # ---------- Vanuatu ----------
        lev('anglo-french-joint-naval-commission', 'Anglo-French Joint Naval Commission', 'New Hebrides', 'Anglo-French Joint Naval Commission (1887', 1887,
            ['vanuatu'], descr='Britain and France begin joint supervision of the New Hebrides.'),
        fev('new-hebrides-condominium', 'New Hebrides Condominium', 'New Hebrides', 'year_start', ['vanuatu', 'british-empire', 'french-colonial-empire'],
            importance=1, descr='Britain and France agree to rule the islands jointly.'),
        wev('coconut-war', 'Coconut War', 'Coconut War', ['vanuatu'], descr='A secession on Espiritu Santo is put down around independence.'),
        fev('vanuatu-independence', 'Vanuatu independence', 'Vanuatu', 'established_date1', ['vanuatu', 'british-empire', 'french-colonial-empire'],
            importance=1),
        # ---------- Micronesia ----------
        fev('isokelekel-conquers-the-saudeleur', 'Isokelekel conquers the Saudeleur', 'Saudeleur dynasty', 'year_end', ['pohnpei'], importance=1,
            descr='The Saudeleur dynasty falls; the Nahnmwarki era begins on Pohnpei.'),
        lev('german-protectorate-of-the-marshall-islands', 'German protectorate of the Marshall Islands', 'Marshall Islands',
            'annexed the Marshalls as a protectorate in 1885', 1885, ['marshall-islands', 'germany']),
        lev('german-annexation-of-nauru', 'German annexation of Nauru', 'History of Nauru', 'annexed the island in 1888', 1888, ['nauru', 'germany'],
            descr='The annexation ends the Nauruan Civil War.'),
        wev('german-spanish-treaty-1899', 'German–Spanish Treaty', 'German–Spanish Treaty (1899)', ['federated-states-of-micronesia', 'palau', 'germany', 'spanish-empire'],
            descr='Spain sells the Caroline, Palau and Northern Mariana Islands to Germany.'),
        lev('nauru-phosphate-mining', 'Phosphate mining begins on Nauru', 'Nauru', 'strip-mined for about a century starting in 1900', 1900, ['nauru']),
        iev('japan-occupies-german-micronesia', 'Japan occupies German Micronesia', 'German New Guinea', 3, mic3 + ['japan', 'germany'], importance=1),
        fev('south-seas-mandate', 'South Seas Mandate', 'South Seas Mandate', 'year_start', mic3 + ['japan', 'south-seas-mandate'],
            descr='The Treaty of Versailles gives Japan a League of Nations mandate over Germany\'s former Micronesian islands.'),
        wev('battle-of-tarawa', 'Battle of Tarawa', 'Battle of Tarawa', ['gilbert-and-ellice-islands', 'united-states', 'japan']),
        fev('ttpi-established', 'Trust Territory of the Pacific Islands', 'Trust Territory of the Pacific Islands', 'year_start',
            mic3 + ['united-states', 'japan', 'south-seas-mandate', 'trust-territory-of-the-pacific-islands'],
            importance=1, descr='The United States takes over the former Japanese mandate as a UN trust territory.'),
        lev('us-nuclear-tests-marshall-islands', 'US nuclear tests in the Marshall Islands', 'Marshall Islands', 'Between 1946 and 1958', 1946,
            ['marshall-islands', 'united-states'], end=1958, importance=1, descr='67 nuclear tests at Bikini and Enewetak atolls.'),
        wev('castle-bravo', 'Castle Bravo', 'Castle Bravo', ['marshall-islands', 'united-states'],
            descr='The largest US nuclear test contaminates Rongelap and other atolls.'),
        fev('nauru-independence', 'Nauruan independence', 'Nauru', 'established_date1', ['nauru', 'australia'], importance=1),
        fev('marshall-islands-self-government', 'Marshall Islands self-government', 'Marshall Islands', 'established_date1', ['marshall-islands']),
        fev('fsm-constitution', 'Federated States of Micronesia constitution', 'Federated States of Micronesia', 'established_date1', ['federated-states-of-micronesia']),
        fev('republic-of-palau-established', 'Republic of Palau established', 'Palau', 'established_date2', ['palau']),
        fev('compact-of-free-association-1986', 'Compact of Free Association', 'Federated States of Micronesia', 'established_date2',
            ['federated-states-of-micronesia', 'marshall-islands', 'united-states'], importance=1, descr='Micronesia and the Marshall Islands become sovereign in free association with the United States.'),
        fev('palau-compact-of-free-association', 'Palau in free association', 'Palau', 'established_date3', ['palau', 'united-states', 'trust-territory-of-the-pacific-islands'], importance=1,
            descr='The last part of the Trust Territory becomes independent.'),
        # ---------- Kiribati and Tuvalu ----------
        fev('gilbert-and-ellice-protectorate', 'Gilbert and Ellice Islands protectorate', 'Gilbert and Ellice Islands', 'year_start',
            ['gilbert-and-ellice-islands', 'british-empire']),
        iev('gilbert-and-ellice-crown-colony', 'Gilbert and Ellice Islands Colony', 'Gilbert and Ellice Islands', 1, ['gilbert-and-ellice-islands']),
        lev('ellice-islands-referendum', 'Ellice Islands separation referendum', 'Tuvalu', 'A referendum was held in 1974', 1974, ['gilbert-and-ellice-islands']),
        fev('gilbert-and-ellice-separation', 'Gilbert and Ellice Islands separated', 'Gilbert and Ellice Islands', 'year_end',
            ['gilbert-and-ellice-islands', 'kiribati', 'tuvalu'], importance=1),
        fev('tuvalu-independence', 'Tuvaluan independence', 'Tuvalu', 'established_date1', ['tuvalu', 'british-empire'], importance=1),
        fev('kiribati-independence', 'Kiribati independence', 'Kiribati', 'established_date1', ['kiribati', 'british-empire'], importance=1),
        # ---------- Tonga ----------
        fev('tonga-unified', 'Tonga unified', 'Tonga', 'established_date1', ['tonga'], importance=1, descr='George Tupou I unites Tonga.'),
        fev('tui-tonga-title-abolished', 'Tuʻi Tonga title abolished', 'Tuʻi Tonga Empire', 'year_end', ['tonga']),
        fev('tonga-protected-state', 'Tonga becomes a British protected state', 'Kingdom of Tonga (1900–1970)', 'year_start', ['tonga', 'british-empire']),
        fev('tonga-protection-ends', 'Tonga\'s protected status ends', 'Kingdom of Tonga (1900–1970)', 'year_end', ['tonga', 'british-empire'], importance=1),
        wev('nukualofa-riots-2006', 'Nukuʻalofa riots', '2006 Nukuʻalofa riots', ['tonga']),
        # ---------- Samoa ----------
        fev('kingdom-of-samoa-founded', 'Kingdom of Samoa founded', 'Kingdom of Samoa', 'established_date1', ['samoa']),
        wev('first-samoan-civil-war', 'First Samoan Civil War', 'First Samoan Civil War', ['samoa', 'germany', 'united-states']),
        wev('second-samoan-civil-war', 'Second Samoan Civil War', 'Second Samoan Civil War', ['samoa', 'germany', 'united-states']),
        wev('tripartite-convention-1899', 'Tripartite Convention', 'Tripartite Convention', ['samoa', 'germany', 'united-states', 'british-empire'],
            importance=1, descr='Samoa is partitioned between Germany and the United States.'),
        wev('occupation-of-german-samoa', 'Occupation of German Samoa', 'Occupation of German Samoa', ['samoa', 'new-zealand', 'germany']),
        fev('samoan-independence', 'Samoan independence', 'Samoa', 'established_date7', ['samoa', 'new-zealand'], importance=1),
        # ---------- Hawaii ----------
        wev('battle-of-nuuanu', 'Battle of Nuʻuanu', 'Battle of Nuʻuanu', ['hawaiian-kingdom'], descr='Kamehameha I conquers Oʻahu.'),
        iev('hawaii-unified', 'Hawaiian Islands unified', 'Hawaiian Kingdom', 1, ['hawaiian-kingdom'], descr='Kauaʻi and Niʻihau join the kingdom.'),
        iev('paulet-affair', 'Paulet affair', 'Hawaiian Kingdom', 3, ['hawaiian-kingdom', 'united-kingdom'],
            descr='A British captain occupies the islands for five months.'),
        wev('overthrow-of-the-hawaiian-kingdom', 'Overthrow of the Hawaiian Kingdom', 'Overthrow of the Hawaiian Kingdom', ['hawaiian-kingdom', 'united-states'],
            importance=1),
        fev('republic-of-hawaii-proclaimed', 'Republic of Hawaii proclaimed', 'Provisional Government of Hawaii', 'year_end', ['hawaiian-kingdom']),
        fev('annexation-of-hawaii', 'Annexation of Hawaii', 'Republic of Hawaii', 'year_end', ['hawaiian-kingdom', 'united-states'], importance=1),
        # ---------- Tahiti, Rarotonga, Easter Island ----------
        iev('battle-of-te-feipi', 'Battle of Te Feipī', 'Kingdom of Tahiti', 1, ['kingdom-of-tahiti'], descr='Pōmare II consolidates his rule.'),
        iev('tahiti-french-protectorate', 'French protectorate over Tahiti', 'Kingdom of Tahiti', 2, ['kingdom-of-tahiti', 'french-colonial-empire']),
        wev('franco-tahitian-war', 'Franco-Tahitian War', 'Franco-Tahitian War', ['kingdom-of-tahiti', 'french-colonial-empire']),
        fev('tahiti-annexed-by-france', 'Tahiti annexed by France', 'Kingdom of Tahiti', 'year_end', ['kingdom-of-tahiti', 'french-colonial-empire'], importance=1),
        iev('rarotonga-protectorate', 'Rarotonga becomes a British protectorate', 'Kingdom of Rarotonga', 1, ['kingdom-of-rarotonga', 'british-empire']),
        fev('cook-islands-federation-created', 'Cook Islands Federation created', 'Cook Islands Federation', 'year_start', ['kingdom-of-rarotonga']),
        fev('cook-islands-annexed-by-new-zealand', 'Cook Islands annexed by New Zealand', 'Cook Islands Federation', 'year_end',
            ['kingdom-of-rarotonga', 'new-zealand'], importance=1),
        fev('chilean-annexation-of-easter-island', 'Chilean annexation of Easter Island', 'Kingdom of Easter Island', 'year_end',
            ['kingdom-of-easter-island', 'chile'], importance=1),
    ]
