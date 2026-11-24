"""
Row pass, rulers (Kevin, 2026-11-22): for each polity row of a timeline, every ruler as a reign span event on that row
("Reign of Louis XIV", 1643-05-14 to 1715-09-01), like Ancient's Reign of Akhenaten. No schema change.

Who: Wikidata finds the rulers. The row's article and its phases' articles give polity items; each polity's "office
held by head of state" (P1906) leads to every person whose "position held" (P39) names that office, with its start/end
qualifiers; the polity's own "head of state" (P35) statements add the rest.
When: the dates are the ruler's own Wikipedia infobox (`reign`, `reign1`… for monarchs; `term_start`/`term_end` for office
holders), cited as such. Wikidata's term is the cross-check: a disagreement is a review flag, never a silent fix.
How visible: all rulers are kept. Importance 2 (normal) goes to the top ~1 per 25 years of the row's span in the window,
ranked by reign length times log inbound links; the rest get 3 (minor, folded into "+N").

    pipelines/extract/.venv/bin/python -I pipelines/extract/rulers.py --timeline modern-states --rows france,spain [--preview]

Writes pipelines/out/rows/<timeline>/: rulers.csv (one row per reign, with flags), rulers-events.json (the events and
their sources, for the build or a generator to apply) and report.md.
Reign marker (Kevin, 2026-11-22): the category sub-kind `reign` (REIGN_CATEGORY), no schema change; the app sorts reigns
to the top of a row's events. Every placed reign also has reign=yes in rulers.csv and its id in rulers-events.json's
`reignIds`. --preview also writes a compiled-ready source copy
of the timeline with the events added (id <timeline>-rulers-pilot) for a local preview; it is never committed.
"""
import csv
import functools
import json
import math
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
import dates  # noqa: E402
import wp_dump  # noqa: E402
from build_index import INFOBOX, braces_end  # noqa: E402
from wd_join import wd_time  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
ACC = '2026-11-21'  # access date of the dump's text, as in common/wp_claims.py
WP = 'https://en.wikipedia.org/wiki/'
REIGN_CATEGORY = 'reign'  # the reign marker: a sub-kind in pipelines/common/event_categories.py VOCAB (Kevin, 2026-11-22)
PER_YEARS = 25  # one visible ruler per 25 years of the row's span (Kevin)
REIGN = re.compile(r'^(reign|term_start|term_end|term)(\d*)$')
LEADER = re.compile(r'^leader\d*$')
RULER_WORD = re.compile(r'\b(king|queen|emperor|empress|tsar|tsaritsa|sultan|shah|caliph|monarch|president|grand prince|'
                        r'grand duke|head of state)', re.I)
TITLE_STEM = re.compile(r'(emir|amir|king|kingd|sult|khan|khag|shah|tsar|czar|empe|empi|caliph|monar|princ|duke|duch|'
                        r'count|lord|presid|repub|realm|crown|sove|regen)', re.I)
# offices that name a president but don't head the state ("President of the Senate of Spain")
NOT_HEAD = re.compile(r'\b(opposition|administration|chief of staff|deputy|vice|prime|premier|senate|congress|cortes|council|(?<!provisional )government|court|assembly|parliament|chamber|minister|duma|'
                      r'soviet of|bank|academy|committee|party|olympic|federation|society|university|advis[eo]r|legislature|secretary|league|youth|non-aligned)', re.I)
MAINT_BOX = re.compile(r'\s*(too large|needed|requested)\b', re.I)  # {{Infobox too large}} and the like
LINK = re.compile(r'\[\[([^|\]#]+)')
JULIAN = 'Q1985786'
# rows whose head-of-state office has no ruler word in its title and no P1906 link from the polity: "Shogun" (Tokugawa
# shogunate's Wikidata head of state names only Ieyasu and Hidetada) and "Pope" (the Medieval Papal States row: the
# Modern row reached every pope through its Vatican City phase). (Timeline, row id) -> Wikipedia article of the office.
HEAD_OFFICES = {('modern-states', 'japan'): ['Shogun'], ('medieval', 'japan'): ['Shogun'], ('medieval', 'papal-states'): ['Pope']}
# an office that is not the head of state (the Emperor was Japan's) is named as itself in the reign's description
OFFICE_NOUN = {r'^sh[oō]gun\b': 'shogun'}
# the list-page route: "List of emperors of the Mughal Empire", "List of doges of Venice", "List of French monarchs"
LIST_NOUNS = ('tlatoque', 'monarchs', 'rulers', 'emperors', 'empresses', 'kings', 'queens', 'sultans', 'shahs', 'tsars', 'doges',
              'caliphs', 'khans', 'khagans', 'pharaohs', 'heads of state', 'presidents', 'grand dukes', 'grand princes',
              'princes', 'dukes', 'emirs', 'beys', 'nawabs', 'maharajas', 'rajas', 'kings and queens', 'consuls', 'tyrants')
# a list's people who aren't its rulers: consorts, regents, ministers, governors, deputies, claimants
NOT_RULER = re.compile(r'\b(consort|regent|regency|vizier|wazir|heir|crown prince|pretender|titular|claimant|governor|'
                       r'viceroy|vice|deputy|acting|chancellor|minister|commander|general|valide|haseki|mother|dowager|tsaritsa|tsarina|'
                       r'disputed|head of the [\w ]*(house|family))\b', re.I)
# A ruler found only through the persons store is held back for review (persons-held.csv, never dropped silently) when the reading rubric
# (coordinator, 2026-11-24) says it is not a ruler of the row: a doubted reign ("alleged", "possibly the Grand Prince"); a consort, designate,
# concubine or empress through marriage; a deputy (naib, vizier) or an acting presiding officer (a Speaker or chairman of a congress who
# held the office of state); an appointed governor or a province under another ruler; a self-proclaimed leader of a revolt; one of several
# rival claimants; a court title (sebastokrator). Usurpers and anti-kings who held power stay, tagged in the flags.
DOUBT = re.compile(r"\b(alleged(ly)?|legendary|semi-legendary|mythical|purported(ly)?|possibly|probably the|believed to (have|be)|"
                   r"historiographical|(was|is) (the )?(wife|consort|spouse)|queen consort|empress consort|designate|"
                   r"co-ruler and wife|wife and co-ruler|(second|first|third) wife|concubine|umm walad|contenders?|"
                   r"self-proclaimed|proclaimed himself|(leader|led) (of )?the [\w ]{0,30}(revolt|rebellion)|"
                   r"(one of|among) (several|four|three|two|many) (rivals|claimants|contenders|pretenders)|vying|rival claimants?|"
                   r"(a|the) province (of|under)|appointed (as )?governor|governor of|naib|vizier|"
                   r"acting (speaker|chairman|chairwoman|chair)|speaker of the|assumed command)\b", re.I)
COURT_TITLE = re.compile(r'\b(sebastokrator|kouropalates|protovestiarios|panhypersebastos|protosebastos|crown prince|heir apparent|prince consort)\b', re.I)
STORE_ONLY = set()  # qids reached only through the persons store (filled by run)
OFFICE_DOUBT = re.compile(r'\b(designate|umm walad|co-empress|consort|concubine|contender|pretender|naib|vakil|deputy|speaker|vizier|governor)\b|'
                          r'chair(man|woman|person)? of the (general |national )?(congress|council|assembly)', re.I)
CONTESTED = re.compile(r'\b(usurper|anti-king|antiking|anti-emperor|antipope|rebel)\b', re.I)
FEMALE_OFFICE = re.compile(r'\b(empress|queen|princess|duchess|countess|lady)\b', re.I)
MARRIAGE = re.compile(r'\b(marriage|married|wife|husband|consort)\b', re.I)
OWN_RIGHT = re.compile(r'\b(regnant|in (her|his) own right|reigned|ruled|regent|sole ruler|sovereign|succeed(ed|ing))\b', re.I)


def held_reason(lead, offices):
    """Why a persons-store ruler is held: the matched words, or None. `offices` are the office texts of its reign candidates."""
    m = DOUBT.search(lead) or next((m for o in offices for m in (COURT_TITLE.search(o), OFFICE_DOUBT.search(o)) if m), None)
    if m:
        return m.group(0)
    if any(FEMALE_OFFICE.search(o) for o in offices) and MARRIAGE.search(lead[:300]) and not OWN_RIGHT.search(lead):
        return 'woman titled by marriage, no reign in her own right'
    return None


