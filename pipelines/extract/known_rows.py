"""Known-rows regression set: after a rulers rerun (and before a bulk review file or an import reaches anyone), check
a handful of rows whose reigns must come out right. Reads the compiled timelines in public/timelines/, so run it after
`npm run data -- build all`. Rows and expectations: known-rows.json.

    pipelines/extract/.venv/bin/python -I pipelines/extract/known_rows.py [--known-issues]

Exit 1 on a failed row. Known issues are listed, not failed, unless --known-issues is given."""
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPEC = json.load(open(os.path.join(os.path.dirname(__file__), 'known-rows.json'), encoding='utf-8'))
_cache = {}


def reigns(timeline, row):
    if timeline not in _cache:
        _cache[timeline] = json.load(open(os.path.join(ROOT, 'public', 'timelines', f'{timeline}.json'), encoding='utf-8'))
    return [e['title'] for e in _cache[timeline]['events'] if e['uuid'].startswith('reign-') and row in e['tracks']]


def people(titles):
    return {re.sub(r'^(Acting presidency|Presidency|Reign|Pontificate|Regency|Tenure) of ', '', t) for t in titles}


def check(spec):
    titles = reigns(spec['timeline'], spec['row'])
    who = people(titles)
    bad = []
    if len(titles) < spec.get('min', 0):
        bad.append(f"{len(titles)} reigns, at least {spec['min']} expected")
    if 'max' in spec and len(titles) > spec['max']:
        bad.append(f"{len(titles)} reigns, at most {spec['max']} expected")
    bad += [f'missing {p}' for p in spec.get('include', []) if p not in who]
    bad += [f'should not be here: {p}' for p in spec.get('exclude', []) if p in who]
    if spec.get('titles'):
        bad += [f'title {t!r}' for t in titles if not t.startswith(tuple(spec['titles']))][:5]
    bad += [f'title {t!r} has {w}' for w in spec.get('exclude_title_words', []) for t in titles if w in t][:5]
    return len(titles), bad


def main():
    failed = 0
    for spec in SPEC['rows']:
        n, bad = check(spec)
        print(('FAIL ' if bad else 'ok   ') + f"{spec['timeline']}/{spec['row']} ({n} reigns)" + ''.join(f'\n       {b}' for b in bad))
        failed += bool(bad)
    for spec in SPEC.get('known_issues', []):
        n, bad = check(spec)
        flag = '--known-issues' in sys.argv
        print(('FAIL ' if bad and flag else 'known issue: ' if bad else 'fixed (remove from known_issues): ') + f"{spec['timeline']}/{spec['row']}: " + '; '.join(bad or ['now fine']))
        failed += bool(bad and flag)
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
