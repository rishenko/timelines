# Development

Vite, React 19 and TypeScript. Node 22.22.2 or newer on the 22 line, or 24.15 or newer (the test environment, jsdom, needs
those; the scripts in `scripts/` are TypeScript run directly by Node).

## Commands

```sh
npm install
npm run dev            # http://localhost:5173
npm test               # vitest
npm run lint           # oxlint
npm run build          # type-check (app and scripts) and build into dist/
npm run preview        # serve dist/ locally
npm run deploy         # build and publish dist/ to GitHub Pages from this clone (the workflow below is the usual way)
```

**Deploying.** `.github/workflows/deploy.yml` publishes the site: it builds `main` on GitHub, runs lint and the
tests, pushes `dist/` to the `gh-pages` branch (as `npm run deploy` does) and waits until the live site serves the new
bundle. It runs only when started by hand, and only from `main`: Actions → Deploy → Run workflow, or
`gh workflow run deploy.yml --ref main` (then `gh run watch`). Every deploy needs Kevin's OK: the run waits in the
`production` environment until he approves it in the Actions UI. Building on GitHub
means nothing untracked in a local clone can end up on the site.

CI (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request, on Node 22 and 24: lint, tests,
build, `run-all --check` for each included timeline, and a check that the files in `public/timelines/` and the
key-event lists in `docs/` are what `data-src/` compiles to. If that last check fails, run `npm run data -- build <timeline>`
and `npm run data -- importance <timeline>`, and commit the result.

For a refactor that shouldn't change anything visible, compare the rendered page before and after it.
`npm run dom-snapshot` renders both included timelines in many states (zooms, every row expanded, the table, the
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
| `src/types.ts` | The schema v4 types (`Dataset`, `Track`, `TimelineEvent`, `DateClaim`, …) |
| `public/timelines/` | The site's timelines and their list, `index.json` (format and checks in `src/data/timelineIndex.ts`; loading in `src/state/timelines.ts`) |
| `src/data/` | The validator, and row proximity checks for the included timelines (`proximity.ts`) |
| `src/lib/calendar.ts` | Eras, year 0, parsing and formatting, round-year ruler ticks |
| `src/lib/chronology.ts` | Chronologies, date claims, derived alternatives, uncertainty ranges |
| `src/lib/tracks.ts` | Walking the row tree: ancestors, depth, children, lane order (use these, don't hand-roll walks) |
| `src/lib/search.ts`, `table.ts`, `tour.ts` | Search index and ranking; table view rows; the guided tour's steps |
| `src/lib/years.ts`, `urls.ts`, `theme.ts`, `claims.ts` | Date text; URL safety for untrusted timelines; theme presets; date claims as form fields |
| `src/timeline/scale.ts` | Piecewise-linear year→pixel scale with gap compression |
| `src/timeline/layout.ts` | Lanes from the row tree; row packing, `+N` clusters, phases |
| `src/timeline/TimelineView.tsx` | The chart: lanes from the row tree, windowed rendering (rows a screen above to 2.5 below, plus the rows holding the Tab stop or selection; marks a screen either side); composes the pieces below |
| `src/timeline/Ruler.tsx`, `Bands.tsx`, `LaneLabel.tsx`, `Marks.tsx` | The year ruler; lifespan and phase bands; row labels and their buttons; event and `+N` marks |
| `src/timeline/useViewport.ts` | Scroll position: center year, focus requests, keeping the selection on screen; the view's stretch for drawing (a vertical scroll re-renders only every half screen) |
| `src/timeline/useRovingFocus.ts`, `keyboard.ts` | Keyboard control of the chart (one Tab stop, arrow keys) and its movement rules |
| `src/timeline/gestures.ts` | Pinch zoom and long press |
| `src/timeline/rowsInView.ts` | Which rows have nothing near the view ("Hide rows with nothing in view") |
| `src/timeline/ConnectionLayer.tsx`, `anchors.ts` | Connection arrows; the years the ruler must cover |
| `src/map/mapData.ts`, `src/components/EventMap.tsx` | Event maps: which borders, pins and map images to draw for an event's year (see [Event maps](#event-maps)) |
| `src/state/dataset.ts`, `edits.ts`, `draft.ts` | Dataset reducer and edit operations; drafts stored as the reader's changes |
| `src/state/library.ts`, `useLibraryActions.ts` | The reader's own timelines: opening, uploading, updating, sharing |
| `src/state/collections.ts` | Shared lists (`?collection=`): reading, saving and removing them; `listTimelines` in `timelines.ts` merges them into the picker |
| `src/state/url.ts` | Reading the opening URL and keeping it in step with the view |
| `src/state/` (others) | Filters, theme, chronology choices, focus requests, folded rows, zoom steps, panels, toasts, search actions |
| `src/components/` | Toolbar, panels (Filters, Legend, Customize, Dating), detail panel and editors, search box, table view, tour |
| `src/index.css`, `src/styles/` | Styles, one file per area (chart, side panel, legend, table view, phones…), imported by `index.css` in cascade order |
| `src/test/fixtures.ts` | A small fictional timeline for tests |
| `data-src/`, `scripts/` | Readable source files for the included timelines, and the scripts that build them |

Stored years are astronomical (there is always a year 0), so subtraction gives durations in every calendar; only
display depends on the calendar. See [data-format.md](data-format.md#years).

## Building the included timeline

The included timeline is written in `data-src/ancient-classical.json` with readable dates (`"start": "c. 1595 BCE"`)
and compiled into `public/timelines/ancient-classical.json`. `scripts/lib/timelines.ts` lists it with its files and
scripts. `npm run data` takes its short name (`ancient-classical`) or `all`:

```sh
npm run data -- build <timeline|all>        # compile data-src/ → public/timelines/ (also npm run data:build)
npm run data -- importance <timeline|all>   # apply data-src/<short>-importance.json and row links; refresh docs/<short>-key-events.md (also npm run importance)
npm run data -- format <timeline|all>       # re-format a source file
npm run data -- row-order <timeline>        # how close related rows sit; --best finds a passing order
npm run data -- run-all <timeline>          # replay every content script in order, then importance
npm run data -- run-all <timeline> --check  # report whether the scripts reproduce the source file; changes nothing (also npm run data:check)
npm run data -- index                       # print the site's list of timelines as the build makes it
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
can be edited and re-run; keep it that way. Content that no script defines lives only in the source file, and can be
edited there directly. `scripts/archive/` keeps one-off edits that have already been applied, as templates.

Other data tools:

```sh
node scripts/build-dataset.ts <in.json> <out.json>   # compile any readable source file
node scripts/reorder-regions.ts data-src/ancient-classical.json [--parent near-east] egypt,levant,…
node scripts/apply-text-fixes.ts <data-src file> fixes.json [--dry]   # reword titles or descriptions in the data and its scripts
npm run audit:batches -- <data-src file> <out dir>   # group descriptions by cited page, for checking against the pages
```

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

## Category memberships

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

Filters → Regions (`src/components/RegionFilter.tsx`, rules in `src/lib/regions.ts`, state in
`src/state/regionFilter.ts`) works on the timeline's first facet. A row shows if it is in any ticked region, counting
the regions inside each (`broader`); rows with sub-rows stay while any row below them shows; a membership counts only
while one of its sources is switched on (so tags cited to hidden spoiler sources give nothing away). The result is laid
over the reader's own row toggles (`rowsOn` in `App.tsx`), so the chart, table, search and event visibility follow it
without knowing about regions. Off in edit mode. The link carries `&regions=`.

Each row's own regions and the sources placing it there (`rowRegionList`) show in the table view's rows tables (a
Regions column; rows with regions but no lifespan are listed too) and in the row name's tooltip in the chart
(`regionsTooltip`). The same spoiler rule applies: only regions and sources whose sources are switched on.

### Filters panel

`FiltersPanel.tsx` has two native `<details>` sections, Visual filters (chart options, hidden rows) and Data filters
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
npm run contrast [-- --timeline ancient-classical --preset dark --state focus --sweep --details]   # text contrast per theme
npm run contrast:ui [-- --preset dark --check marks|focus|fields --sweep --details]   # marks, focus outline, fields at 3:1 (WCAG 1.4.11)
npm run reflow [-- --width 320 --width 640 --details]   # nothing runs off screen or scrolls sideways (WCAG 1.4.10)
npm run targets [-- --width 390 --details]   # every control at least 24 × 24 px, or spaced apart (WCAG 2.5.8)
npm run a11y:report [-- --skip contrast]     # all of the above, axe in the browser, and the a11y tests → docs/wcag-report.md (~10 min)
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
  and a pixel check for text on the timeline's layered backgrounds. `--sweep` checks every screen of a timeline.
  `npm run contrast:ui` does the same at 3:1 for what isn't text: event marks (with and without them on screen,
  pixel by pixel), the focus outline on each kind of control, and form fields' borders.
- oxlint runs the `jsx-a11y` rules, with three off: `prefer-tag-over-role`, `no-noninteractive-element-to-interactive-role`
  (the search box's listbox is the standard combobox pattern) and `no-autofocus` (editors focus their first field on
  purpose). Each mouse-only handler has a comment naming its keyboard equivalent.
- `npm run a11y:report` runs every check above, plus axe-core in a real browser over each view, and writes the results
  per WCAG 2.2 success criterion to [wcag-report.md](wcag-report.md). Which criteria each check covers, and which need a
  person, is the matrix in [wcag-coverage.md](wcag-coverage.md); edit it there. Exits with 1 if any check fails.
  It isn't in CI (about 6 minutes): run it after a major UI change or a batch of UI changes, before merging, and
  commit the new report.
- Plan and status: [feature-audit.md](feature-audit.md), item 23.
