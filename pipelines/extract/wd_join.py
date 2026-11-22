"""
Joins Wikidata's dates to extractor candidates by QID (page_props.py gives each article its QID; wikidata.py gives each
QID its dates and links). Wikidata is a cross-check and a discovery route; the cited source stays the Wikipedia quote.

  WD(path)                    None-safe wrapper: WD.open() returns None when the Wikidata tables aren't built
  wd.dates(qid)               {'start': [(y, m, d, prop, calendar)], 'end': [...]}: P580/P585/P571 starts, P582/P576 ends
  wd.part_of_closure(qids)    QIDs transitively `part of` (P361) the given ones, with their English titles
  compare(span, dates)        'agree', 'differs: …' or 'no date', at the coarser of the two precisions
"""
import os
import sqlite3

START, END = ('P580', 'P585', 'P571'), ('P582', 'P576')
JULIAN = 'Q1985786'


def wd_time(t, precision):
    """'+1914-07-28T00:00:00Z' at precision 11 -> (1914, 7, 28); 9 -> (1914, None, None). Negative years are BCE as
    Wikidata writes them ("-0044" is 44 BC, no year zero), the timelines' convention too."""
    sign = -1 if t.startswith('-') else 1
    y, m, d = t.lstrip('+-').split('T')[0].split('-')
    y = sign * int(y)
    return (y, int(m) if precision >= 10 and int(m) else None, int(d) if precision >= 11 and int(d) else None)


class WD:
    def __init__(self, path):
        self.db = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
        meta = dict(self.db.execute('SELECT key, value FROM meta'))
        self.complete = meta.get('done') == '1'
        self.dump = meta.get('dump')

    @staticmethod
    def open(data_dir, dump='wikidata-20261116'):
        path = os.path.join(data_dir, 'wikidata', f'{dump}.sqlite')
        return WD(path) if os.path.exists(path) else None

    def dates(self, qid):
        out = {'start': [], 'end': []}
        if not qid:
            return out
        for prop, t, prec, cal, rank in self.db.execute(
                "SELECT prop, time, precision, calendar, rank FROM wd_claim WHERE qid=? AND rank != 'deprecated'", (qid,)):
            if prec is None or prec < 9:
                continue  # decades and coarser say nothing a year can be checked against
            v = wd_time(t, prec) + (prop, cal)
            out['start' if prop in START else 'end'].append(v)
        return out

    def part_of_closure(self, qids, depth=3):
        """{qid: English title} of items transitively part of the given ones (P361), to `depth` steps."""
        seen, frontier, out = set(qids), list(qids), {}
        for _ in range(depth):
            nxt = []
            for q in frontier:
                for (child,) in self.db.execute("SELECT qid FROM wd_link WHERE prop='P361' AND target=?", (q,)):
                    if child not in seen:
                        seen.add(child)
                        nxt.append(child)
            frontier = nxt
        for q in seen - set(qids):
            r = self.db.execute('SELECT enwiki FROM wd_item WHERE qid=?', (q,)).fetchone()
            if r:
                out[q] = r[0]
        return out


def _same(a, b):
    """Two (y, m, d) agree at the coarser precision of the two."""
    if a[0] != b[0]:
        return False
    if a[1] is None or b[1] is None:
        return True
    if a[1] != b[1]:
        return False
    return a[2] is None or b[2] is None or a[2] == b[2]


def _key(v, hi=False):
    """(y, m, d) as a sortable key; missing parts are the start (or, with hi, the end) of the year or month."""
    return v[0], v[1] or (12 if hi else 1), v[2] or (31 if hi else 1)


def compare(span, dates):
    """'agree' when Wikidata's start (P580/P571) matches, or its point in time (P585) falls within the span, and its end
    (P582/P576), where both have one, matches; 'differs: …' with Wikidata's values; 'no date' when it has none.
    Julian-calendar values are marked, since Wikipedia may give the other calendar."""
    if not dates['start'] and not dates['end']:
        return 'no date'
    fmt = lambda v: '-'.join(str(x) for x in v[:3] if x is not None) + f' ({v[3]}{", Julian" if v[4] == JULIAN else ""})'
    starts = [v for v in dates['start'] if v[3] != 'P585']
    points = [v for v in dates['start'] if v[3] == 'P585']
    end = span['end'] or span['start']
    in_span = [v for v in points if _key(span['start']) <= _key(v, True) and _key(v) <= _key(end, True)]
    s_ok = any(_same(span['start'], v[:3]) for v in starts) if starts else None
    e_ok = any(_same(span['end'], v[:3]) for v in dates['end']) if span['end'] and dates['end'] else None
    if s_ok is False and not in_span:
        return 'differs: start ' + '; '.join(fmt(v) for v in starts[:3])
    if s_ok is None and points and not in_span:
        return 'differs: point in time ' + '; '.join(fmt(v) for v in points[:3])
    if e_ok is False:
        return 'differs: end ' + '; '.join(fmt(v) for v in dates['end'][:3])
    if s_ok or e_ok or in_span:
        return 'agree'
    return 'no date'
