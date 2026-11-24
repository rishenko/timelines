"""Writes the emit inputs into the repo (pipelines/v2/inputs/) from the full harvest in $TIMELINES_DATA, so emit.py runs from a checkout alone.

    python3 -I pipelines/v2/trim_inputs.py

Run after harvest/*.py, consensus.py and build_places.py. Kevin ("Trim, then commit"): the repo gets what the emitted files already use,
and the full candidates (every quoted sentence the dump gave) stay in ~/data:
  - each candidate keeps only the fields emit.py and placement.py read;
  - a date claim keeps its quote only when it is a Wikipedia claim (emit cites it); Wikidata dates are dropped (emit never reads them);
  - a measure keeps its numbers, not its quote (the collapsed-range check runs here, on the full quote, before it is dropped).
The headline files and places.generated.json are copied as they are. The route's check (`emit.py` on these inputs, then `git diff` on
pipelines/v2/emitted) proves nothing emit uses was cut.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import emit  # noqa: E402

DATA = os.path.expanduser(os.environ.get('TIMELINES_DATA', '~/data'))
OUT = os.path.join(HERE, 'inputs')
KEEP = ('qid', 'kind', 'sub', 'title', 'label', 'wp', 'countries', 'country_qids', 'places', 'also', 'inlinks', 'wide', 'region_row',
        'participants', 'participant_qids', 'participant_dates', 'side_check', 'harvest')
DATE_KEEP = ('side', 'from', 'year', 'month', 'day', 'circa', 'locator', 'quote')


def trim(c):
    bad = emit.check_measures(c)  # on the full quotes, before they are dropped
    if bad:
        raise SystemExit(f"{c['title']}: " + '; '.join(bad))
    out = {k: c[k] for k in KEEP if k in c}
    out['dates'] = [{k: d[k] for k in DATE_KEEP if k in d} for d in c['dates'] if d.get('from') == 'wikipedia']
    out['measures'] = {k: {kk: vv for kk, vv in v.items() if kk != 'quote'} for k, v in c['measures'].items()}
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    for kind in ('disaster', 'conflict'):
        src = os.path.join(DATA, 'v2', 'candidates')
        rows = [trim(json.loads(l)) for l in open(os.path.join(src, f'{kind}.jsonl'), encoding='utf-8')]
        with open(os.path.join(OUT, f'{kind}.jsonl'), 'w', encoding='utf-8', newline='\n') as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False, separators=(',', ':')) + '\n')
        heads = open(os.path.join(src, f'{kind}.headline.json'), encoding='utf-8').read()
        open(os.path.join(OUT, f'{kind}.headline.json'), 'w', encoding='utf-8', newline='\n').write(heads)
        print(f'{kind}: {len(rows)} candidates')
    places = open(os.path.join(DATA, 'v2', 'places.generated.json'), encoding='utf-8').read()
    open(os.path.join(OUT, 'places.generated.json'), 'w', encoding='utf-8', newline='\n').write(places)


if __name__ == '__main__':
    main()
