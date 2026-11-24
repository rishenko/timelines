"""
Infobox reign count against the row (report mode): check 10 of the 2026-11-24 rulers error-classes audit (Workbench "Timelines rulers
error classes audit", class 9: "reigns of the same ruler missing from the row").

For each person a committed reign cites, read the infobox's reign blocks from the Wikipedia dump (rulers.wp_reigns: reign/reignN, a block typed
Caesar/heir/junior/co-ruler left out, as the rulers pass reads them; term_start blocks are not read: they are other offices) and compare them with the
reigns the timelines carry for that person. A term of the infobox that no committed reign of the person matches (same start year,
within a year) is **missing**; a term carried by a reign of the person on another row (the realm's other title, a colony) is not.
It reports the persons who have at least one reign on a row and at least one missing term:

    python3 -I pipelines/extract/reign_infobox_count.py [--out DIR] [--gate]      (the extractor's venv Python; needs the dump)

Reads the committed pipelines/<generator>/{reigns,extra-reigns,...}.json (events and the review entries that name the person, row
and cited article). Writes pipelines/out/reign-infobox/infobox-count.csv (one line per missing term) and prints the persons.
Without the dump it says so and exits 0 (check:all runs it on every machine). Report mode exits 0; --gate exits 1 on a person who is
neither fixed nor allowed, and on a stale allowlist entry.

Allowlist: pipelines/extract/reign-audit/infobox-count-allow.json, {"allow": {"<row>|<person>": "why"}}: a reviewed exception
(co-reign fields, a block for another realm with no succession, a reign the row should not carry). Expect about a fifth of the hits
to be such false positives (the audit's estimate); the rest are the reigns the next recall pass adds.
"""
import csv
import glob
import json
import os
import re
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
ALLOW = os.path.join(HERE, 'reign-audit', 'infobox-count-allow.json')
GENERATORS = ['ancient', 'medieval', 'modern-states']


