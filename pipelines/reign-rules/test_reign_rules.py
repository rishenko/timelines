"""python -I test_reign_rules.py (from pipelines/reign-rules): the reign-rules stage on fixtures (no dump, no ~/data)."""
import json
import os
import sys
import tempfile
import unittest

sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
import classify as CL  # noqa: E402
import engine as EN  # noqa: E402
import facts as FA  # noqa: E402
import scores as SC  # noqa: E402
import validate as VA  # noqa: E402


def ev(uuid, start, end, row='r', title=None, sources=('wp-a',), **kw):
    return dict({'uuid': uuid, 'title': title or f'Reign of {uuid}', 'start': start, 'end': end, 'tracks': [row],
                 'sources': [{'sourceKey': k} for k in sources]}, **kw)


def reign(e, tl='modern-states', review=None):
    return {'uuid': e['uuid'], 'timeline': tl, 'row': e['tracks'][0], 'file': 'f', 'event': e, 'review': review if review is not None else {'toCheck': []}}


# a test registry: one rule per class, matching on the title
REG = {'consort': lambda r, c, p: 'consort title' if 'Queen consort' in r['event']['title'] else None,
       'party': lambda r, c, p: 'party office' if 'Party' in r['event']['title'] else None,
       'head': lambda r, c, p: 'the state\'s head' if 'King' in r['event']['title'] or 'Party' in r['event']['title'] else None,
       'gone': lambda r, c, p: 'not this row' if 'Governor' in r['event']['title'] else None}
TABLE = [{'id': 'R2', 'class': 'consort', 'verdict': 'consort', 'decided_by': 'code', 'test': 'consort'},
         {'id': 'R7', 'class': 'party-office', 'verdict': 'party-office', 'decided_by': 'human', 'test': 'party'},
         {'id': 'R1', 'class': 'head', 'verdict': 'head', 'decided_by': 'code', 'test': 'head'},
         {'id': 'RX', 'class': 'governor', 'verdict': 'excluded', 'decided_by': 'code', 'test': 'gone'}]
RULING = {'id': 'verdict-k', 'kind': 'verdict', 'subject': 'reign-k', 'headline': 'a co-ruler', 'kept': [{'verdict': 'co-ruler', 'page': 'P', 'location': 'lead'}]}


class Engine(unittest.TestCase):
    def go(self, title, uuid='reign-x', rulings=()):
        return EN.classify(reign(ev(uuid, 1, 2, title=title)), {}, TABLE, REG, EN.verdict_rulings(rulings))

    def test_a_uuid_ruling_decides_before_any_rule(self):
        v = self.go('King Kim', uuid='reign-k', rulings=[RULING])
        self.assertEqual((v['verdict'], v['rule'], v['decided_by']), ('co-ruler', 'verdict-k', 'human'))
        self.assertEqual(v['matched'], ['R1'])

    def test_the_first_matching_row_decides_and_a_later_code_row_never_overrides_a_human_class(self):
        v = self.go('King Kim')
        self.assertEqual((v['verdict'], v['rule'], v['decided_by'], v['conflict']), ('head', 'R1', 'code', False))
        v = self.go('Party chair Kim')  # R7 (human) matches before R1 (code): the class needs a ruling, R1 doesn't decide it
        self.assertEqual((v['verdict'], v['rule'], v['decided_by'], v['matched']), ('unclassified', 'R7', 'none', ['R7', 'R1']))

    def test_a_human_class_with_no_ruling_is_unclassified_and_needs_one(self):
        table = [r for r in TABLE if r['id'] != 'R1']
        v = EN.classify(reign(ev('reign-p', 1, 2, title='Party chair')), {}, table, REG, {})
        self.assertEqual((v['verdict'], v['rule'], v['decided_by']), ('unclassified', 'R7', 'none'))
        self.assertIn('needs a ruling', v['reason'])

    def test_no_match_is_R14(self):
        v = self.go('Somebody')
        self.assertEqual((v['verdict'], v['rule'], v['reason']), ('unclassified', 'R14', 'no rule decides'))

    def test_two_code_rules_with_different_verdicts_mark_a_conflict(self):
        v = self.go('King and Queen consort')
        self.assertEqual((v['verdict'], v['rule'], v['conflict']), ('consort', 'R2', True))

    def test_the_table_check(self):
        self.assertEqual(EN.table_problems(TABLE, REG), [])
        bad = EN.table_problems(TABLE + [{'id': 'R1', 'class': 'x', 'verdict': 'king', 'decided_by': 'robot', 'test': 'nope'}], REG)
        self.assertEqual(len(bad), 4, bad)  # id twice, verdict, decided_by, test

    def test_single_source(self):
        self.assertTrue(EN.single_source(reign(ev('a', 1, 2), review={'toCheck': ['Wikidata differs: 3 – 4']})))
        self.assertTrue(EN.single_source(reign(ev('a', 1, 2), review={})))  # hand-authored, no review
        self.assertFalse(EN.single_source(reign(ev('a', 1, 2), review={'toCheck': []})))  # Wikidata agrees
        self.assertFalse(EN.single_source(reign(ev('a', 1, 2, sources=('wp-a', 'wp-b')), review={})))


