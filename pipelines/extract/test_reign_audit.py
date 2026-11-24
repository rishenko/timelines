"""reign_audit checks (python -I test_reign_audit.py from pipelines/extract; no dump needed)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reign_audit as A  # noqa: E402

TRACKS = {
    'sri-lanka': {'id': 'sri-lanka', 'name': 'Sri Lanka', 'phases': [{'name': 'British rule in Ceylon', 'start': 1796, 'end': 1948}]},
    'mexico': {'id': 'mexico', 'name': 'Mexico', 'phases': [{'name': 'New Spain', 'start': 1521, 'end': 1821}, {'name': 'Spanish rule', 'start': 1521, 'end': 1821}]},
    'spain': {'id': 'spain', 'name': 'Spain', 'phases': []},
    'canada': {'id': 'canada', 'name': 'Canada', 'phases': []},
    'taiwan': {'id': 'taiwan', 'name': 'Taiwan', 'phases': [{'name': 'Dutch colony of Formosa', 'start': 1624, 'end': 1662}]},
}


def row(rid, office, **kw):
    return dict({'uuid': f'reign-x-{rid}', 'row': rid, 'person': 'X', 'office': office, 'start': 1900, 'end': 1910, 'field': 'reign', 'route': '', 'guard': None}, **kw)


class Checks(unittest.TestCase):
    def test_governors_without_a_head_word(self):
        rows = [row('sri-lanka', 'Governor of Ceylon'), row('sri-lanka', 'Governor-General of Ceylon'), row('sri-lanka', 'King of Ceylon and Governor'),
                row('sri-lanka', 'Resident'), row('sri-lanka', 'President of Sri Lanka')]
        got = [h['office'] for h in A.check_governors(rows, TRACKS, None)]
        self.assertEqual(got, ['Governor of Ceylon', 'Governor-General of Ceylon', 'Resident'])

    def test_office_names_another_row(self):
        rows = [row('mexico', 'King of Spain'), row('mexico', 'Emperor of Mexico'), row('spain', 'King of Spain')]
        got = A.check_other_row(rows, TRACKS, None)
        self.assertEqual([(h['row'], h['kind']) for h in got], [('mexico', 'names another row')])
        self.assertEqual(got[0]['pair'], ['mexico|spain'])

    def test_colonial_phase_only(self):
        got = A.check_other_row([row('sri-lanka', 'Queen of Ceylon'), row('taiwan', 'Prince of Formosa')], TRACKS, None)
        self.assertEqual(sorted((h['row'], h['kind']) for h in got), [('sri-lanka', 'colonial phase'), ('taiwan', 'colonial phase')])

    def test_allowlist_keys(self):
        h = {'uuid': 'u', 'row': 'canada', 'pair': ['canada|united-kingdom'], 'guard': 'g', 'kind': 'colonial phase'}
        A.allow = lambda name: {'canada:colonial': 'a realm'} if name == 'other-row' else {'canada': 'x'} if name == 'governors' else {}
        self.assertEqual(A.keyed('other-row', h), 'canada:colonial')
        self.assertIsNone(A.keyed('other-row', dict(h, kind='names another row')))  # the colonial key does not clear the other kind
        A.allow = lambda name: {'canada': 'a row key'}
        self.assertIsNone(A.keyed('other-row', h))  # a bare row key clears nothing for other-row
        self.assertEqual(A.keyed('governors', h), 'canada')

    def test_stems(self):
        self.assertNotEqual(A.stem('austria'), A.stem('australia'))
        self.assertNotEqual(A.stem('niger'), A.stem('nigeria'))
        self.assertEqual(A.stem('mexico'), 'mexico')


if __name__ == '__main__':
    unittest.main()