def flag(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def have_dump():
    try:
        import mwparserfromhell  # noqa: F401  (the extractor's venv has it; a bare python3 does not)
        sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
        import settings  # noqa: E402
        return os.path.exists(os.path.join(settings.WIKIPEDIA, 'extract-' + settings.DUMP_NAME + '.sqlite'))
    except Exception:
        return False


def committed():
    """[(uuid, person, row, article, start, end, cited infobox field)] for every committed reign (reigns.json and the one-off and extra files)."""
    out = []
    for g in GENERATORS:
        for path in sorted(glob.glob(os.path.join(ROOT, 'pipelines', g, '*reigns.json'))):
            d = json.load(open(path, encoding='utf-8'))
            for e in d['events']:
                r = (d.get('review') or {}).get(e['uuid'])  # a one-off file without review entries has no cited article to read
                if r and r.get('person'):  # Italy's list-page reigns carry no cited article
                    loc = (e.get('sources') or [{}])[0].get('sourceLocation', '')
                    m = re.match(r'infobox (reign\d*)\b', loc)
                    out.append((e['uuid'], r['person'], r['row'], r.get('cited') or r['person'], e['start'], e.get('end'), m.group(1) if m else None))
    return out


def norm_succ(t):
    return re.sub(r'[^a-z0-9]+', ' ', (t or '').lower()).strip()


LOCAL_ERA = re.compile(r'\b(AH|LE|BE|CS|ME|AM|SE)\b')


def compare(got, mine, row=None):
    """(same-office, unknown-office) lists of the infobox terms no committed reign of the person matches. got: terms_of(); mine:
    [(uuid, row, person, start year, cited field)]. A term matches a reign that starts within a year of it, on any row (a term the
    person's other row carries is not missing). The office is the row's own: with row given, only the succession texts of the blocks that
    row's reigns cite count. A block dated in a local era (AH, LE, BE…) is skipped unless it also gives a CE/AD date."""
    starts = {m[3] for m in mine}
    carried_succ = {t[4] for t in got if t[0] in {m[4] for m in mine if row is None or m[1] == row} and t[4]}
    missing = [t for t in got if not any(abs(t[1] - s) <= 1 for s in starts) and not (LOCAL_ERA.search(t[3]) and not re.search(r'\b(CE|AD|C\.E\.)', t[3]))]
    return ([t + ('same office',) for t in missing if t[4] and t[4] in carried_succ], [t + ('succession unknown',) for t in missing if not t[4]])


def terms_of(article, RU, wp_dump):
    """[(field, historical start year, end year or None, text, succession)] of the article's infobox reign blocks."""
    p = wp_dump.page(article)
    if not p:
        return None
    params = RU.infobox_params(p['text'])
    return [(f, RU.hist(s['start'][0]), RU.hist(s['end'][0]) if s.get('end') else None, params.get(f, ''), norm_succ(succ))
            for f, s, succ in RU.wp_reigns(params) if s.get('start') and f.startswith('reign')]  # reign blocks only: term_start blocks are other offices (a president's governorship, a senate seat)


def main():
    if not have_dump():
        print('reign infobox count: skipped, no Wikipedia dump or no extractor venv here (it needs the extract database and mwparserfromhell)')
        return 0
    import rulers as RU  # noqa: E402
    import wp_dump  # noqa: E402

    reigns = committed()
    by_person = defaultdict(list)  # article -> [(uuid, row, person, start year, cited field)]
    for uuid, person, row, article, start, end, field in reigns:
        by_person[article].append((uuid, row, person, RU.hist(start), field))
    allow = json.load(open(ALLOW, encoding='utf-8'))['allow'] if os.path.exists(ALLOW) else {}
    hits, allowed_seen = [], set()
    for article in sorted(by_person):
        got = terms_of(article, RU, wp_dump)
        if not got:
            continue
        mine = by_person[article]
        for row in sorted({m[1] for m in mine}):
            same, other = compare(got, mine, row)
            if same or other:
                person = mine[0][2]
                hits.append((row, person, article, len([1 for m in mine if m[1] == row]), len(got), same + other, bool(same)))
    out_dir = flag('--out', os.path.join(ROOT, 'pipelines', 'out', 'reign-infobox'))
    os.makedirs(out_dir, exist_ok=True)
    new = []
    with open(os.path.join(out_dir, 'infobox-count.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['row', 'person', 'article', 'reigns on the row', 'infobox terms', 'missing field', 'missing start', 'missing end', 'infobox text', 'office', 'allowed'])
        for row, person, article, n, total, missing, firm in hits:
            key = f'{row}|{person}'
            ok = key in allow
            if ok:
                allowed_seen.add(key)
            else:
                new.append(key)
            for field, s, e, text, _succ, how in missing:
                w.writerow([row, person, article, n, total, field, s, e, text[:160], how, 'yes' if ok else ''])
    stale = sorted(set(allow) - allowed_seen)
    firm = [h for h in hits if h[6]]
    print(f'reign infobox count: {len(firm)} person(s) with a reign block of an office their row carries and no committed reign for it '
          f'({sum(len([t for t in h[5] if t[5] == "same office"]) for h in firm)} terms), and {len(hits) - len(firm)} more with only blocks whose succession is empty '
          f'(unknown office); {len(allowed_seen)} allowed, {len(new)} new -> {os.path.join(out_dir, "infobox-count.csv")}')
    for row, person, article, n, total, missing, _firm in firm[:12]:
        print(f'  {row}: {person} carries {n} of {total} infobox term(s); missing ' + '; '.join(f'{t[0]} {t[1]}–{t[2] if t[2] is not None else ""}' for t in missing[:3] if t[5] == 'same office'))
    if len(firm) > 12:
        print(f'  … {len(firm) - 12} more in the CSV')
    if stale:
        print(f'  stale allowlist entries (no longer a hit): {stale[:10]}')
    return 1 if '--gate' in sys.argv and (new or stale) else 0


if __name__ == '__main__':
    sys.exit(main())
