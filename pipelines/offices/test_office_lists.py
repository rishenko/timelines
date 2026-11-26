"""Tests for the list reader on synthetic tables (no dump): a vacancy row takes no name, and a name carries only to a re-appointment row."""
import os
import sys
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import office_lists as O  # noqa: E402

TABLE = '''{|
! No. !! Name !! Took office !! Left office
|-
| 1 || [[Alice Able]] || 1 January 1900 || 1 January 1901
|-
| None || 1 January 1901 || 1 January 1902
|-
| 2 || [[Bob Baker]] || 1 January 1902 || 1 January 1903
|-
| 1 January 1903 || 1 January 1904
|-
| — || 1 January 1904 || 1 January 1905
|-
| ? || 1 January 1905 || 1 January 1906
|}'''


def read(keep_nameless):
    with mock.patch.object(O.wp_dump, 'page', return_value={'title': 'List', 'text': TABLE, 'revision': 1, 'timestamp': 't'}), mock.patch.object(O.wp_dump, 'ai_flagged', return_value=False):
        return O.read('List', [0], keep_nameless, [])[1]


class Vacancy(unittest.TestCase):
    def test_a_vacancy_row_takes_no_name_and_makes_no_record(self):
        got = [(r['name'], r['start'], r['end']) for r in read(True)]
        self.assertEqual(got, [('Alice Able', '1900-01-01', '1901-01-01'), ('Bob Baker', '1902-01-01', '1903-01-01'), ('Bob Baker', '1903-01-01', '1904-01-01')])

    def test_without_the_carry_the_nameless_rows_make_nothing(self):
        self.assertEqual([r['name'] for r in read(False)], ['Alice Able', 'Bob Baker'])

    def test_the_vacancy_words(self):
        for w in ('None', 'Unknown', 'vacant', '(none)', '—', '–', '?', 'Vacancy', 'Interregnum'):
            self.assertTrue(O.VACANT.match(w), w)
        for w in ('Nonesuch Bey', 'Vacant Lot Person'):
            self.assertFalse(O.VACANT.match(w), w)


if __name__ == '__main__':
    unittest.main()
