# Development

Vite, React 19 and TypeScript. Node 22.22.2 or newer on the 22 line, or 24.15 or newer (the test environment, jsdom, needs
those; the scripts in `scripts/` are TypeScript run directly by Node).

## Commands

```sh
npm install
npm run dev            # http://localhost:5173
npm test               # vitest
npm run test:watch     # vitest, rerunning on each change
npm run docs:check     # the code's file fields and npm scripts are all documented (CI runs it)
npm run lint           # oxlint
npm run build          # type-check (app and scripts) and build into dist/
npm run check:all      # before review: what CI runs, plus tsc -b, seams and categories proofs, one line each
npm run sources:check  # every kind of source the shipped data uses is named in the README and on the About page (CI runs it)
npm run landmarks:check # the coverage check: notable events, religions, documents and leaders (scripts/landmarks/*.json) against the data; prints a report, changes nothing
npm run preview        # serve dist/ locally
npm run deploy         # build and publish dist/ to GitHub Pages from this clone (the workflow below is the usual way)
```

**Known rows and known counts (data protection).** `pipelines/extract/known_rows.py` (rows whose reigns must come out right)
and `pipelines/extract/known_counts.py` (every count a cited Wikipedia sentence states: US presidents 45 men in 47
presidencies, Ottoman sultans 36, Fatimid caliphs 14…) both run in `npm run check:all` with `python3 -I`, with no dump or
venv. A failing count prints one line: the row, the expected number, the number found and the quoted source sentence.
`python3 -I pipelines/extract/known_counts.py --verify-sources` (extractor venv and the dump) checks that each quote is
still in its article, so a monthly refresh shows which stated numbers moved. Specs: `known-counts.json`, with the gaps
(no stated total, or no rows to count) listed in it.

**Deploying.** `.github/workflows/deploy.yml` publishes the site: it builds `main` on GitHub, runs lint and the
tests, pushes `dist/` to the `gh-pages` branch (as `npm run deploy` does) and waits until the live site serves the new
bundle. It runs only when started by hand, and only from `main`: Actions → Deploy → Run workflow, or
`gh workflow run deploy.yml --ref main` (then `gh run watch`). Every deploy needs Kevin's OK: the run waits in the
`production` environment until he approves it in the Actions UI. Building on GitHub
means nothing untracked in a local clone can end up on the site.

