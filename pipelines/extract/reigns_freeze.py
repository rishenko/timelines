"""
Freezes a reviewed rulers bulk run into the claims file a timeline's build merges (pipelines/common/reigns.py).

    pipelines/extract/.venv/bin/python -I pipelines/extract/reigns_freeze.py --timeline modern-states --dir pipelines/out/rows/bulk5/modern-states

Kept: every placed reign, except (Kevin, 2026-11-23)
  - "Ruled from another row" (rulers_review.from_elsewhere): the empire's row carries the reign; the colony's phase or
    membership shows who ruled it. This also drops an empire's monarch on its own empire row (Juan Carlos I on the
    Spanish Empire);
  - a reign the timeline already has: an event on the same row whose title names the ruler and whose dates cover at
    least half of the reign (Attila rules the Huns, Reign of Darius I). The existing event stays as it is, with its
    uuid and importance (the pinned key reigns of Ancient and Classical are such events).
A reign with no end read: `ongoing` when Wikidata's term is open too (an incumbent); dropped when Wikidata gives a
term of over a year (the end was lost); else kept as one year. Both kept kinds are marked to check.
Each kept reign's review entry carries its "to check" reasons (rulers_review.check_reasons), recorded in
data-src/provenance/<id>-reigns.json for later review.

Equality (Kevin, 2026-11-23: data protection): reigns.json records the hashes of its inputs. A freeze of the same inputs
must reproduce the file byte for byte (else it stops); a freeze of different inputs (a refresh from a newer bulk run or
dump) stops unless --update, which records the new hashes. --check freezes without writing.

Writes pipelines/<generator>/reigns.json and prints the counts (reigns, to check, dropped by reason, pinned matched).
"""
import csv
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE]
import rulers as RU  # noqa: E402
import rulers_review as RR  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = {'modern-states': 'modern-states', 'medieval': 'medieval', 'ancient-classical': 'ancient'}
NAME_SKIP = {'the', 'of', 'king', 'queen', 'emperor', 'empress', 'sultan', 'shah', 'pope', 'saint', 'great', 'first',
             'second', 'third', 'elder', 'younger', 'prince', 'princess', 'duke', 'tsar', 'khan', 'caliph', 'reign',
             'rules', 'ruler', 'presidency', 'president', 'von', 'van', 'de', 'del', 'da', 'di', 'la', 'le', 'and', 'ibn', 'bin'}


REIGN_WORDS = re.compile(r'\b(reign|reigns|rule|rules|ruled|presidency|pontificate|regency|term|tenure)\b')

NON_HEAD = re.compile(r'\b(bundesrat|senate|chamber|house of|parliament|assembly|congress|supreme court|constitutional court|'
                      r'reichstag|landtag|ministry|kgb|navy|command|pioneer|mayor|vice|deputy|speaker|committee|senator|commissar)\b'
                      r'|^(full )?member\b|^list\b', re.I)
MONARCH = re.compile(r'\b(king|queen|emperor|empress|sultan|sultana|khan|khagan|qaghan|shah|shahanshah|tsar|czar|emir|caliph|'
                     r'prince|princess|duke|archduke|doge|basileus|mansa|sapa inca|tlatoani|imam|lord|count|raja|rajah|maharaja|'
                     r'pharaoh|negus|sovereign|monarch|ruler|voivode|hetman|grand master|chief|bey|dey|sheikh|sharif|nawab|nizam|'
                     r'zamindar|shogun|shōgun|tairō|kampaku|sessho|daimyo|despot|exarch|mikado|tenno|datu|sultanate|margrave|landgrave|elector|doge|stadtholder|khedive|mwami|'
                     r'susuhunan|tayiji|hakim|wali|wāli|ao o le malo|mehtar|rana|peshwa|protector)\b', re.I)
ACTING = re.compile(r'^(acting|interim|provisional)\b|\(acting\)', re.I)


_BOX = {}


def term_label(article, field):
    """The office the infobox names for a numbered term (term_start2 -> office2, carried down), or ''. A person's
    other offices sit in the same infobox (Jackson as Senator 1797-98), and the bulk run matched them to the row by the
    words of the polity's name ("United States Senator"); the label shows which office the term is."""
    import wp_dump
    if article not in _BOX:
        pg = wp_dump.page(article)
        _BOX[article] = RU.term_offices(RU.infobox_params(pg['text'])) if pg else {}
    return RU.dates.clean(_BOX[article].get(field.replace('term_start', ''), ''))


