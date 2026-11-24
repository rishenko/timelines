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

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.expanduser(os.environ.get('TIMELINES_DATA', '~/data'))
ACC = '2026-11-23'


def astro(y):
    return y + 1 if y < 0 else y


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def src_loc(claim):
    q = claim['quote']
    return f"{claim['locator']}: {q}" if claim['locator'].startswith('infobox') else f"{claim['locator'].split(' ')[0]}: \"{q}\""


def importance(c, rules):
    m = {k: v['value'] for k, v in c['measures'].items()}
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
    body = ''.join(',\n' + (f' "{e["uuid"]}": ["{e["memberships"][0]["value"]}"]' if compact else
                        f' "{e["uuid"]}": [\n  "{e["memberships"][0]["value"]}"\n ]') for e in sorted(events, key=lambda e: e['uuid']))
    i = text.rstrip().rfind('}')
    open(path, 'w').write(text[:i].rstrip() + body + '\n}\n')


def main(kind):
    rules = json.load(open(os.path.join(HERE, 'rules', f'{kind}s.json')))
    places = json.load(open(os.path.join(HERE, 'places.json')))['places']
    over = {k: v for k, v in json.load(open(os.path.join(HERE, 'overrides', f'{kind}s.json'))).items() if not k.startswith('_')}
    cands = [json.loads(l) for l in open(os.path.join(DATA, 'v2', 'candidates', f'{kind}.jsonl'))]
    heads = json.load(open(os.path.join(DATA, 'v2', 'candidates', f'{kind}.headline.json')))
    out, review = {}, []
    for c in cands:
        key = c['qid'] or c['title']
        h = heads.get(key, {})
        ov = over.get(c['qid'] or '', {})
        s, e = h.get('start'), h.get('end')
        if ov.get('action') == 'reject':
            review.append((c['title'], 'rejected by override: ' + ov.get('why', ''))); continue
        if not s:
            review.append((c['title'], 'no quoted date')); continue
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
        imp = ov.get('set', {}).get('importance') or importance(c, rules)
        if imp:
            ev['importance'] = imp
        ev['memberships'] = [{'facet': 'category', 'value': c['sub'], 'sources': ev['sources'][:1]}]
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
