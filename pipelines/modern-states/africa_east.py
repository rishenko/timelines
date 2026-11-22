"""
Modern States wave 7b: Eastern and Southern Africa (2026-11-21). The UN Eastern Africa and Southern Africa states
(Somaliland as a de facto, disputed state; Sudan comes from mena.py), plus the historical states of the region with a
former-country (or country) infobox that lived after 1500.

Rules applied (data-format.md and Kevin's decisions, 2026-11-21):
- A row that carries on into a state that exists today takes that state's id; its colonial and later governments are
  phases (kenya: Kenya Colony, the 1963–64 dominion, the Republic), with a dated memberOf in the empire
  (british-empire, french-colonial-empire, portuguese-empire, dutch-empire; German colonies in `germany`, Italian ones
  in `italy`, Ruanda-Urundi in `belgium`).
- Colonial units that split into several states are their own rows, linked by succession events: German East Africa,
  the East Africa Protectorate (British East Africa: Kenya and, from 1925, Trans-Juba in Somalia), Ruanda-Urundi,
  Company rule in Rhodesia, Italian East Africa, and the Ottoman Habesh Eyalet (Eritrea, Sudan and Djibouti coasts).
- Unions are their own rows: the Federation of Rhodesia and Nyasaland. Tanzania is the union of Tanganyika and
  Zanzibar; Tanganyika's governments are its phases, and Zanzibar (which keeps a government of its own) is a row with
  an ongoing membership of tanzania. Somalia is the union of 1960; Somaliland has a membership of somalia 1960–91.
- Ethiopia's 1936–41 occupation is a rival phase plus memberships of italy and italian-east-africa. Cape Colony,
  Natal, the Transvaal and Orange River colonies and British Bechuanaland are parallel phases of south-africa with
  memberships in british-empire; South West Africa is a phase of namibia with a membership of south-africa.
- The Boer republics, the Griqua states, the Zulu, Mthethwa and Ndwandwe kingdoms, the four nominally independent
  bantustans, the Horn's sultanates and the Gibe kingdoms, the interlacustrine kingdoms and the others with an infobox
  that lived after 1500 are rows. Kingdoms abolished in 1967 and restored in 1993 (Buganda, Bunyoro, Tooro) have two
  stretches and an ongoing membership of uganda.
- Medieval seam (lead, 2026-11-21): ethiopia (Zagwe and Solomonic phases), adal-sultanate, ajuran-sultanate,
  kilwa-sultanate, mutapa, kingdom-of-butua, sultanate-of-mogadishu and kingdom-of-zimbabwe copy Medieval World's ids,
  dates and claim locations. A century in an infobox is read as Medieval does: mid-century ± 50 ("16th/17th century":
  1600 ± 100), circa, with the text in the note.
- AI-flagged pages are refused by G.art: `History of Eswatini` (so Eswatini starts at independence) and `Shambaa
  Kingdom` (left out).

Called from gen_modern.py with its module (M).
"""
import re

GROUPS = [
    {'id': 'eastern-africa', 'name': 'Eastern Africa', 'color': '#7a5a3a', 'parent': 'africa'},
    {'id': 'southern-africa', 'name': 'Southern Africa', 'color': '#8a6a2a', 'parent': 'africa'},
]

EAF, SAF = 'eastern-africa', 'southern-africa'

# rows of this wave added to events other modules define (union-event rule: only rows that acted as themselves)
SHARED = {
    'ww1': ['german-east-africa', 'south-africa'],
    'ww2': ['ethiopia', 'italian-east-africa', 'south-africa'],
    'zanzibar-partition': ['zanzibar'],  # mena.py: the Omani Empire divides; the Sultanate of Zanzibar begins
    'first-sudanese-civil-war': ['south-sudan'],  # mena.py: ended by the 1972 Addis Ababa Agreement (South Sudan's autonomy)
    'second-sudanese-civil-war': ['south-sudan'],  # mena.py: autonomy abolished in 1983, restored in 2005
    'south-sudan-secession': ['south-sudan'],  # mena.py
    'conquest-of-sudan': ['shilluk-kingdom'],  # mena.py: the Turco-Egyptian advance up the Nile
    'carnation-revolution': ['mozambique'],  # europe.py: Portugal's revolution leads to Mozambique's independence
    # africa_west.py (built in parallel; these apply once both modules are merged)
    'portuguese-colonial-war': ['mozambique'],
    'first-congo-war': ['rwanda', 'uganda', 'burundi'],
    'second-congo-war': ['rwanda', 'uganda', 'burundi', 'zimbabwe', 'namibia'],
}


# ---------- helpers shared by tracks() and events() (as in africa_west.py) ----------

_PROSE = {}


def _prose(M, t):
    """(section, sentence) pairs of an article's prose: the lead, then each section (for citing a body sentence)."""
    if t not in _PROSE:
        import mwparserfromhell as mw
        import wp_states
        M.G.art(t)  # refuses missing and AI-flagged pages, registers the source
        code = mw.parse(wp_states.wp_dump.page(t)['text'])
        out = []
        for sec in code.get_sections(include_lead=True, flat=True):
            hs = sec.filter_headings(recursive=False)
            h = wp_states.plain(hs[0].title, []).strip() if hs else None
            body = str(sec).split('\n', 1)[1] if hs and '\n' in str(sec) else ('' if hs else str(sec))
            for s in wp_states.sentences(wp_states._prose(mw.parse(body))):
                out.append((h, s))
        _PROSE[t] = out
    return _PROSE[t]


def SENT(M, t, needle, k=0, note=None, margin=None):
    """Claim dated by the k-th year written in the first sentence of article t that contains `needle` (no typed year)."""
    import wp_states
    for sec, s in _prose(M, t):
        if needle in s:
            ys = wp_states.years_in(s)[0]
            loc = f'lead: "{s[:160]}"' if sec is None else f'section "{sec}": "{s[:160]}"'
            c = {'year': ys[k]}
            if margin:
                c['margin'] = margin
            c['source'] = M.G.ref(t, loc)
            if note:
                c['note'] = note
            return [c]
    raise SystemExit(f'{t}: no sentence with {needle!r}')


def SREF(M, t, needle):
    """Source ref for the first sentence of article t that contains `needle`."""
    for sec, s in _prose(M, t):
        if needle in s:
            return M.G.ref(t, f'lead: "{s[:160]}"' if sec is None else f'section "{sec}": "{s[:160]}"')
    raise SystemExit(f'{t}: no sentence with {needle!r}')


def CENT(M, t, field, note=None):
    """A century in an infobox field, read as Medieval World does: mid-century ± 50; "16th/17th century" = 1600 ± 100;
    "15th-16th century" = 1500 ± 100; "12th/13th/14th century" = 1250 ± 150 (the span's middle and half-width)."""
    txt = M.G.art(t)['fields'][field]['text']
    ns = [int(n) for n in re.findall(r'(\d+)(?:st|nd|rd|th)', txt)]
    if not ns or 'century' not in txt:
        raise SystemExit(f'{t}: {field} {txt!r} names no century')
    lo, hi = (min(ns) - 1) * 100, max(ns) * 100
    year, margin = (lo + hi) // 2, (hi - lo) // 2
    return [{'year': year, 'margin': margin, 'source': M.G.ref(t, f'infobox {field}: {txt[:80]}'),
             'note': note or f'The infobox says "{txt}".'}]


def CENTS(M, t, needle):
    """A century written in a prose sentence ("in the mid-18th century"), read as CENT reads an infobox."""
    ref = SREF(M, t, needle)
    n = int(re.search(r'(\d+)(?:st|nd|rd|th)[- ]century', ref['sourceLocation']).group(1))
    return [{'year': (n - 1) * 100 + 50, 'margin': 50, 'source': ref, 'note': f'The article says "{needle}": mid-century ± 50.'}]


def FK(M, t, field, k, note=None):
    """Claim from the k-th year written in an infobox field (a life span or date range listing several years)."""
    f = M.G.art(t)['fields'][field]
    c = {'year': f['years'][k], 'source': M.G.ref(t, f'infobox {field}: {f["text"][:90]}')}
    if note:
        c['note'] = note
    return [c]


def EVC(M, t, n, note=None):
    """Claim from an infobox event (date_eventN, or 'start'/'end')."""
    y, r = M.E(t, n)
    c = {'year': y, 'source': r}
    if note:
        c['note'] = note
    return [c]


def EVL(M, t, n):
    """Claim from the last year of an infobox event's date range (date_eventN)."""
    f = M.G.art(t)['fields']
    d = f[f'date_event{n}']
    return [{'year': d['years'][-1], 'source': M.G.ref(t, f'infobox event{n}: {f.get(f"event{n}", {}).get("text", "")}, {d["text"]}')}]


