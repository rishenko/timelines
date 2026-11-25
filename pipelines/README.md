# Pipelines: the generators behind the Wikipedia-sourced timelines

**Edit generators here, in the repo.** The working copies they came from (outside the repo) are frozen as a record and no longer edited.

Each folder here rebuilds one timeline's source file (`data-src/<id>.json`) from an offline copy of English Wikipedia. Every date in the output cites the infobox field, lead sentence or section heading it was read from, and the helpers check that the cited text really holds the year. Rerunning a generator on the same dump reproduces the committed file byte for byte.

| Folder | Builds | Entry point |
|---|---|---|
| `modern-states/` | `data-src/modern-states.json`, plus `data-src/provenance/modern-states.json` and `modern-states-categories.json` | `gen_modern.py` |
| `medieval/` | `data-src/medieval.json`, plus `data-src/provenance/medieval.json` (the timeline arrives with its own merge) and `medieval-categories.json` | `gen_medieval.py` |
| `ancient/` | event categories, golden ages and eras for Ancient and Classical (its source file is kept by `scripts/`): the plans the build applies, `data-src/ancient-classical-categories.json` and `ancient-classical-periods.json`, and `data-src/provenance/ancient-classical-categories.json` | `categories.py`, `periods.py` |
| `common/` | shared code: the dump reader, the infobox extractor, the claim and citation helpers, the whole-article sentence finder (`wp_sections.py`), the event classifier, and golden ages and eras (`periods.json`, hand-kept: each date names the sentence, infobox parameter or short description that gives it; `periods.py` checks it against the dump) | (none) |
| `extract/` | candidates for review (not timeline data): a topic's dated events, in `pipelines/out/extract/<topic>/` | `extract.py` |

**Before you parse a dump, read [PARSING-NOTES.md](PARSING-NOTES.md):** what the dumps get wrong, and what the code does about it.

## Inputs

