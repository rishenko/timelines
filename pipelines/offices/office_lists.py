"""
The holders of the head-of-government and governor offices of the pilot rows (v4 rules 5 and 6), read from each row's Wikipedia list page: a tenure
per table row that holds a date pair (or the row's {{Ayd}} template), the person joined to a Wikidata QID through the page's link (wd_item.enwiki, one
redirect followed). A name whose link does not resolve keeps qid null and a flag, never a guess. Importable without the dump: the dump and the Wikidata
tables open on first use.
"""
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'common'), os.path.join(HERE, '..', 'v2')]
import data_root  # noqa: E402
import list_rows as LR  # noqa: E402
import wp_dump  # noqa: E402

_dbs = {}


def _db(name):
    if name not in _dbs:
        _dbs[name] = sqlite3.connect(f'file:{data_root.where("wikidata", f"wikidata-20261116{name}.sqlite")}?mode=ro', uri=True)
    return _dbs[name]


W = type('Lazy', (), {'execute': lambda self, *a: _db('').execute(*a)})()
PE = type('Lazy', (), {'execute': lambda self, *a: _db('-people').execute(*a)})()
MON = 'January|February|March|April|May|June|July|August|September|October|November|December'
MN = {m: i + 1 for i, m in enumerate(MON.split('|'))}
DATE = re.compile(rf'^(?:(\d{{1,2}}) ({MON}) (\d{{3,4}})|({MON}) (\d{{1,2}}),? (\d{{3,4}})|({MON}) (\d{{3,4}})|(\d{{3,4}}))$')
NOTE = re.compile(r'\s*[(\[][^)\]]*[)\]]|\s*[†*]')


SMALL_DATE = re.compile(rf'\{{\{{\s*(?:small|smaller|nowrap|nobr)\s*\|\s*((?:\d{{1,2}} (?:{MON})|(?:{MON}) \d{{1,2}}),?)\s*\}}\}}', re.I)


def clean(c):
    c = SMALL_DATE.sub(r'\1', c)  # {{small|25 October}}<br />1889: list_rows.plain drops every template, which would leave the year alone
    t = LR.plain(c)
    t = re.sub(r'\b\d+x\d+px\b|\b\d+px\b|alt=[^|]*\|?|frameless\|?(upright=[\d.]+)?|photograph|upright=[\d.]+', '', t)
    t = re.sub(r'\b(?:style|rowspan|bgcolor)=\S+', '', t)
    return re.sub(r'\s+', ' ', t).strip(' |')


def date_cell(c):
    """(iso, note) when the cell is a date (a day, a month or a year, with a trailing note such as (Executed) or a dagger), else None."""
    note = ' '.join(re.findall(r'\(([^)]*)\)', c) + (['†'] if '†' in c else []))
    t = NOTE.sub('', c).strip()
    m = DATE.match(t)
    if not m:
        return None
    g = m.groups()
    if g[0]: return (f'{int(g[2]):04d}-{MN[g[1]]:02d}-{int(g[0]):02d}', note)
    if g[3]: return (f'{int(g[5]):04d}-{MN[g[3]]:02d}-{int(g[4]):02d}', note)
    if g[6]: return (f'{int(g[7]):04d}-{MN[g[6]]:02d}', note)
    return (f'{int(g[8]):04d}', note)


OPEN = re.compile(r'^(incumbent|present|current)', re.I)
NOTNAME = re.compile(r'\bno regency|vacant|independent|party|liberal|conservative|none$|=|\bparliament\b|\blegislature\b|\bcongress\b|\bassembly\b|\belection\b|\bcommittee\b|^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?(?: \d{1,2},?)?(?: \d{4})?(?: \d{4})?$', re.I)
NOTPERSON_LINK = re.compile(r'parliament|election|government|party|cabinet|legislat|congress|assembly|republic of|kingdom of', re.I)  # a cell whose link is one of these is the election or government cell, not the holder
FILE = re.compile(r'(File|Image|Category):', re.I)


def person_link(raw):
    links = [m for m in LR.LINK.finditer(LR.REF.sub('', raw)) if not FILE.match(m.group(1))]
    for m in links:  # the bold link is the person ('''[[X]]''' or [[X|'''Y''']]) where a cell holds several
        s, e = m.start(), m.end()
        if "'''" in raw[max(0, s - 3):s] or "'''" in (m.group(2) or '') or "'''" in raw[e:e + 3]:
            return m.group(1).strip()
    if not links: return None
    text = {t for t in re.findall(r'\w+', clean(raw).lower())}
    def score(m):
        words = set(re.findall(r'\w+', m.group(1).lower()))
        return (len(text & words) / (len(words) or 1), -m.start(), len(text & words))  # the title that is most of its words in the cell (a person, not 'Death and state funeral of X'), then the earlier link (the name comes before the role: 'Hugh Watt Acting prime minister')
    best = max(links, key=score)
    return best.group(1).strip()


ILL = re.compile(r'\{\{\s*Interlanguage link(?: multi)?\s*\|([^|{}]*)((?:\|[^{}]*)?)\}\}', re.I)
AYD = re.compile(r'\{\{\s*Ayd\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\}\}', re.I)


