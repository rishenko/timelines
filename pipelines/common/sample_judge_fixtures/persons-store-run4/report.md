# Sample-and-judge report: persons-store-run4

- Candidates: 81 (`candidates.csv`, sha256 `1bf10e4d24105d1c…`); seed 20261127; sample 81 of 81 requested; strata ['timeline']: anc 15/15, med 32/32, mod 34/34
- Readers: dev_a (81 rows)

- **dev_a alone:** 77 of 81 real = 95.1%; Wilson 95% 88.0%–98.1%
- **Strict (every reader who read a row says ok):** 77 of 81 real = 95.1%; Wilson 95% 88.0%–98.1%

## Rows not real (strict)

- `anc | eastern-roman | Licinia Eudoxia | 437 – 455`: dev_a bad (Roman empress, a consort)
- `mod | ethiopia | Seble Wongel | 1518 – 1540`: dev_a bad (empress through marriage, a consort)
- `mod | mughal-empire | Mahadaji Shinde | 1784 – 12 February 1794`: dev_a bad (Naib Vakil, a deputy)
- `mod | philippines | Miguel Malvar | 19 April 1901 – 16 April 1902`: dev_a bad (President of the Philippines is disputed)

GATE: 77/81 = 95.1% · point ≥95% (pass-9 gate): PASS · Wilson lower bound 88.0% (95% 88.0%–98.1%)
