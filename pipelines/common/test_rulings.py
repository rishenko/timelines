"""python -I test_rulings.py (from pipelines/common)"""
import os
import sys
import unittest

sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
import rulings as RU  # noqa: E402


def ruling(**kw):
    base = {'id': 'date-x', 'kind': 'date', 'subject': 'row:x', 'question': 'q', 'headline': 'h', 'definition': 'd',
            'kept': [{'year': 1}], 'rejected': [], 'sources_read': ['a page'], 'decided_by': 'crew', 'date': '2026-11-25'}
    return base | kw


class Rulings(unittest.TestCase):
    def test_committed_file_is_well_formed(self):
        self.assertEqual(RU.problems(RU.load()), [])

    def test_a_good_ruling_passes(self):
        self.assertEqual(RU.problems([ruling()]), [])

    def test_decided_by_is_a_role_not_a_name(self):
        self.assertIn('date-x: decided_by must be a role, one of [\'crew\', \'owner\']', RU.problems([ruling(decided_by='Kim')]))

    def test_office_scope_needs_a_known_rule(self):
        self.assertTrue(any('needs a rule' in p for p in RU.problems([ruling(kind='office-scope', subject='row:modern-states/japan')])))

    def test_missing_field_unknown_kind_duplicate_id_and_bad_subject(self):
        bad = RU.problems([ruling(kind='vibe'), ruling(subject='Japan'), {k: v for k, v in ruling(id='date-y').items() if k != 'question'}])
        self.assertTrue(any('kind' in p for p in bad))
        self.assertTrue(any('id used twice' in p for p in bad))
        self.assertTrue(any('subject' in p for p in bad))
        self.assertIn('date-y: no question', bad)

    def test_office_scope_tables(self):
        rs = [ruling(id='a', kind='office-scope', subject='row:medieval/japan', rule='head-offices', kept=['Shogun']),
              ruling(id='b', kind='office-scope', subject='row:modern-states/vietnam', rule='phase-office', kept=['phase offices'])]
        self.assertEqual(RU.office_scope('head-offices', rs), {('medieval', 'japan'): ['Shogun']})
        self.assertEqual(set(RU.office_scope('phase-office', rs)), {('modern-states', 'vietnam')})


    def test_every_pointer_names_a_ruling(self):
        ids = {r['id'] for r in RU.load()}
        refs = list(RU.references())
        self.assertTrue(any(f.endswith('periods.json') for f, _ in refs))
        self.assertEqual([r for _, r in refs if r not in ids], [])

    def test_get_names_a_missing_ruling(self):
        with self.assertRaises(SystemExit) as e:
            RU.get('date-nowhere', [])
        self.assertIn('date-nowhere', str(e.exception))


if __name__ == '__main__':
    unittest.main()
