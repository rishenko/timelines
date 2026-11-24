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
            'events': [{'uuid': 'buddhism-japan', 'tracks': ['kofun']}], 'sources': {}}


class Apply(unittest.TestCase):
    def test_medieval_gets_rows_events_in_range_places_and_sources(self):
        d = dataset('medieval', 650, 1500)
        counts = traditions.apply(d, 'medieval')
        self.assertEqual(counts['traditions'], 4)
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
        self.assertIn('rigveda', str(e.exception))

    def test_rerunning_changes_nothing(self):
        d = dataset('medieval', 650, 1500)
        traditions.apply(d, 'medieval')
        import json
        once = json.dumps(d, sort_keys=True)
        traditions.apply(d, 'medieval')
        self.assertEqual(json.dumps(d, sort_keys=True), once)


if __name__ == '__main__':
    unittest.main()
