"""
Checks pipelines/earth-life/ics_2026_06.json against the ICS chart itself, so a transcription slip can't pass:
  1. every boundary's printed figure ("538.8 ±0.6", "~ 635", "4031 ± 3") appears in the text of the chart PDF
     ($TIMELINES_DATA/ics/ChronostratChart2026-06.pdf, read with pdftotext), ignoring spaces;
  2. the chart's own version and citation text are in the PDF;
  3. the boundaries run oldest to youngest, every unit starts older than it ends, and each rank's units follow each
     other without a gap or overlap (a rank may start later than the one above: the Hadean has no era).
Run: python3 -I pipelines/earth-life/verify_ics.py        (exit 1 on any problem; prints one line per problem)
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
import settings  # noqa: E402


def load():
    return json.load(open(os.path.join(HERE, 'ics_2026_06.json'), encoding='utf-8'))


def ma(printed):
    """(Ma, ± Ma or None, approximate) from a printed figure; 'present' is 0."""
    if printed == 'present':
        return 0.0, None, False
    m = re.fullmatch(r'(~ ?)?(\d+(?:\.\d+)?)(?: ?± ?(\d+(?:\.\d+)?))?', printed)
    if not m:
        raise SystemExit(f'cannot read {printed!r}')
    return float(m.group(2)), float(m.group(3)) if m.group(3) else None, bool(m.group(1))


def problems(table=None, pdf=None):
    t = table or load()
    out = []
    pdf = pdf or os.path.join(settings.DATA, 'ics', t['chart']['file'])
    try:
        text = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError) as e:
        return [f'cannot read the chart PDF {pdf}: {e}']
    squashed = re.sub(r'\s+', '', text)
    for k, printed in {**t['boundaries'], **t.get('stage_boundaries', {})}.items():
        if printed != 'present' and re.sub(r'\s+', '', printed) not in squashed:
            out.append(f'{k}: "{printed}" is not in the chart text')
    # the citation is printed across two columns, so it is checked in its two pieces
    cite = t['chart']['cite']
    for s in (t['chart']['version'], t['chart']['copyright'], cite.split('. ')[0] + '.', cite.split('chart this decade. ')[1]):
        if re.sub(r'\s+', '', s) not in squashed:
            out.append(f'the chart text does not contain {s!r}')
    ages = {k: ma(v)[0] for k, v in t['boundaries'].items()}
    for k, v in ages.items():
        if v < 0:
            out.append(f'{k}: negative age')
    by_rank = {}
    for u in t['units']:
        b, top = ages[u['base']], ages[u['top']]
        if not b > top:
            out.append(f"{u['id']}: base {b} is not older than top {top}")
        by_rank.setdefault(u['rank'], []).append(u)
    for rank, us in by_rank.items():
        us.sort(key=lambda u: -ages[u['base']])
        for a, b in zip(us, us[1:]):
            if a['top'] != b['base']:
                out.append(f"{rank}: {a['id']} ends at {a['top']} but {b['id']} starts at {b['base']}")
        if us[-1]['top'] != 'present' and rank in ('eon', 'era'):
            out.append(f'{rank}: the youngest {us[-1]["id"]} does not end at the present')
    return out


if __name__ == '__main__':
    p = problems()
    for x in p:
        print(x)
    print(f'{len(p)} problem(s)' if p else 'the table matches the chart')
    sys.exit(1 if p else 0)
