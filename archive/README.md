# Archive: the two timelines merged into one

Until 2026-11-20 the site bundled two timelines, *Ancient Civilizations* (`ancient-near-east`, c. 9000–330 BCE)
and *The Classical World* (`classical`, c. 500 BCE – 650 CE), plus a third, *Ancient and Classical World*
(`ancient-classical`), generated from them. Only the combined one is kept now. Its source file,
`data-src/ancient-classical.json`, was written from the generated file by
`scripts/archive/2026-11-20-combined-to-source.ts`, and all edits go there.

Nothing here is built, tested or type-checked. The files are kept as the record of how the data was made:

- `data-src/`: the two source files, their importance and row-link plans, and `combined.json`, the rules
  that merged them (which row won, renames, parents, names). Read its `about` for the general rules.
- `scripts/additions/` (Ancient) and `scripts/classical/` (Classical): the content scripts, in the order
  `scripts/lib/timelines.ts` used to list them. Classical's `skeleton.ts` copied the 500–330 BCE overlap
  events from Ancient. They import `../lib/...` from the old `scripts/` layout and no longer run from here.
- `scripts/lib/combine.ts`: the merge.
- `public/`: the last compiled files of both timelines.
- `docs/`: their key-event and row-link review lists.

The source notes `docs/ancient-sources.md` and `docs/classical-sources.md` stay in `docs/`. They still describe
where the combined timeline's data came from.
