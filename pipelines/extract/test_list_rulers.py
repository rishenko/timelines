"""Tests for the ruler list-page reader (list_rulers.py): a table through its header, the date cell as quoted, notes and undated rows skipped.

    pipelines/extract/.venv/bin/python -I pipelines/extract/test_list_rulers.py
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common'), os.path.join(HERE, '..', 'v2')]
import list_rulers as L  # noqa: E402


class DatesOf(unittest.TestCase):
    def test_range_and_circa(self):
        (st, en, circa), = L.dates_of('c. 1097–1151')
        self.assertEqual((st[0], en[0], circa), (1097, 1151, True))

    def test_two_stretches(self):
        self.assertEqual([(s[0], e[0]) for s, e, _ in L.dates_of('1808–1811 1814–1817')], [(1808, 1811), (1814, 1817)])

    def test_single_year_and_durations_are_no_span(self):
        self.assertEqual(L.dates_of('1846'), [])
        self.assertEqual(L.dates_of('51–52 years'), [])
        self.assertEqual(L.dates_of('Unclear dates and sequence'), [])

    def test_present_leaves_the_end_open(self):
        (st, en, _), = L.dates_of('26 April 1999–present')
        self.assertEqual((st[0], en), (1999, None))


TABLE = """{| class="wikitable"
! Image
! Name
! Life
! Coronation
! Ceased to be King
|-
| [[File:A.jpg]]
| [[Alboin]]
| 530s – 28 June 572
| 568
| 572
|-
|
| [[Adaloald]]
| 602-628
| {{circa|616}}
| 626
|-
|
| [[Rule of the Dukes|Rule of the Dukes (interregnum)]]
| 574 – 584
| 574
| ?
|-
|
| [[Umberto II]]
| 1904 – 1983
| 9 May 1946
| present
|}"""
SPEC = {'start_header': 'coronation|became king', 'end_header': 'ceased to be king'}


class StartEndColumns(unittest.TestCase):
    def test_a_reign_is_the_start_cell_to_the_end_cell(self):
        rep = []
        r = {x['name']: x for x in L.read_table(TABLE, SPEC, rep)}
        self.assertEqual((r['Alboin']['st'][0], r['Alboin']['en'][0]), (568, 572))
        self.assertEqual(r['Alboin']['date_cell'], '568 | 572')  # quoted as the two cells read

    def test_a_circa_template_in_the_start_cell_is_read(self):
        r = {x['name']: x for x in L.read_table(TABLE, SPEC)}
        self.assertEqual((r['Adaloald']['st'][0], r['Adaloald']['en'][0], r['Adaloald']['circa']), (616, 626, True))

    def test_an_unknown_end_is_undated_and_present_leaves_it_open(self):
        rep = []
        r = {x['name']: x for x in L.read_table(TABLE, SPEC, rep)}
        self.assertNotIn('Rule of the Dukes', r)
        self.assertTrue(any(x.startswith('undated') and 'Rule of the Dukes' in x for x in rep))
        self.assertEqual((r['Umberto II']['st'][0], r['Umberto II']['en']), (1946, None))



HAN = """{| class="wikitable"
! Sovereign
! colspan="2" | Personal name
! Reigned from
! Reigned until
! colspan="4" | Temple name
|-
! [[Emperor Gaozu of Han|Emperor Gaozu]]
| Liu Bang
| {{Vtext-css3|劉邦}}
| 28&nbsp;February 202&nbsp;BC
| 1&nbsp;June 195&nbsp;BC
| Taizu
| colspan="3" {{N/A|—}}
|-
! [[Emperor Hui of Han|Emperor Hui]]
| Liu Ying
| {{Vtext-css3|劉盈}}
| 23&nbsp;June 195&nbsp;BC
| 26&nbsp;September 188&nbsp;BC
| Xiaohui
| colspan="3" {{N/A}}
|}"""
HAN_SPEC = {'start_header': '^reigned from', 'end_header': '^reigned until', 'name_header': '^sovereign'}
SHANG = """{| class="wikitable"
! rowspan="2" | Posthumous name
! colspan="2" | Tentative reign (BCE)
|-
! XSZ Project
! Other
|-
| Wu Ding
| 1250–1192<br/><small>({{Age in years|-1250|-1192}} years)</small>
| ?–1189
|-
| Zu Geng
| rowspan="2" | ''1191–1148''
| 1188–1178
|-
| Zu Jia
| 1177–1148
|}"""


class AncientListPages(unittest.TestCase):
    def test_a_cell_the_na_template_fills_keeps_its_spans(self):  # List of emperors of the Han dynasty: `| colspan="3" {{N/A|—}}`
        r = {x['name']: x for x in L.read_table(HAN, HAN_SPEC)}
        self.assertEqual((r['Emperor Gaozu']['st'][0], r['Emperor Gaozu']['en'][0]), (-202, -195))
        self.assertEqual((r['Emperor Hui']['st'][0], r['Emperor Hui']['en'][0]), (-195, -188))

    def test_the_header_era_is_applied_and_a_shared_date_dates_no_king(self):  # List of Chinese monarchs, Shang: "Tentative reign (BCE)"
        spec = {'name_header': '^posthumous', 'date_header': 'tentative', 'era': 'BCE', 'skip_shared_dates': True}
        r = {x['name']: x for x in L.read_table(SHANG, spec)}
        self.assertEqual((r['Wu Ding']['st'][0], r['Wu Ding']['en'][0], r['Wu Ding']['date_cell']), (-1250, -1192, '1250–1192 BCE'))
        self.assertNotIn('Zu Geng', r)  # 1191–1148 over two kings is no king's own reign
        self.assertNotIn('Zu Jia', r)

    def test_explicit_years_refuse_a_part_of_a_century(self):  # List of monarchs of Kush: "Second half of the 7th century BCE" is no date
        self.assertEqual(L.dates_of('Second half of the 7th century BCE', True), [])
        (st, en, circa), = L.dates_of('Early 4th century BCE (c. 400–360 BCE)', True)
        self.assertEqual((st[0], en[0], circa), (-400, -360, True))


class ReignName(unittest.TestCase):
    def test_title_from_article_is_opt_in(self):  # the King of Italy list's "Guy" links Guy III of Spoleto
        r = {'name': 'Guy', 'article': 'Guy III of Spoleto '}
        self.assertEqual(L.reign_name(r, {'title_from': 'article'}), 'Guy III of Spoleto')
        self.assertEqual(L.reign_name(r, {}), 'Guy')
        self.assertEqual(L.reign_name({'name': 'Ratold', 'article': None}, {'title_from': 'article'}), 'Ratold')

class Diff(unittest.TestCase):
    def test_same_ruler_ignores_titles_diacritics_and_brackets(self):
        self.assertTrue(L.same_ruler('Emperor Wen', 'Wen of Han'))
        self.assertTrue(L.same_ruler('Ḫattušili I', 'Hattusili I'))
        self.assertTrue(L.same_ruler('Chimalpopoca', 'Chimalpopoca (Tlacopan)'))
        self.assertFalse(L.same_ruler('Agum I', 'Agum III'))
        self.assertFalse(L.same_ruler('', 'X'))


if __name__ == '__main__':
    unittest.main()
