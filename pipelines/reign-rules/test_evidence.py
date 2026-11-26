"""python -I test_evidence.py (from pipelines/reign-rules): the evidence record on lead text copied from real pages (no dump, no ~/data). Each test names its page."""
import os
import sys
import unittest

sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
import evidence as EV  # noqa: E402

PAT = EV.load_patterns()


def reign(start, end):
    return {'event': {'start': start, 'end': end}}


def page(lead, cats=()):
    return lead + '\n\n' + '\n'.join(f'[[Category:{c}]]' for c in cats)


def feats(lead, start=1, end=2, cats=()):
    r = EV.lead_features(reign(start, end), page('{{Infobox}}\n' + lead), PAT)
    return {(f['feature'], f['value']): f for f in r}


class LeadFeatures(unittest.TestCase):
    def test_legendary_king_ancus_marcius(self):  # page: Ancus Marcius
        f = feats("'''Ancus Marcius''' was the legendary fourth king of Rome, who traditionally reigned for 24 years. He succeeded the third king, Tullus Hostilius, in 640 BC.", -639, -615)
        self.assertIn(('lead_status', 'legendary'), f)
        self.assertIn(('lead_accession', 'succession'), f)
        self.assertEqual(f[('status_scope', 'person')]['quote'][:12], 'Ancus Marciu')

    def test_consort_ariadne_empress(self):  # page: Aelia Ariadne
        f = feats("'''Aelia Ariadne''' was Eastern Roman empress as the wife of Zeno and Anastasius I. She was the daughter of Leo I.", 474, 475)
        self.assertIn(('lead_status', 'consort'), f)

    def test_wife_of_predecessor_is_not_consort_anastasius_i(self):  # page: Anastasius I Dicorus
        f = feats('A career civil servant, he came to the throne at the age of 61 after being chosen by Ariadne, the wife of his predecessor, Zeno.', 491, 518)
        self.assertNotIn(('lead_status', 'consort'), f)

    def test_vice_regent_is_not_regent_ashur_rim_nisheshu(self):  # page: Ashur-rim-nisheshu
        f = feats("'''Ashur-rim-nisheshu''' (died 1401 BC) was a ruler of Assyria, or išši’ak Aššur, “vice-regent of Aššur”, who ruled in the late 15th century.", -1408, -1400)
        self.assertNotIn(('lead_status', 'regent'), f)

    def test_status_scope_this_reign_when_the_sentence_names_the_years(self):  # page: Roberto Urdaneta Arbeláez
        f = feats("'''Roberto Urdaneta Arbeláez''' served as acting President of Colombia from 1951 to 1953. He was a lawyer.", 1951, 1953)
        self.assertEqual(f[('status_scope', 'this-reign')]['status'], 'acting')

    def test_quote_is_at_most_300_characters_and_found(self):
        long = 'x ' * 400 + 'was a claimant to the throne ' + 'y ' * 400 + '.'
        f = feats(long)
        self.assertLessEqual(len(f[('lead_status', 'claimant')]['quote']), EV.QUOTE_MAX)


class Categories(unittest.TestCase):
    def test_families_from_categories_suebi_kings(self):  # page: Hermeric
        text = page('x', ['Suebi', 'Kings of the Suebi', '5th-century monarchs in Europe', 'Pretenders to the Byzantine throne'])
        got = {f['value']: f['quote'] for f in EV.category_features(text, PAT)}
        self.assertEqual(set(got), {'monarchs', 'pretenders'})
        self.assertEqual(got['monarchs'], 'Category:Kings of the Suebi')


class Quotes(unittest.TestCase):
    def test_found_after_link_and_ref_markup(self):
        text = "He was [[King of Rome|the king]] of the city.<ref>x</ref> He ruled."
        self.assertTrue(EV.quote_found('He was the king of the city.', text))

    def test_missing_and_short_quotes_fail(self):
        self.assertFalse(EV.quote_found('He was the emperor of the East.', 'He was the king of the West.'))
        self.assertFalse(EV.quote_found('king', 'a king'))

    def test_infobox_line_found_only_for_a_whole_value(self):
        text = '{{Infobox\n| name = Yoritomo\n| title = [[Shōgun]]\n| reign = 1192–1199\n}}'
        self.assertEqual(EV.infobox_line(text, 'Shōgun'), '| title = [[Shōgun]]')
        self.assertIsNone(EV.infobox_line(text, 'Shōgun of Kamakura'))


if __name__ == '__main__':
    unittest.main()
