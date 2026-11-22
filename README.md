# Timelines

> [!NOTE]
> **Under heavy development.** The app and its timeline data are being built and processed right now: features,
> rows, events, categories and dates change often. Check back regularly.

A web app for horizontal swimlane timelines, historical or fictional. Each timeline is one JSON file with its own
rows, calendar, zoom steps and sources. The app is a static site: build it once, serve it from any web server, and
give it your own timelines.

**Live site:** https://rishenko.github.io/timelines/

## Included timelines

Every date cites the Wikipedia article it comes from; see [Data sources and AI use](#data-sources-and-ai-use).

- **Ancient and Classical World**, c. 9000 BCE – 650 CE: from the first farmers to the rise of Islam, across Europe,
  Africa, the Near East, Asia, Oceania and the Americas. 371 rows, 883 events.
- **Medieval World**, 650–1500: realms with their dynasties as phases, and unions and empires as their own rows.
  379 rows, 563 events.
- **Modern States**, 1500 to today: every state in the world, with its governments as phases and its memberships in
  unions and empires. 602 rows, 1,508 events.

The three link to each other where they meet, at 650 and 1500.

## Features

### Rows and time

- **Rows** nest to any depth and expand or collapse; a collapsed row gathers its sub-rows' events. *Expand all*,
  *Collapse all* and ↺ (back to the way the timeline opens) act on every row at once.
- **Lifespans:** the shaded band behind a row shows when it existed, with soft edges where its start or end is
  uncertain, gaps where it didn't exist, and an arrow when it is still going.
- **Phases:** a row's governments, dynasties or eras, in a strip along its top. Rival phases that overlapped (two
  governments in a civil war) take a second strip.
- **Memberships:** a row that belonged to another row for a while (a republic in a union, a province in an empire)
  shows "in" that row's name and years on one more strip; the union's row lists its members.
- **Calendars:** BCE/CE, or your own era names, with or without a year 0.
- **Days and months:** any date can give a month or a day. A timeline can offer zoom steps below a year (quarter,
  month, week, day), and the ruler then labels months or days.
- **The ruler and zoom:** pick the time each tick covers (buttons, `+`/`−`, or pinch), and scroll or drag through
  time. At the widest zoom only key events are drawn.
- **Shortened gaps:** long stretches with no events are squeezed, labelled with the time skipped (Filters → Display).
- **Neighbouring timelines:** a timeline can link to the one before or after it, on the ruler where they meet.

### Events and evidence

- **Events** on one row or several, as a bar from start to end, or a diamond for a single date. An event on several
  rows is joined by a thread while it is selected.
- **Key and folded events:** key events have bold labels and are placed first in a crowded or collapsed row; events
  that don't fit fold into "+N". A "+N" that holds a key event names it ("Second World War +3"). A row's ⇣ button
  shows all its lines of events.
- **Connections** between events (causes, part of, succeeds, conquers, related), drawn as arrows; pointing at or
  selecting an event highlights what it is connected to.
- **Uncertain dates:** each date records what every source says (its *date claims*), and the range they allow is
  drawn as hatched, lighter ends. "c." marks an approximate date.
- **Dating systems:** where scholars date a region differently (such as Mesopotamia's High, Middle and Low
  chronologies), the **Dating** menu switches between them and the events move to match.
- **Sources:** events, date claims and memberships cite their sources with a page or section; event details list
  them, with the dates each source gives.
- **Event details:** the description, dates, sources, connections, and what the event began or ended, with a *Copy
  link* button.
- **Maps** (Ancient and Classical): opening an event shows its rows on a map of its year: borders where a source has
  them, else a pin and the map from the row's Wikipedia article.

### Finding your way

- **Search** rows, phases and events, or type a year or a date ("1 July 1916") to go there. `/` searches from
  anywhere.
- **Regions:** Filters → Data filters → Regions shows only the rows in the regions you tick, with narrower regions
  folded under broader ones. Each row's regions cite their sources, shown in the table view and the row name's
  tooltip.
