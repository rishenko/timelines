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
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = {'modern-states': 'modern-states', 'medieval': 'medieval', 'ancient-classical': 'ancient'}


def from_freeze(argv):
    """--timeline T --from-freeze FILE --rows r1,r2 [--skip 'text'] "why": adds the reigns a dry reigns_freeze.py run (--out FILE) holds beyond the committed
    reigns.json for those rows, to extra-reigns.json (kept: what the file already holds). --skip drops a reign whose to-check reasons mention the text."""
    tl = argv[argv.index('--timeline') + 1]
    new = json.load(open(argv[argv.index('--from-freeze') + 1]))
    rows = set(argv[argv.index('--rows') + 1].split(','))
    skip = [argv[i + 1] for i, a in enumerate(argv) if a == '--skip']
    old = {e['uuid'] for e in json.load(open(os.path.join(ROOT, 'pipelines', OUT[tl], 'reigns.json')))['events']}
    path = os.path.join(ROOT, 'pipelines', OUT[tl], 'extra-reigns.json')
    cur = json.load(open(path)) if os.path.exists(path) else {'events': [], 'sources': {}, 'review': {}, 'inputs': {}}
    have = {e['uuid'] for e in cur['events']}
    added = []
    for e in new['events']:
        r = new['review'][e['uuid']]
        if e['uuid'] in old or e['uuid'] in have or r['row'] not in rows or any(s in ' '.join(r['toCheck']) for s in skip):
            continue
        m = re.search(r'\(with ([^)]+)\)', e['sources'][0]['sourceLocation'])
        if m:  # "c. 1344 – 1352 (with Basarab I)": a co-reign, said in the description and the review
            e = dict(e, descr=re.sub(r'\.?$', f'; a co-reign with {m.group(1)}.', e['descr'], count=1))
            r = dict(r, toCheck=list(r['toCheck']) + [f'co-reign with {m.group(1)}'])
        cur['events'].append(e)
        cur['review'][e['uuid']] = r
        added.append(e['title'])
    used = {s['sourceKey'] for e in cur['events'] for s in e['sources']} | {s['sourceKey'] for e in cur['events'] for m in e.get('memberships', []) for s in m.get('sources', [])}
    cur['sources'].update({k: v for k, v in new['sources'].items() if k in used})
    cur['note'] = cur.get('note') or 'Frozen by extra_reigns_freeze.py. Merged after reigns.json. Edit by re-running, not by hand.'
    cur['inputs'].update(new.get('inputs', {}))
    json.dump(cur, open(path, 'w'), indent=1, ensure_ascii=False)
    open(path, 'a').write('\n')
    print(path, len(added), 'added:', added)


def main(argv):
    if '--from-freeze' in argv:
        return from_freeze(argv)
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
