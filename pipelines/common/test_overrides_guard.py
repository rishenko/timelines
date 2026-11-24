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


class AgainstAGitBase(unittest.TestCase):
    def test_a_commit_that_adds_an_override_is_seen(self):  # a temporary repository: base commit, then a change
        import json
        import subprocess
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            run = lambda *a: subprocess.run(a, cwd=d, check=True, capture_output=True)  # noqa: E731
            run('git', 'init', '-q')
            run('git', 'config', 'user.email', 't@t')
            run('git', 'config', 'user.name', 't')
            os.makedirs(os.path.join(d, 'pipelines', 'ancient'))
            path = os.path.join(d, 'pipelines', 'ancient', 'categories.json')
            json.dump({'a': ['war']}, open(path, 'w'))
            run('git', 'add', '-A')
            run('git', 'commit', '-qm', 'base')
            json.dump({'a': ['war'], 'b': ['religion']}, open(path, 'w'))
            old = G.at('HEAD', 'pipelines/ancient/categories.json', root=d)
            self.assertEqual(G.changes(old, json.load(open(path))), [('b', None, ['religion'])])


if __name__ == '__main__':
    unittest.main()
