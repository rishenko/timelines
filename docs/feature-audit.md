# Feature audit: what scholars would look for (18 November 2026)

What the app lacks for scholarly use, compared with research tools and data standards in the digital humanities.
Written as a task list: each item says what's missing, why a scholar would care, and a rough size (S: a day or less,
M: a few days, L: a week or more). Pick items into BACKLOG.md as they're scheduled.

## What it already does well

- **Every date has its evidence.** Date claims record what each source says, under which chronology, with what margin.
  Error ranges are computed from those claims, never typed in.
- **It handles chronologies that disagree.** Readers can switch between alternative chronologies per region
  (Mesopotamian High, Middle and Low; Shaw, Hornung and radiocarbon for Egypt; the XSZCP for China), and some are
  derived by a fixed shift.
- **Every event cites its source**, with a page or section and the date the page was read.
- **Deep links** restore the timeline, zoom, position and selected event.
- Phases, nested rows and gap compression handle long, uneven periods.

Few public timeline tools go this far. The main gaps are in trust, citation and reuse, the dating model, and access.

## 1. Trust and transparency (do first)

The data is compiled with AI assistance from Wikipedia, and scholars will judge it on that before anything else.

1. **About this data page (S).** A reader-facing page with the method: Wikipedia-only sourcing, books cited
   "via Wikipedia (not checked)", margins derived from claims, the LLM-banner rule, AI-assisted compilation, known
   gaps and the chronology table. Today this is only in `docs/`, which readers never see, and in a two-line footer.
2. **Review status per event and row (M).** A field such as `review: unchecked | checked-against-source |
   specialist-reviewed`, with who reviewed it and when, shown in the detail panel and usable as a filter. Without it,
   a specialist can't tell which parts are unchecked and has no reason to help review.
3. **Report a problem (S).** A link on each event that opens a GitHub issue pre-filled with the event's id, title,
   dates and sources. This gives readers an errata channel without accounts.
4. **Primary and secondary sources (M).** A source `kind` (ancient text, inscription, excavation report,
   modern scholarship, encyclopedia), shown with the citation. A historian weighs "the Assyrian Eponym List" very
   differently from "Wikipedia".
5. **Replace Wikipedia citations with the literature (L, content).** The real credibility step is checking the books
   Wikipedia cites and citing them directly. This is the existing "review the data against the books" task. The app
   needs nothing new for it, but items 2 and 4 make the progress visible.

## 2. Citation, versions and reuse

6. **Cite this (S).** A button on the timeline and on each event that gives a formatted citation (Chicago, plus
   BibTeX or CSL-JSON) with the data version, the date accessed and the deep link.
7. **Versioned releases with a DOI (S–M).** Tag data releases and archive them on Zenodo through its GitHub
   integration, so each version gets a DOI and a fixed snapshot. Show the data version in the app. Today the data
   changes silently between deploys, so a citation can't say which version it used.
8. **Data changelog (S).** A per-release list of what changed (events added, dates moved, wording fixed), shown in the
   app or linked from it. Partly exists already: the draft code detects when the published data changed.
9. **Exports (M).** CSV/TSV of events (title, dates, claims, rows, sources) for spreadsheets and statistics, and the
   full JSON outside edit mode. Later, JSON-LD for linked data (item 13).
   CSV of events done 18 November 2026, from the table view (the events it lists).
10. **Bibliography view (M).** A panel listing every source with the events and claims that cite it, filterable and
    exportable (CSL-JSON for Zotero). It's the natural way to check a source's influence on the data.
11. **Figure export (M).** Save the current view as SVG or PNG (and print to PDF) with a caption that cites the data
    version, for papers, slides and teaching.

## 3. Dating model

