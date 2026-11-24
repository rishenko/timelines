"""
Lists the reigns a full rulers run places that the compiled timelines do not hold (silent misses of the frozen pass), per row, sorted into
real reigns and the kinds that are a scope call (regents, claimants and pretenders, rival or co-rulers, acting and provisional heads).
Compares by row and name (bracketed disambiguation dropped). Nothing is frozen.

    pipelines/extract/.venv/bin/python -I pipelines/extract/silent_misses.py RUN_DIR OUT.md     # RUN_DIR holds <timeline>/rulers.csv
"""
import csv
import json
import os
import re
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
PREFIX = re.compile(r'^(Acting presidency|Presidency|Reign|Pontificate|Regency|Tenure) of ')
SCOPE = re.compile(r'regent|claimant|pretender|antipope|anti-|rival|co-|usurper|interim|acting|provisional|puppet|nominal|titular|governor|viceroy|prime minister|president of the (?:council|senate)', re.I)


def base(s):
    return re.sub(r'\s*\([^)]*\)', '', PREFIX.sub('', s)).strip().lower()


def main(run, out):
    md = ['## Silent misses of the frozen rulers pass (Dev C, 2026-11-24; a full run with the #146 pick; nothing frozen)', '',
          'A reign the run places on a row that the compiled timeline does not hold under the same name. "Real" = an ordinary ruler by office; "scope" = the office or the flags name a regent, claimant, pretender, rival or co-ruler, acting or provisional head, governor, or a similar call for Kevin.', '',
          '| timeline | placed by the run | already in the data | misses | real | scope |', '|---|---|---|---|---|---|']
    detail = []
    for tl in ('ancient-classical', 'medieval', 'modern-states'):
        path = os.path.join(run, tl, 'rulers.csv')
        if not os.path.exists(path):
            md.append(f'| {tl} | run missing | | | | |')
            continue
        have = defaultdict(set)
        for e in json.load(open(os.path.join(ROOT, 'public', 'timelines', f'{tl}.json')))['events']:
            if PREFIX.match(e['title']):
                for r in e['tracks']:
                    have[r].add(base(e['title']))
        placed = miss = 0
        per = defaultdict(list)
        for r in csv.DictReader(open(path, newline='')):
            if r['reign'] != 'yes' or not r['person'] or r['person'] == 'Interregnum':
                continue
            placed += 1
            if base(r['person']) in have[r['row']]:
                continue
            kind = 'scope' if SCOPE.search(r['office'] + ' ' + r['flags']) else 'real'
            miss += 1
            per[r['row']].append((kind, r['person'], r['start'], r['end'], r['office'][:50]))
        real = sum(1 for v in per.values() for k in v if k[0] == 'real')
        md.append(f'| {tl} | {placed} | {placed - miss} | {miss} | {real} | {miss - real} |')
        for row in sorted(per):
            detail.append(f'**{tl} / {row}**: {len(per[row])}')
            for kind, p, s, e, o in sorted(per[row], key=lambda x: (x[0], x[2])):
                detail.append(f'- {kind}: {p} ({s} – {e}) {o}')
            detail.append('')
    open(out, 'w').write('\n'.join(md + [''] + detail) + '\n')
    print('\n'.join(md))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
