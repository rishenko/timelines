"""
Traditions with no single founder (Kevin, 2026-11-23): rows in a "Religions and traditions" group, from the shared list
pipelines/common/traditions.json, with the same ids in every timeline (seams). PILOT: 4 traditions.

    pipelines/.venv/bin/python -I pipelines/common/traditions.py --check     # every quote is in its article (needs the dump)

apply(data, timeline) is called by the generators (gen_medieval.py, gen_modern.py); Ancient, which is written by
content scripts, gets the same rows from scripts/ancient-classical/traditions.ts. Each timeline gets every tradition
whose dates reach its range, and the events whose start lies in its range (start ≤ year < end; the last timeline
includes its end year).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
LIST = os.path.join(HERE, 'traditions.json')
ACCESSED = '2026-11-23'


def load():
    return json.load(open(LIST))


def stored(y):
    """A historical year (negative = BCE, no year 0) as a stored year (1 BCE = 0)."""
    return y + 1 if y < 0 else y


def loc(c):
    return f'{c["section"]}: "{c["quote"]}"'


def claim(c, source=None, quote=None):
    out = {'year': stored(c['year'])}
    if c.get('margin'):
        out['margin'] = c['margin']
    out['source'] = {'sourceKey': c.get('source', source), 'sourceLocation': loc(c) if 'quote' in c else quote}
    if c.get('note'):
        out['note'] = c['note']
    return out


def membership(t):
    m = t['region_membership']
    return {'facet': 'geography', 'value': m['value'], 'sources': [{'sourceKey': m['source'], 'sourceLocation': loc(m)}]}


def earliest(t):
    return min([t['start']] + [c['year'] - c.get('margin', 0) for c in t['startDates']])


def apply(data, timeline):
    """Adds the group, the tradition rows, their events and sources to a generated timeline, in place. Returns counts."""
    L = load()
    rng = data['meta']['range']
    lo, hi = rng['start'], rng['end']
    last = not any(c.get('side') == 'after' for c in data['meta'].get('continues', []))
    within = lambda y: lo <= stored(y) < hi or (last and stored(y) == hi)
    used = set()
    tracks = [x for x in data['tracks'] if x['id'] != L['group']['id'] and x.get('parent') != L['group']['id']]
    rows = []
    events = []
    for t in L['traditions']:
        if stored(earliest(t)) >= hi:
            continue
        o = t['ongoing']
        rows.append({
            'id': t['id'], 'name': t['name'], 'kind': 'theme', 'color': t['color'], 'parent': L['group']['id'],
            'url': 'https://en.wikipedia.org/wiki/' + t['article'].replace(' ', '_'), 'ids': {'wikidata': t['wikidata']},
            'span': {'start': stored(t['start']), **({'circa': True} if t.get('circa') else {}), 'ongoing': True,
                     'startDates': [claim(c) for c in t['startDates']],
                     'ongoingSources': [{'sourceKey': o['source'], 'sourceLocation': loc(o)}]},
            'memberships': [membership(t)],
        })
        used |= {c['source'] for c in t['startDates']} | {o['source'], t['region_membership']['source']}
        for e in t['events']:
            if not within(e['start']):
                continue
            ref = {'sourceKey': e['source'], 'sourceLocation': loc(e)}
            ev = {'uuid': e['uuid'], 'title': e['title'], 'descr': e['descr'], 'start': stored(e['start'])}
            if 'end' in e:
                ev['end'] = stored(e['end'])
            if e.get('circa'):
                ev['circa'] = True
            ev['tracks'] = [t['id']]
            ev['sources'] = [ref]
            if e.get('claims'):
                ev['startDates'] = [claim(c, e['source'], loc(e)) for c in e['claims']]
            events.append(ev)
            used.add(e['source'])
        for s in t['shared']:
            if s['timeline'] == data['meta']['id']:
                ev = next(x for x in data['events'] if x['uuid'] == s['uuid'])
                if t['id'] not in ev['tracks']:
                    ev['tracks'].append(t['id'])
    if rows:
        g = L['group']
        data['tracks'] = tracks + [{'id': g['id'], 'name': g['name'], 'color': g['color']}] + rows
        mine = {e['uuid'] for e in events}
        data['events'] = [e for e in data['events'] if e['uuid'] not in mine] + events
        for k in sorted(used):
            title = L['sources'][k]
            data['sources'][k] = {'name': f'{title} (Wikipedia)', 'url': 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_'),
                                  'accessed': ACCESSED, 'tags': ['wikipedia']}
    return {'traditions': len(rows), 'events': len(events)}


# ---- quote check: every quote must be in its article as rendered (links, refs and templates taken out) ----
def render(t):
    t = re.sub(r'<!--.*?-->', '', t, flags=re.S)
    t = re.sub(r'<ref[^>]*/>|<ref[^>]*>.*?</ref>', '', t, flags=re.S)
    t = re.sub(r'\{\{(?:c\.|circa|ca\.|c)\|([^{}|]*)[^{}]*\}\}', r'c. \1', t, flags=re.I)
    t = re.sub(r'\{\{(?:circa|c\.)\}\}', 'c.', t, flags=re.I)
    for _ in range(3):
        t = re.sub(r'\{\{[^{}]*\}\}', '', t)
    t = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', t)
    t = t.replace('&nbsp;', ' ').replace('&ndash;', '–').replace("'''", '').replace("''", '')
    return re.sub(r'\s+', ' ', t)


def check():
    import wp_dump as wp
    L = load()
    bad = []
    pages = {}
    def has(key, quote):
        title = L['sources'][key]
        if title not in pages:
            p = wp.page(title)
            if not p or wp.ai_flagged(p['text']):
                bad.append(f'{title}: {"missing" if not p else "AI-flagged"}')
                pages[title] = ''
            else:
                # the rendered text, and the source with only "c." templates, links and spacing normalised (infobox fields)
                raw = re.sub(r'\{\{(?:circa|c\.)\}\}', 'c.', p['text'], flags=re.I)
                raw = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', raw)
                pages[title] = render(p['text']) + ' ' + re.sub(r'\s+', ' ', raw)
        return re.sub(r'\s+', ' ', quote) in pages[title]
    n = 0
    for t in L['traditions']:
        items = [(c['source'], c['quote']) for c in t['startDates']] + [(t['ongoing']['source'], t['ongoing']['quote'])]
        items += [(e['source'], e['quote']) for e in t['events']]
        items.append((t['region_membership']['source'], t['region_membership']['quote']))
        for key, q in items:
            n += 1
            if not has(key, q):
                bad.append(f'{t["id"]}: not in {L["sources"][key]}: "{q}"')
    for b in bad:
        print(b)
    print(f'traditions quotes: {n - len(bad)}/{n} found')
    return not bad


if __name__ == '__main__':
    if sys.argv[1:] == ['--check']:
        sys.exit(0 if check() else 1)
    print(__doc__)
