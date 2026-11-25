"""
Golden ages and eras (Kevin, 2026-11-22): an age within one state is a key span event (category society/golden-age,
set in each timeline's category overrides), and an age across states is a timeline-wide era (`meta.eras`). Both come
from periods.json, hand-kept generator input; this resolves it against the dump.

Every date in periods.json is a claim naming its article and where the article says so:
  {"find": "<text>"}     a sentence of the article (lead or any section; wp_sections), cited by its section
  {"infobox": "<param>"} a parameter of the article's first infobox (historical-era infoboxes too, which the
                         extractor doesn't read)
  {"short": true}        the article's short description
  {"periodo": "<id>"}    a PeriodO period (~/data/periodo/periodo.json): the claim's year is the period's start (in a
                         start claim) or stop (in an end claim), or the edge "edge" names ("start"/"stop": an age that
                         ends where the next source's period starts); checked against the edge's label, cited to that
                         period's own PeriodO page, by period name, edge label and id. Such a claim names no article.
A new event's description ("descr") restates sentences of the cited articles, listed as its "basis"
([article, text]); each is found in the dump and cited after the date sources. The cited text must hold the year, or, for a claim read from centuries (it has a margin), the word "century". An
article that is missing or AI-flagged stops the run (wp_claims.art). An entry with "circa": true is circa even
without a margin ("around 1760").

  apply(data, timeline)  used by gen_medieval.py and gen_modern.py, after data['events'] is set and before
                         data['sources']: sets meta.eras, adds the new golden-age events, marks events key and redates
                         them. Existing events change here, as generator input, and never by hand in data-src.
  plan(timeline)         Ancient and Classical has no generator: pipelines/ancient/periods.py writes this as
                         data-src/ancient-classical-periods.json, which the build applies (scripts/lib/periods.ts).

An era links to a page about it (Era.url, schema v6) and carries its Wikidata id (Era.ids): the article named by its
"link" (its own article, given outright; none means no url). The id comes from the extract DB of the same dump (its qid table, from the
dump's page_props), so the build stays offline and matches the dump.

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
import rulings as RU  # noqa: E402
from wp_sections import find  # noqa: E402
import settings  # noqa: E402
import sqlite3  # noqa: E402

INPUT = os.path.join(HERE, 'periods.json')


def load():
    """periods.json, with a side given as {"ruling": id} replaced by that ruling's kept claims (rulings.json)."""
    p = json.load(open(INPUT, encoding='utf-8'))
    for x in (x for v in p.values() if isinstance(v, list) for x in v if isinstance(x, dict)):
        for side in ('start', 'end'):
            if isinstance(x.get(side), dict) and 'ruling' in x[side]:
                x[side] = [{'year': c['year'], 'article': c['page'], 'find': c['find'], **{k: c[k] for k in ('margin', 'note') if k in c}}
                           for c in RU.get(x[side]['ruling'])['kept']]
    return p


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


PERIODO = {}


def _periodo(pid):
    """(authority id, authority, period) for a PeriodO period id."""
    if not PERIODO:
        d = json.load(open(os.path.join(settings.DATA, 'periodo', 'periodo.json'), encoding='utf-8'))
        for aid, a in d['authorities'].items():
            for k, per in a.get('periods', {}).items():
                PERIODO[k] = (aid, a, per)
    if pid not in PERIODO:
        raise SystemExit(f'PeriodO: no period {pid}')
    return PERIODO[pid]


def _astro(year):
    """A claim's year ("2670 BCE" or 394) as an astronomical year (2670 BCE is -2669)."""
    if isinstance(year, int):
        return year
    return 1 - int(re.sub(r'\D', '', year))


def periodo_claim(c, side):
    """A date read from a PeriodO period: its start, or (in an end claim) its stop, unless "edge" names the other.
    Authorities write years two ways: in ISO years with a BC/BCE/AD label ("2670 BCE" is -2669), or as plain negative
    BC years ("-2300", "4200 BP (2000)" is -2200). So the claim's year must appear in the edge's own label (its digits,
    or for a BP label the year it works out to) and lie within a year of PeriodO's normalized year or range."""
    aid, a, per = _periodo(c['periodo'])
    edge = per[c.get('edge', 'start' if side == 'start' else 'stop')]
    label = edge.get('label', '')
    y = _astro(c['year'])
    span = edge.get('in', {})
    lo, hi = (int(span['year']),) * 2 if 'year' in span else (int(span['earliestYear']), int(span['latestYear']))
    digits = re.sub(r'\D', '', str(c['year']))
    bp = re.match(r'\s*(\d+)\s*BP\s*\((\d+)\)', label)
    in_label = digits in re.sub(r'(?<=\d),(?=\d{3})', '', label) or (bp and int(bp.group(2)) - int(bp.group(1)) == -int(digits))
    if not in_label or not (lo - 1 <= y <= hi + 1):
        raise SystemExit(f'PeriodO {c["periodo"]}: {side} edge is {label!r} ({lo}..{hi}), not {c["year"]}')
    # one source per period, so each citation opens that period's own PeriodO page
    key = f'periodo-{c["periodo"]}'
    src = a['source']
    title = src.get('title') or (src.get('partOf') or {}).get('title')
    name = (per.get('localizedLabels', {}).get('en') or [per.get('label', '')])[0]
    G.SOURCES.setdefault(key, {'name': f'{title}: {name} (PeriodO)', 'url': f'http://n2t.net/ark:/99152/{c["periodo"]}',
                               'accessed': G.ACC, 'tags': ['periodo']})
    word = 'start' if c.get('edge', 'start' if side == 'start' else 'stop') == 'start' else 'end'
    out = {'year': c['year'], 'source': {'sourceKey': key, 'sourceLocation': f'period "{name}", {word} "{label}" ({c["periodo"]})'}}
    for k in ('margin', 'note'):
        if k in c:
            out[k] = c[k]
    return out