- **Kinds of event:** a shape before each event's title says what kind it was (rulers, statehood, territory, cities
  and places, wars and battles, revolts, diplomacy, religion, law and culture, archaeology, science and technology).
  Filters → Data filters →
  Categories shows only the kinds you tick; the table and an event's details name its categories.
- **Ages:** periods across the whole timeline, such as the Islamic Golden Age or the Enlightenment, in a strip under
  the ruler; click one to centre the chart on it.
- **Comparison sets:** pick rows from anywhere (the + on a row's label, the "Add a row" box, or "Compare these rows"
  under a region filter) and see them side by side: as picked, related rows together, or by start date.
- **Hidden rows:** rows with nothing near the years on screen are hidden as you move (or drawn as thin lines), so a
  timeline with many short-lived rows stays readable. Filters → Display shows them all again; the ruler's corner says
  how many are hidden.
- **Filters:** *Display* (how the chart draws: shortened gaps, hidden rows) and *Data filters* (what it shows:
  regions, rows and sources as folding lists with a find box, source tags). A timeline can start with some sources
  hidden, to avoid spoilers.

### Views

- **The chart**, with a busy ring in its top-right corner while rows or a slow change are still being drawn.
- **Table view:** the same events and rows with dates, ranges and sources in words, sortable by date or title, with
  a CSV download of the events listed.
- **Legend:** explains every symbol, colour, line and key the open timeline uses, and starts a one-minute **guided
  tour**.
- **Themes:** four presets and custom colours.
- **Phones and tablets:** touch panning, pinch zoom and a compact toolbar.

### Your own timelines

- **Open timelines** from a file, a link (`?data=`) or a shared list of timelines (`?collection=`). Timelines and
  lists from a link are checked for a newer version each time they open, and open from the saved copy when offline. Customize →
  Timelines copies the share link of a timeline or list opened from a link.
- **Links** reopen a timeline at the same zoom, position, view, chart settings, regions, comparison set and event.
- **Edit mode** (Customize → Edit): add and change events, rows, phases, sources and their date claims. Add an event
  with *+ Event*, a double-click, or a long press on an empty spot in a row. Edits stay in the browser as changes on
  top of the published timeline, so they carry over to its next version; *Discard local edits* goes back to it.
- **Download** a timeline as JSON, *in progress* (your changes marked) or *final* (ready to publish).

### Accessibility

Target: WCAG 2.2 AA. Done: landmarks and a skip link; screen-reader names that carry each event's dates, rows and
importance; the table view as a full alternative to the chart; keyboard control of the chart as one Tab stop (the
Legend lists the keys); text contrast of at least 4.5:1, and marks, focus outlines and form fields of at least 3:1, in
every theme preset; reflow down to 320 px and at 200% zoom; controls of at least 24 × 24 px; a button for every
gesture; form errors tied to their fields; and less motion when the system asks for it. Not done yet: Windows high
contrast (`forced-colors`) and testing with screen readers. Coverage per criterion:
[docs/wcag-coverage.md](docs/wcag-coverage.md).

## Your own site and data

`npm run build` writes the site to `dist/`: plain HTML, JavaScript and CSS with relative paths, for any static web
server, in any folder. There is no backend: the site's timelines are JSON files in `dist/timelines/`, and readers'
own timelines and edits stay in their browser.

A timeline is one JSON file. Copy [docs/examples/example-timeline.json](docs/examples/example-timeline.json), a small
fictional kingdom, and see [docs/data-format.md](docs/data-format.md) for every field. To show it:

