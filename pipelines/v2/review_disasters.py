"""
Review file for the disasters pilot (v2 contract: one review file per pass, with the parity table).

    python3 -I pipelines/v2/review_disasters.py OUT.md

Reads the candidates and their headline dates ($TIMELINES_DATA/v2/candidates), the emitted events (pipelines/v2/emitted)
and the pilot seeds. Writes: the parity table (kind x timeline: candidates, kept, rejected, unplaced), the region x era
balance table against the pilot's quotas, the events with their quoted headline dates, measures and rows, and the
questions that go to Kevin with their quotes.
"""
import json
import os
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.expanduser(os.environ.get('TIMELINES_DATA', '~/data'))
REGION = {'Egypt': 'Africa', 'Ethiopia': 'Africa', 'Mali': 'Africa', 'Cameroon': 'Africa', 'India': 'South Asia', 'Bangladesh': 'South Asia',
          'China': 'East Asia', 'New Zealand': 'SE Asia / Oceania', 'Indonesia': 'SE Asia / Oceania', 'Turkey': 'West / Central Asia',
          'Iran': 'West / Central Asia', 'Turkmenistan': 'West / Central Asia', 'El Salvador': 'Americas', 'Peru': 'Americas',
          'Mexico': 'Americas', 'Greece': 'Europe / Mediterranean', 'Netherlands': 'Europe / Mediterranean'}
ERAS = ['Ancient (< 650)', 'Medieval (650–1499)', 'Modern (≥ 1500)']
TL = {'ancient-classical': ERAS[0], 'medieval': ERAS[1], 'modern-states': ERAS[2]}
QUOTA = {  # the pilot's planned table (brief): region -> events per era
    'Africa': (0, 1, 3), 'South Asia': (0, 0, 3), 'East Asia': (0, 1, 3), 'SE Asia / Oceania': (1, 1, 3),
    'West / Central Asia': (1, 1, 1), 'Americas': (1, 0, 2), 'Europe / Mediterranean': (1, 1, 0)}


def totals(cands):
    kept = sum(1 for c in cands for d in c['dates'] if d['from'] == 'wikipedia')
    wd = sum(1 for c in cands for d in c['dates'] if d['from'] == 'wikidata')
    dropped = [f"{c['title']}: {x}" for c in cands for x in c.get('dropped', [])]
    meas = sum(len(c['measures']) for c in cands)
    return kept, wd, dropped, meas


def category_proofs():
    import subprocess
    lines = []
    for tl in ('ancient-classical', 'medieval', 'modern-states'):
        r = subprocess.run(['npm', 'run', '--silent', 'categories:proof', '--', tl, '--base', 'origin/main'], capture_output=True, text=True, cwd=os.path.join(HERE, '..', '..'))
        out = [l.strip() for l in (r.stdout + r.stderr).splitlines() if l.strip() and 'known negatives' not in l]
        lines.append(f"- {tl}: " + (out[0] if out else 'no output'))
    return lines


