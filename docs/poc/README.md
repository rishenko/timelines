# Lifespans, phases, unions and splits: proofs of concept

Branch `poc-base`. Five POCs try different answers to two questions on the same test rows:

1. **Lifespans and phases:** how they differ, when to use each, and what happens when several overlap.
2. **Unions and splits:** how to show a state that contains others (the USSR, the United Arab Republic) and one
   that breaks up into several (the USSR in 1991).

Each POC is a branch. The coordinator (the main session) reviews every POC against the scoring sheet below and
shows Kevin one comparison per wave. Kevin picks.

## The test set

Three files in `data-src/`, compiled into `public/timelines/` (`node scripts/build-dataset.ts data-src/<f>.json
public/timelines/<f>.json`). On `poc-base` they're in **today's format** (the baseline). Each POC converts all three
into its own shape and changes nothing else about them: same rows, dates, sources and events.

| File | Rows | What they test |
|---|---|---|
| `poc-ancient.json` | Babylonia, Mycenaean Greece (copied from the ancient timeline) | A gap between phases where the state carried on (Babylonia 1155–626 BCE); a lifespan that has drifted from its phases (Mycenae: 1050 vs 1070 BCE); dating systems (Middle/High/Low, Aegean High/Low) |
| `poc-modern.json` | France, Germany, Poland; Soviet Union, Russia, Ukraine, Estonia; Egypt, Syria, United Arab Republic | Gaps where the state didn't exist (Poland 1795–1807, 1915–18; Estonia before 1918); rival governments (Vichy and Free France; Poland's government-in-exile and People's Republic; East and West Germany); unions (USSR; UAR, shown three times); a split (USSR 1991); a state interrupted by a union (Second Syrian Republic 1950–58, 1961–63); still-existing states (typed as ending 2026); a phase of a few months (Hundred Days 1815) |
| (a fictional test set) | kept private | A union, a split and a civil war across the union in an invented setting |

Dates in `poc-modern.json` come from Wikipedia infoboxes through the extractor in
`~/data/timelines-analysis/2026-11-21-modern/` (`wp_states.py`), each claim citing its field; the generator is
`~/data/timelines-analysis/2026-11-21-poc/gen_testset.py`. Pages with an AI-generated-text flag are never used.

## Tools

- `npm run poc:shots -- <port> <out dir>`: the same 9 views on any branch, each also with the groups folded (18 PNGs).
  Needs a dev server on that port (`npx vite --port <port> --strictPort`).
- `npm run poc:metrics`: entry effort per file (rows, lifespans, phases, date values typed, repeated dates, phases
  that copy another row, events, event-row links).

## The POCs

| | Branch, from | Kind | Brief |
|---|---|---|---|
| 1 | `poc-1`, `poc-base` | Rules only | **Today's app, rules written down.** No app changes. Write the rules into `docs/data-format.md` (when to use a lifespan, phases or a row; overlaps; unions as their own rows; splits as one event on all the rows involved). Convert the test set to follow them strictly, e.g. no union copied as a phase onto its members. Shows how far the docs alone get. |
| 2 | `poc-2`, `poc-base` | Data model | **Lifespan worked out from phases, with gaps, plus `ongoing`.** A row with phases and no `span` gets its lifespan from the phases: shaded where phases are, blank in the gaps between them (a gap means "didn't exist"). A typed `span` may have several stretches and must contain the row's phases (validation error otherwise); a state that carried on through a gap types its span (Babylonia). `ongoing: true` on a span or phase runs it to `present`. Remove the repeated spans from the test set. |
| 3 | `poc-3`, `poc-2` | Data model and drawing | **POC 2 plus succession.** Phases and spans may name the event that began or ended them (`startEvent`, `endEvent`: an event uuid). Clicking the edge opens the event; the event's detail lists the rows it started and ended. When an event ends one row and starts others, its thread is drawn as a fork from the ended bar to the starts. Optional per row: `unfoldAfterEnd: true` opens a folded parent when the view is past its end (the USSR's republics appear as their own rows after 1991). |
| 4 | `poc-4`, `poc-3` | Data model | **POC 3 plus dated memberships.** A row may belong to another row for a stretch of years (`memberOf: [{ "row": "soviet-union", "start": 1922, "end": 1991, "sources": [...] }]`). Members show the membership on their own bar (a thin band or marker naming the union). Unions are rows, never phases on their members. |
| 5 | `poc-5`, `poc-2` | Drawing | **Layered strips.** Each layer gets its own thin strip in the row: the lifespan is the faint row background (the only layer allowed to colour it); phases get a strip with their alternating shades and names where they fit; overlapping phases get a second strip; memberships (if present) a third. Strips are display only (no click targets under 24 px; clicks go to the row or the event) and meet 3:1 contrast. Compare against today's drawing on the same data. |

