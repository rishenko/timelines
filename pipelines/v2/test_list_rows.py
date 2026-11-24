"""Row parser cases from the real list pages (python -m unittest from pipelines/v2 with the extract venv)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import list_rows as L  # noqa: E402

TITLES = {'Mount Tai earthquake', '479 BC Potidaea earthquake', '512 Shaanxi earthquake', 'Cairo', 'AD 17 Lydia earthquake', 'Great Famine of 1315–1317', 'Plague of Justinian', '893 Ardabil earthquake'}
exists = TITLES.__contains__


def one(text):
    r = L.rows(text, exists)
    assert len(r) == 1, r
    return r[0]


HIST = '''{| class="wikitable sortable"
! Date
! Time
! Event
! Magnitude
! Deaths
! Location
! Comments
|-
| data-sort-value="-17400101"|{{hs|-1780}}{{Circa}} 1780&nbsp;BC
| align="right"|
| [[Mount Tai earthquake]]
|
|
| Now [[China]]
|
|-
| data-sort-value="-04790101"|{{hs|-479}}479&nbsp;BC
| align="right"|
| [[479 BC Potidaea earthquake]]
| align="right"|7&nbsp;{{M|s}}
| 1,000
| {{flagdeco|Greece}} [[Greece]]
| Earthquake followed by a sea withdrawal
|}'''


class Rows(unittest.TestCase):
    def test_mount_tai_year_and_article(self):  # the old route read the year from the data-sort-value digits (4,790,101 as a toll)
        r = L.rows(HIST, exists)
        self.assertEqual((r[0]['year'], r[0]['article'], r[0]['toll']), (-1780, 'Mount Tai earthquake', 0.0))
        self.assertEqual((r[1]['year'], r[1]['article'], r[1]['toll']), (-479, '479 BC Potidaea earthquake', 1000.0))

    def test_place_link_is_not_the_article(self):  # "Cairo" on the Egypt list is a place; the row has no event article
        r = one('''{| class="wikitable"
! Date
! Time‡
! Place
! Fatalities
! Comments
|-
| November 27, 885
| 
| [[Cairo]]
| align="right"|1,000
|
|}''')
        self.assertEqual((r['year'], r['month'], r['day'], r['toll']), (885, 11, 27, 1000.0))
        self.assertIsNone(r['article'])

    def test_china_row_plain_article_cell(self):  # "China" was taken for the article; the Article cell is plain text
        r = one('''{| class="wikitable"
! Date
! Article
! Coord
! Location
! Mag
! Deaths
|-
| {{nat|512-05-21}} || 512 Shaanxi earthquake || {{coord|38.9|112.8}} || [[Dai County]], [[Shaanxi]] || 7.5 {{M|s}} ||5,310 (estimate)
|}''')
        self.assertEqual((r['year'], r['month'], r['day'], r['article'], r['toll']), (512, 5, 21, '512 Shaanxi earthquake', 5310.0))

    def test_famine_row_sort_templates_and_refs(self):
        r = one('''{| class="sortable wikitable"
! Date
! Event
! Location
! Death toll
|-
| {{Date table sorting|-441}} || The first famine recorded in ancient Rome.<ref>{{Cite web |title=x}}</ref> || [[Roman Republic|Ancient Rome]] ||
|}''')
        self.assertEqual((r['year'], r['article'], r['toll']), (-441, None, 0.0))

    def test_comment_link_names_the_event(self):
        r = one('''{| class="wikitable"
! Date
! Place
! Deaths
! Comments
|-
| {{hs|00017-00-00}}17
| Philadelphia ([[Alaşehir]])
| n/a
|''see'' [[AD 17 Lydia earthquake]]
|}''')
        self.assertEqual((r['year'], r['article']), (17, 'AD 17 Lydia earthquake'))

    def test_header_unit_million(self):  # the epidemics list gives "Death toll (million)": 100 is 100 million
        r = one('''{| class="wikitable"
! Rank
! Epidemics/pandemics
! Death toll (million)
! Years
|-
|2
|[[Plague of Justinian]]
| data-sort-value="57,500,000" |15–100
|541–549
|}''')
        self.assertEqual(r['toll'], 100e6)

    def test_toll_million(self):
        self.assertEqual(L.toll_of('2 million<ref>x</ref>'), 2e6)
        self.assertEqual(L.toll_of('{{nts|100000}}<ref name="a">x</ref>'), 100000.0)


class ArchitectNotes(unittest.TestCase):
    """The Architect's review of list_rows.py (2026-11-24), one test each."""

    def test_rowspan_and_colspan(self):  # 1: a rowspan date shifted the later cells; a colspan hid a column
        r = L.rows('''{| class="wikitable"
! Date
! Event
! Deaths
|-
| rowspan="2" | 1064
| [[Mustansirite Hardship]]
| 40,000
|-
| [[Plague of Justinian]]
| 100,000
|-
| colspan="2" | 893
| 7
|}''', lambda t: t in TITLES | {'Mustansirite Hardship'})
        self.assertEqual([(x['year'], x['article'], x['toll']) for x in r], [(1064, 'Mustansirite Hardship', 40000.0), (1064, 'Plague of Justinian', 100000.0), (893, None, 7.0)][:3])

    def test_mismatched_row_is_reported(self):
        rep = []
        r = L.rows('''{| class="wikitable"
! Date
! Event
! Deaths
|-
| 1064
| [[Mustansirite Hardship]]
|}''', exists, rep)
        self.assertEqual(r, [])
        self.assertIn('2 cells for 3 columns', rep[0]['skip'])

    def test_header_after_the_first_row_separator(self):  # 2: "{|\n|-\n! Date" opened a table the reader skipped
        r = L.rows('''{| class="wikitable"
|-
! Date
! Event
|-
| 1064
| [[Mustansirite Hardship]]
|}''', lambda t: t == 'Mustansirite Hardship')
        self.assertEqual((r[0]['year'], r[0]['article']), (1064, 'Mustansirite Hardship'))

    def test_table_without_a_date_column_is_reported(self):
        rep = []
        L.rows('{| class="wikitable"\n! Place\n! Deaths\n|-\n| Rome || 5\n' + '|-\n| Rome || 5\n' * 40 + '|}', exists, rep)
        self.assertEqual(rep[0]['table'], 'no date column')

    def test_bce_convention_per_template(self):  # 3: BCE is the negative BCE number everywhere; dts/nat with a negative year are not read
        one_ = lambda raw: L.year_of(raw)
        self.assertEqual(one_('{{hs|-1780}}{{Circa}} 1780&nbsp;BC')[0], -1780)
        self.assertEqual(one_('{{Date table sorting|-441}}')[0], -441)
        self.assertEqual(one_('479&nbsp;BC')[0], -479)  # dates.spans
        self.assertIsNone(one_('{{dts|-44|3|15}}'))
        self.assertEqual(one_('{{dts|684|11|29}}')[:3], (684, 11, 29))

    def test_toll_is_not_a_year(self):  # 4
        self.assertEqual(L.toll_of('1,000 (1556 est.)'), 1000.0)
        self.assertEqual(L.toll_of('about 5,000 in 1556'), 5000.0)
        self.assertEqual(L.toll_of('5,000–41,000 deaths'), 41000.0)
        self.assertEqual(L.toll_of('a toll of 1000'), 1000.0)  # "of 1000" is a toll, not a year

    def test_keyword_needs_a_noun(self):  # 5: bare "death" and "fire" caught non-disasters
        K = L.KEYWORD
        self.assertIsNone(K.search('Death of Alexander the Great'))
        self.assertIsNone(K.search('Greek fire'))
        self.assertIsNotNone(K.search('Great Fire of Rome'))
        self.assertIsNotNone(K.search('Black Death'))
        self.assertIsNotNone(K.search('Antonine Plague'))


if __name__ == '__main__':
    unittest.main()