def office_noun(office):
    """The word for a term, from the office's class: "Presidency", "Pontificate", "Regency", "Reign"; None when the
    office is none of those (listed for review). An acting or interim holder gets "Acting …"."""
    if not office:
        return 'Reign', False
    o = office.lower()
    if re.search(r'\bpresident|presidium|presidency', o):
        noun = 'Presidency'
    elif re.search(r'\b(pope|bishop of rome|pontiff)\b', o):
        noun = 'Pontificate'
    elif re.search(r'\bregent\b|\bregency\b', o):
        noun = 'Regency'
    elif MONARCH.search(o):
        noun = 'Reign'
    else:
        return 'Tenure', True
    return ('Acting ' + noun.lower() if ACTING.search(office) else noun), False


def partial_name_match(office, row_name):
    """True when a row word is in the office label only inside another word ("Syria" in "Governor of Syriam"); a
    plural or adjective ending (Vandal/Vandals, Latvia/Latvian) is the same word."""
    ws = [w for w in re.findall(r'[^\W\d_]{3,}', row_name.lower()) if w not in RU.GENERIC]
    o = office.lower()
    hit = False
    for w in ws:
        if re.search(r'\b' + re.escape(w) + r'(s|n|ns|ic|ian)?\b', o):
            return False
        if w in o:
            hit = True
    return hit


CLAIMS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reigns-claims.json')))
CLAIM_UUIDS = {}  # uuid -> timeline, for the category pins below
EXCLUDED = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reigns-excluded.json')))


