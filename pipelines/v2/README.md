# pipelines/v2: one harvest per kind, shared by all timelines

The disasters pilot is the first kind built this way (design: the Workbench note "Timelines data pipeline v2 brief"). Big derived data
stays out of the repo (`$TIMELINES_DATA/v2/candidates/`); everything that decides what ships is here.

| file | what it does |
|---|---|
| `pilot-disasters.json` | the 24 named events (seed list): article, type id, countries, notes, questions for Kevin |
| `harvest/disasters.py` | reads each article from the Wikipedia dump: every date with its **verbatim quote and locator** (the quote gate drops a date whose quote isn't in the article), measures with their quotes (a sourced range keeps both ends), Wikidata's years as corroboration only |
| `consensus.py` | the headline date: the year most quoted claims agree on (Wikidata never decides; a tie goes to the infobox) |
| `places.json` | country (Wikidata QID) → the row that carries an event in each timeline |
| `rules/disasters.json` | which timeline an event belongs to by year; importance by toll, VEI or magnitude (the low end of a range) |
| `overrides/disasters.json` | reviewed calls, applied last, so reruns keep them (Hatepe's headline year) |
| `emit.py` | writes `emitted/disaster-<timeline>.json` (events and sources) and carries each event's type as a category membership; `pipelines/common/disaster_pins.py` reads those as a pinned layer (evidence "pinned: pipelines/v2/emitted/<file>"; it wins over the keyword classifier and never touches Kevin's reviewed `categories.json`); refuses a collapsed range |
| `emit_merge.py` | merges an emitted file into a generator's dataset; `scripts/ancient-classical/disasters.ts` does the same for Ancient |
| `review_disasters.py` | the review file: parity table, region × era balance against the quotas, every event with its quotes |

Rerun: `harvest/disasters.py` (needs the extractor's venv and the dump), `consensus.py`, `emit.py disaster`, then the generators
(`gen_modern`, `gen_medieval`, `scripts/ancient-classical/disasters.ts`, `pipelines/ancient/categories.py`, `npm run data -- run-all ancient-classical`, `npm run data -- build all`).
Generated data is never hand-edited: change a seed, a rule, the place table or an override.

## Conflicts (the second kind, pilot)

Battles as events, ranked by main combatant (the country is the first entry of a combatant column in the war article's infobox) and then inlinks; the same harvest, consensus, emit and review steps as disasters.

| file | what it does |
|---|---|
| `pilot-conflicts.json` | the pilot's countries (the articles that stand for each over time), the per-timeline cap, the named wars (with their member-list articles) and `row_aliases` (a successor article counts for its country's row) |
| `harvest/conflicts_index.py` | one pass over every military-conflict article (about 24,000): who fought (each combatant column's entries) and inlinks. Written to `$TIMELINES_DATA/v2/candidates/conflict-index.jsonl`; the categories alone miss Agincourt or Austerlitz |
| `harvest/conflicts.py` | reads each candidate article: quoted dates (infobox date, lead sentence), main combatant, ranked picks; the named wars with their participants and the joining or leaving years the infobox or a member list quotes |
| `build_places.py` | `$TIMELINES_DATA/v2/places.generated.json`: row → article → Wikidata item, with each row's region group and lifespan, from the compiled timelines (derived, so not in the repo) |
| `placement.py`, `rules/conflicts.json` | the conflicts rule: at most 3 main combatants → each country's row; more than 3 but one region → the region row; wider → the top-level Wars row; plus which timelines emit |
| `review_conflicts.py` | the review file: parity, region × era, the year-in-title check, duplicates, every event with its quoted date, the cut line, questions |
| `run_conflicts.sh` | the whole chain |

**Wars** are `theme` rows under the top-level Wars row, and each participant row gets a dated `memberOf` strip (no schema change). Known limits: `memberOf` means "belonged to", so the panel and table read a participant as a member of the war until sides (`role` on `memberOf`) exist; every participant has the war's whole span unless the infobox or a member list quotes its joining or leaving year; a participant is whatever the war's own infobox and member list name, mapped to the timeline's rows, and a membership outside its row's lifespan is not written.
