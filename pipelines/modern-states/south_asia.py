"""
Modern States wave 4: Southern Asia (2026-11-21). Afghanistan, Bangladesh, Bhutan, Iran, the Maldives, Nepal,
Pakistan and Sri Lanka, plus the historical states of the region after 1500. India and the Mughal Empire come from
colonial.py; this module only adds events to them (tracks) and SHARED.

Rules applied (data-format.md and Kevin's decisions, 2026-11-21):
- A row that carries on into a state that exists today takes that state's id; older governments are phases
  (Iran: Safavid, Afsharid, Zand, Qajar, Pahlavi, Islamic Republic; Nepal: Gorkha kingdom, Kingdom, Republic).
- Empires are their own rows: the Durrani Empire and the Hotak dynasty (both ruled lands now in several states), so
  Afghanistan's row starts with the Emirate of 1823; succession events link them.
- The Hotak occupation of Iran (1722–29) is a rival phase on Iran (the Safavid shahs held out in the north) plus a
  dated membership in the Hotak row, as colonial rule is (a phase and a membership).
- Colonial rule: Portuguese, Dutch and British Ceylon are phases on Sri Lanka with memberships in their empires; the
  Maldives' Portuguese occupation and British protectorate likewise. Afghanistan was a de jure British protectorate
  1879–1919 (membership). Bhutan's treaties with Britain are events, not a membership: no source calls it a
  protectorate or dates an end.
- Province-to-state: East Bengal and East Pakistan are phases on Bangladesh, with a membership in Pakistan.
- Rows crossing 1500 match the Medieval World timeline where it has them (timurid-empire, aq-qoyunlu).

Called from gen_modern.py with its module (M).
"""

SHARED = {
    'panipat-1526': ['delhi-sultanate'],
    'indian-rebellion': ['oudh-state'],
    'indian-independence': ['pakistan', 'bangladesh'],
}

SAS = 'southern-asia'