def flag(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def span(e):
    a = RR.hist(e['start'])
    return a, RR.hist(e['end']) if e.get('end') is not None else a


def words(name):
    """The ruler's distinctive name words ("Darius the Great" -> darius; "K'inich Janaab' Pakal" -> pakal …)."""
    name = re.sub(r'\s*\(.*?\)', '', name)
    return {w.lower() for w in re.findall(r'[^\W\d_]{3,}', name) if w.lower() not in NAME_SKIP
            and not re.fullmatch(r'[ivxlc]+', w.lower())}


OWN = set()  # uuids of reigns a former freeze imported (data-src/provenance/<id>-reigns.json): not "already on the timeline"


def existing_match(ev, person, by_row):
    """An event already on one of the reign's rows that is the same reign, or None."""
    a0, a1 = span(ev)
    ws = words(person)
    for rid in ev['tracks']:
        for e in by_row.get(rid, []):
            if e['uuid'] in OWN:
                continue
            t = e['title'].lower()
            hit = sum(1 for w in ws if re.search(r'\b' + re.escape(w) + r'\b', t))
            if hit < min(2, len(ws)):
                continue  # one shared name is not the same ruler (Nicholas and Constantine Mavrocordatos, father and son)
            b0, b1 = span(e)
            if not REIGN_WORDS.search(t):
                continue  # a war, coronation or kingdom that merely names the ruler ("Fall of the Assad regime"), not a reign
            shared = min(a1, b1) - max(a0, b0) + 1
            if shared >= 0.5 * min(a1 - a0 + 1, b1 - b0 + 1):
                return e['uuid']
    return None


CATEGORY_FILES = {'modern-states': 'modern-states', 'medieval': 'medieval', 'ancient-classical': 'ancient'}


def pin_claims(timeline):
    """Pins 'succession' for the claim events in the generator's reviewed overrides (pipelines/<generator>/categories.json),
    which win over the classifier; entries for claims this freeze no longer has are removed. The rest of the file is kept
    byte for byte (same text edit as pipelines/v2/emit.py)."""
    path = os.path.join(ROOT, 'pipelines', CATEGORY_FILES[timeline], 'categories.json')
    text = open(path).read()
    mine = sorted(u for u, t in CLAIM_UUIDS.items() if t == timeline)
    old = re.findall(r'"(reign-[^"]*)":\s*\["succession"\],?', text)
    claims_all = {u for u in old if u not in mine}
    for u in claims_all:  # removed claims
        text = re.sub(r'\n\s*"' + re.escape(u) + r'":\s*\[[^\]]*\],?', '', text)
    for u in mine:
        text = re.sub(r'\n\s*"' + re.escape(u) + r'":\s*\[[^\]]*\],?', '', text)
    text = re.sub(r',(\s*\})\s*$', r'\1', text.rstrip() + '\n')
    compact = '": ["' in text
    body = ''.join(',\n' + (f' "{u}": ["succession"]' if compact else f' "{u}": [\n  "succession"\n ]') for u in mine)
    i = text.rstrip().rfind('}')
    open(path, 'w').write(text[:i].rstrip() + body + '\n}\n')


def inputs_of(d):
    """The hashes of what a freeze reads besides data-src: the bulk run's files, the hand exclusions and the Wikipedia dump."""
    import hashlib

    def sha(p):
        return hashlib.sha256(open(p, 'rb').read()).hexdigest()[:16]
    return {'rulers.csv': sha(os.path.join(d, 'rulers.csv')), 'rulers-events.json': sha(os.path.join(d, 'rulers-events.json')),
            'reigns-excluded.json': sha(os.path.join(HERE, 'reigns-excluded.json')),
            'reigns-claims.json': sha(os.path.join(HERE, 'reigns-claims.json')), 'wikipedia': RU.settings.DUMP_NAME}


FIELDS = {}  # uuid -> the infobox field
OFFICES = {}  # uuid -> the office text of the placed ruler (kept out of the review file, whose bytes must not change)
CHRON = re.compile(r'\((?:high|low|middle|mc|short|long|ultra[- ]?\w+|ac)\b[^)]*\)|chronolog', re.I)
GENERIC_ROW = {'kingdom', 'duchy', 'empire', 'republic', 'state', 'states', 'principality', 'union', 'dynasty', 'caliphate', 'sultanate', 'khanate', 'confederation', 'federation', 'commonwealth', 'colony', 'protectorate'}


COLONIAL = re.compile(r'colon|protectorate|east indies|west indies|settlement|mandate|trust territory|occupation|dominion|territory|presidency|crown rule|british rule|company rule', re.I)
CONSORT_LIST = re.compile(r'empresses|queens consort|consorts', re.I)


def row_words(track, colonial=True):
    """The distinctive words of a row's name and phases (first four letters are enough to tell Bohemia from Croatia). With `colonial`, a phase
    that is a colonial or occupation rule ("Spanish East Indies", "British rule in Burma") does not lend its words: the empire's monarch is not
    that row's head of state."""
    names = [track['name']] + [p['name'] for p in track.get('phases', []) if not (colonial and COLONIAL.search(p['name']))]
    return {w.lower() for n in names for w in re.findall(r'[A-Za-zÀ-ÿ]{4,}', n)} - GENERIC_ROW


HEAD = re.compile(r'\b(king|queen|emperor|empress|tsar|tsaritsa|sultan|sultana|shah|caliph|khan|khagan|prince|princess|duke|duchess|archduke|margrave|landgrave|elector|count|president|doge|voivode|vojvoda|pharaoh|monarch|head of state|sapa|negus|raja|maharaja|nawab|emir|amir|tlatoani|mansa|basileus|despot|lord|chief|chieftain|ruler|leader|regent|stadtholder|grand|yabghu|tenno|shogun|bey|dey|pasha|wali)\b', re.I)
CONSORT = re.compile(r'consort|wife of|husband of|spouse', re.I)
NONHEAD = re.compile(r'\b(governor|ambassador|commander|chief of security|minister|envoy|general|viceroy|admiral|prefect|mayor|secretary|speaker)\b', re.I)


PERSON_OFFICES = {}  # qid -> every office text the run gives that person on any row (fills an empty office)


def wrong_kind(e, r, office, track):
    """Why a reign this freeze adds (not in the committed reigns.json) is not a head of state of its row, or None. The five guards of the
    2026-11-24 precision sample, each with a test in test_reigns_freeze.py:
    1. a consort's years (Cleopatra Selene as queen consort of Egypt on the Seleucid row);
    2. an office that is not the head of state (a governor or chief of police, a commander, an ambassador) unless the office also names a head;
    3. another office's infobox term: a `term_start` field whose office has no head-of-state word;
    4. an office that names none of the row's own words (a colony's row with the empire's monarch, a federation's president on a member's row,
       an overlord's title on a vassal's row): the first four letters of an office word and a row word must agree;
    5. a reign that covers less than half of its length inside the row's span (Francis II 1792-1835 on a Milan row that ends earlier)."""
    if CONSORT_LIST.search(r.get('route', '')) and not re.search(r'monarchs|rulers|heads of state|emperors|kings', r.get('route', ''), re.I):
        return 'reached only through a list of empresses or consorts'
    offices = [office] if office else sorted(PERSON_OFFICES.get(r.get('qid'), []))
    if not offices:
        return None
    office = ' ; '.join(offices)
    if CONSORT.search(office):
        return 'consort (not a ruler)'
    head = bool(HEAD.search(office))
    if NONHEAD.search(office) and not head:
        return 'office is not the head of state'
    if r.get('field', '').startswith('term') and not head:
        return "another office's term"
    words = row_words(track) if track else set()
    text = re.findall(r'[a-zà-ÿ]{4,}', re.sub(r'\([^)]*\)', ' ', office).lower())  # the office only, without "(as Philip II)": a ruler's own name (Philip on the Philippines) is no evidence
    if words and not any(tok[:4] == w[:4] for tok in text for w in words):
        return "office names none of the row's words (a colony, member or vassal row)"
    sp = track.get('span') if track else None
    if sp and not isinstance(sp, list) and e.get('end') is not None:
        try:
            r0, r1 = RU.hist(sp['start']), RU.hist(sp.get('end', e['end']))
            length = e['end'] - e['start'] + 1  # inclusive years: a reign inside one year has length 1
            inside = min(e['end'], r1) - max(e['start'], r0) + 1
            if inside < 0.5 * length:
                return "reign mostly outside the row's span"
        except Exception:
            pass
    return None


def guards(keep, review, ours, ds):
    """Two guards on the reigns this freeze adds beyond the committed reigns.json (an existing reign is never touched):
    - chronologies: an infobox that gives one reign in two chronologies ("1206-1203 BC (high) ; 1196-1193 BC (low)") is read as two reigns of the
      same ruler; keep the first listed (earliest start) and make the others claims on its start (startDates, "another chronology");
    - wrong row: a reign reached only through a list page (no polity route) whose office names none of the row's own words is another polity's
      ruler (Tomislav of Croatia on Czechia, through a Habsburg-era list): dropped, listed in the review's skipped notes."""
    tracks = {t['id']: t for t in ds['tracks']}
    out = Counter()
    groups = {}
    for e in keep:
        r = review[e['uuid']]
        loc = e['sources'][0]['sourceLocation'] if e.get('sources') else ''
        if e['uuid'] not in ours and CHRON.search(loc):
            groups.setdefault((r['row'], r['person'], loc), []).append(e)
    for evs in groups.values():
        if len(evs) < 2:
            continue
        evs.sort(key=lambda x: x['start'])
        head = evs[0]
        head['startDates'] = [{'year': head['start'], 'source': head['sources'][0]}] + [
            {'year': o['start'], 'source': head['sources'][0], 'note': 'Another chronology in the same infobox.'} for o in evs[1:]]
        for o in evs[1:]:
            keep.remove(o)
            review.pop(o['uuid'], None)
            out['chronology variant (kept as a claim)'] += 1
    for e in list(keep):
        r = review.get(e['uuid'])
        if not r or e['uuid'] in ours:
            continue
        office = OFFICES.get(e['uuid'], '')
        why = wrong_kind(e, dict(r, field=FIELDS.get(e['uuid'], '')), office, tracks.get(r['row']))
        if why:
            keep.remove(e)
            review.pop(e['uuid'], None)
            out[why] += 1
    return out


def main():
    timeline = flag('--timeline', 'modern-states')
    d = flag('--dir')
    ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json')))
    prov = os.path.join(ROOT, 'data-src', 'provenance', f'{timeline}-reigns.json')
    OWN.update(json.load(open(prov)) if os.path.exists(prov) else {})
    R = list(csv.DictReader(open(os.path.join(d, 'rulers.csv'))))
    data = json.load(open(os.path.join(d, 'rulers-events.json')))
    ev_by = {e['uuid']: e for e in data['events']}
    placed = [r for r in R if r['uuid']]
    for r in R:
        if r['office'] and r['qid']:
            PERSON_OFFICES.setdefault(r['qid'], set()).add(r['office'])
    other = RR.from_elsewhere(placed, {t['id']: t['name'] for t in ds['tracks']})
    imp_path = os.path.join(ROOT, 'data-src', f'{timeline}-importance.json')
    pinned = set(json.load(open(imp_path)).get('_pinnedReigns', [])) if os.path.exists(imp_path) else set()
    path = os.path.join(ROOT, 'pipelines', OUT[timeline], 'reigns.json')
    ours = {e['uuid'] for e in json.load(open(path))['events']} if os.path.exists(path) else set()
    by_row = {}
    for e in ds['events']:  # not the reigns an earlier freeze added, so a re-freeze reproduces itself
        if e['uuid'] in ours:
            continue
        for t in e['tracks']:
            by_row.setdefault(t, []).append(e)

    nouns, swapped = Counter(), []
    names = {t['id']: t['name'] for t in ds['tracks']}
    keep, review, dropped, matched, skipped = [], {}, Counter(), set(), {}
    for r in placed:
        ev = ev_by[r['uuid']]
        if any((ev.get(k) or 0) > 31 for k in ('startDay', 'endDay')):
            # a range the bulk run misread (fixed in dates.py since: "234 ~ November 286" was day 234 of November 286):
            # read the dates again from the cited quote
            pts = [p for p, _ in RU._points([r['quote']]) if p]
            if len(pts) < 2 or RU.days(pts[-1]) <= RU.days(pts[0]):
                dropped['misread date'] += 1
                continue
            first, last = pts[0], pts[-1]
            ev = {k: v for k, v in ev.items() if not k.startswith(('start', 'end')) or k == 'startDates'}
            ev.update(RU.date_fields('start', first))
            ev.update(RU.date_fields('end', last))
            yrs = last[0] - first[0]
            ev['descr'] = re.sub(r' from .*$', f" from {RU.fmt(first)} to {RU.fmt(last)}" + (f' ({yrs} years)' if yrs >= 2 else '') + '.', ev['descr'])
        ex_row = EXCLUDED.get(timeline, {}).get(r['row'], {})
        why_out = ex_row.get(r['person']) or ex_row.get(f"{r['person']}@{ev['start']}")  # "Person@1797": that term only
        if why_out:
            dropped['excluded by hand'] += 1
            skipped[ev['uuid']] = {'row': r['row'], 'person': r['person'], 'qid': r['qid'], 'route': r['route'],
                                   'cited': r['cited'] or r['person'], 'toCheck': ['not imported, wrong row: ' + why_out]}
            continue
        if r['office'] and NON_HEAD.search(r['office']):
            dropped['office is not head of state'] += 1
            skipped[ev['uuid']] = {'row': r['row'], 'person': r['person'], 'qid': r['qid'], 'route': r['route'],
                                   'cited': r['cited'] or r['person'], 'toCheck': ['not imported, office is not head of state: ' + r['office']]}
            continue
        label = term_label(r['cited'] or r['person'], r['field']) if re.fullmatch(r'term_start\d+', r['field']) else ''
        if label and (NON_HEAD.search(label) or label.startswith('Legislative seat')):
            dropped["term of another office (infobox label)"] += 1
            skipped[ev['uuid']] = {'row': r['row'], 'person': r['person'], 'qid': r['qid'], 'route': r['route'],
                                   'cited': r['cited'] or r['person'], 'toCheck': ['not imported, the infobox term is another office: ' + label]}
            continue
        if r['office'] and 'list:' not in r['route'] and partial_name_match(r['office'], names[r['row']]):
            dropped['row matched by part of a word'] += 1
            skipped[ev['uuid']] = {'row': r['row'], 'person': r['person'], 'qid': r['qid'], 'route': r['route'],
                                   'cited': r['cited'] or r['person'], 'toCheck': ['not imported, row matched by part of a word: ' + r['office']]}
            continue
        # read the quote again, for what the bulk run left out (review of #113): "c.", a BC end year, century-only dates
        pair = [x for x in RU.dates.spans(r['quote'])]
        bare = re.fullmatch(r'\s*(c\.?|ca\.?)?\s*(\d{1,4})\s*[| ]\s*(\d{1,4})\s*(BCE|BC|CE|AD|A\.D\.)?\s*', r['quote'])
        if bare and len(pair) < 2:
            # two bare years ("1816 1828", "c. 320|297 BCE"): the parser keeps only the second
            sign = -1 if (bare.group(4) or '').startswith('BC') else 1
            pair = [{'start': (sign * int(bare.group(2)), None, None), 'circa': bool(bare.group(1))},
                    {'start': (sign * int(bare.group(3)), None, None), 'circa': False}]
        if (ev.get('end') is None and len(pair) == 2 and not re.search(r'[–—-]|\bto\b|\buntil\b', RU.dates.clean(r['quote']))
                and pair[1]['start'][0] == RU.hist(ev['start'])):
            # "1816 1828" or "c. 320|297 BCE" (a template's two parameters): the pair is start and end, and the bulk run
            # took the second date as a start without an end (Shaka, Chandragupta Maurya, Elizabeth II on 6 realms)
            a0, b0 = pair[0]['start'], pair[1]['start']
            if a0[0] > 0 and b0[0] < 0 and a0[0] >= -b0[0]:
                a0 = (-a0[0],) + tuple(a0[1:])  # the era is on the second date only
            if RU.days(a0) < RU.days(b0):
                ev = {k: v for k, v in ev.items() if not k.startswith(('start', 'end'))}
                ev.update(RU.date_fields('start', a0))
                ev.update(RU.date_fields('end', b0))
                yrs = b0[0] - a0[0]
                ev['descr'] = re.sub(r' from .*$', f" from {RU.fmt(a0)} to {RU.fmt(b0)}" + (f' ({yrs} years)' if yrs >= 2 else '') + '.', ev['descr'])
                if pair[0]['circa']:
                    ev['circa'] = True
                swapped.append(r['person'])
        sp = [x for x in RU.dates.spans(r['quote']) if x['start'][0] == RU.hist(ev['start'])]
        sp = sp[0] if sp else None
        if sp and sp['precision'] == 'century':
            # "5th century" would draw as an exact 99-year reign: not imported, listed for review
            dropped['century-only date'] += 1
            skipped[ev['uuid']] = {'row': r['row'], 'person': r['person'], 'qid': r['qid'], 'route': r['route'],
                                   'cited': r['cited'] or r['person'], 'toCheck': ['century-only date, not imported: ' + r['quote']]}
            continue
        if sp:
            ev = dict(ev)
            if sp['circa']:
                ev['circa'] = True
            if sp['end'] and ev.get('end') is not None and ev['end'] > 0 > sp['end'][0]:
                # "331 BC – 321?": the end year is BC too (the era was lost); rebuild the end and the description
                ev.update(RU.date_fields('end', sp['end']))
                yrs = sp['end'][0] - sp['start'][0]
                ev['descr'] = re.sub(r' from .*$', f" from {RU.fmt(sp['start'])} to {RU.fmt(sp['end'])}" + (f' ({abs(yrs)} years)' if abs(yrs) >= 2 else '') + '.', ev['descr'])
        if id(r) in other:
            dropped['ruled from another row'] += 1
            continue
        m = existing_match(ev, r['person'], by_row)
        if m:
            dropped['already on the timeline'] += 1
            matched.add(m)
            continue
        why = RR.check_reasons(r)
        if ev.get('end') is None and r['quote']:
            # the end in the cited quote itself, when its separator hid the range ("17 November 1558 ; 24 March 1603")
            pts = [p for p, _ in RU._points([r['quote']]) if p]
            last = pts[-1] if pts else None
            own = (RU.hist(ev['start']), ev.get('startMonth'), ev.get('startDay'))  # the event's own start
            if last and RU.days(last) > RU.days(own):
                ev = dict(ev, **RU.date_fields('end', last))
                # the description was written without an end: add it, with the length
                yrs = last[0] - own[0]
                ev['descr'] = re.sub(r'( \(\d+ years\))?\.$', f" to {RU.fmt(last)}" + (f' ({yrs} years)' if yrs >= 2 else '') + '.', ev['descr'])
                why = why + ['end read from the quote\'s second date']
        if ev.get('end') is None:
            # no end read: an incumbent when Wikidata's term is open too; a lost end when Wikidata gives a term of
            # over a year (Elizabeth I, George III: dropped, never drawn as one year); else a short reign, one year
            wd = (r['wd'].split(' – ') + [''])[:2] if r['wd'] else None
            if wd and not wd[1].strip() and timeline == 'modern-states' and RU.hist(ev['start']) >= 1900:
                ev = dict(ev, ongoing=True)
                why = why + ['open end read as incumbent']
            elif wd and RR.day(wd[1].strip()) and RR.day(r['start']) and RR.day(wd[1].strip()) - RR.day(r['start']) > 366:
                dropped['end not read'] += 1
                continue
            else:
                why = why + ['no end read: shown as one year']
        if ev.get('end') is None and not ev.get('ongoing'):
            # no end: the generator counted the years to the end of its window, so the length is not known
            ev = dict(ev, descr=re.sub(r' \(\d+ years\)\.$', '.', ev['descr']))
        noun, unclear = office_noun(r['office'])
        ev = dict(ev, title=f"{noun} of {r['person']}")
        nouns[noun] += 1
        if unclear:
            why = why + ['office noun unclear (shown as "Tenure of"): ' + r['office']]
        # stable ids: the person and the row, so a rerun that finds one more reign doesn't renumber the others
        uid = f"reign-{RU.slug(r['person'])}-{r['row']}"
        if uid in review:  # the same person twice on a row (two reigns): the later one also names its start year
            base = f"{uid}-{abs(RU.dates.astro(RU.hist(ev['start'])))}"
            uid = base
            if uid in review:  # two terms starting in the same year (Nauru, El Salvador): the month too
                uid = f"{base}-m{ev.get('startMonth') or 0}"
            n = 2
            while uid in review:
                uid, n = f"{base}-m{ev.get('startMonth') or 0}-{n}", n + 1
        ev = {k: v for k, v in dict(ev, uuid=uid).items() if not (k == 'importance' and v == 2)}  # 2 is the default
        if r['person'] in CLAIMS.get(timeline, {}).get(r['row'], {}):
            # a claimant, not a ruler: "Claim of X", described as a claim, category 'succession' (pinned after the loop)
            ev['title'] = f"Claim of {r['person']}"
            ev['descr'] = re.sub(r'^(Rules|Holds office) as head of state of ', 'Claims the throne of ', ev['descr'], count=1)
            CLAIM_UUIDS[uid] = timeline
        keep.append(ev)
        OFFICES[ev['uuid']] = r['office']
        FIELDS[ev['uuid']] = r['field']
        review[ev['uuid']] = {'row': r['row'], 'person': r['person'], 'qid': r['qid'], 'route': r['route'],
                              'cited': r['cited'] or r['person'], 'toCheck': why}
    guard_added = guards(keep, review, ours, ds)
    for why, n in guard_added.items():
        dropped[why] += n
    used = {s['sourceKey'] for e in keep for s in e['sources']} | {
        s['sourceKey'] for e in keep for m in e.get('memberships', []) for s in m.get('sources', [])}
    out = {'note': 'Frozen from a reviewed rulers bulk run by pipelines/extract/reigns_freeze.py; merged by '
                   'pipelines/common/reigns.py. Edit by re-freezing, not by hand.',
           'events': keep, 'skipped': skipped, 'sources': {k: v for k, v in sorted(data['sources'].items()) if k in used}, 'review': review}
    out['inputs'] = inputs_of(d)
    text = json.dumps(out, indent=1, ensure_ascii=False) + '\n'
    if flag('--out'):  # a dry freeze into another file (the silent-misses comparison): no input check, no write to reigns.json
        open(flag('--out'), 'w').write(text)
        print(f"{timeline}: {len(keep)} reigns -> {flag('--out')}")
        return
    if os.path.exists(path):
        old = json.load(open(path))
        if old.get('inputs') == out['inputs']:
            # the same recorded inputs must freeze to the same file: a difference is a bug in the freeze (or a data-src
            # that changed what "already on the timeline" means), never a refresh
            if open(path).read() != text:
                sys.exit(f"{timeline}: re-freezing the recorded inputs does not reproduce {path}; nothing written")
        elif '--update' not in sys.argv:
            sys.exit(f"{timeline}: the inputs differ from the ones recorded in {path} ({', '.join(k for k in out['inputs'] if old.get('inputs', {}).get(k) != out['inputs'][k])}); "
                     "pass --update to freeze the new ones and record their hashes")
    if '--check' not in sys.argv:
        open(path, 'w').write(text)
        pin_claims(timeline)
    print(f"{timeline}: {len(keep)} reigns, {sum(1 for v in review.values() if v['toCheck'])} to check; dropped "
          f"{dict(dropped)}; two-date quotes {len(swapped)}; titles {dict(nouns)}; pinned matched {len(matched & pinned)} of {len(pinned)}"
          + (f" (unmatched: {', '.join(sorted(pinned - matched))})" if pinned - matched else '') + f" -> {path}")


if __name__ == '__main__':
    main()
