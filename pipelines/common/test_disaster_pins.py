"""disaster_pins (python -m unittest from pipelines/common): the pinned layer reads the emitted files, never the reviewed overrides."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import disaster_pins as D  # noqa: E402


class Pins(unittest.TestCase):
    def test_pins_come_from_the_emitted_events_memberships(self):
        with tempfile.TemporaryDirectory() as d:
            json.dump({'events': [{'uuid': 'disaster-x', 'memberships': [{'facet': 'category', 'value': 'eruption'}, {'facet': 'category', 'value': 'famine'}, {'facet': 'geography', 'value': 'nile'}]},
                                   {'uuid': 'disaster-y', 'memberships': []}]}, open(os.path.join(d, 'disaster-medieval.json'), 'w'))
            old, D.EMITTED = D.EMITTED, d
            try:
                self.assertEqual(D.category_pins(), {'disaster-x': (['eruption', 'famine'], 'pipelines/v2/emitted/disaster-medieval.json')})
            finally:
                D.EMITTED = old

    def test_the_real_emitted_events_are_pinned(self):  # every emitted disaster has its type pinned, and none is in Kevin's overrides
        pins = D.category_pins()
        for tl in ('ancient', 'medieval', 'modern-states'):
            ov = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', tl, 'categories.json')))
            self.assertFalse([k for k in ov if k.startswith('disaster-')], tl)
        self.assertTrue(all(k.startswith('disaster-') for k in pins))
        self.assertGreaterEqual(len(pins), 24)


if __name__ == '__main__':
    unittest.main()
