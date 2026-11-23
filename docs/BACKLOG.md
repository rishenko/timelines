# Backlog

## Next

### Data review

- **Review the data** against the books: start with `docs/ancient-sources.md`.
- **Review the key events** in `docs/ancient-classical-key-events.md` (270 key, 94 minor), all proposed by Claude.
  Change `data-src/ancient-classical-importance.json` and run `npm run importance`.
- **Classical World description audit: check the judgment calls** in `docs/classical-sources.md` ("Description audit
  (18 November 2026)"): pages that disagree with themselves, and optional softenings. (*Polynesians* is settled:
  translation notices are fine and are mentioned in the event's description.)
- **Re-check banners with each new dump.** Wikipedia adds AI/LLM-text banners after the fact: *Norte Chico
  civilization* had one by the 2026-11-18 audit, and everything taken from it was removed. Since #93, `npm run
  data:check` refuses any link in `data-src/` to a flagged page, using `data-src/ai-flagged-pages.txt`; rerun
  `pipelines/extract/ai_flagged.py` with each dump (see `pipelines/README.md`, "A new dump") and the check names what
  to remove.
- **Ma'in (Minaeans):** its banner cites the LLM *translation* guideline, so it was left out; Kevin (2026-11-23):
  use it, with the translation notice disclosed in the event's description (Dev A).

### More content

- **Every region: deeper research.** See the summary-only lists in `docs/ancient-sources.md` (third to fourteenth
  passes) and `docs/classical-sources.md` (follow-up section).
- **Ancient, still thin before 3500 BCE:** the Natufians (they end c. 9500 BCE, before the range), Shangshan, the
  Khartoum Mesolithic and Ñanchóc (pages missing), the South Indian Neolithic (only Sanganakallu has a page with
  dates), Neolithic island Southeast Asia, and Australia beyond Budj Bim.
- **Ancient, thin or missing regions:** the US Southwest (its pages were 404), the Kintampo complex, southern African
  hunter-gatherers, Yap, New Guinea. For a new region: one `scripts/ancient-classical/<region>.ts`, key events tagged as they
  go in, placed next to its partners (the proximity test), and considered for opening collapsed.
- **Ancient, other gaps:** the Upanishads (dates read only in summary), more Mitanni rulers, and the many Levant,
  Assyria and Iran values that exist only in page summaries.
- **Search aliases:** an `aliases` property on tracks and events (Hatti, Kemet, Axum, Wa/Yamato) so other names find
  them. Add it to `types.ts`, `validate.ts`, `search.ts` and `data-format.md`, then fill it in during region reviews.

### App

- **Feature audit (18 November 2026):** `docs/feature-audit.md` lists what the app lacks for scholarly use (trust and
  transparency, citation and versions, the dating model, analysis, access) and the author's later additions (splitting
  the data into its own repo, simple and advanced editing, days and months, business timelines, server-side storage).
  Move items here as they're scheduled. Contributions to the bundled timelines come as pull requests (item 25).
- **`apply-text-fixes.ts` should edit the script that defines an event last** (the one whose version wins on replay),
  not the first match. In the Classical audit, `edessa-260` is defined in `mediterranean-near-east.ts` and again in
  `summary-only.ts`, so the fix landed in the wrong one and was copied over by hand.
- **Filter collections:** save the current filters under a name and come back to them, or share them, by link. The
  link already carries zoom, year, view, chart options, hidden rows, regions and a comparison set; not yet the row and
  source toggles, folded rows or dating choices. Would include naming and saving comparison sets.
- **Read-only public mode** with editing hidden; undecided whether the public can edit at all.
- **Phones:** not yet tried on a real phone.
- **Library size:** everything lives in localStorage (about 5 MB per site). Fine for dozens of timelines of this
  size; move to IndexedDB if people keep large ones.
- **Shared drafts:** edits to a linked timeline stay local. To publish them, download the JSON and replace the file
  at the link.

## Later

### Shared, collaborative timelines

Let several people contribute to one timeline instead of trading JSON files. Questions to settle first: hosting and
accounts, storage (hosted database vs. git-backed data with pull requests), conflicts and review, keeping community
additions separate from the published data, moderation and consent.

## Done

- 23 November 2026 (#87–#101): schema v8, context lines (ages on `meta.context` and a row's `context`), with
  regional ages drawn as lines of their row's strip; reigns as their own sub-kind, laid out first in a row (the reign
  lane, two lines at most); view plugins from the site's `plugins/` folder; the Parchment retune and a Colour-blind
  safe preset; nesting guides in row labels; the overview strip above the chart; the year cursor (Y) with its
  "meanwhile" readout; phase names at 4.5:1 on bright rows in dark themes. Tooling: `npm run check:all`,
  `a11y:report --state`, contrast sweeps over the whole chart from the served build, and the AI-flagged citation
  check in `data:check`.
- **Decided, no change (Kevin, 2026-11-23):** the High/Low shift at the 1400 BCE cut-off stays as it is. The
  Mesopotamian chronologies shift only dates before 1400 BCE, so a span across it shrinks under Low (Assyria's
  subjugation under Mitanni, c. 1430–1360 BCE, becomes 1366–1360 BCE): "leave it". *Xin dynasty* (translation
  banner) stays unused: its years still come from the *Han dynasty* infobox.

- The app: per-timeline settings (calendar, zoom levels, theme, credits), rows that nest to any depth, lifespans and
  phases, date claims with computed uncertainty ranges, switchable chronologies, connections between events, key and
  minor events, search, filters, legend, guided tour, table view with CSV, themes, edit mode with drafts stored as the
  reader's changes, a timeline library (uploads and `?data=` links), and phone and tablet support.
- Since then: shared lists (`?collection=`) and update checks for timelines and lists from links; row links to
  Wikipedia with Wikidata ids; "Hide rows with nothing in view" (or thin lines); connections on by default, with a
  Filters switch; the "Lifespans" tour step; event maps (Cliopatria borders, else Wikipedia pins and map images).
- November 2026: sourced regions for every row (72 regions in two levels), the region filter (Filters → Data
  filters → Regions) with each row's regions and sources in the table and tooltip, comparison sets (feature audit
  item 19), a busy ring while rows or a slow update are being drawn, and Filters in two sections (Visual and Data
  filters) with folding Tracks and Sources lists.
- Accessibility parts a–f (foundations, table view, keyboard control, visual, touch targets, edit forms), except
  `forced-colors` in part d (marks, focus outlines and fields at 3:1 were done on 20 November with
  `npm run contrast:ui`); see [feature-audit.md](feature-audit.md), item 23.
- Ancient Civilizations (c. 9000–330 BCE) and The Classical World (c. 500 BCE – 650 CE), each with a description
  audit, merged on 2026-11-20 into one timeline, Ancient and Classical World (the originals are in `archive/`), whose
  scripts reproduce its source file exactly (`npm run data:check`).
- Hosting on GitHub Pages: `npm run deploy`, and since PR #35 the Deploy workflow, started by hand from `main`.
- "Dated by …" only where the reader's choice in the Dating menu can move the event (`datingChronology`); every
  dating option moves at least one event, lifespan or phase, so all are kept.
- Later in November 2026: two more timelines, **Modern States** (1500 to today) and **Medieval World** (650–1500),
  built by generators in `pipelines/` and linked to Ancient and Classical and each other by `meta.continues` (the
  "Beyond 650 CE" plan); days and months (schema v4, zoom steps below a year); rows with nothing in view hidden by
  default; lifespans worked out from phases, `ongoing`, dated memberships (`memberOf`) and the events that began and
  ended them; local datasets in the tests and dev server; the MIT and CC BY 4.0 licences; a chart that draws only the
  rows near the screen; the site's list made at build time; the Deploy workflow. The "show all connections" switch
  was dropped: threads show for the selected event only.
