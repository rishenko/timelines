"""
Modern States wave 6: the Americas (2026-11-21). Every UN member in the Americas (Mexico comes from colonial.py; this
module only adds events to it), the pre-Columbian states that lived past 1500, the colonial units that split into
several states, the unions and federations, and the other historical states with a former-country infobox.

Rules applied (data-format.md and Kevin's decisions, 2026-11-21):
- A row that carries on into a state that exists today takes that state's id; older governments are phases.
- Unions and federations are their own rows: the Aztec Triple Alliance, Gran Colombia, the Federal Republic of Central
  America, the Peru–Bolivian Confederation, the United Kingdom of Portugal, Brazil and the Algarves, the Confederate
  States, the West Indies Federation. Members carry dated memberships.
- Colonial units that split into several states are rows linked to their successors by succession events: New France,
  the viceroyalties of Peru, New Granada and the Río de la Plata, the Captaincy General of Guatemala, and the British
  Leeward and Windward Islands colonies. A colony that maps onto one state is a phase on its row plus a membership in
  its empire (Colonial Brazil, Saint-Domingue, the Thirteen Colonies, New Netherland, New Sweden, Russian America…).
- Foreign occupations (the US in Cuba, Haiti and the Dominican Republic) are phases only, as Serbia's German occupation
  is in europe.py; the Haitian rule of Santo Domingo is a phase plus a membership in Haiti (an annexation).
- Rows crossing 1500 match the Medieval World timeline (aztec-empire with tenochtitlan, tetzcoco and tlacopan,
  inca-empire, purepecha-empire, muisca-confederation, kiche-kingdom-of-qumarkaj, tlaxcala-nahua-state,
  plaquemine-culture), with Medieval's own claims (the first claim of each infobox field).
- Union events: an event goes on a member's row only if it starts or ends that membership or phase, or the member
  acted as itself.

Hand calls (Kevin, 2026-11-21: every hand call is data here, with a comment) are marked "HAND:" below.

Called from gen_modern.py with its module (M).
"""

GROUPS = [
    {'id': 'northern-america', 'name': 'Northern America', 'color': '#3a6a8f', 'parent': 'americas'},
    {'id': 'caribbean', 'name': 'Caribbean', 'color': '#2a8a9a', 'parent': 'americas'},
    {'id': 'south-america', 'name': 'South America', 'color': '#5a8a4a', 'parent': 'americas'},
]

NA, CA, CB, SA = 'northern-america', 'central-america', 'caribbean', 'south-america'

