# Backlog

Done in the first pass (from REDACTED's "Genericize" plan): per-timeline config (title,
credits, calendar, increments, theme, custom source tag, pinned tracks), BCE/CE without a year 0,
round-year ticks, three-level nesting, track lifespans, date claims with computed error windows,
switchable chronologies, `succeeds`/`conquers` links, a timeline picker with per-timeline drafts,
importers for old REDACTED files, and the ancient civilizations dataset.

Also done: a timeline library (uploads and `?data=<url>` links saved in the browser, listed in the
title menu, with update/share/remove) and URL safety checks for untrusted timelines.

## Next

- **Library size**: everything lives in localStorage (about 5 MB per site). Fine for dozens of timelines
  of this size; move to IndexedDB if people keep large ones.
- **Shared drafts**: edits to a linked timeline stay local. To publish them, download the JSON and replace
  the file at the link.

- **Review the ancient data** against the books: start with `docs/ancient-sources.md`.
- **Drafts hide data updates.** A saved edit-mode draft replaces the bundled timeline entirely, so a
  reader with a draft never sees later fixes to the shipped data. Same issue as REDACTED;
  fix both the same way (e.g. detect a newer shipped dataset and offer to merge).
- **More ancient content**: Lagash–Umma and Eannatum, Hittite Middle Kingdom, Mitanni rulers, the Levant
  (Ugarit, Canaan), Elam. Same rule: every date from a cited page.
- **Toolbar**: with three chronology menus the ancient toolbar wraps onto two rows. Consider a
  single "Dating" popover.
- **Legend / intro** explaining bars, diamonds, threads, faded ends, whiskers, lifespans and "c.".
- **Read-only public mode** with editing hidden; undecided whether the public can edit at all.
- **Phone and tablet** support: swipe, pinch-zoom, a narrow layout. Desktop-only today.
- **Hosting**: a public repo (free GitHub Pages) or another static host. Not set up yet.
- **Editing lifespan claims**: the track form edits a lifespan's dates but not its date claims (those are
  kept when the dates don't change, and editable in the JSON).

## Later

### Shared, collaborative timelines

Let several people contribute to one timeline instead of trading JSON files. Questions to settle first:
hosting and accounts, storage (hosted database vs. git-backed data with pull requests), conflicts and
review, keeping community additions separate from the published data, moderation and consent.

### Keeping REDACTED in sync with REDACTED

Both apps are maintained. REDACTED data changes in v2 are pulled in with `npm run data:REDACTED`; a test
fails when the bundled copy drifts from `../REDACTED/src/data/timeline.json`. Code fixes
are ported by hand.
