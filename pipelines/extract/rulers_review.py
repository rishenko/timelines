"""
Rulers bulk review file (Kevin 2026-11-23, pick (a)): one skimmable Markdown file per timeline from rulers.py's output.
Per row: reign count, coverage, the items to check first, then a small sample of the rest. Reads only; writes review.md.

    pipelines/extract/.venv/bin/python -I pipelines/extract/rulers_review.py --timeline modern-states --dir pipelines/out/rows/bulk/modern-states

"To check" = Wikidata's term differs by more than a month, reign outside the row's phase, Old Style date. Reigns from
AI-flagged articles are never cited (rulers.py leaves them unplaced); the file counts them per row. "Unchecked" (no Wikidata term) and small Wikidata differences are counted, not listed.
"""
import csv
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
MONTHS = 'January February March April May June July August September October November December'.split()
SAMPLE = 5


def flag(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def hist(v):
    """Historical year from a data-src value: readable '44 BCE' strings or astronomical ints (0 = 1 BCE)."""
    if isinstance(v, str):
        n = int(re.sub(r'\D', '', v))
        return -n if re.search(r'\b(BCE|BC)\b', v) else n
    return v - 1 if v is not None and v <= 0 else v


def day(t):
    m = re.match(r'(?:(\d+) )?(?:([A-Z][a-z]+) )?(\d+)( BCE)?$', (t or '').strip())
    if not m:
        return None
    y = -int(m[3]) if m[4] else int(m[3])
    return y * 365.25 + (MONTHS.index(m[2]) * 30.4 if m[2] in MONTHS else 0) + (int(m[1]) if m[1] else 0)


def wd_gap(r):
    """Largest gap in days between our dates and Wikidata's, or None when one can't be read."""
    f = [x for x in r['flags'].split('; ') if x.startswith('Wikidata differs')]
    if not f:
        return 0
    a, b = (f[0].split(': ', 1)[1].split(' – ') + [''])[:2]
    gaps = []
    for ours, theirs in ((r['start'], a), (r['end'], b)):
        if not ours or not theirs.strip():
            continue
        x, y = day(ours), day(theirs)
        gaps.append(None if x is None or y is None else abs(x - y))
    return None if None in gaps else max(gaps, default=0)


def check_reasons(r):
    out = []
    for f in [x for x in r['flags'].split('; ') if x]:
        if f.startswith('Wikidata differs'):
            g = wd_gap(r)
            if g is None or g > 31:
                out.append(f)
        elif not f.startswith('no Wikidata term'):
            out.append(f)
    return out


def line(r, why=None):
    dates = f"{r['start']} – {r['end']}" if r['end'] else f"{r['start']} –"
    vis = ' · visible' if r['importance'] == '2' else ''
    office = f" · {r['office']}" if r.get('office') else ''
    kinds = sorted({x.split(':')[0].strip() for x in r['route'].split('; ') if x}) or ['?']
    s = f"- **{r['person']}** ({dates}){vis}{office} · via {', '.join(kinds)}"
    return s + (f"\n  - ⚠ {'; '.join(why)}" if why else '')


def main():
    timeline = flag('--timeline', 'modern-states')
    d = flag('--dir') or os.path.join(ROOT, 'pipelines', 'out', 'rows', timeline)
    ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json')))
    w0, w1 = hist(ds['meta']['range']['start']), hist(ds['meta']['range']['end'])
    R = list(csv.DictReader(open(os.path.join(d, 'rulers.csv'))))
    E = json.load(open(os.path.join(d, 'rulers-events.json')))['events']
    tracks = [t for t in ds['tracks'] if t.get('url')]
    by_row, unplaced = {}, Counter()
    for r in R:
        if r['uuid']:
            by_row.setdefault(r['row'], []).append(r)
        else:
            unplaced[r['row']] += 1
    years = {}
    for e in E:
        years.setdefault(e['tracks'][0], set()).update(range(hist(e['start']), hist(e.get('end', e['start'])) + 1))

    stats, sections = [], []
    for t in tracks:
        rows = by_row.get(t['id'])
        if not rows:
            continue
        sp = t.get('span') or {'start': w0, 'end': w1}
        st = t.get('phases') or (sp if isinstance(sp, list) else [sp])
        r0 = max(w0, min(hist(s['start']) for s in st))
        r1 = min(w1, max(hist(s.get('end', w1)) for s in st))
        cov = len({y for y in years.get(t['id'], ()) if r0 <= y <= r1}) / max(1, r1 - r0 + 1)
        check = [(r, check_reasons(r)) for r in rows]
        flagged = [(r, w) for r, w in check if w]
        rest = [r for r, w in check if not w]
        ai = sum('AI-flagged' in r['flags'] for r in R if r['row'] == t['id'] and not r['uuid'])
        unchecked = sum('no Wikidata term' in r['flags'] for r in rows)
        step = max(1, len(rest) // SAMPLE)
        sample = rest[::step][:SAMPLE]
        stats.append((t, len(rows), cov, len(flagged), unchecked))
        sections += [f"## {t['name']}", '',
                     f"{len(rows)} reigns · coverage {100 * cov:.0f}% of {hist(r0)}–{hist(r1)} · {len(flagged)} to check · "
                     f"{unchecked} unchecked (no Wikidata term) · {unplaced[t['id']]} not placed" + (f" ({ai} of them AI-flagged articles, never cited)" if ai else ''), '']
        if flagged:
            sections += ['**To check**', ''] + [line(r, w) for r, w in flagged] + ['']
        if sample:
            sections += [f"**Sample** ({len(sample)} of {len(rest)} others)", ''] + [line(r) for r in sample] + ['']

    n = sum(s[1] for s in stats)
    nf = sum(s[3] for s in stats)
    none = [t['name'] for t in tracks if t['id'] not in by_row]
    covs = sorted(s[2] for s in stats)
    md = [f"# Rulers review: {ds['meta']['title']}", '',
          f"{n} reign events on {len(stats)} of {len(tracks)} rows with an article. Median coverage "
          f"{100 * covs[len(covs) // 2]:.0f}% (share of a row's years with a reign). {nf} to check "
          f"({100 * nf / max(1, n):.0f}%). Nothing is in data-src yet.", '',
          'Each row lists reigns to check first: Wikidata gives dates more than a month apart, the reign falls outside '
          "the row's phase, or an Old Style date. Then a sample of the rest. "
          '"Visible" = importance 2 (shown at default zoom). "via" = how it was found (polity office, Wikidata P35, '
          'office from the row name, or a "List of monarchs of X" page).', '',
          '| Row | Reigns | Coverage | To check | Unchecked |', '|---|---|---|---|---|']
    md += [f"| {t['name']} | {k} | {100 * c:.0f}% | {f} | {u} |" for t, k, c, f, u in stats]
    md += ['', f"**Rows with no reigns found ({len(none)}):** " + ', '.join(none), ''] + sections
    out = os.path.join(d, 'review.md')
    open(out, 'w').write('\n'.join(md) + '\n')
    print(f'{n} reigns, {nf} to check, {len(stats)} rows -> {out}')


if __name__ == '__main__':
    main()