def tracks(M):
    G, F, C, E, phase, stretch, span, member, row = (
        M.G, M.F, M.C, M.E, M.phase, M.stretch, M.span, M.member, M.row)

    def lead(t, needle):
        return SREF(M, t, needle)

    def S1(t, spec='year_start'):
        """The first claim only of an article field: for citing where a neighbouring phase begins or ends."""
        return F(t, spec, 'start')[:1]

    def E1(t, spec='year_end'):
        return F(t, spec, 'end')[:1]

    def est(t, k):
        return F(t, f'established_date{k}', 'start')[:1]

    def estl(t, k):
        """The last year of an established_dateN range."""
        return F(t, f'established_date{k}:last', 'end')[:1]

    def cur(t, k, note=''):
        """Ref saying a state still exists: its infobox's latest established event."""
        f = G.art(t)['fields']
        return G.ref(t, f"infobox established_event{k}: {f[f'established_event{k}']['text']}, "
                        f"{f.get(f'established_date{k}', {}).get('text', '')} (current state{note})".replace(', ,', ','))

    def EV(t, n, note=None):
        return EVC(M, t, n, note)

    def SN(t, needle, k=0, note=None, margin=None):
        return SENT(M, t, needle, k, note, margin)

    def CN(t, field, note=None):
        return CENT(M, t, field, note)

    def K(t, field, k, note=None):
        return FK(M, t, field, k, note)

    def ph(name, t, s='year_start', e='year_end', **kw):
        return phase(name, F(t, s, 'start'), F(t, e, 'end'), **kw)

    def life(t, s='year_start', e='year_end', *, startEvent=None, endEvent=None, circa=False, sc=None, ec=None):
        """A row's single typed stretch from its own infobox (or given claims)."""
        return span(stretch(None, sc or F(t, s, 'start'), ec or F(t, e, 'end'), startEvent=startEvent, endEvent=endEvent, circa=circa))

    def hist(id_, name, color, parent, t, **kw):
        mem = kw.pop('memberOf', None)
        return row(id_, name, color, parent, t, span_=life(t, **kw), memberOf=mem)

    def copy_claims(medieval_claims):
        """Medieval World's claims, re-cited from the same dump article at the same location: (title, location, spec, side)."""
        return [{'year': F(title, spec, side)[0]['year'], 'source': G.ref(title, loc)} for title, loc, spec, side in medieval_claims]

    be, fce, pe, de = 'british-empire', 'french-colonial-empire', 'portuguese-empire', 'dutch-empire'
    T = []

    # =====================================================================================================
    # The Horn of Africa
    # =====================================================================================================

    # ---------- Ethiopia (Medieval seam: Zagwe and Solomonic phases as medieval.json) ----------
    zd, ee, iea, derg, pdre, eth = ('Zagwe dynasty', 'Ethiopian Empire', 'Italian East Africa', 'Derg',
                                    "People's Democratic Republic of Ethiopia", 'Ethiopia')
    T.append(row('ethiopia', 'Ethiopia', '#2a7a3a', EAF, eth, phases=[
        phase('Zagwe dynasty', copy_claims([(zd, 'infobox year_start: 1137', 'year_start', 'start')]),
              copy_claims([(zd, 'infobox year_end: 1270', 'year_end', 'end')])),
        phase('Ethiopian Empire (Solomonic)', copy_claims([(ee, 'infobox year_start: 1270', 'year_start', 'start')]),
              copy_claims([(ee, 'infobox life span: 1270–1974', 'seg0.end', 'end')]), endEvent='derg-coup'),
        # the Italian occupation ran beside the emperor's government-in-exile (Ethiopian Empire life span: "1936–1941:
        # Government-in-exile"): a rival phase
        phase('Italian occupation', F(iea, 'seg0.start', 'start'), F(iea, 'seg0.end', 'end'),
              startEvent='second-italo-ethiopian-war', endEvent='east-african-campaign-ww2'),
        ph('Derg', derg, startEvent='derg-coup', endEvent='pdre-constitution'),
        ph("People's Democratic Republic", pdre, startEvent='pdre-constitution', endEvent='fall-of-addis-ababa-1991'),
        phase('Transitional Government', est(eth, 11), est(eth, 12), startEvent='fall-of-addis-ababa-1991', endEvent='ethiopian-constitution-1995'),
        phase('Federal Democratic Republic', est(eth, 12), ongoing=cur(eth, 12), startEvent='ethiopian-constitution-1995'),
    ], memberOf=[
        member('italy', F(iea, 'seg0.start', 'start'), F(iea, 'seg0.end', 'end'),
               sources=[lead(iea, 'colonial administrative entity of the Kingdom of Italy')],
               startEvent='second-italo-ethiopian-war', endEvent='east-african-campaign-ww2'),
        member('italian-east-africa', F(iea, 'seg0.start', 'start'), F(iea, 'seg0.end', 'end'),
               sources=[lead(iea, 'It encompassed Italian Somaliland, Italian Eritrea')],
               startEvent='second-italo-ethiopian-war', endEvent='east-african-campaign-ww2'),
    ]))
    T.append(row('italian-east-africa', 'Italian East Africa', '#4a7a5a', EAF, iea,
                 span_=life(iea, 'seg0.start', 'seg0.end', startEvent='second-italo-ethiopian-war', endEvent='east-african-campaign-ww2'),
                 memberOf=[member('italy', F(iea, 'seg0.start', 'start'), F(iea, 'seg0.end', 'end'),
                                  sources=[lead(iea, 'colonial administrative entity of the Kingdom of Italy')])]))

    # ---------- Eritrea ----------
    ie, bma, efed, eri, mb = 'Italian Eritrea', 'British Military Administration (Eritrea)', 'Eritrea (1952–1962)', 'Eritrea', 'Medri Bahri'
    T.append(row('eritrea', 'Eritrea', '#3a8a9a', EAF, eri,
                 # inside Italian East Africa (1936–41) and annexed by Ethiopia (1962–91) with no government of its own:
                 # the lifespan carries it across
                 span_=span(stretch(None, F(ie, 'seg0.start', 'start'), ongoing=cur(eri, 3))),
                 phases=[
        phase('Italian Eritrea', F(ie, 'seg0.start', 'start'), F(ie, 'seg0.end', 'end'), endEvent='second-italo-ethiopian-war'),
        phase('British Military Administration', F(bma, 'seg0.start', 'start'), F(bma, 'seg0.end', 'end'),
              startEvent='east-african-campaign-ww2', endEvent='ethiopia-eritrea-federation'),
        ph('Eritrea in federation with Ethiopia', efed, startEvent='ethiopia-eritrea-federation', endEvent='eritrea-annexed'),
        phase('State of Eritrea', est(eri, 2) + [dict(est(eri, 3)[0], note='De jure independence after the 1993 referendum.')],
              ongoing=cur(eri, 3), startEvent='eritrean-war-of-independence'),
    ], memberOf=[
        member('italy', F(ie, 'seg0.start', 'start'), EV(ie, 5), sources=[lead(ie, 'came under government control in 1882')],
               endEvent='east-african-campaign-ww2'),
        member('italian-east-africa', EV(ie, 4), EV(ie, 5), sources=[lead(ie, 'integrated into Italian East Africa')],
               endEvent='east-african-campaign-ww2'),
        member(be, F(bma, 'seg0.start', 'start'), F(bma, 'seg0.end', 'end'), sources=[lead(eri, 'British Military Administration')],
               startEvent='east-african-campaign-ww2', endEvent='ethiopia-eritrea-federation'),
        member('ethiopia', S1(efed), est(eri, 2), sources=[lead(eri, 'formally annexed Eritrea')],
               startEvent='ethiopia-eritrea-federation', endEvent='eritrean-war-of-independence'),
    ]))
    T.append(row('medri-bahri', 'Medri Bahri', '#5a8a8a', EAF, mb,
                 span_=life(mb, sc=CN(mb, 'year_start'), ec=E1(mb), circa=True, endEvent='italian-eritrea-founded'),
                 memberOf=[member('ethiopia', CN(mb, 'year_start'), E1(mb),
                                  sources=[lead(mb, 'regained its importance in the empire')])]))
    he = 'Habesh Eyalet'
    T.append(row('habesh-eyalet', 'Habesh Eyalet', '#8a6a4a', EAF, he, span_=span(
        stretch(None, F(he, 'seg0.start', 'start'), F(he, 'seg0.end', 'end')),
        stretch(None, F(he, 'seg1.start', 'start'), F(he, 'seg1.end', 'end'))),
        memberOf=[member('ottoman-empire', F(he, 'seg0.start', 'start'), F(he, 'seg0.end', 'end'),
                         sources=[G.ref(he, 'infobox: former subdivision (eyalet) of the Ottoman Empire, life span 1557–1802 / 1813–1872')]),
                  member('ottoman-empire', F(he, 'seg1.start', 'start'), F(he, 'seg1.end', 'end'),
                         sources=[G.ref(he, 'infobox: former subdivision (eyalet) of the Ottoman Empire, life span 1557–1802 / 1813–1872')])]))

    # ---------- Djibouti ----------
    fs, ftai, dj = 'French Somaliland', 'French Territory of the Afars and the Issas', 'Djibouti'
    T.append(row('djibouti', 'Djibouti', '#4a9ac0', EAF, dj, phases=[
        ph('French Somaliland', fs, startEvent='french-somaliland-established'),
        ph('French Territory of the Afars and the Issas', ftai, endEvent='djibouti-independence'),
        phase('Republic of Djibouti', est(dj, 1), ongoing=cur(dj, 2), startEvent='djibouti-independence'),
    ], memberOf=[
        member(fce, S1(fs), E1(ftai), sources=[G.ref(fs, 'infobox: French Somaliland, 1884–1967'), G.ref(ftai, 'infobox: French Territory of the Afars and the Issas, 1967–1977')],
               endEvent='djibouti-independence'),
    ]))
    T.append(hist('imamate-of-aussa', 'Imamate of Aussa', '#6a7a5a', EAF, 'Imamate of Aussa', startEvent='adal-ends'))
    T.append(hist('sultanate-of-aussa', 'Sultanate of Aussa', '#7a8a5a', EAF, 'Sultanate of Aussa', endEvent='second-italo-ethiopian-war'))
    T.append(hist('emirate-of-harar', 'Emirate of Harar', '#8a7a4a', EAF, 'Emirate of Harar', endEvent='battle-of-chelenqo'))
    T.append(row('adal-sultanate', 'Adal Sultanate', '#2a5a5a', EAF, 'Adal Sultanate', span_=span(stretch(
        None, copy_claims([('Adal Sultanate', 'infobox year_start: 1415', 'year_start', 'start')]),
        copy_claims([('Adal Sultanate', 'infobox year_end: 1577', 'year_end', 'end')]), endEvent='adal-ends'))))

    # ---------- Somalia and Somaliland ----------
    isl, tts, sr, sdr, tng, tfg, som = ('Italian Somaliland', 'Trust Territory of Somaliland', 'Somali Republic', 'Somali Democratic Republic',
                                        'Transitional National Government of Somalia', 'Transitional Federal Government of Somalia', 'Somalia')
    T.append(row('somalia', 'Somalia', '#3a7ac0', EAF, som,
                 # under British occupation (1941–50) and without a government during the civil war (1991–2000):
                 # the lifespan carries it across
                 span_=span(stretch(None, F(isl, 'seg0.start', 'start'), ongoing=cur(som, 13))),
                 phases=[
        phase('Italian Somaliland', F(isl, 'seg0.start', 'start'), F(isl, 'seg0.end', 'end'), endEvent='east-african-campaign-ww2'),
        ph('Trust Territory of Somaliland (Italian administration)', tts, endEvent='somali-unification'),
        ph('Somali Republic', sr, startEvent='somali-unification', endEvent='somali-coup-1969'),
        ph('Somali Democratic Republic', sdr, startEvent='somali-coup-1969', endEvent='somali-civil-war'),
        ph('Transitional National Government', tng),
        ph('Transitional Federal Government', tfg),
        phase('Federal Republic of Somalia', est(som, 13), ongoing=cur(som, 13)),
    ], memberOf=[
        member('italy', F(isl, 'seg0.start', 'start'), F(isl, 'seg0.end', 'end'), sources=[lead(isl, 'Italy established a protectorate')],
               endEvent='east-african-campaign-ww2'),
        member('italian-east-africa', EV(isl, 6), F(isl, 'seg0.end', 'end'), sources=[lead(isl, 'integrated into Italian East Africa')],
               endEvent='east-african-campaign-ww2'),
        member(be, F(isl, 'seg0.end', 'end'), S1(tts), sources=[lead(isl, 'occupied by British troops')], startEvent='east-african-campaign-ww2'),
        member('italy', S1(tts), E1(tts), sources=[lead(isl, 'UN Trust Territory of Somalia under Italian administration')], endEvent='somali-unification'),
    ]))
    bs, sos, sl = 'British Somaliland', 'State of Somaliland', 'Somaliland'
    T.append(row('somaliland', 'Somaliland (disputed)', '#5a9ac0', EAF, sl,
                 # inside the Somali Republic (1960–91) with no government of its own: the lifespan carries it across
                 span_=span(stretch(None, F(bs, 'seg0.start', 'start'), ongoing=cur(sl, 7, '; recognised only by Israel'))),
                 phases=[
        phase('British Somaliland', F(bs, 'seg0.start', 'start'), F(bs, 'seg0.end', 'end'), endEvent='somaliland-independence-1960'),
        ph('State of Somaliland', sos, startEvent='somaliland-independence-1960', endEvent='somali-unification'),
        # declared independent in 1991; recognised by Israel alone (Somaliland lead), claimed by Somalia
        phase('Republic of Somaliland', est(sl, 6), ongoing=cur(sl, 7, '; recognised only by Israel'), startEvent='somaliland-declares-independence'),
    ], memberOf=[
        member(be, F(bs, 'seg0.start', 'start'), F(bs, 'seg0.end', 'end'), sources=[lead(bs, 'the territory was a British protectorate')],
               endEvent='somaliland-independence-1960'),
        member('somalia', est(sl, 4), est(sl, 6), sources=[G.ref(sl, 'infobox established_event4: Union with the Trust Territory of Somaliland to form the Somali Republic, 1 July 1960')],
               startEvent='somali-unification', endEvent='somaliland-declares-independence'),
    ]))
    T.append(row('ajuran-sultanate', 'Ajuran Sultanate', '#3a8a8a', EAF, 'Ajuran Sultanate', span_=span(stretch(
        None, [{'year': 1250, 'margin': 50, 'source': G.ref('Ajuran Sultanate', 'infobox year_start: 13th century'), 'note': 'The infobox says "13th century".'}],
        copy_claims([('Ajuran Sultanate', 'infobox year_end: 1695', 'year_end', 'end')]), circa=True, endEvent='geledi-founded'))))
    # Medieval World reads "16th century" as 1550 ± 50 for the end; the same claim here (an open end after 1500)
    T.append(row('sultanate-of-mogadishu', 'Sultanate of Mogadishu', '#5a5a8a', EAF, 'Sultanate of Mogadishu', span_=span(stretch(
        None, [{'year': 950, 'margin': 50, 'source': G.ref('Sultanate of Mogadishu', 'infobox year_start: 10th century'), 'note': 'The infobox says "10th century".'}],
        [{'year': 1550, 'margin': 50, 'source': G.ref('Sultanate of Mogadishu', 'infobox year_end: 16th century'), 'note': 'The infobox says "16th century".'}],
        circa=True))))
    mj, hob = 'Majeerteen Sultanate', 'Sultanate of Hobyo'
    T.append(row('majeerteen-sultanate', 'Majeerteen Sultanate', '#4a6a9a', EAF, mj,
                 span_=life(mj, sc=CN(mj, 'year_start'), circa=True, endEvent='campaign-of-the-sultanates'),
                 memberOf=[member('italy', EV(isl, 2), E1(mj), sources=[lead(mj, 'it became a protectorate of Italy')],
                                  endEvent='campaign-of-the-sultanates')]))
    T.append(row('sultanate-of-hobyo', 'Sultanate of Hobyo', '#5a7aaa', EAF, hob,
                 span_=life(hob, sc=K(hob, 'date_start', 0, 'The infobox says "1870s or 1884".') + K(hob, 'date_start', 1), circa=True,
                            endEvent='campaign-of-the-sultanates'),
                 memberOf=[member('italy', EV(hob, 2), E1(hob), sources=[G.ref(hob, 'infobox event2: Protectorate treaty with the Kingdom of Italy, 8 February 1889')],
                                  endEvent='campaign-of-the-sultanates')]))
    T.append(hist('isaaq-sultanate', 'Isaaq Sultanate', '#6a8aaa', EAF, 'Isaaq Sultanate', endEvent='british-somaliland-protectorate'))
    T.append(hist('habr-yunis-sultanate', 'Habr Yunis Sultanate', '#7a8aba', EAF, 'Habr Yunis Sultanate', circa=True))
    T.append(hist('warsangali-sultanate', 'Warsangali Sultanate', '#4a5a8a', EAF, 'Warsangali Sultanate', endEvent='somaliland-campaign-1920'))
    T.append(hist('sultanate-of-the-geledi', 'Sultanate of the Geledi', '#5a6a7a', EAF, 'Sultanate of the Geledi', startEvent='geledi-founded'))
    T.append(hist('dervish-state', 'Dervish State', '#6a5a4a', EAF, 'Dervish State (Horn of Africa)', endEvent='somaliland-campaign-1920'))

    # ---------- the Gibe and southern Ethiopian kingdoms (all annexed by the Ethiopian Empire) ----------
    T.append(hist('kingdom-of-kaffa', 'Kingdom of Kaffa', '#6a4a2a', EAF, 'Kingdom of Kaffa', circa=True, endEvent='kaffa-annexed'))
    T.append(row('kingdom-of-yamma', 'Kingdom of Yamma (Janjero)', '#7a5a3a', EAF, 'Kingdom of Yamma',
                 span_=life('Kingdom of Yamma', sc=CN('Kingdom of Yamma', 'year_start'), circa=True, endEvent='yamma-annexed')))
    T.append(hist('kingdom-of-wolaita', 'Kingdom of Wolaita', '#8a6a3a', EAF, 'Kingdom of Wolaita', endEvent='wolaita-annexed'))
    T.append(hist('kingdom-of-garo', 'Kingdom of Garo', '#5a4a3a', EAF, 'Kingdom of Garo', endEvent='garo-annexed'))
    T.append(hist('kingdom-of-jimma', 'Kingdom of Jimma', '#9a7a3a', EAF, 'Kingdom of Jimma', endEvent='jimma-annexed'))
    T.append(hist('kingdom-of-gumma', 'Kingdom of Gumma', '#7a6a5a', EAF, 'Kingdom of Gumma', circa=True, endEvent='gumma-annexed'))
    T.append(row('kingdom-of-gomma', 'Kingdom of Gomma', '#8a7a5a', EAF, 'Kingdom of Gomma',
                 span_=life('Kingdom of Gomma', 'seg0.start', 'seg0.end', circa=True, endEvent='gomma-annexed')))
    T.append(hist('kingdom-of-limmu-ennarea', 'Kingdom of Limmu-Ennarea', '#6a6a4a', EAF, 'Kingdom of Limmu-Ennarea', endEvent='limmu-annexed'))
    T.append(hist('kingdom-of-gera', 'Kingdom of Gera', '#9a8a5a', EAF, 'Kingdom of Gera', endEvent='gera-annexed'))

    T += east_africa(M, locals())
    T += southern_africa(M, locals())
    return T


