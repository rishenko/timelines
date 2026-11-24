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


def existing_match(ev, person, by_row):
    """An event already on one of the reign's rows that is the same reign, or None."""
    a0, a1 = span(ev)
    ws = words(person)
    for rid in ev['tracks']:
        for e in by_row.get(rid, []):
            t = e['title'].lower()
            if not any(re.search(r'\b' + re.escape(w) + r'\b', t) for w in ws):
                continue
            b0, b1 = span(e)
            if not REIGN_WORDS.search(t):
                continue  # a war, coronation or kingdom that merely names the ruler ("Fall of the Assad regime"), not a reign
            shared = min(a1, b1) - max(a0, b0) + 1
            if shared >= 0.5 * min(a1 - a0 + 1, b1 - b0 + 1):
                return e['uuid']
    return None


def main():
    timeline = flag('--timeline', 'modern-states')
    d = flag('--dir')
    held = [n for n in sorted(os.listdir(os.path.join(ROOT, 'data-src', 'provenance'))) if n.endswith('-reigns.json')]
    if held:
        # a freeze reads data-src: with the reigns already in it, every reign looks "already on the timeline" and is dropped
        sys.exit(f"refusing to freeze: data-src already holds reigns ({', '.join(held)}). Start from clean data: "
                 "git checkout origin/main -- data-src public/timelines docs, then remove data-src/provenance/*-reigns.json")
    ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json')))
    R = list(csv.DictReader(open(os.path.join(d, 'rulers.csv'))))
    data = json.load(open(os.path.join(d, 'rulers-events.json')))
    ev_by = {e['uuid']: e for e in data['events']}
    placed = [r for r in R if r['uuid']]
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
        why_out = EXCLUDED.get(timeline, {}).get(r['row'], {}).get(r['person'])
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
        keep.append(ev)
        review[ev['uuid']] = {'row': r['row'], 'person': r['person'], 'qid': r['qid'], 'route': r['route'],
                              'cited': r['cited'] or r['person'], 'toCheck': why}
    used = {s['sourceKey'] for e in keep for s in e['sources']} | {
        s['sourceKey'] for e in keep for m in e.get('memberships', []) for s in m.get('sources', [])}
    out = {'note': 'Frozen from a reviewed rulers bulk run by pipelines/extract/reigns_freeze.py; merged by '
                   'pipelines/common/reigns.py. Edit by re-freezing, not by hand.',
           'events': keep, 'skipped': skipped, 'sources': {k: v for k, v in sorted(data['sources'].items()) if k in used}, 'review': review}
    json.dump(out, open(path, 'w'), indent=1, ensure_ascii=False)
    open(path, 'a').write('\n')
    print(f"{timeline}: {len(keep)} reigns, {sum(1 for v in review.values() if v['toCheck'])} to check; dropped "
          f"{dict(dropped)}; two-date quotes {len(swapped)}; titles {dict(nouns)}; pinned matched {len(matched & pinned)} of {len(pinned)}"
          + (f" (unmatched: {', '.join(sorted(pinned - matched))})" if pinned - matched else '') + f" -> {path}")


if __name__ == '__main__':
    main()
