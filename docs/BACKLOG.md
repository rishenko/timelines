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
- **Review the key events** in `docs/ancient-key-events.md` (177 key, 43 minor, proposed by Claude). Change
  `data-src/ancient-importance.json` and run `npm run importance:ancient`.
- **Every region: deeper research.** See the summary-only lists in `docs/ancient-sources.md` (third to thirteenth passes).
- **Back to 9000 BCE: three passes done** (2026-11-18, tenth to twelfth passes). Still thin: the Natufians (they end
  c. 9500 BCE, before the range), Shangshan, the Khartoum Mesolithic and Ñanchóc (pages missing), the South Indian
  Neolithic (only Sanganakallu has a page with dates), Neolithic island Southeast Asia, and Australia beyond Budj Bim.
- **New regions**, one `scripts/additions/<region>.ts` each (done: `steppe`, `africa`, `asia`, `pacific`, `caucasus`,
  `arabia`, `eastern-europe`, `americas`, `north-asia`, `fill-gaps`). For any new one: tag key events as they go in,
  place it next to its partners (the proximity test), and consider starting it collapsed. Still thin or missing: the
  US Southwest (its pages were 404), South India's Neolithic, the Kintampo complex, southern African hunter-gatherers,
  Yap, New Guinea.
- **Key events when zoomed out: done (2026-11-18).** At a timeline's coarsest zoom only key events are drawn
  (`src/state/zoom.ts`), with a "Key events only" note by the zoom buttons.
- **Drafts hid data updates: fixed here (2026-11-18).** Drafts are now stored as the reader's changes and replayed onto
  the current published data (`src/state/draft.ts`), so later fixes reach readers with drafts. REDACTED still
  has the old behaviour; port `draft.ts` there if v2 work resumes.
- **More ancient content: mostly done (2026-11-18, thirteenth pass, `ideas.ts`).** Lagash (Eannatum, Urukagina,
  Gudea), Hazor, Tushratta, Confucius and the history of ideas are in; Lydia, the Sabaeans and Kerma/Kush came in
  earlier passes. Still to do: the Upanishads (dates read only in summary), more Mitanni rulers, and the many
  Levant, Assyria and Iran values that exist only in page summaries (see `docs/ancient-sources.md`).
- **Toolbar: done (2026-11-18).** The four chronology menus are now one Dating button with a panel
  (`src/components/DatingMenu.tsx`); the ancient toolbar is two rows at 1700 px instead of three. One row would need
  the subtitle or the search box moved.
- **Intro for first-time readers** beyond the legend (which now exists): e.g. a short guided tour.
- **Read-only public mode** with editing hidden; undecided whether the public can edit at all.
- **Phone and tablet: first pass done (2026-11-18).** Under 640 px: a one-row toolbar that scrolls sideways, a
  120 px label column, side panels that overlay the timeline, the credits note clamped to two lines (tap to open),
  and the Dating panel across the screen. Everywhere: one finger pans, a two-finger pinch steps the zoom. Tablets
  (≥ 768 px) were already usable. In edit mode, holding a finger on an empty spot of a lane adds an event (the
  touch form of double-click); the legend takes at most 45% of a phone's height. Not yet tried on a real phone. The
  edit bar is tall on phones (its buttons wrap to three rows).
- **Hosting**: live on GitHub Pages (public repo); `npm run deploy` publishes.
- **Editing lifespan claims**: the track form edits a lifespan's dates but not its date claims (those are
  kept when the dates don't change, and editable in the JSON).

## Later

### The Classical World (c. 500 BCE – 650 CE): started 2026-11-18

The author's decision (2026-11-18): a separate timeline rather than extending the ancient one, so long-gone
civilizations don't crowd it. It overlaps the ancient timeline from 500 to 330 BCE and ends around 650 CE; the two
link to each other on their rulers (`meta.continues`). The skeleton (`scripts/classical/skeleton.ts`) has the groups,
regions and the 47 overlap events; the first region pass (`mediterranean-near-east.ts`) covers the Mediterranean and
the Near East. `meta.range` (500 BCE – 650 CE) keeps the ruler to the period. Next region passes: South Asia (Maurya,
Kushan, Gupta), China (Qin, Han, Three Kingdoms, Sui, Tang founding), the Steppe (Xiongnu, Huns, Turks), Africa (Kush,
Aksum), Europe north of the Alps (Celts, Germanic peoples, Franks), and the Americas (Teotihuacan, Classic Maya, Moche,
Nazca, Hopewell). The list below is the starting point. Not yet decided: which regions open collapsed.

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