def lead_of(text, n=500):
    """The article's lead sentence(s): from the first bolded name, markup stripped."""
    i = text.find("'''")
    t = text[i:i + n * 2] if i >= 0 else text[:n * 2]
    t = re.sub(r'\{\{[^{}]*\}\}|\[\[(?:[^\]|]*\|)?([^\]]*)\]\]|<[^>]+>|\'\'+', lambda m: m.group(1) or '', t)
    return re.sub(r'\s+', ' ', t)[:n]


CONSORTS = re.compile(r'consort|empresses|queens consort|wives|spouses|princesses|duchesses', re.I)  # list pages of consorts, not rulers
LIST_NOUN = re.compile(r'\b(' + '|'.join(LIST_NOUNS) + r')\b', re.I)
# words too common to tie an office to a row ("Emperor of the Holy Roman Empire" isn't Mughal)
GENERIC = {'empire', 'kingdom', 'dynasty', 'republic', 'state', 'states', 'sultanate', 'caliphate', 'principality',
           'duchy', 'grand', 'united', 'federal', 'people', 'peoples', 'democratic', 'socialist', 'soviet', 'first',
           'second', 'third', 'later', 'early', 'late', 'great', 'greater', 'northern', 'southern', 'eastern', 'western',
           'upper', 'lower', 'free', 'royal', 'imperial', 'holy', 'new', 'old', 'restored', 'provisional', 'government',
           'national', 'kingdoms', 'confederation', 'union', 'regime', 'puppet', 'rule', 'under', 'colony', 'colonial',
           'south', 'north', 'east', 'west', 'central'}  # compass words: "Republic of South Peru" isn't UNASUR's "South American"


