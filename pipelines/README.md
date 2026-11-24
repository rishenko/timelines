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

Tests (CI runs them too; inline fixtures only, no dump): `cd pipelines/extract && for t in test_dates test_extractors test_wd_join test_wikidata test_wd_status; do ../extract/.venv/bin/python -I $t.py; done`. The shared classifier's rules: `python3 -I pipelines/common/test_event_categories.py`. The Medieval description check: `python3 -I pipelines/medieval/test_description_check.py`; `python3 -I pipelines/medieval/description_check.py` lists the descriptions over a limit.

## Wikidata (`extract/wikidata.py`)

One pass over the Wikidata JSON dump (`$TIMELINES_DATA/wikidata/wikidata-<date>-all.json.bz2`, about 97 GiB, a single bz2 stream; which dump: `TIMELINES_WD_DUMP`, default `wikidata-20261116`) keeps, for items with an English Wikipedia article, their time claims (inception, dissolution, point in time, start and end, discovery, publication), the links the row passes need (instance of, part of, heads of state and government, positions held, conflicts, discoverer) and those links' start and end qualifiers. It writes `wikidata/wikidata-<date>.sqlite` (about 0.9 GiB) and takes about 2 hours on 4 cores:

    nohup pipelines/extract/.venv/bin/python -I -u pipelines/extract/wikidata.py > $TIMELINES_DATA/wikidata/pass.log 2>&1 &

- `nohup` keeps it running after the shell that started it closes.
- **Pause:** `touch $TIMELINES_DATA/wikidata/PAUSE` (or SIGTERM). It saves its offset; the next run skips back to it and goes on. `--restart` starts over and deletes the table file.
- **Status:** `pipelines/extract/.venv/bin/python -I pipelines/extract/wd_status.py` (whether it's running, how far along, what the tables hold, two spot checks; safe while the pass runs).
- Once the pass is complete, `extract.py` adds each candidate's Wikidata date and the comparison by itself; an unfinished table is ignored unless you pass `--wd-partial`.

What the dump holds and how fast it reads: [PARSING-NOTES.md, "Wikidata JSON"](PARSING-NOTES.md#wikidata-json).

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
