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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

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
    m = {k: v.get('low', v['value']) for k, v in c['measures'].items()}  # the low end of a sourced range: a key event needs the least toll the sources agree on
    if c.get('inlinks') is not None:
        m['inlinks'] = c['inlinks']  # conflicts: notability decides (the pilot reads no casualty figures)
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
    wide_used = set()
    war_rows = {}
    if kind == 'conflict':
        import placement
        ptable = placement.load()
        qids = {}
        for c in cands:  # combatant title -> its Wikidata item (the harvest wrote them in step)
            for t, q in zip(c['countries'], c.get('country_qids', [])):
                qids[t] = q
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
        if kind == 'conflict' and not ov.get('set', {}).get('startYear'):  # data protection: quoted start years more than 2 apart need a call
            ys = sorted({d['year'] for d in c['dates'] if d['side'] == 'start' and d['from'] == 'wikipedia'})
            if ys and ys[-1] - ys[0] > 2:
                review.append((c['title'], f'quoted start dates disagree ({", ".join(map(str, ys))}): withheld until an override picks one')); continue
        y = astro(s['year'])
        tl = next((t for t, (a, b) in rules['windows'].items() if (a is None or y >= a) and (b is None or y <= b)), None)
        if rules.get('emit') and tl not in rules['emit']:  # a timeline whose generator doesn't merge this kind yet (Ancient: no TS emitter)
            review.append((c['title'], f'{tl}: no emitter for this kind yet')); continue
        rows = []
        if kind == 'conflict':  # the conflicts rule: <= 3 countries -> each row; one region -> its row; wider -> the Wars row
            rows, how = placement.rows_for(c, tl, ptable, rules['wide_row']['id'], lambda t: qids.get(t))
            if rows == [rules['wide_row']['id']]:
                wide_used.add(tl)
            if not rows:
                review.append((c['title'], f'no row in {tl}: {how}')); continue
        else:
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
        if c.get('also') and c['also']['quotes']:  # a second category with the sentences it rests on (Bengal 1770: policy)
            ev['memberships'].append({'facet': 'category', 'value': c['also']['sub'],
                                      'sources': [ref({'locator': q['locator'], 'quote': q['quote']}) for q in c['also']['quotes']]})
        t_ = out.setdefault(tl, {'events': [], 'sources': {}})
        if kind == 'conflict' and c.get('wide'):
            # a named multi-region war: its own row under the Wars row, and a dated membership (the dashed "in <war>" strip) on every
            # participant that has a row. No schema change: a theme row plus memberOf (the Architect's note, 2026-11-23). Every
            # participant gets the war's whole span: joining and leaving dates (Italy 1915) need the war's own claims, a later round.
            war = slug(c['title'])
            ev['tracks'] = [war]
            span = {'start': y, 'startDates': [{'year': y, 'source': ev['sources'][0]}]}
            for k_ in ('startMonth', 'startDay'):
                if ev.get(k_):
                    span[k_] = ev[k_]
            if ev.get('end'):
                span.update({'end': ev['end'], 'endDates': [{'year': ev['end'], 'source': ev['sources'][-1]}]})
                for k_ in ('endMonth', 'endDay'):
                    if ev.get(k_):
                        span[k_] = ev[k_]
            war_rows.setdefault(tl, []).append({'id': war, 'name': title, 'color': rules['wide_row']['color'], 'kind': 'theme', 'parent': rules['wide_row']['id'],
                                                'url': 'https://en.wikipedia.org/wiki/' + c['wp']['title'].replace(' ', '_'), 'span': span})
            joined = {}
            pdates = c.get('participant_dates', {})
            for ents in c['participants'].values():
                for t in ents:
                    r = placement.country_row(ptable, tl, t, c.get('participant_qids', {}).get(t))
                    if r and r != war and (r not in joined or (pdates.get(t) and not pdates.get(joined[r]))):
                        joined[r] = t
            skipped = []
            for r, t in joined.items():
                qs = pdates.get(t) or []
                q = min(qs, key=lambda x: x.get('from', 0)) if qs else None  # the earliest record carries the source; the span spans all of them
                m = {'row': war, 'start': y, 'startDates': span['startDates'], 'sources': [ev['sources'][0]]}
                if ev.get('end'):
                    m.update({'end': ev['end'], 'endDates': span['endDates']})
                if q:  # a joining or leaving year quoted by the infobox or a member list: it replaces the war's own span for this participant
                    qskey = 'wp-' + slug(q.get('article') or c['wp']['title'])
                    t_['sources'].setdefault(qskey, {'name': f"{q.get('article') or c['wp']['title']} (Wikipedia)", 'url': 'https://en.wikipedia.org/wiki/' + (q.get('article') or c['wp']['title']).replace(' ', '_'),
                                                     'accessed': c['harvest']['at'], 'tags': ['wikipedia']})
                    qref = {'sourceKey': qskey, 'sourceLocation': (f"{q['locator']}: {q['quote']}" if q.get('locator') else q['quote'])}
                    st = min(x.get('from', y) for x in qs)
                    en = max(x.get('until', ev.get('end', st)) for x in qs) if (ev.get('end') or any('until' in x for x in qs)) else None
                    if st != y:
                        m.update({'start': st, 'startDates': [{'year': st, 'source': qref}], 'sources': [qref]})
                    if en is not None and en != ev.get('end'):
                        m.update({'end': en, 'endDates': [{'year': en, 'source': qref}]})
                        m['sources'] = [qref]
                if not placement.within_life(ptable, tl, r, m['start'], m.get('end')):  # the validator refuses a membership outside the row's lifespan
                    skipped.append(f"{r} ({m['start']}–{m.get('end')})")
                    continue
                t_.setdefault('rowEdits', {}).setdefault(r, []).append({'memberOf': m})
            if skipped:
                review.append((c['title'], 'no strip, outside the row\'s lifespan: ' + ', '.join(skipped)))
            joined = list(joined)
            ev['_joined'] = joined
        t_['events'].append(ev)
        t_['sources'][skey] = {'name': f"{c['wp']['title']} (Wikipedia)", 'url': 'https://en.wikipedia.org/wiki/' + c['wp']['title'].replace(' ', '_'),
                               'accessed': c['harvest']['at'], 'tags': ['wikipedia']}
    for tl in wide_used:
        w = rules['wide_row']
        out.setdefault(tl, {'events': [], 'sources': {}})['tracks'] = [{'id': w['id'], 'name': w['name'], 'color': w['color'], 'kind': 'theme'}] + war_rows.get(tl, [])
    cats = {'ancient-classical': 'ancient', 'medieval': 'medieval', 'modern-states': 'modern-states'}
    for tl, v in out.items():
        write_categories(os.path.join(HERE, '..', cats[tl], 'categories.json'), kind, v['events'])
        for x in v['events']:
            x.pop('_joined', None)
        v['events'].sort(key=lambda x: (x['start'], x['uuid']))
        json.dump({'note': f'Emitted by pipelines/v2/emit.py from the {kind} candidates; merged by the generators. Edit rules, places or overrides, not this file.', **v},
                  open(os.path.join(HERE, 'emitted', f'{kind}-{tl}.json'), 'w'), indent=1, ensure_ascii=False)
        open(os.path.join(HERE, 'emitted', f'{kind}-{tl}.json'), 'a').write('\n')
        print(f'{tl}: {len(v["events"])} events')
    for t, why in review:
        print('not emitted:', t, '-', why)


if __name__ == '__main__':
    main(sys.argv[1])
