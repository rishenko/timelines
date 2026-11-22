"""Date normaliser cases (python -m unittest from pipelines/extract). The ✗ cases failed in the design prototype."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dates import spans  # noqa: E402


def one(raw, **kw):
    s = spans(raw, **kw)
    assert len(s) == 1, (raw, s)
    return s[0]


class Ranges(unittest.TestCase):
    def test_full_range_with_snd(self):
        s = one('28 July 1914{{snd}}11 November 1918<br>({{Age in years, months and days|month1=7|day1=28|year1=1914}})')
        self.assertEqual((s['start'], s['end'], s['precision']), ((1914, 7, 28), (1918, 11, 11), 'day'))

    def test_us_order(self):
        s = one('May 24, 1915 – November 4, 1918')
        self.assertEqual((s['start'], s['end']), ((1915, 5, 24), (1918, 11, 4)))

    def test_day_range(self):  # ✗ in the prototype
        s = one('24–29 April 1916')
        self.assertEqual((s['start'], s['end']), ((1916, 4, 24), (1916, 4, 29)))

    def test_day_month_range(self):
        s = one('24 April – 1 May 1916')
        self.assertEqual((s['start'], s['end']), ((1916, 4, 24), (1916, 5, 1)))

    def test_us_day_range(self):
        s = one('Fort Donelson (February 11–16, 1862)')
        self.assertEqual((s['start'], s['end']), ((1862, 2, 11), (1862, 2, 16)))

    def test_month_range(self):  # ✗
        s = one('June–July 1848')
        self.assertEqual((s['start'], s['end'], s['precision']), ((1848, 6, None), (1848, 7, None), 'month'))

    def test_year_range_short(self):  # ✗
        s = one('1914–18')
        self.assertEqual((s['start'], s['end']), ((1914, None, None), (1918, None, None)))

    def test_year_range(self):
        self.assertEqual(one('1914–1918')['end'], (1918, None, None))

    def test_nbsp_dash(self):
        s = one('21 January 1919&nbsp;– 11 July 1921<br />({{Age in years, months, weeks and days|month1=01}})')
        self.assertEqual((s['start'], s['end']), ((1919, 1, 21), (1921, 7, 11)))


class LinksAndAlternatives(unittest.TestCase):
    def test_link_labels_and_alternative_end(self):
        s = one('[[July Crisis#Austria-Hungary declares war on Serbia (28 July)|28 July 1914]] &ndash; '
                '[[Armistice of 11 November 1918|11 November 1918]]/[[Armistice of Belgrade|13 November 1918]]')
        self.assertEqual((s['start'], s['end'], s['alts']), ((1914, 7, 28), (1918, 11, 11), [(1918, 11, 13)]))

    def test_or(self):
        s = one('1453 or 1454')
        self.assertEqual((s['start'], s['alts']), ((1453, None, None), [(1454, None, None)]))


class Templates(unittest.TestCase):
    def test_start_end_templates(self):
        s = one('{{Start date|1912}} to {{End date|1923}}')
        self.assertEqual((s['start'], s['end']), ((1912, None, None), (1923, None, None)))

    def test_start_date_full(self):
        self.assertEqual(one('{{start date|1914|7|28|df=y}}')['start'], (1914, 7, 28))

    def test_start_and_end_dates(self):
        s = one('{{Start and end dates|1848|3|13|1849|8|13}}')
        self.assertEqual((s['start'], s['end']), ((1848, 3, 13), (1849, 8, 13)))


class EraCircaOldStyle(unittest.TestCase):
    def test_bc(self):
        self.assertEqual(one('44 BC')['start'], (-44, None, None))

    def test_bc_range_left_inherits(self):
        s = one('44–42 BC')
        self.assertEqual((s['start'], s['end']), ((-44, None, None), (-42, None, None)))

    def test_ad(self):
        self.assertEqual(one('9 AD')['start'], (9, None, None))

    def test_circa(self):
        s = one('c. 1450')
        self.assertEqual((s['start'], s['circa']), ((1450, None, None), True))

    def test_circa_template(self):
        self.assertTrue(one('{{circa|1450}}')['circa'])

    def test_century_bc(self):
        s = one('3rd century BC')
        self.assertEqual((s['start'], s['end'], s['precision']), ((-300, None, None), (-201, None, None), 'century'))

    def test_old_style_flag_bracket_dropped(self):
        s = one('8 March [O.S. 23 February] 1917')
        self.assertTrue(s['old_style'])

    def test_old_style_template(self):
        s = one('{{OldStyleDate|8 March|1917|23 February}}')
        self.assertEqual((s['start'], s['old_style']), ((1917, 3, 8), True))


class Noise(unittest.TestCase):
    def test_refs_and_comments(self):
        s = one('12 January 1848<ref name="x">Smith 2001, p. 4</ref><!-- note 1999 --> – 4 October 1849')
        self.assertEqual((s['start'], s['end']), ((1848, 1, 12), (1849, 10, 4)))

    def test_small_bare_number_is_not_a_year(self):
        self.assertEqual(spans('42 killed'), [])

    def test_no_year(self):
        self.assertEqual(spans('from May to June the army waited'), [])

    def test_range_end_without_year(self):
        s = one('3 March 1918 until May')
        self.assertEqual((s['start'], s['end']), ((1918, 3, 3), None))

    def test_year_hint(self):
        self.assertEqual(one('476', year_hint=True)['start'], (476, None, None))


if __name__ == '__main__':
    unittest.main()
