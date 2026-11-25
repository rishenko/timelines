"""source_revisions.apply: dump, revision and accessed on Wikipedia sources only (wave 2 A3). Fake page_revision; no dump. Run from this folder."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import settings  # noqa: E402
import source_revisions as sr  # noqa: E402


class Apply(unittest.TestCase):
    def test_stamps_wikipedia_sources_only_and_leaves_others(self):
        data = {'sources': {
            'a': {'name': 'A', 'url': 'https://en.wikipedia.org/wiki/Alpha', 'accessed': '2026-11-21', 'tags': ['wikipedia']},
            'b': {'name': 'B', 'url': 'https://doi.org/10.1/x', 'accessed': '2026-11-21'},
            'c': {'name': 'C', 'url': 'https://en.wikipedia.org/wiki/Gone', 'accessed': '2026-11-21'},
            'd': {'name': 'D', 'author': 'x', 'year': '2000'},
        }}
        msg = sr.apply(data, lambda t: {'Alpha': (42, 't')}.get(t))
        s = data['sources']
        self.assertEqual((s['a']['dump'], s['a']['revision'], s['a']['accessed']), (settings.DUMP_NAME, 42, sr.dump_date()))
        self.assertNotIn('revision', s['b'])
        self.assertEqual(s['b']['accessed'], '2026-11-21')
        self.assertNotIn('revision', s['c'])
        self.assertNotIn('url', s['d'])
        self.assertIn('1 Wikipedia sources stamped', msg)
        self.assertIn('1 not in the dump', msg)

    def test_idempotent(self):
        data = {'sources': {'a': {'name': 'A', 'url': 'https://en.wikipedia.org/wiki/Alpha', 'accessed': 'x'}}}
        sr.apply(data, lambda t: (1, 't'))
        once = dict(data['sources']['a'])
        sr.apply(data, lambda t: (1, 't'))
        self.assertEqual(data['sources']['a'], once)

    def test_dump_date(self):
        self.assertEqual(sr.dump_date('enwiki-20261101'), '2026-11-01')
        with self.assertRaises(ValueError):
            sr.dump_date('enwiki-latest')


if __name__ == '__main__':
    unittest.main()