12. **Bounds and relative dates (L, the biggest gap for ancient history).** Many ancient dates are known only as
    *terminus post quem* / *ante quem* ("after the fall of Ur III", "before 1200 BCE"), as reign lengths counted from
    another date, or as **synchronisms** between regions (Esarhaddon and Taharqa; the Amarna letters). Research tools
    model these: nodegoat stores dates relative to other dated items, and ChronoLog builds networks of periods,
    sequences and synchronisms and checks that they agree. Steps, smallest first:
    - one-sided claims (`after`/`before` a year, shown as an open-ended fade);
    - claims relative to another event ("N years after X", "between X and Y"), resolved when the data is compiled;
    - a `synchronism` link type that draws across regions and shows how switching one region's chronology pulls the
      linked one.
13. **External identifiers (M).** Optional ids on rows, events, places and phases: Wikidata QIDs, Pleiades place URIs,
    PeriodO period URIs. They make the data linkable and deduplicable with other projects, and enable JSON-LD export.
    PeriodO is the closest match to this app's phases: it records *who* defined a period and how, rather than one
    agreed definition.
    Rows done 19 November 2026: `ids.wikidata` and a link to the row's Wikipedia article (`url`); events, places and
    phases not yet.
14. **Period definitions as assertions (M).** Let a phase or lifespan carry several sourced definitions ("Middle
    Kingdom" per Shaw, per Hornung) like date claims do now, rather than one span per chronology. Lines up with
    PeriodO.
15. **How a date is known (S–M).** A claim `basis`: textual, astronomical, radiocarbon, dendrochronology,
    stratigraphic, traditional. Show it in the claim list and allow filtering ("only radiocarbon-based").
16. **Radiocarbon done properly (M–L).** Calibrated ranges at 68% and 95%, "cal BCE"/"cal BP" notation, and optionally
    a probability curve instead of a flat fade. Today a radiocarbon date is a year ± margin drawn as a uniform window.
17. **EDTF import and export (S–M).** The Library of Congress Extended Date/Time Format (now ISO 8601-2) is the
    standard way catalogues and archives write uncertain and approximate dates (`1984?`, `1984~`, intervals). Reading
    and writing it would let the app exchange dates with library and museum data.
18. **Other era displays (M).** Show years as BP for prehistory, astronomical years, or a local era (regnal years,
    Olympiads, AUC, the Seleucid era) in the ruler and the detail panel. Scholars of each field read their own system.

## 4. Analysis and comparison

19. **Synchronoptic comparison (M).** Pick any rows from any region and place them side by side, saved in the link (a
    "my view"). Today the row order is fixed west to east; a scholar comparing Egypt with China has to scroll.
    Done 21 November 2026: comparison sets (a + on each row label, an "Add a row" box, or "Compare these rows" under
    a region filter), as picked, related rows together or by start date, in the link (`&set=…&order=…`). Not yet:
    naming and saving sets, planned as part of saved filter collections.
20. **Table view (M).** A sortable, filterable list of events and rows with dates, ranges, claims and sources. Scholars
    scan and check data this way, it doubles as the accessible alternative (item 23), and it's the basis of CSV export.
    Done 18 November 2026 (see item 23b).
21. **Filter by evidence (S).** By uncertainty width ("dates known to ±10 years"), claim basis, source kind or review
    status, on top of the existing source-tag filters.
22. **Map view (L).** Places as structured data (coordinates or Pleiades ids), with a map that follows the timeline's
    period. Many digital humanities tools pair the two; it's the largest item here.
    First step done 20 November 2026: opening an event shows its rows on a map of its year (borders from Cliopatria,
    else a pin and the Wikipedia article's map; see `docs/ancient-classical-map.md`). Not yet: a map that follows
    the view, places on events, Pleiades ids.

## 5. Access

23. **Accessibility (L overall; plan below).** Target: WCAG 2.2 AA, stated in an accessibility statement on the About
    page (item 1) with its known limits.

    **Before this work (18 November 2026):** the panels and forms are labelled and work from the keyboard. Events and "+N" clusters are buttons, so
    Tab reaches them, but:
    - every event is a separate tab stop, in row-by-row rather than time order;
    - only events within about a screen of the view are in the page, so the rest can't be reached without scrolling;
    - an event's accessible name is its title alone (its dates are in a `title` tooltip, which screen readers
      often skip);
    - opening an event doesn't move focus to the detail panel, and closing it doesn't return focus;
    - the focus outline is a thin dashed line;
    - uncertainty is shown only by a lighter tint;
    - no setting for reduced motion or Windows high-contrast is handled.

    **Principle: two ways in.** A two-dimensional chart of hundreds of positioned events can't be fully read in a line,
    so the visual timeline is made operable from the keyboard, and a **table view** is the full equivalent for screen
    readers (WCAG accepts a conforming alternative version), which scholars want anyway (item 20).

    a. **Foundations (S–M).** Done 18 November 2026. A search pick opens the
       event's details with focus there; Escape then lands on the event in the chart.
       - Landmarks and headings: the toolbar, a labelled timeline region ("Timeline: Ancient Civilizations, c. 9000–330
         BCE"), the detail panel with its own heading, and a "Skip to timeline / table" link.
       - Accessible names that carry the facts: "Battle of Kadesh, c. 1274 BCE, Egypt and the Hittites, key event,
         uncertain date"; clusters as "12 more events, 1600–1500 BCE; zoom in"; collapse buttons with
         `aria-expanded`.
       - Focus: opening an event moves focus to the detail panel's heading; Escape closes it and returns focus to the
         event. Picking a search result focuses the event.
       - A polite live region announces zoom changes, "Went to 1595 BCE", and filter counts.
       - Automated checks: axe-core in the component tests and oxlint's jsx-a11y rules.
    b. **Table view (M):** a "Timeline | Table" switch (`?view=table`). Done 18 November 2026,
       with CSV export (item 9, events only), and a rows table (lifespans and phases) in each section.
       - Events grouped under region and civilization headings, sortable by date, filterable with the same Filters,
         and following the reader's chronology choices.
       - Each row gives the dates and ranges in words ("Start: between 1650 and 1530 BCE; 1595 BCE under the Middle
         chronology"), the rows, importance and sources.
       - It's also the basis of CSV export (item 9).
    c. **Keyboard model for the timeline (M):** one tab stop for the whole timeline (a roving focus), not hundreds.
       Done 18 November 2026 (keys listed in the Legend).
       - ←/→: previous or next event in the row, by date. ↑/↓: the nearest event in the row above or below.
         Home/End: the first or last event in the row. PageUp/PageDown: scroll a screen.
       - +/−: zoom around the focused event. Enter: open it. On a row label, Enter or Space folds or unfolds the row.
         `?`: list the shortcuts.
       - The view scrolls to follow focus, and the focused event stays in the page even when it's off-screen.
    d. **Visual (S–M).**
       - Uncertainty gets a second cue besides the tint: hatching or end ticks, shown in the Legend. Done 18 November
         2026 (hatching; row lifespans and phases keep their soft edges, as background bands).
       - A contrast check of every theme preset (text 4.5:1; marks and focus outlines 3:1), run as a test. Text done
         18 November 2026 with `npm run contrast`. Fixed for every timeline and preset: event labels on their bars
         (lighter fills: 30% of the track color, 34% in dark themes), phase names (closer to the text color; no name
         in phases too narrow for about five capitals, until zoomed in), the light theme's accent, and unrelated
         events' labels while one is selected (muted instead of faded). Known exceptions, left on purpose: a few
         labels per timeline in dense rows (where several period bands stack, as behind *Linear B in use*, or in a
         thicket of threads 2–3 px apart, as around *Urkesh abandoned*), and labels the selected event's highlight
         thread passes behind. `npm run contrast -- --sweep` lists them. Marks, focus outlines and form fields at
         3:1 done 20 November 2026 with `npm run contrast:ui`: mark edges move toward the text color, field borders
         use the muted text color, and the focus outline in row labels the text color. Known exceptions: bars a few
         pixels wide on a same-colored phase edge or thread.
       - A bolder focus outline (2 px, offset). Done.
       - Readable at 200% zoom and on a 320 px wide screen. Done 18 November 2026: on narrow screens the toolbar
         and edit bar wrap onto rows instead of scrolling sideways, and the editors, Filters, Dating and search
         results fit the screen; `npm run reflow` checks 16 views per width.
       - `prefers-reduced-motion` (smooth scrolling, the tour) and `forced-colors` (Windows high contrast).
         Reduced motion done (no smooth scrolling or animation); `forced-colors` not yet.
       - Check the "related events" dimming (unrelated events at 28% opacity) for legibility. Done with the contrast
         check above: the marks still fade to 28%, the labels stay at 4.5:1.
    e. **Touch and pointer (S):** targets at least 24 px (WCAG 2.2), including the small event diamonds, and a button
       alternative wherever an action needs a gesture (long-press to add, pinch to zoom).
       Done 18 November 2026. The row fold buttons, the edit-mode row buttons (✎ ↑ ↓ +), the editor's row checklist and
       its Id/Key disclosures now have 24 px hit areas; event marks already passed by spacing. Every gesture has an
       alternative: pinch zoom has the zoom buttons and +/−, long press (and double-click) to add has "+ Event", and
       panning is ordinary scrolling. `npm run targets` checks 16 views at a phone and a laptop width.
    f. **Edit mode (S):** error messages tied to their fields (`aria-describedby`), and the claim lists announced as
       lists.
       Done 18 November 2026. In the event, track and source editors each error marks its field `aria-invalid` and is
       linked to it with `aria-describedby` (`src/components/FieldError.tsx`), saving moves focus to the first problem,
       and the Id and Key disclosures open when they hold an error. Dated claims are a list named for the start or end,
       and each Remove button names its claim.
    g. **Testing:** a keyboard-only pass; NVDA with Firefox and Chrome on Windows; Windows high contrast; 200% zoom.
       VoiceOver on a phone later.

    **Order:** a and b first (b also serves scholars and CSV export), then c, then d and e, with f alongside.
24. **Names and transliteration (S–M).** The existing "search aliases" backlog item, plus a note on the transliteration
    conventions used (Ḫattuša vs. Hattusa, pinyin), and later labels in other languages.

## 6. Collaboration (already in BACKLOG under "Later")

25. **Contributions as pull requests (M).** The author's chosen model for the bundled timelines: a reader edits in
    the app, then submits a pull request with the change and their sources and reasoning. Whole-file PRs don't fit
    this repo, because `data-src/` is rebuilt by re-runnable scripts and a hand edit to a script-defined event would
    be lost on the next replay. So:
    - **Export a contribution (S):** edit mode already stores a draft as a change set (`src/state/draft.ts`: events,
      rows and sources added or removed). Add "Download my changes" that saves that change set, plus a generated
      summary (what changed, with each item's sources) to paste into the PR description.
    - **Apply a contribution (M):** a script that applies a change set to `data-src/` and to the script that defines
      each item, like `apply-text-fixes.ts` does for wording, then runs the checks.
    - **Contributor guide and PR template (S):** what to include (sources, reasoning), the source rules (no
      AI-flagged pages, no invented dates), and how review works.
    - **CI (S):** a GitHub Action that validates the data and runs `run-all --check` on every PR.

## 7. Beyond scholarship (added 18 November 2026)

26. **Split the data from the app (M).** Keep the app repo generic and move the historical timelines (sources,
    scripts, docs, data checks) to their own data repo, loaded by URL like any other timeline. Reasons: the data's
    releases and DOIs (item 7) should version the data, not the app; data contributors (item 25) shouldn't need the
    app's code; and people reusing the app don't want ~50 data scripts. Needs: a published JSON Schema and validator
    the data repo's CI can run, a list of featured timelines in the app (so `?timeline=ancient-near-east` and saved
    drafts keep working), and the data repo's own Pages site serving the compiled JSON. Best done together with item 7.
27. **Simple and advanced editing (M).** A timeline sets its editing level (`meta.editing: "simple" | "advanced"`),
    and readers can still switch with "Show advanced fields". The simple event form has title, row, phase, start and
    end, description, and sources, with an inline "add a book (title, page)" or "add a link". It hides date claims,
    chronologies, margins, importance, order and links. Choosing a phase prefills the row and offers "sometime during
    this phase" as the date, which needs the one-sided and bounded dates of item 12. A game or fictional timeline would
    default to simple; the historical timelines to advanced.
28. **Days and months (L).** Years are the only unit today (stored years, ruler scales in years). Exact dates (the
    Ides of March, a battle's day) need a finer unit: a day-based time value, month and week ruler scales, partial
    dates ("March 44 BCE"), and a "today" marker. It's the prerequisite for any business or personal use, and it helps
    the later historical periods too.
29. **Business and personal timelines (L, after 28).** The model already fits a deal or project: rows are accounts,
    deals or people; events are meetings and emails; phases are pipeline stages (prospect → qualified → proposal →
    closed); `ongoing` marks open deals. Missing beyond day dates: import from a calendar (ICS) or a CRM export
    (CSV), templates (a "sales deal" starter), and private-by-default storage. Worth doing for the author's own use;
    as a product it would compete with established tools.
30. **Server-side storage and simple collaboration (L).** For readers' own timelines; the curated ones stay
    PR-based. A small hosted backend (Supabase, or Cloudflare Workers with D1), with:
    - sign-in by e-mail link or GitHub;
    - timelines owned by a user, private by default, shared by link as viewer or editor;
    - saving as change sets merged per item (the draft code already does this), with version history and undo;
    - no live co-editing at first: last save per item wins, and editors are told when someone else changed an item.
    Moderation is only needed if public timelines are listed anywhere. Settles the hosting questions under
    "Shared, collaborative timelines" in BACKLOG.

## Suggested order

1. About page, Report a problem, Cite this (1, 3, 6): small, and they change how a scholar first reads the site.
2. Versioned releases with a DOI, and the changelog (7, 8).
3. Review status and source kinds (2, 4), then the books review itself (5).
4. Table view, CSV export and keyboard access (20, 9, 23): one piece of work serving three needs. Done, except
   23 d (marks at 3:1, `forced-colors`) and g (manual testing).
5. One-sided bounds and claim basis (12, first step; 15).
6. External ids and period assertions (13, 14).
7. The large items when wanted: relative dating and synchronisms, radiocarbon curves, the map (12, 16, 22).

## References

- PeriodO, a gazetteer of scholarly period definitions: https://perio.do/en/ (Golden and Shaw 2016, PeerJ Computer
  Science, doi:10.7717/peerj-cs.44).
- Extended Date/Time Format (Library of Congress): https://www.loc.gov/standards/datetime/
- nodegoat, relational chronology statements: https://nodegoat.net/guide.s/44/storing-relational-chronology-statements
- ChronoLog, chronological networks from synchronisms: https://verif.ulb.be/ggeeraer/papers/chrono-net.pdf
- Pleiades linked data: https://pleiades.stoa.org/help/using-pleiades-data/linked-data-sidebar
- World Historical Gazetteer: https://whgazetteer.org/tutorials/guide/
- Boyd Davis and Kräutli, "The Idea and Image of Historical Time", Visible Language 49.3 (2015):
  https://researchonline.rca.ac.uk/1703/1/V49N3_2015_E.pdf
- Windhager, Salisu and Mayr, "Exhibiting Uncertainty", Informatics 6.3 (2019): https://mdpi.com/2227-9709/6/3/29
- Library Carpentry, FAIR data for historical research:
  https://librarycarpentry.github.io/Top-10-FAIR/2018/12/01/historical-research
