# Backlog

Done in the first pass (from REDACTED's "Genericize" plan): per-timeline config (title,
credits, calendar, increments, theme, custom source tag, pinned tracks), BCE/CE without a year 0,
round-year ticks, nesting to any depth (groups → regions → civilizations → periods), track lifespans, date claims with computed error windows,
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
- **Review the key events** in `docs/ancient-key-events.md` (163 key, 41 minor, proposed by Claude). Change
  `data-src/ancient-importance.json` and run `npm run importance:ancient`.
- **Every region: deeper research.** See the summary-only lists in `docs/ancient-sources.md` (third to eleventh passes).
- **Back to 9000 BCE: two passes done** (2026-11-18, tenth and eleventh passes). Still thin: the Natufians (mostly
  before 9000), Shangshan, Kuahuqiao and the Khartoum Mesolithic (pages missing), the Sahara rock-art sequence, Neolithic
  Iberia (read only in summary so far), Ecuador's Las Vegas culture and Ñanchóc (pages missing), Neolithic island Southeast
  Asia, and Australia before the dingo.
- **New regions**, one `scripts/additions/<region>.ts` each (done: `steppe`, `africa`, `asia`, `pacific`, `caucasus`,
  `arabia`, `eastern-europe`, `americas`, `north-asia`, `fill-gaps`). For any new one: tag key events as they go in,
  place it next to its partners (the proximity test), and consider starting it collapsed. Still thin or missing: the
  US Southwest (its pages were 404), South India's Neolithic, the Kintampo complex, southern African hunter-gatherers,
  Yap, New Guinea.
- **Key events when zoomed out**: at the coarsest zoom, show only key events (a second use of `importance`).
- **Drafts hide data updates.** A saved edit-mode draft replaces the bundled timeline entirely, so a
  reader with a draft never sees later fixes to the shipped data. Same issue as REDACTED;
  fix both the same way (e.g. detect a newer shipped dataset and offer to merge).
- **More ancient content**: Lagash–Umma and Eannatum, Hittite Middle Kingdom, Mitanni rulers, Hazor
  (fetch *Tel Hazor*), Confucius, Lydia, Sabaeans, the Nubian kingdom of Kerma/Kush. Same rule: every date
  from a cited page. Many values for the Levant, Assyria and Iran exist only in page summaries
  (see `docs/ancient-sources.md`) and need a verbatim read before use.
- **Toolbar**: with four chronology menus (China added) the ancient toolbar wraps onto two rows. Consider a
  single "Dating" popover.
- **Intro for first-time readers** beyond the legend (which now exists): e.g. a short guided tour.
- **Read-only public mode** with editing hidden; undecided whether the public can edit at all.
- **Phone and tablet** support: swipe, pinch-zoom, a narrow layout. Desktop-only today.
- **Hosting**: live on GitHub Pages (public repo); `npm run deploy` publishes.
- **Editing lifespan claims**: the track form edits a lifespan's dates but not its date claims (those are
  kept when the dates don't change, and editable in the JSON).

## Later

### Next phase of the ancient timeline: after 330 BCE

The author's decision (2026-11-17): keep 3500–330 BCE for now and save these for the next phase. Most of
this history falls after the current end date.

- **Polynesia:** settlement of East Polynesia, Hawaiʻi, Aotearoa/New Zealand and Rapa Nui (mostly after
  about 1000 CE); voyaging and the Polynesian Triangle.
- **Indonesia and maritime Southeast Asia:** Buni culture onward, Funan, Tarumanagara, Kutai, Srivijaya,
  the Sailendra and Borobudur, Mataram, Majapahit.
- **Europe:** Hellenistic kingdoms, the Roman Republic and Empire, Celts and Germanic peoples, Byzantium.
- **Steppe:** Xiongnu, Sarmatians, Huns, Göktürks, Mongols.
- **Africa:** Meroë's later centuries, Aksum, Carthage to 146 BCE, Ghana, Mali, Great Zimbabwe.
- **Asia:** Maurya, Gupta, Qin and Han, the Three Kingdoms of Korea, Yamato Japan, Funan and Angkor.
- **Americas:** Classic Maya, Teotihuacan, Moche, Nazca, Tiwanaku, Wari, Hopewell and Mississippian.
- Extending the end date affects every region; existing regions would need content up to the new end.

### Shared, collaborative timelines

Let several people contribute to one timeline instead of trading JSON files. Questions to settle first:
hosting and accounts, storage (hosted database vs. git-backed data with pull requests), conflicts and
review, keeping community additions separate from the published data, moderation and consent.

### Keeping REDACTED in sync with REDACTED

Both apps are maintained. REDACTED data changes in v2 are pulled in with `npm run data:REDACTED`; a test
fails when the bundled copy drifts from `../REDACTED/src/data/timeline.json`. Code fixes
are ported by hand.
