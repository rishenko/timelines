"""
Guard for Kevin's reviewed category overrides (pipelines/{ancient,medieval,modern-states}/categories.json): those files hold
his decisions, and an entry there is read as "reviewed" in the evidence files. A pipeline that wants to set a category uses
the pinned layer instead (traditions.json and science.json, evidence "pinned: <file>"). This check fails when an override
entry is added, removed or changed against the base, unless the change is Kevin's own: a pull request labelled
`kevin-overrides` (CI passes OVERRIDES_ALLOWED=true), or locally `check:all --skip overrides`.

It is a process guard, not a security control: everyone on the project works through one shared account, so it stops an
honest mistake (a pipeline writing its categories into the wrong file), not a deliberate edit. CI compares with main,
never with a stacked PR's base, so writes inherited from a base PR stay visible.

    python3 -I pipelines/common/overrides_guard.py --base origin/main
"""
import json
import os
import subprocess
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FILES = ['pipelines/ancient/categories.json', 'pipelines/medieval/categories.json', 'pipelines/modern-states/categories.json']


def changes(old, new):
    """[(uuid, before, after)] for every override added (before None), removed (after None) or changed."""
    out = []
    for k in sorted(set(old) | set(new)):
        if k.startswith('_'):
            continue
        if old.get(k) != new.get(k):
            out.append((k, old.get(k), new.get(k)))
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
    for x in found[:40]:
        print(('  ' if allowed else '  CHANGED ') + x)
    if len(found) > 40:
        print(f'  … and {len(found) - 40} more')
    if found and not allowed:
        print(f'{len(found)} of Kevin\'s reviewed category overrides changed against {base}. A pipeline sets categories through '
              'the pinned layer (traditions.json, science.json), never these files. If this is Kevin\'s own edit, label the pull '
              'request `kevin-overrides` (locally: check:all --skip overrides).')
        return 1
    print(f'overrides: {len(found)} changed against {base}' + (' (allowed: kevin-overrides)' if found else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
