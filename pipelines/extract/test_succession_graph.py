"""succession_graph.py's pure parts (no dump or sqlite needed). Run: python -I pipelines/extract/test_succession_graph.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import succession_graph as SG  # noqa: E402


def r(qid, start, end, person=None):
    return {'uuid': f'reign-{qid}', 'person': person or qid, 'qid': qid, 'start': start, 'end': end, 'span': f'{start}–{end}'}


class Graph(unittest.TestCase):
    def test_a_gap_is_a_stretch_of_the_phase_no_reign_covers(self):
        reigns = [r('A', 0, 10), r('B', 10, 20), r('C', 30, 40)]
        got = SG.gaps(reigns, [('p', 0, 40)])
        self.assertEqual([(g[1], g[2], g[3]['qid'], g[4]['qid']) for g in got], [(20, 30, 'B', 'C')])

    def test_a_gap_under_the_tolerance_is_rounding_and_the_phase_ends_count(self):
        self.assertEqual(SG.gaps([r('A', 0, 10), r('B', 10.5, 20)], [('p', 0, 20)]), [])
        got = SG.gaps([r('A', 5, 10)], [('p', 0, 20)])
        self.assertEqual([(g[1], g[2]) for g in got], [(0, 5), (10, 20)])

    def test_an_overlap_needs_two_people_and_more_than_the_tolerance(self):
        a, b, c = r('A', 0, 10), r('B', 8, 20), r('A', 9.5, 12)
        self.assertEqual([(x['qid'], y['qid'], w) for x, y, w in SG.overlaps([a, b])], [('A', 'B', 2)])
        self.assertEqual(SG.overlaps([a, c]), [])  # the same person twice is not an overlap of two rulers
        self.assertEqual(SG.overlaps([r('A', 0, 10), r('B', 9.5, 20)]), [])

    def test_chain_makes_successor_and_predecessor_sets(self):
        succ, pred = SG.chain([], {('A', 'B'), ('A', 'C'), ('B', 'C')})
        self.assertEqual((succ['A'], pred['C']), ({'B', 'C'}, {'A', 'B'}))

    def test_phases_fall_back_to_the_span_then_to_the_reigns_own_extent(self):
        reigns = [r('A', 3, 10), r('B', 10, 25)]
        self.assertEqual(SG.phase_spans({'phases': [{'name': 'x', 'start': 0, 'end': 30}]}, reigns), [('x', 0, 30)])
        self.assertEqual(SG.phase_spans({}, reigns), [('reigns', 3, 25)])
        self.assertEqual(SG.phase_spans({'phases': [{'name': 'open', 'start': 5, 'end': None}]}, reigns), [('open', 5, 25)])

    def test_infobox_chain_reads_every_linked_predecessor_and_successor_field(self):
        params = {'predecessor': '[[Marcus Aurelius]]', 'successor': '[[Caracalla]]<br>[[Geta (emperor)|Geta]]', 'successor2': 'none', 'name': '[[X]]'}
        self.assertEqual(SG.infobox_chain(params), (['Marcus Aurelius'], ['Caracalla', 'Geta (emperor)']))
        self.assertEqual(SG.infobox_chain({'predecessor2': '[[A_B#c|x]]'}), (['A B'], []))

    def test_merge_sources_labels_each_edge_with_where_it_came_from(self):
        got = SG.merge_sources({('A', 'B'), ('B', 'C')}, {('B', 'C'), ('C', 'D')})
        self.assertEqual(got, {('A', 'B'): {'wikidata'}, ('B', 'C'): {'wikidata', 'wikipedia'}, ('C', 'D'): {'wikipedia'}})

    def test_overlap_uses_the_node_key_when_a_reign_has_no_qid(self):
        a, b = dict(r(None, 0, 10), key='X'), dict(r(None, 8, 20), key='Y')
        self.assertEqual(len(SG.overlaps([a, b])), 1)


if __name__ == '__main__':
    unittest.main()
