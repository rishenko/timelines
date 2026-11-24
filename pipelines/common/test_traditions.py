"""traditions.apply on a tiny dataset (no dump): rows, events in range, place rows, shared events, sources and tags.
    python3 -I pipelines/common/test_traditions.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import traditions  # noqa: E402


def dataset(tid, start, end, after=True):
    return {'meta': {'id': tid, 'range': {'start': start, 'end': end}, 'facets': {'geography': {'values': {'japan': {}, 'south-asia': {}}}},
                     'continues': [{'side': 'after'}] if after else []},
            'tracks': [{'id': 'japan', 'name': 'Japan'}, {'id': 'kofun', 'name': 'Kofun'}],
            # every event the list shares with this timeline, as a stand-in
            'events': [{'uuid': x['uuid'], 'tracks': ['kofun']} for t in traditions.load()['traditions'] for x in t['shared'] if x['timeline'] == tid],
            'sources': {}}


class Apply(unittest.TestCase):
    def test_medieval_gets_rows_events_in_range_places_and_sources(self):
        d = dataset('medieval', 650, 1500)
        counts = traditions.apply(d, 'medieval')
        self.assertEqual(counts['traditions'], 8)  # all but Egypt (ended by 540) and Cao Đài (1926)
        ids = [t['id'] for t in d['tracks']]
        self.assertEqual(ids[:3], ['japan', 'kofun', 'religions-traditions'])
        ev = {e['uuid']: e for e in d['events']}
        self.assertEqual(ev['kojiki']['tracks'], ['shinto', 'japan'])           # its place row, which exists here
        self.assertNotIn('state-shinto', ev)                                     # 1868: Modern States
        self.assertTrue(all(e['start'] >= 650 for e in d['events'] if 'start' in e))
        shinto = next(t for t in d['tracks'] if t['id'] == 'shinto')
        self.assertEqual(shinto['memberships'][0]['value'], 'japan')
        self.assertIn('scholarly', d['tags'])
        self.assertEqual(d['sources']['kokugakuin-classical-institutions']['tags'], ['scholarly'])

    def test_a_place_row_the_timeline_lacks_is_skipped(self):
        d = dataset('medieval', 650, 1500)
        traditions.apply(d, 'medieval')
        oyo = next(e for e in d['events'] if e['uuid'] == 'ifa-reaches-oyo')
        self.assertEqual(oyo['tracks'], ['yoruba-religion'])

    def test_a_missing_shared_event_names_itself(self):
        d = dataset('ancient-classical', -10049, 650)
        d['events'] = []
        with self.assertRaises(SystemExit) as e:
            traditions.apply(d, 'ancient-classical')
        self.assertIn('shares event', str(e.exception))

    def test_an_ended_tradition_has_an_end_and_leaves_later_timelines(self):
        d = dataset('medieval', 650, 1500)
        traditions.apply(d, 'medieval')
        rows = {t['id']: t for t in d['tracks']}
        self.assertNotIn('ancient-egyptian-religion', rows)          # last claim 540: before 650
        greek = rows['ancient-greek-religion']['span']              # ends 393, but the Maniots claim reaches 900
        self.assertEqual(greek['end'], 393)
        self.assertNotIn('ongoing', greek)
        self.assertTrue(greek['endDates'])
        self.assertTrue(rows['tengrism']['span']['ongoing'])

    def test_a_timeline_keeps_its_own_entry_for_an_article(self):
        d = dataset('modern-states', 1500, 2026, after=False)
        d['sources']['wp-fall-of-tenochtitlan'] = {'name': 'Fall of Tenochtitlan (Wikipedia)', 'url': 'https://en.wikipedia.org/wiki/Fall_of_Tenochtitlan', 'accessed': '2026-11-21', 'tags': ['wikipedia']}
        traditions.apply(d, 'modern-states')
        self.assertEqual(d['sources']['wp-fall-of-tenochtitlan']['accessed'], '2026-11-21')

    def test_pinned_categories_name_real_events_with_valid_values(self):
        import event_categories as ec
        pins = traditions.category_pins()
        uuids = {e['uuid'] for t in traditions.load()['traditions'] for e in t['events']}
        self.assertTrue(pins)
        self.assertLessEqual(set(pins), uuids)
        for k, v in pins.items():
            ec.check(v, k)

    def test_rerunning_changes_nothing(self):
        d = dataset('medieval', 650, 1500)
        traditions.apply(d, 'medieval')
        import json
        once = json.dumps(d, sort_keys=True)
        traditions.apply(d, 'medieval')
        self.assertEqual(json.dumps(d, sort_keys=True), once)


if __name__ == '__main__':
    unittest.main()
