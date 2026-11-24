"""Tests for reigns_guard (inline fixtures, plus one temporary git repository)."""
import json
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reigns_guard as G  # noqa: E402


def ev(uuid, start, **kw):
    return {'uuid': uuid, 'start': start, **kw}


class ReignsGuard(unittest.TestCase):
    def test_files_matched_by_pattern(self):
        names = ['pipelines/ancient/reigns.json', 'pipelines/ancient/yamato-reigns.json', 'pipelines/medieval/extra-reigns.json',
                 'pipelines/extract/reigns-excluded.json', 'pipelines/extract/reigns-claims.json', 'data-src/provenance/medieval-reigns.json',
                 'pipelines/ancient/categories.json']
        self.assertEqual(G.reign_files(names), ['pipelines/ancient/reigns.json', 'pipelines/ancient/yamato-reigns.json',
                                                'pipelines/medieval/extra-reigns.json'])

    def test_added_passes_lost_and_changed_found(self):
        old = {'events': [ev('a', 100), ev('b', 200)]}
        self.assertEqual(G.compare(old, {'events': [ev('a', 100), ev('b', 200), ev('c', 300)]}), ([], []))
        self.assertEqual(G.compare(old, {'events': [ev('a', 100), ev('b', 201)]}), ([], ['b']))
        self.assertEqual(G.compare(old, {'events': [ev('b', 200)]}), (['a'], []))
        self.assertEqual(G.compare(old, None), (['a', 'b'], []))
        self.assertEqual(G.fields(old, {'events': [ev('b', 201, circa=True)]}, 'b'), ['circa', 'start'])

    def test_against_a_base_commit(self):  # a changed reign in a new file name pattern fails without the label
        with tempfile.TemporaryDirectory() as d:
            run = lambda *a: subprocess.run(a, cwd=d, check=True, capture_output=True)  # noqa: E731
            run('git', 'init', '-q')
            run('git', 'config', 'user.email', 't@t')
            run('git', 'config', 'user.name', 't')
            os.makedirs(os.path.join(d, 'pipelines', 'medieval'))
            path = os.path.join(d, 'pipelines', 'medieval', 'italy-reigns.json')
            json.dump({'events': [ev('a', 774)]}, open(path, 'w'))
            run('git', 'add', '-A')
            run('git', 'commit', '-qm', 'base')
            json.dump({'events': [ev('a', 775)]}, open(path, 'w'))
            root, G.ROOT = G.ROOT, d
            env = os.environ.pop('REIGNS_ALLOWED', None)
            try:
                self.assertEqual(G.main(['--base', 'HEAD']), 1)
                os.environ['REIGNS_ALLOWED'] = 'true'
                self.assertEqual(G.main(['--base', 'HEAD']), 0)
            finally:
                G.ROOT = root
                os.environ.pop('REIGNS_ALLOWED', None)
                if env is not None:
                    os.environ['REIGNS_ALLOWED'] = env


if __name__ == '__main__':
    unittest.main()
