"""The checks on the classified reigns that hold under any ruler definition (Workbench "2026-11-25 Timelines ruler rules as code design"
§4). Report only: each returns {"<timeline>/<uuid>": detail} (a seam reign is on two timelines under one uuid); classify.py lists
and counts them. The count agreement, the one check that fails the
stage, is in classify.py (it checks the files the run wrote).

  overlap          two differently titled reigns on one row overlap by more than the slack (reign_checks.overlaps, shared with its
                   `succession` check), among reigns that answer "who ruled" (reign_verdicts.RULED) or that no rule has decided yet
                   (R14): until the rules exist every reign is undecided, so the count is the whole data's, and it narrows as rules land
  outside-row      a reign starts before every span of its row, or ends after it, by more than a year (the rows' `span` in data-src)
  start-after-end  start later than end, at the precision both give (year, then month, then day)
  duplicate-uuid   one uuid twice in one timeline, or on two timelines with different dates or rows (a reign at a seam, Ancient/Medieval
                   650 or Medieval/Modern 1500, is on both under one uuid by design: same dates, same row)
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'common'))
import reign_checks as RC  # noqa: E402
import reign_verdicts as RV  # noqa: E402

CHECKS = ['overlap', 'outside-row', 'start-after-end', 'duplicate-uuid']
ROW_SLACK = 1  # years a reign may run past its row's span: a handover year read two ways


def spans_of(track):
    """[(start, end or None)] in astronomical years, from a data-src track's `span` (one span or a list); [] when it has none."""
    raw = track.get('span')
    out = []
    for s in raw if isinstance(raw, list) else [raw] if raw else []:
        if s.get('start') is None:
            continue
        out.append((RC.year(s['start'])[0], RC.year(s['end'])[0] if s.get('end') is not None else None))
    return out


def phase_spans_of(track):
    """[(start, end or None, name)] in astronomical years, from a data-src track's `phases`: a number, or text such as "c. 753 BCE" (Ancient's phases)."""
    return [(RC.year(ph['start'])[0], RC.year(ph['end'])[0] if ph.get('end') is not None else None, ph.get('name', ''))
            for ph in track.get('phases', []) if ph.get('start') is not None]


def overlap(records):
    rows = {}
    for rec in records:
        e = rec['event']
        if not (rec['verdict'] in RV.RULED or rec['rule'] == 'R14') or e.get('start') is None:
            continue
        s, c0 = RC.year(e['start'])
        en, c1 = RC.year(e['end']) if e.get('end') is not None else (s, False)  # no end: a point, as in reign_checks.succession
        rows.setdefault((rec['timeline'], rec['row']), []).append((s, en, c0 or c1 or bool(e.get('circa')), e))
    out = {}
    for (tl, row), rs in rows.items():
        out.update({f'{tl}/{u}': d for u, d in RC.overlaps(tl, {row: rs}).items()})
    return out


def outside_row(records, spans):
    out = {}
    for rec in records:
        e, sp = rec['event'], spans.get(rec['timeline'], {}).get(rec['row'])
        if not sp or e.get('start') is None:
            continue
        s = RC.year(e['start'])[0]
        en = RC.year(e['end'])[0] if e.get('end') is not None else s
        if not any(a - ROW_SLACK <= s and (b is None or en <= b + ROW_SLACK) for a, b in sp):
            shown = ', '.join(f'{a}–{"" if b is None else b}' for a, b in sp)
            out[f'{rec["timeline"]}/{rec["uuid"]}'] = f'{rec["row"]}: {s}–{en if e.get("end") is not None else ""} is outside the row ({shown})'
    return out


def later(a, b):
    """a after b, at the precision both share: (year, month, day) with None for a part not given ("1030" is not before 30 April 1030)."""
    for x, y in zip(a, b):
        if x is None or y is None:
            return False
        if x != y:
            return x > y
    return False


def start_after_end(records):
    at = lambda e, side: (e[side], e.get(side + 'Month'), e.get(side + 'Day'))
    return {f"{rec['timeline']}/{rec['uuid']}": f'starts {at(rec["event"], "start")} after it ends {at(rec["event"], "end")}' for rec in records
            if rec['event'].get('start') is not None and rec['event'].get('end') is not None and later(at(rec['event'], 'start'), at(rec['event'], 'end'))}


def duplicate_uuid(loaded):
    """loaded: [(file, timeline, event, review)], every reign as read, duplicates kept."""
    where = {}
    for f, tl, e, _ in loaded:
        where.setdefault(e['uuid'], []).append((tl, f, (e.get('start'), e.get('startMonth'), e.get('startDay'), e.get('end'), e.get('endMonth'), e.get('endDay'), tuple(e.get('tracks', [])))))
    out = {}
    for u, occ in where.items():
        tls = [tl for tl, _, _ in occ]
        if len(set(tls)) < len(tls) or len({d for _, _, d in occ}) > 1:
            for tl, _, _ in occ:
                out[f'{tl}/{u}'] = 'in ' + ', '.join(f'{t}:{f} {d[0]}–{d[3]} {"/".join(d[6])}' for t, f, d in occ)
    return out


def run(records, loaded, spans):
    return {'overlap': overlap(records), 'outside-row': outside_row(records, spans), 'start-after-end': start_after_end(records),
            'duplicate-uuid': duplicate_uuid(loaded)}