def east_africa(M, h):
    """The Swahili coast, the Great Lakes, and the lands between the Zambezi and Lake Malawi."""
    G, F, phase, stretch, span, member, row = M.G, M.F, M.phase, M.stretch, M.span, M.member, M.row
    S1, E1, est, cur, EV, SN, CN, K, ph, life, hist, lead, copy_claims = (
        h['S1'], h['E1'], h['est'], h['cur'], h['EV'], h['SN'], h['CN'], h['K'], h['ph'], h['life'], h['hist'], h['lead'], h['copy_claims'])
    be, pe, fce = h['be'], h['pe'], h['fce']
    T = []

    # ---------- Kenya ----------
    eap, kc, k63, ken = 'East Africa Protectorate', 'Kenya Colony', 'Kenya (1963–1964)', 'Kenya'
    # British East Africa: Kenya and, until 1925, Trans-Juba (ceded to Italian Somaliland): its own row (lead, 2026-11-21)
    T.append(hist('east-africa-protectorate', 'East Africa Protectorate (British East Africa)', '#6a5a8a', EAF, eap,
                  endEvent='kenya-colony-established',
                  memberOf=[member(be, S1(eap), E1(eap), sources=[lead(eap, 'was a British protectorate')], endEvent='kenya-colony-established')]))
    T.append(row('kenya', 'Kenya', '#3a6a3a', EAF, ken, phases=[
        ph('Kenya Colony', kc, startEvent='kenya-colony-established', endEvent='kenyan-independence'),
        ph('Kenya (Commonwealth realm)', k63, startEvent='kenyan-independence', endEvent='kenya-republic'),
        phase('Republic of Kenya', est(ken, 2), ongoing=cur(ken, 2), startEvent='kenya-republic'),
    ], memberOf=[
        member(be, S1(kc), E1(kc), sources=[lead(kc, 'was a colony part of the British Empire')],
               startEvent='kenya-colony-established', endEvent='kenyan-independence'),
    ]))
    T.append(hist('wituland', 'Wituland', '#8a6a5a', EAF, 'Wituland', circa=True))

    # ---------- Tanzania and Zanzibar ----------
    gea, tt, t61, tz, sz, prz, zan = ('German East Africa', 'Tanganyika Territory', 'Tanganyika (1961–1964)', 'Tanzania',
                                      'Sultanate of Zanzibar', "People's Republic of Zanzibar", 'Zanzibar')
    T.append(row('german-east-africa', 'German East Africa', '#5a5a5a', EAF, gea, span_=span(stretch(
        None, F(gea, 'seg0.start', 'start'), F(gea, 'seg0.end', 'end') + [dict(E1(gea)[0], note='Formally disestablished on 28 June 1919.')],
        endEvent='east-african-campaign-ww1')),
        memberOf=[member('germany', F(gea, 'seg0.start', 'start'), F(gea, 'seg0.end', 'end'), sources=[lead(gea, 'was a German colony')],
                         endEvent='east-african-campaign-ww1')]))
    T.append(row('tanzania', 'Tanzania', '#2a8a6a', EAF, tz, phases=[
        phase('Tanganyika Territory', F(tt, 'seg0.start', 'start') + [dict(S1(tt)[0], note='League of Nations mandate from 20 July 1922.')],
              F(tt, 'seg0.end', 'end'), startEvent='east-african-campaign-ww1', endEvent='tanganyika-independence'),
        ph('Tanganyika', t61, startEvent='tanganyika-independence', endEvent='tanzania-union'),
        phase('United Republic of Tanzania', est(tz, 3), ongoing=cur(tz, 4), startEvent='tanzania-union'),
    ], memberOf=[
        member(be, F(tt, 'seg0.start', 'start'), F(tt, 'seg0.end', 'end'), sources=[lead(tt, 'administered by the United Kingdom')],
               startEvent='east-african-campaign-ww1', endEvent='tanganyika-independence'),
    ]))
    T.append(row('zanzibar', 'Zanzibar', '#3a9a7a', EAF, zan, phases=[
        ph('Sultanate of Zanzibar', sz, startEvent='zanzibar-partition', endEvent='zanzibar-revolution'),
        phase("People's Republic of Zanzibar", S1(prz), est(zan, 3), startEvent='zanzibar-revolution', endEvent='tanzania-union'),
        phase('Zanzibar (semi-autonomous, in Tanzania)', est(zan, 3), ongoing=cur(zan, 3, '; a semi-autonomous part of Tanzania'),
              startEvent='tanzania-union'),
    ], memberOf=[
        member(be, EV(sz, 2), EV(sz, 4), sources=[G.ref(sz, 'infobox event4: End of British Protectorate, 10 December 1963')],
               startEvent='heligoland-zanzibar-treaty'),
        member('tanzania', est(zan, 3), ongoing=True, sources=[G.ref(zan, 'infobox established_event3: Unification of Tanganyika and Zanzibar, 26 April 1964')],
               startEvent='tanzania-union'),
    ]))
    ks = 'Kilwa Sultanate'
    T.append(row('kilwa-sultanate', 'Kilwa Sultanate', '#a86a4a', EAF, ks, span_=span(stretch(
        None, copy_claims([(ks, 'infobox year_start: 957', 'year_start', 'start')]),
        copy_claims([(ks, 'infobox year_end: 1513', 'year_end', 'end')])))))
    T.append(hist('kingdom-of-karagwe', 'Kingdom of Karagwe', '#7a7a3a', EAF, 'Kingdom of Karagwe', circa=True))

    # ---------- Uganda and its kingdoms ----------
    up, u62, ug, bug, bun, too = 'Protectorate of Uganda', 'Uganda (1962–1963)', 'Uganda', 'Buganda', 'Bunyoro', 'Tooro Kingdom'
    T.append(row('uganda', 'Uganda', '#c0a02a', EAF, ug, phases=[
        ph('Protectorate of Uganda', up, startEvent='uganda-protectorate', endEvent='ugandan-independence'),
        ph('Uganda (Commonwealth realm)', u62, startEvent='ugandan-independence', endEvent='uganda-republic'),
        phase('Republic of Uganda', est(ug, 2), ongoing=cur(ug, 3), startEvent='uganda-republic'),
    ], memberOf=[
        member(be, S1(up), E1(up), sources=[lead(up, 'was a protectorate of the British Empire')], startEvent='uganda-protectorate',
               endEvent='ugandan-independence'),
    ]))
    # the kingdoms abolished by Obote in 1967 and restored in 1993: two stretches, with an ongoing membership of uganda
    T.append(row('buganda', 'Buganda', '#a08a2a', EAF, bug, span_=span(
        stretch(None, CN(bug, 'established_date1'), est(bug, 4), circa=True, endEvent='uganda-kingdoms-abolished'),
        stretch(None, est(bug, 5), ongoing=cur(bug, 5, '; a constitutional kingdom within Uganda'), startEvent='uganda-kingdoms-restored')),
        memberOf=[member('uganda', est(bug, 2), est(bug, 4), sources=[lead(bug, 'became the centre of the Protectorate of Uganda')],
                         startEvent='uganda-protectorate', endEvent='uganda-kingdoms-abolished'),
                  member('uganda', est(bug, 5), ongoing=True, sources=[lead(bug, 'officially restored in 1993')], startEvent='uganda-kingdoms-restored')]))
    T.append(row('bunyoro', 'Bunyoro', '#b07a3a', EAF, bun, span_=span(
        stretch(None, CN(bun, 'date_start'), EV(bun, 2), circa=True, endEvent='uganda-kingdoms-abolished'),
        stretch(None, EV(bun, 3), ongoing=G.ref(bun, 'infobox event3: Monarchy restored, 1993 (current state)'), startEvent='uganda-kingdoms-restored')),
        memberOf=[member('uganda', EV(bun, 1), EV(bun, 2), sources=[G.ref(bun, 'infobox event1: Establishment of Protectorate of Uganda, 1894')],
                         startEvent='uganda-protectorate', endEvent='uganda-kingdoms-abolished'),
                  member('uganda', EV(bun, 3), ongoing=True, sources=[G.ref(bun, 'infobox event3: Monarchy restored, 1993')], startEvent='uganda-kingdoms-restored')]))
    T.append(row('tooro-kingdom', 'Tooro Kingdom', '#c08a4a', EAF, too, span_=span(
        stretch(None, K(too, 'established_date1', 0, 'The infobox gives "1830, 1876" for its split from Bunyoro.') + K(too, 'established_date1', 1),
                est(too, 2), endEvent='uganda-kingdoms-abolished'),
        stretch(None, est(too, 3), ongoing=cur(too, 3, '; a constitutional kingdom within Uganda'), startEvent='uganda-kingdoms-restored'))))
    T.append(hist('ankole', 'Ankole (Nkore)', '#9a6a2a', EAF, 'Ankole', endEvent='uganda-kingdoms-abolished',
                  memberOf=[member('uganda', EV('Ankole', 1), E1('Ankole'), sources=[G.ref('Ankole', 'infobox event1: Incorporated into Protectorate of Uganda, 1901')],
                                   endEvent='uganda-kingdoms-abolished')]))
    rz = 'Rwenzururu'
    T.append(row('rwenzururu', 'Rwenzururu', '#7a8a4a', EAF, rz, span_=span(stretch(
        None, est(rz, 1), ongoing=cur(rz, 3, '; recognised as a cultural institution'), startEvent='rwenzururu-secession')),
        memberOf=[member('uganda', est(rz, 2), ongoing=True, sources=[G.ref(rz, 'infobox established_event2: Autonomy granted by the Ugandan government, 13 August 1982')])]))

    # ---------- Rwanda, Burundi and Ruanda-Urundi ----------
    kr, rw, kb, bu, ru = 'Kingdom of Rwanda', 'Rwanda', 'Kingdom of Burundi', 'Burundi', 'Ruanda-Urundi'
    T.append(row('ruanda-urundi', 'Ruanda-Urundi', '#6a8a6a', EAF, ru, span_=life(ru, startEvent='east-african-campaign-ww1', endEvent='rwanda-burundi-independence'),
                 memberOf=[member('belgium', S1(ru), E1(ru), sources=[lead(ru, 'ruled by Belgium between 1916 and 1962')],
                                  startEvent='east-african-campaign-ww1', endEvent='rwanda-burundi-independence')]))
    T.append(row('rwanda', 'Rwanda', '#2a9ac0', EAF, rw, phases=[
        phase('Kingdom of Rwanda', S1(kr) + CN(rw, 'established_date1', 'The Rwanda article dates the kingdom to the 15th century.'),
              E1(kr), circa=True, endEvent='rwandan-republic'),
        phase('Republic of Rwanda', est(rw, 5), ongoing=cur(rw, 8), startEvent='rwandan-republic'),
    ], memberOf=[
        member('german-east-africa', est(rw, 2), F(rw, 'established_date2:last', 'end')[:1], sources=[G.ref(rw, 'infobox established_event2: Part of German East Africa, 1897–1916')],
               endEvent='east-african-campaign-ww1'),
        member('ruanda-urundi', est(rw, 3), F(rw, 'established_date3:last', 'end')[:1], sources=[G.ref(rw, 'infobox established_event3: Part of Ruanda-Urundi, 1916–1962')],
               startEvent='east-african-campaign-ww1', endEvent='rwanda-burundi-independence'),
    ]))
    T.append(row('burundi', 'Burundi', '#c03a3a', EAF, bu, phases=[
        phase('Kingdom of Burundi', F(kb, 'seg0.start', 'start'), F(kb, 'seg0.end', 'end'), circa=True, endEvent='burundi-republic'),
        phase('Republic of Burundi', est(bu, 5), ongoing=cur(bu, 7), startEvent='burundi-republic'),
    ], memberOf=[
        member('german-east-africa', est(bu, 2), F(bu, 'established_date2:last', 'end')[:1], sources=[G.ref(bu, 'infobox established_event2: Part of German East Africa, 1890–1916')],
               endEvent='east-african-campaign-ww1'),
        member('ruanda-urundi', est(bu, 3), F(bu, 'established_date3:last', 'end')[:1], sources=[G.ref(bu, 'infobox established_event3: Part of Ruanda-Urundi, 1916–1962')],
               startEvent='east-african-campaign-ww1', endEvent='rwanda-burundi-independence'),
    ]))

    # ---------- Malawi ----------
    bca, nya, mw, frn = 'British Central Africa Protectorate', 'Nyasaland', 'Malawi', 'Federation of Rhodesia and Nyasaland'
    T.append(row('federation-of-rhodesia-and-nyasaland', 'Federation of Rhodesia and Nyasaland', '#7a6a8a', EAF, frn,
                 span_=life(frn, startEvent='central-african-federation-formed', endEvent='central-african-federation-dissolved'),
                 memberOf=[member(be, S1(frn), E1(frn), sources=[lead(frn, 'was a colonial federation')])]))
    T.append(row('malawi', 'Malawi', '#3a3a3a', EAF, mw, phases=[
        phase('British Central Africa Protectorate', S1(bca) + SN(bca, 'proclaimed in 1889', 0, 'Proclaimed in 1889 and ratified in 1891 (lead).'),
              F(bca, 'year_end', 'end')),
        phase('Nyasaland', F(nya, 'seg0.start', 'start'), F(nya, 'seg0.end', 'end'), endEvent='malawi-independence'),
        phase('Malawi (Commonwealth realm)', est(mw, 1), est(mw, 2), startEvent='malawi-independence', endEvent='malawi-republic'),
        phase('Republic of Malawi', est(mw, 2), ongoing=cur(mw, 3), startEvent='malawi-republic'),
    ], memberOf=[
        member(be, S1(bca), F(nya, 'seg0.end', 'end'), sources=[lead(bca, 'was a British protectorate'), lead(nya, 'was a British protectorate')],
               endEvent='malawi-independence'),
        member('federation-of-rhodesia-and-nyasaland', est(nya, 2), est(nya, 3), sources=[lead(nya, 'Nyasaland was part of the Federation')],
               startEvent='central-african-federation-formed', endEvent='central-african-federation-dissolved'),
    ]))
    T.append(row('maravi', 'Maravi', '#5a4a6a', EAF, 'Maravi', span_=life('Maravi', circa=True)))

    # ---------- Zambia ----------
    bnwr, ner, nr, zm, cr, lozi = ('Barotziland–North-Western Rhodesia', 'North-Eastern Rhodesia', 'Northern Rhodesia', 'Zambia',
                                   'Company rule in Rhodesia', 'Lozi kingdom')
    T.append(row('company-rule-in-rhodesia', 'Company rule in Rhodesia', '#8a5a6a', EAF, cr, span_=life(cr, 'seg0.start', 'seg0.end'),
                 memberOf=[member(be, F(cr, 'seg0.start', 'start'), F(cr, 'seg0.end', 'end'),
                                  sources=[lead(cr, 'chartered in 1889 by Queen Victoria')])]))
    T.append(row('zambia', 'Zambia', '#2a8a2a', EAF, zm, phases=[
        # the two company-run protectorates north of the Zambezi ran side by side until 1911: parallel phases
        ph('Barotziland–North-Western Rhodesia', bnwr, endEvent='northern-rhodesia-formed'),
        ph('North-Eastern Rhodesia', ner, endEvent='northern-rhodesia-formed'),
        phase('Northern Rhodesia', F(nr, 'seg0.start', 'start'), F(nr, 'seg0.end', 'end'), startEvent='northern-rhodesia-formed', endEvent='zambian-independence'),
        phase('Republic of Zambia', est(zm, 1), ongoing=cur(zm, 1), startEvent='zambian-independence'),
    ], memberOf=[
        member('company-rule-in-rhodesia', S1(bnwr), S1(nr), sources=[lead(nr, 'administered, as were the two earlier protectorates, by the British South Africa Company')]),
        member(be, S1(nr), E1(nr), sources=[lead(nr, 'was a British protectorate')], endEvent='zambian-independence'),
        member('federation-of-rhodesia-and-nyasaland', F(nr, 'date_event1', 'start')[:1], F(nr, 'date_event1:last', 'end')[:1],
               sources=[G.ref(nr, 'infobox event1: Federated with S. Rhodesia and Nyasaland, 1953–1963')],
               startEvent='central-african-federation-formed', endEvent='central-african-federation-dissolved'),
    ]))
    T.append(row('lozi-kingdom', 'Lozi kingdom (Barotseland)', '#6a7a3a', EAF, lozi,
                 span_=life(lozi, sc=CN(lozi, 'date_start'), ec=F(lozi, 'date_end', 'end')[:1], circa=True, endEvent='barotseland-protectorate')))

    return T


