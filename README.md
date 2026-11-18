# Timelines

**Live site:** https://rishenko.github.io/timelines/

A horizontal, swimlane timeline for any history, fictional or real. Each timeline is one data file
with its own calendar, eras, scale and theme. Two ship with the app:

- **Ancient Civilizations** (default): Europe (megalith builders, Bronze and Iron Age cultures, Italy and Rome, Thrace), the western Mediterranean (Carthage, Greek Sicily and Italy, Sardinia, the Balearics, Iberia), Africa south of the Sahara (Punt, Dʿmt, Tichitt, Nok, the Bantu expansion), North Africa (Libyans, Cyrene, Garamantes), the Aegean (Cycladic, Minoan, Mycenaean, Greece, Macedon), Anatolia (Hittites, Phrygia, Lydia, Lycia, Urartu), Mesopotamia (Sumer, Akkad, Babylonia, Assyria), the Levant
  (Canaan, Ebla, Ugarit, Phoenicia, Israel and Judah, Philistines, Aram, Cyprus), Egypt and Nubia (A-Group, C-Group, Kerma, Kush),
  Iran and Central Asia (Elam, Jiroft, the Oxus civilization, Mannaea, Medes, Persia), the Eurasian Steppe (Botai, Yamnaya, Afanasievo, Sintashta, Andronovo, Srubnaya, Cimmerians, Scythians, Saka, Massagetae, Pazyryk), the Indus
  Valley, China and the Americas, c. 3500–330 BCE. 230 events, every date cited.
- **REDACTED Timeline** (unofficial): the REDACTED TTRPG universe, from
  [REDACTED](https://github.com/rishenko/REDACTED).

Switch between them with the title menu or `?timeline=ancient-near-east` / `?timeline=REDACTED`.

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

- **Year ruler** with per-timeline scales (REDACTED: 1/10/50/100 years per tick; ancient: 10/50/100/500).
  Switching keeps the year at the center of the screen fixed.
- **Calendars.** Each timeline names its eras (BCE/CE, BE/U, …) and says whether it has a year 0.
  BCE/CE has none: 1 BCE is followed by 1 CE, durations come out right, and the ruler ticks fall on round
  years (1500 BCE, not 1501 BCE).
- **Lanes nest three deep**, e.g. region → civilization → period. Any level collapses into its parent.
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
  collapsed rows place them first, so collapsed regions still show their headline events.
- **Gap compression:** long empty stretches collapse into a hatched `⋯ 900 yrs ⋯` break.
- **Legend:** the Legend button explains every symbol, color and line, using the current theme and only the features the
  open timeline uses. It opens by itself on a reader's first visit.
- **Themes:** presets and per-color pickers. Each timeline has a default (ancient: Parchment, REDACTED: Dark)
  until the reader picks their own.
- **Deep links:** `?timeline=…&inc=100&at=-1594#sack-of-babylon` restores timeline, scale, position and selection.
- **Edit mode:** add events, tracks and sources, record date claims, download the JSON and upload it again.
  Drafts autosave per timeline in the browser. Old REDACTED files (v1 and v2) are converted on upload.

## Run

```sh
npm install
npm run dev            # http://localhost:5173
npm test               # vitest
npm run build          # type-check + production build into dist/
npm run data:ancient   # compile data-src/ancient-near-east.json → src/timelines/
npm run data:REDACTED    # re-import REDACTED data from ../REDACTED
```

Scripts for working on the data (all in `scripts/`; source files are written in one compact style by
`scripts/lib/source-format.ts`):

```sh
npm run importance:ancient   # apply data-src/ancient-importance.json, compile, refresh docs/ancient-key-events.md
npm run row-order            # how close related regions sit, and the best possible order
npm run format:src           # re-format data-src/ancient-near-east.json
node scripts/additions/europe.ts   # (re)apply a region's additions; then npm run importance:ancient
node scripts/reorder-regions.ts data-src/ancient-near-east.json europe,aegean,…   # reorder regions
npm run shot -- <url> <out.png> [--width N --height N --full --close-legend]   # screenshot in Edge
npm run check:live -- --expect "some text"   # after deploy: wait for the live site, check it loads
```

`scripts/additions/` holds one re-runnable script per added region, built on `scripts/lib/dataset-edit.ts` (insert-or-replace by id). `scripts/archive/` keeps earlier one-off bulk edits that have already been applied, as templates.

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
| `src/lib/calendar.ts` | Eras, year 0, parsing/formatting, round-year ruler ticks |
| `src/lib/chronology.ts` | Chronologies, date claims, derived alternatives, error windows |
| `src/timeline/scale.ts` | Piecewise-linear year→pixel scale with gap compression |
| `src/timeline/layout.ts` | Lanes from the track tree; row packing, `+N` clusters, marks with lighter start/end ranges |
| `src/timeline/TimelineView.tsx` | Ruler, lanes, lifespans, marks, windowed rendering |
| `src/state/` | Dataset reducer (per-timeline drafts), the timeline library, filters, theme |
| `src/Boot.tsx` | Opens `?data=<url>` links before the app starts |
| `src/components/` | Detail panel, event/track/source editors, filters, theme |
| `src/data/` | Validator, importers for old REDACTED formats |
| `src/timelines/` | Bundled timelines |
| `src/data/proximity.ts` | Which regions share events, and how far apart they sit (tested) |
| `data-src/`, `scripts/` | Readable source data, the compiler, and the data scripts above |

## The ancient dataset

Every event cites the English Wikipedia articles it comes from (read 17 November 2026). Books and
papers appear only where Wikipedia cites them for that date; they are tagged **Cited via Wikipedia
(not checked)** because they were not consulted directly. Each region follows one chronology by
default (see `docs/ancient-sources.md` for the choices, the disagreements, and what to spot-check).

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

**The ancient dataset was compiled with AI assistance.** The assistant read the cited Wikipedia articles
and transcribed their dates; the descriptions are its own summaries. No date was invented: every
year and margin comes from a cited page, and where pages disagree all values are kept as claims.
It has not yet been reviewed by a specialist; `docs/ancient-sources.md` lists the judgment calls.

## Legal

Licensed GPL v3. The REDACTED timeline is an unofficial third-party work published under the REDACTED
Third Party License and is not affiliated with REDACTED Press; REDACTED is copyright REDACTED Press. REDACTED
faction logos come from REDACTED's REDACTED repository. Wikipedia text is CC BY-SA; this project quotes
only dates and short phrases and links each article.
