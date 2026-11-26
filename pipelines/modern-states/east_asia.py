"""
Modern States wave 5: East and South-eastern Asia (2026-11-21). China, Taiwan (de facto; disputed), Japan, the two
Koreas, Mongolia; Brunei, Cambodia, Timor-Leste, Laos, Malaysia, Myanmar, the Philippines, Singapore, Thailand and
Vietnam; plus the historical states after 1500 that the rules give rows. Indonesia comes from colonial.py.

Rules applied (data-format.md and Kevin's decisions, 2026-11-21):
- A row that carries on into a state that exists today takes that state's id; older governments are phases (China's
  dynasties and republics, Japan's shogunates, Joseon and the Korean Empire, Vietnam's dynasties, Ayutthaya…).
- Korea (Kevin): a `korea` row for Joseon and the Korean Empire, Japanese rule as a phase and a membership of `japan`;
  North and South Korea are their own rows from the division, linked by succession events.
- Vietnam (Kevin): split and reunified on one row; North, the State of Vietnam, South and the PRG are rival phases.
- Malaysia and Singapore (Kevin): Singapore was a member of Malaysia 1963–65.
- Taiwan: the Republic of China of 1912–49 is a phase of `china` (its article ends in 1949); the ROC on Taiwan from
  1949 is a phase of the de facto state `taiwan`, whose row starts with Dutch Formosa (Taiwan's infobox).
- Colonial units: French Indochina is its own row (it split into Vietnam, Cambodia and Laos), as are the Straits
  Settlements (Malaysia and Singapore). The Spanish East Indies are a phase of the Philippines. Japanese occupations
  are rival phases with a membership of `japan`, as colonial.py does for Indonesia.
- Tibet: the Ganden Phodrang (1642–1959) is a row; Tibet of 1912–51 is its phase, cited as de facto independent.
- Rows crossing 1500 use the Medieval World timeline's ids, phase names, articles and fields (first value only), so
  the seam holds; Champa and Kutai keep the Ancient timeline's ids and dates.

Called from gen_modern.py with its module (M).
"""

GROUPS = [
    {'id': 'eastern-asia', 'name': 'Eastern Asia', 'color': '#a04a3a', 'parent': 'asia'},
]

EAS, SEA = 'eastern-asia', 'south-eastern-asia'

SHARED = {
    'ww1': ['japan', 'china', 'thailand'],
    'ww2': ['japan', 'china', 'thailand'],
    'russo-japanese-war': ['japan'],
    'aceh-war': ['aceh-sultanate'],
}


