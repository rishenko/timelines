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
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gvp_second  # noqa: E402

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
    if c.get('inlinks') is not None:
        m['inlinks'] = c['inlinks']  # conflicts: notability decides (the pilot reads no casualty figures)
    for r in rules.get('importance', []):
        k = next(k for k in r if k not in ('set',))
        op, val = r[k]
        if k in m and op == '>=' and m[k] >= val:
            return r['set']
    return None


_MAIN = {}


def main_events(tl):
    """(events, wikipedia titles by event uuid) of timeline `tl` on origin/main (compiled), for the already-there check; ([], {}) if git has no such ref."""
    if tl not in _MAIN:
        import subprocess
        try:
            raw = subprocess.run(['git', 'show', f'origin/main:public/timelines/{tl}.json'], capture_output=True, text=True, check=True,
                                 cwd=os.path.join(HERE, '..', '..')).stdout
            d = json.loads(raw)
            arts = {}
            for e in d['events']:
                for r in e.get('sources', []):
                    u = (d.get('sources', {}).get(r.get('sourceKey') if isinstance(r, dict) else r, {}) or {}).get('url', '')
                    m = re.search(r'wikipedia\.org/wiki/([^#?]+)', u)
                    if m:
                        arts.setdefault(e['uuid'], set()).add(norm_title(m.group(1).replace('_', ' ')))
            _MAIN[tl] = (d['events'], arts)
        except Exception:
            _MAIN[tl] = ([], {})
    return _MAIN[tl]


def norm_title(t):
    """The duplicates guard's title form: dashes as separators, accents and a bracketed part dropped (pipelines/common/duplicates_guard.py)."""
    import unicodedata
    t = re.sub(r'[\u2010-\u2015\u2212/]', ' ', t)
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', re.sub(r'\(.*?\)', '', t)).strip()


_GENERIC = {'war', 'wars', 'rebellion', 'rebellions', 'conquest', 'conquests', 'invasion', 'invasions', 'battle', 'siege', 'of', 'and', 'the', 'in', 'to'}


def title_key(t):
    """The content words of a title, diacritics and plural endings removed: "Ōnin War" -> {onin}; "Red Turban Rebellions" -> {red, turban}."""
    import unicodedata
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return {w[:-1] if w.endswith('s') and len(w) > 3 else w for w in re.findall(r'[a-z0-9]+', t) if w not in _GENERIC}


