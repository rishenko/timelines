"""Tests for sample_judge: the Wilson interval, the stratified draw, the blind files, the two-reader report and the two frozen fixtures."""
import csv
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sample_judge as S  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, 'sample_judge_fixtures')


def candidates(path, n=100):
    rows = [{'id': f'r{i:03d}', 'timeline': ('a', 'b', 'c')[i % 3] if i < 90 else 'd', 'person': f'P{i}', 'hint': 'SECRET-HINT'} for i in range(n)]
    with open(path, 'w', newline='') as f:
        w = csv.DictWriter(f, ['id', 'timeline', 'person', 'hint'])
        w.writeheader()
        w.writerows(rows)
    return rows


def run(*argv):
    buf = io.StringIO()
    with redirect_stdout(buf):
        code = S.main(list(argv))
    return code, buf.getvalue()


class Maths(unittest.TestCase):
    def test_wilson_matches_the_hand_figures(self):
        lo, hi = S.wilson(77, 81)
        self.assertAlmostEqual(lo, 0.880, places=3)
        self.assertAlmostEqual(hi, 0.981, places=3)
        lo, hi = S.wilson(72, 80)
        self.assertAlmostEqual(lo, 0.815, places=3)
        self.assertEqual(S.wilson(0, 0), (0.0, 1.0))
        self.assertAlmostEqual(S.wilson(10, 10)[1], 1.0)

    def test_kappa(self):
        self.assertAlmostEqual(S.cohen_kappa([True, True, False, False], [True, True, False, False]), 1.0)
        self.assertAlmostEqual(S.cohen_kappa([True, False, True, False], [False, True, False, True]), -1.0)
        self.assertIsNone(S.cohen_kappa([True, True], [True, True]))  # no variation: undefined

    def test_allocation_totals_exactly_n_and_never_exceeds_a_stratum(self):
        got = S.allocate({'a': 152, 'b': 141, 'c': 65}, 80)
        self.assertEqual(sum(got.values()), 80)
        self.assertEqual(got, {'a': 34, 'b': 31, 'c': 15})
        self.assertEqual(S.allocate({'a': 2, 'b': 50}, 10)['a'], 1)
        self.assertEqual(sum(S.allocate({'a': 3, 'b': 2}, 99).values()), 5)


class Draw(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.d)
        self.cand = os.path.join(self.d, 'in.csv')
        candidates(self.cand)

    def draw(self, out, seed=7, extra=()):
        return run('draw', '--candidates', self.cand, '--out', os.path.join(self.d, out), '--seed', str(seed), '--n', '30',
                   '--strata', 'timeline', '--hide', 'hint', '--readers', 'ann,bob', '--overlap', '10', *extra)

    def test_same_input_seed_and_arguments_draw_the_same_ids_whatever_the_row_order(self):
        self.draw('one')
        rows = list(csv.DictReader(open(self.cand)))
        rows.reverse()
        with open(self.cand, 'w', newline='') as f:
            w = csv.DictWriter(f, ['id', 'timeline', 'person', 'hint'])
            w.writeheader()
            w.writerows(rows)
        self.draw('two')
        a = json.load(open(os.path.join(self.d, 'one', 'sample.json')))
        b = json.load(open(os.path.join(self.d, 'two', 'sample.json')))
        self.assertEqual(a['drawn'], b['drawn'])
        self.assertEqual(a['overlap'], b['overlap'])
        self.assertEqual(len(a['drawn']), 30)
        self.assertEqual({k: v[1] for k, v in a['strata'].items()}, {'a': 9, 'b': 9, 'c': 9, 'd': 3})  # proportional by stratum
        self.assertNotEqual(a['drawn'], json.load(open(os.path.join(self.d, 'two', 'sample.json')))['drawn'][::-1])

    def test_a_different_seed_draws_a_different_sample(self):
        self.draw('one', 7)
        self.draw('two', 8)
        a = json.load(open(os.path.join(self.d, 'one', 'sample.json')))['drawn']
        b = json.load(open(os.path.join(self.d, 'two', 'sample.json')))['drawn']
        self.assertNotEqual(a, b)

    def test_blind_files_have_no_hint_no_verdict_and_the_overlap_is_shared(self):
        self.draw('one')
        out = os.path.join(self.d, 'one')
        for r, n in (('ann', 30), ('bob', 10)):
            text = open(os.path.join(out, f'blind-{r}.csv')).read() + open(os.path.join(out, f'blind-{r}.md')).read()
            self.assertNotIn('SECRET-HINT', text)
            self.assertNotIn('verdict', open(os.path.join(out, f'blind-{r}.csv')).read().lower())
            self.assertEqual(len(list(csv.DictReader(open(os.path.join(out, f'blind-{r}.csv'))))), n)
        bob = {r['id'] for r in csv.DictReader(open(os.path.join(out, 'blind-bob.csv')))}
        ann = {r['id'] for r in csv.DictReader(open(os.path.join(out, 'blind-ann.csv')))}
        self.assertTrue(bob <= ann)
        self.assertEqual(len(list(csv.DictReader(open(os.path.join(out, 'verdicts-template.csv'))))), 40)
        self.assertTrue(os.path.exists(os.path.join(out, 'candidates.csv')))

    def test_a_drawn_sample_is_not_redrawn(self):
        self.draw('one')
        with self.assertRaises(SystemExit):
            self.draw('one')

    def test_duplicate_ids_are_refused(self):
        with open(self.cand, 'a') as f:
            f.write('r001,a,Dup,x\n')
        with self.assertRaises(SystemExit):
            self.draw('one')


