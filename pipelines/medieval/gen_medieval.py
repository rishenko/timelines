"""
Builds the Medieval World timeline (data-src/medieval.json in the timelines repo), 650-1500 CE.

Format: docs/data-format.md on main (schema v3, PR #19 model): realms are rows with their dynasties as phases,
unions/empires are their own rows with dated `memberOf` on members, lifespans are worked out from phases unless
the row carried on through a gap between them, and `startEvent`/`endEvent` name the events that began and ended
phases, lifespans and memberships.

Every date comes from the offline Wikipedia dump (enwiki-20261101) through wp_states.extract (via the
wp_claims helpers, which refuse missing and AI-flagged articles). Each claim cites the infobox field, section
heading or lead sentence it was read from, and every helper checks the cited text really holds the year.

Seams (brief "Plan"): rows crossing 650 reuse Ancient and Classical ids (eastern-roman); rows crossing 1500 use
Modern States' ids (hre is copied from their row; china, mali-empire, golden-horde, caliphate are told to them).

PILOT (2026-11-21): Byzantine Empire, Caliphate, Holy Roman Empire, Mongol Empire + Golden Horde, Mali Empire, China.

Usage (from the repo, see pipelines/README.md):
       python -I pipelines/medieval/gen_medieval.py [repo] [--data DIR] [--dump NAME]   (repo defaults to this checkout)
Writes data-src/medieval.json and its provenance manifest data-src/provenance/medieval.json; the report goes to
pipelines/out/gen_medieval-report.txt.
Then:  npm run data -- build medieval   (or node scripts/build-dataset.ts data-src/medieval.json public/timelines/medieval.json)
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PIPELINES = os.path.dirname(HERE)
OUT = os.path.join(PIPELINES, 'out')
sys.path[:0] = [HERE, os.path.join(PIPELINES, 'common')]  # this timeline's modules (med_*.py) first
from settings import take_flags  # noqa: E402

ARGS = take_flags(sys.argv[1:]) if __name__ == '__main__' else []
import wp_claims as G  # noqa: E402

REPORT = []


# ---------- claims (each returns a list of claims, best first) ----------

def F(title, spec, side, note=None):
    """An infobox field (or 'seg0.start' style life-span segment), plus the article's other values for that end."""
    cs = G.claims(title, spec, side)[1]
    if note:
        cs[0]['note'] = note
    return cs


def head(title, needle):
    """(start, end) of the section heading containing `needle`, with its ref."""
    for h in G.art(title)['body']['headings']:
        if needle in h['title'] and (h.get('range') or h.get('years')):
            r = h.get('range') or h['years']
            return r[0], r[-1], G.ref(title, f'section "{h["title"]}"')
    raise SystemExit(f'{title}: no heading with {needle!r}')


def H(title, needle, side, note=None):
    s, e, r = head(title, needle)
    c = {'year': s if side == 'start' else e, 'source': r}
    if note:
        c['note'] = note
    return [c]


def basis_ref(title, needle):
    """Ref for the lead sentence or section-opening sentence of `title` containing `needle` (for descriptions)."""
    body = G.art(title)['body']
    for x in body.get('lead', []):
        if needle in x['text']:
            return G.ref(title, f'lead: "{x["text"][:160]}"')
    for o in body.get('section_openers', []):
        if needle in o['text']:
            return G.ref(title, f'section "{o["section"]}": "{o["text"][:160]}"')
    # Kevin (2026-11-22): any sentence of a section, cited by section (wp_sections reads the whole article)
    from wp_sections import find
    hit = find(G.art(title)['title'], needle)
    if hit:
        where, text = hit
        if ' / ' in text:  # a list joined into one "sentence": quote the item that holds the phrase
            text = next((p for p in text.split(' / ') if needle in p), text).strip()
        return G.ref(title, f'lead: "{text[:160]}"' if where == 'lead' else f'section "{where}": "{text[:160]}"')
    raise SystemExit(f'{title}: no sentence with {needle!r}')


def lead(title, needle, year=None):
    """Ref for the lead sentence containing `needle`; checks it names `year`."""
    for s in G.art(title)['body']['lead']:
        if needle in s['text']:
            if year is not None and str(year) not in s['text']:
                raise SystemExit(f'{title}: lead sentence with {needle!r} has no {year}')
            return G.ref(title, f'lead: "{s["text"][:160]}"')
    raise SystemExit(f'{title}: no lead sentence with {needle!r}')


def L(year, title, needle, note=None):
    c = {'year': year, 'source': lead(title, needle, year)}
    if note:
        c['note'] = note
    return [c]


