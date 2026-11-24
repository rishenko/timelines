"""Precision sample of the war strips: N random (war, row, start-end) strips, each with the sentences of the state's own article that
mention the war and a year, for a human to judge. Usage (from the repo root):
  TIMELINES_DATA=~/data python -I pipelines/v2/strip_sample.py [N] [seed]
Prints a numbered list; the verdicts are written by hand into the review note."""
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, 'harvest')]
import disasters as D  # noqa: E402
import wp_dump  # noqa: E402

KEY = {'world-war-i': r'World War I\b|First World War|Great War', 'world-war-ii': r'World War II|Second World War', 'thirty-years-war': r'Thirty Years',
       'seven-years-war': r'Seven Years', 'napoleonic-wars': r'Napoleonic|Coalition', 'second-sino-japanese-war': r'Sino-Japanese|Japanese invasion|War of Resistance',
       'paraguayan-war': r'Paraguayan War|Triple Alliance|War of the Triple', 'mahdist-war': r'Mahdist|Mahdi',
       'hundred-years-war': r'Hundred Years', 'war-of-the-spanish-succession': r'Spanish Succession', 'great-northern-war': r'Great Northern War',
       'american-revolutionary-war': r'Revolutionary War|American War of Independence', 'crimean-war': r'Crimean War', 'russo-japanese-war': r'Russo-Japanese',
       'war-of-the-pacific': r'War of the Pacific', 'korean-war': r'Korean War', 'vietnam-war': r'Vietnam War', 'iran-iraq-war': r'Iran.Iraq',
       'chaco-war': r'Chaco War', 'second-congo-war': r'Congo War|Second Congo',
       'genpei-war': r'Genpei|Gempei', 'onin-war': r'Ōnin|Onin', 'mongol-conquest-of-the-song-dynasty': r'Mongol|Song', 'jin-song-wars': r'Jin|Song',
       'tripartite-struggle': r'Tripartite|Pratihara|Pala|Rashtrakuta', 'almohad-conquest-of-norman-africa': r'Almohad|Norman', 'fatimid-conquest-of-egypt': r'Fatimid|Egypt',
       'arab-conquest-of-sindh': r'Sindh|Muhammad ibn', 'red-turban-rebellions': r'Red Turban'}
SUFFIX = {'world-war-i': 'World War I', 'world-war-ii': 'World War II'}


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    random.seed(int(sys.argv[2]) if len(sys.argv) > 2 else 1)
    d = json.load(open(os.path.join(HERE, 'emitted', os.environ.get('SAMPLE_FILE', 'conflict-modern-states.json')), encoding='utf-8'))
    tl_ = os.environ.get('SAMPLE_FILE', 'conflict-modern-states.json')[len('conflict-'):-len('.json')]
    tracks = {t['id']: t for t in json.load(open(os.path.join(HERE, '..', '..', 'data-src', tl_ + '.json'), encoding='utf-8'))['tracks']}
    only = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None  # war row ids to sample from
    strips = [(m['row'], r, m['start'], m.get('end'), m['sources'][0]['sourceLocation']) for r, es in d['rowEdits'].items() for e in es for m in [e.get('memberOf')] if m and (not only or m['row'] in only)]
    for i, (war, r, s, e, loc) in enumerate(random.sample(strips, min(n, len(strips))), 1):
        name = tracks[r]['name']
        titles = [f'{name} in {SUFFIX[war]}', f'{name} during {SUFFIX[war]}'] if war in SUFFIX else []
        titles.append(tracks[r].get('url', '').rsplit('/', 1)[-1].replace('_', ' ') or name)
        text, used = '', ''
        for t in titles:
            p = wp_dump.page(t)
            if p:
                text, used = D.plain(p['text']), t
                break
        sents = [x for x in re.split(r'(?<=[.!?])\s+', text) if re.search(KEY[war], x) and re.search(r'\b(1[5-9]\d\d)\b', x)][:3]
        print(f'{i}. {war} / {name}: {s}–{e}  [article: {used}]\n   strip source: {loc[:150]}')
        for x in sents:
            print('   -', x[:260])


main()
