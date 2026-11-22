"""
Modern States wave 7a: Western and Middle Africa (2026-11-21). The UN Western Africa and Middle Africa states, plus
the historical states of the region with a former-country (or country) infobox that lived after 1500. Nigeria comes
from colonial.py; this module only adds events to it (tracks) and SHARED.

Rules applied (data-format.md and Kevin's decisions, 2026-11-21):
- A row that carries on into a state that exists today takes that state's id; its colonial and later governments are
  phases (benin: French Dahomey, Republic of Dahomey, People's Republic, Republic of Benin), with a dated memberOf in
  the empire (french-colonial-empire, british-empire, portuguese-empire, spanish-empire; German colonies in
  `germany`, the Belgian Congo in `belgium`, the Gold Coast forts in `dutch-empire`, `denmark`, `sweden`, `prussia`).
- Colonial units that split into several states are their own rows, linked by succession events: French West Africa,
  French Equatorial Africa, the French Congo (before 1910), German Togoland, German Kamerun and the British Cameroons.
  Units that map onto one state are phases (the Congo Free State and Belgian Congo on dr-congo; British Togoland, which
  joined the Gold Coast, on ghana).
- Unions are their own rows: the Mali Federation (1959–60) and the Senegambia Confederation (1982–89).
- Rival governments are overlapping phases (Gizenga's governments on dr-congo, UNITA's republic on angola, the
  Guinea-Bissau republic declared in 1973 beside Portuguese Guinea). Secessionist states with an infobox are rows
  (Biafra, Katanga, South Kasai, Cabinda, Azawad).
- Medieval seam (lead, 2026-11-21): mali-empire, songhai-empire, bornu-empire, kingdom-of-benin, kingdom-of-kongo,
  jolof-empire, mossi-kingdoms and kingdom-of-nri copy Medieval World's ids, dates and claim locations. A century in an
  infobox is read as Medieval does: mid-century ± 50 ("16th/17th century": 1600 ± 100), circa, the text in the note.
- AI-flagged pages are refused by G.art: `2023 Nigerien coup d'état` is flagged, so that coup is dated from the Niger
  article's infobox instead.

Called from gen_modern.py with its module (M).
"""
import re

GROUPS = [
    {'id': 'middle-africa', 'name': 'Middle Africa', 'color': '#5a8a3a', 'parent': 'africa'},
]

WAF, MAF = 'western-africa', 'middle-africa'

# rows of this wave added to events other modules define (union-event rule: only rows that acted as themselves)
SHARED = {
    'battle-of-tondibi': ['songhai-empire'],  # mena.py: the Saadi army destroys the Songhai Empire
    'western-sahara-war': ['mauritania'],  # mena.py: Mauritania fought the Polisario until 1979
    'madrid-accords': ['mauritania'],  # mena.py: Mauritania was a party to the partition of Western Sahara
    'nigerian-civil-war': ['biafra'],  # colonial.py
}


# ---------- helpers shared by tracks() and events() ----------

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
    """Source ref for the first sentence of article t that contains `needle` (None if there is none)."""
    for sec, s in _prose(M, t):
        if needle in s:
            return M.G.ref(t, f'lead: "{s[:160]}"' if sec is None else f'section "{sec}": "{s[:160]}"')
    return None


def HEAD(M, t, prefix, side):
    """Claim from a section heading's year range (Medieval World's Kanem–Bornu phases cite these)."""
    for h in M.G.art(t)['body']['headings']:
        if h['title'].startswith(prefix) and h.get('range'):
            return [{'year': h['range'][0 if side == 'start' else 1], 'source': M.G.ref(t, f'section "{h["title"]}"')}]
    raise SystemExit(f'{t}: no dated heading starting {prefix!r}')


