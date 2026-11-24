"""
Guard for committed reigns (data protection, pass 9): every reign file under pipelines/ (`reigns.json`, and any
`*-reigns.json`: extra-reigns, rashidun-, yamato-, italy-reigns…, matched by pattern so a new file is covered when it
lands) is compared with the base's copy, by uuid. A reign that is lost (its file deleted, or the event gone) or changed in
any field fails, unless the change is Kevin's own: a pull request labelled `rishenko-reigns` (CI passes REIGNS_ALLOWED=true),
or locally `check:all --skip reigns`. Added reigns pass.

Why a separate check: freeze_regression proves a reigns.json reproduces from the inputs it records, but a pull request can
re-freeze and re-record the inputs in the same change, and the frozen files beside reigns.json are not re-frozen at all.
Comparing with main closes both. Why a separate label: `rishenko-overrides` allows category overrides; a label unlocks only
the kind of edit Kevin approved.

Same-person overlap (pass 9, #182): two reigns with the same title on the same row whose years overlap are one reign twice
(Theodosius II 402–450 beside main's own reign of him: two bars). The compiled data-src/<timeline>.json files are checked, and a
pair fails when one of its reigns is not in the base's file (pairs already on main are reported, not failed). Reigns are compared to the day when
the data has months and days, else by whole years (a year-only reign is one year long); ends that only touch (1442 / 1442, or
the same day) don't overlap: a ruler who returns later has two reigns. No label unlocks it: a duplicate is never Kevin's edit.

A process guard, like overrides_guard.py: it stops an honest mistake, not a deliberate edit. CI compares with main.

    python3 -I pipelines/common/reigns_guard.py --base origin/main
"""
import json
import os
import re
import subprocess
import sys

# the checkout under review: the git repo of the current directory, so a copy run from another worktree checks this one
ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, encoding='utf-8').stdout.strip() or \
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
PATTERN = re.compile(r'^pipelines/(?:.+/)?(?:reigns|[^/]+-reigns)\.json$')


def reign_files(names):
    return sorted(n for n in names if PATTERN.match(n))


def compare(old, new):
    """(lost, changed) uuids of the old file's events against the new file's (new None: the file is gone)."""
    now = {e['uuid']: e for e in (new or {}).get('events', [])}
    lost = [e['uuid'] for e in old.get('events', []) if e['uuid'] not in now]
    changed = [e['uuid'] for e in old.get('events', []) if e['uuid'] in now and now[e['uuid']] != e]
    return lost, changed


def fields(old, new, uuid):
    a = next(e for e in old['events'] if e['uuid'] == uuid)
    b = next(e for e in new['events'] if e['uuid'] == uuid)
    return sorted(k for k in a.keys() | b.keys() if a.get(k) != b.get(k))


def point(y, m=None, d=None):
    """A comparable number for a (year, month, day) with missing parts at their start (31-day months, 372-day years: order only)."""
    return y * 372 + ((m or 1) - 1) * 31 + ((d or 1) - 1)


def span(e):
    """[start, end) of a reign as comparable numbers. With months or days, to the day; a reign with no end lasts one unit of its
    finest field (a day, a month or a year), so a year-only reign is [s, s+1 year); a range keeps its end (a year-only end in the start's own year, when the start has a month, runs to the end of that year; an end that is not after the start gets one unit), so 1436–1442 then
    1442–1447 only touch and a same-day handover (11 Jun 1042 / 11 Jun 1042) does too."""
    s = point(e['start'], e.get('startMonth'), e.get('startDay'))
    unit = 1 if e.get('startDay') else 31 if e.get('startMonth') else 372
    if e.get('end') is not None:
        end = point(e['end'], e.get('endMonth'), e.get('endDay'))
        if e['end'] == e['start'] and not e.get('endMonth') and (e.get('startMonth') or e.get('startDay')):
            end = point(e['end'] + 1)  # a year-only end in the start's own year runs to the end of that year (Ramachandra Raya: from March, to 1411)
        if end > s:
            return s, end
    return s, s + unit  # no end, or an end that is not after the start (1042–1042 with no months): one unit


def overlaps(events):
    """[(uuid, uuid)] of reigns (uuid 'reign-…') with the same title on the same row whose years overlap (touching ends don't)."""
    by = {}
    for e in events:
        if e['uuid'].startswith('reign-'):
            for t in e.get('tracks', []):
                by.setdefault((t, e['title']), []).append(e)
    out = []
    for v in by.values():
        for i, a in enumerate(v):
            for b in v[i + 1:]:
                (sa, ea), (sb, eb) = span(a), span(b)
                if sa < eb and sb < ea and (a['uuid'], b['uuid']) not in out:
                    out.append((a['uuid'], b['uuid']))
    return sorted(out)


def check_overlaps(base, data_dir='data-src'):
    """(new, old): overlapping same-person pairs in data-src/<timeline>.json with a reign the base lacks / pairs the base already had."""
    new, old = [], []
    for name in ('ancient-classical', 'medieval', 'modern-states'):
        path = os.path.join(ROOT, data_dir, f'{name}.json')
        if not os.path.exists(path):
            continue
        before = git('show', f'{base}:data-src/{name}.json')
        have = {e['uuid'] for e in json.loads(before.stdout)['events']} if before.returncode == 0 else set()
        for a, b in overlaps(json.load(open(path, encoding='utf-8'))['events']):
            (old if a in have and b in have else new).append(f'{name}: {a} overlaps {b}')
    return new, old


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')


def main(argv):
    base = argv[argv.index('--base') + 1] if '--base' in argv else 'origin/main'
    allowed = os.environ.get('REIGNS_ALLOWED', '').lower() == 'true'
    names = git('ls-tree', '-r', '--name-only', base, 'pipelines').stdout.split()
    found, files, added = [], 0, 0
    for f in reign_files(names):
        old = json.loads(git('show', f'{base}:{f}').stdout)
        path = os.path.join(ROOT, f)
        new = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else None
        files += 1
        lost, changed = compare(old, new)
        added += len({e['uuid'] for e in (new or {}).get('events', [])} - {e['uuid'] for e in old.get('events', [])})
        if new is None:
            found.append(f'{f}: file removed ({len(lost)} reigns)')
            continue
        found += [f'{f}: {u}: lost' for u in lost]
        found += [f'{f}: {u}: changed ({", ".join(fields(old, new, u))})' for u in changed]
    for x in found[:40]:
        print(('  ' if allowed else '  CHANGED ') + x)
    if len(found) > 40:
        print(f'  … and {len(found) - 40} more')
    if found and not allowed:
        print(f'{len(found)} committed reign(s) lost or changed against {base}. A reign moves only by Kevin\'s word: label the pull '
              'request `rishenko-reigns` (locally: check:all --skip reigns).')
        return 1
    dup, old = check_overlaps(base, argv[argv.index('--data') + 1] if '--data' in argv else 'data-src')
    for x in dup:
        print('  OVERLAP ' + x)
    if dup:
        print(f'{len(dup)} same-person overlap(s): the same title on the same row with overlapping years, with a reign the base lacks (one reign twice: drop one).')
        return 1
    print(f'reigns: {len(found)} lost or changed, {added} added, in {files} files against {base}'
          + (' (allowed: rishenko-reigns)' if found else '') + (f'; {len(old)} same-person overlaps already on the base' if old else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