def southern_africa(M, h):
    """Zimbabwe, Mozambique, the Indian Ocean islands, South Sudan, and UN Southern Africa."""
    G, F, phase, stretch, span, member, row = M.G, M.F, M.phase, M.stretch, M.span, M.member, M.row
    S1, E1, est, cur, EV, SN, CN, K, ph, life, hist, lead, copy_claims = (
        h['S1'], h['E1'], h['est'], h['cur'], h['EV'], h['SN'], h['CN'], h['K'], h['ph'], h['life'], h['hist'], h['lead'], h['copy_claims'])
    be, pe, fce, de = h['be'], h['pe'], h['fce'], h['de']
    T = []

    # ---------- Zimbabwe and the Zimbabwe plateau (Medieval seam: kingdom-of-zimbabwe, mutapa, kingdom-of-butua) ----------
    kgz, mut, but = 'Kingdom of Great Zimbabwe', 'Mutapa Empire', 'Kingdom of Butua'
    T.append(row('kingdom-of-zimbabwe', 'Kingdom of Zimbabwe (Great Zimbabwe)', '#7a6a4a', EAF, kgz,
                 span_=life(kgz, sc=CN(kgz, 'year_start'), ec=CN(kgz, 'year_end'), circa=True)))
    T.append(row('mutapa', 'Kingdom of Mutapa', '#a85a3a', EAF, mut,
                 # Portuguese vassal "1629–late-17th century" (infobox event1): no year for its end, so an event, not a membership
                 span_=life(mut, sc=CN(mut, 'year_start'), ec=copy_claims([(mut, 'infobox year_end: 1884', 'year_end', 'end')]), circa=True)))
    T.append(row('kingdom-of-butua', 'Kingdom of Butua', '#5a4a3a', EAF, but, span_=life(
        but, sc=copy_claims([(but, 'infobox year_start: c. 1425', 'year_start', 'start')]),
        ec=copy_claims([(but, 'infobox year_end: c. 1683', 'year_end', 'end')]), endEvent='rozvi-conquest-of-butua')))
    T.append(hist('rozvi-empire', 'Rozvi Empire', '#8a4a3a', EAF, 'Rozvi Empire', circa=True, startEvent='rozvi-conquest-of-butua'))
    T.append(row('mthwakazi', 'Mthwakazi (Ndebele kingdom)', '#6a3a3a', EAF, 'Mthwakazi', span_=life(
        'Mthwakazi', sc=F('Mthwakazi', 'seg0.start', 'start'),
        ec=F('Mthwakazi', 'seg0.end', 'end') + [dict(E1('Mthwakazi')[0], note='The infobox\'s year_end.')], endEvent='first-matabele-war')))
    sr, rh, zr, zw = 'Southern Rhodesia', 'Rhodesia', 'Zimbabwe Rhodesia', 'Zimbabwe'
    T.append(row('zimbabwe', 'Zimbabwe', '#b08a2a', EAF, zw, phases=[
        # Southern Rhodesia's life span: "1923–1965 1979–1980 (de facto) / 1923–1980 (de jure)"
        phase('Southern Rhodesia', K(sr, 'life_span', 0), K(sr, 'life_span', 1), startEvent='company-rule-ends', endEvent='rhodesia-udi'),
        ph('Rhodesia (unrecognised)', rh, startEvent='rhodesia-udi', endEvent='zimbabwe-rhodesia-formed'),
        ph('Zimbabwe Rhodesia (unrecognised)', zr, startEvent='zimbabwe-rhodesia-formed', endEvent='lancaster-house-agreement'),
        phase('Southern Rhodesia (British transition)', K(sr, 'life_span', 2), K(sr, 'life_span', 3), startEvent='lancaster-house-agreement',
              endEvent='zimbabwe-independence'),
        phase('Republic of Zimbabwe', est(zw, 4), ongoing=cur(zw, 5), startEvent='zimbabwe-independence'),
    ], memberOf=[
        member(be, K(sr, 'life_span', 0), K(sr, 'life_span', 1), sources=[lead(sr, 'self-governing colony of the British Empire')], endEvent='rhodesia-udi'),
        member('federation-of-rhodesia-and-nyasaland', F(sr, 'date_event2', 'start')[:1], F(sr, 'date_event2:last', 'end')[:1],
               sources=[G.ref(sr, 'infobox event2: Federation, 1953–1963')], startEvent='central-african-federation-formed',
               endEvent='central-african-federation-dissolved'),
        member(be, K(sr, 'life_span', 2), K(sr, 'life_span', 3), sources=[G.ref(sr, 'infobox event4: Control returned, 11–12 December 1979')],
               startEvent='lancaster-house-agreement', endEvent='zimbabwe-independence'),
    ]))

    # ---------- Mozambique ----------
    pm, prm, moz, ang = 'Portuguese Mozambique', "People's Republic of Mozambique", 'Mozambique', 'Angoche Sultanate'
    T.append(row('mozambique', 'Mozambique', '#c05a2a', EAF, moz, phases=[
        ph('Portuguese Mozambique', pm, endEvent='mozambican-independence'),
        ph("People's Republic of Mozambique", prm, startEvent='mozambican-independence', endEvent='mozambique-constitution-1990'),
        phase('Republic of Mozambique', E1(prm), ongoing=cur(moz, 6), startEvent='mozambique-constitution-1990'),
    ], memberOf=[
        member(pe, S1(pm), E1(pm), sources=[lead(pm, 'Portuguese overseas province')], endEvent='mozambican-independence'),
    ]))
    T.append(hist('gaza-empire', 'Gaza Empire', '#9a5a2a', EAF, 'Gaza Empire', endEvent='gaza-conquered'))
    T.append(hist('angoche-sultanate', 'Angoche Sultanate', '#7a4a5a', EAF, ang, circa=True, endEvent='angoche-conquered'))

    # ---------- Madagascar ----------
    im, fm, mr, drm, mad, boi = 'Imerina', 'French Madagascar', 'Malagasy Republic', 'Democratic Republic of Madagascar', 'Madagascar', 'Boina Kingdom'
    T.append(row('madagascar', 'Madagascar', '#2a7a5a', EAF, mad, phases=[
        phase('Merina Kingdom (Kingdom of Madagascar)', S1(im) + est(mad, 1), E1(im), circa=True, endEvent='french-capture-of-antananarivo'),
        ph('French Madagascar', fm, startEvent='french-capture-of-antananarivo', endEvent='malagasy-independence'),
        # an autonomous republic within the French Community from 1958, beside the colony's last years: a parallel phase
        ph('Malagasy Republic', mr, endEvent='democratic-republic-of-madagascar'),
        ph('Democratic Republic of Madagascar', drm, startEvent='democratic-republic-of-madagascar', endEvent='malagasy-constitution-1992'),
        phase('Third Republic', est(mad, 8), F(mad, 'established_date8:last', 'end')[:1], startEvent='malagasy-constitution-1992',
              endEvent='malagasy-constitution-2010'),
        phase('Fourth Republic', est(mad, 10), est(mad, 12), startEvent='malagasy-constitution-2010', endEvent='malagasy-coup-2025'),
        phase('Military government', est(mad, 12), ongoing=cur(mad, 12), startEvent='malagasy-coup-2025'),
    ], memberOf=[
        member(fce, est(mad, 2), E1(fm), sources=[lead(fm, 'formerly a protectorate of France')], startEvent='franco-hova-wars',
               endEvent='malagasy-independence'),
    ]))
    T.append(hist('boina-kingdom', 'Boina Kingdom', '#4a8a6a', EAF, boi, endEvent='boina-annexed'))

    # ---------- Comoros ----------
    com, soc, firc, anj = 'Comoros', 'State of the Comoros', 'History of the Comoros (1978–2001)', 'State of Anjouan'
    T.append(row('comoros', 'Comoros', '#3a9a5a', EAF, com, phases=[
        phase('Ngazidja, Ndzuwani and Mwali under French rule', est(com, 1), est(com, 2)),
        phase('Protectorate of the Comoros', est(com, 2), est(com, 3)),
        phase('Comoros under French Madagascar', est(com, 3), est(com, 4)),
        phase('Overseas territory of the Comoros', est(com, 4), est(com, 6), endEvent='comoros-independence'),
        phase('State of the Comoros', F(soc, 'seg0.start', 'start'), F(soc, 'seg0.end', 'end'), startEvent='comoros-independence'),
        phase('Federal Islamic Republic of the Comoros', F(firc, 'seg0.start', 'start'), F(firc, 'seg0.end', 'end'), endEvent='union-of-the-comoros'),
        phase('Union of the Comoros', est(com, 8), ongoing=cur(com, 9), startEvent='union-of-the-comoros'),
    ], memberOf=[
        member(fce, est(com, 1), est(com, 6), sources=[G.ref(com, 'infobox established_event1: Ngazidja, Ndzuwani, Mwali under French rule, 1886')],
               endEvent='comoros-independence'),
        member('madagascar', est(com, 3), est(com, 4), sources=[G.ref(com, 'infobox established_event3: Territory under French Madagascar, 9 April 1908')]),
    ]))
    T.append(row('state-of-anjouan', 'State of Anjouan (unrecognised)', '#5aaa6a', EAF, anj, span_=span(
        stretch(None, K(anj, 'year_start', 0), K(anj, 'year_start', 1), startEvent='anjouan-referendum-1997'),
        stretch(None, K(anj, 'year_start', 2), K(anj, 'year_start', 3), endEvent='invasion-of-anjouan'))))

    # ---------- Mauritius and Seychelles ----------
    dm, idf, bm, m68, mau = 'Dutch Mauritius', 'Isle de France (Mauritius)', 'British Mauritius', 'Mauritius (1968–1992)', 'Mauritius'
    T.append(row('mauritius', 'Mauritius', '#c02a4a', EAF, mau, phases=[
        ph('Dutch Mauritius', dm),
        ph('Isle de France', idf, endEvent='invasion-of-isle-de-france'),
        ph('British Mauritius', bm, startEvent='invasion-of-isle-de-france', endEvent='mauritian-independence'),
        ph('Mauritius (Commonwealth realm)', m68, startEvent='mauritian-independence', endEvent='mauritius-republic'),
        phase('Republic of Mauritius', est(mau, 2), ongoing=cur(mau, 2), startEvent='mauritius-republic'),
    ], memberOf=[
        member(de, S1(dm), E1(dm), sources=[lead(dm, 'official settlement of the Dutch East India Company')]),
        member(fce, S1(idf), E1(idf), sources=[lead(idf, 'formed part of the French colonial empire')], endEvent='invasion-of-isle-de-france'),
        member(be, S1(bm), E1(bm), sources=[lead(bm, 'British rule in Mauritius was established de facto')], startEvent='invasion-of-isle-de-france',
               endEvent='mauritian-independence'),
    ]))
    ccs, sey = 'Crown Colony of the Seychelles', 'Seychelles'
    T.append(row('seychelles', 'Seychelles', '#2a6ac0', EAF, sey, phases=[
        ph('Crown Colony of the Seychelles', ccs, startEvent='seychelles-separated', endEvent='seychelles-independence'),
        phase('Republic of Seychelles', est(sey, 1), ongoing=cur(sey, 1), startEvent='seychelles-independence'),
    ], memberOf=[
        member(be, S1(ccs), E1(ccs), sources=[lead(ccs, 'was a British crown colony')], endEvent='seychelles-independence'),
    ]))

    # ---------- South Sudan ----------
    ss1, ss2, ss = 'Southern Sudan Autonomous Region (1972–1983)', 'Southern Sudan Autonomous Region (2005–2011)', 'South Sudan'
    T.append(row('south-sudan', 'South Sudan', '#4a6a8a', EAF, ss, phases=[
        ph('Southern Sudan Autonomous Region', ss1, startEvent='first-sudanese-civil-war', endEvent='second-sudanese-civil-war'),
        ph('Southern Sudan (autonomous)', ss2, startEvent='second-sudanese-civil-war', endEvent='south-sudan-secession'),
        phase('Republic of South Sudan', est(ss, 3), ongoing=cur(ss, 3), startEvent='south-sudan-secession'),
    ], memberOf=[
        member('sudan', S1(ss1), E1(ss1), sources=[lead(ss1, 'autonomous region that existed in southern Sudan')],
               startEvent='first-sudanese-civil-war', endEvent='second-sudanese-civil-war'),
        member('sudan', S1(ss2), E1(ss2), sources=[lead(ss2, 'autonomous region consisting of the ten southern states of Sudan')],
               startEvent='second-sudanese-civil-war', endEvent='south-sudan-secession'),
    ]))
    T.append(hist('shilluk-kingdom', 'Shilluk Kingdom', '#5a7a9a', EAF, 'Shilluk Kingdom', endEvent='shilluk-conquered'))

    # =====================================================================================================
    # Southern Africa
    # =====================================================================================================
    dcc, cc, nat, tvc, orc, bb, usa, rsa = ('Dutch Cape Colony', 'Cape Colony', 'Colony of Natal', 'Transvaal Colony', 'Orange River Colony',
                                           'British Bechuanaland', 'Union of South Africa', 'South Africa')
    cape_first = 'It existed from 1795 to 1802'
    T.append(row('south-africa', 'South Africa', '#3a7a4a', SAF, rsa, phases=[
        phase('Dutch Cape Colony', F(dcc, 'seg0.start', 'start'), F(dcc, 'seg0.end', 'end'), endEvent='invasion-of-the-cape-1795'),
        phase('Cape Colony (first British occupation)', SN(cc, cape_first, 0), SN(cc, cape_first, 1), startEvent='invasion-of-the-cape-1795'),
        phase('Dutch Cape Colony (Batavian Republic)', F(dcc, 'seg1.start', 'start'), F(dcc, 'seg1.end', 'end'), endEvent='battle-of-blaauwberg'),
        # the British colonies ran side by side until the Union: parallel phases
        ph('Cape Colony', cc, startEvent='battle-of-blaauwberg', endEvent='union-of-south-africa'),
        ph('Colony of Natal', nat, startEvent='natalia-annexed', endEvent='union-of-south-africa'),
        phase('Transvaal Colony (first annexation)', K(tvc, 'life_span', 0), K(tvc, 'life_span', 1), endEvent='first-boer-war'),
        ph('British Bechuanaland', bb, endEvent='british-bechuanaland-annexed'),
        phase('Transvaal Colony', K(tvc, 'life_span', 2), K(tvc, 'life_span', 3), startEvent='treaty-of-vereeniging', endEvent='union-of-south-africa'),
        phase('Orange River Colony', F(orc, 'seg0.start', 'start'), F(orc, 'seg0.end', 'end'), startEvent='treaty-of-vereeniging', endEvent='union-of-south-africa'),
        ph('Union of South Africa', usa, startEvent='union-of-south-africa', endEvent='south-african-republic-1961'),
        phase('Republic of South Africa', est(rsa, 3), ongoing=cur(rsa, 5), startEvent='south-african-republic-1961'),
    ], memberOf=[
        member(de, F(dcc, 'seg0.start', 'start'), F(dcc, 'seg0.end', 'end'), sources=[lead(dcc, 'was a colony of the Dutch East India Company')],
               endEvent='invasion-of-the-cape-1795'),
        member(be, SN(cc, cape_first, 0), SN(cc, cape_first, 1), sources=[lead(cc, 'was a British colony')], startEvent='invasion-of-the-cape-1795'),
        member(de, F(dcc, 'seg1.start', 'start'), F(dcc, 'seg1.end', 'end'), sources=[lead(dcc, 'and Batavian Republic')], endEvent='battle-of-blaauwberg'),
        member(be, S1(cc), E1(usa), sources=[lead(cc, 'was a British colony'), lead(usa, 'was a British Dominion')],
               startEvent='battle-of-blaauwberg', endEvent='south-african-republic-1961'),
    ]))
    natr, ofs, sar = 'Natalia Republic', 'Orange Free State', 'South African Republic'
    T.append(hist('natalia-republic', 'Natalia Republic', '#6a8a4a', SAF, natr, endEvent='natalia-annexed'))
    T.append(hist('orange-free-state', 'Orange Free State', '#d08a2a', SAF, ofs, startEvent='bloemfontein-convention', endEvent='treaty-of-vereeniging'))
    T.append(row('south-african-republic', 'South African Republic (Transvaal)', '#4a7a3a', SAF, sar, span_=span(
        stretch(None, K(sar, 'life_span', 0), K(sar, 'life_span', 1), startEvent='sand-river-convention', endEvent='treaty-of-vereeniging'),
        # proclaimed again by the rebels of the Maritz rebellion (the infobox's life span: "1852–1902, 1914–1915")
        stretch(None, K(sar, 'life_span', 2), K(sar, 'life_span', 3), startEvent='maritz-rebellion'))))
    T.append(hist('griqualand-west', 'Griqualand West', '#8a7a3a', SAF, 'Griqualand West'))
    T.append(hist('griqualand-east', 'Griqualand East', '#9a8a4a', SAF, 'Griqualand East'))
    T.append(hist('stellaland', 'Stellaland', '#5a6a3a', SAF, 'Stellaland'))
    T.append(hist('state-of-goshen', 'State of Goshen', '#6a6a3a', SAF, 'State of Goshen'))
    T.append(hist('nieuwe-republiek', 'Nieuwe Republiek', '#7a6a3a', SAF, 'Nieuwe Republiek'))
    T.append(hist('klein-vrystaat', 'Klein Vrystaat', '#8a6a3a', SAF, 'Klein Vrystaat', endEvent='klein-vrystaat-annexed'))
    T.append(hist('mthethwa-kingdom', 'Mthethwa Kingdom', '#4a5a2a', SAF, 'Mthethwa Kingdom', circa=True))
    T.append(hist('ndwandwe', 'Ndwandwe', '#5a5a2a', SAF, 'Ndwandwe', circa=True))
    T.append(hist('zulu-kingdom', 'Zulu Kingdom', '#2a4a2a', SAF, 'Zulu Kingdom', endEvent='zululand-annexed-to-natal'))
    # the four bantustans declared independent by South Africa: recognised by no other state (each article's lead)
    for id_, name, t, col in (('transkei', 'Transkei (nominally independent)', 'Transkei', '#7a5a4a'),
                              ('bophuthatswana', 'Bophuthatswana (nominally independent)', 'Bophuthatswana', '#8a5a4a'),
                              ('venda', 'Venda (nominally independent)', 'Venda (Bantustan)', '#9a5a4a'),
                              ('ciskei', 'Ciskei (nominally independent)', 'Ciskei', '#6a5a4a')):
        T.append(hist(id_, name, col, SAF, t, endEvent='bantustans-reintegrated'))

    # ---------- Namibia, Botswana, Lesotho, Eswatini ----------
    gswa, swa, nam = 'German South West Africa', 'South West Africa', 'Namibia'
    T.append(row('namibia', 'Namibia', '#3a5aa0', SAF, nam, phases=[
        phase('German South West Africa', F(gswa, 'seg0.start', 'start'), F(gswa, 'seg0.end', 'end') + [dict(E1(gswa)[0], note='Ceded by Germany in the Treaty of Versailles (1919).')],
              endEvent='south-west-africa-campaign'),
        ph('South West Africa (South African rule)', swa, startEvent='south-west-africa-campaign', endEvent='namibian-independence'),
        phase('Republic of Namibia', est(nam, 2), ongoing=cur(nam, 2), startEvent='namibian-independence'),
    ], memberOf=[
        member('germany', F(gswa, 'seg0.start', 'start'), F(gswa, 'seg0.end', 'end'), sources=[lead(gswa, 'was a colony of the German Empire')],
               endEvent='south-west-africa-campaign'),
        member('south-africa', S1(swa), E1(swa), sources=[lead(swa, 'territory under South African administration')], startEvent='south-west-africa-campaign',
               endEvent='namibian-independence'),
    ]))
    bp, bot = 'Bechuanaland Protectorate', 'Botswana'
    T.append(row('botswana', 'Botswana', '#5a9ac0', SAF, bot, phases=[
        ph('Bechuanaland Protectorate', bp, startEvent='bechuanaland-protectorate-established', endEvent='botswana-independence'),
        phase('Republic of Botswana', est(bot, 1), ongoing=cur(bot, 1), startEvent='botswana-independence'),
    ], memberOf=[member(be, S1(bp), E1(bp), sources=[lead(bp, 'was a protectorate established on 31 March 1885')], endEvent='botswana-independence')]))
    bas, les = 'Basutoland', 'Lesotho'
    brit_bas = 'had been under British control starting in 1868'
    T.append(row('lesotho', 'Lesotho', '#2a4ac0', SAF, les,
                 # under British and Cape rule from 1868 until Basutoland was set up in 1884, with no phase of its own:
                 # the lifespan carries it across
                 span_=span(stretch(None, SN(les, 'Lesotho was formed in 1824'), ongoing=cur(les, 2))),
                 phases=[
        phase('Basotho Kingdom', SN(les, 'Lesotho was formed in 1824') + SN(les, 'emerged as a single polity under King Moshoeshoe I', 0,
                                                                               'The Basutoland section dates the polity to 1822.'),
              SN(bas, brit_bas)),
        ph('Basutoland', bas, endEvent='lesotho-independence'),
        phase('Kingdom of Lesotho', est(les, 2), ongoing=cur(les, 2), startEvent='lesotho-independence'),
    ], memberOf=[member(be, SN(bas, brit_bas), E1(bas), sources=[lead(bas, brit_bas), lead(bas, 'was a British Crown colony')],
                        endEvent='lesotho-independence')]))
    esw = 'Eswatini'
    T.append(row('eswatini', 'Eswatini', '#3a6ac0', SAF, esw, phases=[
        phase('Kingdom of Swaziland', CENTS(M, esw, 'mid-18th century'), est(esw, 4), circa=True, endEvent='eswatini-renamed'),
        phase('Kingdom of Eswatini', est(esw, 4), ongoing=cur(esw, 4), startEvent='eswatini-renamed'),
    ], memberOf=[
        member('south-african-republic', SN(esw, 'In 1894, a convention placed Swaziland'), K(sar, 'life_span', 1),
               sources=[lead(esw, 'In 1894, a convention placed Swaziland')], endEvent='treaty-of-vereeniging'),
        member(be, SN(esw, 'British high commission territory from 1903'), est(esw, 1), sources=[lead(esw, 'British high commission territory from 1903')],
               endEvent='eswatini-independence'),
    ]))
    return T


