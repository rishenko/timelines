"""wd_crosscheck helpers (python -I test_wd_crosscheck.py from pipelines/extract; no dump needed)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wd_crosscheck import ERAS, era, hist, iso, own_article, span_of, title_of, words  # noqa: E402


class Helpers(unittest.TestCase):
    def test_astronomical_to_historical_year(self):  # the files store 0 = 1 BC; Wikidata has no year 0
        self.assertEqual(hist(0), -1)
        self.assertEqual(hist(-43), -44)
        self.assertEqual(hist(1), 1)
        self.assertEqual(hist(1914), 1914)

    def test_era_edges(self):
        self.assertEqual(era(-501), ERAS[0])
        self.assertEqual(era(-500), ERAS[1])
        self.assertEqual(era(499), ERAS[1])
        self.assertEqual(era(500), ERAS[2])
        self.assertEqual(era(1499), ERAS[2])
        self.assertEqual(era(1500), ERAS[3])
        self.assertEqual(era(1800), ERAS[4])

    def test_title_of_url(self):
        self.assertEqual(title_of('https://en.wikipedia.org/wiki/Sultanate_of_Aceh'), 'Sultanate of Aceh')
        self.assertEqual(title_of('https://en.wikipedia.org/wiki/Ch%C3%A2tillon'), 'Châtillon')

    def test_own_article_needs_shared_words(self):
        self.assertTrue(own_article('Battle of Lahti', 'Battle of Lahti'))
        self.assertFalse(own_article('Otto I crowned emperor', 'Holy Roman Empire'))  # a polity's article is the host, not the event's own
        self.assertFalse(own_article('x', ''))
        self.assertEqual(words('Kingdom of the Franks (Merovingian)'), {'kingdom', 'franks'})

    def test_span_of_uses_historical_years_and_keeps_months(self):
        s = span_of({'start': 0, 'startMonth': 3, 'end': 10})
        self.assertEqual(s['start'], (-1, 3, None))
        self.assertEqual(s['end'], (10, None, None))
        self.assertIsNone(span_of({'start': 5})['end'])

    def test_iso_drops_missing_parts(self):
        self.assertEqual(iso((1914, 7, None)), '1914-7')
        self.assertIsNone(iso(None))


if __name__ == '__main__':
    unittest.main()