def tracks(M):
    G, F, C, E, lead, phase, stretch, span, member, row = (
        M.G, M.F, M.C, M.E, M.lead, M.phase, M.stretch, M.span, M.member, M.row)

    def S1(t, spec='year_start'):
        return F(t, spec, 'start')[:1]

    def E1(t, spec):
        return F(t, spec, 'end')[:1]

    def est(t, k):
        return F(t, f'established_date{k}', 'start')[:1]

    def est_last(t, k):
        return F(t, f'established_date{k}:last', 'end')[:1]

    def cur(t, k, note=''):
        f = G.art(t)['fields']
        return G.ref(t, f"infobox established_event{k}: {f[f'established_event{k}']['text']}, "
                        f"{f.get(f'established_date{k}', {}).get('text', '')} (current state{note})".replace(', ,', ','))

    def ref_est(t, k):
        f = G.art(t)['fields']
        return G.ref(t, f"infobox established_event{k}: {f[f'established_event{k}']['text']}, {f.get(f'established_date{k}', {}).get('text', '')}")

    def ev_c(t, n):
        """An infobox event's year as a claim (date_eventN)."""
        y, r = E(t, n)
        return [{'year': y, 'source': r}]

    def evd(t, n, side):
        """First or last year of an infobox event's date range (date_eventN), as a claim."""
        return F(t, f'date_event{n}' + (':last' if side == 'end' else ''), side)[:1]

    def L(t, needle, year, note=None):
        c = {'year': year, 'source': lead(t, needle)}
        if note:
            c['note'] = note
        return [c]

    def life(t, s='year_start', e='year_end', *, startEvent=None, endEvent=None, circa=False, one=False):
        sc, ec = F(t, s, 'start'), F(t, e, 'end')
        if one:
            sc, ec = sc[:1], ec[:1]
        return span(stretch(None, sc, ec, startEvent=startEvent, endEvent=endEvent, circa=circa))

    def ph(name, t, s='year_start', e='year_end', **kw):
        return phase(name, F(t, s, 'start'), F(t, e, 'end'), **kw)

    # ---- the Medieval World timeline's side of the seam: the same articles and fields as medieval.json, first value
    # only, so the phases and lifespans that cross 1500 match it (seam check, 2026-11-21) ----
    def mph(name, t, s='year_start', e='year_end', **kw):
        return phase(name, F(t, s, 'start')[:1], F(t, e, 'end')[:1], **kw)

    def mlife(t, s='year_start', e='year_end', **kw):
        return span(stretch(None, F(t, s, 'start')[:1], F(t, e, 'end')[:1], **kw))

    surrender = 'surrender-of-japan'
    eoj = 'Empire of Japan'
    T = []

    # ================= Eastern Asia =================
    ming, qing, roc, sm = 'Ming dynasty', 'Qing dynasty', 'Republic of China (1912–1949)', 'Southern Ming'
    T.append(row('china', 'China', '#c0302f', EAS, 'China', phases=[
        mph('Ming dynasty', ming, endEvent='fall-of-beijing'),
        # rival regimes of the Ming–Qing transition: Li Zicheng's Shun and the Ming loyalists in the south
        ph('Shun dynasty', 'Shun dynasty', startEvent='fall-of-beijing'),
        ph('Southern Ming', sm, 'seg0.start', 'seg0.end'),
        phase('Qing dynasty', F(qing, 'year_start', 'start'), F(qing, 'seg0.end', 'end'), startEvent='ming-qing-transition',
              endEvent='xinhai-revolution'),
        ph('Taiping Heavenly Kingdom', 'Taiping Heavenly Kingdom', startEvent='taiping-rebellion', endEvent='taiping-rebellion'),
        phase('Republic of China', F(roc, 'seg0.start', 'start'), F(roc, 'year_end', 'end'), startEvent='xinhai-revolution',
              endEvent='chinese-civil-war'),
        # rival governments inside the Republic's years: the Communists' soviet republic, the Japanese-sponsored regime
        ph('Chinese Soviet Republic', 'Chinese Soviet Republic'),
        ph('Reorganized National Government (Japanese puppet)', 'Wang Jingwei regime', endEvent=surrender),
        phase("People's Republic of China", est('China', 4), ongoing=cur('China', 4), startEvent='prc-proclaimed'),
    ]))

    df, sf, tq, tj = 'Dutch Formosa', 'Spanish Formosa', 'Taiwan under Qing rule', 'Taiwan under Japanese rule'
    T.append(row('taiwan', 'Taiwan (disputed)', '#3a7ac0', EAS, 'Taiwan',
                 # 1945–49 a province of the mainland Republic with no government of its own: the lifespan carries it
                 span_=span(stretch(None, est('Taiwan', 1), ongoing=cur('Taiwan', 6, '; the Republic of China, recognised by few states'
                                                                       ' and claimed by the People\'s Republic'))),
                 phases=[
        ph('Dutch Formosa', df, endEvent='siege-of-fort-zeelandia'),
        ph('Spanish Formosa', sf),
        ph('Kingdom of Tungning', 'Kingdom of Tungning', startEvent='siege-of-fort-zeelandia', endEvent='qing-annexes-taiwan'),
        ph('Taiwan under Qing rule', tq, startEvent='qing-annexes-taiwan', endEvent='treaty-of-shimonoseki'),
        ph('Republic of Formosa', 'Republic of Formosa'),
        ph('Taiwan under Japanese rule', tj, 'seg0.start', 'seg0.end', startEvent='treaty-of-shimonoseki', endEvent=surrender),
        phase('Republic of China (Taiwan)', est('Taiwan', 6),
              ongoing=G.ref('Taiwan', 'lead: "Taiwan maintains official diplomatic relations with 11 out of 193 UN member states and the Holy See." '
                                      '(current state; disputed)'), startEvent='chinese-civil-war'),
    ], memberOf=[
        member('dutch-empire', S1(df), E1(df, 'year_end'), sources=[G.ref(df, 'infobox: Dutch Formosa, 1624–1662')], endEvent='siege-of-fort-zeelandia'),
        member('spanish-empire', S1(sf), E1(sf, 'year_end'), sources=[G.ref(sf, 'infobox: Spanish Formosa, 1626–1642')]),
        member('china', S1(tq), E1(tq, 'year_end'), sources=[lead('Taiwan', 'annexed in 1683 by the Qing')], startEvent='qing-annexes-taiwan',
               endEvent='treaty-of-shimonoseki'),
        member('japan', S1(tj, 'seg0.start'), E1(tj, 'seg0.end'), sources=[lead('Taiwan', 'ceded to the Empire of Japan in 1895')],
               startEvent='treaty-of-shimonoseki', endEvent=surrender),
        member('china', est('Taiwan', 5), est('Taiwan', 6), sources=[ref_est('Taiwan', 5)], endEvent='chinese-civil-war'),
    ]))

    ash, am, tok, ooj = 'Ashikaga shogunate', 'Azuchi–Momoyama period', 'Tokugawa shogunate', 'Occupation of Japan'
    T.append(row('japan', 'Japan', '#d04a5a', EAS, 'Japan', phases=[
        mph('Ashikaga (Muromachi) shogunate', ash),
        ph('Azuchi–Momoyama period', am),
        phase('Tokugawa shogunate', F(tok, 'seg0.start', 'start') + S1(tok), F(tok, 'seg0.end', 'end'), endEvent='meiji-restoration'),
        phase('Empire of Japan', F(eoj, 'year_start', 'start'), F(eoj, 'year_end', 'end'), startEvent='meiji-restoration'),
        # the Allied occupation ran alongside the Japanese government: a parallel phase
        ph('Allied occupation', ooj, startEvent=surrender, endEvent='treaty-of-san-francisco'),
        phase('State of Japan', E1(eoj, 'year_end'), ongoing=G.ref('Japan', 'lead: "With a population of almost 123 million as of 2026, it is the '
                                                                   'world\'s 11th most populous country." (current state)')),
    ]))
    T.append(row('ryukyu-kingdom', 'Ryukyu Kingdom', '#3a9a9a', EAS, 'Ryukyu Kingdom', span_=mlife('Ryukyu Kingdom', endEvent='ryukyu-annexed'),
                 memberOf=[member('japan', ev_c('Ryukyu Kingdom', 1), E1('Ryukyu Kingdom', 'year_end'),
                                  sources=[lead('Ryukyu Kingdom', 'vassal state of the Satsuma Domain')], startEvent='invasion-of-ryukyu',
                                  endEvent='ryukyu-annexed')]))

    jos, ke, kjr, pgk, prk = 'Joseon', 'Korean Empire', 'Korea under Japanese rule', 'Provisional Government of the Republic of Korea', "People's Republic of Korea"
    T.append(row('korea', 'Korea', '#2a6aa0', EAS, 'Korea', phases=[
        mph('Joseon', jos, endEvent='korean-empire-proclaimed'),
        ph('Korean Empire', ke, startEvent='korean-empire-proclaimed', endEvent='japan-annexes-korea'),
        ph('Korea under Japanese rule', kjr, 'seg0.start', 'seg0.end', startEvent='japan-annexes-korea', endEvent=surrender),
        # the government-in-exile and the short-lived People's Republic ran alongside: rival phases
        ph('Provisional Government (in exile)', pgk, 'seg0.start', 'seg0.end', startEvent='march-first-movement'),
        ph("People's Republic of Korea", prk, endEvent='division-of-korea'),
    ], memberOf=[
        member('japan', ev_c(ke, 2), E1(kjr, 'seg0.end'), sources=[G.ref(kjr, 'infobox event_pre: Japanese protectorate, 17 November 1905'),
                                                                  lead('Japan', 'followed by Korea in 1910')],
               startEvent='eulsa-treaty', endEvent=surrender),
    ]))
    nk, sk, sca, usa = 'North Korea', 'South Korea', 'Soviet Civil Administration', 'United States Army Military Government in Korea'
    T.append(row('north-korea', 'North Korea', '#b03a3a', EAS, nk, phases=[
        phase('Soviet Civil Administration', est(nk, 2), E1(sca, 'date_end'), startEvent='division-of-korea'),
        phase("Democratic People's Republic of Korea", est(nk, 5), ongoing=cur(nk, 6)),
    ]))
    fr, scnr = 'First Republic of Korea', 'Supreme Council for National Reconstruction'
    T.append(row('south-korea', 'South Korea', '#3a5ab0', EAS, sk, phases=[
        ph('US Army Military Government', usa, startEvent='division-of-korea'),
        ph('First Republic', fr, endEvent='april-revolution'),
        ph('Second Republic', 'Second Republic of Korea', startEvent='april-revolution', endEvent='may-16-coup'),
        ph('Military government', scnr, startEvent='may-16-coup'),
        ph('Third Republic', 'Third Republic of Korea'),
        ph('Fourth Republic', 'Fourth Republic of Korea'),
        ph('Fifth Republic', 'Fifth Republic of Korea', 'seg0.start', 'seg0.end', endEvent='june-democratic-struggle'),
        phase('Sixth Republic', E1('Fifth Republic of Korea', 'year_end'), ongoing=cur(sk, 4)),
    ]))

    ny, bk, mpr, muq = 'Northern Yuan', 'Bogd Khanate of Mongolia', "Mongolian People's Republic", 'Mongolia under Qing rule'
    T.append(row('mongolia', 'Mongolia', '#3a8ac0', EAS, 'Mongolia',
                 # under the Qing (1635/1691–1911) Mongolia had no government of its own: the lifespan carries it
                 span_=span(stretch(None, S1(ny), ongoing=cur('Mongolia', 7))),
                 phases=[
        mph('Northern Yuan', ny, endEvent='ejei-khan-submits'),
        phase('Bogd Khanate', F(bk, 'seg0.start', 'start'), F(bk, 'seg0.end', 'end'), startEvent='mongolian-revolution-1911'),
        phase('Bogd Khanate (restored)', F(bk, 'seg1.start', 'start'), F(bk, 'seg1.end', 'end'), startEvent='mongolian-revolution-1921'),
        ph("Mongolian People's Republic", mpr),
        phase('Mongolia', est('Mongolia', 7), ongoing=cur('Mongolia', 7)),
    ], memberOf=[
        member('china', S1(muq) + [dict(est('Mongolia', 4)[0], note='The Khalkha of Outer Mongolia submitted in 1691.')],
               est('Mongolia', 5) + E1(muq, 'year_end'), sources=[lead(muq, 'ruled Inner and Outer Mongolia')],
               startEvent='ejei-khan-submits', endEvent='mongolian-revolution-1911'),
        member('china', evd(bk, 3, 'start'), evd(bk, 3, 'end'), sources=[G.ref(bk, 'infobox event3: Autonomy revoked, 1919–1921')],
               endEvent='mongolian-revolution-1921'),
    ]))
    T.append(row('four-oirat', 'Four Oirat', '#9a7a3a', EAS, 'Oirat Confederation', span_=mlife('Oirat Confederation')))
    T.append(row('dzungar-khanate', 'Dzungar Khanate', '#8a6a2a', EAS, 'Dzungar Khanate', span_=life('Dzungar Khanate', endEvent='dzungar-qing-wars')))
    T.append(row('khoshut-khanate', 'Khoshut Khanate', '#7a6a4a', EAS, 'Khoshut Khanate', span_=life('Khoshut Khanate')))
    T.append(row('later-jin', 'Later Jin', '#6a5a8a', EAS, 'Later Jin (1616–1636)', span_=life('Later Jin (1616–1636)', endEvent='qing-proclaimed')))
    mk = 'Manchukuo'
    T.append(row('manchukuo', 'Manchukuo', '#a08a3a', EAS, mk, span_=life(mk, startEvent='japanese-invasion-of-manchuria', endEvent='soviet-invasion-of-manchuria'),
                 memberOf=[member('japan', S1(mk), E1(mk, 'year_end'), sources=[lead(mk, 'puppet state of the Empire of Japan')],
                                  startEvent='japanese-invasion-of-manchuria', endEvent='soviet-invasion-of-manchuria')]))
    mj = 'Mengjiang'
    T.append(row('mengjiang', 'Mengjiang', '#8a7a5a', EAS, mj, span_=life(mj),
                 memberOf=[member('japan', S1(mj), E1(mj, 'year_end'), sources=[lead(mj, 'puppet state of the Empire of Japan')], endEvent=surrender)]))
    T.append(row('yarkent-khanate', 'Yarkent Khanate', '#6a8a5a', EAS, 'Yarkent Khanate', span_=life('Yarkent Khanate')))
    T.append(row('turpan-khanate', 'Turpan Khanate', '#7a8a4a', EAS, 'Turpan Khanate', span_=life('Turpan Khanate', circa=True)))
    kum = 'Kumul Khanate'
    T.append(row('kumul-khanate', 'Kumul Khanate', '#5a7a6a', EAS, kum, span_=life(kum),
                 memberOf=[member('china', S1(kum), E1(kum, 'year_end'), sources=[lead(kum, 'within the Qing dynasty and then the Republic of China')])]))
    T.append(row('yettishar', 'Yettishar', '#5a8a7a', EAS, 'Yettishar', span_=life('Yettishar')))
    T.append(row('first-east-turkestan-republic', 'First East Turkestan Republic', '#4a8a8a', EAS, 'First East Turkestan Republic',
                 span_=life('First East Turkestan Republic')))
    T.append(row('second-east-turkestan-republic', 'Second East Turkestan Republic', '#4a7a9a', EAS, 'Second East Turkestan Republic',
                 span_=life('Second East Turkestan Republic', startEvent='ili-rebellion')))

    # Tibet
    T.append(row('phagmodrupa-dynasty', 'Phagmodrupa dynasty', '#a06a3a', EAS, 'Phagmodrupa dynasty', span_=mlife('Phagmodrupa dynasty')))
    T.append(row('rinpungpa', 'Rinpungpa', '#906a4a', EAS, 'Rinpungpa', span_=mlife('Rinpungpa')))
    T.append(row('tsangpa', 'Tsangpa', '#8a5a3a', EAS, 'Tsangpa', span_=life('Tsangpa')))
    gp, t12, tqr = 'Ganden Phodrang', 'Tibet (1912–1951)', 'Tibet under Qing rule'
    gps = "infobox status: Protectorate of the Khoshut Khanate (1642–1717) Protectorate of the Dzungar Khanate (1717–1720) Protectorate of the Qing dynasty (1720–1912) Protectorate of the People's Republic of China (1951–1959)"
    pg = lambda n, a, b, **kw: phase(n, C(a, gp, gps) if a else F(gp, 'year_start', 'start'), C(b, gp, gps) if b else F(gp, 'year_end', 'end'), **kw)  # noqa: E731
    T.append(row('ganden-phodrang', 'Ganden Phodrang (Tibet)', '#b07a3a', EAS, gp, span_=life(gp, endEvent='tibetan-uprising-1959'),
                 phases=[pg('Protectorate of the Khoshut Khanate', None, 1717), pg('Protectorate of the Dzungar Khanate', 1717, 1720),
                         pg('Protectorate of the Qing dynasty', 1720, 1912, startEvent='chinese-expedition-to-tibet', endEvent='xinhai-revolution'), ph('Tibet (de facto independent; status disputed)', t12, startEvent='xinhai-revolution', endEvent='annexation-of-tibet'),
                         pg("Protectorate of the People's Republic of China", 1951, None, startEvent='annexation-of-tibet', endEvent='tibetan-uprising-1959')], memberOf=[
        member('china', S1(tqr), E1(tqr, 'year_end'), sources=[lead(gp, 'under the Qing protectorate')], startEvent='chinese-expedition-to-tibet', endEvent='xinhai-revolution'),
        member('china', E1(t12, 'year_end'), E1(gp, 'year_end'), sources=[lead(gp, 'Seventeen Point Agreement')], startEvent='annexation-of-tibet', endEvent='tibetan-uprising-1959'),
    ]))

    # ================= South-eastern Asia =================
    fi = 'French Indochina'
    T.append(row('french-indochina', 'French Indochina', '#4a62a8', SEA, fi, span_=life(fi, endEvent='geneva-conference'),
                 memberOf=[
        member('french-colonial-empire', S1(fi), E1(fi, 'year_end'), sources=[G.ref(fi, 'infobox event_start: French Indochina established, 17 October 1887')],
               startEvent='french-indochina-founded', endEvent='geneva-conference'),
        member('japan', ev_c(fi, 3), F(fi, 'seg0.end', 'end'), sources=[G.ref(fi, 'infobox event3: Japanese invasion, 22 September 1940; event5: Japanese coup, 9 March 1945')],
               endEvent=surrender),
    ]))

    le, mac, ts, ngd, coc = 'Lê dynasty', 'Mạc dynasty', 'Tây Sơn dynasty', 'Nguyễn dynasty', 'French Cochinchina'
    nv, sov, sv, prg = 'North Vietnam', 'State of Vietnam', 'South Vietnam', 'Provisional Revolutionary Government of the Republic of South Vietnam'
    T.append(row('vietnam', 'Vietnam', '#c0402a', SEA, 'Vietnam', phases=[
        mph('Later Lê dynasty', le, 'seg0.start', 'seg0.end'),
        # the Mạc held the throne 1527–92 and Cao Bằng until 1677, against the restored Lê: rival phases
        ph('Mạc dynasty', mac),
        mph('Later Lê dynasty (restored)', le, 'seg1.start', 'seg1.end', endEvent='tay-son-wars'),
        ph('Tây Sơn dynasty', ts, startEvent='tay-son-wars', endEvent='tay-son-wars'),
        phase('Nguyễn dynasty', F(ngd, 'seg0.start', 'start'), F(ngd, 'seg0.end', 'end'), startEvent='nguyen-unification', endEvent='august-revolution'),
        ph('French Cochinchina', coc, 'seg0.start', 'seg0.end', startEvent='cochinchina-campaign'),
        ph('Empire of Vietnam (Japanese puppet)', 'Empire of Vietnam', endEvent='august-revolution'),
        phase('Democratic Republic of Vietnam', F(nv, 'seg0.start', 'start'), F(nv, 'seg0.end', 'end'), startEvent='august-revolution',
              endEvent='reunification-of-vietnam'),
        ph('State of Vietnam', sov),
        phase('Republic of Vietnam', F(sv, 'seg0.start', 'start'), F(sv, 'seg0.end', 'end'), endEvent='fall-of-saigon'),
        ph('Provisional Revolutionary Government', prg, endEvent='reunification-of-vietnam'),
        phase('Socialist Republic of Vietnam', est('Vietnam', 11), ongoing=cur('Vietnam', 12), startEvent='reunification-of-vietnam'),
    ], memberOf=[
        member('french-colonial-empire', F(coc, 'seg0.start', 'start'), E1(fi, 'year_end'), sources=[ref_est('Vietnam', 7), lead(coc, 'French')],
               startEvent='cochinchina-campaign', endEvent='geneva-conference'),
        member('french-indochina', S1(fi), E1(fi, 'year_end'), sources=[G.ref(coc, 'infobox event3: Part of French Indochina, 17 October 1887')],
               startEvent='french-indochina-founded', endEvent='geneva-conference'),
    ]))
    T.append(row('champa', 'Champa', '#9a5a4a', SEA, 'Champa', span_=span(stretch(None, F('Champa', 'seg0.start', 'start'), F('Champa', 'seg0.end', 'end')))))

    pa, fpc, kk45, kc53, kr, dk, pk = ('Post-Angkor period', 'French protectorate of Cambodia', 'Kingdom of Kampuchea (1945)', 'Kingdom of Cambodia (1953–1970)',
                                      'Khmer Republic', 'Democratic Kampuchea', "People's Republic of Kampuchea")
    T.append(row('cambodia', 'Cambodia', '#2a5aa0', SEA, 'Cambodia', phases=[
        mph('Khmer Empire', 'Khmer Empire', 'seg0.start', 'date_end'),
        ph('Post-Angkor period', pa, 'seg0.start', 'seg0.end', endEvent='french-protectorate-of-cambodia'),
        ph('French protectorate', fpc, 'seg0.start', 'seg0.end', startEvent='french-protectorate-of-cambodia'),
        ph('Kingdom of Kampuchea (Japanese puppet)', kk45),
        ph('French protectorate (restored)', fpc, 'seg1.start', 'seg1.end', endEvent='cambodian-independence'),
        ph('Kingdom of Cambodia', kc53, 'seg0.start', 'seg0.end', startEvent='cambodian-independence', endEvent='coup-1970'),
        ph('Khmer Republic', kr, startEvent='coup-1970', endEvent='fall-of-phnom-penh'),
        ph('Democratic Kampuchea', dk, 'seg0.start', 'seg0.end', startEvent='fall-of-phnom-penh', endEvent='cambodian-vietnamese-war'),
        ph('Democratic Kampuchea (in exile)', dk, 'seg1.start', 'seg1.end'),
        ph("People's Republic of Kampuchea / State of Cambodia", pk, 'seg0.start', 'seg0.end', startEvent='cambodian-vietnamese-war', endEvent='untac'),
        phase('UN Transitional Authority', est('Cambodia', 11), est('Cambodia', 12), startEvent='untac'),
        phase('Kingdom of Cambodia (restored)', est('Cambodia', 12), ongoing=cur('Cambodia', 12)),
    ], memberOf=[
        member('french-colonial-empire', F(fpc, 'seg0.start', 'start'), F(fpc, 'seg1.end', 'end'), sources=[ref_est('Cambodia', 5)],
               startEvent='french-protectorate-of-cambodia', endEvent='cambodian-independence'),
        member('french-indochina', ev_c(fpc, 1), F(fpc, 'seg1.end', 'end'), sources=[G.ref(fpc, 'infobox event1: French Indochina, 17 October 1887')],
               startEvent='french-indochina-founded', endEvent='cambodian-independence'),
    ]))

    lx, klp, kv, kch, fpl, kl = ('Lan Xang', 'Kingdom of Luang Phrabang', 'Kingdom of Vientiane', 'Kingdom of Champasak', 'French protectorate of Laos',
                                 'Kingdom of Laos')
    T.append(row('lan-xang', 'Lan Xang', '#7a9a3a', SEA, lx, span_=mlife(lx, endEvent='lan-xang-partition')))
    T.append(row('laos', 'Laos', '#c03a4a', SEA, 'Laos', phases=[
        ph('Kingdom of Luang Phrabang', klp, startEvent='lan-xang-partition'),
        ph('French protectorate', fpl, 'seg0.start', 'seg0.end', startEvent='franco-siamese-war'),
        ph('French protectorate (restored)', fpl, 'seg1.start', 'seg1.end'),
        ph('Kingdom of Laos', kl, 'seg0.start', 'seg0.end', endEvent='laotian-civil-war'),
        phase("Lao People's Democratic Republic", est('Laos', 7), ongoing=cur('Laos', 7), startEvent='laotian-civil-war'),
    ], memberOf=[
        member('thailand', est('Laos', 3), est_last('Laos', 3), sources=[ref_est('Laos', 3)], endEvent='franco-siamese-war'),
        member('french-colonial-empire', F(fpl, 'seg0.start', 'start'), F(fpl, 'seg1.end', 'end'), sources=[ref_est('Laos', 4)], startEvent='franco-siamese-war'),
        member('french-indochina', ev_c(fpl, 1), F(fpl, 'seg1.end', 'end'), sources=[G.ref(fpl, 'infobox event1: Part of French Indochina, 19 April 1899')]),
    ]))
    T.append(row('kingdom-of-vientiane', 'Kingdom of Vientiane', '#8a9a4a', SEA, kv, span_=life(kv, startEvent='lan-xang-partition', endEvent='lao-rebellion'),
                 memberOf=[member('thailand', ev_c(kv, 2), E1(kv, 'year_end'), sources=[G.ref(kv, 'infobox event2: Siamese vassal, 1779')], endEvent='lao-rebellion')]))
    T.append(row('kingdom-of-champasak', 'Kingdom of Champasak', '#6a8a3a', SEA, kch, span_=life(kch),
                 memberOf=[member('thailand', ev_c(kch, 1), E1(kch, 'year_end'), sources=[G.ref(kch, 'infobox event1: Vassal of Siam, 1778')])]))

    ay, th, rk = 'Ayutthaya Kingdom', 'Thonburi Kingdom', 'Rattanakosin Kingdom (1782–1932)'
    ayv = G.ref(ay, 'infobox event3: Vassal of the Toungoo dynasty, 1564–68, 1569–84')
    T.append(row('thailand', 'Thailand', '#3a4a9a', SEA, 'Thailand', phases=[
        mph('Ayutthaya Kingdom', ay, 'seg0.start', 'date_end', endEvent='fall-of-ayutthaya'),
        ph('Thonburi Kingdom', th, 'seg0.start', 'seg0.end', startEvent='fall-of-ayutthaya'),
        ph('Rattanakosin Kingdom', rk, 'seg0.start', 'seg0.end', endEvent='siamese-revolution'),
        phase('Constitutional monarchy', est('Thailand', 9), ongoing=cur('Thailand', 10), startEvent='siamese-revolution'),
    ], memberOf=[
        # the infobox abbreviates the end years ("1564–68, 1569–84")
        member('myanmar', [{'year': 1564, 'source': ayv}], [{'year': 1568, 'source': ayv}], sources=[ayv], startEvent='burmese-siamese-war-1563'),
        member('myanmar', [{'year': 1569, 'source': ayv}], [{'year': 1584, 'source': ayv}], sources=[ayv]),
    ]))
    ln = 'Lanna Kingdom'
    T.append(row('lan-na', 'Lan Na', '#5a9a6a', SEA, ln, span_=span(stretch(None, F(ln, 'seg0.start', 'start')[:1] + [dict(F(ln, 'date_start', 'start')[0], note='The same article gives this year too.')], F(ln, 'date_end', 'end')[:1])), memberOf=[
        member('myanmar', evd(ln, n, 'start'), evd(ln, n, 'end'), sources=[G.ref(ln, f'infobox event{n}: Tributary of Burma, '
                                                                                     f'{G.art(ln)["fields"][f"date_event{n}"]["text"]}')])
        for n in (4, 6, 8, 10)] + [
        member('thailand', evd(ln, 5, 'start'), evd(ln, 5, 'end'), sources=[G.ref(ln, 'infobox event5: Tributary of Ayutthaya, 1596–1615')]),
    ]))
    pt = 'Patani Kingdom'
    T.append(row('patani-kingdom', 'Patani Kingdom', '#4a8a5a', SEA, pt, span_=life(pt, circa=True),
                 memberOf=[member('thailand', ev_c(pt, 2), E1(pt, 'year_end'), sources=[G.ref(pt, 'infobox event2: Conquest by Siam, 1786')])]))

    ftk, td, kb, brb = 'First Toungoo Empire', 'Toungoo dynasty', 'Konbaung dynasty', 'British rule in Burma'
    T.append(row('myanmar', 'Myanmar', '#c09a2a', SEA, 'Myanmar', phases=[
        ph('First Toungoo Empire', ftk),
        phase('Restored Toungoo dynasty', evd(td, 2, 'start'), evd(td, 2, 'end')),
        ph('Konbaung dynasty', kb, startEvent='konbaung-hanthawaddy-war', endEvent='third-anglo-burmese-war'),
        ph('British Burma', brb, 'seg0.start', 'seg0.end', startEvent='first-anglo-burmese-war', endEvent='burmese-independence'),
        ph('State of Burma (Japanese puppet)', 'State of Burma'),
        ph('Union of Burma', 'Union of Burma', startEvent='burmese-independence', endEvent='coup-1962'),
        ph('Socialist Republic of the Union of Burma', 'Socialist Republic of the Union of Burma', startEvent='coup-1962', endEvent='8888-uprising'),
        phase('Military junta (SLORC/SPDC)', est('Myanmar', 8), L('Myanmar', 'continued to rule the country directly until 2011', 2011), startEvent='8888-uprising'),
        phase('Republic of the Union of Myanmar', L('Myanmar', 'continued to rule the country directly until 2011', 2011),
              ongoing=G.ref('Myanmar', 'lead: "Myanmar, officially the Republic of the Union of Myanmar…" (current state)')),
    ], memberOf=[
        member('british-empire', F(brb, 'seg0.start', 'start'), F(brb, 'seg0.end', 'end'), sources=[G.ref(brb, 'infobox life span: 1824–1948')],
               startEvent='first-anglo-burmese-war', endEvent='burmese-independence'),
        member('india', ev_c(brb, 2), ev_c(brb, 4), sources=[G.ref(brb, 'infobox event2: Establishment as Burma Province, 31 January 1862; '
                                                                          'event4: Separation from British India, 1 April 1937')]),
        member('japan', evd(brb, 5, 'start'), evd(brb, 5, 'end'), sources=[G.ref(brb, 'infobox event5: Japanese occupation of Burma, 1942–1945')],
               endEvent=surrender),
    ]))
    T.append(row('kingdom-of-ava', 'Kingdom of Ava', '#a07a5a', SEA, 'Kingdom of Ava', span_=mlife('Kingdom of Ava')))
    T.append(row('hanthawaddy-kingdom', 'Hanthawaddy kingdom', '#7a5a8a', SEA, 'Hanthawaddy kingdom',
                 span_=mlife('Hanthawaddy kingdom')))
    T.append(row('restored-hanthawaddy-kingdom', 'Restored Hanthawaddy Kingdom', '#8a6a9a', SEA, 'Restored Hanthawaddy Kingdom',
                 span_=life('Restored Hanthawaddy Kingdom', endEvent='konbaung-hanthawaddy-war')))
    T.append(row('mrauk-u', 'Kingdom of Mrauk U (Arakan)', '#5a6a9a', SEA, 'Kingdom of Mrauk U', span_=life('Kingdom of Mrauk U', endEvent='conquest-of-arakan')))
    T.append(row('prome-kingdom', 'Prome kingdom', '#9a6a6a', SEA, 'Prome kingdom', span_=life('Prome kingdom')))

    T.append(row('malacca-sultanate', 'Malacca Sultanate', '#3a8a6a', SEA, 'Malacca Sultanate', span_=mlife('Malacca Sultanate', 'seg0.start', 'seg0.end', endEvent='capture-of-malacca')))
    T.append(row('johor-sultanate', 'Johor Sultanate', '#4a7a5a', SEA, 'Johor Sultanate',
                 span_=life('Johor Sultanate', 'seg0.start', 'seg0.end', endEvent='anglo-dutch-treaty-1824')))
    ss = 'Straits Settlements'
    T.append(row('straits-settlements', 'Straits Settlements', '#a04a5a', SEA, ss, span_=life(ss),
                 memberOf=[member('british-empire', S1(ss), E1(ss, 'year_end'), sources=[lead(ss, 'Crown colony in 1867')])]))
    fms, ums, jom, mu, fom = 'Federated Malay States', 'Unfederated Malay States', 'Japanese occupation of Malaya', 'Malayan Union', 'Federation of Malaya'
    T.append(row('malaysia', 'Malaysia', '#2a4a9a', SEA, 'Malaysia', phases=[
        # the federated and unfederated states ran side by side: parallel phases
        ph('Federated Malay States', fms),
        ph('Unfederated Malay States', ums),
        ph('Japanese occupation', jom, startEvent='japanese-invasion-of-malaya', endEvent=surrender),
        ph('Malayan Union', mu),
        ph('Federation of Malaya', fom, 'seg0.start', 'seg0.end', endEvent='malaysia-formed'),
        phase('Malaysia', est('Malaysia', 4), ongoing=cur('Malaysia', 4), startEvent='malaysia-formed'),
    ], memberOf=[
        member('british-empire', S1(fms), ev_c(fom, 1), sources=[lead('Malaysia', 'achieved independence on 31 August 1957')], endEvent='malayan-independence'),
        member('japan', S1(jom), E1(jom, 'year_end'), sources=[G.ref(jom, 'infobox: Japanese occupation of Malaya, 8 December 1941 – 12 September 1945')],
               startEvent='japanese-invasion-of-malaya', endEvent=surrender),
    ]))
    jos_, cos = 'Japanese occupation of Singapore', 'Colony of Singapore'
    T.append(row('singapore', 'Singapore', '#d03a3a', SEA, 'Singapore', phases=[
        ph('Japanese occupation (Syonan-to)', jos_, startEvent='battle-of-singapore', endEvent=surrender),
        ph('Colony of Singapore', cos, endEvent='malaysia-formed'),
        phase('State of Singapore (in Malaysia)', est('Singapore', 2), est('Singapore', 3), startEvent='malaysia-formed', endEvent='singapore-separation'),
        phase('Republic of Singapore', est('Singapore', 3), ongoing=cur('Singapore', 3), startEvent='singapore-separation'),
    ], memberOf=[
        member('japan', S1(jos_), E1(jos_, 'year_end'), sources=[lead('Singapore', 'occupied by Japan in 1942')], startEvent='battle-of-singapore', endEvent=surrender),
        member('british-empire', S1(cos), E1(cos, 'year_end'), sources=[lead('Singapore', 'returned to Britain as a Crown colony')], endEvent='malaysia-formed'),
        member('malaysia', est('Singapore', 2), est('Singapore', 3), sources=[lead('Singapore', 'became part of the new federation of Malaysia')],
               startEvent='malaysia-formed', endEvent='singapore-separation'),
    ]))
    rs, ccs, nb, ccnb, jbb = 'Raj of Sarawak', 'Crown Colony of Sarawak', 'North Borneo', 'Crown Colony of North Borneo', 'Japanese occupation of British Borneo'
    T.append(row('sarawak', 'Sarawak', '#9a4a3a', SEA, rs, phases=[
        ph('Raj of Sarawak', rs, 'seg0.start', 'seg0.end'),
        ph('Crown Colony of Sarawak', ccs, 'seg0.start', 'seg0.end', endEvent='malaysia-formed'),
    ], memberOf=[
        member('british-empire', ev_c(rs, 2), E1(ccs, 'seg0.end'), sources=[G.ref(rs, 'infobox event2: Protected state, 14 June 1888'),
                                                                           G.ref(ccs, 'infobox event_start: Sarawak ceded to the Crown Colony')], endEvent='malaysia-formed'),
        member('japan', S1(jbb), E1(jbb, 'year_end'), sources=[G.ref(rs, 'infobox event3: Japanese invasion, 16 December 1941')], endEvent=surrender),
    ]))
    T.append(row('north-borneo', 'North Borneo', '#8a5a3a', SEA, nb, phases=[
        ph('North Borneo', nb),
        ph('Crown Colony of North Borneo', ccnb, 'seg0.start', 'seg0.end', endEvent='malaysia-formed'),
    ], memberOf=[
        member('british-empire', ev_c(nb, 3), E1(ccnb, 'seg0.end'), sources=[G.ref(nb, 'infobox event3: Protectorate, 12 May 1888')], endEvent='malaysia-formed'),
        member('japan', ev_c(nb, 4), ev_c(nb, 5), sources=[G.ref(nb, 'infobox event4: Japanese invasion, 2 January 1942')], endEvent=surrender),
    ]))
    T.append(row('brunei', 'Brunei', '#c0a020', SEA, 'Brunei', phases=[
        mph('Sultanate of Brunei', 'Sultanate of Brunei (1368–1888)'),
        phase('British protectorate', est('Brunei', 2), est('Brunei', 5), endEvent='brunei-independence'),
        ph('Japanese occupation', jbb, endEvent=surrender),
        phase('Brunei Darussalam', est('Brunei', 5), ongoing=cur('Brunei', 5), startEvent='brunei-independence'),
    ], memberOf=[
        member('british-empire', est('Brunei', 2), est('Brunei', 5), sources=[ref_est('Brunei', 2)], endEvent='brunei-independence'),
        member('japan', S1(jbb), E1(jbb, 'year_end'), sources=[G.ref(jbb, 'infobox: Japanese occupation of British Borneo, 16 December 1941 – 12 September 1945')],
               endEvent=surrender),
    ]))

    sei, fpr, ig, cw, jop = ('Spanish East Indies', 'First Philippine Republic', 'Insular Government of the Philippine Islands', 'Commonwealth of the Philippines',
                             'Japanese occupation of the Philippines')
    T.append(row('philippines', 'Philippines', '#2a4ab0', SEA, 'Philippines',
                 # 1965–72 has no phase of its own in the dump (the Third Republic's article ends in 1965): the lifespan carries it
                 span_=span(stretch(None, S1(sei), ongoing=cur('Philippines', 5))),
                 phases=[
        ph('Spanish East Indies', sei, startEvent='legazpi-colonizes-cebu'),
        ph('Tagalog Republic', 'Tagalog Republic', startEvent='philippine-revolution'),
        ph('First Philippine Republic', fpr, 'seg0.start', 'seg0.end'),
        ph('US Military Government', 'Military Government of the Philippine Islands', startEvent='spanish-american-war'),
        ph('Insular Government', ig),
        phase('Commonwealth of the Philippines', F(cw, 'seg0.start', 'start'), E1(cw, 'year_end'), endEvent='philippine-independence'),
        ph('Japanese occupation', jop, startEvent='pacific-war', endEvent=surrender),
        ph('Third Republic', 'History of the Philippines (1946–1965)', startEvent='philippine-independence'),
        phase('Martial law', L('Philippines', 'martial law from 1972 to 1981', 1972), L('Philippines', 'martial law from 1972 to 1981', 1981), startEvent='martial-law'),
        ph('Fourth Republic', 'Fourth Philippine Republic', endEvent='people-power-revolution'),
        phase('Fifth Republic', E1('Fourth Philippine Republic', 'year_end'), ongoing=cur('Philippines', 5), startEvent='people-power-revolution'),
    ], memberOf=[
        member('spanish-empire', S1(sei), ev_c(sei, 7), sources=[lead('Philippines', 'named the archipelago las Islas Filipinas')],
               startEvent='legazpi-colonizes-cebu', endEvent='spanish-american-war'),
        member('japan', S1(jop), E1(jop, 'year_end'), sources=[G.ref(jop, 'infobox: Japanese occupation of the Philippines, December 8, 1941 – September 2, 1945')],
               startEvent='pacific-war', endEvent=surrender),
    ]))
    T.append(row('sultanate-of-sulu', 'Sultanate of Sulu', '#3a7a7a', SEA, 'Sultanate of Sulu', span_=mlife('Sultanate of Sulu')))
    T.append(row('sultanate-of-maguindanao', 'Sultanate of Maguindanao', '#4a6a6a', SEA, 'Sultanate of Maguindanao', span_=life('Sultanate of Maguindanao')))
    T.append(row('maynila', 'Maynila', '#6a7a4a', SEA, 'Maynila (historical polity)', span_=life('Maynila (historical polity)', circa=True)))
    T.append(row('tondo', 'Tondo', '#7a6a3a', SEA, 'Tondo (historical polity)', span_=life('Tondo (historical polity)', circa=True)))
    T.append(row('republic-of-negros', 'Republic of Negros', '#5a6a8a', SEA, 'Republic of Negros', span_=life('Republic of Negros')))
    T.append(row('republic-of-zamboanga', 'Republic of Zamboanga', '#6a5a7a', SEA, 'Republic of Zamboanga', span_=life('Republic of Zamboanga')))

    ptm = 'Portuguese Timor'
    T.append(row('timor-leste', 'Timor-Leste', '#c06a2a', SEA, 'Timor-Leste', phases=[
        ph('Portuguese Timor', ptm, 'seg0.start', 'seg0.end', endEvent='indonesian-invasion-of-east-timor'),
        phase('Indonesian occupation', E1(ptm, 'year_end'), est('Timor-Leste', 2), startEvent='indonesian-invasion-of-east-timor',
              endEvent='east-timor-referendum'),
        phase('UN Transitional Administration', est('Timor-Leste', 2), est('Timor-Leste', 3), startEvent='east-timor-referendum',
              endEvent='timor-leste-independence'),
        phase('Democratic Republic of Timor-Leste', est('Timor-Leste', 3), ongoing=cur('Timor-Leste', 3), startEvent='timor-leste-independence'),
    ], memberOf=[
        member('portuguese-empire', F(ptm, 'seg0.start', 'start'), F(ptm, 'seg0.end', 'end'), sources=[lead('Timor-Leste', 'remaining a Portuguese colony until 1975')],
               endEvent='indonesian-invasion-of-east-timor'),
        member('indonesia', E1(ptm, 'year_end'), est('Timor-Leste', 2), sources=[lead('Timor-Leste', 'Indonesian rule')],
               startEvent='indonesian-invasion-of-east-timor', endEvent='east-timor-referendum'),
    ]))

    # the archipelago's kingdoms and sultanates (Indonesia's own row is in colonial.py)
    T.append(row('majapahit', 'Majapahit', '#a05a2a', SEA, 'Majapahit', span_=mlife('Majapahit', endEvent='demak-majapahit-conflicts')))
    T.append(row('samudera-pasai-sultanate', 'Samudera Pasai Sultanate', '#6a7a3a', SEA, 'Samudera Pasai Sultanate', span_=mlife('Samudera Pasai Sultanate')))
    T.append(row('kutai', 'Kutai', '#5a5a8a', SEA, 'Kutai', span_=span(stretch(None, L('Kutai', 'Kutai Martadipura Kingdom (399–1635)', 399), L('Kutai', 'Kutai Martadipura Kingdom (399–1635)', 1635)))))
    T.append(row('sunda-kingdom', 'Sunda Kingdom', '#5a8a4a', SEA, 'Sunda Kingdom', span_=life('Sunda Kingdom')))
    T.append(row('sultanate-of-cirebon', 'Sultanate of Cirebon', '#4a7a4a', SEA, 'Sultanate of Cirebon', span_=life('Sultanate of Cirebon')))
    T.append(row('aceh-sultanate', 'Aceh Sultanate', '#2a7a4a', SEA, 'Aceh Sultanate', span_=life('Aceh Sultanate', 'seg0.start', 'seg0.end')))
    bs = 'Banten Sultanate'
    T.append(row('banten-sultanate', 'Banten Sultanate', '#7a8a3a', SEA, bs, span_=life(bs),
                 memberOf=[member('dutch-empire', ev_c(bs, 4), E1(bs, 'year_end'), sources=[G.ref(bs, 'infobox event4: Client state of VOC, 1683')])]))
    T.append(row('kingdom-of-pajang', 'Kingdom of Pajang', '#6a6a3a', SEA, 'Kingdom of Pajang', span_=life('Kingdom of Pajang')))
    T.append(row('mataram-sultanate', 'Mataram Sultanate', '#8a6a3a', SEA, 'Mataram Sultanate', span_=life('Mataram Sultanate')))
    tern = 'Sultanate of Ternate'
    T.append(row('sultanate-of-ternate', 'Sultanate of Ternate', '#3a6a5a', SEA, tern, span_=life(tern),
                 memberOf=[member('dutch-empire', ev_c(tern, 3), E1(tern, 'year_end'), sources=[G.ref(tern, 'infobox event3: Vassalisation by Dutch, 1683')])]))
    T.append(row('sultanate-of-gowa', 'Sultanate of Gowa', '#5a4a6a', SEA, 'Sultanate of Gowa', span_=life('Sultanate of Gowa')))
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
        y, r = E(article, n)
        return ev(uuid, title, y, tracks, r, **kw)

    ccw_ys, ccw_r = W('Chinese Civil War')
    roc_end = F('Republic of China (1912–1949)', 'year_end', 'end')[0]
    malacca = W('Capture of Malacca (1511)')[1]
    surrender_y, surrender_r = E('Empire of Japan', 9)
    occ = ['korea', 'taiwan', 'mengjiang', 'french-indochina', 'malaysia', 'singapore', 'myanmar', 'philippines', 'sarawak', 'north-borneo', 'brunei']

    # europe.py (as edited by the lead) ends the Ottoman row with mena.py's event; for runs without mena, a stand-in
    # dated the same way (dropped automatically when mena is loaded)
    import sys
    stand_in = [] if 'mena' in sys.modules else [
        fev('sultanate-abolished', 'Ottoman sultanate abolished', 'Turkey', 'established_date4', ['ottoman-empire'], importance=1,
            descr='The Grand National Assembly abolishes the sultanate on 1 November 1922: the Ottoman Empire ends.')]

    return stand_in + [
        # ---- China ----
        iev('fall-of-beijing', 'Fall of Beijing', 'Ming dynasty', 'end', ['china'], importance=1,
            descr='Li Zicheng\'s rebels take Beijing and the last Ming emperor kills himself; the Shun dynasty is proclaimed.'),
        wev('ming-qing-transition', 'Ming–Qing transition', 'Transition from Ming to Qing', ['china', 'later-jin', 'taiwan'], importance=1,
            descr='The Manchu Qing conquer China, from the Later Jin\'s first campaigns to the fall of the Ming loyalists on Taiwan.'),
        fev('qing-proclaimed', 'Qing dynasty proclaimed', 'Qing dynasty', 'date_pre', ['later-jin', 'china'],
            descr='Hong Taiji renames the Later Jin the Great Qing and takes the title of emperor.'),
        iev('ejei-khan-submits', 'Northern Yuan submits to the Later Jin', 'Later Jin (1616–1636)', 3, ['mongolia', 'later-jin'],
            descr='Ligdan Khan\'s son Ejei hands the Yuan seal to Hong Taiji; the Northern Yuan ends in Inner Mongolia.'),
        iev('manchu-invasions-of-korea', 'Manchu invasions of Korea', 'Joseon', 4, ['korea', 'later-jin', 'china'], end=1637,
            descr='The Later Jin (1627) and the Qing (1636–37) invade Joseon, which becomes a Qing tributary.'),
        wev('siege-of-fort-zeelandia', 'Siege of Fort Zeelandia', 'Siege of Fort Zeelandia', ['taiwan', 'dutch-empire'],
            descr='Koxinga\'s Ming loyalists drive the Dutch from Taiwan and found the Kingdom of Tungning.'),
        fev('qing-annexes-taiwan', 'Qing conquest of Taiwan', 'Taiwan', 'established_date3', ['taiwan', 'china'],
            descr='The Kingdom of Tungning surrenders; Taiwan becomes a prefecture of Fujian.'),
        wev('dzungar-qing-wars', 'Dzungar–Qing Wars', 'Dzungar–Qing Wars', ['dzungar-khanate', 'china', 'mongolia'], importance=1,
            descr='A long war for Mongolia, Tibet and Xinjiang ends with the destruction of the Dzungar Khanate.'),
        fev('chinese-expedition-to-tibet', 'Chinese expedition to Tibet', 'Tibet under Qing rule', 'year_start', ['ganden-phodrang', 'china'],
            descr='Qing armies expel the Dzungars from Lhasa; Tibet comes under a Qing protectorate.'),
        wev('first-opium-war', 'First Opium War', 'First Opium War', ['china', 'british-empire'], importance=1,
            descr='Britain defeats China; the Treaty of Nanking cedes Hong Kong and opens treaty ports.'),
        wev('taiping-rebellion', 'Taiping Rebellion', 'Taiping Rebellion', ['china'], importance=1,
            descr='A civil war against the Qing, among the deadliest in history; the Taiping Heavenly Kingdom rules from Nanjing.'),
        wev('second-opium-war', 'Second Opium War', 'Second Opium War', ['china', 'british-empire', 'french-colonial-empire']),
        wev('sino-french-war', 'Sino-French War', 'Sino-French War', ['china', 'french-colonial-empire', 'vietnam'],
            descr='France and China fight over Tonkin; China gives up its claims over Vietnam.'),
        wev('first-sino-japanese-war', 'First Sino-Japanese War', 'First Sino-Japanese War', ['china', 'japan', 'korea'], importance=1,
            descr='Japan defeats China in a war over Korea.'),
        wev('treaty-of-shimonoseki', 'Treaty of Shimonoseki', 'Treaty of Shimonoseki', ['china', 'japan', 'taiwan'],
            descr='China cedes Taiwan to Japan and recognises Korea\'s independence.'),
        wev('boxer-rebellion', 'Boxer Rebellion', 'Boxer Rebellion', ['china']),
        wev('xinhai-revolution', 'Xinhai Revolution', 'Xinhai Revolution', ['china', 'mongolia', 'ganden-phodrang'], importance=1,
            descr='The Qing dynasty falls and the Republic of China is founded; Mongolia and Tibet break away.'),
        wev('japanese-invasion-of-manchuria', 'Japanese invasion of Manchuria', 'Japanese invasion of Manchuria', ['china', 'japan', 'manchukuo'], importance=1,
            descr='After the Mukden Incident Japan occupies Manchuria and sets up Manchukuo.'),
        wev('second-sino-japanese-war', 'Second Sino-Japanese War', 'Second Sino-Japanese War', ['china', 'japan', 'manchukuo'], importance=1),
        ev('chinese-civil-war', 'Chinese Civil War', ccw_ys[0], ['china', 'taiwan'], [ccw_r, roc_end['source']], end=roc_end['year'], importance=1,
           descr='Nationalists against Communists, with an interlude during the war with Japan; the Republic\'s government retreats to Taiwan in 1949.'),
        fev('prc-proclaimed', "People's Republic of China proclaimed", 'China', 'established_date4', ['china'], importance=1,
            descr='Mao Zedong proclaims the People\'s Republic in Beijing on 1 October 1949.'),
        wev('ili-rebellion', 'Ili Rebellion', 'Ili Rebellion', ['second-east-turkestan-republic', 'china']),
        wev('annexation-of-tibet', 'Annexation of Tibet', "Annexation of Tibet by the People's Republic of China", ['ganden-phodrang', 'china'], importance=1,
            descr='The People\'s Liberation Army takes Chamdo; the Seventeen Point Agreement places Tibet under the PRC.'),
        wev('tibetan-uprising-1959', '1959 Tibetan uprising', '1959 Tibetan uprising', ['ganden-phodrang', 'china'], importance=1,
            descr='The rising fails; the Dalai Lama flees to India and the Ganden Phodrang is dissolved.'),
        wev('sino-indian-war', 'Sino-Indian War', 'Sino-Indian War', ['china', 'india']),
        ev('reform-and-opening', 'Reform and opening-up', 1978, ['china'], lead('China', 'reform and opening-up that began in 1978'),
           descr='Deng Xiaoping\'s reforms move China towards a market economy.'),
        wev('sino-vietnamese-war', 'Sino-Vietnamese War', 'Sino-Vietnamese War', ['china', 'vietnam']),
        # ---- Japan ----
        wev('imjin-war', 'Japanese invasions of Korea', 'Imjin War', ['japan', 'korea', 'china'], importance=1,
            descr='Toyotomi Hideyoshi invades Korea twice; Joseon and Ming forces drive the Japanese out.'),
        wev('battle-of-sekigahara', 'Battle of Sekigahara', 'Battle of Sekigahara', ['japan'], importance=1,
            descr='Tokugawa Ieyasu wins control of Japan; he is named shogun in 1603.'),
        wev('invasion-of-ryukyu', 'Satsuma invasion of Ryukyu', 'Invasion of Ryukyu', ['ryukyu-kingdom', 'japan'],
            descr='The Satsuma Domain makes the Ryukyu Kingdom its vassal.'),
        wev('shimabara-rebellion', 'Shimabara Rebellion', 'Shimabara Rebellion', ['japan']),
        wev('perry-expedition', 'Perry Expedition', 'Perry Expedition', ['japan'], importance=1,
            descr='An American fleet forces Japan to open its ports.'),
        wev('meiji-restoration', 'Meiji Restoration', 'Meiji Restoration', ['japan'], importance=1,
            descr='The shogunate falls and imperial rule is restored under the Meiji Emperor.'),
        wev('boshin-war', 'Boshin War', 'Boshin War', ['japan']),
        fev('ryukyu-annexed', 'Ryukyu annexed by Japan', 'Ryukyu Kingdom', 'year_end', ['ryukyu-kingdom', 'japan'],
            descr='The Ryukyu Domain is abolished and becomes Okinawa Prefecture.'),
        wev('pacific-war', 'Pacific War', 'Pacific War', ['japan', 'thailand', 'philippines', 'british-empire', 'dutch-empire'], importance=1,
            descr='Japan attacks the United States and the European colonies in Asia; the war in Asia and the Pacific ends with its surrender.'),
        wev('atomic-bombings', 'Atomic bombings of Hiroshima and Nagasaki', 'Atomic bombings of Hiroshima and Nagasaki', ['japan'], importance=1),
        ev(M_SURRENDER, 'Surrender of Japan', surrender_y, ['japan', 'manchukuo'] + occ, surrender_r, importance=1,
           descr='Japan surrenders on 2 September 1945; its empire and occupied territories are given up.'),
        wev('soviet-invasion-of-manchuria', 'Soviet invasion of Manchuria', 'Soviet invasion of Manchuria', ['manchukuo', 'soviet-union', 'japan']),
        wev('treaty-of-san-francisco', 'Treaty of San Francisco', 'Treaty of San Francisco', ['japan'],
            descr='The peace treaty ends the Allied occupation, from April 1952.'),
        # ---- Korea and Mongolia ----
        fev('korean-empire-proclaimed', 'Korean Empire proclaimed', 'Korean Empire', 'year_start', ['korea'],
            descr='King Gojong proclaims himself emperor.'),
        iev('eulsa-treaty', 'Eulsa Treaty', 'Korean Empire', 2, ['korea', 'japan'], descr='Korea becomes a Japanese protectorate.'),
        fev('japan-annexes-korea', 'Japan annexes Korea', 'Korean Empire', 'year_end', ['korea', 'japan'], importance=1),
        wev('march-first-movement', 'March First Movement', 'March First Movement', ['korea'], importance=1,
            descr='Nationwide protests for independence; the Provisional Government is formed in Shanghai.'),
        fev('division-of-korea', 'Division of Korea', 'North Korea', 'established_date2', ['korea', 'north-korea', 'south-korea'], importance=1,
            descr='Soviet and American forces occupy Korea north and south of the 38th parallel.'),
        wev('korean-war', 'Korean War', 'Korean War', ['north-korea', 'south-korea', 'china'], importance=1),
        wev('april-revolution', 'April Revolution', 'April Revolution', ['south-korea'], descr='Protests bring down Syngman Rhee.'),
        fev('may-16-coup', 'May 16 coup', 'Supreme Council for National Reconstruction', 'year_start', ['south-korea'],
            descr='Park Chung Hee seizes power.'),
        wev('gwangju-uprising', 'Gwangju Uprising', 'Gwangju Uprising', ['south-korea']),
        wev('june-democratic-struggle', 'June Democratic Struggle', 'June Democratic Struggle', ['south-korea'], importance=1,
            descr='Mass protests force direct presidential elections and a new constitution.'),
        wev('mongolian-revolution-1911', 'Mongolian Revolution of 1911', 'Mongolian Revolution of 1911', ['mongolia', 'china'], importance=1,
            descr='Outer Mongolia declares independence from the Qing under the Bogd Khan.'),
        wev('mongolian-revolution-1921', 'Mongolian Revolution of 1921', 'Mongolian Revolution of 1921', ['mongolia', 'russia'],
            descr='Mongolian revolutionaries and the Red Army expel Chinese and White Russian forces.'),
        wev('battles-of-khalkhin-gol', 'Battles of Khalkhin Gol', 'Battles of Khalkhin Gol', ['mongolia', 'soviet-union', 'japan', 'manchukuo']),
        wev('democratic-revolution-mongolia', 'Democratic Revolution in Mongolia', '1990 Democratic Revolution in Mongolia', ['mongolia'], importance=1),
        # ---- Vietnam, Cambodia, Laos ----
        wev('trinh-nguyen-war', 'Trịnh–Nguyễn War', 'Trịnh–Nguyễn War', ['vietnam']),
        wev('tay-son-wars', 'Tây Sơn wars', 'Tây Sơn wars', ['vietnam'], importance=1,
            descr='The Tây Sơn brothers overthrow the Nguyễn lords, the Trịnh and the Lê; Nguyễn Ánh defeats them in 1802.'),
        fev('nguyen-unification', 'Nguyễn unification', 'Vietnam', 'established_date6', ['vietnam'], importance=1,
            descr='Gia Long founds the Nguyễn dynasty over a united Vietnam.'),
        wev('cochinchina-campaign', 'Cochinchina campaign', 'Cochinchina campaign', ['vietnam', 'french-colonial-empire'],
            descr='France takes Saigon and the southern provinces, ceded in the Treaty of Saigon.'),
        fev('french-indochina-founded', 'French Indochina established', 'French Indochina', 'year_start',
            ['french-indochina', 'vietnam', 'cambodia', 'french-colonial-empire']),
        wev('august-revolution', 'August Revolution', 'August Revolution', ['vietnam'], importance=1,
            descr='The Việt Minh take power; Bảo Đại abdicates and Hồ Chí Minh declares independence.'),
        wev('first-indochina-war', 'First Indochina War', 'First Indochina War', ['vietnam', 'french-indochina', 'cambodia', 'laos', 'french-colonial-empire'],
            importance=1),
        fev('geneva-conference', 'Geneva Accords', 'French Indochina', 'year_end', ['french-indochina', 'vietnam', 'cambodia', 'laos', 'french-colonial-empire'],
            importance=1, descr='French Indochina ends; Vietnam is divided at the 17th parallel.'),
        wev('vietnam-war', 'Vietnam War', 'Vietnam War', ['vietnam', 'cambodia', 'laos'], importance=1),
        wev('fall-of-saigon', 'Fall of Saigon', 'Fall of Saigon', ['vietnam'], importance=1),
        fev('reunification-of-vietnam', 'Reunification of Vietnam', 'Vietnam', 'established_date11', ['vietnam'], importance=1,
            descr='North and South are united as the Socialist Republic of Vietnam on 2 July 1976.'),
        fev('french-protectorate-of-cambodia', 'French protectorate over Cambodia', 'Cambodia', 'established_date5', ['cambodia', 'french-colonial-empire']),
        fev('cambodian-independence', 'Cambodian independence', 'Cambodia', 'established_date6', ['cambodia', 'french-colonial-empire'], importance=1),
        wev('coup-1970', '1970 Cambodian coup', "1970 Cambodian coup d'état", ['cambodia'], descr='Lon Nol deposes Sihanouk; the Khmer Republic follows.'),
        wev('cambodian-civil-war', 'Cambodian Civil War', 'Cambodian Civil War', ['cambodia']),
        iev('fall-of-phnom-penh', 'Fall of Phnom Penh', 'Khmer Republic', 6, ['cambodia'], importance=1, descr='The Khmer Rouge take the capital.'),
        wev('cambodian-genocide', 'Cambodian genocide', 'Cambodian genocide', ['cambodia'], importance=1),
        wev('cambodian-vietnamese-war', 'Cambodian–Vietnamese War', 'Cambodian–Vietnamese War', ['cambodia', 'vietnam'], importance=1,
            descr='Vietnam invades, drives out the Khmer Rouge and installs the People\'s Republic of Kampuchea.'),
        fev('untac', 'UN Transitional Authority in Cambodia', 'Cambodia', 'established_date11', ['cambodia']),
        fev('lan-xang-partition', 'Partition of Lan Xang', 'Lan Xang', 'year_end', ['lan-xang', 'laos', 'kingdom-of-vientiane'], importance=1,
            descr='Lan Xang splits into the kingdoms of Luang Phrabang and Vientiane (and Champasak in 1713).'),
        iev('lao-rebellion', 'Lao rebellion', 'Rattanakosin Kingdom (1782–1932)', 3, ['kingdom-of-vientiane', 'thailand'], end=1828,
            descr='Anouvong of Vientiane rises against Siam; Vientiane is sacked and annexed.'),
        wev('franco-siamese-war', 'Franco-Siamese War', 'Franco-Siamese War', ['thailand', 'laos', 'french-colonial-empire'],
            descr='Siam cedes the lands east of the Mekong to France.'),
        wev('laotian-civil-war', 'Laotian Civil War', 'Laotian Civil War', ['laos'], importance=1),
        # ---- Thailand and Myanmar ----
        wev('toungoo-hanthawaddy-war', 'Toungoo–Hanthawaddy War', 'Toungoo–Hanthawaddy War', ['myanmar', 'hanthawaddy-kingdom']),
        wev('toungoo-ava-war', 'Toungoo–Ava War', 'Toungoo–Ava War (1538–1545)', ['myanmar', 'kingdom-of-ava']),
        wev('burmese-siamese-war-1563', 'Burmese–Siamese War of 1563–64', 'Burmese–Siamese War (1563–1564)', ['myanmar', 'thailand'],
            descr='Bayinnaung takes Ayutthaya, which becomes a Toungoo vassal.'),
        wev('konbaung-hanthawaddy-war', 'Konbaung–Hanthawaddy War', 'Konbaung–Hanthawaddy War', ['myanmar', 'restored-hanthawaddy-kingdom']),
        wev('fall-of-ayutthaya', 'Fall of Ayutthaya', 'Burmese–Siamese War (1765–1767)', ['thailand', 'myanmar'], importance=1,
            descr='Konbaung armies sack Ayutthaya; Taksin reunites Siam from Thonburi.'),
        iev('conquest-of-arakan', 'Konbaung conquest of Arakan', 'Konbaung dynasty', 4, ['myanmar', 'mrauk-u']),
        iev('bowring-treaty', 'Bowring Treaty', 'Rattanakosin Kingdom (1782–1932)', 6, ['thailand', 'british-empire']),
        fev('siamese-revolution', 'Siamese revolution of 1932', 'Thailand', 'established_date9', ['thailand'], importance=1,
            descr='A bloodless coup ends absolute monarchy.'),
        wev('franco-thai-war', 'Franco-Thai War', 'Franco-Thai War', ['thailand', 'french-indochina', 'french-colonial-empire']),
        wev('japanese-invasion-of-thailand', 'Japanese invasion of Thailand', 'Japanese invasion of Thailand', ['thailand', 'japan']),
        wev('thai-coup-2014', '2014 Thai coup', "2014 Thai coup d'état", ['thailand']),
        wev('first-anglo-burmese-war', 'First Anglo-Burmese War', 'First Anglo-Burmese War', ['myanmar', 'british-empire'], importance=1),
        wev('third-anglo-burmese-war', 'Third Anglo-Burmese War', 'Third Anglo-Burmese War', ['myanmar', 'british-empire'],
            descr='Britain takes Upper Burma and ends the Konbaung dynasty.'),
        wev('burma-campaign', 'Burma campaign', 'Burma campaign', ['myanmar', 'japan', 'british-empire']),
        fev('burmese-independence', 'Burmese independence', 'Myanmar', 'established_date6', ['myanmar', 'british-empire'], importance=1),
        fev('coup-1962', '1962 Burmese coup', 'Myanmar', 'established_date7', ['myanmar'], importance=1, descr='Ne Win\'s military takes power.'),
        wev('8888-uprising', '8888 Uprising', '8888 Uprising', ['myanmar'], importance=1),
        wev('myanmar-coup-2021', '2021 Myanmar coup', "2021 Myanmar coup d'état", ['myanmar'], importance=1,
            descr='The military overthrows the elected government; a civil war follows.'),
        # ---- Malaysia, Singapore, Brunei ----
        ev('capture-of-malacca', 'Capture of Malacca', 1511, ['malacca-sultanate', 'portuguese-empire'], malacca, importance=1,
           descr='The Portuguese take Malacca; the sultan\'s heirs found Johor and Perak.'),
        wev('anglo-dutch-treaty-1824', 'Anglo-Dutch Treaty of 1824', 'Anglo-Dutch Treaty of 1824', ['johor-sultanate', 'british-empire', 'dutch-empire'],
            descr='Britain and the Netherlands divide the Malay world along the Strait of Malacca.'),
        wev('japanese-invasion-of-malaya', 'Japanese invasion of Malaya', 'Japanese invasion of Malaya', ['malaysia', 'straits-settlements', 'japan', 'british-empire']),
        wev('battle-of-singapore', 'Fall of Singapore', 'Battle of Singapore', ['singapore', 'straits-settlements', 'japan', 'british-empire'], importance=1),
        wev('malayan-emergency', 'Malayan Emergency', 'Malayan Emergency', ['malaysia', 'british-empire']),
        iev('malayan-independence', 'Malayan independence', 'Federation of Malaya', 1, ['malaysia', 'british-empire'], importance=1),
        fev('malaysia-formed', 'Malaysia formed', 'Malaysia', 'established_date4', ['malaysia', 'singapore', 'sarawak', 'north-borneo'], importance=1,
            descr='Malaya, Singapore, Sarawak and North Borneo federate as Malaysia on 16 September 1963.'),
        wev('confrontation', 'Indonesia–Malaysia confrontation', 'Indonesia–Malaysia confrontation', ['malaysia', 'indonesia']),
        fev('singapore-separation', 'Singapore leaves Malaysia', 'Singapore', 'established_date3', ['singapore', 'malaysia'], importance=1,
            descr='Singapore is expelled from the federation and becomes independent on 9 August 1965.'),
        wev('brunei-revolt', 'Brunei revolt', 'Brunei revolt', ['brunei']),
        fev('brunei-independence', 'Brunei independent', 'Brunei', 'established_date5', ['brunei', 'british-empire'], importance=1),
        # ---- the Philippines and Timor ----
        fev('legazpi-colonizes-cebu', 'Spanish colonisation of the Philippines', 'Spanish East Indies', 'year_start', ['philippines', 'spanish-empire'],
            importance=1, descr='Miguel López de Legazpi founds the first Spanish settlement in Cebu.'),
        wev('philippine-revolution', 'Philippine Revolution', 'Philippine Revolution', ['philippines', 'spanish-empire'], importance=1),
        wev('spanish-american-war', 'Spanish–American War', 'Spanish–American War', ['philippines', 'spanish-empire'], importance=1,
            descr='Spain loses the Philippines to the United States.'),
        fev('philippine-independence', 'Philippine independence', 'Philippines', 'established_date4', ['philippines'], importance=1),
        ev('martial-law', 'Martial law under Marcos', 1972, ['philippines'], lead('Philippines', 'martial law from 1972 to 1981'), end=1981),
        wev('people-power-revolution', 'People Power Revolution', 'People Power Revolution', ['philippines'], importance=1),
        wev('indonesian-invasion-of-east-timor', 'Indonesian invasion of East Timor', 'Indonesian invasion of East Timor', ['timor-leste', 'indonesia'],
            importance=1),
        wev('east-timor-referendum', 'East Timorese independence referendum', '1999 East Timorese independence referendum', ['timor-leste', 'indonesia'],
            importance=1),
        fev('timor-leste-independence', 'Timor-Leste independent', 'Timor-Leste', 'established_date3', ['timor-leste'], importance=1),
        # ---- the archipelago ----
        wev('demak-majapahit-conflicts', 'Demak–Majapahit conflicts', 'Demak–Majapahit conflicts', ['majapahit'], importance=1,
            descr='Demak defeats Majapahit, the last Hindu-Buddhist empire of Java.'),
        iev('banten-voc-client', 'Banten becomes a VOC client', 'Banten Sultanate', 4, ['banten-sultanate', 'dutch-empire']),
    ]


M_SURRENDER = 'surrender-of-japan'
