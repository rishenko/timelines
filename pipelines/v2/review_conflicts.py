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
REGIONS = ['Europe', 'West Asia and Anatolia', 'South Asia', 'East and Central Asia', 'Africa', 'Americas', 'Southeast Asia', 'Oceania', 'Other / several', 'Wars row (several regions)']


def region_of(group):
    g = (group or '').lower()
    if any(x in g for x in ('southeast', 'south-east', 'se-asia', 'mainland-se', 'maritime-se', 'indochina', 'vietnam', 'thai', 'siam', 'burma', 'indonesia', 'philippin')):
        return 'Southeast Asia'
    if any(x in g for x in ('america', 'mexic', 'andes', 'caribbean', 'aztec', 'inca', 'mesoamer')):
        return 'Americas'
    if any(x in g for x in ('oceania', 'australia', 'pacific', 'polynesia', 'zealand')):
        return 'Oceania'
    if any(x in g for x in ('europe', 'britain', 'iberia', 'balkan', 'scandinav', 'france')):
        return 'Europe'
    if any(x in g for x in ('africa', 'horn', 'sahara', 'nile', 'maghreb')):
        return 'Africa'
    if any(x in g for x in ('southern-asia', 'south-asia', 'india', 'indus')):
        return 'South Asia'
    if any(x in g for x in ('china', 'korea', 'japan', 'eastern-asia', 'east-asia', 'steppe', 'tibet', 'mongol')):
        return 'East and Central Asia'
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
    gen = json.load(open(os.path.join(os.path.expanduser(os.environ.get('TIMELINES_DATA', '~/data')), 'v2', 'places.generated.json')))['places']
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
        reg, cur = 'Other / several', rowsx[0]
        for _ in range(6):  # climb the row's groups until one names a region
            p = parent.get((tl, cur))
            if p == 'wars' or cur == 'wars':
                reg = 'Wars row (several regions)'
                break
            reg = region_of(p) if p else region_of(cur)
            if reg != 'Other / several' or not p:
                break
            cur = p
        bal[reg][tl] += 1
    L += ['', '## Region × era balance (by the first row an event lands on)', '', '| Region | ' + ' | '.join(ERAS.values()) + ' | Total |', '|---|---|---|---|---|']
    for reg in REGIONS:
        L.append(f'| {reg} | ' + ' | '.join(str(bal[reg][tl]) for tl in ERAS) + f' | {sum(bal[reg].values())} |')
    L += ['', "Regions come from each row's parent group; a battle counts under the first row it lands on. Every country in the pilot list has K=3 per timeline (the original eight: 6), so a region's total follows how many of its countries have documented battles in that era. Maurya India has two candidate articles and no quoted date, so it has no event. Any region left at 0 in an era is listed in the questions as a gap, not filled by hand.", '']
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
                     "A participant's strip carries the joining or leaving year the infobox or member list quotes for it, else the war's own span.")
    wp_ = os.path.join(HERE, 'emitted', 'conflict-wars.json')
    if os.path.exists(wp_):
        L += ['', 'Strip accounting (every entry the source names is either on a row with a strip, skipped with its reason, or has no row in that timeline):', '',
              '| War | Timeline | Entries read | Side lists (lines naming a state / entries read) | Have a row | Strips | Withheld (undated, not a principal) | Skipped (lifespan) | No row here |', '|---|---|---|---|---|---|---|---|---|']
        for war_, tls in json.load(open(wp_)).items():
            for tl_, a_ in tls.items():
                L.append(f"| {war_} | {tl_} | {a_['entries read']} | {'; '.join(k + ': ' + v for k, v in a_.get('side list check', {}).items()) or '-'} | {a_['with a row here']} | {a_['rows with a strip']} | {', '.join(a_.get('withheld (undated, not a principal)', [])) or '-'} | {', '.join(a_[chr(115)+'kipped (outside the row' + chr(39) + 's lifespan)']) or '-'} | {', '.join(a_['no row in this timeline']) or '-'} |")
        L.append('')
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
    L += ['', '## Known exceptions', '', "- **Armenia in World War I (1917–18):** the war's dated membership for Armenia falls outside the Armenia row's lifespan, so no strip is built for that row. The row is not stretched to fit; a known exception.",
          "- **Korea in the Korean War (1950–53):** the war's dated membership for Korea falls outside the Korea row's lifespan, so no strip is built for that row. The row is not stretched to fit; a known exception, as for Armenia.",
          "- **World War II join years come from two lists, not from the headline.** Allies: the dated list “Timeline of Allied states entering the war” (Allies of World War II). Axis: the first row on or after 1 September 1939 of the “List of war declarations” table in which the state is the initiator. So Japan shows 1940 (the invasion of Vichy French Indochina) and not 1937 or 1941, Romania shows 1941, and Finland shows 1945 (its Allied-list date; it fought the USSR from 1941 as a co-belligerent). China shows 1941 (its declaration), though it had fought Japan since 1937 (see the Second Sino-Japanese War strip). The Axis entry is, in order: the state's own sentence in its section of the Axis powers article that says it joined the invasion or declared war (the state's name must come before the verb); the first declarations-table row it initiated; the Tripartite Pact signing (tests: `pipelines/v2/test_harvest_conflicts.py`). A state on both lists (Bulgaria, Romania, Italy) takes its earliest dated entry, with no side shown (sides need `role` on `memberOf`, v11). Peru and the other late declarers get a one-year strip (1945).",
          "- **Quoted ranges for a state itself** (\"Republic of China (1912–1949)\") are not joining years: a strip's dates stay inside the war's span.",
          "- **Entries with no row** (Attack on Pearl Harbor, Kingdom of Nepal, Hanover, colonies and parties such as the Kuomintang, the Chinese Communist Party and the Colorado Party) are listed per war in the strip-accounting table, not forced onto a row."]
    L += ['', '## World War II: join years that need Kevin\'s call', '',
          "The strips are built from the two lists below; none of the alternatives has been applied. Each row gives the current year, the other candidates with their quotes, and a suggestion.", '',
          "| State | Now | Other candidates (quoted) | Suggestion |", "|---|---|---|---|",
          "| Japan | 1941 (its own sentence) | table row “1940-09-22: Empire of Japan → Vichy France (A)”; “1941-12-07: Empire of Japan → United States, United Kingdom, Thailand (A)”; the Second Sino-Japanese War infobox “7 July 1937 – 2 September 1945” | keep 1941: “On 7 December 1941 Japan declared war on the United States and the British Empire.” (Axis powers, section Japan); the 1937 war keeps its own strip |",
          "| China | 1941 | list “China: 9 December 1941 (at war with Japan since 1937)”; the Second Sino-Japanese War infobox “7 July 1937 – 2 September 1945” | 1937: the list's own note says so |",
          "| Finland | 1945 | list “Finland: 3 March 1945 – former ally of Germany in the Continuation War. On 3 March 1945, Finland retroactively declared war on Germany from 15 September 1944.”; table “1939-11-30: Soviet Union → Finland (A)”; “1941-06-25: Finland → Soviet Union (W)” | 1939 (attacked) or 1941 (declared); 1945 is only the switch of sides |",
          "| Soviet Union | 1941 | list “Soviet Union: 22 June 1941”; table “1939-09-17: Soviet Union → Poland (A)” | 1939; the list date is the German attack on it |",
          "| Romania | 1941 | its own section: “Romania joined the German-led invasion of the Soviet Union on June 22, 1941.” (the war entry, now the strip's start); “Romania signed the Tripartite Pact on November 23, 1940.” (the pact, not built as a claim) | keep 1941; the pact could be added as a claim with a note |",
          "| Bulgaria | 1941 | its section: “Bulgarian government declared war on the Western Allies.” (December 1941); the pact “signed the Tripartite Pact on 1 March 1941” | keep the war entry; the pact is a possible claim |",
          "| Hungary | 1941 | its own section gives only the pact: “… signing the agreement on 20 November 1940” (no war-entry sentence); table “1941-06-27: Hungary → Soviet Union (C)” | war entry from the table (the pact is only the last fallback) |",
"| Denmark | 1940 | list “Denmark 9 April 1940 – German invasion without declaration of war” | keep, but Denmark was occupied and not a belligerent (a state-of-war label, not a fighting one) |",
          "| Ethiopia | 1942 | list “Ethiopia: 14 December 1942” | keep the list date; Ethiopia had been fighting Italy earlier (needs a quote) |", '',
          "States on both lists (Bulgaria, Romania, Italy) take the earliest dated entry; sides are not shown (needs `role` on `memberOf`, v11).", '',
          '## Precision sample: 30 random strips', '',
          "`pipelines/v2/strip_sample.py 30 1` draws 30 of the 117 strips across the eight wars and prints each state's own article sentences about the war. Verdicts, by hand:", '',
          "- **Confirmed by the state's article (8/30):** Liberia (27 Jan 1944), Norway (1940), Portugal (WWI, neutral until early 1916), United Kingdom, United States and Ottoman Empire (WWI), New Zealand and Australia (WWII, 1939).",
          "- **Consistent, but the state is a theatre or occupied, not a fighter (3/30):** Denmark (occupied April 1940), Prussia and Denmark–Norway (Thirty Years' War: armies marched across, or the state was “not successful”).",
          "- **Years differ by one (1/30):** Greece in WWI: the strip says 1916 (heading “Greece (1916/17–1918)”), the article says June 1917.",
          "- **Cannot be checked from the state's own article (18/30):** the article has no sentence on the war. Seven of these carry a quoted list date (El Salvador, Lebanon, Uruguay, Panama, Ethiopia, Paraguay, Mexico). Eleven carry only the war's own span: Habsburg monarchy, Switzerland, United Kingdom and Sicily (Napoleonic), Sweden (Seven Years'), Spain (Thirty Years'), Italy, Egypt and the British Empire (Mahdist), Soviet Union and United States (Sino-Japanese).",
          "- **Error kinds:** (1) an undated infobox entry takes the war's whole span: 66 of the 117 strips (Mahdist 5/5, Sino-Japanese 6/6, Napoleonic 15/15, Seven Years' 8/8, WWI 16/26, WWII 9/43, Thirty Years' 4/10, Paraguayan 3/4). A foreign supporter such as the United States in the Sino-Japanese War then shows from 1937. (2) A declaration date is shown where the fighting started earlier or the state never fought (China, Finland, Ethiopia, Denmark). (3) The first table row as initiator is not an entry date (Romania, Bulgaria, Hungary, Japan). (4) Sources differ by a year (Greece). (5) A state that was a battleground is shown as a participant (Prussia, Denmark–Norway).",
          "- **Second sample, of the 71 strips the preview now shows (`strip_sample.py 30 7`):** 13 confirmed by the state's own article (Australia, Netherlands, Japan in the Sino-Japanese War, Bulgaria, France in the Seven Years' War, Brazil, Uruguay and Paraguay in the Paraguayan War, Russia, France, Poland, Portugal, Yugoslavia); 3 consistent but weak (Denmark was occupied, Canada's article gives no date of its own, Romania in WWI: the end 1918 agrees and the start is not stated); 1 a known call (Soviet Union 1941 against 1939); 13 not checkable because the article has no sentence on the war (Uruguay, United Kingdom, China, Ethiopia, Italy, Paraguay, Peru, Mexico, Romania, Turkey, France in the Thirty Years' War, Lebanon, Slovakia), all carrying a quote from the war's own article or the Allies and Axis lists. None was contradicted: 16 of the 17 checkable are supported and 1 is a call. The first sample's war-span defaults (11 of its 18 unchecked) are gone from this version.",
          "- **Decision:** **Now the default:** `withhold_undated_nonprincipal` in `rules/conflicts.json` (true) builds a strip only for the first entry of each side and for entries with a joining year of their own; the others are listed in the accounting table as withheld. Set it to false to give all 117 strips back (the sample numbers above are for that version). Kevin's call.", '']
    L += ['', '## Wars pass pilot: 20 wars placed by Kevin\'s rule (branch `wars-pass`, off `conflicts-pilot`)', '',
          "The 12 wars added here (Hundred Years', Spanish Succession, Great Northern, American Revolutionary, Crimean, Russo-Japanese, War of the Pacific, Korean, Vietnam, Iran–Iraq, Chaco, Second Congo) and the 8 of the first pilot are placed by the rule, not by hand: a war gets a row under Wars only if it is one of the seven multi-region wars (World War I and II, Thirty Years', Seven Years', Napoleonic, Spanish Succession, American Revolutionary), each with a `wide_by` reason; every other war goes on the rows of its main combatants (the first entry of each side) like a battle.", '',
          "- **Already on main:** 18 of the 20 wars were already events there on their combatants' rows. The emitter matches an existing event by Wikipedia article, then by title (accents and dashes ignored), then by title words, and does not add a second one. For a Wars-row war that exists on main (World War I and II, Thirty Years', Napoleonic, Spanish Succession, American Revolutionary) it adds only the war row to that event's rows (`eventEdits`); the Seven Years' War has no event on main and is the one new war event. War of the Pacific is not emitted: none of its combatants has a row.",
          "- **Dated strips:** 72, on the seven Wars-row wars. The Great Northern, Paraguayan, Second Congo, Crimean, Korean and Vietnam wars have no strips (no war row).",
          "- **Main events are untouched:** every event on main is identical after the build except its appended tracks (checked field by field, 0 changed). A war row named like its article once made the classifier drop the article (the American Revolutionary War lost its revolt category); the classifier now ignores war rows.",
          "- **Counting:** the “≤3 countries” rule counts main combatants (the first entry of each side). So the Great Northern, Paraguayan and Second Congo wars sit on their two main rows, not on a region row, and the Crimean, Korean and Vietnam wars (coalitions, one theatre) sit on their main combatants' rows. Whether a region row is better is Kevin's call.",
          "- **Event dates:** all 12 added wars' headline starts and ends agree with Wikidata (12/12). The side-list count check (lines naming a state against entries read) holds in every column.",
          "- **Precision of the first 24 strips** (checked before the placement change; the 72 strips now are the seven Wars-row wars): 10 confirmed, 1 consistent, 13 not checkable, 0 contradicted.",
          "- **Two-sided states** (Great Britain, Great Northern War) get one dated strip per side; they cannot be told apart on the chart until `role` on `memberOf` exists (schema v11, Kevin's call).", '']
    L += ['', '## Wars pass pilot 2: ten wars before 1500, none European (branch `wars-pass-2`, off `wars-pass`)', '',
          "From East Asia, South Asia, West Asia and Africa, all Medieval: the Genpei War (the article behind “Gempei War”), the Ōnin War, the Mongol conquest of the Song dynasty, the Jin–Song wars, the Tripartite Struggle (India), the Almohad conquest of Norman Africa (the article's title for Ifriqiya), the Fatimid conquest of Egypt, the Arab conquest of Sindh (behind “Muslim conquest of Sindh”), the Red Turban Rebellions and the Goryeo–Khitan War. Placed by the same rule: none is a Wars-row war, so none has a war row or strips.", '',
          "- **Added (5 events):** the Genpei War (Japan), the Mongol conquest of the Song dynasty (Mongol Empire and China), the Jin–Song wars (China), the Tripartite Struggle (Pratihara, Rashtrakuta and Pala rows), the Almohad conquest of Norman Africa (Sicily row).",
          "- **Not added, already on main (3):** the Red Turban Rebellion (the same event as “Rebellions”), the Fatimid conquest of Egypt (main has it with “and foundation of Cairo”), the Goryeo–Khitan War. **Not emitted, no row for any combatant (2):** the Ōnin War (the Eastern and Western armies are not states with a row) and the Arab conquest of Sindh.",
          "- **Gempei War:** it is not a tenth event; “Gempei War” redirects to the Genpei War, which is the one emitted.",
          "- **Event dates:** the headline starts and ends agree with Wikidata where it has them. A war that ends in its start year gets that end; a war with no quoted end is withheld.",
          "- **Recheck of the earlier strips** against each war's own article (11 strips, built before the placement change and now dropped with their war rows): all 11 were named as belligerents and none was contradicted; 4 carried a date in the article's text (Fatimid and Ikhshidids 969, the Yuan from 1260, the Ming in 1368), 4 matched the war's own short span, 3 were named only (Tripartite powers).",
          "- **What this shows:** the Medieval rows are coarser than Modern States rows (one China row for Song, Jin, Yuan and Ming; one Japan row for the Heian and Kamakura periods); Kevin's call whether dynasty rows are worth building.", '']
    L += ['', '## Questions for Kevin', '',
          "1. **Rank by inlinks favours the famous.** It picks Crécy, Agincourt, Waterloo, Lepanto, Vienna 1683, Adwa: the right battles, but from the English-language article graph. A regional-scholarship check (as for the landmarks) would be the next step. (a, recommended) keep the rule for the pilot and add a per-region quota in the next round; (b) add a curated list per country.",
          "2. **Wars are not ranked as events here.** Titles with war, conflict, crusade, revolt, resistance or insurgency are left to the named multi-region wars (Thirty Years' War, WWI, built as war rows with strips) and to a later wars pass; so the Hundred Years' War, Napoleonic Wars and the Italo-Ethiopian wars are absent. (a, recommended) a wars pass with the same row-and-strip build for every war that is not confined to one region, with joining and leaving dates from each war's own text; (b) include wars as events on the country rows now.",
          "3. **Importance** comes from inlinks (400 or more = key), since the pilot reads no casualty figures. (a, recommended) keep; (b) read infobox casualties like the disasters pilot.",
          "4. **Ancient** is built now (`scripts/ancient-classical/conflicts.ts`, registered in run-all): Rome, Achaemenid Persia, Han China and Aksum, 22 events. Rome's cut line shows famous battles that missed the cap of 6 (Carrhae, Alesia, the Sack of Rome 410). (a, recommended) keep the cap of 6 for the pilot and raise it for the bulk run; (b) raise it now.", "5. **Gaps in the region × era table** (documented, not filled by hand). Closed from sourced articles this round: Southeast Asia Medieval (Khmer–Cham wars, Tonlé Sap, Champa–Đại Việt, Song–Đại Việt, Mongol invasions of Burma and Java, Pamalayu, Chola invasion of Srivijaya), the Classic Maya (the Tikal–Calakmul wars), Korea's Three Kingdoms (Goguryeo–Sui and –Tang, Silla–Tang, Hwangsanbeol) and Makuria. Still open: Kush and Meroë have no battle article with a military-conflict infobox in the dump, so Ancient Africa has no Kushite battle; Andes before the Inca has only Chimor–Inca (the Wari and Tiwanaku have none); Oceania has nothing before 1500. Checked against the 24k-article combatant index (every title or side naming Polynesian, Māori, Hawaiian, Fijian, Wari, Tiwanaku, Chimú, Inca, Mapuche and similar): the earliest Andean battle articles are the Inca Civil War (about 1529) and Cajamarca (1532), the earliest Pacific ones the Hawaiian battles of the 1790s, so no sourced article exists before 1500 and nothing was added. (a, recommended) accept for the pilot and take these from regional scholarship in the bulk round, with each date quoted from its source; (b) add curated lists for those countries now.", '']
    open(out, 'w').write('\n'.join(L) + '\n')
    print(f'wrote {out}')


if __name__ == '__main__':
    main(sys.argv[1])
