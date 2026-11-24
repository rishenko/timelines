"""
review-proof: the checks a reviewer runs before every approval (pass 9, backlog 9.1), as one command with one line to paste
into the approval comment. Each of the three caught a bad head in seconds in pass 8 (#132, #153, wars-pass).

1. overrides: Kevin's reviewed category overrides unchanged (pipelines/common/overrides_guard.py, #155).
2. duplicates: no added event repeats one the timeline has, no hand-set wide war (pipelines/common/duplicates_guard.py, #157).
   reigns: no committed reign lost or changed without the rishenko-reigns label (pipelines/common/reigns_guard.py, #165).
3. additivity: per timeline, events added and removed, events whose only change is appended `tracks`, and events changed in
   any other way (by field). A report, not a gate: a quote backfill changes sources on purpose. The reviewer checks that
   what changed is what the PR says it changes.

All three compare against the merge-base of HEAD and --base (default origin/main), so commits that landed on main after the
branch point don't show up as the branch's changes. A guard that isn't on this checkout yet is reported as missing.

    python3 -I pipelines/common/review_proof.py [--base origin/main] [--list N]

Exit 1 if a guard fails or is missing; the additivity line never fails. The last line is the one to paste:
    review-proof <head sha> vs merge-base <sha>: overrides ok · duplicates ok · ancient-classical +3 −0, tracks+ 12, changed 0 · …
"""
import json
import os
import subprocess
import sys

# the checkout under review: the git repo of the current directory (so one copy of this script can prove any worktree)
ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, encoding='utf-8').stdout.strip() or \
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
GUARDS = [('overrides', 'pipelines/common/overrides_guard.py'), ('duplicates', 'pipelines/common/duplicates_guard.py'),
          ('reigns', 'pipelines/common/reigns_guard.py')]
DATA_DIR = 'public/timelines'


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, check=True, encoding='utf-8').stdout.strip()


def load_at(ref, path):
    """The JSON file at a git revision, or None if it isn't there."""
    r = subprocess.run(['git', 'show', f'{ref}:{path}'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    return json.loads(r.stdout) if r.returncode == 0 else None


def timelines_at(ref):
    out = subprocess.run(['git', 'ls-tree', '--name-only', f'{ref}:{DATA_DIR}'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    return {n[:-5] for n in out.stdout.split() if n.endswith('.json') and n != 'index.json'}


def additivity(old_events, new_events):
    """Compare two event lists by uuid: (added, removed, tracks_appended, changed), changed as {uuid: [fields]}."""
    old = {e['uuid']: e for e in old_events}
    new = {e['uuid']: e for e in new_events}
    added = sorted(new.keys() - old.keys())
    removed = sorted(old.keys() - new.keys())
    appended, changed = [], {}
    for u in sorted(old.keys() & new.keys()):
        a, b = old[u], new[u]
        if a == b:
            continue
        fields = sorted(k for k in a.keys() | b.keys() if k != 'tracks' and a.get(k) != b.get(k))
        ta, tb = a.get('tracks', []), b.get('tracks', [])
        if not fields and tb[:len(ta)] == ta:
            appended.append(u)
        else:
            if ta != tb:
                fields.append('tracks')
            changed[u] = sorted(fields)
    return added, removed, appended, changed


def report_additivity(base, show):
    parts, details = [], []
    names = sorted(timelines_at(base) | {f[:-5] for f in os.listdir(os.path.join(ROOT, DATA_DIR))
                                         if f.endswith('.json') and f != 'index.json'})
    for t in names:
        path = f'{DATA_DIR}/{t}.json'
        a = load_at(base, path)
        fp = os.path.join(ROOT, path)
        b = json.load(open(fp, encoding='utf-8')) if os.path.exists(fp) else None
        if a is None or b is None:
            parts.append(f'{t} {"new timeline" if a is None else "removed timeline"}')
            continue
        added, removed, appended, changed = additivity(a.get('events', []), b.get('events', []))
        if not (added or removed or appended or changed):
            continue
        parts.append(f'{t} +{len(added)} −{len(removed)}, tracks+ {len(appended)}, changed {len(changed)}')
        if changed:
            by_field = {}
            for fs in changed.values():
                for f in fs:
                    by_field[f] = by_field.get(f, 0) + 1
            details.append(f'  {t} changed by field: ' + ', '.join(f'{f} {n}' for f, n in sorted(by_field.items())))
        for label, ids in (('removed', removed), ('changed', list(changed))):
            if ids and show:
                details.append(f'  {t} {label}: ' + ', '.join(ids[:show]) + (f' (+{len(ids) - show} more)' if len(ids) > show else ''))
    return parts or ['no event changes'], details


def main(argv):
    base_ref = argv[argv.index('--base') + 1] if '--base' in argv else 'origin/main'
    show = int(argv[argv.index('--list') + 1]) if '--list' in argv else 5
    head = git('rev-parse', 'HEAD')
    base = git('merge-base', 'HEAD', base_ref)
    if git('status', '--porcelain', '--untracked-files=no', '--', DATA_DIR):
        print(f'note: {DATA_DIR} has uncommitted changes; the proof reads the working tree, the SHA names HEAD')
    results, failed = [], False
    for name, script in GUARDS:
        if not os.path.exists(os.path.join(ROOT, script)):
            results.append(f'{name} MISSING')
            failed = True
            continue
        r = subprocess.run([sys.executable, '-I', script, '--base', base], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
        if r.returncode == 0:
            results.append(f'{name} ok')
        else:
            failed = True
            results.append(f'{name} FAIL')
            print('\n'.join((r.stdout + r.stderr).strip().splitlines()[-10:]))
    parts, details = report_additivity(base, show)
    if details:
        print('\n'.join(details))
    print(f'review-proof {head} vs merge-base {base[:7]}: ' + ' · '.join(results + parts))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
