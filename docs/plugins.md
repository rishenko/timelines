# View plugins

A view plugin draws a timeline its own way, as a third view after Timeline and Table. It's a plain ES module in the
site's `plugins/` folder, and a link turns it on:

```
<your site>/?timeline=ancient-classical&plugin=plugins/centuries.js
```

The sample, [`public/plugins/centuries.js`](../public/plugins/centuries.js), draws events per century as bars. Pick a
century to list its events, and an event opens the usual details panel.

## Where plugins can come from

Only from this site's own `plugins/` folder (`public/plugins/` in the repo): a file named `<id>.js` directly in it
(lowercase letters, digits and `-`; no sub-folders), with no query string or fragment. The app refuses anything else, such as another site, a `../` step out of the folder, or a `data:` or
`javascript:` link, and the reader sees a notice saying so.

A plugin runs in the page with the same access as the app's own code. It could read the reader's library and
unsaved edits in this browser's storage. So plugins are added the way any code is: by a pull request, with review.
Plugins from other sites would need a sandboxed iframe and a message protocol. That isn't built.

## Adding one

1. Write `public/plugins/<id>.js`, a module whose default export follows the contract below. It needs no build step
   and no imports, and you can write it in plain JavaScript.
2. Open `?plugin=plugins/<id>.js` on the dev server (`npm run dev`) to try it.
3. Add a test that mounts it on every shipped timeline, like
   [`src/plugins/centuries.test.ts`](../src/plugins/centuries.test.ts).
4. Run the accessibility report on it (below).

Sample data in a plugin stays fictional, like the rest of the repo's examples.

## The contract

The types are in [`src/plugins/api.ts`](../src/plugins/api.ts).

```js
export default {
  id: 'centuries',          // unique, matches the file name
  name: 'Centuries',        // the toolbar button's label
  apiVersion: 1,            // the plugin API it was written for
  schema: [5, 11],          // the data schema versions it reads, inclusive
  mount(el, ctx) {          // draw into `el`; return what the app calls later
    return {
      update(ctx) {},       // a new snapshot: filters, dating or the selection changed
      unmount() {},         // the reader left the view: remove listeners and timers
    };
  },
};
```

The app loads the module once, when the page opens. If `id`, `name` or `mount` is missing, or `apiVersion` or
`schema` doesn't fit, it refuses the plugin and tells the reader why. An error thrown by `mount` or `update` shows a
line in the view, and the rest of the app keeps working.

### The snapshot (`ctx`)

A frozen object. Treat it as read-only. A new one comes to `update` whenever what the reader sees changes.

| Field | What it is |
|---|---|
| `apiVersion` | The plugin API the app speaks. |
| `data` | The compiled timeline after the reader's filters: `meta`, `tracks`, `events`, `sources` (see [data-format.md](data-format.md)). Always the current schema: older files are migrated before a plugin sees them. |
| `events` | The visible events with their dates resolved: `start` and `end` are years on the timeline's axis under the dating the reader picked. Use these, not `data.events`, for where things go. |
| `spans` | Each row's lifespan stretches, by row id. |
| `selectedId` | The event open in the details panel, or `null`. |
| `formatYear(year)` | A year as the timeline writes it, in its calendar ("500 BCE"). |
| `select(uuid)` | Opens an event's details in the side panel (`null` closes it). |
| `showOnTimeline(year)` | Switches to the chart, centred on a year. |

Read the snapshot, never the timeline file, and never change it: the freeze is shallow, so `data` is the app's own object. The snapshot already has the filters, dating and migrations applied,
so a plugin doesn't need to repeat them, and later schema changes reach plugins through one place.

### Looks

A plugin draws plain DOM in `el`, which fills the main area and scrolls. Use the page's CSS variables (`--text`,
`--muted`, `--accent`, `--focus`, `--line-2`, `--bg`) so it follows the reader's theme, and scope your styles under a
class of your own. The sample adds a `<style>` element inside `el`.

## Layers

A **layer** draws inside the chart, beside the marks, instead of as a view of its own (the plugin architecture design,
§3). For now only bundled layers load: the year cursor, [`src/plugins/bundled/cursor.ts`](../src/plugins/bundled/cursor.ts).
They use the same contract a layer from the site's folder will.