def E(title, n):
    """(years, ref) of an infobox event: n = 1, 2... (date_eventN/eventN), 'start', 'end', 'pre' or 'post'."""
    f = G.art(title)['fields']
    if n in ('start', 'end'):
        dk, ek, yk = f'date_{n}', f'event_{n}', f'year_{n}'
    elif n in ('pre', 'post'):
        dk, ek, yk = f'date_{n}', f'event_{n}', None
    else:
        dk, ek, yk = f'date_event{n}', f'event{n}', None
    d = f.get(dk) or {}
    years = d.get('years') or (f.get(yk) or {}).get('years')
    if not years:
        raise SystemExit(f'{title}: no year for event {n}')
    label = f.get(ek, {}).get('text', '')
    text = d.get('text', '')
    if yk and yk in f and not d.get('years'):
        text = f'{text} {f[yk]["text"]}'.strip()
    return years, G.ref(title, f'infobox {ek}: {label}, {text}'.strip(', '))


def H_ref(title, needle):
    return head(title, needle)[2]


# ---------- rows ----------

def phase(name, sc, ec, *, startEvent=None, endEvent=None, circa=False):
    p = {'name': name, 'start': sc[0]['year'], 'end': max(ec[0]['year'], sc[0]['year'])}
    if circa:
        p['circa'] = True
    p['startDates'] = sc
    p['endDates'] = ec
    if startEvent:
        p['startEvent'] = startEvent
    if endEvent:
        p['endEvent'] = endEvent
    yrs = lambda cs: '/'.join(str(c['year']) for c in cs)  # noqa: E731
    REPORT.append(f'    {name or "(lifespan)":44} {yrs(sc)} – {yrs(ec)}')
    return p


def stretch(sc, ec, **kw):
    p = phase(None, sc, ec, **kw)
    p.pop('name')
    return p


def member(row, sc, ec, *, sources, startEvent=None, endEvent=None, circa=False):
    m = {'row': row, 'start': sc[0]['year'], 'end': ec[0]['year']}
    if circa:
        m['circa'] = True
    m['startDates'] = sc
    m['endDates'] = ec
    m['sources'] = sources
    if startEvent:
        m['startEvent'] = startEvent
    if endEvent:
        m['endEvent'] = endEvent
    REPORT.append(f'    in {row:41} {m["start"]} – {m["end"]}')
    return m


def region(value, *refs):
    return {'facet': 'geography', 'value': value, 'sources': list(refs)}


def row(id_, name, color, parent, url_title=None, *, phases=None, span=None, memberOf=None, regions=None, wikidata=None):
    REPORT.append(f'  {name} ({id_})')
    t = {'id': id_, 'name': name, 'color': color}
    if parent:
        t['parent'] = parent
    if url_title:
        t['url'] = G.WP + G.art(url_title)['title'].replace(' ', '_')
    if wikidata:
        t['ids'] = {'wikidata': wikidata}
    if span:
        t['span'] = span
    if phases:
        t['phases'] = phases
    if memberOf:
        t['memberOf'] = memberOf
    if regions:
        t['memberships'] = regions
    return t


def group(id_, name, color):
    return {'id': id_, 'name': name, 'color': color}


def ev(uuid, title, years, tracks, sources, *, descr='', importance=None, circa=False, links=None):
    start, end = years[0], (years[-1] if len(years) > 1 and years[-1] != years[0] else None)
    e = {'uuid': uuid, 'title': title, 'descr': descr, 'start': start}
    if end is not None:
        e['end'] = end
    if circa:
        e['circa'] = True
    e['tracks'] = tracks
    e['sources'] = sources if isinstance(sources, list) else [sources]
    if importance:
        e['importance'] = importance
    if links:
        e['links'] = links
    return e


# ---------- the pilot ----------

BYZ, LBE, NIC = 'Byzantine Empire', 'List of Byzantine emperors', 'Empire of Nicaea'
RAS, UMA, ABB = 'Rashidun Caliphate', 'Umayyad Caliphate', 'Abbasid Caliphate'
HRE, MON, GH, MALI = 'Holy Roman Empire', 'Mongol Empire', 'Golden Horde', 'Mali Empire'
TANG, WUZ, FIVE, SONG, YUAN, MING = ('Tang dynasty', 'Wu Zhou', 'Five Dynasties and Ten Kingdoms period',
                                    'Song dynasty', 'Yuan dynasty', 'Ming dynasty')


def dyn(name, needle, **kw):
    """A Byzantine dynasty phase from its heading in the List of Byzantine emperors."""
    return phase(name, H(LBE, needle, 'start'), H(LBE, needle, 'end'), **kw)


