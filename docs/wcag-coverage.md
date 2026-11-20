# WCAG 2.2 AA coverage

Which of the 55 WCAG 2.2 Level A and AA success criteria the automated checks cover, and which need a person.
4.1.1 Parsing is left out: WCAG 2.2 made it obsolete. Last reviewed 20 November 2026, against `main` at `9cd5464`
and axe-core 4.14.1.

This file is the matrix: edit it by hand. `npm run a11y:report` reads it, runs the checks, and writes the results per
criterion to [wcag-report.md](wcag-report.md).

Automated checks find some failures; they can't show that a criterion is met. Read "Automated" as "a regression
would be caught", not as "conforms".

## Coverage levels

- **Automated:** the checks test what the criterion asks, in every view they open (`scripts/lib/ui-states.ts` for
  the browser scripts). Known exceptions are listed.
- **Partial:** the checks catch some failures; a person checks the rest.
- **Manual:** no automated check.
- **N/A:** the app has nothing the criterion applies to. Single-page criteria ("a set of web pages") count as N/A:
  the app is one page.

The **Run** column names the checks the report runs for a criterion besides axe: `contrast`, `reflow`, `targets`
(the scripts) and `tests` (the accessibility tests). axe rules count toward the criteria their WCAG tags name, so
they aren't listed there.

Where the checks run:

- **CI:** on every push and pull request. axe-core in `src/a11y.test.tsx` (jsdom, so no colour or layout), the
  component and unit tests, and oxlint's `jsx-a11y` rules.
- **By hand:** `npm run contrast`, `npm run reflow` and `npm run targets`, in Chrome or Edge. Not in CI.
  `npm run a11y:report` runs all of them, plus axe-core in the browser over every view (colour and target size
  included), about 10 minutes.

## Summary

| Coverage | Criteria | Of the 42 that apply |
|---|---:|---:|
| Automated | 6 (3 in CI, 3 by hand) | 14% |
| Partial | 16 | 38% |
| Manual | 20 | 48% |
| N/A | 13 | — |

