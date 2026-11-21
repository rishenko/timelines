# Timelines: lifespans, phases, unions and splits (POC comparison)

Five proofs of concept, built 2026-11-21 by background agents in waves and reviewed by the coordinating session, on one shared test set. The repo copy is `docs/poc/comparison.md` (branch `poc-base`); briefs, rules and scoring sheet are in `docs/poc/README.md`; each POC's own report is `docs/poc/poc-N-report.md` on its branch.

## The questions

1. **Lifespans vs phases:** how they differ, when to use each, and what happens when several overlap.
2. **Unions and splits:** a state that contains others (USSR, United Arab Republic, Federated Commonwealth) and one that breaks into several (USSR 1991, Lyran secession 3057).

## Test set (branch `poc-base`)

- **Ancient:** Babylonia (carried on through a gap), Mycenaean Greece (lifespan drifted from its phases).
- **Modern:** France, Germany, Poland; Soviet Union, Russia, Ukraine, Estonia; Egypt, Syria, United Arab Republic. Dates from Wikipedia infoboxes through `wp_states.py` (each claim cites its field; AI-flagged pages refused).
- **BattleTech:** Federated Suns, Lyran Commonwealth, Federated Commonwealth (Sarna).
- Tools: `npm run poc:shots -- <port> <dir>` (same 9 views, plus folded), `npm run poc:metrics` (entry effort).

## The POCs

| POC | Branch (commit) | What it tried | Verdict |
|---|---|---|---|
| 1 | `poc-1` (`53b9153`) | Rules only, no app change | Rules fix union duplication (copies 4 → 0); can't show "didn't exist", "still going", drift, short phases |
| 2 | `poc-2` (`7740c73`) | Lifespan worked out from phases; gaps = didn't exist; lifespans with stretches; `ongoing` | Fixes existence, drift and "still going" (in text); dates typed 528 → 462, typed twice 29 → 3 |
| 2b | `poc-2b` (`d514d1f`) | Wave 2 start: POC 2 + POC 1's union rule + `ongoingSources` (cite "still going") + typed lifespans for members that carried on | Union once; citations kept |
| 5 | `poc-5` (`de075c2`) | Layered strips: lifespan alone colours the row; phases in thin strips at the top with visible starts and ends; rivals on a 2nd line; still-going arrows; short-phase names beside | Clearest drawing; no extra row height (slightly less on the ancient timeline) |
| 3 | `poc-3` (`c2ff519`) | `startEvent`/`endEvent`; event panel "Began and ended"; forks; edge tabs; `unfoldAfterEnd` | Links and panel excellent; forks cluttered labels and shrank to pixels; unfold hid members' pre-union history (fixed row tree) |
| 35 | `poc-35` (`d14da57`) | Wave 3 start: POC 5 + POC 3's links and panel (+ tooltips, rows table); no forks, tabs or unfold; name-placement fix | Best combined design so far |
| 4 | `poc-4` (`b13e7cb`) | `poc-35` + dated memberships (`memberOf`) as one more strip on the member's row (union's colour, dashed, "in United Arab Republic, 1958–71"); union rows list members; Ottoman Empire row, Egypt's "Ottoman Egypt" phase became a membership | Answers the union question on the chart itself (A5, A7 now yes); +807/−64 in `src/`, 374 tests; member rows 8–16 px taller |

## Scoring (A = can a reader tell?)

| Question | Baseline | 1 | 2 | 5 | 3 | 35 | 4 |
|---|---|---|---|---|---|---|---|
| A1 Poland didn't exist | no | partly | yes | yes | yes | yes | yes |
| A2 Babylonia carried on | yes | partly | yes | yes | yes | yes | yes |
| A3 Mycenae agrees | no | partly | yes | yes | yes | yes | yes |
| A4 Rival governments | partly | yes/partly | partly | partly | partly | partly | partly |
| A5 UAR joined Egypt and Syria | no | partly | no | partly | partly | partly | **yes** |
| A6 USSR split | partly | yes | partly | yes | yes | yes | yes |
| A7 Federated Commonwealth | partly | partly | partly | partly | partly | partly | **yes** |
| A8 Still going | no | partly | partly (text) | yes (arrows) | partly | yes | yes |
| A9 Very short phases | partly | partly | partly | yes | partly | yes | yes |
| A10 Folded groups | partly | no | partly | partly | partly | partly | partly |

