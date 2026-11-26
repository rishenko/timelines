"""Date rulings on committed reigns: a `date` ruling on a reign uuid (pipelines/common/rulings.json) replaces the extractor's start and/or end.
Split out of reigns_freeze.py (size, rule 40); the freeze calls apply_date_ruling once per reign."""
import os
import re
import sys

sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
import rulers as RU  # noqa: E402

DATE_RULINGS = {r['subject']: r for r in RU.rulings.load() if r['kind'] == 'date' and r['subject'].startswith('reign-')}


def apply_date_ruling(ev, sources, era_fixed):
    """A `date` ruling on this reign's uuid (pipelines/common/rulings.json; Architect's call, 2026-11-25): the ruling's start and/or end replace the
    extractor's, the description is rewritten, and the ruling's cited page and location come first in the event's sources (the extractor's own
    cite stays after them: it still supports the bound the ruling leaves alone)."""
    r = DATE_RULINGS.get(ev['uuid'])
    if not r:
        return ev
    era_fixed.add(ev['uuid'])  # the same reign with its dates corrected keeps its id (guards() would take a committed uuid with new dates for another reign)
    ev, cites = dict(ev), []
    for c in r['kept']:
        for side in ('start', 'end'):
            if side in c:
                ev = {k: v for k, v in ev.items() if not k.startswith(side) or k == 'startDates'}
                ev.update(RU.date_fields(side, (c[side]['year'], c[side].get('month'), c[side].get('day'))))
        key = 'wp-' + RU.slug(c['page'])
        sources[key] = {'name': f"{c['page']} (Wikipedia)", 'url': RU.WP + c['page'].replace(' ', '_'), 'accessed': RU.ACC, 'tags': ['wikipedia']}
        cites.append({'sourceKey': key, 'sourceLocation': c['location']})
    first = (RU.hist(ev['start']), ev.get('startMonth'), ev.get('startDay'))
    last = (RU.hist(ev['end']), ev.get('endMonth'), ev.get('endDay')) if ev.get('end') is not None else None
    yrs = last[0] - first[0] if last else 0
    ev['descr'] = re.sub(r' from .*$', f" from {RU.fmt(first)}" + (f' to {RU.fmt(last)}' if last else '') + (f' ({yrs} years)' if yrs >= 2 else '') + '.', ev['descr'])
    ev['sources'] = cites + ev['sources']
    ev['memberships'] = [dict(m, sources=cites + m['sources']) if m.get('sources') else m for m in ev.get('memberships', [])]
    return ev