def rec(e, verdict='unclassified', rule='R14', tl='modern-states'):
    return dict(reign(e, tl), verdict=verdict, rule=rule)


class Validations(unittest.TestCase):
    def test_overlap_counts_ruled_and_undecided_reigns_but_not_others(self):
        a, b, c = ev('reign-a', 1900, 1920), ev('reign-b', 1910, 1930), ev('reign-c', 1905, 1925)
        hits = VA.overlap([rec(a), rec(b, 'head', 'R1'), rec(c, 'consort', 'R2')])
        self.assertEqual(list(hits), ['modern-states/reign-b'])
        self.assertEqual(VA.overlap([rec(a), rec(ev('reign-d', 1920, 1930))]), {})  # one shared year: inside the slack

    def test_outside_row(self):
        spans = {'modern-states': {'r': VA.spans_of({'span': [{'start': 1800, 'end': 1850}, {'start': 1900, 'ongoing': True}]})}}
        recs = [rec(ev('reign-in', 1801, 1851)), rec(ev('reign-late', 1990, None)), rec(ev('reign-gap', 1840, 1905)), rec(ev('reign-early', 1790, 1800))]
        self.assertEqual(sorted(VA.outside_row(recs, spans)), ['modern-states/reign-early', 'modern-states/reign-gap'])
        self.assertEqual(VA.spans_of({'span': {'start': 'c. 3500 BCE', 'end': '2900 BCE'}}), [(-3499, -2899)])

    def test_start_after_end_at_the_shared_precision(self):
        recs = [rec(ev('reign-a', 1030, 1030, startMonth=4, startDay=30)), rec(ev('reign-b', 1031, 1030)),
                rec(ev('reign-c', 1030, 1030, startMonth=5, endMonth=4))]
        self.assertEqual(sorted(VA.start_after_end(recs)), ['modern-states/reign-b', 'modern-states/reign-c'])

    def test_duplicate_uuid_but_not_a_seam_reign(self):
        seam, a, b = ev('reign-s', 640, 668), ev('reign-y', 1490, 1493), ev('reign-y', 1508, 1521)
        loaded = [('f1', 'ancient-classical', seam, {}), ('f2', 'medieval', seam, {}), ('f2', 'medieval', a, {}), ('f3', 'modern-states', b, {})]
        self.assertEqual(sorted(VA.duplicate_uuid(loaded)), ['medieval/reign-y', 'modern-states/reign-y'])
        self.assertEqual(list(VA.duplicate_uuid([('f', 'medieval', seam, {}), ('g', 'medieval', seam, {})])), ['medieval/reign-s'])


