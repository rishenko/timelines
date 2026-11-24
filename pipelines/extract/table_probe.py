"""
Probe for the known-counts "table" kind: reads a list page's tables and prints the names a spec would hold, and how many have a reign/tenure
in the compiled timelines (any row). A tool for writing specs, not a check.

    pipelines/extract/.venv/bin/python -I pipelines/extract/table_probe.py "List of emperors of the Tang dynasty" [--col N]
Names: the first link of the row-header cell (scope="row") when the table has them, else of the column whose header says name, ruler,
emperor, monarch, sultan, king, mansa, tlatoani or sapa inca, else of the first cell with a link.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path[:0] = [os.path.join(ROOT, 'pipelines', 'common'), HERE]
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
import wp_dump  # noqa: E402

PREFIX = re.compile(r'^(Acting presidency|Presidency|Reign|Pontificate|Regency|Tenure) of ')
NAMEHDR = re.compile(r'temple|posthumous|name|ruler|emperor|monarch|sultan|king|mansa|tlatoani|sapa|khan|shah|caliph|pharaoh|tsar|president|shogun|doge', re.I)
LINK = re.compile(r'\[\[([^|\]#]+)')
REF = re.compile(r'<ref[^>/]*/>|<ref[^>]*>.*?</ref>|<!--.*?-->', re.S)


ATTR = re.compile(r'^([^|\[{]*=[^|\[{]*)\|(?!\|)(.*)$', re.S)


def cells_of(row):
    out = []
    for line in re.split(r'\n(?=\s*[|!])', '\n' + REF.sub('', row).strip('\n')):
        line = line.strip()
        if not line or line[:2] in ('|-', '|}', '{|'):
            continue
        for c in re.split(r'\|\||!!', line[1:]):
            m = ATTR.match(c)
            out.append((m.group(2) if m else c).strip())
    return out


def header_cells(table):
    for blk in table.split('\n|-'):
        if re.search(r'^!', blk, re.M):
            return [h for line in re.findall(r'^!(.*)$', blk, re.M) for h in cells_of('!' + line)] or []
    return []


def names_of(text, col=None, minrows=3):
    """Names from the page's tables: the tables sharing the header of the table that gives the most names (Japan has one per era)."""
    per = []  # (header signature, names)
    for tm in re.finditer(r'\{\|.*?\n\|\}', text, re.S):
        table = tm.group(0)
        rowhdr = re.findall(r'^!\s*scope\s*=\s*"?row"?\s*\|?(.*)$', table, re.M)
        if rowhdr:
            per.append(('row', [m.group(1) for r in rowhdr if (m := LINK.search(REF.sub('', r)))]))
            continue
        hdr = header_cells(table)
        idx = col if col is not None else next((i for i, h in enumerate(hdr) if NAMEHDR.search(re.sub(r'\[\[[^\]]*\|?|\]\]|\{\{[^}]*\}\}', '', h)) and not re.search(r'portrait|image|tughra|coin', h, re.I)), None)
        if idx is None or idx >= len(hdr):
            continue
        names = []
        for row in table.split('\n|-')[1:]:
            if re.match(r'\s*!', row) and '\n|' not in row:
                continue
            cells = cells_of(row)
            if len(cells) == len(hdr) and (m := LINK.search(cells[idx])):
                names.append(m.group(1))
        per.append((re.sub(r'\s+', ' ', ' '.join(hdr))[:80], names))
    if per:
        best = max(per, key=lambda x: len(x[1]))[0]
        out = [n for sig, ns in per if sig == best for n in ns]
        if len(out) >= minrows:
            return out
    return [m.group(1) for line in text.splitlines() if re.match(r'^[*#]\s', line) and (m := LINK.search(REF.sub('', line)))]


def main():
    title = ARGS[0]
    col = int(ARGS[ARGS.index('--col') + 1]) if '--col' in ARGS else None
    p = wp_dump.page(title)
    if not p:
        print('not in the dump:', title)
        return
    names = names_of(p['text'], col)
    uniq = list(dict.fromkeys(names))
    have = {}
    for tl in ('ancient-classical', 'medieval', 'modern-states'):
        for e in json.load(open(os.path.join(ROOT, 'public', 'timelines', f'{tl}.json')))['events']:
            if PREFIX.match(e['title']):
                have.setdefault(re.sub(r'\s*\([^)]*\)', '', PREFIX.sub('', e['title'])).strip().lower(), []).append((tl, e['tracks'][0]))
    miss = [n for n in uniq if re.sub(r'\s*\([^)]*\)', '', n).strip().lower() not in have]
    rows = {}
    for n in uniq:
        for tl, r in have.get(re.sub(r'\s*\([^)]*\)', '', n).strip().lower(), [])[:1]:
            rows[(tl, r)] = rows.get((tl, r), 0) + 1
    print(f'{title}: {len(names)} rows, {len(uniq)} names, {len(uniq) - len(miss)} in the data; rows {rows}')
    print('  first:', uniq[:4], '| missing:', miss[:25])


if __name__ == '__main__':
    main()
