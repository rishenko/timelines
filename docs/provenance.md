# Provenance: rulings and evidence

Every fact in a timeline should be able to show why it's there. This page describes the files that hold the reasons. None
of them ships to the app; the app shows the short `sourceLocation` each event already carries.

## Rulings (`pipelines/common/rulings.json`)

A ruling is the crew's reviewed answer to a question the sources leave open. Generators read the answer from the file, so a
change to it is a data review, and the reasoning sits next to the answer. The file is a list; each ruling has:

| Field | Meaning |
|---|---|
| `id` | Stable id, such as `date-songhai-start`. Overrides and evidence records point to it. |
| `kind` | `date` (a headline date), `who` (who held the office), `where` (which row), `category`, or `office-scope` (which offices' holders count as a row's rulers). |
| `subject` | What it rules on: `row:<id>`, `row:<timeline>/<id>`, `event:<uuid>`, or a reign's uuid. |
| `rule` | `office-scope` only: `head-offices` (the named office's holders are added across the whole row) or `phase-office` (the list page may name a phase's rulers by office). |
| `question` | The open question, in one sentence. |
| `headline` | The answer as a reader would see it. |
| `definition` | The rule behind the answer, so it carries to similar cases. |
| `kept` | The claims kept. For a date ruling, `{side?, year, margin?, page, location?, find?, note?}` (a Wikipedia page) or `{year, margin?, sourceKey, location, note}`: `location` is the citation as written, `find` a sentence of the page that `periods.py` looks up in the dump. For an office-scope ruling, the office articles. |
| `rejected` | `[{value, reason}]`: values considered and set aside. |
| `sources` | Optional: non-Wikipedia sources the claims cite, by key, registered once. |
| `sources_read` | What was read to decide it. |
| `decided_by` | `owner` or `crew`: a role, never a person's name (timeline data names no one). |
| `date` | `YYYY-MM-DD`. |

**Pointers.** A file that applies a ruling names it with `{"ruling": "<id>"}`: a v2 override (`pipelines/v2/overrides/*.json`,
which stays the mechanism that sets the date) or a side of a `periods.json` entry, which `periods.py` replaces with the
ruling's kept claims.

`python3 -I pipelines/common/rulings.py` checks the file (required fields, known kinds and rules, unique ids, subject
shape, a role in `decided_by`) and that every pointer names a ruling; it runs in CI.

## `npm run why`

Read-only over the committed files (compiled timelines, `data-src/provenance/<timeline>-reigns.json`, the rulings):

```sh
npm run why -- reign-tokugawa-hidetada-japan     # one event
npm run why -- japan 1620                        # the events on a row in a year, reigns first (row or timeline/row)
npm run why -- songhai-empire Askia              # the events on a row whose title or person has those words
npm run why -- --open --region europe --flag differs --limit 20   # reigns with open flags, counted by kind
```

For an event it prints the dates, rows, categories, each source with its cited text, and for a reign its provenance (person,
Wikidata item, the route that found it, the cited page, open flags) and the rulings behind it: the reign's own, and its row's
`office-scope` rulings. A row's date ruling is about the row, so it isn't shown on the row's events. Code:
`scripts/lib/why.ts` (tested in `why.test.ts`).

## Evidence records

Coming in the next step (wave 2 B3): per-reign `who` / `where` / `when` records and flags, added to
`data-src/provenance/<timeline>-reigns.json`.
