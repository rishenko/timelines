"""
Checks on the committed reigns (pass 9, from the rulers error-classes audit, Workbench "2026-11-24 Timelines rulers error classes
audit", proposed checks 4, 6, 7 and 12). Report mode: every hit is listed; a hit that has a reviewed entry in reign-checks-allow.json
is "allowed" (an approved exception, with its reason), any other is "new". With --gate a new hit, or an allowlist entry that no longer
matches anything, exits 1; without it the run always exits 0, so the checks can run before their allowlists are reviewed.

  consort       a reign whose office the freeze recorded as a consort's (the "office noun unclear" note names "... consort"),
                or as Empress, Augusta, Queen, Duchess or Princess of …, or that only a consort list reached (List of … empresses,
                queens consort, wives). Reigning empresses and grand duchesses are real: they get allowlist entries.
  long          a reign longer than 60 years. Most are real (Louis XIV, Sobhuza II); each needs an entry.
  era-year      a reign whose cited text dates it in a local era (LE, CS, BE, AH, ME, AM, SE) and whose start or end is one of
                those era years, not the CE year beside it (Thong Lan: "Seven days in 750 LE (1388/89 CE)" read as 750-1388).
  multi-row     an event in the reign category on more than one row (data-src): it shows as a reign on rows the person
                never ruled ("Reign of Hammurabi" on the Amorites row).
  acting-label  a reign whose cited infobox block is tagged Acting or Interim as a whole ("; Acting", "Acting President", "(Interim)")
                but whose title does not say so: the generators ignore the tag, so an acting term reads as a full presidency.
  acting-part   a reign whose cited block carries an acting or interim spell inside it ("Acting: 24 January 1950 – 13 February
                1952", "Acting until 27 March 1968"): the dates may include the acting spell; each needs a look or an entry.
  unclear-office a committed reign whose freeze review says "office noun unclear": the freeze could not tell what office it
                is, so it may be a governor's or a minister's; each needs an entry.

It reads the committed reign files (pipelines/<generator>/reigns.json and *-reigns.json: events and their review) and, for
multi-row, the compiled data-src/<timeline>.json. Needs no dump.

    python3 -I pipelines/common/reign_checks.py [--gate] [--list N] [--only CHECK,CHECK]
"""
import glob
import json
import os
import re
import subprocess
import sys

# the checkout under review: the git repo of the current directory (as the other guards)
ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True).stdout.strip() or \
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ALLOW = os.path.join('pipelines', 'common', 'reign-checks-allow.json')
CHECKS = ['consort', 'long', 'era-year', 'multi-row', 'acting-label', 'acting-part', 'unclear-office']
TIMELINES = ['ancient-classical', 'medieval', 'modern-states']
MAX_YEARS = 60
CONSORT_LIST = re.compile(r'consort|empresses|queens consort|wives|spouses', re.I)
CONSORT_OFFICE = re.compile(r'\bconsort\b|\b(empress|augusta|queen|duchess|princess)\b', re.I)
ERA = re.compile(r'(\d+)\s*(LE|CS|BE|AH|ME|AM|SE)\b')
UNCLEAR = 'office noun unclear'
ACTING = re.compile(r'\b(acting|interim)\b', re.I)
ACTING_TITLE = re.compile(r'^(acting|interim)\b', re.I)
# a tag with its own dates or bound ("Acting: 1 – 7 May 1993", "Acting until …", "Acting to …") covers part of the block
ACTING_PART = re.compile(r'\b(acting|interim)\s*(:|until|to\b|\(law\))', re.I)


def load_reigns(root=ROOT):
    """{uuid: (file, event, review)} for every committed reign."""
    out = {}
    for p in sorted(glob.glob(os.path.join(root, 'pipelines', '*', 'reigns.json')) + glob.glob(os.path.join(root, 'pipelines', '*', '*-reigns.json'))):
        with open(p, encoding='utf-8') as f:
            j = json.load(f)
        rel = os.path.relpath(p, root)
        for e in j.get('events', []):
            out[e['uuid']] = (rel, e, j.get('review', {}).get(e['uuid'], {}))
    return out


def unclear_office(review):
    """The office text an "office noun unclear" note names, or None."""
    for t in review.get('toCheck', []):
        if t.startswith(UNCLEAR):
            return t.split(': ', 1)[1] if ': ' in t else ''
    return None


