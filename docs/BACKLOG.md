# Backlog

## Next

### Data review

- **Review the ancient data** against the books: start with `docs/ancient-sources.md`.
- **Review the key events** in `docs/ancient-key-events.md` (180 key, 43 minor) and `docs/classical-key-events.md`
  (110 key, 56 minor), all proposed by Claude. Change `data-src/<timeline>-importance.json` and run
  `npm run importance:ancient` or `npm run importance:classical`.
- **Audit the Classical World descriptions** the same way as the ancient ones
  (`npm run audit:batches -- data-src/classical.json <dir>`); only the 31 summary-only events have been checked so far.
- **Re-check banners on cited pages now and then.** Wikipedia adds AI/LLM-text banners after the fact: *Norte Chico
  civilization* had one by the 2026-11-18 audit, and everything taken from it was removed. Any audit or re-read should
  report banners, and a flagged page's values come out.

### More content

- **Every region: deeper research.** See the summary-only lists in `docs/ancient-sources.md` (third to fourteenth
  passes) and `docs/classical-sources.md` (follow-up section).
- **Ancient, still thin before 3500 BCE:** the Natufians (they end c. 9500 BCE, before the range), Shangshan, the
  Khartoum Mesolithic and Ñanchóc (pages missing), the South Indian Neolithic (only Sanganakallu has a page with
  dates), Neolithic island Southeast Asia, and Australia beyond Budj Bim.
- **Ancient, thin or missing regions:** the US Southwest (its pages were 404), the Kintampo complex, southern African
  hunter-gatherers, Yap, New Guinea. For a new region: one `scripts/additions/<region>.ts`, key events tagged as they
  go in, placed next to its partners (the proximity test), and considered for opening collapsed.
- **Ancient, other gaps:** the Upanishads (dates read only in summary), more Mitanni rulers, and the many Levant,
  Assyria and Iran values that exist only in page summaries.
- **Search aliases:** an `aliases` property on tracks and events (Hatti, Kemet, Axum, Wa/Yamato) so other names find
  them. Add it to `types.ts`, `validate.ts`, `search.ts` and `data-format.md`, then fill it in during region reviews.

### App

- **Intro for first-time readers** beyond the legend: e.g. a short guided tour.
- **Read-only public mode** with editing hidden; undecided whether the public can edit at all.
- **Phones:** not yet tried on a real phone. The edit bar is tall on phones (its buttons wrap to three rows).
- **Toolbar:** two rows at 1700 px on the ancient timeline. One row would need the subtitle or the search box moved.
- **Editing lifespan claims:** the track form edits a lifespan's dates but not its date claims (those are kept when
  the dates don't change, and editable in the JSON).
- **Library size:** everything lives in localStorage (about 5 MB per site). Fine for dozens of timelines of this
  size; move to IndexedDB if people keep large ones.
- **Shared drafts:** edits to a linked timeline stay local. To publish them, download the JSON and replace the file
  at the link.

## Later

### Shared, collaborative timelines

Let several people contribute to one timeline instead of trading JSON files. Questions to settle first: hosting and
accounts, storage (hosted database vs. git-backed data with pull requests), conflicts and review, keeping community
additions separate from the published data, moderation and consent.

### The Classical World beyond 650 CE

Extending the end date affects every region; existing regions would need content up to the new end. Candidates from
the original plan that fall after 650: Srivijaya, the Sailendra and Borobudur, Majapahit, Angkor, Ghana, Mali, Great
Zimbabwe, the Mississippians, the Mongols, and the settlement of Hawaiʻi, Aotearoa/New Zealand and Rapa Nui. A
separate later timeline, linked by `meta.continues` as Ancient and Classical are, would keep each one readable.

### Keeping REDACTED in sync with REDACTED

Both apps are maintained. REDACTED data changes in v2 are pulled in with `npm run data:REDACTED`; a test fails when the
bundled copy drifts from `../REDACTED/src/data/timeline.json`. Code fixes are ported by hand. Not yet
ported to v2: drafts stored as changes (`src/state/draft.ts`), the row and event search, and the 2026-11-18 fixes
below (source citations in claims, the App split).

## Done

- **First pass** (from REDACTED's "Genericize" plan): per-timeline config (title, credits, calendar,
  increments, theme, custom source tag, pinned tracks), BCE/CE without a year 0, round-year ticks, nesting to any
  depth, track lifespans, date claims with computed error windows, switchable chronologies, `succeeds`/`conquers`
  links, a timeline picker with per-timeline drafts, importers for old REDACTED files, and the ancient dataset.
- **Timeline library:** uploads and `?data=<url>` links saved in the browser, listed in the title menu, with
  update/share/remove, and URL safety checks for untrusted timelines.
- **Hosting:** live on GitHub Pages (public repo); `npm run deploy` publishes.
- **Ancient Civilizations, 2026-11-17/18:** every region on the original list, back to 9000 BCE (tenth to twelfth
  passes), the history of ideas (`ideas.ts`), and tribal and mobile peoples (`peoples.ts`); a description audit of
  every event.
- **The Classical World, 2026-11-18:** a separate timeline (c. 500 BCE – 650 CE) so long-gone civilizations don't
  crowd it, overlapping the ancient one from 500 to 330 BCE. The skeleton, ten region passes and a summary-only
  follow-up are in `scripts/classical/`; every region opens collapsed (`collapsed.ts`).
- **Key events when zoomed out:** at a timeline's coarsest zoom only key events are drawn (`src/state/zoom.ts`).
- **Drafts no longer hide data updates:** drafts are stored as the reader's changes and replayed onto the current
  published data (`src/state/draft.ts`).
- **Dating button:** one panel for every region's dating system (`src/components/DatingMenu.tsx`), replacing one menu
  per region.
- **Search** for rows and events (`src/components/SearchBox.tsx`, `src/lib/search.ts`): row paths, unfolds and
  scrolls to the target, greys out results hidden by Filters.
- **Phones and tablets, first pass:** one-row scrolling toolbar under 640 px, narrow labels, overlay panels, clamped
  credits, pinch zoom steps, long press to add an event in edit mode.
- **Maintenance, 2026-11-18:** deleting or renaming a source in edit mode now updates date claims, lifespans and
  chronologies too (before, the draft failed validation and was erased on reload); `App.tsx` split into hooks and
  components; one row-tree helper (`src/lib/tracks.ts`, which also lifted a 10-level cap on inherited chronologies);
  gesture hooks out of `TimelineView`; CSS sections regrouped.
- **Data tooling, 2026-11-18:**
  - One table of the timelines built from `data-src/` (`scripts/lib/timelines.ts`) and one command,
    `npm run data -- <build|importance|format|row-order|run-all> <timeline|all>`; the old `npm run` names are aliases.
  - `run-all` replays every content script in order; `--check` proves both timelines reproduce exactly. The first
    replay brought two overlap events and four audited descriptions into Classical (`docs/classical-sources.md`,
    overlap sync).
  - The citation and proximity tests run on both historical timelines, and a test fails when a compiled file is
    behind its source.
  - Shared helpers: `scripts/lib/compile.ts`, `importance.ts` (the key-event list now uses the timeline's calendar)
    and `rows.ts`, plus `RCE` in `dataset-edit.ts`.
  - `apply-text-fixes.ts` warns when no script defines an event.
  - The Ancient key-event list had kept titles from before the description audit; it is regenerated.
