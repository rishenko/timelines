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


class Overlap(unittest.TestCase):
    def r(self, uuid, title, start, end, track='x'):
        return {'uuid': uuid, 'title': title, 'start': start, 'end': end, 'tracks': [track]}

    def test_same_title_same_row_overlap_found(self):
        ev = [self.r('reign-a', 'Reign of Theodosius II', 408, 450), self.r('reign-b', 'Reign of Theodosius II', 402, 450)]
        self.assertEqual(G.overlaps(ev), [('reign-a', 'reign-b')])

    def test_touching_years_other_row_other_title_or_not_a_reign_pass(self):
        ev = [self.r('reign-a', 'Reign of Vlad II', 1436, 1442), self.r('reign-b', 'Reign of Vlad II', 1442, 1447),
              self.r('reign-c', 'Reign of Vlad II', 1440, 1445, track='y'), self.r('reign-d', 'Reign of Mircea', 1436, 1442),
              self.r('battle', 'Reign of Vlad II', 1436, 1442)]
        self.assertNotIn(('reign-a', 'reign-b'), G.overlaps(ev))
        self.assertTrue(all('battle' not in p for p in G.overlaps(ev)))

    def test_a_one_year_reign_inside_another_overlaps_only_when_inside(self):
        ev = [self.r('reign-a', 'Reign of X', 1000, 1010), self.r('reign-b', 'Reign of X', 1005, None)]
        self.assertEqual(G.overlaps(ev), [('reign-a', 'reign-b')])
        ev = [self.r('reign-a', 'Reign of X', 1000, 1010), self.r('reign-b', 'Reign of X', 1010, None)]
        self.assertEqual(G.overlaps(ev), [])


if __name__ == '__main__':
    unittest.main()
