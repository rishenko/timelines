# Sample-and-judge report: persons-store-run3

- Candidates: 80 (`candidates.csv`, sha256 `c34f5771183520ef…`); seed 20261126; sample 80 of 80 requested; strata ['timeline']: anc 12/12, med 36/36, mod 32/32
- Readers: dev_a (80 rows)

- **dev_a alone:** 72 of 80 real = 90.0%; Wilson 95% 81.5%–94.8%
- **Strict (every reader who read a row says ok):** 72 of 80 real = 90.0%; Wilson 95% 81.5%–94.8%

## Rows not real (strict)

- `med | caliphate | Marajil | 786 – 14 September 786`: dev_a bad (umm walad (concubine))
- `med | caliphate | Maridah bint Shabib | 796 – 809`: dev_a bad (umm walad (concubine))
- `med | czechia | Branimir, Duke of Croatia | 879 – 892`: dev_a bad (Branimir (Croatia) copied onto the Czechia row)
- `med | eastern-roman | Thekla (daughter of Theophilos) | 842 – 856`: dev_a bad (co-empress)
- `med | sweden | Eric and Eric | 1066 – 1067`: dev_a bad (two contenders, not a ruler)
- `mod | croatia | Ferdinand Charles, Archduke of Austria | 13 September 1632 – 30 December 1662`: dev_a bad (Ferdinand Charles copied onto the Croatia row)
- `mod | ethiopia | Sabla Wangel Hailu | April 1910 – 1916`: dev_a bad (empress-designate, not a ruler)
- `mod | hungary | Charles II of Austria | 25 July 1564 – 10 July 1590`: dev_a bad (Charles II of Austria copied onto the Hungary row)

GATE: 72/80 = 90.0% · point ≥95% (pass-9 gate): FAIL · Wilson lower bound 81.5% (95% 81.5%–94.8%)
