"""
Before/after for a data change: events added, lost and changed per timeline, by row, reigns apart. A regression shows in the first run
(the persons store once dropped 15 Aksum kings through a side effect), not in a later sample.

    python -I pipelines/common/data_diff.py [--base REV] [--timeline T ...] [--list] [--fail-on-lost-reigns]
                                         [--sample N [--seed S]] [--files BEFORE.json AFTER.json]

Compares data-src/<timeline>.json at REV (default origin/main) with the working tree: events keyed by uuid; "changed" means any field
differs (start, end, title, tracks, sources, memberships). Prints a markdown table (paste it in the pull request); --list adds the event titles.
Exit 1 with --fail-on-lost-reigns when a reign (uuid starting "reign-") is gone. --sample N prints a seeded random sample (--seed, default 1) of the added events with row, dates and the first source
quote, for the read-against-sources precision check. --files compares two timeline-shaped JSON files (a pipeline run's output) instead of data-src.
Needs no dump and no ~/data.
"""
import json
import os
import random
import subprocess
import sys
from collections import defaultdict

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DATA = os.path.join(ROOT, 'data-src')


def flag(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def at_rev(rev, name):
    r = subprocess.run(['git', 'show', f'{rev}:data-src/{name}.json'], cwd=ROOT, capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else None


def timelines():
    return sorted(f[:-5] for f in os.listdir(DATA) if f.endswith('.json') and not f.endswith(('-categories.json', '-importance.json', '-reigns.json')) and f not in ('site-timelines.json',))


def rows(ev, names):
    return ', '.join(names.get(t, t) for t in ev.get('tracks', [])) or '(no row)'


def is_reign(e):
    return e['uuid'].startswith('reign-')


def diff(name, rev, files=None):
    if files:
        before, after = json.load(open(files[0])), json.load(open(files[1]))
    else:
        before = at_rev(rev, name)
        path = os.path.join(DATA, f'{name}.json')
        if before is None or not os.path.exists(path):
            return None
        after = json.load(open(path))
    if 'tracks' not in after or 'tracks' not in before:  # not a timeline file
        return None
    names = {t['id']: t['name'] for t in after['tracks']} | {t['id']: t['name'] for t in before['tracks']}
    b = {e['uuid']: e for e in before['events']}
    a = {e['uuid']: e for e in after['events']}
    added = [a[u] for u in a if u not in b]
    lost = [b[u] for u in b if u not in a]
    changed = [a[u] for u in a if u in b and a[u] != b[u]]
    return names, added, lost, changed


def main():
    rev = flag('--base', 'origin/main')
    only = [sys.argv[i + 1] for i, x in enumerate(sys.argv) if x == '--timeline']
    bad = 0
    print(f'### Data before/after (base `{rev}`)\n\n| timeline | events | added | lost | changed | reigns added | reigns lost |\n|---|---|---|---|---|---|---|')
    detail = []
    files = sys.argv[sys.argv.index('--files') + 1:sys.argv.index('--files') + 3] if '--files' in sys.argv else None
    sample_n = int(flag('--sample', 0))
    rng = random.Random(int(flag('--seed', 1)))
    samples = []
    for name in (['files'] if files else only or timelines()):
        d = diff(name, rev, files)
        if d is None:
            continue
        names, added, lost, changed = d
        ra, rl = [e for e in added if is_reign(e)], [e for e in lost if is_reign(e)]
        n = len(json.load(open(files[1] if files else os.path.join(DATA, f'{name}.json')))['events'])
        print(f'| {name} | {n} | {len(added)} | {len(lost)} | {len(changed)} | {len(ra)} | {len(rl)} |')
        bad += len(rl)
        if sample_n and added:
            for e in rng.sample(sorted(added, key=lambda e: e['uuid']), min(sample_n, len(added))):
                q = (e.get('sources') or [{}])[0].get('sourceLocation', '')
                samples.append(f"- {name} / {rows(e, names)}: {e['title']} ({e.get('start')}–{e.get('end', '')}) `{e['uuid']}` {q[:200]}")
        for label, evs in (('added', added), ('lost', lost), ('changed', changed)):
            if not evs:
                continue
            by = defaultdict(list)
            for e in evs:
                by[rows(e, names)].append(e)
            detail.append(f'\n**{name}: {label} by row**\n')
            for row, es in sorted(by.items(), key=lambda kv: -len(kv[1])):
                r = sum(is_reign(e) for e in es)
                detail.append(f'- {row}: {len(es)}' + (f' ({r} reigns)' if r else ''))
                if '--list' in sys.argv:
                    detail += [f"  - {e['uuid']}: {e['title']}" for e in es[:50]]
    print('\n'.join(detail))
    if samples:
        print(f"\n**Seeded sample of added events (seed {flag('--seed', 1)})**\n")
        print('\n'.join(samples))
    if bad and '--fail-on-lost-reigns' in sys.argv:
        sys.exit(1)


if __name__ == '__main__':
    main()
