"""
Headline date and review table for the disasters pilot candidates (the consensus headline date, standing rule).

    python3 -I pipelines/v2/consensus.py [--data DIR] [--out FILE]

Reads $TIMELINES_DATA/v2/candidates/<kind>.jsonl (disaster by default; `consensus.py conflict`). For each candidate the headline start (and end) is the year most of its
dates agree on: every quoted Wikipedia claim (infobox fields, lead or sentence) counts once, Wikidata's claim agrees or
dissents but never decides alone (a candidate with no quoted claim has no headline). A tie goes to the infobox, then to the
lead. Disagreement (claims that differ by more than the circa margin) is listed in the review file, not hidden.
Writes the review table (markdown) and $TIMELINES_DATA/v2/candidates/disaster.headline.json.
"""
import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'common'))
import data_root  # noqa: E402

DATA = data_root.root()
KIND = next((a for a in sys.argv[1:] if a in ('disaster', 'conflict')), 'disaster')
CAND = os.path.join(DATA, 'v2', 'candidates', f'{KIND}.jsonl')
RANK = {'infobox': 0, 'sentence': 1, 'lead': 2}


def rank(loc):
    return min((v for k, v in RANK.items() if loc.startswith(k)), default=3)


def headline(c):
    out = {}
    for side in ('start', 'end'):
        quoted = [d for d in c['dates'] if d['side'] == side and d['from'] == 'wikipedia']
        wd = [d for d in c['dates'] if d['side'] == side and d['from'] == 'wikidata']
        if not quoted:
            out[side] = None
            continue
        votes = Counter(d['year'] for d in quoted)
        for d in wd:
            if d['year'] in votes:
                votes[d['year']] += 0.5  # corroboration, never the decider
        best = max(votes, key=lambda y: (votes[y], -min(rank(d['locator']) for d in quoted if d['year'] == y)))
        pick = next(d for d in sorted(quoted, key=lambda d: rank(d['locator'])) if d['year'] == best)
        years = sorted({d['year'] for d in quoted + wd})
        out[side] = {'year': best, 'month': pick.get('month'), 'day': pick.get('day'), 'circa': pick.get('circa', False), 'locator': pick['locator'],
                     'quote': pick['quote'], 'agree': sum(1 for d in quoted + wd if d['year'] == best),
                     'of': len(quoted + wd), 'otherYears': [y for y in years if y != best]}
    return out


def main():
    cands = [json.loads(l) for l in open(CAND, encoding='utf-8')]
    heads, rows = {}, []
    for c in cands:
        h = headline(c)
        heads[c['qid'] or c['title']] = h
        s, e = h['start'], h['end']
        fmt = lambda x: '—' if not x else f"{x['year']}" + (f"-{x['month']:02d}" if x.get('month') else '') + (f"-{x['day']:02d}" if x.get('day') else '')
        dis = ', '.join(map(str, s['otherYears'])) if s and s['otherYears'] else ''
        ms = ', '.join(f"{k} {v['value']:g}" for k, v in c['measures'].items())
        rows.append(f"| {c['title']} | {c['qid']} | {c['sub']} | {', '.join(c['countries'])} | {fmt(s)} | {fmt(e)} | {s['agree']}/{s['of']} | {dis} | {ms} |" if s else
                    f"| {c['title']} | {c['qid']} | {c['sub']} | {', '.join(c['countries'])} | NO QUOTED DATE | | | | {ms} |")
    json.dump(heads, open(os.path.join(DATA, 'v2', 'candidates', f'{KIND}.headline.json'), 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
    md = ['| event | QID | type | countries | start | end | claims agreeing | other years | measures |', '|---|---|---|---|---|---|---|---|---|'] + rows
    out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
    text = '\n'.join(md) + '\n'
    if out:
        open(out, 'w', encoding='utf-8', newline='\n').write(text)
    print(text)


if __name__ == '__main__':
    main()
