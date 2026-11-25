"""python -I test_row_ids_check.py (from pipelines/common)"""
import os
import sys
import unittest

sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
import row_ids_check as R  # noqa: E402

ROW = {'id': 'a', 'url': 'https://en.wikipedia.org/wiki/A', 'ids': {'wikidata': 'Q1'}}


class Check(unittest.TestCase):
    def test_clean(self):
        self.assertEqual(R.problems({'m': [ROW]}, {}), [])

    def test_missing_id(self):
        p = R.problems({'m': [{'id': 'b', 'url': 'https://en.wikipedia.org/wiki/B'}]}, {})
        self.assertEqual(len(p), 1)
        self.assertIn('m/b', p[0])

    def test_container_without_url_is_exempt(self):
        self.assertEqual(R.problems({'m': [{'id': 'europe', 'name': 'Europe'}]}, {}), [])

    def test_allowlisted_row_passes_and_stale_entries_fail(self):
        row = {'id': 'k', 'url': 'https://en.wikipedia.org/wiki/K'}
        self.assertEqual(R.problems({'m': [row]}, {'m': {'k': 'no item'}}), [])
        self.assertIn('remove it', R.problems({'m': [{**row, 'ids': {'wikidata': 'Q2'}}]}, {'m': {'k': 'no item'}})[0])
        self.assertIn('no url any more', R.problems({'m': [{'id': 'k'}]}, {'m': {'k': 'no item'}})[0])

    def test_malformed_id(self):
        self.assertIn('not a Wikidata item id', R.problems({'m': [{**ROW, 'ids': {'wikidata': 'x'}}]}, {})[0])
        self.assertIn('not a Wikidata item id', R.problems({'m': [{**ROW, 'ids': {'wikidata': 'Q0'}}]}, {})[0])


if __name__ == '__main__':
    unittest.main()
