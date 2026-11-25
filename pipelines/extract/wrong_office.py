"""
Wrong-office check for committed reigns (report mode; needs the Wikipedia dump and the Wikidata sqlite, so it runs locally and not in CI).

The class: a reign whose dates are read correctly, but from an office other than the row's head office (a party chair, a federation, a
commission, an office held under a predecessor): Wang Jingwei, Keïta, Kim Jong-il, Kalinin. Design: Workbench note "2026-11-25 Timelines
wrong-office sweep design"; the pilot was a throwaway script.

Each committed reign (data-src/<timeline>.json, `reign-*` events whose first source is an infobox field) is read back to its infobox span
(rulers.wp_reigns) and the person's Wikidata position-held terms (Sources.p39_terms). Three signals, pure functions of
(shipped span, the person's other spans, P39 terms):

  A  the shipped start matches no P39 term (start within DAYS) and another infobox span, of a head office, starts where one does (Wang Jingwei);
  C  the shipped start matches no term, lies inside an earlier span of another head office, and a term starts within three years after it (Keïta, the Mali Federation);
  (no B: Wikidata's P39 labels are bare Qids in the local sqlite, so a term's office can't be classed; Kim Jong-il is caught by D)
  D  the cited office text names a body (party, federation, commission, committee, politburo, bureau, council) and no head word.

    pipelines/.venv/bin/python -I pipelines/extract/wrong_office.py [--out FILE.csv] [timeline ...]

Prints the counts per timeline and per signal and writes one CSV (timeline,row,person,uuid,start,end,office,field,signals,evidence,wd_term,allowed).
The allowlist is pipelines/extract/reign-audit/wrong-office-allow.json, {"allow": {"<reign uuid>": "why"}}: by uuid, never by row. Exit 0 always:
a gate comes only after a resample passes. A fix is a `date` ruling, an exclusion or an allowlist entry, in its own PR.
"""
import csv
import json
import os
import re
import sys
from collections import Counter
from urllib.parse import unquote

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
TIMELINES = ['ancient-classical', 'medieval', 'modern-states']
DAYS = 31
FIELD = re.compile(r'^infobox ((?:term_start|reign)\d*)\b')
BODY = re.compile(r'\b(party|federation|commission|committee|politburo|bureau|council|presidium of the central|central executive|secretariat|congress)\b', re.I)
HEAD = re.compile(r'\b(president|king|queen|emperor|empress|premier|prime minister|leader|chancellor|sultan|shah|tsar|khan|monarch|chairman of the state|'
                  r'chair(?:man)? of the presidium of the supreme|head of state|general secretary of the (?:communist|workers))', re.I)
from head_spans import NOT_A_SEAT  # noqa: E402
SOURCE_URL = 'https://en.wikipedia.org/wiki/'


def days(t):
    return t[0] * 372 + (t[1] or 1) * 31 + (t[2] or 1) if t else None


def near(a, b):
    return a is not None and b is not None and abs(days(a) - days(b)) <= DAYS


def is_body(text):
    """The office text names a body and no head: "Chairman of the National Defence Commission", not "Chairman of the Council of State"."""
    return bool(BODY.search(text)) and not HEAD.search(text)


def matches_a_term(mine, terms):
    return any(near(mine['start'], t[0]) for t in terms)


def signal_a(mine, others, terms):
    """[evidence] the shipped start matches no P39 term, and another span, of a head office, starts where a term does."""
    if matches_a_term(mine, terms):
        return []
    return [f"{succ[:50]} {s['text']}" for _, s, succ in others
            if not is_body(succ) and not NOT_A_SEAT.search(succ) and abs(days(s['start']) - days(mine['start'])) > 2 * DAYS
            and any(near(s['start'], t[0]) and (not t[1] or not s['end'] or near(s['end'], t[1])) for t in terms)]


def signal_c(mine, others, terms):
    """[evidence] the shipped start matches no P39 term and lies inside an earlier span of another head office, and a term starts within three years after it."""
    if matches_a_term(mine, terms) or not any(t[0] and 0 < days(t[0]) - days(mine['start']) <= 3 * 372 for t in terms):
        return []
    return [f"inside {succ[:50]} {s['text']}" for _, s, succ in others
            if not is_body(succ) and not NOT_A_SEAT.search(succ) and s['end'] and days(s['start']) < days(mine['start']) < days(s['end'])]


