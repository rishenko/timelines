"""
Writes the "table" known-counts specs for the rulers' lists of the world's regions (Dev C, 2026-11-24) and reports pass/fail per list. A list
whose page has no machine-readable table (Mali, Ethiopia) is reported, not specced. Names come from the page's table (table_probe.names_of);
a list name that is a redirect gets the target as an alias when the data holds the target. Failures stay: they are data holes.

    pipelines/extract/.venv/bin/python -I pipelines/extract/table_specs.py [--write] [--only ID,ID]
"""
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path[:0] = [os.path.join(ROOT, 'pipelines', 'common'), os.path.join(ROOT, 'pipelines', 'v2'), HERE]
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
import mwparserfromhell as mw  # noqa: E402
import table_probe as TP  # noqa: E402
import wp_dump  # noqa: E402
import known_counts as K  # noqa: E402

# id, article, region, era, column of the name (None: by header), measure note
LISTS = [
    ('ottoman-sultans-table', 'List of sultans of the Ottoman Empire', 'West Asia', '500–1500 and 1500–1800 and 1800 on', None),
    ('tang-emperors', 'List of emperors of the Tang dynasty', 'East Asia', '500–1500', 1),
    ('song-emperors', 'List of emperors of the Song dynasty', 'East Asia', '500–1500', None),
    ('japanese-emperors', 'List of emperors of Japan', 'East Asia', '500 BCE–500 CE and 500–1500 and 1500–1800 and 1800 on', 3),
    ('tlatoque-tenochtitlan', 'List of tlatoque of Tenochtitlan', 'The Americas', '500–1500 and 1500–1800', None),
    ('holy-roman-emperors', 'List of Holy Roman Emperors', 'Europe', '500–1500 and 1500–1800 and 1800 on', None),
    ('wallachia-rulers', 'List of rulers of Wallachia', 'Europe', '500–1500 and 1500–1800 and 1800 on', 'all'),  # one table per dynasty
    ('mughal-emperors-table', 'List of emperors of the Mughal Empire', 'South Asia', '1500–1800 and 1800 on', 'mughal'),  # shifting columns: the bold name link of each numbered row
    ('sapa-incas', 'Sapa Inca', 'The Americas', '500–1500 and 1500–1800', 'sapa'),  # a rowspan title column: list_rows.expand
]


def names_mughal(text):
    """The emperors of the Mughal list: the first bold link of each numbered row. Image cells and family rows shift the columns, so rows are
    not read by column; the interregnum row ("Suri Interregnum") has no number, and a restored reign repeats the name under "(2)"."""
    import list_rows as LR
    out = []
    tb = re.findall(r'\{\|.*?\n\|\}', text, re.S)[0]
    for row in tb.split('\n|-')[1:]:
        cells = LR._cells(row)
        if not cells or not re.fullmatch(r'\d+', LR.plain(cells[0][0])):
            continue  # the interregnum row and the repeated reigns ("(2)", "(17)")
        m = re.search(r"'''\s*\[\[([^\]|]+)", row)
        if m:
            out.append(m.group(1))
    return out


def names_sapa(text):
    """The Sapa Incas: the "Sapa Inca" column of the three tables, whose "Title" column is a rowspan (read with list_rows.expand)."""
    import list_rows as LR
    out = []
    for tb in re.findall(r'\{\|.*?\n\|\}', text, re.S):
        hdr = LR.header_names(tb)
        if 'sapa inca' not in hdr:
            continue
        ci, carry = hdr.index('sapa inca'), {}
        for row in tb.split('\n|-')[1:]:
            if row.lstrip().startswith('!') and '\n|' not in row:
                continue
            cells = LR.expand(LR._cells(row), carry)
            if len(cells) == len(hdr) and (m := LR.LINK.search(LR.REF.sub('', cells[ci]))):
                out.append(m.group(1))
    return out
UNREADABLE = [('List of emperors of Ethiopia', 'sections of prose and templates, no table or list a reader can take names from'),
              ('Mali Empire (the mansas)', 'no list page in the dump, no table in the article')]