- **The Wikipedia dump:** `enwiki-20261101-pages-articles-multistream.xml.bz2` and its `-index.txt.bz2`, from [dumps.wikimedia.org](https://dumps.wikimedia.org/enwiki/), in `$TIMELINES_DATA/wikipedia/`. Every committed timeline was built from this dump. The two files together are about 25 GB.
- **The title index:** `index.sqlite` in the same folder (about 2 GB), built once per dump by `python3 -I pipelines/common/wp_index_db.py` (about 80 s).
- **Medieval only:**
  - `medieval/clio-years.json`, a summary of [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) v0.2.1. `medieval/clio_years.py` rebuilds it from the release's GeoJSON.
  - `medieval/descriptions.json`, the event descriptions: each is written in this project's words and lists its `basis` (article and a phrase of the sentence it rests on, which the build must find). `medieval/description_check.py` measures how closely a description follows its cited sentences (the longest run of ordinary words they share, names and numbers not counted) and the build refuses a run of 6 or more, or a 5-word-phrase share of 0.4 or more (licence option C: only source locators quote Wikipedia). Descriptions of the golden-age events are in `common/periods.json`.
  - The repo's own `public/timelines/ancient-classical.json`.
  - Modern States' committed build at `d9c6674`, read with `git show` (the seam at 1500).

## Settings

Both settings live in `common/settings.py`. Set them in the environment, or pass them as flags to a generator.

| Setting | Flag | Default | Meaning |
|---|---|---|---|
| `TIMELINES_DATA` | `--data DIR` | `~/data` | folder whose `wikipedia/` holds the dump and index |
| `TIMELINES_WP_DUMP` | `--dump NAME` | `enwiki-20261101` | which dump to read |
| `TIMELINES_CONNECTIONS_CLAIMS` | (none) | `modern-states/connections/connections-claims.json` | the claims file `modern-states/blocs.py` reads |

## Running

You need Python 3.11. Install once, from the repo root:

    python3.11 -m venv pipelines/.venv
    pipelines/.venv/bin/pip install -r pipelines/requirements.txt

Then run the generator and compile its output:

    pipelines/.venv/bin/python -I pipelines/modern-states/gen_modern.py      # about 4 minutes
    pipelines/.venv/bin/python -I pipelines/medieval/gen_medieval.py         # about 1 minute
    npm run data -- build modern-states

`git diff data-src/` should then show nothing. Two more checks:
- `npm run data:compare -- <before.json> <after.json>` compares two compiled files as the app draws them.
- `npm run fields:proof -- <timeline> --allow '<pattern>,…'` proves that only the named fields (or row order) changed since a git revision.
- After a code change, `git diff --exit-code data-src/` proves the change didn't move any data.

`gen_modern.py [repo] [module,module,...]` builds from some of the region modules only (a wave in progress). A run like that writes its manifest to `pipelines/out/` rather than over the committed one. The report (every row, its phases and claims) always goes to `pipelines/out/gen_modern-report.txt`, and `pipelines/out/` is not committed.

## Ancient: what regenerates, and in what order

`data-src/ancient-classical.json` is the one generated source that is also hand-kept: 904 events and all 384 rows exist only there (the scripts under `scripts/ancient-classical/` upsert onto it), and 830 events are owned by scripts and frozen files. Two rules follow, both decided by Kevin and the coordinator (2026-11-25):
- **Event order is history.** The scripts upsert, so Ancient's events stay in the order they were first added; a rebuild from nothing would reorder them (the same events, in a different order). Nobody writes them in a canonical order. Diffs of the file show new events at the position their script put them.
- **Nothing is typed into a generated file.** A reign goes into `extra-reigns.json` (or its freeze), then `npm run data:regen`. Scripts never delete: an event whose owner file no longer holds it would stay in Ancient for good, so `pipelines/common/owned_ids_check.py` (CI "Ancient owned ids", `check:all`'s `owned-ids`) fails when a `reign-`, `conflict-` or `disaster-` event in the source is in none of `pipelines/ancient/*reigns.json` or `pipelines/v2/emitted/*-ancient-classical.json`. To remove an owned event on purpose, delete it from the source file and add a `null` redirect.
- Yamato's traditional reigns stay in `yamato-reigns.json`, unapplied (`TRADITIONAL = false`), as a documented record.

## Connections claims (the Cold War blocs)

`modern-states/blocs.py` builds the bloc rows from `modern-states/connections/connections-claims.json`, which is committed. To rebuild the claims (a new dump, or new hand claims in `claims_data.py`):

    pipelines/.venv/bin/python -I pipelines/modern-states/connections/fetch.py          # caches the pages in pipelines/out/connections-cache/
    pipelines/.venv/bin/python -I pipelines/modern-states/connections/build_claims.py   # rewrites the claims file; exits 1 on any problem

`build_claims.py` checks every quote word for word against the cached page and maps each member to a Modern States row, using Modern States at a fixed commit (`MS_REV`) so the claims don't depend on the rows they produce. Its report goes to `pipelines/out/connections-report.txt`. Then rerun `gen_modern.py`.

## Event categories

`common/event_categories.py` holds the shared `category` facet and the classifier that gives each event up to two categories, main first (design: the event-categories proposal; the format is in `docs/data-format.md`, "Event categories"). The evidence, strongest first: the title (its head noun first), the event's own article (its categories, then its infobox type), the state infobox field the event was read from, and the description. Articles about a state, place or person are skipped.

- **Reviewed overrides** win over the classifier: `modern-states/categories.json` and `medieval/categories.json`, `{ "<event uuid>": ["<main>", "<second>"] }`, where an empty list means no category. A bad value fails the run.
- **Evidence:** a full run writes `data-src/provenance/<id>-categories.json`, one line per event with its categories and what each rests on ("reviewed" for an override). Events with an empty list are the review queue; a reviewed override of `[]` is written as `[[null, "reviewed: no category"]]`, so it leaves the queue.
- **Before a rerun (a rule change):** `npm run categories:diff [-- <timeline> …] [--all]` classifies every non-reviewed event with the classifier on `origin/main` (or `--base <rev>`) and with yours, grouped by what moves ("law → text: 5"). If nothing moves, no rerun is needed. Mapping tables for the larger kinds: `common/disaster_classes.json`, `common/text_classes.json` (Wikidata classes, and what counts as evidence).
- **Science pilot:** `common/science.json` lists 25 events in the `science` kind (discovery, invention, work), each with its quoted date and place; `common/science.py` adds them to Medieval and Modern States (Ancient: `scripts/ancient-classical/science.ts`), and `pipelines/.venv/bin/python -I pipelines/common/science.py --check` verifies every quote against the dump. Their sub-kinds are pinned categories (`science.category_pins`, applied after Kevin's reviewed overrides), not entries in each timeline's `categories.json`.
- **Known negatives:** `common/known_negatives.json` lists events a rule once got wrong (the Nanjing Massacre, Castle Bravo, the Balfour Declaration…), with values they must never get. `common/known_negatives.py` checks them (all cases with the dump; title evidence only without it, as in the classifier tests). Add a case whenever a rule over-matches. Without `pipelines/.venv`, `categories:proof` skips them with one line, so a classifier change should be proved on a machine with the venv and the dump.
- **Proof:** after a rerun, `npm run categories:proof -- <timeline>` shows that nothing but the categories changed since `origin/main`, and runs the known negatives.
- **Pilot:** `pipelines/.venv/bin/python -I pipelines/common/event_categories.py --pilot 20 public/timelines/<id>.json` prints a sample as a table.

## The date/event extractor (`extract/`)

It pulls as many dated events as it can for a topic (a war, a revolution, an uprising) out of the dump, as candidates for review. Accepted rows feed a generator as cited claims. Design: Workbench note "2026-11-22 Timelines extractor design". It has its own environment:

    python3.11 -m venv pipelines/extract/.venv && pipelines/extract/.venv/bin/pip install -r pipelines/extract/requirements.txt

Once per dump, build the lookup tables (about 25 min on 8 cores, about 10 GB, next to `index.sqlite`), then load the Wikidata ids from the dump's `page_props.sql.gz`:

    pipelines/extract/.venv/bin/python -I pipelines/extract/build_index.py --workers 8     # --sample 0.01 for a quick check
    pipelines/extract/.venv/bin/python -I pipelines/extract/page_props.py

Then, per topic:

    pipelines/extract/.venv/bin/python -I pipelines/extract/extract.py --topic ww1 --seed "World War I"

This writes `candidates.csv` (one row per date claim) and `report.md` to `pipelines/out/extract/<topic>/`:
- every date has a v5 `locator` and a verbatim quote;
- years are written astronomically, as the timelines store them: "15 March 44 BC" is `-0043-03-15`, and 1 BC is `0000` ([PARSING-NOTES.md](PARSING-NOTES.md#date-strings-extractdatespy));
- each row gets a suggested importance and event categories (from `common/event_categories.py`);
- `cand_id` is stable across runs, so review decisions (a committed `reviewed-<topic>.csv`) carry over to later dumps.

Tests (CI runs them too; inline fixtures only, no dump): `cd pipelines/extract && for t in test_dates test_extractors test_wd_join test_wikidata test_wd_status test_wd_crosscheck; do ../extract/.venv/bin/python -I $t.py; done`. The shared classifier's rules: `python3 -I pipelines/common/test_event_categories.py`. The shared source cache: `python3 -I pipelines/common/test_source_cache.py`. The Medieval description check: `python3 -I pipelines/medieval/test_description_check.py`; `python3 -I pipelines/medieval/description_check.py` lists the descriptions over a limit.

**Shared source cache** (`common/source_cache.py`): pipelines that cite papers or museum pages fetch them once into `$TIMELINES_DATA` (`europepmc/<doi>.json`, `europepmc/<PMC id>.xml`, `smithsonian/<page>.html`; open endpoints only, and never around a site that refuses automated readers), read them from disk (a missing file stops with `not cached: <path>`), and cite a phrase of at most 14 words, which the build checks the source actually holds. Earth and Life uses it; a new pipeline imports it instead of copying `evidence.py`.

**Ruler list pages** (`extract/list_rulers.py`, pilot on Asante and Kanem–Bornu; specs in `list-rulers.json`): a row whose article has no Wikidata office the rulers pass can read takes its reigns from the dated table of a "List of rulers of …" page, through the header reader in `pipelines/v2/list_rows.py`. The date is the row's own date cell, quoted as it reads; a row with only a duration ("20 years"), a single year or a regent's note is listed, never dated. `list_rulers.py --check` needs the dump: it proves the page states the count (Asante: "the 16th Asante king"; Kanem–Bornu: the numbered column ends at 77) and that the rows read plus the undated rows add up to it. Its reigns are merged into the frozen claims the same way as the rulers pass (`reigns_freeze.py --update`). A new row's list-page reigns can be frozen on their own instead (the Kingdom of Italy, Medieval, from *King of Italy*'s start and end columns, titled from the linked articles): `list_rulers.py --timeline medieval --freeze kingdom-of-italy --to pipelines/medieval/italy-reigns.json "<note>"`, which `gen_medieval.py` merges after `reigns.json`.

## Wikidata (`extract/wikidata.py`)

One pass over the Wikidata JSON dump (`$TIMELINES_DATA/wikidata/wikidata-<date>-all.json.bz2`, about 97 GiB, a single bz2 stream; which dump: `TIMELINES_WD_DUMP`, default `wikidata-20261116`) keeps, for items with an English Wikipedia article, their time claims (inception, dissolution, point in time, start and end, discovery, publication), the links the row passes need (instance of, part of, heads of state and government, positions held, conflicts, discoverer) and those links' start and end qualifiers. It writes `wikidata/wikidata-<date>.sqlite` (about 0.9 GiB) and takes about 2 hours on 4 cores:

    nohup pipelines/extract/.venv/bin/python -I -u pipelines/extract/wikidata.py > $TIMELINES_DATA/wikidata/pass.log 2>&1 &

- `nohup` keeps it running after the shell that started it closes.
- **Pause:** `touch $TIMELINES_DATA/wikidata/PAUSE` (or SIGTERM). It saves its offset; the next run skips back to it and goes on. `--restart` starts over and deletes the table file.
- **Status:** `pipelines/extract/.venv/bin/python -I pipelines/extract/wd_status.py` (whether it's running, how far along, what the tables hold, two spot checks; safe while the pass runs).
- Once the pass is complete, `extract.py` adds each candidate's Wikidata date and the comparison by itself; an unfinished table is ignored unless you pass `--wd-partial`.

**Reading the dump on every core: `common/pbz2.py`.** The dump is one bz2 stream. `indexed_bzip2` decompresses it in parallel but holds about 80 MB of native memory per GiB read (2.0.1, freed only by `close()`), about 135 GB for the whole dump, so a full pass cannot finish on a 64 GB machine; Python's `bz2` stays flat but uses one core (about 95 MiB/s, 5+ hours). `pbz2` finds the bzip2 block boundaries itself, decompresses groups of blocks with `bz2` in worker processes and hands them back in file order: about 1.1–1.3 GiB/s on 16–30 workers at flat memory, byte-identical to `indexed_bzip2`. The caller's parse function runs in the workers on whole lines; a line that crosses two groups is joined and parsed in the main process; each group gives a resume position (bit offset plus the partial line), so a pause resumes without re-reading the prefix:

    sys.path.insert(0, 'pipelines/common'); import pbz2
    for rows, pos in pbz2.map_lines(path, parse_lines, workers=30):   # parse_lines(lines: bytes), module-level
        ...                                                            # pos: a pbz2.Position to resume from, or None

A caller that checkpoints stores `pos` (its `carry`, the partial line, included) in the same transaction as the rows it covers. A false block magic (a 48-bit pattern inside compressed data, about 0.003 expected in the Wikidata dump) is recovered by dropping it: pass `recoveries=[]` to get each one (`pbz2.Recovery`: the dropped bit offsets and the range) and store the count and offsets in the pass's meta; each is also logged to stderr. A range that still does not decode raises, so a pass stops rather than losing data.

Tests (no dump; CI runs them): `python -I pipelines/common/test_pbz2.py`.

**One-off reign files** (`pipelines/ancient/rashidun-reigns.json`, `yamato-reigns.json`): single-row `rulers.py` runs, applied by `scripts/ancient-classical/rashidun.ts` and `yamato.ts`. The run behind both is stored in `pipelines/ancient/oneoff-inputs/` (`rulers-events.json`, `rulers.csv`), each file's `inputs` records its hash, and `test_oneoff_reigns.py` (in CI) proves every event equals the stored run's (the cosmetic " ; ( )" and the importance aside). To rebuild: `rulers.py --timeline ancient-classical --rows rashidun-caliphate,yamato` (Yamato needs `HEAD_OFFICES[('ancient-classical', 'yamato')]`, in `rulers.py`).

### Wikidata cross-check (`extract/wd_crosscheck.py`, report only)

Sets Wikidata's dates beside ours for every row, phase and event with a Wikipedia article (reigns are left out: the rulers pass compares them against the office's terms). It needs the finished Wikidata table (`wikidata-<date>.sqlite`) and reads the committed `public/timelines/*.json`; it changes no data, and Wikidata is not a cited date source.

    pipelines/.venv/bin/python -I pipelines/extract/wd_crosscheck.py [--out DIR] [timeline ...]    # all three timelines: a few minutes

It writes `crosscheck-<timeline>.jsonl` (one v2-candidate-shaped line per unit, keyed by QID: ours and Wikidata's dates, verdict, region, era) and `crosscheck-summary.md` (the verdict tally and a region × era table) to `pipelines/out/crosscheck/`, which is git-ignored: regenerate, don't commit. Verdicts: `agree`, `differs` (with `deltaYears`; ≤10 years is a slip, more is usually a unit mismatch such as a modern state's article against our historical row), `no date`, `no item`, `host` (an event citing a polity's article, not compared), `no article`. Read the differs rows as questions for a human, never as fixes. It joins the monthly refresh (re-run it on each new dump). Tests: `test_wd_crosscheck.py`.

What the dump holds and how fast it reads: [PARSING-NOTES.md, "Wikidata JSON"](PARSING-NOTES.md#wikidata-json).

**The people pass** (`extract/wd_people_attrs.py`, schema 2; design in the Workbench note "Timelines people pass design review"): one more streaming read of the same dump, into `wikidata-<dump>-people2.sqlite` (the schema 1 `-people.sqlite` stays as the first report's input). For every human with an English article it keeps the occupations, citizenships, birthplace, work location and residence (non-deprecated claims, preferred rank first; the first occupation is the primary one), born and died with precision, calendar model, rank and claim count, P27 with its P580/P582 dates, floruit (P1317), work period (P2031/P2032), the sitelink count, the English aliases and a `status` (`deceased`: a death claim; `living`: none and born 1916 or later; `unknown`: neither). Nobody is dropped (Kevin, 2026-11-24: living people are judged by importance like anyone else). The dump is read by `pipelines/common/pbz2.py` (block-parallel stdlib bz2, flat memory, about 1.1 GiB/s of JSON at 30 workers on the PC); the workers decompress a group of bz2 blocks, split, filter and parse and return only rows, which come back in order, so the rows do not depend on `--workers`. A checkpoint commits the rows with pbz2's resume point (bit offset, bytes, partial-line carry); a false block magic that pbz2 recovers is recorded in `meta.recoveries`. About 25 to 40 minutes at 30 workers:

    nice -n 19 pipelines/.venv/bin/python -I pipelines/extract/wd_people_attrs.py --workers 30     # pause: touch ~/data/wikidata/PAUSE-people, run again to resume
    pipelines/.venv/bin/python -I pipelines/extract/wd_people_attrs.py --check                                 # invariants and counts of the finished file
    pipelines/.venv/bin/python -I pipelines/extract/wd_people_attrs.py --out /tmp/p2.sqlite --max-gib 1 --restart   # a smoke run on the first GiB of JSON (works on any machine)

### Reign audit (`extract/reign_audit.py`, report mode)

The freeze guards (`reigns_freeze.wrong_kind`) run only on the reigns a freeze adds, so the committed reigns never passed them (the 2026-11-24 error-classes audit: 174 of 201 sampled reigns right, 86.6%). `reign_audit.py` re-reads the recorded rulers inputs (`regression-inputs` @ `kc2-inputs`, as the freeze regression does), builds every committed reign with its office, field and route (`reigns_freeze.py --audit`), and reports three checks: **governors** (a governor, governor-general, viceroy, commissioner or resident office with no head-of-state word), **other-row** (the office names another row and none of this row's name; or names this row only through a colonial phase) and **guards** (the freeze guards' own reason, re-run on committed reigns). Each has a reviewed allowlist, `extract/reign-audit/<check>-allow.json` (`allow`: a reign uuid; `row|other row` or `row:colonial` for other-row; a row id for governors only; each with a why). It prints the counts and writes one CSV per check to `pipelines/out/reign-audit/`; it fails nothing yet.

    pipelines/.venv/bin/python -I pipelines/extract/reign_audit.py INPUTS_DIR [--out DIR] [--timeline T]    # about 3 minutes


## Freeze regression (CI: "freeze-regression")

`extract/freeze_regression.py INPUTS_DIR` re-freezes the rulers inputs that `pipelines/<generator>/reigns.json` was frozen from and fails if any committed reign is lost or changed. CI runs it on every pull request. The inputs (`<timeline>/rulers.csv`, `<timeline>/rulers-events.json`) and `term-labels.json` (the infobox office labels the freeze reads from the dump, so CI needs no dump) are in `kc2-inputs/` (earlier: `main-inputs/`) on the data-only branch `regression-inputs`. Run it locally before asking for review of any change to `reigns_freeze.py` or the data it reads:

```
python -I pipelines/extract/freeze_regression.py <clone of regression-inputs>/kc2-inputs (main-inputs holds the earlier set)
```

- It freezes against `data-src` without the extra reigns (`--without-extras`, for generators with an `extra-reigns.json`): an event already on the timeline counts as a duplicate.
- It fails on any difference: a committed reign lost or changed, a reign the file does not have, a review line that differs, or recorded inputs that are not the ones it reads. There is no allow-list; a change that moves a reign is a re-freeze, in its own data pull request (Kevin's merge) that also adds the new inputs. If an exception is ever needed, give the entry an owner, a card, an expiry and the exact expected difference, and fail when it goes stale.
- A new bulk run or re-freeze that changes `reigns.json`'s recorded inputs adds its inputs to `regression-inputs` (a new commit and a new directory, e.g. `bulk7-inputs/`, never a rewrite) and moves the workflow's pinned `ref` and path to it, in the same pull request; record the labels with `freeze_regression.py <dir> --record` (needs the dump).
- Re-freeze with `pipelines/extract/refreeze.sh <timeline>` (`PY` and `R` set as in its header), never by running `reigns_freeze.py --update` on whatever `data-src` is checked out: the script regenerates the timeline first, freezes, then runs one `npm run data:regen`. A `data-src` left over from another branch can hold a reign the new freeze excludes, and the freeze then drops the real reign beside it as "already on the timeline" (merging main into reign-bulk lost Baudouin of Belgium 1951 that way). Check afterwards with `freeze_regression.py`.
- Against main, `common/reigns_guard.py` (CI step "Committed reigns unchanged") fails when a pull request loses or changes any committed reign, in `reigns.json` or any `*-reigns.json` frozen beside it, unless Kevin labels it `rishenko-reigns`. A re-freeze that moves reigns therefore needs his label even when its new inputs reproduce it.

## Provenance manifests

A full run also writes `data-src/provenance/<id>.json`. It lists every cited article, with its URL and every infobox field or sentence the timeline cites, and the dump the values were read from. It carries no timestamp, and it puts one source per line, so a later dump's rerun shows only the articles that changed.

## A new dump

1. Download it.
2. Run `wp_index_db.py --dump <name>`, or set `TIMELINES_WP_DUMP`. This rebuilds `index.sqlite`, which serves one dump at a time.
3. Rerun each generator with the same setting.
4. Rebuild the extract tables (`build_index.py`), then the list of pages flagged for AI-generated text that
   `npm run data:check` reads: `pipelines/extract/.venv/bin/python -I pipelines/extract/ai_flagged.py` writes
   `data-src/ai-flagged-pages.txt` (flagged articles and the redirects to them).
5. Review `git diff data-src/`; `npm run data:check` fails if a link now names a newly flagged page.

A cited field that changed or disappeared fails the run, or shows in the diff, depending on the helper. Pages that carry an AI-generated-text notice are refused as sources.

## Licences

- Cliopatria (Seshat Global History Databank) is CC BY 4.0, credited as a source wherever a date comes from it.
- Article text stays in the dump. Only years, field names and short quoted sentences appear in the output, cited to their articles (CC BY-SA 4.0).

## v2: one harvest per kind

`pipelines/v2/` holds the disasters pilot (harvest, consensus headline dates, place table, rules, overrides, emitters); see `pipelines/v2/README.md`.
