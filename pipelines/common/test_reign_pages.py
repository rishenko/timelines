"""Tests for reign_pages.py: the parts that need no dump run everywhere; the one that reads the dump is skipped where it is absent (CI)."""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import reign_pages as RP  # noqa: E402

PAGE = """{{Short description|Emperor}}
{{Infobox royalty
| name = Wilhelm II
| succession = [[German Emperor]] {{nobold|[[King of Prussia]]}}
| reign = 15 June 1888 – 9 November 1918
}}
'''Wilhelm II''' was the last [[German Emperor]].

== Early life ==
Born in Berlin."""


class Parts(unittest.TestCase):
    def test_infobox_and_lead(self):
        box, lead = RP.infobox_and_lead(PAGE)
        self.assertTrue(box.startswith('{{Infobox royalty') and box.endswith('}}'))
        self.assertEqual(lead, "'''Wilhelm II''' was the last [[German Emperor]].")

    def test_office_link_takes_the_first_link_of_an_office_field(self):
        self.assertEqual(RP.office_link(RP.infobox_and_lead(PAGE)[0]), 'German Emperor')
        self.assertIsNone(RP.office_link('{{Infobox person\n| name = X\n}}'))

    def test_person_source_skips_the_list_page(self):
        sources = {'l': {'url': 'https://en.wikipedia.org/wiki/List_of_prime_ministers_of_Japan'}, 'p': {'url': 'https://en.wikipedia.org/wiki/Nobuyuki_Abe'}}
        self.assertEqual(RP.person_source({'sources': [{'sourceKey': 'l'}, {'sourceKey': 'p'}]}, sources), 'Nobuyuki Abe')
        self.assertEqual(RP.person_source({'sources': [{'sourceKey': 'p'}]}, sources), 'Nobuyuki Abe')

    def test_cache_round_trip(self):
        with tempfile.TemporaryDirectory() as d:
            c = RP.Cache(os.path.join(d, 'c.jsonl'))
            c.put({'dump': 'enwiki-x', 'asked': 'A', 'title': 'A', 'revision': 1})
            self.assertEqual(RP.Cache(os.path.join(d, 'c.jsonl')).get('enwiki-x', 'A')['revision'], 1)


@unittest.skipUnless(os.path.exists(os.path.join(RP.data_root.where('wikipedia'), 'index.sqlite')), 'needs the Wikipedia dump')
class WithDump(unittest.TestCase):
    def test_three_pages_for_a_committed_reign(self):
        with tempfile.TemporaryDirectory() as d:
            os.environ['REIGN_PAGES_CACHE'] = os.path.join(d, 'c.jsonl')
            RP.CACHE = os.environ['REIGN_PAGES_CACHE']
            from io import StringIO
            out, old = StringIO(), sys.stdout
            sys.stdout = out
            try:
                RP.main(['reign-wilhelm-ii-germany'])
            finally:
                sys.stdout = old
            text = out.getvalue()
            self.assertIn('-- person: Wilhelm II | QID Q2677 |', text)
            self.assertIn('-- realm: Germany | QID Q183 |', text)
            self.assertIn('-- office: German Emperor |', text)


if __name__ == '__main__':
    unittest.main()
