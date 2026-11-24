# Timeline data format (schema 11.2)

A timeline is **one JSON file**. It holds the timeline's settings, rows, dating systems, sources and
events. Images are the only things kept outside it; the file links to them.

A complete, valid example to copy: [`examples/example-timeline.json`](examples/example-timeline.json),
a small fictional kingdom with its own calendar. It uses most of the features described here; not shown in it are
`memberOf`, `ongoingSources`, `startEvent`/`endEvent`, months and days, `continues`, `ids` and lifespans given as a
list.

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

### Months and days

Any date may also give a month, or a month and a day: a year alone is still a complete date. Each date is a stretch
of time, its year, month or day, so a year-only date covers its whole year exactly as it always has.

| Where | Fields |
|---|---|
| events, lifespan stretches, phases, `memberOf` entries | `startMonth`, `startDay`, `endMonth`, `endDay` (beside `start` and `end`) |
| date claims | `month`, `day` (beside `year`) |

```json
{ "uuid": "somme", "title": "Battle of the Somme", "start": 1916, "startMonth": 7, "startDay": 1,
  "end": 1916, "endMonth": 11, "endDay": 18 }
```

- Months are 1–12; a day needs a month and must exist in it (leap years counted). Positions use Gregorian month
  lengths.
- **New Style dates from 1582.** The app doesn't convert between calendars, so every month and day from 15 October
  1582 on is Gregorian, as most sources give them for the modern era:
  - When a source gives both styles ("26 October [8 November] 1917"), record the Gregorian one and say so in
    `sourceLocation` ("N.S.; O.S. 26 October").
  - When a source gives only an Old Style (Julian) date, as for Russia before 1918, Britain and its colonies before
    1752 and much of Protestant Europe between 1582 and 1700, convert it before recording it: add 10 days for 1582–1699
    (from 1 March 1700 in the Julian count, 11 days; from 1 March 1800, 12; from 1 March 1900, 13), and record the
    source's own date in the claim's `note` ("1 February 1918 O.S."). A conversion in the build script, marked `O.S.`
    in the text date, is planned for when a timeline first needs it.
  - Before 1582 dates are Julian everywhere; record them as the sources give them, unconverted (the proleptic
    Gregorian difference is not wanted there), and say so in the timeline's credits.
- **Invented calendars** use the same twelve months for now: a setting with other months can give years only, until
  `calendar` can describe its months.
- An end date is inclusive, like an end year: the bar runs to the end of that day (or month, or year). An event whose
  end is its start's own date is a single date.
- A year-only end that meets a start given in days in the same year (Weimar's "1933" and Nazi Germany's 30 January
  1933) ends at that start: the two share one strip line. An overlap given in days takes a second line, as rival
  phases do.
- To show them, a timeline offers zoom steps below a year in `meta.increments`: `"quarter"`, `"month"`, `"week"`,
  `"day"` (the ruler then labels months, or days: weeks fall on the 1st, 8th, 15th and 22nd). Zoomed out, dates in
  months and days are drawn where they fall within their years. At zooms below a year, empty stretches still fold into
  gap breaks, but the days inside an event bar never do.
- Search reads "July 1916", "1 July 1916" and "1916-07-01"; the table and CSV (`start_date`, `end_date`) give full
  dates; the editor asks for months and days where the timeline has a zoom step below a year.
