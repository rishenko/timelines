"""revisions.py: page titles from URLs, the cited set, the table (wave 2 A2). Fake wp_dump, temporary files; no dump needed. Run from this folder."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import revisions  # noqa: E402
import wp_dump  # noqa: E402


class Titles(unittest.TestCase):
    def test_title_of(self):
        self.assertEqual(revisions.title_of('https://en.wikipedia.org/wiki/Th%C3%A0nh_Th%C3%A1i'), 'Thành Thái')
        self.assertEqual(revisions.title_of('https://en.wikipedia.org/wiki/Kingdom_of_France#History'), 'Kingdom of France')
        self.assertIsNone(revisions.title_of('https://example.org/wiki/X'))
        self.assertIsNone(revisions.title_of('https://en.wikipedia.org/w/index.php?title=X'))
        self.assertIsNone(revisions.title_of(''))

    def test_cited_titles_are_the_sorted_union_over_all_timelines(self):
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, 'public', 'timelines'))
            for name, urls in {'a': ['https://en.wikipedia.org/wiki/Zed', 'https://en.wikipedia.org/wiki/Alpha'], 'b': ['https://en.wikipedia.org/wiki/Alpha', 'https://example.org/x']}.items():
                json.dump({'sources': {f's{i}': {'url': u} for i, u in enumerate(urls)} | {'none': {'name': 'no url'}}}, open(os.path.join(root, 'public', 'timelines', name + '.json'), 'w'))
            self.assertEqual(revisions.cited_titles(root), ['Alpha', 'Zed'])


class Table(unittest.TestCase):
    def test_table_marks_redirects_and_lists_missing(self):
        pages = {'Old': {'title': 'New', 'revision': 7, 'timestamp': 't7'}, 'Same': {'title': 'Same', 'revision': 9, 'timestamp': 't9'}}
        saved = wp_dump.page
        wp_dump.page = lambda t: pages.get(t)
        try:
            table, missing = revisions.build_table(['Old', 'Same', 'Gone'])
        finally:
            wp_dump.page = saved
        self.assertEqual(table, {'Old': {'revision': 7, 'timestamp': 't7', 'resolved': 'New'}, 'Same': {'revision': 9, 'timestamp': 't9'}})
        self.assertEqual(missing, ['Gone'])


if __name__ == '__main__':
    unittest.main()
