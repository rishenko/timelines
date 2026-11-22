"""
Colonial pilot for Modern States (2026-11-21): India, Nigeria, Mexico, Indonesia; the British, Spanish and Dutch
empires; the Mughal Empire; the United States of Indonesia (a federation, so a union row by the data-format rules).

Kevin's decisions (2026-11-21): colonial empires are their own rows; each colonial government is a phase on the
nation's row, with a dated memberOf in its empire; pre-colonial states with a former-country infobox get rows,
linked to their successors by succession events.

Called from gen_modern.py with its module (M) so the helpers (F, C, E, W, lead, phase, member, row, ev…) are shared.
"""

# group rows live in groups.py

# rows added to events that gen_modern.py already defines
# union-event rule (Kevin, 2026-11-21): the colonies stay off the world wars; the empires carry them
SHARED = {
    'ww1': ['british-empire'],
    'ww2': ['british-empire', 'dutch-empire'],
}


def tracks(M):
    G, F, C, E, lead, phase, stretch, span, member, row = (
        M.G, M.F, M.C, M.E, M.lead, M.phase, M.stretch, M.span, M.member, M.row)
    T = []

    # ---------- empires ----------
    be = 'British Empire'
    T.append(row('british-empire', 'British Empire', '#b03a48', 'colonial-empires', be, span_=span(stretch(
        None,
        C(1583, be, 'section heading: English overseas possessions (1583–1707)')
        + C(1497, be, 'section heading: Origins (1497–1583)', 'The article starts its history with the first English voyages of 1497.'),
        [{'year': 1997, 'source': lead(be, 'handover of Hong Kong'),
          'note': 'The Hong Kong handover "symbolised for many the end of the British Empire"; fourteen overseas territories remain.'}]))))
    se = 'Spanish Empire'
    T.append(row('spanish-empire', 'Spanish Empire', '#c09a2a', 'colonial-empires', se, span_=span(stretch(
        None, F(se, 'year_start', 'start'), F(se, 'year_end', 'end')))))
    de = 'Dutch colonial empire'
    T.append(row('dutch-empire', 'Dutch Empire', '#d0702a', 'colonial-empires', de, span_=span(stretch(
        None,
        F(de, 'year_start', 'start')
        + [{'year': 1602, 'source': lead(de, 'States General in 1602'), 'note': 'The lead dates the empire from the founding of the VOC in 1602.'}],
        [{'year': 1975, 'source': lead(de, 'Suriname in 1975'), 'note': 'Suriname\'s independence ends the empire; three Caribbean islands remain in the Kingdom.'}]
        + [dict(c, note='The infobox ends the empire in 1962, when Dutch New Guinea passed to UN administration.')
           for c in F(de, 'year_end', 'end') if c['year'] == 1962]))))

    # ---------- Southern Asia ----------
    mu = 'Mughal Empire'
    T.append(row('mughal-empire', 'Mughal Empire', '#2f8f5f', 'southern-asia', mu, span_=span(
        # the Sur interregnum (1540–55) is a gap: the dynasty was out of power
        stretch(None, F(mu, 'year_start', 'start'), C(*E(mu, 1)[:1], mu, E(mu, 1)[1]['sourceLocation']), startEvent='panipat-1526'),
        stretch(None, C(1555, mu, E(mu, 1)[1]['sourceLocation']), F(mu, 'year_end', 'end'), endEvent='indian-rebellion'),
    )))
    cr, raj = 'Company rule in India', 'British Raj'
    T.append(row('india', 'India', '#e08a2a', 'southern-asia', 'India', phases=[
        phase('Company rule', F(cr, 'seg0.start', 'start'), F(cr, 'seg0.end', 'end'), startEvent='plassey', endEvent='indian-rebellion'),
        phase('British Raj', F(raj, 'year_start', 'start'), F(raj, 'year_end', 'end'), startEvent='indian-rebellion', endEvent='indian-independence'),
        phase('Dominion of India', F('Dominion of India', 'year_start', 'start'), F('Dominion of India', 'year_end', 'end'),
              startEvent='indian-independence', endEvent='india-republic'),
        phase('Republic of India', F('India', 'established_date2', 'start'),
              ongoing=G.ref('India', 'infobox established_event2: Republic, 26 January 1950 (current state)'), startEvent='india-republic'),
    ], memberOf=[
        member('british-empire', F(cr, 'seg0.start', 'start'), F(raj, 'year_end', 'end'),
               sources=[lead(be, 'Battle of Plassey'), lead(raj, 'period of rule of the British Crown')],
               startEvent='plassey', endEvent='indian-independence'),
    ]))

    # ---------- South-eastern Asia ----------
    dei, jo, usi = 'Dutch East Indies', 'Japanese occupation of the Dutch East Indies', 'United States of Indonesia'
    T.append(row('indonesia', 'Indonesia', '#c0392b', 'south-eastern-asia', 'Indonesia', phases=[
        phase('Dutch East India Company rule', C(1603, dei, 'infobox event_pre: Dutch East India Company, 1603–1799'),
              C(1799, dei, 'infobox event_pre: Dutch East India Company, 1603–1799')),
        phase('Dutch East Indies', F(dei, 'date_start', 'start'), F(dei, 'seg0.end', 'end'), endEvent='dutch-recognition'),
        # the colonial government carried on in exile: the occupation is a rival phase
        phase('Japanese occupation', F(jo, 'year_start', 'start'), F(jo, 'year_end', 'end'), endEvent='proclamation'),
        phase('Republic of Indonesia', F('Indonesia', 'established_date1', 'start'),
              ongoing=G.ref('Indonesia', 'infobox established_event1: Proclamation, 17 August 1945 (current state)'), startEvent='proclamation'),
    ], memberOf=[
        member('dutch-empire', C(1603, dei, 'infobox event_pre: Dutch East India Company, 1603–1799'), F(dei, 'seg0.end', 'end'),
               sources=[lead(dei, 'colony of the Dutch Empire')], endEvent='dutch-recognition'),
        # the Japanese occupation as a membership of japan, like the other occupied states (east_asia.py), added 2026-11-21
        member('japan', F(jo, 'year_start', 'start'), F(jo, 'year_end', 'end'), sources=[G.ref(jo, 'infobox event_start: Occupation begins, 11 January 1942')],
               endEvent='proclamation'),
        member('united-states-of-indonesia', F(usi, 'year_start', 'start'), F(usi, 'year_end', 'end'),
               sources=[lead(usi, 'short-lived federal state')], startEvent='dutch-recognition', endEvent='unitary-state'),
    ]))
    T.append(row('united-states-of-indonesia', 'United States of Indonesia', '#a05a6a', 'south-eastern-asia', usi, span_=span(stretch(
        None, F(usi, 'year_start', 'start'), F(usi, 'year_end', 'end'), startEvent='dutch-recognition', endEvent='unitary-state'))))

    # ---------- Western Africa ----------
    lc, cn, fn, md = 'Lagos Colony', 'Colonial Nigeria', 'Federation of Nigeria', 'Military dictatorship in Nigeria'
    T.append(row('nigeria', 'Nigeria', '#2a8a4a', 'western-africa', 'Nigeria', phases=[
        phase('Lagos Colony', F(lc, 'year_start', 'start'), F(lc, 'year_end', 'end'), startEvent='lagos-colony'),
        # the two protectorates ran side by side until amalgamation: parallel phases
        phase('Northern Nigeria Protectorate', F('Northern Nigeria Protectorate', 'year_start', 'start'),
              F('Northern Nigeria Protectorate', 'year_end', 'end'), endEvent='amalgamation'),
        phase('Southern Nigeria Protectorate', F('Southern Nigeria Protectorate', 'year_start', 'start'),
              F('Southern Nigeria Protectorate', 'year_end', 'end'), endEvent='amalgamation'),
        phase('Colony and Protectorate of Nigeria', F(cn, 'year_start', 'start'), C(*E(cn, 1)[:1], cn, E(cn, 1)[1]['sourceLocation']),
              startEvent='amalgamation'),
        phase('Federation of Nigeria', F(fn, 'year_start', 'start'), F(fn, 'year_end', 'end'), endEvent='nigeria-republic'),
        phase('First Republic', F('First Nigerian Republic', 'year_start', 'start'), F('First Nigerian Republic', 'year_end', 'end'),
              startEvent='nigeria-republic', endEvent='coup-1966'),
        phase('Military government', F(md, 'seg0.start', 'start'), F(md, 'seg0.end', 'end'), startEvent='coup-1966'),
        phase('Second Republic', F('Second Nigerian Republic', 'year_start', 'start'), F('Second Nigerian Republic', 'year_end', 'end'),
              endEvent='coup-1983'),
        phase('Military government', F(md, 'seg1.start', 'start'), F(md, 'seg2.end', 'end'), startEvent='coup-1983', endEvent='fourth-republic'),
        phase('Fourth Republic', F('Fourth Nigerian Republic', 'established_date1', 'start'),
              ongoing=G.ref('Fourth Nigerian Republic', 'infobox established_event1: Current constitution adopted, 29 May 1999 (current state)'),
              startEvent='fourth-republic'),
    ], memberOf=[
        member('british-empire', F(lc, 'year_start', 'start') + [{'year': 1861, 'source': lead(lc, 'annexed on 6 August 1861'),
                                                                   'note': 'Lagos was annexed in 1861 and declared a colony in 1862.'}],
               F(cn, 'year_end', 'end'), sources=[lead(cn, 'formed part of the British Empire')],
               startEvent='lagos-colony', endEvent='nigerian-independence'),
    ]))

    # ---------- Central America ----------
    ns = 'New Spain'
    T.append(row('mexico', 'Mexico', '#1f7a5a', 'central-america', 'Mexico',
                 phases=[
        phase('New Spain', F(ns, 'year_start', 'start'), F(ns, 'year_end', 'end'), startEvent='fall-of-tenochtitlan', endEvent='mexican-independence-war'),
        phase('First Mexican Empire', F('First Mexican Empire', 'year_start', 'start'), F('First Mexican Empire', 'year_end', 'end'),
              startEvent='mexican-independence-war'),
        phase('Provisional Government', F('Provisional Government of Mexico', 'year_start', 'start'), F('Provisional Government of Mexico', 'year_end', 'end')),
        phase('First Republic', F('First Mexican Republic', 'year_start', 'start'), F('First Mexican Republic', 'year_end', 'end')),
        phase('Centralist Republic', F('Centralist Republic of Mexico', 'year_start', 'start'), F('Centralist Republic of Mexico', 'year_end', 'end')),
        phase('Second Federal Republic', F('Second Federal Republic of Mexico', 'year_start', 'start'),
              F('Second Federal Republic of Mexico', 'year_end', 'end')),
        phase('Second Mexican Empire', F('Second Mexican Empire', 'year_start', 'start'), F('Second Mexican Empire', 'year_end', 'end'),
              endEvent='french-intervention'),
        phase('Restored Republic', F('Restored Republic (Mexico)', 'year_start', 'start'), F('Restored Republic (Mexico)', 'year_end', 'end'),
              startEvent='french-intervention'),
        phase('Porfiriato', [{'year': 1876, 'source': lead('Porfiriato', 'Seizing power in a coup in 1876')}],
              [{'year': 1910, 'source': lead('Porfiriato', 'fraudulent 1910 elections')}], endEvent='mexican-revolution'),
        # Kevin (2026-11-21): the Revolution gets a phase, from Madero's rising to the 1917 Constitution
        phase('Revolution', [{'year': M.W('Mexican Revolution')[0][0], 'source': M.W('Mexican Revolution')[1],
                                'note': 'Madero calls for an armed uprising against Díaz (Plan of San Luis Potosí).'}],
              F('Mexico', 'established_date6', 'start'), startEvent='mexican-revolution', endEvent='constitution-1917'),
        phase('United Mexican States', F('Mexico', 'established_date6', 'start'),
              ongoing=G.ref('Mexico', 'infobox established_event6: Current constitution, 5 February 1917 (current state)'), startEvent='constitution-1917'),
    ], memberOf=[
        member('spanish-empire', F(ns, 'year_start', 'start'), F(ns, 'year_end', 'end'),
               sources=[lead(ns, 'named the territory New Spain'), lead(se, 'territories in Mexico')],
               startEvent='fall-of-tenochtitlan', endEvent='mexican-independence-war'),
    ]))
    return T


