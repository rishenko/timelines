"""Rulers pass cases that need no dump: list-page rows, infobox offices, Wikidata term checks, the review layout.
Run: pipelines/extract/.venv/bin/python -I pipelines/extract/test_rulers.py"""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rulers as R  # noqa: E402
from review_file import Review, Row  # noqa: E402

TABLE = '''{| class="wikitable"
|-
! No. !! Portrait !! Name !! Elected !! Took office !! Left office
|-
! 3
| [[File:x.jpg|75px]]
| [[Rolandas Paksas]]<br>{{small|(born 1956)}}
| style="text-align:center;"| 2002–03
| style="text-align:center;"| 26 February 2003
| style="text-align:center;"| 6 April 2004
|-
| 80px || [[Dina Boluarte]]<br>{{small|(born 1962)}}<br>7 December 2022 || 10 October 2025
|-
| [[Joseph Boakai]]<br>{{small|(born 1944)}} || 22 January 2024 || Incumbent
|}'''

TEMPLATES = '''{{Officeholder table
| order2       = 7
| officeholder = [[Nicos Anastasiades]]
| born_year    = 1946
| term_start   = 28 February 2013
| term_end     = 28 February 2023
}}
{{List of rulers
| name4        = \'\'\'[[Jigme Singye Wangchuck|Jigme Singye]]\'\'\'
| native4      = {{lang|dz|x}}
| life4        = {{Birth date and age|1955|11|11|df=y}}
| reignstart4  = 21 July 1972
| reignend4    = 9 December 2006<br>{{small|(\'\'abdicated\'\')}}
}}'''


def first(text, person):
    pts, _ = R.list_rows(text, person)[0]
    return [p for p, _ in pts]


class ListRows(unittest.TestCase):
    def test_table_row_after_the_name(self):
        self.assertEqual(first(TABLE, 'Rolandas Paksas'), [(2002, None, None), (2003, None, None), (2003, 2, 26), (2004, 4, 6)])

    def test_dates_in_the_name_cell_and_life_years_dropped(self):
        self.assertEqual(first(TABLE, 'Dina Boluarte'), [(2022, 12, 7), (2025, 10, 10)])

    def test_incumbent_is_an_open_end(self):
        self.assertEqual(first(TABLE, 'Joseph Boakai'), [(2024, 1, 22), None])

    def test_officeholder_template(self):
        self.assertEqual(first(TEMPLATES, 'Nicos Anastasiades'), [(2013, 2, 28), (2023, 2, 28)])

    def test_numbered_template_fields_inside_nested_templates(self):
        self.assertEqual(first(TEMPLATES, 'Jigme Singye Wangchuck'), [(1972, 7, 21), (2006, 12, 9)])


class Offices(unittest.TestCase):
    def test_office_carries_to_later_terms(self):
        p = {'order': '[[Prime Minister of France]]', 'term_start': '4 April 1893', 'term_end': '3 December 1893',
             'term_start2': '30 May 1894', 'term_end2': '26 January 1895',
             'order4': 'Acting [[President of France]]', 'term_start4': '25 June 1894', 'term_end4': '27 June 1894'}
        got = {f: succ for f, _, succ in R.wp_reigns(p)}
        self.assertEqual(got['term_start2'], 'Prime Minister of France')
        self.assertEqual(got['term_start4'], 'Acting President of France')

    def test_merge_keeps_offices_apart(self):
        pres = ((1848, 12, 20), (1852, 12, 2), None, None, 'P39 Q1')
        emp = ((1852, 12, 2), (1870, 9, 4), None, None, 'P39 Q2')
        self.assertEqual(len(R.merge_terms([pres, emp])), 2)
        self.assertEqual(len(R.merge_terms([pres, pres[:0] + ((1852, 12, 2), (1855, 1, 1), None, None, 'P39 Q1')])), 1)

    def test_same_office(self):
        self.assertFalse(R.same_office((1852, 12, 2), (1870, 9, 4), ((1848, 12, 20), (1852, 12, 2)), 2025))
        self.assertFalse(R.same_office((2019, 9, 30), (2019, 10, 1), ((2016, 7, 28), (2020, 5, 7)), 2025))
        self.assertTrue(R.same_office((1838, 8, 25), (1841, 11, 18), ((1839, 8, 25), (1841, 11, 18)), 2025))

    def test_title_change_chain_agrees(self):
        king = ((1774, 5, 10), (1791, 9, 4), None, None, 'P39 Q1')
        french = ((1791, 9, 4), (1792, 8, 10), None, None, 'P39 Q2')
        self.assertTrue(R.agrees((1774, 5, 10), (1792, 8, 10), king[:2], [king, french]))
        self.assertFalse(R.agrees((1774, 5, 10), (1792, 9, 21), king[:2], [king, french]))


class ReviewLayout(unittest.TestCase):
    def test_sections_and_summary(self):
        rv = Review(kind='Rulers', timeline='T', item='reigns', check_means='x')
        rv.rows.append(Row(name='A', coverage=0.5, years=(1500, 1600), extra={'Unchecked': 1},
                           items=[{'text': '- a', 'why': ['late']}, {'text': '- b', 'why': []}]))
        rv.empty = ['B']
        rv.ai_check = (0, 2)
        with tempfile.NamedTemporaryFile('r', suffix='.md') as f:
            self.assertEqual(rv.write(f.name), (2, 1))
            md = open(f.name).read()
        self.assertIn('2 reigns on 1 of 2 rows', md)
        self.assertIn('none of the 2 cited pages is AI-flagged', md)
        self.assertIn('| A | 2 | 50% | 1 | 1 |', md)
        self.assertIn('- a\n  - ⚠ late', md)
        self.assertIn('**Rows with nothing found (1):** B', md)


if __name__ == '__main__':
    unittest.main()
