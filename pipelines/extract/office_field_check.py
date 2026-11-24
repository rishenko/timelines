"""
Office-field check for committed reigns (report only; needs the Wikipedia dump).

A reign read from `infobox term_startN` must come from the infobox block of the office it names. rulers.py carries an
office down from an earlier numbered block until the next block names one (Charles Dupuy), so a block that has no office
of its own but IS another kind of block (a seat in Parliament, a constituency, a district) is read as the carried office.
Nauru: Kennan Adeang's `parliament4`…`term_start8` seats became "Presidency of Kennan Adeang" 1971, 1973–76, 1977–78, 1980–88,
1988–2000, which wrap his real 1986 and 1996 terms.

This lists every committed reign (data-src/<timeline>.json, `reign-*` events whose first source is an infobox term_startN)
whose block has no office of its own and shows another kind of block:
  seat          the block has a parliament/constituency/district/state/riding/seat/assembly field;
  constituency  its predecessor or successor reads "constituency …" or "abolished";
  follows       the block comes after a seat block and names no office either.
Strong flags are those three. A weaker one, "blank office field" (the block's officeN/orderN/titleN is present and empty), is
reported apart: it is also how a second term of the same office is written (Rafael Caldera, Eloy Alfaro), so it is a list
for a human eye, not a finding.

    pipelines/.venv/bin/python -I pipelines/extract/office_field_check.py [--out FILE.json] [timeline ...]

Prints the per-timeline count of flagged reigns and rows, the rows with most flags, and the evidence for each; --out writes
the full list. Nothing is changed: a fix is a re-freeze in its own pull request (label `rishenko-reigns`).
"""
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
TIMELINES = ['ancient-classical', 'medieval', 'modern-states']
LOC = re.compile(r'^infobox term_start(\d*)\b')
OWN = ('office', 'order', 'title')
SEATY = re.compile(r'^(parliament|constituency|district|state|riding|seat|assembly|council|house|legislature|ward|division)\d*$')
SEAT_WORDS = re.compile(r'constituency|abolished', re.I)


def blocks(params):
    """[(n, why)] for each numbered term block, in order, that has no office of its own and is a seat or follows one."""
    ns = sorted({m.group(1) for k in params for m in [re.match(r'term_start(\d*)$', k)] if m}, key=lambda x: int(x or 0))
    seat, out = False, []
    for n in ns:
        own = any(params.get(f'{w}{n}') for w in OWN)
        blank = any(f'{w}{n}' in params and not params[f'{w}{n}'] for w in OWN)
        why = None
        if own:
            seat = False
        else:
            ev = [f'{k}={params[k][:30]}' for k in params if SEATY.match(k) and re.sub(r'\D', '', k) == n and n and params[k]]
            if ev:
                seat, why = True, 'seat: ' + ', '.join(ev)
            else:
                for k in (f'predecessor{n}', f'successor{n}'):
                    if SEAT_WORDS.search(params.get(k, '').split('\n')[0]):
                        seat, why = True, f'constituency: {k}={params[k].splitlines()[0][:40]}'
                        break
                if why is None and blank and n:
                    seat, why = True, 'blank office field'
                if why is None and seat and n:
                    why = 'follows a seat block with no office of its own'
        out.append((n, why))
    return out


def title_of(url):
    from urllib.parse import unquote
    return unquote(url.rsplit('/wiki/', 1)[-1]).replace('_', ' ')


def check(timeline, page_params):
    d = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json')))
    tracks = {t['id']: t for t in d['tracks']}
    found = []
    for e in d['events']:
        if not e['uuid'].startswith('reign-') or not e.get('sources'):
            continue
        s = e['sources'][0]
        m = LOC.match(s.get('sourceLocation', ''))
        src = d['sources'].get(s['sourceKey'], {})
        if not m or not src.get('url', '').startswith('https://en.wikipedia.org/wiki/'):
            continue
        params = page_params(title_of(src['url']))
        why = dict(blocks(params)).get(m.group(1))
        if why:
            found.append({'uuid': e['uuid'], 'row': e['tracks'][0], 'title': e['title'], 'start': e['start'], 'end': e.get('end'),
                          'block': f'term_start{m.group(1)}', 'why': why})
    return found


def main(argv):
    out = argv[argv.index('--out') + 1] if '--out' in argv else None
    names = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] != '--out')] or TIMELINES
    import rulers
    import wp_dump
    cache = {}

    def page_params(title):
        if title not in cache:
            pg = wp_dump.page(title)
            cache[title] = rulers.infobox_params(pg['text']) if pg else {}
        return cache[title]

    allfound = {}
    for t in names:
        allfound[t] = check(t, page_params)
        f = allfound[t]
        rows = Counter(x['row'] for x in f)
        strong = [x for x in f if x['why'] != 'blank office field']
        srows = Counter(x['row'] for x in strong)
        print(f'{t}: {len(strong)} reigns flagged (strong) on {len(srows)} rows; top: ' + ', '.join(f'{r} {n}' for r, n in srows.most_common(8))
              + f'; {len(f) - len(strong)} weak (blank office field) on {len(rows) - len(srows) if False else len({x["row"] for x in f if x["why"] == "blank office field"})} rows')
    if out:
        json.dump(allfound, open(out, 'w'), indent=1, ensure_ascii=False)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
