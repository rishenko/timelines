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
| `emit.py` | writes `emitted/disaster-<timeline>.json` (events and sources) and pins each event's type in the timeline's reviewed `categories.json` (which wins over the keyword classifier); refuses a collapsed range |
| `emit_merge.py` | merges an emitted file into a generator's dataset; `scripts/ancient-classical/disasters.ts` does the same for Ancient |
| `review_disasters.py` | the review file: parity table, region × era balance against the quotas, every event with its quotes |

Rerun: `harvest/disasters.py` (needs the extractor's venv and the dump), `consensus.py`, `emit.py disaster`, then the generators
(`gen_modern`, `gen_medieval`, `scripts/ancient-classical/disasters.ts`, `pipelines/ancient/categories.py`, `npm run data -- run-all ancient-classical`, `npm run data -- build all`).
Generated data is never hand-edited: change a seed, a rule, the place table or an override.
