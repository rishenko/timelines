"""The title matching of wd_person_labels.py (no dump): a title as the dump writes it (\\uXXXX-escaped, an escaped quote or slash)."""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
import wd_person_labels as P  # noqa: E402


def line(title):
    return ('{"type":"item","id":"Q1","sitelinks":{"enwiki":{"site":"enwiki","title":' + json.dumps(title).replace('/', '\\/') + ',"badges":[]}}}').encode()


class Titles(unittest.TestCase):
    def test_a_title_is_read_whatever_its_escapes(self):
        for t in ['Paullu Inca', 'Túpac Amaru', 'He said "No"', 'AC/DC', 'Back\\slash', 'Zażółć 𝔘']:
            with self.subTest(t=t):
                got = P.title_of(line(t))
                self.assertIsNotNone(got)
                with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
                    json.dump([t], f)
                _, forms = P.wanted([f.name])
                self.assertIn(got, forms)

    def test_a_line_without_an_enwiki_title_is_skipped(self):
        self.assertIsNone(P.title_of(b'{"type":"item","id":"Q2","sitelinks":{"dewiki":{"site":"dewiki","title":"X"}}}'))


if __name__ == '__main__':
    unittest.main()