# rows added to events that other modules define
SHARED = {
    'fall-of-tenochtitlan': ['aztec-empire', 'tenochtitlan'],
    'mexican-american-war': ['united-states', 'california-republic'],
    'spanish-american-war': ['united-states', 'cuba', 'spain'],  # defined in east_asia.py
    # the Americas' states that declared war themselves (Canada in 1939; Brazil in both wars; Mexico in 1942)
    'ww1': ['united-states', 'brazil'],
    'ww2': ['united-states', 'canada', 'brazil', 'mexico'],
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

    def est_last(t, k):
        return F(t, f'established_date{k}:last', 'end')[:1]

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

    def life(t, *, startEvent=None, endEvent=None, circa=False, first=False):
        """A one-stretch lifespan from the article's year_start and year_end (first: its own values only)."""
        s, e = F(t, 'year_start', 'start'), F(t, 'year_end', 'end')
        if first:
            s, e = s[:1], e[:1]
        return span(stretch(None, s, e, startEvent=startEvent, endEvent=endEvent, circa=circa))

    def ph(name, t, s='year_start', e='year_end', **kw):
        return phase(name, F(t, s, 'start'), F(t, e, 'end'), **kw)

    def ph1(name, t, **kw):
        return phase(name, S1(t), E1(t), **kw)

    T = []

    # ================= Pre-Columbian states (Medieval World's ids and claims) =================
    az = 'Aztec Empire'
    alliance = [G.ref(az, 'infobox event_start: Foundation of the alliance, 1428')]
    T.append(row('aztec-empire', 'Aztec Empire (Triple Alliance)', '#2a8a7a', CA, az,
                 span_=life(az, first=True, startEvent='triple-alliance-formed', endEvent='spanish-conquest-of-the-aztec-empire')))

    def in_alliance():
        return [member('aztec-empire', S1(az), E1(az), sources=alliance,
                       startEvent='triple-alliance-formed', endEvent='spanish-conquest-of-the-aztec-empire')]
    T.append(row('tenochtitlan', 'Tenochtitlan', '#3a6aa8', CA, 'Tenochtitlan',
                 span_=life('Tenochtitlan', first=True, endEvent='spanish-conquest-of-the-aztec-empire'), memberOf=in_alliance()))
    T.append(row('tetzcoco', 'Tetzcoco', '#6a8aa8', CA, 'Tetzcoco (altepetl)',
                 span_=life('Tetzcoco (altepetl)', first=True, endEvent='spanish-conquest-of-the-aztec-empire'), memberOf=in_alliance()))
    T.append(row('tlacopan', 'Tlacopan', '#8a8aa8', CA, 'Tlacopan',
                 span_=life('Tlacopan', first=True, startEvent='triple-alliance-formed', endEvent='spanish-conquest-of-the-aztec-empire'),
                 memberOf=in_alliance()))
    T.append(row('tlaxcala-nahua-state', 'Tlaxcala', '#c08a3a', CA, 'Tlaxcala (Nahua state)',
                 span_=life('Tlaxcala (Nahua state)', first=True, endEvent='spanish-conquest-of-the-aztec-empire')))
    T.append(row('purepecha-empire', 'Purépecha (Tarascan) Empire', '#7a3a3a', CA, 'Purépecha Empire',
                 span_=life('Purépecha Empire', first=True, endEvent='purepecha-conquered')))
    T.append(row('kiche-kingdom-of-qumarkaj', 'Kʼicheʼ kingdom of Qʼumarkaj', '#5a8a3a', CA, 'Kʼicheʼ kingdom of Qʼumarkaj',
                 span_=life('Kʼicheʼ kingdom of Qʼumarkaj', first=True, endEvent='spanish-conquest-of-guatemala')))
    T.append(row('peten-itza-kingdom', 'Petén Itza kingdom', '#4a7a2a', CA, 'Peten Itza kingdom',
                 span_=life('Peten Itza kingdom', first=True, endEvent='spanish-conquest-of-peten')))
    # ---- Medieval World's cultures that fade after 1500 (lead, 2026-11-21): an open end stops at the last cited
    # mention, with a note that the row fades after it; never ongoing ----
    FADE = 'The sources give no end; the row stops at the last dated mention and fades after it.'

    def CL(t, needle, year, margin=None, note=None, section=None):
        """A claim from a lead sentence or (section=…) a section's first dated sentence. HAND: year (and margin) read from it."""
        if section:
            for s_ in G.art(t)['body']['section_openers']:
                if s_['section'] == section and needle in s_['text']:
                    src = G.ref(t, f'section "{section}": "{s_["text"][:160]}"')
                    break
            else:
                raise SystemExit(f'{t}: no opener in {section!r} with {needle!r}')
        else:
            src = lead(t, needle)
        c = {'year': year, 'source': src}
        if margin:
            c['margin'] = margin
        if note:
            c['note'] = note
        return [c]

    mxc = 'Mixtec culture'
    # HAND: "12th century BC – 10th century BC" → c. 1150 BCE ± 50 (stored 1 − 1150 = −1149); "the first decades of the
    # 16th century" → c. 1520 ± 10, as the Medieval World timeline reads them
    T.append(row('mixtec-culture', 'Mixtec culture', '#9a6a4a', CA, mxc, span_=span(stretch(
        None, CL(mxc, '12th century BC', -1149, 50), CL(mxc, 'first decades of the 16th century', 1520, 10), circa=True))))
    mis = 'Mississippian period (archaeology)'
    T.append(row('mississippian-culture', 'Mississippian culture', '#6a7a4a', NA, mis, span_=span(stretch(
        None, C(1000, mis, 'section heading: Early Mississippian period (c. 1000)'),
        CL(mis, 'Late Mississippian period (1400–1600)', 1600, note=FADE), circa=True))))
    th = 'Thule people'
    T.append(row('thule-people', 'Thule people', '#7a8a9a', NA, th, span_=span(stretch(
        None, CL(th, 'coastal Alaska by 1000 CE', 1000),
        CL(th, 'Little Ice Age', 1650, note='The communities broke apart during the Little Ice Age (1650–1850); its start is taken.')
        + CL(th, 'Little Ice Age', 1850, note='The end of the Little Ice Age.'), circa=True))))
    ta = 'Taíno'
    # HAND: an "8th- to 10th–century" Taíno woman → c. 850 ± 50, as the Medieval World timeline reads it
    T.append(row('taino', 'Taíno', '#4a9a8a', CB, ta, span_=span(stretch(
        None, CL(ta, '8th- to 10th', 850, 50, section='Present > DNA studies'),
        CL(ta, 'Census records from 1514', 1514, note=FADE, section='Present > Dominican Republic'), circa=True))))
    pq = 'Plaquemine culture'
    T.append(row('plaquemine-culture', 'Plaquemine culture', '#5a8a6a', NA, pq, span_=span(stretch(
        None, L(pq, 'circa 1200 to 1700', 1200), L(pq, 'circa 1200 to 1700', 1700), circa=True))))
    mu = 'Muisca Confederations (political units)'
    T.append(row('muisca-confederation', 'Muisca Confederation', '#5a5a3a', SA, mu,
                 span_=life(mu, first=True, endEvent='spanish-conquest-of-the-muisca')))
    inca, koc, nis = 'Inca Empire', 'Kingdom of Cusco', 'Neo-Inca State'
    T.append(row('inca-empire', 'Inca Empire', '#c0302a', SA, inca,
                 # the Neo-Inca State of Vilcabamba carried on the empire until 1572 (the Inca article's other end):
                 # the lifespan runs through the gap of 1533–37
                 span_=span(stretch(None, S1(koc), F(inca, 'date_post', 'end'), endEvent='fall-of-vilcabamba')),
                 phases=[
        phase('Kingdom of Cusco', S1(koc), E1(koc)),
        phase('Inca Empire (Tawantinsuyu)', S1(inca), E1(inca), endEvent='battle-of-cajamarca'),
        phase('Neo-Inca State', S1(nis), E1(nis), startEvent='siege-of-cuzco', endEvent='fall-of-vilcabamba'),
    ]))

    # ================= Northern America =================
    nf = 'New France'
    T.append(row('new-france', 'New France', '#3a52a0', NA, nf,
                 span_=life(nf, startEvent='cartier-voyage', endEvent='treaty-of-paris-1763'),
                 memberOf=[member('french-colonial-empire', S1(nf), E1(nf), sources=[lead(nf, 'territory colonized by France')],
                                  startEvent='cartier-voyage', endEvent='treaty-of-paris-1763')]))

    pq_, uc, lc, pc, ca = 'Province of Quebec (1763–1791)', 'Upper Canada', 'Lower Canada', 'Province of Canada', 'Canada'
    T.append(row('canada', 'Canada', '#c0302a', NA, ca, phases=[
        ph('Province of Quebec', pq_, startEvent='treaty-of-paris-1763', endEvent='constitutional-act-1791'),
        # two colonies side by side: parallel phases
        ph('Upper Canada', uc, startEvent='constitutional-act-1791', endEvent='act-of-union-1840'),
        ph('Lower Canada', lc, startEvent='constitutional-act-1791', endEvent='act-of-union-1840'),
        ph('Province of Canada', pc, startEvent='act-of-union-1840', endEvent='canadian-confederation'),
        phase('Canada', est(ca, 1), ongoing=cur(ca, 4), startEvent='canadian-confederation'),
    ], memberOf=[
        # HAND: the membership ends with the Statute of Westminster (legislative independence), as the Canada infobox lists it
        member('british-empire', S1(pq_), est(ca, 3), sources=[G.ref(pq_, 'infobox event_start: Royal Proclamation, 7 October 1763'),
                                                             G.ref(ca, 'infobox established_event3: Statute of Westminster, December 11, 1931')],
               startEvent='treaty-of-paris-1763', endEvent='statute-of-westminster'),
    ]))
    nc, dn = 'Newfoundland Colony', 'Dominion of Newfoundland'
    T.append(row('newfoundland', 'Newfoundland', '#7a4a8a', NA, dn, phases=[
        phase('Newfoundland Colony', S1(nc), E1(nc), endEvent='newfoundland-dominion'),
        phase('Dominion of Newfoundland', F(dn, 'year_start', 'start'), F(dn, 'year_end', 'end'),
              startEvent='newfoundland-dominion', endEvent='newfoundland-joins-canada'),
    ], memberOf=[
        member('british-empire', S1(nc), E1(dn), sources=[G.ref(nc, 'infobox event_start: English Colonization of Newfoundland, 1610'),
                                                       G.ref(dn, 'infobox event_end: Canadian province, 31 March 1949')],
               endEvent='newfoundland-joins-canada'),
    ]))

    sf, tc, nn, ns, ra, us = ('Spanish Florida', 'Thirteen Colonies', 'New Netherland', 'New Sweden',
                              'Russian colonization of North America', 'United States')
    T.append(row('united-states', 'United States', '#2f4f9f', NA, us, phases=[
        # colonies that map onto the United States: parallel phases, each with a membership in its empire
        ph('Spanish Florida', sf, endEvent='treaty-of-paris-1763'),
        phase('Thirteen Colonies', F(tc, 'seg0.start', 'start'), F(tc, 'seg0.end', 'end'), startEvent='jamestown',
              endEvent='us-declaration-of-independence'),
        phase('New Netherland', F(nn, 'seg0.start', 'start'), F(nn, 'seg0.end', 'end'), endEvent='treaty-of-breda-1667'),
        phase('New Netherland (reconquered)', F(nn, 'seg1.start', 'start'), F(nn, 'seg1.end', 'end')),
        ph('New Sweden', ns, endEvent='dutch-conquest-of-new-sweden'),
        ph('Russian America', ra, endEvent='alaska-purchase'),
        phase('Continental Congress', est(us, 1), est(us, 2), startEvent='us-declaration-of-independence', endEvent='articles-of-confederation'),
        phase('Articles of Confederation', est(us, 2), est(us, 4), startEvent='articles-of-confederation', endEvent='us-constitution'),
        phase('United States under the Constitution', est(us, 4), ongoing=cur(us, 4), startEvent='us-constitution'),
    ], memberOf=[
        member('spanish-empire', S1(sf), E1(sf), sources=[G.ref(sf, 'infobox event_start: Spanish exploration and settlement, 1513')],
               endEvent='treaty-of-paris-1763'),
        member('british-empire', F(tc, 'seg0.start', 'start'),
               F(tc, 'seg0.end', 'end') + [dict(c, note='The infobox ends the colonies at the Treaty of Paris (1783), when Britain recognized independence.')
                                           for c in F(tc, 'year_end', 'end')[:1]],
               sources=[lead(tc, 'British colonies on the Atlantic coast')], startEvent='jamestown', endEvent='us-declaration-of-independence'),
        member('dutch-empire', F(nn, 'seg0.start', 'start'), F(nn, 'seg0.end', 'end'),
               sources=[G.ref(nn, 'infobox life span: 1614–1667 / 1673–1674')], endEvent='treaty-of-breda-1667'),
        member('dutch-empire', F(nn, 'seg1.start', 'start'), F(nn, 'seg1.end', 'end'), sources=[G.ref(nn, 'infobox life span: 1614–1667 / 1673–1674')]),
        member('sweden', S1(ns), E1(ns), sources=[G.ref(ns, 'infobox former country: New Sweden, 1638–1655')], endEvent='dutch-conquest-of-new-sweden'),
        member('russia', S1(ra), E1(ra), sources=[G.ref(ra, 'infobox event_end: Alaska Purchase, 1867')], endEvent='alaska-purchase'),
    ]))
    csa = 'Confederate States of America'
    T.append(row('confederate-states-of-america', 'Confederate States of America', '#8a7a6a', NA, csa,
                 span_=life(csa, startEvent='american-civil-war', endEvent='american-civil-war')))
    T.append(row('vermont-republic', 'Vermont Republic', '#4a8a5a', NA, 'Vermont Republic',
                 span_=life('Vermont Republic', endEvent='vermont-admitted')))
    T.append(row('republic-of-texas', 'Republic of Texas', '#a04a3a', NA, 'Republic of Texas',
                 span_=life('Republic of Texas', startEvent='texas-revolution', endEvent='texas-annexation')))
    T.append(row('california-republic', 'California Republic', '#a07a3a', NA, 'California Republic',
                 span_=life('California Republic', startEvent='california-independence', endEvent='mexican-american-war')))
    T.append(row('state-of-muskogee', 'State of Muskogee', '#6a5a3a', NA, 'State of Muskogee',
                 span_=life('State of Muskogee', startEvent='muskogee-declared', endEvent='capture-of-bowles')))
    ist = 'Republic of Indian Stream'
    T.append(row('republic-of-indian-stream', 'Republic of Indian Stream', '#5a6a7a', NA, ist, span_=span(stretch(
        None, S1(ist), E1(ist) + L(ist, 'It existed from July 9, 1832, to August 5, 1835', 1835,
                                  'The lead ends the republic in 1835; the infobox dates its absorption into New Hampshire to 1840.')))))

    # ================= Mexico's neighbours: the breakaway republics =================
    T.append(row('republic-of-yucatan', 'Republic of Yucatán', '#3a7a6a', CA, 'Republic of Yucatán',
                 span_=life('Republic of Yucatán', startEvent='yucatan-independence')))
    T.append(row('republic-of-the-rio-grande', 'Republic of the Rio Grande', '#7a6a3a', CA, 'Republic of the Rio Grande',
                 span_=life('Republic of the Rio Grande', startEvent='rio-grande-convention', endEvent='rio-grande-surrender')))

    # ================= Central America =================
    cgg, frca = 'Captaincy General of Guatemala', 'Federal Republic of Central America'
    T.append(row('captaincy-general-of-guatemala', 'Captaincy General of Guatemala', '#9a7a3a', CA, cgg,
                 span_=life(cgg, endEvent='central-american-independence'),
                 memberOf=[member('spanish-empire', S1(cgg), E1(cgg), sources=[G.ref(cgg, 'infobox event_start: Established by King Charles I, 1527')],
                                  endEvent='central-american-independence')]))
    T.append(row('federal-republic-of-central-america', 'Federal Republic of Central America', '#4a6aa0', CA, frca, span_=span(stretch(
        None, F(frca, 'year_start', 'start'), F(frca, 'year_end', 'end'), startEvent='central-america-leaves-mexico', endEvent='frca-dissolved'))))

    annex = L(frca, 'annexed by the First Mexican Empire in January 1822', 1822)

    def in_mexico():
        return member('mexico', annex, S1(frca), sources=[lead(frca, 'annexed by the First Mexican Empire in January 1822')],
                      startEvent='mexican-annexation-of-central-america', endEvent='central-america-leaves-mexico')

    def ca_state(id_, name, color, t, state_name, leave, cur_k, extra_phases=(), frca_end=None, member_end=None):
        """A Central American republic: independent from 1821 (the lifespan), in Mexico 1822–23, a state of the
        federation from 1823, a republic after it left."""
        end = frca_end or est(t, 3)
        phases = [phase(state_name, est(t, 2), est(t, 3), startEvent='central-america-leaves-mexico', endEvent=leave)]
        phases += list(extra_phases)
        return row(id_, name, color, CA, t,
                   span_=span(stretch(None, est(t, 1), ongoing=cur(t, cur_k), startEvent='central-american-independence')),
                   phases=phases,
                   memberOf=[in_mexico(),
                             member('federal-republic-of-central-america', est(t, 2), end,
                                    sources=[lead(frca, 'composed of five states')],
                                    startEvent='central-america-leaves-mexico', endEvent=member_end or leave)])
    gt, sv, hn, ni, cr, fscr = 'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Free State of Costa Rica'
    T.append(ca_state('guatemala', 'Guatemala', '#3a8ac0', gt, 'State of Guatemala', 'guatemala-leaves-federation', 4, [
        phase('Republic of Guatemala', est(gt, 3), ongoing=cur(gt, 4), startEvent='guatemala-leaves-federation')]))
    # El Salvador stayed in the federation until 1841; the federation itself ended in 1839
    T.append(ca_state('el-salvador', 'El Salvador', '#2a5aa0', sv, 'State of El Salvador', 'el-salvador-leaves-federation', 4, [
        phase('Republic of El Salvador', est(sv, 3), ongoing=cur(sv, 4), startEvent='el-salvador-leaves-federation')],
        frca_end=F(frca, 'year_end', 'end')[:1] + [dict(c, note='El Salvador declared its own independence from the federation in 1841.') for c in est(sv, 3)],
        member_end='frca-dissolved'))
    T.append(ca_state('honduras', 'Honduras', '#3a6ab0', hn, 'State of Honduras', 'honduras-leaves-federation', 3, [
        phase('Republic of Honduras', est(hn, 3), ongoing=cur(hn, 3), startEvent='honduras-leaves-federation')]))
    T.append(ca_state('nicaragua', 'Nicaragua', '#4a7ab0', ni, 'State of Nicaragua', 'nicaragua-leaves-federation', 6, [
        phase('Republic of Nicaragua', est(ni, 3), ongoing=cur(ni, 6), startEvent='nicaragua-leaves-federation')]))
    T.append(ca_state('costa-rica', 'Costa Rica', '#2a6a9a', cr, 'State of Costa Rica', 'costa-rica-leaves-federation', 5, [
        ph('Free State of Costa Rica', fscr, startEvent='costa-rica-leaves-federation', endEvent='costa-rica-republic'),
        phase('Republic of Costa Rica', S1(fscr, 'year_end'), ongoing=cur(cr, 5), startEvent='costa-rica-republic')]))
    la = 'Los Altos (state)'
    T.append(row('los-altos', 'Los Altos', '#6a7a9a', CA, la,
                 span_=span(stretch(None, F(la, 'seg0.start', 'start'), F(la, 'seg0.end', 'end'), startEvent='los-altos-independence',
                                    endEvent='los-altos-reincorporated'),
                            stretch(None, F(la, 'seg1.start', 'start'), F(la, 'seg1.end', 'end'))),
                 memberOf=[member('federal-republic-of-central-america', ev_claim(la, 1), E1(frca),
                                  sources=[G.ref(la, 'infobox event1: Renewed recognition of Central American Congress, 5 June 1838')],
                                  endEvent='frca-dissolved')]))
    bh, bz = 'British Honduras', 'Belize'
    T.append(row('belize', 'Belize', '#2a7a9a', CA, bz, phases=[
        phase('British Honduras', F(bh, 'seg0.start', 'start'), F(bh, 'seg0.end', 'end'), startEvent='treaty-of-versailles-1783',
              endEvent='belize-independence'),
        phase('Belize', est(bz, 2), ongoing=cur(bz, 2), startEvent='belize-independence'),
    ], memberOf=[
        member('british-empire', F(bh, 'seg0.start', 'start') + L(bz, 'became a British colony in 1840', 1840, 'The Belize article dates the colony from 1840.'),
               F(bh, 'seg0.end', 'end'), sources=[lead(bz, 'became a British colony in 1840')],
               startEvent='treaty-of-versailles-1783', endEvent='belize-independence'),
    ]))
    pa, sp = 'Panama', 'State of Panama'
    gc = 'Gran Colombia'
    T.append(row('panama', 'Panama', '#c03a5a', CA, pa,
                 # inside Gran Colombia and then Colombia, mostly without a government of its own: the lifespan carries it
                 span_=span(stretch(None, est(pa, 1), ongoing=cur(pa, 4), startEvent='panama-independence-1821')),
                 phases=[
        ph('State of Panama', sp),
        phase('Republic of Panama', est(pa, 3), ongoing=cur(pa, 4), startEvent='separation-of-panama'),
    ], memberOf=[
        member('gran-colombia', est(pa, 2), E1(gc), sources=[lead(pa, 'joined the Republic of Gran Colombia')],
               startEvent='panama-independence-1821', endEvent='dissolution-of-gran-colombia'),
        member('colombia', E1(gc), est(pa, 3), sources=[lead(pa, 'eventually became the Republic of Colombia')],
               startEvent='dissolution-of-gran-colombia', endEvent='separation-of-panama'),
    ]))

    # ================= Caribbean =================
    cgc, mgc, rc, pgc, cu = 'Captaincy General of Cuba', 'Military Government of Cuba', 'Republic of Cuba (1902–1959)', 'Provisional Government of Cuba', 'Cuba'
    rcs = 'infobox life span: 1902–1906; 1909–1959'  # wp_states reads this life span as one segment: cited as written
    T.append(row('cuba', 'Cuba', '#c03a3a', CB, cu, phases=[
        ph1('Captaincy General of Cuba', cgc, endEvent='treaty-of-paris-1898'),
        ph1('US military government', mgc, startEvent='treaty-of-paris-1898', endEvent='cuban-independence-1902'),
        phase('Republic of Cuba', C(1902, rc, rcs), C(1906, rc, rcs), startEvent='cuban-independence-1902', endEvent='second-occupation-of-cuba'),
        ph1('Provisional Government (US occupation)', pgc, startEvent='second-occupation-of-cuba'),
        phase('Republic of Cuba (restored)', C(1909, rc, rcs), C(1959, rc, rcs), endEvent='cuban-revolution'),
        phase('Revolutionary Cuba', est_last(cu, 5), ongoing=cur(cu, 6), startEvent='cuban-revolution'),
    ], memberOf=[member('spanish-empire', S1(cgc), E1(cgc), sources=[lead(cgc, 'administrative district of the Spanish Empire')],
                        endEvent='treaty-of-paris-1898')]))

    sd, fe, rhs, sh, kh, rh, se, rh2, ht = ('Saint-Domingue', 'First Empire of Haiti', 'Republic of Haiti (1806–1820)', 'State of Haiti',
                                           'Kingdom of Haiti', 'Republic of Haiti (1820–1849)', 'Second Empire of Haiti',
                                           'Republic of Haiti (1859–1957)', 'Haiti')
    T.append(row('haiti', 'Haiti', '#2a4a9a', CB, ht, phases=[
        phase('Saint-Domingue', S1(sd) + L(sd, 'from 1659 to 1803', 1659, 'The lead dates the French colony from 1659; Spain recognized it in 1697.'),
              E1(sd), endEvent='battle-of-vertieres'),
        ph1('First Empire of Haiti', fe, startEvent='haitian-independence', endEvent='assassination-of-dessalines'),
        # north and south ruled apart from 1806 to 1820: parallel phases
        ph1('Republic of Haiti (south)', rhs, startEvent='assassination-of-dessalines', endEvent='haiti-reunified'),
        ph1('State of Haiti (north)', sh, startEvent='assassination-of-dessalines', endEvent='kingdom-of-haiti-proclaimed'),
        ph1('Kingdom of Haiti (north)', kh, startEvent='kingdom-of-haiti-proclaimed', endEvent='haiti-reunified'),
        ph1('Republic of Haiti (reunified)', rh, startEvent='haiti-reunified', endEvent='second-empire-of-haiti'),
        ph1('Second Empire of Haiti', se, startEvent='second-empire-of-haiti', endEvent='haitian-republic-1859'),
        ph1('Republic of Haiti', rh2, startEvent='haitian-republic-1859', endEvent='duvalier-takes-power'),
        # the US occupation ran alongside the Haitian government: a rival phase
        phase('US occupation', est(ht, 11), est_last(ht, 11), startEvent='us-occupation-of-haiti', endEvent='us-occupation-of-haiti'),
        phase('Republic of Haiti (since 1957)', S1(rh2, 'year_end'), ongoing=cur(ht, 13), startEvent='duvalier-takes-power'),
    ], memberOf=[member('french-colonial-empire', S1(sd), E1(sd), sources=[lead(sd, 'French colony in the western portion')],
                        endEvent='battle-of-vertieres')]))

    cgsd, rsh, hosd, fdr, sadr, sdr, mgsd, tdr, dr = (
        'Captaincy General of Santo Domingo', 'Republic of Spanish Haiti', 'Haitian occupation of Santo Domingo', 'First Dominican Republic',
        'Spanish annexation of the Dominican Republic', 'Second Dominican Republic', 'Military Government of Santo Domingo',
        'Third Dominican Republic', 'Dominican Republic')
    T.append(row('dominican-republic', 'Dominican Republic', '#2a3a8a', CB, dr, phases=[
        phase('Captaincy General of Santo Domingo', F(cgsd, 'seg0.start', 'start'), ev_claim(cgsd, 1), endEvent='peace-of-basel'),
        phase('French Santo Domingo', ev_claim(cgsd, 1), ev_claim(cgsd, 2), startEvent='peace-of-basel', endEvent='santo-domingo-returned-to-spain'),
        phase('Captaincy General of Santo Domingo (restored)', ev_claim(cgsd, 2), ev_claim(cgsd, 3), startEvent='santo-domingo-returned-to-spain',
              endEvent='spanish-haiti-independence'),
        ph1('Republic of Spanish Haiti', rsh, startEvent='spanish-haiti-independence', endEvent='haitian-occupation-of-santo-domingo'),
        ph1('Haitian rule', hosd, startEvent='haitian-occupation-of-santo-domingo', endEvent='dominican-independence'),
        ph1('First Republic', fdr, startEvent='dominican-independence', endEvent='spanish-annexation-of-the-dominican-republic'),
        ph1('Spanish annexation', sadr, startEvent='spanish-annexation-of-the-dominican-republic', endEvent='dominican-restoration-war'),
        ph1('Second Republic', sdr, startEvent='dominican-restoration-war', endEvent='us-occupation-of-the-dominican-republic'),
        ph1('US military government', mgsd, startEvent='us-occupation-of-the-dominican-republic', endEvent='us-withdrawal-from-santo-domingo'),
        ph1('Third Republic', tdr, startEvent='us-withdrawal-from-santo-domingo', endEvent='dominican-civil-war'),
        phase('Fourth Republic', est(dr, 5), ongoing=cur(dr, 5), startEvent='dominican-civil-war'),
    ], memberOf=[
        member('spanish-empire', F(cgsd, 'seg0.start', 'start'), ev_claim(cgsd, 1), sources=[lead(cgsd, 'first Captaincy in the New World')],
               endEvent='peace-of-basel'),
        member('french-colonial-empire', ev_claim(cgsd, 1), ev_claim(cgsd, 2), sources=[G.ref(cgsd, 'infobox event1: Santo Domingo annexed to France, 22 July 1795')],
               startEvent='peace-of-basel', endEvent='santo-domingo-returned-to-spain'),
        member('spanish-empire', ev_claim(cgsd, 2), ev_claim(cgsd, 3), sources=[G.ref(cgsd, 'infobox event2: Santo Domingo returned to Spain, 9 July 1809')],
               startEvent='santo-domingo-returned-to-spain', endEvent='spanish-haiti-independence'),
        member('haiti', S1(hosd), E1(hosd), sources=[lead(hosd, 'annexation and merger')],
               startEvent='haitian-occupation-of-santo-domingo', endEvent='dominican-independence'),
        member('spanish-empire', S1(sadr), E1(sadr), sources=[G.ref(sadr, 'infobox event_start: Reincorporation proclaimed, March 18 1861')],
               startEvent='spanish-annexation-of-the-dominican-republic', endEvent='dominican-restoration-war'),
    ]))

    wif = 'West Indies Federation'
    wif_src = [G.ref(wif, 'section "Geography": "The Federation spanned all the island groupings in the Caribbean: … Jamaica … Barbados … Leeward …"')]
    T.append(row('west-indies-federation', 'West Indies Federation', '#3a8aa0', CB, wif,
                 span_=life(wif, startEvent='wif-founded', endEvent='wif-dissolved')))

    def in_wif(sources=None):
        return member('west-indies-federation', S1(wif), E1(wif), sources=sources or wif_src, startEvent='wif-founded', endEvent='wif-dissolved')

    bli, bwi = 'British Leeward Islands', 'British Windward Islands'
    T.append(row('british-leeward-islands', 'British Leeward Islands', '#6a8a7a', CB, bli,
                 span_=span(stretch(None, F(bli, 'seg0.start', 'start'), F(bli, 'seg0.end', 'end'), endEvent='leeward-islands-divided'),
                            stretch(None, F(bli, 'seg1.start', 'start'), F(bli, 'seg1.end', 'end')
                                    + L(bli, 'British colony from 1671 to 1958', 1958, 'The lead dissolves the colony in 1958.'),
                                    startEvent='leeward-islands-reformed', endEvent='wif-founded')),
                 memberOf=[member('british-empire', F(bli, 'seg0.start', 'start'), F(bli, 'seg0.end', 'end'), sources=[lead(bli, 'British colony from 1671')]),
                           member('british-empire', F(bli, 'seg1.start', 'start'), F(bli, 'seg1.end', 'end'), sources=[lead(bli, 'British colony from 1671')])]))
    T.append(row('british-windward-islands', 'British Windward Islands', '#5a7a8a', CB, bwi, span_=life(bwi, endEvent='wif-founded'),
                 memberOf=[member('british-empire', S1(bwi), E1(bwi), sources=[lead(bwi, 'administrative grouping of British colonies')])]))
    lw_src, ww_src = [lead(bli, 'British colony from 1671')], [lead(bwi, 'administrative grouping of British colonies')]

    def in_windward(sc=None, ec=None, startEvent=None, endEvent='wif-founded'):
        return member('british-windward-islands', sc or S1(bwi), ec or E1(bwi), sources=ww_src, startEvent=startEvent, endEvent=endEvent)

    jm, cs = 'Jamaica', 'Colony of Santiago'
    T.append(row('jamaica', 'Jamaica', '#2a8a3a', CB, jm, phases=[
        ph1('Colony of Santiago (Spanish Jamaica)', cs, endEvent='invasion-of-jamaica'),
        ph1('Colony of Jamaica', 'Colony of Jamaica', startEvent='invasion-of-jamaica', endEvent='jamaican-independence'),
        phase('Jamaica', est(jm, 1), ongoing=cur(jm, 1), startEvent='jamaican-independence'),
    ], memberOf=[
        member('spanish-empire', S1(cs), E1(cs), sources=[lead(jm, 'belonged to Spain under the name Santiago')], endEvent='invasion-of-jamaica'),
        member('british-empire', S1('Colony of Jamaica'), E1('Colony of Jamaica'), sources=[lead(jm, 'England conquered it')],
               startEvent='invasion-of-jamaica', endEvent='jamaican-independence'),
        in_wif(),
    ]))
    bb = 'Barbados'
    T.append(row('barbados', 'Barbados', '#2a5a9a', CB, bb, phases=[
        phase('English and British colony', L(bb, 'In 1627, the first permanent settlers', 1627), est(bb, 2), startEvent='barbados-settled',
              endEvent='barbados-independence'),
        phase('Commonwealth realm', est(bb, 2), est(bb, 5), startEvent='barbados-independence', endEvent='barbados-republic'),
        phase('Republic of Barbados', est(bb, 5), ongoing=cur(bb, 5), startEvent='barbados-republic'),
    ], memberOf=[
        member('british-empire', L(bb, 'In 1627, the first permanent settlers', 1627), est(bb, 2), sources=[lead(bb, 'In 1627, the first permanent settlers')],
               startEvent='barbados-settled', endEvent='barbados-independence'),
        in_windward(ec=ev_claim(bwi, 2), endEvent='barbados-leaves-windward'),
        in_wif([G.ref(bb, 'infobox established_event1: Part of the West Indies Federation, 03 January 1958 – 31 May 1962')]),
    ]))
    bah, bbh = 'The Bahamas', 'British Bahamas'
    T.append(row('bahamas', 'Bahamas', '#2a9aaa', CB, bah, phases=[
        phase('British Bahamas', F(bbh, 'seg0.start', 'start'), F(bbh, 'seg0.end', 'end'), startEvent='eleutheran-adventurers',
              endEvent='bahamas-independence'),
        phase('Commonwealth of The Bahamas', est(bah, 1), ongoing=cur(bah, 1), startEvent='bahamas-independence'),
    ], memberOf=[member('british-empire', F(bbh, 'seg0.start', 'start'), F(bbh, 'seg0.end', 'end'),
                        sources=[lead(bah, 'crown colony of the Kingdom of Great Britain in 1718')],
                        startEvent='eleutheran-adventurers', endEvent='bahamas-independence')]))
    tt = 'Trinidad and Tobago'
    T.append(row('trinidad-and-tobago', 'Trinidad and Tobago', '#c02a3a', CB, tt, phases=[
        phase('British Trinidad', L(tt, 'surrendered the island to a British fleet', 1797), L(tt, 'unified in 1889', 1889),
              startEvent='british-capture-of-trinidad', endEvent='trinidad-and-tobago-unified'),
        phase('Colony of Trinidad and Tobago', L(tt, 'unified in 1889', 1889), est(tt, 2), startEvent='trinidad-and-tobago-unified',
              endEvent='trinidad-and-tobago-independence'),
        phase('Dominion of Trinidad and Tobago', est(tt, 2), est(tt, 4), startEvent='trinidad-and-tobago-independence', endEvent='trinidad-and-tobago-republic'),
        phase('Republic of Trinidad and Tobago', est(tt, 4), ongoing=cur(tt, 4), startEvent='trinidad-and-tobago-republic'),
    ], memberOf=[
        member('british-empire', L(tt, 'surrendered the island to a British fleet', 1797), est(tt, 2), sources=[lead(tt, 'ceded to Britain in 1802')],
               startEvent='british-capture-of-trinidad', endEvent='trinidad-and-tobago-independence'),
        in_wif([G.ref(tt, 'infobox established_event1: Province of the West Indies Federation, 3 January 1958 – 14 January 1962')]),
    ]))
    ab = 'Antigua and Barbuda'
    T.append(row('antigua-and-barbuda', 'Antigua and Barbuda', '#c0402a', CB, ab, phases=[
        phase('Colony of Antigua', L(ab, 'Antigua remained uncolonised until 1632', 1632), est(ab, 3), startEvent='antigua-colonised',
              endEvent='associated-statehood-1967'),
        phase('Associated State', est(ab, 3), est(ab, 4), startEvent='associated-statehood-1967', endEvent='antigua-independence'),
        phase('Antigua and Barbuda', est(ab, 4), ongoing=cur(ab, 4), startEvent='antigua-independence'),
    ], memberOf=[
        member('british-empire', L(ab, 'Antigua remained uncolonised until 1632', 1632), est(ab, 4), sources=[lead(ab, 'first successful British colony')],
               startEvent='antigua-colonised', endEvent='antigua-independence'),
        member('british-leeward-islands', F(bli, 'seg0.start', 'start'), F(bli, 'seg0.end', 'end'), sources=lw_src, endEvent='leeward-islands-divided'),
        member('british-leeward-islands', F(bli, 'seg1.start', 'start'), ev_claim(bli, 6), sources=lw_src,
               startEvent='leeward-islands-reformed', endEvent='wif-founded'),
        in_wif(),
    ]))
    scna, skn = 'Saint Christopher-Nevis-Anguilla', 'Saint Kitts and Nevis'
    T.append(row('saint-kitts-and-nevis', 'Saint Kitts and Nevis', '#3a8a3a', CB, skn, phases=[
        phase('Saint Christopher-Nevis-Anguilla', S1(scna), est(skn, 1), endEvent='associated-statehood-1967'),
        phase('Associated State', est(skn, 1), est(skn, 2), startEvent='associated-statehood-1967', endEvent='saint-kitts-independence'),
        phase('Saint Kitts and Nevis', est(skn, 2), ongoing=cur(skn, 2), startEvent='saint-kitts-independence'),
    ], memberOf=[
        member('british-empire', S1(scna), est(skn, 2), sources=[lead(skn, 'most recent British territory in the Caribbean to become independent')],
               endEvent='saint-kitts-independence'),
        member('british-leeward-islands', S1(scna), ev_claim(bli, 6), sources=lw_src, endEvent='wif-founded'),
        in_wif(),
    ]))
    lu = 'Saint Lucia'
    T.append(row('saint-lucia', 'Saint Lucia', '#4a9ac0', CB, lu, phases=[
        # HAND: French and British rule alternated until 1814; the lead dates no single changeover, so one phase without a membership
        phase('Contested between France and Britain', L(lu, 'treaty with the native Caribs in 1660', 1660), L(lu, 'complete control in 1814', 1814),
              endEvent='british-control-of-saint-lucia'),
        phase('British Saint Lucia', L(lu, 'complete control in 1814', 1814), est(lu, 1), startEvent='british-control-of-saint-lucia',
              endEvent='associated-statehood-1967'),
        phase('Associated State', est(lu, 1), est(lu, 2), startEvent='associated-statehood-1967', endEvent='saint-lucia-independence'),
        phase('Saint Lucia', est(lu, 2), ongoing=cur(lu, 2), startEvent='saint-lucia-independence'),
    ], memberOf=[
        member('british-empire', L(lu, 'complete control in 1814', 1814), est(lu, 2), sources=[lead(lu, 'complete control in 1814')],
               startEvent='british-control-of-saint-lucia', endEvent='saint-lucia-independence'),
        in_windward(),
        in_wif([lead(lu, 'member of the West Indies Federation')]),
    ]))
    vc = 'Saint Vincent and the Grenadines'
    T.append(row('saint-vincent-and-the-grenadines', 'Saint Vincent and the Grenadines', '#3a9a5a', CB, vc, phases=[
        phase('Colony of Saint Vincent', L(vc, 'colony of the British Empire from 1783', 1783), est(vc, 1), endEvent='svg-associated-state'),
        phase('Associated State', est(vc, 1), est(vc, 2), startEvent='svg-associated-state', endEvent='svg-independence'),
        phase('Saint Vincent and the Grenadines', est(vc, 2), ongoing=cur(vc, 2), startEvent='svg-independence'),
    ], memberOf=[
        member('british-empire', L(vc, 'colony of the British Empire from 1783', 1783), est(vc, 2), sources=[lead(vc, 'colony of the British Empire from 1783')],
               endEvent='svg-independence'),
        in_windward(),
        in_wif(),
    ]))
    gd = 'Grenada'
    T.append(row('grenada', 'Grenada', '#c0302a', CB, gd, phases=[
        phase('French Grenada', L(gd, 'French settlement and colonisation began in 1649', 1649), L(gd, 'ceded to the British under the Treaty of Paris', 1763),
              startEvent='french-settlement-of-grenada', endEvent='treaty-of-paris-1763'),
        phase('British Grenada', L(gd, 'ceded to the British under the Treaty of Paris', 1763), est(gd, 1), startEvent='treaty-of-paris-1763',
              endEvent='associated-statehood-1967'),
        # the French held the island again for four years: a rival phase
        phase('French occupation', L(gd, 'brief French takeover between 1779 and 1783', 1779), L(gd, 'brief French takeover between 1779 and 1783', 1783),
              startEvent='french-takeover-of-grenada', endEvent='french-takeover-of-grenada'),
        phase('Associated State', est(gd, 1), est(gd, 2), startEvent='associated-statehood-1967', endEvent='grenada-independence'),
        phase('Independent Grenada', est(gd, 2), est(gd, 3), startEvent='grenada-independence', endEvent='grenada-revolution'),
        phase("People's Revolutionary Government", est(gd, 3), est(gd, 4), startEvent='grenada-revolution', endEvent='grenada-constitution-restored'),
        phase('Constitutional government (restored)', est(gd, 4), ongoing=cur(gd, 4), startEvent='grenada-constitution-restored'),
    ], memberOf=[
        member('french-colonial-empire', L(gd, 'French settlement and colonisation began in 1649', 1649), L(gd, 'ceded to the British under the Treaty of Paris', 1763),
               sources=[lead(gd, 'French settlement and colonisation began in 1649')], startEvent='french-settlement-of-grenada', endEvent='treaty-of-paris-1763'),
        member('british-empire', L(gd, 'ceded to the British under the Treaty of Paris', 1763), est(gd, 2), sources=[lead(gd, 'British rule continued until 1974')],
               startEvent='treaty-of-paris-1763', endEvent='grenada-independence'),
        member('french-colonial-empire', L(gd, 'brief French takeover between 1779 and 1783', 1779), L(gd, 'brief French takeover between 1779 and 1783', 1783),
               sources=[lead(gd, 'brief French takeover between 1779 and 1783')], startEvent='french-takeover-of-grenada', endEvent='french-takeover-of-grenada'),
        in_windward(),
        in_wif([lead(gd, 'Grenada was part of the Federation of the West Indies')]),
    ]))
    dm = 'Dominica'
    T.append(row('dominica', 'Dominica', '#2a7a4a', CB, dm, phases=[
        phase('French Dominica', L(dm, 'by the French from 1690 to 1763', 1690), L(dm, 'by the French from 1690 to 1763', 1763),
              startEvent='french-colonisation-of-dominica', endEvent='treaty-of-paris-1763'),
        phase('British Dominica', L(dm, 'Great Britain took possession in 1763', 1763), est(dm, 1), startEvent='treaty-of-paris-1763',
              endEvent='associated-statehood-1967'),
        phase('Associated State', est(dm, 1), est(dm, 2), startEvent='associated-statehood-1967', endEvent='dominica-independence'),
        phase('Commonwealth of Dominica', est(dm, 2), ongoing=cur(dm, 2), startEvent='dominica-independence'),
    ], memberOf=[
        member('french-colonial-empire', L(dm, 'by the French from 1690 to 1763', 1690), L(dm, 'by the French from 1690 to 1763', 1763),
               sources=[lead(dm, 'by the French from 1690 to 1763')], startEvent='french-colonisation-of-dominica', endEvent='treaty-of-paris-1763'),
        member('british-empire', L(dm, 'Great Britain took possession in 1763', 1763), est(dm, 2), sources=[lead(dm, 'Great Britain took possession in 1763')],
               startEvent='treaty-of-paris-1763', endEvent='dominica-independence'),
        member('british-leeward-islands', ev_claim(bli, 4), ev_claim(bli, 5), sources=[G.ref(bli, 'infobox event4: Dominica joined, 1871')],
               startEvent='dominica-joins-leeward-islands', endEvent='dominica-moves-to-windward-islands'),
        in_windward(sc=ev_claim(bwi, 4), startEvent='dominica-moves-to-windward-islands'),
        in_wif(),
    ]))

    # ================= South America: colonial units and unions =================
    vp, vng, vrp = 'Viceroyalty of Peru', 'Viceroyalty of New Granada', 'Viceroyalty of the Río de la Plata'
    T.append(row('viceroyalty-of-peru', 'Viceroyalty of Peru', '#b08a2a', SA, vp,
                 span_=life(vp, startEvent='viceroyalty-of-peru-created', endEvent='battle-of-ayacucho'),
                 memberOf=[member('spanish-empire', S1(vp), E1(vp), sources=[lead(vp, 'most of the Spanish Empire in South America')],
                                  startEvent='viceroyalty-of-peru-created', endEvent='battle-of-ayacucho')]))
    vng_src = [lead(vng, 'jurisdiction of the Spanish')]
    T.append(row('viceroyalty-of-new-granada', 'Viceroyalty of New Granada', '#a07a3a', SA, vng,
                 # suppressed 1723–39 and again by the independence movement from 1810 until the reconquest of 1816
                 span_=span(stretch(None, S1(vng), ev_claim(vng, 1), startEvent='viceroyalty-of-new-granada-created'),
                            stretch(None, ev_claim(vng, 2), ev_claim(vng, 4), endEvent='colombian-independence'),
                            stretch(None, ev_claim(vng, 5), E1(vng), startEvent='spanish-reconquest-of-new-granada', endEvent='battle-of-pichincha')),
                 memberOf=[member('spanish-empire', S1(vng), ev_claim(vng, 1), sources=vng_src, startEvent='viceroyalty-of-new-granada-created'),
                           member('spanish-empire', ev_claim(vng, 2), ev_claim(vng, 4), sources=vng_src, endEvent='colombian-independence'),
                           member('spanish-empire', ev_claim(vng, 5), E1(vng), sources=vng_src, startEvent='spanish-reconquest-of-new-granada',
                                  endEvent='battle-of-pichincha')]))
    T.append(row('viceroyalty-of-the-rio-de-la-plata', 'Viceroyalty of the Río de la Plata', '#9a8a4a', SA, vrp, span_=span(stretch(
        None, S1(vrp), E1(vrp) + [dict(c, note='Montevideo, the last royalist stronghold, fell in 1814; the viceroyalty was formally abolished in 1825.')
                                for c in ev_claim(vrp, 4)],
        startEvent='viceroyalty-of-the-rio-de-la-plata-created')),
        memberOf=[member('spanish-empire', S1(vrp), E1(vrp), sources=[lead(vrp, 'It was established in 1776')],
                         startEvent='viceroyalty-of-the-rio-de-la-plata-created')]))
    T.append(row('gran-colombia', 'Gran Colombia', '#d0a020', SA, gc, span_=life(gc, startEvent='gran-colombia-founded', endEvent='dissolution-of-gran-colombia')))
    pbc, npe, spe = 'Peru–Bolivian Confederation', 'Republic of North Peru', 'Republic of South Peru'
    T.append(row('peru-bolivian-confederation', 'Peru–Bolivian Confederation', '#a05a5a', SA, pbc,
                 span_=life(pbc, startEvent='peru-bolivian-confederation-formed', endEvent='battle-of-yungay')))
    ukpba = 'United Kingdom of Portugal, Brazil and the Algarves'
    T.append(row('united-kingdom-of-portugal-brazil-and-the-algarves', 'United Kingdom of Portugal, Brazil and the Algarves', '#3a8a5a', SA, ukpba,
                 span_=span(stretch(None, F(ukpba, 'seg0.start', 'start'), F(ukpba, 'seg0.end', 'end'), startEvent='uk-pba-founded',
                                    endEvent='brazilian-independence-recognised'))))
    rgr, jr, acre = 'Riograndense Republic', 'Juliana Republic', 'Republic of Acre'
    T.append(row('riograndense-republic', 'Riograndense Republic', '#3a7a3a', SA, rgr,
                 span_=life(rgr, startEvent='ragamuffin-war', endEvent='treaty-of-ponche-verde')))
    T.append(row('juliana-republic', 'Juliana Republic', '#5a8a3a', SA, jr, span_=life(jr, startEvent='juliana-confederation')))
    # three short stretches in the infobox (1899–1900 / 1900 / 1903); the middle one touches the first and is folded into it
    T.append(row('republic-of-acre', 'Republic of Acre', '#6a7a3a', SA, acre,
                 span_=span(stretch(None, F(acre, 'seg0.start', 'start'), F(acre, 'seg1.end', 'end'), startEvent='acre-war'),
                            stretch(None, F(acre, 'seg2.start', 'start'), F(acre, 'seg2.end', 'end'), endEvent='treaty-of-petropolis'))))

    # ================= South America: states =================
    nkg, upng, rng, gcf, usc, co = ('New Kingdom of Granada', 'United Provinces of New Granada', 'Republic of New Granada',
                                    'Granadine Confederation', 'United States of Colombia', 'Colombia')
    T.append(row('colombia', 'Colombia', '#e0b020', SA, co,
                 # 1816–19 (reconquest) and 1819–31 (Gran Colombia) without a government of its own: the lifespan carries it
                 span_=span(stretch(None, S1(nkg), ongoing=cur(co, 5))),
                 phases=[
        phase('New Kingdom of Granada', S1(nkg), E1(nkg)),
        ph('United Provinces of New Granada', upng, startEvent='colombian-independence', endEvent='spanish-reconquest-of-new-granada'),
        ph('Republic of New Granada', rng, startEvent='dissolution-of-gran-colombia', endEvent='granadine-confederation'),
        ph('Granadine Confederation', gcf, startEvent='granadine-confederation', endEvent='rionegro-convention'),
        ph('United States of Colombia', usc, startEvent='rionegro-convention', endEvent='colombia-constitution-1886'),
        phase('Republic of Colombia', S1(usc, 'year_end'), ongoing=cur(co, 5), startEvent='colombia-constitution-1886'),
    ], memberOf=[
        member('spanish-empire', S1(nkg), est(co, 3), sources=[G.ref(nkg, 'infobox former country: New Kingdom of Granada, 1550–1821')],
               endEvent='battle-of-boyaca'),
        member('gran-colombia', S1(gc), E1(gc), sources=[lead(gc, 'successor states of Colombia, Ecuador, and Venezuela')],
               startEvent='gran-colombia-founded', endEvent='dissolution-of-gran-colombia'),
    ]))
    cgv, fv, sv2, tv, stv, usv, ve = ('Captaincy General of Venezuela', 'First Republic of Venezuela', 'Second Republic of Venezuela',
                                      'Third Republic of Venezuela', 'State of Venezuela', 'United States of Venezuela', 'Venezuela')
    T.append(row('venezuela', 'Venezuela', '#c0802a', SA, ve,
                 # inside Gran Colombia 1823–30 without a phase of its own: the lifespan carries it
                 span_=span(stretch(None, S1(cgv), ongoing=cur(ve, 4), startEvent='captaincy-general-of-venezuela-created')),
                 phases=[
        ph('Captaincy General of Venezuela', cgv, startEvent='captaincy-general-of-venezuela-created', endEvent='venezuelan-war-of-independence'),
        # the patriot republics against the royalist captaincy: rival phases
        ph('First Republic', fv, startEvent='venezuelan-independence-declared'),
        ph('Second Republic', sv2, startEvent='admirable-campaign'),
        ph('Third Republic', tv, endEvent='gran-colombia-founded'),
        ph('State of Venezuela', stv, startEvent='venezuela-leaves-gran-colombia', endEvent='federal-war'),
        ph('United States of Venezuela', usv, startEvent='federal-war', endEvent='venezuela-1953'),
        phase('Republic of Venezuela', S1(usv, 'year_end'), est(ve, 4), startEvent='venezuela-1953', endEvent='venezuela-constitution-1999'),
        phase('Bolivarian Republic of Venezuela', est(ve, 4), ongoing=cur(ve, 4), startEvent='venezuela-constitution-1999'),
    ], memberOf=[
        member('spanish-empire', S1(cgv), E1(cgv), sources=[lead(cgv, 'administrative district of colonial Spain')],
               startEvent='captaincy-general-of-venezuela-created', endEvent='venezuelan-war-of-independence'),
        member('gran-colombia', S1(gc), est(ve, 2), sources=[lead(gc, 'successor states of Colombia, Ecuador, and Venezuela')],
               startEvent='gran-colombia-founded', endEvent='venezuela-leaves-gran-colombia'),
    ]))
    raq, ec = 'Real Audiencia of Quito', 'Ecuador'
    T.append(row('ecuador', 'Ecuador', '#e0c030', SA, ec,
                 # inside Gran Colombia 1822–30 without a phase of its own: the lifespan carries it
                 span_=span(stretch(None, S1(raq), ongoing=cur(ec, 6))),
                 phases=[
        phase('Real Audiencia of Quito', F(raq, 'seg0.start', 'start'), F(raq, 'seg0.end', 'end'), endEvent='battle-of-pichincha'),
        phase('Republic of Ecuador', est(ec, 3), ongoing=cur(ec, 6), startEvent='ecuador-leaves-gran-colombia'),
    ], memberOf=[
        member('spanish-empire', F(raq, 'seg0.start', 'start'), F(raq, 'seg0.end', 'end'), sources=[lead(raq, 'created by Royal Decree')],
               endEvent='battle-of-pichincha'),
        member('gran-colombia', est(ec, 2), est(ec, 3), sources=[G.ref(raq, 'infobox event_end: Incorporation into Colombia, 24 May 1822')],
               startEvent='battle-of-pichincha', endEvent='ecuador-leaves-gran-colombia'),
    ]))
    psm, pe = 'Protectorate of San Martín', 'Peru'
    T.append(row('peru', 'Peru', '#d02a2a', SA, pe, phases=[
        ph('Protectorate of San Martín', psm, startEvent='peruvian-independence', endEvent='peruvian-congress-1822'),
        phase('Republic of Peru', E1(psm), S1(spe), startEvent='peruvian-congress-1822'),
        # Peru split in two inside the confederation: parallel phases
        ph('Republic of South Peru', spe, endEvent='battle-of-yungay'),
        ph('Republic of North Peru', npe, startEvent='peru-bolivian-confederation-formed', endEvent='battle-of-yungay'),
        phase('Republic of Peru (restored)', E1(npe), ongoing=cur(pe, 3), startEvent='battle-of-yungay'),
    ], memberOf=[member('peru-bolivian-confederation', S1(pbc), E1(pbc), sources=[lead(pbc, 'North Peru and South Peru had emerged')],
                        startEvent='peru-bolivian-confederation-formed', endEvent='battle-of-yungay')]))
    bo = 'Bolivia'
    T.append(row('bolivia', 'Bolivia', '#3a8a3a', SA, bo, phases=[
        phase('Republic of Bolivia', est(bo, 1), est(bo, 3), startEvent='bolivian-independence', endEvent='bolivia-constitution-2009'),
        phase('Plurinational State of Bolivia', est(bo, 3), ongoing=cur(bo, 3), startEvent='bolivia-constitution-2009'),
    ], memberOf=[member('peru-bolivian-confederation', S1(pbc), E1(pbc), sources=[lead(pbc, 'while he was president')],
                        startEvent='peru-bolivian-confederation-formed', endEvent='battle-of-yungay')]))
    of, nfl, org, conr, libr, parl, pres, mdc, cl = (
        'Old Fatherland', 'New Fatherland', 'Organization of the Republic', 'Conservative Republic', 'Liberal Republic',
        'Parliamentary Republic (Chile)', 'Presidential Republic (1925–1973)', 'Military dictatorship of Chile', 'Chile')
    T.append(row('chile', 'Chile', '#2a4ab0', SA, cl, phases=[
        ph('Patria Vieja', of, startEvent='first-government-junta-chile', endEvent='spanish-reconquest-of-chile'),
        # "Captaincy General of Chile" is flagged for AI-generated text: the neighbouring articles date the reconquest
        phase('Spanish Reconquest', E1(of), S1(nfl), startEvent='spanish-reconquest-of-chile', endEvent='battle-of-chacabuco'),
        ph('Patria Nueva', nfl, startEvent='battle-of-chacabuco'),
        ph('Organization of the Republic', org),
        ph('Conservative Republic', conr, startEvent='battle-of-lircay'),
        ph('Liberal Republic', libr, endEvent='chilean-civil-war-1891'),
        ph('Parliamentary Republic', parl, startEvent='chilean-civil-war-1891', endEvent='chile-constitution-1925'),
        ph('Presidential Republic', pres, startEvent='chile-constitution-1925', endEvent='chilean-coup-1973'),
        ph('Military dictatorship', mdc, startEvent='chilean-coup-1973', endEvent='chile-transition-1990'),
        phase('Republic of Chile', S1(mdc, 'year_end'), ongoing=cur(cl, 4), startEvent='chile-transition-1990'),
    ], memberOf=[member('spanish-empire', E1(of), S1(nfl), sources=[G.ref(of, 'infobox event_end: Disestablished, 2 October 1814')],
                        startEvent='spanish-reconquest-of-chile', endEvent='battle-of-chacabuco')]))
    up, ac, sba, nrp, ar = ('United Provinces of the Río de la Plata', 'Argentine Confederation', 'State of Buenos Aires',
                            'National Reorganization Process', 'Argentina')
    T.append(row('argentina', 'Argentina', '#5aa0d0', SA, ar, phases=[
        ph('United Provinces of the Río de la Plata', up, startEvent='may-revolution', endEvent='federal-pact-1831'),
        ph('Argentine Confederation', ac, startEvent='federal-pact-1831', endEvent='battle-of-pavon'),
        # Buenos Aires seceded from the Confederation: a rival phase
        ph('State of Buenos Aires', sba, startEvent='buenos-aires-secession', endEvent='battle-of-pavon'),
        phase('Argentine Republic', F(ac, 'date_post', 'start'), S1(nrp), startEvent='battle-of-pavon', endEvent='argentine-coup-1976'),
        ph('National Reorganization Process', nrp, startEvent='argentine-coup-1976', endEvent='argentine-democracy-1983'),
        phase('Argentine Republic (democracy restored)', S1(nrp, 'year_end'), ongoing=cur(ar, 3), startEvent='argentine-democracy-1983'),
    ]))
    gop, py = 'Governorate of Paraguay', 'Paraguay'
    T.append(row('paraguay', 'Paraguay', '#c04a3a', SA, py,
                 # an intendancy of the Río de la Plata viceroyalty 1782–1811, without a phase of its own
                 span_=span(stretch(None, S1(gop), ongoing=cur(py, 3))),
                 phases=[
        ph('Governorate of Paraguay', gop, endEvent='paraguay-joins-viceroyalty'),
        phase('Republic of Paraguay', est(py, 1), ongoing=cur(py, 3), startEvent='paraguayan-independence'),
    ], memberOf=[
        member('spanish-empire', S1(gop), est(py, 1), sources=[lead(py, 'Governorate of the Río de la Plata within the Spanish Empire')],
               endEvent='paraguayan-independence'),
        member('viceroyalty-of-the-rio-de-la-plata', E1(gop), est(py, 1), sources=[G.ref(gop, 'infobox event_end: Added to the new Viceroyalty of the Río de la Plata, 1782')],
               startEvent='paraguay-joins-viceroyalty', endEvent='paraguayan-independence'),
    ]))
    cis, uy, eb, br = 'Cisplatina', 'Uruguay', 'Empire of Brazil', 'Brazil'
    T.append(row('uruguay', 'Uruguay', '#4a7ac0', SA, uy, phases=[
        phase('Cisplatina', F(cis, 'seg0.start', 'start'), F(cis, 'seg0.end', 'end'), startEvent='cisplatina-annexed', endEvent='treaty-of-montevideo-1828'),
        phase('Oriental Republic of Uruguay', est(uy, 2), ongoing=cur(uy, 3), startEvent='treaty-of-montevideo-1828'),
    ], memberOf=[
        member('united-kingdom-of-portugal-brazil-and-the-algarves', F(cis, 'seg0.start', 'start'), est(br, 1),
               sources=[G.ref(cis, 'infobox event_start: Annexed to the U.K. of Portugal, Brazil and the Algarves, 1817')],
               startEvent='cisplatina-annexed', endEvent='brazilian-independence'),
        member('brazil', est(br, 1), F(cis, 'seg0.end', 'end'), sources=[lead(eb, 'until the latter achieved independence in 1828')],
               startEvent='brazilian-independence', endEvent='treaty-of-montevideo-1828'),
    ]))
    cb, db, kb, fbr, fbr4, mdb = ('Colonial Brazil', 'Dutch Brazil', 'Kingdom of Brazil', 'First Brazilian Republic', 'Fourth Brazilian Republic',
                                  'Military dictatorship in Brazil')
    T.append(row('brazil', 'Brazil', '#2a9a4a', SA, br, phases=[
        ph('Colonial Brazil', cb, startEvent='portuguese-arrival-in-brazil', endEvent='uk-pba-founded'),
        # the Dutch West India Company held the north-east: a rival phase
        phase('Dutch Brazil', F(db, 'seg0.start', 'start'), F(db, 'seg0.end', 'end'), startEvent='dutch-brazil-founded', endEvent='dutch-surrender-in-brazil'),
        phase('Kingdom of Brazil', F(kb, 'seg0.start', 'start'), F(kb, 'seg0.end', 'end'), startEvent='uk-pba-founded', endEvent='brazilian-independence'),
        ph('Empire of Brazil', eb, startEvent='brazilian-independence', endEvent='proclamation-of-the-republic'),
        ph('First Republic', fbr, startEvent='proclamation-of-the-republic', endEvent='revolution-of-1930'),
        phase('Vargas era', E1(fbr), S1(fbr4), startEvent='revolution-of-1930'),
        ph('Fourth Republic', fbr4, endEvent='brazilian-coup-1964'),
        ph('Military dictatorship', mdb, startEvent='brazilian-coup-1964', endEvent='brazil-democracy-1985'),
        phase('New Republic', S1(mdb, 'year_end'), ongoing=cur(br, 4), startEvent='brazil-democracy-1985'),
    ], memberOf=[
        member('portuguese-empire', S1(cb), E1(cb), sources=[lead(cb, 'sometimes referred to as Portuguese America')],
               startEvent='portuguese-arrival-in-brazil', endEvent='uk-pba-founded'),
        member('dutch-empire', F(db, 'seg0.start', 'start'), F(db, 'seg0.end', 'end'), sources=[lead(db, 'colony of the Dutch Republic')],
               startEvent='dutch-brazil-founded', endEvent='dutch-surrender-in-brazil'),
        member('united-kingdom-of-portugal-brazil-and-the-algarves', F(kb, 'seg0.start', 'start'), est(br, 1),
               sources=[lead(ukpba, 'formed in 1815')], startEvent='uk-pba-founded', endEvent='brazilian-independence'),
    ]))
    bg, gy = 'British Guiana', 'Guyana'
    T.append(row('guyana', 'Guyana', '#3a9a3a', SA, gy,
                 # 1815–31: British-held colonies of Demerara-Essequibo and Berbice, without a phase here
                 span_=span(stretch(None, est(gy, 1), ongoing=cur(gy, 5))),
                 phases=[
        phase('Dutch colonies (Essequibo, Demerara, Berbice)', est(gy, 1), est_last(gy, 1)),
        ph('British Guiana', bg, startEvent='british-guiana-formed', endEvent='guyana-independence'),
        phase('Dominion of Guyana', est(gy, 3), est(gy, 4), startEvent='guyana-independence', endEvent='guyana-republic'),
        phase('Co-operative Republic of Guyana', est(gy, 4), ongoing=cur(gy, 5), startEvent='guyana-republic'),
    ], memberOf=[
        member('dutch-empire', est(gy, 1), est_last(gy, 1), sources=[G.ref(gy, 'infobox established_event1: Dutch control, 1616–1815')]),
        member('british-empire', S1(bg), E1(bg), sources=[G.ref(gy, 'infobox established_event2: British Guiana, 1831–1966')],
               startEvent='british-guiana-formed', endEvent='guyana-independence'),
    ]))
    su, sr = 'Surinam (Dutch colony)', 'Suriname'
    T.append(row('suriname', 'Suriname', '#3a7a4a', SA, sr, phases=[
        phase('Colony of Surinam', F(su, 'seg0.start', 'start'), F(su, 'seg0.end', 'end'), startEvent='capture-of-surinam', endEvent='charter-for-the-kingdom'),
        phase('Constituent country of the Kingdom of the Netherlands', est(sr, 1), est(sr, 2), startEvent='charter-for-the-kingdom',
              endEvent='suriname-independence'),
        phase('Republic of Suriname', est(sr, 2), ongoing=cur(sr, 2), startEvent='suriname-independence'),
    ], memberOf=[
        # the Dutch Empire row ends with Suriname's independence (colonial.py), so the membership runs to 1975
        member('dutch-empire', F(su, 'seg0.start', 'start'), est(sr, 2), sources=[lead(sr, 'Under Dutch rule, Suriname')],
               startEvent='capture-of-surinam', endEvent='suriname-independence'),
    ]))
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

    def rng(uuid, title, article, k, tracks, **kw):
        """An event dated by a range in an established_dateN field."""
        s = F(article, f'established_date{k}', 'start')[0]
        e = F(article, f'established_date{k}:last', 'end')[0]
        if e['year'] != s['year']:
            kw.setdefault('end', e['year'])
        return ev(uuid, title, s['year'], tracks, s['source'], **kw)

    def ongoing(e):
        """A war still going (its infobox date ends "present")."""
        e['ongoing'] = True
        e.pop('end', None)
        return e

    aztecs = ['aztec-empire', 'tenochtitlan', 'tetzcoco', 'tlacopan']
    frca = 'Federal Republic of Central America'
    ca5 = ['guatemala', 'el-salvador', 'honduras', 'nicaragua', 'costa-rica']
    wif = ['west-indies-federation', 'jamaica', 'trinidad-and-tobago', 'barbados', 'antigua-and-barbuda', 'saint-kitts-and-nevis',
           'saint-lucia', 'saint-vincent-and-the-grenadines', 'grenada', 'dominica']
    return [
        # ---------- pre-Columbian states and the Spanish conquests ----------
        fev('triple-alliance-formed', 'Triple Alliance formed', 'Aztec Empire', 'year_start', aztecs, importance=1,
            descr='Tenochtitlan, Tetzcoco and Tlacopan form the alliance that rules the Valley of Mexico.'),
        wev('spanish-conquest-of-the-aztec-empire', 'Spanish conquest of the Aztec Empire', 'Spanish conquest of the Aztec Empire',
            aztecs + ['tlaxcala-nahua-state', 'spanish-empire'], importance=1,
            descr='Cortés and his Indigenous allies, Tlaxcala first among them, overthrow the Triple Alliance.'),
        iev('purepecha-conquered', 'Purépecha Empire conquered', 'Purépecha Empire', 'end', ['purepecha-empire', 'mexico', 'spanish-empire'],
            descr='The Purépecha state loses its independence to New Spain.'),
        wev('spanish-conquest-of-guatemala', 'Spanish conquest of Guatemala', 'Spanish conquest of Guatemala',
            ['kiche-kingdom-of-qumarkaj', 'captaincy-general-of-guatemala', 'spanish-empire'], importance=1,
            descr='Pedro de Alvarado subjugates the highland Kʼicheʼ and Kaqchikel kingdoms.'),
        wev('spanish-conquest-of-peten', 'Spanish conquest of Petén', 'Spanish conquest of Petén', ['peten-itza-kingdom', 'spanish-empire'],
            descr='Ends with the fall of the Itza capital Nojpetén in 1697.'),
        wev('spanish-conquest-of-the-muisca', 'Spanish conquest of the Muisca', 'Spanish conquest of the Muisca', ['muisca-confederation', 'spanish-empire'],
            importance=1),
        iev('inca-civil-war', 'Inca Civil War', 'Inca Empire', 1, ['inca-empire'], end=1532,
            descr='Huáscar and Atahualpa fight for the throne on the eve of the Spanish arrival.'),
        wev('battle-of-cajamarca', 'Battle of Cajamarca', 'Battle of Cajamarca', ['inca-empire', 'spanish-empire'], importance=1,
            descr='Pizarro captures Atahualpa.'),
        wev('spanish-conquest-of-the-inca-empire', 'Spanish conquest of the Inca Empire', 'Spanish conquest of the Inca Empire',
            ['inca-empire', 'spanish-empire', 'viceroyalty-of-peru'], importance=1),
        wev('siege-of-cuzco', 'Siege of Cuzco', 'Siege of Cuzco', ['inca-empire'],
            descr='Manco Inca fails to retake Cusco and withdraws to Vilcabamba.'),
        iev('fall-of-vilcabamba', 'Fall of Vilcabamba', 'Viceroyalty of Peru', 1, ['inca-empire', 'viceroyalty-of-peru'],
            descr='The last Inca state falls to the viceroy Francisco de Toledo.'),

        # ---------- New France, Canada and Newfoundland ----------
        fev('cartier-voyage', "Cartier's first voyage", 'New France', 'year_start', ['new-france', 'french-colonial-empire'],
            descr='Jacques Cartier explores the Gulf of Saint Lawrence and claims it for France.'),
        iev('new-france-royal-province', 'New France becomes a royal province', 'New France', 1, ['new-france']),
        wev('treaty-of-utrecht', 'Treaty of Utrecht', 'Treaty of Utrecht', ['new-france', 'british-empire', 'french-colonial-empire'],
            descr='France cedes Acadia, Hudson Bay and Newfoundland to Great Britain.'),
        wev('french-and-indian-war', 'French and Indian War', 'French and Indian War',
            ['new-france', 'united-states', 'british-empire', 'french-colonial-empire'], importance=1),
        wev('battle-of-the-plains-of-abraham', 'Battle of the Plains of Abraham', 'Battle of the Plains of Abraham', ['new-france', 'british-empire']),
        wev('treaty-of-paris-1763', 'Treaty of Paris (1763)', 'Treaty of Paris (1763)',
            ['new-france', 'canada', 'united-states', 'grenada', 'dominica', 'british-empire', 'french-colonial-empire', 'spanish-empire'], importance=1,
            descr='France cedes New France; Spain cedes Florida to Britain.'),
        fev('constitutional-act-1791', 'Constitutional Act', 'Province of Quebec (1763–1791)', 'year_end', ['canada'],
            descr='Quebec is split into Upper and Lower Canada.'),
        wev('rebellions-of-1837', 'Rebellions of 1837–1838', 'Rebellions of 1837–1838', ['canada']),
        fev('act-of-union-1840', 'Act of Union', 'Province of Canada', 'year_start', ['canada'], descr='Upper and Lower Canada unite as the Province of Canada.'),
        fev('canadian-confederation', 'Canadian Confederation', 'Canada', 'established_date1', ['canada', 'british-empire'], importance=1),
        fev('newfoundland-dominion', 'Dominion of Newfoundland', 'Dominion of Newfoundland', 'year_start', ['newfoundland']),
        fev('statute-of-westminster', 'Statute of Westminster', 'Canada', 'established_date3', ['canada', 'british-empire']),
        fev('newfoundland-joins-canada', 'Newfoundland joins Canada', 'Dominion of Newfoundland', 'year_end', ['newfoundland', 'canada'], importance=1),
        fev('patriation', 'Patriation of the constitution', 'Canada', 'established_date4', ['canada']),

        # ---------- the United States ----------
        iev('st-augustine', 'St. Augustine founded', 'Spanish Florida', 4, ['united-states', 'spanish-empire']),
        fev('jamestown', 'Jamestown founded', 'Thirteen Colonies', 'year_start', ['united-states', 'british-empire'],
            descr='The Virginia Colony, the first of the Thirteen Colonies.'),
        fev('new-netherland-captured', 'English capture of New Amsterdam', 'New Netherland', 'established_date2',
            ['united-states', 'dutch-empire', 'british-empire']),
        wev('treaty-of-breda-1667', 'Treaty of Breda', 'Treaty of Breda (1667)', ['united-states', 'suriname', 'dutch-empire', 'british-empire'],
            descr='The Dutch keep Surinam; New Netherland passes to England.'),
        fev('dutch-conquest-of-new-sweden', 'Dutch conquest of New Sweden', 'New Sweden', 'year_end', ['united-states', 'sweden', 'dutch-empire']),
        wev('american-revolutionary-war', 'American Revolutionary War', 'American Revolutionary War',
            ['united-states', 'british-empire', 'united-kingdom', 'france'], importance=1),
        fev('us-declaration-of-independence', 'Declaration of Independence', 'United States', 'established_date1', ['united-states', 'british-empire'],
            importance=1),
        fev('articles-of-confederation', 'Articles of Confederation', 'United States', 'established_date2', ['united-states']),
        wev('treaty-of-paris-1783', 'Treaty of Paris (1783)', 'Treaty of Paris (1783)', ['united-states', 'united-kingdom', 'british-empire'],
            descr='Britain recognizes the independence of the United States.'),
        fev('us-constitution', 'Constitution takes effect', 'United States', 'established_date4', ['united-states']),
        fev('vermont-admitted', 'Vermont joins the Union', 'Vermont Republic', 'year_end', ['vermont-republic', 'united-states']),
        lev('louisiana-purchase', 'Louisiana Purchase', 'New France', 'Louisiana Purchase of 1803', 1803, ['united-states', 'france']),
        wev('war-of-1812', 'War of 1812', 'War of 1812', ['united-states', 'canada', 'united-kingdom', 'british-empire']),
        wev('adams-onis-treaty', 'Adams–Onís Treaty', 'Adams–Onís Treaty', ['united-states', 'spanish-empire'], descr='Spain cedes Florida.'),
        fev('muskogee-declared', 'State of Muskogee declared', 'State of Muskogee', 'year_start', ['state-of-muskogee']),
        fev('capture-of-bowles', 'Capture of William Bowles', 'State of Muskogee', 'year_end', ['state-of-muskogee']),
        fev('indian-stream-independence', 'Indian Stream declares independence', 'Republic of Indian Stream', 'year_start', ['republic-of-indian-stream']),
        wev('texas-revolution', 'Texas Revolution', 'Texas Revolution', ['republic-of-texas', 'mexico'], importance=1),
        iev('texas-annexation', 'Annexation of Texas', 'Republic of Texas', 1, ['republic-of-texas', 'united-states']),
        fev('california-independence', 'California Republic declared', 'California Republic', 'year_start', ['california-republic', 'mexico']),
        wev('treaty-of-guadalupe-hidalgo', 'Treaty of Guadalupe Hidalgo', 'Treaty of Guadalupe Hidalgo', ['mexico', 'united-states'], importance=1,
            descr='Mexico cedes its northern territories to the United States.'),
        wev('american-civil-war', 'American Civil War', 'American Civil War', ['united-states', 'confederate-states-of-america'], importance=1),
        iev('appomattox', 'Battle of Appomattox Court House', 'Confederate States of America', 4, ['confederate-states-of-america', 'united-states'],
            descr="Lee's surrender."),
        wev('alaska-purchase', 'Alaska Purchase', 'Alaska Purchase', ['united-states', 'russia']),
        wev('treaty-of-paris-1898', 'Treaty of Paris (1898)', 'Treaty of Paris (1898)', ['united-states', 'cuba', 'spain', 'spanish-empire'],
            descr='Spain gives up Cuba.'),

        # ---------- Mexico (row in colonial.py) and its breakaway republics ----------
        fev('rio-grande-convention', 'Republic of the Rio Grande declared', 'Republic of the Rio Grande', 'year_start', ['republic-of-the-rio-grande', 'mexico']),
        iev('rio-grande-surrender', 'Surrender of Antonio Canales', 'Republic of the Rio Grande', 'end', ['republic-of-the-rio-grande']),
        wev('pastry-war', 'Pastry War', 'Pastry War', ['mexico', 'france']),
        fev('yucatan-independence', 'Yucatán declares independence', 'Republic of Yucatán', 'year_start', ['republic-of-yucatan', 'mexico']),
        # HAND: the infobox gives 1847–1915 with skirmishes until 1933; the war's end is taken as 1915
        wev('caste-war-of-yucatan', 'Caste War of Yucatán', 'Caste War of Yucatán', ['mexico', 'republic-of-yucatan'], end=1915),
        wev('war-of-reform', 'Reform War', 'War of Reform', ['mexico']),

        # ---------- Central America ----------
        fev('captaincy-general-of-guatemala-established', 'Captaincy General of Guatemala established', 'Captaincy General of Guatemala', 'year_start',
            ['captaincy-general-of-guatemala', 'spanish-empire']),
        fev('central-american-independence', 'Central American independence', 'Captaincy General of Guatemala', 'year_end',
            ['captaincy-general-of-guatemala', 'spanish-empire'] + ca5, importance=1,
            descr='The provinces of the captaincy declare independence on 15 September 1821.'),
        lev('mexican-annexation-of-central-america', 'Central America annexed by Mexico', frca, 'annexed by the First Mexican Empire in January 1822', 1822,
            ['mexico'] + ca5),
        fev('central-america-leaves-mexico', 'Central America leaves the Mexican Empire', frca, 'year_start', ['federal-republic-of-central-america', 'mexico'] + ca5,
            importance=1, descr='The United Provinces of Central America declare independence on 1 July 1823.'),
        iev('frca-constitution', 'Federal constitution adopted', frca, 1, ['federal-republic-of-central-america']),
        fev('frca-dissolved', 'Federal Republic of Central America dissolved', frca, 'year_end', ['federal-republic-of-central-america', 'los-altos', 'el-salvador'], importance=1),
        fev('nicaragua-leaves-federation', 'Nicaragua leaves the federation', 'Nicaragua', 'established_date3', ['nicaragua', 'federal-republic-of-central-america']),
        fev('honduras-leaves-federation', 'Honduras leaves the federation', 'Honduras', 'established_date3', ['honduras', 'federal-republic-of-central-america']),
        fev('costa-rica-leaves-federation', 'Costa Rica leaves the federation', 'Costa Rica', 'established_date3', ['costa-rica', 'federal-republic-of-central-america']),
        fev('guatemala-leaves-federation', 'Guatemala leaves the federation', 'Guatemala', 'established_date3', ['guatemala', 'federal-republic-of-central-america']),
        fev('el-salvador-leaves-federation', 'El Salvador declares independence', 'El Salvador', 'established_date3', ['el-salvador']),
        fev('los-altos-independence', 'Los Altos secedes from Guatemala', 'Los Altos (state)', 'year_start', ['los-altos', 'guatemala']),
        iev('los-altos-reincorporated', 'Los Altos reincorporated into Guatemala', 'Los Altos (state)', 2, ['los-altos', 'guatemala']),
        fev('costa-rica-republic', 'Republic of Costa Rica proclaimed', 'Free State of Costa Rica', 'year_end', ['costa-rica']),
        wev('filibuster-war', 'Filibuster War', 'Filibuster War', ['nicaragua', 'costa-rica', 'honduras', 'el-salvador', 'guatemala'],
            descr="William Walker's filibusters seize Nicaragua; the Central American states drive them out."),
        lev('mosquito-coast-incorporated', 'Mosquito Coast incorporated into Nicaragua', 'Mosquito Coast', 'militarily incorporated into Nicaragua', 1894,
            ['nicaragua']),
        wev('costa-rican-civil-war', 'Costa Rican Civil War', 'Costa Rican Civil War', ['costa-rica']),
        fev('costa-rica-constitution-1949', 'Costa Rican constitution of 1949', 'Costa Rica', 'established_date5', ['costa-rica'],
            descr='The current constitution, which abolished the army.'),
        wev('guatemalan-coup-1954', "Guatemalan coup d'état", "1954 Guatemalan coup d'état", ['guatemala', 'united-states'], importance=1),
        wev('guatemalan-civil-war', 'Guatemalan Civil War', 'Guatemalan Civil War', ['guatemala'], importance=1),
        wev('nicaraguan-revolution', 'Nicaraguan Revolution', 'Nicaraguan Revolution', ['nicaragua'], importance=1),
        wev('football-war', 'Football War', 'Football War', ['el-salvador', 'honduras']),
        wev('salvadoran-civil-war', 'Salvadoran Civil War', 'Salvadoran Civil War', ['el-salvador'], importance=1),
        fev('treaty-of-versailles-1783', 'Treaty of Versailles', 'British Honduras', 'date_pre', ['belize', 'british-empire', 'spanish-empire'],
            descr='Spain allows British settlers to cut logwood on the coast of Belize.'),
        wev('battle-of-st-georges-caye', "Battle of St. George's Caye", "Battle of St. George's Caye", ['belize', 'british-empire', 'spanish-empire']),
        iev('british-honduras-crown-colony', 'British Honduras becomes a crown colony', 'British Honduras', 1, ['belize']),
        fev('belize-self-government', 'Belize self-governing', 'Belize', 'established_date1', ['belize']),
        fev('belize-independence', 'Belize independent', 'Belize', 'established_date2', ['belize', 'british-empire'], importance=1),
        fev('panama-independence-1821', 'Panama breaks away from Spain', 'Panama', 'established_date1', ['panama', 'spanish-empire']),
        wev('thousand-days-war', "Thousand Days' War", "Thousand Days' War", ['colombia', 'panama']),
        wev('separation-of-panama', 'Separation of Panama from Colombia', 'Separation of Panama from Colombia', ['panama', 'colombia', 'united-states'],
            importance=1),
        ev('panama-canal', 'Panama Canal built', 1904, ['panama', 'united-states'], lead('Panama', 'between 1904 and 1914'), end=1914),
        wev('torrijos-carter-treaties', 'Torrijos–Carter Treaties', 'Torrijos–Carter Treaties', ['panama', 'united-states']),
        wev('us-invasion-of-panama', 'United States invasion of Panama', 'United States invasion of Panama', ['panama', 'united-states']),
        lev('panama-canal-handover', 'Panama Canal handed over to Panama', 'Panama', 'transfer the canal from the United States to Panama on December 31, 1999',
            1999, ['panama', 'united-states']),

        # ---------- Caribbean: Cuba, Haiti, the Dominican Republic ----------
        wev('ten-years-war', "Ten Years' War", "Ten Years' War", ['cuba', 'spanish-empire']),
        wev('cuban-war-of-independence', 'Cuban War of Independence', 'Cuban War of Independence', ['cuba', 'spanish-empire'], importance=1),
        fev('cuban-independence-1902', 'Republic of Cuba proclaimed', 'Cuba', 'established_date4', ['cuba', 'united-states'],
            descr='The US military government hands over on 20 May 1902.'),
        fev('second-occupation-of-cuba', 'Second US occupation of Cuba', 'Provisional Government of Cuba', 'year_start', ['cuba', 'united-states'], end=1909),
        wev('cuban-coup-1952', "Cuban coup d'état", "1952 Cuban coup d'état", ['cuba'], descr='Batista seizes power.'),
        wev('cuban-revolution', 'Cuban Revolution', 'Cuban Revolution', ['cuba'], importance=1),
        wev('bay-of-pigs', 'Bay of Pigs Invasion', 'Bay of Pigs Invasion', ['cuba', 'united-states']),
        wev('cuban-missile-crisis', 'Cuban Missile Crisis', 'Cuban Missile Crisis', ['cuba', 'united-states', 'soviet-union'], importance=1),
        wev('haitian-revolution', 'Haitian Revolution', 'Haitian Revolution', ['haiti', 'france', 'french-colonial-empire'], importance=1),
        wev('battle-of-vertieres', 'Battle of Vertières', 'Battle of Vertières', ['haiti', 'french-colonial-empire'],
            descr='The last French army in Saint-Domingue is defeated.'),
        fev('haitian-independence', 'Haitian independence', 'Haiti', 'established_date1', ['haiti'], importance=1,
            descr='Haiti declares independence on 1 January 1804.'),
        fev('assassination-of-dessalines', 'Assassination of Emperor Jacques I', 'First Empire of Haiti', 'year_end', ['haiti'],
            descr='Haiti splits into a northern state under Christophe and a southern republic under Pétion.'),
        fev('kingdom-of-haiti-proclaimed', 'Kingdom of Haiti proclaimed', 'Kingdom of Haiti', 'year_start', ['haiti']),
        fev('haiti-reunified', 'Haiti reunified', 'Republic of Haiti (1820–1849)', 'year_start', ['haiti']),
        fev('haitian-occupation-of-santo-domingo', 'Haitian occupation of Santo Domingo', 'Haitian occupation of Santo Domingo', 'year_start',
            ['haiti', 'dominican-republic'], importance=1),
        fev('dominican-independence', 'Dominican independence', 'First Dominican Republic', 'year_start', ['dominican-republic', 'haiti'], importance=1),
        wev('dominican-war-of-independence', 'Dominican War of Independence', 'Dominican War of Independence', ['dominican-republic', 'haiti']),
        fev('second-empire-of-haiti', 'Second Empire of Haiti proclaimed', 'Second Empire of Haiti', 'year_start', ['haiti']),
        fev('haitian-republic-1859', 'Haitian republic restored', 'Republic of Haiti (1859–1957)', 'year_start', ['haiti']),
        rng('us-occupation-of-haiti', 'United States occupation of Haiti', 'Haiti', 11, ['haiti', 'united-states'], importance=1),
        fev('duvalier-takes-power', 'Duvalier takes power', 'Republic of Haiti (1859–1957)', 'year_end', ['haiti']),
        wev('peace-of-basel', 'Peace of Basel', 'Peace of Basel', ['dominican-republic', 'spanish-empire', 'french-colonial-empire'],
            descr='Spain cedes Santo Domingo to France.'),
        iev('santo-domingo-returned-to-spain', 'Santo Domingo returned to Spain', 'Captaincy General of Santo Domingo', 2,
            ['dominican-republic', 'spanish-empire', 'french-colonial-empire']),
        fev('spanish-haiti-independence', 'Independence of Spanish Haiti', 'Republic of Spanish Haiti', 'year_start', ['dominican-republic', 'spanish-empire']),
        fev('spanish-annexation-of-the-dominican-republic', 'Spanish annexation of the Dominican Republic', 'Spanish annexation of the Dominican Republic',
            'year_start', ['dominican-republic', 'spanish-empire']),
        wev('dominican-restoration-war', 'Dominican Restoration War', 'Dominican Restoration War', ['dominican-republic', 'spanish-empire'], importance=1),
        fev('us-occupation-of-the-dominican-republic', 'US occupation of the Dominican Republic', 'Military Government of Santo Domingo', 'year_start',
            ['dominican-republic', 'united-states']),
        fev('us-withdrawal-from-santo-domingo', 'US forces withdraw from the Dominican Republic', 'Military Government of Santo Domingo', 'year_end',
            ['dominican-republic', 'united-states']),
        wev('dominican-civil-war', 'Dominican Civil War', 'Dominican Civil War', ['dominican-republic', 'united-states']),

        # ---------- Caribbean: the British and French islands ----------
        wev('invasion-of-jamaica', 'English invasion of Jamaica', 'Invasion of Jamaica', ['jamaica', 'spanish-empire', 'british-empire'], importance=1),
        lev('barbados-settled', 'First English settlers in Barbados', 'Barbados', 'In 1627, the first permanent settlers', 1627, ['barbados', 'british-empire']),
        lev('antigua-colonised', 'English colony on Antigua', 'Antigua and Barbuda', 'Antigua remained uncolonised until 1632', 1632,
            ['antigua-and-barbuda', 'british-empire']),
        lev('eleutheran-adventurers', 'Eleutheran Adventurers settle the Bahamas', 'The Bahamas', 'Eleutheran Adventurers', 1649, ['bahamas']),
        lev('french-settlement-of-grenada', 'French settlement of Grenada', 'Grenada', 'French settlement and colonisation began in 1649', 1649,
            ['grenada', 'french-colonial-empire']),
        lev('saint-lucia-french-treaty', 'French treaty with the Caribs of Saint Lucia', 'Saint Lucia', 'treaty with the native Caribs in 1660', 1660,
            ['saint-lucia', 'french-colonial-empire']),
        fev('leeward-islands-colony', 'Leeward Islands colony formed', 'British Leeward Islands', 'year_start', ['british-leeward-islands', 'british-empire']),
        lev('french-colonisation-of-dominica', 'French colonisation of Dominica', 'Dominica', 'by the French from 1690 to 1763', 1690,
            ['dominica', 'french-colonial-empire']),
        lev('bahamas-crown-colony', 'The Bahamas become a crown colony', 'The Bahamas', 'crown colony of the Kingdom of Great Britain in 1718', 1718,
            ['bahamas', 'british-empire']),
        lev('french-takeover-of-grenada', 'French takeover of Grenada', 'Grenada', 'brief French takeover between 1779 and 1783', 1779,
            ['grenada', 'french-colonial-empire', 'british-empire'], end=1783),
        lev('british-capture-of-trinidad', 'British capture of Trinidad', 'Trinidad and Tobago', 'surrendered the island to a British fleet', 1797,
            ['trinidad-and-tobago', 'spanish-empire', 'british-empire'], importance=1),
        lev('british-control-of-saint-lucia', 'Saint Lucia passes to Britain', 'Saint Lucia', 'complete control in 1814', 1814, ['saint-lucia', 'british-empire']),
        iev('leeward-islands-divided', 'Leeward Islands colony divided', 'British Leeward Islands', 1, ['british-leeward-islands', 'antigua-and-barbuda']),
        iev('leeward-islands-reformed', 'Leeward Islands colony re-formed', 'British Leeward Islands', 2, ['british-leeward-islands', 'antigua-and-barbuda']),
        lev('slavery-abolition-act', 'Slavery Abolition Act', 'Barbados', 'Slavery Abolition Act 1833', 1833, ['british-empire'],
            descr='Slavery is phased out through most of the British Empire.'),
        wev('morant-bay-rebellion', 'Morant Bay rebellion', 'Morant Bay rebellion', ['jamaica']),
        iev('dominica-joins-leeward-islands', 'Dominica joins the Leeward Islands', 'British Leeward Islands', 4, ['dominica', 'british-leeward-islands']),
        fev('saint-christopher-nevis-anguilla', 'Saint Christopher-Nevis-Anguilla formed', 'Saint Christopher-Nevis-Anguilla', 'year_start',
            ['saint-kitts-and-nevis']),
        iev('barbados-leaves-windward', 'Barbados leaves the Windward Islands', 'British Windward Islands', 2, ['barbados', 'british-windward-islands']),
        lev('trinidad-and-tobago-unified', 'Trinidad and Tobago unified', 'Trinidad and Tobago', 'unified in 1889', 1889,
            ['trinidad-and-tobago', 'british-windward-islands']),
        iev('dominica-moves-to-windward-islands', 'Dominica moves to the Windward Islands', 'British Windward Islands', 4,
            ['dominica', 'british-windward-islands', 'british-leeward-islands']),
        fev('wif-founded', 'West Indies Federation founded', 'West Indies Federation', 'year_start', wif + ['british-leeward-islands', 'british-windward-islands'],
            importance=1),
        fev('wif-dissolved', 'West Indies Federation dissolved', 'West Indies Federation', 'year_end', wif),
        fev('jamaican-independence', 'Jamaican independence', 'Jamaica', 'established_date1', ['jamaica', 'british-empire'], importance=1),
        fev('trinidad-and-tobago-independence', 'Trinidad and Tobago independent', 'Trinidad and Tobago', 'established_date2', ['trinidad-and-tobago', 'british-empire'],
            importance=1),
        fev('barbados-independence', 'Barbados independent', 'Barbados', 'established_date2', ['barbados', 'british-empire'], importance=1),
        fev('associated-statehood-1967', 'West Indies Associated States', 'Antigua and Barbuda', 'established_date3',
            ['antigua-and-barbuda', 'saint-kitts-and-nevis', 'saint-lucia', 'grenada', 'dominica', 'british-empire'],
            descr='Antigua, Saint Kitts-Nevis-Anguilla, Saint Lucia, Grenada and Dominica become states in free association with the UK.'),
        fev('svg-associated-state', 'Saint Vincent an associated state', 'Saint Vincent and the Grenadines', 'established_date1', ['saint-vincent-and-the-grenadines']),
        fev('bahamas-independence', 'Bahamas independent', 'The Bahamas', 'established_date1', ['bahamas', 'british-empire'], importance=1),
        fev('grenada-independence', 'Grenada independent', 'Grenada', 'established_date2', ['grenada', 'british-empire'], importance=1),
        fev('trinidad-and-tobago-republic', 'Trinidad and Tobago a republic', 'Trinidad and Tobago', 'established_date4', ['trinidad-and-tobago']),
        fev('dominica-independence', 'Dominica independent', 'Dominica', 'established_date2', ['dominica', 'british-empire'], importance=1),
        wev('grenada-revolution', 'Grenada Revolution', 'Grenada Revolution', ['grenada'], descr='The New JEWEL Movement overthrows Gairy.'),
        fev('saint-lucia-independence', 'Saint Lucia independent', 'Saint Lucia', 'established_date2', ['saint-lucia', 'british-empire'], importance=1),
        fev('svg-independence', 'Saint Vincent and the Grenadines independent', 'Saint Vincent and the Grenadines', 'established_date2',
            ['saint-vincent-and-the-grenadines', 'british-empire'], importance=1),
        fev('antigua-independence', 'Antigua and Barbuda independent', 'Antigua and Barbuda', 'established_date4', ['antigua-and-barbuda', 'british-empire'],
            importance=1),
        fev('antigua-barbuda-union', 'Antigua and Barbuda united', 'Antigua and Barbuda', 'established_date1', ['antigua-and-barbuda']),
        wev('us-invasion-of-grenada', 'United States invasion of Grenada', 'United States invasion of Grenada', ['grenada', 'united-states'], importance=1),
        fev('saint-kitts-independence', 'Saint Kitts and Nevis independent', 'Saint Kitts and Nevis', 'established_date2', ['saint-kitts-and-nevis', 'british-empire'],
            importance=1),
        fev('grenada-constitution-restored', 'Grenada constitution restored', 'Grenada', 'established_date4', ['grenada']),
        fev('barbados-republic', 'Barbados becomes a republic', 'Barbados', 'established_date5', ['barbados']),

        # ---------- South America: viceroyalties and the wars of independence ----------
        fev('viceroyalty-of-peru-created', 'Viceroyalty of Peru created', 'Viceroyalty of Peru', 'year_start', ['viceroyalty-of-peru', 'spanish-empire']),
        fev('viceroyalty-of-new-granada-created', 'Viceroyalty of New Granada created', 'Viceroyalty of New Granada', 'year_start',
            ['viceroyalty-of-new-granada', 'viceroyalty-of-peru', 'spanish-empire']),
        iev('viceroyalty-of-new-granada-reestablished', 'Viceroyalty of New Granada re-established', 'Viceroyalty of New Granada', 2, ['viceroyalty-of-new-granada']),
        fev('viceroyalty-of-the-rio-de-la-plata-created', 'Viceroyalty of the Río de la Plata created', 'Viceroyalty of the Río de la Plata', 'year_start',
            ['viceroyalty-of-the-rio-de-la-plata', 'viceroyalty-of-peru', 'spanish-empire']),
        fev('captaincy-general-of-venezuela-created', 'Captaincy General of Venezuela created', 'Captaincy General of Venezuela', 'year_start',
            ['venezuela', 'viceroyalty-of-new-granada', 'spanish-empire']),
        iev('british-invasions-of-the-river-plate', 'British invasions of the Río de la Plata', 'Viceroyalty of the Río de la Plata', 1,
            ['viceroyalty-of-the-rio-de-la-plata', 'british-empire'], end=1807),
        wev('spanish-american-wars-of-independence', 'Spanish American wars of independence', 'Spanish American wars of independence', ['spanish-empire'],
            importance=1),
        fev('quito-revolution', 'Quito declares self-rule', 'Ecuador', 'established_date1', ['ecuador', 'spanish-empire']),
        wev('bolivian-war-of-independence', 'Bolivian War of Independence', 'Bolivian War of Independence', ['bolivia', 'spanish-empire']),
        wev('may-revolution', 'May Revolution', 'May Revolution', ['argentina', 'viceroyalty-of-the-rio-de-la-plata', 'spanish-empire'], importance=1),
        wev('argentine-war-of-independence', 'Argentine War of Independence', 'Argentine War of Independence', ['argentina', 'spanish-empire']),
        fev('colombian-independence', 'New Granada declares autonomy', 'Colombia', 'established_date1', ['colombia', 'viceroyalty-of-new-granada', 'spanish-empire'],
            importance=1),
        fev('first-government-junta-chile', 'First Government Junta of Chile', 'Chile', 'established_date1', ['chile', 'spanish-empire']),
        wev('venezuelan-war-of-independence', 'Venezuelan War of Independence', 'Venezuelan War of Independence', ['venezuela', 'spanish-empire']),
        fev('venezuelan-independence-declared', 'Venezuelan Declaration of Independence', 'Venezuela', 'established_date1', ['venezuela'], importance=1),
        fev('paraguayan-independence', 'Paraguayan independence', 'Paraguay', 'established_date1', ['paraguay', 'viceroyalty-of-the-rio-de-la-plata', 'spanish-empire'],
            importance=1),
        fev('admirable-campaign', 'Admirable Campaign', 'Second Republic of Venezuela', 'year_start', ['venezuela']),
        fev('spanish-reconquest-of-chile', 'Spanish reconquest of Chile', 'Old Fatherland', 'year_end', ['chile', 'spanish-empire']),
        iev('fall-of-montevideo', 'Fall of Montevideo', 'Viceroyalty of the Río de la Plata', 4, ['viceroyalty-of-the-rio-de-la-plata']),
        fev('argentine-independence', 'Argentine Declaration of Independence', 'Argentina', 'established_date2', ['argentina'], importance=1),
        iev('spanish-reconquest-of-new-granada', 'Spanish reconquest of New Granada', 'Viceroyalty of New Granada', 5,
            ['colombia', 'viceroyalty-of-new-granada', 'spanish-empire']),
        fev('cisplatina-annexed', 'Banda Oriental annexed as Cisplatina', 'Cisplatina', 'year_start',
            ['uruguay', 'united-kingdom-of-portugal-brazil-and-the-algarves']),
        wev('battle-of-chacabuco', 'Battle of Chacabuco', 'Battle of Chacabuco', ['chile', 'argentina', 'spanish-empire']),
        fev('chilean-independence', 'Chilean Declaration of Independence', 'Chile', 'established_date2', ['chile'], importance=1),
        wev('battle-of-maipu', 'Battle of Maipú', 'Battle of Maipú', ['chile', 'spanish-empire']),
        wev('battle-of-boyaca', 'Battle of Boyacá', 'Battle of Boyacá', ['colombia', 'viceroyalty-of-new-granada', 'spanish-empire'], importance=1),
        fev('gran-colombia-founded', 'Gran Colombia proclaimed', 'Gran Colombia', 'year_start', ['gran-colombia', 'colombia', 'venezuela'], importance=1,
            descr='The Congress of Angostura proclaims the Republic of Colombia.'),
        iev('constitution-of-cucuta', 'Constitution of Cúcuta', 'Gran Colombia', 1, ['gran-colombia']),
        wev('battle-of-carabobo', 'Battle of Carabobo', 'Battle of Carabobo', ['venezuela', 'gran-colombia', 'spanish-empire'], importance=1),
        fev('peruvian-independence', 'Peruvian independence declared', 'Peru', 'established_date1', ['peru', 'viceroyalty-of-peru', 'spanish-empire'],
            importance=1),
        wev('battle-of-pichincha', 'Battle of Pichincha', 'Battle of Pichincha', ['ecuador', 'viceroyalty-of-new-granada', 'gran-colombia', 'spanish-empire'],
            importance=1),
        fev('peruvian-congress-1822', 'Peruvian Congress installed', 'Protectorate of San Martín', 'year_end', ['peru']),
        wev('battle-of-ayacucho', 'Battle of Ayacucho', 'Battle of Ayacucho', ['peru', 'viceroyalty-of-peru', 'gran-colombia', 'spanish-empire'], importance=1,
            descr='The royalist army capitulates; Spanish rule in South America ends.'),
        fev('bolivian-independence', 'Bolivian independence', 'Bolivia', 'established_date1', ['bolivia'], importance=1),

        # ---------- Brazil and the Portuguese crown ----------
        fev('portuguese-arrival-in-brazil', 'Portuguese arrival in Brazil', 'Colonial Brazil', 'year_start', ['brazil', 'portuguese-empire'], importance=1),
        fev('dutch-brazil-founded', 'Dutch Brazil founded', 'Dutch Brazil', 'year_start', ['brazil', 'dutch-empire']),
        wev('second-battle-of-guararapes', 'Second Battle of Guararapes', 'Second Battle of Guararapes', ['brazil', 'dutch-empire', 'portuguese-empire']),
        fev('dutch-surrender-in-brazil', 'Dutch surrender in Brazil', 'Dutch Brazil', 'year_end', ['brazil', 'dutch-empire', 'portuguese-empire']),
        lev('portuguese-court-to-brazil', 'Portuguese court moves to Brazil', 'Empire of Brazil', 'seat of the Portuguese Empire in 1808', 1808,
            ['brazil', 'portugal', 'portuguese-empire']),
        fev('uk-pba-founded', 'United Kingdom of Portugal, Brazil and the Algarves', 'United Kingdom of Portugal, Brazil and the Algarves', 'year_start',
            ['united-kingdom-of-portugal-brazil-and-the-algarves', 'brazil', 'portugal'], importance=1),
        wev('liberal-revolution-1820', 'Liberal Revolution of 1820', 'Liberal Revolution of 1820', ['united-kingdom-of-portugal-brazil-and-the-algarves', 'portugal']),
        fev('brazilian-independence', 'Brazilian independence', 'Brazil', 'established_date1',
            ['brazil', 'united-kingdom-of-portugal-brazil-and-the-algarves', 'portuguese-empire', 'uruguay'], importance=1,
            descr='Pedro declares independence on 7 September 1822.'),
        wev('brazilian-war-of-independence', 'Brazilian War of Independence', 'Brazilian War of Independence', ['brazil', 'portugal']),
        fev('brazilian-independence-recognised', 'Portugal recognizes Brazil', 'Brazil', 'established_date2',
            ['brazil', 'united-kingdom-of-portugal-brazil-and-the-algarves', 'portugal']),
        wev('cisplatine-war', 'Cisplatine War', 'Cisplatine War', ['brazil', 'argentina', 'uruguay'], importance=1),
        wev('treaty-of-montevideo-1828', 'Treaty of Montevideo', 'Treaty of Montevideo (1828)', ['uruguay', 'brazil', 'argentina'],
            descr='Brazil and the United Provinces recognize an independent Uruguay.'),
        wev('ragamuffin-war', 'Ragamuffin War', 'Ragamuffin War', ['brazil', 'riograndense-republic']),
        fev('juliana-confederation', 'Juliana Republic proclaimed', 'Juliana Republic', 'year_start', ['juliana-republic', 'riograndense-republic']),
        fev('treaty-of-ponche-verde', 'Treaty of Ponche Verde', 'Riograndense Republic', 'year_end', ['riograndense-republic', 'brazil']),
        iev('abolition-of-slavery-in-brazil', 'Abolition of slavery in Brazil', 'Empire of Brazil', 4, ['brazil']),
        wev('proclamation-of-the-republic', 'Proclamation of the Republic', 'Proclamation of the Republic (Brazil)', ['brazil'], importance=1),
        wev('acre-war', 'Acre War', 'Acre War', ['republic-of-acre', 'bolivia', 'brazil']),
        fev('treaty-of-petropolis', 'Treaty of Petrópolis', 'Republic of Acre', 'year_end', ['republic-of-acre', 'bolivia', 'brazil']),
        wev('revolution-of-1930', 'Revolution of 1930', 'Revolution of 1930', ['brazil'], importance=1, descr='Getúlio Vargas takes power.'),
        wev('brazilian-coup-1964', "Brazilian coup d'état", "1964 Brazilian coup d'état", ['brazil'], importance=1),
        fev('brazil-democracy-1985', 'Democracy restored in Brazil', 'Military dictatorship in Brazil', 'year_end', ['brazil']),
        fev('brazil-constitution-1988', 'Brazilian constitution of 1988', 'Brazil', 'established_date4', ['brazil']),

        # ---------- the northern republics ----------
        iev('gran-colombia-peru-war', 'Gran Colombia–Peru War', 'Gran Colombia', 2, ['gran-colombia', 'peru'], end=1829),
        fev('venezuela-leaves-gran-colombia', 'Venezuela leaves Gran Colombia', 'Venezuela', 'established_date2', ['venezuela', 'gran-colombia']),
        fev('ecuador-leaves-gran-colombia', 'Ecuador leaves Gran Colombia', 'Ecuador', 'established_date3', ['ecuador', 'gran-colombia']),
        fev('dissolution-of-gran-colombia', 'Dissolution of Gran Colombia', 'Gran Colombia', 'year_end', ['gran-colombia', 'colombia', 'panama'], importance=1),
        fev('granadine-confederation', 'Granadine Confederation', 'Granadine Confederation', 'year_start', ['colombia']),
        wev('federal-war', 'Federal War', 'Federal War', ['venezuela'], importance=1),
        fev('rionegro-convention', 'Rionegro Convention', 'Granadine Confederation', 'year_end', ['colombia'], descr='The United States of Colombia are founded.'),
        fev('colombia-constitution-1886', 'Constitution of 1886', 'United States of Colombia', 'year_end', ['colombia'], descr='The Republic of Colombia.'),
        fev('liberal-revolution-ecuador', 'Liberal Revolution in Ecuador', 'Ecuador', 'established_date5', ['ecuador']),
        wev('leticia-war', 'Leticia War', 'Leticia War', ['colombia', 'peru']),
        wev('ecuadorian-peruvian-war', 'Ecuadorian–Peruvian War', 'Ecuadorian–Peruvian War', ['ecuador', 'peru']),
        wev('la-violencia', 'La Violencia', 'La Violencia', ['colombia'], importance=1),
        fev('venezuela-1953', 'Republic of Venezuela', 'United States of Venezuela', 'year_end', ['venezuela'], descr='The 1953 constitution renames the state.'),
        ongoing(wev('colombian-conflict', 'Colombian conflict', 'Colombian conflict', ['colombia'], importance=1)),
        fev('colombia-constitution-1991', 'Constitution of 1991', 'Colombia', 'established_date5', ['colombia']),
        wev('cenepa-war', 'Cenepa War', 'Cenepa War', ['ecuador', 'peru']),
        fev('venezuela-constitution-1999', 'Bolivarian constitution', 'Venezuela', 'established_date4', ['venezuela'], importance=1),
        fev('ecuador-constitution-2008', 'Ecuadorian constitution of 2008', 'Ecuador', 'established_date6', ['ecuador']),
        ongoing(wev('crisis-in-venezuela', 'Crisis in Venezuela', 'Crisis in Venezuela', ['venezuela'])),

        # ---------- the southern republics ----------
        fev('paraguay-joins-viceroyalty', 'Paraguay joins the Viceroyalty of the Río de la Plata', 'Governorate of Paraguay', 'year_end',
            ['paraguay', 'viceroyalty-of-the-rio-de-la-plata']),
        fev('federal-pact-1831', 'Federal Pact', 'Argentine Confederation', 'year_start', ['argentina'], descr='The Argentine Confederation is founded.'),
        fev('battle-of-lircay', 'Battle of Lircay', 'Conservative Republic', 'year_start', ['chile']),
        fev('peru-bolivian-confederation-formed', 'Peru–Bolivian Confederation formed', 'Peru–Bolivian Confederation', 'year_start',
            ['peru-bolivian-confederation', 'peru', 'bolivia']),
        wev('war-of-the-confederation', 'War of the Confederation', 'War of the Confederation', ['peru-bolivian-confederation', 'peru', 'bolivia', 'chile', 'argentina']),
        wev('battle-of-yungay', 'Battle of Yungay', 'Battle of Yungay', ['peru-bolivian-confederation', 'peru', 'bolivia', 'chile'], importance=1,
            descr='The Confederate army is defeated and the confederation dissolved.'),
        wev('uruguayan-civil-war', 'Uruguayan Civil War', 'Uruguayan Civil War', ['uruguay', 'argentina', 'brazil']),
        wev('battle-of-caseros', 'Battle of Caseros', 'Battle of Caseros', ['argentina', 'brazil', 'uruguay'], descr='Rosas is overthrown.'),
        iev('buenos-aires-secession', 'Buenos Aires secedes', 'Argentine Confederation', 4, ['argentina']),
        wev('battle-of-pavon', 'Battle of Pavón', 'Battle of Pavón', ['argentina'], descr='Buenos Aires wins; Argentina is reunified.'),
        wev('paraguayan-war', 'Paraguayan War', 'Paraguayan War', ['paraguay', 'brazil', 'argentina', 'uruguay'], importance=1),
        wev('conquest-of-the-desert', 'Conquest of the Desert', 'Conquest of the Desert', ['argentina']),
        wev('war-of-the-pacific', 'War of the Pacific', 'War of the Pacific', ['chile', 'peru', 'bolivia'], importance=1),
        wev('chilean-civil-war-1891', 'Chilean Civil War of 1891', 'Chilean Civil War of 1891', ['chile']),
        fev('chile-constitution-1925', 'Constitution of 1925', 'Presidential Republic (1925–1973)', 'year_start', ['chile']),
        wev('chaco-war', 'Chaco War', 'Chaco War', ['bolivia', 'paraguay'], importance=1),
        wev('bolivian-national-revolution', 'Bolivian National Revolution', 'Bolivian National Revolution', ['bolivia'], importance=1),
        wev('uruguayan-coup-1973', "Uruguayan coup d'état", "1973 Uruguayan coup d'état", ['uruguay']),
        wev('chilean-coup-1973', "Chilean coup d'état", "1973 Chilean coup d'état", ['chile'], importance=1),
        wev('argentine-coup-1976', "Argentine coup d'état", "1976 Argentine coup d'état", ['argentina'], importance=1),
        wev('falklands-war', 'Falklands War', 'Falklands War', ['argentina', 'united-kingdom'], importance=1),
        fev('argentine-democracy-1983', 'Democracy restored in Argentina', 'National Reorganization Process', 'year_end', ['argentina']),
        wev('paraguayan-coup-1989', "Paraguayan coup d'état", "1989 Paraguayan coup d'état", ['paraguay'], descr='Stroessner is overthrown.'),
        fev('chile-transition-1990', 'Transition to democracy in Chile', 'Military dictatorship of Chile', 'year_end', ['chile']),
        fev('bolivia-constitution-2009', 'Plurinational State of Bolivia', 'Bolivia', 'established_date3', ['bolivia']),

        # ---------- the Guianas ----------
        fev('capture-of-surinam', 'Dutch capture of Surinam', 'Surinam (Dutch colony)', 'year_start', ['suriname', 'dutch-empire']),
        fev('british-guiana-formed', 'British Guiana formed', 'British Guiana', 'year_start', ['guyana', 'british-empire']),
        lev('abolition-of-slavery-in-suriname', 'Abolition of slavery in Suriname', 'Suriname', 'abolition of slavery in 1863', 1863, ['suriname', 'dutch-empire']),
        fev('charter-for-the-kingdom', 'Charter for the Kingdom of the Netherlands', 'Surinam (Dutch colony)', 'year_end', ['suriname', 'netherlands']),
        fev('guyana-independence', 'Guyana independent', 'Guyana', 'established_date3', ['guyana', 'british-empire'], importance=1),
        fev('guyana-republic', 'Guyana becomes a republic', 'Guyana', 'established_date4', ['guyana']),
        fev('suriname-independence', 'Suriname independent', 'Suriname', 'established_date2', ['suriname', 'netherlands', 'dutch-empire'], importance=1),
        wev('surinamese-coup-1980', "Surinamese coup d'état", "1980 Surinamese coup d'état", ['suriname']),
    ]


def extra_memberships(M):
    """Memberships on rows other modules define, that need this module's rows (lead's merge, 2026-11-22)."""
    F, G, lead, member = M.F, M.G, M.lead, M.member
    ukpba, mg, cw = ('United Kingdom of Portugal, Brazil and the Algarves', 'Military Government of the Philippine Islands',
                     'Commonwealth of the Philippines')
    return {
        'portugal': [member('united-kingdom-of-portugal-brazil-and-the-algarves', F(ukpba, 'seg0.start', 'start'), F(ukpba, 'seg0.end', 'end'),
                            sources=[lead(ukpba, 'formed in 1815')], startEvent='uk-pba-founded', endEvent='brazilian-independence-recognised')],
        'philippines': [member('united-states', F(mg, 'year_start', 'start'), F(cw, 'year_end', 'end'),
                               sources=[lead('Insular Government of the Philippine Islands', 'unincorporated territory of the United States')],
                               startEvent='spanish-american-war', endEvent='philippine-independence')],
    }
