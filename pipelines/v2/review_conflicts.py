"""
Review file for the conflicts pilot (v2 contract: one review file per pass, with the parity table).

    python3 -I pipelines/v2/review_conflicts.py OUT.md

Reads the candidates and headline dates ($TIMELINES_DATA/v2/candidates), the emitted events (pipelines/v2/emitted) and, from git
(origin/main), the timelines' existing events (to find a battle that is already there). Writes: the parity table, the region x era
balance table, the title-year check (a count the source states, here the years in a title like "Siege of Calais (1346-1347)" and
"Thirty Years' War"), the duplicate check, every event with its quoted date, rows and rank, the cut line of each country, and
the questions for Kevin.
"""
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
DATA = os.path.expanduser(os.environ.get('TIMELINES_DATA', '~/data'))
ERAS = {'ancient-classical': 'Ancient (< 650)', 'medieval': 'Medieval (650–1499)', 'modern-states': 'Modern (≥ 1500)'}
REGIONS = ['Europe', 'West Asia and Anatolia', 'South Asia', 'Africa', 'Other / several', 'Wars row (several regions)']


def region_of(group):
    g = (group or '').lower()
    if any(x in g for x in ('europe', 'britain', 'iberia', 'balkan', 'scandinav', 'france')):
        return 'Europe'
    if any(x in g for x in ('africa', 'horn', 'sahara', 'nile', 'maghreb')):
        return 'Africa'
    if any(x in g for x in ('southern-asia', 'south-asia', 'india')):
        return 'South Asia'
    if any(x in g for x in ('western-asia', 'anatolia', 'near-east', 'iran', 'arabia', 'levant', 'caucasus')):
        return 'West Asia and Anatolia'
    return 'Other / several'


def norm(t):
    return re.sub(r'[^a-z0-9 ]', '', re.sub(r'\s*\(.*?\)', '', t.lower())).strip()


