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
  schema: [5, 10],           // the data schema versions it reads, inclusive
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
- Targets are at least 24 px, or there's a full-size control that does the same job. The sample's bars can be narrow,
  so its century picker (a `<select>`) is that control.
- Text contrast meets 4.5:1 on the page background.
- The view starts with a heading.

**Known exceptions (the sample only).** `centuries.js` is an example of the contract, not a finished view. Its
century bars are narrower than 24 px (2.5.8; the century select is the full-size control), and its view doesn't reflow
at 320 and 640 px (1.4.10). The report lists both under the plugin states. The plugin system itself (loading, the
toolbar button, notices, the view's frame) has no exceptions.

The accessibility report checks the sample plugin's view (`npm run a11y:report`, states "plugin view" and "plugin
view, century picked"). Add states for a new plugin in `scripts/lib/ui-states.ts`.