def events(M):
    G, E, W, F, ev = M.G, M.E, M.W, M.F, M.ev

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
        """An event dated by an infobox event (date_eventN, or 'start'/'end'); a range becomes start and end."""
        f = G.art(article)['fields']
        dk = f'date_event{n}' if n not in ('start', 'end') else f'date_{n}'
        ys = (f.get(dk) or {}).get('years') or []
        y, r = E(article, n)
        if len(ys) > 1 and ys[-1] != ys[0]:
            kw.setdefault('end', ys[-1])
        return ev(uuid, title, y, tracks, r, **kw)

    def sev(uuid, title, article, needle, tracks, k=0, end_k=None, **kw):
        """An event dated by a year written in a sentence of the article (the k-th year; end_k for a range)."""
        c = SENT(M, article, needle, k)[0]
        if end_k is not None:
            kw['end'] = SENT(M, article, needle, end_k)[0]['year']
        return ev(uuid, title, c['year'], tracks, c['source'], **kw)

    def ongoing(e):
        e.pop('end', None)
        e['ongoing'] = True
        return e

    be, fce, pe = 'british-empire', 'french-colonial-empire', 'portuguese-empire'
    return [
        # ================= the Horn of Africa =================
        wev('ethiopian-adal-war', 'Ethiopian–Adal War', 'Ethiopian–Adal war', ['ethiopia', 'adal-sultanate', 'portuguese-empire', 'ottoman-empire'], importance=1,
            descr='Imam Ahmad ibn Ibrahim al-Ghazi of Adal overruns most of the Ethiopian highlands; Portuguese help Ethiopia, Ottomans help Adal.'),
        wev('battle-of-shimbra-kure', 'Battle of Shimbra Kure', 'Battle of Shimbra Kure', ['ethiopia', 'adal-sultanate']),
        wev('battle-of-wayna-daga', 'Battle of Wayna Daga', 'Battle of Wayna Daga', ['ethiopia', 'adal-sultanate', 'portuguese-empire'],
            descr='Imam Ahmad is killed; the Adal invasion collapses.'),
        fev('adal-ends', 'End of the Adal Sultanate', 'Adal Sultanate', 'year_end', ['adal-sultanate', 'imamate-of-aussa'],
            descr='The sultanate\'s capital moves from Harar to Aussa (1577) and the Imamate of Aussa takes its place.'),
        fev('habesh-eyalet-created', 'Ottomans create the Habesh Eyalet', 'Habesh Eyalet', 'year_start', ['habesh-eyalet', 'ottoman-empire', 'medri-bahri'],
            descr='The Ottomans take Massawa and the coast; Medri Bahri loses the port.'),
        fev('zemene-mesafint', 'Zemene Mesafint begins', 'Ethiopia', 'established_date4', ['ethiopia'],
            descr='The "Era of the Princes": regional lords rule while the emperors are figureheads.'),
        fev('ethiopia-reunified', 'Tewodros II reunifies Ethiopia', 'Ethiopia', 'established_date5', ['ethiopia'], importance=1),
        wev('british-expedition-to-abyssinia', 'British Expedition to Abyssinia', 'British Expedition to Abyssinia', ['ethiopia', be]),
        wev('ethiopian-egyptian-war', 'Ethiopian–Egyptian War', 'Ethiopian–Egyptian War', ['ethiopia', 'egypt', 'medri-bahri']),
        fev('battle-of-chelenqo', 'Menelik takes Harar', 'Emirate of Harar', 'year_end', ['emirate-of-harar', 'ethiopia'],
            descr='Shewa defeats the emir at Chelenqo and annexes Harar.'),
        fev('italian-eritrea-founded', 'Colony of Eritrea founded', 'Medri Bahri', 'year_end', ['medri-bahri', 'eritrea', 'italy'],
            descr='Italy proclaims the Colony of Eritrea on 1 January 1890.'),
        wev('first-italo-ethiopian-war', 'First Italo-Ethiopian War', 'First Italo-Ethiopian War', ['ethiopia', 'italy', 'eritrea'], importance=1),
        wev('battle-of-adwa', 'Battle of Adwa', 'Battle of Adwa', ['ethiopia', 'italy'], importance=1,
            descr='Menelik II defeats the Italian army; Ethiopia stays independent.'),
        fev('kaffa-annexed', 'Ethiopia annexes Kaffa', 'Kingdom of Kaffa', 'year_end', ['kingdom-of-kaffa', 'ethiopia']),
        fev('yamma-annexed', 'Ethiopia annexes Yamma', 'Kingdom of Yamma', 'year_end', ['kingdom-of-yamma', 'ethiopia']),
        fev('wolaita-annexed', 'Ethiopia conquers Wolaita', 'Kingdom of Wolaita', 'year_end', ['kingdom-of-wolaita', 'ethiopia']),
        fev('garo-annexed', 'Jimma annexes Garo', 'Kingdom of Garo', 'year_end', ['kingdom-of-garo', 'kingdom-of-jimma']),
        fev('jimma-annexed', 'Ethiopia annexes Jimma', 'Kingdom of Jimma', 'year_end', ['kingdom-of-jimma', 'ethiopia']),
        fev('gumma-annexed', 'Ethiopia annexes Gumma', 'Kingdom of Gumma', 'year_end', ['kingdom-of-gumma', 'ethiopia']),
        fev('gomma-annexed', 'Ethiopia annexes Gomma', 'Kingdom of Gomma', 'year_end', ['kingdom-of-gomma', 'ethiopia']),
        fev('limmu-annexed', 'Ethiopia annexes Limmu-Ennarea', 'Kingdom of Limmu-Ennarea', 'year_end', ['kingdom-of-limmu-ennarea', 'ethiopia']),
        fev('gera-annexed', 'Ethiopia annexes Gera', 'Kingdom of Gera', 'year_end', ['kingdom-of-gera', 'ethiopia']),
        wev('second-italo-ethiopian-war', 'Second Italo-Ethiopian War', 'Second Italo-Ethiopian War',
            ['ethiopia', 'italy', 'italian-east-africa', 'eritrea', 'somalia', 'sultanate-of-aussa'], importance=1,
            descr='Italy invades from Eritrea and Somalia and annexes Ethiopia; Haile Selassie goes into exile.'),
        wev('east-african-campaign-ww2', 'East African campaign (Second World War)', 'East African campaign (World War II)',
            ['italian-east-africa', 'ethiopia', 'eritrea', 'somalia', 'somaliland', be, 'italy'], importance=1,
            descr='British, Commonwealth and Ethiopian forces conquer Italian East Africa; Haile Selassie returns.'),
        fev('ethiopia-eritrea-federation', 'Eritrea federated with Ethiopia', 'Eritrea (1952–1962)', 'year_start', ['eritrea', 'ethiopia', be],
            descr='Under a UN resolution Eritrea becomes an autonomous unit federated with Ethiopia.'),
        wev('eritrean-war-of-independence', 'Eritrean War of Independence', 'Eritrean War of Independence', ['eritrea', 'ethiopia'], importance=1),
        fev('eritrea-annexed', 'Ethiopia annexes Eritrea', 'Eritrea (1952–1962)', 'year_end', ['eritrea', 'ethiopia'],
            descr='The Eritrean parliament is dissolved and the federation ended.'),
        fev('derg-coup', 'The Derg deposes Haile Selassie', 'Derg', 'year_start', ['ethiopia'], importance=1),
        wev('ethiopian-civil-war', 'Ethiopian Civil War', 'Ethiopian Civil War', ['ethiopia']),
        wev('ogaden-war', 'Ogaden War', 'Ogaden War', ['ethiopia', 'somalia'], importance=1,
            descr='Somalia invades the Ogaden and is driven back with Soviet and Cuban help to Ethiopia.'),
        fev('pdre-constitution', "People's Democratic Republic proclaimed", "People's Democratic Republic of Ethiopia", 'year_start', ['ethiopia']),
        fev('fall-of-addis-ababa-1991', 'EPRDF takes Addis Ababa', "People's Democratic Republic of Ethiopia", 'year_end', ['ethiopia'], importance=1),
        fev('ethiopian-constitution-1995', 'Federal constitution', 'Ethiopia', 'established_date12', ['ethiopia']),
        wev('eritrean-ethiopian-war', 'Eritrean–Ethiopian War', 'Eritrean–Ethiopian War', ['eritrea', 'ethiopia'], importance=1),
        wev('tigray-war', 'Tigray War', 'Tigray war', ['ethiopia', 'eritrea'], importance=1),
        fev('french-somaliland-established', 'French Somaliland established', 'French Somaliland', 'year_start', ['djibouti', fce]),
        fev('afars-and-issas-renamed', 'French Territory of the Afars and the Issas', 'French Territory of the Afars and the Issas', 'year_start', ['djibouti'],
            descr='French Somaliland is renamed after a referendum keeps it French.'),
        wev('djiboutian-civil-war', 'Djiboutian Civil War', 'Djiboutian Civil War', ['djibouti']),
        fev('djibouti-constitution-1992', 'Constitution of 1992', 'Djibouti', 'established_date2', ['djibouti']),
        fev('djibouti-independence', 'Djibouti independent', 'Djibouti', 'established_date1', ['djibouti', fce], importance=1),
        fev('geledi-founded', 'Geledi overthrow the Ajuran', 'Sultanate of the Geledi', 'year_start', ['sultanate-of-the-geledi', 'ajuran-sultanate'],
            descr='The Geledi Sultanate is established after the overthrow of the Silcis and the Ajuran.'),
        fev('british-somaliland-protectorate', 'British protectorate over Somaliland', 'Somaliland', 'established_date2', ['somaliland', 'isaaq-sultanate', be]),
        wev('campaign-of-the-sultanates', 'Campaign of the Sultanates', 'Campaign of the Sultanates', ['majeerteen-sultanate', 'sultanate-of-hobyo', 'somalia', 'italy'],
            descr='Fascist Italy conquers the northern Somali sultanates.'),
        wev('somaliland-campaign-1920', 'Somaliland campaign of 1920', 'Somaliland campaign (1920)', ['dervish-state', 'somaliland', be, 'warsangali-sultanate'],
            descr='British air and ground forces destroy the Dervish State.'),
        fev('somaliland-independence-1960', 'Somaliland independent', 'State of Somaliland', 'year_start', ['somaliland', be]),
        fev('somali-unification', 'Somali Republic formed', 'Somali Republic', 'year_start', ['somalia', 'somaliland'], importance=1,
            descr='The State of Somaliland and the Trust Territory unite on 1 July 1960.'),
        fev('somali-coup-1969', 'Siad Barre seizes power', 'Somali Democratic Republic', 'year_start', ['somalia']),
        wev('somaliland-war-of-independence', 'Somaliland War of Independence', 'Somaliland War of Independence', ['somaliland', 'somalia']),
        fev('somali-civil-war', 'Somali Civil War begins', 'Somali Democratic Republic', 'year_end', ['somalia'], importance=1,
            descr='Barre\'s government falls in January 1991; the state collapses.'),
        fev('somaliland-declares-independence', 'Somaliland declares independence', 'Somaliland', 'established_date6', ['somaliland', 'somalia'], importance=1),
        wev('battle-of-mogadishu-1993', 'Battle of Mogadishu', 'Battle of Mogadishu (1993)', ['somalia']),
        wev('ethiopian-invasion-of-somalia-2006', 'Ethiopian intervention in Somalia', '2006 Ethiopian invasion of Somalia', ['somalia', 'ethiopia'],
            descr='Ethiopia overthrows the Islamic Courts Union and installs the Transitional Federal Government in Mogadishu.'),
        fev('somali-constitution-2012', 'Provisional constitution; Federal Government', 'Somalia', 'established_date13', ['somalia']),
    ] + east_africa_events(M, wev, fev, iev, sev, ongoing) + southern_africa_events(M, wev, fev, iev, sev, ongoing)


