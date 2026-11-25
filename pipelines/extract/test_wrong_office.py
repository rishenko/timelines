"""wrong_office.py signals on fixtures (not the dump). python3 -I pipelines/extract/test_wrong_office.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wrong_office as W  # noqa: E402


def span(start, end, text=''):
    return {'start': start, 'end': end, 'text': text or f'{start} – {end}'}


def sp(field, start, end, office):
    return (field, span(start, end), office)


class Signals(unittest.TestCase):
    def test_wang_jingwei_hits_a(self):
        # shipped: 1938 as party deputy leader; another span (the head office) starts 30 Mar 1940 where Wikidata's term does
        mine = span((1938, 4, 1), (1944, 11, 10))
        others = [sp('term_start1', (1940, 3, 30), (1944, 11, 10), 'President of the Executive Yuan')]
        terms = [((1940, 3, 30), (1944, 11, 10), None, None, 'P39 President of the Executive Yuan')]
        self.assertIn('A', W.signals(mine, 'Deputy Leader of the Kuomintang', others, terms))

    def test_kim_jong_il_hits_d(self):
        # shipped office is the National Defence Commission (a body); no head word
        mine = span((1993, 4, 9), (2011, 12, 17))
        terms = [((1993, 4, 9), (2011, 12, 17), None, None, 'P39 Chairman of the National Defence Commission'),
                 ((1994, 7, 8), (2011, 12, 17), None, None, 'P39 Supreme Leader of North Korea')]
        got = W.signals(mine, 'Chairman of the National Defence Commission', [], terms)
        self.assertEqual(list(got), ['D'])

    def test_keita_hits_c(self):
        # shipped start 17 Jan 1960 inside the Mali Federation span; Wikidata's Mali term starts 20 June 1960
        mine = span((1960, 1, 17), (1968, 11, 19))
        others = [sp('term_start2', (1959, 4, 1), (1960, 8, 20), 'President of Mali Federation')]
        terms = [((1960, 6, 20), (1968, 11, 19), None, None, 'P39 President of Mali')]
        self.assertIn('C', W.signals(mine, 'President of Mali', others, terms))

    def test_kalinin_hits_d(self):
        got = W.signals(span((1919, 3, 30), (1938, 7, 15)), 'Chairman of the Central Executive Committee of the All-Russian Congress of Soviets', [], [])
        self.assertEqual(list(got), ['D'])

    def test_a_head_word_clears_d(self):
        self.assertFalse(W.is_body('President of the Council of State of Cuba'))
        self.assertFalse(W.is_body('Chairman of the Presidium of the Supreme Soviet'))
        self.assertTrue(W.is_body('Chairman of the Presidium of the Central Executive Committee'))

    def test_same_office_second_term_does_not_hit(self):
        # Caldera: two terms of one office, both on Wikidata; the shipped second term matches its own P39 term
        mine = span((1994, 2, 2), (1999, 2, 2))
        others = [sp('term_start', (1969, 3, 11), (1974, 3, 12), 'President of Venezuela')]
        terms = [((1969, 3, 11), (1974, 3, 12), None, None, 'P39 President of Venezuela'),
                 ((1994, 2, 2), (1999, 2, 2), None, None, 'P39 President of Venezuela')]
        self.assertEqual(W.signals(mine, 'President of Venezuela', [x for x in others if x[2] != 'President of Venezuela'], terms), {})

    def test_gorbachev_presidency_hits_nothing_when_the_terms_agree(self):
        # the 1990 presidency is a distinct office with its own term that the shipped span matches
        mine = span((1990, 3, 15), (1991, 12, 25))
        others = [sp('term_start', (1985, 3, 11), (1991, 8, 24), 'General Secretary of the Communist Party of the Soviet Union')]
        terms = [((1990, 3, 15), (1991, 12, 25), None, None, 'P39 President of the Soviet Union'),
                 ((1985, 3, 11), (1991, 8, 24), None, None, 'P39 General Secretary of the Communist Party')]
        self.assertEqual(W.signals(mine, 'President of the Soviet Union', others, terms), {})

    def test_alexander_jagiellon_overlap_is_cleared_by_the_allowlist(self):
        # a Lithuanian reign overlapping the Polish one: signal C may fire on the overlap; the report marks it allowed by uuid, never by row
        mine = span((1501, 10, 12), (1506, 8, 19))
        others = [sp('term_start1', (1492, 6, 27), (1506, 8, 19), 'Grand Duke of Lithuania')]
        terms = [((1501, 12, 12), (1506, 8, 19), None, None, 'P39 King of Poland')]
        self.assertEqual(list(W.signals(mine, 'King of Poland', others, terms)), ['C'])


if __name__ == '__main__':
    unittest.main()
