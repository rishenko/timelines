Frozen fixtures for `sample_judge.py` (pass 9, 2026-11-24): the persons-store samples of PR #171.

- `persons-store-run3`: 80 rows, seed 20261126, before the doubted-ruler hold: 72 real = 90.0%, Wilson 81.5–94.8%.
- `persons-store-run4`: 81 rows, seed 20261127, after the hold and the cross-row hold: 77 real = 95.1%, Wilson 88.0–98.1%.
- `persons-store-run5`: drawn by `draw` itself (seed 20261128, n 100, strata timeline, the 143 reigns run3 and run4 read left out), both readers blind on all 100 under the written rubric: Dev A 81, strict (both say ok) 80 of 100 = 80.0%, Wilson 71.1–86.7%, agreement 96/100, kappa 0.86. This is the figure behind Kevin's "Park; titles only".

Each folder is what `draw` + the readers' verdicts leave behind (the blind files are left out: they are reproducible from `sample.json`): `candidates.csv`, `sample.json`, `verdicts-dev_a.csv` (and `verdicts-dev_c.csv` in run5).
run3 and run4 were drawn by the pre-harness script (`spot3.py`), not by `draw`, so their `candidates.csv` holds the sampled rows only and
`sample.json` records that; their verdicts are Dev A's single, lenient read, which run5 shows overstated precision. With one reader the gate reports them INCOMPLETE (exit 1), run4's 95.1% included. `test_sample_judge.py` runs
`report` on copies and checks the figures above. The earlier 40-row sample of the first run (seed 20261125) was read only in
part and is not kept.
