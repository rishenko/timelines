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
npm run deploy         # build and publish dist/ to GitHub Pages
```

CI (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request, on Node 22 and 24: lint, tests,
build, `run-all --check` for each included timeline, and a check that the files in `src/timelines/` and the key-event
lists in `docs/` are what `data-src/` compiles to. If that last check fails, run `npm run data -- build <timeline>`
and `npm run data -- importance <timeline>`, and commit the result.

## Code map

| Path | What |
|---|---|
| `src/App.tsx` | The app shell: owns the open timeline's state and wires it to the toolbar, timeline and panels |
| `src/Boot.tsx` | Opens `?data=<url>` links before the app starts |
| `src/types.ts` | The schema v3 types (`Dataset`, `Track`, `TimelineEvent`, `DateClaim`, …) |
| `src/timelines/` | Bundled timelines, registered in `index.ts` |
| `src/data/` | The validator, and row proximity checks for the included timelines (`proximity.ts`) |
| `src/lib/calendar.ts` | Eras, year 0, parsing and formatting, round-year ruler ticks |
| `src/lib/chronology.ts` | Chronologies, date claims, derived alternatives, uncertainty ranges |
| `src/lib/tracks.ts` | Walking the row tree: ancestors, depth, children, lane order (use these, don't hand-roll walks) |
| `src/lib/search.ts`, `table.ts`, `tour.ts` | Search index and ranking; table view rows; the guided tour's steps |
| `src/lib/years.ts`, `urls.ts`, `theme.ts`, `claims.ts` | Date text; URL safety for untrusted timelines; theme presets; date claims as form fields |
| `src/timeline/scale.ts` | Piecewise-linear year→pixel scale with gap compression |
| `src/timeline/layout.ts` | Lanes from the row tree; row packing, `+N` clusters, phases |
| `src/timeline/TimelineView.tsx` | Ruler, lanes, lifespans, marks, windowed rendering |
| `src/timeline/keyboard.ts`, `gestures.ts` | Keyboard control of the chart; pinch zoom and long press |
| `src/timeline/ConnectionLayer.tsx`, `anchors.ts` | Connection arrows; the years the ruler must cover |
| `src/state/dataset.ts`, `edits.ts`, `draft.ts` | Dataset reducer and edit operations; drafts stored as the reader's changes |
| `src/state/library.ts`, `useLibraryActions.ts` | The reader's own timelines: opening, uploading, updating, sharing |
| `src/state/url.ts` | Reading the opening URL and keeping it in step with the view |
| `src/state/` (others) | Filters, theme, folded rows, zoom steps, panels, toasts, search actions |
| `src/components/` | Toolbar, panels (Filters, Legend, Customize, Dating), detail panel and editors, search box, table view, tour |
| `src/test/fixtures.ts` | A small fictional timeline for tests |
| `data-src/`, `scripts/` | Readable source files for the included timelines, and the scripts that build them |

Stored years are astronomical (there is always a year 0), so subtraction gives durations in every calendar; only
display depends on the calendar. See [data-format.md](data-format.md#years).

## Building the included timelines

The included timelines are written in `data-src/` with readable dates (`"start": "c. 1595 BCE"`) and compiled into
`src/timelines/`. `scripts/lib/timelines.ts` lists each one with its files and scripts. `npm run data` takes a
timeline's short name (`ancient`, `classical`) or `all`:

```sh
npm run data -- build <timeline|all>        # compile data-src/ → src/timelines/ (also npm run data:ancient, data:classical)
npm run data -- importance <timeline|all>   # apply data-src/<short>-importance.json and refresh docs/<short>-key-events.md
npm run data -- format <timeline|all>       # re-format a source file
npm run data -- row-order <timeline>        # how close related rows sit; --best finds a passing order
npm run data -- run-all <timeline>          # replay every content script in order, then importance
npm run data -- run-all <timeline> --check  # report whether the scripts reproduce the source file; changes nothing
```

`scripts/additions/` (Ancient) and `scripts/classical/` hold one re-runnable script per pass, built on
`scripts/lib/dataset-edit.ts` (insert or replace by id). They run in the order listed in `scripts/lib/timelines.ts`;
add a new pass there. Both timelines reproduce exactly from their scripts (`run-all --check`), so any script can be
edited and the whole timeline re-run; keep it that way. The Classical World's 500–330 BCE overlap events are copied
from the Ancient source, so fix their wording there. `scripts/archive/` keeps one-off edits that have already been
applied, as templates.

Other data tools:

```sh
node scripts/build-dataset.ts <in.json> <out.json>   # compile any readable source file
node scripts/reorder-regions.ts data-src/ancient-near-east.json [--parent near-east] egypt,levant,…
node scripts/apply-text-fixes.ts <data-src file> fixes.json [--dry]   # reword titles or descriptions in the data and its scripts
npm run audit:batches -- <data-src file> <out dir>   # group descriptions by cited page, for checking against the pages
```

## Checking the UI

```sh
npx vite preview --port 4317   # after npm run build; serves the app at /
npm run shot -- <url> <out.png> [--width N --height N --close-legend --click "Expand all" --expand "Egypt" --keys "Tab|ArrowRight" --measure ".toolbar > *"]
npm run contrast [-- --timeline classical --preset dark --state focus --sweep --details]   # text contrast per theme
npm run reflow [-- --width 320 --width 640 --details]   # nothing runs off screen or scrolls sideways (WCAG 1.4.10)
npm run targets [-- --width 390 --details]   # every control at least 24 × 24 px, or spaced apart (WCAG 2.5.8)
npm run check:live -- --expect "some text"   # after deploying: wait for the live site and check it loads
```

`reflow` and `targets` open the same views and panels, listed in `scripts/lib/ui-states.ts`. These use an installed
browser through playwright-core: Microsoft Edge on Windows, Google Chrome elsewhere
(`--browser` overrides).

## Accessibility checks

- `src/a11y.test.tsx` runs axe-core over each bundled timeline, the table view, the tour and the Customize panel,
  and tests accessible names, focus handling and keyboard control.
- jsdom can't check colour contrast, so `npm run contrast` does it in a real browser: axe-core for ordinary text,
  and a pixel check for text on the timeline's layered backgrounds. `--sweep` checks every screen of a timeline.
- oxlint runs the `jsx-a11y` rules, with three off: `prefer-tag-over-role`, `no-noninteractive-element-to-interactive-role`
  (the search box's listbox is the standard combobox pattern) and `no-autofocus` (editors focus their first field on
  purpose). Each mouse-only handler has a comment naming its keyboard equivalent.
- Plan and status: [feature-audit.md](feature-audit.md), item 23.