Entry effort (date values typed / typed twice / union copies, all three files): baseline 528 / 29 / 4; POC 1 512 / 27 / 0; POC 2 462 / 3 / 4; poc-2b, 3, 5, 35: 458 / 6 / 0; POC 4: 490 / 5 / 0 (the extra 32 are the membership dates, which carry information the others couldn't hold).

## What was dropped, and why

- **Forks** (POC 3): curved branches crossed event labels at 1-year zoom and shrank to a few pixels at coarse zooms. The existing event thread plus the "Began and ended" list says the same thing.
- **Edge tabs** (POC 3): 24 px click targets added 16 px to every linked row and looked busy; tooltips and the rows table reach the same events.
- **`unfoldAfterEnd`** (POC 3): the row tree is fixed, so putting Russia, Ukraine and Estonia under the USSR also hid their pre-union history. Memberships (POC 4) address this instead.
- **Merging lifespans and phases into one list** (option C): no finding needed it.

## Kevin's calls (2026-11-21)

- Mycenae: no typed lifespan; it follows its phases.
- Egypt 1958–71 and Syria's gaps: they existed, so they type a lifespan (same rule as Babylonia). The prep agent applied the same rule to the Federated Suns and Lyran Commonwealth (accepted unless Kevin says otherwise).
- Ottoman suzerainty over the Khedivate: a membership, not a rival phase (built in POC 4).
- Fictional test: BattleTech, Sarna as source of truth.

## Open items

- **Kevin's pick.**
- POC 4 follow-ups (small): Syria's Ottoman provinces (Damascus Eyalet, Syria Vilayet) are phases but are the same kind of province as Egypt's, so they should become memberships too; wording "in Soviet Union" vs "in the Soviet Union"; Estonia's German occupation 1941–44 as a gap in its membership; one BattleTech phase name at 4.45:1 in dark ("FIRST PRINCES", needs 4.5; may be older); the track editor shows memberships read-only (no editing yet).
- Reported by POC 4, unverified on main: the track editor drops a row's facet `memberships` (regions) when saving.
- **Focus rings** on event marks (≈2.3–2.8:1) and "+N" pills (≈2.3–2.4:1) fail 3:1 in light and parchment; almost certainly already on `main`. Separate card.
- POC 5: Vichy (and other phases with no room either side) is named only in its tooltip at 5 years per tick.
- POC 2: the containment rule checks best estimates only; the track editor edits only a lifespan's first stretch.

## Recommendation

**Build `poc-4`'s design for real.** It is everything that held up, in one model:
- POC 2: the lifespan is worked out from the phases (gaps = didn't exist), typed only when the row carried on through a gap; lifespans with stretches; `ongoing` with `ongoingSources`.
- POC 5: layered strips (lifespan alone colours the row; phases in thin strips with visible starts and ends; rivals on a 2nd line; still-going arrows; short names beside, never over years outside the lifespan).
- POC 3: `startEvent`/`endEvent`, the event panel's "Began and ended", tooltips and rows-table links (no forks, tabs or unfold).
- POC 4: dated memberships as one more strip; unions are rows that list their members.
- POC 1: the rules in `data-format.md` ("Lifespan, phases or a row?").

Cost: roughly 2,300 added lines across `src/` over five POCs (to be re-done cleanly, not merged), member rows 8–16 px taller, and the track editor edits memberships only read-only. If that's too much at once, build it in order (model → strips → began/ended → memberships), each step shippable on its own.
