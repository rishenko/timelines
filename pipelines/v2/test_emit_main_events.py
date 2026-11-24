"""The already-there check ignores the conflicts' own events (python3 -I pipelines/v2/test_emit_main_events.py)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'extract'))
import emit  # noqa: E402


class NotOwn(unittest.TestCase):
    def test_conflict_events_are_not_already_there(self):
        events = [{'uuid': 'ww1', 'title': 'World War I'}, {'uuid': 'conflict-battle-of-x', 'title': 'Battle of X'}]
        self.assertEqual([e['uuid'] for e in emit.not_own(events)], ['ww1'])

    def test_other_prefixes_stay(self):
        events = [{'uuid': 'conflicting-claims', 'title': 'A'}, {'uuid': 'disaster-x', 'title': 'B'}]
        self.assertEqual(len(emit.not_own(events)), 2)


if __name__ == '__main__':
    unittest.main()
