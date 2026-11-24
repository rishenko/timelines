"""Tests for the two table readers in table_specs.py (inline wikitext; no dump)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import table_specs as T  # noqa: E402

MUGHAL = """{| class="wikitable"
! # !! Portrait !! Name !! Reign
|-
| 1 || [[File:Babur.jpg|80px]] || '''[[Babur]]'''<br>Zahir-ud-din || 1526–1530
|-
| 2 || [[File:Humayun.jpg|80px]] || '''[[Humayun]]''' || 1530–1540
|-
| colspan="3" | ''Suri Interregnum'' || 1540–1555
|-
| (2) || [[File:Humayun.jpg|80px]] || '''[[Humayun]]''' || 1555–1556
|-
| 3 || '''[[Akbar I|Akbar]]''' || 1556–1605
|}"""

SAPA = """{| class="wikitable"
! Title !! Sapa Inca !! Reign
|-
| rowspan="2" | Kingdom of Cusco || [[Manco Cápac]] || c. 1200
|-
| [[Sinchi Roca]] || c. 1230
|-
| Inca Empire || [[Pachacuti]]<ref>a note</ref> || 1438–1471
|}
{| class="wikitable"
! Spouse !! Note
|-
| [[Mama Ocllo]] || not a ruler
|}"""


class Readers(unittest.TestCase):
    def test_mughal_reads_the_bold_link_of_numbered_rows_only(self):
        # the interregnum row has no number and a restored reign "(2)" repeats a name: both are skipped; image cells don't shift it
        self.assertEqual(T.names_mughal(MUGHAL), ['Babur', 'Humayun', 'Akbar I'])

    def test_sapa_reads_the_sapa_inca_column_through_a_rowspan(self):
        # the rowspan Title column would shift the second row's cells without list_rows.expand; a table without the column is skipped
        self.assertEqual(T.names_sapa(SAPA), ['Manco Cápac', 'Sinchi Roca', 'Pachacuti'])


if __name__ == '__main__':
    unittest.main()
