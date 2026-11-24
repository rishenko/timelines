"""Checks that every reviewed start/end claim in pipelines/v2/overrides/<kind>s.json (set.start, set.end) is a sentence the
article says: its quote must be in the Wikipedia dump's text of the article named by "article". Needs the dump (not run in CI).

    ~/Documents/GitHub/timelines-extract/pipelines/extract/.venv/bin/python -I pipelines/v2/check_override_quotes.py conflict
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, 'harvest')]
import disasters as D  # noqa: E402
import wp_dump  # noqa: E402


def main(kind):
    over = {k: v for k, v in json.load(open(os.path.join(HERE, 'overrides', f'{kind}s.json'))).items() if not k.startswith('_')}
    bad = n = 0
    for qid, o in over.items():
        for side in ('start', 'end'):
            rc = o.get('set', {}).get(side)
            if not rc:
                continue
            n += 1
            p = wp_dump.page(rc['article'])
            ok = bool(p) and (D.norm(rc['quote']) in D.norm(D.plain(p['text'])) or D.norm(rc['quote']) in D.norm(p['text']))
            print(('ok   ' if ok else 'FAIL ') + f"{qid} {rc['article']} {side} {rc['year']}: {rc['quote'][:70]}")
            bad += not ok
    print(f'{n} reviewed claims, {bad} not found in the article')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'conflict'))
