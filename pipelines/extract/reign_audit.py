"""
Reign audit (report mode): three checks on every committed reign, from the 2026-11-24 error-classes audit (Workbench note
"Timelines rulers error classes audit"). The freeze guards (reigns_freeze.wrong_kind) run only on reigns a freeze adds, so the
committed reigns never passed them. This re-reads the recorded rulers inputs (the ones freeze_regression.py uses), builds every
committed reign with its office, field and route, and reports:

  1 governors   the cited office is a governor, governor-general, viceroy, high commissioner, resident, administrator… and holds no
                head-of-state word (Kevin 2026-11-24: governors are removed from the rows);
  2 other-row   the office names another row of the timeline and none of this row's own name (phase names do not lend words), or
                names this row only through a colonial phase (a colony, protectorate, viceroyalty or mandate: the empire's monarch
                is not its head of state; a realm where he is the head of state, like Canada, goes in the allowlist);
  3 guards      the freeze guards' own reason, re-run on the committed reigns.

Each check has a reviewed allowlist, pipelines/extract/reign-audit/<check>-allow.json ({"allow": {key: why}}). Report mode: it prints the
counts and writes one CSV per check; it fails nothing (exit 0). A gate comes after the pilot rows are fixed.

    pipelines/.venv/bin/python -I pipelines/extract/reign_audit.py INPUTS_DIR [--out DIR] [--timeline T]

INPUTS_DIR is the recorded rulers inputs (branch regression-inputs, kc2-inputs). Default out: pipelines/out/reign-audit.
"""
import csv
import json
import os
import re
import subprocess
import sys
import tempfile
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
TIMELINES = ['ancient-classical', 'medieval', 'modern-states']
GOVERNOR = re.compile(r'\b(governors?|governor[- ]general|viceroy|vice-?roy|high commissioner|commissioner|lieutenant[- ]governor|resident|administrator|military governor)\b', re.I)
GENERIC = {'kingdom', 'duchy', 'despotate', 'empire', 'republic', 'state', 'states', 'principality', 'union', 'dynasty', 'caliphate', 'sultanate',
           'khanate', 'confederation', 'federation', 'commonwealth', 'colony', 'protectorate', 'first', 'second', 'third', 'upper', 'lower',
           'great', 'grand', 'north', 'south', 'east', 'west', 'northern', 'southern', 'eastern', 'western', 'central', 'later', 'early',
           'rule', 'period', 'british', 'french', 'spanish', 'german', 'dutch', 'portuguese', 'italian', 'russian', 'danish', 'swedish',
           'ottoman', 'roman', 'islamic', 'arab', 'holy'}
WORD = re.compile(r'[A-Za-zÀ-ÿ]{5,}')


def stem(w):
    """The first six letters of a word of six or more (Austria and Australia differ at the sixth), the whole word below that (Niger is not Nigeria)."""
    return w[:6] if len(w) >= 6 else w


def allow(name):
    p = os.path.join(HERE, 'reign-audit', f'{name}-allow.json')
    return json.load(open(p))['allow'] if os.path.exists(p) else {}


def words(s):
    return {w.lower() for w in WORD.findall(re.sub(r'\([^)]*\)', ' ', s))} - GENERIC


def audit_rows(inputs, tl):
    with tempfile.TemporaryDirectory() as d:
        out, aud = os.path.join(d, 'f.json'), os.path.join(d, 'a.json')
        r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'reigns_freeze.py'), '--timeline', tl, '--dir', os.path.join(inputs, tl), '--out', out,
                            '--audit', aud, '--without-extras', '--term-labels', os.path.join(inputs, 'term-labels.json')], capture_output=True, text=True)
        if r.returncode:
            raise SystemExit(f'{tl}: the freeze stopped: {r.stderr.strip()[-300:]}')
        return json.load(open(aud))


def check_governors(rows, tracks, ok):
    import reigns_freeze as F
    hits = []
    for x in rows:
        o = x['office']
        if o and GOVERNOR.search(o) and not F.HEAD.search(o):
            hits.append(dict(x, detail=o))
    return hits