- Dating systems ([chronologies](#chronologies)) shift whole years; a month and day ride along.

## Top level

| Field | Required | What |
|---|---|---|
| `schemaVersion` | yes | `10`. Files of versions `3` to `9` still load ([versions](#versions)). |
| `meta` | yes | Title, calendar and display settings. See [meta](#meta). |
| `tracks` | yes | The rows, in display order. See [tracks](#tracks). |
| `sources` | yes | Citations, keyed by an id you choose. See [sources and tags](#sources-and-tags). |
| `tags` | yes | Labels for grouping sources, keyed by id. May be `{}`. |
| `events` | yes | See [events](#events). |
| `chronologies` | no | Alternative dating systems. See [chronologies](#chronologies). |
| `people` | no | The timeline's people, keyed by id (schema 11.2). See [people](#people). |
| `redirects` | no | Ids the timeline no longer has, so links that name them still work: `{ "<old id>": "<new id>", "<removed id>": null }`. An old id maps to the row, event or context span that replaced it, or to `null` when it was removed on purpose. Keys can't be ids the timeline has; targets must be. See [keeping ids stable](#keeping-ids-stable). |
| `present` | no | The setting's "now" (a stored year). Events, lifespans and phases marked `ongoing` run to it. Defaults to the latest year any event starts or ends in. |

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
| `increments` | yes | Years-per-tick choices for the toolbar, finest first, e.g. `[10, 50, 100, 500]`. Steps below a year are named: `"quarter"`, `"month"`, `"week"`, `"day"`, e.g. `["day", "week", "month", 1, 5, 10]` ([months and days](#months-and-days)). A step whose chart would be too wide to draw (day zoom over centuries) is disabled. |
| `defaultIncrement` | yes | The one selected when the timeline opens; must be in `increments`. |
| `defaultTheme` | no | `"dark"`, `"light"`, `"parchment"`, `"cvd"` (Colour-blind safe) or `"contrast"`. Used until the reader picks their own theme. |
| `customSourceTag` | no | Tag id given to sources readers create in edit mode (e.g. `"homebrew"`), so others can filter them. |
| `circaFade` | no | Years of uncertainty drawn either side of a `circa` date that has no other range. Default `0`. |
| `collapsed` | no | Track ids that start collapsed into their parent row. |
| `facets` | no | Ways to group the rows besides their tree, each with its values: `{ "geography": { "name": "Region", "values": { "aegean": { "name": "Aegean", "broader": ["mediterranean"] }, … } } }`. A value's `broader` values contain it (the Aegean is part of the Mediterranean), so a row in it belongs to them too. Rows join values through their [`memberships`](#memberships). A facet's `applies` says what may belong to its values: `"tracks"` (rows, the default), `"events"` (for categories of events), `"both"` (rows and events), or `"people"` (11.2: groups the [people](#people), such as their area; only people). The app's region filter (Filters → Data filters → Regions) uses the first facet that rows belong to, and comparison sets show each row's broad region from it. |
| `hideRowsOutOfView` | no | On unless `false`: the timeline opens with rows that have nothing near the view hidden: no event, lifespan or phase in view or within a quarter of the view's width of it. Rows with sub-rows always stay and say how many are hidden below them. Readers can turn it off in Filters, or have those rows drawn as thin lines in their place, and the link remembers their choice (`?rows=all`, `active` or `thin`). Set `false` to open with every row shown. |
| `compress` | no | On unless `false`: the timeline opens with long stretches without events shortened (the hatched gaps on the ruler and rows). Readers can turn it on or off in Filters, and a link's `compress=0` or `compress=1` wins. Set `false` where gaps mislead, e.g. a deep-time timeline before it has events to fill its span. Since version 10. |
| `continues` | no | Links to neighbouring timelines, drawn on the ruler at the year where they meet: a list of `{ "timeline": "<id>", "at": <year>, "side": "before" \| "after" }`. `at` is the year the other timeline opens at (readable years like `"330 BCE"` work in a source file built with `build-dataset.ts`); `side` says which end of this timeline it belongs to. Unknown timeline ids are simply not shown. |
| `context` | no | The timeline's own context lines: named periods across the whole timeline (the Bronze Age, the Age of Revolutions). See [context lines](#context-lines-context). Readers see ages in a strip under the ruler. A region's own periods (the Old Kingdom) are in its row's `context`. |
| `lines` | no | Display names for context lines, by line id: `{ "ages-aegean": { "name": "Aegean" } }`. A row's band labels each line with its `name`, even a band's only line; without one, a band with two or more lines makes a name from the id (`ages-central-europe` → "Central Europe") and a one-line band stays unlabelled. Each key must be a `line` some context span has. |
| `range` | no | `{ "start": <year>, "end": <year> }`: the period the timeline is about. The ruler doesn't extend past it, even when rows or uncertainty ranges do (the included timeline's Eastern Roman Empire row runs to 1453). Readable years work in a source file. |

### Context lines: `context`

`meta.context` (the timeline's own) and a row's or group's `context` list **context spans**: named periods on that
node, each with a `kind`, dated like a [phase](#tracks) (`start`, `end` or `ongoing`, `circa`, months and days,
[date claims](#date-claims-and-uncertain-dates), `startEvent`/`endEvent`) and cited:

```json
"context": [
  { "id": "late-bronze-age", "kind": "age", "name": "Late Bronze Age", "line": "three-age", "start": -1549, "end": -1199,
    "sources": [{ "sourceKey": "wp-bronze-age", "sourceLocation": "lead" }] }
]
```

| Field | Required | What |
|---|---|---|
| `id` | yes | Letters, digits and dashes; unique among all the timeline's context spans. Links can name it. |
| `kind` | yes | What sort of period: `age` (an archaeological or historical age; drawn) or `golden-age` (a high point; off by default, not drawn yet). Any other lowercase kind (letters, digits, dashes) is kept but not drawn, so a later kind needs no new version. |
| `name` | yes | |
| `sources` | yes | At least one. |
| `line` | no | Spans that divide the same years one way share a line, and spans of one kind on a line follow each other, anywhere in the timeline; neighbours may share a boundary year, as PeriodO's chains do (both ends there year-only), and are drawn meeting at the later one's start. Another line (a region's own periods) is an alternative division of the same years, so give each region's chain its own line. Spans without a line follow each other only on their own node. |
| `color` | no | `#rrggbb`. |
| `chronology` | no | The dating system its dates follow. |
| `url` | no | A page about the period, such as its Wikipedia article: readers can open it from the age. It isn't a date source; `sources` are. |
| `ids` | no | Its identifiers in other datasets, as a row's: `{ "wikidata": "Q…" }`. |

A context span must overlap `meta.range` when the timeline has one; it may run past it, as rows do, so an age that
crosses a seam keeps its own dates in both timelines. Version 7 files' `meta.eras` load as context spans of kind `age`:
an era with `tracks` moves to that row's `context` (see [versions](#versions)).

The app draws spans of kind `age` as **ages**: the timeline's own in a strip under the ruler, a row's as lines of that
row's strip, above its phases (on a region, its title band), a step lighter than its phases; a click or Enter opens an
age's details, article and sources. The Ages strip, and each row's ages, have one line per `line` (in the order lines
first appear there), named when the line has a name; lines with no age in the years in view are left out. In the Ages
strip, uncertain ends are hatched, an end past the timeline's range is cut with a dashed edge, and `color`, when set,
tints the age. Each age's tooltip and accessible name give its dates and sources;
clicking it opens its details: its dates, its article (`url`) and its sources as links, so every age reaches its
article and sources however narrow its bar. Ages never move the chart. An age with a `url` has a ↗ link to that page just before its name (when its bar
has room for both); the table view's Ages table links its name, plus its Wikidata id from `ids`, and names its region (its row, or "All
regions"). Deleting a row in edit mode names the ages that move to the strip. From the keyboard, each line of the strip or
a band is one Tab stop: ←/→ and Home/End move along it, and Enter opens the focused age's details (the ↗ links are
left out of the Tab order; the details link the article).

### calendar

| Field | Required | What |
|---|---|---|
| `before` | yes | Label for years before the epoch: `"BCE"`, `"BE"`, `"BF"`… |
| `after` | yes | Label for years from the epoch on: `"CE"`, `"AE"`, `"AF"`… |
| `yearZero` | yes | `true` if the calendar has a year 0. Real-world BCE/CE does not. |
| `aliases` | no | Other spellings readers may type in search: `{ "before": ["BC"], "after": ["AD"] }`. |
| `beforePresent` | no | Deep time (version 9): show years as time before a present instead of with `before`/`after`, e.g. `{ "present": 1950, "circaShare": 0.01 }`. The file still stores years in this calendar; only the display changes. See below. |

**`beforePresent`** (version 9) is for timelines measured in thousands to billions of years:

| Field | Required | What |
|---|---|---|
| `present` | yes | The stored year that is "present": `1950` for geology's and radiocarbon's BP (before present). Years show as their distance from it: "4.567 Ga", "66 Ma", "11.7 ka". |
| `circaShare` | no | How far an uncited "c." date fades, as a share of its age: `0.01` fades "c. 66 Ma" by 0.66 Ma either side. Without it, `meta.circaFade` years apply, which can't suit both 66 Ma and 11.7 ka. More than 0, at most 0.5. |

How the app shows it:

- **Years:** Ga and Ma as geologists write them ("4.567 Ga", "66 Ma"); from 10,000 years, "ka", and below that years, both
  with "BP" when `present` is `1950` ("11.7 ka BP", "9,600 years BP"; otherwise "11.7 ka", "9,600 years ago"). The
  present itself reads "present".
- **Lengths** (zoom steps, the ruler's "per tick", shortened gaps) in Gyr, Myr and kyr: "100 Myr / tick", "540 Myr".
- **The ruler** ticks on round ages (100 Ma, 200 Ma…, not round stored years) and stops at `present`, which is drawn
  as the era line.
- **"c."** with `circaShare`: the fade is that share of the date's age, at least `meta.circaFade` years (default 0).
  The share's cap of 0.5 keeps the fade short of the present.
- **Reading dates** (the search box, and source files built with `build-dataset.ts`): "4.567 Ga", "66 Ma", "11.7 ka",
  "11.7 ka BP", "c. 2.6 Ma", as well as stored years. A date claim's `year` may carry its margin in the same unit,
  `"251.902 ± 0.024 Ma"` (or `+/-`), which sets the claim's `margin` (the ± may use its own unit: `"66 Ma ± 500 ka"`); a ± anywhere else is an error.
- **Editors:** the event form, its date claims and the row form show deep-time dates as text with every digit
  ("251.902137 Ma") and each claim's margin as a length with its unit ("24 kyr", "0.5 Myr", "9,600 yrs"), in place of year,
  era and years. What's typed is checked as typed; a date or margin that can't be read stops the save and says why.
  A ± written with a claim's date must agree with the margin field (or leave the field empty); a ± beside a date with
  its own unit needs a unit too ("66 Ma ± 500 ka", not "66 Ma ± 500"); an event's own start and end take no ±.
  Saving unchanged keeps every year exactly.

## tracks

Each track is a row. Rows nest to **any depth** (e.g. group → region → civilization → period); each
level indents one step, and a faint guide line per level (with an elbow to the row's name) shows how
deep a row sits. A parent row can be collapsed so its sub-rows' events fold into it. Deep trees cost
label width, so three or four levels is a practical ceiling rather than a rule.

| Field | Required | What |
|---|---|---|
| `id` | yes | Unique. Events refer to it. Letters, digits and dashes recommended. |
| `name` | yes | Row label. |
| `color` | yes | `#rrggbb`. |
| `parent` | no | Id of the row this one sits under. |
| `kind` | no | What the row stands for: `"polity"` (a state, people, culture, faction or union: the default), `"person"`, or `"theme"` (a network, route, movement or trade, with no government of its own). |
| `chronology` | no | Dating system for events on this row; sub-rows inherit it. See [chronologies](#chronologies). |
| `span` | no | Lifespan: shaded across the row. One stretch, or a list of stretches. Leave it out on a row with phases to have it worked out from them. See below. |
| `phases` | no | Named periods on the row's own bar, e.g. successive governments. See below. |
| `memberOf` | no | Other rows this row belonged to for a stretch of years (a republic in a union). See [memberOf](#dated-memberships-memberof). |
| `context` | no | The row's or group's own context lines, such as a region's ages, drawn on its band. See [context lines](#context-lines-context). Kept by the track editor, not edited there. |
| `image` | no | Small image in the row label (`https://…` or a path on the app's own site). |
| `url` | no | A page about the row, such as its Wikipedia article (`https://…` or a path on the app's own site). The row's name links to it, in the chart and the table view. |
| `ids` | no | The row's identifiers in other datasets: `{ "wikidata": "Q11768" }` (a Wikidata item id). Shown in the table view and the CSV download. |
| `pinLast` | no | Keep at the bottom, e.g. "Other peoples" or "Other powers". Rows added in the editor go above it. |

**`span`** (lifespan): when the row existed. A stretch is `{ "start": …, "end": …, "circa": true }`, plus optional
`startDates` and `endDates` [date claims](#date-claims-and-uncertain-dates). Uncertain ends are drawn the same way as
on events. A row that existed, stopped and came back types a **list of stretches** in date order; the gaps between them
are left blank:

```json
"span": [
  { "start": 0, "end": 288 },
  { "start": 310, "ongoing": true }
]
```

**Worked out from phases.** A row with [phases](#tracks) and no `span` gets its lifespan from them: shaded where its
phases are, blank in the gaps between them. A gap means the row **didn't exist** then (a state partitioned away and
later restored). Phases that overlap, touch, or lie a year apart make one stretch, and a phase's uncertain edges count,
so a change of government is never a gap. Where the dates that meet give [months or days](#months-and-days), the
step is a month or a day: phases ending on 4 July and starting on 18 August of one year leave a gap; ending on 4 July
and starting on 5 July, they don't. Type a lifespan only when it says something the phases don't:

- the row **carried on through a gap** between its phases (a state whose rulers for those years aren't recorded as a
  phase): type one stretch across the gap;
- the row has no phases.

A typed lifespan must contain all of the row's phases (their best estimates); a file where it doesn't is refused,
naming the row and the phase. In the table view, a lifespan worked out from phases says "From its phases".

**`ongoing`**: `"ongoing": true` instead of `end`, on a lifespan stretch or a phase, means it is still going: it runs to
the timeline's [`present`](#top-level), as an ongoing event does. Use it for a state that still exists rather than
typing the present year as its end. Only the last stretch of a lifespan can be ongoing. An ongoing stretch or phase has
no end claims; it ends in an arrow on the chart, and its tooltip, the table view and search say "– ongoing".

**`ongoingSources`**: the sources that say an ongoing stretch or phase is still going, cited like events' `sources`. It
takes the place of end claims, so only an ongoing stretch or phase may have it; the table view lists them ("still going
per …"), and a lifespan worked out from phases takes them from its ongoing phase:

```json
{ "name": "Fifth Republic", "start": 1958, "ongoing": true,
  "ongoingSources": [{ "sourceKey": "wp-french-fifth-republic", "sourceLocation": "infobox life span: 1958–present" }] }
```

**`phases`**: a list of named periods within the row, for a state that changed hands over time without becoming a
different row: France's kingdoms, republics and empires, a dynasty's reigns, or a faction's councils in a fictional
timeline. Each phase is dated like a lifespan stretch (it may be `ongoing`), with a name:

```json
"phases": [
  { "name": "First Council", "start": 0, "end": 288 },
  { "name": "Second Council", "start": 288, "end": 459, "endDates": [{ "year": 459, "source": { "sourceKey": "annals", "sourceLocation": "book 3" } }] }
]
```

Each phase is drawn as a cell in a thin strip at the top of the row, under the lifespan's edge (the lifespan is the
only thing that shades the row itself). A line marks where each phase begins and where it ends, unless the next phase
begins there; neighbouring phases alternate shades, and a gap between phases leaves the strip blank. The name stays in
view while you scroll; a phase too short for its name has it beside the phase in the blank strip, with a pointer, when
there is room (else its tooltip names it). Zoomed out so far that no name fits, a strip is a thin line. Phases may
overlap, as rival governments do in a civil war; an overlapping phase goes on a second strip. A still-going phase
(`ongoing`) ends in an arrow, kept at the right edge of the chart while its end is off screen; a still-going lifespan
shows the same arrow on its top edge. A folded row shows only its own phases, over one lifespan: the years when it or
any row folded into it existed. Events stay on the row itself. In edit mode, the track editor lists a row's phases (name, dates, dated claims) and stores them in date
order. Search finds phases by name. From the keyboard, a row's strip lines are lines of the chart's keyboard grid, above
its events: ↑/↓ reach them, ←/→ and Home/End walk a line, and Enter opens the phase's details in the side panel (its
dates, each date's claims with their sources, the events that began and ended it).

### Succession: `startEvent`, `endEvent`

A lifespan stretch, a phase or a [membership](#dated-memberships-memberof) may name the event that began or ended it,
by its `uuid`:

```json
"span": { "start": 1922, "end": 1991, "startEvent": "ussr-founded", "endEvent": "ussr-dissolved" },
"phases": [
  { "name": "Ukrainian SSR", "start": 1919, "end": 1991, "endEvent": "ussr-dissolved" },
  { "name": "Ukraine (independent)", "start": 1991, "ongoing": true, "startEvent": "ussr-dissolved" }
]
```

- The event must exist and be dated within a year of the edge (its start to its end, or to `present` if ongoing). When
  the edge and the event both give a month, it must fall within a month of the edge (within a day, if the edge gives
  a day), so a row that changes hands several times in a year can't name the wrong change. An
  ongoing stretch or phase has no `endEvent`. Name an event only when its sources say it began or ended that phase.
- A lifespan worked out from phases takes its first phase's `startEvent` and last phase's `endEvent`.
- The event's detail panel lists what it **ended** and **began** (row, phase or lifespan, year). The lifespan's or
  phase's tooltip on the chart names its events ("Began with: …", "Ended with: …"), and the table view's rows table
  lists them under its dates, each a button that opens the event.
- The chart draws nothing extra for them: an event on several rows already draws a thread joining them.

### Dated memberships: `memberOf`

A row may belong to another row for a stretch of years: a republic in a union, a province in an empire, a realm in an
alliance. Each membership names the row it belonged to and is dated like a phase (`start`, `end` or `ongoing`, `circa`,
`startDates`/`endDates` [date claims](#date-claims-and-uncertain-dates), so it follows the Dating menu too, and
optional `startEvent`/`endEvent`), with the `sources` that place the row there (at least one):

```json
"memberOf": [
  { "row": "soviet-union", "start": 1922, "end": 1991,
    "startDates": [{ "year": 1922, "source": { "sourceKey": "wp-ukrainian-ssr", "sourceLocation": "infobox date_start: 30 December 1922" } }],
    "sources": [{ "sourceKey": "wp-ukrainian-ssr", "sourceLocation": "infobox event_start: USSR created" }],
    "startEvent": "ussr-founded", "endEvent": "ussr-dissolved" }
]
```

- **`phase`** (optional) names the phase of this row that held the membership, when the row has rival phases at the
  time: one `germany` row with West and East Germany as phases was in NATO and in the Warsaw Pact at once, so each
  membership says which (`"phase": "West Germany"`). The membership must lie within exactly one phase of that name
  (a row may reuse a name; the dates pick which). Leave it out for a membership that outlasts the phase it began in,
  since it belongs to the row: split a membership whose holder changed into two entries (Germany in NATO as West
  Germany to 3 October 1990, then as Germany). The strip's name says it: "West Germany in NATO, 1955–90".
- The row named must exist, and can't be the row itself or one of its own sub-rows. The membership's years (best
  estimates) must lie within one stretch of each row's lifespan (typed, or worked out from phases): a row can't belong
  to a union before either existed.
- On the chart, each membership is **one more strip line** on the member's row, under its phase strips: the union's
  name and years ("in Soviet Union, 1922–91") in the union's colour, as a faint cell with a dashed underline (phases
  are filled cells), with the same begin and end lines, arrow when `ongoing`, name placement and thin line when zoomed
  out as a phase. Memberships that overlap take a line each. Its tooltip names both rows, the years and the events
  that began and ended it; from the keyboard it is reached like a phase, and Enter opens its details (dates, claims,
  sources) in the side panel.
- A row that changes hands several times within one year needs its memberships dated in
  [months and days](#months-and-days): given in whole years, a membership that starts and ends in the same year
  covers that whole year, and one that ends in the year the next starts shares its line. Contested days, when two
  rows held it at once, are two memberships that overlap.
- The union's row lists its members with their years: in the tooltips of its name and lifespan, and in the table
  view's rows table ("Members (3): …"), which also lists each row's memberships with their sources. The event panel's
  "Began and ended" includes memberships that name the event.
- Renaming a row in the editor updates the memberships that name it; deleting it drops them. The track editor shows a
  row's memberships but doesn't edit them yet (it keeps them as they are).

**Not the same as [`memberships`](#memberships):** those place a row in facet values (regions, peoples), undated and
for filtering. `memberOf` names another **row**, for a stretch of years, and is drawn.

**Sides (`role`, schema 11.1).** A membership may name the side the row took, as a `role`: one of the sides the row
it belonged to lists in its `roles`, by slug, each with a display name. A war is the usual case: its row names the
sides, and each participant's membership says which one it fought on. A row that changed sides has one membership per
side, each with its own dates:

```json
{ "id": "world-war-ii", "name": "Second World War", "kind": "theme", "roles": { "axis": { "name": "Axis" }, "allies": { "name": "Allies" } } }
{ "id": "italy", "memberOf": [
  { "row": "world-war-ii", "role": "axis", "start": 1940, "startMonth": 6, "end": 1943, "endMonth": 9, "sources": [ … ] },
  { "row": "world-war-ii", "role": "allies", "start": 1943, "startMonth": 10, "end": 1945, "sources": [ … ] } ] }
```

A role and a side's slug are letters, digits and dashes. The app keeps a role it can't match to a side. The site's own
data is checked strictly: a role its row doesn't name is an error there, with the nearest side suggested.

### Lifespan, phases or a row?

- **A row** is one thing: a state, people or faction with its own identity. Something that existed alongside it, or
  that contained it, is a different thing and gets its own row.
- **Phases** are the names and governments the same thing had over time. A row with only one period needs no phase
  that repeats its name and dates: type them as its lifespan instead.
- **The lifespan** is when the row existed. Leave it out on a row with phases: it is worked out from them. Type one
  only when the row carried on through a gap between its phases (or has no phases); cite its start like its first
  phase's start, and make it `ongoing` if the row still exists.
- **A gap between phases** means the row didn't exist then (Poland after the partitions), unless its typed lifespan
  covers the gap: then it carried on without a phase of its own (Babylonia after the Kassites; a member while it was
  inside a union).
- **Overlapping phases** are rival or parallel governments of the same row: Vichy and Free France, East and West
  Germany, a government-in-exile and the one at home. **Overlapping rows** are distinct things that existed at the
  same time.
- **Unions** (a state made of others: the Soviet Union, the United Arab Republic) are their own rows, **never phases on
  their members**. A member keeps only its own phases (the Ukrainian SSR is Ukraine's own government, so it's a
  phase; "Soviet Union" on Ukraine's row would be a copy) and records the union as a
  [membership](#dated-memberships-memberof) (`memberOf`), which draws "in Soviet Union, 1922–91" on its row. The same
  goes for a province of an empire (Egypt in the Ottoman Empire) or a realm in an alliance. A member that carried on
  inside the union without a phase of its own types a lifespan across those years (Egypt 1958–71, Syria 1958–61).
- **Mergers and splits** are one event placed on every row involved: the union and each member that joins or leaves.
  An event on several rows draws a thread joining them. Name it as the `endEvent` of what it ended and the
  `startEvent` of what it began (see [succession](#succession-startevent-endevent)). Add `links` between such events
  where one leads to another (a union's founding `causes` a war; a restored name `succeeds` a civil war).
- **Events during a union** stay on the union's row. An event goes on a member's row as well only when it began or
  ended that member's membership or one of its phases, or when the member acted as itself (its own war, its own
  revolution). A union's coronation or its civil war is the union's; a member that seceded in that war gets the
  secession. This keeps member rows from repeating the union's history.
- **Still-existing things** are `ongoing`, never typed as ending at the present year; cite that they still exist in
  `ongoingSources`.

### memberships

**`memberships`**: the facet values a row belongs to (see [`meta.facets`](#meta)), each with the sources that place
it there, cited like date claims. Readers see the first facet's values as the row's **regions**; the app uses
"membership" only for [`memberOf`](#dated-memberships-memberof).

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

**Event categories.** Events join the values of a facet whose `applies` is `"events"` the same way. The Wikipedia-sourced
timelines share one such facet, `category`: twelve kinds of event (`rule`, `statehood`, `territory`, `place`, `disaster`,
`conflict`, `unrest`, `diplomacy`, `society`, `science`, `archaeology`, `life`), each with a few sub-kinds whose `broader` is their kind (`siege` is in
`conflict`). A ruler's time in office, as a span ("Reign of Sargon", "Presidency of Juárez"), is `reign` ("Reign or
term") in `rule`; the accession or death on a single date stays `succession`. A sourced gap in rule, as a span
("Ottoman Interregnum", "Time of Troubles"), is `interregnum` in `rule` (version 9). A **foundational text** as itself (a scripture, a law code, a charter or declaration, an epic or classic: the Code of
Hammurabi, Magna Carta, the Rigveda) is `text` ("Foundational text") in `society`, ahead of Laws, Religion or Culture. It has
four types, as Disasters has kind → cause → type: `scripture` "Scripture or religious text", `law-code` "Law code",
`charter` "Charter, constitution or declaration" and `classic` "Epic or classic"; a text no rule names a type for stays
`text`. One that makes a state or declares independence keeps that act as its main category, with its type second, and
a plain treaty stays `treaty`. `pipelines/common/text_classes.json` gives each type's Wikidata class (foundational
text, Q3519366) and the evidence the classifier reads; UNESCO's Memory of the World register is a reference, not evidence (it
also lists archives about events). **Disasters** (`disaster`, Kevin 2026-11-23) has three levels, kind → cause → type: `natural` (`eruption` "Volcanic
activity", `earthquake` "Earthquake or tsunami", `flood`, `storm`, `drought` "Drought or crop failure", `epidemic`,
`mass-movement`, `extreme-temperature`, `wildfire`, `impact` "Impact or space weather", `infestation`, `mass-extinction` "Mass extinction") and
`human-caused` (`famine`, `industrial` "Industrial accident", `transport` "Transport accident", `collapse` "Structural
collapse", `urban-fire`, `spill` "Spill or pollution", `crowd-crush`, `accident` "Accident or explosion",
`nuclear-test`). The names follow the IRDR peril classification as EM-DAT uses it (IRDR, *Peril classification and
hazard glossary*, IRDR DATA Publication No. 1, 2014; EM-DAT's tree as updated in September 2023);
`pipelines/common/disaster_classes.json` gives each value's EM-DAT class and Wikidata class, and every place we merge or
rename (e.g. tsunamis with earthquakes, dry and wet mass movements as one type, nuclear tests, crowd crushes and mass extinctions added). A
limnic eruption (Lake Nyos) is Volcanic activity, as in EM-DAT. A famine caused mainly by policy or war is human-caused,
not natural (Kevin, 2026-11-23); one classed as genocide (the Holodomor) also carries `atrocity` ("Massacre or
genocide") as its second category, and any other famine is natural, under "Drought or crop failure", as EM-DAT
reclassified most famines as drought; a contested famine's cause is decided by a quoted sentence in its own article and
brought to Kevin. **Two disasters at once:** a cascade (one hazard triggering another: an eruption's tsunami, a typhoon's
dam failure) keeps both types, the trigger first; a disaster made by war (the 1938 Yellow River dike breach) has the
conflict first and the hazard second. **Life and evolution** (`life`, Kevin 2026-11-23) holds the firsts and milestones
of Earth and Life: `first-appearance` ("First appearance": the earliest record of a group, such as the earliest land plants
or dinosaurs), `fossil-biota` ("Fossil biota": an exceptionally preserved assemblage, such as the Burgess Shale),
`human-evolution` ("Human evolution") and `earth-system` ("Change in the Earth system": the Great Oxidation Event, the
start of the Cambrian). Earth and Life's events are all set by reviewed overrides (`pipelines/earth-life/categories.json`),
because the classifier has no rule for them; its mass extinctions are `mass-extinction` under Disasters, and only the
K–Pg extinction also carries `impact` (the Chicxulub impact), as a second category. An event names at most two categories, the main one first (never a sub-kind beside its own kind), and each cites the
article the event is dated from. Modern States and Medieval World get them from their generators, with reviewed
corrections in each generator's `categories.json` (Earth and Life's are all reviewed) (`pipelines/README.md`). The app draws the main category's kind as a
shape before the event's title, names both categories in the table and the event's details, and filters by them
(Filters → Categories; an event with no category always shows). The editor picks them, citing the event's first source.
A golden age, or a society event lasting 25 years or more, is drawn on a line of its own just under its row's phases
(see `docs/development.md`, "Period lane").

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
| `dump` | no | The snapshot the values were read from, when not the live page: `"<wiki>-<YYYYMMDD>"`, e.g. `"enwiki-20261101"`. Kept apart from `accessed`, the date of reading. |
| `revision` | no | The page revision read (a revision id), for a permanent link. Needs `url`. |
| `hiddenByDefault` | no | Start with this source filtered out (spoilers). |

`tags` is an object of `{ "name": "…" }`, keyed by tag id. Readers can toggle all sources with a tag at once.

An event or claim cites a source with `{ "sourceKey": "<source id>", "sourceLocation": "p. 12" }`. `sourceLocation`
is what readers see. A generator may add a `locator`, the same place in a form scripts can find again (for a monthly
refresh), beside it:

| `locator.kind` | Fields |
|---|---|
| `"infobox"` | `field` (required), `value` |
| `"lead"` | `quote` (required) |
| `"section"` | `heading` (required), `quote` |
| `"category"` | `name` (required) |
| `"page"` | `page` (required) |

The editor keeps a locator while the reference is unchanged, and drops it when the location's text is edited.

## events

| Field | Required | What |
|---|---|---|
| `uuid` | yes | Unique id: letters, digits and dashes. Used in links to the event (`#id`). |
| `title` | yes | |
| `descr` | yes | Description; may be `""`. |
| `start` | yes | Best estimate of the start year (stored year). |
| `end` | no | Last year, inclusive. Leave out for a single-year event. |
| `ongoing` | no | Still going: runs to `present`. Use instead of `end`. |
| `ongoingSources` | no | Sources saying it is still going (only when `ongoing`), as on a lifespan. |
| `circa` | no | Approximate: shown with "c.". |
| `tracks` | yes | One or more track ids. An event on several rows gets a thread connecting them while it is selected. |
| `sources` | yes | Citations (may be `[]`). |
| `startDates`, `endDates` | no | [Date claims](#date-claims-and-uncertain-dates): what each source says the date is. |
| `chronology` | no | Overrides the chronology the event would get from its first track. |
| `order` | no | Order among events in the same year; lower comes first. |
| `importance` | no | `1` key, `2` normal (default), `3` minor. Key events have bold labels. A crowded or collapsed row places key events first and folds minor ones into "+N" first, so a reader scanning collapsed regions still sees the headline events. A "+N" that holds a key event names the earliest one ("Second World War +3"). |
| `links` | no | Connections to other events: `[{ "to": "<event uuid>", "kind": "causes" }]`. |
| `people` | no | The [people](#people) the event is about, by id (11.2): a reign names its ruler, so one person's reigns on several rows are known to be the same person. Kept by the editor; not drawn yet. |
| `memberships` | no | The facet values the event belongs to, cited like a row's [memberships](#memberships). Only facets whose `applies` is `"events"` or `"both"`. Kept by the editor; not drawn or filtered yet. |
| `edited` | no | Set by edit mode on events the reader added or changed; **Download in-progress** keeps it and **Download final** removes it. Don't write it by hand. |

Link kinds: `causes` (leads to), `part-of`, `succeeds`, `conquers`, `related`, and `with` (version 9: together,
such as co-rulers' reigns, Wikidata's P1706 "together with"). All but `related` and `with` draw as arrows; those two
have no direction and are stored once, on either event.

## people

**`people`** (schema 11.2): the people a timeline knows, keyed by id, outside the row tree. A timeline may know
thousands, which as rows would bury the polities. Events name them in their `people`.

```json
"people": {
  "darius-ii": {
    "name": "Darius II",
    "ids": { "wikidata": "Q202236" },
    "active": { "year": -440, "from": "born-died" },
    "born": { "year": -475, "source": { "sourceKey": "wikidata", "sourceLocation": "Q202236 P569 date of birth" } },
    "died": { "year": -404, "source": { "sourceKey": "wikidata", "sourceLocation": "Q202236 P570 date of death" } },
    "memberships": [{ "facet": "area", "value": "rulers-politics-military", "sources": [ … ] }],
    "rows": [{ "row": "achaemenid-empire", "via": "citizenship", "sources": [ … ] }]
  }
},
"events": [{ "uuid": "reign-darius-ii-persia", "people": ["darius-ii"], … }, { "uuid": "reign-darius-ii-egypt", "people": ["darius-ii"], … }]
```

| Field | Required | What |
|---|---|---|
| `name` | yes | |
| `ids` | no | Ids in other datasets, as a row's: `{ "wikidata": "Q202236" }`. |
| `active` | yes | The year the person is placed at: `{ "year", "from", "source"? }`. `from` says how it was found: `"source"` (a source gives it, such as a floruit; `source` is then required), or derived from `born`/`died` by a fixed rule: `"born-died"` (the middle of the life, rounded down), `"born"` (born + 30) or `"died"` (died − 20). |
| `born`, `died` | no | [Date claims](#date-claims-and-uncertain-dates): the year, with its source. Either may be unknown. |
| `memberships` | no | Values of facets whose `applies` is `"people"` (such as an `area`: rulers, science…), cited like a row's [memberships](#memberships). |
| `rows` | no | The rows the person belongs to (their country): `{ "row", "via"?, "sources" }`. `via` says how that was found: `"citizenship"` (Wikidata P27) or `"birthplace"` (the country of the place of birth, P19). |

A person isn't drawn yet; the block gives people one identity across rows and a place in time. Renaming or removing a
row in the editor updates its people's `rows`, and removing a source drops the citations of it (birth and death keep
their years). A source that a person's active year rests on (`from: "source"`) can't be deleted until they cite another.

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
| `month`, `day` | no | The month and day the source gives, if it gives them ([months and days](#months-and-days)). |
| `margin` | no | ± years, if the source states one. A range such as "1627–1600" is a year of 1614 with margin 14. |
| `chronology` | no | The dating system this value belongs to. |
| `source` | no | Where it comes from. Strongly recommended. |
| `note` | no | Shown under the claim. |

**How the range is worked out.** For each date the app takes every claim's `year − margin` to
`year + margin`, adds any values [derived from another chronology](#chronologies), and includes the best
estimate itself (± `circaFade` if `circa` is set). The range runs from the earliest to the latest of
these. If they all agree, there's no range and the date is drawn sharp. Margins are never typed
directly onto a date; they come only from claims. When the best estimate and every claim give a month (and none has a
margin or another dating system), the range runs in months or days instead: from the earliest date to the latest
(Stalingrad began on 17 July or 23 August 1942).

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

- The required fields above are present; `schemaVersion` is 10, or 3 to 9 (lifted to 10 when loaded).
- `calendar.beforePresent`, when set, has a whole-number `present`, and a `circaShare` more than 0 and at most 0.5.
- `meta.id` and event `uuid`s use only letters, digits and dashes; event ids and track ids are unique.
- `defaultIncrement` is one of `increments`, which are positive whole numbers or `"quarter"`, `"month"`, `"week"`,
  `"day"`.
- Every year is a whole number; an `end` is not before its `start`, for events, lifespans and phases (compared on full
  dates where months and days are given). A month is 1–12; a day has a month and exists in it; an end month or day
  has an end year.
- A lifespan stretch or phase has an `end` or `"ongoing": true`, not both. A lifespan given as a list has at least one
  stretch, in date order, without overlaps; only the last can be ongoing. A typed lifespan contains all of the row's
  phases.
- Every referenced track, parent, source, tag, chronology and linked event exists.
- No row is its own ancestor (rows may nest to any depth).
- Facet and value ids use letters, digits and dashes; every `broader` value exists and none contains itself.
  Every membership names a known facet and value and cites at least one known source.
- A derived chronology derives from one in the same group, by a whole number of years.
- Margins are zero or more. Each best estimate lies within the range of its own claims.
- `endDates` only appear on events, stretches and phases that have an `end`. Events don't link to themselves.
- A `startEvent` or `endEvent` names an existing event dated within a year of that edge (within a month or a day when
  both give them); an ongoing stretch, phase or membership has no `endEvent`.
- A `memberOf` entry names an existing row other than the row itself or its sub-rows, is dated like a phase, lies
  within both rows' lifespans (best estimates), and cites at least one known source. Its `phase`, if given, is one
  phase of that name on the row that contains it.
- A facet's `applies` is `tracks`, `events`, `both` or `people`, and every row's, event's or person's membership is in
  a facet that applies to it (`both` doesn't include people). A row's `kind` is `polity`, `person` or `theme`.
- People (11.2): an id of letters, digits and dashes, a name, an `active` year with its `from`; `born` no later than
  `died`; each row a known row with at least one known source. An event's `people` are ids the timeline has, each named once. Strictly
  (the site's own data): `from` and `via` are known values, `"source"` cites one, and a derived year is exactly what
  its rule gives.
- Context spans have unique ids, a lowercase `kind`, a name and at least one known source, are dated like phases,
  overlap `meta.range` when set, and don't overlap others of their kind on their line (on their node, without a line).
  Each `meta.lines` key is a line some span has.
- A source's `dump` looks like `enwiki-20261101`; a `revision` is a positive whole number on a source with a `url`. A
  `locator` has a known `kind` and that kind's fields only.
- `redirects` map ids the timeline doesn't have to rows, events or context spans it has, or to `null`.
- `present` is a whole year; `meta.circaFade` is zero or more; `meta.hideRowsOutOfView` and `meta.compress` are `true` or `false`;
  `meta.range` has whole years with `start` before `end`; each `meta.continues` entry has a timeline id, a whole-year
  `at` and a `side` of `"before"` or `"after"`.
- `ongoingSources` appear only on an ongoing event, stretch or phase, and each cites a known source.
- A row's `ids.wikidata` is a Wikidata item id (`Q` and digits).
- **Links and images** (`url`, `image`, `creditsImage`) are `http(s)://` addresses or relative paths.
  Timelines can come from anyone, so anything else (such as `javascript:`) is refused.

**Strict checks for the bundled timelines.** The app loads a file with fields it doesn't know (a newer tool's, say) and
ignores them, and it keeps a context span of an unknown `kind` without drawing it. The site's own build and CI are stricter,
so a typo can't load silently: every bundled and private timeline compiles through `validateStrict`
(`src/data/strict.ts`), where an unknown field anywhere (`"rol"` for `"role"`) or an unknown context kind is an error that
names the place and the nearest known name. The known fields are those the schema's test fixture
(`src/data/fixtures/everyField.ts`) sets, and the build already requires it to set every field of the format, so a new
field is known as soon as it's added.

## The site's list of timelines

A site lists its own timelines in `timelines/index.json`, next to the files. (This repo makes it at build time from
the files in `public/timelines/`, in the order `data-src/site-timelines.json` gives; see
[development.md](development.md#building-the-included-timeline).)
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

The first entry opens by default. In this repo the build writes the list from the files in `public/timelines/`,
filling in every optional field from the files themselves; `data-src/site-timelines.json` gives the order (timeline
ids) and any entries for timelines on other sites (`https://` files); `npm run data -- index` prints it. Entries
with a missing or unsafe `id`, `title` or `file` are skipped. A site without the file, or with an empty list, opens on
a page that asks readers to add a timeline.

## Sharing a timeline

- **Host the file** anywhere that allows other sites to read it (CORS). GitHub raw files, GitHub Pages
  and gists do. A GitHub page link (`github.com/…/blob/…`) is converted to the raw file automatically.
- **Share** `<app address>/?data=<file link>`. It opens the timeline and saves it in the reader's browser.
  Add `&inc=100&at=-1500` to set the zoom and position, or `#<event id>` to open an event. Below a year, `inc` names
  the step and `at` is a date: `&inc=month&at=1916-07-01`. The link also carries
  the reader's view: `&view=table`, `&compress=0`, `&rows=all|active|thin` (hidden rows), ticked regions
  (`&regions=anatolia,nile`), a comparison set (`&set=<row ids>&order=related|start`) and ticked event categories
  (`&cat=conflict,siege`). Row and source toggles and
  dating choices aren't in the link yet.
- **Open on a span of years:** `&from=1914&to=1918` (years or full dates, read like `at`) opens on the finest zoom at
  which the span fits the screen, centred on it. It overrides `inc` and `at`, and the link keeps it until the reader
  scrolls or zooms. Only one of the two, or `from` not before `to`, is ignored.
- **Link versions:** the app writes `v=1` first, then the view in a fixed order (`from`, `to` or `inc`, `at`; `view`,
  `compress`, `rows`, `regions`, `set`, `order`, `cat`), lists in a fixed order (regions and categories as the
  timeline lists them, a comparison set as picked), commas unescaped, and only what differs from how the timeline
  opens. Links without `v` (made before) open as they always did. A link from a newer version of the app opens with a
  notice and applies what it can; a link naming rows, events, regions or categories the timeline doesn't have opens
  without them and says how many, once.
- **Rename or remove ids with care:** links name rows, events, regions and categories by id. Add the old id to `redirects` (see
  [keeping ids stable](#keeping-ids-stable)) and old links keep working; a link naming an id redirected to `null` says
  it was removed from this timeline.
- **Update** by replacing the file at the same link. Readers get the new version the next time they open the
  timeline (the app checks the link for a few seconds, then opens the saved copy if it can't reach it), or with
  **Update** in Customize → Timelines. Edits a reader made are kept on top of the new version.

## Keeping ids stable

Links, saved views and handouts name rows, events, regions and the rest by id, so an id that disappears breaks
them quietly: the link opens, minus that part of the view. `redirects` keeps them working:

```json
"redirects": { "kingdom-of-quay": "quay", "storm-of-131": null }
```

- **Renamed** row, event or context span: map the old id to the new one. A link that names the old id opens on the new one.
- **Removed on purpose:** map the old id to `null`. A link that names it skips it.
- **Other ids** (facets, regions, sources, tags, chronologies) can only be mapped to `null`.
- Redirects don't chain: a target can't itself be a key. When an id is renamed again, point the oldest id straight at
  the newest.

For the timelines in this repository, CI runs the id-stability check on every pull request:
`npm run data -- ids --check` compares each compiled file in `public/timelines/` with the same file on `origin/main`,
and fails on any id that disappeared without a redirect. It prints one line per lost id. Run it before opening a pull
request that renames or removes anything. `--base <rev>` compares with another revision, and folder arguments check
other folders of compiled timelines in any git repository.

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

Text dates are accepted for `start`, `end`, claim `year` and `derive.until`, on each stretch of a lifespan list and
each `memberOf` entry too. A "c." on a start sets `circa`. `start`, `end` and claim `year` may give a month and day:
`"28 June 1914"`, `"June 1914"`, `"Sept 1916"` (three letters or more), `"c. July 1916"`, `"15 March 44 BCE"`, or
`"1914-06-28"` (an ISO date; its year is the stored year, so `-0043-03-15` is 44 BCE). They compile to the
[month and day fields](#months-and-days). Era labels and their `aliases` come from the file's own
calendar. Numbers pass through unchanged. `data-src/ancient-classical.json` is a full example.

## Versions

The app writes the current version and reads older ones, lifting them step by step when a file is loaded, uploaded,
fetched from a link, restored from the library or compiled (`src/data/migrate.ts`). An older app given a newer file
says "Unsupported schemaVersion" rather than failing on a field it doesn't know.

| Version | What changed |
|---|---|
| 11 | **Core 1.0** (minor 0): from here the format only grows by additions, counted by `schemaMinor` (see below). A reader loads a file with a newer minor, with a notice, keeps fields it doesn't know, and keeps link, row and locator kinds and facet `applies` values it doesn't know (ignoring them); the site's own data is checked strictly. **Minor 1:** a membership's [`role`](#dated-memberships-memberof) and a row's `roles` (a war's sides). **Minor 2:** [`people`](#people), an event's `people`, and facets that apply to `"people"`. A version 10 file is read as it is. |
| 10 | [`meta.compress`](#meta): whether the timeline opens with gaps shortened (default on), e.g. off for deep time until it has events. Additive: a version 9 file is read as it is. |
| 9 | [`calendar.beforePresent`](#calendar): deep time, with years shown before a `present` (e.g. 1950) and an optional `circaShare` for "c." dates; the `with` link kind (together, e.g. co-rulers); the `interregnum` sub-kind of `rule`. Additive: a version 8 file is read as it is. |
| 8 | Context lines: `meta.context` and a row's `context` ([context spans](#context-lines-context), each with a `kind`), and `meta.lines` (line names). Breaking: `meta.eras` becomes context spans of kind `age` with the same ids (an era with `tracks` moves to that row's `context`; a second row gets a copy as `<id>--<row>`), `group` becomes `line`, and `meta.eraGroups` becomes `meta.lines`. |
| 7 | An era's `tracks` (the rows an age belongs to, such as a region), and `meta.eraGroups` (era groups' display names). Additive: a version 6 file is read as it is. Never released: it folded into 8. |
| 6 | An era's `url` (a page about the age) and `ids` (`wikidata`). Additive: a version 5 file is read as it is. |
| 5 | Facets on events (`applies`, event `memberships`), `meta.eras` (since 8: [context lines](#context-lines-context)), row `kind`, events' `ongoingSources`, sources' `dump` and `revision`, source `locator`s, the `phase` of a [`memberOf`](#dated-memberships-memberof) entry, and `redirects`. Additive: a version 4 file is read as it is. |
| 4 | Dates may give [months and days](#months-and-days); `meta.increments` may name steps below a year. Additive: a version 3 file is read as it is. |
| 3 | Generic timelines: rows (tracks) with lifespans, phases and memberships, sources, chronologies, events. |

A new version adds a step to `migrate.ts`, a row here, and bumps `SCHEMA_VERSION`. Each version has a test file in
`src/data/fixtures/`, checked by `src/data/schemaVersions.test.ts`:

- `everyField.ts` sets every field of the current version somewhere. The build fails when a field is added to
  `src/types.ts` and not set there, and the editor round-trip test saves all of it.
- It is written out as `v<version>.json`. Once a version is released its file never changes (the test checks a hash),
  and `v<version>.lifted.json` records what it becomes in the current version.
- Lifting a file twice gives the same result as lifting it once, for the fixtures and every timeline.

A change is additive when every file of the old version is a valid file of the new one, with the same meaning; it
needs only a new number. Renaming, removing or re-meaning a field, making one required, or refusing something that
used to load is a breaking change, and its step must carry every value forward.
