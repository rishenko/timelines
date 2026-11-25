"""Tests for reign_checks.py (a temporary checkout; no dump)."""
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reign_checks as C  # noqa: E402


def reign(uuid, start, end, loc='infobox reign: x', **review):
    return uuid, {'uuid': uuid, 'title': 'Reign of X', 'start': start, 'end': end, 'tracks': ['r'],
                  'sources': [{'sourceKey': 'k', 'sourceLocation': loc}]}, review


class Checks(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root)
        rows = [
            reign('reign-ok', 1500, 1520, route='list: List of kings of X; polity: X'),
            reign('reign-consort-office', 1040, 1058, route='list: List of kings of X',
                  toCheck=['office noun unclear (shown as "Tenure of"): Duchess consort of Poland']),
            reign('reign-empresses-only', 467, 472, route='list: List of Roman and Byzantine empresses'),
            reign('reign-empress-and-emperor', 395, 404, route='list: List of Byzantine emperors; list: List of Roman and Byzantine empresses'),
            reign('reign-long', 1643, 1715),
            reign('reign-sixty', 1900, 1960),
            reign('reign-thong-lan', 750, 1388, loc='infobox reign: Seven days in 750 LE ; (1388/89 CE)'),
            reign('reign-al-wathiq', 842, 847, loc='infobox reign: 227 - 232 AH 5 January 842 – 10 August 847 CE'),
            reign('reign-chain-late', 1974, 1990, row='chile', qid='Q1', toCheck=['Wikidata differs: 1972 – 1990']),
            reign('reign-chain-early', 1999, 2002, row='venezuela', qid='Q2', toCheck=['Wikidata differs: 1999 – 2013']),
            reign('reign-chain-covered', 2002, 2013, row='venezuela', qid='Q2', toCheck=['Wikidata differs: 1999 – 2013']),
            reign('reign-governor', 1800, 1810, toCheck=['office noun unclear (shown as "Tenure of"): Governor of X', 'Wikidata differs: 1801']),
        ]
        os.makedirs(os.path.join(self.root, 'pipelines', 'medieval'))
        with open(os.path.join(self.root, 'pipelines', 'medieval', 'reigns.json'), 'w') as f:
            json.dump({'events': [e for _, e, _ in rows], 'review': {u: r for u, _, r in rows}}, f)
        os.makedirs(os.path.join(self.root, 'data-src'))
        cat = [{'facet': 'category', 'value': 'reign', 'sources': []}]
        with open(os.path.join(self.root, 'data-src', 'ancient-classical.json'), 'w') as f:
            json.dump({'events': [{'uuid': 'hammurabi-reign', 'tracks': ['babylonia', 'amorites'], 'memberships': cat},
                                  {'uuid': 'one-row', 'tracks': ['babylonia'], 'memberships': cat},
                                  {'uuid': 'a-war', 'tracks': ['a', 'b'], 'memberships': [{'facet': 'category', 'value': 'war'}]}]}, f)
        self.hits = C.run_checks(self.root)

    def test_consort_by_office_or_by_a_consort_list_alone(self):
        self.assertEqual(sorted(self.hits['consort']), ['reign-consort-office', 'reign-empresses-only'])  # not the one an emperors' list also reached

    def test_long_is_over_sixty_years(self):
        self.assertEqual(sorted(self.hits['long']), ['reign-long', 'reign-thong-lan'])  # exactly 60 is not

    def test_era_year_read_as_ce(self):
        self.assertEqual(sorted(self.hits['era-year']), ['reign-thong-lan'])  # al-Wathiq's years are the CE ones

    def test_multi_row_reign_category(self):
        self.assertEqual(sorted(self.hits['multi-row']), ['hammurabi-reign'])

    def test_unclear_office(self):
        self.assertEqual(sorted(self.hits['unclear-office']), ['reign-consort-office', 'reign-governor'])
        self.assertEqual(self.hits['unclear-office']['reign-governor'], 'office: Governor of X')

    def test_title_chain_needs_a_stretch_no_spell_of_the_person_covers(self):
        # Pinochet: Wikidata starts two years before the shown span; Chávez's two spells together cover Wikidata's single term
        self.assertEqual(sorted(self.hits['title-chain']), ['reign-chain-late'])

    def test_gate_allowlist_and_stale_entries(self):
        allow = {c: {} for c in C.CHECKS}
        allow['era-year'] = {'reign-thong-lan': 'test'}
        allow['long'] = {'reign-gone': 'stale'}
        with open(self._mk(), 'w') as f:
            json.dump(allow, f)
        old = C.ROOT
        C.ROOT = self.root
        try:
            buf = io.StringIO()
            with redirect_stdout(buf):
                report = C.main(['--only', 'era-year,long'])
                gate = C.main(['--gate', '--only', 'era-year'])
                gate_long = C.main(['--gate', '--only', 'long'])
            out = buf.getvalue()
        finally:
            C.ROOT = old
        self.assertEqual(report, 0)  # report mode never fails
        self.assertEqual(gate, 0)  # era-year: its one hit is allowed
        self.assertEqual(gate_long, 1)  # long: two new hits and a stale entry
        self.assertIn('era-year: 1 hits, 1 allowed, 0 new', out)
        self.assertIn('STALE reign-gone', out)

    def _mk(self):
        os.makedirs(os.path.join(self.root, 'pipelines', 'common'), exist_ok=True)
        return os.path.join(self.root, C.ALLOW)


if __name__ == '__main__':
    unittest.main()
