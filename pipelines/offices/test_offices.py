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
EMITTED = os.path.join(ROOT, 'pipelines', 'offices', 'emitted')
FOLDER = {'modern-states': 'modern-states', 'medieval': 'medieval'}


def load(*p):
    with open(os.path.join(ROOT, *p), encoding='utf-8') as f:
        return json.load(f)


class Offices(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = load('pipelines', 'offices', 'offices-rows.json')
        cls.files = {tl: load('pipelines', 'offices', 'emitted', f'offices-{tl}.json') for tl in cls.spec['timelines'] if os.path.exists(os.path.join(EMITTED, f'offices-{tl}.json'))}
        cls.out = cls.files[next(iter(cls.spec['timelines']))]  # the first timeline's file also holds `held` and `guards`
        cls.expected = load('pipelines', 'offices', 'offices-expected.json')['rows']
        cls.rulings = load('pipelines', 'offices', 'hand-rulings.json')
        cls.rows = {r['track']: r for r in cls.spec['rows']}  # a track with several rows (a prime minister row and a governor row) keeps the last; the kind comes from the review
        cls.kinds = {r['kind'] for r in cls.spec['rows']}

    def test_uuids_unique_and_not_retired_or_committed(self):
        for tl, f in self.files.items():
            u = [e['uuid'] for e in f['events']]
            self.assertEqual(len(u), len(set(u)), tl)
            retired = set(load('pipelines', FOLDER[tl], 'redirects.json')['redirects'])
            committed = {e['uuid'] for n in ('reigns.json', 'extra-reigns.json') if os.path.exists(os.path.join(ROOT, 'pipelines', FOLDER[tl], n)) for e in load('pipelines', FOLDER[tl], n)['events']}
            self.assertEqual(set(u) & (retired | committed), set(), tl)

    def test_every_event_is_a_cited_reign_with_one_kind(self):
        for f in self.files.values():
            for e in f['events']:
                self.assertIn(e['tracks'][0], self.rows)
                self.assertTrue(e['uuid'].startswith('reign-'))
                kinds = [m for m in e['memberships'] if m['facet'] == 'ruler-kind']
                self.assertEqual([m['value'] for m in kinds], [f['review'][e['uuid']]['kind']])
                self.assertIn(f['review'][e['uuid']]['kind'], self.kinds)
                for s in e['sources'] + [x for m in e['memberships'] for x in m['sources']]:
                    self.assertIn(s['sourceKey'], f['sources'])
                self.assertIn(e['uuid'], f['review'])

    @staticmethod
    def window(tl, row, why=None):
        if tl.get('phases'):
            ph = sorted((p[0], p[1] if p[1] is not None else 10 ** 6) for p in tl['phases'])
        elif tl.get('span') and tl['span'][0] is not None:
            ph = [(tl['span'][0], tl['span'][1] if tl['span'][1] is not None else 10 ** 6)]
        else:
            return None
        w = []
        for s, t in ph:
            if w and s <= w[-1][1]: w[-1][1] = max(w[-1][1], t)
            else: w.append([s, t])
        if row.get('window_from') is not None: w[0][0] = min(w[0][0], row['window_from'])
        return w

    def test_events_lie_inside_the_rows_phases_and_the_timeline(self):
        for tl, f in self.files.items():
            cfg = self.spec['timelines'][tl]
            for e in f['events']:
                r = next(x for x in self.spec['rows'] if x['id'] == f['review'][e['uuid']]['key'].split('/')[0])
                end = 10 ** 6 if e.get('ongoing') else e['end']
                self.assertGreaterEqual(e['start'], cfg['from'], e['uuid'])
                self.assertTrue(end <= cfg['to'] or e.get('ongoing'), e['uuid'])
                self.assertLessEqual(e['start'], end)
                w = self.window(r['timelines'][tl], r)
                if w:
                    self.assertTrue(any(a <= e['start'] and end <= b for a, b in w), e['uuid'])

    def test_row_windows_are_the_timelines(self):
        for tl in self.spec['timelines']:
            tracks = {t['id']: t for t in load('data-src', tl + '.json')['tracks']}
            for r in self.spec['rows']:
                t = tracks.get(r['track'])
                if t is None:
                    self.assertNotIn(tl, r['timelines'], r['id'])
                    continue
                sp = t.get('span')
                sps = sp if isinstance(sp, list) else [sp] if sp else []  # a row with two stretches: one window from the first start to the last end
                span = [min(x['start'] for x in sps), None if any(x.get('end') is None for x in sps) else max(x['end'] for x in sps)] if sps else None
                self.assertEqual(r['timelines'][tl], {'phases': [[p['start'], p.get('end')] for p in t.get('phases', [])], 'span': span}, (tl, r['id']))

    def test_each_ruling_names_a_record_the_output_holds(self):
        keys = {v['key']: v for f in self.files.values() for v in f['review'].values()}
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
        for f in self.files.values():
            for v in f['review'].values(): per[v['key'].split('/')[0]] = per.get(v['key'].split('/')[0], 0) + 1
        for rid, g in self.out['guards'].items():
            self.assertEqual(per.get(rid, 0) + held.get(rid, 0), g['records'], rid)
            self.assertEqual(held.get(rid, 0), g['held'], rid)
        self.assertEqual(sum(len(f['events']) for f in self.files.values()), sum(per.values()))

    def test_the_stage_record_pins_the_output(self):
        rec = load('data-src', 'provenance', 'stages', 'offices.record.json')
        self.assertEqual(set(rec['outputs']), {f'pipelines/offices/emitted/offices-{tl}.json' for tl in self.files})
        for tl in self.files:
            self.assertEqual(rec['outputs'][f'pipelines/offices/emitted/offices-{tl}.json'], hashlib.sha256(pathlib.Path(EMITTED, f'offices-{tl}.json').read_bytes()).hexdigest())

    def test_the_two_null_cases_stay_null(self):
        for r in self.rulings:
            if r['type'] == 'qid-from-sitelink' and r['decision'] == 'null':
                self.assertIsNone(r['qid'])
                self.assertTrue(any('not taken' in f for v in self.out['review'].values() if v['key'] == r['uuid_key'] for f in v['toCheck']))

    def test_the_facet_comes_after_the_category_facet_and_has_both_kinds(self):
        sys.path.insert(0, os.path.join(ROOT, 'pipelines', 'common'))
        import reigns
        facets = load('data-src', 'modern-states.json')['meta']['facets']
        self.assertEqual(list(facets)[:2], ['category', 'ruler-kind'])
        self.assertEqual(facets['ruler-kind'], reigns.ruler_kind_facet())
        self.assertIsNotNone(facets['category'], 'apply_offices reserves the category facet as None; event_categories must have filled it')
        self.assertEqual(facets['category']['applies'], 'events')
        self.assertEqual(set(reigns.RULER_KINDS), self.kinds)


class Spells(unittest.TestCase):
    SPEC = {'rows': [{'id': 'x', 'batch': 'M2', 'timelines': {'t': {'phases': [[1900, 1950], [1950, 2000]]}}}]}

    def rows(self, *spans):
        recs = [dict(key=f'x/{i:03d}', qid='Q1', name='A', start=a, end=b, end_open=False, held='', timeline='t', flags=[], table=0, rowidx=i, quote=f'A | {a} | {b}') for i, (a, b) in enumerate(spans)]
        return {'x': (None, recs)}

    def test_touching_terms_inside_a_phase_become_one(self):
        sys.path.insert(0, HERE)
        import offices
        rows = self.rows(('1910-01-01', '1920-05-05'), ('1920-05-05', '1930-01-01'))
        offices.merge_spells(rows, self.SPEC)
        a, b = rows['x'][1]
        self.assertEqual((a['end'], b['held']), ('1930-01-01', 'continues x/000: R15'))
        self.assertEqual(a['merged_locs'], ['table 0, row 1: A | 1920-05-05 | 1930-01-01'])  # the later row is cited for the extended end
        self.assertEqual(offices.touching_in_phase(rows, self.SPEC), [])

    def test_a_touch_at_a_phase_edge_stays_two_and_a_gap_stays_two(self):
        sys.path.insert(0, HERE)
        import offices
        rows = self.rows(('1940-01-01', '1950-03-03'), ('1950-03-03', '1960-01-01'), ('1961-01-01', '1962-01-01'))
        offices.merge_spells(rows, self.SPEC)
        self.assertEqual([r['held'] for r in rows['x'][1]], ['', '', ''])
        self.assertEqual(offices.touching_in_phase(rows, self.SPEC), [])

    def test_the_guard_names_a_touch_left_inside_a_phase(self):
        sys.path.insert(0, HERE)
        import offices
        rows = self.rows(('1910-01-01', '1920-05-05'), ('1920-05-05', '1930-01-01'))
        self.assertEqual(len(offices.touching_in_phase(rows, self.SPEC)), 1)


if __name__ == '__main__':
    unittest.main()