CI (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request, on Node 22 and 24: lint, tests,
build, `run-all --check` for each included timeline, and a check that the files in `public/timelines/` and the
key-event lists in `docs/` are what `data-src/` compiles to. `npm run data:check` also refuses any link in `data-src/`
to a Wikipedia page flagged for AI-generated text (`npm run data -- ai-flags --check`, against
`data-src/ai-flagged-pages.txt`; see [pipelines/README.md](../pipelines/README.md#a-new-dump)). If that check fails, run `npm run data -- build <timeline>`
and `npm run data -- importance <timeline>`, and commit the result. Last comes the id-stability check
(`npm run data -- ids --check`): no id that a link can name may disappear from a compiled timeline without an entry in
its `redirects` ([data-format.md](data-format.md#keeping-ids-stable)). The docs check (`npm run docs:check`) fails
when a field of the file format in `src/types.ts` isn't named in [data-format.md](data-format.md), as `field` or as a
key in an example, or when an npm script isn't named on this page.

**Pull requests** update the docs and app text they affect, in the same pull request: the template
(`.github/pull_request_template.md`) lists what to check. Reader-facing words follow the
[glossary](glossary.md).

`npm run check:all` runs, before you ask for review, everything CI checks except the compiled-files diff (it rewrites
files), plus the type-check of app and scripts, `seam-check`, `sources:check`, and `categories:proof` on every timeline against
`--base` (default `origin/main`). It prints one line per check and the end of each failing one's output; `--skip` and
`--only` take the names it prints. In a PR that raises the schema version, add `--schema-bump`: it runs
`fields:proof` on each timeline instead (`fields:<timeline>`), since `categories:proof` flags the version line.

Kevin's reviewed category overrides (`pipelines/{ancient,medieval,modern-states}/categories.json`) are his decisions. A pipeline that sets categories uses the pinned layer (`traditions.json`, `science.json`). The `overrides` check (`pipelines/common/overrides_guard.py`, also in CI on pull requests) fails when an override entry is added, removed or changed against the base. Label the pull request `kevin-overrides` for his own edits; locally, `check:all --skip overrides`. CI compares with main, not a stacked PR's base. It also fails, label or not, when an overridden event's categories in `public/timelines/<id>.json` differ from its override: Kevin's call goes into the overrides file and a generator rerun carries it into the data, never a hand edit of a generated plan such as `data-src/ancient-classical-categories.json`. It is a process guard against honest mistakes (one shared account), not a security control.

The `duplicates` check (`pipelines/common/duplicates_guard.py`, also in CI on pull requests, against main) fails when an added non-reign event has the same title as another starting within 2 years: a pipeline that has the same event shares it or adds a date claim to it. An intended second event with the same name goes in `pipelines/common/same-event.json` with a reason. It catches same-title repeats within a timeline only; the same event under another title, or across timelines, is still for review to catch. It also fails when a war in `pipelines/v2/pilot-conflicts.json` is `wide` (its own row under Wars) without a `wide_by` reason, since Kevin's rule places a war of up to 3 countries on their rows and a one-region war on the region row.

The `reigns` check (`pipelines/common/reigns_guard.py`, also in CI on pull requests, against main) compares every committed
reign file under `pipelines/` (`reigns.json` and any `*-reigns.json`, such as `yamato-reigns.json` or `italy-reigns.json`) with
main's copy by uuid. Added reigns pass; a reign lost or changed in any field fails unless Kevin labels the pull request
`kevin-reigns` (locally, `check:all --skip reigns`). `freeze_regression` proves a `reigns.json` reproduces from the inputs it
records; this check stops a pull request from re-freezing and re-recording those inputs unseen, and covers the frozen files
beside `reigns.json` that nothing re-freezes. The label is its own so that a category-overrides PR can't move a reign.

For a refactor that shouldn't change anything visible, compare the rendered page before and after it.
`npm run dom-snapshot` renders Ancient and Classical in many states (zooms, every row expanded, the table, the
detail panel, search results, keyboard zoom) and writes the markup to the file named by `SNAP_OUT`:

```sh
SNAP_OUT=before.txt npm run dom-snapshot   # on the code before the change
SNAP_OUT=after.txt npm run dom-snapshot    # after it
cmp before.txt after.txt                   # no output: nothing visible changed
```

Markup can match while pixels don't (one text node or two shape a label differently), so compare screenshots too.
`npm run zoom-shots` screenshots a timeline at each of its zoom steps, at a few center years, with rows as they open
and with every row expanded, and diffs them pixel by pixel against an earlier set (writing a `.diff.png` beside each
shot that differs). Serve the old code and the new on two ports (a `git worktree` of `main` for the old):

```sh
npm run zoom-shots -- --url http://localhost:4323/ --out shots/before                          # old code
npm run zoom-shots -- --url http://localhost:4324/ --out shots/after --compare shots/before    # new code
```

`--timeline <id>` picks the timeline (bundled, or from the folders in `TIMELINES_LOCAL_DATA`), `--at "-3000|-500|300"`
the center years and `--inc "10|50"` the zoom steps. Local timelines may change while you work: diff a frozen copy.

## Code map

| Path | What |
|---|---|
| `src/App.tsx` | The app shell: owns the open timeline's state and wires it to the toolbar, timeline and panels |
| `src/Boot.tsx` | Opens the page's timeline before the app starts: the site's list, `?data=<url>` and `?collection=<url>` links, update checks for timelines from links, the reader's own timelines, the welcome page |
| `scripts/landmarks-check.ts`, `scripts/landmarks/*.json` | The landmarks coverage check: draft lists of notable events, religions, documents and leaders (a quota per world region and era, for Kevin and regional readers to adjust) and a read-only report of which the data holds, with category, importance and date flags and the regional balance of the lists and of the data. Run it on another branch with `--data <worktree>/public/timelines` |
| `src/components/About.tsx` | The About this data page (`?page=about`, opened from the footer link in `Credits.tsx`; `Boot.tsx` shows it without loading a timeline). Its claims follow the README's "Data sources and AI use"; `npm run sources:check` (`scripts/source-kinds.ts`) fails when either leaves out a kind of source the shipped data uses, or the CC BY-SA carve-out for quoted text |
| `src/types.ts` | The format's types (`Dataset`, `Track`, `TimelineEvent`, `DateClaim`, …), at the current schema version (`SCHEMA_VERSION`; history in data-format.md, "Versions") |
| `public/timelines/` | The site's timelines and their list, `index.json` (format and checks in `src/data/timelineIndex.ts`; loading in `src/state/timelines.ts`) |
| `src/data/` | The validator (`validate.ts`), schema versions and migration (`migrate.ts`), the site's list format (`timelineIndex.ts`), and row proximity checks (`proximity.ts`) |
| `src/lib/calendar.ts` | Eras, year 0, parsing and formatting, round-year ruler ticks; deep time (`formatAgo`, `parseAgo`, ticks on round ages) |
| `src/lib/beforePresent.ts` | Reads `calendar.beforePresent` (deep time); the "c." fade from `circaShare` is `circaFadeAt` in `chronology.ts` |
| `src/lib/subYear.ts` | Months and days: zoom steps below a year, date positions, `inc`/`at` in links |
| `src/lib/lifespan.ts`, `memberOf.ts`, `succession.ts` | Lifespans worked out from phases; dated memberships (`memberOf`); the events that began and ended them |
| `src/lib/regions.ts`, `sets.ts` | The region filter's rules; comparison sets and their orders |
| `src/lib/categories.ts`, `src/state/categoryFilter.ts`, `src/components/CategoryGlyph.tsx` | Event categories: the filter's rules and state, and the glyph for each kind |
| `src/lib/reignLane.ts` | The reign lane: events with the `reign` or `interregnum` category go on their row's first event lines |
| `src/lib/periodLane.ts`, `src/data/period-lane.json` | The period lane: which events get their own line under each row's phases (golden ages, long society spans), and Kevin's include/exclude list |
| `src/timeline/OverviewStrip.tsx`, `overview.css` | The overview strip above the chart: a map of the whole timeline, the view outlined and the rest dimmed; click, drag or the keyboard move the chart |
| `src/lib/eras.ts`, `src/timeline/AgeStrip.tsx` | Ages (context spans of kind `age`: `meta.context`, `Track.context`): placing them on lines, the strip under the ruler (`AgeBars`); a row's ages are lines of its phase strip (`TimelineView`, `layoutPhaseStrips`) |
| `src/lib/cite.ts`, `src/components/CiteBox.tsx`, `CiteDialog.tsx` | Cite this (Chicago, BibTeX) and Report a problem (a pre-filled GitHub issue); the data version comes from `vite.config.ts` (`__DATA_VERSION__`) |
| `src/lib/chronology.ts` | Chronologies, date claims, derived alternatives, uncertainty ranges |
| `src/lib/tracks.ts` | Walking the row tree: ancestors, depth, children, lane order (use these, don't hand-roll walks) |
| `src/lib/search.ts`, `table.ts`, `tour.ts` | Search index and ranking; table view rows; the guided tour's steps |
| `src/lib/years.ts`, `urls.ts`, `theme.ts`, `claims.ts` | Date text; URL safety for untrusted timelines; theme presets; date claims as form fields |
| `src/timeline/scale.ts` | Piecewise-linear year→pixel scale with gap compression |
| `src/timeline/layout.ts` | Lanes from the row tree; row packing, `+N` clusters, phases |
| `src/timeline/TimelineView.tsx` | The chart: lanes from the row tree, windowed rendering (rows a screen above to 2.5 below, plus the rows holding the Tab stop or selection; marks a screen either side); composes the pieces below |
| `src/timeline/Ruler.tsx`, `Bands.tsx`, `LaneLabel.tsx`, `Marks.tsx` | The year ruler; lifespan and phase bands; row labels and their buttons; event and `+N` marks |
| `src/timeline/useViewport.ts` | Scroll position: center year, focus requests, keeping the selection on screen; the view's stretch for drawing (a vertical scroll re-renders only every half screen) |
| `src/timeline/useRovingFocus.ts`, `keyboard.ts` | Keyboard control of the chart (one Tab stop, arrow keys; phase strip lines are grid lines) and its movement rules |
| `src/timeline/gestures.ts` | Pinch zoom and long press |
| `src/cursor/meanwhile.ts`, `YearCursor.tsx` | The year cursor: a line at the year under the pointer (or placed with Y), its year chip, and the band above the chart saying what was going on then in the rows on screen (reign, phase, sub-rows, ongoing events, ages) |
| `src/print/PrintView.tsx`, `export.ts`, `print.css` | Print and Export: the view (years and rows on screen) as an SVG page. Print is the browser's (⌘P): App mounts the layer on `beforeprint` and print.css fits it to one landscape page. Export saves it as PNG or SVG |
| `src/timeline/rowsInView.ts` | Which rows have nothing near the view ("Hide rows with nothing in view") |
| `src/timeline/ConnectionLayer.tsx`, `anchors.ts` | Connection arrows; the years the ruler must cover |
| `src/map/mapData.ts`, `src/components/EventMap.tsx` | Event maps: which borders, pins and map images to draw for an event's year (see [Event maps](#event-maps)) |
| `src/state/dataset.ts`, `edits.ts`, `draft.ts` | Dataset reducer and edit operations; drafts stored as the reader's changes |
| `src/state/library.ts`, `useLibraryActions.ts` | The reader's own timelines: opening, uploading, updating, sharing |
| `src/state/collections.ts` | Shared lists (`?collection=`): reading, saving and removing them; `listTimelines` in `timelines.ts` merges them into the picker |
| `src/state/url.ts` | Reading the opening URL and keeping it in step with the view (thin wrappers over `viewState.ts`) |
| `src/state/viewState.ts`, `viewMigrate.ts`, `links.fixtures.json` | The view as a link (schema step D): `ViewState`, `parseView`/`serializeView`/`resolveView`, link versions (`v`), the fixed parameter order, the skipped-ids notice; frozen real links with the state each must parse to (entries are only ever added) |
| `src/state/` (others) | Filters, theme, chronology choices, focus requests, folded rows, zoom steps, panels, toasts, search actions |
| `src/components/` | Toolbar, panels (Filters, Legend, Customize, Dating), detail panel and editors, search box, table view, tour |
| `src/index.css`, `src/styles/` | Styles, one file per area (chart, side panel, legend, table view, phones…), imported by `index.css` in cascade order |
| `src/test/fixtures.ts` | A small fictional timeline for tests |
| `data-src/`, `scripts/` | Readable source files for the included timelines, and the scripts that build them |

Stored years are astronomical (there is always a year 0), so subtraction gives durations in every calendar; only
display depends on the calendar. See [data-format.md](data-format.md#years).

## Building Ancient and Classical

Ancient and Classical is written in `data-src/ancient-classical.json` with readable dates (`"start": "c. 1595 BCE"`)
and compiled into `public/timelines/ancient-classical.json`. `scripts/lib/timelines.ts` lists it with its files and
scripts. `npm run data` takes its short name (`ancient-classical`) or `all`:

```sh
npm run data -- build <timeline|all>        # compile data-src/ → public/timelines/ (also npm run data:build)
npm run data -- importance <timeline|all>   # apply the plans (importance, row links, memberships, event categories); refresh docs/<short>-key-events.md (also npm run importance)
npm run data -- format <timeline|all>       # re-format a source file (also npm run format:src for all)
npm run data -- row-order <timeline>        # how close related rows sit; --best finds a passing order (npm run row-order: Ancient, --best)
npm run data -- run-all <timeline>          # replay every content script in order, then importance
npm run data -- run-all <timeline> --check  # report whether the scripts reproduce the source file; changes nothing (also npm run data:check)
npm run data -- ids --check                 # fail on ids lost since origin/main without a redirect (CI runs it)
npm run data -- index                       # print the site's list of timelines as the build makes it
```

**Golden ages and eras** come from a plan, `data-src/ancient-classical-periods.json` (`meta.eras` and the golden-age
events; source files and plans stay schema v7 until the generators write v8, and compiling lifts them to context
spans), written by `pipelines/ancient/periods.py` from `pipelines/common/periods.json`, the shared list the Medieval
and Modern States generators read too. **Event categories** come from another plan,
`data-src/ancient-classical-categories.json` (the `category` facet and each event's categories, main first), written by
`pipelines/ancient/categories.py`: it runs the shared classifier (`pipelines/common/event_categories.py`, as the
generators do) with the reviewed overrides in `pipelines/ancient/categories.json`, and writes the evidence for each
event to `data-src/provenance/ancient-classical-categories.json`. `importance` applies the plans in this order: periods
(so the others can name its events), importance, row links, memberships, categories (`scripts/lib/periods.ts`,
`scripts/lib/categories.ts`). Both Python steps need the Wikipedia dump ([pipelines/README.md](../pipelines/README.md));
the build and CI need only the plans. After a change to `periods.json`, the classifier or the overrides, rerun in this
order, since each step reads what the one before wrote:

```sh
pipelines/.venv/bin/python -I pipelines/ancient/periods.py
npm run data -- importance ancient-classical
pipelines/.venv/bin/python -I pipelines/ancient/categories.py
npm run data -- importance ancient-classical
pipelines/.venv/bin/python -I pipelines/medieval/gen_medieval.py   # it reads Ancient's compiled file at the 650 seam
npm run categories:proof -- ancient-classical
```

The site's list, `timelines/index.json`, isn't committed: `scripts/lib/timeline-index-plugin.ts` makes it from the
files in `public/timelines/` (the dev server on each request, the build into `dist/timelines/`), in the order
`data-src/site-timelines.json` gives (timeline ids; files it doesn't name come last, by file name). A new timeline
needs only its file, plus its id in `site-timelines.json` to place it.

The timeline began on 2026-11-20 as the merge of two earlier ones, Ancient Civilizations and The Classical World. Their
source files, plans and content scripts, and the merge itself, are in `archive/` (see its README); they are not built
or tested. Changes since then are re-runnable scripts in `scripts/ancient-classical/`, built on
`scripts/lib/dataset-edit.ts` (insert or replace by id), run in the order listed in `scripts/lib/timelines.ts`; add a
new one there. The scripts must reproduce the source file exactly (`npm run data:check`, also run in CI), so any of them
can be edited and re-run; keep it that way. A phase with no date claims fails the check too (every date cites its source;
`phase-claims.ts` cited the 36 that were typed in without any); a plain `run-all` only warns. Content that no script defines lives only in the source file, and can be
edited there directly. `scripts/archive/` keeps one-off edits that have already been applied, as templates.

Other data tools:

```sh
node scripts/build-dataset.ts <in.json> <out.json>   # compile any readable source file
node scripts/reorder-regions.ts data-src/ancient-classical.json [--parent near-east] egypt,levant,…
node scripts/apply-text-fixes.ts <data-src file> fixes.json [--dry]   # reword titles or descriptions in the data and its scripts
npm run audit:batches -- <data-src file> <out dir>   # group descriptions by cited page, for checking against the pages
```

### Timelines generated from Wikipedia

`data-src/modern-states.json` and `data-src/medieval.json` are not hand-written. `pipelines/modern-states/gen_modern.py`
and `pipelines/medieval/gen_medieval.py` build them from an offline English Wikipedia dump, citing each date's infobox
field or sentence, and write their provenance manifests to `data-src/provenance/`. Edit the generator, not the file,
then rerun it, compile with `npm run data -- build <timeline>`, and check `git diff data-src/ public/timelines/`. Both
are in `scripts/lib/timelines.ts` (with no content scripts), so CI and the data tests check that each compiled file
matches `data-src/`. Medieval World reads Modern States' committed build at the commit named in
`pipelines/medieval/med_europe.py` (`MODERN_COMMIT`), so the rows that cross 1500 match; `npm run seam-check`
compares the rows shared across the 650 and 1500 seams (plan in `data-src/seams.json`).

To prove a data change moved only what it meant to, compare the compiled files before and after it as the app draws
them, under every Dating choice: `npm run data:compare -- <before.json> <after.json>`. It doesn't see row order or context spans; for those, and to prove that only named fields changed, use `npm run fields:proof -- <timeline> [--base <rev>] --allow '<pattern>,…' [--list]`, which compares the source and compiled files with a git revision field by field (both sides lifted to the current schema; rows, the timeline's context spans and events keyed by id; `*` in a pattern matches one id or field; `tracks order` covers moved rows) and fails on any change no pattern allows. After a generator rerun that adds or reviews event categories, `npm run categories:proof -- <timeline> [--base <rev>]` proves nothing but the categories changed: without the `category` facet and memberships, the source and compiled files equal their versions at the revision (default `origin/main`). It also runs the classifier's known negatives (`pipelines/common/known_negatives.json`). Before a rerun, `npm run categories:diff [-- <timeline> …] [--all] [--base <rev>]` lists what a classifier change moves, grouped by change (old vs new classifier on every non-reviewed event); if nothing moves, skip the rerun.
`pipelines/README.md` covers the inputs, the settings and how to rerun.

## Row links

Each row of the included timelines links to its Wikipedia article and carries its Wikidata id (`url` and
`ids.wikidata`; see [data-format.md](data-format.md#tracks)). The decisions live in a plan per timeline,
`data-src/<short>-row-links.json`: one line per row, `{ "page": "…", "wikidata": "Q…" }` or `null` for a row
without a link. `npm run data -- importance` and `run-all` apply it after the content scripts, and a test fails
when a row has no decision.

```sh
node scripts/row-links.ts <timeline>                        # propose articles for undecided rows; rewrite docs/<short>-row-links.md
node scripts/row-links.ts <timeline> --accept-same          # record proposals whose title plainly names the row
node scripts/row-links.ts <timeline> --decide <file.json>   # record { "<row id>": "Article title" | null, … }
```

The script asks the Wikipedia API for each candidate's Wikidata id and flags (missing, disambiguation, an
AI-generated-text template). Rules used for the included timelines:

- A row links to an article plainly about it: for an ancient people or culture, the ancient topic, not a modern
  country or city of the same name (*Ancient Rome*, not *Rome*; *Prehistory of Taiwan*, not *Taiwan*).
- A row that combines two things ("Getae and Dacians", "Iran & Central Asia") gets no link unless one article covers
  both (*Ancient Israel and Judah*).
- Pages with an AI-generated-text template are never linked (*C-Group culture*, *Lusatian culture* in 2026-11).
- Group rows link to their region's article when there is one (*Mesopotamia*, *Levant*).

`docs/<short>-row-links.md` lists every decision; the decision files used are in `scripts/archive/`.

## Regions (facet memberships)

Rows can belong to values of three facets, geography, people and civilization, each membership citing where its
source says so (`meta.facets`, `memberships`; see [data-format.md](data-format.md#memberships)). The region filter
uses the first facet (geography), and comparison sets show each row's broad region; people and civilization are in the
data but not offered yet. The decisions live in a plan, `data-src/ancient-classical-memberships.json`:
the facets, the sources it adds (a row's Wikipedia article that no event cited yet, `wp-row-<row id>`), and each row's
memberships. `npm run data -- importance` and `run-all` apply it after the row links (`scripts/lib/memberships.ts`).

The pilot (2026-11-20) covers the 75 Mediterranean, Mesopotamian and Anatolian rows with a Wikipedia article.
Candidates came from each article's categories (and their parent categories), first sentence and infobox, with PeriodO
period definitions as supporting evidence; the author reviewed them in a checklist. Candidates resting only on a
PeriodO period matched by one word ("Neolithic", "Roman Period") were left out, to revisit with a stricter matcher.
The plan was built by `scripts/archive/2026-11-20-memberships-plan.mjs`.

**Every row (2026-11-20, geography only).** The region list grew to 72 values in two levels (broad regions such as
Near East, Europe, East Asia, Mesoamerica; narrower ones inside them through `broader`), following the *Encyclopedia of
Prehistory* (Peregrine and Ember, 2001–2003) for the broad level, Sinor's *Cambridge History of Early Inner Asia* (1990)
for the steppe and Central Asia, and the regions' own Wikipedia articles for the narrow level. Candidates for all 330
bottom-level rows came from a local copy of the English Wikipedia dump (enwiki-20261101): each row's article (its
categories, the parent categories of its own topic category, first sentence and infobox), or for rows without one the
articles their events cite. States and empires (articles with Wikipedia's country infobox) get only the region they are
most associated with: points for their capital's region (from the capital's article), first sentence, categories and
infobox. Articles carrying an AI-generated-text notice were not used. The author reviewed the result in a checklist;
`scripts/archive/2026-11-20-region-memberships-plan.py` turned the ticks into the plan. The candidate finder lives
outside the repo with the dump (`~/data/timelines-analysis/2026-11-20-groups/`). Megalith builders has no region on
purpose (its sources name none).

### Region filter

Filters → Data filters → Regions (`src/components/RegionFilter.tsx`, rules in `src/lib/regions.ts`, state in
`src/state/regionFilter.ts`) works on the timeline's first facet. A row shows if it is in any ticked region, counting
the regions inside each (`broader`); rows with sub-rows stay while any row below them shows; a membership counts only
while one of its sources is switched on (so tags cited to hidden spoiler sources give nothing away). The result is laid
over the reader's own row toggles (`rowsOn` in `App.tsx`), so the chart, table, search and event visibility follow it
without knowing about regions. Off in edit mode. The link carries `&regions=`.

### Period lane

Golden ages and long society spans apply to a whole civilization or country and can span rulers, so each row draws
them on a line of their own under its phases (and its reigns, below), above its other events (Kevin, 2026-11-22).
`periodLaneIds` (`src/lib/periodLane.ts`) picks the events: a golden age (`golden-age`) as the main or second
category; or a society kind (religion, law, culture, economy) as the **main** category over 25 years or more, except
a person's lifetime ("Life of …"). `src/data/period-lane.json` then includes or excludes events by id, per timeline;
a test fails if it names an id its timeline doesn't have. The layout (`layoutLanes`'s `periodLane`) places these
events first, on their own line(s); the other events pack below them, and the row cap and "+N" folding count only
those lines. Key-event and "+N" behaviour and the category shapes are unchanged.

### Reign lane

A row's reigns come first among its events, above the period lane (Kevin, 2026-11-22: "rulers just be events again,
but keep them at the top relative to other events"). `reignLaneIds` (`src/lib/reignLane.ts`) picks events with the
`reign` or `interregnum` sub-kind as main or second category; the classifier (`pipelines/common/event_categories.py`)
sets `reign` for spans titled "Reign of …", "Presidency of …" and the like, and `interregnum` for spans titled "…
interregnum" or "Time of Troubles" (Kevin, 2026-11-23: a sourced gap in rule is drawn on the reign line). `layoutLanes`'s `reignLane` places them before the period lane's
events, on at most two lines of their own (`maxReignRows`): one after another on the first; overlapping reigns
(co-rulers, rival claimants), or names that would collide, on the second. Reigns that don't fit fold into "+N" with the other events, so zoomed out (where each label
is wider than its reign) the row looks as it did before; expanding the row lifts the cap. A reign that also qualifies
for the period lane stays in the reign lane. A gap means no reign is recorded there yet; a sourced interregnum
fills its gap with a labelled span.

### Overview strip

`OverviewStrip` (`src/timeline/OverviewStrip.tsx`, `overview.css`) is a 30 px map of the whole timeline above the
chart (Kevin, 2026-11-23: the "onion skin" version). It maps the chart's own pixels, so shortened gaps stay short (and
are marked) and the outlined view is always the screen's share of the chart; everything outside it is dimmed. Bars
count events by where they start (one per 3 px, square-root heights). A click centres the view there and a drag
moves it; the outline is a `role="slider"` (one Tab stop: ←/→ a quarter of a screen, Page Up/Down a screen,
Home/End), named with the years in view. It scrolls the chart's scroller (`scrollerRef`), so it needs no state of
its own. `TimelineView` wraps the strip and the scroller in `.tl-wrap`, a flex column; a band above the chart can
join it as one more child.

### Ages strip

Context spans of kind `age` are drawn as ages (`src/timeline/AgeStrip.tsx`, placed by `src/lib/eras.ts`): the
timeline's own (`meta.context`) in a sticky strip under the ruler, a row's (`Track.context`) as lines of its strip. `placeAges`
resolves each under the reader's Dating choice (`resolveSpan` with the span's own `chronology`) and gives each `line` a
line; `agesInView` drops lines with no age in the settled year window the chart already keeps
for hiding rows (`rowWindow`), so the strip only grows with what is on screen. Uncertain ends use the event bars'
hatching; ends past the chart are cut with a dashed edge. Clicking an age (or Enter) opens its details
in the side panel, as an event's do (`AgePanel`, in `DetailsFrame`, the frame it shares with `DetailPanel`: focus moves
to the title, Escape or ✕ closes it and focus returns to the bar via `data-age-id`): dates, region, its article and
Wikidata id, and its sources as links. One panel at a time: `App.tsx` closes an age's details when an event is
selected, and the other way round. Ages never move the chart (Kevin: centring adds cognitive overhead). An age with a `url` gets a ↗ link (`a.tl-age-link`) over the start of its bar, before
its name and moving with it, when the bar has room for two 24 px targets (the link and the rest of the button);
narrower ages leave it to the side panel. The table view's Ages table is the strip's accessible equivalent; its names
link the way row names do (`LinkedName` in `TableView.tsx`).

**Keyboard on strips.** `AgeBars` gives each strip or band line one Tab stop (a roving tabindex, keyed by band, group
and line name, since line numbers change as empty lines close up): ←/→ and Home/End move along the line, and the ↗
links are `tabIndex=-1` (the details panel links the article). Phase strip cells join the chart's own grid instead
(`buildGrid`'s `stripLines`: one grid line per strip line, above the lane's events), so the chart stays one Tab stop
and the Tab stop never starts on a strip cell (`Stop.strip`). Each `PlacedPhase` carries a `ref` (`phaseRef`:
row and index in `Track.phases`; `memberRef`: row and index in `Track.memberOf`, carried as `ResolvedMembership.index`; an editor opening closes the panel, since edits can reorder them), which is the cell's `data-phase-ref`, its
stop key (`strip:<ref>`) and `App.tsx`'s `selectedPhaseRef`; Enter or Space on a cell opens `PhasePanel` (in
`DetailsFrame`; `findPhase` in `App.tsx` maps the ref back to the stored and resolved phase). Clicks on a cell still go
through to the row.

A row's own ages (`Track.context`) aren't in the Ages strip: `placeAges` places each on that row (`band`), numbering
lines per row, and `splitAges` separates the strip's from each row's. `TimelineView` lays them out as lines of the
row's phase strip, above its phases (Kevin, 2026-11-22: the live look, regional ages as lighter strip lines): one
strip line per age line, each cell a `PlacedPhase` with `kind` (`age`), `lineName` and `ref` (`ageRef`: `age:<id>`).
The cells are drawn a step lighter (13%/26%), names in title case and shown from 36 px (`minKindNamePx`); a cell with no
name or under 10 px draws no edges or alternate fill, so a run reads as one stripe. A named line's name
(`.tl-strip-line-name`) holds the chart's left edge and its ages' names stick just right of it. Age cells open
`AgePanel` on a click as well as Enter (phases open by keyboard only). Age lines and membership lines with nothing in
the strip window (`stripWindow`, the view plus a margin, set when sideways scrolling settles) are left out. Named phase
and age lines get 2 px under their names (`padBottomPx`). A row that's filtered out takes its ages with it (the table
still lists them). `trackDeletion` names the ages that would move to the strip, for the delete warning.

### Category filter

Filters → Data filters → Categories reuses the Regions tree (`RegionFilter.tsx` with a heading, a noun and help text)
on the timeline's first facet whose `applies` is `"events"` (`categoryFacetId` in `src/lib/categories.ts`; state in
`src/state/categoryFilter.ts`). Kinds and sub-kinds with no events on the timeline are left out. An event shows if
either of its categories is ticked or sits inside a ticked kind; an event with no category always shows; the same
source rule as regions applies. The result is one more test in `visibleEvents` (`App.tsx`), so the chart, table and
search follow it. Off in edit mode. The link carries `&cat=`.

Each event's main kind draws a glyph before its title (`CategoryGlyph.tsx`, one shape per kind; the layout reserves its
width through `glyphs`), and on a "+N" pill that names a key event. Both categories are in the event's accessible
name, the table's Category column (sortable, and in the CSV) and the event's details. The event editor picks a main
and a second category; a new one cites the event's first source, so the picker waits until the event has one.
Deleting a source drops it from facet memberships (`recite` in `src/state/edits.ts`), and a membership left citing
nothing goes too.

Each row's own regions and the sources placing it there (`rowRegionList`) show in the table view's rows tables (a
Regions column; rows with regions but no lifespan are listed too) and in the row name's tooltip in the chart
(`regionsTooltip`). The same spoiler rule applies: only regions and sources whose sources are switched on.

### Filters panel

`FiltersPanel.tsx` has two native `<details>` sections, Display (chart options, hidden rows) and Data filters
(Regions, Tracks, Sources, Source tags); both open on wide screens, Visual folded on phones, the reader's choice kept in
`timelines:filters-open`. Tracks and Sources are `FilterTree`s (`src/components/FilterTree.tsx`): folding lists with a
find box, where a group's checkbox switches everything below it (native indeterminate state when mixed). Tracks follow
the row tree; Sources are grouped by the areas whose rows use them (events, date claims, region memberships). While
regions are ticked, lines outside them are dimmed (muted, italic, read out) and an opened group folds its dimmed lines
into one "N more" line. Lines are 40 px tall on touch screens.

### Busy ring

`TimelineView` shows a ring in the chart's top-right corner (`.tl-busy`, in a zero-height sticky strip so it stays in
the corner however far the chart is scrolled; pinned to the window's top-right when that corner is off screen) and
sets `aria-busy` on the chart: while `rowsPending` (the view has moved to years where another set of rows has
something, and the check waits `SETTLE_MS` = 200 ms for scrolling to settle; nothing shows if the rows won't change),
and while `busy` (App passes the chart and table deferred copies of what they draw, `useDeferredValue`, so a click
updates its own control at once and the chart redraws in the background; busy = a deferred copy is behind). The ring
fades in after 150 ms (60 ms for rows), so quick updates don't flash it; it spins on the compositor and stands still
with reduced motion. Zoom isn't deferred (its scroll anchoring needs the new scale at once).

### Comparison sets

Rows picked from anywhere, shown side by side (`src/lib/sets.ts`, state in `src/state/comparison.ts`, the bar above
the chart in `src/components/ComparisonBar.tsx`). While a set is shown the chart and table draw `setTracks`: each picked
row at the top level (keeping the chronology it inherited) with its own sub-rows; rows outside the set are switched off
in `rowsOn`, so events and search follow, and the region filter is paused. Orders: as picked, by start, or related rows
together (`orderSet`: clusters of rows tied by shared events and links, by their middle row's start, each tightened to
shorten the distance between related rows; ported from the dropped reader-chosen groups prototype). Each label has a compare
button (a stop in the chart's keyboard navigation); in a set each row shows its broad region under its name. The link
carries `&set=` and `&order=` while the set is shown. Off in edit mode.

## Event maps

Opening an event shows its rows on a map (`src/components/EventMap.tsx`, data helpers in `src/map/mapData.ts`). The
map file is `public/maps/<timeline id>.json`; the site's list points the timeline's `index.json` entry at it
(`map`), and the app loads it the first time a reader opens an event (only for the site's own timelines).

```sh
npm run map:fetch    # Wikipedia/Wikidata → data-src/ancient-classical-places.json (committed; network, ~2 min)
npm run map:build    # → public/maps/ancient-classical.json and docs/ancient-classical-map.md (offline after the first run)
```

- **Borders** come from Cliopatria (pinned to a release with its sha256 in `data-src/ancient-classical-map.json`,
  downloaded once into `.cache/map/` with Natural Earth's land). A row gets every Cliopatria polity with its Wikidata
  id or Wikipedia article, plus the plan's `add` list, minus `skip`; each only in Cliopatria's years, cut to the
  row's lifespan. Cliopatria counts BCE years without a year 0; the build converts them to astronomical years.
- **Locations**, in order: the Wikipedia article's coordinates; the mark on its infobox location map, when the map
  has exactly one; the Wikidata coordinate (P625).
- **Map images:** the article's infobox map (`image_map`, `map`, `overlay_image` …), with caption, author and licence
  from Commons; marker icons are skipped. Pages with an AI-generated-text template give nothing.
- **Which year:** the first year of the event's range in which one of its rows has borders, else its start; rows
  without borders that year get a pin and their map image.
- The plan's optional `rows` list limits the build to those rows (used for the pilot).

## Local datasets

Timelines kept outside this repo (your own, or private ones) can join the tests and the dev server, so changes are
checked against more varied data than the timeline the site ships. Set `TIMELINES_LOCAL_DATA` to one or more
folders, separated like `PATH` (`:` on macOS and Linux, `;` on Windows):

```sh
TIMELINES_LOCAL_DATA=~/my-timelines/compiled:~/my-timelines/assets npm test
TIMELINES_LOCAL_DATA=~/my-timelines/compiled:~/my-timelines/assets npm run dev
```

- Every `*.json` directly in a listed folder with a `schemaVersion` is a compiled timeline.
- **Tests** (`src/data/localData.test.ts`): each local timeline must be valid, resolve all its events, and lay out
  with no overlapping marks at each of its zoom steps. Skipped when the variable isn't set, as in CI.
- **Dev server** (`scripts/lib/local-data-plugin.ts`): the local timelines are added to the end of the title menu,
  and any other file in the folders (row images, logos) is served under `/timelines/`. Builds, the preview server
  and the deployed site never include them.
- Helpers: `scripts/lib/local-data.ts`. Nothing in this repo names a local dataset; keep it that way.

## Checking the UI

```sh
npx vite preview --port 4317   # after npm run build; serves the app at /
npm run shot -- <url> <out.png> [--width N --height N --close-legend --click "Expand all" --expand "Egypt" --keys "Tab|ArrowRight" --measure ".toolbar > *"]
npm run contrast [-- --timeline ancient-classical --preset dark --state focus --zoom 100 --quick --details]   # text contrast per theme
npm run contrast:ui [-- --preset dark --check marks|focus|fields --sweep --details]   # marks, focus outline, fields at 3:1 (WCAG 1.4.11)
npm run reflow [-- --width 320 --width 640 --details]   # nothing runs off screen or scrolls sideways (WCAG 1.4.10)
npm run targets [-- --width 390 --details]   # every control at least 24 × 24 px, or spaced apart (WCAG 2.5.8)
npm run a11y:report [-- --skip contrast]     # all of the above, axe in the browser, and the a11y tests → docs/wcag-report.md (~10 min)
npm run a11y:report -- --state "plugin view"  # axe over the named views only (a PR's new states, ~1 min); writes no report
npm run check:live -- --expect "some text"   # after deploying: wait for the live site and check it loads
```

`npm run perf:scroll [-- --timeline modern-states --profile webkit --query "&rows=all" --runs 3 --out runs.jsonl]`
scrolls the chart in a production build, vertically and sideways, and prints the median frame time per timeline,
browser profile and direction, with the page's element count and rows drawn: WebKit as an iPad, and Chrome at 4× and
6× CPU throttling (with script, layout and style totals). Run it after a change to the chart's rendering, on both
the code before and after, on a quiet machine: other builds and test runs skew it, so note the load average it
prints. WebKit is a one-time download: `npx playwright-core install webkit`.

`reflow` and `targets` open the same views and panels, listed in `scripts/lib/ui-states.ts`. These use an installed
browser through playwright-core: Microsoft Edge on Windows, Google Chrome elsewhere
(`--browser` overrides).

## Accessibility checks

- `src/a11y.test.tsx` runs axe-core over each bundled timeline, the table view, the tour and the Customize panel,
  and tests accessible names, focus handling and keyboard control.
- jsdom can't check colour contrast, so `npm run contrast` does it in a real browser: axe-core for ordinary text,
  and a pixel check for text on the timeline's layered backgrounds. It checks every screen of a timeline (`--quick`:
  the opening view only, as the a11y report runs it). A theme or colour change runs it at a fine `--zoom` on every
  timeline: the opening view passed a retune that broke labels further along. Both contrast scripts save only the
  preset's name, so the served build loads its own colours for it: a baseline run against main's build from a PR's
  worktree tests main's colours. Text shadows aren't measured, so a halo change needs a look at screenshots.
  `npm run contrast:ui` does the same at 3:1 for what isn't text: event marks (with and without them on screen,
  pixel by pixel), the focus outline on each kind of control, and form fields' borders.
- oxlint runs the `jsx-a11y` rules, with three off: `prefer-tag-over-role`, `no-noninteractive-element-to-interactive-role`
  (the search box's listbox is the standard combobox pattern) and `no-autofocus` (editors focus their first field on
  purpose). Each mouse-only handler has a comment naming its keyboard equivalent.
- `npm run a11y:report` runs every check above, plus axe-core in a real browser over each view, and writes the results
  per WCAG 2.2 success criterion to [wcag-report.md](wcag-report.md). Which criteria each check covers, and which need a
  person, is the matrix in [wcag-coverage.md](wcag-coverage.md); edit it there. Exits with 1 if any check fails;
  under each failing view it prints every failing element's selector and axe's reason.
  It isn't in CI (about 10 minutes): run it after a UI change, before asking for review (`--state <name>` checks just
  the views a pull request adds, in about a minute, and writes no report), and paste its summary line
  ("Failing: 0", the number of views) in the pull request. **Pull requests don't commit `wcag-report.md`**: it would
  conflict with every other UI change. The maintainers commit a fresh report, run on the default timeline (Ancient) so
  reports stay comparable, after each batch of merges. The report names its timeline and any view it couldn't open
  there (Dating, on a timeline with one dating system).
- Plan and status: [feature-audit.md](feature-audit.md), item 23.
