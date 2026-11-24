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

    def test_8_two_reigns_with_the_same_title_and_dates_are_one(self):  # the duplicates the Architect found on Wallachia
        for u in ('d1', 'd2'):
            F.OFFICES[u], F.FIELDS[u] = 'Prince of Bohemia', 'reign2'
        e1, e2 = [dict(ev(u, 1574, 'infobox reign2: 1574 – 1577'), title='Reign of A', end=1577) for u in ('d1', 'd2')]
        keep, review = [e1, e2], {'d1': rev('czechia', 'A'), 'd2': rev('czechia', 'A')}
        out = F.guards(keep, review, set(), DS)
        self.assertEqual([e['uuid'] for e in keep], ['d1'])
        self.assertEqual(out['duplicate of another reign on the row (same title and dates)'], 1)

    def test_9_west_and_east(self):  # Avitus (West) on the Eastern row; Leo II (East) on the undivided Roman row; Honorius (West) stays on it
        DS['tracks'] += [{'id': 'er', 'name': 'Eastern Roman Empire'}, {'id': 'rre', 'name': 'Roman Republic and Empire'}]
        F.TRACKS.update({t['id']: t for t in DS['tracks']})
        self.assertFalse(self.go('av', 'Roman emperor in the West', row='er', start=455, end=456)[0])
        self.assertFalse(self.go('l2', 'Roman emperor of the East', row='rre', start=473, end=474)[0])
        self.assertTrue(self.go('ho', 'Roman emperor of the West', row='rre', start=393, end=423)[0])

    def test_10_a_phase_that_does_not_overlap_lends_no_words(self):  # Menelik II on Eritrea: only "Eritrea in federation with Ethiopia" (1952-62) names Ethiopia
        DS['tracks'].append({'id': 'eri', 'name': 'Eritrea', 'phases': [{'name': 'Italian Eritrea', 'start': 1882, 'end': 1936},
                                                                         {'name': 'Eritrea in federation with Ethiopia', 'start': 1952, 'end': 1962}]})
        self.assertFalse(self.go('me', 'Emperor of Ethiopia', row='eri', start=1889, end=1913)[0])
        self.assertTrue(self.go('me2', 'Emperor of Ethiopia', row='eri', start=1955, end=1960)[0])

    def test_11_a_reign_longer_than_the_phase_the_office_names(self):  # Elizabeth II 1952-2022 on a Guyana row whose only realm phase is 1966-1970
        DS['tracks'].append({'id': 'guy', 'name': 'Guyana', 'phases': [{'name': 'Dominion of Guyana', 'start': 1966, 'end': 1970}]})
        self.assertFalse(self.go('el', 'Queen of Guyana', row='guy', start=1952, end=2022)[0])
        self.assertTrue(self.go('el2', 'Queen of Guyana', row='guy', start=1966, end=1970)[0])

    def test_8b_a_committed_reign_wins_whatever_its_position(self):  # a re-numbered uuid of a committed reign (Alexander II Mircea 1574) is a duplicate
        for u in ('new', 'old'):
            F.OFFICES[u], F.FIELDS[u] = 'Prince of Bohemia', 'reign'
        e1, e2 = [dict(ev(u, 1574, 'infobox reign: 1574 – 1577'), title='Reign of A', end=1577) for u in ('new', 'old')]
        keep, review = [e1, e2], {'new': rev('czechia', 'A'), 'old': rev('czechia', 'A')}  # the new one comes first
        F.guards(keep, review, {'old'}, DS)
        self.assertEqual([e['uuid'] for e in keep], ['old'])

    def test_8c_a_committed_uuid_reused_for_another_reign_is_renamed(self):  # Alexander II Mircea: committed '...-wallachia' is 1574; the new run's is his 1568 reign
        for u in ('x', 'x2'):
            F.OFFICES[u], F.FIELDS[u] = 'Prince of Bohemia', 'reign'
        new1568 = dict(ev('x', 1568, 'infobox reign: 1568 – 1574'), title='Reign of A', end=1574, tracks=['czechia'])
        dup1574 = dict(ev('x2', 1574, 'infobox reign2: 1574 – 1577'), title='Reign of A', end=1577, tracks=['czechia'])
        committed = {'x': dict(ev('x', 1574, 'infobox reign2: 1574 – 1577'), title='Reign of A', end=1577, tracks=['czechia'])}
        keep, review = [new1568, dup1574], {'x': rev('czechia', 'A'), 'x2': rev('czechia', 'A')}
        F.guards(keep, review, {'x'}, DS, committed)
        self.assertEqual([(e['uuid'], e['start']) for e in keep], [('x-1568', 1568), ('x', 1574)])  # the 1568 reign is added under a fresh id; the 1574 one is the committed reign, back under its own id

    def test_8d_leaving_a_reign_out_keeps_the_ids_of_the_others(self):  # Nauru: Kenas Aroi's 1968 seat is excluded; his 1989 term must not take the bare id
        for u in ('bare', 'later'):
            F.OFFICES[u], F.FIELDS[u] = 'President of Nauru', 'term_start1'
        e1989 = dict(ev('bare', 1989, 'infobox term_start1: 1989'), title='Presidency of A', end=1989, tracks=['czechia'])  # the first kept reign: the freeze numbers it bare
        committed = {'bare': dict(ev('bare', 1968, 'infobox term_start2: 1968'), title='Presidency of A', end=1991, tracks=['czechia']),
                     'bare-1989': dict(e1989, uuid='bare-1989')}
        keep, review = [e1989], {'bare': rev('czechia', 'A')}
        F.guards(keep, review, {'bare', 'bare-1989'}, DS, committed)
        self.assertEqual([e['uuid'] for e in keep], ['bare-1989'])
        self.assertIn('bare-1989', review)
        self.assertNotIn('bare', review)

    def test_8f_a_reviewed_reign_in_keep_passes_the_guards(self):  # Ladislaus the Posthumous: office "Duke of Austria" on the Croatia row
        F.OFFICES['k'], F.FIELDS['k'] = 'Duke of Austria', 'reign'
        e = dict(ev('k', 1440, 'infobox reign: 1440'), title='Reign of Ladislaus the Posthumous', end=1457, tracks=['czechia'])
        keep, review = [e], {'k': dict(rev('czechia', 'Ladislaus the Posthumous'))}
        F.KEEP.clear()
        F.KEEP.update({'czechia': {'Ladislaus the Posthumous@1440': 'x'}})
        try:
            F.guards(keep, review, set(), DS)
            self.assertEqual([x['uuid'] for x in keep], ['k'])
        finally:
            F.KEEP.clear()

    def test_12_head_of_government_and_junior_emperor_titles(self):  # Pol Pot as Prime Minister of Democratic Kampuchea; Constantius Chlorus as Caesar
        self.assertFalse(self.go('pm', 'Prime Minister of Democratic Kampuchea', row='czechia', field='term_start1')[0])
        self.assertFalse(self.go('cs', 'Caesar of the Western Roman Empire')[0])
        self.assertTrue(self.go('pk', 'Prime Minister and King of Bohemia')[0])  # a head word beside it: kept

    def test_13_a_pre_accession_regional_title(self):  # Manuel II 1382-87: "Byzantine emperor in Thessalonica" on the Eastern Roman row
        self.assertFalse(self.go('mn', 'Byzantine emperor in Thessalonica', row='czechia')[0])
        self.assertFalse(self.go('ds', 'Despot of the Morea', row='czechia')[0])
        DS['tracks'].append({'id': 'rome2', 'name': 'Roman Empire'})
        self.assertTrue(self.go('av2', 'Roman emperor in the West', row='rome2', start=455, end=456)[0])  # "in the West" is a half of the empire, kept (the direction guard handles the row)

    def test_13b_despot_is_a_head_of_state_where_the_row_is_a_despotate(self):  # Despot of Epirus on the Despotate of Epirus; Despot of Serbia on Serbia
        DS['tracks'] += [{'id': 'epirus', 'name': 'Despotate of Epirus'}, {'id': 'serbia', 'name': 'Serbia', 'phases': [{'name': 'Serbian Despotate'}]}]
        self.assertTrue(self.go('de', 'Despot of Epirus', row='epirus')[0])
        self.assertTrue(self.go('ds2', 'Despot of Serbia', row='serbia')[0])
        self.assertFalse(self.go('dm', 'Despot of the Morea', row='epirus')[0])  # another polity's despot: excluded
        self.assertFalse(self.go('et', 'Byzantine emperor in Thessalonica', row='epirus')[0])

    def test_a_span_that_joins_two_chronologies_is_held(self):  # Ajatashatru: "c. 492|460 BCE or c. 405|373 BCE" read as -459 to -372 (87 years)
        loc = 'infobox reign: c. 492|460 BCE or c. 405|373 BCE'
        e = dict(ev('aj', -459, loc), end=-372)
        keep, review = [e], {'aj': rev('magadha', 'Ajatashatru')}
        out = F.guards(keep, review, set(), DS)
        self.assertEqual(keep, [])
        self.assertEqual(out['span joins two chronologies (held)'], 1)
        ok = dict(ev('ok', -848, 'infobox reign: c. 853 – 849 BCE (co-regent) ; c. 849 – 842 BCE (sole reign)'), end=-841)  # a co-regency and the sole reign: 7 years
        keep = [ok]
        F.guards(keep, {'ok': rev('judah', 'Jehoram')}, set(), DS)
        self.assertEqual(len(keep), 1)
        self.assertFalse(F.merged_chronologies(dict(ev('c', 1181, 'infobox reign: 1181–1221'), end=1221), 'infobox reign: 1181–1221'))

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
