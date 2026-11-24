"""
Old vs new classifier output, before a rerun (crew idea, pass 7). Classifies every event that has no reviewed override
with the classifier at a git revision (old) and the working copy's (new), and lists what moves, grouped by the change
("religion → text": 6 events). Reviewed events are skipped: their overrides win either way. A change that moves nothing
needs no rerun (the facet changes only if the vocabulary does).

    npm run categories:diff [-- --base <rev>] [--all] [<timeline> ...]

<timeline>: modern-states, ancient-classical, medieval (default: all three). --base defaults to origin/main. --all lists
every moved event; otherwise each group shows up to 8. Reads the compiled files in public/timelines/ and the Wikipedia
dump (settings.py); without the dump, title and field evidence only (said on stderr).
"""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import event_categories as new  # noqa: E402

# timeline → its reviewed overrides (the generator that applies them)
TIMELINES = {
    'modern-states': 'pipelines/modern-states/categories.json',
    'ancient-classical': 'pipelines/ancient/categories.json',
    'medieval': 'pipelines/medieval/categories.json',
}


def old_classifier(rev):
    src = subprocess.run(['git', 'show', f'{rev}:pipelines/common/event_categories.py'], cwd=REPO, check=True,
                         capture_output=True, text=True).stdout
    path = os.path.join(tempfile.mkdtemp(), 'event_categories_old.py')
    open(path, 'w').write(src)
    spec = importlib.util.spec_from_file_location('event_categories_old', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    sys.path.remove(os.path.dirname(path))  # it adds its own folder; the shared modules stay HERE's
    return mod


def fmt(cats):
    return ' + '.join(v for v, _ in cats) or '(none)'


def main(argv):
    base = argv[argv.index('--base') + 1] if '--base' in argv else 'origin/main'
    show_all = '--all' in argv
    names = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] != '--base')] or list(TIMELINES)
    for n in names:
        if n not in TIMELINES:
            sys.exit(f'unknown timeline "{n}" (one of {", ".join(TIMELINES)})')
    try:
        import wp_dump as wp
        wp.page('Magna Carta')
    except Exception as err:  # no dump on this machine
        print(f'(no Wikipedia dump: {err}; title and field evidence only)', file=sys.stderr)
        wp = None
    old = old_classifier(base)
    for n in names:
        ds = json.load(open(os.path.join(REPO, 'public', 'timelines', f'{n}.json')))
        reviewed = {k for k in json.load(open(os.path.join(REPO, TIMELINES[n]))) if not k.startswith('_')}
        groups = defaultdict(list)
        checked = 0
        for e in ds['events']:
            if e['uuid'] in reviewed:
                continue
            checked += 1
            a, b = old.classify(e, ds, wp), new.classify(e, ds, wp)
            if [v for v, _ in a] != [v for v, _ in b]:
                groups[(fmt(a), fmt(b))].append((e, b))
        moved = sum(len(g) for g in groups.values())
        print(f'\n## {n}: {moved} of {checked} non-reviewed events move ({len(reviewed)} reviewed, skipped; base {base})')
        for (a, b), evs in sorted(groups.items(), key=lambda kv: -len(kv[1])):
            print(f'\n{a} → {b}: {len(evs)}')
            for e, cats in (evs if show_all else evs[:8]):
                print(f'  - {e["title"]} ({e["uuid"]}): {" · ".join(ev for _, ev in cats)}')
            if not show_all and len(evs) > 8:
                print(f'  … {len(evs) - 8} more (--all)')


if __name__ == '__main__':
    main(sys.argv[1:])
