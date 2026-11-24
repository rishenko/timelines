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

A process guard, like overrides_guard.py: it stops an honest mistake, not a deliberate edit. CI compares with main.

    python3 -I pipelines/common/reigns_guard.py --base origin/main
"""
import json
import os
import re
import subprocess
import sys

# the checkout under review: the git repo of the current directory, so a copy run from another worktree checks this one
ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True).stdout.strip() or \
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


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True)


def main(argv):
    base = argv[argv.index('--base') + 1] if '--base' in argv else 'origin/main'
    allowed = os.environ.get('REIGNS_ALLOWED', '').lower() == 'true'
    names = git('ls-tree', '-r', '--name-only', base, 'pipelines').stdout.split()
    found, files, added = [], 0, 0
    for f in reign_files(names):
        old = json.loads(git('show', f'{base}:{f}').stdout)
        path = os.path.join(ROOT, f)
        new = json.load(open(path)) if os.path.exists(path) else None
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
    print(f'reigns: {len(found)} lost or changed, {added} added, in {files} files against {base}'
          + (' (allowed: rishenko-reigns)' if found else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
