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

    def test_list_route_office_must_name_the_row(self):  # Tomislav of Croatia on Czechia through a list page; Wenceslaus stays
        F.OFFICES.update({'t': 'King of Croatia', 'w': 'Duke of Bohemia'})
        keep = [ev('t', 925, 'infobox reign: c. 925–928'), ev('w', 921, 'infobox reign: 921 – 935')]
        review = {'t': rev('czechia', 'Tomislav, King of Croatia'), 'w': rev('czechia', 'Wenceslaus I, Duke of Bohemia')}
        out = F.guards(keep, review, set(), DS)
        self.assertEqual([e['uuid'] for e in keep], ['w'])
        self.assertEqual(out['office names another polity (list route only)'], 1)

    def test_a_polity_route_is_kept_and_an_existing_reign_is_never_touched(self):
        F.OFFICES.update({'p': 'King of Croatia', 'o': 'King of Croatia'})
        keep = [ev('p', 925, 'x'), ev('o', 930, 'x')]
        review = {'p': rev('czechia', 'P', 'polity: Kingdom of Bohemia'), 'o': rev('czechia', 'O')}
        F.guards(keep, review, {'o'}, DS)  # 'o' is in the committed reigns.json
        self.assertEqual(len(keep), 2)


if __name__ == '__main__':
    unittest.main()
