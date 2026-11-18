# Timelines

**Live site:** https://rishenko.github.io/timelines/

A horizontal, swimlane timeline for any history, fictional or real. Each timeline is one data file
with its own calendar, eras, scale and theme. Three ship with the app:

- **Ancient Civilizations** (default): Europe (megalith builders, Bronze and Iron Age cultures, Italy and Rome, Thrace), the western Mediterranean (Carthage, Greek Sicily and Italy, Sardinia, the Balearics, Iberia), Africa south of the Sahara (Punt, Dʿmt, Tichitt, Nok, the Bantu expansion), North Africa (Libyans, Cyrene, Garamantes), the Aegean (Cycladic, Minoan, Mycenaean, Greece, Macedon), Anatolia (Hittites, Phrygia, Lydia, Lycia, Urartu), Mesopotamia (Sumer, Akkad, Babylonia, Assyria), the Levant
  (Canaan, Ebla, Ugarit, Phoenicia, Israel and Judah, Philistines, Aram, Cyprus), Egypt and Nubia (A-Group, C-Group, Kerma, Kush),
  Iran and Central Asia (Elam, Jiroft, the Oxus civilization, Mannaea, Medes, Persia), the Eurasian Steppe (Botai, Yamnaya, Afanasievo, Sintashta, Andronovo, Srubnaya, Cimmerians, Scythians, Saka, Massagetae, Pazyryk), South Asia (Harappans, the Vedic period,
  Magadha), mainland Southeast Asia (Ban Chiang, Phùng Nguyên, Đông Sơn, Sa Huỳnh, Văn Lang, the Plain of Jars), China, Korea
  and Japan (Old Chosŏn, Mumun, Jōmon, Yayoi), Taiwan and Island Southeast Asia (Dapenkeng, the Out-of-Taiwan expansion, the
  Maritime Jade Road, Buni), Oceania (the Marianas, Palau, Lapita to Fiji, Tonga and Samoa, Australia), the Caucasus
  (Maykop, Kura–Araxes, Colchis, Koban, Diauehi), Arabia (Magan, Saba, Qataban, Tayma, Lihyan), eastern Europe
  (Cucuteni–Trypillia, Funnelbeaker, Globular Amphora, Biskupin, the Getae), Siberia and Mongolia (Okunev, Karasuk, Tagar,
  deer stones), Tibet (Karuo), South India and Sri Lanka, the Sahara and East African herders, and the Americas from the
  Arctic (Saqqaq, Dorset) through North America (Old Copper, Adena), Mesoamerica (Mokaya, Tlatilco, Zapotecs) and South
  America (Cupisnique, Paracas, Chinchorro) to the Caribbean. Since 2026-11-18 it reaches back to the first farmers
  (c. 9000 BCE): Jericho and Göbekli Tepe, Çatalhöyük, Hassuna to Ubaid, Ganj Dareh and Mehrgarh, Nabta Playa and the
  Badarians, Neolithic Europe from Star Carr to Varna and Carnac, early Chinese rice and millet farming (Pengtoushan,
  Jiahu, Yangshao, Hongshan), Kuk Swamp, and the domestication of squash, maize and potatoes in the Americas. It also
  follows ideas and landmarks: Gilgamesh and Ashurbanipal's library, Homer, the Greek philosophers, the Parthenon,
  Persepolis, Confucius, Laozi and the Hundred Schools. c. 9000–330 BCE; 562 events, every date cited.
