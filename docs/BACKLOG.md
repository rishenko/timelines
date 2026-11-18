# Backlog

## Next

### Data review

- **Review the ancient data** against the books: start with `docs/ancient-sources.md`.
- **Review the key events** in `docs/ancient-key-events.md` (180 key, 43 minor) and `docs/classical-key-events.md`
  (110 key, 56 minor), all proposed by Claude. Change `data-src/<timeline>-importance.json` and run
  `npm run importance:ancient` or `npm run importance:classical`.
- **Classical World description audit: check the judgment calls** in `docs/classical-sources.md` ("Description audit
  (18 November 2026)"), especially *Polynesians*, whose translation notice links to the LLM-assisted translation
  guideline; `long-pause` still cites it.
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
- **REDACTED, sub-faction rows** the data implies: the REDACTED Administration and Perfect REDACTED (REDACTED
  Incident), individual REDACTED. Canon only, from the cited books. (Governments are done: `scripts/REDACTED/governments.ts`
  marks REDACTED, the REDACTED, the REDACTED and REDACTED governments as phases.)
- **REDACTED, REDACTED guides disagree** (header of `scripts/REDACTED/REDACTED-lore-guide.ts`): REDACTED/REDACTED departures, First
  and Second REDACTED ranges, Second REDACTED Civil War (4700 AE vs. 4800 AE). Events still follow the draft guide.
- **REDACTED, spans worth a second look** (judgment calls listed in `docs/REDACTED/event-spans.md`): Evolution of
  REDACTED Trade REDACTED ("1400 years" vs. its 1,866-year range), Fourth REDACTED (ongoing?), REDACTED and
  REDACTED Depart (a departure window, not a 4,000-year event), and the two "… Begins" events that carry a whole
  period's range.
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

### The Classical World beyond 650 CE

Extending the end date affects every region; existing regions would need content up to the new end. Candidates from
the original plan that fall after 650: Srivijaya, the Sailendra and Borobudur, Majapahit, Angkor, Ghana, Mali, Great
Zimbabwe, the Mississippians, the Mongols, and the settlement of Hawaiʻi, Aotearoa/New Zealand and Rapa Nui. A
separate later timeline, linked by `meta.continues` as Ancient and Classical are, would keep each one readable.

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
- **Periods as phases, 2026-11-18:** every civilization's period sub-rows are phases on its own row (Ancient: Egypt,
  Assyria, Babylonia, Sumer, Elam, Minoan, Mycenaean, Hittites, Harappan, Canaan, Greece, Rome, Zhou; Classical: the
  Northern and the Southern dynasties, Rome, Egypt, plus Han and Jin phases) via `scripts/additions/phases.ts` and
  `scripts/classical/phases.ts`. Later: Egypt's overlapping dynasties in the intermediate periods as stacked phases.
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
- **App features, 2026-11-18:**
  - A guided tour for first-time readers (`src/components/Tour.tsx`, steps in `src/lib/tour.ts`). It starts by itself
    on a first visit, replacing the legend opening, and can be restarted from the Legend.
  - Lifespan date claims are editable in the track editor (`ClaimList`, shared with the event editor).
  - Both editors check an edit before saving and list what it would break (`newProblems` in `edits.ts`). A draft
    that can't be applied on opening is kept under `timelines:<id>:draft-unreadable` instead of being lost.
  - The editors' fieldsets no longer run past the side panel (a fieldset is as wide as its content by default; the
    event editor's were up to 800 px in a 380 px panel).
  - Toolbar on one row at 1700 px: the subtitle sits under the timeline menu; "Key events only" moved to the ruler's
    corner; ↺ Default view is a small button beside Expand all that never appears or disappears; the search box narrows
    and widens on focus.
  - Phones: the edit bar is one sideways-scrolling row of buttons with a short hint (it was three rows).
  - `scripts/screenshot.ts`: `--measure <selector>` prints element sizes, `--click` also matches tooltips and
    `=Exact` text, and `--close-legend` closes the tour too.
- **REDACTED data lives here (2026-11-18):** this app replaces REDACTED for REDACTED, and nothing is ported
  back. `data-src/REDACTED.json` is the source, built like the others (`npm run data:REDACTED`); the re-import from v2
  and the drift test are gone. v2's span and canon-link scripts moved to `scripts/REDACTED/` with their tests, and
  `run-all REDACTED --check` reproduces the file exactly.