def main(out):
    rows = [json.loads(l) for l in open(os.path.join(DATA, 'v2', 'candidates', 'conflict.jsonl'))]
    heads = json.load(open(os.path.join(DATA, 'v2', 'candidates', 'conflict.headline.json')))
    man = json.load(open(os.path.join(DATA, 'v2', 'candidates', 'conflict.manifest.json')))
    pilot = json.load(open(os.path.join(HERE, 'pilot-conflicts.json')))
    gen = json.load(open(os.path.join(HERE, 'places.generated.json')))['places']
    parent = {(tl, r['row']): r['parent'] for v in gen.values() for tl, rs in v['rows'].items() for r in rs}
    cand = {c['title']: c for c in rows}
    emitted = {}
    for tl in ERAS:
        p = os.path.join(HERE, 'emitted', f'conflict-{tl}.json')
        if os.path.exists(p):
            for e in json.load(open(p))['events']:
                emitted[e['uuid']] = (tl, e)
    L = ['---', 'created: 2026-11-23', 'tags: [workbench]', 'related:', '  - "[[2026-11-22 Timelines team hub]]"', '---',
         '# Timelines: conflicts pilot, for review', '',
         "Dev B, branch `conflicts-pilot` (off `disasters-pilot`; v2 kind `conflict`). **Review file and preview only; nothing merges.** "
         "Battles are events, ranked by main combatant (the country is the first entry of a combatant column in the infobox) and then by inlinks; "
         "a country's picks per timeline are capped at " + str(pilot['per_timeline']) + ". Placement (Kevin's conflicts rule): ≤ 3 countries (the main combatants) → each country's row; "
         "more than three but one region → the region row; wider, or a named multi-region war → the top-level **Wars** row. "
         "Dates are quoted headline dates (the verbatim sentence or infobox field); a page with an AI-generated-text notice is refused; "
         "quoted start years more than 2 apart withhold an event until a call is made.", '']
    # parity
    L += ['## Parity (kind × timeline)', '', '| Timeline | Picked by the harvest | Emitted | Withheld or unplaced |', '|---|---|---|---|']
    pick = Counter()
    for c in rows:
        h = heads.get(c['qid'] or c['title'], {}).get('start')
        if h:
            y = h['year'] + 1 if h['year'] < 0 else h['year']
            tl = 'ancient-classical' if y <= 649 else 'medieval' if y <= 1499 else 'modern-states'
            pick[tl] += 1
    em = Counter(tl for tl, _ in emitted.values())
    for tl, name in ERAS.items():
        note = ' (Ancient has no emitter for v2 kinds yet: its picks are listed under "not emitted" below)' if tl == 'ancient-classical' else ''
        L.append(f'| {name} | {pick[tl]} | {em[tl]}{note} | {pick[tl] - em[tl]} |')
    L += ['', 'Pool sizes behind the picks (every battle in the infobox index whose first entry in a column is the country, plus its categories):', '',
          '| Country | Read | Medieval pool (main) | Modern pool (main) |', '|---|---|---|---|']
    for cid, v in man['countries'].items():
        m, mo = v.get('medieval', {}), v.get('modern-states', {})
        L.append(f"| {cid} | {v['read']} | {m.get('candidates', 0)} ({m.get('main', 0)}) | {mo.get('candidates', 0)} ({mo.get('main', 0)}) |")
    # balance
    bal = defaultdict(Counter)
    for u, (tl, e) in emitted.items():
        rowsx = e['tracks']
        reg = 'Wars row (several regions)' if rowsx == ['wars'] else region_of(parent.get((tl, rowsx[0])) if (tl, rowsx[0]) in parent else rowsx[0])
        bal[reg][tl] += 1
    L += ['', '## Region × era balance (by the first row an event lands on)', '', '| Region | ' + ' | '.join(ERAS.values()) + ' | Total |', '|---|---|---|---|---|']
    for reg in REGIONS:
        L.append(f'| {reg} | ' + ' | '.join(str(bal[reg][tl]) for tl in ERAS) + f' | {sum(bal[reg].values())} |')
    L += ['', "The pilot's four countries decide the regions (France: Europe; Ottoman Empire: West Asia and Anatolia, with its European battles; Mughal Empire: South Asia; Ethiopia: Africa), "
          "so East Asia, the Americas and Oceania are empty by construction. They need their own countries in the next round (China, Japan, Mexico or the Aztec and Inca states, Korea, Vietnam, Mali).", '']
    # title-year check
    L += ['## Counts a source states: years in a title against the headline dates', '']
    bad = []
    for u, (tl, e) in emitted.items():
        c = next((x for x in rows if f'conflict-' + re.sub(r'[^a-z0-9]+', '-', x['wp']['title'].lower()).strip('-') == u), None)
        if not c:
            continue
        m = re.search(r'\((\d{3,4})(?:\s*[–-]\s*(\d{3,4}))?\)', c['title'])
        if m:
            a, b = int(m[1]), int(m[2]) if m[2] else None
            ok = e['start'] == a and (b is None or e.get('end', e['start']) == b)
            if not ok:
                bad.append(f"{c['title']}: title says {a}{'–' + str(b) if b else ''}, event is {e['start']}{'–' + str(e['end']) if e.get('end') else ''}")
    tyw = emitted.get('conflict-thirty-years-war')
    if tyw:
        t = tyw[1]
        L.append(f"- Thirty Years' War: the title states 30 years; the event runs {t['start']}–{t.get('end', t['start'])}, "
                 f"{t.get('end', t['start']) - t['start']} years ({'matches' if t.get('end', t['start']) - t['start'] == 30 else 'DOES NOT MATCH'}).")
    L.append(f"- Years in titles ({sum(1 for _ in emitted)} events checked): " + ('all match the headline dates.' if not bad else 'MISMATCHES: ' + '; '.join(bad)))
    L.append('- Events carry no descriptions and no casualty figures, so no count appears in event text; the harvest reads none (a later round reads infobox casualties with ranges kept, as the disasters pilot does).')
    # wars: rows and strips
    L += ['', '## The Wars row and the dashed "in <war>" strips', '']
    for tl in ERAS:
        p = os.path.join(HERE, 'emitted', f'conflict-{tl}.json')
        if not os.path.exists(p):
            continue
        d = json.load(open(p))
        wars = [t for t in d.get('tracks', []) if t.get('parent')]
        for w in wars:
            who = sorted(r for r, eds in d.get('rowEdits', {}).items() if any(e['memberOf']['row'] == w['id'] for e in eds))
            sp = w['span']
            L.append(f"- **{w['name']}** ({tl}): a theme row under the top-level Wars row, {sp['start']}–{sp.get('end', '?')}; dashed strips on {len(who)} participant rows: {', '.join(who)}. "
                     "Every participant gets the war's whole span (no joining or leaving dates yet).")
    L.append("- **Who is a participant is deliberate and source-bound:** only the entries the war article's own infobox names (all its combatant columns, including later alliances such as France from 1635), mapped to the timeline's rows (a successor article such as German Empire or Dutch Republic counts for its country's row, by the `row_aliases` table in `pilot-conflicts.json`). "
             "Nothing comes from memory. Two limits follow: an entry with no row in the timeline is left out, and the infobox of a large war says \"and others\": WWI's lists only the major states (Allies: France, the British Empire and its dominions, Russia, Italy, the United States, Japan; Central Powers: Germany, Austria-Hungary, the Ottoman Empire, Bulgaria), so Serbia, Belgium, Romania, Greece, Montenegro and Portugal, who fought on the Allied side, get no strip yet. "
             "The fix is a second quoted source per war (the Allies of World War I member list, with each state's joining and leaving dates), which also gives the strips their own dates; recommended for the wars pass.")
    L.append('- No schema change is needed (the Architect\'s note): a `theme` row plus dated `memberOf`. Sides (Allies / Axis, side switches) would need an optional `role` on `memberOf` (v10); not built.')
    # duplicates with existing events
    L += ['', '## Already on a timeline?', '']
    dup = []
    for tl in ERAS:
        try:
            ex = json.loads(subprocess.check_output(['git', '-C', ROOT, 'show', f'origin/main:public/timelines/{tl}.json']))['events']
        except Exception:
            continue
        idx = defaultdict(list)
        for e in ex:
            idx[norm(e['title'])].append(e)
        for u, (t2, e) in emitted.items():
            if t2 != tl:
                continue
            for o in idx.get(norm(e['title']), []):
                if abs(o['start'] - e['start']) <= 1:
                    dup.append(f"{e['title']} ({e['start']}) is already {o['uuid']!r} ({o['title']}, {o['start']}) on {tl}")
    L += [f'- {d}' for d in dup] or ['- None of the emitted events has a same-titled event within a year on main.']
    # events
    L += ['', '## The events (quoted headline date, rows, rank)', '', '| Year | Event | Rows | Why those rows | Rank (main, inlinks) | Quoted date | Location |', '|---|---|---|---|---|---|---|']
    for u, (tl, e) in sorted(emitted.items(), key=lambda x: (x[1][1]['start'], x[0])):
        c = next((x for x in rows if 'conflict-' + re.sub(r'[^a-z0-9]+', '-', x['wp']['title'].lower()).strip('-') == u), None)
        if not c:
            continue
        h = heads.get(c['qid'] or c['title'], {}).get('start') or {}
        q = (h.get('quote') or '')[:90].replace('|', '/')
        why = 'named wide war: Wars row' if c.get('wide') else f"{len(c['countries'])} main combatant(s): {', '.join(c['countries'][:3])}"
        L.append(f"| {e['start']}{'–' + str(e['end']) if e.get('end') else ''} | {e['title']} | {', '.join(e['tracks'])} | {why} | {c.get('main')}, {c.get('inlinks')} | {h.get('locator', '')}: {q} | {c.get('location', '')[:60].replace('|', '/')} |")
    # cut lines
    L += ['', '## The cut line (the next battles that did not make the top picks)', '']
    for k, v in man['cut line'].items():
        L.append(f"- {k}: " + ('; '.join(f"{x[0]} (inlinks {x[2]})" if isinstance(x, list) else x for x in v) if v else '(none left)'))
    L += ['', '## Not emitted', '']
    emitted_titles = {e['title'] for _, e in emitted.values()}
    for c in sorted(rows, key=lambda c: c['title']):
        if c['title'] not in emitted_titles and (c.get('label') or c['title']) not in emitted_titles:
            h = heads.get(c['qid'] or c['title'], {}).get('start') or {}
            ys = sorted({d['year'] for d in c['dates'] if d['side'] == 'start' and d['from'] == 'wikipedia'})
            why = 'its quoted start dates disagree (' + ', '.join(map(str, ys)) + '): needs a call' if ys and ys[-1] - ys[0] > 2 else 'Ancient: no emitter for this kind yet' if h.get('year', 9999) <= 649 else 'no row'
            L.append(f"- {c['title']} ({h.get('year', '?')}): {why}")
    L += ['', '## Questions for Kevin', '',
          "1. **Rank by inlinks favours the famous.** It picks Crécy, Agincourt, Waterloo, Lepanto, Vienna 1683, Adwa: the right battles, but from the English-language article graph. A regional-scholarship check (as for the landmarks) would be the next step. (a, recommended) keep the rule for the pilot and add a per-region quota in the next round; (b) add a curated list per country.",
          "2. **Wars are not ranked as events here.** Titles with war, conflict, crusade, revolt, resistance or insurgency are left to the named multi-region wars (Thirty Years' War, WWI, built as war rows with strips) and to a later wars pass; so the Hundred Years' War, Napoleonic Wars and the Italo-Ethiopian wars are absent. (a, recommended) a wars pass with the same row-and-strip build for every war that is not confined to one region, with joining and leaving dates from each war's own text; (b) include wars as events on the country rows now.",
          "3. **Importance** comes from inlinks (400 or more = key), since the pilot reads no casualty figures. (a, recommended) keep; (b) read infobox casualties like the disasters pilot.",
          "4. **Ancient** has 6 emitted events (Aksum, Sasanians, Himyar) but no emitter for v2 kinds, so they are not in the preview; the disasters' Ancient merge is a TypeScript script. (a, recommended) a small script in the next round, before the bulk run.", '']
    open(out, 'w').write('\n'.join(L) + '\n')
    print(f'wrote {out}')


if __name__ == '__main__':
    main(sys.argv[1])
