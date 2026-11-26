"""python -I test_extra_reigns_freeze.py (from pipelines/extract): the extra-reigns writer is append-or-refuse."""
import copy
import os
import sys
import unittest

sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
import extra_reigns_freeze as X  # noqa: E402

A = {'uuid': 'reign-a', 'title': 'A', 'start': 1, 'end': 2}
B = {'uuid': 'reign-b', 'title': 'B', 'start': 3, 'end': 4}


class AppendOrRefuse(unittest.TestCase):
    def test_new_file(self):
        cur, added = X.append_or_refuse(None, [A], {'s': 1}, {'reign-a': 'h'})
        self.assertEqual((cur['events'], added, cur['inputs']), ([A], ['reign-a'], {'reign-a': 'h'}))

    def test_appends_and_keeps_what_the_file_holds(self):
        cur, _ = X.append_or_refuse(None, [A], {}, {})
        cur, added = X.append_or_refuse(copy.deepcopy(cur), [A, B], {}, {})
        self.assertEqual(([e['uuid'] for e in cur['events']], added), (['reign-a', 'reign-b'], ['reign-b']))

    def test_refuses_a_changed_event(self):
        cur, _ = X.append_or_refuse(None, [A], {}, {})
        with self.assertRaises(SystemExit):
            X.append_or_refuse(cur, [dict(A, end=9)], {}, {})

    def test_refuses_a_committed_uuid(self):
        with self.assertRaises(SystemExit):
            X.append_or_refuse(None, [A], {}, {}, committed={'reign-a'})


if __name__ == '__main__':
    unittest.main()