class Stage(unittest.TestCase):
    def loaded(self):
        return [('f', 'modern-states', ev('reign-k', 1900, 1910, title='King Kim'), {'person': 'Kim', 'toCheck': []}),
                ('f', 'modern-states', ev('reign-g', 1910, 1920, title='Governor Lee'), {'person': 'Lee', 'toCheck': []}),
                ('f', 'modern-states', ev('reign-p', 1920, 1930, title='Pak'), {'person': 'Pak', 'toCheck': ['Wikidata differs: 1 – 2']}),
                ('f', 'medieval', ev('reign-m', 1200, 1210, title='Mo'), {'person': 'Mo', 'toCheck': []})]

    def run_stage(self):
        listed = {('modern-states', 'r'): {'Pak@1920': 'not this row (a review)'}}
        return CL.run(self.loaded(), {}, TABLE, REG, [], listed)

    def test_excluded_reigns_are_dropped_with_their_rule_and_reason(self):
        records, excluded, hits, reigns_in = self.run_stage()
        self.assertEqual([r['uuid'] for r in records], ['reign-k', 'reign-m'])
        self.assertEqual([(x['uuid'], x['rule']) for x in excluded], [('reign-g', 'RX'), ('reign-p', 'excluded-list')])
        self.assertEqual(reigns_in, {'ancient-classical': 0, 'medieval': 1, 'modern-states': 3})
        self.assertEqual(records[1]['marks'], ['unclassified'])

    def test_scores_and_their_change_against_a_baseline(self):
        records, excluded, hits, reigns_in = self.run_stage()
        sc = SC.build(records, excluded, hits, reigns_in, CL.TIMELINES)
        t = sc['modern-states']
        self.assertEqual((t['reigns'], t['classified'], t['excluded'], t['decided_code'], t['unclassified']), (3, 1, 2, 1, 0))
        self.assertEqual(t['share']['decided_code'], 1.0)
        self.assertEqual(set(t['validations']), set(VA.CHECKS))
        self.assertEqual(t['pattern_test'], {'code_majority': True, 'validations_clean': True, 'passes': True})  # 1 of 1 by code, no hits
        self.assertEqual(sc['medieval']['pattern_test']['code_majority'], False)  # 0 of 1
        before = json.loads(json.dumps(sc))
        before['modern-states']['decided_code'] = 0
        self.assertEqual(SC.deltas(sc, before), [('modern-states', 'decided_code', 0, 1)])
        self.assertIn('since the baseline: 1 change(s)', SC.summary(sc, SC.deltas(sc, before)))

    def test_the_counts_check_catches_a_file_that_disagrees(self):
        records, excluded, hits, reigns_in = self.run_stage()
        sc = SC.build(records, excluded, hits, reigns_in, CL.TIMELINES)
        with tempfile.TemporaryDirectory() as d:
            def write(name, data):
                with open(os.path.join(d, name), 'w', encoding='utf-8') as f:
                    json.dump(data, f)
            write('classified.json', {tl: [{k: v for k, v in r.items() if k != 'event'} for r in records if r['timeline'] == tl] for tl in CL.TIMELINES})
            write('excluded.json', excluded)
            write('scores.json', sc)
            self.assertEqual(CL.count_problems(d, records, excluded, reigns_in, json.loads(json.dumps(sc))), [])
            write('excluded.json', excluded[:1])  # a lost row
            bad = CL.count_problems(d, records, excluded, reigns_in, json.loads(json.dumps(sc)))
            self.assertTrue(any('3 reigns in, but 1 classified + 1 excluded' in b for b in bad), bad)


