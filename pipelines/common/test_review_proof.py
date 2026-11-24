"""Tests for review_proof.additivity (inline fixtures, no git)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from review_proof import additivity  # noqa: E402


def ev(uuid, tracks, **kw):
    return {'uuid': uuid, 'title': uuid, 'start': 100, 'tracks': tracks, **kw}


class Additivity(unittest.TestCase):
    def test_identical(self):
        self.assertEqual(additivity([ev('a', ['x'])], [ev('a', ['x'])]), ([], [], [], {}))

    def test_added_and_removed(self):
        added, removed, _, _ = additivity([ev('a', ['x'])], [ev('b', ['x'])])
        self.assertEqual((added, removed), (['b'], ['a']))

    def test_appended_tracks_only(self):
        _, _, appended, changed = additivity([ev('a', ['x'])], [ev('a', ['x', 'y'])])
        self.assertEqual((appended, changed), (['a'], {}))

    def test_reordered_or_dropped_tracks_count_as_changed(self):
        _, _, appended, changed = additivity([ev('a', ['x', 'y'])], [ev('a', ['y', 'x'])])
        self.assertEqual((appended, changed), ([], {'a': ['tracks']}))
        _, _, _, changed = additivity([ev('a', ['x', 'y'])], [ev('a', ['x'])])
        self.assertEqual(changed, {'a': ['tracks']})

    def test_other_fields_listed(self):
        _, _, appended, changed = additivity([ev('a', ['x'], descr='old')], [ev('a', ['x', 'y'], descr='new', end=120)])
        self.assertEqual((appended, changed), ([], {'a': ['descr', 'end', 'tracks']}))


if __name__ == '__main__':
    unittest.main()
