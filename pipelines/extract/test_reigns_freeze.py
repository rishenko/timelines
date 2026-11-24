"""The two guards of reigns_freeze.guards (python -m unittest from pipelines/extract with the venv): chronology variants and wrong-row rulers."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reigns_freeze as F  # noqa: E402

DS = {'tracks': [{'id': 'czechia', 'name': 'Czechia (Bohemia)', 'phases': [{'name': 'Duchy of Bohemia'}, {'name': 'Kingdom of Bohemia'}]},
                 {'id': 'assyria', 'name': 'Assyria'}]}


def ev(uuid, start, loc, title='Reign of X'):
    return {'uuid': uuid, 'title': title, 'start': start, 'sources': [{'sourceKey': 'wp-x', 'sourceLocation': loc}]}


def rev(row, person, route='list: List of kings'):
    return {'row': row, 'person': person, 'route': route, 'toCheck': []}


class Guards(unittest.TestCase):
    def test_high_low_chronologies_are_one_reign_with_a_claim(self):  # Ashur-nadin-apli: 1206-1203 BC (high), 1196-1193 BC (low)
        loc = 'infobox reign: 4 regnal years ; 1206–1203 BC (high) ; 1196-1193 BC (low)'
        keep = [ev('a1', -1205, loc), ev('a2', -1195, loc)]
        review = {'a1': rev('assyria', 'Ashur-nadin-apli'), 'a2': rev('assyria', 'Ashur-nadin-apli')}
        out = F.guards(keep, review, set(), DS)
        self.assertEqual([e['uuid'] for e in keep], ['a1'])
        self.assertEqual([c['year'] for c in keep[0]['startDates']], [-1205, -1195])
        self.assertEqual(out['chronology variant (kept as a claim)'], 1)

    def test_two_real_reigns_are_not_chronologies(self):  # a second reign from a different field has no chronology label
        keep = [ev('b1', 1523, 'infobox reign: November 1523 – January 1524'), ev('b2', 1530, 'infobox reign2: 1530 – 1535')]
        review = {'b1': rev('czechia', 'P'), 'b2': rev('czechia', 'P')}
        F.guards(keep, review, set(), DS)
        self.assertEqual(len(keep), 2)

    def go(self, uuid, office, row='czechia', field='reign', person='P', start=900, end=910, route='list: x', ours=()):
        F.OFFICES[uuid], F.FIELDS[uuid] = office, field
        e = dict(ev(uuid, start, 'infobox reign: x'), end=end)
        keep, review = [e], {uuid: rev(row, person, route)}
        out = F.guards(keep, review, set(ours), DS)
        return bool(keep), out

    def test_1_consort(self):  # Cleopatra Selene: "Queen consort of Egypt" on the Seleucid row
        kept, out = self.go('c', 'Queen consort of Egypt', row='assyria')
        self.assertFalse(kept)
        self.assertEqual(out['consort (not a ruler)'], 1)

    def test_2_governor_is_not_a_head_of_state(self):  # the Tahirid governor of Baghdad on the Caliphate row
        kept, out = self.go('g', 'Governor of Baghdad', row='czechia')
        self.assertEqual((kept, out['office is not the head of state']), (False, 1))
        self.assertTrue(self.go('g2', 'Governor and Duke of Bohemia')[0])  # a head word beside it: kept

    def test_3_another_offices_term(self):  # Guerrero: "Commander-in-chief" in a term_start field; Raczyński: ambassador
        kept, out = self.go('t', 'Poland Ambassador to the United Kingdom', field='term_start3')
        self.assertFalse(kept)
        self.assertFalse(self.go('t2', 'Lieutenant of Bohemia', field='term_start')[0])  # no head word in a term field
        self.assertTrue(self.go('t3', 'President of Bohemia', field='term_start')[0])

    def test_4_the_offices_words_must_name_the_row(self):  # Victoria on a colony, Morazán on a member state, Christophe via Haiti
        for u, off in (('v', 'Queen of the United Kingdom'), ('m', '2nd President of Central America'), ('h', 'King of Croatia')):
            kept, out = self.go(u, off, route='polity: Colony of Bohemia')
            self.assertFalse(kept, off)
        self.assertTrue(self.go('w', 'Duke of Bohemia')[0])
        self.assertTrue(self.go('k', 'King of Bohemia and Hungary', route='polity: Kingdom of Bohemia')[0])

    def test_5_reign_mostly_outside_the_row(self):  # Francis II 1792-1835 on a row that ends in 1797
        DS['tracks'].append({'id': 'milan', 'name': 'Duchy of Milan', 'span': {'start': '1450 CE', 'end': '1797 CE'}})
        kept, out = self.go('f', 'Duke of Milan', row='milan', start=1792, end=1835)
        self.assertFalse(kept)
        self.assertTrue(self.go('f2', 'Duke of Milan', row='milan', start=1792, end=1797)[0])

    def test_6_empress_list_and_colonial_phases(self):  # Tzitzak (a list of empresses); Philip II on a row whose only link is a colonial phase
        DS['tracks'].append({'id': 'philippines', 'name': 'Philippines', 'phases': [{'name': 'Spanish East Indies'}, {'name': 'Fifth Republic'}]})
        kept, out = self.go('z', 'Empress of the Byzantine Empire', route='list: List of Roman and Byzantine empresses')
        self.assertFalse(kept)
        self.assertEqual(out['reached only through a list of empresses or consorts'], 1)
        kept, out = self.go('ph', 'King of Spain ; (as Philip II)', row='philippines', route='polity: Spanish East Indies')
        self.assertFalse(kept)  # "Spanish" is the colonial phase's word, not the row's
        self.assertTrue(self.go('ph2', 'President of the Philippines', row='philippines', route='polity: Fifth Republic')[0])

    def test_7_an_empty_office_is_read_from_the_persons_other_rows(self):  # Elizabeth II on Guyana: no office text on that row
        DS['tracks'].append({'id': 'guyana', 'name': 'Guyana', 'phases': [{'name': 'British Guiana'}, {'name': 'Co-operative Republic of Guyana'}]})
        F.PERSON_OFFICES['Q9439'] = {'Queen of the United Kingdom'}
        F.OFFICES['q'], F.FIELDS['q'] = '', 'reign'
        keep, review = [dict(ev('q', 1952, 'infobox reign'), end=2022)], {'q': dict(rev('guyana', 'Elizabeth II'), qid='Q9439')}
        F.guards(keep, review, set(), DS)
        self.assertEqual(keep, [])

    def test_5b_a_reign_inside_one_year_is_inside(self):  # Constantine Mavrocordatos, 15 Sep - 17 Oct 1730: length one year, not zero
        DS['tracks'].append({'id': 'wal', 'name': 'Wallachia', 'span': {'start': '1330 CE', 'end': '1859 CE'}})
        self.assertTrue(self.go('k', 'Prince of Wallachia', row='wal', start=1730, end=1730)[0])

    def test_an_existing_reign_is_never_touched(self):  # in the committed reigns.json
        self.assertTrue(self.go('x', 'Queen consort of Egypt', ours=('x',))[0])


if __name__ == '__main__':
    unittest.main()


class ExistingMatch(unittest.TestCase):
    def test_one_shared_name_is_not_the_same_ruler(self):  # Constantine's 1730 reign was dropped as "already on the timeline" by his father Nicholas's 1719-1730
        F.OWN.clear()
        ev = {'uuid': 'new', 'title': 'x', 'start': 1730, 'end': 1730, 'tracks': ['wallachia']}
        by_row = {'wallachia': [{'uuid': 'old', 'title': 'Reign of Nicholas Mavrocordatos', 'start': 1719, 'end': 1730, 'tracks': ['wallachia']}]}
        self.assertIsNone(F.existing_match(ev, 'Constantine Mavrocordatos', by_row))
        by_row['wallachia'].append({'uuid': 'same', 'title': 'Reign of Constantine Mavrocordatos', 'start': 1730, 'end': 1730, 'tracks': ['wallachia']})
        self.assertEqual(F.existing_match(ev, 'Constantine Mavrocordatos', by_row), 'same')