def east_africa_events(M, wev, fev, iev, sev, ongoing):
    be, pe = 'british-empire', 'portuguese-empire'
    return [
        # ---------- the Swahili coast ----------
        sev('portuguese-sack-of-kilwa', 'Portuguese take Kilwa', 'Kilwa Sultanate', 'Francisco de Almeida brought his fleet into the harbor of Kilwa',
            ['kilwa-sultanate', pe], descr='Francisco de Almeida lands 500 soldiers and drives Emir Ibrahim out of the city.'),
        wev('battle-of-mombasa-1505', 'Portuguese sack Mombasa', 'Battle of Mombasa (1505)', [pe, 'kilwa-sultanate']),
        iev('heligoland-zanzibar-treaty', 'Heligoland–Zanzibar Treaty', 'Sultanate of Zanzibar', 2, ['zanzibar', be, 'germany', 'german-east-africa', 'wituland'],
            descr='Germany recognises a British protectorate over Zanzibar and gives up Witu; Britain cedes Heligoland.'),
        wev('anglo-zanzibar-war', 'Anglo-Zanzibar War', 'Anglo-Zanzibar War', ['zanzibar', be], descr='The shortest recorded war: under an hour on 27 August 1896.'),
        wev('zanzibar-revolution', 'Zanzibar Revolution', 'Zanzibar Revolution', ['zanzibar'], importance=1,
            descr='The sultan is overthrown a month after independence; the People\'s Republic is proclaimed.'),
        fev('tanzania-union', 'Tanganyika and Zanzibar unite', 'Tanzania', 'established_date3', ['tanzania', 'zanzibar'], importance=1,
            descr='The United Republic of Tanganyika and Zanzibar, renamed Tanzania in October 1964.'),
        # ---------- German East Africa and Tanganyika ----------
        wev('abushiri-revolt', 'Abushiri revolt', 'Abushiri revolt', ['german-east-africa', 'zanzibar'],
            descr='The coast rises against the German East Africa Company; the German state takes over the colony.'),
        wev('maji-maji-rebellion', 'Maji Maji Rebellion', 'Maji Maji Rebellion', ['german-east-africa'], importance=1),
        wev('east-african-campaign-ww1', 'East African campaign (First World War)', 'East African campaign (World War I)',
            ['german-east-africa', 'germany', be, 'belgium', 'ruanda-urundi', 'tanzania', 'east-africa-protectorate', 'portuguese-empire'], importance=1,
            descr='British, Belgian and Portuguese forces fight Lettow-Vorbeck\'s Schutztruppe; German East Africa is occupied and divided.'),
        fev('tanganyika-independence', 'Tanganyika independent', 'Tanganyika (1961–1964)', 'year_start', ['tanzania', be], importance=1),
        fev('tanzanian-constitution-1977', 'Constitution of 1977', 'Tanzania', 'established_date4', ['tanzania']),
        wev('uganda-tanzania-war', 'Uganda–Tanzania War', 'Uganda–Tanzania War', ['tanzania', 'uganda'], importance=1,
            descr='Amin invades the Kagera Salient; Tanzania counter-invades and overthrows him.'),
        # ---------- Kenya ----------
        fev('kenya-colony-established', 'Colony of Kenya established', 'Kenya Colony', 'year_start', ['east-africa-protectorate', 'kenya', be]),
        sev('mau-mau-rebellion', 'Mau Mau rebellion', 'Mau Mau rebellion', 'The Mau Mau rebellion (1952–1960)', ['kenya', be], k=0, end_k=1, importance=1),
        fev('kenyan-independence', 'Kenya independent', 'Kenya', 'established_date1', ['kenya', be], importance=1),
        fev('kenya-republic', 'Kenya becomes a republic', 'Kenya', 'established_date2', ['kenya']),
        wev('shifta-war', 'Shifta War', 'Shifta War', ['kenya', 'somalia']),
        wev('kenyan-crisis-2007', 'Post-election crisis', '2007–2008 Kenyan crisis', ['kenya']),
        # ---------- Uganda ----------
        fev('uganda-protectorate', 'Protectorate of Uganda established', 'Protectorate of Uganda', 'year_start', ['uganda', 'buganda', 'bunyoro', be]),
        fev('ugandan-independence', 'Uganda independent', 'Uganda', 'established_date1', ['uganda', be], importance=1),
        fev('uganda-republic', 'Uganda becomes a republic', 'Uganda', 'established_date2', ['uganda']),
        fev('rwenzururu-secession', 'Rwenzururu declares independence', 'Rwenzururu', 'established_date1', ['rwenzururu', 'tooro-kingdom']),
        fev('uganda-kingdoms-abolished', 'Obote abolishes the kingdoms', 'Buganda', 'established_date4', ['uganda', 'buganda', 'bunyoro', 'tooro-kingdom', 'ankole'],
            importance=1, descr='Uganda is declared a republic without monarchs.'),
        wev('ugandan-coup-1971', 'Idi Amin seizes power', "1971 Ugandan coup d'état", ['uganda'], importance=1),
        wev('ugandan-bush-war', 'Ugandan Bush War', 'Ugandan Bush War', ['uganda'], descr='Museveni\'s National Resistance Army takes power in 1986.'),
        ongoing(wev('lra-insurgency', "Lord's Resistance Army insurgency", "Lord's Resistance Army insurgency", ['uganda', 'south-sudan'])),
        fev('uganda-kingdoms-restored', 'Traditional kingdoms restored', 'Buganda', 'established_date5', ['buganda', 'bunyoro', 'tooro-kingdom', 'uganda']),
        # ---------- Rwanda and Burundi ----------
        sev('rwandan-revolution', 'Rwandan Revolution', 'Rwandan Revolution', 'was a period of ethnic violence in Rwanda from 1959 to 1961', ['rwanda', 'ruanda-urundi'],
            k=0, end_k=1, importance=1, descr='Hutu revolt against the Tutsi monarchy; tens of thousands of Tutsi flee.'),
        fev('rwandan-republic', 'Rwanda declared a republic', 'Rwanda', 'established_date5', ['rwanda'], descr='The monarchy is abolished after a referendum.'),
        fev('rwanda-burundi-independence', 'Rwanda and Burundi independent', 'Ruanda-Urundi', 'year_end', ['ruanda-urundi', 'rwanda', 'burundi', 'belgium'], importance=1),
        fev('burundi-republic', 'Burundi becomes a republic', 'Burundi', 'established_date5', ['burundi'], descr='Michel Micombero deposes the king.'),
        wev('rwandan-civil-war', 'Rwandan Civil War', 'Rwandan Civil War', ['rwanda', 'uganda']),
        wev('rwandan-genocide', 'Rwandan genocide', 'Rwandan genocide', ['rwanda'], importance=1,
            descr='Hutu extremists kill some 500,000–800,000 Tutsi and moderate Hutu in about 100 days.'),
        wev('burundian-civil-war', 'Burundian Civil War', 'Burundian Civil War', ['burundi'], importance=1),
        fev('burundi-constitution-2018', 'Constitution of 2018', 'Burundi', 'established_date7', ['burundi']),
        fev('rwanda-constitution-2003', 'Constitution of 2003', 'Rwanda', 'established_date8', ['rwanda']),
        # ---------- Malawi, Zambia and the federation ----------
        iev('maravi-conquers-lundu', 'Kalonga Muzura conquers Lundu', 'Maravi', 4, ['maravi']),
        fev('maravi-ends', 'Fall of the Kalonga', 'Maravi', 'year_end', ['maravi'], descr='The Yao chief Mnanula kills Kalonga Sosola in battle.'),
        iev('kololo-conquest', 'Makololo conquer the Lozi', 'Lozi kingdom', 1, ['lozi-kingdom']),
        iev('lozi-restoration', 'Lozi kingdom restored', 'Lozi kingdom', 2, ['lozi-kingdom']),
        fev('barotseland-protectorate', 'Barotziland–North-Western Rhodesia established', 'Barotziland–North-Western Rhodesia', 'year_start',
            ['lozi-kingdom', 'zambia', 'company-rule-in-rhodesia']),
        fev('pioneer-column', 'Pioneer Column; Company rule begins', 'Company rule in Rhodesia', 'year_start', ['company-rule-in-rhodesia', 'mthwakazi'], importance=1),
        fev('northern-rhodesia-formed', 'Northern Rhodesia formed', 'Northern Rhodesia', 'seg0.start', ['zambia', 'company-rule-in-rhodesia']),
        fev('company-rule-ends', 'Company rule ends', 'Company rule in Rhodesia', 'year_end', ['company-rule-in-rhodesia', 'zambia', be],
            descr='The British government takes over Northern Rhodesia; Southern Rhodesia had become a self-governing colony in 1923.'),
        fev('central-african-federation-formed', 'Federation of Rhodesia and Nyasaland formed', 'Federation of Rhodesia and Nyasaland', 'year_start',
            ['federation-of-rhodesia-and-nyasaland', 'malawi', 'zambia', 'zimbabwe'], importance=1),
        fev('central-african-federation-dissolved', 'Federation dissolved', 'Federation of Rhodesia and Nyasaland', 'year_end',
            ['federation-of-rhodesia-and-nyasaland', 'malawi', 'zambia', 'zimbabwe']),
        fev('malawi-independence', 'Malawi independent', 'Malawi', 'established_date1', ['malawi', be], importance=1),
        fev('malawi-republic', 'Malawi becomes a republic', 'Malawi', 'established_date2', ['malawi'], descr='Hastings Banda becomes president.'),
        fev('malawi-constitution-1994', 'Multiparty constitution', 'Malawi', 'established_date3', ['malawi']),
        fev('zambian-independence', 'Zambia independent', 'Zambia', 'established_date1', ['zambia', be], importance=1),
    ]