def check_other_row(rows, tracks, ok):
    import reigns_freeze as F
    name_words = {tid: {stem(w) for w in words(t['name'])} for tid, t in tracks.items()}
    hits = []
    for x in rows:
        t = tracks.get(x['row'])
        o = x['office']
        if not t or not o:
            continue
        toks = {stem(w) for w in words(o)}
        own = name_words[x['row']]
        if own & toks:
            continue
        named = sorted(tid for tid, ws in name_words.items() if tid != x['row'] and ws & toks)
        if named:
            hits.append(dict(x, detail=f"office names {', '.join(named[:4])}", kind='names another row', pair=[f"{x['row']}|{n}" for n in named]))
            continue
        # colonial phase: the office matches a phase of this row that is a colony, protectorate, viceroyalty or mandate, and nothing of the row's own name
        ph = [p['name'] for p in t.get('phases', []) if F.COLONIAL.search(p['name']) and toks & {stem(w) for w in words(p['name'])}]
        if ph:
            hits.append(dict(x, detail=f"office matches only the colonial phase {ph[0]!r}", kind='colonial phase', pair=[]))
    return hits


def check_guards(rows, tracks, ok):
    return [dict(x, detail=x['guard']) for x in rows if x['guard']]


def keyed(name, hit):
    """The allowlist key that clears a hit, or None. governors: a reign uuid or a row id (the row's governors are its heads); other-row: a reign
    uuid, a "row|other row" pair (names another row) or "row:colonial" (the colonial-phase rule: a realm whose monarch is its head), never a bare
    row, which would silence every kind of hit; guards: a reign uuid or "reason|row"."""
    a = allow(name)
    if name == 'freeze-guards':
        keys = [hit['uuid'], f"{hit.get('guard')}|{hit['row']}"]
    elif name == 'other-row':
        keys = [hit['uuid']] + hit.get('pair', []) + ([f"{hit['row']}:colonial"] if hit.get('kind') == 'colonial phase' else [])
    else:
        keys = [hit['uuid'], hit['row']]
    return next((k for k in keys if k in a), None)


CHECKS = [('governors', check_governors), ('other-row', check_other_row), ('guards', check_guards)]


def main(argv):
    if not argv or argv[0].startswith('--'):
        raise SystemExit(__doc__)
    inputs = argv[0]
    out = argv[argv.index('--out') + 1] if '--out' in argv else os.path.join(ROOT, 'pipelines', 'out', 'reign-audit')
    only = [argv[argv.index('--timeline') + 1]] if '--timeline' in argv else TIMELINES
    os.makedirs(out, exist_ok=True)
    allowname = {'governors': 'governors', 'other-row': 'other-row', 'guards': 'freeze-guards'}
    total = Counter()
    per = {c: [] for c, _ in CHECKS}
    for tl in only:
        ds = json.load(open(os.path.join(ROOT, 'data-src', f'{tl}.json')))
        tracks = {t['id']: t for t in ds['tracks']}
        import reigns_freeze as F
        F.TRACKS.clear()
        F.TRACKS.update(tracks)
        rows = audit_rows(inputs, tl)
        total[(tl, 'reigns')] = len(rows)
        for c, fn in CHECKS:
            for h in fn(rows, tracks, None):
                k = keyed(allowname[c], h)
                per[c].append(dict(h, timeline=tl, allowed=k or ''))
    for c, hits in per.items():
        with open(os.path.join(out, f'{c}.csv'), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['timeline', 'row', 'person', 'uuid', 'start', 'end', 'office', 'field', 'route', 'detail', 'allowed'])
            for h in hits:
                w.writerow([h['timeline'], h['row'], h['person'], h['uuid'], h['start'], h['end'], h['office'], h['field'], h['route'], h['detail'], h['allowed']])
        left = [h for h in hits if not h['allowed']]
        rows_ = Counter((h['timeline'], h['row']) for h in left)
        print(f"{c}: {len(hits)} flagged, {len(hits) - len(left)} allowlisted, {len(left)} open on {len(rows_)} rows; top: "
              + ', '.join(f"{r} {n}" for (t, r), n in rows_.most_common(8)))
        if c == 'guards':
            print('   by reason: ' + '; '.join(f'{n} {k[:60]}' for k, n in Counter(h['detail'] for h in left).most_common(8)))
        if c == 'other-row':
            print('   by kind: ' + '; '.join(f'{n} {k}' for k, n in Counter(h['kind'] for h in left).most_common()))
    print('reigns: ' + ', '.join(f'{tl} {total[(tl, "reigns")]}' for tl in only) + f'; CSVs in {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
