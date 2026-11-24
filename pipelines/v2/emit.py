"""
Emitter (v2 contract): turns the harvested candidates of one kind into the event format of each timeline, from the rules,
the place -> row table and the overrides. Writes pipelines/v2/emitted/<kind>-<timeline>.json ({events, sources}), which the
generators merge (gen_modern, gen_medieval, scripts/ancient-classical/disasters.ts), like the frozen reigns.

    python3 -I pipelines/v2/emit.py disaster      # reads $TIMELINES_DATA/v2/candidates/disaster.jsonl + .headline.json

Per candidate: its headline start/end (consensus.py) picks the timeline (rules 'windows'); its countries' rows (places.json)
the rows; the type id the category; the measures the importance. Dates are astronomical years (1600 BCE is -1599). Every
date claim a quoted Wikipedia sentence gives, other than the headline, becomes an extra claim (the article's own
disagreement shows as uncertainty); Wikidata is not a source and appears nowhere in the events. A candidate with no quoted
date, no row in its timeline, or an override of "reject" is not emitted and is listed in the review file.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'extract'))
import dates  # noqa: E402  (stdlib only)

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.expanduser(os.environ.get('TIMELINES_DATA', '~/data'))
ACC = '2026-11-23'


def astro(y):
    return y + 1 if y < 0 else y


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def src_loc(claim):
    q = claim['quote']
    if '{{' in q:  # an infobox date template ({{Start date|1986|08|21}}) is shown as the date it gives
        q = dates.clean(q)
    return f"{claim['locator']}: {q}" if claim['locator'].startswith('infobox') else f"{claim['locator'].split(' ')[0]}: \"{q}\""


CLASSES = json.load(open(os.path.join(HERE, '..', 'common', 'disaster_classes.json')))
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


def when(x):
    y = x['year']
    yr = f'{-y} BCE' if y < 0 else str(y)
    return (f"{x['day']} " if x.get('day') else '') + (MONTHS[x['month'] - 1] + ' ' if x.get('month') else '') + yr


def describe(c, s, e):
    """A short description from the harvested facts only (no article sentence): type, place, date and the sourced measures.
    The Medieval generator runs it through the description check like every description."""
    name = CLASSES[c['sub']]['name']
    place = ', '.join(c['countries'][:3]) + (' and neighbouring countries' if len(c['countries']) > 3 else '')
    span = when(s) + (' to ' + when(e) if e else '')
    parts = [f"{name} in {place}, {'about ' if s.get('circa') else ''}{span}."]
    m = c['measures']
    if 'deaths' in m:
        d = m['deaths']
        parts.append(f"The sources give {d['low']:,.0f}" + (f" to {d['high']:,.0f}" if d['high'] != d['low'] else '') + ' deaths.')
    if 'magnitude' in m:
        parts.append(f"Magnitude {m['magnitude']['low']:g}" + (f" to {m['magnitude']['high']:g}" if m['magnitude']['high'] != m['magnitude']['low'] else '') + '.')
    if 'vei' in m:
        parts.append(f"Volcanic Explosivity Index {m['vei']['low']:g}.")
    return ' '.join(parts)


def importance(c, rules):
    m = {k: v.get('low', v['value']) for k, v in c['measures'].items()}  # the low end of a sourced range: a key event needs the least toll the sources agree on
    for r in rules.get('importance', []):
        k = next(k for k in r if k not in ('set',))
        op, val = r[k]
        if k in m and op == '>=' and m[k] >= val:
            return r['set']
    return None


def write_categories(path, kind, events):
    """The reviewed-overrides file of a timeline (pipelines/<gen>/categories.json) gets one line per emitted event, so the
    type the harvest read from the article's class wins over the keyword classifier (which called Lake Nyos an earthquake).
    Entries for the kind (uuid prefix) are replaced; the rest of the file stays as it is, byte for byte."""
    text = open(path).read()
    text = re.sub(r'\n\s*"' + kind + r'-[^"]*":\s*\[[^\]]*\],?', '', text)
    text = re.sub(r',(\s*\})\s*$', r'\1', text.rstrip() + '\n')
    compact = '": ["' in text
    body = ''.join(',\n' + (f' "{e["uuid"]}": [' + ', '.join(f'"{m["value"]}"' for m in e['memberships']) + ']' if compact else
                        f' "{e["uuid"]}": [\n  ' + ',\n  '.join(f'"{m["value"]}"' for m in e['memberships']) + '\n ]') for e in sorted(events, key=lambda e: e['uuid']))
    i = text.rstrip().rfind('}')
    open(path, 'w').write(text[:i].rstrip() + body + '\n}\n')


RANGE = __import__('re').compile(r'\d[\d,]*\.?\d*\s*(?:million)?\s*(?:–|—|-|to)\s*\d[\d,]*\.?\d*')


def check_measures(c):
    """Kevin (2026-11-23, data protection): a toll the source gives as a range keeps both ends. A measure whose quote holds a
    range, or several records, but whose low and high are the same is refused (a collapsed range)."""
    bad = []
    for k, v in c['measures'].items():
        many = sum(1 for n in v.get('all', []) if n >= 1000) >= 2 and k == 'deaths'
        if (RANGE.search(v['quote']) or many) and v['low'] == v['high'] and not (k != 'deaths' and not RANGE.search(v['quote'])):
            bad.append(f"{k}: quote {v['quote']!r} holds a range but low = high = {v['low']:g}")
    return bad


def main(kind):
    rules = json.load(open(os.path.join(HERE, 'rules', f'{kind}s.json')))
    places = json.load(open(os.path.join(HERE, 'places.json')))['places']
    over = {k: v for k, v in json.load(open(os.path.join(HERE, 'overrides', f'{kind}s.json'))).items() if not k.startswith('_')}
    cands = [json.loads(l) for l in open(os.path.join(DATA, 'v2', 'candidates', f'{kind}.jsonl'))]
    heads = json.load(open(os.path.join(DATA, 'v2', 'candidates', f'{kind}.headline.json')))
    out, review = {}, []
    for c in cands:
        collapsed = check_measures(c)
        if collapsed:
            raise SystemExit(f"{c['title']}: " + '; '.join(collapsed))
        key = c['qid'] or c['title']
        h = heads.get(key, {})
        ov = over.get(c['qid'] or '', {})
        s, e = h.get('start'), h.get('end')
        if ov.get('action') == 'reject':
            review.append((c['title'], 'rejected by override: ' + ov.get('why', ''))); continue
        if not s:
            review.append((c['title'], 'no quoted date')); continue
        if ov.get('set', {}).get('startYear'):  # a reviewed headline: the quoted claim with that year (the others stay claims)
            pick = next((d for d in c['dates'] if d['side'] == 'start' and d['from'] == 'wikipedia' and d['year'] == ov['set']['startYear']), None)
            if not pick:
                review.append((c['title'], f"override startYear {ov['set']['startYear']} has no quoted claim")); continue
            s = {'year': pick['year'], 'month': pick.get('month'), 'day': pick.get('day'), 'circa': pick.get('circa', False),
                 'locator': pick['locator'], 'quote': pick['quote']}
        y = astro(s['year'])
        tl = next((t for t, (a, b) in rules['windows'].items() if (a is None or y >= a) and (b is None or y <= b)), None)
        rows = []
        for q in c['places']:
            for r in places.get(q, {}).get('rows', {}).get(tl, []):
                if r not in rows:
                    rows.append(r)
        if not rows:
            review.append((c['title'], f'no row in {tl} for {", ".join(c["countries"])}')); continue
        title = c.get('label') or c['title']
        ev = {'uuid': f'{kind}-{slug(c["wp"]["title"])}', 'title': title, 'descr': '', 'start': y, 'tracks': rows}
        if s.get('month'):
            ev['startMonth'] = s['month']
        if s.get('day'):
            ev['startDay'] = s['day']
        if e and astro(e['year']) != y:
            ev['end'] = astro(e['year'])
            if e.get('month'):
                ev['endMonth'] = e['month']
            if e.get('day'):
                ev['endDay'] = e['day']
        if s.get('circa'):
            ev['circa'] = True
        skey = 'wp-' + slug(c['wp']['title'])
        ref = lambda cl: {'sourceKey': skey, 'sourceLocation': src_loc(cl)}
        ev['sources'] = [ref({'locator': s['locator'], 'quote': s['quote']})]
        if e and e['locator'] != s['locator']:
            ev['sources'].append(ref({'locator': e['locator'], 'quote': e['quote']}))
        # the article's other years for the start: its own disagreement, as extra claims
        extra = [d for d in c['dates'] if d['side'] == 'start' and d['from'] == 'wikipedia' and d['year'] != s['year']]
        if extra:
            ev['startDates'] = [{'year': y, 'source': ev['sources'][0]}] + [
                {'year': astro(d['year']), 'source': ref(d), 'note': 'The same article gives this year too.'} for d in extra]
        extra_end = [d for d in c['dates'] if d['side'] == 'end' and d['from'] == 'wikipedia' and e and d['year'] != e['year']]
        if extra_end and 'end' in ev:
            ev['endDates'] = [{'year': ev['end'], 'source': ev['sources'][-1]}] + [
                {'year': astro(d['year']), 'source': ref(d), 'note': 'The same article gives this year too.'} for d in extra_end]
        ev['descr'] = describe(c, s, e)
        imp = ov.get('set', {}).get('importance') or importance(c, rules)
        if imp:
            ev['importance'] = imp
        ev['memberships'] = [{'facet': 'category', 'value': c['sub'], 'sources': ev['sources'][:1]}]
        if c.get('also') and c['also']['quotes']:  # a second category with the sentences it rests on (Bengal 1770: policy)
            ev['memberships'].append({'facet': 'category', 'value': c['also']['sub'],
                                      'sources': [ref({'locator': q['locator'], 'quote': q['quote']}) for q in c['also']['quotes']]})
        t_ = out.setdefault(tl, {'events': [], 'sources': {}})
        t_['events'].append(ev)
        t_['sources'][skey] = {'name': f"{c['wp']['title']} (Wikipedia)", 'url': 'https://en.wikipedia.org/wiki/' + c['wp']['title'].replace(' ', '_'),
                               'accessed': c['harvest']['at'], 'tags': ['wikipedia']}
    cats = {'ancient-classical': 'ancient', 'medieval': 'medieval', 'modern-states': 'modern-states'}
    for tl, v in out.items():
        write_categories(os.path.join(HERE, '..', cats[tl], 'categories.json'), kind, v['events'])
        v['events'].sort(key=lambda x: (x['start'], x['uuid']))
        json.dump({'note': f'Emitted by pipelines/v2/emit.py from the {kind} candidates; merged by the generators. Edit rules, places or overrides, not this file.', **v},
                  open(os.path.join(HERE, 'emitted', f'{kind}-{tl}.json'), 'w'), indent=1, ensure_ascii=False)
        open(os.path.join(HERE, 'emitted', f'{kind}-{tl}.json'), 'a').write('\n')
        print(f'{tl}: {len(v["events"])} events')
    for t, why in review:
        print('not emitted:', t, '-', why)


if __name__ == '__main__':
    main(sys.argv[1])