def to_gregorian(t):
    """A Julian (y, m, d) to the Gregorian date of the same day. Year or month precision is unchanged."""
    if not t or t[2] is None:
        return t
    y, m, d = t
    a = (14 - m) // 12
    yy, mm = y + 4800 - a, m + 12 * a - 3
    jdn = d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - 32083
    a = jdn + 32044
    b = (4 * a + 3) // 146097
    c = a - 146097 * b // 4
    dd = (4 * c + 3) // 1461
    e = c - 1461 * dd // 4
    mo = (5 * e + 2) // 153
    return (100 * b + dd - 4800 + mo // 10, mo + 3 - 12 * (mo // 10), e - (153 * mo + 2) // 5 + 1)


def to_julian(t):
    """A proleptic-Gregorian (y, m, d) to the Julian date of the same day. Year or month precision is unchanged."""
    if not t or t[2] is None:
        return t
    y, m, d = t
    a = (14 - m) // 12
    yy, mm = y + 4800 - a, m + 12 * a - 3
    jdn = d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045
    c = jdn + 32082
    dd = (4 * c + 3) // 1461
    e = c - 1461 * dd // 4
    mo = (5 * e + 2) // 153
    return (dd - 4800 + mo // 10, mo + 3 - 12 * (mo // 10), e - (153 * mo + 2) // 5 + 1)


def flag(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def _wd_str(t):
    """A Wikidata time string ('+1520-00-00T00:00:00Z') as a (y, m, d) tuple, the precision read from its zeros; None for no value."""
    if not t:
        return None
    y, m, d = t.lstrip('+-').split('T')[0].split('-')
    return wd_time(t, 11 if int(d) else 10 if int(m) else 9)


def title_of(url):
    return url.rsplit('/wiki/', 1)[-1].replace('_', ' ') if url and '/wiki/' in url else None


# ---- Wikipedia side ----

def infobox_params(text):
    """{field: raw} of the first infobox's top-level parameters (lowercased names). Maintenance tags named like an
    infobox ({{Infobox too large}} on Kangxi Emperor) are skipped."""
    import mwparserfromhell
    m = next((m for m in INFOBOX.finditer(text or '') if not MAINT_BOX.match(m.group(1))), None)
    if not m:
        return {}
    try:
        tpl = mwparserfromhell.parse(text[m.start():braces_end(text, m.start())]).filter_templates(recursive=False)
    except Exception:  # malformed wikitext
        return {}
    return {str(p.name).strip().lower(): str(p.value).strip() for p in tpl[0].params} if tpl else {}


SEAT_KEYS = ('state', 'district', 'constituency')


def term_offices(params):
    """{N: office text} for each term_startN: officeN, orderN or titleN, carried down to the later terms until the
    next one (Charles Dupuy: order = Prime Minister covers terms 1–3, order4 = Acting President covers 4–6)."""
    num = lambda k: int(k) if k else 0
    out, cur = {}, ''
    for n in sorted({REIGN.match(k).group(2) for k in params if REIGN.match(k)}, key=num):
        own = next((params[f'{w}{n}'] for w in ('office', 'order', 'title') if params.get(f'{w}{n}')), None)
        if own is None and n and any(params.get(f'{w}{n}') for w in SEAT_KEYS):
            # a term with a state, district or constituency and no office of its own is a legislative seat (Jackson's
            # Senate terms under "President of the United States"), not the office carried down from above
            out[n] = 'Legislative seat: ' + dates.clean(next(params[f'{w}{n}'] for w in SEAT_KEYS if params.get(f'{w}{n}')))
            continue
        cur = own or cur
        out[n] = cur
    return out


def wp_reigns(params):
    """[(field, span, succession text)] from reign/reignN, or term_startN + term_endN, of one infobox."""
    out = []
    offices = term_offices(params)
    for k, raw in params.items():
        m = REIGN.match(k)
        if not m or not raw:
            continue
        kind, n = m.groups()
        if kind == 'reign':
            rtype = dates.clean(params.get(f'reign_type{n}', ''))
            if re.search(r'\b(caesar|heir|junior|crown|designate|co-?(?:emperor|king|ruler)|subking|regent)\b', rtype, re.I):
                continue  # a span the infobox types as Caesar, heir, junior or co-ruler (Constantius Chlorus 293-305) is not the ruler's own reign
            for s in dates.spans(raw, legacy=True):
                out.append((k, s, dates.clean(params.get(f'succession{n}') or (params.get('succession', '') if n in ('', '1') else ''))))  # reign1 may be paired with an unnumbered |succession=
        elif kind == 'term':
            # a short term written whole: |term = {{Date range|1881|03|04|1881|09|19}} (Garfield, W. H. Harrison)
            for s in dates.spans(raw, legacy=True)[:1]:
                out.append((k, s, dates.clean(offices.get(n, ''))))
        elif kind == 'term_start':
            st = dates.spans(raw, legacy=True)
            en = dates.spans(params.get(f'term_end{n}', ''), legacy=True) if params.get(f'term_end{n}') else []
            if st:
                s = dict(st[0])
                s['end'] = en[0]['start'] if en else None
                s['text'] = f"{st[0]['text']} – {en[0]['text'] if en else ''}".strip(' –')
                s['old_style'] = st[0]['old_style'] or bool(en and en[0]['old_style'])
                out.append((f'term_start{n}', s, dates.clean(offices.get(n, ''))))
    return out


# ---- list-page rows: the citation for a ruler whose own article is AI-flagged ----

LIFE = re.compile(r'\((?:born|b\.|d\.|died)?\s*c?\.?\s*\d{1,4}\s*(?:BCE?|AD|CE)?\s*[–-]?\s*(?:\d{1,4}\s*(?:BCE?|AD|CE)?)?\)', re.I)
ONGOING = re.compile(r'\b(incumbent|present|ongoing|to date)\b', re.I)
START_P = re.compile(r'^(?:term_?start|reign_?start|reignstart|start|took_office|from)$')
END_P = re.compile(r'^(?:term_?end|reign_?end|reignend|end|left_office|to|until)$')


def _points(cells):
    """Date points of a row's cells in order: a range gives its start and end, "Incumbent" gives None."""
    out = []
    for c in cells:
        txt = re.sub(r'<br\s*/?>', ' ', c, flags=re.I)
        plain = dates.clean(txt)
        plain = LIFE.sub(' ', plain)
        sp = dates.spans(plain, legacy=True)
        for s in sp:
            out.append((s['start'], s))
            if s['end']:
                out.append((s['end'], s))
        if not sp and ONGOING.search(plain):
            out.append((None, None))
    return out


def list_rows(text, person):
    """[(points, quote)] for each table row or officeholder template on a page that links `person`: the date points
    after the person's link, in order."""
    out = []
    link = re.compile(r'\[\[\s*' + re.escape(person) + r'\s*(?:\||\]\])')
    for tbl in re.findall(r'\{\|.*?\|\}', text, re.S):
        for row in re.split(r'\n\|-[^\n]*', tbl)[1:]:
            m = link.search(row)
            if not m:
                continue
            cells = [c for c in re.split(r'\n[|!]|\|\||!!', '\n' + row[m.start():].strip()) if c.strip()]
            cells[0] = cells[0].split(']]', 1)[-1]  # the name cell after the link (Peru: "(born 1962)<br>7 December 2022")
            cells = [re.sub(r'^[^|\[\]{}]*?(?:style|rowspan|colspan|align|bgcolor)\s*=[^|]*\|', '', c) for c in cells]
            pts = _points(cells)
            if pts:
                out.append((pts, re.sub(r'\s+', ' ', dates.clean(row[m.start():]))[:200]))
    import mwparserfromhell
    for m in link.finditer(text):  # template rows: {{Officeholder table|officeholder=[[X]]|term_start=…}}, nameN/reignstartN
        s = text.rfind('{{', 0, m.start())
        while s >= 0 and braces_end(text, s) <= m.start():  # the template that encloses the link, not a closed {{lang}}
            s = text.rfind('{{', 0, s)
        if s < 0:
            continue  # the link isn't inside a template
        try:
            tpl = mwparserfromhell.parse(text[s:braces_end(text, s)]).filter_templates(recursive=False)[0]
        except Exception:
            continue
        params = {str(p.name).strip().lower(): str(p.value) for p in tpl.params}
        key = next((k for k, v in params.items() if link.search(v)), None)
        if key is None:
            continue
        n = re.search(r'(\d*)$', key).group(1)
        base = lambda k: k[:-len(n)] if n and k.endswith(n) else (k if not n else None)
        st = [v for k, v in params.items() if base(k) and START_P.match(base(k))]
        en = [v for k, v in params.items() if base(k) and END_P.match(base(k))]
        if st:
            pts = _points(st[:1]) + (_points(en[:1]) or [(None, None)])
            quote = f"{tpl.name.strip()}: {dates.clean(st[0]).strip()} – {dates.clean(en[0]).strip() if en else ''}"
            out.append((pts, re.sub(r'\s+', ' ', quote)[:200]))
    return out


INTERREGNUM = re.compile(r'\binterregnum\b', re.I)


def interregna(text):
    """[(start, end, quote)] for each list-page row that names an interregnum (a table row or a numbered template
    field): its first date range. Kevin approved labelled interregnums where a source names one (2026-11-23)."""
    out = []
    for tbl in re.findall(r'\{\|.*?\|\}', text, re.S):
        for row in re.split(r'\n\|-[^\n]*', tbl)[1:]:
            m = INTERREGNUM.search(row)
            if m and '[[' not in row[:m.start()]:  # the row is the interregnum, not a king's note ("Interregnum until 1447")
                cells = [re.sub(r'^[^|\[\]{}]*?(?:style|rowspan|colspan|align|bgcolor)\s*=[^|]*\|', '', c)
                         for c in re.split(r'\n[|!]|\|\||!!', '\n' + row.strip()) if c.strip()]
                pts = [p for p, _ in _points(cells)]
                if pts and pts[0]:
                    out.append((pts[0], pts[1] if len(pts) > 1 else None, re.sub(r'\s+', ' ', dates.clean(row))[:200]))
    for m in re.finditer(r'^(=+)([^=\n]*\binterregnum\b[^=\n]*)\1\s*$', text, re.I | re.M):  # ==First Interregnum (1649–1660)==
        sp = dates.spans(dates.clean(m.group(2)), legacy=True)
        if sp and sp[0]['end']:
            out.append((sp[0]['start'], sp[0]['end'], m.group(2).strip()[:200]))
    for m in re.finditer(r'\|\s*(?:name|officeholder)(\d*)\s*=[^|]*?interregnum', text, re.I):  # {{List of rulers|nameN=''Interregnum''}}
        n = m.group(1)
        st = re.search(r'\|\s*(?:reignstart|term_start|start)' + n + r'\s*=([^|\n]*)', text[m.end():m.end() + 2000])
        en = re.search(r'\|\s*(?:reignend|term_end|end)' + n + r'\s*=([^|\n]*)', text[m.end():m.end() + 2000])
        a = _points([st.group(1)]) if st else []
        b = _points([en.group(1)]) if en else []
        if a and a[0][0]:
            out.append((a[0][0], b[0][0] if b else None, re.sub(r'\s+', ' ', f"Interregnum: {dates.clean(st.group(1)).strip()} – "
                                                                           f"{dates.clean(en.group(1)).strip() if en else ''}")[:200]))
    return list(dict.fromkeys(out))


def resource(sel, person, pages, row_stems):
    """A list-page span for one reign whose own article is AI-flagged. `sel` is the article's span, used only to find
    the matching row (never cited). The page's title names the row; the row starts in the article's start year and
    ends within a year of its end (or both are open); an exact start, then an exact end, wins. (title, span) or None."""
    best = None
    for lt in pages:
        if not any(st in lt.lower() for st in row_stems):  # the page names the row (not UNASUR's presidents on Peru)
            continue
        pg = page_of(lt)
        if not pg or wp_dump.ai_flagged(pg['text']):
            continue
        for pts, quote in list_rows(pg['text'], person):
            for i, (p, s) in enumerate(pts):
                if not p or p[0] != sel['start'][0]:  # the article's start year (Bhutan's list: 21 July 1972, the article 24 July)
                    continue
                end = pts[i + 1][0] if i + 1 < len(pts) else None
                if end and days(end) < days(p):
                    continue
                # the end agrees within a year, or both are open (Tokayev's row has no end; its party years aren't one)
                if (end is None) != (sel['end'] is None) or (end and abs(end[0] - sel['end'][0]) > 1):
                    continue
                prec = sum(x is not None for x in p) + sum(x is not None for x in (end or ()))
                score = (same(p, sel['start']), end is None or same(end, sel['end']), prec)
                if not best or score > best[0]:
                    span = {'start': p, 'end': end, 'text': quote, 'old_style': bool(s and s['old_style']),
                            'precision': s['precision'] if s else 'year'}
                    best = (score, (pg['title'], span))
    return best[1] if best else None


# ---- Wikidata side ----

@functools.lru_cache(maxsize=8192)
def page_of(title):
    return wp_dump.page(title)


def stems(words):
    """Distinctive row words, cut to a stem so "Ethiopian" matches "Emperor of Ethiopia"."""
    return {w[:max(4, len(w) - 3)] for w in words if w not in GENERIC}


class Sources:
    def __init__(self, data):
        self.wd = sqlite3.connect(f'file:{os.path.join(data, "wikidata", "wikidata-20261116.sqlite")}?mode=ro', uri=True)
        self.wp = sqlite3.connect(f'file:{os.path.join(data, "wikipedia", "extract-enwiki-20261101.sqlite")}?mode=ro', uri=True)
        # per row (reset by rulers()): {person: {offices}} reached as holders of a polity's office (P1906, or a P35
        # naming an office), {office: {holders}}, and the people a polity's P35 names directly (George V on Ghana)
        self.by_office, self.office_holders, self.named = {}, {}, set()
        self._concurrent = {}  # office -> most holders at once (concurrent())

    offices = None  # wikidata-<dump>-offices.sqlite (wd_office_labels.py): the office items wd_item leaves out, by English label

    def _offices(self):
        if self.offices is None:
            path = os.path.join(os.path.dirname(self.wd.execute('PRAGMA database_list').fetchone()[2]), 'wikidata-20261116-offices.sqlite')
            self.offices = sqlite3.connect(f'file:{path}?mode=ro', uri=True) if os.path.exists(path) else False
        return self.offices

    def _persons(self):
        """wikidata-<dump>-persons.sqlite (wd_person_labels.py): every human with an English article, which wd_item leaves out when the
        person has no time claim or non-P31 link (Paullu Inca, Túpac Amaru, the presidents of Panama). Read-only; False when absent."""
        if getattr(self, 'persons', None) is None:
            if os.environ.get('NO_PERSONS_STORE'):  # a run without the store, for a before/after count
                self.persons = False
                return False
            path = os.path.join(os.path.dirname(self.wd.execute('PRAGMA database_list').fetchone()[2]), 'wikidata-20261116-persons.sqlite')
            self.persons = sqlite3.connect(f'file:{path}?mode=ro', uri=True) if os.path.exists(path) else False
        return self.persons

    def has_item(self, title):
        return bool(self.wd.execute('SELECT 1 FROM wd_item WHERE enwiki=?', (title,)).fetchone())

    def qid(self, title, persons=False):
        """`persons`: also look in the persons store (a list page's link to a ruler the shared store dropped). Only the list route asks:
        the polities, leaders and phase windows must not change because the store holds more humans (it dropped 15 Aksum kings by
        giving a list its subject word from a newly found person's succession link)."""
        r = self.wd.execute('SELECT qid FROM wd_item WHERE enwiki=?', (title,)).fetchone()
        if r:
            return r[0]
        o = self._offices()  # an office without an item row: "Monarch of Italy" by its article title or English label
        # by the article title; by the English label only when it has two or more words ("Monarch of Italy"), never a generic one ("king", "regent")
        r = o.execute('SELECT qid FROM wd_office WHERE enwiki=? OR (label=? COLLATE NOCASE AND instr(label, " ") > 0) LIMIT 1', (title, title)).fetchone() if o else None
        if r:
            return r[0]
        pp = self._persons() if persons else False  # a person without an item row, by the article title only
        r = pp.execute('SELECT qid FROM wd_person WHERE enwiki=? LIMIT 1', (title,)).fetchone() if pp else None
        return r[0] if r else None

    def title(self, qid):
        r = self.wd.execute('SELECT enwiki FROM wd_item WHERE qid=?', (qid,)).fetchone()
        if r:
            return r[0]
        o = self._offices()
        r = o.execute('SELECT COALESCE(enwiki, label) FROM wd_office WHERE qid=?', (qid,)).fetchone() if o else None
        if r:
            return r[0]
        pp = self._persons()
        r = pp.execute('SELECT enwiki FROM wd_person WHERE qid=?', (qid,)).fetchone() if pp else None
        return r[0] if r else None

    def inlinks(self, title):
        r = self.wp.execute('SELECT n FROM inlink WHERE title=?', (title,)).fetchone()
        return r[0] if r else 0

    def terms(self, sid):
        # Julian-model values are mixed in the dump: some are the Julian date as written (Henry II of France, 1547-03-31;
        # Catherine the Great, 1762-06-28 where Wikipedia gives 9 July New Style), others its Gregorian twin under the
        # Julian label (Francis II, 1559-07-20 for 10 July). Keep the other readings beside the value.
        q = {qp: (wd_time(t, p), (to_julian(wd_time(t, p)), to_gregorian(wd_time(t, p))) if cal == JULIAN else None)
             for qp, t, p, cal in self.wd.execute('SELECT qprop, time, precision, calendar FROM wd_qual WHERE sid=?', (sid,))
             if p and p >= 9} if sid else {}
        return q.get('P580', (None, None))[0], q.get('P582', (None, None))[0], q.get('P580', (None, None))[1], q.get('P582', (None, None))[1]

    def p39_terms(self, person):
        """Every position-held term of one person, to cross-check a reign found through a list page."""
        out = [self.terms(sid) + (f'P39 {office}',) for sid, office in
               self.wd.execute("SELECT sid, target FROM wd_link WHERE prop='P39' AND rank != 'deprecated' AND qid=?", (person,))]
        if not out:  # a person from the persons store: its terms as Wikidata writes the time strings (no qualifier table)
            pp = self._persons()
            r = pp.execute('SELECT p39 FROM wd_person WHERE qid=?', (person,)).fetchone() if pp else None
            for office, a, b in (json.loads(r[0]) if r and r[0] else []):
                out.append((_wd_str(a), _wd_str(b), None, None, f'P39 {office}'))
        return out

    def list_pages(self, names):
        """{list page title: name it was found by} for "List of <noun> of <name>" titles that exist (redirects followed)."""
        cands = {}
        for n in names:
            for noun in LIST_NOUNS:
                for t in (f'List of {noun} of {n}', f'List of {noun} of the {n}'):
                    cands[t] = n
        out = {}
        keys = list(cands)
        for i in range(0, len(keys), 500):
            part = keys[i:i + 500]
            for title, red in self.wp.execute(f"SELECT title, redirect_to FROM page WHERE ns=0 AND title IN ({','.join('?' * len(part))})", part):
                out.setdefault((red or title).split('#')[0], cands[title])
        return out

    def holders(self, offices):
        """{person qid: [terms]} of everyone whose position held (P39) names one of the offices."""
        out = {}
        if offices:
            oh = ','.join('?' * len(offices))
            for person, sid, office in self.wd.execute(
                    f"SELECT qid, sid, target FROM wd_link WHERE prop='P39' AND rank != 'deprecated' AND target IN ({oh})", list(offices)):
                out.setdefault(person, []).append(self.terms(sid) + (f'P39 {office}',))
        return out

    def offices_of(self, people, words):
        """Head-of-state offices the people held, by title: a ruler's word and one of the row's words ("Tsar of all
        Russia"). One hop, for polities whose items lack P1906 (Tsardom of Russia)."""
        ph = ','.join('?' * len(people))
        out = set()
        for (o,) in self.wd.execute(f"SELECT DISTINCT target FROM wd_link WHERE prop='P39' AND qid IN ({ph})", list(people)):
            t = (self.title(o) or '').lower()
            # whole row words, generic ones skipped: not "south" (UNASUR on Peru) or "states" (US presidents on Micronesia);
            # not stems, which widen "Japanese" to "Emperor of Japan" on Korea
            if RULER_WORD.search(t) and not NOT_HEAD.search(t) and any(w in t for w in words if w not in GENERIC):
                out.add(o)
        return out

    def concurrent(self, office):
        """Most holders of an office at once, by their dated P39 terms (day resolution): a real office has one at a
        time, with an acting or rival holder (Pope, President of the United States: 2); a general title has many
        ("king": 8, "emir": 6, "Monarch": 4)."""
        if office not in self._concurrent:
            ev = []
            for (sid,) in self.wd.execute("SELECT sid FROM wd_link WHERE prop='P39' AND target=? AND sid IS NOT NULL", (office,)):
                t0, t1 = self.terms(sid)[:2]
                if t0:
                    ev.append((days(t0), days(t1) if t1 else days(t0)))
            self._concurrent[office] = max((sum(a <= x <= b for a, b in ev) for x in {a for a, _ in ev}), default=0)
        return self._concurrent[office]

    def rulers(self, polity_qids, via):
        """{person qid: [(start, end, how)]} from P1906 offices' holders and the polities' own P35. `via` gets
        {person: {polity qids that led to them}}, so a reign can be kept to that polity's phase."""
        out = {}
        self.by_office, self.office_holders, self.named = {}, {}, set()
        ph = ','.join('?' * len(polity_qids))
        office_of = {}
        for polity, office in self.wd.execute(f"SELECT DISTINCT qid, target FROM wd_link WHERE prop='P1906' AND qid IN ({ph})", polity_qids):
            office_of.setdefault(office, set()).add(polity)
        p35 = list(self.wd.execute(f"SELECT qid, target, sid FROM wd_link WHERE prop='P35' AND rank != 'deprecated' AND qid IN ({ph})", polity_qids))
        for polity, target, sid in p35:  # a P35 that names the office, not a person (Republic of Venice: Doge of Venice)
            if self.wd.execute("SELECT 1 FROM wd_link WHERE prop='P39' AND target=? LIMIT 1", (target,)).fetchone():
                office_of.setdefault(target, set()).add(polity)
        if office_of:
            oh = ','.join('?' * len(office_of))
            for person, sid, office in self.wd.execute(
                    f"SELECT qid, sid, target FROM wd_link WHERE prop='P39' AND rank != 'deprecated' AND target IN ({oh})", list(office_of)):
                out.setdefault(person, []).append(self.terms(sid) + (f'P39 {office}',))
                via.setdefault(person, set()).update(office_of[office])
                self.by_office.setdefault(person, set()).add(office)
                self.office_holders.setdefault(office, set()).add(person)
        for polity, person, sid in p35:
            if person not in office_of:
                out.setdefault(person, []).append(self.terms(sid) + (f'P35 of {polity}',))
                via.setdefault(person, set()).add(polity)
                self.named.add(person)
        return out


# ---- matching and scoring ----

def year(t):
    return t[0] if t else None


def overlap(a0, a1, b0, b1):
    """Years two spans share (an open end runs to b1 or a1); negative when apart."""
    a1 = a1 if a1 is not None else a0
    b1 = b1 if b1 is not None else b0
    return min(a1, b1) - max(a0, b0)


def same(a, b):
    """Two (y, m, d) agree at the coarser precision of the two."""
    if a is None or b is None:
        return a is b
    n = min(sum(x is not None for x in a), sum(x is not None for x in b))
    return a[:n] == b[:n]


def merge_terms(terms):
    """A person's back-to-back terms of one office as one (Louis XIII: 1610–1617 under regency, 1617–1643 in
    Wikidata). Two offices stay apart (Napoleon III: President 1848–1852, then Emperor 1852–1870)."""
    out = []
    for t in sorted((t for t in terms if t[0]), key=lambda t: tuple(x or 0 for x in t[0])):
        if out and out[-1][1] and same(out[-1][1], t[0]) and out[-1][4] == t[4]:
            out[-1] = (out[-1][0], t[1], out[-1][2], t[3], out[-1][4])
        else:
            out.append(t)
    return out + [t for t in terms if not t[0]]


def agrees(st, en, term, terms):
    """The Wikipedia span agrees with the chosen Wikidata term, reading a Julian-model value either way."""
    full = next(t for t in terms if t[0] == term[0] and t[1] == term[1])
    ok_s = same(st, full[0]) or any(same(st, x) for x in full[2] or ())
    ok_e = same(en, full[1]) or any(same(en, x) for x in full[3] or ())
    # a title change: the term runs on, back to back, in another office (Louis XVI: King of France to 4 September
    # 1791, then King of the French to 1792)
    cur, seen = full, set()
    while not ok_e and cur[1] and id(cur) not in seen:
        seen.add(id(cur))
        cur = next((t for t in terms if t[0] and same(t[0], cur[1]) and t is not cur), None)
        if not cur:
            break
        ok_e = same(en, cur[1])
    cur, seen = full, set()
    while not ok_s and cur[0] and id(cur) not in seen:
        seen.add(id(cur))
        cur = next((t for t in terms if t[1] and same(t[1], cur[0]) and t is not cur), None)
        if not cur:
            break
        ok_s = same(st, cur[0])
    return ok_s and ok_e


def same_office(st, en, term, w1):
    """The Wikidata claim describes this reign, not another office the person held: the two share at least half of
    the longer one (Mercedes Aráoz: a one-day interim presidency inside a four-year vice-presidency is not)."""
    end = lambda t, s: days(t) if t else days((w1, 12, 31)) if s else None
    a0, a1, b0, b1 = days(st), end(en, True), days(term[0]), end(term[1], True)
    if None in (a0, b0):
        return True
    return (min(a1, b1) - max(a0, b0)) >= 0.5 * max(a1 - a0, b1 - b0, 1)


def days(t):
    return t[0] * 372 + (t[1] or 1) * 31 + (t[2] or 1) if t else None


def picks(spans, terms, words, window=None):
    """Every Wikipedia span for this row: the closest to each Wikidata term, plus the person's other spans for the same
    office (Philip V of Spain's two reigns, 1700–1724 and 1724–1746)."""
    out = []
    for t in [t for t in terms if t[0]] or [None]:
        g = pick(spans, [t] if t else [], words, window)
        if g and all(g[1] is not o[1] for o in out):
            out.append(g)
    offices = {norm(o[2]) for o in out if o[2]}
    for f, s, succ in spans:  # a ruler's office only (not Wickremesinghe's four terms as Leader of the Opposition)
        if succ and norm(succ) in offices and (f.startswith('reign') or RULER_WORD.search(succ)) and all(s is not o[1] for o in out):
            out.append((f, s, succ, None))
    # the same polity under another title (Prince then King of Montenegro; Duke then King of Bohemia): its ruler spans are reigns of the row too
    for f, s, succ in spans:
        if f.startswith('reign') and (RULER_WORD.search(succ) or re.search(r'\b(prince|duke|voivode|vojvoda|khan|emir|doge|lord|margrave|count|elector)\b', succ, re.I)) \
                and not NOT_RULER.search(succ) and not re.search(r'\b(heir|crown|co-|junior|designate|elect|claimant|pretender|regent|titular|nominal)', succ, re.I) \
                and any(len(w) >= 5 and w in re.sub(r'\([^)]*\)', ' ', succ).lower() for w in words) \
                and all(s is not o[1] for o in out):
            out.append((f, s, succ, None))
    seen, uniq = set(), []
    for g in out:  # one reign once: two joins (same office, same polity) can take the same field's span twice
        key = (g[0], g[1]['start'], g[1]['end'])
        if key not in seen:
            seen.add(key)
            uniq.append(g)
    return uniq


ORDINAL = re.compile(r'\(?\b(?:\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth)\s+(?:reign|term|tenure|rule)\)?', re.I)


def norm(succ):
    """An office text without its ordinal ("Prince of Wallachia ; (2nd reign)" is "prince of wallachia"), so a ruler's reign2, reign3... join his reign."""
    return re.sub(r'\W+', ' ', ORDINAL.sub(' ', succ.lower())).strip()


def pick(spans, terms, words, window=None):
    """The Wikipedia span for this row: the one overlapping a Wikidata term most, else one whose succession names the
    row, else the only one. (field, span, succession, term) or None."""
    best = None
    for f, s, succ in spans:
        for t0, t1, *_ in terms:
            if t0 and overlap(s['start'][0], year(s['end']), t0[0], year(t1)) >= 0:
                # closest match, not widest overlap (Alain Poher: a 24-year Senate term beside a 2-month acting presidency)
                score = -abs(days(s['start']) - days(t0)) - (abs(days(s['end']) - days(t1)) if s['end'] and t1 else 0)
                if not best or score > best[0]:
                    best = (score, (f, s, succ, (t0, t1)))
    if best:
        return best[1]
    named = [x for x in spans if any(w in re.sub(r'\([^)]*\)', ' ', x[2]).lower() for w in words)]  # a bracket ("vassal of Bohemia") names the suzerain, not the office
    if len(named) == 1 or (len(spans) == 1):
        f, s, succ = (named or spans)[0]
        return f, s, succ, None
    stem = [x for x in spans if any(len(w) >= 5 and any(tok[:4] == w[:4] for tok in re.findall(r'[a-z]{4,}', x[2].lower())) for w in words)]
    if len(stem) == 1:  # the office is kin to the row's name ("King of the Franks" on Francia), not the same word
        f, s, succ = stem[0]
        return f, s, succ, None
    if window:  # no Wikidata term and several spans (Gaozu of Tang: the Duke of Tang's 572–617 beside his reign): the one inside the row's window
        inside = [x for x in (named or spans) if overlap(x[1]['start'][0], year(x[1]['end']), window[0], window[1]) >= 0]
        if inside:  # several: a ruler's own office first (not "Duke of Tang" or "Retired Emperor"), then the earliest; picks() adds the same office's other spans
            own = [x for x in inside if RULER_WORD.search(x[2]) and not re.search(r'\b(retired|former|duke|prince|regent|crown|consort|co-|junior|heir|designate|titular|nominal|claimant|pretender)', x[2], re.I)]
            f, s, succ = min(own or inside, key=lambda x: days(x[1]['start']))
            return f, s, succ, None
    return None


def hist(v):
    """A timeline file's year (an astronomical number, or readable text such as "c. 3300 BCE" / "650 CE") as the
    historical year this script works in (1 BC = -1)."""
    if isinstance(v, str):
        n = int(re.sub(r'\D', '', v))
        return -n if re.search(r'\b(BCE|BC)\b', v) else n
    return v - 1 if v is not None and v <= 0 else v


def date_fields(prefix, t):
    d = {prefix: dates.astro(t[0])}  # the timelines store astronomical years (44 BC -> -43)
    if t[1]:
        d[prefix + 'Month'] = t[1]
    if t[2]:
        d[prefix + 'Day'] = t[2]
    return d


def fmt(t):
    months = 'January February March April May June July August September October November December'.split()
    if not t:
        return ''
    y = f'{-t[0]} BCE' if t[0] < 0 else str(t[0])
    return ' '.join(x for x in (str(t[2]) if t[2] else '', months[t[1] - 1] if t[1] else '', y) if x)


# ---- the pass ----

def run(timeline, row_ids, src):
    ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json')))
    w0, w1 = hist(ds['meta']['range']['start']), hist(ds['meta']['range']['end'])
    tracks = {t['id']: t for t in ds['tracks']}
    existing = {e['title'].lower(): e['uuid'] for e in ds['events']}
    rows, events, sources = [], {}, {}
    gathered = []  # (rid, r0, r1, found): ranked after every row is gathered, so a reign two rows share is placed once
    for rid in row_ids:
        tr = tracks[rid]
        titles = [title_of(tr.get('url'))]
        phase_win = {}  # title -> the phase spans it dates; the row's own article -> None (the whole row)
        for p in tr.get('phases', []):
            for d in p.get('startDates', []) + p.get('endDates', []):
                t = title_of(ds['sources'].get(d['source']['sourceKey'], {}).get('url'))
                titles.append(t)
                phase_win.setdefault(t, []).append((hist(p['start']), hist(p.get('end', w1))))
        phase_win[titles[0]] = None
        titles = [t for t in dict.fromkeys(titles) if t]
        polities = [q for q in (src.qid(t) for t in titles) if q]
        polity_win = {src.qid(t): w for t, w in phase_win.items() if t and src.qid(t)}
        # phases, else the lifespan: one stretch or a list of stretches (Mughal Empire: the 1540–1555 interregnum)
        span = tr.get('span') or {'start': w0, 'end': w1}  # a row with neither: the timeline's window
        stretches = tr.get('phases') or (span if isinstance(span, list) else [span])
        spans = [(hist(p['start']), hist(p.get('end', w1))) for p in stretches]
        r0, r1 = max(w0, min(s for s, _ in spans)), min(w1, max(e for _, e in spans))
        words = {w.lower() for w in [tr['name']] + [p['name'] for p in tr.get('phases', [])] for w in re.findall(r'[A-Z][a-z]{3,}', w)}
        found = []
        via = {}
        ruled = src.rulers(polities, via)
        leaders = set()  # named in a state infobox's leader fields
        for t in titles:  # Wikipedia's route: the state infoboxes' leader1, leader2… (Bourbon Restoration, July Monarchy)
            pg = page_of(t)
            for k, raw in infobox_params(pg['text'] if pg else '').items():
                if LEADER.match(k):
                    for target in LINK.findall(raw):
                        q = src.qid(target.strip())
                        if q:
                            ruled.setdefault(q, [])
                            via.setdefault(q, set()).add(src.qid(t))
                            leaders.add(q)
        # one hop by the row's words ("Tsar of all Russia"); such an office belongs to a phase whose name is in its
        # title ("President of the Republic of China" -> the Republic of China phase, 1912-1949), else to the whole row
        for o in src.offices_of(list(ruled), words):
            ot = (src.title(o) or '').lower()
            polity_win[('office', o)] = [(hist(p['start']), hist(p.get('end', w1))) for p in tr.get('phases', []) if p['name'].lower() in ot] or None
        for title in HEAD_OFFICES.get((timeline, rid), ()):  # named offices (see HEAD_OFFICES): the whole row
            o = src.qid(title)
            if o:
                polity_win[('office', o)] = None
        for person, terms in src.holders([k[1] for k in polity_win if isinstance(k, tuple)]).items():
            ruled.setdefault(person, []).extend(t for t in terms if t not in ruled[person])
            via.setdefault(person, set()).update(('office', t[-1].split(' ', 1)[1]) for t in terms)
        # list pages: "List of <noun> of <row, phase or their article>", and the `succession` links of rulers already
        # found ([[List of emperors of the Mughal Empire|Mughal emperor]] on Babur); a list found through a phase, or
        # through a ruler kept to a phase, belongs to that phase
        pnames = {p['name']: [(hist(p['start']), hist(p.get('end', w1)))] for p in tr.get('phases', [])}
        lists, subject = {}, {}  # list title -> window; -> the name its office text must carry
        for lt, n in src.list_pages([tr['name']] + list(pnames) + titles).items():
            w = pnames.get(n) or phase_win.get(n)
            lists[lt] = None if n in (tr['name'], titles[0]) or w is None else w
            subject[lt] = n
        for person in list(ruled):
            pg = page_of(src.title(person) or '')
            pw = None if not via.get(person) or not all(polity_win.get(q) for q in via[person]) else [w for q in via[person] for w in polity_win[q]]
            for k, raw in infobox_params(pg['text'] if pg else '').items():
                # only a succession that names this row: Christian II's "King of Sweden" doesn't give Denmark Sweden's list
                if k.startswith('succession') and any(st in dates.clean(raw).lower() for st in stems(words)):
                    for target in LINK.findall(raw):
                        lt = (page_of(target.strip()) or {}).get('title', '')
                        if lt.startswith('List of') and LIST_NOUN.search(lt.split(' of ')[1]):  # not "List of governors-general of Taiwan"
                            lists[lt] = None if lists.get(lt, 0) is None or pw is None else (lists.get(lt) or []) + pw
                            subject.setdefault(lt, target.split(' of ', 2)[-1] if target.count(' of ') >= 2 else tr['name'])
        row_stems = stems(words)
        list_only, list_stems, store_only = set(), {}, set()
        for lt, w in lists.items():
            polity_win[('list', lt)] = w
            list_stems.setdefault(lt, stems({x.lower() for x in re.findall(r'[A-Za-z]{4,}', subject.get(lt, tr['name']))}) or row_stems)
            pg = page_of(lt)
            for target in dict.fromkeys(LINK.findall(pg['text'] if pg else '')):
                target = target.strip()
                if ':' in target or target.startswith('List of') or re.match(r'^\d', target):
                    continue
                q = src.qid(target, persons=True)
                if not q:
                    q = src.qid((page_of(target) or {}).get('title', ''), persons=True)
                if not q:
                    continue
                # a consort's own reign (an empress's, a queen consort's "reign" field) is not the row's ruler: a list of consorts
                # gives no one that the shared store already knew, and the persons store would add them all
                if CONSORTS.search(lt) and not src.has_item((src.title(q) or '')):
                    continue
                if q not in ruled:
                    ruled[q] = src.p39_terms(q)
                    list_only.add(q)
                    if not src.qid(target) and not src.qid((page_of(target) or {}).get('title', '')):
                        store_only.add(q)
                        STORE_ONLY.add(q)
                via.setdefault(q, set()).add(('list', lt))
        # interregnums a list page names: intermediate output only (no event yet), one CSV row each, the list as source
        for lt in lists:
            pg = page_of(lt)
            if not pg or wp_dump.ai_flagged(pg['text']):
                continue
            for a, b, quote in interregna(pg['text']):
                if overlap(a[0], year(b), r0, r1) >= 0:
                    rows.append(dict(row=rid, person='Interregnum', qid='', start=fmt(a), end=fmt(b) if b else '', field='interregnum',
                                     quote=quote, wd='', importance='', flags='interregnum: named on a list page',
                                     route=f'list: {lt}', cited=lt))
        # a polity's office can be a generic title ("Monarch", "king", "prince", "emir" as the Kingdom of Bosnia's, Arab
        # Syria's, Catalonia's or Afghanistan's head of state), whose holders are every king anywhere. An office is real
        # when at least a quarter of its holders also reach the row another way (US presidents through their list), or
        # when no more than two of its dated holders ever overlap (popes, Xiongnu chanyus); the rest are checked one by
        # one below
        other = {p for p in ruled if p in leaders or p in src.named or any(not isinstance(q, str) for q in via.get(p, ()))}
        real = {o for o, hs in src.office_holders.items() if len(hs & other) >= 0.25 * len(hs) or src.concurrent(o) <= 2}
        for person, terms in ruled.items():
            terms = merge_terms(list(dict.fromkeys(terms)))
            name = src.title(person)
            if not name:
                continue
            page = page_of(name)
            flags = []
            if not page:
                continue
            ai = wp_dump.ai_flagged(page['text'])
            # a span whose own office text is a non-head office (Franco as head of government) isn't a reign
            cand = [x for x in wp_reigns(infobox_params(page['text'])) if not NOT_HEAD.search(x[2])]
            if person in list_only:  # reached only through list pages: a ruler's office that names the list's subject
                need = set().union(*(list_stems[q[1]] for q in via[person] if isinstance(q, tuple) and q[0] == 'list'))
                cand = [x for x in cand if any(st in x[2].lower() for st in need) and not NOT_RULER.search(x[2])
                        and (x[0].startswith('reign') or RULER_WORD.search(x[2]))]
                if not cand:
                    continue
                # cross-check only against the offices that name the list's subject (Christian X as King of Iceland, not
                # his Danish term); none: nothing to check against, rather than a false disagreement
                terms = [t for t in terms if any(st in (src.title(t[-1].split(' ', 1)[1]) or '').lower() for st in need)]
            if person in store_only:  # found only through the persons store: held for review when the article doubts the reign
                lead = lead_of(page['text'])
                why = held_reason(lead, [x[2] for x in cand])
                if why:
                    rows.append(dict(row=rid, person=name, qid=person, start='', end='', field='held', quote=lead[:200], wd='', importance='',
                                     flags=f'held (persons store): "{why}"', route='persons store'))
                    continue
                if CONTESTED.search(lead):
                    flags.append(f'persons store: contested ("{CONTESTED.search(lead).group(0)}")')
            got = picks(cand, terms, words, (r0, r1))
            dated = [t for t in terms if t[0]]
            if not got:
                if dated and any(overlap(t[0][0], year(t[1]), r0, r1) >= 0 for t in dated):
                    t0, t1 = dated[0][:2]
                    rows.append(dict(row=rid, person=name, qid=person, start=fmt(t0), end=fmt(t1), field='', quote='',
                                     wd=f'{fmt(t0)} – {fmt(t1)}', importance='', flags='no Wikipedia reign: not placed'))
                continue
            # a ruler reached only through a phase's polity is kept to that phase (Taiwan's presidents hold the office
            # of the Republic of China, which is a 1912–1949 phase of the China row)
            wins = None
            if via.get(person) and all(polity_win.get(q) for q in via[person]):
                wins = [w for q in via[person] for w in polity_win[q]]
            route = '; '.join(sorted(('list: ' + q[1]) if isinstance(q, tuple) and q[0] == 'list' else ('office: ' + (src.title(q[1]) or q[1]))
                                     if isinstance(q, tuple) else ('row words' if q is None else 'polity: ' + (src.title(q) or q)) for q in via.get(person, ())))
            # reached only through a generic office: the ruler's office or article must name the row (Gongyang of Goryeo
            # on Bosnia is a "Monarch" holder, nothing more)
            generic = person in src.by_office and person not in other and not src.by_office[person] & real
            if generic:
                # the row's and phases' names, not the polity's title, and no title words: "Emirate of Afghanistan" is a
                # phase, and "emir" would pass every Emir of Bukhara
                names = {st for st in row_stems if not TITLE_STEM.match(st)}
                # the polity's and the phases' articles, not the row's own: every Afghan cleric's article links Afghanistan
                arts = {t.lower() for t in titles[1:]} | {(src.title(q) or '').lower() for q in via[person]}
                # the article links a phase's article or the polity's, or the infobox's office fields link a
                # page named for the row ([[Governor-General of India|Governor-General of the Presidency of Fort William]])
                offices = {x.strip().lower() for k, raw in infobox_params(page['text']).items()
                           if k.startswith(('office', 'succession', 'title', 'order')) for x in LINK.findall(raw)}
                linked = bool(arts & {x.strip().lower() for x in LINK.findall(page['text'])}) \
                    or any(st in x for x in offices for st in names)
            for field, s, succ, term in got:
                cite = None
                if generic and not linked and not any(st in succ.lower() for st in names):
                    if overlap(s['start'][0], year(s['end']), r0, r1) >= 0:
                        rows.append(dict(row=rid, person=name, qid=person, start=fmt(s['start']), end=fmt(s['end']), field=field,
                                         quote='', wd='', importance='', flags="generic office: the polity's head-of-state title "
                                         "is a general one, and neither this ruler's office nor article names the row"))
                    continue
                if ai:  # never cite the article: take the term from a list page's row (the row's lists, then the pages
                    # its succession/office fields link to, used as navigation only), else leave it unplaced
                    nav = [(page_of(x.strip()) or {}).get('title') for k, raw in infobox_params(page['text']).items()
                           if k.startswith(('succession', 'office')) for x in LINK.findall(raw)]
                    hit = resource(s, name, list(dict.fromkeys([*lists, *(t for t in nav if t)])), row_stems)
                    if not hit:
                        if overlap(s['start'][0], year(s['end']), r0, r1) >= 0:
                            rows.append(dict(row=rid, person=name, qid=person, start=fmt(s['start']), end=fmt(s['end']), field=field,
                                             quote='', wd='', importance='', flags='AI-flagged article: not usable; no list-page row'))
                        continue
                    cite, s = hit
                    field = 'list row'
                place(rid, name, person, field, s, succ, term, terms, list(flags), r0, r1, wins, w1, src, rows, found, route, cite)
        gathered.append((rid, r0, r1, found))
    # a reign found on two rows stays only where it falls inside the phase that led to it (Taiwan's presidents: the
    # Taiwan row's Republic of China phase, not the China row's 1912-1949 one); a reign outside its phase with no
    # other row claiming it stays (Philip II reaches Spain through the Crown of Castile, whose office outlived the phase)
    homes = {}
    for _, _, _, found in gathered:
        for r in found:
            homes.setdefault((r['qid'], r['st']), []).append(r)
    for same in homes.values():
        if any(r['in_phase'] for r in same) and not all(r['in_phase'] for r in same):
            for r in same:
                r['drop'] = not r['in_phase']
    rows_of = {}
    for rid, _, _, found in gathered:
        for r in found:
            rows_of.setdefault(r['qid'], set()).add(rid)
    for rid, r0, r1, found in gathered:
        for r in found:  # a persons-store ruler placed on more than one row is held: the copies are another row's ruler
            if r.get('store') and len(rows_of[r['qid']]) > 1:
                r['drop'] = True
                rows.append(dict(row=rid, person=r['person'], qid=r['qid'], start=fmt(r['st']), end=fmt(r['en']), field='held', quote=r['quote'][:200],
                                 wd='', importance='', flags=f"held (persons store): on {len(rows_of[r['qid']])} rows ({', '.join(sorted(rows_of[r['qid']]))})", route='persons store'))
        found[:] = [r for r in found if not (r.get('store') and len(rows_of[r['qid']]) > 1)]
        for r in found:
            if r.get('drop'):
                others = sorted({x['row'] for x in homes[(r['qid'], r['st'])] if x['in_phase']})
                rows.append(dict(row=rid, person=r['person'], qid=r['qid'], start=fmt(r['st']), end=fmt(r['en']), field=r['field'],
                                 quote=r['quote'], wd=r['wd'], importance='', flags=f"outside its phase here; placed on {', '.join(others)}"))
        found[:] = [r for r in found if not r.get('drop')]
        finish(rid, r0, r1, found, rows, events, sources, tracks, existing, w1)
    return ds, rows, list(events.values()), sources, (w0, w1)


def place(rid, name, person, field, s, succ, term, terms, flags, r0, r1, wins, w1, src, rows, found, route='', cite=None):
    """One reign span: flags, or a candidate for the row. `wins`: the phase spans that led to this ruler (None: the
    whole row)."""
    st, en = s['start'], s['end']
    if overlap(st[0], year(en), r0, r1) < 0:
        return  # outside the row's span in this timeline's window
    in_phase = wins is None or any(overlap(st[0], year(en), a, b) >= 0 for a, b in wins)
    if term and not same_office(st, en, term, w1):
        term = None  # another office's claim (Napoleon III's presidency beside his reign as Emperor): nothing to check
    if term and not agrees(st, en, term, terms + src.p39_terms(person)):
        flags.append(f'Wikidata differs: {fmt(term[0])} – {fmt(term[1])}')
    if not term:
        flags.append('no Wikidata term to check')
    if s['old_style']:
        flags.append('Old Style date as written')
    yrs = max(1, (year(en) or w1) - st[0])
    found.append(dict(row=rid, person=name, qid=person, st=st, en=en, field=field, quote=s['text'], succ=succ, cite=cite,
                      office=field.startswith('term'), score=yrs * math.log10(src.inlinks(name) + 10), flags=flags, in_phase=in_phase, route=route, store=person in STORE_ONLY,
                      wd=f'{fmt(term[0])} – {fmt(term[1])}' if term else ''))


def finish(rid, r0, r1, found, rows, events, sources, tracks, existing, w1):
    """Rank the row's reigns (top ~1 per 25 years visible) and turn them into events."""
    # the same reign reached by two routes, or one person's overlapping spans (Franco: two head-of-state fields):
    # keep the one that matched a Wikidata term, else the longer
    found.sort(key=lambda r: (not r['wd'], -((year(r['en']) or w1) - r['st'][0])))
    kept = []
    for r in found:
        if not any(k['person'] == r['person'] and overlap(k['st'][0], year(k['en']) or w1, r['st'][0], year(r['en']) or w1) > 0
                   for k in kept):
            kept.append(r)
    found[:] = kept
    found.sort(key=lambda r: tuple(x or 0 for x in r['st']))
    visible = math.ceil(max(1, r1 - r0) / PER_YEARS)
    top = {id(r) for r in sorted(found, key=lambda r: -r['score'])[:visible]}
    for r in found:
        imp = 2 if id(r) in top else 3
        noun = 'Presidency' if r['office'] else 'Reign'
        title = f"{noun} of {r['person']}"
        uid = 'reign-' + slug(r['person'])
        n = 2
        while uid in events and events[uid]['tracks'] != [rid]:
            uid, n = f"reign-{slug(r['person'])}-{n}", n + 1
        if uid in events:  # the same person again on this row (two or more reigns): the later one gets its year
            base, n = f"{uid}-{abs(dates.astro(r['st'][0]))}", 2
            uid = base
            while uid in events:
                uid, n = f"{base}-{n}", n + 1
        page = r.get('cite') or r['person']  # a list page when the person's own article is AI-flagged
        key = 'wp-' + slug(page)
        sources[key] = {'name': f"{page} (Wikipedia)", 'url': WP + page.replace(' ', '_'), 'accessed': ACC,
                        'tags': ['wikipedia']}
        loc = f"table row: {r['quote']}" if r.get('cite') else f"infobox {r['field']}: {r['quote']}"
        yrs = year(r['en']) - r['st'][0] if r['en'] else 0  # no end read: the length is unknown
        noun = next((n for pat, n in OFFICE_NOUN.items() if isinstance(r.get('succ'), str) and re.search(pat, r['succ'], re.I)), None)
        descr = (f"{'Holds office' if r['office'] else 'Rules'} as {noun or 'head of state of ' + tracks[rid]['name']}"
                 f" from {fmt(r['st'])}{' to ' + fmt(r['en']) if r['en'] else ''}"
                 f"{f' ({yrs} years)' if yrs >= 2 else ''}.")
        ev = {'uuid': uid, 'title': title, **date_fields('start', r['st']), **(date_fields('end', r['en']) if r['en'] else {}),
              'tracks': [rid], 'descr': descr, 'sources': [{'sourceKey': key, 'sourceLocation': loc}], 'importance': imp,
              'memberships': [{'facet': 'category', 'value': REIGN_CATEGORY, 'sources': [{'sourceKey': key, 'sourceLocation': loc}]}]}
        if r['en'] is None:
            ev.pop('end', None)
        events[uid] = ev
        if title.lower() in existing:
            r['flags'].append(f"timeline already has {existing[title.lower()]}")
        rows.append(dict(row=rid, person=r['person'], qid=r['qid'], start=fmt(r['st']), end=fmt(r['en']), field=r['field'],
                         quote=r['quote'], wd=r['wd'], importance=imp, flags='; '.join(r['flags']), uuid=uid, reign='yes', route=r['route'], office=r['succ'], cited=page))


def main():
    timeline = flag('--timeline', 'modern-states')
    row_ids = flag('--rows', '').split(',')
    if row_ids == ['all']:  # every polity row: a row with its own article (groups have none)
        row_ids = [t['id'] for t in json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json')))['tracks'] if t.get('url')]
    out = flag('--out') or os.path.join(ROOT, 'pipelines', 'out', 'rows', timeline)
    os.makedirs(out, exist_ok=True)
    ds, rows, events, sources, win = run(timeline, row_ids, Sources(settings.DATA))
    cols = ['row', 'person', 'qid', 'start', 'end', 'importance', 'reign', 'field', 'office', 'quote', 'wd', 'flags', 'route', 'cited', 'uuid']
    with open(os.path.join(out, 'rulers.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, cols, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    held = [r for r in rows if r.get('field') == 'held']
    if held:
        with open(os.path.join(out, 'persons-held.csv'), 'w', newline='') as f:
            w = csv.DictWriter(f, ['row', 'person', 'qid', 'flags', 'quote'], extrasaction='ignore')
            w.writeheader()
            w.writerows(held)
    json.dump({'reignIds': [e['uuid'] for e in events], 'events': events, 'sources': sources}, open(os.path.join(out, 'rulers-events.json'), 'w'), indent=1, ensure_ascii=False)
    md = [f'# Rulers pass: {timeline} ({", ".join(row_ids)})', '',
          f'Window {win[0]}–{win[1]}; one visible ruler (importance 2) per {PER_YEARS} years of each row; the rest importance 3.', '',
          '| Row | Placed | Visible | Wikidata differs | No Wikidata term | Not placed (no Wikipedia reign) | Already on the timeline |',
          '|---|---|---|---|---|---|---|']
    for rid in row_ids:
        rr = [r for r in rows if r['row'] == rid]
        placed = [r for r in rr if r.get('uuid')]
        md.append(f"| {rid} | {len(placed)} | {sum(r['importance'] == 2 for r in placed)} | "
                  f"{sum('Wikidata differs' in r['flags'] for r in placed)} | {sum('no Wikidata term' in r['flags'] for r in placed)} | "
                  f"{sum('not placed' in r['flags'] for r in rr)} | {sum('already has' in r['flags'] for r in placed)} |")
    md += ['', '## Review flags', ''] + [f"- {r['row']} · {r['person']} ({r['start']} – {r['end']}): {r['flags']}" for r in rows if r['flags']]
    open(os.path.join(out, 'report.md'), 'w').write('\n'.join(md) + '\n')
    if '--preview' in ARGS:
        pv = dict(ds)
        pv['meta'] = dict(ds['meta'], id=f'{timeline}-rulers-pilot', title=f"{ds['meta']['title']} (rulers pilot)")
        pv['sources'] = {**ds['sources'], **{k: v for k, v in sources.items() if k not in ds['sources']}}
        ids = {e['uuid'] for e in ds['events']}
        pv['events'] = ds['events'] + [e for e in events if e['uuid'] not in ids]
        json.dump(pv, open(os.path.join(out, f'{timeline}-rulers-pilot.src.json'), 'w'), ensure_ascii=False)
    print(f"{len(events)} reign events on {len(row_ids)} rows, {sum(1 for r in rows if r['flags'])} flagged -> {out}")


if __name__ == '__main__':
    main()
