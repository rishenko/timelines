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
  unclear-office a committed reign whose freeze review says "office noun unclear": the freeze could not tell what office it
                is, so it may be a governor's or a minister's; each needs an entry.
  succession    two different rulers on one row (data-src) who both answer "who ruled" (a verdict in reign_verdicts.RULED, or a
                plain reign before the verdicts) and whose reigns overlap by more than the slack: SLACK years, or CIRCA_SLACK when
                either date is circa. Co-rulers never count, nor a reign marked consort, party office, de facto or the like. Keyed
                by the later reign; the text names the earlier one and the overlap. Hand-authored reigns count too, so this reads
                the compiled data, not the reign files (the Hittite kings of #252: Freu's dates inside Bryce's Telipinu).

It reads the committed reign files (pipelines/<generator>/reigns.json and *-reigns.json: events and their review) and, for
multi-row and succession, the compiled data-src/<timeline>.json. Needs no dump.

    python3 -I pipelines/common/reign_checks.py [--gate] [--list N] [--only CHECK,CHECK]
"""
import glob
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reign_verdicts as RV  # noqa: E402

# the checkout under review: the git repo of the current directory (as the other guards)
ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True).stdout.strip() or \
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ALLOW = os.path.join('pipelines', 'common', 'reign-checks-allow.json')
CHECKS = ['consort', 'long', 'era-year', 'multi-row', 'unclear-office', 'succession']
TIMELINES = ['ancient-classical', 'medieval', 'modern-states']
MAX_YEARS = 60
CONSORT_LIST = re.compile(r'consort|empresses|queens consort|wives|spouses', re.I)
CONSORT_OFFICE = re.compile(r'\bconsort\b|\b(empress|augusta|queen|duchess|princess)\b', re.I)
ERA = re.compile(r'(\d+)\s*(LE|CS|BE|AH|ME|AM|SE)\b')
UNCLEAR = 'office noun unclear'
SLACK, CIRCA_SLACK = 1, 2  # years two reigns may share: a handover year read two ways; more when a date is circa


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


def year(v):
    """(astronomical year, circa) of a data-src date: a number, or text such as "c. 1650 BCE" (1650 BCE -> -1649)."""
    if isinstance(v, (int, float)):
        return v, False
    m = re.search(r'(\d+)\s*(BCE|BC)?\b', v)
    return (1 - int(m.group(1)) if m.group(2) else int(m.group(1))), bool(re.match(r'\s*c\.', v))


def succession(root=ROOT):
    hits = {}
    for tl in TIMELINES:
        p = os.path.join(root, 'data-src', f'{tl}.json')
        if not os.path.exists(p):
            continue
        with open(p, encoding='utf-8') as f:
            events = json.load(f)['events']
        rows = {}
        for e in events:
            cats = {m.get('value') for m in e.get('memberships', []) if m.get('facet') == 'category'}
            verdicts = cats & set(RV.VERDICTS)
            if 'reign' not in cats or (verdicts and not verdicts & RV.RULED) or 'co-ruler' in verdicts or e.get('start') is None:
                continue
            (s, c0), (en, c1) = year(e['start']), year(e['end']) if e.get('end') is not None else (year(e['start']))  # no end: a point
            for t in e.get('tracks', []):
                rows.setdefault(t, []).append((s, en, c0 or c1 or bool(e.get('circa')), e))
        for row, rs in rows.items():
            rs.sort(key=lambda r: (r[0], r[1]))
            for i, (s, en, c, e) in enumerate(rs):
                for s0, en0, c0, e0 in rs[:i]:
                    over = min(en0, en) - s
                    if e0['title'] != e['title'] and over > (CIRCA_SLACK if c or c0 else SLACK):
                        if e['uuid'] not in hits or over > hits[e['uuid']][0]:
                            hits[e['uuid']] = (over, f'{tl}/{row}: overlaps {e0["title"]} ({e0["uuid"]}) by {over:g} years' + (' (circa)' if c or c0 else ''))
    return {u: m for u, (_, m) in hits.items()}


def unclear(reigns):
    return {u: f'office: {unclear_office(r)}' for u, (_, _, r) in reigns.items() if unclear_office(r) is not None}


def run_checks(root=ROOT, only=None):
    reigns = load_reigns(root)
    fns = {'consort': lambda: consort(reigns), 'long': lambda: long_reigns(reigns), 'era-year': lambda: era_years(reigns),
           'multi-row': lambda: multi_row(root), 'unclear-office': lambda: unclear(reigns),
           'succession': lambda: succession(root)}
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