class Report(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.d)
        cand = os.path.join(self.d, 'in.csv')
        candidates(cand)
        self.out = os.path.join(self.d, 'run')
        run('draw', '--candidates', cand, '--out', self.out, '--seed', '3', '--n', '20', '--readers', 'ann,bob', '--overlap', '10')
        self.S = json.load(open(os.path.join(self.out, 'sample.json')))

    def write(self, reader, bad=(), unsure=()):
        ids = self.S['drawn'] if reader == 'ann' else self.S['overlap']
        with open(os.path.join(self.out, f'verdicts-{reader}.csv'), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['id', 'reader', 'verdict', 'note'])
            for i in ids:
                w.writerow([i, reader, 'bad' if i in bad else 'unsure' if i in unsure else 'ok', 'why' if i in bad else ''])

    def test_report_strict_gate_agreement_and_disagreement(self):
        ov = self.S['overlap']
        outside = [i for i in self.S['drawn'] if i not in ov]
        self.write('ann', bad={outside[0]})
        self.write('bob', bad={ov[0]})  # bob alone says bad on an overlap row ann passed
        code, text = run('report', '--out', self.out)
        self.assertEqual(code, 1)  # strict 18/20 = 90%
        self.assertIn('Strict (every reader who read a row says ok):** 18 of 20', text)
        self.assertIn('ann alone:** 19 of 20 real = 95.0%', text)
        self.assertIn(f'DISAGREE `{ov[0]}`', text)
        self.assertIn('Agreement ann vs bob** on 10 rows: 9 agree (90.0%)', text)
        self.assertIn('point ≥95% (pass-9 gate): FAIL', text)
        self.assertTrue(os.path.exists(os.path.join(self.out, 'report.md')))
        self.assertEqual(json.load(open(os.path.join(self.out, 'report.json')))['strict_ok'], 18)

    def test_a_clean_run_passes_and_unsure_counts_as_not_real(self):
        self.write('ann')
        self.write('bob')
        code, text = run('report', '--out', self.out)
        self.assertEqual(code, 0)
        self.assertIn('GATE: 20/20 = 100.0% · point ≥95% (pass-9 gate): PASS · Wilson lower bound 83.9%', text)
        self.write('ann', unsure={self.S['drawn'][0]})
        self.assertIn('19/20', run('report', '--out', self.out)[1])

    def test_missing_unknown_and_foreign_verdicts_fail_loudly(self):
        self.write('ann')
        with self.assertRaises(SystemExit):  # bob's file is missing
            run('report', '--out', self.out)
        self.write('bob')
        path = os.path.join(self.out, 'verdicts-bob.csv')
        rows = list(csv.reader(open(path)))
        rows[1][2] = 'maybe'
        csv.writer(open(path, 'w', newline='')).writerows(rows)
        with self.assertRaises(SystemExit):
            run('report', '--out', self.out)
        self.write('bob')
        rows = list(csv.reader(open(path)))[:-1]
        csv.writer(open(path, 'w', newline='')).writerows(rows)
        with self.assertRaises(SystemExit):  # a row without a verdict
            run('report', '--out', self.out)


class Fixtures(unittest.TestCase):
    """The two persons-store runs of 2026-11-24, kept as the harness's first fixtures (the figures in PR #171)."""

    def report(self, name):
        out = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, out)
        d = os.path.join(out, name)
        shutil.copytree(os.path.join(FIX, name), d)
        code, text = run('report', '--out', d)
        return code, text

    def test_run3_was_90_percent_and_fails_the_gate(self):
        code, text = self.report('persons-store-run3')
        self.assertEqual(code, 1)
        self.assertIn('GATE: 72/80 = 90.0%', text)
        self.assertIn('FAIL', text)

    def test_run4_was_95_1_percent_and_passes_the_point_gate(self):
        code, text = self.report('persons-store-run4')
        self.assertEqual(code, 0)
        self.assertIn('GATE: 77/81 = 95.1%', text)
        self.assertIn('Wilson lower bound 88.0%', text)
        self.assertIn('88.0%–98.1%', text)


if __name__ == '__main__':
    unittest.main()
