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


if __name__ == '__main__':
    unittest.main()