def tracks():
    return [
        group('europe', 'Europe', '#3f6aa8'),
        row('eastern-roman', 'Byzantine Empire', '#8a3a6a', 'europe', BYZ, wikidata='Q12544',
            # Typed: the empire carried on through the gaps between its dynasty phases (813–820, 1078–1081).
            span=stretch(L(395, LBE, 'following its division in 395')
                         + [{'year': 330, 'source': G.ref(BYZ, 'infobox life span: 330–1453'),
                             'note': 'Counted from the founding of Constantinople, the conventional start.'}],
                         L(1453, BYZ, 'brought the empire to an end') + F(BYZ, 'seg0.end', 'end'),
                         endEvent='fall-of-constantinople'),
            phases=[
                dyn('Heraclian dynasty', 'Heraclian dynasty'),
                dyn("Twenty Years' Anarchy", "Twenty Years' Anarchy"),
                dyn('Isaurian dynasty', 'Isaurian'),
                dyn('Nikephorian dynasty', 'Nikephorian dynasty'),
                dyn('Amorian dynasty', 'Amorian dynasty'),
                dyn('Macedonian dynasty', 'Macedonian dynasty'),
                dyn('Doukas dynasty', 'Doukas dynasty'),
                dyn('Komnenos dynasty', 'Komnenos dynasty'),
                dyn('Angelos dynasty', 'Angelos dynasty', endEvent='sack-of-constantinople'),
                phase('Laskaris dynasty (Empire of Nicaea)',
                      H(LBE, 'Laskaris dynasty', 'start') + F(NIC, 'year_start', 'start', note='The Empire of Nicaea counts from the 1204 sack.'),
                      H(LBE, 'Laskaris dynasty', 'end') + F(NIC, 'year_end', 'end'),
                      startEvent='sack-of-constantinople', endEvent='constantinople-recovered'),
                dyn('Palaiologos dynasty', 'Palaiologos dynasty', endEvent='fall-of-constantinople'),
            ],
            regions=[region('anatolia', lead(NIC, 'Byzantine holdings of northwestern Anatolia'))]),
        row('hre', 'Holy Roman Empire', '#8a6d3b', 'europe', HRE,
            # Copied from Modern States' row (they own it); its end event (1806) lives in their file.
            span=stretch([{'year': 962, 'source': G.ref(HRE, 'infobox date_start: 2 February 962')},
                          {'year': 800, 'source': G.ref(HRE, 'infobox life span: 800/962–1806'),
                           'note': "Counted from Charlemagne's coronation by some historians."}],
                         [{'year': 1806, 'source': G.ref(HRE, 'infobox date_end: 6 August 1806')}],
                         startEvent='otto-crowned'),
            regions=[region('central-europe', lead(HRE, 'much of Central Europe and Western Europe')),
                     region('western-europe', lead(HRE, 'much of Central Europe and Western Europe')),
                     region('italy', lead(HRE, 'three constituent kingdoms'))]),

        group('near-east', 'Near East', '#a8732f'),
        row('caliphate', 'Caliphate', '#2f7d4f', 'near-east', 'Caliphate',
            phases=[
                phase('Rashidun Caliphate', F(RAS, 'year_start', 'start'), F(RAS, 'year_end', 'end'), endEvent='ali-assassinated'),
                phase('Umayyad Caliphate', F(UMA, 'year_start', 'start'), F(UMA, 'year_end', 'end'),
                      startEvent='ali-assassinated', endEvent='abbasid-revolution'),
                phase('Abbasid Caliphate', F(ABB, 'seg0.start', 'start'), F(ABB, 'seg0.end', 'end'),
                      startEvent='abbasid-revolution', endEvent='siege-of-baghdad'),
                phase('Abbasid caliphs in Cairo', F(ABB, 'seg1.start', 'start'), F(ABB, 'seg1.end', 'end'),
                      startEvent='abbasids-in-cairo'),
            ],
            regions=[region('arabia', lead(RAS, 'By the 650s')), region('levant', lead(RAS, 'By the 650s')),
                     region('north-africa', lead(RAS, 'By the 650s')),
                     region('mesopotamia', lead(ABB, 'from their base in Iraq'))]),

        group('steppe', 'Steppe and Central Asia', '#7a6a9a'),
        row('mongol-empire', 'Mongol Empire', '#4a5a8a', 'steppe', MON,
            span=stretch(F(MON, 'seg0.start', 'start'), F(MON, 'seg0.end', 'end'),
                         startEvent='genghis-enthroned', endEvent='fall-of-dadu'),
            regions=[region('mongolian-plateau', lead(MON, 'the Mongol heartland'))]),
        row('golden-horde', 'Golden Horde', '#b08a2a', 'steppe', GH,
            span=stretch(F(GH, 'year_start', 'start'), F(GH, 'year_end', 'end'), circa=True, endEvent='sarai-sacked'),
            memberOf=[member('mongol-empire', F(GH, 'year_start', 'start'), L(1259, GH, 'After the division of the empire'),
                             sources=[lead(GH, 'After the division of the empire', 1259),
                                      G.ref(GH, 'infobox predecessor: Mongol Empire')],
                             circa=True, endEvent='mongke-dies')],
            regions=[region('eastern-europe', lead(MON, 'its rule on Eastern Europe'))]),

        group('east-asia', 'East Asia', '#b0302f'),
        row('china', 'China', '#b0302f', 'east-asia', 'China', wikidata='Q148',
            phases=[
                phase('Tang dynasty', F(TANG, 'seg0.start', 'start'), F(TANG, 'seg0.end', 'end'), endEvent='wu-zhou-proclaimed'),
                phase('Wu Zhou', F(WUZ, 'year_start', 'start'), F(WUZ, 'year_end', 'end'),
                      startEvent='wu-zhou-proclaimed', endEvent='shenlong-coup'),
                phase('Tang dynasty (restored)', F(TANG, 'seg1.start', 'start'), F(TANG, 'seg1.end', 'end'),
                      startEvent='shenlong-coup', endEvent='tang-abdicates'),
                phase('Later Liang', H(FIVE, 'Later Liang', 'start'), H(FIVE, 'Later Liang', 'end'), startEvent='tang-abdicates'),
                phase('Later Tang', H(FIVE, 'Later Tang', 'start'), H(FIVE, 'Later Tang', 'end')),
                phase('Later Jin', H(FIVE, 'Later Jin', 'start'), H(FIVE, 'Later Jin', 'end')),
                phase('Later Han', H(FIVE, 'Later Han', 'start'), H(FIVE, 'Later Han', 'end')),
                phase('Later Zhou', H(FIVE, 'Later Zhou', 'start'), H(FIVE, 'Later Zhou', 'end'), endEvent='song-founded'),
                phase('Northern Song', H(SONG, 'Northern Song', 'start') + F(SONG, 'year_start', 'start'),
                      H(SONG, 'Northern Song', 'end'), startEvent='song-founded', endEvent='jingkang-incident'),
                phase('Southern Song', H(SONG, 'Southern Song', 'start'), H(SONG, 'Southern Song', 'end') + F(SONG, 'year_end', 'end'),
                      startEvent='jingkang-incident', endEvent='battle-of-yamen'),
                phase('Yuan dynasty', F(YUAN, 'year_start', 'start'), F(YUAN, 'year_end', 'end'),
                      startEvent='yuan-proclaimed', endEvent='fall-of-dadu'),
                phase('Ming dynasty', F(MING, 'year_start', 'start'), F(MING, 'year_end', 'end'), startEvent='ming-founded'),
            ],
            regions=[region('china', lead(TANG, 'imperial dynasty of China'))]),

        group('africa', 'Africa', '#9a5a2a'),
        row('mali-empire', 'Mali Empire', '#c08a2a', 'africa', MALI,
            span=stretch(F(MALI, 'year_start', 'start'), F(MALI, 'year_end', 'end'), circa=True, startEvent='conquest-of-sosso'),
            regions=[region('west-africa', lead(MALI, 'an empire in West Africa'))]),
    ]