def signal_d(office):
    return [office[:70]] if is_body(office) else []


def signals(mine, office, others, terms):
    """{signal letter: [evidence]} for one shipped span; empty when nothing fires."""
    got = {'A': signal_a(mine, others, terms), 'C': signal_c(mine, others, terms), 'D': signal_d(office)}
    return {k: v for k, v in got.items() if v}


def title_of(url):
    return unquote(url.rsplit('/wiki/', 1)[-1]).replace('_', ' ')


def reigns(timeline):
    """[(event, row, person, qid, page title, infobox field)] for every committed reign read from an infobox field."""
    d = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json'), encoding='utf-8'))
    review = json.load(open(os.path.join(ROOT, 'pipelines', timeline.replace('ancient-classical', 'ancient'), 'reigns.json'), encoding='utf-8'))['review']
    out = []
    for e in d['events']:
        if not e['uuid'].startswith('reign-') or not e.get('sources'):
            continue
        s = e['sources'][0]
        m = FIELD.match(s.get('sourceLocation', ''))
        url = d['sources'].get(s['sourceKey'], {}).get('url', '')
        r = review.get(e['uuid'], {})
        if m and url.startswith(SOURCE_URL) and r.get('qid'):
            out.append((e, e['tracks'][0], r.get('person', ''), r['qid'], title_of(url), m.group(1)))
    return out


def check(timeline, spans_of, terms_of, allowed):
    """Rows of the report for one timeline. spans_of(title) -> [(field, span, succession)], terms_of(qid) -> P39 terms."""
    rows = []
    for e, row, person, qid, title, field in reigns(timeline):
        spans = spans_of(title)
        key = (e['start'], e.get('startMonth'), e.get('startDay'))
        mine = next(((f, s, succ) for f, s, succ in spans if f == field and (s['start'][0], s['start'][1], s['start'][2]) == key), None) \
            or next(((f, s, succ) for f, s, succ in spans if f == field), None)
        if not mine:
            continue
        others = [x for x in spans if x[0] != mine[0] and x[2] != mine[2]]
        got = signals(mine[1], mine[2], others, terms_of(qid))
        if got:
            rows.append({'timeline': timeline, 'row': row, 'person': person, 'uuid': e['uuid'], 'start': mine[1]['text'], 'end': '',
                         'office': mine[2], 'field': field, 'signals': ''.join(got), 'evidence': ' | '.join(f'{k}: {"; ".join(v)}' for k, v in got.items()),
                         'wd_term': '; '.join(f'{t[-1][:40]} {t[0]}–{t[1] or ""}' for t in terms_of(qid)[:4]), 'allowed': allowed.get(e['uuid'], '')})
    return rows


def main(argv):
    out = argv[argv.index('--out') + 1] if '--out' in argv else None
    names = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] != '--out')] or TIMELINES
    import rulers
    import settings
    src = rulers.Sources(settings.DATA)
    cache = {}

    def spans_of(title):
        if title not in cache:
            pg = rulers.page_of(title)
            cache[title] = rulers.wp_reigns(rulers.infobox_params(pg['text'])) if pg else []
        return cache[title]

    ap = os.path.join(HERE, 'reign-audit', 'wrong-office-allow.json')
    allowed = json.load(open(ap, encoding='utf-8'))['allow'] if os.path.exists(ap) else {}
    allrows = []
    for t in names:
        rows = check(t, spans_of, src.p39_terms, allowed)
        allrows += rows
        open_ = [r for r in rows if not r['allowed']]
        print(f"{t}: {len(open_)} open, {len(rows) - len(open_)} allowed; by signal " + ', '.join(f'{k} {n}' for k, n in sorted(Counter(c for r in open_ for c in r['signals']).items())))
    if out:
        with open(out, 'w', encoding='utf-8', newline='') as f:
            w = csv.DictWriter(f, fieldnames=list(allrows[0]) if allrows else ['timeline'])
            w.writeheader()
            w.writerows(allrows)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
