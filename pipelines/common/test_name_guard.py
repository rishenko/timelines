"""Tests for name_guard.hits (temporary files)."""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import name_guard as G  # noqa: E402


class NameGuard(unittest.TestCase):
    def test_any_case_is_found_and_clean_files_pass(self):
        with tempfile.TemporaryDirectory() as d:
            a, b = os.path.join(d, 'a.json'), os.path.join(d, 'b.json')
            open(a, 'w', encoding='utf-8').write('{"title": "x"}\n{"url": "https://github.com/RiShEnKo/x"}\n')
            open(b, 'w', encoding='utf-8').write('{"title": "Kevin"}\n')
            self.assertEqual(G.hits([a, b]), [(a, 2)])


if __name__ == '__main__':
    unittest.main()