1. **On your site:** add the file to `public/timelines/` before building, or to `timelines/` on a built site with an
   entry in its `timelines/index.json` ([the site's list](docs/data-format.md#the-sites-list-of-timelines)).
2. **By link:** host the file anywhere that lets other sites read it (GitHub raw files, GitHub Pages and gists do)
   and share `<your site>/?data=<link to the file>`.
3. **As a shared list:** a group keeps its own list of timelines online and shares
   `<your site>/?collection=<link to the list>` ([shared lists](docs/data-format.md#shared-lists)).
4. **In the browser:** Customize → Timelines → *Add from a file…*, or paste a link to a timeline or a list. These are
   saved in that browser only.

Every file is validated before it opens. Links and images inside a timeline must be `http(s)` addresses or relative
paths.

## Development

Setup, commands, the code map, the data tooling and the checks are in [docs/development.md](docs/development.md).

## Documentation

| File | What |
|---|---|
| [docs/data-format.md](docs/data-format.md) | The timeline file format, the rules it must pass, and how to share a timeline |
| [docs/examples/example-timeline.json](docs/examples/example-timeline.json) | A complete example to copy |
| [docs/development.md](docs/development.md) | Setup, commands, code map, data tooling and checks |
| [docs/glossary.md](docs/glossary.md) | The words the app and the docs use for what a reader sees |
| [pipelines/README.md](pipelines/README.md) | The generators that build Medieval World and Modern States from a Wikipedia dump |
| [docs/ancient-classical-sources.md](docs/ancient-classical-sources.md) | How Ancient and Classical was made from two earlier timelines, and the changes since |
| [docs/ancient-sources.md](docs/ancient-sources.md), [docs/classical-sources.md](docs/classical-sources.md) | Where its dates come from, and the judgment calls |
| [docs/ancient-classical-map.md](docs/ancient-classical-map.md) | Which rows its event maps can draw, and from what |
| [docs/ancient-classical-key-events.md](docs/ancient-classical-key-events.md) | Which of its events are marked key or minor |
| [archive/README.md](archive/README.md) | The two original timelines and the scripts that built them |
| [docs/BACKLOG.md](docs/BACKLOG.md) | Planned work |
| [docs/feature-audit.md](docs/feature-audit.md) | Features under consideration, including the accessibility plan |
| [docs/wcag-coverage.md](docs/wcag-coverage.md), [docs/wcag-report.md](docs/wcag-report.md) | Which WCAG 2.2 AA criteria the automated checks cover, and the latest results |

## Data sources and AI use

The code, tests and documentation were written with the help of an AI coding assistant
([Claude Code](https://claude.com/claude-code), Anthropic), directed and reviewed by the author.

The included timelines were compiled with AI assistance from English Wikipedia. No date was invented: every year and
margin comes from a cited page, and where pages disagree, every value is kept. Pages carrying a notice that they
contain AI-generated text are not used. None of the timelines has been reviewed by a specialist yet.

- **Ancient and Classical World:** the assistant read the cited articles (17–18 November 2026) and transcribed their
  dates; the descriptions are its own summaries. Books and papers appear only where Wikipedia cites them, tagged
  **Cited via Wikipedia (not checked)**.
- **Medieval World** and **Modern States:** built by the generators in [pipelines/](pipelines/README.md) from the
  English Wikipedia dump of 1 November 2026. Each date cites the infobox field, heading or sentence it was read from,
  and each build lists every article it read (`data-src/provenance/`). Medieval World's descriptions say only what
  sentences in the cited articles say; events with no such sentence have none. Modern States' descriptions are the
  assistant's own summaries.

The Ancient and Classical event maps draw borders from
[Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) (Seshat Global History Databank, CC BY 4.0;
simplified and cut to each row's lifespan) on land from [Natural Earth](https://www.naturalearthdata.com/) (public
domain). Rows without borders in a year get the location from their Wikipedia article (or its infobox map, or
Wikidata) and that article's map image, shown from Wikimedia Commons with its author and licence. Medieval World also
cites Cliopatria for one row's end (Srivijaya), as a second date claim beside its article's.

## License

Code: [MIT](LICENSE). Timeline data and maps: [CC BY 4.0](LICENSE-DATA.md), except third-party material that keeps
its own licence (listed in `LICENSE-DATA.md` and in each file's credits). Wikipedia text is CC BY-SA; the timelines
quote only dates and short phrases, and link each article. By [rishenko](https://github.com/rishenko).