def CENT(M, t, field):
    """A century in an infobox field, read as Medieval World does: mid-century ± 50; "16th/17th century" = 1600 ± 100."""
    txt = M.G.art(t)['fields'][field]['text']
    m = re.search(r'(\d+)(?:st|nd|rd|th)(?:\s*[/–-]\s*(\d+)(?:st|nd|rd|th))?\s+century', txt)
    if not m:
        raise SystemExit(f'{t}: {field} {txt!r} names no century')
    a = int(m.group(1))
    if m.group(2):
        year, margin = a * 100, 100 * (int(m.group(2)) - a)
    else:
        year, margin = (a - 1) * 100 + 50, 50
    return [{'year': year, 'margin': margin, 'source': M.G.ref(t, f'infobox {field}: {txt[:80]}'),
             'note': f'The infobox says "{txt}".'}]


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
    G, F, C, E, lead, phase, stretch, span, member, row = (
        M.G, M.F, M.C, M.E, M.lead, M.phase, M.stretch, M.span, M.member, M.row)

    def lead(t, needle):
        """Source ref for a sentence of article t containing `needle`: M.lead reads only dated lead sentences, so
        undated ones (and body sentences) are found in the article's prose."""
        r = SREF(M, t, needle)
        if r is None:
            raise SystemExit(f'{t}: no sentence with {needle!r}')
        return r

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
        return EVC(M, t, n, note)

    def SN(t, needle, k=0, note=None, margin=None):
        return SENT(M, t, needle, k, note, margin)

    def life(t, s='year_start', e='year_end', *, startEvent=None, endEvent=None, circa=False, sc=None, ec=None):
        """A row's single typed stretch from its own infobox (or given claims)."""
        return span(stretch(None, sc or F(t, s, 'start'), ec or F(t, e, 'end'), startEvent=startEvent, endEvent=endEvent, circa=circa))

    def hist(id_, name, color, parent, t, **kw):
        mem = kw.pop('memberOf', None)
        return row(id_, name, color, parent, t, span_=life(t, **kw), memberOf=mem)

    fce, be, pe, se_ = 'french-colonial-empire', 'british-empire', 'portuguese-empire', 'spanish-empire'
    fwa_t, fea_t = 'French West Africa', 'French Equatorial Africa'

    fwa_src = SN(fwa_t, 'Originally created in 1895')[0]['source']
    T = []

    # =====================================================================================================
    # Colonial federations and composite units (split into several states: their own rows)
    # =====================================================================================================
    T.append(row('french-west-africa', 'French West Africa', '#3a5a9a', WAF, fwa_t, span_=life(
        fwa_t, startEvent='fwa-established', endEvent='french-community-established'),
        memberOf=[member(fce, F(fwa_t, 'year_start', 'start'), F(fwa_t, 'year_end', 'end'), sources=[lead(fwa_t, 'federation of eight French colonial territories')],
                         startEvent='fwa-established', endEvent='french-community-established')]))
    fc = 'French Congo'
    T.append(row('french-congo', 'French Congo', '#4a6aaa', MAF, fc, span_=life(fc, 'seg0.start', 'seg0.end', endEvent='fea-established'),
                 memberOf=[member(fce, F(fc, 'seg0.start', 'start'), F(fc, 'seg0.end', 'end'), sources=[lead(fc, 'larger French Equatorial Africa')],
                                  endEvent='fea-established')]))
    T.append(row('french-equatorial-africa', 'French Equatorial Africa', '#5a7aba', MAF, fea_t, span_=life(
        fea_t, startEvent='fea-established', endEvent='french-community-established'),
        memberOf=[member(fce, F(fea_t, 'year_start', 'start'), F(fea_t, 'year_end', 'end'), sources=[lead(fea_t, 'administration was based in Brazzaville')],
                         startEvent='fea-established', endEvent='french-community-established')]))
    tg = 'Togoland'
    T.append(row('togoland', 'German Togoland', '#8a8a3a', WAF, tg, span_=life(tg, 'seg0.start', 'seg0.end', startEvent='togoland-protectorate', endEvent='togoland-campaign'),
                 memberOf=[member('germany', F(tg, 'seg0.start', 'start'), F(tg, 'seg0.end', 'end'), sources=[lead(tg, 'the colony was established in 1884')],
                                  startEvent='togoland-protectorate', endEvent='togoland-campaign')]))
    km = 'Kamerun'
    T.append(row('kamerun', 'German Kamerun', '#7a7a3a', MAF, km, span_=life(km, startEvent='kamerun-protectorate', endEvent='kamerun-campaign'),
                 memberOf=[member('germany', F(km, 'year_start', 'start'), F(km, 'year_end', 'end'), sources=[lead(km, 'Central African colony of the German Empire')],
                                  startEvent='kamerun-protectorate', endEvent='kamerun-campaign')]))
    bc = 'British Cameroons'
    T.append(row('british-cameroons', 'British Cameroons', '#9a4a5a', MAF, bc, span_=life(bc, startEvent='kamerun-partitioned', endEvent='cameroons-plebiscite'),
                 memberOf=[member(be, F(bc, 'year_start', 'start'), F(bc, 'year_end', 'end'),
                                  sources=[G.ref(bc, 'infobox event_start: Kamerun partitioned, 20 July 1916')],
                                  startEvent='kamerun-partitioned', endEvent='cameroons-plebiscite')]))

    # ---------- unions ----------
    mf, sg = 'Mali Federation', 'Senegambia Confederation'
    T.append(row('mali-federation', 'Mali Federation', '#6a7a3a', WAF, mf, span_=life(mf, startEvent='mali-federation-formed', endEvent='mali-federation-dissolved'),
                 memberOf=[member(fce, F(mf, 'year_start', 'start'), EV(mf, 1), sources=[lead(mf, 'self-rule within the French Community')],
                                  startEvent='mali-federation-formed', endEvent='mali-federation-independence')]))
    T.append(row('senegambia-confederation', 'Senegambia Confederation', '#5a8a6a', WAF, sg, span_=life(
        sg, startEvent='senegambia-formed', endEvent='senegambia-dissolved')))

    # =====================================================================================================
    # Western Africa: modern states
    # =====================================================================================================
    fd, rd, prb, bn = 'French Dahomey', 'Republic of Dahomey', "People's Republic of Benin", 'Benin'
    T.append(row('benin', 'Benin', '#3a8a5a', WAF, bn, phases=[
        phase('French Dahomey', F(fd, 'year_start', 'start'), F(fd, 'year_end', 'end'), startEvent='second-franco-dahomean-war'),
        phase('Republic of Dahomey', F(rd, 'year_start', 'start'), F(rd, 'year_end', 'end'), endEvent='benin-renamed-1975'),
        phase("People's Republic of Benin", F(prb, 'year_start', 'start'), F(prb, 'year_end', 'end'), startEvent='benin-renamed-1975',
              endEvent='benin-democracy-restored'),
        phase('Republic of Benin', S1(prb, 'year_end') + SN(bn, 'In 1991, it was replaced', note='The Benin article dates the multi-party republic from 1991.'),
              ongoing=cur(bn, 2), startEvent='benin-democracy-restored'),
    ], memberOf=[
        member(fce, F(fd, 'year_start', 'start'), EV(rd, 1), sources=[lead(fd, 'was a French colony and part of French West Africa')],
               startEvent='second-franco-dahomean-war', endEvent='benin-independence'),
        # the federation's article: "Dahomey was added in 1904"; French Dahomey's infobox dates it to 1895
        member('french-west-africa', SN(fwa_t, 'Dahomey was added in 1904') + EV(fd, 1, 'French Dahomey\'s infobox dates its entry to the federation to 1895.'),
               F(fwa_t, 'year_end', 'end'), sources=[fwa_src], endEvent='french-community-established'),
    ]))

    fuv, ruv, bf = 'French Upper Volta', 'Republic of Upper Volta', 'Burkina Faso'
    T.append(row('burkina-faso', 'Burkina Faso', '#b03a3a', WAF, bf, phases=[
        # dissolved 1932–47 and shared out among its neighbours: a gap (the row didn't exist)
        phase('French Upper Volta', F(fuv, 'seg0.start', 'start'), F(fuv, 'seg0.end', 'end'), endEvent='upper-volta-dissolved'),
        phase('French Upper Volta (restored)', F(fuv, 'seg1.start', 'start'), F(fuv, 'seg1.end', 'end'), startEvent='upper-volta-restored'),
        phase('Republic of Upper Volta', F(ruv, 'year_start', 'start'), F(ruv, 'year_end', 'end'), endEvent='burkina-renamed-1984'),
        phase('Burkina Faso', S1(ruv, 'year_end'), ongoing=cur(bf, 7), startEvent='burkina-renamed-1984'),
    ], memberOf=[
        member(fce, F(fuv, 'seg0.start', 'start'), F(fuv, 'seg0.end', 'end'), sources=[lead(fuv, 'colony of French West Africa established in 1919')],
               endEvent='upper-volta-dissolved'),
        member(fce, F(fuv, 'seg1.start', 'start'), EV(ruv, 1), sources=[lead(fuv, 'revived as a part of the French Union')],
               startEvent='upper-volta-restored', endEvent='upper-volta-independence'),
        member('french-west-africa', F(fuv, 'seg0.start', 'start') + SN(fwa_t, 'Dahomey was added in 1904', k=3,
                                                                         note='The federation\'s article says Upper Volta entered the AOF when it was divided from French Sudan in 1921.'),
               F(fuv, 'seg0.end', 'end'), sources=[lead(fuv, 'colony of French West Africa established in 1919')], endEvent='upper-volta-dissolved'),
        member('french-west-africa', F(fuv, 'seg1.start', 'start'), F(fwa_t, 'year_end', 'end'), sources=[lead(fuv, 'revived as a part of the French Union')],
               startEvent='upper-volta-restored', endEvent='french-community-established'),
    ]))

    pcv, cv = 'Portuguese Cape Verde', 'Cape Verde'
    T.append(row('cape-verde', 'Cape Verde', '#3a6aba', WAF, cv, phases=[
        phase('Portuguese Cape Verde', F(pcv, 'year_start', 'start'), F(pcv, 'year_end', 'end'), endEvent='cape-verde-independence'),
        phase('Republic of Cape Verde', est(cv, 1), ongoing=cur(cv, 1), startEvent='cape-verde-independence'),
    ], memberOf=[member(pe, F(pcv, 'year_start', 'start'), F(pcv, 'year_end', 'end'), sources=[lead(pcv, 'colony of the Portuguese Empire')],
                        endEvent='cape-verde-independence')]))

    hic, ic = 'History of Ivory Coast', 'Ivory Coast'
    T.append(row('ivory-coast', 'Ivory Coast', '#d08a2a', WAF, ic, phases=[
        # the colony's infobox sits in the History of Ivory Coast article (French Ivory Coast redirects there)
        phase('Colony of Ivory Coast', F(hic, 'year_start', 'start'), EV(hic, 3)),
        phase("Republic of Côte d'Ivoire", est(ic, 1), ongoing=cur(ic, 2)),
    ], memberOf=[
        member(fce, F(hic, 'year_start', 'start'), F(hic, 'year_end', 'end'), sources=[lead(ic, 'consolidated as a French colony in 1893')],
               endEvent='ivory-coast-independence'),
        member('french-west-africa', F(fwa_t, 'year_start', 'start') + EV(hic, 2, 'The History of Ivory Coast infobox dates its accession to the federation to 1904.'),
               F(fwa_t, 'year_end', 'end'), sources=[fwa_src], startEvent='fwa-established', endEvent='french-community-established'),
    ]))

    gcp, gm = 'Gambia Colony and Protectorate', 'The Gambia'
    T.append(row('gambia', 'Gambia', '#3a8aaa', WAF, gm, phases=[
        phase('Gambia Colony and Protectorate', F(gcp, 'year_start', 'start') + SN(gcp, 'British colonial administration of The Gambia from 1821',
                                                                                   note='The lead dates the colonial administration from 1821.'),
              F(gcp, 'year_end', 'end'), endEvent='gambia-independence'),
        phase('Republic of the Gambia', est(gm, 1), ongoing=cur(gm, 2), startEvent='gambia-independence'),
    ], memberOf=[
        member(be, F(gcp, 'year_start', 'start'), F(gcp, 'year_end', 'end'), sources=[lead(gcp, 'part of the British Empire')], endEvent='gambia-independence'),
        member('senegambia-confederation', F(sg, 'year_start', 'start'), F(sg, 'year_end', 'end'), sources=[lead(sg, 'agreement between the two countries')],
               startEvent='senegambia-formed', endEvent='senegambia-dissolved'),
    ]))

    pgc, dgc, sgc, dagc, bgc, gcc, btg, dg, gh = ('Portuguese Gold Coast', 'Dutch Gold Coast', 'Swedish Gold Coast', 'Danish Gold Coast',
                                                  'Brandenburger Gold Coast', 'Gold Coast (British colony)', 'British Togoland', 'Dominion of Ghana', 'Ghana')
    T.append(row('ghana', 'Ghana', '#c0a02a', WAF, gh, phases=[
        # the European forts on the coast ran side by side: parallel phases, each with a membership in its empire
        phase('Portuguese Gold Coast', F(pgc, 'year_start', 'start'), F(pgc, 'year_end', 'end')),
        phase('Dutch Gold Coast', F(dgc, 'year_start', 'start'), F(dgc, 'year_end', 'end'), endEvent='dutch-gold-coast-ceded'),
        phase('Swedish Gold Coast', F(sgc, 'seg0.start', 'start'), F(sgc, 'seg0.end', 'end')),
        phase('Swedish Gold Coast (restored)', F(sgc, 'seg1.start', 'start'), F(sgc, 'seg1.end', 'end')),
        phase('Danish Gold Coast', F(dagc, 'year_start', 'start'), F(dagc, 'year_end', 'end'), endEvent='danish-forts-sold'),
        phase('Brandenburger Gold Coast', F(bgc, 'year_start', 'start'), F(bgc, 'year_end', 'end')),
        phase('Gold Coast', F(gcc, 'year_start', 'start'), F(gcc, 'year_end', 'end'), endEvent='ghana-independence'),
        phase('British Togoland', F(btg, 'year_start', 'start'), F(btg, 'year_end', 'end'), startEvent='togoland-partitioned', endEvent='british-togoland-joins-gold-coast'),
        phase('Dominion of Ghana', F(dg, 'year_start', 'start'), F(dg, 'year_end', 'end'), startEvent='ghana-independence', endEvent='ghana-republic'),
        phase('Republic of Ghana', est(gh, 2), ongoing=cur(gh, 2), startEvent='ghana-republic'),
    ], memberOf=[
        member(pe, F(pgc, 'year_start', 'start'), F(pgc, 'year_end', 'end'), sources=[lead(pgc, 'São Jorge da Mina')]),
        member('dutch-empire', F(dgc, 'year_start', 'start'), F(dgc, 'year_end', 'end'), sources=[lead(dgc, 'gradually colonised by the Dutch West India Company')],
               endEvent='dutch-gold-coast-ceded'),
        member('sweden', F(sgc, 'seg0.start', 'start'), F(sgc, 'seg0.end', 'end'), sources=[lead(sgc, 'Swedish colony founded in 1650')]),
        member('sweden', F(sgc, 'seg1.start', 'start'), F(sgc, 'seg1.end', 'end'), sources=[lead(sgc, 'Swedish colony founded in 1650')]),
        member('denmark', F(dagc, 'year_start', 'start'), F(dagc, 'year_end', 'end'), sources=[G.ref(dagc, 'infobox event_start: Denmark-Norway annexation from Sweden, 1658')],
               endEvent='danish-forts-sold'),
        member('prussia', F(bgc, 'year_start', 'start'), F(bgc, 'year_end', 'end'), sources=[lead(bgc, 'Brandenburg colony existed from 1682 to 1701')]),
        member(be, F(gcc, 'year_start', 'start'), F(gcc, 'year_end', 'end'), sources=[lead(gcc, 'British Crown colony on the Gulf of Guinea')], endEvent='ghana-independence'),
    ]))

    fg, gn = 'French Guinea', 'Guinea'
    T.append(row('guinea', 'Guinea', '#c03a3a', WAF, gn, phases=[
        phase('French Guinea', F(fg, 'year_start', 'start'), F(fg, 'year_end', 'end'), endEvent='guinea-independence'),
        phase('Republic of Guinea', est(gn, 3), ongoing=cur(gn, 8), startEvent='guinea-independence'),
    ], memberOf=[
        member(fce, F(fg, 'year_start', 'start'), F(fg, 'year_end', 'end'), sources=[lead(fg, 'French Guinea was established by France in 1891')],
               endEvent='guinea-independence'),
        member('french-west-africa', F(fwa_t, 'year_start', 'start') + SN(fg, 'In 1895, French Guinea was made one of several dependent colonies'),
               F(fwa_t, 'year_end', 'end'), sources=[fwa_src], startEvent='fwa-established', endEvent='guinea-independence'),
    ]))

    pg, gb = 'Portuguese Guinea', 'Guinea-Bissau'
    T.append(row('guinea-bissau', 'Guinea-Bissau', '#2a7a5a', WAF, gb, phases=[
        phase('Portuguese Guinea', F(pg, 'year_start', 'start'), F(pg, 'year_end', 'end'), endEvent='guinea-bissau-independence-recognised'),
        # declared in 1973 while Portugal still held Bissau: overlapping (rival) phases until recognition in 1974
        phase('Republic of Guinea-Bissau', est(gb, 4), ongoing=cur(gb, 7), startEvent='guinea-bissau-independence-declared'),
    ], memberOf=[member(pe, F(pg, 'year_start', 'start'), F(pg, 'year_end', 'end'), sources=[lead(pg, 'Portuguese overseas province in West Africa')],
                        endEvent='guinea-bissau-independence-recognised')]))

    col, lib = 'Colony of Liberia', 'Liberia'
    T.append(row('liberia', 'Liberia', '#2a4a8a', WAF, lib, phases=[
        phase('Colony of Liberia', F(col, 'seg0.start', 'start') + est(lib, 1), F(col, 'seg0.end', 'end'), endEvent='liberian-independence'),
        phase('Republic of Liberia', est(lib, 2), ongoing=cur(lib, 4), startEvent='liberian-independence'),
    ]))

    fs, ml = 'French Sudan', 'Mali'
    T.append(row('mali', 'Mali', '#3a9a4a', WAF, ml, phases=[
        # the Sudanese Republic of November 1958 ends the colony; French Sudan's infobox closes it at the 1959 federation
        phase('French Sudan', F(fs, 'year_start', 'start'), est(ml, 1) + [dict(F(fs, 'year_end', 'end')[0], note="French Sudan's infobox ends it when it federated with Senegal.")],
              circa=True),
        phase('Sudanese Republic', est(ml, 1), est(ml, 5), endEvent='mali-federation-dissolved'),
        phase('Republic of Mali', est(ml, 5), ongoing=cur(ml, 5), startEvent='mali-federation-dissolved'),
    ], memberOf=[
        member(fce, F(fs, 'year_start', 'start'), est(ml, 3), sources=[lead(fs, 'French colonial territory in the Federation of French West Africa')],
               endEvent='mali-federation-independence'),
        member('french-west-africa', F(fwa_t, 'year_start', 'start'), F(fwa_t, 'year_end', 'end'), sources=[fwa_src],
               startEvent='fwa-established', endEvent='french-community-established'),
        member('mali-federation', est(ml, 2), est(ml, 4), sources=[lead(mf, 'linked the French colonies of Senegal and the Sudanese Republic')],
               startEvent='mali-federation-formed', endEvent='mali-federation-dissolved'),
    ]))

    cm, mr = 'Colonial Mauritania', 'Mauritania'
    T.append(row('mauritania', 'Mauritania', '#2a8a6a', WAF, mr, phases=[
        # Colonial Mauritania has no infobox: dated by its own sentences and the Mauritania infobox
        phase('French Mauritania', SN(cm, 'In 1904 France recognized Mauritania as an entity separate from Senegal'), est(mr, 1)),
        phase('Islamic Republic of Mauritania', est(mr, 1), ongoing=cur(mr, 3)),
    ], memberOf=[
        member(fce, SN(cm, 'In 1904 France recognized Mauritania as an entity separate from Senegal'), est(mr, 2),
               sources=[SREF(M, cm, 'In 1904 France recognized Mauritania')], endEvent='mauritania-independence'),
        member('french-west-africa', SN(cm, 'by a decree of the Colonial Ministry in Paris, Mauritania was officially included in the AOF')
               + SN(fwa_t, 'Dahomey was added in 1904', k=2), F(fwa_t, 'year_end', 'end'),
               sources=[SREF(M, cm, 'Mauritania was officially included in the AOF')], endEvent='french-community-established'),
    ]))

    cn, ng = 'Colony of Niger', 'Niger'
    T.append(row('niger', 'Niger', '#d07a2a', WAF, ng, phases=[
        phase('Colony of Niger', F(cn, 'year_start', 'start'), est(ng, 1)),
        phase('Republic of Niger', est(ng, 1), ongoing=cur(ng, 4)),
    ], memberOf=[
        member(fce, F(cn, 'year_start', 'start'), F(cn, 'year_end', 'end'), sources=[lead(cn, 'titled the Colonie du Niger only from 1922 to 1960')],
               endEvent='niger-independence'),
        # the Niger article puts the colony in French West Africa; the federation's article says Niger stayed out "until the 1940s"
        member('french-west-africa', F(cn, 'year_start', 'start'), F(fwa_t, 'year_end', 'end'), sources=[lead(ng, 'becoming a distinct colony in 1922')],
               endEvent='french-community-established'),
    ]))

    sen = 'Senegal'
    T.append(row('senegal', 'Senegal', '#2a9a5a', WAF, sen, phases=[
        # no article on the colony has an infobox: Colonial Mauritania dates the 1840 ordinance that made Senegal a permanent possession
        phase('Colony of Senegal', SN(cm, 'In 1840 a French ordinance had established Senegal'), est(sen, 1)),
        phase('Republic of Senegal', est(sen, 1), ongoing=cur(sen, 4)),
    ], memberOf=[
        member(fce, SN(cm, 'In 1840 a French ordinance had established Senegal'), est(sen, 2), sources=[SREF(M, cm, 'In 1840 a French ordinance had established Senegal')],
               endEvent='mali-federation-independence'),
        member('french-west-africa', F(fwa_t, 'year_start', 'start'), F(fwa_t, 'year_end', 'end'), sources=[fwa_src],
               startEvent='fwa-established', endEvent='french-community-established'),
        member('mali-federation', est(ml, 2), est(sen, 3), sources=[lead(mf, 'linked the French colonies of Senegal and the Sudanese Republic')],
               startEvent='mali-federation-formed', endEvent='mali-federation-dissolved'),
        member('senegambia-confederation', F(sg, 'year_start', 'start'), est(sen, 4), sources=[lead(sg, 'agreement between the two countries')],
               startEvent='senegambia-formed', endEvent='senegambia-dissolved'),
    ]))

    slc, dsl, sl = 'Sierra Leone Colony and Protectorate', 'Sierra Leone (1961–1971)', 'Sierra Leone'
    T.append(row('sierra-leone', 'Sierra Leone', '#3a7aca', WAF, sl, phases=[
        phase('Colony and Protectorate of Sierra Leone', F(slc, 'year_start', 'start'), F(slc, 'year_end', 'end'), endEvent='sierra-leone-independence'),
        phase('Dominion of Sierra Leone', F(dsl, 'year_start', 'start'), F(dsl, 'year_end', 'end'), startEvent='sierra-leone-independence', endEvent='sierra-leone-republic'),
        phase('Republic of Sierra Leone', est(sl, 2), ongoing=cur(sl, 2), startEvent='sierra-leone-republic'),
    ], memberOf=[member(be, F(slc, 'year_start', 'start'), F(slc, 'year_end', 'end'), sources=[lead(slc, 'part of the British Empire')],
                        endEvent='sierra-leone-independence')]))

    ftg, tgo = 'French Togoland', 'Togo'
    T.append(row('togo', 'Togo', '#2a6a3a', WAF, tgo, phases=[
        phase('French Togoland', F(ftg, 'year_start', 'start') + [dict(est(tgo, 2)[0], note='The Togo infobox dates French Togoland from the 1914 occupation.')],
              F(ftg, 'year_end', 'end'), startEvent='togoland-partitioned', endEvent='togo-independence'),
        phase('Togolese Republic', est(tgo, 3), ongoing=cur(tgo, 5), startEvent='togo-independence'),
    ], memberOf=[member(fce, F(ftg, 'year_start', 'start'), F(ftg, 'year_end', 'end'), sources=[lead(ftg, 'French colonial League of Nations mandate')],
                        startEvent='togoland-partitioned', endEvent='togo-independence')]))

    # =====================================================================================================
    # Middle Africa: modern states
    # =====================================================================================================
    pa, pra, dpra, ang = 'Portuguese Angola', "People's Republic of Angola", "Democratic People's Republic of Angola", 'Angola'
    T.append(row('angola', 'Angola', '#b02a2a', MAF, ang, phases=[
        phase('Portuguese Angola', F(pa, 'year_start', 'start'), F(pa, 'year_end', 'end'), endEvent='angola-independence'),
        phase("People's Republic of Angola", F(pra, 'year_start', 'start'), F(pra, 'year_end', 'end'), startEvent='angola-independence', endEvent='angola-multiparty'),
        # UNITA's rival republic (FNLA–UNITA), suppressed in 1976 and re-established 1979–2002
        phase("Democratic People's Republic of Angola (UNITA)", F(dpra, 'date_pre', 'start'), F(dpra, 'seg0.end', 'end')),
        phase("Democratic People's Republic of Angola (UNITA)", F(dpra, 'seg1.start', 'start'), F(dpra, 'seg1.end', 'end'), endEvent='angolan-civil-war'),
        phase('Republic of Angola', S1(pra, 'year_end'), ongoing=cur(ang, 3), startEvent='angola-multiparty'),
    ], memberOf=[member(pe, F(pa, 'year_start', 'start'), F(pa, 'year_end', 'end'), sources=[lead(pa, 'historical colony of the Portuguese Empire')],
                        endEvent='angola-independence')]))

    fcm, scm, cmr = 'French Cameroon', 'Southern Cameroons', 'Cameroon'
    T.append(row('cameroon', 'Cameroon', '#3a8a3a', MAF, cmr, phases=[
        phase('French Cameroon', F(fcm, 'year_start', 'start'), F(fcm, 'year_end', 'end'), startEvent='kamerun-partitioned', endEvent='cameroon-independence'),
        # the southern part of the British Cameroons, which federated with Cameroon in 1961: a parallel phase
        phase('Southern Cameroons', F(scm, 'year_start', 'start'), F(scm, 'year_end', 'end'), startEvent='kamerun-partitioned', endEvent='cameroons-plebiscite'),
        phase('Republic of Cameroon', est(cmr, 1), est(cmr, 2), startEvent='cameroon-independence', endEvent='cameroons-plebiscite'),
        phase('Federal Republic of Cameroon', est(cmr, 2), est(cmr, 3), startEvent='cameroons-plebiscite', endEvent='cameroon-unitary-state'),
        phase('United Republic of Cameroon', est(cmr, 3), SN(cmr, 'back to the Republic of Cameroon in 1984', k=1), startEvent='cameroon-unitary-state'),
        phase('Republic of Cameroon (since 1984)', SN(cmr, 'back to the Republic of Cameroon in 1984', k=1), ongoing=cur(cmr, 4)),
    ], memberOf=[
        member(fce, F(fcm, 'year_start', 'start'), F(fcm, 'year_end', 'end'), sources=[lead(cmr, 'divided between France and the United Kingdom')],
               startEvent='kamerun-partitioned', endEvent='cameroon-independence'),
        member('british-cameroons', F(scm, 'year_start', 'start'), F(scm, 'year_end', 'end'), sources=[lead(cmr, 'southern part of British Cameroons federated')],
               startEvent='kamerun-partitioned', endEvent='cameroons-plebiscite'),
    ]))

    us, cae, car = 'Ubangi-Shari', 'Central African Empire', 'Central African Republic'
    T.append(row('central-african-republic', 'Central African Republic', '#5a5aaa', MAF, car, phases=[
        phase('Ubangi-Shari', F(us, 'seg0.start', 'start'), est(us, 6)),
        phase('Central African Republic', est(car, 1), est(car, 3), endEvent='central-african-empire-proclaimed'),
        phase('Central African Empire', F(cae, 'seg0.start', 'start'), F(cae, 'seg0.end', 'end'), startEvent='central-african-empire-proclaimed',
              endEvent='bokassa-overthrown'),
        phase('Central African Republic (restored)', est(car, 5), ongoing=cur(car, 5), startEvent='bokassa-overthrown'),
    ], memberOf=[
        member(fce, F(us, 'seg0.start', 'start'), est(us, 7), sources=[lead(car, 'established the separate colony of Ubangi-Shari')], endEvent='car-independence'),
        member('french-equatorial-africa', est(us, 2), F(fea_t, 'year_end', 'end'), sources=[G.ref(us, 'infobox established_event2: French Equatorial Africa, 15 January 1910')],
               startEvent='fea-established', endEvent='french-community-established'),
    ]))

    fch, chd = 'French Chad', 'Chad'
    T.append(row('chad', 'Chad', '#2a5a9a', MAF, chd, phases=[
        phase('French Chad', F(fch, 'seg0.start', 'start'), est(chd, 1)),
        phase('Republic of Chad', est(chd, 1), ongoing=cur(chd, 2)),
    ], memberOf=[
        member(fce, F(fch, 'seg0.start', 'start'), F(fch, 'seg0.end', 'end'), sources=[lead(fch, 'part of the French colonial empire from 1900 to 1960')],
               endEvent='chad-independence'),
        member('french-equatorial-africa', EV(fch, 1), F(fea_t, 'year_end', 'end'), sources=[G.ref(fch, 'infobox event1: Integrated into French Equatorial Africa, 15 January 1910')],
               startEvent='fea-established', endEvent='french-community-established'),
    ]))

    prc, roc = "People's Republic of the Congo", 'Republic of the Congo'
    T.append(row('republic-of-the-congo', 'Republic of the Congo', '#3a7a9a', MAF, roc,
                 # inside the French Congo 1882–1903 with no government of its own: the lifespan carries it across
                 span_=span(stretch(None, est(roc, 2), ongoing=cur(roc, 11))),
                 phases=[
        phase('Middle Congo', EV(fc, 1), est(roc, 4)),
        phase('Republic of the Congo', est(roc, 4), est(roc, 6), endEvent='peoples-republic-of-the-congo-founded'),
        phase("People's Republic of the Congo", est(roc, 6) + [dict(F(prc, 'year_start', 'start')[0], note="The People's Republic's infobox gives 31 December 1970.")],
              est(roc, 7), startEvent='peoples-republic-of-the-congo-founded', endEvent='peoples-republic-of-the-congo-dissolved'),
        phase('Republic of the Congo (since 1992)', est(roc, 7), ongoing=cur(roc, 11), startEvent='peoples-republic-of-the-congo-dissolved'),
    ], memberOf=[
        member(fce, est(roc, 2), SN(roc, 'gained independence from France in 1960', k=1), sources=[lead(fc, 'larger French Equatorial Africa')],
               endEvent='congo-independence-1960'),
        member('french-congo', est(roc, 2), est(roc, 2, ':last'), sources=[G.ref(roc, 'infobox established_event2: French Congo, 1882 - 1910')], endEvent='fea-established'),
        member('french-equatorial-africa', est(roc, 3), est(roc, 3, ':last'), sources=[G.ref(roc, 'infobox established_event3: Administrated under French Equatorial Africa, 1910 - 1958')],
               startEvent='fea-established', endEvent='french-community-established'),
    ]))

    cfs, bcg, fcr, frc, prcs, zr, drc = ('Congo Free State', 'Belgian Congo', 'First Congolese Republic', 'Free Republic of the Congo',
                                         "People's Republic of the Congo (Stanleyville)", 'Zaire', 'Democratic Republic of the Congo')
    T.append(row('dr-congo', 'DR Congo', '#2a7aaa', MAF, drc, phases=[
        phase('Congo Free State', F(cfs, 'year_start', 'start'), F(cfs, 'year_end', 'end'), startEvent='congo-free-state-founded', endEvent='belgian-annexation-of-the-congo'),
        phase('Belgian Congo', F(bcg, 'year_start', 'start'), F(bcg, 'year_end', 'end'), startEvent='belgian-annexation-of-the-congo', endEvent='congolese-independence'),
        phase('Republic of the Congo (Léopoldville)', F(fcr, 'year_start', 'start'), F(fcr, 'year_end', 'end'), startEvent='congolese-independence',
              endEvent='mobutu-coup-1965'),
        # Gizenga's governments in Stanleyville claimed to be the Congo's legitimate government: rival phases
        phase('Free Republic of the Congo (Stanleyville)', F(frc, 'year_start', 'start'), F(frc, 'year_end', 'end')),
        phase("People's Republic of the Congo (Stanleyville)", F(prcs, 'year_start', 'start'), F(prcs, 'year_end', 'end')),
        phase('Zaire', F(zr, 'year_start', 'start'), F(zr, 'year_end', 'end'), startEvent='mobutu-coup-1965', endEvent='first-congo-war'),
        phase('Democratic Republic of the Congo', S1(zr, 'year_end'), ongoing=cur(drc, 9), startEvent='first-congo-war'),
    ], memberOf=[member('belgium', F(bcg, 'year_start', 'start'), F(bcg, 'year_end', 'end'), sources=[lead(bcg, 'was a Belgian colony in Central Africa')],
                        startEvent='belgian-annexation-of-the-congo', endEvent='congolese-independence')]))

    sgu, eqg = 'Spanish Guinea', 'Equatorial Guinea'
    T.append(row('equatorial-guinea', 'Equatorial Guinea', '#3a9a7a', MAF, eqg, phases=[
        phase('Spanish Guinea', F(sgu, 'year_start', 'start'), F(sgu, 'year_end', 'end'), startEvent='treaty-of-el-pardo-1778', endEvent='equatorial-guinea-independence'),
        phase('Republic of Equatorial Guinea', est(eqg, 1), ongoing=cur(eqg, 2), startEvent='equatorial-guinea-independence'),
    ], memberOf=[member(se_, F(sgu, 'year_start', 'start'), F(sgu, 'year_end', 'end'), sources=[lead(sgu, 'controlled by Spain from 1778')],
                        startEvent='treaty-of-el-pardo-1778', endEvent='equatorial-guinea-independence')]))

    gab = 'Gabon'
    T.append(row('gabon', 'Gabon', '#4a9a3a', MAF, gab,
                 # inside the French Congo 1882–1910 with no government of its own: the lifespan carries it across
                 span_=span(stretch(None, est(gab, 1), ongoing=cur(gab, 6))),
                 phases=[
        phase('French Gabon', est(gab, 2), est(gab, 3), startEvent='fea-established'),
        phase('Gabonese Republic', est(gab, 3), ongoing=cur(gab, 6)),
    ], memberOf=[
        member(fce, est(gab, 1), est(gab, 4), sources=[G.ref(gab, 'infobox established_event1: Administrated under the French Congo, 1882–1910')],
               endEvent='gabon-independence'),
        member('french-congo', est(gab, 1), est(gab, 1, ':last'), sources=[G.ref(gab, 'infobox established_event1: Administrated under the French Congo, 1882–1910')],
               endEvent='fea-established'),
        member('french-equatorial-africa', est(gab, 2), est(gab, 2, ':last'),
               sources=[G.ref(gab, 'infobox established_event2: Re-established as French Gabon under the administration of French Equatorial Africa, 1910–1958')],
               startEvent='fea-established', endEvent='french-community-established'),
    ]))

    pst, stp = 'Portuguese São Tomé and Príncipe', 'São Tomé and Príncipe'
    T.append(row('sao-tome-and-principe', 'São Tomé and Príncipe', '#2a8a8a', MAF, stp, phases=[
        phase('Portuguese São Tomé and Príncipe', F(pst, 'year_start', 'start') + SN(pst, 'from the discovery of the São Tomé and Príncipe islands in 1470',
                                                                                     note='The lead counts the colony from the discovery of the islands in 1470.'),
              F(pst, 'year_end', 'end'), endEvent='sao-tome-independence'),
        phase('Democratic Republic of São Tomé and Príncipe', est(stp, 1), ongoing=cur(stp, 3), startEvent='sao-tome-independence'),
    ], memberOf=[member(pe, F(pst, 'year_start', 'start'), F(pst, 'year_end', 'end'), sources=[lead(pst, 'colony of the Portuguese Empire')],
                        endEvent='sao-tome-independence')]))

    # =====================================================================================================
    # Western Africa: historical states
    # =====================================================================================================
    # ---------- seam rows (Medieval World ids, dates and claim locations) ----------
    T.append(hist('mali-empire', 'Mali Empire', '#c08a2a', WAF, 'Mali Empire', circa=True))
    T.append(hist('songhai-empire', 'Songhai Empire', '#c0a03a', WAF, 'Songhai Empire', endEvent='moroccan-invasion-of-songhai'))
    kb = 'Kanem–Bornu Empire'
    T.append(row('bornu-empire', 'Kanem–Bornu', '#6a4a8a', WAF, kb, phases=[
        phase('Kanem', HEAD(M, kb, 'Medieval period', 'start'), HEAD(M, kb, 'Conversion to Islam', 'end'), circa=True),
        phase('Era of Instability', HEAD(M, kb, 'Era of Instability', 'start'), HEAD(M, kb, 'Era of Instability', 'end')),
        phase('Bornu', HEAD(M, kb, 'Modern period', 'start'), HEAD(M, kb, 'Modern period', 'end'), endEvent='rabih-conquers-bornu'),
        phase("Rabih az-Zubayr's empire", HEAD(M, kb, "Rabih az-Zubayr's empire", 'start'), HEAD(M, kb, "Rabih az-Zubayr's empire", 'end'),
              startEvent='rabih-conquers-bornu', endEvent='battle-of-kousseri'),
        phase('Al-Kanemi restoration', HEAD(M, kb, 'Al-Kanemi restoration', 'start'), HEAD(M, kb, 'Al-Kanemi restoration', 'end') + F(kb, 'year_end', 'end'),
              startEvent='battle-of-kousseri', endEvent='bornu-partitioned'),
    ]))
    T.append(hist('kingdom-of-benin', 'Kingdom of Benin', '#a83a3a', WAF, 'Kingdom of Benin', endEvent='benin-expedition-1897'))
    T.append(hist('jolof-empire', 'Jolof Empire', '#3a7a5a', WAF, 'Jolof Empire', endEvent='battle-of-danki'))
    T.append(hist('mossi-kingdoms', 'Mossi Kingdoms', '#8a6a5a', WAF, 'Mossi Kingdoms', circa=True, sc=CENT(M, 'Mossi Kingdoms', 'year_start'),
                  endEvent='french-conquest-of-mossi'))
    T.append(hist('kingdom-of-nri', 'Kingdom of Nri', '#4a8a6a', WAF, 'Kingdom of Nri', circa=True, sc=CENT(M, 'Kingdom of Nri', 'year_start')))
    # Oyo: the article's infobox has no usable dates; its own body and the Ilorin article date it (lead, 2026-11-21)
    T.append(row('oyo-empire', 'Oyo Empire', '#9a5a3a', WAF, 'Oyo Empire', span_=span(stretch(
        None, SN('Oyo Empire', 'The founding of Oyo is regarded as 1300', note='"Only estimated through backtracking the chronology."'),
        SN('Ilorin', 'this marked the end of Oyo'), circa=True, endEvent='battle-of-ilorin'))))

    # ---------- other historical states ----------
    soc = 'Sokoto Caliphate'
    T.append(hist('sokoto-caliphate', 'Sokoto Caliphate', '#3a6a3a', WAF, soc, startEvent='fulani-war', endEvent='battle-of-burmi'))
    kk = 'Kingdom of Kano'
    T.append(hist('kingdom-of-kano', 'Kingdom of Kano', '#6a8a3a', WAF, kk, circa=True,
                  ec=F(kk, 'year_end', 'end') + SN(kk, 'established around 1000 CE', k=1, note='The lead dates the conquest to 1805.'), endEvent='fulani-war'))
    ke = 'Kano Emirate'
    T.append(hist('kano-emirate', 'Kano Emirate', '#5a7a2a', WAF, ke, sc=F(ke, 'year_start', 'start') + SN(ke, 'formed in 1805', note='The lead dates it to 1805.'),
                  startEvent='fulani-war', endEvent='battle-of-burmi',
                  memberOf=[member('sokoto-caliphate', est(ke, 1), est(ke, 2), sources=[G.ref(ke, 'infobox established_event1: Vassal of the Sokoto Caliphate, 1807')],
                                   startEvent='fulani-war', endEvent='battle-of-burmi')]))
    ad = 'Adamawa Emirate'
    T.append(hist('adamawa-emirate', 'Adamawa Emirate', '#7a6a2a', MAF, ad, sc=est(ad, 1), ec=est(ad, 2), startEvent='fulani-war',
                  memberOf=[member('sokoto-caliphate', est(ad, 1), est(ad, 2), sources=[G.ref(ad, 'infobox established_event1: Vassal of the Sokoto Caliphate, 1807')],
                                   startEvent='fulani-war')]))
    T.append(hist('aro-confederacy', 'Aro Confederacy', '#5a4a3a', WAF, 'Aro Confederacy', endEvent='anglo-aro-war'))
    T.append(hist('biafra', 'Biafra', '#a05a2a', WAF, 'Biafra', startEvent='nigerian-civil-war', endEvent='nigerian-civil-war'))

    ase = 'Asante Empire'
    T.append(hist('asante-empire', 'Asante Empire', '#c0802a', WAF, ase, s='seg0.start', e='seg0.end', ec=F(ase, 'seg0.end', 'end'),
                  startEvent='battle-of-feyiase', endEvent='asante-annexed'))
    ak = 'Akwamu Empire'
    T.append(hist('akwamu-empire', 'Akwamu Empire', '#8a7a4a', WAF, ak, circa=True, sc=CENT(M, ak, 'year_start'),
                  ec=[dict(F(ak, 'year_end', 'end')[0], note='The infobox gives 1730 as an empire and 1886 as an independent kingdom.')],
                  endEvent='akwamu-defeated'))

    dah = 'Dahomey'
    T.append(hist('kingdom-of-dahomey', 'Kingdom of Dahomey', '#7a3a5a', WAF, dah, circa=True,
                  memberOf=[
        # the Dahomey article gives both 1732 (section Yoruba) and 1748 (section Rule of Ghezo)
        member('oyo-empire', SN(dah, 'Dahomey became a tributary of the Oyo')
               + SN(dah, 'the Yoruba empire of Oyo had over the Dahomey since 1748', note='The Rule of Ghezo section dates the tributary status from 1748.'),
               SN(dah, 'Dahomey became a tributary of the Oyo', k=1) + EV(dah, 3),
               sources=[SREF(M, dah, 'Dahomey became a tributary of the Oyo')], endEvent='dahomey-ends-oyo-tribute'),
        member(fce, EV(dah, 4), F(dah, 'year_end', 'end'), sources=[G.ref(dah, 'infobox event4: Annexed into French Dahomey, 1894'),
                                                                     lead(dah, 'part of the kingdom becoming a French protectorate')],
               startEvent='second-franco-dahomean-war'),
    ]))
    ard, why = 'Kingdom of Ardra', 'Kingdom of Whydah'
    T.append(hist('kingdom-of-ardra', 'Kingdom of Ardra', '#8a4a6a', WAF, ard, circa=True, sc=CENT(M, ard, 'year_start'), endEvent='dahomey-conquers-allada-and-whydah'))
    T.append(hist('kingdom-of-whydah', 'Kingdom of Whydah', '#9a5a7a', WAF, why, circa=True, sc=CENT(M, why, 'date_start'), endEvent='dahomey-conquers-allada-and-whydah'))

    T.append(hist('segou-empire', 'Ségou Empire', '#6a3a2a', WAF, 'Ségou Empire', endEvent='tukulor-conquest-of-segou'))
    T.append(hist('kaarta', 'Kaarta', '#7a4a2a', WAF, 'Kaarta', circa=True, endEvent='french-conquest-of-kaarta'))
    T.append(hist('tukulor-empire', 'Tukulor Empire', '#5a3a6a', WAF, 'Tukulor Empire', startEvent='umar-tall-jihad', endEvent='tukulor-annexed'))
    T.append(hist('caliphate-of-hamdullahi', 'Caliphate of Hamdullahi (Massina)', '#4a5a2a', WAF, 'Caliphate of Hamdullahi',
                  startEvent='battle-of-noukouma', endEvent='hamdullahi-destroyed'))
    T.append(hist('samorian-state', 'Samorian State (Wassoulou)', '#8a3a3a', WAF, 'Samorian State', endEvent='mandingo-wars'))
    T.append(hist('kong-empire', 'Kong Empire', '#9a7a3a', WAF, 'Kong Empire', endEvent='kong-burned'))
    T.append(hist('kenedougou-kingdom', 'Kénédougou Kingdom', '#7a5a3a', WAF, 'Kénédougou Kingdom', circa=True, endEvent='fall-of-sikasso'))
    T.append(hist('gwiriko', 'Gwiriko', '#6a6a3a', WAF, 'Gwiriko'))
    fj = 'Imamate of Futa Jallon'
    T.append(hist('imamate-of-futa-jallon', 'Imamate of Futa Jallon', '#3a5a4a', WAF, fj,
                  memberOf=[member(fce, EV(fj, 2), F(fj, 'year_end', 'end'), sources=[lead(fj, 'became part of French West Africa in 1896')],
                                   startEvent='futa-jallon-protectorate')]))
    ft = 'Imamate of Futa Toro'
    T.append(hist('imamate-of-futa-toro', 'Imamate of Futa Toro', '#4a6a5a', WAF, ft, startEvent='futa-toro-revolution', endEvent='futa-toro-annexed'))
    T.append(hist('bundu', 'Bundu', '#5a6a4a', WAF, 'Bundu (state)'))
    T.append(hist('khasso', 'Khasso', '#6a5a4a', WAF, 'Khasso', startEvent='battle-of-toumbifara', endEvent='khasso-incorporated'))
    T.append(hist('kaabu', 'Kaabu', '#5a8a4a', WAF, 'Kaabu', endEvent='battle-of-kansala'))
    T.append(hist('baol', 'Baol', '#4a7a6a', WAF, 'Baol', startEvent='battle-of-danki'))
    wa = 'Waalo'
    T.append(hist('waalo', 'Waalo', '#3a6a6a', WAF, wa,
                  memberOf=[member('jolof-empire', F('Jolof Empire', 'year_start', 'start') + EV(wa, 1, 'Waalo\'s infobox: part of the Jolof Empire "c. 1350–1549 (de facto)".'),
                                   F('Jolof Empire', 'year_end', 'end'),
                                   sources=[G.ref(wa, 'infobox event1: part of the Jolof Empire, c. 1350-1549 (de facto) / 1715 (de jure)')],
                                   endEvent='battle-of-danki')]))
    sal = 'Saloum'
    T.append(hist('saloum', 'Saloum', '#4a8a7a', WAF, sal, circa=True, sc=F(sal, 'date_start', 'start'),
                  ec=EV(sal, 1, 'The infobox calls it "Annexation into French West Africa", which did not yet exist; the year ends the independent kingdom.')))
    T.append(hist('emirate-of-trarza', 'Emirate of Trarza', '#8a7a5a', WAF, 'Emirate of Trarza'))
    T.append(hist('emirate-of-brakna', 'Emirate of Brakna', '#7a6a4a', WAF, 'Emirate of Brakna'))
    ag = 'Sultanate of Agadez'
    T.append(hist('sultanate-of-agadez', 'Sultanate of Agadez', '#9a6a4a', WAF, ag, sc=F(ag, 'date_start', 'start'), ec=EV(ag, 3), endEvent='agadez-french-suzerainty',
                  memberOf=[member('songhai-empire', SN(ag, 'conquered by the Songhai Empire in 1500'), SN(ag, 'regained its independence'),
                                   sources=[SREF(M, ag, 'conquered by the Songhai Empire in 1500')], startEvent='songhai-conquers-agadez')]))
    rm = 'Republic of Maryland'
    T.append(hist('republic-of-maryland', 'Republic of Maryland', '#4a5a8a', WAF, rm, s='date_start', e='date_end', endEvent='maryland-annexed'))
    T.append(hist('azawad', 'Azawad', '#8a6a3a', WAF, 'Azawad', startEvent='azawad-declared', endEvent='ouagadougou-agreements'))

    # =====================================================================================================
    # Middle Africa: historical states
    # =====================================================================================================
    kg = 'Kingdom of Kongo'
    T.append(hist('kingdom-of-kongo', 'Kingdom of Kongo', '#3a5a9a', MAF, kg, endEvent='kongo-monarchy-abolished',
                  memberOf=[member(pe, SN(kg, 'From 1862 to 1914'), SN(kg, 'From 1862 to 1914', k=1), sources=[lead(kg, 'vassal state of the Kingdom of Portugal')],
                                   endEvent='kongo-monarchy-abolished')]))
    T.append(hist('kingdom-of-loango', 'Kingdom of Loango', '#4a6a8a', MAF, 'Kingdom of Loango', circa=True))
    T.append(hist('kingdom-of-ndongo', 'Kingdom of Ndongo', '#5a4a7a', MAF, 'Kingdom of Ndongo', endEvent='ndongo-colonised'))
    T.append(hist('kasanje-kingdom', 'Kasanje Kingdom', '#6a4a6a', MAF, 'Kasanje Kingdom',
                  ec=F('Kasanje Kingdom', 'year_end', 'end') + SN('Kasanje Kingdom', 'The Kasanje Kingdom (1620–1910)', k=1, note='The lead ends it in 1910.'),
                  endEvent='kasanje-incorporated'))
    T.append(hist('kuba-kingdom', 'Kuba Kingdom', '#7a5a6a', MAF, 'Kuba Kingdom'))
    T.append(hist('lunda-empire', 'Lunda Empire', '#8a5a5a', MAF, 'Lunda Empire', circa=True, sc=CENT(M, 'Lunda Empire', 'year_start')))
    T.append(hist('yeke-kingdom', 'Yeke Kingdom', '#9a6a5a', MAF, 'Yeke Kingdom', circa=True, endEvent='msiri-killed'))
    tio = 'Tio Kingdom'
    T.append(hist('tio-kingdom', 'Tio Kingdom', '#5a7a6a', MAF, tio, circa=True, sc=CENT(M, tio, 'date_start'), ec=F(tio, 'date_end', 'end'), endEvent='tio-french-protectorate'))
    T.append(hist('mwene-muji', 'Mwene Muji', '#6a7a5a', MAF, 'Mwene Muji', circa=True))
    T.append(hist('kingdom-of-orungu', 'Kingdom of Orungu', '#4a8a5a', MAF, 'Kingdom of Orungu', circa=True, endEvent='orungu-monarchy-abolished'))
    T.append(hist('mbunda-kingdom', 'Mbunda Kingdom', '#7a8a4a', MAF, 'Mbunda Kingdom', circa=True, endEvent='kolongongo-war'))
    T.append(hist('kingdom-of-bamum', 'Kingdom of Bamum', '#8a8a5a', MAF, 'Kingdom of Bamum', sc=F('Kingdom of Bamum', 'date_start', 'start')))
    wd, bg, dk = 'Wadai Sultanate', 'Sultanate of Bagirmi', 'Dar al Kuti'
    T.append(hist('wadai-sultanate', 'Wadai Sultanate', '#9a7a4a', MAF, wd, startEvent='wadai-founded', endEvent='french-conquest-of-wadai'))
    T.append(hist('sultanate-of-bagirmi', 'Sultanate of Bagirmi', '#8a6a4a', MAF, bg, sc=F(bg, 'date_start', 'start'),
                  ec=SN(bg, 'Founded in 1522', k=1), endEvent='bagirmi-french-protectorate',
                  memberOf=[member('wadai-sultanate', SN(bg, 'It was conquered by Wadai in 1805'), SN(bg, 'It was conquered by Wadai in 1805', k=1),
                                   sources=[SREF(M, bg, 'It was conquered by Wadai in 1805')], startEvent='wadai-conquers-bagirmi')]))
    T.append(hist('dar-al-kuti', 'Dar al Kuti', '#7a7a4a', MAF, dk, circa=True,
                  ec=F(dk, 'year_end', 'end') + SN(dk, 'existed from around 1830 until 17 December 1912', k=1, note='The lead ends it on 17 December 1912.')))
    T.append(hist('state-of-katanga', 'State of Katanga', '#aa6a2a', MAF, 'State of Katanga', startEvent='katanga-secession', endEvent='operation-grandslam'))
    T.append(hist('south-kasai', 'South Kasai', '#9a5a2a', MAF, 'South Kasai', startEvent='south-kasai-secession', endEvent='south-kasai-coup'))
    T.append(hist('republic-of-cabinda', 'Republic of Cabinda', '#8a4a2a', MAF, 'Republic of Cabinda', startEvent='cabinda-independence'))
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

    fce, be, pe = 'french-colonial-empire', 'british-empire', 'portuguese-empire'
    fwa, fea = 'French West Africa', 'French Equatorial Africa'
    return [
        # ---------- colonial federations ----------
        fev('fwa-established', 'French West Africa established', fwa, 'year_start',
            ['french-west-africa', fce, 'senegal', 'mali', 'guinea', 'ivory-coast'], importance=1,
            descr='France groups Senegal, French Sudan, French Guinea and Ivory Coast under a governor-general (27 October 1895); formalised in 1904.'),
        fev('fea-established', 'French Equatorial Africa established', fea, 'year_start',
            ['french-equatorial-africa', 'french-congo', fce, 'gabon', 'republic-of-the-congo', 'central-african-republic', 'chad'], importance=1,
            descr='The French Congo is reorganised as the federation of French Equatorial Africa (15 January 1910), governed from Brazzaville.'),
        fev('french-community-established', 'French Community replaces the federations', fwa, 'year_end',
            ['french-west-africa', 'french-equatorial-africa', fce],
            descr='The Fifth Republic\'s constitution (October 1958) makes the colonies self-governing republics in the French Community; the federations end.'),
        # ---------- German colonies and their partition ----------
        fev('togoland-protectorate', 'German protectorate of Togoland', 'Togoland', 'year_start', ['togoland', 'germany'],
            descr='Germany declares a protectorate over the coast of Togo on 5 July 1884.'),
        wev('togoland-campaign', 'Togoland campaign', 'Togoland campaign', ['togoland', be, fce],
            descr='British and French forces overrun the German colony in August 1914.'),
        fev('togoland-partitioned', 'Togoland partitioned', 'Togoland', 'date_post', ['togo', 'ghana', be, fce],
            descr='The occupied colony is divided into British and French zones on 27 December 1916, made mandates in 1922.'),
        fev('kamerun-protectorate', 'German protectorate of Kamerun', 'Kamerun', 'year_start', ['kamerun', 'germany']),
        wev('kamerun-campaign', 'Kamerun campaign', 'Kamerun campaign', ['kamerun', be, fce],
            descr='Allied forces conquer the German colony between August 1914 and March 1916.'),
        fev('kamerun-partitioned', 'Kamerun partitioned', 'French Cameroon', 'year_start', ['kamerun', 'cameroon', 'british-cameroons', be, fce],
            descr='Britain and France divide German Kamerun on 20 July 1916; League of Nations mandates follow.'),
        fev('cameroons-plebiscite', 'British Cameroons divided between Nigeria and Cameroon', 'British Cameroons', 'year_end',
            ['british-cameroons', 'cameroon', 'nigeria'], importance=1,
            descr='After the 1961 plebiscites the north joins Nigeria and the Southern Cameroons federates with Cameroon (1 October 1961).'),
        # ---------- unions ----------
        fev('mali-federation-formed', 'Mali Federation formed', 'Mali', 'established_date2', ['mali-federation', 'mali', 'senegal'],
            descr='Senegal and the Sudanese Republic federate on 4 April 1959.'),
        iev('mali-federation-independence', 'Independence of the Mali Federation', 'Mali Federation', 1, ['mali-federation', 'mali', 'senegal', fce],
            importance=1, descr='The federation becomes independent from France on 20 June 1960.'),
        fev('mali-federation-dissolved', 'Mali Federation breaks up', 'Mali', 'established_date4', ['mali-federation', 'mali', 'senegal'],
            descr='Senegal withdraws on 20 August 1960; the Sudanese Republic proclaims itself the Republic of Mali in September.'),
        fev('senegambia-formed', 'Senegambia Confederation formed', 'Senegambia Confederation', 'year_start', ['senegambia-confederation', 'senegal', 'gambia']),
        fev('senegambia-dissolved', 'Senegambia Confederation dissolved', 'Senegambia Confederation', 'year_end', ['senegambia-confederation', 'senegal', 'gambia'],
            descr='Senegal dissolves the confederation on 30 September 1989 after the Gambia refuses closer union.'),

        # ---------- Benin and Dahomey ----------
        iev('dahomey-conquers-allada-and-whydah', 'Dahomey conquers Allada and Whydah', 'Dahomey', 2, ['kingdom-of-dahomey', 'kingdom-of-ardra', 'kingdom-of-whydah'],
            descr='King Agaja takes the coastal kingdoms, giving Dahomey direct access to the Atlantic trade.'),
        iev('dahomey-ends-oyo-tribute', 'Dahomey throws off Oyo tribute', 'Dahomey', 3, ['kingdom-of-dahomey', 'oyo-empire'],
            descr='King Ghezo defeats the Oyo Empire and ends Dahomey\'s tributary status.'),
        wev('first-franco-dahomean-war', 'First Franco-Dahomean War', 'First Franco-Dahomean War', ['kingdom-of-dahomey', fce]),
        wev('second-franco-dahomean-war', 'Second Franco-Dahomean War', 'Second Franco-Dahomean War', ['kingdom-of-dahomey', 'benin', fce], importance=1,
            descr='France defeats Dahomey and makes its lands the colony of French Dahomey.'),
        fev('benin-independence', 'Independence of Dahomey', 'Benin', 'established_date2', ['benin', fce], importance=1),
        wev('dahomey-coup-1972', '1972 Dahomeyan coup', "1972 Dahomeyan coup d'état", ['benin'], descr='Mathieu Kérékou seizes power.'),
        fev('benin-renamed-1975', "People's Republic of Benin proclaimed", "People's Republic of Benin", 'year_start', ['benin'],
            descr='Kérékou\'s Marxist–Leninist state renames Dahomey Benin on 30 November 1975.'),
        fev('benin-democracy-restored', 'Benin restores democracy', "People's Republic of Benin", 'year_end', ['benin'], importance=1,
            descr='A national conference ends the one-party state; the multi-party Republic of Benin follows.'),
        # ---------- Burkina Faso ----------
        sev('french-conquest-of-mossi', 'French conquest of the Mossi Kingdoms', 'Mossi Kingdoms', 'In 1896, the French took over the kingdoms', ['mossi-kingdoms', fce]),
        iev('upper-volta-dissolved', 'Upper Volta dissolved', 'French Upper Volta', 1, ['burkina-faso', fce],
            descr='The colony is shared out among Ivory Coast, French Sudan and Niger on 5 September 1932.'),
        iev('upper-volta-restored', 'Upper Volta restored', 'French Upper Volta', 2, ['burkina-faso', fce], descr='Revived within its old borders on 4 September 1947.'),
        iev('upper-volta-independence', 'Independence of Upper Volta', 'Republic of Upper Volta', 1, ['burkina-faso', fce], importance=1),
        wev('upper-volta-coup-1966', '1966 Upper Voltan coup', "1966 Upper Voltan coup d'état", ['burkina-faso']),
        wev('upper-volta-coup-1983', '1983 Upper Voltan coup', "1983 Upper Voltan coup d'état", ['burkina-faso'], descr='Thomas Sankara takes power.'),
        fev('burkina-renamed-1984', 'Upper Volta renamed Burkina Faso', 'Republic of Upper Volta', 'year_end', ['burkina-faso'], descr='Renamed on 4 August 1984.'),
        wev('burkina-coup-1987', '1987 Burkina Faso coup', "1987 Burkina Faso coup d'état", ['burkina-faso'], descr='Sankara is killed; Blaise Compaoré takes power.'),
        wev('burkina-uprising-2014', 'Burkina Faso uprising', '2014 Burkina Faso uprising', ['burkina-faso'], descr='Mass protests force Compaoré out.'),
        fev('burkina-coups-2022', 'Two coups in Burkina Faso', 'Burkina Faso', 'established_date6', ['burkina-faso'],
            descr='Coups in January and September 2022; Ibrahim Traoré takes power.'),
        sev('aes-leave-ecowas', 'Sahel states leave ECOWAS', 'Burkina Faso', 'withdrew from ECOWAS', ['burkina-faso', 'mali', 'niger'],
            descr='Burkina Faso, Mali and Niger, allied in the Alliance of Sahel States, withdraw from ECOWAS.'),
        # ---------- Cape Verde, Guinea-Bissau, São Tomé, Angola: Portuguese Africa ----------
        fev('cape-verde-independence', 'Independence of Cape Verde', 'Cape Verde', 'established_date1', ['cape-verde', pe], importance=1),
        wev('portuguese-colonial-war', 'Portuguese Colonial War', 'Portuguese Colonial War', [pe, 'angola', 'guinea-bissau'], importance=1,
            descr='Wars of independence in Angola, Guinea-Bissau and Mozambique, ended by the Carnation Revolution in Portugal.'),
        wev('guinea-bissau-war-of-independence', 'Guinea-Bissau War of Independence', 'Guinea-Bissau War of Independence', ['guinea-bissau', pe]),
        fev('guinea-bissau-independence-declared', 'Guinea-Bissau declares independence', 'Guinea-Bissau', 'established_date4', ['guinea-bissau'], importance=1),
        fev('guinea-bissau-independence-recognised', 'Portugal recognises Guinea-Bissau', 'Guinea-Bissau', 'established_date5', ['guinea-bissau', pe]),
        wev('guinea-bissau-civil-war', 'Guinea-Bissau Civil War', 'Guinea-Bissau Civil War', ['guinea-bissau']),
        fev('guinea-bissau-coup-2025', '2025 Guinea-Bissau coup', 'Guinea-Bissau', 'established_date7', ['guinea-bissau']),
        fev('sao-tome-independence', 'Independence of São Tomé and Príncipe', 'São Tomé and Príncipe', 'established_date1', ['sao-tome-and-principe', pe], importance=1),
        fev('sao-tome-multiparty', 'São Tomé adopts a multi-party constitution', 'São Tomé and Príncipe', 'established_date3', ['sao-tome-and-principe']),
        wev('angolan-war-of-independence', 'Angolan War of Independence', 'Angolan War of Independence', ['angola', pe], importance=1),
        fev('angola-independence', 'Independence of Angola', 'Angola', 'established_date1', ['angola', pe], importance=1,
            descr='The MPLA proclaims the People\'s Republic in Luanda on 11 November 1975; rival movements proclaim their own.'),
        wev('angolan-civil-war', 'Angolan Civil War', 'Angolan Civil War', ['angola'], importance=1),
        fev('angola-multiparty', 'Angola becomes a multi-party republic', "People's Republic of Angola", 'year_end', ['angola']),
        fev('angola-constitution-2010', 'Angolan constitution of 2010', 'Angola', 'established_date3', ['angola']),
        fev('cabinda-independence', 'Cabinda proclaims independence', 'Republic of Cabinda', 'year_start', ['republic-of-cabinda'],
            descr='FLEC proclaims the Republic of Cabinda on 1 August 1975; MPLA forces occupy the enclave after Angolan independence.'),
        # ---------- Ivory Coast ----------
        fev('ivory-coast-independence', 'Independence of Ivory Coast', 'Ivory Coast', 'established_date2', ['ivory-coast', fce], importance=1),
        wev('ivorian-coup-1999', '1999 Ivorian coup', "1999 Ivorian coup d'état", ['ivory-coast']),
        wev('first-ivorian-civil-war', 'First Ivorian Civil War', 'First Ivorian Civil War', ['ivory-coast'], importance=1),
        wev('second-ivorian-civil-war', 'Second Ivorian Civil War', 'Second Ivorian Civil War', ['ivory-coast']),
        sev('ivory-coast-constitution-2016', 'Ivorian constitution of 2016', 'Ivory Coast', 'It adopted a new constitution in 2016', ['ivory-coast']),
        # ---------- Gambia ----------
        fev('gambia-independence', 'Independence of the Gambia', 'The Gambia', 'established_date1', ['gambia', be], importance=1),
        wev('gambian-coup-1994', '1994 Gambian coup', "1994 Gambian coup d'état", ['gambia'], descr='Yahya Jammeh overthrows Dawda Jawara.'),
        sev('barrow-presidency', 'Adama Barrow becomes president', 'The Gambia', 'Adama Barrow formally became president', ['gambia'],
            descr='Jammeh\'s 22-year rule ends after his election defeat.'),
        # ---------- Ghana and the Gold Coast ----------
        sev('elmina-captured', 'Dutch capture Elmina', 'Dutch Gold Coast', 'after Fort Elmina was captured from the Portuguese', ['ghana', 'dutch-empire', pe]),
        fev('danish-forts-sold', 'Danish Gold Coast sold to Britain', 'Danish Gold Coast', 'year_end', ['ghana', 'denmark', be]),
        fev('dutch-gold-coast-ceded', 'Dutch Gold Coast ceded to Britain', 'Dutch Gold Coast', 'year_end', ['ghana', 'dutch-empire', be],
            descr='Handed over on 6 April 1872 under the Anglo-Dutch Treaties of 1870–71.'),
        wev('battle-of-feyiase', 'Battle of Feyiase', 'Battle of Feyiase', ['asante-empire'], descr='Asante defeats Denkyira and becomes the leading Akan power.'),
        wev('anglo-ashanti-wars', 'Anglo-Ashanti wars', 'Anglo-Ashanti wars', ['asante-empire', 'ghana', be], importance=1),
        wev('war-of-the-golden-stool', 'War of the Golden Stool', 'War of the Golden Stool', ['asante-empire', 'ghana', be]),
        sev('asante-annexed', 'Asante annexed to the Gold Coast', 'Asante Empire', 'became part of the Gold Coast colony on 1 January 1902', ['asante-empire', 'ghana'], k=0),
        iev('british-togoland-joins-gold-coast', 'British Togoland joins the Gold Coast', 'Gold Coast (British colony)', 6, ['ghana'],
            descr='After the May 1956 plebiscite the trust territory is merged with the Gold Coast.'),
        fev('ghana-independence', 'Independence of Ghana', 'Ghana', 'established_date1', ['ghana', be], importance=1,
            descr='The Gold Coast becomes independent as Ghana on 6 March 1957, the first colony in sub-Saharan Africa to do so.'),
        fev('ghana-republic', 'Ghana becomes a republic', 'Ghana', 'established_date2', ['ghana']),
        wev('ghana-coup-1966', '1966 Ghanaian coup', "1966 Ghanaian coup d'état", ['ghana'], descr='Kwame Nkrumah is overthrown.'),
        wev('ghana-coup-1981', '1981 Ghanaian coup', "1981 Ghanaian coup d'état", ['ghana'], descr='Jerry Rawlings takes power.'),
        iev('akwamu-conquers-accra', 'Akwamu conquers Accra', 'Akwamu Empire', 3, ['akwamu-empire']),
        iev('akwamu-defeated', 'Akwamu defeated by Akyem', 'Akwamu Empire', 6, ['akwamu-empire'], descr='Akyem and its allies destroy the capital Nyanoase.'),
        # ---------- Guinea ----------
        fev('guinea-independence', 'Independence of Guinea', 'Guinea', 'established_date3', ['guinea', fce], importance=1,
            descr='Guinea votes no in the 1958 referendum and becomes independent on 2 October 1958, the only colony to refuse the French Community.'),
        wev('guinea-coup-1984', '1984 Guinean coup', "1984 Guinean coup d'état", ['guinea']),
        fev('guinea-coup-2008', '2008 Guinean coup', 'Guinea', 'established_date6', ['guinea']),
        wev('guinea-coup-2021', '2021 Guinean coup', "2021 Guinean coup d'état", ['guinea'], descr='The army overthrows Alpha Condé.'),
        fev('guinea-constitution-2025', 'Guinean constitution of 2025', 'Guinea', 'established_date8', ['guinea']),
        iev('futa-jallon-protectorate', 'Futa Jallon becomes a French protectorate', 'Imamate of Futa Jallon', 2, ['imamate-of-futa-jallon', fce]),
        # ---------- Liberia ----------
        fev('liberian-independence', 'Liberia declares independence', 'Liberia', 'established_date2', ['liberia'], importance=1),
        fev('maryland-annexed', 'Maryland annexed by Liberia', 'Liberia', 'established_date3', ['republic-of-maryland', 'liberia']),
        wev('liberian-coup-1980', '1980 Liberian coup', "1980 Liberian coup d'état", ['liberia'], importance=1,
            descr='Samuel Doe ends Americo-Liberian rule.'),
        wev('first-liberian-civil-war', 'First Liberian Civil War', 'First Liberian Civil War', ['liberia'], importance=1),
        wev('second-liberian-civil-war', 'Second Liberian Civil War', 'Second Liberian Civil War', ['liberia']),
        fev('liberia-constitution-1986', 'Liberian constitution of 1986', 'Liberia', 'established_date4', ['liberia']),
        # ---------- Mali and its predecessors ----------
        sev('songhai-sacks-niani', 'Songhai attack on the Mali capital', 'Mali Empire', 'the Songhai invaded the capital', ['mali-empire', 'songhai-empire']),
        sev('songhai-conquers-agadez', 'Songhai conquers Agadez', 'Sultanate of Agadez', 'conquered by the Songhai Empire in 1500', ['songhai-empire', 'sultanate-of-agadez']),
        wev('moroccan-invasion-of-songhai', 'Moroccan invasion of the Songhai Empire', 'Moroccan invasion of the Songhai Empire', ['songhai-empire', 'morocco', 'mali-empire'],
            importance=1, descr='The Saadi army breaks Songhai at Tondibi (1591); Mali\'s attempt to profit ends in defeat at Djenné in 1599.'),
        sev('mali-defeat-at-djenne', 'Mali defeated outside Djenné', 'Mali Empire', 'disastrous defeat outside Djenne', ['mali-empire'], k=1),
        fev('tukulor-conquest-of-segou', 'Tukulor conquest of Ségou', 'Ségou Empire', 'year_end', ['segou-empire', 'tukulor-empire'], importance=1),
        iev('tukulor-conquers-kaarta', 'Tukulor conquest of Kaarta', 'Kaarta', 2, ['kaarta', 'tukulor-empire']),
        fev('french-conquest-of-kaarta', 'French conquest of Kaarta', 'Kaarta', 'year_end', ['kaarta', fce]),
        fev('umar-tall-jihad', "Umar Tall's jihad", 'Tukulor Empire', 'year_start', ['tukulor-empire'], descr='Omar Tall declares jihad against Tamba.'),
        fev('tukulor-annexed', 'Tukulor Empire annexed to French West Africa', 'Tukulor Empire', 'year_end', ['tukulor-empire', fce]),
        wev('battle-of-noukouma', 'Battle of Noukouma', 'Battle of Noukouma', ['caliphate-of-hamdullahi', 'segou-empire'],
            descr='Seku Amadu defeats the Bambara Empire and founds the Caliphate of Hamdullahi.'),
        fev('hamdullahi-destroyed', 'Tukulor destroy Hamdullahi', 'Caliphate of Hamdullahi', 'year_end', ['caliphate-of-hamdullahi', 'tukulor-empire']),
        wev('mandingo-wars', 'Mandingo Wars', 'Mandingo Wars', ['samorian-state', fce], importance=1,
            descr='France fights Samori Ture\'s state until his capture in 1898.'),
        sev('kong-burned', 'Samori burns Kong', 'Kong Empire', 'Samori Ture attacked the city and burnt it down', ['kong-empire', 'samorian-state']),
        fev('fall-of-sikasso', 'Fall of Sikasso', 'Kénédougou Kingdom', 'year_end', ['kenedougou-kingdom', fce]),
        iev('gwiriko-breaks-from-kong', 'Gwiriko breaks away from Kong', 'Gwiriko', 1, ['gwiriko', 'kong-empire']),
        sev('french-occupation-of-gwiriko', 'French occupation of Gwiriko', 'Gwiriko', 'lasted until French occupation in 1897', ['gwiriko', fce]),
        wev('mali-coup-1968', '1968 Malian coup', "1968 Malian coup d'état", ['mali'], descr='Moussa Traoré overthrows Modibo Keïta.'),
        wev('mali-coup-1991', '1991 Malian coup', "1991 Malian coup d'état", ['mali'], descr='Traoré falls; a multi-party constitution follows.'),
        ongoing(wev('mali-war', 'Mali War', 'Mali War', ['mali', 'azawad'], importance=1,
                    descr='A Tuareg rebellion, then jihadist insurgency, from January 2012; French intervention 2013–22.')),
        wev('mali-coup-2012', '2012 Malian coup', "2012 Malian coup d'état", ['mali']),
        fev('azawad-declared', 'Azawad declares independence', 'Azawad', 'year_start', ['azawad', 'mali'], descr='The MNLA declares the Independent State of Azawad on 6 April 2012.'),
        fev('ouagadougou-agreements', 'Ouagadougou Agreements', 'Azawad', 'year_end', ['azawad', 'mali'], descr='Signed on 18 June 2013; Azawad\'s claim lapses.'),
        wev('mali-coup-2020', '2020 Malian coup', "2020 Malian coup d'état", ['mali']),
        wev('mali-coup-2021', '2021 Malian coup', "2021 Malian coup d'état", ['mali']),
        # ---------- Mauritania ----------
        sev('maures-attack-saint-louis', 'Trarza and Brakna attack Saint-Louis', 'Colonial Mauritania', 'The Maures attacked Saint Louis in 1855',
            ['emirate-of-trarza', 'emirate-of-brakna', 'senegal', fce], descr='Repulsed; the peace extends a French protectorate over Trarza and Brakna.'),
        fev('mauritania-independence', 'Independence of Mauritania', 'Mauritania', 'established_date2', ['mauritania', fce], importance=1),
        wev('mauritania-coup-1978', '1978 Mauritanian coup', "1978 Mauritanian coup d'état", ['mauritania'], descr='Moktar Ould Daddah is overthrown.'),
        wev('mauritania-senegal-border-war', 'Mauritania–Senegal Border War', 'Mauritania–Senegal Border War', ['mauritania', 'senegal']),
        fev('mauritania-constitution-1991', 'Mauritanian constitution of 1991', 'Mauritania', 'established_date3', ['mauritania']),
        wev('mauritania-coup-2008', '2008 Mauritanian coup', "2008 Mauritanian coup d'état", ['mauritania']),
        # ---------- Niger ----------
        iev('agadez-french-suzerainty', 'Agadez under French suzerainty', 'Sultanate of Agadez', 3, ['sultanate-of-agadez', fce]),
        fev('niger-independence', 'Independence of Niger', 'Niger', 'established_date2', ['niger', fce], importance=1),
        wev('niger-coup-1974', '1974 Nigerien coup', "1974 Nigerien coup d'état", ['niger'], descr='Hamani Diori is overthrown.'),
        # the coup's own article carries an AI-generated-text flag: dated from the Niger infobox instead
        fev('niger-coup-2023', '2023 Nigerien coup', 'Niger', 'established_date3', ['niger'], descr='The army deposes President Mohamed Bazoum.'),
        # ---------- Nigeria (row in colonial.py) ----------
        wev('fulani-war', 'Fulani War', 'Fulani War', ['sokoto-caliphate', 'kingdom-of-kano', 'kano-emirate', 'adamawa-emirate'], importance=1,
            descr='Usman dan Fodio\'s jihad overthrows the Hausa kingdoms and founds the Sokoto Caliphate.'),
        wev('battle-of-burmi', 'Battle of Burmi', 'Battle of Burmi', ['sokoto-caliphate', 'kano-emirate', 'nigeria', be], importance=1,
            descr='British forces kill the last caliph, Attahiru; the caliphate is absorbed into Northern Nigeria.'),
        wev('benin-expedition-1897', 'Benin Expedition of 1897', 'Benin Expedition of 1897', ['kingdom-of-benin', be], importance=1,
            descr='A British punitive expedition sacks Benin City and ends the kingdom\'s independence.'),
        sev('benin-civil-war', 'Benin civil war', 'Kingdom of Benin', 'A civil war broke out around 1689', ['kingdom-of-benin'],
            descr='A succession war breaks out around the accession of Oba Ewuakpe; Akenzua eventually prevails.'),
        sev('gallwey-treaty', 'Gallwey Treaty', 'Kingdom of Benin', 'Progress was made in 1892', ['kingdom-of-benin', be]),
        wev('anglo-aro-war', 'Anglo-Aro War', 'Anglo-Aro War', ['aro-confederacy', 'nigeria', be]),
        sev('nupe-occupation-of-oyo', 'Nupe occupation of Oyo', 'Oyo Empire', 'the Nupe occupied Oyo', ['oyo-empire'],
            descr='The ruling dynasty takes refuge in Borgu; Oyo is re-established about eighty years later.'),
        wev('battle-of-ilorin', 'Battle of Ilorin', 'Battle of Ilorin', ['oyo-empire'], descr='Oyo\'s attempt to retake Ilorin fails; "this marked the end of Oyo".'),
        ongoing(wev('boko-haram-insurgency', 'Boko Haram insurgency', 'Boko Haram insurgency', ['nigeria', 'niger', 'chad', 'cameroon'], importance=1)),
        # ---------- Senegal and the Senegambia ----------
        wev('battle-of-danki', 'Battle of Danki', 'Battle of Danki', ['jolof-empire', 'baol', 'waalo'], importance=1,
            descr='Cayor defeats Jolof; the empire breaks up into its former vassal kingdoms.'),
        sev('futa-toro-revolution', 'Torodbe revolution in Futa Toro', 'Imamate of Futa Toro', 'Sulayman Bal led a jihad in 1776', ['imamate-of-futa-toro']),
        sev('futa-toro-annexed', 'Futa Toro annexed', 'Imamate of Futa Toro', 'Futa Toro was eventually annexed in 1859', ['imamate-of-futa-toro', fce]),
        fev('battle-of-toumbifara', 'Battle of Toumbifara', 'Khasso', 'year_start', ['khasso']),
        fev('khasso-incorporated', 'Khasso incorporated into French Sudan', 'Khasso', 'year_end', ['khasso', fce]),
        wev('battle-of-kansala', 'Battle of Kansala', 'Battle of Kansala', ['kaabu', 'imamate-of-futa-jallon'], importance=1,
            descr='Futa Jallon\'s army takes the Kaabu capital; the federation collapses.'),
        wev('battle-of-dakar', 'Battle of Dakar', 'Battle of Dakar', ['senegal', fce, 'united-kingdom'],
            descr='An Allied attempt to take Dakar from Vichy France fails.'),
        wev('casamance-conflict', 'Casamance conflict', 'Casamance conflict', ['senegal']),
        # ---------- Sierra Leone ----------
        fev('sierra-leone-independence', 'Independence of Sierra Leone', 'Sierra Leone', 'established_date1', ['sierra-leone', be], importance=1),
        wev('sierra-leone-coups-1967', '1967 Sierra Leonean coups', "1967 Sierra Leonean coups d'état", ['sierra-leone']),
        fev('sierra-leone-republic', 'Sierra Leone becomes a republic', 'Sierra Leone', 'established_date2', ['sierra-leone']),
        sev('sierra-leone-one-party', 'One-party state in Sierra Leone', 'Sierra Leone', 'Stevens declared the APC to be the sole', ['sierra-leone']),
        wev('sierra-leone-civil-war', 'Sierra Leone Civil War', 'Sierra Leone Civil War', ['sierra-leone', 'liberia'], importance=1),
        # ---------- Togo ----------
        fev('togo-independence', 'Independence of Togo', 'Togo', 'established_date3', ['togo', fce], importance=1),
        wev('togo-coup-1963', '1963 Togolese coup', "1963 Togolese coup d'état", ['togo'], descr='President Sylvanus Olympio is killed.'),
        wev('togo-coup-1967', '1967 Togolese coup', "1967 Togolese coup d'état", ['togo'], descr='Gnassingbé Eyadéma takes power.'),
        fev('togo-constitution-2024', 'Togolese constitution of 2024', 'Togo', 'established_date5', ['togo']),

        # ---------- Middle Africa ----------
        # Kanem–Bornu, Wadai, Bagirmi
        sev('rabih-conquers-bornu', 'Rabih az-Zubayr conquers Bornu', 'Kanem–Bornu Empire', 'In 1893, Kanem–Bornu was conquered', ['bornu-empire'], importance=1),
        wev('battle-of-kousseri', 'Battle of Kousséri', 'Battle of Kousséri', ['bornu-empire', fce], descr='French forces kill Rabih; the al-Kanemi dynasty is restored.'),
        sev('bornu-partitioned', 'Bornu partitioned among the colonial powers', 'Kanem–Bornu Empire', 'incorporated into the French, British, and German colonial empires',
            ['bornu-empire', be, fce]),
        fev('wadai-founded', 'Wadai Sultanate founded', 'Wadai Sultanate', 'year_start', ['wadai-sultanate'], descr='Abd al-Karim overthrows the Tunjur king.'),
        iev('wadai-conquers-bagirmi', 'Wadai conquers Bagirmi', 'Sultanate of Bagirmi', 2, ['wadai-sultanate', 'sultanate-of-bagirmi']),
        iev('bagirmi-french-protectorate', 'Bagirmi becomes a French protectorate', 'Sultanate of Bagirmi', 4, ['sultanate-of-bagirmi', fce]),
        fev('french-conquest-of-wadai', 'French conquest of Wadai', 'Wadai Sultanate', 'year_end', ['wadai-sultanate', 'chad', fce]),
        iev('rabih-deposes-kobur', 'Rabih installs al-Sanusi in Dar al Kuti', 'Dar al Kuti', 1, ['dar-al-kuti']),
        # Chad
        sev('chad-rallies-to-free-france', 'Chad rallies to Free France', 'French Chad', 'the first French colony to rally by the side of Free France', ['chad', fce]),
        fev('chad-independence', 'Independence of Chad', 'Chad', 'established_date2', ['chad', fce], importance=1),
        wev('chadian-civil-war-1965', 'Chadian Civil War (1965–1979)', 'Chadian Civil War (1965–1979)', ['chad'], importance=1),
        wev('toyota-war', 'Toyota War', 'Toyota War', ['chad', 'libya'], descr='Chad drives Libyan forces out of the north.'),
        wev('chadian-civil-war-2005', 'Chadian Civil War (2005–2010)', 'Chadian Civil War (2005–2010)', ['chad']),
        # Central African Republic
        fev('car-independence', 'Independence of the Central African Republic', 'Central African Republic', 'established_date2', ['central-african-republic', fce], importance=1),
        fev('central-african-empire-proclaimed', 'Central African Empire proclaimed', 'Central African Republic', 'established_date3', ['central-african-republic'],
            descr='Jean-Bédel Bokassa declares himself emperor.'),
        fev('bokassa-overthrown', 'Bokassa overthrown', 'Central African Republic', 'established_date5', ['central-african-republic', fce],
            descr='French and Central African forces overthrow Bokassa and restore the republic on 21 September 1979.'),
        wev('central-african-bush-war', 'Central African Bush War', 'Central African Bush War', ['central-african-republic']),
        ongoing(wev('car-civil-war', 'Central African Republic Civil War', 'Central African Republic Civil War', ['central-african-republic'], importance=1)),
        # Cameroon
        wev('cameroonian-independence-war', 'Cameroonian Independence War', 'Cameroonian Independence War', ['cameroon', fce]),
        fev('cameroon-independence', 'Independence of Cameroon', 'Cameroon', 'established_date1', ['cameroon', fce], importance=1),
        fev('cameroon-unitary-state', 'Cameroon becomes a unitary state', 'Cameroon', 'established_date3', ['cameroon'],
            descr='The 1972 referendum ends the federation; the United Republic of Cameroon.'),
        ongoing(wev('anglophone-crisis', 'Anglophone Crisis', 'Anglophone Crisis', ['cameroon'], descr='War over the separatist Ambazonian state in the English-speaking regions.')),
        # Republic of the Congo, Gabon
        sev('congo-independence-1960', 'Independence of the Republic of the Congo', 'Republic of the Congo', 'gained independence from France in 1960',
            ['republic-of-the-congo', fce], k=1, importance=1),
        wev('congo-coup-1968', '1968 Congolese coup', "1968 Republic of the Congo coup d'état", ['republic-of-the-congo']),
        fev('peoples-republic-of-the-congo-founded', "People's Republic of the Congo founded", 'Republic of the Congo', 'established_date6', ['republic-of-the-congo'],
            descr='The first Marxist–Leninist state in Africa.'),
        fev('peoples-republic-of-the-congo-dissolved', "People's Republic of the Congo dissolved", 'Republic of the Congo', 'established_date7', ['republic-of-the-congo']),
        fev('congo-civil-war-1997', 'Republic of the Congo Civil War (1997–1999)', 'Republic of the Congo', 'established_date9', ['republic-of-the-congo'],
            end=F('Republic of the Congo', 'established_date9:last', 'start')[0]['year']),
        fev('gabon-independence', 'Independence of Gabon', 'Gabon', 'established_date4', ['gabon', fce], importance=1),
        wev('gabon-coup-1964', '1964 Gabon coup', "1964 Gabon coup d'état", ['gabon']),
        sev('bongo-in-power', 'Omar Bongo comes to power', 'Gabon', 'Omar Bongo came to office in 1967', ['gabon']),
        wev('gabon-coup-2023', '2023 Gabonese coup', "2023 Gabonese coup d'état", ['gabon'], descr='The army ends the Bongo family\'s rule.'),
        iev('orungu-cession', 'Orungu cedes Cape Lopez to France', 'Kingdom of Orungu', 2, ['kingdom-of-orungu', fce]),
        fev('orungu-monarchy-abolished', 'Orungu monarchy abolished', 'Kingdom of Orungu', 'year_end', ['kingdom-of-orungu', fce]),
        fev('tio-french-protectorate', 'Tio Kingdom becomes a French protectorate', 'Tio Kingdom', 'date_end', ['tio-kingdom', fce]),
        # DR Congo
        fev('congo-free-state-founded', 'Congo Free State founded', 'Congo Free State', 'year_start', ['dr-congo'], importance=1,
            descr='Leopold II of Belgium names his possessions the Congo Free State after the Berlin Conference.'),
        wev('congo-arab-war', 'Congo Arab war', 'Congo Arab war', ['dr-congo']),
        fev('msiri-killed', 'Msiri killed', 'Yeke Kingdom', 'year_end', ['yeke-kingdom', 'dr-congo'], descr='The Yeke king dies on 20 December 1891; Katanga passes to the Free State.'),
        fev('belgian-annexation-of-the-congo', 'Belgium annexes the Congo', 'Belgian Congo', 'year_start', ['dr-congo', 'belgium'], importance=1,
            descr='After the Free State\'s atrocities become an international scandal, Belgium takes over the colony on 15 November 1908.'),
        fev('congolese-independence', 'Independence of the Congo', 'Belgian Congo', 'year_end', ['dr-congo', 'belgium'], importance=1),
        wev('congo-crisis', 'Congo Crisis', 'Congo Crisis', ['dr-congo', 'state-of-katanga', 'south-kasai', 'belgium'], importance=1),
        fev('katanga-secession', 'Katanga secedes', 'State of Katanga', 'year_start', ['state-of-katanga', 'dr-congo']),
        fev('south-kasai-secession', 'South Kasai secedes', 'South Kasai', 'year_start', ['south-kasai', 'dr-congo']),
        iev('south-kasai-coup', 'Coup in South Kasai ends its secession', 'South Kasai', 3, ['south-kasai']),
        wev('operation-grandslam', 'Operation Grandslam', 'Operation Grandslam', ['state-of-katanga', 'dr-congo'], descr='UN forces end the Katangese secession.'),
        fev('mobutu-coup-1965', "Mobutu's coup", 'Zaire', 'year_start', ['dr-congo'], importance=1, descr='Joseph-Désiré Mobutu seizes power on 24 November 1965.'),
        fev('zaire-renamed', 'Congo renamed Zaire', 'Democratic Republic of the Congo', 'established_date7', ['dr-congo']),
        wev('first-congo-war', 'First Congo War', 'First Congo War', ['dr-congo', 'angola'], importance=1, descr='Laurent-Désiré Kabila\'s rebellion overthrows Mobutu.'),
        wev('second-congo-war', 'Second Congo War', 'Second Congo War', ['dr-congo', 'angola', 'chad'], importance=1),
        fev('drc-constitution-2006', 'Congolese constitution of 2006', 'Democratic Republic of the Congo', 'established_date9', ['dr-congo']),
        # Kongo, Ndongo, Kasanje, Mbunda
        wev('battle-of-mbumbi', 'Battle of Mbumbi', 'Battle of Mbumbi', ['kingdom-of-kongo', pe]),
        wev('battle-of-mbanda-kasi', 'Battle of Mbanda Kasi', 'Battle of Mbanda Kasi', ['kingdom-of-kongo', pe]),
        wev('battle-of-mbwila', 'Battle of Mbwila', 'Battle of Mbwila', ['kingdom-of-kongo', pe, 'angola'], importance=1,
            descr='Portuguese Angola defeats Kongo and kills its king; a long civil war follows.'),
        iev('kongo-civil-war', 'Kongo Civil War', 'Kingdom of Kongo', 5, ['kingdom-of-kongo'], descr='Rival claimants divide the kingdom until its reunification in 1709.'),
        wev('battle-of-kitombo', 'Battle of Kitombo', 'Battle of Kitombo', ['kingdom-of-kongo', pe, 'angola']),
        sev('kongo-monarchy-abolished', 'Kongo monarchy abolished', 'Kingdom of Kongo', 'Portugal abolished the titular monarchy', ['kingdom-of-kongo', pe]),
        iev('ndongo-kongo-war', 'Ndongo–Kongo war', 'Kingdom of Ndongo', 1, ['kingdom-of-ndongo', 'kingdom-of-kongo']),
        wev('battle-of-kombi', 'Battle of Kombi', 'Battle of Kombi', ['kingdom-of-ndongo', 'angola', 'dutch-empire']),
        iev('nzinga-treaty', "Queen Nzinga's treaty with Portugal", 'Kingdom of Ndongo', 3, ['kingdom-of-ndongo', pe]),
        fev('ndongo-colonised', 'Portugal colonises Ndongo', 'Kingdom of Ndongo', 'year_end', ['kingdom-of-ndongo', 'angola']),
        fev('kasanje-incorporated', 'Kasanje incorporated into Portuguese Angola', 'Kasanje Kingdom', 'year_end', ['kasanje-kingdom', 'angola']),
        wev('kolongongo-war', 'Kolongongo War', 'Kolongongo War', ['mbunda-kingdom', 'angola']),
        # Equatorial Guinea, São Tomé
        wev('treaty-of-el-pardo-1778', 'Treaty of El Pardo', 'Treaty of El Pardo (1778)', ['equatorial-guinea', pe, 'spanish-empire'],
            descr='Portugal cedes its claims in the Bight of Biafra to Spain.'),
        iev('rio-muni-protectorate', 'Spanish protectorate over Río Muni', 'Spanish Guinea', 3, ['equatorial-guinea', 'spanish-empire']),
        fev('equatorial-guinea-independence', 'Independence of Equatorial Guinea', 'Equatorial Guinea', 'established_date1', ['equatorial-guinea', 'spanish-empire'],
            importance=1),
        wev('equatorial-guinea-coup-1979', '1979 Equatorial Guinea coup', "1979 Equatorial Guinea coup d'état", ['equatorial-guinea'],
            descr='Teodoro Obiang overthrows his uncle Francisco Macías Nguema.'),
    ]
