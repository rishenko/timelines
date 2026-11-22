# Timelines

A web app for horizontal swimlane timelines, fictional or historical. Each timeline is one JSON file with its own
rows, calendar, zoom levels and sources. The app is a static site: build it once, serve it from any web server, and
give it your own timeline data.

**Live site:** https://rishenko.github.io/timelines/

## Included timeline

**Ancient and Classical World**: from the first farmers to the rise of Islam, c. 9000 BCE – 650 CE, across Europe,
Africa, the Near East, Asia, Oceania and the Americas. 883 events on 368 rows. It began as two timelines, Ancient
Civilizations (c. 9000–330 BCE) and The Classical World (c. 500 BCE – 650 CE), merged into one in November 2026; they
are kept in [archive/](archive/README.md).

Every date cites the Wikipedia article it comes from. See [Data sources and AI use](#data-sources-and-ai-use).

## Quick start

Requires Node 22.22.2 or newer on the 22 line, or 24.15 or newer.

```sh
npm install
npm run dev      # http://localhost:5173
```

## Host it

```sh
npm run build    # writes the site to dist/
```

`dist/` is plain HTML, JavaScript and CSS with relative paths. Copy it to any static web server, in any folder.
There is no backend or database: the site's timelines are JSON files in `dist/timelines/`, readers can add more from
a link or a file, and readers' changes stay in their own browser. The Deploy workflow (started by hand, from `main`) publishes it to GitHub Pages; see [development.md](docs/development.md#commands).

The built site doesn't need to be built again to change its timelines: replace, add or remove files in
`timelines/` on the server and update `timelines/index.json`, the site's list (see below).

## Use your own timeline data

A timeline is one JSON file. Copy [docs/examples/example-timeline.json](docs/examples/example-timeline.json), a
small fictional kingdom, and see [docs/data-format.md](docs/data-format.md) for every field.

There are four ways to get a timeline into the app:

1. **Put it on your site.** Add the file to `public/timelines/`: the dev server and the build list every file there
   in `timelines/index.json` (the build writes both into `dist/timelines/`). To place it in the list (the first
   opens by default), add its `meta.id` to `data-src/site-timelines.json`; files not named there come last. On a site
   that is already built, copy the file into its `timelines/` folder and add an entry to `timelines/index.json` by
   hand: `{ "id": "<the file's meta.id>", "title": "…", "file": "my-timeline.json" }`. The first entry opens by
   default; remove the included timeline by deleting its file and entry. A site with no timelines at all
   opens on a page that asks readers to add one. See
   [the site's list of timelines](docs/data-format.md#the-sites-list-of-timelines).
2. **Link to it.** Host the file anywhere that lets other sites read it (GitHub raw files, GitHub Pages and gists
   do) and open `<your site>/?data=<link to the file>`. Anyone with the link sees the same timeline.
3. **Share a list of them.** A group can keep its own list of timelines, in the same format as `timelines/index.json`,
   anywhere online, and share `<your site>/?collection=<link to the list>`. Each reader's picker then shows the
   list's timelines next to the site's. See [shared lists](docs/data-format.md#shared-lists).
4. **Add it in the browser.** Customize → Timelines → *Add from a file…*, or paste a link to a timeline or a list
   there. Timelines added this way are saved in that browser only.

You can also build or change a timeline in edit mode (Customize → Edit) and download the result as JSON.

Every file is validated before it opens. Because timelines can come from anyone, links and images inside them must
be `http(s)` addresses or relative paths.

## Features

### Reading a timeline

- **Rows** that nest to any depth and fold away, with lifespans, named phases (dynasties, governments) and an
  optional image. *Expand all*, *Collapse all* and ↺ (back to the way the timeline opens) fold every row at once.
- **Region filter:** Filters → Data filters → Regions shows only the rows in the regions you tick (broad regions with the narrower ones
  folded under them). Each row's regions come from its sources, listed in the table view and the row name's tooltip;
  the ticked regions go into the link (`&regions=anatolia,nile`).
- **Comparison sets:** pick rows from anywhere (the + on a row's label, the "Add a row" box, or "Compare these rows"
  under a region filter) and see them side by side, each with its region: as picked, related rows together, or by start
  date. The set goes into the link (`&set=hittites,pharaonic-egypt&order=related`).
- **Any calendar:** BCE/CE or your own era names, with or without a year 0.
- **Uncertain dates** drawn as hatched ranges, worked out from what each source says. Alternative dating systems
  (such as Mesopotamia's High, Middle and Low chronologies) that readers can switch between in the **Dating** menu.
- **Events** on one row or several (joined by a thread when selected), with a start and end, or ongoing to the timeline's "now".
- **Connections** between events (causes, part of, succeeds, conquers, related), drawn as arrows, and the line joining a
  shared event's rows while it is selected.
- **Key events** stay visible when you zoom out or fold a crowded row; minor events fold into "+N". A row's
  "show all" button unfolds its "+N" groups.
- **Event details:** the dates each source gives, the sources with page or section, the connections, a map, and a
  *Copy link* button.
- **Maps:** opening an event shows its rows on a map of its year: borders where a source has them, else a pin at
  the row's location and the map from its Wikipedia article. Loaded only when an event is opened.
- **Row links:** a row's name can link to a page about it; in the included timeline, its Wikipedia article. Rows can
  also carry a Wikidata id, shown in the table view and the CSV download.
- **Zoom** by years per tick (buttons, `+`/`−`, or pinch). Long empty stretches are shortened (Filters → Visual
  filters → *Shorten gaps with no events*).
- **Hide rows with nothing in view**, or draw them as thin lines, so a timeline with many short-lived rows stays
  readable (Filters → Visual filters → Rows). The ruler corner says how many are hidden.
- **A busy ring** in the chart's top-right corner while the rows are about to change after a sideways scroll, or while
  a slow update (filters, regions, a comparison, dating) is drawn; the chart is marked busy for screen readers.
- **Search** across rows, phases and events, or type a year to go there (`/` from anywhere).
- **Filters** in two sections: *Visual filters* (how the chart draws: gaps, connections, hidden rows) and *Data
  filters* (what it shows: regions, rows and sources as folding lists with a find box, source tags). While regions are
  ticked, the rows and sources outside them are dimmed. A timeline can start with some sources hidden (to avoid
  spoilers).
- **Legend** that explains only what the open timeline uses, including the keyboard keys, and a one-minute
  **guided tour**.
- **Table view** of the same events and rows, with dates and sources in words, and a CSV download of the events
  listed.
- **Neighbouring timelines:** a timeline can link to the one before or after it, drawn on the ruler where they meet.
- **Themes:** four presets and custom colours.
- **Phones and tablets:** touch panning, pinch zoom and a compact toolbar.
- **Links** that reopen a timeline at the same zoom, position, view, row settings and event.

### Your own timelines

- **Open timelines** from a file, a link (`?data=`) or a shared list (`?collection=`); see
  [Use your own timeline data](#use-your-own-timeline-data). Timelines and lists from a link are checked for a newer
  version each time they open, and open from the saved copy when offline.
- **Edit mode** (Customize → Edit): add and change events, rows, phases, sources and their dated claims; add an
  event with *+ Event*, a double-click or a long press on an empty spot in a row. Edits are kept in the browser as
  changes on top of the published timeline, so they carry over to a new version of it.
- **Download** the result as JSON, *in progress* (your changes marked) or *final* (ready to publish), and upload a
  JSON file to add it to your timelines.

### Accessibility

Target: WCAG 2.2 AA. Done so far ([docs/feature-audit.md](docs/feature-audit.md), item 23):

- Landmarks, a skip link, and screen-reader names that carry each event's dates, rows and importance.
- The table view as a full alternative to the chart.
- Keyboard control of the chart as a single Tab stop:

  | Key | Does |
  |---|---|
  | ← → | Previous or next event in the row |
  | ↑ ↓ | Nearest event in the row above or below |
  | Home, End | First or last event in the row |
  | PgUp, PgDn | About a screen earlier or later |
  | + − | Zoom around the focused event |
  | Enter | Open the event (Esc closes and returns to it), zoom into "+N", or fold a row |
  | / | Search |
  | ? | Open the legend's list of keys |

- Text contrast of at least 4.5:1 in every theme preset, a 2 px focus outline, hatching as a second cue for
  uncertain dates, reflow down to 320 px wide and at 200% zoom, controls of at least 24 × 24 px, a button for every
  gesture, form errors tied to their fields, and less motion when the system asks for it.
- Not done yet: Windows high contrast (`forced-colors`), a 3:1 check of marks and focus outlines, and testing with
  screen readers.

## Development

```sh
npm test         # unit and component tests (vitest)
npm run lint     # oxlint
npm run build    # type-check and build
```

The code map, the scripts that build the included timeline, and the screenshot and contrast tools are described in
[docs/development.md](docs/development.md).

## Documentation

| File | What |
|---|---|
| [docs/data-format.md](docs/data-format.md) | The timeline file format, the rules it must pass, and how to share a timeline |
| [docs/examples/example-timeline.json](docs/examples/example-timeline.json) | A complete example to copy |
| [docs/development.md](docs/development.md) | Code map, commands and data tooling |
| [docs/ancient-classical-sources.md](docs/ancient-classical-sources.md) | How the included timeline was made from two, and the changes since |
| [docs/ancient-sources.md](docs/ancient-sources.md), [docs/classical-sources.md](docs/classical-sources.md) | Where its dates come from, and the judgment calls, as researched for the two original timelines |
| [docs/ancient-classical-map.md](docs/ancient-classical-map.md) | Which rows the event maps can draw, and from what |
| [docs/ancient-classical-key-events.md](docs/ancient-classical-key-events.md) | Which events are marked key or minor |
| [archive/README.md](archive/README.md) | The two original timelines and the scripts that built them |
| [docs/BACKLOG.md](docs/BACKLOG.md) | Planned work |
| [docs/feature-audit.md](docs/feature-audit.md) | Features under consideration, including the accessibility plan |
| [docs/wcag-coverage.md](docs/wcag-coverage.md), [docs/wcag-report.md](docs/wcag-report.md) | Which WCAG 2.2 AA criteria the automated checks cover, and the latest results (`npm run a11y:report`) |

## Data sources and AI use

The code, tests and documentation were written with the help of an AI coding assistant
([Claude Code](https://claude.com/claude-code), Anthropic), directed and reviewed by the author.

The included timeline was compiled with AI assistance. The assistant read the cited English Wikipedia
articles (17–18 November 2026) and transcribed their dates; the descriptions are its own summaries. No date was
invented: every year and margin comes from a cited page, and where pages disagree, every value is kept. Books and
papers appear only where Wikipedia cites them, tagged **Cited via Wikipedia (not checked)**. It has not
been reviewed by a specialist yet.

The event maps draw borders from [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria)
(Seshat Global History Databank, CC BY 4.0; simplified and cut to each row's lifespan) on land from
[Natural Earth](https://www.naturalearthdata.com/) (public domain). Rows without borders in a year get the
location from their Wikipedia article (or its infobox map, or Wikidata) and that article's map image, shown from
Wikimedia Commons with its author and licence.

## License

Code: [MIT](LICENSE). Timeline data and maps: [CC BY 4.0](LICENSE-DATA.md), except third-party material that keeps
its own licence (listed in `LICENSE-DATA.md` and in each file's credits). Wikipedia text is CC BY-SA; the timelines
quote only dates and short phrases, and link each article. By [rishenko](https://github.com/rishenko).
