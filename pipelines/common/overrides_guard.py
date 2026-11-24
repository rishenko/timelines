"""
Guard for Kevin's reviewed category overrides (pipelines/{ancient,medieval,modern-states}/categories.json): those files hold
his decisions, and an entry there is read as "reviewed" in the evidence files. A pipeline that wants to set a category uses
the pinned layer instead (traditions.json and science.json, evidence "pinned: <file>"). This check fails when an override
entry is added, removed or changed against the base, unless the change is Kevin's own: a pull request labelled
`rishenko-overrides` (CI passes OVERRIDES_ALLOWED=true), or locally `check:all --skip overrides`.

It is a process guard, not a security control: everyone on the project works through one shared account, so it stops an
honest mistake (a pipeline writing its categories into the wrong file), not a deliberate edit. CI compares with main,
never with a stacked PR's base, so writes inherited from a base PR stay visible.

It also checks that every override is applied: the categories each overridden event carries in the compiled timeline
(public/timelines/<id>.json, main category first) equal its override. A hand edit of a generated plan
(data-src/ancient-classical-categories.json says "Don't edit") or of a generated timeline breaks that, and the next
generator run would undo it silently. This part fails even with the label: Kevin's call goes into the overrides file, and
the generators carry it into the data.

    python3 -I pipelines/common/overrides_guard.py --base origin/main
"""
import json
import os
import subprocess
import sys

# the checkout under review: the git repo of the current directory, so a copy run from another worktree checks this one
ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True).stdout.strip() or \
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
TIMELINE = {'pipelines/ancient/categories.json': 'ancient-classical', 'pipelines/medieval/categories.json': 'medieval',
            'pipelines/modern-states/categories.json': 'modern-states'}
FILES = list(TIMELINE)


def changes(old, new):
    """[(uuid, before, after)] for every override added (before None), removed (after None) or changed."""
    out = []
    for k in sorted(set(old) | set(new)):
        if k.startswith('_'):
            continue
        if old.get(k) != new.get(k):
            out.append((k, old.get(k), new.get(k)))
    return out


def unapplied(overrides, events):
    """[(uuid, override, categories in the data)] for every override the compiled events don't carry exactly."""
    by_id = {e['uuid']: e for e in events}
    out = []
    for k, v in sorted(overrides.items()):
        if k.startswith('_') or k not in by_id:  # an override naming no event fails in event_categories.apply
            continue
        got = [m['value'] for m in by_id[k].get('memberships', []) if m.get('facet') == 'category']
        if got != v:
            out.append((k, v, got))
    return out


def at(base, path, root=ROOT):
    r = subprocess.run(['git', 'show', f'{base}:{path}'], cwd=root, capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else {}


def main(argv):
    base = argv[argv.index('--base') + 1] if '--base' in argv else 'origin/main'
    allowed = os.environ.get('OVERRIDES_ALLOWED', '').lower() == 'true'
    found = []
    for f in FILES:
        new = json.load(open(os.path.join(ROOT, f)))
        for k, a, b in changes(at(base, f), new):
            found.append(f'{f}: {k}: {a} -> {b}')
    stale = []
    for f in FILES:
        compiled = os.path.join(ROOT, 'public', 'timelines', f'{TIMELINE[f]}.json')
        if os.path.exists(compiled):
            for k, v, got in unapplied(json.load(open(os.path.join(ROOT, f))), json.load(open(compiled))['events']):
                stale.append(f'{f}: {k}: override {v}, data {got}')
    for x in stale[:40]:
        print('  NOT APPLIED ' + x)
    if stale:
        print(f'{len(stale)} reviewed override(s) not what the data carries. Put the decision in the overrides file and rerun the '
              'generator (a generated plan or timeline is never hand-edited); the label does not allow this.')
        return 1
    for x in found[:40]:
        print(('  ' if allowed else '  CHANGED ') + x)
    if len(found) > 40:
        print(f'  … and {len(found) - 40} more')
    if found and not allowed:
        print(f'{len(found)} of Kevin\'s reviewed category overrides changed against {base}. A pipeline sets categories through '
              'the pinned layer (traditions.json, science.json), never these files. If this is Kevin\'s own edit, label the pull '
              'request `rishenko-overrides` (locally: check:all --skip overrides).')
        return 1
    print(f'overrides: {len(found)} changed against {base}' + (' (allowed: rishenko-overrides)' if found else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
