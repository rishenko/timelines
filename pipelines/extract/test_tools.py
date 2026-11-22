"""outline.py and notes.py. Run: python3 -I pipelines/extract/test_tools.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from notes import headings, section  # noqa: E402
from outline import outline  # noqa: E402

SRC = '''"""Module doc.
Second line."""
import os


def plain(a, b=2, *rest, key=None) -> int:
    """Adds things.
    More detail."""
    return a


class Box(Base):
    """A box."""
    def open(self):
        pass

    async def fetch(self, url):
        """Gets it."""


if __name__ == '__main__':
    def helper():
        pass
'''

MD = '''# Title
intro
## Alpha
a1
### Alpha sub
a2
```
# not a heading
```
## Beta
b1
'''


class Outline(unittest.TestCase):
    def test_outline(self):
        self.assertEqual(outline(SRC), [
            'Module doc.', 'Second line.',
            '6: def plain(a, b=2, *rest, key=None) -> int  # Adds things.',
            '12: class Box(Base)  # A box.',
            '    14: def open(self)',
            '    17: async def fetch(self, url)  # Gets it.',
            '22: def helper()'])

    def test_real_file_parses(self):
        here = os.path.dirname(os.path.abspath(__file__))
        self.assertTrue(any('def parse(line)' in l for l in outline(open(os.path.join(here, 'wikidata.py')).read())))


class Notes(unittest.TestCase):
    def test_section_runs_to_next_same_level(self):
        self.assertEqual(section(MD, 'alpha'), ['## Alpha', 'a1', '### Alpha sub', 'a2', '```', '# not a heading', '```'])

    def test_subsection_and_last(self):
        self.assertEqual(section(MD, 'alpha sub'), ['### Alpha sub', 'a2', '```', '# not a heading', '```'])
        self.assertEqual(section(MD, 'BETA'), ['## Beta', 'b1'])

    def test_missing_and_fences(self):
        self.assertIsNone(section(MD, 'gamma'))
        self.assertEqual([t for _, _, t in headings(MD.splitlines())], ['Title', 'Alpha', 'Alpha sub', 'Beta'])


if __name__ == '__main__':
    unittest.main()
