# Pipelines: the generators behind the Wikipedia-sourced timelines

**Edit generators here, in the repo.** The working copies they came from (outside the repo) are frozen as a record and no longer edited.

Each folder here rebuilds one timeline's source file (`data-src/<id>.json`) from an offline copy of English Wikipedia. Every date in the output cites the infobox field, lead sentence or section heading it was read from, and the helpers check that the cited text really holds the year. Rerunning a generator on the same dump reproduces the committed file byte for byte.

| Folder | Builds | Entry point |
|---|---|---|
| `modern-states/` | `data-src/modern-states.json`, plus `data-src/provenance/modern-states.json` | `gen_modern.py` |
| `medieval/` | `data-src/medieval.json`, plus `data-src/provenance/medieval.json` (the timeline arrives with its own merge) | `gen_medieval.py` |
| `common/` | shared code: the dump reader, the infobox extractor, and the claim and citation helpers | (none) |

## Inputs

- **The Wikipedia dump:** `enwiki-20261101-pages-articles-multistream.xml.bz2` and its `-index.txt.bz2`, from [dumps.wikimedia.org](https://dumps.wikimedia.org/enwiki/), in `$TIMELINES_DATA/wikipedia/`. Every committed timeline was built from this dump. The two files together are about 25 GB.
- **The title index:** `index.sqlite` in the same folder (about 2 GB), built once per dump by `python3 -I pipelines/common/wp_index_db.py` (about 80 s).
- **Medieval only:**
  - `medieval/clio-years.json`, a summary of [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) v0.2.1. `medieval/clio_years.py` rebuilds it from the release's GeoJSON.
  - `medieval/descriptions.json`, the event descriptions.
  - The repo's own `public/timelines/ancient-classical.json`.
  - Modern States' committed build at `e585724`, read with `git show` (the seam at 1500).

## Settings

Both settings live in `common/settings.py`. Set them in the environment, or pass them as flags to a generator.

| Setting | Flag | Default | Meaning |
|---|---|---|---|
| `TIMELINES_DATA` | `--data DIR` | `~/data` | folder whose `wikipedia/` holds the dump and index |
| `TIMELINES_WP_DUMP` | `--dump NAME` | `enwiki-20261101` | which dump to read |
| `TIMELINES_CONNECTIONS_CLAIMS` | (none) | `timelines-analysis/2026-11-22-connections/connections-claims.json` in the data folder | the claims file `modern-states/blocs.py` reads |

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
- After a code change, `git diff --exit-code data-src/` proves the change didn't move any data.

`gen_modern.py [repo] [module,module,...]` builds from some of the region modules only (a wave in progress). A run like that writes its manifest to `pipelines/out/` rather than over the committed one. The report (every row, its phases and claims) always goes to `pipelines/out/gen_modern-report.txt`, and `pipelines/out/` is not committed.

## Provenance manifests

A full run also writes `data-src/provenance/<id>.json`. It lists every cited article, with its URL and every infobox field or sentence the timeline cites, and the dump the values were read from. It carries no timestamp, and it puts one source per line, so a later dump's rerun shows only the articles that changed.

## A new dump

1. Download it.
2. Run `wp_index_db.py --dump <name>`, or set `TIMELINES_WP_DUMP`. This rebuilds `index.sqlite`, which serves one dump at a time.
3. Rerun each generator with the same setting.
4. Review `git diff data-src/`.

A cited field that changed or disappeared fails the run, or shows in the diff, depending on the helper. Pages that carry an AI-generated-text notice are refused as sources.

## Licences

- Cliopatria (Seshat Global History Databank) is CC BY 4.0, credited as a source wherever a date comes from it.
- Article text stays in the dump. Only years, field names and short quoted sentences appear in the output, cited to their articles (CC BY-SA 4.0).