class Context(unittest.TestCase):
    def test_a_rule_sees_the_office_text_the_row_s_names_and_its_other_reigns(self):
        seen = {}

        def look(r, ctx, p):
            seen[r['uuid']] = (ctx['office'](r), sorted(x['uuid'] for x in ctx['by_row'][(r['timeline'], r['row'])]))
            seen['names'] = ctx['rows']['modern-states']['r']
            return None
        loaded = [('f', 'modern-states', ev('reign-k', 1900, 1910), {'person': 'K'}), ('f', 'modern-states', ev('reign-j', 1910, 1920), {'person': 'J'})]
        offices = {('modern-states', 'reign-k'): {'office': 'Queen consort of X', 'field': 'title', 'route': 'r'}}
        names = {'modern-states': {'r': {'name': 'Rome', 'phases': ['Roman Kingdom']}}}
        records, *_ = CL.run(loaded, {}, [{'id': 'R0', 'class': 'c', 'verdict': 'head', 'decided_by': 'code', 'test': 'look'}], {'look': look}, [], {}, offices, names)
        self.assertEqual(seen['names'], {'name': 'Rome', 'phases': ['Roman Kingdom']})
        self.assertEqual(seen['reign-k'], ({'office': 'Queen consort of X', 'field': 'title', 'route': 'r'}, ['reign-j', 'reign-k']))
        self.assertEqual(seen['reign-j'][0], None)  # no recorded office: a hand-authored reign
        self.assertEqual([(r['uuid'], r['office']) for r in records], [('reign-k', 'Queen consort of X'), ('reign-j', None)])

    def test_the_inputs_must_match_the_rulers_record(self):
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, 'a.csv'), 'w') as f:
                f.write('x\n')
            rec = os.path.join(d, 'record.json')
            with open(rec, 'w') as f:
                json.dump({'outputs': {'a.csv': {'sha256': '1d3b6c6c9b1ec2f5ab1b5ba5f4d6e9c3b8e5c5c1ad4b5f4d6e9c3b8e5c5c1ad4'}, 'b.csv': {'sha256': 'x'}}}, f)
            self.assertEqual(FA.record_problems(d, rec), ['a.csv: differs from the record', 'b.csv: missing'])
            import hashlib
            with open(rec, 'w') as f:
                json.dump({'outputs': {'a.csv': {'sha256': hashlib.sha256(b'x\n').hexdigest()}}}, f)
            self.assertEqual(FA.record_problems(d, rec), [])


class Committed(unittest.TestCase):
    def test_the_committed_table_is_well_formed(self):
        with open(os.path.join(CL.HERE, 'rules.json'), encoding='utf-8') as f:
            self.assertEqual(EN.table_problems(json.load(f), CL.RU.RULES), [])



