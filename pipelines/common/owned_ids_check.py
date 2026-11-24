"""Ancient's owned-ids check (reproducibility audit, change 8).

Ancient's source file (data-src/ancient-classical.json) is built by upserting: its scripts add or update events and never delete one. So a
reign, conflict or disaster event that is removed from the file that owns it (a reigns.json, the emitted conflict or disaster file)
would stay in the timeline for good. This fails when an event whose id starts reign-, conflict- or disaster- is in the source but in
none of the files that own it.

    python3 -I pipelines/common/owned_ids_check.py [--root DIR]

Owners: pipelines/ancient/*reigns.json (events) and pipelines/v2/emitted/{conflict,disaster}-ancient-classical.json (events).
"""
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PREFIXES = ('reign-', 'conflict-', 'disaster-')


def orphans(root):
    source = json.load(open(os.path.join(root, 'data-src', 'ancient-classical.json'), encoding='utf-8'))
    owned = set()
    files = glob.glob(os.path.join(root, 'pipelines', 'ancient', '*reigns.json')) + glob.glob(os.path.join(root, 'pipelines', 'v2', 'emitted', '*-ancient-classical.json'))
    for f in files:
        owned |= {e['uuid'] for e in json.load(open(f, encoding='utf-8')).get('events', [])}
    return sorted(e['uuid'] for e in source['events'] if e['uuid'].startswith(PREFIXES) and e['uuid'] not in owned), len(files)


def main(argv):
    root = argv[argv.index('--root') + 1] if '--root' in argv else os.path.normpath(os.path.join(HERE, '..', '..'))
    lost, n = orphans(root)
    if lost:
        print(f'owned ids: {len(lost)} Ancient event(s) with a reign-/conflict-/disaster- id that no frozen or emitted file owns (a removed event stays in Ancient: scripts never delete):')
        for u in lost[:30]:
            print(f'  {u}')
        print('Either an input dropped it (put it back, or delete it from data-src/ancient-classical.json on purpose and add a null redirect) or it was typed in by hand (add it to extra-reigns.json).')
        return 1
    print(f'owned ids: ok (every reign-, conflict- and disaster- event in Ancient is in one of {n} owner files)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
