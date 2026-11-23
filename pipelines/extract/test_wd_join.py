"""Wikidata comparison cases (python -m unittest from pipelines/extract)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wd_join import compare, wd_time  # noqa: E402

G = 'Q1985727'


class Compare(unittest.TestCase):
    def test_time_strings(self):
        self.assertEqual(wd_time('+1914-07-28T00:00:00Z', 11), (1914, 7, 28))
        self.assertEqual(wd_time('-0044-03-15T00:00:00Z', 9), (-44, None, None))
        self.assertEqual(wd_time('+1848-00-00T00:00:00Z', 9), (1848, None, None))

    def test_agree_at_coarser_precision(self):
        s = {'start': (1914, 7, 28), 'end': (1918, 11, 11)}
        self.assertEqual(compare(s, {'start': [(1914, 7, None, 'P580', G)], 'end': [(1918, 11, 11, 'P582', G)]}), 'agree')

    def test_point_in_time_inside_range(self):  # Battle of Lahti: P585 is the last day
        s = {'start': (1918, 4, 19), 'end': (1918, 5, 1)}
        self.assertEqual(compare(s, {'start': [(1918, 5, 1, 'P585', G)], 'end': []}), 'agree')

    def test_real_difference(self):  # Battle of Funchal
        s = {'start': (1916, 12, 16), 'end': None}
        self.assertTrue(compare(s, {'start': [(1916, 12, 3, 'P580', G)], 'end': []}).startswith('differs: start'))

    def test_end_difference(self):  # Balkan Wars
        s = {'start': (1912, 10, 8), 'end': (1913, 8, 10)}
        self.assertTrue(compare(s, {'start': [(1912, 10, 8, 'P580', G)], 'end': [(1913, 7, 18, 'P582', G)]}).startswith('differs: end'))


    def test_bce_written_astronomical(self):  # Wikidata's "-0044" is 44 BC; the comparison text gives the stored -43
        s = {'start': (-44, 3, 14), 'end': None}
        got = compare(s, {'start': [(*wd_time('-0044-03-15T00:00:00Z', 11), 'P585', G)], 'end': []})
        self.assertIn('-43-3-15', got)
        self.assertNotIn('-44', got)


if __name__ == '__main__':
    unittest.main()