def events():
    y = lambda t, n: E(t, n)[0]  # noqa: E731
    s = lambda t, n: E(t, n)[1]  # noqa: E731
    return [
        # Byzantine Empire
        ev('africa-lost', 'Africa lost to the Umayyads', y(UMA, 3), ['eastern-roman', 'caliphate'],
           [lead(BYZ, 'In 698, Africa was lost', 698), s(UMA, 3)]),
        ev('sack-of-constantinople', 'Sack of Constantinople (Fourth Crusade)', [1204], ['eastern-roman'],
           lead(BYZ, 'severely fragmented in 1204', 1204), importance=1),
        ev('constantinople-recovered', 'Constantinople recovered', [1261], ['eastern-roman'],
           [lead(BYZ, 'eventual recovery of Constantinople in 1261', 1261), lead(NIC, 'lasted from 1204 to 1261', 1261)]),
        ev('fall-of-constantinople', 'Fall of Constantinople', [1453], ['eastern-roman'],
           lead(BYZ, 'brought the empire to an end', 1453), importance=1),

        # Holy Roman Empire
        ev('charlemagne-crowned', 'Charlemagne crowned emperor', y(HRE, 'pre'), ['hre'],
           [s(HRE, 'pre'), lead(HRE, 'Pope Leo III crowned Charlemagne', 800)]),
        ev('otto-crowned', 'Otto I crowned emperor', y(HRE, 'start'), ['hre'],
           [s(HRE, 'start'), lead(HRE, 'revived again in 962', 962)], importance=1),
        ev('burgundy-incorporated', 'Burgundy joins the empire', y(HRE, 1), ['hre'], s(HRE, 1)),
        ev('golden-bull', 'Golden Bull of 1356', y(HRE, 2), ['hre'], s(HRE, 2)),

        # Caliphate
        ev('conquest-of-persia', 'Conquest of Persia', y(RAS, 1), ['caliphate'],
           [s(RAS, 1), lead(RAS, 'completion of the conquest of Persia in 651', 651)]),
        ev('ali-assassinated', 'Ali assassinated; Mu\'awiya becomes caliph', y(RAS, 'end'), ['caliphate'],
           [s(RAS, 'end'), lead(RAS, "Following Ali's assassination", 661), s(UMA, 'start')], importance=1),
        ev('second-fitna', 'Abd al-Malik wins the Second Fitna', y(UMA, 2), ['caliphate'],
           [s(UMA, 2), lead(UMA, 'after defeating the Zubayrids in 692', 692)]),
        ev('hispania-sindh', 'Conquests of Hispania and Sindh', y(UMA, 4), ['caliphate'], s(UMA, 4)),
        ev('abbasid-revolution', 'Abbasid Revolution', y(UMA, 'end'), ['caliphate'],
           [s(UMA, 'end'), lead(UMA, 'In 750, the Abbasids overthrew', 750), s(ABB, 'start')], importance=1),
        ev('baghdad-founded', 'Founding of Baghdad', y(ABB, 1), ['caliphate'],
           [s(ABB, 1), lead(ABB, 'in 762 the second caliph al-Mansur founded the city of Baghdad', 762)]),
        ev('buyids-take-baghdad', 'Buyids take control of Baghdad', y(ABB, 5), ['caliphate'], s(ABB, 5)),
        ev('seljuks-take-baghdad', 'The Seljuks conquer Baghdad', y(ABB, 6), ['caliphate'], s(ABB, 6)),
        ev('siege-of-baghdad', 'Mongol siege of Baghdad', y(ABB, 8), ['caliphate', 'mongol-empire'],
           [s(ABB, 8), lead(ABB, 'This revival ended in 1258', 1258)], importance=1),
        ev('abbasids-in-cairo', 'Abbasid caliphs re-established in Cairo', y(ABB, 9), ['caliphate'],
           [s(ABB, 9), lead(ABB, 'formally reinstated in 1261', 1261)]),

        # Mongol Empire and the Golden Horde
        ev('genghis-enthroned', 'Genghis Khan enthroned as khagan', [1206], ['mongol-empire'],
           lead(YUAN, "Genghis Khan's enthronement as khagan in 1206", 1206), importance=1),
        ev('mongke-dies', 'Möngke dies; the empire divides', [1259], ['mongol-empire', 'golden-horde'],
           [H_ref(MON, 'Death of Möngke Khan'), lead(GH, 'After the division of the empire', 1259)]),
        ev('toluid-civil-war', 'Toluid Civil War', [1260, 1264], ['mongol-empire'],
           lead(MON, 'Toluid Civil War (1260–1264)', 1260)),
        ev('yuan-proclaimed', 'Kublai proclaims the Great Yuan', y(YUAN, 'start'), ['china', 'mongol-empire'],
           [s(YUAN, 'start'), lead(SONG, 'in 1271 founded the Yuan dynasty', 1271)], importance=1),
        ev('horde-united', 'Blue Horde and White Horde united', y(GH, 1), ['golden-horde'], s(GH, 1)),
        ev('great-stand-ugra', 'Great Stand on the Ugra River', y(GH, 3), ['golden-horde'],
           [s(GH, 3), lead(GH, 'Great Stand on the Ugra River in 1480', 1480)], importance=1),
        ev('sarai-sacked', 'Sack of Sarai by the Crimean Khanate', y(GH, 'end'), ['golden-horde'], s(GH, 'end')),

        # Mali Empire
        ev('conquest-of-sosso', 'Conquest of Sosso', [1235], ['mali-empire'],
           [lead(MALI, 'The conquest of Sosso in c. 1235', 1235), G.ref(MALI, 'infobox event_start: Conquest of Sosso; year_start: c. 1235')],
           circa=True, importance=1),
        ev('sakura-coup', "Sakura's coup", [1285], ['mali-empire'], lead(MALI, 'In 1285, Sakura', 1285)),
        ev('musa-pilgrimage', "Mansa Musa's pilgrimage to Mecca", [1324, 1326], ['mali-empire'],
           lead(MALI, 'He made a famous pilgrimage to Mecca from 1324 to 1326', 1324), importance=1),

        # China
        ev('wu-zhou-proclaimed', 'Wu Zetian proclaims the Zhou dynasty', y(WUZ, 'start'), ['china'],
           [s(WUZ, 'start'), lead(WUZ, 'who usurped the throne of her son', 690)], importance=1),
        ev('shenlong-coup', 'Shenlong Coup restores the Tang', y(WUZ, 'end'), ['china'],
           [s(WUZ, 'end'), lead(WUZ, 'Shenlong Coup in 705', 705)]),
        ev('an-lushan-rebellion', 'An Lushan rebellion', y(TANG, 2), ['china'],
           [s(TANG, 2), lead(TANG, 'The An Lushan rebellion (755–763)', 755)], importance=1),
        ev('huang-chao-rebellion', 'Huang Chao Rebellion', y(TANG, 3), ['china'], s(TANG, 3)),
        ev('tang-abdicates', 'Tang abdicates in favour of Later Liang', y(TANG, 'end'), ['china'],
           [s(TANG, 'end'), lead(FIVE, 'beginning with the fall of the Tang dynasty in 907', 907)]),
        ev('song-founded', 'Song dynasty established', y(SONG, 'start'), ['china'],
           [s(SONG, 'start'), lead(SONG, 'ruled from 960 to 1279', 960)], importance=1),
        ev('chanyuan-treaty', 'Chanyuan Treaty with Liao', y(SONG, 1), ['china'], s(SONG, 1)),
        ev('jingkang-incident', 'Jingkang incident', y(SONG, 3), ['china'],
           [s(SONG, 3), lead(SONG, 'The Southern Song (; 1127–1279)', 1127)]),
        ev('fall-of-linan', "Fall of Lin'an", y(SONG, 5), ['china'], [s(SONG, 5), s(YUAN, 2)]),
        ev('battle-of-yamen', 'Battle of Yamen', y(SONG, 'end'), ['china'],
           [s(SONG, 'end'), s(YUAN, 3), lead(SONG, 'Battle of Yamen', 1279)], importance=1,
           descr="Kublai Khan's armies defeat the Southern Song, ending the dynasty and reuniting China under the Yuan."),
        ev('red-turban-rebellion', 'Red Turban Rebellion', y(YUAN, 4), ['china'], s(YUAN, 4)),
        ev('fall-of-dadu', 'Fall of Dadu', y(YUAN, 'end'), ['china', 'mongol-empire'],
           [s(YUAN, 'end'), lead(MON, 'collapsed after its capital Dadu was taken over by Ming forces', 1368)], importance=1),
        ev('ming-founded', 'Ming dynasty established in Nanjing', y(MING, 'start'), ['china'],
           [s(MING, 'start'), lead(MING, 'ruled from 1368 to 1644', 1368)], importance=1),
        ev('beijing-capital', 'Beijing designated as capital', y(MING, 1), ['china'], s(MING, 1)),
    ]


