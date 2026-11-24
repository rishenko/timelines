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


    def test_single_year_reign_at_the_start_of_a_range_overlaps(self):  # Architect: 408 (no end) beside 408–450
        ev = [self.r('reign-a', 'Reign of Theodosius II', 408, None), self.r('reign-b', 'Reign of Theodosius II', 408, 450)]
        self.assertEqual(G.overlaps(ev), [('reign-a', 'reign-b')])

    def test_two_identical_single_year_reigns_overlap(self):
        ev = [self.r('reign-a', 'Reign of X', 1100, None), self.r('reign-b', 'Reign of X', 1100, None)]
        self.assertEqual(G.overlaps(ev), [('reign-a', 'reign-b')])

    def test_same_day_handover_passes_but_a_day_earlier_overlaps(self):  # Theodora, 21 Apr–11 Jun 1042, then 11 Jun 1042–1055
        a = dict(self.r('reign-a', 'Reign of Theodora', 1042, 1042), startMonth=4, startDay=21, endMonth=6, endDay=11)
        b = dict(self.r('reign-b', 'Reign of Theodora', 1042, 1055), startMonth=6, startDay=11)
        self.assertEqual(G.overlaps([a, b]), [])
        self.assertEqual(G.overlaps([a, dict(b, startDay=10)]), [('reign-a', 'reign-b')])

    def test_month_level_handover_passes(self):  # Nauru: a term ends in Dec 1976 and the next starts in Dec 1976
        a = dict(self.r('reign-a', 'Reign of X', 1973, 1976), startMonth=12, endMonth=12)
        b = dict(self.r('reign-b', 'Reign of X', 1976, 1977), startMonth=12)
        self.assertEqual(G.overlaps([a, b]), [])


    def test_range_ending_where_it_starts_is_one_unit(self):  # 1042–1042 with no months: a year, so it overlaps 1042–1055
        ev = [self.r('reign-a', 'Reign of X', 1042, 1042), self.r('reign-b', 'Reign of X', 1042, 1055)]
        self.assertEqual(G.overlaps(ev), [('reign-a', 'reign-b')])
        ev = [self.r('reign-a', 'Reign of X', 1042, 1042), self.r('reign-b', 'Reign of X', 1043, 1055)]
        self.assertEqual(G.overlaps(ev), [])


    def test_year_only_end_in_the_start_year_runs_to_year_end(self):  # starts in March, "to 1411": not one day
        a = dict(self.r('reign-a', 'Reign of X', 1411, 1411), startMonth=3)
        b = dict(self.r('reign-b', 'Reign of X', 1411, None), startMonth=9)  # a later same-year duplicate
        self.assertEqual(G.overlaps([a, b]), [('reign-a', 'reign-b')])
        c = self.r('reign-c', 'Reign of X', 1412, 1420)
        self.assertEqual(G.overlaps([a, c]), [])  # but the next year still only follows


if __name__ == '__main__':
    unittest.main()
