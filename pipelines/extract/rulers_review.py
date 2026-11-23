"""
Rulers bulk review file (Kevin 2026-11-23, pick (a)): one skimmable Markdown file per timeline from rulers.py's output.
Per row: reign count, coverage, the items to check first, then a small sample of the rest. Reads only; writes review.md.

    pipelines/extract/.venv/bin/python -I pipelines/extract/rulers_review.py --timeline modern-states --dir pipelines/out/rows/bulk/modern-states

Layout: review_file.py (shared by every bulk pass). "To check" = Wikidata's term for the same office differs by more
than a month, reign outside the row's phase, Old Style date. A reign whose article is AI-flagged is cited from a list
page's row (rulers.py) or left unplaced and counted per row; the file also checks every cited page against the dump. "Unchecked" (no Wikidata term) and small Wikidata differences are counted, not listed.
"""
import csv
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
MONTHS = 'January February March April May June July August September October November December'.split()
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


def line(r):
    dates = f"{r['start']} – {r['end']}" if r['end'] else f"{r['start']} –"
    vis = ' · visible' if r['importance'] == '2' else ''
    office = f" · {r['office']}" if r.get('office') else ''
    kinds = sorted({x.split(':')[0].strip() for x in r['route'].split('; ') if x}) or ['?']
    cited = f" · cited: {r['cited']} (article AI-flagged)" if r.get('cited') and r['cited'] != r['person'] else ''
    return f"- **{r['person']}** ({dates}){vis}{office} · via {', '.join(kinds)}{cited}"


def ai_check(events):
    """(citations of AI-flagged pages, pages checked): every Wikipedia page the events cite, read from the dump."""
    sys.path[:0] = [os.path.join(ROOT, 'pipelines', 'common')]
    import wp_dump
    pages = {s['url'].rsplit('/wiki/', 1)[-1].replace('_', ' ') for e in events for s in [e['_src']] if '/wiki/' in s['url']}
    bad = [t for t in sorted(pages) if (pg := wp_dump.page(t)) and wp_dump.ai_flagged(pg['text'])]
    for t in bad:
        print('AI-flagged page cited:', t)
    return len(bad), len(pages)


def main():
    sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
    from review_file import Review, Row
    timeline = flag('--timeline', 'modern-states')
    d = flag('--dir') or os.path.join(ROOT, 'pipelines', 'out', 'rows', timeline)
    ds = json.load(open(os.path.join(ROOT, 'data-src', f'{timeline}.json')))
    w0, w1 = hist(ds['meta']['range']['start']), hist(ds['meta']['range']['end'])
    R = list(csv.DictReader(open(os.path.join(d, 'rulers.csv'))))
    data = json.load(open(os.path.join(d, 'rulers-events.json')))
    E, S = data['events'], data['sources']
    for e in E:
        e['_src'] = S[e['sources'][0]['sourceKey']]
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

    rv = Review(kind='Rulers', timeline=ds['meta']['title'], item='reigns', total_rows=len(tracks),
                check_means="Wikidata's term for the same office is more than a month apart, the reign falls outside "
                            "the row's phase, or an Old Style date",
                glossary='"Visible" = importance 2 (shown at default zoom). "via" = how it was found (polity office, '
                         'Wikidata P35, office from the row name, or a "List of monarchs of X" page). "Unchecked" = '
                         'Wikidata has no term for that office. A reign whose own article is AI-flagged is cited '
                         'from a list page\'s row instead, or not placed.')
    for t in tracks:
        rows = by_row.get(t['id'])
        if not rows:
            rv.empty.append(t['name'])
            continue
        sp = t.get('span') or {'start': w0, 'end': w1}
        st = t.get('phases') or (sp if isinstance(sp, list) else [sp])
        r0 = max(w0, min(hist(s['start']) for s in st))
        r1 = min(w1, max(hist(s.get('end', w1)) for s in st))
        cov = len({y for y in years.get(t['id'], ()) if r0 <= y <= r1}) / max(1, r1 - r0 + 1)
        ai = sum('AI-flagged' in r['flags'] for r in R if r['row'] == t['id'] and not r['uuid'])
        notes = f"{unplaced[t['id']]} not placed" + (f" ({ai} of them AI-flagged articles with no list-page row, never cited)" if ai else '')
        rv.rows.append(Row(name=t['name'], coverage=cov, years=(r0, r1), notes=notes,
                           extra={'Unchecked': sum('no Wikidata term' in r['flags'] for r in rows)},
                           items=[{'text': line(r), 'why': check_reasons(r)} for r in rows]))
    rv.ai_check = ai_check(E) if '--no-ai-check' not in sys.argv else None
    out = os.path.join(d, 'review.md')
    n, nf = rv.write(out)
    print(f'{n} reigns, {nf} to check, {len(rv.rows)} rows, AI check {rv.ai_check} -> {out}')


if __name__ == '__main__':
    main()
