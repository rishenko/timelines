"""
Standing check for the freeze (Kevin: "silently dropped 37 popes"): re-freezes the inputs the committed pipelines/<generator>/reigns.json
was frozen from and fails on ANY difference: a committed reign lost or changed, a reign added that the file does not have, a review line
that differs, or inputs that are not the ones the file recorded. Every new guard in reigns_freeze.py runs through it before a push.

    pipelines/extract/.venv/bin/python -I pipelines/extract/freeze_regression.py INPUTS_DIR [--record]

INPUTS_DIR holds <timeline>/rulers.csv and rulers-events.json for the three timelines (the frozen bulk run; CI uses main-inputs/ on the data-only
branch regression-inputs) and term-labels.json, the infobox office labels the freeze reads from the dump (--record saves them, which needs the dump).
There is no allow-list: a change that moves a committed reign is a re-freeze, made in its own data pull request (Kevin's merge) that also
replaces the inputs. Should an exception ever be needed, give each entry its owner, a card, an expiry and the exact `expect`ed difference, and
make the check fail when the entry goes stale. Run it with the generated data-src free of later additions (a freeze treats an event already
on the timeline as a duplicate; --without-extras drops the extra reigns).
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = {'ancient-classical': 'ancient', 'medieval': 'medieval', 'modern-states': 'modern-states'}


def main(argv):
    base = argv[0]
    bad = 0
    for tl, g in OUT.items():
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            out = f.name
        r = subprocess.run([sys.executable, '-I', '-X', 'utf8', os.path.join(HERE, 'reigns_freeze.py'), '--timeline', tl, '--dir', os.path.join(base, tl), '--out', out,
                            '--without-extras', '--term-labels', os.path.join(base, 'term-labels.json')] + (['--record-labels'] if '--record' in argv else []),
                           capture_output=True, text=True, encoding='utf-8')
        if r.returncode:
            print(f'FAIL {tl}: the freeze stopped: {r.stderr.strip()[-200:]}')
            bad += 1
            continue
        a = json.load(open(os.path.join(ROOT, 'pipelines', g, 'reigns.json'), encoding='utf-8'))
        b = json.load(open(out, encoding='utf-8'))
        os.unlink(out)
        now = {e['uuid']: e for e in b['events']}
        was = {e['uuid'] for e in a['events']}
        lost = [e['uuid'] for e in a['events'] if e['uuid'] not in now]
        changed = [e['uuid'] for e in a['events'] if e['uuid'] in now and now[e['uuid']] != e]
        added = [u for u in now if u not in was]
        review = [u for u in set(a['review']) | set(b['review']) if a['review'].get(u) != b['review'].get(u)]
        inputs = [k for k in set(a['inputs']) | set(b['inputs']) if a['inputs'].get(k) != b['inputs'].get(k)]
        fail = lost + changed + added + review + inputs
        print(f"{'FAIL' if fail else 'ok  '} {tl}: {len(a['events'])} committed reigns, lost {len(lost)}, changed {len(changed)}, added {len(added)}, "
              f"review lines differ {len(review)}, inputs differ {inputs or 0}" + (f"; e.g. {fail[:4]}" if fail else ''))
        bad += bool(fail)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
