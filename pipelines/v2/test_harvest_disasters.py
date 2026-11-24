"""Regression for the collapsed-template locator found in the conflicts review (python -m unittest from pipelines/v2 with the extract venv).
`{{snd}}` between two dates must stay a dash in the quote and locator, not vanish ("191411 November 1918")."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'common'), os.path.join(HERE, '..', 'extract'), os.path.join(HERE, 'harvest')]
sys.argv = sys.argv[:1]
import disasters  # noqa: E402


class CollapsedTemplates(unittest.TestCase):
    def test_snd_stays_a_dash(self):
        raw = '28 July 1914{{snd}}11 November 1918<br>({{Age in years, months and days|month1=7|day1=28|year1=1914}})'
        self.assertIn('28 July 1914 – 11 November 1918', disasters.plain(raw))

    def test_claims_read_both_ends(self):
        raw = '28 July 1914{{snd}}11 November 1918'
        text = disasters.norm(disasters.plain(raw))
        claims, why = disasters.date_claims(raw, 'infobox date', text, text)
        self.assertIsNone(why)
        self.assertEqual([(c['side'], c['year'], c['month'], c['day']) for c in claims], [('start', 1914, 7, 28), ('end', 1918, 11, 11)])
        self.assertIn('28 July 1914 – 11 November 1918', claims[0]['quote'])


if __name__ == '__main__':
    unittest.main()
