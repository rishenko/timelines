# Timeline data format (schema v3)

A timeline is **one JSON file**. It holds the timeline's settings, rows, dating systems, sources and
events. Images are the only things kept outside it; the file links to them.

A complete, valid example to copy: [`examples/example-timeline.json`](examples/example-timeline.json),
a small fictional kingdom with its own calendar. It uses nearly every feature described here.

## Make your own timeline

1. Copy `examples/example-timeline.json` and give it a new `meta.id` and `meta.title`.
2. Set the calendar, then replace the tracks, sources and events with your own.
3. Open it in the app: **Customize → Timelines → Add from a file…**. Any problem is reported with the field it's in.
4. To share it, put the file online (a GitHub repository or gist works) and share
   `https://<the app's address>/?data=<link to the file>`. To make it part of your own copy of the app, bundle it
   (see the [README](../README.md#use-your-own-timeline-data)).

You can also build a timeline in the app's **edit mode** (Customize → Edit) and use **Download final** to get the file.

## Years

Every year in the file is a whole number, counted with a **year 0**:

| Calendar | Displayed | Stored |
|---|---|---|
| No year 0 (`"yearZero": false`, e.g. BCE/CE) | *n* CE | *n* |
| | *n* BCE | 1 − *n* (so 1 BCE = 0, 1450 BCE = −1449) |
| With a year 0 (`"yearZero": true`, e.g. BE/AE) | *n* AE (including 0 AE) | *n* |
| | *n* BE | −*n* |

This makes subtraction give the right number of years in every calendar. You never have to convert
by hand if you write the file in the [readable format](#writing-dates-as-text) and compile it.

## Top level

| Field | Required | What |
|---|---|---|
| `schemaVersion` | yes | Always `3`. |
| `meta` | yes | Title, calendar and display settings. See [meta](#meta). |
| `tracks` | yes | The rows, in display order. See [tracks](#tracks). |
| `sources` | yes | Citations, keyed by an id you choose. See [sources and tags](#sources-and-tags). |
| `tags` | yes | Labels for grouping sources, keyed by id. May be `{}`. |
| `events` | yes | See [events](#events). |
| `chronologies` | no | Alternative dating systems. See [chronologies](#chronologies). |
| `present` | no | The setting's "now" (a stored year). Events marked `ongoing` run to it. Defaults to the latest year any event starts or ends in. |

## meta

| Field | Required | What |
|---|---|---|
| `id` | yes | Short id: letters, digits and dashes. Used in links (`?timeline=`) and to keep each timeline's edits apart. |
| `title` | yes | Shown in the title menu. |
| `subtitle` | no | Shown after the title. |
| `description` | no | One line about the timeline. |
| `credits` | no | Footer text: credits, licences, disclaimers. |
| `creditsImage` | no | Image beside the credits. Use a full `https://` address for timelines hosted elsewhere. |
| `calendar` | yes | See [calendar](#calendar). |
| `increments` | yes | Years-per-tick choices for the toolbar, finest first, e.g. `[10, 50, 100, 500]`. |
| `defaultIncrement` | yes | The one selected when the timeline opens; must be in `increments`. |
| `defaultTheme` | no | `"dark"`, `"light"`, `"parchment"` or `"contrast"`. Used until the reader picks their own theme. |
| `customSourceTag` | no | Tag id given to sources readers create in edit mode (e.g. `"homebrew"`), so others can filter them. |
| `circaFade` | no | Years of uncertainty drawn either side of a `circa` date that has no other range. Default `0`. |
| `collapsed` | no | Track ids that start collapsed into their parent row. |
| `facets` | no | Ways to group the rows besides their tree, each with its values: `{ "geography": { "name": "Region", "values": { "aegean": { "name": "Aegean", "broader": ["mediterranean"] }, … } } }`. A value's `broader` values contain it (the Aegean is part of the Mediterranean), so a row in it belongs to them too. Rows join values through their [`memberships`](#memberships). The app's region filter (Filters → Regions) uses the first facet; comparison sets are planned. |
| `hideRowsOutOfView` | no | `true` to open with rows that have nothing near the view hidden: no event, lifespan or phase in view or within a quarter of the view's width of it. Rows with sub-rows always stay and say how many are hidden below them. Readers can turn it off in Filters, or have those rows drawn as thin lines in their place, and the link remembers their choice (`?rows=all`, `active` or `thin`). For timelines with many rows that come and go. Default `false`. |
| `continues` | no | Links to neighbouring timelines, drawn on the ruler at the year where they meet: a list of `{ "timeline": "<id>", "at": <year>, "side": "before" \| "after" }`. `at` is the year the other timeline opens at (readable years like `"330 BCE"` work in a source file built with `build-dataset.ts`); `side` says which end of this timeline it belongs to. Unknown timeline ids are simply not shown. |
| `range` | no | `{ "start": <year>, "end": <year> }`: the period the timeline is about. The ruler doesn't extend past it, even when rows or uncertainty ranges do (the included timeline's Eastern Roman Empire row runs to 1453). Readable years work in a source file. |

### calendar

| Field | Required | What |
|---|---|---|
| `before` | yes | Label for years before the epoch: `"BCE"`, `"BE"`, `"BF"`… |
| `after` | yes | Label for years from the epoch on: `"CE"`, `"AE"`, `"AF"`… |
| `yearZero` | yes | `true` if the calendar has a year 0. Real-world BCE/CE does not. |
| `aliases` | no | Other spellings readers may type in search: `{ "before": ["BC"], "after": ["AD"] }`. |

## tracks

Each track is a row. Rows nest to **any depth** (e.g. group → region → civilization → period); each
level indents one step. A parent row can be collapsed so its sub-rows' events fold into it. Deep trees
cost label width, so three or four levels is a practical ceiling rather than a rule.

| Field | Required | What |
|---|---|---|
| `id` | yes | Unique. Events refer to it. Letters, digits and dashes recommended. |
| `name` | yes | Row label. |
| `color` | yes | `#rrggbb`. |
| `parent` | no | Id of the row this one sits under. |
| `chronology` | no | Dating system for events on this row; sub-rows inherit it. See [chronologies](#chronologies). |
| `span` | no | Lifespan: shaded across the row. See below. |
| `phases` | no | Named periods on the row's own bar, e.g. successive governments. See below. |
| `image` | no | Small image in the row label (`https://…` or a path on the app's own site). |
| `url` | no | A page about the row, such as its Wikipedia article (`https://…` or a path on the app's own site). The row's name links to it, in the chart and the table view. |
| `ids` | no | The row's identifiers in other datasets: `{ "wikidata": "Q11768" }` (a Wikidata item id). Shown in the table view and the CSV download. |
| `pinLast` | no | Keep at the bottom, e.g. "Other peoples" or "Other powers". Rows added in the editor go above it. |

**`span`** (lifespan): `{ "start": …, "end": …, "circa": true }`, plus optional `startDates` and
`endDates` [date claims](#date-claims-and-uncertain-dates). Uncertain ends are drawn the same way as on events.

**`phases`**: a list of named periods within the row, for a state that changed hands over time without becoming a
different row: France's kingdoms, republics and empires, a dynasty's reigns, or a faction's councils in a fictional
timeline. Each phase is dated like a lifespan, with a name:

```json
"phases": [
  { "name": "First Council", "start": 0, "end": 288 },
  { "name": "Second Council", "start": 288, "end": 459, "endDates": [{ "year": 459, "source": { "sourceKey": "annals", "sourceLocation": "book 3" } }] }
]
```

A line marks where each phase begins, and its name runs along a strip at the top of the row. The name stays in view
while you scroll. Neighbouring phases alternate shades, and a gap between phases is left blank. Phases may overlap,
as rival governments do in a civil war; an overlapping phase's name goes on a second line. Events stay on the row
itself. In edit mode, the track editor lists a row's phases (name, dates, dated claims) and stores them in date
order. Search finds phases by name.

### memberships

**`memberships`**: the facet values a row belongs to (see [`meta.facets`](#meta)), each with the sources that place
it there, cited like date claims:

```json
"memberships": [
  { "facet": "geography", "value": "anatolia", "sources": [{ "sourceKey": "wp-hittites", "sourceLocation": "category \"Ancient peoples of Anatolia\"" }] },
  { "facet": "people", "value": "indo-european-anatolian", "sources": [{ "sourceKey": "wp-hittites", "sourceLocation": "infobox common_languages: \"Hittite, Hattic, Luwian, Hurrian\"" }] }
]
```

A row may belong to several values of one facet (the Hurrians: Mesopotamia, Anatolia and the Levant). The app's
region filter and comparison sets use the first facet. A membership counts only while one of its sources is switched
on in Filters, so a value cited only to a spoiler source (`hiddenByDefault`) stays hidden until the reader turns that
source on; the example timeline's Serath shows this with "The coast". Together, rows,
events and facet values form a graph: events link rows, memberships link rows to values, and `broader` links values.

## sources and tags

`sources` is an object keyed by source id:

| Field | Required | What |
|---|---|---|
| `name` | yes | Title of the book, article, page… |
| `tags` | yes | Tag ids (may be `[]`). Every id must exist in `tags`. |
| `author` | no | As you want it shown. |
| `year` | no | Publication year, as text (`"2000"`, `"2nd ed. 2007"`). |
| `url` | no | `https://` link. |
| `accessed` | no | For web pages: the date it was read, `YYYY-MM-DD`. |
| `hiddenByDefault` | no | Start with this source filtered out (spoilers). |

`tags` is an object of `{ "name": "…" }`, keyed by tag id. Readers can toggle all sources with a tag at once.

An event or claim cites a source with `{ "sourceKey": "<source id>", "sourceLocation": "p. 12" }`.

## events

| Field | Required | What |
|---|---|---|
| `uuid` | yes | Unique id: letters, digits and dashes. Used in links to the event (`#id`). |
| `title` | yes | |
| `descr` | yes | Description; may be `""`. |
| `start` | yes | Best estimate of the start year (stored year). |
| `end` | no | Last year, inclusive. Leave out for a single-year event. |
| `ongoing` | no | Still going: runs to `present`. Use instead of `end`. |
| `circa` | no | Approximate: shown with "c.". |
| `tracks` | yes | One or more track ids. An event on several rows gets a thread connecting them. |
| `sources` | yes | Citations (may be `[]`). |
| `startDates`, `endDates` | no | [Date claims](#date-claims-and-uncertain-dates): what each source says the date is. |
| `chronology` | no | Overrides the chronology the event would get from its first track. |
| `order` | no | Order among events in the same year; lower comes first. |
| `importance` | no | `1` key, `2` normal (default), `3` minor. Key events have bold labels. A crowded or collapsed row places key events first and folds minor ones into "+N" first, so a reader scanning collapsed regions still sees the headline events. |
| `links` | no | Connections to other events: `[{ "to": "<event uuid>", "kind": "causes" }]`. |

Link kinds: `causes` (leads to), `part-of`, `succeeds`, `conquers`, `related`. All but `related` draw
as arrows.

## Date claims and uncertain dates

`start` and `end` are your best estimates. When sources disagree, or give a margin, record each value as
a **date claim**:

```json
"startDates": [
  { "year": 88, "source": { "sourceKey": "annals", "sourceLocation": "book 4" } },
  { "year": 85, "margin": 2, "source": { "sourceKey": "chronicle", "sourceLocation": "ch. 5" },
    "note": "Counts from the first raids." }
]
```

| Field | Required | What |
|---|---|---|
| `year` | yes | Stored year the source gives. |
| `margin` | no | ± years, if the source states one. A range such as "1627–1600" is a year of 1614 with margin 14. |
| `chronology` | no | The dating system this value belongs to. |
| `source` | no | Where it comes from. Strongly recommended. |
| `note` | no | Shown under the claim. |

**How the range is worked out.** For each date the app takes every claim's `year − margin` to
`year + margin`, adds any values [derived from another chronology](#chronologies), and includes the best
estimate itself (± `circaFade` if `circa` is set). The range runs from the earliest to the latest of
these. If they all agree, there's no range and the date is drawn sharp. Margins are never typed
directly onto a date; they come only from claims.

**How it's drawn.** A bar covers the full range. Its start and end ranges are a lighter tint of the row
color, and the part between them (the latest possible start to the earliest possible end) is the normal
color. When the two ranges overlap, the normal-color part shows the event's own dates instead. A
single-year event with a range gets a lighter band behind its diamond. The detail panel lists every
claim with its source.

## Chronologies

Use chronologies when scholars (or in-world sources) use different dating systems: the app adds a
menu per group so readers can switch.

```json
"chronologies": {
  "court": { "name": "Court annals", "group": "The North", "default": true },
  "temple": { "name": "Temple reckoning", "group": "The North",
              "derive": { "from": "court", "offset": -12, "until": 200 } }
}
```

| Field | Required | What |
|---|---|---|
| `name` | yes | Shown in the menu and on claims. |
| `group` | yes | Alternatives share a group; the menu is labelled with it. |
| `default` | no | The group's starting choice; your best estimates should follow it. |
| `description`, `source` | no | Shown to readers. |
| `derive` | no | This chronology is another one shifted by a fixed number of years: `from` (chronology id, same group), `offset` (years; negative = earlier), `until` (stored year; later dates aren't shifted). |

An event uses its own `chronology`, else the one set on its first track (or that track's parent, and so
on). When a reader picks another chronology in the menu, each event in that group is redrawn at the
claim recorded for it, else at the derived value, else at its best estimate.

## Rules the app checks

A file that breaks any of these is refused, with a message naming the problem.

- The required fields above are present; `schemaVersion` is 3.
- `meta.id` and event `uuid`s use only letters, digits and dashes; event ids and track ids are unique.
- `defaultIncrement` is one of `increments`, which are positive whole numbers.
- Every year is a whole number; an `end` is not before its `start`, for events and lifespans.
- Every referenced track, parent, source, tag, chronology and linked event exists.
- No row is its own ancestor (rows may nest to any depth).
- Facet and value ids use letters, digits and dashes; every `broader` value exists and none contains itself.
  Every membership names a known facet and value and cites at least one known source.
- A derived chronology derives from one in the same group, by a whole number of years.
- Margins are zero or more. Each best estimate lies within the range of its own claims.
- `endDates` only appear on events that have an `end`. Events don't link to themselves.
- **Links and images** (`url`, `image`, `creditsImage`) are `http(s)://` addresses or relative paths.
  Timelines can come from anyone, so anything else (such as `javascript:`) is refused.

## The site's list of timelines

A site lists its own timelines in `timelines/index.json`, next to the files (in this repo, `public/timelines/`).
The app reads the list when a page opens and loads only the timeline being opened, so a site can change its
timelines by changing these files, without building the app again.

```json
{
  "timelines": [
    { "id": "my-world", "title": "My World", "file": "my-world.json" },
    { "id": "campaign", "title": "Our Campaign", "file": "https://example.org/campaign.json" }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | The timeline's `meta.id`. The file must hold the timeline with this id. |
| `title` | yes | The name in the timeline menu. |
| `file` | yes | A path relative to `index.json`, or a full `https://` address (that server must let other sites read it). |
| `subtitle` | no | Shown under the title in Customize → Timelines. |
| `eventCount` | no | Shown in Customize → Timelines. |
| `calendar` | no | The timeline's calendar, so links from other timelines (`meta.continues`) can name the year they open at. |
| `defaultTheme` | no | The timeline's `meta.defaultTheme`. |
| `map` | no | The timeline's map file, relative to `index.json` (see [development.md](development.md#event-maps)). Used only in the site's own `timelines/index.json`, not in shared lists. |

The first entry opens by default. `npm run data -- index` writes the list from the files in `public/timelines/`,
filling in every optional field from the files themselves and keeping the order and any `https://` entries. Entries
with a missing or unsafe `id`, `title` or `file` are skipped. A site without the file, or with an empty list, opens on
a page that asks readers to add a timeline.

## Sharing a timeline

- **Host the file** anywhere that allows other sites to read it (CORS). GitHub raw files, GitHub Pages
  and gists do. A GitHub page link (`github.com/…/blob/…`) is converted to the raw file automatically.
- **Share** `<app address>/?data=<file link>`. It opens the timeline and saves it in the reader's browser.
  Add `&inc=100&at=-1500` to set the zoom and position, or `#<event id>` to open an event. The link also carries
  the reader's view: `&view=table`, `&compress=0`, `&links=0`, `&rows=all|active|thin` (hidden rows), ticked regions
  (`&regions=anatolia,nile`) and a comparison set (`&set=<row ids>&order=related|start`). Row and source toggles and
  dating choices aren't in the link yet.
- **Update** by replacing the file at the same link. Readers get the new version the next time they open the
  timeline (the app checks the link for a few seconds, then opens the saved copy if it can't reach it), or with
  **Update** in Customize → Timelines. Edits a reader made are kept on top of the new version.

## Shared lists

A group (a class, a reading club, a gaming table) can share several timelines as one list. A list is a file in the
same format as [the site's list](#the-sites-list-of-timelines), hosted anywhere that allows other sites to read it,
with an optional `title` for the picker:

```json
{
  "title": "Reading club",
  "timelines": [
    { "id": "harbor-towns", "title": "The Harbor Towns", "file": "harbor-towns.json" },
    { "id": "inland-kingdoms", "title": "The Inland Kingdoms", "file": "https://example.org/inland.json" }
  ]
}
```

- **Share** `<app address>/?collection=<list link>`. It saves the list in the reader's browser and opens its first
  timeline; add `&timeline=<id>` to open another. Readers can also paste the list's link in Customize → Timelines.
- `file` is relative to the list's own address, or a full `https://` address. Each timeline loads from its file when
  it's opened, so readers always see the current version, and the list itself is checked for changes then too.
- A list's timeline whose `id` is already used (by the site's timelines, the reader's own, or an earlier list) isn't
  shown; Customize → Timelines says how many are hidden. Use ids that are unlikely to clash.
- Readers remove a list, and their edits to its timelines, with **Remove list**.
- **Images** must be online too, with full `https://` addresses.

## Writing dates as text

Converting BCE dates by hand is error-prone. Instead, write a source file with dates as text and
compile it with the build script, which converts and validates them:

```json
{ "uuid": "sack-of-babylon", "start": "c. 1595 BCE", "end": "1590 BCE",
  "startDates": [{ "year": "1651 BCE", "chronology": "high" }] }
```

```sh
node scripts/build-dataset.ts data-src/my-timeline.json public/timelines/my-timeline.json
```

Text dates are accepted for `start`, `end`, claim `year` and `derive.until`. A "c." on a start sets
`circa`. Era labels and their `aliases` come from the file's own calendar. Numbers pass through
unchanged. `data-src/ancient-classical.json` is a full example.

