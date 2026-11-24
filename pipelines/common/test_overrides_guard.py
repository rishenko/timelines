"""The overrides guard's diff (no git, no dump)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import overrides_guard as G  # noqa: E402


class Changes(unittest.TestCase):
    def test_added_removed_changed_and_notes_ignored(self):
        old = {'_note': 'x', 'a': ['war'], 'b': ['religion'], 'c': ['law']}
        new = {'_note': 'y', 'a': ['war'], 'b': ['religion', 'law'], 'd': ['war']}
        self.assertEqual(G.changes(old, new), [('b', ['religion'], ['religion', 'law']), ('c', ['law'], None), ('d', None, ['war'])])

    def test_no_change(self):
        self.assertEqual(G.changes({'a': ['war']}, {'a': ['war']}), [])


if __name__ == '__main__':
    unittest.main()
