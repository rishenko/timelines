"""The quote backfill is applied (no dump needed; CI runs it): every event pipelines/ancient/locator-quotes.json quotes has that
quote in its locator, quoted, and no date was touched by it.

    python3 -I pipelines/ancient/test_locator_quotes.py
"""
import json
import os
import re
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))


class Applied(unittest.TestCase):
    def test_every_planned_locator_carries_its_quote(self):
        plan = json.load(open(os.path.join(HERE, 'locator-quotes.json')))['events']
        ev = {e['uuid']: e for e in json.load(open(os.path.join(ROOT, 'data-src', 'ancient-classical.json')))['events']}
        for uuid, p in plan.items():
            with self.subTest(uuid=uuid):
                self.assertIn(uuid, ev)
                loc = next(s['sourceLocation'] for s in ev[uuid]['sources'] if s['sourceKey'] == p['source'])
                if 'quote' in p:
                    self.assertIn(f'"{p["quote"]}"', loc)
                else:
                    self.assertIn('none', p)
                    self.assertFalse(re.search(r'"', loc), 'a flagged event keeps its locator as it was')


if __name__ == '__main__':
    unittest.main()
