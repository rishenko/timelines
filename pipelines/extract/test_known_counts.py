"""Known-counts "table" kind (python -m unittest from pipelines/extract): the count is the article table's names found among the rows' reigns."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import known_counts as K  # noqa: E402


def ev(title, row, start=100):
    return {'uuid': 'x-' + title, 'title': title, 'start': start, 'tracks': [row]}


class Table(unittest.TestCase):
    def setUp(self):
        K._cache['t'] = {'events': [ev('Reign of Anna', 'r'), ev('Reign of Boris (emperor)', 'r'), ev('Tenure of Cyril (wife of Anna)', 'r'), ev('Reign of Dmitri', 'other')]}

    def spec(self, **kw):
        return {'rows': [['t', 'r']], 'measure': 'table', 'table': {'names': ['Anna', 'Boris', 'Dmitri', 'Anna']}, **kw}

    def test_missing_name_is_listed_and_not_counted(self):
        got, detail = K.table_count(self.spec())
        self.assertEqual((got, detail), (2, 'missing: Dmitri'))  # Dmitri is on another row; the duplicate Anna counts once

    def test_alias_and_not_required(self):
        got, detail = K.table_count(self.spec(aliases={'Dmitri': 'Cyril'}))
        self.assertEqual((got, detail), (3, ''))
        got, detail = K.table_count(self.spec(notRequired={'Dmitri': 'a usurper outside the data'}))
        self.assertEqual((got, detail), (2, ''))

    def test_extras_are_not_counted(self):  # Cyril is in the data but not in the table
        got, _ = K.table_count(self.spec(table={'names': ['Anna']}))
        self.assertEqual(got, 1)


if __name__ == '__main__':
    unittest.main()