def consort(reigns):
    hits = {}
    for u, (_, _, r) in reigns.items():
        office = unclear_office(r)
        parts = [x.strip() for x in r.get('route', '').split(';') if x.strip()]
        lists = [x for x in parts if x.startswith('list:')]
        if office and CONSORT_OFFICE.search(office):
            hits[u] = f'office: {office}'
        elif lists and all(CONSORT_LIST.search(x) for x in lists) and not any(x.startswith(('office:', 'polity:')) for x in parts):
            hits[u] = f'reached only through {"; ".join(lists)}'
    return hits


def long_reigns(reigns):
    return {u: f'{e["start"]}–{e["end"]}: {e["end"] - e["start"]} years' for u, (_, e, _) in reigns.items()
            if isinstance(e.get('start'), int) and isinstance(e.get('end'), int) and e['end'] - e['start'] > MAX_YEARS}


def era_years(reigns):
    hits = {}
    for u, (_, e, _) in reigns.items():
        loc = ' '.join(s.get('sourceLocation', '') for s in e.get('sources', []))
        marked = {int(m.group(1)) for m in ERA.finditer(loc)}
        if marked and (e.get('start') in marked or e.get('end') in marked):
            hits[u] = f'{e.get("start")}–{e.get("end", "")} from "{loc}"'
    return hits


def multi_row(root=ROOT):
    hits = {}
    for tl in TIMELINES:
        p = os.path.join(root, 'data-src', f'{tl}.json')
        if not os.path.exists(p):
            continue
        with open(p, encoding='utf-8') as f:
            for e in json.load(f)['events']:
                if len(e.get('tracks', [])) > 1 and any(m.get('facet') == 'category' and m.get('value') == 'reign' for m in e.get('memberships', [])):
                    hits[e['uuid']] = f'{tl}: on {", ".join(e["tracks"])}'
    return hits


def acting(reigns, part):
    hits = {}
    for u, (_, e, _) in reigns.items():
        loc = ' '.join(s.get('sourceLocation', '') for s in e.get('sources', []))
        if ACTING.search(loc) and not ACTING_TITLE.match(e.get('title', '')) and bool(ACTING_PART.search(loc)) == part:
            hits[u] = f'"{e.get("title", "")}" {e.get("start")}–{e.get("end", "")} from "{loc}"'
    return hits


def unclear(reigns):
    return {u: f'office: {unclear_office(r)}' for u, (_, _, r) in reigns.items() if unclear_office(r) is not None}


def run_checks(root=ROOT, only=None):
    reigns = load_reigns(root)
    fns = {'consort': lambda: consort(reigns), 'long': lambda: long_reigns(reigns), 'era-year': lambda: era_years(reigns),
           'multi-row': lambda: multi_row(root), 'acting-label': lambda: acting(reigns, False), 'acting-part': lambda: acting(reigns, True),
           'unclear-office': lambda: unclear(reigns)}
    return {c: fns[c]() for c in CHECKS if not only or c in only}


def main(argv):
    gate = '--gate' in argv
    show = int(argv[argv.index('--list') + 1]) if '--list' in argv else 10
    only = argv[argv.index('--only') + 1].split(',') if '--only' in argv else None
    path = os.path.join(ROOT, ALLOW)
    allow = {}
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            allow = json.load(f)
    bad = 0
    for check, hits in run_checks(ROOT, only).items():
        ok = allow.get(check, {})
        new = sorted(u for u in hits if u not in ok)
        stale = sorted(u for u in ok if u not in hits)
        print(f'{check}: {len(hits)} hits, {len(hits) - len(new)} allowed, {len(new)} new' + (f', {len(stale)} stale allowlist entries' if stale else ''))
        for u in new[:show]:
            print(f'  NEW   {u}: {hits[u]}')
        if len(new) > show:
            print(f'  … and {len(new) - show} more (--list N)')
        for u in stale:
            print(f'  STALE {u}: in {ALLOW} but no longer a hit; remove it')
        bad += len(new) + len(stale)
    if gate and bad:
        print(f'{bad} new hit(s) or stale entries. A real exception gets a reviewed entry in {ALLOW} ({{check: {{uuid: reason}}}}); a wrong reign is fixed in its own data PR.')
        return 1
    print('report mode: not failing' if not gate else 'reign checks: clean')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
