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
            shared = min(a1, b1) - max(a0, b0) + 1
            if shared >= 0.5 * min(a1 - a0 + 1, b1 - b0 + 1):
                return e['uuid']
    return None


def main():
    timeline = flag('--timeline', 'modern-states')
    d = flag('--dir')
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

    keep, review, dropped, matched = [], {}, Counter(), set()
    for r in placed:
        ev = ev_by[r['uuid']]
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
            if last and RU.days(last) > RU.days(pts[0]):
                ev = dict(ev, **RU.date_fields('end', last))
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
        keep.append(ev)
        review[ev['uuid']] = {'row': r['row'], 'person': r['person'], 'qid': r['qid'], 'route': r['route'],
                              'cited': r['cited'] or r['person'], 'toCheck': why}
    used = {s['sourceKey'] for e in keep for s in e['sources']} | {
        s['sourceKey'] for e in keep for m in e.get('memberships', []) for s in m.get('sources', [])}
    out = {'note': 'Frozen from a reviewed rulers bulk run by pipelines/extract/reigns_freeze.py; merged by '
                   'pipelines/common/reigns.py. Edit by re-freezing, not by hand.',
           'events': keep, 'sources': {k: v for k, v in sorted(data['sources'].items()) if k in used}, 'review': review}
    json.dump(out, open(path, 'w'), indent=1, ensure_ascii=False)
    open(path, 'a').write('\n')
    print(f"{timeline}: {len(keep)} reigns, {sum(1 for v in review.values() if v['toCheck'])} to check; dropped "
          f"{dict(dropped)}; pinned matched {len(matched & pinned)} of {len(pinned)}"
          + (f" (unmatched: {', '.join(sorted(pinned - matched))})" if pinned - matched else '') + f" -> {path}")


if __name__ == '__main__':
    main()
