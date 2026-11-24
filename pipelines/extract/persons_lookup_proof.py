"""
Proof that the persons store is a lookup only (Kevin, 2026-11-24: "Park; titles only"): two rulers runs on the same code, one with the store
and one with NO_PERSONS_STORE=1, must place the same reigns. Compares each timeline's rulers-events.json (by uuid, whole events) and
rulers.csv (byte for byte), and counts the persons-lookup.csv rows the store run named. Exit 1 on any difference.

    NO_PERSONS_STORE=1 pipelines/extract/.venv/bin/python -I pipelines/extract/rulers.py --timeline T --rows all --out /tmp/without_T
    pipelines/extract/.venv/bin/python -I pipelines/extract/rulers.py --timeline T --rows all --out /tmp/with_T
    python3 -I pipelines/extract/persons_lookup_proof.py --with '/tmp/with_{tl}' --without '/tmp/without_{tl}'
"""
import argparse
import csv
import json
import os
import sys

TIMELINES = ['ancient-classical', 'medieval', 'modern-states']


def main(argv):
    a = argparse.ArgumentParser()
    a.add_argument('--with', dest='store', required=True, help='the run with the store, {tl} for the timeline')
    a.add_argument('--without', required=True, help='the run with NO_PERSONS_STORE=1, {tl} for the timeline')
    a = a.parse_args(argv)
    bad = 0
    for t in TIMELINES:
        w, wo = a.store.format(tl=t), a.without.format(tl=t)
        with open(os.path.join(w, 'rulers-events.json'), encoding='utf-8') as f:
            ka = {e['uuid']: e for e in json.load(f)['events']}
        with open(os.path.join(wo, 'rulers-events.json'), encoding='utf-8') as f:
            kb = {e['uuid']: e for e in json.load(f)['events']}
        changed = [u for u in ka.keys() & kb.keys() if ka[u] != kb[u]]
        with open(os.path.join(w, 'rulers.csv'), 'rb') as f1, open(os.path.join(wo, 'rulers.csv'), 'rb') as f2:
            same = f1.read() == f2.read()
        with open(os.path.join(w, 'persons-lookup.csv'), newline='', encoding='utf-8') as f:
            looked = sum(1 for _ in csv.DictReader(f))
        added, lost = len(ka.keys() - kb.keys()), len(kb.keys() - ka.keys())
        bad += added + lost + len(changed) + (not same)
        print(f'{t}: reigns {len(ka)} with, {len(kb)} without: added {added}, lost {lost}, changed {len(changed)}; '
              f'rulers.csv {"identical" if same else "DIFFERS"}; {looked} people named in persons-lookup.csv')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