- **The Classical World** (started 2026-11-18): c. 500 BCE – 650 CE, from the Persian Wars and Warring
  States China to the fall of the Sasanians and the founding of Tang. It overlaps Ancient Civilizations from 500 to
  330 BCE, and each timeline links to the other on its ruler where they meet. Every region has had a pass: the overlap, and the
  Mediterranean and Near East (the Hellenistic kingdoms, Rome to Justinian, Carthage, Parthia and the Sasanians, Judea,
  Arabia and the rise of Islam) and South Asia (the Maurya Empire to Harsha, the Kushans, the Guptas, the
  Deccan, Tamilakam and Sri Lanka) and East Asia (Qin to the founding of Tang, the Three Kingdoms of Korea,
  Yayoi to Asuka Japan) and the Steppe (Xiongnu, Xianbei, Rouran, Turks, Kidarites, Hephthalites, Sarmatians, Huns,
  Avars) and Africa (Numidia, Mauretania, the Garamantes, the Vandals, Kush and Meroë, the Nubian kingdoms, Dʿmt
  and Aksum, Nok, Djenné-Djenno, the Bantu expansion, the Arab conquest of Egypt) and Europe north of the Alps (the La Tène Celts and Galatians,
  Caesar's Gaul, Roman Britain, the Germanic wars, Suebi, Visigoths, Burgundians, Ostrogoths, Franks, Lombards,
  Anglo-Saxons, early Slavs) and the Americas (Teotihuacan, Monte Albán, the Epi-Olmec, the Maya cities, Chavín to
  Wari and Tiwanaku, Adena, Hopewell, Hohokam, Dorset) and Southeast Asia and Tibet (Âu Lạc, Nanyue, the Trưng sisters,
  the Early Lý, Champa, Funan, Chenla, the Pyu; Zhangzhung, the Yarlung kings and Songtsen Gampo, the Tuyuhun) and China's Northern and Southern
  dynasties (Liu Song to Chen; Eastern and Western Wei, Northern Qi and Zhou; Faxian, Kumārajīva, Xuanzang) and Island Southeast Asia and Oceania (the Bujang Valley, Buni, Tarumanagara, Kutai, Kalingga, the Sa Huỳnh–Kalanay trade sphere, Iron Age Taiwan; Fiji, Tonga and Samoa in the long pause, East Polynesia, Pohnpei, Aboriginal Australia and the Torres Strait), plus a follow-up pass on values first read only in summary (`summary-only.ts`); 371 events. Built from `data-src/classical.json` by `npm run data:classical`; scripts in
  `scripts/classical/` (skeleton first, then the region passes, `summary-only.ts`, and `collapsed.ts` last); sources and judgment calls in `docs/classical-sources.md`.
  It opens like the ancient timeline: groups expanded, each region collapsed to its key events.
