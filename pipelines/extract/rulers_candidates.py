"""
The reigns a rulers run adds, as a candidates file for the sample-and-judge harness (pipelines/common/sample_judge.py): one row per
reign in the "after" run that the "before" run did not have, with the start of the person's article lead so a reader can judge it
without opening anything. The runs are `rulers.py --out <dir>` outputs (each holds a rulers.csv); the before run is the same
command with NO_PERSONS_STORE=1.

    pipelines/extract/.venv/bin/python -I pipelines/extract/rulers_candidates.py \\
        --before /tmp/ps_before_{tl} --after /tmp/ps_after5_{tl} --out /tmp/added.csv

`{tl}` stands for each of modern-states, medieval and ancient-classical. Columns: timeline, row, person, start, end, office, lead,
flags and uuid (for the author: draw with `--hide flags,uuid`). Needs the Wikipedia dump for the leads.

`--exclude-uuids FILE` (one reign uuid per line) leaves out reigns an earlier sample already read: a filter tuned on those rows is
not graded on them. `--held-out FILE` also writes the rows the run held for review (persons-held.csv of each after run), with
their leads, for a sample of what the filter costs.
"""
import argparse
import csv
import os
import re
import sys

sys.path[:0] = [os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'common')]
import traditions  # noqa: E402
import wp_dump as wp  # noqa: E402

TIMELINES = ['modern-states', 'medieval', 'ancient-classical']
KEY = lambda r: (r['row'], r['person'], r['start'], r['end'])  # noqa: E731


def reigns(path):
    with open(os.path.join(path, 'rulers.csv'), newline='', encoding='utf-8') as f:
        return [r for r in csv.DictReader(f) if r['uuid']]


def lead(title, n=300):
    p = wp.page(title)
    if not p:
        return ''
    t = re.sub(r'\s+', ' ', traditions.render(p['text']))
    return re.sub(r'thumb\|[^|]*\|', '', t)[:n]


def main(argv):
    a = argparse.ArgumentParser()
    a.add_argument('--before', required=True, help='before-run directory, with {tl} for the timeline')
    a.add_argument('--after', required=True, help='after-run directory, with {tl}')
    a.add_argument('--out', required=True)
    a.add_argument('--exclude-uuids', default='')
    a.add_argument('--held-out', default='')
    a = a.parse_args(argv)
    skip = set()
    if a.exclude_uuids:
        with open(a.exclude_uuids, encoding='utf-8') as f:
            skip = {x.strip() for x in f if x.strip()}
    out, held, lost, skipped = [], [], 0, 0
    for t in TIMELINES:
        before, after = reigns(a.before.format(tl=t)), reigns(a.after.format(tl=t))
        seen = {KEY(r) for r in before}
        lost += len(seen - {KEY(r) for r in after})
        for r in after:
            if KEY(r) not in seen:
                if r['uuid'] in skip:
                    skipped += 1
                    continue
                out.append(dict(timeline=t, row=r['row'], person=r['person'], start=r['start'], end=r['end'], office=r['office'],
                                lead=lead(r['cited'] or r['person']), flags=r['flags'], uuid=r['uuid']))
        hp = os.path.join(a.after.format(tl=t), 'persons-held.csv')
        if a.held_out and os.path.exists(hp):
            with open(hp, newline='', encoding='utf-8') as f:
                for r in csv.DictReader(f):
                    if any(h['timeline'] == t and h['row'] == r['row'] and h['person'] == r['person'] for h in held):
                        continue  # one person held twice on a row (two spans): read once
                    held.append(dict(timeline=t, row=r['row'], person=r['person'], qid=r['qid'], lead=lead(r['person']), flags=r['flags']))
    with open(a.out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, ['timeline', 'row', 'person', 'start', 'end', 'office', 'lead', 'flags', 'uuid'])
        w.writeheader()
        w.writerows(out)
    if a.held_out:
        with open(a.held_out, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, ['timeline', 'row', 'person', 'qid', 'lead', 'flags'])
            w.writeheader()
            w.writerows(held)
    print(f'{len(out)} added reigns ({skipped} left out as already read), {lost} lost -> {a.out}'
          + (f'; {len(held)} held -> {a.held_out}' if a.held_out else ''))
    return 1 if lost else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
