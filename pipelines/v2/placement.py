"""
Where a conflict goes (Kevin, 2026-11-23, the conflicts rule): at most three countries -> each country's row; more than three but
one region -> the region group row; wider, or an explicitly wide war -> the top-level Wars row.

A country is a combatant column's first entry. It lands on a row by (1) the pilot's own country definitions (pilot-conflicts.json:
the articles that stand for France over time are all the `france` row, wherever the timeline has it), then (2) the place table
(hand-kept places.json first, then the generated places.generated.json from the rows' article links).
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def load():
    pilot = json.load(open(os.path.join(HERE, 'pilot-conflicts.json')))
    hand = json.load(open(os.path.join(HERE, 'places.json')))['places']
    gen = json.load(open(os.path.join(HERE, 'places.generated.json')))['places']
    rows_in, parent_of = {}, {}
    for v in gen.values():
        for tl, rs in v['rows'].items():
            for r in rs:
                rows_in.setdefault(tl, set()).add(r['row'])
                parent_of[(tl, r['row'])] = r['parent']
    own = {t: c['id'] for c in pilot['countries'] for t in c['titles']}
    return {'own': own, 'hand': hand, 'gen': gen, 'rows_in': rows_in, 'parent_of': parent_of}


def country_row(table, tl, title, qid):
    """The row of one country in a timeline, or None."""
    rid = table['own'].get(title)
    if rid and rid in table['rows_in'].get(tl, ()):
        return rid
    for src in (table['hand'], table['gen']):
        rs = src.get(qid, {}).get('rows', {}).get(tl) if qid else None
        if rs:
            r = rs[0]
            return r if isinstance(r, str) else r['row']
    return None


def rows_for(c, tl, table, wide_row, qid_of):
    """(rows, how): the rows of a conflict candidate in timeline `tl`. `qid_of(title)` gives a title's Wikidata item."""
    if c.get('wide'):
        return [wide_row], 'wide war: Wars row'
    countries = list(dict.fromkeys(c['countries']))
    found = [(t, country_row(table, tl, t, qid_of(t))) for t in countries]
    rows = [r for _, r in found if r]
    rows = list(dict.fromkeys(rows))
    if len(countries) <= 3:
        return rows, f'{len(countries)} countries: each row' if rows else 'no row for any combatant'
    parents = {table['parent_of'].get((tl, r)) for r in rows}
    if len(parents) == 1 and None not in parents:
        return [parents.pop()], f'{len(countries)} countries in one region: the region row'
    return [wide_row], f'{len(countries)} countries across regions: Wars row'