def southern_africa_events(M, wev, fev, iev, sev, ongoing):
    be, pe, fce, de = 'british-empire', 'portuguese-empire', 'french-colonial-empire', 'dutch-empire'
    return [
        # ---------- the Zimbabwe plateau ----------
        iev('mutapa-portuguese-vassal', 'Mutapa becomes a Portuguese vassal', 'Mutapa Empire', 1, ['mutapa', pe], end=None),
        fev('rozvi-conquest-of-butua', 'Rozvi conquest of Butua', 'Kingdom of Butua', 'year_end', ['kingdom-of-butua', 'rozvi-empire'],
            descr='Changamire Dombo\'s Rozvi take Butua.'),
        iev('mutapa-civil-war', 'Mutapa fragments in civil war', 'Mutapa Empire', 2, ['mutapa']),
        iev('nguni-invasions', 'Nguni invasions of the Rozvi', 'Rozvi Empire', 1, ['rozvi-empire'], descr='Groups fleeing the Mfecane overrun the plateau.'),
        fev('rozvi-ends', 'End of the Rozvi Empire', 'Rozvi Empire', 'year_end', ['rozvi-empire'], descr='Surrender of Tohwechipi.'),
        fev('mutapa-conquered', 'Portugal conquers Mutapa', 'Mutapa Empire', 'year_end', ['mutapa', pe]),
        wev('first-matabele-war', 'First Matabele War', 'First Matabele War', ['mthwakazi', 'company-rule-in-rhodesia'], importance=1,
            descr='The British South Africa Company conquers the Ndebele kingdom.'),
        wev('second-matabele-war', 'Second Matabele War', 'Second Matabele War', ['company-rule-in-rhodesia'],
            descr='Ndebele and Shona risings against Company rule (the First Chimurenga).'),
        sev('rhodesia-udi', 'Rhodesia declares independence (UDI)', 'Rhodesia', 'Unilateral Declaration of Independence from the United Kingdom on 11 November 1965',
            ['zimbabwe', be], importance=1, descr='Ian Smith\'s white-minority government declares independence; no state recognises it.'),
        wev('rhodesian-bush-war', 'Rhodesian Bush War', 'Rhodesian Bush War', ['zimbabwe', 'mozambique', 'zambia'], importance=1,
            descr='ZANU and ZAPU guerrillas fight the Rhodesian government.'),
        fev('zimbabwe-rhodesia-formed', 'Zimbabwe Rhodesia formed', 'Zimbabwe Rhodesia', 'year_start', ['zimbabwe'],
            descr='The Internal Settlement installs Abel Muzorewa as prime minister; still unrecognised.'),
        wev('lancaster-house-agreement', 'Lancaster House Agreement', 'Lancaster House Agreement', ['zimbabwe', be]),
        fev('zimbabwe-independence', 'Zimbabwe independent', 'Zimbabwe', 'established_date4', ['zimbabwe', be], importance=1),
        wev('gukurahundi', 'Gukurahundi', 'Gukurahundi', ['zimbabwe'], descr='The Fifth Brigade\'s massacres of Ndebele civilians in Matabeleland.'),
        fev('zimbabwe-constitution-2013', 'Constitution of 2013', 'Zimbabwe', 'established_date5', ['zimbabwe']),
        wev('zimbabwean-coup-2017', 'Mugabe ousted', "2017 Zimbabwean coup d'état", ['zimbabwe'], importance=1),
        # ---------- Mozambique ----------
        fev('gaza-founded', 'Soshangane founds the Gaza Empire', 'Gaza Empire', 'year_start', ['gaza-empire']),
        fev('gaza-conquered', 'Portugal conquers Gaza', 'Gaza Empire', 'year_end', ['gaza-empire', 'mozambique', pe]),
        fev('angoche-conquered', 'Portugal conquers Angoche', 'Angoche Sultanate', 'year_end', ['angoche-sultanate', 'mozambique', pe]),
        wev('mozambican-war-of-independence', 'Mozambican War of Independence', 'Mozambican War of Independence', ['mozambique', pe], importance=1),
        fev('mozambican-independence', 'Mozambique independent', "People's Republic of Mozambique", 'year_start', ['mozambique', pe], importance=1),
        wev('mozambican-civil-war', 'Mozambican Civil War', 'Mozambican Civil War', ['mozambique'], importance=1, descr='FRELIMO against RENAMO.'),
        fev('mozambique-constitution-1990', 'Multiparty constitution', "People's Republic of Mozambique", 'year_end', ['mozambique']),
        wev('rome-general-peace-accords', 'Rome General Peace Accords', 'Rome General Peace Accords', ['mozambique']),
        ongoing(wev('cabo-delgado-insurgency', 'Insurgency in Cabo Delgado', 'Insurgency in Cabo Delgado', ['mozambique'])),
        # ---------- Madagascar and the islands ----------
        fev('boina-annexed', 'Imerina annexes Boina', 'Boina Kingdom', 'year_end', ['boina-kingdom', 'madagascar']),
        wev('franco-hova-wars', 'Franco-Hova Wars', 'Franco-Hova War', ['madagascar', 'france', fce], importance=1,
            descr='France fights the Merina kingdom and makes Madagascar a protectorate.'),
        fev('french-capture-of-antananarivo', 'Merina monarchy ends', 'Imerina', 'year_end', ['madagascar', fce],
            descr='The French capture the royal palace and exile Queen Ranavalona III.'),
        wev('malagasy-uprising', 'Malagasy Uprising', 'Malagasy Uprising', ['madagascar', fce, 'france']),
        fev('malagasy-independence', 'Madagascar independent', 'Madagascar', 'established_date5', ['madagascar', fce], importance=1),
        fev('democratic-republic-of-madagascar', 'Democratic Republic of Madagascar', 'Democratic Republic of Madagascar', 'year_start', ['madagascar'],
            descr='Didier Ratsiraka\'s socialist republic.'),
        fev('malagasy-constitution-1992', 'Third Republic', 'Madagascar', 'established_date8', ['madagascar']),
        wev('malagasy-crisis-2009', 'Malagasy political crisis', '2009 Malagasy political crisis', ['madagascar']),
        fev('malagasy-constitution-2010', 'Fourth Republic', 'Madagascar', 'established_date10', ['madagascar']),
        fev('malagasy-coup-2025', "Military coup", 'Madagascar', 'established_date12', ['madagascar'], importance=1,
            descr='After mass protests the army takes power; Colonel Michael Randrianirina is sworn in as president.'),
        fev('comoros-independence', 'Comoros independent', 'Comoros', 'established_date6', ['comoros', fce], importance=1,
            descr='Mayotte votes to stay French.'),
        fev('anjouan-referendum-1997', 'Anjouan secedes', 'State of Anjouan', 'year_start', ['state-of-anjouan', 'comoros']),
        fev('union-of-the-comoros', 'Union of the Comoros', 'Comoros', 'established_date8', ['comoros'], descr='A new federal constitution after the Anjouan crisis.'),
        wev('invasion-of-anjouan', 'Invasion of Anjouan', '2008 invasion of Anjouan', ['state-of-anjouan', 'comoros']),
        fev('dutch-settle-mauritius', 'Dutch settle Mauritius', 'Dutch Mauritius', 'year_start', ['mauritius', de]),
        fev('dutch-abandon-mauritius', 'Dutch abandon Mauritius', 'Dutch Mauritius', 'year_end', ['mauritius', de]),
        wev('battle-of-grand-port', 'Battle of Grand Port', 'Battle of Grand Port', ['mauritius', be, fce], descr='A French naval victory, months before the British invasion.'),
        fev('seychelles-separated', 'Seychelles separated from Mauritius', 'Crown Colony of the Seychelles', 'year_start', ['seychelles', 'mauritius', be]),
        wev('invasion-of-isle-de-france', 'British invasion of Isle de France', 'Invasion of Isle de France', ['mauritius', be, fce]),
        fev('mauritian-independence', 'Mauritius independent', 'Mauritius', 'established_date1', ['mauritius', be], importance=1),
        fev('mauritius-republic', 'Mauritius becomes a republic', 'Mauritius', 'established_date2', ['mauritius']),
        fev('seychelles-independence', 'Seychelles independent', 'Seychelles', 'established_date1', ['seychelles', be], importance=1),
        wev('seychelles-coup-1977', 'Seychelles coup', "1977 Seychelles coup d'état", ['seychelles']),
        # ---------- South Sudan ----------
        iev('shilluk-conquered', 'Turco-Egyptians conquer the Shilluk', 'Shilluk Kingdom', 1, ['shilluk-kingdom', 'sudan', 'egypt']),
        wev('south-sudanese-civil-war', 'South Sudanese Civil War', 'South Sudanese Civil War', ['south-sudan'], importance=1),
        # ---------- South Africa ----------
        wev('invasion-of-the-cape-1795', 'British invasion of the Cape', 'Invasion of the Cape Colony', ['south-africa', be, de]),
        wev('battle-of-blaauwberg', 'Battle of Blaauwberg', 'Battle of Blaauwberg', ['south-africa', be, de], descr='Britain takes the Cape a second time.'),
        wev('cape-frontier-wars', 'Xhosa Wars', 'Xhosa Wars', ['south-africa']),
        wev('battle-of-gqokli-hill', 'Battle of Gqokli Hill', 'Battle of Gqokli Hill', ['zulu-kingdom', 'ndwandwe']),
        sev('great-trek', 'Great Trek begins', 'Great Trek', 'northward migration of Dutch-speaking settlers', ['south-africa', 'natalia-republic'], importance=1),
        wev('battle-of-blood-river', 'Battle of Blood River', 'Battle of Blood River', ['zulu-kingdom', 'natalia-republic'], importance=1),
        fev('natalia-annexed', 'Britain annexes Natalia', 'Natalia Republic', 'year_end', ['natalia-republic', 'south-africa', be]),
        wev('sand-river-convention', 'Sand River Convention', 'Sand River Convention', ['south-african-republic', be],
            descr='Britain recognises the independence of the Boers north of the Vaal.'),
        wev('bloemfontein-convention', 'Bloemfontein Convention', 'Bloemfontein Convention', ['orange-free-state', be]),
        wev('free-state-basotho-wars', 'Free State–Basotho Wars', 'Free State–Basotho Wars', ['orange-free-state', 'lesotho']),
        wev('transvaal-civil-war', 'Transvaal Civil War', 'Transvaal Civil War', ['south-african-republic']),
        iev('griqualand-west-british', 'British rule over Griqualand West', 'Griqualand West', 1, ['griqualand-west', be],
            descr='Britain takes the diamond fields.'),
        fev('griqualand-west-ends', 'Griqualand West joins the Cape', 'Griqualand West', 'year_end', ['griqualand-west', 'south-africa']),
        fev('griqualand-east-annexed', 'Griqualand East annexed', 'Griqualand East', 'year_end', ['griqualand-east', 'south-africa']),
        wev('anglo-zulu-war', 'Anglo-Zulu War', 'Anglo-Zulu War', ['zulu-kingdom', be, 'south-africa'], importance=1),
        wev('battle-of-isandlwana', 'Battle of Isandlwana', 'Battle of Isandlwana', ['zulu-kingdom', be]),
        wev('first-boer-war', 'First Boer War', 'First Boer War', ['south-african-republic', 'south-africa', be], importance=1,
            descr='The Transvaal Boers defeat Britain at Majuba and regain self-government.'),
        wev('basuto-gun-war', 'Basuto Gun War', 'Basuto Gun War', ['lesotho', 'south-africa']),
        iev('stellaland-goshen-unite', 'United States of Stellaland', 'Stellaland', 2, ['stellaland', 'state-of-goshen']),
        fev('stellaland-abolished', 'Stellaland abolished', 'Stellaland', 'year_end', ['stellaland', 'south-africa', be]),
        fev('nieuwe-republiek-joins-sar', 'Nieuwe Republiek joins the Transvaal', 'Nieuwe Republiek', 'year_end', ['nieuwe-republiek', 'south-african-republic']),
        fev('klein-vrystaat-annexed', 'Transvaal annexes Klein Vrystaat', 'Klein Vrystaat', 'year_end', ['klein-vrystaat', 'south-african-republic']),
        fev('british-bechuanaland-annexed', 'British Bechuanaland joins the Cape', 'British Bechuanaland', 'year_end', ['south-africa']),
        wev('jameson-raid', 'Jameson Raid', 'Jameson Raid', ['south-african-republic', 'company-rule-in-rhodesia']),
        fev('zululand-annexed-to-natal', 'Zululand annexed to Natal', 'Zulu Kingdom', 'year_end', ['zulu-kingdom', 'south-africa']),
        wev('second-boer-war', 'Second Boer War', 'Second Boer War', ['south-african-republic', 'orange-free-state', 'south-africa', be], importance=1),
        wev('treaty-of-vereeniging', 'Treaty of Vereeniging', 'Treaty of Vereeniging', ['south-african-republic', 'orange-free-state', 'south-africa', be],
            importance=1, descr='The Boer republics surrender and become British colonies.'),
        wev('bambatha-rebellion', 'Bambatha Rebellion', 'Bambatha Rebellion', ['south-africa']),
        fev('union-of-south-africa', 'Union of South Africa formed', 'Union of South Africa', 'year_start', ['south-africa', be], importance=1,
            descr='The Cape, Natal, Transvaal and Orange River colonies unite on 31 May 1910.'),
        wev('maritz-rebellion', 'Maritz rebellion', 'Maritz rebellion', ['south-african-republic', 'south-africa'],
            descr='Boer rebels against South Africa\'s entry into the war proclaim the South African Republic again.'),
        wev('south-west-africa-campaign', 'South West Africa campaign', 'South West Africa campaign', ['namibia', 'south-africa', 'germany']),
        sev('apartheid', 'Apartheid', 'Apartheid', 'was a system of institutionalised racial segregation', ['south-africa'], k=0, end_k=1, importance=1),
        wev('sharpeville-massacre', 'Sharpeville massacre', 'Sharpeville massacre', ['south-africa']),
        fev('south-african-republic-1961', 'South Africa becomes a republic', 'South Africa', 'established_date3', ['south-africa', be], importance=1,
            descr='South Africa leaves the Commonwealth.'),
        wev('soweto-uprising', 'Soweto uprising', 'Soweto uprising', ['south-africa']),
        fev('transkei-independence', 'Transkei declared independent', 'Transkei', 'year_start', ['transkei', 'south-africa']),
        fev('bophuthatswana-independence', 'Bophuthatswana declared independent', 'Bophuthatswana', 'year_start', ['bophuthatswana', 'south-africa']),
        fev('venda-independence', 'Venda declared independent', 'Venda (Bantustan)', 'year_start', ['venda', 'south-africa']),
        fev('ciskei-independence', 'Ciskei declared independent', 'Ciskei', 'year_start', ['ciskei', 'south-africa']),
        sev('south-africa-first-universal-elections', 'First universal elections', 'South Africa', 'South Africa held its first universal elections in 1994',
            ['south-africa'], importance=1, descr='The ANC wins; Nelson Mandela becomes president.'),
        fev('bantustans-reintegrated', 'Bantustans reintegrated', 'Transkei', 'year_end', ['transkei', 'bophuthatswana', 'venda', 'ciskei', 'south-africa']),
        fev('south-africa-constitution-1997', 'Constitution of 1997', 'South Africa', 'established_date5', ['south-africa']),
        # ---------- Namibia, Botswana, Lesotho, Eswatini ----------
        wev('herero-and-nama-genocide', 'Herero and Nama genocide', 'Herero and Nama genocide', ['namibia', 'germany'], importance=1),
        wev('namibian-war-of-independence', 'Namibian War of Independence', 'Namibian War of Independence', ['namibia', 'south-africa'], importance=1),
        fev('namibian-independence', 'Namibia independent', 'Namibia', 'established_date2', ['namibia', 'south-africa'], importance=1),
        fev('bechuanaland-protectorate-established', 'Bechuanaland Protectorate established', 'Bechuanaland Protectorate', 'year_start', ['botswana', be]),
        iev('bechuanaland-expanded', 'Bechuanaland Protectorate expanded', 'Bechuanaland Protectorate', 1, ['botswana']),
        iev('bechuanaland-election-1965', 'First general election', 'Bechuanaland Protectorate', 2, ['botswana'], descr='Seretse Khama becomes prime minister.'),
        fev('basutoland-established', 'Basutoland made a Crown colony', 'Basutoland', 'year_start', ['lesotho', be],
            descr='Britain takes Basutoland back from the Cape Colony.'),
        sev('swaziland-under-sar', 'Swaziland placed under the Transvaal', 'Eswatini', 'In 1894, a convention placed Swaziland', ['eswatini', 'south-african-republic']),
        sev('swaziland-high-commission-territory', 'Swaziland a High Commission Territory', 'Eswatini', 'British high commission territory from 1903', ['eswatini', be]),
        fev('german-south-west-africa-established', 'German South West Africa established', 'German South West Africa', 'year_start', ['namibia', 'germany']),
        wev('battle-of-waterberg', 'Battle of Waterberg', 'Battle of Waterberg', ['namibia', 'germany']),
        fev('comoros-french-protectorate', 'French protectorate over the Comoros', 'Comoros', 'established_date2', ['comoros', fce]),
        fev('botswana-independence', 'Botswana independent', 'Botswana', 'established_date1', ['botswana', be], importance=1),
        fev('lesotho-independence', 'Lesotho independent', 'Lesotho', 'established_date2', ['lesotho', be], importance=1),
        wev('south-african-intervention-in-lesotho', 'South African intervention in Lesotho', 'South African intervention in Lesotho', ['lesotho', 'south-africa']),
        fev('eswatini-independence', 'Swaziland independent', 'Eswatini', 'established_date1', ['eswatini', be], importance=1),
        fev('eswatini-constitution-2005', 'Constitution of 2005', 'Eswatini', 'established_date3', ['eswatini']),
        fev('eswatini-renamed', 'Swaziland renamed Eswatini', 'Eswatini', 'established_date4', ['eswatini']),
    ]