- **REDACTED Timeline** (unofficial): the REDACTED TTRPG universe, from
  [REDACTED](https://github.com/rishenko/REDACTED).

Switch between them with the title menu or `?timeline=ancient-near-east` / `?timeline=classical` / `?timeline=REDACTED`.

### Your own timelines

Any schema-v3 timeline file can be opened without changing the code (format: [docs/data-format.md](docs/data-format.md)):

- **From a link:** `https://…/timelines/?data=<url-of-a-timeline.json>`. The file is fetched, validated,
  saved in the browser and opened. Anyone can open the same link; GitHub page links are converted to raw
  file links automatically. The server must allow cross-site reads (CORS); GitHub raw files and gists do.
  If the link later fails, the saved copy opens instead.
- **From the Timelines panel** (toolbar → *Timelines*, or *Add or manage timelines…* in the title menu):
  paste a link, or add a file from your computer. Added timelines are listed under *Your timelines* in the
  title menu, where you can **Update** a linked one to its latest version, **Copy share link**, or
  **Remove** it.
- **Upload JSON** in edit mode does the same: the current timeline's own file loads as edits to it, a
  file for a bundled timeline opens there, and anything else is added to the library.

Timelines from files stay in that browser only. To share one, put the file online and share its link.
Because timelines can come from anyone, links and images inside them must be `http(s)` or relative
paths; anything else (e.g. `javascript:`) is rejected.

## Features

- **Year ruler** with per-timeline scales (REDACTED: 1/10/50/100 years per tick; ancient: 10/50/100/500/1000; Classical:
  10/50/100/500).
  Switching keeps the year at the center of the screen fixed.
- **Calendars.** Each timeline names its eras (BCE/CE, BE/U, …) and says whether it has a year 0.
  BCE/CE has none: 1 BCE is followed by 1 CE, durations come out right, and the ruler ticks fall on round
  years (1500 BCE, not 1501 BCE).
- **Lanes nest to any depth**, e.g. group → region → civilization → period. Any level collapses into its parent. A top-level row with sub-rows heads a group: it is tinted in its colour and the rows inside carry a faint wash of it. The ancient timeline opens with its groups expanded and each region collapsed to its key events. The toolbar's **Expand all / Collapse all** button (shown when a timeline has sub-rows) opens every row, or folds every row so only the top level shows; reopening a row then shows its children still folded, one level at a time. **Default view** (shown once the rows differ from how the timeline opens) restores its opening layout. Where scholars date a region differently, the toolbar's **Dating** button opens a panel with one dating system per region; the button counts regions changed from their default.
  A track can have a **lifespan**, shaded across its lane, so you can see which civilizations coexisted.
- **Uncertain dates.** An event's start and end can carry *date claims*: what each source says, under which
  chronology, with what ± margin. The app computes each date's range from those claims and draws it:
  a bar's uncertain start and end ranges are drawn in a lighter tint of its color, and a single-year event gets a
  lighter band across its range. Nothing is typed in as a margin
  by hand; if the sources agree, the date is drawn crisp.
- **Chronologies.** A timeline can define alternative dating systems (e.g. Mesopotamia's High, Middle and
  Low chronologies), set one per region, and let readers switch. Alternatives can be stated per event or
  derived by a fixed shift (Low = Middle + 64 years before 1400 BCE).
- **Connections:** an event on several tracks gets a thread through each lane; explicit links (`causes`,
  `part-of`, `succeeds`, `conquers`, `related`) draw as arrows. The detail panel counts, but doesn't name,
  connections hidden by your filters (spoilers).
- **Key events:** events can be marked key, normal or minor. Key events have bold labels, and crowded or
  collapsed rows place them first, so collapsed regions still show their headline events. At a timeline's coarsest
  zoom (1000 years per tick for the ancient timeline) only key events are drawn.
- **Search:** the toolbar search finds rows (groups, regions, civilizations, periods) and events, shown with their row's path and dates; it ignores case and accents ("hattusa" finds Ḫattuša). Picking a result unfolds the rows above it, scrolls to its row and dates, and highlights the row; an event also opens its details. Results hidden by Filters are greyed out and say so. Typing a year offers "Go to …". Press `/` to search from anywhere.
- **Gap compression:** long empty stretches collapse into a hatched `⋯ 900 yrs ⋯` break.
- **Legend:** the Legend button explains every symbol, color and line, using the current theme and only the features the
  open timeline uses. It opens by itself on a reader's first visit.
- **Themes:** presets and per-color pickers. Each timeline has a default (ancient: Parchment, REDACTED: Dark)
  until the reader picks their own.
- **Phones and tablets:** one finger pans the timeline and a two-finger pinch steps through the zoom levels. On
  narrow screens (under 640 px) the toolbar becomes one row that scrolls sideways, the row labels narrow, panels
  overlay the timeline, and the credits note folds to two lines (tap to open). In edit mode, hold a finger on an
  empty spot in a lane to add an event there.
- **Deep links:** `?timeline=…&inc=100&at=-1594#sack-of-babylon` restores timeline, scale, position and selection.
- **Edit mode:** add events, tracks and sources, record date claims, download the JSON and upload it again.
  Drafts autosave per timeline in the browser as the reader's changes (`src/state/draft.ts`), not a copy, so later
  updates to the published timeline still reach them; where both changed the same item, the reader's version wins, and
  the reader is told when the published timeline changed under their edits. Old full-copy drafts are converted on load
  without deleting anything. Old REDACTED files (v1 and v2) are converted on upload.

## Run

```sh
npm install
npm run dev            # http://localhost:5173
npm test               # vitest
npm run build          # type-check + production build into dist/
npm run lint           # oxlint
npm run data:ancient   # compile data-src/ancient-near-east.json → src/timelines/
npm run data:classical # compile data-src/classical.json → src/timelines/
npm run data:REDACTED    # re-import REDACTED data from ../REDACTED
npm run deploy         # build and publish dist/ to GitHub Pages
```

Scripts for working on the data (all in `scripts/`; source files are written in one compact style by
`scripts/lib/source-format.ts`). The timelines built from `data-src/` and the files and scripts that belong to
each are listed once, in `scripts/lib/timelines.ts`; `npm run data` takes a timeline's short name
(`ancient`, `classical`) or `all`:

```sh
npm run data -- build <timeline|all>        # compile data-src/ → src/timelines/ (npm run data:ancient, data:classical)
npm run data -- importance <timeline|all>   # apply data-src/<short>-importance.json, compile, refresh docs/<short>-key-events.md
                                            #   (npm run importance:ancient, importance:classical)
npm run data -- format <timeline|all>       # re-format a source file (npm run format:src does all)
npm run data -- row-order <timeline> [--parent near-east] [--best | --search --keep "mesopotamia<iran"]   # how close related rows sit; find a passing order
npm run data -- run-all <timeline>          # replay every content script in order, then importance
npm run data -- run-all <timeline> --check  # the same, but only report whether the scripts reproduce the source file; changes nothing
node scripts/additions/europe.ts            # (re)apply one region's additions; then npm run importance:ancient
node scripts/reorder-regions.ts data-src/ancient-near-east.json [--parent near-east] egypt,levant,…   # reorder rows
npm run shot -- <url> <out.png> [--width N --height N --full --close-legend --expand "Assyria|Egypt" --scroll-to "Assyria" --storage key=file.json --click "Expand all" --pinch in --long-press "Europe"]
npm run check:live -- --expect "some text"   # after deploy: wait for the live site, check it loads
npm run audit:batches -- data-src/ancient-near-east.json <out dir> [--pages 10] [--only id,id]   # group descriptions by cited Wikipedia page, one file per fetch agent, to check them against the pages
node scripts/apply-text-fixes.ts data-src/ancient-near-east.json fixes.json [--dry]   # reword titles/descriptions ({uuid, field, from, to}) in the data and in the script that defines each event
```

`scripts/additions/` (Ancient) and `scripts/classical/` hold one re-runnable script per region pass, built on
`scripts/lib/dataset-edit.ts` (insert-or-replace by id); shared row helpers are in `scripts/lib/rows.ts`. The order
they run in is the `scripts` list in `scripts/lib/timelines.ts` (Ancient ends with `groups.ts`, which nests the
regions into groups and sets the row order; Classical starts with `skeleton.ts` and ends with `collapsed.ts`). Add a
new pass to that list. Both timelines reproduce exactly from their scripts (`run-all --check`); keep it that way,
so any script can be edited and the whole timeline re-run. The Classical World's 500–330 BCE overlap events are
copied from the ancient source by `skeleton.ts`, so fix their wording in the ancient data.
`scripts/archive/` keeps earlier one-off bulk edits that have already been applied, as templates.

## Data (schema v3)

**Full reference: [docs/data-format.md](docs/data-format.md)**, with every field, the rules a file must pass, how
uncertain dates are worked out and drawn, and a complete example to copy
([docs/examples/example-timeline.json](docs/examples/example-timeline.json)). The summary below shows the shape.

Bundled timelines live in `src/timelines/` and are registered in `src/timelines/index.ts`.

```jsonc
{
  "schemaVersion": 3,
  "meta": {
    "id": "ancient-near-east", "title": "Ancient Civilizations",
    "calendar": { "before": "BCE", "after": "CE", "yearZero": false, "aliases": { "before": ["BC"] } },
    "increments": [10, 50, 100, 500], "defaultIncrement": 100,
    "defaultTheme": "parchment", "collapsed": ["egypt"], "credits": "…"
  },
  "tracks": [
    { "id": "mesopotamia", "name": "Mesopotamia", "color": "#3f7d34", "chronology": "middle" },
    { "id": "babylonia", "name": "Babylonia", "color": "#2d7f6c", "parent": "mesopotamia" },
    { "id": "bab-old", "name": "Old Babylonian", "color": "#1f7a63", "parent": "babylonia",
      "span": { "start": -1893, "end": -1594, "circa": true } }
  ],
  "chronologies": {
    "middle": { "name": "Middle Chronology", "group": "Mesopotamia & Anatolia", "default": true },
    "low": { "name": "Low Chronology", "group": "Mesopotamia & Anatolia",
             "derive": { "from": "middle", "offset": 64, "until": -1399 } }
  },
  "sources": { "wp-chron-ane": { "name": "Wikipedia: …", "url": "…", "tags": ["wikipedia"], "accessed": "2026-11-17" } },
  "tags": { "wikipedia": { "name": "Wikipedia" } },
  "events": [
    {
      "uuid": "sack-of-babylon", "title": "Hittite sack of Babylon", "descr": "…",
      "start": -1594,                         // stored years are astronomical: -1594 = 1595 BCE
      "tracks": ["hit-old", "bab-old"],
      "sources": [{ "sourceKey": "wp-chron-ane", "sourceLocation": "table" }],
      "startDates": [                         // date claims; the drawn range is computed from these
        { "year": -1650, "chronology": "high", "source": { "sourceKey": "wp-chron-ane", "sourceLocation": "…" } },
        { "year": -1586, "margin": 10, "note": "…" }
      ],
      "links": [{ "to": "kassites-take-babylon", "kind": "causes" }]
    }
  ]
}
```

Stored years always have a year 0 (astronomical numbering), so subtraction gives durations in every
calendar; only display depends on the calendar. Don't hand-convert BCE dates: write the source file in
`data-src/` with readable dates (`"start": "c. 1595 BCE"`) and compile it with `scripts/build-dataset.ts`,
which converts and validates them.

## Code map

| Path | What |
|---|---|
| `src/App.tsx` | The app shell: owns the open timeline's state and wires it to the toolbar, timeline and panels |
| `src/types.ts` | The schema v3 types (`Dataset`, `Track`, `TimelineEvent`, `DateClaim`, …) |
| `src/Boot.tsx` | Opens `?data=<url>` links before the app starts |
| `src/lib/calendar.ts` | Eras, year 0, parsing/formatting, round-year ruler ticks |
| `src/lib/chronology.ts` | Chronologies, date claims, derived alternatives, error windows |
| `src/lib/tracks.ts` | Walking the row tree: ancestors, depth, children, lane order (cycle-safe; use these, don't hand-roll walks) |
| `src/lib/search.ts` | Search index and ranking over rows and events |
| `src/lib/years.ts`, `urls.ts`, `theme.ts` | Event ordering and date text; URL safety for untrusted timelines; theme presets |
| `src/timeline/scale.ts` | Piecewise-linear year→pixel scale with gap compression |
| `src/timeline/layout.ts` | Lanes from the track tree; row packing, `+N` clusters, marks with lighter start/end ranges |
| `src/timeline/TimelineView.tsx` | Ruler, lanes, lifespans, marks, windowed rendering, scrolling to focus requests |
| `src/timeline/gestures.ts` | Label-column width, two-finger pinch zoom steps, long press to add an event |
| `src/timeline/ConnectionLayer.tsx`, `anchors.ts` | Connection arrows; the years the ruler must cover |
| `src/state/dataset.ts`, `edits.ts`, `draft.ts` | Dataset reducer and edit operations; drafts stored as the reader's changes |
| `src/state/library.ts`, `useLibraryActions.ts` | The reader's timeline library; opening, uploading, updating, removing and sharing timelines |
| `src/state/url.ts` | Reading the opening URL and keeping it in step with the view |
| `src/state/useSearchActions.ts` | What picking a search result does (unfold, scroll, select) |
| `src/state/` (others) | Filters, theme, folded rows (`collapse`), zoom steps, toolbar panels, toasts |
| `src/components/` | Toolbar, TimelinePicker, EditBar, SidePanel (detail panel and event/track/source editors), search box, Dating menu, Filters, Legend, Theme and Timelines panels |
| `src/data/` | Validator, importers for old REDACTED formats, row proximity (`proximity.ts`) |
| `src/timelines/` | Bundled timelines, registered in `index.ts` |
| `data-src/`, `scripts/` | Readable source data, the compiler, and the data scripts above |

## The historical datasets

Every event in Ancient Civilizations and The Classical World cites the English Wikipedia articles it
comes from (read 17–18 November 2026). Books and papers appear only where Wikipedia cites them for that
date; they are tagged **Cited via Wikipedia (not checked)** because they were not consulted directly.
Each region follows one chronology by default. The choices, the disagreements and what to spot-check are
in `docs/ancient-sources.md` and `docs/classical-sources.md`.

## Origins

Built from [REDACTED](https://github.com/rishenko/REDACTED) by
[rishenko](https://github.com/rishenko), itself v2 of
[REDACTED](https://github.com/rishenko/REDACTED). Both projects are
maintained; fixes to shared code are ported by hand.

## AI use

The code, tests and documentation were written with the help of an AI coding assistant
([Claude Code](https://claude.com/claude-code), Anthropic), directed and reviewed by the project author.

**REDACTED content** is not AI-generated: it comes unchanged from REDACTED, where every event
was entered by hand from the published sources it cites.

**The Ancient Civilizations and Classical World datasets were compiled with AI assistance.** The assistant
read the cited Wikipedia articles and transcribed their dates; the descriptions are its own summaries. No
date was invented: every year and margin comes from a cited page, and where pages disagree all values are
kept as claims. Neither has been reviewed by a specialist yet; `docs/ancient-sources.md` and
`docs/classical-sources.md` list the judgment calls.

## Legal

Licensed GPL v3. The REDACTED timeline is an unofficial third-party work published under the REDACTED
Third Party License and is not affiliated with REDACTED Press; REDACTED is copyright REDACTED Press. REDACTED
faction logos come from REDACTED's REDACTED repository. Wikipedia text is CC BY-SA; this project quotes
only dates and short phrases and links each article.
