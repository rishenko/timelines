"""
Guards against two mistakes found in review (2026-11-24): an added event that repeats one the timeline already has, and a
war placed on the top-level Wars row by hand.

1. Duplicates: in each timeline, a non-reign event added since the base whose title (accents, punctuation and a bracketed
   part ignored) matches another non-reign event starting within 2 years. A pipeline that has the same event should share it
   (`addRow`) or add a date claim to it, not emit a second one. It catches same-title repeats only: the same event under
   another title (Nok iron smelting as "Iron metallurgy may have developed…") and repeats across timelines are left to review. Reigns are left out: the same person reigns on several rows
   (Darius II on Persia and Egypt), and reigns_freeze.py has its own duplicate check. An intended second event (the same name
   for a different thing) is listed in pipelines/common/same-event.json with a reason.
2. Placement: an entry of pipelines/v2/pilot-conflicts.json with `wide: true` (the war gets its own row under Wars) must say
   why in `wide_by` (its combatants span several regions, or Kevin named it multi-region). A hand-set `wide` with no reason fails.
   Kevin's rule: at most 3 countries → their rows; one region → the region row; wider → Wars.

    python3 -I pipelines/common/duplicates_guard.py --base origin/main
"""
import json
import os
import re
import subprocess
import sys
import unicodedata

# the checkout under review: the git repo of the current directory, so a copy run from another worktree checks this one
ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True).stdout.strip() or \
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
TIMELINES = ['ancient-classical', 'medieval', 'modern-states']
ALLOW = os.path.join(ROOT, 'pipelines', 'common', 'same-event.json')
CONFLICTS = 'pipelines/v2/pilot-conflicts.json'


def norm(title):
    t = re.sub(r'[\u2010-\u2015\u2212/]', ' ', title)  # dashes are separators: "Iran–Iraq" is "Iran-Iraq"
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', re.sub(r'\(.*?\)', '', t)).strip()


def is_reign(e):
    return e['uuid'].startswith('reign-') or any(m.get('value') == 'reign' for m in e.get('memberships', []))


def duplicates(base_events, head_events, allow=()):
    """[(new uuid, other uuid, title)] for each added non-reign event that repeats another (same title, starts within 2 years)."""
    old = {e['uuid'] for e in base_events}
    by = {}
    for e in head_events:
        if not is_reign(e):
            by.setdefault(norm(e['title']), []).append(e)
    out = []
    for e in head_events:
        if e['uuid'] in old or e['uuid'] in allow or is_reign(e):
            continue
        for o in by.get(norm(e['title']), []):
            if o['uuid'] != e['uuid'] and abs(o['start'] - e['start']) <= 2 and (o['uuid'] not in allow):
                out.append((e['uuid'], o['uuid'], e['title']))
                break
    return out


def hand_set_wide(conflicts):
    """Titles of pilot-conflicts entries marked `wide` with no `wide_by` reason."""
    entries = []
    for v in conflicts.values() if isinstance(conflicts, dict) else []:
        if isinstance(v, list):
            entries += [x for x in v if isinstance(x, dict)]
    return [x.get('title', '?') for x in entries if x.get('wide') and not x.get('wide_by')]


def show(ref, path):
    r = subprocess.run(['git', 'show', f'{ref}:{path}'], cwd=ROOT, capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else None


def main(argv):
    base = argv[argv.index('--base') + 1] if '--base' in argv else 'origin/main'
    allow = {k: v for k, v in json.load(open(ALLOW)).items() if not k.startswith('_')} if os.path.exists(ALLOW) else {}
    bad = 0
    for t in TIMELINES:
        b = show(base, f'public/timelines/{t}.json') or {'events': []}
        h = json.load(open(os.path.join(ROOT, 'public', 'timelines', f'{t}.json')))
        for new, other, title in duplicates(b['events'], h['events'], allow):
            print(f'  {t}: added "{new}" repeats "{other}" ({title})')
            bad += 1
    path = os.path.join(ROOT, CONFLICTS)
    if os.path.exists(path):
        for title in hand_set_wide(json.load(open(path))):
            print(f'  {CONFLICTS}: "{title}" is wide with no wide_by')
            bad += 1
    if bad:
        print(f'{bad} problems: share an existing event (or list it in same-event.json with a reason); give a wide war its wide_by')
        return 1
    print(f'duplicates: none added against {base}; no hand-set wide wars')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
