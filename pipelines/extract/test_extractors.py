"""Extractor helpers (python -m unittest from pipelines/extract)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extractors import sentences  # noqa: E402


class Sentences(unittest.TestCase):
    def test_abbreviations_do_not_end_sentences(self):  # Bisbee Deportation, WW1 pilot
        s = sentences('On May 15, 1918, the U.S. Department of Labor reported the deportees. They were held at Columbus.')
        self.assertEqual(s, ['On May 15, 1918, the U.S. Department of Labor reported the deportees.', 'They were held at Columbus.'])

    def test_titles_and_initials(self):
        s = sentences('Gen. Allenby entered Jerusalem. J. R. Smith wrote of it in 1918.')
        self.assertEqual(s, ['Gen. Allenby entered Jerusalem.', 'J. R. Smith wrote of it in 1918.'])


if __name__ == '__main__':
    unittest.main()
