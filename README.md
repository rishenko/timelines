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
a link or a file, and readers' changes stay in their own browser. `npm run deploy` publishes `dist/` to GitHub Pages.

The built site doesn't need to be built again to change its timelines: replace, add or remove files in
`timelines/` on the server and update `timelines/index.json`, the site's list (see below).

## Use your own timeline data

A timeline is one JSON file. Copy [docs/examples/example-timeline.json](docs/examples/example-timeline.json), a
small fictional kingdom, and see [docs/data-format.md](docs/data-format.md) for every field.

There are four ways to get a timeline into the app:

1. **Put it on your site.** Add the file to `public/timelines/` and run `npm run data -- index`, which lists every
   file there in `public/timelines/index.json` (the next build copies both into `dist/timelines/`). On a site
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

- **Rows** that nest to any depth and fold away, with lifespans and named phases (dynasties, governments).
- **Any calendar:** BCE/CE or your own era names, with or without a year 0.
- **Uncertain dates** drawn as ranges, worked out from what each source says. Alternative dating systems (such as
  Mesopotamia's High, Middle and Low chronologies) that readers can switch between.
- **Connections** between events (causes, part of, succeeds, conquers, related), drawn as arrows.
- **Key events** stay visible when you zoom out or fold a crowded row; minor events fold into "+N".
- **Row links:** a row's name can link to a page about it; in the included timelines, its Wikipedia article. Rows can
  also carry a Wikidata id, shown in the table view and the CSV download.
- **Zoom** by years per tick. Long empty stretches are compressed.
- **Search** across rows, phases and events; **filters** by source and source tag; a **legend** and a short
  **guided tour**.
- **Table view** of the same events, with CSV download.
- **Themes:** four presets and custom colours.
- **Phones and tablets:** touch panning, pinch zoom and a compact toolbar.
- **Links** that reopen a timeline at the same zoom, position and event.
- **Accessibility:** keyboard control of the chart, screen-reader labels, and the table view as an alternative to
  the chart. Target: WCAG 2.2 AA (in progress; see [docs/feature-audit.md](docs/feature-audit.md), item 23).

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
| [docs/ancient-classical-key-events.md](docs/ancient-classical-key-events.md) | Which events are marked key or minor |
| [archive/README.md](archive/README.md) | The two original timelines and the scripts that built them |
| [docs/BACKLOG.md](docs/BACKLOG.md) | Planned work |
| [docs/feature-audit.md](docs/feature-audit.md) | Features under consideration, including the accessibility plan |

## Data sources and AI use

The code, tests and documentation were written with the help of an AI coding assistant
([Claude Code](https://claude.com/claude-code), Anthropic), directed and reviewed by the author.

The included timeline was compiled with AI assistance. The assistant read the cited English Wikipedia
articles (17–18 November 2026) and transcribed their dates; the descriptions are its own summaries. No date was
invented: every year and margin comes from a cited page, and where pages disagree, every value is kept. Books and
papers appear only where Wikipedia cites them, tagged **Cited via Wikipedia (not checked)**. It has not
been reviewed by a specialist yet.

## License

GPL v3. Wikipedia text is CC BY-SA; the included timeline quotes only dates and short phrases, and link each
article. By [rishenko](https://github.com/rishenko).
