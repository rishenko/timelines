Frozen fixtures for `sample_judge.py` (pass 9, 2026-11-24): the two persons-store samples of PR #171.

- `persons-store-run3`: 80 rows, seed 20261126, before the doubted-ruler hold: 72 real = 90.0%, Wilson 81.5–94.8%.
- `persons-store-run4`: 81 rows, seed 20261127, after the hold and the cross-row hold: 77 real = 95.1%, Wilson 88.0–98.1%.

Each folder is what `draw` + a reader's verdicts leave behind: `candidates.csv`, `sample.json`, `verdicts-dev_a.csv`.
They were drawn by the pre-harness script (`spot3.py`), not by `draw`, so `candidates.csv` holds the sampled rows only and
`sample.json` records that. The verdicts are Dev A's single read (no second reader on these two). `test_sample_judge.py` runs
`report` on copies and checks the figures above. The earlier 40-row sample of the first run (seed 20261125) was read only in
part and is not kept.
