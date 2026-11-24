"""The classifier's rules, on inline fixtures (no dump): the reign rule's "X rules …" guard (#87 follow-up); natural
disasters and the man-made-famine rule (Kevin, 2026-11-23).
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

    def test_an_interregnum_span_is_its_own_sub_kind_and_a_point_is_not(self):
        self.assertEqual(cats('Ottoman Interregnum', ['egypt'])[0], 'interregnum')
        self.assertEqual(cats('The Time of Troubles', ['egypt'])[0], 'interregnum')
        self.assertNotIn('interregnum', cats('Interregnum ends', ['egypt'], span=False))
        # a war of succession stays a war
        self.assertNotIn('interregnum', cats('War of the Spanish Succession', ['egypt']))

    def test_ruler_is_person(self):
        self.assertTrue(ec.ruler_is_person('Kashyapa I', DS))
        self.assertFalse(ec.ruler_is_person('rome', DS))
        self.assertFalse(ec.ruler_is_person('Gupta Empire', DS))


class Disasters(unittest.TestCase):
    """Disasters › cause › type (Kevin, 2026-11-23; names after the IRDR/EM-DAT classification)."""
    def test_three_levels(self):
        self.assertEqual(ec.ancestors('eruption'), ['natural', 'disaster'])
        self.assertEqual(ec.ancestors('famine'), ['human-caused', 'disaster'])
        self.assertEqual(ec.top('nuclear-test'), 'disaster')
        self.assertNotIn('disaster', ec.VOCAB['place'][1])

    def test_each_natural_type_from_the_title(self):
        self.assertEqual(cats('Thera (Minoan) eruption', ['egypt'])[0], 'eruption')
        self.assertEqual(cats('Xitle erupts: Cuicuilco is buried', ['egypt'])[0], 'eruption')
        self.assertEqual(cats('Indian Ocean tsunami', ['egypt'])[0], 'earthquake')
        self.assertEqual(cats('Lisbon earthquake', ['egypt'])[0], 'earthquake')
        self.assertEqual(cats('Doggerland floods: Britain is cut off', ['egypt'])[0], 'flood')
        self.assertEqual(cats('Great Bhola cyclone', ['egypt'])[0], 'storm')
        self.assertEqual(cats('Severe drought coincides with the collapse', ['egypt'])[0], 'drought')
        self.assertEqual(cats('The Plague of Justinian', ['egypt'])[0], 'epidemic')

    def test_human_caused_types(self):
        self.assertEqual(cats('Beirut port explosion', ['egypt'])[0], 'accident')
        self.assertEqual(cats('Great Fire of London', ['egypt'])[0], 'urban-fire')
        self.assertEqual(cats('US nuclear tests in the Marshall Islands', ['egypt'])[0], 'nuclear-test')
        self.assertEqual(cats('Bhopal industrial disaster', ['egypt'])[0], 'industrial')
        self.assertEqual(cats('Chernobyl disaster', ['egypt'])[0], 'disaster')  # the kind alone; its article says more

    def test_the_extension_types(self):
        for title, want in [('Huascarán avalanche', 'mass-movement'), ('2003 European heat wave', 'extreme-temperature'),
                            ('Black Saturday bushfires', 'wildfire'), ('Tunguska event', 'impact'), ('Carrington Event', 'impact'),
                            ('Rocky Mountain locust swarm', 'infestation'), ('Sinking of the Titanic', 'transport'),
                            ('Tenerife airport plane crash', 'transport'), ('Banqiao dam failure', 'collapse'),
                            ('Great Fire of Rome', 'urban-fire'), ('Exxon Valdez oil spill', 'spill'), ('Great Smog of London', 'spill'),
                            ('Mina stampede', 'crowd-crush'), ('Lake Nyos limnic eruption', 'eruption')]:
            self.assertEqual(cats(title, ['egypt'])[0], want, title)
            self.assertEqual(ec.top(want), 'disaster')

    def test_a_cascade_keeps_the_trigger_first(self):
        self.assertEqual(cats('Typhoon Nina and the Banqiao dam failure', ['egypt']), ['storm', 'collapse'])
        self.assertEqual(cats('Lisbon earthquake and tsunami', ['egypt']), ['earthquake'])  # one type: tsunamis are in it

    def test_a_named_slide_is_a_mass_movement_and_triggers_first(self):
        self.assertEqual(cats('The Storegga Slide tsunami', ['egypt']), ['mass-movement', 'earthquake'])
        self.assertNotIn('mass-movement', cats('Economy begins a slide into recession', ['egypt']))

    def test_a_war_made_disaster_puts_the_conflict_first(self):
        self.assertEqual([ec.top(v) for v in cats('Flood caused by the war dike breach', ['egypt'])], ['conflict', 'disaster'])

    def test_an_explosion_in_population_is_not_a_disaster(self):
        e = {'title': 'Peaches reach Japan', 'descr': 'A period that saw an explosion in population.', 'tracks': ['egypt'], 'sources': [], 'start': 0}
        self.assertNotIn('disaster', [ec.top(v) for v, _ in ec.classify(e, DS)])

    def test_a_building_destroyed_by_earthquakes_is_not_an_earthquake(self):
        self.assertIsNone(ec.first_match(ec.CATEGORY, 'Buildings and structures destroyed by earthquakes'))
        self.assertEqual(ec.first_match(ec.CATEGORY, '1755 earthquakes')[0], 'earthquake')

    def test_the_mapping_table_matches_the_vocabulary(self):
        import json
        table = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'disaster_classes.json')))
        values = {'disaster', *ec.VOCAB['disaster'][1], *ec.DISASTER_TYPES}
        self.assertEqual({k for k in table if not k.startswith('_')}, values)
        for k in values:
            self.assertEqual(table[k]['name'], ec.facet()['values'][k]['name'], k)
            self.assertTrue(all(q.startswith('Q') for q in table[k]['wikidata']), k)

    def test_a_value_beside_one_it_is_part_of_is_refused(self):
        with self.assertRaises(ValueError):
            ec.check(['eruption', 'natural'], 'test')
        ec.check(['famine', 'atrocity'], 'test')


class FoundationalText(unittest.TestCase):
    """A foundational text as itself (Kevin, 2026-11-23), by type: scripture, law code, charter, epic or classic."""
    def test_a_named_text_gets_its_type(self):
        for title, v in [('Code of Hammurabi', 'law-code'), ("Dušan's Code", 'law-code'), ('Magna Carta', 'charter'),
                         ('Golden Bull of 1356', 'charter'), ('The Analects compiled', 'classic'), ('Rigveda composed', 'scripture'),
                         ('Epic of Gilgamesh written down', 'classic'), ('Rosetta Stone carved', 'text')]:
            self.assertEqual(cats(title, ['egypt'])[0], v, title)

    def test_it_beats_laws_and_religion_in_its_own_kind(self):
        self.assertNotIn('law', cats('Code of Hammurabi', ['egypt']))

    def test_a_declaration_of_independence_keeps_its_statehood_main(self):
        self.assertEqual(cats('Chilean Declaration of Independence', ['egypt']), ['independence', 'charter'])

    def test_a_plain_treaty_stays_a_treaty(self):
        self.assertEqual(cats('Treaty of Paris', ['egypt']), ['treaty'])

    def test_a_dress_code_is_not_a_law_code(self):
        for title in ['Dress code adopted', 'Access code', 'Hays Code adopted']:
            self.assertNotIn('law-code', cats(title, ['egypt']), title)
        self.assertEqual(cats('Russkaya Pravda', ['egypt'])[0], 'law-code')

    def test_a_type_is_never_beside_foundational_text(self):
        with self.assertRaises(ValueError):
            ec.check(['charter', 'text'], 'test')

    def test_only_text_infoboxes_count(self):
        self.assertEqual(ec.first_match(ec.INFOBOX, 'religious text')[0], 'scripture')
        self.assertEqual(ec.first_match(ec.INFOBOX, 'poem')[0], 'text')
        self.assertEqual(ec.first_match(ec.INFOBOX, 'book')[0], 'text')
        self.assertEqual(ec.first_match(ec.INFOBOX, 'document')[0], 'law')
        self.assertIsNone(ec.first_match(ec.INFOBOX, 'manuscript'))

    def test_the_register_is_not_evidence(self):
        self.assertIsNone(ec.first_match(ec.CATEGORY, 'Memory of the World Register'))
        self.assertEqual(ec.first_match(ec.CATEGORY, 'Medieval legal codes')[0], 'law-code')
        self.assertEqual(ec.first_match(ec.CATEGORY, 'Political charters')[0], 'charter')

    def test_the_mapping_table_matches_the_types(self):
        import json
        table = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'text_classes.json')))
        self.assertEqual(table['text']['name'], ec.facet()['values']['text']['name'])
        self.assertEqual(set(table['types']), set(ec.TEXT_TYPES))
        for k, f in table['types'].items():
            self.assertEqual(f['name'], ec.facet()['values'][k]['name'], k)
            self.assertTrue(f['wikidata'] and all(q.startswith('Q') for q in f['wikidata']), k)

    def test_known_negatives_on_title_evidence(self):
        import known_negatives
        self.assertEqual(known_negatives.failures(None), [])


class Traditions(unittest.TestCase):
    """Religions with no single founder (traditions pilot): Shinto, shrines, Ifá, principles of faith."""
    def test_their_words_are_religion(self):
        for title in ['Shinto transformed under the Ritsuryō system', 'Yamato shrine ritual spreads across Japan', 'Ifá reaches Oyo', "Maimonides' thirteen principles of faith"]:
            self.assertEqual(cats(title, ['egypt'])[0], 'religion', title)

    def test_ifat_is_not_ifa(self):
        self.assertNotIn('religion', cats('Sultanate of Ifat founded', ['egypt']))


class Famines(unittest.TestCase):
    """A famine caused mainly by policy or war is not a natural disaster (Kevin, 2026-11-23)."""
    def test_a_genocide_famine_is_human_caused_with_genocide_second(self):
        self.assertEqual(cats('Holodomor famine', ['egypt']), ['famine', 'atrocity'])

    def test_a_policy_or_war_famine_is_human_caused(self):
        self.assertEqual(cats('Famine of the Great Leap Forward', ['egypt'])[0], 'famine')
        # a war-made famine: the conflict first, the famine second (both rules agree)
        self.assertEqual(cats('Famine during the siege of Leningrad', ['egypt']), ['siege', 'famine'])

    def test_any_other_famine_is_natural_drought_or_crop_failure(self):
        self.assertEqual(cats('Great Famine of 1315', ['egypt'])[0], 'drought')


if __name__ == '__main__':
    unittest.main()
