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


BULGARIA = '''{|
! Name !! Took office !! Left office
|-
| rowspan="2"| \'\'\'[[Vasil Radoslavov]]\'\'\'<br />{{small|(1854–1929)}}
| {{smaller|4 July}}<br />1913
| {{smaller|23 December}}<br />1914
| rowspan="2"| {{ayd|1913|07|04|1918|06|08}}
|-
| {{smaller|{{OldStyleDateDY|5 January|1914|23 December 1913}}}}
| {{smaller|{{OldStyleDateNY|21 June|8 June}}}}<br />1918
|-
| [[Aleksandar Malinov]]
| 21 June 1918
| 28 November 1918
|}'''


class Rowspan(unittest.TestCase):
    def read(self, keep_nameless):
        with mock.patch.object(O.wp_dump, 'page', return_value={'title': 'List', 'text': BULGARIA, 'revision': 1, 'timestamp': 't'}), mock.patch.object(O.wp_dump, 'ai_flagged', return_value=False):
            return O.read('List', [0], keep_nameless, [])[1]

    def test_old_style_dates_read_as_the_new_style_date(self):
        self.assertEqual(O.clean('{{smaller|{{OldStyleDateDY|5 January|1914|23 December 1913}}}}'), '5 January 1914')
        self.assertEqual(O.clean('{{smaller|{{OldStyleDateNY|21 June|8 June}}}}<br />1918'), '21 June 1918')

    def test_a_rowspan_name_cell_covers_its_continuation_row_even_without_the_carry(self):
        for carry in (False, True):
            got = [(r['name'], r['start'], r['end']) for r in self.read(carry)]
            self.assertEqual(got, [('Vasil Radoslavov', '1913-07-04', '1914-12-23'), ('Vasil Radoslavov', '1914-01-05', '1918-06-21'), ('Aleksandar Malinov', '1918-06-21', '1918-11-28')], carry)


if __name__ == '__main__':
    unittest.main()
