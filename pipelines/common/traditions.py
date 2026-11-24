"""
Traditions with no single founder (Kevin, 2026-11-23): rows in a "Religions and traditions" group, from the shared list
pipelines/common/traditions.json, with the same ids in every timeline (seams). PILOT: 4 traditions.

    pipelines/.venv/bin/python -I pipelines/common/traditions.py --cache     # fetch the scholarly pages not cached yet
    pipelines/.venv/bin/python -I pipelines/common/traditions.py --check     # every quote is in its source (needs the dump)

Sources: English Wikipedia articles (from the dump), and scholarly pages (`web_sources`: a scholar's essay, a university
encyclopedia, a university-press library, an academic's article), cached in $TIMELINES_DATA/traditions-sources/<key>.html
and tagged `scholarly`.

An event may start before its row's headline: the faded part of the row is the range of claimed starts (Kevin's call,
2026-11-23: the Rigveda sits on Hinduism's row, before its c. 500 BCE headline, inside the roots claim).

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


def cache_dir():
    import settings
    return os.path.join(settings.DATA, 'traditions-sources')


def cached(key):
    """The cached copy of a scholarly source: <key>.html or <key>.pdf, or None."""
    for ext in ('.html', '.pdf'):
        path = os.path.join(cache_dir(), key + ext)
        if os.path.exists(path):
            return path
    return None


def web_text(key):
    """A cached scholarly page or PDF as plain text (tags out, entities and curly quotes normalised; a PDF via pdftotext,
    with words hyphenated across a line break joined)."""
    import html
    import subprocess
    path = cached(key)
    if path.endswith('.pdf'):
        t = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True, check=True).stdout
        t = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', t)
    else:
        t = open(path, encoding='utf-8', errors='replace').read()
        t = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', t, flags=re.S | re.I)
        t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
    t = t.translate({0x2019: "'", 0x2018: "'", 0x201c: '"', 0x201d: '"', 0xa0: ' '})
    return re.sub(r'\s+', ' ', t)


def cache():
    import urllib.request
    os.makedirs(cache_dir(), exist_ok=True)
    for key, s in load().get('web_sources', {}).items():
        if cached(key):
            continue
        path = os.path.join(cache_dir(), key + ('.pdf' if s['url'].lower().endswith('.pdf') else '.html'))
        req = urllib.request.Request(s['url'], headers={'User-Agent': 'Mozilla/5.0 (timelines source cache)'})
        open(path, 'wb').write(urllib.request.urlopen(req, timeout=60).read())
        print(f'cached {key}')


def load():
    with open(LIST) as f:
        return json.load(f)


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


def category_pins():
    """{event uuid: [categories]} for the events the list gives categories (applied by event_categories.apply, after
    Kevin's reviewed overrides and before the keyword classifier)."""
    return {e['uuid']: e['categories'] for t in load()['traditions'] for e in t['events'] if e.get('categories')}


def earliest(t):
    return min([t['start']] + [c['year'] - c.get('margin', 0) for c in t['startDates']])


def latest(t):
    """The latest year the row may have lasted to: None while it is still practised."""
    if 'end' not in t:
        return None
    return max([t['end']] + [c['year'] + c.get('margin', 0) for c in t.get('endDates', [])])


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
    here = {x['id'] for x in tracks}
    for t in L['traditions']:
        if stored(earliest(t)) >= hi or (latest(t) is not None and stored(latest(t)) < lo):
            continue
        span = {'start': stored(t['start']), **({'circa': True} if t.get('circa') else {})}
        if 'end' in t:
            # an ended tradition: its end, with the sources' end dates as claims
            span['end'] = stored(t['end'])
            span['startDates'] = [claim(c) for c in t['startDates']]
            span['endDates'] = [claim(c) for c in t.get('endDates', [])]
        else:
            o = t['ongoing']
            span['ongoing'] = True
            span['startDates'] = [claim(c) for c in t['startDates']]
            span['ongoingSources'] = [{'sourceKey': o['source'], 'sourceLocation': loc(o)}]
        rows.append({
            'id': t['id'], 'name': t['name'], 'kind': 'theme', 'color': t['color'], 'parent': L['group']['id'],
            'url': 'https://en.wikipedia.org/wiki/' + t['article'].replace(' ', '_'), **({'ids': {'wikidata': t['wikidata']}} if t.get('wikidata') else {}),  # an article with no Wikidata item (Māori religion) gets no ids
            'span': span,
        })
        # a region only where the timeline has that region (Modern States has no region facet)
        if t['region_membership']['value'] in data['meta'].get('facets', {}).get('geography', {}).get('values', {}):
            rows[-1]['memberships'] = [membership(t)]
        used |= ({c['source'] for c in t['startDates'] + t.get('endDates', [])} | ({t['ongoing']['source']} if 'ongoing' in t else set())
                 | ({t['region_membership']['source']} if 'memberships' in rows[-1] else set()))
        for e in t['events']:
            if not within(e['start']):
                continue
            ref = {'sourceKey': e['source'], 'sourceLocation': loc(e)}
            ev = {'uuid': e['uuid'], 'title': e['title'], 'descr': e['descr'], 'start': stored(e['start'])}
            if 'end' in e:
                ev['end'] = stored(e['end'])
            if e.get('circa'):
                ev['circa'] = True
            # the place it happened, where this timeline has that row
            ev['tracks'] = [t['id']] + [r for r in e.get('places', {}).get(data['meta']['id'], []) if r in here]
            ev['sources'] = [ref]
            if e.get('claims'):
                ev['startDates'] = [claim(c, e['source'], loc(e)) for c in e['claims']]
            events.append(ev)
            used.add(e['source'])
        for s in t['shared']:
            if s['timeline'] == data['meta']['id']:
                ev = next((x for x in data['events'] if x['uuid'] == s['uuid']), None)
                if ev is None:
                    raise SystemExit(f'traditions.json: {t["id"]} shares event "{s["uuid"]}", which {data["meta"]["id"]} does not have')
                if t['id'] not in ev['tracks']:
                    ev['tracks'].append(t['id'])
    if rows:
        g = L['group']
        data['tracks'] = tracks + [{'id': g['id'], 'name': g['name'], 'color': g['color']}] + rows
        mine = {e['uuid'] for e in events}
        data['events'] = [e for e in data['events'] if e['uuid'] not in mine] + events
        web = L.get('web_sources', {})
        if used & set(web):
            data.setdefault('tags', {})['scholarly'] = {'name': 'Scholarly pages'}
        for k in sorted(used):
            if k in web:
                w = web[k]
                data['sources'][k] = {'name': w['name'], 'url': w['url'], 'author': w['author'], **({'year': w['year']} if 'year' in w else {}),
                                      'accessed': w['accessed'], 'tags': ['scholarly']}
                continue
            title = L['sources'][k]
            url = 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_')
            if data['sources'].get(k, {}).get('url') == url:
                continue  # the timeline already cites this article under this key: keep its entry as it is
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
    web = L.get('web_sources', {})
    def has(key, quote):
        if key in web:
            if key not in pages:
                pages[key] = web_text(key) if cached(key) else ''
                if not pages[key]:
                    bad.append(f'{key}: not cached (run --cache)')
            return quote in pages[key]
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
        items = [(c['source'], c['quote']) for c in t['startDates'] + t.get('endDates', [])]
        if 'ongoing' in t:
            items.append((t['ongoing']['source'], t['ongoing']['quote']))
        items += [(e['source'], e['quote']) for e in t['events']]
        items.append((t['region_membership']['source'], t['region_membership']['quote']))
        for key, q in items:
            n += 1
            if not has(key, q):
                bad.append(f'{t["id"]}: not in {web[key]["name"] if key in web else L["sources"][key]}: "{q}"')
    for b in bad:
        print(b)
    print(f'traditions quotes: {n - len(bad)}/{n} found')
    return not bad


if __name__ == '__main__':
    if sys.argv[1:] == ['--check']:
        sys.exit(0 if check() else 1)
    if sys.argv[1:] == ['--cache']:
        sys.exit(cache())
    print(__doc__)