def ill_name(raw):
    """(display name, title as linked in the other language) of an {{Interlanguage link}} person cell, or None: the English article does not exist."""
    m = ILL.search(raw)
    if not m: return None
    parts = m.group(2).split('|')[1:] if m.group(2) else []
    lt = next((p[3:] for p in parts if p.startswith('lt=')), None)
    rest = [p for p in parts if '=' not in p]
    return (re.sub(r"'''", '', lt).strip() if lt else m.group(1).strip(), ' | '.join(rest))


def qid_of(title):
    if not title: return None
    t = title.replace('_', ' ')
    for tt in (t, (wp_dump.page(t) or {}).get('title')):  # the title as linked, then the redirect's target
        if not tt: continue
        x = W.execute('select qid from wd_item where enwiki=?', (tt,)).fetchone() or PE.execute('select qid from person where enwiki=?', (tt,)).fetchone()
        if x: return x[0]
    return None


def read(page, tables, keep_nameless=False, skipped=None):
    """One tenure per table row that holds a date pair: name = the last name-like cell before the pair (a Wikipedia row holds the person's
    own cells; a re-appointed person's next row has no name cell: `keep_nameless` carries the last person to it, flagged)."""
    pg = wp_dump.page(page)
    assert pg and not wp_dump.ai_flagged(pg['text'])
    tbs = [m.group(0) for m in re.finditer(r'\{\|.*?\n\|\}', pg['text'], re.S)]
    out, cur = [], None
    for ti in tables:
        for ri, r in enumerate(tbs[ti].split('\n|-')[1:]):
            raw = [c[0] for c in LR._cells(r)]
            cells = [clean(c) for c in raw]
            nm, num, i, cab = None, None, 0, []
            ill = {k: ill_name(c) for k, c in enumerate(raw) if ill_name(c)}
            ayd = AYD.search(r)
            made = len(out)
            for c in cells:
                if re.match(r'^\d+\. \S', c): cab.append(int(c.split('.')[0]))
            while i < len(cells):
                c = cells[i]
                d0 = date_cell(c)
                if d0:
                    nxt = cells[i + 1] if i + 1 < len(cells) else ''
                    d1 = date_cell(nxt) if nxt else None
                    if (d1 or OPEN.match(nxt)) and (nm is not None or (keep_nameless and cur)):
                        flags = []
                        if nm is None:
                            who = cur; flags.append('name from the previous row (re-appointment: the page shows no name cell)')
                        else:
                            who = dict(cell=ill[nm][0] if nm in ill else cells[nm], link=None if nm in ill else person_link(raw[nm]), ill=ill.get(nm))
                            if nm in ill: flags.append(f'no English article: {{{{Interlanguage link}}}} to {ill[nm][1]!r}')
                            cur = who
                        out.append(dict(table=ti, rowidx=ri, number=num, cabinets=cab, name=who['cell'], link=who['link'],
                                        start=d0[0], end=(d1[0] if d1 else None), end_open=bool(OPEN.match(nxt)),
                                        start_text=c, end_text=nxt, note=' '.join(x for x in [d0[1], d1[1] if d1 else ''] if x),
                                        flags=flags))
                        nm = None; i += 2; continue
                    i += 1; continue
                if i in ill: nm = i
                elif re.fullmatch(r'\(?\d{1,3}\)?', c): num = c
                elif c and c != '•' and len(c) < 90 and not re.fullmatch(r'[\d().,†* —–-]*', c) and not NOTNAME.search(c) and not NOTPERSON_LINK.search(person_link(raw[i]) or ''): nm = i
                i += 1
            if len(out) == made and (ayd or any(date_cell(c) for c in cells)) and (nm is not None or ill or any(person_link(c) and "'''" in c for c in raw)):
                if ayd and (nm is not None or ill):
                    g = [int(x) for x in ayd.groups()]
                    who = dict(cell=ill[nm][0] if nm in ill else cells[nm], link=None if nm in ill else person_link(raw[nm]), ill=ill.get(nm)) if nm is not None else cur
                    fl = ['dates from the {{Ayd}} template: a date cell of the row is empty or carries a note', ]
                    if nm in ill: fl.append(f'no English article: {{{{Interlanguage link}}}} to {ill[nm][1]!r}')
                    cur = who
                    out.append(dict(table=ti, rowidx=ri, number=num, cabinets=cab, name=who['cell'], link=who['link'], start=f'{g[0]:04d}-{g[1]:02d}-{g[2]:02d}',
                                    end=f'{g[3]:04d}-{g[4]:02d}-{g[5]:02d}', end_open=False, start_text=f'Ayd {g[0]:04d}-{g[1]:02d}-{g[2]:02d}', end_text=f'Ayd {g[3]:04d}-{g[4]:02d}-{g[5]:02d}', note='row cells: ' + ' / '.join(c for c in cells if c)[:120], flags=fl))
                elif skipped is not None:
                    skipped.append(dict(table=ti, row=ri, text=' | '.join(c for c in cells if c)[:160]))
    return pg, out
