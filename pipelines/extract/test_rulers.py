"""Rulers pass cases that need no dump: list-page rows, infobox offices, Wikidata term checks, the review layout.
Run: pipelines/extract/.venv/bin/python -I pipelines/extract/test_rulers.py"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rulers as R  # noqa: E402
from review_file import Review, Row  # noqa: E402

TABLE = '''{| class="wikitable"
|-
! No. !! Portrait !! Name !! Elected !! Took office !! Left office
|-
! 3
| [[File:x.jpg|75px]]
| [[Rolandas Paksas]]<br>{{small|(born 1956)}}
| style="text-align:center;"| 2002–03
| style="text-align:center;"| 26 February 2003
| style="text-align:center;"| 6 April 2004
|-
| 80px || [[Dina Boluarte]]<br>{{small|(born 1962)}}<br>7 December 2022 || 10 October 2025
|-
| [[Joseph Boakai]]<br>{{small|(born 1944)}} || 22 January 2024 || Incumbent
|}'''

TEMPLATES = '''{{Officeholder table
| order2       = 7
| officeholder = [[Nicos Anastasiades]]
| born_year    = 1946
| term_start   = 28 February 2013
| term_end     = 28 February 2023
}}
{{List of rulers
| name4        = \'\'\'[[Jigme Singye Wangchuck|Jigme Singye]]\'\'\'
| native4      = {{lang|dz|x}}
| life4        = {{Birth date and age|1955|11|11|df=y}}
| reignstart4  = 21 July 1972
| reignend4    = 9 December 2006<br>{{small|(\'\'abdicated\'\')}}
}}'''


def first(text, person):
    pts, _ = R.list_rows(text, person)[0]
    return [p for p, _ in pts]


class ListRows(unittest.TestCase):
    def test_table_row_after_the_name(self):
        self.assertEqual(first(TABLE, 'Rolandas Paksas'), [(2002, None, None), (2003, None, None), (2003, 2, 26), (2004, 4, 6)])

    def test_dates_in_the_name_cell_and_life_years_dropped(self):
        self.assertEqual(first(TABLE, 'Dina Boluarte'), [(2022, 12, 7), (2025, 10, 10)])

    def test_incumbent_is_an_open_end(self):
        self.assertEqual(first(TABLE, 'Joseph Boakai'), [(2024, 1, 22), None])

    def test_officeholder_template(self):
        self.assertEqual(first(TEMPLATES, 'Nicos Anastasiades'), [(2013, 2, 28), (2023, 2, 28)])

    def test_numbered_template_fields_inside_nested_templates(self):
        self.assertEqual(first(TEMPLATES, 'Jigme Singye Wangchuck'), [(1972, 7, 21), (2006, 12, 9)])


class Interregna(unittest.TestCase):
    def test_table_row(self):
        t = '{| class="wikitable"\n|-\n| [[Sigismund II Augustus]] || 1548 || 1572\n|-\n| colspan="3" | \'\'Interregnum\'\' 7 July 1572 – 21 February 1573\n|}'
        got = R.interregna(t)
        self.assertEqual([(a, b) for a, b, _ in got], [((1572, 7, 7), (1573, 2, 21))])

    def test_template_field(self):
        t = "{{List of rulers\n| name5 = ''Interregnum''\n| reignstart5 = 1291\n| reignend5 = 1292\n}}"
        self.assertEqual([(a, b) for a, b, _ in R.interregna(t)], [((1291, None, None), (1292, None, None))])

    def test_heading(self):
        self.assertEqual([(a, b) for a, b, _ in R.interregna('x\n==First Interregnum (1649–1660)==\ny')],
                         [((1649, None, None), (1660, None, None))])

    def test_note_in_a_kings_row_is_not_one(self):
        t = '{|\n|-\n| [[Władysław III of Varna]] || 1434 || 1444 || Interregnum until 1447\n|}'
        self.assertEqual(R.interregna(t), [])

    def test_no_interregnum(self):
        self.assertEqual(R.interregna(TABLE), [])


class Offices(unittest.TestCase):
    def test_office_carries_to_later_terms(self):
        p = {'order': '[[Prime Minister of France]]', 'term_start': '4 April 1893', 'term_end': '3 December 1893',
             'term_start2': '30 May 1894', 'term_end2': '26 January 1895',
             'order4': 'Acting [[President of France]]', 'term_start4': '25 June 1894', 'term_end4': '27 June 1894'}
        got = {f: succ for f, _, succ in R.wp_reigns(p)}
        self.assertEqual(got['term_start2'], 'Prime Minister of France')
        self.assertEqual(got['term_start4'], 'Acting President of France')

    def test_not_head_offices(self):
        for t in ('Adviser to the President of Yemen', 'President of the North Yemen legislature',
                  'Secretary-General of the Non-Aligned Movement', 'First Secretary of the Free German Youth',
                  'President of the Pakistan Muslim League', 'Leader of the Opposition'):
            self.assertTrue(R.NOT_HEAD.search(t), t)
        for t in ('President of Yemen', 'Governor-General of Jamaica', 'Chairman of the Derg',
                  'President of the Provisional Government of the French Republic'):
            self.assertFalse(R.NOT_HEAD.search(t), t)

    def test_merge_keeps_offices_apart(self):
        pres = ((1848, 12, 20), (1852, 12, 2), None, None, 'P39 Q1')
        emp = ((1852, 12, 2), (1870, 9, 4), None, None, 'P39 Q2')
        self.assertEqual(len(R.merge_terms([pres, emp])), 2)
        self.assertEqual(len(R.merge_terms([pres, pres[:0] + ((1852, 12, 2), (1855, 1, 1), None, None, 'P39 Q1')])), 1)

    def test_same_office(self):
        self.assertFalse(R.same_office((1852, 12, 2), (1870, 9, 4), ((1848, 12, 20), (1852, 12, 2)), 2025))
        self.assertFalse(R.same_office((2019, 9, 30), (2019, 10, 1), ((2016, 7, 28), (2020, 5, 7)), 2025))
        self.assertTrue(R.same_office((1838, 8, 25), (1841, 11, 18), ((1839, 8, 25), (1841, 11, 18)), 2025))

    def test_title_change_chain_agrees(self):
        king = ((1774, 5, 10), (1791, 9, 4), None, None, 'P39 Q1')
        french = ((1791, 9, 4), (1792, 8, 10), None, None, 'P39 Q2')
        self.assertTrue(R.agrees((1774, 5, 10), (1792, 8, 10), king[:2], [king, french]))
        self.assertFalse(R.agrees((1774, 5, 10), (1792, 9, 21), king[:2], [king, french]))


class ReviewLayout(unittest.TestCase):
    def test_sections_and_summary(self):
        rv = Review(kind='Rulers', timeline='T', item='reigns', check_means='x')
        rv.rows.append(Row(name='A', coverage=0.5, years=(1500, 1600), extra={'Unchecked': 1},
                           items=[{'text': '- a', 'why': ['late']}, {'text': '- b', 'why': []}]))
        rv.empty = ['B']
        rv.ai_check = (0, 2)
        with tempfile.TemporaryDirectory() as d:
            path, man = os.path.join(d, 'review.md'), os.path.join(d, 'm', 'manifest.json')
            self.assertEqual(rv.write(path, man), (2, 1))
            md = open(path).read()
            entry = json.load(open(man))['reviews'][path]
        self.assertTrue(md.startswith('---\ndataset: "rulers"\ntimeline: "T"'))
        self.assertEqual((entry['items'], entry['to_check'], entry['ai_flagged_citations']), (2, 1, 0))
        self.assertIn('2 reigns on 1 of 2 rows', md)
        self.assertIn('none of the 2 cited pages is AI-flagged', md)
        self.assertIn('| A | 2 | 50% | 1 | 1 |', md)
        self.assertIn('- a\n  - ⚠ late', md)
        self.assertIn('**Rows with nothing found (1):** B', md)

    def test_group_section_and_counts(self):
        rv = Review(kind='Rulers', timeline='T', item='reigns', check_means='x', groups={'Ruled from another row': 'about'})
        rv.rows.append(Row(name='Ghana', items=[{'text': '- George V', 'group': 'Ruled from another row'}, {'text': '- b'}]))
        with tempfile.TemporaryDirectory() as d:
            path, man = os.path.join(d, 'review.md'), os.path.join(d, 'manifest.json')
            rv.write(path, man)
            md, entry = open(path).read(), json.load(open(man))['reviews'][path]
        self.assertEqual(entry['groups'], {'Ruled from another row': 1})
        self.assertIn('## Ruled from another row (1)\n\nabout\n\n**Ghana**\n\n- George V', md)
        self.assertIn('1 ruled from another row', md)

    def test_left_out_section(self):
        rv = Review(kind='Rulers', timeline='T', item='reigns', check_means='x')
        rv.rows.append(Row(name='Syria', items=[{'text': '- a'}]))
        rv.left_out['Generic office, unplaced'] = ('about', {'Syria': ['- Teimuraz I (1606 – 1648)']})
        with tempfile.TemporaryDirectory() as d:
            path, man = os.path.join(d, 'review.md'), os.path.join(d, 'manifest.json')
            self.assertEqual(rv.write(path, man), (1, 0))
            md, entry = open(path).read(), json.load(open(man))['reviews'][path]
        self.assertEqual(entry['left_out'], {'Generic office, unplaced': 1})
        self.assertIn('## Generic office, unplaced (1)\n\nabout\n\n**Syria**\n\n- Teimuraz I (1606 – 1648)', md)


if __name__ == '__main__':
    unittest.main()


class PickTheRowsOffice(unittest.TestCase):
    """pick() without a Wikidata term and with several spans (the rulers misses of the known-counts table specs, 2026-11-24)."""

    def spans(self, *items):
        from dates import spans as sp
        return [(f, sp(txt)[0], succ) for f, txt, succ in items]

    def test_kin_office_beats_the_earlier_span(self):  # Louis the Pious on Francia: "King of the Franks", not Aquitaine (781-814)
        s = self.spans(('reign', '11 September 813 – 20 June 840', 'Emperor of the Carolingian Empire'),
                       ('reign1', '28 January 814 – 20 June 840', 'King of the Franks'),
                       ('reign2', '781 – 20 June 814', 'King of Aquitaine'))
        got = R.pick(s, [], {'francia'}, (481, 987))
        self.assertEqual(got[0], 'reign1')

    def test_window_takes_the_earliest_inside(self):  # Gaozu of Tang on a 618-650 row: his reign, not the Duke of Tang or the retired years
        s = self.spans(('reign', '18 June 618 – 4 September 626', 'Emperor of the Tang dynasty'),
                       ('reign1', '572 – 20 December 617', 'Duke of Tang'),
                       ('reign2', '4 September 626 – 25 June 635', 'Retired Emperor of the Tang dynasty'))
        self.assertEqual(R.pick(s, [], {'tang'}, (618, 650))[0], 'reign')

    def test_window_prefers_the_rulers_own_office(self):  # Duke of Tang (inside the window here) and Retired Emperor lose to the reign
        s = self.spans(('reign1', '600 – 20 December 620', 'Duke of Tang'), ('reign', '18 June 619 – 4 September 626', 'Emperor of the Tang dynasty'))
        self.assertEqual(R.pick(s, [], {'tang'}, (618, 650))[0], 'reign')

    def test_window_skips_a_consort_span(self):  # Empress Kōgyoku: "Empress consort of Japan" (630-641) is not her reign (642-645)
        s = self.spans(('reign1', '630 – 641', 'Empress consort of Japan'), ('reign', '642 – 645', 'Empress of Japan'))
        self.assertEqual(R.pick(s, [], {'yamato'}, (500, 700))[0], 'reign')

    def test_an_exact_match_is_unchanged(self):  # the old behaviour: one span naming the row wins, whatever the window
        s = self.spans(('reign', '1643 – 1715', 'King of France'), ('reign1', '1600 – 1643', 'Duke of Orléans'))
        self.assertEqual(R.pick(s, [], {'france'}, (1500, 1800))[0], 'reign')


class OrdinalOffices(unittest.TestCase):
    def test_reigns_of_one_office_join_across_ordinals(self):  # Constantine Mavrocordatos: six reigns, each labelled "(Nth reign)"
        from dates import spans as sp
        items = [('reign', '1730 – 1730', 'Prince of Wallachia ; (1st reign)'), ('reign2', '1731 – 1733', 'Prince of Wallachia ; (2nd reign)'),
                 ('reign3', '1735 – 1741', 'Prince of Wallachia ; (3rd reign)'), ('reign7', '1730 – 1735', 'Prince of Moldavia ; (1st reign)')]
        spans = [(f, sp(txt)[0], succ) for f, txt, succ in items]
        got = R.picks(spans, [], {'wallachia'}, (1500, 1900))
        self.assertEqual(sorted(g[0] for g in got), ['reign', 'reign2', 'reign3'])  # the Moldavian reign is another office

    def test_norm_drops_ordinals_only(self):
        self.assertEqual(R.norm('Prince of Wallachia ; (2nd reign)'), R.norm('Prince of Wallachia ; (1st reign)'))
        self.assertNotEqual(R.norm('Prince of Moldavia'), R.norm('Prince of Wallachia'))


class UnnumberedSuccession(unittest.TestCase):
    def test_reign1_takes_the_unnumbered_succession(self):  # Matei Basarab: |succession=Prince of Wallachia beside |reign1=, so the list route could not see his office
        params = {'reign1': '1632 – 9 April 1654', 'succession': 'Prince of Wallachia', 'succession2': 'Other', 'reign2': '1660 – 1661'}
        got = {f: succ for f, s, succ in R.wp_reigns(params)}
        self.assertEqual(got['reign1'], 'Prince of Wallachia')
        self.assertEqual(got['reign2'], 'Other')


class SamePolityOtherTitle(unittest.TestCase):
    def test_prince_then_king_both_join(self):  # Nicholas I of Montenegro: Prince 1860-1910, King 1910-1918
        from dates import spans as sp
        items = [('reign', '28 August 1910 – 26 November 1918', 'King of Montenegro'), ('reign1', '13 August 1860 – 28 August 1910', 'Prince of Montenegro')]
        spans = [(f, sp(txt)[0], succ) for f, txt, succ in items]
        got = R.picks(spans, [], {'montenegro'}, (1500, 2026))
        self.assertEqual(sorted(g[0] for g in got), ['reign', 'reign1'])

    def test_another_polity_is_not_joined(self):
        from dates import spans as sp
        spans = [(f, sp(txt)[0], succ) for f, txt, succ in [('reign', '1900 – 1910', 'King of Montenegro'), ('reign1', '1890 – 1900', 'Prince of Serbia')]]
        self.assertEqual([g[0] for g in R.picks(spans, [], {'montenegro'}, (1500, 2026))], ['reign'])


class OfficeLabels(unittest.TestCase):
    def test_offices_without_an_item_row_resolve_by_label(self):  # Monarch of Italy (Q271148): P39 links, no wd_item row
        import sqlite3 as sq
        s = R.Sources.__new__(R.Sources)
        s.wd = sq.connect(':memory:')
        s.wd.execute('CREATE TABLE wd_item(qid TEXT, enwiki TEXT)')
        s.wd.execute("INSERT INTO wd_item VALUES ('Q38', 'Italy')")
        s.offices = sq.connect(':memory:')
        s.offices.execute('CREATE TABLE wd_office(qid TEXT, label TEXT, description TEXT, enwiki TEXT)')
        s.offices.execute("INSERT INTO wd_office VALUES ('Q271148', 'Monarch of Italy', 'office', NULL)")
        self.assertEqual(s.qid('Italy'), 'Q38')
        s.offices.execute("INSERT INTO wd_office VALUES ('Q12097', 'king', 'title', NULL)")
        self.assertEqual(s.qid('monarch of italy'), 'Q271148')
        self.assertIsNone(s.qid('king'))  # a generic one-word label never resolves
        self.assertEqual(s.title('Q271148'), 'Monarch of Italy')
        self.assertIsNone(s.qid('Nowhere'))

    def test_non_ruling_titles_of_the_polity_do_not_join(self):  # an heir's "Prince" span before the reign, a regent, a co-king, a claimant
        from dates import spans as sp
        for bad in ('Heir apparent of Montenegro', 'Crown Prince of Montenegro', 'Regent of Montenegro', 'Co-king of Montenegro', 'Junior King of Montenegro', 'Pretender to the throne of Montenegro'):
            spans = [(f, sp(txt)[0], succ) for f, txt, succ in [('reign', '1910 – 1918', 'King of Montenegro'), ('reign1', '1890 – 1910', bad)]]
            self.assertEqual([g[0] for g in R.picks(spans, [], {'montenegro'}, (1500, 2026))], ['reign'], bad)

    def test_a_vassals_title_naming_the_suzerain_does_not_join(self):  # "Count of Moravia (vassal of Bohemia)" is not a ruler of the Bohemia row
        from dates import spans as sp
        spans = [(f, sp(txt)[0], succ) for f, txt, succ in [('reign', '1100 – 1120', 'Duke of Bohemia'), ('reign1', '1080 – 1100', 'Count of Moravia (vassal of Bohemia)')]]
        self.assertEqual([g[0] for g in R.picks(spans, [], {'bohemia'}, (800, 1500))], ['reign'])


class NoDuplicateSpans(unittest.TestCase):
    def test_a_span_joined_twice_is_one_reign(self):  # Alexander II Mircea: the same-office and same-polity joins both took reign2
        from dates import spans as sp
        spans = [('reign', sp('1568 – 1574')[0], 'Prince of Wallachia'), ('reign2', sp('1574 – 1577')[0], 'Prince of Wallachia ; (2nd reign)')]
        got = R.picks(spans, [], {'wallachia'}, (1300, 1900))
        self.assertEqual(len(got), len({(g[0], g[1]['start'], g[1]['end']) for g in got}))
        self.assertEqual(sorted(g[0] for g in got), ['reign', 'reign2'])


class ReignType(unittest.TestCase):
    def test_a_caesar_span_is_not_a_reign(self):  # Constantius Chlorus: reign1 (Caesar) 293-305, reign (Augustus) 305-306
        params = {'reign1': '1 March 293 – 1 May 305', 'reign_type1': "[[Caesar (title)|''Caesar'']]", 'reign': '1 May 305 – 25 July 306', 'reign_type': "[[Augustus (title)|''Augustus'']]",
                  'succession': 'Roman emperor'}
        got = [f for f, s, succ in R.wp_reigns(params)]
        self.assertEqual(got, ['reign'])
