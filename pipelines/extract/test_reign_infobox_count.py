"""python -I test_reign_infobox_count.py (from pipelines/extract)"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reign_infobox_count as C  # noqa: E402

# terms_of's shape: (field, start year, end year, text, normalised succession)
def term(field, start, succ='sultan of morocco', text=''):
    return (field, start, None, text or str(start), succ)


def carried(*starts, field='reign'):
    return [(f'u{i}', 'morocco', 'Abdallah', s, field) for i, s in enumerate(starts)]


class Compare(unittest.TestCase):
    def test_a_block_of_the_same_office_with_no_reign_is_missing(self):
        got = [term('reign', 1729), term('reign2', 1736)]
        same, other = C.compare(got, carried(1729))
        self.assertEqual([t[0] for t in same], ['reign2'])
        self.assertEqual(other, [])

    def test_a_block_within_a_year_of_a_carried_reign_is_carried(self):
        self.assertEqual(C.compare([term('reign', 1729)], carried(1730))[0], [])

    def test_a_block_with_no_succession_is_only_listed_as_unknown(self):
        same, other = C.compare([term('reign', 1729), term('reign2', 1736, succ='')], carried(1729))
        self.assertEqual(same, [])
        self.assertEqual([t[0] for t in other], ['reign2'])

    def test_a_block_of_another_office_is_not_the_rows(self):
        same, other = C.compare([term('reign', 1729), term('reign2', 1736, succ='king of spain')], carried(1729))
        self.assertEqual((same, other), ([], []))

    def test_a_term_the_person_carries_on_another_row_is_not_missing(self):
        mine = carried(1729) + [('v', 'spain', 'Abdallah', 1736, 'reign2')]
        self.assertEqual(C.compare([term('reign', 1729), term('reign2', 1736)], mine), ([], []))

    def test_the_office_is_computed_per_row(self):
        got = [term('reign', 1936, succ='king of uk'), term('reign2', 1947, succ='king of canada'), term('reign3', 1952, succ='king of canada')]
        mine = [('a', 'uk', 'George', 1936, 'reign'), ('b', 'canada', 'George', 1947, 'reign2')]
        self.assertEqual(C.compare(got, mine, 'uk')[0], [])
        self.assertEqual([t[0] for t in C.compare(got, mine, 'canada')[0]], ['reign3'])

    def test_local_era_blocks_are_skipped(self):
        self.assertEqual(C.compare([term('reign', 1729), term('reign2', 227, text='227 - 232 AH')], carried(1729)), ([], []))


if __name__ == '__main__':
    unittest.main()
