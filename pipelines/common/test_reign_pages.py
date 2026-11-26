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
        # a list page not titled "List of…" is recognised by the offices stage's list-row citation
        office = {'k': {'url': 'https://en.wikipedia.org/wiki/Kuhina_Nui'}, 'p': {'url': 'https://en.wikipedia.org/wiki/Kek%C4%81uluohi'}}
        ev = {'sources': [{'sourceKey': 'k', 'sourceLocation': 'table 0, row 3: Kekāuluohi | 1839 | 1845'}, {'sourceKey': 'p', 'sourceLocation': 'article: Kekāuluohi'}]}
        self.assertEqual(RP.person_source(ev, office), 'Kekāuluohi')

    def test_grep_lines(self):
        out = RP.grep_lines(PAGE, ['berlin', 'nowhere'])
        self.assertEqual(out, ["LINES WITH 'berlin':", 'Born in Berlin.', "LINES WITH 'nowhere':", '(none)'])

    def test_cache_round_trip(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, 'c.jsonl')
            c = RP.Cache(path)
            c.put({'dump': 'enwiki-x', 'asked': 'A', 'title': 'A', 'revision': 1})
            with open(path, 'a', encoding='utf-8') as f:
                f.write('{"dump": "enwiki-x", "asked": "B", "tit')  # a torn line
                f.write('\n' + json.dumps({'dump': 'enwiki-x', 'asked': 'C', 'title': 'C', 'revision': 3}) + '\n')  # an older version: ignored
            again = RP.Cache(path)
            self.assertEqual(again.get('enwiki-x', 'A')['revision'], 1)
            self.assertIsNone(again.get('enwiki-x', 'B'))
            self.assertIsNone(again.get('enwiki-x', 'C'))


@unittest.skipUnless(os.path.exists(os.path.join(RP.data_root.where('wikipedia'), 'index.sqlite')), 'needs the Wikipedia dump')
class WithDump(unittest.TestCase):
    def test_three_pages_for_a_committed_reign(self):
        with tempfile.TemporaryDirectory() as d:
            old_cache = RP.CACHE
            RP.CACHE = os.path.join(d, 'c.jsonl')
            self.addCleanup(setattr, RP, 'CACHE', old_cache)
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
            self.assertEqual(RP.qid_of_title('Sessei'), 'Q2377838')  # not in the item table: the dump's page_props
            out, old = StringIO(), sys.stdout
            sys.stdout = out
            try:
                RP.main(['--title', 'List of prime ministers of Japan', '--grep', 'Nobuyuki Abe'])
            finally:
                sys.stdout = old
            self.assertIn('-- page: List of prime ministers of Japan |', out.getvalue())
            self.assertIn("LINES WITH 'Nobuyuki Abe':", out.getvalue())
            self.assertNotIn('(none)', out.getvalue().split("LINES WITH 'Nobuyuki Abe':")[1])


if __name__ == '__main__':
    unittest.main()