def build(repo):
    anc = json.load(open(os.path.join(repo, 'public', 'timelines', 'ancient-classical.json'), encoding='utf-8'))
    data = {
        'schemaVersion': 7,  # v7 only adds Era.tracks
        'meta': {
            'id': 'medieval', 'title': 'Medieval World', 'subtitle': 'Europe, Africa, Asia, Oceania and the Americas, 650–1500',
            'description': 'Realms, empires and peoples from 650 to 1500: dynasties as phases, unions and empires as their own rows, and which empire each realm was part of when.',
            'credits': 'Dates from Wikipedia articles, read from the English Wikipedia dump of 1 November 2026; each date cites its infobox field, section or lead sentence. '
                       'Quoted Wikipedia text (the sentences in source locators) stays under CC BY-SA 4.0, attributed through the linked article; everything else in the data is CC BY 4.0. '
                       'Descriptions are written for this project: the build refuses one that shares more than five ordinary words in a row, or 40% of its five-word phrases, with a sentence it cites.',
            'calendar': {'before': 'BCE', 'after': 'CE', 'yearZero': False, 'aliases': {'before': ['BC'], 'after': ['AD']}},
            'increments': [10, 25, 50, 100, 250], 'defaultIncrement': 50,
            'hideRowsOutOfView': True,
            'facets': {'geography': anc['meta']['facets']['geography']},
            'range': {'start': 650, 'end': 1500},
            # Seams (brief, step 5): Ancient and Classical ends at 650, Modern States starts at 1500
            'continues': [{'timeline': 'ancient-classical', 'at': 650, 'side': 'before'},
                          {'timeline': 'modern-states', 'at': 1500, 'side': 'after'}],
        },
        'present': 2026,
    }
    me = sys.modules[__name__]
    pilot = tracks()
    me.PILOT_ROWS = {t['id']: t for t in pilot}
    me.PILOT_EVENTS = events()
    import med_europe as europe
    rows, evs = europe.build(me, repo)
    import med_near_east as near_east
    rows2 = near_east.build(me, repo)
    # Egypt and the Maghreb are built with the Near East but sit under Africa, as its first regions
    # (rows2 lists each parent before its children, so one pass collects their subtrees)
    in_africa = {'africa'}
    rows2_africa, rows2_near_east = [], []
    for t in rows2:
        if t.get('parent') in in_africa:
            in_africa.add(t['id'])
            rows2_africa.append(t)
        else:
            rows2_near_east.append(t)
    rows2 = rows2_near_east
    by_id = {t['id']: t for t in pilot}
    import med_steppe as steppe
    rows3 = steppe.build(me, repo)
    import med_south_asia as south_asia
    rows4 = south_asia.build(me, repo)
    import med_east_asia as east_asia
    rows5 = east_asia.build(me, repo)
    import med_se_asia as se_asia
    rows6 = se_asia.build(me, repo)
    import med_africa as africa
    rows7 = africa.build(me, repo)
    import med_americas as americas
    rows8 = americas.build(me, repo)
    data['tracks'] = [by_id['europe']] + rows + [by_id['near-east']] + rows2 + [by_id['steppe']] + rows3 + rows4 + \
        [by_id['east-asia']] + rows5 + rows6 + [by_id['africa']] + rows2_africa + rows7 + rows8 + \
        [t for t in pilot if t['id'] not in ('europe', 'eastern-roman', 'hre', 'near-east', 'caliphate', 'steppe', 'mongol-empire',
                                             'golden-horde', 'east-asia', 'china', 'africa', 'mali-empire')]
    import med_catchup as catchup
    data['tracks'] = catchup.build(me, data['tracks'])
    # Infobox vs body (Kevin, 2026-11-22): where an article's infobox and its own body give different years for an
    # event, use the body's year (citing the sentence, which must name it) and keep the infobox year as a noted claim.
    body_year = {
        'treaty-of-zamora': (1143, 'Kingdom of Portugal', 'through the Treaty of Zamora',
                             'The infobox gives 5 October 1139; the article body gives 5 October 1143.'),
        'genk-war-begins': (1331, 'Kenmu Restoration', 'Go-Daigo launched the Genkō War in 1331',
                            'The infobox gives 1333; the article lead gives 1331.'),
    }
    for uuid, (year, art, needle, note) in body_year.items():
        e = europe.EVENTS[uuid]
        old, info_ref = e['start'], e['sources'][0]
        from wp_sections import find
        hit = find(G.art(art)['title'], needle)
        if not hit:
            raise SystemExit(f'{uuid}: no sentence with {needle!r} in {art}')
        where, text = hit
        part = next(p for p in text.split(' / ') if needle in p).strip()  # a list item, not the whole list
        if str(year) not in part:
            raise SystemExit(f'{uuid}: the body sentence does not name {year}')
        ref = G.ref(art, f'lead: "{part}"' if where == 'lead' else f'section "{where}": "{part}"')
        e['start'] = year
        e['startDates'] = [{'year': year, 'source': ref}, {'year': old, 'source': info_ref, 'note': note}]
        if ref not in e['sources']:
            e['sources'].append(ref)
        REPORT.append(f'body year: {uuid} {old} -> {year} ({art})')
    # An event moved to its body year no longer marks a phase edge it was linked to by the infobox year: unlink it
    def unlink(t):
        span = t.get('span') or []
        for part in (span if isinstance(span, list) else [span]) + t.get('phases', []) + t.get('memberOf', []):
            for k, edge in (('startEvent', 'start'), ('endEvent', 'end')):
                u = part.get(k)
                if u in body_year and isinstance(part.get(edge), int) and abs(part[edge] - body_year[u][0]) > 1:
                    del part[k]
                    REPORT.append(f'body year: {t["id"]} {part.get("name", "lifespan")} {k} {u} unlinked ({edge} {part[edge]})')
    for t in data['tracks']:
        unlink(t)
    # Descriptions (Kevin: one pass after the last wave; descriptions.json holds the text and the sentences it rests on)
    descs = json.load(open(os.path.join(HERE, 'descriptions.json'), encoding='utf-8'))['events']
    for uuid, dd in descs.items():
        e = europe.EVENTS.get(uuid) or next((x for x in me.PILOT_EVENTS if x['uuid'] == uuid), None)
        if e is None:
            raise SystemExit(f'descriptions: no event {uuid}')
        e['descr'] = dd['descr']
        for art, needle in dd['basis']:
            ref = basis_ref(art, needle)
            if ref not in e['sources']:
                e['sources'].append(ref)
    data['events'] = me.PILOT_EVENTS + [e for e in europe.EVENTS.values() if e not in me.PILOT_EVENTS]
    # golden ages and eras (pipelines/common/periods.py from periods.json): before the sources, which they cite
    import periods
    REPORT.append(f'periods: {periods.apply(data, "medieval")}')
    # Licence option C (Kevin, 2026-11-23): descriptions are this project's own words. Refuse any that shares RUN_LIMIT or more
    # ordinary words in a row, or NGRAM_LIMIT of its five-word phrases, with a Wikipedia sentence it cites (names and numbers
    # don't count; description_check.py). A quoted locator that matches no sentence also stops the build.
    import description_check as DC
    import wp_sections
    wp_titles = {k: v['name'][:-len(' (Wikipedia)')] for k, v in G.SOURCES.items() if v['name'].endswith(' (Wikipedia)')}
    too_close = []
    for e in data['events']:
        if e.get('descr'):
            n, run, share, why = DC.too_close(e['descr'], DC.source_sentences(e, wp_titles, wp_sections.sentences_of))
            if why:
                too_close.append(f'{e["uuid"]}: ' + '; '.join(why))
    if too_close:
        raise SystemExit('descriptions too close to a cited sentence (rewrite them in your own words):\n  ' + '\n  '.join(too_close))
    sys.path.insert(0, os.path.join(HERE, '..', 'v2'))  # v2 emitters: disasters
    import emit_merge
    REPORT.append(emit_merge.merge('disaster', 'medieval', data, G.SOURCES))
    REPORT.append(emit_merge.merge('conflict', 'medieval', data, G.SOURCES))
    data['sources'] = G.SOURCES
    data['tags'] = {'wikipedia': {'name': 'Wikipedia'}}
    if 'cliopatria' in G.SOURCES:
        data['tags']['cliopatria'] = {'name': 'Cliopatria'}
    if any('scholarly' in s.get('tags', []) for s in G.SOURCES.values()):  # scholarly pages (date_rulings.py; traditions)
        data['tags']['scholarly'] = {'name': 'Scholarly pages'}
    # reigns (pipelines/common/reigns.py): the frozen rulers pass; before the categories, so the classifier sees them
    import reigns
    REPORT.append(f'reigns: {reigns.apply(data, os.path.join(HERE, "reigns.json"), os.path.join(repo, "data-src", "provenance", "medieval-reigns.json"))}')
    REPORT.append(f'extra reigns: {reigns.apply(data, os.path.join(HERE, "extra-reigns.json"))}')  # reigns the rulers pass missed (Ahuitzotl)
    # the Kingdom of Italy's kings 774–961 from the King of Italy list page (list_rulers.py --freeze), frozen in italy-reigns.json
    if os.path.exists(os.path.join(HERE, 'italy-reigns.json')):
        REPORT.append(f'italy reigns: {reigns.apply(data, os.path.join(HERE, "italy-reigns.json"))}')
    if any('catalogue' in s.get('tags', []) for s in G.SOURCES.values()):  # catalogue sources (GVP records)
        data['tags']['catalogue'] = {'name': 'Official catalogue'}
    # traditions with no founder (pipelines/common/traditions.py from traditions.json): rows, events and their sources,
    # after the sources are set and before the categories, which classify their events
    import traditions, science  # science: the discoveries pilot (pipelines/common/science.py from science.json): events in the `science` kind, set in categories.json
    REPORT.append(f'traditions: {traditions.apply(data, "medieval")}')
    REPORT.append(f'science: {science.apply(data, "medieval")}')
    # event categories (pipelines/common/event_categories.py): the facet, each event's categories, and their evidence
    import event_categories
    REPORT.append(f'row ids added (R1): {G.fill_wikidata_ids(data["tracks"])}; categories: {event_categories.apply(data, os.path.join(HERE, "categories.json"), os.path.join(repo, "data-src", "provenance", "medieval-categories.json"))}')
    # ids this build no longer has (links that name them still work): the 1356 Golden Bull was listed twice
    data['redirects'] = {'charles-ivs-golden-bull': 'golden-bull'}
    data['redirects'].update(json.load(open(os.path.join(HERE, 'redirects.json'), encoding='utf-8'))['redirects'])  # reigns left out on purpose (reigns-excluded.json), and their sources
    import source_revisions  # every Wikipedia source names the dump and revision it was read from (wave 2 A3)
    REPORT.append(f'source revisions: {source_revisions.apply(data)}')
    data = {k: data[k] for k in ['schemaVersion', 'meta', 'present', 'tracks', 'sources', 'tags', 'events', 'redirects']}
    out = os.path.join(repo, 'data-src', 'medieval.json')
    json.dump(data, open(out, 'w', encoding='utf-8', newline='\n'), indent=2, ensure_ascii=False)
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, 'gen_medieval-report.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(REPORT) + '\n')
    # Provenance (Kevin, 2026-11-21): what this build read, so a later dump or Cliopatria release can be re-checked
    import hashlib
    import med_europe
    import settings
    def sha(path):
        return hashlib.sha256(open(path, 'rb').read()).hexdigest() if os.path.exists(path) else None
    manifest = {
        'output': 'data-src/medieval.json',
        'wikipedia_dump': f'{settings.DUMP_NAME} (read through pipelines/common/wp_dump.py)',
        'cliopatria': {'version': 'v0.2.1', 'zip': 'cliopatria/cliopatria-v0.2.1.zip in the data folder',
                       'sha256': 'e10a4e429fca708788ff9e7572a95fce801fae55852d217cffabc1c59cd4eed4',
                       'summary': 'clio-years.json', 'summary_sha256': sha(os.path.join(HERE, 'clio-years.json'))},
        'modern_states_seam_file': {'commit': med_europe.MODERN_COMMIT, 'file': 'public/timelines/modern-states.json',
                                    'sha256': hashlib.sha256(med_europe.modern_seam_bytes()).hexdigest()},
        'ancient_classical': {'file': 'public/timelines/ancient-classical.json', 'sha256': sha(os.path.join(repo, 'public', 'timelines', 'ancient-classical.json'))},
        'articles': sorted({r['title'] for r in G.CACHE.values()}),
        'redirects': {k: v['title'] for k, v in sorted(G.CACHE.items()) if k != v['title']},
    }
    prov = os.path.join(repo, 'data-src', 'provenance', 'medieval.json')
    os.makedirs(os.path.dirname(prov), exist_ok=True)
    json.dump(manifest, open(prov, 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
    open(prov, 'a', encoding='utf-8', newline='\n').write('\n')
    print('\n'.join(REPORT))
    print('Modern States typed lifespans that can\'t hold Medieval phases:', europe.NEEDS)
    print(f'wrote {out}: {len(data["tracks"])} tracks, {len(data["events"])} events, {len(G.SOURCES)} sources')


if __name__ == '__main__':
    build(ARGS[0] if ARGS else os.path.dirname(PIPELINES))