So 22 of the 42 applicable criteria (52%) have at least some automated check. Status: none fail their checks; 1
has a known gap (see [Known problems](#known-problems)); the rest pass or haven't been reviewed.

## Matrix

Status: **Pass** (the checks pass, or reviewed and fine, with date), **Fails**, **Gap** (known not done),
**Not reviewed**.

### 1 Perceivable

| SC | Level | Coverage | Run | Checks | Status |
|---|---|---|---|---|---|
| 1.1.1 Non-text Content | A | Partial | tests | CI: axe `image-alt`, `svg-img-alt`, `role-img-alt`; test: every event button names its dates and rows. Map images use their Commons caption as `alt`. Whether alt text is *useful* is manual. | Pass |
| 1.2.1 Audio-only and Video-only (Prerecorded) | A | N/A | — | No audio or video. | — |
| 1.2.2 Captions (Prerecorded) | A | N/A | — | No audio or video. | — |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | A | N/A | — | No audio or video. | — |
| 1.2.4 Captions (Live) | AA | N/A | — | No audio or video. | — |
| 1.2.5 Audio Description (Prerecorded) | AA | N/A | — | No audio or video. | — |
| 1.3.1 Info and Relationships | A | Partial | tests | CI: axe `list`, `listitem`, `definition-list`, `dlitem`, `td-headers-attr`, `th-has-data-cells`, `aria-required-children/parent`; tests: claim lists are lists, fold buttons carry `aria-expanded`. The chart's 2-D layout is conveyed by the table view. | Pass |
| 1.3.2 Meaningful Sequence | A | Manual | — | Reading order of panels and the detail panel. | Not reviewed |
| 1.3.3 Sensory Characteristics | A | Manual | — | Instructions (Legend, tour, edit bar) must not rely on shape or position alone. | Not reviewed |
| 1.3.4 Orientation | AA | Manual | — | No orientation lock in the CSS (checked by search, 20 Nov 2026). axe's `css-orientation-lock` is experimental and not run. | Pass (code) |
| 1.3.5 Identify Input Purpose | AA | N/A | — | No fields collect information about the user. | — |
| 1.4.1 Use of Color | A | Partial | — | CI: axe `link-in-text-block`. Uncertain dates are hatched as well as tinted (18 Nov 2026); rows are named, not only coloured. | Pass |
| 1.4.2 Audio Control | A | N/A | — | No audio. | — |
| 1.4.3 Contrast (Minimum) | AA | Automated (by hand) | contrast | `npm run contrast`: axe `color-contrast` in a real browser plus a pixel check for text on layered backgrounds, every preset; `--sweep` every screen. Known exceptions: a few labels in dense rows and under the selection thread (feature-audit item 23d). Readers' custom colours are their own choice; the theme panel warns. Report: axe `color-contrast` in every view. | Pass, with exceptions (the highlighted search result's row path fixed 20 Nov 2026) |
| 1.4.4 Resize Text | AA | Partial | reflow | CI: axe `meta-viewport`. By hand: `npm run reflow` at 640 px (200% zoom of 1280). Text-only zoom (browser font size) not checked. | Pass |
| 1.4.5 Images of Text | AA | Manual | — | Text is drawn as text; row and credits images are logos (exempt). | Pass (code) |
| 1.4.10 Reflow | AA | Automated (by hand) | reflow | `npm run reflow`: 17 views at 320 and 640 px (200% zoom), nothing scrolls sideways. The chart and maps are 2-D content (exempt). | Pass |
| 1.4.11 Non-text Contrast | AA | Manual | — | Marks, focus outline, form borders at 3:1: not checked. | **Gap** |
| 1.4.12 Text Spacing | AA | Partial | — | CI: axe `avoid-inline-spacing` (only inline styles). Overlap with the WCAG spacing applied: not checked. | Not reviewed |
| 1.4.13 Content on Hover or Focus | AA | Manual | — | Tooltips are native `title` (exempt); hovering an event restyles related events, adds no content. | Pass (code) |

### 2 Operable

| SC | Level | Coverage | Run | Checks | Status |
|---|---|---|---|---|---|
| 2.1.1 Keyboard | A | Partial | tests | CI: axe `scrollable-region-focusable`; jsx-a11y `click-events-have-key-events` (each mouse-only handler names its key); tests: chart keys (`keyboard.test.ts`, `a11y.test.tsx`), Customize tabs, edit mode on and off. | Pass |
| 2.1.2 No Keyboard Trap | A | Partial | tests | Tests: the chart is one Tab stop and Tab leaves it; Escape leaves the detail panel. No test tabs through every view. | Pass |
| 2.1.4 Character Key Shortcuts | A | Partial | tests | The one-key shortcuts (`/`, `?`, `+`/`−`) act only while the chart has focus, which WCAG allows. Test: `/` moves to search from the chart and does nothing elsewhere. | Pass (fixed 20 Nov 2026; `/` used to work page-wide) |
| 2.2.1 Timing Adjustable | A | Manual | — | Toasts disappear after 3.5 s, including error toasts (a failed upload, edits that can't be saved). They are also announced in the live region. | Not reviewed |
| 2.2.2 Pause, Stop, Hide | A | Partial | — | CI: axe `blink`, `marquee`. No auto-moving content; smooth scrolling stops under reduced motion. | Pass |
| 2.3.1 Three Flashes or Below Threshold | A | Manual | — | Nothing flashes. | Pass (code) |
| 2.4.1 Bypass Blocks | A | Automated (CI) | tests | Test: skip link to the timeline (or table) region; landmarks. | Pass |
| 2.4.2 Page Titled | A | Automated (CI) | — | axe `document-title`; the title is the open timeline's. | Pass |
| 2.4.3 Focus Order | A | Partial | tests | Tests: opening an event focuses the detail panel, Escape returns to the event; a search pick focuses its event; Customize tabs. | Pass |
| 2.4.4 Link Purpose (In Context) | A | Partial | tests | CI: axe `link-name`; test: a row's linked name says it opens a new tab. | Pass |
| 2.4.5 Multiple Ways | AA | N/A | — | One page (search and the table view exist anyway). | — |
| 2.4.6 Headings and Labels | AA | Manual | — | Whether headings and labels describe their content. | Not reviewed |
| 2.4.7 Focus Visible | AA | Manual | — | A 2 px outline on every focusable element (`src/styles/accessibility.css`); not tested. | Not reviewed |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Manual | — | Sticky toolbar, ruler and row labels could cover a focused event; the view scrolls to follow focus. Not tested. | Not reviewed |
| 2.5.1 Pointer Gestures | A | Manual | — | Pinch zoom has buttons and `+`/`−`; long press has *+ Event* (reviewed 18 Nov 2026). | Pass |
| 2.5.2 Pointer Cancellation | A | Manual | — | Long press opens an editor that can be cancelled; other actions are on click. | Pass (code) |
| 2.5.3 Label in Name | A | Partial | — | axe `label-content-name-mismatch`, in CI (jsdom) and in the browser (the report); only the browser run sees visible text. | Pass (fixed 20 Nov 2026: the "N rows hidden" button's name now starts with its visible text) |
| 2.5.4 Motion Actuation | A | N/A | — | No device motion. | — |
| 2.5.7 Dragging Movements | AA | Manual | — | Panning is scrolling (scrollbar, wheel, keys); no drag-only action found. | Pass (code) |
| 2.5.8 Target Size (Minimum) | AA | Automated (by hand) | targets | `npm run targets`: every control 24 × 24 px or spaced apart, 17 views at a phone and a laptop width. Report: axe `target-size` in every view too. | Pass (fixed 20 Nov 2026: row-name links beside the row buttons, the table view's row and Wikidata links, Filters' checkboxes) |

### 3 Understandable

| SC | Level | Coverage | Run | Checks | Status |
|---|---|---|---|---|---|
| 3.1.1 Language of Page | A | Automated (CI) | — | axe `html-has-lang`, `html-lang-valid`. Timelines in other languages would need their own `lang` (no field for it yet). | Pass |
| 3.1.2 Language of Parts | AA | Manual | — | Foreign names are proper names (exempt). | Pass (code) |
| 3.2.1 On Focus | A | Manual | — | Focus scrolls the view to the event; no change of context. | Not reviewed |
| 3.2.2 On Input | A | Partial | tests | The title menu lists timelines as links; another opens only when one is followed. Test: the menu's links, `aria-current`, Escape. Other inputs (filters, theme, dating) change only the view. | Pass (fixed 20 Nov 2026; a `<select>` used to open a timeline on every change) |
| 3.2.3 Consistent Navigation | AA | N/A | — | One page. | — |
| 3.2.4 Consistent Identification | AA | N/A | — | One page. | — |
| 3.2.6 Consistent Help | A | N/A | — | One page. | — |
| 3.3.1 Error Identification | A | Partial | tests | Tests (`TrackForm.test.tsx`): errors tied to their fields with `aria-invalid` and `aria-describedby`, focus moves to the first. Event and source forms use the same `FieldError` but have no such test. | Pass |
| 3.3.2 Labels or Instructions | A | Partial | — | CI: axe `label`, `form-field-multiple-labels`, `select-name`. Date-format hints are in `title` tooltips. | Pass |
| 3.3.3 Error Suggestion | AA | Manual | — | Whether each message says how to fix it. | Not reviewed |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Manual | — | Every delete (event, row, source, timeline, list, local edits) asks to confirm. | Pass (code) |
| 3.3.7 Redundant Entry | A | Manual | — | The editors don't ask for the same thing twice. | Not reviewed |
| 3.3.8 Accessible Authentication (Minimum) | AA | N/A | — | No sign-in. | — |

### 4 Robust

| SC | Level | Coverage | Run | Checks | Status |
|---|---|---|---|---|---|
| 4.1.2 Name, Role, Value | A | Partial | tests | CI: axe's 29 name/role/ARIA rules (`button-name`, `aria-*`, `nested-interactive`, …); tests: event names, fold buttons' state, the view switch's `aria-pressed`. Custom widgets (roving chart, combobox) need a screen-reader pass. | Pass |
| 4.1.3 Status Messages | AA | Manual | — | One polite live region for zoom, "Went to …", filter counts and toasts; errors in `role="alert"`. No test reads the live region. | Not reviewed |

## Known problems

1. **1.4.11:** marks, focus outlines and form borders aren't checked at 3:1 (feature-audit item 23d).

Fixed on 20 November 2026:

- **2.1.4:** the `/` shortcut worked page-wide; now only in the chart.
- **3.2.2:** the timeline picker, a `<select>`, opened a timeline on every change; now a menu of links.
- Found by the first `npm run a11y:report` run, and on `main` too: **1.4.3** (the highlighted search result's row
  path was 4.2–4.5:1), **2.5.3** (the "N rows hidden" button's name didn't contain its visible text) and **2.5.8**
  (row-name links beside the row buttons since 19 November, Filters' checkboxes since 20 November, and the table
  view's row and Wikidata links, which only axe flagged; they now follow axe).

## Next to automate

A browser run over the same views as `reflow` and `targets` could move these from Manual to Partial or Automated:

| SC | Check |
|---|---|
| 1.3.4 | axe's experimental `css-orientation-lock` |
| 1.4.11 | extend the contrast pixel check to marks, focus outlines and form borders |
| 1.4.12 | apply the WCAG spacing values, then the reflow overlap check |
| 2.1.2, 2.4.7, 2.4.11 | Tab through each view: focus always moves on, shows a 2 px outline at 3:1, and isn't covered |
| 4.1.3 | a test that zoom, "Went to …" and toasts reach the live region |

With those, 27 of 42 applicable criteria (64%) would have automated checks. Running `npm run a11y:report` in CI would
put all of them on every pull request.
