"""
Golden ages and eras (Kevin, 2026-11-22): an age within one state is a key span event (category society/golden-age,
set in each timeline's category overrides), and an age across states is a timeline-wide era (`meta.eras`). Both come
from periods.json, hand-kept generator input; this resolves it against the dump.

Every date in periods.json is a claim naming its article and where the article says so:
  {"find": "<text>"}     a sentence of the article (lead or any section; wp_sections), cited by its section
  {"infobox": "<param>"} a parameter of the article's first infobox (historical-era infoboxes too, which the
                         extractor doesn't read)
  {"short": true}        the article's short description
A new event's description ("descr") restates sentences of the cited articles, listed as its "basis"
([article, text]); each is found in the dump and cited after the date sources. The cited text must hold the year, or, for a claim read from centuries (it has a margin), the word "century". An
article that is missing or AI-flagged stops the run (wp_claims.art). An entry with "circa": true is circa even
without a margin ("around 1760").

  apply(data, timeline)  used by gen_medieval.py and gen_modern.py, after data['events'] is set and before
                         data['sources']: sets meta.eras, adds the new golden-age events, marks events key and redates
                         them. Existing events change here, as generator input, and never by hand in data-src.
  plan(timeline)         Ancient and Classical has no generator: pipelines/ancient/periods.py writes this as
                         data-src/ancient-classical-periods.json, which the build applies (scripts/lib/periods.ts).

An era that crosses a seam (the Timurid Renaissance at 1500) is one entry here, read by both generators, so its id and
dates match in both timelines by construction (src/data/eras.test.ts checks it).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mwparserfromhell as mw  # noqa: E402
import wp_claims as G  # noqa: E402
import wp_dump  # noqa: E402
import wp_states as W  # noqa: E402
from wp_sections import find  # noqa: E402

INPUT = os.path.join(HERE, 'periods.json')


def load():
    return json.load(open(INPUT, encoding='utf-8'))


def _infobox(title, param):
    for t in mw.parse(wp_dump.page(title)['text']).filter_templates(recursive=False):
        if str(t.name).strip().lower().startswith('infobox'):
            if t.has(param):
                return W.plain(t.get(param).value, []).strip()
            break
    raise SystemExit(f'{title}: no infobox parameter {param!r}')


def _short(title):
    m = re.search(r'\{\{\s*short description\s*\|([^}]*)\}\}', wp_dump.page(title)['text'], re.I)
    if not m:
        raise SystemExit(f'{title}: no short description')
    return m.group(1).strip()


def _sentence(article, needle):
    """(text, location) of the article's first sentence holding `needle`: lead first, then sections in order."""
    title = G.art(article)['title']
    hit = find(title, needle)
    if not hit:
        raise SystemExit(f'{title}: no sentence with {needle!r}')
    where, text = hit
    return text, (f'lead: "{text[:160]}"' if where == 'lead' else f'section "{where}": "{text[:160]}"')


def claim(c):
    """One date claim: {year, source, margin?, note?}, its cited text checked against the dump."""
    title = G.art(c['article'])['title']
    if 'find' in c:
        text, loc = _sentence(c['article'], c['find'])
    elif 'infobox' in c:
        text = _infobox(title, c['infobox'])
        loc = f'infobox {c["infobox"]}: {text[:80]}'
    elif c.get('short'):
        text = _short(title)
        loc = f'short description: "{text}"'
    else:
        raise SystemExit(f'{title}: a claim needs find, infobox or short')
    digits = re.sub(r'\D', '', str(c['year']))
    if 'margin' in c:
        if 'centur' not in text.lower() and digits not in text:
            raise SystemExit(f'{title}: {loc} names neither a century nor {c["year"]}')
    elif digits not in text:
        raise SystemExit(f'{title}: {loc} does not name {c["year"]}')
    out = {'year': c['year'], 'source': G.ref(c['article'], loc)}
    for k in ('margin', 'note'):
        if k in c:
            out[k] = c[k]
    return out


def _dated(x):
    """start, end, circa, startDates, endDates and the sources they cite (each once), from x's claims."""
    sd, ed = [claim(c) for c in x['start']], [claim(c) for c in x['end']]
    d = {'start': sd[0]['year'], 'end': ed[0]['year']}
    if x.get('circa') or 'margin' in x['start'][0] or 'margin' in x['end'][0]:
        d['circa'] = True
    d['startDates'], d['endDates'] = sd, ed
    refs = []
    for r in [sd[0]['source'], ed[0]['source']]:
        if r not in refs:
            refs.append(r)
    return d, refs


def era(x):
    d, refs = _dated(x)
    return {'id': x['id'], 'name': x['name'], 'group': x['group'], **d, 'sources': refs}


def age(x):
    d, refs = _dated(x)
    e = {'uuid': x['uuid'], 'title': x['title'], 'descr': x.get('descr', ''), 'start': d['start'], 'end': d['end']}
    if d.get('circa'):
        e['circa'] = True
    e['tracks'] = x['tracks']
    # a description cites the sentences it restates (its basis), after the date sources
    for article, needle in x.get('basis', []):
        r = G.ref(article, _sentence(article, needle)[1])
        if r not in refs:
            refs.append(r)
    e['sources'] = refs
    e['startDates'], e['endDates'] = d['startDates'], d['endDates']
    e['importance'] = 1
    return e


def apply(data, timeline):
    """Eras, new golden-age events, key marks and new dates for a generated timeline (in place). Returns counts."""
    p = load()
    eras = [era(x) for x in p['eras'] if timeline in x['timelines']]
    if eras:
        data['meta']['eras'] = eras
    else:
        data['meta'].pop('eras', None)
    by = {e['uuid']: e for e in data['events']}
    new = [age(x) for x in p['ages'] if x['timeline'] == timeline]
    for e in new:
        if e['uuid'] in by:
            raise SystemExit(f'periods.json: event {e["uuid"]} already exists in {timeline}')
        data['events'].append(e)
    for u in p['key'].get(timeline, []):
        if u not in by:
            raise SystemExit(f'periods.json: no event {u} in {timeline}')
        by[u]['importance'] = 1
    for u, x in p['redate'].get(timeline, {}).items():
        if u not in by:
            raise SystemExit(f'periods.json: no event {u} in {timeline}')
        e, (d, refs) = by[u], _dated(x)
        e['start'], e['end'] = d['start'], d['end']
        e['startDates'], e['endDates'] = d['startDates'], d['endDates']
        for r in refs:
            if r not in e['sources']:
                e['sources'].append(r)
    return {'eras': len(eras), 'new ages': len(new), 'key': len(p['key'].get(timeline, [])), 'redated': len(p['redate'].get(timeline, {}))}


def plan(timeline):
    """For a timeline without a generator: {eras, events, sources}, the sources being those the eras and events cite."""
    p = load()
    if p['key'].get(timeline) or p['redate'].get(timeline):
        raise SystemExit(f'periods.json: {timeline} has no generator; put its key events in its importance plan')
    eras = [era(x) for x in p['eras'] if timeline in x['timelines']]
    events = [age(x) for x in p['ages'] if x['timeline'] == timeline]
    keys = sorted({r['sourceKey'] for x in eras + events for r in x['sources'] + [c['source'] for c in x['startDates'] + x['endDates']]})
    return {'eras': eras, 'events': events, 'sources': {k: G.SOURCES[k] for k in keys}}