def already_there(title, year, tl, article=None):
    """An event of main that is the same one: it is dated from the same Wikipedia article, or its title is the same (accents, dashes and a bracketed
    part ignored), or the title words are the same or one set inside the other with at least two words (Red Turban Rebellion / Rebellions, Fatimid
    conquest of Egypt / ... and foundation of Cairo); and it starts within 2 years. Returns that event or None. The test
    scripts/lib/conflict-duplicates.test.ts applies the title rule to the compiled timelines."""
    events, arts = main_events(tl)
    a, n = title_key(title), norm_title(title)
    art = norm_title(article) if article else None
    for o in events:
        if abs(o['start'] - year) > 2:
            continue
        b = title_key(o['title'])
        if (art and art in arts.get(o['uuid'], ())) or norm_title(o['title']) == n or (a and b and (a == b or (min(len(a), len(b)) >= 2 and (a <= b or b <= a)))):
            return o
    return None


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
    out, review, acct = {}, [], {}
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
        shared = None
        if kind == 'conflict':
            shared = already_there(title, y, tl, c['wp']['title'])
            if shared and not c.get('wide'):  # the same event is already on main, on its combatants' rows: no second copy
                review.append((c['title'], f"already on {tl} as {shared['uuid']!r} ({shared['title']}, {shared['start']}): not emitted again")); continue
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
        g = gvp_second.source(c['wp']['title'])  # a second source for a volcano event: the GVP eruption record (cite-only)
        if g:
            gref = {'sourceKey': g[0], 'sourceLocation': g[2]}
            ev['sources'].append(gref)
            if g[3] != y:  # GVP's start year differs from the headline: a claim with GVP's own +/- as the margin
                ev.setdefault('startDates', [{'year': y, 'source': ev['sources'][0]}])
                ev['startDates'].append({'year': g[3], **({'margin': g[4]} if g[4] else {}), 'source': gref, 'note': "The GVP record's start year."})
        if kind != 'conflict':  # conflicts keep their own description (set above)
            ev['descr'] = describe(c, s, e)
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
                    if r and r != war and (r not in joined or (pdates.get(t) and not pdates.get(joined[r])) or (pdates.get(t) and pdates.get(joined[r]) and min(x.get('from', 9999) for x in pdates[t]) < min(x.get('from', 9999) for x in pdates[joined[r]]))):  # one row, several entries: the earliest dated one
                        joined[r] = t
            skipped, withheld = [], []
            principals = {ents[0] for col, ents in c['participants'].items() if col in ('1', '2', '3') and ents}  # the first entry of each side
            for r, t in joined.items():
                qs = pdates.get(t) or []
                if rules.get('withhold_undated_nonprincipal', True) and not qs and t not in principals:  # no joining year of its own: the war's span would overstate it
                    withheld.append(r)
                    continue
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
                    st = max(st, y)  # a range quoted for the state itself ("Republic of China (1912–1949)") is not a joining year: stay inside the war
                    if en is not None and ev.get('end'):
                        en = min(en, ev['end'])
                    if st != y:
                        m.update({'start': st, 'startDates': [{'year': st, 'source': qref}], 'sources': [qref]})
                    if en is not None and en != ev.get('end'):
                        m.update({'end': en, 'endDates': [{'year': en, 'source': qref}]})
                        m['sources'] = [qref]
                if not placement.within_life(ptable, tl, r, m['start'], m.get('end')):  # the validator refuses a membership outside the row's lifespan
                    skipped.append(f"{r} ({m['start']}–{m.get('end')})")
                    continue
                t_.setdefault('rowEdits', {}).setdefault(r, []).append({'memberOf': m})
            names = list(dict.fromkeys(t for ents in c['participants'].values() for t in ents))
            mapped = {t: placement.country_row(ptable, tl, t, c.get('participant_qids', {}).get(t)) for t in names}
            acct.setdefault(c['title'], {})[tl] = {'entries read': len(names), 'with a row here': sum(1 for r in mapped.values() if r and r != war),
                                                   'rows with a strip': len(joined) - len(skipped) - len(withheld), 'withheld (undated, not a principal)': withheld, 'skipped (outside the row\'s lifespan)': skipped,
                                                   'no row in this timeline': [t for t, r in mapped.items() if not r or r == war]}
            if skipped:
                review.append((c['title'], 'no strip, outside the row\'s lifespan: ' + ', '.join(skipped)))
            joined = list(joined)
            ev['_joined'] = joined
        if shared:  # a named multi-region war already on main: its Wars row joins the existing event, no second event
            t_.setdefault('eventEdits', {})[shared['uuid']] = {'addTracks': list(ev['tracks'])}
            review.append((c['title'], f"shares main's {shared['uuid']!r}: its war row is added to that event's rows"))
        else:
            t_['events'].append(ev)
        if g:
            t_['sources'][g[0]] = g[1]
        t_['sources'][skey] = {'name': f"{c['wp']['title']} (Wikipedia)", 'url': 'https://en.wikipedia.org/wiki/' + c['wp']['title'].replace(' ', '_'),
                               'accessed': c['harvest']['at'], 'tags': ['wikipedia']}
    for tl in wide_used:
        w = rules['wide_row']
        out.setdefault(tl, {'events': [], 'sources': {}})['tracks'] = [{'id': w['id'], 'name': w['name'], 'color': w['color'], 'kind': 'theme'}] + war_rows.get(tl, [])
    for tl, v in out.items():
        for x in v['events']:
            x.pop('_joined', None)
        v['events'].sort(key=lambda x: (x['start'], x['uuid']))
        json.dump({'note': f'Emitted by pipelines/v2/emit.py from the {kind} candidates; merged by the generators. Edit rules, places or overrides, not this file.', **v},
                  open(os.path.join(HERE, 'emitted', f'{kind}-{tl}.json'), 'w'), indent=1, ensure_ascii=False)
        open(os.path.join(HERE, 'emitted', f'{kind}-{tl}.json'), 'a').write('\n')
        print(f'{tl}: {len(v["events"])} events')
    if acct:
        json.dump(acct, open(os.path.join(HERE, 'emitted', f'{kind}-wars.json'), 'w'), indent=1, ensure_ascii=False)
        open(os.path.join(HERE, 'emitted', f'{kind}-wars.json'), 'a').write('\n')
    for t, why in review:
        print('not emitted:', t, '-', why)


if __name__ == '__main__':
    main(sys.argv[1])
