"""
Standing check for the freeze (Kevin: "silently dropped 37 popes"): re-freezes the inputs the committed pipelines/<generator>/reigns.json
was frozen from and fails if ANY committed reign is lost or changed. Every new guard in reigns_freeze.py runs through it before a push.

    pipelines/extract/.venv/bin/python -I pipelines/extract/freeze_regression.py BULK_DIR [--allow uuid,uuid] [--record]

BULK_DIR holds <timeline>/rulers.csv and rulers-events.json for the three timelines (the frozen bulk run, kept outside the repository, e.g.
pipelines/out/rows/bulk6). The committed events and their review lines must come back identical; a loss named in --allow (on purpose, with a
reason in the PR) is reported but does not fail. Run it with the generated data-src free of later additions (a freeze treats an event already
on the timeline as a duplicate), as in the re-freeze flow.
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
    base = argv[0]  # the inputs; with --record the infobox term labels are read from the Wikipedia dump and saved to BULK_DIR/term-labels.json
    allow = set((argv[argv.index('--allow') + 1] if '--allow' in argv else '').split(',')) - {''}
    bad = 0
    for tl, g in OUT.items():
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            out = f.name
        r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'reigns_freeze.py'), '--timeline', tl, '--dir', os.path.join(base, tl), '--out', out, '--without-extras', '--term-labels', os.path.join(base, 'term-labels.json')] + (['--record-labels'] if '--record' in argv else []),
                           capture_output=True, text=True)
        if r.returncode:
            print(f'FAIL {tl}: the freeze stopped: {r.stderr.strip()[-200:]}')
            bad += 1
            continue
        a = json.load(open(os.path.join(ROOT, 'pipelines', g, 'reigns.json')))
        b = json.load(open(out))
        os.unlink(out)
        now = {e['uuid']: e for e in b['events']}
        lost = [e['uuid'] for e in a['events'] if e['uuid'] not in now]
        changed = [e['uuid'] for e in a['events'] if e['uuid'] in now and now[e['uuid']] != e]
        fail = [u for u in lost + changed if u not in allow]
        print(f"{'FAIL' if fail else 'ok  '} {tl}: {len(a['events'])} committed reigns, lost {len(lost)}, changed {len(changed)}" + (f"; e.g. {fail[:4]}" if fail else ''))
        bad += bool(fail)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
