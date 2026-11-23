"""The reign rule's "X rules …" guard (#87 follow-up): only a person ruling, as a span, is a reign.
    python3 -I pipelines/common/test_event_categories.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import event_categories as ec  # noqa: E402

DS = {'sources': {}, 'tracks': [{'id': 'egypt', 'name': 'Egypt'}, {'id': 'rome', 'name': 'Rome', 'phases': [{'name': 'Roman Empire'}]},
                               {'id': 'huns', 'name': 'Huns'}, {'id': 'oman', 'name': 'Oman'}]}


def cats(title, tracks, span=True):
    e = {'title': title, 'descr': '', 'tracks': tracks, 'sources': [], 'start': {'year': 100}, 'end': {'year': 120 if span else 100}}
    return [v for v, _ in ec.classify(e, DS)]


class ReignRule(unittest.TestCase):
    def test_a_person_ruling_is_a_reign(self):
        self.assertEqual(cats('Attila rules the Huns', ['huns'])[0], 'reign')
        self.assertEqual(cats('Herod the Great rules Judea', ['egypt'])[0], 'reign')

    def test_a_row_ruling_is_not_a_reign_even_on_another_row(self):
        self.assertNotIn('reign', cats('Rome rules Egypt', ['egypt']))
        self.assertNotIn('reign', cats('Egypt rules Nubia', ['egypt']))

    def test_a_polity_ruling_is_not_a_reign(self):
        self.assertNotIn('reign', cats('Nabhani dynasty rules Oman', ['oman']))
        self.assertNotIn('reign', cats('The Ottoman Empire rules Egypt', ['egypt']))
        for x in ('Duchy of Milan', 'Principality of Kyiv', 'Habsburg monarchy', 'Polish–Lithuanian Commonwealth', 'House of Habsburg'):
            self.assertFalse(ec.ruler_is_person(x, DS), x)

    def test_a_rows_phase_ruling_is_not_a_reign(self):
        self.assertNotIn('reign', cats('Roman Empire rules Egypt', ['egypt']))

    def test_reign_of_is_still_a_reign_and_a_point_is_not(self):
        self.assertEqual(cats('Reign of Ramesses II', ['egypt'])[0], 'reign')
        self.assertNotIn('reign', cats('Attila rules the Huns', ['huns'], span=False))

    def test_ruler_is_person(self):
        self.assertTrue(ec.ruler_is_person('Kashyapa I', DS))
        self.assertFalse(ec.ruler_is_person('rome', DS))
        self.assertFalse(ec.ruler_is_person('Gupta Empire', DS))


if __name__ == '__main__':
    unittest.main()