class Rules(unittest.TestCase):
    """rules.json and rules.py (the ruler definition's decision table): each rule has one fixture in its class and one out of it, and names its table row."""

    def go(self, office, uuid='reign-a', start=1900, end=1910, row='france', others=(), title='Reign of A'):
        import rules as RL
        offices = {uuid: {'office': office, 'field': 'term_start', 'route': ''}}
        by_row = {('modern-states', row): [reign(ev(uuid, start, end, row=row, title=title))]}
        for o_uuid, o_office, o0, o1 in others:
            offices[o_uuid] = {'office': o_office, 'field': 'term_start', 'route': ''}
            by_row[('modern-states', row)].append(reign(ev(o_uuid, o0, o1, row=row)))
        by_row.setdefault(('modern-states', 'spain'), [])
        rows = {'modern-states': {'france': {'name': 'France', 'phases': ['Kingdom of France']}, 'spain': {'name': 'Spain', 'phases': []}, 'united-states': {'name': 'United States', 'phases': []}}}
        ctx = {'by_row': by_row, 'rows': rows, 'spans': {}, 'office': lambda r: offices.get(r['uuid'])}
        return {name: fn(by_row[('modern-states', row)][0], ctx, {}) for name, fn in RL.RULES.items()}

    def hits(self, office, **kw):
        return {k for k, v in self.go(office, **kw).items() if v}

    def test_the_table_is_well_formed(self):
        import rules as RL
        table = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rules.json'), encoding='utf-8'))
        self.assertEqual(EN.table_problems(table, RL.RULES), [])

    def test_governor_row(self):  # "Governors, governors-general, viceroys…": Governor of Khurasan is in; a President-Governor is out
        self.assertIn('governor', self.hits('Governor of Khurasan'))
        self.assertNotIn('governor', self.hits('3rd President of Pakistan and Chief Martial Law Administrator'))

    def test_consort_row(self):
        self.assertIn('consort', self.hits('Empress consort of the Eastern Roman Empire'))
        self.assertNotIn('consort', self.hits('Empress of France'))

    def test_junior_row(self):  # "Co-rulers": Caesar is in, Emperor is out
        self.assertIn('junior', self.hits('Caesar of the Byzantine Empire'))
        self.assertNotIn('junior', self.hits('Emperor of France'))

    def test_collective_member_row(self):  # "Collective heads": a member of the Presidency is in, its Chairman is out
        self.assertIn('collective-member', self.hits('Croat member of the Presidency of Bosnia and Herzegovina'))
        self.assertNotIn('collective-member', self.hits('Chairman of the Presidency of Bosnia and Herzegovina'))

    def test_co_ruler_rows(self):  # "Co-rulers", "Collective heads": Captain Regent and Co-Prince in; King out; a named co-emperor is for a reader
        self.assertIn('co-ruler', self.hits('Captain Regent of San Marino'))
        self.assertIn('co-ruler', self.hits('Co-Princess of Andorra'))
        self.assertNotIn('co-ruler', self.hits('King of France'))
        self.assertIn('co-ruler-named', self.hits('Byzantine co-emperor'))
        self.assertNotIn('co-ruler-named', self.hits('Byzantine emperor'))

    def test_regency_rows(self):  # "Regents": counts when no monarch reigned beside it, else not a reign
        alone = self.go('Regent of France', start=1500, end=1510)
        self.assertTrue(alone['regency'])
        self.assertIsNone(alone['regency-with-monarch'])
        beside = self.go('Regent of France', start=1500, end=1510, others=[('reign-k', 'King of France', 1490, 1520)])
        self.assertIsNone(beside['regency'])
        self.assertIn('reigned', beside['regency-with-monarch'])
        self.assertIsNone(self.go('Regent of France', others=[('reign-k', 'King of France', 1950, 1960)])['regency-with-monarch'])

    def test_acting_row(self):  # "Acting and interim holders": by the office text or the title
        self.assertIn('acting', self.hits('Interim President of Peru'))
        self.assertIn('acting', self.hits('President of Peru', title='Acting presidency of X'))
        self.assertNotIn('acting', self.hits('President of Peru'))

    def test_claimant_row(self):  # "Rival claimants", "Usurpers"
        self.assertIn('claimant', self.hits('Sultan of the Ottoman Empire (claimant)'))
        self.assertNotIn('claimant', self.hits('Sultan of the Ottoman Empire'))

    def test_other_office_row(self):  # "Another office of the same person": an ambassador is in, a President is out
        self.assertIn('other-office', self.hits('Colombian Ambassador to the United Kingdom'))
        self.assertNotIn('other-office', self.hits('Supreme Director of Nicaragua'))
        self.assertNotIn('other-office', self.hits('President of France'))

    def test_party_office_row(self):  # "Party-states": the chair of a party is in, the president of the state is out
        self.assertIn('party-office', self.hits('Chairman of the Chinese Communist Party'))
        self.assertNotIn('party-office', self.hits('President of France'))

    def test_other_realm_row(self):  # "Office of another polity": King of Spain on the france row is in, King of France is out
        self.assertIn('other-realm', self.hits('King of Spain', row='france', others=()) | self.hits('King of Spain'))
        self.assertNotIn('other-realm', self.hits('King of France'))

    def test_head_office_decides_only_when_nothing_more_specific_does(self):
        self.assertIn('head-office', self.hits('President of France'))
        self.assertNotIn('head-office', self.hits('Acting President of France'))
        self.assertNotIn('head-office', self.hits('Prime Minister of France'))

    def test_head_words_come_from_the_row_name_and_phases_not_its_id(self):  # 'United States' has the words of its name; the id 'united-states' is not read
        self.assertIn('head-office', self.hits('President of the United States', row='united-states'))
        self.assertIn('head-office', self.hits('King of France', row='france'))
        self.assertNotIn('head-office', self.hits('King of France', row='spain'))  # another row's words

    def test_a_reign_with_no_office_text_is_in_no_class(self):
        import rules as RL
        ctx = {'by_row': {('modern-states', 'france'): []}, 'rows': {}, 'spans': {}, 'office': lambda r: None}
        r = reign(ev('reign-h', 1, 2, row='france'))
        self.assertEqual([k for k, fn in RL.RULES.items() if fn(r, ctx, {})], [])


if __name__ == '__main__':
    unittest.main()
