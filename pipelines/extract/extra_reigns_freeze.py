"""
Freezes chosen reigns from a partial rulers run into pipelines/<generator>/extra-reigns.json (merged after reigns.json).

    pipelines/extract/.venv/bin/python -I pipelines/extract/extra_reigns_freeze.py --timeline medieval \\
        --dir OUT_DIR_A:reign-ahuitzotl --dir OUT_DIR_B:reign-louis-the-pious "why the main pass missed them"

Why not reigns_freeze.py --update: that script freezes a whole bulk run (every row of the timeline) and rewrites reigns.json from it, so a run of a
few rows would drop the other ~7,000 reigns, and a full re-run would change every hash. The reigns the pass missed are added here instead, one
reviewed event each, and fold into reigns.json at the next full re-freeze.
"""
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = {'modern-states': 'modern-states', 'medieval': 'medieval', 'ancient-classical': 'ancient'}


def main(argv):
    tl = argv[argv.index('--timeline') + 1]
    picks = [argv[i + 1] for i, a in enumerate(argv) if a == '--dir']
    why = argv[-1]
    events, sources, hashes = [], {}, {}
    for pk in picks:
        d, uuid = pk.rsplit(':', 1)
        path = os.path.join(d, 'rulers-events.json')
        j = json.load(open(path))
        ev = [e for e in j['events'] if e['uuid'] == uuid]
        if len(ev) != 1:
            raise SystemExit(f'{pk}: {len(ev)} events')
        e = ev[0]
        e.pop('importance', None)
        keys = {s['sourceKey'] for s in e['sources']} | {s['sourceKey'] for m in e.get('memberships', []) for s in m['sources']}
        sources.update({k: v for k, v in j['sources'].items() if k in keys})
        events.append(e)
        hashes[uuid] = hashlib.sha256(open(path, 'rb').read()).hexdigest()[:16]
    out = {'note': f'Frozen from pipelines/extract/rulers.py by extra_reigns_freeze.py (2026-11-24): {why}. Merged after reigns.json. Edit by re-running, not by hand.',
           'events': events, 'sources': sources, 'review': {}, 'inputs': {**hashes, 'wikipedia': 'enwiki-20261101'}}
    path = os.path.join(ROOT, 'pipelines', OUT[tl], 'extra-reigns.json')
    json.dump(out, open(path, 'w'), indent=1, ensure_ascii=False)
    open(path, 'a').write('\n')
    print(path, [(e['uuid'], e['start'], e.get('end')) for e in events])


if __name__ == '__main__':
    main(sys.argv[1:])