```js
export default {
  id: 'cursor', name: 'Year cursor', apiVersion: 1,
  layer: {
    slots: ['overlay', 'ruler', 'header'],      // one or more; mount gets an element for each
    mount(els, api) {                           // once per chart
      // draw plain DOM in els.overlay, els.ruler, els.header
      return () => {};                          // the cleanup
    },
  },
};
```

There's one shape: a one-slot layer writes `slots: ['overlay']` and reads `els.overlay`. **Slots:**

- `overlay`: over the rows, scrolling with the chart. x = 0 is the time axis (`api.scale.x(year)`), and the height is
  the rows'. It takes no pointer events. Something drawn in chart pixels needs nothing on scroll.
- `under`: the same, behind the marks.
- `ruler`: beside the ruler and Ages strip (children positioned `fixed` sit over them).
- `header`: the band above the chart, under the overview strip.

**The `api`** (`src/plugins/layer.ts`): `scale` (`x`, `year`, `step`, `width`), `viewport` (the exact sideways view, with
`subscribe`), `rows.inView()` (the rows on screen), `timeline` (events, lifespans, phases, ages, reign lanes, and the reigns that ruled),
`cursor` (`get`, `set(year, keyboard)`, `subscribe`), `command(id, label, run, {key, scope})` (a key binding the core
owns; ids are `<layer id>.<name>`; the chart's own keys are commands too, `chart.zoom-in`, `chart.zoom-out`, `chart.search`
and `chart.keys`, registered first, so a layer's default key never takes one of them), `keys(el, scope)` (an element's keydowns go to a scope's commands), `keyFor(id)` (the key a command answers to now, for a hint), `formatYear`, and
`onChange(fn)` (after the chart draws new data, dating, zoom or rows).

**Redraw rules.** The chart never re-renders for the cursor or the scroll. A layer subscribes to what it draws from,
and the stores call back at most once per task. The core keeps the pointer and the scroll geometry: the cursor layer
draws the cursor and owns its keys, and the core sets the store from the pointer.

## Tools

A **tool** has a panel of its own, opened from a toolbar button with its name (the plugin architecture design, §3). For
now only bundled tools load: Keys, [`src/plugins/bundled/bindings.ts`](../src/plugins/bundled/bindings.ts), which lists
every command with its key and lets the reader change a key (press the new one), unbind it, or go back to the default.

```js
export default {
  id: 'my-tool',
  name: 'My tool',          // the toolbar button's label and the panel's heading
  apiVersion: 1,
  tool: {
    mount(el, api) {
      // draw into el; return the cleanup
      return () => {};
    },
  },
};
```

The panel mounts the tool when it opens and unmounts it when it closes; Escape in the panel closes it.

**The `api`** (`src/plugins/tool.ts`):

- `commands`: `list()` (every command registered now: id, owner, label, key, default key), `bind(id, key | null)` (null
  unbinds; returns why it was refused, or null), `reset(id?)`, `keyOf(event)` (a key event written as a binding:
  `ctrl+k`, `y`, `shift+ArrowLeft`), `keys(el)` (see below), `notices()`, `subscribe(fn)`. The core keeps the rules: it refuses Escape and Tab
  (focus and exit must always work, WCAG 2.1.1 and 2.1.2) and a key another command holds in the same scope. A reader
  may bind a bare key: the chart's keys work only with the chart focused, and any key can be unbound or remapped with a
  modifier (WCAG 2.1.4). Bindings are kept in this browser, not in the view link. A binding of a command that isn't
  registered now (the chart's keys, in table view) is kept for when it is.
- `chart()`: the chart's layer api (see Layers) while a chart is showing, else null (table view). `onChart(fn)` hears
  each change, and always null before a new api, so a tool drops its subscriptions to the old one on that null.

**A tool never runs a command itself.** `commands.keys(el)` hands an element's keydowns to the chart's commands while a
chart is showing, with the year at the view's centre (a command expects a year: the chart gives the focused event's). The
Keys tool does this for its panel, so a reader can try a key there; a key it handles itself (one being captured as a new
binding) is left alone.

## Calendars

A **calendar** names and reads years for a timeline whose world counts time its own way (the plugin architecture
design, §6). Stored years stay integers on one axis, so a calendar never moves data: the same file works with or
without it. The contract is in [`src/plugins/calendar.ts`](../src/plugins/calendar.ts):

```js
{
  id: 'my-ages',
  format(year, month, day, { circa }) { return 'Second Age 200'; }, // readable text, never glyphs alone
  parse(text) { return { year: 1200, circa: false }; },             // what format writes, or null
  ticks(from, to, step) { return [{ year: 1200, label: '200', major: false }]; }, // optional
}
```

`registerCalendar(calendar)` makes it available, and returns `off()`. [`src/lib/calendar.ts`](../src/lib/calendar.ts)
is the one place that hands over to it: `formatYear`, `formatDate`, the editor's date text and the parsers use the
timeline's calendar when one is registered under its id, and the before/after labels otherwise. Everything that names a
year goes through them: the ruler, the year cursor, the panel, the table, search, the short year spans ("1922–91"
becomes both years in full), and `formatYear` in a plugin's snapshot.

**The ruler.** At a zoom of a year or more, `ticks(from, to, step)` gives the ticks in a range, `step` years apart in
the calendar's own count, each with a short label (a tick is about six characters wide) and whether it is major.
Without `ticks`, the core's round years are labelled by `format`, which suits a calendar whose names are short. Under a
year the core's month and day ticks stay; a label with its year (January, the 1st, after a gap) is written whole by
`format`.

A timeline names its calendar in `meta.calendar.system` (data format minor 4); without the plugin its before/after
labels show. **Register a calendar before the app first renders:** the registry isn't reactive, so a calendar
registered later shows only after something re-renders. The bundled calendars
([`src/plugins/bundled/namedAges.ts`](../src/plugins/bundled/namedAges.ts)) are in the registry from the start.

**Named ages**, the first: `namedAges(id, [{ name, from }])` names ages in sequence, each counted from its own year 1
("Age of Lanterns 12"), with years before the first counted back from it ("40 before the Age of Tides"). On the ruler
each age's start is a major tick with its name, and its years count in round steps from there (`150`, `200`), starting
three steps in to leave room for the name. Its sample is
[`docs/examples/named-ages-example.json`](examples/named-ages-example.json) (the Lantern Coast, fictional), with the
bundled `lantern-ages` calendar. In the event editor, such a timeline's dates are typed as the calendar writes them;
date claims still take a year and era.

## Versions

Three versions are independent:

- **Plugin API** (`apiVersion`, now 1). It goes up when a field of the snapshot or a callback changes meaning, or is
  removed. Adding a field doesn't change it. A plugin written for another API version is refused.
- **Data schema** (`schema: [min, max]`). A plugin sees the migrated timeline, so in practice that's the current
  schema. The range protects against a schema change that drops or renames a field the plugin reads. When the schema
  goes up, check each plugin and widen its range.
- **The link** (`plugin=`). It's kept when the app rewrites the address, so a copied link reopens the plugin's view. It isn't
  yet part of the versioned view link (`v=`), and saved views don't record it.

## Accessibility

A plugin view should meet the same bar as the rest of the app, WCAG 2.2 AA:

- Every control is reachable and usable from the keyboard, with a visible focus ring (`--focus`).
- If the plugin redraws, focus stays on the same control.
- Targets are at least 24 px, or there's a full-size control that does the same job. The sample's bars are 24 px wide,
  and its century picker (a `<select>`) does the same job.
- Text contrast meets 4.5:1 on the page background.
- The view starts with a heading.

**The sample meets all of these.** `centuries.js` draws its century bars as 24 px-wide targets in a row that scrolls
sideways on its own when the view is narrow (a chart: the two-dimensional exception to 1.4.10; the reflow check skips
`.cv .bars` for that reason), and its century `<select>` does the same job without scrolling. The plugin system itself
(loading, the toolbar button, notices, the view's frame) has no exceptions either.

The accessibility report checks the sample plugin's view (`npm run a11y:report`, states "plugin view" and "plugin
view, century picked"). Add states for a new plugin in `scripts/lib/ui-states.ts`.
