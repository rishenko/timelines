"""Tests for the offices stage, on the committed files only (no dump needed): the emitted events are consistent, every hand ruling still names the
record it was made for, the guard figures in the emitted file are the expected ones, and the rows' phase windows are the timeline's."""
import hashlib
import json
import os
import pathlib
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
EMITTED = os.path.join(ROOT, 'pipelines', 'offices', 'emitted', 'offices-modern-states.json')


def load(*p):
    with open(os.path.join(ROOT, *p), encoding='utf-8') as f:
        return json.load(f)


class Offices(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = load('pipelines', 'offices', 'emitted', 'offices-modern-states.json')
        cls.spec = load('pipelines', 'offices', 'offices-rows.json')
        cls.expected = load('pipelines', 'offices', 'offices-expected.json')['rows']
        cls.rulings = load('pipelines', 'offices', 'hand-rulings.json')
        cls.rows = {r['track']: r for r in cls.spec['rows']}

    def test_uuids_unique_and_not_retired_or_committed(self):
        u = [e['uuid'] for e in self.out['events']]
        self.assertEqual(len(u), len(set(u)))
        retired = set(load('pipelines', 'modern-states', 'redirects.json')['redirects'])
        committed = {e['uuid'] for f in ('reigns.json', 'extra-reigns.json') for e in load('pipelines', 'modern-states', f)['events']}
        self.assertEqual(set(u) & (retired | committed), set())

    def test_every_event_is_a_cited_reign_with_one_kind(self):
        for e in self.out['events']:
            self.assertIn(e['tracks'][0], self.rows)
            self.assertTrue(e['uuid'].startswith('reign-'))
            kinds = [m for m in e['memberships'] if m['facet'] == 'ruler-kind']
            self.assertEqual([m['value'] for m in kinds], [self.rows[e['tracks'][0]]['kind']])
            for s in e['sources'] + [x for m in e['memberships'] for x in m['sources']]:
                self.assertIn(s['sourceKey'], self.out['sources'])
            self.assertIn(e['uuid'], self.out['review'])

    def test_events_lie_inside_the_rows_phases_and_the_timeline(self):
        for e in self.out['events']:
            r = self.rows[e['tracks'][0]]
            self.assertGreaterEqual(e['start'], self.spec['from'])
            end = 10 ** 6 if e.get('ongoing') else e['end']
            self.assertLessEqual(e['start'], end)
            if r['phases']:
                self.assertTrue(any(a <= e['start'] and end <= (b if b is not None else 10 ** 6) for a, b in r['phases']) or self.in_union(r['phases'], e['start'], end), e['uuid'])

    @staticmethod
    def in_union(phases, y0, y1):
        w = []
        for s, t in sorted((p[0], p[1] if p[1] is not None else 10 ** 6) for p in phases):
            if w and s <= w[-1][1]: w[-1][1] = max(w[-1][1], t)
            else: w.append([s, t])
        return any(a <= y0 and y1 <= b for a, b in w)

    def test_row_phases_are_the_timelines(self):
        tl = {t['id']: [[p['start'], p.get('end')] for p in t.get('phases', [])] for t in load('data-src', self.spec['timeline'] + '.json')['tracks']}
        for r in self.spec['rows']:
            self.assertEqual(r['phases'], tl[r['track']], r['id'])

    def test_each_ruling_names_a_record_the_output_holds(self):
        keys = {v['key']: v for v in self.out['review'].values()}
        held = {h['key']: h for h in self.out['held']}
        for r in self.rulings:
            self.assertIn(r['uuid_key'], set(keys) | set(held), r['uuid_key'])
            self.assertTrue(r.get('expect') and r['expect'].get('name'), r['uuid_key'])
            if r['type'] == 'exclude':
                self.assertIn(r['uuid_key'], held)
                self.assertTrue(held[r['uuid_key']]['reason'].startswith(r['decision']))
            if r['type'] == 'qid-from-sitelink' and r['decision'] == 'accept':
                self.assertEqual(next(v['qid'] for v in keys.values() if v['key'] == r['uuid_key']), r['qid'])
            if r['type'] == 'qid-from-sitelink' and r['decision'] != 'accept':
                self.assertIsNone(keys[r['uuid_key']]['qid'])

    def test_guards_equal_the_expected_figures_and_every_difference_is_explained(self):
        for rid, got in self.out['guards'].items():
            want = self.expected[rid]
            for k, v in got.items():
                if k in ('list_only', 'wikidata_only'):
                    self.assertEqual(sorted(want[k]), v, f'{rid} {k}')
                    for q in v:
                        self.assertTrue(want[k][q].strip(), f'{rid} {q} has no reason')
                else:
                    self.assertEqual(want.get(k), v, f'{rid} {k}')
            self.assertEqual(got['page_rows_unexplained'], 0)

    def test_counts_add_up(self):
        held = {}
        for h in self.out['held']: held[h['row']] = held.get(h['row'], 0) + 1
        per = {}
        for v in self.out['review'].values(): per[v['key'].split('/')[0]] = per.get(v['key'].split('/')[0], 0) + 1
        for rid, g in self.out['guards'].items():
            self.assertEqual(per.get(rid, 0) + held.get(rid, 0), g['records'], rid)
            self.assertEqual(held.get(rid, 0), g['held'], rid)
        self.assertEqual(len(self.out['events']), sum(per.values()))

    def test_the_stage_record_pins_the_output(self):
        rec = load('data-src', 'provenance', 'stages', 'offices.record.json')
        self.assertEqual(rec['outputs']['pipelines/offices/emitted/offices-modern-states.json'], hashlib.sha256(pathlib.Path(EMITTED).read_bytes()).hexdigest())

    def test_the_two_null_cases_stay_null(self):
        for r in self.rulings:
            if r['type'] == 'qid-from-sitelink' and r['decision'] == 'null':
                self.assertIsNone(r['qid'])
                self.assertTrue(any('not taken' in f for v in self.out['review'].values() if v['key'] == r['uuid_key'] for f in v['toCheck']))

    def test_the_facet_comes_after_the_category_facet_and_has_both_kinds(self):
        sys.path.insert(0, os.path.join(ROOT, 'pipelines', 'common'))
        import reigns
        facets = load('data-src', self.spec['timeline'] + '.json')['meta']['facets']
        self.assertEqual(list(facets)[:2], ['category', 'ruler-kind'])
        self.assertEqual(facets['ruler-kind'], reigns.ruler_kind_facet())
        self.assertIsNotNone(facets['category'], 'apply_offices reserves the category facet as None; event_categories must have filled it')
        self.assertEqual(facets['category']['applies'], 'events')
        self.assertEqual(set(reigns.RULER_KINDS), {r['kind'] for r in self.spec['rows']})


if __name__ == '__main__':
    unittest.main()
