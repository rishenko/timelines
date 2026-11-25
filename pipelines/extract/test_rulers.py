"""Rulers pass cases that need no dump: list-page rows, infobox offices, Wikidata term checks, the review layout.
Run: pipelines/extract/.venv/bin/python -I pipelines/extract/test_rulers.py"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import head_spans  # noqa: E402
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
                  'President of the Pakistan Muslim League', 'Leader of the Opposition',
                  'Head of the Federal Department of Defence', 'Legislative seat: Canton of Zürich'):
            self.assertTrue(R.NOT_HEAD.search(t), t)
        for t in ('President of Yemen', 'Governor-General of Jamaica', 'Chairman of the Derg',
                  'President of the Provisional Government of the French Republic'):
            self.assertFalse(R.NOT_HEAD.search(t), t)

    def test_party_state_head_offices(self):  # the Presidium, Council of State and Standing Committee chairs are heads of state (Wikipedia's lists)
        for t in ('Chairman of the Presidium of the Supreme Soviet of the Soviet Union', 'Co-Chairman of the Presidium of the Central Executive Committee of the Soviet Union',
                  'Chairman of the Council of State', 'President of the Council of State', "Chairman of the Standing Committee of the Supreme People's Assembly",
                  "President of the Presidium of the Supreme People's Assembly", "Chairman of the Presidium of the Great People's Khural"):
            self.assertFalse(R.NOT_HEAD.search(t), t)
            self.assertTrue(R.RULER_WORD.search(t), t)
            self.assertTrue(R.RULER_WORD.match(t), t)  # head_spans.names_row reads it with .match
        for t in ('Deputy Chairman of the Presidium of the Supreme Soviet of the Soviet Union', 'Chairman of the Presidium of the Supreme Soviet of the Russian SFSR',
                  'Chairman of the Council of Ministers', 'Chairman of the Presidium of the Central Committee', 'Full member of the 15th Politburo'):
            self.assertFalse(not R.NOT_HEAD.search(t) and R.RULER_WORD.search(t), t)  # never both a ruler word and not rejected

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
            md = open(path, encoding='utf-8').read()
            entry = json.load(open(man, encoding='utf-8'))['reviews'][path]
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
            md, entry = open(path, encoding='utf-8').read(), json.load(open(man, encoding='utf-8'))['reviews'][path]
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
            md, entry = open(path, encoding='utf-8').read(), json.load(open(man, encoding='utf-8'))['reviews'][path]
        self.assertEqual(entry['left_out'], {'Generic office, unplaced': 1})
        self.assertIn('## Generic office, unplaced (1)\n\nabout\n\n**Syria**\n\n- Teimuraz I (1606 – 1648)', md)


class YearlessStart(unittest.TestCase):
    def terms(self, **p):
        return [(f, x['start'], x['end']) for f, x, _ in R.wp_reigns(p)]

    def test_start_without_a_year_takes_the_ends(self):  # Derog Gioura's presidency, "10 March" – "29 May 2003<br>…"
        got = self.terms(order='President of Nauru', term_start='10 March', term_end='29 May 2003<br><small>[[Acting President]] until 20 March</small>')
        self.assertEqual(got, [('term_start', (2003, 3, 10), (2003, 5, 29))])

    def test_start_after_the_end_in_that_year_is_the_year_before(self):
        self.assertEqual(self.terms(office='X', term_start='10 December', term_end='29 January 2003'), [('term_start', (2002, 12, 10), (2003, 1, 29))])

    def test_year_only_or_dayless_end_does_not_raise(self):  # tuples with None: "10 March" + "2003", "10 May" + "May 2003"
        self.assertEqual(self.terms(office='X', term_start='10 March', term_end='2003'), [('term_start', (2003, 3, 10), (2003, None, None))])
        self.assertEqual(self.terms(office='X', term_start='10 May', term_end='May 2003'), [('term_start', (2003, 5, 10), (2003, 5, None))])
        self.assertEqual(self.terms(office='X', term_start='10 June', term_end='May 2003'), [('term_start', (2002, 6, 10), (2003, 5, None))])

    def test_month_only_and_no_end_are_not_guessed(self):
        self.assertEqual(self.terms(office='X', term_start='March', term_end='May 2003'), [])
        self.assertEqual(self.terms(office='X', term_start='10 March', term_end=''), [])


class PersonsLookup(unittest.TestCase):
    """The persons store is a lookup only (Kevin, 2026-11-24: "Park; titles only"): it names people, never places a reign."""

    def sources(self):
        import sqlite3 as sq
        s = R.Sources.__new__(R.Sources)
        s.wd = sq.connect(':memory:')
        s.wd.execute('CREATE TABLE wd_item(qid TEXT, enwiki TEXT)')
        s.wd.execute("INSERT INTO wd_item VALUES ('Q38', 'Italy')")
        s.wd.execute('CREATE TABLE wd_link(qid TEXT, prop TEXT, target TEXT, rank TEXT, sid TEXT)')
        s.persons = sq.connect(':memory:')
        s.persons.execute('CREATE TABLE wd_person(qid TEXT, label TEXT, description TEXT, enwiki TEXT, p31 TEXT, p39 TEXT, born TEXT, died TEXT)')
        s.persons.execute("""INSERT INTO wd_person VALUES ('Q99', 'Paullu Inca', NULL, 'Paullu Inca', '["Q5"]',
                             '[["Q555", "+1537-00-00T00:00:00Z", "+1549-05-01T00:00:00Z"]]', NULL, NULL)""")
        return s

    def test_qid_never_reads_the_store_so_no_reign_can_come_from_it(self):
        s = self.sources()
        self.assertEqual(s.qid('Italy'), 'Q38')
        self.assertIsNone(s.qid('Paullu Inca'))
        self.assertEqual(s.store_person('Paullu Inca'), 'Q99')
        self.assertIsNone(s.store_person('Italy'))  # not in the store: the store holds only what wd_item lacks here
        self.assertIsNone(s.title('Q99'))  # title() and p39_terms() never read the store: no other route gains a ruler from it
        self.assertEqual(s.p39_terms('Q99'), [])
        self.assertEqual(s.store_title('Q99'), 'Paullu Inca')

    def test_its_terms_come_from_the_time_strings(self):
        self.assertEqual(self.sources().store_p39('Q99'), [((1537, None, None), (1549, 5, 1), None, None, 'P39 Q555')])

    def test_no_store_file_is_no_lookup(self):
        s = self.sources()
        s.persons = False
        self.assertIsNone(s.store_person('Paullu Inca'))
        self.assertIsNone(s.store_title('Q99'))


class RealmClip(unittest.TestCase):  # recall pass 2026-11-24: a monarch shared with the UK, on a realm's row
    REALM = ('Monarchy of Ceylon (1948–1972)', 'Ceylon', (1948, 2, 4), (1972, 5, 22), 'began 4 February 1948; ended 22 May 1972')

    def test_office_names_the_realm(self):
        self.assertEqual(R.REALM_OFFICE.match('monarch of the Dominion of Ceylon').group(1), 'Ceylon')
        self.assertEqual(R.REALM_OFFICE.match('monarch of the commonwealth realm of the Gambia').group(1), 'Gambia')
        self.assertIsNone(R.REALM_OFFICE.match('President of Sri Lanka'))

    def test_reign_clipped_to_the_realm(self):  # George VI: 1936-1952 in his infobox, 1948-1952 as King of Ceylon
        got = R.clip_to_realm({'start': (1936, 12, 11), 'end': (1952, 2, 6), 'text': 'x', 'old_style': False}, '', self.REALM)
        self.assertEqual((got['start'], got['end']), ((1948, 2, 4), (1952, 2, 6)))

    def test_open_end_closed_by_the_realm(self):  # Elizabeth II: the realm ended in 1972
        got = R.clip_to_realm({'start': (1952, 2, 6), 'end': None, 'text': 'x', 'old_style': False}, '', self.REALM)
        self.assertEqual(got['end'], (1972, 5, 22))

    def test_another_office_and_a_span_after_the_realm_are_dropped(self):
        s = {'start': (1947, 8, 15), 'end': None, 'text': 'x', 'old_style': False}
        self.assertIsNone(R.clip_to_realm(s, 'Emperor of India', self.REALM))
        self.assertIsNone(R.clip_to_realm({'start': (2022, 9, 8), 'end': None, 'text': 'x', 'old_style': False}, '', self.REALM))

    def test_a_span_inside_the_realm_is_unchanged(self):
        s = {'start': (1950, 1, 1), 'end': (1960, 1, 1), 'text': 'x', 'old_style': False}
        self.assertIs(R.clip_to_realm(s, 'King of Ceylon', self.REALM), s)



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


class R15(unittest.TestCase):
    """R15 (2026-11-25): the span that holds the Wikidata term beats a closer one that starts later; touching head-office spells are each their own."""

    def _spans(self, items):
        from dates import spans as sp
        return [(f, sp(txt)[0], succ) for f, txt, succ in items]

    def test_span_holding_the_term_beats_a_later_closer_one(self):  # Victoria on Canada: 1837 reign, not Empress of India 1876
        spans = self._spans([('reign1', '1 May 1876 – 22 January 1901', 'Empress of India'), ('reign', '20 June 1837 – 22 January 1901', 'Queen of the United Kingdom')])
        term = ((1867, 7, 1), (1901, 1, 22))
        self.assertEqual(R.pick(spans, [term], {'canada'})[0], 'reign')

    def test_a_long_span_does_not_beat_a_short_term_that_starts_at_the_wikidata_date(self):  # Poher: a Senate term beside a two-month acting presidency
        spans = self._spans([('term_start', '1946 – 1992', 'President of the Senate'), ('term_start1', '2 April 1969 – 20 June 1969', 'Acting President of France')])
        term = ((1969, 4, 2), (1969, 6, 20))
        self.assertEqual(R.pick(spans, [term], {'france'})[0], 'term_start1')

    def test_touching_spell_under_another_title_of_the_polity_is_a_reign_of_the_row(self):
        spans = self._spans([('term_start', '1 January 1930 – 31 December 1935', 'Prime Minister of Ruritania'),
                             ('term_start1', '1 January 1936 – 1 June 1950', 'President of Ruritania'),
                             ('term_start2', '1 January 1970 – 1 June 1975', 'President of Ruritania')])
        term = ((1936, 1, 1), (1950, 6, 1))
        got = R.picks(spans, [term], {'ruritania'}, (1900, 2000))
        self.assertEqual([g[0] for g in got], ['term_start1', 'term_start2'])  # the same office again; the minister's years are no head office
        spans = self._spans([('term_start', '1 January 1930 – 31 December 1935', 'Provisional President of Ruritania'),
                             ('term_start1', '1 January 1936 – 1 June 1950', 'President of Ruritania')])
        self.assertEqual(sorted(g[0] for g in R.picks(spans, [term], {'ruritania'}, (1900, 2000))), ['term_start', 'term_start1'])


class NamesRow(unittest.TestCase):
    def test_the_polity_own_head_title_only(self):
        for t in ('President of Ruritania', '12th President of Ruritania', 'Provisional President of the Republic of Ruritania', 'De facto President of Ruritania'):
            self.assertTrue(head_spans.names_row(t, {'ruritania'}, R.RULER_WORD, R.ORDINAL), t)
        for t in ('President of the Football Association of Ruritania', 'Ambassador of Ruritania to the United Kingdom', 'President of the Presidency of Ruritania',
                  'President of the Institute of National Remembrance'):
            self.assertFalse(head_spans.names_row(t, {'ruritania'}, R.RULER_WORD, R.ORDINAL), t)


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


class ListHeadings(unittest.TestCase):  # recall pass 2026-11-24: Kandy's kings on List of Sri Lankan monarchs
    def test_a_link_carries_its_heading_and_the_parents(self):
        text = ("==Kingdom of Kotte (1412–1597)==\n[[Dharmapala of Kotte]]\n==Kingdom of Kandy (1469–1815)==\n"
                "===House of Vimaladharmasuriya (1592–1739)===\n| [[Senarat of Kandy|Senarat]] || 1604\n==Notes==\n[[Senarat of Kandy]]")
        got = R.list_headings(text)
        self.assertEqual(got['Dharmapala of Kotte'], {'kingdom of kotte (1412–1597)'})
        self.assertEqual(got['Senarat of Kandy'], {'kingdom of kandy (1469–1815)', 'house of vimaladharmasuriya (1592–1739)', 'notes'})


if __name__ == '__main__':
    unittest.main()