db = sqlite3.connect(f'file:{os.path.join(settings.WIKIPEDIA, "extract-" + settings.DUMP_NAME + ".sqlite")}?mode=ro', uri=True)


def redirect(t):
    r = db.execute('SELECT redirect_to FROM page WHERE title=? AND ns=0', (t,)).fetchone()
    return r[0] if r and r[0] else None


def quote_of(text):
    ref = re.compile(r'<ref[^>/]*/>|<ref[^>]*>.*?</ref>', re.S | re.I)
    s = re.sub(r'\s+', ' ', mw.parse(ref.sub('', text)).strip_code())
    for sent in re.split(r'(?<=[.!?])\s', s):
        if len(sent) > 50 and sent.count('{') == 0 and 'File:' not in sent and 'thumb|' not in sent and '|' not in sent[:40]:
            return sent[:140].rstrip()
    return s[:100]


def main():
    d = json.load(open(os.path.join(HERE, 'known-counts.json')))
    out = []
    only = ARGS[ARGS.index('--only') + 1].split(',') if '--only' in ARGS else None  # write just these ids: the other specs carry hand-edited notes
    for sid, art, region, era, col in LISTS:
        if only and sid not in only:
            continue
        p = wp_dump.page(art)
        names = names_mughal(p['text']) if col == 'mughal' else names_sapa(p['text']) if col == 'sapa' else TP.names_of(p['text'], None if col == 'all' else col, all_tables=(col == 'all'))
        names = [n for n in names if not re.match(r'(List of|Category|File|Template)', n)]
        uniq = list(dict.fromkeys(names))
        have = {}
        for tl in ('ancient-classical', 'medieval', 'modern-states'):
            for e in json.load(open(os.path.join(ROOT, 'public', 'timelines', f'{tl}.json')))['events']:
                if K.PREFIX.match(e['title']):
                    have.setdefault(K.base(K.PREFIX.sub('', e['title'])), []).append((tl, e['tracks'][0]))
        aliases = {}
        redirects = {n: redirect(n) for n in uniq if redirect(n)}  # frozen for every name, whether or not the data has the target yet
        for n in uniq:
            if K.base(n) in have:
                continue
            r = redirect(n)
            if r and K.base(r) in have:
                aliases[n] = r
        rows = {}
        for n in uniq:
            for tl, r in have.get(K.base(aliases.get(n, n)), [])[:1]:
                rows[(tl, r)] = rows.get((tl, r), 0) + 1
        spec = {'id': sid, 'rows': [list(k) for k in sorted(rows)], 'measure': 'table', 'expected': len(uniq), 'kind': 'table', 'region': region, 'era': era,
                'source': {'article': art, 'quote': quote_of(p['text']), 'dump': settings.DUMP_NAME}, 'table': {'article': art, 'names': names, **({'col': col} if isinstance(col, int) else {}), **({'all_tables': True} if col == 'all' else {})}, 'aliases': aliases, 'redirects': redirects, 'notRequired': {}}
        got, detail = K.table_count(spec) if rows else (0, 'no name found in the data')
        if got != spec['expected']:
            spec['kind'] = 'list'  # a warning: the list is read, but whether its legendary, interregnum or colonial rows belong is Kevin's call
            spec['note'] = 'fails today: ' + detail[:400]
        print(f"{'ok  ' if got == spec['expected'] else 'FAIL'} {sid}: {got}/{len(uniq)} {('[' + detail[:300] + ']') if detail else ''}  rows {sorted(rows)}")
        out.append(spec)
    for art, why in UNREADABLE:
        print(f'skip {art}: {why}')
    if '--write' in ARGS:
        ids = {s['id'] for s in out}
        d['counts'] = [c for c in d['counts'] if c['id'] not in ids] + out
        json.dump(d, open(os.path.join(HERE, 'known-counts.json'), 'w'), indent=1, ensure_ascii=False)
        open(os.path.join(HERE, 'known-counts.json'), 'a').write('\n')
        print(f'wrote {len(out)} specs')


if __name__ == '__main__':
    main()
