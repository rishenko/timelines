"""Where the data lives: one root per machine, one fixed tree under it (Workbench "2026-11-25 Timelines data root layout").

The root, first match wins:  $TIMELINES_DATA (the old variable, kept as an override for a pass), $TIMELINES_DATA_ROOT, "dataRoot" in
timelines.local.json at the repo root (gitignored), else ~/data. A single folder of the tree can still be overridden by its old
variable (TIMELINES_STAGES, REGRESSION_INPUTS). The names under the root are in data-root.json, shared with scripts/lib/data-root.ts; both
read data-root.cases.json in their tests, so the two resolvers cannot drift.

    import data_root;  data_root.where('stages')  ->  <root>/stages
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))
with open(os.path.join(HERE, 'data-root.json'), encoding='utf-8') as _f:
    CONFIG = json.load(_f)


def _expand(p, home, pathmod):
    return pathmod.join(home, p[2:]) if p == '~' or p[:2] in ('~/', '~\\') else p


def root(env=None, repo=REPO, home=None, pathmod=os.path):
    """The data root: the first of the root variables that is set, else timelines.local.json's dataRoot, else ~/data."""
    env = os.environ if env is None else env
    home = home or pathmod.expanduser('~')
    for name in CONFIG['rootEnv']:
        if env.get(name):
            return _expand(env[name], home, pathmod)
    local = pathmod.join(repo, CONFIG['localFile'])
    if pathmod.exists(local):
        try:
            with open(local, encoding='utf-8') as f:
                value = json.load(f).get('dataRoot')
        except (OSError, ValueError):
            value = None
        if value:
            return _expand(value, home, pathmod)
    return _expand(CONFIG['default'], home, pathmod)


def where(name, *parts, env=None, repo=REPO, home=None, pathmod=os.path):
    """The folder `name` of the tree (and `parts` under it): its own old variable if set, else <root>/<name>."""
    env = os.environ if env is None else env
    if name not in CONFIG['tree']:
        raise KeyError(f'{name} is not in the data tree: {sorted(CONFIG["tree"])}')
    own = env.get(CONFIG['overrideEnv'].get(name, ''))
    base = _expand(own, home or pathmod.expanduser('~'), pathmod) if own else pathmod.join(root(env, repo, home, pathmod), CONFIG['tree'][name])
    return pathmod.join(base, *parts)