def tracks(M):
    G, F, C, E, lead, phase, stretch, span, member, row = (
        M.G, M.F, M.C, M.E, M.lead, M.phase, M.stretch, M.span, M.member, M.row)

    def S1(t, spec='year_start'):
        return F(t, spec, 'start')[:1]

    def est(t, k):
        return F(t, f'established_date{k}', 'start')[:1]

    def est_last(t, k):
        return F(t, f'established_date{k}:last', 'end')[:1]

    def cur(t, k):
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

    def SEC(t, section, needle, year, note=None):
        """A claim from the first dated sentence of an article section."""
        for s in G.art(t)['body']['section_openers']:
            if s['section'] == section and needle in s['text']:
                c = {'year': year, 'source': G.ref(t, f'section "{section}": "{s["text"][:160]}"')}
                if note:
                    c['note'] = note
                return [c]
        raise SystemExit(f'{t}: no opener in {section!r} with {needle!r}')

    def life(t, *, startEvent=None, endEvent=None, circa=False):
        """A one-stretch lifespan from the article's year_start and year_end."""
        return span(stretch(None, F(t, 'year_start', 'start'), F(t, 'year_end', 'end'),
                            startEvent=startEvent, endEvent=endEvent, circa=circa))

    def life1(t, *, startEvent=None, endEvent=None, circa=False):
        """Like life(), with the article's own year_start and year_end only, as the Medieval World timeline has them."""
        return span(stretch(None, F(t, 'year_start', 'start')[:1], F(t, 'year_end', 'end')[:1],
                            startEvent=startEvent, endEvent=endEvent, circa=circa))

    def ph1(name, t, **kw):
        return phase(name, F(t, 'year_start', 'start')[:1], F(t, 'year_end', 'end')[:1], **kw)

    T = []

    # ================= Modern states =================
    ea, ka, ra, dra = 'Emirate of Afghanistan', 'Kingdom of Afghanistan', 'Republic of Afghanistan (1973–1978)', 'Democratic Republic of Afghanistan'
    isa, iea, ira, af = 'Islamic State of Afghanistan', 'Islamic Emirate of Afghanistan (1996–2001)', 'Islamic Republic of Afghanistan', 'Afghanistan'
    T.append(row('afghanistan', 'Afghanistan', '#3a6a3a', SAS, af, phases=[
        phase('Emirate of Afghanistan', F(ea, 'year_start', 'start'), F(ea, 'year_end', 'end'),
              startEvent='fall-of-kabul-1823', endEvent='afghan-kingdom-1926'),
        phase('Kingdom of Afghanistan', F(ka, 'year_start', 'start'), F(ka, 'year_end', 'end'),
              startEvent='afghan-kingdom-1926', endEvent='afghan-coup-1973'),
        phase('Republic of Afghanistan', F(ra, 'year_start', 'start'), F(ra, 'year_end', 'end'),
              startEvent='afghan-coup-1973', endEvent='saur-revolution'),
        phase('Democratic Republic of Afghanistan', F(dra, 'year_start', 'start'), F(dra, 'year_end', 'end'), startEvent='saur-revolution'),
        # the mujahideen state and the Taliban's first emirate ran side by side from 1996: rival phases
        phase('Islamic State of Afghanistan', F(isa, 'year_start', 'start'), F(isa, 'year_end', 'end')),
        phase('Islamic Emirate (Taliban)', F(iea, 'year_start', 'start'), F(iea, 'year_end', 'end'),
              startEvent='taliban-capture-kabul-1996', endEvent='us-invasion-afghanistan'),
        phase('Interim and transitional administrations', L(ira, 'Afghan interim (2001–2002)', 2001), L(ira, 'Afghan interim (2001–2002)', 2004),
              startEvent='us-invasion-afghanistan'),
        phase('Islamic Republic of Afghanistan', F(ira, 'year_start', 'start'), F(ira, 'year_end', 'end'), endEvent='fall-of-kabul-2021'),
        phase('Islamic Emirate (restored)', est(af, 12), ongoing=cur(af, 12), startEvent='fall-of-kabul-2021'),
    ], memberOf=[
        member('british-empire', ev_claim(ea, 4), ev_claim(ea, 6),
               sources=[lead(ea, "Afghanistan's foreign affairs"), lead(ea, 'de-jure British protectorate')],
               startEvent='treaty-of-gandamak', endEvent='anglo-afghan-treaty-1919'),
    ]))

    eb, ep, bd = 'East Bengal', 'East Pakistan', 'Bangladesh'
    T.append(row('bangladesh', 'Bangladesh', '#1f7a4f', SAS, bd, phases=[
        phase('East Bengal', F(eb, 'year_start', 'start'), F(eb, 'year_end', 'end'), startEvent='indian-independence', endEvent='pakistan-republic'),
        phase('East Pakistan', F(ep, 'year_start', 'start'), F(ep, 'year_end', 'end'), startEvent='pakistan-republic', endEvent='bangladesh-liberation-war'),
        phase("People's Republic of Bangladesh", est(bd, 3), ongoing=cur(bd, 6), startEvent='bangladesh-liberation-war'),
    ], memberOf=[
        member('pakistan', F(eb, 'year_start', 'start'), F(ep, 'year_end', 'end'),
               sources=[lead(eb, 'existed from 1947'), lead(ep, 'eastern province of Pakistan')],
               startEvent='indian-independence', endEvent='bangladesh-liberation-war'),
    ]))

    bt = 'Bhutan'
    T.append(row('bhutan', 'Bhutan', '#d08a2a', SAS, bt,
                 # unified from 1616; the Druk Desi system and the monarchy leave 1634–50 and 1905–07 without a
                 # phase: the lifespan carries the row across
                 span_=span(stretch(None, est(bt, 1), ongoing=cur(bt, 6))),
                 phases=[
        phase('Druk Desi system', est(bt, 2), est_last(bt, 2)),
        phase('Absolute monarchy (Wangchuk dynasty)', est(bt, 3), est(bt, 6), startEvent='wangchuk-dynasty', endEvent='bhutan-constitution-2008'),
        phase('Constitutional monarchy', est(bt, 6), ongoing=cur(bt, 6), startEvent='bhutan-constitution-2008'),
    ]))

    si, hd, ai, zi, qi, pi, ir = 'Safavid Iran', 'Hotak dynasty', 'Afsharid Iran', 'Zand Iran', 'Qajar Iran', 'Pahlavi Iran', 'Iran'
    T.append(row('iran', 'Iran', '#2a7a7a', SAS, ir, phases=[
        phase('Safavid Iran', F(si, 'year_start', 'start'),
              F(si, 'year_end', 'end') + L(si, 'some historians date its fall to 1722', 1722, 'Some historians end the Safavid state in 1722, when Isfahan fell to the Afghans.'),
              startEvent='battle-of-sharur', endEvent='nader-crowned'),
        # the Hotak shahs ruled from Isfahan while the Safavid heir held out: a rival phase
        phase('Hotak occupation', ev_claim(hd, 1), ev_claim(hd, 2), startEvent='siege-of-isfahan', endEvent='battle-of-damghan'),
        phase('Afsharid Iran', F(ai, 'year_start', 'start'), F(ai, 'year_end', 'end'), startEvent='nader-crowned'),
        # the Zands ruled most of Iran while the Afsharids kept Khorasan, and the Qajars rose before the Zands fell
        phase('Zand Iran', F(zi, 'year_start', 'start'), F(zi, 'year_end', 'end'), endEvent='qajar-conquest-of-zand'),
        phase('Qajar Iran', F(qi, 'year_start', 'start')
              + C(1794, ir, 'infobox established_event9: Qajar Iran, 20 March 1794', 'The Iran article dates the Qajar state from 1794.'),
              F(qi, 'year_end', 'end'), endEvent='pahlavi-dynasty-founded'),
        phase('Pahlavi Iran', F(pi, 'year_start', 'start'), F(pi, 'year_end', 'end'), startEvent='pahlavi-dynasty-founded', endEvent='iranian-revolution'),
        phase('Islamic Republic of Iran', est(ir, 13), ongoing=cur(ir, 14), startEvent='iranian-revolution'),
    ], memberOf=[
        member('hotak-dynasty', ev_claim(hd, 1), ev_claim(hd, 2), sources=[lead(hd, 'briefly ruled parts of Iran')],
               startEvent='siege-of-isfahan', endEvent='battle-of-damghan'),
    ]))

    mv, hm = 'Maldives', 'History of the Maldives'
    T.append(row('maldives', 'Maldives', '#2a8ab0', SAS, mv,
                 # the sultanate's own article is flagged for AI-generated text; the Maldives article dates its
                 # Islamic period from the conversion of 1153. The sultan ruled throughout: the lifespan runs on.
                 span_=span(stretch(None, SEC(mv, 'History > Islamic period', 'converted to Islam in 1153', 1153)
                                    + SEC(mv, 'History > Islamic period', 'converted to Islam in 1153', 1193, 'The article gives 1193 as the other date for the conversion.'),
                                    ongoing=cur(mv, 3))),
                 phases=[
        phase('Portuguese occupation', L(hm, 'Portuguese had occupied', 1558), L(hm, 'Portuguese had occupied', 1573)),
        phase('British protectorate', L(mv, 'British protectorate in 1887', 1887), est(mv, 1), startEvent='maldives-protectorate', endEvent='maldives-independence'),
        phase('Sultanate (independent)', est(mv, 1), est(mv, 2), startEvent='maldives-independence', endEvent='maldives-republic'),
        phase('Republic of Maldives', est(mv, 2), ongoing=cur(mv, 3), startEvent='maldives-republic'),
    ], memberOf=[
        member('portuguese-empire', L(hm, 'Portuguese had occupied', 1558), L(hm, 'Portuguese had occupied', 1573),
               sources=[SEC(hm, 'Colonial period > Portuguese colonisation and local revolt', 'Portuguese Empire established a colony', 1558)[0]['source']]),
        member('british-empire', L(mv, 'British protectorate in 1887', 1887)
               + SEC(hm, 'Colonial period > British protectorate', 'British-protected area', 1796,
                     'The History of the Maldives article says the islands were designated a British-protected area after 1796.'),
               est(mv, 1), sources=[lead(mv, 'British protectorate in 1887')], startEvent='maldives-protectorate', endEvent='maldives-independence'),
    ]))

    gk, kn, np_ = 'Gorkha kingdom', 'Kingdom of Nepal', 'Nepal'
    T.append(row('nepal', 'Nepal', '#c03a4a', SAS, np_, phases=[
        # the Malla kings of the Kathmandu Valley (Medieval World's phase) and Gorkha overlap until the conquest
        phase('Malla dynasty', F('Malla dynasty (Nepal)', 'year_start', 'start')[:1], F('Malla dynasty (Nepal)', 'year_end', 'end')[:1],
              endEvent='nepal-unification'),
        phase('Gorkha kingdom', F(gk, 'year_start', 'start'), F(gk, 'year_end', 'end'), endEvent='nepal-unification'),
        phase('Kingdom of Nepal', F(kn, 'year_start', 'start'), F(kn, 'year_end', 'end'), startEvent='nepal-unification', endEvent='nepal-republic'),
        phase('Federal Democratic Republic of Nepal', est(np_, 4), ongoing=cur(np_, 5), startEvent='nepal-republic'),
    ]))

    dp, pk = 'Dominion of Pakistan', 'Pakistan'
    T.append(row('pakistan', 'Pakistan', '#1f6a3a', SAS, pk, phases=[
        phase('Dominion of Pakistan', F(dp, 'year_start', 'start'), F(dp, 'year_end', 'end'), startEvent='indian-independence', endEvent='pakistan-republic'),
        phase('Islamic Republic of Pakistan', est(pk, 3), ongoing=cur(pk, 6), startEvent='pakistan-republic'),
    ]))

    pc, dc, bc, doc, sl = 'Portuguese Ceylon', 'Dutch Ceylon', 'British Ceylon', 'Dominion of Ceylon', 'Sri Lanka'
    T.append(row('sri-lanka', 'Sri Lanka', '#a85a2a', SAS, sl, phases=[
        # Kotte as in the Medieval World timeline; Sitawaka split from it in 1521 and is its own row
        ph1('Kingdom of Kotte', 'Kingdom of Kotte', endEvent='death-of-dharmapala'),
        # the Kingdom of Kandy's own article is flagged for AI-generated text: the Sri Lanka article's "Kandyan
        # period" dates it, as a phase alongside the colonial coast
        phase('Kingdom of Kandy', est(sl, 5), est_last(sl, 5), endEvent='kandyan-convention'),
        phase('Portuguese Ceylon', F(pc, 'year_start', 'start'), F(pc, 'year_end', 'end'), startEvent='death-of-dharmapala', endEvent='dutch-portuguese-war'),
        phase('Dutch Ceylon', F(dc, 'year_start', 'start'), F(dc, 'year_end', 'end'), startEvent='dutch-portuguese-war', endEvent='british-capture-of-ceylon'),
        phase('British Ceylon', F(bc, 'year_start', 'start'), F(bc, 'year_end', 'end'), startEvent='british-capture-of-ceylon', endEvent='ceylon-independence'),
        phase('Dominion of Ceylon', F(doc, 'seg0.start', 'start'), F(doc, 'seg0.end', 'end'), startEvent='ceylon-independence', endEvent='sri-lanka-republic'),
        phase('Democratic Socialist Republic of Sri Lanka', est(sl, 8), ongoing=cur(sl, 9), startEvent='sri-lanka-republic'),
    ], memberOf=[
        member('portuguese-empire', F(pc, 'year_start', 'start'), F(pc, 'year_end', 'end'), sources=[lead(pc, 'controlled by the Portuguese Empire')],
               startEvent='death-of-dharmapala', endEvent='dutch-portuguese-war'),
        member('dutch-empire', F(dc, 'year_start', 'start'), F(dc, 'year_end', 'end'), sources=[lead(pc, 'the Dutch conquered')],
               startEvent='dutch-portuguese-war', endEvent='british-capture-of-ceylon'),
        member('british-empire', F(bc, 'year_start', 'start'), F(bc, 'year_end', 'end'), sources=[lead(bc, 'imperial possessions of the United Kingdom')],
               startEvent='british-capture-of-ceylon', endEvent='ceylon-independence'),
    ]))

    # ================= Iran and Afghanistan: empires =================
    T.append(row('timurid-empire', 'Timurid Empire', '#3a8a8a', SAS, 'Timurid Empire', span_=life('Timurid Empire', endEvent='fall-of-herat')))
    aq = 'Aq Qoyunlu'
    # claims copied from the Medieval World timeline (same dump article), alternatives included
    T.append(row('aq-qoyunlu', 'Aq Qoyunlu', '#c0c0a0', SAS, aq, span_=span(stretch(
        None,
        C(1348, aq, 'infobox year_start: 1348') + C(1378, aq, 'infobox life span: 1378–1508', 'The infobox life span starts in 1378.'),
        C(1503, aq, 'infobox year_end: Summer 1503')
        + C(1508, aq, 'infobox life span: 1378–1508', 'The infobox life span ends in 1508.'),
        endEvent='battle-of-hamadan-1503'))))
    T.append(row('hotak-dynasty', 'Hotak dynasty', '#7a5a2a', SAS, hd, span_=life(hd, startEvent='hotak-revolt', endEvent='siege-of-kandahar-1738')))
    de = 'Durrani Empire'
    T.append(row('durrani-empire', 'Durrani Empire', '#5a7a2a', SAS, de,
                 span_=span(stretch(None, F(de, 'year_start', 'start'), F(de, 'year_end', 'end'), startEvent='durrani-empire-founded', endEvent='fall-of-herat-1863')),
                 phases=[
        phase('Durrani Empire', F(de, 'year_start', 'start'), ev_claim(de, 3), startEvent='durrani-empire-founded', endEvent='fall-of-kabul-1823'),
        # after the civil war of 1793 Durrani princes held Herat until 1863; Shah Shuja's restoration of 1839–43 ran beside it
        phase('Durrani Herat', ev_claim(de, 2), F(de, 'year_end', 'end'), endEvent='fall-of-herat-1863'),
        phase('Restoration of Shah Shuja', ev_claim(de, 4), ev_claim(de, 5), startEvent='first-anglo-afghan-war'),
    ]))

    # ================= Northern India and the Deccan =================
    # the dynasties are phases, as in the Medieval World timeline
    T.append(row('delhi-sultanate', 'Delhi Sultanate', '#2a6a3a', SAS, 'Delhi Sultanate', phases=[
        ph1('Mamluk dynasty', 'Mamluk dynasty (Delhi)'), ph1('Khalji dynasty', 'Khalji dynasty'), ph1('Tughlaq dynasty', 'Tughlaq dynasty'),
        ph1('Sayyid dynasty', 'Sayyid dynasty'), ph1('Lodi dynasty', 'Lodi dynasty', endEvent='panipat-1526'),
    ]))
    T.append(row('langah-sultanate', 'Langah Sultanate (Multan)', '#8a7a4a', SAS, 'Langah Sultanate', span_=life1('Langah Sultanate')))
    T.append(row('gajapati-empire', 'Gajapati Empire', '#c0a03a', SAS, 'Gajapati Empire', span_=life1('Gajapati Empire')))
    se_ = 'Sur Empire'
    T.append(row('sur-empire', 'Sur Empire', '#8a6a3a', SAS, se_, span_=span(stretch(
        None, F(se_, 'year_start', 'start') + L(se_, 'between 1538/1540 and 1556', 1540, 'The lead gives 1538/1540 for the start.'),
        F(se_, 'year_end', 'end') + L(se_, 'between 1538/1540 and 1556', 1556, 'The lead runs the empire to 1556.'),
        endEvent='battle-of-sirhind-1555'))))
    T.append(row('bengal-sultanate', 'Bengal Sultanate', '#2a8a4a', SAS, 'Bengal Sultanate', span_=span(
        # the Sur conquest (1539–54) is a gap
        stretch(None, F('Bengal Sultanate', 'seg0.start', 'start'), F('Bengal Sultanate', 'seg0.end', 'end')),
        stretch(None, F('Bengal Sultanate', 'seg1.start', 'start'), F('Bengal Sultanate', 'seg1.end', 'end'), endEvent='battle-of-rajmahal'))))
    T.append(row('gujarat-sultanate', 'Gujarat Sultanate', '#3a8a5a', SAS, 'Gujarat Sultanate', span_=life1('Gujarat Sultanate', endEvent='mughal-annexation-of-gujarat')))
    T.append(row('malwa-sultanate', 'Malwa Sultanate', '#7a8a3a', SAS, 'Malwa Sultanate', span_=life1('Malwa Sultanate', endEvent='mughal-conquest-of-malwa')))
    ks = 'Kashmir Sultanate'
    T.append(row('kashmir-sultanate', 'Kashmir Sultanate', '#2a7a5a', SAS, ks, span_=span(
        stretch(None, F(ks, 'seg0.start', 'start'), F(ks, 'seg0.end', 'end')),
        stretch(None, F(ks, 'seg1.start', 'start'),
                F(ks, 'seg1.end', 'end')
                + C(1586, ks, 'infobox year_end: 14 October 1586', 'The infobox year_end gives the fall of Srinagar to the Mughals in 1586; the Chaks surrendered in 1589.'),
                endEvent='mughal-conquest-of-kashmir'))))
    T.append(row('mewar', 'Mewar', '#c0502a', SAS, 'Kingdom of Mewar',
                 span_=span(stretch(None, F('Kingdom of Mewar', 'seg0.start', 'start'), F('Kingdom of Mewar', 'seg0.end', 'end')),
                            stretch(None, F('Kingdom of Mewar', 'seg1.start', 'start'), F('Kingdom of Mewar', 'seg1.end', 'end'), endEvent='mewar-accession')),
                 memberOf=[member('british-empire', L('Kingdom of Mewar', 'accepting British suzerainty in 1818', 1818),
                                  L('Kingdom of Mewar', 'accepting British suzerainty in 1818', 1947),
                                  sources=[lead('Kingdom of Mewar', 'accepting British suzerainty in 1818')])]))
    T.append(row('khandesh-sultanate', 'Khandesh Sultanate (Farooqui)', '#5a6a8a', SAS, 'Farooqui dynasty',
                 span_=life1('Farooqui dynasty', endEvent='mughal-annexation-of-khandesh')))
    T.append(row('ahom-kingdom', 'Ahom kingdom', '#3a6a3a', SAS, 'Ahom kingdom', span_=life1('Ahom kingdom', endEvent='treaty-of-yandabo')))
    T.append(row('maratha-empire', 'Maratha Empire', '#d0702a', SAS, 'Maratha Empire',
                 span_=life('Maratha Empire', startEvent='coronation-of-shivaji', endEvent='third-anglo-maratha-war')))
    sc, sk = 'Sikh Confederacy', 'Sikh Empire'
    T.append(row('sikh-empire', 'Sikh Empire', '#c0902a', SAS, sk, phases=[
        phase('Sikh Confederacy', F(sc, 'year_start', 'start'), F(sc, 'year_end', 'end'), endEvent='capture-of-lahore-1799'),
        phase('Sikh Empire', F(sk, 'year_start', 'start'), F(sk, 'year_end', 'end'), startEvent='capture-of-lahore-1799', endEvent='second-anglo-sikh-war'),
    ]))
    T.append(row('oudh-state', 'Oudh State', '#8a5a7a', SAS, 'Oudh State', span_=life('Oudh State', endEvent='indian-rebellion')))
    T.append(row('kingdom-of-sikkim', 'Kingdom of Sikkim', '#5a8a9a', SAS, 'Kingdom of Sikkim', span_=life('Kingdom of Sikkim', endEvent='sikkim-merger')))
    T.append(row('kingdom-of-kumaon', 'Kingdom of Kumaon', '#6a7a5a', SAS, 'Kingdom of Kumaon', span_=life('Kingdom of Kumaon', endEvent='gorkha-annexation-of-kumaon')))

    # ---- the Deccan ----
    T.append(row('bahmani-sultanate', 'Bahmani Sultanate', '#2a5a4a', SAS, 'Bahmani Kingdom', span_=life1('Bahmani Kingdom', endEvent='bahmani-dissolved')))
    T.append(row('ahmadnagar-sultanate', 'Ahmadnagar Sultanate', '#3a7a8a', SAS, 'Ahmadnagar Sultanate',
                 span_=life1('Ahmadnagar Sultanate', startEvent='deccan-revolts-1490', endEvent='mughal-annexation-of-ahmadnagar')))
    T.append(row('bijapur-sultanate', 'Bijapur Sultanate', '#3a5a6a', SAS, 'Bijapur Sultanate',
                 span_=life1('Bijapur Sultanate', startEvent='deccan-revolts-1490', endEvent='siege-of-bijapur'),
                 memberOf=[member('mughal-empire', L('Bijapur Sultanate', 'formal recognition of Mughal authority in 1636', 1636),
                                  F('Bijapur Sultanate', 'year_end', 'end'), sources=[lead('Bijapur Sultanate', 'formal recognition of Mughal authority in 1636')],
                                  endEvent='siege-of-bijapur')]))
    T.append(row('golconda-sultanate', 'Golconda Sultanate', '#8a7a4a', SAS, 'Golconda Sultanate',
                 span_=life('Golconda Sultanate', startEvent='golconda-founded', endEvent='siege-of-golconda'),
                 memberOf=[member('mughal-empire', L('Golconda Sultanate', 'recognise Mughal suzerainty', 1636),
                                  F('Golconda Sultanate', 'year_end', 'end'), sources=[lead('Golconda Sultanate', 'recognise Mughal suzerainty')],
                                  endEvent='siege-of-golconda')]))
    T.append(row('berar-sultanate', 'Berar Sultanate', '#6a4a6a', SAS, 'Berar Sultanate',
                 span_=life1('Berar Sultanate', startEvent='deccan-revolts-1490', endEvent='berar-annexed')))
    T.append(row('bidar-sultanate', 'Bidar Sultanate', '#7a6a6a', SAS, 'Bidar Sultanate', span_=life1('Bidar Sultanate', endEvent='bidar-annexed')))
    T.append(row('hyderabad-state', 'Hyderabad State', '#7a3a5a', SAS, 'Hyderabad State',
                 span_=life('Hyderabad State', startEvent='hyderabad-founded', endEvent='annexation-of-hyderabad')))
    T.append(row('carnatic-sultanate', 'Carnatic Sultanate', '#5a7a6a', SAS, 'Carnatic Sultanate', span_=life('Carnatic Sultanate')))

    # ---- the south ----
    T.append(row('vijayanagara-empire', 'Vijayanagara Empire', '#c08a2a', SAS, 'Vijayanagara Empire', span_=life1('Vijayanagara Empire', endEvent='vijayanagara-end')))
    T.append(row('pandya-dynasty', 'Pandyas', '#2a5a8a', SAS, 'Pandya dynasty', span_=life1('Pandya dynasty', circa=True)))
    km = 'Kingdom of Mysore'
    T.append(row('kingdom-of-mysore', 'Kingdom of Mysore', '#9a3a3a', SAS, km, span_=life(km, endEvent='mysore-accession'), phases=[
        phase('Sultanate of Hyder Ali and Tipu Sultan', L(km, 'Muslim rule from 1761 to 1799', 1761), L(km, 'Muslim rule from 1761 to 1799', 1799),
              endEvent='siege-of-seringapatam'),
    ], memberOf=[
        member('british-empire', L(km, 'princely state in the British Raj from 1799 to 1947', 1799), L(km, 'princely state in the British Raj from 1799 to 1947', 1947),
               sources=[lead(km, 'princely state in the British Raj from 1799 to 1947')], startEvent='siege-of-seringapatam'),
    ]))
    T.append(row('nayakas-of-keladi', 'Nayakas of Keladi', '#6a4a2a', SAS, 'Nayakas of Keladi', span_=life('Nayakas of Keladi', endEvent='keladi-absorbed')))
    T.append(row('madurai-nayak-dynasty', 'Madurai Nayak dynasty', '#8a3a6a', SAS, 'Madurai Nayak dynasty',
                 span_=life('Madurai Nayak dynasty', startEvent='madurai-nayaks-founded', endEvent='madurai-nayaks-end')))
    T.append(row('thanjavur-nayak-kingdom', 'Thanjavur Nayak kingdom', '#3a5a8a', SAS, 'Thanjavur Nayak kingdom',
                 span_=life('Thanjavur Nayak kingdom', startEvent='thanjavur-nayaks-founded', endEvent='thanjavur-nayaks-end')))
    T.append(row('calicut-kingdom', 'Calicut kingdom', '#4a7a8a', SAS, 'Calicut kingdom', span_=life('Calicut kingdom', endEvent='calicut-to-company')))

    # ---- Ceylon ----
    T.append(row('jaffna-kingdom', 'Jaffna Kingdom', '#5a3a8a', SAS, 'Jaffna kingdom', span_=life1('Jaffna kingdom', endEvent='portuguese-conquest-of-jaffna'),
                 memberOf=[member('sri-lanka', ev_claim('Jaffna kingdom', 3), ev_claim('Jaffna kingdom', 4),
                                  sources=[E('Jaffna kingdom', 3)[1]])]))
    sw = 'Kingdom of Sitawaka'
    T.append(row('kingdom-of-sitawaka', 'Kingdom of Sitawaka', '#8a5a3a', SAS, sw, span_=span(stretch(
        None, F(sw, 'year_start', 'start'),
        F(sw, 'year_end', 'end') + L(sw, 'death of its last king Rajasinha I in 1593', 1593, 'The lead dates Rajasinha I\'s death to 1593.'),
        startEvent='spoiling-of-vijayabahu', endEvent='sitawaka-end'))))
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

    def iev(uuid, title, article, n, tracks, **kw):
        """An infobox event; a range ("1615–1682") gives the event's end."""
        y, r = E(article, n)
        f = G.art(article)['fields'].get(f'date_event{n}', {})
        ys = f.get('years') or []
        if len(ys) > 1 and ys[-1] > ys[0] and 'end' not in kw:
            kw['end'] = ys[-1]
        return ev(uuid, title, y, tracks, r, **kw)

    def lev(uuid, title, article, needle, year, tracks, **kw):
        return ev(uuid, title, year, tracks, lead(article, needle), **kw)

    def sev(uuid, title, article, section, needle, year, tracks, **kw):
        for s in G.art(article)['body']['section_openers']:
            if s['section'] == section and needle in s['text']:
                return ev(uuid, title, year, tracks, G.ref(article, f'section "{section}": "{s["text"][:160]}"'), **kw)
        raise SystemExit(f'{article}: no opener in {section!r} with {needle!r}')

    MU, BE, IN = 'mughal-empire', 'british-empire', 'india'
    return [
        # ---------- Iran ----------
        wev('battle-of-sharur', 'Battle of Sharur', 'Battle of Sharur', ['iran', 'aq-qoyunlu'], importance=1,
            descr='Ismail defeats the Aq Qoyunlu and takes Tabriz, where he is crowned shah: the Safavid state begins.'),
        wev('battle-of-hamadan-1503', 'Battle of Hamadan', 'Battle of Hamadan (1503)', ['aq-qoyunlu', 'iran'],
            descr='Ismail defeats the last Aq Qoyunlu ruler in Iran.'),
        wev('battle-of-chaldiran', 'Battle of Chaldiran', 'Battle of Chaldiran', ['iran', 'ottoman-empire'], importance=1,
            descr='The Ottomans defeat Shah Ismail; eastern Anatolia passes to the Ottomans.'),
        fev('hotak-revolt', 'Hotak revolt in Kandahar', 'Hotak dynasty', 'year_start', ['hotak-dynasty', 'iran'],
            descr='Mirwais Hotak rebels against the Safavid governor of Kandahar.'),
        wev('battle-of-gulnabad', 'Battle of Gulnabad', 'Battle of Gulnabad', ['hotak-dynasty', 'iran'],
            descr='The Afghan army routs the Safavid army outside Isfahan.'),
        wev('siege-of-isfahan', 'Siege of Isfahan', 'Siege of Isfahan', ['iran', 'hotak-dynasty'], importance=1,
            descr='Isfahan falls to Mahmud Hotak after a seven-month siege; Shah Soltan Hoseyn abdicates.'),
        wev('battle-of-damghan', 'Battle of Damghan', 'Battle of Damghan (1729)', ['iran', 'hotak-dynasty'],
            descr='Nader, fighting for the Safavid heir, defeats Ashraf Hotak; the Afghans lose Iran.'),
        fev('nader-crowned', 'Nader Shah crowned', 'Afsharid Iran', 'year_start', ['iran'], importance=1,
            descr='Nader deposes the last Safavid and is proclaimed shah.'),
        fev('siege-of-kandahar-1738', 'Siege of Kandahar', 'Hotak dynasty', 'year_end', ['hotak-dynasty', 'iran'],
            descr='Nader Shah takes Kandahar from Hussain Hotak; Hotak rule ends.'),
        wev('nader-invasion-of-india', "Nader Shah's invasion of India", "Nader Shah's invasion of the Mughal Empire", ['iran', MU], importance=1,
            descr='Nader Shah defeats the Mughals at Karnal and sacks Delhi.'),
        fev('qajar-conquest-of-zand', 'Qajar conquest of the Zands', 'Zand Iran', 'year_end', ['iran'],
            descr='Agha Mohammad Khan Qajar takes Kerman and executes Lotf Ali Khan, the last Zand ruler.'),
        iev('treaty-of-turkmenchay', 'Treaty of Turkmenchay', 'Qajar Iran', 2, ['iran'],
            descr='Iran cedes its remaining Caucasus khanates to Russia.'),
        wev('persian-constitutional-revolution', 'Persian Constitutional Revolution', 'Persian Constitutional Revolution', ['iran'], importance=1,
            descr='A constitution and an elected Majles are won from the Qajar shah.'),
        fev('pahlavi-dynasty-founded', 'Pahlavi dynasty founded', 'Pahlavi Iran', 'year_start', ['iran'],
            descr='The Majles deposes the Qajars and proclaims Reza Khan shah.'),
        wev('anglo-soviet-invasion-of-iran', 'Anglo-Soviet invasion of Iran', 'Anglo-Soviet invasion of Iran', ['iran'],
            descr='British and Soviet forces occupy Iran; Reza Shah abdicates in favour of his son.'),
        wev('iranian-coup-1953', '1953 Iranian coup', '1953 Iranian coup d\'état', ['iran'],
            descr='Prime Minister Mosaddegh is overthrown; the Shah returns to power.'),
        wev('iranian-revolution', 'Iranian Revolution', 'Iranian Revolution', ['iran'], importance=1,
            descr='The monarchy falls; an Islamic Republic is proclaimed under Khomeini.'),
        wev('iran-iraq-war', 'Iran–Iraq War', 'Iran–Iraq War', ['iran'], importance=1, descr='Iraq invades Iran; eight years of war end in stalemate.'),
        # ---------- Timurids ----------
        iev('fall-of-samarkand-1501', 'Fall of Samarkand', 'Timurid Empire', 3, ['timurid-empire'], descr='The Uzbeks take Samarkand from the Timurids.'),
        fev('fall-of-herat', 'Fall of Herat', 'Timurid Empire', 'year_end', ['timurid-empire'], importance=1,
            descr='The Uzbeks take Herat, the last Timurid capital.'),
        # ---------- Afghanistan ----------
        fev('durrani-empire-founded', 'Durrani Empire founded', 'Durrani Empire', 'year_start', ['durrani-empire'], importance=1,
            descr='Ahmad Shah Durrani founds an Afghan empire after Nader Shah\'s death.'),
        wev('third-battle-of-panipat', 'Third Battle of Panipat', 'Third Battle of Panipat', ['maratha-empire', 'durrani-empire'], importance=1,
            descr='Ahmad Shah Durrani defeats the Marathas north of Delhi.'),
        iev('fall-of-kabul-1823', 'Fall of Kabul', 'Durrani Empire', 3, ['durrani-empire', 'afghanistan'],
            descr='The Barakzai sardars take Kabul; the Sadozai empire ends and the Emirate begins.'),
        wev('battle-of-nowshera', 'Battle of Nowshera', 'Battle of Nowshera', ['sikh-empire', 'afghanistan'],
            descr='The Sikhs defeat the Afghans and take the Peshawar valley.'),
        wev('battle-of-jamrud', 'Battle of Jamrud', 'Battle of Jamrud', ['sikh-empire', 'afghanistan']),
        wev('first-anglo-afghan-war', 'First Anglo-Afghan War', 'First Anglo-Afghan War', ['afghanistan', 'durrani-empire', BE, IN], importance=1,
            descr='The British restore Shah Shuja in Kabul; their army is destroyed in the retreat of 1842.'),
        fev('fall-of-herat-1863', 'Fall of Herat', 'Durrani Empire', 'year_end', ['durrani-empire', 'afghanistan'],
            descr='Dost Mohammad Khan takes Herat, the last Durrani principality, and unites Afghanistan.'),
        wev('second-anglo-afghan-war', 'Second Anglo-Afghan War', 'Second Anglo-Afghan War', ['afghanistan', BE, IN]),
        iev('treaty-of-gandamak', 'Treaty of Gandamak', 'Emirate of Afghanistan', 4, ['afghanistan', BE],
            descr='Britain takes control of Afghanistan\'s foreign affairs.'),
        wev('third-anglo-afghan-war', 'Third Anglo-Afghan War', 'Third Anglo-Afghan War', ['afghanistan', BE, IN]),
        wev('anglo-afghan-treaty-1919', 'Anglo-Afghan Treaty of 1919', 'Anglo-Afghan Treaty of 1919', ['afghanistan', BE], importance=1,
            descr='Britain recognises Afghanistan\'s full independence.'),
        fev('afghan-kingdom-1926', 'Kingdom of Afghanistan proclaimed', 'Kingdom of Afghanistan', 'year_start', ['afghanistan'],
            descr='Amanullah Khan takes the title of king.'),
        wev('afghan-coup-1973', '1973 Afghan coup', '1973 Afghan coup d\'état', ['afghanistan'],
            descr='Mohammad Daoud Khan overthrows King Zahir Shah and proclaims a republic.'),
        wev('saur-revolution', 'Saur Revolution', 'Saur Revolution', ['afghanistan'], importance=1,
            descr='The communist PDPA kills Daoud Khan and seizes power.'),
        wev('soviet-afghan-war', 'Soviet–Afghan War', 'Soviet–Afghan War', ['afghanistan'], importance=1,
            descr='Soviet forces fight the mujahideen for nine years and withdraw in 1989.'),
        fev('taliban-capture-kabul-1996', 'Taliban take Kabul', iea_t := 'Islamic Emirate of Afghanistan (1996–2001)', 'year_start', ['afghanistan'],
            descr='The Taliban capture Kabul and proclaim their emirate.'),
        iev('us-invasion-afghanistan', 'United States invasion of Afghanistan', iea_t, 2, ['afghanistan'], importance=1,
            descr='A US-led coalition and the Northern Alliance overthrow the Taliban.'),
        wev('fall-of-kabul-2021', 'Fall of Kabul', 'Fall of Kabul (2021)', ['afghanistan'], importance=1,
            descr='The Taliban enter Kabul; the Islamic Republic collapses.'),
        # ---------- Pakistan and Bangladesh ----------
        fev('pakistan-republic', 'Pakistan becomes a republic', 'Pakistan', 'established_date3', ['pakistan', 'bangladesh'],
            descr='The first constitution makes Pakistan an Islamic republic; East Bengal becomes East Pakistan.'),
        wev('india-pakistan-war-1947', 'India–Pakistan war of 1947–1948', 'Indo-Pakistani war of 1947–1948', ['pakistan', IN], importance=1,
            descr='The first war over Kashmir.'),
        wev('pakistan-coup-1958', '1958 Pakistani coup', '1958 Pakistani coup d\'état', ['pakistan'], descr='Ayub Khan takes power.'),
        wev('india-pakistan-war-1965', 'India–Pakistan war of 1965', 'Indo-Pakistani war of 1965', ['pakistan', IN]),
        wev('bangladesh-liberation-war', 'Bangladesh Liberation War', 'Bangladesh Liberation War', ['bangladesh', 'pakistan', IN], importance=1,
            descr='East Pakistan fights for independence; Pakistani forces surrender on 16 December 1971.'),
        fev('pakistan-constitution-1973', 'Constitution of Pakistan', 'Pakistan', 'established_date6', ['pakistan'], descr='The current constitution.'),
        wev('kargil-war', 'Kargil War', 'Kargil War', ['pakistan', IN]),
        fev('bangladesh-constitution-1972', 'Constitution of Bangladesh', 'Bangladesh', 'established_date6', ['bangladesh']),
        wev('assassination-of-mujib', 'Assassination of Sheikh Mujibur Rahman', 'Assassination of Sheikh Mujibur Rahman', ['bangladesh'], importance=1),
        wev('july-uprising', 'July Uprising', 'July Revolution (Bangladesh)', ['bangladesh'], descr='A mass uprising ousts Sheikh Hasina.'),
        # ---------- Nepal and the Himalaya ----------
        lev('almora-capital', 'Almora becomes the capital of Kumaon', 'Kingdom of Kumaon', 'finally to Almora in 1563', 1563, ['kingdom-of-kumaon']),
        wev('battle-of-kirtipur', 'Battle of Kirtipur', 'Battle of Kirtipur', ['nepal'],
            descr='Gorkha takes Kirtipur in its conquest of the Kathmandu Valley.'),
        fev('nepal-unification', 'Unification of Nepal', 'Kingdom of Nepal', 'year_start', ['nepal'], importance=1,
            descr='Prithvi Narayan Shah conquers the Kathmandu Valley; Gorkha becomes the Kingdom of Nepal.'),
        fev('gorkha-annexation-of-kumaon', 'Nepal annexes Kumaon', 'Kingdom of Kumaon', 'year_end', ['kingdom-of-kumaon', 'nepal']),
        iev('nepalese-invasion-of-sikkim', 'Nepalese invasion of Sikkim', 'Kingdom of Sikkim', 3, ['kingdom-of-sikkim', 'nepal']),
        wev('anglo-nepalese-war', 'Anglo-Nepalese War', 'Anglo-Nepalese War', ['nepal', BE, IN], importance=1),
        wev('treaty-of-sugauli', 'Treaty of Sugauli', 'Treaty of Sugauli', ['nepal', BE], descr='Nepal cedes its western and southern conquests to the East India Company.'),
        iev('treaty-of-titalia', 'Treaty of Titalia', 'Kingdom of Sikkim', 4, ['kingdom-of-sikkim', BE]),
        iev('darjeeling-ceded', 'Darjeeling given to British India', 'Kingdom of Sikkim', 5, ['kingdom-of-sikkim', BE]),
        fev('nepal-britain-treaty-1923', 'Nepal–Britain Treaty', 'Nepal', 'established_date3', ['nepal', BE], descr='Britain recognises Nepal\'s independence.'),
        wev('nepalese-civil-war', 'Nepalese Civil War', 'Nepalese Civil War', ['nepal'], importance=1),
        wev('nepalese-royal-massacre', 'Nepalese royal massacre', '2001 Nepalese royal massacre', ['nepal']),
        fev('nepal-republic', 'Nepal becomes a republic', 'Nepal', 'established_date4', ['nepal'], importance=1, descr='The monarchy is abolished.'),
        fev('nepal-constitution-2015', 'Constitution of Nepal', 'Nepal', 'established_date5', ['nepal']),
        fev('sikkim-merger', 'Sikkim merges with India', 'Kingdom of Sikkim', 'year_end', ['kingdom-of-sikkim', IN], importance=1,
            descr='The monarchy is abolished and Sikkim becomes a state of India.'),
        # Bhutan
        ev('bhutan-unification', 'Unification of Bhutan', 1616, ['bhutan'], F('Bhutan', 'established_date1', 'start')[0]['source'], end=1634,
           descr='The Zhabdrung unifies Bhutan.'),
        wev('duar-war', 'Duar War', 'Duar War', ['bhutan', BE, IN]),
        fev('wangchuk-dynasty', 'Wangchuk dynasty', 'Bhutan', 'established_date3', ['bhutan'], importance=1,
            descr='Ugyen Wangchuck is crowned the first hereditary king.'),
        wev('treaty-of-punakha', 'Treaty of Punakha', 'Treaty of Punakha', ['bhutan', BE], descr='Britain takes charge of Bhutan\'s foreign relations.'),
        fev('india-bhutan-treaty-1949', 'India–Bhutan treaty', 'Bhutan', 'established_date5', ['bhutan', IN]),
        fev('bhutan-constitution-2008', 'Bhutan becomes a constitutional monarchy', 'Bhutan', 'established_date6', ['bhutan'], importance=1),
        # ---------- Maldives ----------
        lev('maldives-protectorate', 'Maldives becomes a British protectorate', 'Maldives', 'British protectorate in 1887', 1887, ['maldives', BE]),
        fev('maldives-independence', 'Maldives independent', 'Maldives', 'established_date1', ['maldives', BE], importance=1),
        fev('maldives-republic', 'Maldives becomes a republic', 'Maldives', 'established_date2', ['maldives']),
        sev('maldives-tsunami', 'Indian Ocean tsunami', 'Maldives', 'History > 21st century', 'tsunami on 26 December 2004', 2004, ['maldives', 'sri-lanka']),
        fev('maldives-constitution-2008', 'Constitution of the Maldives', 'Maldives', 'established_date3', ['maldives'],
            descr='The constitution opens the way to the first multi-party presidential election.'),
        # ---------- Sri Lanka ----------
        fev('portuguese-arrival-ceylon', 'Portuguese arrive in Ceylon', 'Portuguese Ceylon', 'date_pre', ['sri-lanka', 'portuguese-empire']),
        fev('spoiling-of-vijayabahu', 'Spoiling of Vijayabahu', 'Kingdom of Sitawaka', 'year_start', ['sri-lanka', 'kingdom-of-sitawaka'],
            descr='The Kingdom of Kotte is divided between three brothers.'),
        wev('battle-of-mulleriyawa', 'Battle of Mulleriyawa', 'Battle of Mulleriyawa', ['kingdom-of-sitawaka', 'portuguese-empire']),
        fev('sitawaka-end', 'Death of Rajasinha I of Sitawaka', 'Kingdom of Sitawaka', 'year_end', ['kingdom-of-sitawaka']),
        fev('death-of-dharmapala', 'Death of Dharmapala of Kotte', 'Portuguese Ceylon', 'year_start', ['sri-lanka', 'portuguese-empire'], importance=1,
            descr='The last king of Kotte dies without an heir, having left his kingdom to the Portuguese crown.'),
        wev('portuguese-conquest-of-jaffna', 'Portuguese conquest of the Jaffna kingdom', 'Portuguese conquest of the Jaffna kingdom', ['jaffna-kingdom', 'portuguese-empire'],
            descr='Portuguese campaigns end the Jaffna kingdom in 1619.'),
        wev('battle-of-randeniwela', 'Battle of Randeniwela', 'Battle of Randeniwela', ['sri-lanka', 'portuguese-empire'],
            descr='Kandy destroys a Portuguese army.'),
        wev('dutch-portuguese-war', 'Dutch–Portuguese War', 'Dutch–Portuguese War', ['sri-lanka', 'portuguese-empire', 'dutch-empire'], importance=1,
            descr='The Dutch take Portugal\'s Asian colonies, Ceylon among them (1638–58).'),
        fev('british-capture-of-ceylon', 'British capture Dutch Ceylon', 'British Ceylon', 'year_start', ['sri-lanka', 'dutch-empire', BE]),
        wev('kandyan-convention', 'Kandyan Convention', 'Kandyan Convention', ['sri-lanka', BE], importance=1,
            descr='The Kandyan chiefs cede the kingdom to the British Crown; the whole island is British.'),
        fev('ceylon-independence', 'Ceylon independent', 'Sri Lanka', 'established_date7', ['sri-lanka', BE], importance=1),
        fev('sri-lanka-republic', 'Sri Lanka becomes a republic', 'Sri Lanka', 'established_date8', ['sri-lanka'], descr='Ceylon is renamed Sri Lanka.'),
        wev('sri-lankan-civil-war', 'Sri Lankan civil war', 'Sri Lankan Civil War', ['sri-lanka'], importance=1,
            descr='The government fights the Liberation Tigers of Tamil Eelam; the war ends with the Tigers\' defeat.'),
        # ---------- Northern India ----------
        lev('langah-annexed', 'Arghuns annex the Langah Sultanate', 'Langah Sultanate', 'annexed in 1528 by the Arghun dynasty', 1528, ['langah-sultanate']),
        lev('mughals-take-multan', 'Mughals annex Multan', 'Langah Sultanate', 'annexed in 1528 by the Arghun dynasty', 1530, ['langah-sultanate', MU]),
        fev('gajapati-end', 'End of the Gajapati Empire', 'Gajapati Empire', 'year_end', ['gajapati-empire']),
        fev('pandya-end', 'End of the Pandya dynasty', 'Pandya dynasty', 'year_end', ['pandya-dynasty']),
        wev('battle-of-khanwa', 'Battle of Khanwa', 'Battle of Khanwa', [MU, 'mewar'], importance=1,
            descr='Babur defeats the Rajput confederacy led by Rana Sanga of Mewar.'),
        wev('battle-of-chausa', 'Battle of Chausa', 'Battle of Chausa', ['sur-empire', MU]),
        wev('battle-of-kannauj', 'Battle of Kannauj', 'Battle of Kannauj', ['sur-empire', MU], importance=1,
            descr='Sher Shah Suri drives Humayun out of India.'),
        wev('battle-of-sirhind-1555', 'Battle of Sirhind', 'Battle of Sirhind (1555)', ['sur-empire', MU],
            descr='Humayun defeats Sikandar Shah Suri and recovers the Mughal throne.'),
        wev('second-battle-of-panipat', 'Second Battle of Panipat', 'Second Battle of Panipat', [MU, 'sur-empire'],
            descr='Akbar\'s army defeats Hemu, general of the Sur ruler Adil Shah.'),
        iev('bengal-conquest-of-chittagong', 'Bengal conquers Chittagong', 'Bengal Sultanate', 6, ['bengal-sultanate']),
        wev('battle-of-rajmahal', 'Battle of Rajmahal', 'Battle of Raj Mahal', ['bengal-sultanate', MU], importance=1,
            descr='Akbar\'s army defeats the last Sultan of Bengal.'),
        wev('battle-of-diu-1509', 'Battle of Diu', 'Battle of Diu (1509)', ['gujarat-sultanate', 'portuguese-empire'], importance=1,
            descr='The Portuguese defeat the fleets of Gujarat, the Mamluks and Calicut.'),
        wev('battle-of-gagron', 'Battle of Gagron', 'Battle of Gagron', ['malwa-sultanate', 'mewar']),
        iev('gujarat-conquest-of-malwa', 'Gujarat conquers Malwa', 'Gujarat Sultanate', 5, ['gujarat-sultanate', 'malwa-sultanate']),
        iev('treaty-of-bassein-1534', 'Treaty of Bassein', 'Gujarat Sultanate', 6, ['gujarat-sultanate', 'portuguese-empire'],
            descr='Gujarat cedes Bassein and its dependencies to Portugal.'),
        iev('kashmir-mughal-interregnum', 'Mughal interregnum in Kashmir', 'Kashmir Sultanate', 4, ['kashmir-sultanate']),
        fev('mughal-conquest-of-malwa', 'Mughal conquest of Malwa', 'Malwa Sultanate', 'year_end', ['malwa-sultanate', MU]),
        wev('siege-of-chittorgarh', 'Siege of Chittorgarh', 'Siege of Chittorgarh (1567–1568)', ['mewar', MU]),
        fev('mughal-annexation-of-gujarat', 'Mughal annexation of Gujarat', 'Gujarat Sultanate', 'year_end', ['gujarat-sultanate', MU]),
        wev('battle-of-haldighati', 'Battle of Haldighati', 'Battle of Haldighati', ['mewar', MU], importance=1),
        iev('mughal-conquest-of-kashmir', 'Mughal conquest of Kashmir', 'Kashmir Sultanate', 6, ['kashmir-sultanate', MU]),
        iev('khandesh-succession-war', 'Khandesh war of succession', 'Farooqui dynasty', 2, ['khandesh-sultanate', 'gujarat-sultanate']),
        fev('mughal-annexation-of-khandesh', 'Mughal annexation of Khandesh', 'Farooqui dynasty', 'year_end', ['khandesh-sultanate', MU],
            descr='Asirgarh falls to Akbar on 17 January 1601.'),
        iev('ahom-mughal-wars', 'Ahom–Mughal wars', 'Ahom kingdom', 3, ['ahom-kingdom', MU], importance=1),
        iev('moamoria-rebellion', 'Moamoria rebellion', 'Ahom kingdom', 5, ['ahom-kingdom']),
        iev('burmese-invasion-of-assam', 'Burmese invasion of Assam', 'Ahom kingdom', 6, ['ahom-kingdom']),
        fev('treaty-of-yandabo', 'Treaty of Yandabo', 'Ahom kingdom', 'year_end', ['ahom-kingdom', BE, IN], importance=1,
            descr='Burma cedes Assam; the East India Company takes control of the Ahom kingdom.'),
        fev('coronation-of-shivaji', 'Coronation of Shivaji', 'Maratha Empire', 'year_start', ['maratha-empire'], importance=1),
        wev('deccan-wars', 'Deccan wars', 'Mughal–Maratha Wars', ['maratha-empire', MU], importance=1,
            descr='Aurangzeb\'s long war against the Marathas, ended by his death in 1707.'),
        fev('capture-of-lahore-1799', 'Ranjit Singh captures Lahore', 'Sikh Empire', 'year_start', ['sikh-empire'], importance=1,
            descr='Ranjit Singh takes Lahore and begins uniting the Sikh misls into one state.'),
        wev('third-anglo-maratha-war', 'Third Anglo-Maratha War', 'Third Anglo-Maratha War', ['maratha-empire', BE, IN], importance=1,
            descr='The East India Company destroys the Maratha Confederacy.'),
        wev('first-anglo-sikh-war', 'First Anglo-Sikh War', 'First Anglo-Sikh War', ['sikh-empire', BE, IN]),
        wev('second-anglo-sikh-war', 'Second Anglo-Sikh War', 'Second Anglo-Sikh War', ['sikh-empire', BE, IN], importance=1,
            descr='The Company defeats the Sikhs and annexes the Punjab.'),
        wev('battle-of-buxar', 'Battle of Buxar', 'Battle of Buxar', ['oudh-state', MU, BE, IN], importance=1,
            descr='The Company defeats the Nawabs of Bengal and Oudh and the Mughal emperor.'),
        iev('annexation-of-oudh', 'Annexation of Oudh', 'Oudh State', 1, ['oudh-state', BE, IN]),
        fev('mewar-accession', 'Mewar joins the Indian Union', 'Kingdom of Mewar', 'year_end', ['mewar', IN]),
        # ---------- the Deccan ----------
        lev('deccan-revolts-1490', 'Bahmani governors break away', 'Bahmani Kingdom', 'initial revolts of Yusuf Adil Shah', 1490,
            ['bahmani-sultanate', 'ahmadnagar-sultanate', 'bijapur-sultanate', 'berar-sultanate'],
            descr='The governors of Bijapur, Ahmadnagar and Berar revolt; Bahmani power ends in all but name.'),
        fev('golconda-founded', 'Golconda Sultanate founded', 'Golconda Sultanate', 'year_start', ['golconda-sultanate', 'bahmani-sultanate']),
        wev('battle-of-raichur', 'Battle of Raichur', 'Battle of Raichur', ['vijayanagara-empire', 'bijapur-sultanate']),
        fev('bahmani-dissolved', 'Bahmani Kingdom dissolved', 'Bahmani Kingdom', 'year_end', ['bahmani-sultanate', 'bidar-sultanate']),
        wev('battle-of-talikota', 'Battle of Talikota', 'Battle of Talikota',
            ['vijayanagara-empire', 'ahmadnagar-sultanate', 'bijapur-sultanate', 'golconda-sultanate', 'bidar-sultanate'], importance=1,
            descr='The allied Deccan sultanates defeat Vijayanagara and sack its capital.'),
        fev('berar-annexed', 'Ahmadnagar annexes Berar', 'Berar Sultanate', 'year_end', ['berar-sultanate', 'ahmadnagar-sultanate']),
        fev('bidar-annexed', 'Bijapur annexes Bidar', 'Bidar Sultanate', 'year_end', ['bidar-sultanate', 'bijapur-sultanate']),
        fev('mughal-annexation-of-ahmadnagar', 'Mughal annexation of Ahmadnagar', 'Ahmadnagar Sultanate', 'year_end', ['ahmadnagar-sultanate', MU]),
        lev('vijayanagara-end', 'End of the Vijayanagara Empire', 'Vijayanagara Empire', 'survived until 1646', 1646, ['vijayanagara-empire']),
        wev('siege-of-bijapur', 'Siege of Bijapur', 'Siege of Bijapur', ['bijapur-sultanate', MU], descr='Aurangzeb conquers Bijapur.'),
        wev('siege-of-golconda', 'Siege of Golconda', 'Siege of Golconda', ['golconda-sultanate', MU], descr='Aurangzeb takes Golconda.'),
        fev('hyderabad-founded', 'Nizam of Hyderabad', 'Hyderabad State', 'year_start', ['hyderabad-state', MU],
            descr='The Mughal viceroy of the Deccan founds the Nizam\'s state.'),
        wev('siege-of-arcot', 'Siege of Arcot', 'Siege of Arcot', ['carnatic-sultanate', BE]),
        iev('carnatic-treaty', 'Carnatic Treaty', 'Carnatic Sultanate', 2, ['carnatic-sultanate', BE],
            descr='The Nawab hands the administration of the Carnatic to the East India Company.'),
        iev('telangana-rebellion', 'Telangana Rebellion', 'Hyderabad State', 1, ['hyderabad-state']),
        wev('annexation-of-hyderabad', 'Indian annexation of Hyderabad', 'Operation Polo', ['hyderabad-state', IN], importance=1),
        # ---------- the south ----------
        wev('battle-of-calicut-1503', 'Battle of Calicut', 'Battle of Calicut (1503)', ['calicut-kingdom', 'portuguese-empire']),
        wev('battle-of-cochin-1504', 'Battle of Cochin', 'Battle of Cochin (1504)', ['calicut-kingdom', 'portuguese-empire']),
        fev('madurai-nayaks-founded', 'Madurai Nayak dynasty founded', 'Madurai Nayak dynasty', 'year_start', ['madurai-nayak-dynasty', 'vijayanagara-empire'],
            descr='Viswanatha Nayak governs Madurai as a viceroy of Vijayanagara.'),
        fev('thanjavur-nayaks-founded', 'Thanjavur Nayak kingdom founded', 'Thanjavur Nayak kingdom', 'year_start', ['thanjavur-nayak-kingdom']),
        lev('keladi-coast-campaign', 'Keladi takes the Portuguese coastal forts', 'Nayakas of Keladi', '1653 campaigns', 1653, ['nayakas-of-keladi', 'portuguese-empire'],
            descr='Keladi captures Mangalore, Barkur, Basrur and Honnavar from the Portuguese.'),
        fev('thanjavur-nayaks-end', 'End of the Thanjavur Nayaks', 'Thanjavur Nayak kingdom', 'year_end', ['thanjavur-nayak-kingdom']),
        fev('madurai-nayaks-end', 'End of the Madurai Nayaks', 'Madurai Nayak dynasty', 'year_end', ['madurai-nayak-dynasty']),
        iev('maratha-mysore-war', 'Maratha–Mysore War', 'Kingdom of Mysore', 3, ['kingdom-of-mysore', 'maratha-empire']),
        fev('keladi-absorbed', 'Hyder Ali conquers Keladi', 'Nayakas of Keladi', 'year_end', ['nayakas-of-keladi', 'kingdom-of-mysore']),
        iev('mysorean-invasion-of-malabar', 'Mysorean invasion of Malabar', 'Calicut kingdom', 1, ['calicut-kingdom', 'kingdom-of-mysore']),
        iev('anglo-mysore-wars', 'Anglo-Mysore Wars', 'Kingdom of Mysore', 2, ['kingdom-of-mysore', BE, IN], importance=1),
        wev('siege-of-seringapatam', 'Siege of Seringapatam', 'Siege of Seringapatam (1799)', ['kingdom-of-mysore', BE, IN], importance=1,
            descr='Tipu Sultan is killed; the Wodeyars are restored under British protection.'),
        fev('calicut-to-company', 'Calicut passes to the East India Company', 'Calicut kingdom', 'year_end', ['calicut-kingdom', BE]),
        fev('mysore-accession', 'Mysore joins India', 'Kingdom of Mysore', 'year_end', ['kingdom-of-mysore', IN]),
    ]
