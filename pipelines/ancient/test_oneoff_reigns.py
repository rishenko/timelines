"""The two one-off reign files (rashidun-reigns.json, yamato-reigns.json) against the run that made them
(pipelines/ancient/oneoff-inputs/; python -I pipelines/ancient/test_oneoff_reigns.py; no dump needed)."""
import hashlib
import json
import os
import re
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
STORED = os.path.join(HERE, 'oneoff-inputs', 'rulers-events.json')


def clean(x):
    """The infobox date text's empty "( )" leftover (a bare parenthesis from a template the cleaner emptied) is cosmetic; the importance is set after the run."""
    x = {k: v for k, v in x.items() if k != 'importance'} if 'uuid' in x else x  # the importance pass sets it afterwards (npm run data -- importance)
    return json.loads(re.sub(r' ; \( \)', '', json.dumps(x, ensure_ascii=False)))


class OneOff(unittest.TestCase):
    def test_each_file_records_the_hash_of_the_stored_run(self):
        h = hashlib.sha256(open(STORED, 'rb').read()).hexdigest()[:16]
        for name in ('rashidun', 'yamato'):
            c = json.load(open(os.path.join(HERE, f'{name}-reigns.json')))
            self.assertEqual(c['inputs']['rulers-events.json'], h, name)

    def test_every_event_is_the_stored_runs_event(self):
        run = {e['uuid']: e for e in json.load(open(STORED))['events']}
        for name in ('rashidun', 'yamato'):
            c = json.load(open(os.path.join(HERE, f'{name}-reigns.json')))
            self.assertTrue(c['events'], name)
            for e in c['events']:
                self.assertIn(e['uuid'], run, e['uuid'])
                self.assertEqual(clean(run[e['uuid']]), clean(e), e['uuid'])

    def test_their_sources_are_the_runs(self):
        run = json.load(open(STORED))['sources']
        for name in ('rashidun', 'yamato'):
            c = json.load(open(os.path.join(HERE, f'{name}-reigns.json')))
            for k, v in c['sources'].items():
                self.assertEqual(clean(run[k]), clean(v), k)


if __name__ == '__main__':
    unittest.main()
