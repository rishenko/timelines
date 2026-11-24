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


class SndsAndStrayRefs(unittest.TestCase):
    RAW = ('April 19, 1775{{snds}}September 3, 1783{{Efn|A cease-fire was proclaimed by Congress<ref>{{cite web|url=http://x|title=Y}}</ref> '
           'on April 11, 1783.}}<br />({{Age in years, months and days|1775|04|19|1783|09|03}})')

    def test_snds_is_a_dash_and_no_ref_tag_is_left(self):  # American Revolutionary War: the end date was lost and "</ref>" stayed in the quote
        q = disasters.plain(self.RAW)
        self.assertIn('April 19, 1775 – September 3, 1783', q)
        self.assertNotIn('ref>', q)

    def test_claims_have_both_ends(self):
        text = disasters.norm(disasters.plain(self.RAW))
        claims, why = disasters.date_claims(self.RAW, 'infobox date', text, text)
        self.assertIsNone(why)
        got = {(c['side'], c['year'], c.get('month'), c.get('day')) for c in claims}
        self.assertEqual(got, {('start', 1775, 4, 19), ('end', 1783, 9, 3)})
        self.assertTrue(all('ref>' not in c['quote'] for c in claims))


class YearLists(unittest.TestCase):
    def test_a_list_of_years_runs_from_the_first_start_to_the_last_end(self):  # Goryeo–Khitan War: "993, 1010, 1018–1019"
        raw = '993, 1010, 1018–1019'
        text = disasters.norm(disasters.plain(raw))
        claims, why = disasters.date_claims(raw, 'infobox date', text, text)
        self.assertIsNone(why)
        got = {(c['side'], c['year']) for c in claims}
        self.assertEqual(got, {('start', 993), ('end', 1019)})

    def test_a_single_span_is_unchanged(self):
        raw = '1018–1019'
        text = disasters.norm(disasters.plain(raw))
        claims, _ = disasters.date_claims(raw, 'infobox date', text, text)
        self.assertEqual({(c['side'], c['year']) for c in claims}, {('start', 1018), ('end', 1019)})


if __name__ == '__main__':
    unittest.main()
