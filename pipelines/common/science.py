"""
Science and discoveries pilot (Kevin, 2026-11-23/24): 25 new events in the existing `science` kind (discovery, invention,
work), from the shared list pipelines/common/science.json, plus one existing event recategorised (Đông Sơn bronze drums,
in pipelines/ancient/categories.json). Plan: Workbench "2026-11-24 Timelines science and discoveries pilot plan".

    pipelines/.venv/bin/python -I pipelines/common/science.py --check     # every quote is in its article (needs the dump)

Each event lands in the one timeline whose range holds its start (start <= year < end; the last timeline includes its end
year), on the row(s) named in `tracks` where that timeline has them. Every date and every place is a quoted sentence
from a Wikipedia article read from the dump (`source`: the date; `more`: other quoted facts; `claims`: other dates).
apply(data, timeline) is called by the generators (gen_medieval.py, gen_modern.py); Ancient, which is written by content
scripts, gets its events from scripts/ancient-classical/science.ts. The events' categories are in each timeline's
categories.json (reviewed overrides: the sub-kind).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
LIST = os.path.join(HERE, 'science.json')
ACCESSED = '2026-11-24'


def load():
    return json.load(open(LIST))


def stored(y):
    """A historical year (negative = BCE, no year 0) as a stored year (1 BCE = 0)."""
    return y + 1 if y < 0 else y


def key(L, article):
    return L['sources'][article]


def ref(L, q):
    return {'sourceKey': key(L, q['article']), 'sourceLocation': f'{q["section"]}: "{q["quote"]}"'}


def claim(L, c):
    out = {'year': stored(c['year'])}
    if c.get('margin'):
        out['margin'] = c['margin']
    out['source'] = ref(L, c)
    if c.get('note'):
        out['note'] = c['note']
    return out


def event(L, e):
    """The event as the generators store it (the row list is filtered by the caller)."""
    ev = {'uuid': e['uuid'], 'title': e['title'], 'descr': e['descr'], 'start': stored(e['start'])}
    if 'end' in e:
        ev['end'] = stored(e['end'])
    if e.get('circa'):
        ev['circa'] = True
    ev['sources'] = [ref(L, e['source'])] + [ref(L, m) for m in e.get('more', [])]
    claims = [claim(L, c) for c in e.get('claims', [])]
    if claims:
        # the headline date has its own claim unless one of the claims already gives that year
        if stored(e['start']) not in {c['year'] for c in claims}:
            claims.insert(0, {'year': stored(e['start']), 'source': ref(L, e['source'])})
        ev['startDates'] = claims
    return ev


def used_articles(e):
    return {e['source']['article']} | {m['article'] for m in e.get('more', [])} | {c['article'] for c in e.get('claims', [])}


def apply(data, timeline):
    """Adds the science events and their Wikipedia sources to a generated timeline, in place. Returns counts."""
    L = load()
    rng = data['meta']['range']
    lo, hi = rng['start'], rng['end']
    last = not any(c.get('side') == 'after' for c in data['meta'].get('continues', []))
    within = lambda y: lo <= stored(y) < hi or (last and stored(y) == hi)
    here = {x['id'] for x in data['tracks']}
    new, arts = [], set()
    for e in L['events']:
        if not within(e['start']):
            continue
        rows = [r for r in e['tracks'] if r in here]
        if not rows:
            raise SystemExit(f'science.json: {e["uuid"]}: none of its rows {e["tracks"]} is in {data["meta"]["id"]}')
        ev = event(L, e)
        ev['tracks'] = rows
        new.append(ev)
        arts |= used_articles(e)
    mine = {e['uuid'] for e in new}
    data['events'] = [e for e in data['events'] if e['uuid'] not in mine] + new
    for a in sorted(arts):
        data['sources'].setdefault(key(L, a), {'name': f'{a} (Wikipedia)', 'url': 'https://en.wikipedia.org/wiki/' + a.replace(' ', '_'),
                                                'accessed': ACCESSED, 'tags': ['wikipedia']})
    return {'events': len(new)}


def check():
    import traditions
    import wp_dump as wp
    L = load()
    bad, pages, n = [], {}, 0

    def has(article, quote):
        if article not in pages:
            p = wp.page(article)
            if not p or wp.ai_flagged(p['text']):
                bad.append(f'{article}: {"missing" if not p else "AI-flagged"}')
                pages[article] = ''
            else:
                # the source with the "c." templates taken out (infobox fields keep their template)
                raw = re.sub(r'\{\{(?:circa|c\.|ca\.)\|([^{}|]*)[^{}]*\}\}', r'c. \1', p['text'], flags=re.I)
                raw = re.sub(r'\{\{(?:circa|c\.)\}\}', 'c.', raw, flags=re.I).replace('&nbsp;', ' ').replace('&ndash;', '–')
                raw = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', raw)
                pages[article] = traditions.render(p['text']) + ' ' + re.sub(r'\s+', ' ', raw)
        return re.sub(r'\s+', ' ', quote) in pages[article]

    for e in L['events']:
        for q in [e['source']] + e.get('more', []) + e.get('claims', []):
            n += 1
            if not has(q['article'], q['quote']):
                bad.append(f'{e["uuid"]}: not in {q["article"]}: "{q["quote"]}"')
    for b in bad:
        print(b)
    print(f'science quotes: {n - len(bad)}/{n} found')
    return not bad


if __name__ == '__main__':
    if sys.argv[1:] == ['--check']:
        sys.exit(0 if check() else 1)
    print(__doc__)
