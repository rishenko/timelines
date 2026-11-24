"""
Known-counts check (Kevin, 2026-11-23: "Data protection is paramount. If there are textual numerical counts or
expectations, the data must validate against that. US presidents, number of states, etc."). Every count a cited
Wikipedia article states becomes a check on the compiled timelines in public/timelines/ (run it after
`npm run data -- build all`). Specs: known-counts.json.

    python3 -I pipelines/extract/known_counts.py [--verify-sources] [--list]

A spec holds the expected number, what is counted, and where the number comes from:
  source  {article, quote, dump} (or {url, article, quote, read} for an official page outside the dump, read by hand on `read`; --verify-sources skips it): the Wikipedia sentence (or list entry) that states the number. The expected number
          is in the quote. `--verify-sources` reads the dump (pipelines/common/wp_dump, needs the extractor's venv and
          $TIMELINES_DATA) and fails when the article no longer holds the quote: a monthly refresh then shows which
          stated numbers moved. Without the flag the check needs no dump, so it runs in check:all.
  kind    "text": the article states the total in a sentence: a failure is a hard failure.
          "list": the number is the last numbered entry of a cited list page: a failure is only a warning until the
          list page has been read (Kevin's rule: warnings become hard once read).
  measure "people": distinct people with a reign (title "Reign of …", "Presidency of …", …) on the rows
          "reigns": the reign events themselves (a ruler with two terms counts twice)
          "members": the rows that were members of the bloc row at `at` (the rows' `memberOf` lists)
          "table": the article's list has no number: its table rows (the first cell of each row, `table.names`, frozen in the spec) are the
          count. Every listed person must have a reign (or tenure) on the rows, matched by name without its disambiguation in
          brackets, `aliases` mapping a list name to ours; `notRequired` {name: reason} lists rows the data may leave out. `expected` is
          the number of distinct names; --verify-sources reads the article and fails when its table no longer has exactly these names.
          A failure lists the missing names. Co-emperors, usurpers and consorts the data holds but the list leaves out are not counted.
  from/to the reigns that start in these years (astronomical, inclusive); titles: only these title prefixes;
  notCounted {person: reason}: reigns the article's count leaves out (a claimant, a co-king), listed so a change shows.
A failure is one line: FAIL <id> <timeline>/<row>: expected N, got M (<article>: "<quote>").
Exit 1 on a hard failure.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
SPEC = json.load(open(os.path.join(HERE, 'known-counts.json')))
_cache = {}
PREFIX = re.compile(r'^(Acting presidency|Presidency|Reign|Pontificate|Regency|Tenure) of ')


def timeline(name):
    if name not in _cache:
        _cache[name] = json.load(open(os.path.join(ROOT, 'public', 'timelines', f'{name}.json')))
    return _cache[name]


def reigns(spec):
    out = []
    for tl, row in spec['rows']:
        for e in timeline(tl)['events']:
            if not e['uuid'].startswith('reign-') or row not in e['tracks']:
                continue
            if not spec.get('from', -10**6) <= e['start'] <= spec.get('to', 10**6):
                continue
            if spec.get('titles') and not e['title'].startswith(tuple(spec['titles'])):
                continue
            out.append(e)
    return out


def base(name):
    return re.sub(r'\s*\([^)]*\)', '', name).strip().lower()


def table_count(spec):
    """(got, detail): how many of the table's distinct names have a reign on the rows; detail lists the missing ones."""
    t = spec['table']
    have = set()
    for tl, row in spec['rows']:
        for e in timeline(tl)['events']:
            if row in e['tracks'] and PREFIX.match(e['title']) and spec.get('from', -10**6) <= e['start'] <= spec.get('to', 10**6):
                have.add(base(PREFIX.sub('', e['title'])))
    missing = []
    for n in dict.fromkeys(t['names']):
        if n in spec.get('notRequired', {}):
            continue
        if base(spec.get('aliases', {}).get(n, n)) not in have:
            missing.append(n)
    need = len(dict.fromkeys(t['names'])) - len([n for n in dict.fromkeys(t['names']) if n in spec.get('notRequired', {})])
    return need - len(missing), 'missing: ' + ', '.join(missing) if missing else ''


def count(spec):
    """(got, detail) for one spec."""
    if spec['measure'] == 'table':
        return table_count(spec)
    if spec['measure'] == 'members':
        tl, bloc = spec['rows'][0]
        y = spec['at']
        n = 0
        for t in timeline(tl)['tracks']:
            for m in t.get('memberOf', []):
                if m['row'] == bloc and m['start'] <= y and (m.get('ongoing') or m.get('end') is None or y < m['end']):
                    n += 1
                    break
        return n, ''
    skip = spec.get('notCounted', {})
    evs = [e for e in reigns(spec) if PREFIX.sub('', e['title']) not in skip]
    if spec['measure'] == 'reigns':
        return len(evs), ''
    people = sorted({PREFIX.sub('', e['title']) for e in evs})
    return len(people), ''


def verify_source(spec):
    """None when the article still holds the quote (and the quote holds the number), else why not."""
    sys.path[:0] = [os.path.join(ROOT, 'pipelines', 'common'), HERE]
    import wp_dump
    import mwparserfromhell as mw
    src = spec['source']
    if src.get('url'):  # an official page outside the dump (vatican.va): read by hand on the date it gives
        return None
    p = wp_dump.page(src['article'])
    if not p:
        return f"article {src['article']!r} not in the dump"
    ref = re.compile(r'<ref[^>/]*/>|<ref[^>]*>.*?</ref>', re.S | re.I)
    text = re.sub(r'\s+', ' ', mw.parse(ref.sub('', p['text'])).strip_code()).lower()
    if re.sub(r'\s+', ' ', src['quote']).lower() not in text:
        return f"quote not in {p['title']!r}"
    if spec['measure'] == 'table':  # the table's rows are the count: the article must still list exactly these names
        now = [re.search(r'\[\[([^|\]]+)', m).group(1) for m in re.findall(r'^!\s*scope\s*=\s*"?row"?\s*\|?(.*)$', p['text'], re.M) if re.search(r'\[\[([^|\]]+)', m)]
        if now != spec['table']['names']:
            return f"table rows changed ({len(now)} rows, spec has {len(spec['table']['names'])}): {sorted(set(now) ^ set(spec['table']['names']))[:6]}"
    return None


def main():
    verify = '--verify-sources' in sys.argv
    hard = soft = 0
    for spec in SPEC['counts']:
        got, detail = count(spec)
        src = spec['source']
        bad = got != spec['expected']
        why = verify_source(spec) if verify else None
        where = '+'.join(f'{t}/{r}' for t, r in spec['rows'])
        if bad or why:
            line = (f"{spec['id']} {where}: expected {spec['expected']}, got {got}" + (f" [{detail}]" if detail else '') + f" ({src['article']}: \"{src['quote'][:110]}\")"
                    + (f"; SOURCE: {why}" if why else ''))
            if spec['kind'] in ('text', 'table') or why:
                print('FAIL ' + line)
                hard += 1
            else:
                print('warn ' + line)
                soft += 1
        else:
            print(f"ok   {spec['id']} {where}: {got}")
    print(f"{len(SPEC['counts'])} counts: {hard} failed, {soft} warnings")
    sys.exit(1 if hard else 0)


if __name__ == '__main__':
    main()