def claim(c, side='start'):
    """One date claim: {year, source, margin?, note?}, its cited text checked against the dump (or PeriodO)."""
    if 'periodo' in c:
        return periodo_claim(c, side)
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
    text = re.sub(r'(?<=\d),(?=\d{3})', '', text)  # "7,000 BC" names 7000
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
    sd, ed = [claim(c, 'start') for c in x['start']], [claim(c, 'end') for c in x['end']]
    d = {'start': sd[0]['year'], 'end': ed[0]['year']}
    if x.get('circa') or 'margin' in x['start'][0] or 'margin' in x['end'][0]:
        d['circa'] = True
    d['startDates'], d['endDates'] = sd, ed
    refs = []
    for r in [sd[0]['source'], ed[0]['source']]:
        if r not in refs:
            refs.append(r)
    return d, refs


QID = {}


def qid(title):
    """The Wikidata id of an article, from the extract DB of the dump being read (None if it has none)."""
    if not QID:
        QID['db'] = sqlite3.connect(f'file:{settings.WIKIPEDIA}/extract-{settings.DUMP_NAME}.sqlite?mode=ro', uri=True)
    row = QID['db'].execute('select q.qid from page p join qid q using(page_id) where p.title = ? and p.ns = 0', (title,)).fetchone()
    return row[0] if row else None


def era(x):
    d, refs = _dated(x)
    e = {'id': x['id'], 'name': x['name'], 'group': x['group'], **d, 'sources': refs}
    if x.get('tracks'):
        e['tracks'] = x['tracks']  # schema v7: the region rows whose bands show the age (none: the top strip)
    # the age's own article only, named outright: never a dynasty or ruler page a date claim happens to cite
    link = x.get('link')
    if link:
        title = G.art(link)['title']
        e['url'] = G.WP + title.replace(' ', '_')
        q = qid(title)
        if q:
            e['ids'] = {'wikidata': q}
    return e


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
    if any(r['sourceKey'].startswith('periodo-') for x in eras for r in x['sources']):
        raise SystemExit(f'{timeline}: an era cites PeriodO; set PERIODO_TAG in the generator\'s tags first')
    if eras:
        data['meta']['eras'] = eras
        names = groups(p, eras)
        if names:
            data['meta']['eraGroups'] = names
    else:
        data['meta'].pop('eras', None)
        data['meta'].pop('eraGroups', None)
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
        if d.get('circa'):
            e['circa'] = True
        for r in refs:
            if r not in e['sources']:
                e['sources'].append(r)
    return {'eras': len(eras), 'new ages': len(new), 'key': len(p['key'].get(timeline, [])), 'redated': len(p['redate'].get(timeline, {}))}


def groups(p, eras):
    """meta.eraGroups for these eras: the names periods.json gives their groups (schema v7)."""
    used = {e['group'] for e in eras}
    return {g: v for g, v in p.get('groups', {}).items() if g in used}


# The tag a PeriodO source carries; a timeline citing one must define it (validate refuses unknown tags)
PERIODO_TAG = {'periodo': {'name': 'PeriodO'}}


def plan(timeline):
    """For a timeline without a generator: {eras, events, sources, tags}, the sources being those the eras and events
    cite, and tags those of the sources that the timeline may not define yet (PeriodO's)."""
    p = load()
    if p['key'].get(timeline) or p['redate'].get(timeline):
        raise SystemExit(f'periods.json: {timeline} has no generator; put its key events in its importance plan')
    eras = [era(x) for x in p['eras'] if timeline in x['timelines']]
    events = [age(x) for x in p['ages'] if x['timeline'] == timeline]
    keys = sorted({r['sourceKey'] for x in eras + events for r in x['sources'] + [c['source'] for c in x['startDates'] + x['endDates']]})
    out = {'eras': eras, 'events': events, 'sources': {k: G.SOURCES[k] for k in keys}}
    names = groups(p, eras)
    if names:
        out['eraGroups'] = names
    if any(k.startswith('periodo-') for k in keys):
        out['tags'] = PERIODO_TAG
    return out