def events(M):
    G, E, W, F, ev = M.G, M.E, M.W, M.F, M.ev

    def wev(uuid, title, article, tracks, **kw):
        """An event dated by an infobox `date` field of its own article (a war or battle infobox)."""
        ys, r = W(article)
        if len(ys) > 1 and ys[-1] != ys[0]:
            kw.setdefault('end', ys[-1])
        return ev(uuid, title, ys[0], tracks, r, **kw)

    y = lambda t, n: E(t, n)[0]  # noqa: E731
    s = lambda t, n: E(t, n)[1]  # noqa: E731
    est = lambda t, k: F(t, f'established_date{k}', 'start')[0]  # noqa: E731
    return [
        # India and the Mughals
        wev('panipat-1526', 'First Battle of Panipat', 'First Battle of Panipat', ['mughal-empire'], importance=1,
           descr='Babur defeats Ibrahim Lodi, the last Sultan of Delhi, and founds the Mughal Empire.'),
        wev('plassey', 'Battle of Plassey', 'Battle of Plassey', ['india', 'mughal-empire', 'british-empire'], importance=1,
           descr='The East India Company defeats the Nawab of Bengal; Company rule in India begins.'),
        wev('indian-rebellion', 'Indian Rebellion of 1857', 'Indian Rebellion of 1857', ['india', 'mughal-empire', 'british-empire'], importance=1,
           descr='A rising against Company rule ends the Mughal Empire and the Company\'s rule; the Crown governs India directly.'),
        wev('indian-independence', 'Independence and partition of India', 'Partition of India', ['india', 'british-empire'], importance=1,
           descr='British India is partitioned into the dominions of India and Pakistan on 14–15 August 1947.'),
        ev('india-republic', 'India becomes a republic', est('India', 2)['year'], ['india'], est('India', 2)['source'],
           descr='The constitution takes effect on 26 January 1950.'),
        # Mexico
        wev('fall-of-tenochtitlan', 'Fall of Tenochtitlan', 'Fall of Tenochtitlan', ['mexico', 'spanish-empire'], importance=1,
           descr='Cortés and his Indigenous allies take the Aztec capital; New Spain is founded on its site.'),
        wev('mexican-independence-war', 'Mexican War of Independence', 'Mexican War of Independence', ['mexico', 'spanish-empire'], importance=1,
           descr='From Hidalgo\'s call to arms in 1810 to the entry into Mexico City in 1821; the viceroyalty ends.'),
        wev('mexican-american-war', 'Mexican–American War', 'Mexican–American War', ['mexico'], importance=1,
           descr='Mexico loses about half its territory to the United States.'),
        wev('french-intervention', 'Second French intervention in Mexico', 'Second French intervention in Mexico', ['mexico', 'france'],
           descr='France installs Maximilian as emperor; the republic under Juárez wins and he is executed in 1867.'),
        wev('mexican-revolution', 'Mexican Revolution', 'Mexican Revolution', ['mexico'], importance=1,
           descr='Díaz is overthrown; a decade of civil war ends with the 1917 constitution and the revolutionary state.'),
        ev('constitution-1917', 'Constitution of 1917', est('Mexico', 6)['year'], ['mexico'], est('Mexico', 6)['source'],
           descr='The current constitution, adopted on 5 February 1917.'),
        # Indonesia and the Dutch
        ev('voc-founded', 'Dutch East India Company founded', 1602, ['dutch-empire'], M.lead('Dutch colonial empire', 'States General in 1602'),
           descr='The States General merges the Dutch trading companies into the VOC.'),
        wev('java-war', 'Java War', 'Java War', ['indonesia', 'dutch-empire']),
        ev('aceh-war', 'Aceh War', y('Dutch East Indies', 4), ['indonesia', 'dutch-empire'], s('Dutch East Indies', 4), end=1904),
        ev('proclamation', 'Proclamation of Indonesian Independence', y('Dutch East Indies', 7), ['indonesia'], s('Dutch East Indies', 7), importance=1,
           descr='Sukarno and Hatta declare independence two days after Japan\'s surrender.'),
        wev('indonesian-revolution', 'Indonesian National Revolution', 'Indonesian National Revolution', ['indonesia', 'dutch-empire'], importance=1),
        ev('dutch-recognition', 'Dutch recognise Indonesian sovereignty', y('United States of Indonesia', 'start'),
           ['indonesia', 'united-states-of-indonesia', 'dutch-empire'], s('United States of Indonesia', 'start'), importance=1,
           descr='Sovereignty passes to the federal United States of Indonesia on 27 December 1949.'),
        ev('unitary-state', 'Unitary Republic of Indonesia', y('United States of Indonesia', 'end'), ['indonesia', 'united-states-of-indonesia'],
           s('United States of Indonesia', 'end'), descr='The federation is dissolved into the unitary Republic on 17 August 1950.'),
        # Nigeria
        ev('lagos-colony', 'Lagos becomes a British colony', F('Lagos Colony', 'year_start', 'start')[0]['year'], ['nigeria', 'british-empire'],
           F('Lagos Colony', 'year_start', 'start')[0]['source'], descr='Annexed in 1861, Lagos is declared a colony on 5 March 1862.'),
        ev('amalgamation', 'Amalgamation of Nigeria', est('Nigeria', 3)['year'], ['nigeria'], est('Nigeria', 3)['source'], importance=1,
           descr='The Northern and Southern protectorates are joined on 1 January 1914.'),
        ev('nigerian-independence', 'Nigerian independence', y('Federation of Nigeria', 1), ['nigeria', 'british-empire'], s('Federation of Nigeria', 1),
           importance=1, descr='Nigeria becomes independent on 1 October 1960.'),
        ev('nigeria-republic', 'Nigeria becomes a republic', est('Nigeria', 5)['year'], ['nigeria'], est('Nigeria', 5)['source']),
        ev('coup-1966', 'January 1966 coup', y('First Nigerian Republic', 'end'), ['nigeria'], s('First Nigerian Republic', 'end'),
           descr='The First Republic falls to a military coup on 15 January 1966.'),
        wev('nigerian-civil-war', 'Nigerian Civil War', 'Nigerian Civil War', ['nigeria'], importance=1,
           descr='The Eastern Region secedes as the Republic of Biafra and is defeated in January 1970.'),
        ev('coup-1983', 'December 1983 coup', y('Second Nigerian Republic', 'end'), ['nigeria'], s('Second Nigerian Republic', 'end')),
        ev('fourth-republic', 'Fourth Republic', est('Fourth Nigerian Republic', 1)['year'], ['nigeria'], est('Fourth Nigerian Republic', 1)['source'],
           descr='Civilian rule returns under the 1999 constitution.'),
    ]
