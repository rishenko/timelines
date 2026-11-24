"""science.apply on a tiny dataset (no dump), and the list's own invariants.
    python3 -I pipelines/common/test_science.py"""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import science  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
L = science.load()


def dataset(tid, start, end, rows, after=True):
    return {'meta': {'id': tid, 'range': {'start': start, 'end': end}, 'continues': [{'side': 'after'}] if after else []},
            'tracks': [{'id': r, 'name': r} for r in rows], 'events': [], 'sources': {}}


MEDIEVAL_ROWS = ['caliphate', 'fatimid-caliphate', 'timurid-empire', 'south-asia', 'china', 'chichen-itza', 'hre', 'maghreb', 'mesoamerica']


class Apply(unittest.TestCase):
    def test_medieval_gets_its_nine_events_on_their_rows_with_sources(self):
        d = dataset('medieval', 650, 1500, MEDIEVAL_ROWS)
        self.assertEqual(science.apply(d, 'medieval'), {'events': 9})
        ev = {e['uuid']: e for e in d['events']}
        self.assertEqual(ev['bi-sheng-movable-type']['tracks'], ['china'])
        self.assertEqual(ev['al-khwarizmi-al-jabr']['start'], 820)
        self.assertTrue(all(650 <= e['start'] < 1500 for e in d['events']))
        # every source key an event cites exists, as a Wikipedia source
        keys = {s['sourceKey'] for e in d['events'] for s in e['sources']} | {c['source']['sourceKey'] for e in d['events'] for c in e.get('startDates', [])}
        self.assertTrue(keys <= set(d['sources']))
        self.assertTrue(all(d['sources'][k]['tags'] == ['wikipedia'] for k in keys))

    def test_the_last_timeline_takes_its_end_year_and_bce_is_stored_without_a_year_zero(self):
        d = dataset('ancient-classical', -10049, 650, ['mesoamerica', 'pharaonic-egypt', 'babylonia', 'ptolemaic-roman-egypt', 'steppe-south-asia', 'han', 'nok', 'austronesia'], after=True)
        science.apply(d, 'ancient-classical')
        ev = {e['uuid']: e for e in d['events']}
        self.assertEqual(ev['earliest-long-count']['start'], -35)          # 36 BCE
        self.assertNotIn('copernicus-de-revolutionibus', ev)               # 1543: Modern States

    def test_the_headline_gets_its_own_claim_unless_a_claim_gives_that_year(self):
        d = dataset('medieval', 650, 1500, MEDIEVAL_ROWS)
        science.apply(d, 'medieval')
        ev = {e['uuid']: e for e in d['events']}
        gut = ev['gutenberg-printing-press']['startDates']                    # headline 1450, claim 1440
        self.assertEqual([c['year'] for c in gut], [1450, 1440])
        bi = ev['bi-sheng-movable-type']['startDates']                        # the claim already gives 1044
        self.assertEqual(len(bi), 1)
        self.assertNotIn('startDates', ev['al-khwarizmi-al-jabr'])

    def test_a_missing_row_names_the_event(self):
        d = dataset('medieval', 650, 1500, ['china'])
        with self.assertRaises(SystemExit) as e:
            science.apply(d, 'medieval')
        self.assertIn('al-khwarizmi-al-jabr', str(e.exception))

    def test_rerunning_changes_nothing(self):
        d = dataset('medieval', 650, 1500, MEDIEVAL_ROWS)
        science.apply(d, 'medieval')
        once = json.dumps(d, sort_keys=True)
        science.apply(d, 'medieval')
        self.assertEqual(json.dumps(d, sort_keys=True), once)


class List(unittest.TestCase):
    def test_every_event_is_sourced_and_in_the_science_kind(self):
        seen = set()
        for e in L['events']:
            self.assertNotIn(e['uuid'], seen, e['uuid'])
            seen.add(e['uuid'])
            self.assertIn(e['kind'], ('discovery', 'invention', 'work'), e['uuid'])
            self.assertTrue(e['tracks'] and e['source']['quote'] and e['descr'], e['uuid'])
            for q in [e['source']] + e.get('more', []) + e.get('claims', []):
                self.assertIn(q['article'], L['sources'], e['uuid'])

    def test_each_timelines_overrides_hold_the_kind_of_its_events(self):
        folder = {'ancient-classical': 'ancient', 'medieval': 'medieval', 'modern-states': 'modern-states'}
        for e in L['events']:
            tl = 'ancient-classical' if e['start'] < 650 else 'medieval' if e['start'] < 1500 else 'modern-states'
            ov = json.load(open(os.path.join(REPO, 'pipelines', folder[tl], 'categories.json')))
            self.assertEqual(ov.get(e['uuid']), [e['kind']], f'{e["uuid"]} in {tl}')

    def test_there_are_33_events_and_none_is_the_east_baray(self):
        self.assertEqual(len(L['events']), 33)
        self.assertNotIn('east-baray', {e['uuid'] for e in L['events']})


if __name__ == '__main__':
    unittest.main()
