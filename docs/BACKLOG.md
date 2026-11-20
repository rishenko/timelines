# Backlog

## Next

### Data review

- **Review the data** against the books: start with `docs/ancient-sources.md`.
- **Review the key events** in `docs/ancient-classical-key-events.md` (270 key, 94 minor), all proposed by Claude.
  Change `data-src/ancient-classical-importance.json` and run `npm run importance`.
- **Classical World description audit: check the judgment calls** in `docs/classical-sources.md` ("Description audit
  (18 November 2026)"): pages that disagree with themselves, and optional softenings. (*Polynesians* is settled:
  translation notices are fine and are mentioned in the event's description.)
- **High/Low shifts at the 1400 BCE cut-off:** the Mesopotamian High and Low chronologies shift only dates before
  1400 BCE, so an event that starts just before it and ends just after can shrink: Assyria's subjugation under Mitanni
  (c. 1430–1360 BCE) becomes 1366–1360 BCE under Low. Decide whether a span's end should follow its start there.
- **Re-check banners on cited pages now and then.** Wikipedia adds AI/LLM-text banners after the fact: *Norte Chico
  civilization* had one by the 2026-11-18 audit, and everything taken from it was removed. Any audit or re-read should
  report banners, and a flagged page's values come out.

### More content

- **Every region: deeper research.** See the summary-only lists in `docs/ancient-sources.md` (third to fourteenth
  passes) and `docs/classical-sources.md` (follow-up section).
- **Ancient, still thin before 3500 BCE:** the Natufians (they end c. 9500 BCE, before the range), Shangshan, the
  Khartoum Mesolithic and Ñanchóc (pages missing), the South Indian Neolithic (only Sanganakallu has a page with
  dates), Neolithic island Southeast Asia, and Australia beyond Budj Bim.
- **Ancient, thin or missing regions:** the US Southwest (its pages were 404), the Kintampo complex, southern African
  hunter-gatherers, Yap, New Guinea. For a new region: one `scripts/ancient-classical/<region>.ts`, key events tagged as they
  go in, placed next to its partners (the proximity test), and considered for opening collapsed.
- **Ancient, other gaps:** the Upanishads (dates read only in summary), more Mitanni rulers, and the many Levant,
  Assyria and Iran values that exist only in page summaries.
- **Search aliases:** an `aliases` property on tracks and events (Hatti, Kemet, Axum, Wa/Yamato) so other names find
  them. Add it to `types.ts`, `validate.ts`, `search.ts` and `data-format.md`, then fill it in during region reviews.

### App

- **Feature audit (18 November 2026):** `docs/feature-audit.md` lists what the app lacks for scholarly use (trust and
  transparency, citation and versions, the dating model, analysis, access) and the author's later additions (splitting
  the data into its own repo, simple and advanced editing, days and months, business timelines, server-side storage).
  Move items here as they're scheduled. Contributions to the bundled timelines come as pull requests (item 25).
- **`apply-text-fixes.ts` should edit the script that defines an event last** (the one whose version wins on replay),
  not the first match. In the Classical audit, `edessa-260` is defined in `mediterranean-near-east.ts` and again in
  `summary-only.ts`, so the fix landed in the wrong one and was copied over by hand.
- **Read-only public mode** with editing hidden; undecided whether the public can edit at all.
- **Phones:** not yet tried on a real phone.
- **Library size:** everything lives in localStorage (about 5 MB per site). Fine for dozens of timelines of this
  size; move to IndexedDB if people keep large ones.
- **Shared drafts:** edits to a linked timeline stay local. To publish them, download the JSON and replace the file
  at the link.

## Later

### Shared, collaborative timelines

Let several people contribute to one timeline instead of trading JSON files. Questions to settle first: hosting and
accounts, storage (hosted database vs. git-backed data with pull requests), conflicts and review, keeping community
additions separate from the published data, moderation and consent.

### Beyond 650 CE

Extending the end date affects every region; existing regions would need content up to the new end. Candidates from
the original plan that fall after 650: Srivijaya, the Sailendra and Borobudur, Majapahit, Angkor, Ghana, Mali, Great
Zimbabwe, the Mississippians, the Mongols, and the settlement of Hawaiʻi, Aotearoa/New Zealand and Rapa Nui. A
separate later timeline, linked by `meta.continues`, would keep each one readable.

## Done

- The app: per-timeline settings (calendar, zoom levels, theme, credits), rows that nest to any depth, lifespans and
  phases, date claims with computed uncertainty ranges, switchable chronologies, connections between events, key and
  minor events, search, filters, legend, guided tour, table view with CSV, themes, edit mode with drafts stored as the
  reader's changes, a timeline library (uploads and `?data=` links), and phone and tablet support.
- Since then: shared lists (`?collection=`) and update checks for timelines and lists from links; row links to
  Wikipedia with Wikidata ids; "Hide rows with nothing in view" (or thin lines); connections on by default, with a
  Filters switch; the "Lifespans" tour step; event maps (Cliopatria borders, else Wikipedia pins and map images).
- Accessibility parts a–f (foundations, table view, keyboard control, visual, touch targets, edit forms), except
  `forced-colors` and the 3:1 check of marks in part d; see [feature-audit.md](feature-audit.md), item 23.
- Ancient Civilizations (c. 9000–330 BCE) and The Classical World (c. 500 BCE – 650 CE), each with a description
  audit, merged on 2026-11-20 into one timeline, Ancient and Classical World (the originals are in `archive/`), whose
  scripts reproduce its source file exactly (`npm run data:check`).
- Hosting on GitHub Pages (`npm run deploy`).
- "Dated by …" only where the reader's choice in the Dating menu can move the event (`datingChronology`); every
  dating option moves at least one event, lifespan or phase, so all are kept.
