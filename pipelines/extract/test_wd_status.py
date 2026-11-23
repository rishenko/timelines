"""wd_status log parsing and ETA. Run: pipelines/extract/.venv/bin/python -I pipelines/extract/test_wd_status.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wd_status import eta_minutes, last_progress  # noqa: E402


class Status(unittest.TestCase):
    def test_last_progress_line(self):
        log = ('4 GiB JSON, 9,000 lines, 100 kept, 250 MiB/s\n'
               '8 GiB JSON, 20,000 lines, 300 kept, 260 MiB/s\n'
               'paused at 8.2 GiB of JSON; run again to resume\n')
        prog, last = last_progress(log)
        self.assertEqual(prog, (8.0, 20000, 300, 260))
        self.assertTrue(last.startswith('paused'))

    def test_no_progress_yet(self):
        self.assertEqual(last_progress(''), (None, ''))

    def test_eta(self):  # 1 GiB per million lines, 1 million left, 1024 MiB/s: about a second
        self.assertAlmostEqual(eta_minutes(1.0, 1_000_000, 1024, expected=2_000_000), 1 / 60)
        self.assertIsNone(eta_minutes(1.0, 3_000_000, 1024, expected=2_000_000))
        self.assertIsNone(eta_minutes(0, 0, 0))


if __name__ == '__main__':
    unittest.main()
