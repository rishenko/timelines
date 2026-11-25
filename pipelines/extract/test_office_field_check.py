"""office_field_check.blocks (python -I test_office_field_check.py from pipelines/extract; no dump needed)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from office_field_check import blocks  # noqa: E402


def box(**kw):
    return {k.replace('__', ''): v for k, v in kw.items()}


class Blocks(unittest.TestCase):
    def test_adeang_parliament_seats_after_the_presidency(self):  # Kennan Adeang: order = President, then parliament4… seats
        p = {'order': 'President of Nauru', 'term_start': '1986', 'term_end': '1986', 'term_start2': '1996', 'term_end2': '1996',
             'parliament4': 'Nauruan', 'term_start4': '1971', 'term_end4': '1971', 'term_start5': '1973', 'term_end5': '1976',
             'predecessor7': 'Lagumot Harris', 'successor7': 'Constituency abolished', 'term_start7': '1980', 'term_end7': '1988',
             'office9': 'Speaker of the Parliament', 'term_start9': '1997', 'term_end9': '1998'}
        got = dict(blocks(p))
        self.assertIsNone(got[''])
        self.assertIsNone(got['2'])
        self.assertTrue(got['4'].startswith('seat'))
        self.assertEqual(got['5'], 'follows a seat block with no office of its own')
        self.assertTrue(got['7'].startswith('constituency'))
        self.assertIsNone(got['9'])  # names its own office: not flagged

    def test_position_established_is_not_a_seat(self):  # the first president's block says so
        self.assertEqual(dict(blocks({'office': 'President', 'term_start1': '1971', 'predecessor1': "''Position established''"})), {'1': None})

    def test_blank_office_field_is_weak(self):  # a second term of the same office is written like this too
        p = {'office': 'President', 'term_start': '1969', 'office2': '', 'term_start2': '1994'}
        self.assertEqual(dict(blocks(p))['2'], 'blank office field')

    def test_collapsed_infobox_text_in_a_field_is_ignored(self):
        p = {'office': 'President', 'term_start': '2003', 'successor': '[[X]]\n{{Collapsed infobox section|Constituency abolished}}'}
        self.assertIsNone(dict(blocks(p))[''])

    def test_a_party_or_association_office_is_flagged_even_with_its_own_office(self):  # George Simion: "President of the Alliance for the Union of Romanians"
        for office in ('President of the [[Alliance for the Union of Romanians]]', "President of the Ploughmen's Front", 'President of the Portuguese Bar Association',
                       '2nd President of the Lebanese Football Association'):
            got = dict(blocks({'office': office, 'term_start': '1 December 2019'}))['']
            self.assertTrue(got and got.startswith('party office'), office)

    def test_a_state_presidency_is_not_a_party_office(self):
        for office in ('President of Romania', '[[President of the United States]]', 'President of the Presidency of the Socialist Republic of Serbia', 'Leader of the Soviet Union'):
            self.assertIsNone(dict(blocks({'office': office, 'term_start': '1990'}))[''], office)

if __name__ == '__main__':
    unittest.main()