def main(out):
    seeds = {s['title']: s for s in json.load(open(os.path.join(HERE, 'pilot-disasters.json')))['events']}
    cands = [json.loads(l) for l in open(os.path.join(DATA, 'v2', 'candidates', 'disaster.jsonl'))]
    heads = json.load(open(os.path.join(DATA, 'v2', 'candidates', 'disaster.headline.json')))
    emitted = {}
    for tl in TL:
        p = os.path.join(HERE, 'emitted', f'disaster-{tl}.json')
        if os.path.exists(p):
            for e in json.load(open(p))['events']:
                emitted[e['uuid']] = (tl, e)
    slug = lambda s: __import__('re').sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    kept, rows, balance = Counter(), [], defaultdict(Counter)
    flags = []
    for c in cands:
        uid = f"disaster-{slug(c['wp']['title'])}"
        tl, e = emitted.get(uid, (None, None))
        key = c['qid'] or c['title']
        h = heads[key]
        s, en = h['start'], h['end']
        reg = REGION.get(c['countries'][0], '?')
        if e:
            kept[tl] += 1
            balance[reg][TL[tl]] += 1
        fmt = lambda x: '' if not x else f"{x['year']}" + (f"-{x['month']:02d}" if x.get('month') else '') + (f"-{x['day']:02d}" if x.get('day') else '')
        ms = '; '.join(f"{k} {v['low']:g}" + (f"–{v['high']:g}" if v['high'] != v['low'] else '') + f" (\"{v['quote'][:60]}\")" for k, v in c['measures'].items())
        rows.append(f"| {e['title'] if e else c['title']} | [{c['wp']['title']}](https://en.wikipedia.org/wiki/{c['wp']['title'].replace(' ', '_')}) | {c['qid']} | {c['sub']} | "
                    f"{fmt(s)}{'–' + fmt(en) if en else ''}{' c.' if s and s.get('circa') else ''} | {s['agree']}/{s['of']} | {', '.join(map(str, s['otherYears']))} | "
                    f"`{s['locator']}`: \"{s['quote'][:90]}\" | {ms} | {tl or 'NOT EMITTED'}: {', '.join(e['tracks']) if e else ''} | {e.get('importance', 2) if e else ''} |")
        if seeds[c['seed']].get('flag'):
            flags.append(f"- **{e['title'] if e else c['title']}**: {seeds[c['seed']]['flag']}")
    md = ['# Disasters pilot review (Dev C, v2 step 2)', '',
          f"{len(cands)} candidates harvested from the Wikipedia dump (dates and measures quoted from the article; Wikidata only corroborates), "
          f"{sum(kept.values())} emitted. Nothing is hand-dated: change a seed, a rule, the place table or an override and rerun `pipelines/v2/emit.py`.", '',
          '## Parity (kind × timeline)', '', '| kind | candidates | Ancient | Medieval | Modern | rejected | unplaced |', '|---|---|---|---|---|---|---|',
          f"| disaster | {len(cands)} | {kept['ancient-classical']} | {kept['medieval']} | {kept['modern-states']} | 0 | {len(cands) - sum(kept.values())} |", '',
          '## Region × era (planned → emitted)', '', '| region | ' + ' | '.join(ERAS) + ' | total |', '|---|---|---|---|---|']
    for reg, q in QUOTA.items():
        b = balance[reg]
        md.append(f"| {reg} | " + ' | '.join(f"{b[ERAS[i]]}/{q[i]}" if q[i] or b[ERAS[i]] else '·' for i in range(3)) + f" | {sum(b.values())}/{sum(q)} |")
    kept, wd, dropped, meas = totals(cands)
    md += ['', '## Quote check and category diff', '',
           f"- **Quote gate:** {kept} quoted Wikipedia date claims kept (each found verbatim in its article), {len(dropped)} dropped; {meas} measures, each with its quote; {wd} Wikidata years used only as corroboration (they appear in no event).",
           *[f"  - dropped: {x}" for x in dropped],
           '- **Categories (`categories:proof` against origin/main; new events make the proof flag "other changes" by design, the counts show what moved):**', *category_proofs()]
    md += ['', '## Events', '', '| title | article | QID | type | headline dates | claims agreeing | other years | quote | measures | timeline: rows | importance |', '|---|---|---|---|---|---|---|---|---|---|---|'] + rows
    md += ['', '## For Kevin', ''] + flags + [
        '- **Rinderpest and limnic eruptions:** Lake Nyos is Volcanic activity (EM-DAT files a limnic eruption there); Ethiopia\'s 1888–92 famine is Drought or crop failure with rinderpest named as the cause. Say if either should move.',
        '- **Wide events** (Samalas, Tambora, Krakatoa, Huaynaputina): placed on their country or region row only. A global theme row for events that cool the whole planet ("Wars" is the model for conflicts) needs a decision before it exists.',
        '- **Sahel drought:** five countries are wider than the three-row rule, so it sits on the Western Africa group row (Chad is Middle Africa).']
    open(out, 'w').write('\n'.join(md) + '\n')
    print('\n'.join(md[:40]))


if __name__ == '__main__':
    main(sys.argv[1])