Waves: 1 and 2 in parallel; then 5 and 3 (both from 2); then 4 (from 3).

## Rules for every POC

- Work in your own git worktree and branch (`git worktree add ../timelines-poc-N -b poc-N <from>`); symlink
  `node_modules` from the main clone. Your own dev-server port: 4320 + N.
- Change only what your brief needs. Anything you add to the format goes into `docs/data-format.md` and the validator
  (`src/data/validate.ts`), with tests. Keep it general: nothing that works only for one of the three timelines.
- Don't touch `public/timelines/ancient-classical.json`, `data-src/ancient-classical*.json`, other branches, `main`,
  the Obsidian vault, or any memory files. No push, no merge, no PR.
- Before reporting: `npm test` and `npx tsc -b` pass; `npm run poc:metrics`; `npm run poc:shots -- <port>
  <scratch dir>`; for drawing changes also `npm run targets` and `npm run contrast:ui` (and say if either fails).
- Commit on your branch, then write `docs/poc/poc-N-report.md` (commit it too): what you changed (files, lines from
  `git diff --stat <from>`), the metrics table, answers to the scoring questions below with the screenshot that shows
  each, known problems, and what you'd do differently. Keep it under about 80 lines.

## Scoring sheet

**A. Can a reader tell?** For each, yes / partly / no, with the screenshot that shows it:

1. When Poland didn't exist (1795–1807, 1915–18) — `modern-1760-1850`, `modern-1900-2000`
2. That Babylonia carried on through 1155–626 BCE — `ancient-overview`
3. That Mycenae's lifespan and phases agree — `ancient-mycenae-end`
4. Rival governments at the same time: Vichy and Free France; government-in-exile and People's Republic; East and
   West Germany — `modern-1900-2000`
5. That the UAR joined Egypt and Syria in 1958–61 (and Egypt kept the name to 1971), without seeing it three times —
   `modern-uar-1954-1974`
6. That Russia, Ukraine and Estonia came out of the USSR in 1991, and which event did it — `modern-1981-2001`
7. (fictional test set, kept private)
8. Which states are still going today — `modern-1981-2001`, `bt-3000-3100`
9. A phase of a few months (Hundred Days 1815) or a year (Ukrainian State 1918) — `modern-1760-1850`,
   `modern-1900-2000`
10. The same, with the groups folded — the `-folded` screenshots

**B. Entry effort:** the `poc:metrics` table against the baseline (lower date values, repeated dates and copies are
better), plus anything an author must keep in step by hand.

**C. App cost:** lines changed in `src/` and `docs/`; new format fields; whether old files still load unchanged.

**D. Accessibility:** `targets` and `contrast:ui` results; new visuals at 3:1 or better; no new click target under
24 px.

**E. Generality:** does it work the same for ancient, modern and fictional data? Anything that only one needs?

Baseline (`poc-base`, today's format):

```
file                 rows  lifespans  phases  date values  repeated dates  repeated phases  phases copying a row  events  event-row links
poc-ancient.json     4     2          7       123          3               0                0                     38      38
poc-modern.json      13    10         66      341          20              0                2                     19      33
```
